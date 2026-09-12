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

    let rows = [];
    try {
      const [dbRows] = await pool.query(sql, params);
      rows = dbRows;
    } catch (dbErr) {
      console.warn('[Resources API] MySQL query failed, using local fallback dataset:', dbErr.message);
      const fs = await import('fs/promises');
      const path = await import('path');
      const fallbackPath = path.join(process.cwd(), 'data', 'resources_fallback.json');
      try {
        const fileData = await fs.readFile(fallbackPath, 'utf8');
        let allResources = JSON.parse(fileData);

        // Filter fallback data
        if (category && category !== 'all') {
          allResources = allResources.filter(r => (r.category || '').toLowerCase() === category.toLowerCase());
        }
        if (subcategory && subcategory !== 'all') {
          allResources = allResources.filter(r => (r.subcategory || '').toLowerCase() === subcategory.toLowerCase());
        }
        if (search) {
          const s = search.toLowerCase();
          allResources = allResources.filter(r => (r.name || '').toLowerCase().includes(s));
        }

        if (sortBy === 'title') {
          allResources.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        } else {
          allResources.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        }

        rows = allResources;
      } catch (fileErr) {
        console.error('[Resources API] Fallback file read error:', fileErr);
        rows = [];
      }
    }

    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error fetching resources list:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
