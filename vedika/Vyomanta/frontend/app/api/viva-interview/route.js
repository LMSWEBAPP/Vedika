import { NextResponse } from 'next/server';
import { verifyJwt } from '@/lib/auth';
import { getAllKeys } from '@/lib/keys';

async function callGeminiWithRetry(contents, systemInstruction = '', generationConfig = {}, maxRetries = 2) {
  const keys = getAllKeys();
  if (keys.length === 0) {
    throw new Error('No Gemini API keys configured.');
  }

  const modelsToTry = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash'];
  let lastError = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const apiKey = keys[(Math.floor(Math.random() * keys.length) + attempt) % keys.length];
    const model = modelsToTry[attempt % modelsToTry.length];

    try {
      const mergedConfig = {
        temperature: 0.2,
        maxOutputTokens: 2500,
        thinkingConfig: { thinkingBudget: 0 },
        ...generationConfig
      };

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents,
            ...(systemInstruction ? { systemInstruction: { parts: [{ text: systemInstruction }] } } : {}),
            generationConfig: mergedConfig
          })
        }
      );

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error?.message || `HTTP ${response.status}: Failed to generate content.`);
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (text) return text;
    } catch (err) {
      lastError = err;
      console.warn(`[Viva API] Gemini (${model}) attempt ${attempt + 1} failed: ${err.message}. Rotating key/model...`);
    }
  }

  throw lastError || new Error('All Gemini API key attempts exhausted.');
}

