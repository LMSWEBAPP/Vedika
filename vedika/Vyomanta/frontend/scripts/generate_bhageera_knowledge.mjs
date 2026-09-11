import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';

const homeDir = path.resolve('public/audio/home');
fs.mkdirSync(homeDir, { recursive: true });

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

function trimPcmSilence(pcmBuffer, threshold = 400) {
  const samples = new Int16Array(pcmBuffer.buffer, pcmBuffer.byteOffset, pcmBuffer.length / 2);
  let start = 0;
  while (start < samples.length && Math.abs(samples[start]) < threshold) start++;
  let end = samples.length - 1;
  while (end > start && Math.abs(samples[end]) < threshold) end--;
  start = Math.max(0, start - 2400);
  end = Math.min(samples.length - 1, end + 2400);
  return Buffer.from(samples.subarray(start, end + 1).buffer);
}

async function run() {
  const ai = new GoogleGenAI({ apiKey: apiKeys[0] });
  const prompt = 'You are a cheerful, clever, friendly 10-year-old boy named Bhageera. Speak warmly with playful excitement, bright curiosity, and an inviting tone directly to the user: "Let\'s step into the knowledge world!"';

  console.log('🎙️ Generating Bhageera dialogue with Gemini Fenrir voice...');
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

  const part = res.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data);
  if (part) {
    const raw = Buffer.from(part.inlineData.data, 'base64');
    const trimmed = trimPcmSilence(raw);
    const wav = pcmToWav(trimmed, 24000, 1, 16);
    const wavPath = path.join(homeDir, 'bhageera_knowledge_world.wav');
    const mp3Path = path.join(homeDir, 'bhageera_knowledge_world.mp3');
    fs.writeFileSync(wavPath, wav);
    fs.writeFileSync(mp3Path, wav);
    console.log('✅ Successfully saved Bhageera dialogue using Fenrir voice:', wavPath, `(${(wav.length / 1024).toFixed(1)} KB)`);
  } else {
    console.error('❌ No audio part found in response:', res);
  }
}

run().catch(console.error);
