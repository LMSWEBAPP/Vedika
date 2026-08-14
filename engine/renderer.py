from PySide6.QtGui import QPainter, QColor, QFont, QFontMetrics, QPen, QBrush, QPolygonF
from PySide6.QtCore import Qt, QRectF, QPointF

class Renderer:
    def __init__(self, pet):
        self.pet = pet
        self.speech_text = ""
        self.user_speech_text = ""
        self.speech_timer = 0.0
        self.max_duration = 3.0
        self.bubble_height = 48  # Increased height offset for responsive 2-line dialogue bubble

        # Aesthetic Study Timer Capsule State
        self.timer_active = False
        self.timer_seconds = 0.0
        self.timer_total = 0.0
        self.timer_label = "Study Timer"

    def set_speech(self, text, duration=3.0, user_text=None):
        """Displays a responsive speech capsule above the pet."""
        if not text and not user_text:
            self.speech_text = ""
            self.user_speech_text = ""
            self.speech_timer = 0.0
            return
            
        self.speech_text = text.strip() if text else ""
        self.user_speech_text = user_text.strip() if user_text else ""
        
        all_words = (self.speech_text + " " + self.user_speech_text).split()
        calculated_duration = max(duration, min(8.0, len(all_words) * 0.35 + 2.0))
        self.speech_timer = calculated_duration
        self.max_duration = calculated_duration

    def set_dialogue(self, user_text, ai_text, duration=5.0):
        """Sets live dual-line subtitles for User and AI dialogue."""
        if not user_text and not ai_text:
            self.speech_text = ""
            self.user_speech_text = ""
            self.speech_timer = 0.0
            return

        self.user_speech_text = user_text.strip() if user_text else ""
        self.speech_text = ai_text.strip() if ai_text else ""
        
        all_words = (self.speech_text + " " + self.user_speech_text).split()
        calculated_duration = max(duration, min(8.5, len(all_words) * 0.35 + 2.0))
        self.speech_timer = calculated_duration
        self.max_duration = calculated_duration

    def start_timer(self, seconds: float, label: str = "Study Timer"):
        """Starts the aesthetic timer capsule displayed below the pet."""
        self.timer_seconds = float(seconds)
        self.timer_total = float(seconds)
        self.timer_label = label.strip() or "Study Timer"
        self.timer_active = True
        print(f"[Renderer] Started study timer: {seconds}s ({self.timer_label})")

    def stop_timer(self):
        """Stops the active study timer."""
        self.timer_active = False
        self.timer_seconds = 0.0

    def update(self, dt):
        """Updates text display timers and countdown timers."""
        if self.speech_timer > 0.0:
            self.speech_timer -= dt
            if self.speech_timer <= 0.0:
                self.speech_text = ""
                self.user_speech_text = ""
                self.speech_timer = 0.0

        if self.timer_active:
            self.timer_seconds -= dt
            if self.timer_seconds <= 0.0:
                self.timer_active = False
                self.timer_seconds = 0.0
                self.set_speech(f"⏰ Time's up! {self.timer_label} finished! 🎉", duration=4.5)
                self.pet.play_sound("alarm") if hasattr(self.pet, "play_sound") else None

    def draw(self, painter, scale, window_w=None):
        """
        Renders the pet, compact speech capsule, and bottom timer capsule
        with full breathing room to prevent border clipping.
        """
        scaled_bubble_offset = int(self.bubble_height * scale)
        scaled_pet_w = int(self.pet.physics.width)
        scaled_pet_h = int(self.pet.physics.height)
        
        # Calculate horizontal center and pet draw offset
        actual_win_w = window_w if window_w else scaled_pet_w
        pet_x = (actual_win_w - scaled_pet_w) // 2
        cx = actual_win_w / 2.0

        # 1. Draw Pet Sprite
        pixmap = self.pet.sprite.get_current_pixmap()
        if pixmap:
            painter.drawPixmap(pet_x, scaled_bubble_offset, scaled_pet_w, scaled_pet_h, pixmap)

        # 2. Draw Responsive Dual-Line Speech Capsule (Positioned above pet head)
        if self.speech_text or self.user_speech_text:
            self._draw_compact_speech_pill(painter, cx, actual_win_w, scaled_bubble_offset, scale)

        # 3. Draw Aesthetic Timer Capsule (Positioned cleanly below the pet)
        if self.timer_active:
            self._draw_timer_capsule(painter, cx, actual_win_w, scaled_bubble_offset + scaled_pet_h, scale)

    def _draw_compact_speech_pill(self, painter, cx, win_w, bubble_h, scale):
        """Draws a responsive 2-line glassmorphism speech capsule with dual User & AI dialogue or wrapped text."""
        if not self.speech_text and not self.user_speech_text:
            return

        font_size = max(8, int(8.5 * scale))
        font = QFont("Segoe UI", font_size)
        font.setWeight(QFont.Weight.Medium)
        painter.setFont(font)

        fm = QFontMetrics(font)
        line_h = fm.height()
        
        # Generous width margin with safe bounds
        max_pill_w = min(win_w - 10, max(int(win_w * 0.94), int(220 * scale)))
        padding_h = max(8, int(10 * scale))
        padding_v = max(4, int(5 * scale))
        line_spacing = max(1, int(2 * scale))
        max_text_w = max_pill_w - (padding_h * 2)

        is_dual = bool(self.user_speech_text and self.speech_text)
        
        if is_dual:
            # Dual-line mode: Line 1 = User, Line 2 = Vedika
            user_display = fm.elidedText(f"👤 You: {self.user_speech_text}", Qt.TextElideMode.ElideRight, max_text_w)
            ai_display = fm.elidedText(f"🤖 Vedika: {self.speech_text}", Qt.TextElideMode.ElideRight, max_text_w)
            
            w1 = fm.horizontalAdvance(user_display)
            w2 = fm.horizontalAdvance(ai_display)
            pill_w = min(max_pill_w, max(w1, w2) + padding_h * 2)
            pill_h = (line_h * 2) + (padding_v * 2) + line_spacing
            num_lines = 2
        else:
            # Single-speaker mode: Wrap up to 2 lines if long
            raw_text = self.speech_text if self.speech_text else self.user_speech_text
            prefix = "👤 You: " if self.user_speech_text else ""
            full_text = f"{prefix}{raw_text}"
            
            if fm.horizontalAdvance(full_text) <= max_text_w:
                display_line1 = full_text
                display_line2 = ""
                pill_w = min(max_pill_w, fm.horizontalAdvance(display_line1) + padding_h * 2)
                pill_h = line_h + (padding_v * 2)
                num_lines = 1
            else:
                display_line1, display_line2 = self._wrap_two_lines(fm, full_text, max_text_w)
                if display_line2:
                    w1 = fm.horizontalAdvance(display_line1)
                    w2 = fm.horizontalAdvance(display_line2)
                    pill_w = min(max_pill_w, max(w1, w2) + padding_h * 2)
                    pill_h = (line_h * 2) + (padding_v * 2) + line_spacing
                    num_lines = 2
                else:
                    pill_w = min(max_pill_w, fm.horizontalAdvance(display_line1) + padding_h * 2)
                    pill_h = line_h + (padding_v * 2)
                    num_lines = 1

        pill_x = cx - (pill_w / 2.0)
        # Sits with a 2px gap right above the pet's head
        pill_y = max(2.0, bubble_h - pill_h - int(3 * scale))
        pill_rect = QRectF(pill_x, pill_y, pill_w, pill_h)

        corner_radius = min(8.0, pill_h / 3.0)

        # Soft drop shadow
        painter.setPen(Qt.PenStyle.NoPen)
        painter.setBrush(QColor(0, 0, 0, 110))
        painter.drawRoundedRect(pill_rect.adjusted(-1.5, 1.5, 1.5, 3.0), corner_radius, corner_radius)

        # Modern Obsidian Glass Body with glowing cyan border
        painter.setPen(QPen(QColor(56, 189, 248, 220), max(1, int(1.1 * scale))))
        painter.setBrush(QBrush(QColor(13, 16, 26, 245)))
        painter.drawRoundedRect(pill_rect, corner_radius, corner_radius)

        # Downward indicator arrow pointing toward pet head
        arrow = QPolygonF()
        by = pill_y + pill_h
        arrow_h = int(3 * scale)
        arrow.append(QPointF(cx - int(3.5 * scale), by))
        arrow.append(QPointF(cx + int(3.5 * scale), by))
        arrow.append(QPointF(cx, by + arrow_h))

        painter.setPen(Qt.PenStyle.NoPen)
        painter.setBrush(QBrush(QColor(13, 16, 26, 245)))
        painter.drawPolygon(arrow)

        # Text Drawing with clean color accents
        if is_dual:
            # Line 1: User Question in Vibrant Cyan
            painter.setPen(QColor(56, 189, 248))
            r1 = QRectF(pill_x + padding_h, pill_y + padding_v, pill_w - padding_h * 2, line_h)
            painter.drawText(r1, Qt.AlignmentFlag.AlignLeft | Qt.AlignmentFlag.AlignVCenter, user_display)

            # Line 2: AI / Vedika Answer in Bright Platinum White
            painter.setPen(QColor(248, 250, 252))
            r2 = QRectF(pill_x + padding_h, pill_y + padding_v + line_h + line_spacing, pill_w - padding_h * 2, line_h)
            painter.drawText(r2, Qt.AlignmentFlag.AlignLeft | Qt.AlignmentFlag.AlignVCenter, ai_display)
        else:
            if num_lines == 1:
                painter.setPen(QColor(248, 250, 252))
                painter.drawText(pill_rect, Qt.AlignmentFlag.AlignCenter, display_line1)
            else:
                painter.setPen(QColor(248, 250, 252))
                r1 = QRectF(pill_x + padding_h, pill_y + padding_v, pill_w - padding_h * 2, line_h)
                r2 = QRectF(pill_x + padding_h, pill_y + padding_v + line_h + line_spacing, pill_w - padding_h * 2, line_h)
                painter.drawText(r1, Qt.AlignmentFlag.AlignCenter, display_line1)
                painter.drawText(r2, Qt.AlignmentFlag.AlignCenter, display_line2)

    def _wrap_two_lines(self, fm, text, max_w):
        """Splits long text across 2 balanced lines without mid-word cutting."""
        words = text.split()
        if not words:
            return "", ""
        
        line1 = ""
        idx = 0
        while idx < len(words):
            test_line = (line1 + " " + words[idx]).strip() if line1 else words[idx]
            if fm.horizontalAdvance(test_line) <= max_w:
                line1 = test_line
                idx += 1
            else:
                break
                
        if idx < len(words):
            rem = " ".join(words[idx:])
            line2 = fm.elidedText(rem, Qt.TextElideMode.ElideRight, max_w)
            return line1, line2
        return line1, ""

    def _draw_timer_capsule(self, painter, cx, win_w, top_y, scale):
        """Draws an aesthetic glowing timer capsule below the pet with safe bounds."""
        total_secs = int(max(0, self.timer_seconds))
        mins = total_secs // 60
        secs = total_secs % 60
        time_str = f"{mins:02d}:{secs:02d}"

        font_size = max(8, int(8.5 * scale))
        font = QFont("Segoe UI", font_size)
        font.setWeight(QFont.Weight.DemiBold)
        painter.setFont(font)

        fm = QFontMetrics(font)
        
        # Display: '⏱️ 14:59 Math'
        label_short = fm.elidedText(self.timer_label, Qt.TextElideMode.ElideRight, int(70 * scale))
        timer_text = f"⏱️ {time_str} {label_short}" if label_short else f"⏱️ {time_str}"
        
        text_w = fm.horizontalAdvance(timer_text)
        padding_h = max(8, int(9 * scale))
        padding_v = max(3, int(4 * scale))
        
        max_cap_w = win_w - 12
        capsule_w = min(max_cap_w, text_w + padding_h * 2)
        capsule_h = fm.height() + padding_v * 2
        
        capsule_x = cx - (capsule_w / 2.0)
        capsule_y = top_y + int(4 * scale)

        capsule_rect = QRectF(capsule_x, capsule_y, capsule_w, capsule_h)

        # Soft neon ambient glow
        painter.setPen(Qt.PenStyle.NoPen)
        painter.setBrush(QColor(6, 182, 212, 50)) # Cyan neon glow
        painter.drawRoundedRect(capsule_rect.adjusted(-2, -1, 2, 2), int(capsule_h / 2.0), int(capsule_h / 2.0))

        # Sleek Neon Capsule Body
        painter.setPen(QPen(QColor(34, 211, 238, 220), max(1, int(1.2 * scale)))) # Bright Cyan Border
        painter.setBrush(QBrush(QColor(10, 14, 23, 245)))
        painter.drawRoundedRect(capsule_rect, int(capsule_h / 2.0), int(capsule_h / 2.0))

        # High-Contrast Glowing Cyan Text
        painter.setPen(QColor(165, 243, 252))
        painter.drawText(
            capsule_rect,
            Qt.AlignmentFlag.AlignCenter,
            timer_text
        )
