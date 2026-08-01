import os
from PIL import Image
from PySide6.QtGui import QImage, QPixmap, QTransform, QImageReader
from PySide6.QtCore import Qt

# Increase Qt QImage allocation limit to 1024 MB (1 GB) for high-resolution companion spritesheets
QImageReader.setAllocationLimit(1024)

class SpriteLoader:
    @staticmethod
    def load_spritesheet(spritesheet_path, frame_w, frame_h, columns, rows):
        """
        Loads the spritesheet and cuts it into a cache of QPixmap frames.
        Also generates pre-flipped versions for facing direction changes.
        """
        native_pixmap = QPixmap()
        
        # Check if the file exists
        if os.path.exists(spritesheet_path):
            # Attempt to load with QPixmap directly
            loaded = native_pixmap.load(spritesheet_path)
            if not loaded or native_pixmap.isNull():
                # QPixmap might fail if Qt's webp plugin is missing. Fall back to Pillow.
                try:
                    pil_img = Image.open(spritesheet_path)
                    if pil_img.mode != "RGBA":
                        pil_img = pil_img.convert("RGBA")
                    data = pil_img.tobytes("raw", "RGBA")
                    qimg = QImage(data, pil_img.width, pil_img.height, QImage.Format.Format_RGBA8888)
                    native_pixmap = QPixmap.fromImage(qimg)
                except Exception as e:
                    print(f"[!] Pillow fallback loading failed: {e}")
                    # Fill with transparent fallback if Pillow fails
                    native_pixmap = QPixmap(frame_w * columns, frame_h * rows)
                    native_pixmap.fill(Qt.GlobalColor.transparent)
        else:
            print(f"[!] Spritesheet path {spritesheet_path} not found. Creating placeholder.")
            native_pixmap = QPixmap(frame_w * columns, frame_h * rows)
            native_pixmap.fill(Qt.GlobalColor.transparent)

        frames_cache = {}
        flipped_cache = {}

        sheet_w = native_pixmap.width()
        sheet_h = native_pixmap.height()

        for r in range(rows):
            for c in range(columns):
                x = c * frame_w
                y = r * frame_h

                if x + frame_w <= sheet_w and y + frame_h <= sheet_h:
                    rect = native_pixmap.copy(x, y, frame_w, frame_h)
                    frames_cache[(r, c)] = rect
                    
                    # Pre-cache horizontally flipped frame for facing directions
                    transform = QTransform().scale(-1, 1)
                    flipped_rect = rect.transformed(transform)
                    flipped_cache[(r, c)] = flipped_rect
                else:
                    # Create blank fallback frame if we run out of sheet dimensions
                    blank = QPixmap(frame_w, frame_h)
                    blank.fill(Qt.GlobalColor.transparent)
                    frames_cache[(r, c)] = blank
                    flipped_cache[(r, c)] = blank

        return frames_cache, flipped_cache


class Sprite:
    def __init__(self, frames_cache, flipped_cache, animations):
        """
        Manages the animations and returns the current QPixmap frame.
        """
        self.frames_cache = frames_cache
        self.flipped_cache = flipped_cache
        self.animations = animations  # Dict of Animation objects
        self.current_animation = None
        self.is_flipped = False  # False = Facing right, True = Facing left

    def play(self, animation_name):
        """Plays the selected animation if it exists."""
        if animation_name in self.animations:
            if self.current_animation != self.animations[animation_name]:
                self.current_animation = self.animations[animation_name]
                self.current_animation.restart()

    def update(self, dt):
        """Updates the active animation."""
        if self.current_animation:
            self.current_animation.update(dt)

    def get_current_pixmap(self):
        """Gets the QPixmap representing the current animation frame."""
        if not self.current_animation:
            return None
        
        row, col = self.current_animation.get_current_frame()
        
        if self.is_flipped:
            return self.flipped_cache.get((row, col))
        return self.frames_cache.get((row, col))
