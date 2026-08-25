import { NextResponse } from 'next/server';
import { getAllKeys } from '@/lib/keys';

const TOPIC_CATEGORIES = {
  "Quantitative Aptitude": [
    "Number System", "Percentages", "Profit and Loss", "Simple & Compound Interest",
    "Ratio and Proportion", "Partnership", "Averages", "Mixtures and Allegations",
    "Time and Work", "Pipes and Cisterns", "Time, Speed and Distance", "Boats and Streams",
    "Problems on Ages", "Permutations and Combinations", "Probability", "Geometry",
    "Mensuration (2D & 3D)", "Algebra", "Logarithms", "Progressions (AP, GP)",
    "Data Interpretation", "Data Sufficiency"
  ],
  "Logical Reasoning": [
    "Coding-Decoding", "Blood Relations", "Direction Sense", "Seating Arrangement",
    "Puzzles", "Syllogisms", "Statement and Assumption", "Statement and Conclusion",
    "Cause and Effect", "Analogies", "Series (Number/Letter)", "Odd One Out",
    "Ranking and Order", "Clocks and Calendars", "Cubes and Dice", "Venn Diagrams"
  ],
  "Verbal Ability": [
    "Reading Comprehension", "Vocabulary", "Synonyms and Antonyms", "Sentence Correction",
    "Error Detection", "Fill in the Blanks", "Para Jumbles", "Sentence Completion",
    "Idioms and Phrases", "One-Word Substitution", "Active and Passive Voice",
    "Direct and Indirect Speech", "Grammar"
  ],
  "Non-Verbal Reasoning": [
    "Mirror Images", "Paper Folding", "Figure Series", "Pattern Completion",
    "Embedded Figures", "Image Rotation"
  ],
  "CS & Technical Fundamentals": [
    "Computer Fundamentals", "Pseudocode",
    "Basic Programming (C, C++, Java, Python)", "SQL", "Operating Systems",
    "DBMS", "Computer Networks", "Object-Oriented Programming (OOPs)"
  ]
};

