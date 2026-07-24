class State:
    def __init__(self, pet):
        self.pet = pet
        self.name = "state"
        self.animation_name = "idle"
        self.is_interruptible = True

    def enter(self):
        """Called when entering this state."""
        self.pet.sprite.play(self.animation_name)

    def update(self, dt):
        """Called every frame update. Returns a state name if transition is needed."""
        if self.pet.physics.is_static:
            return None
            
        # Generic check: if not grounded, fall!
        if not self.pet.physics.is_grounded and not self.pet.physics.is_dragging:
            return "fall"
        return None

    def exit(self):
        """Called when leaving this state."""
        pass


class IdleState(State):
    def __init__(self, pet):
        super().__init__(pet)
        self.name = "idle"
        self.animation_name = "idle"
        self.is_interruptible = True


class WalkLeftState(State):
    def __init__(self, pet):
        super().__init__(pet)
        self.name = "walk_left"
        self.animation_name = "run_right"
        self.is_interruptible = True
        self.walk_speed = -60.0

    def enter(self):
        super().enter()
        self.pet.sprite.is_flipped = True
        self.pet.physics.vx = self.walk_speed

    def update(self, dt):
        res = super().update(dt)
        if res:
            return res
        
        # Keep walking speed
        self.pet.physics.vx = self.walk_speed

        # If we hit left wall, transition to idle or turn
        if self.pet.physics.x <= 0:
            self.pet.physics.vx = 0
            return "idle"
        return None

    def exit(self):
        self.pet.physics.vx = 0.0


class WalkRightState(State):
    def __init__(self, pet):
        super().__init__(pet)
        self.name = "walk_right"
        self.animation_name = "run_right"
        self.is_interruptible = True
        self.walk_speed = 60.0

    def enter(self):
        super().enter()
        self.pet.sprite.is_flipped = False
        self.pet.physics.vx = self.walk_speed

    def update(self, dt):
        res = super().update(dt)
        if res:
            return res
            
        # Keep walking speed
        self.pet.physics.vx = self.walk_speed

        # If we hit right wall, transition to idle or turn
        if self.pet.physics.x >= self.pet.screen_w - self.pet.physics.width:
            self.pet.physics.vx = 0
            return "idle"
        return None

    def exit(self):
        self.pet.physics.vx = 0.0


class JumpState(State):
    def __init__(self, pet):
        super().__init__(pet)
        self.name = "jump"
        self.animation_name = "jump"
        self.is_interruptible = False
        self.jump_timer = 0.0

    def enter(self):
        super().enter()
        # Horizontal drift during jump if walking or random direction
        import random
        dir_choice = random.choice([-80.0, 0.0, 80.0])
        self.pet.physics.apply_impulse(dir_choice, -450.0)
        self.jump_timer = 0.0

    def update(self, dt):
        self.jump_timer += dt
        # Give a small buffer time in Jump before falling check
        if self.jump_timer > 0.1 and self.pet.physics.vy >= 0:
            return "fall"
        return None


class FallState(State):
    def __init__(self, pet):
        super().__init__(pet)
        self.name = "fall"
        self.animation_name = "jump"
        self.is_interruptible = False

    def enter(self):
        # We can play the fall frame (usually end of jump animation)
        super().enter()
        # Move animation playhead to the last frame of jumping
        anim = self.pet.sprite.current_animation
        if anim and len(anim.frames) > 0:
            anim.current_frame_index = len(anim.frames) - 1

    def update(self, dt):
        # When we hit ground, transition to landing state
        if self.pet.physics.is_grounded:
            return "landing"
        return None


class LandingState(State):
    def __init__(self, pet):
        super().__init__(pet)
        self.name = "landing"
        self.animation_name = "idle"
        self.is_interruptible = False
        self.landing_duration = 0.35
        self.timer = 0.0

    def enter(self):
        super().enter()
        self.timer = 0.0
        self.pet.physics.vx = 0.0

    def update(self, dt):
        self.timer += dt
        if self.timer >= self.landing_duration:
            is_voice_active = (
                hasattr(self.pet, 'main_app') and 
                hasattr(self.pet.main_app, 'gemini_client') and 
                self.pet.main_app.gemini_client and 
                self.pet.main_app.gemini_client.is_active
            )
            return "waiting" if is_voice_active else "idle"
        return None


class WaveState(State):
    def __init__(self, pet):
        super().__init__(pet)
        self.name = "wave"
        self.animation_name = "wave"
        self.is_interruptible = False

    def update(self, dt):
        anim = self.pet.sprite.current_animation
        if anim and anim.is_finished:
            is_speaking = (
                hasattr(self.pet, 'main_app') and 
                hasattr(self.pet.main_app, 'gemini_client') and 
                self.pet.main_app.gemini_client and 
                self.pet.main_app.gemini_client.is_speaking
            )
            if is_speaking:
                # Reset playhead to loop wave animation while speaking
                anim.current_frame_index = 0
                anim.is_finished = False
                return None
            
            is_voice_active = (
                hasattr(self.pet, 'main_app') and 
                hasattr(self.pet.main_app, 'gemini_client') and 
                self.pet.main_app.gemini_client and 
                self.pet.main_app.gemini_client.is_active
            )
            return "waiting" if is_voice_active else "idle"
        return None


