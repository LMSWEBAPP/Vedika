import { verifyJwt } from '@/lib/auth';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const documentId = searchParams.get('documentId');
  const token = request.headers.get('Authorization') || searchParams.get('token');
  
  // 1. Authenticate Request
  const payload = verifyJwt(token);
  if (!payload) {
    return new Response(JSON.stringify({ error: 'Unauthorized JWT token.' }), { 
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  if (!documentId) {
    return new Response(JSON.stringify({ error: 'Missing documentId query parameter.' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // 2. Setup Server-Sent Events (SSE) Stream
  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();
  
  let intervalId;
  
  // Handle client disconnection
  request.signal.addEventListener('abort', () => {
    console.warn(`[SSE Status] Client closed stream for document ${documentId}`);
    clearInterval(intervalId);
    try {
      writer.close();
    } catch (e) {}
  });
  
  // Status check logic
  const checkStatus = async () => {
    try {
      // Query the document status in TiDB including owner and tenant_id for RLS check
      const [rows] = await pool.query(
        'SELECT status, owner, tenant_id FROM test.`tabLMS Session Document` WHERE name = ?',
        [documentId]
      );
      
      if (rows.length > 0) {
        const { status, owner, tenant_id } = rows[0];
        
        // Enforce Row-Level Security: Only the owner of the document within the same tenant can check its status
        if (owner !== payload.user_id || tenant_id !== (payload.tenant_id || 'default')) {
          console.warn(`[SSE Status] Access denied: User ${payload.user_id} tried to check status of document ${documentId} owned by ${owner}`);
          await writer.write(encoder.encode(`data: ${JSON.stringify({ status: 'unauthorized' })}\n\n`));
          clearInterval(intervalId);
          try {
            writer.close();
          } catch (e) {}
          return;
        }
        
        console.warn(`[SSE Status] Document ${documentId} status: ${status}`);
        await writer.write(encoder.encode(`data: ${JSON.stringify({ status })}\n\n`));
        
        // Terminate stream upon terminal states
        if (status === 'completed' || status === 'failed') {
          clearInterval(intervalId);
          try {
            writer.close();
          } catch (e) {}
        }
      } else {
        await writer.write(encoder.encode(`data: ${JSON.stringify({ status: 'not_found' })}\n\n`));
        clearInterval(intervalId);
        try {
          writer.close();
        } catch (e) {}
      }
    } catch (err) {
      console.error("[SSE Status] Error querying status:", err);
      clearInterval(intervalId);
      try {
        writer.close();
      } catch (e) {}
    }
  };
  
  // Poll database status every 2 seconds
  checkStatus();
  intervalId = setInterval(checkStatus, 2000);
  
  return new Response(responseStream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
