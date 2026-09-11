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
import AvatarColorTuner from '@/components/AvatarColorTuner';
import DoctorStrangePortal from '@/components/DoctorStrangePortal';
import { playAvatarGreeting, stopAvatarGreeting } from '@/lib/avatarChorusSpeech';
import gsap from 'gsap';
import { checkPortalArrival, notifyPortalExitComplete, playDeepCosmicWhoosh, playAvatarWhoosh } from '@/lib/portalTransition';
import './vedika-labs.css';

// Idle expressions
const IDLE_STATES = [
  'idle', 'happy', 'idle', 'thinking',
  'sad', 'angry', 'idle', 'drowsy', 'happy', 'idle',
];

/**
 * 4 Fixed Labs with dedicated 3D Avatars:
 * 1. Physics Lab: Neon Green (#39FF14 / /avatar_1_purple.webp)
 * 2. Chemistry Lab: Neon Pink (#FF6EFF / /avatar_2_lime.webp)
 * 3. Biology Lab: Neon Red (#FF3131 / /avatar_3_red.webp)
 * 4. Math Lab: Neon Orange (#FF5C00 / /avatar_4_blue.webp)
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
    glowColor: '#39FF14',
    modelColor: '#39FF14',
    texture: '/avatar_1_purple.webp?v=5',
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
    glowColor: '#FF6EFF',
    modelColor: '#FF6EFF',
    texture: '/avatar_2_lime.webp?v=5',
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
    glowColor: '#FF3131',
    modelColor: '#FF3131',
    texture: '/avatar_3_red.webp?v=5',
    accentClass: 'biology',
    greetingText: '"Hi, this is Moana, welcome to my biology lab"',
    badgeImg: '/badges/biology_badge.png',
  },
  {
    id: 'math',
    charId: 'bagheera',
    name: 'Bhageera',
    style: 'Pixar (Boy)',
    title: 'Math Lab',
    desc: 'Visualize equations and solve real-world problems.',
    url: '/vedika-labs/math',
    glowColor: '#FF5C00',
    modelColor: '#FF5C00',
    texture: '/avatar_4_blue.webp?v=5',
    accentClass: 'math',
    greetingText: '"Hi, this is Bhageera, welcome to my math lab"',
    badgeImg: '/badges/math_badge.png',
  },
];

export default function VedikaLabsHub() {
  const router = useRouter();
  const [stations, setStations] = useState(LAB_STATIONS);
  const [pageMouse, setPageMouse] = useState({ x: 0, y: 0 });
  const [hoveredLab, setHoveredLab] = useState(null);
  const [speakingAvatar, setSpeakingAvatar] = useState(null);
  const [showVoiceStudio, setShowVoiceStudio] = useState(false);
  const [isIntroBouncing, setIsIntroBouncing] = useState(true);
  const hasTriggeredRef = useRef(false);

  // Single Central Dimensional Portal State & Refs
  const portalRef = useRef(null);
  const physicsAvatarRef = useRef(null);
  const chemAvatarRef = useRef(null);
  const bioAvatarRef = useRef(null);
  const mathAvatarRef = useRef(null);
  const [isSettled, setIsSettled] = useState(false);

  // Arrival Sequence: Avatars emerge from the swirling black void ONE BY ONE directly into their stations
  const playLabsPortalArrival = useCallback(() => {
    const portal = portalRef.current;
    const avatars = [
      { el: physicsAvatarRef.current, dest: { left: '24.5%', top: '10%' }, pitch: 0.90 },
      { el: chemAvatarRef.current,    dest: { left: '41.2%', top: '-5%' },  pitch: 1.00 },
      { el: bioAvatarRef.current,     dest: { left: '58.8%', top: '-5%' },  pitch: 1.10 },
      { el: mathAvatarRef.current,    dest: { left: '79.2%', top: '7%' },   pitch: 1.20 },
    ];

    // Initial state: hidden inside the event horizon
    avatars.forEach(({ el }) => {
      if (el) {
        gsap.set(el, {
          left: '50%',
          top: '50%',
          scale: 0.001,
          opacity: 0,
          rotation: 0,
        });
      }
    });

    // Deep cosmic suction whoosh
    playDeepCosmicWhoosh(2.4, 1.0);

    const arrivalTl = gsap.timeline({
      onComplete: () => {
        setIsSettled(true);
      }
    });

    // 1. Black void portal opens in a dramatic swirling vortex motion
    if (portal) {
      arrivalTl.fromTo(portal, {
        scale: 0.001,
        rotation: -720,
        opacity: 0,
      }, {
        scale: 1.0,
        rotation: 0,
        opacity: 1.0,
        duration: 0.52,
        ease: 'power2.out',
      }, 0);
    }

    // 2. Avatars emerge ONE BY ONE directly into their individual lab stations with silky smooth flight
    const emergeStartTime = 0.28;
    avatars.forEach(({ el, dest, pitch }, idx) => {
      if (!el) return;
      const emergeTime = emergeStartTime + idx * 0.32;

      // Micro whoosh sound
      arrivalTl.call(() => {
        playAvatarWhoosh(pitch);
      }, null, emergeTime);

      // Directly emerge into own station destination with silky smooth easing
      arrivalTl.fromTo(el, {
        rotation: (idx % 2 === 0 ? -16 : 16),
      }, {
        left: dest.left,
        top: dest.top,
        scale: 1.0,
        opacity: 1,
        rotation: 0,
        duration: 0.74,
        ease: 'power2.out',
      }, emergeTime);
    });

    // 3. Portal swirls shut into absolute void
    const closeTime = emergeStartTime + avatars.length * 0.32 + 0.30;
    if (portal) {
      arrivalTl.to(portal, {
        scale: 0.001,
        rotation: 720,
        opacity: 0,
        duration: 0.45,
        ease: 'power2.in',
      }, closeTime);
    }
  }, []);

  // Departure Sequence: Avatars enter the swirling void ONE BY ONE directly from their own positions
  const playLabsPortalExit = useCallback(() => {
    const portal = portalRef.current;
    const avatars = [
      { el: physicsAvatarRef.current, pitch: 1.20 },
      { el: chemAvatarRef.current,    pitch: 1.10 },
      { el: bioAvatarRef.current,     pitch: 1.00 },
      { el: mathAvatarRef.current,    pitch: 0.88 },
    ];

    setIsSettled(false);
    playDeepCosmicWhoosh(2.4, 1.0);

    const exitTl = gsap.timeline({
      onComplete: () => {
        notifyPortalExitComplete();
      }
    });

    // 1. Black void portal opens in a swirling vortex motion
    if (portal) {
      exitTl.fromTo(portal, {
        scale: 0.001,
        rotation: -720,
        opacity: 0,
      }, {
        scale: 1.0,
        rotation: 0,
        opacity: 1.0,
        duration: 0.54,
        ease: 'power2.out',
      }, 0);
    }

    // 2. Avatars dive into swirling void ONE BY ONE directly from their stations with graceful spiral glide
    const enterStartTime = 0.25;
    avatars.forEach(({ el, pitch }, idx) => {
      if (!el) return;
      const stepTime = enterStartTime + idx * 0.34;

      // Micro whoosh sound
      exitTl.call(() => {
        playAvatarWhoosh(pitch);
      }, null, stepTime);

      // Dive smoothly from current station position into event horizon
      exitTl.to(el, {
        left: '50%',
        top: '50%',
        scale: 0.001,
        opacity: 0,
        rotation: (idx % 2 === 0 ? 360 : -360),
        duration: 0.58,
        ease: 'power2.inOut',
      }, stepTime);
    });

    // 3. Once all avatars have entered, the black void portal swirls shut
    const collapseTime = enterStartTime + avatars.length * 0.34 + 0.25;
    if (portal) {
      exitTl.to(portal, {
        scale: 0.001,
        rotation: 720,
        opacity: 0,
        duration: 0.42,
        ease: 'power2.in',
      }, collapseTime);
    }
  }, []);

  // Hook Cross-Page Portal Listeners
  useEffect(() => {
    const handleExit = () => {
      playLabsPortalExit();
    };
    window.addEventListener('vedika:portal-exit', handleExit);

    // Check if arrived via portal
    const arrival = checkPortalArrival('/vedika-labs');
    if (arrival.fromPortal) {
      const timer = setTimeout(() => {
        playLabsPortalArrival();
      }, 150);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('vedika:portal-exit', handleExit);
      };
    } else {
      setIsSettled(true);
    }

    return () => {
      window.removeEventListener('vedika:portal-exit', handleExit);
    };
  }, [playLabsPortalArrival, playLabsPortalExit]);

  // Real-time Color Tuner Listener
  useEffect(() => {
    const handleColorChange = (e) => {
      const { index, hex } = e.detail;
      setStations((prev) => {
        const next = [...prev];
        if (next[index]) {
          next[index] = { ...next[index], glowColor: hex, modelColor: hex };
        }
        return next;
      });
    };
    window.addEventListener('vedika_avatar_color_change', handleColorChange);
    return () => window.removeEventListener('vedika_avatar_color_change', handleColorChange);
  }, []);

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
    let isActive = true; // Guard against orphan timers after cleanup
    const timers = {};

    const scheduleNext = (labId) => {
      if (!isActive) return; // Don't schedule if effect was cleaned up
      const delay = 2800 + Math.random() * 3500;
      timers[labId] = setTimeout(() => {
        if (!isActive) return; // Double-check before state update
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
    return () => {
      isActive = false;
      Object.values(timers).forEach(clearTimeout);
    };
  }, [hoveredLab, isIntroBouncing, speakingAvatar]);

  // Hover Interaction & Voice Trigger
  const handleLabHover = (station) => {
    if (isIntroBouncing) return;
    setHoveredLab(station.id);

    // Trigger greeting
    playAvatarGreeting(
      station.charId,
      () => setSpeakingAvatar(station.charId),
      () => setSpeakingAvatar(null)
    );

    // Update expressions
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
      y: ((pageMouse.y - window.innerHeight / 2) / window.innerHeight) * 35,
    };
  };

  return (
    <div className="vl-page">
      {/* ── Top Hero Split Section ─────────────────────────────────── */}
      <div className="vl-hero-split">
        {/* Left Side: Headline & Quick Actions */}
        <div className="vl-hero-left">
          <h1 className="vl-hero-title">
            Vedika <span className="vl-hero-title-gradient">Virtual Labs</span>
          </h1>
          <p className="vl-hero-desc">
            Explore interactive 3D simulations guided by dedicated AI Lab Tutors. Experiment freely in safe virtual laboratory environments.
          </p>

          <button
            type="button"
            className="vl-voice-trigger"
            onClick={() => setShowVoiceStudio(true)}
            title="Open Voice Studio"
          >
            <Sparkles size={13} />
            <span>AI Voice Studio</span>
          </button>
        </div>

        {/* Right Side: 3D Stage with Hovering Avatars */}
        <div className="vl-stage-wrapper">
          {/* Seamless Vignette (Zero Box Border) */}
          <div className="vl-stage-vignette" />

          {/* Doctor Strange Sling Ring Portal (Single fiery spark ring + black void) */}
          <DoctorStrangePortal ref={portalRef} size={250} className="vl-central-portal-wrap" />

          {/* 1. Purple (Physics) — Above Newton's Cradle */}
          <div
            ref={physicsAvatarRef}
            className={`vl-pedestal-avatar vl-avatar-physics ${isSettled ? 'settled' : 'in-transit'}`}
            onClick={() => router.push('/vedika-labs/physics')}
            onMouseEnter={() => handleLabHover(stations[0])}
            onMouseLeave={handleLabLeave}
          >
            <div className={`vl-avatar-floating-inner ${isSettled ? 'vl-float-physics' : ''}`}>
              <ThreeDAvatar
                expression={avatarExprs.physics || 'happy'}
                glowColor={stations[0]?.glowColor || '#39FF14'}
                modelColor={stations[0]?.modelColor || '#39FF14'}
                textureUrl={stations[0]?.texture || '/avatar_1_purple.webp'}
                size={92}
                mouseOffset={getOffset()}
                isSpeaking={speakingAvatar === 'mowgli'}
                onLoaded={handleAvatarLoaded}
              />
            </div>
          </div>

          {/* 2. Lime (Chemistry) — Above Chemical Flask */}
          <div
            ref={chemAvatarRef}
            className={`vl-pedestal-avatar vl-avatar-chemistry ${isSettled ? 'settled' : 'in-transit'}`}
            onClick={() => router.push('/vedika-labs/chemistry')}
            onMouseEnter={() => handleLabHover(stations[1])}
            onMouseLeave={handleLabLeave}
          >
            <div className={`vl-avatar-floating-inner ${isSettled ? 'vl-float-chemistry' : ''}`}>
              <ThreeDAvatar
                expression={avatarExprs.chemistry || 'happy'}
                glowColor={stations[1]?.glowColor || '#FF6EFF'}
                modelColor={stations[1]?.modelColor || '#FF6EFF'}
                textureUrl={stations[1]?.texture || '/avatar_2_lime.webp'}
                size={92}
                mouseOffset={getOffset()}
                isSpeaking={speakingAvatar === 'belle'}
                onLoaded={handleAvatarLoaded}
              />
            </div>
          </div>

          {/* 3. Ruby (Biology) — Above Molecule Model */}
          <div
            ref={bioAvatarRef}
            className={`vl-pedestal-avatar vl-avatar-biology ${isSettled ? 'settled' : 'in-transit'}`}
            onClick={() => router.push('/vedika-labs/biology')}
            onMouseEnter={() => handleLabHover(stations[2])}
            onMouseLeave={handleLabLeave}
          >
            <div className={`vl-avatar-floating-inner ${isSettled ? 'vl-float-biology' : ''}`}>
              <ThreeDAvatar
                expression={avatarExprs.biology || 'happy'}
                glowColor={stations[2]?.glowColor || '#FF3131'}
                modelColor={stations[2]?.modelColor || '#FF3131'}
                textureUrl={stations[2]?.texture || '/avatar_3_red.webp'}
                size={92}
                mouseOffset={getOffset()}
                isSpeaking={speakingAvatar === 'moana'}
                onLoaded={handleAvatarLoaded}
              />
            </div>
          </div>

          {/* 4. Blue (Math) — Above Geometric Cone */}
          <div
            ref={mathAvatarRef}
            className={`vl-pedestal-avatar vl-avatar-math ${isSettled ? 'settled' : 'in-transit'}`}
            onClick={() => router.push('/vedika-labs/math')}
            onMouseEnter={() => handleLabHover(stations[3])}
            onMouseLeave={handleLabLeave}
          >
            <div className={`vl-avatar-floating-inner ${isSettled ? 'vl-float-math' : ''}`}>
              <ThreeDAvatar
                expression={avatarExprs.math || 'happy'}
                glowColor={stations[3]?.glowColor || '#FF5C00'}
                modelColor={stations[3]?.modelColor || '#FF5C00'}
                textureUrl={stations[3]?.texture || '/avatar_4_blue.webp'}
                size={92}
                mouseOffset={getOffset()}
                isSpeaking={speakingAvatar === 'bagheera'}
                onLoaded={handleAvatarLoaded}
              />
            </div>
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
            stroke="rgba(45, 212, 191, 0.25)"
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
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="vl-modal-list">
              {LAB_STATIONS.map((station) => (
                <div
                  key={station.id}
                  className="vl-modal-row"
                  style={{
                    border: `1px solid ${station.glowColor}30`,
                  }}
                >
                  <div className="vl-modal-char-info">
                    <div
                      className="vl-modal-char-dot"
                      style={{ background: station.glowColor }}
                    />
                    <div>
                      <div className="vl-modal-char-name">{station.name}</div>
                      <div className="vl-modal-char-line">{station.greetingText}</div>
                    </div>
                  </div>

                  <div className="vl-modal-actions">
                    <button
                      type="button"
                      className="vl-modal-play-btn"
                      style={{
                        background: station.glowColor,
                        color: '#050811',
                      }}
                      onClick={() => playAvatarGreeting(station.charId)}
                    >
                      <Play size={11} fill="#050811" />
                      <span>Play</span>
                    </button>

                    <a
                      href={`/audio/avatars/${station.charId}_welcome.mp3`}
                      download={`${station.charId}_welcome.mp3`}
                      className="vl-modal-download-btn"
                      title="Download MP3"
                    >
                      <Download size={13} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* Real-time Interactive Color Tuner Widget */}
      <AvatarColorTuner />
    </div>
  );
}
