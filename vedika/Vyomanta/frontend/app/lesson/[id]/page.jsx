'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getCourses, getCourseSyllabus, frappeRestGet, saveProgressToRedis, getProgressFromRedis } from '@/lib/frappe';
import { getCourseDetails, COURSE } from '@/lib/lms-data';
import LessonPage from '@/components/LessonPage';

export default function LessonRoute() {
  const params = useParams();
  const id = decodeURIComponent(params.id || '');
  const router = useRouter();
  const [completed, setCompleted] = useState({});
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sync completion states
  useEffect(() => {
    let key = 'completed_lessons';
    let email = '';
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('frappe_user');
      if (stored) {
        try {
          const user = JSON.parse(stored);
          if (user && user.email) {
            key = `completed_lessons_${user.email}`;
            email = user.email;
          }
        } catch (e) {}
      }
      const saved = localStorage.getItem(key);
      let localCompleted = {};
      if (saved) {
        try {
          localCompleted = JSON.parse(saved);
          setCompleted(localCompleted);
        } catch (e) {}
      }

      if (email) {
        getProgressFromRedis(email).then(async (remoteCompleted) => {
          if (remoteCompleted) {
            const merged = { ...localCompleted, ...remoteCompleted };
            setCompleted(merged);
            localStorage.setItem(`completed_lessons_${email}`, JSON.stringify(merged));
            
            const remoteKeys = Object.keys(remoteCompleted).length;
            const mergedKeys = Object.keys(merged).length;
            if (mergedKeys > remoteKeys) {
              await saveProgressToRedis(email, merged);
            }
          }
        }).catch(err => console.error("Error synchronizing progress:", err));
      }
    }
  }, []);

  // Fetch courses dynamically and compile the lesson list
  useEffect(() => {
    async function loadLesson() {
      try {
        let found = null;
        const cleanId = String(id || '').trim();
        const suffix = cleanId.includes('_') ? cleanId.slice(cleanId.indexOf('_') + 1) : cleanId;
        const coursePrefix = cleanId.includes('_') ? cleanId.slice(0, cleanId.indexOf('_')) : '';
        const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL || process.env.FRAPPE_URL;

        // 1. Try Frappe Remote REST API if available
        if (FRAPPE_URL) {
          try {
            let lDoc = await frappeRestGet(`Course Lesson/${cleanId}`);
            if (!lDoc || (!lDoc.name && !lDoc.title)) {
              if (suffix && suffix !== cleanId) {
                lDoc = await frappeRestGet(`Course Lesson/${suffix}`);
              }
            }

            if (lDoc && (lDoc.name || lDoc.title)) {
              let pts = ["Key concept introduction."];
              let quizQuestions = [];
              let codingExercise = {
                hasExercise: false,
                language: 'python',
                instruction: '',
                starterCode: '',
                solutionCode: '',
                testCases: []
              };
              let pdf = "";
              if (lDoc.instructor_notes) {
                try {
                  const meta = JSON.parse(lDoc.instructor_notes);
                  if (Array.isArray(meta.pts)) pts = meta.pts;
                  if (Array.isArray(meta.quizQuestions)) quizQuestions = meta.quizQuestions;
                  if (meta.codingExercise) codingExercise = meta.codingExercise;
                  if (meta.pdf) pdf = meta.pdf;
                } catch (e) {}
              }

              let moduleTitle = "Module";
              let courseTitle = "Course";
              let courseId = lDoc.course || coursePrefix || "";

              if (lDoc.course) {
                try {
                  const syllabus = await getCourseSyllabus(lDoc.course, { forceRefresh: true });
                  if (syllabus) {
                    courseTitle = syllabus.title || courseTitle;
                    if (syllabus.modules) {
                      const m = syllabus.modules.find(mod => mod.lessons && mod.lessons.some(l => l.id === cleanId || l.id === suffix));
                      if (m) moduleTitle = m.title;
                    }
                  }
                } catch (e) {}
              }

              found = {
                id: cleanId,
                title: lDoc.title || cleanId,
                dur: "10 min",
                vid: lDoc.youtube || "",
                overview: lDoc.body || "",
                pts,
                quizQuestions,
                codingExercise,
                pdf,
                moduleTitle,
                courseTitle,
                courseId
              };
            }
          } catch (e) {
            console.error("Backend fetch failed, trying local fallback", e);
          }
        }

        // 2. Check localStorage custom syllabus outlines
        if (!found && typeof window !== 'undefined') {
          try {
            const courseIdsToCheck = coursePrefix ? [coursePrefix] : [];
            for (let i = 0; i < localStorage.length; i++) {
              const k = localStorage.key(i);
              if (k && k.startsWith('admin_course_details_')) {
                const cId = k.replace('admin_course_details_', '');
                if (!courseIdsToCheck.includes(cId)) courseIdsToCheck.push(cId);
              }
            }

            for (const cId of courseIdsToCheck) {
              const raw = localStorage.getItem(`admin_course_details_${cId}`);
              if (!raw) continue;
              const syllabus = JSON.parse(raw);
              if (syllabus && syllabus.modules) {
                for (const m of syllabus.modules) {
                  if (!m.lessons) continue;
                  const match = m.lessons.find(l => 
                    String(l.id) === String(cleanId) ||
                    String(l.id) === String(suffix) ||
                    `${cId}_${l.id}` === cleanId
                  );
                  if (match) {
                    found = {
                      ...match,
                      id: cleanId,
                      originalLessonId: match.id,
                      moduleTitle: m.title || "Module",
                      courseTitle: syllabus.title || "Course",
                      courseId: cId,
                      module: m
                    };
                    break;
                  }
                }
              }
              if (found) break;
            }
          } catch (_) {}
        }

        // 3. Fallback: Search all courses from getCourses() and getCourseDetails()
        if (!found) {
          const courses = await getCourses().catch(() => []);
          for (const course of courses) {
            const details = getCourseDetails(course);
            if (details && details.modules) {
              for (const m of details.modules) {
                if (!m.lessons) continue;
                for (const l of m.lessons) {
                  const isMatch = 
                    String(l.id) === String(cleanId) ||
                    String(l.id) === String(suffix) ||
                    `${course.id}_${l.id}` === cleanId ||
                    `${course.id}_l${l.id}` === cleanId ||
                    (coursePrefix && String(course.id) === String(coursePrefix) && String(l.id) === String(suffix));

                  if (isMatch) {
                    found = {
                      ...l,
                      id: cleanId,
                      originalLessonId: l.id,
                      moduleTitle: m.title,
                      courseTitle: course.title,
                      courseId: course.id,
                      module: m
                    };
                    break;
                  }
                }
                if (found) break;
              }
            }
            if (found) break;
          }
        }

        // 4. Default COURSE fallback (Python Fundamentals)
        if (!found && COURSE && COURSE.modules) {
          for (const m of COURSE.modules) {
            if (!m.lessons) continue;
            const l = m.lessons.find(x => 
              String(x.id) === String(cleanId) ||
              String(x.id) === String(suffix) ||
              `1_${x.id}` === cleanId ||
              `1_l${x.id}` === cleanId
            );
            if (l) {
              found = {
                ...l,
                id: cleanId,
                originalLessonId: l.id,
                moduleTitle: m.title,
                courseTitle: COURSE.title,
                courseId: '1',
                module: m
              };
              break;
            }
          }
        }

        setLesson(found);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadLesson();
  }, [id]);

  const onComplete = async (lessonId) => {
    let key = 'completed_lessons';
    let email = '';
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('frappe_user');
      if (stored) {
        try {
          const user = JSON.parse(stored);
          if (user && user.email) {
            key = `completed_lessons_${user.email}`;
            email = user.email;
          }
        } catch (e) {}
      }
    }
    const updated = { ...completed, [lessonId]: true };
    setCompleted(updated);
    localStorage.setItem(key, JSON.stringify(updated));

    if (email) {
      try {
        await saveProgressToRedis(email, updated);
      } catch (err) {
        console.error("Failed to sync completed lesson to Redis:", err);
      }
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg, #0B0F17)', alignItems: 'center', justifyContent: 'center', color: 'var(--text, #F8FAFC)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--accent, #6366F1)', animation: 'spin 1s linear infinite' }} />
          <div style={{ fontSize: 13, color: 'var(--muted, #94A3B8)', fontWeight: 500 }}>Loading lesson content...</div>
        </div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--text, #F8FAFC)', background: 'var(--bg, #0B0F17)', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
          🔍
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Lesson Not Found</h2>
        <p style={{ color: 'var(--muted, #94A3B8)', fontSize: 14, maxWidth: 440, lineHeight: 1.5, margin: 0 }}>
          We could not locate the lesson module for &quot;<strong>{id}</strong>&quot;. Choose an available lesson below or head back to courses.
        </p>
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button
            onClick={() => router.push('/lesson/l1')}
            style={{ background: 'var(--accent, #6366F1)', color: '#FFFFFF', border: 'none', padding: '10px 20px', borderRadius: 10, cursor: 'pointer', fontSize: 13.5, fontWeight: 600, boxShadow: '0 4px 14px rgba(99,102,241,0.4)' }}
          >
            Start Lesson 1 (What is Python?)
          </button>
          <button
            onClick={() => router.push('/courses')}
            style={{ background: 'rgba(255,255,255,0.06)', color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.12)', padding: '10px 18px', borderRadius: 10, cursor: 'pointer', fontSize: 13.5, fontWeight: 600 }}
          >
            All Courses
          </button>
        </div>
      </div>
    );
  }

  return (
    <LessonPage
      lesson={lesson}
      completed={completed}
      onComplete={onComplete}
    />
  );
}
