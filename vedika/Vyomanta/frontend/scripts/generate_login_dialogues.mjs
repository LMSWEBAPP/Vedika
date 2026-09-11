import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';

const audioDir = path.resolve('public/audio/login');
fs.mkdirSync(audioDir, { recursive: true });

const envPath = path.resolve('.env');
const apiKeys = [];
if (process.env.GEMINI_API_KEY) apiKeys.push(process.env.GEMINI_API_KEY);
for (let i = 1; i <= 4; i++) {
  if (process.env[`GEMINI_API_KEY_${i}`]) apiKeys.push(process.env[`GEMINI_API_KEY_${i}`]);
}

if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('GEMINI_API_KEY') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (val && !apiKeys.includes(val)) {
        apiKeys.push(val);
      }
    }
  }
}

let keyIdx = 1;
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

const DIALOGUES = [
  // Correct credentials: "Yayyy! You are in!"
  {
    name: 'mowgli_correct',
    voice: 'Puck',
    prompt: 'You are Mowgli, an energetic young boy. Shout with pure ecstatic joy and excitement: "Yayyy! You are in!"',
  },
  {
    name: 'belle_correct',
    voice: 'Aoede',
    prompt: 'You are Belle, a cheerful sweet girl. Say with cheerful, joyful excitement: "Yayyy! You are in!"',
  },
  {
    name: 'moana_correct',
    voice: 'Kore',
    prompt: 'You are Moana, a friendly warm girl. Say with a delighted celebratory cheer: "Yayyy! You are in!"',
  },
  {
    name: 'bhageera_correct',
    voice: 'Fenrir',
    prompt: 'You are Bhageera, a clever playful boy. Say with huge enthusiasm and excitement: "Yayyy! You are in!"',
  },

  // Wrong credentials: "Oops! Wrong one!"
  {
    name: 'mowgli_wrong',
    voice: 'Puck',
    prompt: 'You are Mowgli, a cheeky energetic boy. Say with a sarcastic, teasing smirk: "Oops! Wrong one!"',
  },
  {
    name: 'belle_wrong',
    voice: 'Aoede',
    prompt: 'You are Belle, a sweet sassy girl. Say with playful sarcasm: "Oops! Wrong one!"',
  },
  {
    name: 'moana_wrong',
    voice: 'Kore',
    prompt: 'You are Moana, a clever girl. Say with a dry sarcastic giggle: "Oops! Wrong one!"',
  },
  {
    name: 'bhageera_wrong',
    voice: 'Fenrir',
    prompt: 'You are Bhageera, a witty boy. Say with an amused sarcastic tone: "Oops! Wrong one!"',
  },
];

async function generate() {
  for (const item of DIALOGUES) {
    const filename = `${item.name}.wav`;
    const outPath = path.join(audioDir, filename);
    if (fs.existsSync(outPath)) {
      console.log(`Skipping ${item.name}, already exists`);
      continue;
    }
    console.log(`Generating ${item.name}...`);
    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-tts-preview',
        contents: item.prompt,
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: item.voice,
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
          fs.writeFileSync(outPath, wavBuffer);
          console.log(`✅ Saved ${outPath} (${wavBuffer.length} bytes)`);
          break;
        }
      }
    } catch (e) {
      console.error(`Error generating ${item.name}:`, e.message);
    }
  }
  console.log('🎉 Done generating dialogues!');
}

generate();
