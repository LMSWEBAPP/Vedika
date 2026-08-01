import os
import sys
import site

# Dynamically inject user site-packages to sys.path to resolve PIL and pywin32 IDE warnings
user_site = site.getusersitepackages()
if user_site not in sys.path:
    sys.path.insert(0, user_site)

import time
import webbrowser
import threading
import tkinter as tk
from tkinter import ttk
from PIL import Image, ImageTk
import win32gui
import win32process
import win32com.client
import pythoncom

# Configuration
SPRITE_FILE = "vedika.png"
WEBAPP_URL = "https://vyomanta.vercel.app/"
COLOR_KEY = "#010101"  # Transparent window color key

# SAPI Speech Recognition event handler class
class SpeechEvents:
    mascot = None
    def OnRecognition(self, StreamNumber, StreamPosition, RecognitionType, Result):
        try:
            reco_result = win32com.client.CastTo(Result, "ISpeechRecoResult")
            text = reco_result.PhraseInfo.GetText()
            if SpeechEvents.mascot:
                SpeechEvents.mascot.process_command(text)
        except Exception as ex:
            print("Voice event cast error:", ex)

class VedikaMascot:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("Vedika Mascot")
        
        # Window settings
        self.root.overrideredirect(True)  # Borderless
        self.root.attributes("-topmost", True)  # Always on top
        self.root.config(bg=COLOR_KEY)
        self.root.attributes("-transparentcolor", COLOR_KEY)
        
        # Dimensions and Position (bottom right of screen)
        self.sprite_width = 160
        self.sprite_height = 200
        screen_width = self.root.winfo_screenwidth()
        screen_height = self.root.winfo_screenheight()
        # Position slightly above taskbar
        self.x = screen_width - self.sprite_width - 30
        self.y = screen_height - self.sprite_height - 60
        self.root.geometry(f"{self.sprite_width}x{self.sprite_height}+{self.x}+{self.y}")
        
        # Load Sprite
        self.load_sprite()
        
        # Mascot state
        self.state = "idle"  # idle, coding, browsing, writing, speaking, listening
        self.status_bubble = None
        self.bubble_text = None
        self.input_entry = None
        
        # Speech Engine (TTS)
        self.tts_available = True
            
        # Drag and drop logic
        self.drag_data = {"x": 0, "y": 0}
        self.canvas.bind("<Button-1>", self.start_drag)
        self.canvas.bind("<B1-Motion>", self.drag)
        
        # Double click to type
        self.canvas.bind("<Double-Button-1>", self.toggle_input_field)
        
        # Right click menu
        self.menu = tk.Menu(self.root, tearoff=0, bg="#1E1E2E", fg="#F8FAFC", activebackground="#9B6EF8")
        self.menu.add_command(label="🚀 Open Vyomanta LMS", command=self.open_webapp)
        self.menu.add_command(label="💬 Talk to Vedika (Type)", command=self.show_input_field)
        self.menu.add_command(label="🎙️ Say Voice Command", command=self.speak_prompt)
        self.menu.add_separator()
        self.menu.add_command(label="❌ Dismiss Vedika", command=self.exit_mascot)
        self.canvas.bind("<Button-3>", self.show_context_menu)
        
        # Start Activity Tracker Loop
        self.tracking_thread = threading.Thread(target=self.activity_tracker_loop, daemon=True)
        self.tracking_thread.start()
        
        # Start Voice Recognition (SAPI5) in background thread
        self.speech_thread = threading.Thread(target=self.voice_recognition_loop, daemon=True)
        self.speech_thread.start()

        # Say greeting
        self.say("Hi! I'm Vedika. I'm here to study with you!")
        self.show_bubble("Hello! Ready to study?", duration=4000)

        self.root.mainloop()

    def load_sprite(self):
        try:
            img = Image.open(SPRITE_FILE)
            img = img.resize((self.sprite_width, self.sprite_height), Image.Resampling.LANCZOS)
            self.photo = ImageTk.PhotoImage(img)
        except Exception as e:
            print("Failed to load mascot image, generating simple canvas representation:", e)
            # Fallback simple visual
            self.photo = None
            
        self.canvas = tk.Canvas(self.root, width=self.sprite_width, height=self.sprite_height, bg=COLOR_KEY, highlightthickness=0)
        self.canvas.pack()
        
        if self.photo:
            self.canvas.create_image(self.sprite_width//2, self.sprite_height//2, image=self.photo)
        else:
            # Draw temporary placeholder astronaut
            self.canvas.create_oval(30, 30, 130, 130, fill="#FFFFFF", outline="#9B6EF8", width=3)
            self.canvas.create_oval(45, 45, 115, 100, fill="#111118") # Visor
            self.canvas.create_rectangle(50, 130, 110, 180, fill="#FFFFFF", outline="#9B6EF8", width=2)
            self.canvas.create_oval(75, 145, 85, 155, fill="#3B82F6") # Button

    # Drag and Drop Mechanics
    def start_drag(self, event):
        self.drag_data["x"] = event.x
        self.drag_data["y"] = event.y

    def drag(self, event):
        deltax = event.x - self.drag_data["x"]
        deltay = event.y - self.drag_data["y"]
        self.x = self.root.winfo_x() + deltax
        self.y = self.root.winfo_y() + deltay
        self.root.geometry(f"+{self.x}+{self.y}")

    def show_context_menu(self, event):
        try:
            self.menu.tk_popup(event.x_root, event.y_root)
        finally:
            self.menu.grab_release()

    # Context actions
    def open_webapp(self):
        self.say("Opening Vyomanta AI Tutor")
        self.show_bubble("Opening Vyomanta...", duration=3000)
        webbrowser.open(WEBAPP_URL)

    def exit_mascot(self):
        self.say("Goodbye! Have a great study session!")
        self.root.after(1000, self.root.destroy)

    # Speaking (TTS)
    def say(self, text):
        if not self.tts_available:
            return
        # Run TTS speaking in a separate thread so it doesn't block GUI
        def speak():
            try:
                pythoncom.CoInitialize()
                speaker = win32com.client.Dispatch("SAPI.SpVoice")
                voices = speaker.GetVoices()
                if voices.Count > 1:
                    speaker.Voice = voices.Item(1)  # Use female voice (usually Zira)
                speaker.Rate = 1
                speaker.Speak(text)
            except Exception as e:
                print("Speech error:", e)
        threading.Thread(target=speak, daemon=True).start()

    # Speech Bubble UI
    def show_bubble(self, text, duration=5000):
        # Close old bubble
        if self.status_bubble:
            self.status_bubble.destroy()
            self.status_bubble = None

        # Build bubble as a borderless transient window placed above mascot
        self.status_bubble = tk.Toplevel(self.root)
        self.status_bubble.overrideredirect(True)
        self.status_bubble.attributes("-topmost", True)
        self.status_bubble.config(bg="#1E1E2E")
        
        # Position bubble right above the mascot helmet
        bubble_x = self.x - 20
        bubble_y = self.y - 75
        self.status_bubble.geometry(f"200x60+{bubble_x}+{bubble_y}")
        
        # Label container with styled border/glow
        lbl_frame = tk.Frame(self.status_bubble, bg="#1E1E2E", highlightbackground="#9B6EF8", highlightthickness=1.5, bd=0)
        lbl_frame.pack(fill="both", expand=True)
        
        self.bubble_text = tk.Label(lbl_frame, text=text, fg="#F8FAFC", bg="#1E1E2E", font=("Outfit", 9, "bold"), wraplength=180, justify="center")
        self.bubble_text.pack(expand=True, fill="both", padx=8, pady=4)
        
        # Auto collapse bubble after duration
        if duration > 0:
            self.root.after(duration, self.close_bubble)

    def close_bubble(self):
        if self.status_bubble:
            self.status_bubble.destroy()
            self.status_bubble = None

    # Text Input Field Fallback
    def toggle_input_field(self, event=None):
        if self.input_entry:
            self.input_entry.destroy()
            self.input_entry = None
            self.close_bubble()
        else:
            self.show_input_field()

    def show_input_field(self):
        self.show_bubble("Type below & press Enter:", duration=0)
        
        # Place entry widget inside the bubble
        self.input_entry = ttk.Entry(self.status_bubble, font=("Consolas", 9))
        self.input_entry.pack(fill="x", padx=8, pady=4)
        self.input_entry.focus_set()
        self.input_entry.bind("<Return>", self.process_text_input)

    def process_text_input(self, event):
        text = self.input_entry.get().strip()
        self.input_entry.destroy()
        self.input_entry = None
        self.close_bubble()
        
        if text:
            self.process_command(text)

    # Activity mimicry loop
    def activity_tracker_loop(self):
        while True:
            try:
                # Retrieve active window name
                hwnd = win32gui.GetForegroundWindow()
                win_text = win32gui.GetWindowText(hwnd)
                
                # Simple heuristic mapping for mascot status
                new_state = "idle"
                status = "Floating in space..."
                
                # Check target processes
                win_lower = win_text.lower()
                if any(w in win_lower for w in ["code", "visual studio", "notepad", "sublime", "pycharm", "eclipse"]):
                    new_state = "coding"
                    status = "Writing lines of code..."
                elif any(w in win_lower for w in ["chrome", "firefox", "edge", "localhost", "vyomanta", "browser", "safari"]):
                    new_state = "browsing"
                    status = "Reviewing syllabus..."
                elif any(w in win_lower for w in ["word", "document", "excel", "sheet", "powerpoint", "pdf", "read"]):
                    new_state = "writing"
                    status = "Reading resources..."
                elif any(w in win_lower for w in ["discord", "slack", "teams", "whatsapp", "chat", "zoom"]):
                    new_state = "writing"
                    status = "Chatting with crew..."
                
                if new_state != self.state:
                    self.state = new_state
                    # Show state change notification briefly
                    self.root.after(0, lambda st=status: self.show_bubble(st, duration=3000))
                    
            except Exception as e:
                print("Activity tracker error:", e)
                
            time.sleep(4)

    # Command Router
    def process_command(self, phrase):
        phrase_clean = phrase.lower().strip()
        print(f"Processing mascot command: '{phrase_clean}'")
        
        # 1. Open WebApp Actions
        if any(cmd in phrase_clean for cmd in ["open our webapp", "open webapp", "open lms", "open ai tutor", "launch tutor", "open vyomanta"]):
            self.open_webapp()
            return
            
        # 2. Greetings
        if any(cmd in phrase_clean for cmd in ["hi", "hello", "hey", "greet"]):
            res = "Hello! I am Vedika. Your desktop study partner. What shall we learn?"
            self.say(res)
            self.root.after(0, lambda: self.show_bubble(res))
            return
            
        # 3. Casual conversation
        if any(cmd in phrase_clean for cmd in ["how are you", "how's it going", "how are you doing"]):
            res = "I am doing great! Floating at zero-gravity and ready to study."
            self.say(res)
            self.root.after(0, lambda: self.show_bubble(res))
            return
            
        if any(cmd in phrase_clean for cmd in ["what did you eat", "did you have breakfast", "have you eaten", "lunch", "dinner"]):
            res = "I consume Python scripts, HTML tags, and cosmic dust! No real breakfast for me."
            self.say(res)
            self.root.after(0, lambda: self.show_bubble(res))
            return
            
        if any(cmd in phrase_clean for cmd in ["what are we doing", "what are you doing"]):
            res = f"We are building Vyomanta LMS! Right now I am monitoring your active screen: {self.state} state."
            self.say(res)
            self.root.after(0, lambda: self.show_bubble(res))
            return

        if "say my name" in phrase_clean:
            res = "You are the head engineer of Vyomanta! Let's code!"
            self.say(res)
            self.root.after(0, lambda: self.show_bubble(res))
            return
            
        # Fallback - call Gemini API locally via lightweight request
        # Since we have the API key in environment or rotate keys, we can generate a friendly response.
        self.say("Let me think...")
        self.root.after(0, lambda: self.show_bubble("Thinking..."))
        
        threading.Thread(target=self.call_gemini_conversational, args=(phrase,), daemon=True).start()

    def call_gemini_conversational(self, prompt):
        try:
            # We can use the GEMINI_API_KEY environment variable directly
            api_key = os.environ.get("GEMINI_API_KEY")
            if not api_key:
                # try backup key
                api_key = os.environ.get("GEMINI_API_KEY_1")
            
            if not api_key:
                # Offline pre-scripted backup response
                res = "I am in offline mode. Let's head over to the Vyomanta web portal to chat deeply!"
                self.say(res)
                self.root.after(0, lambda: self.show_bubble(res))
                return
                
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
            headers = { "Content-Type": "application/json" }
            payload = {
                "contents": [{ "parts": [{ "text": prompt }] }],
                "systemInstruction": { "parts": [{ "text": "You are Vedika, a cute, helpful, friendly 2D astronaut desktop companion for Vyomanta LMS. Give extremely short, cute, motivational answers under 2 sentences." }] }
            }
            import requests
            response = requests.post(url, headers=headers, json=payload, timeout=8)
            if response.ok:
                data = response.json()
                reply = data.candidates[0].content.parts[0].text.strip()
                self.say(reply)
                self.root.after(0, lambda: self.show_bubble(reply))
            else:
                raise Exception("Gemini request failed")
        except Exception as e:
            print("Gemini conversational error:", e)
            res = "I'm having trouble connecting to space control. Let's resume studying!"
            self.say(res)
            self.root.after(0, lambda: self.show_bubble(res))

    # Voice Command Loop
    def voice_recognition_loop(self):
        pythoncom.CoInitialize()
        try:
            # Native SAPI speech recognition (shared)
            # Shared recognizer uses the default system microphone and user profile
            # Under the hood, this hooks to the Windows Speech Engine
            recognizer = win32com.client.Dispatch("SAPI.SpSharedRecognizer")
            context = recognizer.CreateRecoContext()
            grammar = context.CreateGrammar()
            grammar.DictationSetState(1) # Start listening
            
            # Bind events using win32com client mechanism
            # We poll messages for this background thread
            SpeechEvents.mascot = self
            win32com.client.WithEvents(context, SpeechEvents)
            
            print("SAPI Speech Recognition successfully loaded.")
            # Message pump for COM events
            while True:
                pythoncom.PumpWaitingMessages()
                time.sleep(0.2)
                
        except Exception as e:
            print("Native SAPI Speech Recognition could not initialize:", e)
            print("Mascot will run in touch/double-click text-input mode.")

    def speak_prompt(self):
        self.say("I am listening. Speak now.")
        self.show_bubble("Listening... Speak now.", duration=4000)

if __name__ == "__main__":
    # Ensure working directory is the script root
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    app = VedikaMascot()
