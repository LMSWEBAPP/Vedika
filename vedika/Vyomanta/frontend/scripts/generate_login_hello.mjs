import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';

const audioDir = path.resolve('public/audio/login');
fs.mkdirSync(audioDir, { recursive: true });

const envPath = path.resolve('.env');
let apiKey = process.env.GEMINI_API_KEY;

if (!apiKey && fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('GEMINI_API_KEY=') || trimmed.startsWith('GEMINI_API_KEY_1=')) {
      const idx = trimmed.indexOf('=');
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (val) {
        apiKey = val;
        break;
      }
    }
  }
}

if (!apiKey) {
  console.error('No Gemini API key found');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

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

const CHARACTERS = [
  {
    name: 'mowgli',
    filename: 'mowgli_hello.wav',
    voice: 'Puck',
    prompt: 'You are Mowgli, an energetic, cheerful 9-year-old boy. Say with bright, friendly excitement: "Hello!"',
  },
  {
    name: 'belle',
    filename: 'belle_hello.wav',
    voice: 'Aoede',
    prompt: 'You are Belle, a sweet, bright, cheerful 8-year-old girl. Say with a warm, melodic smile: "Hello!"',
  },
  {
    name: 'moana',
    filename: 'moana_hello.wav',
    voice: 'Kore',
    prompt: 'You are Moana, a gentle, friendly, sweet 9-year-old girl. Say in a warm, pleasant voice: "Hello!"',
  },
  {
    name: 'bhageera',
    filename: 'bhageera_hello.wav',
    voice: 'Fenrir',
    prompt: 'You are Bhageera, a cheerful, clever, friendly 10-year-old boy. Say warmly and playfully: "Hello!"',
  },
];

async function generate() {
  for (const char of CHARACTERS) {
    console.log(`Generating ${char.name}...`);
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-tts-preview',
        contents: char.prompt,
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: char.voice,
              },
            },
          },
        },
      });

      const parts = response.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData?.data) {
          const rawPcm = Buffer.from(part.inlineData.data, 'base64');
          const trimmedPcm = trimPcmSilence(rawPcm);
          const wavBuffer = pcmToWav(trimmedPcm, 24000);
          const outPath = path.join(audioDir, char.filename);
          fs.writeFileSync(outPath, wavBuffer);
          console.log(`✅ Saved ${outPath} (${wavBuffer.length} bytes)`);
          break;
        }
      }
    } catch (e) {
      console.error(`Error generating ${char.name}:`, e.message);
    }
  }
}

generate();
