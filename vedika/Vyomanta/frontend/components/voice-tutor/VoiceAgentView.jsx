'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Home, BookOpen, Brain, Code2, BarChart3, Zap, ArrowLeft } from 'lucide-react';
import { T } from '@/lib/lms-data';
import dynamic from 'next/dynamic';
import VoiceChatMessages from './VoiceChatMessages';

const VoiceRobotVisualizer = dynamic(() => import('./VoiceRobotVisualizer'), {
  ssr: false,
  loading: () => <div className="h-48 flex items-center justify-center text-purple-400">Loading visualizer...</div>
});
import MobileNav from '@/components/MobileNav';
import { useMediaQuery, isMobileMQ } from '@/lib/useMediaQuery';

const SESSIONS_KEY = 'general-tutor-sessions';

function loadSessions() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (!raw) return [];
    return JSON.parse(raw).map((s) => ({
      ...s,
      messages: s.messages.map((m) => ({
        ...m,
        sender: m.sender || (m.role === 'ai' ? 'tutor' : 'student'),
        text: m.text || m.content || '',
        timestamp: new Date(m.timestamp)
      })),
    }));
  } catch { return []; }
}

function saveSessions(sessions) {
  try { localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions)); } catch {}
}

function generateLabel(messages, subject) {
  const firstUser = messages.find((m) => m.sender === 'student');
  if (firstUser) return firstUser.text.slice(0, 40) + (firstUser.text.length > 40 ? '...' : '');
  const subjects = { math: 'Mathematics', science: 'Science', languages: 'Languages', all: 'General Tutor' };
  return subjects[subject] || 'Untitled Session';
}

const TEXT_SESSIONS_KEY = 'general-tutor-sessions';

