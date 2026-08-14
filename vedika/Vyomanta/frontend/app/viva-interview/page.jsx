'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Award, FileText, ChevronRight, HelpCircle, ArrowLeft, Send, 
  AlertCircle, ShieldAlert, CheckCircle, Volume2, RotateCcw, 
  BookOpen, Code, Brain, Settings, Compass, Sparkles, Loader2, FlaskConical, AlertTriangle, RefreshCw
} from 'lucide-react';
import { T } from '@/lib/lms-data';
import { useMediaQuery, isMobileMQ } from '@/lib/useMediaQuery';
import { getJwtToken } from '@/lib/jwtCache';

export default function VivaInterviewPage() {
  const isMobile = useMediaQuery(isMobileMQ);

  // Configuration States
  const [sessionMode, setSessionMode] = useState('viva'); // 'viva' | 'interview'
  const [subject, setSubject] = useState('Physics');
  const [level, setLevel] = useState('College'); // Viva: 'School' | 'College', Interview: 'Junior' | 'Mid-Level' | 'Senior'
  const [topic, setTopic] = useState("Ohm's Law & Circuit Resistance");
  
  // Custom Viva & Interview Setup States
  const [selectedExperiment, setSelectedExperiment] = useState("Ohm's Law & Circuit Resistance");
  const [programmingLanguage, setProgrammingLanguage] = useState('Python');
  const [jdText, setJdText] = useState('');

  // Runtime States
  const [gameState, setGameState] = useState('setup'); // 'setup' | 'active' | 'summary'
  const [loading, setLoading] = useState(false);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [userAnswer, setUserAnswer] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // Active Round History & Misaligned State
  const [history, setHistory] = useState([]); 
  const [currentEvaluation, setCurrentEvaluation] = useState(null);

  // Setup Presets
  const subjects = ['Physics', 'Chemistry', 'Biology', 'Computer Science', 'Mathematics'];
  const experimentPresets = {
    'Physics': ["Ohm's Law & Circuit Resistance", "Young's Double Slit Experiment", "Compound Pendulum & Gravity g", "Hooke's Law & Elasticity"],
    'Chemistry': ["Acid-Base Titration & Molarity", "Qualitative Salt Analysis", "Volumetric Analysis", "Electrochemistry & EMF"],
    'Biology': ["Photosynthesis & Light Spectrum", "Cell Mitosis Observation", "Enzyme Kinetics & Temperature"],
    'Computer Science': ["Binary Search Trees & Traversal", "Sorting Algorithm Complexities", "TCP/IP 3-Way Handshake", "SQL Indexing & Joins"],
    'Mathematics': ["Differential Equations & Calculus", "Matrix Eigenvalues & Vectors", "Probability Distributions"]
  };

  const programmingLanguages = ['Python', 'JavaScript', 'Java', 'C++', 'SQL', 'Systems & Cloud Architecture'];

  const handleStartSession = async () => {
    const activeTopic = sessionMode === 'viva' ? selectedExperiment : (topic || programmingLanguage);
    if (!activeTopic.trim()) {
      alert("Please select or enter a topic.");
      return;
    }
    setLoading(true);
    setHistory([]);
    setCurrentQIndex(0);
    setCurrentEvaluation(null);
    setUserAnswer('');

    try {
      const token = await getJwtToken();
      const response = await fetch('/api/viva-interview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'question',
          type: sessionMode,
          subject,
          topic: activeTopic,
          level,
          experimentName: selectedExperiment,
          programmingLanguage,
          jdText,
          history: []
        })
      });

      const data = await response.json();
      if (response.ok && data.text) {
        setCurrentQuestion(data.text);
        setGameState('active');
        speakText(data.text);
      } else {
        alert(data.error || "Failed to start session.");
      }
    } catch (e) {
      console.error(e);
      alert("API request error.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!userAnswer.trim()) return;
    setLoading(true);

    try {
      const token = await getJwtToken();
      const activeTopic = sessionMode === 'viva' ? selectedExperiment : (topic || programmingLanguage);

      const evalResponse = await fetch('/api/viva-interview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'evaluate',
          type: sessionMode,
          subject,
          topic: activeTopic,
          level,
          question: currentQuestion,
          userAnswer
        })
      });

      const evalData = await evalResponse.json();
      if (!evalResponse.ok) {
        throw new Error(evalData.error || "Evaluation failed.");
      }

      setCurrentEvaluation(evalData);
      
      const roundDetails = {
        question: currentQuestion,
        answer: userAnswer,
        grade: evalData.grade,
        score: evalData.score,
        isMisaligned: evalData.isMisaligned,
        misalignedReason: evalData.misalignedReason,
        rectificationPrompt: evalData.rectificationPrompt,
        correctAnswer: evalData.correctAnswer,
        explanation: evalData.explanation,
        improvementTip: evalData.improvementTip
      };
      
      setHistory(prev => [...prev, roundDetails]);

    } catch (e) {
      console.error(e);
      alert("Failed to grade answer.");
    } finally {
      setLoading(false);
    }
  };

  const handleNextQuestion = async () => {
    if (currentQIndex >= 4) {
      setGameState('summary');
      return;
    }

    setLoading(true);
    setCurrentEvaluation(null);
    setUserAnswer('');
    const nextIndex = currentQIndex + 1;
    setCurrentQIndex(nextIndex);

    try {
      const token = await getJwtToken();
      const activeTopic = sessionMode === 'viva' ? selectedExperiment : (topic || programmingLanguage);

      const historyPayload = history.map(h => ({
        question: h.question,
        answer: h.answer,
        score: h.score
      }));

      const response = await fetch('/api/viva-interview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'question',
          type: sessionMode,
          subject,
          topic: activeTopic,
          level,
          experimentName: selectedExperiment,
          programmingLanguage,
          jdText,
          history: historyPayload
        })
      });

      const data = await response.json();
      if (response.ok && data.text) {
        setCurrentQuestion(data.text);
        speakText(data.text);
      } else {
        alert(data.error || "Failed to fetch next question.");
      }
    } catch (e) {
      console.error(e);
      alert("API request error.");
    } finally {
      setLoading(false);
    }
  };

  const speakText = (text) => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div style={{
      width: '100%',
      minHeight: '100vh',
      background: 'var(--bg)',
      color: 'var(--text)',
      fontFamily: 'var(--font-outfit), sans-serif',
      padding: isMobile ? '16px 12px 64px 12px' : '28px 32px 80px 32px',
      boxSizing: 'border-box'
    }}>
      <div style={{
        maxWidth: 1040,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 24
      }}>
        
        {/* HEADER BAR */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: `1px solid var(--border)`,
          paddingBottom: 16,
          gap: 14
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <a 
              href="/" 
              style={{
                padding: '8px 10px',
                borderRadius: 12,
                background: 'var(--s2)',
                border: `1px solid var(--border)`,
                color: 'var(--muted)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                textDecoration: 'none',
                transition: 'all 0.2s ease'
              }}
            >
              <ArrowLeft size={18} />
            </a>
            <div>
              <h1 style={{
                margin: 0,
                fontSize: isMobile ? '1.25rem' : '1.5rem',
                fontWeight: 800,
                background: 'linear-gradient(135deg, var(--purple) 0%, var(--accent) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <Brain size={24} style={{ color: 'var(--purple)' }} />
                Vyomanta Viva & Interview Hub
              </h1>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: 'var(--muted)' }}>
                Academic Experiment Viva Examiner & Technical Job Interview Practice
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--s2)',
            border: `1px solid var(--border)`,
            borderRadius: 12,
            padding: 4,
            gap: 4
          }}>
            <button
              onClick={() => setSessionMode('viva')}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: '0.8rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: sessionMode === 'viva' ? 'var(--purple)' : 'transparent',
                color: sessionMode === 'viva' ? '#FFFFFF' : 'var(--muted)',
                boxShadow: sessionMode === 'viva' ? '0 2px 8px rgba(155, 110, 248, 0.3)' : 'none'
              }}
            >
              Academic Viva
            </button>
            <button
              onClick={() => setSessionMode('interview')}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: '0.8rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: sessionMode === 'interview' ? 'var(--accent)' : 'transparent',
                color: sessionMode === 'interview' ? '#FFFFFF' : 'var(--muted)',
                boxShadow: sessionMode === 'interview' ? '0 2px 8px rgba(79, 131, 246, 0.3)' : 'none'
              }}
            >
              Technical Interview
            </button>
          </div>
        </div>

        {/* SETUP VIEW */}
        {gameState === 'setup' && (
          <div style={{
            background: 'var(--s1)',
            border: `1px solid var(--border)`,
            borderRadius: 24,
            padding: isMobile ? '20px 16px' : '32px 28px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: 24
          }}>
            <div style={{ borderBottom: `1px solid var(--border)`, paddingBottom: 16 }}>
              <h2 style={{
                margin: 0,
                fontSize: '1.25rem',
                fontWeight: 800,
                color: 'var(--text)',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                {sessionMode === 'viva' ? <FlaskConical size={22} style={{ color: 'var(--purple)' }} /> : <Code size={22} style={{ color: 'var(--accent)' }} />}
                {sessionMode === 'viva' ? 'Academic Lab Viva Setup' : 'Technical Job Interview Setup'}
              </h2>
              <p style={{ margin: '6px 0 0 0', fontSize: '0.8rem', color: 'var(--muted)', lineHeight: 1.5 }}>
                {sessionMode === 'viva' 
                  ? 'Select an experiment and academic level. Vedika will ask viva questions and catch misaligned or wrong concepts.' 
                  : 'Practice mock interview questions based on Job Descriptions or specific programming language stacks.'}
              </p>
            </div>

            {/* SUBJECT & LEVEL SELECTION */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
              gap: 18
            }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>
                  Subject Area
                </label>
                <select
                  value={subject}
                  onChange={(e) => {
                    setSubject(e.target.value);
                    const defaultExp = experimentPresets[e.target.value]?.[0] || "General Lab";
                    setSelectedExperiment(defaultExp);
                  }}
                  style={{
                    width: '100%',
                    background: 'var(--s2)',
                    border: `1px solid var(--border)`,
                    borderRadius: 12,
                    padding: '10px 14px',
                    fontSize: '0.875rem',
                    color: 'var(--text)',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>
                  Target Academic/Career Level
                </label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--s2)',
                    border: `1px solid var(--border)`,
                    borderRadius: 12,
                    padding: '10px 14px',
                    fontSize: '0.875rem',
                    color: 'var(--text)',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {sessionMode === 'viva' ? (
                    <>
                      <option value="School">School (High School / K-12)</option>
                      <option value="College">College (Undergraduate B.Tech/B.Sc)</option>
                      <option value="PG">Postgraduate / Research</option>
                    </>
                  ) : (
                    <>
                      <option value="Junior">Junior / Entry Level</option>
                      <option value="Mid-Level">Mid-Level Engineer</option>
                      <option value="Senior">Senior / Tech Lead</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            {/* VIVA MODE: EXPERIMENT SELECTOR */}
            {sessionMode === 'viva' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Select Academic Experiment
                </label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                  gap: 10
                }}>
                  {(experimentPresets[subject] || []).map(exp => {
                    const isSelected = selectedExperiment === exp;
                    return (
                      <button
                        key={exp}
                        onClick={() => setSelectedExperiment(exp)}
                        style={{
                          padding: '12px 14px',
                          borderRadius: 12,
                          border: `1px solid ${isSelected ? 'var(--purple)' : 'var(--border)'}`,
                          background: isSelected ? 'rgba(139, 92, 246, 0.12)' : 'var(--s2)',
                          color: isSelected ? 'var(--purple)' : 'var(--text)',
                          textAlign: 'left',
                          fontSize: '0.825rem',
                          fontWeight: isSelected ? 700 : 500,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span>🧪</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exp}</span>
                      </button>
                    );
                  })}
                </div>
                <input
                  type="text"
                  placeholder="Or enter custom experiment name..."
                  value={selectedExperiment}
                  onChange={(e) => setSelectedExperiment(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--s2)',
                    border: `1px solid var(--border)`,
                    borderRadius: 12,
                    padding: '10px 14px',
                    fontSize: '0.825rem',
                    color: 'var(--text)',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            ) : (
              /* INTERVIEW MODE: LANGUAGE & JD UPLOAD */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>
                    Target Programming Language / Stack
                  </label>
                  <select
                    value={programmingLanguage}
                    onChange={(e) => setProgrammingLanguage(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'var(--s2)',
                      border: `1px solid var(--border)`,
                      borderRadius: 12,
                      padding: '10px 14px',
                      fontSize: '0.875rem',
                      color: 'var(--text)',
                      outline: 'none'
                    }}
                  >
                    {programmingLanguages.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>
                    Paste Job Description (Optional for JD-based Interview)
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Paste the Job Description (JD) text here to generate custom targeted interview questions..."
                    value={jdText}
                    onChange={(e) => setJdText(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'var(--s2)',
                      border: `1px solid var(--border)`,
                      borderRadius: 12,
                      padding: 12,
                      fontSize: '0.825rem',
                      color: 'var(--text)',
                      outline: 'none',
                      boxSizing: 'border-box',
                      resize: 'vertical'
                    }}
                  />
                </div>
              </div>
            )}

            <button
              onClick={handleStartSession}
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px 20px',
                borderRadius: 16,
                border: 'none',
                background: sessionMode === 'viva'
                  ? 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)'
                  : 'linear-gradient(135deg, #4F83F6 0%, #8B5CF6 100%)',
                color: '#FFFFFF',
                fontSize: '0.95rem',
                fontWeight: 800,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                boxShadow: '0 8px 24px rgba(139, 92, 246, 0.3)',
                transition: 'all 0.2s ease',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  <Sparkles size={20} />
                  <span>Start {sessionMode === 'viva' ? 'Viva Exam' : 'Interview Session'}</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* ACTIVE SESSION VIEW */}
        {gameState === 'active' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            
            {/* EXAMINER / QUESTION CARD */}
            <div style={{
              background: 'var(--s1)',
              border: `1px solid var(--border)`,
              borderRadius: 24,
              padding: isMobile ? '20px 16px' : '28px 24px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.05)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: `1px solid var(--border)`,
                paddingBottom: 12,
                marginBottom: 16
              }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--purple)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  QUESTION {currentQIndex + 1} OF 5 • {sessionMode === 'viva' ? selectedExperiment : (programmingLanguage || 'Technical Interview')}
                </span>
                <button
                  onClick={() => speakText(currentQuestion)}
                  style={{
                    padding: '6px 10px',
                    background: 'var(--s2)',
                    border: `1px solid var(--border)`,
                    color: 'var(--text)',
                    borderRadius: 8,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <Volume2 size={14} style={{ color: isSpeaking ? 'var(--accent)' : 'inherit' }} />
                  <span>{isSpeaking ? 'Speaking...' : 'Speak'}</span>
                </button>
              </div>

              <h2 style={{
                margin: 0,
                fontSize: isMobile ? '1.15rem' : '1.4rem',
                fontWeight: 700,
                color: 'var(--text)',
                lineHeight: 1.5
              }}>
                "{currentQuestion}"
              </h2>
            </div>

            {/* MISALIGNED ANSWER RECTIFICATION HUD ALERT */}
            {currentEvaluation?.isMisaligned && (
              <div style={{
                padding: 18,
                borderRadius: 18,
                background: 'rgba(236, 154, 41, 0.1)',
                border: '1px solid var(--amber)',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                boxShadow: '0 4px 16px rgba(236, 154, 41, 0.15)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--amber)', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.05em' }}>
                  <ShieldAlert size={18} />
                  <span>MISALIGNED ANSWER DETECTED — RECTIFICATION REQUIRED</span>
                </div>
                <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--text)' }}>
                  ⚠️ {currentEvaluation.misalignedReason}
                </p>
                {currentEvaluation.rectificationPrompt && (
                  <div style={{
                    padding: 12,
                    borderRadius: 12,
                    background: 'var(--s1)',
                    border: '1px solid rgba(236, 154, 41, 0.3)',
                    fontSize: '0.8rem',
                    color: 'var(--amber)',
                    lineHeight: 1.4
                  }}>
                    <strong style={{ color: 'var(--amber)' }}>Vedika Rectification Hint:</strong> {currentEvaluation.rectificationPrompt}
                  </div>
                )}
              </div>
            )}

            {/* ANSWER EVALUATION DISPLAY */}
            {currentEvaluation && (
              <div style={{
                padding: isMobile ? 18 : 24,
                borderRadius: 20,
                background: 'var(--s1)',
                border: `1px solid var(--border)`,
                display: 'flex',
                flexDirection: 'column',
                gap: 16
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      padding: '6px 14px',
                      background: 'var(--purple)',
                      color: '#FFFFFF',
                      fontWeight: 800,
                      borderRadius: 12,
                      fontSize: '1.1rem'
                    }}>
                      {currentEvaluation.grade}
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: 'var(--text)' }}>
                        Score: {currentEvaluation.score} / 10
                      </h4>
                      <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: 'var(--muted)' }}>
                        {currentEvaluation.explanation}
                      </p>
                    </div>
                  </div>
                </div>

                <div style={{
                  padding: 14,
                  borderRadius: 14,
                  background: 'var(--s2)',
                  border: `1px solid var(--border)`,
                  fontSize: '0.8rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8
                }}>
                  <p style={{ margin: 0, color: 'var(--text)' }}>
                    <strong style={{ color: 'var(--purple)' }}>Model Answer:</strong> {currentEvaluation.correctAnswer}
                  </p>
                  <p style={{ margin: 0, color: 'var(--muted)' }}>
                    <strong style={{ color: 'var(--accent)' }}>Improvement Advice:</strong> {currentEvaluation.improvementTip}
                  </p>
                </div>
              </div>
            )}

            {/* ANSWER INPUT AREA */}
            <div style={{
              background: 'var(--s1)',
              border: `1px solid var(--border)`,
              borderRadius: 24,
              padding: isMobile ? 18 : 24,
              display: 'flex',
              flexDirection: 'column',
              gap: 14
            }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Your Answer
              </label>
              <textarea
                rows={4}
                placeholder="Type your answer clearly or dictate your response..."
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--s2)',
                  border: `1px solid var(--border)`,
                  borderRadius: 16,
                  padding: 14,
                  fontSize: '0.875rem',
                  color: 'var(--text)',
                  outline: 'none',
                  boxSizing: 'border-box',
                  resize: 'vertical'
                }}
              />

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <button
                  onClick={handleSubmitAnswer}
                  disabled={loading || !userAnswer.trim()}
                  style={{
                    padding: '10px 20px',
                    background: 'var(--purple)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 12,
                    fontSize: '0.825rem',
                    fontWeight: 700,
                    cursor: (loading || !userAnswer.trim()) ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    boxShadow: '0 4px 14px rgba(139, 92, 246, 0.25)',
                    opacity: (loading || !userAnswer.trim()) ? 0.5 : 1,
                    transition: 'all 0.15s ease'
                  }}
                >
                  {loading ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                  <span>Submit Answer</span>
                </button>

                {currentEvaluation && (
                  <button
                    onClick={handleNextQuestion}
                    style={{
                      padding: '10px 20px',
                      background: 'var(--accent)',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: 12,
                      fontSize: '0.825rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      boxShadow: '0 4px 14px rgba(79, 131, 246, 0.25)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>Next Question</span>
                    <ChevronRight size={16} />
                  </button>
                )}
              </div>
            </div>

          </div>
        )}

        {/* SUMMARY SCORECARD VIEW */}
        {gameState === 'summary' && (
          <div style={{
            background: 'var(--s1)',
            border: `1px solid var(--border)`,
            borderRadius: 24,
            padding: isMobile ? 24 : 36,
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 20
          }}>
            <Award size={54} style={{ color: 'var(--purple)' }} />
            <div>
              <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: 'var(--text)' }}>Session Completed!</h2>
              <p style={{ margin: '8px 0 0 0', fontSize: '0.8rem', color: 'var(--muted)', maxWidth: 460 }}>
                Here is your final evaluation summary matrix for <strong style={{ color: 'var(--purple)' }}>{sessionMode === 'viva' ? selectedExperiment : programmingLanguage}</strong>.
              </p>
            </div>

            <div style={{
              width: '100%',
              maxWidth: 720,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              textAlign: 'left'
            }}>
              {history.map((item, idx) => (
                <div key={idx} style={{
                  padding: 14,
                  borderRadius: 14,
                  background: 'var(--s2)',
                  border: `1px solid var(--border)`,
                  fontSize: '0.8rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: 'var(--text)' }}>
                    <span>Q{idx + 1}: {item.question}</span>
                    <span style={{ color: 'var(--purple)' }}>Score: {item.score}/10 ({item.grade})</span>
                  </div>
                  <p style={{ margin: 0, color: 'var(--muted)' }}>Your Answer: "{item.answer}"</p>
                  {item.isMisaligned && (
                    <p style={{ margin: 0, color: 'var(--amber)', fontWeight: 600 }}>
                      Rectified Misaligned Concept: {item.misalignedReason}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={() => setGameState('setup')}
              style={{
                padding: '12px 28px',
                background: 'var(--purple)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 16,
                fontSize: '0.875rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 8px 24px rgba(139, 92, 246, 0.3)'
              }}
            >
              <RotateCcw size={16} />
              <span>Start Another Round</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
