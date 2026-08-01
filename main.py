import os
import sys
import json
import time
import traceback

if sys.platform == "win32":
    try:
        import io
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
    except Exception:
        pass

from PySide6.QtWidgets import QApplication
from PySide6.QtCore import QTimer, QThread, QObject, Slot, Signal, QUrl
from PySide6.QtGui import QCursor, Qt
from PySide6.QtWebSockets import QWebSocket

def log_uncaught_exception(exc_type, exc_value, exc_tb):
    err_msg = "".join(traceback.format_exception(exc_type, exc_value, exc_tb))
    print(f"\n[CRITICAL ERROR UNCAUGHT]:\n{err_msg}", file=sys.stderr)
    try:
        with open("crash.log", "a", encoding="utf-8") as f:
            f.write(f"\n--- Crash Log [{time.ctime()}] ---\n{err_msg}\n")
    except Exception:
        pass
    sys.__excepthook__(exc_type, exc_value, exc_tb)

sys.excepthook = log_uncaught_exception

from engine.sprite import SpriteLoader
from engine.pet import Pet
from engine.activity_tracker import DesktopActivityTracker
from ui.transparent_window import TransparentWindow

class DesktopPetApp(QObject):
    yt_resolved_signal = Signal(str)

    def __init__(self):
        super().__init__()
        self.yt_resolved_signal.connect(self._on_yt_resolved_open_media)
        self.app = QApplication(sys.argv)
        
        # Scan for companion plugins in assets/
        self.pets_metadata = {}
        self.scan_assets()
        
        # Load user configurations
        self.settings_path = "settings.json"
        self.current_pet_id = "eve"
        self.scale_factor = 0.8  # Default compact scale for modern displays
        self.always_on_top = True
        self.sound_enabled = True
        self.static_mode = True  # Static animation mode default (stays in place)
        self.auto_activity_reaction = True  # Auto-react to desktop foreground apps
        self.load_settings()

        # Activity tracker
        self.activity_tracker = DesktopActivityTracker(self)

        # Core references
        self.pet = None
        self.window = None
        
        # Verify if any pet is found
        if not self.pets_metadata:
            # Create a fallback placeholder for EVE if directory is uninitialized
            self.pets_metadata["eve"] = {
                "name": "EVE (Fallback)",
                "dir": "assets/eve",
                "config_path": "assets/eve/pet.json"
            }
            # Create the path structure in case user skipped setup
            os.makedirs("assets/eve", exist_ok=True)

        # Handle initial load
        if self.current_pet_id not in self.pets_metadata:
            self.current_pet_id = list(self.pets_metadata.keys())[0]

        # Initialize the active pet instance
        self.pet = self.load_pet_instance(self.current_pet_id)
        
        # Position pet above taskbar on initial boot
        screen = self.app.primaryScreen().availableGeometry()
        spawn_x = (screen.width() - self.pet.width) // 2
        spawn_y = screen.height() - self.pet.height - 100
        self.pet.physics.x = float(spawn_x)
        self.pet.physics.y = float(spawn_y)

        # Initialize the window layer
        self.window = TransparentWindow(self.pet, self, scale_factor=self.scale_factor)
        
        # Apply window behavior toggles
        if not self.always_on_top:
            self.window.setWindowFlags(self.window.windowFlags() & ~Qt.WindowType.WindowStaysOnTopHint)
        
        self.window.show()

        # Initial welcome greeting on launch
        self.pet.say("Hi, I am Vedika, what's going on?", duration=4.5)

        # Initialize Gemini Live voice-to-voice client
        from engine.gemini_live import GeminiLiveClient
        
        self.gemini_client = GeminiLiveClient(self.pet, self)
        
        # Connect signals for thread-safe UI updates
        self.gemini_client.say_requested.connect(self.pet.say)
        self.gemini_client.animation_requested.connect(self.set_active_animation)
        self.gemini_client.open_url_requested.connect(self.open_url_by_gemini)
        self.gemini_client.play_music_requested.connect(self.play_music_by_gemini)
        self.gemini_client.stop_voice_requested.connect(self.pause_voice_by_gemini)
        self.gemini_client.session_activated.connect(self.on_gemini_session_activated)
        self.gemini_client.navigate_webapp_requested.connect(self.on_navigate_webapp_requested)
        self.gemini_client.trigger_hint_requested.connect(self.on_trigger_hint_requested)
        
        # Connect conversational state transitions
        self.gemini_client.speaking_started.connect(self.on_gemini_speaking)
        self.gemini_client.speaking_stopped.connect(self.on_gemini_speaking_stopped)
        self.gemini_client.turn_completed.connect(self.on_gemini_turn_completed)
        self.gemini_client.interrupted.connect(self.on_gemini_interrupted)
        self.gemini_client.thinking_started.connect(self.on_gemini_thinking)
        self.gemini_client.user_sentiment_detected.connect(self.on_gemini_sentiment_detected)
        self.gemini_client.state_changed.connect(self.on_gemini_state_changed)
        
        # Initialize local WebSocket bridge to Vedika AI Tutor WebApp
        self.init_websocket_bridge()

        # Failsafe timer for stuck voice states (network/event drops)
        self.voice_failsafe_timer = QTimer()
        self.voice_failsafe_timer.setSingleShot(True)
        self.voice_failsafe_timer.timeout.connect(self.on_voice_failsafe_timeout)

        # Start game loop timer (60 FPS)
        self.last_time = time.time()
        self.timer = QTimer()
        self.timer.timeout.connect(self.game_loop)
        self.timer.start(16)  # ~60 FPS

    def scan_assets(self):
        """Scans assets/ subdirectories for plugin pets containing pet.json."""
        assets_dir = "assets"
        if not os.path.exists(assets_dir):
            os.makedirs(assets_dir, exist_ok=True)
            return

        for entry in os.scandir(assets_dir):
            if entry.is_dir():
                config_file = os.path.join(entry.path, "pet.json")
                if os.path.exists(config_file):
                    try:
                        with open(config_file, "r") as f:
                            data = json.load(f)
                            pet_id = data.get("id", entry.name)
                            display_name = data.get("displayName", entry.name.upper())
                            self.pets_metadata[pet_id] = {
                                "name": display_name,
                                "dir": entry.path,
                                "config_path": config_file
                            }
                            print(f"[Engine] Registered companion plugin: {display_name} ({pet_id})")
                    except Exception as e:
                        print(f"[!] Error parsing plugin config in {entry.path}: {e}")

    def load_pet_instance(self, pet_id):
        """Loads and returns an instance of the chosen pet."""
        meta = self.pets_metadata[pet_id]
        config_path = meta["config_path"]
        asset_dir = meta["dir"]

        try:
            with open(config_path, "r") as f:
                config = json.load(f)
        except Exception as e:
            print(f"[!] Critical: Cannot load config {config_path}: {e}")
            config = {}

        sheet_name = config.get("spritesheetPath", "spritesheet.webp")
        spritesheet_path = os.path.join(asset_dir, sheet_name)

        sprite_cfg = config.get("sprite", {})
        width = sprite_cfg.get("width", 128)
        height = sprite_cfg.get("height", 128)
        columns = sprite_cfg.get("columns", 12)
        rows = sprite_cfg.get("rows", 9)

        # Auto-calculate frame width & height based on actual image dimensions and grid
        if os.path.exists(spritesheet_path) and columns > 0 and rows > 0:
            try:
                from PIL import Image
                with Image.open(spritesheet_path) as img:
                    img_w, img_h = img.size
                    if img_w > 0 and img_h > 0:
                        width = img_w // columns
                        height = img_h // rows
            except Exception:
                pass

        # Slice spritesheet frames
        frames, flipped = SpriteLoader.load_spritesheet(
            spritesheet_path, width, height, columns, rows
        )

        pet_instance = Pet(pet_id, config, frames, flipped, asset_dir)
        pet_instance.main_app = self
        pet_instance.sound_enabled = self.sound_enabled
        pet_instance.physics.is_static = self.static_mode
        
        # Initial bounds update
        screen = self.app.primaryScreen().availableGeometry()
        pet_instance.screen_w = screen.width()
        pet_instance.screen_h = screen.height()

        return pet_instance

    def switch_pet(self, pet_id):
        """Swaps current companion while retaining screen coordinates."""
        if pet_id not in self.pets_metadata:
            return

        old_x = int(self.pet.physics.x)
        old_y = int(self.pet.physics.y)
        
        # Shut down window to reset frames cleanly
        if self.window:
            self.window.close()

        self.current_pet_id = pet_id
        
        # Re-initialize
        self.pet = self.load_pet_instance(pet_id)
        if hasattr(self, 'gemini_client') and self.gemini_client:
            self.gemini_client.pet = self.pet
            try:
                self.gemini_client.say_requested.disconnect()
            except Exception:
                pass
            self.gemini_client.say_requested.connect(self.pet.say)
        self.pet.physics.x = float(old_x)
        self.pet.physics.y = float(old_y)

        # Read window flags state
        self.window = TransparentWindow(self.pet, self, scale_factor=self.scale_factor)
        
        if not self.always_on_top:
            self.window.setWindowFlags(self.window.windowFlags() & ~Qt.WindowType.WindowStaysOnTopHint)

        self.window.show()
        self.save_settings()
        self.pet.say(f"Switched to {self.pet.config.get('displayName', 'Companion')}!", duration=2.5)

    def get_available_pets(self):
        """Returns a list of tuples containing loaded pet ids and display names."""
        return [(pid, meta["name"]) for pid, meta in self.pets_metadata.items()]

    def game_loop(self):
        """Standard 60 FPS update cycle."""
        now = time.time()
        dt = now - self.last_time
        self.last_time = now

        # Cap dt to avoid lag jump issues (e.g. dragging window or suspension)
        dt = min(dt, 0.1)

        if self.pet and self.window:
            # Sync screen geometry boundaries (handles resolution/monitor modifications)
            screen = self.app.primaryScreen().availableGeometry()
            self.pet.screen_w = screen.width()
            self.pet.screen_h = screen.height()

            # 1. Update Pet Core Engine (Physics, Anim, AI Behaviors)
            self.pet.update(dt)

            # 1b. Update Desktop Activity Tracker (Foreground window detection)
            if self.auto_activity_reaction and hasattr(self, 'activity_tracker'):
                self.activity_tracker.update()

            # 2. Check and look toward global cursor positions when idle
            cursor = QCursor.pos()
            self.pet.interaction.handle_hover(cursor.x(), cursor.y())

            # 3. Align physical window position with coordinates
            # Window top-left is shifted up by bubble offset * scale
            if not self.pet.physics.is_dragging:
                bubble_offset = int(self.window.bubble_offset * self.scale_factor)
                self.window.move(
                    int(self.pet.physics.x), 
                    int(self.pet.physics.y - bubble_offset)
                )

            # 4. Trigger redraw
            self.window.update()

    def toggle_gemini_pause_f9(self):
        """F9 Hotkey Handler: Toggles Pause / Resume (Mute / Unmute) with 0ms delay."""
        client = self.gemini_client
        if not client.is_active:
            print("[F9 Hotkey] Starting Gemini Live Voice Chat...")
            if self.pet:
                self.pet.say("Voice Chat started! 🚀", duration=2.5)
            client.start()
            return

        is_paused = client.toggle_pause()
        if is_paused:
            print("[F9 Hotkey] Paused Gemini Live Voice Chat.")
            if self.pet:
                self.pet.say("Voice Chat paused! Press F9 to resume. ⏸️", duration=2.5)
        else:
            print("[F9 Hotkey] Resumed Gemini Live Voice Chat.")
            if self.pet:
                self.pet.say("Voice Chat resumed! What's next? 🎙️", duration=2.5)

    def toggle_gemini_start_stop_alt_v(self):
        """Alt+V Hotkey Handler: Full Start / Stop (Connect / Disconnect) lifecycle."""
        client = self.gemini_client
        if client.is_active:
            print("[Alt+V Hotkey] Stopping Gemini Live Voice Chat...")
            if self.pet:
                self.pet.say("Voice Chat stopped! 🛑", duration=2.5)
            client.stop()
        else:
            print("[Alt+V Hotkey] Starting Gemini Live Voice Chat...")
            if self.pet:
                self.pet.say("Voice Chat starting... 🚀", duration=2.5)
            client.start()

    def pause_voice_by_gemini(self):
        """Pauses voice chat when user asks to pause or stop voice chat via voice command."""
        if hasattr(self, 'gemini_client') and self.gemini_client:
            self.gemini_client.toggle_pause()
            if self.pet:
                self.pet.say("Voice Chat paused! Press F9 to resume. ⏸️", duration=2.5)

    def open_vyomantha_website(self):
        """Opens Vyomantha portal in default web browser and triggers pet speech response."""
        self.open_url_by_gemini("https://vyomanta.vercel.app/")

    def init_websocket_bridge(self):
        """Initializes PySide6 QWebSocket bridge connecting Desktop Pet to local Vedika WebApp event server."""
        try:
            self.ws_bridge = QWebSocket()
            self.ws_bridge.textMessageReceived.connect(self.on_ws_bridge_message)
            self.ws_bridge.disconnected.connect(self.on_ws_bridge_disconnected)
            self.connect_ws_bridge()
        except Exception as e:
            print(f"[Main] WebSocket Bridge Init Notice: {e}")

    def connect_ws_bridge(self):
        """Connects to local WebSocket server on ws://localhost:3000/api/ws?role=pet."""
        if hasattr(self, 'ws_bridge'):
            url = QUrl("ws://localhost:3000/api/ws?role=pet")
            self.ws_bridge.open(url)

    @Slot()
    def on_ws_bridge_disconnected(self):
        """Re-establishes WebSocket connection if local server restarts."""
        QTimer.singleShot(5000, self.connect_ws_bridge)

    @Slot(str)
    def on_ws_bridge_message(self, message_str):
        """Handles incoming real-time WebApp context updates and proactive student hints."""
        try:
            data = json.loads(message_str)
            msg_type = data.get("type") or data.get("event")
            payload = data.get("payload", {})

            if msg_type == "WEBAPP_STATE_UPDATE":
                if hasattr(self, 'gemini_client') and self.gemini_client:
                    self.gemini_client.active_webapp_context = payload
                
                activity = payload.get("activity")
                if activity and self.pet:
                    is_speaking = hasattr(self, 'gemini_client') and self.gemini_client and self.gemini_client.is_speaking
                    if not is_speaking:
                        if activity == "dsa_puzzle":
                            self.set_active_animation("typing")
                        elif activity == "chemistry_lab":
                            self.set_active_animation("chemistry")
                        elif activity == "math_tutor":
                            self.set_active_animation("maths")
                        elif activity == "reading":
                            self.set_active_animation("reading")

            elif msg_type == "PUZZLE_STUCK":
                puzzle_title = payload.get("puzzleTitle", "this problem")
                self.set_active_animation("explaining")
                if self.pet:
                    self.pet.say(f"I notice you've been working on {puzzle_title}! Press Alt+V if you'd like a hint! 💡", duration=6.0)

        except Exception as e:
            print(f"[WS Bridge] Message parse error: {e}")

    @Slot(str)
    def on_navigate_webapp_requested(self, route):
        """Handles voice-triggered webapp route navigation."""
        print(f"[Main] Voice requested navigation to route: {route}")
        if hasattr(self, 'ws_bridge') and self.ws_bridge.isValid():
            self.ws_bridge.sendTextMessage(json.dumps({
                "type": "NAVIGATE_WEBAPP",
                "payload": {"route": route}
            }))
        target_url = f"https://vyomanta.vercel.app{route}" if route.startswith("/") else route
        self.open_url_by_gemini(target_url)

    @Slot(int)
    def on_trigger_hint_requested(self, hint_level=1):
        """Handles voice-triggered hint dispatching."""
        print(f"[Main] Voice requested hint dispatching (level {hint_level}).")
        if hasattr(self, 'ws_bridge') and self.ws_bridge.isValid():
            self.ws_bridge.sendTextMessage(json.dumps({
                "type": "TRIGGER_HINT",
                "payload": {"hint_level": hint_level}
            }))
        self.set_active_animation("explaining")
        if self.pet:
            self.pet.say("Here's a hint for your problem! 💡", duration=4.0)

    @Slot(str)
    def _do_open_url(self, target_url):
        """Safely launches URL in default browser using a detached subprocess group on Windows to prevent DDE IPC crashes when Chrome is already running."""
        if not target_url:
            return
        print(f"[Browser Launcher] Preparing browser launch for target URL: {target_url}")

        import subprocess
        import threading
        import sys

        def _async_browser_launch(url):
            try:
                if sys.platform == "win32":
                    DETACHED_PROCESS = 0x00000008
                    CREATE_NEW_PROCESS_GROUP = 0x00000200
                    print(f"[Browser Launcher] Spawning detached Windows Shell launcher for: {url}")
                    subprocess.Popen(
                        ['cmd.exe', '/c', 'start', '', url],
                        shell=False,
                        creationflags=DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP
                    )
                else:
                    import webbrowser
                    webbrowser.open(url)
                print(f"[Browser Launcher] Browser launch command dispatched successfully.")
            except Exception as e:
                print(f"[Browser Launcher] Primary browser launch failed ({e}), using fallback.")
                try:
                    import webbrowser
                    webbrowser.open(url)
                except Exception as ex:
                    print(f"[Browser Launcher] Fallback browser launch error: {ex}")

        threading.Thread(target=_async_browser_launch, args=(target_url,), daemon=True).start()

    def is_media_url(self, url):
        """Checks if URL points to YouTube, Spotify, song, music, or streaming video media."""
        if not url:
            return False
        url_lower = url.lower()
        media_keywords = [
            "youtube.com", "youtu.be", "spotify.com", "soundcloud.com",
            "twitch.tv", "netflix.com", "vimeo.com", "music", "song", "video"
        ]
        return any(kw in url_lower for kw in media_keywords)

    def open_url_by_gemini(self, url):
        """Opens requested URL. Disconnects voice chat ONLY for YouTube/songs/media, preserving voice chat for general websites."""
        if not url:
            return
        url_lower = url.lower()
        if "vyomantha" in url_lower or "vyomanta" in url_lower or "study" in url_lower:
            url = "https://vyomanta.vercel.app/"
        elif not (url.startswith("http://") or url.startswith("https://")):
            url = "https://" + url

        is_media = self.is_media_url(url)
        self.pending_browser_open = True

        from PySide6.QtCore import QTimer
        QTimer.singleShot(3500, lambda: setattr(self, 'pending_browser_open', False))

        if self.pet:
            msg = "Playing video! 🎵" if is_media else "Opening website! 🚀"
            self.pet.say(msg, duration=2.5)
            speaking_anim = "music" if (is_media and "music" in self.pet.sprite.animations) else ("speak" if "speak" in self.pet.sprite.animations else "wave")
            self.set_active_animation(speaking_anim)

        def _launch_link():
            if is_media and hasattr(self, 'gemini_client') and self.gemini_client and self.gemini_client.is_active:
                print(f"[Main] Media/Song URL detected ({url}) -> Disconnecting Gemini Live Voice Chat.")
                self.gemini_client.stop()
            elif not is_media:
                print(f"[Main] Standard website detected ({url}) -> Keeping Gemini Live Voice Chat ACTIVE.")
            self._do_open_url(url)

        QTimer.singleShot(1500 if not is_media else 2500, _launch_link)

    @Slot(str)
    def _on_yt_resolved_open_media(self, target_url):
        """Safely executed on Qt Main Thread when background YouTube resolution completes."""
        print(f"[Main] YouTube URL resolved -> Executing media launch on Qt Main Thread: {target_url}")
        if hasattr(self, 'gemini_client') and self.gemini_client:
            self.gemini_client.is_paused = True
            if self.gemini_client.is_active:
                print("[Main] Disconnecting Gemini Live Voice Chat on Qt main thread before opening music/video.")
                self.gemini_client.stop()
        self._do_open_url(target_url)

    def play_music_by_gemini(self, query=""):
        """
        Plays requested music/video on YouTube using yt-dlp asynchronously.
        Immediately mutes mic input at 0ms delay to prevent acoustic feedback loops.
        """
        import random
        import threading
        from PySide6.QtCore import QTimer

        # Immediately pause mic at 0ms delay to stop speaker feedback
        if hasattr(self, 'gemini_client') and self.gemini_client:
            self.gemini_client.is_paused = True

        self.pending_browser_open = True
        QTimer.singleShot(3500, lambda: setattr(self, 'pending_browser_open', False))

        generic_phrases = ["", "a good song", "good song", "a song", "song", "music", "play music", "play a song", "something good", "a video", "video", "study video"]
        if not query or query.strip().lower() in generic_phrases:
            trending_queries = [
                "trending hits telugu songs",
                "best feel good songs playlist",
                "popular songs 2026",
                "chill lofi beats study music"
            ]
            query = random.choice(trending_queries)

        if self.pet:
            display_name = query
            self.pet.say(f"Playing {display_name}! 🎵", duration=2.5)
            music_anim = "music" if "music" in self.pet.sprite.animations else "wave"
            self.set_active_animation(music_anim)

        def _async_yt_lookup_and_play():
            target_url = None
            try:
                import yt_dlp
                ydl_opts = {
                    'format': 'best',
                    'noplaylist': True,
                    'quiet': True,
                    'no_warnings': True,
                    'extract_flat': True,
                }
                search_query = f"ytsearch1:{query}"
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    info = ydl.extract_info(search_query, download=False)
                    if info and 'entries' in info and len(info['entries']) > 0:
                        first_entry = info['entries'][0]
                        video_id = first_entry.get('id') or first_entry.get('url')
                        if video_id:
                            if video_id.startswith('http'):
                                target_url = video_id
                            else:
                                target_url = f"https://www.youtube.com/watch?v={video_id}"
                            title = first_entry.get('title', query)
                            print(f"[YouTubeDL] Resolved '{query}' to direct video: {title} ({target_url})")
            except Exception as e:
                print(f"[YouTubeDL] Info extract notice: {e}")

            if not target_url:
                import urllib.parse
                encoded = urllib.parse.quote(query)
                target_url = f"https://www.youtube.com/results?search_query={encoded}"

            # Emit PySide6 Signal across threads -> delivers to _on_yt_resolved_open_media on Qt Main Thread
            self.yt_resolved_signal.emit(target_url)

        # Run yt_dlp lookup in background daemon thread
        threading.Thread(target=_async_yt_lookup_and_play, daemon=True).start()

    # --- Persistence Settings ---
    
    def load_settings(self):
        """Loads user preferences from settings.json."""
        if os.path.exists(self.settings_path):
            try:
                with open(self.settings_path, "r") as f:
                    data = json.load(f)
                    self.current_pet_id = data.get("current_pet_id", "eve")
                    self.scale_factor = data.get("scale", 1.5)
                    self.always_on_top = data.get("always_on_top", True)
                    self.sound_enabled = data.get("sound_enabled", True)
                    self.static_mode = data.get("static_mode", True)
                    self.auto_activity_reaction = data.get("auto_activity_reaction", True)
                    if hasattr(self, "gemini_client") and self.gemini_client:
                        self.gemini_client.tutor_language = data.get("tutor_language", "all")
                        self.gemini_client.tutor_subject = data.get("tutor_subject", "all")
            except Exception as e:
                print(f"[!] Warning: Cannot read settings.json: {e}")

    def save_settings(self):
        """Saves user preferences to settings.json."""
        # Read from window layers if loaded
        if self.window:
            self.scale_factor = self.window.scale_factor
            self.always_on_top = bool(self.window.windowFlags() & Qt.WindowType.WindowStaysOnTopHint)
        if self.pet:
            self.sound_enabled = self.pet.sound_enabled

        data = {
            "current_pet_id": self.current_pet_id,
            "scale": self.scale_factor,
            "always_on_top": self.always_on_top,
            "sound_enabled": self.sound_enabled,
            "static_mode": self.static_mode,
            "auto_activity_reaction": self.auto_activity_reaction,
            "tutor_language": getattr(self.gemini_client, "tutor_language", "all") if hasattr(self, "gemini_client") else "all",
            "tutor_subject": getattr(self.gemini_client, "tutor_subject", "all") if hasattr(self, "gemini_client") else "all"
        }
        
        try:
            with open(self.settings_path, "w") as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            print(f"[!] Warning: Cannot save settings.json: {e}")

    def set_static_mode(self, static_mode):
        """Sets the pet's movement mode (static vs wandering)."""
        self.static_mode = static_mode
        if self.pet:
            self.pet.physics.is_static = static_mode
            if static_mode:
                self.pet.state_machine.change_state("idle")  # Revert to base state
        self.save_settings()
        
        mode_str = "Static (Cycle with Tab/Keys)" if static_mode else "Wandering"
        if self.pet:
            self.pet.say(f"Mode: {mode_str}", duration=2.5)

    def cycle_animation(self):
        """Cycles to the next animation defined in the pet's config."""
        if not self.pet:
            return
        anim_names = list(self.pet.sprite.animations.keys())
        if not anim_names:
            return

        current_name = self.pet.sprite.current_animation.name if self.pet.sprite.current_animation else ""
        try:
            idx = anim_names.index(current_name)
            next_idx = (idx + 1) % len(anim_names)
        except ValueError:
            next_idx = 0

        next_name = anim_names[next_idx]
        self.set_active_animation(next_name)

    def switch_animation_by_index(self, index):
        """Switches to the animation by index order (0-8 keys correspond to 1-9 keyboard inputs)."""
        if not self.pet:
            return
        anim_names = list(self.pet.sprite.animations.keys())
        if 0 <= index < len(anim_names):
            self.set_active_animation(anim_names[index])

    def set_active_animation(self, anim_name):
        """Sets the active animation dynamically."""
        if self.pet and hasattr(self.pet, 'behavior'):
            self.pet.behavior.reset_inactivity()

        if self.static_mode:
            self.pet.sprite.play(anim_name)
        else:
            state_mapping = {
                "idle": "idle",
                "walk": "walk_right",
                "run_left": "walk_left",
                "runningLeft": "walk_left",
                "run_right": "walk_right",
                "runningRight": "walk_right",
                "wave": "wave",
                "waving": "wave",
                "jump": "jump",
                "jumping": "jump",
                "failed": "failed",
                "waiting": "waiting",
                "review": "review",
                "reading": "reading",
                "working": "working",
                "searching": "searching",
                "knockout": "knockout",
                "sleep": "sleep"
            }
            state_name = state_mapping.get(anim_name, anim_name if anim_name in self.pet.state_machine.states else "idle")
            self.pet.state_machine.change_state(state_name)

    def start_voice_failsafe(self, ms=180000):
        if hasattr(self, "gemini_client") and self.gemini_client and self.gemini_client.is_active:
            if hasattr(self, "voice_failsafe_timer"):
                self.voice_failsafe_timer.start(ms)

    def stop_voice_failsafe(self):
        if hasattr(self, "voice_failsafe_timer"):
            self.voice_failsafe_timer.stop()

    def on_voice_failsafe_timeout(self):
        print("[Engine] Inactivity timeout: 3 minutes of silence reached. Automatically stopping voice chat.")
        if hasattr(self, "gemini_client") and self.gemini_client and self.gemini_client.is_active:
            self.gemini_client.stop()

    def on_gemini_session_activated(self):
        """Slot to safely initialize active voice chat session."""
        if self.pet:
            self.pet.physics.vx = 0.0
            self.pet.physics.vy = 0.0
            cat = getattr(self.activity_tracker, "current_category", "idle")
            initial_state = cat if cat in self.pet.sprite.animations else "idle"
            self.pet.state_machine.change_state(initial_state)
            self.start_voice_failsafe()

    def on_gemini_thinking(self):
        """Transition pet to Line 9 (searching) animation when Gemini Live API is processing."""
        if self.pet:
            thinking_state = "searching" if "searching" in self.pet.sprite.animations else "review"
            self.pet.state_machine.change_state(thinking_state)
            self.start_voice_failsafe()

    def on_gemini_speaking(self):
        """Transition pet to speak animation when Gemini starts outputting speech audio."""
        if self.pet:
            speaking_anim = "speak" if "speak" in self.pet.sprite.animations else "wave"
            if self.static_mode:
                self.pet.sprite.play(speaking_anim)
            self.pet.state_machine.change_state(speaking_anim)
            self.start_voice_failsafe()

    def on_gemini_speaking_stopped(self):
        """Transition pet to waiting or idle when speaker output finishes."""
        if self.pet:
            is_voice_active = hasattr(self, 'gemini_client') and self.gemini_client and self.gemini_client.is_active
            target_state = "waiting" if is_voice_active else "idle"
            if self.static_mode:
                self.pet.sprite.play(target_state)
            self.pet.state_machine.change_state(target_state)
            self.start_voice_failsafe()

    def on_gemini_turn_completed(self):
        """Mark model turn completed; revert to waiting/idle if audio playback already finished."""
        if self.pet:
            is_speaking = hasattr(self, 'gemini_client') and self.gemini_client and self.gemini_client.is_speaking
            if not is_speaking:
                is_voice_active = hasattr(self, 'gemini_client') and self.gemini_client and self.gemini_client.is_active
                target_state = "waiting" if is_voice_active else "idle"
                if self.static_mode:
                    self.pet.sprite.play(target_state)
                self.pet.state_machine.change_state(target_state)
            self.start_voice_failsafe()

    def on_gemini_interrupted(self):
        """Transition pet to Line 10 (failed) state when user interrupts."""
        if self.pet:
            failed_state = "failed" if "failed" in self.pet.sprite.animations else "idle"
            self.pet.state_machine.change_state(failed_state)
            self.start_voice_failsafe()

    def on_gemini_sentiment_detected(self, user_text, sentiment):
        """Reacts visually and emotionally via pet state machine when user sentiment is detected."""
        if not self.pet:
            return
        label = sentiment.get("label")
        emoji = sentiment.get("emoji", "")
        print(f"[DesktopPetApp] Student sentiment detected: {label} ({emoji})")

        if label == "Struggling / Confused":
            failed_state = "failed" if "failed" in self.pet.sprite.animations else "idle"
            self.pet.state_machine.change_state(failed_state)
            self.pet.say(f"Don't worry, let's break it down! {emoji}", duration=3.0)
        elif label == "Happy / Confident":
            happy_state = "jump" if "jump" in self.pet.sprite.animations else "wave"
            self.pet.state_machine.change_state(happy_state)
            self.pet.say(f"Awesome! Great job! {emoji}", duration=3.0)
        elif label == "Curious / Inquisitive":
            curious_state = "reading" if "reading" in self.pet.sprite.animations else ("review" if "review" in self.pet.sprite.animations else "searching")
            self.pet.state_machine.change_state(curious_state)
            self.pet.say(f"Great question! {emoji}", duration=2.5)

    def on_gemini_state_changed(self, status):
        """Cleanly disable failsafe timer and revert state when voice chat stops."""
        if status in ("disconnected", "error"):
            self.stop_voice_failsafe()
            if self.pet:
                curr_state = self.pet.state_machine.current_state.name
                if curr_state in ("speak", "searching", "review", "waiting"):
                    self.pet.state_machine.change_state("idle")

    def toggle_voice_chat(self):
        """Helper to start/stop the voice chat session dynamically (e.g. on double-click)."""
        if hasattr(self, "gemini_client") and self.gemini_client:
            client = self.gemini_client
            if client.status in ("disconnected", "error"):
                client.start()
            elif client.status == "connected":
                client.stop()

    def exit_application(self):
        """Saves settings and shuts down the pet engine."""
        self.save_settings()
        
        # Clean up Gemini client thread
        if hasattr(self, "gemini_client") and self.gemini_client:
            self.gemini_client.stop()
            
        self.app.quit()

    def run(self):
        sys.exit(self.app.exec())

if __name__ == "__main__":
    app = DesktopPetApp()
    app.run()