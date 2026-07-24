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
    def __init__(self, main_app, check_interval=1.5):
        self.main_app = main_app
        self.check_interval = check_interval
        self.last_check_time = 0.0
        self.current_category = "idle"
        self.enabled = True

        # Activity classification keywords
        self.coding_keywords = [
            "visual studio code", "vscode", "cursor", "pycharm",
            "sublime", "intellij", "eclipse", "antigravity",
            "atom", "neovim", "vim", "code", "terminal", "powershell", "cmd.exe"
        ]
        self.browser_keywords = [
            "chrome", "edge", "firefox", "brave", "vivaldi", "opera", "safari"
        ]
        self.music_keywords = [
            "spotify", "youtube", "apple music", "soundcloud",
            "vlc", "media player", "music", "groove"
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

        # Check Coding / IDE (Antigravity, VS Code, Cursor, PyCharm, etc.) FIRST to prevent file path false positives
        for kw in self.coding_keywords:
            if kw in t_lower:
                # Dynamic sub-cycle for active IDE sessions: rotates strictly between typing and reading
                now_mod = int(time.time()) // 7
                ide_states = ["typing", "reading"]
                return ide_states[now_mod % len(ide_states)]

        # Check File Explorer / File Manager -> Searching animation (Line 9)
        for kw in self.explorer_keywords:
            if kw in t_lower:
                return "searching"

        # Check Music / Media -> Music animation (Line 2)
        for kw in self.music_keywords:
            if kw in t_lower:
                return "music"

        # Check Browsing / Reading -> Reading animation (Line 7)
        for kw in self.browser_keywords:
            if kw in t_lower:
                return "reading"

        # Check Chat / Messaging -> Speak animation (Line 5)
        for kw in self.chat_keywords:
            if kw in t_lower:
                return "speak"

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

        # Automatically pause voice chat if user opens/focuses system music or media apps (YouTube, Spotify, VLC, etc.)
        if is_voice_chat_active and category == "music":
            print(f"[ActivityTracker] System media playback detected ('{title[:40]}...') -> Pausing Gemini Live voice chat.")
            self.main_app.gemini_client.interrupted.emit()
            self.main_app.gemini_client.stop()
            if self.main_app.pet:
                self.main_app.pet.say("Pausing voice chat for music playback! 🎵", duration=2.5)
            return

        if is_voice_chat_active:
            return

        if category != self.current_category:
            self.current_category = category
            print(f"[ActivityTracker] Active Window: '{title[:40]}...' -> Triggering animation: {category}")
            self.main_app.set_active_animation(category)
