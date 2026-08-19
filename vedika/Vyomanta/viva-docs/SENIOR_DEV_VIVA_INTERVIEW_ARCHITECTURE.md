# Senior Developer Architecture Report: Voice AI Viva & Technical Interviewer

**Document Version:** 2.0  
**Target:** Production-Grade Voice AI Interviewer using Gemini Free-Tier APIs  
**Role:** AI Principal Architect / Senior Software Engineer  

---

## 1. Core Problem & Product Vision Alignment

### The Goal
Build a realistic, voice-first Viva & Technical Interview platform that:
1. **Ingests Context:** Parses student/candidate details — Resume (PDF/text), Target Job Description (JD), or Viva Experiment/Syllabus & Education Level.
2. **Acts as a Strict Examiner:** Conducts a realistic voice-driven interview. The AI **only asks questions** and conducts follow-ups. It **does NOT** answer its own questions or give away solutions during the interview.
3. **Records Performance:** Captures user responses, speech transcripts, timing, and multi-turn answers.
4. **Generates Comprehensive Post-Interview Scorecard:** Evaluates the complete transcript at the end, producing detailed grading, rubric breakdowns, strengths, critical misconceptions, and actionable improvement recommendations.
5. **Operates Efficiently on Free Gemini APIs:** Minimizes token usage, prevents rate-limit errors, and eliminates connection fragility.

---

## 2. Senior Architecture Design: State Machine & Data Flow

```mermaid
flowchart TD
    subgraph Phase 1: Intake & Context Parsing
        A1[User Uploads Resume / JD / Topic] --> A2[Client-Side Text/PDF Extraction]
        A2 --> A3[Generate Candidate Persona & Interview Blueprint]
    end

    subgraph Phase 2: Live Voice Interview Loop (Zero Explanations)
        A3 --> B1[State: INTERVIEW_ACTIVE]
        B1 --> B2[AI Examiner Asks Q_n via Voice]
        B2 --> B3[User Speaks / Records Answer]
        B3 --> B4[STT Captures Response & Appends to Session Buffer]
        B4 -->|Check Question Limit e.g. 5-8 Qs| B5{Is Interview Complete?}
        B5 -- No --> B6[AI Gives Brief Neutral Transition e.g. 'Got it, let us move to...']
        B6 --> B2
    end

    subgraph Phase 3: Final Batch Holistic Evaluation
        B5 -- Yes --> C1[State: EVALUATION_PENDING]
        C1 --> C2[Send Full Transcript to Gemini 2.5 Flash]
        C2 --> C3[Generate Structured JSON Rubric Scorecard]
        C3 --> C4[Render Performance Dashboard & Roadmap]
    end
```

---

## 3. How Senior Developers Implement Each Component

### A. Phase 1: Resume & Job Description Intake
* **PDF Parsing**: Perform text extraction directly in the client using `pdfjs-dist` (or server-side `pdf-parse`) to keep backend lightweight.
* **Blueprint Generation**: Instead of passing a 10-page raw resume on every chat turn, extract a 150-word **Interview Blueprint**:
  * Core skills claimed (e.g., React, SQL, Distributed Systems)
  * Notable projects or academic experiments
  * Target seniority or education level

---

### B. Phase 2: Strict "Examiner-Only" Voice Engine

#### Why Live WebSockets Fail on Free Tier vs. The Hybrid Senior Approach:
| Feature | Gemini Live WebSocket API | Hybrid Client-STT + REST Gemini (Recommended) |
| :--- | :--- | :--- |
| **Free-Tier Stability** | Drops connections, strictly limited concurrent sessions | **100% Stable**, works with standard HTTP key rotation |
| **Examiner Discipline** | Often talks too much, interrupts, or gives answers | **Strictly controllable** via deterministic system prompts |
| **Token & API Cost** | Continuously streams audio tokens (high rate-limit risk) | **Minimal token footprint** (only short text prompts) |
| **Audio Latency** | ~500ms | **Instantaneous** local speech capture + ~600ms Flash response |

#### The Recommended Senior Audio Stack:
1. **Speech-to-Text (STT)**: Native Web Speech API (`webkitSpeechRecognition`) with continuous mode or client-side Whisper.
2. **Text-to-Speech (TTS)**: High-quality Web Speech Synthesis (`window.speechSynthesis`) or lightweight Edge-TTS.
3. **Turn-Taking Control**:
   * AI speaks question $\to$ visual microphone indicator glows $\to$ user speaks $\to$ 2-second silence detector automatically triggers answer submission $\to$ next question is fetched.

