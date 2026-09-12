'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import gsap from 'gsap';
import {
  BookOpen,
  Sparkles,
  FlaskConical,
  BarChart3,
  Sun,
  Moon,
  ChevronDown,
  ChevronUp,
  Zap,
  RotateCcw,
  DoorOpen,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Award,
  FileText,
  Briefcase,
  FolderOpen,
  Trees,
} from 'lucide-react';
import { HomeAvatarScene } from './engine/HomeAvatarScene';
import './home-avatar.css';

export const COURSES_DROPDOWN_ITEMS = [
  {
    id: 'explore-courses',
    label: 'Explore Courses',
    route: '/courses?tab=explore',
    Icon: BookOpen,
    audio: '/audio/home/tour/tour_courses.wav',
    dialogue: "Let’s take the user on a little tour of the courses page! ✨",
  },
  {
    id: 'quizzes',
    label: 'Quizzes',
    route: '/courses?tab=quizzes',
    Icon: Award,
    audio: '/audio/home/tour/tour_quizzes.wav',
    dialogue: "Alright, tour guides let’s show the user what’s waiting on theQuizzes page! 🚀",
  },
  {
    id: 'assignments',
    label: 'Assignments',
    route: '/courses?tab=assignments',
    Icon: FileText,
    audio: '/audio/home/tour/tour_assignments.wav',
    dialogue: "Let’s give the user a quick peek around the assignment page! 👀✨",
  },
  {
    id: 'resource-hub',
    label: 'Resource Hub',
    route: '/courses?tab=resources',
    Icon: FolderOpen,
    audio: '/audio/home/tour/tour_courses.wav',
    dialogue: "Let’s take the user on a little tour of the courses page! ✨",
  },
];

export const TOUR_NAV_ITEMS = [
  {
    id: 'vedika-ai',
    label: 'Vedika AI',
    route: '/vedika-ai',
    Icon: Sparkles,
    audio: '/audio/home/tour/tour_vedika_ai.wav',
    dialogue: "Come along! Let’s show the user around the vedika AI page. 🌟",
  },
  {
    id: 'vedika-labs',
    label: 'Virtual Labs',
    route: '/vedika-labs',
    Icon: FlaskConical,
    audio: '/audio/home/tour/tour_vedika_labs.wav',
    dialogue: "Ready for a little adventure? Let’s explore the  vedika labs page together! 🪐",
  },
  {
    id: 'progress',
    label: 'Progress',
    route: '/progress',
    Icon: BarChart3,
    audio: '/audio/home/tour/tour_progress.wav',
    dialogue: "Everyone on board! The progress page tour is about to begin. 🎒🚀",
  },
  {
    id: 'jobs',
    label: 'Jobs',
    route: '/jobs',
    Icon: Briefcase,
    audio: '/audio/home/tour/tour_jobs.wav',
    dialogue: "Lets have a look! what do we have in Jobs page?",
  },
  {
    id: 'lost-avatars',
    label: 'Lost Avatars',
    route: '/lost-avatars',
    Icon: Trees,
    audio: '/audio/home/tour/tour_vedika_labs.wav',
    dialogue: "Step into the night forest sanctuary and meet our wandering avatar companions!",
  },
];

/* ── 4-Point Golden Sparkle Beside VEDIKA ── */
function GoldSparkleStar({ size = 26, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      style={{ display: 'block' }}
    >
      <path d="M12 2C12.5 7.2 16.8 11.5 22 12C16.8 12.5 12.5 16.8 12 22C11.5 16.8 7.2 12.5 2 12C7.2 11.5 11.5 7.2 12 2Z" />
      <path d="M19 2.5C19.2 4.2 20.8 5.8 22.5 6C20.8 6.2 19.2 7.8 19 9.5C18.8 7.8 17.2 6.2 15.5 6C17.2 5.8 18.8 4.2 19 2.5Z" />
    </svg>
  );
}

let isAudioUnlocked = false;
function unlockAudio() {
  if (typeof window === 'undefined' || isAudioUnlocked) return;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      const ctx = new AudioContextClass();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.value = 0.0001;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(0);
      osc.stop(0.01);
      isAudioUnlocked = true;
    }
  } catch (e) {}
}

