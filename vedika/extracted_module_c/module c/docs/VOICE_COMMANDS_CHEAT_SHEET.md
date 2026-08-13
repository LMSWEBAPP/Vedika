# Module C: Voice Presentation HUD - Voice Triggers Cheat Sheet

This document contains all voice speech commands and presentation triggers supported by **Module C (Voice Presentation HUD)**.

---

## Real-Time Speech Processing & Teleprompter Canvas Flow

```
[Web Speech API (Browser Audio Stream)]
        |
        v
[Voice Command & Intent Parsing Engine]
        |
        +---> Trigger: "My project name [Title]"  => Renders Hero Project Title
        +---> Trigger: "Key point [Text]"         => Renders Glassmorphic Key Card
        +---> Trigger: "Bullet" / "Next bullet"   => Renders Persistent Bullet Item
        +---> Trigger: "Module A Architecture"   => Pops up Module A System SVG
        +---> Trigger: "Module B Architecture"   => Pops up Module B System SVG
        +---> Trigger: "Module C Architecture"   => Pops up Module C System SVG
        |
        v (Transient Speech)
[Teleprompter Presentation Canvas] (1.8s Silence Auto-Clear)
```

---

## Supported Voice Commands

| Intent | Voice Keyword / Command | Presentation Effect |
| :--- | :--- | :--- |
| **Start Canvas** | `"Start"` | Opens blank presentation canvas |
| **Project Title** | `"My project name [Title]"` | Renders Gold-Glow Hero Title Card |
| **Module A Diagram** | `"Module A Architecture"` or `"Module A"` | Pops up Module A System SVG Architecture |
| **Module B Diagram** | `"Module B Architecture"` or `"Module B"` | Pops up Module B System SVG Architecture |
| **Module C Diagram** | `"Module C Architecture"` or `"Module C"` | Pops up Module C System SVG Architecture |
| **Hide Diagram** | `"Hide architecture"` | Clears the active architecture diagram |
| **Bullet Points Mode** | `"Bullet"` or `"Next bullet"` | Enters Bullet Mode; spoken text populates bullet |
| **Exit Bullet Mode** | `"End bullet"` or `"Stop bullet"` | Exits Bullet Mode back to transient speech |
| **Key Point Card** | `"Key point [Text]"` or `"Main point [Text]"` | Renders a Glassmorphic Key Point Card |
| **Highlight Phrase** | `"Highlight [Phrase]"` or `"Bold [Phrase]"` | Renders phrase in Glowing Gold Pill typography |
| **Clear Screen** | `"Clear screen"` or `"Reset screen"` | Clears all text, cards, and diagrams |

---

## Browser Requirements
- **Google Chrome** or **Microsoft Edge** (requires standard Web Speech API support).
- Microphone permission allowed for the application origin.