#### The Examiner System Prompt (Enforcing No Spoon-Feeding):
```text
You are a formal, professional, and rigorous technical interviewer/viva examiner.
Candidate Context: {CANDIDATE_BLUEPRINT}
Current Question Index: {Q_INDEX} of {TOTAL_QUESTIONS}

RULES:
1. NEVER provide answers, hints, explanations, or solutions during this interview.
2. If the candidate answers poorly or asks for help, neutrally acknowledge ('Understood, let's proceed') and move to the next question.
3. If the candidate gives an interesting answer, you may ask ONE brief follow-up probing deeper.
4. Output strictly ONE question (maximum 2 sentences). No pleasantries or meta-commentary.
```

---

### C. Phase 3: Post-Interview Holistic Evaluation & Scoring

Instead of grading piece-by-piece after each answer (which breaks the conversational flow and consumes 5x more API quota), senior developers run a **single holistic evaluation call** at the end.

#### Evaluation Schema & Rubric:
Gemini evaluates the entire session transcript against a 5-dimension rubric:

```json
{
  "overallScore": 82,
  "letterGrade": "B+",
  "summaryCritique": "Strong grasp of core data structures, but struggled with distributed caching edge cases.",
  "rubricBreakdown": {
    "technicalAccuracy": { "score": 8, "weight": "35%", "feedback": "Accurate explanation of indexing." },
    "problemSolving": { "score": 7, "weight": "25%", "feedback": "Good initial approach, missed boundary conditions." },
    "communicationClarity": { "score": 9, "weight": "20%", "feedback": "Concise and articulate speech." },
    "depthAndCompleteness": { "score": 7, "weight": "20%", "feedback": "Could elaborate more on trade-offs." }
  },
  "perQuestionAnalysis": [
    {
      "questionNumber": 1,
      "question": "Explain how database B-Trees work.",
      "candidateAnswer": "They store data in sorted order with nodes.",
      "score": 7,
      "idealAnswer": "B-Trees are self-balancing search trees...",
      "keyGaps": "Did not mention disk block I/O optimization."
    }
  ],
  "strengths": ["Clear communication", "Solid fundamentals"],
  "criticalImprovements": ["Study Redis eviction policies", "Review error analysis formulas"],
  "recommendedStudyTopics": ["Database Internals", "Concurrency Control"]
}
```

---

## 4. Free-Tier Gemini API Optimization Strategy

1. **API Key Rotation Pool**: Store 3–5 Gemini API keys in `.env` (`GEMINI_API_KEY_1`, `GEMINI_API_KEY_2`, etc.) and rotate round-robin across requests to multiply free RPM allowances.
2. **Model Selection**: Use `gemini-2.5-flash` or `gemini-2.0-flash` (fastest latency, high accuracy, lowest token overhead).
3. **Payload Compression**: Send only raw conversation turns (`Q1, A1, Q2, A2`) in the final evaluation prompt without redundant HTML/styling data.
4. **Structured JSON Guarantee**: Use `responseMimeType: 'application/json'` on the evaluation call to prevent parsing errors.

---

## 5. Comparison: Current Codebase vs. Senior Architecture

| Aspect | Current Vyomanta Implementation | Senior Target Architecture |
| :--- | :--- | :--- |
| **Input Ingestion** | Fixed dropdowns + plain text JD box | **Resume PDF Upload + JD + Syllabus Extraction** |
| **Interview Experience** | Text box with manual submit button | **Continuous hands-free voice flow** (Voice in $\to$ Voice out) |
| **Examiner Persona** | Shows immediate grades & hints after every question | **Pure Examiner Mode** (Zero hints during session, 100% realistic) |
| **Scoring Model** | Single score per question | **Holistic 5-dimension rubric + Final Scorecard Report** |
| **API Efficiency** | 1 question call + 1 eval call per round (10 calls/session) | **5 lightweight question calls + 1 final batch eval call (6 calls/session)** |

---

## 6. Recommended Step-by-Step Implementation Roadmap

1. **Step 1 (Resume & JD Intake)**: Add a drag-and-drop PDF resume uploader using `pdfjs-dist` to summarize skills into the interview context.
2. **Step 2 (Voice Examiner State Machine)**: Implement a hands-free voice loop using `webkitSpeechRecognition` with auto-silence detection (2s timeout to proceed).
3. **Step 3 (Examiner Prompt Hardening)**: Ensure Gemini strictly generates next questions/probing follow-ups without giving answers.
4. **Step 4 (Final Holistic Evaluator)**: Create a unified `/api/viva-interview/finalize` endpoint that processes the entire transcript into a structured report card.
5. **Step 5 (Dashboard UI)**: Render radar charts (Technical, Communication, Problem Solving) and a PDF export of the final interview scorecard.
