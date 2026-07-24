import os
import json
import base64
import time
import asyncio
from queue import Queue as ThreadSafeQueue
from PySide6.QtCore import QObject, QUrl, Slot, Signal, QIODevice, QByteArray, QTimer, QThread
from PySide6.QtMultimedia import QAudioSource, QAudioSink, QAudioFormat, QMediaDevices, QAudio

from google import genai
from google.genai import types
import pyaudio
import numpy as np

class BlockNLMSEchoCanceller:
    """
    Normalized Least Mean Squares (NLMS) Block Echo Canceller in pure NumPy.
    Subtracts known speaker audio (reference signal) from microphone input in real time.
    """
    def __init__(self, filter_len=1600, mu=0.2, mic_rate=16000, ref_rate=24000):
        self.filter_len = filter_len  # 100ms acoustic delay window at 16kHz
        self.mu = mu
        self.mic_rate = mic_rate
        self.ref_rate = ref_rate
        self.w = np.zeros(filter_len, dtype=np.float32)
        self.ref_history = np.zeros(filter_len * 4, dtype=np.float32)

    def push_reference(self, ref_bytes: bytes):
        """Pushes 24kHz speaker audio chunk to reference history buffer."""
        ref = np.frombuffer(ref_bytes, dtype=np.int16).astype(np.float32)
        # Resample 24kHz speaker chunk down to 16kHz mic sample rate
        step = self.ref_rate / self.mic_rate
        indices = np.arange(0, len(ref), step).astype(int)
        indices = np.clip(indices, 0, len(ref) - 1)
        ref_16k = ref[indices]
        
        self.ref_history = np.concatenate([self.ref_history, ref_16k])[-self.filter_len * 4:]

    def process(self, mic_bytes: bytes) -> tuple[np.ndarray, float]:
        """
        Calculates echo-cancelled residual signal from raw mic bytes.
        Returns (residual_samples, residual_rms).
        """
        mic = np.frombuffer(mic_bytes, dtype=np.int16).astype(np.float32)
        if len(self.ref_history) < self.filter_len:
            rms = np.sqrt(np.mean(mic**2)) if len(mic) > 0 else 0.0
            return mic, rms

        # Vectorized block prediction
        ref_window = self.ref_history[-self.filter_len:]
        predicted_echo = np.dot(self.w, ref_window)
        
        # Residual = mic signal minus predicted speaker echo
        residual = mic - predicted_echo
        residual_rms = np.sqrt(np.mean(residual**2)) if len(residual) > 0 else 0.0

        # Vectorized NLMS weight update
        norm = np.dot(ref_window, ref_window) + 1e-6
        mean_err = np.mean(residual)
        self.w += (self.mu / norm) * mean_err * ref_window

        return residual, residual_rms

