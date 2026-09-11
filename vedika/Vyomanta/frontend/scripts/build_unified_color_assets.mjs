import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

function hexToRgb(hex) {
  hex = hex.replace('#', '');
  return {
    r: parseInt(hex.substring(0, 2), 16),
    g: parseInt(hex.substring(2, 4), 16),
    b: parseInt(hex.substring(4, 6), 16),
  };
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h * 360, s, l];
}

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360;
  h /= 360;
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

const PALETTE = [
  { index: 0, name: 'Neon Green (Ask Vedika / Mowgli)', hex: '#39FF14', avatar: 'avatar_purple.webp', altAvatar: 'avatar_1_purple.webp', crown: 'crown_purple.png', disk: 'disk_0.png', hue: 111 },
  { index: 1, name: 'Neon Pink (Code with Vedika / Belle)', hex: '#FF6EFF', avatar: 'avatar_red.webp', altAvatar: 'avatar_2_lime.webp', crown: 'crown_red.png', disk: 'disk_1.png', hue: 300 },
  { index: 2, name: 'Neon Red (Code Puzzles / Moana)', hex: '#FF3131', avatar: 'avatar_gold.webp', altAvatar: 'avatar_3_red.webp', crown: 'crown_gold.png', disk: 'disk_2.png', hue: 0 },
  { index: 3, name: 'Neon Orange (Viva & Interview / Bhageera)', hex: '#FF5C00', avatar: 'avatar_blue.webp', altAvatar: 'avatar_4_blue.webp', crown: 'crown_blue.png', disk: 'disk_3.png', hue: 22 },
];

async function generateAvatars() {
  console.log('Generating 4 color-matched avatar textures with ground-truth white eyes...');
  const origPink = await sharp('scratch/orig_pink.webp').raw().toBuffer({ resolveWithObject: true });
  const origGreen = await sharp('scratch/orig_green.webp').raw().toBuffer({ resolveWithObject: true });
  const base = await sharp('public/extracted_base_color.webp').raw().toBuffer({ resolveWithObject: true });
  const faceMask = await sharp('scratch/face_mask.png').raw().toBuffer({ resolveWithObject: true });

  for (const item of PALETTE) {
    const targetRgb = hexToRgb(item.hex);
    const outBuf = Buffer.alloc(base.data.length);

    for (let i = 0; i < base.data.length; i += 3) {
      const pr = origPink.data[i], pg = origPink.data[i + 1], pb = origPink.data[i + 2];
      const gr = origGreen.data[i], gg = origGreen.data[i + 1], gb = origGreen.data[i + 2];
      const diff = Math.hypot(pr - gr, pg - gg, pb - gb);

      const pixelIdx = i / 3;
      const x = pixelIdx % 1024;
      const y = Math.floor(pixelIdx / 1024);

      const inEyeRegion = (y >= 100 && y <= 400 && x >= 200 && x <= 850);
      const isMaskEye = inEyeRegion && (faceMask.data[i] > 128);

      const lumP = (0.299 * pr + 0.587 * pg + 0.114 * pb);
      const lumG = (0.299 * gr + 0.587 * gg + 0.114 * gb);
      const isEyeBorder = inEyeRegion && (lumP > 140 && lumG > 140 && pr > 125 && pg > 125 && pb > 125 && gr > 125 && gg > 125 && gb > 125);

      if (isMaskEye || isEyeBorder) {
        // Pure eye area: pupil is deep black, sclera is 100% pure white without reflections
        if (lumP < 60 && lumG < 60) {
          outBuf[i] = 10;
          outBuf[i + 1] = 12;
          outBuf[i + 2] = 18;
        } else {
          // Pure white sclera: #FFFFFF with 0 reflections or tint
          outBuf[i] = 255;
          outBuf[i + 1] = 255;
          outBuf[i + 2] = 255;
        }
      } else if (diff < 16) {
        // Facial contours and mouth
        outBuf[i] = pr;
        outBuf[i + 1] = pg;
        outBuf[i + 2] = pb;
      } else {
        // Fur: vibrant 100% saturated neon color
        const br = base.data[i], bg = base.data[i + 1], bb = base.data[i + 2];
        const lum = (0.299 * br + 0.587 * bg + 0.114 * bb) / 255;
        const normLum = Math.min(1.45, Math.pow(lum / 0.48, 0.82));
        let r = targetRgb.r * normLum;
        let g = targetRgb.g * normLum;
        let b = targetRgb.b * normLum;
        if (lum > 0.82) {
          const glint = (lum - 0.82) * 90;
          r += glint;
          g += glint;
          b += glint;
        }
        outBuf[i] = Math.max(0, Math.min(255, Math.round(r)));
        outBuf[i + 1] = Math.max(0, Math.min(255, Math.round(g)));
        outBuf[i + 2] = Math.max(0, Math.min(255, Math.round(b)));
      }
    }

    const outPath = path.resolve('public', item.avatar);
    const webpBuffer = await sharp(outBuf, {
      raw: { width: 1024, height: 1024, channels: 3 },
    })
      .webp({ nearLossless: true, quality: 95 })
      .toBuffer();

    fs.writeFileSync(outPath, webpBuffer);
    if (item.altAvatar) {
      fs.writeFileSync(path.resolve('public', item.altAvatar), webpBuffer);
    }
    console.log(`✅ Generated ${item.avatar} & ${item.altAvatar} for ${item.name} (${item.hex})`);
  }
}

