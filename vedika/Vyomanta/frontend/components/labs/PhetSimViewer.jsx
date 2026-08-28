'use client';

import React, { useState, useRef } from 'react';
import { 
  Maximize2, RotateCcw, BookOpen, HelpCircle, 
  ExternalLink, Layers, CheckCircle2, ChevronDown, Award, Send, Bot, RefreshCw
} from 'lucide-react';
import { PHET_SIMULATIONS, LAB_SUBJECT_METADATA } from '@/lib/phet-simulations';
import { T } from '@/lib/lms-data';

export default function PhetSimViewer({ subject = 'physics', activeSimId, onSelectSim, onViewModeChange, currentViewMode = 'phet' }) {
  const sims = PHET_SIMULATIONS[subject] || [];
  const activeSim = sims.find(s => s.id === activeSimId) || sims[0];
  const subjectMeta = LAB_SUBJECT_METADATA[subject] || LAB_SUBJECT_METADATA.physics;

  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('sim'); // 'sim', 'objectives', 'formulas', 'questions', 'ai'
  const [aiQuery, setAiQuery] = useState('');
  const [aiChat, setAiChat] = useState([
    { sender: 'ai', text: `Hello! I am Vedika, your ${subject.toUpperCase()} Science Tutor. Ask me any question about ${activeSim?.title || 'this experiment'}!` }
  ]);
  const [isAiThinking, setIsAiThinking] = useState(false);

  const containerRef = useRef(null);
  const iframeRef = useRef(null);

  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.warn('Fullscreen request failed:', err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const handleReloadIframe = () => {
    setIsLoading(true);
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
  };

  const handleAskAi = async (textToSend) => {
    const q = textToSend || aiQuery;
    if (!q.trim()) return;

    const userMsg = { sender: 'user', text: q };
    setAiChat(prev => [...prev, userMsg]);
    if (!textToSend) setAiQuery('');
    setIsAiThinking(true);

    try {
      const res = await fetch('/api/tutor/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Subject: ${subject}. Experiment: ${activeSim?.title}. Objective: ${activeSim?.description}. Student Question: ${q}`,
          subject: subject,
          history: aiChat.slice(-6).map(m => ({ role: m.sender === 'user' ? 'user' : 'model', content: m.text }))
        })
      });
      const data = await res.json();
      const aiReply = data.reply || data.response || "Based on the principles of this PhET experiment, observed variables adjust system equilibrium according to fundamental physical and chemical laws.";
      setAiChat(prev => [...prev, { sender: 'ai', text: aiReply }]);
    } catch (err) {
      setAiChat(prev => [...prev, { 
        sender: 'ai', 
        text: `Key Principle: In ${activeSim?.title}, the relevant laws are: ${activeSim?.keyFormulas?.join(', ')}. Keep experimenting with sliders and probes to observe system behavior!` 
      }]);
    } finally {
      setIsAiThinking(false);
    }
  };

  return (
    <div 
      ref={containerRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        minHeight: '85vh',
        background: '#090B13',
        color: T.text,
        borderRadius: 16,
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        fontFamily: 'var(--font-outfit), sans-serif'
      }}
    >
      {/* Top Header Control Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 20px',
        background: 'rgba(15, 20, 32, 0.95)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        gap: 12,
        flexWrap: 'wrap'
      }}>
        {/* Left: Experiment Selector & Subject Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            background: subjectMeta.gradient,
            color: '#fff',
            fontSize: 11,
            fontWeight: 800,
            padding: '4px 10px',
            borderRadius: 20,
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            HTML5 {subject.toUpperCase()} LAB
          </span>

          <div style={{ position: 'relative' }}>
            <select
              value={activeSim?.id}
              onChange={(e) => {
                setIsLoading(true);
                onSelectSim && onSelectSim(e.target.value);
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.07)',
                color: '#fff',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                padding: '8px 36px 8px 14px',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none',
                appearance: 'none'
              }}
            >
              {sims.map(sim => (
                <option key={sim.id} value={sim.id} style={{ background: '#0F1420', color: '#fff' }}>
                  🧪 {sim.title} ({sim.badge})
                </option>
              ))}
            </select>
            <ChevronDown size={16} color="#aaa" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          </div>
        </div>

        {/* Center: Dual Mode Switcher (HTML5 vs 3D WebGL) */}
        <div style={{
          display: 'flex',
          background: 'rgba(0, 0, 0, 0.4)',
          borderRadius: 10,
          padding: 3,
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <button
            onClick={() => onViewModeChange && onViewModeChange('phet')}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              border: 'none',
              background: currentViewMode === 'phet' ? subjectMeta.accentColor : 'transparent',
              color: currentViewMode === 'phet' ? '#fff' : '#999',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.2s'
            }}
          >
            <Maximize2 size={14} />
            Interactive HTML5 Sim
          </button>
          <button
            onClick={() => onViewModeChange && onViewModeChange('3d')}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              border: 'none',
              background: currentViewMode === '3d' ? subjectMeta.accentColor : 'transparent',
              color: currentViewMode === '3d' ? '#fff' : '#999',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.2s'
            }}
          >
            <Layers size={14} />
            3D WebGL Canvas
          </button>
        </div>

        {/* Right: Quick Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={handleReloadIframe}
            title="Reset / Reload Simulation"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#fff',
              padding: '8px 12px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <RotateCcw size={14} />
            Reset
          </button>

          <button
            onClick={handleToggleFullscreen}
            title="Fullscreen Mode"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#fff',
              padding: '8px 12px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Maximize2 size={14} />
            Fullscreen
          </button>
        </div>
      </div>

      {/* Tabs Row for Supplementary Lab Content */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        background: '#0D111A',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        padding: '0 16px',
        gap: 8,
        overflowX: 'auto'
      }}>
        {[
          { id: 'sim', label: 'Interactive Canvas', icon: Layers },
          { id: 'objectives', label: 'Objectives & Steps', icon: BookOpen },
          { id: 'formulas', label: 'Formulas & Principles', icon: Award },
          { id: 'questions', label: 'Viva & Self Test', icon: HelpCircle },
          { id: 'ai', label: 'Vedika AI Science Tutor', icon: Bot }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 16px',
                border: 'none',
                background: 'transparent',
                color: isActive ? subjectMeta.accentColor : '#888',
                borderBottom: isActive ? `2px solid ${subjectMeta.accentColor}` : '2px solid transparent',
                fontWeight: isActive ? 700 : 500,
                fontSize: 13,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                whiteSpace: 'nowrap'
              }}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', background: '#000' }}>
        
        {/* TAB 1: PhET Simulation iFrame View */}
        {activeTab === 'sim' && (
          <div style={{ width: '100%', height: '100%', minHeight: '650px', position: 'relative' }}>
            {isLoading && (
              <div style={{
                position: 'absolute',
                inset: 0,
                background: '#090B13',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 16,
                zIndex: 10
              }}>
                <RefreshCw size={36} color={subjectMeta.accentColor} style={{ animation: 'spin 1.2s linear infinite' }} />
                <div style={{ textAlign: 'center' }}>
                  <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: 0 }}>
                    Loading {activeSim?.title}...
                  </h3>
                  <p style={{ color: '#888', fontSize: 13, margin: '4px 0 0 0' }}>
                    Initializing Vedika Interactive STEM Engine
                  </p>
                </div>
              </div>
            )}

            <div style={{ width: '100%', height: '100%', minHeight: '650px', overflow: 'hidden', position: 'relative' }}>
              <iframe
                ref={iframeRef}
                src={`/api/phet-proxy?sim=${activeSim?.id}&url=${encodeURIComponent(activeSim?.embedUrl || '')}`}
                title={activeSim?.title}
                onLoad={() => setIsLoading(false)}
                allowFullScreen
                style={{
                  width: '100%',
                  height: 'calc(100% + 44px)',
                  marginBottom: '-44px',
                  minHeight: '694px',
                  border: 'none',
                  background: '#000'
                }}
              />
            </div>
          </div>
        )}

        {/* TAB 2: Objectives & Guided Lab Steps */}
        {activeTab === 'objectives' && (
          <div style={{ padding: 28, background: '#0A0E17', overflowY: 'auto', flex: 1 }}>
            <div style={{ maxWidth: 800, margin: '0 auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <span style={{ fontSize: 28 }}>🔬</span>
                <div>
                  <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: 0 }}>
                    {activeSim?.title}
                  </h2>
                  <p style={{ color: '#aaa', fontSize: 14, margin: '2px 0 0 0' }}>
                    {activeSim?.description}
                  </p>
                </div>
              </div>

              <div style={{
                background: 'rgba(255, 255, 255, 0.04)',
                borderRadius: 12,
                padding: 20,
                border: '1px solid rgba(255, 255, 255, 0.08)',
                marginBottom: 20
              }}>
                <h4 style={{ color: subjectMeta.accentColor, fontSize: 16, fontWeight: 700, margin: '0 0 12px 0' }}>
                  🎯 Core Learning Objectives
                </h4>
                <ul style={{ paddingLeft: 20, margin: 0, color: '#DDD', fontSize: 14, lineHeight: 1.7 }}>
                  {activeSim?.objectives?.map((obj, i) => (
                    <li key={i} style={{ marginBottom: 6 }}>{obj}</li>
                  ))}
                </ul>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setActiveTab('sim')}
                  style={{
                    background: subjectMeta.gradient,
                    color: '#fff',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: 8,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Return to Interactive Canvas →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Formulas & Principles */}
        {activeTab === 'formulas' && (
          <div style={{ padding: 28, background: '#0A0E17', overflowY: 'auto', flex: 1 }}>
            <div style={{ maxWidth: 800, margin: '0 auto' }}>
              <h3 style={{ color: '#fff', fontSize: 20, fontWeight: 800, marginBottom: 16 }}>
                📐 Key Equations & Scientific Principles
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: 16
              }}>
                {activeSim?.keyFormulas?.map((formula, idx) => (
                  <div key={idx} style={{
                    background: 'rgba(16, 185, 129, 0.08)',
                    border: `1px solid ${subjectMeta.accentColor}`,
                    borderRadius: 12,
                    padding: 18,
                    textAlign: 'center'
                  }}>
                    <span style={{ fontSize: 12, color: '#aaa', fontWeight: 600, textTransform: 'uppercase' }}>
                      Formula #{idx + 1}
                    </span>
                    <h4 style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: '8px 0 0 0', fontFamily: 'monospace' }}>
                      {formula}
                    </h4>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Viva & Self-Test Questions */}
        {activeTab === 'questions' && (
          <div style={{ padding: 28, background: '#0A0E17', overflowY: 'auto', flex: 1 }}>
            <div style={{ maxWidth: 800, margin: '0 auto' }}>
              <h3 style={{ color: '#fff', fontSize: 20, fontWeight: 800, marginBottom: 16 }}>
                ❓ Interactive Viva Questions for {activeSim?.title}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {activeSim?.guidedQuestions?.map((q, i) => (
                  <div key={i} style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 12,
                    padding: 18
                  }}>
                    <h4 style={{ color: subjectMeta.accentColor, fontSize: 15, fontWeight: 700, margin: '0 0 8px 0' }}>
                      Q{i + 1}: {q}
                    </h4>
                    <button
                      onClick={() => {
                        setActiveTab('ai');
                        handleAskAi(`Answer Viva Question Q${i+1}: ${q}`);
                      }}
                      style={{
                        background: 'rgba(255, 255, 255, 0.08)',
                        color: '#fff',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      <Bot size={13} />
                      Ask Vedika AI Tutor for Guided Solution
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: Integrated Vedika AI Tutor Assistant */}
        {activeTab === 'ai' && (
          <div style={{ padding: 24, background: '#0A0E17', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 450 }}>
            <div style={{ flex: 1, overflowY: 'auto', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {aiChat.map((msg, idx) => (
                <div 
                  key={idx}
                  style={{
                    alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '80%',
                    background: msg.sender === 'user' ? subjectMeta.accentColor : 'rgba(255, 255, 255, 0.08)',
                    color: '#fff',
                    padding: '12px 16px',
                    borderRadius: 12,
                    fontSize: 14,
                    lineHeight: 1.5
                  }}
                >
                  <strong>{msg.sender === 'user' ? 'You' : 'Vedika AI Tutor'}:</strong>
                  <div style={{ marginTop: 4 }}>{msg.text}</div>
                </div>
              ))}
              {isAiThinking && (
                <div style={{ alignSelf: 'flex-start', color: subjectMeta.accentColor, fontSize: 13, fontWeight: 600 }}>
                  Vedika AI Tutor is evaluating lab experiment data...
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAskAi()}
                placeholder={`Ask Vedika AI about ${activeSim?.title}...`}
                style={{
                  flex: 1,
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#fff',
                  padding: '12px 16px',
                  borderRadius: 8,
                  fontSize: 14,
                  outline: 'none'
                }}
              />
              <button
                onClick={() => handleAskAi()}
                style={{
                  background: subjectMeta.gradient,
                  color: '#fff',
                  border: 'none',
                  padding: '0 20px',
                  borderRadius: 8,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <Send size={16} />
                Ask AI
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
