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
    const { 
      experiment, 
      subject = 'physics', 
      userQuery = '', 
      vivaQuestion = '', 
      questionIndex = null, 
      history = [] 
    } = await request.json();

    const allKeys = getAllKeys();
    if (!allKeys || allKeys.length === 0) {
      return NextResponse.json(
        { error: 'No Gemini API keys are configured in .env' }, 
        { status: 500 }
      );
    }

    const query = (vivaQuestion || userQuery || '').trim();
    if (!query) {
      return NextResponse.json(
        { error: 'A user question or viva question is required.' }, 
        { status: 400 }
      );
    }

    // Extract experiment metadata for comprehensive briefing
    const expTitle = experiment?.title || 'Virtual Science Experiment';
    const expSubject = (subject || experiment?.category || 'Science').toUpperCase();
    const expBadge = experiment?.badge || '';
    const expDesc = experiment?.description || '';
    const expObjectives = Array.isArray(experiment?.objectives) ? experiment.objectives : [];
    const expFormulas = Array.isArray(experiment?.keyFormulas) ? experiment.keyFormulas : [];
    const expQuestions = Array.isArray(experiment?.guidedQuestions) ? experiment.guidedQuestions : [];

    // Master System Instruction Dossier for Vedika Lab Tutor
    const systemInstruction = `You are Vedika, the distinguished Senior AI Science Laboratory Tutor and Viva Voce Examiner at Vedika Virtual Labs.
You are articulate, encouraging, pedagogically structured, and deeply versed in experimental STEM sciences.

===================================================================
MASTER EXPERIMENT BRIEF & LABORATORY DOSSIER
===================================================================
- ACADEMIC DISCIPLINE: ${expSubject}
- EXPERIMENT TITLE: ${expTitle} ${expBadge ? `(${expBadge})` : ''}
- OVERVIEW & PHENOMENON:
${expDesc || 'Explore fundamental scientific principles using interactive computer simulations.'}

- CORE LEARNING OBJECTIVES:
${expObjectives.length > 0 ? expObjectives.map((obj, i) => `  ${i + 1}. ${obj}`).join('\n') : '  - Explore core scientific principles through interactive simulation.'}

- GOVERNING MATHEMATICAL LAWS & FORMULAS:
${expFormulas.length > 0 ? expFormulas.map((f) => `  • ${f}`).join('\n') : '  - Fundamental physical, chemical, or biological governing equations.'}

- GUIDED VIVA VOCE QUESTIONS IN THIS CURRICULUM:
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

    // Construct user prompt
    let formattedUserPrompt = query;
    if (vivaQuestion) {
      formattedUserPrompt = `[Viva Voce Question ${questionIndex ? `Q${questionIndex}` : ''}]: "${vivaQuestion}"\n\nAs my Senior Lab Tutor, please provide the complete viva answer, theoretical derivation using the experiment's formulas, and exact step-by-step guidance on how to verify this in the interactive simulation.`;
    }

    // Format conversation history for multi-turn chat
    const contents = [];
    if (Array.isArray(history) && history.length > 0) {
      // Keep last 6 history items for context
      const validHistory = history.slice(-6).filter(m => m.text && (m.sender || m.role));
      for (const item of validHistory) {
        const role = (item.sender === 'user' || item.role === 'user') ? 'user' : 'model';
        contents.push({
          role,
          parts: [{ text: item.text }]
        });
      }
    }

    // Add current user prompt
    contents.push({
      role: 'user',
      parts: [{ text: formattedUserPrompt }]
    });

    const payload = {
      contents,
      systemInstruction: {
        parts: [{ text: systemInstruction }]
      },
      generationConfig: {
        temperature: 0.35,
        maxOutputTokens: 2048,
      }
    };

    // Shuffle keys to balance load across GEMINI_API_KEY, GEMINI_API_KEY_1..4
    const shuffledKeys = [...allKeys].sort(() => Math.random() - 0.5);
    const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

    let textResult = null;
    let lastError = null;

    // Failover loop across keys and models
    for (const apiKey of shuffledKeys) {
      for (const modelName of modelsToTry) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
        const { data, error } = await fetchGemini(url, payload);

        if (error) {
          lastError = error;
          continue;
        }

        if (data?.error) {
          const errMsg = data.error.message || 'API error';
          lastError = errMsg;
          // Quota or key issue - try next key
          if (data.error.code === 429 || errMsg.includes('Quota') || errMsg.includes('key')) {
            break;
          }
          continue;
        }

        const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (candidateText) {
          textResult = candidateText;
          break;
        }
      }

      if (textResult) break;
    }

    if (textResult) {
      return NextResponse.json({
        success: true,
        reply: textResult,
        experimentTitle: expTitle
      });
    }

    // Intelligent domain fallback if all API calls exhaust
    const formulasStr = expFormulas.join(', ') || 'fundamental physical laws';
    const fallbackReply = `### Direct Viva Answer: ${expTitle}\n\n` +
      `**Core Principle:** In this experiment, system behavior is governed by: **${formulasStr}**.\n\n` +
      `**Viva Insight for Question:** ${query}\n\n` +
      `**How to Test in Simulation:** Adjust the simulation components (meters, sliders, probes) to observe the direct empirical response. When you adjust the independent parameter, observe the corresponding change in the dependent variables according to the equilibrium conditions.\n\n` +
      `*(Note: Connected via offline laboratory synthesis. Please try asking again for full AI generative breakdown.)*`;

    return NextResponse.json({
      success: true,
      reply: fallbackReply,
      experimentTitle: expTitle,
      offlineFallback: true
    });

  } catch (err) {
    console.error('[Labs Tutor API Error]:', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' }, 
      { status: 500 }
    );
  }
}
