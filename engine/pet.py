import os
from PySide6.QtMultimedia import QSoundEffect
from PySide6.QtCore import QUrl
from engine.animation import Animation
from engine.sprite import Sprite
from engine.physics import PhysicsEngine
from engine.state_machine import StateMachine
from engine.behavior import BehaviorEngine
from engine.interaction import InteractionManager
from engine.renderer import Renderer

class Pet:
    def __init__(self, pet_id, config, frames_cache, flipped_cache, asset_dir):
        """
        Orchestrator tying together Sprite, Physics, Behavior, State Machine, and UI.
        """
        self.id = pet_id
        self.config = config
        self.asset_dir = asset_dir

        # Read dimensions
        sprite_cfg = config.get("sprite", {})
        base_scale = float(config.get("scale", 1.0))
        self.width = max(32, int(sprite_cfg.get("width", 128) * base_scale))
        self.height = max(32, int(sprite_cfg.get("height", 128) * base_scale))

        # Screen boundaries (updated dynamically by transparent window)
        self.screen_w = 1920
        self.screen_h = 1080

        # Sound configuration
        self.sound_enabled = True
        self.loaded_sounds = {}

        # 1. Animations dictionary construction
        animations = {}
        for name, anim_cfg in config.get("animations", {}).items():
            animations[name] = Animation(
                name=name,
                fps=anim_cfg.get("fps", 8),
                loop=anim_cfg.get("loop", True),
                frames=anim_cfg.get("frames", [])
            )

        # 2. Sub-system instantiation
        self.sprite = Sprite(frames_cache, flipped_cache, animations)
        self.sprite.play(config.get("defaultAnimation", "idle"))

        self.physics = PhysicsEngine(width=self.width, height=self.height)
        self.state_machine = StateMachine(self)
        self.behavior = BehaviorEngine(self)
        self.behavior.load_probabilities(config.get("behavior", {}))
        self.interaction = InteractionManager(self)
        self.renderer = Renderer(self)

    def say(self, text, duration=2.5, user_text=None):
        """Triggers a text speech bubble (supports optional user_text for dual live chat subtitles)."""
        self.renderer.set_speech(text, duration, user_text=user_text)

    def set_dialogue(self, user_text, ai_text, duration=5.0):
        """Sets live dual-line subtitles for User and AI dialogue."""
        self.renderer.set_dialogue(user_text, ai_text, duration)

    def play_sound(self, sound_name):
        """
        Plays a sound effect from the pet's sounds/ folder offline.
        Supports .wav and .mp3. Fails gracefully if audio is unavailable.
        """
        if not self.sound_enabled:
            return

        # Scan for WAV or MP3 files
        sound_path = None
        for ext in ["wav", "mp3"]:
            test_path = os.path.join(self.asset_dir, "sounds", f"{sound_name}.{ext}")
            if os.path.exists(test_path):
                sound_path = os.path.abspath(test_path)
                break

        if not sound_path:
            if not hasattr(self, "_logged_missing_sounds"):
                self._logged_missing_sounds = set()
            if sound_name not in self._logged_missing_sounds:
                print(f"[Pet] Warning: Missing audio asset for sound '{sound_name}' under {os.path.join(self.asset_dir, 'sounds')}")
                self._logged_missing_sounds.add(sound_name)
            return

        try:
            if sound_path not in self.loaded_sounds:
                effect = QSoundEffect()
                effect.setSource(QUrl.fromLocalFile(sound_path))
                # Set a mild default volume so it is pleasant
                effect.setVolume(0.4)
                self.loaded_sounds[sound_path] = effect
            
            self.loaded_sounds[sound_path].play()
        except Exception as e:
            # Wrap to prevent crash if QtMultimedia bindings or backends are missing
            print(f"[!] Sound playback warning: {e}")

    def update(self, dt):
        """
        Drives the update tick of all underlying engine subsystems.
        """
        # 1. Update Physics
        self.physics.update(dt, self.screen_w, self.screen_h)

        # 2. Process State Machine logic and transitions
        self.state_machine.update(dt)

        # 3. Step active Animation frame
        self.sprite.update(dt)

        # 4. Run Behavior Scheduler
        self.behavior.update(dt)

        # 5. Tick down Speech Bubble timers
        self.renderer.update(dt)
