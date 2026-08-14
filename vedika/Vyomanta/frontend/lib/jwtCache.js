let cachedToken = null;
let cachedTokenPromise = null;
let tokenExpiryTime = 0;

/**
 * Returns the cached JWT token, or fetches a new one if missing or near expiry.
 * Implements a single-flight promise pattern to avoid parallel duplicate fetches.
 */
export async function getJwtToken() {
  const bufferTime = 5 * 60 * 1000; // Refetch if within 5 minutes of expiry
  const now = Date.now();

  // If we already have a valid token cached and it's not near expiry, return it directly
  if (cachedToken && now < tokenExpiryTime - bufferTime) {
    return cachedToken;
  }

  // If a fetch is already in flight, reuse its promise
  if (cachedTokenPromise) {
    return cachedTokenPromise;
  }

  // Start a new fetch and store the promise
  cachedTokenPromise = (async () => {
    try {
      console.warn("[JWT Cache] Fetching a fresh JWT token from API...");
      const res = await fetch('/api/auth/jwt');
      if (!res.ok) {
        throw new Error(`Failed to fetch JWT: ${res.status}`);
      }
      const data = await res.json();
      if (!data.token) {
        throw new Error("No token returned in API response.");
      }

      cachedToken = data.token;
      // Decode JWT to extract expiry (exp claim is in seconds)
      try {
        const parts = cachedToken.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
          if (payload.exp) {
            tokenExpiryTime = payload.exp * 1000;
          } else {
            tokenExpiryTime = Date.now() + 3600 * 1000; // default 1 hour
          }
        }
      } catch (err) {
        tokenExpiryTime = Date.now() + 3600 * 1000;
      }

      return cachedToken;
    } catch (error) {
      console.error("[JWT Cache] Token retrieval error:", error);
      cachedToken = null;
      throw error;
    } finally {
      // Clear the flight promise so subsequent retries can run if this failed
      cachedTokenPromise = null;
    }
  })();

  return cachedTokenPromise;
}

/**
 * Explicitly clears the cached token (useful on logout)
 */
export function clearCachedToken() {
  cachedToken = null;
  cachedTokenPromise = null;
  tokenExpiryTime = 0;
}
