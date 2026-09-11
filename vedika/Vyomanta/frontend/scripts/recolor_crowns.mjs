import fs from 'fs';
import sharp from 'sharp';

// Avatar colors matching Vedika Labs:
// Avatar 0: Ask Vedika -> Purple (#bf55f7, hue 280)
// Avatar 1: Code with Vedika -> Red (#f22a26, hue 1)
// Avatar 2: Code Puzzle -> Olive Gold (#b8b054, hue 55)
// Avatar 3: Viva & Interview -> Electric Blue (#1f72ff, hue 218)

const crowns = [
  { name: 'crown_purple.png', targetHue: 280, satMult: 1.25, lightMult: 1.05 },
  { name: 'crown_red.png',    targetHue: 1,   satMult: 1.45, lightMult: 1.0 },
  { name: 'crown_gold.png',   targetHue: 48,  satMult: 1.35, lightMult: 1.12 },
  { name: 'crown_blue.png',   targetHue: 218, satMult: 1.35, lightMult: 1.05 }
];

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

async function recolorAll() {
  const inputBuffer = fs.readFileSync('public/crown_green.png');
  const { data, info } = await sharp(inputBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const numPixels = info.width * info.height;

  for (const crown of crowns) {
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

      // Preserve dark strokes (outlines) and pure white highlights
      const isDarkStroke = l < 0.22 && s < 0.6;
      const isPureHighlight = l > 0.92 && s < 0.2;

      if (isDarkStroke || isPureHighlight) {
        outputBuffer[idx] = r;
        outputBuffer[idx + 1] = g;
        outputBuffer[idx + 2] = b;
        outputBuffer[idx + 3] = a;
      } else {
        const newHue = crown.targetHue;
        const newSat = Math.min(1.0, Math.max(0.4, s * crown.satMult));
        const newLight = Math.min(0.96, Math.max(0.08, l * crown.lightMult));
        const [nr, ng, nb] = hslToRgb(newHue, newSat, newLight);
        outputBuffer[idx] = nr;
        outputBuffer[idx + 1] = ng;
        outputBuffer[idx + 2] = nb;
        outputBuffer[idx + 3] = a;
      }
    }

    const outPath = `public/${crown.name}`;
    await sharp(outputBuffer, {
      raw: {
        width: info.width,
        height: info.height,
        channels: 4,
      }
    }).png().toFile(outPath);
    console.log(`Generated ${outPath} successfully.`);
  }
}

recolorAll().catch(console.error);
