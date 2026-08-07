import io
from PySide6.QtWidgets import QApplication
from PySide6.QtCore import QBuffer, QIODevice, QObject, Slot
from PIL import Image

class ScreenCapturer(QObject):
    """
    Qt Main GUI Thread Screen Capturer.
    Safely captures desktop screen, downsamples to 768x432, compresses to JPEG @ 55% quality,
    and resolves the worker thread's asyncio.Future via loop.call_soon_threadsafe.
    """
    @Slot(object, object)
    def grab_screen_slot(self, future, loop):
        """Executed on Qt Main GUI Thread. Downsamples screen and resolves asyncio.Future."""
        print("[ScreenCapturer] Received grab_screen_slot signal on Qt Main Thread.")
        try:
            screen = QApplication.primaryScreen()
            if not screen:
                print("[ScreenCapturer] Error: No primary screen found.")
                if loop and not loop.is_closed():
                    loop.call_soon_threadsafe(future.set_result, b"")
                return

            # Process pending Qt GUI and OS window focus events to capture fresh frame
            QApplication.processEvents()
            
            # Grab primary desktop screenshot
            pixmap = screen.grabWindow(0)
            image = pixmap.toImage()

            buffer = QBuffer()
            buffer.open(QIODevice.ReadWrite)
            image.save(buffer, "PNG")
            png_bytes = bytes(buffer.data())
            buffer.close()

            # Downsample with Pillow (768x432 JPEG @ 55% quality for ultra-low token cost)
            with Image.open(io.BytesIO(png_bytes)) as img:
                img = img.convert("RGB")
                img.thumbnail((768, 432), Image.Resampling.LANCZOS)
                
                output_buffer = io.BytesIO()
                img.save(output_buffer, format="JPEG", quality=55, optimize=True)
                compressed_bytes = output_buffer.getvalue()
                print(f"[ScreenCapturer] Screen captured safely on Main Thread: {len(compressed_bytes) / 1024:.1f} KB")
                if loop and not loop.is_closed():
                    loop.call_soon_threadsafe(future.set_result, compressed_bytes)
        except Exception as e:
            print(f"[ScreenCapturer] Error capturing screen: {e}")
            if loop and not loop.is_closed():
                loop.call_soon_threadsafe(future.set_result, b"")
