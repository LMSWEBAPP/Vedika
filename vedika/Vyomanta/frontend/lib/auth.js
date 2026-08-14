import crypto from 'crypto';

export function verifyJwt(token) {
  if (!token) return null;
  
  // Strip Bearer prefix if present
  const jwtToken = token.startsWith('Bearer ') ? token.slice(7) : token;
  const parts = jwtToken.split('.');
  if (parts.length !== 3) return null;
  
  try {
    const [headerB64, payloadB64, signatureB64] = parts;
    
    // Parse payload
    const payloadStr = Buffer.from(payloadB64, 'base64url').toString('utf8');
    const payload = JSON.parse(payloadStr);
    
    // Check expiry
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      console.warn("[Auth] JWT has expired.");
      return null;
    }
    
    // Compute expected signature
    const secret = process.env.JWT_SECRET || process.env.ENCRYPTION_KEY || '8kAnz-VWclIhMghrU8g_39K2setlLtLR_9PJL1BjRxY=';
    const msg = `${headerB64}.${payloadB64}`;
    const expectedSig = crypto.createHmac('sha256', secret)
      .update(msg, 'utf8')
      .digest('base64url');
      
    // Compare signatures using a timing-safe check
    const sigBuf = Buffer.from(signatureB64);
    const expBuf = Buffer.from(expectedSig);
    
    if (sigBuf.length !== expBuf.length) {
      return null;
    }
    
    const valid = crypto.timingSafeEqual(sigBuf, expBuf);
    return valid ? payload : null;
  } catch (e) {
    console.error("[Auth] JWT validation exception:", e);
    return null;
  }
}
