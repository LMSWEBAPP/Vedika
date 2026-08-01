'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Plus, Edit2, Trash2, ChevronRight, ChevronDown, BookOpen, Settings,
  Layers, Video, HelpCircle, Save, ArrowLeft, CheckCircle2, X
} from 'lucide-react';
import { T } from '@/lib/lms-data';
import { getCourses, getCourseSyllabus, saveCourseSyllabus } from '@/lib/frappe';
import { useMediaQuery, isMobileMQ } from '@/lib/useMediaQuery';
import { motion, AnimatePresence } from 'framer-motion';

export default function CourseOutlinePage() {
  const params = useParams();
  const id = decodeURIComponent(params.id);
  const router = useRouter();
  const isMobile = useMediaQuery(isMobileMQ);

  const [course, setCourse] = useState(null);
  const [syllabus, setSyllabus] = useState({ modules: [] });
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('syllabus'); // 'syllabus' or 'settings'

  // Expanded chapters state
  const [expandedChapters, setExpandedChapters] = useState({});
  const [toastMsg, setToastMsg] = useState('');

  // Modals / Editors state
  const [chapterModal, setChapterModal] = useState({ open: false, mode: 'create', chapterId: '', title: '', description: '', emoji: '📖', accent: '#5B8CF8' });
  const [activeLessonTab, setActiveLessonTab] = useState('basic');
  const [lessonModal, setLessonModal] = useState({
    open: false,
    mode: 'create',
    chapterId: '',
    lessonId: '',
    title: '',
    dur: '10 min',
    vid: '',
    overview: '',
    ptsInput: '', // newline-separated key points
    quizQuestions: [], // quiz questions list
    hasExercise: false,
    exerciseLanguage: 'python',
    exerciseInstruction: '',
    exerciseStarterCode: '# Write your code here\n',
    exerciseSolutionCode: '',
    exerciseTestCases: '',
    pdf: ''
  });

  // Current editing quiz question modal/form
  const [quizForm, setQuizForm] = useState({
    open: false,
    question: '',
    opt1: '', opt2: '', opt3: '', opt4: '',
    correct: 0
  });

  useEffect(() => {
    async function loadData() {
      try {
        const list = await getCourses();
        const found = list.find(c => c.id === id);
        setCourse(found);

        const outline = await getCourseSyllabus(id);
        setSyllabus(outline);

        // Expand all chapters by default
        const expand = {};
        outline.modules.forEach(m => {
          expand[m.id] = true;
        });
        setExpandedChapters(expand);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  const toggleChapter = (chapterId) => {
    setExpandedChapters(prev => ({ ...prev, [chapterId]: !prev[chapterId] }));
  };

  const handleSaveSyllabus = async (updatedSyllabus) => {
    setSaveLoading(true);
    try {
      const saved = await saveCourseSyllabus(id, updatedSyllabus || syllabus);
      setSyllabus(saved);
      setToastMsg('Syllabus outline successfully synchronized.');
      setTimeout(() => setToastMsg(''), 3000);
    } catch (e) {
      alert('Failed to save syllabus: ' + e.message);
    } finally {
      setSaveLoading(false);
    }
  };

  // --- Chapter Operations ---

  const openAddChapter = () => {
    setChapterModal({ open: true, mode: 'create', chapterId: '', title: '', description: '', emoji: '📖', accent: '#5B8CF8' });
  };

  const openEditChapter = (m) => {
    setChapterModal({
      open: true,
      mode: 'edit',
      chapterId: m.id,
      title: m.title,
      description: m.description || '',
      emoji: m.emoji || '📖',
      accent: m.accent || '#5B8CF8'
    });
  };

  const handleDeleteChapter = (chapterId) => {
    if (confirm('Are you sure you want to delete this chapter and all its lessons?')) {
      const updated = {
        ...syllabus,
        modules: syllabus.modules.filter(m => m.id !== chapterId)
      };
      setSyllabus(updated);
      handleSaveSyllabus(updated);
    }
  };

  const handleChapterSubmit = (e) => {
    e.preventDefault();
    if (!chapterModal.title.trim()) return;

    let updatedModules = [...syllabus.modules];

    if (chapterModal.mode === 'create') {
      const newChapter = {
        id: `ch_${Date.now()}`,
        title: chapterModal.title,
        description: chapterModal.description || '',
        emoji: chapterModal.emoji || '📖',
        accent: chapterModal.accent || '#5B8CF8',
        lessons: []
      };
      updatedModules.push(newChapter);
      setExpandedChapters(prev => ({ ...prev, [newChapter.id]: true }));
    } else {
      updatedModules = updatedModules.map(m =>
        m.id === chapterModal.chapterId ? {
          ...m,
          title: chapterModal.title,
          description: chapterModal.description || '',
          emoji: chapterModal.emoji || '📖',
          accent: chapterModal.accent || '#5B8CF8'
        } : m
      );
    }

    const updated = { ...syllabus, modules: updatedModules };
    setSyllabus(updated);
    handleSaveSyllabus(updated);
    setChapterModal({ open: false, mode: 'create', chapterId: '', title: '', description: '', emoji: '📖', accent: '#5B8CF8' });
  };

  // --- Lesson Operations ---

  const openAddLesson = (chapterId) => {
    setActiveLessonTab('basic');
    setLessonModal({
      open: true,
      mode: 'create',
      chapterId,
      lessonId: '',
      title: '',
      dur: '10 min',
      vid: '',
      overview: '',
      ptsInput: '',
      quizQuestions: [],
      hasExercise: false,
      exerciseLanguage: 'python',
      exerciseInstruction: '',
      exerciseStarterCode: '# Write your code here\n',
      exerciseSolutionCode: '',
      exerciseTestCases: '',
      pdf: ''
    });
  };

  const openEditLesson = (chapterId, lesson) => {
    setActiveLessonTab('basic');
    const coding = lesson.codingExercise || {
      hasExercise: false,
      language: 'python',
      instruction: '',
      starterCode: '',
      solutionCode: '',
      testCases: []
    };
    const testCasesStr = Array.isArray(coding.testCases) ? coding.testCases.join('\n') : (coding.testCases || '');

    setLessonModal({
      open: true,
      mode: 'edit',
      chapterId,
      lessonId: lesson.id,
      title: lesson.title,
      dur: lesson.dur,
      vid: lesson.vid,
      overview: lesson.overview || '',
      ptsInput: (lesson.pts || []).join('\n'),
      quizQuestions: lesson.quizQuestions || [],
      hasExercise: coding.hasExercise || false,
      exerciseLanguage: coding.language || 'python',
      exerciseInstruction: coding.instruction || '',
      exerciseStarterCode: coding.starterCode || '',
      exerciseSolutionCode: coding.solutionCode || '',
      exerciseTestCases: testCasesStr,
      pdf: lesson.pdf || ''
    });
  };

  const handleDeleteLesson = (chapterId, lessonId) => {
    if (confirm('Are you sure you want to delete this lesson?')) {
      const updatedModules = syllabus.modules.map(m => {
        if (m.id === chapterId) {
          return {
            ...m,
            lessons: m.lessons.filter(l => l.id !== lessonId)
          };
        }
        return m;
      });

      const updated = { ...syllabus, modules: updatedModules };
      setSyllabus(updated);
      handleSaveSyllabus(updated);
    }
  };

  const handleLessonSubmit = (e) => {
    e.preventDefault();
    if (!lessonModal.title.trim()) return;

    const points = lessonModal.ptsInput
      .split('\n')
      .map(p => p.trim())
      .filter(p => p.length > 0);

    const testCasesArr = lessonModal.exerciseTestCases
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);

    const codingObj = {
      hasExercise: lessonModal.hasExercise || false,
      language: lessonModal.exerciseLanguage || 'python',
      instruction: lessonModal.exerciseInstruction || '',
      starterCode: lessonModal.exerciseStarterCode || '',
      solutionCode: lessonModal.exerciseSolutionCode || '',
      testCases: testCasesArr
    };

    const updatedModules = syllabus.modules.map(m => {
      if (m.id === lessonModal.chapterId) {
        let updatedLessons = [...m.lessons];

        if (lessonModal.mode === 'create') {
          const newLesson = {
            id: `les_${Date.now()}`,
            title: lessonModal.title,
            dur: lessonModal.dur,
            vid: lessonModal.vid || 'rfscVS0vtbw',
            overview: lessonModal.overview,
            pts: points.length > 0 ? points : ['Key concept introduction.'],
            quizQuestions: lessonModal.quizQuestions,
            codingExercise: codingObj,
            pdf: lessonModal.pdf || ''
          };
          updatedLessons.push(newLesson);
        } else {
          updatedLessons = updatedLessons.map(l =>
            l.id === lessonModal.lessonId
              ? {
                  ...l,
                  title: lessonModal.title,
                  dur: lessonModal.dur,
                  vid: lessonModal.vid,
                  overview: lessonModal.overview,
                  pts: points,
                  quizQuestions: lessonModal.quizQuestions,
                  codingExercise: codingObj,
                  pdf: lessonModal.pdf || ''
                }
              : l
          );
        }

        return { ...m, lessons: updatedLessons };
      }
      return m;
    });

    const updated = { ...syllabus, modules: updatedModules };
    setSyllabus(updated);
    handleSaveSyllabus(updated);
    setLessonModal({
      open: false,
      mode: 'create',
      chapterId: '',
      lessonId: '',
      title: '',
      dur: '10 min',
      vid: '',
      overview: '',
      ptsInput: '',
      quizQuestions: [],
      hasExercise: false,
      exerciseLanguage: 'python',
      exerciseInstruction: '',
      exerciseStarterCode: '# Write your code here\n',
      exerciseSolutionCode: '',
      exerciseTestCases: '',
      pdf: ''
    });
  };

  // --- Quiz Management inside Lesson Editor ---

  const handleAddQuizQuestion = (e) => {
    e.preventDefault();
    if (!quizForm.question.trim() || !quizForm.opt1.trim() || !quizForm.opt2.trim()) {
      alert('Please fill out the question and at least two options.');
      return;
    }

    const options = [quizForm.opt1.trim(), quizForm.opt2.trim()];
    if (quizForm.opt3.trim()) options.push(quizForm.opt3.trim());
    if (quizForm.opt4.trim()) options.push(quizForm.opt4.trim());

    const newQuestion = {
      question: quizForm.question.trim(),
      options,
      correct: Number(quizForm.correct)
    };

    setLessonModal(prev => ({
      ...prev,
      quizQuestions: [...prev.quizQuestions, newQuestion]
    }));

    setQuizForm({ open: false, question: '', opt1: '', opt2: '', opt3: '', opt4: '', correct: 0 });
  };

  const handleRemoveQuizQuestion = (qIdx) => {
    setLessonModal(prev => ({
      ...prev,
      quizQuestions: prev.quizQuestions.filter((_, idx) => idx !== qIdx)
    }));
  };

  const containerPadding = isMobile ? '70px 16px 32px 16px' : '40px';

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)', alignItems: 'center', justifyContent: 'center', color: 'var(--text)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
          <div style={{ fontSize: 14, color: 'var(--muted)' }}>Loading syllabus builder...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: containerPadding, maxWidth: 900, margin: '0 auto', fontFamily: 'var(--font-outfit), sans-serif' }}>
      
      {/* Header Back Button */}
      <button
        onClick={() => router.push('/admin/courses')}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
          color: T.muted, cursor: 'pointer', fontSize: 13, marginBottom: 20, padding: 0
        }}
      >
        <ArrowLeft size={15} /> Back to Courses
      </button>

      {/* Course Title and Status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 28 }}>
        <div>
          <span style={{ fontSize: 11.5, color: T.purple, background: `${T.purple}15`, padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>
            {course?.category}
          </span>
          <h1 style={{ color: T.text, fontSize: 24, fontWeight: 700, margin: '6px 0 4px 0', letterSpacing: '-0.03em' }}>
            {course?.title}
          </h1>
          <p style={{ color: T.muted, fontSize: 13.5, margin: 0 }}>
            Headless Syllabus Outline Editor
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => handleSaveSyllabus()}
            disabled={saveLoading}
            style={{
              background: T.green, color: '#000', border: 'none', padding: '9px 16px',
              borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 12px rgba(34, 197, 160, 0.15)'
            }}
          >
            <Save size={15} /> {saveLoading ? 'Syncing...' : 'Sync'}
          </button>
        </div>
      </div>

      {/* Tabs Menu */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${T.border}`, marginBottom: 24 }}>
        <button
          onClick={() => setActiveTab('syllabus')}
          style={{
            background: 'none', border: 'none', color: activeTab === 'syllabus' ? T.accent : T.muted,
            padding: '10px 16px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
            borderBottom: `2px solid ${activeTab === 'syllabus' ? T.accent : 'transparent'}`,
            transition: 'all 0.2s'
          }}
        >
          Syllabus Outline ({syllabus.modules.length} Chapters)
        </button>
      </div>

      {/* Chapters list */}
      {activeTab === 'syllabus' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          {syllabus.modules.length === 0 ? (
            <div style={{ background: T.s1, border: `1px solid ${T.border}`, borderRadius: 14, padding: '48px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📚</div>
              <h3 style={{ color: T.text, fontSize: 16, fontWeight: 600, margin: '0 0 6px 0' }}>No chapters created yet</h3>
              <p style={{ color: T.muted, fontSize: 13, maxWidth: 300, margin: '0 auto 20px' }}>
                Start structure planning by creating your first chapter.
              </p>
              <button
                onClick={openAddChapter}
                style={{
                  background: T.purple, color: '#fff', border: 'none', padding: '8px 16px',
                  borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: 'pointer'
                }}
              >
                <Plus size={14} /> Create Chapter
              </button>
            </div>
          ) : (
            <>
              {syllabus.modules.map((chapter, index) => {
                const expanded = expandedChapters[chapter.id];
                return (
                  <div key={chapter.id} style={{ background: T.s1, border: `1px solid ${T.border}`, borderRadius: 14, overflow: 'hidden' }}>
                    
                    {/* Chapter Header row */}
                    <div style={{
                      padding: '14px 20px', background: T.s2, borderBottom: `1px solid ${T.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => toggleChapter(chapter.id)}>
                        <div style={{ color: T.muted }}>
                          {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </div>
                        <div>
                          <span style={{ fontSize: 12.5, fontWeight: 700, color: T.muted }}>Chapter {index + 1}</span>
                          <h3 style={{ color: T.text, fontSize: 14.5, fontWeight: 600, margin: '2px 0 0 0' }}>{chapter.title}</h3>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => openAddLesson(chapter.id)}
                          style={{
                            background: 'transparent', border: `1px solid ${T.border}`, color: T.text,
                            padding: '5px 10px', borderRadius: 6, fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 4
                          }}
                        >
                          <Plus size={12} color={T.accent} /> Add Lesson
                        </button>
                        <button
                          onClick={() => openEditChapter(chapter)}
                          style={{ background: 'transparent', border: 'none', color: T.muted, cursor: 'pointer', padding: 4 }}
                          title="Edit Chapter Title"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteChapter(chapter.id)}
                          style={{ background: 'transparent', border: 'none', color: T.muted, cursor: 'pointer', padding: 4 }}
                          title="Delete Chapter"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Lessons list */}
                    <AnimatePresence initial={false}>
                      {expanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: 'easeInOut' }}
                          style={{ overflow: 'hidden' }}
                        >
                          <div style={{ padding: '4px 0' }}>
                            {chapter.lessons.length === 0 ? (
                              <div style={{ padding: '20px 24px', color: T.muted, fontSize: 12.5, textAlign: 'center' }}>
                                No lessons in this chapter. Click "Add Lesson" to populate content.
                              </div>
                            ) : (
                              chapter.lessons.map((lesson, lIdx) => (
                                <div
                                  key={lesson.id}
                                  style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '12px 24px', borderBottom: lIdx < chapter.lessons.length - 1 ? `1px solid ${T.border}` : 'none'
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: T.accent }} />
                                    <div>
                                      <h4 style={{ color: T.text, fontSize: 13.5, fontWeight: 500, margin: 0 }}>{lesson.title}</h4>
                                      <div style={{ display: 'flex', gap: 8, marginTop: 2, fontSize: 11, color: T.muted }}>
                                        <span>⏱️ {lesson.dur}</span>
                                        <span>•</span>
                                        <span>📺 Video: {lesson.vid || 'None'}</span>
                                        {lesson.pdf && (
                                          <>
                                            <span>•</span>
                                            <span style={{ color: T.accent, fontWeight: 600 }}>📄 PDF Attached</span>
                                          </>
                                        )}
                                        {lesson.quizQuestions?.length > 0 && (
                                          <>
                                            <span>•</span>
                                            <span style={{ color: T.green, fontWeight: 600 }}>📝 {lesson.quizQuestions.length} Quiz Questions</span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div style={{ display: 'flex', gap: 8 }}>
                                    <button
                                      onClick={() => openEditLesson(chapter.id, lesson)}
                                      style={{ background: 'transparent', border: 'none', color: T.muted, cursor: 'pointer', padding: 4 }}
                                      title="Edit Lesson Outline & Quizzes"
                                    >
                                      <Edit2 size={13} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteLesson(chapter.id, lesson.id)}
                                      style={{ background: 'transparent', border: 'none', color: T.muted, cursor: 'pointer', padding: 4 }}
                                      title="Delete Lesson"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}

              {/* Add Chapter Row button */}
              <button
                onClick={openAddChapter}
                style={{
                  width: '100%', padding: '12px', background: 'transparent', border: `1px dashed ${T.border}`,
                  borderRadius: 12, color: T.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.color = T.accent; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.muted; }}
              >
                <Plus size={14} /> Add New Chapter
              </button>
            </>
          )}

        </div>
      )}

      {/* CHAPTER MODAL */}
      {chapterModal.open && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)',
          zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
        }}>
          <form onSubmit={handleChapterSubmit} style={{ background: T.s1, border: `1px solid ${T.border}`, borderRadius: 16, width: '100%', maxWidth: 460, padding: 24 }}>
            <h3 style={{ color: T.text, fontSize: 16, fontWeight: 700, margin: '0 0 16px 0' }}>
              {chapterModal.mode === 'create' ? 'Create Chapter' : 'Edit Chapter Title'}
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
              <label htmlFor="chapterTitle" style={{ color: T.text, fontSize: 12.5, fontWeight: 500 }}>Chapter Title</label>
              <input
                id="chapterTitle"
                type="text"
                value={chapterModal.title}
                onChange={(e) => setChapterModal(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g. Getting Started with variables"
                required
                style={{
                  width: '100%', background: T.s2, border: `1px solid ${T.border}`, borderRadius: 8,
                  padding: '10px 12px', color: T.text, fontSize: 13, fontFamily: 'inherit', outline: 'none'
                }}
              />
            </div>

            {/* Chapter Emoji & Accent Color Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ color: T.text, fontSize: 12, fontWeight: 500 }}>Chapter Emoji</label>
                <input
                  type="text"
                  value={chapterModal.emoji || ''}
                  onChange={(e) => setChapterModal(prev => ({ ...prev, emoji: e.target.value }))}
                  placeholder="e.g. 📖, 🐍, 💻"
                  style={{
                    width: '100%', background: T.s2, border: `1px solid ${T.border}`, borderRadius: 8,
                    padding: '8px 12px', color: T.text, fontSize: 13, outline: 'none'
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ color: T.text, fontSize: 12, fontWeight: 500 }}>Accent Color (HEX)</label>
                <input
                  type="text"
                  value={chapterModal.accent || ''}
                  onChange={(e) => setChapterModal(prev => ({ ...prev, accent: e.target.value }))}
                  placeholder="e.g. #9B6EF8"
                  style={{
                    width: '100%', background: T.s2, border: `1px solid ${T.border}`, borderRadius: 8,
                    padding: '8px 12px', color: T.text, fontSize: 13, outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* Chapter Description */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
              <label style={{ color: T.text, fontSize: 12.5, fontWeight: 500 }}>Description</label>
              <textarea
                value={chapterModal.description || ''}
                onChange={(e) => setChapterModal(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief introduction for this chapter..."
                rows="2"
                style={{
                  width: '100%', background: T.s2, border: `1px solid ${T.border}`, borderRadius: 8,
                  padding: '10px 12px', color: T.text, fontSize: 13, fontFamily: 'inherit', outline: 'none', resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setChapterModal(prev => ({ ...prev, open: false }))}
                style={{ background: 'transparent', border: `1px solid ${T.border}`, color: T.text, padding: '8px 16px', borderRadius: 8, fontSize: 12.5, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{ background: T.purple, color: '#fff', border: 'none', padding: '8px 18px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      {/* LESSON MODAL (Rich Lesson Outline & Quiz Form) */}
      {lessonModal.open && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)',
          zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          overflowY: 'auto'
        }}>
          <form onSubmit={handleLessonSubmit} style={{ background: T.s1, border: `1px solid ${T.border}`, borderRadius: 16, width: '100%', maxWidth: 640, padding: 24, margin: 'auto' }}>
            <h3 style={{ color: T.text, fontSize: 16, fontWeight: 700, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Video size={16} color={T.accent} /> {lessonModal.mode === 'create' ? 'Add Lesson Outline' : 'Edit Lesson Details'}
            </h3>

            {/* Tab Selectors */}
            <div style={{ display: 'flex', borderBottom: `1px solid ${T.border}`, marginBottom: 16, gap: 4, overflowX: 'auto' }}>
              {[
                { id: 'basic', label: 'Basic Info' },
                { id: 'content', label: 'Overview Content' },
                { id: 'coding', label: 'Coding Exercise' },
                { id: 'quiz', label: 'Practice Quiz' }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveLessonTab(tab.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    borderBottom: activeLessonTab === tab.id ? `2px solid ${T.purple}` : 'none',
                    color: activeLessonTab === tab.id ? T.text : T.muted,
                    padding: '8px 12px',
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                    outline: 'none',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* TAB CONTENT: BASIC INFO */}
            {activeLessonTab === 'basic' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: 14, marginBottom: 14 }}>
                  {/* Title */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <label htmlFor="lessonTitle" style={{ color: T.text, fontSize: 12, fontWeight: 500 }}>Lesson Title</label>
                    <input
                      id="lessonTitle"
                      type="text"
                      value={lessonModal.title}
                      onChange={(e) => setLessonModal(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g. Dynamic Typing"
                      required
                      style={{
                        width: '100%', background: T.s2, border: `1px solid ${T.border}`, borderRadius: 8,
                        padding: '8px 12px', color: T.text, fontSize: 13, fontFamily: 'inherit', outline: 'none'
                      }}
                    />
                  </div>

                  {/* Duration */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <label htmlFor="lessonDur" style={{ color: T.text, fontSize: 12, fontWeight: 500 }}>Duration</label>
                    <input
                      id="lessonDur"
                      type="text"
                      value={lessonModal.dur}
                      onChange={(e) => setLessonModal(prev => ({ ...prev, dur: e.target.value }))}
                      placeholder="e.g. 10 min"
                      required
                      style={{
                        width: '100%', background: T.s2, border: `1px solid ${T.border}`, borderRadius: 8,
                        padding: '8px 12px', color: T.text, fontSize: 13, fontFamily: 'inherit', outline: 'none'
                      }}
                    />
                  </div>
                </div>

                {/* Video ID */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14 }}>
                  <label htmlFor="lessonVid" style={{ color: T.text, fontSize: 12, fontWeight: 500 }}>YouTube Video ID (or URL suffix)</label>
                  <input
                    id="lessonVid"
                    type="text"
                    value={lessonModal.vid}
                    onChange={(e) => setLessonModal(prev => ({ ...prev, vid: e.target.value }))}
                    placeholder="e.g. rfscVS0vtbw"
                    style={{
                      width: '100%', background: T.s2, border: `1px solid ${T.border}`, borderRadius: 8,
                      padding: '8px 12px', color: T.text, fontSize: 13, fontFamily: 'inherit', outline: 'none'
                    }}
                  />
                </div>

                {/* PDF Reference URL */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14 }}>
                  <label htmlFor="lessonPdf" style={{ color: T.text, fontSize: 12, fontWeight: 500 }}>Lesson PDF Resource URL (optional)</label>
                  <input
                    id="lessonPdf"
                    type="text"
                    value={lessonModal.pdf || ''}
                    onChange={(e) => setLessonModal(prev => ({ ...prev, pdf: e.target.value }))}
                    placeholder="e.g. Google Drive link or static PDF URL"
                    style={{
                      width: '100%', background: T.s2, border: `1px solid ${T.border}`, borderRadius: 8,
                      padding: '8px 12px', color: T.text, fontSize: 13, fontFamily: 'inherit', outline: 'none'
                    }}
                  />
                </div>

                {/* Key Points */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14 }}>
                  <label htmlFor="lessonPoints" style={{ color: T.text, fontSize: 12, fontWeight: 500 }}>Key Study Points (one per line)</label>
                  <textarea
                    id="lessonPoints"
                    rows="3"
                    value={lessonModal.ptsInput}
                    onChange={(e) => setLessonModal(prev => ({ ...prev, ptsInput: e.target.value }))}
                    placeholder="Define variables&#10;Explore floating integers&#10;Dynamically reassign labels"
                    style={{
                      width: '100%', background: T.s2, border: `1px solid ${T.border}`, borderRadius: 8,
                      padding: '8px 12px', color: T.text, fontSize: 12.5, fontFamily: 'inherit', outline: 'none'
                    }}
                  />
                </div>
              </div>
            )}

            {/* TAB CONTENT: RICH TEXT OVERVIEW */}
            {activeLessonTab === 'content' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14 }}>
                <label htmlFor="lessonOverview" style={{ color: T.text, fontSize: 12, fontWeight: 500 }}>Lesson Content Overview (Markdown Supported)</label>
                <textarea
                  id="lessonOverview"
                  rows="8"
                  value={lessonModal.overview}
                  onChange={(e) => setLessonModal(prev => ({ ...prev, overview: e.target.value }))}
                  placeholder="Welcome to this lesson! Today we will learn about..."
                  style={{
                    width: '100%', background: T.s2, border: `1px solid ${T.border}`, borderRadius: 8,
                    padding: '10px 14px', color: T.text, fontSize: 13, fontFamily: 'inherit', outline: 'none', resize: 'vertical'
                  }}
                />
              </div>
            )}

            {/* TAB CONTENT: CODING EXERCISE */}
            {activeLessonTab === 'coding' && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <input
                    id="hasExercise"
                    type="checkbox"
                    checked={lessonModal.hasExercise}
                    onChange={(e) => setLessonModal(prev => ({ ...prev, hasExercise: e.target.checked }))}
                    style={{ width: 16, height: 16, cursor: 'pointer' }}
                  />
                  <label htmlFor="hasExercise" style={{ color: T.text, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    Enable Coding Exercise for this Lesson
                  </label>
                </div>

                {lessonModal.hasExercise && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, background: T.s2, border: `1px solid ${T.border}`, borderRadius: 10, padding: 16, maxHeight: 350, overflowY: 'auto' }}>
                    {/* Language */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <label htmlFor="exerciseLanguage" style={{ color: T.text, fontSize: 12, fontWeight: 500 }}>Programming Language</label>
                      <select
                        id="exerciseLanguage"
                        value={lessonModal.exerciseLanguage}
                        onChange={(e) => setLessonModal(prev => ({ ...prev, exerciseLanguage: e.target.value }))}
                        style={{
                          width: '100%', background: T.s3, border: `1px solid ${T.border}`, borderRadius: 8,
                          padding: '8px 12px', color: T.text, fontSize: 13, outline: 'none'
                        }}
                      >
                        <option value="python">Python 3 (WASM Pyodide)</option>
                        <option value="javascript">JavaScript (Client Eval)</option>
                      </select>
                    </div>

                    {/* Instructions */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <label htmlFor="exerciseInstruction" style={{ color: T.text, fontSize: 12, fontWeight: 500 }}>Exercise Instructions (Markdown supported)</label>
                      <textarea
                        id="exerciseInstruction"
                        rows="3"
                        value={lessonModal.exerciseInstruction}
                        onChange={(e) => setLessonModal(prev => ({ ...prev, exerciseInstruction: e.target.value }))}
                        placeholder="Write a function `add(a, b)` that returns their sum."
                        style={{
                          width: '100%', background: T.s3, border: `1px solid ${T.border}`, borderRadius: 8,
                          padding: '8px 12px', color: T.text, fontSize: 12.5, fontFamily: 'inherit', outline: 'none', resize: 'vertical'
                        }}
                      />
                    </div>

                    {/* Starter Code */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <label htmlFor="exerciseStarter" style={{ color: T.text, fontSize: 12, fontWeight: 500 }}>Starter Code Template</label>
                      <textarea
                        id="exerciseStarter"
                        rows="4"
                        value={lessonModal.exerciseStarterCode}
                        onChange={(e) => setLessonModal(prev => ({ ...prev, exerciseStarterCode: e.target.value }))}
                        placeholder="def add(a, b):&#10;    # Write code here&#10;    pass"
                        style={{
                          width: '100%', background: '#090D16', border: `1px solid ${T.border}`, borderRadius: 8,
                          padding: '8px 12px', color: '#5BF8A9', fontSize: 12.5, fontFamily: 'monospace', outline: 'none', resize: 'vertical'
                        }}
                      />
                    </div>

                    {/* Solution Code */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <label htmlFor="exerciseSolution" style={{ color: T.text, fontSize: 12, fontWeight: 500 }}>Reference Solution Code (Optional)</label>
                      <textarea
                        id="exerciseSolution"
                        rows="4"
                        value={lessonModal.exerciseSolutionCode}
                        onChange={(e) => setLessonModal(prev => ({ ...prev, exerciseSolutionCode: e.target.value }))}
                        placeholder="def add(a, b):&#10;    return a + b"
                        style={{
                          width: '100%', background: '#090D16', border: `1px solid ${T.border}`, borderRadius: 8,
                          padding: '8px 12px', color: '#5B8CF8', fontSize: 12.5, fontFamily: 'monospace', outline: 'none', resize: 'vertical'
                        }}
                      />
                    </div>

                    {/* Test Cases / Assertions */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <label htmlFor="exerciseTests" style={{ color: T.text, fontSize: 12, fontWeight: 500 }}>Test Cases / Assertions (One Python assertion statement per line)</label>
                      <textarea
                        id="exerciseTests"
                        rows="4"
                        value={lessonModal.exerciseTestCases}
                        onChange={(e) => setLessonModal(prev => ({ ...prev, exerciseTestCases: e.target.value }))}
                        placeholder="assert add(2, 3) == 5, 'add(2, 3) must equal 5'&#10;assert add(-1, 1) == 0, 'add(-1, 1) must equal 0'"
                        style={{
                          width: '100%', background: '#090D16', border: `1px solid ${T.border}`, borderRadius: 8,
                          padding: '8px 12px', color: '#F5A95B', fontSize: 12.5, fontFamily: 'monospace', outline: 'none', resize: 'vertical'
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: PRACTICE QUIZ */}
            {activeLessonTab === 'quiz' && (
              <div>
                <div style={{ borderTop: `1px solid ${T.border}`, pt: 14, marginTop: 4, marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '12px 0' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: T.text, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <HelpCircle size={14} color={T.purple} /> Practice Quiz Questions ({lessonModal.quizQuestions.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuizForm(prev => ({ ...prev, open: true }))}
                      style={{
                        background: 'transparent', border: `1px solid rgba(155, 110, 248, 0.3)`, color: T.purple,
                        padding: '4px 10px', borderRadius: 6, fontSize: 11.5, fontWeight: 600, cursor: 'pointer'
                      }}
                    >
                      <Plus size={12} /> Add Question
                    </button>
                  </div>

                  {/* Quiz form details */}
                  {quizForm.open && (
                    <div style={{ background: T.s2, border: `1px solid rgba(155, 110, 248, 0.25)`, borderRadius: 10, padding: 14, marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: T.purple }}>New Practice Question</span>
                        <button type="button" onClick={() => setQuizForm(prev => ({ ...prev, open: false }))} style={{ background: 'transparent', border: 'none', color: T.muted, cursor: 'pointer' }}>
                          <X size={14} />
                        </button>
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <input
                          type="text"
                          placeholder="Enter quiz question..."
                          value={quizForm.question}
                          onChange={(e) => setQuizForm(prev => ({ ...prev, question: e.target.value }))}
                          style={{ width: '100%', background: T.s3, border: `1px solid ${T.border}`, borderRadius: 6, padding: '7px 10px', color: T.text, fontSize: 12.5, outline: 'none' }}
                        />
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          <input
                            type="text"
                            placeholder="Option A (Required)"
                            value={quizForm.opt1}
                            onChange={(e) => setQuizForm(prev => ({ ...prev, opt1: e.target.value }))}
                            style={{ width: '100%', background: T.s3, border: `1px solid ${T.border}`, borderRadius: 6, padding: '6px 8px', color: T.text, fontSize: 12, outline: 'none' }}
                          />
                          <input
                            type="text"
                            placeholder="Option B (Required)"
                            value={quizForm.opt2}
                            onChange={(e) => setQuizForm(prev => ({ ...prev, opt2: e.target.value }))}
                            style={{ width: '100%', background: T.s3, border: `1px solid ${T.border}`, borderRadius: 6, padding: '6px 8px', color: T.text, fontSize: 12, outline: 'none' }}
                          />
                          <input
                            type="text"
                            placeholder="Option C (Optional)"
                            value={quizForm.opt3}
                            onChange={(e) => setQuizForm(prev => ({ ...prev, opt3: e.target.value }))}
                            style={{ width: '100%', background: T.s3, border: `1px solid ${T.border}`, borderRadius: 6, padding: '6px 8px', color: T.text, fontSize: 12, outline: 'none' }}
                          />
                          <input
                            type="text"
                            placeholder="Option D (Optional)"
                            value={quizForm.opt4}
                            onChange={(e) => setQuizForm(prev => ({ ...prev, opt4: e.target.value }))}
                            style={{ width: '100%', background: T.s3, border: `1px solid ${T.border}`, borderRadius: 6, padding: '6px 8px', color: T.text, fontSize: 12, outline: 'none' }}
                          />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <label htmlFor="quizCorrect" style={{ fontSize: 11.5, color: T.muted }}>Correct Answer Index:</label>
                          <select
                            id="quizCorrect"
                            value={quizForm.correct}
                            onChange={(e) => setQuizForm(prev => ({ ...prev, correct: Number(e.target.value) }))}
                            style={{ background: T.s3, border: `1px solid ${T.border}`, color: T.text, borderRadius: 6, padding: '4px 8px', fontSize: 12, outline: 'none' }}
                          >
                            <option value="0">Option A</option>
                            <option value="1">Option B</option>
                            {quizForm.opt3 && <option value="2">Option C</option>}
                            {quizForm.opt4 && <option value="3">Option D</option>}
                          </select>

                          <button
                            type="button"
                            onClick={handleAddQuizQuestion}
                            style={{
                              marginLeft: 'auto', background: T.purple, color: '#fff', border: 'none',
                              padding: '6px 12px', borderRadius: 6, fontSize: 11.5, fontWeight: 600, cursor: 'pointer'
                            }}
                          >
                            Insert
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Questions list display */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 150, overflowY: 'auto' }}>
                    {lessonModal.quizQuestions.map((q, qIdx) => (
                      <div key={qIdx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: T.s2, border: `1px solid ${T.border}`, borderRadius: 8, padding: '8px 12px' }}>
                        <div style={{ fontSize: 12.5, color: T.text }}>
                          <strong>Q{qIdx + 1}:</strong> {q.question} <span style={{ color: T.green, fontSize: 11, marginLeft: 8 }}>({q.options.length} options, Ans: {String.fromCharCode(65 + q.correct)})</span>
                        </div>
                        <button type="button" onClick={() => handleRemoveQuizQuestion(qIdx)} style={{ background: 'transparent', border: 'none', color: T.muted, cursor: 'pointer', padding: 4 }} title="Remove question">
                          <Trash2 size={13} color={T.red} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div style={{ borderTop: `1px solid ${T.border}`, padding: '14px 0 0 0', marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setLessonModal(prev => ({ ...prev, open: false }))}
                style={{ background: 'transparent', border: `1px solid ${T.border}`, color: T.text, padding: '8px 16px', borderRadius: 8, fontSize: 12.5, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{ background: T.purple, color: '#fff', border: 'none', padding: '8px 18px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}
              >
                Save Lesson
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Floating Sync Toast Notification */}
      {toastMsg && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, background: T.green, color: '#000',
          padding: '12px 24px', borderRadius: 8, fontSize: 13.5, fontWeight: 700,
          boxShadow: '0 8px 24px rgba(34, 197, 160, 0.25)', zIndex: 10000,
          animation: 'card-enter 0.3s ease'
        }}>
          {toastMsg}
        </div>
      )}

    </div>
  );
}
