import { NextResponse } from 'next/server';
import { getRotatedKey } from '@/lib/keys';

export async function POST(request) {
  try {
    const { difficulty, language = 'python' } = await request.json();
    const apiKey = getRotatedKey();

    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key is not configured on the server.' }, { status: 500 });
    }

    if (!difficulty) {
      return NextResponse.json({ error: 'Missing difficulty parameter.' }, { status: 400 });
    }

    const systemInstruction = `You are a creative programming educator.
Your task is to generate an interactive step-by-step coding exercise in the specified language (default: python).
Generate a puzzle matching the selected difficulty level:
- beginner: Basic syntax, simple loops, arithmetic, basic variable initializations, list index lookups.
- intermediate: Strings, functions, array filtering/searching, basic mathematical logic, dictionary keys.
- advanced: Recursion, search algorithms, duplicate detection, sliding windows, complex nested loops.

You must design exactly 4 to 5 steps to guide the student from writing the function definition to returning the final result.
Ensure each step is focused on a single logical piece of code.
The steps should build on top of each other.
Also generate a 'starterCode' that has the basic function definition skeleton, and a 'defaultCall' which calls the function with some mock data and prints the result.

CRITICAL RULES:
1. The 'starterCode' should only contain the function definition line and a 'pass' or placeholder comment inside.
2. The 'defaultCall' must be complete executable code that calls the function and prints it, e.g. "print(my_func([1, 2, 3]))".
3. Return the output in strict JSON format matching the schema requested.
`;

    const userPrompt = `Generate a 3D visual-friendly "${difficulty}" coding puzzle in "${language}".
The puzzle should be suitable for displaying an array/list visualization if possible (e.g. iterating or mutating a list of elements).`;

    const geminiBody = {
      contents: [
        { role: 'user', parts: [{ text: userPrompt }] }
      ],
      systemInstruction: {
        parts: [{ text: systemInstruction }]
      },
      generationConfig: {
        temperature: 0.7,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            title: { type: "STRING", description: "The title of the coding puzzle" },
            description: { type: "STRING", description: "The problem statement and objective" },
            starterCode: { type: "STRING", description: "The template starter code to load in the editor" },
            defaultCall: { type: "STRING", description: "A test call snippet that executes the function on sample input" },
            steps: {
              type: "ARRAY",
              description: "The 4-5 incremental steps needed to write the code",
              items: {
                type: "OBJECT",
                properties: {
                  id: { type: "STRING", description: "Unique identifier, e.g. step1, step2" },
                  shortTitle: { type: "STRING", description: "Brief title of this step (e.g. Define Function)" },
                  description: { type: "STRING", description: "Step-by-step instruction describing exactly what code lines to write" }
                },
                required: ["id", "shortTitle", "description"]
              }
            }
          },
          required: ["title", "description", "starterCode", "defaultCall", "steps"]
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
      console.error("[Puzzle Generate API Error]", data.error);
      return NextResponse.json({ error: data.error.message }, { status: 500 });
    }

    const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textResult) {
      return NextResponse.json({ error: 'Failed to generate puzzle response from Gemini.' }, { status: 500 });
    }

    try {
      const parsedResult = JSON.parse(textResult.trim());
      return NextResponse.json(parsedResult);
    } catch (e) {
      console.error("[JSON Parse Error on Gemini Generated Response]", textResult, e);
      return NextResponse.json({ error: 'Invalid response format from AI generator.' }, { status: 500 });
    }

  } catch (error) {
    console.error("[Code Puzzle Generate API Handler Error]", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
