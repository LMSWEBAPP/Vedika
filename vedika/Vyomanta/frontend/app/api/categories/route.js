import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

const categoriesFilePath = path.join(process.cwd(), 'data', 'categories.json');
const coursesFilePath = path.join(process.cwd(), 'data', 'courses.json');

const DEFAULT_CATEGORIES = [
  "Web Development",
  "Frontend",
  "Framework",
  "Data Structures & Algorithms",
  "Python Programming",
  "Finance",
  "Business",
  "Design",
  "Personal Development"
];

async function readCategories() {
  try {
    const data = await fs.readFile(categoriesFilePath, 'utf8');
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch (_) {}
  return [...DEFAULT_CATEGORIES];
}

async function writeCategories(list) {
  try {
    const dir = path.dirname(categoriesFilePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(categoriesFilePath, JSON.stringify(list, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write categories file:', err);
  }
}

async function getCourseCategoriesFromCourses() {
  try {
    const data = await fs.readFile(coursesFilePath, 'utf8');
    const courses = JSON.parse(data);
    if (Array.isArray(courses)) {
      return courses.map(c => c.category).filter(Boolean);
    }
  } catch (_) {}
  return [];
}

export async function GET() {
  try {
    const [storedCategories, courseCategories] = await Promise.all([
      readCategories(),
      getCourseCategoriesFromCourses()
    ]);

    const merged = Array.from(new Set([...storedCategories, ...courseCategories].map(c => c.trim()).filter(Boolean)));
    return NextResponse.json(merged);
  } catch (error) {
    console.error('Error in GET /api/categories:', error);
    return NextResponse.json(DEFAULT_CATEGORIES);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const newCategory = (body.category || '').trim();

    if (!newCategory) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }

    const current = await readCategories();
    const exists = current.some(c => c.toLowerCase() === newCategory.toLowerCase());

    if (!exists) {
      current.push(newCategory);
      await writeCategories(current);
    }

    return NextResponse.json({ status: 'success', category: newCategory, categories: current });
  } catch (error) {
    console.error('Error in POST /api/categories:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
