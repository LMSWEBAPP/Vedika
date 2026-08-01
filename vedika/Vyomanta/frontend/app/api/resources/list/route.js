import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const subcategory = searchParams.get('subcategory') || '';
    const sortBy = searchParams.get('sortBy') || 'newest';

    let sql = 'SELECT * FROM pdf_library_view WHERE 1=1';
    const params = [];

    if (category && category !== 'all') {
      sql += ' AND category = ?';
      params.push(category);
    }

    if (subcategory && subcategory !== 'all') {
      sql += ' AND subcategory = ?';
      params.push(subcategory);
    }

    if (search) {
      sql += ' AND name LIKE ?';
      params.push(`%${search}%`);
    }

    // Apply sorting
    if (sortBy === 'title') {
      sql += ' ORDER BY name ASC';
    } else {
      sql += ' ORDER BY created_at DESC';
    }

    const [rows] = await pool.query(sql, params);
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error fetching resources list:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
