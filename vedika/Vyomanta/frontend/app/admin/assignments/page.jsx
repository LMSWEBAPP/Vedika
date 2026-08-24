'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, GraduationCap, ClipboardList, CheckCircle, FileText, Star, User, Sparkles, Check, AlertCircle, Loader2 } from 'lucide-react';
import { T } from '@/lib/lms-data';
import { useMediaQuery, isMobileMQ } from '@/lib/useMediaQuery';
import { getAssignments, createAssignment, updateAssignment, deleteAssignment, getCourses, getAssignmentSubmissions, gradeAssignmentSubmission } from '@/lib/frappe';

export default function AdminAssignmentsPage() {
  const isMobile = useMediaQuery(isMobileMQ);

  // States
  const [assignments, setAssignments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [evaluatingId, setEvaluatingId] = useState(null);
  const [activeTab, setActiveTab] = useState('list'); // 'list' or 'submissions'
  
  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
  const [currentAssignment, setCurrentAssignment] = useState({
    id: '',
    title: '',
    course: '',
    type: 'Text',
    question: '',
    show_answer: false,
    answer: '',
    evaluation_criteria: [
      'Function/solution correctly implements requested logic',
      'Handles edge cases and valid input boundaries',
      'Clean structure, readability, and formatting'
    ],
    pass_threshold: 70
  });

  // Grading Modal
  const [isGradingOpen, setIsGradingOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [gradingForm, setGradingForm] = useState({
    status: 'Pass',
    comments: '',
    evaluator: 'Administrator',
    score: 80,
    ai_evaluation: null
  });

  // Load assignments, courses, submissions
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [assList, courseList, subList] = await Promise.all([
          getAssignments(),
          getCourses(),
          getAssignmentSubmissions()
        ]);
        setAssignments(assList);
        setCourses(courseList);
        setSubmissions(subList);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const updateChecklist = (newList) => {
    const savedChecklist = localStorage.getItem('admin_getting_started');
    if (savedChecklist) {
      try {
        const checklist = JSON.parse(savedChecklist);
        if (newList.length > 0 && !checklist.chapter) {
          checklist.chapter = true;
          localStorage.setItem('admin_getting_started', JSON.stringify(checklist));
          window.dispatchEvent(new Event('admin_checklist_update'));
        }
      } catch (e) {}
    }
  };

  const handleOpenCreateModal = () => {
    setModalMode('create');
    const defaultCourseId = courses[0]?.id || '';
    setCurrentAssignment({
      id: '',
      title: '',
      course: defaultCourseId,
      custom_course_title: '',
      type: 'Text',
      question: '',
      show_answer: false,
      answer: '',
      questions: [{ id: 1, prompt: '', sample_answer: '' }],
      evaluation_criteria: [
        'Function/solution correctly implements requested logic',
        'Handles edge cases and valid input boundaries',
        'Clean structure, readability, and formatting'
      ],
      pass_threshold: 70,
      min_char_count: 20
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (ass, e) => {
    e.stopPropagation();
    setModalMode('edit');
    setCurrentAssignment({
      ...ass,
      custom_course_title: ass.custom_course_title || '',
      questions: Array.isArray(ass.questions) && ass.questions.length > 0
        ? ass.questions.map(q => ({ ...q }))
        : [{ id: 1, prompt: ass.question || '', sample_answer: ass.answer || '' }],
      evaluation_criteria: Array.isArray(ass.evaluation_criteria) && ass.evaluation_criteria.length > 0
        ? [...ass.evaluation_criteria]
        : ['Core requirements met accurately', 'Edge cases covered'],
      pass_threshold: ass.pass_threshold || 70,
      min_char_count: ass.min_char_count !== undefined ? ass.min_char_count : 20
    });
    setIsModalOpen(true);
  };

  const handleAddCriterion = () => {
    setCurrentAssignment(prev => ({
      ...prev,
      evaluation_criteria: [...(prev.evaluation_criteria || []), '']
    }));
  };

  const handleRemoveCriterion = (index) => {
    setCurrentAssignment(prev => ({
      ...prev,
      evaluation_criteria: prev.evaluation_criteria.filter((_, i) => i !== index)
    }));
  };

  const handleCriterionChange = (index, value) => {
    setCurrentAssignment(prev => {
      const updated = [...(prev.evaluation_criteria || [])];
      updated[index] = value;
      return { ...prev, evaluation_criteria: updated };
    });
  };

  const handleAddQuestion = () => {
    setCurrentAssignment(prev => ({
      ...prev,
      questions: [...(prev.questions || []), { id: Date.now(), prompt: '', sample_answer: '' }]
    }));
  };

  const handleRemoveQuestion = (index) => {
    setCurrentAssignment(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index)
    }));
  };

  const handleQuestionChange = (index, field, value) => {
    setCurrentAssignment(prev => {
      const updated = [...(prev.questions || [])];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, questions: updated };
    });
  };

  const handleDeleteAssignment = async (id, e) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this assignment?')) {
      const success = await deleteAssignment(id);
      if (success) {
        const fresh = await getAssignments();
        setAssignments(fresh);
        updateChecklist(fresh);
      }
    }
  };

  const handleSaveAssignmentSubmit = async (e) => {
    e.preventDefault();
    if (!currentAssignment.title.trim()) return;

    const payload = {
      ...currentAssignment,
      questions: (currentAssignment.questions || []).filter(q => q.prompt && q.prompt.trim()),
      evaluation_criteria: (currentAssignment.evaluation_criteria || []).filter(c => c.trim())
    };

    if (modalMode === 'create') {
      await createAssignment(payload);
    } else {
      await updateAssignment(currentAssignment.id, payload);
    }

    const fresh = await getAssignments();
    setAssignments(fresh);
    updateChecklist(fresh);
    setIsModalOpen(false);
  };

  const handleOpenGradingModal = (sub) => {
    setSelectedSubmission(sub);
    setGradingForm({
      status: sub.status === 'Not Graded' ? 'Pass' : sub.status,
      comments: sub.comments || '',
      evaluator: sub.evaluator || 'Administrator',
      score: sub.score !== undefined ? sub.score : 80,
      ai_evaluation: sub.ai_evaluation || null
    });
    setIsGradingOpen(true);
  };

  const handleEvaluateWithAI = async (sub, e) => {
    if (e) e.stopPropagation();
    try {
      setEvaluatingId(sub.id);
      const targetAss = assignments.find(a => a.id === sub.assignment);
      const res = await fetch('/api/evaluate-assignment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: sub.assignment_title,
          question: sub.question || targetAss?.question || '',
          answer: sub.answer || '',
          evaluation_criteria: targetAss?.evaluation_criteria || [],
          sample_answer: targetAss?.answer || '',
          pass_threshold: targetAss?.pass_threshold || 70
        })
      });
      const data = await res.json();
      if (data.success && data.evaluation) {
        setSelectedSubmission(sub);
        setGradingForm({
          status: data.evaluation.suggested_status || 'Pass',
          comments: data.evaluation.summary_feedback || '',
          evaluator: 'Vedika AI + Admin',
          score: data.evaluation.overall_score !== undefined ? data.evaluation.overall_score : 80,
          ai_evaluation: data.evaluation
        });
        setIsGradingOpen(true);
      } else {
        alert(data.error || 'Failed to evaluate submission using AI.');
      }
    } catch (err) {
      console.error('AI evaluation error:', err);
      alert('Error connecting to AI evaluation service.');
    } finally {
      setEvaluatingId(null);
    }
  };

  const handleSaveGrading = async (e) => {
    e.preventDefault();
    if (!selectedSubmission) return;

    await gradeAssignmentSubmission(selectedSubmission.id, gradingForm);
    const fresh = await getAssignmentSubmissions();
    setSubmissions(fresh);
    setIsGradingOpen(false);
  };

  const getCourseTitle = (courseId, customTitle) => {
    if (customTitle) return customTitle;
    const match = courses.find(c => c.id === courseId);
    if (match) return match.title;
    return courseId || 'Unassigned Course';
  };

  const containerPadding = isMobile ? '70px 16px 32px 16px' : '40px';

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
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'flex-start' : 'center',
        gap: 16,
        marginBottom: 24
      }}>
        <div>
          <h1 style={{ color: T.text, fontSize: isMobile ? 22 : 28, fontWeight: 700, margin: 0, letterSpacing: '-0.04em' }}>
            Course Assignments
          </h1>
          <p style={{ color: T.muted, fontSize: 13.5, margin: '4px 0 0' }}>
            Design course challenges and grade student submissions in real-time.
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
          <Plus size={16} /> New Assignment
        </button>
      </div>

      {/* Tabs Menu */}
      <div style={{
        display: 'flex',
        borderBottom: `1px solid ${T.border}`,
        gap: 20,
        marginBottom: 20
      }}>
        <button
          onClick={() => setActiveTab('list')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: `2px solid ${activeTab === 'list' ? T.purple : 'transparent'}`,
            color: activeTab === 'list' ? T.text : T.muted,
            padding: '10px 4px',
            fontSize: 14,
            fontWeight: activeTab === 'list' ? 600 : 400,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Assignments Syllabus
        </button>
        <button
          onClick={() => setActiveTab('submissions')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: `2px solid ${activeTab === 'submissions' ? T.purple : 'transparent'}`,
            color: activeTab === 'submissions' ? T.text : T.muted,
            padding: '10px 4px',
            fontSize: 14,
            fontWeight: activeTab === 'submissions' ? 600 : 400,
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          Student Submissions
          {submissions.filter(s => s.status === 'Not Graded').length > 0 && (
            <span style={{
              background: T.purple,
              color: '#fff',
              fontSize: 10,
              padding: '1px 6px',
              borderRadius: 10,
              fontWeight: 700
            }}>
              {submissions.filter(s => s.status === 'Not Graded').length}
            </span>
          )}
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: '2px solid rgba(155, 110, 248, 0.2)',
            borderTopColor: T.purple,
            animation: 'spin 1s linear infinite'
          }} />
        </div>
      ) : activeTab === 'list' ? (
        /* Tab 1: Assignments Syllabus */
        assignments.length === 0 ? (
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
            minHeight: 280
          }}>
            <FileText size={40} color={T.muted} style={{ marginBottom: 16 }} />
            <h3 style={{ color: T.text, fontSize: 16, margin: '0 0 6px 0' }}>No Assignments Listed</h3>
            <p style={{ color: T.muted, fontSize: 13, maxWidth: 300, margin: '0 0 16px 0' }}>
              Add coding projects, essay prompts, or PDF files for student assessments.
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
                cursor: 'pointer'
              }}
            >
              Add First Assignment
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(360px, 1fr))', gap: 20 }}>
            {assignments.map(ass => (
              <div
                key={ass.id}
                style={{
                  background: T.s1,
                  border: `1px solid ${T.border}`,
                  borderRadius: 12,
                  padding: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
                    <h3 style={{ color: T.text, fontSize: 15.5, fontWeight: 700, margin: 0, lineHeight: 1.3 }}>
                      {ass.title}
                    </h3>
                    
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button
                        onClick={(e) => handleOpenEditModal(ass, e)}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: T.muted, padding: 3, borderRadius: 4 }}
                        onMouseEnter={(e) => e.currentTarget.style.color = T.purple}
                        onMouseLeave={(e) => e.currentTarget.style.color = T.muted}
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={(e) => handleDeleteAssignment(ass.id, e)}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: T.muted, padding: 3, borderRadius: 4 }}
                        onMouseEnter={(e) => e.currentTarget.style.color = T.red}
                        onMouseLeave={(e) => e.currentTarget.style.color = T.muted}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                    <span
                      title={getCourseTitle(ass.course, ass.custom_course_title)}
                      style={{
                        fontSize: 9.5,
                        background: `${T.purple}15`,
                        border: `1px solid ${T.purple}25`,
                        color: T.purple,
                        padding: '3px 8px',
                        borderRadius: 4,
                        maxWidth: 200,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'inline-block'
                      }}
                    >
                      {getCourseTitle(ass.course, ass.custom_course_title)}
                    </span>
                    <span style={{ fontSize: 9.5, background: `${T.accent}15`, border: `1px solid ${T.accent}25`, color: T.accent, padding: '3px 8px', borderRadius: 4, whiteSpace: 'nowrap' }}>
                      Format: {ass.type}
                    </span>
                    {ass.questions?.length > 1 && (
                      <span style={{ fontSize: 9.5, background: `${T.green}15`, border: `1px solid ${T.green}25`, color: T.green, padding: '3px 8px', borderRadius: 4, whiteSpace: 'nowrap' }}>
                        {ass.questions.length} Questions
                      </span>
                    )}
                  </div>

                  {ass.questions && ass.questions.length > 1 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14 }}>
                      {ass.questions.map((q, qIdx) => (
                        <div key={qIdx} style={{ fontSize: 12, color: T.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <span style={{ fontWeight: 600, color: T.purple }}>Q{qIdx + 1}:</span> {q.prompt?.replace(/<[^>]*>/g, '')}
                        </div>
                      ))}
                    </div>
                  ) : (
                    ass.question && (
                      <div
                        style={{ color: T.muted, fontSize: 12.5, lineHeight: 1.5, marginBottom: 14, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}
                        dangerouslySetInnerHTML={{ __html: ass.question }}
                      />
                    )
                  )}
                </div>

                <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: T.muted }}>
                    {ass.show_answer ? 'Sample solution visible' : 'Hidden solution'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Tab 2: Student Submissions */
        submissions.length === 0 ? (
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
            minHeight: 280
          }}>
            <ClipboardList size={40} color={T.muted} style={{ marginBottom: 16 }} />
            <h3 style={{ color: T.text, fontSize: 16, margin: '0 0 6px 0' }}>No Submissions Found</h3>
            <p style={{ color: T.muted, fontSize: 13, maxWidth: 300, margin: 0 }}>
              Students have not submitted response sheets for evaluations yet.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {submissions.map(sub => (
              <div
                key={sub.id}
                style={{
                  background: T.s1,
                  border: `1px solid ${T.border}`,
                  borderRadius: 12,
                  padding: 18,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12
                }}
              >
                {/* Submission Header Info */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <h4 style={{ color: T.text, fontSize: 15, fontWeight: 700, margin: 0 }}>
                      {sub.assignment_title || 'Untitled Assignment'}
                    </h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 6, fontSize: 12, color: T.muted }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: T.text, fontWeight: 600 }}>
                        <User size={12} color={T.accent} /> {sub.member_name || sub.member}
                      </span>
                      <span>•</span>
                      <span>Course: {getCourseTitle(sub.course, sub.custom_course_title)}</span>
                      <span>•</span>
                      <span>Type: {sub.type}</span>
                    </div>
                  </div>
                </div>

                {/* Submission Answer Body */}
                {sub.answer && (
                  <div style={{
                    background: T.s2,
                    border: `1px solid ${T.border}`,
                    padding: 12,
                    borderRadius: 8,
                    fontSize: 12.5,
                    fontFamily: 'monospace',
                    color: T.text,
                    whiteSpace: 'pre-wrap',
                    maxHeight: 180,
                    overflowY: 'auto',
                    wordBreak: 'break-word'
                  }}>
                    {sub.answer}
                  </div>
                )}

                {/* Responsive Action & Grade Status Bar */}
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  borderTop: `1px solid ${T.border}`,
                  paddingTop: 12,
                  marginTop: 4
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {sub.score !== undefined && sub.score !== null && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: T.purple, background: `${T.purple}15`, border: `1px solid ${T.purple}30`, padding: '4px 10px', borderRadius: 6, whiteSpace: 'nowrap' }}>
                        Score: {sub.score}/100
                      </span>
                    )}

                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: 6,
                      whiteSpace: 'nowrap',
                      background: sub.status === 'Pass' ? `${T.green}18` : sub.status === 'Fail' ? `${T.red}18` : `${T.amber}18`,
                      border: `1px solid ${sub.status === 'Pass' ? T.green : sub.status === 'Fail' ? T.red : T.amber}25`,
                      color: sub.status === 'Pass' ? T.green : sub.status === 'Fail' ? T.red : T.amber
                    }}>
                      {sub.status.toUpperCase()}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={(e) => handleEvaluateWithAI(sub, e)}
                      disabled={evaluatingId === sub.id}
                      style={{
                        background: 'linear-gradient(135deg, rgba(155, 110, 248, 0.15), rgba(91, 140, 248, 0.15))',
                        border: `1px solid ${T.purple}40`,
                        color: T.purple,
                        padding: '6px 14px',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        cursor: evaluatingId === sub.id ? 'wait' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      {evaluatingId === sub.id ? (
                        <>
                          <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Evaluating...
                        </>
                      ) : (
                        <>
                          <Sparkles size={12} /> Evaluate with AI
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleOpenGradingModal(sub)}
                      style={{
                        background: 'rgba(91, 140, 248, 0.1)',
                        border: `1px solid rgba(91, 140, 248, 0.25)`,
                        color: T.accent,
                        padding: '6px 14px',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5
                      }}
                    >
                      <Star size={12} /> Grade / Review
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Assignment Setup Modal */}
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
            maxWidth: 640,
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: `1px solid ${T.border}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              position: 'sticky',
              top: 0,
              background: T.s1,
              zIndex: 10
            }}>
              <h3 style={{ margin: 0, color: T.text, fontSize: 16, fontWeight: 700 }}>
                {modalMode === 'create' ? 'Create Assignment Prompt' : 'Edit Assignment Prompt'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: T.muted, padding: 0 }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSaveAssignmentSubmit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Assignment Title */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: T.text }}>Assignment Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Implement Fibonacci Sequence Generator"
                  value={currentAssignment.title}
                  onChange={(e) => setCurrentAssignment({ ...currentAssignment, title: e.target.value })}
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {/* Course Select */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: T.text }}>Course Curriculum</label>
                  <select
                    value={currentAssignment.custom_course_title ? 'CUSTOM' : currentAssignment.course}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'CUSTOM') {
                        setCurrentAssignment({ ...currentAssignment, course: 'CUSTOM', custom_course_title: currentAssignment.custom_course_title || 'Custom Module Topic' });
                      } else {
                        setCurrentAssignment({ ...currentAssignment, course: val, custom_course_title: '' });
                      }
                    }}
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
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                    <option value="CUSTOM">+ Enter Custom Course / Module Name</option>
                  </select>
                </div>

                {/* Assignment Type */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: T.text }}>Response Mode</label>
                  <select
                    value={currentAssignment.type}
                    onChange={(e) => setCurrentAssignment({ ...currentAssignment, type: e.target.value })}
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
                    <option value="Text">Online Text editor</option>
                    <option value="PDF">PDF File Attachment</option>
                    <option value="Document">Word Document</option>
                    <option value="URL">Submission URL link</option>
                    <option value="Image">Screenshots / Image</option>
                  </select>
                </div>
              </div>

              {/* Custom Course Name Input if selected */}
              {(currentAssignment.course === 'CUSTOM' || currentAssignment.custom_course_title) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: T.purple }}>Custom Course / Module Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Learn Python - Full Course for Beginners"
                    value={currentAssignment.custom_course_title}
                    onChange={(e) => setCurrentAssignment({ ...currentAssignment, custom_course_title: e.target.value })}
                    style={{
                      background: T.s2,
                      border: `1px solid ${T.purple}40`,
                      borderRadius: 8,
                      padding: '9px 12px',
                      color: T.text,
                      fontSize: 13,
                      outline: 'none',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>
              )}

              {/* Questions Builder Section (Multiple Questions Supported) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: T.s2, border: `1px solid ${T.border}`, padding: 14, borderRadius: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: T.text, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FileText size={14} color={T.purple} /> Assignment Questions ({currentAssignment.questions?.length || 1})
                  </label>
                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    style={{ background: `${T.purple}20`, border: `1px solid ${T.purple}40`, color: T.purple, padding: '4px 10px', borderRadius: 6, fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}
                  >
                    + Add Question
                  </button>
                </div>

                {(currentAssignment.questions || []).map((q, qIdx) => (
                  <div key={q.id || qIdx} style={{ background: T.s1, border: `1px solid ${T.border}`, borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: T.purple }}>Question {qIdx + 1}</span>
                      {currentAssignment.questions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(qIdx)}
                          style={{ background: 'transparent', border: 'none', color: T.red, cursor: 'pointer', padding: 2 }}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>

                    <textarea
                      placeholder={`Enter prompt question ${qIdx + 1} (HTML or markdown)...`}
                      value={q.prompt || ''}
                      onChange={(e) => handleQuestionChange(qIdx, 'prompt', e.target.value)}
                      required
                      style={{
                        background: T.s2,
                        border: `1px solid ${T.border}`,
                        borderRadius: 6,
                        padding: '8px 10px',
                        color: T.text,
                        fontSize: 12.5,
                        outline: 'none',
                        fontFamily: 'inherit',
                        minHeight: 65,
                        resize: 'vertical'
                      }}
                    />

                    {currentAssignment.show_answer && (
                      <textarea
                        placeholder={`Official Sample Solution for Question ${qIdx + 1}...`}
                        value={q.sample_answer || ''}
                        onChange={(e) => handleQuestionChange(qIdx, 'sample_answer', e.target.value)}
                        style={{
                          background: T.s2,
                          border: `1px solid ${T.border}`,
                          borderRadius: 6,
                          padding: '8px 10px',
                          color: T.text,
                          fontSize: 12,
                          outline: 'none',
                          fontFamily: 'monospace',
                          minHeight: 50,
                          resize: 'vertical'
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Custom Evaluation Criteria Builder */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: T.s2, border: `1px solid ${T.border}`, padding: 14, borderRadius: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: T.purple, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Sparkles size={14} /> Custom Evaluation Criteria / Rubric Points
                  </label>
                  <button
                    type="button"
                    onClick={handleAddCriterion}
                    style={{ background: `${T.purple}20`, border: `1px solid ${T.purple}40`, color: T.purple, padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                  >
                    + Add Criterion Point
                  </button>
                </div>
                <p style={{ margin: 0, fontSize: 11, color: T.muted }}>
                  Define specific points for AI to evaluate student submissions against.
                </p>
                {(currentAssignment.evaluation_criteria || []).map((crit, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: T.muted, width: 16 }}>{idx + 1}.</span>
                    <input
                      type="text"
                      placeholder="e.g. Must handle edge case n <= 0"
                      value={crit}
                      onChange={(e) => handleCriterionChange(idx, e.target.value)}
                      style={{
                        flex: 1,
                        background: T.s1,
                        border: `1px solid ${T.border}`,
                        borderRadius: 6,
                        padding: '6px 10px',
                        color: T.text,
                        fontSize: 12.5,
                        outline: 'none'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveCriterion(idx)}
                      style={{ background: 'transparent', border: 'none', color: T.red, cursor: 'pointer', padding: 4 }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}

                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 4, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: T.text }}>Passing Threshold (%):</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={currentAssignment.pass_threshold || 70}
                      onChange={(e) => setCurrentAssignment({ ...currentAssignment, pass_threshold: Number(e.target.value) })}
                      style={{ width: 65, background: T.s1, border: `1px solid ${T.border}`, borderRadius: 6, padding: '4px 8px', color: T.text, fontSize: 12, outline: 'none' }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: T.purple }}>Min Response Chars:</label>
                    <input
                      type="number"
                      min="0"
                      max="1000"
                      value={currentAssignment.min_char_count !== undefined ? currentAssignment.min_char_count : 20}
                      onChange={(e) => setCurrentAssignment({ ...currentAssignment, min_char_count: Number(e.target.value) })}
                      style={{ width: 65, background: T.s1, border: `1px solid ${T.purple}40`, borderRadius: 6, padding: '4px 8px', color: T.text, fontSize: 12, outline: 'none' }}
                    />
                  </div>
                </div>
              </div>

              {/* Answer details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    id="show_answer"
                    checked={currentAssignment.show_answer}
                    onChange={(e) => setCurrentAssignment({ ...currentAssignment, show_answer: e.target.checked })}
                    style={{ accentColor: T.purple }}
                  />
                  <label htmlFor="show_answer" style={{ fontSize: 12, fontWeight: 600, color: T.text, cursor: 'pointer' }}>
                    Show Sample Solution after student submits
                  </label>
                </div>
                {currentAssignment.show_answer && (
                  <textarea
                    placeholder="Enter the official sample solution..."
                    value={currentAssignment.answer}
                    onChange={(e) => setCurrentAssignment({ ...currentAssignment, answer: e.target.value })}
                    style={{
                      background: T.s2,
                      border: `1px solid ${T.border}`,
                      borderRadius: 8,
                      padding: '9px 12px',
                      color: T.text,
                      fontSize: 13,
                      outline: 'none',
                      fontFamily: 'inherit',
                      minHeight: 80,
                      marginTop: 6,
                      resize: 'vertical'
                    }}
                  />
                )}
              </div>

              {/* Action buttons */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
                borderTop: `1px solid ${T.border}`,
                paddingTop: 16,
                marginTop: 8
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
                  {modalMode === 'create' ? 'Create Assignment' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student grading review modal */}
      {isGradingOpen && selectedSubmission && (
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
            maxWidth: 640,
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: `1px solid ${T.border}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              position: 'sticky',
              top: 0,
              background: T.s1,
              zIndex: 10
            }}>
              <h3 style={{ margin: 0, color: T.text, fontSize: 16, fontWeight: 700 }}>
                Evaluate Submission — {selectedSubmission.member_name || selectedSubmission.member}
              </h3>
              <button
                onClick={() => setIsGradingOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: T.muted, padding: 0 }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSaveGrading} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              
              <div>
                <span style={{ fontSize: 12, color: T.muted, fontWeight: 600 }}>STUDENT SUBMISSION ANSWER:</span>
                <div style={{
                  marginTop: 6,
                  background: T.s2,
                  border: `1px solid ${T.border}`,
                  padding: 12,
                  borderRadius: 8,
                  fontFamily: 'monospace',
                  fontSize: 12.5,
                  maxHeight: 160,
                  overflowY: 'auto',
                  color: T.text,
                  whiteSpace: 'pre-wrap'
                }}>
                  {selectedSubmission.answer}
                </div>
              </div>

              {/* AI Evaluation Report Breakdown View */}
              {gradingForm.ai_evaluation && (
                <div style={{ background: T.s2, border: `1px solid ${T.purple}40`, borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: T.purple, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Sparkles size={14} /> AI Analysis Score: {gradingForm.score}/100
                    </span>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                      background: gradingForm.status === 'Pass' ? `${T.green}18` : `${T.red}18`,
                      color: gradingForm.status === 'Pass' ? T.green : T.red,
                      border: `1px solid ${gradingForm.status === 'Pass' ? T.green : T.red}30`
                    }}>
                      Suggested Status: {gradingForm.status.toUpperCase()}
                    </span>
                  </div>

                  {Array.isArray(gradingForm.ai_evaluation.criteria_breakdown) && gradingForm.ai_evaluation.criteria_breakdown.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: T.text }}>Evaluation Criteria Breakdown & Evidence:</span>
                      {gradingForm.ai_evaluation.criteria_breakdown.map((cb, idx) => (
                        <div key={idx} style={{ background: T.s1, border: `1px solid ${T.border}`, borderRadius: 8, padding: 10, fontSize: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 600, color: T.text }}>{cb.criterion}</span>
                            <span style={{
                              fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
                              color: cb.status === 'Passed' ? T.green : cb.status === 'Partial' ? T.amber : T.red,
                              background: cb.status === 'Passed' ? `${T.green}15` : cb.status === 'Partial' ? `${T.amber}15` : `${T.red}15`
                            }}>
                              {cb.status} ({cb.score_earned}/{cb.max_score} pts)
                            </span>
                          </div>
                          {cb.evidence_quote && (
                            <p style={{ margin: '4px 0 0', color: T.muted, fontSize: 11, fontStyle: 'italic' }}>
                              Quote/Evidence: "{cb.evidence_quote}"
                            </p>
                          )}
                          {cb.feedback && (
                            <p style={{ margin: '4px 0 0', color: T.text, fontSize: 11.5 }}>
                              {cb.feedback}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Score Input */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: T.text }}>Evaluation Status</label>
                  <select
                    value={gradingForm.status}
                    onChange={(e) => setGradingForm({ ...gradingForm, status: e.target.value })}
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
                    <option value="Pass">Pass (Meets Requirements)</option>
                    <option value="Fail">Fail (Needs revision)</option>
                    <option value="Not Graded">Not Graded (Reset status)</option>
                    <option value="Not Applicable">Not Applicable</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: T.text }}>Score (0 - 100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={gradingForm.score}
                    onChange={(e) => setGradingForm({ ...gradingForm, score: Number(e.target.value) })}
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
              </div>

              {/* Evaluation comments */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: T.text }}>Instructor Review Comments</label>
                <textarea
                  placeholder="Provide feedback to the student..."
                  value={gradingForm.comments}
                  onChange={(e) => setGradingForm({ ...gradingForm, comments: e.target.value })}
                  style={{
                    background: T.s2,
                    border: `1px solid ${T.border}`,
                    borderRadius: 8,
                    padding: '9px 12px',
                    color: T.text,
                    fontSize: 13,
                    outline: 'none',
                    fontFamily: 'inherit',
                    minHeight: 90,
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Action buttons */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
                borderTop: `1px solid ${T.border}`,
                paddingTop: 16,
                marginTop: 8
              }}>
                <button
                  type="button"
                  onClick={() => setIsGradingOpen(false)}
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
                  Submit Review & Publish Grade
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
