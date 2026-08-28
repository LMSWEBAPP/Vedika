import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';

// Load all API keys from .env
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

console.log(`🔑 Loaded ${apiKeys.length} Gemini API keys for rotation.`);

let currentKeyIndex = 0;
function getNextAIClient() {
  const key = apiKeys[currentKeyIndex % apiKeys.length];
  currentKeyIndex++;
  return new GoogleGenAI({ apiKey: key });
}

// Convert 16-bit PCM Buffer to WAV
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

// Helper to extract PCM from existing WAV file
function wavToPcm(wavBuffer) {
  if (wavBuffer.toString('utf8', 0, 4) === 'RIFF') {
    return wavBuffer.subarray(44);
  }
  return wavBuffer;
}

// Mix multiple 16-bit PCM buffers into a master harmonized choir
function mixPcmBuffers(buffers, weights = [0.28, 0.28, 0.28, 0.28]) {
  const maxLen = Math.max(...buffers.map(b => b.length));
  const mixed = Buffer.alloc(maxLen);

  const numSamples = maxLen / 2;
  for (let i = 0; i < numSamples; i++) {
    let sampleSum = 0;
    buffers.forEach((buf, idx) => {
      const offset = i * 2;
      if (offset + 1 < buf.length) {
        const sample = buf.readInt16LE(offset);
        sampleSum += sample * (weights[idx] || 0.25);
      }
    });

    const clamped = Math.max(-32768, Math.min(32767, Math.round(sampleSum)));
    mixed.writeInt16LE(clamped, i * 2);
  }

  return mixed;
}

const CHARACTERS = [
  {
    id: 'mowgli',
    name: 'Mowgli',
    gender: 'Boy (Physics Lab)',
    voice: 'Puck',
    prompt: 'You are Mowgli, an energetic young boy science explorer. Say enthusiastically in a bright kid boy voice: "Hi Aarav, welcome to science simulation lab!" Only say this exact sentence cheerfully.',
    genericPrompt: 'You are Mowgli, an energetic young boy science explorer. Say enthusiastically in a bright kid boy voice: "Hi friend, welcome to science simulation lab!" Only say this exact sentence cheerfully.',
  },
  {
    id: 'belle',
    name: 'Belle',
    gender: 'Girl (Chemistry Lab)',
    voice: 'Aoede',
    prompt: 'You are Belle, a joyful, bright young girl chemistry explorer. Say cheerfully in a melodic kid girl voice: "Hi Aarav, welcome to science simulation lab!" Only say this exact sentence cheerfully.',
    genericPrompt: 'You are Belle, a joyful, bright young girl chemistry explorer. Say cheerfully in a melodic kid girl voice: "Hi friend, welcome to science simulation lab!" Only say this exact sentence cheerfully.',
  },
  {
    id: 'moana',
    name: 'Moana',
    gender: 'Girl (Biology Lab)',
    voice: 'Kore',
    prompt: 'You are Moana, an adventurous, warm-hearted young girl biology explorer. Say in a warm, lively kid girl voice: "Hi Aarav, welcome to science simulation lab!" Only say this exact sentence cheerfully.',
    genericPrompt: 'You are Moana, an adventurous, warm-hearted young girl biology explorer. Say in a warm, lively kid girl voice: "Hi friend, welcome to science simulation lab!" Only say this exact sentence cheerfully.',
  },
  {
    id: 'bagheera',
    name: 'Bagheera',
    gender: 'Boy (Math Lab)',
    voice: 'Fenrir',
    prompt: 'You are Bagheera, a clever, articulate young boy math explorer. Say with confident kid boy excitement: "Hi Aarav, welcome to science simulation lab!" Only say this exact sentence cheerfully.',
    genericPrompt: 'You are Bagheera, a clever, articulate young boy math explorer. Say with confident kid boy excitement: "Hi friend, welcome to science simulation lab!" Only say this exact sentence cheerfully.',
  },
];

