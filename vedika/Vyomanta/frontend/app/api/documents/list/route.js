import { NextResponse } from 'next/server';
import { verifyJwt } from '@/lib/auth';
import pool from '@/lib/db';

export async function GET(request) {
  try {
    const authHeader = request.headers.get('Authorization');
    const payload = verifyJwt(authHeader);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = payload.user_id;
    const tenantId = payload.tenant_id || 'default';

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    let queryStr = `
      SELECT ANY_VALUE(name) as id, ANY_VALUE(file_name) as name, file_key, ANY_VALUE(status) as status, MAX(creation) as creation 
      FROM test.\`tabLMS Session Document\` 
      WHERE owner = ? AND tenant_id = ? AND status = 'completed'
    `;
    const params = [userId, tenantId];

    if (sessionId) {
      queryStr += ` AND session_id = ?`;
      params.push(sessionId);
    }

    queryStr += `
      GROUP BY file_key
      ORDER BY creation DESC
    `;

    const [docs] = await pool.query(queryStr, params);

    return NextResponse.json({ documents: docs });
  } catch (error) {
    console.error("[Documents List API] Server exception:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
