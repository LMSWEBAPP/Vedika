from PySide6.QtWidgets import (
    QWidget, QMenu, QDialog, QVBoxLayout, QHBoxLayout, QLabel,
    QLineEdit, QComboBox, QPushButton, QTabWidget, QTextBrowser, QMessageBox
)
from PySide6.QtGui import QPainter, QAction, QCursor, QShortcut, QKeySequence
from PySide6.QtCore import Qt, QPoint

class TransparentWindow(QWidget):
    def __init__(self, pet, main_app, scale_factor=1.0):
        super().__init__()
        self.pet = pet
        self.main_app = main_app
        self.scale_factor = scale_factor
        self.bubble_offset = 48  # Height for 2-line speech bubble offset
        self.timer_offset = 26   # Height for bottom timer capsule

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

            # Alt+S (Screen Vision) - VK_S = 0x53, MOD_ALT = 0x0001 | MOD_NOREPEAT = 0x4000
            res_alt_s = user32.RegisterHotKey(hwnd, 1011, 0x4001, 0x53)
            if res_alt_s:
                print("[Hotkeys] System-wide Alt+S hotkey registered successfully.")
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
                    elif msg.wParam == 1011:
                        print("[NativeEvent] System-wide Alt+S pressed.")
                        self.main_app.trigger_screen_analysis_alt_s()
                        return True, 0
        except Exception:
            pass
        return super().nativeEvent(eventType, message)

    def update_window_size(self):
        """Updates the physical window size and physics bounds based on scale."""
        scaled_pet_w = int(self.pet.width * self.scale_factor)
        window_w = max(scaled_pet_w + 140, int(290 * self.scale_factor))
        scaled_h = int((self.pet.height + self.bubble_offset + self.timer_offset) * self.scale_factor)
        
        self.setFixedSize(window_w, scaled_h)
        
        # Propagate scaling sizes to the physics engine bounds
        self.pet.physics.width = scaled_pet_w
        self.pet.physics.height = int(self.pet.height * self.scale_factor)

    def paintEvent(self, event):
        """Standard Paint override - delegates rendering details to engine/renderer.py."""
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        painter.setRenderHint(QPainter.RenderHint.SmoothPixmapTransform)
        
        self.pet.renderer.draw(painter, self.scale_factor, window_w=self.width())
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
            
            # Calculate where the pet body box is located
            pet_offset_x = (self.width() - self.pet.physics.width) // 2
            pet_x = new_window_x + pet_offset_x
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
        vyom_act = menu.addAction("🚀 Open Vyomantha (vyomanta-ai.vercel.app)")
        vyom_act.triggered.connect(self.main_app.open_vyomantha_website)

        # 3b-2. Study Timer Submenu
        timer_menu = menu.addMenu("⏱️ Study Timer")
        timer_menu.setStyleSheet(menu.styleSheet())
        t5 = timer_menu.addAction("5 mins (Quick Quiz)")
        t5.triggered.connect(lambda: self.start_timer_duration(300, "Quick Quiz"))
        t15 = timer_menu.addAction("15 mins (Practice Session)")
        t15.triggered.connect(lambda: self.start_timer_duration(900, "Practice"))
        t25 = timer_menu.addAction("25 mins (Pomodoro Focus)")
        t25.triggered.connect(lambda: self.start_timer_duration(1500, "Pomodoro"))
        if hasattr(self.pet, "renderer") and self.pet.renderer.timer_active:
            timer_menu.addSeparator()
            t_stop = timer_menu.addAction("🛑 Stop Active Timer")
            t_stop.triggered.connect(self.pet.renderer.stop_timer)

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

        # 4b. Student Profile & Memory Manager Dialog
        profile_act = menu.addAction("👤 Student Profile & Memory")
        profile_act.triggered.connect(self.open_student_profile_dialog)

        # 4c. Clear Long-Term Memory (Privacy)
        clear_mem = menu.addAction("🗑️ Clear Learning Memory")
        clear_mem.triggered.connect(self.clear_student_memory)

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

    def open_student_profile_dialog(self):
        """Opens the Student Profile & Memory Manager dialog."""
        dialog = StudentProfileDialog(self)
        dialog.exec()

    def clear_student_memory(self):
        """Clears all stored student learning memories and conversation history from SQLite."""
        try:
            from engine.memory import MemoryManager
            MemoryManager().clear_all_memories()
            if self.pet:
                self.pet.say("Memory reset! Starting fresh. 🧠", duration=3.0)
        except Exception as e:
            print(f"[TransparentWindow] Error clearing memory: {e}")

    def start_timer_duration(self, seconds: int, label: str = "Study Timer"):
        """Starts a visual countdown timer capsule beneath the desktop pet."""
        if hasattr(self.pet, "renderer"):
            self.pet.renderer.start_timer(seconds, label)
            mins = seconds // 60
            if self.pet:
                self.pet.say(f"Timer set for {mins} mins! ⏱️", duration=2.5)

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


