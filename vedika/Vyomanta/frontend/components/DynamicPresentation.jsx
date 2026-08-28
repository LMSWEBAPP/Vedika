'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Mic, MicOff, CheckCircle2, Trash2, ArrowLeft, Radio, 
  HelpCircle, Plus, X, Layers, Activity, Command, Layout, Eye, ChevronRight,
  FolderPlus, Folder, Image as ImageIcon, FileText, Upload, RefreshCw, Wand2,
  Download, Copy, Check, Presentation, History, ChevronLeft, Bookmark
} from 'lucide-react';
import { T } from '@/lib/lms-data';
import { useMediaQuery, isMobileMQ } from '@/lib/useMediaQuery';

export default function DynamicPresentation() {
  const isMobile = useMediaQuery(isMobileMQ);
  const isTablet = useMediaQuery('(max-width: 1024px)');

  // Runtime Presentation States
  const [isStarted, setIsStarted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interimSpeech, setInterimSpeech] = useState('');
  const [speechParagraph, setSpeechParagraph] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [bulletPoints, setBulletPoints] = useState([]);
  const [keyPoints, setKeyPoints] = useState([]);
  const [highlightSentence, setHighlightSentence] = useState('');
  const [activeImage, setActiveImage] = useState(null);

  // Slide Deck & Scene History
  const [slideHistory, setSlideHistory] = useState([]);
  const [selectedHistorySlide, setSelectedHistorySlide] = useState(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Folder Workspace States
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState('');
  const [folderFiles, setFolderFiles] = useState([]);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // AI & Processing States
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [speechBuffer, setSpeechBuffer] = useState('');
  const speechBufferRef = useRef('');
  const recognitionRef = useRef(null);
  const bufferTimerRef = useRef(null);
  
  // Refs for bulletproof continuous mic tracking
  const isStartedRef = useRef(false);
  const isListeningRef = useRef(false);
  const activeSlideRef = useRef({ title: '', subtitle: '', bullets: [], keyPoints: [], highlight: '', image: null });

  // Sync refs with state
  useEffect(() => {
    isStartedRef.current = isStarted;
  }, [isStarted]);

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    activeSlideRef.current = {
      title: projectTitle,
      subtitle: subtitle,
      bullets: bulletPoints,
      keyPoints: keyPoints,
      highlight: highlightSentence,
      image: activeImage
    };
  }, [projectTitle, subtitle, bulletPoints, keyPoints, highlightSentence, activeImage]);

  // Load Folder List
  useEffect(() => {
    fetchFolders();
  }, []);

  // Fetch Folder Files when selection changes
  useEffect(() => {
    if (selectedFolder) {
      fetchFolderFiles(selectedFolder);
    } else {
      setFolderFiles([]);
    }
  }, [selectedFolder]);

  // Keyboard shortcut listener (Space to mute/listen, Esc to close modals)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target?.tagName)) return;
      if (e.code === 'Space' && isStartedRef.current) {
        e.preventDefault();
        toggleMic();
      } else if (e.key === 'Escape') {
        setIsCreatingFolder(false);
        setIsExportModalOpen(false);
        setSelectedHistorySlide(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const fetchFolders = async () => {
    try {
      const res = await fetch('/api/presentation/folders');
      const data = await res.json();
      if (data.folders) {
        setFolders(data.folders);
        if (data.folders.length > 0 && !selectedFolder) {
          setSelectedFolder(data.folders[0].name);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch presentation folders:', err);
    }
  };

  const fetchFolderFiles = async (folderName) => {
    try {
      const res = await fetch(`/api/presentation/folders?folder=${encodeURIComponent(folderName)}`);
      const data = await res.json();
      if (data.files) {
        setFolderFiles(data.files);
      }
    } catch (err) {
      console.warn('Failed to fetch folder files:', err);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      const formData = new FormData();
      formData.append('action', 'create_folder');
      formData.append('folderName', newFolderName.trim());

      const res = await fetch('/api/presentation/folders', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setNewFolderName('');
        setIsCreatingFolder(false);
        await fetchFolders();
        setSelectedFolder(data.folder);
      } else {
        alert(data.error || 'Failed to create folder');
      }
    } catch (err) {
      console.error(err);
      alert('Error creating presentation folder');
    }
  };

  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedFolder) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('action', 'upload_files');
      formData.append('folderName', selectedFolder);
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }

      const res = await fetch('/api/presentation/folders', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        await fetchFolderFiles(selectedFolder);
      } else {
        alert('Failed to upload files');
      }
    } catch (err) {
      console.error(err);
      alert('Error uploading presentation assets');
    } finally {
      setIsUploading(false);
    }
  };

  // Initialize Speech Recognition API with Two-Pass AI processing & auto-restart
  useEffect(() => {
    const SpeechRecognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        isListeningRef.current = true;
      };

      recognition.onresult = (event) => {
        let interim = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          let transcriptText = result[0].transcript.trim();

          if (result.isFinal) {
            handleFinalSentence(transcriptText);
            interim = '';
          } else {
            interim += transcriptText;
          }
        }

        setInterimSpeech(interim);
      };

      // Auto-restart on pause/silence timeout so mic never silently dies
      recognition.onend = () => {
        if (isStartedRef.current && isListeningRef.current) {
          try {
            recognition.start();
          } catch (e) {
            setTimeout(() => {
              if (isStartedRef.current && isListeningRef.current) {
                try { recognition.start(); } catch (err) {}
              }
            }, 300);
          }
        } else {
          setIsListening(false);
        }
      };

      recognition.onerror = (err) => {
        if (err.error === 'no-speech') {
          return; // Normal silence timeout, onend handles restart
        }
        console.warn('Speech recognition event:', err.error);
      };

      recognitionRef.current = recognition;
    }
  }, [selectedFolder, folderFiles]);

  const handleFinalSentence = (sentence) => {
    if (!sentence || !sentence.trim()) return;
    const text = sentence.trim();
    const lower = text.toLowerCase();

    // Check for clear screen / reset commands
    if (lower.includes('clear screen') || lower.includes('reset screen') || lower.includes('stop presentation')) {
      clearAll();
      return;
    }

    // Append to speech buffer for AI processing
    speechBufferRef.current += ' ' + text;
    setSpeechBuffer(speechBufferRef.current);

    // Schedule 1.5s AI burst processing
    if (bufferTimerRef.current) clearTimeout(bufferTimerRef.current);
    bufferTimerRef.current = setTimeout(() => {
      processBufferWithAi();
    }, 1500);
  };

  const processBufferWithAi = async () => {
    const chunk = speechBufferRef.current.trim();
    if (!chunk) return;

    // Reset buffer
    speechBufferRef.current = '';
    setSpeechBuffer('');

    setIsAiProcessing(true);
    try {
      const assetList = folderFiles.map(f => f.name);
      const res = await fetch('/api/presentation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: chunk,
          activeFolderAssets: assetList,
          contextHistory: [projectTitle, subtitle, ...bulletPoints]
        })
      });

      const data = await res.json();
      if (res.ok && data.formattedText) {
        applyAiPresentationOutput(data);
      }
    } catch (err) {
      console.error('Failed to process presentation AI burst:', err);
    } finally {
      setIsAiProcessing(false);
    }
  };

  const applyAiPresentationOutput = (data) => {
    const { elementType, formattedText, cleanedTranscript, matchedAsset } = data;

    if (elementType === 'title') {
      // Archive current active slide into deck history if it had content
      const current = activeSlideRef.current;
      if (current.title && (current.bullets.length > 0 || current.keyPoints.length > 0 || current.highlight)) {
        setSlideHistory(prev => [
          ...prev,
          {
            id: Date.now(),
            title: current.title,
            subtitle: current.subtitle,
            bullets: [...current.bullets],
            keyPoints: [...current.keyPoints],
            highlight: current.highlight,
            image: current.image,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
        // Reset slide contents for the new topic
        setBulletPoints([]);
        setKeyPoints([]);
        setHighlightSentence('');
        setActiveImage(null);
      }
      setProjectTitle(formattedText);
    } else if (elementType === 'subtitle') {
      setSubtitle(formattedText);
    } else if (elementType === 'bullet_point') {
      setBulletPoints(prev => [...prev.slice(-6), formattedText]);
    } else if (elementType === 'highlight_sentence') {
      setHighlightSentence(formattedText);
      setTimeout(() => setHighlightSentence(''), 8000);
    } else if (elementType === 'key_point') {
      setKeyPoints(prev => [...prev.slice(-4), formattedText]);
    } else {
      setSpeechParagraph(cleanedTranscript || formattedText);
    }

    // Handle matched folder asset image
    if (matchedAsset && folderFiles.length > 0) {
      const foundFile = folderFiles.find(f => f.name.toLowerCase().includes(matchedAsset.toLowerCase()));
      if (foundFile) {
        setActiveImage(foundFile.url);
      }
    }
  };

  const startPresentation = () => {
    setIsStarted(true);
    isStartedRef.current = true;
    isListeningRef.current = true;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.warn('Mic start notice:', err);
      }
    }
  };

  const stopPresentation = () => {
    isStartedRef.current = false;
    isListeningRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setIsListening(false);
    setIsStarted(false);
  };

  const toggleMic = () => {
    if (!recognitionRef.current) {
      alert('Web Speech API is not supported in this browser.');
      return;
    }

    if (isListening) {
      isListeningRef.current = false;
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      setIsListening(false);
      setInterimSpeech('');
    } else {
      isListeningRef.current = true;
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.warn('Mic start notice:', err);
      }
    }
  };

  const clearAll = () => {
    if (bufferTimerRef.current) clearTimeout(bufferTimerRef.current);
    speechBufferRef.current = '';
    setSpeechBuffer('');
    setProjectTitle('');
    setSubtitle('');
    setSpeechParagraph('');
    setInterimSpeech('');
    setBulletPoints([]);
    setKeyPoints([]);
    setHighlightSentence('');
    setActiveImage(null);
  };

  // Generate clean Markdown representation of the live presentation session
  const generateMarkdownSummary = () => {
    let md = `# Presentation Deck: ${projectTitle || 'Executive Presentation'}\n`;
    if (subtitle) md += `*${subtitle}*\n\n`;
    md += `**Date:** ${new Date().toLocaleDateString()} | **Presenter Operator:** Vedika AI HUD\n\n---\n\n`;

    // Add previous slides in deck
    if (slideHistory.length > 0) {
      slideHistory.forEach((slide, idx) => {
        md += `## Slide ${idx + 1}: ${slide.title}\n`;
        if (slide.subtitle) md += `*${slide.subtitle}*\n\n`;
        if (slide.highlight) md += `> **Key Takeaway:** ${slide.highlight}\n\n`;
        if (slide.bullets.length > 0) {
          md += `### Core Highlights:\n`;
          slide.bullets.forEach(b => { md += `- ${b}\n`; });
          md += `\n`;
        }
        if (slide.keyPoints.length > 0) {
          md += `### Key Takeaways:\n`;
          slide.keyPoints.forEach(k => { md += `- ${k}\n`; });
          md += `\n`;
        }
        md += `---\n\n`;
      });
    }

    // Add current active slide
    if (projectTitle) {
      md += `## Slide ${slideHistory.length + 1}: ${projectTitle}\n`;
      if (subtitle) md += `*${subtitle}*\n\n`;
      if (highlightSentence) md += `> **Key Highlight:** ${highlightSentence}\n\n`;
      if (bulletPoints.length > 0) {
        md += `### Core Highlights:\n`;
        bulletPoints.forEach(b => { md += `- ${b}\n`; });
        md += `\n`;
      }
      if (keyPoints.length > 0) {
        md += `### Key Takeaways:\n`;
        keyPoints.forEach(k => { md += `- ${k}\n`; });
        md += `\n`;
      }
    }

    return md;
  };

  const handleCopyMarkdown = () => {
    const md = generateMarkdownSummary();
    navigator.clipboard.writeText(md);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleDownloadMarkdown = () => {
    const md = generateMarkdownSummary();
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(projectTitle || 'presentation_summary').toLowerCase().replace(/[^a-z0-9]/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{
      width: '100%',
      minHeight: '100vh',
      background: 'var(--bg)',
      color: 'var(--text)',
      fontFamily: 'var(--font-outfit), sans-serif',
      boxSizing: 'border-box',
      paddingBottom: 64
    }}>
      {/* HEADER CONTROLS */}
      <div style={{
        width: '100%',
        background: 'var(--s1)',
        borderBottom: `1px solid var(--border)`,
        padding: isMobile ? '12px 16px' : '14px 28px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxSizing: 'border-box',
        backdropFilter: 'blur(12px)'
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
              textDecoration: 'none'
            }}
          >
            <ArrowLeft size={18} />
          </a>
          <div>
            <h1 style={{
              margin: 0,
              fontSize: isMobile ? '1.15rem' : '1.35rem',
              fontWeight: 800,
              background: 'linear-gradient(135deg, var(--accent) 0%, var(--purple) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <Presentation size={20} style={{ color: 'var(--accent)' }} />
              Dynamic Presentation HUD
            </h1>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: 'var(--muted)' }}>
              AI Launch Event Presentation Operator for Vedika
            </p>
          </div>
        </div>

        {/* WORKSPACE FOLDER & RUN CONTROLS */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--s2)',
            padding: '6px 12px',
            borderRadius: 12,
            border: `1px solid var(--border)`
          }}>
            <Folder size={16} style={{ color: 'var(--accent)' }} />
            <select
              value={selectedFolder}
              onChange={(e) => setSelectedFolder(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '0.825rem',
                color: 'var(--text)',
                outline: 'none',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              {folders.length === 0 ? (
                <option value="">No Presentation Folders</option>
              ) : (
                folders.map((f) => (
                  <option key={f.name} value={f.name}>
                    📁 {f.name} ({f.filesCount} assets)
                  </option>
                ))
              )}
            </select>
          </div>

          <button
            onClick={() => setIsCreatingFolder(true)}
            style={{
              padding: '8px 12px',
              background: 'rgba(79, 131, 246, 0.12)',
              border: `1px solid var(--accent)`,
              borderRadius: 12,
              color: 'var(--accent)',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
            title="Create Presentation Folder"
          >
            <FolderPlus size={16} />
            <span>New Folder</span>
          </button>

          {/* EXPORT SUMMARY BUTTON */}
          {(projectTitle || slideHistory.length > 0) && (
            <button
              onClick={() => setIsExportModalOpen(true)}
              style={{
                padding: '8px 14px',
                background: 'var(--s2)',
                border: `1px solid var(--border)`,
                borderRadius: 12,
                color: 'var(--text)',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <Download size={15} style={{ color: 'var(--accent)' }} />
              <span>Export Deck</span>
            </button>
          )}

          {/* MIC CONTROLS */}
          {isStarted && (
            <button
              onClick={toggleMic}
              style={{
                padding: '8px 14px',
                borderRadius: 12,
                border: 'none',
                background: isListening ? 'var(--red)' : 'var(--s2)',
                color: isListening ? '#FFFFFF' : 'var(--text)',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: isListening ? '0 4px 14px rgba(244, 63, 94, 0.35)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              {isListening ? <Mic size={16} /> : <MicOff size={16} />}
              <span>{isListening ? 'Listening (Space)' : 'Muted'}</span>
            </button>
          )}

          {!isStarted ? (
            <button
              onClick={startPresentation}
              style={{
                padding: '9px 18px',
                background: 'linear-gradient(135deg, var(--accent) 0%, var(--purple) 100%)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 12,
                fontSize: '0.85rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 4px 16px rgba(79, 131, 246, 0.3)'
              }}
            >
              <Radio size={16} />
              <span>Start Presentation</span>
            </button>
          ) : (
            <button
              onClick={stopPresentation}
              style={{
                padding: '9px 16px',
                background: 'var(--s2)',
                border: `1px solid var(--border)`,
                color: 'var(--red)',
                borderRadius: 12,
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Exit Stage
            </button>
          )}
        </div>
      </div>

      {/* CREATE FOLDER MODAL */}
      {isCreatingFolder && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(8px)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16
        }}>
          <div style={{
            background: 'var(--s1)',
            border: `1px solid var(--border)`,
            borderRadius: 20,
            padding: 24,
            width: '100%',
            maxWidth: 440,
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <FolderPlus style={{ color: 'var(--accent)' }} size={20} /> Create Presentation Folder
              </h3>
              <button 
                onClick={() => setIsCreatingFolder(false)} 
                style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--muted)', lineHeight: 1.4 }}>
              Dump all images, PDFs, and reference materials for a specific topic here. Vedika will index them to display live during your presentation.
            </p>
            <input
              type="text"
              placeholder="Folder Name (e.g. Product_Launch_2026)"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--s2)',
                border: `1px solid var(--border)`,
                borderRadius: 12,
                padding: '10px 14px',
                fontSize: '0.875rem',
                color: 'var(--text)',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => setIsCreatingFolder(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 10,
                  background: 'var(--s2)',
                  border: `1px solid var(--border)`,
                  color: 'var(--muted)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFolder}
                style={{
                  padding: '8px 18px',
                  borderRadius: 10,
                  background: 'var(--accent)',
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Create Folder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXPORT PRESENTATION SUMMARY MODAL */}
      {isExportModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(8px)',
          zIndex: 110,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16
        }}>
          <div style={{
            background: 'var(--s1)',
            border: `1px solid var(--border)`,
            borderRadius: 24,
            padding: isMobile ? 20 : 28,
            width: '100%',
            maxWidth: 680,
            maxHeight: '85vh',
            overflowY: 'auto',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)',
            display: 'flex',
            flexDirection: 'column',
            gap: 18
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Presentation size={22} style={{ color: 'var(--accent)' }} /> Export Presentation Deck
              </h3>
              <button onClick={() => setIsExportModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--muted)' }}>
              Here is your structured summary and slide matrix generated by Vedika during your speech.
            </p>

            <pre style={{
              background: 'var(--s2)',
              border: `1px solid var(--border)`,
              borderRadius: 14,
              padding: 16,
              fontSize: '0.8rem',
              color: 'var(--text)',
              fontFamily: 'monospace',
              maxHeight: 280,
              overflowY: 'auto',
              whiteSpace: 'pre-wrap',
              margin: 0
            }}>
              {generateMarkdownSummary()}
            </pre>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
              <button
                onClick={handleCopyMarkdown}
                style={{
                  padding: '10px 18px',
                  borderRadius: 12,
                  background: 'var(--s2)',
                  border: `1px solid var(--border)`,
                  color: 'var(--text)',
                  fontSize: '0.825rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                {isCopied ? <Check size={16} style={{ color: 'var(--green)' }} /> : <Copy size={16} />}
                <span>{isCopied ? 'Copied to Clipboard!' : 'Copy Markdown'}</span>
              </button>

              <button
                onClick={handleDownloadMarkdown}
                style={{
                  padding: '10px 20px',
                  borderRadius: 12,
                  background: 'var(--accent)',
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: '0.825rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: '0 4px 14px rgba(79, 131, 246, 0.3)'
                }}
              >
                <Download size={16} />
                <span>Download .md Deck</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT WORKSPACE */}
      <div style={{
        maxWidth: 1340,
        margin: '0 auto',
        padding: isMobile ? '16px 12px' : '24px 20px',
        display: 'grid',
        gridTemplateColumns: isTablet ? '1fr' : '280px 1fr',
        gap: 24,
        boxSizing: 'border-box'
      }}>
        
        {/* LEFT SIDEBAR: FOLDER MATERIAL ASSETS & DECK HISTORY */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 20
        }}>
          
          {/* FOLDER ASSETS CARD */}
          <div style={{
            background: 'var(--s1)',
            border: `1px solid var(--border)`,
            borderRadius: 24,
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Layers size={16} style={{ color: 'var(--accent)' }} /> Folder Assets
              </h2>
              <label style={{
                padding: '6px 10px',
                background: 'rgba(79, 131, 246, 0.12)',
                border: `1px solid var(--accent)`,
                color: 'var(--accent)',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}>
                <Upload size={14} />
                <span>Upload</span>
                <input type="file" multiple onChange={handleFileUpload} style={{ display: 'none' }} />
              </label>
            </div>

            {selectedFolder ? (
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Active: <strong style={{ color: 'var(--accent)' }}>{selectedFolder}</strong>
              </p>
            ) : (
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--muted)' }}>No folder selected</p>
            )}

            {/* ASSET LIST GRID */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              maxHeight: 260,
              overflowY: 'auto',
              paddingRight: 4
            }}>
              {folderFiles.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '24px 12px',
                  border: `1px dashed var(--border)`,
                  borderRadius: 14,
                  color: 'var(--muted)'
                }}>
                  <ImageIcon size={26} style={{ margin: '0 auto 6px auto', opacity: 0.6 }} />
                  <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600 }}>No assets in folder.</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.7rem', opacity: 0.8 }}>Upload images for Vedika to auto-project live.</p>
                </div>
              ) : (
                folderFiles.map((file, idx) => {
                  const isSelected = activeImage === file.url;
                  return (
                    <div
                      key={idx}
                      onClick={() => file.type === 'image' && setActiveImage(file.url)}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 10,
                        border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                        background: isSelected ? 'rgba(79, 131, 246, 0.12)' : 'var(--s2)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        cursor: file.type === 'image' ? 'pointer' : 'default',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {file.type === 'image' ? (
                        <ImageIcon size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                      ) : (
                        <FileText size={16} style={{ color: 'var(--purple)', flexShrink: 0 }} />
                      )}
                      <div style={{ overflow: 'hidden' }}>
                        <p style={{ margin: 0, fontSize: '0.775rem', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {file.name}
                        </p>
                        <p style={{ margin: '2px 0 0 0', fontSize: '0.675rem', color: 'var(--muted)' }}>
                          {(file.sizeBytes / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* SLIDE DECK ARCHIVE / SCENE HISTORY */}
          {slideHistory.length > 0 && (
            <div style={{
              background: 'var(--s1)',
              border: `1px solid var(--border)`,
              borderRadius: 24,
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
            }}>
              <h2 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <History size={16} style={{ color: 'var(--purple)' }} /> Generated Slide Deck ({slideHistory.length})
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
                {slideHistory.map((slide, idx) => (
                  <div
                    key={slide.id || idx}
                    onClick={() => {
                      setProjectTitle(slide.title);
                      setSubtitle(slide.subtitle || '');
                      setBulletPoints([...slide.bullets]);
                      setKeyPoints([...slide.keyPoints]);
                      setHighlightSentence(slide.highlight || '');
                      setActiveImage(slide.image || null);
                    }}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 12,
                      background: 'var(--s2)',
                      border: `1px solid var(--border)`,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ overflow: 'hidden' }}>
                      <p style={{ margin: 0, fontSize: '0.775rem', fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        Slide {idx + 1}: {slide.title}
                      </p>
                      <p style={{ margin: '2px 0 0 0', fontSize: '0.675rem', color: 'var(--muted)' }}>
                        {slide.bullets.length} bullets • {slide.timestamp}
                      </p>
                    </div>
                    <ChevronRight size={14} style={{ color: 'var(--muted)' }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI OPERATOR STATUS CARD */}
          <div style={{
            background: 'var(--s1)',
            border: `1px solid var(--border)`,
            borderRadius: 20,
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 8
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--muted)' }}>
              <Wand2 size={14} style={{ color: isAiProcessing ? 'var(--accent)' : 'inherit' }} className={isAiProcessing ? 'animate-spin' : ''} />
              <span>AI Engine: <strong style={{ color: 'var(--accent)' }}>{isAiProcessing ? 'Polishing Speech...' : 'Ready'}</strong></span>
            </div>
            <p style={{ margin: 0, fontSize: '0.725rem', color: 'var(--muted)', lineHeight: 1.4 }}>
              Speak naturally. Vedika automatically formats titles, extracts bullets, and projects visual assets on the fly.
            </p>
          </div>

        </div>

        {/* RIGHT PRESENTATION STAGE CANVAS */}
        <div style={{
          background: 'var(--s1)',
          border: `1px solid var(--border)`,
          borderRadius: 24,
          padding: isMobile ? 18 : 32,
          position: 'relative',
          minHeight: 600,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.05)'
        }}>
          
          {/* TOP LIVE STAGE HUD BANNER */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: `1px solid var(--border)`,
            paddingBottom: 14,
            zIndex: 10
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: isStarted ? 'var(--green)' : 'var(--muted)'
              }} className={isStarted ? 'animate-ping' : ''} />
              <span style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.08em', color: isStarted ? 'var(--green)' : 'var(--muted)' }}>
                {isStarted ? 'LIVE PRESENTATION STAGE' : 'STAGE READY'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={clearAll}
                style={{
                  padding: '6px 12px',
                  background: 'var(--s2)',
                  border: `1px solid var(--border)`,
                  borderRadius: 8,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <Trash2 size={13} />
                <span>Clear Stage</span>
              </button>
            </div>
          </div>

          {/* MAIN LAUNCH STAGE CANVAS */}
          <div style={{ margin: 'auto 0', padding: '24px 0', zIndex: 10, display: 'flex', flexDirection: 'column', gap: 24 }}>
            
            {/* PROJECT TITLE */}
            {projectTitle ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <h1 style={{
                  margin: 0,
                  fontSize: isMobile ? '1.8rem' : '2.5rem',
                  fontWeight: 900,
                  background: 'linear-gradient(135deg, var(--text) 0%, var(--accent) 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  lineHeight: 1.2
                }}>
                  {projectTitle}
                </h1>
                {subtitle && <p style={{ margin: 0, fontSize: '1.1rem', color: 'var(--accent)', fontWeight: 600 }}>{subtitle}</p>}
              </div>
            ) : !highlightSentence && bulletPoints.length === 0 && !activeImage && (
              <div style={{ textAlign: 'center', padding: '48px 16px', opacity: 0.85 }}>
                <Presentation size={44} style={{ color: 'var(--accent)', margin: '0 auto 12px auto' }} />
                <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: 'var(--text)' }}>Your AI Presentation Stage is Ready</h2>
                <p style={{ margin: '8px auto 0 auto', fontSize: '0.85rem', color: 'var(--muted)', maxWidth: 440, lineHeight: 1.5 }}>
                  Click <strong style={{ color: 'var(--accent)' }}>Start Presentation</strong> and begin speaking. Vedika automatically formats your speech into live presentation slides in real-time.
                </p>
              </div>
            )}

            {/* HIGHLIGHT SENTENCE BANNER */}
            {highlightSentence && (
              <div style={{
                padding: 24,
                borderRadius: 20,
                background: 'linear-gradient(135deg, rgba(79, 131, 246, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)',
                border: '1px solid var(--accent)',
                boxShadow: '0 8px 32px rgba(79, 131, 246, 0.15)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent)', letterSpacing: '0.08em', marginBottom: 8 }}>
                  <Activity size={14} />
                  <span>KEY HIGHLIGHT</span>
                </div>
                <p style={{ margin: 0, fontSize: isMobile ? '1.25rem' : '1.75rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1.4 }}>
                  "{highlightSentence}"
                </p>
              </div>
            )}

            {/* BULLET POINTS LIST */}
            {bulletPoints.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {bulletPoints.map((bullet, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12,
                      padding: 14,
                      borderRadius: 14,
                      background: 'var(--s2)',
                      border: `1px solid var(--border)`,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                    }}
                  >
                    <div style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: 'var(--accent)',
                      marginTop: 6,
                      flexShrink: 0
                    }} />
                    <p style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: 'var(--text)', lineHeight: 1.4 }}>{bullet}</p>
                  </div>
                ))}
              </div>
            )}

            {/* KEY POINTS GRID */}
            {keyPoints.length > 0 && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                gap: 14
              }}>
                {keyPoints.map((kp, idx) => (
                  <div key={idx} style={{
                    padding: 16,
                    borderRadius: 16,
                    background: 'var(--s2)',
                    border: `1px solid var(--border)`
                  }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--purple)', marginBottom: 4 }}>
                      KEY TAKEAWAY #{idx + 1}
                    </div>
                    <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)' }}>{kp}</p>
                  </div>
                ))}
              </div>
            )}

            {/* MATCHED IMAGE DISPLAY */}
            {activeImage && (
              <div style={{
                position: 'relative',
                borderRadius: 20,
                overflow: 'hidden',
                border: `1px solid var(--border)`,
                maxHeight: 380,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--s2)'
              }}>
                <img src={activeImage} alt="Presentation Asset" style={{ maxHeight: 380, width: 'auto', maxWidth: '100%', objectFit: 'contain', borderRadius: 20 }} />
                <button
                  onClick={() => setActiveImage(null)}
                  style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    padding: 6,
                    borderRadius: '50%',
                    background: 'rgba(0, 0, 0, 0.6)',
                    color: '#FFFFFF',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {/* GENERAL SPEECH PARAGRAPH */}
            {speechParagraph && !highlightSentence && (
              <div style={{
                padding: 16,
                borderRadius: 14,
                background: 'var(--s2)',
                border: `1px solid var(--border)`,
                color: 'var(--text)',
                fontStyle: 'italic',
                fontSize: '1rem',
                lineHeight: 1.5
              }}>
                "{speechParagraph}"
              </div>
            )}
          </div>

          {/* BOTTOM REAL-TIME TELEPROMPTER & INTERIM FEEDBACK */}
          <div style={{
            zIndex: 10,
            background: 'var(--s2)',
            border: `1px solid var(--border)`,
            borderRadius: 16,
            padding: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 14,
            backdropFilter: 'blur(8px)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, overflow: 'hidden' }}>
              <div style={{
                padding: 8,
                borderRadius: 10,
                background: isListening ? 'rgba(79, 131, 246, 0.15)' : 'var(--s1)',
                color: isListening ? 'var(--accent)' : 'var(--muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Mic size={18} />
              </div>
              <div style={{ overflow: 'hidden' }}>
                <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 600 }}>Live Presenter Teleprompter</p>
                <p style={{
                  margin: '2px 0 0 0',
                  fontSize: '0.85rem',
                  fontFamily: 'monospace',
                  color: 'var(--accent)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: isMobile ? 220 : 540
                }}>
                  {interimSpeech || speechBuffer || 'Listening to presenter speech...'}
                </p>
              </div>
            </div>

            {isAiProcessing && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--purple)', fontWeight: 700, flexShrink: 0 }}>
                <RefreshCw size={14} className="animate-spin" />
                <span>AI Formatting...</span>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
