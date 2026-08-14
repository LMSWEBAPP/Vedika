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

from engine.user_profile import UserProfileManager
from engine.memory import MemoryManager

def load_routes_for_prompt() -> str:
    """Reads routes.json and formats instructions for Gemini Live model."""
    routes_path = "routes.json"
    if os.path.exists(routes_path):
        try:
            with open(routes_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                lines = []
                for item in data.get("routes", []):
                    r_id = item.get("id")
                    label = item.get("label", "")
                    aliases = ", ".join(item.get("aliases", []))
                    lines.append(f"   - '{r_id}' for {label} ({aliases}).")
                if lines:
                    return "\n".join(lines) + "\n"
        except Exception as e:
            print(f"[!] Warning: Could not parse routes.json for system prompt: {e}")

    return (
        "   - '/' for Dashboard / Main home page.\n"
        "   - '/courses' for Courses and learning modules.\n"
        "   - '/vedika-ai' for Vedika AI Tutor.\n"
        "   - '/vedika-ai/code' for Coding Tutor.\n"
        "   - '/code-puzzle' for Coding Puzzles and practice problems.\n"
        "   - '/viva-interview' for Viva & Interview prep.\n"
        "   - '/vedika-labs' for Virtual Science/Math Labs.\n"
        "   - '/jobs' for Jobs and placements.\n"
        "   - '/progress' for Student progress and stats.\n"
    )

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
    Normalized Least Mean Squares (NLMS) Adaptive Echo Canceller in pure NumPy.
    Subtracts known speaker audio (reference signal) from microphone input in real time.
    """
    def __init__(self, filter_len=256, mu=0.1, mic_rate=16000, ref_rate=24000):
        self.filter_len = filter_len
        self.mu = mu
        self.mic_rate = mic_rate
        self.ref_rate = ref_rate
        self.w = np.zeros(filter_len, dtype=np.float32)
        self.ref_history = np.zeros(filter_len * 8, dtype=np.float32)

    def push_reference(self, ref_bytes: bytes):
        """Pushes speaker audio chunk to reference history buffer (resampled from 24kHz to 16kHz)."""
        ref = np.frombuffer(ref_bytes, dtype=np.int16).astype(np.float32)
        if len(ref) == 0:
            return
        step = self.ref_rate / self.mic_rate
        indices = np.arange(0, len(ref), step).astype(int)
        indices = np.clip(indices, 0, len(ref) - 1)
        ref_16k = ref[indices]
        self.ref_history = np.concatenate([self.ref_history, ref_16k])[-self.filter_len * 8:]

    def process(self, mic_bytes: bytes) -> tuple[np.ndarray, float]:
        """
        Calculates NLMS adaptive echo cancellation on mic chunk against reference buffer.
        Returns (residual_samples, residual_rms).
        """
        mic = np.frombuffer(mic_bytes, dtype=np.int16).astype(np.float32)
        if len(mic) == 0:
            return mic, 0.0

        if len(self.ref_history) < self.filter_len + len(mic):
            rms = float(np.sqrt(np.mean(mic**2))) if len(mic) > 0 else 0.0
            return mic, rms

        # True sample-by-sample NLMS adaptive filter over mic chunk
        ref_buf = self.ref_history
        N = len(mic)
        L = self.filter_len
        residual = np.zeros(N, dtype=np.float32)

        for n in range(N):
            idx_end = len(ref_buf) - N + n
            x_n = ref_buf[idx_end - L : idx_end]
            if len(x_n) < L:
                residual[n] = mic[n]
                continue

            y_n = np.dot(self.w, x_n)
            e_n = mic[n] - y_n
            residual[n] = e_n

            norm_x = np.dot(x_n, x_n) + 1e-4
            self.w += (self.mu / norm_x) * e_n * x_n

        residual_rms = float(np.sqrt(np.mean(residual**2)))
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
        self.current_turn_user_transcription = ""
        self.current_turn_model_text = ""
        self.in_session_history = []
        self.session_id = str(int(time.time()))
        self.last_user_sentiment = None

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
    async def request_main_thread_screenshot(self) -> bytes:
        """Safely dispatches screenshot capture to Qt Main Thread and awaits result with 3.5s timeout."""
        if not self.loop or self.loop.is_closed():
            print("[GeminiLiveWorker] Error: Worker event loop is closed or missing.")
            return b""
            
        # 150ms stabilization pause allowing OS window focus transitions to complete
        await asyncio.sleep(0.15)

        fut = self.loop.create_future()
        print("[GeminiLiveWorker] Emitting screen_capture_requested signal to main thread...")
        self.client.screen_capture_requested.emit(fut, self.loop)
        
        try:
            # Await result with 3.5s timeout safeguard
            jpeg_bytes = await asyncio.wait_for(fut, timeout=3.5)
            print(f"[GeminiLiveWorker] Successfully received screenshot payload ({len(jpeg_bytes)/1024:.1f} KB) from main thread.")
            return jpeg_bytes
        except asyncio.TimeoutError:
            print("[GeminiLiveWorker] Error: Screen capture timed out after 3.5s.")
            return b""
        except Exception as e:
            print(f"[GeminiLiveWorker] Screen capture bridge error: {e}")
            return b""

    async def _reset_tool_executing_after_delay(self, delay=2.5):
        await asyncio.sleep(delay)
        if hasattr(self, "client") and self.client:
            self.client.tool_executing = False

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
            """Stops or pauses active voice session ONLY when student explicitly says 'bye', 'goodbye', 'stop listening', or 'close voice chat'."""
            if getattr(self.client, "tool_executing", False):
                return {"status": "ignored"}
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

        def trigger_pet_action(action: str, target: str = "") -> dict:
            """Triggers a remote page action on the active WebApp page (e.g. 'start_presentation', 'show_architecture', 'clear_screen', 'start_viva')."""
            if hasattr(self.client, 'trigger_action_requested'):
                self.client.trigger_action_requested.emit(action, target)
            return {"status": "success", "action": action, "target": target}

        async def capture_user_screen() -> dict:
            """Captures and analyzes the student's active computer screen when asked 'What is on my screen?', 'What am I looking at?', 'Explain what is on my screen', or when visual screen assistance is requested."""
            print("[GeminiLiveWorker] Tool call request received: capture_user_screen")
            self.client.tool_executing = True
            try:
                jpeg_bytes = await self.request_main_thread_screenshot()
                
                if jpeg_bytes:
                    if self.session and self.client.is_active:
                        try:
                            print(f"[GeminiLiveWorker] Transmitting screen image blob ({len(jpeg_bytes)/1024:.1f} KB) to Gemini Live session via video field...")
                            await self.session.send_realtime_input(
                                video=types.Blob(
                                    data=jpeg_bytes,
                                    mime_type="image/jpeg"
                                )
                            )
                            print("[GeminiLiveWorker] Screen image blob successfully transmitted to Gemini Live session!")
                            return {"status": "success", "image_received": True, "message": "Screen image ingested. Analyzing content."}
                        except Exception as e:
                            print(f"[GeminiLiveWorker] Error transmitting screen image blob: {e}")
                            return {"status": "error", "message": f"Failed to transmit screen image to model: {e}"}
                    return {"status": "error", "message": "Gemini Live session is inactive."}
                else:
                    print("[GeminiLiveWorker] Warning: Screenshot request returned empty bytes.")
                    return {"status": "error", "message": "Failed to capture screen image."}
            finally:
                asyncio.create_task(self._reset_tool_executing_after_delay(2.5))

        def point_to_screen_location(x: float, y: float, label: str = "", action: str = "point") -> dict:
            """Points to or highlights a specific UI element, code line, error, or button on the student's screen using normalized coordinates (x: 0.0 to 1.0, y: 0.0 to 1.0)."""
            print(f"[GeminiLiveWorker] Tool call: point_to_screen_location(x={x}, y={y}, label='{label}', action='{action}')")
            self.client.point_location_requested.emit(x, y, label, action)
            return {"status": "success", "pointing_at": {"x": x, "y": y, "label": label, "action": action}}

        def save_student_memory(category: str, subject: str, topic: str, note: str) -> dict:
            """Saves or updates a key learning insight, struggle, mastered concept, or academic preference into long-term memory. STRICTLY for academic/learning facts only. Never log personal/private life details."""
            print(f"[GeminiLiveWorker] Tool call: save_student_memory(category='{category}', subject='{subject}', topic='{topic}', note='{note}')")
            mm = MemoryManager()
            res = mm.save_memory(category, subject, topic, note)
            return {"status": "success" if res else "failed", "saved": {"category": category, "subject": subject, "topic": topic}}

        def recall_previous_questions(limit: int = 3) -> dict:
            """Retrieves the exact verbatim previous questions the student asked in this session or earlier voice sessions. ALWAYS call this when the student asks 'What was my previous question?', 'What did I ask before?', or asks to review what they previously asked."""
            print(f"[GeminiLiveWorker] Tool call: recall_previous_questions(limit={limit})")
            in_session_questions = [t["text"] for t in self.in_session_history if t["role"] == "student"]
            mm = MemoryManager()
            db_questions = mm.get_previous_student_questions(limit=limit + 3)
            all_questions = []
            for q_text in reversed(in_session_questions):
                if q_text not in all_questions:
                    all_questions.append(q_text)
            for row in db_questions:
                txt = row.get("text", "")
                if txt and txt not in all_questions:
                    all_questions.append(txt)
            final_list = all_questions[:limit]
            return {
                "status": "success",
                "count": len(final_list),
                "previous_questions": final_list,
                "latest_question": final_list[0] if final_list else "No prior question recorded"
            }

        def search_learning_memory(query: str = "", category: str = "all") -> dict:
            """Searches long-term academic memory and conversation records for specific concepts, topics, struggles, or past answers."""
            print(f"[GeminiLiveWorker] Tool call: search_learning_memory(query='{query}', category='{category}')")
            mm = MemoryManager()
            mems = mm.search_memories(query=query, category=category)
            convs = mm.search_conversation_history(query=query, limit=5)
            return {
                "status": "success",
                "memories": mems,
                "dialogue_matches": convs
            }

        def update_student_profile(name: str = "", stage: str = "", field_of_study: str = "", hobbies: str = "", favorite_topics: str = "") -> dict:
            """Updates student personalization info (e.g. when student introduces themselves, tells you their name, grade level, major, hobbies, or favorite subjects)."""
            print(f"[GeminiLiveWorker] Tool call: update_student_profile(name='{name}', stage='{stage}', field='{field_of_study}')")
            upm = UserProfileManager()
            upm.update_user_info(
                name=name if name else None,
                stage=stage if stage else None,
                field_of_study=field_of_study if field_of_study else None,
                hobbies=hobbies if hobbies else None,
                favorite_topics=favorite_topics if favorite_topics else None
            )
            return {"status": "success", "message": "Student profile updated successfully."}

        def clear_student_memory() -> dict:
            """Clears all stored learning history and topic memories when student explicitly asks 'clear my memory' or 'reset my history'."""
            print("[GeminiLiveWorker] Tool call: clear_student_memory")
            mm = MemoryManager()
            mm.clear_all_memories()
            return {"status": "success", "message": "All student memories cleared."}

        def set_study_timer(duration_seconds: int, label: str = "Study Timer") -> dict:
            """Sets a visual countdown timer capsule on the desktop pet when the student asks to set a timer, reminder, or study session (e.g. 'set a timer for 10 minutes', 'remind me in 5 minutes')."""
            print(f"[GeminiLiveWorker] Tool call: set_study_timer(duration_seconds={duration_seconds}, label='{label}')")
            self.client.timer_requested.emit(int(duration_seconds), str(label))
            mins = max(1, int(duration_seconds) // 60)
            return {"status": "success", "timer_started": f"{mins} minutes for {label}"}

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
            "\n\nSOCRATIC PEDAGOGY (ACTIVE INQUIRY & CHECK-IN CYCLES):\n"
            "1. PRE-EXPLANATION INTUITION PROBE: When a student asks for help, asks a question, or brings up a topic, do NOT immediately dump the direct answer or full solution. First, ask what they already know or what their intuition is (e.g., 'What do you already know about [concept]?' or 'Before I explain, what do you think is the first step?').\n"
            "2. GUIDED DISCOVERY: Break problems into simple pieces, provide intuitive analogies or tiny hints, and ask guided questions so the student discovers the solution themselves step by step.\n"
            "3. POST-EXPLANATION COMPREHENSION CHECK: After explaining any concept, answering a question, or breaking down a solution, ALWAYS conclude with a short, friendly check-in question or micro-challenge (e.g., 'Does that make sense? What would happen if we doubled X?' or 'Can you tell me a quick real-world example of this?') to verify understanding.\n"
            "4. CELEBRATION & ENCOURAGEMENT: Celebrate and cheer when the student answers correctly or tries.\n"
            "5. SOCRATIC ESCAPE HATCH: If the student explicitly demands 'Just give me the answer', 'I am in a hurry', or after 3 unsuccessful attempts, provide the clear answer directly, followed by a 1-sentence breakdown of why it works and a quick check-in.\n"
            "\nCONTINUOUS MEMORY & CONVERSATIONAL RECALL RULES:\n"
            "1. You have continuous, persistent memory across voice sessions and real-time tracking of what the student is asking.\n"
            "2. ANTI-HALLUCINATION RECALL RULE: When the student asks 'What was my previous question?', 'What did I ask earlier?', 'What were we talking about?', or 'Do you remember me?':\n"
            "   - Immediately check the [RECENT VOICE CONVERSATION HISTORY] context below, or call the 'recall_previous_questions()' tool function to retrieve the exact previous questions verbatim!\n"
            "   - NEVER invent, hallucinate, or guess a question that the student did not ask.\n"
            "   - Answer directly and accurately (e.g., 'Your previous question was: [Exact Question]').\n"
            "3. PROACTIVE TOPIC FOLLOW-UP: When reconnecting or starting a session, if you remember past topics or previous questions, warmly ask a quick follow-up on how that topic is going!\n"
            "4. STUDENT PERSONALIZATION: When the student shares their name, grade level, school/college, field of study, or hobbies, call 'update_student_profile()' to remember it.\n"
            "5. LEARNING MEMORY: Whenever the student reveals a recurring struggle, masters a topic, or expresses a study preference, call 'save_student_memory(category, subject, topic, note)'.\n"
            "6. If the student asks to clear/forget their study history, call 'clear_student_memory()'.\n"
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

        # Dynamic User Profile Context Injection
        student_name = "there"
        try:
            upm = UserProfileManager()
            profile_ctx = upm.get_system_instruction_context()
            sys_inst += profile_ctx
            student_name = upm.profile.get("user", {}).get("name", "there")
        except Exception as e:
            print(f"[GeminiLiveWorker] Could not attach user profile context: {e}")

        # Dynamic Recent Voice Conversation History Context Injection
        try:
            conv_ctx = MemoryManager().get_conversation_context_for_prompt(limit=6)
            if conv_ctx:
                sys_inst += conv_ctx
        except Exception as e:
            print(f"[GeminiLiveWorker] Could not attach conversation history context: {e}")

        # Dynamic Long-Term SQLite Memory Context Injection
        try:
            mem_ctx = MemoryManager().get_relevant_memories(current_subject=tutor_subj, limit=7)
            if mem_ctx:
                sys_inst += mem_ctx
        except Exception as e:
            print(f"[GeminiLiveWorker] Could not attach memory context: {e}")

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

        route_instructions = load_routes_for_prompt()
        sys_inst += (
            "TOOLS & IMMEDIATE ACTIONS:\n"
            "1. When the user asks to play a song, music, video, or study material: "
            "IMMEDIATELY call 'play_music' or 'open_website' tool function on your VERY FIRST turn.\n"
            "2. If the user asks to open or navigate to any page, tab, or section in Vyomanta LMS: call 'navigate_webapp' with the appropriate route string:\n"
            + route_instructions +
            "3. If the user asks to control or trigger actions on a page (like start presentation, show module architecture, clear screen), call 'trigger_pet_action'.\n"
            "4. If the user asks for a hint on their current puzzle, call 'trigger_puzzle_hint'.\n"
            "5. If the user asks for Vyomanta portal, call 'navigate_webapp' with '/' or 'open_website' with 'https://vyomanta.vercel.app/'.\n"
            "6. If the user asks to stop or pause voice chat, call 'stop_voice_chat' immediately.\n"
            "7. You can also trigger pet visual animations on yourself ('wave', 'jump', 'failed', 'waiting', 'review', 'idle').\n"
            "8. SCREEN VISION: When the user asks 'What is on my screen?', 'Can you see what I am doing?', 'Explain what is on my screen', or asks a visual question about their active computer screen: IMMEDIATELY call 'capture_user_screen' tool function on your VERY FIRST turn. Once the image is received, describe and assist with what is visible clearly and concisely. ALWAYS base your visual response strictly on the VERY LATEST image frame received in the current turn. Ignore any older image frames from earlier turns.\n"
            "9. VISUAL POINTING & LASER HIGHLIGHT: When explaining code errors, UI buttons, syntax mistakes, or specific elements on the user's screen: IMMEDIATELY call 'point_to_screen_location(x, y, label)' with normalized coordinates (x: 0.0 to 1.0, y: 0.0 to 1.0) to highlight the exact position with a glowing laser pointer and sonar pulse for the student.\n"
            "10. RECALL PREVIOUS QUESTIONS & MEMORY SEARCH: Call 'recall_previous_questions(limit)' when the student asks what was previously asked, or 'search_learning_memory(query, category)' to search stored academic insights and past discussions.\n"
            "11. LEARNING MEMORY & PROFILE: Call 'save_student_memory(category, subject, topic, note)' to remember struggles/masteries, 'update_student_profile(name, stage, field_of_study, hobbies, favorite_topics)' to remember student details, or 'clear_student_memory' to clear history.\n"
            "12. STUDY TIMER: Call 'set_study_timer(duration_seconds, label)' when the student asks to set a timer, reminder, or study countdown (e.g. 'set a 10 min timer', 'remind me in 5 minutes')."
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
            tools=[
                play_animation, open_website, play_music, stop_voice_chat, navigate_webapp,
                trigger_puzzle_hint, trigger_pet_action, capture_user_screen, point_to_screen_location,
                recall_previous_questions, search_learning_memory, update_student_profile,
                save_student_memory, clear_student_memory, set_study_timer
            ]
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
                
                # Fetch most recent student question to enable natural follow-up reconnect greeting
                prev_questions = MemoryManager().get_previous_student_questions(limit=1)
                prev_q = prev_questions[0].get("text", "") if prev_questions else ""
                # Filter out trivial greetings/control commands
                is_meaningful_prev_q = (
                    bool(prev_q) and len(prev_q.split()) >= 2 and
                    not any(w in prev_q.lower() for w in ["bye", "stop", "pause", "hello", "hi vedika", "what was my previous", "what did i ask"])
                )

                if is_meaningful_prev_q and student_name and student_name.lower() != "there":
                    clean_q = prev_q.strip().rstrip("?").strip()
                    greeting_text = (
                        f"Speak this exact sentence warmly out loud: 'Hi {student_name}! Vedika here. Last time you asked about {clean_q} - did that make sense, or should we review it? What are we studying today?' and wave to me."
                    )
                elif is_meaningful_prev_q:
                    clean_q = prev_q.strip().rstrip("?").strip()
                    greeting_text = (
                        f"Speak this exact sentence warmly out loud: 'Hi there! Vedika here. Last time we talked about {clean_q} - how is that going? What are we exploring today?' and wave to me."
                    )
                elif student_name and student_name.lower() != "there":
                    greeting_text = f"Speak this exact sentence warmly out loud: 'Hi {student_name}, I am Vedika! What are we exploring today?' and wave to me."
                else:
                    greeting_text = "Speak this exact sentence warmly out loud: 'Hi, I am Vedika! What are we exploring today?' and wave to me."

                print(f"[GeminiLiveWorker] Initial greeting prompt: {greeting_text}")
                await session.send_realtime_input(text=greeting_text)

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
                # Mute mic audio when session is paused, audio is stopping, or tool is executing
                if getattr(self.client, "is_paused", False) or getattr(self, "_stopping_audio", False) or getattr(self.client, "tool_executing", False):
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
            pcm_buffer = bytearray()
            while self.client.is_active and self.speaker_stream and not getattr(self, "_stopping_audio", False):
                # Pause audio output when session is paused or audio is stopping
                if getattr(self.client, "is_paused", False) or getattr(self, "_stopping_audio", False):
                    await asyncio.sleep(0.05)
                    continue

                try:
                    chunk = await asyncio.wait_for(self.audio_out_queue.get(), timeout=0.05)
                except asyncio.TimeoutError:
                    chunk = None

                if chunk is None and getattr(self, "_stopping_audio", False):
                    break
                
                # Check for thread-safe interruption flush request
                if self.flush_speaker:
                    self.flush_speaker = False
                    pcm_buffer.clear()
                    print("[GeminiLiveWorker] Flushed speaker queue on user interruption.")
                    while not self.audio_out_queue.empty():
                        try:
                            self.audio_out_queue.get_nowait()
                        except Exception:
                            break
                    continue

                if chunk:
                    pcm_buffer.extend(chunk)

                # Buffer PCM chunks to at least 2400 bytes (50ms of 24kHz mono) for smooth, non-stuttering PyAudio playback
                min_chunk_bytes = 2400
                while len(pcm_buffer) >= min_chunk_bytes or (chunk is None and len(pcm_buffer) > 0 and self.audio_out_queue.empty()):
                    send_len = min_chunk_bytes if len(pcm_buffer) >= min_chunk_bytes else len(pcm_buffer)
                    play_bytes = bytes(pcm_buffer[:send_len])
                    del pcm_buffer[:send_len]

                    n += 1
                    print(f"[PLAY] Playing smooth audio chunk {n}, length={len(play_bytes)} bytes.")
                    
                    # Push far-end reference audio to Block-NLMS Echo Canceller
                    self.aec.push_reference(play_bytes)

                    if not self.speaker_stream:
                        break

                    try:
                        # Play audio chunk asynchronously to prevent event loop blocking
                        await asyncio.to_thread(self.speaker_stream.write, play_bytes)
                    except Exception as ex:
                        print(f"[GeminiLiveWorker] Speaker stream write gracefully stopped: {ex}")
                        break
                    
                    # Thread-safely trigger client timer
                    self.client.mic_timer_trigger.emit(2500)
                
                # Check if we finished playing all chunks after turn completed
                if self.audio_out_queue.empty() and len(pcm_buffer) == 0 and getattr(self.client, "turn_completed_received", False):
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
                            if getattr(self.client, "tool_executing", False):
                                print("[GeminiLiveWorker] Suppressed false server VAD interruption signal during active tool execution.")
                            else:
                                print("[GeminiLiveWorker] Gemini Server VAD emitted interrupted=True! Halting local speaker.")
                                self.client.interrupted.emit()
                        
                        # Extract incoming streaming user speech transcription chunks
                        user_delta = ""
                        if hasattr(sc, "input_transcription") and sc.input_transcription and getattr(sc.input_transcription, "text", None):
                            user_delta = sc.input_transcription.text
                        elif hasattr(sc, "input_audio_transcription") and sc.input_audio_transcription and getattr(sc.input_audio_transcription, "text", None):
                            user_delta = sc.input_audio_transcription.text
                        
                        if user_delta:
                            self.current_turn_user_transcription += user_delta
                            user_text = self.current_turn_user_transcription.strip()
                            if user_text:
                                self.last_user_query = user_text
                                sentiment = analyze_sentiment(user_text)
                                self.last_user_sentiment = sentiment
                                self.client.user_dialogue_buffer = user_text
                                self.client.user_sentiment_detected.emit(user_text, sentiment)
                                # Live chunk by chunk user transcript preview on Line 1, status on Line 2
                                self.client.say_dialogue_requested.emit(user_text, "Thinking... 🤔", 6.0)
                            self.client.thinking_started.emit()
                        
                        # Extract incoming streaming AI spoken audio & transcript chunks
                        ai_delta = ""
                        if hasattr(sc, "output_transcription") and sc.output_transcription and getattr(sc.output_transcription, "text", None):
                            ai_delta = sc.output_transcription.text
                        elif hasattr(sc, "output_audio_transcription") and sc.output_audio_transcription and getattr(sc.output_audio_transcription, "text", None):
                            ai_delta = sc.output_audio_transcription.text

                        if ai_delta:
                            self.current_turn_model_text += ai_delta
                            self.client.text_received.emit(ai_delta)
                        
                        model_turn = sc.model_turn
                        if model_turn:
                            for part in model_turn.parts:
                                if hasattr(part, "text") and part.text:
                                    self.current_turn_model_text += part.text
                                    self.client.text_received.emit(part.text)
                                if hasattr(part, "inline_data") and part.inline_data:
                                    self.client.audio_received.emit(part.inline_data.data)
                        
                        if sc.turn_complete:
                            self.client.turn_completed.emit()
                            user_q = self.current_turn_user_transcription.strip()
                            tutor_ans = self.current_turn_model_text.strip()
                            t_subj = getattr(self.client, "tutor_subject", "general")
                            t_subj = t_subj if t_subj != "all" else "general"

                            if user_q:
                                self.in_session_history.append({"role": "student", "text": user_q})
                                try:
                                    MemoryManager().log_voice_turn(
                                        role="student",
                                        text=user_q,
                                        sentiment=self.last_user_sentiment,
                                        subject=t_subj,
                                        session_id=self.session_id
                                    )
                                except Exception as e:
                                    print(f"[GeminiLiveWorker] Error logging student voice turn: {e}")

                            if tutor_ans:
                                self.in_session_history.append({"role": "tutor", "text": tutor_ans})
                                try:
                                    MemoryManager().log_voice_turn(
                                        role="tutor",
                                        text=tutor_ans,
                                        subject=t_subj,
                                        session_id=self.session_id
                                    )
                                except Exception as e:
                                    print(f"[GeminiLiveWorker] Error logging tutor voice turn: {e}")

                            # Reset current turn buffers
                            self.current_turn_user_transcription = ""
                            self.current_turn_model_text = ""
                            self.last_user_sentiment = None
                    
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
                            elif func_name == "capture_user_screen":
                                print("[GeminiLiveWorker] Executing tool capture_user_screen via main-thread bridge...")
                                self.client.tool_executing = True
                                try:
                                    jpeg_bytes = await self.request_main_thread_screenshot()
                                    if jpeg_bytes:
                                        if self.session and self.client.is_active:
                                            try:
                                                print(f"[GeminiLiveWorker] Transmitting screen image blob ({len(jpeg_bytes)/1024:.1f} KB) to Gemini Live session via video field...")
                                                await self.session.send_realtime_input(
                                                    video=types.Blob(
                                                        data=jpeg_bytes,
                                                        mime_type="image/jpeg"
                                                    )
                                                )
                                                print("[GeminiLiveWorker] Screen image blob successfully transmitted to Gemini Live session!")
                                                function_responses.append(
                                                    types.FunctionResponse(
                                                        name=func_name,
                                                        id=fc.id,
                                                        response={"status": "success", "image_received": True, "message": "Screen image ingested. Analyzing content."}
                                                    )
                                                )
                                            except Exception as e:
                                                print(f"[GeminiLiveWorker] Error transmitting screen image blob: {e}")
                                                function_responses.append(
                                                    types.FunctionResponse(
                                                        name=func_name,
                                                        id=fc.id,
                                                        response={"status": "error", "message": f"Failed to transmit screen image: {e}"}
                                                    )
                                                )
                                        else:
                                            function_responses.append(
                                                types.FunctionResponse(
                                                    name=func_name,
                                                    id=fc.id,
                                                    response={"status": "error", "message": "Gemini Live session is inactive."}
                                                )
                                            )
                                    else:
                                        function_responses.append(
                                            types.FunctionResponse(
                                                name=func_name,
                                                id=fc.id,
                                                response={"status": "error", "message": "Failed to capture screen image."}
                                            )
                                        )
                                finally:
                                    asyncio.create_task(self._reset_tool_executing_after_delay(2.5))
                            elif func_name == "point_to_screen_location":
                                try:
                                    x_val = float(args.get("x", 0.5))
                                    y_val = float(args.get("y", 0.5))
                                except Exception:
                                    x_val, y_val = 0.5, 0.5
                                label_str = str(args.get("label", ""))
                                action_str = str(args.get("action", "point"))
                                print(f"[GeminiLiveWorker] Executing tool point_to_screen_location: x={x_val}, y={y_val}, label='{label_str}', action='{action_str}'")
                                self.client.point_location_requested.emit(x_val, y_val, label_str, action_str)
                                function_responses.append(
                                    types.FunctionResponse(
                                        name=func_name,
                                        id=fc.id,
                                        response={"status": "success", "pointing_at": {"x": x_val, "y": y_val, "label": label_str}}
                                    )
                                )
                            elif func_name == "recall_previous_questions":
                                try:
                                    limit = int(args.get("limit", 3))
                                except Exception:
                                    limit = 3
                                in_session_questions = [t["text"] for t in self.in_session_history if t["role"] == "student"]
                                mm = MemoryManager()
                                db_questions = mm.get_previous_student_questions(limit=limit + 3)
                                all_questions = []
                                for q_text in reversed(in_session_questions):
                                    if q_text not in all_questions:
                                        all_questions.append(q_text)
                                for row in db_questions:
                                    txt = row.get("text", "")
                                    if txt and txt not in all_questions:
                                        all_questions.append(txt)
                                final_list = all_questions[:limit]
                                print(f"[GeminiLiveWorker] Executing tool recall_previous_questions -> {final_list}")
                                function_responses.append(
                                    types.FunctionResponse(
                                        name=func_name,
                                        id=fc.id,
                                        response={
                                            "status": "success",
                                            "count": len(final_list),
                                            "previous_questions": final_list,
                                            "latest_question": final_list[0] if final_list else "No prior question recorded"
                                        }
                                    )
                                )
                            elif func_name == "search_learning_memory":
                                q_str = str(args.get("query", ""))
                                cat_str = str(args.get("category", "all"))
                                print(f"[GeminiLiveWorker] Executing tool search_learning_memory: query='{q_str}', category='{cat_str}'")
                                mm = MemoryManager()
                                mems = mm.search_memories(query=q_str, category=cat_str)
                                convs = mm.search_conversation_history(query=q_str, limit=5)
                                function_responses.append(
                                    types.FunctionResponse(
                                        name=func_name,
                                        id=fc.id,
                                        response={"status": "success", "memories": mems, "dialogue_matches": convs}
                                    )
                                )
                            elif func_name == "update_student_profile":
                                n = args.get("name")
                                st = args.get("stage")
                                fld = args.get("field_of_study")
                                hb = args.get("hobbies")
                                fav = args.get("favorite_topics")
                                print(f"[GeminiLiveWorker] Executing tool update_student_profile: name={n}, stage={st}, field={fld}")
                                upm = UserProfileManager()
                                upm.update_user_info(name=n, stage=st, field_of_study=fld, hobbies=hb, favorite_topics=fav)
                                function_responses.append(
                                    types.FunctionResponse(
                                        name=func_name,
                                        id=fc.id,
                                        response={"status": "success", "message": "Student profile updated successfully."}
                                    )
                                )
                            elif func_name == "save_student_memory":
                                cat = str(args.get("category", "struggling"))
                                subj = str(args.get("subject", "general"))
                                top = str(args.get("topic", ""))
                                note = str(args.get("note", ""))
                                print(f"[GeminiLiveWorker] Executing tool save_student_memory: [{cat} | {subj}] {top} - '{note}'")
                                mm = MemoryManager()
                                res = mm.save_memory(cat, subj, top, note)
                                function_responses.append(
                                    types.FunctionResponse(
                                        name=func_name,
                                        id=fc.id,
                                        response={"status": "success" if res else "failed", "saved": {"category": cat, "subject": subj, "topic": top}}
                                    )
                                )
                            elif func_name == "clear_student_memory":
                                print("[GeminiLiveWorker] Executing tool clear_student_memory")
                                mm = MemoryManager()
                                mm.clear_all_memories()
                                function_responses.append(
                                    types.FunctionResponse(
                                        name=func_name,
                                        id=fc.id,
                                        response={"status": "success", "message": "All student memories cleared."}
                                    )
                                )
                            elif func_name == "set_study_timer":
                                try:
                                    dur = int(args.get("duration_seconds", 300))
                                except Exception:
                                    dur = 300
                                lbl = str(args.get("label", "Study Timer"))
                                print(f"[GeminiLiveWorker] Executing tool set_study_timer: duration={dur}s, label='{lbl}'")
                                self.client.timer_requested.emit(dur, lbl)
                                mins = max(1, dur // 60)
                                function_responses.append(
                                    types.FunctionResponse(
                                        name=func_name,
                                        id=fc.id,
                                        response={"status": "success", "timer_started": f"{mins} minutes for {lbl}"}
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
                if self.client and self.client.is_active:
                    self.client.connection_failed.emit(f"WebSocket error/closure: {e}")
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
    trigger_action_requested = Signal(str, str)  # action, target
    screen_capture_requested = Signal(object, object)  # future, loop
    point_location_requested = Signal(float, float, str, str)  # x, y, label, action
    timer_requested = Signal(int, str)  # duration_seconds, label
    session_activated = Signal()
    speaking_started = Signal()
    speaking_stopped = Signal()

    say_dialogue_requested = Signal(str, str, float)  # user_text, ai_text, duration
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
        self.user_dialogue_buffer = ""
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
        
        # Sentence-by-Sentence Teleprompter streaming state
        self.sentence_chunks = []
        self.current_chunk_index = 0
        self.current_chunk_words_displayed = 0
        self.chunk_pause_ticks = 0
        self.word_stream_timer = QTimer(self)
        self.word_stream_timer.setInterval(80) # 80ms per word tick (~12.5 words/sec matching natural speech)
        self.word_stream_timer.timeout.connect(self._step_word_stream)

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

    def _group_into_sentence_chunks(self, text, max_words_per_chunk=10):
        """Groups raw streamed text into crisp, readable sentence chunks."""
        import re
        if not text or not text.strip():
            return []
        
        raw_parts = [p.strip() for p in re.split(r'(?<=[.!?\n])\s+', text.strip()) if p.strip()]
        if not raw_parts:
            return [text.strip()]
            
        chunks = []
        current_chunk = ""
        for part in raw_parts:
            if not current_chunk:
                current_chunk = part
            else:
                combined_words = len((current_chunk + " " + part).split())
                if combined_words <= max_words_per_chunk:
                    current_chunk += " " + part
                else:
                    chunks.append(current_chunk)
                    current_chunk = part
        if current_chunk:
            chunks.append(current_chunk)
        return chunks

    def _step_word_stream(self):
        """Streams AI speech bubble sentence-by-sentence in sync with voice audio playback."""
        if not self.is_active:
            self.word_stream_timer.stop()
            return
            
        self.sentence_chunks = self._group_into_sentence_chunks(self.text_buffer)
        if not self.sentence_chunks:
            return

        if self.current_chunk_index >= len(self.sentence_chunks):
            if self.turn_completed_received:
                self.word_stream_timer.stop()
            return

        active_chunk = self.sentence_chunks[self.current_chunk_index]
        chunk_words = active_chunk.split()

        # Stream words progressively within the active sentence
        if self.current_chunk_words_displayed < len(chunk_words):
            self.current_chunk_words_displayed += 1
            visible_words = chunk_words[:self.current_chunk_words_displayed]
            current_text = " ".join(visible_words)
            user_txt = getattr(self, "user_dialogue_buffer", "")
            if user_txt:
                self.say_dialogue_requested.emit(user_txt, current_text, 7.0)
            else:
                self.say_requested.emit(current_text, 7.0)
        else:
            # Current sentence is completely displayed
            # If more sentences exist from the speaker, wait a brief breathing pause (~320ms) then advance to next sentence!
            if self.current_chunk_index + 1 < len(self.sentence_chunks):
                if self.chunk_pause_ticks < 4:
                    self.chunk_pause_ticks += 1
                else:
                    self.chunk_pause_ticks = 0
                    self.current_chunk_index += 1
                    self.current_chunk_words_displayed = 0
            else:
                if self.turn_completed_received:
                    self.word_stream_timer.stop()

    @Slot(str)
    def on_text_received(self, text):
        self.text_buffer += text
        if not self.word_stream_timer.isActive():
            self.current_chunk_index = 0
            self.current_chunk_words_displayed = 0
            self.chunk_pause_ticks = 0
            self.word_stream_timer.start()

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
        # Keep the final sentence or full thought pinned for reading
        self.sentence_chunks = self._group_into_sentence_chunks(self.text_buffer)
        if self.sentence_chunks:
            final_sentence = self.sentence_chunks[-1]
            user_txt = getattr(self, "user_dialogue_buffer", "")
            if user_txt:
                self.say_dialogue_requested.emit(user_txt, final_sentence, 8.0)
            else:
                self.say_requested.emit(final_sentence, 8.0)
        self.word_stream_timer.stop()
        self.text_buffer = ""
        self.current_chunk_index = 0
        self.current_chunk_words_displayed = 0
        self.chunk_pause_ticks = 0
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

        self.word_stream_timer.stop()
        self.sentence_chunks = []
        self.current_chunk_index = 0
        self.current_chunk_words_displayed = 0
        self.chunk_pause_ticks = 0
        self.text_buffer = ""
        self.say_requested.emit("...", 1.5)

    @Slot()
    def on_thinking_started(self):
        pass
