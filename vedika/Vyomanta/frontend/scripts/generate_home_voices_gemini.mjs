import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';

const audioDir = path.resolve('public/audio');
const homeDir = path.join(audioDir, 'home');
fs.mkdirSync(homeDir, { recursive: true });

// Load API keys from .env or process.env
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

if (apiKeys.length === 0) {
  console.error('❌ ERROR: No GEMINI_API_KEY found in process.env or .env file.');
  console.error('Please add GEMINI_API_KEY=your_key in .env to generate exact Gemini Labs voices.');
  process.exit(1);
}

let keyIdx = 0;
function getAI() {
  const key = apiKeys[keyIdx % apiKeys.length];
  keyIdx++;
  return new GoogleGenAI({ apiKey: key });
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

function trimPcmSilence(pcmBuffer, threshold = 600) {
  let start = 0;
  const totalSamples = Math.floor(pcmBuffer.length / 2);
  let end = pcmBuffer.length;
  for (let i = 0; i < totalSamples; i++) {
    if (Math.abs(pcmBuffer.readInt16LE(i * 2)) > threshold) {
      start = Math.max(0, (i - 80) * 2);
      break;
    }
  }
  for (let i = totalSamples - 1; i >= 0; i--) {
    if (Math.abs(pcmBuffer.readInt16LE(i * 2)) > threshold) {
      end = Math.min(pcmBuffer.length, (i + 80) * 2);
      break;
    }
  }
  return pcmBuffer.subarray(start, end);
}

/**
 * 🎬 Exact Vedika Labs Characters & Voices:
 * 1. Mowgli   — Pixar Boy     -> Voice: Puck
 * 2. Belle    — Ghibli Girl   -> Voice: Aoede
 * 3. Moana    — Pixar Girl    -> Voice: Kore
 * 4. Bhageera — Pixar Boy     -> Voice: Fenrir
 */
const HOME_CLIPS = [
  {
    filename: 'mowgli_home.wav',
    altFilename: 'purple_home.mp3',
    char: 'Mowgli',
    voice: 'Puck',
    prompt: 'You are a professional Disney/Pixar voice actor performing as Mowgli, an energetic, cheerful, highly excited 9-year-old boy. Deliver with playful kiddish excitement, bright laughter and energy: "Yaaay! My name is Mowgli! Let\'s wait for my friends!"',
  },
  {
    filename: 'belle_home.wav',
    altFilename: 'red_home.mp3',
    char: 'Belle',
    voice: 'Aoede',
    prompt: 'You are a professional animated movie voice actor performing as Belle, a sweet, bright, cheerful 8-year-old girl. Deliver with genuine bubbly kiddish excitement and a huge smile in your voice: "Hello everyone! My name is Belle!"',
  },
  {
    filename: 'moana_home.wav',
    altFilename: 'olive_home.mp3',
    char: 'Moana',
    voice: 'Kore',
    prompt: 'You are performing as Moana, a sweet, gentle, friendly 9-year-old girl. Speak in a calm, pleasant, cheerful conversational voice with a warm smile, not screaming or overly excited: "And my name is Moana! Another friend is arriving, look!"',
  },
  {
    filename: 'bhageera_journey.wav',
    altFilename: 'blue_journey.mp3',
    char: 'Bhageera (Exhausted Landing)',
    voice: 'Fenrir',
    prompt: 'You are Bhageera. Speak briskly upon landing in exactly 2 seconds, no long trailing pauses: "Phew! That was a long journey!"',
  },
  {
    filename: 'bhageera_howareyou.wav',
    altFilename: 'blue_howareyou.mp3',
    char: 'Bhageera (Perked Up)',
    voice: 'Fenrir',
    prompt: 'You are a cheerful, clever, friendly 10-year-old boy named Bhageera. After a quick hop, perk up brightly with warm, playful kiddish curiosity: "By the way, how are you doing?!"',
  },
];

async function main() {
  console.log('🚀 Generating Home Page Audio with Exact Vedika Labs Gemini Voices (Puck, Aoede, Kore, Fenrir)...\n');

  for (const item of HOME_CLIPS) {
    const outPath = path.join(homeDir, item.filename);

    for (let attempt = 0; attempt < 4; attempt++) {
      const ai = getAI();
      try {
        console.log(`🎙️ Generating ${item.char} (${item.voice})...`);
        const res = await ai.models.generateContent({
          model: 'gemini-3.1-flash-tts-preview',
          contents: item.prompt,
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: item.voice },
              },
            },
          },
        });

        const part = res.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data);
        if (part) {
          const raw = Buffer.from(part.inlineData.data, 'base64');
          const trimmed = trimPcmSilence(raw);
          const wav = pcmToWav(trimmed, 24000, 1, 16);
          fs.writeFileSync(outPath, wav);
          console.log(`  💾 Saved: public/audio/home/${item.filename} (${(wav.length / 1024).toFixed(1)} KB)`);

          // Also save to legacy/alt paths for maximum compatibility
          if (item.altFilename) {
            const altPath = path.join(homeDir, item.altFilename);
            fs.writeFileSync(altPath, wav);
            console.log(`  💾 Also Saved: public/audio/home/${item.altFilename}`);
          }
          break;
        }
      } catch (e) {
        console.warn(`  ⚠️ Attempt failed (${e.message}). Retrying...`);
        await new Promise(r => setTimeout(r, 1200));
      }
    }
  }

  console.log('\n🎉 ALL HOME AVATAR VOICES GENERATED WITH EXACT VEDIKA LABS VOICES!');
}

main().catch(console.error);
