import sharp from 'sharp';
import fs from 'fs';

// Helper: RGB to HSL
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // achromatic
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
  return [h, s, l];
}

// Helper: HSL to RGB
function hslToRgb(h, s, l) {
  let r, g, b;
  if (s === 0) {
    r = g = b = l; // achromatic
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

// Target avatar colors from Vedika Labs
// 0: Physics / Ask Vedika: Purple #bf55f7
// 1: Chemistry / Code with Vedika: Red #f22a26
// 2: Biology / Code Puzzles: Olive Gold #b8b054
// 3: Math / Viva & Interview: Blue #1f72ff
const TARGET_COLORS = [
  { hex: '#bf55f7', r: 191, g: 85, b: 247 }, // 0: Purple
  { hex: '#f22a26', r: 242, g: 42, b: 38 },  // 1: Red
  { hex: '#b8b054', r: 184, g: 176, b: 84 }, // 2: Olive Gold
  { hex: '#1f72ff', r: 31, g: 114, b: 255 }, // 3: Electric Blue
];

async function recolorAll() {
  // Read disk_0 as master template into memory before overwriting
  const masterBuffer = fs.readFileSync('public/disk_0.png');
  const { data, info } = await sharp(masterBuffer).raw().toBuffer({ resolveWithObject: true });

  for (let idx = 0; idx < TARGET_COLORS.length; idx++) {
    const target = TARGET_COLORS[idx];
    const [targetH, targetS] = rgbToHsl(target.r, target.g, target.b);
    const outData = Buffer.alloc(data.length);

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      if (a === 0) {
        outData[i] = outData[i + 1] = outData[i + 2] = outData[i + 3] = 0;
        continue;
      }

      const [h, s, l] = rgbToHsl(r, g, b);

      if (s > 0.12) {
        // High saturation neon glow / rim / floor reflection: replace hue & saturation with target
        const blendedS = Math.min(1.0, s * (targetS / 0.85 + 0.15));
        const [nr, ng, nb] = hslToRgb(targetH, blendedS, l);
        outData[i] = nr;
        outData[i + 1] = ng;
        outData[i + 2] = nb;
        outData[i + 3] = a;
      } else {
        // Neutral dark metallic center: subtle tint to harmonize
        const tint = 0.08;
        outData[i] = Math.min(255, Math.round(r * (1 - tint) + (target.r / 255) * l * 255 * tint));
        outData[i + 1] = Math.min(255, Math.round(g * (1 - tint) + (target.g / 255) * l * 255 * tint));
        outData[i + 2] = Math.min(255, Math.round(b * (1 - tint) + (target.b / 255) * l * 255 * tint));
        outData[i + 3] = a;
      }
    }

    await sharp(outData, { raw: { width: info.width, height: info.height, channels: 4 } })
      .png({ compressionLevel: 8 })
      .toFile(`public/disk_${idx}.png`);

    console.log(`Generated public/disk_${idx}.png matching ${target.hex}`);
  }
}

recolorAll().catch(console.error);
