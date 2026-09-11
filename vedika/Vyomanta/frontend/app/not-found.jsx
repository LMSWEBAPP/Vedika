'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import './not-found.css';
import { DiscoScene, DANCE_MOVE_CATALOG, AVATAR_LIST, DEFAULT_SPOTLIGHT_CONFIG } from './engine/DiscoScene';
import { DiscoAudioEngine } from './engine/DiscoAudioEngine';

const AVATAR_DOT_CLASSES = {
  mowgli: 'disco-dot-mowgli',
  belle: 'disco-dot-belle',
  moana: 'disco-dot-moana',
  bhageera: 'disco-dot-bhageera',
};

export default function NotFound() {
  if (typeof window !== 'undefined') {
    window.__IS_NOT_FOUND__ = true;
  }

  const mountRef = useRef(null);
  const sceneInstanceRef = useRef(null);
  const audioEngineRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [themeMode, setThemeMode] = useState('night');
  const [hudMinimized, setHudMinimized] = useState(false);

  // Dance Move Selector States
  const [dancePanelOpen, setDancePanelOpen] = useState(false);
  const [selectedAvatarIdx, setSelectedAvatarIdx] = useState(-1); // -1 = All Mascots
  const [currentDanceMove, setCurrentDanceMove] = useState('AUTO');

  // Spotlight Studio Tuner States
  const [spotlightPanelOpen, setSpotlightPanelOpen] = useState(false);
  const [spotlightConfig, setSpotlightConfig] = useState(DEFAULT_SPOTLIGHT_CONFIG);
  const [copiedToast, setCopiedToast] = useState(false);

  // Initialize Disco 3D Scene and Web Audio Engine
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__IS_NOT_FOUND__ = true;
    }
    if (!mountRef.current) return;

    // 1. Instantiate Three.js Disco Scene
    const scene = new DiscoScene(mountRef.current);
    sceneInstanceRef.current = scene;

    // Load saved custom spotlight values from localStorage if available
    try {
      const saved = localStorage.getItem('vedika_disco_spotlight_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        setSpotlightConfig(prev => ({ ...prev, ...parsed }));
        scene.setSpotlightConfig(parsed);
      }
    } catch {}

    // 2. Instantiate 70s-80s Funky Ambient Web Audio Engine
    const audio = new DiscoAudioEngine();
    audioEngineRef.current = audio;

    // Browser autoplay policy requires user interaction before audio plays
    const handleFirstInteraction = () => {
      if (audioEngineRef.current && !audioEngineRef.current.isPlaying) {
        audioEngineRef.current.start();
        setIsPlaying(true);
      }
      window.removeEventListener('pointerdown', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };

    window.addEventListener('pointerdown', handleFirstInteraction, { passive: true });
    window.addEventListener('keydown', handleFirstInteraction, { passive: true });

    // Cleanup on unmount
    return () => {
      window.removeEventListener('pointerdown', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
      if (sceneInstanceRef.current) {
        sceneInstanceRef.current.dispose();
        sceneInstanceRef.current = null;
      }
      if (audioEngineRef.current) {
        audioEngineRef.current.stop();
        audioEngineRef.current = null;
      }
    };
  }, []);


  // Audio mute/unmute toggle handler
  const handleToggleSound = useCallback(() => {
    if (!audioEngineRef.current) return;
    
    if (!isPlaying) {
      audioEngineRef.current.start();
      setIsPlaying(true);
      setIsMuted(false);
      return;
    }

    const muted = audioEngineRef.current.toggleMute();
    setIsMuted(muted);
  }, [isPlaying]);

  // Morning / Night Theme toggle handler
  const handleToggleTheme = useCallback(() => {
    if (!sceneInstanceRef.current) return;
    const isDay = sceneInstanceRef.current.toggleTheme();
    setThemeMode(isDay ? 'morning' : 'night');
  }, []);

  // Live Dance Move trigger handler
  const handleSelectMove = useCallback((moveId) => {
    setCurrentDanceMove(moveId);
    if (sceneInstanceRef.current) {
      sceneInstanceRef.current.triggerDanceMove(moveId, selectedAvatarIdx);
    }
  }, [selectedAvatarIdx]);

  // Target Performer selector handler
  const handleSelectAvatar = useCallback((idx) => {
    setSelectedAvatarIdx(idx);
    if (currentDanceMove && currentDanceMove !== 'AUTO' && sceneInstanceRef.current) {
      sceneInstanceRef.current.triggerDanceMove(currentDanceMove, idx);
    }
  }, [currentDanceMove]);

  // Reset to Auto AI Freestyle Groove
  const handleResetAuto = useCallback(() => {
    setCurrentDanceMove('AUTO');
    if (sceneInstanceRef.current) {
      sceneInstanceRef.current.triggerDanceMove('AUTO');
    }
  }, []);

  // Spotlight Studio live parameter updater
  const handleUpdateSpotlightParam = useCallback((key, value) => {
    setSpotlightConfig(prev => {
      const next = { ...prev, [key]: value };
      if (sceneInstanceRef.current) {
        sceneInstanceRef.current.setSpotlightConfig(next);
      }
      try {
        localStorage.setItem('vedika_disco_spotlight_config', JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  // Reset spotlight to clean defaults
  const handleResetSpotlight = useCallback(() => {
    setSpotlightConfig(DEFAULT_SPOTLIGHT_CONFIG);
    if (sceneInstanceRef.current) {
      sceneInstanceRef.current.setSpotlightConfig(DEFAULT_SPOTLIGHT_CONFIG);
    }
    try {
      localStorage.removeItem('vedika_disco_spotlight_config');
    } catch {}
  }, []);

  // Copy spotlight configuration to clipboard for developer to make permanent
  const handleCopySpotlightConfig = useCallback(() => {
    const jsonStr = JSON.stringify(spotlightConfig, null, 2);
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(jsonStr).then(() => {
        setCopiedToast(true);
        setTimeout(() => setCopiedToast(false), 3000);
      }).catch(() => {
        setCopiedToast(true);
        setTimeout(() => setCopiedToast(false), 3000);
      });
    } else {
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 3000);
    }
  }, [spotlightConfig]);

  return (
    <main className={`disco-root ${themeMode === 'morning' ? 'disco-theme-morning' : ''}`} id="disco-404-root">
      {/* Three.js Container */}
      <div ref={mountRef} className="disco-canvas-wrap" />

      {/* Cyber-Disco Glassmorphic HUD Overlay */}
      <div className="disco-hud">
        {/* Top Bar */}
        <header className="disco-header">
          <div className="disco-brand-pill">
            <span className="disco-beacon-dot" />
            <span>{themeMode === 'morning' ? 'VEDIKA MORNING LOUNGE' : 'VEDIKA DANCE LOUNGE'}</span>
          </div>

          <div className="disco-topbar-controls">
            {/* Spotlight Studio Tuner Toggle Button */}
            <button
              type="button"
              className={`disco-spotlight-btn ${spotlightPanelOpen ? 'disco-spotlight-btn-active' : ''}`}
              onClick={() => {
                setSpotlightPanelOpen(!spotlightPanelOpen);
                if (dancePanelOpen) setDancePanelOpen(false);
              }}
              aria-label="Toggle Spotlight Studio Tuner"
            >
              <span className="disco-spotlight-icon">🔦</span>
              <span className="disco-spotlight-label">Spotlight Tuner</span>
            </button>

            {/* Try Dance Moves Toggle Button */}
            <button
              type="button"
              className={`disco-moves-btn ${dancePanelOpen ? 'disco-moves-btn-active' : ''}`}
              onClick={() => {
                setDancePanelOpen(!dancePanelOpen);
                if (spotlightPanelOpen) setSpotlightPanelOpen(false);
              }}
              aria-label="Toggle dance moves selector"
            >
              <span className="disco-moves-icon">🕺</span>
              <span className="disco-moves-label">Try Dance Moves</span>
              <span className="disco-moves-count">{DANCE_MOVE_CATALOG.length}</span>
            </button>

            {/* Day / Night Theme Toggle */}
            <button
              type="button"
              className="disco-theme-btn"
              onClick={handleToggleTheme}
              aria-label={themeMode === 'morning' ? "Switch to Night Disco" : "Switch to Morning Light"}
            >
              <span className="disco-theme-icon">{themeMode === 'morning' ? '☀️' : '🌙'}</span>
              <span>{themeMode === 'morning' ? 'Morning Light' : 'Night Disco'}</span>
            </button>

            {/* Audio Toggle */}
            <button
              type="button"
              className="disco-audio-btn"
              onClick={handleToggleSound}
              aria-label={isMuted || !isPlaying ? "Unmute disco groove" : "Mute disco groove"}
            >
              <div className={`disco-eq-bars ${isPlaying && !isMuted ? 'disco-eq-active' : 'disco-eq-muted'}`}>
                <span className="disco-eq-bar" />
                <span className="disco-eq-bar" />
                <span className="disco-eq-bar" />
              </div>
              <span>{isMuted || !isPlaying ? 'Groove Off' : 'Groove On'}</span>
            </button>
          </div>
        </header>

        {/* Center / Bottom Error Card with Stage View Toggle */}
        <div className={`disco-center-hud ${hudMinimized ? 'disco-hud-minimized' : ''}`}>
          <button
            type="button"
            className="disco-hud-toggle-btn"
            onClick={() => setHudMinimized(!hudMinimized)}
            aria-label={hudMinimized ? "Expand 404 details" : "Minimize HUD to view stage"}
          >
            {hudMinimized ? 'Expand ↗' : 'Hide Card ↘'}
          </button>

          {hudMinimized ? (
            <div className="disco-minimized-row">
              <span className="disco-min-badge">404</span>
              <span className="disco-min-text">Lost In The Groove</span>
              <Link href="/" className="disco-min-home-link">
                Back To Safety →
              </Link>
            </div>
          ) : (
            <>
              <div className="disco-glitch-badge">
                <span>Room Not Found</span>
              </div>
              <h1 className="disco-error-num">404</h1>
              <h2 className="disco-title">Page Lost In The Groove</h2>
              <p className="disco-subtitle">
                The page you&apos;re looking for slipped away to party with Mowgli, Belle, Moana, and Bhageera under the disco lights.
              </p>

              <div className="disco-actions">
                <Link href="/" className="disco-btn-home">
                  <span className="disco-btn-icon">←</span>
                  <span>Back To Safety</span>
                </Link>
                <button
                  type="button"
                  className="disco-btn-secondary"
                  onClick={() => setDancePanelOpen(true)}
                >
                  <span>🕺 Choose Dance Moves</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Interactive Floor Hint */}
        <footer className="disco-footer">
          <div className="disco-interaction-hint">
            <span>Drag To Spin Disco Ball</span>
            <span className="disco-hint-bullet">•</span>
            <span>Click Avatars To Cheer</span>
            <span className="disco-hint-bullet">•</span>
            <span>Choose Dance Moves In Studio</span>
          </div>
        </footer>
      </div>

      {/* Interactive Dance Studio Drawer / Modal */}
      <aside className={`disco-dance-drawer ${dancePanelOpen ? 'disco-drawer-open' : ''}`} aria-label="Dance Move Selector">
        <div className="disco-drawer-header">
          <div className="disco-drawer-title-row">
            <span className="disco-drawer-badge">DANCE MOVE STUDIO</span>
            <button
              type="button"
              className="disco-drawer-close"
              onClick={() => setDancePanelOpen(false)}
              aria-label="Close dance studio"
            >
              ✕
            </button>
          </div>
          <h3 className="disco-drawer-heading">Choose Mascot Dance Moves</h3>
          <p className="disco-drawer-sub">Test 11 solo moves, 3 partner duets, and group sync in real-time.</p>
        </div>

        <div className="disco-drawer-scrollable">
          {/* Target Performer Selector */}
          <div className="disco-drawer-section">
            <div className="disco-section-title-row">
              <span className="disco-section-label">PERFORMERS</span>
              <span className="disco-section-count">
                {selectedAvatarIdx === -1 ? 'All Sync' : AVATAR_LIST[selectedAvatarIdx]?.name}
              </span>
            </div>
            <div className="disco-avatar-pills">
              <button
                type="button"
                className={`disco-avatar-chip ${selectedAvatarIdx === -1 ? 'disco-chip-active' : ''}`}
                onClick={() => handleSelectAvatar(-1)}
              >
                <span>✨ All Mascots (Sync)</span>
              </button>
              {AVATAR_LIST.map((av) => (
                <button
                  key={av.id}
                  type="button"
                  className={`disco-avatar-chip ${selectedAvatarIdx === av.index ? 'disco-chip-active' : ''}`}
                  onClick={() => handleSelectAvatar(av.index)}
                >
                  <span className={`disco-avatar-dot ${AVATAR_DOT_CLASSES[av.id] || ''}`} />
                  <span>{av.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Live Stage Modes */}
          <div className="disco-drawer-section">
            <span className="disco-section-label">QUICK STAGE MODES</span>
            <div className="disco-mode-grid">
              <button
                type="button"
                className={`disco-mode-card ${currentDanceMove === 'AUTO' ? 'disco-card-active' : ''}`}
                onClick={handleResetAuto}
              >
                <span className="disco-card-icon">⚡</span>
                <div className="disco-card-info">
                  <strong>Auto AI Groove</strong>
                  <span>Spontaneous roaming & randomized moves</span>
                </div>
              </button>

              <button
                type="button"
                className={`disco-mode-card ${currentDanceMove === 'GROUP_FORMATION' ? 'disco-card-active' : ''}`}
                onClick={() => handleSelectMove('GROUP_FORMATION')}
              >
                <span className="disco-card-icon">⭐</span>
                <div className="disco-card-info">
                  <strong>Spotlight Circle</strong>
                  <span>Synchronized group circular dance</span>
                </div>
              </button>
            </div>
          </div>

          {/* Partner Duets */}
          <div className="disco-drawer-section">
            <div className="disco-section-title-row">
              <span className="disco-section-label">PARTNER DUETS</span>
              <span className="disco-section-count">3 Pair Moves</span>
            </div>
            <div className="disco-duet-grid">
              {DANCE_MOVE_CATALOG.filter((m) => m.type === 'pair').map((move) => (
                <button
                  key={move.id}
                  type="button"
                  className={`disco-move-item ${currentDanceMove === move.id ? 'disco-move-active' : ''}`}
                  onClick={() => handleSelectMove(move.id)}
                >
                  <span className="disco-item-icon">{move.icon}</span>
                  <div className="disco-item-content">
                    <span className="disco-item-name">{move.name}</span>
                    <span className="disco-item-desc">{move.desc}</span>
                  </div>
                  {currentDanceMove === move.id && <span className="disco-active-indicator">PLAYING</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Solo Dance Moves */}
          <div className="disco-drawer-section">
            <div className="disco-section-title-row">
              <span className="disco-section-label">SOLO DANCE CHOREOGRAPHY</span>
              <span className="disco-section-count">11 Moves</span>
            </div>
            <div className="disco-solo-grid">
              {DANCE_MOVE_CATALOG.filter((m) => m.type === 'solo').map((move) => (
                <button
                  key={move.id}
                  type="button"
                  className={`disco-move-item ${currentDanceMove === move.id ? 'disco-move-active' : ''}`}
                  onClick={() => handleSelectMove(move.id)}
                >
                  <span className="disco-item-icon">{move.icon}</span>
                  <div className="disco-item-content">
                    <span className="disco-item-name">{move.name}</span>
                    <span className="disco-item-desc">{move.desc}</span>
                  </div>
                  {currentDanceMove === move.id && <span className="disco-active-indicator">PLAYING</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* ── Spotlight Studio Tuner Drawer ─────────────────────────── */}
      <aside
        className={`disco-spotlight-drawer ${spotlightPanelOpen ? 'disco-spotlight-drawer-open' : ''}`}
        aria-hidden={!spotlightPanelOpen}
        aria-label="Spotlight Studio Tuner"
      >
        <div className="disco-drawer-header">
          <div className="disco-drawer-top-row">
            <span className="disco-drawer-badge">STUDIO TUNER</span>
            <button
              type="button"
              className="disco-drawer-close-btn"
              onClick={() => setSpotlightPanelOpen(false)}
              aria-label="Close spotlight tuner"
            >
              ✕
            </button>
          </div>
          <h3 className="disco-drawer-heading">🔦 Spotlight Studio Tuner</h3>
          <p className="disco-drawer-sub">
            Customize the volumetric beam, soft fade, and avatar tracking in real-time. Copy values to make them permanent.
          </p>
        </div>

        <div className="disco-drawer-scrollable">
          {/* Target Avatar Focus */}
          <div className="disco-drawer-section">
            <div className="disco-section-title-row">
              <span className="disco-section-label">FOCUS AVATAR</span>
              <span className="disco-section-count">
                {spotlightConfig.focusMode === 'AUTO' ? 'Auto Cycling' : spotlightConfig.focusMode.toUpperCase()}
              </span>
            </div>
            <div className="disco-avatar-pills">
              <button
                type="button"
                className={`disco-avatar-chip ${spotlightConfig.focusMode === 'AUTO' ? 'disco-chip-active' : ''}`}
                onClick={() => handleUpdateSpotlightParam('focusMode', 'AUTO')}
              >
                <span>🔄 Auto Cycle</span>
              </button>
              {AVATAR_LIST.map((av) => (
                <button
                  key={av.id}
                  type="button"
                  className={`disco-avatar-chip ${spotlightConfig.focusMode === av.id ? 'disco-chip-active' : ''}`}
                  onClick={() => handleUpdateSpotlightParam('focusMode', av.id)}
                >
                  <span className={`disco-avatar-dot ${AVATAR_DOT_CLASSES[av.id] || ''}`} />
                  <span>{av.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Beam Fade & Opacity Controls */}
          <div className="disco-drawer-section">
            <span className="disco-section-label">BEAM FADE & OPACITY</span>

            {/* Beam Opacity */}
            <div className="disco-tuner-control">
              <div className="disco-tuner-label-row">
                <span>Beam Opacity (Fading)</span>
                <span className="disco-tuner-val">{Number(spotlightConfig.beamOpacity).toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="1.0"
                step="0.05"
                value={spotlightConfig.beamOpacity}
                onChange={(e) => handleUpdateSpotlightParam('beamOpacity', parseFloat(e.target.value))}
                className="disco-tuner-slider"
              />
            </div>

            {/* Soft Fade Falloff Curve */}
            <div className="disco-tuner-control">
              <div className="disco-tuner-label-row">
                <span>Soft Fade Falloff</span>
                <span className="disco-tuner-val">{Number(spotlightConfig.beamFadePower).toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="3.5"
                step="0.1"
                value={spotlightConfig.beamFadePower}
                onChange={(e) => handleUpdateSpotlightParam('beamFadePower', parseFloat(e.target.value))}
                className="disco-tuner-slider"
              />
            </div>

            {/* Volumetric Glow Intensity */}
            <div className="disco-tuner-control">
              <div className="disco-tuner-label-row">
                <span>Volumetric Glow</span>
                <span className="disco-tuner-val">{Number(spotlightConfig.beamIntensity).toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="2.5"
                step="0.05"
                value={spotlightConfig.beamIntensity}
                onChange={(e) => handleUpdateSpotlightParam('beamIntensity', parseFloat(e.target.value))}
                className="disco-tuner-slider"
              />
            </div>
          </div>

          {/* Beam Cone Geometry */}
          <div className="disco-drawer-section">
            <span className="disco-section-label">BEAM CONE GEOMETRY</span>

            {/* Top Source Radius */}
            <div className="disco-tuner-control">
              <div className="disco-tuner-label-row">
                <span>Top Source Radius</span>
                <span className="disco-tuner-val">{Number(spotlightConfig.topRadius).toFixed(2)}m</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.60"
                step="0.01"
                value={spotlightConfig.topRadius}
                onChange={(e) => handleUpdateSpotlightParam('topRadius', parseFloat(e.target.value))}
                className="disco-tuner-slider"
              />
            </div>

            {/* Bottom Spread Radius */}
            <div className="disco-tuner-control">
              <div className="disco-tuner-label-row">
                <span>Floor Spread Radius</span>
                <span className="disco-tuner-val">{Number(spotlightConfig.bottomRadius).toFixed(2)}m</span>
              </div>
              <input
                type="range"
                min="0.60"
                max="3.50"
                step="0.05"
                value={spotlightConfig.bottomRadius}
                onChange={(e) => handleUpdateSpotlightParam('bottomRadius', parseFloat(e.target.value))}
                className="disco-tuner-slider"
              />
            </div>

            {/* Cone Height */}
            <div className="disco-tuner-control">
              <div className="disco-tuner-label-row">
                <span>Cone Height</span>
                <span className="disco-tuner-val">{Number(spotlightConfig.beamHeight).toFixed(1)}m</span>
              </div>
              <input
                type="range"
                min="3.5"
                max="7.5"
                step="0.1"
                value={spotlightConfig.beamHeight}
                onChange={(e) => handleUpdateSpotlightParam('beamHeight', parseFloat(e.target.value))}
                className="disco-tuner-slider"
              />
            </div>
          </div>

          {/* 3D Light Illumination */}
          <div className="disco-drawer-section">
            <span className="disco-section-label">3D LIGHT ILLUMINATION</span>

            {/* 3D Spotlight Intensity */}
            <div className="disco-tuner-control">
              <div className="disco-tuner-label-row">
                <span>Light Intensity</span>
                <span className="disco-tuner-val">{Number(spotlightConfig.spotIntensity).toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="10.0"
                step="0.2"
                value={spotlightConfig.spotIntensity}
                onChange={(e) => handleUpdateSpotlightParam('spotIntensity', parseFloat(e.target.value))}
                className="disco-tuner-slider"
              />
            </div>

            {/* Spotlight Cone Angle */}
            <div className="disco-tuner-control">
              <div className="disco-tuner-label-row">
                <span>Light Spread Angle</span>
                <span className="disco-tuner-val">{Number(spotlightConfig.spotAngle).toFixed(2)} rad</span>
              </div>
              <input
                type="range"
                min="0.20"
                max="1.20"
                step="0.05"
                value={spotlightConfig.spotAngle}
                onChange={(e) => handleUpdateSpotlightParam('spotAngle', parseFloat(e.target.value))}
                className="disco-tuner-slider"
              />
            </div>
          </div>

          {/* Floor Pedestal Disk */}
          <div className="disco-drawer-section">
            <span className="disco-section-label">FLOOR DISK (PEDESTAL)</span>
            <label className="disco-toggle-row">
              <div className="disco-toggle-info">
                <strong>Show Floor Pedestal Disk</strong>
                <span>Currently removed per your request so no disk appears under the avatar</span>
              </div>
              <input
                type="checkbox"
                checked={!!spotlightConfig.showFloorDisk}
                onChange={(e) => handleUpdateSpotlightParam('showFloorDisk', e.target.checked)}
                className="disco-toggle-checkbox"
              />
            </label>
          </div>

          {/* Export & Copy for Developer */}
          <div className="disco-drawer-section">
            <span className="disco-section-label">COPY SPOTLIGHT CONFIG</span>
            <p className="disco-copy-hint">
              Copy this configuration and send it to the chat. It will be permanently locked into your codebase!
            </p>
            <pre className="disco-config-code">
              {JSON.stringify(spotlightConfig, null, 2)}
            </pre>

            <div className="disco-tuner-actions">
              <button
                type="button"
                className="disco-copy-btn"
                onClick={handleCopySpotlightConfig}
              >
                <span>{copiedToast ? '✓ Copied to Clipboard!' : '📋 Copy Values for Developer'}</span>
              </button>

              <button
                type="button"
                className="disco-reset-btn"
                onClick={handleResetSpotlight}
              >
                <span>↺ Reset</span>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </main>
  );
}
