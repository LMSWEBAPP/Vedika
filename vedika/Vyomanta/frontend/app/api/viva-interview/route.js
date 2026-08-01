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

    const { action, type, subject, topic, level, question, userAnswer, history = [] } = await request.json();

    const apiKey = getRotatedKey();
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key is not configured.' }, { status: 500 });
    }

    let systemInstruction = '';
    let userPrompt = '';

    if (action === 'question') {
      const modeName = type === 'viva' ? 'academic viva examiner' : 'technical job interviewer';
      const audience = type === 'viva' ? `a ${level} student` : `a candidate for a ${level} position`;
      
      systemInstruction = `You are a professional, challenging ${modeName}. Generate exactly ONE clear, concise question to test a candidate's understanding of the topic "${topic}" in ${subject} for ${audience}. The question should test core conceptual logic or core coding/theory. Do not provide the answer. Keep the question brief and focused (under 2 sentences). Do not include any introductory remarks like "Here is your question:". Output ONLY the question text.`;
      
      // Build context history if any
      let historyText = '';
      if (history.length > 0) {
        historyText = 'Previous questions and evaluations in this round for reference (do not repeat these questions):\n';
        history.forEach((h, idx) => {
          historyText += `Q${idx+1}: ${h.question}\nUser A${idx+1}: ${h.answer}\nScore: ${h.score}/10\n`;
        });
        historyText += '\nGenerate the next question:';
      } else {
        historyText = `Start the interview by generating the first question on the topic of "${topic}".`;
      }
      userPrompt = historyText;
      
    } else if (action === 'evaluate') {
      systemInstruction = `You are an expert ${type === 'viva' ? 'academic examiner' : 'technical interviewer'}. Evaluate the student's answer to the question on the topic "${topic}".
      
      Respond ONLY with a valid JSON object matching this schema. Do not wrap the JSON in markdown formatting (like \`\`\`json). Return raw JSON only.
      
      {
        "grade": "A" | "B" | "C" | "D" | "E" | "F",
        "score": number (0 to 10),
        "correctAnswer": "A concise, complete model answer explaining the key concepts the student should have mentioned.",
        "explanation": "Constructive, brief critique of the student's answer, highlighting what was correct and what key terminology or concepts were missing.",
        "improvementTip": "One specific actionable study advice to improve their answer or understanding."
      }`;
      
      userPrompt = `Question: "${question}"
      Student's Answer: "${userAnswer}"
      
      Evaluate the student's response and return the grading JSON:`;
    } else {
      return NextResponse.json({ error: 'Invalid action parameter.' }, { status: 400 });
    }

    // Call Gemini 2.5 Flash
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { role: 'user', parts: [{ text: userPrompt }] }
          ],
          systemInstruction: { parts: [{ text: systemInstruction }] },
          generationConfig: { 
            temperature: 0.5, 
            maxOutputTokens: 2048,
            ...(action === 'evaluate' ? { responseMimeType: "application/json" } : {})
          },
        }),
      }
    );

    const data = await response.json();
    if (data.error) {
      return NextResponse.json({ error: data.error.message }, { status: 500 });
    }

    let responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    if (action === 'evaluate') {
      try {
        // Clean up markdown blocks if the model wrapped it despite system instructions
        let cleanJson = responseText.trim();
        if (cleanJson.startsWith('```')) {
          cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/```$/, '').trim();
        }
        const parsed = JSON.parse(cleanJson);
        return NextResponse.json(parsed);
      } catch (e) {
        console.error("Failed to parse Gemini evaluation JSON:", responseText, e);
        return NextResponse.json({
          grade: 'C',
          score: 5,
          correctAnswer: 'Unable to parse model answer.',
          explanation: 'There was a parsing error in the evaluation pipeline, but your answer was submitted.',
          improvementTip: 'Please try answering the next question.'
        });
      }
    }

    return NextResponse.json({ text: responseText.trim() });

  } catch (error) {
    console.error("[Viva-Interview API] exception:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
