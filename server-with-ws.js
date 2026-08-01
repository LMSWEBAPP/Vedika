const http = require('http');
const express = require('express');
const { WebSocketServer } = require('ws');
const next = require('next');
const { GoogleGenAI, Modality } = require('@google/genai');
const { Redis } = require('@upstash/redis');
require('dotenv').config();

const PORT = parseInt(process.env.PORT || '3000', 10);
const dev = process.env.NODE_ENV !== 'production';
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();

const GEMINI_KEYS = [
  process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY_1,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
  process.env.GEMINI_API_KEY_4
].filter(Boolean);

let connectionCount = 0;

function getGeminiClient() {
  if (GEMINI_KEYS.length === 0) {
    throw new Error('GEMINI_API_KEY environment variable is required.');
  }
  // Rotate key round-robin based on incoming connection count to distribute concurrent free-tier session load
  const apiKey = GEMINI_KEYS[connectionCount % GEMINI_KEYS.length];
  connectionCount++;
  console.log(`[VoiceWSCombined] Routing connection using Gemini Key index ${(connectionCount - 1) % GEMINI_KEYS.length}`);
  return new GoogleGenAI({ apiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
}

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
let redis = null;
if (redisUrl && redisToken) {
  redis = new Redis({ url: redisUrl, token: redisToken });
}

async function loadMemoryContext(sessionId, userId) {
  if (!redis) return '';
  try {
    const [history, memories] = await Promise.all([
      redis.get(`chat:${sessionId}`).then(d => Array.isArray(d) ? d : []).catch(() => []),
      redis.get(`memories:${userId}`).then(d => Array.isArray(d) ? d : []).catch(() => []),
    ]);
    let ctx = '';
    if (history.length > 0) {
      ctx += '\n\nConversation history from this session:\n';
      ctx += history.map(m => `${m.role === 'user' ? 'Student' : 'Tutor'}: ${m.content}`).join('\n');
    }
    if (memories.length > 0) {
      ctx += '\n\nRelevant memories about this student (from past sessions):\n';
      ctx += memories.map(f => `- ${f}`).join('\n');
    }
    return ctx;
  } catch { return ''; }
}

function analyzeSentiment(text) {
  const lowercase = text.toLowerCase();
  const confusedWords = ["don't understand","do not understand","dont understand","not sure","confused","cannot get","cant get","difficult","hard","stuck","doubt","explain again","unclear","lost","struggling","help","confusing","అర్థం కాలేదు","కష్టంగా ఉంది","సందేహం","తెలియదు","మళ్ళీ చెప్పండి","కన్ఫ్యూజ్","ardham raledu","artham kaledu","kashtanga undi","malli cheppandi","samajh nahi","mushkil","kathin","shanka","phirse","phir se","pareshani","confuse","sandeha"];
  const positiveWords = ["understand","got it","easy","awesome","perfect","clear","great","wow","fantastic","amazing","makes sense","thank you","thanks","excellent","brilliant","అర్థమైంది","సులభంగా ఉంది","చాలా బాగుంది","థాంక్స్","సూపర్","అవును","ardhamaindi","sulabhanga undi","chala bagundi","samajh gaya","samajh gya","aasan","saral","badhiya","bahut achha","clear hai","dhanyawad","shukriya"];
  const curiousWords = ["what is","how do","tell me about","why is","curious","interested","learn","know","question","ఏమిటి","ఎలా","ఎందుకు","తెలుసుకోవాలి","emiti","ela","enduku","telusukovali","kya hai","kaise","kyun","jaan na"];
  let confusedCount = 0, positiveCount = 0, curiousCount = 0;
  for (const w of confusedWords) { if (lowercase.includes(w)) confusedCount++; }
  for (const w of positiveWords) { if (lowercase.includes(w)) positiveCount++; }
  for (const w of curiousWords) { if (lowercase.includes(w)) curiousCount++; }
  if (confusedCount > positiveCount && confusedCount >= curiousCount)
    return { label: 'Struggling / Confused', score: -0.6, emoji: '\uD83D\uDE1F' };
  if (positiveCount > confusedCount && positiveCount >= curiousCount)
    return { label: 'Happy / Confident', score: 0.8, emoji: '\uD83D\uDE0A' };
  if (curiousCount > confusedCount && curiousCount > positiveCount)
    return { label: 'Curious / Inquisitive', score: 0.4, emoji: '\uD83E\uDD14' };
  return { label: 'Calm / Conversational', score: 0.0, emoji: '\uD83D\uDE10' };
}

nextApp.prepare().then(() => {
  const app = express();
  const server = http.createServer(app);

  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    try {
      const pathname = new URL(request.url || '', `http://${request.headers.host}`).pathname;
      if (pathname === '/api/ws') {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
      } else {
        socket.destroy();
      }
    } catch {
      socket.destroy();
    }
  });

  // Health endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', geminiConfigured: !!process.env.GEMINI_API_KEY });
  });

  wss.on('connection', async (clientWs, request) => {
    console.log('[WS] Client connected');
    const searchParams = new URL(request.url || '', 'http://localhost').searchParams;
    const language = searchParams.get('language') || 'all';
    const subject = searchParams.get('subject') || 'all';

    let systemInstruction =
      'You are a friendly, patient, and highly expert academic tutor supporting school students. ' +
      'Your goal is to guide students and encourage their curiosity. ' +
      'Keep answers extremely conversational and concise (usually strictly 1 to 3 sentences maximum) so that it is easy and comfortable to listen to of the speech delivery. ' +
      'Do not output long formulas or dense blocks of texts. Break it down or offer to explain details when they ask. ';

    if (language === 'telugu') systemInstruction += 'You must speak in Telugu only (unless referring to specific scientific/mathematical English terms). Frame your explanations sweetly in Telugu.';
    else if (language === 'hindi') systemInstruction += 'You must speak in Hindi. Use simple, easily understandable Hindi terms with a helpful academic tutoring style.';
    else if (language === 'english') systemInstruction += 'Please speak in clear, expressive English. Keep explanations simplified and kid-friendly.';
    else systemInstruction += 'You are multilingual. Support Telugu, Hindi, and English. Respond in the exact language the student speaks to you, or blend them naturally if they use a blend.';

    if (subject === 'math') systemInstruction += ' Currently helping with Mathematics! Help explain concepts like addition, fractions, algebra, or geometry using simple physical analogies.';
    else if (subject === 'science') systemInstruction += ' Currently helping with Science! Help explain concepts like gravity, photosynthesis, planets, or animals with fun, exciting facts.';
    else if (subject === 'languages') systemInstruction += ' Currently helping with Languages & Reading! Help expand vocabulary, teach correct grammar, or guide reading comprehensions with interesting sentences.';
    else systemInstruction += ' You are ready to tutor on any academic school subject: math, science, history, geography, languages, or reading.';

    const sessionId = searchParams.get('sessionId');
    const userId = searchParams.get('userId');
    const memoryCtx = await loadMemoryContext(sessionId, userId);
    if (memoryCtx) systemInstruction += memoryCtx;

    let geminiSession = null;
    let isConnecting = false;
    let setupTimeout = null;

    async function connectGemini(customConfig) {
      if (geminiSession || isConnecting) return;
      isConnecting = true;
      try {
        clientWs.send(JSON.stringify({ type: 'status', message: 'Establishing low-latency connection to Gemini...' }));
        const ai = getGeminiClient();

        let finalSystemInstruction = systemInstruction;
        if (customConfig && customConfig.systemInstruction) {
          if (typeof customConfig.systemInstruction === 'string') {
            finalSystemInstruction = customConfig.systemInstruction;
          } else if (customConfig.systemInstruction.parts && customConfig.systemInstruction.parts[0]) {
            finalSystemInstruction = customConfig.systemInstruction.parts[0].text;
          }
        }
        if (memoryCtx && !finalSystemInstruction.includes(memoryCtx)) {
          finalSystemInstruction += memoryCtx;
        }

        const modelName = (customConfig && customConfig.model) || 'gemini-3.1-flash-live-preview';

        const config = {
          responseModalities: (customConfig && customConfig.generationConfig?.responseModalities) || [Modality.AUDIO],
          speechConfig: (customConfig && customConfig.generationConfig?.speechConfig) || { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          systemInstruction: finalSystemInstruction,
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        };

        if (customConfig && customConfig.tools) {
          config.tools = customConfig.tools;
        }

        geminiSession = await ai.live.connect({
          model: modelName,
          callbacks: {
            onmessage: (message) => {
              const content = message.serverContent;
              if (content) {
                for (const part of content.modelTurn?.parts || []) {
                  if (part.inlineData?.data) {
                    clientWs.send(JSON.stringify({ type: 'audio', data: part.inlineData.data }));
                  }
                }
                if (content.outputTranscription?.text) {
                  clientWs.send(JSON.stringify({ type: 'agent-transcription', text: content.outputTranscription.text }));
                }
                if (content.interrupted) {
                  clientWs.send(JSON.stringify({ type: 'interrupted' }));
                }
                if (content.inputTranscription?.text?.trim()) {
                  const sentiment = analyzeSentiment(content.inputTranscription.text);
                  clientWs.send(JSON.stringify({ type: 'user-transcription', text: content.inputTranscription.text, sentiment }));
                }
              }

              const tc = message.toolCall;
              if (tc) {
                clientWs.send(JSON.stringify({ type: 'tool-call', toolCall: tc }));
              }
            },
            onclose: () => {
              clientWs.send(JSON.stringify({ type: 'status', message: 'Tutor connection closed.' }));
            },
            onerror: (error) => {
              console.error('[WS] Session error:', error);
              clientWs.send(JSON.stringify({ type: 'error', message: 'Session error occurred.' }));
            },
          },
          config,
        });

        console.log('[WS] Connected with Gemini Live API');
        if (customConfig) {
          clientWs.send(JSON.stringify({ type: 'status', message: 'setup_complete' }));
        } else {
          clientWs.send(JSON.stringify({ type: 'status', message: 'Tutor is ready! Ask your academic questions.' }));
        }
      } catch (err) {
        console.error('[WS] Failed connecting to Gemini Live API:', err.message);
        clientWs.send(JSON.stringify({ type: 'error', message: `Tutoring setup failed: ${err.message}` }));
        clientWs.close();
      } finally {
        isConnecting = false;
      }
    }

    const hasQueryParams = searchParams.get('language') || searchParams.get('subject') || searchParams.get('sessionId');
    if (hasQueryParams) {
      await connectGemini();
    } else {
      setupTimeout = setTimeout(async () => {
        await connectGemini();
      }, 1500);
    }

    const clientRole = searchParams.get('role') || 'generic';
    wss.clients.add(clientWs);

    clientWs.on('message', async (buffer) => {
      try {
        const msg = JSON.parse(buffer.toString());
        
        // Broadcast local bridge events (WEBAPP_STATE_UPDATE, PUZZLE_STUCK, NAVIGATE_WEBAPP, TRIGGER_HINT, PET_ACTION_REQUESTED)
        const relayTypes = ['WEBAPP_STATE_UPDATE', 'PUZZLE_STUCK', 'NAVIGATE_WEBAPP', 'TRIGGER_HINT', 'PET_ACTION_REQUESTED'];
        if (relayTypes.includes(msg.type) || relayTypes.includes(msg.event)) {
          const payloadStr = JSON.stringify(msg);
          for (const client of wss.clients) {
            if (client !== clientWs && client.readyState === 1) {
              client.send(payloadStr);
            }
          }
        }

        if (msg.setup) {
          if (setupTimeout) { clearTimeout(setupTimeout); setupTimeout = null; }
          await connectGemini(msg.setup);
        } else if (msg.type === 'audio' && msg.data) {
          if (!geminiSession && !isConnecting) {
            if (setupTimeout) { clearTimeout(setupTimeout); setupTimeout = null; }
            await connectGemini();
          }
          if (geminiSession) {
            geminiSession.sendRealtimeInput({ audio: { data: msg.data, mimeType: 'audio/pcm;rate=16000' } });
          }
        } else if (msg.type === 'tool-response' && msg.toolResponse && geminiSession) {
          geminiSession.sendToolResponse(msg.toolResponse);
        }
      } catch (e) {
        console.error('[WS] Message error:', e);
      }
    });

    clientWs.on('close', () => {
      console.log('[WS] Client disconnected');
      if (setupTimeout) clearTimeout(setupTimeout);
      if (geminiSession) { try { geminiSession.close(); } catch {} }
    });
  });

  // Forward all other requests to Next.js
  app.all('*', (req, res) => {
    return handle(req, res);
  });

  server.listen(PORT, () => {
    console.log(`[Server] Running on http://localhost:${PORT} (Next.js + WebSocket)`);
  });
});
