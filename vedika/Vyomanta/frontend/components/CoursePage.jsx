'use client';

import { useState, useEffect } from 'react';
import {
  CheckCircle, Circle, Clock, Play, GraduationCap, ChevronRight, ArrowLeft, Users, Tag, BookOpen, Terminal, X, Award
} from 'lucide-react';
import { T } from '@/lib/lms-data';
import { getCourses, getCourseSyllabus, checkStudentEnrollment, enrollStudentInCourse, getStudentEnrollments, saveProgressToRedis, getProgressFromRedis } from '@/lib/frappe';
import { useMediaQuery, isMobileMQ } from '@/lib/useMediaQuery';
import dynamic from 'next/dynamic';
import PDFViewerModal from './PDFViewerModal';
const Playground = dynamic(() => import('./Playground'), { ssr: false });

export default function CoursePage() {
  const isMobile = useMediaQuery(isMobileMQ);
  const isTabletOrSmallDesktop = useMediaQuery('(max-width: 1150px)');
  const rPad = isMobile ? 16 : 36;
  const [isPlaygroundOpen, setIsPlaygroundOpen] = useState(false);

  const outerStyle = isPlaygroundOpen && !isMobile
    ? (isTabletOrSmallDesktop
        ? { padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: 28, fontFamily: 'var(--font-outfit), sans-serif', width: '100%' }
        : { padding: '32px 24px', display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 28, fontFamily: 'var(--font-outfit), sans-serif', width: '100%', maxWidth: '100%' })
    : { padding: isMobile ? '20px 16px' : '32px 36px', fontFamily: 'var(--font-outfit), sans-serif' };

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseDetails, setCourseDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [completed, setCompleted] = useState({});
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState([]);
  
  // Category & Modal States
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);
  const [isPdfViewerOpen, setIsPdfViewerOpen] = useState(false);
  const [selectedPdfResource, setSelectedPdfResource] = useState(null);

  // Fetch courses and load completion progress
  useEffect(() => {
    let email = '';
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('frappe_user');
      if (stored) {
        try {
          const user = JSON.parse(stored);
          if (user && user.email) {
            email = user.email;
            setUserEmail(user.email);
          }
        } catch (e) {}
      }
    }

    async function loadData() {
      try {
        const [list, enrollments] = await Promise.all([
          getCourses(),
          email ? getStudentEnrollments(email) : Promise.resolve([])
        ]);
        // Students only see Published courses
        const published = list.filter(c => c.status === 'Published');
        setCourses(published);
        setEnrolledCourseIds(enrollments || []);

        // Restore UX memory of last viewed course on mount
        if (typeof window !== 'undefined') {
          const lastCourseId = localStorage.getItem('selected_course_id');
          if (lastCourseId) {
            const found = published.find(c => c.id === lastCourseId);
            if (found) {
              handleSelectCourse(found);
            }
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    loadData();

    let key = 'completed_lessons';
    if (email) {
      key = `completed_lessons_${email}`;
    }
    const savedCompleted = localStorage.getItem(key);
    let localCompleted = {};
    if (savedCompleted) {
      try {
        localCompleted = JSON.parse(savedCompleted);
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
  }, []);

  async function handleSelectCourse(course) {
    setSelectedCourse(course);
    if (typeof window !== 'undefined' && course) {
      localStorage.setItem('selected_course_id', course.id);
    }
    setDetailsLoading(true);
    try {
      // Retrieve stored user email directly in case it changed
      let email = userEmail;
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('frappe_user');
        if (stored) {
          try {
            const user = JSON.parse(stored);
            if (user && user.email) {
              email = user.email;
              setUserEmail(user.email);
            }
          } catch (e) {}
        }
      }

      const enrolledStatus = enrolledCourseIds.includes(course.id) || await checkStudentEnrollment(course.id, email);
      setIsEnrolled(enrolledStatus);

      const details = await getCourseSyllabus(course.id);
      setCourseDetails(details);
    } catch (e) {
      console.error("Failed to load course details", e);
    } finally {
      setDetailsLoading(false);
    }
  }

  const handleEnroll = async () => {
    if (!selectedCourse || !userEmail) return;
    setIsEnrolling(true);
    try {
      await enrollStudentInCourse(selectedCourse.id, userEmail);
      setIsEnrolled(true);
      // Refresh enrollments list
      const enrollments = await getStudentEnrollments(userEmail);
      setEnrolledCourseIds(enrollments || []);
    } catch (e) {
      console.error("Failed to enroll student", e);
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleEnrollFromCard = async (courseId, e) => {
    e.stopPropagation(); // Prevent opening the outline page
    if (!userEmail) return;
    try {
      await enrollStudentInCourse(courseId, userEmail);
      // Refresh enrollments list
      const enrollments = await getStudentEnrollments(userEmail);
      setEnrolledCourseIds(enrollments || []);
    } catch (err) {
      console.error("Failed to enroll student from card", err);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)', alignItems: 'center', justifyContent: 'center', color: 'var(--text)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
          <div style={{ fontSize: 14, color: 'var(--muted)' }}>Loading courses...</div>
        </div>
      </div>
    );
  }

  if (detailsLoading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)', alignItems: 'center', justifyContent: 'center', color: 'var(--text)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
          <div style={{ fontSize: 14, color: 'var(--muted)' }}>Loading course syllabus...</div>
        </div>
      </div>
    );
  }

  // Render course outline if a specific course is selected
  if (selectedCourse && courseDetails) {
    const details = courseDetails;
    const modules = details.modules || [];
    
    // Compile all lessons in this course
    const courseLessons = modules.flatMap(m => m.lessons.map(l => ({ ...l, module: m })));
    const total = courseLessons.length;
    const done = courseLessons.filter(l => completed[l.id]).length;
    const progressPercent = total > 0 ? Math.round((done / total) * 100) : 0;

    const showSplitLayout = isPlaygroundOpen && !isMobile && !isTabletOrSmallDesktop;
    const showVerticalSplit = isPlaygroundOpen && (isMobile || isTabletOrSmallDesktop);

    return (
      <div style={{
        display: 'flex',
        flexDirection: showVerticalSplit ? 'column' : 'row',
        height: showSplitLayout ? '100vh' : 'auto',
        overflow: showSplitLayout ? 'hidden' : 'visible',
        width: '100%',
        background: T.bg
      }}>
        <div style={{
          width: showSplitLayout ? '55%' : '100%',
          flex: showSplitLayout ? 'none' : 1,
          height: showSplitLayout ? '100%' : 'auto',
          overflowY: showSplitLayout ? 'auto' : 'visible',
          padding: isMobile ? '20px 16px' : '32px 36px',
          display: 'flex',
          flexDirection: 'column'
        }} className="no-scrollbar">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
            {/* Back button */}
            <button
              onClick={() => {
                setSelectedCourse(null);
                if (typeof window !== 'undefined') {
                  localStorage.removeItem('selected_course_id');
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'none',
                border: 'none',
                color: T.muted,
                cursor: 'pointer',
                fontSize: 13,
                padding: 0,
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = T.text}
              onMouseLeave={(e) => e.currentTarget.style.color = T.muted}
            >
              <ArrowLeft size={15} /> Back to Courses
            </button>

            <button
              onClick={() => setIsPlaygroundOpen(!isPlaygroundOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: isPlaygroundOpen ? `${T.accent}15` : 'transparent',
                border: `1px solid ${isPlaygroundOpen ? T.accent : 'var(--border)'}`,
                color: isPlaygroundOpen ? T.accent : 'var(--text)',
                cursor: 'pointer',
                fontSize: 12.5,
                fontWeight: 600,
                padding: '6px 14px',
                borderRadius: 8,
                transition: 'all 0.15s'
              }}
            >
              <Terminal size={14} />
              {isPlaygroundOpen ? 'Close Playground' : 'Practice Playground'}
            </button>
          </div>

        {/* Course Detail Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 11.5, color: T.accent, background: `${T.accent}15`, padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>
              {selectedCourse.category}
            </span>
            <span style={{ fontSize: 11.5, color: T.muted }}>
              By {selectedCourse.instructor}
            </span>
          </div>
          
          <h2 style={{ color: T.text, fontSize: 24, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.03em' }}>
            {details.title}
          </h2>
          
          <p style={{ color: T.muted, margin: 0, fontSize: 14, lineHeight: 1.5 }}>
            {details.tagline}
          </p>

          {selectedCourse.pdf && (
            <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
              <button
                onClick={() => {
                  setSelectedPdfResource({ file_link: selectedCourse.pdf, name: `${selectedCourse.title} Reference Materials` });
                  setIsPdfViewerOpen(true);
                }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: `${T.accent}12`, border: `1px solid ${T.accent}40`,
                  color: T.accent, padding: '7px 14px', borderRadius: 8,
                  fontSize: 12.5, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s'
                }}
              >
                📄 View Course PDF Materials
              </button>
            </div>
          )}
        </div>

        {/* Enrollment CTA Card or Outline List */}
        {!isEnrolled ? (
          <div style={{
            background: T.s1,
            border: `1px solid ${T.border}`,
            borderRadius: 16,
            padding: '40px 24px',
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16
          }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: `linear-gradient(135deg, ${T.accent} 0%, #3B82F6 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 16px rgba(59, 130, 246, 0.2)',
              marginBottom: 8
            }}>
              <GraduationCap size={30} color="#fff" />
            </div>
            <h3 style={{ color: T.text, fontSize: 18, fontWeight: 700, margin: 0 }}>Enroll in Course</h3>
            <p style={{ color: T.muted, fontSize: 13.5, maxWidth: 420, margin: 0, lineHeight: 1.5 }}>
              Enroll now to gain complete access to modules, lesson transcripts, hands-on assignments, and start learning with your personalized AI tutor!
            </p>
            <button
              onClick={handleEnroll}
              disabled={isEnrolling}
              style={{
                background: isEnrolling ? T.dim : T.accent,
                color: '#000',
                border: 'none',
                padding: '12px 28px',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 700,
                cursor: isEnrolling ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(91, 140, 248, 0.3)',
                transition: 'all 0.2s',
                marginTop: 8
              }}
            >
              {isEnrolling ? 'Enrolling...' : 'Confirm Enrollment'}
            </button>
          </div>
        ) : (
          <div>
            {progressPercent === 100 && (
              <div style={{
                background: `linear-gradient(135deg, ${T.purple}12 0%, ${T.accent}12 100%)`,
                border: `1px solid ${T.purple}30`,
                borderRadius: 16,
                padding: '24px 20px',
                textAlign: 'center',
                marginBottom: 20,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 12
              }}>
                <div style={{ fontSize: 32 }}>🏆</div>
                <h3 style={{ color: T.text, fontSize: 16, fontWeight: 700, margin: 0 }}>Congratulations! You completed the course!</h3>
                <p style={{ color: T.muted, fontSize: 13, margin: 0, maxWidth: 460 }}>
                  You have successfully completed all lessons in this course. You can now view and download your verified completion certificate!
                </p>
                <button
                  onClick={() => setIsCertModalOpen(true)}
                  style={{
                    background: `linear-gradient(135deg, ${T.purple} 0%, ${T.accent} 100%)`,
                    color: '#fff',
                    border: 'none',
                    padding: '8px 20px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(155, 110, 248, 0.2)'
                  }}
                >
                  View Completion Certificate
                </button>
              </div>
            )}

            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12.5, color: T.muted }}>
                <span>Progress: {done}/{total} lessons completed</span>
                <span style={{ fontWeight: 600, color: T.accent }}>{progressPercent}% Complete</span>
              </div>

              <div style={{ background: T.s3, borderRadius: 99, height: 6, marginTop: 8, width: '100%', overflow: 'hidden' }}>
                <div style={{
                  background: T.accent, height: '100%', borderRadius: 99,
                  width: `${progressPercent}%`, transition: 'width 0.4s'
                }} />
              </div>
            </div>

            {/* Modules list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {modules.map((mod, mi) => {
                const modDone = mod.lessons.filter(l => completed[l.id]).length;
                return (
                  <div key={mod.id} style={{ background: T.s1, border: `1px solid ${T.border}`, borderRadius: 14, overflow: 'hidden' }}>
                    {/* Module header */}
                    <div style={{
                      padding: '16px 20px', borderBottom: `1px solid ${T.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 9,
                          background: `${mod.accent || T.accent}18`, border: `1px solid ${mod.accent || T.accent}30`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18
                        }}>{mod.emoji}</div>
                        <div>
                          <div style={{ color: T.text, fontWeight: 600, fontSize: 14 }}>{mi + 1}. {mod.title}</div>
                          <div style={{ color: T.muted, fontSize: 12 }}>{mod.lessons.length} lessons · {modDone} completed</div>
                        </div>
                      </div>
                      {/* Circular progress */}
                      <div style={{ width: 36, height: 36, borderRadius: '50%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="36" height="36" style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)' }}>
                          <circle cx="18" cy="18" r="14" fill="none" stroke={T.s3} strokeWidth="3" />
                          <circle cx="18" cy="18" r="14" fill="none" stroke={mod.accent || T.accent} strokeWidth="3"
                            strokeDasharray={`${2 * Math.PI * 14}`}
                            strokeDashoffset={`${2 * Math.PI * 14 * (1 - (mod.lessons.length > 0 ? modDone / mod.lessons.length : 0))}`}
                            strokeLinecap="round" />
                        </svg>
                        <span style={{ fontSize: 10, color: mod.accent || T.accent, fontWeight: 700, position: 'relative' }}>
                          {mod.lessons.length > 0 ? Math.round((modDone / mod.lessons.length) * 100) : 0}%
                        </span>
                      </div>
                    </div>

                    {/* Lessons */}
                    <div>
                      {mod.lessons.map((lesson, li) => (
                        <a
                          key={lesson.id}
                          href={`/lesson/${lesson.id}`}
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center',
                            justifyContent: 'space-between', padding: '13px 20px',
                            background: 'transparent', border: 'none',
                            borderBottom: li < mod.lessons.length - 1 ? `1px solid ${T.border}` : 'none',
                            cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s',
                            textDecoration: 'none'
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = T.s2}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            {completed[lesson.id]
                              ? <CheckCircle size={16} color={T.green} />
                              : <Circle size={16} color={T.dim} />}
                            <div>
                              <div style={{ color: T.text, fontSize: 13.5, fontWeight: 500 }}>{lesson.title}</div>
                              <div style={{ color: T.muted, fontSize: 12, marginTop: 1, display: 'flex', alignItems: 'center', gap: 5 }}>
                                <Clock size={11} />{lesson.dur}
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {completed[lesson.id] && (
                              <span style={{ fontSize: 11, color: T.green, background: `${T.green}18`, padding: '2px 8px', borderRadius: 20 }}>Done</span>
                            )}
                            <Play size={14} color={T.muted} />
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
          {isPlaygroundOpen && isMobile && (
            <div style={{ marginTop: 24, height: 400, flexShrink: 0 }}>
              <Playground initialCode={`# Practice for: ${selectedCourse.title}\n# Write your code here\n\n`} />
            </div>
          )}
          {isPlaygroundOpen && !isMobile && isTabletOrSmallDesktop && (
            <div style={{ marginTop: 32, height: 500, flexShrink: 0 }}>
              <Playground initialCode={`# Practice for: ${selectedCourse.title}\n# Write your code here\n\n`} />
            </div>
          )}
        </div>

        {showSplitLayout && (
          <div style={{
            flex: 1,
            height: '100%',
            padding: '32px 24px 32px 0',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <Playground initialCode={`# Practice for: ${selectedCourse.title}\n# Write your code here\n\n`} />
          </div>
        )}
      </div>
    );
  }

  const showSplitLayout = isPlaygroundOpen && !isMobile && !isTabletOrSmallDesktop;
  const showVerticalSplit = isPlaygroundOpen && (isMobile || isTabletOrSmallDesktop);

  return (
    <div style={{
      display: 'flex',
      flexDirection: showVerticalSplit ? 'column' : 'row',
      height: showSplitLayout ? '100vh' : 'auto',
      overflow: showSplitLayout ? 'hidden' : 'visible',
      width: '100%',
      background: T.bg
    }}>
      <div style={{
        width: showSplitLayout ? '55%' : '100%',
        flex: showSplitLayout ? 'none' : 1,
        height: showSplitLayout ? '100%' : 'auto',
        overflowY: showSplitLayout ? 'auto' : 'visible',
        padding: isMobile ? '20px 16px' : '32px 36px',
        display: 'flex',
        flexDirection: 'column'
      }} className="no-scrollbar">
        {/* Directory Title */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ color: T.text, fontSize: isMobile ? 22 : 28, fontWeight: 700, margin: 0, letterSpacing: '-0.04em' }}>
              Explore Courses
            </h1>
            <p style={{ color: T.muted, marginTop: 6, fontSize: isMobile ? 14 : 15 }}>
              Study structured paths curated by instructors, powered by AI TUTOR.
            </p>
          </div>  

          <button
            onClick={() => setIsPlaygroundOpen(!isPlaygroundOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: isPlaygroundOpen ? `${T.accent}15` : 'transparent',
              border: `1px solid ${isPlaygroundOpen ? T.accent : 'var(--border)'}`,
              color: isPlaygroundOpen ? T.accent : 'var(--text)',
              cursor: 'pointer',
              fontSize: 12.5,
              fontWeight: 600,
              padding: '6px 14px',
              borderRadius: 8,
              transition: 'all 0.15s'
            }}
          >
            <Terminal size={14} />
            {isPlaygroundOpen ? 'Close Playground' : 'Practice Playground'}
          </button>
        </div>

        {/* Category Filter Pills */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 12, marginBottom: 20 }} className="no-scrollbar">
          {['All', 'Programming', 'Web Development', 'Design', 'Business', 'Personal Development'].map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                background: selectedCategory === cat ? T.accent : T.s2,
                color: selectedCategory === cat ? '#fff' : T.text,
                border: 'none',
                padding: '6px 14px',
                borderRadius: 20,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s'
              }}
            >
              {cat}
            </button>
          ))}
        </div>

      {courses.filter(c => {
          // Filter locally deleted
          let locallyDeleted = [];
          try { locallyDeleted = JSON.parse(localStorage.getItem('locally_deleted_courses') || '[]'); } catch(e) {}
          if (locallyDeleted.includes(c.id)) return false;
          return selectedCategory === 'All' || c.category === selectedCategory;
        }).length === 0 ? (
        <div style={{ background: T.s1, border: `1px solid ${T.border}`, borderRadius: 16, padding: '48px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎓</div>
          <h3 style={{ color: T.text, fontSize: 16, fontWeight: 600, margin: '0 0 6px 0' }}>No published courses</h3>
          <p style={{ color: T.muted, fontSize: 13, maxWidth: 320, margin: '0 auto' }}>
            There are no published courses under this category. Go to the Admin dashboard to create and publish a course.
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 20
        }}>
          {courses.filter(c => {
            let locallyDeleted = [];
            try { locallyDeleted = JSON.parse(localStorage.getItem('locally_deleted_courses') || '[]'); } catch(e) {}
            if (locallyDeleted.includes(c.id)) return false;
            return selectedCategory === 'All' || c.category === selectedCategory;
          }).map(course => {
            const totalLessons = course.lessonsCount || 0;
            const isStudentEnrolled = enrolledCourseIds.includes(course.id);
            
            // Duration and Level Estimates
            const totalMins = totalLessons * 10;
            const hours = Math.floor(totalMins / 60);
            const mins = totalMins % 60;
            const durationStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
            
            const level = course.title.toLowerCase().includes('advanced') || course.title.toLowerCase().includes('expert') ? 'Advanced' : (course.title.toLowerCase().includes('intermediate') ? 'Intermediate' : 'Beginner');

            return (
              <div
                key={course.id}
                onClick={() => handleSelectCourse(course)}
                style={{
                  background: T.s1,
                  border: `1px solid ${T.border}`,
                  borderRadius: 14,
                  padding: 20,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: 220,
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.2s ease'
                }}
                className="course-card"
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = T.accent;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(91, 140, 248, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = T.border;
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* Accent ambient lighting */}
                <div style={{
                  position: 'absolute', top: -50, right: -50, width: 100, height: 100,
                  borderRadius: '50%', background: 'rgba(91, 140, 248, 0.05)', filter: 'blur(30px)', pointerEvents: 'none'
                }} />

                <div>
                  {/* Category and Instructor */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: 11, color: T.accent, background: `${T.accent}14`, padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>
                      {course.category}
                    </span>
                    <span style={{ fontSize: 11, color: T.muted }}>
                      By {course.instructor}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 style={{ color: T.text, fontSize: 15.5, fontWeight: 700, margin: '0 0 6px 0', lineHeight: 1.4 }}>
                    {course.title}
                  </h3>

                  {/* Tagline */}
                  <p style={{ color: T.muted, fontSize: 12.5, lineHeight: 1.5, margin: '0 0 16px 0' }}>
                    {course.tagline || ""}
                  </p>
                  
                  {/* Level tag and Duration */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10, color: T.purple, background: `${T.purple}12`, padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>
                      {level}
                    </span>
                    <span style={{ fontSize: 10, color: T.muted }}>
                      ⏱️ {durationStr} total
                    </span>
                  </div>
                </div>

                {/* Footer Details */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: `1px solid ${T.border}`, fontSize: 12, color: T.muted }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <BookOpen size={13} />
                    <span>{totalLessons} lessons</span>
                  </div>
                  
                  {isStudentEnrolled ? (
                    <span style={{ fontSize: 11, color: T.green, background: `${T.green}18`, padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
                      ✓ Enrolled
                    </span>
                  ) : (
                    <button
                      onClick={(e) => handleEnrollFromCard(course.id, e)}
                      style={{
                        background: T.accent,
                        color: '#f7f3f3ff',
                        border: 'none',
                        padding: '4px 12px',
                        borderRadius: 6,
                        fontSize: 11.5,
                        fontWeight: 700,
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(91, 140, 248, 0.2)',
                        transition: 'opacity 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.opacity = 0.9}
                      onMouseLeave={e => e.currentTarget.style.opacity = 1}
                    >
                      Enroll
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
        {isPlaygroundOpen && isMobile && (
          <div style={{ marginTop: 24, height: 400, flexShrink: 0 }}>
            <Playground initialCode={`# General Coding Playground\n# Write your code here\n\n`} />
          </div>
        )}
        {isPlaygroundOpen && !isMobile && isTabletOrSmallDesktop && (
          <div style={{ marginTop: 32, height: 500, flexShrink: 0 }}>
            <Playground initialCode={`# General Coding Playground\n# Write your code here\n\n`} />
          </div>
        )}
      </div>

      {showSplitLayout && (
        <div style={{
          flex: 1,
          height: '100%',
          padding: '32px 24px 32px 0',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <Playground initialCode={`# General Coding Playground\n# Write your code here\n\n`} />
        </div>
      )}

      {/* Course Completion Certificate Modal */}
      {isCertModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(7, 8, 15, 0.85)', backdropFilter: 'blur(8px)',
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
        }}>
          <div style={{
            background: '#faf7f7ff', border: '15px double #7C3AED',
            borderRadius: 8, width: '100%', maxWidth: 700, padding: '40px 48px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)', position: 'relative',
            color: '#0F1D30', fontFamily: 'serif', textAlign: 'center'
          }}>
            {/* Close Button */}
            <button
              onClick={() => setIsCertModalOpen(false)}
              style={{
                position: 'absolute', top: 16, right: 16, background: 'transparent',
                border: 'none', cursor: 'pointer', color: '#647298'
              }}
            >
              <X size={20} />
            </button>

            {/* Certificate Content */}
            <div style={{ border: '2px solid #7C3AED', padding: '30px 20px' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#7C3AED', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 16 }}>
                Certificate of Completion
              </div>
              <div style={{ fontSize: 12, fontStyle: 'italic', color: '#4B5E7D', marginBottom: 24 }}>
                This is proudly presented to
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#0F1D30', borderBottom: '2px solid #E1EBF5', display: 'inline-block', paddingBottom: 6, marginBottom: 18, minWidth: 260 }}>
                {userEmail ? (userEmail.split('@')[0].replace(/\d+/g, '').replace(/[\._]/g, ' ').toUpperCase()) : 'AARAV MEHTA'}
              </div>
              <div style={{ fontSize: 13, color: '#4B5E7D', lineHeight: 1.6, maxWidth: 500, margin: '0 auto 28px' }}>
                for successfully fulfilling all requirements and completing the certified curriculum for the course
                <div style={{ fontSize: 16, fontWeight: 700, color: '#0F1D30', marginTop: 8, fontFamily: 'var(--font-outfit), sans-serif' }}>
                  {selectedCourse?.title}
                </div>
              </div>

              {/* Signatures & Date */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 20, padding: '0 30px' }}>
                <div style={{ textAlign: 'center', width: 140 }}>
                  <div style={{ fontSize: 12, fontFamily: 'monospace', fontStyle: 'italic', color: '#7C3AED', marginBottom: 4 }}>AI Tutor Academy</div>
                  <div style={{ borderTop: '1px solid #C4CFE5', paddingTop: 4, fontSize: 10, color: '#8CA2C0', textTransform: 'uppercase' }}>Authorized Entity</div>
                </div>
                <div style={{ fontSize: 11, color: '#8CA2C0' }}>
                  Issued on: {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
                <div style={{ textAlign: 'center', width: 140 }}>
                  <div style={{ fontSize: 14, fontFamily: 'cursive', color: '#2563EB', marginBottom: 4 }}>Seshu Yashu</div>
                  <div style={{ borderTop: '1px solid #C4CFE5', paddingTop: 4, fontSize: 10, color: '#8CA2C0', textTransform: 'uppercase' }}>Lead Instructor</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PDF Viewer Modal */}
      <PDFViewerModal
        isOpen={isPdfViewerOpen}
        onClose={() => { setIsPdfViewerOpen(false); setSelectedPdfResource(null); }}
        pdfResource={selectedPdfResource}
      />

    </div>
  );
}
