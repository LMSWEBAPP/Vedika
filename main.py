import os
import sys
import json
import time
import traceback
import re

if sys.platform == "win32":
    try:
        import io
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
    except Exception:
        pass

# Import GeminiLiveClient before PySide6 QApplication to prevent Shiboken inspection locks
from engine.gemini_live import GeminiLiveClient

from PySide6.QtWidgets import QApplication
from PySide6.QtCore import QTimer, QThread, QObject, Slot, Signal, QUrl
from PySide6.QtGui import QCursor, Qt
from PySide6.QtWebSockets import QWebSocketServer, QWebSocket
from PySide6.QtNetwork import QHostAddress

ALLOWED_ROUTE_PATTERN = re.compile(r"^/[a-z0-9\-_/]*$")

def load_valid_routes() -> set:
    routes_path = "routes.json"
    if os.path.exists(routes_path):
        try:
            with open(routes_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                return {item["id"] for item in data.get("routes", []) if "id" in item}
        except Exception as e:
            print(f"[!] Warning: Could not parse routes.json for validation: {e}")
    return {"/", "/courses", "/vedika-ai", "/vedika-ai/code", "/code-puzzle", "/viva-interview", "/vedika-labs", "/jobs", "/progress"}

VALID_ROUTES = load_valid_routes()

def sanitize_and_validate_route(route: str) -> str:
    if not route or not isinstance(route, str):
        return "/"
    
    route = route.strip()
    if not route.startswith("/"):
        route = "/" + route
        
    # Enforce regex security allowlist
    if not ALLOWED_ROUTE_PATTERN.match(route):
        print(f"[Security Warning] Blocked suspicious route format: '{route}'. Falling back to '/'")
        return "/"
        
    # Enforce dynamic whitelist membership check
    if route not in VALID_ROUTES:
        print(f"[Route Validation] Unknown route '{route}'. Falling back to dashboard '/'")
        return "/"
        
    return route

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
from engine.user_profile import UserProfileManager
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

        # Initialize User Profile Manager & dynamic greeting
        self.user_profile = UserProfileManager()
        dynamic_greeting = self.user_profile.generate_dynamic_greeting()
        self.pet.say(dynamic_greeting, duration=6.0)

        # Initialize Gemini Live voice-to-voice client
        self.gemini_client = GeminiLiveClient(self.pet, self)
        
        # Connect signals for thread-safe UI updates
        self.gemini_client.say_requested.connect(self.pet.say)
        self.gemini_client.say_dialogue_requested.connect(self.pet.set_dialogue)
        self.gemini_client.animation_requested.connect(self.set_active_animation)
        self.gemini_client.open_url_requested.connect(self.open_url_by_gemini)
        self.gemini_client.play_music_requested.connect(self.play_music_by_gemini)
        self.gemini_client.stop_voice_requested.connect(self.pause_voice_by_gemini)
        self.gemini_client.session_activated.connect(self.on_gemini_session_activated)
        self.gemini_client.navigate_webapp_requested.connect(self.on_navigate_webapp_requested)
        self.gemini_client.trigger_hint_requested.connect(self.on_trigger_hint_requested)
        self.gemini_client.trigger_action_requested.connect(self.on_trigger_action_requested)
        self.gemini_client.timer_requested.connect(self.on_timer_requested)

        # Initialize PointerOverlay & ScreenCapturer on Main GUI Thread
        from ui.pointer_overlay import PointerOverlay
        from engine.screen_capturer import ScreenCapturer
        self.pointer_overlay = PointerOverlay()
        self.screen_capturer = ScreenCapturer()
        self.gemini_client.screen_capture_requested.connect(self.screen_capturer.grab_screen_slot)
        self.gemini_client.point_location_requested.connect(self.on_point_location_requested)
        
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
            # Window top-left is shifted up by bubble offset * scale and centered horizontally
            if not self.pet.physics.is_dragging:
                bubble_offset = int(self.window.bubble_offset * self.scale_factor)
                pet_offset_x = (self.window.width() - int(self.pet.physics.width)) // 2
                self.window.move(
                    int(self.pet.physics.x - pet_offset_x), 
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

    def trigger_screen_analysis_alt_s(self):
        """Alt+S Hotkey Handler: Triggers manual screen capture and vision analysis."""
        if not hasattr(self, 'gemini_client') or not self.gemini_client.is_active:
            print("[Alt+S Hotkey] Starting Gemini Live Voice Chat for Screen Analysis...")
            if self.pet:
                self.pet.say("Scanning your screen... 🔍", duration=2.5)
            self.gemini_client.start()
            return

        if self.pet:
            self.pet.say("Scanning your screen... 🔍", duration=2.5)
            self.set_active_animation("searching")

        if hasattr(self, 'screen_capturer') and hasattr(self.gemini_client, 'worker_thread') and self.gemini_client.worker_thread:
            import asyncio
            from google.genai import types
            worker = self.gemini_client.worker_thread
            fut = worker.loop.create_future()
            self.screen_capturer.grab_screen_slot(fut, worker.loop)
            
            async def _send_hotkey_image():
                try:
                    jpeg_bytes = await asyncio.wait_for(fut, timeout=3.5)
                    if jpeg_bytes and worker.session:
                        print(f"[Alt+S Hotkey] Sending screen image ({len(jpeg_bytes)/1024:.1f} KB) to Gemini Live...")
                        await worker.session.send_realtime_input(
                            video=types.Blob(
                                data=jpeg_bytes,
                                mime_type="image/jpeg"
                            )
                        )
                except Exception as e:
                    print(f"[Alt+S Hotkey] Error sending screen image: {e}")

            asyncio.run_coroutine_threadsafe(_send_hotkey_image(), worker.loop)

    def on_point_location_requested(self, x_norm: float, y_norm: float, label: str = "", action: str = "point"):
        """Main GUI Thread Slot: Handles visual laser pointer overlay, pet walking, and optional mouse movement."""
        print(f"[MainApp] Visual point location requested: ({x_norm:.2f}, {y_norm:.2f}) - Label: '{label}' - Action: '{action}'")
        
        # 1. Trigger glowing laser pointer dot and sonar ripple overlay
        if hasattr(self, 'pointer_overlay') and self.pointer_overlay:
            self.pointer_overlay.point_at(x_norm, y_norm, label, duration=4.0)

        # 2. Trigger Pet Speech / Reaction
        if self.pet:
            if label:
                self.pet.say(f"Look here! 🔍 {label}", duration=3.5)
            self.set_active_animation("pointing" if hasattr(self.pet, "pointing") else "searching")

        # 3. Optional System Mouse Movement if requested by action
        if action == "move_mouse":
            try:
                import ctypes
                screen = self.app.primaryScreen()
                if screen:
                    geom = screen.geometry()
                    target_px = int(max(0.0, min(1.0, x_norm)) * geom.width())
                    target_py = int(max(0.0, min(1.0, y_norm)) * geom.height())
                    ctypes.windll.user32.SetCursorPos(target_px, target_py)
                    print(f"[MainApp] System mouse cursor set to ({target_px}, {target_py})")
            except Exception as e:
                print(f"[MainApp] SetCursorPos notice: {e}")

    def pause_voice_by_gemini(self):
        """Pauses voice chat when user asks to pause or stop voice chat via voice command."""
        if hasattr(self, 'gemini_client') and self.gemini_client:
            self.gemini_client.toggle_pause()
            if self.pet:
                self.pet.say("Voice Chat paused! Press F9 to resume. ⏸️", duration=2.5)

    def open_vyomantha_website(self):
        """Opens Vyomantha portal in default web browser and triggers pet speech response."""
        self.open_url_by_gemini("https://vyomanta-ai.vercel.app/")

    def init_websocket_bridge(self):
        """Initializes embedded PySide6 QWebSocketServer on port 8765 for direct browser WebApp bridge."""
        try:
            self.web_clients = []
            self.ws_server = QWebSocketServer(
                "VedikaDesktopPetBridge",
                QWebSocketServer.SslMode.NonSecureMode,
                self.app
            )
            if self.ws_server.listen(QHostAddress.SpecialAddress.Any, 8765):
                print("[WS Server] Embedded Desktop Pet WebSocket Server listening on ws://127.0.0.1:8765")
                self.ws_server.newConnection.connect(self.on_ws_new_connection)
            else:
                print(f"[WS Server] Warning: Could not bind port 8765: {self.ws_server.errorString()}")
        except Exception as e:
            print(f"[WS Server] Exception during initialization: {e}")

    def on_ws_new_connection(self):
        client = self.ws_server.nextPendingConnection()
        print(f"[WS Server] Browser WebApp connected from {client.peerAddress().toString()}")
        self.web_clients.append(client)
        client.textMessageReceived.connect(lambda msg: self.on_ws_bridge_message(msg))
        client.disconnected.connect(lambda: self.on_ws_client_disconnected(client))

    def on_ws_client_disconnected(self, client):
        print(f"[WS Server] Browser WebApp disconnected.")
        if client in self.web_clients:
            self.web_clients.remove(client)

    def is_webapp_connected(self) -> bool:
        """Returns True if at least one active Vyomanta WebApp browser tab is connected via WebSocket."""
        return any(c.isValid() and c.state() == QWebSocket.SocketState.ConnectedState for c in getattr(self, 'web_clients', []))

    def broadcast_to_webapp(self, message_dict) -> bool:
        """Broadcasts JSON payload to all connected active browser tabs."""
        if not hasattr(self, 'web_clients') or not self.web_clients:
            return False
        msg_str = json.dumps(message_dict)
        sent_count = 0
        for c in list(self.web_clients):
            if c.isValid() and c.state() == QWebSocket.SocketState.ConnectedState:
                c.sendTextMessage(msg_str)
                sent_count += 1
        return sent_count > 0

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

    def get_vyomanta_base_url(self):
        """Returns active base URL for Vyomanta (defaults to localhost:3000 if connected or configured, otherwise vercel app)."""
        env_url = os.getenv("VYOMANTA_BASE_URL")
        if env_url:
            return env_url.rstrip("/")
        if os.getenv("USE_LOCALHOST", "").lower() in ("true", "1", "yes"):
            return "http://localhost:3000"
        if self.is_webapp_connected():
            return "http://localhost:3000"
        return "https://vyomanta-ai.vercel.app"

    @Slot(str)
    def on_navigate_webapp_requested(self, route):
        """Handles voice-triggered webapp route navigation with whitelist validation & regex security."""
        raw_route = route
        route = sanitize_and_validate_route(route)
        print(f"[Main] Voice requested navigation to route: '{raw_route}' -> Validated target: '{route}'")
        
        # 1. Try seamless in-tab WebSocket navigation if an active browser tab is connected
        if self.broadcast_to_webapp({"type": "NAVIGATE_WEBAPP", "payload": {"route": route}}):
            print(f"[Main] Seamless in-tab WebSocket navigation dispatched to active browser tab for route: '{route}' (No new tab opened).")
            if self.pet:
                self.pet.say(f"Navigating to {route}! 🚀", duration=2.5)
            return

        # 2. Fallback to opening browser only if no active browser tab is connected
        print(f"[Main] No active browser tab connected via WebSocket. Launching browser for target route: '{route}'")
        base_url = self.get_vyomanta_base_url()
        target_url = f"{base_url}{route}" if route.startswith("/") else route
        self.open_url_by_gemini(target_url)

    @Slot(int)
    def on_trigger_hint_requested(self, hint_level=1):
        """Handles voice-triggered hint dispatching."""
        print(f"[Main] Voice requested hint dispatching (level {hint_level}).")
        self.broadcast_to_webapp({"type": "TRIGGER_HINT", "payload": {"hint_level": hint_level}})
        self.set_active_animation("explaining")
        if self.pet:
            self.pet.say("Here's a hint for your problem! 💡", duration=4.0)

    @Slot(str, str)
    def on_trigger_action_requested(self, action, target=""):
        """Handles voice-triggered remote page actions."""
        print(f"[Main] Voice requested remote action: {action} (target={target})")
        if hasattr(self, 'ws_bridge') and self.ws_bridge.isValid():
            self.ws_bridge.sendTextMessage(json.dumps({
                "type": "PET_ACTION_REQUESTED",
                "payload": {"action": action, "target": target}
            }))

    @Slot(int, str)
    def on_timer_requested(self, duration_seconds, label="Study Timer"):
        """Starts aesthetic study timer countdown beneath the pet when requested by voice or user."""
        print(f"[Main] Timer requested: {duration_seconds}s ({label})")
        if self.pet and hasattr(self.pet, "renderer"):
            self.pet.renderer.start_timer(duration_seconds, label)
            mins = max(1, duration_seconds // 60)
            self.pet.say(f"Timer set for {mins} mins! ⏱️", duration=2.5)

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

    def is_vyomanta_url(self, url: str) -> bool:
        """Returns True if the URL belongs to Vyomanta LMS (local or hosted)."""
        if not url:
            return False
        url_lower = url.lower().strip()
        if url_lower.startswith("/"):
            return True
        if "vyomanta" in url_lower or "vyomantha" in url_lower or "localhost:3000" in url_lower or "127.0.0.1:3000" in url_lower:
            return True
        return False

    def extract_route_from_vyomanta_url(self, url: str) -> str:
        """Extracts pathname route from a Vyomanta URL (e.g. https://vyomanta-ai.vercel.app/courses -> /courses)."""
        if url.startswith("/"):
            return sanitize_and_validate_route(url)
        from urllib.parse import urlparse
        try:
            parsed = urlparse(url)
            path = parsed.path or "/"
            if parsed.query:
                path += f"?{parsed.query}"
            return sanitize_and_validate_route(path)
        except Exception:
            return "/"

    def open_url_by_gemini(self, url):
        """Intelligently routes URLs: Vyomanta URLs navigate inside active tab via WebSocket bridge; YouTube/external URLs open in new browser tabs."""
        if not url:
            return

        # Check if URL belongs to Vyomanta LMS
        if self.is_vyomanta_url(url):
            route = self.extract_route_from_vyomanta_url(url)
            if self.broadcast_to_webapp({"type": "NAVIGATE_WEBAPP", "payload": {"route": route}}):
                print(f"[Main] Vyomanta URL detected ('{url}'). Routing seamlessly inside active browser tab to: '{route}' (No new tab opened).")
                if self.pet:
                    self.pet.say(f"Navigating to {route}! 🚀", duration=2.5)
                return

        base_url = self.get_vyomanta_base_url()
        url_lower = url.lower().strip()
        if url_lower in ("vyomantha", "vyomanta", "study", "vyomantha website", "vyomanta website", "https://vyomanta-ai.vercel.app", "https://vyomanta-ai.vercel.app/", "https://vyomanta.vercel.app", "https://vyomanta.vercel.app/", "http://localhost:3000", "http://localhost:3000/"):
            url = f"{base_url}/"
        elif url.startswith("/"):
            url = f"{base_url}{url}"
        elif not (url.startswith("http://") or url.startswith("https://")):
            if "vyomanta-ai.vercel.app" in url_lower or "vyomanta.vercel.app" in url_lower or "vyomanta" in url_lower or "vyomantha" in url_lower or "localhost" in url_lower:
                url = "https://" + url if "." in url else f"{base_url}/{url.lstrip('/')}"
            else:
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
                print(f"[Main] Standard external website detected ({url}) -> Keeping Gemini Live Voice Chat ACTIVE.")
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