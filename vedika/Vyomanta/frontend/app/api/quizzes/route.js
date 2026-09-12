import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

const dataFilePath = path.join(process.cwd(), 'data', 'quizzes.json');

async function readQuizzes() {
  try {
    const data = await fs.readFile(dataFilePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

async function writeQuizzes(data) {
  try {
    const dir = path.dirname(dataFilePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(dataFilePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write quizzes file:', err);
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');
    const lessonId = searchParams.get('lessonId');

    let list = await readQuizzes();

    if (courseId && courseId !== 'all') {
      list = list.filter(q => String(q.course) === String(courseId));
    }
    if (lessonId && lessonId !== 'all') {
      list = list.filter(q => String(q.lesson) === String(lessonId));
    }

    return NextResponse.json(list);
  } catch (error) {
    console.error('Error in GET /api/quizzes:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const quiz = body.quiz || body;

    if (!quiz.title) {
      return NextResponse.json({ error: 'Title is required.' }, { status: 400 });
    }

    const list = await readQuizzes();
    const id = quiz.id || `quiz-${Date.now()}`;
    const existingIndex = list.findIndex(q => q.id === id);

    const record = {
      ...quiz,
      id,
      updated_at: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      list[existingIndex] = { ...list[existingIndex], ...record };
    } else {
      record.created_at = new Date().toISOString();
      list.unshift(record);
    }

    await writeQuizzes(list);
    return NextResponse.json({ status: 'success', quiz: record });
  } catch (error) {
    console.error('Error in POST /api/quizzes:', error);
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
      return NextResponse.json({ error: 'Quiz id is required.' }, { status: 400 });
    }

    let list = await readQuizzes();
    list = list.filter(q => q.id !== id);
    await writeQuizzes(list);

    return NextResponse.json({ status: 'success', deleted: id });
  } catch (error) {
    console.error('Error in DELETE /api/quizzes:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
