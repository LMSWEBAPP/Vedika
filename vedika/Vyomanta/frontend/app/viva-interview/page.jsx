'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Award, FileText, ChevronRight, HelpCircle, ArrowLeft, Send, 
  AlertCircle, ShieldAlert, CheckCircle, Volume2, VolumeX, RotateCcw, 
  BookOpen, Code, Brain, Settings, Sparkles, Loader2, FlaskConical, 
  Upload, Mic, MicOff, Check, RefreshCw, Printer, AlertTriangle, FileCheck,
  Edit3, ListFilter, Gauge, Zap, Search, Activity, BarChart2
} from 'lucide-react';
import { useMediaQuery, isMobileMQ } from '@/lib/useMediaQuery';
import { getJwtToken } from '@/lib/jwtCache';

const STORAGE_SESSION_KEY = 'vyomanta_active_viva_session';

export default function VivaInterviewPage() {
  const isMobile = useMediaQuery(isMobileMQ);

  // Configuration States
  const [sessionMode, setSessionMode] = useState('viva'); // 'viva' | 'interview'
  const [subject, setSubject] = useState('Physics');
  const [level, setLevel] = useState('College'); // Viva: 'School' | 'College' | 'PG', Interview: 'Junior' | 'Mid-Level' | 'Senior'
  const [difficulty, setDifficulty] = useState('Medium'); // 'Easy' | 'Medium' | 'Hard'
  const [topic, setTopic] = useState("Ohm's Law & Circuit Resistance");
  
  // Custom Viva Setup States
  const [vivaSource, setVivaSource] = useState('preset'); // 'preset' | 'custom'
  const [selectedExperiment, setSelectedExperiment] = useState("Ohm's Law & Circuit Resistance");
  const [customVivaTopic, setCustomVivaTopic] = useState('');

  // Interview Setup States
  const [programmingLanguage, setProgrammingLanguage] = useState('Python');
  const [jdText, setJdText] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeBase64, setResumeBase64] = useState('');
  const [resumeBlueprint, setResumeBlueprint] = useState(null);
  const [parsingResume, setParsingResume] = useState(false);

  // Runtime States
  const [gameState, setGameState] = useState('setup'); // 'setup' | 'active' | 'analyzing' | 'summary'
  const [analysisStep, setAnalysisStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [currentAcknowledgment, setCurrentAcknowledgment] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [userAnswer, setUserAnswer] = useState('');
  
  // Voice & Audio States
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [inputMode, setInputMode] = useState('voice'); // 'voice' | 'text'
  const [savedSessionFound, setSavedSessionFound] = useState(null);
  
  // History & Scorecard
  const [history, setHistory] = useState([]);
  const [scorecard, setScorecard] = useState(null);
  const [expandedQ, setExpandedQ] = useState(null);
  const [turnStartTime, setTurnStartTime] = useState(Date.now());

  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Setup Presets
  const subjects = ['Physics', 'Chemistry', 'Biology', 'Computer Science', 'Mathematics'];
  const experimentPresets = {
    'Physics': ["Ohm's Law & Circuit Resistance", "Young's Double Slit Experiment", "Compound Pendulum & Gravity g", "Hooke's Law & Elasticity"],
    'Chemistry': ["Acid-Base Titration & Molarity", "Qualitative Salt Analysis", "Volumetric Analysis", "Electrochemistry & EMF"],
    'Biology': ["Photosynthesis & Light Spectrum", "Cell Mitosis Observation", "Enzyme Kinetics & Temperature"],
    'Computer Science': ["Binary Search Trees & Traversal", "Sorting Algorithm Complexities", "TCP/IP 3-Way Handshake", "SQL Indexing & Joins"],
    'Mathematics': ["Differential Equations & Calculus", "Matrix Eigenvalues & Vectors", "Probability Distributions"]
  };
  const programmingLanguages = ['Python', 'JavaScript', 'Java', 'C++', 'SQL', 'Systems & Cloud Architecture', 'Fullstack Web'];

  // Check for Saved Session on Mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.history && parsed.history.length > 0 && parsed.currentQIndex < 5) {
          setSavedSessionFound(parsed);
        }
      }
    } catch (e) {
      console.warn('[Viva] Error reading saved session:', e);
    }
  }, []);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event) => {
          let fullFinal = '';
          let fullInterim = '';
          for (let i = 0; i < event.results.length; ++i) {
            const res = event.results[i];
            if (res.isFinal) {
              fullFinal += res[0].transcript + ' ';
            } else {
              fullInterim += res[0].transcript;
            }
          }
          const combined = (fullFinal + fullInterim).trim();
          if (combined) {
            setUserAnswer(combined);
          }
        };

        recognition.onerror = (event) => {
          console.warn('[SpeechRecognition] error:', event.error);
          setIsRecording(false);
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  // Text-To-Speech Output
  const speakText = (text) => {
    if (!ttsEnabled || typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.lang = 'en-US';
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('[TTS] failed:', e);
      setIsSpeaking(false);
    }
  };

  // Toggle Microphone (Start / Stop Recording)
  const toggleRecording = async () => {
    if (isRecording) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    } else {
      setUserAnswer('');
      setIsRecording(true);

      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
      }

      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.warn('[SpeechRecognition] start err:', e);
        }
      } else if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const mediaRecorder = new MediaRecorder(stream);
          audioChunksRef.current = [];
          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) audioChunksRef.current.push(event.data);
          };
          mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            stream.getTracks().forEach(track => track.stop());
            
            const reader = new FileReader();
            reader.onloadend = async () => {
              try {
                const token = await getJwtToken();
                const res = await fetch('/api/viva-interview', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify({
                    action: 'transcribe-audio',
                    audioBase64: reader.result,
                    audioMimeType: 'audio/webm'
                  })
                });
                const data = await res.json();
                if (data.text) setUserAnswer(data.text);
              } catch (err) {
                console.error('[Audio Transcribe Error]:', err);
              }
            };
            reader.readAsDataURL(audioBlob);
          };
          mediaRecorder.start();
          mediaRecorderRef.current = mediaRecorder;
        } catch (err) {
          console.warn('[MediaRecorder Error]:', err);
          setIsRecording(false);
        }
      }
    }
  };

  // Handle Resume File Upload
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setResumeFile(file);
    setParsingResume(true);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Data = reader.result;
      setResumeBase64(base64Data);

      try {
        const token = await getJwtToken();
        const res = await fetch('/api/viva-interview', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            action: 'parse-resume',
            resumeBase64: base64Data,
            resumeMimeType: file.type || 'application/pdf'
          })
        });
        const data = await res.json();
        if (data.blueprint) {
          setResumeBlueprint(data.blueprint);
          if (data.blueprint.targetRole) {
            setTopic(data.blueprint.targetRole);
          }
        }
      } catch (err) {
        console.error('[Resume Parse Error]:', err);
      } finally {
        setParsingResume(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Start Fresh Session
  const handleStartSession = async () => {
    let activeTopic = '';
    let activeSubject = subject;

    if (sessionMode === 'viva') {
      if (vivaSource === 'custom') {
        if (!customVivaTopic.trim()) {
          alert("Please enter your custom viva topic/subject.");
          return;
        }
        activeTopic = customVivaTopic.trim();
        activeSubject = customVivaTopic.trim();
      } else {
        activeTopic = selectedExperiment;
      }
    } else {
      activeTopic = topic || programmingLanguage;
    }

    if (!activeTopic.trim()) {
      alert("Please select or enter a topic / experiment.");
      return;
    }

    setLoading(true);
    setStatusMessage(`Examiner is preparing your ${difficulty.toLowerCase()} difficulty question...`);
    setHistory([]);
    setCurrentQIndex(0);
    setUserAnswer('');
    setScorecard(null);
    setSavedSessionFound(null);

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
          subject: activeSubject,
          topic: activeTopic,
          level,
          difficulty,
          experimentName: activeTopic,
          programmingLanguage,
          jdText,
          resumeBlueprint,
          history: [],
          questionIndex: 0
        })
      });

      const data = await response.json();
      if (response.ok && data.question) {
        setCurrentAcknowledgment(data.acknowledgment || 'Welcome. Let us begin.');
        setCurrentQuestion(data.question);
        setGameState('active');
        setTurnStartTime(Date.now());
        speakText(`${data.acknowledgment || ''} ${data.question}`);

        localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify({
          sessionMode,
          subject: activeSubject,
          level,
          difficulty,
          topic: activeTopic,
          selectedExperiment: activeTopic,
          programmingLanguage,
          jdText,
          resumeBlueprint,
          history: [],
          currentQIndex: 0,
          currentQuestion: data.question,
          currentAcknowledgment: data.acknowledgment
        }));
      } else {
        alert(data.error || "Failed to initialize interview.");
      }
    } catch (e) {
      console.error(e);
      alert("API request error.");
    } finally {
      setLoading(false);
      setStatusMessage('');
    }
  };

  // Submit Answer & Move to Next Question or Final Evaluation
  const handleAnswerSubmit = async () => {
    if (!userAnswer.trim()) {
      alert("Please speak or type your answer before proceeding.");
      return;
    }

    if (isRecording) {
      toggleRecording();
    }

    const durationSec = Math.max(1, Math.round((Date.now() - turnStartTime) / 1000));
    const newHistory = [
      ...history,
      {
        question: currentQuestion,
        answer: userAnswer.trim(),
        durationSec
      }
    ];

    setHistory(newHistory);
    setUserAnswer('');

    if (currentQIndex >= 4) {
      await handleFinalizeSession(newHistory);
      return;
    }

    const nextIdx = currentQIndex + 1;
    setCurrentQIndex(nextIdx);
    setLoading(true);
    setStatusMessage('Examiner is evaluating your answer and formulating the next question...');

    try {
      const token = await getJwtToken();
      const activeTopic = sessionMode === 'viva' 
        ? (vivaSource === 'custom' ? customVivaTopic : selectedExperiment) 
        : (topic || programmingLanguage);

      const activeSubject = sessionMode === 'viva' && vivaSource === 'custom' ? customVivaTopic : subject;

      const response = await fetch('/api/viva-interview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'question',
          type: sessionMode,
          subject: activeSubject,
          topic: activeTopic,
          level,
          difficulty,
          experimentName: activeTopic,
          programmingLanguage,
          jdText,
          resumeBlueprint,
          history: newHistory,
          questionIndex: nextIdx
        })
      });

      const data = await response.json();
      if (response.ok && data.question) {
        setCurrentAcknowledgment(data.acknowledgment || 'Understood. Let us proceed.');
        setCurrentQuestion(data.question);
        setTurnStartTime(Date.now());
        speakText(`${data.acknowledgment || ''} ${data.question}`);

        localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify({
          sessionMode,
          subject: activeSubject,
          level,
          difficulty,
          topic: activeTopic,
          selectedExperiment: activeTopic,
          programmingLanguage,
          jdText,
          resumeBlueprint,
          history: newHistory,
          currentQIndex: nextIdx,
          currentQuestion: data.question,
          currentAcknowledgment: data.acknowledgment
        }));
      } else {
        alert(data.error || "Failed to fetch next question.");
      }
    } catch (e) {
      console.error(e);
      alert("API request error.");
    } finally {
      setLoading(false);
      setStatusMessage('');
    }
  };

  // Finalize Session & Generate Holistic Scorecard with Responsive Analyzing Animation
  const handleFinalizeSession = async (finalHistory) => {
    // Transition to dedicated analyzing loading screen
    setGameState('analyzing');
    setAnalysisStep(0);

    const stepInterval = setInterval(() => {
      setAnalysisStep(prev => {
        if (prev < 3) return prev + 1;
        return prev;
      });
    }, 1400);

    try {
      const token = await getJwtToken();
      const activeTopic = sessionMode === 'viva' 
        ? (vivaSource === 'custom' ? customVivaTopic : selectedExperiment) 
        : (topic || programmingLanguage);

      const activeSubject = sessionMode === 'viva' && vivaSource === 'custom' ? customVivaTopic : subject;

      const response = await fetch('/api/viva-interview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'evaluate-session',
          type: sessionMode,
          subject: activeSubject,
          topic: activeTopic,
          level,
          difficulty,
          experimentName: activeTopic,
          programmingLanguage,
          jdText,
          resumeBlueprint,
          history: finalHistory
        })
      });

      const scorecardData = await response.json();
      clearInterval(stepInterval);
      setAnalysisStep(4);

      if (response.ok) {
        setTimeout(() => {
          setScorecard(scorecardData);
          setGameState('summary');
          localStorage.removeItem(STORAGE_SESSION_KEY);
        }, 800);
      } else {
        alert(scorecardData.error || "Failed to generate evaluation scorecard.");
        setGameState('active');
      }
    } catch (e) {
      clearInterval(stepInterval);
      console.error(e);
      alert("Scorecard evaluation error.");
      setGameState('active');
    }
  };

  // Resume Saved Session
  const resumeSavedSession = () => {
    if (!savedSessionFound) return;
    setSessionMode(savedSessionFound.sessionMode || 'viva');
    setSubject(savedSessionFound.subject || 'Physics');
    setLevel(savedSessionFound.level || 'College');
    setDifficulty(savedSessionFound.difficulty || 'Medium');
    setTopic(savedSessionFound.topic || '');
    setSelectedExperiment(savedSessionFound.selectedExperiment || '');
    setProgrammingLanguage(savedSessionFound.programmingLanguage || 'Python');
    setJdText(savedSessionFound.jdText || '');
    setResumeBlueprint(savedSessionFound.resumeBlueprint || null);
    setHistory(savedSessionFound.history || []);
    setCurrentQIndex(savedSessionFound.currentQIndex || 0);
    setCurrentQuestion(savedSessionFound.currentQuestion || '');
    setCurrentAcknowledgment(savedSessionFound.currentAcknowledgment || 'Welcome back.');
    setSavedSessionFound(null);
    setGameState('active');
    setTurnStartTime(Date.now());
    speakText(savedSessionFound.currentQuestion);
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
                Vyomanta AI Viva & Interview Hub
              </h1>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: 'var(--muted)' }}>
                Rigorous Voice-Driven Academic Viva Examiner & Technical Job Interview System
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          {gameState === 'setup' && (
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
          )}
        </div>

        {/* RESTORE ACTIVE SESSION BANNER */}
        {savedSessionFound && gameState === 'setup' && (
          <div style={{
            padding: '14px 18px',
            borderRadius: 16,
            background: 'rgba(139, 92, 246, 0.1)',
            border: '1px solid var(--purple)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <AlertCircle size={20} style={{ color: 'var(--purple)' }} />
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>
                Active {savedSessionFound.sessionMode === 'viva' ? 'Viva' : 'Interview'} in progress ({savedSessionFound.history?.length || 0}/5 questions completed • {savedSessionFound.difficulty || 'Medium'} Difficulty).
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={resumeSavedSession}
                style={{
                  padding: '6px 14px',
                  background: 'var(--purple)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Resume Session
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem(STORAGE_SESSION_KEY);
                  setSavedSessionFound(null);
                }}
                style={{
                  padding: '6px 12px',
                  background: 'var(--s2)',
                  color: 'var(--muted)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  fontSize: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                Discard
              </button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* SETUP VIEW */}
        {/* ============================================================== */}
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
                  ? 'Choose standard lab experiments or enter any custom topic. Select your desired difficulty level before starting.' 
                  : 'Upload your resume or enter a target stack/JD. Select difficulty to calibrate examiner depth.'}
              </p>
            </div>

            {/* DIFFICULTY LEVEL SELECTOR (FOR BOTH MODES) */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>
                Select Exam Difficulty Level
              </label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr',
                gap: 10
              }}>
                {[
                  {
                    id: 'Easy',
                    label: 'Easy / Foundational',
                    desc: 'Core definitions, basic formulas & direct standard principles',
                    color: '#10B981',
                    border: 'rgba(16, 185, 129, 0.4)',
                    bg: 'rgba(16, 185, 129, 0.1)'
                  },
                  {
                    id: 'Medium',
                    label: 'Medium / Standard',
                    desc: 'Analytical derivations, error analysis & production scenarios',
                    color: 'var(--accent)',
                    border: 'rgba(79, 131, 246, 0.4)',
                    bg: 'rgba(79, 131, 246, 0.1)'
                  },
                  {
                    id: 'Hard',
                    label: 'Hard / Rigorous',
                    desc: 'In-depth research edge cases, non-ideal conditions & failure modes',
                    color: '#EF4444',
                    border: 'rgba(239, 68, 68, 0.4)',
                    bg: 'rgba(239, 68, 68, 0.1)'
                  }
                ].map((tier) => {
                  const isSelected = difficulty === tier.id;
                  return (
                    <div
                      key={tier.id}
                      onClick={() => setDifficulty(tier.id)}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 14,
                        border: `2px solid ${isSelected ? tier.color : 'var(--border)'}`,
                        background: isSelected ? tier.bg : 'var(--s2)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: isSelected ? tier.color : 'var(--text)' }}>
                          {tier.label}
                        </span>
                        {isSelected && <Check size={16} style={{ color: tier.color }} />}
                      </div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--muted)', lineHeight: 1.3 }}>
                        {tier.desc}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* VIVA MODE OPTIONS */}
            {sessionMode === 'viva' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                
                {/* SOURCE SELECTOR: PRESET EXPERIMENTS VS CUSTOM TOPIC */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                  gap: 12
                }}>
                  <div
                    onClick={() => setVivaSource('preset')}
                    style={{
                      padding: 14,
                      borderRadius: 14,
                      border: `1px solid ${vivaSource === 'preset' ? 'var(--purple)' : 'var(--border)'}`,
                      background: vivaSource === 'preset' ? 'rgba(139, 92, 246, 0.12)' : 'var(--s2)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <ListFilter size={20} style={{ color: vivaSource === 'preset' ? 'var(--purple)' : 'var(--muted)' }} />
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: vivaSource === 'preset' ? 'var(--purple)' : 'var(--text)' }}>
                        Standard Lab Experiments
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
                        Choose from curated Physics, Chemistry, Biology & CS labs
                      </div>
                    </div>
                  </div>

                  <div
                    onClick={() => setVivaSource('custom')}
                    style={{
                      padding: 14,
                      borderRadius: 14,
                      border: `1px solid ${vivaSource === 'custom' ? 'var(--purple)' : 'var(--border)'}`,
                      background: vivaSource === 'custom' ? 'rgba(139, 92, 246, 0.12)' : 'var(--s2)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Edit3 size={20} style={{ color: vivaSource === 'custom' ? 'var(--purple)' : 'var(--muted)' }} />
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: vivaSource === 'custom' ? 'var(--purple)' : 'var(--text)' }}>
                        Custom Subject & Viva Topic
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
                        Type any custom university syllabus or lab topic
                      </div>
                    </div>
                  </div>
                </div>

                {/* LEVEL SELECTION */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                  gap: 18
                }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>
                      Academic Education Level
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
                      <option value="School">School (High School / K-12)</option>
                      <option value="College">College (Undergraduate B.Tech / B.Sc)</option>
                      <option value="PG">Postgraduate / Research</option>
                    </select>
                  </div>

                  {/* SUBJECT AREA (ACTIVE IN PRESET MODE, DESELECTED IN CUSTOM MODE) */}
                  <div style={{ opacity: vivaSource === 'preset' ? 1 : 0.45, transition: 'opacity 0.2s ease' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>
                      Subject Area {vivaSource === 'custom' ? '(Deselected for Custom Topic)' : ''}
                    </label>
                    <select
                      disabled={vivaSource === 'custom'}
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
                        cursor: vivaSource === 'custom' ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                {/* PRESET EXPERIMENTS LIST */}
                {vivaSource === 'preset' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Select Experiment in {subject}
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
                  </div>
                ) : (
                  /* CUSTOM TOPIC INPUT (SUBJECT DESELECTED) */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--purple)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Enter Custom Viva Topic / Syllabus / Experiment
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Quantum Entanglement, Organic Chemistry Reactions, Operating System Paging, Fluid Dynamics..."
                      value={customVivaTopic}
                      onChange={(e) => setCustomVivaTopic(e.target.value)}
                      style={{
                        width: '100%',
                        background: 'var(--s2)',
                        border: '2px solid var(--purple)',
                        borderRadius: 14,
                        padding: '12px 16px',
                        fontSize: '0.9rem',
                        color: 'var(--text)',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    <span style={{ fontSize: '0.725rem', color: 'var(--muted)' }}>
                      Vedika will construct an oral viva examination strictly testing this topic without being constrained to predefined subjects.
                    </span>
                  </div>
                )}

              </div>
            ) : (
              /* INTERVIEW MODE OPTIONS */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                  gap: 18
                }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>
                      Primary Tech Stack / Programming Language
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
                      Target Seniority Level
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
                        outline: 'none'
                      }}
                    >
                      <option value="Junior">Junior / Entry-Level Engineer</option>
                      <option value="Mid-Level">Mid-Level Software Engineer</option>
                      <option value="Senior">Senior / Tech Lead Architect</option>
                    </select>
                  </div>
                </div>

                {/* RESUME UPLOAD SECTION */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>
                    Upload Candidate Resume (Optional - PDF or Text)
                  </label>
                  <div style={{
                    border: '2px dashed var(--border)',
                    borderRadius: 16,
                    padding: 20,
                    textAlign: 'center',
                    background: 'var(--s2)',
                    cursor: 'pointer',
                    position: 'relative'
                  }}>
                    <input
                      type="file"
                      accept=".pdf,.txt,.md,.doc,.docx"
                      onChange={handleFileUpload}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        opacity: 0,
                        cursor: 'pointer'
                      }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      {parsingResume ? (
                        <>
                          <Loader2 className="animate-spin" size={24} style={{ color: 'var(--accent)' }} />
                          <span style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text)' }}>
                            Parsing resume document...
                          </span>
                        </>
                      ) : resumeFile ? (
                        <>
                          <FileCheck size={28} style={{ color: '#10B981' }} />
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)' }}>
                            {resumeFile.name} (Uploaded)
                          </span>
                          {resumeBlueprint && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                              Parsed: {resumeBlueprint.targetRole} • Skills: {(resumeBlueprint.keySkills || []).slice(0, 4).join(', ')}
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          <Upload size={24} style={{ color: 'var(--accent)' }} />
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>
                            Drop candidate resume (PDF/Text) or click to browse
                          </span>
                          <span style={{ fontSize: '0.725rem', color: 'var(--muted)' }}>
                            Automatically customizes interview questions to match projects & skills
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>
                    Job Description (JD) / Target Role Details (Optional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Paste target Job Description text here to anchor interview questions to specific company requirements..."
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

            {/* START BUTTON */}
            <button
              onClick={handleStartSession}
              disabled={loading || parsingResume}
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
                cursor: (loading || parsingResume) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                boxShadow: '0 8px 24px rgba(139, 92, 246, 0.3)',
                transition: 'all 0.2s ease',
                opacity: (loading || parsingResume) ? 0.7 : 1
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>{statusMessage || 'Initializing Session...'}</span>
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  <span>Start Voice {sessionMode === 'viva' ? 'Viva Examination' : 'Technical Interview'} ({difficulty})</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* ============================================================== */}
        {/* ACTIVE SESSION VIEW (PURE EXAMINER VOICE LOOP) */}
        {/* ============================================================== */}
        {gameState === 'active' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            
            {/* EXAMINER QUESTION CARD */}
            <div style={{
              background: 'var(--s1)',
              border: `1px solid var(--border)`,
              borderRadius: 24,
              padding: isMobile ? '20px 16px' : '28px 24px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.05)',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              gap: 16
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: `1px solid var(--border)`,
                paddingBottom: 12
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: 8,
                    background: 'rgba(139, 92, 246, 0.15)',
                    color: 'var(--purple)',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    letterSpacing: '0.05em'
                  }}>
                    QUESTION {currentQIndex + 1} OF 5
                  </span>
                  <span style={{
                    padding: '3px 8px',
                    borderRadius: 6,
                    background: difficulty === 'Easy' ? 'rgba(16, 185, 129, 0.15)' : difficulty === 'Hard' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(79, 131, 246, 0.15)',
                    color: difficulty === 'Easy' ? '#10B981' : difficulty === 'Hard' ? '#EF4444' : 'var(--accent)',
                    fontSize: '0.7rem',
                    fontWeight: 700
                  }}>
                    {difficulty}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                    • {sessionMode === 'viva' ? (vivaSource === 'custom' ? customVivaTopic : selectedExperiment) : (programmingLanguage || 'Technical Stack')}
                  </span>
                </div>

                <button
                  onClick={() => {
                    const next = !ttsEnabled;
                    setTtsEnabled(next);
                    if (!next && typeof window !== 'undefined' && window.speechSynthesis) {
                      window.speechSynthesis.cancel();
                      setIsSpeaking(false);
                    } else if (next) {
                      speakText(currentQuestion);
                    }
                  }}
                  style={{
                    padding: '6px 10px',
                    background: 'var(--s2)',
                    border: `1px solid var(--border)`,
                    color: ttsEnabled ? 'var(--accent)' : 'var(--muted)',
                    borderRadius: 8,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  {ttsEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                  <span>{isSpeaking ? 'Speaking...' : ttsEnabled ? 'Voice On' : 'Muted'}</span>
                </button>
              </div>

              {/* EXAMINER ACKNOWLEDGMENT BUBBLE */}
              {currentAcknowledgment && (
                <div style={{
                  fontSize: '0.8rem',
                  color: 'var(--purple)',
                  fontWeight: 600,
                  fontStyle: 'italic',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}>
                  <span>💬 Examiner:</span>
                  <span>"{currentAcknowledgment}"</span>
                </div>
              )}

              {/* QUESTION DISPLAY */}
              <h2 style={{
                margin: 0,
                fontSize: isMobile ? '1.15rem' : '1.35rem',
                fontWeight: 700,
                color: 'var(--text)',
                lineHeight: 1.5
              }}>
                "{currentQuestion}"
              </h2>
            </div>

            {/* CANDIDATE VOICE / ANSWER CONSOLE */}
            <div style={{
              background: 'var(--s1)',
              border: `1px solid var(--border)`,
              borderRadius: 24,
              padding: isMobile ? '20px 16px' : '28px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: 20
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Candidate Response {isRecording ? '• Live Recording...' : ''}
                </label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => setInputMode(inputMode === 'voice' ? 'text' : 'voice')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--purple)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                  >
                    {inputMode === 'voice' ? 'Switch to Typing' : 'Switch to Voice Mic'}
                  </button>
                </div>
              </div>

              {/* TAP-TO-SPEAK MIC BUTTON */}
              {inputMode === 'voice' && (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '24px 16px',
                  background: 'var(--s2)',
                  borderRadius: 20,
                  border: `1px solid ${isRecording ? 'var(--purple)' : 'var(--border)'}`,
                  gap: 14,
                  transition: 'all 0.2s ease'
                }}>
                  <button
                    onClick={toggleRecording}
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: '50%',
                      border: 'none',
                      background: isRecording
                        ? 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)'
                        : 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: isRecording
                        ? '0 0 24px rgba(239, 68, 68, 0.6)'
                        : '0 4px 20px rgba(139, 92, 246, 0.3)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {isRecording ? <MicOff size={30} /> : <Mic size={30} />}
                  </button>
                  <div style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: isRecording ? '#EF4444' : 'var(--text)' }}>
                      {isRecording ? 'Recording active... Tap when finished speaking' : 'Tap Microphone to Speak Answer'}
                    </span>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.725rem', color: 'var(--muted)' }}>
                      Speak in clear English. Your speech is transcribed in real-time below.
                    </p>
                  </div>
                </div>
              )}

              {/* TRANSCRIPT / ANSWER TEXT DISPLAY */}
              <div>
                <textarea
                  rows={4}
                  placeholder={inputMode === 'voice' ? "Your spoken answer will appear here in real time..." : "Type your answer clearly..."}
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
              </div>

              {/* SUBMIT BUTTON */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                  {loading && (statusMessage || 'Examiner is evaluating your answer...')}
                </span>

                <button
                  onClick={handleAnswerSubmit}
                  disabled={loading || !userAnswer.trim()}
                  style={{
                    padding: '12px 24px',
                    background: currentQIndex >= 4 ? 'var(--accent)' : 'var(--purple)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 14,
                    fontSize: '0.85rem',
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
                  {loading ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <Send size={16} />
                  )}
                  <span>{currentQIndex >= 4 ? 'Submit Final Answer & View Scorecard' : 'Submit & Next Question'}</span>
                </button>
              </div>

            </div>

          </div>
        )}

        {/* ============================================================== */}
        {/* RESPONSIVE ANALYZING & EVALUATION LOADING VIEW */}
        {/* ============================================================== */}
        {gameState === 'analyzing' && (
          <div style={{
            background: 'var(--s1)',
            border: `1px solid var(--border)`,
            borderRadius: 28,
            padding: isMobile ? '32px 18px' : '48px 36px',
            boxShadow: '0 16px 48px rgba(0, 0, 0, 0.12)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: 28,
            maxWidth: 720,
            margin: '0 auto',
            width: '100%',
            boxSizing: 'border-box'
          }}>
            
            {/* GLOWING ANIMATED RADAR / BRAIN ICON */}
            <div style={{ position: 'relative', width: 90, height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(139, 92, 246, 0.35) 0%, rgba(79, 131, 246, 0.05) 70%)',
                animation: 'pulse 2s infinite ease-in-out'
              }} />
              <div style={{
                width: 76,
                height: 76,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--purple) 0%, var(--accent) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                boxShadow: '0 8px 32px rgba(139, 92, 246, 0.45)',
                zIndex: 1
              }}>
                <Brain size={38} className="animate-pulse" />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--purple)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                  AI EXAMINER COMMITTEE
                </span>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: 6,
                  background: difficulty === 'Easy' ? 'rgba(16, 185, 129, 0.15)' : difficulty === 'Hard' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(79, 131, 246, 0.15)',
                  color: difficulty === 'Easy' ? '#10B981' : difficulty === 'Hard' ? '#EF4444' : 'var(--accent)',
                  fontSize: '0.7rem',
                  fontWeight: 800
                }}>
                  {difficulty} Difficulty
                </span>
              </div>
              <h2 style={{ margin: 0, fontSize: isMobile ? '1.35rem' : '1.65rem', fontWeight: 800, color: 'var(--text)' }}>
                Analyzing Performance & Compiling Scorecard
              </h2>
              <p style={{ margin: '8px 0 0 0', fontSize: '0.825rem', color: 'var(--muted)', maxWidth: 480 }}>
                Vedika AI is conducting a multi-dimension rubric audit on your 5 recorded answers for <strong style={{ color: 'var(--purple)' }}>{sessionMode === 'viva' ? (vivaSource === 'custom' ? customVivaTopic : selectedExperiment) : (programmingLanguage || 'Technical Stack')}</strong>.
              </p>
            </div>

            {/* PROGRESS BAR */}
            <div style={{ width: '100%', maxWidth: 520, height: 8, background: 'var(--s2)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{
                width: `${Math.min(100, Math.max(15, (analysisStep + 1) * 22))}%`,
                height: '100%',
                background: 'linear-gradient(90deg, var(--purple) 0%, var(--accent) 100%)',
                borderRadius: 4,
                transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
              }} />
            </div>

            {/* STEP-BY-STEP CHECKLIST CARDS */}
            <div style={{
              width: '100%',
              maxWidth: 520,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              textAlign: 'left'
            }}>
              {[
                { label: 'Ingesting & normalizing 5 transcript turns & speech durations', icon: Activity },
                { label: 'Evaluating Technical Accuracy & Scientific / Coding Principles', icon: Search },
                { label: 'Performing Conceptual Gap & Misconception Analysis', icon: ShieldAlert },
                { label: 'Synthesizing 4-Dimension Rubric & Targeted Study Roadmap', icon: BarChart2 }
              ].map((st, sIdx) => {
                const isDone = analysisStep > sIdx;
                const isCurrent = analysisStep === sIdx;
                const Icon = st.icon;

                return (
                  <div
                    key={sIdx}
                    style={{
                      padding: '12px 16px',
                      borderRadius: 14,
                      background: isCurrent ? 'rgba(139, 92, 246, 0.08)' : 'var(--s2)',
                      border: `1px solid ${isCurrent ? 'var(--purple)' : isDone ? 'rgba(16, 185, 129, 0.3)' : 'var(--border)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.2s ease',
                      opacity: sIdx > analysisStep ? 0.45 : 1
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Icon size={18} style={{ color: isDone ? '#10B981' : isCurrent ? 'var(--purple)' : 'var(--muted)' }} />
                      <span style={{ fontSize: '0.8rem', fontWeight: isCurrent ? 700 : 500, color: isCurrent ? 'var(--text)' : 'var(--muted)' }}>
                        {st.label}
                      </span>
                    </div>

                    <div>
                      {isDone ? (
                        <CheckCircle size={18} style={{ color: '#10B981' }} />
                      ) : isCurrent ? (
                        <Loader2 className="animate-spin" size={18} style={{ color: 'var(--purple)' }} />
                      ) : (
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--border)' }} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        )}

        {/* ============================================================== */}
        {/* SUMMARY SCORECARD DASHBOARD VIEW */}
        {/* ============================================================== */}
        {gameState === 'summary' && scorecard && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 24
          }}>
            
            {/* SCORECARD HERO CARD */}
            <div style={{
              background: 'var(--s1)',
              border: `1px solid var(--border)`,
              borderRadius: 24,
              padding: isMobile ? 24 : 36,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: 18
            }}>
              <Award size={56} style={{ color: 'var(--purple)' }} />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--purple)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    OFFICIAL EVALUATION SCORECARD
                  </span>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: 6,
                    background: difficulty === 'Easy' ? 'rgba(16, 185, 129, 0.15)' : difficulty === 'Hard' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(79, 131, 246, 0.15)',
                    color: difficulty === 'Easy' ? '#10B981' : difficulty === 'Hard' ? '#EF4444' : 'var(--accent)',
                    fontSize: '0.7rem',
                    fontWeight: 800
                  }}>
                    {difficulty} DIFFICULTY
                  </span>
                </div>
                <h2 style={{ margin: '6px 0 0 0', fontSize: '1.75rem', fontWeight: 800, color: 'var(--text)' }}>
                  Performance Report: {sessionMode === 'viva' ? (vivaSource === 'custom' ? customVivaTopic : selectedExperiment) : (programmingLanguage || 'Technical Interview')}
                </h2>
              </div>

              {/* SCORE BADGES */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 20,
                flexWrap: 'wrap'
              }}>
                <div style={{
                  padding: '12px 24px',
                  borderRadius: 16,
                  background: 'var(--s2)',
                  border: `1px solid var(--border)`,
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '1.75rem', fontWeight: 900, color: scorecard.overallScore >= 70 ? '#10B981' : scorecard.overallScore >= 50 ? 'var(--accent)' : '#EF4444' }}>
                    {scorecard.overallScore} / 100
                  </div>
                  <span style={{ fontSize: '0.725rem', color: 'var(--muted)', fontWeight: 600 }}>OVERALL SCORE</span>
                </div>

                <div style={{
                  padding: '12px 24px',
                  borderRadius: 16,
                  background: 'var(--s2)',
                  border: `1px solid var(--border)`,
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '1.75rem', fontWeight: 900, color: scorecard.letterGrade.startsWith('A') ? '#10B981' : scorecard.letterGrade.startsWith('B') ? 'var(--accent)' : '#EF4444' }}>
                    Grade {scorecard.letterGrade}
                  </div>
                  <span style={{ fontSize: '0.725rem', color: 'var(--muted)', fontWeight: 600 }}>EVALUATION GRADE</span>
                </div>
              </div>

              {/* SUMMARY CRITIQUE */}
              <p style={{
                margin: 0,
                fontSize: '0.875rem',
                color: 'var(--text)',
                maxWidth: 680,
                lineHeight: 1.6,
                background: 'var(--s2)',
                padding: '14px 18px',
                borderRadius: 14,
                border: `1px solid var(--border)`
              }}>
                "{scorecard.summaryCritique}"
              </p>
            </div>

            {/* 4-DIMENSION RUBRIC BREAKDOWN GRID */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
              gap: 16
            }}>
              {Object.entries(scorecard.rubricBreakdown || {}).map(([dimKey, dimVal]) => {
                const labels = {
                  technicalAccuracy: { title: 'Technical Accuracy & Depth', weight: '35%' },
                  problemSolving: { title: 'Problem Solving & Architecture', weight: '25%' },
                  communicationClarity: { title: 'Communication & Articulation', weight: '20%' },
                  depthAndCompleteness: { title: 'Depth & Edge Cases', weight: '20%' }
                };
                const info = labels[dimKey] || { title: dimKey, weight: '' };

                return (
                  <div key={dimKey} style={{
                    padding: 18,
                    borderRadius: 18,
                    background: 'var(--s1)',
                    border: `1px solid var(--border)`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text)' }}>
                        {info.title} <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>({info.weight})</span>
                      </span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--purple)' }}>
                        {dimVal.score} / 10
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div style={{ width: '100%', height: 6, background: 'var(--s2)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{
                        width: `${(dimVal.score / 10) * 100}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, var(--purple) 0%, var(--accent) 100%)',
                        borderRadius: 3
                      }} />
                    </div>

                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--muted)', lineHeight: 1.4 }}>
                      {dimVal.feedback}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* QUESTION-BY-QUESTION AUDIT ACCORDION */}
            <div style={{
              background: 'var(--s1)',
              border: `1px solid var(--border)`,
              borderRadius: 24,
              padding: isMobile ? 18 : 28,
              display: 'flex',
              flexDirection: 'column',
              gap: 16
            }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text)' }}>
                Detailed Question-by-Question Audit ({difficulty} Difficulty)
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {(scorecard.perQuestionAnalysis || []).map((qItem, idx) => {
                  const isExpanded = expandedQ === idx;
                  const isLowScore = (qItem.score || 0) <= 3;
                  return (
                    <div key={idx} style={{
                      borderRadius: 16,
                      background: 'var(--s2)',
                      border: `1px solid ${isLowScore ? 'rgba(239, 68, 68, 0.4)' : 'var(--border)'}`,
                      overflow: 'hidden',
                      transition: 'all 0.15s ease'
                    }}>
                      <div 
                        onClick={() => setExpandedQ(isExpanded ? null : idx)}
                        style={{
                          padding: '14px 18px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--purple)' }}>
                            Q{idx + 1}
                          </span>
                          <span style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text)' }}>
                            {qItem.question}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ 
                            fontSize: '0.8rem', 
                            fontWeight: 800, 
                            color: qItem.score >= 7 ? '#10B981' : qItem.score >= 4 ? 'var(--accent)' : '#EF4444' 
                          }}>
                            Score: {qItem.score}/10
                          </span>
                          <ChevronRight size={16} style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                        </div>
                      </div>

                      {isExpanded && (
                        <div style={{
                          padding: '0 18px 16px 18px',
                          borderTop: `1px solid var(--border)`,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 10,
                          fontSize: '0.8rem'
                        }}>
                          <div style={{ marginTop: 10 }}>
                            <strong style={{ color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Candidate Answer:</strong>
                            <p style={{ margin: 0, color: 'var(--text)' }}>"{qItem.candidateAnswer}"</p>
                          </div>
                          <div>
                            <strong style={{ color: 'var(--purple)', display: 'block', marginBottom: 4 }}>Reference Model Answer:</strong>
                            <p style={{ margin: 0, color: 'var(--text)' }}>{qItem.idealAnswer}</p>
                          </div>
                          <div>
                            <strong style={{ color: '#EF4444', display: 'block', marginBottom: 4 }}>Identified Conceptual Gaps:</strong>
                            <p style={{ margin: 0, color: 'var(--muted)' }}>{qItem.keyGaps}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* STRENGTHS & ACTIONABLE PREPARATION ROADMAP */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
              gap: 16
            }}>
              {/* STRENGTHS */}
              <div style={{
                padding: 20,
                borderRadius: 20,
                background: 'var(--s1)',
                border: `1px solid var(--border)`,
                display: 'flex',
                flexDirection: 'column',
                gap: 12
              }}>
                <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#10B981', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle size={18} />
                  <span>Demonstrated Strengths</span>
                </h4>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.8rem', color: 'var(--text)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(scorecard.strengths || []).map((st, sIdx) => (
                    <li key={sIdx}>{st}</li>
                  ))}
                </ul>
              </div>

              {/* ROADMAP / IMPROVEMENT */}
              <div style={{
                padding: 20,
                borderRadius: 20,
                background: 'var(--s1)',
                border: `1px solid var(--border)`,
                display: 'flex',
                flexDirection: 'column',
                gap: 12
              }}>
                <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: 'var(--purple)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Sparkles size={18} />
                  <span>Targeted Study Roadmap</span>
                </h4>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.8rem', color: 'var(--text)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(scorecard.recommendedStudyTopics || []).map((tp, tIdx) => (
                    <li key={tIdx}>{tp}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 14,
              flexWrap: 'wrap'
            }}>
              <button
                onClick={() => {
                  setGameState('setup');
                  setScorecard(null);
                  setHistory([]);
                }}
                style={{
                  padding: '12px 24px',
                  background: 'var(--purple)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 16,
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: '0 8px 24px rgba(139, 92, 246, 0.3)'
                }}
              >
                <RotateCcw size={16} />
                <span>Start Another Session</span>
              </button>

              <button
                onClick={() => {
                  if (typeof window !== 'undefined') window.print();
                }}
                style={{
                  padding: '12px 24px',
                  background: 'var(--s2)',
                  color: 'var(--text)',
                  border: `1px solid var(--border)`,
                  borderRadius: 16,
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                <Printer size={16} />
                <span>Print Scorecard</span>
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
