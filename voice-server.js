const http = require('http');
const { WebSocketServer } = require('ws');
const { GoogleGenAI, Modality } = require('@google/genai');
const { Redis } = require('@upstash/redis');
require('dotenv').config();

const PORT = parseInt(process.env.PORT || '5001', 10);

function getGeminiKeys() {
  const keys = [];
  for (const k in process.env) {
    if ((k === 'GEMINI_API_KEY' || k.startsWith('GEMINI_API_KEY_')) && process.env[k] && process.env[k].trim()) {
      const val = process.env[k].trim();
      if (!keys.includes(val)) {
        keys.push(val);
      }
    }
  }
  return keys;
}

let connectionCount = 0;

function getGeminiClient() {
  const keys = getGeminiKeys();
  if (keys.length === 0) {
    throw new Error('GEMINI_API_KEY environment variable is required.');
  }
  // Random load-balanced key selection across available GEMINI_API_KEY_* keys
  const randomIndex = Math.floor(Math.random() * keys.length);
  const apiKey = keys[randomIndex];
  connectionCount++;
  console.log(`[VoiceWS] Load-balanced connection #${connectionCount} using random Gemini Key index ${randomIndex} (Total keys: ${keys.length}, Key ending ...${apiKey.slice(-4)})`);
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

const server = http.createServer((req, res) => {
  if (req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'healthy', geminiConfigured: !!process.env.GEMINI_API_KEY }));
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Voice Tutor WebSocket Server');
  }
});

const wss = new WebSocketServer({ server, path: '/api/ws' });

wss.on('connection', async (clientWs, request) => {
  console.log('[VoiceWS] Client connected');
  const searchParams = new URL(request.url || '', 'http://localhost').searchParams;
  const language = searchParams.get('language') || 'all';
  const subject = searchParams.get('subject') || 'all';

  let systemInstruction =
    'You are a warm, highly humanized, and friendly academic tutor supporting school students. ' +
    'VOICE & HUMANIZATION GUIDELINES: ' +
    'Speak in a smooth, expressive, warm, and natural human tone with a familiar, conversational Indian accent rhythm in English (using natural phrases like "chalo", "got it ya", "super simple", "no problem at all", "don\'t worry!"). ' +
    'Sound like an encouraging elder sibling or personal tutor: warm, relatable, dynamic, and full of natural life. ' +
    'Keep answers strictly short and fluid (usually 1 to 2 short sentences per turn) so text-to-speech voice output sounds immediate, crisp, and human. ' +
    'Never output markdown symbols, asterisks, bullet points, numbers, or complex formulas into text, as they disrupt natural voice synthesis. ';

  if (language === 'telugu') systemInstruction += 'LANGUAGE MODE: You must speak in sweet, conversational Telugu only (unless referring to specific scientific/mathematical English terms).';
  else if (language === 'hindi') systemInstruction += 'LANGUAGE MODE: You must speak in simple, warm, conversational Hindi.';
  else if (language === 'english') systemInstruction += 'LANGUAGE MODE: Speak in clear, warm, expressive Indian English with friendly colloquial phrasing.';
  else systemInstruction += 'CODE-SWITCHING & LANGUAGE MATCHING: Dynamically match and mirror the student\'s exact language mix and tone. If the user speaks in Teluglish (Telugu-English blend, e.g., "Artham kaledu brother", "Ela cheyyali cheppu"), respond in natural, sweet Teluglish (e.g., "Choodu, super simple line by line explain chestha!"). If the user speaks in Hinglish (Hindi-English blend, e.g., "Samajh nahi aaya, phir se batao"), respond in natural, friendly Hinglish (e.g., "Arre no problem! Step by step samajhte hain."). If the user speaks in English, respond in natural, warm Indian English. If the user speaks in Telugu or Hindi, respond in sweet conversational Telugu or Hindi.';

  if (subject === 'math') systemInstruction += ' SUBJECT FOCUS: Currently helping with Mathematics! Explain concepts like addition, fractions, algebra, or geometry using simple physical analogies.';
  else if (subject === 'science') systemInstruction += ' SUBJECT FOCUS: Currently helping with Science! Explain concepts like gravity, photosynthesis, planets, or animals with fun facts.';
  else if (subject === 'languages') systemInstruction += ' SUBJECT FOCUS: Currently helping with Languages & Reading! Expand vocabulary, teach correct grammar, or guide reading comprehensions.';
  else systemInstruction += ' SUBJECT FOCUS: You are ready to tutor on any academic school subject: math, science, history, geography, languages, or reading.';

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
            console.error('[VoiceWS] Session error:', error);
            clientWs.send(JSON.stringify({ type: 'error', message: 'Session error occurred.' }));
          },
        },
        config,
      });

      if (customConfig) {
        clientWs.send(JSON.stringify({ type: 'status', message: 'setup_complete' }));
      } else {
        clientWs.send(JSON.stringify({ type: 'status', message: 'Tutor is ready! Ask your academic questions.' }));
      }
    } catch (err) {
      console.error('[VoiceWS] Failed:', err.message);
      clientWs.send(JSON.stringify({ type: 'error', message: `Setup failed: ${err.message}` }));
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

  clientWs.on('message', async (buffer) => {
    try {
      const msg = JSON.parse(buffer.toString());
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
      console.error('[VoiceWS] Message error:', e);
    }
  });

  clientWs.on('close', () => {
    if (setupTimeout) clearTimeout(setupTimeout);
    if (geminiSession) { try { geminiSession.close(); } catch {} }
  });
});

server.listen(PORT, () => {
  console.log(`[VoiceWS] WebSocket server running on ws://localhost:${PORT}/api/ws`);
});
