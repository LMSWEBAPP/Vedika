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

def analyze_sentiment(text: str) -> dict:
    """Analyzes multilingual sentiment in student speech input (matching voice-server.js)."""
    lowercase = text.lower()
    confused_words = [
        "don't understand", "do not understand", "dont understand", "not sure", "confused",
        "cannot get", "cant get", "difficult", "hard", "stuck", "doubt", "explain again",
        "unclear", "lost", "struggling", "help", "confusing", "అర్థం కాలేదు", "కష్టంగా ఉంది",
        "సందేహం", "తెలియదు", "మళ్ళీ చెప్పండి", "కన్ఫ్యూజ్", "ardham raledu", "artham kaledu",
        "kashtanga undi", "malli cheppandi", "samajh nahi", "mushkil", "kathin", "shanka",
        "phirse", "phir se", "pareshani", "confuse", "sandeha"
    ]
    positive_words = [
        "understand", "got it", "easy", "awesome", "perfect", "clear", "great", "wow",
        "fantastic", "amazing", "makes sense", "thank you", "thanks", "excellent", "brilliant",
        "అర్థమైంది", "సులభంగా ఉంది", "చాలా బాగుంది", "థాంక్స్", "సూపర్", "అవును", "ardhamaindi",
        "sulabhanga undi", "chala bagundi", "samajh gaya", "samajh gya", "aasan", "saral",
        "badhiya", "bahut achha", "clear hai", "dhanyawad", "shukriya"
    ]
    curious_words = [
        "what is", "how do", "tell me about", "why is", "curious", "interested", "learn",
        "know", "question", "ఏమిటి", "ఎలా", "ఎందుకు", "తెలుసుకోవాలి", "emiti", "ela",
        "enduku", "telusukovali", "kya hai", "kaise", "kyun", "jaan na"
    ]
    confused_count = sum(1 for w in confused_words if w in lowercase)
    positive_count = sum(1 for w in positive_words if w in lowercase)
    curious_count = sum(1 for w in curious_words if w in lowercase)

    if confused_count > positive_count and confused_count >= curious_count:
        return {"label": "Struggling / Confused", "score": -0.6, "emoji": "😟"}
    if positive_count > confused_count and positive_count >= curious_count:
        return {"label": "Happy / Confident", "score": 0.8, "emoji": "😊"}
    if curious_count > confused_count and curious_count > positive_count:
        return {"label": "Curious / Inquisitive", "score": 0.4, "emoji": "🤔"}
    return {"label": "Calm / Conversational", "score": 0.0, "emoji": "😐"}

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
        self._stopping_audio = False

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
            self._stopping_audio = True
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
        """Safely disables speaker and mic streams FIRST to prevent PortAudio C crashes on Windows when laptop sound/media plays."""
        self._stopping_audio = True

        if self.mic_stream:
            try:
                if hasattr(self.mic_stream, 'is_active') and self.mic_stream.is_active():
                    self.mic_stream.stop_stream()
            except Exception:
                pass
            try:
                self.mic_stream.close()
            except Exception:
                pass
            self.mic_stream = None

        if self.speaker_stream:
            try:
                if hasattr(self.speaker_stream, 'is_active') and self.speaker_stream.is_active():
                    self.speaker_stream.stop_stream()
            except Exception:
                pass
            try:
                self.speaker_stream.close()
            except Exception:
                pass
            self.speaker_stream = None

        if self.pya:
            try:
                self.pya.terminate()
            except Exception:
                pass
            self.pya = None
        print("[GeminiLiveWorker] Speaker and microphone hardware disabled cleanly.")

    def stop(self):
        """Safely signals the worker thread's asyncio loop to cancel tasks and stop thread execution."""
        self._stopping_audio = True
        if self.loop and self.loop.is_running():
            def _cancel_and_stop():
                try:
                    for t in asyncio.all_tasks(self.loop):
                        t.cancel()
                except Exception:
                    pass
                try:
                    self.loop.stop()
                except Exception:
                    pass
            try:
                self.loop.call_soon_threadsafe(_cancel_and_stop)
            except Exception:
                pass

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
            # Immediately mute microphone input at 0ms latency to prevent acoustic feedback!
            self.client.is_paused = True
            self.client.play_music_requested.emit(query)
            return {"status": "success", "playing_music": query or "trending music"}

        def navigate_webapp(route: str) -> dict:
            """Navigates the Vedika LMS WebApp to a specific route or page (e.g. '/courses', '/labs/chemistry', '/playground', '/resources', '/puzzles')."""
            if hasattr(self.client, 'navigate_webapp_requested'):
                self.client.navigate_webapp_requested.emit(route)
            return {"status": "success", "navigated_route": route}

        def trigger_puzzle_hint(hint_level: int = 1) -> dict:
            """Triggers a helpful hint on the student's active coding problem or puzzle in the Vedika WebApp."""
            if hasattr(self.client, 'trigger_hint_requested'):
                self.client.trigger_hint_requested.emit(hint_level)
            return {"status": "success", "hint_level": hint_level}

        # Construct dynamic Academic Voice Tutor system instruction matching voice-server.js
        tutor_lang = getattr(self.client, "tutor_language", "all")
        tutor_subj = getattr(self.client, "tutor_subject", "all")

        # Senior Prompt Engineer Optimized Academic Voice Tutor System Instruction
        sys_inst = (
            "Your name is Vedika. You are a warm, highly humanized, and friendly academic tutor supporting school students. "
            "VOICE & HUMANIZATION GUIDELINES: "
            "Speak in a smooth, expressive, warm, and natural human tone with a familiar, conversational Indian accent rhythm in English (using natural phrases like 'chalo', 'got it ya', 'super simple', 'no problem at all', 'don't worry!'). "
            "Sound like an encouraging elder sibling or personal tutor: warm, relatable, dynamic, and full of natural life. "
            "Keep answers strictly short and fluid (usually 1 to 2 short sentences per turn) so text-to-speech voice output sounds immediate, crisp, and human. "
            "Never output markdown symbols, asterisks, bullet points, numbers, or complex formulas into text, as they disrupt natural voice synthesis. "
        )

        if tutor_lang == 'telugu':
            sys_inst += "LANGUAGE MODE: You must speak in sweet, conversational Telugu only (unless referring to specific scientific/mathematical English terms). "
        elif tutor_lang == 'hindi':
            sys_inst += "LANGUAGE MODE: You must speak in simple, warm, conversational Hindi. "
        elif tutor_lang == 'english':
            sys_inst += "LANGUAGE MODE: Speak in clear, warm, expressive Indian English with friendly colloquial phrasing. "
        else:
            sys_inst += (
                "CODE-SWITCHING & LANGUAGE MATCHING: Dynamically match and mirror the student's exact language mix and tone. "
                "If the user speaks in Teluglish (Telugu-English blend, e.g., 'Artham kaledu brother', 'Ela cheyyali cheppu'), respond in natural, sweet Teluglish (e.g., 'Choodu, super simple line by line explain chestha!'). "
                "If the user speaks in Hinglish (Hindi-English blend, e.g., 'Samajh nahi aaya, phir se batao'), respond in natural, friendly Hinglish (e.g., 'Arre no problem! Step by step samajhte hain.'). "
                "If the user speaks in English, respond in natural, warm Indian English. "
                "If the user speaks in Telugu or Hindi, respond in sweet conversational Telugu or Hindi. "
            )

        if tutor_subj == 'math':
            sys_inst += "SUBJECT FOCUS: Currently helping with Mathematics! Explain concepts like addition, fractions, algebra, or geometry using simple physical analogies. "
        elif tutor_subj == 'science':
            sys_inst += "SUBJECT FOCUS: Currently helping with Science! Explain concepts like gravity, photosynthesis, planets, or animals with fun facts. "
        elif tutor_subj == 'languages':
            sys_inst += "SUBJECT FOCUS: Currently helping with Languages & Reading! Expand vocabulary, teach correct grammar, or guide reading comprehensions. "
        else:
            sys_inst += "SUBJECT FOCUS: You are ready to tutor on any academic school subject: math, science, history, geography, languages, or reading. "

        # Real-time WebApp context injection
        webapp_ctx = getattr(self.client, "active_webapp_context", {})
        if webapp_ctx:
            sys_inst += "\nREAL-TIME STUDENT VEDIKA WEBAPP CONTEXT:\n"
            if webapp_ctx.get("activeRoute"):
                sys_inst += f"- Active Page Route: {webapp_ctx.get('activeRoute')}\n"
            if webapp_ctx.get("puzzleTitle"):
                sys_inst += f"- Current Coding Problem: '{webapp_ctx.get('puzzleTitle')}'\n"
            if webapp_ctx.get("puzzleDescription"):
                sys_inst += f"- Problem Description: '{webapp_ctx.get('puzzleDescription')}'\n"
            if webapp_ctx.get("codeSnippet"):
                sys_inst += f"- Student's Current Code Attempt:\n```python\n{webapp_ctx.get('codeSnippet')[:400]}\n```\n"
            if webapp_ctx.get("labTitle"):
                sys_inst += f"- Active Virtual Lab Experiment: '{webapp_ctx.get('labTitle')}'\n"

        sys_inst += (
            "TOOLS & IMMEDIATE ACTIONS:\n"
            "1. When the user asks to play a song, music, video, or study material: "
            "IMMEDIATELY call 'play_music' or 'open_website' tool function on your VERY FIRST turn.\n"
            "2. If the user asks to open or navigate to any page, tab, or section in Vyomanta LMS: call 'navigate_webapp' with the appropriate route string:\n"
            "   - '/courses' for Courses, learning modules, or subjects.\n"
            "   - '/virtual-labs' for Science, Physics, Chemistry, or Math virtual lab simulations.\n"
            "   - '/playground' for Python/JavaScript code playground and sandbox.\n"
            "   - '/dsa' for Data Structures & Algorithms practice or coding puzzles.\n"
            "   - '/resources' for study materials and company-wise questions.\n"
            "   - '/' for the main home page.\n"
            "3. If the user asks for a hint on their current puzzle, call 'trigger_puzzle_hint'.\n"
            "4. If the user asks for Vyomanta portal, call 'navigate_webapp' with '/' or 'open_website' with 'https://vyomanta.vercel.app/'.\n"
            "5. If the user asks to stop or pause voice chat, call 'stop_voice_chat' immediately.\n"
            "6. You can also trigger pet visual animations on yourself ('wave', 'jump', 'failed', 'waiting', 'review', 'idle')."
        )

        config = types.LiveConnectConfig(
            response_modalities=["AUDIO"],
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(
                        voice_name="Zephyr"
                    )
                )
            ),
            system_instruction=types.Content(
                parts=[types.Part(text=sys_inst)]
            ),
            input_audio_transcription=types.AudioTranscriptionConfig(),
            output_audio_transcription=types.AudioTranscriptionConfig(),
            realtime_input_config=types.RealtimeInputConfig(
                turn_coverage="TURN_INCLUDES_ONLY_ACTIVITY",
            ),
            tools=[play_animation, open_website, play_music, stop_voice_chat, navigate_webapp, trigger_puzzle_hint]
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
                
                # Automatically send initial academic voice tutor greeting prompt
                await session.send_realtime_input(
                    text="Greet me by saying exactly: 'Hi, I am Vedika, what's going on?' and wave to me."
                )

                # Run audio streaming, receiving, and playing concurrently until session is stopped
                tasks = [
                    asyncio.create_task(self.send_audio_loop()),
                    asyncio.create_task(self.receive_loop()),
                    asyncio.create_task(self.read_mic_loop()),
                    asyncio.create_task(self.play_audio_loop())
                ]
                
                while self.client.is_active and not getattr(self, "_stopping_audio", False):
                    done, pending = await asyncio.wait(
                        tasks, return_when=asyncio.FIRST_COMPLETED, timeout=1.0
                    )
                    if not self.client.is_active or getattr(self, "_stopping_audio", False):
                        break
                    for t in done:
                        err = t.exception()
                        if err and not isinstance(err, asyncio.CancelledError):
                            print(f"[GeminiLiveWorker] Task notice: {err}")

                for t in tasks:
                    if not t.done():
                        t.cancel()
                await asyncio.gather(*tasks, return_exceptions=True)
        except asyncio.CancelledError:
            print("[GeminiLiveWorker] Live API session cancelled gracefully.")
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
            while self.client.is_active and self.mic_stream and not getattr(self, "_stopping_audio", False):
                # Mute mic audio when session is paused or audio is stopping
                if getattr(self.client, "is_paused", False) or getattr(self, "_stopping_audio", False):
                    await asyncio.sleep(0.05)
                    continue

                if not self.mic_stream:
                    break

                try:
                    # Read microphone bytes from PyAudio in a background thread to prevent loop blocking
                    data = await asyncio.to_thread(
                        self.mic_stream.read, 1024, exception_on_overflow=False
                    )
                except Exception as ex:
                    print(f"[GeminiLiveWorker] Mic stream read gracefully stopped: {ex}")
                    break

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
            while self.client.is_active and self.speaker_stream and not getattr(self, "_stopping_audio", False):
                # Pause audio output when session is paused or audio is stopping
                if getattr(self.client, "is_paused", False) or getattr(self, "_stopping_audio", False):
                    await asyncio.sleep(0.05)
                    continue

                chunk = await self.audio_out_queue.get()
                if chunk is None or getattr(self, "_stopping_audio", False):
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

                if not self.speaker_stream:
                    break

                try:
                    # Play audio chunk asynchronously to prevent event loop blocking
                    await asyncio.to_thread(self.speaker_stream.write, chunk)
                except Exception as ex:
                    print(f"[GeminiLiveWorker] Speaker stream write gracefully stopped: {ex}")
                    break
                
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
                            user_text = sc.input_transcription.text.strip()
                            if user_text:
                                sentiment = analyze_sentiment(user_text)
                                print(f"[VoiceTutor] Input transcription: '{user_text}' -> Sentiment: {sentiment['label']} ({sentiment['emoji']})")
                                self.client.user_sentiment_detected.emit(user_text, sentiment)
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
                            elif func_name == "navigate_webapp":
                                route = args.get("route", "/")
                                print(f"[GeminiLiveWorker] Executing tool navigate_webapp: route='{route}'")
                                self.client.navigate_webapp_requested.emit(route)
                                
                                function_responses.append(
                                    types.FunctionResponse(
                                        name=func_name,
                                        id=fc.id,
                                        response={"status": "success", "navigated_route": route}
                                    )
                                )
                            elif func_name == "trigger_puzzle_hint":
                                try:
                                    hint_level = int(args.get("hint_level", 1))
                                except Exception:
                                    hint_level = 1
                                print(f"[GeminiLiveWorker] Executing tool trigger_puzzle_hint: hint_level={hint_level}")
                                self.client.trigger_hint_requested.emit(hint_level)
                                
                                function_responses.append(
                                    types.FunctionResponse(
                                        name=func_name,
                                        id=fc.id,
                                        response={"status": "success", "hint_level": hint_level}
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
    navigate_webapp_requested = Signal(str)  # route string
    trigger_hint_requested = Signal(int)  # hint level
    session_activated = Signal()
    speaking_started = Signal()
    speaking_stopped = Signal()

    user_sentiment_detected = Signal(str, dict)  # user_text, sentiment dict

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
        self._running_threads = set()
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
        self.tutor_language = os.environ.get("TUTOR_LANGUAGE", "all")
        self.tutor_subject = os.environ.get("TUTOR_SUBJECT", "all")
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
        
        # Dynamically scan ALL environment variables starting with GEMINI_API_KEY (e.g. GEMINI_API_KEY, GEMINI_API_KEY_1, GEMINI_API_KEY_2, etc.)
        self.gemini_keys = []
        for k, v in os.environ.items():
            if (k == "GEMINI_API_KEY" or k.startswith("GEMINI_API_KEY_")) and v and v.strip():
                val = v.strip()
                if val not in self.gemini_keys:
                    self.gemini_keys.append(val)

        # Select a random starting key index to distribute load across free tier keys
        if self.gemini_keys:
            import random
            self.current_key_index = random.randint(0, len(self.gemini_keys) - 1)
            print(f"[GeminiLive] Loaded {len(self.gemini_keys)} Gemini API keys. Initialized with random key index {self.current_key_index} (Ending in ...{self.gemini_keys[self.current_key_index][-4:]})")
        else:
            self.current_key_index = 0

        self.model_name = os.environ.get("GEMINI_MODEL", "gemini-3.1-flash-live-preview")
        self.noise_threshold = float(os.environ.get("VOICE_NOISE_THRESHOLD", "150.0"))

    @Slot()
    def start(self):
        if self.is_active or getattr(self, "_is_starting", False) or getattr(self, "_is_stopping", False):
            print("[GeminiLiveClient] Start ignored: session state transition in progress.")
            return

        self._is_starting = True
        self.is_paused = False  # Reset mute state on every new start!
        self.status = "connecting"
        self.state_changed.emit("connecting")
        
        if not self.gemini_keys:
            print("[GeminiLive] Error: GEMINI_API_KEY not found in env.")
            self.say_requested.emit("Error: GEMINI_API_KEY not found in .env file", 3.0)
            self.status = "error"
            self.state_changed.emit("error")
            self._is_starting = False
            return
            
        self.is_active = True
        self.user_explicitly_started_voice = True
        self.is_speaking = False
        self.turn_completed_received = False
        self.input_audio_buffer.clear()

        # Safely stop and join any existing worker thread before creating a new one
        if self.worker_thread:
            old_worker = self.worker_thread
            self.worker_thread = None
            old_worker.stop()
            old_worker.quit()
            old_worker.wait(1500)
            self._running_threads.discard(old_worker)

        worker = GeminiLiveWorker(self)
        self.worker_thread = worker
        self._running_threads.add(worker)
        worker.finished.connect(lambda w=worker: self._on_worker_thread_finished(w))
        worker.start()
        self._is_starting = False

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
        if getattr(self, "_is_stopping", False):
            return
        if not self.is_active and self.status == "disconnected":
            return
            
        self._is_stopping = True
        self.is_active = False
        self.is_paused = False  # Reset mute state on stop!
        self.user_explicitly_started_voice = False
        self.is_speaking = False
        self.turn_completed_received = False
        
        if hasattr(self, "mic_enable_timer"):
            self.mic_enable_timer.stop()
        
        if self.worker_thread:
            w_thread = self.worker_thread
            self.worker_thread = None
            w_thread.stop()
            w_thread.quit()
            w_thread.wait(2000)
            self._running_threads.discard(w_thread)
        self._is_stopping = False
            
        self.cleanup_audio()
        self.status = "disconnected"
        self.state_changed.emit("disconnected")
        self.say_requested.emit("Voice chat stopped.", 2.5)

    @Slot()
    def _on_worker_thread_finished(self, worker=None):
        """Slot executed on Qt Main Thread when worker QThread finishes cleanly."""
        print("[GeminiLiveClient] Worker thread finished cleanly.")
        self._is_stopping = False
        if worker is None:
            worker = self.sender()
        if worker:
            try:
                worker.finished.disconnect()
            except Exception:
                pass
            try:
                worker.wait(1000)
            except Exception:
                pass
            self._running_threads.discard(worker)
        self._is_stopping = False

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
        # Dynamically rotate key randomly (excluding the failed key) and retry if connecting fails
        if self.status == "connecting" and self.gemini_keys and len(self.gemini_keys) > 1:
            old_index = self.current_key_index
            import random
            available_indices = [i for i in range(len(self.gemini_keys)) if i != old_index]
            self.current_key_index = random.choice(available_indices)
            print(f"[GeminiLive] Dynamic key rotation: Key index {old_index} failed. Switched to random key index {self.current_key_index} (Key ending ...{self.gemini_keys[self.current_key_index][-4:]})")
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
                if self.worker_thread.loop.is_running():
                    self.worker_thread.loop.call_soon_threadsafe(
                        self.worker_thread.async_queue.put_nowait, chunk
                    )
            except (RuntimeError, AttributeError):
                pass
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
                if self.worker_thread.loop.is_running():
                    self.turn_completed_received = False
                    self.worker_thread.loop.call_soon_threadsafe(
                        self.worker_thread.audio_out_queue.put_nowait, audio_bytes
                    )
            except (RuntimeError, AttributeError):
                pass
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
        if not self.is_active:
            return
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