export async function POST(request) {
  try {
    const authHeader = request.headers.get('Authorization');
    const payload = verifyJwt(authHeader);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized JWT token.' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      action, type = 'viva', subject = 'Physics', topic = '', level = 'College', 
      difficulty = 'Medium', history = [], jdText = '', programmingLanguage = '', 
      experimentName = '', resumeBlueprint = null, resumeBase64 = null, 
      resumeMimeType = 'application/pdf', audioBase64 = null, audioMimeType = 'audio/webm', 
      questionIndex = 0
    } = body;

    // -------------------------------------------------------------
    // ACTION: PARSE RESUME
    // -------------------------------------------------------------
    if (action === 'parse-resume') {
      try {
        const contents = [];
        if (resumeBase64) {
          contents.push({
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: resumeMimeType,
                  data: resumeBase64.replace(/^data:.*?;base64,/, '')
                }
              },
              {
                text: `Analyze this resume document. Extract and return a clean JSON summary object with these exact keys:
{
  "name": "Candidate Name or 'Candidate'",
  "targetRole": "Primary title/specialization e.g. Fullstack Developer",
  "keySkills": ["skill1", "skill2", "skill3", "skill4", "skill5"],
  "experienceSummary": "1-2 sentence summary of experience level and core domains",
  "keyProjects": ["project or domain 1", "project or domain 2"]
}`
              }
            ]
          });
        } else {
          contents.push({
            role: 'user',
            parts: [{
              text: `Analyze this text content from a candidate's background/resume:\n"${(jdText || topic).slice(0, 3000)}"\n
Extract and return a clean JSON summary object:
{
  "name": "Candidate",
  "targetRole": "Primary specialization",
  "keySkills": ["skill1", "skill2", "skill3"],
  "experienceSummary": "1-2 sentence background summary",
  "keyProjects": ["project or domain 1"]
}`
            }]
          });
        }

        const rawJson = await callGeminiWithRetry(
          contents,
          'You are an expert HR and technical resume parser. Output ONLY valid JSON matching the schema.',
          { responseMimeType: 'application/json', temperature: 0.2 }
        );

        let cleanJson = rawJson.trim();
        if (cleanJson.startsWith('```')) {
          cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/```$/, '').trim();
        }
        const parsed = JSON.parse(cleanJson);
        return NextResponse.json({ blueprint: parsed });
      } catch (err) {
        console.error('[Viva API] Parse resume error:', err);
        return NextResponse.json({
          blueprint: {
            name: 'Candidate',
            targetRole: programmingLanguage || 'Software Developer',
            keySkills: [programmingLanguage || 'Technical Skills'],
            experienceSummary: 'Candidate profile configured for technical evaluation.',
            keyProjects: []
          }
        });
      }
    }

    // -------------------------------------------------------------
    // ACTION: TRANSCRIBE AUDIO (Safari / Firefox MediaRecorder fallback)
    // -------------------------------------------------------------
    if (action === 'transcribe-audio') {
      if (!audioBase64) {
        return NextResponse.json({ error: 'Missing audioBase64 parameter.' }, { status: 400 });
      }

      try {
        const contents = [{
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: audioMimeType,
                data: audioBase64.replace(/^data:.*?;base64,/, '')
              }
            },
            {
              text: 'Transcribe this spoken English audio exactly into text. Output ONLY the plain transcription text without commentary or prefixes.'
            }
          ]
        }];

        const transcription = await callGeminiWithRetry(
          contents,
          'You are an ultra-accurate speech-to-text transcriber for academic and technical interviews. Output only spoken text.',
          { temperature: 0.1 }
        );

        return NextResponse.json({ text: transcription.trim() });
      } catch (err) {
        console.error('[Viva API] Audio transcription error:', err);
        return NextResponse.json({ error: 'Audio transcription failed. Please try voice again or type your answer.' }, { status: 500 });
      }
    }

    // -------------------------------------------------------------
    // ACTION: GENERATE QUESTION (Strict Examiner Persona - No Spoilers)
    // -------------------------------------------------------------
    if (action === 'question') {
      let contextText = '';
      if (type === 'viva') {
        const targetExp = experimentName || topic || 'Core Laboratory Experiment';
        contextText = `Subject: ${subject}\nAcademic Experiment/Topic: "${targetExp}"\nStudent Level: ${level}\nChosen Difficulty: ${difficulty.toUpperCase()} (${difficulty === 'Easy' ? 'basic definitions & standard formulas' : difficulty === 'Hard' ? 'advanced derivations, non-ideal conditions, error analysis & edge cases' : 'standard academic analytical questions'}).`;
      } else {
        // Technical Interview
        const stack = programmingLanguage || topic || 'Fullstack Engineering';
        let resumeDetails = '';
        if (resumeBlueprint) {
          resumeDetails = `\nCandidate Blueprint:\n- Role: ${resumeBlueprint.targetRole || 'Developer'}\n- Skills: ${(resumeBlueprint.keySkills || []).join(', ')}\n- Background: ${resumeBlueprint.experienceSummary || ''}`;
        }
        let jdDetails = jdText ? `\nTarget Job Description / Requirements:\n"${jdText.slice(0, 600)}..."` : '';
        contextText = `Target Stack/Domain: ${stack}\nTarget Seniority: ${level} Engineer\nChosen Difficulty: ${difficulty.toUpperCase()} (${difficulty === 'Easy' ? 'syntax fundamentals & standard patterns' : difficulty === 'Hard' ? 'low-level runtime internals, high-scale bottlenecks & failure modes' : 'production architecture & problem solving'})${resumeDetails}${jdDetails}`;
      }

      const isFirstQuestion = questionIndex === 0 && history.length === 0;
      const recentQ1s = Array.isArray(body.recentQ1s) ? body.recentQ1s : [];
      let recentQ1Text = '';
      if (recentQ1s.length > 0) {
        recentQ1Text = `\nANTI-REPETITION MANDATE: The candidate recently answered these opening questions in previous sessions for this topic:\n${recentQ1s.map((q, i) => `- "${q}"`).join('\n')}\nYou MUST NOT repeat any of these questions or test the exact same sub-topic concept as Question 1.`;
      }

      let openingDiversificationInstruction = '';
      if (isFirstQuestion) {
        openingDiversificationInstruction = `\nDYNAMIC SUB-TOPIC DIVERSIFICATION FOR QUESTION 1:
- Dynamically identify 5 distinct core sub-topic pillars within "${experimentName || topic || subject || programmingLanguage}" appropriate for a ${level} level examination.
- Select ONE specific sub-topic pillar to test for this session's opening question.
- Do NOT default to generic textbook definitions or the single most common entry-level opening question (e.g., for Python, avoid defaulting to mutable/immutable unless specifically targeted). Pick a specific, meaningful core concept pillar.
${recentQ1Text}`;
      }

      const systemInstruction = `You are a formal, professional, and rigorous ${type === 'viva' ? 'Academic Viva Examiner' : 'Senior Technical Interviewer'}.
Context:
${contextText}

Question Index: ${questionIndex + 1} of 5.
Difficulty Tier: ${difficulty.toUpperCase()}.
${openingDiversificationInstruction}

CRITICAL RULES:
1. Calibrate question complexity strictly to the ${difficulty.toUpperCase()} difficulty level.
2. NEVER provide answers, hints, solutions, or explanations during this interview session.
3. STRICT REFUSAL OF CANDIDATE QUESTIONS: If the candidate asks you a question or asks for explanations (e.g. "What is the answer?", "Can you explain this to me?"), DO NOT answer their question. Refuse politely: "We are in the middle of your examination right now—I am here to question you, not the other way around. Please answer the question."
4. ACKNOWLEDGMENT & RELEVANCE CHECK:
   - If candidate answered previously, evaluate if the candidate's answer was relevant to the target topic (${topic || subject}) or if it substituted an unrelated domain (e.g. HTML/CSS in a C viva).
   - ACCEPTABLE COMPARISONS: Candidate using cross-language or cross-domain analogies to illustrate a concept in ${topic || subject} IS ON-TOPIC.
   - UNACCEPTABLE SUBSTITUTIONS: Candidate answering with concepts from a completely different domain in place of addressing the question is OFF-TOPIC.
   - If OFF-TOPIC, set acknowledgment to: "Note: your previous response discussed an unrelated domain, which does not address the question on ${topic || subject}. Let us return to the target topic..."
   - If ON-TOPIC or relevant, provide a brief, professional acknowledgment (e.g. "Understood.", "Got it, thank you.", "Alright, let us proceed.").
5. Formulate exactly ONE clear, direct question (maximum 2 sentences) testing core principles, underlying logic, edge cases, formulas, or architecture.
6. If this is question 1, acknowledgment should be a brief opening remark (e.g. "Welcome to your ${difficulty} level ${type === 'viva' ? 'viva examination' : 'technical interview'}. Let us begin.").
7. TOPIC VALIDATION (Mandatory for Question 1): Evaluate if the provided topic/experiment is a legitimate academic subject, lab experiment, scientific domain, or software/hardware tech stack.
   - VALID TOPIC EXAMPLES: "SQL", "CSS", "JWT", "gRPC", "TCP/IP", "Quantum Mechanics", "Organic Chemistry", "React", "Fluid Dynamics", "PostgreSQL", "C++".
   - INVALID TOPIC EXAMPLES: Casual greetings ("hi", "hello", "hey"), random keyboard mash ("hjghas", "asdf", "qwerty"), plain numbers ("1234"), or generic non-topics ("test", "temp", "dummy").
   - Set "isValidTopic" to true for valid topics. Set "isValidTopic" to false ONLY if the topic is unambiguously a greeting, test filler, or random gibberish, and provide a polite "rejectionReason".

8. Output ONLY a valid JSON object matching this schema:
{
  "isValidTopic": true,
  "rejectionReason": "If topic is invalid, short 1-sentence reason. Leave empty if valid.",
  "acknowledgment": "Brief professional acknowledgment phrase (max 15 words)",
  "question": "The exact question text ending with a question mark"
}`;

      let conversationHistory = '';
      if (history.length > 0) {
        conversationHistory = 'Transcript of previous turns in this session:\n';
        history.forEach((h, idx) => {
          conversationHistory += `Q${idx + 1}: ${h.question}\nCandidate A${idx + 1}: ${h.answer || '(No answer provided)'}\n`;
        });
        conversationHistory += `\nNow formulate Question ${questionIndex + 1} of 5 (${difficulty} Difficulty):`;
      } else {
        conversationHistory = `This is the start of the session. Formulate the first opening question (Question 1 of 5 at ${difficulty} Difficulty).`;
      }

      try {
        const rawJson = await callGeminiWithRetry(
          [{ role: 'user', parts: [{ text: conversationHistory }] }],
          systemInstruction,
          { responseMimeType: 'application/json', temperature: difficulty === 'Hard' ? 0.75 : 0.6 }
        );

        let cleanJson = rawJson.trim();
        if (cleanJson.startsWith('```')) {
          cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/```$/, '').trim();
        }
        const parsed = JSON.parse(cleanJson);
        return NextResponse.json({
          isValidTopic: parsed.isValidTopic !== false,
          rejectionReason: parsed.rejectionReason || '',
          acknowledgment: parsed.acknowledgment || 'Understood.',
          question: parsed.question || 'Could you explain the core fundamentals of this topic?'
        });
      } catch (err) {
        console.error('[Viva API] Question generation error, using fallback:', err);
        const fallbackQuestionsViva = [
          `What is the primary physical or scientific principle underlying "${experimentName || topic}"?`,
          `What are the major sources of experimental error in this setup, and how do you minimize them?`,
          `Explain the key formula or governing equation used in this experiment and the units of each variable.`,
          `How would changing the experimental parameters affect the final calculated results?`,
          `What safety precautions and calibration steps are critical before taking measurements in this lab?`
        ];

        const fallbackQuestionsInterview = [
          `Could you walk me through the architecture and core data structures you would use for a project in ${programmingLanguage || 'this stack'}?`,
          `How do you handle error handling, edge cases, and failure recovery in production systems?`,
          `Can you explain the time and space complexity trade-offs in your recent technical work?`,
          `How do you manage concurrency, state management, or asynchronous execution in ${programmingLanguage || 'modern applications'}?`,
          `If your system experiences a 10x spike in traffic or data volume, what bottlenecks would you investigate first?`
        ];

        const fallbackList = type === 'viva' ? fallbackQuestionsViva : fallbackQuestionsInterview;
        const qText = fallbackList[Math.min(questionIndex, fallbackList.length - 1)];

        return NextResponse.json({
          acknowledgment: questionIndex === 0 ? `Welcome to your ${difficulty} level session. Let us begin.` : 'Understood. Let us proceed.',
          question: qText
        });
      }
    }

    // -------------------------------------------------------------
    // ACTION: EVALUATE SESSION (Holistic Topic-Rollup Scorecard)
    // -------------------------------------------------------------
    if (action === 'evaluate-session') {
      const targetDomain = (experimentName || topic || subject || programmingLanguage || '').trim();
      if (!targetDomain) {
        return NextResponse.json({ error: 'Missing evaluation topic or subject parameter. Session evaluation blocked.' }, { status: 400 });
      }

      const topicUnitsInput = body.topicUnits || [];
      const historyInput = history || [];

      // Group raw history turns into TopicUnits if topicUnits wasn't directly passed
      let topicUnits = [...topicUnitsInput];
      if (topicUnits.length === 0 && historyInput.length > 0) {
        let currentUnit = null;
        historyInput.forEach((h, idx) => {
          const isFollowUp = h.questionType === 'follow_up' || /follow-up|probing/i.test(h.question || '');
          if (!currentUnit || (!isFollowUp && currentUnit.turns.length > 0)) {
            if (currentUnit) topicUnits.push(currentUnit);
            currentUnit = {
              topicIndex: topicUnits.length + 1,
              topicName: h.topicName || `Topic ${topicUnits.length + 1}`,
              turns: []
            };
          }
          currentUnit.turns.push({
            questionType: isFollowUp ? 'follow_up' : 'main',
            question: h.question,
            answer: h.answer,
            durationSec: h.durationSec || 30
          });
        });
        if (currentUnit && currentUnit.turns.length > 0) {
          topicUnits.push(currentUnit);
        }
      }

      const nTopics = topicUnits.length;

      // RULE 1: Zero-Division & Crash Guard
      if (nTopics === 0) {
        return NextResponse.json({
          overallScore: 0,
          letterGrade: 'Incomplete',
          summaryCritique: 'The examination session ended before any sub-topic questions were presented or answered.',
          rubricBreakdown: {
            technicalAccuracy: { score: 0, feedback: 'No topic data recorded.' },
            problemSolving: { score: 0, feedback: 'No topic data recorded.' },
            communicationClarity: { score: 0, feedback: 'No topic data recorded.' },
            depthAndCompleteness: { score: 0, feedback: 'No topic data recorded.' }
          },
          perTopicAnalysis: [],
          strengths: [],
          criticalImprovements: ['Complete at least 2 topics to receive an official grade.'],
          recommendedStudyTopics: [topic || subject || 'Core Principles']
        });
      }

      let contextSummary = '';
      if (type === 'viva') {
        contextSummary = `Academic Viva Examination on "${experimentName || topic}" in ${subject} (${level} level, ${difficulty} difficulty). Total Topics Attempted: ${nTopics}.`;
      } else {
        contextSummary = `Technical Job Interview on ${programmingLanguage || topic} for a ${level} position (${difficulty} difficulty). Total Topics Attempted: ${nTopics}. ${jdText ? `Target JD: ${jdText.slice(0, 300)}` : ''}`;
      }

      const systemInstruction = `You are a strict, distinguished academic professor and senior hiring committee director.
Perform a rigorous, objective topic-rollup evaluation of the interview conducted at ${difficulty.toUpperCase()} difficulty.

Evaluation Context:
${contextSummary}

CRITICAL TOPIC-ROLLUP SCORING & RUBRIC RULES (MANDATORY):
1. TOPIC ROLLUP EVALUATION:
   - Evaluate each TOPIC UNIT as ONE single data point combining the main question and any follow-up probes.
   - Do NOT score turns independently. Evaluate candidate's net understanding of the topic as a whole.
2. EVIDENCE-FIRST EXTRACTION & SENIORITY-CALIBRATED REFERENCE FACTS:
   - For each topic, FIRST extract "candidateClaims" (exact technical facts/formulas stated by candidate).
   - Generate "levelCalibratedReferenceFacts" required for seniority level "${(level || 'College').toUpperCase()}":
     * Junior / College: Syntax definitions, primary formulas, standard usage.
     * Mid: Edge cases, common failure modes, standard architecture patterns.
     * Senior / Lead: Low-level runtime internals, memory layout, system trade-offs, high-scale bottlenecks.
   - Compare candidateClaims against levelCalibratedReferenceFacts to generate "matchedConcepts" and "missingConcepts".
3. RUBRIC DIMENSIONS PER TOPIC (0-10 Scale):
   - Technical Accuracy & Depth (50% weight): Evaluate correctness against levelCalibratedReferenceFacts.
   - Problem Solving & Adaptability (30% weight): Handling of probed follow-ups and edge cases. NOTE: If main answer was so thorough that ZERO follow-ups were needed, award FULL CREDIT matching technical accuracy.
   - Communication Clarity (20% weight): Articulation and structure appropriate for ${level} level.
4. DOMAIN RELEVANCE & OFF-TOPIC EVALUATION (Rule 3):
   - Evaluate whether candidate responses genuinely address the target subject/topic (${experimentName || topic || subject}).
   - ACCEPTABLE COMPARISONS: Candidate using cross-language or cross-domain analogies to illustrate a concept in ${experimentName || topic || subject} IS ON-TOPIC.
   - UNACCEPTABLE SUBSTITUTIONS: Candidate answering with concepts from a completely different domain in place of addressing the question (e.g. explaining HTML tags when asked about C pointers) IS OFF-TOPIC per Rule 3.
   - If candidate's response for a topic unit is OFF-TOPIC:
     * Set rubric: { technicalAccuracy: 0, problemSolving: 0, communicationClarity: 2-5 (based on grammar) }.
     * Set keyGaps: "Candidate response was off-topic and substituted unrelated domain concepts instead of addressing ${experimentName || topic || subject}."
5. SKIPPED / TIMED-OUT TOPICS:
   - If candidate skipped or explicitly admitted "I don't know", set rubric: { technicalAccuracy: 0, problemSolving: 0, communicationClarity: 0 } with keyGaps: "Candidate skipped topic or admitted lack of knowledge."

Return ONLY a valid JSON object matching this EVIDENCE-FIRST schema (perTopicAnalysis MUST come first):
{
  "perTopicAnalysis": [
    {
      "topicIndex": number (1 to N),
      "topicName": "Sub-topic title",
      "turnsCount": number,
      "candidateClaims": "Exact technical claims and formulas stated by the candidate",
      "levelCalibratedReferenceFacts": "Essential required technical facts for ${level} level",
      "matchedConcepts": ["Concept 1 matched", "Concept 2 matched"],
      "missingConcepts": ["Missing concept 1", "Missing concept 2"],
      "keyGaps": "Specific missing concept, off-topic note, or error",
      "rubric": {
        "technicalAccuracy": number (0-10),
        "problemSolving": number (0-10),
        "communicationClarity": number (0-10)
      }
    }
  ],
  "summaryCritique": "2 to 3 sentences high-level executive review of candidate performance across topics and pacing",
  "strengths": ["Demonstrated strength 1", "Demonstrated strength 2"],
  "criticalImprovements": ["Priority improvement 1", "Priority improvement 2"],
  "recommendedStudyTopics": ["Topic 1 to study", "Topic 2 to study"]
}`;

      let transcriptText = `FULL TOPIC-ROLLUP INTERVIEW TRANSCRIPT (${difficulty.toUpperCase()} DIFFICULTY):\n\n`;
      topicUnits.forEach((unit, uIdx) => {
        transcriptText += `=== TOPIC ${uIdx + 1}: ${unit.topicName || `Sub-Topic ${uIdx + 1}`} ===\n`;
        unit.turns.forEach((t, tIdx) => {
          let cleanAnswer = (t.answer || '').trim();
          cleanAnswer = cleanAnswer.replace(/^(can you repeat|please repeat|repeat it|say again|pardon|i didn't catch that|could you rephrase)[,.\s?!]+/i, '').trim() || cleanAnswer;
          transcriptText += `[${t.questionType === 'follow_up' ? 'Follow-up Probe' : 'Main Question'}]: ${t.question}\nCandidate Answer: "${cleanAnswer || '(No response recorded / Timed out)'}"\n\n`;
        });
      });

      try {
        const rawJson = await callGeminiWithRetry(
          [{ role: 'user', parts: [{ text: transcriptText }] }],
          systemInstruction,
          { responseMimeType: 'application/json', temperature: 0.1, maxOutputTokens: 2500 }
        );

        let cleanJson = rawJson.trim();
        if (cleanJson.startsWith('```')) {
          cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/```$/, '').trim();
        }

        const scorecard = JSON.parse(cleanJson);

        // Enforce math rules 100% programmatically to prevent LLM arithmetic drift
        const coverageFactor = nTopics >= 3 ? 1.0 : (nTopics === 2 ? 0.85 : 0.70);
        let rawMeanTopicScore = 0;

        if (scorecard.perTopicAnalysis && Array.isArray(scorecard.perTopicAnalysis)) {
          scorecard.perTopicAnalysis = scorecard.perTopicAnalysis.map((t) => {
            const rub = t.rubric || {};
            const techAcc = typeof rub.technicalAccuracy === 'number' ? rub.technicalAccuracy : 0;
            const probSol = typeof rub.problemSolving === 'number' ? rub.problemSolving : 0;
            const commCla = typeof rub.communicationClarity === 'number' ? rub.communicationClarity : 0;
            
            // Programmatically compute weighted topicScore
            const computedTopicScore = Math.min(10, Math.max(0, Math.round((techAcc * 0.50) + (probSol * 0.30) + (commCla * 0.20))));
            return {
              ...t,
              topicScore: computedTopicScore
            };
          });

          const validTopics = scorecard.perTopicAnalysis.filter(t => typeof t.topicScore === 'number' && !t.unscored);
          rawMeanTopicScore = validTopics.length > 0
            ? validTopics.reduce((acc, t) => acc + t.topicScore, 0) / validTopics.length
            : 0;

          // Programmatically aggregate overall rubric breakdown across valid attempted topics
          const meanTechAcc = validTopics.length > 0
            ? Math.round((validTopics.reduce((acc, t) => acc + (t.rubric?.technicalAccuracy || 0), 0) / validTopics.length) * 10) / 10
            : 0;
          const meanProbSol = validTopics.length > 0
            ? Math.round((validTopics.reduce((acc, t) => acc + (t.rubric?.problemSolving || 0), 0) / validTopics.length) * 10) / 10
            : 0;
          const meanCommCla = validTopics.length > 0
            ? Math.round((validTopics.reduce((acc, t) => acc + (t.rubric?.communicationClarity || 0), 0) / validTopics.length) * 10) / 10
            : 0;

          scorecard.rubricBreakdown = {
            technicalAccuracy: {
              score: meanTechAcc,
              feedback: `Evaluated across ${validTopics.length} attempted topic unit(s) against ${level} expectations.`
            },
            problemSolving: {
              score: meanProbSol,
              feedback: `Evaluated across probed follow-up scenarios and edge-case handling.`
            },
            communicationClarity: {
              score: meanCommCla,
              feedback: `Evaluated across response structure, articulation, and domain relevance.`
            }
          };
        }

        const calculatedScore = Math.min(100, Math.max(0, Math.round(rawMeanTopicScore * 10 * coverageFactor)));
        const totalQuestionsAsked = topicUnits.reduce((acc, u) => acc + (u.turns?.length || 1), 0);

        let letterGrade = 'F';
        if (nTopics < 2) {
          letterGrade = 'Incomplete';
        } else if (calculatedScore >= 90) letterGrade = 'A+';
        else if (calculatedScore >= 80) letterGrade = 'A';
        else if (calculatedScore >= 70) letterGrade = 'B+';
        else if (calculatedScore >= 60) letterGrade = 'B';
        else if (calculatedScore >= 50) letterGrade = 'C';
        else if (calculatedScore >= 40) letterGrade = 'D';
        else letterGrade = 'F';

        return NextResponse.json({
          ...scorecard,
          nTopics,
          totalQuestionsAsked,
          rawMeanTopicScore: Number(rawMeanTopicScore.toFixed(1)),
          coverageFactor: Number(coverageFactor.toFixed(2)),
          overallScore: calculatedScore,
          letterGrade
        });
      } catch (err) {
        console.error('[Viva API] Session evaluation JSON parsing or generation error:', err);
        
        // System error fallback: Mark topics as unscored rather than assigning arbitrary fake scores
        const analyzedTopics = topicUnits.map((unit, idx) => {
          const firstAns = (unit.turns?.[0]?.answer || '').trim();
          const ans = firstAns.toLowerCase();
          const isSkipped = !firstAns || ans.includes('skip') || ans.includes('timed out');
          
          if (isSkipped) {
            return {
              topicIndex: idx + 1,
              topicName: unit.topicName || `Topic ${idx + 1}`,
              turnsCount: unit.turns.length,
              topicScore: 0,
              unscored: false,
              rubric: {
                technicalAccuracy: 0,
                problemSolving: 0,
                communicationClarity: 0
              },
              candidateSummary: '(No response recorded / Skipped)',
              idealModelAnswer: `A comprehensive answer for this topic covers core scientific/engineering definitions.`,
              keyGaps: 'Candidate skipped or timed out on this sub-topic.'
            };
          }

          return {
            topicIndex: idx + 1,
            topicName: unit.topicName || `Topic ${idx + 1}`,
            turnsCount: unit.turns.length,
            topicScore: null,
            unscored: true,
            rubric: {
              technicalAccuracy: null,
              problemSolving: null,
              communicationClarity: null
            },
            candidateSummary: firstAns,
            idealModelAnswer: `A comprehensive answer for this topic covers core scientific/engineering definitions.`,
            keyGaps: 'Unscored: Automated evaluation service experienced a temporary connectivity issue.'
          };
        });

        const scoredTopics = analyzedTopics.filter(t => !t.unscored && typeof t.topicScore === 'number');
        const rawMeanScore = scoredTopics.length > 0
          ? scoredTopics.reduce((acc, q) => acc + q.topicScore, 0) / scoredTopics.length
          : 0;
        const coverageFactor = Math.min(1.0, 0.5 + 0.15 * nTopics);
        const overallScore = Math.round(rawMeanScore * 10 * coverageFactor);

        let letterGrade = 'F';
        if (nTopics < 2 || scoredTopics.length === 0) letterGrade = 'Incomplete';
        else if (overallScore >= 90) letterGrade = 'A+';
        else if (overallScore >= 80) letterGrade = 'A';
        else if (overallScore >= 70) letterGrade = 'B+';
        else if (overallScore >= 60) letterGrade = 'B';
        else if (overallScore >= 50) letterGrade = 'C';
        else if (overallScore >= 40) letterGrade = 'D';
        else letterGrade = 'F';

        return NextResponse.json({
          rawMeanTopicScore: Number(rawMeanScore.toFixed(1)),
          coverageFactor: Number(coverageFactor.toFixed(2)),
          overallScore,
          letterGrade,
          systemErrorWarning: 'Automated evaluation service encountered a temporary error. Unscored topics are excluded from the total.',
          summaryCritique: `The candidate completed ${analyzedTopics.length} sub-topic evaluation(s). Due to a system timeout, certain responses could not be automatically scored.`,
          rubricBreakdown: {
            technicalAccuracy: { score: scoredTopics.length > 0 ? Math.round(rawMeanScore) : 0, feedback: 'Evaluated based on available scored topics.' },
            problemSolving: { score: scoredTopics.length > 0 ? Math.round(rawMeanScore * 0.9) : 0, feedback: 'Evaluated across available scored topic probes.' },
            communicationClarity: { score: scoredTopics.length > 0 ? Math.round(rawMeanScore * 1.1) : 0, feedback: 'Articulation clarity across available turns.' }
          },
          perTopicAnalysis: analyzedTopics,
          strengths: ['Attempted examination topics'],
          criticalImprovements: ['Review fundamental concepts for all topics'],
          recommendedStudyTopics: [topic || subject || 'Core Principles']
        });
      }
    }

    return NextResponse.json({ error: 'Invalid action specified.' }, { status: 400 });
  } catch (error) {
    console.error('[Viva API] Global exception:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
