import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, CheckCircle2, Trash2, ArrowLeft, Radio, Sparkles } from 'lucide-react';
import './styles/voice.css';

export default function ModuleC_VoiceHUD() {
  const [isStarted, setIsStarted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interimSpeech, setInterimSpeech] = useState('');
  const [speechParagraph, setSpeechParagraph] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [bulletPoints, setBulletPoints] = useState([]);
  const [keyPoints, setKeyPoints] = useState([]);
  const [isHighlight, setIsHighlight] = useState(false);

  const recognitionRef = useRef(null);

  // Ensure Module C defaults to Dark Mode
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
  }, []);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

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
            // Strip leading "start" if present in live preview
            if (/^start\b/i.test(transcriptText)) {
              transcriptText = transcriptText.replace(/^start\b\s*/i, '');
            }
            interim += transcriptText;
          }
        }

        setInterimSpeech(interim);
      };

      recognition.onerror = (err) => {
        console.warn('Speech recognition error:', err.error);
      };

      recognitionRef.current = recognition;
    }
  }, []);

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
      recognitionRef.current.stop();
    }
    setIsListening(false);
    setIsStarted(false);
    clearAll();
  };

  const toggleMic = () => {
    if (!recognitionRef.current) {
      alert('Web Speech API is not supported in this browser. Please use Google Chrome or Edge.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
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

  const [activeArch, setActiveArch] = useState(null); // 'module_a' | 'module_b' | 'module_c' | null
  const isBulletModeRef = useRef(false);
  const [isBulletMode, setIsBulletMode] = useState(false);
  const speechTimeoutRef = useRef(null);

  const clearAll = () => {
    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
    }
    isBulletModeRef.current = false;
    setIsBulletMode(false);
    setActiveArch(null);
    setProjectTitle('');
    setSpeechParagraph('');
    setInterimSpeech('');
    setBulletPoints([]);
    setKeyPoints([]);
    setIsHighlight(false);
  };

  const handleFinalSentence = (sentence) => {
    if (!sentence) return;
    let text = sentence.trim();

    // 1. First word "start" treated as trigger command -> strip it silently
    if (/^start\b/i.test(text)) {
      text = text.replace(/^start\b\s*/i, '');
      if (!text) return;
    }

    const lower = text.toLowerCase();

    // 2. Voice Command: Reset / Clear Screen
    if (lower.includes('clear screen') || lower.includes('reset screen') || lower.includes('stop presentation') || lower.includes('hide architecture')) {
      clearAll();
      return;
    }

    // 3. Voice Command: Module Architecture Popups ("module a architecture", "module b architecture", "module c architecture")
    if (/\b(?:module a architecture|architecture module a|show module a|module a)\b/i.test(text)) {
      setActiveArch('module_a');
      return;
    }
    if (/\b(?:module b architecture|architecture module b|show module b|module b)\b/i.test(text)) {
      setActiveArch('module_b');
      return;
    }
    if (/\b(?:module c architecture|architecture module c|show module c|module c)\b/i.test(text)) {
      setActiveArch('module_c');
      return;
    }

    // 3. Voice Command: Project Title / Project Name ("my project name...", "project title...", "my project is...")
    const projectTitleMatch = text.match(/\b(?:my project name|project title|my project is|project name)\s+(.+)/i);
    if (projectTitleMatch) {
      const titleText = projectTitleMatch[1].trim();
      if (titleText) {
        setProjectTitle(titleText);
      }
      return;
    }

    // 4. Voice Command: Key Point Card ("key point...", "main point...", "fact...")
    const keyPointMatch = text.match(/\b(?:key point|main point|fact)\s+(.+)/i);
    if (keyPointMatch) {
      const kpText = keyPointMatch[1].trim();
      if (kpText) {
        setKeyPoints(prev => [...prev, kpText]);
      }
      return;
    }

    // 5. Voice Command: Highlight / Emphasis Phrase ("highlight...", "emphasis...", "bold...")
    const highlightMatch = text.match(/\b(?:highlight|emphasis|bold)\s+(.+)/i);
    if (highlightMatch) {
      const hlText = highlightMatch[1].trim();
      if (hlText) {
        setIsHighlight(true);
        setSpeechParagraph(hlText);
        if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
        speechTimeoutRef.current = setTimeout(() => {
          setSpeechParagraph('');
          setIsHighlight(false);
        }, 3000);
      }
      return;
    }

    // 6. Voice Command: End Bullet Mode ("end bullet", "stop bullet", "exit bullet", "close bullet")
    if (/\b(end bullet|stop bullet|exit bullet|close bullet)\b/i.test(text)) {
      isBulletModeRef.current = false;
      setIsBulletMode(false);
      setSpeechParagraph('');
      return;
    }

    // 7. Voice Command: Bullet Mode Trigger ("next bullet", "bullet", "new bullet", "add bullet", "bullet point")
    const isBulletTrigger = /\b(next bullet|new bullet|add bullet|start bullet|bullet point|bullet)\b/i.test(text);

    if (isBulletTrigger) {
      isBulletModeRef.current = true;
      setIsBulletMode(true);

      // Clear any active transient speech paragraph
      setSpeechParagraph('');

      // Strip trigger command completely so trigger words are never printed
      let cleanText = text
        .replace(/\b(next bullet|new bullet|add bullet|start bullet|bullet point|bullet|highlight|emphasis)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();

      // Start a NEW bullet point
      setBulletPoints(prev => [...prev, cleanText]);
      return;
    }

    // 8. If currently inside Bullet Mode -> Append text to active bullet point
    if (isBulletModeRef.current) {
      let cleanText = text
        .replace(/highlight|emphasis/gi, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (cleanText) {
        setBulletPoints(prev => {
          if (prev.length === 0) return [cleanText];
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          updated[lastIdx] = updated[lastIdx] ? `${updated[lastIdx]} ${cleanText}` : cleanText;
          return updated;
        });
      }
      return;
    }

    // 9. Transient Speech Mode (Normal Speech): Display text live while speaking, auto-clear on 1.8s pause
    let cleanText = text
      .replace(/highlight|emphasis/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (cleanText) {
      setSpeechParagraph(cleanText);

      // Reset auto-clear timer: After 1.8 seconds of pause/silence, clear the transient speech from screen
      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current);
      }
      speechTimeoutRef.current = setTimeout(() => {
        setSpeechParagraph('');
      }, 1800);
    }
  };

  return (
    <div className="main-content padding-0">
      {!isStarted ? (
        /* INITIAL CLEAN MINIMALIST VIEW: CENTERED START BUTTON + MIC ICON */
        <div className="voice-start-stage">
          <div className="start-hero-card">
            <div className="start-icon-pulse">
              <Radio size={36} className="text-cyan" />
            </div>
            <h1 className="heading-xl font-classic mb-2">Voice Presentation HUD</h1>
            <p className="subtext font-mono mb-6">Click Start to begin hands-free voice presentation mode</p>

            <button
              id="start-presentation-btn"
              aria-label="Start Voice Presentation"
              className="btn-start-hero"
              onClick={startPresentation}
            >
              <span>Start</span>
              <Mic size={24} className="mic-hero-icon" />
            </button>
          </div>
        </div>
      ) : (
        /* ACTIVE PRESENTATION VIEW: BLANK PAGE WITH BOLD CLASSIC TYPOGRAPHY */
        <div className="blank-presentation-canvas">
          {/* Subtle Floating Control Top Bar */}
          <div className="floating-hud-controls">
            <button
              className="floating-back-btn"
              onClick={stopPresentation}
              title="Exit Presentation"
            >
              <ArrowLeft size={16} /> Exit
            </button>

            <div className="flex-row-center gap-2">
              <button
                className={`floating-mic-btn ${isListening ? 'active' : ''}`}
                onClick={toggleMic}
                title={isListening ? 'Mute Mic' : 'Unmute Mic'}
              >
                {isListening ? <Mic size={16} /> : <MicOff size={16} />}
                <span>{isListening ? 'MIC LIVE' : 'MIC PAUSED'}</span>
              </button>

              <button className="floating-icon-btn" onClick={clearAll} title="Clear Screen">
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          {/* MAIN BLANK CANVAS PRESENTATION AREA */}
          <div className="canvas-content-box">
            {activeArch || projectTitle || speechParagraph || interimSpeech || bulletPoints.length > 0 || keyPoints.length > 0 ? (
              <div className="classic-presentation-wrapper">
                {/* Voice-Triggered Module Architecture Diagrams */}
                {activeArch === 'module_a' && (
                  <div className="architecture-popup-card mb-6" style={{ background: 'rgba(15, 23, 42, 0.9)', padding: '24px', borderRadius: '16px', border: '1px solid #38bdf8' }}>
                    <div className="flex-between mb-3">
                      <h2 className="heading-lg text-cyan flex-row-center gap-2">
                        <Radio size={20} /> Module A: Industrial IoT Architecture
                      </h2>
                      <button className="btn btn-xs btn-secondary" onClick={() => setActiveArch(null)}>Hide</button>
                    </div>
                    <svg width="780" height="180" viewBox="0 0 780 180" fill="none" style={{ margin: '0 auto', display: 'block' }}>
                      <rect x="10" y="30" width="160" height="120" rx="10" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
                      <text x="90" y="65" fill="#f8fafc" fontSize="12" textAnchor="middle" fontWeight="bold">32 Industrial Nodes</text>
                      <text x="90" y="85" fill="#38bdf8" fontSize="10" textAnchor="middle">ESP32 + Telemetry</text>
                      <text x="90" y="110" fill="#34d399" fontSize="10" textAnchor="middle">Detroit & Houston Sites</text>

                      <path d="M170 90 H260" stroke="#38bdf8" strokeWidth="2" strokeDasharray="4 4" />
                      <polygon points="260,90 252,85 252,95" fill="#38bdf8" />

                      <rect x="260" y="30" width="160" height="120" rx="10" fill="#0f172a" stroke="#818cf8" strokeWidth="2" />
                      <text x="340" y="65" fill="#f8fafc" fontSize="12" textAnchor="middle" fontWeight="bold">Aedes MQTT Broker</text>
                      <text x="340" y="85" fill="#818cf8" fontSize="10" textAnchor="middle">Port 1883 (Pub/Sub)</text>
                      <text x="340" y="110" fill="#94a3b8" fontSize="10" textAnchor="middle">Topic: telemetry/nodes/#</text>

                      <path d="M420 90 H510" stroke="#818cf8" strokeWidth="2" />
                      <polygon points="510,90 502,85 502,95" fill="#818cf8" />

                      <rect x="510" y="30" width="150" height="120" rx="10" fill="#0f172a" stroke="#34d399" strokeWidth="2" />
                      <text x="585" y="65" fill="#f8fafc" fontSize="12" textAnchor="middle" fontWeight="bold">Express API Backend</text>
                      <text x="585" y="85" fill="#34d399" fontSize="10" textAnchor="middle">Socket.io Dispatcher</text>
                      <text x="585" y="110" fill="#fbbf24" fontSize="10" textAnchor="middle">PostgreSQL Logging</text>

                      <path d="M660 90 H710" stroke="#34d399" strokeWidth="2" />
                      <polygon points="710,90 702,85 702,95" fill="#34d399" />

                      <rect x="710" y="45" width="60" height="90" rx="8" fill="#0f172a" stroke="#fbbf24" strokeWidth="2" />
                      <text x="740" y="95" fill="#fbbf24" fontSize="11" textAnchor="middle" fontWeight="bold">React HUD</text>
                    </svg>
                  </div>
                )}

                {activeArch === 'module_b' && (
                  <div className="architecture-popup-card mb-6" style={{ background: 'rgba(15, 23, 42, 0.9)', padding: '24px', borderRadius: '16px', border: '1px solid #34d399' }}>
                    <div className="flex-between mb-3">
                      <h2 className="heading-lg text-emerald flex-row-center gap-2">
                        <CheckCircle2 size={20} /> Module B: EvalBridge Architecture
                      </h2>
                      <button className="btn btn-xs btn-secondary" onClick={() => setActiveArch(null)}>Hide</button>
                    </div>
                    <svg width="780" height="160" viewBox="0 0 780 160" fill="none" style={{ margin: '0 auto', display: 'block' }}>
                      <rect x="20" y="30" width="180" height="100" rx="10" fill="#0f172a" stroke="#34d399" strokeWidth="2" />
                      <text x="110" y="65" fill="#f8fafc" fontSize="12" textAnchor="middle" fontWeight="bold">Student Submission</text>
                      <text x="110" y="85" fill="#34d399" fontSize="10" textAnchor="middle">Public URL / Repo Link</text>

                      <path d="M200 80 H300" stroke="#34d399" strokeWidth="2" />
                      <polygon points="300,80 292,75 292,85" fill="#34d399" />

                      <rect x="300" y="30" width="180" height="100" rx="10" fill="#0f172a" stroke="#fbbf24" strokeWidth="2" />
                      <text x="390" y="65" fill="#f8fafc" fontSize="12" textAnchor="middle" fontWeight="bold">Tunneling Gateway</text>
                      <text x="390" y="85" fill="#fbbf24" fontSize="10" textAnchor="middle">Pinggy / Ngrok HTTPS</text>

                      <path d="M480 80 H580" stroke="#fbbf24" strokeWidth="2" />
                      <polygon points="580,80 572,75 572,85" fill="#fbbf24" />

                      <rect x="580" y="30" width="180" height="100" rx="10" fill="#0f172a" stroke="#818cf8" strokeWidth="2" />
                      <text x="670" y="65" fill="#f8fafc" fontSize="12" textAnchor="middle" fontWeight="bold">Trainer Evaluation Queue</text>
                      <text x="670" y="85" fill="#818cf8" fontSize="10" textAnchor="middle">Live Screenshot Capture</text>
                    </svg>
                  </div>
                )}

                {activeArch === 'module_c' && (
                  <div className="architecture-popup-card mb-6" style={{ background: 'rgba(15, 23, 42, 0.9)', padding: '24px', borderRadius: '16px', border: '1px solid #fbbf24' }}>
                    <div className="flex-between mb-3">
                      <h2 className="heading-lg text-amber flex-row-center gap-2">
                        <Sparkles size={20} /> Module C: Voice Presentation HUD Architecture
                      </h2>
                      <button className="btn btn-xs btn-secondary" onClick={() => setActiveArch(null)}>Hide</button>
                    </div>
                    <svg width="780" height="160" viewBox="0 0 780 160" fill="none" style={{ margin: '0 auto', display: 'block' }}>
                      <rect x="20" y="30" width="180" height="100" rx="10" fill="#0f172a" stroke="#fbbf24" strokeWidth="2" />
                      <text x="110" y="65" fill="#f8fafc" fontSize="12" textAnchor="middle" fontWeight="bold">Web Speech API</text>
                      <text x="110" y="85" fill="#fbbf24" fontSize="10" textAnchor="middle">Realtime Audio Stream</text>

                      <path d="M200 80 H300" stroke="#fbbf24" strokeWidth="2" />
                      <polygon points="300,80 292,75 292,85" fill="#fbbf24" />

                      <rect x="300" y="30" width="180" height="100" rx="10" fill="#0f172a" stroke="#818cf8" strokeWidth="2" />
                      <text x="390" y="65" fill="#f8fafc" fontSize="12" textAnchor="middle" fontWeight="bold">Voice Command Parser</text>
                      <text x="390" y="85" fill="#818cf8" fontSize="10" textAnchor="middle">Regex Intent Engine</text>

                      <path d="M480 80 H580" stroke="#818cf8" strokeWidth="2" />
                      <polygon points="580,80 572,75 572,85" fill="#818cf8" />

                      <rect x="580" y="30" width="180" height="100" rx="10" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
                      <text x="670" y="65" fill="#f8fafc" fontSize="12" textAnchor="middle" fontWeight="bold">Teleprompter Canvas</text>
                      <text x="670" y="85" fill="#38bdf8" fontSize="10" textAnchor="middle">Transient Speech & Bullets</text>
                    </svg>
                  </div>
                )}

                {/* Hero Project Title Card */}
                {projectTitle && (
                  <div className="classic-project-title">
                    <Sparkles size={32} className="text-amber" />
                    <span>{projectTitle}</span>
                  </div>
                )}

                {/* Classic Bold Paragraph Text */}
                {(speechParagraph || (!isBulletMode && interimSpeech)) && (
                  <p className={`classic-speech-bold ${isHighlight ? 'highlight-gold' : ''}`}>
                    {speechParagraph}
                    {!isBulletMode && interimSpeech && <span className="interim-text"> {interimSpeech}...</span>}
                  </p>
                )}

                {/* Rendered Bullet Points */}
                {(bulletPoints.length > 0 || (isBulletMode && interimSpeech)) && (
                  <div className="classic-bullets-wrapper mt-6">
                    {bulletPoints.map((bp, idx) => (
                      <div key={idx} className="classic-bullet-item">
                        <CheckCircle2 size={24} className="text-cyan shrink-0" />
                        <span className="classic-bullet-text">
                          {bp}
                          {isBulletMode && idx === bulletPoints.length - 1 && interimSpeech && (
                            <span className="interim-text"> {interimSpeech}...</span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Rendered Key Points */}
                {keyPoints.length > 0 && (
                  <div className="classic-keypoints-grid mt-6">
                    {keyPoints.map((kp, idx) => (
                      <div key={idx} className="classic-keypoint-card">
                        <div className="classic-keypoint-header">
                          <Sparkles size={14} className="text-amber" /> Key Point #{idx + 1}
                        </div>
                        <p className="classic-keypoint-text">{kp}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="listening-prompt-center">
                <p className="prompt-pulse-text">Listening... Say "start [your speech]"</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
