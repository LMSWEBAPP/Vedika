'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import ThreeDAvatar from '@/components/ThreeDAvatar';
import './vedika-labs.css';

// Idle expressions
const IDLE_STATES = [
  'idle', 'happy', 'idle', 'thinking',
  'sad', 'angry', 'idle', 'drowsy', 'happy', 'idle',
];

const LABS = [
  {
    id: 'physics',
    title: 'Physics Lab',
    btnText: 'Enter Physics Lab',
    url: '/vedika-labs/physics',
    glowColor: '#34D399',
    modelColor: '#FFFFFF', // Emerald Sage
    accent: '#34D399',
  },
  {
    id: 'chemistry',
    title: 'Chemistry Lab',
    btnText: 'Enter Chemistry Lab',
    url: '/vedika-labs/chemistry',
    glowColor: '#2694ed', // Azure Blue
    modelColor: '#2694ed',
    accent: '#2694ed',
  },
  {
    id: 'biology',
    title: 'Biology Lab',
    btnText: 'Enter Biology Lab',
    url: '/vedika-labs/biology',
    glowColor: '#D85590', // Rose Magenta
    modelColor: '#D85590',
    accent: '#D85590',
  },
  {
    id: 'math',
    title: 'Math Lab',
    btnText: 'Enter Math Lab',
    url: '/vedika-labs/math',
    glowColor: '#F9E79F', // Warm Golden Pastel
    modelColor: '#F9E79F',
    accent: '#F9E79F',
  },
];

const AVATAR_SIZE = 270;
const INTRO_BOUNCE_DURATION = 2.0;

