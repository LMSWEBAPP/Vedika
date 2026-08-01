import { NextResponse } from 'next/server';
import { streamText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { cacheGet, cacheSet, makeCacheKey } from '@/lib/cache';
import { getRotatedKey } from '@/lib/keys';
import { loadHistory, saveHistory, recall, buildMemoryContext, trackApiConsumption } from '@/lib/memory';

export async function POST(request) {
  const { system, user, maxOutputTokens, sessionId, userId } = await request.json();
  const apiKey = getRotatedKey();

  if (!apiKey) {
    return NextResponse.json({ error: 'Gemini API key is not configured on the server.' }, { status: 500 });
  }
  if (!user) {
    return NextResponse.json({ error: 'User message is required.' }, { status: 400 });
  }

  // Load memory context
  console.warn(`[GeminiStream] sessionId=${sessionId} userId=${userId}`);
  const [history, memories] = await Promise.all([
    loadHistory(sessionId),
    recall(userId),
  ]);
  const memoryCtx = buildMemoryContext(history, memories);
  const fullSystem = system + memoryCtx;
  console.warn(`[GeminiStream] history=${history?.length} memories=${memories?.length} ctxLen=${memoryCtx.length}`);

  const cacheKey = makeCacheKey('stream', fullSystem, user, maxOutputTokens);
  const cached = cacheGet(cacheKey);
  if (cached) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(cached));
        controller.close();
      },
    });
    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' },
    });
  }

  try {
    const provider = createGoogleGenerativeAI({ apiKey });
    const model = provider.languageModel('gemini-2.5-flash');

    const fullMessages = [
      ...(history || []).map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content })),
      { role: 'user', content: user },
    ];

    const result = streamText({
      model,
      system: fullSystem,
      messages: fullMessages,
      temperature: 0.4,
      maxTokens: maxOutputTokens || 8192,
      onFinish({ text }) {
        if (text) {
          cacheSet(cacheKey, text);
          trackApiConsumption(userId, user, text);
        }
        // Save working memory asynchronously
        if (sessionId) {
          const updated = [
            ...(history || []),
            { role: 'user', content: user },
            { role: 'assistant', content: text },
          ];
          saveHistory(sessionId, updated);
        }
      },
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.textStream) {
            controller.enqueue(encoder.encode(chunk));
          }
        } catch (e) {
          controller.enqueue(encoder.encode(`[Error: ${e.message}]`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
