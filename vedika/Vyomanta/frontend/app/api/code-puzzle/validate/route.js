import { NextResponse } from 'next/server';
import { getRotatedKey } from '@/lib/keys';

export async function POST(request) {
  try {
    const { code, puzzleId, stepIndex, stepDescription, problemStatement, allSteps } = await request.json();
    const apiKey = getRotatedKey();

    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key is not configured on the server.' }, { status: 500 });
    }

    if (!code || stepDescription === undefined) {
      return NextResponse.json({ error: 'Missing required parameters.' }, { status: 400 });
    }

    const systemInstruction = `You are a strict, helpful programming tutor validating a student's code step-by-step.
Your task is to determine if the student's code has successfully completed the CURRENT step.
The student might not have written code for subsequent steps yet, which is expected. Do NOT mark it as failed just because later steps are missing. Only validate the requirements up to the current step.

If they have successfully completed the current step, return passed = true, line = 0, and message = "".
If they have NOT completed the current step correctly (or have a syntax/logic error in the code relevant to the step), identify the 1-based line number of the error and return a brief, single-line hint (max 15 words) explaining what is wrong and how to fix it.

CRITICAL RULES:
1. Do NOT return the entire corrected code block. Only provide a hint message.
2. The hint message must be a single line of text (like a code comment, e.g., "Use max_val = arr[0] to initialize the variable with the first element").
3. Make sure the 'line' number matches the exact 1-based line in the student's code where the error or missing logic is located (e.g. if the function definition is wrong, it should point to line 1).
4. If there is a syntax error anywhere in the code that prevents execution or parsing, return passed = false, the line number of the syntax error, and a comment explaining the syntax error.
`;

    const userPrompt = `Overall Problem: ${problemStatement}
Steps list:
${(allSteps || []).map((s, idx) => `Step ${idx + 1}: ${s}`).join('\n')}

Current Step to Validate: Step ${stepIndex + 1} - "${stepDescription}"

Student's Python Code:
\`\`\`python
${code}
\`\`\`

Evaluate if Step ${stepIndex + 1} is correctly implemented in the code.`;

    const geminiBody = {
      contents: [
        { role: 'user', parts: [{ text: userPrompt }] }
      ],
      systemInstruction: {
        parts: [{ text: systemInstruction }]
      },
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            passed: { type: "BOOLEAN", description: "Whether the current step is correctly implemented." },
            line: { type: "INTEGER", description: "The 1-based line number where the issue is, or 0 if passed is true." },
            message: { type: "STRING", description: "A short hint comment on how to fix the error, or empty if passed is true." }
          },
          required: ["passed", "line", "message"]
        }
      }
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiBody),
      }
    );

    const data = await response.json();

    if (data.error) {
      console.error("[Puzzle Validate API Error]", data.error);
      return NextResponse.json({ error: data.error.message }, { status: 500 });
    }

    const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textResult) {
      return NextResponse.json({ error: 'Failed to generate validation response from Gemini.' }, { status: 500 });
    }

    try {
      const parsedResult = JSON.parse(textResult.trim());
      return NextResponse.json(parsedResult);
    } catch (e) {
      console.error("[JSON Parse Error on Gemini Response]", textResult, e);
      return NextResponse.json({ error: 'Invalid response format from AI model.' }, { status: 500 });
    }

  } catch (error) {
    console.error("[Code Puzzle API Handler Error]", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
