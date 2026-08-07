import { NextResponse } from 'next/server';
import { cacheGet, cacheSet, makeCacheKey } from '@/lib/cache';
import { getAllKeys } from '@/lib/keys';
import { loadHistory, saveHistory, recall, buildMemoryContext, trackApiConsumption } from '@/lib/memory';

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
    const { system, user, image, maxOutputTokens, sessionId, userId } = await request.json();
    const allKeys = getAllKeys();

    if (!allKeys || allKeys.length === 0) {
      return NextResponse.json({ error: 'No Gemini API keys are configured in .env' });
    }
    if (!user) {
      return NextResponse.json({ error: 'User message is required.' });
    }

    let memoryCtx = '';
    try {
      if (sessionId || userId) {
        const [history, memories] = await Promise.all([
          loadHistory(sessionId),
          recall(userId),
        ]);
        memoryCtx = buildMemoryContext(history, memories);
      }
    } catch (memErr) {
      console.warn('[Gemini] Memory context notice:', memErr);
    }

    const fullSystem = system ? system + memoryCtx : memoryCtx;

    const cacheKey = makeCacheKey('generate', fullSystem, user + (image ? image.slice(0, 100) : ''), maxOutputTokens);
    const cached = cacheGet(cacheKey);
    if (cached) return NextResponse.json({ text: cached });

    const userParts = [];
    if (image) {
      const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
      userParts.push({
        inlineData: {
          mimeType: 'image/png',
          data: base64Data
        }
      });
    }
    userParts.push({ text: user });

    const payload = {
      contents: [{ role: 'user', parts: userParts }],
      ...(fullSystem ? { systemInstruction: { parts: [{ text: fullSystem }] } } : {}),
      generationConfig: { temperature: 0.4, maxOutputTokens: maxOutputTokens || 8192 },
    };

    // Shuffle keys to distribute traffic across GEMINI_API_KEY, GEMINI_API_KEY_1, GEMINI_API_KEY_2, etc.
    const shuffledKeys = [...allKeys].sort(() => Math.random() - 0.5);
    const modelsToTry = ['gemini-1.5-flash', 'gemini-2.5-flash', 'gemini-2.0-flash'];

    let textResult = null;
    let lastError = null;

    // FAILOVER LOOP: Iterate through keys in .env
    for (const apiKey of shuffledKeys) {
      for (const modelName of modelsToTry) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
        const { data, error } = await fetchGemini(url, payload);

        if (error) {
          lastError = error;
          console.warn(`[Gemini] Network error with key ${apiKey.slice(0, 8)}... (${modelName}): ${error}`);
          continue;
        }

        if (data?.error) {
          lastError = data.error.message || 'API error';
          console.warn(`[Gemini] Key ${apiKey.slice(0, 8)}... notice (${modelName}): ${data.error.message}`);
          // If rate limited or error, break model loop and switch to NEXT key immediately!
          break;
        }

        const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (candidateText) {
          textResult = candidateText;
          break;
        }
      }

      if (textResult) break; // Success! Exit key rotation loop
    }

    if (textResult) {
      cacheSet(cacheKey, textResult);

      if (sessionId && textResult) {
        try {
          const history = await loadHistory(sessionId);
          const updated = [
            ...(history || []),
            { role: 'user', content: user },
            { role: 'assistant', content: textResult },
          ];
          saveHistory(sessionId, updated);
          trackApiConsumption(userId, user, textResult);
        } catch (e) {
          console.warn('[Gemini] History save notice:', e);
        }
      }

      return NextResponse.json({ text: textResult });
    }

    return NextResponse.json({ error: lastError || 'All Gemini API keys in .env were tried but unavailable.' });
  } catch (error) {
    console.error('[Gemini Route Error]:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' });
  }
}
