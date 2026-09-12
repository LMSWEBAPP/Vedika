import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

const dataFilePath = path.join(process.cwd(), 'data', 'assignments.json');

async function readAssignments() {
  try {
    const data = await fs.readFile(dataFilePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

async function writeAssignments(data) {
  try {
    const dir = path.dirname(dataFilePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(dataFilePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write assignments file:', err);
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');
    const chapterId = searchParams.get('chapterId');

    let list = await readAssignments();

    if (courseId && courseId !== 'all') {
      list = list.filter(a => String(a.course) === String(courseId));
    }
    if (chapterId && chapterId !== 'all') {
      list = list.filter(a => String(a.chapter) === String(chapterId));
    }

    return NextResponse.json(list);
  } catch (error) {
    console.error('Error in GET /api/assignments:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const assignment = body.assignment || body;

    if (!assignment.title || !assignment.course) {
      return NextResponse.json({ error: 'Title and course are required.' }, { status: 400 });
    }

    const list = await readAssignments();
    const id = assignment.id || `assign-${Date.now()}`;
    const existingIndex = list.findIndex(a => a.id === id);

    const record = {
      ...assignment,
      id,
      updated_at: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      list[existingIndex] = { ...list[existingIndex], ...record };
    } else {
      record.created_at = new Date().toISOString();
      list.unshift(record);
    }

    await writeAssignments(list);
    return NextResponse.json({ status: 'success', assignment: record });
  } catch (error) {
    console.error('Error in POST /api/assignments:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');

    if (!id) {
      try {
        const body = await request.json();
        id = body?.id;
      } catch (_) {}
    }

    if (!id) {
      return NextResponse.json({ error: 'Assignment id is required.' }, { status: 400 });
    }

    let list = await readAssignments();
    list = list.filter(a => a.id !== id);
    await writeAssignments(list);

    return NextResponse.json({ status: 'success', deleted: id });
  } catch (error) {
    console.error('Error in DELETE /api/assignments:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
