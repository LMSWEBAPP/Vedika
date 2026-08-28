'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Sparkles, X, Play, Download } from 'lucide-react';
import ThreeDAvatar from '@/components/ThreeDAvatar';
import { playAvatarGreeting, stopAvatarGreeting } from '@/lib/avatarChorusSpeech';
import './vedika-labs.css';

// Idle expressions
const IDLE_STATES = [
  'idle', 'happy', 'idle', 'thinking',
  'sad', 'angry', 'idle', 'drowsy', 'happy', 'idle',
];

/**
 * 4 Avatar Characters:
 * 1. Mowgli   — Physics Lab   (Boy)  - Pixar Style (Puck)
 * 2. Belle    — Chemistry Lab (Girl) - Ghibli Style (Aoede)
 * 3. Moana    — Biology Lab   (Girl) - Pixar Style (Kore)
 * 4. Bagheera — Math Lab      (Boy)  - Pixar Style (Fenrir)
 */
const LABS = [
  {
    id: 'physics',
    charId: 'mowgli',
    name: 'Mowgli',
    style: 'Pixar (Boy)',
    role: 'Physics Explorer',
    title: 'Physics Lab',
    btnText: 'Enter Physics Lab',
    url: '/vedika-labs/physics',
    glowColor: '#34D399',
    modelColor: '#FFFFFF',
    accent: '#34D399',
    greetingText: '"Hi, this is Mowgli, welcome to my physics lab"',
  },
  {
    id: 'chemistry',
    charId: 'belle',
    name: 'Belle',
    style: 'Ghibli (Girl)',
    role: 'Chemistry Explorer',
    title: 'Chemistry Lab',
    btnText: 'Enter Chemistry Lab',
    url: '/vedika-labs/chemistry',
    glowColor: '#2694ed',
    modelColor: '#2694ed',
    accent: '#2694ed',
    greetingText: '"Hi, this is Belle, welcome to my chemistry lab"',
  },
  {
    id: 'biology',
    charId: 'moana',
    name: 'Moana',
    style: 'Pixar (Girl)',
    role: 'Biology Explorer',
    title: 'Biology Lab',
    btnText: 'Enter Biology Lab',
    url: '/vedika-labs/biology',
    glowColor: '#D85590',
    modelColor: '#D85590',
    accent: '#D85590',
    greetingText: '"Hi, this is Moana, welcome to my biology lab"',
  },
  {
    id: 'math',
    charId: 'bagheera',
    name: 'Bagheera',
    style: 'Pixar (Boy)',
    role: 'Math Explorer',
    title: 'Math Lab',
    btnText: 'Enter Math Lab',
    url: '/vedika-labs/math',
    glowColor: '#F9E79F',
    modelColor: '#F9E79F',
    accent: '#F9E79F',
    greetingText: '"Hi, this is Bagheera, welcome to my math lab"',
  },
];

const AVATAR_SIZE = 250;
const INTRO_BOUNCE_DURATION = 2.0;