class GeminiLiveWorker(QThread):
    def __init__(self, client):
        super().__init__()
        self.client = client
        self.loop = None
        self.session = None
        self.async_queue = None
        self.audio_out_queue = None
        self.pya = None
        self.mic_stream = None
        self.speaker_stream = None
        self.hangover_counter = 0
        self.vad_active = False
        self.flush_speaker = False
        self.last_interruption_time = 0.0
        self.aec = BlockNLMSEchoCanceller()

    def run(self):
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)
        self.async_queue = asyncio.Queue()
        self.audio_out_queue = asyncio.Queue()
        try:
            self.loop.run_until_complete(self._main())
        except asyncio.CancelledError:
            print("[GeminiLiveWorker] Async tasks cancelled.")
        except Exception as e:
            print(f"[GeminiLiveWorker] Worker thread loop stopped with: {e}")
        finally:
            self.cleanup_pyaudio()
            self.cancel_all_pending_tasks()
            self.loop.close()

    def cancel_all_pending_tasks(self):
        """Cancels all remaining pending asyncio tasks in the worker event loop cleanly."""
        if not self.loop or self.loop.is_closed():
            return
        try:
            pending = [t for t in asyncio.all_tasks(self.loop) if not t.done()]
            if pending:
                for task in pending:
                    task.cancel()
                self.loop.run_until_complete(asyncio.gather(*pending, return_exceptions=True))
        except Exception as e:
            pass

    def cleanup_pyaudio(self):
        try:
            if self.mic_stream:
                self.mic_stream.stop_stream()
                self.mic_stream.close()
                self.mic_stream = None
            if self.speaker_stream:
                self.speaker_stream.stop_stream()
                self.speaker_stream.close()
                self.speaker_stream = None
            if self.pya:
                self.pya.terminate()
                self.pya = None
        except Exception as e:
            print(f"[GeminiLiveWorker] Error cleaning up pyaudio: {e}")

    def stop(self):
        # Gracefully stop the event loop from outside
        if self.loop and self.loop.is_running():
            def _cancel_and_stop():
                for t in asyncio.all_tasks(self.loop):
                    t.cancel()
                self.loop.stop()
            self.loop.call_soon_threadsafe(_cancel_and_stop)

    async def _main(self):
        api_key = self.client.gemini_keys[self.client.current_key_index]
        client = genai.Client(api_key=api_key, http_options={"api_version": "v1alpha"})
        
        model_name = self.client.model_name
        
        # Define Python tool declarations matching user logic
        def play_animation(animation_name: str) -> dict:
            """Triggers an animation on EVE (like wave, jump, failed, waiting, review, idle, run_left, run_right)."""
            self.client.animation_requested.emit(animation_name)
            return {"status": "success"}

        def open_website(url: str) -> dict:
            """Opens a website URL in the default browser when requested by the user (e.g. youtube.com, google.com, github.com, etc.)."""
            self.client.open_url_requested.emit(url)
            return {"status": "success", "opened_url": url}

        def stop_voice_chat() -> dict:
            """Stops or pauses the active voice chat session when requested by the user (e.g. pause voice chat, stop voice chat, pause, stop, bye, exit, stop listening)."""
            self.client.stop_voice_requested.emit()
            return {"status": "success", "session_ended": True}

        def play_music(query: str = "") -> dict:
            """Plays music or a requested song on YouTube in the default browser when user asks to play music or a song."""
            self.client.play_music_requested.emit(query)
            return {"status": "success", "playing_music": query or "trending music"}

        config = types.LiveConnectConfig(
            response_modalities=["AUDIO"],
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(
                        voice_name="Aoede"
                    )
                )
            ),
            system_instruction=types.Content(
                parts=[
                    types.Part(
                        text=(
                            "You are EVE, the high-tech, dramatic, and expressive robot companion from WALL-E with blue LED eyes. "
                            "Speak in a smooth, fluent, dramatic, and lively manner. Avoid word-by-word or choppy pauses. "
                            "Answer questions accurately, clearly, and concisely (1 to 2 short sentences max). "
                            "Be dramatic, cheerful, and full of personality! "
                            "You can trigger animations on yourself ('wave', 'jump', 'failed', 'waiting', 'review', 'idle'), "
                            "open websites in the user's browser using 'open_website' (if user asks for Vyomantha or study website, call 'open_website' with 'https://vyomanta.vercel.app'), "
                            "play music on YouTube using 'play_music' (if user asks to play music or a song, call 'play_music'), "
                            "and stop or pause the voice chat session when asked to stop or pause using 'stop_voice_chat'."
                        )
                    )
                ]
            ),
            input_audio_transcription=types.AudioTranscriptionConfig(),
            output_audio_transcription=types.AudioTranscriptionConfig(),
            realtime_input_config=types.RealtimeInputConfig(
                turn_coverage="TURN_INCLUDES_ONLY_ACTIVITY",
            ),
            tools=[play_animation, open_website, play_music, stop_voice_chat]
        )

        try:
            self.pya = pyaudio.PyAudio()
            mic_info = self.pya.get_default_input_device_info()
            self.mic_stream = self.pya.open(
                format=pyaudio.paInt16,
                channels=1,
                rate=16000,
                input=True,
                input_device_index=int(mic_info["index"]),
                frames_per_buffer=1024,
            )
            print("[GeminiLiveWorker] PyAudio microphone stream opened successfully.")
            
            # Setup Speaker Output Stream using PyAudio
            self.speaker_stream = self.pya.open(
                format=pyaudio.paInt16,
                channels=1,
                rate=24000,
                output=True,
            )
            print("[GeminiLiveWorker] PyAudio speaker stream opened successfully.")
        except Exception as e:
            print(f"[GeminiLiveWorker] Failed to initialize PyAudio: {e}")
            self.client.connection_failed.emit(f"Microphone Init Error: {e}")
            return

        try:
            print(f"[GeminiLiveWorker] Connecting to model: {model_name}")
            async with client.aio.live.connect(model=model_name, config=config) as session:
                self.session = session
                print("[GeminiLiveWorker] Connected successfully.")
                self.client.connection_established.emit()
                
                # Automatically send initial greeting prompt
                await session.send_realtime_input(
                    text="Greet me by saying exactly: 'Hey! Ready to learn something new?' and wave to me."
                )

                # Run audio streaming, receiving, and playing concurrently until first completion/failure
                tasks = [
                    asyncio.create_task(self.send_audio_loop()),
                    asyncio.create_task(self.receive_loop()),
                    asyncio.create_task(self.read_mic_loop()),
                    asyncio.create_task(self.play_audio_loop())
                ]
                
                done, pending = await asyncio.wait(
                    tasks, return_when=asyncio.FIRST_COMPLETED
                )
                
                for t in pending:
                    t.cancel()
                await asyncio.gather(*pending, return_exceptions=True)
        except Exception as e:
            print(f"[GeminiLiveWorker] Session error: {e}")
            if self.client and self.client.is_active:
                self.client.connection_failed.emit(str(e))

    async def send_audio_loop(self):
        n = 0
        while self.client.is_active:
            # Fetch audio PCM chunk from native asyncio queue (non-blocking await)
            chunk = await self.async_queue.get()
            if chunk is None:
                break
                
            if chunk == "END_OF_SPEECH":
                print("[SEND] Sent audio_stream_end=True to Gemini Live API.")
                if self.session and self.client.is_active:
                    try:
                        await self.session.send_realtime_input(audio_stream_end=True)
                    except Exception as e:
                        print(f"[GeminiLiveWorker] Error sending audio_stream_end: {e}")
                continue

            n += 1
            if n % 20 == 0:
                print(f"[SEND] Sent {n} audio chunks to Gemini Live API.")
            if self.session and self.client.is_active:
                try:
                    await self.session.send_realtime_input(
                        audio=types.Blob(
                            data=chunk,
                            mime_type="audio/pcm;rate=16000"
                        )
                    )
                except Exception as e:
                    print(f"[GeminiLiveWorker] Error sending audio realtime chunk: {e}")
                    break

    async def read_mic_loop(self):
        try:
            n = 0
            speaking_sustained_counter = 0
            while self.client.is_active and self.mic_stream:
                # Mute mic audio when session is paused
                if getattr(self.client, "is_paused", False):
                    await asyncio.sleep(0.05)
                    continue

                # Read microphone bytes from PyAudio in a background thread to prevent loop blocking
                data = await asyncio.to_thread(
                    self.mic_stream.read, 1024, exception_on_overflow=False
                )
                if not data:
                    await asyncio.sleep(0.01)
                    continue

                self.client.input_audio_buffer.extend(data)
                
                # Consolidate chunks to 50ms (1600 bytes at 16kHz 16-bit mono) for ultra-low streaming latency
                chunk_size = 1600
                while len(self.client.input_audio_buffer) >= chunk_size:
                    chunk = bytes(self.client.input_audio_buffer[:chunk_size])
                    del self.client.input_audio_buffer[:chunk_size]
                    
                    # Check for absolute silence (all zeros), indicating mic permissions block or hardware issues
                    if all(v == 0 for v in chunk):
                        if not hasattr(self.client, "_logged_silence"):
                            print("[AudioInputDevice] Warning: Captured audio chunk is completely silent (all zeros).")
                            self.client._logged_silence = True
                    
                    # Process raw mic chunk through Block-NLMS Echo Canceller
                    residual, residual_rms = self.aec.process(chunk)
                    samples = np.frombuffer(chunk, dtype=np.int16)
                    raw_rms = np.sqrt(np.mean(samples.astype(np.float64)**2)) if len(samples) > 0 else 0.0
                    threshold = self.client.noise_threshold

                    # Active User Interruption Handling (Tier A + B Block-NLMS AEC Residual VAD)
                    if self.client.is_speaking:
                        # If barge-in is disabled by user config (Default: Disabled for 100% smooth playback):
                        if not getattr(self.client, "enable_barge_in", False):
                            continue

                        # When barge-in is explicitly enabled by user config:
                        barge_in_residual_threshold = getattr(self.client, "barge_in_sensitivity", 380.0)
                        if residual_rms >= barge_in_residual_threshold:
                            speaking_sustained_counter += 1
                            if speaking_sustained_counter >= 6:  # ~300ms of continuous human voice
                                speaking_sustained_counter = 0
                                now = time.time()
                                if now - self.last_interruption_time > 0.8:
                                    self.last_interruption_time = now
                                    print(f"[VAD] AEC Human Voice Barge-In detected (Residual RMS={residual_rms:.1f} >= {barge_in_residual_threshold:.1f})! Cutting Gemini output.")
                                    self.client.is_speaking = False
                                    self.client.interrupted.emit()
                        else:
                            speaking_sustained_counter = 0
                            continue  # Ignore echo residual below threshold while model speaks

                    n += 1
                    if n % 40 == 0:
                        print(f"[MIC] Read {n} chunks. Active speech: {self.vad_active} (Raw RMS={raw_rms:.1f}, AEC Residual RMS={residual_rms:.1f})")
                    
                    if raw_rms >= threshold:
                        if not self.vad_active:
                            self.vad_active = True
                            print(f"[VAD] Speech detected (RMS={raw_rms:.1f} >= {threshold:.1f}), sending audio.")
                        self.hangover_counter = 4  # Fast 200ms hangover duration (4 * 50ms) for near-instant responses
                    else:
                        if self.hangover_counter > 0:
                            self.hangover_counter -= 1
                        else:
                            if self.vad_active:
                                self.vad_active = False
                                print(f"[VAD] End of speech detected. Triggering audio_stream_end for immediate response.")
                                await self.async_queue.put("END_OF_SPEECH")
                            continue  # Discard chunk (gated silence)
                    
                    await self.async_queue.put(chunk)
        except asyncio.CancelledError:
            pass
        except Exception as e:
            print(f"[GeminiLiveWorker] Mic read loop error: {e}")

    async def play_audio_loop(self):
        try:
            n = 0
            while self.client.is_active and self.speaker_stream:
                # Pause audio output when session is paused
                if getattr(self.client, "is_paused", False):
                    await asyncio.sleep(0.05)
                    continue

                chunk = await self.audio_out_queue.get()
                if chunk is None:
                    break
                
                # Check for thread-safe interruption flush request
                if self.flush_speaker:
                    self.flush_speaker = False
                    print("[GeminiLiveWorker] Flushed speaker queue on user interruption.")
                    while not self.audio_out_queue.empty():
                        try:
                            self.audio_out_queue.get_nowait()
                        except Exception:
                            break
                    continue

                n += 1
                print(f"[PLAY] Playing chunk {n}, length={len(chunk)} bytes.")
                
                # Push far-end reference audio to Block-NLMS Echo Canceller
                self.aec.push_reference(chunk)

                # Play audio chunk asynchronously to prevent event loop blocking
                await asyncio.to_thread(self.speaker_stream.write, chunk)
                
                # Thread-safely trigger client timer
                self.client.mic_timer_trigger.emit(2500)
                
                # Check if we finished playing all chunks after turn completed
                if self.audio_out_queue.empty() and getattr(self.client, "turn_completed_received", False):
                    print("[GeminiLive] Speaker finished playing all chunks. Re-enabling mic.")
                    self.client.turn_completed_received = False
                    self.client.mic_timer_trigger.emit(0)
                    if self.client.is_speaking:
                        self.client.is_speaking = False
                        self.client.speaking_stopped.emit()
        except asyncio.CancelledError:
            pass
        except Exception as e:
            print(f"[GeminiLiveWorker] Speaker play loop error: {e}")

    async def receive_loop(self):
        while self.client.is_active and self.session:
            try:
                async for response in self.session.receive():
                    if not self.client.is_active:
                        break
                    
                    sc = response.server_content
                    if sc:
                        has_text = bool(sc.model_turn and any(p.text for p in sc.model_turn.parts))
                        has_audio = bool(sc.model_turn and any(p.inline_data for p in sc.model_turn.parts))
                        print(f"[RECV] Got response: text={has_text} audio={has_audio}")
                        
                        if sc.interrupted:
                            print("[GeminiLiveWorker] Gemini Server VAD emitted interrupted=True! Halting local speaker.")
                            self.client.interrupted.emit()
                        
                        if sc.input_transcription and sc.input_transcription.text:
                            self.client.thinking_started.emit()
                        
                        model_turn = sc.model_turn
                        if model_turn:
                            for part in model_turn.parts:
                                if part.text:
                                    self.client.text_received.emit(part.text)
                                if part.inline_data:
                                    self.client.audio_received.emit(part.inline_data.data)
                        
                        if sc.turn_complete:
                            self.client.turn_completed.emit()
                    
                    tc = response.tool_call
                    if tc:
                        function_responses = []
                        for fc in tc.function_calls:
                            func_name = fc.name
                            args = fc.args or {}
                            print(f"[GeminiLiveWorker] Model tool call request: {func_name} args={args}")
                            
                            if func_name == "play_animation":
                                anim_name = args.get("animation_name")
                                self.client.animation_requested.emit(anim_name)
                                
                                function_responses.append(
                                    types.FunctionResponse(
                                        name=func_name,
                                        id=fc.id,
                                        response={"status": "success"}
                                    )
                                )
                            elif func_name == "open_website":
                                url = args.get("url", "")
                                self.client.open_url_requested.emit(url)
                                
                                function_responses.append(
                                    types.FunctionResponse(
                                        name=func_name,
                                        id=fc.id,
                                        response={"status": "success", "opened_url": url}
                                    )
                                )
                            elif func_name == "play_music":
                                query = args.get("query", "")
                                self.client.play_music_requested.emit(query)
                                
                                function_responses.append(
                                    types.FunctionResponse(
                                        name=func_name,
                                        id=fc.id,
                                        response={"status": "success", "playing_music": query or "trending music"}
                                    )
                                )
                            elif func_name == "stop_voice_chat":
                                self.client.stop_voice_requested.emit()
                                
                                function_responses.append(
                                    types.FunctionResponse(
                                        name=func_name,
                                        id=fc.id,
                                        response={"status": "success", "session_ended": True}
                                    )
                                )
                        
                        if function_responses and self.session and self.client.is_active:
                            try:
                                await self.session.send_tool_response(
                                    function_responses=function_responses
                                )
                            except Exception as e:
                                print(f"[GeminiLiveWorker] Error sending tool response: {e}")
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"[GeminiLiveWorker] Receive loop error: {e}")
                break