async function callGeminiWithRetry(contents, systemInstruction = '', generationConfig = {}, maxRetries = 3) {
  const keys = getAllKeys();
  if (keys.length === 0) {
    throw new Error('No Gemini API keys configured.');
  }

  // Use active models only (gemini-1.5-flash removed as it causes 404 on v1beta)
  const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'];
  let lastError = null;

  for (let attempt = 0; attempt < 5; attempt++) {
    const apiKey = keys[(Math.floor(Math.random() * keys.length) + attempt) % keys.length];
    const model = modelsToTry[attempt % modelsToTry.length];

    try {
      const mergedConfig = {
        temperature: 0.5,
        maxOutputTokens: 8192,
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

function safeParseGeminiJSON(rawText) {
  if (!rawText) throw new Error('Empty response from AI engine');

  // Strip code block fences if present
  let text = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();

  const firstBrace = text.indexOf('{');
  if (firstBrace === -1) throw new Error('No JSON object found in response');

  const lastBrace = text.lastIndexOf('}');
  if (lastBrace === -1 || lastBrace <= firstBrace) {
    // Response was truncated mid-stream by AI: auto-close open structures safely
    text = text.substring(firstBrace);
    const quotes = (text.match(/(?<!\\)"/g) || []).length;
    if (quotes % 2 !== 0) {
      text += '"';
    }
    if (!text.includes('"options"')) {
      text += ',\n"options": ["Option A", "Option B", "Option C", "Option D"]';
    }
    if (!text.includes('"correct_option"')) {
      text += ',\n"correct_option": 0';
    }
    if (!text.includes('"correct_answer"')) {
      text += ',\n"correct_answer": "Option A"';
    }
    if (!text.includes('"explanation"')) {
      text += ',\n"explanation": "Detailed step-by-step solution."';
    }
    text += '\n}';
  } else {
    text = text.substring(firstBrace, lastBrace + 1);
  }

  // Attempt 1: Direct JSON.parse
  try {
    return JSON.parse(text);
  } catch (e1) {}

  // Attempt 2: Repair common unescaped LaTeX backslashes & literal string newlines
  let repaired = text
    .replace(/\\text\{/g, '\\\\text{')
    .replace(/\\frac\{/g, '\\\\frac{')
    .replace(/\\times/g, '\\\\times')
    .replace(/\\implies/g, '\\\\implies')
    .replace(/\\pmod/g, '\\\\pmod')
    .replace(/\\pm/g, '\\\\pm')
    .replace(/\\cdot/g, '\\\\cdot')
    .replace(/\\% /g, '% ')
    .replace(/\\%/g, '%')
    .replace(/\\([a-zA-Z%])/g, '\\\\$1')
    .replace(/(?<=:\s*"[^"]*)\n(?=[^"]*")/g, '\\n');

  try {
    return JSON.parse(repaired);
  } catch (e2) {}

  // Attempt 3: Aggressive control char replacement & escape fixing
  let fallback = text
    .replace(/[\u0000-\u001F]+/g, (match) => match === '\n' || match === '\r' ? '\\n' : ' ')
    .replace(/\\(?!["\\/bfnrtu])/g, '\\\\');

  try {
    return JSON.parse(fallback);
  } catch (e3) {
    console.error('Failed JSON string:', text);
    throw new Error(`Invalid JSON format from AI: ${e3.message}`);
  }
}

export async function POST(req) {
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

    let avoidPromptClause = "";
    if (avoidQuestions.length > 0) {
      const recentList = avoidQuestions.slice(-5).map(q => `"${String(q).replace(/["\\]/g, '')}"`).join(", ");
      avoidPromptClause = ` DO NOT repeat or re-phrase any of these recent questions: [${recentList}].`;
    }

    const systemInstruction = `${domainGuidance}
Your task is to generate ONE realistic, concise, high-quality question for Placement Exams on topic "${topic}".
Strictly return ONLY a JSON object matching this exact schema:

{
  "id": "apt-ai-${Date.now()}-${Math.floor(Math.random() * 1000)}",
  "difficulty": "${difficulty}",
  "topic": "${topic}",
  "category": "${category}",
  "question": "Concise problem statement. (For SQL/CS: keep table schemas short with max 1-2 small tables and 2-3 columns each).${avoidPromptClause} Double-escape backslashes in JSON (\\\\text, \\\\frac, \\\\n).",
  "options": [
    "Realistic Option A text (e.g. valid SQL query or query result)",
    "Realistic Option B text (e.g. valid SQL query or query result)",
    "Realistic Option C text (e.g. valid SQL query or query result)",
    "Realistic Option D text (e.g. valid SQL query or query result)"
  ],
  "correct_option": 0,
  "correct_answer": "Exact text of the 100% correct option from the options array",
  "hint": "A 1-2 sentence short hint pointing to the core concept.",
  "explanation": "### Quick Solution\\n1. **Core Concept**: 1 short sentence stating the main rule or formula.\\n2. **Analysis**: 1-2 short sentences applying the rule to get the answer.\\n3. **Conclusion**: State the final correct option in 1 sentence."
}

CRITICAL RULES FOR ALL TOPICS:
1. EXPLANATION LENGTH: Keep explanations EXTREMELY CRISP, SHORT, AND EFFECTIVE (maximum 2-3 short bullet points, max 50 words total). Avoid long essays, deep nested lists, or walls of text.
2. OPTION ACCURACY: Exactly ONE option is 100% correct and matches 'correct_option' and 'correct_answer'.
3. NO PLACEHOLDERS: NEVER output generic placeholders like 'Option A' or 'Detailed solution'. Options must be real choices.
4. VALID JSON: Ensure strict JSON escaping without unescaped control characters or unescaped quotes inside JSON strings.`;

    const prompt = `Generate a ${difficulty} difficulty placement assessment question on the topic of "${topic}".`;

    const contents = [{ role: 'user', parts: [{ text: prompt }] }];
    const jsonResponseText = await callGeminiWithRetry(contents, systemInstruction);

    const questionObj = safeParseGeminiJSON(jsonResponseText);

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

