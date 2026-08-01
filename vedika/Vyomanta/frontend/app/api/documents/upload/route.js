import { NextResponse } from 'next/server';
import { verifyJwt } from '@/lib/auth';
import { uploadToB2 } from '@/lib/b2';
import pool from '@/lib/db';
import { Redis } from '@upstash/redis';
import crypto from 'crypto';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

// Helper to extract page count from raw PDF Buffer without dependencies
function getPdfPageCount(buffer) {
  try {
    const str = buffer.toString('ascii');
    const matches = [...str.matchAll(/\/Count\s+(\d+)/g)];
    if (matches.length === 0) return 1;
    const counts = matches.map(m => parseInt(m[1], 10));
    return Math.max(...counts);
  } catch (e) {
    console.error("[Upload] PDF page count extraction failed, fallback to 1:", e);
    return 1;
  }
}

export async function POST(request) {
  try {
    // 1. Authenticate Request
    const authHeader = request.headers.get('Authorization');
    const payload = verifyJwt(authHeader);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized JWT token.' }, { status: 401 });
    }
    
    const userId = payload.user_id;
    const tenantId = payload.tenant_id;
    
    // 2. Apply Upload Rate-Limiter (5 uploads per hour)
    const rateLimitKey = `rate:upload:${userId}`;
    const current = await redis.incr(rateLimitKey);
    if (current === 1) {
      await redis.expire(rateLimitKey, 3600);
    }
    if (current > 5) {
      return NextResponse.json({ error: 'Rate limit exceeded. Maximum 5 uploads per hour.' }, { status: 429 });
    }
    
    // 3. Parse Multipart Form Data
    const formData = await request.formData();
    const file = formData.get('file');
    const sessionId = formData.get('sessionId');
    let courseId = formData.get('courseId');
    
    if (!file || !sessionId) {
      return NextResponse.json({ error: 'Missing file or sessionId parameter.' }, { status: 400 });
    }
    
    // Dynamically resolve courseId from enrollment if missing or general
    if (!courseId || courseId === 'general' || courseId === 'null') {
      const [enrollments] = await pool.query(
        'SELECT course FROM test.`tabLMS Enrollment` WHERE member = ? LIMIT 1',
        [userId]
      );
      if (enrollments.length > 0) {
        courseId = enrollments[0].course;
      } else {
        courseId = 'a-guide-to-frappe-learning';
      }
    }
    
    // Validate PDF MIME-Type
    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      return NextResponse.json({ error: 'Only PDF documents are allowed.' }, { status: 400 });
    }
    
    // Validate File Size (<= 10MB)
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    if (fileBuffer.length > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds maximum limit of 10MB.' }, { status: 400 });
    }
    
    // Validate Page Count (<= 50 pages)
    const pageCount = getPdfPageCount(fileBuffer);
    if (pageCount > 50) {
      return NextResponse.json({ error: 'Document exceeds the maximum limit of 50 pages.' }, { status: 400 });
    }
    
    // 4. Upload to Backblaze B2 private bucket
    const docUuid = crypto.randomUUID();
    const fileKey = `${tenantId}/${userId}/${docUuid}.pdf`;
    const b2Bucket = process.env.B2_BUCKET_NAME || 'vyomanta-pdf-bucket';
    
    console.warn(`[Upload] Starting B2 Upload: ${fileKey}`);
    const b2Url = await uploadToB2(b2Bucket, fileKey, fileBuffer, 'application/pdf');
    
    // 5. Database Transaction: Insert document metadata and enqueue job
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      const now = new Date();
      // Insert document metadata row (matching tabLMS Session Document columns)
      await connection.query(
        `INSERT INTO test.\`tabLMS Session Document\` 
         (name, creation, modified, modified_by, owner, docstatus, idx, file_name, file_key, session_id, course_id, tenant_id, status)
         VALUES (?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?, ?, 'pending_ingestion')`,
        [docUuid, now, now, userId, userId, file.name, fileKey, sessionId, courseId, tenantId]
      );
      
      // Enqueue job row
      await connection.query(
        `INSERT INTO test.\`LMS Background Job Queue\` 
         (document_id, tenant_id, status, attempts, max_attempts)
         VALUES (?, ?, 'queued', 0, 3)`,
        [docUuid, tenantId]
      );
      
      // Log audit trail
      const auditUuid = crypto.randomUUID();
      await connection.query(
        `INSERT INTO test.\`LMS RAG Audit Log\` 
         (id, user_id, action, document_id, session_id, tenant_id, ip_address)
         VALUES (?, ?, 'upload', ?, ?, ?, ?)`,
        [auditUuid, userId, docUuid, sessionId, tenantId, request.headers.get('x-forwarded-for') || '127.0.0.1']
      );
      
      await connection.commit();
      console.warn(`[Upload] Successfully enqueued job for document ${docUuid}`);
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
    
    return NextResponse.json({ 
      message: 'Upload successful. Ingestion queued.', 
      documentId: docUuid,
      status: 'pending_ingestion'
    }, { status: 202 });
    
  } catch (error) {
    console.error("[Upload API] Server exception:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
