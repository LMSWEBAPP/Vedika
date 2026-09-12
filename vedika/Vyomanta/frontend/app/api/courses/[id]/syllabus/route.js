import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

const dataFilePath = path.join(process.cwd(), 'data', 'syllabi.json');
const coursesFilePath = path.join(process.cwd(), 'data', 'courses.json');

async function readSyllabi() {
  try {
    const data = await fs.readFile(dataFilePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return {};
  }
}

async function writeSyllabi(data) {
  try {
    const dir = path.dirname(dataFilePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(dataFilePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write syllabi file:', err);
  }
}

async function updateCourseLessonCount(courseId, totalLessons) {
  try {
    const coursesRaw = await fs.readFile(coursesFilePath, 'utf8');
    const courses = JSON.parse(coursesRaw);
    let updated = false;
    for (const c of courses) {
      if (String(c.id) === String(courseId)) {
        c.lessonsCount = totalLessons;
        updated = true;
      }
    }
    if (updated) {
      await fs.writeFile(coursesFilePath, JSON.stringify(courses, null, 2), 'utf8');
    }
  } catch (err) {
    // Non-fatal
  }
}

export async function GET(request, { params }) {
  try {
    const { id } = params;
    const courseId = decodeURIComponent(id);
    const syllabi = await readSyllabi();

    if (syllabi[courseId]) {
      return NextResponse.json(syllabi[courseId]);
    }

    return NextResponse.json({ error: 'Syllabus not found' }, { status: 404 });
  } catch (error) {
    console.error('Error fetching course syllabus:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const { id } = params;
    const courseId = decodeURIComponent(id);
    const body = await request.json();
    const syllabus = body.syllabus || body;

    if (!syllabus || !Array.isArray(syllabus.modules)) {
      return NextResponse.json({ error: 'Invalid syllabus format. "modules" array is required.' }, { status: 400 });
    }

    // Ensure syllabus object has course id
    syllabus.id = courseId;

    const syllabi = await readSyllabi();
    syllabi[courseId] = syllabus;
    await writeSyllabi(syllabi);

    // Calculate total lessons and update course count
    const totalLessons = (syllabus.modules || []).reduce(
      (acc, m) => acc + (Array.isArray(m.lessons) ? m.lessons.length : 0),
      0
    );
    await updateCourseLessonCount(courseId, totalLessons);

    return NextResponse.json({ status: 'success', syllabus });
  } catch (error) {
    console.error('Error saving course syllabus:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
