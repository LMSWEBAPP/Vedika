import random

class BehaviorEngine:
    def __init__(self, pet):
        self.pet = pet
        # Default probability table matching PRD Section 14
        self.probabilities = {
            "idle": 0.45,
            "walk": 0.25,
            "wave": 0.10,
            "jump": 0.05,
            "review": 0.10,
            "failed": 0.05
        }
        self.check_timer = 0.0
        self.inactivity_timer = 0.0
        self.evaluation_interval = 1.0  # Seconds between scheduler checks

    def load_probabilities(self, custom_probs):
        """Loads custom behavior weights from pet config."""
        if custom_probs:
            self.probabilities.update(custom_probs)

    def reset_inactivity(self):
        """Resets inactivity timer and wakes pet if sleeping."""
        self.inactivity_timer = 0.0
        if self.pet and hasattr(self.pet, 'state_machine'):
            if self.pet.state_machine.current_state.name == "sleep":
                self.pet.state_machine.change_state("idle")

    def update(self, dt):
        """
        Periodically checks and triggers state choices.
        """
        # If static, currently being dragged, or physics is not grounded, skip behavior choices
        if self.pet.physics.is_static or self.pet.physics.is_dragging or not self.pet.physics.is_grounded:
            return

        # Suspend random autonomous behavior transitions if Gemini voice chat is active
        is_voice_active = (
            hasattr(self.pet, 'main_app') and 
            hasattr(self.pet.main_app, 'gemini_client') and 
            self.pet.main_app.gemini_client and 
            self.pet.main_app.gemini_client.is_active
        )
        if is_voice_active:
            self.inactivity_timer = 0.0
            return

        # Check for long-term inactivity -> sleep transition (after 25 seconds of no activity)
        self.inactivity_timer += dt
        if self.inactivity_timer >= 25.0:
            if "sleep" in self.pet.sprite.animations and self.pet.state_machine.current_state.name != "sleep":
                self.pet.state_machine.change_state("sleep")
                return

        self.check_timer += dt
        if self.check_timer >= self.evaluation_interval:
            self.check_timer = 0.0
            
            # Only trigger random changes if the current state allows interruption
            if self.pet.state_machine.current_state.is_interruptible:
                next_state = self.choose_next_state()
                if next_state:
                    self.pet.state_machine.change_state(next_state)

    def choose_next_state(self):
        """
        Determines the next state. Exposes a clean interface that can
        be overridden or hooked by an AI module in the future.
        """
        states = list(self.probabilities.keys())
        weights = list(self.probabilities.values())
        
        # Weighted random choice
        chosen = random.choices(states, weights=weights, k=1)[0]
        
        # Map abstract choice to concrete state machine keys
        if chosen == "walk":
            # Decide direction
            return random.choice(["walk_left", "walk_right"])
        elif chosen == "idle":
            # Decide between idle breathing or waiting
            return random.choices(["idle", "waiting"], weights=[0.8, 0.2], k=1)[0]
            
        return chosen
