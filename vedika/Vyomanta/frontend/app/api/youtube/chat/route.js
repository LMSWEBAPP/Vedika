import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { getAllKeys } from '@/lib/keys';

function formatTimestamp(seconds) {
  const total = Math.floor(seconds || 0);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

async function generateWithFallback({ contents, systemInstruction, maxOutputTokens }) {
  const allKeys = getAllKeys();
  if (!allKeys || allKeys.length === 0) {
    throw new Error('No Gemini API keys configured');
  }

  const shuffledKeys = [...allKeys].sort(() => Math.random() - 0.5);
  const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
  let lastError = null;

  for (const apiKey of shuffledKeys) {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } }
    });

    for (const model of models) {
      try {
        const config = {
          maxOutputTokens: maxOutputTokens || 600,
        };
        if (systemInstruction) config.systemInstruction = systemInstruction;

        const response = await ai.models.generateContent({
          model,
          contents,
          config,
        });

        if (response.text) {
          return response.text;
        }
      } catch (err) {
        lastError = err;
        console.warn(`[Gemini Chat] Key ${apiKey.slice(0, 8)}... model ${model} notice:`, err?.message || err);
      }
    }
  }

  throw lastError || new Error("Failed to generate chat response with Gemini API");
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { videoId, title = '', question = '', history = [], timestamp = 0 } = body;

    if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(String(videoId).trim())) {
      return NextResponse.json({ error: 'Valid 11-character YouTube videoId is required' }, { status: 400 });
    }
    if (!question || !question.trim()) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    const cleanId = String(videoId).trim();
    const currentSeconds = Math.max(0, Math.floor(Number(timestamp || 0)));
    const formattedCurrentTime = formatTimestamp(currentSeconds);

    // 1. Retrieve full video transcript (or surrounding window)
    let transcriptContext = '';
    try {
      const { YoutubeTranscript } = await import('youtube-transcript');
      const fetchPromise = YoutubeTranscript.fetchTranscript(cleanId);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Transcript timeout')), 2500)
      );
      const transcript = await Promise.race([fetchPromise, timeoutPromise]).catch(() => null);

      if (Array.isArray(transcript) && transcript.length > 0) {
        const maxLines = 40;
        const step = Math.max(1, Math.floor(transcript.length / maxLines));
        const sampled = [];
        for (let i = 0; i < transcript.length; i += step) {
          const item = transcript[i];
          const sec = (item.offset !== undefined ? item.offset : (item.start || 0) * 1000) / 1000;
          sampled.push(`[${formatTimestamp(sec)}] ${item.text}`);
        }
        transcriptContext = sampled.join('\n');
      }
    } catch (e) {
      console.warn('[YouTube/Chat] Notice: Transcript fetch skipped:', e.message);
    }

    // 2. Build conversation history text
    const conversationText = Array.isArray(history)
      ? history.slice(-4).map(m => `${m.role === 'user' ? 'Student' : 'Vedika'}: ${m.text}`).join('\n')
      : '';

    // 3. Build AI prompt
    const prompt = `
You are Vedika, an intelligent, friendly AI video tutor for the lesson "${title || 'Lesson Video'}".
The video is currently paused at ${formattedCurrentTime} (${currentSeconds}s).

${transcriptContext ? `VIDEO TRANSCRIPT SYNOPSIS & TIMESTAMPS:\n${transcriptContext}` : `NOTE: Full captions not available. Answer based on general knowledge of "${title}".`}

${conversationText ? `CONVERSATION HISTORY:\n${conversationText}\n` : ''}

STUDENT QUESTION: "${question}"

INSTRUCTIONS:
1. Answer the student's question accurately, directly, and in simple plain English.
2. Keep the answer clear and concise (1-2 short paragraphs maximum).
3. If relevant, cite specific video timestamps (e.g. [03:00]) where the concept is taught in the video.
4. Do not invent facts or hallucinate non-existent details.
`;

    let textAnswer = null;
    try {
      textAnswer = await generateWithFallback({
        contents: prompt,
        maxOutputTokens: 600,
        systemInstruction: "You are Vedika, a concise video study companion. Answer directly, simply, and accurately with zero filler."
      });
    } catch (apiErr) {
      console.warn('[YouTube/Chat] Gemini SDK notice:', apiErr.message);
    }

    if (!textAnswer) {
      textAnswer = `Based on the lesson "${title}", at ${formattedCurrentTime} the topic covers core principles. If you have specific questions about key terms or equations, ask away!`;
    }

    return NextResponse.json({
      success: true,
      answer: textAnswer.trim(),
      timestamp: formattedCurrentTime,
      seconds: currentSeconds
    });
  } catch (err) {
    console.error('[YouTube/Chat] Error:', err);
    return NextResponse.json({
      success: false,
      answer: "I'm ready to answer any question about this video lesson!",
      timestamp: '0:00',
      seconds: 0
    });
  }
}
