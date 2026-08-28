'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  X,
  Play,
  Download,
} from 'lucide-react';
import ThreeDAvatar from '@/components/ThreeDAvatar';
import { playAvatarGreeting, stopAvatarGreeting } from '@/lib/avatarChorusSpeech';
import './vedika-labs.css';

// Idle expressions
const IDLE_STATES = [
  'idle', 'happy', 'idle', 'thinking',
  'sad', 'angry', 'idle', 'drowsy', 'happy', 'idle',
];

/**
 * 4 Lab Station Configurations with Custom 3D Glowing Badges:
 */
const LAB_STATIONS = [
  {
    id: 'physics',
    charId: 'mowgli',
    name: 'Mowgli',
    style: 'Pixar (Boy)',
    title: 'Physics Lab',
    desc: 'Explore motion, energy and the laws of nature.',
    url: '/vedika-labs/physics',
    glowColor: '#34D399',
    modelColor: '#FFFFFF',
    accentClass: 'physics',
    greetingText: '"Hi, this is Mowgli, welcome to my physics lab"',
    badgeImg: '/badges/physics_badge.png',
  },
  {
    id: 'chemistry',
    charId: 'belle',
    name: 'Belle',
    style: 'Ghibli (Girl)',
    title: 'Chemistry Lab',
    desc: 'Experiment with reactions, elements and compounds.',
    url: '/vedika-labs/chemistry',
    glowColor: '#38BDF8',
    modelColor: '#38BDF8',
    accentClass: 'chemistry',
    greetingText: '"Hi, this is Belle, welcome to my chemistry lab"',
    badgeImg: '/badges/chemistry_badge.png',
  },
  {
    id: 'biology',
    charId: 'moana',
    name: 'Moana',
    style: 'Pixar (Girl)',
    title: 'Biology Lab',
    desc: 'Discover life sciences through interactive 3D models.',
    url: '/vedika-labs/biology',
    glowColor: '#D85590',
    modelColor: '#D85590',
    accentClass: 'biology',
    greetingText: '"Hi, this is Moana, welcome to my biology lab"',
    badgeImg: '/badges/biology_badge.png',
  },
  {
    id: 'math',
    charId: 'bagheera',
    name: 'Bagheera',
    style: 'Pixar (Boy)',
    title: 'Math Lab',
    desc: 'Visualize equations and solve real-world problems.',
    url: '/vedika-labs/math',
    glowColor: '#F9E79F',
    modelColor: '#F9E79F',
    accentClass: 'math',
    greetingText: '"Hi, this is Bagheera, welcome to my math lab"',
    badgeImg: '/badges/math_badge.png',
  },
];

