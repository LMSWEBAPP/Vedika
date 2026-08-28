import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';

const audioDir = path.resolve('public/audio');
const finalDir = path.join(audioDir, 'final');
fs.mkdirSync(finalDir, { recursive: true });

// Load API keys
const envPath = path.resolve('.env');
const apiKeys = [];
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
      if (key.startsWith('GEMINI_API_KEY') && val) {
        apiKeys.push(val);
      }
    }
  });
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
  let startSample = 0;
  const totalSamples = pcmBuffer.length / 2;
  for (let i = 0; i < totalSamples; i++) {
    if (Math.abs(pcmBuffer.readInt16LE(i * 2)) > threshold) {
      startSample = Math.max(0, i - 120);
      break;
    }
  }
  return pcmBuffer.subarray(startSample * 2);
}

/**
 * Character Specific Introduction Lines:
 * 1. Mowgli   — Physics Lab   -> Pixar style (Puck)
 * 2. Belle    — Chemistry Lab -> Ghibli style (Aoede)
 * 3. Moana    — Biology Lab   -> Pixar style (Kore)
 * 4. Bagheera — Math Lab      -> Pixar style (Fenrir)
 */
const FINAL_CHARACTERS = [
  {
    id: 'mowgli',
    name: 'Mowgli',
    style: 'Pixar',
    voice: 'Puck',
    prompt: 'You are a professional Disney/Pixar voice actor performing as Mowgli, a cheerful, enthusiastic 9-year-old boy. Deliver with natural human warmth, a friendly chuckle, and lively cadence: "Hi! This is Mowgli, welcome to my physics lab!"',
  },
  {
    id: 'belle',
    name: 'Belle',
    style: 'Ghibli',
    voice: 'Aoede',
    prompt: 'You are a young child actor in a gentle animated film. Speak in a sweet, soft, melodic girl voice with warm natural breath: "Hi, this is Belle, welcome to my chemistry lab."',
  },
  {
    id: 'moana',
    name: 'Moana',
    style: 'Pixar',
    voice: 'Kore',
    prompt: 'You are a professional Disney/Pixar voice actor performing as Moana, an adventurous, warm-hearted 9-year-old girl. Deliver with genuine friendly enthusiasm and sunny warmth: "Hi! This is Moana, welcome to my biology lab!"',
  },
  {
    id: 'bagheera',
    name: 'Bagheera',
    style: 'Pixar',
    voice: 'Fenrir',
    prompt: 'You are a professional Disney/Pixar voice actor performing as Bagheera, a clever, articulate 10-year-old boy. Deliver with playful confidence and smooth, natural storytelling rhythm: "Hi! This is Bagheera, welcome to my math lab!"',
  },
];

async function main() {
  console.log('🚀 Generating Exact Introduction Voice Lines in public/audio/final/...\n');

  for (const char of FINAL_CHARACTERS) {
    const filename = `${char.id}.wav`;
    const outPath = path.join(finalDir, filename);

    for (let attempt = 0; attempt < 5; attempt++) {
      const ai = getAI();
      try {
        console.log(`🎙️ Generating ${char.name} (${char.style} style with ${char.voice})...`);
        const res = await ai.models.generateContent({
          model: 'gemini-3.1-flash-tts-preview',
          contents: char.prompt,
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: char.voice },
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
          console.log(`  💾 Saved: public/audio/final/${filename} (${(wav.length / 1024).toFixed(1)} KB)`);
          break;
        }
      } catch (e) {
        console.warn(`  ⚠️ Attempt failed (${e.message}). Retrying...`);
        await new Promise(r => setTimeout(r, 1000));
      }
    }
    await new Promise(r => setTimeout(r, 800));
  }

  console.log('\n🎉 ALL INTRODUCTION VOICES GENERATED SUCCESSFULLY IN public/audio/final/!');
}

main().catch(console.error);
