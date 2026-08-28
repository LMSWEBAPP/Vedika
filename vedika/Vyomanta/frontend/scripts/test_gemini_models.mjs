import { GoogleGenAI } from '@google/genai';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8');
const keyMatch = env.match(/GEMINI_API_KEY=["']?([^"'\r\n]+)/);
const apiKey = keyMatch ? keyMatch[1] : null;

const ai = new GoogleGenAI({ apiKey });

async function checkModel(modelName) {
  try {
    console.log(`Testing model: ${modelName}...`);
    const res = await ai.models.generateContent({
      model: modelName,
      contents: 'Say cheerfully: "Hi Aarav, welcome to science simulation lab!"',
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: 'Puck',
            },
          },
        },
      },
    });

    const parts = res.candidates?.[0]?.content?.parts || [];
    const audio = parts.find(p => p.inlineData && p.inlineData.mimeType?.startsWith('audio/'));
    if (audio) {
      console.log(`✅ SUCCESS with ${modelName}! Audio length: ${audio.inlineData.data.length} chars, MIME: ${audio.inlineData.mimeType}`);
      return true;
    } else {
      console.log(`⚠️ ${modelName} returned no audio part. Parts:`, parts);
    }
  } catch (err) {
    console.log(`❌ ${modelName} failed:`, err.message);
  }
  return false;
}

async function run() {
  const modelsToTest = [
    'gemini-2.5-flash',
    'gemini-2.5-flash-native-audio-preview-12-2025',
    'gemini-2.0-flash-exp',
    'gemini-3.1-flash-tts-preview',
    'gemini-3.6-flash',
  ];

  for (const m of modelsToTest) {
    const ok = await checkModel(m);
    if (ok) break;
  }
}

run();
