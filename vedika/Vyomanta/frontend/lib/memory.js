import { Redis } from '@upstash/redis';

let redis = null;

function getRedis() {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    redis = new Redis({ url, token });
    console.warn('[Memory] Upstash Redis connected');
  } else {
    console.warn('[Memory] Upstash Redis not configured (UPSTASH_REDIS_REST_URL/TOKEN missing)');
  }
  return redis;
}

const SESSION_TTL = 60 * 60;
const MAX_MESSAGES = 20;

export async function loadHistory(sessionId) {
  const r = getRedis();
  if (!r || !sessionId) {
    if (sessionId) console.warn(`[Memory] loadHistory skipped — no Redis for session ${sessionId}`);
    return [];
  }
  try {
    const data = await r.get(`chat:${sessionId}`);
    const result = Array.isArray(data) ? data : [];
    console.warn(`[Memory] loadHistory(${sessionId}) → ${result.length} messages`);
    return result;
  } catch (e) {
    console.warn(`[Memory] loadHistory error: ${e.message}`);
    return [];
  }
}

export async function saveHistory(sessionId, messages) {
  const r = getRedis();
  if (!r || !sessionId || !messages?.length) {
    if (sessionId) console.warn(`[Memory] saveHistory skipped — no Redis or empty messages for ${sessionId}`);
    return;
  }
  const trimmed = messages.slice(-MAX_MESSAGES).map(m => ({
    role: m.role || m.sender,
    content: m.content || m.text || '',
  }));
  await r.set(`chat:${sessionId}`, trimmed, { ex: SESSION_TTL });
  console.warn(`[Memory] saveHistory(${sessionId}) → ${trimmed.length} messages saved`);
}

export async function recall(userId) {
  const r = getRedis();
  if (!r || !userId) return [];
  try {
    const data = await r.get(`memories:${userId}`);
    const result = Array.isArray(data) ? data : [];
    console.warn(`[Memory] recall(${userId}) → ${result.length} memories`);
    return result;
  } catch { return []; }
}

export async function saveMemory(userId, text) {
  const r = getRedis();
  if (!r || !userId || !text) return;
  const existing = await recall(userId);
  if (!existing.includes(text)) {
    existing.push(text);
    await r.set(`memories:${userId}`, existing.slice(-50));
    console.warn(`[Memory] saveMemory(${userId}) → new fact stored`);
  }
}

export function buildMemoryContext(history, memories) {
  let ctx = '';
  if (history?.length > 0) {
    ctx += '\n\nConversation history from this session:\n';
    ctx += history.map(m => `${m.role === 'user' ? 'Student' : 'Tutor'}: ${m.content}`).join('\n');
  }
  if (memories?.length > 0) {
    ctx += '\n\nRelevant memories about this student (from past sessions):\n';
    ctx += memories.map(f => `- ${f}`).join('\n');
    ctx += '\n\nUse these memories to personalize your teaching. Do NOT mention these memories explicitly unless directly relevant.';
  }
  return ctx;
}

import fs from 'fs';
import path from 'path';

export async function trackApiConsumption(userId, promptText, responseText) {
  const promptTokens = Math.ceil((promptText || '').length / 4);
  const responseTokens = Math.ceil((responseText || '').length / 4);
  const totalTokens = promptTokens + responseTokens;

  // 1. Redis increment
  const r = getRedis();
  if (r && userId) {
    try {
      await Promise.all([
        r.hincrby('gemini:api_calls', userId, 1),
        r.hincrby('gemini:tokens_consumed', userId, totalTokens),
        r.incrby('gemini:global:api_calls', 1),
        r.incrby('gemini:global:tokens_consumed', totalTokens)
      ]);
      console.warn(`[Memory] trackApiConsumption (Redis) for ${userId}: +${totalTokens} tokens`);
    } catch (e) {
      console.warn(`[Memory] trackApiConsumption Redis error: ${e.message}`);
    }
  }
}

export async function getApiConsumptionStats() {
  const r = getRedis();
  let stats = {
    global_api_calls: 0,
    global_tokens_consumed: 0,
    users: []
  };

  if (r) {
    try {
      const [globalCalls, globalTokens, callsHash, tokensHash] = await Promise.all([
        r.get('gemini:global:api_calls'),
        r.get('gemini:global:tokens_consumed'),
        r.hgetall('gemini:api_calls'),
        r.hgetall('gemini:tokens_consumed')
      ]);

      if (globalCalls) stats.global_api_calls = parseInt(globalCalls);
      if (globalTokens) stats.global_tokens_consumed = parseInt(globalTokens);

      const usersMap = {};
      if (callsHash) {
        for (const [uid, count] of Object.entries(callsHash)) {
          usersMap[uid] = { userId: uid, api_calls: parseInt(count), tokens_consumed: 0 };
        }
      }
      if (tokensHash) {
        for (const [uid, tokens] of Object.entries(tokensHash)) {
          if (!usersMap[uid]) {
            usersMap[uid] = { userId: uid, api_calls: 0, tokens_consumed: parseInt(tokens) };
          } else {
            usersMap[uid].tokens_consumed = parseInt(tokens);
          }
        }
      }
      stats.users = Object.values(usersMap).sort((a, b) => b.tokens_consumed - a.tokens_consumed);
      
      if (stats.global_api_calls > 0) {
        return stats;
      }
    } catch (e) {
      console.warn(`[Memory] getApiConsumptionStats Redis error, trying file fallback: ${e.message}`);
    }
  }

  try {
    const filePath = path.join(process.cwd(), 'lib', 'api_consumption.json');
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      stats.global_api_calls = data.global_api_calls || 0;
      stats.global_tokens_consumed = data.global_tokens_consumed || 0;
      
      const usersMap = {};
      if (data.api_calls) {
        for (const [uid, count] of Object.entries(data.api_calls)) {
          usersMap[uid] = { userId: uid, api_calls: count, tokens_consumed: 0 };
        }
      }
      if (data.tokens_consumed) {
        for (const [uid, tokens] of Object.entries(data.tokens_consumed)) {
          if (!usersMap[uid]) {
            usersMap[uid] = { userId: uid, api_calls: 0, tokens_consumed: tokens };
          } else {
            usersMap[uid].tokens_consumed = tokens;
          }
        }
      }
      stats.users = Object.values(usersMap).sort((a, b) => b.tokens_consumed - a.tokens_consumed);
    }
  } catch (e) {
    console.warn(`[Memory] getApiConsumptionStats file reading error: ${e.message}`);
  }

  return stats;
}
