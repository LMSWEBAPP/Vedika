import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'courses.json');

const DEFAULT_COURSES = [
  { id: '1', title: 'Python Fundamentals', instructor: 'Administrator', category: 'Professionals', enrolled: 37, status: 'Published', date: 'Jan 11, 2023' },
  { id: '2', title: 'Data Structures & Algorithms', instructor: 'John Samoh', category: 'Collaborate', enrolled: 25, status: 'Published', date: 'Jan 11, 2023' },
  { id: '3', title: 'Advanced Machine Learning', instructor: 'John Smiths', category: 'Collaborate', enrolled: 12, status: 'Published', date: 'Jan 11, 2023' },
  { id: '4', title: 'Web Development with Next.js', instructor: 'John Sarith', category: 'Collaborate', enrolled: 18, status: 'Draft', date: 'Jan 11, 2023' },
];

function readCoursesFromFile() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(DEFAULT_COURSES, null, 2), 'utf-8');
      return DEFAULT_COURSES;
    }
    const content = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : DEFAULT_COURSES;
  } catch (e) {
    console.error('[API/Courses] Error reading courses file:', e);
    return DEFAULT_COURSES;
  }
}

function writeCoursesToFile(courses) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(courses, null, 2), 'utf-8');
  } catch (e) {
    console.error('[API/Courses] Error writing courses file:', e);
  }
}

// GET: Return all courses
export async function GET() {
  const courses = readCoursesFromFile();
  return NextResponse.json({ success: true, courses });
}

// POST: Add new course or sync multiple courses
export async function POST(req) {
  try {
    const body = await req.json();
    let courses = readCoursesFromFile();

    if (body.courses && Array.isArray(body.courses)) {
      // Bulk sync or replace
      courses = body.courses;
      writeCoursesToFile(courses);
      return NextResponse.json({ success: true, courses });
    }

    if (body.course) {
      const newCourse = {
        ...body.course,
        id: body.course.id || Date.now().toString(),
        status: body.course.status || 'Published',
        date: body.course.date || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      };
      // Remove any existing course with same ID
      courses = courses.filter(c => String(c.id) !== String(newCourse.id));
      courses.unshift(newCourse);
      writeCoursesToFile(courses);
      return NextResponse.json({ success: true, course: newCourse });
    }

    return NextResponse.json({ error: 'Invalid course payload' }, { status: 400 });
  } catch (e) {
    console.error('[API/Courses] POST error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PUT: Update an existing course
export async function PUT(req) {
  try {
    const body = await req.json();
    const { id, course } = body;
    if (!id || !course) {
      return NextResponse.json({ error: 'Missing course id or body' }, { status: 400 });
    }

    let courses = readCoursesFromFile();
    const strId = String(id);
    let found = false;
    courses = courses.map(c => {
      if (String(c.id) === strId) {
        found = true;
        return { ...c, ...course, id: c.id };
      }
      return c;
    });

    if (!found) {
      courses.unshift({ ...course, id: strId });
    }

    writeCoursesToFile(courses);
    return NextResponse.json({ success: true, course: { ...course, id: strId } });
  } catch (e) {
    console.error('[API/Courses] PUT error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE: Delete a course by ID
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing course id' }, { status: 400 });
    }

    const strId = String(id);
    let courses = readCoursesFromFile();
    courses = courses.filter(c => String(c.id) !== strId);
    writeCoursesToFile(courses);

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[API/Courses] DELETE error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
