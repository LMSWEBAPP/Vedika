import { NextResponse } from 'next/server';
import { verifyJwt } from '@/lib/auth';
import { getRotatedKey } from '@/lib/keys';

export async function POST(request) {
  try {
    const authHeader = request.headers.get('Authorization');
    const payload = verifyJwt(authHeader);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized JWT token.' }, { status: 401 });
    }

    const { 
      action, type, subject, topic, level, question, userAnswer, history = [],
      jdText = '', programmingLanguage = '', experimentName = '' 
    } = await request.json();

    const apiKey = getRotatedKey();
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key is not configured.' }, { status: 500 });
    }

    let systemInstruction = '';
    let userPrompt = '';

    if (action === 'question') {
      if (type === 'viva') {
        const targetExp = experimentName || topic || 'Physics/Chemistry Lab';
        systemInstruction = `You are a strict yet encouraging academic viva examiner conducting an oral exam for a ${level} student on the experiment "${targetExp}" in ${subject}. 
Generate exactly ONE focused viva question testing core laboratory principles, formulas, apparatus setup, error analysis, or physical laws involved in "${targetExp}".
Keep the question concise (under 2 sentences). Output ONLY the question text without introductory remarks.`;
      } else {
        // Interview Mode
        let focusText = `the topic of "${topic}" in ${subject}`;
        if (jdText) {
          focusText = `the provided Job Description: "${jdText.slice(0, 500)}..."`;
        } else if (programmingLanguage) {
          focusText = `the ${programmingLanguage} programming language, core syntax, data structures, and runtime internals`;
        }

        systemInstruction = `You are a senior technical interviewer conducting a ${level} level job interview.
Generate exactly ONE challenging technical or architectural interview question based on ${focusText}.
The question should test real-world problem solving, code logic, or core fundamentals. Keep it concise (under 3 sentences). Output ONLY the question text.`;
      }

      let historyText = '';
      if (history.length > 0) {
        historyText = 'Previous questions and evaluations in this session:\n';
        history.forEach((h, idx) => {
          historyText += `Q${idx + 1}: ${h.question}\nUser A${idx + 1}: ${h.answer}\nScore: ${h.score}/10\n`;
        });
        historyText += '\nGenerate the next question:';
      } else {
        historyText = `Start the session by generating the first question.`;
      }
      userPrompt = historyText;

    } else if (action === 'evaluate') {
      systemInstruction = `You are an expert ${type === 'viva' ? 'academic lab viva examiner' : 'technical job interviewer'}.
Evaluate the user's answer to the question. You MUST detect if the user's answer is wrong, incomplete, or misaligned with core scientific/technical facts.

Return ONLY a valid JSON object matching this schema without markdown formatting:

{
  "grade": "A" | "B" | "C" | "D" | "F",
  "score": number (0 to 10),
  "isMisaligned": boolean (true if answer is incorrect, misaligned, or missing critical concepts),
  "misalignedReason": "Clear, direct sentence pointing out exactly what was wrong or missing in the student's answer",
  "rectificationPrompt": "A guided follow-up question prompting the student to rectify their mistake in their next attempt before moving on",
  "correctAnswer": "Complete, accurate reference model answer.",
  "explanation": "Brief critique explaining what was correct and what missed the mark.",
  "improvementTip": "One specific actionable advice to improve understanding."
}`;

      userPrompt = `Question: "${question}"
User's Answer: "${userAnswer}"

Evaluate the response and output JSON:`;
    } else {
      return NextResponse.json({ error: 'Invalid action parameter.' }, { status: 400 });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          systemInstruction: { parts: [{ text: systemInstruction }] },
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 2048,
            ...(action === 'evaluate' ? { responseMimeType: 'application/json' } : {})
          }
        })
      }
    );

    const data = await response.json();
    if (data.error) {
      return NextResponse.json({ error: data.error.message }, { status: 500 });
    }

    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (action === 'evaluate') {
      try {
        let cleanJson = responseText.trim();
        if (cleanJson.startsWith('```')) {
          cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/```$/, '').trim();
        }
        const parsed = JSON.parse(cleanJson);
        return NextResponse.json(parsed);
      } catch (e) {
        console.error('Failed to parse Gemini evaluation JSON:', responseText, e);
        return NextResponse.json({
          grade: 'C',
          score: 5,
          isMisaligned: false,
          misalignedReason: '',
          rectificationPrompt: '',
          correctAnswer: 'Unable to parse model answer.',
          explanation: 'There was a parsing error in the evaluation pipeline, but your answer was submitted.',
          improvementTip: 'Please try answering the next question.'
        });
      }
    }

    return NextResponse.json({ text: responseText.trim() });
  } catch (error) {
    console.error('[Viva-Interview API] exception:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
