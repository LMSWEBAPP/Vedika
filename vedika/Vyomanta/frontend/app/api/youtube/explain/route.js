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

async function generateWithFallback({ contents, systemInstruction, responseMimeType, maxOutputTokens }) {
  const allKeys = getAllKeys();
  if (!allKeys || allKeys.length === 0) {
    throw new Error('No Gemini API keys configured');
  }

  const shuffledKeys = [...allKeys].sort(() => Math.random() - 0.5);
  const models = ["gemini-3.6-flash", "gemini-flash-latest", "gemini-2.5-flash", "gemini-flash-lite-latest"];
  let lastError = null;

  for (const apiKey of shuffledKeys) {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } }
    });

    for (const model of models) {
      try {
        const config = {
          maxOutputTokens: maxOutputTokens || 1000,
        };
        if (systemInstruction) config.systemInstruction = systemInstruction;
        if (responseMimeType) config.responseMimeType = responseMimeType;

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
        console.warn(`[Gemini] Key ${apiKey.slice(0, 8)}... model ${model} notice:`, err?.message || err);
      }
    }
  }

  throw lastError || new Error("Failed to generate response with Gemini API");
}

export async function POST(request) {
  let currentSeconds = 0;
  let formattedCurrentTime = '0:00';
  let title = '';
  let transcriptSnippet = '';

  try {
    const body = await request.json().catch(() => ({}));
    const videoId = body.videoId;
    title = body.title || '';
    const userQuestion = body.userQuestion || '';

    if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(String(videoId).trim())) {
      return NextResponse.json({ error: 'Valid 11-character YouTube videoId is required' }, { status: 400 });
    }

    const cleanId = String(videoId).trim();
    currentSeconds = Math.max(0, Math.floor(Number(body.timestamp || 0)));
    formattedCurrentTime = formatTimestamp(currentSeconds);

    // 1. Fetch transcript snippet if available with 2.5s timeout
    try {
      const { YoutubeTranscript } = await import('youtube-transcript');
      const fetchPromise = YoutubeTranscript.fetchTranscript(cleanId);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Transcript timeout')), 2500)
      );
      const transcript = await Promise.race([fetchPromise, timeoutPromise]).catch(() => null);

      if (Array.isArray(transcript) && transcript.length > 0) {
        // Tightly window around current timestamp: 25s before and 15s after
        const windowStart = Math.max(0, currentSeconds - 25);
        const windowEnd = currentSeconds + 15;
        const relevant = transcript.filter((item) => {
          const itemSec = (item.offset !== undefined ? item.offset : (item.start || 0) * 1000) / 1000;
          return itemSec >= windowStart && itemSec <= windowEnd;
        });

        if (relevant.length > 0) {
          transcriptSnippet = relevant
            .map((item) => {
              const sec = (item.offset !== undefined ? item.offset : (item.start || 0) * 1000) / 1000;
              return `[${formatTimestamp(sec)}] ${item.text}`;
            })
            .join('\n');
        }
      }
    } catch (e) {
      console.warn('[YouTube/Explain] Notice: Transcript fetch skipped:', e.message);
    }

    // 2. Prompt matching youtube-video-analyzer (0) logic
    const prompt = `
You are an expert, truthful video AI tutor.
The user paused the video "${title || "YouTube Video"}" at timestamp ${formattedCurrentTime} (${currentSeconds}s).
${userQuestion ? `User's question/observation: "${userQuestion}"` : `User asks: "What is he explaining at this time?"`}

${
  transcriptSnippet
    ? `VERIFIED SPOKEN WORDS / TOPIC AT THIS MOMENT (${formattedCurrentTime}):\n${transcriptSnippet}`
    : `NOTICE: Verbatim transcript was not extracted for this video.
CRITICAL ZERO-HALLUCINATION RULE:
- Analyze what is logically being taught at ${formattedCurrentTime} based on the video title "${title}".
- Do NOT fabricate fake direct quotes or make wild guesses.
- State clearly what section/topic the lesson is in at this timestamp.`
}

