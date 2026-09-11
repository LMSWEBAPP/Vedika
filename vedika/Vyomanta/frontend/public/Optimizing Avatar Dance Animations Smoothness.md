## User

donot write any code first analyse the frontend code and tell how to optimize the avatars in the does-not-exist.jsx page they have a few dance moves i need them to be smooth and slow and neat at present they are clumsy and messy so what to do check and tell me thats it dont write any code

## Assistant

I’ll inspect the frontend structure and locate `does-not-exist.jsx`, then trace how the avatars and their dance animations are implemented so I can give you a focused optimization plan without changing any files.

**Tool Call: No matches**
Status: Completed

```json
{
  "offset": 0,
  "current_matches_page": [],
  "all_matches_len": 0
}
```

**Tool Call: Search files for regex `avatar|dance|does-not-exist`**
Status: Completed

file:///C:/Users/25002/Desktop/V0.1/Vedika/grok-avatar-studio/server.js#L41:45

```
server.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`🚀 Grok Avatar Creator Studio is running live at:`);
  console.log(`👉 http://localhost:${PORT}`);
  console.log(`==================================================\n`);
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/2d-avatar-testing/2d-avatar-testing.css#L1:11

```
/* 2D Avatar Testing Page Styles */
.bloub-test-container {
  min-height: 100vh;
  background: radial-gradient(circle at 50% 20%, #151620 0%, #08080c 70%, #030305 100%);
  color: #f1f5f9;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 24px 80px 24px;
  box-sizing: border-box;
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/2d-avatar-testing/page.jsx#L3:10

```
import React, { useState } from 'react';
import Link from 'next/link';
import BloubAvatar from '../../components/BloubAvatar';
import { EXPRESSIONS } from '../../lib/bloub/expressions.js';
import { STATES } from '../../lib/bloub/states.js';
import './2d-avatar-testing.css';

const PAPERS = [
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/2d-avatar-testing/page.jsx#L28:36

```
        <div className="bloub-badge">
          <span className="bloub-badge-dot"></span>
          Bloub 2D Avatar Animation Engine
        </div>
        <h1 className="bloub-title">2D Avatar Expression Testing</h1>
        <p className="bloub-subtitle">
          Pure geometric SVG avatar engine with smooth vector morphing, organic breathing, and gaze tracking.
          Circle silhouette with black fill (<code>#000000</code>) and seamless eye cutouts.
        </p>
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/2d-avatar-testing/page.jsx#L45:49

```
          <div className="bloub-card-glow"></div>
          <div className="bloub-master-card-inner">
            <BloubAvatar
              size={300}
              shape={null} /* circle */
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/2d-avatar-testing/page.jsx#L165:169

```
                style={{ backgroundColor: currentPaper.cardBg }}
              >
                <BloubAvatar
                  size={100}
                  shape={null}
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/api/generate-aptitude/route.js#L162:176

```
    const avoidQuestions = Array.isArray(body.avoidQuestions) ? body.avoidQuestions : [];

    let domainGuidance = "";
    if (category === 'Quantitative Aptitude' || topic.match(/math|interest|work|speed|profit|percentage|algebra|ratio|geometry/i)) {
      domainGuidance = `You are a Senior Quantitative Aptitude Examiner. Ensure exact mathematical correctness. Wrap mathematical expressions in LaTeX dollar signs (e.g. $x^2 + 5x = 0$). Double-escape all backslashes in JSON (e.g. \\\\text, \\\\frac).`;
    } else if (category === 'Logical Reasoning' || topic.match(/logic|puzzle|blood|relation|seating|coding|series|syllogism|analogy|cube|dice/i)) {
      domainGuidance = `You are a Senior Logical Reasoning Examiner for Placement Exams. Generate high-quality logical puzzles, seating arrangements, blood relations, or series. Ensure logic is 100% sound and unambiguous.`;
    } else if (category === 'Verbal Ability' || topic.match(/verbal|english|grammar|synonym|reading|comprehension|jumble|idiom/i)) {
      domainGuidance = `You are a Senior Verbal Ability Examiner. For Reading Comprehension, provide a short concise passage followed by a question. For Grammar/Vocabulary, provide clear contexts.`;
    } else if (category === 'CS & Technical Fundamentals' || topic.match(/sql|programming|python|c\+\+|java|oops|dbms|os|network|pseudocode|code/i)) {
      domainGuidance = `You are a Senior Computer Science Technical Interviewer. Generate questions on CS fundamentals, SQL queries, pseudocode analysis, or code output prediction. Wrap code in markdown code blocks.`;
    } else {
      domainGuidance = `You are an Expert Placement & Aptitude Assessment Specialist. Generate a clear and challenging question on the specified topic.`;
    }

```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/api/generate-aptitude/route.js#L181:185

```
    }

    const systemInstruction = `${domainGuidance}
Your task is to generate ONE realistic, concise, high-quality question for Placement Exams on topic "${topic}".
Strictly return ONLY a JSON object matching this exact schema:
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/api/labs/tutor/route.js#L76:84

```
PEDAGOGICAL & VIVA VOCE PROTOCOL
===================================================================
You are conducting viva voce examination and real-time guidance for this experiment.
When answering student questions—especially when answering a designated Viva Question (such as Q1, Q2, Q3...):
1. **Direct Viva Answer**: Provide a concise, clear, definitive scientific conclusion in the opening sentences.
2. **Scientific & Mathematical Principle**: Clearly explain the underlying mechanisms using the governing formulas (${expFormulas.join(', ') || 'governing scientific laws'}). Detail cause-and-effect relationships (e.g. how altering one variable changes the dependent parameters).
3. **Simulation Experiment Guidance**: Detail exactly what the student should adjust, connect, or observe in the interactive simulation canvas right now (e.g. which sliders, meters, components, or probes to toggle) to empirically verify this answer!
4. **Comprehension Check**: End with a short, thought-provoking follow-up question to test their conceptual depth.

```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/api/labs/tutor/route.js#L91:95

```
    let formattedUserPrompt = query;
    if (vivaQuestion) {
      formattedUserPrompt = `[Viva Voce Question ${questionIndex ? `Q${questionIndex}` : ''}]: "${vivaQuestion}"\n\nAs my Senior Lab Tutor, please provide the complete viva answer, theoretical derivation using the experiment's formulas, and exact step-by-step guidance on how to verify this in the interactive simulation.`;
    }

```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/avatar-blob/avatar-blob.css#L1:3

```
/* ═══════════════════════════════════════════════════════════════
   Avatar Blob Experimental Physics Laboratory CSS
   ═══════════════════════════════════════════════════════════════ */
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/avatar-blob/avatar-blob.css#L254:261

```
}

/* Avatar Swatches */
.blob-avatar-swatches {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/avatar-blob/avatar-blob.css#L383:385

```
/* ═══════════════════════════════════════════════════════════════
   Avatar Texture & Fur Studio Styling
   ═══════════════════════════════════════════════════════════════ */
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/avatar-blob/page.jsx#L22:29

```
  Wind
} from 'lucide-react';
import './avatar-blob.css';

// ── 4 Reference Avatars matching user photo (media_1788769466961.png) ──
const AVATARS = [
  { 
    id: 'mowgli', 
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/avatar-blob/page.jsx#L35:39

```
    irisColor: '#0d9488',
    quote: 'Hey there! 👋',
    texture: '/avatar_1_purple.webp' 
  },
  { 
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/avatar-blob/page.jsx#L46:50

```
    irisColor: '#1d4ed8',
    quote: 'What shall we build today? 💡',
    texture: '/avatar_2_lime.webp' 
  },
  { 
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/avatar-blob/page.jsx#L57:61

```
    irisColor: '#a21caf',
    quote: 'Puzzles? I love a good challenge! 🧩',
    texture: '/avatar_3_red.webp' 
  },
  { 
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/avatar-blob/page.jsx#L68:72

```
    irisColor: '#92400e',
    quote: "Let's go on an adventure! ✨",
    texture: '/avatar_4_blue.webp' 
  },
];
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/avatar-blob/page.jsx#L364:368

```
}

export default function AvatarBlobLaboratory() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/avatar-blob/page.jsx#L398:402

```
    simSpeed: 1.0,
    wireframe: false,
    selectedAvatar: 'mowgli',
    textureStyle: 'smooth-velvet',
    bumpScale: 0.018,
```


## Assistant

<thinking>
**Checking file names**

I think I need to be careful with the filename because it seems there’s no exact due. This means it’s possible something is off, or perhaps it’s named differently than I expect. I should definitely make a list of directories to clarify what’s going on. Making sure I've checked all possible names could help me find what I need! Let's look into that now.
</thinking>

The exact filename is not present under that spelling, so I’m narrowing the search to likely “does not exist” routes and the avatar component/animation files. This will distinguish whether the clumsiness comes from animation timing, CSS transforms, frame logic, or the avatar assets themselves.

**Tool Call: 50 matches**
Status: Completed

file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app

file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/2d-avatar-testing

file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/2d-avatar-testing/2d-avatar-testing.css

file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/2d-avatar-testing/page.jsx

file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/admin

file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/admin/alerts

file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/admin/alerts/page.jsx

file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/admin/assignments

file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/admin/assignments/page.jsx

file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/admin/batches

file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/admin/batches/page.jsx

file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/admin/certs

file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/admin/certs/page.jsx

file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/admin/courses

file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/admin/courses/[id]

file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/admin/courses/[id]/page.jsx

file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/admin/courses/page.jsx

file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/admin/jobs

file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/admin/jobs/page.jsx

file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/admin/login

file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/admin/login/page.jsx

file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/admin/page.jsx

file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/admin/quizzes

file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/admin/quizzes/page.jsx

file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/admin/search

file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/admin/search/page.jsx

file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/admin/statistics

file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/admin/statistics/page.jsx

file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/api

file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/api/admin

file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/api/admin/api-consumption

file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/api/admin/api-consumption/route.js

file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/api/admin/courses

file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/api/admin/courses/import

file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/api/admin/courses/import/route.js

file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/api/auth

file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/api/auth/jwt

file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/api/auth/jwt/route.js

file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/api/auth/ws-token

file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/api/auth/ws-token/route.js

file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/api/code-puzzle

file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/api/code-puzzle/generate

file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/api/code-puzzle/generate/route.js

file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/api/code-puzzle/validate

file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/api/code-puzzle/validate/route.js

file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/api/documents

file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/api/documents/attach

file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/api/documents/attach/route.js

file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/api/documents/delete

file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/api/documents/delete/route.js

**Tool Call: Search files for regex `does.?not.?exist|not.?found|404|dance|dancing|keyframes|animation:|requestAnimationFrame|motion|framer`**
Status: Completed

file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/2d-avatar-testing/2d-avatar-testing.css#L55:62

```
.bloub-badge-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #38bdf8;
  box-shadow: 0 0 10px #38bdf8;
  animation: bloub-pulse 2s infinite ease-in-out;
}
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/2d-avatar-testing/2d-avatar-testing.css#L64:67

```
@keyframes bloub-pulse {
  0%, 100% { opacity: 0.4; transform: scale(0.9); }
  50% { opacity: 1; transform: scale(1.15); }
}
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/admin/alerts/page.jsx#L143:150

```
          <div style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            border: `2px solid ${T.border}`,
            borderTopColor: T.purple,
            animation: 'spin 1s linear infinite'
          }} />
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/admin/assignments/page.jsx#L380:387

```
          <div style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: '2px solid rgba(155, 110, 248, 0.2)',
            borderTopColor: T.purple,
            animation: 'spin 1s linear infinite'
          }} />
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/admin/assignments/page.jsx#L648:650

```
                        <>
                          <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Evaluating...
                        </>
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/admin/batches/page.jsx#L166:173

```
          <div style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: '2px solid rgba(155, 110, 248, 0.2)',
            borderTopColor: T.purple,
            animation: 'spin 1s linear infinite'
          }} />
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/admin/certs/page.jsx#L172:179

```
          <div style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            border: `2px solid ${T.border}`,
            borderTopColor: T.purple,
            animation: 'spin 1s linear infinite'
          }} />
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/admin/courses/[id]/page.jsx#L10:14

```
import { getCourses, getCourseSyllabus, saveCourseSyllabus } from '@/lib/frappe';
import { useMediaQuery, isMobileMQ } from '@/lib/useMediaQuery';
import { motion, AnimatePresence } from 'framer-motion';

export default function CourseOutlinePage() {
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/admin/courses/[id]/page.jsx#L370:373

```
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
          <div style={{ fontSize: 14, color: 'var(--muted)' }}>Loading syllabus builder...</div>
        </div>
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/admin/courses/[id]/page.jsx#L509:519

```
                      {expanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: 'easeInOut' }}
                          style={{ overflow: 'hidden' }}
                        >
                          <div style={{ padding: '4px 0' }}>
                            {chapter.lessons.length === 0 ? (
                              <div style={{ padding: '20px 24px', color: T.muted, fontSize: 12.5, textAlign: 'center' }}>
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/admin/courses/[id]/page.jsx#L573:577

```
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/admin/courses/[id]/page.jsx#L1081:1086

```
        <div style={{
          position: 'fixed', bottom: 24, right: 24, background: T.green, color: '#000',
          padding: '12px 24px', borderRadius: 8, fontSize: 13.5, fontWeight: 700,
          boxShadow: '0 8px 24px rgba(34, 197, 160, 0.25)', zIndex: 10000,
          animation: 'card-enter 0.3s ease'
        }}>
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/admin/jobs/page.jsx#L152:159

```
          <div style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: '2px solid rgba(155, 110, 248, 0.2)',
            borderTopColor: T.purple,
            animation: 'spin 1s linear infinite'
          }} />
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/admin/quizzes/page.jsx#L228:235

```
          <div style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: '2px solid rgba(155, 110, 248, 0.2)',
            borderTopColor: T.purple,
            animation: 'spin 1s linear infinite'
          }} />
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/admin/search/page.jsx#L169:179

```
          <div style={{
            position: 'absolute',
            right: 16,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 18,
            height: 18,
            borderRadius: '50%',
            border: `2px solid ${T.border}`,
            borderTopColor: T.purple,
            animation: 'spin 0.8s linear infinite'
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/admin/statistics/page.jsx#L268:275

```
          <div style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: `2px solid ${T.border}`,
            borderTopColor: T.purple,
            animation: 'spin 1s linear infinite'
          }} />
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/api/admin/courses/import/route.js#L18:21

```
  } catch (error) {
    console.error("Failed to read sample syllabus CSV file:", error);
    return new Response("Template file not found", { status: 404 });
  }
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/api/documents/attach/route.js#L34:37

```
      if (docContexts.length === 0) {
        await connection.rollback();
        return NextResponse.json({ error: 'Document not found.' }, { status: 404 });
      }
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/api/documents/delete/route.js#L35:37

```
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Document not found.' }, { status: 404 });
    }
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/api/documents/status-stream/route.js#L76:82

```
      } else {
        await writer.write(encoder.encode(`data: ${JSON.stringify({ status: 'not_found' })}\n\n`));
        clearInterval(intervalId);
        try {
          writer.close();
        } catch (e) {}
      }
```


**Tool Call: List the `V0.1/Vedika/vedika/Vyomanta/frontend` directory's contents**
Status: Completed

# Folders:
V0.1\Vedika\vedika\Vyomanta\frontend\.next
V0.1\Vedika\vedika\Vyomanta\frontend\app
V0.1\Vedika\vedika\Vyomanta\frontend\components
V0.1\Vedika\vedika\Vyomanta\frontend\hooks
V0.1\Vedika\vedika\Vyomanta\frontend\lib
V0.1\Vedika\vedika\Vyomanta\frontend\node_modules
V0.1\Vedika\vedika\Vyomanta\frontend\public
V0.1\Vedika\vedika\Vyomanta\frontend\scratch
V0.1\Vedika\vedika\Vyomanta\frontend\scripts
V0.1\Vedika\vedika\Vyomanta\frontend\vedika

# Files:
V0.1\Vedika\vedika\Vyomanta\frontend\.gitignore
V0.1\Vedika\vedika\Vyomanta\frontend\BACKEND_INTEGRATION.md
V0.1\Vedika\vedika\Vyomanta\frontend\PROJECT_INTEGRATION_DOCUMENTATION.md
V0.1\Vedika\vedika\Vyomanta\frontend\Procfile
V0.1\Vedika\vedika\Vyomanta\frontend\RENDER_VOICE_DEPLOYMENT.md
V0.1\Vedika\vedika\Vyomanta\frontend\VISUALIZER_ARCHITECTURE.md
V0.1\Vedika\vedika\Vyomanta\frontend\hosting_and_wrapping_guide.md
V0.1\Vedika\vedika\Vyomanta\frontend\jsconfig.json
V0.1\Vedika\vedika\Vyomanta\frontend\lms_backend_architecture.md
V0.1\Vedika\vedika\Vyomanta\frontend\next.config.js
V0.1\Vedika\vedika\Vyomanta\frontend\package-lock.json
V0.1\Vedika\vedika\Vyomanta\frontend\package.json
V0.1\Vedika\vedika\Vyomanta\frontend\render.yaml
V0.1\Vedika\vedika\Vyomanta\frontend\server-with-ws.js
V0.1\Vedika\vedika\Vyomanta\frontend\vercel.json
V0.1\Vedika\vedika\Vyomanta\frontend\voice-server.js


## Assistant

<thinking>
**Searching for paths**

I think I need to use a targeted grep to find specific paths or files, possibly in the app directory. I want to look for lines that contain the word "exist," as that seems relevant to what I’m after. It’s all about narrowing down my search to make sure I get the information I need without chasing too many wild leads. I’m curious how this will unfold!
</thinking>

**Tool Call: No matches**
Status: Completed

```json
{
  "offset": 0,
  "current_matches_page": [],
  "all_matches_len": 0
}
```

**Tool Call: Search files for regex `dance|dancing|dancer|groov|sway|bounce|wobble|avatar`**
Status: Completed

file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/2d-avatar-testing/page.jsx#L1:11

```
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import BloubAvatar from '../../components/BloubAvatar';
import { EXPRESSIONS } from '../../lib/bloub/expressions.js';
import { STATES } from '../../lib/bloub/states.js';
import './2d-avatar-testing.css';

