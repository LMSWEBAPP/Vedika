import { NextResponse } from 'next/server';
import { cacheGet, cacheSet, makeCacheKey } from '@/lib/cache';
import { getRotatedKey } from '@/lib/keys';
import { loadHistory, saveHistory, recall, buildMemoryContext, trackApiConsumption } from '@/lib/memory';

function calculateWait(error, baseDelay, attempt) {
  if (error?.details) {
    for (const d of error.details) {
      if (d['@type'] === 'type.googleapis.com/google.rpc.RetryInfo' && d.retryDelay) {
        const m = d.retryDelay.match(/([\d.]+)(s|ms)/);
        if (m) return parseFloat(m[1]) * (m[2] === 'ms' ? 1 : 1000) + 200;
      }
    }
  }
  if (error?.message) {
    const m = error.message.match(/Please retry in ([\d.]+)(m?s)/i);
    if (m) return parseFloat(m[1]) * (m[2].toLowerCase() === 'ms' ? 1 : 1000) + 200;
  }
  return baseDelay * Math.pow(2, attempt);
}

async function fetchWithRetry(url, options, retries = 5, baseDelay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      const data = await response.json();

      if (data.error && (data.error.code === 429 || data.error.code === 503)) {
        const ms = calculateWait(data.error, baseDelay, i);
        console.warn(`[Backend] ${data.error.code}. Retry in ${Math.round(ms)}ms (${i + 1}/${retries})`);
        await new Promise(r => setTimeout(r, ms));
        continue;
      }

      return { response, data };
    } catch (error) {
      if (i === retries - 1) throw error;
      const ms = baseDelay * Math.pow(2, i);
      console.warn(`[Backend] Network error. Retry in ${ms}ms (${i + 1}/${retries})`);
      await new Promise(r => setTimeout(r, ms));
    }
  }
  throw new Error('Max retries exceeded');
}

export async function POST(request) {
  const { system, user, maxOutputTokens, sessionId, userId } = await request.json();
  const activeKey = getRotatedKey();

  if (!activeKey) {
    return NextResponse.json({ error: 'Gemini API key is not configured on the server.' }, { status: 500 });
  }
  if (!user) {
    return NextResponse.json({ error: 'User message is required.' }, { status: 400 });
  }

  // Load memory context
  console.warn(`[Gemini] sessionId=${sessionId} userId=${userId}`);
  const [history, memories] = await Promise.all([
    loadHistory(sessionId),
    recall(userId),
  ]);
  const memoryCtx = buildMemoryContext(history, memories);
  const fullSystem = system ? system + memoryCtx : memoryCtx;
  console.warn(`[Gemini] history=${history?.length} memories=${memories?.length} ctxLen=${memoryCtx.length}`);

  const cacheKey = makeCacheKey('generate', fullSystem, user, maxOutputTokens);
  const cached = cacheGet(cacheKey);
  if (cached) return NextResponse.json({ text: cached });

  try {
    const historyContents = (history || []).map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    const { response, data } = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${activeKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            ...historyContents,
            { role: 'user', parts: [{ text: user }] },
          ],
          ...(fullSystem ? { systemInstruction: { parts: [{ text: fullSystem }] } } : {}),
          generationConfig: { temperature: 0.4, maxOutputTokens: maxOutputTokens || 8192 },
        }),
      }
    );

    if (data.error) {
      return NextResponse.json({ error: data.error.message }, { status: response.status || 500 });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (text) cacheSet(cacheKey, text);

    // Save working memory asynchronously
    if (sessionId && text) {
      const updated = [
        ...(history || []),
        { role: 'user', content: user },
        { role: 'assistant', content: text },
      ];
      saveHistory(sessionId, updated);
      trackApiConsumption(userId, user, text);
    }

    return NextResponse.json({ text });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
