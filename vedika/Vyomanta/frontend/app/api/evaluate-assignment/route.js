import { NextResponse } from 'next/server';
import { getAllKeys } from '@/lib/keys';

async function fetchGemini(url, payload) {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    return { response, data };
  } catch (err) {
    return { error: err.message };
  }
}

export async function POST(request) {
  try {
    const { title, question, answer, evaluation_criteria, sample_answer, pass_threshold } = await request.json();
    const allKeys = getAllKeys();

    if (!allKeys || allKeys.length === 0) {
      return NextResponse.json({ error: 'No Gemini API keys are configured in .env' }, { status: 500 });
    }

    if (!answer || !answer.trim()) {
      return NextResponse.json({ error: 'Student answer is empty or missing.' }, { status: 400 });
    }

    const criteriaList = Array.isArray(evaluation_criteria) && evaluation_criteria.length > 0
      ? evaluation_criteria
      : [
          'Completeness and accuracy of solution',
          'Correct implementation of required logic / code',
          'Handling of edge cases and input validation',
          'Code readability, structure, and formatting'
        ];

    const targetPass = pass_threshold || 70;

    const systemPrompt = `You are an expert AI Assignment Evaluator for an educational platform.
Evaluate the student's submission strictly based on the provided Assignment Question, Sample Solution (if available), and Custom Evaluation Criteria.

CRITICAL EVALUATION RULES:
1. NO HALLUCINATIONS: Base your judgment strictly on the text/code in the Student Submission. Do not invent missing features or assume unstated logic.
2. EVIDENCE MANDATE: Provide direct verbatim quotes or explicit missing points in the "evidence_quote" field for every evaluation criterion.
3. DETERMINISTIC SCORING: Calculate overall_score out of 100 based on criteria fulfillment. Set suggested_status to "Pass" if overall_score >= ${targetPass}, else "Fail".
4. OUTPUT FORMAT: Respond ONLY with valid JSON matching the requested schema.`;

    const userPrompt = `ASSIGNMENT TITLE: ${title || 'Course Assignment'}
ASSIGNMENT QUESTION:
${question || 'Not specified'}

SAMPLE SOLUTION / ANSWER KEY:
${sample_answer || 'None provided'}

CUSTOM EVALUATION CRITERIA:
${criteriaList.map((c, i) => `${i + 1}. ${c}`).join('\n')}

PASS THRESHOLD: ${targetPass}%

STUDENT SUBMISSION TO EVALUATE:
----------------------------------------
${answer}
----------------------------------------`;

    const payload = {
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
        responseSchema: {
          type: "OBJECT",
          properties: {
            overall_score: { type: "INTEGER" },
            suggested_status: { type: "STRING", enum: ["Pass", "Fail"] },
            summary_feedback: { type: "STRING" },
            criteria_breakdown: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  criterion: { type: "STRING" },
                  status: { type: "STRING", enum: ["Passed", "Failed", "Partial"] },
                  score_earned: { type: "INTEGER" },
                  max_score: { type: "INTEGER" },
                  evidence_quote: { type: "STRING" },
                  feedback: { type: "STRING" }
                },
                required: ["criterion", "status", "score_earned", "max_score", "evidence_quote", "feedback"]
              }
            },
            strengths: { type: "ARRAY", items: { type: "STRING" } },
            improvements: { type: "ARRAY", items: { type: "STRING" } }
          },
          required: ["overall_score", "suggested_status", "summary_feedback", "criteria_breakdown", "strengths", "improvements"]
        }
      }
    };

    const shuffledKeys = [...allKeys].sort(() => Math.random() - 0.5);
    const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

    let jsonResult = null;
    let lastError = null;

    for (const apiKey of shuffledKeys) {
      for (const modelName of modelsToTry) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
        const { data, error } = await fetchGemini(url, payload);

        if (error) {
          lastError = error;
          continue;
        }

        if (data?.error) {
          lastError = data.error.message || 'API Error';
          if (data.error.code === 429 || lastError.includes('Quota') || lastError.includes('key')) {
            break;
          }
          continue;
        }

        const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (candidateText) {
          try {
            jsonResult = JSON.parse(candidateText);
            break;
          } catch (e) {
            console.warn('[Evaluate API] JSON parse notice:', e);
          }
        }
      }
      if (jsonResult) break;
    }

    if (jsonResult) {
      return NextResponse.json({ success: true, evaluation: jsonResult });
    }

    return NextResponse.json({ error: lastError || 'Failed to evaluate submission using Gemini AI.' }, { status: 500 });
  } catch (error) {
    console.error('[Evaluate API Error]:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