export default function VedikaLabsHub() {
  const router = useRouter();
  const [pageMouse, setPageMouse] = useState({ x: 0, y: 0 });
  const cardRefs = useRef({});
  const [hoveredLab, setHoveredLab] = useState(null);

  // Synchronized Page-Load Bounce
  const [isIntroBouncing, setIsIntroBouncing] = useState(true);
  const [speakingAvatar, setSpeakingAvatar] = useState(null);
  const [showVoiceStudio, setShowVoiceStudio] = useState(false);
  const hasTriggeredRef = useRef(false);
  const bounceProfilesRef = useRef({});
  const [motionStyles, setMotionStyles] = useState({});

  // Independent expressions per avatar
  const [avatarExprs, setAvatarExprs] = useState(() =>
    Object.fromEntries(LABS.map((l) => [l.id, 'happy']))
  );

  // Global cursor tracking
  const handleGlobalMouseMove = useCallback((e) => {
    setPageMouse({ x: e.clientX, y: e.clientY });
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleGlobalMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleGlobalMouseMove);
  }, [handleGlobalMouseMove]);

  // Callback triggered as soon as the 3D models load in WebGL
  const handleAvatarLoaded = useCallback(() => {
    if (hasTriggeredRef.current) return;
    hasTriggeredRef.current = true;

    const profiles = {
      physics: {
        jumpHeight: 75 + Math.random() * 25,
        freq: 2.4 + Math.random() * 0.4,
        phase: Math.random() * 0.15,
        tiltMax: (Math.random() < 0.5 ? 1 : -1) * (10 + Math.random() * 6),
      },
      chemistry: {
        jumpHeight: 44 + Math.random() * 22,
        freq: 3.5 + Math.random() * 0.5,
        phase: 0.15 + Math.random() * 0.18,
        tiltMax: (Math.random() < 0.5 ? 1 : -1) * (11 + Math.random() * 6),
      },
      biology: {
        jumpHeight: 88 + Math.random() * 28,
        freq: 2.1 + Math.random() * 0.4,
        phase: 0.05 + Math.random() * 0.12,
        tiltMax: (Math.random() < 0.5 ? 1 : -1) * (12 + Math.random() * 7),
      },
      math: {
        jumpHeight: 60 + Math.random() * 25,
        freq: 3.0 + Math.random() * 0.4,
        phase: 0.22 + Math.random() * 0.18,
        tiltMax: (Math.random() < 0.5 ? 1 : -1) * (9 + Math.random() * 6),
      },
    };

    bounceProfilesRef.current = profiles;

    setAvatarExprs({
      physics: 'happy',
      chemistry: 'happy',
      biology: 'happy',
      math: 'happy',
    });
    setIsIntroBouncing(true);
  }, []);

  // ── Chaotic Multi-Height Randomized Bounce Animation ──
  useEffect(() => {
    if (!isIntroBouncing) return;

    const startTime = performance.now();
    const profiles = bounceProfilesRef.current;
    let animId;

    const animateIntro = (now) => {
      const elapsed = (now - startTime) / 1000;
      const decay = Math.max(0, 1 - (elapsed / INTRO_BOUNCE_DURATION));

      const nextStyles = {};

      LABS.forEach((lab) => {
        const prof = profiles[lab.id] || { jumpHeight: 70, freq: 2.6, phase: 0, tiltMax: 8 };

        const hopNorm = Math.abs(Math.sin((elapsed * prof.freq + prof.phase) * Math.PI));
        const dy = -Math.pow(hopNorm, 1.45) * prof.jumpHeight * Math.pow(decay, 1.15);
        const stretch = (hopNorm - 0.5) * 0.28 * decay;
        const scaleX = 1 - stretch;
        const scaleY = 1 + stretch;
        const rot = Math.sin(elapsed * prof.freq * 0.5 + prof.phase) * prof.tiltMax * decay;

        nextStyles[lab.id] = {
          transform: `translate3d(0, ${dy.toFixed(2)}px, 0) rotate(${rot.toFixed(2)}deg) scale(${scaleX.toFixed(3)}, ${scaleY.toFixed(3)})`,
        };
      });

      setMotionStyles(nextStyles);

      if (elapsed < INTRO_BOUNCE_DURATION) {
        animId = requestAnimationFrame(animateIntro);
      } else {
        setIsIntroBouncing(false);
        setMotionStyles({});
        setAvatarExprs({
          physics: 'idle',
          chemistry: 'idle',
          biology: 'idle',
          math: 'idle',
        });
      }
    };

    animId = requestAnimationFrame(animateIntro);
    return () => cancelAnimationFrame(animId);
  }, [isIntroBouncing]);

  // Per-avatar independent idle expression cycling
  useEffect(() => {
    if (isIntroBouncing || speakingAvatar) return;
    const timers = {};

    const scheduleNext = (labId) => {
      const delay = 2500 + Math.random() * 3500;
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

    LABS.forEach((l) => scheduleNext(l.id));
    return () => Object.values(timers).forEach(clearTimeout);
  }, [hoveredLab, isIntroBouncing, speakingAvatar]);

  // Hover Interaction & Voice Trigger (Only on hover)
  const handleCardMouseEnter = (lab) => {
    if (isIntroBouncing) return;
    setHoveredLab(lab.id);

    // Trigger this specific avatar's lab greeting
    playAvatarGreeting(
      lab.charId,
      () => setSpeakingAvatar(lab.charId),
      () => setSpeakingAvatar(null)
    );

    // Update expressions: hovered avatar is happy, others look towards it
    const hoveredIndex = LABS.findIndex((l) => l.id === lab.id);
    setAvatarExprs((prev) => {
      const next = { ...prev };
      LABS.forEach((l, idx) => {
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

  const handleCardMouseLeave = () => {
    if (isIntroBouncing) return;
    setHoveredLab(null);
    stopAvatarGreeting();
    setSpeakingAvatar(null);

    setAvatarExprs((prev) => {
      const next = { ...prev };
      LABS.forEach((l) => {
        next[l.id] = IDLE_STATES[Math.floor(Math.random() * IDLE_STATES.length)];
      });
      return next;
    });
  };

  // Compute per-card cursor offset
  const getOffset = (labId) => {
    if (isIntroBouncing) return { x: 0, y: 0 };
    const el = cardRefs.current[labId];
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    return {
      x: ((pageMouse.x - (rect.left + rect.width / 2)) / rect.width) * 55,
      y: ((pageMouse.y - (rect.top + rect.height / 2)) / rect.height) * 55,
    };
  };

  return (
    <div className="vl-page">
      {/* Header */}
      <div className="vl-header">
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
          <h1 className="vl-title">Vedika 3D Science Simulator Labs</h1>
          <button
            type="button"
            className="vl-header-btn"
            onClick={() => setShowVoiceStudio(true)}
            title="Open Character Voices"
          >
            <Sparkles size={13} color="#34D399" />
            <span>Voice Audio</span>
          </button>
        </div>
        <p className="vl-subtitle">Hover over any avatar to hear their lab welcome greeting.</p>
      </div>

      {/* Grid of Lab Cards */}
      <div className="vl-grid">
        {LABS.map((lab) => {
          const isSpeaking = speakingAvatar === lab.charId;

          return (
            <div
              key={lab.id}
              ref={(el) => { if (el) cardRefs.current[lab.id] = el; }}
              className="vl-card"
              onMouseEnter={() => handleCardMouseEnter(lab)}
              onMouseLeave={handleCardMouseLeave}
              onClick={() => router.push(lab.url)}
            >
              {/* Avatar Wrapper */}
              <div className="vl-avatar-wrap">
                <div
                  className="vl-avatar-motion"
                  style={motionStyles[lab.id] || {}}
                >
                  {/* Gladolia DEMO Curved Avatar Name Arch */}
                  <div className="vl-curved-text-wrap">
                    <svg viewBox="0 0 250 90" className="vl-curved-text-svg">
                      <defs>
                        <path
                          id={`curve-${lab.id}`}
                          d="M 30,78 A 98,98 0 0,1 220,78"
                        />
                      </defs>
                      <text className="vl-curved-name-text" style={{ fill: lab.accent }}>
                        <textPath
                          href={`#curve-${lab.id}`}
                          startOffset="50%"
                          textAnchor="middle"
                        >
                          {lab.name}
                        </textPath>
                      </text>
                    </svg>
                  </div>

                  <ThreeDAvatar
                    expression={avatarExprs[lab.id] || 'idle'}
                    glowColor={lab.glowColor}
                    modelColor={lab.modelColor}
                    size={AVATAR_SIZE}
                    mouseOffset={isIntroBouncing ? { x: 0, y: 0 } : getOffset(lab.id)}
                    isSpeaking={isSpeaking}
                    onLoaded={handleAvatarLoaded}
                  />
                </div>
              </div>

              {/* Enter Lab button */}
              <button
                type="button"
                className="vl-card-btn"
              >
                {lab.btnText}
                <ArrowRight size={16} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Voice Audio Modal */}
      {showVoiceStudio && (
        <div
          className="vl-modal-backdrop"
          onClick={() => setShowVoiceStudio(false)}
        >
          <div
            className="vl-modal-box"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="vl-modal-header">
              <div>
                <h3 className="vl-modal-title">
                  🎙️ Final Avatar Voice Audio
                </h3>
                <p className="vl-modal-subtitle">
                  Hover on any avatar on the page or test/download below.
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

            {/* Individual Voice List */}
            <div className="vl-modal-list">
              {LABS.map((lab) => {
                const isCurrent = speakingAvatar === lab.charId;
                return (
                  <div
                    key={lab.charId}
                    className="vl-modal-row"
                    style={{
                      border: `1.5px solid ${isCurrent ? lab.glowColor : 'rgba(255, 255, 255, 0.08)'}`,
                    }}
                  >
                    <div className="vl-modal-char-info">
                      <div
                        className="vl-modal-char-dot"
                        style={{ background: lab.glowColor }}
                      />
                      <div>
                        <div className="vl-modal-char-name">
                          {lab.name} — <span style={{ color: lab.glowColor, fontWeight: 500 }}>{lab.style}</span>
                        </div>
                        <div className="vl-modal-char-line">{lab.greetingText}</div>
                      </div>
                    </div>
                    <div className="vl-modal-actions">
                      <button
                        type="button"
                        className="vl-modal-play-btn"
                        onClick={() => {
                          playAvatarGreeting(
                            lab.charId,
                            () => setSpeakingAvatar(lab.charId),
                            () => setSpeakingAvatar(null)
                          );
                        }}
                        style={{
                          background: isCurrent ? lab.glowColor : 'rgba(255, 255, 255, 0.08)',
                          color: isCurrent ? '#0F172A' : '#E2E8F0',
                        }}
                      >
                        <Play size={11} fill={isCurrent ? '#0F172A' : '#E2E8F0'} />
                        <span>Play</span>
                      </button>
                      <a
                        href={`/audio/final/${lab.charId}.wav`}
                        download={`${lab.charId}.wav`}
                        className="vl-modal-download-btn"
                        title={`Download ${lab.name} WAV`}
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
