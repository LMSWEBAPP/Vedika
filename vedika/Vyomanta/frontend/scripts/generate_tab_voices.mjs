import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';

const audioDir = path.resolve('public/audio/tabs');
fs.mkdirSync(audioDir, { recursive: true });

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

function trimPcmSilence(pcmBuffer, threshold = 500) {
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

const TAB_CHARACTERS = [
  {
    id: 'mowgli',
    name: 'Mowgli (Ask Vedika)',
    filename: 'mowgli_tab.wav',
    voice: 'Puck',
    prompt: 'You are Mowgli, an energetic, cheerful 9-year-old boy. Say with bright, friendly curiosity: "Hey! Did you want to ask something to Vedika?"',
  },
  {
    id: 'belle',
    name: 'Belle (Personal Notes)',
    filename: 'belle_tab.wav',
    voice: 'Aoede',
    prompt: 'You are Belle, a sweet, warm 8-year-old girl. Say with a gentle, melodic smile: "Hello! Do you want to add a note?"',
  },
  {
    id: 'moana',
    name: 'Moana (Lesson Q&A)',
    filename: 'moana_tab.wav',
    voice: 'Kore',
    prompt: 'You are Moana, a gentle, friendly, sweet 9-year-old girl. Say in a warm, enthusiastic voice: "Hii! Wanna have a Q and A session?"',
  },
  {
    id: 'bhageera',
    name: 'Bhageera (Practice Quiz)',
    filename: 'bhageera_tab.wav',
    voice: 'Fenrir',
    prompt: 'You are Bhageera, a cheerful, clever, friendly 10-year-old boy. Say warmly and playfully: "Hey! Are you ready for a quiz?"',
  },
];

async function main() {
  console.log('🚀 Generating Tab Voice Lines in public/audio/tabs/...\n');

  for (const char of TAB_CHARACTERS) {
    const outPath = path.join(audioDir, char.filename);

    for (let attempt = 0; attempt < 5; attempt++) {
      const ai = getAI();
      try {
        console.log(`🎙️ Generating ${char.name} (${char.voice})...`);
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
          console.log(`  💾 Saved: public/audio/tabs/${char.filename} (${(wav.length / 1024).toFixed(1)} KB)`);
          break;
        }
      } catch (e) {
        console.warn(`  ⚠️ Attempt failed (${e.message}). Retrying...`);
        await new Promise(r => setTimeout(r, 1000));
      }
    }
    await new Promise(r => setTimeout(r, 800));
  }

  console.log('\n🎉 ALL TAB COMPANION VOICES GENERATED SUCCESSFULLY!');
}

main().catch(console.error);
