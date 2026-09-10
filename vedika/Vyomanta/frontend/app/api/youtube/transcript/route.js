import { NextResponse } from 'next/server';

const transcriptCache = new Map();

export async function POST(request) {
  try {
    const { videoId } = await request.json();
    if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId.trim())) {
      return NextResponse.json({ error: 'Valid 11-character YouTube videoId is required' }, { status: 400 });
    }

    const cleanId = videoId.trim();

    // Check in-memory cache
    if (transcriptCache.has(cleanId)) {
      const entry = transcriptCache.get(cleanId);
      if (Date.now() - entry.timestamp < 300000) { // 5 min TTL
        return NextResponse.json({ success: true, transcript: entry.data, cached: true });
      }
    }

    let transcript = null;
    try {
      const { YoutubeTranscript } = await import('youtube-transcript');
      const fetchPromise = YoutubeTranscript.fetchTranscript(cleanId);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Transcript fetch timeout')), 3000)
      );
      transcript = await Promise.race([fetchPromise, timeoutPromise]);
    } catch (fetchErr) {
      console.warn(`[YouTube/Transcript] Notice: Could not fetch transcript for ${cleanId}:`, fetchErr.message);
    }

    if (Array.isArray(transcript) && transcript.length > 0) {
      const items = transcript.map(item => ({
        text: item.text,
        offset: typeof item.offset === 'number' ? item.offset : (item.start * 1000 || 0),
        duration: item.duration || 3000
      }));
      transcriptCache.set(cleanId, { data: items, timestamp: Date.now() });
      return NextResponse.json({ success: true, transcript: items });
    }

    return NextResponse.json({ success: false, transcript: [], message: 'No verbatim captions available for this video' });
  } catch (err) {
    console.error('[YouTube/Transcript] Unexpected error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch transcript' }, { status: 500 });
  }
}
