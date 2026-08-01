import { NextResponse } from 'next/server';
import crypto from 'crypto';

// Helper to sign a local fallback token matching the JWT verification logic
function signMockJwt(payload) {
  const secret = process.env.JWT_SECRET || process.env.ENCRYPTION_KEY || '8kAnz-VWclIhMghrU8g_39K2setlLtLR_9PJL1BjRxY=';
  const header = { alg: "HS256", typ: "JWT" };
  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const msg = `${headerB64}.${payloadB64}`;
  const signatureB64 = crypto.createHmac('sha256', secret)
    .update(msg, 'utf8')
    .digest('base64url');
  return `${msg}.${signatureB64}`;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Retrieve the Frappe sid from cookies or query params
    const cookieHeader = request.headers.get('cookie') || '';
    let sid = searchParams.get('sid');
    
    if (!sid && cookieHeader) {
      const match = cookieHeader.match(/sid=([^;]+)/);
      if (match) sid = match[1];
    }
    
    // Detect if running on localhost / development environment
    const isDev = process.env.NODE_ENV === 'development' || request.headers.get('host')?.includes('localhost');

    if (!sid) {
      if (isDev) {
        console.warn("[JWT Proxy] Localhost fallback: No session found. Generating mock JWT token...");
        const mockPayload = {
          user_id: 'student@lms.com',
          tenant_id: 'default_tenant',
          exp: Math.floor(Date.now() / 1000) + 3600
        };
        const token = signMockJwt(mockPayload);
        return NextResponse.json({ token });
      }
      return NextResponse.json({ error: 'No active session identifier found.' }, { status: 401 });
    }
    
    const frappeUrl = process.env.FRAPPE_URL || 'https://vyomanta.onrender.com';
    const exchangeUrl = `${frappeUrl}/api/method/lms.lms.api.get_jwt`;
    
    console.warn(`[JWT Proxy] Requesting JWT from backend for session ${sid.slice(0, 10)}...`);
    
    try {
      const response = await fetch(exchangeUrl, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': `sid=${sid}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const token = data.message?.token;
        if (token) {
          return NextResponse.json({ token });
        }
      }
      console.warn(`[JWT Proxy] Frappe token exchange failed or returned empty token. Status: ${response.status}`);
    } catch (err) {
      console.error("[JWT Proxy] Connection to Frappe backend failed:", err.message);
    }

    // If connection to Frappe failed but we are on localhost, fallback to mock JWT token
    if (isDev) {
      console.warn("[JWT Proxy] Localhost fallback: Frappe container offline, generating mock JWT token...");
      const mockPayload = {
        user_id: 'student@lms.com',
        tenant_id: 'default_tenant',
        exp: Math.floor(Date.now() / 1000) + 3600
      };
      const token = signMockJwt(mockPayload);
      return NextResponse.json({ token });
    }

    return NextResponse.json({ error: 'Failed to authenticate session with Frappe.' }, { status: 401 });
  } catch (error) {
    console.error("[JWT Proxy API] Server exception:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
