'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, CheckCircle2, Trash2, ArrowLeft, Radio, Sparkles, 
  HelpCircle, Plus, X, Layers, Activity, Command, Layout, Eye, ChevronRight,
  FolderPlus, Folder, Image as ImageIcon, FileText, Upload, RefreshCw, Wand2, Sparkle
} from 'lucide-react';
import { T } from '@/lib/lms-data';

export default function DynamicPresentation() {
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
  const [activeArch, setActiveArch] = useState(null);

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

  // Initialize Speech Recognition API with Two-Pass AI processing
  useEffect(() => {
    const SpeechRecognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

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

      recognition.onerror = (err) => {
        console.warn('Speech recognition notice:', err.error);
      };

      recognitionRef.current = recognition;
    }
  }, [selectedFolder, folderFiles]);

  const handleFinalSentence = (sentence) => {
    if (!sentence || !sentence.trim()) return;
    const text = sentence.trim();
    const lower = text.toLowerCase();

    // Check for clear screen command
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
      setProjectTitle(formattedText);
    } else if (elementType === 'subtitle') {
      setSubtitle(formattedText);
    } else if (elementType === 'bullet_point') {
      setBulletPoints(prev => [...prev.slice(-6), formattedText]);
    } else if (elementType === 'highlight_sentence') {
      setHighlightSentence(formattedText);
      setTimeout(() => setHighlightSentence(''), 6000);
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
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.warn('Mic start notice:', err);
      }
    }
  };

  const stopPresentation = () => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setIsListening(false);
    setIsStarted(false);
    clearAll();
  };

  const toggleMic = () => {
    if (!recognitionRef.current) {
      alert('Web Speech API is not supported in this browser.');
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      setIsListening(false);
      setInterimSpeech('');
    } else {
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
    setActiveArch(null);
  };

  return (
    <div className="w-full min-h-screen bg-slate-950 text-white font-sans selection:bg-indigo-500 selection:text-white pb-16">
      {/* HEADER CONTROLS */}
      <div className="w-full bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-50">
        <div className="flex items-center space-x-3">
          <a href="/" className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition">
            <ArrowLeft size={18} />
          </a>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent flex items-center gap-2">
              <Sparkles size={20} className="text-cyan-400 animate-pulse" />
              Dynamic Presentation HUD
            </h1>
            <p className="text-xs text-slate-400">AI Launch Event Presentation Operator for Vedika</p>
          </div>
        </div>

        {/* WORKSPACE FOLDER SELECTOR */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
            <Folder size={16} className="text-indigo-400" />
            <select
              value={selectedFolder}
              onChange={(e) => setSelectedFolder(e.target.value)}
              className="bg-transparent text-sm text-slate-200 outline-none cursor-pointer"
            >
              {folders.length === 0 ? (
                <option value="">No Presentation Folders</option>
              ) : (
                folders.map((f) => (
                  <option key={f.name} value={f.name} className="bg-slate-900 text-slate-200">
                    📁 {f.name} ({f.filesCount} assets)
                  </option>
                ))
              )}
            </select>
          </div>

          <button
            onClick={() => setIsCreatingFolder(true)}
            className="p-2 bg-indigo-600/80 hover:bg-indigo-600 rounded-xl text-white text-xs font-medium flex items-center space-x-1.5 transition"
            title="Create Presentation Folder"
          >
            <FolderPlus size={16} />
            <span className="hidden sm:inline">New Folder</span>
          </button>

          {/* MIC CONTROLS */}
          {isStarted && (
            <button
              onClick={toggleMic}
              className={`p-2.5 rounded-xl text-white font-medium flex items-center space-x-2 transition ${
                isListening ? 'bg-red-500/80 animate-pulse' : 'bg-slate-700 hover:bg-slate-600'
              }`}
            >
              {isListening ? <Mic size={18} /> : <MicOff size={18} />}
              <span className="text-xs">{isListening ? 'Listening' : 'Muted'}</span>
            </button>
          )}

          {!isStarted ? (
            <button
              onClick={startPresentation}
              className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold rounded-xl text-sm shadow-lg shadow-indigo-500/25 flex items-center space-x-2 transition"
            >
              <Radio size={16} className="animate-spin" />
              <span>Start Presentation</span>
            </button>
          ) : (
            <button
              onClick={stopPresentation}
              className="px-4 py-2 bg-slate-800 hover:bg-red-900/60 border border-slate-700 hover:border-red-500/50 text-slate-300 hover:text-red-200 font-medium rounded-xl text-sm transition"
            >
              Exit Stage
            </button>
          )}
        </div>
      </div>

      {/* CREATE FOLDER MODAL */}
      {isCreatingFolder && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <FolderPlus className="text-indigo-400" size={20} /> Create Presentation Folder
              </h3>
              <button onClick={() => setIsCreatingFolder(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Dump all images, PDFs, and reference materials for a specific topic here. Vedika will index them to display live during your presentation.
            </p>
            <input
              type="text"
              placeholder="Folder Name (e.g. Product_Launch_2026)"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500 mb-4"
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setIsCreatingFolder(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFolder}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500"
              >
                Create Folder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT WORKSPACE */}
      <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* LEFT SIDEBAR: FOLDER MATERIAL ASSETS */}
        <div className="lg:col-span-1 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Layers size={16} className="text-cyan-400" /> Folder Assets
              </h2>
              <label className="p-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 rounded-lg cursor-pointer text-xs flex items-center space-x-1 border border-indigo-500/30 transition">
                <Upload size={14} />
                <span>Upload</span>
                <input type="file" multiple onChange={handleFileUpload} className="hidden" />
              </label>
            </div>

            {selectedFolder ? (
              <p className="text-xs text-slate-400 mb-3 truncate">
                Active Workspace: <span className="text-indigo-400 font-medium">{selectedFolder}</span>
              </p>
            ) : (
              <p className="text-xs text-slate-500 mb-3">No folder selected</p>
            )}

            {/* ASSET LIST GRID */}
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {folderFiles.length === 0 ? (
                <div className="text-center py-8 px-4 border border-dashed border-slate-800 rounded-xl">
                  <ImageIcon size={28} className="mx-auto text-slate-600 mb-2" />
                  <p className="text-xs text-slate-500">No assets in this folder.</p>
                  <p className="text-[11px] text-slate-600 mt-1">Upload images or PDFs for Vedika to auto-display during your presentation.</p>
                </div>
              ) : (
                folderFiles.map((file, idx) => (
                  <div
                    key={idx}
                    onClick={() => file.type === 'image' && setActiveImage(file.url)}
                    className={`p-2.5 rounded-xl border flex items-center space-x-3 cursor-pointer transition ${
                      activeImage === file.url
                        ? 'bg-indigo-950/80 border-indigo-500 text-indigo-200'
                        : 'bg-slate-800/40 border-slate-800/80 hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    {file.type === 'image' ? (
                      <ImageIcon size={18} className="text-cyan-400 shrink-0" />
                    ) : (
                      <FileText size={18} className="text-purple-400 shrink-0" />
                    )}
                    <div className="overflow-hidden">
                      <p className="text-xs font-medium truncate">{file.name}</p>
                      <p className="text-[10px] text-slate-500">{(file.sizeBytes / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* AI OPERATOR STATUS CARD */}
          <div className="mt-6 pt-4 border-t border-slate-800/80">
            <div className="flex items-center space-x-2 text-xs text-slate-400 mb-2">
              <Wand2 size={14} className={isAiProcessing ? 'text-cyan-400 animate-spin' : 'text-slate-500'} />
              <span>AI Operator Engine: {isAiProcessing ? 'Formatting Speech...' : 'Ready'}</span>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-[11px] text-slate-400">
              <p>Speak naturally. Vedika corrects stumbling in real-time and formats speech into titles, bullets, highlights, and images.</p>
            </div>
          </div>
        </div>

        {/* RIGHT PRESENTATION STAGE CANVAS */}
        <div className="lg:col-span-3 bg-slate-900/40 border border-slate-800 rounded-3xl p-8 relative min-h-[600px] flex flex-col justify-between overflow-hidden shadow-2xl backdrop-blur-xl">
          
          {/* Subtle Ambient Stage Lighting */}
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

          {/* TOP LIVE STAGE HUD BANNER */}
          <div className="flex items-center justify-between z-10 border-b border-slate-800/60 pb-4">
            <div className="flex items-center space-x-2">
              <div className={`w-2.5 h-2.5 rounded-full ${isStarted ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'}`} />
              <span className="text-xs font-semibold tracking-wider uppercase text-slate-400">
                {isStarted ? 'LIVE PRESENTATION STAGE' : 'STAGE READY'}
              </span>
            </div>
            <button
              onClick={clearAll}
              className="px-3 py-1 bg-slate-800/60 hover:bg-slate-800 text-xs text-slate-400 hover:text-white rounded-lg flex items-center space-x-1.5 transition"
            >
              <Trash2 size={13} />
              <span>Clear Stage</span>
            </button>
          </div>

          {/* MAIN LAUNCH STAGE CANVAS */}
          <div className="my-auto py-8 z-10 space-y-8">
            
            {/* PROJECT TITLE */}
            {projectTitle ? (
              <div className="space-y-2">
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
                  {projectTitle}
                </h1>
                {subtitle && <p className="text-lg text-indigo-300 font-medium">{subtitle}</p>}
              </div>
            ) : !highlightSentence && bulletPoints.length === 0 && !activeImage && (
              <div className="text-center py-16 space-y-3 opacity-60">
                <Sparkles size={40} className="mx-auto text-indigo-400/80 animate-pulse" />
                <h2 className="text-xl font-medium text-slate-300">Your AI Presentation Stage is Ready</h2>
                <p className="text-sm text-slate-500 max-w-md mx-auto">
                  Click <strong className="text-indigo-400">Start Presentation</strong> and begin speaking. Vedika automatically formats your speech into launch event slides in real-time.
                </p>
              </div>
            )}

            {/* HIGHLIGHT SENTENCE BANNER */}
            {highlightSentence && (
              <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-950/90 via-purple-950/80 to-slate-950 border border-indigo-500/40 shadow-xl shadow-indigo-950/50 transform transition-all duration-500">
                <div className="flex items-center space-x-2 text-xs font-bold text-cyan-400 uppercase tracking-widest mb-2">
                  <Sparkles size={14} />
                  <span>KEY HIGHLIGHT</span>
                </div>
                <p className="text-2xl md:text-3xl font-bold text-white leading-relaxed">
                  "{highlightSentence}"
                </p>
              </div>
            )}

            {/* BULLET POINTS LIST */}
            {bulletPoints.length > 0 && (
              <div className="space-y-3">
                {bulletPoints.map((bullet, idx) => (
                  <div
                    key={idx}
                    className="flex items-start space-x-3.5 p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 text-slate-100 shadow-md transition transform hover:translate-x-1"
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 mt-2 shrink-0 shadow-sm shadow-cyan-400" />
                    <p className="text-lg font-medium text-slate-200">{bullet}</p>
                  </div>
                ))}
              </div>
            )}

            {/* KEY POINTS GRID */}
            {keyPoints.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {keyPoints.map((kp, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-slate-200">
                    <div className="text-xs font-semibold text-purple-400 mb-1">KEY TAKEAWAY #{idx + 1}</div>
                    <p className="text-base font-semibold">{kp}</p>
                  </div>
                ))}
              </div>
            )}

            {/* MATCHED IMAGE DISPLAY */}
            {activeImage && (
              <div className="relative rounded-2xl overflow-hidden border border-slate-700/80 shadow-2xl max-h-[350px] flex items-center justify-center bg-slate-950">
                <img src={activeImage} alt="Presentation Asset" className="max-h-[350px] w-auto object-contain rounded-2xl" />
                <button
                  onClick={() => setActiveImage(null)}
                  className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-900/80 text-slate-300 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {/* GENERAL SPEECH PARAGRAPH */}
            {speechParagraph && !highlightSentence && (
              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/60 text-slate-300 italic text-base">
                "{speechParagraph}"
              </div>
            )}
          </div>

          {/* BOTTOM REAL-TIME TELEPROMPTER & INTERIM FEEDBACK */}
          <div className="z-10 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex items-center justify-between space-x-4 backdrop-blur-md">
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className={`p-2 rounded-xl ${isListening ? 'bg-indigo-600/30 text-indigo-400' : 'bg-slate-800 text-slate-500'}`}>
                <Mic size={18} />
              </div>
              <div className="overflow-hidden">
                <p className="text-xs text-slate-400 font-medium">Live Presenter Teleprompter</p>
                <p className="text-sm font-mono text-cyan-300 truncate max-w-xl">
                  {interimSpeech || speechBuffer || 'Listening to presenter speech...'}
                </p>
              </div>
            </div>

            {isAiProcessing && (
              <div className="flex items-center space-x-2 text-xs text-indigo-400 shrink-0">
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
