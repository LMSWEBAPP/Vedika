'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Award, FileText, ChevronRight, ChevronDown, HelpCircle, ArrowLeft, Send, 
  AlertCircle, ShieldAlert, CheckCircle, Volume2, VolumeX, RotateCcw, 
  BookOpen, Code, Brain, Settings, Sparkles, Loader2, FlaskConical, 
  Upload, Mic, MicOff, Check, RefreshCw, Printer, AlertTriangle, FileCheck,
  Edit3, ListFilter, Gauge, Zap, Search, Activity, BarChart2, Trash2,
  Radio, PhoneOff, Wifi, Lightbulb, Flag, Clock, Target, CheckCircle2, XCircle
} from 'lucide-react';
import { useMediaQuery, isMobileMQ } from '@/lib/useMediaQuery';
import { getJwtToken } from '@/lib/jwtCache';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import MathEquationRenderer from '@/components/labs/MathEquationRenderer';
import aptitudeData from '@/lib/aptitudeQuestions.json';

const PetAvatar = dynamic(() => import('@/components/PetAvatar'), { ssr: false });

const STORAGE_SESSION_KEY = 'vyomanta_active_viva_session';

export const APTITUDE_CATEGORIES = {
  "Quantitative Aptitude": [
    "Number System", "Percentages", "Profit and Loss", "Simple & Compound Interest",
    "Ratio and Proportion", "Partnership", "Averages", "Mixtures and Allegations",
    "Time and Work", "Pipes and Cisterns", "Time, Speed and Distance", "Boats and Streams",
    "Problems on Ages", "Permutations and Combinations", "Probability", "Geometry",
    "Mensuration (2D & 3D)", "Algebra", "Logarithms", "Progressions (AP, GP)",
    "Data Interpretation", "Data Sufficiency"
  ],
  "Logical Reasoning": [
    "Coding-Decoding", "Blood Relations", "Direction Sense", "Seating Arrangement",
    "Puzzles", "Syllogisms", "Statement and Assumption", "Statement and Conclusion",
    "Cause and Effect", "Analogies", "Series (Number/Letter)", "Odd One Out",
    "Ranking and Order", "Clocks and Calendars", "Cubes and Dice", "Venn Diagrams"
  ],
  "Verbal Ability": [
    "Reading Comprehension", "Vocabulary", "Synonyms and Antonyms", "Sentence Correction",
    "Error Detection", "Fill in the Blanks", "Para Jumbles", "Sentence Completion",
    "Idioms and Phrases", "One-Word Substitution", "Active and Passive Voice",
    "Direct and Indirect Speech", "Grammar"
  ],
  "Non-Verbal Reasoning": [
    "Mirror Images", "Paper Folding", "Figure Series", "Pattern Completion",
    "Embedded Figures", "Image Rotation"
  ],
  "CS & Technical Fundamentals": [
    "Computer Fundamentals", "Pseudocode",
    "Basic Programming (C, C++, Java, Python)", "SQL", "Operating Systems",
    "DBMS", "Computer Networks", "Object-Oriented Programming (OOPs)"
  ]
};

export const PRIORITY_TOPICS = [
  "Percentages", "Profit and Loss", "Ratio and Proportion", "Time and Work",
  "Time, Speed and Distance", "Averages", "Data Interpretation", "Number System",
  "Seating Arrangement", "Puzzles", "Coding-Decoding", "Blood Relations",
  "Reading Comprehension", "Grammar", "Vocabulary", "Para Jumbles", "SQL"
];