export default function VedikaLabsHub() {
  const router = useRouter();
  const [pageMouse, setPageMouse] = useState({ x: 0, y: 0 });
  const [hoveredLab, setHoveredLab] = useState(null);
  const [speakingAvatar, setSpeakingAvatar] = useState(null);
  const [showVoiceStudio, setShowVoiceStudio] = useState(false);
  const [isIntroBouncing, setIsIntroBouncing] = useState(true);
  const hasTriggeredRef = useRef(false);

  // Independent expressions per avatar
  const [avatarExprs, setAvatarExprs] = useState(() =>
    Object.fromEntries(LAB_STATIONS.map((l) => [l.id, 'happy']))
  );

  // Global cursor tracking
  const handleGlobalMouseMove = useCallback((e) => {
    setPageMouse({ x: e.clientX, y: e.clientY });
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleGlobalMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleGlobalMouseMove);
  }, [handleGlobalMouseMove]);

  // Initial loaded sync
  const handleAvatarLoaded = useCallback(() => {
    if (hasTriggeredRef.current) return;
    hasTriggeredRef.current = true;

    setAvatarExprs({
      physics: 'happy',
      chemistry: 'happy',
      biology: 'happy',
      math: 'happy',
    });

    setTimeout(() => {
      setIsIntroBouncing(false);
      setAvatarExprs({
        physics: 'idle',
        chemistry: 'idle',
        biology: 'idle',
        math: 'idle',
      });
    }, 2000);
  }, []);

  // Per-avatar independent idle expression cycling
  useEffect(() => {
    if (isIntroBouncing || speakingAvatar) return;
    const timers = {};

    const scheduleNext = (labId) => {
      const delay = 2800 + Math.random() * 3500;
      timers[labId] = setTimeout(() => {
        setAvatarExprs((prev) => {
          if (hoveredLab || isIntroBouncing || speakingAvatar) return prev;
          const pool = IDLE_STATES.filter((e) => e !== prev[labId]);
          const next = pool[Math.floor(Math.random() * pool.length)];
          return { ...prev, [labId]: next };
        });
        scheduleNext(labId);
      }, delay);
    };

    LAB_STATIONS.forEach((l) => scheduleNext(l.id));
    return () => Object.values(timers).forEach(clearTimeout);
  }, [hoveredLab, isIntroBouncing, speakingAvatar]);

  // Hover Interaction & Voice Trigger (Starts voice and animates the corresponding avatar)
  const handleLabHover = (station) => {
    if (isIntroBouncing) return;
    setHoveredLab(station.id);

    // Trigger this avatar's unique greeting
    playAvatarGreeting(
      station.charId,
      () => setSpeakingAvatar(station.charId),
      () => setSpeakingAvatar(null)
    );

    // Update expressions: hovered avatar is happy, others look towards it
    const hoveredIndex = LAB_STATIONS.findIndex((l) => l.id === station.id);
    setAvatarExprs((prev) => {
      const next = { ...prev };
      LAB_STATIONS.forEach((l, idx) => {
        if (idx === hoveredIndex) {
          next[l.id] = 'happy';
        } else if (idx < hoveredIndex) {
          next[l.id] = 'side_eye_right';
        } else {
          next[l.id] = 'side_eye_left';
        }
      });
      return next;
    });
  };

  const handleLabLeave = () => {
    if (isIntroBouncing) return;
    setHoveredLab(null);
    stopAvatarGreeting();
    setSpeakingAvatar(null);

    setAvatarExprs((prev) => {
      const next = { ...prev };
      LAB_STATIONS.forEach((l) => {
        next[l.id] = IDLE_STATES[Math.floor(Math.random() * IDLE_STATES.length)];
      });
      return next;
    });
  };

  // Compute cursor offset for dynamic 3D eye tracking
  const getOffset = () => {
    if (isIntroBouncing || typeof window === 'undefined') return { x: 0, y: 0 };
    return {
      x: ((pageMouse.x - window.innerWidth / 2) / window.innerWidth) * 45,
      y: ((pageMouse.y - window.innerHeight / 3) / window.innerHeight) * 45,
    };
  };

  return (
    <div className="vl-page">
      {/* ── Top Hero Split (Left: Title & Text, Right: 3D Stage) ─── */}
      <div className="vl-hero-split">
        {/* Left: Typography */}
        <div className="vl-hero-left">
          <h1 className="vl-hero-title">
            Vedika 3D<br />
            <span className="vl-hero-title-gradient">
              Science Simulator Labs
            </span>
          </h1>
          <p className="vl-hero-desc">
            Step into immersive 3D labs and explore concepts through simulation, experimentation and discovery.
          </p>

          {/* Voice Studio Button */}
          <button
            type="button"
            className="vl-voice-trigger"
            onClick={() => setShowVoiceStudio(true)}
            title="Open Character Voices"
          >
            <Sparkles size={13} color="#34D399" />
            <span>Voice Studio</span>
          </button>
        </div>

        {/* Right: Seamless 3D Lab Stage (NO Border, Avatars Aligned to Pedestals) */}
        <div className="vl-stage-wrapper">
          <div className="vl-stage-vignette" />

          {/* 1. Mowgli (Physics) — Above Newton's Cradle (Green Pedestal) */}
          <div
            className="vl-pedestal-avatar vl-avatar-physics"
            onClick={() => router.push('/vedika-labs/physics')}
            onMouseEnter={() => handleLabHover(LAB_STATIONS[0])}
            onMouseLeave={handleLabLeave}
          >
            <ThreeDAvatar
              expression={avatarExprs.physics || 'happy'}
              glowColor="#34D399"
              modelColor="#FFFFFF"
              size={92}
              mouseOffset={getOffset()}
              isSpeaking={speakingAvatar === 'mowgli'}
              onLoaded={handleAvatarLoaded}
            />
          </div>

          {/* 2. Belle (Chemistry) — Above Chemical Flask (Blue Pedestal) */}
          <div
            className="vl-pedestal-avatar vl-avatar-chemistry"
            onClick={() => router.push('/vedika-labs/chemistry')}
            onMouseEnter={() => handleLabHover(LAB_STATIONS[1])}
            onMouseLeave={handleLabLeave}
          >
            <ThreeDAvatar
              expression={avatarExprs.chemistry || 'happy'}
              glowColor="#38BDF8"
              modelColor="#38BDF8"
              size={92}
              mouseOffset={getOffset()}
              isSpeaking={speakingAvatar === 'belle'}
              onLoaded={handleAvatarLoaded}
            />
          </div>

          {/* 3. Moana (Biology) — Above Molecule Model (Pink Pedestal) */}
          <div
            className="vl-pedestal-avatar vl-avatar-biology"
            onClick={() => router.push('/vedika-labs/biology')}
            onMouseEnter={() => handleLabHover(LAB_STATIONS[2])}
            onMouseLeave={handleLabLeave}
          >
            <ThreeDAvatar
              expression={avatarExprs.biology || 'happy'}
              glowColor="#D85590"
              modelColor="#D85590"
              size={92}
              mouseOffset={getOffset()}
              isSpeaking={speakingAvatar === 'moana'}
              onLoaded={handleAvatarLoaded}
            />
          </div>

          {/* 4. Bagheera (Math) — Above Geometric Cone (Yellow Pedestal) */}
          <div
            className="vl-pedestal-avatar vl-avatar-math"
            onClick={() => router.push('/vedika-labs/math')}
            onMouseEnter={() => handleLabHover(LAB_STATIONS[3])}
            onMouseLeave={handleLabLeave}
          >
            <ThreeDAvatar
              expression={avatarExprs.math || 'happy'}
              glowColor="#F9E79F"
              modelColor="#F9E79F"
              size={92}
              mouseOffset={getOffset()}
              isSpeaking={speakingAvatar === 'bagheera'}
              onLoaded={handleAvatarLoaded}
            />
          </div>
        </div>
      </div>

      {/* ── Bottom Lab Stations Navigation Row (Transparent, No Box) ── */}
      <div className="vl-labs-container">
        {/* Orbital Curved Connecting Line */}
        <svg
          className="vl-orbit-bg-svg"
          viewBox="0 0 1080 60"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M 50,30 C 250,6 450,54 650,25 C 850,6 980,36 1030,30"
            stroke="rgba(56, 189, 248, 0.2)"
            strokeWidth="1.5"
            strokeDasharray="4 6"
          />
        </svg>

        <div className="vl-labs-grid">
          {LAB_STATIONS.map((station) => (
            <div
              key={station.id}
              className="vl-station-card"
              onMouseEnter={() => handleLabHover(station)}
              onMouseLeave={handleLabLeave}
              onClick={() => router.push(station.url)}
            >
              {/* Custom 3D Glowing Badge Emblem Image */}
              <div className={`vl-station-badge-wrap vl-badge-${station.accentClass}`}>
                <img
                  src={station.badgeImg}
                  alt={station.title}
                  className="vl-station-badge-img"
                />
              </div>

              {/* Lab Title */}
              <h3 className={`vl-station-title vl-title-${station.accentClass}`}>
                {station.title}
              </h3>

              {/* Lab Description */}
              <p className="vl-station-desc">
                {station.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Voice Audio Studio Modal ─────────────────────────────── */}
      {showVoiceStudio && (
        <div
          className="vl-modal-backdrop"
          onClick={() => setShowVoiceStudio(false)}
        >
          <div
            className="vl-modal-box"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="vl-modal-header">
              <div>
                <h3 className="vl-modal-title">
                  🎙️ Avatar Voice Studio
                </h3>
                <p className="vl-modal-subtitle">
                  Audition or download avatar welcome speech tracks.
                </p>
              </div>
              <button
                type="button"
                className="vl-modal-close-btn"
                onClick={() => setShowVoiceStudio(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="vl-modal-list">
              {LAB_STATIONS.map((station) => {
                const isCurrent = speakingAvatar === station.charId;
                return (
                  <div
                    key={station.charId}
                    className="vl-modal-row"
                    style={{
                      border: `1.5px solid ${isCurrent ? station.glowColor : 'rgba(255, 255, 255, 0.08)'}`,
                    }}
                  >
                    <div className="vl-modal-char-info">
                      <div
                        className="vl-modal-char-dot"
                        style={{ background: station.glowColor }}
                      />
                      <div>
                        <div className="vl-modal-char-name">
                          {station.name} — <span style={{ color: station.glowColor, fontWeight: 500 }}>{station.style}</span>
                        </div>
                        <div className="vl-modal-char-line">{station.greetingText}</div>
                      </div>
                    </div>
                    <div className="vl-modal-actions">
                      <button
                        type="button"
                        className="vl-modal-play-btn"
                        onClick={() => {
                          playAvatarGreeting(
                            station.charId,
                            () => setSpeakingAvatar(station.charId),
                            () => setSpeakingAvatar(null)
                          );
                        }}
                        style={{
                          background: isCurrent ? station.glowColor : 'rgba(255, 255, 255, 0.08)',
                          color: isCurrent ? '#0F172A' : '#E2E8F0',
                        }}
                      >
                        <Play size={11} fill={isCurrent ? '#0F172A' : '#E2E8F0'} />
                        <span>Play</span>
                      </button>
                      <a
                        href={`/audio/final/${station.charId}.wav`}
                        download={`${station.charId}.wav`}
                        className="vl-modal-download-btn"
                        title={`Download ${station.name} WAV`}
                      >
                        <Download size={13} />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
