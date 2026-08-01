'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Brain, Loader2, ChevronRight, Lock, FlipHorizontal,
  Paperclip, Mic, Image, HelpCircle, Send, AlignLeft, Sparkles, ChevronLeft,
  BookOpen, Code2, BarChart3, Home, Zap, Award, FileText, FolderOpen, Briefcase,
  Trash
} from 'lucide-react';
import {
  T, geminiCall,
  classifyIntent, evaluateMath, getGreetingResponse, getThanksResponse,
  buildChatPrompt, buildFeaturePrompt,
  parseQuizOutput, parseFlashcardsOutput, parseInfographicOutput,
  TUTOR_SYSTEM, QUIZ_SYSTEM, FLASHCARD_SYSTEM, INFOGRAPHIC_SYSTEM, SIMPLER_SYSTEM, EXAMPLES_SYSTEM,
  MAX_TOKENS
} from '@/lib/lms-data';
import VoiceAgentView from '@/components/voice-tutor/VoiceAgentView';
import { getJwtToken } from '@/lib/jwtCache';
import MobileNav from '@/components/MobileNav';
import { useMediaQuery, isMobileMQ } from '@/lib/useMediaQuery';

const MODES = ['Beginner', 'Exam', 'Interview', 'Revision'];
const LENGTHS = ['Short', 'Medium', 'Deep'];
const modeColors = { Beginner: T.green, Exam: T.accent, Interview: T.amber, Revision: T.purple };

const NAV = [
  { id: '/',              Icon: Home,          label: 'Dashboard'     },
  { id: '/courses',       Icon: BookOpen,      label: 'Courses'       },
  { id: '/quizzes',       Icon: Award,         label: 'Quizzes'       },
  { id: '/assignments',   Icon: FileText,      label: 'Assignments'   },
  { id: '/resources',     Icon: FolderOpen,    label: 'Resources'     },
  { id: '/general-tutor', Icon: Brain,         label: 'Ask your AI Tutor' },
  { id: '/coding-tutor',  Icon: Code2,         label: 'Code with AI Tutor'  },
  { id: '/jobs',          Icon: Briefcase,     label: 'Jobs'          },
  { id: '/progress',      Icon: BarChart3,     label: 'Progress'      },
];

const SUGGESTIONS = [
  { id: 'quiz', label: 'Quiz', Icon: HelpCircle, color: T.accent },
  { id: 'flashcards', label: 'Flashcards', Icon: FlipHorizontal, color: T.purple },
  { id: 'infographic', label: 'Visual Summary', Icon: Image, color: T.amber },
  { id: 'simpler', label: 'Explain Simpler', Icon: AlignLeft, color: T.green },
  { id: 'examples', label: 'Examples', Icon: Sparkles, color: T.accent },
];

const cleanMarkdown = (text) => {
  if (!text) return '';
  return text
    .replace(/\*\*\s+([^*]+?)\s+\*\*/g, '**$1**')
    .replace(/\*\*\s+([^*]+?)\*\*/g, '**$1**')
    .replace(/\*\*([^*]+?)\s+\*\*/g, '**$1**');
};

