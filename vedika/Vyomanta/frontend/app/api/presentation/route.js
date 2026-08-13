import { NextResponse } from 'next/server';
import { getRotatedKey } from '@/lib/keys';

export async function POST(request) {
  try {
    const { transcript, activeFolderAssets = [], contextHistory = [] } = await request.json();

    if (!transcript || !transcript.trim()) {
      return NextResponse.json({ error: 'Speech transcript is required' }, { status: 400 });
    }

    const apiKey = getRotatedKey();
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key is not configured.' }, { status: 500 });
    }

    const systemInstruction = `You are Vedika's Dynamic Launch Event Presentation Operator AI.
Your job is to analyze real-time presenter speech transcripts, clean up any speech stumbles or poor articulation, and extract high-impact tech launch presentation elements.

Return ONLY a valid JSON object matching this schema without markdown code blocks:

{
  "cleanedTranscript": "A clean, rephrased, launch-grade sentence fixing any presenter stumbles, hesitation ('um', 'uh', repeated words), or poor articulation.",
  "elementType": "title" | "subtitle" | "bullet_point" | "highlight_sentence" | "key_point" | "general_speech",
  "formattedText": "Concise text formatted for live screen display (e.g. bold bullet statement or key takeaway)",
  "matchedAsset": "Filename of matching image or document from the provided folder assets, or null if no visual match"
}

Rules for Element Extraction:
1. If presenter introduces a main topic/product (e.g. 'Today we are introducing...', 'Let me talk about...'), classify as 'title' or 'subtitle'.
2. If presenter lists features or points (e.g. 'First...', 'Second...', 'Also...'), classify as 'bullet_point'.
3. If presenter states a central thesis, mission, or standout metric (e.g. 'This will revolutionize...', '10x faster performance'), classify as 'highlight_sentence'.
4. If presenter states a core feature or takeaway, classify as 'key_point'.
5. If the presenter stumbles heavily (e.g. 'so yeah like we made this thing and um it works kinda fast'), clean it up into a crisp statement (e.g. 'Engineered for maximum speed and efficiency').
6. Match any relevant asset filename from the provided assets list if the speaker mentions related concepts.`;

    const userPrompt = `Live Speech Transcript: "${transcript}"
Available Folder Assets: ${JSON.stringify(activeFolderAssets)}
Recent Presentation Elements: ${JSON.stringify(contextHistory.slice(-3))}

Analyze and output JSON:`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          systemInstruction: { parts: [{ text: systemInstruction }] },
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1024,
            responseMimeType: 'application/json'
          }
        })
      }
    );

    const data = await response.json();
    if (data.error) {
      console.error('Gemini presentation API error:', data.error);
      return NextResponse.json({ error: data.error.message }, { status: 500 });
    }

    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    let cleanJson = responseText.trim();
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/```$/, '').trim();
    }

    const parsed = JSON.parse(cleanJson);
    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Error in Presentation AI API:', error);
    return NextResponse.json({ error: 'Failed to process presentation speech' }, { status: 500 });
  }
}
