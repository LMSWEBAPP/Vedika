import sys
import time
from PySide6.QtWidgets import QWidget, QApplication
from PySide6.QtCore import Qt, QTimer, QRectF, QPointF
from PySide6.QtGui import QPainter, QColor, QPen, QBrush, QFont

class PointerOverlay(QWidget):
    """
    Transparent Top-Most Laser Pointer & Sonar Ripple Overlay Window.
    Renders an animated glowing laser dot, sonar ripple ring, and floating text callout label
    at normalized screen coordinates (x, y) without blocking user clicks or input.
    """
    def __init__(self, parent=None):
        super().__init__(parent)
        # Configure window flags: frameless, transparent input, stays on top, tool window
        self.setWindowFlags(
            Qt.WindowType.FramelessWindowHint |
            Qt.WindowType.WindowStaysOnTopHint |
            Qt.WindowType.WindowTransparentForInput |
            Qt.WindowType.Tool
        )
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground, True)
        self.setAttribute(Qt.WidgetAttribute.WA_ShowWithoutActivating, True)
        
        # Position overlay across the entire primary screen geometry
        screen = QApplication.primaryScreen()
        if screen:
            self.setGeometry(screen.geometry())
        else:
            self.setGeometry(0, 0, 1920, 1080)

        # Pointing state variables
        self.target_x = 0.0
        self.target_y = 0.0
        self.label_text = ""
        self.animation_start_time = 0.0
        self.pulse_radius = 20.0
        self.is_active = False

        # Animation timer (60 FPS refresh rate = ~16ms)
        self.anim_timer = QTimer(self)
        self.anim_timer.setInterval(16)
        self.anim_timer.timeout.connect(self._on_anim_step)

        # Auto-hide timer
        self.hide_timer = QTimer(self)
        self.hide_timer.setSingleShot(True)
        self.hide_timer.timeout.connect(self.stop_pointing)

    def point_at(self, x_norm: float, y_norm: float, label: str = "", duration: float = 3.5):
        """
        Triggers laser pointer and sonar pulse at normalized coordinates (0.0 to 1.0).
        x_norm: horizontal position (0.0 = left, 1.0 = right)
        y_norm: vertical position (0.0 = top, 1.0 = bottom)
        label: text callout label to display
        duration: visible duration in seconds before auto-fading
        """
        screen = QApplication.primaryScreen()
        if screen:
            geom = screen.geometry()
            self.setGeometry(geom)
            screen_w = geom.width()
            screen_h = geom.height()
        else:
            screen_w, screen_h = 1920, 1080

        # Map normalized coordinates to screen pixel positions
        self.target_x = max(0.0, min(1.0, float(x_norm))) * screen_w
        self.target_y = max(0.0, min(1.0, float(y_norm))) * screen_h
        self.label_text = label or "Notice this line"
        self.animation_start_time = time.time()
        self.pulse_radius = 15.0
        self.is_active = True

        print(f"[PointerOverlay] Pointing at screen pixel: ({int(self.target_x)}, {int(self.target_y)}) - Label: '{self.label_text}'")

        self.show()
        self.raise_()
        self.update()

        if not self.anim_timer.isActive():
            self.anim_timer.start()

        self.hide_timer.start(int(duration * 1000))

    def stop_pointing(self):
        """Stops animation and hides the overlay."""
        self.is_active = False
        self.anim_timer.stop()
        self.hide()
        self.update()

    def _on_anim_step(self):
        if not self.is_active:
            return
        
        # Calculate expanding pulse radius (15px to 55px cycle)
        elapsed = time.time() - self.animation_start_time
        cycle = (elapsed * 3.0) % 1.0  # 3 pulses per second
        self.pulse_radius = 15.0 + (cycle * 40.0)
        self.update()

    def paintEvent(self, event):
        if not self.is_active:
            return

        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing, True)

        tx = self.target_x
        ty = self.target_y

        # Calculate fade opacity based on remaining auto-hide time
        remaining_ms = self.hide_timer.remainingTime()
        alpha = 255
        if remaining_ms > 0 and remaining_ms < 500:
            alpha = int((remaining_ms / 500.0) * 255)

        # 1. Draw expanding sonar ripple ring (cyan/blue glow)
        ripple_alpha = int((1.0 - ((self.pulse_radius - 15.0) / 40.0)) * alpha * 0.7)
        ripple_pen = QPen(QColor(0, 220, 255, max(0, ripple_alpha)), 3, Qt.PenStyle.SolidLine)
        painter.setPen(ripple_pen)
        painter.setBrush(Qt.BrushStyle.NoBrush)
        painter.drawEllipse(QPointF(tx, ty), self.pulse_radius, self.pulse_radius)

        # 2. Draw outer laser glow halo
        halo_pen = QPen(QColor(255, 50, 50, int(alpha * 0.3)), 1)
        painter.setPen(halo_pen)
        painter.setBrush(QBrush(QColor(255, 50, 50, int(alpha * 0.45))))
        painter.drawEllipse(QPointF(tx, ty), 12, 12)

        # 3. Draw core laser dot (bright magenta/red center)
        core_pen = QPen(QColor(255, 255, 255, alpha), 2)
        painter.setPen(core_pen)
        painter.setBrush(QBrush(QColor(255, 30, 80, alpha)))
        painter.drawEllipse(QPointF(tx, ty), 6, 6)

        # 4. Draw callout text tooltip box
        if self.label_text:
            painter.setFont(QFont("Segoe UI", 10, QFont.Weight.Bold))
            text_str = f"  🔍  {self.label_text}  "
            metrics = painter.fontMetrics()
            text_w = metrics.horizontalAdvance(text_str) + 16
            text_h = metrics.height() + 10

            # Position callout box slightly offset from target point
            box_x = tx + 18
            box_y = ty - text_h / 2
            
            # Clamp callout box to remain on-screen
            if box_x + text_w > self.width() - 10:
                box_x = tx - text_w - 18
            if box_y < 10:
                box_y = 10
            if box_y + text_h > self.height() - 10:
                box_y = self.height() - text_h - 10

            # Draw rounded background tooltip rectangle
            box_rect = QRectF(box_x, box_y, text_w, text_h)
            bg_brush = QBrush(QColor(20, 24, 38, int(alpha * 0.92)))
            border_pen = QPen(QColor(0, 220, 255, alpha), 2)
            painter.setPen(border_pen)
            painter.setBrush(bg_brush)
            painter.drawRoundedRect(box_rect, 8.0, 8.0)

            # Draw tooltip text
            text_pen = QPen(QColor(255, 255, 255, alpha))
            painter.setPen(text_pen)
            painter.drawText(box_rect, Qt.AlignmentFlag.AlignCenter, text_str)

        painter.end()
