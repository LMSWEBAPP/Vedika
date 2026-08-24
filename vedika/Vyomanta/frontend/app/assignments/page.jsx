'use client';

import { useState, useEffect } from 'react';
import { FileText, Clock, CheckCircle, X, ChevronRight, HelpCircle, ArrowLeft, Send, AlertCircle } from 'lucide-react';
import { T } from '@/lib/lms-data';
import { useMediaQuery, isMobileMQ } from '@/lib/useMediaQuery';
import { getAssignments, getAssignmentSubmissions, submitAssignmentResponse, getCourses, parseQuestionsList } from '@/lib/frappe';

export default function StudentAssignmentsPage() {
  const isMobile = useMediaQuery(isMobileMQ);

  // States
  const [assignments, setAssignments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  // Active Assignment Submission Modal
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [isViewingPrompt, setIsViewingPrompt] = useState(false);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [questionAnswers, setQuestionAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('frappe_user');
    if (stored) {
      try {
        setCurrentUser(JSON.parse(stored));
      } catch (e) {}
    }
  }, []);

  // Fetch all initial data
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [assList, courseList, submissionList] = await Promise.all([
          getAssignments(),
          getCourses(),
          getAssignmentSubmissions()
        ]);
        setAssignments(assList || []);
        setCourses(courseList || []);
        setSubmissions(submissionList || []);
      } catch (e) {
        console.error("Failed to load assignments", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [currentUser]);

  const handleOpenPrompt = (ass) => {
    const resolvedQuestions = parseQuestionsList(ass.question || '', ass.questions, ass.answer);
    const targetAss = { ...ass, questions: resolvedQuestions };
    setSelectedAssignment(targetAss);
    setSuccessMessage('');
    setActiveQuestionIndex(0);
    
    // Check if there is an existing submission to prepopulate
    const existingSub = submissions.find(s => s.assignment === ass.id && (s.member === currentUser?.username || s.member === currentUser?.email));
    
    const initialAns = {};
    if (existingSub && existingSub.answer) {
      initialAns[0] = existingSub.answer;
    }
    setQuestionAnswers(initialAns);
    setIsViewingPrompt(true);
  };

  const handleAssignmentSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAssignment || !currentUser) return;

    const qList = parseQuestionsList(selectedAssignment.question || '', selectedAssignment.questions, selectedAssignment.answer);

    const minChars = selectedAssignment.min_char_count !== undefined ? selectedAssignment.min_char_count : 20;

    // Validate that EVERY question meets the minimum requirement
    for (let i = 0; i < qList.length; i++) {
      const text = (questionAnswers[i] || '').trim();
      if (selectedAssignment.type === 'Text') {
        if (text.length < minChars) {
          alert(`Question ${i + 1} requires at least ${minChars} characters before submitting. Currently: ${text.length} characters.`);
          setActiveQuestionIndex(i);
          return;
        }
      } else {
        if (!text) {
          alert(`Please provide a response for Question ${i + 1}.`);
          setActiveQuestionIndex(i);
          return;
        }
      }
    }

    const fullAnswerText = qList.map((q, idx) => {
      const ans = (questionAnswers[idx] || '').trim();
      return qList.length > 1 ? `[Question ${idx + 1}]\n${ans}` : ans;
    }).join('\n\n');

    setSubmitting(true);
    setSuccessMessage('');

    try {
      const subPayload = {
        assignment: selectedAssignment.id,
        assignment_title: selectedAssignment.title,
        type: selectedAssignment.type || 'Text',
        member: currentUser.username || currentUser.email,
        member_name: currentUser.name || 'Student',
        answer: fullAnswerText,
        course: selectedAssignment.course,
        question: selectedAssignment.question || ''
      };

      await submitAssignmentResponse(subPayload);
      setSuccessMessage('Assignment submitted successfully! An instructor will review and grade your work.');
      
      // Reload submissions list
      const freshSubs = await getAssignmentSubmissions();
      setSubmissions(freshSubs || []);
    } catch (e) {
      console.error(e);
      alert("Failed to submit assignment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Helper to map course ID to name
  const getCourseName = (ass) => {
    if (ass.custom_course_title) return ass.custom_course_title;
    return courses.find(c => c.id === ass.course)?.title || ass.course || "Course Topic";
  };

  // Helper to get assignment submission status
  const getAssignmentStatus = (assId) => {
    if (!currentUser) return { status: 'Not Submitted', comments: null, evaluator: null, score: null, ai_evaluation: null };
    
    const sub = submissions.find(s => s.assignment === assId && (s.member === currentUser.username || s.member === currentUser.email));
    if (!sub) return { status: 'Not Submitted', comments: null, evaluator: null, score: null, ai_evaluation: null };

    return {
      status: sub.status || 'Not Graded',
      comments: sub.comments,
      evaluator: sub.evaluator,
      answer: sub.answer,
      score: sub.score,
      ai_evaluation: sub.ai_evaluation
    };
  };

  const containerPadding = isMobile ? '70px 16px 32px 16px' : '40px';
  const gridColumns = isMobile ? '1fr' : 'repeat(auto-fill, minmax(350px, 1fr))';

  return (
    <div style={{
      padding: containerPadding,
      maxWidth: 1200,
      margin: '0 auto',
      fontFamily: 'var(--font-outfit), sans-serif',
      color: T.text
    }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ color: T.text, fontSize: isMobile ? 22 : 28, fontWeight: 700, margin: 0, letterSpacing: '-0.04em' }}>
          Course Assignments
        </h1>
        <p style={{ color: T.muted, fontSize: 13.5, margin: '4px 0 0' }}>
          Submit curriculum challenges, view feedback, and coordinate grades directly with instructors.
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 240 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            border: '2px solid rgba(155, 110, 248, 0.2)', borderTopColor: T.purple,
            animation: 'spin 1s linear infinite'
          }} />
        </div>
      ) : assignments.length === 0 ? (
        <div style={{
          background: T.s1, border: `1px solid ${T.border}`, borderRadius: 14,
          padding: '64px 20px', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', textAlign: 'center', minHeight: 300
        }}>
          <FileText size={48} color={T.muted} style={{ marginBottom: 16 }} />
          <h3 style={{ color: T.text, fontSize: 16, margin: '0 0 6px 0' }}>No Assignments Listed</h3>
          <p style={{ color: T.muted, fontSize: 13, maxWidth: 300, margin: 0 }}>
            There are no course assignments assigned to your curriculum at this moment.
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: gridColumns,
          gap: 20
        }}>
          {assignments.map((ass) => {
            const subStatus = getAssignmentStatus(ass.id);
            return (
              <div
                key={ass.id}
                style={{
                  background: T.s1,
                  border: `1px solid ${T.border}`,
                  borderRadius: 12,
                  padding: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'all 0.2s',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
                    <h3 style={{ color: T.text, fontSize: 15.5, fontWeight: 700, margin: 0, lineHeight: 1.3 }}>
                      {ass.title}
                    </h3>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                    <span
                      title={getCourseName(ass)}
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
                      {getCourseName(ass)}
                    </span>
                    <span style={{ fontSize: 9.5, background: `${T.accent}15`, border: `1px solid ${T.accent}25`, color: T.accent, padding: '3px 8px', borderRadius: 4, whiteSpace: 'nowrap' }}>
                      Mode: {ass.type}
                    </span>
                    {ass.questions?.length > 1 && (
                      <span style={{ fontSize: 9.5, background: `${T.green}15`, border: `1px solid ${T.green}25`, color: T.green, padding: '3px 8px', borderRadius: 4, whiteSpace: 'nowrap' }}>
                        {ass.questions.length} Questions
                      </span>
                    )}
                  </div>

                  {ass.questions && ass.questions.length > 1 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: '0 0 16px 0' }}>
                      {ass.questions.map((q, qIdx) => (
                        <div
                          key={qIdx}
                          style={{
                            fontSize: 12.5,
                            color: T.muted,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            lineHeight: 1.4
                          }}
                        >
                          <span style={{ fontWeight: 700, color: T.purple, marginRight: 6 }}>Q{qIdx + 1}:</span>
                          {q.prompt?.replace(/<[^>]*>/g, '') || ''}
                        </div>
                      ))}
                    </div>
                  ) : (
                    ass.question && (
                      <p
                        style={{
                          color: T.muted,
                          fontSize: 12.5,
                          lineHeight: 1.5,
                          margin: '0 0 16px 0',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}
                        dangerouslySetInnerHTML={{ __html: ass.question }}
                      />
                    )
                  )}
                </div>

                <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {/* Status Indicator */}
                  <div>
                    {subStatus.status === 'Pass' && (
                      <span style={{ fontSize: 11.5, color: T.green, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                        <CheckCircle size={13} /> Passed {subStatus.score !== null && subStatus.score !== undefined ? `(${subStatus.score}/100)` : ''}
                      </span>
                    )}
                    {subStatus.status === 'Fail' && (
                      <span style={{ fontSize: 11.5, color: T.red, fontWeight: 600 }}>
                        Rejected / Fail {subStatus.score !== null && subStatus.score !== undefined ? `(${subStatus.score}/100)` : ''}
                      </span>
                    )}
                    {subStatus.status === 'Not Graded' && (
                      <span style={{ fontSize: 11.5, color: T.amber, fontWeight: 600 }}>
                        Pending Grade
                      </span>
                    )}
                    {subStatus.status === 'Not Submitted' && (
                      <span style={{ fontSize: 11.5, color: T.muted }}>
                        Not Submitted
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => handleOpenPrompt(ass)}
                    style={{
                      background: subStatus.status === 'Pass' ? T.s2 : T.purple,
                      color: subStatus.status === 'Pass' ? T.text : '#fff',
                      border: subStatus.status === 'Pass' ? `1px solid ${T.border}` : 'none',
                      padding: '7px 14px',
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    {subStatus.status === 'Not Submitted' ? 'Submit Solution' : 'View Submission'} <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Submission Modal */}
      {isViewingPrompt && selectedAssignment && (
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
          {(() => {
            const qList = parseQuestionsList(selectedAssignment.question || '', selectedAssignment.questions, selectedAssignment.answer);
            const currentQ = qList[activeQuestionIndex] || qList[0];
            const isLastQuestion = activeQuestionIndex === qList.length - 1;

            return (
              <div style={{
                background: T.s1,
                border: `1px solid ${T.border}`,
                borderRadius: 16,
                width: '100%',
                maxWidth: 640,
                boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                maxHeight: '85vh',
                display: 'flex',
                flexDirection: 'column'
              }}>
                {/* Modal Header */}
                <div style={{
                  padding: '18px 24px',
                  borderBottom: `1px solid ${T.border}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <h2 style={{ margin: 0, color: T.text, fontSize: 16, fontWeight: 700 }}>
                      {selectedAssignment.title}
                    </h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                      <span style={{ fontSize: 11.5, color: T.muted }}>
                        Mode: {selectedAssignment.type}
                      </span>
                      {qList.length > 1 && (
                        <span style={{ fontSize: 11, background: `${T.purple}20`, color: T.purple, padding: '1px 8px', borderRadius: 10, fontWeight: 700 }}>
                          Question {activeQuestionIndex + 1} of {qList.length}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setIsViewingPrompt(false)}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: T.muted, padding: 0 }}
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Question Step Pills */}
                {qList.length > 1 && (
                  <div style={{ display: 'flex', gap: 8, padding: '12px 24px', borderBottom: `1px solid ${T.border}`, background: T.s2 }}>
                    {qList.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveQuestionIndex(idx)}
                        style={{
                          flex: 1,
                          padding: '6px 0',
                          fontSize: 12,
                          fontWeight: 700,
                          borderRadius: 6,
                          border: activeQuestionIndex === idx ? `1px solid ${T.purple}` : `1px solid ${T.border}`,
                          background: activeQuestionIndex === idx ? `${T.purple}25` : 'transparent',
                          color: activeQuestionIndex === idx ? T.purple : T.muted,
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        Q{idx + 1}
                      </button>
                    ))}
                  </div>
                )}

                {/* Scrollable Modal Content */}
                <div style={{ padding: 24, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
                  
                  {/* Current Question Box */}
                  <div>
                    <h4 style={{ color: T.text, fontSize: 13.5, fontWeight: 700, margin: '0 0 8px 0' }}>
                      {qList.length > 1 ? `Question ${activeQuestionIndex + 1} Prompt` : 'Assignment Prompt'}
                    </h4>
                    <div
                      style={{
                        color: T.text,
                        fontSize: 13.5,
                        lineHeight: 1.6,
                        background: T.s2,
                        padding: 16,
                        borderRadius: 8,
                        border: `1px solid ${T.border}`
                      }}
                      dangerouslySetInnerHTML={{ __html: currentQ.prompt || 'No prompt details specified.' }}
                    />
                  </div>

                  {/* Status & Feedback box if submitted */}
                  {(() => {
                    const subStatus = getAssignmentStatus(selectedAssignment.id);
                    if (subStatus.status === 'Not Submitted') return null;

                    return (
                      <div style={{
                        background: subStatus.status === 'Pass' ? 'rgba(46, 213, 115, 0.05)' : subStatus.status === 'Fail' ? 'rgba(245, 91, 107, 0.05)' : 'rgba(255, 165, 2, 0.05)',
                        border: `1px solid ${subStatus.status === 'Pass' ? `${T.green}30` : subStatus.status === 'Fail' ? `${T.red}30` : `${T.amber}30`}`,
                        padding: 14,
                        borderRadius: 8,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: subStatus.status === 'Pass' ? T.green : subStatus.status === 'Fail' ? T.red : T.amber }}>
                            Status: {subStatus.status === 'Pass' ? 'PASSED' : subStatus.status === 'Fail' ? 'REJECTED' : 'PENDING EVALUATION'}
                          </div>
                          {subStatus.score !== null && subStatus.score !== undefined && (
                            <span style={{ fontSize: 12, fontWeight: 700, color: T.purple }}>
                              Score: {subStatus.score}/100
                            </span>
                          )}
                        </div>
                        {subStatus.comments && (
                          <div style={{ fontSize: 12.5, color: T.text, fontStyle: 'italic' }}>
                            &ldquo;{subStatus.comments}&rdquo; <span style={{ color: T.muted, fontSize: 11, fontStyle: 'normal' }}>— Evaluated by {subStatus.evaluator || 'Instructor'}</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Submission Form */}
                  <form onSubmit={handleAssignmentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={{ fontSize: 13, fontWeight: 700, color: T.text }}>
                        {qList.length > 1 ? `Your Answer for Question ${activeQuestionIndex + 1}` : 'Your Response Solution'}
                      </label>
                      
                      {selectedAssignment.type === 'Text' ? (
                        <textarea
                          required
                          placeholder={`Type code or answer for Question ${activeQuestionIndex + 1}...`}
                          value={questionAnswers[activeQuestionIndex] || ''}
                          onChange={(e) => setQuestionAnswers({ ...questionAnswers, [activeQuestionIndex]: e.target.value })}
                          disabled={getAssignmentStatus(selectedAssignment.id).status === 'Pass'}
                          style={{
                            background: T.s2,
                            border: `1px solid ${T.border}`,
                            borderRadius: 8,
                            padding: '10px 12px',
                            color: T.text,
                            fontSize: 13,
                            outline: 'none',
                            fontFamily: 'monospace',
                            minHeight: 130,
                            resize: 'vertical'
                          }}
                        />
                      ) : (
                        <input
                          type="text"
                          required
                          placeholder={selectedAssignment.type === 'URL' ? "https://github.com/your-repo" : "Submit file link or description"}
                          value={questionAnswers[activeQuestionIndex] || ''}
                          onChange={(e) => setQuestionAnswers({ ...questionAnswers, [activeQuestionIndex]: e.target.value })}
                          disabled={getAssignmentStatus(selectedAssignment.id).status === 'Pass'}
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
                      {selectedAssignment.type === 'Text' && (() => {
                        const minChars = selectedAssignment.min_char_count !== undefined ? selectedAssignment.min_char_count : 20;
                        const currentLen = (questionAnswers[activeQuestionIndex] || '').trim().length;
                        return (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2, fontSize: 11.5 }}>
                            {currentLen < minChars ? (
                              <span style={{ color: T.amber, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <AlertCircle size={12} /> {currentLen} / {minChars} min characters required
                              </span>
                            ) : (
                              <span style={{ color: T.green, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <CheckCircle size={12} /> {currentLen} characters (meets min length)
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    {successMessage && (
                      <div style={{
                        background: 'rgba(46, 213, 115, 0.1)',
                        border: `1px solid rgba(46, 213, 115, 0.25)`,
                        color: T.green,
                        padding: '10px 12px',
                        borderRadius: 8,
                        fontSize: 12.5
                      }}>
                        {successMessage}
                      </div>
                    )}

                    {/* Stepper & Footer Buttons */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderTop: `1px solid ${T.border}`,
                      paddingTop: 16,
                      marginTop: 10
                    }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {activeQuestionIndex > 0 && (
                          <button
                            type="button"
                            onClick={() => setActiveQuestionIndex(prev => prev - 1)}
                            style={{
                              background: 'transparent',
                              border: `1px solid ${T.border}`,
                              color: T.text,
                              padding: '8px 14px',
                              borderRadius: 8,
                              fontSize: 12.5,
                              cursor: 'pointer'
                            }}
                          >
                            Previous Question
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setIsViewingPrompt(false)}
                          style={{
                            background: 'transparent',
                            border: `1px solid ${T.border}`,
                            color: T.muted,
                            padding: '8px 14px',
                            borderRadius: 8,
                            fontSize: 12.5,
                            cursor: 'pointer'
                          }}
                        >
                          Close
                        </button>
                      </div>

                      {getAssignmentStatus(selectedAssignment.id).status !== 'Pass' && (
                        !isLastQuestion ? (
                          <button
                            type="button"
                            onClick={() => {
                              const minChars = selectedAssignment.min_char_count !== undefined ? selectedAssignment.min_char_count : 20;
                              const currentText = (questionAnswers[activeQuestionIndex] || '').trim();
                              if (selectedAssignment.type === 'Text' && currentText.length < minChars) {
                                alert(`Please enter at least ${minChars} characters for Question ${activeQuestionIndex + 1} before moving to the next question. Currently: ${currentText.length} characters.`);
                                return;
                              }
                              if (!currentText) {
                                alert(`Please provide a response for Question ${activeQuestionIndex + 1} before moving to the next question.`);
                                return;
                              }
                              setActiveQuestionIndex(prev => prev + 1);
                            }}
                            style={{
                              background: T.purple,
                              color: '#fff',
                              border: 'none',
                              padding: '8px 18px',
                              borderRadius: 8,
                              fontSize: 12.5,
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6
                            }}
                          >
                            Next Question <ChevronRight size={13} />
                          </button>
                        ) : (
                          <button
                            type="submit"
                            disabled={submitting}
                            style={{
                              background: T.green,
                              color: '#fff',
                              border: 'none',
                              padding: '8px 18px',
                              borderRadius: 8,
                              fontSize: 12.5,
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6
                            }}
                          >
                            <Send size={13} /> {submitting ? "Submitting..." : "Submit All Answers"}
                          </button>
                        )
                      )}
                    </div>
                  </form>

                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}


