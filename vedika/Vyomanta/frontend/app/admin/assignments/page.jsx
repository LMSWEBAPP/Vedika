'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, GraduationCap, ClipboardList, CheckCircle, FileText, Star, User } from 'lucide-react';
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
    answer: ''
  });

  // Grading Modal
  const [isGradingOpen, setIsGradingOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [gradingForm, setGradingForm] = useState({
    status: 'Pass',
    comments: '',
    evaluator: 'Administrator'
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
          // Marking 'chapter' as complete when an assignment is registered as part of curriculum mapping
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
      type: 'Text',
      question: '',
      show_answer: false,
      answer: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (ass, e) => {
    e.stopPropagation();
    setModalMode('edit');
    setCurrentAssignment({ ...ass });
    setIsModalOpen(true);
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

    if (modalMode === 'create') {
      await createAssignment(currentAssignment);
    } else {
      await updateAssignment(currentAssignment.id, currentAssignment);
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
      evaluator: 'Administrator'
    });
    setIsGradingOpen(true);
  };

  const handleSaveGrading = async (e) => {
    e.preventDefault();
    if (!selectedSubmission) return;

    await gradeAssignmentSubmission(selectedSubmission.id, gradingForm);
    const fresh = await getAssignmentSubmissions();
    setSubmissions(fresh);
    setIsGradingOpen(false);
  };

  const getCourseTitle = (courseId) => {
    return courses.find(c => c.id === courseId)?.title || 'Unassigned Course';
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

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <span style={{ fontSize: 9.5, background: `${T.purple}15`, border: `1px solid ${T.purple}25`, color: T.purple, padding: '2px 8px', borderRadius: 4 }}>
                      {getCourseTitle(ass.course)}
                    </span>
                    <span style={{ fontSize: 9.5, background: `${T.accent}15`, border: `1px solid ${T.accent}25`, color: T.accent, padding: '2px 8px', borderRadius: 4 }}>
                      Format: {ass.type}
                    </span>
                  </div>

                  {ass.question && (
                    <div
                      style={{ color: T.muted, fontSize: 12.5, lineHeight: 1.5, marginBottom: 14, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}
                      dangerouslySetInnerHTML={{ __html: ass.question }}
                    />
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {submissions.map(sub => (
              <div
                key={sub.id}
                style={{
                  background: T.s1,
                  border: `1px solid ${T.border}`,
                  borderRadius: 12,
                  padding: 16,
                  display: 'flex',
                  flexDirection: isMobile ? 'column' : 'row',
                  justifyContent: 'space-between',
                  alignItems: isMobile ? 'flex-start' : 'center',
                  gap: 16
                }}
              >
                <div>
                  <h4 style={{ color: T.text, fontSize: 14.5, fontWeight: 700, margin: 0 }}>
                    {sub.assignment_title || 'Untitled Assignment'}
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 6, fontSize: 12.5, color: T.muted }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <User size={12} color={T.accent} /> {sub.member_name || sub.member}
                    </span>
                    <span>•</span>
                    <span>Course: {getCourseTitle(sub.course)}</span>
                    <span>•</span>
                    <span>Type: {sub.type}</span>
                  </div>

                  {sub.answer && (
                    <div style={{
                      marginTop: 10,
                      background: T.s2,
                      border: `1px solid ${T.border}`,
                      padding: 10,
                      borderRadius: 6,
                      fontSize: 12.5,
                      fontFamily: 'monospace',
                      color: T.text,
                      whiteSpace: 'pre-wrap'
                    }}>
                      {sub.answer}
                    </div>
                  )}
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  justifyContent: 'space-between',
                  width: isMobile ? '100%' : 'auto',
                  borderTop: isMobile ? `1px solid ${T.border}` : 'none',
                  paddingTop: isMobile ? 12 : 0,
                  marginTop: isMobile ? 8 : 0
                }}>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: 4,
                    background: sub.status === 'Pass' ? `${T.green}18` : sub.status === 'Fail' ? `${T.red}18` : `${T.amber}18`,
                    border: `1px solid ${sub.status === 'Pass' ? T.green : sub.status === 'Fail' ? T.red : T.amber}25`,
                    color: sub.status === 'Pass' ? T.green : sub.status === 'Fail' ? T.red : T.amber
                  }}>
                    {sub.status.toUpperCase()}
                  </span>

                  <button
                    onClick={() => handleOpenGradingModal(sub)}
                    style={{
                      background: 'rgba(91, 140, 248, 0.1)',
                      border: `1px solid rgba(91, 140, 248, 0.25)`,
                      color: T.accent,
                      padding: '5px 12px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <Star size={12} /> Grade / Review
                  </button>
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
            maxWidth: 500,
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            overflow: 'hidden'
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
                    value={currentAssignment.course}
                    onChange={(e) => setCurrentAssignment({ ...currentAssignment, course: e.target.value })}
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

              {/* Assignment Prompt / Question */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: T.text }}>Prompt Question (HTML or markdown)</label>
                <textarea
                  placeholder="e.g. Write a Python function fibonacci(n) that..."
                  value={currentAssignment.question}
                  onChange={(e) => setCurrentAssignment({ ...currentAssignment, question: e.target.value })}
                  required
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
                    resize: 'vertical'
                  }}
                />
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
            maxWidth: 500,
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            overflow: 'hidden'
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
                Evaluate Submission
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
                <span style={{ fontSize: 12, color: T.muted }}>STUDENT SUBMISSION ANSWER:</span>
                <div style={{
                  marginTop: 6,
                  background: T.s2,
                  border: `1px solid ${T.border}`,
                  padding: 12,
                  borderRadius: 8,
                  fontFamily: 'monospace',
                  fontSize: 12.5,
                  maxHeight: 180,
                  overflowY: 'auto',
                  color: T.text,
                  whiteSpace: 'pre-wrap'
                }}>
                  {selectedSubmission.answer}
                </div>
              </div>

              {/* Status Select */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: T.text }}>Evaluation Grade</label>
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
                    minHeight: 100,
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
                  Submit Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
