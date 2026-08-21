const http = require('http');
const { WebSocketServer } = require('ws');
const { GoogleGenAI, Modality } = require('@google/genai');
const { Redis } = require('@upstash/redis');
require('dotenv').config();

const PORT = parseInt(process.env.PORT || '5001', 10);

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
  console.log(`[VoiceWS] Routing connection using Gemini Key index ${(connectionCount - 1) % GEMINI_KEYS.length}`);
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
  const mode = searchParams.get('mode') || 'tutor';
  const language = searchParams.get('language') || 'all';
  const subject = searchParams.get('subject') || 'all';
  const topic = searchParams.get('topic') || '';
  const level = searchParams.get('level') || 'College';
  const difficulty = searchParams.get('difficulty') || 'Medium';
  const programmingLanguage = searchParams.get('programmingLanguage') || '';
  const jdText = searchParams.get('jdText') || '';
  const experimentName = searchParams.get('experimentName') || topic;
  const isViva = mode === 'viva';
  const targetTopic = topic || experimentName || (isViva ? 'Academic Lab Experiment' : (programmingLanguage || 'Technical Stack'));

  let systemInstruction = '';

  if (mode === 'viva' || mode === 'interview') {
    // ─────────────────────────────────────────────────────────────
    // STRICT EXAMINER PERSONA (ADAPTIVE VIVA & TECHNICAL INTERVIEWS)
    // ─────────────────────────────────────────────────────────────
    const seniority = isViva ? `${level} Student` : `${level} Software Engineer`;

    systemInstruction =
      `You are a distinguished, formal, and articulate ${isViva ? 'Academic Viva Examiner' : 'Senior Technical Interviewer'}.\n` +
      `You are conducting a live oral ${isViva ? 'viva examination' : 'technical job interview'} in English.\n` +
      `Topic/Focus Domain: "${targetTopic}"\n` +
      `Target Level: ${seniority}\n` +
      `Difficulty Tier: ${difficulty.toUpperCase()} (${difficulty === 'Easy' ? 'fundamental definitions & core principles' : difficulty === 'Hard' ? 'low-level mechanics, edge cases, formulas, failure modes & deep trade-offs' : 'standard analytical questions & practical problem solving'}).\n` +
      `${jdText ? `Target Job Description: "${jdText.slice(0, 400)}..."\n` : ''}` +
      `\nEXAMINATION RULES:\n` +
      `1. SPEAK IN CLEAR CONVERSATIONAL ENGLISH ONLY. Speak naturally at a comfortable speaking pace like a real human interviewer.\n` +
      `2. NEVER speak question numbers or turn indices out loud (e.g. NEVER say "Question 1 of 5", "Question 2:", or "Turn 3"). Ask your questions directly and naturally.\n` +
      `3. NEVER reveal or hint answers during normal questioning. You are strictly evaluating the candidate's understanding.\n` +
      `4. REFUSAL OF CANDIDATE QUESTIONS: If the candidate tries to flip roles or ask general questions (e.g. "What do you think?", "Can you explain everything?"), DO NOT answer. Remind them: "We are in the middle of your oral examination right now—I am here to question you." and restate your question.\n` +
      `5. EXCEPTION - "I DON'T KNOW" & ANSWER REQUESTS:\n` +
      `   - If the candidate explicitly admits "I don't know", "I am not sure", or asks "Can you tell me the answer for this question?", handle it gracefully:\n` +
      `   - Give a short 1-sentence educational answer (e.g. "Understood. In short, [1-sentence core answer].").\n` +
      `   - Award 0 points for this question internally, and IMMEDIATELY move on to the next main topic/question without dwelling on it.\n` +
      `6. ADAPTIVE TOPIC FLOW & FOLLOW-UP RULES:\n` +
      `   - Conduct an interactive examination across 3 to 4 distinct key sub-topics/domains within the subject.\n` +
      `   - If candidate's response is vague, incomplete, or partially mistaken, ask an immediate targeted follow-up question probing deeper (e.g. "You mentioned X, but how does that handle Y?").\n` +
      `   - MAXIMUM 2 FOLLOW-UP QUESTIONS PER TOPIC. After 2 follow-ups (or if candidate answers thoroughly on first try), IMMEDIATELY shift to the next main topic.\n` +
      `   - Always introduce main topics naturally (e.g., "Let us move to our next key topic: [Topic Name]").\n` +
      `7. After the candidate finishes answering, give a short 1-sentence natural acknowledgment (e.g. "Got it, thank you.", "Understood, that makes sense.") before asking your question.\n` +
      `8. If the candidate asks to repeat or clarify (e.g. "repeat please", "say again", "pardon"), politely repeat the current question naturally.\n` +
      `9. CONCLUSION: When wrapping up the final topic or when notified that session time is closing, conclude warmly: "Thank you for your responses. That concludes your oral examination! Your scorecard report is ready."\n` +
      `10. START IMMEDIATELY: Greet the candidate briefly ("Welcome to your oral examination on ${targetTopic}. Let's begin!") and ask the first main question directly.`;
  } else {
    // ─────────────────────────────────────────────────────────────
    // EXISTING VOICE TUTOR PERSONA (100% UNTOUCHED)
    // ─────────────────────────────────────────────────────────────
    systemInstruction =
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
  }

  let geminiSession = null;

  try {
    clientWs.send(JSON.stringify({ type: 'status', message: 'Establishing low-latency connection to Gemini...' }));
    const ai = getGeminiClient();

    geminiSession = await ai.live.connect({
      model: 'gemini-3.1-flash-live-preview',
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
        },
        onclose: () => {
          clientWs.send(JSON.stringify({ type: 'status', message: 'Session connection closed.' }));
        },
        onerror: (error) => {
          console.error('[VoiceWS] Session error:', error);
          clientWs.send(JSON.stringify({ type: 'error', message: 'Session error occurred.' }));
        },
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
        systemInstruction,
        outputAudioTranscription: {},
        inputAudioTranscription: {},
      },
    });

    const readyMessage = mode === 'viva' 
      ? 'AI Examiner is ready! Oral viva examination starting..., say hello!' 
      : mode === 'interview'
      ? 'Technical Interviewer is ready! Technical interview starting...'
      : 'Tutor is ready! Ask your academic questions.';

    clientWs.send(JSON.stringify({ type: 'status', message: readyMessage }));

    // Send initial kickoff prompt for viva/interview so Gemini immediately begins speaking Question 1
    if (mode === 'viva' || mode === 'interview') {
      try {
        geminiSession.send({
          clientContent: {
            turns: [
              {
                role: 'user',
                parts: [
                  {
                    text: `Start the oral examination now. Greet the candidate briefly ("Welcome to your oral examination on ${targetTopic}. Let's begin!") and ask the first main question directly without speaking any question numbers.`
                  }
                ]
              }
            ],
            turnComplete: true
          }
        });
      } catch (kickoffErr) {
        console.warn('[VoiceWS] Kickoff turn error:', kickoffErr);
      }
    }
  } catch (err) {
    console.error('[VoiceWS] Failed:', err.message);
    clientWs.send(JSON.stringify({ type: 'error', message: `Setup failed: ${err.message}` }));
    clientWs.close();
    return;
  }

  clientWs.on('message', (buffer) => {
    try {
      const msg = JSON.parse(buffer.toString());
      if (msg.type === 'audio' && msg.data && geminiSession) {
        geminiSession.sendRealtimeInput({ audio: { data: msg.data, mimeType: 'audio/pcm;rate=16000' } });
      }
    } catch (e) { console.error('[VoiceWS] Audio error:', e); }
  });

  clientWs.on('close', () => {
    if (geminiSession) { try { geminiSession.close(); } catch {} }
  });
});

server.listen(PORT, () => {
  console.log(`[VoiceWS] WebSocket server running on ws://localhost:${PORT}/api/ws`);
});
