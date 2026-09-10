'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Brain, CheckCircle, ChevronRight, Clock,
  Loader2, RotateCcw, ArrowLeft, Send,
  FileText, Award, AlertCircle, ThumbsUp, HelpCircle, Terminal,
  BookOpen, Sparkles, Mic, Volume2, StopCircle, Globe
} from 'lucide-react';
import { T, COURSE, geminiCall, buildQuizPrompt, parseQuizOutput, getCourseDetails } from '@/lib/lms-data';
import { useMediaQuery, isMobileMQ } from '@/lib/useMediaQuery';
import dynamic from 'next/dynamic';
import {
  getCourses, getQuizzes, submitQuizResponse, getQuizSubmissions,
  getAssignments, submitAssignmentResponse, getAssignmentSubmissions
} from '@/lib/frappe';
import PDFViewerModal from './PDFViewerModal';
import VideoPlayerWithAI from './VideoPlayerWithAI';
import VideoAIExplainerCard from './VideoAIExplainerCard';
import PetAvatar from './PetAvatar';
function formatTimestamp(seconds) {
  const total = Math.floor(seconds || 0);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function LessonPage({ lesson, completed = {}, onComplete }) {
  const router  = useRouter();
  const [next, setNext] = useState(null);
  const [isPlaygroundOpen, setIsPlaygroundOpen] = useState(false);
  const [isPdfViewerOpen, setIsPdfViewerOpen] = useState(false);
  const [selectedPdfResource, setSelectedPdfResource] = useState(null);

  // Video AI Explainer ("Ask Vedika") states
  const [videoSeekTime, setVideoSeekTime] = useState(null);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [aiExplainerData, setAiExplainerData] = useState(null);
  const [explainerLoading, setExplainerLoading] = useState(false);
  const [isExplainerOpen, setIsExplainerOpen] = useState(false);
  const [activeCompanionTab, setActiveCompanionTab] = useState('current'); // 'current' | 'ask_vedika' | 'chat'
  const [chatQuestion, setChatQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);

  // Vedika Voice Pet Avatar states
  const [voiceStatus, setVoiceStatus] = useState('disconnected'); // 'disconnected' | 'connecting' | 'connected' | 'error'
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [voiceErrorMessage, setVoiceErrorMessage] = useState('');

  const mediaStreamRef = useRef(null);
  const audioCtxRef = useRef(null);
  const outAudioCtxRef = useRef(null);
  const wsRef = useRef(null);
  const processorRef = useRef(null);
  const audioQueueRef = useRef([]);
  const nextPlayTimeRef = useRef(0);

  const stopAllAudioChunks = () => {
    if (audioQueueRef.current && audioQueueRef.current.length > 0) {
      audioQueueRef.current.forEach(src => {
        try { src.stop(); } catch (e) {}
      });
      audioQueueRef.current = [];
    }
    nextPlayTimeRef.current = 0;
    setIsSpeaking(false);
  };

  const playLiveAudioChunk = (base64Pcm) => {
    if (!base64Pcm) return;
    try {
      const binary = atob(base64Pcm);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const pcmData = new Int16Array(bytes.buffer);
      
      const float32Data = new Float32Array(pcmData.length);
      for (let i = 0; i < pcmData.length; i++) float32Data[i] = pcmData[i] / 32768.0;

      let audioCtx = outAudioCtxRef.current;
      if (!audioCtx || audioCtx.state === 'closed') {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
        outAudioCtxRef.current = audioCtx;
      }
      if (audioCtx.state === 'suspended') audioCtx.resume();

      const buffer = audioCtx.createBuffer(1, float32Data.length, 24000);
      buffer.getChannelData(0).set(float32Data);

      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(audioCtx.destination);

      source.onended = () => {
        const idx = audioQueueRef.current.indexOf(source);
        if (idx !== -1) audioQueueRef.current.splice(idx, 1);
        if (audioQueueRef.current.length === 0) {
          setIsSpeaking(false);
        }
      };

      audioQueueRef.current.push(source);
      setIsSpeaking(true);

      const now = audioCtx.currentTime;
      if (nextPlayTimeRef.current < now) {
        nextPlayTimeRef.current = now + 0.05;
      }
      source.start(nextPlayTimeRef.current);
      nextPlayTimeRef.current += buffer.duration;
    } catch (e) {
      console.error('PCM playback error:', e);
    }
  };

  const stopVedikaVoiceSession = () => {
    if (processorRef.current) {
      try { processorRef.current.disconnect(); } catch (e) {}
      processorRef.current = null;
    }
    if (mediaStreamRef.current) {
      try { mediaStreamRef.current.getTracks().forEach(t => t.stop()); } catch (e) {}
      mediaStreamRef.current = null;
    }
    if (wsRef.current) {
      try { wsRef.current.close(); } catch (e) {}
      wsRef.current = null;
    }
    stopAllAudioChunks();
    setVoiceStatus('disconnected');
    setIsSpeaking(false);
    setIsListening(false);
    setIsThinking(false);
  };

  const startVedikaVoiceSession = async () => {
    if (voiceStatus === 'connecting' || voiceStatus === 'connected') return;

    setVoiceStatus('connecting');
    setVoiceErrorMessage('');
    setIsThinking(true);

    try {
      // Unlock AudioContext inside the user gesture!
      let outCtx = outAudioCtxRef.current;
      if (!outCtx || outCtx.state === 'closed') {
        outCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
        outAudioCtxRef.current = outCtx;
      }
      if (outCtx.state === 'suspended') {
        await outCtx.resume();
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      audioCtxRef.current = audioCtx;

      const primaryWsHost = process.env.NEXT_PUBLIC_WS_URL || (
        window.location.hostname === 'localhost'
          ? 'ws://localhost:5001'
          : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`
      );
      const fallbackWsHost = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`;

      const currentSecs = Math.max(0, Math.floor(videoCurrentTime || aiExplainerData?.seconds || 0));
      const cleanVid = extractYoutubeId(lesson?.vid) || '';
      const snippetText = aiExplainerData?.transcriptSnippet || '';
      const voiceSid = 'vedika-video-' + Date.now().toString(36);

      const wsUrl = `${primaryWsHost}/api/ws?mode=video_tutor&videoTitle=${encodeURIComponent(lesson?.title || 'Lesson')}&timestamp=${currentSecs}&videoId=${cleanVid}&transcriptSnippet=${encodeURIComponent(snippetText.slice(0, 1000))}&sessionId=${voiceSid}`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      const setupAudioProcessor = () => {
        const source = audioCtx.createMediaStreamSource(stream);
        const processor = audioCtx.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;
        
        const silentGain = audioCtx.createGain();
        silentGain.gain.value = 0;
        source.connect(processor);
        processor.connect(silentGain);
        silentGain.connect(audioCtx.destination);

        processor.onaudioprocess = (e) => {
          if (ws.readyState !== WebSocket.OPEN || isSpeaking) return;
          const float32Data = e.inputBuffer.getChannelData(0);
          
          let sum = 0;
          for (let i = 0; i < float32Data.length; i++) {
            sum += float32Data[i] * float32Data[i];
          }
          const rms = Math.sqrt(sum / float32Data.length);
          if (rms > 0.02) {
            setIsListening(true);
          } else {
            setIsListening(false);
          }

          const pcmBuffer = new ArrayBuffer(float32Data.length * 2);
          const dataView = new DataView(pcmBuffer);
          let offset = 0;
          for (let i = 0; i < float32Data.length; i++, offset += 2) {
            let s = Math.max(-1, Math.min(1, float32Data[i]));
            dataView.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
          }

          let binary = '';
          const bytes = new Uint8Array(pcmBuffer);
          for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
          ws.send(JSON.stringify({ type: 'audio', data: btoa(binary) }));
        };
      };

      ws.onopen = () => {
        setVoiceStatus('connected');
        setIsThinking(false);
        setupAudioProcessor();
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'audio') {
            setIsThinking(false);
            setIsListening(false);
            playLiveAudioChunk(message.data);
          } else if (message.type === 'interrupted') {
            stopAllAudioChunks();
            setIsSpeaking(false);
          } else if (message.type === 'error') {
            console.warn('[VedikaVoice] WS message error:', message.message);
          }
        } catch (e) {
          console.error('[VedikaVoice] WS parse error:', e);
        }
      };

      ws.onerror = () => {
        if (primaryWsHost !== fallbackWsHost && wsRef.current === ws) {
          console.warn('[VedikaVoice] Connecting to fallback port 3000...');
          const fallbackUrl = `${fallbackWsHost}/api/ws?mode=video_tutor&videoTitle=${encodeURIComponent(lesson?.title || 'Lesson')}&timestamp=${currentSecs}&videoId=${cleanVid}&sessionId=${voiceSid}`;
          const fallbackWs = new WebSocket(fallbackUrl);
          wsRef.current = fallbackWs;

          fallbackWs.onopen = () => {
            setVoiceStatus('connected');
            setIsThinking(false);
            setupAudioProcessor();
          };

          fallbackWs.onmessage = ws.onmessage;
          fallbackWs.onerror = () => {
            setVoiceStatus('error');
            setVoiceErrorMessage('Could not connect to Vedika Voice server.');
            stopVedikaVoiceSession();
          };
          fallbackWs.onclose = () => {
            setVoiceStatus('disconnected');
            setIsSpeaking(false);
            setIsListening(false);
            setIsThinking(false);
          };
        } else {
          setVoiceStatus('error');
          setVoiceErrorMessage('Could not connect to Vedika Voice server.');
          stopVedikaVoiceSession();
        }
      };

      ws.onclose = () => {
        setVoiceStatus('disconnected');
        setIsSpeaking(false);
        setIsListening(false);
        setIsThinking(false);
      };

    } catch (err) {
      console.error('Failed to get mic access:', err);
      setVoiceStatus('error');
      setVoiceErrorMessage('Microphone access denied. Please allow mic access to talk with Vedika.');
      setIsThinking(false);
    }
  };

  useEffect(() => {
    return () => {
      stopVedikaVoiceSession();
    };
  }, []);

  const handleExplainVideoAtTime = async (seconds, optionalQuestion = '') => {
    const cleanId = extractYoutubeId(lesson?.vid);
    if (!cleanId) return;

    setExplainerLoading(true);
    setIsExplainerOpen(true);
    try {
      const res = await fetch('/api/youtube/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: cleanId,
          timestamp: seconds,
          title: lesson.title,
          userQuestion: optionalQuestion
        })
      });
      const data = await res.json();
      if (data && !data.error) {
        setAiExplainerData(data);
      } else {
        setAiExplainerData({
          timestamp: formatTimestamp(seconds),
          seconds: seconds,
          summary: `At this moment, core concepts in "${lesson.title}" are being demonstrated.`,
          coreExplanation: lesson.overview || "In this lesson moment, key concepts and demonstrations are presented.",
          keyTakeaways: lesson.pts || ["Key concept introduction."]
        });
      }
    } catch (e) {
      console.error("Failed to explain timestamp:", e);
    } finally {
      setExplainerLoading(false);
    }
  };

  const handleAskQuestion = async (qText) => {
    if (!qText || !qText.trim() || chatLoading) return;
    const q = qText.trim();
    setChatQuestion('');
    setActiveCompanionTab('chat');
    setChatHistory(prev => [...prev, { role: 'user', text: q }]);
    setChatLoading(true);
    try {
      const res = await fetch('/api/youtube/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: extractYoutubeId(lesson.vid),
          timestamp: aiExplainerData?.seconds || 0,
          title: lesson.title,
          question: q,
          history: chatHistory
        })
      });
      const data = await res.json();
      const ans = data?.answer || "I evaluated the video and provided an explanation above.";
      setChatHistory(prev => [...prev, { role: 'assistant', text: ans }]);
    } catch (err) {
      setChatHistory(prev => [...prev, { role: 'assistant', text: "Sorry, I could not answer that question right now." }]);
    } finally {
      setChatLoading(false);
    }
  };

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

      {/* Video & AI Companion Side-by-Side Split Layout (Matching Screenshot 1) */}
      {extractYoutubeId(lesson?.vid) ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1.25fr) minmax(0, 1fr)',
          gap: 20,
          marginBottom: 28,
          alignItems: 'start',
          width: '100%'
        }}>
          {/* Left Column (Video Player with Controls) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <VideoPlayerWithAI
              videoId={extractYoutubeId(lesson.vid)}
              onTimeUpdate={(secs, isPaused) => {
                setVideoCurrentTime(secs);
                if (isPaused && activeCompanionTab === 'current') {
                  handleExplainVideoAtTime(secs);
                }
              }}
              onExplainRequested={(secs) => {
                setActiveCompanionTab('current');
                handleExplainVideoAtTime(secs);
              }}
              seekTime={videoSeekTime}
              onSeekComplete={() => setVideoSeekTime(null)}
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: T.muted, padding: '0 4px' }}>
              <span style={{ fontWeight: 600, color: T.text }}>{lesson.title}</span>
              <span style={{ fontSize: 11, background: `${T.accent}15`, color: T.accent, padding: '2px 10px', borderRadius: 20, border: `1px solid ${T.accent}30` }}>YouTube Lesson</span>
            </div>
          </div>

          {/* Right Column: Ask Vedika AI Companion Panel (Theme Adaptive) */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 16,
            border: `1px solid ${T.border}`,
            background: T.s1,
            padding: 16,
            color: T.text,
            boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.08)',
            gap: 14,
            maxHeight: isMobile ? 'auto' : 520,
            overflowY: 'auto'
          }}>
            {/* Top Tab Bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: 4,
              background: T.s2,
              borderRadius: 12,
              border: `1px solid ${T.border}`
            }}>
              <button
                type="button"
                onClick={() => setActiveCompanionTab('current')}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  transition: 'all 0.15s',
                  cursor: 'pointer',
                  border: 'none',
                  background: activeCompanionTab === 'current' ? T.accent : 'transparent',
                  color: activeCompanionTab === 'current' ? '#FFFFFF' : T.muted,
                  boxShadow: activeCompanionTab === 'current' ? `0 2px 6px ${T.accent}40` : 'none'
                }}
              >
                <BookOpen size={14} />
                Current Moment
              </button>

              <button
                type="button"
                onClick={() => setActiveCompanionTab('ask_vedika')}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  transition: 'all 0.15s',
                  cursor: 'pointer',
                  border: 'none',
                  background: (activeCompanionTab === 'ask_vedika' || activeCompanionTab === 'roadmap') ? T.accent : 'transparent',
                  color: (activeCompanionTab === 'ask_vedika' || activeCompanionTab === 'roadmap') ? '#FFFFFF' : T.muted,
                  boxShadow: (activeCompanionTab === 'ask_vedika' || activeCompanionTab === 'roadmap') ? `0 2px 6px ${T.accent}40` : 'none'
                }}
              >
                <Sparkles size={14} style={{ color: (activeCompanionTab === 'ask_vedika' || activeCompanionTab === 'roadmap') ? '#FCD34D' : T.muted }} />
                Ask Vedika
              </button>

              <button
                type="button"
                onClick={() => setActiveCompanionTab('chat')}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  transition: 'all 0.15s',
                  cursor: 'pointer',
                  border: 'none',
                  background: activeCompanionTab === 'chat' ? T.accent : 'transparent',
                  color: activeCompanionTab === 'chat' ? '#FFFFFF' : T.muted,
                  boxShadow: activeCompanionTab === 'chat' ? `0 2px 6px ${T.accent}40` : 'none'
                }}
              >
                <Brain size={14} />
                Q&A Chat
              </button>
            </div>

            {/* Tab 1 Content: Current Moment */}
            {activeCompanionTab === 'current' && (
              <div>
                {explainerLoading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0', gap: 12, textAlign: 'center' }}>
                    <Loader2 size={28} style={{ color: T.accent }} className="animate-spin" />
                    <p style={{ fontSize: 12, color: T.text, fontWeight: 500, margin: 0 }}>Vedika AI is analyzing what is being taught at this moment...</p>
                  </div>
                ) : aiExplainerData ? (
                  <VideoAIExplainerCard
                    explanation={aiExplainerData}
                    onSeek={(secs) => setVideoSeekTime(secs)}
                    onAskFollowUp={(q) => handleAskQuestion(q)}
                  />
                ) : (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justify: 'center',
                    padding: '36px 16px',
                    borderRadius: 12,
                    background: T.s2,
                    border: `1px solid ${T.border}`,
                    textAlign: 'center',
                    gap: 12
                  }}>
                    <div style={{
                      height: 40,
                      width: 40,
                      borderRadius: '50%',
                      background: `${T.accent}18`,
                      border: `1px solid ${T.accent}35`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: T.accent
                    }}>
                      <Sparkles size={20} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <h4 style={{ fontSize: 12.5, fontWeight: 600, color: T.text, margin: 0 }}>Interactive Video AI Tutor</h4>
                      <p style={{ fontSize: 11, color: T.muted, maxWidth: 280, lineHeight: 1.5, margin: 0 }}>
                        Pause the video at any moment or click <strong style={{ color: T.amber || '#D97706', fontFamily: 'monospace' }}>Explain At MM:SS</strong> to get an instant breakdown!
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleExplainVideoAtTime(0)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        borderRadius: 10,
                        background: T.accent,
                        padding: '6px 14px',
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#FFFFFF',
                        border: 'none',
                        cursor: 'pointer',
                        boxShadow: `0 4px 6px -1px ${T.accent}40`
                      }}
                    >
                      <Sparkles size={14} style={{ color: '#FCD34D' }} />
                      Explain Current Moment
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2 Content: Ask Vedika Interactive Voice Pet Mascot */}
            {(activeCompanionTab === 'ask_vedika' || activeCompanionTab === 'roadmap') && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justify: 'center',
                gap: 12,
                padding: '8px 0'
              }}>
                {/* Non-clickable Video Paused Status Pill (Beside Mascot) */}
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 14px',
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 600,
                  background: `${T.amber || '#F59E0B'}15`,
                  color: T.amber || '#D97706',
                  border: `1px solid ${(T.amber || '#F59E0B')}30`,
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)'
                }}>
                  <span style={{
                    height: 6,
                    width: 6,
                    borderRadius: '50%',
                    background: T.amber || '#F59E0B',
                    display: 'inline-block'
                  }} />
                  <span>Paused at {formatTimestamp(videoCurrentTime)}</span>
                </div>

                {/* Center Animated Mascot Container */}
                <div style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 4
                }}>
                  <div style={{
                    position: 'absolute',
                    width: 165,
                    height: 165,
                    borderRadius: '50%',
                    background: isSpeaking ? `${T.accent}40` : isListening ? '#10B98140' : `${T.accent}15`,
                    filter: 'blur(16px)',
                    transition: 'all 0.3s'
                  }} />

                  <PetAvatar
                    size={155}
                    isSpeaking={isSpeaking}
                    isListening={isListening}
                    isThinking={isThinking}
                  />
                </div>

                {/* Voice Status Badge & Description */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  textAlign: 'center'
                }}>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 12px',
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 600,
                    background: voiceStatus === 'connected'
                      ? (isSpeaking ? `${T.accent}20` : `${T.amber || '#D97706'}20`)
                      : T.s2,
                    color: voiceStatus === 'connected' ? T.text : T.muted,
                    border: `1px solid ${T.border}`
                  }}>
                    {voiceStatus === 'connecting' && <Loader2 size={12} className="animate-spin" style={{ color: T.accent }} />}
                    {voiceStatus === 'connected' && isSpeaking && <Volume2 size={12} style={{ color: T.accent }} />}
                    {voiceStatus === 'connected' && isListening && <Mic size={12} style={{ color: '#10B981' }} />}
                    <span>
                      {voiceStatus === 'disconnected' && 'Vedika AI Pet Mascot'}
                      {voiceStatus === 'connecting' && 'Connecting to Vedika Voice AI...'}
                      {voiceStatus === 'connected' && isSpeaking && 'Vedika is answering in voice...'}
                      {voiceStatus === 'connected' && isListening && 'Vedika is listening... Speak!'}
                      {voiceStatus === 'connected' && !isSpeaking && !isListening && 'Vedika is ready to talk!'}
                      {voiceStatus === 'error' && 'Connection Error'}
                    </span>
                  </div>

                  {voiceErrorMessage && (
                    <p style={{ fontSize: 11, color: '#EF4444', margin: '4px 0 0' }}>{voiceErrorMessage}</p>
                  )}

                  <p style={{ fontSize: 11, color: T.muted, maxWidth: 270, lineHeight: 1.4, margin: 0 }}>
                    {voiceStatus === 'disconnected'
                      ? 'Click "Ask Vedika" to start a live voice conversation about this moment or the entire video lesson!'
                      : 'Speak your question out loud! Vedika listens and answers in real-time voice.'}
                  </p>
                </div>

                {/* Voice Control Buttons (NO TEXT CHAT BOX) */}
                <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                  {voiceStatus === 'disconnected' || voiceStatus === 'error' ? (
                    <button
                      type="button"
                      onClick={startVedikaVoiceSession}
                      style={{
                        width: '100%',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        borderRadius: 12,
                        background: T.accent,
                        padding: '10px 16px',
                        fontSize: 13,
                        fontWeight: 700,
                        color: '#FFFFFF',
                        border: 'none',
                        cursor: 'pointer',
                        boxShadow: `0 6px 16px -2px ${T.accent}50`,
                        transition: 'all 0.15s'
                      }}
                    >
                      <Mic size={16} />
                      Ask Vedika (Start Voice)
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopVedikaVoiceSession}
                      style={{
                        width: '100%',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        borderRadius: 12,
                        background: '#EF4444',
                        padding: '10px 16px',
                        fontSize: 13,
                        fontWeight: 700,
                        color: '#FFFFFF',
                        border: 'none',
                        cursor: 'pointer',
                        boxShadow: '0 6px 16px -2px rgba(239, 68, 68, 0.4)',
                        transition: 'all 0.15s'
                      }}
                    >
                      <StopCircle size={16} />
                      Stop / Disconnect Voice
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Tab 3 Content: Q&A Chat */}
            {activeCompanionTab === 'chat' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{
                  height: 192,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  padding: 8,
                  borderRadius: 12,
                  background: T.s2,
                  border: `1px solid ${T.border}`,
                  fontSize: 12
                }}>
                  {chatHistory.length === 0 ? (
                    <p style={{ fontSize: 11, color: T.muted, textAlign: 'center', padding: '32px 0', margin: 0 }}>
                      Ask Vedika any question about the paused video moment!
                    </p>
                  ) : (
                    chatHistory.map((msg, idx) => (
                      <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                        <div style={{
                          padding: '6px 12px',
                          borderRadius: 12,
                          maxWidth: '85%',
                          fontSize: 11,
                          background: msg.role === 'user' ? T.accent : T.s1,
                          color: msg.role === 'user' ? '#FFFFFF' : T.text,
                          border: msg.role === 'user' ? 'none' : `1px solid ${T.border}`
                        }}>
                          {msg.text}
                        </div>
                      </div>
                    ))
                  )}
                  {chatLoading && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: T.muted, padding: '4px 0' }}>
                      <Loader2 size={14} style={{ color: T.accent }} className="animate-spin" />
                      <span>Vedika AI is thinking...</span>
                    </div>
                  )}
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAskQuestion(chatQuestion);
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <input
                    type="text"
                    value={chatQuestion}
                    onChange={(e) => setChatQuestion(e.target.value)}
                    placeholder="Ask Vedika about this video moment..."
                    style={{
                      flex: 1,
                      borderRadius: 10,
                      background: T.s2,
                      border: `1px solid ${T.border}`,
                      padding: '6px 12px',
                      fontSize: 12,
                      color: T.text,
                      outline: 'none'
                    }}
                  />
                  <button
                    type="submit"
                    disabled={chatLoading}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 10,
                      background: T.accent,
                      padding: '6px 12px',
                      color: '#FFFFFF',
                      border: 'none',
                      cursor: 'pointer',
                      opacity: chatLoading ? 0.6 : 1
                    }}
                  >
                    <Send size={14} />
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      ) : getYoutubeEmbedUrl(lesson?.vid) ? (
        <div style={{
          borderRadius: 14,
          overflow: 'hidden',
          border: `1px solid ${T.border}`,
          marginBottom: 22,
          position: 'relative',
          width: '100%',
          aspectRatio: '16 / 9',
          background: '#000'
        }}>
          <iframe
            width="100%"
            height="100%"
            src={getYoutubeEmbedUrl(lesson.vid)}
            title={lesson.title}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ display: 'block', border: 0, width: '100%', height: '100%' }}
          />
        </div>
      ) : null}

      {/* Overview + Key Points */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.4fr 1fr', gap: 16, marginBottom: 24 }}>
        <div style={{ background: T.s2, border: `1px solid ${T.border}`, borderRadius: 12, padding: '18px 20px' }}>
          <div style={{ color: T.text, fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Overview</div>
          <p style={{ color: T.muted, fontSize: 13.5, lineHeight: 1.7, margin: 0 }}>
            {lesson.overview && lesson.overview !== 'Lesson details are loading...' 
              ? lesson.overview 
              : 'In this lesson, you will explore key concepts, practical examples, and core learning material for this topic.'}
          </p>
        </div>
        <div style={{ background: T.s2, border: `1px solid ${T.border}`, borderRadius: 12, padding: '18px 20px' }}>
          <div style={{ color: T.text, fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Key Points</div>
          {(lesson.pts && lesson.pts.length > 0 ? lesson.pts : ['Core concept introduction.']).map((p, i) => (
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
              <Brain size={13} /> Generate Quiz
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

function extractYoutubeId(input) {
  if (!input || typeof input !== 'string') return '';
  const str = input.trim();
  if (!str) return '';

  // 1. Raw 11-char video ID (alphanumeric, -, _)
  if (/^[a-zA-Z0-9_-]{11}$/.test(str)) {
    return str;
  }

  // 2. Standard YouTube URLs: watch?v=..., embed/..., v/..., shorts/..., live/..., youtu.be/...
  const match = str.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?.*v=|shorts\/|live\/))([a-zA-Z0-9_-]{11})/);
  if (match && match[1]) {
    return match[1];
  }

  // 3. Fallback URL search parameter 'v'
  try {
    const urlObj = new URL(str.startsWith('http') ? str : `https://${str}`);
    const vParam = urlObj.searchParams.get('v');
    if (vParam && /^[a-zA-Z0-9_-]{11}$/.test(vParam)) {
      return vParam;
    }
  } catch (e) {}

  // 4. Any 11-character token match
  const tokenMatch = str.match(/([a-zA-Z0-9_-]{11})/);
  if (tokenMatch && tokenMatch[1]) {
    return tokenMatch[1];
  }

  return '';
}

function getYoutubeEmbedUrl(vid) {
  if (!vid) return '';

  const videoId = extractYoutubeId(vid);
  if (!videoId) return '';

  let queryParams = {};
  if (typeof vid === 'string') {
    const qIdx = vid.indexOf('?');
    if (qIdx !== -1) {
      const queryString = vid.substring(qIdx + 1);
      const searchParams = new URLSearchParams(queryString);
      searchParams.forEach((value, key) => {
        if (key !== 'v') queryParams[key] = value;
      });
    } else {
      const ampIdx = vid.indexOf('&');
      if (ampIdx !== -1) {
        const queryString = vid.substring(ampIdx + 1);
        const searchParams = new URLSearchParams(queryString);
        searchParams.forEach((value, key) => {
          if (key !== 'v') queryParams[key] = value;
        });
      }
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
    if (key !== 't' && key !== 'start' && key !== 'v' && key !== 'si' && key !== 'feature') {
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