const PAPERS = [
  { id: 'dark', label: 'Dark Carbon', bg: '#09090b', cardBg: '#111218' },
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/2d-avatar-testing/page.jsx#L29:35

```
          <span className="bloub-badge-dot"></span>
          Bloub 2D Avatar Animation Engine
        </div>
        <h1 className="bloub-title">2D Avatar Expression Testing</h1>
        <p className="bloub-subtitle">
          Pure geometric SVG avatar engine with smooth vector morphing, organic breathing, and gaze tracking.
          Circle silhouette with black fill (<code>#000000</code>) and seamless eye cutouts.
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/2d-avatar-testing/page.jsx#L46:56

```
          <div className="bloub-master-card-inner">
            <BloubAvatar
              size={300}
              shape={null} /* circle */
              color="#000000" /* Black as requested */
              paper={currentPaper.bg}
              expression={currentExpression}
              state={currentState}
              follow={followCursor}
            />
          </div>
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/2d-avatar-testing/page.jsx#L161:171

```
              <div
                key={expr.id}
                onClick={() => setCurrentExpression(expr.id)}
                className={`bloub-gallery-card ${isSelected ? 'selected' : ''}`}
                style={{ backgroundColor: currentPaper.cardBg }}
              >
                <BloubAvatar
                  size={100}
                  shape={null}
                  color="#000000"
                  paper={currentPaper.bg}
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/admin/search/page.jsx#L23:33

```
  useEffect(() => {
    if (!query.trim()) {
      setResults({ courses: [], batches: [], quizzes: [], assignments: [], jobs: [] });
      return;
    }

    setLoading(true);
    const debounce = setTimeout(() => {
      searchLMS(query).then(res => {
        setResults(res);
        setLoading(false);
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/admin/search/page.jsx#L35:39

```
    }, 250);

    return () => clearTimeout(debounce);
  }, [query]);

```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/avatar-blob/page.jsx#L22:38

```
  Wind
} from 'lucide-react';
import './avatar-blob.css';

// ── 4 Reference Avatars matching user photo (media_1788769466961.png) ──
const AVATARS = [
  { 
    id: 'mowgli', 
    legacyId: 'purple',
    name: 'Mowgli', 
    character: 'Mint Pom-Pom',
    color: '#14b8a6', 
    tipColor: '#5eead4',
    irisColor: '#0d9488',
    quote: 'Hey there! 👋',
    texture: '/avatar_1_purple.webp' 
  },
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/avatar-blob/page.jsx#L39:49

```
  { 
    id: 'belle', 
    legacyId: 'red',
    name: 'Belle', 
    character: 'Sky Pom-Pom',
    color: '#3b82f6', 
    tipColor: '#93c5fd',
    irisColor: '#1d4ed8',
    quote: 'What shall we build today? 💡',
    texture: '/avatar_2_lime.webp' 
  },
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/avatar-blob/page.jsx#L50:60

```
  { 
    id: 'moana', 
    legacyId: 'olive',
    name: 'Moana', 
    character: 'Magenta Pom-Pom',
    color: '#d946ef', 
    tipColor: '#f0abfc',
    irisColor: '#a21caf',
    quote: 'Puzzles? I love a good challenge! 🧩',
    texture: '/avatar_3_red.webp' 
  },
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/avatar-blob/page.jsx#L61:71

```
  { 
    id: 'bhageera', 
    legacyId: 'blue',
    name: 'Bhageera', 
    character: 'Golden Wheat Pom-Pom',
    color: '#d4a373', 
    tipColor: '#fef08a',
    irisColor: '#92400e',
    quote: "Let's go on an adventure! ✨",
    texture: '/avatar_4_blue.webp' 
  },
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/avatar-blob/page.jsx#L366:376

```
export default function AvatarBlobLaboratory() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [copyToast, setCopyToast] = useState(false);

  // ── Mode Switcher: 'texture-studio' (No Walls) vs 'gateway-physics' ──
  const [viewMode, setViewMode] = useState('texture-studio');
  const viewModeRef = useRef('texture-studio');
  useEffect(() => {
    viewModeRef.current = viewMode;
  }, [viewMode]);
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/avatar-blob/page.jsx#L398:402

```
    simSpeed: 1.0,
    wireframe: false,
    selectedAvatar: 'mowgli',
    textureStyle: 'smooth-velvet',
    bumpScale: 0.018,
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/avatar-blob/page.jsx#L428:438

```
  const threeStateRef = useRef({
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    avatarGroup: null,
    coreBlobMesh: null,
    coreBlobMaterial: null,
    furShellGroup: null,
    furShellMats: [],
    eyesGroup: null,
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/avatar-blob/page.jsx#L475:495

```
  const handleSwitchMode = (mode) => {
    setViewMode(mode);
    viewModeRef.current = mode;

    const state = threeStateRef.current;
    if (!state.avatarGroup) return;

    if (mode === 'texture-studio') {
      // Hide walls and lips
      if (state.upperWallMesh) state.upperWallMesh.visible = false;
      if (state.lowerWallMesh) state.lowerWallMesh.visible = false;
      if (state.upperLipMesh) state.upperLipMesh.visible = false;
      if (state.lowerLipMesh) state.lowerLipMesh.visible = false;
      if (state.slitGlowLight) state.slitGlowLight.visible = false;

      // Center avatar peacefully facing forward
      state.zPos = 0.0;
      state.avatarGroup.position.set(0, 0, 0);
      state.avatarGroup.rotation.y = 0;
      setTurntableAngle(0);
      setBlobZ(0.0);
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/avatar-blob/page.jsx#L505:515

```
    } else {
      // Gateway Physics Mode: show walls & restore traversal
      if (state.upperWallMesh) state.upperWallMesh.visible = true;
      if (state.lowerWallMesh) state.lowerWallMesh.visible = true;
      if (state.upperLipMesh) state.upperLipMesh.visible = true;
      if (state.lowerLipMesh) state.lowerLipMesh.visible = true;
      if (state.slitGlowLight) state.slitGlowLight.visible = true;

      state.avatarGroup.rotation.y = 0;
      state.zPos = -3.0;
      state.avatarGroup.position.set(0, 0, -3.0);
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/avatar-blob/page.jsx#L620:624

```
    // ── Preload Textures ──
    const textureLoader = new THREE.TextureLoader();
    AVATARS.forEach((av) => {
      const tex = textureLoader.load(av.texture);
      tex.colorSpace = THREE.SRGBColorSpace;
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/avatar-blob/page.jsx#L632:641

```
    threeStateRef.current.furClumpTexture = smoothFurTex;

    // ── Avatar Main Group (Contains Core Body, External Fur Shells, Eyes, Paws) ──
    const avatarGroup = new THREE.Group();
    avatarGroup.position.set(0, 0, 0);
    avatarGroup.rotation.y = 0; // Starts directly facing the user!
    scene.add(avatarGroup);
    threeStateRef.current.avatarGroup = avatarGroup;

    // 1. Core Base Mesh: Solid, smooth body with velvet peach-fuzz sheen and fine combed fur bump
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/avatar-blob/page.jsx#L652:656

```
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    avatarGroup.add(coreMesh);
    threeStateRef.current.coreBlobMesh = coreMesh;
    threeStateRef.current.coreBlobMaterial = coreMat;
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/avatar-blob/page.jsx#L659:663

```
    const numShells = 8;
    const furShellGroup = new THREE.Group();
    avatarGroup.add(furShellGroup);
    threeStateRef.current.furShellGroup = furShellGroup;
    threeStateRef.current.furShellMats = [];
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/avatar-blob/page.jsx#L808:814

```

    // 3. 3D Pixar Eyes (Mounted on Front Face)
    const curAv = AVATARS[0];
    const { eyesGroup, irisMat } = createPixarEyesGroup(curAv.irisColor);
    avatarGroup.add(eyesGroup);
    threeStateRef.current.eyesGroup = eyesGroup;
    threeStateRef.current.irisMat = irisMat;
```


**Tool Call: Search files for regex `dance|dancing|dancer|groov|sway|bounce|wobble`**
Status: Completed

file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/admin/search/page.jsx#L23:33

```
  useEffect(() => {
    if (!query.trim()) {
      setResults({ courses: [], batches: [], quizzes: [], assignments: [], jobs: [] });
      return;
    }

    setLoading(true);
    const debounce = setTimeout(() => {
      searchLMS(query).then(res => {
        setResults(res);
        setLoading(false);
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/admin/search/page.jsx#L35:39

```
    }, 250);

    return () => clearTimeout(debounce);
  }, [query]);

```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/api/generate-aptitude/route.js#L157:175

```
  try {
    const body = await req.json().catch(() => ({}));
    const difficulty = body.difficulty || 'Medium';
    const topic = body.topic || 'General Aptitude';
    const category = body.category || 'Quantitative Aptitude';
    const avoidQuestions = Array.isArray(body.avoidQuestions) ? body.avoidQuestions : [];

    let domainGuidance = "";
    if (category === 'Quantitative Aptitude' || topic.match(/math|interest|work|speed|profit|percentage|algebra|ratio|geometry/i)) {
      domainGuidance = `You are a Senior Quantitative Aptitude Examiner. Ensure exact mathematical correctness. Wrap mathematical expressions in LaTeX dollar signs (e.g. $x^2 + 5x = 0$). Double-escape all backslashes in JSON (e.g. \\\\text, \\\\frac).`;
    } else if (category === 'Logical Reasoning' || topic.match(/logic|puzzle|blood|relation|seating|coding|series|syllogism|analogy|cube|dice/i)) {
      domainGuidance = `You are a Senior Logical Reasoning Examiner for Placement Exams. Generate high-quality logical puzzles, seating arrangements, blood relations, or series. Ensure logic is 100% sound and unambiguous.`;
    } else if (category === 'Verbal Ability' || topic.match(/verbal|english|grammar|synonym|reading|comprehension|jumble|idiom/i)) {
      domainGuidance = `You are a Senior Verbal Ability Examiner. For Reading Comprehension, provide a short concise passage followed by a question. For Grammar/Vocabulary, provide clear contexts.`;
    } else if (category === 'CS & Technical Fundamentals' || topic.match(/sql|programming|python|c\+\+|java|oops|dbms|os|network|pseudocode|code/i)) {
      domainGuidance = `You are a Senior Computer Science Technical Interviewer. Generate questions on CS fundamentals, SQL queries, pseudocode analysis, or code output prediction. Wrap code in markdown code blocks.`;
    } else {
      domainGuidance = `You are an Expert Placement & Aptitude Assessment Specialist. Generate a clear and challenging question on the specified topic.`;
    }
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/api/generate-aptitude/route.js#L181:185

```
    }

    const systemInstruction = `${domainGuidance}
Your task is to generate ONE realistic, concise, high-quality question for Placement Exams on topic "${topic}".
Strictly return ONLY a JSON object matching this exact schema:
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/api/labs/tutor/route.js#L73:88

```
${expQuestions.length > 0 ? expQuestions.map((q, i) => `  Q${i + 1}: ${q}`).join('\n') : '  - Standard interactive lab inquiry questions.'}

===================================================================
PEDAGOGICAL & VIVA VOCE PROTOCOL
===================================================================
You are conducting viva voce examination and real-time guidance for this experiment.
When answering student questions—especially when answering a designated Viva Question (such as Q1, Q2, Q3...):
1. **Direct Viva Answer**: Provide a concise, clear, definitive scientific conclusion in the opening sentences.
2. **Scientific & Mathematical Principle**: Clearly explain the underlying mechanisms using the governing formulas (${expFormulas.join(', ') || 'governing scientific laws'}). Detail cause-and-effect relationships (e.g. how altering one variable changes the dependent parameters).
3. **Simulation Experiment Guidance**: Detail exactly what the student should adjust, connect, or observe in the interactive simulation canvas right now (e.g. which sliders, meters, components, or probes to toggle) to empirically verify this answer!
4. **Comprehension Check**: End with a short, thought-provoking follow-up question to test their conceptual depth.

Tone & Formatting Guidelines:
- Use clean Markdown with bold headers and bullet points.
- Use readable scientific notation (V = I * R).
- Be warm, encouraging, and academically rigorous.`;
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/api/labs/tutor/route.js#L92:94

```
    if (vivaQuestion) {
      formattedUserPrompt = `[Viva Voce Question ${questionIndex ? `Q${questionIndex}` : ''}]: "${vivaQuestion}"\n\nAs my Senior Lab Tutor, please provide the complete viva answer, theoretical derivation using the experiment's formulas, and exact step-by-step guidance on how to verify this in the interactive simulation.`;
    }
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/avatar-chamber/components/Golddust.jsx#L160:170

```
      moveGolddust: function () {
        // Falling speed: optimized to fall smoothly with graceful momentum
        this.y_pos = this.y_pos + (this.gr * this.scale) * 1.45;

        // Gentle lateral fluttering sway
        this.x_pos += Math.sin(this.y_pos * 0.015 + this.wind) * 0.85;

        // 3D tumbling rotation
        this.direction.x += this.rotate.x / 3.5;
        this.direction.y += this.rotate.y / 3.5;
        this.direction.z += this.rotate.z / 3.5;
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/avatar-chamber/engine/AvatarButterflies.js#L501:502

```
   * Computes the live dynamic world position of the current crown perch spot.
   * Tracks the avatar's real-time head floating bob, horizontal wobble, and crown tilt.
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/avatar-chamber/engine/AvatarButterflies.js#L671:681

```
        if (!this.shakeTriggered && stateElapsed >= this.seatedDuration) {
          this.shakeTriggered = true;
          if (this.onLandingShake) {
            this.onLandingShake();
          }

          // Avatar's horizontal wobble knocks the butterfly OUT OF ORBIT!
          this.landingState = 'TAKEOFF';
          this.stateStartTime = time;

          // 1. Play butterfly fly away sound effect when shaken off!
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/avatar-chamber/engine/AvatarButterflies.js#L786:796

```
        } else if (this.landingState === 'TAKEOFF') {
          // ── The avatar's horizontal wobble knocks the butterfly OUT OF THE ORBIT! ──
          const t = Math.min(Math.max((time - this.stateStartTime) / this.takeoffDuration, 0.0), 1.0);

          // Out-of-orbit displacement: peaks at t ≈ 0.35 then smoothly returns to 0
          // This shoots the butterfly forward towards camera and upward/sideways!
          const flingFactor = Math.sin(t * Math.PI); // 0 -> 1 -> 0
          const flingOutX = (idx % 2 === 0 ? 0.85 : -0.85) * flingFactor;
          const flingOutY = 0.55 * flingFactor;
          const flingOutZ = 0.80 * flingFactor; // Shoots forward out of orbit into room!

```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/avatar-chamber/engine/AvatarChamberGeometry.js#L55:65

```
  {
    id: 'ask',
    index: 0,
    name: 'Ask Vedika',
    tag: 'AI Learning Companion',
    subtitle: 'Your curious learning buddy for questions & explanations',
    description: 'Ask any concept across programming, science, and math with instant friendly guidance.',
    route: '/vedika-ai/ask',
    colorHex: '#39FF14', // Neon Green
    bodyColor: '#39FF14',
    themeColor: '#39FF14',
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/avatar-chamber/engine/AvatarChamberGeometry.js#L70:80

```
  {
    id: 'code',
    index: 1,
    name: 'Code with Vedika',
    tag: 'Pair Programming Mentor',
    subtitle: 'Your AI pair programmer & coding mentor',
    description: 'Write, debug, and optimize real-world code with live syntax guidance and architectural hints.',
    route: '/vedika-ai/code',
    colorHex: '#FF6EFF', // Neon Pink
    bodyColor: '#FF6EFF',
    themeColor: '#FF6EFF',
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/avatar-chamber/engine/AvatarChamberManager.js#L654:658

```
    }, 0.40);

    // 3. Gentle buoyant bounce and settle
    tl.to(av.avatarGroup.position, {
      y: REST_FLOAT_Y + 0.10,
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/avatar-chamber/engine/AvatarChamberManager.js#L735:737

```
   * Scene entrance sequence:
   * Middle avatar (highlighted) gets the pattern opening and bounces out.
   * Remaining avatars in the shadow place quietly emerge into their background positions without patterns.
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/avatar-chamber/engine/AvatarChamberManager.js#L859:863

```
    }

    // 1st bounce
    const b1Up = dropTime + 0.25;
    masterTL.to(av0.avatarGroup.position, { y: REST_FLOAT_Y + 0.15, duration: 0.18, ease: 'power2.out' }, b1Up);
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/avatar-chamber/engine/AvatarChamberManager.js#L868:872

```
    masterTL.to(av0.avatarGroup.scale, { x: 1.04, y: 0.97, z: 1.04, duration: 0.16, ease: 'power1.in' }, b1Down);

    // 2nd bounce
    const b2Up = b1Down + 0.16;
    masterTL.to(av0.avatarGroup.position, { y: REST_FLOAT_Y + 0.06, duration: 0.14, ease: 'power2.out' }, b2Up);
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/avatar-chamber/engine/AvatarChamberManager.js#L983:985

```
   * Plays an adorable, horizontal shake-off animation on the middle avatar:
   * Rapid horizontal head wobble (shaking left-and-right "no-no / brrr"),
   * horizontal body shimmy, squash & stretch, and cute surprised/happy smile.
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/avatar-chamber/engine/AvatarChamberManager.js#L1083:1090

```
    tl.to(hopObj, {
      y: 0,
      duration: 0.20,
      ease: 'bounce.out',
      onUpdate: () => {
        middleAv.shakeOffsetY = hopObj.y;
      },
    }, 0.16);
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/avatar-chamber/engine/AvatarChamberManager.js#L1159:1163

```
      const idleY = Math.sin(time * floatSpeed + av.idlePhase) * floatAmp + (isMiddle ? Math.cos(time * 0.9) * 0.03 : 0);

      // Apply horizontal shimmy, vertical hop, and cute talking gesture bounce
      const talkHop = (av.isSpeaking && !av.isShaking) ? Math.sin((performance.now() - (av.speechStartTime || 0)) * 0.015) * 0.018 : 0;
      av.pivot.position.x = isMiddle ? (av.shakePosX || 0) : 0;
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/avatar-chamber/engine/AvatarChamberManager.js#L1205:1209

```
      [av.springRotX, av.velRotX] = updateSpring(av.springRotX, av.velRotX, targetRotX, isMiddle ? 24 : 40, 6.0, smoothDt);

      // Horizontal wobble adds directly to rotation.y!
      av.pivot.rotation.y = av.springRotY + (av.shakeRotY || 0);
      av.pivot.rotation.x = av.springRotX;
```


## Assistant

<thinking>
**Exploring project paths**

I'm considering if there’s another root in my project. It looks like using the find_path glob might not have worked because of how the path syntax is set up. I think I need to search for all names using the terminal's find command to ensure they can be read properly. It’s kind of a roundabout way, but I really want to find the correct paths! Let's make sure everything's accessible.
</thinking>

**Tool Call: find . -iname '*does*not*exist*' -o -iname '*not*exist*' -o -iname '*404*'**
Status: Completed

Terminal:
```
./Vedika/.git/objects/27/a582af80404f8b5019b50cf3c0eddac2059f21
./Vedika/.git/objects/6a/e6bfdae2da47678c0f9e7ba3500dd2f44044e9
./Vedika/vedika/Vyomanta/frontend/.next/static/media/KaTeX_SansSerif-Regular.74048478.woff

```


## User

the 404 page i have created check for that

## Assistant

<thinking>
**Locating 404 routes**

I need to find the 404 routes, which are likely defined in the `app/not-found.jsx` file. This is essential for properly handling not-found pages in the app. Since these routes play a crucial role in user experience, ensuring they function correctly is important. I'll start by checking that file to confirm if that is indeed where these routes are defined. I want to get this right to enhance the user experience!
</thinking>

I’ll check the Next.js special route files and the nearby avatar-chamber implementation now; the page may be named `not-found.jsx` or live in a route-specific folder rather than using “does-not-exist” in its filename. I’ll only inspect and report findings.

**Tool Call: 1 match**
Status: Completed

file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/not-found.jsx

**Tool Call: No matches**
Status: Completed

```json
{
  "offset": 0,
  "current_matches_page": [],
  "all_matches_len": 0
}
```

**Tool Call: No matches**
Status: Completed

```json
{
  "offset": 0,
  "current_matches_page": [],
  "all_matches_len": 0
}
```

**Tool Call: No matches**
Status: Completed

```json
{
  "offset": 0,
  "current_matches_page": [],
  "all_matches_len": 0
}
```

**Tool Call: Search files for regex `Page Not Found|page not found|does not exist|doesn't exist|lost|404`**
Status: Completed

file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/api/admin/courses/import/route.js#L18:21

```
  } catch (error) {
    console.error("Failed to read sample syllabus CSV file:", error);
    return new Response("Template file not found", { status: 404 });
  }
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/api/documents/attach/route.js#L34:37

```
      if (docContexts.length === 0) {
        await connection.rollback();
        return NextResponse.json({ error: 'Document not found.' }, { status: 404 });
      }
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/api/documents/delete/route.js#L35:37

```
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Document not found.' }, { status: 404 });
    }
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/api/generate-aptitude/route.js#L36:46

```
async function callGeminiWithRetry(contents, systemInstruction = '', generationConfig = {}, maxRetries = 3) {
  const keys = getAllKeys();
  if (keys.length === 0) {
    throw new Error('No Gemini API keys configured.');
  }

  // Use active models only (gemini-1.5-flash removed as it causes 404 on v1beta)
  const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'];
  let lastError = null;

  for (let attempt = 0; attempt < 5; attempt++) {
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/api/strip-cheatsheets/route.js#L1:3

```
export async function GET() {
  return new Response("Not Found", { status: 404 });
}
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/engine/DiscoScene.js#L350:360

```
  getEffectiveBounds() {
    // Strict White Box Boundary: Keep avatars on visible front-center dancefloor
    // minZ = -0.70 (just above avatars' heads, well below disco ball & upper UI)
    // maxZ =  0.40 (above bottom 404 pill and instruction footer)
    // X = [-3.2, 3.2] (generous dance width, well within viewport side margins)
    const zClamped = THREE.MathUtils.clamp(this.pos.z, -0.70, 0.40);
    const tZ = (zClamped - (-0.70)) / (0.40 - (-0.70));
    const boundX = THREE.MathUtils.lerp(3.2, 2.7, tZ);
    return {
      minX: -boundX,
      maxX: boundX,
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/engine/DiscoScene.js#L930:934

```
    this.renderer.setPixelRatio(targetDpr);
    this.renderer.setSize(width, height);
    this.renderer.setClearColor(0x040407);
    this.renderer.shadowMap.enabled = false;
    if (!isCanvas) {
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/engine/DiscoScene.js#L942:946

```
    }

    this.renderer.domElement.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      if (this.animId) cancelAnimationFrame(this.animId);
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/engine/DiscoScene.js#L950:954

```
    // 2. Scene & Fog
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x040407, 0.035);

    // 3. Camera Framed Closer & Focused on Large Mascots
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/engine/DiscoScene.js#L1678:1682

```
      const day = this.dayLerp;

      const nightFog = new THREE.Color(0x040407);
      const morningFog = new THREE.Color(0xFFE8D6);
      this.scene.fog.color.lerpColors(nightFog, morningFog, day);
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/home-avatar/engine/HomeAvatarManager.js#L775:780

```
        playPromise.catch((err) => {
          console.warn('Audio autoplay restricted by browser policy:', err?.message);
          // If browser policy restricts direct autoplay without gesture,
          // still animate the avatar's lips for the speech duration so animation is never lost!
          setTimeout(finish, 2600);
        });
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/not-found.css#L1:3

```
/* ===================================================================
   VEDIKA 404 - DISCO DANCE FLOOR STYLESHEET
   =================================================================== */
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/not-found.css#L7:17

```
.disco-root {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #040407;
  color: #ffffff;
  font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  user-select: none;
  -webkit-font-smoothing: antialiased;
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/not-found.jsx#L182:192

```
  return (
    <main className={`disco-root ${themeMode === 'morning' ? 'disco-theme-morning' : ''}`} id="disco-404-root">
      {/* Three.js Container */}
      <div ref={mountRef} className="disco-canvas-wrap" />

      {/* Cyber-Disco Glassmorphic HUD Overlay */}
      <div className="disco-hud">
        {/* Top Bar */}
        <header className="disco-header">
          <div className="disco-brand-pill">
            <span className="disco-beacon-dot" />
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/not-found.jsx#L256:261

```
          <button
            type="button"
            className="disco-hud-toggle-btn"
            onClick={() => setHudMinimized(!hudMinimized)}
            aria-label={hudMinimized ? "Expand 404 details" : "Minimize HUD to view stage"}
          >
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/not-found.jsx#L266:272

```
            <div className="disco-minimized-row">
              <span className="disco-min-badge">404</span>
              <span className="disco-min-text">Lost In The Groove</span>
              <Link href="/" className="disco-min-home-link">
                Back To Safety →
              </Link>
            </div>
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/app/not-found.jsx#L274:284

```
            <>
              <div className="disco-glitch-badge">
                <span>Room Not Found</span>
              </div>
              <h1 className="disco-error-num">404</h1>
              <h2 className="disco-title">Page Lost In The Groove</h2>
              <p className="disco-subtitle">
                The page you&apos;re looking for slipped away to party with Mowgli, Belle, Moana, and Bhageera under the disco lights.
              </p>

              <div className="disco-actions">
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/components/LayoutWrapper.jsx#L128:133

```
    '/home-avatar', '/avatar-chamber', '/avatar-blob', '/2d-avatar-testing', '/auth'
  ];
  const isUnknown404 = !KNOWN_ROUTES_LIST.some(r => r === pathname || (r !== '/' && pathname.startsWith(r)));
  const isFullBleed = pathname === '/home-avatar' || pathname === '/login-avatar' || isUnknown404 || (typeof window !== 'undefined' && window.__IS_NOT_FOUND__);
  if (isFullBleed) {
    return <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>{children}</div>;
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/lib/b2.js#L238:242

```
  });
  
  if (!res.ok && res.status !== 404) {
    const errorText = await res.text();
    throw new Error(`B2 delete failed: ${res.status} ${res.statusText} - ${errorText}`);
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/lib/frappe.js#L1575:1577

```
            qErr.message.includes('not found') || 
            qErr.message.includes('404') || 
            qErr.message.includes('DoesNotExistError')
```


**Tool Call: Read file `Vedika\vedika\Vyomanta\frontend\app\not-found.jsx` (lines 1-360)**
Status: Completed

```V0.1/Vedika/vedika/Vyomanta/frontend/app/not-found.jsx
     1	'use client';
     2	
     3	import React, { useEffect, useRef, useState, useCallback } from 'react';
     4	import Link from 'next/link';
     5	import './not-found.css';
     6	import { DiscoScene, DANCE_MOVE_CATALOG, AVATAR_LIST, DEFAULT_SPOTLIGHT_CONFIG } from './engine/DiscoScene';
     7	import { DiscoAudioEngine } from './engine/DiscoAudioEngine';
     8	
     9	const AVATAR_DOT_CLASSES = {
    10	  mowgli: 'disco-dot-mowgli',
    11	  belle: 'disco-dot-belle',
    12	  moana: 'disco-dot-moana',
    13	  bhageera: 'disco-dot-bhageera',
    14	};
    15	
    16	export default function NotFound() {
    17	  if (typeof window !== 'undefined') {
    18	    window.__IS_NOT_FOUND__ = true;
    19	  }
    20	
    21	  const mountRef = useRef(null);
    22	  const sceneInstanceRef = useRef(null);
    23	  const audioEngineRef = useRef(null);
    24	
    25	  const [isPlaying, setIsPlaying] = useState(false);
    26	  const [isMuted, setIsMuted] = useState(false);
    27	  const [themeMode, setThemeMode] = useState('night');
    28	  const [hudMinimized, setHudMinimized] = useState(false);
    29	
    30	  // Dance Move Selector States
    31	  const [dancePanelOpen, setDancePanelOpen] = useState(false);
    32	  const [selectedAvatarIdx, setSelectedAvatarIdx] = useState(-1); // -1 = All Mascots
    33	  const [currentDanceMove, setCurrentDanceMove] = useState('AUTO');
    34	
    35	  // Spotlight Studio Tuner States
    36	  const [spotlightPanelOpen, setSpotlightPanelOpen] = useState(false);
    37	  const [spotlightConfig, setSpotlightConfig] = useState(DEFAULT_SPOTLIGHT_CONFIG);
    38	  const [copiedToast, setCopiedToast] = useState(false);
    39	
    40	  // Initialize Disco 3D Scene and Web Audio Engine
    41	  useEffect(() => {
    42	    if (typeof window !== 'undefined') {
    43	      window.__IS_NOT_FOUND__ = true;
    44	    }
    45	    if (!mountRef.current) return;
    46	
    47	    // 1. Instantiate Three.js Disco Scene
    48	    const scene = new DiscoScene(mountRef.current);
    49	    sceneInstanceRef.current = scene;
    50	
    51	    // Load saved custom spotlight values from localStorage if available
    52	    try {
    53	      const saved = localStorage.getItem('vedika_disco_spotlight_config');
    54	      if (saved) {
    55	        const parsed = JSON.parse(saved);
    56	        setSpotlightConfig(prev => ({ ...prev, ...parsed }));
    57	        scene.setSpotlightConfig(parsed);
    58	      }
    59	    } catch {}
    60	
    61	    // 2. Instantiate 70s-80s Funky Ambient Web Audio Engine
    62	    const audio = new DiscoAudioEngine();
    63	    audioEngineRef.current = audio;
    64	
    65	    // Browser autoplay policy requires user interaction before audio plays
    66	    const handleFirstInteraction = () => {
    67	      if (audioEngineRef.current && !audioEngineRef.current.isPlaying) {
    68	        audioEngineRef.current.start();
    69	        setIsPlaying(true);
    70	      }
    71	      window.removeEventListener('pointerdown', handleFirstInteraction);
    72	      window.removeEventListener('keydown', handleFirstInteraction);
    73	    };
    74	
    75	    window.addEventListener('pointerdown', handleFirstInteraction, { passive: true });
    76	    window.addEventListener('keydown', handleFirstInteraction, { passive: true });
    77	
    78	    // Cleanup on unmount
    79	    return () => {
    80	      window.removeEventListener('pointerdown', handleFirstInteraction);
    81	      window.removeEventListener('keydown', handleFirstInteraction);
    82	      if (sceneInstanceRef.current) {
    83	        sceneInstanceRef.current.dispose();
    84	        sceneInstanceRef.current = null;
    85	      }
    86	      if (audioEngineRef.current) {
    87	        audioEngineRef.current.stop();
    88	        audioEngineRef.current = null;
    89	      }
    90	    };
    91	  }, []);
    92	
    93	
    94	  // Audio mute/unmute toggle handler
    95	  const handleToggleSound = useCallback(() => {
    96	    if (!audioEngineRef.current) return;
    97	    
    98	    if (!isPlaying) {
    99	      audioEngineRef.current.start();
   100	      setIsPlaying(true);
   101	      setIsMuted(false);
   102	      return;
   103	    }
   104	
   105	    const muted = audioEngineRef.current.toggleMute();
   106	    setIsMuted(muted);
   107	  }, [isPlaying]);
   108	
   109	  // Morning / Night Theme toggle handler
   110	  const handleToggleTheme = useCallback(() => {
   111	    if (!sceneInstanceRef.current) return;
   112	    const isDay = sceneInstanceRef.current.toggleTheme();
   113	    setThemeMode(isDay ? 'morning' : 'night');
   114	  }, []);
   115	
   116	  // Live Dance Move trigger handler
   117	  const handleSelectMove = useCallback((moveId) => {
   118	    setCurrentDanceMove(moveId);
   119	    if (sceneInstanceRef.current) {
   120	      sceneInstanceRef.current.triggerDanceMove(moveId, selectedAvatarIdx);
   121	    }
   122	  }, [selectedAvatarIdx]);
   123	
   124	  // Target Performer selector handler
   125	  const handleSelectAvatar = useCallback((idx) => {
   126	    setSelectedAvatarIdx(idx);
   127	    if (currentDanceMove && currentDanceMove !== 'AUTO' && sceneInstanceRef.current) {
   128	      sceneInstanceRef.current.triggerDanceMove(currentDanceMove, idx);
   129	    }
   130	  }, [currentDanceMove]);
   131	
   132	  // Reset to Auto AI Freestyle Groove
   133	  const handleResetAuto = useCallback(() => {
   134	    setCurrentDanceMove('AUTO');
   135	    if (sceneInstanceRef.current) {
   136	      sceneInstanceRef.current.triggerDanceMove('AUTO');
   137	    }
   138	  }, []);
   139	
   140	  // Spotlight Studio live parameter updater
   141	  const handleUpdateSpotlightParam = useCallback((key, value) => {
   142	    setSpotlightConfig(prev => {
   143	      const next = { ...prev, [key]: value };
   144	      if (sceneInstanceRef.current) {
   145	        sceneInstanceRef.current.setSpotlightConfig(next);
   146	      }
   147	      try {
   148	        localStorage.setItem('vedika_disco_spotlight_config', JSON.stringify(next));
   149	      } catch {}
   150	      return next;
   151	    });
   152	  }, []);
   153	
   154	  // Reset spotlight to clean defaults
   155	  const handleResetSpotlight = useCallback(() => {
   156	    setSpotlightConfig(DEFAULT_SPOTLIGHT_CONFIG);
   157	    if (sceneInstanceRef.current) {
   158	      sceneInstanceRef.current.setSpotlightConfig(DEFAULT_SPOTLIGHT_CONFIG);
   159	    }
   160	    try {
   161	      localStorage.removeItem('vedika_disco_spotlight_config');
   162	    } catch {}
   163	  }, []);
   164	
   165	  // Copy spotlight configuration to clipboard for developer to make permanent
   166	  const handleCopySpotlightConfig = useCallback(() => {
   167	    const jsonStr = JSON.stringify(spotlightConfig, null, 2);
   168	    if (typeof navigator !== 'undefined' && navigator.clipboard) {
   169	      navigator.clipboard.writeText(jsonStr).then(() => {
   170	        setCopiedToast(true);
   171	        setTimeout(() => setCopiedToast(false), 3000);
   172	      }).catch(() => {
   173	        setCopiedToast(true);
   174	        setTimeout(() => setCopiedToast(false), 3000);
   175	      });
   176	    } else {
   177	      setCopiedToast(true);
   178	      setTimeout(() => setCopiedToast(false), 3000);
   179	    }
   180	  }, [spotlightConfig]);
   181	
   182	  return (
   183	    <main className={`disco-root ${themeMode === 'morning' ? 'disco-theme-morning' : ''}`} id="disco-404-root">
   184	      {/* Three.js Container */}
   185	      <div ref={mountRef} className="disco-canvas-wrap" />
   186	
   187	      {/* Cyber-Disco Glassmorphic HUD Overlay */}
   188	      <div className="disco-hud">
   189	        {/* Top Bar */}
   190	        <header className="disco-header">
   191	          <div className="disco-brand-pill">
   192	            <span className="disco-beacon-dot" />
   193	            <span>{themeMode === 'morning' ? 'VEDIKA MORNING LOUNGE' : 'VEDIKA DANCE LOUNGE'}</span>
   194	          </div>
   195	
   196	          <div className="disco-topbar-controls">
   197	            {/* Spotlight Studio Tuner Toggle Button */}
   198	            <button
   199	              type="button"
   200	              className={`disco-spotlight-btn ${spotlightPanelOpen ? 'disco-spotlight-btn-active' : ''}`}
   201	              onClick={() => {
   202	                setSpotlightPanelOpen(!spotlightPanelOpen);
   203	                if (dancePanelOpen) setDancePanelOpen(false);
   204	              }}
   205	              aria-label="Toggle Spotlight Studio Tuner"
   206	            >
   207	              <span className="disco-spotlight-icon">🔦</span>
   208	              <span className="disco-spotlight-label">Spotlight Tuner</span>
   209	            </button>
   210	
   211	            {/* Try Dance Moves Toggle Button */}
   212	            <button
   213	              type="button"
   214	              className={`disco-moves-btn ${dancePanelOpen ? 'disco-moves-btn-active' : ''}`}
   215	              onClick={() => {
   216	                setDancePanelOpen(!dancePanelOpen);
   217	                if (spotlightPanelOpen) setSpotlightPanelOpen(false);
   218	              }}
   219	              aria-label="Toggle dance moves selector"
   220	            >
   221	              <span className="disco-moves-icon">🕺</span>
   222	              <span className="disco-moves-label">Try Dance Moves</span>
   223	              <span className="disco-moves-count">{DANCE_MOVE_CATALOG.length}</span>
   224	            </button>
   225	
   226	            {/* Day / Night Theme Toggle */}
   227	            <button
   228	              type="button"
   229	              className="disco-theme-btn"
   230	              onClick={handleToggleTheme}
   231	              aria-label={themeMode === 'morning' ? "Switch to Night Disco" : "Switch to Morning Light"}
   232	            >
   233	              <span className="disco-theme-icon">{themeMode === 'morning' ? '☀️' : '🌙'}</span>
   234	              <span>{themeMode === 'morning' ? 'Morning Light' : 'Night Disco'}</span>
   235	            </button>
   236	
   237	            {/* Audio Toggle */}
   238	            <button
   239	              type="button"
   240	              className="disco-audio-btn"
   241	              onClick={handleToggleSound}
   242	              aria-label={isMuted || !isPlaying ? "Unmute disco groove" : "Mute disco groove"}
   243	            >
   244	              <div className={`disco-eq-bars ${isPlaying && !isMuted ? 'disco-eq-active' : 'disco-eq-muted'}`}>
   245	                <span className="disco-eq-bar" />
   246	                <span className="disco-eq-bar" />
   247	                <span className="disco-eq-bar" />
   248	              </div>
   249	              <span>{isMuted || !isPlaying ? 'Groove Off' : 'Groove On'}</span>
   250	            </button>
   251	          </div>
   252	        </header>
   253	
   254	        {/* Center / Bottom Error Card with Stage View Toggle */}
   255	        <div className={`disco-center-hud ${hudMinimized ? 'disco-hud-minimized' : ''}`}>
   256	          <button
   257	            type="button"
   258	            className="disco-hud-toggle-btn"
   259	            onClick={() => setHudMinimized(!hudMinimized)}
   260	            aria-label={hudMinimized ? "Expand 404 details" : "Minimize HUD to view stage"}
   261	          >
   262	            {hudMinimized ? 'Expand ↗' : 'Hide Card ↘'}
   263	          </button>
   264	
   265	          {hudMinimized ? (
   266	            <div className="disco-minimized-row">
   267	              <span className="disco-min-badge">404</span>
   268	              <span className="disco-min-text">Lost In The Groove</span>
   269	              <Link href="/" className="disco-min-home-link">
   270	                Back To Safety →
   271	              </Link>
   272	            </div>
   273	          ) : (
   274	            <>
   275	              <div className="disco-glitch-badge">
   276	                <span>Room Not Found</span>
   277	              </div>
   278	              <h1 className="disco-error-num">404</h1>
   279	              <h2 className="disco-title">Page Lost In The Groove</h2>
   280	              <p className="disco-subtitle">
   281	                The page you&apos;re looking for slipped away to party with Mowgli, Belle, Moana, and Bhageera under the disco lights.
   282	              </p>
   283	
   284	              <div className="disco-actions">
   285	                <Link href="/" className="disco-btn-home">
   286	                  <span className="disco-btn-icon">←</span>
   287	                  <span>Back To Safety</span>
   288	                </Link>
   289	                <button
   290	                  type="button"
   291	                  className="disco-btn-secondary"
   292	                  onClick={() => setDancePanelOpen(true)}
   293	                >
   294	                  <span>🕺 Choose Dance Moves</span>
   295	                </button>
   296	              </div>
   297	            </>
   298	          )}
   299	        </div>
   300	
   301	        {/* Interactive Floor Hint */}
   302	        <footer className="disco-footer">
   303	          <div className="disco-interaction-hint">
   304	            <span>Drag To Spin Disco Ball</span>
   305	            <span className="disco-hint-bullet">•</span>
   306	            <span>Click Avatars To Cheer</span>
   307	            <span className="disco-hint-bullet">•</span>
   308	            <span>Choose Dance Moves In Studio</span>
   309	          </div>
   310	        </footer>
   311	      </div>
   312	
   313	      {/* Interactive Dance Studio Drawer / Modal */}
   314	      <aside className={`disco-dance-drawer ${dancePanelOpen ? 'disco-drawer-open' : ''}`} aria-label="Dance Move Selector">
   315	        <div className="disco-drawer-header">
   316	          <div className="disco-drawer-title-row">
   317	            <span className="disco-drawer-badge">DANCE MOVE STUDIO</span>
   318	            <button
   319	              type="button"
   320	              className="disco-drawer-close"
   321	              onClick={() => setDancePanelOpen(false)}
   322	              aria-label="Close dance studio"
   323	            >
   324	              ✕
   325	            </button>
   326	          </div>
   327	          <h3 className="disco-drawer-heading">Choose Mascot Dance Moves</h3>
   328	          <p className="disco-drawer-sub">Test 11 solo moves, 3 partner duets, and group sync in real-time.</p>
   329	        </div>
   330	
   331	        <div className="disco-drawer-scrollable">
   332	          {/* Target Performer Selector */}
   333	          <div className="disco-drawer-section">
   334	            <div className="disco-section-title-row">
   335	              <span className="disco-section-label">PERFORMERS</span>
   336	              <span className="disco-section-count">
   337	                {selectedAvatarIdx === -1 ? 'All Sync' : AVATAR_LIST[selectedAvatarIdx]?.name}
   338	              </span>
   339	            </div>
   340	            <div className="disco-avatar-pills">
   341	              <button
   342	                type="button"
   343	                className={`disco-avatar-chip ${selectedAvatarIdx === -1 ? 'disco-chip-active' : ''}`}
   344	                onClick={() => handleSelectAvatar(-1)}
   345	              >
   346	                <span>✨ All Mascots (Sync)</span>
   347	              </button>
   348	              {AVATAR_LIST.map((av) => (
   349	                <button
   350	                  key={av.id}
   351	                  type="button"
   352	                  className={`disco-avatar-chip ${selectedAvatarIdx === av.index ? 'disco-chip-active' : ''}`}
   353	                  onClick={() => handleSelectAvatar(av.index)}
   354	                >
   355	                  <span className={`disco-avatar-dot ${AVATAR_DOT_CLASSES[av.id] || ''}`} />
   356	                  <span>{av.name}</span>
   357	                </button>
   358	              ))}
   359	            </div>
   360	          </div>

```


**Tool Call: Read file `Vedika\vedika\Vyomanta\frontend\app\not-found.css` (lines 1-420)**
Status: Completed

```V0.1/Vedika/vedika/Vyomanta/frontend/app/not-found.css
     1	/* ===================================================================
     2	   VEDIKA 404 - DISCO DANCE FLOOR STYLESHEET
     3	   =================================================================== */
     4	
     5	@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
     6	
     7	.disco-root {
     8	  position: fixed;
     9	  inset: 0;
    10	  width: 100vw;
    11	  height: 100vh;
    12	  overflow: hidden;
    13	  background: #040407;
    14	  color: #ffffff;
    15	  font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    16	  user-select: none;
    17	  -webkit-font-smoothing: antialiased;
    18	  z-index: 999999;
    19	}
    20	
    21	/* ── WebGL Canvas Layer ─────────────────────────────────────── */
    22	.disco-canvas-wrap {
    23	  position: absolute;
    24	  inset: 0;
    25	  width: 100%;
    26	  height: 100%;
    27	  z-index: 1;
    28	  cursor: grab;
    29	  overflow: hidden;
    30	  contain: strict;
    31	  transform: translateZ(0);
    32	}
    33	
    34	.disco-canvas-wrap canvas {
    35	  width: 100% !important;
    36	  height: 100% !important;
    37	  display: block;
    38	}
    39	
    40	.disco-canvas-wrap:active {
    41	  cursor: grabbing;
    42	}
    43	
    44	/* ── HUD Overlay Layer ──────────────────────────────────────── */
    45	.disco-hud {
    46	  position: absolute;
    47	  inset: 0;
    48	  z-index: 10;
    49	  pointer-events: none;
    50	  display: flex;
    51	  flex-direction: column;
    52	  justify-content: flex-end;
    53	  padding: 1.5rem 2rem 1rem;
    54	  box-sizing: border-box;
    55	}
    56	
    57	/* ── Header / Top Navigation ────────────────────────────────── */
    58	.disco-header {
    59	  position: absolute;
    60	  top: 1.75rem;
    61	  left: 2rem;
    62	  right: 2rem;
    63	  display: flex;
    64	  align-items: center;
    65	  justify-content: space-between;
    66	  width: auto;
    67	}
    68	
    69	.disco-brand-pill {
    70	  display: inline-flex;
    71	  align-items: center;
    72	  gap: 10px;
    73	  padding: 8px 16px;
    74	  background: rgba(18, 18, 28, 0.65);
    75	  backdrop-filter: blur(14px);
    76	  -webkit-backdrop-filter: blur(14px);
    77	  border: 1px solid rgba(255, 255, 255, 0.08);
    78	  border-radius: 9999px;
    79	  font-size: 0.8125rem;
    80	  font-weight: 600;
    81	  letter-spacing: 0.04em;
    82	  color: rgba(255, 255, 255, 0.85);
    83	  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);
    84	}
    85	
    86	.disco-beacon-dot {
    87	  width: 8px;
    88	  height: 8px;
    89	  border-radius: 50%;
    90	  background: #39ff14;
    91	  box-shadow: 0 0 10px #39ff14, 0 0 20px #39ff14;
    92	  animation: discoPulse 2s ease-in-out infinite;
    93	}
    94	
    95	@keyframes discoPulse {
    96	  0%, 100% {
    97	    transform: scale(1);
    98	    opacity: 1;
    99	  }
   100	  50% {
   101	    transform: scale(1.3);
   102	    opacity: 0.6;
   103	  }
   104	}
   105	
   106	/* ── Header Top Navigation Controls ────────────────────────── */
   107	.disco-topbar-controls {
   108	  display: flex;
   109	  align-items: center;
   110	  gap: 10px;
   111	}
   112	
   113	/* ── Theme Toggle Button (Night / Morning) ─────────────────── */
   114	.disco-theme-btn {
   115	  pointer-events: auto;
   116	  display: inline-flex;
   117	  align-items: center;
   118	  gap: 8px;
   119	  padding: 9px 16px;
   120	  background: rgba(24, 24, 38, 0.7);
   121	  backdrop-filter: blur(16px);
   122	  -webkit-backdrop-filter: blur(16px);
   123	  border: 1px solid rgba(255, 255, 255, 0.12);
   124	  border-radius: 9999px;
   125	  color: #ffffff;
   126	  font-family: inherit;
   127	  font-size: 0.8125rem;
   128	  font-weight: 600;
   129	  letter-spacing: 0.03em;
   130	  cursor: pointer;
   131	  transition: all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
   132	  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);
   133	}
   134	
   135	.disco-theme-btn:hover {
   136	  background: rgba(35, 35, 55, 0.85);
   137	  border-color: rgba(255, 255, 255, 0.28);
   138	  transform: translateY(-1px);
   139	  box-shadow: 0 8px 24px rgba(251, 191, 36, 0.25);
   140	}
   141	
   142	.disco-theme-btn:active {
   143	  transform: translateY(1px);
   144	}
   145	
   146	.disco-theme-icon {
   147	  display: inline-flex;
   148	  font-size: 0.95rem;
   149	  transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
   150	}
   151	
   152	.disco-theme-btn:hover .disco-theme-icon {
   153	  transform: rotate(20deg) scale(1.15);
   154	}
   155	
   156	/* ── Sound Toggle Button ────────────────────────────────────── */
   157	.disco-audio-btn {
   158	  pointer-events: auto;
   159	  display: inline-flex;
   160	  align-items: center;
   161	  gap: 10px;
   162	  padding: 9px 18px;
   163	  background: rgba(24, 24, 38, 0.7);
   164	  backdrop-filter: blur(16px);
   165	  -webkit-backdrop-filter: blur(16px);
   166	  border: 1px solid rgba(255, 255, 255, 0.12);
   167	  border-radius: 9999px;
   168	  color: #ffffff;
   169	  font-family: inherit;
   170	  font-size: 0.8125rem;
   171	  font-weight: 600;
   172	  letter-spacing: 0.03em;
   173	  cursor: pointer;
   174	  transition: all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
   175	  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);
   176	}
   177	
   178	.disco-audio-btn:hover {
   179	  background: rgba(35, 35, 55, 0.85);
   180	  border-color: rgba(255, 255, 255, 0.28);
   181	  transform: translateY(-1px);
   182	  box-shadow: 0 8px 24px rgba(167, 139, 250, 0.25);
   183	}
   184	
   185	.disco-audio-btn:active {
   186	  transform: translateY(1px);
   187	}
   188	
   189	.disco-eq-bars {
   190	  display: inline-flex;
   191	  align-items: flex-end;
   192	  gap: 3px;
   193	  height: 14px;
   194	  width: 14px;
   195	}
   196	
   197	.disco-eq-bar {
   198	  width: 2.5px;
   199	  border-radius: 2px;
   200	  background: #38bdf8;
   201	  height: 100%;
   202	}
   203	
   204	.disco-eq-active .disco-eq-bar:nth-child(1) {
   205	  animation: discoEq 0.6s ease-in-out infinite alternate;
   206	}
   207	.disco-eq-active .disco-eq-bar:nth-child(2) {
   208	  animation: discoEq 0.45s ease-in-out 0.15s infinite alternate;
   209	}
   210	.disco-eq-active .disco-eq-bar:nth-child(3) {
   211	  animation: discoEq 0.55s ease-in-out 0.3s infinite alternate;
   212	}
   213	
   214	.disco-eq-bar:nth-child(1) { background: #38bdf8; }
   215	.disco-eq-bar:nth-child(2) { background: #a78bfa; }
   216	.disco-eq-bar:nth-child(3) { background: #f43f5e; }
   217	
   218	.disco-eq-muted .disco-eq-bar {
   219	  height: 3px !important;
   220	  opacity: 0.4;
   221	  animation: none !important;
   222	}
   223	
   224	@keyframes discoEq {
   225	  0% {
   226	    height: 25%;
   227	  }
   228	  100% {
   229	    height: 100%;
   230	  }
   231	}
   232	
   233	/* ── Main Message Card (Anchored gracefully in lower view) ────── */
   234	.disco-center-hud {
   235	  position: relative;
   236	  display: flex;
   237	  flex-direction: column;
   238	  align-items: center;
   239	  text-align: center;
   240	  margin: 0 auto 0.65rem auto;
   241	  max-width: 480px;
   242	  width: 90%;
   243	  pointer-events: none;
   244	  background: rgba(12, 14, 26, 0.45);
   245	  backdrop-filter: blur(14px);
   246	  -webkit-backdrop-filter: blur(14px);
   247	  border: 1px solid rgba(255, 255, 255, 0.08);
   248	  border-radius: 20px;
   249	  padding: 0.85rem 1.6rem 1rem;
   250	  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.55), 0 0 25px rgba(124, 58, 237, 0.1);
   251	  transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
   252	}
   253	
   254	.disco-center-hud.disco-hud-minimized {
   255	  max-width: 420px;
   256	  padding: 8px 16px;
   257	  border-radius: 9999px;
   258	  margin-bottom: 0.45rem;
   259	}
   260	
   261	.disco-hud-toggle-btn {
   262	  pointer-events: auto;
   263	  position: absolute;
   264	  top: 8px;
   265	  right: 12px;
   266	  background: rgba(255, 255, 255, 0.08);
   267	  border: 1px solid rgba(255, 255, 255, 0.12);
   268	  border-radius: 9999px;
   269	  color: rgba(255, 255, 255, 0.7);
   270	  font-family: inherit;
   271	  font-size: 0.6875rem;
   272	  font-weight: 600;
   273	  padding: 3px 10px;
   274	  cursor: pointer;
   275	  transition: all 0.2s ease;
   276	}
   277	
   278	.disco-hud-toggle-btn:hover {
   279	  background: rgba(255, 255, 255, 0.22);
   280	  color: #ffffff;
   281	}
   282	
   283	.disco-minimized-row {
   284	  display: flex;
   285	  align-items: center;
   286	  gap: 12px;
   287	  width: 100%;
   288	  justify-content: flex-start;
   289	  padding-right: 85px;
   290	}
   291	
   292	.disco-min-badge {
   293	  font-family: 'Outfit', sans-serif;
   294	  font-weight: 800;
   295	  font-size: 0.9375rem;
   296	  color: #f43f5e;
   297	}
   298	
   299	.disco-min-text {
   300	  font-size: 0.8125rem;
   301	  font-weight: 600;
   302	  color: rgba(255, 255, 255, 0.85);
   303	}
   304	
   305	.disco-min-home-link {
   306	  pointer-events: auto;
   307	  margin-left: auto;
   308	  font-size: 0.75rem;
   309	  font-weight: 700;
   310	  color: #38bdf8;
   311	  text-decoration: none;
   312	  transition: opacity 0.2s;
   313	}
   314	
   315	.disco-min-home-link:hover {
   316	  text-decoration: underline;
   317	  opacity: 0.85;
   318	}
   319	
   320	.disco-glitch-badge {
   321	  display: inline-flex;
   322	  align-items: center;
   323	  gap: 8px;
   324	  padding: 4px 10px;
   325	  border-radius: 9999px;
   326	  background: rgba(244, 63, 94, 0.12);
   327	  border: 1px solid rgba(244, 63, 94, 0.28);
   328	  color: #f43f5e;
   329	  font-size: 0.65rem;
   330	  font-weight: 700;
   331	  letter-spacing: 0.14em;
   332	  text-transform: uppercase;
   333	  margin-bottom: 0.35rem;
   334	  box-shadow: 0 0 14px rgba(244, 63, 94, 0.2);
   335	}
   336	
   337	.disco-error-num {
   338	  font-family: 'Outfit', sans-serif;
   339	  font-size: clamp(2rem, 3.6vw, 2.85rem);
   340	  font-weight: 900;
   341	  line-height: 1;
   342	  letter-spacing: -0.04em;
   343	  margin: 0;
   344	  background: linear-gradient(135deg, #ffffff 15%, #d8b4fe 45%, #f472b6 70%, #38bdf8 100%);
   345	  -webkit-background-clip: text;
   346	  -webkit-text-fill-color: transparent;
   347	  filter: drop-shadow(0 0 16px rgba(216, 180, 254, 0.3));
   348	}
   349	
   350	.disco-title {
   351	  font-family: 'Outfit', sans-serif;
   352	  font-size: clamp(1rem, 1.8vw, 1.25rem);
   353	  font-weight: 700;
   354	  margin: 0.25rem 0 0.25rem;
   355	  color: #f8fafc;
   356	  letter-spacing: -0.02em;
   357	  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.6);
   358	}
   359	
   360	.disco-subtitle {
   361	  font-size: clamp(0.75rem, 1.1vw, 0.85rem);
   362	  line-height: 1.4;
   363	  color: rgba(226, 232, 240, 0.72);
   364	  margin: 0 0 0.85rem;
   365	  max-width: 420px;
   366	  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8);
   367	}
   368	
   369	/* ── Return to Home Button ──────────────────────────────────── */
   370	.disco-actions {
   371	  display: flex;
   372	  align-items: center;
   373	  gap: 14px;
   374	}
   375	
   376	.disco-btn-home {
   377	  pointer-events: auto;
   378	  display: inline-flex;
   379	  align-items: center;
   380	  gap: 10px;
   381	  padding: 13px 28px;
   382	  background: linear-gradient(135deg, #7c3aed 0%, #ec4899 100%);
   383	  border: 1px solid rgba(255, 255, 255, 0.25);
   384	  border-radius: 9999px;
   385	  color: #ffffff;
   386	  font-family: inherit;
   387	  font-size: 0.9375rem;
   388	  font-weight: 700;
   389	  text-decoration: none;
   390	  letter-spacing: 0.02em;
   391	  cursor: pointer;
   392	  box-shadow: 0 4px 25px rgba(124, 58, 237, 0.45), 0 0 15px rgba(236, 72, 153, 0.3);
   393	  transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
   394	}
   395	
   396	.disco-btn-home:hover {
   397	  transform: translateY(-2px) scale(1.02);
   398	  box-shadow: 0 8px 32px rgba(124, 58, 237, 0.65), 0 0 25px rgba(236, 72, 153, 0.5);
   399	  border-color: rgba(255, 255, 255, 0.45);
   400	}
   401	
   402	.disco-btn-home:active {
   403	  transform: translateY(1px) scale(0.98);
   404	}
   405	
   406	.disco-btn-icon {
   407	  display: inline-flex;
   408	  transition: transform 0.25s ease;
   409	}
   410	
   411	.disco-btn-home:hover .disco-btn-icon {
   412	  transform: translateX(-3px);
   413	}
   414	
   415	/* ── Interactive Floor Guidance / Hint ──────────────────────── */
   416	.disco-footer {
   417	  text-align: center;
   418	  width: 100%;
   419	}
   420	

```


**Tool Call: Read file `Vedika\vedika\Vyomanta\frontend\app\engine\DiscoScene.js` (lines 1-430)**
Status: Completed

```V0.1/Vedika/vedika/Vyomanta/frontend/app/engine/DiscoScene.js
     1	import * as THREE from 'three';
     2	import { loadGLBModelOptimized } from '@/components/ThreeDAvatar';
     3	
     4	// ── Disco Ball Shaders from CodePen with Day/Night Theme Support ─
     5	const BALL_VERTEX_SHADER = `
     6	  varying vec3 vNorm;
     7	  varying vec3 vObj;
     8	  varying vec3 vWorld;
     9	  void main() {
    10	    vObj   = position;
    11	    vNorm  = normalize(normalMatrix * normal);
    12	    vec4 w = modelMatrix * vec4(position, 1.0);
    13	    vWorld = w.xyz;
    14	    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    15	  }
    16	`;
    17	
    18	const BALL_FRAGMENT_SHADER = `
    19	  #define PI 3.14159265359
    20	  precision highp float;
    21	
    22	  uniform vec3  uCam;
    23	  uniform float uTime;
    24	  uniform vec3  uSpots[8];
    25	  uniform vec3  uSpotCols[8];
    26	  uniform float uDayFactor;
    27	
    28	  varying vec3 vNorm;
    29	  varying vec3 vObj;
    30	  varying vec3 vWorld;
    31	
    32	  vec3 tileNormal(vec3 p, float tiles) {
    33	    vec3 n = normalize(p);
    34	    float lat = asin(clamp(n.y, -1.0, 1.0));
    35	    float lon = atan(n.z, n.x);
    36	    float dLat = PI / tiles;
    37	    float latQ = floor(lat / dLat + 0.5) * dLat;
    38	    float rowTiles = max(1.0, floor(cos(latQ) * tiles * 2.0));
    39	    float dLon = 2.0 * PI / rowTiles;
    40	    float lonQ = floor(lon / dLon + 0.5) * dLon;
    41	    return normalize(vec3(cos(latQ) * cos(lonQ), sin(latQ), cos(latQ) * sin(lonQ)));
    42	  }
    43	
    44	  float tileEdge(vec3 p, float tiles) {
    45	    vec3 n = normalize(p);
    46	    float lat = asin(clamp(n.y, -1.0, 1.0));
    47	    float lon = atan(n.z, n.x);
    48	    float dLat = PI / tiles;
    49	    float rowTiles = max(1.0, floor(cos(floor(lat / dLat + 0.5) * dLat) * tiles * 2.0));
    50	    float dLon = 2.0 * PI / rowTiles;
    51	    float eLat = abs(fract(lat / dLat + 0.5) - 0.5) * 2.0;
    52	    float eLon = abs(fract(lon / dLon + 0.5) - 0.5) * 2.0;
    53	    float edge = max(eLat, eLon);
    54	    return smoothstep(0.72, 0.98, edge);
    55	  }
    56	
    57	  void main() {
    58	    float TILES = 28.0;
    59	
    60	    vec3 N = normalize(vNorm);
    61	    vec3 tN = tileNormal(vObj, TILES);
    62	    float edge = tileEdge(vObj, TILES);
    63	
    64	    vec3 V = normalize(uCam - vWorld);
    65	    vec3 R = reflect(-V, tN);
    66	
    67	    vec3 baseCol = mix(vec3(0.16), vec3(0.74, 0.70, 0.66), uDayFactor);
    68	    vec3 col = baseCol;
    69	
    70	    for(int i = 0; i < 8; i++) {
    71	      vec3 L = normalize(uSpots[i]);
    72	      float refl = max(dot(R, L), 0.0);
    73	      float flash = pow(refl, 180.0) * 6.0;
    74	      col += uSpotCols[i] * flash;
    75	    }
    76	
    77	    vec3 sunDir = normalize(vec3(1.2, 2.5, 1.8));
    78	    float sunDot = max(dot(R, sunDir), 0.0);
    79	    float sunFlash = pow(sunDot, 120.0) * (3.5 * uDayFactor);
    80	    col += vec3(1.0, 0.88, 0.65) * sunFlash;
    81	
    82	    float d = max(dot(tN, normalize(vec3(0.9, 8.0, 0.9))), 0.0);
    83	    col += mix(vec3(0.8, 0.15, 0.10) * d, vec3(0.95, 0.82, 0.55) * d * 0.7, uDayFactor);
    84	
    85	    vec3 H = normalize(normalize(vec3(-0.4, 1.5, 0.5)) + V);
    86	    float sp = pow(max(dot(tN, H), 0.0), 200.0) * 9.5;
    87	    col += vec3(0.6, 0.5, 0.2) * sp;
    88	
    89	    vec3 edgeCol = mix(vec3(0.005), vec3(0.35, 0.32, 0.30), uDayFactor);
    90	    col = mix(col, edgeCol, edge);
    91	
    92	    float rim = pow(1.0 - max(dot(N, V), 0.0), 2.5) * 0.15;
    93	    col += mix(vec3(0.1, 0.15, 0.25), vec3(0.9, 0.85, 0.75), uDayFactor) * rim;
    94	
    95	    gl_FragColor = vec4(col, 1.0);
    96	  }
    97	`;
    98	
    99	// ── Vedika Chamber Volumetric Spotlight Shader ────────────────
   100	const CHAMBER_BEAM_VERTEX_SHADER = `
   101	  varying vec2 vUv;
   102	  varying vec3 vWorldPos;
   103	  varying vec3 vNorm;
   104	  void main() {
   105	    vUv = uv;
   106	    vNorm = normalize(normalMatrix * normal);
   107	    vec4 wp = modelMatrix * vec4(position, 1.0);
   108	    vWorldPos = wp.xyz;
   109	    gl_Position = projectionMatrix * viewMatrix * wp;
   110	  }
   111	`;
   112	
   113	const CHAMBER_BEAM_FRAGMENT_SHADER = `
   114	  precision highp float;
   115	  uniform float uTime;
   116	  uniform vec3  uColor;
   117	  uniform float uIntensity;
   118	  uniform float uOpacity;
   119	  uniform float uFadePower;
   120	
   121	  varying vec2 vUv;
   122	  varying vec3 vWorldPos;
   123	  varying vec3 vNorm;
   124	
   125	  float hash(vec2 p) {
   126	    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
   127	  }
   128	
   129	  float noise(vec2 p) {
   130	    vec2 i = floor(p);
   131	    vec2 f = fract(p);
   132	    f = f * f * (3.0 - 2.0 * f);
   133	    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
   134	               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
   135	  }
   136	
   137	  void main() {
   138	    float y = vUv.y; // 0.0 at floor base, 1.0 at top apex
   139	    float angle = vUv.x * 6.2831853;
   140	
   141	    float raySpeed = uTime * 0.45;
   142	    float rays1 = sin(angle * 10.0 + raySpeed) * 0.5 + 0.5;
   143	    float rays2 = cos(angle * 16.0 - raySpeed * 0.7) * 0.5 + 0.5;
   144	    float rayField = rays1 * 0.6 + rays2 * 0.4;
   145	
   146	    float dust = noise(vec2(angle * 5.0, y * 8.0 - uTime * 0.25)) * 0.15;
   147	    
   148	    // Smooth vertical fade: pure color softly faded from top down to floor
   149	    float verticalFade = pow(clamp(y, 0.0, 1.0), uFadePower);
   150	
   151	    vec3 viewDir = normalize(cameraPosition - vWorldPos);
   152	    float rim = pow(clamp(1.0 - abs(dot(vNorm, viewDir)), 0.0, 1.0), 1.3);
   153	
   154	    float alpha = (0.25 + 0.75 * rayField + dust) * verticalFade * (0.3 + 0.7 * rim) * uIntensity * uOpacity;
   155	    alpha = clamp(alpha, 0.0, 0.90);
   156	
   157	    // PURE AVATAR COLOR ONLY: Zero white shades, zero pastel bleaching, purely that color faded
   158	    gl_FragColor = vec4(uColor, alpha);
   159	  }
   160	`;
   161	
   162	function hsvToRgb(h, s, v) {
   163	  let r, g, b, i = Math.floor(h * 6), f = h * 6 - i, p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
   164	  switch (i % 6) {
   165	    case 0: r = v; g = t; b = p; break;
   166	    case 1: r = q; g = v; b = p; break;
   167	    case 2: r = p; g = v; b = t; break;
   168	    case 3: r = p; g = q; b = v; break;
   169	    case 4: r = t; g = p; b = v; break;
   170	    case 5: r = v; g = p; b = q; break;
   171	  }
   172	  return [r, g, b];
   173	}
   174	
   175	const AVATAR_DEFS = [
   176	  {
   177	    id: 'mowgli',
   178	    name: 'Mowgli',
   179	    texture: '/avatar_1_purple.webp',
   180	    glowColor: '#39FF14',
   181	    threeColor: 0x39FF14,
   182	    audioSrc: '/audio/login/mowgli_hello.wav',
   183	    spawnX: -1.9,
   184	    spawnZ: 0.1,
   185	    formationX: -2.3,
   186	    formationZ: 0.1,
   187	  },
   188	  {
   189	    id: 'belle',
   190	    name: 'Belle',
   191	    texture: '/avatar_2_lime.webp',
   192	    glowColor: '#FF6EFF',
   193	    threeColor: 0xFF6EFF,
   194	    audioSrc: '/audio/login/belle_hello.wav',
   195	    spawnX: -0.8,
   196	    spawnZ: -0.9,
   197	    formationX: -0.75,
   198	    formationZ: -0.2,
   199	  },
   200	  {
   201	    id: 'moana',
   202	    name: 'Moana',
   203	    texture: '/avatar_3_red.webp',
   204	    glowColor: '#FF3131',
   205	    threeColor: 0xFF3131,
   206	    audioSrc: '/audio/login/moana_hello.wav',
   207	    spawnX: 0.8,
   208	    spawnZ: -0.9,
   209	    formationX: 0.75,
   210	    formationZ: -0.2,
   211	  },
   212	  {
   213	    id: 'bhageera',
   214	    name: 'Bhageera',
   215	    texture: '/avatar_4_blue.webp',
   216	    glowColor: '#FF5C00',
   217	    threeColor: 0xFF5C00,
   218	    audioSrc: '/audio/login/bhageera_hello.wav',
   219	    spawnX: 1.9,
   220	    spawnZ: 0.1,
   221	    formationX: 2.3,
   222	    formationZ: 0.1,
   223	  },
   224	];
   225	
   226	// Smooth, aesthetic, non-glitching dance moves & partner duets
   227	export const DANCE_MOVE_CATALOG = [
   228	  { id: 'FUNKY_BOUNCE', name: 'Funky Bounce', type: 'solo', icon: '🦘', desc: 'Upbeat rhythmic vertical groove & soft sway' },
   229	  { id: 'MOONWALK_GLIDE', name: 'Moonwalk Glide', type: 'solo', icon: '🌙', desc: 'Smooth reverse floor glide with rhythmic tilt' },
   230	  { id: 'SIDE_SHUFFLE', name: 'Side Shuffle', type: 'solo', icon: '↔️', desc: 'Graceful lateral sway and step' },
   231	  { id: 'HIP_ROLL_SWAY', name: 'Hip Roll Sway', type: 'solo', icon: '🌊', desc: 'Flowing continuous figure-8 torso roll' },
   232	  { id: 'HEAD_BOB_NOD', name: 'Head Bob Groove', type: 'solo', icon: '🎵', desc: 'Deep bass rhythm continuous head nod' },
   233	  { id: 'WAVE_BODY', name: 'Body Wave', type: 'solo', icon: '〰️', desc: 'Liquid spinal ripple wave motion' },
   234	  { id: 'DISCO_POINT', name: 'Disco Point', type: 'solo', icon: '👉', desc: 'Classic stylish Saturday Night Fever groove' },
   235	  { id: 'CHARLESTON_KICK', name: 'Charleston Kick', type: 'solo', icon: '🦵', desc: 'Relaxed twenties swing kick step' },
   236	  { id: 'SLIDE_AND_DROP', name: 'Slide & Rise', type: 'solo', icon: '📉', desc: 'Dramatic smooth stage glide & recovery' },
   237	  { id: 'TWIST_AND_SHOUT', name: 'Twist & Groove', type: 'solo', icon: '🎸', desc: 'Stylish 60s rock-and-roll continuous twist' },
   238	  { id: 'FLOAT_HOVER', name: 'Anti-Grav Float', type: 'solo', icon: '🛸', desc: 'Zero-gravity smooth mystical levitation' },
   239	  // Smooth Partner Duets (Zero violent spins or pops)
   240	  { id: 'DO_SI_DO', name: 'Do-Si-Do Orbit (Duet)', type: 'pair', icon: '🔄', desc: 'Smooth back-to-back circular orbit' },
   241	  { id: 'MIRROR_DUET', name: 'Mirror Sync (Duet)', type: 'pair', icon: '🪞', desc: 'Facing each other in perfect reflection' },
   242	  { id: 'HIGH_FIVE_HOP', name: 'High-Five Hop (Duet)', type: 'pair', icon: '✋', desc: 'Synchronized celebratory air hop' },
   243	];
   244	
   245	export const AVATAR_LIST = AVATAR_DEFS.map((d, i) => ({
   246	  index: i,
   247	  id: d.id,
   248	  name: d.name,
   249	  glowColor: d.glowColor,
   250	}));
   251	
   252	export const DEFAULT_SPOTLIGHT_CONFIG = {
   253	  beamOpacity: 1.0,
   254	  beamIntensity: 1.15,
   255	  beamFadePower: 1.3,
   256	  topRadius: 0.05,
   257	  bottomRadius: 0.75,
   258	  beamHeight: 5.0,
   259	  spotIntensity: 0.0,
   260	  spotAngle: 0.20,
   261	  spotPenumbra: 0.6,
   262	  showFloorDisk: false,
   263	  focusMode: 'mowgli',
   264	};
   265	
   266	const SOLO_MOVES = DANCE_MOVE_CATALOG.filter(m => m.type === 'solo').map(m => m.id);
   267	const PAIR_MOVES = DANCE_MOVE_CATALOG.filter(m => m.type === 'pair').map(m => m.id);
   268	
   269	/**
   270	 * MascotDanceAgent
   271	 * High-performance autonomous dance and roaming agent.
   272	 */
   273	class MascotDanceAgent {
   274	  constructor(group, modelPivot, modelMesh, def, index, baseHeight) {
   275	    this.group = group;
   276	    this.modelPivot = modelPivot;
   277	    this.modelMesh = modelMesh;
   278	    this.def = def;
   279	    this.index = index;
   280	    this.baseHeight = baseHeight;
   281	
   282	    // Viewport Boundaries (ensures mascots never leave camera frustum)
   283	    this.minX = -3.2;
   284	    this.maxX = 3.2;
   285	    this.minZ = -1.8;
   286	    this.maxZ = 0.85;
   287	
   288	    // Spatial Position & Movement
   289	    this.pos = new THREE.Vector3(def.spawnX, 0, def.spawnZ);
   290	    this.targetPos = new THREE.Vector3(def.spawnX, 0, def.spawnZ);
   291	    this.group.position.set(this.pos.x, 0, this.pos.z);
   292	    this.isRoaming = true;
   293	    this.walkSpeed = 1.30; // Constant, smooth, medium roaming speed
   294	    this.walkCycle = Math.random() * Math.PI * 2;
   295	
   296	    // Facing & Rotations
   297	    this.rotY = 0;
   298	    this.targetRotY = 0;
   299	    this.tiltZ = 0;
   300	    this.tiltX = 0;
   301	    this.spinRot = 0;
   302	
   303	    // Dance Move State Machine
   304	    this.currentMove = SOLO_MOVES[index % SOLO_MOVES.length];
   305	    this.moveTimer = 0;
   306	    this.moveDuration = 3.6 + Math.random() * 2.0;
   307	    this.tempoRate = 1.0; // Smooth unified medium tempo
   308	    this.dancePhase = Math.random() * Math.PI * 2;
   309	    this.forcedMove = false;
   310	
   311	    // Smooth transition blend states (guarantees zero glitches or snaps when changing moves)
   312	    this.currentBounceY = 0;
   313	    this.currentTiltX = 0;
   314	    this.currentSwayZ = 0;
   315	    this.currentTwistY = 0;
   316	    this.currentStretchY = 1.0;
   317	    this.currentSquashXZ = 1.0;
   318	
   319	    // Partner Duet & Wing Cheer State
   320	    this.isPartnering = false;
   321	    this.partnerIndex = null;
   322	    this.partnerRoutine = null;
   323	    this.partnerTimer = 0;
   324	    this.partnerDuration = 99999;
   325	    this.roleIndex = 0;
   326	    this.isWingCheer = false;
   327	    this.wingPos = new THREE.Vector3();
   328	    this.danceAnchor = new THREE.Vector3(def.spawnX, 0, def.spawnZ);
   329	
   330	    // Collision & Ripple Harmonic Oscillator State
   331	    this.rippleTime = 10.0;
   332	    this.rippleIntensity = 0.0;
   333	    this.recoilHop = 0.0;
   334	    this.recoilVelocity = new THREE.Vector3();
   335	
   336	    // Cheer Flip State
   337	    this.isCheering = false;
   338	    this.cheerTimer = 0;
   339	
   340	    this.pickNextRoamTarget();
   341	  }
   342	
   343	  _lerpAngle(current, target, alpha) {
   344	    let diff = (target - current) % (Math.PI * 2);
   345	    if (diff < -Math.PI) diff += Math.PI * 2;
   346	    if (diff > Math.PI) diff -= Math.PI * 2;
   347	    return current + diff * alpha;
   348	  }
   349	
   350	  getEffectiveBounds() {
   351	    // Strict White Box Boundary: Keep avatars on visible front-center dancefloor
   352	    // minZ = -0.70 (just above avatars' heads, well below disco ball & upper UI)
   353	    // maxZ =  0.40 (above bottom 404 pill and instruction footer)
   354	    // X = [-3.2, 3.2] (generous dance width, well within viewport side margins)
   355	    const zClamped = THREE.MathUtils.clamp(this.pos.z, -0.70, 0.40);
   356	    const tZ = (zClamped - (-0.70)) / (0.40 - (-0.70));
   357	    const boundX = THREE.MathUtils.lerp(3.2, 2.7, tZ);
   358	    return {
   359	      minX: -boundX,
   360	      maxX: boundX,
   361	      minZ: -0.70,
   362	      maxZ: 0.40,
   363	    };
   364	  }
   365	
   366	  pickNextRoamTarget() {
   367	    this.isRoaming = true;
   368	    const bounds = this.getEffectiveBounds();
   369	    const marginX = 0.40;
   370	    const marginZ = 0.18;
   371	
   372	    // Smoothly pick a destination inside the user's white boundary box
   373	    let tx, tz;
   374	    if (this.pos.x < bounds.minX + 0.7) {
   375	      // Near left boundary: steer towards center or right
   376	      tx = bounds.minX + 0.7 + Math.random() * (bounds.maxX - bounds.minX - 1.1);
   377	    } else if (this.pos.x > bounds.maxX - 0.7) {
   378	      // Near right boundary: steer towards center or left
   379	      tx = bounds.minX + 0.4 + Math.random() * (bounds.maxX - bounds.minX - 1.1);
   380	    } else {
   381	      // In middle: roam freely across central dancefloor
   382	      tx = bounds.minX + marginX + Math.random() * (bounds.maxX - bounds.minX - marginX * 2);
   383	    }
   384	
   385	    if (this.pos.z < bounds.minZ + 0.35) {
   386	      // Near top/back boundary: steer towards front/middle
   387	      tz = bounds.minZ + 0.30 + Math.random() * (bounds.maxZ - bounds.minZ - 0.45);
   388	    } else if (this.pos.z > bounds.maxZ - 0.30) {
   389	      // Near bottom/front boundary: steer towards middle/back
   390	      tz = bounds.minZ + 0.15 + Math.random() * (bounds.maxZ - bounds.minZ - 0.45);
   391	    } else {
   392	      tz = bounds.minZ + marginZ + Math.random() * (bounds.maxZ - bounds.minZ - marginZ * 2);
   393	    }
   394	
   395	    this.targetPos.set(
   396	      THREE.MathUtils.clamp(tx, bounds.minX + marginX, bounds.maxX - marginX),
   397	      0,
   398	      THREE.MathUtils.clamp(tz, bounds.minZ + marginZ, bounds.maxZ - marginZ)
   399	    );
   400	  }
   401	
   402	  setExplicitMove(moveId) {
   403	    this.currentMove = moveId;
   404	    this.moveTimer = 0;
   405	    this.moveDuration = 99999; // Persist chosen dance move until user selects another
   406	    this.forcedMove = true;
   407	    this.isRoaming = false;
   408	    this.isPartnering = false;
   409	    this.isWingCheer = false;
   410	    this.targetRotY = 0; // Turn towards front camera to show off the move!
   411	
   412	    const bounds = this.getEffectiveBounds();
   413	    this.danceAnchor.copy(this.pos);
   414	    this.danceAnchor.x = THREE.MathUtils.clamp(this.danceAnchor.x, bounds.minX + 0.60, bounds.maxX - 0.60);
   415	    this.danceAnchor.z = THREE.MathUtils.clamp(this.danceAnchor.z, bounds.minZ + 0.30, bounds.maxZ - 0.30);
   416	  }
   417	
   418	  setWingCheer(wingPosition) {
   419	    this.isPartnering = false;
   420	    this.forcedMove = false;
   421	    this.isRoaming = false;
   422	    this.isWingCheer = true;
   423	    this.wingPos.copy(wingPosition);
   424	    this.targetRotY = wingPosition.x < 0 ? 0.35 : -0.35;
   425	  }
   426	
   427	  triggerCheer() {
   428	    this.isCheering = true;
   429	    this.cheerTimer = 0;
   430	    try {

```


**Tool Call: Read file `Vedika\vedika\Vyomanta\frontend\app\engine\DiscoScene.js` (lines 400-850)**
Status: Completed

```V0.1/Vedika/vedika/Vyomanta/frontend/app/engine/DiscoScene.js
   400	  }
   401	
   402	  setExplicitMove(moveId) {
   403	    this.currentMove = moveId;
   404	    this.moveTimer = 0;
   405	    this.moveDuration = 99999; // Persist chosen dance move until user selects another
   406	    this.forcedMove = true;
   407	    this.isRoaming = false;
   408	    this.isPartnering = false;
   409	    this.isWingCheer = false;
   410	    this.targetRotY = 0; // Turn towards front camera to show off the move!
   411	
   412	    const bounds = this.getEffectiveBounds();
   413	    this.danceAnchor.copy(this.pos);
   414	    this.danceAnchor.x = THREE.MathUtils.clamp(this.danceAnchor.x, bounds.minX + 0.60, bounds.maxX - 0.60);
   415	    this.danceAnchor.z = THREE.MathUtils.clamp(this.danceAnchor.z, bounds.minZ + 0.30, bounds.maxZ - 0.30);
   416	  }
   417	
   418	  setWingCheer(wingPosition) {
   419	    this.isPartnering = false;
   420	    this.forcedMove = false;
   421	    this.isRoaming = false;
   422	    this.isWingCheer = true;
   423	    this.wingPos.copy(wingPosition);
   424	    this.targetRotY = wingPosition.x < 0 ? 0.35 : -0.35;
   425	  }
   426	
   427	  triggerCheer() {
   428	    this.isCheering = true;
   429	    this.cheerTimer = 0;
   430	    try {
   431	      const snd = new Audio(this.def.audioSrc);
   432	      snd.volume = 0.85;
   433	      snd.play().catch(() => {});
   434	    } catch {}
   435	  }
   436	
   437	  triggerCollisionRipple(recoilPush) {
   438	    // Never interrupt a user-chosen solo move, partner duet, or wing performance!
   439	    if (this.forcedMove || this.isPartnering || this.isWingCheer) return;
   440	
   441	    this.rippleTime = 0.0;
   442	    this.rippleIntensity = 0.25;
   443	    this.recoilHop = 0.15;
   444	    this.recoilVelocity.copy(recoilPush).multiplyScalar(1.4);
   445	
   446	    this.isRoaming = true;
   447	    this.targetPos.addScaledVector(recoilPush, 1.4);
   448	    const bounds = this.getEffectiveBounds();
   449	    this.targetPos.x = THREE.MathUtils.clamp(this.targetPos.x, bounds.minX + 0.35, bounds.maxX - 0.35);
   450	    this.targetPos.z = THREE.MathUtils.clamp(this.targetPos.z, bounds.minZ + 0.25, bounds.maxZ - 0.25);
   451	    this.targetRotY = Math.atan2(recoilPush.x, recoilPush.z);
   452	  }
   453	
   454	  startPartnerRoutine(partnerIdx, routineName, sharedCenter, roleIndex = 0) {
   455	    this.isPartnering = true;
   456	    this.partnerIndex = partnerIdx;
   457	    this.partnerRoutine = routineName;
   458	    this.partnerTimer = 0;
   459	    this.partnerDuration = 99999;
   460	    this.forcedMove = false;
   461	    this.isRoaming = false;
   462	    this.isWingCheer = false;
   463	    this.roleIndex = roleIndex;
   464	    this.partnerCenter = sharedCenter ? sharedCenter.clone() : this.pos.clone();
   465	    const bounds = this.getEffectiveBounds();
   466	    this.partnerCenter.x = THREE.MathUtils.clamp(this.partnerCenter.x, bounds.minX + 0.85, bounds.maxX - 0.85);
   467	    this.partnerCenter.z = THREE.MathUtils.clamp(this.partnerCenter.z, bounds.minZ + 0.40, bounds.maxZ - 0.40);
   468	    this.partnerAngle = roleIndex === 0 ? 0 : Math.PI;
   469	  }
   470	
   471	  endPartnerRoutine() {
   472	    this.isPartnering = false;
   473	    this.partnerIndex = null;
   474	    this.partnerRoutine = null;
   475	    this.partnerCenter = null;
   476	    this.pickNewMove();
   477	    this.pickNextRoamTarget();
   478	  }
   479	
   480	  pickNewMove(busyMoves = []) {
   481	    if (this.forcedMove) return;
   482	    const choices = SOLO_MOVES.filter(m => !busyMoves.includes(m) && m !== this.currentMove);
   483	    this.currentMove = choices[Math.floor(Math.random() * choices.length)] || 'FUNKY_BOUNCE';
   484	    this.moveTimer = 0;
   485	    this.moveDuration = 3.2 + Math.random() * 3.5;
   486	
   487	    if (Math.random() < 0.65) {
   488	      this.pickNextRoamTarget();
   489	    } else {
   490	      this.isRoaming = false;
   491	      this.targetRotY = (Math.random() - 0.5) * 0.4;
   492	    }
   493	  }
   494	
   495	  update(dt, t, beatTime, allAgents, inGroupFormation, isSpotlightLead) {
   496	    this.moveTimer += dt;
   497	    this.rippleTime += dt;
   498	
   499	    // Safety check against NaN values
   500	    if (!isFinite(this.pos.x)) this.pos.x = this.def.spawnX;
   501	    if (!isFinite(this.pos.z)) this.pos.z = this.def.spawnZ;
   502	
   503	    // 1. Cheer Jump Flip Override (Slow, floaty acrobatic somersault)
   504	    if (this.isCheering) {
   505	      this.cheerTimer += dt * 2.2;
   506	      const jumpY = Math.sin(Math.min(this.cheerTimer, Math.PI)) * 1.15;
   507	      this.group.position.y = jumpY;
   508	      this.spinRot += dt * 4.5;
   509	      this.group.rotation.y = this.rotY + this.spinRot;
   510	      this.modelPivot.scale.set(1.08, 1.15, 1.08);
   511	      if (this.cheerTimer >= Math.PI) {
   512	        this.isCheering = false;
   513	        this.spinRot = 0;
   514	      }
   515	      return;
   516	    }
   517	
   518	    // 2. Elastic Collision Ripple Damping (Gentle, pillow-soft recoil - no violent shaking)
   519	    let rippleSquash = 1.0;
   520	    let rippleStretch = 1.0;
   521	    if (this.rippleTime < 1.2) {
   522	      const rippleWave = Math.sin(this.rippleTime * 4.0) * Math.exp(-this.rippleTime * 3.0);
   523	      rippleSquash = 1.0 + rippleWave * 0.08;
   524	      rippleStretch = 1.0 - rippleWave * 0.05;
   525	
   526	      this.recoilHop = Math.max(0, this.recoilHop - dt * 0.6);
   527	      this.pos.addScaledVector(this.recoilVelocity, dt);
   528	      this.recoilVelocity.multiplyScalar(0.82);
   529	    }
   530	
   531	    // 3. Periodic Group Formation Mode (Smooth unified groove)
   532	    if (inGroupFormation) {
   533	      this.targetPos.set(this.def.formationX, 0, this.def.formationZ);
   534	      this.pos.lerp(this.targetPos, 0.08);
   535	      this.group.position.x = this.pos.x;
   536	      this.group.position.z = this.pos.z;
   537	
   538	      const syncBeat = t * 3.2;
   539	      const hop = Math.abs(Math.sin(syncBeat));
   540	      const bounceY = hop * 0.18;
   541	      this.group.position.y = bounceY;
   542	
   543	      this.rotY = THREE.MathUtils.lerp(this.rotY, 0, 0.08);
   544	      this.group.rotation.y = this.rotY + Math.sin(t * 1.6) * 0.10;
   545	      this.group.rotation.z = Math.cos(syncBeat * 0.5) * 0.06;
   546	
   547	      this.modelPivot.scale.set(1.0 - (hop - 0.5) * 0.06, 1.0 + (hop - 0.5) * 0.12, 1.0 - (hop - 0.5) * 0.06);
   548	      return;
   549	    }
   550	
   551	    // 4. Wing Cheer Support Mode (For supporting dancers on stage wings)
   552	    if (this.isWingCheer) {
   553	      this.pos.lerp(this.wingPos, dt * 3.5);
   554	      this.rotY = this._lerpAngle(this.rotY, this.wingPos.x < 0 ? 0.35 : -0.35, 0.12);
   555	      const cheerHop = Math.abs(Math.sin(t * 2.0)) * 0.15;
   556	      const blendRate = Math.min(dt * 7.0, 1.0);
   557	      this.currentBounceY = THREE.MathUtils.lerp(this.currentBounceY, cheerHop, blendRate);
   558	      this.currentTiltX = THREE.MathUtils.lerp(this.currentTiltX, 0.05, blendRate);
   559	      this.currentSwayZ = THREE.MathUtils.lerp(this.currentSwayZ, Math.sin(t * 2.0) * 0.08, blendRate);
   560	      this.currentTwistY = THREE.MathUtils.lerp(this.currentTwistY, 0, blendRate);
   561	
   562	      this.group.position.set(this.pos.x, this.currentBounceY, this.pos.z);
   563	      this.group.rotation.set(this.currentTiltX, this.rotY, this.currentSwayZ);
   564	      this.modelPivot.scale.set(1.0, 1.0 + cheerHop * 0.12, 1.0);
   565	      return;
   566	    }
   567	
   568	    // 5. Partner Duet Routine Execution (Strict Standoff Separation >= 2.20m, Zero Merge Possible)
   569	    if (this.isPartnering) {
   570	      this.partnerTimer += dt;
   571	      const center = this.partnerCenter || this.pos;
   572	
   573	      switch (this.partnerRoutine) {
   574	        case 'DO_SI_DO': {
   575	          const orbitRadiusX = 1.15; // 2.30m separation between partners
   576	          const orbitRadiusZ = 0.70;
   577	          const orbitSpeed = 0.85; // Slow, graceful waltz orbit
   578	          const angle = (t * orbitSpeed) + (this.roleIndex === 0 ? 0 : Math.PI);
   579	          const targetX = center.x + Math.cos(angle) * orbitRadiusX;
   580	          const targetZ = center.z + Math.sin(angle) * orbitRadiusZ;
   581	
   582	          this.pos.x = THREE.MathUtils.lerp(this.pos.x, targetX, Math.min(dt * 4.0, 1.0));
   583	          this.pos.z = THREE.MathUtils.lerp(this.pos.z, targetZ, Math.min(dt * 4.0, 1.0));
   584	
   585	          // Face slightly inward towards partner
   586	          const toCenterX = center.x - this.pos.x;
   587	          const toCenterZ = center.z - this.pos.z;
   588	          const faceAngle = Math.atan2(toCenterX, toCenterZ);
   589	          this.rotY = this._lerpAngle(this.rotY, faceAngle, 0.12);
   590	
   591	          const hop = Math.pow(Math.abs(Math.sin(t * 2.0)), 1.3) * 0.20;
   592	          const blendRate = Math.min(dt * 8.0, 1.0);
   593	          this.currentBounceY = THREE.MathUtils.lerp(this.currentBounceY, hop, blendRate);
   594	          this.currentTiltX = THREE.MathUtils.lerp(this.currentTiltX, 0.05, blendRate);
   595	          this.currentSwayZ = THREE.MathUtils.lerp(this.currentSwayZ, Math.sin(t * 2.0) * 0.10, blendRate);
   596	
   597	          this.group.position.set(this.pos.x, this.currentBounceY, this.pos.z);
   598	          this.group.rotation.set(this.currentTiltX, this.rotY, this.currentSwayZ);
   599	          this.modelPivot.scale.set(1.0 - hop * 0.06, 1.0 + hop * 0.12, 1.0 - hop * 0.06);
   600	          return;
   601	        }
   602	        case 'MIRROR_DUET': {
   603	          const standoff = 1.15; // 2.30m separation facing each other
   604	          const sideSign = this.roleIndex === 0 ? -1 : 1;
   605	          const targetX = center.x + sideSign * standoff;
   606	          const targetZ = center.z;
   607	
   608	          this.pos.x = THREE.MathUtils.lerp(this.pos.x, targetX, Math.min(dt * 4.0, 1.0));
   609	          this.pos.z = THREE.MathUtils.lerp(this.pos.z, targetZ, Math.min(dt * 4.0, 1.0));
   610	
   611	          // Face directly towards partner
   612	          const faceAngle = sideSign < 0 ? Math.PI / 2 : -Math.PI / 2;
   613	          this.rotY = this._lerpAngle(this.rotY, faceAngle, 0.12);
   614	
   615	          // Symmetrical mirror dance: rhythmic synchronous sway and bounce
   616	          const mirrorBeat = t * 1.8;
   617	          const hop = Math.pow(Math.abs(Math.sin(mirrorBeat)), 1.3) * 0.22;
   618	          const mirrorSway = Math.sin(mirrorBeat) * 0.18 * sideSign;
   619	          const mirrorTilt = Math.sin(mirrorBeat * 0.5) * 0.12;
   620	
   621	          const blendRate = Math.min(dt * 8.0, 1.0);
   622	          this.currentBounceY = THREE.MathUtils.lerp(this.currentBounceY, hop, blendRate);
   623	          this.currentTiltX = THREE.MathUtils.lerp(this.currentTiltX, mirrorTilt, blendRate);
   624	          this.currentSwayZ = THREE.MathUtils.lerp(this.currentSwayZ, mirrorSway, blendRate);
   625	
   626	          this.group.position.set(this.pos.x, this.currentBounceY, this.pos.z);
   627	          this.group.rotation.set(this.currentTiltX, this.rotY, this.currentSwayZ);
   628	          this.modelPivot.scale.set(1.0 - hop * 0.08, 1.0 + hop * 0.15, 1.0 - hop * 0.08);
   629	          return;
   630	        }
   631	        case 'HIGH_FIVE_HOP':
   632	        default: {
   633	          const sideSign = this.roleIndex === 0 ? -1 : 1;
   634	          const cycle = (t * 1.35) % (Math.PI * 2);
   635	          const isInward = Math.sin(cycle) > 0;
   636	          const currentDist = isInward ? 0.95 : 1.30;
   637	          const targetX = center.x + sideSign * currentDist;
   638	          const targetZ = center.z;
   639	
   640	          this.pos.x = THREE.MathUtils.lerp(this.pos.x, targetX, Math.min(dt * 4.0, 1.0));
   641	          this.pos.z = THREE.MathUtils.lerp(this.pos.z, targetZ, Math.min(dt * 4.0, 1.0));
   642	
   643	          const faceAngle = sideSign < 0 ? Math.PI / 2 : -Math.PI / 2;
   644	          this.rotY = this._lerpAngle(this.rotY, faceAngle, 0.14);
   645	
   646	          const hop = isInward ? Math.pow(Math.sin(cycle), 1.2) * 0.38 : Math.abs(Math.sin(cycle * 2)) * 0.10;
   647	          const highStretch = isInward ? (1.0 + hop * 0.22) : 1.0;
   648	          const highTilt = sideSign * (isInward ? -0.15 : 0.05);
   649	
   650	          const blendRate = Math.min(dt * 8.0, 1.0);
   651	          this.currentBounceY = THREE.MathUtils.lerp(this.currentBounceY, hop, blendRate);
   652	          this.currentTiltX = THREE.MathUtils.lerp(this.currentTiltX, 0, blendRate);
   653	          this.currentSwayZ = THREE.MathUtils.lerp(this.currentSwayZ, highTilt, blendRate);
   654	
   655	          this.group.position.set(this.pos.x, this.currentBounceY, this.pos.z);
   656	          this.group.rotation.set(this.currentTiltX, this.rotY, this.currentSwayZ);
   657	          this.modelPivot.scale.set(1.0 - hop * 0.08, highStretch, 1.0 - hop * 0.08);
   658	          return;
   659	        }
   660	      }
   661	    }
   662	
   663	    // 6. Active Spatial Roaming (Only in Auto Freestyle Mode)
   664	    if (this.isRoaming && !this.forcedMove) {
   665	      const toTarget = new THREE.Vector2(this.targetPos.x - this.pos.x, this.targetPos.z - this.pos.z);
   666	      const dist = toTarget.length();
   667	
   668	      if (dist > 0.35) {
   669	        toTarget.normalize();
   670	        this.pos.x += toTarget.x * this.walkSpeed * dt;
   671	        this.pos.z += toTarget.y * this.walkSpeed * dt;
   672	
   673	        // Viewport boundary guard during roaming
   674	        const bnd = this.getEffectiveBounds();
   675	        const hitEdge = this.pos.x <= bnd.minX || this.pos.x >= bnd.maxX || this.pos.z <= bnd.minZ || this.pos.z >= bnd.maxZ;
   676	        this.pos.x = THREE.MathUtils.clamp(this.pos.x, bnd.minX, bnd.maxX);
   677	        this.pos.z = THREE.MathUtils.clamp(this.pos.z, bnd.minZ, bnd.maxZ);
   678	
   679	        if (hitEdge) {
   680	          this.pickNextRoamTarget();
   681	        }
   682	
   683	        const walkAngle = Math.atan2(toTarget.x, toTarget.y);
   684	        this.rotY = this._lerpAngle(this.rotY, walkAngle, 0.14);
   685	
   686	        this.walkCycle += dt * 3.0;
   687	        const walkBounce = Math.abs(Math.sin(this.walkCycle)) * 0.08;
   688	        const blendR = Math.min(dt * 7.0, 1.0);
   689	        this.currentBounceY = THREE.MathUtils.lerp(this.currentBounceY, walkBounce, blendR);
   690	        this.currentTiltX = THREE.MathUtils.lerp(this.currentTiltX, 0, blendR);
   691	        this.currentSwayZ = THREE.MathUtils.lerp(this.currentSwayZ, Math.sin(this.walkCycle) * 0.04, blendR);
   692	        this.currentTwistY = THREE.MathUtils.lerp(this.currentTwistY, 0, blendR);
   693	
   694	        this.group.position.set(this.pos.x, this.currentBounceY + this.recoilHop, this.pos.z);
   695	        this.group.rotation.set(this.currentTiltX, this.rotY + this.currentTwistY, this.currentSwayZ);
   696	
   697	        this.modelPivot.scale.set(rippleSquash, rippleStretch * (1.0 + this.currentBounceY * 0.12), rippleSquash);
   698	        return;
   699	      } else {
   700	        this.isRoaming = false;
   701	        this.targetRotY = (Math.random() - 0.5) * 0.5;
   702	        this.moveTimer = 0;
   703	      }
   704	    }
   705	
   706	    // Check Move Duration Expiry (Only in Auto Mode)
   707	    if (this.moveTimer >= this.moveDuration && !this.forcedMove) {
   708	      const busyMoves = allAgents.map(a => a.currentMove);
   709	      this.pickNewMove(busyMoves);
   710	    }
   711	
   712	    // Turn towards target angle smoothly
   713	    this.rotY = this._lerpAngle(this.rotY, this.targetRotY, 0.08);
   714	
   715	    const cycle = (beatTime * this.tempoRate) + this.dancePhase;
   716	    const highlightBoost = isSpotlightLead ? 1.25 : 1.0;
   717	
   718	    let bounceY = 0;
   719	    let stretchY = 1.0;
   720	    let squashXZ = 1.0;
   721	    let swayZ = 0;
   722	    let twistY = 0;
   723	    let tiltX = 0;
   724	    let offsetX = 0;
   725	    let offsetZ = 0;
   726	
   727	    // 7. Master Dance Engine: 11 Distinct, Slow, Smooth, High-Perfection Choreographies
   728	    switch (this.currentMove) {
   729	      case 'FUNKY_BOUNCE': {
   730	        const bounceHop = Math.pow(Math.abs(Math.sin(cycle)), 1.4);
   731	        bounceY = bounceHop * 0.38 * highlightBoost;
   732	        stretchY = 1.0 + (bounceHop - 0.4) * 0.22;
   733	        squashXZ = 1.0 - (bounceHop - 0.4) * 0.12;
   734	        swayZ = Math.sin(cycle * 0.5) * 0.18;
   735	        tiltX = Math.cos(cycle) * 0.12;
   736	        twistY = Math.sin(cycle * 0.5) * 0.20;
   737	        break;
   738	      }
   739	      case 'MOONWALK_GLIDE': {
   740	        const glidePhase = Math.sin(cycle * 0.5);
   741	        offsetZ = glidePhase * 0.42;
   742	        bounceY = Math.pow(Math.abs(Math.cos(cycle)), 1.2) * 0.14;
   743	        tiltX = -0.16 + Math.sin(cycle * 0.5) * 0.10;
   744	        twistY = Math.sin(cycle * 0.5) * 0.25;
   745	        swayZ = Math.cos(cycle) * 0.08;
   746	        break;
   747	      }
   748	      case 'SIDE_SHUFFLE': {
   749	        const sideTravel = Math.sin(cycle * 0.5);
   750	        offsetX = sideTravel * 0.50;
   751	        bounceY = Math.pow(Math.abs(Math.sin(cycle)), 1.3) * 0.22;
   752	        swayZ = -sideTravel * 0.22;
   753	        tiltX = Math.abs(Math.sin(cycle)) * 0.08;
   754	        twistY = sideTravel * 0.18;
   755	        break;
   756	      }
   757	      case 'HIP_ROLL_SWAY': {
   758	        offsetX = Math.cos(cycle * 0.5) * 0.28;
   759	        offsetZ = Math.sin(cycle) * 0.16;
   760	        swayZ = Math.cos(cycle * 0.5) * 0.24;
   761	        tiltX = Math.sin(cycle) * 0.18;
   762	        twistY = Math.sin(cycle * 0.5) * 0.32;
   763	        bounceY = 0.08 + Math.abs(Math.sin(cycle * 0.5)) * 0.10;
   764	        break;
   765	      }
   766	      case 'HEAD_BOB_NOD': {
   767	        const nodCycle = Math.sin(cycle);
   768	        tiltX = 0.10 + Math.max(0, nodCycle) * 0.32;
   769	        bounceY = Math.pow(Math.abs(Math.sin(cycle)), 1.2) * 0.20;
   770	        twistY = Math.sin(cycle * 0.5) * 0.22;
   771	        swayZ = Math.cos(cycle * 0.5) * 0.12;
   772	        stretchY = 1.0 + (tiltX - 0.15) * 0.15;
   773	        break;
   774	      }
   775	      case 'WAVE_BODY': {
   776	        const wavePhase = cycle * 0.8;
   777	        tiltX = Math.sin(wavePhase) * 0.28;
   778	        bounceY = 0.12 + Math.cos(wavePhase) * 0.16;
   779	        offsetZ = Math.sin(wavePhase) * 0.22;
   780	        stretchY = 1.0 + Math.sin(wavePhase) * 0.18;
   781	        squashXZ = 1.0 - Math.sin(wavePhase) * 0.10;
   782	        swayZ = Math.sin(wavePhase * 0.5) * 0.10;
   783	        break;
   784	      }
   785	      case 'DISCO_POINT': {
   786	        const pointPhase = Math.sin(cycle * 0.5);
   787	        const isReaching = Math.sin(cycle) > 0;
   788	        bounceY = isReaching ? 0.35 : 0.05;
   789	        tiltX = isReaching ? -0.22 : 0.15;
   790	        twistY = pointPhase * 0.55;
   791	        swayZ = pointPhase * 0.25;
   792	        stretchY = isReaching ? 1.25 : 0.88;
   793	        break;
   794	      }
   795	      case 'CHARLESTON_KICK': {
   796	        const swivel = Math.sin(cycle);
   797	        twistY = swivel * 0.52;
   798	        bounceY = Math.pow(Math.abs(Math.sin(cycle * 2.0)), 1.1) * 0.32;
   799	        swayZ = Math.cos(cycle) * 0.20;
   800	        tiltX = 0.06 + Math.sin(cycle) * 0.10;
   801	        break;
   802	      }
   803	      case 'SLIDE_AND_DROP': {
   804	        const slideProg = (cycle * 0.4) % (Math.PI * 2);
   805	        const isDropping = Math.sin(slideProg) < 0;
   806	        offsetX = Math.cos(slideProg) * 0.60;
   807	        bounceY = isDropping ? 0.02 : Math.sin(slideProg) * 0.42;
   808	        tiltX = isDropping ? 0.20 : -0.15;
   809	        swayZ = -Math.sin(slideProg) * 0.22;
   810	        break;
   811	      }
   812	      case 'TWIST_AND_SHOUT': {
   813	        twistY = Math.sin(cycle * 1.2) * 0.70;
   814	        bounceY = Math.abs(Math.cos(cycle * 1.2)) * 0.24;
   815	        swayZ = Math.sin(cycle * 0.6) * 0.16;
   816	        tiltX = 0.08 + Math.abs(Math.sin(cycle * 1.2)) * 0.08;
   817	        squashXZ = 1.0 + Math.abs(Math.sin(cycle * 1.2)) * 0.10;
   818	        stretchY = 1.0 - Math.abs(Math.sin(cycle * 1.2)) * 0.08;
   819	        break;
   820	      }
   821	      case 'FLOAT_HOVER':
   822	      default: {
   823	        bounceY = 0.48 + Math.sin(cycle * 0.6) * 0.22;
   824	        offsetX = Math.sin(cycle * 0.3) * 0.32;
   825	        offsetZ = Math.cos(cycle * 0.3) * 0.20;
   826	        tiltX = Math.sin(cycle * 0.3) * 0.14;
   827	        swayZ = Math.cos(cycle * 0.3) * 0.14;
   828	        twistY = Math.sin(cycle * 0.15) * 0.25;
   829	        stretchY = 1.05 + Math.sin(cycle * 0.6) * 0.08;
   830	        break;
   831	      }
   832	    }
   833	
   834	    // Spatial Anchor translation when performing dance moves
   835	    if (this.forcedMove) {
   836	      const targetPosX = this.danceAnchor.x + offsetX;
   837	      const targetPosZ = this.danceAnchor.z + offsetZ;
   838	      this.pos.x = THREE.MathUtils.lerp(this.pos.x, targetPosX, Math.min(dt * 5.0, 1.0));
   839	      this.pos.z = THREE.MathUtils.lerp(this.pos.z, targetPosZ, Math.min(dt * 5.0, 1.0));
   840	    }
   841	
   842	    // Dynamic boundary & corner encounter detection within the user's white box
   843	    const bounds = this.getEffectiveBounds();
   844	    const marginX = 0.35;
   845	    const marginZ = 0.15;
   846	    const nearLeft = (this.pos.x - bounds.minX) < marginX;
   847	    const nearRight = (bounds.maxX - this.pos.x) < marginX;
   848	    const nearBack = (this.pos.z - bounds.minZ) < marginZ;
   849	    const nearFront = (bounds.maxZ - this.pos.z) < marginZ;
   850	    const isAtBoundary = nearLeft || nearRight || nearBack || nearFront;

```


**Tool Call: Read file `Vedika\vedika\Vyomanta\frontend\app\engine\DiscoScene.js` (lines 850-1260)**
Status: Completed

```V0.1/Vedika/vedika/Vyomanta/frontend/app/engine/DiscoScene.js
   850	    const isAtBoundary = nearLeft || nearRight || nearBack || nearFront;
   851	
   852	    if (isAtBoundary && !inGroupFormation && !this.isPartnering && !this.forcedMove) {
   853	      if (nearLeft) this.pos.x += 1.6 * dt;
   854	      if (nearRight) this.pos.x -= 1.6 * dt;
   855	      if (nearBack) this.pos.z += 1.4 * dt;
   856	      if (nearFront) this.pos.z -= 1.4 * dt;
   857	
   858	      const inwardAngle = Math.atan2(-this.pos.x, -this.pos.z - 0.1);
   859	      this.rotY = this._lerpAngle(this.rotY, inwardAngle, 0.14);
   860	
   861	      if (this.isRoaming) {
   862	        const toTargetX = this.targetPos.x - this.pos.x;
   863	        const toTargetZ = this.targetPos.z - this.pos.z;
   864	        if ((nearLeft && toTargetX < 0) || (nearRight && toTargetX > 0) ||
   865	            (nearBack && toTargetZ < 0) || (nearFront && toTargetZ > 0)) {
   866	          this.pickNextRoamTarget();
   867	        }
   868	      }
   869	
   870	      this.moveTimer += dt * 2.5;
   871	      if (this.moveTimer >= 1.5 && !this.isRoaming) {
   872	        this.pickNextRoamTarget();
   873	      }
   874	    }
   875	
   876	    // Multi-channel continuous smoothing (eliminates all frame-to-frame popping or visual glitches)
   877	    const blendRate = Math.min(dt * 6.5, 1.0);
   878	    this.currentBounceY = THREE.MathUtils.lerp(this.currentBounceY, bounceY, blendRate);
   879	    this.currentTiltX = THREE.MathUtils.lerp(this.currentTiltX, tiltX, blendRate);
   880	    this.currentSwayZ = THREE.MathUtils.lerp(this.currentSwayZ, swayZ, blendRate);
   881	    this.currentTwistY = THREE.MathUtils.lerp(this.currentTwistY, twistY, blendRate);
   882	    this.currentStretchY = THREE.MathUtils.lerp(this.currentStretchY, stretchY, blendRate);
   883	    this.currentSquashXZ = THREE.MathUtils.lerp(this.currentSquashXZ, squashXZ, blendRate);
   884	
   885	    // Guaranteed Viewport Confinement: Strict white boundary box clamp
   886	    this.pos.x = THREE.MathUtils.clamp(this.pos.x, bounds.minX, bounds.maxX);
   887	    this.pos.z = THREE.MathUtils.clamp(this.pos.z, bounds.minZ, bounds.maxZ);
   888	
   889	    // Guaranteed Zero Submersion: Base sits exactly on top of floor Y=-2.18
   890	    this.group.position.set(this.pos.x, this.currentBounceY + this.recoilHop, this.pos.z);
   891	    this.group.rotation.set(this.currentTiltX, this.rotY + this.currentTwistY, this.currentSwayZ);
   892	
   893	    this.modelPivot.scale.set(
   894	      this.currentSquashXZ * rippleSquash,
   895	      this.currentStretchY * rippleStretch,
   896	      this.currentSquashXZ * rippleSquash
   897	    );
   898	  }
   899	}
   900	
   901	export class DiscoScene {
   902	  constructor(container) {
   903	    this.container = container;
   904	    this.isDisposed = false;
   905	    this.time = 0;
   906	    this.clock = new THREE.Clock();
   907	
   908	    this.isDayMode = false;
   909	    this.dayLerp = 0.0;
   910	
   911	    // Active Spotlight Studio Customizer State
   912	    this.spotlightConfig = { ...DEFAULT_SPOTLIGHT_CONFIG };
   913	
   914	    const width = container.clientWidth || window.innerWidth;
   915	    const height = container.clientHeight || window.innerHeight;
   916	
   917	    // 1. Optimized WebGL Renderer with High-Performance DPI Capping
   918	    const isCanvas = typeof HTMLCanvasElement !== 'undefined' && container instanceof HTMLCanvasElement;
   919	    this.renderer = new THREE.WebGLRenderer({
   920	      canvas: isCanvas ? container : undefined,
   921	      antialias: true,
   922	      alpha: false,
   923	      powerPreference: 'high-performance',
   924	      precision: 'mediump',
   925	      stencil: false,
   926	      depth: true
   927	    });
   928	    const area = width * height;
   929	    const targetDpr = area > 1920 * 1080 ? 1.0 : Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 1.25);
   930	    this.renderer.setPixelRatio(targetDpr);
   931	    this.renderer.setSize(width, height);
   932	    this.renderer.setClearColor(0x040407);
   933	    this.renderer.shadowMap.enabled = false;
   934	    if (!isCanvas) {
   935	      while (container.firstChild) {
   936	        container.removeChild(container.firstChild);
   937	      }
   938	      this.renderer.domElement.style.width = '100%';
   939	      this.renderer.domElement.style.height = '100%';
   940	      this.renderer.domElement.style.display = 'block';
   941	      container.appendChild(this.renderer.domElement);
   942	    }
   943	
   944	    this.renderer.domElement.addEventListener('webglcontextlost', (e) => {
   945	      e.preventDefault();
   946	      if (this.animId) cancelAnimationFrame(this.animId);
   947	    }, false);
   948	
   949	
   950	    // 2. Scene & Fog
   951	    this.scene = new THREE.Scene();
   952	    this.scene.fog = new THREE.FogExp2(0x040407, 0.035);
   953	
   954	    // 3. Camera Framed Closer & Focused on Large Mascots
   955	    this.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
   956	    this.camera.position.set(0, 0.75, 5.5);
   957	    this.camera.lookAt(0, -0.35, 0);
   958	
   959	    // 4. Room & Reflective Dance Floor
   960	    this.roomMat = new THREE.MeshStandardMaterial({ color: 0x07080e, roughness: 1.0, metalness: 0, side: THREE.BackSide });
   961	    this.room = new THREE.Mesh(new THREE.BoxGeometry(36, 20, 36), this.roomMat);
   962	    this.room.position.y = 1;
   963	    this.scene.add(this.room);
   964	
   965	    this.floorMat = new THREE.MeshStandardMaterial({ color: 0x0a0c16, roughness: 0.18, metalness: 0.72 });
   966	    this.floor = new THREE.Mesh(new THREE.PlaneGeometry(36, 36), this.floorMat);
   967	    this.floor.rotation.x = -Math.PI / 2;
   968	    this.floor.position.y = -2.2;
   969	    this.scene.add(this.floor);
   970	
   971	    // 5. Lighting Setup
   972	    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.32);
   973	    this.scene.add(this.ambientLight);
   974	
   975	    this.keyLight = new THREE.DirectionalLight(0xffffff, 0.85);
   976	    this.keyLight.position.set(0, 8, 4);
   977	    this.scene.add(this.keyLight);
   978	
   979	    this.sunLight = new THREE.DirectionalLight(0xffdfa8, 0.0);
   980	    this.sunLight.position.set(5, 9, 6);
   981	    this.scene.add(this.sunLight);
   982	
   983	    // 6. Shader Disco Ball & Hanging Wire
   984	    this._initDiscoBall();
   985	
   986	    // 7. 8 Orbiting Pin Spotlights
   987	    this._initSpotlights();
   988	
   989	    // 8. 200 Optimized Floating Glitter Particles
   990	    this._initParticles();
   991	
   992	    // 9. Vedika Chamber Volumetric Spotlight & Glowing Pedestal
   993	    this._initChamberSpotlight();
   994	
   995	    // 10. Mascot Avatars
   996	    this.avatars = [];
   997	    this.danceAgents = [];
   998	    this.avatarGroup = new THREE.Group();
   999	    this.avatarGroup.position.set(0, -2.18, 0); // Exact floor anchor
  1000	    this.scene.add(this.avatarGroup);
  1001	    this._loadDancingAvatars();
  1002	
  1003	    // Group Synchronized Formation State
  1004	    this.inGroupFormation = false;
  1005	    this.formationTimer = 0;
  1006	    this.nextFormationTime = 18.0 + Math.random() * 8.0;
  1007	
  1008	    // 11. Interactive Drag-to-spin Physics & Raycasting
  1009	    this.rotY = 0;
  1010	    this.velX = 0.014;
  1011	    this.isDragging = false;
  1012	    this.lastMX = 0;
  1013	    this.raycaster = new THREE.Raycaster();
  1014	    this.pointer = new THREE.Vector2();
  1015	
  1016	    // Scratch vectors for zero-GC allocation in 60 FPS loop
  1017	    this._tmpDir = new THREE.Vector3();
  1018	    this._tmpSrc = new THREE.Vector3();
  1019	    this._tmpMid = new THREE.Vector3();
  1020	    this._tmpDelta = new THREE.Vector3();
  1021	    this._tmpFwdA = new THREE.Vector3();
  1022	    this._tmpFwdB = new THREE.Vector3();
  1023	    this._tmpSideA = new THREE.Vector3();
  1024	    this._tmpSideB = new THREE.Vector3();
  1025	    this._tmpRecoilA = new THREE.Vector3();
  1026	
  1027	    this._onPointerDown = this._onPointerDown.bind(this);
  1028	    this._onPointerMove = this._onPointerMove.bind(this);
  1029	    this._onPointerUp = this._onPointerUp.bind(this);
  1030	    this._onResize = this._onResize.bind(this);
  1031	
  1032	    window.addEventListener('mousedown', this._onPointerDown);
  1033	    window.addEventListener('mousemove', this._onPointerMove);
  1034	    window.addEventListener('mouseup', this._onPointerUp);
  1035	    window.addEventListener('touchstart', this._onPointerDown, { passive: true });
  1036	    window.addEventListener('touchmove', this._onPointerMove, { passive: false });
  1037	    window.addEventListener('touchend', this._onPointerUp);
  1038	    window.addEventListener('resize', this._onResize);
  1039	
  1040	    // 12. Initial resize & Render Animation Loop
  1041	    this._onResize();
  1042	    this._animate = this._animate.bind(this);
  1043	    this.animId = requestAnimationFrame(this._animate);
  1044	  }
  1045	
  1046	  toggleTheme() {
  1047	    this.isDayMode = !this.isDayMode;
  1048	    return this.isDayMode;
  1049	  }
  1050	
  1051	  setTheme(isDay) {
  1052	    this.isDayMode = !!isDay;
  1053	    return this.isDayMode;
  1054	  }
  1055	
  1056	  // Interactive Dance Move Selector API
  1057	  triggerDanceMove(moveId, targetAvatarIdx = -1) {
  1058	    if (moveId === 'AUTO' || moveId === 'AUTO_GROOVE') {
  1059	      this.inGroupFormation = false;
  1060	      this.danceAgents.forEach(agent => {
  1061	        agent.forcedMove = false;
  1062	        agent.isPartnering = false;
  1063	        agent.isWingCheer = false;
  1064	        agent.isRoaming = true;
  1065	        agent.pickNextRoamTarget();
  1066	      });
  1067	      return;
  1068	    }
  1069	
  1070	    if (moveId === 'GROUP_FORMATION') {
  1071	      this.inGroupFormation = true;
  1072	      this.formationTimer = 0;
  1073	      this.danceAgents.forEach(agent => {
  1074	        agent.forcedMove = false;
  1075	        agent.isPartnering = false;
  1076	        agent.isWingCheer = false;
  1077	      });
  1078	      return;
  1079	    }
  1080	
  1081	    if (PAIR_MOVES.includes(moveId)) {
  1082	      this.inGroupFormation = false;
  1083	
  1084	      if (targetAvatarIdx >= 0 && this.danceAgents[targetAvatarIdx]) {
  1085	        // Mode 1: Spotlight Duet with Selected Avatar at Center Stage
  1086	        const mainIdx = targetAvatarIdx;
  1087	        const buddyIdx = (mainIdx % 2 === 0) ? mainIdx + 1 : mainIdx - 1;
  1088	        const centerStage = new THREE.Vector3(0.0, 0, -0.15);
  1089	
  1090	        this.danceAgents[mainIdx].startPartnerRoutine(buddyIdx, moveId, centerStage, 0);
  1091	        this.danceAgents[buddyIdx].startPartnerRoutine(mainIdx, moveId, centerStage, 1);
  1092	
  1093	        // Position the other two mascots at the wings as supportive backup dancers
  1094	        const others = [0, 1, 2, 3].filter(i => i !== mainIdx && i !== buddyIdx);
  1095	        if (others.length >= 2) {
  1096	          this.danceAgents[others[0]].setWingCheer(new THREE.Vector3(-2.30, 0, -0.10));
  1097	          this.danceAgents[others[1]].setWingCheer(new THREE.Vector3(2.30, 0, -0.10));
  1098	        }
  1099	
  1100	        this.activeSpotlightIndex = mainIdx;
  1101	        this.chamberTargetColor.set(this.danceAgents[mainIdx].def.threeColor);
  1102	      } else {
  1103	        // Mode 2: Synchronized Dual Duets in 2 Dedicated Non-Overlapping Stage Halves
  1104	        // Pair A (Mowgli & Belle) on Stage Left (center X = -1.60)
  1105	        // Pair B (Moana & Bhageera) on Stage Right (center X = +1.60)
  1106	        // Center A and Center B separated by 3.20m -> IMPOSSIBLE TO MERGE!
  1107	        if (this.danceAgents.length >= 4) {
  1108	          const centerLeft = new THREE.Vector3(-1.60, 0, -0.15);
  1109	          this.danceAgents[0].startPartnerRoutine(1, moveId, centerLeft, 0);
  1110	          this.danceAgents[1].startPartnerRoutine(0, moveId, centerLeft, 1);
  1111	
  1112	          const centerRight = new THREE.Vector3(1.60, 0, -0.15);
  1113	          this.danceAgents[2].startPartnerRoutine(3, moveId, centerRight, 0);
  1114	          this.danceAgents[3].startPartnerRoutine(2, moveId, centerRight, 1);
  1115	        } else if (this.danceAgents.length >= 2) {
  1116	          const centerStage = new THREE.Vector3(0.0, 0, -0.15);
  1117	          this.danceAgents[0].startPartnerRoutine(1, moveId, centerStage, 0);
  1118	          this.danceAgents[1].startPartnerRoutine(0, moveId, centerStage, 1);
  1119	        }
  1120	      }
  1121	      return;
  1122	    }
  1123	
  1124	    // Solo Dance Moves
  1125	    this.inGroupFormation = false;
  1126	    if (targetAvatarIdx >= 0 && this.danceAgents[targetAvatarIdx]) {
  1127	      this.danceAgents[targetAvatarIdx].setExplicitMove(moveId);
  1128	      this.activeSpotlightIndex = targetAvatarIdx;
  1129	      this.chamberTargetColor.set(this.danceAgents[targetAvatarIdx].def.threeColor);
  1130	      // Other avatars perform supportive groove with slightly calmer tempo
  1131	      this.danceAgents.forEach((agent, idx) => {
  1132	        if (idx !== targetAvatarIdx) {
  1133	          agent.setExplicitMove('FUNKY_BOUNCE');
  1134	          agent.tempoRate = 0.85;
  1135	        }
  1136	      });
  1137	    } else {
  1138	      // Apply to all avatars in sync
  1139	      this.danceAgents.forEach(agent => {
  1140	        agent.setExplicitMove(moveId);
  1141	        agent.tempoRate = 1.0;
  1142	      });
  1143	    }
  1144	  }
  1145	
  1146	  // ── Spotlight Tuner Studio API ──────────────────────────────
  1147	  getSpotlightConfig() {
  1148	    return { ...this.spotlightConfig };
  1149	  }
  1150	
  1151	  setSpotlightConfig(partialConfig) {
  1152	    if (!partialConfig) return;
  1153	    Object.assign(this.spotlightConfig, partialConfig);
  1154	    this._applySpotlightConfig();
  1155	  }
  1156	
  1157	  _rebuildBeamGeometry() {
  1158	    if (!this.chamberBeam) return;
  1159	    const cfg = this.spotlightConfig;
  1160	    if (this.chamberBeam.geometry) this.chamberBeam.geometry.dispose();
  1161	    this.chamberBeam.geometry = new THREE.CylinderGeometry(
  1162	      cfg.topRadius,
  1163	      cfg.bottomRadius,
  1164	      cfg.beamHeight,
  1165	      36,
  1166	      1,
  1167	      true
  1168	    );
  1169	    this.chamberBeam.position.y = cfg.beamHeight * 0.5;
  1170	  }
  1171	
  1172	  _applySpotlightConfig() {
  1173	    if (!this.spotlightConfig) return;
  1174	    const cfg = this.spotlightConfig;
  1175	
  1176	    if (this.chamberBeamMat && this.chamberBeamMat.uniforms) {
  1177	      if (this.chamberBeamMat.uniforms.uIntensity) {
  1178	        this.chamberBeamMat.uniforms.uIntensity.value = cfg.beamIntensity;
  1179	      }
  1180	      if (this.chamberBeamMat.uniforms.uOpacity) {
  1181	        this.chamberBeamMat.uniforms.uOpacity.value = cfg.beamOpacity;
  1182	      }
  1183	      if (this.chamberBeamMat.uniforms.uFadePower) {
  1184	        this.chamberBeamMat.uniforms.uFadePower.value = cfg.beamFadePower;
  1185	      }
  1186	    }
  1187	
  1188	    if (this.chamberTopSpotLight) {
  1189	      this.chamberTopSpotLight.intensity = cfg.spotIntensity;
  1190	      this.chamberTopSpotLight.angle = cfg.spotAngle;
  1191	      this.chamberTopSpotLight.penumbra = cfg.spotPenumbra;
  1192	      this.chamberTopSpotLight.position.y = cfg.beamHeight ? (cfg.beamHeight * 0.72) : 3.8;
  1193	    }
  1194	
  1195	    if (this.pedestalGroup) {
  1196	      this.pedestalGroup.visible = !!cfg.showFloorDisk;
  1197	    }
  1198	
  1199	    // If focus mode locked to an avatar, update immediately
  1200	    if (cfg.focusMode && cfg.focusMode !== 'AUTO') {
  1201	      const targetIdx = AVATAR_DEFS.findIndex(d => d.id === cfg.focusMode);
  1202	      if (targetIdx >= 0) {
  1203	        this.activeSpotlightIndex = targetIdx;
  1204	        this.chamberTargetColor.set(AVATAR_DEFS[targetIdx].threeColor);
  1205	      }
  1206	    }
  1207	
  1208	    this._rebuildBeamGeometry();
  1209	  }
  1210	
  1211	  _initDiscoBall() {
  1212	    const wirePts = [new THREE.Vector3(0, 6.5, 0), new THREE.Vector3(0, 3.2, 0)];
  1213	    const wireGeo = new THREE.BufferGeometry().setFromPoints(wirePts);
  1214	    this.wire = new THREE.Line(wireGeo, new THREE.LineBasicMaterial({ color: 0x555555 }));
  1215	    this.scene.add(this.wire);
  1216	
  1217	    this.NUM_SPOTS = 8;
  1218	    this.spotDirs = [];
  1219	    this.spotCols = [];
  1220	    const hues = [0.0, 0.08, 0.18, 0.33, 0.50, 0.62, 0.75, 0.88];
  1221	    for (let i = 0; i < this.NUM_SPOTS; i++) {
  1222	      const rgb = hsvToRgb(hues[i], 1.0, 1.0);
  1223	      this.spotCols.push(new THREE.Vector3(rgb[0], rgb[1], rgb[2]));
  1224	      this.spotDirs.push(new THREE.Vector3());
  1225	    }
  1226	
  1227	    this.ballMat = new THREE.ShaderMaterial({
  1228	      vertexShader: BALL_VERTEX_SHADER,
  1229	      fragmentShader: BALL_FRAGMENT_SHADER,
  1230	      uniforms: {
  1231	        uCam: { value: this.camera.position },
  1232	        uTime: { value: 0.0 },
  1233	        uSpots: { value: this.spotDirs },
  1234	        uSpotCols: { value: this.spotCols },
  1235	        uDayFactor: { value: 0.0 },
  1236	      },
  1237	    });
  1238	
  1239	    const ballGeo = new THREE.SphereGeometry(1.2, 40, 40);
  1240	    this.ball = new THREE.Mesh(ballGeo, this.ballMat);
  1241	    this.ball.position.set(0, 2.2, 0);
  1242	    this.scene.add(this.ball);
  1243	  }
  1244	
  1245	  _initSpotlights() {
  1246	    this.spotMeshes = [];
  1247	    this.beamMats = [];
  1248	    this.beams = [];
  1249	    this.floorSpots = [];
  1250	
  1251	    const SPOT_COLORS = [0xff2020, 0xff8800, 0xffee00, 0x00ff44, 0x00eeff, 0x2244ff, 0xcc00ff, 0xff00aa];
  1252	
  1253	    for (let i = 0; i < 8; i++) {
  1254	      const disc = new THREE.Mesh(
  1255	        new THREE.CircleGeometry(0.08, 12),
  1256	        new THREE.MeshBasicMaterial({ color: SPOT_COLORS[i], transparent: true, opacity: 0.9, side: THREE.DoubleSide })
  1257	      );
  1258	      this.scene.add(disc);
  1259	      this.spotMeshes.push(disc);
  1260	

```


**Tool Call: Read file `Vedika\vedika\Vyomanta\frontend\app\engine\DiscoScene.js` (lines 1260-1730)**
Status: Completed

```V0.1/Vedika/vedika/Vyomanta/frontend/app/engine/DiscoScene.js
  1260	
  1261	      const bm = new THREE.MeshBasicMaterial({
  1262	        color: SPOT_COLORS[i],
  1263	        transparent: true,
  1264	        opacity: 0.035,
  1265	        blending: THREE.AdditiveBlending,
  1266	        depthWrite: false,
  1267	        side: THREE.DoubleSide,
  1268	      });
  1269	      this.beamMats.push(bm);
  1270	      const bGeo = new THREE.CylinderGeometry(0.02, 0.35, 8, 8, 1, true);
  1271	      const beam = new THREE.Mesh(bGeo, bm);
  1272	      this.scene.add(beam);
  1273	      this.beams.push(beam);
  1274	
  1275	      const fs = new THREE.Mesh(
  1276	        new THREE.CircleGeometry(0.55, 16),
  1277	        new THREE.MeshBasicMaterial({
  1278	          color: SPOT_COLORS[i],
  1279	          transparent: true,
  1280	          opacity: 0.0,
  1281	          blending: THREE.AdditiveBlending,
  1282	          depthWrite: false,
  1283	        })
  1284	      );
  1285	      fs.rotation.x = -Math.PI / 2;
  1286	      fs.position.y = -2.19;
  1287	      this.scene.add(fs);
  1288	      this.floorSpots.push(fs);
  1289	    }
  1290	  }
  1291	
  1292	  _initParticles() {
  1293	    const pCount = 100; // Ultra-fast lightweight sparkling dust
  1294	    const pGeo = new THREE.BufferGeometry();
  1295	    const pPos = new Float32Array(pCount * 3);
  1296	    const pCols = new Float32Array(pCount * 3);
  1297	
  1298	    for (let i = 0; i < pCount; i++) {
  1299	      pPos[i * 3 + 0] = (Math.random() - 0.5) * 20;
  1300	      pPos[i * 3 + 1] = -2.0 + Math.random() * 8.5;
  1301	      pPos[i * 3 + 2] = (Math.random() - 0.5) * 20;
  1302	
  1303	      const rgb = hsvToRgb(Math.random(), 0.8, 1.0);
  1304	      pCols[i * 3 + 0] = rgb[0];
  1305	      pCols[i * 3 + 1] = rgb[1];
  1306	      pCols[i * 3 + 2] = rgb[2];
  1307	    }
  1308	
  1309	    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  1310	    pGeo.setAttribute('color', new THREE.BufferAttribute(pCols, 3));
  1311	
  1312	    this.particles = new THREE.Points(
  1313	      pGeo,
  1314	      new THREE.PointsMaterial({
  1315	        size: 0.045,
  1316	        vertexColors: true,
  1317	        transparent: true,
  1318	        opacity: 0.65,
  1319	        blending: THREE.AdditiveBlending,
  1320	        depthWrite: false,
  1321	      })
  1322	    );
  1323	    this.scene.add(this.particles);
  1324	  }
  1325	
  1326	  _initChamberSpotlight() {
  1327	    this.chamberTargetPos = new THREE.Vector3(-1.9, -2.18, 0.1);
  1328	    this.chamberCurrentPos = new THREE.Vector3(-1.9, -2.18, 0.1);
  1329	    this.chamberColor = new THREE.Color(0x39FF14);
  1330	    this.chamberTargetColor = new THREE.Color(0x39FF14);
  1331	    this.activeSpotlightIndex = 0;
  1332	    this.lastSpotlightSwitch = 0;
  1333	
  1334	    const cfg = this.spotlightConfig;
  1335	    if (cfg && cfg.focusMode && cfg.focusMode !== 'AUTO') {
  1336	      const initIdx = AVATAR_DEFS.findIndex(d => d.id === cfg.focusMode);
  1337	      if (initIdx >= 0) {
  1338	        this.activeSpotlightIndex = initIdx;
  1339	        this.chamberColor.set(AVATAR_DEFS[initIdx].threeColor);
  1340	        this.chamberTargetColor.set(AVATAR_DEFS[initIdx].threeColor);
  1341	      }
  1342	    }
  1343	
  1344	    // 1. Vertical Volumetric Light Rays Column (Pure Avatar Color - Softly Faded)
  1345	    // Height and radii dynamically customizable via Spotlight Studio Tuner
  1346	    this.chamberBeamGroup = new THREE.Group();
  1347	    this.chamberBeamGroup.position.set(this.chamberCurrentPos.x, -2.18, this.chamberCurrentPos.z);
  1348	
  1349	    const BEAM_HEIGHT = cfg.beamHeight || 5.8;
  1350	    const coneGeo = new THREE.CylinderGeometry(
  1351	      cfg.topRadius || 0.20,
  1352	      cfg.bottomRadius || 1.65,
  1353	      BEAM_HEIGHT,
  1354	      36,
  1355	      1,
  1356	      true
  1357	    );
  1358	    this.chamberBeamMat = new THREE.ShaderMaterial({
  1359	      vertexShader: CHAMBER_BEAM_VERTEX_SHADER,
  1360	      fragmentShader: CHAMBER_BEAM_FRAGMENT_SHADER,
  1361	      uniforms: {
  1362	        uTime: { value: 0 },
  1363	        uColor: { value: this.chamberColor },
  1364	        uIntensity: { value: cfg.beamIntensity || 0.85 },
  1365	        uOpacity: { value: cfg.beamOpacity || 0.38 },
  1366	        uFadePower: { value: cfg.beamFadePower || 1.4 },
  1367	      },
  1368	      transparent: true,
  1369	      blending: THREE.AdditiveBlending,
  1370	      depthWrite: false,
  1371	      side: THREE.DoubleSide,
  1372	    });
  1373	    this.chamberBeam = new THREE.Mesh(coneGeo, this.chamberBeamMat);
  1374	    this.chamberBeam.position.y = BEAM_HEIGHT * 0.5; // Centered vertically so base is at floor Y=0 local
  1375	    this.chamberBeamGroup.add(this.chamberBeam);
  1376	
  1377	    // NOTE: White inner ray core is purposely removed to prevent bleaching/shading the avatar's color.
  1378	    // The spotlight renders 100% pure avatar color, softly faded without white shades.
  1379	
  1380	    this.scene.add(this.chamberBeamGroup);
  1381	
  1382	    // 2. Real Overhead 3D Spotlight (Targeting the focused mascot)
  1383	    this.chamberSpotTarget = new THREE.Object3D();
  1384	    this.chamberSpotTarget.position.set(this.chamberCurrentPos.x, -2.18, this.chamberCurrentPos.z);
  1385	    this.scene.add(this.chamberSpotTarget);
  1386	
  1387	    const spotH = cfg.beamHeight ? (cfg.beamHeight * 0.72) : 3.8;
  1388	    this.chamberTopSpotLight = new THREE.SpotLight(
  1389	      this.chamberColor,
  1390	      cfg.spotIntensity || 4.2,
  1391	      16,
  1392	      cfg.spotAngle || 0.65,
  1393	      cfg.spotPenumbra || 0.6
  1394	    );
  1395	    this.chamberTopSpotLight.position.set(this.chamberCurrentPos.x, spotH, this.chamberCurrentPos.z + 0.35);
  1396	    this.chamberTopSpotLight.target = this.chamberSpotTarget;
  1397	    this.scene.add(this.chamberTopSpotLight);
  1398	
  1399	    // 3. Radiant Back Halo Rim Light
  1400	    this.chamberBackHalo = new THREE.PointLight(this.chamberColor, 2.8, 8, 1.2);
  1401	    this.chamberBackHalo.position.set(this.chamberCurrentPos.x, -0.8, this.chamberCurrentPos.z - 0.8);
  1402	    this.scene.add(this.chamberBackHalo);
  1403	
  1404	    // 4. Floor Pedestal Rings (REMOVED BY DEFAULT as requested: "remove the disk that is coming below at the spotlight")
  1405	    this.pedestalGroup = new THREE.Group();
  1406	    this.pedestalGroup.position.set(this.chamberCurrentPos.x, -2.18, this.chamberCurrentPos.z);
  1407	    this.pedestalGroup.visible = !!cfg.showFloorDisk; // Hidden by default
  1408	
  1409	    const poolGeo = new THREE.CircleGeometry(1.65, 32);
  1410	    this.pedestalPoolMat = new THREE.MeshBasicMaterial({
  1411	      color: 0x39FF14,
  1412	      transparent: true,
  1413	      opacity: 0.45,
  1414	      blending: THREE.AdditiveBlending,
  1415	      depthWrite: false,
  1416	    });
  1417	    const pool = new THREE.Mesh(poolGeo, this.pedestalPoolMat);
  1418	    pool.rotation.x = -Math.PI / 2;
  1419	    this.pedestalGroup.add(pool);
  1420	
  1421	    const innerRingGeo = new THREE.RingGeometry(1.15, 1.25, 48);
  1422	    this.pedestalRingMat = new THREE.MeshBasicMaterial({
  1423	      color: 0x39FF14,
  1424	      transparent: true,
  1425	      opacity: 0.88,
  1426	      blending: THREE.AdditiveBlending,
  1427	      depthWrite: false,
  1428	      side: THREE.DoubleSide,
  1429	    });
  1430	    const innerRing = new THREE.Mesh(innerRingGeo, this.pedestalRingMat);
  1431	    innerRing.rotation.x = -Math.PI / 2;
  1432	    innerRing.position.y = 0.01;
  1433	    this.pedestalGroup.add(innerRing);
  1434	
  1435	    const outerRingGeo = new THREE.RingGeometry(1.5, 1.62, 48);
  1436	    this.pedestalOuterRingMat = new THREE.MeshBasicMaterial({
  1437	      color: 0x39FF14,
  1438	      transparent: true,
  1439	      opacity: 0.58,
  1440	      blending: THREE.AdditiveBlending,
  1441	      depthWrite: false,
  1442	      side: THREE.DoubleSide,
  1443	    });
  1444	    const outerRing = new THREE.Mesh(outerRingGeo, this.pedestalOuterRingMat);
  1445	    outerRing.rotation.x = -Math.PI / 2;
  1446	    outerRing.position.y = 0.01;
  1447	    this.pedestalGroup.add(outerRing);
  1448	
  1449	    this.scene.add(this.pedestalGroup);
  1450	  }
  1451	
  1452	
  1453	  _loadDancingAvatars() {
  1454	    const texLoader = new THREE.TextureLoader();
  1455	
  1456	    loadGLBModelOptimized()
  1457	      .then((gltf) => {
  1458	        if (this.isDisposed) return;
  1459	
  1460	        AVATAR_DEFS.forEach((buddy, idx) => {
  1461	          const clone = gltf.scene.clone(true);
  1462	
  1463	          const rawBox = new THREE.Box3().setFromObject(clone);
  1464	          const rawSize = rawBox.getSize(new THREE.Vector3());
  1465	          const maxDim = Math.max(rawSize.x, rawSize.y, rawSize.z);
  1466	
  1467	          // Prominent, beautiful mascot scale: 1.05 (clear, large, detailed, and high-impact)
  1468	          const targetScale = 1.05;
  1469	          const uniformScale = targetScale / maxDim;
  1470	          clone.scale.setScalar(uniformScale);
  1471	
  1472	          clone.updateMatrixWorld(true);
  1473	          const scaledBox = new THREE.Box3().setFromObject(clone);
  1474	          const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
  1475	
  1476	          // Center horizontally and anchor bottom vertex strictly to Y = 0
  1477	          clone.position.x = -scaledCenter.x;
  1478	          clone.position.z = -scaledCenter.z;
  1479	          clone.position.y = -scaledBox.min.y; // Lowest mesh point pinned to Y=0!
  1480	
  1481	          const tex = texLoader.load(buddy.texture);
  1482	          tex.flipY = false;
  1483	          tex.colorSpace = THREE.SRGBColorSpace;
  1484	
  1485	          clone.traverse((child) => {
  1486	            if (child.isMesh && child.material) {
  1487	              child.material = child.material.clone();
  1488	              child.material.map = tex;
  1489	              child.material.color.set('#FFFFFF');
  1490	              child.material.roughness = 0.35;
  1491	              child.material.metalness = 0.05;
  1492	              child.material.needsUpdate = true;
  1493	            }
  1494	          });
  1495	
  1496	          // Click detection hit sphere
  1497	          const hitSphere = new THREE.Mesh(
  1498	            new THREE.SphereGeometry(targetScale * 0.65, 16, 16),
  1499	            new THREE.MeshBasicMaterial({ visible: false })
  1500	          );
  1501	          hitSphere.position.set(0, targetScale * 0.5, 0);
  1502	          hitSphere.userData = { avatarIdx: idx, buddy };
  1503	
  1504	          // Bottom-anchored pivot group
  1505	          const modelPivot = new THREE.Group();
  1506	          modelPivot.add(clone);
  1507	          modelPivot.add(hitSphere);
  1508	
  1509	          // Outer avatar group positioned on the dance floor
  1510	          const avGroup = new THREE.Group();
  1511	          avGroup.add(modelPivot);
  1512	          this.avatarGroup.add(avGroup);
  1513	
  1514	          // Create autonomous mascot dance agent
  1515	          const agent = new MascotDanceAgent(avGroup, modelPivot, clone, buddy, idx, targetScale);
  1516	          this.danceAgents.push(agent);
  1517	          this.avatars.push({ group: avGroup, model: clone, buddy, index: idx });
  1518	        });
  1519	      })
  1520	      .catch((err) => {
  1521	        console.error('Failed to load avatars into disco dance floor:', err);
  1522	      });
  1523	  }
  1524	
  1525	  _onPointerDown(e) {
  1526	    this.isDragging = true;
  1527	    this.lastMX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
  1528	
  1529	    const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
  1530	    const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
  1531	
  1532	    const rect = this.renderer.domElement.getBoundingClientRect();
  1533	    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  1534	    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  1535	
  1536	    this.raycaster.setFromCamera(this.pointer, this.camera);
  1537	    const intersects = this.raycaster.intersectObjects(this.avatarGroup.children, true);
  1538	
  1539	    for (let hit of intersects) {
  1540	      let cur = hit.object;
  1541	      while (cur) {
  1542	        if (cur.userData && cur.userData.avatarIdx !== undefined) {
  1543	          const idx = cur.userData.avatarIdx;
  1544	          if (this.danceAgents[idx]) {
  1545	            this.danceAgents[idx].triggerCheer();
  1546	            this.activeSpotlightIndex = idx;
  1547	            this.chamberTargetColor.set(this.danceAgents[idx].def.threeColor);
  1548	          }
  1549	          return;
  1550	        }
  1551	        cur = cur.parent;
  1552	      }
  1553	    }
  1554	  }
  1555	
  1556	  _onPointerMove(e) {
  1557	    if (!this.isDragging) return;
  1558	    const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
  1559	    const dx = clientX - this.lastMX;
  1560	    this.lastMX = clientX;
  1561	    this.velX = dx * 0.007;
  1562	    this.rotY += this.velX;
  1563	  }
  1564	
  1565	  _onPointerUp() {
  1566	    this.isDragging = false;
  1567	  }
  1568	
  1569	  _onResize() {
  1570	    if (this.isDisposed) return;
  1571	    const width = this.container.clientWidth || window.innerWidth;
  1572	    const height = this.container.clientHeight || window.innerHeight;
  1573	    this.camera.aspect = width / height;
  1574	    this.camera.updateProjectionMatrix();
  1575	
  1576	    const area = width * height;
  1577	    const targetDpr = area > 1920 * 1080 ? 1.0 : Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 1.25);
  1578	    this.renderer.setPixelRatio(targetDpr);
  1579	    this.renderer.setSize(width, height);
  1580	  }
  1581	
  1582	  _handleCollisionsAndPairing(dt = 0.016) {
  1583	    const agents = this.danceAgents;
  1584	    const count = agents.length;
  1585	    if (count < 2) return;
  1586	
  1587	    const MIN_SEPARATION = 1.80; // Absolute physical body separation (avatars NEVER penetrate)
  1588	    const AVOIDANCE_RADIUS = 2.60; // Proactive steering repulsion zone
  1589	
  1590	    for (let i = 0; i < count; i++) {
  1591	      for (let j = i + 1; j < count; j++) {
  1592	        const a = agents[i];
  1593	        const b = agents[j];
  1594	        if (!a || !b) continue;
  1595	
  1596	        // If both agents are in the same partner duet pair, their choreographed separation is already strictly enforced
  1597	        if (a.isPartnering && b.isPartnering && a.partnerIndex === j) continue;
  1598	
  1599	        this._tmpDelta.copy(b.pos).sub(a.pos);
  1600	        this._tmpDelta.y = 0;
  1601	        const dist = this._tmpDelta.length();
  1602	
  1603	        if (dist < 0.01) {
  1604	          // Extremely close or on top: assign safe separation vector
  1605	          this._tmpDelta.set(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
  1606	        } else {
  1607	          this._tmpDelta.multiplyScalar(1.0 / dist);
  1608	        }
  1609	
  1610	        // 1. Proactive Steering (Only for free roaming avatars)
  1611	        if (dist < AVOIDANCE_RADIUS) {
  1612	          const steerFactor = Math.pow(1.0 - (dist / AVOIDANCE_RADIUS), 1.4) * 2.5;
  1613	          if (a.isRoaming && !a.forcedMove) a.pos.addScaledVector(this._tmpDelta, -steerFactor * 0.02);
  1614	          if (b.isRoaming && !b.forcedMove) b.pos.addScaledVector(this._tmpDelta, steerFactor * 0.02);
  1615	
  1616	          this._tmpFwdA.set(Math.sin(a.rotY), 0, Math.cos(a.rotY));
  1617	          this._tmpFwdB.set(Math.sin(b.rotY), 0, Math.cos(b.rotY));
  1618	
  1619	          const aFacingB = this._tmpFwdA.dot(this._tmpDelta) > 0.15;
  1620	          const bFacingA = this._tmpFwdB.dot(this._tmpDelta) < -0.15;
  1621	
  1622	          if (aFacingB && bFacingA) {
  1623	            if (a.isRoaming && !a.forcedMove) {
  1624	              this._tmpSideA.set(-this._tmpFwdA.z, 0, this._tmpFwdA.x).multiplyScalar(0.05);
  1625	              a.pos.add(this._tmpSideA);
  1626	              if (dist < 2.0) a.pickNextRoamTarget();
  1627	            }
  1628	            if (b.isRoaming && !b.forcedMove) {
  1629	              this._tmpSideB.set(-this._tmpFwdB.z, 0, this._tmpFwdB.x).multiplyScalar(0.05);
  1630	              b.pos.add(this._tmpSideB);
  1631	              if (dist < 2.0) b.pickNextRoamTarget();
  1632	            }
  1633	          }
  1634	        }
  1635	
  1636	        // 2. Guaranteed Minimum Rigid Separation (NEVER GET INTO EACH OTHER)
  1637	        if (dist < MIN_SEPARATION) {
  1638	          const overlap = (MIN_SEPARATION - dist) * 0.52;
  1639	          a.pos.addScaledVector(this._tmpDelta, -overlap);
  1640	          b.pos.addScaledVector(this._tmpDelta, overlap);
  1641	
  1642	          // Trigger soft recoil only for free roaming agents
  1643	          if (a.isRoaming && !a.forcedMove && !a.isPartnering && !a.isWingCheer) {
  1644	            this._tmpRecoilA.copy(this._tmpDelta).negate();
  1645	            a.triggerCollisionRipple(this._tmpRecoilA);
  1646	          }
  1647	          if (b.isRoaming && !b.forcedMove && !b.isPartnering && !b.isWingCheer) {
  1648	            b.triggerCollisionRipple(this._tmpDelta);
  1649	          }
  1650	        }
  1651	      }
  1652	    }
  1653	
  1654	    // Ensure all agents remain strictly within the user's white boundary box after all steering & repulsion
  1655	    for (let i = 0; i < count; i++) {
  1656	      const ag = agents[i];
  1657	      if (!ag) continue;
  1658	      const bnd = ag.getEffectiveBounds();
  1659	      ag.pos.x = THREE.MathUtils.clamp(ag.pos.x, bnd.minX, bnd.maxX);
  1660	      ag.pos.z = THREE.MathUtils.clamp(ag.pos.z, bnd.minZ, bnd.maxZ);
  1661	    }
  1662	  }
  1663	
  1664	  _animate() {
  1665	    if (this.isDisposed) return;
  1666	    // Always schedule next frame first to guarantee the render loop never halts
  1667	    this.animId = requestAnimationFrame(this._animate);
  1668	
  1669	    try {
  1670	      const dt = Math.min(this.clock.getDelta(), 0.05);
  1671	      this.time += dt;
  1672	      const t = this.time;
  1673	      const beatTime = t * 1.85; // Slow, smooth, elegant, relaxed disco groove (approx 68-72 BPM half-time tempo)
  1674	
  1675	      // 1. Day / Night Theme Transition Lerp
  1676	      const targetDay = this.isDayMode ? 1.0 : 0.0;
  1677	      this.dayLerp = THREE.MathUtils.lerp(this.dayLerp, targetDay, dt * 2.5);
  1678	      const day = this.dayLerp;
  1679	
  1680	      const nightFog = new THREE.Color(0x040407);
  1681	      const morningFog = new THREE.Color(0xFFE8D6);
  1682	      this.scene.fog.color.lerpColors(nightFog, morningFog, day);
  1683	      this.renderer.setClearColor(this.scene.fog.color);
  1684	
  1685	      const nightRoom = new THREE.Color(0x07080e);
  1686	      const morningRoom = new THREE.Color(0xFDEEE2);
  1687	      this.roomMat.color.lerpColors(nightRoom, morningRoom, day);
  1688	
  1689	      const nightFloor = new THREE.Color(0x0a0c16);
  1690	      const morningFloor = new THREE.Color(0xF5EBE1);
  1691	      this.floorMat.color.lerpColors(nightFloor, morningFloor, day);
  1692	
  1693	      this.ambientLight.intensity = THREE.MathUtils.lerp(0.32, 0.95, day);
  1694	      this.keyLight.intensity = THREE.MathUtils.lerp(0.85, 0.55, day);
  1695	      this.sunLight.intensity = day * 1.35;
  1696	
  1697	      // 2. Ball Spin Physics
  1698	      if (!this.isDragging) {
  1699	        this.velX += (0.012 - this.velX) * 0.03;
  1700	        this.rotY += this.velX;
  1701	      }
  1702	      this.ball.rotation.y = this.rotY;
  1703	      this.ballMat.uniforms.uTime.value = t;
  1704	      this.ballMat.uniforms.uDayFactor.value = day;
  1705	
  1706	      // 3. Orbiting Pin Spotlights (Zero-Allocation Render Loop)
  1707	      for (let i = 0; i < this.NUM_SPOTS; i++) {
  1708	        const base = (i / this.NUM_SPOTS) * Math.PI * 2;
  1709	        const speed = 0.38 + i * 0.07;
  1710	        const phi = base + t * speed;
  1711	        const elev = Math.sin(t * 0.5 + i * 0.9) * 0.55;
  1712	
  1713	        const dx = Math.sin(phi) * Math.cos(elev);
  1714	        const dy = Math.sin(elev) - 0.3;
  1715	        const dz = Math.cos(phi) * Math.cos(elev);
  1716	        this._tmpDir.set(dx, dy, dz).normalize();
  1717	
  1718	        this._tmpSrc.copy(this.ball.position).addScaledVector(this._tmpDir, 1.05);
  1719	        this.spotDirs[i].copy(this._tmpDir);
  1720	
  1721	        const beam = this.beams[i];
  1722	        this._tmpMid.copy(this._tmpSrc).addScaledVector(this._tmpDir, 4);
  1723	        beam.position.copy(this._tmpMid);
  1724	        beam.lookAt(this._tmpSrc);
  1725	        beam.rotateX(Math.PI / 2);
  1726	        this.beamMats[i].opacity = (0.028 + Math.sin(t * 3 + i) * 0.012) * (1.0 - day * 0.6);
  1727	
  1728	        const disc = this.spotMeshes[i];
  1729	        disc.position.copy(this._tmpSrc);
  1730	        disc.lookAt(this.camera.position);

```


**Tool Call: Search files for regex `function loadGLBModelOptimized|export.*loadGLBModelOptimized|AnimationMixer|mixer|setAnimation|clipAction|gltf`**
Status: Completed

file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/components/ThreeDAvatar.jsx#L1:11

```
'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import './ThreeDPhysicsAvatar.css';

/**
 * ThreeDAvatar — Ultra-Optimized 3D Avatar (Zero Loading Flash)
 *
 * Avatars matching Unified Color Palette:
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/components/ThreeDAvatar.jsx#L62:89

```
}

let cachedGltfData = null;
let gltfLoadingPromise = null;

export function loadGLBModelOptimized() {
  if (cachedGltfData) {
    return Promise.resolve(cachedGltfData);
  }
  if (gltfLoadingPromise) {
    return gltfLoadingPromise;
  }

  gltfLoadingPromise = (async () => {
    const loader = new GLTFLoader();
    const db = await openIndexedDB();

    // 1. Instant check in IndexedDB (0ms local disk cache)
    const cachedBuffer = await getCachedArrayBuffer(db, MODEL_URL);
    if (cachedBuffer) {
      return new Promise((resolve, reject) => {
        loader.parse(
          cachedBuffer,
          '',
          (gltf) => {
            cachedGltfData = gltf;
            resolve(gltf);
          },
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/components/ThreeDAvatar.jsx#L102:108

```
        loader.parse(
          arrayBuffer,
          '',
          (gltf) => {
            cachedGltfData = gltf;
            resolve(gltf);
          },
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/components/ThreeDAvatar.jsx#L112:115

```
    } catch (err) {
      gltfLoadingPromise = null;
      throw err;
    }
```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/components/ThreeDAvatar.jsx#L116:120

```
  })();

  return gltfLoadingPromise;
}

```


file:///C:/Users/25002/Desktop/V0.1/Vedika/vedika/Vyomanta/frontend/components/ThreeDAvatar.jsx#L260:271

```
    loadGLBModelOptimized()
      .then((gltf) => {
        if (isDisposed) return;

        // Clone model from memory cache instantly
        const root = gltf.scene.clone(true);

        const box = new THREE.Box3().setFromObject(root);
        const center = box.getCenter(new THREE.Vector3());
        const sizeVec = box.getSize(new THREE.Vector3());

        root.position.x -= center.x;
```


**Tool Call: Read file `Vedika\vedika\Vyomanta\frontend\app\engine\DiscoScene.js` (lines 1728-1825)**
Status: Completed

```V0.1/Vedika/vedika/Vyomanta/frontend/app/engine/DiscoScene.js
  1728	        const disc = this.spotMeshes[i];
  1729	        disc.position.copy(this._tmpSrc);
  1730	        disc.lookAt(this.camera.position);
  1731	
  1732	        const fs = this.floorSpots[i];
  1733	        const ty = (-2.19 - this._tmpSrc.y) / this._tmpDir.y;
  1734	        if (ty > 0 && ty < 30) {
  1735	          fs.position.x = this._tmpSrc.x + this._tmpDir.x * ty;
  1736	          fs.position.z = this._tmpSrc.z + this._tmpDir.z * ty;
  1737	          fs.material.opacity = (0.22 + Math.sin(t * 2 + i) * 0.08) * (1.0 - day * 0.4);
  1738	          const scale = 0.35 + ty * 0.035;
  1739	          fs.scale.set(scale, scale, scale);
  1740	        } else {
  1741	          fs.material.opacity = 0;
  1742	        }
  1743	      }
  1744	
  1745	      // 4. Floating Dust Particles
  1746	      if (this.particles) {
  1747	        this.particles.rotation.y = t * 0.03;
  1748	      }
  1749	
  1750	      // 5. Periodic Group Formation State Machine (Auto AI mode only)
  1751	      const hasForcedMove = this.danceAgents.some(agent => agent.forcedMove);
  1752	      this.formationTimer += dt;
  1753	      if (!hasForcedMove && !this.inGroupFormation && this.formationTimer >= this.nextFormationTime) {
  1754	        this.inGroupFormation = true;
  1755	        this.formationTimer = 0;
  1756	      } else if (this.inGroupFormation && this.formationTimer >= 6.5) {
  1757	        this.inGroupFormation = false;
  1758	        this.formationTimer = 0;
  1759	        this.nextFormationTime = 20.0 + Math.random() * 10.0;
  1760	        this.danceAgents.forEach(agent => agent.pickNextRoamTarget());
  1761	      }
  1762	
  1763	      // 6. Collision Avoidance & Opportunistic Pairings
  1764	      this._handleCollisionsAndPairing(dt);
  1765	
  1766	      // 7. Vedika Chamber Overhead Spotlight Tracking (Pure Avatar Color)
  1767	      const cfg = this.spotlightConfig;
  1768	      if (cfg && cfg.focusMode && cfg.focusMode !== 'AUTO') {
  1769	        const lockedIdx = AVATAR_DEFS.findIndex(d => d.id === cfg.focusMode);
  1770	        if (lockedIdx >= 0) {
  1771	          this.activeSpotlightIndex = lockedIdx;
  1772	          if (this.danceAgents[lockedIdx] && this.danceAgents[lockedIdx].def) {
  1773	            this.chamberTargetColor.set(this.danceAgents[lockedIdx].def.threeColor);
  1774	          }
  1775	        }
  1776	      } else if (t - this.lastSpotlightSwitch > 5.5 && this.danceAgents.length > 0) {
  1777	        this.lastSpotlightSwitch = t;
  1778	        this.activeSpotlightIndex = Math.floor(Math.random() * this.danceAgents.length);
  1779	        const leadAgent = this.danceAgents[this.activeSpotlightIndex];
  1780	        if (leadAgent && leadAgent.def) {
  1781	          this.chamberTargetColor.set(leadAgent.def.threeColor);
  1782	        }
  1783	      }
  1784	
  1785	      if (this.danceAgents[this.activeSpotlightIndex]) {
  1786	        const leadAgent = this.danceAgents[this.activeSpotlightIndex];
  1787	        this.chamberTargetPos.set(leadAgent.pos.x, -2.18, leadAgent.pos.z);
  1788	      }
  1789	
  1790	      this.chamberCurrentPos.lerp(this.chamberTargetPos, 0.08);
  1791	      this.chamberColor.lerp(this.chamberTargetColor, 0.08);
  1792	
  1793	      if (!isFinite(this.chamberCurrentPos.x)) this.chamberCurrentPos.x = 0;
  1794	      if (!isFinite(this.chamberCurrentPos.z)) this.chamberCurrentPos.z = 0;
  1795	
  1796	      const cx = this.chamberCurrentPos.x;
  1797	      const cz = this.chamberCurrentPos.z;
  1798	
  1799	      this.chamberBeamMat.uniforms.uTime.value = t;
  1800	      this.chamberBeamMat.uniforms.uColor.value.copy(this.chamberColor);
  1801	      this.chamberTopSpotLight.color.copy(this.chamberColor);
  1802	      this.chamberBackHalo.color.copy(this.chamberColor);
  1803	
  1804	      // Smoothly update positions of overhead vertical beam, spotlight, and pedestal
  1805	      this.chamberBeamGroup.position.set(cx, -2.18, cz);
  1806	
  1807	      // Floor disk only rendered if explicitly enabled (default false per user request)
  1808	      if (this.pedestalGroup) {
  1809	        const isDiskVisible = !!(cfg && cfg.showFloorDisk);
  1810	        this.pedestalGroup.visible = isDiskVisible;
  1811	        if (isDiskVisible) {
  1812	          this.pedestalPoolMat.color.copy(this.chamberColor);
  1813	          this.pedestalRingMat.color.copy(this.chamberColor);
  1814	          this.pedestalOuterRingMat.color.copy(this.chamberColor);
  1815	          this.pedestalGroup.position.set(cx, -2.18, cz);
  1816	          const pulseScale = 1.0 + 0.08 * Math.sin(t * 5.0);
  1817	          this.pedestalGroup.scale.set(pulseScale, 1.0, pulseScale);
  1818	        }
  1819	      }
  1820	
  1821	      this.chamberSpotTarget.position.set(cx, -1.6, cz);
  1822	      this.chamberSpotTarget.updateMatrixWorld();
  1823	      const spotH = cfg && cfg.beamHeight ? (cfg.beamHeight * 0.72) : 3.8;
  1824	      this.chamberTopSpotLight.position.set(cx, spotH, cz + 0.35);
  1825	      this.chamberBackHalo.position.set(cx, -0.8, cz - 0.7);

```


**Tool Call: Read file `Vedika\vedika\Vyomanta\frontend\app\engine\DiscoScene.js` (lines 1825-1875)**
Status: Completed

```V0.1/Vedika/vedika/Vyomanta/frontend/app/engine/DiscoScene.js
  1825	      this.chamberBackHalo.position.set(cx, -0.8, cz - 0.7);
  1826	
  1827	      // 8. Update Mascot Dance Agents
  1828	      this.danceAgents.forEach((agent, idx) => {
  1829	        const isLead = idx === this.activeSpotlightIndex;
  1830	        agent.update(dt, t, beatTime, this.danceAgents, this.inGroupFormation, isLead);
  1831	      });
  1832	
  1833	      this.renderer.render(this.scene, this.camera);
  1834	    } catch (err) {
  1835	      console.error('DiscoScene render loop error:', err);
  1836	    }
  1837	  }
  1838	
  1839	
  1840	  dispose() {
  1841	    this.isDisposed = true;
  1842	    if (this.animId) {
  1843	      cancelAnimationFrame(this.animId);
  1844	    }
  1845	    window.removeEventListener('mousedown', this._onPointerDown);
  1846	    window.removeEventListener('mousemove', this._onPointerMove);
  1847	    window.removeEventListener('mouseup', this._onPointerUp);
  1848	    window.removeEventListener('touchstart', this._onPointerDown);
  1849	    window.removeEventListener('touchmove', this._onPointerMove);
  1850	    window.removeEventListener('touchend', this._onPointerUp);
  1851	    window.removeEventListener('resize', this._onResize);
  1852	
  1853	    if (this.renderer && this.renderer.domElement && this.renderer.domElement.parentNode) {
  1854	      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
  1855	    }
  1856	    this.renderer.dispose();
  1857	  }
  1858	}

```


## Assistant

## Analysis complete

Your 404 page is implemented in:

- `frontend/app/not-found.jsx`
- `frontend/app/not-found.css`
- `frontend/app/engine/DiscoScene.js`

The avatar dancing is not controlled by CSS or React. It is procedurally animated inside `DiscoScene.js` using Three.js.

## Why the avatars currently look clumsy

### 1. Several moves contain abrupt state changes

The biggest source of messiness is the use of Boolean phase switches inside otherwise smooth motions.

Examples:

- `DISCO_POINT`
- `SLIDE_AND_DROP`
- `HIGH_FIVE_HOP`

These moves suddenly switch between two poses based on conditions such as whether `Math.sin(...)` is positive. That creates abrupt jumps in:

- vertical position
- tilt
- scale
- spacing between duet partners

Although the code applies interpolation afterward, the target pose itself changes too suddenly, so the avatars still appear to snap or wobble.

### 2. Multiple movement systems compete with each other

Each avatar can simultaneously be affected by:

- dance movement
- roaming movement
- collision avoidance
- boundary correction
- spotlight targeting
- squash-and-stretch scaling
- partner positioning
- cheering or recoil states

The systems are not fully separated. For example, an avatar can be doing a dance move while its position is also being adjusted for boundaries or collision logic. This produces movement that feels physically inconsistent rather than choreographed.

### 3. The motion amplitudes are too large for the avatar design

Several values are visually aggressive:

- twist rotations around `0.55–0.70` radians
- body tilts around `0.28–0.32` radians
- jumps as high as `0.38–0.48`
- scale changes around `0.88–1.25`
- lateral movements around `0.50–0.60`

Because the avatars are compact blob-like characters, these values make their bodies look elastic and unstable. The result is more like objects being manipulated than characters performing a neat dance.

### 4. The selected moves are not truly slow

The global `beatTime` is relatively slow, but several individual moves multiply the cycle by higher factors:

- `TWIST_AND_SHOUT`
- `CHARLESTON_KICK`
- `HEAD_BOB_NOD`
- `HIGH_FIVE_HOP`

Some moves also use separate timing systems for position, scale, rotation, and tilt. Even if the main rhythm is slow, the combined frequencies create a busy visual pattern.

### 5. Duet moves have discontinuous spacing

The partner routines are especially likely to look messy.

In `HIGH_FIVE_HOP`, the partners switch between two fixed distances. In `DO_SI_DO`, they orbit while also being independently interpolated toward their target positions. In `MIRROR_DUET`, both characters rotate and move toward each other using separate smoothing values.

This can make the pair appear to:

- drift
- correct themselves
- hesitate
- suddenly move inward or outward
- lose visual symmetry

### 6. Auto mode mixes dance and roaming

In automatic mode, the avatars are both dancing and moving around the floor. This makes the page lively, but it reduces visual clarity.

The viewer has to track:

- the dance pose
- the avatar’s floor movement
- other avatars
- collision avoidance
- spotlight movement
- disco lighting

That combination is likely the main reason the overall scene feels messy.

### 7. Collision handling can interfere with visual choreography

Collision avoidance runs before the individual avatar updates. It adjusts positions, but the later dance update can change the position again. For manually selected moves, collision protection is also largely bypassed because forced moves are excluded from some correction logic.

This means avatars can either:

- appear to push against invisible forces, or
- overlap and then correct themselves visually

Both make the dance feel less controlled.

### 8. Some animation branches bypass the normal smoothing system

The following modes directly assign positions, rotations, and scales instead of using the common smoothed state values:

- group formation
- cheering
- partner routines
- wing cheering

Because the normal dance smoothing pipeline is bypassed, transitions between these modes can look noticeably different from one another.

### 9. Frame-rate-dependent interpolation is used in places

Several interpolations use fixed factors such as:

- `0.08`
- `0.12`
- `0.14`

rather than values derived from elapsed time. On different devices or during frame drops, the movement can feel faster, slower, or less consistent.

That may not be the primary problem, but it contributes to uneven motion on slower machines.

## What I recommend doing

### Priority 1: Simplify the choreography

Use fewer simultaneous movement channels per move:

- one primary body motion
- one subtle rotation
- one small vertical movement
- optional low-amplitude scale change

Avoid combining large movement, rotation, twist, tilt, and scale changes at the same time.

### Priority 2: Replace abrupt phase switches

Every dance move should use continuous curves rather than Boolean transitions.

For example, instead of switching from one pose to another when a sine wave changes sign, smoothly blend between the two poses across the transition. The movement should have:

- slow ease-in
- smooth peak
- slow ease-out
- no sudden pose replacement

### Priority 3: Reduce amplitude substantially

For a cleaner look, the first tuning pass should reduce approximately:

- rotation and twist by 30–50%
- vertical hops by 25–40%
- lateral travel by 30–50%
- squash-and-stretch by at least 50%

The avatars will look more polished if their movement is restrained.

### Priority 4: Make each move slower independently

Do not rely only on the global `beatTime`. Each move should have its own deliberate tempo. The fastest moves should be slowed first:

- Charleston Kick
- Twist & Groove
- Head Bob Groove
- High-Five Hop
- Disco Point

The ideal visual direction is gentle, deliberate, and slightly delayed—not energetic or hyperactive.

### Priority 5: Separate dance mode from roaming mode

For selected dance moves:

- keep each avatar near a stable dance anchor
- disable roaming
- allow only small, controlled offsets
- prevent unrelated collision corrections from changing the choreography

For automatic mode, use roaming occasionally, but let the avatars finish a complete dance phrase before changing direction.

### Priority 6: Rework duet movement around shared timing

Duets should use one shared phase and predefined paths. Both avatars should receive coordinated positions and rotations from the same routine instead of independently calculating similar motion.

This is especially important for:

- `DO_SI_DO`
- `MIRROR_DUET`
- `HIGH_FIVE_HOP`

The pair should behave as one choreographed unit.

### Priority 7: Add transition blending between moves

When switching from one move to another, blend the old pose into the new pose over a short transition period. Do not reset the move timer and immediately expose the new pose.

This applies when:

- selecting a move from the 404 drawer
- switching back to auto mode
- entering group formation
- ending a duet
- starting a cheer

### Priority 8: Keep the spotlight and UI from competing with the dancers

The 404 page has a large HUD card, animated lighting, moving beams, particles, a disco ball, and four avatars. Even if the animation is technically smooth, this creates visual noise.

For a neater presentation:

- keep the central card minimized by default or make it less visually dominant
- reduce spotlight movement speed
- reduce particle brightness
- avoid rapidly changing the active spotlight while a selected move is playing
- keep the performers in a simpler formation

## Performance-related observations

The render loop is generally structured well, and it already caps device pixel ratio. However, there are still some areas worth reviewing because frame drops can make smooth animation appear clumsy:

- four cloned GLB avatars are rendered simultaneously
- each clone receives cloned materials
- spotlight and beam objects are updated every frame
- the render loop creates several new `THREE.Color` objects repeatedly
- multiple lighting, particles, shader, and avatar calculations run together

The avatars themselves are procedurally animated rather than using `AnimationMixer` clips, so the issue is mainly choreography and competing transforms—not animation-file playback.

## Best overall direction

The cleanest result would be:

1. Stable avatar positions.
2. Slower, low-amplitude body motion.
3. Continuous easing instead of phase-based pose switching.
4. One shared timing system per dance move.
5. Smooth transitions between moves.
6. Minimal collision and roaming interference during selected dances.
7. Less visual competition from lighting and UI.

The current implementation has a strong foundation, but it is trying to produce too many effects at once. The main improvement should be **reducing motion complexity and making every movement continuous**, rather than adding more animation effects.
