import { NextResponse } from 'next/server';
import { getAllKeys } from '@/lib/keys';

const TOPICS = [
  "Time & Work", "Pipes & Cisterns", "Time & Distance", "Trains", 
  "Boats & Streams", "Profit & Loss", "Simple & Compound Interest", 
  "Ratio & Proportion", "Mixtures & Alligation", "Percentages", 
  "Averages", "Permutations & Combinations", "Probability", 
  "Number Theory", "Modular Arithmetic", "Algebra", "Sequences & Series", 
  "Logarithms", "Mensuration", "Geometry", "Trigonometry"
];

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
        temperature: 0.7,
        maxOutputTokens: 1500,
        responseMimeType: "application/json",
        ...generationConfig
      };

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents,
            systemInstruction: { parts: [{ text: systemInstruction }] },
            generationConfig: mergedConfig
          })
        }
      );

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error?.message || `HTTP ${response.status}`);
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('Empty response from Gemini');
      return text;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error('All Gemini attempts failed');
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const difficulty = body.difficulty || 'Medium';
    const topic = body.topic || TOPICS[Math.floor(Math.random() * TOPICS.length)];

    const systemInstruction = `You are a Senior Quantitative Aptitude Examiner and Mathematics Professor.
Your task is to generate ONE realistic, original, high-quality math/aptitude question for Competitive & Placement Exams.
Strictly return ONLY a JSON object matching this schema:

{
  "id": "apt-ai-${Date.now()}",
  "difficulty": "${difficulty}",
  "topic": "${topic}",
  "question": "A clear problem description. Wrap all mathematical variables and formulas in LaTeX dollar signs (e.g. $x^2 + 5x = 0$ or $12\\\\text{ km/h}$). Double-escape all backslashes in JSON (e.g. \\\\text, \\\\frac, \\\\times, \\\\implies, \\\\pmod).",
  "options": ["Choice A", "Choice B", "Choice C", "Choice D"],
  "correct_option": 0, // 0, 1, 2, or 3 (0-indexed integer corresponding to correct option in options array)
  "correct_answer": "Exact text of correct choice",
  "hint": "A helpful 1-2 sentence hint pointing to key formula or concept. Use LaTeX math formatting with double-escaped backslashes.",
  "explanation": "### Step-by-Step Solution\\n1. **Step 1**...\\n2. **Step 2**...\\nDetailed markdown step-by-step solution with LaTeX math formulas double-escaped."
}

CRITICAL RULES:
1. Ensure the math calculation is 100% mathematically correct and one of the four options is EXACTLY the correct answer.
2. Make options realistic distractors (common calculation mistakes).
3. Ensure strict JSON formatting. Double-escape all LaTeX backslashes so JSON parsing never fails.`;

    const prompt = `Generate a ${difficulty} difficulty quantitative aptitude problem on the topic of "${topic}".`;

    const contents = [{ role: 'user', parts: [{ text: prompt }] }];
    const jsonResponseText = await callGeminiWithRetry(contents, systemInstruction);

    // Clean JSON response
    const cleanText = jsonResponseText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const questionObj = JSON.parse(cleanText);

    return NextResponse.json({
      success: true,
      question: questionObj
    });
  } catch (error) {
    console.error('Aptitude Generation Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to generate question'
    }, { status: 500 });
  }
}
