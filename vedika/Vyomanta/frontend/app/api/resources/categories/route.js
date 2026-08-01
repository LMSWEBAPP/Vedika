import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [rows] = await pool.query(
      'SELECT DISTINCT category, subcategory FROM pdf_categories ORDER BY category, subcategory'
    );
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
