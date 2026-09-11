import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const outDir = path.resolve('public/audio/home/tour');
fs.mkdirSync(outDir, { recursive: true });

// Load API keys from .env
const envPath = path.resolve('.env');
const apiKeys = [];
if (process.env.GEMINI_API_KEY) apiKeys.push(process.env.GEMINI_API_KEY);
for (let i = 1; i <= 5; i++) {
  if (process.env[`GEMINI_API_KEY_${i}`]) apiKeys.push(process.env[`GEMINI_API_KEY_${i}`]);
}

if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (key.startsWith('GEMINI_API_KEY') && val && !apiKeys.includes(val)) {
        apiKeys.push(val);
      }
    }
  });
}

function pcmToWav(pcmBuffer, sampleRate = 24000, numChannels = 1, bitsPerSample = 16) {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmBuffer.length;
  const chunkSize = 36 + dataSize;
  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(chunkSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
}

function trimPcmSilence(pcmBuffer, threshold = 450) {
  let start = 0;
  const totalSamples = Math.floor(pcmBuffer.length / 2);
  let end = pcmBuffer.length;
  for (let i = 0; i < totalSamples; i++) {
    if (Math.abs(pcmBuffer.readInt16LE(i * 2)) > threshold) {
      start = Math.max(0, (i - 120) * 2);
      break;
    }
  }
  for (let i = totalSamples - 1; i >= 0; i--) {
    if (Math.abs(pcmBuffer.readInt16LE(i * 2)) > threshold) {
      end = Math.min(pcmBuffer.length, (i + 120) * 2);
      break;
    }
  }
  return pcmBuffer.subarray(start, end);
}

const TOUR_LINES = [
  {
    id: 'tour_courses',
    rawText: "Let’s take the user on a little tour of the courses page! ✨",
    promptText: "Let's take the user on a little tour of the courses page!",
  },
  {
    id: 'tour_vedika_ai',
    rawText: "Come along! Let’s show the user around the vedika AI page. 🌟",
    promptText: "Come along! Let's show the user around the Vedika AI page.",
  },
  {
    id: 'tour_quizzes',
    rawText: "Alright, tour guides let’s show the user what’s waiting on theQuizzes page! 🚀",
    promptText: "Alright, tour guides! Let's show the user what's waiting on the Quizzes page!",
  },
  {
    id: 'tour_vedika_labs',
    rawText: "Ready for a little adventure? Let’s explore the  vedika labs page together! 🪐",
    promptText: "Ready for a little adventure? Let's explore the Vedika labs page together!",
  },
  {
    id: 'tour_assignments',
    rawText: "Let’s give the user a quick peek around the assignment page! 👀✨",
    promptText: "Let's give the user a quick peek around the assignment page!",
  },
  {
    id: 'tour_progress',
    rawText: "Everyone on board! The progress page tour is about to begin. 🎒🚀",
    promptText: "Everyone on board! The progress page tour is about to begin.",
  },
  {
    id: 'tour_jobs',
    rawText: "Lets have a look! what do we have in Jobs page?",
    promptText: "Let's have a look! What do we have in the Jobs page?",
  },
];

async function generateWithGemini(item) {
  const prompt = `You are a cheerful, clever, friendly young boy mascot named Bhageera. Speak warmly with playful excitement, bright curiosity, and an inviting tour guide tone directly to the user: "${item.promptText}"`;
  console.log(`🎙️ [Gemini TTS] Generating ${item.id}...`);

  for (let k = 0; k < apiKeys.length; k++) {
    try {
      const ai = new GoogleGenAI({ apiKey: apiKeys[k] });
      const res = await ai.models.generateContent({
        model: 'gemini-3.1-flash-tts-preview',
        contents: prompt,
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Fenrir' },
            },
          },
        },
      });

      const part = res.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
      if (part) {
        const raw = Buffer.from(part.inlineData.data, 'base64');
        const trimmed = trimPcmSilence(raw);
        const wav = pcmToWav(trimmed, 24000, 1, 16);
        const wavPath = path.join(outDir, `${item.id}.wav`);
        const mp3Path = path.join(outDir, `${item.id}.mp3`);
        fs.writeFileSync(wavPath, wav);
        fs.writeFileSync(mp3Path, wav);
        console.log(`✅ [Gemini] Saved ${item.id}.wav & .mp3 (${(wav.length / 1024).toFixed(1)} KB)`);
        return true;
      }
    } catch (e) {
      console.warn(`  Key ${k} failed: ${e.message}`);
    }
  }
  return false;
}

function generateWithEdgeTTS(item) {
  console.log(`🎙️ [Edge TTS Fallback] Generating ${item.id}...`);
  const mp3Path = path.join(outDir, `${item.id}.mp3`);
  const wavPath = path.join(outDir, `${item.id}.wav`);
  // Edge-tts command
  const cleanText = item.promptText.replace(/"/g, '\\"');
  const pyCmd = `python -c "import asyncio, edge_tts; asyncio.run(edge_tts.Communicate('''${cleanText}''', 'en-US-BrianMultilingualNeural', rate='+3%', pitch='+12Hz').save('''${mp3Path.replace(/\\/g, '/')}'''))"`;
  try {
    execSync(pyCmd, { stdio: 'inherit' });
    fs.copyFileSync(mp3Path, wavPath);
    console.log(`✅ [Edge TTS] Saved ${item.id}.mp3 & .wav`);
    return true;
  } catch (err) {
    console.error(`❌ [Edge TTS] Failed:`, err);
    return false;
  }
}

async function main() {
  for (const item of TOUR_LINES) {
    let ok = await generateWithGemini(item);
    if (!ok) {
      ok = generateWithEdgeTTS(item);
    }
    if (!ok) {
      console.error(`❌ Completely failed for ${item.id}`);
    }
  }
  console.log('\n🎉 ALL 7 TOUR AUDIO FILES READY!');
}

main().catch(console.error);
