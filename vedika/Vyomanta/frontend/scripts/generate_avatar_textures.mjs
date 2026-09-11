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
  return [h, s, l];
}

function hslToRgb(h, s, l) {
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

const AVATAR_CONFIGS = [
  {
    name: 'Avatar 1 (Purple)',
    hex: '#bf55f7',
    file: 'avatar_1_purple.webp',
  },
  {
    name: 'Avatar 2 (Red)',
    hex: '#f22a26',
    file: 'avatar_2_lime.webp',
  },
  {
    name: 'Avatar 3 (Olive/Brown)',
    hex: '#4e4b2b',
    file: 'avatar_3_red.webp',
  },
  {
    name: 'Avatar 4 (Blue)',
    hex: '#1f72ff',
    file: 'avatar_4_blue.webp',
  },
];

async function generateAllTextures() {
  const baseRaw = fs.readFileSync(path.resolve('public/extracted_base_color.webp'));
  const purpleRefRaw = fs.readFileSync(path.resolve('public/avatar_pink.webp'));

  const base = await sharp(baseRaw).raw().toBuffer({ resolveWithObject: true });
  const purpleRef = await sharp(purpleRefRaw).raw().toBuffer({ resolveWithObject: true });

  const baseAvgLum = 111.1;

  for (const cfg of AVATAR_CONFIGS) {
    const targetRgb = hexToRgb(cfg.hex);
    const [targetH, targetS, targetL] = rgbToHsl(targetRgb.r, targetRgb.g, targetRgb.b);

    const outBuf = Buffer.alloc(base.data.length);

    for (let i = 0; i < base.data.length; i += 3) {
      const br = base.data[i], bg = base.data[i + 1], bb = base.data[i + 2];
      const pr = purpleRef.data[i], pg = purpleRef.data[i + 1], pb = purpleRef.data[i + 2];

      const isEye = Math.hypot(br - pr, bg - pg, bb - pb) < 15;
      if (isEye) {
        outBuf[i] = br;
        outBuf[i + 1] = bg;
        outBuf[i + 2] = bb;
      } else {
        const lum = (0.299 * br + 0.587 * bg + 0.114 * bb) / 255;
        const relLum = lum / (baseAvgLum / 255);

        const shadedL = Math.max(0, Math.min(1, targetL * relLum));
        const [or, og, ob] = hslToRgb(targetH, targetS, shadedL);
        outBuf[i] = or;
        outBuf[i + 1] = og;
        outBuf[i + 2] = ob;
      }
    }

    const outPath = path.resolve('public', cfg.file);
    const webpBuffer = await sharp(outBuf, {
      raw: {
        width: 1024,
        height: 1024,
        channels: 3,
      },
    })
      .webp({ quality: 90 })
      .toBuffer();

    fs.writeFileSync(outPath, webpBuffer);
    console.log(`✅ Successfully generated ${cfg.name} -> ${cfg.file} (Hex: ${cfg.hex})`);
  }
}

generateAllTextures().catch(console.error);
