'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getCourses, getCourseSyllabus, frappeRestGet, saveProgressToRedis, getProgressFromRedis } from '@/lib/frappe';
import { getCourseDetails } from '@/lib/lms-data';
import LessonPage from '@/components/LessonPage';

export default function LessonRoute() {
  const params = useParams();
  const id = decodeURIComponent(params.id);
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
        const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL || process.env.FRAPPE_URL;

        if (FRAPPE_URL) {
          try {
            const lDoc = await frappeRestGet(`Course Lesson/${id}`);
            if (lDoc && lDoc.course) {
              const syllabus = await getCourseSyllabus(lDoc.course);
              if (syllabus && syllabus.modules) {
                const lessonsInCourse = [];
                syllabus.modules.forEach(m => {
                  m.lessons.forEach(l => {
                    lessonsInCourse.push({
                      ...l,
                      moduleTitle: m.title,
                      courseTitle: syllabus.title,
                      courseId: syllabus.id,
                      module: m
                    });
                  });
                });
                found = lessonsInCourse.find(l => l.id === id);
                if (found && found.lazyLoad) {
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
                  
                  found = {
                    ...found,
                    title: lDoc.title || found.title,
                    dur: lDoc.duration || "10 min",
                    vid: lDoc.youtube || "rfscVS0vtbw",
                    overview: lDoc.body || "",
                    pts,
                    quizQuestions,
                    codingExercise,
                    pdf,
                    lazyLoad: false
                  };
                }
              }
            }
          } catch (e) {
            console.error("Backend fetch failed, trying local fallback", e);
          }
        }

        // Local cache fallback
        if (!found) {
          const courses = await getCourses();
          const allLessons = [];
          courses.forEach(course => {
            const details = getCourseDetails(course);
            if (details && details.modules) {
              details.modules.forEach(m => {
                m.lessons.forEach(l => {
                  allLessons.push({
                    ...l,
                    moduleTitle: m.title,
                    courseTitle: course.title,
                    courseId: course.id,
                    module: m
                  });
                });
              });
            }
          });
          found = allLessons.find(l => l.id === id);
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
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)', alignItems: 'center', justifyContent: 'center', color: 'var(--text)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
          <div style={{ fontSize: 14, color: 'var(--muted)' }}>Loading lesson...</div>
        </div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div style={{ padding: '60px 36px', textAlign: 'center', color: 'var(--muted)', background: 'var(--bg)', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <h2>Lesson not found</h2>
        <button onClick={() => router.push('/courses')}
          style={{ marginTop: 16, background: 'var(--accent)', color: '#000', border: 'none', padding: '8px 18px', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
          Back to Courses
        </button>
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
