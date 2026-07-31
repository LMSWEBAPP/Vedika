import os
import sys
import time

# Native Windows Foreground Window Detection via ctypes (Zero external dependencies)
if sys.platform == "win32":
    import ctypes
    from ctypes import wintypes

    user32 = ctypes.windll.user32
    kernel32 = ctypes.windll.kernel32

    def get_foreground_window_title():
        """Returns the title of the active foreground window on Windows."""
        try:
            hwnd = user32.GetForegroundWindow()
            if not hwnd:
                return ""
            length = user32.GetWindowTextLengthW(hwnd)
            if length == 0:
                return ""
            buff = ctypes.create_unicode_buffer(length + 1)
            user32.GetWindowTextW(hwnd, buff, length + 1)
            return buff.value
        except Exception:
            return ""
else:
    def get_foreground_window_title():
        return ""


class DesktopActivityTracker:
    """
    Lightweight local desktop window activity tracker.
    Monitors active foreground window to trigger matching pet animations
    (typing, reading, music, speak) with 0ms latency and 0 cloud API costs.
    """
    def __init__(self, main_app, check_interval=0.1):
        self.main_app = main_app
        self.check_interval = check_interval
        self.last_check_time = 0.0
        self.current_category = "idle"
        self.enabled = True

        # Activity classification keywords
        self.coding_keywords = [
            "visual studio code", "vscode", "antigravity", "cursor",
            "pycharm", "sublime text", "intellij", "eclipse", "neovim"
        ]
        self.music_keywords = [
            "youtube", "youtube.com", "spotify", "twitch", "netflix",
            "vlc", "media player", "groove", "soundCloud"
        ]
        self.reading_keywords = [
            "chrome", "edge", "firefox", "brave", "vivaldi", "opera", "safari",
            "pdf", "acrobat", "foxit", "sumatra", "evince", "okular", "reader"
        ]
        self.chat_keywords = [
            "discord", "slack", "telegram", "whatsapp", "signal"
        ]
        self.explorer_keywords = [
            "file explorer", "explorer", "this pc", "downloads",
            "documents", "pictures", "desktop", "c:\\", "d:\\", "e:\\"
        ]

    def classify_window(self, title):
        """Classifies window title into activity category."""
        if not title or title.lower() in ("program manager", "desktop", ""):
            return "idle"
            
        t_lower = title.lower()

        # Check Music / Video / Media FIRST to ensure YouTube video title overrides browser reading
        for kw in self.music_keywords:
            if kw in t_lower:
                return "music"

        # Check Coding / IDE (Antigravity, VS Code, Cursor, PyCharm, etc.) -> Typing animation
        for kw in self.coding_keywords:
            if kw in t_lower:
                return "typing"

        # Check File Explorer / File Manager -> Searching animation
        for kw in self.explorer_keywords:
            if kw in t_lower:
                return "searching"

        # Check Chat / Messaging -> Speak animation
        for kw in self.chat_keywords:
            if kw in t_lower:
                return "speak"

        # Check Browsing / Reading / PDF -> Reading animation
        for kw in self.reading_keywords:
            if kw in t_lower:
                return "reading"

        return "idle"

    def update(self):
        """Called periodically in the game loop."""
        if not self.enabled or not self.main_app.pet:
            return

        now = time.time()
        if now - self.last_check_time < self.check_interval:
            return

        self.last_check_time = now
        title = get_foreground_window_title()
        category = self.classify_window(title)

        is_voice_chat_active = (
            hasattr(self.main_app, 'gemini_client') and 
            self.main_app.gemini_client and 
            self.main_app.gemini_client.is_active
        )

        # Instantly disconnect voice chat (0ms delay, no talking) when YouTube or media video playback is detected
        if is_voice_chat_active and category == "music":
            print(f"[ActivityTracker] System media playback detected ('{title[:40]}...') -> Instantly disconnecting Gemini Live voice chat.")
            self.main_app.gemini_client.stop()
            if self.main_app.pet:
                music_anim = "music" if "music" in self.main_app.pet.sprite.animations else "idle"
                self.main_app.set_active_animation(music_anim)
            return

        curr_anim_name = self.main_app.pet.sprite.current_animation.name if self.main_app.pet.sprite.current_animation else ""
        curr_state_name = self.main_app.pet.state_machine.current_state.name if self.main_app.pet.state_machine.current_state else ""

        # If voice chat is active and pet is currently speaking or thinking/searching, preserve speech/search animation
        if is_voice_chat_active:
            if curr_state_name in ("speak", "searching") or curr_anim_name in ("speak", "searching"):
                return

        # Preserve sleep animation if pet went to sleep while idle
        if curr_anim_name == "sleep" and category == "idle":
            return

        # Instantly switch animation when foreground application category changes
        if category != self.current_category or curr_anim_name != category:
            self.current_category = category
            print(f"[ActivityTracker] Active Window: '{title[:40]}...' -> Triggering animation: {category}")
            self.main_app.set_active_animation(category)