Provide a short, direct, accurate, and easy-to-understand explanation:
1. summary: Exactly 1 punchy, clear sentence explaining what is happening right now.
2. coreExplanation: 2-3 short, plain-English sentences explaining the concept, code, or demonstration simply without filler.
3. keyTakeaways: 2-3 concise bullet points (each under 12 words).
4. whyItMatters: 1 brief sentence explaining why this is important.
5. suggestedFollowUps: 2 short questions to ask next.

Return ONLY valid JSON.
`;

    const jsonText = await generateWithFallback({
      contents: prompt,
      responseMimeType: "application/json",
      maxOutputTokens: 1500,
      systemInstruction: "You are a concise, accurate AI tutor. You explain concepts simply, truthfully, and directly based strictly on the provided context.",
    });

    let cleanJson = jsonText.trim();
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```/, '').replace(/```$/, '').trim();
    }

    let parsed = {};
    try {
      parsed = JSON.parse(cleanJson);
    } catch (parseErr) {
      console.warn('[YouTube/Explain] JSON.parse failed, extracting match:', parseErr.message);
      const match = cleanJson.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          parsed = JSON.parse(match[0]);
        } catch (e2) {
          parsed = {};
        }
      }
    }

    const extractedSpoken = transcriptSnippet
      ? transcriptSnippet.split('\n').map(l => l.replace(/^\[.*?\]\s*/, '')).filter(Boolean).join(' ')
      : '';

    const finalData = {
      summary: parsed.summary || (extractedSpoken
        ? `At ${formattedCurrentTime}, the presenter explains: "${extractedSpoken.slice(0, 100)}..."`
        : `At ${formattedCurrentTime}, the video explains key concepts in ${title || 'this lesson'}.`),
      coreExplanation: parsed.coreExplanation || (extractedSpoken
        ? `At ${formattedCurrentTime}, the instructor demonstrates: "${extractedSpoken.slice(0, 200)}."`
        : `This moment covers essential concepts and demonstrations at ${formattedCurrentTime}.`),
      keyTakeaways: Array.isArray(parsed.keyTakeaways) && parsed.keyTakeaways.length > 0
        ? parsed.keyTakeaways
        : (extractedSpoken ? [extractedSpoken.slice(0, 45) + '...', 'Key timestamp lesson point'] : ["Core concept explanation", "Key lesson takeaway"]),
      whyItMatters: parsed.whyItMatters || "Understanding this moment helps build foundation for the overall topic.",
      suggestedFollowUps: Array.isArray(parsed.suggestedFollowUps) && parsed.suggestedFollowUps.length > 0
        ? parsed.suggestedFollowUps
        : [`Can you explain ${formattedCurrentTime} in simpler terms?`, "What are the main key takeaways?"],
      timestamp: formattedCurrentTime,
      seconds: currentSeconds
    };

    if (transcriptSnippet) finalData.transcriptSnippet = transcriptSnippet;

    return NextResponse.json(finalData);
  } catch (err) {
    console.error('[YouTube/Explain] Error:', err);
    const extractedSpoken = transcriptSnippet
      ? transcriptSnippet.split('\n').map(l => l.replace(/^\[.*?\]\s*/, '')).filter(Boolean).join(' ')
      : '';

    return NextResponse.json({
      summary: extractedSpoken
        ? `At ${formattedCurrentTime}, the presenter explains: "${extractedSpoken.slice(0, 110)}..."`
        : `At ${formattedCurrentTime}, key topic concepts in ${title || 'the video'} are discussed.`,
      coreExplanation: extractedSpoken
        ? `At ${formattedCurrentTime}, the lesson demonstrates: "${extractedSpoken.slice(0, 220)}."`
        : `Vedika AI evaluated the video timestamp at ${formattedCurrentTime}.`,
      keyTakeaways: extractedSpoken
        ? [extractedSpoken.slice(0, 50) + '...', 'Key timestamp lesson point']
        : ["Core concept breakdown", "Key timestamp insights"],
      whyItMatters: "Essential lesson content for topic mastery.",
      suggestedFollowUps: ["Can you explain this timestamp further?", "What is the key summary?"],
      timestamp: formattedCurrentTime,
      seconds: currentSeconds,
      ...(transcriptSnippet ? { transcriptSnippet } : {})
    });
  }
}