async function generateWithRetry(char, textPrompt, outFilename) {
  if (fs.existsSync(outFilename) && fs.statSync(outFilename).size > 10000) {
    console.log(`  ⚡ Existing file found for ${char.name}: ${outFilename}`);
    const data = fs.readFileSync(outFilename);
    return { pcmBuffer: wavToPcm(data), wavBuffer: data };
  }

  for (let attempt = 0; attempt < apiKeys.length * 2; attempt++) {
    const ai = getNextAIClient();
    try {
      console.log(`🎙️ Generating voice for ${char.name} (${char.voice})...`);
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-tts-preview',
        contents: textPrompt,
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
      const audioPart = parts.find(p => p.inlineData && p.inlineData.mimeType?.startsWith('audio/'));

      if (audioPart && audioPart.inlineData?.data) {
        const rawBuffer = Buffer.from(audioPart.inlineData.data, 'base64');
        const finalWavBuffer = pcmToWav(rawBuffer, 24000, 1, 16);
        fs.writeFileSync(outFilename, finalWavBuffer);
        console.log(`  💾 Saved: ${outFilename} (${(finalWavBuffer.length / 1024).toFixed(1)} KB)`);
        return { pcmBuffer: rawBuffer, wavBuffer: finalWavBuffer };
      }
    } catch (err) {
      console.warn(`  ⚠️ Attempt with key failed (${err.message}). Retrying with next rotated key...`);
      await new Promise(r => setTimeout(r, 1200));
    }
  }

  throw new Error(`Failed to generate voice for ${char.name} after all retries.`);
}

async function main() {
  const outDir = path.resolve('public/audio');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  console.log('🚀 Starting Robust Multi-Key Gemini Voice Generation...\n');

  // 1. Aarav Set
  console.log('--- Phase 1: "Aarav" Greetings ---');
  const aaravPcms = [];
  for (const char of CHARACTERS) {
    const outFile = path.join(outDir, `${char.id}_aarav.wav`);
    const res = await generateWithRetry(char, char.prompt, outFile);
    aaravPcms.push(res.pcmBuffer);
    await new Promise(r => setTimeout(r, 600));
  }

  console.log('\n🎛️ Blending 4-voice master choir for Aarav...');
  const mixedAaravPcm = mixPcmBuffers(aaravPcms, [0.28, 0.28, 0.28, 0.28]);
  const choirAaravWav = pcmToWav(mixedAaravPcm, 24000, 1, 16);
  const choirAaravPath = path.join(outDir, 'avatars_chorus_aarav.wav');
  fs.writeFileSync(choirAaravPath, choirAaravWav);
  console.log(`  💾 Saved Master Choir: ${choirAaravPath}`);

  // 2. Generic Set
  console.log('\n--- Phase 2: Generic "Friend" Greetings ---');
  const genericPcms = [];
  for (const char of CHARACTERS) {
    const outFile = path.join(outDir, `${char.id}_generic.wav`);
    const res = await generateWithRetry(char, char.genericPrompt, outFile);
    genericPcms.push(res.pcmBuffer);
    await new Promise(r => setTimeout(r, 600));
  }

  console.log('\n🎛️ Blending 4-voice master choir for Generic...');
  const mixedGenericPcm = mixPcmBuffers(genericPcms, [0.28, 0.28, 0.28, 0.28]);
  const choirGenericWav = pcmToWav(mixedGenericPcm, 24000, 1, 16);
  const choirGenericPath = path.join(outDir, 'avatars_chorus_generic.wav');
  fs.writeFileSync(choirGenericPath, choirGenericWav);
  console.log(`  💾 Saved Master Generic Choir: ${choirGenericPath}`);

  console.log('\n🎉 ALL 4 CHARACTER VOICES & MASTER CHOIR BLENDS COMPLETED SUCCESSFULLY!');
}

main().catch(console.error);
