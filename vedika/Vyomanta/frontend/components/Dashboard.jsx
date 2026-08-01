'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen, Brain, CheckCircle, ChevronRight, GraduationCap, Flame,
  Sparkles, CheckSquare, HelpCircle, ArrowRight, Award, Trophy, Clock
} from 'lucide-react';
import { T, getCourseDetails } from '@/lib/lms-data';
import { getCourses, getStudentEnrollments, getCourseSyllabus, saveProgressToRedis, getProgressFromRedis } from '@/lib/frappe';
import { useMediaQuery, isMobileMQ, isTabletMQ } from '@/lib/useMediaQuery';

export default function Dashboard() {
  const router = useRouter();
  const [courses, setCourses] = useState([]);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [completed, setCompleted] = useState({});
  const [loading, setLoading] = useState(true);
  const isMobile = useMediaQuery(isMobileMQ);
  const isTablet = useMediaQuery(isTabletMQ);
  
  const rPad = isMobile ? 16 : 36;
  const statCols = isMobile ? '1fr' : 'repeat(2,1fr)';
  const mainGridCols = isMobile ? '1fr' : '2fr 1fr';
  const bottomCols = isMobile ? '1fr' : '1fr 1fr';

  // Interactive state variables
  const [greeting, setGreeting] = useState('Welcome back');
  const [userName, setUserName] = useState('Student');
  const [streak, setStreak] = useState(3);
  const [quickPrompt, setQuickPrompt] = useState('');
  const [conceptFlipped, setConceptFlipped] = useState(false);
  
  // Daily Skill Check state
  const [selectedQuizOption, setSelectedQuizOption] = useState(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  // Daily Tasks state
  const [tasks, setTasks] = useState([
    { id: 'resume', label: 'Resume active syllabus', completed: false },
    { id: 'tutor', label: 'Ask a question in AI Tutor', completed: false },
    { id: 'daily_concept', label: 'Review Daily Concept Card', completed: false },
    { id: 'skill_check', label: 'Complete Daily Skill Check', completed: false }
  ]);

  useEffect(() => {
    // Dynamic greeting based on time of day
    const hours = new Date().getHours();
    if (hours < 12) setGreeting('Good morning');
    else if (hours < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');

    if (typeof window !== 'undefined') {
      // Load user profile
      const stored = localStorage.getItem('frappe_user');
      if (stored) {
        try {
          const user = JSON.parse(stored);
          if (user && user.name) {
            setUserName(user.name);
          }
        } catch (e) {}
      }

      // Load daily tasks
      const savedTasks = localStorage.getItem('dashboard_daily_tasks');
      if (savedTasks) {
        try {
          setTasks(JSON.parse(savedTasks));
        } catch (e) {}
      }

      // Load streak
      const savedStreak = localStorage.getItem('dashboard_learning_streak');
      if (savedStreak) {
        setStreak(parseInt(savedStreak));
      } else {
        localStorage.setItem('dashboard_learning_streak', '3');
      }

      // Load Quiz selection
      const savedQuizOption = localStorage.getItem('dashboard_daily_quiz_opt');
      if (savedQuizOption !== null) {
        setSelectedQuizOption(parseInt(savedQuizOption));
        setQuizSubmitted(true);
      }
    }
  }, []);

  // Fetch courses and progress on mount
  useEffect(() => {
    async function loadDashboardData() {
      try {
        let email = '';
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('frappe_user');
          if (stored) {
            try {
              const user = JSON.parse(stored);
              if (user && user.email) {
                email = user.email;
              }
            } catch (e) {}
          }
        }

        const [list, enrollments] = await Promise.all([
          getCourses(),
          email ? getStudentEnrollments(email) : Promise.resolve([])
        ]);
        const published = list.filter(c => c.status === 'Published');
        setCourses(published);

        const enrolled = published.filter(c => enrollments.includes(c.id));
        
        // Fetch syllabus/details for all enrolled courses in parallel
        const enrolledWithDetails = await Promise.all(
          enrolled.map(async (course) => {
            try {
              const details = await getCourseSyllabus(course.id);
              return { ...course, details };
            } catch (err) {
              console.error("Failed to fetch syllabus for course:", course.id, err);
              const details = getCourseDetails(course);
              return { ...course, details };
            }
          })
        );
        setEnrolledCourses(enrolledWithDetails);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();

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

  // Compute stats dynamically for enrolled courses
  let totalLessons = 0;
  let totalModules = 0;
  let completedCount = 0;

  const enrolledWithProgress = enrolledCourses.map(course => {
    const details = course.details || getCourseDetails(course);
    let courseLessonsCount = 0;
    let courseCompletedCount = 0;
    let courseModulesCount = 0;

    if (details && details.modules) {
      courseModulesCount = details.modules.length;
      details.modules.forEach(m => {
        if (m.lessons) {
          courseLessonsCount += m.lessons.length;
          m.lessons.forEach(l => {
            if (completed[l.id]) {
              courseCompletedCount++;
            }
          });
        }
      });
    }

    const pct = courseLessonsCount > 0 ? Math.round((courseCompletedCount / courseLessonsCount) * 100) : 0;

    totalLessons += courseLessonsCount;
    totalModules += courseModulesCount;
    completedCount += courseCompletedCount;

    return {
      ...course,
      modulesCount: courseModulesCount,
      lessonsCount: courseLessonsCount,
      completedCount: courseCompletedCount,
      progressPercent: pct
    };
  });

  // Next up uncompleted lesson logic
  const activeCourse = enrolledWithProgress[0];
  let nextLesson = null;
  if (activeCourse && activeCourse.details && activeCourse.details.modules) {
    for (const mod of activeCourse.details.modules) {
      for (const les of mod.lessons) {
        if (!completed[les.id]) {
          nextLesson = les;
          break;
        }
      }
      if (nextLesson) break;
    }
  }

  const overallProgressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  const stats = [
    { label: 'Lessons Completed', val: `${completedCount}/${totalLessons}`, sub: `${overallProgressPercent}% done`, color: 'var(--accent)', Icon: CheckCircle },
    { label: 'Enrolled Courses', val: `${enrolledCourses.length}`, sub: 'Active cohort learning', color: 'var(--green)', Icon: BookOpen },
  ];

  // Checklist Actions
  const toggleTask = (taskId) => {
    const updated = tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t);
    setTasks(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('dashboard_daily_tasks', JSON.stringify(updated));
    }
  };

  // Quick Ask Action
  const handleQuickAskSubmit = (e) => {
    e.preventDefault();
    const query = quickPrompt.trim();
    if (!query) return;
    if (typeof window !== 'undefined') {
      localStorage.setItem('tutor_prefill_query', query);
      
      const updated = tasks.map(t => t.id === 'tutor' ? { ...t, completed: true } : t);
      setTasks(updated);
      localStorage.setItem('dashboard_daily_tasks', JSON.stringify(updated));
    }
    router.push('/general-tutor');
  };

  // Daily Quiz Action
  const handleSelectQuizOption = (optIdx) => {
    if (quizSubmitted) return;
    setSelectedQuizOption(optIdx);
    setQuizSubmitted(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('dashboard_daily_quiz_opt', String(optIdx));
      
      const updated = tasks.map(t => t.id === 'skill_check' ? { ...t, completed: true } : t);
      setTasks(updated);
      localStorage.setItem('dashboard_daily_tasks', JSON.stringify(updated));
    }
  };

  // Concept Card Flip
  const handleFlipConcept = () => {
    setConceptFlipped(!conceptFlipped);
    const updated = tasks.map(t => t.id === 'daily_concept' ? { ...t, completed: true } : t);
    setTasks(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('dashboard_daily_tasks', JSON.stringify(updated));
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)', alignItems: 'center', justifyContent: 'center', color: 'var(--text)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
          <div style={{ fontSize: 14, color: 'var(--muted)' }}>Loading student workspace...</div>
        </div>
      </div>
    );
  }

  // Quiz values
  const quizAnswers = [
    "int x = 10",
    "x = 10",
    "declare x = 10",
    "const x = 10"
  ];
  const correctAnswerIdx = 1;

  return (
    <div style={{ padding: `32px ${rPad}px`, fontFamily: 'var(--font-outfit), sans-serif' }}>
      
      {/* Dynamic Header & Greeting */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ color: 'var(--text)', fontSize: isMobile ? 22 : 30, fontWeight: 800, margin: 0, letterSpacing: '-0.04em', display: 'flex', alignItems: 'center', gap: 10 }}>
            {greeting}, {userName.split(' ')[0]}! 👋
          </h1>
          <p style={{ color: 'var(--muted)', marginTop: 6, fontSize: isMobile ? 13.5 : 14.5 }}>
            Ready to explore Python concepts and sandboxes today?
          </p>
        </div>

        {/* Dynamic Streak Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'linear-gradient(135deg, #FF8008 0%, #FFC837 100%)',
          color: '#000',
          padding: '8px 16px',
          borderRadius: 20,
          fontWeight: 700,
          fontSize: 13,
          boxShadow: '0 6px 16px rgba(255, 128, 8, 0.25)',
          cursor: 'pointer',
          transition: 'transform 0.2s'
        }}
        onClick={() => {
          const nextStreak = streak + 1;
          setStreak(nextStreak);
          localStorage.setItem('dashboard_learning_streak', String(nextStreak));
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'none'}
        title="Click to increase streak!"
        >
          <Flame size={16} fill="#000" />
          <span>{streak}-Day Streak</span>
        </div>
      </div>

      {/* Interactive Quick-Ask AI Prompt Box */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(91, 140, 248, 0.08) 0%, rgba(155, 110, 248, 0.08) 100%)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: '20px 24px',
        marginBottom: 28,
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
      }}>
        <form onSubmit={handleQuickAskSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, color: 'var(--accent)', fontWeight: 600 }}>
            <Sparkles size={15} /> Ask your AI Tutor anything...
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              type="text"
              placeholder="e.g. What is a lambda function? or Give me a quiz on lists."
              value={quickPrompt}
              onChange={e => setQuickPrompt(e.target.value)}
              style={{
                flex: 1,
                background: 'var(--s1)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '12px 16px',
                color: 'var(--text)',
                fontSize: 13.5,
                outline: 'none',
                fontFamily: 'inherit',
                transition: 'border-color 0.2s'
              }}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
            <button
              type="submit"
              style={{
                background: 'linear-gradient(135deg, var(--accent) 0%, var(--purple) 100%)',
                color: '#fff',
                border: 'none',
                padding: '0 24px',
                borderRadius: 10,
                fontSize: 13.5,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 4px 12px rgba(91, 140, 248, 0.25)',
                transition: 'opacity 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = 0.9}
              onMouseLeave={e => e.currentTarget.style.opacity = 1}
            >
              Ask AI
            </button>
          </div>
        </form>
      </div>

      {/* Main Grid Content Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: mainGridCols, gap: 24, alignItems: 'start' }}>
        
        {/* Left Side (Learning Progress & Courses) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Stat Cards Row */}
          <div style={{ display: 'grid', gridTemplateColumns: statCols, gap: 14 }}>
            {stats.map(({ label, val, sub, color, Icon }) => (
              <div
                key={label}
                style={{
                  background: 'var(--s1)',
                  border: '1px solid var(--border)',
                  borderRadius: 14,
                  padding: '20px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.borderColor = color;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.borderColor = 'var(--border)';
                }}
                onClick={() => {
                  if (label === 'Lessons Completed') {
                    router.push('/progress');
                  } else {
                    router.push('/courses');
                  }
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>{label}</span>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={14} color={color} />
                  </div>
                </div>
                <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.04em' }}>{val}</div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4 }}>{sub}</div>
              </div>
            ))}
          </div>

          {/* Active / Continue learning syllabus */}
          <div style={{
            background: 'var(--s1)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            padding: '24px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: 180
          }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <GraduationCap size={14} /> Active Syllabus
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
                {activeCourse?.title || 'No Courses Enrolled'}
              </div>
              <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 16px 0', lineHeight: 1.5 }}>
                {activeCourse ? (
                  nextLesson ? (
                    <>📖 Next Lesson: <span style={{ fontWeight: 600, color: 'var(--text)' }}>{nextLesson.title}</span> ({nextLesson.dur})</>
                  ) : (
                    '🎉 You completed all lessons in this syllabus! Perfect!'
                  )
                ) : (
                  'Go to Explore Courses to enroll and begin your coding journey!'
                )}
              </p>
            </div>

            <div>
              {activeCourse && (
                <>
                  <div style={{ background: 'var(--s3)', borderRadius: 99, height: 6, marginBottom: 12, overflow: 'hidden' }}>
                    <div style={{ background: 'var(--accent)', height: '100%', borderRadius: 99, width: `${activeCourse.progressPercent}%`, transition: 'width 0.5s' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 500 }}>{activeCourse.progressPercent}% complete</span>
                    <button
                      onClick={() => {
                        if (typeof window !== 'undefined') {
                          localStorage.setItem('selected_course_id', activeCourse.id);
                        }
                        // Check daily task
                        const updated = tasks.map(t => t.id === 'resume' ? { ...t, completed: true } : t);
                        setTasks(updated);
                        localStorage.setItem('dashboard_daily_tasks', JSON.stringify(updated));
                        
                        if (nextLesson) {
                          router.push(`/lesson/${nextLesson.id}`);
                        } else {
                          router.push('/courses');
                        }
                      }}
                      style={{
                        background: 'var(--accent)',
                        color: '#000',
                        border: 'none',
                        padding: '9px 18px',
                        borderRadius: 8,
                        fontSize: 12.5,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        boxShadow: '0 4px 10px rgba(91, 140, 248, 0.2)'
                      }}
                    >
                      {nextLesson ? 'Resume Learning' : 'View Course'} <ChevronRight size={14} />
                    </button>
                  </div>
                </>
              )}
              {!activeCourse && (
                <button
                  onClick={() => router.push('/courses')}
                  style={{
                    background: 'var(--accent)',
                    color: '#faf5f5ff',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    boxShadow: '0 4px 10px rgba(91, 140, 248, 0.2)'
                  }}
                >
                  Explore Courses <ChevronRight size={14} />
                </button>
              )}
            </div>
          </div>

          {/* AI Tools Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: bottomCols, gap: 16 }}>
            
            {/* General Tutor Shortcut */}
            <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 160 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--purple)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <Brain size={14} /> AI Assistant Hub
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>Ask your AI Tutor</div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 12 }}>
                  Ask questions, generate flashcards, and study customized visual outlines.
                </div>
              </div>
              <button
                onClick={() => router.push('/general-tutor')}
                style={{
                  alignSelf: 'start',
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  color: 'var(--purple)',
                  padding: '6px 14px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  transition: 'background 0.2s'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(155, 110, 248, 0.08)';
                  e.currentTarget.style.borderColor = 'var(--purple)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = 'var(--border)';
                }}
              >
                Open Tutor Hub <ArrowRight size={13} />
              </button>
            </div>

            {/* Coding Tutor Shortcut */}
            <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 160 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--green)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <Flame size={14} /> Practice Sandbox
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>Code with AI Tutor</div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 12 }}>
                  Write, test, and debug Python code samples directly with an AI helper.
                </div>
              </div>
              <button
                onClick={() => router.push('/coding-tutor')}
                style={{
                  alignSelf: 'start',
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  color: 'var(--green)',
                  padding: '6px 14px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  transition: 'background 0.2s'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(34, 197, 160, 0.08)';
                  e.currentTarget.style.borderColor = 'var(--green)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = 'var(--border)';
                }}
              >
                Start Sandbox <ArrowRight size={13} />
              </button>
            </div>

          </div>

          {/* Other Enrolled Courses List */}
          {enrolledWithProgress.length > 1 && (
            <div style={{ marginTop: 8 }}>
              <h2 style={{ color: 'var(--text)', fontSize: 16, fontWeight: 700, marginBottom: 14, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 6 }}>
                <BookOpen size={16} color="var(--accent)" /> Other Enrolled Courses
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: bottomCols, gap: 16 }}>
                {enrolledWithProgress.slice(1).map(course => (
                  <div key={course.id} style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 140 }}>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600, marginBottom: 4 }}>
                        {course.category}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
                        {course.title}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>
                        {course.modulesCount} modules · {course.lessonsCount} lessons
                      </div>
                    </div>

                    <div>
                      <div style={{ background: 'var(--s3)', borderRadius: 99, height: 6, marginBottom: 8, overflow: 'hidden' }}>
                        <div style={{ background: 'var(--accent)', height: 6, borderRadius: 99, width: `${course.progressPercent}%`, transition: 'width 0.5s' }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                        <span style={{ fontSize: 12, color: 'var(--muted)' }}>{course.progressPercent}% complete</span>
                        <button 
                          onClick={() => {
                            if (typeof window !== 'undefined') {
                              localStorage.setItem('selected_course_id', course.id);
                            }
                            router.push('/courses');
                          }}
                          style={{
                            background: 'transparent',
                            border: '1px solid var(--border)',
                            color: 'var(--text)',
                            padding: '5px 12px',
                            borderRadius: 6,
                            fontSize: 11.5,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                        >
                          Continue <ChevronRight size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Right Side (Daily Checklist, Interactive Quiz, Concept Card) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Interactive Checklist */}
          <div style={{
            background: 'var(--s1)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            padding: '20px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
          }}>
            <h3 style={{ margin: '0 0 14px 0', fontSize: 14.5, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckSquare size={16} color="var(--accent)" /> Today's Task Checklist
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {tasks.map(task => (
                <div
                  key={task.id}
                  onClick={() => toggleTask(task.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: task.completed ? 'rgba(34, 197, 160, 0.05)' : 'var(--s2)',
                    border: `1px solid ${task.completed ? 'rgba(34, 197, 160, 0.2)' : 'var(--border)'}`,
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => {
                    if (!task.completed) e.currentTarget.style.borderColor = 'var(--accent)';
                  }}
                  onMouseLeave={e => {
                    if (!task.completed) e.currentTarget.style.borderColor = 'var(--border)';
                  }}
                >
                  <div style={{
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    border: `2px solid ${task.completed ? 'var(--green)' : 'var(--muted)'}`,
                    background: task.completed ? 'var(--green)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#000',
                    fontSize: 11,
                    fontWeight: 900,
                    transition: 'all 0.15s'
                  }}>
                    {task.completed && '✓'}
                  </div>
                  <span style={{
                    fontSize: 13,
                    color: task.completed ? 'var(--muted)' : 'var(--text)',
                    textDecoration: task.completed ? 'line-through' : 'none',
                    fontWeight: 500
                  }}>
                    {task.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Skill Check Quiz */}
          <div style={{
            background: 'var(--s1)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            padding: '20px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
          }}>
            <h3 style={{ margin: '0 0 4px 0', fontSize: 14.5, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <HelpCircle size={16} color="var(--purple)" /> Daily Skill Check
            </h3>
            <span style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 12 }}>Answer to check your Python foundation</span>
            
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 12, lineHeight: 1.5 }}>
              How does Python handle memory management for variables?
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {quizAnswers.map((answer, index) => {
                const isSelected = selectedQuizOption === index;
                const isCorrectOption = index === correctAnswerIdx;
                let optBg = 'var(--s2)';
                let optBorder = 'var(--border)';
                let optColor = 'var(--text)';

                if (quizSubmitted) {
                  if (isCorrectOption) {
                    optBg = 'rgba(34, 197, 160, 0.12)';
                    optBorder = 'var(--green)';
                    optColor = 'var(--green)';
                  } else if (isSelected) {
                    optBg = 'rgba(245, 91, 107, 0.12)';
                    optBorder = 'var(--red)';
                    optColor = 'var(--red)';
                  }
                } else {
                  if (isSelected) {
                    optBg = 'rgba(91, 140, 248, 0.1)';
                    optBorder = 'var(--accent)';
                  }
                }

                return (
                  <button
                    key={index}
                    onClick={() => handleSelectQuizOption(index)}
                    disabled={quizSubmitted}
                    style={{
                      background: optBg,
                      border: `1px solid ${optBorder}`,
                      borderRadius: 10,
                      padding: '10px 12px',
                      color: optColor,
                      fontSize: 12.5,
                      fontWeight: 500,
                      textAlign: 'left',
                      cursor: quizSubmitted ? 'default' : 'pointer',
                      transition: 'all 0.15s',
                      outline: 'none',
                      fontFamily: 'inherit'
                    }}
                    onMouseEnter={e => {
                      if (!quizSubmitted) {
                        e.currentTarget.style.borderColor = 'var(--purple)';
                        e.currentTarget.style.background = 'var(--s3)';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!quizSubmitted) {
                        e.currentTarget.style.borderColor = optBorder;
                        e.currentTarget.style.background = optBg;
                      }
                    }}
                  >
                    <span style={{ fontWeight: 700, marginRight: 6 }}>{'ABCD'[index]})</span>
                    {answer}
                  </button>
                );
              })}
            </div>

            {quizSubmitted && (
              <div style={{
                marginTop: 14,
                padding: '12px',
                borderRadius: 8,
                background: selectedQuizOption === correctAnswerIdx ? 'rgba(34, 197, 160, 0.08)' : 'rgba(245, 91, 107, 0.08)',
                fontSize: 12,
                color: selectedQuizOption === correctAnswerIdx ? 'var(--green)' : 'var(--red)',
                lineHeight: 1.4
              }}>
                {selectedQuizOption === correctAnswerIdx ? (
                  <strong>✓ Correct!</strong>
                ) : (
                  <strong>✗ Incorrect.</strong>
                )}{' '}
                Python is dynamically typed; it uses Automatic Reference Counting (ARC) along with a cyclical garbage collector to manage allocations automatically when variables are assigned using `=`.
              </div>
            )}
          </div>

          {/* Concept of the Day Flashcard */}
          <div style={{
            background: 'var(--s1)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            padding: '20px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
          }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: 14.5, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Award size={16} color="var(--amber)" /> Concept of the Day
            </h3>

            <div
              onClick={handleFlipConcept}
              style={{
                cursor: 'pointer',
                perspective: '1000px'
              }}
            >
              <div style={{
                background: conceptFlipped ? 'rgba(245, 169, 91, 0.08)' : 'var(--s2)',
                border: `1px solid ${conceptFlipped ? 'var(--amber)' : 'var(--border)'}`,
                borderRadius: 12,
                padding: '24px 16px',
                minHeight: 130,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                transition: 'all 0.3s ease',
                transformStyle: 'preserve-3d'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--amber)';
              }}
              onMouseLeave={e => {
                if (!conceptFlipped) e.currentTarget.style.borderColor = 'var(--border)';
              }}
              >
                <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                  {conceptFlipped ? 'Definition' : 'Concept \u2014 click to reveal'}
                </span>
                
                <h4 style={{ color: 'var(--text)', fontSize: conceptFlipped ? 13 : 15, fontWeight: conceptFlipped ? 500 : 700, margin: 0, lineHeight: 1.5 }}>
                  {conceptFlipped ? (
                    "A decorator is a function that wraps another function to dynamically extend or modify its behavior without modifying the actual function's source code explicitly. Annotated using the @decorator syntax."
                  ) : (
                    "💡 Decorator Functions (@)"
                  )}
                </h4>
                
                <span style={{ fontSize: 10, color: 'var(--amber)', fontWeight: 600, marginTop: 12 }}>
                  {conceptFlipped ? 'Click to flip back' : 'Click to flip'}
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
