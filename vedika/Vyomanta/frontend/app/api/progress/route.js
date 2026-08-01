import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

let redis = null;
function getRedis() {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    redis = new Redis({ url, token });
  }
  return redis;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');
  const r = getRedis();

  if (!r) {
    return NextResponse.json({ error: 'Redis not configured' }, { status: 500 });
  }

  try {
    if (email) {
      // Get progress for specific student
      const data = await r.get(`completed_lessons:${email}`);
      return NextResponse.json({ completed: data || {} });
    } else {
      // Get progress for all students (for admin statistics)
      const keys = await r.keys('completed_lessons:*');
      const result = {};
      if (keys.length > 0) {
        // Fetch all progress data in parallel
        const values = await Promise.all(keys.map(key => r.get(key)));
        keys.forEach((key, idx) => {
          const studentEmail = key.replace('completed_lessons:', '');
          result[studentEmail] = values[idx] || {};
        });
      }
      return NextResponse.json({ allProgress: result });
    }
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { email, completed } = await request.json();
    const r = getRedis();

    if (!r) {
      return NextResponse.json({ error: 'Redis not configured' }, { status: 500 });
    }

    if (!email || !completed) {
      return NextResponse.json({ error: 'Email and completed object are required' }, { status: 400 });
    }

    await r.set(`completed_lessons:${email}`, completed);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