export default function VivaInterviewPage() {
  const router = useRouter();
  const isMobile = useMediaQuery(isMobileMQ);

  const handleGoBack = () => {
    if (gameState !== 'setup' || aptSession.status === 'active' || aptSession.status === 'scorecard') {
      setGameState('setup');
      setSessionMode('aptitude');
      setAptSession({ status: 'setup', questions: [], currentIndex: 0, answers: {} });
      setCurrentAptQuestion(null);
      setSelectedAptOption(null);
      setShowAptSolution(false);
      setShowAptHint(false);
      try {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('vedika_aptitude_active_session_v2');
        }
      } catch (e) {}
      return;
    }

    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/dashboard');
    }
  };

  // Configuration States
  const [sessionMode, setSessionMode] = useState('viva'); // 'viva' | 'interview' | 'aptitude'
  const [subject, setSubject] = useState('');
  const [level, setLevel] = useState('College'); // Viva: 'School' | 'College' | 'PG', Interview: 'Junior' | 'Mid-Level' | 'Senior'
  const [difficulty, setDifficulty] = useState('Medium'); // 'Easy' | 'Medium' | 'Hard'
  const [topic, setTopic] = useState('');
  const [activeSessionTopic, setActiveSessionTopic] = useState('');

  // Aptitude Mode States
  const [aptCategory, setAptCategory] = useState("Quantitative Aptitude");
  const [aptTopic, setAptTopic] = useState("Time and Work");
  const [aptCustomTopic, setAptCustomTopic] = useState("");
  const [aptDifficulty, setAptDifficulty] = useState('Medium'); // 'Easy' | 'Medium' | 'Difficult'
  const [aptTestMode, setAptTestMode] = useState('fixed'); // 'fixed' | 'adaptive'
  const [aptTopicDropdownOpen, setAptTopicDropdownOpen] = useState(false);
  const [vivaLevelDropdownOpen, setVivaLevelDropdownOpen] = useState(false);
  const [interviewLevelDropdownOpen, setInterviewLevelDropdownOpen] = useState(false);
  
  // 20-Question Test Session State
  const [aptSession, setAptSession] = useState({
    status: 'setup', // 'setup' | 'active' | 'scorecard'
    questions: [], // array of up to 20 question objects
    currentIndex: 0, // 0..19
    answers: {}, // { [qIndex]: selectedOptionIndex }
    isFetchingMore: false,
    startTime: null,
    endTime: null,
    topic: 'Time and Work',
    category: 'Quantitative Aptitude',
    difficulty: 'Medium'
  });

  const [currentAptQuestion, setCurrentAptQuestion] = useState(null);
  const [selectedAptOption, setSelectedAptOption] = useState(null);
  const [showAptHint, setShowAptHint] = useState(false);
  const [showAptSolution, setShowAptSolution] = useState(false);
  const [aptTimer, setAptTimer] = useState(180);
  const [aptScore, setAptScore] = useState({ correct: 0, total: 0, streak: 0 });
  const [generatingAiAptitude, setGeneratingAiAptitude] = useState(false);
  const [aptSessionRestoredAlert, setAptSessionRestoredAlert] = useState(false);
  
  // Custom Viva Setup States
  const [vivaSource, setVivaSource] = useState('custom');
  const [selectedExperiment, setSelectedExperiment] = useState('');
  const [customVivaTopic, setCustomVivaTopic] = useState('');

  // Topic Validation & Strike Counter States
  const [topicRejectionCount, setTopicRejectionCount] = useState(0);
  const [topicValidationAlert, setTopicValidationAlert] = useState('');

  // Interview Setup States
  const [programmingLanguage, setProgrammingLanguage] = useState('');
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
  
  // Execution Engine & Dynamic Flow States
  const [executionMode, setExecutionMode] = useState('live'); // 'live' (Gemini Live Voice) | 'turn' (Turn Guided)
  const [sessionTimeRemaining, setSessionTimeRemaining] = useState(900); // 15-minute global countdown (900 seconds)
  const [turnTimeRemaining, setTurnTimeRemaining] = useState(90); // 90-second turn countdown for turn-mode
  const [currentStageInfo, setCurrentStageInfo] = useState({
    topicName: "Core Principles",
    questionType: "main",
    topicIndex: 1,
    followUpIndex: 0
  });

  // Gemini Live Runtime States (Identical to Voice Tutor)
  const [liveConnectionStatus, setLiveConnectionStatus] = useState('disconnected'); // 'disconnected' | 'connecting' | 'connected' | 'tutor-speaking' | 'error'
  const [liveStatusMessage, setLiveStatusMessage] = useState('Tap start to begin your oral examination');
  const [liveConversation, setLiveConversation] = useState([]);
  const [liveIsMuted, setLiveIsMuted] = useState(false);
  
  // Realtime Voice Scratchpad & Captions Transcript States
  const [isScratchpadOpen, setIsScratchpadOpen] = useState(false);
  const [scratchpadText, setScratchpadText] = useState('');
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);
  
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

  // Web Speech & MediaRecorder Refs
  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const isRecordingRef = useRef(false);
  const userAnswerRef = useRef('');
  const baseTextRef = useRef('');
  const sessionFinalRef = useRef('');
  const silenceTimeoutRef = useRef(null);
  const liveLastAudioTimeRef = useRef(Date.now());
  const globalTimerRef = useRef(null);
  const turnTimerRef = useRef(null);
  const isNewExaminerTurnRef = useRef(true);

  // Gemini Live Audio & WebSocket Refs (Identical to VoiceAgentView)
  const liveWsRef = useRef(null);
  const liveAudioCtxRef = useRef(null);
  const liveProcessorRef = useRef(null);
  const liveSourceRef = useRef(null);
  const liveMicStreamRef = useRef(null);
  const liveNextPlayTimeRef = useRef(0);
  const liveAudioSourcesQueueRef = useRef([]);
  const liveIsMutedRef = useRef(false);
  const liveWsHadErrorRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);

  useEffect(() => {
    liveIsMutedRef.current = liveIsMuted;
  }, [liveIsMuted]);

  // Keep userAnswerRef synchronized with state for callbacks
  useEffect(() => {
    userAnswerRef.current = userAnswer;
  }, [userAnswer]);

  // Aptitude Question Loader & Session Engine
  const getSeenQuestionHashes = () => {
    try {
      if (typeof window !== 'undefined') {
        return JSON.parse(localStorage.getItem('vedika_aptitude_seen_hashes') || '[]');
      }
    } catch (e) {}
    return [];
  };

  const markQuestionAsSeen = (qText) => {
    try {
      if (typeof window !== 'undefined' && qText) {
        const hash = String(qText).toLowerCase().trim().replace(/\s+/g, ' ');
        const seen = getSeenQuestionHashes();
        if (!seen.includes(hash)) {
          const updated = [hash, ...seen].slice(0, 150);
          localStorage.setItem('vedika_aptitude_seen_hashes', JSON.stringify(updated));
        }
      }
    } catch (e) {}
  };

  const saveAptSessionToStorage = (sessionData) => {
    try {
      if (typeof window !== 'undefined' && sessionData) {
        localStorage.setItem('vedika_aptitude_active_session_v2', JSON.stringify(sessionData));
      }
    } catch (e) {}
  };

  // Restore Active Aptitude Session on Mount
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('vedika_aptitude_active_session_v2');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.status === 'active' && parsed.questions?.length > 0) {
            const idx = parsed.currentIndex || 0;
            setAptSession(parsed);
            setCurrentAptQuestion(parsed.questions[idx] || parsed.questions[0]);
            setSelectedAptOption(parsed.answers?.[idx] ?? null);
            setAptSessionRestoredAlert(true);
            setGameState('active');
            setSessionMode('aptitude');
          }
        }
      }
    } catch (e) {}
  }, []);

  const topicAliasMap = {
    "Reading Comprehension": ["Theme Detection", "Critical Reasoning", "Reading Comprehension"],
    "Vocabulary": ["Theme Detection", "Critical Reasoning", "Vocabulary"],
    "Synonyms and Antonyms": ["Theme Detection", "Critical Reasoning"],
    "Sentence Correction": ["Statement and Conclusion", "Critical Reasoning"],
    "Error Detection": ["Statement and Conclusion", "Critical Reasoning"],
    "Fill in the Blanks": ["Statement and Inferences", "Critical Reasoning"],
    "Para Jumbles": ["Logical Problems", "Critical Reasoning"],
    "Sentence Completion": ["Statement and Inferences", "Critical Reasoning"],
    "Grammar": ["Statement and Conclusion", "Critical Reasoning"],
    "Mirror Images": ["Mirror and Water Images"],
    "Paper Folding": ["Paper Folding and Cutting"],
    "Figure Series": ["Completion of Incomplete Pattern", "Figure Matrix"],
    "Pattern Completion": ["Completion of Incomplete Pattern"],
    "Embedded Figures": ["Embedded Figures"],
    "Image Rotation": ["Image Analysis"],
    "Analogies": ["Analogy (Verbal & Non-Verbal)"],
    "Odd One Out": ["Classification / Odd One Out"],
    "Ranking and Order": ["Order and Ranking"],
    "Direction Sense": ["Direction Sense Test"],
    "Statement and Assumption": ["Statement and Assumptions"],
    "Syllogisms": ["Syllogism"],
    "Series (Number/Letter)": ["Logical Series Completion"],
    "Cubes and Dice": ["Matrix Reasoning"],
    "Puzzles": ["Logical Problems"],
    "SQL": ["Data Interpretation (Tables)", "Coding-Decoding"],
    "Operating Systems": ["Logical Problems", "Coding-Decoding"],
    "DBMS": ["Data Interpretation (Tables)", "Coding-Decoding"],
    "Computer Networks": ["Logical Problems"],
    "OOPs": ["Logical Problems", "Coding-Decoding"],
    "Basic Programming (C, C++, Java, Python)": ["Coding-Decoding", "Logical Problems"],
    "Basic Mathematics": ["Number System", "Simplification and Approximation"]
  };

  const isTechnicalCategory = (cat, top) => {
    if (cat === 'CS & Technical Fundamentals' || cat === 'Custom Topic') return true;
    const techTopics = [
      'Computer Fundamentals', 'Pseudocode',
      'Basic Programming (C, C++, Java, Python)', 'SQL', 'Operating Systems',
      'DBMS', 'Computer Networks', 'Object-Oriented Programming (OOPs)'
    ];
    return techTopics.some(t => String(top || '').toLowerCase().includes(t.toLowerCase()));
  };

  const fetchSingleAptitudeQuestion = async (top, cat, diff, existingQuestions = []) => {
    try {
      const avoidList = existingQuestions.map(q => String(q.question || '').slice(0, 80));
      const res = await fetch('/api/generate-aptitude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: top,
          category: cat,
          difficulty: diff,
          avoidQuestions: avoidList
        })
      });
      const data = await res.json();
      if (data?.success && data?.question) {
        return data.question;
      }
    } catch (err) {
      console.warn('API question fetch error:', err);
    }
    return null;
  };

  const start20QuestionAptitudeSession = async (overrideTopic = null) => {
    const selectedTop = (overrideTopic || aptCustomTopic.trim() || aptTopic || 'General Aptitude').trim();
    const targetDiff = aptDifficulty;
    const cat = aptCategory;

    const isTech = isTechnicalCategory(cat, selectedTop);
    const staticList = aptitudeData?.questions || [];
    let cachedList = [];
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('vedika_custom_aptitude_pool');
        if (stored) cachedList = JSON.parse(stored);
      }
    } catch (e) {}

    const combinedPool = [...staticList, ...cachedList];
    const seenHashes = new Set(getSeenQuestionHashes());

    // Normalize category mapping (e.g. Verbal Ability -> Verbal Reasoning, Non-Verbal Reasoning -> Non-Verbal Reasoning)
    const normalizedCat = (cat === 'Verbal Ability' ? 'Verbal' : cat === 'Non-Verbal Reasoning' ? 'Non-Verbal' : cat).toLowerCase();
    const topicAliases = topicAliasMap[selectedTop] || [selectedTop];

    // Filter matching questions from local pool
    let matching = combinedPool.filter(q => {
      const hash = String(q.question || '').toLowerCase().trim().replace(/\s+/g, ' ');
      if (seenHashes.has(hash)) return false;
      const qTop = String(q.topic || '').toLowerCase();
      return topicAliases.some(alias => qTop.includes(alias.toLowerCase()));
    });

    if (matching.length < 20 && !isTech) {
      const categoryMatches = combinedPool.filter(q => {
        const hash = String(q.question || '').toLowerCase().trim().replace(/\s+/g, ' ');
        if (seenHashes.has(hash)) return false;
        if (matching.some(m => m.id === q.id)) return false;
        return String(q.category || '').toLowerCase().includes(normalizedCat);
      });
      matching = [...matching, ...categoryMatches];
    }

    if (matching.length < 20 && !isTech) {
      const fallbackMatches = combinedPool.filter(q => !matching.some(m => m.id === q.id));
      matching = [...matching, ...fallbackMatches];
    }

    let initialQuestions = [];
    if (matching.length > 0 && !isTech) {
      const shuffled = [...matching].sort(() => 0.5 - Math.random());
      initialQuestions = shuffled.slice(0, 20);
    }

    // If technical category with no local questions, fetch Question 1 from AI immediately
    if (initialQuestions.length === 0 && isTech) {
      const pendingSession = {
        status: 'active',
        questions: [],
        currentIndex: 0,
        answers: {},
        isFetchingMore: false,
        startTime: Date.now(),
        topic: selectedTop,
        category: cat,
        difficulty: targetDiff
      };
      setAptSession(pendingSession);
      setGameState('active');
      setSessionMode('aptitude');
      setGeneratingAiAptitude(true);

      const firstQ = await fetchSingleAptitudeQuestion(selectedTop, cat, targetDiff, []);
      setGeneratingAiAptitude(false);

      const finalQs = firstQ ? [firstQ] : [combinedPool[Math.floor(Math.random() * matching.length ? matching : combinedPool)]];
      const updatedSession = { ...pendingSession, questions: finalQs };
      setAptSession(updatedSession);
      setCurrentAptQuestion(finalQs[0]);
      setSelectedAptOption(null);
      setShowAptHint(false);
      setShowAptSolution(false);
      const initialTime = targetDiff === 'Easy' ? 120 : targetDiff === 'Medium' ? 180 : 240;
      setAptTimer(initialTime);
      markQuestionAsSeen(finalQs[0].question);
      saveAptSessionToStorage(updatedSession);
      return;
    }

    const newSession = {
      status: 'active',
      questions: initialQuestions,
      currentIndex: 0,
      answers: {},
      isFetchingMore: false,
      startTime: Date.now(),
      topic: selectedTop,
      category: cat,
      difficulty: targetDiff
    };

    setAptSession(newSession);
    setGameState('active');
    setSessionMode('aptitude');

    if (initialQuestions.length > 0) {
      setCurrentAptQuestion(initialQuestions[0]);
      setSelectedAptOption(null);
      setShowAptHint(false);
      setShowAptSolution(false);
      const initialTime = targetDiff === 'Easy' ? 120 : targetDiff === 'Medium' ? 180 : 240;
      setAptTimer(initialTime);
      markQuestionAsSeen(initialQuestions[0].question);
    }

    saveAptSessionToStorage(newSession);
  };

  const handleSelectAptOption = (optIndex) => {
    if (selectedAptOption !== null || showAptSolution) return;
    setSelectedAptOption(optIndex);

    const cIdx = aptSession.currentIndex;
    const isCorrect = currentAptQuestion ? optIndex === currentAptQuestion.correct_option : false;

    setAptScore(prev => ({
      correct: isCorrect ? prev.correct + 1 : prev.correct,
      total: prev.total + 1,
      streak: isCorrect ? prev.streak + 1 : 0
    }));

    setAptSession(prev => {
      const updatedAnswers = { ...prev.answers, [cIdx]: optIndex };
      const updated = { ...prev, answers: updatedAnswers };
      saveAptSessionToStorage(updated);
      return updated;
    });

    if (currentAptQuestion) {
      markQuestionAsSeen(currentAptQuestion.question);
    }
  };

  const handleNavigateAptSession = async (targetIndex) => {
    if (targetIndex < 0 || targetIndex >= 20 || generatingAiAptitude) return;

    // 1. Target question already exists in questions array
    if (targetIndex < aptSession.questions.length) {
      const nextQ = aptSession.questions[targetIndex];
      setCurrentAptQuestion(nextQ);
      setSelectedAptOption(aptSession.answers[targetIndex] ?? null);
      setShowAptHint(false);
      setShowAptSolution(false);
      const initialTime = aptDifficulty === 'Easy' ? 120 : aptDifficulty === 'Medium' ? 180 : 240;
      setAptTimer(initialTime);

      setAptSession(prev => {
        const updated = { ...prev, currentIndex: targetIndex };
        saveAptSessionToStorage(updated);
        return updated;
      });
      return;
    }

    // 2. Target question needs to be generated via Gemini API on-demand (when clicking Next)
    if (targetIndex === aptSession.questions.length && targetIndex < 20) {
      setGeneratingAiAptitude(true);
      try {
        const newQ = await fetchSingleAptitudeQuestion(
          aptSession.topic,
          aptSession.category,
          aptSession.difficulty,
          aptSession.questions
        );

        const staticList = aptitudeData?.questions || [];
        const fallbackQ = staticList.find(q => !aptSession.questions.some(existing => existing.id === q.id)) || staticList[0];
        const nextQ = newQ || fallbackQ;

        const updatedQuestions = [...aptSession.questions, nextQ];
        markQuestionAsSeen(nextQ.question);

        try {
          if (typeof window !== 'undefined' && newQ) {
            const cached = JSON.parse(localStorage.getItem('vedika_custom_aptitude_pool') || '[]');
            cached.push(newQ);
            localStorage.setItem('vedika_custom_aptitude_pool', JSON.stringify(cached));
          }
        } catch (e) {}

        const updatedSession = {
          ...aptSession,
          questions: updatedQuestions,
          currentIndex: targetIndex
        };

        setAptSession(updatedSession);
        setCurrentAptQuestion(nextQ);
        setSelectedAptOption(null);
        setShowAptHint(false);
        setShowAptSolution(false);
        const initialTime = aptDifficulty === 'Easy' ? 120 : aptDifficulty === 'Medium' ? 180 : 240;
        setAptTimer(initialTime);
        saveAptSessionToStorage(updatedSession);
      } catch (err) {
        console.warn('[On-demand generation error]:', err);
      } finally {
        setGeneratingAiAptitude(false);
      }
    }
  };

  const handleFinishAptSession = () => {
    setAptSession(prev => {
      const updated = { ...prev, status: 'scorecard', endTime: Date.now() };
      try {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('vedika_aptitude_active_session_v2');
        }
      } catch (e) {}
      return updated;
    });
  };

  const handleAptGiveUp = () => {
    setShowAptSolution(true);
  };

  // Aptitude Active Timer Effect
  useEffect(() => {
    let timerId = null;
    if (sessionMode === 'aptitude' && currentAptQuestion && !showAptSolution && aptTimer > 0 && aptSession.status === 'active') {
      timerId = setInterval(() => {
        setAptTimer(prev => {
          if (prev <= 1) {
            setShowAptSolution(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [sessionMode, currentAptQuestion, showAptSolution, aptTimer, aptSession.status]);

  // Teardown all live audio playback
  const stopAllLiveAudioPlaybacks = () => {
    liveAudioSourcesQueueRef.current.forEach((src) => {
      try { src.stop(); } catch (e) {}
    });
    liveAudioSourcesQueueRef.current = [];
    liveNextPlayTimeRef.current = 0;
  };

  // Play 24kHz PCM chunk received from Gemini Live (Smooth Continuous Queue)
  const playLivePcmAudioChunk = (base64Data) => {
    if (liveIsMutedRef.current || !liveAudioCtxRef.current) return;
    try {
      const audioCtx = liveAudioCtxRef.current;
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      const binaryString = atob(base64Data);
      const buffer = new ArrayBuffer(binaryString.length);
      const view = new Uint8Array(buffer);
      for (let i = 0; i < binaryString.length; i++) view[i] = binaryString.charCodeAt(i);
      const int16Samples = new Int16Array(buffer);
      const audioBuffer = audioCtx.createBuffer(1, int16Samples.length, 24000);
      const channelData = audioBuffer.getChannelData(0);
      for (let i = 0; i < int16Samples.length; i++) channelData[i] = int16Samples[i] / 32768.0;
      const bufferSource = audioCtx.createBufferSource();
      bufferSource.buffer = audioBuffer;
      bufferSource.connect(audioCtx.destination);
      liveAudioSourcesQueueRef.current.push(bufferSource);

      bufferSource.onended = () => {
        liveAudioSourcesQueueRef.current = liveAudioSourcesQueueRef.current.filter((src) => src !== bufferSource);
        if (liveAudioSourcesQueueRef.current.length === 0) {
          setLiveConnectionStatus('connected');
          setLiveStatusMessage('Examiner is listening... Feel free to speak.');
        }
      };

      const now = audioCtx.currentTime;
      if (liveNextPlayTimeRef.current < now) {
        liveNextPlayTimeRef.current = now + 0.05;
      }
      setLiveConnectionStatus('tutor-speaking');
      setLiveStatusMessage('Examiner is speaking...');
      bufferSource.start(liveNextPlayTimeRef.current);
      liveNextPlayTimeRef.current += audioBuffer.duration;
    } catch (err) {
      console.error('[Gemini Live Playback error]:', err);
    }
  };

  // Disconnect Gemini Live WebSocket & Release Audio (Identical to VoiceAgentView)
  const disconnectGeminiLive = (preserveMessage = false) => {
    if (liveWsRef.current) {
      try { liveWsRef.current.close(); } catch (e) {}
      liveWsRef.current = null;
    }
    stopAllLiveAudioPlaybacks();
    if (liveAudioCtxRef.current) {
      try { liveAudioCtxRef.current.close(); } catch (e) {}
      liveAudioCtxRef.current = null;
    }
    if (liveProcessorRef.current) {
      try { liveProcessorRef.current.disconnect(); } catch (e) {}
      liveProcessorRef.current = null;
    }
    if (liveSourceRef.current) {
      try { liveSourceRef.current.disconnect(); } catch (e) {}
      liveSourceRef.current = null;
    }
    if (liveMicStreamRef.current) {
      liveMicStreamRef.current.getTracks().forEach((t) => t.stop());
      liveMicStreamRef.current = null;
    }
    setLiveConnectionStatus('disconnected');
    if (!preserveMessage) {
      setLiveStatusMessage('Oral examination ended. Press start to begin again.');
    }
  };

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

  // Teardown speech recognition and live voice
  const cleanupRecognition = () => {
    isRecordingRef.current = false;
    disconnectGeminiLive();
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try { mediaRecorderRef.current.stop(); } catch (e) {}
      mediaRecorderRef.current = null;
    }
    setIsRecording(false);
  };

  // Global 15-Minute Session Countdown Timer (900s)
  useEffect(() => {
    if (gameState === 'active') {
      globalTimerRef.current = setInterval(() => {
        setSessionTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(globalTimerRef.current);
            // 15:00 Hard Cutoff
            if (executionMode === 'live') {
              handleFinishLiveExam();
            } else {
              handleFinalizeSession(history);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (globalTimerRef.current) clearInterval(globalTimerRef.current);
    }
    return () => {
      if (globalTimerRef.current) clearInterval(globalTimerRef.current);
    };
  }, [gameState, executionMode, history]);

  // Turn-Guided Mode 90s Per-Turn Countdown Timer
  useEffect(() => {
    if (gameState === 'active' && executionMode === 'turn') {
      setTurnTimeRemaining(90);
      turnTimerRef.current = setInterval(() => {
        setTurnTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(turnTimerRef.current);
            // 90s Turn Timeout -> Auto Skip
            handleSkipQuestion();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (turnTimerRef.current) clearInterval(turnTimerRef.current);
    }
    return () => {
      if (turnTimerRef.current) clearInterval(turnTimerRef.current);
    };
  }, [gameState, executionMode, currentQIndex, currentQuestion]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupRecognition();
      if (globalTimerRef.current) clearInterval(globalTimerRef.current);
      if (turnTimerRef.current) clearInterval(turnTimerRef.current);
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
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

  // Re-speak or Rephrase Current Question without Penalty or Advancing Turn
  const handleRepeatQuestion = () => {
    if (!currentQuestion) return;
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    speakText(currentQuestion);
    setStatusMessage('Examiner is repeating the question...');
    setTimeout(() => setStatusMessage(''), 3000);
  };

  // Start Web Speech API Recognition with incremental turn accumulation
  const startSpeechRecognition = (initialBaseText = '') => {
    if (typeof window === 'undefined') return;

    // Teardown any existing instance first
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }

    baseTextRef.current = initialBaseText;
    sessionFinalRef.current = '';

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          setIsRecording(true);
          isRecordingRef.current = true;
        };

        recognition.onresult = (event) => {
          let interim = '';
          let newlyFinalized = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const res = event.results[i];
            const transcript = res[0]?.transcript || '';
            if (res.isFinal) {
              newlyFinalized += transcript + ' ';
            } else {
              interim += transcript;
            }
          }

          // Intercept repeat voice commands so they don't get written into candidate's answer
          const latestSpoken = (newlyFinalized || interim).toLowerCase().trim();
          if (
            latestSpoken === 'repeat' ||
            latestSpoken === 'repeat it' ||
            latestSpoken === 'repeat question' ||
            latestSpoken === 'repeat the question' ||
            latestSpoken === 'can you repeat' ||
            latestSpoken === 'can you repeat the question' ||
            latestSpoken === 'could you repeat' ||
            latestSpoken === 'say again' ||
            latestSpoken === 'say that again' ||
            latestSpoken === 'pardon'
          ) {
            handleRepeatQuestion();
            return;
          }

          // Intercept skip voice commands
          if (
            latestSpoken === 'skip' ||
            latestSpoken === 'skip it' ||
            latestSpoken === 'skip question' ||
            latestSpoken === 'skip the question' ||
            latestSpoken === 'pass' ||
            latestSpoken === 'i don\'t know' ||
            latestSpoken === 'dont know'
          ) {
            handleSkipQuestion();
            return;
          }

          if (newlyFinalized) {
            sessionFinalRef.current = (sessionFinalRef.current + ' ' + newlyFinalized).replace(/\s+/g, ' ').trim();
          }

          const curFinal = sessionFinalRef.current;
          const curInterim = interim.trim();

          let speech = curFinal;
          if (curInterim) {
            speech = speech ? `${speech} ${curInterim}` : curInterim;
          }

          const base = (baseTextRef.current || '').trim();
          let combined = base;
          if (speech) {
            combined = base ? `${base} ${speech}` : speech;
          }

          setUserAnswer(combined);
        };

        recognition.onerror = (event) => {
          if (event.error === 'no-speech' || event.error === 'aborted') {
            return;
          }
          console.warn('[SpeechRecognition] error:', event.error);
          if (event.error === 'not-allowed') {
            setIsRecording(false);
            isRecordingRef.current = false;
          }
        };

        recognition.onend = () => {
          // If the user hasn't explicitly stopped, restart seamlessly on silence timeout
          if (isRecordingRef.current) {
            baseTextRef.current = userAnswerRef.current;
            sessionFinalRef.current = '';

            try {
              recognition.start();
            } catch (err) {
              setTimeout(() => {
                if (isRecordingRef.current) {
                  startSpeechRecognition(userAnswerRef.current);
                }
              }, 250);
            }
          } else {
            setIsRecording(false);
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
        setIsRecording(true);
        isRecordingRef.current = true;
      } catch (e) {
        console.warn('[SpeechRecognition] startup failed, falling back:', e);
        startMediaRecorderFallback();
      }
    } else {
      startMediaRecorderFallback();
    }
  };

  // Fallback MediaRecorder for unsupported browsers
  const startMediaRecorderFallback = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Speech recognition is not supported in this browser. Please type your answer or use Google Chrome / Microsoft Edge.");
      setIsRecording(false);
      isRecordingRef.current = false;
      return;
    }

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
            if (data.text) {
              const base = baseTextRef.current ? baseTextRef.current.trim() : '';
              const newText = base ? `${base} ${data.text.trim()}` : data.text.trim();
              setUserAnswer(newText);
              baseTextRef.current = newText;
            }
          } catch (err) {
            console.error('[Audio Transcribe Error]:', err);
          }
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      isRecordingRef.current = true;
    } catch (err) {
      console.warn('[MediaRecorder Error]:', err);
      setIsRecording(false);
      isRecordingRef.current = false;
    }
  };

  // Toggle Microphone (Start / Stop Recording)
  const toggleRecording = () => {
    if (isRecording || isRecordingRef.current) {
      cleanupRecognition();
    } else {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
      }
      startSpeechRecognition(userAnswer);
    }
  };

  // Handle manual textarea edits & sync with recognition accumulator
  const handleUserAnswerChange = (e) => {
    const newVal = e.target.value;
    setUserAnswer(newVal);
    baseTextRef.current = newVal;
    sessionFinalRef.current = '';

    // If user cleared the text completely while recording, restart recognition so browser buffer resets
    if (newVal.trim() === '' && isRecordingRef.current) {
      startSpeechRecognition('');
    }
  };

  // Handle clear answer button click
  const handleClearAnswer = () => {
    setUserAnswer('');
    baseTextRef.current = '';
    sessionFinalRef.current = '';
    if (isRecordingRef.current) {
      startSpeechRecognition('');
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

  // Start Gemini Live Bidirectional WebSocket Voice Examination (with Dual-Port Fallback & Auto-Reconnect History Replay)
  const startGeminiLiveSession = async (activeTopic, activeSubject, activeDifficulty, activeLevel, isReconnect = false, forcePort = null) => {
    try {
      setLiveConnectionStatus('connecting');
      setLiveStatusMessage(isReconnect ? 'Re-establishing live session with history replay...' : 'Initializing audio environment and connecting...');
      
      if (!isReconnect) {
        stopAllLiveAudioPlaybacks();
        setLiveConversation([]);
        reconnectAttemptsRef.current = 0;
      }
      setGameState('active');

      const stream = liveMicStreamRef.current || await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      liveMicStreamRef.current = stream;
      
      const audioCtx = liveAudioCtxRef.current || new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      liveAudioCtxRef.current = audioCtx;
      if (audioCtx.state === 'suspended') {
        try { await audioCtx.resume(); } catch (e) {}
      }

      // Dual-Port Strategy: Try port 5001 first, fallback to current window host (port 3000) if port 5001 is offline
      const primaryWsHost = process.env.NEXT_PUBLIC_WS_URL || (
        window.location.hostname === 'localhost'
          ? 'ws://localhost:5001'
          : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`
      );

      const fallbackWsHost = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`;
      const targetWsHost = forcePort || primaryWsHost;

      const voiceSid = 'viva-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      let wsUrl = `${targetWsHost}/api/ws?mode=${sessionMode}&topic=${encodeURIComponent(activeTopic)}&difficulty=${activeDifficulty}&level=${activeLevel}&programmingLanguage=${encodeURIComponent(programmingLanguage)}&sessionId=${voiceSid}`;
      if (isReconnect) wsUrl += `&reconnect=true`;

      const ws = new WebSocket(wsUrl);
      liveWsRef.current = ws;

      const connTimeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          liveWsHadErrorRef.current = true;
          ws.close();
          if (!forcePort && targetWsHost !== fallbackWsHost) {
            console.warn('[WS] Primary port 5001 timed out. Falling back to port 3000...');
            startGeminiLiveSession(activeTopic, activeSubject, activeDifficulty, activeLevel, isReconnect, fallbackWsHost);
            return;
          }
          setLiveConnectionStatus('error');
          setLiveStatusMessage('Connection timed out. Verify the voice server or web application server is running.');
        }
      }, 5000);

      ws.onopen = () => {
        clearTimeout(connTimeout);
        liveWsHadErrorRef.current = false;
        setLiveConnectionStatus('connected');
        setLiveStatusMessage(isReconnect ? 'Reconnected! Examiner is resuming examination...' : 'AI Examiner connected! Oral examination starting...');
        
        // Transmit history replay via WebSocket message (prevents URL length caps and log exposure)
        if (isReconnect && liveConversation.length > 0) {
          try {
            ws.send(JSON.stringify({
              type: 'reconnect-history',
              history: liveConversation.slice(-10)
            }));
          } catch (e) {
            console.warn('[WS] History replay send warning:', e);
          }
        }

        if (!liveSourceRef.current) {
          const source = audioCtx.createMediaStreamSource(stream);
          liveSourceRef.current = source;
          const processor = audioCtx.createScriptProcessor(4096, 1, 1);
          liveProcessorRef.current = processor;
          
          const silentGain = audioCtx.createGain();
          silentGain.gain.value = 0;
          source.connect(processor);
          processor.connect(silentGain);
          silentGain.connect(audioCtx.destination);

          processor.onaudioprocess = (e) => {
            if (
              ws.readyState !== WebSocket.OPEN || 
              liveIsMutedRef.current || 
              liveAudioSourcesQueueRef.current.length > 0
            ) return;

            const float32Data = e.inputBuffer.getChannelData(0);
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
        }
      };

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'status') {
          setLiveStatusMessage(message.message);
        } else if (message.type === 'error') {
          setLiveStatusMessage(message.message);
          setLiveConnectionStatus('error');
        } else if (message.type === 'audio') {
          playLivePcmAudioChunk(message.data);
        } else if (message.type === 'interrupted') {
          stopAllLiveAudioPlaybacks();
          setLiveConnectionStatus('connected');
          setLiveStatusMessage('Examiner was interrupted. Listening now...');
          isNewExaminerTurnRef.current = true;
        } else if (message.type === 'flow-update') {
          setCurrentStageInfo({
            topicName: message.topicName || activeTopic,
            questionType: message.questionType || 'main',
            topicIndex: message.topicIndex || 1,
            followUpIndex: message.followUpIndex || 0
          });
          isNewExaminerTurnRef.current = true;
        } else if (message.type === 'agent-transcription') {
          const textChunk = message.text || '';
          
          if (/next\s+key\s+topic|move\s+to\s+our\s+next\s+topic/i.test(textChunk)) {
            setCurrentStageInfo((prev) => ({
              ...prev,
              topicIndex: prev.topicIndex + 1,
              questionType: 'main',
              followUpIndex: 0
            }));
          }

          if (/(write\s+(a\s+)?(program|code|function|query|script|algorithm)|in\s+the\s+scratchpad|open\s+the\s+scratchpad)/i.test(textChunk)) {
            setIsScratchpadOpen(true);
          }

          const isConclusion = /concludes\s+your\s+oral\s+examination|scorecard\s+report\s+is\s+ready/i.test(textChunk);
          if (isConclusion) {
            setTimeout(() => {
              handleFinishLiveExam();
            }, 3500);
          }

          setLiveConversation((prev) => {
            if (!isNewExaminerTurnRef.current && prev.length > 0 && prev[prev.length - 1].sender === 'examiner') {
              const updated = [...prev];
              updated[updated.length - 1] = { ...updated[updated.length - 1], text: updated[updated.length - 1].text + ' ' + textChunk };
              return updated;
            }
            isNewExaminerTurnRef.current = false;
            return [...prev, { id: Math.random().toString(36).slice(2), sender: 'examiner', text: textChunk, timestamp: new Date() }];
          });
        } else if (message.type === 'user-transcription') {
          isNewExaminerTurnRef.current = true;
          setLiveConversation((prev) => [...prev, { id: Math.random().toString(36).slice(2), sender: 'candidate', text: message.text, timestamp: new Date() }]);
        }
      };

      ws.onclose = () => {
        clearTimeout(connTimeout);
        // Auto-reconnect if session dropped unexpectedly during an active exam
        if (!liveWsHadErrorRef.current && liveConversation.length > 0 && reconnectAttemptsRef.current < 2 && gameState === 'active') {
          reconnectAttemptsRef.current += 1;
          console.warn(`[WS] Mid-session WebSocket drop. Auto-reconnecting (attempt ${reconnectAttemptsRef.current}/2)...`);
          setLiveStatusMessage(`Reconnecting to AI Examiner (Attempt ${reconnectAttemptsRef.current}/2)...`);
          setTimeout(() => {
            startGeminiLiveSession(activeTopic, activeSubject, activeDifficulty, activeLevel, true, forcePort);
          }, 1500);
        } else if (!liveWsHadErrorRef.current) {
          disconnectGeminiLive(false);
        }
      };

      ws.onerror = () => {
        clearTimeout(connTimeout);
        liveWsHadErrorRef.current = true;
        // Dual-port fallback on error if we haven't tried port 3000 yet
        if (!forcePort && targetWsHost !== fallbackWsHost) {
          console.warn('[WS] Primary port 5001 error. Falling back to port 3000...');
          startGeminiLiveSession(activeTopic, activeSubject, activeDifficulty, activeLevel, isReconnect, fallbackWsHost);
          return;
        }
        setLiveConnectionStatus('error');
        setLiveStatusMessage('Connection failed. Verify the voice server or web application server is running.');
      };
    } catch (err) {
      setLiveConnectionStatus('error');
      setLiveStatusMessage(`Unable to access mic: ${err.message || err}. Please permit microphone access.`);
    }
  };

  // Attach Scratchpad Notes/Code to candidate's answer
  const handleAttachScratchpadToAnswer = () => {
    if (scratchpadText.trim()) {
      const codeBlock = `\n[Candidate Written Code/Notes]:\n${scratchpadText.trim()}`;
      setLiveConversation((prev) => {
        if (prev.length > 0 && prev[prev.length - 1].sender === 'candidate') {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            text: updated[updated.length - 1].text + codeBlock
          };
          return updated;
        }
        return [
          ...prev,
          {
            id: Math.random().toString(36).slice(2),
            sender: 'candidate',
            text: codeBlock.trim(),
            timestamp: new Date()
          }
        ];
      });
      setScratchpadText('');
    }
    setIsScratchpadOpen(false);
  };

  // Complete Live Exam and generate Scorecard from conversation
  const handleFinishLiveExam = async () => {
    disconnectGeminiLive(true);

    const isRepeatClarification = (txt) => {
      const t = (txt || '').toLowerCase().trim();
      return (
        t === 'repeat' ||
        t === 'repeat it' ||
        t === 'repeat please' ||
        t === 'repeat the question' ||
        t === 'can you repeat' ||
        t === 'can you repeat the question' ||
        t === 'could you repeat that' ||
        t === 'say again' ||
        t === 'say that again' ||
        t === 'pardon' ||
        t === 'i didn\'t understand' ||
        t === 'i dont understand'
      );
    };

    // Consolidate consecutive messages from the same sender
    const consolidated = [];
    liveConversation.forEach((msg) => {
      const txt = (msg.text || '').trim();
      if (!txt) return;
      if (consolidated.length > 0 && consolidated[consolidated.length - 1].sender === msg.sender) {
        consolidated[consolidated.length - 1].text += ' ' + txt;
      } else {
        consolidated.push({ sender: msg.sender, text: txt });
      }
    });

    const parsedTurns = [];
    let currentQuestion = '';
    let currentAnswer = '';

    consolidated.forEach((item) => {
      const txt = item.text.trim();
      if (!txt) return;

      if (item.sender === 'examiner') {
        const isConclusion = /conclude|scorecard|official evaluation report|thank you for your responses/i.test(txt);
        if (!isConclusion) {
          if (currentQuestion && currentAnswer.trim()) {
            parsedTurns.push({
              question: currentQuestion.trim(),
              answer: currentAnswer.trim(),
              durationSec: 45
            });
            currentQuestion = txt;
            currentAnswer = '';
          } else if (!currentQuestion) {
            currentQuestion = txt;
          } else {
            currentQuestion += ' ' + txt;
          }
        }
      } else if (item.sender === 'candidate') {
        if (!isRepeatClarification(txt)) {
          currentAnswer = (currentAnswer ? currentAnswer + ' ' : '') + txt;
        }
      }
    });

    if (currentQuestion) {
      parsedTurns.push({
        question: currentQuestion.trim(),
        answer: currentAnswer.trim() || 'Candidate participated orally during live session.',
        durationSec: 45
      });
    }

    // Group parsed turns into TopicUnits (Main question + follow-ups)
    const topicUnits = [];
    let currentUnit = null;

    parsedTurns.forEach((turn, idx) => {
      const isFollowUp = /follow-up|probe|clarify|furthermore|specifically|elaborate/i.test(turn.question);
      if (!currentUnit || (!isFollowUp && currentUnit.turns.length > 0)) {
        if (currentUnit) topicUnits.push(currentUnit);
        currentUnit = {
          topicIndex: topicUnits.length + 1,
          topicName: `${sessionMode === 'viva' ? (vivaSource === 'custom' ? customVivaTopic : selectedExperiment) : (topic || programmingLanguage)} - Topic ${topicUnits.length + 1}`,
          turns: []
        };
      }
      currentUnit.turns.push({
        questionType: isFollowUp ? 'follow_up' : 'main',
        question: turn.question,
        answer: turn.answer,
        durationSec: turn.durationSec
      });
    });

    if (currentUnit && currentUnit.turns.length > 0) {
      topicUnits.push(currentUnit);
    }

    await handleFinalizeSession(parsedTurns, topicUnits);
  };

  // Start Fresh Session (Live Voice or Turn Guided)
  const handleStartSession = async () => {
    let resolvedTopic = '';

    if (sessionMode === 'viva') {
      if (vivaSource === 'preset') {
        if (!selectedExperiment) {
          alert("Please select a lab experiment from the presets before starting.");
          return;
        }
        resolvedTopic = selectedExperiment;
      } else {
        if (!customVivaTopic.trim()) {
          alert("Please enter your custom viva topic/subject before starting.");
          return;
        }
        resolvedTopic = customVivaTopic.trim();
      }
    } else {
      resolvedTopic = topic.trim() || programmingLanguage;
      if (!resolvedTopic) {
        alert("Please select or enter your target tech stack or interview topic before starting.");
        return;
      }
    }

    const activeTopic = resolvedTopic;
    const activeSubject = resolvedTopic;
    setActiveSessionTopic(activeTopic);

    cleanupRecognition();
    setHistory([]);
    setCurrentQIndex(0);
    setUserAnswer('');
    baseTextRef.current = '';
    sessionFinalRef.current = '';
    setScorecard(null);
    setSavedSessionFound(null);

    setLoading(true);
    setStatusMessage(`Examiner is evaluating topic and preparing your session...`);

    const recentQ1s = (() => {
      try {
        const raw = localStorage.getItem('VEDIKA_RECENT_Q1_CACHE');
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed[activeTopic]) ? parsed[activeTopic] : [];
      } catch { return []; }
    })();

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
          questionIndex: 0,
          recentQ1s
        })
      });

      const data = await response.json();

      // Check Joint Topic Validation Result
      if (response.ok && data.isValidTopic === false) {
        setTopicRejectionCount((prev) => prev + 1);
        setTopicValidationAlert(
          data.rejectionReason || `"${activeTopic}" does not appear to be a valid academic subject or technical topic. Please specify a valid topic.`
        );
        setLoading(false);
        setStatusMessage('');
        return;
      }

      // Topic is Valid (or Fail-Open fallback)
      setTopicValidationAlert('');
      setTopicRejectionCount(0);
      setSessionTimeRemaining(900);
      setTurnTimeRemaining(90);
      setCurrentStageInfo({
        topicName: activeTopic,
        questionType: 'main',
        topicIndex: 1,
        followUpIndex: 0
      });

      if (response.ok && data.question) {
        // Save opening question into anti-repetition cache
        try {
          const raw = localStorage.getItem('VEDIKA_RECENT_Q1_CACHE');
          const parsed = raw ? JSON.parse(raw) : {};
          const existing = Array.isArray(parsed[activeTopic]) ? parsed[activeTopic] : [];
          parsed[activeTopic] = [data.question, ...existing.filter(q => q !== data.question)].slice(0, 5);
          localStorage.setItem('VEDIKA_RECENT_Q1_CACHE', JSON.stringify(parsed));
        } catch {}

        setCurrentAcknowledgment(data.acknowledgment || 'Welcome to your examination. Let us begin.');
        setCurrentQuestion(data.question);
        setTurnStartTime(Date.now());

        localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify({
          sessionMode,
          subject: activeSubject,
          level,
          difficulty,
          topic: activeTopic,
          activeSessionTopic: activeTopic,
          selectedExperiment: activeTopic,
          programmingLanguage,
          jdText,
          resumeBlueprint,
          history: [],
          currentQIndex: 0,
          currentQuestion: data.question,
          currentAcknowledgment: data.acknowledgment
        }));

        if (executionMode === 'live') {
          await startGeminiLiveSession(activeTopic, activeSubject, difficulty, level);
        } else {
          speakText(`${data.acknowledgment || ''} ${data.question}`);
          setGameState('active');
        }
      } else {
        alert(data.error || "Failed to initialize interview.");
      }
    } catch (e) {
      console.error(e);
      if (executionMode === 'live') {
        await startGeminiLiveSession(activeTopic, activeSubject, difficulty, level);
      } else {
        alert("API request error.");
      }
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

    cleanupRecognition();

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
    baseTextRef.current = '';
    sessionFinalRef.current = '';

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
      const activeTopic = activeSessionTopic || (sessionMode === 'viva' 
        ? (vivaSource === 'preset' ? selectedExperiment : customVivaTopic.trim()) 
        : (topic.trim() || programmingLanguage));

      const activeSubject = activeTopic;

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
          activeSessionTopic: activeTopic,
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

  // Skip Question (candidate passes or doesn't know answer)
  const handleSkipQuestion = async () => {
    cleanupRecognition();
    const durationSec = Math.max(1, Math.round((Date.now() - turnStartTime) / 1000));
    const newHistory = [
      ...history,
      {
        question: currentQuestion,
        answer: 'Candidate skipped the question and provided no answer.',
        durationSec
      }
    ];

    setHistory(newHistory);
    setUserAnswer('');
    baseTextRef.current = '';
    sessionFinalRef.current = '';

    if (currentQIndex >= 4) {
      await handleFinalizeSession(newHistory);
      return;
    }

    const nextIdx = currentQIndex + 1;
    setCurrentQIndex(nextIdx);
    setLoading(true);
    setStatusMessage('Examiner is proceeding to the next question...');

    try {
      const token = await getJwtToken();
      const activeTopic = activeSessionTopic || (sessionMode === 'viva' 
        ? (vivaSource === 'preset' ? selectedExperiment : customVivaTopic.trim()) 
        : (topic.trim() || programmingLanguage));

      const activeSubject = activeTopic;

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
          activeSessionTopic: activeTopic,
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

  // Finalize Session & Generate Holistic Scorecard with Fast Responsive Loading
  const handleFinalizeSession = async (finalHistory, topicUnits = []) => {
    // Transition to dedicated analyzing loading screen
    setGameState('analyzing');
    setAnalysisStep(0);

    const stepInterval = setInterval(() => {
      setAnalysisStep(prev => {
        if (prev < 3) return prev + 1;
        return prev;
      });
    }, 350);

    try {
      const token = await getJwtToken();
      const activeTopic = activeSessionTopic || (sessionMode === 'viva' 
        ? (vivaSource === 'preset' ? selectedExperiment : customVivaTopic.trim()) 
        : (topic.trim() || programmingLanguage));

      const activeSubject = activeTopic;

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
          history: finalHistory,
          topicUnits
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
        }, 200);
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
    cleanupRecognition();
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
    setUserAnswer('');
    baseTextRef.current = '';
    sessionFinalRef.current = '';
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
      padding: isMobile ? '12px 10px 32px 10px' : '16px 20px 40px 20px',
      boxSizing: 'border-box'
    }}>
      <div style={{
        maxWidth: 960,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 16
      }}>
        
        {/* HEADER BAR */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: `1px solid var(--border)`,
          paddingBottom: 10,
          gap: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button 
              type="button"
              onClick={handleGoBack} 
              style={{
                padding: '8px 10px',
                borderRadius: 12,
                background: 'var(--s2)',
                border: `1px solid var(--border)`,
                color: 'var(--muted)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              title="Go back to previous page"
            >
              <ArrowLeft size={18} />
            </button>
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

          {/* ACTIVE SESSION TIMER & STAGE BADGE */}
          {gameState === 'active' && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flexWrap: 'wrap'
            }}>
              {/* Dynamic Topic Stage Badge */}
              <div style={{
                padding: '6px 14px',
                borderRadius: 12,
                background: 'rgba(139, 92, 246, 0.12)',
                border: '1px solid var(--purple)',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: 'var(--purple)',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}>
                <Sparkles size={14} />
                <span>Topic {currentStageInfo.topicIndex}: {currentStageInfo.topicName}</span>
                {currentStageInfo.questionType === 'follow_up' && (
                  <span style={{ fontSize: '0.7rem', opacity: 0.85 }}> (Probe {currentStageInfo.followUpIndex})</span>
                )}
              </div>

              {/* 15-Minute Session Timer Badge */}
              <div style={{
                padding: '6px 14px',
                borderRadius: 12,
                background: sessionTimeRemaining < 180 ? 'rgba(239, 68, 68, 0.15)' : 'var(--s2)',
                border: `1px solid ${sessionTimeRemaining < 180 ? '#EF4444' : 'var(--border)'}`,
                fontSize: '0.85rem',
                fontWeight: 800,
                color: sessionTimeRemaining < 180 ? '#EF4444' : 'var(--text)',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}>
                <Activity size={16} style={{ color: sessionTimeRemaining < 180 ? '#EF4444' : 'var(--purple)' }} />
                <span>{Math.floor(sessionTimeRemaining / 60)}:{(sessionTimeRemaining % 60).toString().padStart(2, '0')}</span>
              </div>
            </div>
          )}

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
              <button
                onClick={() => setSessionMode('aptitude')}
                style={{
                  display: 'none',
                  padding: '6px 14px',
                  borderRadius: 8,
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  background: sessionMode === 'aptitude' ? 'var(--amber)' : 'transparent',
                  color: sessionMode === 'aptitude' ? '#FFFFFF' : 'var(--muted)',
                  boxShadow: sessionMode === 'aptitude' ? '0 2px 8px rgba(245, 158, 11, 0.3)' : 'none'
                }}
              >
                Aptitude Practice
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
            borderRadius: 20,
            padding: isMobile ? '14px 12px' : '20px 22px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }}>
            <div style={{ borderBottom: `1px solid var(--border)`, paddingBottom: 10 }}>
              <h2 style={{
                margin: 0,
                fontSize: '1.15rem',
                fontWeight: 800,
                color: 'var(--text)',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                {sessionMode === 'viva' ? (
                  <><FlaskConical size={20} style={{ color: 'var(--purple)' }} /> Academic Lab Viva Setup</>
                ) : sessionMode === 'interview' ? (
                  <><Code size={20} style={{ color: 'var(--accent)' }} /> Technical Job Interview Setup</>
                ) : (
                  <><Target size={20} style={{ color: 'var(--amber)' }} /> Quantitative & Math Aptitude Challenge</>
                )}
              </h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: 'var(--muted)', lineHeight: 1.4 }}>
                {sessionMode === 'viva' 
                  ? 'Enter any custom topic for your viva examination. Select your desired difficulty level before starting.' 
                  : sessionMode === 'interview'
                  ? 'Enter your target tech stack or upload your resume/JD. Select difficulty to calibrate examiner depth.'
                  : 'Practice quantitative aptitude, algebra, probability, and geometry questions with live timers, hints, and step-by-step KaTeX math solutions.'}
              </p>
            </div>

            {sessionMode === 'aptitude' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {/* CATEGORY TABS */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>
                    1. Select Domain Category
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {Object.keys(APTITUDE_CATEGORIES).concat(["Custom Topic"]).map(catName => (
                      <button
                        key={catName}
                        type="button"
                        onClick={() => {
                          setAptCategory(catName);
                          if (catName !== "Custom Topic" && APTITUDE_CATEGORIES[catName]?.length > 0) {
                            setAptTopic(APTITUDE_CATEGORIES[catName][0]);
                          }
                        }}
                        style={{
                          padding: '8px 14px',
                          borderRadius: 10,
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          border: `1px solid ${aptCategory === catName ? 'var(--amber)' : 'var(--border)'}`,
                          background: aptCategory === catName ? 'rgba(245, 158, 11, 0.15)' : 'var(--s2)',
                          color: aptCategory === catName ? 'var(--amber)' : 'var(--text)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {catName}
                      </button>
                    ))}
                  </div>
                </div>

                {/* TOPIC SELECTOR OR CUSTOM TOPIC INPUT */}
                {aptCategory === "Custom Topic" ? (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>
                      2. Type Custom Topic Name
                    </label>
                    <input
                      type="text"
                      value={aptCustomTopic}
                      onChange={(e) => setAptCustomTopic(e.target.value)}
                      placeholder="e.g., Circular Seating Arrangement, SQL Window Functions, Python Puzzles..."
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: 12,
                        background: 'var(--s2)',
                        border: '1px solid var(--border)',
                        color: 'var(--text)',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        outline: 'none'
                      }}
                    />
                  </div>
                ) : (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>
                      2. Select Topic for {aptCategory}
                    </label>
                    <div style={{ position: 'relative', width: '100%' }}>
                      <button
                        type="button"
                        onClick={() => setAptTopicDropdownOpen(!aptTopicDropdownOpen)}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          borderRadius: 12,
                          background: 'var(--s2)',
                          border: `2px solid ${aptTopicDropdownOpen ? 'var(--purple)' : 'var(--border)'}`,
                          color: 'var(--text)',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          boxShadow: aptTopicDropdownOpen ? '0 4px 16px rgba(139, 92, 246, 0.15)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
                          <BookOpen size={18} style={{ color: 'var(--purple)', flexShrink: 0 }} />
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {aptTopic || 'Select Topic'}
                          </span>
                        </div>
                        <ChevronDown
                          size={18}
                          style={{
                            color: 'var(--muted)',
                            transform: aptTopicDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s ease',
                            flexShrink: 0
                          }}
                        />
                      </button>

                      {aptTopicDropdownOpen && (
                        <>
                          <div
                            onClick={() => setAptTopicDropdownOpen(false)}
                            style={{ position: 'fixed', inset: 0, zIndex: 90 }}
                          />
                          <div
                            style={{
                              position: 'absolute',
                              top: 'calc(100% + 6px)',
                              left: 0,
                              right: 0,
                              background: 'var(--s1)',
                              border: '1px solid var(--purple)',
                              borderRadius: 14,
                              padding: 6,
                              boxShadow: '0 12px 36px rgba(0, 0, 0, 0.15)',
                              zIndex: 100,
                              maxHeight: 260,
                              overflowY: 'auto',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 2
                            }}
                          >
                            {APTITUDE_CATEGORIES[aptCategory]?.map(top => {
                              const isSelected = aptTopic === top;
                              return (
                                <button
                                  key={top}
                                  type="button"
                                  onClick={() => {
                                    setAptTopic(top);
                                    setAptTopicDropdownOpen(false);
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '10px 14px',
                                    borderRadius: 10,
                                    background: isSelected ? 'rgba(139, 92, 246, 0.12)' : 'transparent',
                                    border: 'none',
                                    color: isSelected ? 'var(--purple)' : 'var(--text)',
                                    fontSize: '0.85rem',
                                    fontWeight: isSelected ? 800 : 600,
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    transition: 'all 0.15s ease'
                                  }}
                                >
                                  <span>{top}</span>
                                  {isSelected && <Check size={16} style={{ color: 'var(--purple)' }} />}
                                </button>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* PRIORITY PLACEMENT TOPICS (1-CLICK BADGES) */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>
                    ⚡ Most Important Topics (Quick 1-Tap)
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 100, overflowY: 'auto' }}>
                    {PRIORITY_TOPICS.map(pTop => (
                      <button
                        key={pTop}
                        type="button"
                        onClick={() => {
                          setAptCustomTopic(pTop);
                          setAptCategory("Custom Topic");
                        }}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 8,
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          border: '1px solid rgba(139, 92, 246, 0.3)',
                          background: 'rgba(139, 92, 246, 0.08)',
                          color: 'var(--purple)',
                          cursor: 'pointer'
                        }}
                      >
                        🔥 {pTop}
                      </button>
                    ))}
                  </div>
                </div>

                {/* APTITUDE DIFFICULTY & ADAPTIVE MODE SELECTOR */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>
                      3. Difficulty Level
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                      {[
                        { id: 'Easy', label: 'Easy', desc: 'Basic level', color: '#10B981' },
                        { id: 'Medium', label: 'Medium', desc: 'Standard', color: 'var(--purple)' },
                        { id: 'Difficult', label: 'Difficult', desc: 'Advanced', color: 'var(--amber)' }
                      ].map(item => (
                        <div
                          key={item.id}
                          onClick={() => setAptDifficulty(item.id)}
                          style={{
                            padding: '8px',
                            minHeight: 52,
                            borderRadius: 10,
                            border: `2px solid ${aptDifficulty === item.id ? item.color : 'var(--border)'}`,
                            background: aptDifficulty === item.id ? `${item.color}15` : 'var(--s2)',
                            cursor: 'pointer',
                            textAlign: 'center',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ fontSize: '0.8rem', fontWeight: 800, color: aptDifficulty === item.id ? item.color : 'var(--text)' }}>
                            {item.label}
                          </div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--muted)', marginTop: 2 }}>{item.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>
                      4. Testing Engine Mode
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {[
                        { id: 'fixed', label: 'Fixed Level', desc: 'Standard 20 Qs' },
                        { id: 'adaptive', label: 'Adaptive', desc: 'Auto adjust' }
                      ].map(m => (
                        <div
                          key={m.id}
                          onClick={() => setAptTestMode(m.id)}
                          style={{
                            padding: '8px',
                            minHeight: 52,
                            borderRadius: 10,
                            border: `2px solid ${aptTestMode === m.id ? 'var(--amber)' : 'var(--border)'}`,
                            background: aptTestMode === m.id ? 'rgba(245, 158, 11, 0.15)' : 'var(--s2)',
                            cursor: 'pointer',
                            textAlign: 'center',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ fontSize: '0.8rem', fontWeight: 800, color: aptTestMode === m.id ? 'var(--amber)' : 'var(--text)' }}>
                            {m.label}
                          </div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--muted)', marginTop: 2 }}>{m.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* START APTITUDE BUTTON */}
                <button
                  type="button"
                  onClick={() => start20QuestionAptitudeSession()}
                  style={{
                    padding: '14px 20px',
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, var(--amber) 0%, var(--purple) 100%)',
                    color: '#FFFFFF',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    boxShadow: '0 4px 16px rgba(245, 158, 11, 0.3)',
                    marginTop: 6
                  }}
                >
                  <Zap size={18} /> Start 20-Question Aptitude Test ({aptCustomTopic.trim() || aptTopic})
                </button>
              </div>
            ) : (
              <>

            {/* TOPIC REJECTION ALERT BANNER & RECOMMENDED BADGES */}
            {topicValidationAlert && (
              <div style={{
                padding: '12px 16px',
                borderRadius: 14,
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#EF4444',
                fontSize: '0.825rem',
                fontWeight: 600,
                display: 'flex',
                flexDirection: 'column',
                gap: 8
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertTriangle size={18} />
                  <span>{topicValidationAlert}</span>
                </div>

                {/* 3-STRIKE LOCKOUT RECOMMENDATION BADGES */}
                {topicRejectionCount >= 3 && (
                  <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text)' }}>
                      Suggested valid topics (click to select):
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {['Operating Systems', 'Data Structures', 'Physics', 'React & Next.js', 'Quantum Mechanics'].map((badge) => (
                        <button
                          key={badge}
                          type="button"
                          onClick={() => {
                            if (sessionMode === 'viva') setCustomVivaTopic(badge);
                            else setTopic(badge);
                            setTopicRejectionCount(0);
                            setTopicValidationAlert('');
                          }}
                          style={{
                            padding: '4px 10px',
                            borderRadius: 8,
                            border: '1px solid var(--purple)',
                            background: 'rgba(139, 92, 246, 0.15)',
                            color: 'var(--text)',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          {badge}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* VOICE ENGINE SELECTOR */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>
                Select Oral Interview Engine
              </label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                gap: 12
              }}>
                <div
                  onClick={() => setExecutionMode('live')}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 12,
                    border: `2px solid ${executionMode === 'live' ? 'var(--purple)' : 'var(--border)'}`,
                    background: executionMode === 'live' ? 'rgba(139, 92, 246, 0.12)' : 'var(--s2)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Radio size={16} style={{ color: executionMode === 'live' ? 'var(--purple)' : 'var(--muted)' }} />
                      <span style={{ fontSize: '0.825rem', fontWeight: 800, color: executionMode === 'live' ? 'var(--purple)' : 'var(--text)' }}>
                        Realtime Voice Examiner
                      </span>
                    </div>
                    {executionMode === 'live' && <Check size={14} style={{ color: 'var(--purple)' }} />}
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--muted)', lineHeight: 1.25 }}>
                    Real-time bidirectional 16kHz/24kHz PCM oral examination with natural examiner voice, zero spoilers, and live conversation flow.
                  </span>
                </div>

                <div
                  onClick={() => setExecutionMode('turn')}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 12,
                    border: `2px solid ${executionMode === 'turn' ? 'var(--accent)' : 'var(--border)'}`,
                    background: executionMode === 'turn' ? 'rgba(79, 131, 246, 0.12)' : 'var(--s2)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Edit3 size={16} style={{ color: executionMode === 'turn' ? 'var(--accent)' : 'var(--muted)' }} />
                      <span style={{ fontSize: '0.825rem', fontWeight: 800, color: executionMode === 'turn' ? 'var(--accent)' : 'var(--text)' }}>
                        Turn-by-Turn Guided Viva
                      </span>
                    </div>
                    {executionMode === 'turn' && <Check size={14} style={{ color: 'var(--accent)' }} />}
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--muted)', lineHeight: 1.25 }}>
                    Step-by-step 5-question examination with tap-to-speak Web Speech transcription and manual answer editing.
                  </span>
                </div>
              </div>
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
                        padding: '8px 10px',
                        borderRadius: 12,
                        border: `2px solid ${isSelected ? tier.color : 'var(--border)'}`,
                        background: isSelected ? tier.bg : 'var(--s2)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: isSelected ? tier.color : 'var(--text)' }}>
                          {tier.label}
                        </span>
                        {isSelected && <Check size={14} style={{ color: tier.color }} />}
                      </div>
                      <span style={{ fontSize: '0.675rem', color: 'var(--muted)', lineHeight: 1.2 }}>
                        {tier.desc}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>            {/* VIVA MODE OPTIONS */}
            {sessionMode === 'viva' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* LEVEL SELECTION & CUSTOM TOPIC INPUT */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                  gap: 14
                }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.05em' }}>
                      Academic Education Level
                    </label>
                    <div style={{ position: 'relative', width: '100%' }}>
                      <button
                        type="button"
                        onClick={() => setVivaLevelDropdownOpen(!vivaLevelDropdownOpen)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: 10,
                          background: 'var(--s2)',
                          border: `2px solid ${vivaLevelDropdownOpen ? 'var(--purple)' : 'var(--border)'}`,
                          color: 'var(--text)',
                          fontSize: '0.825rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          boxShadow: vivaLevelDropdownOpen ? '0 4px 16px rgba(139, 92, 246, 0.15)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span>
                          {level === 'School' ? 'School (High School / K-12)' :
                           level === 'College' ? 'College (Undergraduate B.Tech / B.Sc)' :
                           level === 'PG' ? 'Postgraduate / Research' : level}
                        </span>
                        <ChevronDown
                          size={16}
                          style={{
                            color: 'var(--muted)',
                            transform: vivaLevelDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s ease',
                            flexShrink: 0
                          }}
                        />
                      </button>

                      {vivaLevelDropdownOpen && (
                        <>
                          <div
                            onClick={() => setVivaLevelDropdownOpen(false)}
                            style={{ position: 'fixed', inset: 0, zIndex: 90 }}
                          />
                          <div
                            style={{
                              position: 'absolute',
                              top: 'calc(100% + 6px)',
                              left: 0,
                              right: 0,
                              background: 'var(--s1)',
                              border: '1px solid var(--purple)',
                              borderRadius: 12,
                              padding: 4,
                              boxShadow: '0 12px 36px rgba(0, 0, 0, 0.15)',
                              zIndex: 100,
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 2
                            }}
                          >
                            {[
                              { id: 'School', label: 'School (High School / K-12)' },
                              { id: 'College', label: 'College (Undergraduate B.Tech / B.Sc)' },
                              { id: 'PG', label: 'Postgraduate / Research' }
                            ].map(item => {
                              const isSelected = level === item.id;
                              return (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => {
                                    setLevel(item.id);
                                    setVivaLevelDropdownOpen(false);
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    borderRadius: 8,
                                    background: isSelected ? 'rgba(139, 92, 246, 0.12)' : 'transparent',
                                    border: 'none',
                                    color: isSelected ? 'var(--purple)' : 'var(--text)',
                                    fontSize: '0.825rem',
                                    fontWeight: isSelected ? 800 : 600,
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between'
                                  }}
                                >
                                  <span>{item.label}</span>
                                  {isSelected && <Check size={14} style={{ color: 'var(--purple)' }} />}
                                </button>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--purple)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Enter Custom Viva Topic / Subject / Syllabus *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Quantum Mechanics, Organic Chemistry, Operating System Paging, Fluid Dynamics..."
                      value={customVivaTopic}
                      onChange={(e) => setCustomVivaTopic(e.target.value)}
                      style={{
                        width: '100%',
                        background: 'var(--s2)',
                        border: '2px solid var(--purple)',
                        borderRadius: 10,
                        padding: '8px 12px',
                        fontSize: '0.825rem',
                        color: 'var(--text)',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
                  Vedika will construct an oral viva examination strictly testing your entered topic without being constrained to hardcoded subjects.
                </span>
              </div>
            ) : (
              /* INTERVIEW MODE OPTIONS */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                  gap: 14
                }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.05em' }}>
                      Enter Target Tech Stack / Technical Topic *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Python Backend, React & Next.js, System Architecture, DevOps & Kubernetes..."
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      style={{
                        width: '100%',
                        background: 'var(--s2)',
                        border: '2px solid var(--accent)',
                        borderRadius: 10,
                        padding: '8px 12px',
                        fontSize: '0.825rem',
                        color: 'var(--text)',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.05em' }}>
                      Target Seniority Level
                    </label>
                    <div style={{ position: 'relative', width: '100%' }}>
                      <button
                        type="button"
                        onClick={() => setInterviewLevelDropdownOpen(!interviewLevelDropdownOpen)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: 10,
                          background: 'var(--s2)',
                          border: `2px solid ${interviewLevelDropdownOpen ? 'var(--accent)' : 'var(--border)'}`,
                          color: 'var(--text)',
                          fontSize: '0.825rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          boxShadow: interviewLevelDropdownOpen ? '0 4px 16px rgba(79, 131, 246, 0.15)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span>
                          {level === 'Junior' ? 'Junior / Entry-Level Engineer' :
                           level === 'Mid-Level' ? 'Mid-Level Software Engineer' :
                           level === 'Senior' ? 'Senior / Tech Lead Architect' : level}
                        </span>
                        <ChevronDown
                          size={16}
                          style={{
                            color: 'var(--muted)',
                            transform: interviewLevelDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s ease',
                            flexShrink: 0
                          }}
                        />
                      </button>

                      {interviewLevelDropdownOpen && (
                        <>
                          <div
                            onClick={() => setInterviewLevelDropdownOpen(false)}
                            style={{ position: 'fixed', inset: 0, zIndex: 90 }}
                          />
                          <div
                            style={{
                              position: 'absolute',
                              top: 'calc(100% + 6px)',
                              left: 0,
                              right: 0,
                              background: 'var(--s1)',
                              border: '1px solid var(--accent)',
                              borderRadius: 12,
                              padding: 4,
                              boxShadow: '0 12px 36px rgba(0, 0, 0, 0.15)',
                              zIndex: 100,
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 2
                            }}
                          >
                            {[
                              { id: 'Junior', label: 'Junior / Entry-Level Engineer' },
                              { id: 'Mid-Level', label: 'Mid-Level Software Engineer' },
                              { id: 'Senior', label: 'Senior / Tech Lead Architect' }
                            ].map(item => {
                              const isSelected = level === item.id;
                              return (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => {
                                    setLevel(item.id);
                                    setInterviewLevelDropdownOpen(false);
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    borderRadius: 8,
                                    background: isSelected ? 'rgba(79, 131, 246, 0.12)' : 'transparent',
                                    border: 'none',
                                    color: isSelected ? 'var(--accent)' : 'var(--text)',
                                    fontSize: '0.825rem',
                                    fontWeight: isSelected ? 800 : 600,
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between'
                                  }}
                                >
                                  <span>{item.label}</span>
                                  {isSelected && <Check size={14} style={{ color: 'var(--accent)' }} />}
                                </button>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* RESUME UPLOAD SECTION */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.05em' }}>
                    Upload Candidate Resume (Optional - PDF or Text)
                  </label>
                  <div style={{
                    border: '2px dashed var(--border)',
                    borderRadius: 12,
                    padding: 10,
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
                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      {parsingResume ? (
                        <>
                          <Loader2 className="animate-spin" size={18} style={{ color: 'var(--accent)' }} />
                          <span style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--text)' }}>
                            Parsing resume document...
                          </span>
                        </>
                      ) : resumeFile ? (
                        <>
                          <FileCheck size={20} style={{ color: '#10B981' }} />
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text)' }}>
                            {resumeFile.name} (Uploaded)
                          </span>
                          {resumeBlueprint && (
                            <span style={{ fontSize: '0.725rem', color: 'var(--muted)' }}>
                              • {resumeBlueprint.targetRole}
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          <Upload size={18} style={{ color: 'var(--accent)' }} />
                          <span style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--text)' }}>
                            Drop candidate resume (PDF/Text) or click to browse
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.05em' }}>
                    Job Description (JD) / Target Role Details (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Paste target Job Description text here..."
                    value={jdText}
                    onChange={(e) => setJdText(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'var(--s2)',
                      border: `1px solid var(--border)`,
                      borderRadius: 10,
                      padding: 8,
                      fontSize: '0.8rem',
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
                padding: '11px 16px',
                borderRadius: 12,
                border: 'none',
                background: sessionMode === 'viva'
                  ? 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)'
                  : 'linear-gradient(135deg, #4F83F6 0%, #8B5CF6 100%)',
                color: '#FFFFFF',
                fontSize: '0.875rem',
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
            </>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* APTITUDE ACTIVE CHALLENGE VIEW & SCORECARD */}
        {/* ============================================================== */}
        {gameState === 'active' && sessionMode === 'aptitude' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* RESTORED SESSION ALERT BANNER */}
            {aptSessionRestoredAlert && (
              <div style={{
                padding: '10px 16px',
                borderRadius: 12,
                background: 'rgba(139, 92, 246, 0.12)',
                border: '1px solid var(--purple)',
                color: 'var(--text)',
                fontSize: '0.8rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <RotateCcw size={16} style={{ color: 'var(--purple)' }} />
                  <span>Restored active 20-question session on topic "{aptSession.topic}" (Question {aptSession.currentIndex + 1} of {aptSession.questions.length})</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAptSessionRestoredAlert(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontWeight: 800 }}
                >
                  ✕
                </button>
              </div>
            )}

            {/* SCORECARD VIEW */}
            {aptSession.status === 'scorecard' ? (
              <div style={{
                background: 'var(--s1)',
                border: '1px solid var(--border)',
                borderRadius: 20,
                padding: isMobile ? '16px 14px' : '24px 26px',
                display: 'flex',
                flexDirection: 'column',
                gap: 20
              }}>
                {/* HEADER SUMMARY */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: 16,
                  padding: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 16
                }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Award size={28} style={{ color: 'var(--amber)' }} /> Test Session Scorecard
                    </h2>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 600 }}>
                      Topic: <strong>{aptSession.topic}</strong> • Category: <strong>{aptSession.category}</strong>
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    {(() => {
                      const totalQ = aptSession.questions.length || 1;
                      const correctCount = aptSession.questions.filter((q, idx) => aptSession.answers[idx] === q.correct_option).length;
                      const accuracy = Math.round((correctCount / totalQ) * 100);
                      return (
                        <>
                          <div style={{ textAlign: 'center', background: 'var(--s1)', padding: '10px 16px', borderRadius: 12, border: '1px solid var(--border)' }}>
                            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--purple)' }}>{correctCount} / {totalQ}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 700 }}>FINAL SCORE</div>
                          </div>
                          <div style={{ textAlign: 'center', background: 'var(--s1)', padding: '10px 16px', borderRadius: 12, border: '1px solid var(--border)' }}>
                            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: accuracy >= 70 ? '#10B981' : accuracy >= 50 ? 'var(--amber)' : '#EF4444' }}>{accuracy}%</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 700 }}>ACCURACY</div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* REVIEW QUESTIONS LIST */}
                <div>
                  <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <BookOpen size={18} style={{ color: 'var(--purple)' }} /> Complete Question Review & Solutions
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {aptSession.questions.map((q, qIdx) => {
                      const userAns = aptSession.answers[qIdx];
                      const isUnanswered = userAns === undefined || userAns === null;
                      const isCorrect = !isUnanswered && userAns === q.correct_option;

                      return (
                        <div
                          key={qIdx}
                          style={{
                            background: 'var(--s2)',
                            border: `1px solid ${isCorrect ? 'rgba(16, 185, 129, 0.4)' : isUnanswered ? 'var(--border)' : 'rgba(239, 68, 68, 0.4)'}`,
                            borderRadius: 14,
                            padding: '14px 16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 10
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--muted)' }}>
                              Question {qIdx + 1} of {aptSession.questions.length} • Difficulty: {q.difficulty}
                            </span>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: 6,
                              fontSize: '0.75rem',
                              fontWeight: 800,
                              background: isCorrect ? 'rgba(16, 185, 129, 0.15)' : isUnanswered ? 'var(--s1)' : 'rgba(239, 68, 68, 0.15)',
                              color: isCorrect ? '#10B981' : isUnanswered ? 'var(--muted)' : '#EF4444'
                            }}>
                              {isCorrect ? '✓ Correct' : isUnanswered ? 'Skipped' : '✕ Incorrect'}
                            </span>
                          </div>

                          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)' }}>
                            <MathEquationRenderer content={q.question} />
                          </div>

                          {/* OPTIONS SUMMARY */}
                          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 8, marginTop: 4 }}>
                            {q.options.map((opt, oIdx) => {
                              const isUserPick = userAns === oIdx;
                              const isCorrectOpt = oIdx === q.correct_option;

                              let bg = 'var(--s1)';
                              let color = 'var(--text)';
                              let border = 'var(--border)';

                              if (isCorrectOpt) {
                                bg = 'rgba(16, 185, 129, 0.15)';
                                color = '#10B981';
                                border = '#10B981';
                              } else if (isUserPick && !isCorrectOpt) {
                                bg = 'rgba(239, 68, 68, 0.15)';
                                color = '#EF4444';
                                border = '#EF4444';
                              }

                              return (
                                <div
                                  key={oIdx}
                                  style={{
                                    padding: '8px 12px',
                                    borderRadius: 8,
                                    background: bg,
                                    border: `1px solid ${border}`,
                                    color: color,
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between'
                                  }}
                                >
                                  <span>{String.fromCharCode(65 + oIdx)}. <MathEquationRenderer content={opt} /></span>
                                  {isCorrectOpt && <CheckCircle2 size={14} style={{ color: '#10B981' }} />}
                                  {isUserPick && !isCorrectOpt && <XCircle size={14} style={{ color: '#EF4444' }} />}
                                </div>
                              );
                            })}
                          </div>

                          {/* SOLUTION DRAWER */}
                          <div style={{
                            padding: '10px 12px',
                            borderRadius: 10,
                            background: 'rgba(139, 92, 246, 0.06)',
                            border: '1px solid rgba(139, 92, 246, 0.2)',
                            fontSize: '0.8rem',
                            marginTop: 4
                          }}>
                            <strong style={{ color: 'var(--purple)', display: 'block', marginBottom: 4 }}>Step-by-Step Explanation:</strong>
                            <MathEquationRenderer content={q.explanation} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* SCORECARD ACTIONS */}
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 10 }}>
                  <button
                    type="button"
                    onClick={() => start20QuestionAptitudeSession(aptSession.topic)}
                    style={{
                      padding: '12px 20px',
                      borderRadius: 12,
                      background: 'linear-gradient(135deg, var(--amber) 0%, var(--purple) 100%)',
                      color: '#FFFFFF',
                      border: 'none',
                      fontWeight: 800,
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      boxShadow: '0 4px 16px rgba(245, 158, 11, 0.3)'
                    }}
                  >
                    <RotateCcw size={16} /> Retake 20-Question Test ({aptSession.topic})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGameState('setup');
                      setAptSession({ status: 'setup', questions: [], currentIndex: 0, answers: {} });
                    }}
                    style={{
                      padding: '12px 20px',
                      borderRadius: 12,
                      background: 'var(--s2)',
                      color: 'var(--text)',
                      border: '1px solid var(--border)',
                      fontWeight: 800,
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8
                    }}
                  >
                    <Target size={16} /> Select New Topic
                  </button>
                </div>
              </div>
            ) : currentAptQuestion ? (
              <>
                {/* TOP ACTION & TIMER BAR */}
                <div style={{
                  background: 'var(--s1)',
                  border: `1px solid var(--border)`,
                  borderRadius: 16,
                  padding: '12px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 10
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: 8,
                      background: currentAptQuestion.difficulty === 'Easy' ? 'rgba(16, 185, 129, 0.15)' : currentAptQuestion.difficulty === 'Medium' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      color: currentAptQuestion.difficulty === 'Easy' ? '#10B981' : currentAptQuestion.difficulty === 'Medium' ? 'var(--purple)' : 'var(--amber)',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      border: `1px solid ${currentAptQuestion.difficulty === 'Easy' ? '#10B98140' : currentAptQuestion.difficulty === 'Medium' ? 'var(--purple)40' : 'var(--amber)40'}`
                    }}>
                      {currentAptQuestion.difficulty}
                    </span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--purple)' }}>
                      Question {aptSession.currentIndex + 1} of {aptSession.questions.length}
                    </span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)' }}>
                      • Topic: {currentAptQuestion.topic || aptSession.topic}
                    </span>
                    {aptSession.isFetchingMore && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--amber)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Loader2 size={12} className="animate-spin" /> Fetching set in background...
                      </span>
                    )}
                  </div>

                  {/* TIMER & STATS */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    {/* Countdown Timer */}
                    <div style={{
                      padding: '6px 14px',
                      borderRadius: 10,
                      background: aptTimer < 30 ? 'rgba(239, 68, 68, 0.15)' : aptTimer < 60 ? 'rgba(245, 158, 11, 0.15)' : 'var(--s2)',
                      border: `1px solid ${aptTimer < 30 ? '#EF4444' : aptTimer < 60 ? 'var(--amber)' : 'var(--border)'}`,
                      color: aptTimer < 30 ? '#EF4444' : aptTimer < 60 ? 'var(--amber)' : 'var(--text)',
                      fontSize: '0.85rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}>
                      <Clock size={16} style={{ color: aptTimer < 30 ? '#EF4444' : 'var(--purple)' }} />
                      <span>{Math.floor(aptTimer / 60)}:{(aptTimer % 60).toString().padStart(2, '0')}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleFinishAptSession()}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 8,
                        background: 'linear-gradient(135deg, var(--purple) 0%, var(--accent) 100%)',
                        border: 'none',
                        color: '#FFFFFF',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                    >
                      Finish Test
                    </button>
                  </div>
                </div>

                {/* 20-QUESTION NAV GRID */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  overflowX: 'auto',
                  padding: '10px 14px',
                  background: 'var(--s1)',
                  borderRadius: 14,
                  border: '1px solid var(--border)'
                }}>
                  {Array.from({ length: Math.max(20, aptSession.questions.length) }).map((_, qIdx) => {
                    const exists = qIdx < aptSession.questions.length;
                    const isCurrent = qIdx === aptSession.currentIndex;
                    const isAnswered = aptSession.answers[qIdx] !== undefined;

                    let bg = 'var(--s2)';
                    let color = 'var(--muted)';
                    let border = 'var(--border)';

                    if (isCurrent) {
                      bg = 'var(--purple)';
                      color = '#FFFFFF';
                      border = 'var(--purple)';
                    } else if (isAnswered) {
                      bg = 'rgba(16, 185, 129, 0.15)';
                      color = '#10B981';
                      border = '#10B981';
                    }

                    return (
                      <button
                        key={qIdx}
                        type="button"
                        disabled={!exists}
                        onClick={() => handleNavigateAptSession(qIdx)}
                        style={{
                          minWidth: 32,
                          height: 32,
                          borderRadius: 8,
                          background: bg,
                          color: color,
                          border: `1px solid ${border}`,
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          cursor: exists ? 'pointer' : 'not-allowed',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: exists ? 1 : 0.4,
                          flexShrink: 0
                        }}
                      >
                        {qIdx + 1}
                      </button>
                    );
                  })}
                </div>

                {/* QUESTION CARD */}
                <div style={{
                  background: 'var(--s1)',
                  border: `1px solid var(--border)`,
                  borderRadius: 20,
                  padding: isMobile ? '16px 14px' : '22px 24px',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16
                }}>
                  <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text)', lineHeight: 1.6 }}>
                    <MathEquationRenderer content={currentAptQuestion.question} />
                  </div>

                  {/* OPTIONS GRID */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                    gap: 12,
                    marginTop: 8
                  }}>
                    {currentAptQuestion.options.map((optText, optIdx) => {
                      const isSelected = selectedAptOption === optIdx;
                      const isCorrectOption = optIdx === currentAptQuestion.correct_option;
                      const isAnswerRevealed = selectedAptOption !== null || showAptSolution;

                      let btnBg = 'var(--s2)';
                      let btnBorder = 'var(--border)';
                      let btnColor = 'var(--text)';

                      if (isAnswerRevealed) {
                        if (isCorrectOption) {
                          btnBg = 'rgba(16, 185, 129, 0.15)';
                          btnBorder = '#10B981';
                          btnColor = '#10B981';
                        } else if (isSelected && !isCorrectOption) {
                          btnBg = 'rgba(239, 68, 68, 0.15)';
                          btnBorder = '#EF4444';
                          btnColor = '#EF4444';
                        }
                      }

                      return (
                        <button
                          key={optIdx}
                          type="button"
                          disabled={isAnswerRevealed}
                          onClick={() => handleSelectAptOption(optIdx)}
                          style={{
                            padding: '14px 16px',
                            borderRadius: 12,
                            background: btnBg,
                            border: `2px solid ${btnBorder}`,
                            color: btnColor,
                            fontSize: '0.9rem',
                            fontWeight: 700,
                            textAlign: 'left',
                            cursor: isAnswerRevealed ? 'default' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{
                              width: 24,
                              height: 24,
                              borderRadius: '50%',
                              background: 'var(--s1)',
                              border: `1px solid ${btnBorder}`,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.75rem',
                              fontWeight: 800
                            }}>
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                            <MathEquationRenderer content={optText} />
                          </div>
                          {isAnswerRevealed && isCorrectOption && <CheckCircle2 size={18} style={{ color: '#10B981' }} />}
                          {isAnswerRevealed && isSelected && !isCorrectOption && <XCircle size={18} style={{ color: '#EF4444' }} />}
                        </button>
                      );
                    })}
                  </div>

                  {/* ACTION BAR: HINT, GIVE UP, PREV, NEXT */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 10,
                    borderTop: `1px solid var(--border)`,
                    paddingTop: 16,
                    marginTop: 6
                  }}>
                    <div style={{ display: 'flex', gap: 10 }}>
                      {/* Hint Button */}
                      <button
                        type="button"
                        onClick={() => setShowAptHint(prev => !prev)}
                        style={{
                          padding: '8px 14px',
                          borderRadius: 10,
                          background: showAptHint ? 'rgba(245, 158, 11, 0.15)' : 'var(--s2)',
                          border: `1px solid ${showAptHint ? 'var(--amber)' : 'var(--border)'}`,
                          color: showAptHint ? 'var(--amber)' : 'var(--text)',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        <Lightbulb size={16} style={{ color: 'var(--amber)' }} />
                        {showAptHint ? 'Hide Hint' : '💡 Get Hint'}
                      </button>

                      {/* Give Up Button */}
                      <button
                        type="button"
                        onClick={handleAptGiveUp}
                        disabled={showAptSolution}
                        style={{
                          padding: '8px 14px',
                          borderRadius: 10,
                          background: showAptSolution ? 'rgba(239, 68, 68, 0.15)' : 'var(--s2)',
                          border: `1px solid ${showAptSolution ? '#EF4444' : 'var(--border)'}`,
                          color: showAptSolution ? '#EF4444' : 'var(--muted)',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          cursor: showAptSolution ? 'default' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        <Flag size={16} style={{ color: '#EF4444' }} />
                        {showAptSolution ? 'Solution Revealed' : '🏳️ Give Up'}
                      </button>
                    </div>

                    {/* NAVIGATION BUTTONS */}
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button
                        type="button"
                        disabled={aptSession.currentIndex === 0}
                        onClick={() => handleNavigateAptSession(aptSession.currentIndex - 1)}
                        style={{
                          padding: '8px 16px',
                          borderRadius: 10,
                          background: 'var(--s2)',
                          color: 'var(--text)',
                          border: '1px solid var(--border)',
                          fontSize: '0.85rem',
                          fontWeight: 800,
                          cursor: aptSession.currentIndex === 0 ? 'not-allowed' : 'pointer',
                          opacity: aptSession.currentIndex === 0 ? 0.5 : 1
                        }}
                      >
                        Previous
                      </button>

                      {aptSession.currentIndex < 19 ? (
                        <button
                          type="button"
                          disabled={generatingAiAptitude}
                          onClick={() => handleNavigateAptSession(aptSession.currentIndex + 1)}
                          style={{
                            padding: '8px 16px',
                            borderRadius: 10,
                            background: 'linear-gradient(135deg, var(--amber) 0%, var(--purple) 100%)',
                            color: '#FFFFFF',
                            border: 'none',
                            fontSize: '0.85rem',
                            fontWeight: 800,
                            cursor: generatingAiAptitude ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            opacity: generatingAiAptitude ? 0.7 : 1,
                            boxShadow: '0 4px 14px rgba(245, 158, 11, 0.3)'
                          }}
                        >
                          {generatingAiAptitude ? (
                            <>
                              <Loader2 className="animate-spin" size={16} />
                              <span>Generating Question {aptSession.currentIndex + 2} with AI...</span>
                            </>
                          ) : (
                            <>
                              <span>Next Question</span> <ChevronRight size={16} />
                            </>
                          )}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleFinishAptSession}
                          style={{
                            padding: '8px 18px',
                            borderRadius: 10,
                            background: 'linear-gradient(135deg, #10B981 0%, var(--purple) 100%)',
                            color: '#FFFFFF',
                            border: 'none',
                            fontSize: '0.85rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)'
                          }}
                        >
                          Submit & View Scorecard <CheckCircle2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* HINT DRAWER */}
                  {showAptHint && (
                    <div style={{
                      padding: '12px 16px',
                      borderRadius: 12,
                      background: 'rgba(245, 158, 11, 0.08)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      color: 'var(--text)',
                      fontSize: '0.85rem'
                    }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--amber)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Lightbulb size={14} /> HINT
                      </div>
                      <MathEquationRenderer content={currentAptQuestion.hint} />
                    </div>
                  )}

                  {/* STEP-BY-STEP EXPLANATION (REVEALED ON SELECTION OR GIVE UP) */}
                  {(showAptSolution || selectedAptOption !== null) && (
                    <div style={{
                      padding: '16px 18px',
                      borderRadius: 14,
                      background: 'rgba(139, 92, 246, 0.06)',
                      border: '1px solid var(--purple)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10
                    }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--purple)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Sparkles size={16} /> Step-by-Step Explanation & Solution
                      </div>
                      <div style={{ fontSize: '0.9rem', color: 'var(--text)', lineHeight: 1.6 }}>
                        <MathEquationRenderer content={currentAptQuestion.explanation} />
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div style={{
                background: 'var(--s1)',
                border: '1px solid var(--border)',
                borderRadius: 24,
                padding: '48px 24px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.05)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                gap: 16,
                maxWidth: 520,
                margin: '30px auto',
                width: '100%'
              }}>
                <div style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--amber) 0%, var(--purple) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  boxShadow: '0 6px 20px rgba(245, 158, 11, 0.35)'
                }}>
                  <Sparkles size={32} className="animate-pulse" />
                </div>

                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)' }}>
                    Generating Technical Question 1 with AI...
                  </h3>
                  <p style={{ margin: '6px 0 0 0', fontSize: '0.825rem', color: 'var(--muted)' }}>
                    Vedika AI is tailoring a fresh question for topic <strong style={{ color: 'var(--purple)' }}>"{aptSession.topic}"</strong> ({aptSession.difficulty} Difficulty).
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--amber)', fontSize: '0.8rem', fontWeight: 700 }}>
                  <Loader2 className="animate-spin" size={16} />
                  <span>Preparing your test session...</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* ACTIVE SESSION VIEW (GEMINI LIVE REAL-TIME OR GUIDED TURN) */}
        {/* ============================================================== */}
        {gameState === 'active' && sessionMode !== 'aptitude' && executionMode === 'live' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            
            {/* LIVE EXAMINER HUD CARD */}
            <div style={{
              background: 'var(--s1)',
              border: `1px solid var(--border)`,
              borderRadius: 24,
              padding: isMobile ? '20px 14px' : '28px 24px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: 20
            }}>
              {/* TOP STATUS BAR */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 10,
                borderBottom: `1px solid var(--border)`,
                paddingBottom: 14
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: liveConnectionStatus === 'tutor-speaking' 
                      ? 'var(--purple)' 
                      : liveConnectionStatus === 'connected' 
                      ? '#10B981' 
                      : liveConnectionStatus === 'connecting' 
                      ? '#F59E0B' 
                      : 'var(--muted)',
                    animation: (liveConnectionStatus === 'tutor-speaking' || liveConnectionStatus === 'connected') ? 'pulse 1s infinite' : 'none'
                  }} />
                  <span style={{
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: liveConnectionStatus === 'tutor-speaking' ? 'var(--purple)' : liveConnectionStatus === 'connected' ? '#10B981' : 'var(--text)'
                  }}>
                    {liveConnectionStatus === 'tutor-speaking' && '🎙️ AI Examiner Speaking...'}
                    {liveConnectionStatus === 'connected' && '👂 AI Examiner Listening (Speak in English)...'}
                    {liveConnectionStatus === 'connecting' && 'Connecting to Live Gemini Examiner...'}
                    {liveConnectionStatus === 'disconnected' && 'Live Examiner Offline'}
                    {liveConnectionStatus === 'error' && 'Connection Error'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={() => setIsScratchpadOpen((prev) => !prev)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 8,
                      background: isScratchpadOpen ? 'rgba(139, 92, 246, 0.2)' : 'var(--s2)',
                      color: isScratchpadOpen ? 'var(--purple)' : 'var(--text)',
                      border: `1px solid ${isScratchpadOpen ? 'var(--purple)' : 'var(--border)'}`,
                      fontSize: '0.725rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Code size={13} />
                    <span>{isScratchpadOpen ? 'Hide Scratchpad' : '📝 Code Scratchpad'}</span>
                  </button>

                  <button
                    onClick={() => setIsTranscriptOpen((prev) => !prev)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 8,
                      background: isTranscriptOpen ? 'rgba(16, 185, 129, 0.2)' : 'var(--s2)',
                      color: isTranscriptOpen ? '#10B981' : 'var(--text)',
                      border: `1px solid ${isTranscriptOpen ? '#10B981' : 'var(--border)'}`,
                      fontSize: '0.725rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <FileText size={13} />
                    <span>{isTranscriptOpen ? 'CC Captions On' : 'CC Captions Off'}</span>
                  </button>

                  <span style={{
                    padding: '3px 8px',
                    borderRadius: 6,
                    background: difficulty === 'Easy' ? 'rgba(16, 185, 129, 0.15)' : difficulty === 'Hard' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(79, 131, 246, 0.15)',
                    color: difficulty === 'Easy' ? '#10B981' : difficulty === 'Hard' ? '#EF4444' : 'var(--accent)',
                    fontSize: '0.7rem',
                    fontWeight: 700
                  }}>
                    {difficulty} Difficulty
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                    • {sessionMode === 'viva' ? (vivaSource === 'custom' ? customVivaTopic : selectedExperiment) : (topic || programmingLanguage)}
                  </span>
                </div>
              </div>

              {/* FLOATING PLAIN TEXTAREA SCRATCHPAD FOR CODE / NOTES */}
              {isScratchpadOpen && (
                <div style={{
                  background: 'var(--s2)',
                  border: '1px solid rgba(139, 92, 246, 0.35)',
                  borderRadius: 16,
                  padding: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Code size={15} style={{ color: 'var(--purple)' }} />
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text)' }}>
                        Code & Notes Scratchpad
                      </span>
                    </div>
                    <span style={{ fontSize: '0.675rem', color: 'var(--muted)' }}>
                      Type plain code/notes below • Speak your thoughts simultaneously
                    </span>
                  </div>

                  <textarea
                    rows={6}
                    placeholder="Type your code, query, or notes here... (e.g. Python / Java / SQL)"
                    value={scratchpadText}
                    onChange={(e) => setScratchpadText(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'var(--s1)',
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      padding: 12,
                      fontSize: '0.825rem',
                      fontFamily: 'monospace',
                      color: 'var(--text)',
                      outline: 'none',
                      resize: 'vertical',
                      boxSizing: 'border-box',
                      lineHeight: 1.45
                    }}
                  />

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                    <button
                      onClick={() => setIsScratchpadOpen(false)}
                      style={{
                        padding: '5px 10px',
                        borderRadius: 8,
                        background: 'transparent',
                        color: 'var(--muted)',
                        border: '1px solid var(--border)',
                        fontSize: '0.725rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Close
                    </button>

                    <button
                      onClick={handleAttachScratchpadToAnswer}
                      disabled={!scratchpadText.trim()}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 8,
                        background: 'linear-gradient(135deg, var(--purple) 0%, var(--accent) 100%)',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: '0.725rem',
                        fontWeight: 700,
                        cursor: scratchpadText.trim() ? 'pointer' : 'not-allowed',
                        opacity: scratchpadText.trim() ? 1 : 0.5,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      <Check size={13} />
                      <span>Attach Code to Answer</span>
                    </button>
                  </div>
                </div>
              )}

              {/* MAIN STAGE CONTENT (PET CENTER CONSTANT + OPTIONAL CC SIDE TRANSCRIPT) */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: (isTranscriptOpen && !isMobile) ? '1fr 340px' : '1fr',
                gap: 20,
                alignItems: 'start',
                minHeight: 340
              }}>
                {/* CENTER CONSTANT STAGE WITH PET & SPEECH BUBBLE POPUP */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: isMobile ? '20px 12px' : '28px 20px',
                  background: 'var(--s2)',
                  borderRadius: 20,
                  border: '1px solid var(--border)',
                  gap: 18,
                  position: 'relative',
                  minHeight: 340
                }}>
                  {/* DYNAMIC SPEECH / THINKING BUBBLE POPUP */}
                  <div style={{
                    maxWidth: isMobile ? '95%' : '80%',
                    width: '100%',
                    background: 'var(--s1)',
                    border: (liveConnectionStatus === 'tutor-speaking' || isSpeaking)
                      ? '1px solid rgba(139, 92, 246, 0.5)'
                      : (isRecording || liveConnectionStatus === 'connected')
                      ? '1px solid rgba(16, 185, 129, 0.5)'
                      : '1px solid var(--border)',
                    borderRadius: 18,
                    padding: '16px 20px',
                    boxShadow: (liveConnectionStatus === 'tutor-speaking' || isSpeaking)
                      ? '0 8px 24px rgba(139, 92, 246, 0.15)'
                      : '0 4px 16px rgba(0, 0, 0, 0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    textAlign: 'center',
                    position: 'relative',
                    transition: 'all 0.2s ease'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <span style={{
                        fontSize: '0.675rem',
                        fontWeight: 800,
                        letterSpacing: '0.08em',
                        color: 'var(--purple)',
                        textTransform: 'uppercase'
                      }}>
                        🎙️ AI EXAMINER QUESTION
                      </span>
                    </div>

                    <p style={{
                      margin: 0,
                      fontSize: isMobile ? '0.9rem' : '1.025rem',
                      fontWeight: 600,
                      color: 'var(--text)',
                      lineHeight: 1.55
                    }}>
                      {(() => {
                        const examinerMsg = liveConversation.slice().reverse().find(m => m.sender === 'examiner')?.text;
                        return examinerMsg || liveStatusMessage || 'AI Examiner is ready! Oral examination starting...';
                      })()}
                    </p>

                    {/* Speech bubble pointer pointing down to Pet Mascot */}
                    <div style={{
                      position: 'absolute',
                      bottom: -8,
                      left: '50%',
                      transform: 'translateX(-50%) rotate(45deg)',
                      width: 14,
                      height: 14,
                      background: 'var(--s1)',
                      borderRight: '1px solid var(--border)',
                      borderBottom: '1px solid var(--border)'
                    }} />
                  </div>

                  {/* CONSTANT CENTER PET MASCOT */}
                  <PetAvatar
                    size={isMobile ? 180 : 220}
                    isSpeaking={liveConnectionStatus === 'tutor-speaking' || isSpeaking}
                    isListening={isRecording || (liveConnectionStatus === 'connected' && !isSpeaking)}
                    isThinking={liveConnectionStatus === 'connecting'}
                  />

                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 4 }}>
                    Vedika Mascot AI Examiner • Speak naturally through your microphone
                  </span>
                </div>

                {/* SIDE CC TRANSCRIPT WINDOW (TOGGLED VIA CC CAPTIONS BUTTON) */}
                {isTranscriptOpen && (
                  <div style={{
                    background: 'var(--s2)',
                    borderRadius: 20,
                    border: '1px solid var(--border)',
                    padding: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    maxHeight: 380,
                    overflowY: 'auto'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text)' }}>
                        📜 CC Live Transcript History
                      </span>
                      <button
                        onClick={() => setIsTranscriptOpen(false)}
                        style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.75rem' }}
                      >
                        Close
                      </button>
                    </div>

                    {liveConversation.length === 0 ? (
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted)', textAlign: 'center', padding: '20px 0' }}>
                        Transcript history will stream here as you speak.
                      </span>
                    ) : (
                      liveConversation.map((msg) => {
                        const isCandidate = msg.sender === 'candidate';
                        return (
                          <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: isCandidate ? '#10B981' : 'var(--purple)' }}>
                              {isCandidate ? 'You:' : 'Examiner:'}
                            </span>
                            <div style={{
                              padding: '8px 12px',
                              borderRadius: 10,
                              background: isCandidate ? 'rgba(16, 185, 129, 0.1)' : 'var(--s1)',
                              border: '1px solid var(--border)',
                              fontSize: '0.8rem',
                              color: 'var(--text)'
                            }}>
                              {msg.text}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* FOOTER ACTIONS */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
                borderTop: `1px solid var(--border)`,
                paddingTop: 16
              }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                  {liveStatusMessage}
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    onClick={handleFinishLiveExam}
                    style={{
                      padding: '10px 20px',
                      borderRadius: 12,
                      background: 'linear-gradient(135deg, var(--purple) 0%, var(--accent) 100%)',
                      color: '#FFFFFF',
                      border: 'none',
                      fontSize: '0.825rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      boxShadow: '0 4px 16px rgba(139, 92, 246, 0.3)'
                    }}
                  >
                    <Award size={16} />
                    <span>Finish Exam & View Scorecard</span>
                  </button>

                  <button
                    onClick={() => {
                      disconnectGeminiLive();
                      setGameState('setup');
                    }}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 12,
                      background: 'var(--s2)',
                      color: 'var(--muted)',
                      border: `1px solid var(--border)`,
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <PhoneOff size={15} />
                    <span>Exit</span>
                  </button>
                </div>
              </div>

            </div>

          </div>
        )}

        {gameState === 'active' && sessionMode !== 'aptitude' && executionMode === 'turn' && (
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
                    TOPIC {currentQIndex + 1}
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
                  <span style={{ fontSize: '0.75rem', color: turnTimeRemaining < 20 ? '#EF4444' : 'var(--muted)', fontWeight: turnTimeRemaining < 20 ? 700 : 500 }}>
                    • Turn Timer: {turnTimeRemaining}s remaining {turnTimeRemaining < 20 && '⏱️'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={handleRepeatQuestion}
                    style={{
                      padding: '6px 12px',
                      background: 'rgba(139, 92, 246, 0.12)',
                      border: `1px solid var(--purple)`,
                      color: 'var(--purple)',
                      borderRadius: 8,
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      transition: 'all 0.15s ease'
                    }}
                    title="Ask Examiner to Repeat or Rephrase Question"
                  >
                    <RotateCcw size={13} />
                    <span>Repeat Question</span>
                  </button>

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
              </div>

              {/* 90s TURN TIMER PROGRESS BAR */}
              <div style={{
                width: '100%',
                height: 4,
                background: 'var(--s2)',
                borderRadius: 2,
                overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  width: `${(turnTimeRemaining / 90) * 100}%`,
                  background: turnTimeRemaining < 20 ? '#EF4444' : turnTimeRemaining < 40 ? '#F59E0B' : 'var(--purple)',
                  transition: 'width 1s linear'
                }} />
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
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 8
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Candidate Response
                  </label>
                  {isRecording && (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      color: '#EF4444',
                      background: 'rgba(239, 68, 68, 0.1)',
                      padding: '2px 8px',
                      borderRadius: 6,
                      border: '1px solid rgba(239, 68, 68, 0.25)'
                    }}>
                      <span style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: '#EF4444',
                        animation: 'pulse 1s infinite'
                      }} />
                      Live Recording
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {userAnswer && (
                    <button
                      onClick={handleClearAnswer}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--muted)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        transition: 'color 0.15s ease'
                      }}
                      title="Clear Answer Text"
                    >
                      <Trash2 size={13} />
                      <span>Clear</span>
                    </button>
                  )}
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
                  onChange={handleUserAnswerChange}
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

              {/* SUBMIT & SKIP BUTTONS */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                  {loading && (statusMessage || 'Examiner is evaluating your answer...')}
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {currentQIndex < 4 && (
                    <button
                      onClick={handleSkipQuestion}
                      disabled={loading}
                      style={{
                        padding: '10px 18px',
                        background: 'var(--s2)',
                        color: 'var(--muted)',
                        border: `1px solid var(--border)`,
                        borderRadius: 14,
                        fontSize: '0.825rem',
                        fontWeight: 600,
                        cursor: loading ? 'not-allowed' : 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      Skip Question
                    </button>
                  )}

                  <button
                    onClick={handleAnswerSubmit}
                    disabled={loading || !userAnswer.trim()}
                    style={{
                      padding: '12px 24px',
                      background: currentQIndex >= 4 
                        ? 'linear-gradient(135deg, var(--purple) 0%, var(--accent) 100%)' 
                        : 'var(--purple)',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: 14,
                      fontSize: '0.85rem',
                      fontWeight: 800,
                      cursor: (loading || !userAnswer.trim()) ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      boxShadow: currentQIndex >= 4 
                        ? '0 0 20px rgba(139, 92, 246, 0.45)' 
                        : '0 4px 14px rgba(139, 92, 246, 0.25)',
                      opacity: (loading || !userAnswer.trim()) ? 0.5 : 1,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {loading ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : currentQIndex >= 4 ? (
                      <Award size={16} />
                    ) : (
                      <Send size={16} />
                    )}
                    <span>{currentQIndex >= 4 ? '🎉 Finish Exam & View Scorecard' : 'Submit & Next Question'}</span>
                  </button>
                </div>
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

                <div style={{
                  padding: '12px 24px',
                  borderRadius: 16,
                  background: 'var(--s2)',
                  border: `1px solid var(--border)`,
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--purple)' }}>
                    {scorecard.totalQuestionsAsked || (scorecard.perTopicAnalysis?.length || 0)} Qs
                  </div>
                  <span style={{ fontSize: '0.725rem', color: 'var(--muted)', fontWeight: 600 }}>
                    {scorecard.nTopics || (scorecard.perTopicAnalysis?.length || 0)} TOPICS ATTEMPTED
                  </span>
                </div>
              </div>

              {/* SYSTEM WARNING BANNER (IF ANY TOPICS WERE UNSCORED) */}
              {scorecard.systemErrorWarning && (
                <div style={{
                  width: '100%',
                  maxWidth: 680,
                  background: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: 14,
                  padding: '12px 16px',
                  color: '#D97706',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  textAlign: 'center',
                  lineHeight: 1.4
                }}>
                  ⚠️ {scorecard.systemErrorWarning}
                </div>
              )}

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

            {/* 3-DIMENSION RUBRIC BREAKDOWN GRID */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr',
              gap: 16
            }}>
              {Object.entries(scorecard.rubricBreakdown || {}).map(([dimKey, dimVal]) => {
                const labels = {
                  technicalAccuracy: { title: 'Technical Accuracy & Depth', weight: '50%' },
                  problemSolving: { title: 'Problem Solving & Adaptability', weight: '30%' },
                  communicationClarity: { title: 'Communication Clarity', weight: '20%' }
                };
                const info = labels[dimKey] || { title: dimKey, weight: '' };
                const isUnscored = dimVal.score === null || dimVal.score === undefined;

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
                        {info.title} {info.weight && <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>({info.weight})</span>}
                      </span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: isUnscored ? 'var(--muted)' : 'var(--purple)' }}>
                        {isUnscored ? 'N/A' : `${dimVal.score} / 10`}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div style={{ width: '100%', height: 6, background: 'var(--s2)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{
                        width: isUnscored ? '0%' : `${(dimVal.score / 10) * 100}%`,
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
