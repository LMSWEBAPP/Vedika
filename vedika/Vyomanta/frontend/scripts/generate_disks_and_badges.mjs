import sharp from 'sharp';
import fs from 'fs';

// Target Avatar Colors
// 0: Purple (#bf55f7)
// 1: Red (#f22a26)
// 2: Olive/Gold (#4e4b2b -> bright golden olive #9c953e for the glow/ring)
// 3: Electric Blue (#1f72ff)
const AVATAR_PALETTES = [
  { r: 191, g: 85, b: 247 },  // Purple #bf55f7 (Ask Vedika / Physics)
  { r: 242, g: 42, b: 38 },   // Red #f22a26 (Code with Vedika / Chemistry)
  { r: 184, g: 176, b: 84 },  // Olive/Gold #b8b054 (Code Puzzles / Biology)
  { r: 31, g: 114, b: 255 },  // Blue #1f72ff (Viva and Interview / Math)
];

async function recolorDisk(index, targetColor) {
  // Use disk_master as our pristine uncolored template
  const { data, info } = await sharp('public/disk_master.png').raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(data.length);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    if (a === 0) {
      out[i] = out[i + 1] = out[i + 2] = out[i + 3] = 0;
      continue;
    }

    // Luminance of current pixel
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    // Saturation/colorfulness indicator (difference between channels)
    const maxC = Math.max(r, g, b);
    const minC = Math.min(r, g, b);
    const chroma = (maxC - minC) / 255;

    if (chroma > 0.10) {
      // Colored glow / rim / neon element: tint strongly towards target color
      const boost = Math.min(1.0, chroma * 1.5);
      const nr = Math.min(255, Math.round((1 - boost) * r + boost * (targetColor.r * (lum * 1.25))));
      const ng = Math.min(255, Math.round((1 - boost) * g + boost * (targetColor.g * (lum * 1.25))));
      const nb = Math.min(255, Math.round((1 - boost) * b + boost * (targetColor.b * (lum * 1.25))));
      out[i] = nr;
      out[i + 1] = ng;
      out[i + 2] = nb;
      out[i + 3] = a;
    } else {
      // Dark / metallic neutral core: subtle tint so it harmonizes
      const tintStrength = 0.15;
      out[i] = Math.min(255, Math.round(r + (targetColor.r / 255) * lum * 25 * tintStrength));
      out[i + 1] = Math.min(255, Math.round(g + (targetColor.g / 255) * lum * 25 * tintStrength));
      out[i + 2] = Math.min(255, Math.round(b + (targetColor.b / 255) * lum * 25 * tintStrength));
      out[i + 3] = a;
    }
  }

  await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png({ compressionLevel: 8 })
    .toFile(`public/disk_${index}.png`);
  console.log(`Generated public/disk_${index}.png with color rgb(${targetColor.r},${targetColor.g},${targetColor.b})`);
}

async function recolorBadge(badgeName, targetColor) {
  const filePath = `public/badges/${badgeName}.png`;
  if (!fs.existsSync(filePath)) return;

  const { data, info } = await sharp(filePath).raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(data.length);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    if (a === 0) {
      out[i] = out[i + 1] = out[i + 2] = out[i + 3] = 0;
      continue;
    }

    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    const maxC = Math.max(r, g, b);
    const minC = Math.min(r, g, b);
    const chroma = (maxC - minC) / 255;

    // Tint colored areas to match target avatar color precisely
    const boost = Math.min(1.0, chroma * 1.4 + 0.2);
    out[i] = Math.min(255, Math.round((1 - boost) * r + boost * (targetColor.r * lum * 1.3)));
    out[i + 1] = Math.min(255, Math.round((1 - boost) * g + boost * (targetColor.g * lum * 1.3)));
    out[i + 2] = Math.min(255, Math.round((1 - boost) * b + boost * (targetColor.b * lum * 1.3)));
    out[i + 3] = a;
  }

  await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png({ compressionLevel: 8 })
    .toFile(filePath);
  console.log(`Recolored ${filePath} to match avatar color`);
}

async function run() {
  // 1. Recolor all 4 chamber pedestal disks
  for (let i = 0; i < 4; i++) {
    await recolorDisk(i, AVATAR_PALETTES[i]);
  }

  // 2. Recolor the 4 lab station badges to match avatar colors
  await recolorBadge('physics_badge', AVATAR_PALETTES[0]);   // Purple
  await recolorBadge('chemistry_badge', AVATAR_PALETTES[1]); // Red
  await recolorBadge('biology_badge', AVATAR_PALETTES[2]);   // Olive/Gold
  await recolorBadge('math_badge', AVATAR_PALETTES[3]);      // Blue
}

run().catch(console.error);
