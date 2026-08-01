'use client';

import { useState, useEffect } from 'react';
import { HelpCircle, Plus, Edit2, Trash2, X, GraduationCap, CheckCircle, ClipboardList, Clock } from 'lucide-react';
import { T } from '@/lib/lms-data';
import { useMediaQuery, isMobileMQ } from '@/lib/useMediaQuery';
import { getQuizzes, createQuiz, updateQuiz, deleteQuiz, getCourses } from '@/lib/frappe';
import { getCourseDetails } from '@/lib/lms-data';

export default function AdminQuizzesPage() {
  const isMobile = useMediaQuery(isMobileMQ);

  // States
  const [quizzes, setQuizzes] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
  
  // Available lessons for selection based on course
  const [availableLessons, setAvailableLessons] = useState([]);

  const [currentQuiz, setCurrentQuiz] = useState({
    id: '',
    title: '',
    course: '',
    lesson: '',
    max_attempts: 3,
    passing_percentage: 70,
    total_marks: 10,
    duration: '10 mins',
    questions: []
  });

  // Load quizzes and courses
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [quizList, courseList] = await Promise.all([getQuizzes(), getCourses()]);
        setQuizzes(quizList);
        setCourses(courseList);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Sync available lessons when currentQuiz.course changes
  useEffect(() => {
    if (!currentQuiz.course) {
      setAvailableLessons([]);
      return;
    }
    const matchedCourse = courses.find(c => c.id === currentQuiz.course);
    if (matchedCourse) {
      const details = getCourseDetails(matchedCourse);
      if (details && details.modules) {
        const lessons = details.modules.flatMap(m => m.lessons.map(l => ({ id: l.id, title: l.title })));
        setAvailableLessons(lessons);
      } else {
        setAvailableLessons([]);
      }
    } else {
      setAvailableLessons([]);
    }
  }, [currentQuiz.course, courses]);

  const updateChecklist = (newList) => {
    const savedChecklist = localStorage.getItem('admin_getting_started');
    if (savedChecklist) {
      try {
        const checklist = JSON.parse(savedChecklist);
        if (newList.length > 0 && !checklist.quiz) {
          checklist.quiz = true;
          localStorage.setItem('admin_getting_started', JSON.stringify(checklist));
          window.dispatchEvent(new Event('admin_checklist_update'));
        }
      } catch (e) {}
    }
  };

  const handleOpenCreateModal = () => {
    setModalMode('create');
    const defaultCourseId = courses[0]?.id || '';
    setCurrentQuiz({
      id: '',
      title: '',
      course: defaultCourseId,
      lesson: '',
      max_attempts: 3,
      passing_percentage: 70,
      total_marks: 10,
      duration: '10 mins',
      questions: [
        { question: 'Who created Python?', options: ['Guido van Rossum', 'Dennis Ritchie', 'Bjarne Stroustrup', 'James Gosling'], correct: 0 }
      ]
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (quiz, e) => {
    e.stopPropagation();
    setModalMode('edit');
    setCurrentQuiz({
      ...quiz,
      questions: quiz.questions && quiz.questions.length > 0 ? quiz.questions : [
        { question: 'Who created Python?', options: ['Guido van Rossum', 'Dennis Ritchie', 'Bjarne Stroustrup', 'James Gosling'], correct: 0 }
      ]
    });
    setIsModalOpen(true);
  };

  const handleDeleteQuiz = async (id, e) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this quiz?')) {
      const success = await deleteQuiz(id);
      if (success) {
        const fresh = await getQuizzes();
        setQuizzes(fresh);
        updateChecklist(fresh);
      }
    }
  };

  const handleSaveQuizSubmit = async (e) => {
    e.preventDefault();
    if (!currentQuiz.title.trim()) return;

    if (modalMode === 'create') {
      await createQuiz(currentQuiz);
    } else {
      await updateQuiz(currentQuiz.id, currentQuiz);
    }

    const fresh = await getQuizzes();
    setQuizzes(fresh);
    updateChecklist(fresh);
    setIsModalOpen(false);
  };

  const addQuestionField = () => {
    setCurrentQuiz({
      ...currentQuiz,
      questions: [...currentQuiz.questions, { question: '', options: ['', '', '', ''], correct: 0 }]
    });
  };

  const removeQuestionField = (index) => {
    const updated = currentQuiz.questions.filter((_, idx) => idx !== index);
    setCurrentQuiz({ ...currentQuiz, questions: updated });
  };

  const updateQuestionText = (index, val) => {
    const updated = [...currentQuiz.questions];
    updated[index].question = val;
    setCurrentQuiz({ ...currentQuiz, questions: updated });
  };

  const updateOptionText = (qIndex, oIndex, val) => {
    const updated = [...currentQuiz.questions];
    updated[qIndex].options[oIndex] = val;
    setCurrentQuiz({ ...currentQuiz, questions: updated });
  };

  const updateCorrectOption = (qIndex, oIndex) => {
    const updated = [...currentQuiz.questions];
    updated[qIndex].correct = oIndex;
    setCurrentQuiz({ ...currentQuiz, questions: updated });
  };

  const getCourseTitle = (courseId) => {
    return courses.find(c => c.id === courseId)?.title || 'Unassigned Course';
  };

  const containerPadding = isMobile ? '70px 16px 32px 16px' : '40px';
  const gridColumns = isMobile ? '1fr' : 'repeat(auto-fill, minmax(350px, 1fr))';

  return (
    <div style={{
      padding: containerPadding,
      maxWidth: 1200,
      margin: '0 auto',
      fontFamily: 'var(--font-outfit), sans-serif'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 28
      }}>
        <div>
          <h1 style={{ color: T.text, fontSize: isMobile ? 22 : 28, fontWeight: 700, margin: 0, letterSpacing: '-0.04em' }}>
            Course Quizzes
          </h1>
          <p style={{ color: T.muted, fontSize: 13.5, margin: '4px 0 0' }}>
            Author and assign multiple-choice evaluations linked to specific curriculum lessons.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          style={{
            background: T.purple,
            color: '#fff',
            border: 'none',
            padding: '9px 16px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            boxShadow: '0 4px 12px rgba(155, 110, 248, 0.2)'
          }}
        >
          <Plus size={16} /> Create Quiz
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 240 }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: '2px solid rgba(155, 110, 248, 0.2)',
            borderTopColor: T.purple,
            animation: 'spin 1s linear infinite'
          }} />
        </div>
      ) : quizzes.length === 0 ? (
        <div style={{
          background: T.s1,
          border: `1px solid ${T.border}`,
          borderRadius: 14,
          padding: '64px 20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          minHeight: 320
        }}>
          <ClipboardList size={48} color={T.muted} style={{ marginBottom: 16 }} />
          <h3 style={{ color: T.text, fontSize: 16, margin: '0 0 6px 0' }}>No Quizzes Defined</h3>
          <p style={{ color: T.muted, fontSize: 13, maxWidth: 320, margin: '0 0 16px 0' }}>
            Add practice evaluations or graded examinations to check student progress.
          </p>
          <button
            onClick={handleOpenCreateModal}
            style={{
              background: T.purple,
              color: '#fff',
              border: 'none',
              padding: '9px 16px',
              borderRadius: 8,
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <Plus size={14} /> Create your first quiz
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: gridColumns,
          gap: 20
        }}>
          {quizzes.map((quiz) => (
            <div
              key={quiz.id}
              style={{
                background: T.s1,
                border: `1px solid ${T.border}`,
                borderRadius: 12,
                padding: 20,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.2s',
                position: 'relative'
              }}
            >
              <div>
                {/* Title and Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
                  <h3 style={{ color: T.text, fontSize: 15.5, fontWeight: 700, margin: 0, lineHeight: 1.3 }}>
                    {quiz.title}
                  </h3>
                  
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button
                      onClick={(e) => handleOpenEditModal(quiz, e)}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: T.muted, padding: 3, borderRadius: 4 }}
                      onMouseEnter={(e) => e.currentTarget.style.color = T.purple}
                      onMouseLeave={(e) => e.currentTarget.style.color = T.muted}
                      title="Edit Quiz"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={(e) => handleDeleteQuiz(quiz.id, e)}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: T.muted, padding: 3, borderRadius: 4 }}
                      onMouseEnter={(e) => e.currentTarget.style.color = T.red}
                      onMouseLeave={(e) => e.currentTarget.style.color = T.muted}
                      title="Delete Quiz"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <span style={{
                    fontSize: 10,
                    background: `${T.purple}12`,
                    border: `1px solid ${T.purple}25`,
                    color: T.purple,
                    padding: '2px 8px',
                    borderRadius: 20,
                    fontWeight: 700
                  }}>
                    {getCourseTitle(quiz.course)}
                  </span>
                </div>

                {/* Info summary */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: T.muted }}>
                    <HelpCircle size={13} color={T.muted} />
                    <span>{quiz.questions?.length || 0} Questions</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: T.muted }}>
                    <Clock size={13} color={T.muted} />
                    <span>Duration: {quiz.duration}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: T.muted }}>
                    <CheckCircle size={13} color={T.muted} />
                    <span>Passing rate: {quiz.passing_percentage}% (total {quiz.total_marks} marks)</span>
                  </div>
                </div>
              </div>

              {/* Footer status check */}
              <div style={{
                fontSize: 11,
                color: T.muted,
                borderTop: `1px solid ${T.border}`,
                paddingTop: 12,
                marginTop: 4
              }}>
                Attempts Allowed: {quiz.max_attempts}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Interactive Modal Form */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(7, 8, 15, 0.85)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 16
        }}>
          <div style={{
            background: T.s1,
            border: `1px solid ${T.border}`,
            borderRadius: 16,
            width: '100%',
            maxWidth: 620,
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: `1px solid ${T.border}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, color: T.text, fontSize: 16, fontWeight: 700 }}>
                {modalMode === 'create' ? 'Create New Quiz' : 'Edit Quiz'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: T.muted, padding: 0 }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSaveQuizSubmit} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
              
              {/* Scrollable Fields */}
              <div style={{ padding: 20, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Title */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: T.text }}>Quiz Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Python Variables & Conditions Quiz"
                    value={currentQuiz.title}
                    onChange={(e) => setCurrentQuiz({ ...currentQuiz, title: e.target.value })}
                    style={{
                      background: T.s2,
                      border: `1px solid ${T.border}`,
                      borderRadius: 8,
                      padding: '9px 12px',
                      color: T.text,
                      fontSize: 13,
                      outline: 'none',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>

                {/* Course Selection & Lesson Selection */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: T.text }}>Link to Course</label>
                    <select
                      value={currentQuiz.course}
                      onChange={(e) => setCurrentQuiz({ ...currentQuiz, course: e.target.value, lesson: '' })}
                      style={{
                        background: T.s2,
                        border: `1px solid ${T.border}`,
                        borderRadius: 8,
                        padding: '9px 12px',
                        color: T.text,
                        fontSize: 13,
                        outline: 'none',
                        fontFamily: 'inherit'
                      }}
                    >
                      <option value="">-- Select Course --</option>
                      {courses.map(c => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: T.text }}>Link to Lesson</label>
                    <select
                      value={currentQuiz.lesson}
                      onChange={(e) => setCurrentQuiz({ ...currentQuiz, lesson: e.target.value })}
                      style={{
                        background: T.s2,
                        border: `1px solid ${T.border}`,
                        borderRadius: 8,
                        padding: '9px 12px',
                        color: T.text,
                        fontSize: 13,
                        outline: 'none',
                        fontFamily: 'inherit'
                      }}
                    >
                      <option value="">-- Optional Lesson Link --</option>
                      {availableLessons.map(l => (
                        <option key={l.id} value={l.id}>{l.title}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Settings: Duration, Passing %, Max Attempts */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: T.text }}>Duration</label>
                    <input
                      type="text"
                      required
                      placeholder="10 mins"
                      value={currentQuiz.duration}
                      onChange={(e) => setCurrentQuiz({ ...currentQuiz, duration: e.target.value })}
                      style={{
                        background: T.s2,
                        border: `1px solid ${T.border}`,
                        borderRadius: 8,
                        padding: '8px 10px',
                        color: T.text,
                        fontSize: 12,
                        outline: 'none',
                        fontFamily: 'inherit'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: T.text }}>Passing %</label>
                    <input
                      type="number"
                      required
                      min="10"
                      max="100"
                      value={currentQuiz.passing_percentage}
                      onChange={(e) => setCurrentQuiz({ ...currentQuiz, passing_percentage: parseInt(e.target.value) || 70 })}
                      style={{
                        background: T.s2,
                        border: `1px solid ${T.border}`,
                        borderRadius: 8,
                        padding: '8px 10px',
                        color: T.text,
                        fontSize: 12,
                        outline: 'none',
                        fontFamily: 'inherit'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: T.text }}>Max Attempts</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={currentQuiz.max_attempts}
                      onChange={(e) => setCurrentQuiz({ ...currentQuiz, max_attempts: parseInt(e.target.value) || 3 })}
                      style={{
                        background: T.s2,
                        border: `1px solid ${T.border}`,
                        borderRadius: 8,
                        padding: '8px 10px',
                        color: T.text,
                        fontSize: 12,
                        outline: 'none',
                        fontFamily: 'inherit'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: T.text }}>Total Marks</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={currentQuiz.total_marks}
                      onChange={(e) => setCurrentQuiz({ ...currentQuiz, total_marks: parseInt(e.target.value) || 10 })}
                      style={{
                        background: T.s2,
                        border: `1px solid ${T.border}`,
                        borderRadius: 8,
                        padding: '8px 10px',
                        color: T.text,
                        fontSize: 12,
                        outline: 'none',
                        fontFamily: 'inherit'
                      }}
                    />
                  </div>
                </div>

                {/* Questions Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, borderBottom: `1px solid ${T.border}`, paddingBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: T.purple }}>Quiz Questions ({currentQuiz.questions?.length || 0})</span>
                  <button
                    type="button"
                    onClick={addQuestionField}
                    style={{
                      background: 'rgba(155, 110, 248, 0.1)',
                      border: `1px solid rgba(155, 110, 248, 0.25)`,
                      color: T.purple,
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '4px 10px',
                      borderRadius: 6,
                      cursor: 'pointer'
                    }}
                  >
                    + Add Question
                  </button>
                </div>

                {/* Questions List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {currentQuiz.questions?.map((q, qIndex) => (
                    <div key={qIndex} style={{ background: T.s2, border: `1px solid ${T.border}`, borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>Question #{qIndex + 1}</span>
                        {currentQuiz.questions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeQuestionField(qIndex)}
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: T.red, fontSize: 11 }}
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      {/* Question Text */}
                      <input
                        type="text"
                        required
                        placeholder="Type question here..."
                        value={q.question}
                        onChange={(e) => updateQuestionText(qIndex, e.target.value)}
                        style={{
                          width: '100%',
                          background: T.s1,
                          border: `1px solid ${T.border}`,
                          borderRadius: 8,
                          padding: '8px 12px',
                          color: T.text,
                          fontSize: 12.5,
                          outline: 'none',
                          fontFamily: 'inherit'
                        }}
                      />

                      {/* Options Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        {q.options?.map((opt, oIndex) => {
                          const isCorrect = q.correct === oIndex;
                          return (
                            <div key={oIndex} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <input
                                type="radio"
                                name={`correct_${qIndex}`}
                                checked={isCorrect}
                                onChange={() => updateCorrectOption(qIndex, oIndex)}
                                style={{ accentColor: T.green, cursor: 'pointer' }}
                              />
                              <input
                                type="text"
                                required
                                placeholder={`Option ${'ABCD'[oIndex]}`}
                                value={opt}
                                onChange={(e) => updateOptionText(qIndex, oIndex, e.target.value)}
                                style={{
                                  flex: 1,
                                  background: T.s1,
                                  border: `1px solid ${isCorrect ? T.green : T.border}`,
                                  borderRadius: 8,
                                  padding: '7px 10px',
                                  color: T.text,
                                  fontSize: 12,
                                  outline: 'none',
                                  fontFamily: 'inherit'
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
                borderTop: `1px solid ${T.border}`,
                padding: '16px 20px',
                background: T.s1
              }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    background: 'transparent',
                    border: `1px solid ${T.border}`,
                    color: T.text,
                    padding: '8px 16px',
                    borderRadius: 8,
                    fontSize: 12.5,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    background: T.purple,
                    color: '#fff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: 8,
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {modalMode === 'create' ? 'Create Quiz' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
