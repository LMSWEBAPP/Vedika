'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen, Brain, CheckCircle, ChevronRight, GraduationCap, Flame,
  CheckSquare, HelpCircle, ArrowRight, Award, Trophy, Clock
} from 'lucide-react';
import { T, getCourseDetails } from '@/lib/lms-data';
import { getCourses, getStudentEnrollments, getCourseSyllabus, saveProgressToRedis, getProgressFromRedis } from '@/lib/frappe';
import { useMediaQuery, isMobileMQ, isTabletMQ } from '@/lib/useMediaQuery';
import VedikaHeroZajno from '@/components/VedikaHeroZajno';

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

  // Scroll parallax state
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

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
      const storedUser = localStorage.getItem('frappe_user');
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);
          if (user && user.email) {
            key = `completed_lessons_${user.email}`;
            email = user.email;
          }
        } catch (e) {}
      }

      // Check localStorage first
      const storedProgress = localStorage.getItem(key);
      if (storedProgress) {
        try { setCompleted(JSON.parse(storedProgress)); } catch (e) {}
      }

      // Sync with Redis if email present
      if (email) {
        getProgressFromRedis(email).then(redisCompleted => {
          if (redisCompleted && Object.keys(redisCompleted).length > 0) {
            setCompleted(redisCompleted);
            localStorage.setItem(key, JSON.stringify(redisCompleted));
          }
        }).catch(err => console.error("Error loading progress from Redis:", err));
      }
    }
  }, []);

  const totalLessonsCompleted = Object.keys(completed).length;

  const enrolledWithProgress = enrolledCourses.map(c => {
    const details = c.details || getCourseDetails(c);
    const allLessonIds = (details.chapters || []).flatMap(ch => (ch.lessons || []).map(l => l.id));
    const total = allLessonIds.length || 1;
    const done = allLessonIds.filter(id => completed[id]).length;
    const progressPercent = Math.round((done / total) * 100);
    return {
      ...c,
      modulesCount: (details.chapters || []).length,
      lessonsCount: total,
      progressPercent,
      chapters: details.chapters || []
    };
  });

  const activeCourse = enrolledWithProgress[0] || null;
  
  // Find next uncompleted lesson in active course
  let nextLesson = null;
  if (activeCourse) {
    for (const chapter of activeCourse.chapters) {
      for (const lesson of chapter.lessons || []) {
        if (!completed[lesson.id]) {
          nextLesson = lesson;
          break;
        }
      }
      if (nextLesson) break;
    }
  }

  const handleQuickAskSubmit = (e) => {
    e.preventDefault();
    if (!quickPrompt.trim()) return;
    
    // Check daily task
    const updated = tasks.map(t => t.id === 'tutor' ? { ...t, completed: true } : t);
    setTasks(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('dashboard_daily_tasks', JSON.stringify(updated));
      localStorage.setItem('dashboard_quick_ask_prompt', quickPrompt);
    }
    router.push('/general-tutor');
  };

  const toggleTask = (taskId) => {
    const updated = tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t);
    setTasks(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('dashboard_daily_tasks', JSON.stringify(updated));
    }
  };

  const handleSelectQuizOption = (index) => {
    if (quizSubmitted) return;
    setSelectedQuizOption(index);
    setQuizSubmitted(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('dashboard_daily_quiz_opt', String(index));
    }

    // Check daily task
    const updated = tasks.map(t => t.id === 'skill_check' ? { ...t, completed: true } : t);
    setTasks(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('dashboard_daily_tasks', JSON.stringify(updated));
    }
  };

  const handleFlipConcept = () => {
    setConceptFlipped(!conceptFlipped);
    if (!conceptFlipped) {
      const updated = tasks.map(t => t.id === 'daily_concept' ? { ...t, completed: true } : t);
      setTasks(updated);
      if (typeof window !== 'undefined') {
        localStorage.setItem('dashboard_daily_tasks', JSON.stringify(updated));
      }
    }
  };

  const stats = [
    { label: 'Lessons Completed', val: totalLessonsCompleted, sub: 'Topic milestones', color: '#38BDF8', Icon: CheckCircle },
    { label: 'Enrolled Courses',  val: enrolledCourses.length,  sub: 'Active learning tracks', color: '#A855F7', Icon: BookOpen },
  ];

  const quizAnswers = [
    "int x = 10",
    "x = 10",
    "declare x = 10",
    "const x = 10"
  ];
  const correctAnswerIdx = 1;

  // Extra Shiny Obsidian Glass Container Styles matching reference image
  const shinyCardStyle = {
    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.03) 35%, rgba(255, 255, 255, 0.005) 100%), rgba(12, 13, 20, 0.85)',
    border: '1px solid rgba(255, 255, 255, 0.16)',
    borderTop: '1px solid rgba(255, 255, 255, 0.35)',
    borderRadius: 18,
    boxShadow: '0 16px 40px rgba(0, 0, 0, 0.7), inset 0 1px 1px rgba(255, 255, 255, 0.3), inset 0 -1px 2px rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)'
  };

  const shinyPillButtonStyle = {
    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0.08) 50%, rgba(255, 255, 255, 0.02) 100%), #1B1D2C',
    border: '1px solid rgba(255, 255, 255, 0.28)',
    borderTop: '1px solid rgba(255, 255, 255, 0.45)',
    borderRadius: 9999,
    color: '#FFFFFF',
    boxShadow: '0 6px 18px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.4), inset 0 -1px 2px rgba(0, 0, 0, 0.6)',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  };

  return (
    <div style={{
      padding: '0 0 48px 0',
      minHeight: '100vh',
      background: 'radial-gradient(circle at 18% 12%, rgba(70, 90, 140, 0.45) 0%, rgba(5, 5, 8, 1) 45%), radial-gradient(circle at 82% 82%, rgba(90, 50, 130, 0.4) 0%, rgba(5, 5, 8, 1) 50%), #030305',
      color: '#FFFFFF',
      fontFamily: 'var(--font-outfit), sans-serif'
    }}>
      
      {/* Hero Section with Zajno Typography Reveal & Single 3D Avatar Landing */}
      <VedikaHeroZajno />

      {/* Main Dashboard Content Area */}
      <div style={{ padding: `0 ${rPad}px` }}>
      
      {/* Dynamic Header & Greeting */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 28 }}>
        <div>
          <h1 style={{ color: '#FFFFFF', fontSize: isMobile ? 24 : 32, fontWeight: 800, margin: 0, letterSpacing: '-0.04em', display: 'flex', alignItems: 'center', gap: 10 }}>
            {greeting}, {userName.split(' ')[0]}! 👋
          </h1>
          <p style={{ color: 'rgba(255, 255, 255, 0.65)', marginTop: 6, fontSize: isMobile ? 13.5 : 15 }}>
            Ready to explore Python concepts and sandboxes today?
          </p>
        </div>

        {/* Shiny Glass Streak Pill Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(255, 255, 255, 0.06)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          color: '#FFFFFF',
          padding: '8px 18px',
          borderRadius: 9999,
          fontWeight: 700,
          fontSize: 13,
          boxShadow: '0 6px 20px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
          backdropFilter: 'blur(12px)',
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}
        onClick={() => {
          const nextStreak = streak + 1;
          setStreak(nextStreak);
          localStorage.setItem('dashboard_learning_streak', String(nextStreak));
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'scale(1.04)';
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.35)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.18)';
        }}
        title="Click to increase streak!"
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#38BDF8', boxShadow: '0 0 8px #38BDF8' }} />
          <Flame size={16} color="#38BDF8" fill="#38BDF8" />
          <span>{streak}-Day Streak</span>
        </div>
      </div>

      {/* Interactive Quick-Ask AI Prompt Box */}
      <div style={{
        ...shinyCardStyle,
        padding: '22px 26px',
        marginBottom: 32
      }}>
        <form onSubmit={handleQuickAskSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#38BDF8', fontWeight: 700, letterSpacing: '-0.01em' }}>
            <Brain size={16} /> Ask your AI Tutor anything...
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <input
              type="text"
              placeholder="e.g. What is a lambda function? or Give me a quiz on lists."
              value={quickPrompt}
              onChange={e => setQuickPrompt(e.target.value)}
              style={{
                flex: 1,
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.14)',
                borderRadius: 12,
                padding: '12px 18px',
                color: '#FFFFFF',
                fontSize: 14,
                outline: 'none',
                fontFamily: 'inherit',
                transition: 'all 0.2s',
                boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.4)'
              }}
              onFocus={e => e.target.style.borderColor = '#38BDF8'}
              onBlur={e => e.target.style.borderColor = 'rgba(255, 255, 255, 0.14)'}
            />
            <button
              type="submit"
              style={{
                ...shinyPillButtonStyle,
                padding: '0 28px',
                fontSize: 13.5,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0.08) 100%), #222434';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.35)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.04) 100%), #181924';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
              }}
            >
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#FFFFFF' }} />
              Ask AI
            </button>
          </div>
        </form>
      </div>

      {/* Main Grid Content Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: mainGridCols, gap: 28, alignItems: 'start' }}>
        
        {/* Left Side (Learning Progress & Courses) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          
          {/* Stat Cards Row */}
          <div style={{ display: 'grid', gridTemplateColumns: statCols, gap: 16 }}>
            {stats.map(({ label, val, sub, color, Icon }) => (
              <div
                key={label}
                style={{
                  ...shinyCardStyle,
                  padding: '22px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                }}
                onClick={() => {
                  if (label === 'Lessons Completed') {
                    router.push('/progress');
                  } else {
                    router.push('/courses');
                  }
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 12.5, color: 'rgba(255, 255, 255, 0.65)', fontWeight: 600 }}>{label}</span>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={16} color={color} />
                  </div>
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.04em' }}>{val}</div>
                <div style={{ fontSize: 12.5, color: 'rgba(255, 255, 255, 0.55)', marginTop: 4 }}>{sub}</div>
              </div>
            ))}
          </div>

          {/* Active / Continue learning syllabus */}
          <div style={{
            ...shinyCardStyle,
            padding: '26px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: 200
          }}>
            <div>
              <div style={{ fontSize: 11.5, color: '#38BDF8', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                <GraduationCap size={15} /> Active Syllabus
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#FFFFFF', marginBottom: 8, letterSpacing: '-0.02em' }}>
                {activeCourse?.title || 'No Courses Enrolled'}
              </div>
              <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 14, margin: '0 0 18px 0', lineHeight: 1.55 }}>
                {activeCourse ? (
                  nextLesson ? (
                    <>📖 Next Lesson: <span style={{ fontWeight: 700, color: '#FFFFFF' }}>{nextLesson.title}</span> ({nextLesson.dur})</>
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
                  <div style={{ background: 'rgba(255, 255, 255, 0.08)', borderRadius: 99, height: 7, marginBottom: 14, overflow: 'hidden' }}>
                    <div style={{ background: 'linear-gradient(90deg, #38BDF8 0%, #818CF8 100%)', height: '100%', borderRadius: 99, width: `${activeCourse.progressPercent}%`, transition: 'width 0.5s' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.6)', fontWeight: 500 }}>{activeCourse.progressPercent}% complete</span>
                    <button
                      onClick={() => {
                        if (typeof window !== 'undefined') {
                          localStorage.setItem('selected_course_id', activeCourse.id);
                        }
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
                        ...shinyPillButtonStyle,
                        padding: '9px 20px',
                        fontSize: 13,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0.08) 100%), #222434';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.04) 100%), #181924';
                      }}
                    >
                      {nextLesson ? 'Resume Learning' : 'View Course'} <ChevronRight size={15} />
                    </button>
                  </div>
                </>
              )}
              {!activeCourse && (
                <button
                  onClick={() => router.push('/courses')}
                  style={{
                    ...shinyPillButtonStyle,
                    padding: '10px 22px',
                    fontSize: 13.5,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  Explore Courses <ChevronRight size={15} />
                </button>
              )}
            </div>
          </div>

          {/* AI Tools Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: bottomCols, gap: 18 }}>
            
            {/* General Tutor Shortcut */}
            <div style={{ ...shinyCardStyle, padding: '22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 170 }}>
              <div>
                <div style={{ fontSize: 11, color: '#A855F7', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  <Brain size={15} /> AI Assistant Hub
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#FFFFFF', marginBottom: 6 }}>Ask your AI Tutor</div>
                <div style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.65)', lineHeight: 1.5, marginBottom: 14 }}>
                  Ask questions, generate flashcards, and study customized visual outlines.
                </div>
              </div>
              <button
                onClick={() => router.push('/general-tutor')}
                style={{
                  ...shinyPillButtonStyle,
                  padding: '7px 16px',
                  fontSize: 12.5,
                  alignSelf: 'start',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                Open Tutor Hub <ArrowRight size={14} />
              </button>
            </div>

            {/* Coding Tutor Shortcut */}
            <div style={{ ...shinyCardStyle, padding: '22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 170 }}>
              <div>
                <div style={{ fontSize: 11, color: '#34D399', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  <Flame size={15} /> Practice Sandbox
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#FFFFFF', marginBottom: 6 }}>Code with AI Tutor</div>
                <div style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.65)', lineHeight: 1.5, marginBottom: 14 }}>
                  Write, test, and debug Python code samples directly with an AI helper.
                </div>
              </div>
              <button
                onClick={() => router.push('/coding-tutor')}
                style={{
                  ...shinyPillButtonStyle,
                  padding: '7px 16px',
                  fontSize: 12.5,
                  alignSelf: 'start',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                Start Sandbox <ArrowRight size={14} />
              </button>
            </div>

          </div>

          {/* Other Enrolled Courses List */}
          {enrolledWithProgress.length > 1 && (
            <div style={{ marginTop: 8 }}>
              <h2 style={{ color: '#FFFFFF', fontSize: 17, fontWeight: 800, marginBottom: 16, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 8 }}>
                <BookOpen size={18} color="#38BDF8" /> Other Enrolled Courses
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: bottomCols, gap: 18 }}>
                {enrolledWithProgress.slice(1).map(course => (
                  <div key={course.id} style={{ ...shinyCardStyle, padding: '22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 150 }}>
                    <div>
                      <div style={{ fontSize: 11.5, color: '#38BDF8', fontWeight: 700, marginBottom: 4 }}>
                        {course.category}
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#FFFFFF', marginBottom: 4 }}>
                        {course.title}
                      </div>
                      <div style={{ fontSize: 12.5, color: 'rgba(255, 255, 255, 0.6)', marginBottom: 14 }}>
                        {course.modulesCount} modules · {course.lessonsCount} lessons
                      </div>
                    </div>

                    <div>
                      <div style={{ background: 'rgba(255, 255, 255, 0.08)', borderRadius: 99, height: 6, marginBottom: 8, overflow: 'hidden' }}>
                        <div style={{ background: '#38BDF8', height: 6, borderRadius: 99, width: `${course.progressPercent}%`, transition: 'width 0.5s' }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                        <span style={{ fontSize: 12.5, color: 'rgba(255, 255, 255, 0.6)' }}>{course.progressPercent}% complete</span>
                        <button 
                          onClick={() => {
                            if (typeof window !== 'undefined') {
                              localStorage.setItem('selected_course_id', course.id);
                            }
                            router.push('/courses');
                          }}
                          style={{
                            ...shinyPillButtonStyle,
                            padding: '6px 14px',
                            fontSize: 12,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                        >
                          Continue <ChevronRight size={13} />
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          
          {/* Interactive Checklist */}
          <div style={{ ...shinyCardStyle, padding: '22px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 15, fontWeight: 800, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckSquare size={17} color="#38BDF8" /> Today's Task Checklist
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {tasks.map(task => (
                <div
                  key={task.id}
                  onClick={() => toggleTask(task.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 14px',
                    borderRadius: 12,
                    background: task.completed ? 'rgba(52, 211, 153, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                    border: `1px solid ${task.completed ? 'rgba(52, 211, 153, 0.25)' : 'rgba(255, 255, 255, 0.1)'}`,
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => {
                    if (!task.completed) e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
                  }}
                  onMouseLeave={e => {
                    if (!task.completed) e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                  }}
                >
                  <div style={{
                    width: 20,
                    height: 20,
                    borderRadius: 6,
                    border: `2px solid ${task.completed ? '#34D399' : 'rgba(255, 255, 255, 0.3)'}`,
                    background: task.completed ? '#34D399' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#000',
                    fontSize: 12,
                    fontWeight: 900,
                    transition: 'all 0.15s'
                  }}>
                    {task.completed && '✓'}
                  </div>
                  <span style={{
                    fontSize: 13.5,
                    color: task.completed ? 'rgba(255, 255, 255, 0.45)' : '#FFFFFF',
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
          <div style={{ ...shinyCardStyle, padding: '22px' }}>
            <h3 style={{ margin: '0 0 4px 0', fontSize: 15, fontWeight: 800, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: 8 }}>
              <HelpCircle size={17} color="#A855F7" /> Daily Skill Check
            </h3>
            <span style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.6)', display: 'block', marginBottom: 14 }}>Answer to check your Python foundation</span>
            
            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#FFFFFF', marginBottom: 14, lineHeight: 1.5 }}>
              How does Python handle memory management for variables?
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {quizAnswers.map((answer, index) => {
                const isSelected = selectedQuizOption === index;
                const isCorrectOption = index === correctAnswerIdx;
                let optBg = 'rgba(255, 255, 255, 0.03)';
                let optBorder = 'rgba(255, 255, 255, 0.12)';
                let optColor = '#FFFFFF';

                if (quizSubmitted) {
                  if (isCorrectOption) {
                    optBg = 'rgba(52, 211, 153, 0.15)';
                    optBorder = '#34D399';
                    optColor = '#34D399';
                  } else if (isSelected) {
                    optBg = 'rgba(248, 113, 113, 0.15)';
                    optBorder = '#F87171';
                    optColor = '#F87171';
                  }
                } else {
                  if (isSelected) {
                    optBg = 'rgba(56, 189, 248, 0.15)';
                    optBorder = '#38BDF8';
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
                      borderRadius: 12,
                      padding: '11px 14px',
                      color: optColor,
                      fontSize: 13,
                      fontWeight: 500,
                      textAlign: 'left',
                      cursor: quizSubmitted ? 'default' : 'pointer',
                      transition: 'all 0.15s',
                      outline: 'none',
                      fontFamily: 'inherit'
                    }}
                    onMouseEnter={e => {
                      if (!quizSubmitted) {
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!quizSubmitted) {
                        e.currentTarget.style.borderColor = optBorder;
                        e.currentTarget.style.background = optBg;
                      }
                    }}
                  >
                    <span style={{ fontWeight: 700, marginRight: 8, color: 'rgba(255, 255, 255, 0.5)' }}>{'ABCD'[index]})</span>
                    {answer}
                  </button>
                );
              })}
            </div>

            {quizSubmitted && (
              <div style={{
                marginTop: 16,
                padding: '14px',
                borderRadius: 12,
                background: selectedQuizOption === correctAnswerIdx ? 'rgba(52, 211, 153, 0.12)' : 'rgba(248, 113, 113, 0.12)',
                border: `1px solid ${selectedQuizOption === correctAnswerIdx ? 'rgba(52, 211, 153, 0.3)' : 'rgba(248, 113, 113, 0.3)'}`,
                fontSize: 12.5,
                color: selectedQuizOption === correctAnswerIdx ? '#34D399' : '#F87171',
                lineHeight: 1.5
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
          <div style={{ ...shinyCardStyle, padding: '22px' }}>
            <h3 style={{ margin: '0 0 14px 0', fontSize: 15, fontWeight: 800, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Award size={17} color="#FBBF24" /> Concept of the Day
            </h3>

            <div
              onClick={handleFlipConcept}
              style={{
                cursor: 'pointer',
                perspective: '1000px'
              }}
            >
              <div style={{
                background: conceptFlipped ? 'rgba(251, 191, 36, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                border: `1px solid ${conceptFlipped ? 'rgba(251, 191, 36, 0.35)' : 'rgba(255, 255, 255, 0.12)'}`,
                borderRadius: 14,
                padding: '26px 18px',
                minHeight: 140,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                transition: 'all 0.3s ease',
                transformStyle: 'preserve-3d'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'rgba(251, 191, 36, 0.4)';
              }}
              onMouseLeave={e => {
                if (!conceptFlipped) e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
              }}
              >
                <span style={{ fontSize: 10.5, color: 'rgba(255, 255, 255, 0.5)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
                  {conceptFlipped ? 'Definition' : 'Concept \u2014 click to reveal'}
                </span>
                
                <h4 style={{ color: '#FFFFFF', fontSize: conceptFlipped ? 13.5 : 16, fontWeight: conceptFlipped ? 500 : 800, margin: 0, lineHeight: 1.55 }}>
                  {conceptFlipped ? (
                    "A decorator is a function that wraps another function to dynamically extend or modify its behavior without modifying the actual function's source code explicitly. Annotated using the @decorator syntax."
                  ) : (
                    "💡 Decorator Functions (@)"
                  )}
                </h4>
                
                <span style={{ fontSize: 11, color: '#FBBF24', fontWeight: 600, marginTop: 14 }}>
                  {conceptFlipped ? 'Click to flip back' : 'Click to flip'}
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  </div>
  );
}
