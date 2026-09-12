'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Trees,
  Camera,
  Maximize2,
  Video,
  Layers,
  Compass,
  Eye,
  Move,
  Copy,
  Check,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import './lost-avatars.css';

// Dynamic import with SSR disabled for Three.js WebGL scene
const LostAvatarsScene = dynamic(
  () => import('@/components/LostAvatarsScene'),
  { ssr: false }
);

const PRESET_OPTIONS = [
  { id: 'road', label: 'Road Level (Locked)', icon: Compass, desc: 'Ground road perspective looking from tree base along the path' },
  { id: 'front', label: 'Front Wide', icon: Maximize2, desc: 'Edge-to-edge panoramic view' },
  { id: 'cinematic', label: 'Cinematic Low', icon: Video, desc: 'Low-angle hero view looking up at canopy' },
  { id: 'diorama', label: 'Elevated Diorama', icon: Layers, desc: 'Isometric vantage looking down into paths' },
  { id: 'grove', label: 'Deep Grove', icon: Eye, desc: 'Side perspective among dense trees' },
  { id: 'orbit', label: 'Free Orbit', icon: Move, desc: 'Drag to rotate • Scroll to zoom anywhere' },
];

export default function LostAvatarsPage() {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(25);
  // Default to user's chosen road angle
  const [activePreset, setActivePreset] = useState('road');
  const [zoomTrigger, setZoomTrigger] = useState(null);
  const [heightTrigger, setHeightTrigger] = useState(null);
  const [copied, setCopied] = useState(false);

  // Store coordinates in ref to avoid triggering React component re-renders on every frame
  const coordsRef = useRef({ pos: [3.35, 0.38, -3.85], target: [-0.10, 0.30, 0.45] });
  const posValRef = useRef(null);
  const targetValRef = useRef(null);

  const handleLoaded = useCallback(() => {
    setProgress(100);
    setTimeout(() => {
      setLoading(false);
    }, 350);
  }, []);

  const handleProgress = useCallback((percent) => {
    setProgress((prev) => Math.max(prev, percent));
  }, []);

  // Update DOM directly to achieve 60+ FPS without React re-render overhead
  const handleCameraUpdate = useCallback((newCoords) => {
    coordsRef.current = newCoords;
    if (posValRef.current) {
      posValRef.current.textContent = `[${newCoords.pos.join(', ')}]`;
    }
    if (targetValRef.current) {
      targetValRef.current.textContent = `[${newCoords.target.join(', ')}]`;
    }
  }, []);

  const handleSelectPreset = (id) => {
    setActivePreset(id);
  };

  const handleZoom = (delta) => {
    setZoomTrigger({ delta, timestamp: Date.now() });
  };

  const handleHeight = (delta) => {
    setHeightTrigger({ delta, timestamp: Date.now() });
  };

  const handleCopyCoords = () => {
    const cur = coordsRef.current;
    const text = `camera: [${cur.pos.join(', ')}], target: [${cur.target.join(', ')}]`;
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 92) {
          clearInterval(interval);
          return prev;
        }
        return prev + Math.floor(Math.random() * 14 + 10);
      });
    }, 180);

    const failsafe = setTimeout(() => {
      setProgress(100);
      setTimeout(() => setLoading(false), 300);
    }, 2500);

    return () => {
      clearInterval(interval);
      clearTimeout(failsafe);
    };
  }, []);

  return (
    <main className="lost-avatars-viewport">
      {/* 1. Loading Overlay with Progress */}
      <div className={`lost-avatars-loader-screen ${!loading ? 'hidden' : ''}`}>
        <div className="lost-avatars-loader-content">
          <div className="lost-avatars-spinner-container">
            <div className="lost-avatars-spinner-ring" />
            <div className="lost-avatars-spinner-inner" />
            <Trees className="lost-avatars-spinner-icon" />
          </div>

          <h1 className="lost-avatars-loader-title">The Mystic Forest</h1>
          <p className="lost-avatars-loader-desc">
            Loading night forest canopy, winding road, and summoning wandering companions...
          </p>

          <div className="lost-avatars-progress-bar-wrap">
            <div
              className="lost-avatars-progress-bar-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="lost-avatars-progress-percent">{progress}%</span>
        </div>
      </div>

      {/* 2. WebGL 3D Forest Scene with Reactive Camera Control */}
      <LostAvatarsScene
        activePreset={activePreset}
        zoomTrigger={zoomTrigger}
        heightTrigger={heightTrigger}
        onLoaded={handleLoaded}
        onProgress={handleProgress}
        onCameraUpdate={handleCameraUpdate}
      />

      {/* 3. Glassmorphic UI Overlay Layer */}
      <div className="lost-avatars-ui-overlay">
        {/* Top Header */}
        <header className="lost-avatars-topbar">
          <Link href="/" className="lost-avatars-btn-back">
            <ArrowLeft size={16} />
            <span>Back to Dashboard</span>
          </Link>

          <div className="lost-avatars-title-badge">
            <div className="lost-avatars-pulse-dot" />
            <span className="lost-avatars-title-text">LOST AVATARS SANCTUARY</span>
            <span className="lost-avatars-title-sub">4 Wandering Companions</span>
          </div>

          {/* Live Coordinates & Copy Angle Badge */}
          <div className="lost-avatars-coords-badge">
            <div className="lost-avatars-coords-pill">
              <span>Pos:</span>
              <span ref={posValRef} className="lost-avatars-coords-val">[3.35, 0.38, -3.85]</span>
              <span>Target:</span>
              <span ref={targetValRef} className="lost-avatars-coords-val">[-0.10, 0.30, 0.45]</span>
            </div>
            <button
              onClick={handleCopyCoords}
              className={`lost-avatars-btn-copy ${copied ? 'copied' : ''}`}
              title="Copy current camera coordinates"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              <span>{copied ? 'Copied' : 'Copy Angle'}</span>
            </button>
          </div>
        </header>

        {/* Bottom Interactive Camera Angle Switcher Dock */}
        <div className="lost-avatars-camera-dock-wrap">
          {activePreset === 'orbit' && (
            <div className="lost-avatars-free-hint">
              <Move size={14} />
              <span>Free Orbit Active — Click & drag to rotate • Scroll to zoom • Right-click to pan</span>
            </div>
          )}

          <nav className="lost-avatars-camera-dock" aria-label="Camera Perspectives">
            <div className="lost-avatars-dock-header">
              <Camera size={15} className="lost-avatars-dock-header-icon" />
              <span>Camera Angles</span>
            </div>

            <div className="lost-avatars-preset-list">
              {PRESET_OPTIONS.map((opt) => {
                const IconComponent = opt.icon;
                const isActive = activePreset === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleSelectPreset(opt.id)}
                    className={`lost-avatars-preset-btn ${isActive ? 'active' : ''}`}
                    title={opt.desc}
                  >
                    <IconComponent size={14} />
                    <span>{opt.label}</span>
                    {isActive && <span className="lost-avatars-preset-dot" />}
                  </button>
                );
              })}
            </div>

            {/* Fine-tune Zoom & Road Elevation Controls */}
            <div className="lost-avatars-adjust-group">
              <div className="lost-avatars-ctrl-subgroup">
                <button
                  onClick={() => handleZoom(-0.5)}
                  className="lost-avatars-zoom-btn"
                  title="Zoom Closer Along Road"
                  aria-label="Zoom in"
                >
                  <ZoomIn size={14} />
                </button>
                <button
                  onClick={() => handleZoom(0.5)}
                  className="lost-avatars-zoom-btn"
                  title="Zoom Further Out"
                  aria-label="Zoom out"
                >
                  <ZoomOut size={14} />
                </button>
              </div>

              <div className="lost-avatars-ctrl-subgroup">
                <button
                  onClick={() => handleHeight(-0.06)}
                  className="lost-avatars-zoom-btn"
                  title="Lower Camera closer to Road Level (-0.06)"
                  aria-label="Lower camera"
                >
                  <ArrowDown size={14} />
                </button>
                <button
                  onClick={() => handleHeight(0.06)}
                  className="lost-avatars-zoom-btn"
                  title="Raise Camera (+0.06)"
                  aria-label="Raise camera"
                >
                  <ArrowUp size={14} />
                </button>
              </div>
            </div>
          </nav>
        </div>
      </div>
    </main>
  );
}
