import { NextResponse } from 'next/server';
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

    let ragContext = '';

    try {
      // 1. Generate Query Embedding
      console.warn(`[TutorChat] Generating embedding for query: "${user.slice(0, 30)}..."`);
      const embedding = await fetchEmbeddings(user, apiKey);
      
      if (embedding) {
        // 2. Fetch secure chunks from centralized RLS API on Render
        const rlsEndpoint = `${process.env.FRAPPE_URL || 'https://vyomanta.onrender.com'}/api/method/lms.lms.api.retrieve_secure_chunks_internal`;
        console.warn(`[TutorChat] Querying Central RLS API at ${rlsEndpoint}`);
        
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
          // Frappe JSON responses wrap whitelisted outputs under the 'message' key
          const chunks = rlsData.message?.chunks || [];
          console.warn(`[TutorChat] Retrieved ${chunks.length} secure chunks.`);
          
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
          console.error(`[TutorChat] RLS API query failed: ${rlsResponse.status} ${rlsResponse.statusText}`);
        }
      }
    } catch (e) {
      console.error("[TutorChat] RAG retrieval failed, falling back to plain chat:", e);
    }

    // 3. Load conversation history and facts
    const [history, memories] = await Promise.all([
      loadHistory(sessionId),
      recall(userId),
    ]);
    const memoryCtx = buildMemoryContext(history, memories);
    
    // Construct final system instructions incorporating RAG context
    const fullSystem = (system || '') + memoryCtx + ragContext;

    // 4. Call Gemini 2.5 Flash
    const historyContents = (history || []).map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
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

    const data = await response.json();
    if (data.error) {
      return NextResponse.json({ error: data.error.message }, { status: 500 });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Save conversation to Redis history cache
    if (sessionId && text) {
      const updated = [
        ...(history || []),
        { role: 'user', content: user },
        { role: 'assistant', content: text },
      ];
      await saveHistory(sessionId, updated);
      await trackApiConsumption(userId, user, text);
    }

    return NextResponse.json({ text });
  } catch (error) {
    console.error("[TutorChat API] Server exception:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
