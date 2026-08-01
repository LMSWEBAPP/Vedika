'use client';

import { useState, useEffect } from 'react';
import { Award, Clock, FileText, CheckCircle, X, ChevronRight, HelpCircle, ArrowLeft } from 'lucide-react';
import { T } from '@/lib/lms-data';
import { useMediaQuery, isMobileMQ } from '@/lib/useMediaQuery';
import { getQuizzes, getQuizSubmissions, submitQuizResponse, getCourses } from '@/lib/frappe';

export default function StudentQuizzesPage() {
  const isMobile = useMediaQuery(isMobileMQ);

  // States
  const [quizzes, setQuizzes] = useState([]);
  const [courses, setCourses] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  // Active Quiz Modal
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [isAttempting, setIsAttempting] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [quizScore, setQuizScore] = useState(null);

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
        const [quizList, courseList, submissionList] = await Promise.all([
          getQuizzes(),
          getCourses(),
          getQuizSubmissions()
        ]);
        setQuizzes(quizList || []);
        setCourses(courseList || []);
        setSubmissions(submissionList || []);
      } catch (e) {
        console.error("Failed to load quizzes", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [currentUser]);

  const handleStartAttempt = (quiz) => {
    setSelectedQuiz(quiz);
    setAnswers(new Array(quiz.questions.length).fill(null));
    setCurrentQuestionIndex(0);
    setQuizScore(null);
    setIsAttempting(true);
  };

  const handleSelectOption = (oIdx) => {
    const updated = [...answers];
    updated[currentQuestionIndex] = oIdx;
    setAnswers(updated);
  };

  const handleNext = () => {
    if (currentQuestionIndex < selectedQuiz.questions.length - 1) {
      setCurrentQuestionIndex(idx => idx + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(idx => idx - 1);
    }
  };

  const handleQuizSubmit = async () => {
    if (!selectedQuiz || !currentUser) return;
    setSubmitting(true);

    try {
      let correctCount = 0;
      selectedQuiz.questions.forEach((q, idx) => {
        if (answers[idx] === q.correct) {
          correctCount++;
        }
      });

      const totalQs = selectedQuiz.questions.length;
      const percentage = Math.round((correctCount / totalQs) * 100);
      const passed = percentage >= (selectedQuiz.passing_percentage || 70);

      const subPayload = {
        quiz: selectedQuiz.id,
        quiz_title: selectedQuiz.title,
        course: selectedQuiz.course,
        member: currentUser.username || currentUser.email,
        member_name: currentUser.name || 'Student',
        score: correctCount,
        score_out_of: totalQs,
        percentage: percentage,
        passing_percentage: selectedQuiz.passing_percentage || 70
      };

      await submitQuizResponse(subPayload);

      setQuizScore({
        score: correctCount,
        total: totalQs,
        percentage,
        passed
      });

      // Reload submissions list
      const freshSubs = await getQuizSubmissions();
      setSubmissions(freshSubs || []);
    } catch (e) {
      console.error(e);
      alert("Failed to submit quiz. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Helper to map course ID to name
  const getCourseName = (courseId) => {
    return courses.find(c => c.id === courseId)?.title || "Course Topic";
  };

  // Helper to get quiz submission status
  const getQuizStatus = (quizId) => {
    if (!currentUser) return { status: 'Not Attempted', percentage: null };
    
    const attempts = submissions.filter(s => s.quiz === quizId && (s.member === currentUser.username || s.member === currentUser.email));
    if (attempts.length === 0) return { status: 'Not Attempted', percentage: null };

    // Find if any attempt passed
    const passed = attempts.some(a => a.percentage >= (a.passing_percentage || 70));
    
    // Get highest score attempt
    const highestAttempt = [...attempts].sort((a, b) => b.percentage - a.percentage)[0];

    return {
      status: passed ? 'Passed' : 'Failed',
      percentage: highestAttempt.percentage,
      score: highestAttempt.score,
      total: highestAttempt.score_out_of
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
          Course Quizzes
        </h1>
        <p style={{ color: T.muted, fontSize: 13.5, margin: '4px 0 0' }}>
          Attempt quizzes to validate your understanding and complete curriculum certifications.
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
      ) : quizzes.length === 0 ? (
        <div style={{
          background: T.s1, border: `1px solid ${T.border}`, borderRadius: 14,
          padding: '64px 20px', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', textAlign: 'center', minHeight: 300
        }}>
          <Award size={48} color={T.muted} style={{ marginBottom: 16 }} />
          <h3 style={{ color: T.text, fontSize: 16, margin: '0 0 6px 0' }}>No Quizzes Available</h3>
          <p style={{ color: T.muted, fontSize: 13, maxWidth: 300, margin: 0 }}>
            There are no course quizzes assigned to your curriculum at this moment.
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: gridColumns,
          gap: 20
        }}>
          {quizzes.map((quiz) => {
            const quizStatus = getQuizStatus(quiz.id);
            return (
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
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
                    <h3 style={{ color: T.text, fontSize: 15.5, fontWeight: 700, margin: 0, lineHeight: 1.3 }}>
                      {quiz.title}
                    </h3>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                    <span style={{ fontSize: 9.5, background: `${T.purple}15`, border: `1px solid ${T.purple}25`, color: T.purple, padding: '2px 8px', borderRadius: 4 }}>
                      {getCourseName(quiz.course)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: 16, fontSize: 12.5, color: T.muted, marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={13} />
                      <span>{quiz.duration || '10 mins'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <FileText size={13} />
                      <span>{quiz.questions?.length || 0} Questions</span>
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {/* Status Indicator */}
                  <div>
                    {quizStatus.status === 'Passed' && (
                      <span style={{ fontSize: 11.5, color: T.green, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                        <CheckCircle size={13} /> Passed ({quizStatus.percentage}%)
                      </span>
                    )}
                    {quizStatus.status === 'Failed' && (
                      <span style={{ fontSize: 11.5, color: T.red, fontWeight: 600 }}>
                        Failed ({quizStatus.percentage}%)
                      </span>
                    )}
                    {quizStatus.status === 'Not Attempted' && (
                      <span style={{ fontSize: 11.5, color: T.muted }}>
                        Not Attempted
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => handleStartAttempt(quiz)}
                    style={{
                      background: quizStatus.status === 'Passed' ? T.s2 : T.purple,
                      color: quizStatus.status === 'Passed' ? T.text : '#fff',
                      border: quizStatus.status === 'Passed' ? `1px solid ${T.border}` : 'none',
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
                    {quizStatus.status === 'Passed' ? 'Re-attempt' : 'Start Quiz'} <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Attempt Modal */}
      {isAttempting && selectedQuiz && (
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
            maxWidth: 580,
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
                  {selectedQuiz.title}
                </h2>
                <span style={{ fontSize: 11.5, color: T.muted }}>
                  Passing rate requirement: {selectedQuiz.passing_percentage || 70}%
                </span>
              </div>
              <button
                onClick={() => setIsAttempting(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: T.muted, padding: 0 }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Modal Content */}
            <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
              {quizScore ? (
                /* Post-Submission Summary Screen */
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: '50%',
                    background: quizScore.passed ? `${T.green}18` : `${T.red}18`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 16px'
                  }}>
                    <Award size={28} color={quizScore.passed ? T.green : T.red} />
                  </div>
                  <h3 style={{ color: T.text, fontSize: 18, fontWeight: 700, margin: '0 0 6px 0' }}>
                    {quizScore.passed ? 'Congratulations! You Passed' : 'Quiz Attempt Failed'}
                  </h3>
                  <p style={{ color: T.muted, fontSize: 13.5, margin: '0 0 20px 0' }}>
                    You scored {quizScore.score} out of {quizScore.total} questions ({quizScore.percentage}%)
                  </p>
                  
                  <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                    {!quizScore.passed && (
                      <button
                        onClick={() => handleStartAttempt(selectedQuiz)}
                        style={{
                          background: T.purple, color: '#fff', border: 'none',
                          padding: '8px 16px', borderRadius: 8, fontSize: 12.5,
                          fontWeight: 600, cursor: 'pointer'
                        }}
                      >
                        Try Again
                      </button>
                    )}
                    <button
                      onClick={() => setIsAttempting(false)}
                      style={{
                        background: 'transparent', border: `1px solid ${T.border}`,
                        color: T.text, padding: '8px 16px', borderRadius: 8,
                        fontSize: 12.5, cursor: 'pointer'
                      }}
                    >
                      Close Window
                    </button>
                  </div>
                </div>
              ) : (
                /* Question Answer Pane */
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <span style={{ fontSize: 12, color: T.muted }}>Question {currentQuestionIndex + 1} of {selectedQuiz.questions.length}</span>
                    <span style={{ fontSize: 12, color: T.purple, fontWeight: 600 }}>{selectedQuiz.duration || '10 mins'}</span>
                  </div>

                  {/* Question Prompt */}
                  <h3 style={{ color: T.text, fontSize: 14.5, fontWeight: 600, lineHeight: 1.5, marginBottom: 16 }}>
                    {selectedQuiz.questions[currentQuestionIndex]?.question}
                  </h3>

                  {/* Choices list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                    {selectedQuiz.questions[currentQuestionIndex]?.options?.map((opt, oIdx) => {
                      const isSelected = answers[currentQuestionIndex] === oIdx;
                      return (
                        <button
                          key={oIdx}
                          onClick={() => handleSelectOption(oIdx)}
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

                  {/* Navigation Footer */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${T.border}`, paddingTop: 16 }}>
                    <button
                      disabled={currentQuestionIndex === 0}
                      onClick={handlePrev}
                      style={{
                        background: 'transparent',
                        border: `1px solid ${T.border}`,
                        color: currentQuestionIndex === 0 ? T.dim : T.text,
                        padding: '7px 14px',
                        borderRadius: 8,
                        fontSize: 12.5,
                        cursor: currentQuestionIndex === 0 ? 'default' : 'pointer'
                      }}
                    >
                      Previous
                    </button>

                    {currentQuestionIndex < selectedQuiz.questions.length - 1 ? (
                      <button
                        disabled={answers[currentQuestionIndex] === null}
                        onClick={handleNext}
                        style={{
                          background: T.purple,
                          color: '#fff',
                          border: 'none',
                          padding: '7px 16px',
                          borderRadius: 8,
                          fontSize: 12.5,
                          fontWeight: 600,
                          cursor: 'pointer',
                          opacity: answers[currentQuestionIndex] === null ? 0.6 : 1
                        }}
                      >
                        Next Question
                      </button>
                    ) : (
                      <button
                        disabled={answers.some(ans => ans === null) || submitting}
                        onClick={handleQuizSubmit}
                        style={{
                          background: T.green,
                          color: '#000',
                          border: 'none',
                          padding: '7px 16px',
                          borderRadius: 8,
                          fontSize: 12.5,
                          fontWeight: 700,
                          cursor: 'pointer',
                          opacity: answers.some(ans => ans === null) ? 0.6 : 1
                        }}
                      >
                        {submitting ? "Submitting..." : "Submit Quiz"}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
