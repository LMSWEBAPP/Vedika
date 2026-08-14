export function getAllKeys() {
  const keys = [];
  
  // Primary key
  const mainKey = process.env.GEMINI_API_KEY;
  if (mainKey) keys.push(mainKey);

  // Additional rotated keys
  for (let i = 1; ; i++) {
    const k = process.env[`GEMINI_API_KEY_${i}`];
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
