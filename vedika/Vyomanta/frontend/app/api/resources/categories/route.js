import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let rows = [];
    try {
      const [dbRows] = await pool.query(
        'SELECT DISTINCT category, subcategory FROM pdf_categories ORDER BY category, subcategory'
      );
      rows = dbRows;
    } catch (dbErr) {
      console.warn('[Resources API] MySQL query failed for categories, using local fallback dataset:', dbErr.message);
      const fs = await import('fs/promises');
      const path = await import('path');
      const fallbackPath = path.join(process.cwd(), 'data', 'resources_fallback.json');
      try {
        const fileData = await fs.readFile(fallbackPath, 'utf8');
        const allResources = JSON.parse(fileData);
        const map = new Map();
        for (const item of allResources) {
          if (item.category && item.subcategory) {
            const key = `${item.category}|${item.subcategory}`;
            if (!map.has(key)) {
              map.set(key, { category: item.category, subcategory: item.subcategory });
            }
          }
        }
        rows = Array.from(map.values()).sort((a, b) => a.category.localeCompare(b.category));
      } catch (fileErr) {
        console.error('[Resources API] Fallback file read error for categories:', fileErr);
        rows = [];
      }
    }
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
