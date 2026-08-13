# Module C: Voice Presentation HUD

**Module C** is a standalone, speech-activated visual presentation HUD that lets presenters deliver hands-free technical demos using the browser's Web Speech API and dynamic regex intent parsing.

---

## 🚀 Quick Start (Standalone Application)

To run **Module C** as an independent application:

```bash
# 1. Navigate to the module folder
cd "module c"

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

Open your browser at `http://localhost:5175` (or the URL output by Vite).

---

## 📦 Using Module C in Another Project

You can easily copy this `module c` folder into any React project and import the component directly.

### 1. Copy Files
Copy the `module c` folder (or `src/ModuleC_VoiceHUD.jsx` and `src/styles/`) into your new project.

### 2. Required Dependencies
Ensure your target project installs `lucide-react`:
```bash
npm install lucide-react
```

### 3. Component Usage
```jsx
import React from 'react';
import ModuleC_VoiceHUD from './module c/src/ModuleC_VoiceHUD';

export default function PresentationPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0F172A' }}>
      <ModuleC_VoiceHUD />
    </div>
  );
}
```

---

## 🎙️ Core Features

1. **Hands-Free Speech-to-Text Teleprompter**:
   - Real-time speech transcription using Web Speech API (`webkitSpeechRecognition` / `SpeechRecognition`).
   - Transient speech mode with automatic 1.8-second auto-clear timer on pause.

2. **Voice-Triggered Bullet Mode**:
   - Spoken commands like `"bullet"` or `"next bullet"` dynamically convert voice into structured bullet items.
   - Say `"end bullet"` to return to standard speech.

3. **Key Point & Hero Title Triggering**:
   - `"My project name [Title]"` -> Displays a glowing golden hero title card.
   - `"Key point [Text]"` -> Renders a glassmorphic key point card.
   - `"Highlight [Text]"` -> Highlights spoken phrase in animated gold pill typography.

4. **Architecture Diagram Popups**:
   - `"Module A Architecture"` -> Pops up Industrial IoT System Diagram SVG.
   - `"Module B Architecture"` -> Pops up EvalBridge System Diagram SVG.
   - `"Module C Architecture"` -> Pops up Voice HUD System Diagram SVG.
   - `"Clear screen"` -> Resets screen state.

---

## 📁 Directory Structure

```
module c/
├── package.json                   # Standalone project manifest & dependencies
├── vite.config.js                 # Vite dev server configuration
├── index.html                     # Entry HTML template with Google fonts
├── README.md                      # Setup & integration guide
├── docs/
│   └── VOICE_COMMANDS_CHEAT_SHEET.md # Voice command trigger cheat sheet
└── src/
    ├── main.jsx                   # Standalone React DOM root renderer
    ├── App.jsx                    # Standalone wrapper component
    ├── ModuleC_VoiceHUD.jsx       # Complete Voice HUD React Component
    ├── index.js                   # Library export index
    └── styles/
        ├── variables.css          # Color tokens and theme definitions
        └── voice.css              # Self-contained styles & animations
```

---

## 📄 License
MIT / Project License
