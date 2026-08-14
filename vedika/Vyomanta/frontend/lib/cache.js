const store = new Map();

const TTL = 24 * 60 * 60 * 1000;

export function cacheGet(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

export function cacheSet(key, value, ttl = TTL) {
  if (store.size > 500) {
    const keys = [...store.keys()].slice(0, 100);
    for (const k of keys) store.delete(k);
  }
  store.set(key, { value, expiry: Date.now() + ttl });
}

export function makeCacheKey(...parts) {
  let hash = 5381;
  const str = JSON.stringify(parts);
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}
