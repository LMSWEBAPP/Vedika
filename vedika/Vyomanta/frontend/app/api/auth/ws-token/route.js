import { NextResponse } from 'next/server';
import { verifyJwt } from '@/lib/auth';
import { Redis } from '@upstash/redis';
import crypto from 'crypto';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

export async function GET(request) {
  try {
    const authHeader = request.headers.get('Authorization');
    const payload = verifyJwt(authHeader);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized JWT token.' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const courseId = searchParams.get('courseId');
    
    if (!sessionId || !courseId) {
      return NextResponse.json({ error: 'Missing sessionId or courseId query parameter.' }, { status: 400 });
    }
    
    // Generate a single-use random ticket ID
    const ticketId = crypto.randomBytes(24).toString('hex');
    
    const ticketPayload = {
      user_id: payload.user_id,
      tenant_id: payload.tenant_id,
      session_id: sessionId,
      course_id: courseId
    };
    
    // Store ticket in Redis with a 60-second TTL
    await redis.set(`ws_ticket:${ticketId}`, JSON.stringify(ticketPayload), { ex: 60 });
    
    console.warn(`[WS Auth] Issued single-use ticket ${ticketId} for user ${payload.user_id}`);
    
    return NextResponse.json({ ticket: ticketId });
  } catch (error) {
    console.error("[WS Auth API] Server exception:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
