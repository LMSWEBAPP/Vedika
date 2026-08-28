import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';

const audioDir = path.resolve('public/audio');
const v3Dir = path.join(audioDir, 'version_3');
fs.mkdirSync(v3Dir, { recursive: true });

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

function mixPcmBuffers(buffers) {
  const aligned = buffers.map(b => trimPcmSilence(b));
  const maxLen = Math.max(...aligned.map(b => b.length));
  const mixed = Buffer.alloc(maxLen);
  const numSamples = maxLen / 2;

  for (let i = 0; i < numSamples; i++) {
    let sum = 0;
    aligned.forEach((buf) => {
      const offset = i * 2;
      if (offset + 1 < buf.length) {
        sum += buf.readInt16LE(offset) * 0.28;
      }
    });
    const clamped = Math.max(-32768, Math.min(32767, Math.round(sum)));
    mixed.writeInt16LE(clamped, i * 2);
  }
  return mixed;
}

/**
 * 🎬 3 Cinematic Character Flavor Sets
 */
const FLAVORS = [
  {
    flavorId: 'pixar_animated',
    flavorTitle: 'Disney/Pixar Animated Movie Style (Lively, Charming & Expressive)',
    characters: [
      {
        id: 'mowgli',
        voice: 'Puck',
        prompt: 'You are a professional Disney/Pixar voice actor performing as Mowgli, a cheerful 9-year-old boy. Deliver with natural human warmth, a subtle friendly chuckle, and lively cadence: "Hi friend! Welcome to the science simulation lab!"',
      },
      {
        id: 'belle',
        voice: 'Aoede',
        prompt: 'You are a professional Disney/Pixar voice actor performing as Belle, a bright, sweet 8-year-old girl. Deliver with a joyful smile in your voice and charming, musical clarity: "Hi friend! Welcome to the science simulation lab!"',
      },
      {
        id: 'moana',
        voice: 'Kore',
        prompt: 'You are a professional Disney/Pixar voice actor performing as Moana, an adventurous, warm-hearted 9-year-old girl. Deliver with genuine friendly enthusiasm and sunny warmth: "Hi friend! Welcome to the science simulation lab!"',
      },
      {
        id: 'bagheera',
        voice: 'Fenrir',
        prompt: 'You are a professional Disney/Pixar voice actor performing as Bagheera, a clever, articulate 10-year-old boy. Deliver with playful confidence and smooth, natural storytelling rhythm: "Hi friend! Welcome to the science simulation lab!"',
      },
    ],
  },
  {
    flavorId: 'ghibli_gentle',
    flavorTitle: 'Studio Ghibli / Storybook Style (Gentle, Sweet, Natural Warmth)',
    characters: [
      {
        id: 'mowgli',
        voice: 'Puck',
        prompt: 'You are a young child actor in a gentle animated film. Speak in a soft, natural, endearing boy voice with a gentle smile: "Hi friend, welcome to science simulation lab."',
      },
      {
        id: 'belle',
        voice: 'Aoede',
        prompt: 'You are a young child actor in a gentle animated film. Speak in a sweet, soft, melodic girl voice with warm natural breath: "Hi friend, welcome to science simulation lab."',
      },
      {
        id: 'moana',
        voice: 'Kore',
        prompt: 'You are a young child actor in a gentle animated film. Speak in a tender, friendly, cheerful girl voice: "Hi friend, welcome to science simulation lab."',
      },
      {
        id: 'bagheera',
        voice: 'Charon',
        prompt: 'You are a young child actor in a gentle animated film. Speak in a gentle, warm, clear young boy voice: "Hi friend, welcome to science simulation lab."',
      },
    ],
  },
];

async function generateFlavor(flavor) {
  console.log(`\n🎬 Generating Flavor: ${flavor.flavorTitle}...`);
  const pcms = [];

  for (const char of flavor.characters) {
    const filename = `${char.id}_${flavor.flavorId}.wav`;
    const outPath = path.join(v3Dir, filename);

    for (let attempt = 0; attempt < 5; attempt++) {
      const ai = getAI();
      try {
        console.log(`  🎙️ Generating ${char.id} (${char.voice})...`);
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
          pcms.push(trimmed);
          console.log(`    💾 Saved: ${filename}`);
          break;
        }
      } catch (e) {
        console.warn(`    ⚠️ Retrying (${e.message})...`);
        await new Promise(r => setTimeout(r, 1000));
      }
    }
    await new Promise(r => setTimeout(r, 700));
  }

  if (pcms.length === 4) {
    const choirPcm = mixPcmBuffers(pcms);
    const choirWav = pcmToWav(choirPcm, 24000, 1, 16);
    const choirPath = path.join(v3Dir, `choir_${flavor.flavorId}.wav`);
    fs.writeFileSync(choirPath, choirWav);
    console.log(`  ✨ Saved Master Choir: choir_${flavor.flavorId}.wav`);
  }
}

async function main() {
  for (const f of FLAVORS) {
    await generateFlavor(f);
  }
  console.log('\n🎉 ALL CINEMATIC VOICE FLAVORS GENERATED IN public/audio/version_3/');
}

main().catch(console.error);
