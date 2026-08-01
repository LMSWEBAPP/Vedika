'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Award, FileText, ChevronRight, HelpCircle, ArrowLeft, Send, 
  AlertCircle, ShieldAlert, CheckCircle, Volume2, RotateCcw, 
  BookOpen, Code, Brain, Settings, Compass, Sparkles, Loader2 
} from 'lucide-react';
import { T } from '@/lib/lms-data';
import { useMediaQuery, isMobileMQ } from '@/lib/useMediaQuery';
import { getJwtToken } from '@/lib/jwtCache';

export default function VivaInterviewPage() {
  const isMobile = useMediaQuery(isMobileMQ);

  // Configuration States
  const [sessionMode, setSessionMode] = useState('viva'); // 'viva' | 'interview'
  const [subject, setSubject] = useState('Computer Science');
  const [level, setLevel] = useState('College'); // Viva: 'School' | 'College', Interview: 'Easy' | 'Medium' | 'Hard'
  const [topic, setTopic] = useState('');
  
  // Runtime States
  const [gameState, setGameState] = useState('setup'); // 'setup' | 'active' | 'summary'
  const [loading, setLoading] = useState(false);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [userAnswer, setUserAnswer] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // Active Round History
  const [history, setHistory] = useState([]); // [{ question, answer, grade, score, correctAnswer, explanation, improvementTip }]
  const [currentEvaluation, setCurrentEvaluation] = useState(null);

  // Setup Options
  const subjects = ['Computer Science', 'Physics', 'Chemistry', 'Biology', 'Mathematics'];
  const levelsViva = ['School', 'College'];
  const levelsInterview = ['Easy', 'Medium', 'Hard'];

  const handleStartSession = async () => {
    if (!topic.trim()) {
      alert("Please enter a study topic.");
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
          topic,
          level,
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
      // 1. Evaluate current answer
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
          topic,
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
      
      // Save to history
      const roundDetails = {
        question: currentQuestion,
        answer: userAnswer,
        grade: evalData.grade,
        score: evalData.score,
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
      
      // Format historical records for prompt guidance
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
          topic,
          level,
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

  // Browser Speak aloud (TTS fallback wow feature)
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

  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  // Score stats calculation
  const getAverageScore = () => {
    if (history.length === 0) return 0;
    const total = history.reduce((sum, h) => sum + h.score, 0);
    return (total / history.length).toFixed(1);
  };

  const getOverallGrade = () => {
    const avg = parseFloat(getAverageScore());
    if (avg >= 9) return 'A';
    if (avg >= 7.5) return 'B';
    if (avg >= 6) return 'C';
    if (avg >= 4.5) return 'D';
    return 'F';
  };

  return (
    <div style={{
      padding: isMobile ? '70px 16px 32px' : '40px',
      maxWidth: 1100,
      margin: '0 auto',
      fontFamily: 'var(--font-outfit), sans-serif',
      color: T.text,
      minHeight: '90vh'
    }}>
      {/* HEADER */}
      <div style={{ marginBottom: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, color: T.text, fontSize: isMobile ? 22 : 28, fontWeight: 800, margin: 0, letterSpacing: '-0.04em' }}>
            <Award color={T.accent} /> Viva & Job Interview Simulator
          </h1>
          <p style={{ color: T.muted, fontSize: 13.5, margin: '4px 0 0' }}>
            Prepare for academic evaluations and technical job reviews in a realistic mock panel.
          </p>
        </div>
        
        {gameState !== 'setup' && (
          <button 
            onClick={() => setGameState('setup')} 
            style={{
              background: 'transparent', border: `1px solid ${T.border}`, color: T.text,
              borderRadius: 8, padding: '6px 12px', fontSize: 12.5, display: 'flex', 
              alignItems: 'center', gap: 6, cursor: 'pointer'
            }}
          >
            <RotateCcw size={13} /> Exit Session
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        
        {/* SETUP SCREEN */}
        {gameState === 'setup' && (
          <motion.div
            key="setup"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            style={{
              background: T.s1, border: `1px solid ${T.border}`, borderRadius: 16,
              padding: isMobile ? '24px 16px' : '36px', boxShadow: '0 8px 30px rgba(0,0,0,0.15)'
            }}
          >
            {/* Toggle Mode */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 28, background: T.s2, padding: 4, borderRadius: 10, maxWidth: 450 }}>
              <button
                onClick={() => { setSessionMode('viva'); setSubject('Computer Science'); setLevel('College'); }}
                style={{
                  flex: 1, padding: '10px', borderRadius: 8, border: 'none',
                  background: sessionMode === 'viva' ? T.accent : 'transparent',
                  color: sessionMode === 'viva' ? '#000' : T.muted,
                  fontWeight: 700, fontSize: 13.5, cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                🎓 Academic Viva Prep
              </button>
              <button
                onClick={() => { setSessionMode('interview'); setSubject('Computer Science'); setLevel('Medium'); }}
                style={{
                  flex: 1, padding: '10px', borderRadius: 8, border: 'none',
                  background: sessionMode === 'interview' ? T.accent : 'transparent',
                  color: sessionMode === 'interview' ? '#000' : T.muted,
                  fontWeight: 700, fontSize: 13.5, cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                💼 Technical Interview Prep
              </button>
            </div>

            {/* Config Fields */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 24, marginBottom: 28 }}>
              
              <div>
                <label style={{ display: 'block', fontSize: 13, color: T.muted, fontWeight: 600, marginBottom: 8 }}>SUBJECT / DISCIPLINE</label>
                <select
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  style={{
                    width: '100%', padding: '12px 16px', background: T.s2, color: T.text,
                    border: `1px solid ${T.border}`, borderRadius: 8, outline: 'none',
                    fontSize: 13.5, fontFamily: 'inherit'
                  }}
                >
                  {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, color: T.muted, fontWeight: 600, marginBottom: 8 }}>
                  {sessionMode === 'viva' ? 'GRADE LEVEL' : 'TARGET DIFFICULTY'}
                </label>
                <select
                  value={level}
                  onChange={e => setLevel(e.target.value)}
                  style={{
                    width: '100%', padding: '12px 16px', background: T.s2, color: T.text,
                    border: `1px solid ${T.border}`, borderRadius: 8, outline: 'none',
                    fontSize: 13.5, fontFamily: 'inherit'
                  }}
                >
                  {(sessionMode === 'viva' ? levelsViva : levelsInterview).map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>

            </div>

            <div style={{ marginBottom: 32 }}>
              <label style={{ display: 'block', fontSize: 13, color: T.muted, fontWeight: 600, marginBottom: 8 }}>TOPIC OF PREPARATION</label>
              <input
                type="text"
                placeholder={sessionMode === 'viva' ? "e.g., Ohm's Law, Organic Synthesis, Cell Mitosis" : "e.g., Python Lists & Trees, Relational SQL Queries, System Design"}
                value={topic}
                onChange={e => setTopic(e.target.value)}
                style={{
                  width: '100%', padding: '12px 16px', background: T.s2, color: T.text,
                  border: `1px solid ${T.border}`, borderRadius: 8, outline: 'none',
                  fontSize: 14, fontFamily: 'inherit'
                }}
              />
            </div>

            <button
              onClick={handleStartSession}
              disabled={loading}
              style={{
                background: T.accent, color: '#000', border: 'none', borderRadius: 8,
                padding: '14px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8, opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  Assembling Exam Panel...
                </>
              ) : (
                <>
                  🚀 Start Practice Round
                </>
              )}
            </button>
          </motion.div>
        )}

        {/* ACTIVE SESSION PANELS */}
        {gameState === 'active' && (
          <motion.div
            key="active"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.3fr 0.7fr', gap: 28 }}
          >
            {/* Left Pane: Core Panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              {/* Question Screen */}
              <div style={{
                background: T.s1, border: `1px solid ${T.border}`, borderRadius: 16,
                padding: '24px', position: 'relative', overflow: 'hidden'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <span style={{ fontSize: 11, background: `${T.accent}12`, border: `1px solid ${T.accent}30`, color: T.accent, padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
                    QUESTION {currentQIndex + 1} OF 5
                  </span>
                  
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button 
                      onClick={() => speakText(currentQuestion)}
                      style={{
                        background: 'transparent', border: 'none', color: isSpeaking ? T.accent : T.muted,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12
                      }}
                      title="Speak Question"
                    >
                      <Volume2 size={15} /> Speak
                    </button>
                  </div>
                </div>

                {/* Animated Mascot Visual + Speech bubble */}
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  {/* Mascot Sprite representation */}
                  <div style={{
                    width: 70, height: 80, borderRadius: 12, background: T.s2, border: `1px solid ${T.border}`,
                    flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <img 
                      src="/vedika.png" 
                      alt="Vedika AI" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        // Fallback fallback if img fails
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>

                  <div style={{
                    flex: 1, background: T.s2, border: `1px solid ${T.border}`, borderRadius: '0 14px 14px 14px',
                    padding: '16px', position: 'relative'
                  }}>
                    <p style={{ margin: 0, fontSize: 14.5, fontWeight: 600, lineHeight: 1.5, color: T.text }}>
                      {currentQuestion}
                    </p>
                  </div>
                </div>
              </div>

              {/* Answer Input and feedback */}
              <div style={{
                background: T.s1, border: `1px solid ${T.border}`, borderRadius: 16, padding: '24px'
              }}>
                {!currentEvaluation ? (
                  /* Answer Entry Mode */
                  <div>
                    <label style={{ display: 'block', fontSize: 13, color: T.muted, fontWeight: 600, marginBottom: 8 }}>
                      YOUR ANSWER
                    </label>
                    <textarea
                      placeholder="Type your explanation in detail here... Make sure to include core principles and vocabulary terms."
                      value={userAnswer}
                      onChange={e => setUserAnswer(e.target.value)}
                      disabled={loading}
                      style={{
                        width: '100%', height: 120, padding: '14px', background: T.s2, color: T.text,
                        border: `1px solid ${T.border}`, borderRadius: 8, outline: 'none',
                        fontSize: 13.5, resize: 'none', fontFamily: 'inherit', marginBottom: 16
                      }}
                    />
                    
                    <button
                      onClick={handleSubmitAnswer}
                      disabled={loading || !userAnswer.trim()}
                      style={{
                        background: T.purple, color: '#fff', border: 'none', borderRadius: 8,
                        padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 6, opacity: (loading || !userAnswer.trim()) ? 0.6 : 1
                      }}
                    >
                      {loading ? (
                        <>
                          <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                          Assessing Answer...
                        </>
                      ) : (
                        <>
                          Submit Response <Send size={13} />
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  /* Evaluation / Result Mode */
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {/* Score Summary Banner */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', marginBottom: 18, borderBottom: `1px solid ${T.border}`, paddingBottom: 14 }}>
                      
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        background: currentEvaluation.score >= 7 ? `${T.green}18` : `${T.red}18`,
                        border: `1px solid ${currentEvaluation.score >= 7 ? T.green : T.red}30`,
                        color: currentEvaluation.score >= 7 ? T.green : T.red,
                        padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700
                      }}>
                        Score: {currentEvaluation.score} / 10
                      </div>

                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        background: `${T.accent}18`, border: `1px solid ${T.accent}30`,
                        color: T.accent, padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700
                      }}>
                        Grade: {currentEvaluation.grade}
                      </div>

                    </div>

                    {/* Critique / Feedback */}
                    <div style={{ marginBottom: 18 }}>
                      <h4 style={{ color: T.text, fontSize: 13.5, fontWeight: 700, margin: '0 0 6px 0' }}>💡 critique & feedback</h4>
                      <p style={{ color: T.muted, fontSize: 13, margin: 0, lineHeight: 1.5 }}>
                        {currentEvaluation.explanation}
                      </p>
                    </div>

                    {/* Improvement Tip */}
                    <div style={{
                      background: `${T.purple}12`, borderLeft: `3px solid ${T.purple}`,
                      padding: '12px 16px', borderRadius: '0 8px 8px 0', marginBottom: 18
                    }}>
                      <h4 style={{ color: T.purple, fontSize: 13, fontWeight: 700, margin: '0 0 4px 0' }}>🎯 improvement advice</h4>
                      <p style={{ color: T.text, fontSize: 12.5, margin: 0, lineHeight: 1.4 }}>
                        {currentEvaluation.improvementTip}
                      </p>
                    </div>

                    {/* Model Answer */}
                    <div style={{ marginBottom: 24 }}>
                      <h4 style={{ color: T.text, fontSize: 13.5, fontWeight: 700, margin: '0 0 6px 0' }}>⭐ model / ideal response</h4>
                      <p style={{ color: T.muted, fontSize: 13, margin: 0, lineHeight: 1.5, background: T.s2, padding: 12, borderRadius: 6, border: `1px solid ${T.border}` }}>
                        {currentEvaluation.correctAnswer}
                      </p>
                    </div>

                    <button
                      onClick={handleNextQuestion}
                      disabled={loading}
                      style={{
                        background: T.green, color: '#000', border: 'none', borderRadius: 8,
                        padding: '10px 22px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 6, opacity: loading ? 0.6 : 1
                      }}
                    >
                      {loading ? (
                        <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                      ) : (
                        currentQIndex >= 4 ? "Complete Practice Session" : "Next Question"
                      )}
                      <ChevronRight size={14} />
                    </button>
                  </motion.div>
                )}
              </div>

            </div>

            {/* Right Pane: History Sidebar */}
            <div style={{
              background: T.s1, border: `1px solid ${T.border}`, borderRadius: 16,
              padding: '20px', display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '80vh', overflowY: 'auto'
            }}>
              <h3 style={{ color: T.text, fontSize: 15, fontWeight: 700, margin: 0, letterSpacing: '-0.02em', borderBottom: `1px solid ${T.border}`, paddingBottom: 10 }}>
                Round Progress Log
              </h3>
              
              {history.length === 0 ? (
                <div style={{ color: T.dim, fontSize: 12, textAlign: 'center', padding: '32px 0' }}>
                  Your answers and scorecards will populate here in real-time.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {history.map((h, idx) => (
                    <div 
                      key={idx}
                      style={{
                        borderBottom: idx < history.length - 1 ? `1px solid ${T.border}` : 'none',
                        paddingBottom: idx < history.length - 1 ? 12 : 0
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: T.muted, fontWeight: 700 }}>Q{idx + 1} Scorecard</span>
                        <span style={{
                          fontSize: 10.5, fontWeight: 700, color: h.score >= 7 ? T.green : T.red
                        }}>
                          {h.score}/10 ({h.grade})
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: 11.5, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {h.question}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </motion.div>
        )}

        {/* SUMMARY SCREEN / REPORT CARD */}
        {gameState === 'summary' && (
          <motion.div
            key="summary"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            style={{
              background: T.s1, border: `1px solid ${T.border}`, borderRadius: 16,
              padding: isMobile ? '24px 16px' : '36px', boxShadow: '0 8px 30px rgba(0,0,0,0.15)'
            }}
          >
            {/* Statistics Dashboard Banner */}
            <div style={{ textAlign: 'center', marginBottom: 36 }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%', background: `${T.accent}18`,
                display: 'flex', alignItems: 'center', justifycontent: 'center', margin: '0 auto 16px',
                border: `1px solid ${T.accent}30`
              }}>
                <Sparkles size={32} color={T.accent} style={{ margin: '0 auto' }} />
              </div>
              <h2 style={{ color: T.text, fontSize: 22, fontWeight: 800, margin: '0 0 6px 0' }}>
                Practice Session Finished!
              </h2>
              <p style={{ color: T.muted, fontSize: 13.5, margin: 0 }}>
                Here is a summary of your performance on {topic} ({subject}).
              </p>
            </div>

            {/* Metric Blocks Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 20, marginBottom: 32 }}>
              
              <div style={{ background: T.s2, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20, textAlign: 'center' }}>
                <span style={{ display: 'block', fontSize: 12, color: T.muted, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>
                  Average Rating
                </span>
                <span style={{ fontSize: 32, fontWeight: 800, color: T.text }}>
                  {getAverageScore()} <span style={{ fontSize: 14, color: T.muted, fontWeight: 400 }}>/ 10</span>
                </span>
              </div>

              <div style={{ background: T.s2, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20, textAlign: 'center' }}>
                <span style={{ display: 'block', fontSize: 12, color: T.muted, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>
                  Overall Grade
                </span>
                <span style={{ fontSize: 32, fontWeight: 800, color: T.purple }}>
                  {getOverallGrade()}
                </span>
              </div>

            </div>

            {/* Recapitulated Tips list */}
            <div style={{ marginBottom: 36 }}>
              <h3 style={{ color: T.text, fontSize: 16, fontWeight: 700, margin: '0 0 16px 0', borderBottom: `1px solid ${T.border}`, paddingBottom: 8 }}>
                🎯 Combined Study Recommendations
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {history.map((h, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%', background: `${T.purple}18`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 700, color: T.purple, flexShrink: 0, marginTop: 2
                    }}>
                      {idx + 1}
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: 13, color: T.text, fontWeight: 600 }}>
                        {h.question}
                      </p>
                      <p style={{ margin: '4px 0 0 0', fontSize: 12.5, color: T.muted }}>
                        {h.improvementTip}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setGameState('setup')}
              style={{
                background: T.accent, color: '#000', border: 'none', borderRadius: 8,
                padding: '12px 24px', fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6
              }}
            >
              <RotateCcw size={14} /> Start Another Session
            </button>

          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