class StudentProfileDialog(QDialog):
    """Modern dark-themed Student Profile & Memory Manager dialog."""
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Student Profile & Memory - Vedika AI")
        self.setFixedSize(540, 500)
        self.setStyleSheet("""
            QDialog {
                background-color: #12131a;
                color: #e2e2ec;
                font-family: 'Segoe UI', sans-serif;
            }
            QLabel {
                color: #b0b4c8;
                font-size: 12px;
                font-weight: 500;
            }
            QLineEdit, QComboBox {
                background-color: #1c1d28;
                color: #ffffff;
                border: 1px solid #2d324d;
                border-radius: 6px;
                padding: 6px 10px;
                font-size: 13px;
            }
            QLineEdit:focus, QComboBox:focus {
                border: 1px solid #4f7df9;
            }
            QTabWidget::pane {
                border: 1px solid #2d324d;
                background-color: #161722;
                border-radius: 6px;
            }
            QTabBar::tab {
                background-color: #1c1d28;
                color: #8c90a4;
                padding: 8px 16px;
                border-top-left-radius: 6px;
                border-top-right-radius: 6px;
                margin-right: 4px;
            }
            QTabBar::tab:selected {
                background-color: #2a3356;
                color: #ffffff;
                font-weight: bold;
            }
            QTextBrowser {
                background-color: #161722;
                color: #d1d5e5;
                border: none;
                padding: 8px;
                font-size: 12px;
            }
            QPushButton {
                background-color: #3b5bdb;
                color: #ffffff;
                border: none;
                border-radius: 6px;
                padding: 8px 16px;
                font-weight: bold;
                font-size: 13px;
            }
            QPushButton:hover {
                background-color: #4c6ef5;
            }
            QPushButton#dangerBtn {
                background-color: #c92a2a;
            }
            QPushButton#dangerBtn:hover {
                background-color: #e03131;
            }
            QPushButton#cancelBtn {
                background-color: #2b2c3d;
            }
            QPushButton#cancelBtn:hover {
                background-color: #3a3b4f;
            }
        """)

        from engine.user_profile import UserProfileManager
        from engine.memory import MemoryManager

        self.upm = UserProfileManager()
        self.mm = MemoryManager()
        user = self.upm.profile.get("user", {})
        learned = self.upm.profile.get("learned_traits", {})

        layout = QVBoxLayout(self)

        tabs = QTabWidget()
        layout.addWidget(tabs)

        # Tab 1: Profile
        prof_widget = QWidget()
        p_layout = QVBoxLayout(prof_widget)
        p_layout.setSpacing(8)

        p_layout.addWidget(QLabel("Student Name:"))
        self.name_edit = QLineEdit(user.get("name", "Alex"))
        p_layout.addWidget(self.name_edit)

        p_layout.addWidget(QLabel("Stage / Grade Level:"))
        self.stage_combo = QComboBox()
        self.stage_combo.addItems(["School", "College", "PG", "Self-Learner"])
        curr_stage = user.get("stage", "College")
        idx = self.stage_combo.findText(curr_stage)
        if idx >= 0:
            self.stage_combo.setCurrentIndex(idx)
        p_layout.addWidget(self.stage_combo)

        p_layout.addWidget(QLabel("Field of Study / Subjects:"))
        self.field_edit = QLineEdit(user.get("field_of_study", "Computer Science"))
        p_layout.addWidget(self.field_edit)

        p_layout.addWidget(QLabel("Key Hobbies (comma-separated):"))
        self.hobbies_edit = QLineEdit(", ".join(user.get("hobbies", [])))
        p_layout.addWidget(self.hobbies_edit)

        p_layout.addWidget(QLabel("Favorite / Focus Topics (comma-separated):"))
        self.favs_edit = QLineEdit(", ".join(learned.get("favorite_topics", [])))
        p_layout.addWidget(self.favs_edit)
        p_layout.addStretch()

        tabs.addTab(prof_widget, "👤 Profile")

        # Tab 2: Voice Chat History
        chat_widget = QWidget()
        c_layout = QVBoxLayout(chat_widget)
        self.chat_browser = QTextBrowser()
        turns = self.mm.get_recent_conversations(limit=25)
        if turns:
            html = ""
            for t in turns:
                is_student = t["role"] == "student"
                color = "#4dabf7" if is_student else "#69db7c"
                speaker = "Student" if is_student else "Vedika (Tutor)"
                time_str = t.get("created_at", "")[:19]
                html += f"<div style='margin-bottom: 8px;'><b style='color: {color};'>[{time_str}] {speaker}:</b><br><span style='color: #e2e2ec;'>{t['text']}</span></div>"
            self.chat_browser.setHtml(html)
        else:
            self.chat_browser.setPlainText("No voice chat history recorded yet.")
        c_layout.addWidget(self.chat_browser)
        tabs.addTab(chat_widget, "🎙️ Voice History")

        # Tab 3: Academic Concept Memories
        mem_widget = QWidget()
        m_layout = QVBoxLayout(mem_widget)
        self.mem_browser = QTextBrowser()
        mems = self.mm.search_memories(query="", category="all")
        if mems:
            html = ""
            for m in mems:
                cat = m["category"].upper()
                subj = m["subject"].capitalize()
                top = m["topic"]
                note = m["note"]
                cnt = m["occurrence_count"]
                cnt_str = f" (x{cnt})" if cnt > 1 else ""
                html += f"<div style='margin-bottom: 8px;'><b style='color: #ffd43b;'>[{cat} | {subj}] {top}{cnt_str}:</b><br><span style='color: #e2e2ec;'>{note}</span></div>"
            self.mem_browser.setHtml(html)
        else:
            self.mem_browser.setPlainText("No concept memories recorded yet.")
        m_layout.addWidget(self.mem_browser)
        tabs.addTab(mem_widget, "🧠 Concept Memory")

        # Bottom Buttons
        btn_layout = QHBoxLayout()
        clear_btn = QPushButton("Clear All Memory")
        clear_btn.setObjectName("dangerBtn")
        clear_btn.clicked.connect(self.clear_memory)
        btn_layout.addWidget(clear_btn)

        btn_layout.addStretch()

        cancel_btn = QPushButton("Cancel")
        cancel_btn.setObjectName("cancelBtn")
        cancel_btn.clicked.connect(self.reject)
        btn_layout.addWidget(cancel_btn)

        save_btn = QPushButton("Save Profile")
        save_btn.clicked.connect(self.save_profile)
        btn_layout.addWidget(save_btn)

        layout.addLayout(btn_layout)

    def save_profile(self):
        name = self.name_edit.text().strip()
        stage = self.stage_combo.currentText().strip()
        field = self.field_edit.text().strip()
        hobbies = [h.strip() for h in self.hobbies_edit.text().split(",") if h.strip()]
        favs = [f.strip() for f in self.favs_edit.text().split(",") if f.strip()]

        self.upm.update_user_info(
            name=name if name else "Alex",
            stage=stage if stage else "College",
            field_of_study=field if field else "Computer Science",
            hobbies=hobbies,
            favorite_topics=favs
        )
        self.accept()

    def clear_memory(self):
        reply = QMessageBox.question(
            self, "Clear Memory", "Are you sure you want to clear all learning memories and voice history?",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No
        )
        if reply == QMessageBox.StandardButton.Yes:
            self.mm.clear_all_memories()
            self.chat_browser.setPlainText("All conversation memories cleared.")
            self.mem_browser.setPlainText("All concept memories cleared.")
