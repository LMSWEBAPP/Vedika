import { NextResponse } from 'next/server';
import { verifyJwt } from '@/lib/auth';
import { deleteFromB2 } from '@/lib/b2';
import pool from '@/lib/db';
import { Redis } from '@upstash/redis';
import crypto from 'crypto';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

export async function POST(request) {
  try {
    const authHeader = request.headers.get('Authorization');
    const payload = verifyJwt(authHeader);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized JWT token.' }, { status: 401 });
    }
    
    const userId = payload.user_id;
    const tenantId = payload.tenant_id;
    
    const { documentId, sessionId } = await request.json();
    if (!documentId || !sessionId) {
      return NextResponse.json({ error: 'Missing documentId or sessionId parameter.' }, { status: 400 });
    }
    
    // 1. Fetch document metadata to check ownership
    const [rows] = await pool.query(
      'SELECT name, file_key, owner FROM test.`tabLMS Session Document` WHERE name = ? AND tenant_id = ?',
      [documentId, tenantId]
    );
    
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Document not found.' }, { status: 404 });
    }
    
    const document = rows[0];
    if (document.owner !== userId) {
      return NextResponse.json({ error: 'Access denied: You are not the owner of this document.' }, { status: 403 });
    }
    
    const fileKey = document.file_key;
    
    // 2. Delete file from Backblaze B2
    const b2Bucket = process.env.B2_BUCKET_NAME || 'vyomanta-pdf-bucket';
    console.warn(`[Delete API] Deleting from B2: ${fileKey}`);
    try {
      await deleteFromB2(b2Bucket, fileKey);
    } catch (b2Err) {
      console.error("[Delete API] Failed to delete B2 binary object, continuing with metadata:", b2Err);
    }
    
    // 3. Database transaction: Delete metadata (cascades to chunks) & Log audit trail
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      // Delete document metadata
      await connection.query(
        'DELETE FROM test.`tabLMS Session Document` WHERE name = ?',
        [documentId]
      );
      
      // Delete background queue tasks if pending
      await connection.query(
        'DELETE FROM test.`LMS Background Job Queue` WHERE document_id = ?',
        [documentId]
      );
      
      // Log audit trail
      const auditUuid = crypto.randomUUID();
      await connection.query(
        `INSERT INTO test.\`LMS RAG Audit Log\` 
         (id, user_id, action, document_id, session_id, tenant_id, ip_address)
         VALUES (?, ?, 'delete', ?, ?, ?, ?)`,
        [auditUuid, userId, documentId, sessionId, tenantId, request.headers.get('x-forwarded-for') || '127.0.0.1']
      );
      
      await connection.commit();
      console.warn(`[Delete API] Successfully deleted database records for ${documentId}`);
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
    
    // 4. Redis Cleanup: Clear chat history and workspace cached files list
    console.warn(`[Delete API] Clearing Redis caches for session: ${sessionId}`);
    await Promise.all([
      redis.del(`chat:${sessionId}`),
      redis.del(`ws_ticket:*`)
    ]);
    
    return NextResponse.json({ message: 'Document deleted successfully.' });
  } catch (error) {
    console.error("[Delete API] Server exception:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