export default function GeneralTutor() {
  const [topic, setTopic] = useState('');
  const [mode, setMode] = useState('Beginner');
  const [length, setLength] = useState('Short');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [generating, setGenerating] = useState({ msgIdx: null, type: null });
  const [streamingText, setStreamingText] = useState('');
  const streamElRef = useRef(null);
  const [activeTab, setActiveTab] = useState('text'); // 'text' or 'voice'
  const [textSessions, setTextSessions] = useState([]);
  const [voiceSessions, setVoiceSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [voiceSessionToRestore, setVoiceSessionToRestore] = useState(null);
  
  const [jwtToken, setJwtToken] = useState(null);
  const [authenticating, setAuthenticating] = useState(true);
  const [sessionDocs, setSessionDocs] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState('');
  const fileInputRef = useRef(null);
  const sessionDocsRef = useRef([]);
  
  useEffect(() => {
    sessionDocsRef.current = sessionDocs;
  }, [sessionDocs]);

  const [showAtMenu, setShowAtMenu] = useState(false);
  const [availableDocs, setAvailableDocs] = useState([]);
  const [menuFilter, setMenuFilter] = useState('');
  const [atMenuIndex, setAtMenuIndex] = useState(0);

  const fetchAvailableDocs = useCallback(async () => {
    if (!jwtToken) return;
    const sid = currentSessionId || '';
    try {
      const res = await fetch(`/api/documents/list?sessionId=${sid}`, {
        headers: {
          'Authorization': `Bearer ${jwtToken}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setAvailableDocs(data.documents || []);
      }
    } catch (e) {
      console.error("Failed to fetch available docs:", e);
    }
  }, [jwtToken, currentSessionId]);

  useEffect(() => {
    if (jwtToken) {
      fetchAvailableDocs();
    }
  }, [jwtToken, fetchAvailableDocs]);

  const handleTextareaChange = (e) => {
    const val = e.target.value;
    setTopic(val);
    
    const selectionStart = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, selectionStart);
    const atIndex = textBeforeCursor.lastIndexOf('@');
    
    if (atIndex !== -1 && !textBeforeCursor.slice(atIndex).includes(' ')) {
      const query = textBeforeCursor.slice(atIndex + 1);
      setMenuFilter(query);
      setShowAtMenu(true);
      setAtMenuIndex(0);
      if (query === '') {
        fetchAvailableDocs();
      }
    } else {
      setShowAtMenu(false);
    }
  };

  const filteredDocs = useMemo(() => {
    if (!menuFilter) return availableDocs;
    return availableDocs.filter(d => d.name.toLowerCase().includes(menuFilter.toLowerCase()));
  }, [availableDocs, menuFilter]);

  const handleAttachDoc = async (doc) => {
    const sid = currentSessionId || Date.now().toString(36);
    if (!currentSessionId) setCurrentSessionId(sid);
    
    setUploading(true);
    setUploadErr('');
    setShowAtMenu(false);
    
    try {
      const res = await fetch('/api/documents/attach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`
        },
        body: JSON.stringify({
          file_name: doc.name,
          file_key: doc.file_key,
          sessionId: sid
        })
      });
      
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to attach document');
      }
      
      const data = await res.json();
      const newDoc = { id: data.documentId, name: doc.name, status: data.status };
      
      setSessionDocs(prev => {
        const updated = [...prev, newDoc];
        setTimeout(() => saveSession(messages, sid), 100);
        return updated;
      });
      
      if (inputRef.current) {
        const val = topic;
        const selectionStart = inputRef.current.selectionStart;
        const textBeforeCursor = val.slice(0, selectionStart);
        const atIndex = textBeforeCursor.lastIndexOf('@');
        if (atIndex !== -1) {
          const newVal = val.slice(0, atIndex) + val.slice(selectionStart);
          setTopic(newVal);
          setTimeout(() => {
            inputRef.current.focus();
            inputRef.current.selectionStart = atIndex;
            inputRef.current.selectionEnd = atIndex;
          }, 50);
        }
      }
    } catch (e) {
      console.error("Attach error:", e);
      setUploadErr(e.message || 'Error attaching document');
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    const fetchJwt = async () => {
      try {
        const token = await getJwtToken();
        setJwtToken(token);
        console.warn("[GeneralTutor] Successfully retrieved JWT token.");
      } catch (e) {
        console.error("Failed to load JWT token:", e);
      } finally {
        setAuthenticating(false);
      }
    };
    fetchJwt();
  }, []);
  const chatRef = useRef(null);
  const inputRef = useRef(null);
  const textSessKey = 'general-tutor-sessions';
  const voiceSessKey = 'voice-tutor-sessions';

  const [userId] = useState(() => {
    if (typeof window === 'undefined') return '';
    let id = localStorage.getItem('lms-user-id');
    if (!id) { id = 'user-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); localStorage.setItem('lms-user-id', id); }
    return id;
  });

  const isMobile = useMediaQuery(isMobileMQ);
  const rPad = isMobile ? 14 : 28;
  const rGap = isMobile ? 8 : 12;
  const msgMaxW = isMobile ? '100%' : 720;
  const bubbleMaxW = isMobile ? '100%' : 480;
  const fCol = isMobile ? '1fr' : '1fr 1fr';

  function getDateLabel(dateStr) {
    if (!dateStr) return 'Older';
    const date = new Date(dateStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    if (date >= today) return 'Today';
    if (date >= yesterday) return 'Yesterday';
    if (date >= weekStart) return 'This Week';
    return 'Older';
  }

  useEffect(() => {
    try {
      const raw1 = localStorage.getItem(textSessKey);
      if (raw1) setTextSessions(JSON.parse(raw1));
      const raw2 = localStorage.getItem(voiceSessKey);
      if (raw2) setVoiceSessions(JSON.parse(raw2));

      // Prefill query if coming from the dashboard quick-ask box
      const prefill = localStorage.getItem('tutor_prefill_query');
      if (prefill) {
        setTopic(prefill);
        localStorage.removeItem('tutor_prefill_query');
      }
    } catch {}
  }, []);

  // Auto-resize the input textarea height
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
    }
  }, [topic]);

  // Save currentSessionId to localStorage
  useEffect(() => {
    if (currentSessionId) {
      localStorage.setItem('current-general-tutor-session-id', currentSessionId);
    } else {
      localStorage.removeItem('current-general-tutor-session-id');
    }
  }, [currentSessionId]);

  // Synchronize state with Sidebar.jsx
  useEffect(() => {
    const event = new CustomEvent('tutor-state-update', {
      detail: {
        currentSessionId,
        textSessions,
        voiceSessions,
        type: 'general-tutor'
      }
    });
    window.dispatchEvent(event);
  }, [currentSessionId, textSessions, voiceSessions]);

  const mergedSessions = useMemo(() => {
    const text = (textSessions || []).map(s => ({ ...s, type: 'text' }));
    const voice = (voiceSessions || []).map(s => ({ ...s, type: 'voice' }));
    const all = [...text, ...voice];
    all.sort((a, b) => {
      const ta = new Date(a.timestamp || a.startedAt || 0).getTime();
      const tb = new Date(b.timestamp || b.startedAt || 0).getTime();
      return tb - ta;
    });
    return all;
  }, [textSessions, voiceSessions]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, streamingText]);

  const handleSelectSession = useCallback((session) => {
    if (session.type === 'voice') {
      setVoiceSessionToRestore(session);
      setShowVoiceAgent(true);
      return;
    }
    const msgs = (session.messages || []).map(m => ({
      ...m,
      features: m.features || {},
    }));
    setMessages(msgs);
    setMode(session.mode || 'Beginner');
    setLength(session.length || 'Short');
    setCurrentSessionId(session.id);
    setSessionDocs(session.documents || []);
    setErr(''); setTopic(''); setUploadErr('');
  }, []);

  // Handle click outside to close open feature cards
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (e.target.closest('[data-feature-container="true"]') || e.target.closest('[data-feature-button="true"]')) {
        return;
      }
      setMessages(prev => prev.map(m => m.activeFeature ? { ...m, activeFeature: null } : m));
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Listen to events from the sidebar
  useEffect(() => {
    const handleSelect = (e) => {
      handleSelectSession(e.detail);
    };

    const handleNew = () => {
      setMessages([]);
      setCurrentSessionId(null);
      setSessionDocs([]);
      setTopic('');
      setErr('');
      setUploadErr('');
      setShowVoiceAgent(false);
      setVoiceSessionToRestore(null);
    };

    window.addEventListener('select-general-tutor-session', handleSelect);
    window.addEventListener('new-general-tutor-session', handleNew);

    return () => {
      window.removeEventListener('select-general-tutor-session', handleSelect);
      window.removeEventListener('new-general-tutor-session', handleNew);
    };
  }, [handleSelectSession]);

  const saveSession = useCallback((msgs, overrideSid) => {
    if (!msgs.some(m => m.role === 'ai')) return;
    const lastUserMsg = [...msgs].reverse().find(m => m.role === 'user');
    const label = lastUserMsg ? lastUserMsg.content.slice(0, 40) : 'Untitled';
    const sid = overrideSid || currentSessionId || Date.now().toString(36);
    const session = {
      id: sid, label, topic: label, mode, length,
      messages: msgs,
      documents: sessionDocsRef.current || [],
      timestamp: new Date().toISOString(),
    };
    const updated = [session, ...textSessions.filter(s => s.id !== sid)];
    setTextSessions(updated);
    setCurrentSessionId(sid);
    try { localStorage.setItem(textSessKey, JSON.stringify(updated)); } catch {}
  }, [mode, length, textSessions, currentSessionId, textSessKey]);

  const FEATURE_SYSTEMS = {
    quiz: QUIZ_SYSTEM, flashcards: FLASHCARD_SYSTEM, infographic: INFOGRAPHIC_SYSTEM,
    simpler: SIMPLER_SYSTEM, examples: EXAMPLES_SYSTEM,
  };

  const FEATURE_LABELS = {
    quiz: 'Quiz', flashcards: 'Flashcards', infographic: 'Visual Summary',
    simpler: 'Simplified Explanation', examples: 'Examples',
  };

  const trackStatusStream = useCallback((docId, token) => {
    const sseUrl = `/api/documents/status-stream?documentId=${docId}&token=${encodeURIComponent(token)}`;
    const sse = new EventSource(sseUrl);
    
    sse.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const status = data.status;
        
        setSessionDocs(prev => {
          const updated = prev.map(d => d.id === docId ? { ...d, status } : d);
          setTimeout(() => {
            const raw = localStorage.getItem(textSessKey);
            if (raw) {
              const sessions = JSON.parse(raw);
              const sid = currentSessionId || localStorage.getItem('current-general-tutor-session-id');
              const sessIdx = sessions.findIndex(s => s.id === sid);
              if (sessIdx !== -1) {
                sessions[sessIdx].documents = updated;
                localStorage.setItem(textSessKey, JSON.stringify(sessions));
                setTextSessions(sessions);
              }
            }
          }, 100);
          return updated;
        });
        
        if (status === 'completed' || status === 'failed') {
          sse.close();
        }
      } catch (e) {
        console.error("[SSE Status] Error parsing status event:", e);
      }
    };
    
    sse.onerror = () => {
      sse.close();
    };
  }, [currentSessionId, textSessKey]);

  useEffect(() => {
    if (jwtToken && sessionDocs.length > 0) {
      sessionDocs.forEach(d => {
        if (d.status === 'pending_ingestion' || d.status === 'processing') {
          trackStatusStream(d.id, jwtToken);
        }
      });
    }
  }, [jwtToken, sessionDocs.length]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      setUploadErr('Only PDF files are allowed.');
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      setUploadErr('File size cannot exceed 10MB.');
      return;
    }
    
    setUploading(true);
    setUploadErr('');
    
    const sid = currentSessionId || Date.now().toString(36);
    if (!currentSessionId) setCurrentSessionId(sid);
    
    try {
      let token = jwtToken || await getJwtToken().catch(() => null);
      if (token && !jwtToken) setJwtToken(token);
      
      if (!token) {
        throw new Error("Unable to obtain authenticated token. Please refresh.");
      }
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sessionId', sid);
      formData.append('courseId', 'general');
      
      const res = await fetch('/api/documents/upload', {
         method: 'POST',
         headers: {
           'Authorization': `Bearer ${token}`
         },
         body: formData
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to upload document.');
      }
      
      const data = await res.json();
      const newDoc = { id: data.documentId, name: file.name, status: data.status };
      
      setSessionDocs(prev => {
        const updated = [...prev, newDoc];
        setTimeout(() => saveSession(messages, sid), 100);
        return updated;
      });
      
      trackStatusStream(data.documentId, token);
    } catch (err) {
      console.error("Upload error:", err);
      setUploadErr(err.message || 'Error uploading document.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteDoc = async (docId) => {
    const sid = currentSessionId;
    if (!sid) return;
    
    try {
      let token = jwtToken || await getJwtToken().catch(() => null);
      if (token && !jwtToken) setJwtToken(token);
      
      const res = await fetch('/api/documents/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ documentId: docId, sessionId: sid })
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete document.');
      }
      
      setSessionDocs(prev => {
        const updated = prev.filter(d => d.id !== docId);
        setTimeout(() => saveSession(messages, sid), 100);
        return updated;
      });
    } catch (err) {
      console.error("Delete error:", err);
      setUploadErr(err.message || 'Error deleting document.');
    }
  };

  const handleLibraryDelete = async (docId) => {
    try {
      let token = jwtToken || await getJwtToken().catch(() => null);
      if (token && !jwtToken) setJwtToken(token);
      
      const res = await fetch('/api/documents/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ documentId: docId, sessionId: currentSessionId || 'general' })
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete');
      }
      
      setAvailableDocs(prev => prev.filter(d => d.id !== docId));
    } catch (err) {
      console.error("Library delete error:", err);
      setUploadErr(err.message || 'Error deleting from library');
    }
  };

  const handleSend = async () => {
    const raw = topic.trim();
    if (!raw) return;
    setTopic(''); setErr('');

    const sid = currentSessionId || Date.now().toString(36);
    if (!currentSessionId) setCurrentSessionId(sid);

    const intent = classifyIntent(raw);
    const userMsg = { id: Date.now().toString(36), role: 'user', content: raw, mode, length, documents: [...sessionDocs] };
    const msgsWithUser = [...messages, userMsg];
    setSessionDocs([]);

    if (intent.type === 'greeting') {
      const aiMsg = { id: (Date.now() + 1).toString(36), role: 'ai', content: getGreetingResponse(), local: true, features: {} };
      const next = [...msgsWithUser, aiMsg];
      setMessages(next); saveSession(next, sid);
      return;
    }

    if (intent.type === 'thanks') {
      const aiMsg = { id: (Date.now() + 1).toString(36), role: 'ai', content: getThanksResponse(), local: true, features: {} };
      const next = [...msgsWithUser, aiMsg];
      setMessages(next); saveSession(next, sid);
      return;
    }

    if (intent.type === 'math') {
      const result = evaluateMath(intent.expression);
      const aiMsg = { id: (Date.now() + 1).toString(36), role: 'ai', content: `**${intent.expression}** = ${result}`, local: true, features: {} };
      const next = [...msgsWithUser, aiMsg];
      setMessages(next); saveSession(next, sid);
      return;
    }

    if (intent.type === 'feature') {
      setMessages(msgsWithUser);
      setLoading(true);
      try {
        const tokens = MAX_TOKENS[length.toLowerCase()] || 2000;
        const prompt = buildFeaturePrompt(intent.feature, intent.topic, mode);
        const system = FEATURE_SYSTEMS[intent.feature] || TUTOR_SYSTEM;
        const text = await geminiCall(system, prompt, tokens, { sessionId: sid, userId });
        if (!text.trim()) throw new Error('Gemini returned an empty response. Try rephrasing.');
        const features = {};
        if (intent.feature === 'quiz') features.quiz = { questions: parseQuizOutput(text), currentIdx: 0, currentAnswer: null };
        else if (intent.feature === 'flashcards') features.flashcards = { cards: parseFlashcardsOutput(text), currentIdx: 0, flipped: false };
        else if (intent.feature === 'infographic') features.infographic = { points: parseInfographicOutput(text) };
        else if (intent.feature === 'simpler') features.simpler = { text };
        else if (intent.feature === 'examples') features.examples = { text };
        const label = FEATURE_LABELS[intent.feature] || 'response';
        const aiMsg = { id: (Date.now() + 1).toString(36), role: 'ai', content: `Here's a ${label} on ${intent.topic}:`, features };
        const next = [...msgsWithUser, aiMsg];
        setMessages(next); saveSession(next, sid);
      } catch (e) {
        setErr(e.message || 'Error generating feature.');
      } finally {
        setLoading(false);
      }
      return;
    }

    setMessages(msgsWithUser);
    setStreamingText(' ');
    setLoading(true);

    try {
      const tokens = MAX_TOKENS[length.toLowerCase()] || 800;
      const prompt = buildChatPrompt(raw, mode, length);
      const targetEndpoint = jwtToken ? '/api/tutor/chat/stream' : '/api/gemini/stream';
      const headers = { 'Content-Type': 'application/json' };
      if (jwtToken) {
        headers['Authorization'] = `Bearer ${jwtToken}`;
      }
      
      const res = await fetch(targetEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({ system: TUTOR_SYSTEM, user: prompt, maxOutputTokens: tokens, sessionId: sid, userId, courseId: 'general' }),
      });
      if (!res.ok) {
        let errMsg = `HTTP ${res.status}`;
        try { const d = await res.json(); errMsg = d.error || errMsg; } catch {}
        throw new Error(errMsg);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        if (streamElRef.current) {
          streamElRef.current.textContent = fullText;
        }
      }
      if (!fullText.trim()) {
        throw new Error('Gemini returned an empty response — the content may have been blocked by safety filters. Try rephrasing your question.');
      }
      const aiMsg = { id: (Date.now() + 1).toString(36), role: 'ai', content: fullText, features: {} };
      const next = [...msgsWithUser, aiMsg];
      setMessages(next);
      setStreamingText('');
      saveSession(next, sid);
    } catch (e) {
      setErr(e.message || 'Error generating response.');
      setStreamingText('');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateFeature = async (msgIdx, type) => {
    if (generating.msgIdx === msgIdx && generating.type === type) return;
    const msg = messages[msgIdx];
    if (!msg || msg.role !== 'ai') return;

    setGenerating({ msgIdx, type });
    try {
      const system = FEATURE_SYSTEMS[type] || TUTOR_SYSTEM;
      const prompt = buildFeaturePrompt(type, msg.content, mode);
      const tokens = type === 'simpler' || type === 'examples' ? 1000 : 1500;
      const text = await geminiCall(system, prompt, tokens, { sessionId: currentSessionId, userId });
      if (!text.trim()) throw new Error(`Gemini returned an empty response for ${type}. Try again.`);

      setMessages(prev => prev.map((m, i) => {
        if (i !== msgIdx) return m;
        const f = { ...m.features };
        if (type === 'quiz') f.quiz = { questions: parseQuizOutput(text), currentIdx: 0, currentAnswer: null };
        else if (type === 'flashcards') f.flashcards = { cards: parseFlashcardsOutput(text), currentIdx: 0, flipped: false };
        else if (type === 'infographic') f.infographic = { points: parseInfographicOutput(text) };
        else if (type === 'simpler') f.simpler = { text };
        else if (type === 'examples') f.examples = { text };
        return { ...m, features: f, activeFeature: type };
      }));
    } catch (e) {
      setErr(`Failed to generate ${type}: ${e.message}`);
    } finally {
      setGenerating({ msgIdx: null, type: null });
    }
  };

  const handleFeatureClick = (msgIdx, type) => {
    const msg = messages[msgIdx];
    if (!msg) return;
    if (featureExists(msg, type)) {
      setMessages(prev => prev.map((m, i) => {
        if (i !== msgIdx) return m;
        return { ...m, activeFeature: m.activeFeature === type ? null : type };
      }));
    } else {
      handleGenerateFeature(msgIdx, type);
    }
  };

  const handleQuizAnswer = (msgIdx, answerIdx) => {
    setMessages(prev => prev.map((m, i) => {
      if (i !== msgIdx || !m.features.quiz) return m;
      if (m.features.quiz.currentAnswer !== null) return m;
      return { ...m, features: { ...m.features, quiz: { ...m.features.quiz, currentAnswer: answerIdx } } };
    }));
  };

  const handleQuizNav = (msgIdx, dir) => {
    setMessages(prev => prev.map((m, i) => {
      if (i !== msgIdx || !m.features.quiz) return m;
      const q = m.features.quiz;
      const max = q.questions.length - 1;
      const next = dir === 'next' ? Math.min(q.currentIdx + 1, max) : Math.max(q.currentIdx - 1, 0);
      return { ...m, features: { ...m.features, quiz: { ...q, currentIdx: next, currentAnswer: null } } };
    }));
  };

  const handleFlashcardFlip = (msgIdx) => {
    setMessages(prev => prev.map((m, i) => {
      if (i !== msgIdx || !m.features.flashcards) return m;
      return { ...m, features: { ...m.features, flashcards: { ...m.features.flashcards, flipped: !m.features.flashcards.flipped } } };
    }));
  };

  const handleFlashcardNav = (msgIdx, dir) => {
    setMessages(prev => prev.map((m, i) => {
      if (i !== msgIdx || !m.features.flashcards) return m;
      const fc = m.features.flashcards;
      const len = fc.cards.length;
      const next = dir === 'next' ? (fc.currentIdx + 1) % len : (fc.currentIdx - 1 + len) % len;
      return { ...m, features: { ...m.features, flashcards: { ...fc, currentIdx: next, flipped: false } } };
    }));
  };

  const isGeneratingFeature = (mi, type) => generating.msgIdx === mi && generating.type === type;

  const featureExists = (msg, type) => {
    if (type === 'quiz') return !!msg.features?.quiz;
    if (type === 'flashcards') return !!msg.features?.flashcards;
    if (type === 'infographic') return !!msg.features?.infographic;
    if (type === 'simpler') return !!msg.features?.simpler;
    if (type === 'examples') return !!msg.features?.examples;
    return false;
  };

  const tutorNavItems = [
    { href: '/',              Icon: Home,      label: 'Dashboard'     },
    { href: '/courses',       Icon: BookOpen,  label: 'Courses'       },
    { href: '/coding-tutor',  Icon: Code2,     label: 'Code with AI Tutor'  },
    { href: '/progress',      Icon: BarChart3, label: 'Progress'      },
  ];

  const tutorExtras = (close) => {
    const items = [];

    // Mode select
    items.push(
      <div key="mode-select">
        <label style={{ fontSize: 11, color: T.muted, fontWeight: 600, letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>LEARNING MODE</label>
        <select value={mode} onChange={e => setMode(e.target.value)}
          style={{ width: '100%', appearance: 'none', background: T.s2, border: `1px solid ${modeColors[mode] + '50' || T.border}`, borderRadius: 8, padding: '8px 12px', color: modeColors[mode] || T.text, fontSize: 13, fontWeight: 600, cursor: 'pointer', outline: 'none', fontFamily: 'inherit' }}>
          {MODES.map(m => <option key={m} value={m} style={{ background: T.s1, color: T.text }}>{m}</option>)}
        </select>
      </div>
    );

    // Length select
    items.push(
      <div key="len-select">
        <label style={{ fontSize: 11, color: T.muted, fontWeight: 600, letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>RESPONSE DEPTH</label>
        <select value={length} onChange={e => setLength(e.target.value)}
          style={{ width: '100%', appearance: 'none', background: T.s2, border: `1px solid ${length === 'Short' ? T.amber + '50' : length === 'Medium' ? T.accent + '50' : T.purple + '50'}`, borderRadius: 8, padding: '8px 12px', color: length === 'Short' ? T.amber : length === 'Medium' ? T.accent : T.purple, fontSize: 13, fontWeight: 600, cursor: 'pointer', outline: 'none', fontFamily: 'inherit' }}>
          {LENGTHS.map(l => <option key={l} value={l} style={{ background: T.s1, color: T.text }}>{l}</option>)}
        </select>
      </div>
    );

    // Session history (mobile only)
    if (isMobile && mergedSessions?.length > 0) {
      const groups = {};
      const ordered = ['Today', 'Yesterday', 'This Week', 'Older'];
      for (const s of mergedSessions) {
        const label = getDateLabel(s.timestamp || s.startedAt);
        if (!groups[label]) groups[label] = [];
        groups[label].push(s);
      }
      for (const key of Object.keys(groups)) {
        groups[key].sort((a, b) => {
          return new Date(b.timestamp || b.startedAt).getTime() - new Date(a.timestamp || a.startedAt).getTime();
        });
      }

      items.push(
        <div key="sessions">
          <div style={{ fontSize: 11, color: T.muted, fontWeight: 600, letterSpacing: '0.06em', marginBottom: 8 }}>SESSION HISTORY</div>
          {ordered.map(group => {
            const sList = groups[group];
            if (!sList) return null;
            return (
              <div key={group} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, color: T.dim, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0 4px', marginBottom: 4 }}>{group}</div>
                {sList.map(session => {
                  const isActive = session.id === currentSessionId;
                  const isVoice = session.type === 'voice';
                  return (
                    <button key={session.type + '-' + session.id}
                      onClick={() => {
                        if (isVoice) {
                          setVoiceSessionToRestore(session);
                          setActiveTab('voice');
                        } else {
                          setActiveTab('text');
                          handleSelectSession(session);
                        }
                        if (close) close();
                      }}
                      style={{
                        width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 8, border: 'none',
                        background: isActive ? `${T.accent}15` : 'transparent',
                        color: isActive ? T.text : T.muted, cursor: 'pointer', fontSize: 12,
                        display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'inherit',
                      }}>
                      <span style={{
                        width: 20, height: 20, borderRadius: 6,
                        background: isVoice ? `${T.accent}20` : `${T.purple}20`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                      }}>
                        {isVoice ? <Zap size={11} color={T.accent} /> : <Brain size={11} color={T.purple} />}
                      </span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: isActive ? 600 : 400, flex: 1 }}>
                        {session.label || 'Untitled'}
                      </span>
                      <span style={{ fontSize: 9, color: T.dim, flexShrink: 0 }}>{isVoice ? 'Voice' : 'Text'}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      );
    }

    return items;
  };

  const handleKeyDown = (e) => {
    if (showAtMenu && filteredDocs.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setAtMenuIndex(prev => (prev + 1) % filteredDocs.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setAtMenuIndex(prev => (prev - 1 + filteredDocs.length) % filteredDocs.length);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAttachDoc(filteredDocs[atMenuIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowAtMenu(false);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (authenticating) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: T.bg, color: T.text }}>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          .custom-spin {
            animation: spin 1s linear infinite;
          }
        `}</style>
        <Loader2 className="custom-spin" size={48} color={T.purple} />
        <p style={{ marginTop: 16, fontSize: 14, color: T.muted, fontWeight: 500 }}>Authenticating session...</p>
      </div>
    );
  }

  return (
    <>
      <MobileNav title="Ask your AI Tutor" accent={T.purple} items={[]} dropdownItems={NAV} extras={tutorExtras} />
      <div style={{ display: 'flex', height: '100vh', background: T.bg, overflow: 'hidden' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* ── HEADER ── */}
        <div style={{ padding: isMobile ? '10px 14px' : '14px 28px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, background: T.s1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: rGap }}>
            <div style={{ width: isMobile ? 32 : 38, height: isMobile ? 32 : 38, borderRadius: 10, background: `${T.purple}18`, border: `1px solid ${T.purple}35`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Brain size={isMobile ? 15 : 18} color={T.purple} />
            </div>
            <div>
              <h2 style={{ color: T.text, fontSize: isMobile ? 15 : 18, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>Ask your AI Tutor</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: T.green, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: T.muted, fontWeight: 500 }}>AI Tutor</span>
                <Lock size={10} color={T.dim} />
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {isMobile && streamingText && (
              <Loader2 size={14} color={T.accent} className="custom-spin" />
            )}
            
            <div style={{ display: 'flex', background: T.s2, borderRadius: 18, padding: 2, border: `1px solid ${T.border}` }}>
              <button onClick={() => setActiveTab('text')}
                style={{
                  border: 'none', background: activeTab === 'text' ? T.purple : 'transparent',
                  color: activeTab === 'text' ? '#fff' : T.muted, borderRadius: 15,
                  padding: '5px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit', transition: 'all 0.2s'
                }}>
                Text
              </button>
              <button onClick={() => setActiveTab('voice')}
                style={{
                  border: 'none', background: activeTab === 'voice' ? T.purple : 'transparent',
                  color: activeTab === 'voice' ? '#fff' : T.muted, borderRadius: 15,
                  padding: '5px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit', transition: 'all 0.2s'
                }}>
                Voice
              </button>
            </div>
          </div>
        </div>

        {activeTab === 'voice' ? (
          <VoiceAgentView
            inline={true}
            onClose={() => { setActiveTab('text'); setVoiceSessionToRestore(null); }}
            initialSession={voiceSessionToRestore}
            sessionId={currentSessionId}
            userId={userId}
            onSessionComplete={(voiceMsgs) => {
              if (voiceMsgs?.length > 0) {
                const mapped = voiceMsgs.map(m => ({
                  role: m.sender === 'student' ? 'user' : 'ai',
                  content: m.text
                }));
                setMessages(prev => {
                  const updated = [...prev, ...mapped];
                  setTimeout(() => saveSession(updated, currentSessionId), 100);
                  return updated;
                });
              }
            }}
          />
        ) : (
          <>
            {/* ── CHAT AREA ── */}
        <div ref={chatRef} style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '16px 14px 10px' : '28px 28px 16px' }}>

          {/* Welcome AI message */}
          <div style={{ display: 'flex', gap: rGap, marginBottom: 24, maxWidth: msgMaxW }}>
            <div style={{ width: isMobile ? 30 : 36, height: isMobile ? 30 : 36, borderRadius: '50%', background: `${T.purple}25`, border: `1px solid ${T.purple}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Brain size={isMobile ? 14 : 16} color={T.purple} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: T.purple, fontWeight: 700, letterSpacing: '0.05em', marginBottom: 4 }}>AI TUTOR</div>
              <div style={{ color: T.text, fontSize: 14, lineHeight: 1.7 }}>
                Hello! I'm your AI learning assistant. Tell me what you'd like to learn and I'll create a personalised explanation. You can also generate quizzes, flashcards, and infographics on demand.
              </div>
            </div>
          </div>

          {/* Conversation messages */}
          {messages.map((msg, mi) => (
            <div key={msg.id || mi} style={{ marginBottom: 20 }}>
              {/* ── User message ── */}
              {msg.role === 'user' && (
                <div style={{ display: 'flex', gap: rGap, justifyContent: 'flex-end', maxWidth: msgMaxW, marginLeft: 'auto' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: T.muted, fontWeight: 600, letterSpacing: '0.04em', marginBottom: 4 }}>YOU</div>
                    <div style={{ background: T.s3, border: `1px solid ${T.border}`, borderRadius: '14px 14px 4px 14px', padding: '10px 14px', color: T.text, fontSize: 14, lineHeight: 1.65, maxWidth: bubbleMaxW, whiteSpace: 'pre-wrap', wordBreak: 'break-word', textAlign: 'left' }}>
                      {msg.content}
                      {msg.documents && msg.documents.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8, borderTop: `1px solid ${T.border}`, paddingTop: 8 }}>
                          {msg.documents.map(doc => (
                            <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: T.muted }}>
                              <span>📄</span>
                              <span style={{ fontWeight: 500, color: T.text }}>{doc.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 10, color: T.dim, marginTop: 4 }}>{msg.mode} &middot; {msg.length}</div>
                  </div>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: T.s3, border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13, color: T.muted, fontWeight: 700 }}>S</div>
                </div>
              )}

              {/* ── AI message ── */}
              {msg.role === 'ai' && (
                <div style={{ display: 'flex', gap: rGap, maxWidth: msgMaxW }}>
                  <div style={{ width: isMobile ? 30 : 36, height: isMobile ? 30 : 36, borderRadius: '50%', background: `${T.purple}25`, border: `1px solid ${T.purple}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Brain size={isMobile ? 14 : 16} color={T.purple} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: T.purple, fontWeight: 700, letterSpacing: '0.05em', marginBottom: 4 }}>AI TUTOR</div>
                    <div style={{ color: T.text, fontSize: 14, lineHeight: 1.7 }}>
                      <div className="md-content">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{cleanMarkdown(msg.content)}</ReactMarkdown>
                      </div>
                    </div>

                    {/* HTML Tab Suggestions Container */}
                    {msg.activeFeature && (
                      <div data-feature-container="true" style={{ marginTop: 16, background: T.s1, border: `1px solid ${T.border}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)' }}>
                        {/* Tab Headers */}
                        <div style={{ display: 'flex', borderBottom: `1px solid ${T.border}`, background: T.s2, overflowX: 'auto' }} className="no-scrollbar">
                          {SUGGESTIONS.map(s => {
                            const isTabActive = msg.activeFeature === s.id;
                            const isGenerated = !!msg.features?.[s.id];
                            return (
                              <button
                                key={s.id}
                                data-feature-button="true"
                                onClick={() => handleFeatureClick(mi, s.id)}
                                style={{
                                  padding: '12px 18px',
                                  background: isTabActive ? T.s1 : 'transparent',
                                  border: 'none',
                                  borderBottom: isTabActive ? `2px solid ${s.color}` : 'none',
                                  color: isTabActive ? T.text : T.dim,
                                  fontSize: 12.5,
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  transition: 'all 0.15s'
                                }}
                              >
                                <s.Icon size={13} color={isTabActive ? s.color : T.dim} />
                                <span>{s.label}</span>
                                {isGenerated && <span style={{ width: 4, height: 4, borderRadius: '50%', background: s.color }} />}
                              </button>
                            );
                          })}
                        </div>

                        {/* Tab Content Panel */}
                        <div style={{ padding: 20 }}>
                          {/* Rendering the active tab's view */}
                          {msg.activeFeature === 'quiz' && (
                            msg.features?.quiz?.questions?.length > 0 ? (
                              <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                                  <span style={{ fontSize: 12, color: T.muted }}>Question {msg.features.quiz.currentIdx + 1} of {msg.features.quiz.questions.length}</span>
                                  <button onClick={() => handleGenerateFeature(mi, 'quiz')}
                                    style={{ background: 'none', border: `1px solid ${T.border}`, color: T.muted, borderRadius: 6, padding: '3px 10px', fontSize: 11, cursor: 'pointer' }}>
                                    Regenerate
                                  </button>
                                </div>
                                <div style={{ color: T.text, fontSize: 14, fontWeight: 600, marginBottom: 14, lineHeight: 1.5 }}>{msg.features.quiz.questions[msg.features.quiz.currentIdx]?.question}</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                                  {msg.features.quiz.questions[msg.features.quiz.currentIdx]?.options.map((opt, oi) => {
                                    const answered = msg.features.quiz.currentAnswer !== null;
                                    const selected = msg.features.quiz.currentAnswer === oi;
                                    const correct = oi === msg.features.quiz.questions[msg.features.quiz.currentIdx].correct;
                                    let bg = T.s3, bd = T.border, cl = T.muted;
                                    if (answered && correct) { bg = `${T.green}18`; bd = `${T.green}50`; cl = T.green; }
                                    else if (answered && selected) { bg = `${T.red}18`; bd = `${T.red}50`; cl = T.red; }
                                    else if (selected) { bg = `${T.accent}18`; bd = `${T.accent}50`; cl = T.accent; }
                                    return (
                                      <button key={oi} onClick={() => handleQuizAnswer(mi, oi)} disabled={answered}
                                        style={{ background: bg, border: `1px solid ${bd}`, borderRadius: 9, padding: '10px 14px', color: cl, fontSize: 13, cursor: answered ? 'default' : 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
                                        <span style={{ fontWeight: 700, marginRight: 8 }}>{'ABCD'[oi]})</span>{opt}
                                      </button>
                                    );
                                  })}
                                </div>
                                {msg.features.quiz.currentAnswer !== null && (
                                  <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: 13, color: msg.features.quiz.currentAnswer === msg.features.quiz.questions[msg.features.quiz.currentIdx].correct ? T.green : T.red, fontWeight: 600 }}>
                                      {msg.features.quiz.currentAnswer === msg.features.quiz.questions[msg.features.quiz.currentIdx].correct ? '\u2713 Correct!' : `\u2717 Incorrect \u2014 correct: ${'ABCD'[msg.features.quiz.questions[msg.features.quiz.currentIdx].correct]}`}
                                    </span>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                      {msg.features.quiz.currentIdx > 0 && (
                                        <button onClick={() => handleQuizNav(mi, 'prev')}
                                          style={{ background: T.s3, border: `1px solid ${T.border}`, color: T.muted, borderRadius: 7, padding: '6px 14px', fontSize: 12, cursor: 'pointer' }}>
                                          &larr; Prev
                                        </button>
                                      )}
                                      {msg.features.quiz.currentIdx < msg.features.quiz.questions.length - 1 && (
                                        <button onClick={() => handleQuizNav(mi, 'next')}
                                          style={{ background: T.accent, color: '#fff', border: 'none', borderRadius: 7, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                                          Next <ChevronRight size={12} />
                                        </button>
                                      )}
                                      {msg.features.quiz.currentIdx === msg.features.quiz.questions.length - 1 && (
                                        <span style={{ fontSize: 12, color: T.muted }}>Quiz complete!</span>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </>
                            ) : (
                              <div style={{ textAlign: 'center', padding: '20px 0', color: T.muted }}>
                                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 10px' }} />
                                Loading Quiz Questions...
                              </div>
                            )
                          )}

                          {msg.activeFeature === 'flashcards' && (
                            msg.features?.flashcards?.cards?.length > 0 ? (
                              <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                                  <span style={{ fontSize: 12, color: T.muted }}>Card {msg.features.flashcards.currentIdx + 1} of {msg.features.flashcards.cards.length}</span>
                                  <button onClick={() => handleGenerateFeature(mi, 'flashcards')}
                                    style={{ background: 'none', border: `1px solid ${T.border}`, color: T.muted, borderRadius: 6, padding: '3px 10px', fontSize: 11, cursor: 'pointer' }}>
                                    Regenerate
                                  </button>
                                </div>
                                <div onClick={() => handleFlashcardFlip(mi)} style={{ cursor: 'pointer' }}>
                                  <div style={{ background: msg.features.flashcards.flipped ? `${T.purple}15` : T.s3, border: `1px solid ${msg.features.flashcards.flipped ? T.purple + '40' : T.border}`, borderRadius: 14, padding: '32px 24px', minHeight: 120, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', transition: 'all 0.3s' }}>
                                    <div style={{ fontSize: 11, color: T.muted, letterSpacing: '0.08em', marginBottom: 10, textTransform: 'uppercase' }}>
                                      {msg.features.flashcards.flipped ? 'Answer' : 'Question \u2014 tap to reveal'}
                                    </div>
                                    <div style={{ fontSize: 15, color: T.text, fontWeight: msg.features.flashcards.flipped ? 400 : 600, lineHeight: 1.6 }}>
                                      {msg.features.flashcards.flipped ? msg.features.flashcards.cards[msg.features.flashcards.currentIdx]?.back : msg.features.flashcards.cards[msg.features.flashcards.currentIdx]?.front}
                                    </div>
                                    {!msg.features.flashcards.flipped && <div style={{ marginTop: 12, fontSize: 11, color: T.dim }}>tap to flip</div>}
                                  </div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 12 }}>
                                  <button onClick={() => handleFlashcardNav(mi, 'prev')}
                                    style={{ background: T.s3, border: `1px solid ${T.border}`, color: T.muted, borderRadius: 8, padding: '7px 16px', cursor: 'pointer', fontSize: 13 }}>
                                    &larr; Prev
                                  </button>
                                  <button onClick={() => handleFlashcardNav(mi, 'next')}
                                    style={{ background: T.s3, border: `1px solid ${T.border}`, color: T.muted, borderRadius: 8, padding: '7px 16px', cursor: 'pointer', fontSize: 13 }}>
                                    Next &rarr;
                                  </button>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: 5, marginTop: 8 }}>
                                  {msg.features.flashcards.cards.map((_, i) => (
                                    <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: msg.features.flashcards.currentIdx === i ? T.purple : T.dim, transition: 'all 0.2s' }} />
                                  ))}
                                </div>
                              </>
                            ) : (
                              <div style={{ textAlign: 'center', padding: '20px 0', color: T.muted }}>
                                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 10px' }} />
                                Loading Flashcards...
                              </div>
                            )
                          )}

                          {msg.activeFeature === 'infographic' && (
                            msg.features?.infographic?.points?.length > 0 ? (
                              <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                                  <span style={{ fontSize: 12, color: T.muted }}>Key concepts at a glance</span>
                                  <button onClick={() => handleGenerateFeature(mi, 'infographic')}
                                    style={{ background: 'none', border: `1px solid ${T.border}`, color: T.muted, borderRadius: 6, padding: '3px 10px', fontSize: 11, cursor: 'pointer' }}>
                                    Regenerate
                                  </button>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: fCol, gap: 10 }}>
                                  {msg.features.infographic.points.map((pt, i) => {
                                    const colors = [T.accent, T.green, T.purple, T.amber, T.red];
                                    const icons = ['\uD83C\uDFAF', '\uD83D\uDCCC', '\u26A1', '\uD83D\uDD11', '\uD83C\uDF1F', '\uD83D\uDC8E', '\uD83E\uDDE9', '\uD83D\uDE80'];
                                    const c = colors[i % colors.length];
                                    return (
                                      <div key={i} style={{ background: T.s3, border: `1px solid ${c}25`, borderRadius: 10, padding: '14px', position: 'relative', overflow: 'hidden' }}>
                                        <div style={{ position: 'absolute', top: -10, right: -10, width: 50, height: 50, borderRadius: '50%', background: `${c}08` }} />
                                        <div style={{ fontSize: 20, marginBottom: 6 }}>{icons[i % icons.length]}</div>
                                        <div style={{ color: T.text, fontSize: 13, lineHeight: 1.5, fontWeight: 500 }}>{pt}</div>
                                        <div style={{ position: 'absolute', bottom: 0, left: 0, height: 2, width: '100%', background: `linear-gradient(90deg,${c},transparent)` }} />
                                      </div>
                                    );
                                  })}
                                </div>
                              </>
                            ) : (
                              <div style={{ textAlign: 'center', padding: '20px 0', color: T.muted }}>
                                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 10px' }} />
                                Generating Visual Summary...
                              </div>
                            )
                          )}

                          {msg.activeFeature === 'simpler' && (
                            msg.features?.simpler?.text ? (
                              <div style={{ background: `${T.green}10`, border: `1px solid ${T.green}30`, borderRadius: 10, padding: '14px 18px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                  <span style={{ fontSize: 11, color: T.green, fontWeight: 700, letterSpacing: '0.05em' }}>SIMPLIFIED</span>
                                  <button onClick={() => handleGenerateFeature(mi, 'simpler')}
                                    style={{ background: 'none', border: `1px solid ${T.green}40`, color: T.green, borderRadius: 6, padding: '2px 10px', fontSize: 11, cursor: 'pointer' }}>
                                    Regenerate
                                  </button>
                                </div>
                                <div style={{ color: T.text, fontSize: 14, lineHeight: 1.7 }}>
                                  <div className="md-content">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{cleanMarkdown(msg.features.simpler.text)}</ReactMarkdown>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div style={{ textAlign: 'center', padding: '20px 0', color: T.muted }}>
                                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 10px' }} />
                                Generating Simplified Explanation...
                              </div>
                            )
                          )}

                          {msg.activeFeature === 'examples' && (
                            msg.features?.examples?.text ? (
                              <div style={{ background: `${T.accent}10`, border: `1px solid ${T.accent}30`, borderRadius: 10, padding: '14px 18px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                  <span style={{ fontSize: 11, color: T.accent, fontWeight: 700, letterSpacing: '0.05em' }}>EXAMPLES</span>
                                  <button onClick={() => handleGenerateFeature(mi, 'examples')}
                                    style={{ background: 'none', border: `1px solid ${T.accent}40`, color: T.accent, borderRadius: 6, padding: '2px 10px', fontSize: 11, cursor: 'pointer' }}>
                                    Regenerate
                                  </button>
                                </div>
                                <div style={{ color: T.text, fontSize: 14, lineHeight: 1.7 }}>
                                  <div className="md-content">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{cleanMarkdown(msg.features.examples.text)}</ReactMarkdown>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div style={{ textAlign: 'center', padding: '20px 0', color: T.muted }}>
                                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 10px' }} />
                                Generating Examples...
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}

                    {/* ── Suggestion chips ── */}
                    {!msg.local && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                        {SUGGESTIONS.map(s => {
                          const loading = isGeneratingFeature(mi, s.id);
                          const isActive = msg.activeFeature === s.id;
                          return (
                            <button
                              key={s.id}
                              data-feature-button="true"
                              onClick={() => handleFeatureClick(mi, s.id)}
                              disabled={loading}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 5,
                                padding: '6px 12px',
                                borderRadius: 16,
                                background: isActive ? s.color : (loading ? 'rgba(255,255,255,0.05)' : `${s.color}12`),
                                border: isActive ? `1px solid ${s.color}` : `1px solid ${s.color}40`,
                                color: isActive ? '#fff' : s.color,
                                fontSize: 11,
                                fontWeight: 600,
                                cursor: loading ? 'not-allowed' : 'pointer',
                                transition: 'all 0.15s',
                                boxShadow: isActive ? `0 2px 8px ${s.color}40` : 'none'
                              }}
                            >
                              {loading ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <s.Icon size={12} />}
                              {loading ? 'Generating...' : s.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* ── STREAMING ── */}
          {streamingText && (
            <div style={{ display: 'flex', gap: rGap, marginBottom: 20, maxWidth: msgMaxW }}>
              <div style={{ width: isMobile ? 30 : 36, height: isMobile ? 30 : 36, borderRadius: '50%', background: `${T.purple}25`, border: `1px solid ${T.purple}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Brain size={isMobile ? 14 : 16} color={T.purple} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: T.purple, fontWeight: 700, letterSpacing: '0.05em', marginBottom: 4 }}>AI TUTOR</div>
                <div ref={streamElRef} style={{ color: T.text, fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }} />
                <Loader2 size={12} color={T.accent} style={{ animation: 'spin 1s linear infinite', marginTop: 6 }} />
              </div>
            </div>
          )}

          {/* ── LOADING ── */}
          {loading && !streamingText && (
            <div style={{ display: 'flex', gap: rGap, marginBottom: 20, maxWidth: msgMaxW }}>
              <div style={{ width: isMobile ? 30 : 36, height: isMobile ? 30 : 36, borderRadius: '50%', background: `${T.purple}25`, border: `1px solid ${T.purple}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Brain size={isMobile ? 14 : 16} color={T.purple} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Loader2 size={16} color={T.accent} style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: 13, color: T.muted }}>Generating...</span>
              </div>
            </div>
          )}

          {/* ── ERROR ── */}
          {err && (
            <div style={{ maxWidth: 720, marginBottom: 16, color: T.red, fontSize: 12, background: `${T.red}12`, padding: '10px 14px', borderRadius: 8, border: `1px solid ${T.red}30` }}>
              {err}
            </div>
          )}
          
          {/* ── UPLOAD ERROR ── */}
          {uploadErr && (
            <div style={{ maxWidth: 720, marginBottom: 10, color: T.red, fontSize: 11, background: `${T.red}12`, padding: '8px 12px', borderRadius: 6, border: `1px solid ${T.red}20` }}>
              {uploadErr}
            </div>
          )}

          {/* ── SESSION DOCUMENTS ── */}
          {sessionDocs.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10, maxWidth: msgMaxW }}>
              {sessionDocs.map(doc => (
                <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: T.s2, border: `1px solid ${T.border}`, padding: '4px 10px', borderRadius: 14, fontSize: 11 }}>
                  <span style={{ color: T.muted }}>📄</span>
                  <span style={{ color: T.text, fontWeight: 500 }}>{doc.name}</span>
                  <span style={{ 
                    fontSize: 9, 
                    fontWeight: 700, 
                    color: doc.status === 'completed' ? T.green : doc.status === 'failed' ? T.red : T.amber,
                    textTransform: 'uppercase'
                  }}>
                    ({doc.status === 'pending_ingestion' ? 'processing' : doc.status})
                  </span>
                  <button onClick={() => handleDeleteDoc(doc.id)} style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', padding: 0, marginLeft: 4 }}>
                    &times;
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── BOTTOM: Mode/Depth selects + Input ── */}
        <div style={{ flexShrink: 0, borderTop: `1px solid ${T.border}`, background: T.s1, padding: isMobile ? '10px 14px 14px' : '14px 28px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 14, marginBottom: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, color: T.muted, fontWeight: 600, letterSpacing: '0.06em' }}>LEARNING MODE</label>
              <div style={{ position: 'relative' }}>
                <select value={mode} onChange={e => setMode(e.target.value)}
                  style={{ appearance: 'none', background: T.s2, border: `1px solid ${modeColors[mode] + '50' || T.border}`, borderRadius: 8, padding: '7px 34px 7px 12px', color: modeColors[mode] || T.text, fontSize: 12, fontWeight: 600, cursor: 'pointer', outline: 'none', minWidth: 130, fontFamily: 'inherit' }}>
                  {MODES.map(m => <option key={m} value={m} style={{ background: T.s1, color: T.text }}>{m}</option>)}
                </select>
                <ChevronRight size={13} color={modeColors[mode] || T.muted} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%) rotate(90deg)', pointerEvents: 'none' }} />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, color: T.muted, fontWeight: 600, letterSpacing: '0.06em' }}>RESPONSE DEPTH</label>
              <div style={{ position: 'relative' }}>
                <select value={length} onChange={e => setLength(e.target.value)}
                  style={{ appearance: 'none', background: T.s2, border: `1px solid ${length === 'Short' ? T.amber + '50' : length === 'Medium' ? T.accent + '50' : T.purple + '50'}`, borderRadius: 8, padding: '7px 34px 7px 12px', color: length === 'Short' ? T.amber : length === 'Medium' ? T.accent : T.purple, fontSize: 12, fontWeight: 600, cursor: 'pointer', outline: 'none', minWidth: 130, fontFamily: 'inherit' }}>
                  {LENGTHS.map(l => <option key={l} value={l} style={{ background: T.s1, color: T.text }}>{l}</option>)}
                </select>
                <ChevronRight size={13} color={length === 'Short' ? T.amber : length === 'Medium' ? T.accent : T.purple} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%) rotate(90deg)', pointerEvents: 'none' }} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 4 : 6, marginLeft: isMobile ? 0 : 'auto', padding: '6px 14px', background: T.s2, border: `1px solid ${T.border}`, borderRadius: 20 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: T.green, flexShrink: 0 }} />
              <span style={{ fontSize: isMobile ? 10 : 11, color: T.muted, fontWeight: 600 }}>{mode.toUpperCase()} &middot; {length.toUpperCase()}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 8, background: T.s2, border: `1px solid ${T.border}`, borderRadius: 12, padding: '10px 14px', position: 'relative' }}>
              {showAtMenu && filteredDocs.length > 0 && (
                <div style={{
                  position: 'absolute',
                  bottom: 'calc(100% + 8px)',
                  left: 0,
                  right: 0,
                  maxHeight: '200px',
                  overflowY: 'auto',
                  background: T.s2,
                  border: `1px solid ${T.border}`,
                  borderRadius: 10,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  zIndex: 100,
                  padding: '6px 0',
                  textAlign: 'left'
                }}>
                  <div style={{ padding: '4px 12px', fontSize: 10, color: T.muted, fontWeight: 700, letterSpacing: '0.05em', borderBottom: `1px solid ${T.border}`, marginBottom: 4 }}>
                    CHOOSE PDF TO ATTACH
                  </div>
                  {filteredDocs.map((doc, idx) => (
                    <div
                      key={doc.id}
                      onMouseEnter={() => setAtMenuIndex(idx)}
                      style={{
                        padding: '8px 12px',
                        fontSize: 13,
                        color: T.text,
                        cursor: 'pointer',
                        background: idx === atMenuIndex ? `${T.purple}15` : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        transition: 'background 0.1s'
                      }}
                    >
                      <div onClick={() => handleAttachDoc(doc)} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                        <span>📄</span>
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</span>
                        <span style={{ fontSize: 10, color: T.muted }}>({new Date(doc.creation).toLocaleDateString()})</span>
                      </div>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (confirm(`Are you sure you want to permanently delete "${doc.name}" from your library?`)) {
                            await handleLibraryDelete(doc.id);
                          }
                        }}
                        style={{
                          background: 'none', border: 'none', color: T.red, cursor: 'pointer', padding: '4px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.7
                        }}
                        title="Delete from library"
                      >
                        <Trash size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="application/pdf" style={{ display: 'none' }} />
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                style={{ background: 'none', border: 'none', cursor: uploading ? 'not-allowed' : 'pointer', color: uploading ? T.purple : T.muted, padding: '2px', display: 'flex', alignItems: 'center' }}
                title="Upload PDF Context">
                {uploading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Paperclip size={16} />}
              </button>
              <button onClick={() => setActiveTab('voice')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.muted, padding: '2px', display: 'flex', alignItems: 'center' }} title="Open Voice Tutor">
                <Mic size={16} />
              </button>
              <textarea ref={inputRef} value={topic} onChange={handleTextareaChange}
                placeholder="Type your message to the AI Tutor\u2026" rows={1}
                onKeyDown={handleKeyDown}
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: T.text, fontSize: 14, lineHeight: 1.6, resize: 'none', fontFamily: 'inherit', padding: 0, minHeight: 22, maxHeight: 120 }} />
            </div>
            <button onClick={handleSend} disabled={loading}
              style={{ width: 44, height: 44, borderRadius: 10, background: loading ? T.dim : T.purple, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {loading ? <Loader2 size={18} color="#fff" style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={18} color="#fff" />}
            </button>
          </div>
        </div>
      </>
    )}
    </div>

      <style>{`
        .md-content p { margin: 0 0 0.6em 0; text-align: justify; line-height: 1.65; }
        .md-content p:last-child { margin: 0; }
        .md-content ul, .md-content ol { margin: 0.4em 0; padding-left: 1.5em; text-align: justify; line-height: 1.65; }
        .md-content li { margin: 0.2em 0; }
        .md-content strong { color: var(--text); font-weight: 700; }
        .md-content em { color: var(--purple); font-style: italic; }
        .md-content code { background: var(--s3); padding: 1px 5px; border-radius: 4px; font-size: 13px; color: var(--amber); }
        .md-content pre { background: var(--s1); padding: 12px; border-radius: 8px; overflow-x: auto; margin: 0.6em 0; border: 1px solid var(--border); }
        .md-content pre code { background: none; padding: 0; color: var(--text); }
        .md-content table { border-collapse: collapse; margin: 0.6em 0; }
        .md-content th, .md-content td { border: 1px solid var(--border); padding: 6px 10px; text-align: left; font-size: 13px; }
        .md-content th { background: var(--s2); color: var(--purple); font-weight: 600; }
        .md-content a { color: var(--accent); text-decoration: underline; }
        .md-content blockquote { border-left: 3px solid var(--accent); margin: 0.6em 0; padding: 4px 12px; color: var(--muted); background: var(--accent-tint); border-radius: 0 8px 8px 0; }
      `}</style>
    </div>
  </>
  );
}
