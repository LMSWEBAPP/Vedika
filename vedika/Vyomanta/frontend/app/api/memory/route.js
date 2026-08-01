import { NextResponse } from 'next/server';
import { saveHistory, loadHistory, recall } from '@/lib/memory';

export async function POST(request) {
  const { action, sessionId, userId, messages } = await request.json();

  if (action === 'save' && sessionId && messages?.length > 0) {
    await saveHistory(sessionId, messages);
    return NextResponse.json({ ok: true });
  }

  if (action === 'load' && sessionId) {
    const [history, memories] = await Promise.all([
      loadHistory(sessionId),
      recall(userId),
    ]);
    return NextResponse.json({ history, memories });
  }

  return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
}