export default function HomeAvatarPage() {
  const router = useRouter();
  const canvasRef = useRef(null);
  const avatarCanvasRef = useRef(null);
  const sceneRef = useRef(null);

  const [isReady, setIsReady] = useState(false);
  const [isDoorOpen, setIsDoorOpen] = useState(true);
  const [isThemeDark, setIsThemeDark] = useState(true);
  const [transitionDestTitle, setTransitionDestTitle] = useState('Courses');
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('frappe_user');
      if (stored) {
        try {
          setCurrentUser(JSON.parse(stored));
        } catch (e) {}
      }
      const currentTheme = localStorage.getItem('theme') || 'dark';
      setIsThemeDark(currentTheme === 'dark');
      document.documentElement.setAttribute('data-theme', currentTheme);
      document.body.style.backgroundColor = currentTheme === 'dark' ? '#07080F' : '#F9FAFB';
    }
  }, []);

  const handleToggleTheme = () => {
    const next = !isThemeDark;
    setIsThemeDark(next);
    const themeStr = next ? 'dark' : 'light';
    localStorage.setItem('theme', themeStr);
    document.documentElement.setAttribute('data-theme', themeStr);
    document.body.style.backgroundColor = next ? '#07080F' : '#F9FAFB';
  };

  // Scroll Steps: 0 = Intro/Hidden, 1 = Mowgli, 2 = Belle & Moana, 3 = Bhageera
  const [scrollStep, setScrollStep] = useState(0);
  const scrollStepRef = useRef(0);
  const isAnimatingRef = useRef(false);

  // Individual letter refs for VEDIKA
  const heroRef = useRef(null);
  const row1Ref = useRef(null);
  const row2Ref = useRef(null);
  const vRef = useRef(null);
  const eRef = useRef(null);
  const dRef = useRef(null);
  const i1Ref = useRef(null);
  const kRef = useRef(null);
  const a1Ref = useRef(null);
  const sparkleRef = useRef(null);

  // Individual letter refs for AI TUTOR
  const a2Ref = useRef(null);
  const i2Ref = useRef(null);
  const t1Ref = useRef(null);
  const uRef = useRef(null);
  const t2Ref = useRef(null);
  const oRef = useRef(null);
  const rRef = useRef(null);


  // Animation Playback & Inspection State
  const [isPaused, setIsPaused] = useState(false);
  const [animSpeed, setAnimSpeed] = useState(1.0);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [coursesDropdownOpen, setCoursesDropdownOpen] = useState(false);
  const coursesTimeoutRef = useRef(null);

  const handleCoursesMouseEnter = () => {
    if (coursesTimeoutRef.current) {
      clearTimeout(coursesTimeoutRef.current);
      coursesTimeoutRef.current = null;
    }
    setCoursesDropdownOpen(true);
  };

  const handleCoursesMouseLeave = () => {
    if (coursesTimeoutRef.current) {
      clearTimeout(coursesTimeoutRef.current);
    }
    coursesTimeoutRef.current = setTimeout(() => {
      setCoursesDropdownOpen(false);
    }, 400);
  };

  useEffect(() => {
    return () => {
      if (coursesTimeoutRef.current) clearTimeout(coursesTimeoutRef.current);
    };
  }, []);

  const [activeTime, setActiveTime] = useState(0.0);
  const [isDeparting, setIsDeparting] = useState(false);
  const [showTransitionOverlay, setShowTransitionOverlay] = useState(false);
  const maxDuration = 2.5;
  const activeTextTlRef = useRef(null);

  // 1. Initialize Three.js 3D Scene with Dual Canvases (Background Room + Foreground Avatars)
  useEffect(() => {
    const canvas = canvasRef.current;
    const avatarCanvas = avatarCanvasRef.current;
    if (!canvas) return;

    const scene = new HomeAvatarScene(
      canvas,
      avatarCanvas,
      () => {
        setIsReady(true);
      },
      (doorState) => {
        setIsDoorOpen(doorState);
      }
    );
    sceneRef.current = scene;

    return () => {
      if (sceneRef.current) {
        sceneRef.current.dispose();
        sceneRef.current = null;
      }
    };
  }, []);

  // 2. Audio Unlock on first user gesture
  useEffect(() => {
    const handleGesture = () => unlockAudio();
    window.addEventListener('pointerdown', handleGesture, { passive: true });
    window.addEventListener('keydown', handleGesture, { passive: true });
    window.addEventListener('wheel', handleGesture, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', handleGesture);
      window.removeEventListener('keydown', handleGesture);
      window.removeEventListener('wheel', handleGesture);
    };
  }, []);

  // 3. Exact Typography Intro Animation on Page Load — Combined Syllable Clusters
  const playTypographyIntro = useCallback(() => {
    // Syllables: VE, DI, KA (row 1) and AI, TU, TOR (row 2)
    const clusters = [
      { spans: [vRef.current?.querySelector('span'), eRef.current?.querySelector('span')].filter(Boolean), fromX: '190%' },
      { spans: [dRef.current?.querySelector('span'), i1Ref.current?.querySelector('span')].filter(Boolean), fromX: '-190%' },
      { spans: [kRef.current?.querySelector('span'), a1Ref.current?.querySelector('span')].filter(Boolean), fromX: '190%' },
      { spans: [a2Ref.current?.querySelector('span'), i2Ref.current?.querySelector('span')].filter(Boolean), fromX: '-190%' },
      { spans: [t1Ref.current?.querySelector('span'), uRef.current?.querySelector('span')].filter(Boolean), fromX: '190%' },
      { spans: [t2Ref.current?.querySelector('span'), oRef.current?.querySelector('span'), rRef.current?.querySelector('span')].filter(Boolean), fromX: '-190%' },
    ];

    const duration = 1.20;
    const entryTl = gsap.timeline({ delay: 0.15 });

    clusters.forEach((cluster, idx) => {
      const delay = idx * 0.08;
      cluster.spans.forEach((span) => {
        entryTl.fromTo(span, { x: cluster.fromX }, { x: '0%', duration, ease: 'power3.out' }, delay);
      });
    });

    if (sparkleRef.current) {
      entryTl.fromTo(
        sparkleRef.current,
        { scale: 0, opacity: 0, rotation: -45 },
        { scale: 1, opacity: 1, rotation: 0, duration: 0.65, ease: 'back.out(2.0)' },
        0.55
      );
    }
  }, []);

  useEffect(() => {
    playTypographyIntro();
  }, [playTypographyIntro]);

  /**
   * SCROLL STEP 1: Words part slightly -> Avatar approaches -> Avatar breaches and pushes letters -> Words snap shut
   */
  const executeStep1 = useCallback(() => {
    if (scrollStepRef.current !== 0 || isAnimatingRef.current) return;
    isAnimatingRef.current = true;
    setScrollStep(1);
    scrollStepRef.current = 1;

    const row1 = row1Ref.current;
    const row2 = row2Ref.current;

    const tl = gsap.timeline({
      onComplete: () => {
        setTimeout(() => {
          isAnimatingRef.current = false;
        }, 2200);
      },
    });
    activeTextTlRef.current = tl;

    // Trigger 3D avatar pop-out with 3D soft wall pocket
    if (sceneRef.current) {
      sceneRef.current.playStep1();
    }

    // ── Phase 1 (0.00s – 0.28s): 3D Wall Pocket Stretches Open behind words ("2. PEEKS OUT") ──
    // "VEDIKA" eases up slightly (-10px), "AI TUTOR" eases down (+16px) with the soft pocket lip
    if (row1) tl.to(row1, { y: -10, duration: 0.28, ease: 'power2.out' }, 0);
    if (row2) tl.to(row2, { y: 16, duration: 0.28, ease: 'power2.out' }, 0);

    // ── Phase 2 (0.28s – 0.48s): Avatar breaches forward into room; center letters push out ──
    const ripMoment = 0.28;
    const ripDuration = 0.20;

    // Center letters directly in front of Mowgli push furthest
    if (dRef.current)  tl.to(dRef.current,  { y: -44, rotation: -3, duration: ripDuration, ease: 'power2.out' }, ripMoment);
    if (i1Ref.current) tl.to(i1Ref.current, { y: -44, rotation: 3,  duration: ripDuration, ease: 'power2.out' }, ripMoment);
    if (t1Ref.current) tl.to(t1Ref.current, { y: 44,  rotation: 3,  duration: ripDuration, ease: 'power2.out' }, ripMoment);
    if (uRef.current)  tl.to(uRef.current,  { y: 44,  rotation: -3, duration: ripDuration, ease: 'power2.out' }, ripMoment);

    // Adjacent letters push moderately
    if (eRef.current)  tl.to(eRef.current,  { y: -20, rotation: -2, duration: ripDuration, ease: 'power2.out' }, ripMoment + 0.03);
    if (kRef.current)  tl.to(kRef.current,  { y: -20, rotation: 2,  duration: ripDuration, ease: 'power2.out' }, ripMoment + 0.03);
    if (i2Ref.current) tl.to(i2Ref.current, { y: 20,  rotation: 2,  duration: ripDuration, ease: 'power2.out' }, ripMoment + 0.03);
    if (t2Ref.current) tl.to(t2Ref.current, { y: 20,  rotation: -2, duration: ripDuration, ease: 'power2.out' }, ripMoment + 0.03);

    // Outer letters displace slightly
    if (vRef.current)  tl.to(vRef.current,  { y: -8, rotation: -1, duration: ripDuration, ease: 'power2.out' }, ripMoment + 0.05);
    if (a1Ref.current) tl.to(a1Ref.current, { y: -8, rotation: 1,  duration: ripDuration, ease: 'power2.out' }, ripMoment + 0.05);
    if (a2Ref.current) tl.to(a2Ref.current, { y: 8,  rotation: 1,  duration: ripDuration, ease: 'power2.out' }, ripMoment + 0.05);
    if (oRef.current)  tl.to(oRef.current,  { y: 8,  rotation: -1, duration: ripDuration, ease: 'power2.out' }, ripMoment + 0.05);
    if (rRef.current)  tl.to(rRef.current,  { y: 4,  rotation: -1, duration: ripDuration, ease: 'power2.out' }, ripMoment + 0.05);

    // ── Phase 3 (0.52s – 0.85s): Avatar Clears into Room; Words Elastically Snap Back ──
    const snapMoment = 0.52;
    const snapDuration = 0.38;

    if (row1) tl.to(row1, { y: 0, duration: snapDuration, ease: 'elastic.out(1.15, 0.45)' }, snapMoment);
    if (row2) tl.to(row2, { y: 0, duration: snapDuration, ease: 'elastic.out(1.15, 0.45)' }, snapMoment);

    const allLetterRefs = [vRef, eRef, dRef, i1Ref, kRef, a1Ref, a2Ref, i2Ref, t1Ref, uRef, t2Ref, oRef, rRef];
    allLetterRefs.forEach((ref, idx) => {
      if (ref.current) {
        tl.to(ref.current, { y: 0, rotation: 0, duration: snapDuration, ease: 'elastic.out(1.15, 0.45)' }, snapMoment + (idx % 3) * 0.015);
      }
    });
  }, []);

  /**
   * SCROLL STEP 2: Twin Aperture Pop-Out -> Belle pushes left letters -> Moana pushes right letters -> Words snap shut
   */
  const executeStep2 = useCallback(() => {
    if (scrollStepRef.current !== 1 || isAnimatingRef.current) return;
    isAnimatingRef.current = true;
    setScrollStep(2);
    scrollStepRef.current = 2;

    const row1 = row1Ref.current;
    const row2 = row2Ref.current;

    const tl = gsap.timeline({
      onComplete: () => {
        setTimeout(() => {
          isAnimatingRef.current = false;
        }, 5500);
      },
    });
    activeTextTlRef.current = tl;

    // Trigger 3D avatar pop-out
    if (sceneRef.current) {
      sceneRef.current.playStep2();
    }

    // Phase 1 (0.00s - 0.22s): Words part
    if (row1) tl.to(row1, { y: -16, duration: 0.22, ease: 'power2.out' }, 0);
    if (row2) tl.to(row2, { y: 16, duration: 0.22, ease: 'power2.out' }, 0);

    // Phase 2A (0.28s - 0.48s): BELLE breaches and pushes LEFT letters
    const belleMoment = 0.28;
    const belleDuration = 0.20;

    if (eRef.current)  tl.to(eRef.current,  { y: -46, rotation: -3.5, duration: belleDuration, ease: 'power2.out' }, belleMoment);
    if (dRef.current)  tl.to(dRef.current,  { y: -38, rotation: 2.5,  duration: belleDuration, ease: 'power2.out' }, belleMoment);
    if (vRef.current)  tl.to(vRef.current,  { y: -18, rotation: -2,   duration: belleDuration, ease: 'power2.out' }, belleMoment);

    if (i2Ref.current) tl.to(i2Ref.current, { y: 46,  rotation: -3,   duration: belleDuration, ease: 'power2.out' }, belleMoment);
    if (a2Ref.current) tl.to(a2Ref.current, { y: 38,  rotation: 3,    duration: belleDuration, ease: 'power2.out' }, belleMoment);
    if (t1Ref.current) tl.to(t1Ref.current, { y: 30,  rotation: -2,   duration: belleDuration, ease: 'power2.out' }, belleMoment);

    // Left letters snap shut as Belle clears text
    const belleSnap = 0.52;
    [vRef, eRef, dRef, a2Ref, i2Ref, t1Ref].forEach((ref) => {
      if (ref.current) {
        tl.to(ref.current, { y: 0, rotation: 0, duration: 0.35, ease: 'elastic.out(1.15, 0.45)' }, belleSnap);
      }
    });

    // Phase 2B (0.63s - 0.83s): MOANA breaches and pushes RIGHT letters (0.35s stagger)
    const moanaMoment = 0.63;
    const moanaDuration = 0.20;

    if (a1Ref.current) tl.to(a1Ref.current, { y: -48, rotation: 3.5,  duration: moanaDuration, ease: 'power2.out' }, moanaMoment);
    if (kRef.current)  tl.to(kRef.current,  { y: -42, rotation: -2.5, duration: moanaDuration, ease: 'power2.out' }, moanaMoment);

    if (rRef.current)  tl.to(rRef.current,  { y: 48,  rotation: -3.5, duration: moanaDuration, ease: 'power2.out' }, moanaMoment);
    if (oRef.current)  tl.to(oRef.current,  { y: 44,  rotation: 3,    duration: moanaDuration, ease: 'power2.out' }, moanaMoment);
    if (t2Ref.current) tl.to(t2Ref.current, { y: 26,  rotation: 2,    duration: moanaDuration, ease: 'power2.out' }, moanaMoment);

    // Right letters snap shut as Moana clears text
    const moanaSnap = 0.88;
    [kRef, a1Ref, t2Ref, oRef, rRef].forEach((ref) => {
      if (ref.current) {
        tl.to(ref.current, { y: 0, rotation: 0, duration: 0.38, ease: 'elastic.out(1.15, 0.45)' }, moanaSnap);
      }
    });

    if (row1) tl.to(row1, { y: 0, duration: 0.40, ease: 'power2.inOut' }, moanaSnap);
    if (row2) tl.to(row2, { y: 0, duration: 0.40, ease: 'power2.inOut' }, moanaSnap);
  }, []);

  /**
   * SCROLL STEP 3: Words part slightly -> Bhageera pushes ONLY right letters -> Words snap shut
   */
  const executeStep3 = useCallback(() => {
    if (scrollStepRef.current !== 2 || isAnimatingRef.current) return;
    isAnimatingRef.current = true;
    setScrollStep(3);
    scrollStepRef.current = 3;

    const row1 = row1Ref.current;
    const row2 = row2Ref.current;

    const tl = gsap.timeline({
      onComplete: () => {
        setTimeout(() => {
          isAnimatingRef.current = false;
        }, 5800);
      },
    });
    activeTextTlRef.current = tl;

    // Trigger 3D avatar pop-out
    if (sceneRef.current) {
      sceneRef.current.playStep3();
    }

    // Phase 1 (0.00s - 0.22s): Words part
    if (row1) tl.to(row1, { y: -16, duration: 0.22, ease: 'power2.out' }, 0);
    if (row2) tl.to(row2, { y: 16, duration: 0.22, ease: 'power2.out' }, 0);

    // Phase 2 (0.28s - 0.48s): BHAGEERA pushes ONLY RIGHT letters
    const pushMoment = 0.28;
    const pushDuration = 0.20;

    if (a1Ref.current) tl.to(a1Ref.current, { y: -50, rotation: 3.5,  duration: pushDuration, ease: 'power2.out' }, pushMoment);
    if (kRef.current)  tl.to(kRef.current,  { y: -46, rotation: -3,   duration: pushDuration, ease: 'power2.out' }, pushMoment);

    if (rRef.current)  tl.to(rRef.current,  { y: 50,  rotation: -3.5, duration: pushDuration, ease: 'power2.out' }, pushMoment);
    if (oRef.current)  tl.to(oRef.current,  { y: 48,  rotation: 3,    duration: pushDuration, ease: 'power2.out' }, pushMoment);
    if (t2Ref.current) tl.to(t2Ref.current, { y: 28,  rotation: 2,    duration: pushDuration, ease: 'power2.out' }, pushMoment);

    // Center letters have very slight sympathetic movement
    if (i1Ref.current) tl.to(i1Ref.current, { y: -12, duration: pushDuration, ease: 'power2.out' }, pushMoment);
    if (uRef.current)  tl.to(uRef.current,  { y: 12,  duration: pushDuration, ease: 'power2.out' }, pushMoment);

    // Phase 3 (0.52s - 0.78s): Bhageera clears text into mid-air, words snap shut
    const snapMoment = 0.52;
    const snapDuration = 0.40;

    if (row1) tl.to(row1, { y: 0, duration: snapDuration, ease: 'power2.inOut' }, snapMoment);
    if (row2) tl.to(row2, { y: 0, duration: snapDuration, ease: 'power2.inOut' }, snapMoment);

    const rightLetters = [kRef, a1Ref, i1Ref, t2Ref, oRef, rRef, uRef];
    rightLetters.forEach((ref) => {
      if (ref.current) {
        tl.to(ref.current, { y: 0, rotation: 0, duration: snapDuration, ease: 'elastic.out(1.15, 0.45)' }, snapMoment);
      }
    });
  }, []);

  /**
   * Universal Step Advancer on Scroll/Touch/Key
   */
  const advanceStep = useCallback(() => {
    unlockAudio();
    if (isAnimatingRef.current) return;
    const current = scrollStepRef.current;
    if (current === 0) {
      executeStep1();
    } else if (current === 1) {
      executeStep2();
    } else if (current === 2) {
      executeStep3();
    }
  }, [executeStep1, executeStep2, executeStep3]);

  // Intercept Wheel / Scroll Gestures
  useEffect(() => {
    const handleWheel = (e) => {
      if (scrollStepRef.current < 3) {
        if (e.cancelable) e.preventDefault();
        if (!isAnimatingRef.current && Math.abs(e.deltaY) > 2.5) {
          advanceStep();
        }
      }
    };

    let touchStartY = 0;
    const handleTouchStart = (e) => {
      if (e.touches && e.touches[0]) {
        touchStartY = e.touches[0].clientY;
      }
    };
    const handleTouchMove = (e) => {
      if (scrollStepRef.current < 3 && e.touches && e.touches[0]) {
        const delta = touchStartY - e.touches[0].clientY;
        if (Math.abs(delta) > 6) {
          if (e.cancelable) e.preventDefault();
          if (!isAnimatingRef.current) {
            advanceStep();
          }
        }
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [advanceStep]);

  // ── Animation Play / Pause / Inspector Handlers ──
  const handleTogglePause = useCallback(() => {
    setIsPaused((prev) => {
      const next = !prev;
      if (next) {
        gsap.globalTimeline.pause();
        if (sceneRef.current) sceneRef.current.pause();
      } else {
        gsap.globalTimeline.play();
        if (sceneRef.current) sceneRef.current.resume();
      }
      return next;
    });
  }, []);

  const handleSpeedChange = useCallback((speed) => {
    setAnimSpeed(speed);
    gsap.globalTimeline.timeScale(speed);
  }, []);

  const handleStepFrame = useCallback((delta) => {
    gsap.globalTimeline.pause();
    if (sceneRef.current) sceneRef.current.pause();
    setIsPaused(true);

    const textTl = activeTextTlRef.current;
    const avTl = sceneRef.current?.getActiveTimeline();

    setActiveTime((prev) => {
      let next = prev + delta;
      if (next < 0) next = 0;
      if (next > maxDuration) next = maxDuration;
      if (textTl) textTl.time(next);
      if (avTl) avTl.time(next);
      return next;
    });
  }, [maxDuration]);

  const handleScrub = useCallback((newTime) => {
    gsap.globalTimeline.pause();
    if (sceneRef.current) sceneRef.current.pause();
    setIsPaused(true);

    const textTl = activeTextTlRef.current;
    const avTl = sceneRef.current?.getActiveTimeline();

    if (textTl) textTl.time(newTime);
    if (avTl) avTl.time(newTime);
    setActiveTime(newTime);
  }, []);

  const handleJumpToStep = useCallback((stepIndex) => {
    gsap.globalTimeline.play();
    setIsPaused(false);
    isAnimatingRef.current = false;

    // Reset typography positions
    const row1 = row1Ref.current;
    const row2 = row2Ref.current;
    if (row1) gsap.set(row1, { y: 0 });
    if (row2) gsap.set(row2, { y: 0 });
    [vRef, eRef, dRef, i1Ref, kRef, a1Ref, a2Ref, i2Ref, t1Ref, uRef, t2Ref, oRef, rRef].forEach((ref) => {
      if (ref.current) gsap.set(ref.current, { y: 0, scaleY: 1, rotation: 0 });
    });

    if (stepIndex === 1) {
      if (sceneRef.current) sceneRef.current.settleAvatarsUpTo(0);
      scrollStepRef.current = 0;
      setScrollStep(0);
      setActiveTime(0);
      setTimeout(() => executeStep1(), 60);
    } else if (stepIndex === 2) {
      if (sceneRef.current) sceneRef.current.settleAvatarsUpTo(1);
      scrollStepRef.current = 1;
      setScrollStep(1);
      setActiveTime(0);
      setTimeout(() => executeStep2(), 60);
    } else if (stepIndex === 3) {
      if (sceneRef.current) sceneRef.current.settleAvatarsUpTo(2);
      scrollStepRef.current = 2;
      setScrollStep(2);
      setActiveTime(0);
      setTimeout(() => executeStep3(), 60);
    }
  }, [executeStep1, executeStep2, executeStep3]);

  const handleReplayCurrentStep = useCallback(() => {
    const current = scrollStepRef.current;
    const targetStep = current === 0 ? 1 : current;
    handleJumpToStep(targetStep);
  }, [handleJumpToStep]);

  // Live active time ticker during playback
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      const textTl = activeTextTlRef.current;
      const avTl = sceneRef.current?.getActiveTimeline();
      if (textTl && textTl.isActive()) {
        setActiveTime(textTl.time());
      } else if (avTl && avTl.isActive()) {
        setActiveTime(avTl.time());
      }
    }, 45);
    return () => clearInterval(interval);
  }, [isPaused]);

  // Keyboard shortcuts (Space = Pause/Play, Arrows = Frame Step, R = Replay, 1/2/3 = Steps)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePause();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleStepFrame(0.05);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handleStepFrame(-0.05);
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handleReplayCurrentStep();
      } else if (e.key === '1') {
        e.preventDefault();
        handleJumpToStep(1);
      } else if (e.key === '2') {
        e.preventDefault();
        handleJumpToStep(2);
      } else if (e.key === '3') {
        e.preventDefault();
        handleJumpToStep(3);
      } else if (['ArrowDown', 'PageDown', 'Enter'].includes(e.code)) {
        if (scrollStepRef.current < 3) {
          e.preventDefault();
          if (!isAnimatingRef.current) advanceStep();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTogglePause, handleStepFrame, handleReplayCurrentStep, handleJumpToStep, advanceStep]);

  /**
   * Reset and Replay the Entire Pop-out Story Experience
   */
  const handleReplayAll = () => {
    unlockAudio();
    isAnimatingRef.current = false;
    setScrollStep(0);
    scrollStepRef.current = 0;

    if (sceneRef.current) {
      sceneRef.current.resetAvatars();
    }

    // Reset typography positions
    const row1 = row1Ref.current;
    const row2 = row2Ref.current;
    if (row1) gsap.set(row1, { y: 0 });
    if (row2) gsap.set(row2, { y: 0 });

    [vRef, eRef, dRef, i1Ref, kRef, a1Ref, a2Ref, i2Ref, t1Ref, uRef, t2Ref, oRef, rRef].forEach((ref) => {
      if (ref.current) {
        gsap.set(ref.current, { y: 0, scaleY: 1, rotation: 0 });
      }
    });

    // Replay typography entrance
    playTypographyIntro();
  };

  const handleToggleDoor = () => {
    if (sceneRef.current) {
      sceneRef.current.toggleDoor();
    }
  };

  const handleNavTour = (e, item) => {
    e.preventDefault();
    if (isDeparting) return;
    setIsDeparting(true);
    unlockAudio();

    // If companions haven't gathered on the rug yet, settle all 4 companions immediately
    if (scrollStepRef.current < 3) {
      if (sceneRef.current) {
        sceneRef.current.settleAvatarsUpTo(4);
      }
      setScrollStep(3);
      scrollStepRef.current = 3;
    }

    setTransitionDestTitle(item.label);

    if (sceneRef.current) {
      sceneRef.current.triggerFullDoorDeparture(item.audio, () => {
        setShowTransitionOverlay(true);
        setTimeout(() => {
          router.push(item.route);
        }, 1200);
      });
    } else {
      setShowTransitionOverlay(true);
      setTimeout(() => {
        router.push(item.route);
      }, 1000);
    }
  };

  return (
    <main className="ha-container">
      {/* ── 1. Three.js 3D WebGL Canvas Viewport (Background Room) ── */}
      <canvas ref={canvasRef} className="ha-canvas ha-canvas-bg" />

      {/* ── 1b. Foreground 3D Canvas (Avatars Popping Over Text) ── */}
      <canvas ref={avatarCanvasRef} className="ha-canvas ha-canvas-avatar" />

      {/* ── 2. Top Navigation Bar (With Interactive Companion Tour Guides) ── */}
      <nav className="ha-nav">
        <a href="/" className="ha-nav-left" style={{ textDecoration: 'none' }}>
          <div className="ha-nav-logo-box">
            <Zap size={20} />
          </div>
          <div className="ha-nav-brand-text">
            <span className="ha-nav-brand-title">VEDIKA</span>
            <span className="ha-nav-brand-sub">Learning Platform</span>
          </div>
        </a>

        <div className="ha-nav-links">
          {/* Courses with Dropdown */}
          <div
            className="ha-nav-dropdown-wrapper"
            onMouseEnter={handleCoursesMouseEnter}
            onMouseLeave={handleCoursesMouseLeave}
          >
            <button
              type="button"
              className={`ha-nav-dropdown-trigger ${coursesDropdownOpen ? 'ha-nav-dropdown-open' : ''}`}
              onClick={() => {
                if (coursesTimeoutRef.current) clearTimeout(coursesTimeoutRef.current);
                setCoursesDropdownOpen((prev) => !prev);
              }}
            >
              <BookOpen size={15} />
              <span>Courses</span>
              <ChevronDown
                size={13}
                style={{
                  transform: coursesDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease',
                }}
              />
            </button>

            {coursesDropdownOpen && (
              <div
                className="ha-nav-dropdown-menu"
                onMouseEnter={handleCoursesMouseEnter}
                onMouseLeave={handleCoursesMouseLeave}
              >
                {COURSES_DROPDOWN_ITEMS.map((subItem) => {
                  const SubIcon = subItem.Icon;
                  return (
                    <button
                      key={subItem.id}
                      type="button"
                      className="ha-nav-dropdown-item"
                      onClick={(e) => {
                        if (coursesTimeoutRef.current) clearTimeout(coursesTimeoutRef.current);
                        setCoursesDropdownOpen(false);
                        handleNavTour(e, subItem);
                      }}
                      title={subItem.dialogue}
                    >
                      <SubIcon size={14} />
                      <span>{subItem.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Core Navigation Items */}
          {TOUR_NAV_ITEMS.map((item) => {
            const NavIcon = item.Icon;
            return (
              <a
                key={item.id}
                href={item.route}
                className="ha-nav-link"
                onClick={(e) => handleNavTour(e, item)}
                title={item.dialogue}
              >
                <NavIcon size={15} />
                <span>{item.label}</span>
              </a>
            );
          })}
        </div>

        <div className="ha-nav-right">
          <button
            type="button"
            className="ha-nav-theme-btn"
            onClick={handleToggleTheme}
            aria-label="Toggle Theme"
          >
            {isThemeDark ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          <div className="ha-nav-user-pill">
            <div className="ha-nav-avatar-circle">
              {currentUser?.full_name ? currentUser.full_name.substring(0, 2).toUpperCase() : 'AM'}
            </div>
            <span>{currentUser?.full_name || 'Aarav Mehta'}</span>
            <ChevronDown size={14} />
          </div>
        </div>
      </nav>

      {/* ── 3. Hero Left Content: Luxury Editorial Serif Typography ── */}
      <section className="ha-hero" ref={heroRef}>
        <div className="ha-eyebrow">
          LEARN • EXPLORE • EXPERIMENT • GROW
        </div>

        <div className="ha-title-wrapper" onClick={advanceStep} title="Click to pop next avatar!">


          <h1 className="ha-title">
            {/* Row 1: V E D I K A ✦ */}
            <div className="ha-title-row ha-title-row-1" ref={row1Ref}>
              <div className="ha-letter" ref={vRef} id="ha-v">
                <span>V</span>
              </div>
              <div className="ha-letter" ref={eRef} id="ha-e">
                <span>E</span>
              </div>
              <div className="ha-letter" ref={dRef} id="ha-d">
                <span>D</span>
              </div>
              <div className="ha-letter" ref={i1Ref} id="ha-i1">
                <span>I</span>
              </div>
              <div className="ha-letter" ref={kRef} id="ha-k">
                <span>K</span>
              </div>
              <div className="ha-letter" ref={a1Ref} id="ha-a1">
                <span>A</span>
              </div>
            </div>

            {/* Row 2: A I   T U T O R */}
            <div className="ha-title-row ha-title-row-2" ref={row2Ref}>
              <div className="ha-letter" ref={a2Ref} id="ha-a2">
                <span>A</span>
              </div>
              <div className="ha-letter" ref={i2Ref} id="ha-i2">
                <span>I</span>
              </div>
              <span className="ha-letter-space">&nbsp;</span>
              <div className="ha-letter" ref={t1Ref} id="ha-t1">
                <span>T</span>
              </div>
              <div className="ha-letter" ref={uRef} id="ha-u">
                <span>U</span>
              </div>
              <div className="ha-letter" ref={t2Ref} id="ha-t2">
                <span>T</span>
              </div>
              <div className="ha-letter" ref={oRef} id="ha-o">
                <span>O</span>
              </div>
              <div className="ha-letter" ref={rRef} id="ha-r">
                <span>R</span>
              </div>
            </div>
          </h1>
        </div>
      </section>

      {/* ── 5. Bottom Center Scroll Progression / Hint Pill ── */}
      <div className="ha-bottom-hint-container">
        <div className="ha-scroll-hint-pill" onClick={advanceStep} title="Scroll down or click to advance">
          <span className="ha-scroll-dot" />
          <span className="ha-scroll-hint-text">
            {scrollStep === 0 && 'Scroll down to meet Vedika ✦'}
            {scrollStep === 1 && 'Scroll down to bring more friends ✦'}
            {scrollStep === 2 && 'Scroll down for the final companion ✦'}
            {scrollStep === 3 && 'All companions gathered on the rug ✨'}
          </span>
          {scrollStep < 3 && <ChevronDown size={14} className="ha-scroll-chevron" />}
        </div>
      </div>

      {/* ── 6. Floating Interactive Controls Dock (Bottom Right) ── */}
      <aside className="ha-controls-dock">
        <button
          type="button"
          className="ha-dock-btn"
          onClick={handleReplayAll}
          title="Replay from beginning"
        >
          <RotateCcw size={14} />
          <span>Replay Story</span>
        </button>

        <button
          type="button"
          className={`ha-dock-btn ${isDoorOpen ? 'ha-dock-btn-active' : ''}`}
          onClick={handleToggleDoor}
          title="Toggle 3D Arched Door open/close"
        >
          <DoorOpen size={14} />
          <span>{isDoorOpen ? 'Close Door' : 'Open Door'}</span>
        </button>
      </aside>

      {/* ── 7. Floating Animation Inspector & Play/Pause Dock (Bottom Left) ── */}
      <aside className={`ha-anim-inspector ${!isInspectorOpen ? 'ha-anim-inspector-collapsed' : ''}`}>
        <div className="ha-inspector-header">
          <div className="ha-inspector-title-group">
            <span className={`ha-status-badge ${isPaused ? 'ha-status-paused' : 'ha-status-playing'}`}>
              {isPaused ? '❚❚ PAUSED' : '● PLAYING'}
            </span>
            {isInspectorOpen && (
              <span className="ha-time-readout">
                {activeTime.toFixed(2)}s
              </span>
            )}
          </div>
          <button
            type="button"
            className="ha-collapse-btn"
            onClick={() => setIsInspectorOpen((prev) => !prev)}
            title={isInspectorOpen ? 'Collapse inspector' : 'Expand inspector'}
          >
            {isInspectorOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>

        {isInspectorOpen && (
          <>
            {/* Primary Controls Row: Play/Pause, Step Back, Step Forward, Replay */}
            <div className="ha-inspector-controls">
              <button
                type="button"
                className="ha-btn-play-pause"
                onClick={handleTogglePause}
                title="Pause or Resume pop-out animation (Space)"
              >
                {isPaused ? <Play size={13} fill="currentColor" /> : <Pause size={13} fill="currentColor" />}
                <span>{isPaused ? 'Play' : 'Pause'}</span>
              </button>

              <button
                type="button"
                className="ha-btn-step"
                onClick={() => handleStepFrame(-0.05)}
                title="Step backward 0.05s (Arrow Left)"
              >
                <SkipBack size={12} />
                <span>-0.05s</span>
              </button>

              <button
                type="button"
                className="ha-btn-step"
                onClick={() => handleStepFrame(0.05)}
                title="Step forward 0.05s (Arrow Right)"
              >
                <span>+0.05s</span>
                <SkipForward size={12} />
              </button>

              <button
                type="button"
                className="ha-btn-replay"
                onClick={handleReplayCurrentStep}
                title="Replay current pop-out step (R)"
              >
                <RotateCcw size={12} />
                <span>Replay</span>
              </button>
            </div>

            {/* Timeline Scrubber */}
            <div className="ha-scrubber-row">
              <input
                type="range"
                min="0"
                max={maxDuration}
                step="0.02"
                value={activeTime}
                onChange={(e) => handleScrub(parseFloat(e.target.value))}
                className="ha-scrubber-slider"
                title="Drag to scrub timeline frame-by-frame"
              />
              <span className="ha-time-readout">{activeTime.toFixed(2)}s</span>
            </div>

            {/* Playback Speed Row */}
            <div className="ha-speed-row">
              <span className="ha-speed-label">Speed:</span>
              <div className="ha-speed-chips">
                {[0.1, 0.25, 0.5, 1.0].map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    className={`ha-speed-chip ${animSpeed === spd ? 'ha-speed-chip-active' : ''}`}
                    onClick={() => handleSpeedChange(spd)}
                    title={`Play at ${spd}x speed`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>

            {/* Step Quick-Jump Buttons */}
            <div className="ha-step-quick-row">
              <button
                type="button"
                className={`ha-step-chip ${scrollStep === 1 ? 'ha-step-chip-active' : ''}`}
                onClick={() => handleJumpToStep(1)}
                title="Test Step 1: Mowgli (VE-DI-KA text arch)"
              >
                Step 1 (VE-DI-KA)
              </button>
              <button
                type="button"
                className={`ha-step-chip ${scrollStep === 2 ? 'ha-step-chip-active' : ''}`}
                onClick={() => handleJumpToStep(2)}
                title="Test Step 2: Belle & Moana twin arch"
              >
                Step 2 (Belle/Moana)
              </button>
              <button
                type="button"
                className={`ha-step-chip ${scrollStep === 3 ? 'ha-step-chip-active' : ''}`}
                onClick={() => handleJumpToStep(3)}
                title="Test Step 3: Bhageera"
              >
                Step 3 (Bhageera)
              </button>
            </div>

            <div className="ha-hotkey-hint">
              [Space] Pause/Play • [←/→] Step • [0.1x] Slow-Mo • [R] Replay
            </div>
          </>
        )}
      </aside>

      {/* ── 8. Warm Golden Transition Overlay ("Entering the Knowledge World...") ── */}
      <div className={`ha-door-transition-overlay ${showTransitionOverlay ? 'ha-door-transition-active' : ''}`}>
        <div className="ha-door-transition-content">
          <div className="ha-door-transition-sparkle">
            <GoldSparkleStar size={52} />
          </div>
          <h2 className="ha-door-transition-title">Entering {transitionDestTitle}</h2>
          <p className="ha-door-transition-sub">Your companions are waiting for you inside...</p>
        </div>
      </div>
    </main>
  );
}