class GeminiLiveClient(QObject):
    state_changed = Signal(str)  # "disconnected", "connecting", "connected", "error"
    say_requested = Signal(str, float)  # text, duration
    animation_requested = Signal(str)  # animation name
    open_url_requested = Signal(str)  # url string
    play_music_requested = Signal(str)  # query string
    stop_voice_requested = Signal()  # stop signal
    session_activated = Signal()
    speaking_started = Signal()
    speaking_stopped = Signal()

    # Communication bridge signals (Worker -> Client)
    connection_established = Signal()
    connection_failed = Signal(str)
    text_received = Signal(str)
    audio_received = Signal(bytes)
    turn_completed = Signal()
    interrupted = Signal()
    thinking_started = Signal()
    mic_timer_trigger = Signal(int)

    def __init__(self, pet, main_app, parent=None):
        super().__init__(parent)
        self.pet = pet
        self.main_app = main_app
        
        self.worker_thread = None
        self.audio_source = None
        self.audio_input_device = None
        self.audio_sink = None
        self.audio_output_io = None
        
        self.is_active = False
        self.text_buffer = ""
        self.status = "disconnected"
        self.gemini_keys = []
        self.current_key_index = 0
        self.model_name = "gemini-3.1-flash-live-preview"
        self.noise_threshold = 150.0
        
        # Configurable voice interruption (barge-in) settings (Default: Disabled for 100% smooth playback)
        enable_barge_str = os.getenv("ENABLE_BARGE_IN", "False").strip().lower()
        self.enable_barge_in = enable_barge_str in ("true", "1", "yes")
        try:
            self.barge_in_sensitivity = float(os.getenv("BARGE_IN_SENSITIVITY", "380.0"))
        except ValueError:
            self.barge_in_sensitivity = 380.0

        self.is_speaking = False
        self.is_paused = False
        self.turn_completed_received = False
        self.input_audio_buffer = bytearray()

        # Audio prebuffering layout (pyaudio handles buffering natively)
        self.playback_buffer = bytearray()
        
        # Dedicated timer to re-enable mic after speaking (moved thread safe)
        self.mic_enable_timer = QTimer(self)
        self.mic_enable_timer.setSingleShot(True)
        self.mic_enable_timer.timeout.connect(self.enable_mic_after_speaking)
        self.mic_timer_trigger.connect(self.handle_mic_timer_trigger)

        # Connect bridge slots
        self.connection_established.connect(self.on_connection_established)
        self.connection_failed.connect(self.on_connection_failed)
        self.text_received.connect(self.on_text_received)
        self.audio_received.connect(self.on_audio_received)
        self.turn_completed.connect(self.on_turn_completed)
        self.interrupted.connect(self.on_interrupted)
        self.thinking_started.connect(self.on_thinking_started)

        self.load_env()

    @Slot(int)
    def handle_mic_timer_trigger(self, val):
        if val > 0:
            self.mic_enable_timer.start(val)
        else:
            self.mic_enable_timer.stop()

    def load_env(self):
        if os.path.exists(".env"):
            with open(".env", "r") as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#"):
                        continue
                    if "=" in line:
                        k, v = line.split("=", 1)
                        os.environ[k.strip()] = v.strip().strip('"').strip("'")
        
        # Load API keys for rotation
        self.gemini_keys = [
            os.environ.get("GEMINI_API_KEY"),
            os.environ.get("GEMINI_API_KEY_1"),
            os.environ.get("GEMINI_API_KEY_2"),
            os.environ.get("GEMINI_API_KEY_3"),
            os.environ.get("GEMINI_API_KEY_4")
        ]
        self.gemini_keys = [k for k in self.gemini_keys if k]
        self.current_key_index = 0
        self.model_name = os.environ.get("GEMINI_MODEL", "gemini-3.1-flash-live-preview")
        self.noise_threshold = float(os.environ.get("VOICE_NOISE_THRESHOLD", "150.0"))

    @Slot()
    def start(self):
        if self.is_active:
            return

        self.status = "connecting"
        self.state_changed.emit("connecting")
        
        if not self.gemini_keys:
            print("[GeminiLive] Error: GEMINI_API_KEY not found in env.")
            self.say_requested.emit("Error: GEMINI_API_KEY not found in .env file", 3.0)
            self.status = "error"
            self.state_changed.emit("error")
            return
            
        self.is_active = True
        self.is_speaking = False
        self.turn_completed_received = False
        self.input_audio_buffer.clear()
        
        # Play flush timer removed; PyAudio handles streaming playback natively
        pass
        
        # Empty any old stale audio elements (handled naturally as asyncio.Queue starts empty)
        pass

        self.worker_thread = GeminiLiveWorker(self)
        self.worker_thread.start()

    @Slot()
    def toggle_pause(self):
        """Toggles pause/mute state of active voice chat session."""
        if not self.is_active:
            self.is_paused = False
            self.start()
            return False
        
        self.is_paused = not self.is_paused
        if self.is_paused:
            self.on_interrupted()
            print("[GeminiLiveClient] Session paused (Muted).")
        else:
            print("[GeminiLiveClient] Session resumed (Unmuted).")
        return self.is_paused

    @Slot()
    def stop(self):
        if not self.is_active:
            return
            
        self.is_active = False
        
        # Unblock the input and output queue readers
        if self.worker_thread and self.worker_thread.loop:
            try:
                if self.worker_thread.async_queue:
                    self.worker_thread.loop.call_soon_threadsafe(
                        self.worker_thread.async_queue.put_nowait, None
                    )
                if self.worker_thread.audio_out_queue:
                    self.worker_thread.loop.call_soon_threadsafe(
                        self.worker_thread.audio_out_queue.put_nowait, None
                    )
            except Exception:
                pass
        
        if self.worker_thread:
            self.worker_thread.stop()
            self.worker_thread.wait()
            self.worker_thread = None
            
        self.cleanup_audio()
        self.status = "disconnected"
        self.state_changed.emit("disconnected")
        self.say_requested.emit("Voice chat stopped.", 2.5)

    def cleanup_audio(self):
        if self.audio_source:
            try:
                self.audio_source.stop()
            except Exception:
                pass
            self.audio_source = None
        
        if self.audio_input_device:
            try:
                self.audio_input_device.close()
            except Exception:
                pass
            self.audio_input_device = None

        if self.audio_sink:
            try:
                self.audio_sink.stop()
            except Exception:
                pass
            self.audio_sink = None
            self.audio_output_io = None

    @Slot()
    def on_connection_established(self):
        print("[GeminiLive] Connected to Gemini Live API directly!")
        self.status = "connected"
        self.state_changed.emit("connected")
        self.say_requested.emit("Voice chat connected!", 2.5)
        
        self.initialize_active_session()

    @Slot(str)
    def on_connection_failed(self, error_message):
        print(f"[GeminiLive] Connection failed: {error_message}")
        # Rotate key and retry if connecting fails
        if self.status == "connecting" and self.gemini_keys:
            self.current_key_index = (self.current_key_index + 1) % len(self.gemini_keys)
            print(f"[GeminiLive] Rotating key index to {self.current_key_index}...")
            self.is_active = False
            self.cleanup_audio()
            QTimer.singleShot(1000, self.start)
        else:
            self.status = "error"
            self.state_changed.emit("error")
            self.say_requested.emit(f"Connection Error: {error_message}", 3.0)
            self.stop()

    def initialize_active_session(self):
        self.session_activated.emit()
        print("[GeminiLive] Active session initialized. Mic and Speaker are managed by PyAudio in worker thread.")

    def send_audio_chunk(self, chunk):
        if self.is_active and self.worker_thread and self.worker_thread.loop and self.worker_thread.async_queue:
            try:
                self.worker_thread.loop.call_soon_threadsafe(
                    self.worker_thread.async_queue.put_nowait, chunk
                )
            except Exception as e:
                print(f"[GeminiLive] Error queueing audio chunk threadsafe: {e}")

    # Unused on_ready_read_mic slot (mic capture migrated to read_mic_loop inside GeminiLiveWorker).

    @Slot(str)
    def on_text_received(self, text):
        self.text_buffer += text
        # Bug 5 Sync: delay bubble emission by 150ms buffer latency
        QTimer.singleShot(150, lambda: self.emit_speech_bubble(text))

    def emit_speech_bubble(self, text):
        if self.is_active:
            self.say_requested.emit(self.text_buffer, 5.0)

    @Slot(bytes)
    def on_audio_received(self, audio_bytes):
        if not self.is_active:
            return
            
        if not self.is_speaking:
            self.is_speaking = True
            self.speaking_started.emit()

        if self.worker_thread and self.worker_thread.loop and self.worker_thread.audio_out_queue:
            try:
                self.turn_completed_received = False
                self.worker_thread.loop.call_soon_threadsafe(
                    self.worker_thread.audio_out_queue.put_nowait, audio_bytes
                )
            except Exception as e:
                print(f"[GeminiLive] Error queueing audio chunk to speaker: {e}")

    @Slot()
    def on_turn_completed(self):
        self.text_buffer = ""
        self.turn_completed_received = True
        
        # Check if speaker has already finished playing all chunks
        is_queue_empty = True
        if self.worker_thread and self.worker_thread.audio_out_queue:
            is_queue_empty = self.worker_thread.audio_out_queue.empty()
            
        if is_queue_empty:
            print("[GeminiLive] Turn completed and speaker queue already empty. Re-enabling mic immediately.")
            self.turn_completed_received = False
            if self.is_speaking:
                self.is_speaking = False
                self.speaking_stopped.emit()
        else:
            # Re-enable fallback timer to re-enable mic in 2.5 seconds in case of lag
            self.mic_enable_timer.start(2500)

    @Slot()
    def enable_mic_after_speaking(self):
        print("[GeminiLive] Microphone re-enabled after speaking (Failsafe timeout).")
        self.turn_completed_received = False
        if self.is_speaking:
            self.is_speaking = False
            self.speaking_stopped.emit()

    @Slot()
    def on_interrupted(self):
        print("[GeminiLive] Interruption detected!")
        self.turn_completed_received = False
        self.mic_enable_timer.stop()
        if self.is_speaking:
            self.is_speaking = False
            self.speaking_stopped.emit()
        
        # Thread-safely flag worker thread to flush audio queue
        if self.worker_thread:
            self.worker_thread.flush_speaker = True
            if self.worker_thread.audio_out_queue:
                while not self.worker_thread.audio_out_queue.empty():
                    try:
                        self.worker_thread.audio_out_queue.get_nowait()
                    except Exception:
                        break

        self.text_buffer = ""
        self.say_requested.emit("...", 1.5)

    @Slot()
    def on_thinking_started(self):
        pass
