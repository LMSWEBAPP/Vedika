'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Brain, CheckCircle, ChevronRight, Clock,
  Loader2, Sparkles, RotateCcw, ArrowLeft, Send,
  FileText, Award, AlertCircle, ThumbsUp, HelpCircle, Terminal
} from 'lucide-react';
import { T, COURSE, geminiCall, buildQuizPrompt, parseQuizOutput, getCourseDetails } from '@/lib/lms-data';
import { useMediaQuery, isMobileMQ } from '@/lib/useMediaQuery';
import dynamic from 'next/dynamic';
import {
  getCourses, getQuizzes, submitQuizResponse, getQuizSubmissions,
  getAssignments, submitAssignmentResponse, getAssignmentSubmissions
} from '@/lib/frappe';
import PDFViewerModal from './PDFViewerModal';
const Playground = dynamic(() => import('./Playground'), { ssr: false });

export default function LessonPage({ lesson, completed = {}, onComplete }) {
  const router  = useRouter();
  const [next, setNext] = useState(null);
  const [isPlaygroundOpen, setIsPlaygroundOpen] = useState(false);
  const [isPdfViewerOpen, setIsPdfViewerOpen] = useState(false);
  const [selectedPdfResource, setSelectedPdfResource] = useState(null);

  useEffect(() => {
    if (lesson?.codingExercise?.hasExercise) {
      setIsPlaygroundOpen(true);
    } else {
      setIsPlaygroundOpen(false);
    }
  }, [lesson?.id, lesson?.codingExercise?.hasExercise]);
  
  // Resolve module: prefer lesson.module, fall back to matching module in static COURSE
  const mod = lesson.module || COURSE.modules.find(m => m.lessons.some(l => l.id === lesson.id)) || COURSE.modules[0];

  // System states
  const [currentUser, setCurrentUser] = useState(null);
  const isMobile = useMediaQuery(isMobileMQ);
  const isTabletOrSmallDesktop = useMediaQuery('(max-width: 1150px)');
  const rPad = isMobile ? 16 : 36;

  // AI Practice Quiz states
  const [aiQuiz,    setAiQuiz]    = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiErr,     setAiErr]     = useState('');
  const [aiQuizIdx, setAiQuizIdx] = useState(0);
  const [aiQuizAns, setAiQuizAns] = useState(null);

  // Official Quizzes & Assignments states
  const [officialQuiz, setOfficialQuiz] = useState(null);
  const [officialAssignment, setOfficialAssignment] = useState(null);
  const [quizAttempts, setQuizAttempts] = useState([]);
  const [assignmentSub, setAssignmentSub] = useState(null);
  
  // Official Quiz Attempt State
  const [isOfficialQuizActive, setIsOfficialQuizActive] = useState(false);
  const [officialQuizIdx, setOfficialQuizIdx] = useState(0);
  const [officialQuizAnswers, setOfficialQuizAnswers] = useState([]);
  const [officialQuizScore, setOfficialQuizScore] = useState(null);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);

  // Official Assignment Submission State
  const [assignmentText, setAssignmentText] = useState('');
  const [submittingAss, setSubmittingAss] = useState(false);
  const [assSuccessMsg, setAssSuccessMsg] = useState('');

  // Load current user
  useEffect(() => {
    const stored = localStorage.getItem('frappe_user');
    if (stored) {
      try { setCurrentUser(JSON.parse(stored)); } catch (e) {}
    }
  }, []);

  // Dynamically load next lesson
  useEffect(() => {
    async function loadNext() {
      try {
        const courses = await getCourses();
        const allLessons = [];
        courses.forEach(course => {
          const details = getCourseDetails(course);
          if (details && details.modules) {
            details.modules.forEach(m => {
              m.lessons.forEach(l => {
                allLessons.push(l);
              });
            });
          }
        });
        const allIds = allLessons.map(l => l.id);
        const idx = allIds.indexOf(lesson.id);
        if (idx !== -1 && idx < allLessons.length - 1) {
          setNext(allLessons[idx + 1]);
        } else {
          setNext(null);
        }
      } catch (e) {
        console.error("Error loading next lesson:", e);
      }
    }
    loadNext();
  }, [lesson.id]);

  // Fetch official quizzes, assignments, and student submissions
  useEffect(() => {
    if (!currentUser) return;

    async function loadOfficialLmsData() {
      try {
        const [quizzes, assignments, quizSubs, assSubs] = await Promise.all([
          getQuizzes(),
          getAssignments(),
          getQuizSubmissions(),
          getAssignmentSubmissions()
        ]);

        // Find official quiz linked to this lesson (or course)
        const linkedQuiz = quizzes.find(q => q.lesson === lesson.id || (q.course === lesson.courseId && !q.lesson));
        setOfficialQuiz(linkedQuiz || null);

        // Find official assignment linked to this course
        const linkedAss = assignments.find(a => a.course === lesson.courseId);
        setOfficialAssignment(linkedAss || null);

        // Filter quiz attempts for this student & quiz
        if (linkedQuiz) {
          const userAttempts = quizSubs.filter(s => s.quiz === linkedQuiz.id && s.member === currentUser.username);
          setQuizAttempts(userAttempts);
        }

        // Find assignment submission for this student & assignment
        if (linkedAss) {
          const userAssSub = assSubs.find(s => s.assignment === linkedAss.id && s.member === currentUser.username);
          setAssignmentSub(userAssSub || null);
          if (userAssSub) {
            setAssignmentText(userAssSub.answer || '');
          }
        }
      } catch (e) {
        console.error("Failed to load official quiz/assignment data:", e);
      }
    }

    loadOfficialLmsData();
    
    // Reset attempt states when lesson changes
    setIsOfficialQuizActive(false);
    setOfficialQuizIdx(0);
    setOfficialQuizAnswers([]);
    setOfficialQuizScore(null);
    setAssSuccessMsg('');
    setAiQuiz(null);
    setAiQuizAns(null);
    setAiQuizIdx(0);
  }, [lesson.id, currentUser]);

  const handleGenerateQuiz = async () => {
    setAiErr(''); setAiLoading(true);
    try {
      const topic = `Python lesson: ${lesson.title}. Overview: ${lesson.overview}. Key points: ${lesson.pts.join(', ')}`;
      const system = 'You are a quiz generator. Output only quiz questions in the specified format.';
      const prompt = buildQuizPrompt(topic, 'Beginner', 4);
      const text = await geminiCall(system, prompt);
      const questions = parseQuizOutput(text);
      if (!questions.length) {
        throw new Error('No quiz questions were returned by the AI. Please try again.');
      }
      setAiQuiz({ quizQuestions: questions }); setAiQuizIdx(0); setAiQuizAns(null);
    } catch (e) {
      setAiErr(e.message || 'Failed to generate quiz.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleOfficialQuizSubmit = async (e) => {
    e.preventDefault();
    if (!officialQuiz || !currentUser) return;

    setSubmittingQuiz(true);
    let correctCount = 0;
    officialQuiz.questions.forEach((q, idx) => {
      if (officialQuizAnswers[idx] === q.correct) {
        correctCount++;
      }
    });

    const totalQuestions = officialQuiz.questions.length;
    const percentage = Math.round((correctCount / totalQuestions) * 100);

    const subData = {
      quiz: officialQuiz.id,
      quiz_title: officialQuiz.title,
      course: lesson.courseId || officialQuiz.course,
      member: currentUser.username,
      member_name: currentUser.name || 'Student',
      score: correctCount,
      score_out_of: totalQuestions,
      percentage: percentage,
      passing_percentage: officialQuiz.passing_percentage
    };

    try {
      await submitQuizResponse(subData);
      setOfficialQuizScore({
        score: correctCount,
        total: totalQuestions,
        percentage: percentage,
        passed: percentage >= officialQuiz.passing_percentage
      });
      // Refresh attempts list
      const subs = await getQuizSubmissions();
      setQuizAttempts(subs.filter(s => s.quiz === officialQuiz.id && s.member === currentUser.username));
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingQuiz(false);
    }
  };

  const handleAssignmentSubmit = async (e) => {
    e.preventDefault();
    if (!officialAssignment || !currentUser || !assignmentText.trim()) return;

    setSubmittingAss(true);
    const subData = {
      assignment: officialAssignment.id,
      assignment_title: officialAssignment.title,
      type: officialAssignment.type,
      member: currentUser.username,
      member_name: currentUser.name || 'Student',
      answer: assignmentText,
      course: lesson.courseId || officialAssignment.course,
      question: officialAssignment.question
    };

    try {
      await submitAssignmentResponse(subData);
      setAssSuccessMsg('Assignment submitted successfully! An instructor will review and grade your work.');
      // Refresh submission details
      const subs = await getAssignmentSubmissions();
      setAssignmentSub(subs.find(s => s.assignment === officialAssignment.id && s.member === currentUser.username));
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingAss(false);
    }
  };

  const outerStyle = isPlaygroundOpen && !isMobile
    ? (isTabletOrSmallDesktop
        ? { padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: 28, fontFamily: 'var(--font-outfit), sans-serif', width: '100%' }
        : { padding: '32px 24px', display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 28, fontFamily: 'var(--font-outfit), sans-serif', width: '100%', maxWidth: '100%' })
    : { padding: `32px ${rPad}px`, maxWidth: 900, fontFamily: 'var(--font-outfit), sans-serif', margin: '0 auto' };

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? 14 : 22, flexWrap: 'wrap', gap: 10 }}>
          <button onClick={() => router.push('/courses')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: T.muted, cursor: 'pointer', fontSize: 13, padding: 0 }}>
            <ArrowLeft size={15} /> Back to Course
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

      {/* Title */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 13, color: mod?.accent || T.accent, background: `${mod?.accent || T.accent}18`, padding: '3px 10px', borderRadius: 20, fontWeight: 500 }}>
            {mod?.emoji} {mod?.title}
          </span>
        </div>
        <h2 style={{ color: T.text, fontSize: 22, fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.03em' }}>{lesson.title}</h2>
        <div style={{ color: T.muted, fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}>
          <Clock size={13} />{lesson.dur}
        </div>
      </div>

      {/* Video */}
      <div style={{ borderRadius: 14, overflow: 'hidden', border: `1px solid ${T.border}`, marginBottom: 22 }}>
        <iframe
          width="100%" height={isMobile ? 200 : 400}
          src={getYoutubeEmbedUrl(lesson.vid)}
          title={lesson.title} frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen style={{ display: 'block' }}
        />
      </div>

      {/* Overview + Key Points */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.4fr 1fr', gap: 16, marginBottom: 24 }}>
        <div style={{ background: T.s2, border: `1px solid ${T.border}`, borderRadius: 12, padding: '18px 20px' }}>
          <div style={{ color: T.text, fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Overview</div>
          <p style={{ color: T.muted, fontSize: 13.5, lineHeight: 1.7, margin: 0 }}>{lesson.overview}</p>
        </div>
        <div style={{ background: T.s2, border: `1px solid ${T.border}`, borderRadius: 12, padding: '18px 20px' }}>
          <div style={{ color: T.text, fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Key Points</div>
          {lesson.pts.map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, marginBottom: 9 }}>
              <div style={{
                width: 18, height: 18, borderRadius: '50%',
                background: `${mod?.accent || T.accent}22`, border: `1px solid ${mod?.accent || T.accent}40`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1
              }}>
                <span style={{ fontSize: 9, color: mod?.accent || T.accent, fontWeight: 700 }}>{i + 1}</span>
              </div>
              <span style={{ color: T.muted, fontSize: 13, lineHeight: 1.5 }}>{p}</span>
            </div>
          ))}
        </div>
      </div>

      {/* PDF Reference Resource Card */}
      {lesson.pdf && (
        <div style={{
          background: `linear-gradient(135deg, ${T.accent}0a 0%, ${T.purple}0a 100%)`,
          border: `1px solid ${T.accent}30`,
          borderRadius: 14,
          padding: '20px 24px',
          marginBottom: 24,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16
        }}>
          <div>
            <h3 style={{ color: T.text, fontSize: 15, fontWeight: 700, margin: '0 0 4px' }}>📄 Attached Study Materials</h3>
            <p style={{ color: T.muted, fontSize: 12.5, margin: 0 }}>Review the reference PDF document provided for this lesson.</p>
          </div>
          <button
            onClick={() => {
              setSelectedPdfResource({ file_link: lesson.pdf, name: `${lesson.title} Reference PDF` });
              setIsPdfViewerOpen(true);
            }}
            style={{
              background: T.accent,
              color: '#fff',
              border: 'none',
              padding: '8px 18px',
              borderRadius: 8,
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(91, 140, 248, 0.2)',
              transition: 'opacity 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = 0.9}
            onMouseLeave={e => e.currentTarget.style.opacity = 1}
          >
            Open PDF Viewer
          </button>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* SECTION 1: Official Lesson Quiz (Frappe backend data) */}
      {/* ──────────────────────────────────────────────────────── */}
      {officialQuiz && (
        <div style={{
          background: T.s1,
          border: `1px solid rgba(155, 110, 248, 0.2)`,
          borderRadius: 14,
          padding: 20,
          marginBottom: 24,
          boxShadow: '0 4px 20px rgba(155, 110, 248, 0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyBreak: 'space-between', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Award size={18} color={T.purple} />
              <div style={{ color: T.text, fontSize: 15, fontWeight: 700 }}>Official Quiz: {officialQuiz.title}</div>
            </div>
            {!isOfficialQuizActive && !officialQuizScore && (
              <button
                onClick={() => {
                  setIsOfficialQuizActive(true);
                  setOfficialQuizAnswers(new Array(officialQuiz.questions.length).fill(null));
                  setOfficialQuizIdx(0);
                  setOfficialQuizScore(null);
                }}
                style={{ background: T.purple, color: '#fff', border: 'none', padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                Start Quiz Attempt
              </button>
            )}
          </div>

          {/* Active quiz attempt */}
          {isOfficialQuizActive && !officialQuizScore && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 12, color: T.muted }}>Question {officialQuizIdx + 1} of {officialQuiz.questions.length}</span>
                <span style={{ fontSize: 11, color: T.purple }}>Passing rate: {officialQuiz.passing_percentage}%</span>
              </div>

              {/* Question Text */}
              <div style={{ color: T.text, fontSize: 14, fontWeight: 600, marginBottom: 14, lineHeight: 1.5 }}>
                {officialQuiz.questions[officialQuizIdx]?.question}
              </div>

              {/* Question Options */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                {officialQuiz.questions[officialQuizIdx]?.options?.map((opt, oIdx) => {
                  const isSelected = officialQuizAnswers[officialQuizIdx] === oIdx;
                  return (
                    <button
                      key={oIdx}
                      onClick={() => {
                        const updated = [...officialQuizAnswers];
                        updated[officialQuizIdx] = oIdx;
                        setOfficialQuizAnswers(updated);
                      }}
                      style={{
                        background: isSelected ? `${T.purple}18` : T.s2,
                        border: `1px solid ${isSelected ? T.purple : T.border}`,
                        borderRadius: 8,
                        padding: '12px 16px',
                        color: isSelected ? T.purple : T.text,
                        fontSize: 13,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s'
                      }}
                    >
                      <span style={{ fontWeight: 700, marginRight: 8 }}>{'ABCD'[oIdx]})</span> {opt}
                    </button>
                  );
                })}
              </div>

              {/* Navigation buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  disabled={officialQuizIdx === 0}
                  onClick={() => setOfficialQuizIdx(idx => idx - 1)}
                  style={{
                    background: 'transparent',
                    border: `1px solid ${T.border}`,
                    color: officialQuizIdx === 0 ? T.dim : T.text,
                    padding: '6px 12px',
                    borderRadius: 6,
                    fontSize: 12,
                    cursor: officialQuizIdx === 0 ? 'default' : 'pointer'
                  }}
                >
                  Previous
                </button>

                {officialQuizIdx < officialQuiz.questions.length - 1 ? (
                  <button
                    disabled={officialQuizAnswers[officialQuizIdx] === null}
                    onClick={() => setOfficialQuizIdx(idx => idx + 1)}
                    style={{
                      background: T.purple,
                      color: '#fff',
                      border: 'none',
                      padding: '6px 16px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      opacity: officialQuizAnswers[officialQuizIdx] === null ? 0.6 : 1
                    }}
                  >
                    Next
                  </button>
                ) : (
                  <button
                    disabled={officialQuizAnswers.some(ans => ans === null) || submittingQuiz}
                    onClick={handleOfficialQuizSubmit}
                    style={{
                      background: T.green,
                      color: '#000',
                      border: 'none',
                      padding: '6px 16px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    {submittingQuiz ? 'Submitting...' : 'Submit Answers'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Submission Result view */}
          {officialQuizScore && (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{
                width: 54, height: 54, borderRadius: '50%',
                background: officialQuizScore.passed ? `${T.green}18` : `${T.red}18`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 12px'
              }}>
                <Award size={28} color={officialQuizScore.passed ? T.green : T.red} />
              </div>
              <h4 style={{ color: T.text, fontSize: 16, fontWeight: 700, margin: '0 0 4px 0' }}>
                {officialQuizScore.passed ? 'Congratulations! You Passed' : 'Quiz Attempt Failed'}
              </h4>
              <p style={{ color: T.muted, fontSize: 13, margin: '0 0 16px 0' }}>
                You scored {officialQuizScore.score} out of {officialQuizScore.total} ({officialQuizScore.percentage}%)
              </p>

              <button
                onClick={() => {
                  setOfficialQuizScore(null);
                  setIsOfficialQuizActive(false);
                }}
                style={{
                  background: 'transparent',
                  border: `1px solid ${T.border}`,
                  color: T.text,
                  padding: '6px 14px',
                  borderRadius: 6,
                  fontSize: 12,
                  cursor: 'pointer'
                }}
              >
                Back to overview
              </button>
            </div>
          )}

          {/* Previous attempts log */}
          {!isOfficialQuizActive && quizAttempts.length > 0 && (
            <div style={{ marginTop: 16, borderTop: `1px solid ${T.border}`, paddingTop: 14 }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: T.muted }}>YOUR RECENT QUIZ ATTEMPTS:</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                {quizAttempts.map((att) => {
                  const passed = att.percentage >= att.passing_percentage;
                  return (
                    <div key={att.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: T.s2, padding: '8px 12px', borderRadius: 8 }}>
                      <span style={{ fontSize: 12, color: T.text }}>Score: {att.score}/{att.score_out_of} ({att.percentage}%)</span>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: passed ? T.green : T.red,
                        background: passed ? `${T.green}12` : `${T.red}12`,
                        padding: '2px 8px',
                        borderRadius: 4
                      }}>
                        {passed ? 'PASS' : 'FAIL'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* SECTION 2: Official Course Assignment (Frappe backend data) */}
      {/* ──────────────────────────────────────────────────────── */}
      {officialAssignment && (
        <div style={{
          background: T.s1,
          border: `1px solid rgba(245, 169, 91, 0.2)`,
          borderRadius: 14,
          padding: 20,
          marginBottom: 24,
          boxShadow: '0 4px 20px rgba(245, 169, 91, 0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <FileText size={18} color={T.amber} />
            <div style={{ color: T.text, fontSize: 15, fontWeight: 700 }}>Official Course Assignment</div>
          </div>
          
          <h4 style={{ color: T.text, fontSize: 14, fontWeight: 600, margin: '0 0 6px 0' }}>{officialAssignment.title}</h4>
          <div
            style={{ color: T.muted, fontSize: 13, lineHeight: 1.5, marginBottom: 16 }}
            dangerouslySetInnerHTML={{ __html: officialAssignment.question }}
          />

          {/* Submission status feedback */}
          {assignmentSub && (
            <div style={{
              background: T.s2,
              border: `1px solid ${T.border}`,
              padding: 14,
              borderRadius: 8,
              marginBottom: 16
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: T.muted }}>YOUR SUBMISSION STATUS:</span>
                <span style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 4,
                  background: assignmentSub.status === 'Pass' ? `${T.green}18` : assignmentSub.status === 'Fail' ? `${T.red}18` : `${T.amber}18`,
                  color: assignmentSub.status === 'Pass' ? T.green : assignmentSub.status === 'Fail' ? T.red : T.amber
                }}>
                  {assignmentSub.status.toUpperCase()}
                </span>
              </div>
              
              <div style={{ fontSize: 12.5, fontFamily: 'monospace', color: T.text, background: T.s1, padding: 8, borderRadius: 6, whiteSpace: 'pre-wrap' }}>
                {assignmentSub.answer}
              </div>

              {assignmentSub.comments && (
                <div style={{ marginTop: 10, fontSize: 12.5, color: T.muted, borderTop: `1px solid ${T.border}`, paddingTop: 8 }}>
                  <strong style={{ color: T.text }}>Instructor Feedback: </strong>
                  {assignmentSub.comments}
                </div>
              )}
            </div>
          )}

          {/* Form to submit (only if not graded, failed, or first-time submission) */}
          {(!assignmentSub || assignmentSub.status === 'Fail') && (
            <form onSubmit={handleAssignmentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: T.text }}>Submit your solution ({officialAssignment.type}):</label>
              
              {officialAssignment.type === 'Text' ? (
                <textarea
                  required
                  placeholder="Type your code or text submission here..."
                  value={assignmentText}
                  onChange={(e) => setAssignmentText(e.target.value)}
                  style={{
                    background: T.s2,
                    border: `1px solid ${T.border}`,
                    borderRadius: 8,
                    padding: '10px 12px',
                    color: T.text,
                    fontSize: 13,
                    outline: 'none',
                    fontFamily: 'monospace',
                    minHeight: 120,
                    resize: 'vertical'
                  }}
                />
              ) : (
                <input
                  type="text"
                  required
                  placeholder={`Enter your ${officialAssignment.type} link or file details here...`}
                  value={assignmentText}
                  onChange={(e) => setAssignmentText(e.target.value)}
                  style={{
                    background: T.s2,
                    border: `1px solid ${T.border}`,
                    borderRadius: 8,
                    padding: '10px 12px',
                    color: T.text,
                    fontSize: 13,
                    outline: 'none',
                    fontFamily: 'inherit'
                  }}
                />
              )}

              {assSuccessMsg && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: T.green, fontSize: 12.5 }}>
                  <ThumbsUp size={14} /> {assSuccessMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={submittingAss || !assignmentText.trim()}
                style={{
                  alignSelf: 'flex-end',
                  background: T.amber,
                  color: '#000',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: 6,
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                {submittingAss ? <Loader2 size={13} style={{ animation: 'spin 1s linear' }} /> : <Send size={13} />}
                Submit Assignment
              </button>
            </form>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* SECTION 3: AI Practice Quiz (AI generated content) */}
      {/* ──────────────────────────────────────────────────────── */}
      <div style={{ background: T.s2, border: `1px solid ${T.border}`, borderRadius: 12, padding: '20px', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Brain size={16} color={T.purple} />
            <div style={{ color: T.text, fontSize: 14, fontWeight: 600 }}>Interactive AI Practice Quiz</div>
          </div>
          {!aiQuiz && !aiLoading && (
            <button onClick={handleGenerateQuiz}
              style={{ background: T.purple, color: '#fff', border: 'none', padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Sparkles size={13} /> Generate Quiz
            </button>
          )}
        </div>

        {aiLoading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0' }}>
            <Loader2 size={16} color={T.purple} style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: 13, color: T.muted }}>Generating quiz questions...</span>
          </div>
        )}

        {aiErr && <div style={{ color: T.red, fontSize: 12, background: `${T.red}12`, padding: '8px 12px', borderRadius: 7 }}>⚠️ {aiErr}</div>}

        {/* AI Quiz questions */}
        {aiQuiz && aiQuiz.quizQuestions?.length > 0 && (
          <div>
            {(() => {
              const q = aiQuiz.quizQuestions[aiQuizIdx];
              return q ? (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ fontSize: 12, color: T.muted }}>Question {aiQuizIdx + 1} of {aiQuiz.quizQuestions.length}</div>
                    <button onClick={() => { setAiQuizIdx(0); setAiQuizAns(null); }}
                      style={{ background: 'none', border: `1px solid ${T.border}`, color: T.muted, borderRadius: 6, padding: '3px 8px', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <RotateCcw size={10} /> Reset
                    </button>
                  </div>
                  <div style={{ color: T.text, fontSize: 14, fontWeight: 600, marginBottom: 12, lineHeight: 1.5 }}>{q.question}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {q.options.map((opt, oi) => {
                      const isSelected = aiQuizAns === oi;
                      const isCorrect  = oi === q.correct;
                      const showResult = aiQuizAns !== null;
                      let bg = T.s3, border = T.border, color = T.muted;
                      if (showResult && isCorrect)  { bg = `${T.green}18`;  border = `${T.green}50`;  color = T.green; }
                      else if (showResult && isSelected) { bg = `${T.red}18`;   border = `${T.red}50`;   color = T.red; }
                      else if (!showResult && isSelected) { bg = `${T.accent}18`; border = `${T.accent}50`; color = T.accent; }
                      return (
                        <button key={oi}
                          onClick={() => { if (aiQuizAns === null) setAiQuizAns(oi); }}
                          disabled={aiQuizAns !== null}
                          style={{ background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: '10px 14px', color, fontSize: 12.5, cursor: aiQuizAns !== null ? 'default' : 'pointer', textAlign: 'left', transition: 'all 0.2s' }}>
                          <span style={{ fontWeight: 700, marginRight: 8 }}>{'ABCD'[oi]})</span>{opt}
                        </button>
                      );
                    })}
                  </div>
                  {aiQuizAns !== null && (
                    <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: aiQuizAns === q.correct ? T.green : T.red, fontWeight: 600 }}>
                        {aiQuizAns === q.correct ? '✓ Correct!' : `✗ Incorrect — correct answer: ${'ABCD'[q.correct]}`}
                      </span>
                      {aiQuizIdx < aiQuiz.quizQuestions.length - 1 && (
                        <button onClick={() => { setAiQuizIdx(i => i + 1); setAiQuizAns(null); }}
                          style={{ background: T.accent, color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                          Next <ChevronRight size={12} />
                        </button>
                      )}
                      {aiQuizIdx === aiQuiz.quizQuestions.length - 1 && (
                        <span style={{ fontSize: 12, color: T.muted }}>Quiz complete! 🎉</span>
                      )}
                    </div>
                  )}
                </div>
              ) : null;
            })()}
          </div>
        )}

        {!aiQuiz && !aiLoading && !aiErr && (
          <div style={{ color: T.muted, fontSize: 13, textAlign: 'center', padding: '10px 0' }}>
            Test your understanding of this lesson by generating a custom quiz!
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        {completed[lesson.id] ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: T.green, fontSize: 14, fontWeight: 600 }}>
            <CheckCircle size={18} /> Completed!
          </div>
        ) : (
          <button onClick={() => onComplete(lesson.id)}
            style={{ background: T.green, color: '#000', border: 'none', padding: '11px 24px', borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
            <CheckCircle size={15} /> Mark as Complete
          </button>
        )}
        {next && (
          <button onClick={() => router.push(`/lesson/${next.id}`)}
            style={{ background: T.s3, border: `1px solid ${T.border}`, color: T.text, padding: '11px 20px', borderRadius: 9, fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            Next: {next.title} <ChevronRight size={14} />
          </button>
        )}
      </div>

      {isPlaygroundOpen && isMobile && (
        <div style={{ marginTop: 24, height: 400, flexShrink: 0 }}>
          <Playground
            initialCode={`# Practice Python for: ${lesson.title}\n# Write your code here\n\n`}
            codingExercise={lesson.codingExercise}
            onVerifySuccess={() => onComplete(lesson.id)}
          />
        </div>
      )}
      {isPlaygroundOpen && !isMobile && isTabletOrSmallDesktop && (
        <div style={{ marginTop: 32, height: 500, flexShrink: 0 }}>
          <Playground
            initialCode={`# Practice Python for: ${lesson.title}\n# Write your code here\n\n`}
            codingExercise={lesson.codingExercise}
            onVerifySuccess={() => onComplete(lesson.id)}
          />
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
        <Playground
          initialCode={`# Practice Python for: ${lesson.title}\n# Write your code here\n\n`}
          codingExercise={lesson.codingExercise}
          onVerifySuccess={() => onComplete(lesson.id)}
        />
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

function getYoutubeEmbedUrl(vid) {
  if (!vid) return '';
  
  let videoId = vid;
  let queryParams = {};

  if (vid.includes('youtube.com/watch')) {
    try {
      const url = new URL(vid);
      videoId = url.searchParams.get('v') || '';
      url.searchParams.forEach((value, key) => {
        if (key !== 'v') queryParams[key] = value;
      });
    } catch (e) {}
  } else if (vid.includes('youtu.be/')) {
    try {
      const parts = vid.split('youtu.be/');
      const endPart = parts[1] || '';
      const [id, query] = endPart.split('?');
      videoId = id;
      if (query) {
        const searchParams = new URLSearchParams(query);
        searchParams.forEach((value, key) => {
          queryParams[key] = value;
        });
      }
    } catch (e) {}
  } else {
    const separatorIdx = vid.search(/[&?]/);
    if (separatorIdx !== -1) {
      videoId = vid.substring(0, separatorIdx);
      const queryString = vid.substring(separatorIdx + 1);
      const searchParams = new URLSearchParams(queryString);
      searchParams.forEach((value, key) => {
        queryParams[key] = value;
      });
    }
  }

  let startTime = null;
  const rawTime = queryParams['t'] || queryParams['start'];
  if (rawTime) {
    startTime = parseTimeToSeconds(rawTime);
  }

  let embedUrl = `https://www.youtube.com/embed/${videoId}`;
  const embedParams = new URLSearchParams();
  
  if (startTime !== null) {
    embedParams.set('start', startTime);
  }
  
  Object.entries(queryParams).forEach(([key, value]) => {
    if (key !== 't' && key !== 'start') {
      embedParams.set(key, value);
    }
  });

  const paramString = embedParams.toString();
  if (paramString) {
    embedUrl += `?${paramString}`;
  }

  return embedUrl;
}

function parseTimeToSeconds(timeStr) {
  if (!timeStr) return null;
  
  if (/^\d+s?$/.test(timeStr)) {
    return parseInt(timeStr.replace('s', ''), 10);
  }
  
  let seconds = 0;
  const hoursMatch = timeStr.match(/(\d+)h/);
  const minsMatch = timeStr.match(/(\d+)m/);
  const secsMatch = timeStr.match(/(\d+)s/);
  
  if (hoursMatch) {
    seconds += parseInt(hoursMatch[1], 10) * 3600;
  }
  if (minsMatch) {
    seconds += parseInt(minsMatch[1], 10) * 60;
  }
  if (secsMatch) {
    seconds += parseInt(secsMatch[1], 10);
  }
  
  return seconds > 0 ? seconds : null;
}
