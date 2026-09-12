'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Brain, CheckCircle, ChevronRight, ChevronLeft, Clock,
  Loader2, RotateCcw, ArrowLeft, Send,
  FileText, Award, AlertCircle, ThumbsUp, HelpCircle, Terminal, Info, X,
  BookOpen, Bot, MessageSquare, Mic, MicOff, Volume2, StopCircle, Globe,
  BookMarked, Trash2, Plus, Radio, Laptop, Play, Download
} from 'lucide-react';
import { T, COURSE, geminiCall, buildQuizPrompt, parseQuizOutput, getCourseDetails } from '@/lib/lms-data';
import { useMediaQuery, isMobileMQ } from '@/lib/useMediaQuery';
import dynamic from 'next/dynamic';
import {
  getCourses, getQuizzes, submitQuizResponse, getQuizSubmissions
} from '@/lib/frappe';
import PDFViewerModal from './PDFViewerModal';
import VideoPlayerWithAI from './VideoPlayerWithAI';
import VideoAIExplainerCard from './VideoAIExplainerCard';
import PetAvatar from './PetAvatar';
import PracticePlaygroundModal from './PracticePlaygroundModal';
import CompanionAvatarTabs from './CompanionAvatarTabs';
import { useDesktopPetBridge } from '@/hooks/useDesktopPetBridge';
import './LessonPage.css';
function formatTimestamp(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
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
  const [isOverviewModalOpen, setIsOverviewModalOpen] = useState(false);

  // Video AI Explainer ("Ask Vedika") states
  const [videoSeekTime, setVideoSeekTime] = useState(null);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [aiExplainerData, setAiExplainerData] = useState(null);
  const [explainerLoading, setExplainerLoading] = useState(false);
  const [isExplainerOpen, setIsExplainerOpen] = useState(false);
  const [activeCompanionTab, setActiveCompanionTab] = useState('ask_vedika'); // 'ask_vedika' | 'notes' | 'qa' | 'quiz'

  const [chatQuestion, setChatQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);

  // Desktop Pet Bridge & Personal Study Notepad states
  const {
    isPetConnected,
    sendStateUpdate,
    askVedikaVideoMoment,
    saveStudyNote,
    getStudyNotes,
    deleteStudyNote
  } = useDesktopPetBridge();

  const [notes, setNotes] = useState([]);
  const [allCourseNotes, setAllCourseNotes] = useState([]);
  const [noteFilter, setNoteFilter] = useState('lesson'); // 'lesson' | 'course'
  const [recentNoteAlert, setRecentNoteAlert] = useState(null);
  const [newNoteText, setNewNoteText] = useState('');
  const [isDictating, setIsDictating] = useState(false);
  const [forcePause, setForcePause] = useState(false);
  const [petMomentStatus, setPetMomentStatus] = useState(null); // 'sending' | 'active' | 'offline' | null
  const recognitionRef = useRef(null);
  const dictationBaseTextRef = useRef('');

  // Lock companion box height exactly to the video box height to prevent layout stretching
  const videoCardRef = useRef(null);
  const [videoBoxHeight, setVideoBoxHeight] = useState(null);

  useEffect(() => {
    if (!videoCardRef.current || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect && entry.contentRect.height > 100) {
          setVideoBoxHeight(Math.round(entry.contentRect.height));
        }
      }
    });
    observer.observe(videoCardRef.current);
    return () => observer.disconnect();
  }, []);

  const storageKey = `vedika_notes_${lesson?.id || lesson?.title || 'general'}`;

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
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (_) {}
      }
    };
  }, []);

  // Continuously sync active video playback context to Desktop Pet so voice commands ("Vedika, add note...") know the exact video second and lesson
  useEffect(() => {
    if (!sendStateUpdate) return;
    const targetSecs = Math.floor(videoCurrentTime || 0);
    sendStateUpdate({
      activeActivity: 'course_video',
      courseId: lesson?.courseId || COURSE?.id || 'course',
      courseTitle: lesson?.courseTitle || COURSE?.title || 'Current Course',
      chapterTitle: lesson?.chapterTitle || lesson?.chapter || 'Chapter',
      lessonId: lesson?.id || lesson?.lessonId || '',
      lessonTitle: lesson?.title || 'Lesson',
      videoId: extractYoutubeId(lesson?.vid) || '',
      timestampSeconds: targetSecs,
      timestampFormatted: formatTimestamp(targetSecs),
      topic: lesson?.topic || lesson?.title || '',
      overview: lesson?.overview || ''
    });
  }, [lesson?.id, lesson?.title, lesson?.courseId, Math.floor(videoCurrentTime || 0), sendStateUpdate]);

  // Load local notes for this lesson and sync with Desktop Pet SQLite
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setNotes(JSON.parse(saved));
      }
    } catch (_) {}

    if (getStudyNotes) {
      getStudyNotes({ lessonId: lesson?.id || lesson?.title, courseId: lesson?.courseId || COURSE?.id });
    }
  }, [lesson?.id, lesson?.title, lesson?.courseId, getStudyNotes, storageKey]);

  // Listen for real-time notes added or deleted from Desktop Pet
  useEffect(() => {
    const handleNoteAdded = (e) => {
      const newNote = e.detail;
      if (!newNote) return;

      // 1. Show interactive notification alert banner for 5 seconds
      setRecentNoteAlert(newNote);
      setTimeout(() => {
        setRecentNoteAlert(prev => (prev?.id === newNote.id ? null : prev));
      }, 5000);

      // 2. Update current lesson notes if it belongs to this lesson
      const isThisLesson = !newNote.lessonId || 
        newNote.lessonId === lesson?.id || 
        newNote.lessonId === lesson?.title || 
        newNote.lessonTitle === lesson?.title;

      if (isThisLesson) {
        setNotes(prev => {
          if (prev.some(n => n.id === newNote.id || (n.noteText === newNote.noteText && n.timestampFormatted === newNote.timestampFormatted))) {
            return prev;
          }
          const updated = [newNote, ...prev];
          try { localStorage.setItem(storageKey, JSON.stringify(updated)); } catch (_) {}
          return updated;
        });
      }

      // 3. Always update allCourseNotes list
      setAllCourseNotes(prev => {
        if (prev.some(n => n.id === newNote.id || (n.noteText === newNote.noteText && n.timestampFormatted === newNote.timestampFormatted))) {
          return prev;
        }
        return [newNote, ...prev];
      });
    };

    const handleNotesList = (e) => {
      const list = e.detail?.notes;
      if (Array.isArray(list) && list.length > 0) {
        setAllCourseNotes(list);

        // Filter for this lesson
        const lessonNotes = list.filter(n => 
          !n.lessonId || 
          n.lessonId === lesson?.id || 
          n.lessonId === lesson?.title || 
          n.lessonTitle === lesson?.title
        );

        setNotes(prev => {
          const mergedMap = new Map();
          prev.forEach(n => mergedMap.set(n.id || `${n.timestampFormatted}_${n.noteText}`, n));
          lessonNotes.forEach(n => mergedMap.set(n.id || `${n.timestampFormatted}_${n.noteText}`, n));
          const merged = Array.from(mergedMap.values()).sort((a, b) => (a.timestampSeconds || 0) - (b.timestampSeconds || 0));
          try { localStorage.setItem(storageKey, JSON.stringify(merged)); } catch (_) {}
          return merged;
        });
      }
    };

    const handleNoteUpdated = (e) => {
      const updatedNote = e.detail;
      if (!updatedNote || !updatedNote.id) return;

      // Show interactive notification alert banner
      setRecentNoteAlert(updatedNote);
      setTimeout(() => {
        setRecentNoteAlert(prev => (prev?.id === updatedNote.id ? null : prev));
      }, 5000);

      // Update current lesson notes list
      const isThisLesson = !updatedNote.lessonId || 
        updatedNote.lessonId === lesson?.id || 
        updatedNote.lessonId === lesson?.title || 
        updatedNote.lessonTitle === lesson?.title;

      if (isThisLesson) {
        setNotes(prev => {
          const idx = prev.findIndex(n => n.id === updatedNote.id);
          let updated;
          if (idx !== -1) {
            updated = [...prev];
            updated[idx] = { ...updated[idx], ...updatedNote };
          } else {
            updated = [updatedNote, ...prev];
          }
          try { localStorage.setItem(storageKey, JSON.stringify(updated)); } catch (_) {}
          return updated;
        });
      }

      // Update allCourseNotes list
      setAllCourseNotes(prev => {
        const idx = prev.findIndex(n => n.id === updatedNote.id);
        if (idx !== -1) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], ...updatedNote };
          return updated;
        }
        return [updatedNote, ...prev];
      });
    };

    const handleNoteDeleted = (e) => {
      const deletedId = e.detail?.id;
      if (!deletedId) return;
      setNotes(prev => {
        const updated = prev.filter(n => n.id !== deletedId);
        try { localStorage.setItem(storageKey, JSON.stringify(updated)); } catch (_) {}
        return updated;
      });
      setAllCourseNotes(prev => prev.filter(n => n.id !== deletedId));
    };

    const handleAskAck = () => {
      setPetMomentStatus('active');
    };

    window.addEventListener('vedika-study-note-added', handleNoteAdded);
    window.addEventListener('vedika-study-note-updated', handleNoteUpdated);
    window.addEventListener('vedika-study-notes-list', handleNotesList);
    window.addEventListener('vedika-study-note-deleted', handleNoteDeleted);
    window.addEventListener('vedika-ask-acknowledged', handleAskAck);

    return () => {
      window.removeEventListener('vedika-study-note-added', handleNoteAdded);
      window.removeEventListener('vedika-study-note-updated', handleNoteUpdated);
      window.removeEventListener('vedika-study-notes-list', handleNotesList);
      window.removeEventListener('vedika-study-note-deleted', handleNoteDeleted);
      window.removeEventListener('vedika-ask-acknowledged', handleAskAck);
    };
  }, [lesson?.id, lesson?.title, storageKey]);

  const handleAskVedikaPetMoment = async (optionalSecs) => {
    // 1. Force video to pause immediately!
    setForcePause(true);
    setTimeout(() => setForcePause(false), 400);

    const targetSecs = typeof optionalSecs === 'number' ? optionalSecs : Math.floor(videoCurrentTime || 0);
    const formatted = formatTimestamp(targetSecs);

    setPetMomentStatus('sending');

    // Also trigger UI explainer card fetch
    handleExplainVideoAtTime(targetSecs);

    let fetchedSnippet = aiExplainerData?.transcriptSnippet || '';
    let fetchedSummary = aiExplainerData?.summary || '';
    let fetchedConcept = aiExplainerData?.coreExplanation || (aiExplainerData?.keyTakeaways ? aiExplainerData.keyTakeaways.join('; ') : '');

    // Pre-fetch actual YouTube curriculum topic at this timestamp so Vedika knows the precise subject
    const vId = extractYoutubeId(lesson?.vid);
    if ((!fetchedSnippet || !fetchedSummary) && vId) {
      try {
        const res = await fetch('/api/youtube/explain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoId: vId,
            timestamp: targetSecs,
            title: lesson?.title || ''
          })
        });
        if (res.ok) {
          const d = await res.json();
          if (d && !d.error) {
            fetchedSnippet = d.transcriptSnippet || '';
            fetchedSummary = d.summary || '';
            fetchedConcept = d.coreExplanation || (d.keyTakeaways ? d.keyTakeaways.join('; ') : '');
            setAiExplainerData(d);
          }
        }
      } catch (err) {
        console.warn('Pre-fetch explain error:', err);
      }
    }

    const payload = {
      courseId: lesson?.courseId || '',
      courseTitle: lesson?.courseTitle || COURSE?.title || 'Current Course',
      chapterTitle: lesson?.chapterTitle || lesson?.chapter || 'Chapter',
      lessonId: lesson?.id || lesson?.lessonId || '',
      lessonTitle: lesson?.title || 'Lesson',
      videoId: vId || '',
      timestampSeconds: targetSecs,
      timestampFormatted: formatted,
      topic: lesson?.topic || lesson?.title || '',
      overview: lesson?.overview || '',
      transcriptSnippet: fetchedSnippet,
      conceptSummary: fetchedSummary,
      coreExplanation: fetchedConcept
    };

    const sent = askVedikaVideoMoment(payload);
    if (sent) {
      setTimeout(() => setPetMomentStatus('active'), 1000);
    } else {
      setPetMomentStatus('offline');
    }
  };

  const handleToggleDictation = () => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. You can type notes directly!");
      return;
    }

    if (isDictating) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (_) {}
        recognitionRef.current = null;
      }
      setIsDictating(false);
      dictationBaseTextRef.current = '';
    } else {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-IN';
        dictationBaseTextRef.current = newNoteText;

        recognition.onresult = (event) => {
          let interimTranscript = '';
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const piece = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += piece;
            } else {
              interimTranscript += piece;
            }
          }
          if (finalTranscript) {
            dictationBaseTextRef.current = (dictationBaseTextRef.current ? dictationBaseTextRef.current + ' ' : '') + finalTranscript.trim();
          }
          const fullDisplay = (dictationBaseTextRef.current + (interimTranscript ? ' ' + interimTranscript.trim() : '')).trim();
          setNewNoteText(fullDisplay);
        };

        recognition.onerror = (err) => {
          console.error('[SpeechRecognition] Error:', err);
          setIsDictating(false);
        };

        recognition.onend = () => {
          setIsDictating(false);
        };

        recognition.start();
        recognitionRef.current = recognition;
        setIsDictating(true);
      } catch (e) {
        console.error('[SpeechRecognition] Init error:', e);
        setIsDictating(false);
      }
    }
  };

  const handleSaveManualNote = (e) => {
    if (e) e.preventDefault();
    if (!newNoteText.trim()) return;

    if (isDictating && recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) {}
      setIsDictating(false);
    }
    dictationBaseTextRef.current = '';

    const targetSecs = Math.floor(videoCurrentTime || 0);
    const noteObj = {
      id: 'note_' + Date.now(),
      courseId: lesson?.courseId || '',
      courseTitle: lesson?.courseTitle || COURSE?.title || 'Current Course',
      chapterTitle: lesson?.chapterTitle || lesson?.chapter || 'Chapter',
      lessonId: lesson?.id || lesson?.lessonId || '',
      lessonTitle: lesson?.title || 'Lesson',
      videoId: extractYoutubeId(lesson?.vid) || '',
      timestampSeconds: targetSecs,
      timestampFormatted: formatTimestamp(targetSecs),
      noteText: newNoteText.trim(),
      topic: lesson?.topic || lesson?.title || '',
      source: isDictating ? 'dictated' : 'manual',
      createdAt: new Date().toISOString()
    };

    setNotes(prev => {
      const updated = [noteObj, ...prev];
      try { localStorage.setItem(storageKey, JSON.stringify(updated)); } catch (_) {}
      return updated;
    });

    if (saveStudyNote) {
      saveStudyNote(noteObj);
    }
    setNewNoteText('');
  };

  const handleDeleteNoteById = (noteId) => {
    setNotes(prev => {
      const updated = prev.filter(n => n.id !== noteId);
      try { localStorage.setItem(storageKey, JSON.stringify(updated)); } catch (_) {}
      return updated;
    });
    if (deleteStudyNote) {
      deleteStudyNote(noteId);
    }
  };

  const handleDownloadNote = (note) => {
    if (!note) return;
    const title = note.lessonTitle || lesson?.title || 'Lesson Note';
    const cTitle = note.courseTitle || lesson?.courseTitle || COURSE?.title || 'Course';
    const ts = note.timestampFormatted || '00:00';
    const dateStr = note.createdAt ? new Date(note.createdAt).toLocaleString() : new Date().toLocaleString();
    const topicStr = note.topic ? `Topic:     ${note.topic}\n` : '';
    
    const content = `================================================================================
VEDIKA STUDY NOTE (.txt)
================================================================================
Course:    ${cTitle}
Lesson:    ${title}
Timestamp: ${ts}
Date:      ${dateStr}
${topicStr}Source:    ${note.source === 'vedika_voice' ? 'Vedika Voice Assistant' : note.source === 'dictated' ? 'Voice Dictation' : 'Manual Entry'}
--------------------------------------------------------------------------------
NOTE CONTENT:
--------------------------------------------------------------------------------
${note.noteText}
================================================================================
`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const cleanLesson = (title).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
    const cleanTs = ts.replace(':', 'm') + 's';
    a.download = `Vedika_Note_${cleanLesson}_${cleanTs}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadAllNotes = (displayedNotes) => {
    const listToExport = displayedNotes && displayedNotes.length > 0 ? displayedNotes : notes;
    if (!listToExport || listToExport.length === 0) {
      alert("No notes available to export.");
      return;
    }

    const cTitle = lesson?.courseTitle || COURSE?.title || 'Course';
    const lTitle = lesson?.title || 'Lesson';

    let content = `================================================================================
VEDIKA STUDY NOTEBOOK EXPORT
Course: ${cTitle}
Export Date: ${new Date().toLocaleString()}
Total Notes: ${listToExport.length}
================================================================================\n\n`;

    listToExport.forEach((n, idx) => {
      content += `[Note #${idx + 1}]  Timestamp: ${n.timestampFormatted || '00:00'}  |  Lesson: ${n.lessonTitle || lTitle}\n`;
      if (n.topic) content += `Topic: ${n.topic}\n`;
      content += `Source: ${n.source || 'manual'} | Recorded: ${n.createdAt ? new Date(n.createdAt).toLocaleString() : 'N/A'}\n`;
      content += `--------------------------------------------------------------------------------\n`;
      content += `${n.noteText}\n\n`;
      content += `================================================================================\n\n`;
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const cleanName = (noteFilter === 'course' ? cTitle : lTitle).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
    a.download = `Vedika_Notebook_${cleanName}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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
    setActiveCompanionTab('qa');
    setChatHistory(prev => [...prev, { role: 'user', text: q }]);
    setChatLoading(true);
    try {
      const res = await fetch('/api/youtube/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: extractYoutubeId(lesson.vid),
          timestamp: Math.floor(videoCurrentTime || 0),
          title: lesson.title,
          question: q,
          history: chatHistory
        })
      });
      const data = await res.json();
      const ans = data?.answer || "I evaluated the lesson video and provided key details above.";
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

  // Official Quizzes states
  const [officialQuiz, setOfficialQuiz] = useState(null);
  const [quizAttempts, setQuizAttempts] = useState([]);
  
  // Official Quiz Attempt State
  const [isOfficialQuizActive, setIsOfficialQuizActive] = useState(false);
  const [officialQuizIdx, setOfficialQuizIdx] = useState(0);
  const [officialQuizAnswers, setOfficialQuizAnswers] = useState([]);
  const [officialQuizScore, setOfficialQuizScore] = useState(null);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);

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

  // Fetch official quizzes and student submissions
  useEffect(() => {
    if (!currentUser) return;

    async function loadOfficialLmsData() {
      try {
        const [quizzes, quizSubs] = await Promise.all([
          getQuizzes(),
          getQuizSubmissions()
        ]);

        // Find official quiz linked to this lesson (or course)
        const linkedQuiz = quizzes.find(q => q.lesson === lesson.id || (q.course === lesson.courseId && !q.lesson));
        setOfficialQuiz(linkedQuiz || null);

        // Filter quiz attempts for this student & quiz
        if (linkedQuiz) {
          const userAttempts = quizSubs.filter(s => s.quiz === linkedQuiz.id && s.member === currentUser.username);
          setQuizAttempts(userAttempts);
        }
      } catch (e) {
        console.error("Failed to load official quiz data:", e);
      }
    }

    loadOfficialLmsData();
    
    // Reset attempt states when lesson changes
    setIsOfficialQuizActive(false);
    setOfficialQuizIdx(0);
    setOfficialQuizAnswers([]);
    setOfficialQuizScore(null);
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

  const outerStyle = { padding: `32px ${rPad}px`, maxWidth: 900, fontFamily: 'var(--font-outfit), sans-serif', margin: '0 auto' };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      height: '100%',
      maxHeight: '100%',
      overflow: 'hidden',
      background: T.bg
    }}>
      <div style={{
        width: '100%',
        height: '100%',
        padding: isMobile ? '10px 12px' : '12px 24px',
        display: 'flex',
        flexDirection: 'column',
        overflow: isMobile ? 'auto' : 'hidden',
        boxSizing: 'border-box'
      }} className="no-scrollbar">
        {/* Top Action Bar: Navigation, Overview, PDF, Playground & Progress Actions */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: isMobile ? 8 : 10,
          flexWrap: 'wrap',
          gap: 8,
          flexShrink: 0
        }}>
          {/* Left: Back to Course & Overview */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => router.push('/courses')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: T.muted, cursor: 'pointer', fontSize: 13, padding: 0 }}>
              <ArrowLeft size={15} /> Back to Course
            </button>
            <span style={{ color: 'var(--border)', opacity: 0.6, fontSize: 13, userSelect: 'none' }}>•</span>
            <button
              id="lesson-overview-btn"
              type="button"
              onClick={() => setIsOverviewModalOpen(true)}
              className="lesson-overview-trigger-btn"
              title="View lesson overview and key takeaways"
            >
              <Info size={13.5} />
              <span>Overview</span>
            </button>

            {lesson.pdf && (
              <>
                <span style={{ color: 'var(--border)', opacity: 0.6, fontSize: 13, userSelect: 'none' }}>•</span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPdfResource({ file_link: lesson.pdf, name: `${lesson.title} Reference PDF` });
                    setIsPdfViewerOpen(true);
                  }}
                  className="lesson-overview-trigger-btn"
                  title="View attached reference PDF material"
                  style={{
                    borderColor: 'rgba(91, 140, 248, 0.4)',
                    background: 'rgba(91, 140, 248, 0.08)',
                    color: T.accent
                  }}
                >
                  <FileText size={13.5} />
                  <span>Reference PDF</span>
                </button>
              </>
            )}
          </div>
          
          {/* Right: Practice Playground, Mark Complete, Next Lesson */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              data-practice-trigger="true"
              onClick={(e) => {
                if (typeof window !== 'undefined') {
                  const r = e.currentTarget.getBoundingClientRect();
                  window.__lastPracticeTriggerRect = { left: r.left, top: r.top, width: r.width, height: r.height };
                }
                setIsPlaygroundOpen(!isPlaygroundOpen);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: isPlaygroundOpen ? `${T.accent}15` : 'transparent',
                border: `1px solid ${isPlaygroundOpen ? T.accent : 'var(--border)'}`,
                color: isPlaygroundOpen ? T.accent : 'var(--text)',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
                padding: '5px 12px',
                borderRadius: 8,
                transition: 'all 0.15s'
              }}
            >
              <Terminal size={13} />
              {isPlaygroundOpen ? 'Close Playground' : 'Practice Playground'}
            </button>

            {completed[lesson.id] ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                color: T.green,
                fontSize: 12,
                fontWeight: 600,
                background: `${T.green}14`,
                border: `1px solid ${T.green}30`,
                padding: '4px 10px',
                borderRadius: 8
              }}>
                <CheckCircle size={13} /> Completed
              </div>
            ) : (
              <button
                onClick={() => onComplete(lesson.id)}
                style={{
                  background: T.green,
                  color: '#000',
                  border: 'none',
                  padding: '5px 12px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)',
                  transition: 'opacity 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                <CheckCircle size={13} /> Mark Complete
              </button>
            )}

            {next && (
              <button
                onClick={() => router.push(`/lesson/${next.id}`)}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: `1px solid var(--border)`,
                  color: 'var(--text)',
                  padding: '5px 12px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  maxWidth: 160,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  transition: 'background 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                title={`Next: ${next.title}`}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>Next: {next.title}</span>
                <ChevronRight size={13} style={{ flexShrink: 0 }} />
              </button>
            )}
          </div>
        </div>

      {/* Video & AI Companion Side-by-Side Split Layout (Zero-Scroll Flex Containment) */}
      {extractYoutubeId(lesson?.vid) ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1.22fr) minmax(0, 1fr)',
          gap: 16,
          marginBottom: 0,
          flex: 1,
          minHeight: 0,
          alignItems: 'stretch',
          width: '100%',
          overflow: 'hidden'
        }}>
          {/* Left Column: Video Player Card with Integrated Header */}
          <div 
            ref={videoCardRef}
            style={{
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 14,
              border: `1px solid ${T.border}`,
              background: T.s1,
              boxShadow: '0 8px 30px -6px rgba(0, 0, 0, 0.4)',
              overflow: 'hidden',
              height: '100%',
              minHeight: 0
          }}>
            {/* Integrated Header inside Left Box */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 18px',
              borderBottom: `1px solid ${T.border}`,
              background: T.s2,
              gap: 12
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                {mod?.title && (
                  <span style={{
                    fontSize: 11.5,
                    color: mod?.accent || T.accent,
                    background: `${mod?.accent || T.accent}15`,
                    padding: '3px 9px',
                    borderRadius: 12,
                    fontWeight: 600,
                    whiteSpace: 'nowrap'
                  }}>
                    {mod?.emoji} {mod?.title}
                  </span>
                )}
                <h3 style={{
                  color: T.text,
                  fontSize: 14.5,
                  fontWeight: 700,
                  margin: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {lesson.title}
                </h3>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <span style={{
                  fontSize: 11,
                  background: `${T.accent}15`,
                  color: T.accent,
                  padding: '2px 9px',
                  borderRadius: 20,
                  border: `1px solid ${T.accent}30`,
                  fontWeight: 600
                }}>
                  YouTube Lesson
                </span>
                <span style={{
                  color: T.muted,
                  fontSize: 11.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}>
                  <Clock size={12} /> {lesson.dur}
                </span>
              </div>
            </div>

            {/* Video Player Canvas & Minimalist Controls */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <VideoPlayerWithAI
                videoId={extractYoutubeId(lesson.vid)}
                onTimeUpdate={(secs) => {
                  setVideoCurrentTime(secs);
                }}
                onExplainRequested={(secs) => {
                  setActiveCompanionTab('ask_vedika');
                  handleAskVedikaPetMoment(secs);
                }}
                seekTime={videoSeekTime}
                onSeekComplete={() => setVideoSeekTime(null)}
                forcePause={forcePause}
              />
            </div>
          </div>

          {/* Right Column: AI Companion Panel (Matching Height Box) */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 14,
            border: `1px solid ${T.border}`,
            background: T.s1,
            padding: 12,
            color: T.text,
            boxShadow: '0 8px 30px -6px rgba(0, 0, 0, 0.4)',
            gap: 10,
            height: isMobile ? 'auto' : '100%',
            maxHeight: isMobile ? 'none' : '100%',
            minHeight: 0,
            overflow: 'hidden'
          }}>
            {/* Top Tab Bar: 4 Interactive Companion Avatar Tabs */}
            <CompanionAvatarTabs
              activeTab={activeCompanionTab}
              onSelectTab={setActiveCompanionTab}
              notesCount={notes.length}
              qaCount={chatHistory.length}
            />

            {/* Real-time Voice Note Saved Alert */}
            {recentNoteAlert && activeCompanionTab !== 'notes' && (
              <div className="vedika-note-toast-banner">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                  <span>🎙️</span>
                  <span style={{ fontWeight: 600, color: '#FCD34D' }}>Vedika Note ({recentNoteAlert.timestampFormatted || '00:00'}):</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: 0.9 }}>
                    {recentNoteAlert.noteText}
                  </span>
                </div>
                <button
                  type="button"
                  className="vedika-note-toast-action"
                  onClick={() => {
                    setActiveCompanionTab('notes');
                    setRecentNoteAlert(null);
                  }}
                >
                  View in Notes
                </button>
              </div>
            )}

            {/* Tab 1 Content: Ask Vedika (Desktop Pet Bridge) */}
            {activeCompanionTab === 'ask_vedika' && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                flex: 1,
                overflowY: 'auto',
                minHeight: 0
              }}>
                {/* Paused Video Moment Context Card */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  padding: 14,
                  borderRadius: 12,
                  background: T.s2,
                  border: `1px solid ${T.border}`
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '3px 10px',
                      borderRadius: 20,
                      fontSize: 11,
                      fontWeight: 600,
                      background: `${T.amber || '#F59E0B'}18`,
                      color: T.amber || '#D97706',
                      border: `1px solid ${(T.amber || '#F59E0B')}30`
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.amber || '#F59E0B' }} />
                      <span>Paused at {formatTimestamp(videoCurrentTime)}</span>
                    </div>
                    <span style={{ fontSize: 11, color: T.muted }}>{lesson.dur} lesson</span>
                  </div>

                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 3 }}>
                      {lesson.title}
                    </div>
                    <p style={{ fontSize: 11.5, color: T.muted, lineHeight: 1.5, margin: 0 }}>
                      {lesson.overview ? lesson.overview.slice(0, 160) + '...' : 'Pause the video at any moment to let Vedika break down the concept.'}
                    </p>
                  </div>
                </div>

                {/* Main Action Button: Ask Vedika to Explain */}
                <button
                  type="button"
                  onClick={() => handleAskVedikaPetMoment(videoCurrentTime)}
                  style={{
                    width: '100%',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    borderRadius: 12,
                    background: T.accent,
                    padding: '12px 18px',
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#FFFFFF',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: `0 6px 18px -2px ${T.accent}50`,
                    transition: 'all 0.15s'
                  }}
                >
                  <Bot size={16} style={{ color: '#FCD34D' }} />
                  <span>
                    {petMomentStatus === 'sending' ? 'Summoning Vedika...' : `Ask Vedika (Explain at ${formatTimestamp(videoCurrentTime)})`}
                  </span>
                </button>

                {/* Voice & Note-Taking Pro-Tip Card */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  padding: 12,
                  borderRadius: 12,
                  background: `${T.accent}08`,
                  border: `1px dashed ${T.accent}30`,
                  fontSize: 11.5,
                  color: T.muted,
                  lineHeight: 1.5
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: T.text, fontWeight: 600, fontSize: 12 }}>
                    <HelpCircle size={14} style={{ color: T.accent }} />
                    <span>How Voice Explanations & Notes Work:</span>
                  </div>
                  <div>
                    • Click <strong>Ask Vedika</strong> when you pause the video. She automatically checks what is being taught at that second.
                  </div>
                  <div>
                    • Vedika will ask what part feels tricky and explain it Socratically in voice.
                  </div>
                  <div style={{ color: T.text, fontWeight: 500 }}>
                    • <strong>Voice Notes:</strong> Simply tell Vedika <em>"Note this down"</em> or <em>"Add this to my notes"</em> and she will automatically save key points into your <strong>Personal Notes</strong> with the exact timestamp!
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2 Content: Personal Study Notepad (Full Height) */}
            {activeCompanionTab === 'notes' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minHeight: 0 }}>
                {/* Filter Tabs: This Lesson vs All Course Notes */}
                <div className="vedika-notes-filters">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button
                      type="button"
                      className={`vedika-notes-filter-btn ${noteFilter === 'lesson' ? 'active' : ''}`}
                      onClick={() => setNoteFilter('lesson')}
                    >
                      <span>This Lesson</span>
                      <span className="vedika-notes-filter-count">{notes.length}</span>
                    </button>
                    <button
                      type="button"
                      className={`vedika-notes-filter-btn ${noteFilter === 'course' ? 'active' : ''}`}
                      onClick={() => setNoteFilter('course')}
                    >
                      <span>All Course Notes</span>
                      <span className="vedika-notes-filter-count">{allCourseNotes.length || notes.length}</span>
                    </button>
                  </div>

                  {((noteFilter === 'lesson' ? notes : (allCourseNotes.length > 0 ? allCourseNotes : notes)).length > 0) && (
                    <button
                      type="button"
                      onClick={() => handleDownloadAllNotes(noteFilter === 'lesson' ? notes : (allCourseNotes.length > 0 ? allCourseNotes : notes))}
                      title="Export notes as .txt"
                      className="vedika-notes-export-btn"
                    >
                      <Download size={12} />
                      <span>Export .txt</span>
                    </button>
                  )}
                </div>

                {/* Note Composer Bar */}
                <form onSubmit={handleSaveManualNote} className="vedika-notes-composer">
                  <input
                    type="text"
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    placeholder={isDictating ? "Listening... Speak your note now!" : `Add note at ${formatTimestamp(videoCurrentTime)}...`}
                    className={`vedika-notes-input ${isDictating ? 'dictating' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={handleToggleDictation}
                    title={isDictating ? "Stop voice dictation" : "Dictate note with microphone"}
                    className={`vedika-notes-dictate-btn ${isDictating ? 'active' : ''}`}
                  >
                    {isDictating ? <MicOff size={15} className="animate-pulse" /> : <Mic size={15} />}
                  </button>
                  <button
                    type="submit"
                    disabled={!newNoteText.trim()}
                    className="vedika-notes-add-btn"
                  >
                    <Plus size={14} />
                    <span>Add</span>
                  </button>
                </form>

                {/* Notes List with Rich Metadata and Clickable Timestamps for Quick Revision */}
                <div className="vedika-notes-scroll-list">
                  {(() => {
                    const displayedNotes = noteFilter === 'lesson' 
                      ? notes 
                      : (allCourseNotes.length > 0 ? allCourseNotes : notes);

                    if (displayedNotes.length === 0) {
                      return (
                        <div className="vedika-notes-empty">
                          <div className="vedika-notes-empty-icon">
                            <BookMarked size={18} />
                          </div>
                          <div style={{ fontWeight: 600, color: T.text }}>
                            {noteFilter === 'lesson' ? 'No notes recorded for this lesson yet.' : 'No notes recorded in this course yet.'}
                          </div>
                          <span style={{ fontSize: 11, color: T.muted, maxWidth: 280, lineHeight: 1.4 }}>
                            Tell Vedika <em>"Note this down"</em> or <em>"Add this to my notes"</em> in voice, dictate with the mic, or type above!
                          </span>
                        </div>
                      );
                    }

                    return displayedNotes.map((note) => {
                      const isHighlighted = recentNoteAlert?.id === note.id;
                      const formattedDate = note.createdAt 
                        ? (() => {
                            try {
                              const d = new Date(note.createdAt);
                              return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            } catch (_) {
                              return '';
                            }
                          })()
                        : '';

                      return (
                        <div
                          key={note.id || `${note.timestampFormatted}_${note.noteText}`}
                          className={`vedika-note-card ${isHighlighted ? 'highlight' : ''}`}
                        >
                          {/* Note Card Header with Metadata */}
                          <div className="vedika-note-header">
                            <div className="vedika-note-header-left">
                              {/* Clickable timestamp pill to jump video */}
                              <button
                                type="button"
                                onClick={() => setVideoSeekTime(note.timestampSeconds || 0)}
                                className="vedika-note-timestamp-btn"
                                title="Click to jump video to this revision moment"
                              >
                                <Clock size={11} />
                                <span>{note.timestampFormatted || '00:00'}</span>
                              </button>

                              {/* Source badge */}
                              <span className={`vedika-note-source-badge ${note.source === 'vedika_voice' ? 'voice' : ''}`}>
                                {note.source === 'vedika_voice' ? '🎙️ Vedika Voice' : note.source === 'dictated' ? '🗣️ Dictated' : '✍️ Manual'}
                              </span>

                              {/* Course & Lesson title badge */}
                              {(note.lessonTitle || lesson?.title) && (
                                <span className="vedika-note-meta-badge" title={`${note.courseTitle || 'Course'} • ${note.lessonTitle || lesson?.title}`}>
                                  <span>📖</span>
                                  <span>{note.lessonTitle || lesson?.title}</span>
                                </span>
                              )}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <button
                                type="button"
                                onClick={() => handleDownloadNote(note)}
                                title="Download note (.txt)"
                                className="vedika-note-download-btn"
                              >
                                <Download size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteNoteById(note.id)}
                                title="Delete note"
                                className="vedika-note-delete-btn"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>

                          {/* Note Body Text */}
                          <div className="vedika-note-body">
                            {note.noteText}
                          </div>

                          {/* Note Card Footer with Revise Action & Timestamp */}
                          <div className="vedika-note-footer">
                            <span>{formattedDate || (note.topic ? `Topic: ${note.topic}` : 'Study note')}</span>
                            <button
                              type="button"
                              className="vedika-note-revise-action"
                              onClick={() => setVideoSeekTime(note.timestampSeconds || 0)}
                              title="Jump video directly to this moment to revise"
                            >
                              <Play size={10} style={{ fill: 'currentColor' }} />
                              <span>Revise at {note.timestampFormatted || '00:00'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}

            {/* Tab 3 Content: Lesson Q&A (Full Height) */}
            {activeCompanionTab === 'qa' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minHeight: 0 }}>
                {/* Chat Messages History (Fills Remaining Height) */}
                <div style={{
                  flex: 1,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  padding: '10px 12px',
                  borderRadius: 12,
                  background: T.s2,
                  border: `1px solid ${T.border}`,
                  fontSize: 12,
                  minHeight: 0
                }}>
                  {chatHistory.length === 0 ? (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '100%',
                      color: T.muted,
                      textAlign: 'center',
                      gap: 6
                    }}>
                      <Brain size={24} style={{ color: T.accent, opacity: 0.8 }} />
                      <span style={{ fontWeight: 600, color: T.text, fontSize: 13 }}>Ask about this video lesson</span>
                      <span style={{ fontSize: 11, maxWidth: 260 }}>
                        Ask any question about concepts, code examples, or timestamps covered in this video.
                      </span>
                    </div>
                  ) : (
                    chatHistory.map((msg, idx) => (
                      <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                        <div style={{
                          padding: '8px 12px',
                          borderRadius: 12,
                          maxWidth: '85%',
                          fontSize: 12,
                          lineHeight: 1.45,
                          background: msg.role === 'user' ? T.accent : T.s1,
                          color: msg.role === 'user' ? '#FFFFFF' : T.text,
                          border: msg.role === 'user' ? 'none' : `1px solid ${T.border}`,
                          boxShadow: msg.role === 'user' ? `0 2px 6px ${T.accent}30` : 'none',
                          whiteSpace: 'pre-line'
                        }}>
                          {msg.text}
                        </div>
                      </div>
                    ))
                  )}
                  {chatLoading && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: T.accent, padding: '4px 2px' }}>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Vedika is thinking...</span>
                    </div>
                  )}
                </div>

                {/* Question Input Form at Bottom */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAskQuestion(chatQuestion);
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
                >
                  <input
                    type="text"
                    value={chatQuestion}
                    onChange={(e) => setChatQuestion(e.target.value)}
                    placeholder="Ask a question about this video..."
                    style={{
                      flex: 1,
                      borderRadius: 10,
                      background: T.s2,
                      border: `1px solid ${T.border}`,
                      padding: '8px 12px',
                      fontSize: 12,
                      color: T.text,
                      outline: 'none'
                    }}
                  />
                  <button
                    type="submit"
                    disabled={chatLoading || !chatQuestion.trim()}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 10,
                      background: T.accent,
                      padding: '8px 14px',
                      color: '#FFFFFF',
                      border: 'none',
                      cursor: 'pointer',
                      opacity: chatLoading || !chatQuestion.trim() ? 0.6 : 1,
                      boxShadow: `0 2px 6px ${T.accent}30`
                    }}
                  >
                    <Send size={14} />
                  </button>
                </form>
              </div>
            )}

            {/* Tab 4 Content: Interactive AI Practice Quiz */}
            {activeCompanionTab === 'quiz' && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                flex: 1,
                overflowY: 'auto',
                minHeight: 0
              }}>
                {/* Header Card */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: 12,
                  background: T.s2,
                  border: `1px solid ${T.border}`
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8,
                      background: 'rgba(168, 85, 247, 0.15)',
                      border: '1px solid rgba(168, 85, 247, 0.3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <Brain size={15} color={T.purple} />
                    </div>
                    <div>
                      <div style={{ color: T.text, fontSize: 13, fontWeight: 700, lineHeight: 1.2 }}>
                        Practice Quiz
                      </div>
                      <div style={{ color: T.muted, fontSize: 11 }}>
                        AI Generated Questions
                      </div>
                    </div>
                  </div>
                </div>

                {/* Loading State */}
                {aiLoading && (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '36px 16px',
                    gap: 10,
                    textAlign: 'center'
                  }}>
                    <Loader2 size={24} color={T.purple} style={{ animation: 'spin 1s linear infinite' }} />
                    <span style={{ fontSize: 12.5, color: T.muted }}>
                      Generating tailored quiz questions for this lesson...
                    </span>
                  </div>
                )}

                {/* Error State */}
                {aiErr && (
                  <div style={{
                    color: T.red,
                    fontSize: 12,
                    background: `${T.red}12`,
                    border: `1px solid ${T.red}25`,
                    padding: '10px 14px',
                    borderRadius: 8
                  }}>
                    ⚠️ {aiErr}
                  </div>
                )}

                {/* Empty State before generating */}
                {!aiQuiz && !aiLoading && !aiErr && (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flex: 1,
                    textAlign: 'center',
                    padding: 20,
                    gap: 12
                  }}>
                    <div style={{
                      width: 48,
                      height: 48,
                      borderRadius: 14,
                      background: 'rgba(168, 85, 247, 0.12)',
                      border: '1px solid rgba(168, 85, 247, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Brain size={24} color={T.purple} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 4 }}>
                        Test Your Understanding
                      </div>
                      <p style={{ fontSize: 12, color: T.muted, maxWidth: 260, margin: 0, lineHeight: 1.5 }}>
                        Generate an instant interactive quiz based on this video's topics to practice key concepts.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleGenerateQuiz}
                      style={{
                        background: T.purple,
                        color: '#fff',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: 10,
                        fontSize: 12.5,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 7,
                        boxShadow: '0 4px 14px rgba(168, 85, 247, 0.3)'
                      }}
                    >
                      <Brain size={14} /> Start Practice Quiz
                    </button>
                  </div>
                )}

                {/* Active Quiz Questions */}
                {aiQuiz && aiQuiz.quizQuestions?.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                    {(() => {
                      const q = aiQuiz.quizQuestions[aiQuizIdx];
                      const totalQ = aiQuiz.quizQuestions.length;
                      return q ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 11.5, color: T.muted, fontWeight: 600 }}>
                              Question {aiQuizIdx + 1} of {totalQ}
                            </span>
                            <button
                              type="button"
                              onClick={() => { setAiQuizIdx(0); setAiQuizAns(null); }}
                              style={{
                                background: 'transparent',
                                border: `1px solid ${T.border}`,
                                color: T.muted,
                                borderRadius: 6,
                                padding: '3px 8px',
                                fontSize: 11,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4
                              }}
                            >
                              <RotateCcw size={10} /> Reset
                            </button>
                          </div>

                          {/* Progress indicator */}
                          <div style={{ height: 4, background: T.s3, borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{
                              height: '100%',
                              width: `${((aiQuizIdx + 1) / totalQ) * 100}%`,
                              background: T.purple,
                              borderRadius: 99,
                              transition: 'width 0.3s ease'
                            }} />
                          </div>

                          {/* Question Text */}
                          <div style={{
                            color: T.text,
                            fontSize: 12.5,
                            fontWeight: 600,
                            lineHeight: 1.5,
                            background: T.s2,
                            padding: 12,
                            borderRadius: 10,
                            border: `1px solid ${T.border}`
                          }}>
                            {q.question}
                          </div>

                          {/* Options */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {q.options.map((opt, oi) => {
                              const isSelected = aiQuizAns === oi;
                              const isCorrect  = oi === q.correct;
                              const showResult = aiQuizAns !== null;
                              let bg = T.s2, border = T.border, color = T.text;
                              if (showResult && isCorrect)  { bg = `${T.green}18`;  border = `${T.green}60`;  color = T.green; }
                              else if (showResult && isSelected) { bg = `${T.red}18`;   border = `${T.red}60`;   color = T.red; }
                              else if (!showResult && isSelected) { bg = `${T.purple}18`; border = `${T.purple}60`; color = T.purple; }
                              return (
                                <button
                                  key={oi}
                                  type="button"
                                  onClick={() => { if (aiQuizAns === null) setAiQuizAns(oi); }}
                                  disabled={aiQuizAns !== null}
                                  style={{
                                    background: bg,
                                    border: `1px solid ${border}`,
                                    borderRadius: 8,
                                    padding: '9px 12px',
                                    color,
                                    fontSize: 12,
                                    cursor: aiQuizAns !== null ? 'default' : 'pointer',
                                    textAlign: 'left',
                                    transition: 'all 0.15s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8
                                  }}
                                >
                                  <span style={{ fontWeight: 700, color: showResult && isCorrect ? T.green : T.purple }}>
                                    {'ABCD'[oi]}
                                  </span>
                                  <span style={{ flex: 1 }}>{opt}</span>
                                </button>
                              );
                            })}
                          </div>

                          {/* Result Feedback Banner */}
                          {aiQuizAns !== null && (
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '8px 12px',
                              borderRadius: 8,
                              background: aiQuizAns === q.correct ? `${T.green}15` : `${T.red}15`,
                              border: `1px solid ${aiQuizAns === q.correct ? T.green : T.red}30`,
                              marginTop: 4
                            }}>
                              <span style={{
                                fontSize: 11.5,
                                color: aiQuizAns === q.correct ? T.green : T.red,
                                fontWeight: 600
                              }}>
                                {aiQuizAns === q.correct ? '✓ Correct!' : `✗ Incorrect — Answer: ${'ABCD'[q.correct]}`}
                              </span>
                              {aiQuizIdx < totalQ - 1 ? (
                                <button
                                  type="button"
                                  onClick={() => { setAiQuizIdx(i => i + 1); setAiQuizAns(null); }}
                                  style={{
                                    background: T.purple,
                                    color: '#fff',
                                    border: 'none',
                                    padding: '5px 12px',
                                    borderRadius: 6,
                                    fontSize: 11.5,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4
                                  }}
                                >
                                  Next <ChevronRight size={12} />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={handleGenerateQuiz}
                                  style={{
                                    background: T.purple,
                                    color: '#fff',
                                    border: 'none',
                                    padding: '5px 12px',
                                    borderRadius: 6,
                                    fontSize: 11.5,
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                  }}
                                >
                                  New Quiz 🎯
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ) : null;
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : getYoutubeEmbedUrl(lesson?.vid) ? (
        <div style={{
          borderRadius: 14,
          overflow: 'hidden',
          border: `1px solid ${T.border}`,
          marginBottom: 0,
          position: 'relative',
          width: '100%',
          flex: 1,
          minHeight: 0,
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

      <PracticePlaygroundModal
        isOpen={isPlaygroundOpen}
        onClose={() => setIsPlaygroundOpen(false)}
        title={`Practice: ${lesson.title}`}
        badge="Python"
        initialCode={`# Practice Python for: ${lesson.title}\n# Write your code here\n\n`}
        codingExercise={lesson.codingExercise}
        onVerifySuccess={() => onComplete(lesson.id)}
      />
    </div>
    {/* PDF Viewer Modal */}
    <PDFViewerModal
      isOpen={isPdfViewerOpen}
      onClose={() => { setIsPdfViewerOpen(false); setSelectedPdfResource(null); }}
      pdfResource={selectedPdfResource}
    />

    {/* Lesson Overview & Key Points Modal */}
    {isOverviewModalOpen && (
      <div 
        className="lesson-overview-backdrop"
        onClick={() => setIsOverviewModalOpen(false)}
      >
        <div 
          className="lesson-overview-modal"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="lesson-overview-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: 'rgba(99, 102, 241, 0.12)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: T.accent || '#6366f1'
              }}>
                <BookOpen size={17} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: '#f8fafc' }}>
                    Lesson Overview
                  </h3>
                  {lesson?.dur && (
                    <span style={{
                      fontSize: 11,
                      color: T.muted,
                      background: 'rgba(255,255,255,0.06)',
                      padding: '1px 7px',
                      borderRadius: 999,
                      fontWeight: 500
                    }}>
                      {lesson.dur}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 12, color: T.muted, margin: '2px 0 0 0', maxWidth: 420, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {lesson?.title || 'Current Lesson'}
                </p>
              </div>
            </div>

            <button 
              className="lesson-overview-close-btn"
              onClick={() => setIsOverviewModalOpen(false)}
              aria-label="Close overview"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="lesson-overview-body no-scrollbar">
            {/* Overview Section */}
            <div className="lesson-overview-section">
              <div className="lesson-overview-section-title">
                <FileText size={15} style={{ color: T.accent || '#6366f1' }} />
                <span>Overview</span>
              </div>
              <p className="lesson-overview-text">
                {lesson?.overview || "Welcome to this lesson. Review the video instructions and practical tasks to master this subject."}
              </p>
            </div>

            {/* Key Points Section */}
            <div className="lesson-overview-section">
              <div className="lesson-overview-section-title">
                <Award size={15} style={{ color: '#10b981' }} />
                <span>Key Points & Takeaways</span>
              </div>
              {(() => {
                const points = Array.isArray(lesson?.pts)
                  ? lesson.pts
                  : typeof lesson?.pts === 'string'
                    ? lesson.pts.split('\n').map(p => p.trim()).filter(Boolean)
                    : [];

                if (points.length === 0) {
                  return (
                    <p style={{ fontSize: 13, color: T.muted, fontStyle: 'italic', margin: 0 }}>
                      No key points documented yet for this lesson.
                    </p>
                  );
                }

                return (
                  <ul className="lesson-keypoints-list">
                    {points.map((pt, idx) => (
                      <li key={idx} className="lesson-keypoint-item">
                        <span className="lesson-keypoint-badge">
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <span style={{ paddingTop: 2 }}>{pt}</span>
                      </li>
                    ))}
                  </ul>
                );
              })()}
            </div>
          </div>

          {/* Footer */}
          <div className="lesson-overview-footer">
            <button
              type="button"
              className="lesson-overview-done-btn"
              onClick={() => setIsOverviewModalOpen(false)}
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    )}

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
