import { NextResponse } from 'next/server';
import { streamText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { verifyJwt } from '@/lib/auth';
import { getRotatedKey } from '@/lib/keys';
import pool from '@/lib/db';
import { loadHistory, saveHistory, recall, buildMemoryContext, trackApiConsumption } from '@/lib/memory';

async function fetchEmbeddings(text, apiKey) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'models/gemini-embedding-001',
        content: { parts: [{ text }] },
        outputDimensionality: 768
      })
    }
  );
  if (!response.ok) {
    throw new Error(`Embedding API failed: ${response.statusText}`);
  }
  const data = await response.json();
  return data.embedding?.values;
}

export async function POST(request) {
  try {
    const authHeader = request.headers.get('Authorization');
    const payload = verifyJwt(authHeader);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized JWT token.' }, { status: 401 });
    }

    const { system, user, maxOutputTokens, sessionId, userId, courseId: bodyCourseId } = await request.json();
    if (!user || !sessionId) {
      return NextResponse.json({ error: 'User message and sessionId are required.' }, { status: 400 });
    }

    let courseId = bodyCourseId;
    if (!courseId || courseId === 'general' || courseId === 'null') {
      const [enrollments] = await pool.query(
        'SELECT course FROM test.`tabLMS Enrollment` WHERE member = ? LIMIT 1',
        [userId]
      );
      if (enrollments.length > 0) {
        courseId = enrollments[0].course;
      } else {
        courseId = 'a-guide-to-frappe-learning';
      }
    }

    const apiKey = getRotatedKey();
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key is not configured.' }, { status: 500 });
    }

    // Start Redis history and memories queries in parallel with the embedding generation to reduce latency
    const redisPromise = Promise.all([
      loadHistory(sessionId),
      recall(userId),
    ]);

    let ragContext = '';

    try {
      // 1. Generate Query Embedding
      console.warn(`[TutorStream] Generating embedding for query: "${user.slice(0, 30)}..."`);
      const embedding = await fetchEmbeddings(user, apiKey);
      
      if (embedding) {
        // 2. Fetch secure chunks from centralized RLS API on Render
        const rlsEndpoint = `${process.env.FRAPPE_URL || 'https://vyomanta.onrender.com'}/api/method/lms.lms.api.retrieve_secure_chunks_internal`;
        console.warn(`[TutorStream] Querying Central RLS API at ${rlsEndpoint}`);
        
        const internalToken = process.env.INTERNAL_SERVICE_TOKEN || 'internal_key_123';
        
        const rlsResponse = await fetch(rlsEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Token': internalToken
          },
          body: JSON.stringify({
            security_context: JSON.stringify({
              tenantId: payload.tenant_id,
              userId: payload.user_id,
              sessionId,
              courseId
            }),
            query_vector: JSON.stringify(embedding),
            similarity_threshold: 0.3,
            limit: 4
          })
        });

        if (rlsResponse.ok) {
          const rlsData = await rlsResponse.json();
          const chunks = rlsData.message?.chunks || [];
          console.warn(`[TutorStream] Retrieved ${chunks.length} secure chunks.`);
          
          if (chunks.length > 0) {
            // Deduplicate chunks by content
            const uniqueChunks = [];
            const seenContents = new Set();
            for (const chunk of chunks) {
              const cleanContent = chunk.content.trim();
              if (!seenContents.has(cleanContent)) {
                seenContents.add(cleanContent);
                uniqueChunks.push(chunk);
              }
            }

            if (uniqueChunks.length > 0) {
              ragContext = '\n\nUse the following document segments as your knowledge context to answer the student\'s question:\n';
              uniqueChunks.forEach(chunk => {
                ragContext += `[Source: Page ${chunk.page_number}] ${chunk.content}\n`;
              });
              ragContext += '\nUse the provided context to answer the question when relevant and cite page numbers. If the student\'s question is unrelated to the context or cannot be answered using it, use your own general knowledge to answer directly, but clarify that it is from general knowledge rather than the document.';
            }
          }
        } else {
          console.error(`[TutorStream] RLS API query failed: ${rlsResponse.status} ${rlsResponse.statusText}`);
        }
      }
    } catch (e) {
      console.error("[TutorStream] RAG retrieval failed, falling back to plain chat:", e);
    }

    // 3. Await the pre-started conversation history and facts
    const [history, memories] = await redisPromise;
    const memoryCtx = buildMemoryContext(history, memories);
    
    // Construct final system instructions incorporating RAG context
    const fullSystem = (system || '') + memoryCtx + ragContext;

    // 4. Stream response using Vercel AI SDK
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
          trackApiConsumption(userId, user, text);
        }
        // Save conversation history to Redis
        if (sessionId && text) {
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
    console.error("[TutorStream API] Server exception:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
