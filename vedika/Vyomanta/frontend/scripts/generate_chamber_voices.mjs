import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';

const audioDir = path.resolve('public/audio');
const chamberDir = path.join(audioDir, 'chamber');
fs.mkdirSync(chamberDir, { recursive: true });

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

if (apiKeys.length === 0) {
  console.error('❌ ERROR: No GEMINI_API_KEY found in process.env or .env file.');
  process.exit(1);
}

console.log(`🔑 Loaded ${apiKeys.length} Gemini API keys.`);

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

function trimPcmSilence(pcmBuffer, threshold = 500) {
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

const CHAMBER_VOICES = [
  {
    index: 0,
    character: 'mowgli',
    filename: 'mowgli_chosen.wav',
    voice: 'Puck',
    prompt: 'You are Mowgli, an energetic, cheerful young boy companion. Say with playful kiddish surprise and joyful excitement: "Oh!! you chose me!"',
  },
  {
    index: 1,
    character: 'belle',
    filename: 'belle_chosen.wav',
    voice: 'Aoede',
    prompt: 'You are Belle, a sweet, bright, cheerful young girl companion. Say with a warm, melodic smile and playful confidence: "That\'s a good choice buddy!"',
  },
  {
    index: 2,
    character: 'moana',
    filename: 'moana_chosen.wav',
    voice: 'Kore',
    prompt: 'You are Moana, a gentle, friendly young girl companion. Say in a warm, pleasant, cheerful voice with a delighted smile: "I always knew you would like to work with me!"',
  },
  {
    index: 3,
    character: 'bhageera',
    filename: 'bhageera_chosen.wav',
    voice: 'Fenrir',
    prompt: 'You are Bhageera, an enthusiastic, clever young boy companion. Say with cheerful excitement and high energy: "Yayyyy!! It\'s me .. let\'s start working together!"',
  },
];

async function main() {
  console.log('🎙️ Generating Avatar Chamber dialogues with Gemini TTS...\n');

  for (const item of CHAMBER_VOICES) {
    const outPath = path.join(chamberDir, item.filename);
    console.log(`Generating [${item.character}] (Index ${item.index}) using voice ${item.voice}...`);

    let success = false;
    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        const ai = getAI();
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

        const part = res.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
        if (part) {
          const raw = Buffer.from(part.inlineData.data, 'base64');
          const trimmed = trimPcmSilence(raw);
          const wav = pcmToWav(trimmed, 24000, 1, 16);
          fs.writeFileSync(outPath, wav);
          console.log(`  ✅ Saved: public/audio/chamber/${item.filename} (${(wav.length / 1024).toFixed(1)} KB)`);
          success = true;
          break;
        } else {
          console.warn(`  ⚠️ No audio part found on attempt ${attempt}`);
        }
      } catch (err) {
        console.warn(`  ⚠️ Attempt ${attempt} failed: ${err.message}`);
        await new Promise((r) => setTimeout(r, 1500));
      }
    }

    if (!success) {
      console.error(`❌ Failed to generate audio for ${item.character}`);
    }
  }

  console.log('\n✨ Audio generation complete!');
}

main().catch(console.error);
