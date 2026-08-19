import { NextResponse } from 'next/server';
import { verifyJwt } from '@/lib/auth';
import { getAllKeys } from '@/lib/keys';

async function callGeminiWithRetry(contents, systemInstruction = '', generationConfig = {}, maxRetries = 2) {
  const keys = getAllKeys();
  if (keys.length === 0) {
    throw new Error('No Gemini API keys configured.');
  }

  let lastError = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const apiKey = keys[(Math.floor(Math.random() * keys.length) + attempt) % keys.length];
    try {
      const mergedConfig = {
        temperature: 0.6,
        maxOutputTokens: 8192,
        ...generationConfig
      };

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
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
      return text;
    } catch (err) {
      lastError = err;
      console.warn(`[Viva API] Gemini attempt ${attempt + 1} failed: ${err.message}. Rotating key...`);
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

      const systemInstruction = `You are a formal, professional, and rigorous ${type === 'viva' ? 'Academic Viva Examiner' : 'Senior Technical Interviewer'}.
Context:
${contextText}

Question Index: ${questionIndex + 1} of 5.
Difficulty Tier: ${difficulty.toUpperCase()}.

CRITICAL RULES:
1. Calibrate question complexity strictly to the ${difficulty.toUpperCase()} difficulty level.
2. NEVER provide answers, hints, solutions, or explanations during this interview session.
3. If the candidate previously answered, provide a brief, professional acknowledgment (e.g. "Understood.", "Got it, thank you.", "Alright, let us proceed to the next question.") in the "acknowledgment" field.
4. Formulate exactly ONE clear, direct question (maximum 2 sentences) testing core principles, underlying logic, edge cases, formulas, or architecture.
5. If this is question 1, acknowledgment should be a brief opening remark (e.g. "Welcome to your ${difficulty} level ${type === 'viva' ? 'viva examination' : 'technical interview'}. Let us begin.").
6. Output ONLY a valid JSON object matching this schema:
{
  "acknowledgment": "Brief professional acknowledgment phrase (max 10 words)",
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
    // ACTION: EVALUATE SESSION (Holistic Post-Interview Scorecard)
    // -------------------------------------------------------------
    if (action === 'evaluate-session') {
      if (!history || history.length === 0) {
        return NextResponse.json({ error: 'No interview history provided for evaluation.' }, { status: 400 });
      }

      let contextSummary = '';
      if (type === 'viva') {
        contextSummary = `Academic Viva Examination on "${experimentName || topic}" in ${subject} (${level} level, ${difficulty} difficulty).`;
      } else {
        contextSummary = `Technical Job Interview on ${programmingLanguage || topic} for a ${level} position (${difficulty} difficulty). ${jdText ? `Target JD: ${jdText.slice(0, 300)}` : ''}`;
      }

      const systemInstruction = `You are a strict, distinguished academic professor and senior hiring committee director.
Perform a rigorous, objective, and realistic evaluation of the complete 5-question interview transcript conducted at ${difficulty.toUpperCase()} difficulty.

Evaluation Context:
${contextSummary}

CRITICAL SCORING & CALIBRATION RULES (MANDATORY):
1. SKIPPED / REFUSED / EMPTY ANSWERS:
   - If the candidate answered "skip", "skip the question", "I don't know", "pass", or gave gibberish/empty text, YOU MUST ASSIGN SCORE: 0/10 for that question.
   - Set keyGaps: "Candidate skipped the question and provided no answer."
   - Do NOT award 7/10 or any passing marks for skipped answers.
2. INCORRECT OR WRONG ANSWERS:
   - If the candidate stated incorrect physics/chemistry/coding facts, false formulas, or mistaken logic, assign SCORE: 1 to 3 out of 10.
   - Set keyGaps to clearly state the exact misconception.
3. PARTIALLY CORRECT ANSWERS:
   - If the answer is half-correct or missing core formulas/edge cases, assign SCORE: 4 to 6 out of 10.
4. EXCELLENT / ACCURATE ANSWERS:
   - Assign SCORE: 7 to 10 ONLY for technically accurate, well-articulated answers matching ${difficulty.toUpperCase()} difficulty expectations.
5. OVERALL SCORE CALCULATION:
   - "overallScore" MUST be computed directly from the 5 question scores (Average of 5 questions multiplied by 10).
   - For example, if question scores are [0, 3, 0, 4, 0], total is 7/50 -> average is 1.4/10 -> overallScore = 14/100 and letterGrade = "F".
   - Grade mapping: 90-100 = A+, 80-89 = A, 70-79 = B+, 60-69 = B, 50-59 = C, 40-49 = D, 0-39 = F.

Return ONLY a valid JSON object matching this schema:
{
  "overallScore": number (0 to 100),
  "letterGrade": "A+" | "A" | "B+" | "B" | "C" | "D" | "F",
  "summaryCritique": "2 to 3 sentences high-level executive review of candidate performance and knowledge gaps",
  "rubricBreakdown": {
    "technicalAccuracy": { "score": number (0-10), "feedback": "1 sentence critique" },
    "problemSolving": { "score": number (0-10), "feedback": "1 sentence critique" },
    "communicationClarity": { "score": number (0-10), "feedback": "1 sentence critique" },
    "depthAndCompleteness": { "score": number (0-10), "feedback": "1 sentence critique" }
  },
  "perQuestionAnalysis": [
    {
      "questionIndex": number (1 to 5),
      "question": "The question asked",
      "candidateAnswer": "Candidate response summary",
      "score": number (0 to 10 strictly calibrated),
      "idealAnswer": "Concise 1-2 sentence reference model answer",
      "keyGaps": "Specific missing concept, formula, or error"
    }
  ],
  "strengths": ["Demonstrated strength 1", "Demonstrated strength 2"],
  "criticalImprovements": ["Priority improvement 1", "Priority improvement 2"],
  "recommendedStudyTopics": ["Topic 1 to study", "Topic 2 to study"]
}`;

      let transcriptText = `FULL INTERVIEW TRANSCRIPT (${difficulty.toUpperCase()} DIFFICULTY):\n\n`;
      history.forEach((h, idx) => {
        transcriptText += `--- QUESTION ${idx + 1} ---\nQuestion: ${h.question}\nCandidate Answer: "${h.answer || '(No response recorded)'}"\nDuration: ${h.durationSec || 0} seconds\n\n`;
      });

      try {
        const rawJson = await callGeminiWithRetry(
          [{ role: 'user', parts: [{ text: transcriptText }] }],
          systemInstruction,
          { responseMimeType: 'application/json', temperature: 0.1, maxOutputTokens: 8192 }
        );

        let cleanJson = rawJson.trim();
        if (cleanJson.startsWith('```')) {
          cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/```$/, '').trim();
        }

        const scorecard = JSON.parse(cleanJson);
        return NextResponse.json(scorecard);
      } catch (err) {
        console.error('[Viva API] Session evaluation JSON parsing or generation error:', err);
        
        const analyzedQuestions = history.map((h, idx) => {
          const rawAns = (h.answer || '').trim();
          const ans = rawAns.toLowerCase();
          let score = 5;
          let gap = 'Review fundamental concepts and practice explaining in detail.';
          
          if (!rawAns || ans.includes('skip') || ans.length < 5 || ans === 'i don\'t know' || ans === 'pass') {
            score = 0;
            gap = 'Candidate skipped the question and provided no answer.';
          } else if (ans.length < 25) {
            score = 3;
            gap = 'Answer was very brief and lacked necessary theoretical depth.';
          } else {
            score = 6;
            gap = 'Provide more exact formulas, boundary conditions, and quantitative details.';
          }

          return {
            questionIndex: idx + 1,
            question: h.question,
            candidateAnswer: rawAns || '(No response recorded)',
            score,
            idealAnswer: `A comprehensive answer for this ${difficulty} question covers the core scientific/engineering definition, relevant governing equations, and key edge cases.`,
            keyGaps: gap
          };
        });

        const avgScore = analyzedQuestions.reduce((acc, q) => acc + q.score, 0) / (analyzedQuestions.length || 1);
        const overallScore = Math.round(avgScore * 10);
        let letterGrade = 'C';
        if (overallScore >= 90) letterGrade = 'A+';
        else if (overallScore >= 80) letterGrade = 'A';
        else if (overallScore >= 70) letterGrade = 'B+';
        else if (overallScore >= 60) letterGrade = 'B';
        else if (overallScore >= 50) letterGrade = 'C';
        else if (overallScore >= 40) letterGrade = 'D';
        else letterGrade = 'F';

        return NextResponse.json({
          overallScore,
          letterGrade,
          summaryCritique: `The candidate completed ${analyzedQuestions.length} questions at ${difficulty} difficulty. Skipped or incomplete responses significantly lowered the final evaluation score.`,
          rubricBreakdown: {
            technicalAccuracy: { score: Math.round(avgScore), feedback: 'Evaluated based on correctness of core principles.' },
            problemSolving: { score: Math.max(0, Math.round(avgScore * 0.9)), feedback: 'Demonstrated response handling approach.' },
            communicationClarity: { score: Math.max(0, Math.round(avgScore * 1.1)), feedback: 'Articulation clarity across recorded answers.' },
            depthAndCompleteness: { score: Math.round(avgScore), feedback: 'Depth of technical details and formula completeness.' }
          },
          perQuestionAnalysis: analyzedQuestions,
          strengths: overallScore > 50 ? ['Attempted key questions', 'Spoke clearly during recorded responses'] : ['Completed interview session'],
          criticalImprovements: ['Do not skip questions; attempt partial definitions and formulas', 'Review core equations and conceptual fundamentals'],
          recommendedStudyTopics: [topic || subject || 'Core Principles', 'Error Analysis & Practical Applications']
        });
      }
    }

    return NextResponse.json({ error: 'Invalid action specified.' }, { status: 400 });
  } catch (error) {
    console.error('[Viva API] Global exception:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
