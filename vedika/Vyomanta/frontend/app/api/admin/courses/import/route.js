import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const FRAPPE_URL = process.env.FRAPPE_URL || process.env.NEXT_PUBLIC_FRAPPE_URL;

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'sample_syllabus.csv');
    const fileContent = await fs.readFile(filePath, 'utf8');

    return new Response(fileContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="sample_syllabus.csv"',
      },
    });
  } catch (error) {
    console.error("Failed to read sample syllabus CSV file:", error);
    return new Response("Template file not found", { status: 404 });
  }
}

// Quote-aware, RFC 4180 compliant CSV parser
function parseCSV(text) {
  const lines = [];
  let row = [""];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];

    if (c === '"') {
      if (inQuotes && next === '"') {
        row[row.length - 1] += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      row.push("");
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && next === '\n') {
        i++;
      }
      lines.push(row);
      row = [""];
    } else {
      row[row.length - 1] += c;
    }
  }
  if (row.length > 1 || row[0] !== "") {
    lines.push(row);
  }
  return lines;
}

function sanitizeTitle(title) {
  if (!title) return title;
  return title.replace(/#/g, 'No.');
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const text = await file.text();
    const parsed = parseCSV(text);
    if (parsed.length <= 1) {
      return NextResponse.json({ error: "CSV file is empty" }, { status: 400 });
    }

    // Header validation
    const headers = parsed[0].map(h => h.trim().toLowerCase());
    const idxMap = {
      course_title: headers.indexOf("course_title"),
      course_category: headers.indexOf("course_category"),
      course_short_introduction: headers.indexOf("course_short_introduction"),
      course_description: headers.indexOf("course_description"),
      course_status: headers.indexOf("course_status"),
      chapter_title: headers.indexOf("chapter_title"),
      lesson_title: headers.indexOf("lesson_title"),
      lesson_duration: headers.indexOf("lesson_duration"),
      lesson_youtube_id: headers.indexOf("lesson_youtube_id"),
      lesson_overview: headers.indexOf("lesson_overview"),
      lesson_key_points: headers.indexOf("lesson_key_points")
    };

    if (idxMap.course_title === -1 || idxMap.chapter_title === -1 || idxMap.lesson_title === -1) {
      return NextResponse.json({
        error: "Missing required headers. The CSV must contain 'course_title', 'chapter_title', and 'lesson_title' columns."
      }, { status: 400 });
    }

    // Group rows hierarchically
    const coursesMap = new Map();
    for (let i = 1; i < parsed.length; i++) {
      const row = parsed[i];
      if (row.length === 1 && row[0].trim() === "") continue; // skip blank rows

      const getValue = (key) => {
        const idx = idxMap[key];
        return idx !== -1 && row[idx] ? row[idx].trim() : "";
      };

      const courseTitle = getValue("course_title");
      if (!courseTitle) continue;

      const chapterTitle = getValue("chapter_title");
      const lessonTitle = getValue("lesson_title");

      if (!coursesMap.has(courseTitle)) {
        coursesMap.set(courseTitle, {
          title: courseTitle,
          category: getValue("course_category") || "Web Development",
          short_introduction: getValue("course_short_introduction") || `${courseTitle} tagline.`,
          description: getValue("course_description") || `Detailed description of ${courseTitle}.`,
          status: getValue("course_status") || "Published",
          chapters: new Map()
        });
      }

      const courseObj = coursesMap.get(courseTitle);
      if (chapterTitle) {
        if (!courseObj.chapters.has(chapterTitle)) {
          courseObj.chapters.set(chapterTitle, {
            title: chapterTitle,
            lessons: []
          });
        }
        const chapterObj = courseObj.chapters.get(chapterTitle);
        if (lessonTitle) {
          const rawPts = getValue("lesson_key_points");
          const pts = rawPts ? rawPts.split("|").map(p => p.trim()).filter(Boolean) : ["Key concept introduction."];
          chapterObj.lessons.push({
            title: lessonTitle,
            dur: getValue("lesson_duration") || "10 min",
            vid: getValue("lesson_youtube_id") || "rfscVS0vtbw",
            overview: getValue("lesson_overview") || `Overview of ${lessonTitle}.`,
            pts
          });
        }
      }
    }

    const importedList = [];
    const coursesToCreate = Array.from(coursesMap.values()).map(c => ({
      ...c,
      chapters: Array.from(c.chapters.values())
    }));

    // If no backend is configured, return the structured data to be saved locally
    if (!FRAPPE_URL) {
      return NextResponse.json({
        success: true,
        localFallback: true,
        data: coursesToCreate
      });
    }

    // Authenticated REST operations using request session cookies
    const cookieHeader = request.headers.get("cookie") || "";

    async function frappePost(resource, body) {
      const encodedResource = resource.split('/').map(segment => encodeURIComponent(segment)).join('/');
      const res = await fetch(`${FRAPPE_URL}/api/resource/${encodedResource}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cookie": cookieHeader
        },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Failed to create ${resource}: ${res.status} - ${errText}`);
      }
      const data = await res.json();
      return data.data;
    }

    async function frappePut(resource, name, body) {
      const encodedResource = resource.split('/').map(segment => encodeURIComponent(segment)).join('/');
      const encodedName = encodeURIComponent(name);
      const res = await fetch(`${FRAPPE_URL}/api/resource/${encodedResource}/${encodedName}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Cookie": cookieHeader
        },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Failed to update ${resource} ${name}: ${res.status} - ${errText}`);
      }
      const data = await res.json();
      return data.data;
    }

    // Write courses, chapters, and lessons to Frappe
    try {
      for (const course of coursesToCreate) {
        // Try to bootstrap the category first
        if (course.category) {
          try {
            await frappePost("LMS Course Category", {
              category_name: sanitizeTitle(course.category)
            });
          } catch (e) {
            console.warn(`LMS Course Category "${course.category}" could not be created or already exists:`, e.message);
          }
        }

        // 1. Create LMS Course with Link Validation fallback
        let courseDoc;
        try {
          courseDoc = await frappePost("LMS Course", {
            title: sanitizeTitle(course.title),
            published: course.status === "Published" ? 1 : 0,
            category: sanitizeTitle(course.category) || "Web Development",
            short_introduction: course.short_introduction,
            description: course.description,
            instructors: [{ instructor: "Administrator" }]
          });
        } catch (err) {
          if (err.message.includes("Category") || err.message.includes("LinkValidationError")) {
            console.warn(`Failed to create course with category "${course.category}", retrying with "Web Development"...`);
            courseDoc = await frappePost("LMS Course", {
              title: sanitizeTitle(course.title),
              published: course.status === "Published" ? 1 : 0,
              category: "Web Development",
              short_introduction: course.short_introduction,
              description: course.description,
              instructors: [{ instructor: "Administrator" }]
            });
          } else {
            throw err;
          }
        }
        const courseId = courseDoc.name;

        const chapterIds = [];
        // 2. Create Chapters
        for (const chapter of course.chapters) {
          const chDoc = await frappePost("Course Chapter", {
            title: sanitizeTitle(chapter.title),
            course: courseId
          });
          const chapterId = chDoc.name;
          chapterIds.push(chapterId);

          const lessonIds = [];
          // 3. Create Lessons
          for (const lesson of chapter.lessons) {
            const notesStr = JSON.stringify({
              pts: lesson.pts,
              quizQuestions: []
            });

            const lDoc = await frappePost("Course Lesson", {
              title: sanitizeTitle(lesson.title),
              chapter: chapterId,
              course: courseId,
              youtube: lesson.vid,
              body: lesson.overview,
              instructor_notes: notesStr
            });
            lessonIds.push(lDoc.name);
          }

          // Link lessons to chapter
          await frappePut("Course Chapter", chapterId, {
            lessons: lessonIds.map(lId => ({ lesson: lId }))
          });
        }

        // Link chapters to course
        await frappePut("LMS Course", courseId, {
          chapters: chapterIds.map(chId => ({ chapter: chId }))
        });

        importedList.push({
          id: courseId,
          title: course.title,
          chaptersCount: course.chapters.length,
          lessonsCount: course.chapters.reduce((sum, ch) => sum + ch.lessons.length, 0)
        });
      }

      return NextResponse.json({
        success: true,
        localFallback: false,
        imported: importedList
      });

    } catch (frappeError) {
      console.warn("Frappe REST operations failed, falling back to local simulation mode:", frappeError.message);
      return NextResponse.json({
        success: true,
        localFallback: true,
        data: coursesToCreate
      });
    }

  } catch (error) {
    console.error("CSV Import error:", error);
    return NextResponse.json({ error: error.message || "Failed to process CSV file." }, { status: 500 });
  }
}