export default function VedikaLabsHub() {
  const router = useRouter();
  const [pageMouse, setPageMouse] = useState({ x: 0, y: 0 });
  const cardRefs = useRef({});
  const [hoveredLab, setHoveredLab] = useState(null);

  // Synchronized Page-Load Bounce Trigger
  const [isIntroBouncing, setIsIntroBouncing] = useState(true);
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

    // Generate chaotic, widely varied random jump heights (from 50px up to 130px!)
    const profiles = {
      physics: {
        jumpHeight: 95 + Math.random() * 30, // 95px - 125px high leap
        freq: 2.3 + Math.random() * 0.4,
        phase: Math.random() * 0.15,
        tiltMax: (Math.random() < 0.5 ? 1 : -1) * (10 + Math.random() * 8),
      },
      chemistry: {
        jumpHeight: 52 + Math.random() * 25, // 52px - 77px rapid bouncy hops
        freq: 3.4 + Math.random() * 0.6,
        phase: 0.15 + Math.random() * 0.2,
        tiltMax: (Math.random() < 0.5 ? 1 : -1) * (12 + Math.random() * 8),
      },
      biology: {
        jumpHeight: 110 + Math.random() * 35, // 110px - 145px massive dramatic double jump
        freq: 2.0 + Math.random() * 0.4,
        phase: 0.05 + Math.random() * 0.15,
        tiltMax: (Math.random() < 0.5 ? 1 : -1) * (14 + Math.random() * 10),
      },
      math: {
        jumpHeight: 75 + Math.random() * 30, // 75px - 105px springy chaotic leap
        freq: 2.9 + Math.random() * 0.5,
        phase: 0.25 + Math.random() * 0.2,
        tiltMax: (Math.random() < 0.5 ? 1 : -1) * (10 + Math.random() * 8),
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

  // ── Chaotic Multi-Height Randomized Bounce Animation (Fixed Forward Gaze) ──
  useEffect(() => {
    if (!isIntroBouncing) return;

    const startTime = performance.now();
    const profiles = bounceProfilesRef.current;
    let animId;

    const animateIntro = (now) => {
      const elapsed = (now - startTime) / 1000;
      const decay = Math.max(0, 1 - (elapsed / INTRO_BOUNCE_DURATION)); // 1 -> 0 over 2s

      const nextStyles = {};

      LABS.forEach((lab) => {
        const prof = profiles[lab.id] || { jumpHeight: 90, freq: 2.6, phase: 0, tiltMax: 10 };

        // Bouncy parabolic ground-reflected wave
        const hopNorm = Math.abs(Math.sin((elapsed * prof.freq + prof.phase) * Math.PI));
        // Vertical jump in px (upward is negative Y)
        const dy = -Math.pow(hopNorm, 1.45) * prof.jumpHeight * Math.pow(decay, 1.15);
        // Elastic squash & stretch (squash on landing, stretch on liftoff)
        const stretch = (hopNorm - 0.5) * 0.28 * decay;
        const scaleX = 1 - stretch;
        const scaleY = 1 + stretch;
        // Playful chaotic tilt
        const rot = Math.sin(elapsed * prof.freq * 0.5 + prof.phase) * prof.tiltMax * decay;

        nextStyles[lab.id] = {
          transform: `translate3d(0, ${dy.toFixed(2)}px, 0) rotate(${rot.toFixed(2)}deg) scale(${scaleX.toFixed(3)}, ${scaleY.toFixed(3)})`,
        };
      });

      setMotionStyles(nextStyles);

      if (elapsed < INTRO_BOUNCE_DURATION) {
        animId = requestAnimationFrame(animateIntro);
      } else {
        // Animation finished: cleanly settle and restore idle states + cursor gaze tracking
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

  // Per-avatar independent idle expression cycling when NOT hovering or intro bouncing
  useEffect(() => {
    if (isIntroBouncing) return;
    const timers = {};

    const scheduleNext = (labId) => {
      const delay = 2500 + Math.random() * 3500;
      timers[labId] = setTimeout(() => {
        setAvatarExprs((prev) => {
          if (hoveredLab || isIntroBouncing) return prev;
          const pool = IDLE_STATES.filter((e) => e !== prev[labId]);
          const next = pool[Math.floor(Math.random() * pool.length)];
          return { ...prev, [labId]: next };
        });
        scheduleNext(labId);
      }, delay);
    };

    LABS.forEach((l) => scheduleNext(l.id));
    return () => Object.values(timers).forEach(clearTimeout);
  }, [hoveredLab, isIntroBouncing]);

  // Reactive Hover: Active lab is Happy, other labs give directional Jealousy Side-Eye (Only after bounce)
  useEffect(() => {
    if (isIntroBouncing) return;

    if (!hoveredLab) {
      setAvatarExprs((prev) => {
        const next = { ...prev };
        LABS.forEach((l) => {
          next[l.id] = IDLE_STATES[Math.floor(Math.random() * IDLE_STATES.length)];
        });
        return next;
      });
      return;
    }

    const hoveredIndex = LABS.findIndex((l) => l.id === hoveredLab);
    if (hoveredIndex === -1) return;

    setAvatarExprs((prev) => {
      const next = { ...prev };
      LABS.forEach((lab, idx) => {
        if (idx === hoveredIndex) {
          next[lab.id] = 'happy';
        } else if (idx < hoveredIndex) {
          next[lab.id] = 'side_eye_right';
        } else {
          next[lab.id] = 'side_eye_left';
        }
      });
      return next;
    });
  }, [hoveredLab, isIntroBouncing]);

  // Compute per-card cursor offset so eyes follow the cursor (strictly (0,0) during bounce)
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
        <h1 className="vl-title">Vedika 3D Science Simulator Labs</h1>
        <p className="vl-subtitle">Explore interactive WebGL environments and run digital experiments.</p>
      </div>

      {/* Grid of Lab Cards */}
      <div className="vl-grid">
        {LABS.map((lab) => (
          <div
            key={lab.id}
            ref={(el) => { if (el) cardRefs.current[lab.id] = el; }}
            className="vl-card"
            onMouseEnter={() => { if (!isIntroBouncing) setHoveredLab(lab.id); }}
            onMouseLeave={() => { if (!isIntroBouncing) setHoveredLab(null); }}
            onClick={() => router.push(lab.url)}
          >
            {/* Avatar Wrapper (Generous Headroom for Chaotic High Bounces) */}
            <div className="vl-avatar-wrap">
              <div
                className="vl-avatar-motion"
                style={motionStyles[lab.id] || {}}
              >
                <ThreeDAvatar
                  expression={avatarExprs[lab.id] || 'idle'}
                  glowColor={lab.glowColor}
                  modelColor={lab.modelColor}
                  size={AVATAR_SIZE}
                  mouseOffset={isIntroBouncing ? { x: 0, y: 0 } : getOffset(lab.id)}
                  onLoaded={handleAvatarLoaded}
                />
              </div>
            </div>

            {/* Enter Lab button (Positioned Lower) */}
            <button
              type="button"
              className="vl-card-btn"
            >
              {lab.btnText}
              <ArrowRight size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
