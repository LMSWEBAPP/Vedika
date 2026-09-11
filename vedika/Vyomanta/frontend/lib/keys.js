export function getAllKeys() {
  const keys = [];
  const clean = (val) => {
    if (!val) return null;
    const s = String(val).trim().replace(/^["']|["']$/g, '').trim();
    return s.length > 0 ? s : null;
  };
  
  // Primary key
  const mainKey = clean(process.env.GEMINI_API_KEY);
  if (mainKey) keys.push(mainKey);

  // Additional rotated keys
  for (let i = 1; ; i++) {
    const k = clean(process.env[`GEMINI_API_KEY_${i}`]);
    if (k) keys.push(k);
    else break;
  }
  
  return keys;
}

export function getRotatedKey() {
  const keys = getAllKeys();
  if (keys.length === 0) return null;
  return keys[Math.floor(Math.random() * keys.length)];
}