class ReviewState(State):
    def __init__(self, pet):
        super().__init__(pet)
        self.name = "review"
        self.animation_name = "review"
        self.is_interruptible = False

    def update(self, dt):
        anim = self.pet.sprite.current_animation
        if anim and anim.is_finished:
            is_voice_active = (
                hasattr(self.pet, 'main_app') and 
                hasattr(self.pet.main_app, 'gemini_client') and 
                self.pet.main_app.gemini_client and 
                self.pet.main_app.gemini_client.is_active
            )
            if is_voice_active:
                # Loop review animation while voice chat is active (until model starts speaking/wave)
                anim.current_frame_index = 0
                anim.is_finished = False
                return None
            return "idle"
        return None


class FailedState(State):
    def __init__(self, pet):
        super().__init__(pet)
        self.name = "failed"
        self.animation_name = "failed"
        self.is_interruptible = False

    def update(self, dt):
        anim = self.pet.sprite.current_animation
        if anim and anim.is_finished:
            is_voice_active = (
                hasattr(self.pet, 'main_app') and 
                hasattr(self.pet.main_app, 'gemini_client') and 
                self.pet.main_app.gemini_client and 
                self.pet.main_app.gemini_client.is_active
            )
            return "waiting" if is_voice_active else "idle"
        return None


class WaitingState(State):
    def __init__(self, pet):
        super().__init__(pet)
        self.name = "waiting"
        self.animation_name = "waiting" if "waiting" in pet.sprite.animations else "idle"
        self.is_interruptible = True


class SleepState(State):
    def __init__(self, pet):
        super().__init__(pet)
        self.name = "sleep"
        self.animation_name = "sleep" if "sleep" in pet.sprite.animations else "waiting"
        self.is_interruptible = True


class ReadingState(State):
    def __init__(self, pet):
        super().__init__(pet)
        self.name = "reading"
        self.animation_name = "reading" if "reading" in pet.sprite.animations else "review"
        self.is_interruptible = True


class WorkingState(State):
    def __init__(self, pet):
        super().__init__(pet)
        self.name = "working"
        self.animation_name = "working" if "working" in pet.sprite.animations else "waiting"
        self.is_interruptible = True


class SearchingState(State):
    def __init__(self, pet):
        super().__init__(pet)
        self.name = "searching"
        self.animation_name = "searching" if "searching" in pet.sprite.animations else "review"
        self.is_interruptible = True


class KnockoutState(State):
    def __init__(self, pet):
        super().__init__(pet)
        self.name = "knockout"
        self.animation_name = "knockout" if "knockout" in pet.sprite.animations else "failed"
        self.is_interruptible = False


class MusicState(State):
    def __init__(self, pet):
        super().__init__(pet)
        self.name = "music"
        self.animation_name = "music" if "music" in pet.sprite.animations else "walk"
        self.is_interruptible = True


class DangerState(State):
    def __init__(self, pet):
        super().__init__(pet)
        self.name = "danger"
        self.animation_name = "danger" if "danger" in pet.sprite.animations else "failed"
        self.is_interruptible = False


class SpeakState(State):
    def __init__(self, pet):
        super().__init__(pet)
        self.name = "speak"
        self.animation_name = "speak" if "speak" in pet.sprite.animations else "wave"
        self.is_interruptible = False

    def update(self, dt):
        anim = self.pet.sprite.current_animation
        is_speaking = (
            hasattr(self.pet, 'main_app') and 
            hasattr(self.pet.main_app, 'gemini_client') and 
            self.pet.main_app.gemini_client and 
            self.pet.main_app.gemini_client.is_speaking
        )
        if is_speaking:
            if anim and anim.is_finished:
                anim.current_frame_index = 0
                anim.elapsed_time = 0.0
                anim.is_finished = False
            return None

        is_voice_active = (
            hasattr(self.pet, 'main_app') and 
            hasattr(self.pet.main_app, 'gemini_client') and 
            self.pet.main_app.gemini_client and 
            self.pet.main_app.gemini_client.is_active
        )
        if anim and anim.is_finished:
            return "waiting" if is_voice_active else "idle"
        return None


class TypingState(State):
    def __init__(self, pet):
        super().__init__(pet)
        self.name = "typing"
        self.animation_name = "typing" if "typing" in pet.sprite.animations else "working"
        self.is_interruptible = True


class StateMachine:
    def __init__(self, pet):
        self.pet = pet
        self.states = {
            "idle": IdleState(pet),
            "walk_left": WalkLeftState(pet),
            "walk_right": WalkRightState(pet),
            "jump": JumpState(pet),
            "fall": FallState(pet),
            "landing": LandingState(pet),
            "wave": WaveState(pet),
            "review": ReviewState(pet),
            "failed": FailedState(pet),
            "waiting": WaitingState(pet),
            "sleep": SleepState(pet),
            "reading": ReadingState(pet),
            "working": WorkingState(pet),
            "searching": SearchingState(pet),
            "knockout": KnockoutState(pet),
            "music": MusicState(pet),
            "danger": DangerState(pet),
            "speak": SpeakState(pet),
            "typing": TypingState(pet)
        }
        self.current_state = self.states["idle"]
        self.current_state.enter()

    def update(self, dt):
        next_state_name = self.current_state.update(dt)
        if next_state_name:
            self.change_state(next_state_name)

    def change_state(self, state_name):
        if state_name in self.states:
            # Prevent self-transitions to save on reload costs, unless forced
            if self.current_state.name == state_name and state_name not in ["jump", "wave", "failed", "searching", "knockout", "danger", "speak"]:
                return
            
            self.current_state.exit()
            self.current_state = self.states[state_name]
            self.current_state.enter()
            print(f"[StateMachine] Transitioned: {self.current_state.name}")