async function generateCrowns() {
  console.log('Generating 4 color-matched crowns...');
  const inputBuffer = fs.readFileSync('public/crown_green.png');
  const { data, info } = await sharp(inputBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const numPixels = info.width * info.height;

  for (const item of PALETTE) {
    const outputBuffer = Buffer.alloc(data.length);
    for (let i = 0; i < numPixels; i++) {
      const idx = i * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      if (a === 0) {
        outputBuffer[idx] = 0;
        outputBuffer[idx + 1] = 0;
        outputBuffer[idx + 2] = 0;
        outputBuffer[idx + 3] = 0;
        continue;
      }

      const [h, s, l] = rgbToHsl(r, g, b);
      const isDarkStroke = l < 0.22 && s < 0.6;
      const isPureHighlight = l > 0.92 && s < 0.2;

      if (isDarkStroke || isPureHighlight) {
        outputBuffer[idx] = r;
        outputBuffer[idx + 1] = g;
        outputBuffer[idx + 2] = b;
        outputBuffer[idx + 3] = a;
      } else {
        const newHue = item.hue;
        const newSat = Math.min(1.0, Math.max(0.45, s * 1.3));
        const newLight = Math.min(0.96, Math.max(0.08, l * 1.05));
        const [nr, ng, nb] = hslToRgb(newHue, newSat, newLight);
        outputBuffer[idx] = nr;
        outputBuffer[idx + 1] = ng;
        outputBuffer[idx + 2] = nb;
        outputBuffer[idx + 3] = a;
      }
    }

    const outPath = path.resolve('public', item.crown);
    await sharp(outputBuffer, {
      raw: { width: info.width, height: info.height, channels: 4 }
    }).png().toFile(outPath);
    console.log(`✅ Generated ${item.crown} for ${item.name}`);
  }
}

async function generateDisks() {
  console.log('Generating 4 color-matched disks...');
  const inputBuffer = fs.readFileSync('public/disk_0.png');
  const { data, info } = await sharp(inputBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const numPixels = info.width * info.height;

  for (const item of PALETTE) {
    const outputBuffer = Buffer.alloc(data.length);
    for (let i = 0; i < numPixels; i++) {
      const idx = i * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      if (a === 0) {
        outputBuffer[idx] = 0;
        outputBuffer[idx + 1] = 0;
        outputBuffer[idx + 2] = 0;
        outputBuffer[idx + 3] = 0;
        continue;
      }

      const [h, s, l] = rgbToHsl(r, g, b);

      if (s < 0.12 && l < 0.35) {
        // Dark metallic rim/plinth
        outputBuffer[idx] = r;
        outputBuffer[idx + 1] = g;
        outputBuffer[idx + 2] = b;
        outputBuffer[idx + 3] = a;
      } else {
        const [nr, ng, nb] = hslToRgb(item.hue, Math.min(1.0, s * 1.25), l);
        outputBuffer[idx] = nr;
        outputBuffer[idx + 1] = ng;
        outputBuffer[idx + 2] = nb;
        outputBuffer[idx + 3] = a;
      }
    }

    const outPath = path.resolve('public', item.disk);
    await sharp(outputBuffer, {
      raw: { width: info.width, height: info.height, channels: 4 }
    }).png().toFile(outPath);
    console.log(`✅ Generated ${item.disk} for ${item.name}`);
  }
}

async function main() {
  await generateAvatars();
  await generateCrowns();
  await generateDisks();
  console.log('🎉 ALL AVATARS, CROWNS, AND DISKS SYNCHRONIZED!');
}

main().catch(console.error);
