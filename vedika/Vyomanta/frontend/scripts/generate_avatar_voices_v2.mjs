import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';

// ── 1. Setup Directories & Move V1 ──
const audioDir = path.resolve('public/audio');
const v1Dir = path.join(audioDir, 'version_1');
const v2Dir = path.join(audioDir, 'version_2');

fs.mkdirSync(v1Dir, { recursive: true });
fs.mkdirSync(v2Dir, { recursive: true });

// Move any existing root wav files to version_1
fs.readdirSync(audioDir).forEach((file) => {
  const fullPath = path.join(audioDir, file);
  if (file.endsWith('.wav') && fs.statSync(fullPath).isFile()) {
    const dest = path.join(v1Dir, file);
    fs.renameSync(fullPath, dest);
    console.log(`📦 Moved to version_1: ${file}`);
  }
});

// ── 2. Load API Keys ──
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

// Convert 16-bit PCM Buffer to standard WAV
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

// Trim leading silence from 16-bit PCM buffer so all voices start speaking at the exact same instant
function trimPcmSilence(pcmBuffer, threshold = 600) {
  let startSample = 0;
  const totalSamples = pcmBuffer.length / 2;

  for (let i = 0; i < totalSamples; i++) {
    const val = Math.abs(pcmBuffer.readInt16LE(i * 2));
    if (val > threshold) {
      startSample = Math.max(0, i - 120); // Keep tiny 5ms pre-attack cushion
      break;
    }
  }

  return pcmBuffer.subarray(startSample * 2);
}

// Mix multiple 16-bit PCM buffers into a master harmonized choir
function mixPcmBuffers(buffers, weights = [0.28, 0.28, 0.28, 0.28]) {
  const alignedBuffers = buffers.map(b => trimPcmSilence(b));
  const maxLen = Math.max(...alignedBuffers.map(b => b.length));
  const mixed = Buffer.alloc(maxLen);

  const numSamples = maxLen / 2;
  for (let i = 0; i < numSamples; i++) {
    let sampleSum = 0;
    alignedBuffers.forEach((buf, idx) => {
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

/**
 * 4 Avatar Character Voice Matrix (Version 2 - Distinct Natural Kid Pitches & Synchronized Pace):
 *  1. Mowgli   — Boy  (Physics Lab)   -> Puck (Youthful, bright kid boy pitch)
 *  2. Belle    — Girl (Chemistry Lab) -> Aoede (Sweet, melodic kid girl pitch)
 *  3. Moana    — Girl (Biology Lab)   -> Kore (Warm, friendly kid girl pitch)
 *  4. Bagheera — Boy  (Math Lab)      -> Fenrir (Clever, resonant kid boy pitch)
 */
const CHARACTERS = [
  {
    id: 'mowgli',
    name: 'Mowgli',
    gender: 'Boy (Physics)',
    voice: 'Puck',
    prompt: 'You are Mowgli, a curious young boy. Speak in a natural, pleasant kid boy voice at a steady, moderate pace. Say clearly: "Hi friend, welcome to science simulation lab!" Do not rush, do not exaggerate, speak with warm and friendly clarity.',
  },
  {
    id: 'belle',
    name: 'Belle',
    gender: 'Girl (Chemistry)',
    voice: 'Aoede',
    prompt: 'You are Belle, a cheerful young girl. Speak in a sweet, bright kid girl voice at the same steady, moderate pace. Say clearly: "Hi friend, welcome to science simulation lab!" Do not rush, do not exaggerate, speak with warm and friendly clarity.',
  },
  {
    id: 'moana',
    name: 'Moana',
    gender: 'Girl (Biology)',
    voice: 'Kore',
    prompt: 'You are Moana, a friendly young girl. Speak in a warm, lively kid girl voice at the same steady, moderate pace. Say clearly: "Hi friend, welcome to science simulation lab!" Do not rush, do not exaggerate, speak with warm and friendly clarity.',
  },
  {
    id: 'bagheera',
    name: 'Bagheera',
    gender: 'Boy (Math)',
    voice: 'Fenrir',
    prompt: 'You are Bagheera, a clever young boy. Speak in an articulate, confident kid boy voice at the same steady, moderate pace. Say clearly: "Hi friend, welcome to science simulation lab!" Do not rush, do not exaggerate, speak with warm and friendly clarity.',
  },
];

async function generateWithRetry(char, textPrompt, outFilename) {
  for (let attempt = 0; attempt < apiKeys.length * 2; attempt++) {
    const ai = getNextAIClient();
    try {
      console.log(`🎙️ Generating Version 2 voice for ${char.name} (${char.voice})...`);
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
        const trimmed = trimPcmSilence(rawBuffer);
        const finalWavBuffer = pcmToWav(trimmed, 24000, 1, 16);
        fs.writeFileSync(outFilename, finalWavBuffer);
        console.log(`  💾 Saved V2: ${outFilename} (${(finalWavBuffer.length / 1024).toFixed(1)} KB)`);
        return { pcmBuffer: trimmed, wavBuffer: finalWavBuffer };
      }
    } catch (err) {
      console.warn(`  ⚠️ Attempt with key failed (${err.message}). Retrying with next key...`);
      await new Promise(r => setTimeout(r, 1200));
    }
  }

  throw new Error(`Failed to generate voice for ${char.name} after all retries.`);
}

async function main() {
  console.log('🚀 Starting Version 2 Gemini Kid Voice Generation (Generic "Friend" Phrasing)...\n');

  const v2Pcms = [];

  for (const char of CHARACTERS) {
    const v2OutFile = path.join(v2Dir, `${char.id}.wav`);
    const res = await generateWithRetry(char, char.prompt, v2OutFile);
    v2Pcms.push(res.pcmBuffer);

    // Also copy to root public/audio/ as primary active track
    const rootOutFile = path.join(audioDir, `${char.id}.wav`);
    fs.writeFileSync(rootOutFile, res.wavBuffer);

    await new Promise(r => setTimeout(r, 800));
  }

  console.log('\n🎛️ Blending Version 2 Master 4-Kid Choir...');
  const mixedV2Pcm = mixPcmBuffers(v2Pcms, [0.28, 0.28, 0.28, 0.28]);
  const choirV2Wav = pcmToWav(mixedV2Pcm, 24000, 1, 16);

  const choirV2Path = path.join(v2Dir, 'avatars_chorus.wav');
  fs.writeFileSync(choirV2Path, choirV2Wav);
  console.log(`  💾 Saved V2 Master Choir: ${choirV2Path}`);

  const choirRootPath = path.join(audioDir, 'avatars_chorus.wav');
  fs.writeFileSync(choirRootPath, choirV2Wav);
  console.log(`  💾 Saved Root Master Choir: ${choirRootPath}`);

  console.log('\n🎉 VERSION 2 VOICES GENERATED & MASTER CHOIR BLENDED SUCCESSFULLY!');
}

main().catch(console.error);