export default function VoiceAgentView({ onClose, initialSession, inline = false, sessionId = null, userId = null, onSessionComplete = null }) {
  const [selectedLanguage, setSelectedLanguage] = useState('all');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [statusMessage, setStatusMessage] = useState('Tap the microphone to start your voice tutoring session');
  const [conversation, setConversation] = useState([]);
  const [currentSentiment, setCurrentSentiment] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [sessions, setSessions] = useState(loadSessions);
  const [textSessions, setTextSessions] = useState([]);

  const [localUserId] = useState(() => {
    if (typeof window === 'undefined') return '';
    let id = localStorage.getItem('lms-user-id');
    if (!id) { id = 'user-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); localStorage.setItem('lms-user-id', id); }
    return id;
  });

  const activeUserId = userId || localUserId;

  // Load text sessions for unified sidebar
  useEffect(() => {
    try {
      const raw = localStorage.getItem(TEXT_SESSIONS_KEY);
      if (raw) setTextSessions(JSON.parse(raw));
    } catch {}
  }, []);

  // Merge both session types
  const mergedSessions = useMemo(() => {
    const voice = (sessions || []).map(s => ({ ...s, type: 'voice' }));
    const text = (textSessions || []).map(s => ({ ...s, type: 'text' }));
    const all = [...text, ...voice];
    all.sort((a, b) => {
      const ta = new Date(a.timestamp || a.startedAt || 0).getTime();
      const tb = new Date(b.timestamp || b.startedAt || 0).getTime();
      return tb - ta;
    });
    return all;
  }, [sessions, textSessions]);

  const wsRef = useRef(null);
  const audioCtxRef = useRef(null);
  const processorRef = useRef(null);
  const sourceRef = useRef(null);
  const micStreamRef = useRef(null);
  const nextPlayTimeRef = useRef(0);
  const audioSourcesQueueRef = useRef([]);
  const isMutedRef = useRef(false);
  const wsHadErrorRef = useRef(false);
  const voiceSessionIdRef = useRef(null);

  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

  // Restore initial session passed from parent (e.g. when clicking a voice session from sidebar)
  useEffect(() => {
    if (initialSession && initialSession.messages) {
      setConversation(initialSession.messages.map((m) => ({
        ...m,
        sender: m.sender || (m.role === 'ai' ? 'tutor' : 'student'),
        text: m.text || m.content || '',
        timestamp: new Date(m.timestamp)
      })));
      setCurrentSentiment(null);
      if (initialSession.subject) setSelectedSubject(initialSession.subject);
      if (initialSession.language) setSelectedLanguage(initialSession.language);
      setStatusMessage(`Viewing: ${initialSession.label}`);
    }
  }, []); // only on mount

  const stopAllAudioPlaybacks = useCallback(() => {
    audioSourcesQueueRef.current.forEach((source) => { try { source.stop(); } catch {} });
    audioSourcesQueueRef.current = [];
    nextPlayTimeRef.current = 0;
  }, []);

  const saveCurrentSession = useCallback(() => {
    if (conversation.length === 0) return;
    const sid = sessionId || voiceSessionIdRef.current || (Date.now().toString(36) + Math.random().toString(36).slice(2, 6));
    if (!voiceSessionIdRef.current) voiceSessionIdRef.current = sid;

    const normalizedMessages = conversation.map(m => ({
      id: m.id || Date.now().toString(36),
      role: m.sender === 'tutor' || m.role === 'ai' ? 'ai' : 'user',
      content: m.text || m.content || '',
      timestamp: m.timestamp || new Date().toISOString(),
      isVoice: true
    }));

    const session = {
      id: sid,
      label: generateLabel(conversation, selectedSubject),
      subject: selectedSubject,
      language: selectedLanguage,
      timestamp: new Date().toISOString(),
      messages: normalizedMessages,
      type: 'text'
    };

    const updated = [session, ...sessions.filter((s) => s.id !== session.id)];
    setSessions(updated);
    saveSessions(updated);

    // Call parent complete callback if provided
    if (onSessionComplete) {
      onSessionComplete(conversation);
    }

    // Dispatch update event to Sidebar
    try {
      const event = new CustomEvent('tutor-state-update', {
        detail: {
          currentSessionId: sid,
          textSessions: updated,
          type: 'general-tutor'
        }
      });
      window.dispatchEvent(event);
    } catch (e) {}

    // Persist to Redis memory asynchronously
    fetch('/api/memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'save',
        sessionId: sid,
        userId: activeUserId,
        messages: normalizedMessages.map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.content })),
      }),
    }).catch(() => {});
  }, [conversation, selectedSubject, selectedLanguage, sessions, activeUserId, sessionId, onSessionComplete]);

  const terminateSession = useCallback((preserveMessage) => {
    if (wsRef.current) { try { wsRef.current.close(); } catch {} wsRef.current = null; }
    stopAllAudioPlaybacks();
    if (audioCtxRef.current) { try { audioCtxRef.current.close(); } catch {} audioCtxRef.current = null; }
    if (processorRef.current) { try { processorRef.current.disconnect(); } catch {} processorRef.current = null; }
    if (sourceRef.current) { try { sourceRef.current.disconnect(); } catch {} sourceRef.current = null; }
    if (micStreamRef.current) { micStreamRef.current.getTracks().forEach((t) => t.stop()); micStreamRef.current = null; }
    setConnectionStatus('disconnected');
    if (!preserveMessage) {
      setStatusMessage('Lesson completed. Press the mic button to start again!');
    }
  }, [stopAllAudioPlaybacks]);

  useEffect(() => {
    return () => terminateSession();
  }, [terminateSession]);

  const handleSelectSession = useCallback((session) => {
    if (connectionStatus !== 'disconnected') return;
    setConversation(session.messages);
    setCurrentSentiment(null);
    setSelectedSubject(session.subject);
    setSelectedLanguage(session.language);
    setStatusMessage(`Viewing: ${session.label}`);
  }, [connectionStatus]);

  const playPcmAudioChunk = useCallback((base64Data) => {
    if (isMutedRef.current || !audioCtxRef.current) return;
    try {
      const audioCtx = audioCtxRef.current;
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
      audioSourcesQueueRef.current.push(bufferSource);
      bufferSource.onended = () => {
        audioSourcesQueueRef.current = audioSourcesQueueRef.current.filter((src) => src !== bufferSource);
        if (audioSourcesQueueRef.current.length === 0) {
          setConnectionStatus('connected');
          setStatusMessage('Tutor is listening... Feel free to talk.');
        }
      };
      const now = audioCtx.currentTime;
      if (nextPlayTimeRef.current < now) nextPlayTimeRef.current = now + 0.05;
      setConnectionStatus('tutor-speaking');
      setStatusMessage('Tutor is speaking...');
      bufferSource.start(nextPlayTimeRef.current);
      nextPlayTimeRef.current += audioBuffer.duration;
    } catch (err) { console.error('Playback error:', err); }
  }, []);

  const handleMicToggle = useCallback(async () => {
    if (connectionStatus === 'disconnected' || connectionStatus === 'error') {
      try {
        setConnectionStatus('connecting');
        setStatusMessage('Initializing environment and connecting...');
        stopAllAudioPlaybacks();
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
        micStreamRef.current = stream;
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
        audioCtxRef.current = audioCtx;

        const wsHost = process.env.NEXT_PUBLIC_WS_URL || (
          window.location.hostname === 'localhost'
            ? `ws://localhost:5001`
            : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`
        );
        const voiceSid = sessionId || voiceSessionIdRef.current || (Date.now().toString(36) + Math.random().toString(36).slice(2, 6));
        voiceSessionIdRef.current = voiceSid;
        const wsUrl = `${wsHost}/api/ws?language=${selectedLanguage}&subject=${selectedSubject}&sessionId=${voiceSid}&userId=${activeUserId}`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        // Connection timeout — prevents hanging on "connecting" forever
        const connTimeout = setTimeout(() => {
          if (ws.readyState !== WebSocket.OPEN) {
            wsHadErrorRef.current = true;
            ws.close();
            setConnectionStatus('error');
            setStatusMessage('Connection timed out. Make sure the voice server is running (npm run dev:voice).');
          }
        }, 10000);

        ws.onopen = () => {
          clearTimeout(connTimeout);
          setConversation([]);
          setCurrentSentiment(null);
          setConnectionStatus('connected');
          setStatusMessage('Tutor connected! Start speaking.');
          const source = audioCtx.createMediaStreamSource(stream);
          sourceRef.current = source;
          const processor = audioCtx.createScriptProcessor(4096, 1, 1);
          processorRef.current = processor;
          source.connect(processor);
          processor.connect(audioCtx.destination);
          processor.onaudioprocess = (e) => {
            if (ws.readyState !== WebSocket.OPEN || isMutedRef.current) return;
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
        };

        ws.onmessage = (event) => {
          const message = JSON.parse(event.data);
          if (message.type === 'status') setStatusMessage(message.message);
          else if (message.type === 'error') { setStatusMessage(message.message); setConnectionStatus('error'); }
          else if (message.type === 'audio') playPcmAudioChunk(message.data);
          else if (message.type === 'interrupted') { stopAllAudioPlaybacks(); setConnectionStatus('connected'); setStatusMessage('Tutor was interrupted. Listening now...'); }
          else if (message.type === 'agent-transcription') {
            setConversation((prev) => {
              if (prev.length > 0 && prev[prev.length - 1].sender === 'tutor') {
                const updated = [...prev];
                updated[updated.length - 1] = { ...updated[updated.length - 1], text: updated[updated.length - 1].text + ' ' + message.text };
                return updated;
              }
              return [...prev, { id: Math.random().toString(36).slice(2), sender: 'tutor', text: message.text, timestamp: new Date() }];
            });
          } else if (message.type === 'user-transcription') {
            setConversation((prev) => [...prev, { id: Math.random().toString(36).slice(2), sender: 'student', text: message.text, timestamp: new Date(), sentiment: message.sentiment }]);
            if (message.sentiment) setCurrentSentiment(message.sentiment);
          }
        };

        ws.onclose = () => {
          clearTimeout(connTimeout);
          // Don't override error status — keep the error message visible
          if (!wsHadErrorRef.current) terminateSession(false);
        };
        ws.onerror = () => {
          clearTimeout(connTimeout);
          wsHadErrorRef.current = true;
          setConnectionStatus('error');
          setStatusMessage('Connection failed. Verify the voice server is running.');
        };
      } catch (err) {
        setConnectionStatus('error');
        setStatusMessage(`Unable to access mic: ${err.message || err}. Please permit microphone access.`);
      }
    } else {
      saveCurrentSession();
      terminateSession();
    }
  }, [connectionStatus, selectedLanguage, selectedSubject, stopAllAudioPlaybacks, terminateSession, playPcmAudioChunk, saveCurrentSession, sessionId, activeUserId]);

  const clearTranscriptLog = useCallback(() => {
    setConversation([]);
    setCurrentSentiment(null);
  }, []);

  const LANGUAGES = [
    { id: 'all', name: 'Auto-Detect', flag: '\uD83C\uDF0D' },
    { id: 'english', name: 'English', flag: '\uD83C\uDDFA\uD83C\uDDF8' },
    { id: 'telugu', name: 'Telugu', flag: '\uD83C\uDDEE\uD83C\uDDF3' },
    { id: 'hindi', name: 'Hindi', flag: '\uD83C\uDDEE\uD83C\uDDF3' },
  ];

  const SUBJECTS = [
    { id: 'all', name: 'General Tutoring' },
    { id: 'math', name: 'Mathematics' },
    { id: 'science', name: 'Science' },
    { id: 'languages', name: 'Languages / English' },
  ];

  const isActive = connectionStatus !== 'disconnected' && connectionStatus !== 'error';
  const isMobile = useMediaQuery(isMobileMQ);
  const voiceZ = isMobile ? 1010 : 1000;

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

  const voiceNavItems = [
    { href: '/',              Icon: Home,      label: 'Dashboard'     },
    { href: '/courses',       Icon: BookOpen,  label: 'Courses'       },
    { href: '/general-tutor', Icon: Brain,     label: 'Ask your AI Tutor' },
    { href: '/coding-tutor',  Icon: Code2,     label: 'Code with AI Tutor'  },
    { href: '/progress',      Icon: BarChart3, label: 'Progress'      },
  ];

  const voiceExtras = (close) => {
    const items = [];

    // Language selector
    items.push(
      <div key="lang-select">
        <label style={{ fontSize: 11, color: T.muted, fontWeight: 600, letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>LANGUAGE</label>
        <select value={selectedLanguage} onChange={(e) => setSelectedLanguage(e.target.value)} disabled={isActive}
          style={{ width: '100%', appearance: 'none', background: T.s2, border: `1px solid ${T.border}`, borderRadius: 8, padding: '8px 12px', color: T.text, fontSize: 13, fontWeight: 600, cursor: isActive ? 'not-allowed' : 'pointer', outline: 'none', fontFamily: 'inherit', opacity: isActive ? 0.5 : 1 }}>
          {LANGUAGES.map((lang) => (
            <option key={lang.id} value={lang.id} style={{ background: T.s1, color: T.text }}>{lang.flag} {lang.name}</option>
          ))}
        </select>
      </div>
    );

    // Subject selector
    items.push(
      <div key="subj-select">
        <label style={{ fontSize: 11, color: T.muted, fontWeight: 600, letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>SUBJECT</label>
        <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} disabled={isActive}
          style={{ width: '100%', appearance: 'none', background: T.s2, border: `1px solid ${T.border}`, borderRadius: 8, padding: '8px 12px', color: T.text, fontSize: 13, fontWeight: 600, cursor: isActive ? 'not-allowed' : 'pointer', outline: 'none', fontFamily: 'inherit', opacity: isActive ? 0.5 : 1 }}>
          {SUBJECTS.map((sub) => (
            <option key={sub.id} value={sub.id} style={{ background: T.s1, color: T.text }}>{sub.name}</option>
          ))}
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
                  const isV = session.type === 'voice';
                  return (
                    <button key={session.type + '-' + session.id}
                      onClick={() => {
                        if (session.type === 'voice') {
                          handleSelectSession(session);
                        } else {
                          onClose();
                        }
                        if (close) close();
                      }}
                      style={{
                        width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 8, border: 'none',
                        background: 'transparent', color: T.muted, cursor: 'pointer', fontSize: 12,
                        display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'inherit',
                      }}>
                      <span style={{ width: 20, height: 20, borderRadius: 6, background: isV ? `${T.accent}20` : `${T.purple}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {isV ? <Zap size={11} color={T.accent} /> : <Brain size={11} color={T.purple} />}
                      </span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{session.label || 'Untitled'}</span>
                      <span style={{ fontSize: 9, color: T.dim, flexShrink: 0 }}>{isV ? 'Voice' : 'Text'}</span>
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

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSidebarCollapsed(localStorage.getItem('sidebar_collapsed') === 'true');
      const handleStorageChange = () => {
        setSidebarCollapsed(localStorage.getItem('sidebar_collapsed') === 'true');
      };
      window.addEventListener('storage', handleStorageChange);
      const interval = setInterval(handleStorageChange, 200);
      return () => {
        window.removeEventListener('storage', handleStorageChange);
        clearInterval(interval);
      };
    }
  }, []);

  return (
    <div style={inline ? {
      position: 'relative',
      width: '100%',
      height: '100%',
      display: 'flex',
      background: 'transparent',
      color: T.text,
      fontFamily: 'var(--font-outfit), "Segoe UI", sans-serif',
      overflow: 'hidden'
    } : {
      position: 'fixed',
      top: 0,
      bottom: 0,
      left: isMobile ? 0 : (sidebarCollapsed ? 70 : 220),
      right: 0,
      zIndex: voiceZ,
      display: 'flex',
      background: T.bg,
      color: T.text,
      fontFamily: 'var(--font-outfit), "Segoe UI", sans-serif',
      transition: 'left 0.2s ease'
    }}>
      {!inline && <MobileNav title="Voice Tutor" accent={T.accent} items={voiceNavItems} extras={voiceExtras} zBase={isMobile ? 10 : 0} />}

      {/* Main Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative' }}>
        {/* Header */}
        {!inline && (
          <header style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: isMobile ? '0 12px' : '0 24px', height: isMobile ? 48 : 56,
            background: T.s1, borderBottom: `1px solid ${T.border}`, flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 12 }}>
              <button
                onClick={onClose}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'transparent',
                  border: 'none',
                  color: T.muted,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  padding: '4px 8px',
                  borderRadius: 6,
                  fontFamily: 'inherit',
                  transition: 'all 0.2s',
                  marginRight: 4
                }}
                onMouseEnter={e => { e.currentTarget.style.color = T.text; e.currentTarget.style.background = T.s2; }}
                onMouseLeave={e => { e.currentTarget.style.color = T.muted; e.currentTarget.style.background = 'transparent'; }}
                title="Back to Text Chat"
              >
                <ArrowLeft size={16} />
                {!isMobile && <span>Back</span>}
              </button>
              <h2 style={{ fontSize: isMobile ? 14 : 16, fontWeight: 700, color: T.text, margin: 0 }}>
                {SUBJECTS.find((s) => s.id === selectedSubject)?.name || 'General Tutor'}
              </h2>
              <div style={{ width: 1, height: 16, background: T.dim }} />
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '4px 10px', background: T.s2, borderRadius: 20
              }}>
                <div style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: isActive ? T.green : connectionStatus === 'connecting' ? T.amber : T.dim,
                  animation: connectionStatus === 'connecting' ? 'pulse 1.5s infinite' : 'none'
                }} />
                <span style={{ fontSize: 10, color: T.muted, fontWeight: 600, letterSpacing: '0.04em' }}>
                  {connectionStatus === 'disconnected' && 'Voice Offline'}
                  {connectionStatus === 'connecting' && 'Connecting...'}
                  {connectionStatus === 'connected' && 'Voice Mode Active'}
                  {connectionStatus === 'tutor-speaking' && 'Tutor Speaking'}
                  {connectionStatus === 'error' && 'Error'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 4 : 8 }}>
              {!isMobile && (<React.Fragment>
                <select value={selectedLanguage} onChange={(e) => setSelectedLanguage(e.target.value)}
                  disabled={isActive}
                  style={{
                    background: T.s2, color: T.muted, fontSize: 11, fontWeight: 600,
                    border: `1px solid ${T.border}`, borderRadius: 8, padding: '6px 10px',
                    cursor: isActive ? 'not-allowed' : 'pointer', outline: 'none',
                    fontFamily: 'inherit', opacity: isActive ? 0.5 : 1
                  }}
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.id} value={lang.id} style={{ background: T.s1, color: T.text }}>
                      {lang.flag} {lang.name}
                    </option>
                  ))}
                </select>

                <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}
                  disabled={isActive}
                  style={{
                    background: T.s2, color: T.muted, fontSize: 11, fontWeight: 600,
                    border: `1px solid ${T.border}`, borderRadius: 8, padding: '6px 10px',
                    cursor: isActive ? 'not-allowed' : 'pointer', outline: 'none',
                    fontFamily: 'inherit', opacity: isActive ? 0.5 : 1
                  }}
                >
                  {SUBJECTS.map((sub) => (
                    <option key={sub.id} value={sub.id} style={{ background: T.s1, color: T.text }}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </React.Fragment>)}
            </div>
          </header>
        )}

        {/* Chat Messages — hidden when empty so voice interface can center */}
        {conversation.length > 0 && <VoiceChatMessages conversation={conversation} />}

        {/* Voice Interface */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: isMobile ? '10px 12px 14px' : '12px 24px 18px',
          flex: conversation.length === 0 ? 1 : undefined,
          justifyContent: conversation.length === 0 ? 'center' : undefined,
          borderTop: `1px solid ${T.border}`, background: T.s1,
        }}>
          {inline && (
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 12, width: '100%', flexWrap: 'wrap' }}>
              <select value={selectedLanguage} onChange={(e) => setSelectedLanguage(e.target.value)} disabled={isActive}
                style={{ background: T.s2, color: T.muted, fontSize: 11, fontWeight: 600, border: `1px solid ${T.border}`, borderRadius: 8, padding: '5px 10px', cursor: isActive ? 'not-allowed' : 'pointer', outline: 'none', fontFamily: 'inherit', opacity: isActive ? 0.5 : 1 }}>
                {LANGUAGES.map((lang) => (
                  <option key={lang.id} value={lang.id} style={{ background: T.s1, color: T.text }}>{lang.flag} {lang.name}</option>
                ))}
              </select>
              <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} disabled={isActive}
                style={{ background: T.s2, color: T.muted, fontSize: 11, fontWeight: 600, border: `1px solid ${T.border}`, borderRadius: 8, padding: '5px 10px', cursor: isActive ? 'not-allowed' : 'pointer', outline: 'none', fontFamily: 'inherit', opacity: isActive ? 0.5 : 1 }}>
                {SUBJECTS.map((sub) => (
                  <option key={sub.id} value={sub.id} style={{ background: T.s1, color: T.text }}>{sub.name}</option>
                ))}
              </select>
            </div>
          )}
          {/* Status Message */}
          <p style={{ fontSize: 11, color: T.muted, textAlign: 'center', margin: '0 0 8px' }}>{statusMessage}</p>

          {/* Sentiment Display */}
          {currentSentiment && isActive && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '4px 12px', background: T.s2, borderRadius: 20,
              marginBottom: 8, border: `1px solid ${T.border}`
            }}>
              <span style={{ fontSize: 14 }}>{currentSentiment.emoji}</span>
              <span style={{ fontSize: 10, color: T.muted }}>{currentSentiment.label}</span>
            </div>
          )}

          {/* Robot Visualizer */}
          <div style={{
            position: 'relative', width: isMobile ? 64 : 80, height: isMobile ? 64 : 80,
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8
          }}>
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: `${T.purple}15`, border: `1px solid ${T.purple}30`,
              animation: isActive ? 'pulse-glow 3s infinite ease-in-out' : 'none'
            }} />
            <VoiceRobotVisualizer />
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Mute Toggle */}
            {isActive && (
              <button onClick={() => setIsMuted((m) => !m)}
                style={{
                  width: 32, height: 32, borderRadius: '50%', border: `1px solid ${T.border}`,
                  background: 'transparent', color: isMuted ? T.red : T.muted, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'inherit', transition: 'all 0.15s'
                }}
              >
                {isMuted ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    <path d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                )}
              </button>
            )}

            {/* Main Mic / End Button */}
            <button onClick={handleMicToggle}
              style={{
                padding: '8px 20px', borderRadius: 24, border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
                fontFamily: 'inherit', fontWeight: 600, fontSize: 11,
                letterSpacing: '0.04em', transition: 'all 0.15s',
                background: isActive ? `${T.red}20` : T.purple,
                color: isActive ? T.red : '#fff',
                border: isActive ? `1px solid ${T.red}50` : 'none'
              }}
            >
              {isActive ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 8v2a4 4 0 11-8 0V8m8 0a4 4 0 00-8 0m8 0V6a4 4 0 00-8 0v2m8 0h-2m-4 0H6" />
                    <path d="M6 18h12" />
                  </svg>
                  END SESSION
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  START SESSION
                </>
              )}
            </button>

            {/* Clear Log */}
            {conversation.length > 0 && (
              <button onClick={clearTranscriptLog}
                style={{
                  width: 32, height: 32, borderRadius: '50%', border: `1px solid ${T.border}`,
                  background: 'transparent', color: T.muted, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'inherit', transition: 'all 0.15s'
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Background blurs */}
        {!inline && (
          <React.Fragment>
            <div style={{
              position: 'fixed', top: 0, left: isMobile ? 0 : 260, width: isMobile ? 200 : 400, height: isMobile ? 200 : 400,
              background: `${T.purple}08`, borderRadius: '50%', filter: 'blur(100px)',
              pointerEvents: 'none', transform: 'translate(-50%, -50%)', zIndex: -1
            }} />
            <div style={{
              position: 'fixed', bottom: 0, right: 0, width: isMobile ? 150 : 300, height: isMobile ? 150 : 300,
              background: `${T.green}05`, borderRadius: '50%', filter: 'blur(80px)',
              pointerEvents: 'none', transform: 'translate(30%, 30%)', zIndex: -1
            }} />
          </React.Fragment>
        )}
      </div>
    </div>
  );
}
