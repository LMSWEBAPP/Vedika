import time
import math
import random

class InteractionManager:
    def __init__(self, pet):
        self.pet = pet
        self.last_global_pos = None
        self.last_time = 0.0
        self.drag_vx = 0.0
        self.drag_vy = 0.0

    def handle_hover(self, global_cursor_x, global_cursor_y):
        """
        Turns the pet toward the cursor position when in an interruptible state.
        """
        if self.pet.state_machine.current_state.is_interruptible:
            pet_center_x = self.pet.physics.x + self.pet.physics.width / 2
            if global_cursor_x < pet_center_x:
                self.pet.sprite.is_flipped = True
            else:
                self.pet.sprite.is_flipped = False

    def handle_press(self, global_x, global_y):
        """
        Bypasses physics and registers click offset.
        """
        if hasattr(self.pet, 'behavior'):
            self.pet.behavior.reset_inactivity()

        # Interrupt active Gemini speech instantly if user clicks on the pet
        if hasattr(self.pet, 'main_app') and hasattr(self.pet.main_app, 'gemini_client'):
            if self.pet.main_app.gemini_client.is_speaking:
                print("[Interaction] User clicked pet while Gemini speaking -> Triggering instant interruption.")
                self.pet.main_app.gemini_client.is_speaking = False
                self.pet.main_app.gemini_client.interrupted.emit()
                return

        self.pet.physics.start_drag()
        self.last_global_pos = (global_x, global_y)
        self.last_time = time.time()
        self.drag_vx = 0.0
        self.drag_vy = 0.0

        # Smile/reaction speech
        quotes = [
            "Hi there! 😊",
            "Bzz? ⚡",
            "EVE! 🤖",
            "Checking in...",
            "Need anything? 🚀"
        ]
        self.pet.say(random.choice(quotes), duration=2.0)
        self.pet.play_sound("click")

    def handle_drag(self, global_x, global_y):
        """
        Updates window position and tracks instantaneous velocity.
        """
        if not self.pet.physics.is_dragging:
            return

        now = time.time()
        dt = now - self.last_time
        self.last_time = now

        # Update position directly
        self.pet.physics.x = float(global_x)
        self.pet.physics.y = float(global_y)

        # Track velocity for momentum throws
        if dt > 0.001 and self.last_global_pos:
            dx = global_x - self.last_global_pos[0]
            dy = global_y - self.last_global_pos[1]
            
            # Damp and smooth velocity calculations
            instant_vx = dx / dt
            instant_vy = dy / dt
            self.drag_vx = self.drag_vx * 0.6 + instant_vx * 0.4
            self.drag_vy = self.drag_vy * 0.6 + instant_vy * 0.4

        self.last_global_pos = (global_x, global_y)

    def handle_release(self):
        """
        Releases the pet. If velocity is high, triggers a fling!
        """
        if not self.pet.physics.is_dragging:
            return

        speed = math.sqrt(self.drag_vx**2 + self.drag_vy**2)

        # Threshold to qualify as a throw (e.g. 200 pixels/sec)
        if speed > 250.0:
            # Cap maximum throw velocity to avoid losing pet off screen
            cap_vx = max(-1200.0, min(1200.0, self.drag_vx))
            cap_vy = max(-1000.0, min(1000.0, self.drag_vy))
            
            self.pet.physics.end_drag(cap_vx, cap_vy)
            self.pet.state_machine.change_state("fall")
            self.pet.say("Wheeeee! 💨", duration=2.5)
            self.pet.play_sound("fling")
        else:
            # Gentle drop / simple click
            self.pet.physics.end_drag(0.0, 0.0)
            if hasattr(self.pet, 'main_app') and self.pet.main_app:
                self.pet.main_app.cycle_animation()
            else:
                self.pet.state_machine.change_state("fall")

        self.last_global_pos = None

    def handle_double_click(self):
        """Double click gesture toggles voice chat session."""
        if hasattr(self.pet, 'main_app') and self.pet.main_app:
            self.pet.main_app.toggle_voice_chat()
