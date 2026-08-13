import os
import json
import random
import datetime

PROFILE_FILE = "user_profile.json"

DEFAULT_PROFILE = {
    "user": {
        "name": "Alex",
        "stage": "College",  # "School", "College", "PG"
        "field_of_study": "Computer Science & Artificial Intelligence",
        "hobbies": ["Coding", "Robotics", "Reading Tech Blogs"],
        "personality_template": "Friendly Mentor & Study Companion"
    },
    "learned_traits": {
        "favorite_topics": ["Python", "AI Models", "Web Design"],
        "recent_activities": [],
        "conversational_notes": []
    },
    "last_interaction": {
        "timestamp": "",
        "topic": ""
    }
}

class UserProfileManager:
    def __init__(self, filepath=PROFILE_FILE):
        self.filepath = filepath
        self.profile = self.load_profile()

    def load_profile(self):
        if os.path.exists(self.filepath):
            try:
                with open(self.filepath, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    merged = DEFAULT_PROFILE.copy()
                    merged.update(data)
                    return merged
            except Exception as e:
                print(f"[UserProfileManager] Error reading {self.filepath}: {e}")
        
        self.save_profile(DEFAULT_PROFILE)
        return DEFAULT_PROFILE

    def save_profile(self, data=None):
        if data is None:
            data = self.profile
        try:
            with open(self.filepath, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
            self.profile = data
        except Exception as e:
            print(f"[UserProfileManager] Failed to save profile: {e}")

    def update_user_info(self, stage=None, field_of_study=None, hobbies=None, name=None):
        user = self.profile.get("user", {})
        if stage:
            user["stage"] = stage
        if field_of_study:
            user["field_of_study"] = field_of_study
        if hobbies is not None:
            user["hobbies"] = hobbies if isinstance(hobbies, list) else [hobbies]
        if name:
            user["name"] = name
        self.profile["user"] = user
        self.save_profile()

    def generate_dynamic_greeting(self):
        """Generates a dynamic, context-aware greeting and conversation starter based on time of day,
        user stage, field of study, and hobbies."""
        user = self.profile.get("user", {})
        name = user.get("name", "there")
        stage = user.get("stage", "College")
        field = user.get("field_of_study", "your studies")
        hobbies = user.get("hobbies", ["learning"])
        hobby = random.choice(hobbies) if hobbies else "your hobbies"

        now = datetime.datetime.now()
        hour = now.hour

        if 5 <= hour < 12:
            time_greeting = "Good morning"
            starters = [
                f"Ready to conquer today's {field} topics?",
                f"How's your morning starting out? Got any exciting {field} projects today?",
                f"Hope you had a great sleep! What's on your agenda today for {stage}?",
                f"Morning! Ready for a productive session today?"
            ]
        elif 12 <= hour < 17:
            time_greeting = "Good afternoon"
            starters = [
                f"How did your {stage} classes go today?",
                f"What interesting things have you learned or worked on today in {field}?",
                f"Taking a quick study break? How's the day treating you?",
                f"Hey! Did you get a chance to work on any {hobby} projects today?"
            ]
        elif 17 <= hour < 22:
            time_greeting = "Hey, good evening"
            starters = [
                f"How was your day at {stage}? What was the highlight?",
                f"Winding down for the day? Have you had time for {hobby} today?",
                f"Hey! What's been on your mind today regarding {field}?",
                f"How's your evening going? Need any help reviewing today's study topics?"
            ]
        else:
            time_greeting = "Hey there, working late"
            starters = [
                f"Night owl session on {field}? Don't forget to take rests!",
                f"Burning the midnight oil for {stage}? How can I help you out?",
                f"Late night coding or studying? What are we working on right now?",
                f"Still awake! What cool idea or topic are you exploring tonight?"
            ]

        greeting_prefix = random.choice([
            f"{time_greeting}, {name}!",
            f"Hey {name}! {time_greeting}.",
            f"Hi {name}! Vedika here.",
            f"Welcome back {name}!"
        ])
        
        starter = random.choice(starters)
        
        self.profile["last_interaction"] = {
            "timestamp": now.isoformat(),
            "topic": field
        }
        self.save_profile()

        return f"{greeting_prefix} {starter}"

    def get_system_instruction_context(self):
        """Builds persona system context string for Gemini Live API."""
        user = self.profile.get("user", {})
        learned = self.profile.get("learned_traits", {})

        return (
            f"\n\n[USER PROFILE CONTEXT]\n"
            f"- User Name: {user.get('name', 'Friend')}\n"
            f"- Stage/Level: {user.get('stage', 'College')} student\n"
            f"- Field of Study: {user.get('field_of_study', 'Computer Science')}\n"
            f"- Key Hobbies: {', '.join(user.get('hobbies', []))}\n"
            f"- Favorite Topics: {', '.join(learned.get('favorite_topics', []))}\n"
            f"- Personality Role: {user.get('personality_template', 'Friendly Mentor')}. "
            f"Be conversational, engaging, proactive, and talk like a smart peer and mentor. "
            f"Adapt your tone to their stage ({user.get('stage', 'College')}) and field of interest.\n"
        )
