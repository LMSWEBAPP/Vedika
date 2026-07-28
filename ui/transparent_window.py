from PySide6.QtWidgets import QWidget, QMenu
from PySide6.QtGui import QPainter, QAction, QCursor, QShortcut, QKeySequence
from PySide6.QtCore import Qt, QPoint

class TransparentWindow(QWidget):
    def __init__(self, pet, main_app, scale_factor=1.0):
        super().__init__()
        self.pet = pet
        self.main_app = main_app
        self.scale_factor = scale_factor
        self.bubble_offset = 45  # Height for speech bubble offset

        # Window styling
        self.setWindowFlags(
            Qt.WindowType.FramelessWindowHint | 
            Qt.WindowType.WindowStaysOnTopHint | 
            Qt.WindowType.Tool
        )
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground, True)
        self.setAttribute(Qt.WidgetAttribute.WA_NoSystemBackground, True)
        self.setMouseTracking(True)
        self.setFocusPolicy(Qt.FocusPolicy.StrongFocus)

        # Update initial physics sizes to match scale factor
        self.pet.physics.width = int(self.pet.width * self.scale_factor)
        self.pet.physics.height = int(self.pet.height * self.scale_factor)

        self.update_window_size()
        
        # Global F9 Hotkey shortcut (Pause/Resume)
        self.f9_shortcut = QShortcut(QKeySequence(Qt.Key.Key_F9), self)
        self.f9_shortcut.setContext(Qt.ShortcutContext.ApplicationShortcut)
        self.f9_shortcut.activated.connect(self.main_app.toggle_gemini_pause_f9)

        # Global Alt+V Hotkey shortcut (Start/Stop)
        self.alt_v_shortcut = QShortcut(QKeySequence("Alt+V"), self)
        self.alt_v_shortcut.setContext(Qt.ShortcutContext.ApplicationShortcut)
        self.alt_v_shortcut.activated.connect(self.main_app.toggle_gemini_start_stop_alt_v)

        self.setup_global_hotkeys()

        # Click variables
        self.drag_offset = QPoint()

    def setup_global_hotkeys(self):
        """Registers F9 (Pause/Resume) and Alt+V (Start/Stop) as system-wide Windows hotkeys via ctypes."""
        try:
            import ctypes
            user32 = ctypes.windll.user32
            hwnd = int(self.winId())
            # F9 (Pause/Resume) - VK_F9 = 0x70
            res_f9 = user32.RegisterHotKey(hwnd, 1009, 0x4000, 0x70)
            if res_f9:
                print("[Hotkeys] System-wide F9 hotkey registered successfully.")
            else:
                print("[Hotkeys] Windows notice: F9 bound by OS/hardware. Registering VK_F8 fallback.")
                user32.RegisterHotKey(hwnd, 1009, 0x4000, 0x71)  # F8 fallback

            # Alt+V (Start/Stop) - VK_V = 0x56, MOD_ALT = 0x0001 | MOD_NOREPEAT = 0x4000
            res_alt_v = user32.RegisterHotKey(hwnd, 1010, 0x4001, 0x56)
            if res_alt_v:
                print("[Hotkeys] System-wide Alt+V hotkey registered successfully.")
        except Exception as e:
            print(f"[TransparentWindow] Windows RegisterHotKey notice: {e}")

    def nativeEvent(self, eventType, message):
        """Catches Windows system-wide WM_HOTKEY message (0x0312)."""
        try:
            import ctypes
            from ctypes import wintypes
            if eventType == b"windows_generic_MSG":
                msg = wintypes.MSG.from_address(int(message))
                WM_HOTKEY = 0x0312
                if msg.message == WM_HOTKEY:
                    if msg.wParam == 1009:
                        print("[NativeEvent] System-wide F9 pressed.")
                        self.main_app.toggle_gemini_pause_f9()
                        return True, 0
                    elif msg.wParam == 1010:
                        print("[NativeEvent] System-wide Alt+V pressed.")
                        self.main_app.toggle_gemini_start_stop_alt_v()
                        return True, 0
        except Exception:
            pass
        return super().nativeEvent(eventType, message)

    def update_window_size(self):
        """Updates the physical window size and physics bounds based on scale."""
        scaled_w = int(self.pet.width * self.scale_factor)
        scaled_h = int((self.pet.height + self.bubble_offset) * self.scale_factor)
        
        self.setFixedSize(scaled_w, scaled_h)
        
        # Propagate scaling sizes to the physics engine bounds
        self.pet.physics.width = int(self.pet.width * self.scale_factor)
        self.pet.physics.height = int(self.pet.height * self.scale_factor)

    def paintEvent(self, event):
        """Standard Paint override - delegates rendering details to engine/renderer.py."""
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        painter.setRenderHint(QPainter.RenderHint.SmoothPixmapTransform)
        
        self.pet.renderer.draw(painter, self.scale_factor)
        painter.end()

    # --- Mouse Event Triggers ---
    
    def mousePressEvent(self, event):
        if event.button() == Qt.MouseButton.LeftButton:
            # Capture click coordinate relative to the window geometry
            self.drag_offset = event.position().toPoint()
            
            global_pos = event.globalPosition().toPoint()
            self.pet.interaction.handle_press(global_pos.x(), global_pos.y())

    def mouseMoveEvent(self, event):
        if self.pet.physics.is_dragging:
            global_pos = event.globalPosition().toPoint()
            
            # Position the window relative to the cursor press offset
            new_window_x = global_pos.x() - self.drag_offset.x()
            new_window_y = global_pos.y() - self.drag_offset.y()
            
            # Calculate where the pet body box is located (shifted down by speech bubble height)
            pet_x = new_window_x
            pet_y = new_window_y + int(self.bubble_offset * self.scale_factor)
            
            self.pet.interaction.handle_drag(pet_x, pet_y)
            
            # Reposition the window on screen immediately
            self.move(new_window_x, new_window_y)
        else:
            global_pos = event.globalPosition().toPoint()
            self.pet.interaction.handle_hover(global_pos.x(), global_pos.y())

    def mouseReleaseEvent(self, event):
        if event.button() == Qt.MouseButton.LeftButton:
            self.pet.interaction.handle_release()

    def mouseDoubleClickEvent(self, event):
        if event.button() == Qt.MouseButton.LeftButton:
            self.pet.interaction.handle_double_click()

    def contextMenuEvent(self, event):
        """Displays custom-styled right-click context menu."""
        menu = QMenu(self)
        
        # Premium dark mode glass/flat styling
        menu.setStyleSheet("""
            QMenu {
                background-color: #16161f;
                color: #e2e2ec;
                border: 1px solid #3c82ff;
                border-radius: 5px;
                padding: 4px;
            }
            QMenu::item {
                padding: 6px 22px;
                border-radius: 3px;
                background-color: transparent;
            }
            QMenu::item:selected {
                background-color: #2a5ccb;
                color: #ffffff;
            }
            QMenu::separator {
                height: 1px;
                background-color: #2b2b3a;
                margin: 5px 8px;
            }
        """)

        # 1. Scale adjustment submenu
        scale_menu = menu.addMenu("Set Scale")
        scale_menu.setStyleSheet(menu.styleSheet())
        scales = [
            ("0.5x (Tiny)", 0.5),
            ("0.8x (Compact)", 0.8),
            ("1.0x (Standard)", 1.0),
            ("1.5x (Medium)", 1.5),
            ("2.0x (Large)", 2.0)
        ]
        for label, val in scales:
            action = QAction(label, self, checkable=True)
            action.setChecked(self.scale_factor == val)
            action.triggered.connect(lambda checked, v=val: self.change_scale(v))
            scale_menu.addAction(action)

        # 1c. Play Animation submenu
        anim_menu = menu.addMenu("Play Animation (Keys 1-0)")
        anim_menu.setStyleSheet(menu.styleSheet())
        anim_names = list(self.pet.sprite.animations.keys())
        curr_anim = self.pet.sprite.current_animation.name if self.pet.sprite.current_animation else ""
        for i, anim_name in enumerate(anim_names):
            key_num = (i + 1) if i < 9 else 0
            label = f"[{key_num}] {anim_name.replace('_', ' ').title()}"
            action = QAction(label, self, checkable=True)
            action.setChecked(curr_anim == anim_name)
            action.triggered.connect(lambda checked, name=anim_name: self.main_app.set_active_animation(name))
            anim_menu.addAction(action)

        # 1b. Auto-React to Desktop Apps toggle
        activity_act = QAction("Auto-React to Desktop Apps", self, checkable=True)
        activity_act.setChecked(self.main_app.auto_activity_reaction)
        activity_act.triggered.connect(self.toggle_auto_activity)
        menu.addAction(activity_act)

        # 1c. Wander/Movement physics toggle
        wander_act = QAction("Enable Wandering (Physics)", self, checkable=True)
        wander_act.setChecked(not self.main_app.static_mode)
        wander_act.triggered.connect(self.toggle_wandering)
        menu.addAction(wander_act)

        # 2. Always on Top toggle
        on_top = QAction("Always on Top", self, checkable=True)
        on_top.setChecked(bool(self.windowFlags() & Qt.WindowType.WindowStaysOnTopHint))
        on_top.triggered.connect(self.toggle_always_on_top)
        menu.addAction(on_top)

        # 3. Sound Toggle
        sound_act = QAction("Enable Audio", self, checkable=True)
        sound_act.setChecked(self.pet.sound_enabled)
        sound_act.triggered.connect(self.toggle_sound)
        menu.addAction(sound_act)

        # 3b. Open Vyomantha Portal
        menu.addSeparator()
        vyom_act = menu.addAction("🚀 Open Vyomantha (vyomanta.vercel.app)")
        vyom_act.triggered.connect(self.main_app.open_vyomantha_website)

        # 3c. Gemini Live Voice Chat Toggle (Alt+V)
        client = self.main_app.gemini_client
        if client.status == "disconnected":
            voice_act = menu.addAction("Start Voice Chat (Alt+V)")
            voice_act.triggered.connect(client.start)
        elif client.status == "connecting":
            voice_act = menu.addAction("Connecting Voice Chat...")
            voice_act.setEnabled(False)
        elif client.status == "connected":
            voice_act = menu.addAction("Stop Voice Chat (Alt+V)")
            voice_act.triggered.connect(client.stop)
        elif client.status == "error":
            voice_act = menu.addAction("Start Voice Chat (Retry)")
            voice_act.triggered.connect(client.start)

        # 3c-2. Pause / Resume Voice Chat (F9)
        if client.is_active:
            pause_label = "Resume Voice Chat (F9)" if client.is_paused else "Pause Voice Chat (F9)"
            pause_act = menu.addAction(pause_label)
            pause_act.triggered.connect(self.main_app.toggle_gemini_pause_f9)

        # 3d. Voice Interruption (Barge-In) toggle
        barge_act = QAction("Enable Voice Interruption (Barge-In)", self, checkable=True)
        barge_act.setChecked(client.enable_barge_in)
        barge_act.triggered.connect(self.toggle_voice_barge_in)
        menu.addAction(barge_act)

        # 3e. Tutor Language submenu
        lang_menu = menu.addMenu("Tutor Language")
        lang_menu.setStyleSheet(menu.styleSheet())
        languages = [
            ("🌐 Multilingual (Auto)", "all"),
            ("🇮🇳 Telugu (తెలుగు)", "telugu"),
            ("🇮🇳 Hindi (हिंदी)", "hindi"),
            ("🇬🇧 English", "english")
        ]
        curr_lang = getattr(client, "tutor_language", "all")
        for label, val in languages:
            action = QAction(label, self, checkable=True)
            action.setChecked(curr_lang == val)
            action.triggered.connect(lambda checked, v=val: self.change_tutor_language(v))
            lang_menu.addAction(action)

        # 3f. Tutor Subject submenu
        subj_menu = menu.addMenu("Tutor Subject")
        subj_menu.setStyleSheet(menu.styleSheet())
        subjects = [
            ("🎓 All Subjects", "all"),
            ("📐 Mathematics", "math"),
            ("🔬 Science", "science"),
            ("📚 Languages & Reading", "languages")
        ]
        curr_subj = getattr(client, "tutor_subject", "all")
        for label, val in subjects:
            action = QAction(label, self, checkable=True)
            action.setChecked(curr_subj == val)
            action.triggered.connect(lambda checked, v=val: self.change_tutor_subject(v))
            subj_menu.addAction(action)

        # 4. Change Pet submenu (Plugin scanner list)
        pet_menu = menu.addMenu("Switch Companion")
        pet_menu.setStyleSheet(menu.styleSheet())
        available = self.main_app.get_available_pets()
        for pet_id, name in available:
            action = QAction(name, self, checkable=True)
            action.setChecked(self.pet.id == pet_id)
            action.triggered.connect(lambda checked, pid=pet_id: self.main_app.switch_pet(pid))
            pet_menu.addAction(action)

        menu.addSeparator()

        # 5. Position Reset
        reset = menu.addAction("Reset Position")
        reset.triggered.connect(self.reset_position)

        # 6. Exit
        close_action = menu.addAction("Close Companion")
        close_action.triggered.connect(self.main_app.exit_application)

        menu.exec(event.globalPos())

    # --- Actions ---
    
    def change_scale(self, scale):
        self.scale_factor = scale
        self.update_window_size()
        self.main_app.save_settings()

    def toggle_always_on_top(self, checked):
        if checked:
            self.setWindowFlags(self.windowFlags() | Qt.WindowType.WindowStaysOnTopHint)
        else:
            self.setWindowFlags(self.windowFlags() & ~Qt.WindowType.WindowStaysOnTopHint)
        self.show()  # Window flags modification requires showing again in Qt
        self.main_app.save_settings()

    def toggle_sound(self, checked):
        self.pet.sound_enabled = checked
        self.main_app.save_settings()

    def reset_position(self):
        screen = self.screen().availableGeometry()
        x = (screen.width() - self.width()) // 2
        y = screen.height() - self.pet.height - 100
        
        self.pet.physics.x = float(x)
        self.pet.physics.y = float(y)
        self.pet.physics.vx = 0.0
        self.pet.physics.vy = 0.0
        self.pet.state_machine.change_state("idle")
        self.move(x, y - int(self.bubble_offset * self.scale_factor))

    def toggle_wandering(self, checked):
        self.main_app.set_static_mode(not checked)

    def toggle_auto_activity(self, checked):
        self.main_app.auto_activity_reaction = checked
        self.main_app.save_settings()

    def toggle_voice_barge_in(self, checked):
        """Toggles voice barge-in interruption while Gemini is speaking."""
        client = self.main_app.gemini_client
        client.enable_barge_in = checked
        status_text = "enabled" if checked else "disabled"
        if self.pet:
            self.pet.say(f"Voice Interruption {status_text}! 🎙️", duration=2.5)
        print(f"[TransparentWindow] Voice Interruption toggled: {checked}")

    def change_tutor_language(self, lang):
        """Sets the academic voice tutor target language."""
        client = self.main_app.gemini_client
        client.tutor_language = lang
        self.main_app.save_settings()
        lang_labels = {"all": "Multilingual", "telugu": "Telugu", "hindi": "Hindi", "english": "English"}
        name = lang_labels.get(lang, lang.title())
        if self.pet:
            self.pet.say(f"Tutor Language set to {name}! 🌐", duration=2.5)
        print(f"[TransparentWindow] Changed tutor language to {lang}")

    def change_tutor_subject(self, subj):
        """Sets the academic voice tutor focus subject."""
        client = self.main_app.gemini_client
        client.tutor_subject = subj
        self.main_app.save_settings()
        subj_labels = {"all": "All Subjects", "math": "Mathematics", "science": "Science", "languages": "Languages & Reading"}
        name = subj_labels.get(subj, subj.title())
        if self.pet:
            self.pet.say(f"Tutor Subject set to {name}! 🎓", duration=2.5)
        print(f"[TransparentWindow] Changed tutor subject to {subj}")

    def keyPressEvent(self, event):
        if event.key() == Qt.Key.Key_Tab:
            self.main_app.cycle_animation()
            event.accept()
        elif Qt.Key.Key_1 <= event.key() <= Qt.Key.Key_9:
            index = event.key() - Qt.Key.Key_1
            self.main_app.switch_animation_by_index(index)
            event.accept()
        elif event.key() == Qt.Key.Key_0:
            self.main_app.switch_animation_by_index(9)
            event.accept()
        elif event.key() == Qt.Key.Key_F9:
            self.main_app.toggle_gemini_pause_f9()
            event.accept()
        else:
            super().keyPressEvent(event)
