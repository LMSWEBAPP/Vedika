'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import gsap from 'gsap';
import { ChevronDown, Sparkles, Wand2, Rocket, Magnet, RotateCcw } from 'lucide-react';
import AvatarColorTuner from './AvatarColorTuner';
import DoctorStrangePortal from './DoctorStrangePortal';
import { notifyPortalExitComplete, triggerPortalNavigation, checkPortalArrival, playDeepCosmicWhoosh, playAvatarWhoosh } from '@/lib/portalTransition';
import './VedikaHeroZajno.css';

// Module-level cached GLTF geometry and textures
let cachedMasterGeometry = null;
const cachedTextures = {};

const BUDDIES = [
  { id: 'mowgli',   name: 'Mowgli',   texture: '/avatar_1_purple.webp?v=5', color: '#39FF14', targetX: -3.15 },
  { id: 'belle',    name: 'Belle',    texture: '/avatar_2_lime.webp?v=5',   color: '#FF6EFF', targetX: -1.05 },
  { id: 'moana',    name: 'Moana',    texture: '/avatar_3_red.webp?v=5',    color: '#FF3131', targetX: 1.05 },
  { id: 'bhageera', name: 'Bhageera', texture: '/avatar_4_blue.webp?v=5',   color: '#FF5C00', targetX: 3.15 },
];

// Close-together cuddling coordinates for hide position (eyes fully visible above curve rim, paws on top!)
export const HIDING_TARGETS = [
  { x: -1.35, y: -1.78 }, // Mowgli (outer left, following curve slope)
  { x: -0.45, y: -1.68 }, // Belle (inner left, curve peak - eyes completely visible!)
  { x:  0.45, y: -1.68 }, // Moana (inner right, curve peak - eyes completely visible!)
  { x:  1.35, y: -1.78 }, // Bhageera (outer 
  // , following curve slope)
];


export const SOUND_CONFIG = {
  floor: {
    src: '/audio/home-landing-audio/Audio-2.mpeg',
    basePitch: 1.10,
    pitchVar: 0.14,
    baseVol: 0.95,
  },
  words: {
    src: '/audio/home-landing-audio/Audio-1.mpeg',
    basePitch: 1.25,
    pitchVar: 0.18,
    baseVol: 0.88,
  },
  avatar: {
    src: '/audio/home-landing-audio/Audio-3.mpeg',
    basePitch: 1.30,
    pitchVar: 0.20,
    baseVol: 0.92,
  },
  wall: {
    src: '/audio/home-landing-audio/Audio-1.mpeg',
    basePitch: 1.14,
    pitchVar: 0.12,
    baseVol: 0.75,
  }
};

let lastGlobalSoundTime = 0;
let isAudioUnlocked = false;
const activeBounceSounds = new Set();

/**
 * Pre-unlock audio playback on first user interaction so initial landings play without restriction
 */
export function unlockAudio() {
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

/**
 * Stop and fade out all currently active bounce/collision sounds.
 * Eliminates ghost audio immediately when avatars settle or stop moving.
 */
export function stopAllBounceAudio() {
  if (typeof window === 'undefined') return;
  activeBounceSounds.forEach((sound) => {
    try {
      let vol = sound.volume;
      const fadeStep = 0.18;
      const timer = setInterval(() => {
        vol -= fadeStep;
        if (vol <= 0.04) {
          clearInterval(timer);
          sound.pause();
          sound.currentTime = 0;
          activeBounceSounds.delete(sound);
        } else {
          sound.volume = Math.max(0, vol);
        }
      }, 16);
    } catch (e) {
      sound.pause();
      sound.currentTime = 0;
      activeBounceSounds.delete(sound);
    }
  });
}

/**
 * Play specific childish collision sound effect based on impact surface:
 * 'floor' | 'words' | 'avatar' | 'wall'
 * 
 * Accurately scaled to bounce velocity & automatically limits duration
 * to prevent long MPEG tracks from continuing after bounce finishes.
 */
export function playCollisionSound(type = 'floor', intensity = 1.0) {
  if (typeof window === 'undefined') return;
  // Ignore micro-jitters or settling vibrations (< 0.08 intensity)
  if (intensity < 0.08) return;

  try {
    const now = performance.now();
    // Prevent distorted overlapping if multiple contacts happen within 28ms
    if (now - lastGlobalSoundTime < 32) return;
    lastGlobalSoundTime = now;

    const config = SOUND_CONFIG[type] || SOUND_CONFIG.floor;
    const sound = new Audio(config.src);
    
    // Scale volume exponentially with intensity (no false minimum 0.35 ceiling!)
    const targetVol = Math.min(1.0, Math.max(0.08, Math.pow(intensity, 1.25) * config.baseVol));
    sound.volume = targetVol;

    // Childish playful pitch modulation tailored to collision type and impact intensity:
    const pitchOffset = (Math.random() - 0.5) * config.pitchVar;
    const intensityPitchBoost = (intensity - 0.5) * 0.12;
    sound.playbackRate = Math.max(0.75, Math.min(1.6, config.basePitch + pitchOffset + intensityPitchBoost));
    sound.preservesPitch = false;

    activeBounceSounds.add(sound);

    // Limit audio playback duration to match the actual bounce impact window (~180ms to 520ms)
    // Prevents 10-15s long MPEG audio tracks from playing long after bounce has finished!
    const maxDurationMs = Math.max(180, Math.min(520, intensity * 480));
    setTimeout(() => {
      if (activeBounceSounds.has(sound)) {
        try {
          let v = sound.volume;
          const fader = setInterval(() => {
            v -= 0.16;
            if (v <= 0.04) {
              clearInterval(fader);
              sound.pause();
              sound.currentTime = 0;
              activeBounceSounds.delete(sound);
            } else {
              sound.volume = Math.max(0, v);
            }
          }, 16);
        } catch (e) {
          sound.pause();
          activeBounceSounds.delete(sound);
        }
      }
    }, maxDurationMs);

    sound.onended = () => {
      activeBounceSounds.delete(sound);
    };

    const playPromise = sound.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        activeBounceSounds.delete(sound);
      });
    }
  } catch (err) {
    // Graceful fallback
  }
}

export function playChildishBounceAudio(options = {}) {
  const { intensity = 1.0, type = 'floor' } = options;
  playCollisionSound(type, intensity);
}

/**
 * Unified Majestic Spherical Pop-Out Trajectory (Ultra-smooth Continuous 3D Arc):
 * 1. ZERO stalls or mid-air freezes: continuous forward-and-down parabolic trajectory.
 * 2. Z crests smoothly (apex 1.25) and cascades seamlessly down to stage floor in sync with gravity.
 * 3. Dynamic banking & forward roll: realistic physics tilt that aligns with horizontal travel direction.
 * 4. Scale emerges organically from behind the slit without sudden size pops.
 * 5. Generous, soft 130ms organic squash & stretch cushion followed by a playful secondary rebound hop.
 * 6. Perfectly synchronized stardust bursts and intensity-proportional audio.
 */
export function playPopAnimation(buddy, options = {}) {
  const {
    direction = 'forward',
    origin = { x: buddy.targetX, y: 0.72, z: -0.95 },
    destination = { x: buddy.targetX, y: -1.65, z: 0 },
    bounceIntensity = 1.0,
    baseScale = 0.85,
    startDelay = 0,
    tiltAngle = (Math.random() - 0.5) * 0.08,
    isExhausted = false,
    onPop = null,
    onComplete = null,
  } = options;

  const tl = gsap.timeline({
    delay: startDelay,
    onComplete: () => {
      stopAllBounceAudio();
      buddy.isFreePhysics = false;
      buddy.isReturningHome = false;
      buddy.pos.x = destination.x;
      buddy.pos.y = destination.y;
      buddy.pos.z = destination.z || 0;
      buddy.scale = { x: baseScale, y: baseScale, z: baseScale };
      buddy.rot = { x: 0, y: 0, z: 0 };
      if (onComplete) onComplete();
    }
  });

  // Calculate direction of travel in X to compute authentic banking angle
  const deltaX = destination.x - origin.x;
  const bankRoll = THREE.MathUtils.clamp(deltaX * -0.06, -0.16, 0.16);

  // Initial state: nestled inside the portal slit aperture
  buddy.pos = { x: origin.x, y: origin.y, z: origin.z !== undefined ? origin.z : -0.95 };
  buddy.rot = { x: 0.20, y: 0, z: tiltAngle };
  buddy.scale = { x: baseScale * 0.16, y: baseScale * 0.16, z: baseScale * 0.16 };
  buddy.isFreePhysics = false;
  buddy.isReturningHome = false;

  const emergeDuration = 0.94; // Silky, unhurried, continuous dimensional glide

  // 1. Organic bloom as avatar emerges into 3D world space
  tl.to(buddy.scale, {
    x: baseScale,
    y: baseScale,
    z: baseScale,
    duration: 0.65,
    ease: 'power2.out',
  }, 0);

  // 2. Smooth forward Z wave (glides forward out of slit, then softly settles into resting depth)
  tl.to(buddy.pos, {
    z: 0.38,
    duration: 0.44,
    ease: 'power2.out',
  }, 0);
  tl.to(buddy.pos, {
    z: destination.z || 0,
    duration: 0.50,
    ease: 'sine.inOut',
  }, 0.44);

  // 3. Continuous parabolic Y trajectory (gentle upward crest, then smooth continuous glide to floor)
  tl.to(buddy.pos, {
    y: origin.y + 0.14 * bounceIntensity,
    duration: 0.38,
    ease: 'sine.out',
  }, 0);
  tl.to(buddy.pos, {
    y: destination.y,
    duration: 0.56,
    ease: 'power2.inOut',
  }, 0.38);

  // 4. Smooth continuous lateral glide in X
  tl.to(buddy.pos, {
    x: destination.x,
    duration: emergeDuration,
    ease: 'power2.inOut',
  }, 0);

  // 5. Authentic banking roll & leveling
  tl.to(buddy.rot, {
    x: 0.18,
    z: bankRoll,
    duration: 0.42,
    ease: 'sine.out',
  }, 0);
  tl.to(buddy.rot, {
    x: 0,
    z: 0,
    duration: 0.52,
    ease: 'sine.inOut',
  }, 0.42);

  // Stardust breakthrough trigger at slit crossing
  if (onPop) {
    tl.call(onPop, null, 0.28);
  }

  // 6. Touchdown mechanics
  if (!isExhausted) {
    // Normal cheerful landing:
    tl.call(() => {
      playChildishBounceAudio({ intensity: 0.70 * bounceIntensity });
    }, null, emergeDuration);

    // Soft organic squish cushion
    tl.to(buddy.scale, {
      x: baseScale * 1.09,
      y: baseScale * 0.89,
      z: baseScale * 1.09,
      duration: 0.14,
      ease: 'power2.out',
    }, emergeDuration);

    // Gentle rebound hop
    tl.to(buddy.pos, {
      y: destination.y + 0.32 * bounceIntensity,
      duration: 0.24,
      ease: 'sine.out',
    }, emergeDuration + 0.14);

    tl.to(buddy.scale, {
      x: baseScale * 0.98,
      y: baseScale * 1.04,
      z: baseScale * 0.98,
      duration: 0.18,
      ease: 'sine.out',
    }, emergeDuration + 0.14);

    // Drop from rebound to floor
    tl.to(buddy.pos, {
      y: destination.y,
      duration: 0.22,
      ease: 'power2.in',
    }, emergeDuration + 0.38);

    // Final soft settle
    tl.to(buddy.scale, {
      x: baseScale,
      y: baseScale,
      z: baseScale,
      duration: 0.25,
      ease: 'back.out(1.2)',
    }, emergeDuration + 0.60);
  } else {
    // Truly exhausted landing for Blue: heavy tired plop, collapses onto floor and stays slumped!
    tl.call(() => {
      playChildishBounceAudio({ intensity: 0.50 * bounceIntensity });
    }, null, emergeDuration);

    // Heavy squish cushion as it collapses on the floor
    tl.to(buddy.scale, {
      x: baseScale * 1.18,
      y: baseScale * 0.76,
      z: baseScale * 1.18,
      duration: 0.22,
      ease: 'power2.out',
    }, emergeDuration);

    // Settles into a tired, flattened resting blob (stays slumped, no jump)
    tl.to(buddy.scale, {
      x: baseScale * 1.10,
      y: baseScale * 0.86,
      z: baseScale * 1.10,
      duration: 0.35,
      ease: 'sine.out',
    }, emergeDuration + 0.22);
  }

  tl.call(() => {
    stopAllBounceAudio();
  }, null, emergeDuration + 0.80);

  return tl;
}

export default function VedikaHeroZajno() {
  const heroRef = useRef(null);
  const isHeroVisibleRef = useRef(true);
  const canvasRef = useRef(null);
  const gridCanvasRef = useRef(null);
  const titleContainerRef = useRef(null);
  const row1Ref = useRef(null);
  const row2Ref = useRef(null);
  const slitVoidRef = useRef(null);
  const slitAuraRef = useRef(null);
  const blackHoleRef = useRef(null);

  // Next.js Navigation for Portal Transitions
  const router = useRouter();
  const pathname = usePathname() || '/';

  // Discrete Steps (0 to 3)
  const [scrollStep, setScrollStep] = useState(0);
  const scrollStepRef = useRef(0);
  const isAnimatingRef = useRef(false);

  // Storytelling Dialogues & Voices on Scroll Landing
  const [dialogue, setDialogue] = useState(null); // { index: 0|1|2|3, text: string, color: string }
  const cursorTrackingEnabledRef = useRef(false); // Only true AFTER Blue finishes asking "how are you?"
  const isBlueExhaustedRef = useRef(false);       // Exhausted animation posture for Blue
  const activeVoiceAudioRef = useRef(null);       // Tracks currently playing storytelling audio
  const speakingBuddyIndexRef = useRef(-1);        // Currently speaking avatar (for dynamic lips movement)
  const pendingStoryAudioRef = useRef(null);       // Audio queued if browser blocked autoplay before user gesture
  const buddyFacesRef = useRef([]);               // 2D dynamic mouth texture canvas planes

  const playStoryVoice = useCallback((audioSrc, speakingAvatarIndex = -1) => {
    if (typeof window === 'undefined') return;
    try {
      if (activeVoiceAudioRef.current) {
        activeVoiceAudioRef.current.pause();
        activeVoiceAudioRef.current.currentTime = 0;
      }
      speakingBuddyIndexRef.current = speakingAvatarIndex;
      const audio = new Audio(audioSrc);
      audio.volume = 0.95;
      // Avatar voice speeds: crisp, animated playback; extra brisk for 3rd avatar (Moana)
      const rates = [1.10, 1.10, 1.22, 1.10];
      const rate = speakingAvatarIndex >= 0 && rates[speakingAvatarIndex] !== undefined
        ? rates[speakingAvatarIndex]
        : 1.12;
      audio.playbackRate = rate;
      activeVoiceAudioRef.current = audio;

      const clearSpeaker = () => {
        if (speakingBuddyIndexRef.current === speakingAvatarIndex) {
          speakingBuddyIndexRef.current = -1;
        }
      };

      audio.onended = clearSpeaker;
      audio.onerror = clearSpeaker;
      audio.onpause = () => {
        if (activeVoiceAudioRef.current === audio) {
          clearSpeaker();
        }
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          // If browser blocked unmuted autoplay, preserve pending voice for immediate playback on first gesture
          if (err && (err.name === 'NotAllowedError' || err.name === 'AbortError')) {
            pendingStoryAudioRef.current = { audioSrc, speakingAvatarIndex };
          }
          clearSpeaker();
        });
      }
    } catch (e) {
      speakingBuddyIndexRef.current = -1;
    }
  }, []);

  // Window gesture listeners to instantly unlock and play any pending story audio on first user touch/click/key
  useEffect(() => {
    const handleFirstGesture = () => {
      unlockAudio();
      if (pendingStoryAudioRef.current) {
        const pending = pendingStoryAudioRef.current;
        pendingStoryAudioRef.current = null;
        playStoryVoice(pending.audioSrc, pending.speakingAvatarIndex);
      }
    };

    window.addEventListener('pointerdown', handleFirstGesture, { passive: true });
    window.addEventListener('click', handleFirstGesture, { passive: true });
    window.addEventListener('touchstart', handleFirstGesture, { passive: true });
    window.addEventListener('keydown', handleFirstGesture, { passive: true });

    return () => {
      window.removeEventListener('pointerdown', handleFirstGesture);
      window.removeEventListener('click', handleFirstGesture);
      window.removeEventListener('touchstart', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
    };
  }, [playStoryVoice]);

  // Playground Modes & Controls
  const [zeroGravity, setZeroGravity] = useState(false);
  const [magnetMode, setMagnetMode] = useState(false);
  const [isHiding, setIsHiding] = useState(false);
  const [isPlayDockOpen, setIsPlayDockOpen] = useState(false);
  const zeroGravityRef = useRef(false);
  const magnetModeRef = useRef(false);
  const isHidingRef = useRef(false);

  // Three.js References
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const buddyGroupsRef = useRef({});
  const buddyMeshesRef = useRef([]);
  const shadowMeshesRef = useRef([]);
  const avatarLightRef = useRef(null);
  const avatarSpotlightsRef = useRef([]);
  const animIdRef = useRef(null);
  const avatarLastBounceRef = useRef([0, 0, 0, 0]);

  // Per-buddy state
  const buddyPhysicsRef = useRef(
    BUDDIES.map((b, i) => ({
      id: b.id,
      targetX: b.targetX,
      targetY: -1.65,
      targetZ: 0,
      pos: { x: b.targetX, y: -1.65, z: 0 },
      vel: { vx: 0, vy: 0, vz: 0 },
      rot: { x: 0, y: 0, z: 0 },
      scale: { x: 0, y: 0, z: 0 },
      isDragging: false,
      isFreePhysics: false,
      isReturningHome: false,
      idleTime: 0,
      lookMode: 'cursor',
      randomLookOffset: { x: 0, y: 0 },
      nextLookChange: 0,
      floatPhase: Math.random() * Math.PI * 2,
    }))
  );

  // Global Engine State
  const engineRef = useRef({
    hasIntroduced: false,
    mouseNdc: { x: 0, y: 0 },
    mouseWorld: new THREE.Vector3(0, 0, 0),
    isHoveringHorizon: false,
    baseScale: 0.85,
    radius: 0.76,
    textColliders: [],
    bounds: { minX: -7.2, maxX: 7.2, minY: -3.6, maxY: 3.8, minZ: -2.5, maxZ: 3.2 },
    draggedIndex: -1,
    dragStart: { x: 0, y: 0 },
    dragStartTime: 0,
    pointerHistory: [],
    particles: [],
  });

  // ═══════════════════════════════════════════════════════════════
  // Interactive Cursor Glowing Grid Canvas Engine
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    const canvas = gridCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.clientHeight || window.innerHeight);

    const squareSize = 80;
    const grid = [];

    // Exact colors of the 4 Vedika Avatars on the home page:
    // 0: Mowgli - Neon Green (#39FF14)
    // 1: Belle - Neon Pink (#FF6EFF)
    // 2: Moana - Neon Red (#FF3131)
    // 3: Bhageera - Neon Orange (#FF5C00)
    const AVATAR_COLORS = [
      { r: 57,  g: 255, b: 20  }, // Mowgli (Neon Green #39FF14)
      { r: 255, g: 110, b: 255 }, // Belle (Neon Pink #FF6EFF)
      { r: 255, g: 49,  b: 49  }, // Moana (Neon Red #FF3131)
      { r: 255, g: 92,  b: 0   }, // Bhageera (Neon Orange #FF5C00)
    ];

    const getColorForCell = (cellX, w) => {
      const normX = Math.max(0, Math.min(1, (cellX + squareSize * 0.5) / Math.max(w, 1)));
      const t = normX * 3.0; // Distribute across 4 avatar horizontal zones from left to right
      const idx1 = Math.min(3, Math.floor(t));
      const idx2 = Math.min(3, idx1 + 1);
      const frac = t - Math.floor(t);

      const c1 = AVATAR_COLORS[idx1];
      const c2 = AVATAR_COLORS[idx2];

      return {
        r: Math.round(c1.r + (c2.r - c1.r) * frac),
        g: Math.round(c1.g + (c2.g - c1.g) * frac),
        b: Math.round(c1.b + (c2.b - c1.b) * frac),
      };
    };

    const initGrid = () => {
      grid.length = 0;
      for (let x = 0; x < width + squareSize; x += squareSize) {
        for (let y = 0; y < height + squareSize; y += squareSize) {
          grid.push({
            x,
            y,
            alpha: 0,
            fading: false,
            lastTouched: 0,
            color: getColorForCell(x, width),
          });
        }
      }
    };

    const getCellAt = (x, y) => {
      const col = Math.floor(x / squareSize) * squareSize;
      const row = Math.floor(y / squareSize) * squareSize;
      return grid.find((cell) => cell.x === col && cell.y === row);
    };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.clientWidth || window.innerWidth;
      height = canvas.height = canvas.clientHeight || window.innerHeight;
      initGrid();
    };
    window.addEventListener('resize', handleResize);
    initGrid();

    let gridAnimId = null;
    let isGridRunning = false;

    const drawGrid = () => {
      ctx.clearRect(0, 0, width, height);
      const now = Date.now();
      let activeCount = 0;

      for (let i = 0; i < grid.length; i++) {
        const cell = grid[i];

        // Start fading after 480ms
        if (cell.alpha > 0 && !cell.fading && now - cell.lastTouched > 480) {
          cell.fading = true;
        }

        if (cell.fading) {
          cell.alpha -= 0.022;
          if (cell.alpha <= 0) {
            cell.alpha = 0;
            cell.fading = false;
          }
        }

        if (cell.alpha > 0) {
          activeCount++;
          const col = cell.color || { r: 191, g: 85, b: 247 };
          const a = cell.alpha;

          // 1. Inside of the box is cleanly black (no glassy sheen or glare)
          ctx.fillStyle = `rgba(0, 0, 0, ${a * 0.95})`;
          ctx.fillRect(cell.x + 1, cell.y + 1, squareSize - 2, squareSize - 2);

          // 2. Only the side outline of the box glows subtly in exact avatar multi-colours with a little shiny edge
          ctx.save();
          ctx.shadowColor = `rgba(${col.r}, ${col.g}, ${col.b}, ${a * 0.45})`;
          ctx.shadowBlur = 6 * a; // Very subtle, soft glow

          const borderGrad = ctx.createLinearGradient(
            cell.x, cell.y,
            cell.x + squareSize, cell.y + squareSize
          );
          // Little shiny specular edge highlight
          borderGrad.addColorStop(0, `rgba(255, 255, 255, ${a * 0.75})`);
          borderGrad.addColorStop(0.20, `rgba(${col.r}, ${col.g}, ${col.b}, ${a * 0.70})`);
          borderGrad.addColorStop(0.80, `rgba(${col.r}, ${col.g}, ${col.b}, ${a * 0.50})`);
          borderGrad.addColorStop(1, `rgba(${col.r}, ${col.g}, ${col.b}, ${a * 0.30})`);

          ctx.strokeStyle = borderGrad;
          ctx.lineWidth = 1.35;
          ctx.strokeRect(cell.x + 0.5, cell.y + 0.5, squareSize - 1, squareSize - 1);
          ctx.restore();
        }
      }

      // If any cells are active, schedule next frame; otherwise pause until next mouse move
      if (activeCount > 0) {
        gridAnimId = requestAnimationFrame(drawGrid);
      } else {
        isGridRunning = false;
        gridAnimId = null;
        ctx.clearRect(0, 0, width, height);
      }
    };

    const handleMouseMove = (e) => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const cell = getCellAt(mouseX, mouseY);
      if (cell && cell.alpha < 0.85) {
        cell.alpha = 1;
        cell.lastTouched = Date.now();
        cell.fading = false;

        // Ripple subtle secondary shiny glow to 4 adjacent neighbor blocks
        const neighbors = [
          getCellAt(mouseX - squareSize, mouseY),
          getCellAt(mouseX + squareSize, mouseY),
          getCellAt(mouseX, mouseY - squareSize),
          getCellAt(mouseX, mouseY + squareSize),
        ];
        neighbors.forEach((nb) => {
          if (nb && nb.alpha < 0.28) {
            nb.alpha = Math.max(nb.alpha, 0.28);
            nb.lastTouched = Date.now();
            nb.fading = false;
          }
        });

        if (!isGridRunning) {
          isGridRunning = true;
          gridAnimId = requestAnimationFrame(drawGrid);
        }
      }
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      if (gridAnimId) cancelAnimationFrame(gridAnimId);
    };
  }, []);

  // Real-time Color Tuner Listener
  useEffect(() => {
    const handleColorChange = (e) => {
      const { index, hex } = e.detail;
      if (buddyMeshesRef.current && buddyMeshesRef.current[index]) {
        buddyMeshesRef.current[index].material.color.set(hex);
        buddyMeshesRef.current[index].material.needsUpdate = true;
      }
      if (buddyPhysicsRef.current && buddyPhysicsRef.current[index]) {
        buddyPhysicsRef.current[index].color = hex;
      }
    };

    window.addEventListener('vedika_avatar_color_change', handleColorChange);
    return () => window.removeEventListener('vedika_avatar_color_change', handleColorChange);
  }, []);

  // Stardust Particle Spark Burst Trigger
  const triggerStardustBurst = useCallback((x, y, z, colorHex, count = 18) => {
    const scene = sceneRef.current;
    if (!scene) return;

    const color = new THREE.Color(colorHex);

    for (let i = 0; i < count; i++) {
      const pGeo = new THREE.SphereGeometry(0.045 + Math.random() * 0.035, 8, 8);
      const pMat = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.95,
      });
      const pMesh = new THREE.Mesh(pGeo, pMat);
      pMesh.position.set(x + (Math.random() - 0.5) * 0.45, y + (Math.random() - 0.5) * 0.35, z + 0.1);

      const speed = 0.04 + Math.random() * 0.08;
      const angle = Math.random() * Math.PI * 2;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed + 0.025;
      const vz = (Math.random() - 0.5) * speed * 1.5;

      scene.add(pMesh);
      engineRef.current.particles.push({
        mesh: pMesh,
        vx, vy, vz,
        life: 1.0,
        decay: 0.020 + Math.random() * 0.016,
      });
    }
  }, []);

  // Dynamically compute the exact 3D world Y coordinate of the void slit
  const getVoidSlitWorldY = useCallback(() => {
    const el = slitVoidRef.current;
    const canvas = canvasRef.current;
    const camera = cameraRef.current;
    if (!el || !canvas || !camera) return 0.78;

    const elRect = el.getBoundingClientRect();
    const rect = canvas.getBoundingClientRect();
    const ndcY = -(((elRect.top + elRect.height / 2 - rect.top) / rect.height) * 2 - 1);

    const vec = new THREE.Vector3(0, ndcY, 0.5);
    vec.unproject(camera);
    vec.sub(camera.position).normalize();
    const distance = -camera.position.z / vec.z;
    const worldPos = camera.position.clone().add(vec.multiplyScalar(distance));
    return worldPos.y;
  }, []);

  // Update 3D World Bounding Boxes for Text Elements
  const updateTextColliders = useCallback(() => {
    const canvas = canvasRef.current;
    const camera = cameraRef.current;
    if (!canvas || !camera) return;

    const rect = canvas.getBoundingClientRect();
    const letterIds = ['z-ve', 'z-di', 'z-ka', 'z-ai', 'z-tu', 'z-tor'];
    const colliders = [];

    letterIds.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;

      const elRect = el.getBoundingClientRect();
      const ndcX = ((elRect.left + elRect.width / 2 - rect.left) / rect.width) * 2 - 1;
      const ndcY = -(((elRect.top + elRect.height / 2 - rect.top) / rect.height) * 2 - 1);

      const vec = new THREE.Vector3(ndcX, ndcY, 0.5);
      vec.unproject(camera);
      vec.sub(camera.position).normalize();
      const distance = -camera.position.z / vec.z;
      const worldPos = camera.position.clone().add(vec.multiplyScalar(distance));

      const widthFactor = (elRect.width / rect.width) * (Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * Math.abs(camera.position.z) * 2 * camera.aspect);
      const heightFactor = (elRect.height / rect.height) * (Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * Math.abs(camera.position.z) * 2);

      colliders.push({
        id,
        el,
        center: new THREE.Vector3(worldPos.x, worldPos.y, 0),
        halfSize: new THREE.Vector3(widthFactor * 0.48, heightFactor * 0.46, 0.65),
      });
    });

    engineRef.current.textColliders = colliders;
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // ═══════════════════════════════════════════════════════════════
  // 1. Exact Zajno Typography Intro Animation (Page Load)
  // ═══════════════════════════════════════════════════════════════
  const executeStep1Ref = useRef(null);

  // SCROLL 1: 3D Sphere Emergence & Dramatic Central Curved Void Arching (Purple Avatar)
  const executeStep1 = useCallback(() => {
    if (scrollStepRef.current !== 0 || isAnimatingRef.current) return;
    isAnimatingRef.current = true;
    setScrollStep(1);

    const titleCont = titleContainerRef.current;
    const row1 = row1Ref.current;
    const row2 = row2Ref.current;
    const slitVoid = slitVoidRef.current;
    const slitAura = slitAuraRef.current;

    // Direct Letter Elements for Organic Arch Curvature
    const veLetter = document.querySelector('#z-ve');
    const diLetter = document.querySelector('#z-di');
    const kaLetter = document.querySelector('#z-ka');
    const aiLetter = document.querySelector('#z-ai');
    const tuLetter = document.querySelector('#z-tu');
    const torLetter = document.querySelector('#z-tor');

    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
    const base = engineRef.current.baseScale;
    const voidY = getVoidSlitWorldY();
    const b0 = buddyPhysicsRef.current[0];

    const mainTl = gsap.timeline({
      onComplete: () => {
        scrollStepRef.current = 1;
        updateTextColliders();
        // Keep animating lock active so Mowgli finishes delivering his dialogue cleanly
        // and mouse wheel / trackpad inertia cannot prematurely skip into Step 2
        setTimeout(() => {
          isAnimatingRef.current = false;
        }, 2600);
      }
    });

    // Initial state: Avatar 1 sits behind the closed slit
    b0.pos = { x: 0, y: voidY, z: -0.95 };
    b0.rot = { x: 0, y: 0, z: 0 };
    b0.scale = { x: base * 0.25, y: base * 0.25, z: base * 0.25 };
    b0.isFreePhysics = false;

    // ── 1. Words Open & Dramatic Central Void Arching ──
    const partY1 = isMobile ? -14 : -20;
    const partY2 = isMobile ? 14 : 20;
    if (row1) mainTl.to(row1, { y: partY1, duration: 0.36, ease: 'power2.out' }, 0);
    if (row2) mainTl.to(row2, { y: partY2, duration: 0.36, ease: 'power2.out' }, 0);

    // Top Row ("VEDIKA"): Center letter #z-di arches UP (-52px), flank letters lift less (-18px) and tilt outward
    if (diLetter) mainTl.to(diLetter, { y: isMobile ? -36 : -52, scaleY: 1.15, scaleX: 1.04, duration: 0.38, ease: 'power2.out' }, 0);
    if (veLetter) mainTl.to(veLetter, { y: isMobile ? -12 : -18, rotationZ: -4.0, duration: 0.38, ease: 'power2.out' }, 0);
    if (kaLetter) mainTl.to(kaLetter, { y: isMobile ? -12 : -18, rotationZ: 4.0, duration: 0.38, ease: 'power2.out' }, 0);

    // Bottom Row ("AI TUTOR"): Center letter #z-tu arches DOWN (+52px), flank letters drop less (+18px) and tilt outward
    if (tuLetter) mainTl.to(tuLetter, { y: isMobile ? 36 : 52, scaleY: 1.15, scaleX: 1.04, duration: 0.38, ease: 'power2.out' }, 0);
    if (aiLetter) mainTl.to(aiLetter, { y: isMobile ? 12 : 18, rotationZ: 4.0, duration: 0.38, ease: 'power2.out' }, 0);
    if (torLetter) mainTl.to(torLetter, { y: isMobile ? 12 : 18, rotationZ: -4.0, duration: 0.38, ease: 'power2.out' }, 0);

    // Cosmic Slit & Aura expand into a large curved glowing eye
    mainTl.to(slitVoid, { scaleY: 2.2, scaleX: 1.35, opacity: 1.0, duration: 0.32, ease: 'power2.out' }, 0.02);
    mainTl.to(slitAura, { opacity: 1.0, scale: 1.45, duration: 0.35, ease: 'power2.out' }, 0.02);

    // ── 2. Avatar 1 Smooth 3D Spline Pop & Parabolic Flight ──
    const b0Tl = playPopAnimation(b0, {
      origin: { x: 0, y: voidY, z: -0.95 },
      destination: { x: b0.targetX, y: -1.65, z: 0 },
      baseScale: base,
      startDelay: 0,
      tiltAngle: -0.06,
      onPop: () => triggerStardustBurst(0, voidY, 0.45, BUDDIES[0].color, 24),
    });
    mainTl.add(b0Tl, 0);

    // ── 3. Words Snap Shut Once Avatar 1 Has Emerged ──
    const shutMoment1 = 0.44;

    // Both rows snap shut back together at y: 0
    if (row1) mainTl.to(row1, { y: 0, duration: 0.45, ease: 'power2.inOut' }, shutMoment1);
    if (row2) mainTl.to(row2, { y: 0, duration: 0.45, ease: 'power2.inOut' }, shutMoment1);

    if (diLetter) mainTl.to(diLetter, { y: 0, scaleY: 1.0, scaleX: 1.0, duration: 0.42, ease: 'elastic.out(1.15, 0.45)' }, shutMoment1);
    if (veLetter) mainTl.to(veLetter, { y: 0, rotationZ: 0, duration: 0.42, ease: 'power2.out' }, shutMoment1);
    if (kaLetter) mainTl.to(kaLetter, { y: 0, rotationZ: 0, duration: 0.42, ease: 'power2.out' }, shutMoment1);
    if (tuLetter) mainTl.to(tuLetter, { y: 0, scaleY: 1.0, scaleX: 1.0, duration: 0.42, ease: 'elastic.out(1.15, 0.45)' }, shutMoment1);
    if (aiLetter) mainTl.to(aiLetter, { y: 0, rotationZ: 0, duration: 0.42, ease: 'power2.out' }, shutMoment1);
    if (torLetter) mainTl.to(torLetter, { y: 0, rotationZ: 0, duration: 0.42, ease: 'power2.out' }, shutMoment1);

    // Cosmic Slit & Aura collapse and seal shut
    if (slitAura) mainTl.to(slitAura, { opacity: 0, scale: 0.7, duration: 0.35, ease: 'power2.in' }, shutMoment1);
    if (slitVoid) mainTl.to(slitVoid, { scaleY: 0, opacity: 0, duration: 0.38, ease: 'power2.in' }, shutMoment1 + 0.02);

    if (titleCont) mainTl.to(titleCont, { y: -70, duration: 0.75, ease: 'power2.inOut' }, shutMoment1);

    // ── 4. Story Dialogue on Landing: Mowgli speaks right upon landing ──
    mainTl.call(() => {
      cursorTrackingEnabledRef.current = false;
      playStoryVoice('/audio/home/mowgli_home.wav', 0);
    }, null, 1.02);

  }, [getVoidSlitWorldY, triggerStardustBurst, updateTextColliders]);

  useEffect(() => {
    executeStep1Ref.current = executeStep1;
  }, [executeStep1]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const veSpan = document.querySelector('#z-ve span');
      const diSpan = document.querySelector('#z-di span');
      const kaSpan = document.querySelector('#z-ka span');
      const aiSpan = document.querySelector('#z-ai span');
      const tuSpan = document.querySelector('#z-tu span');
      const torSpan = document.querySelector('#z-tor span');

      if (!veSpan || !diSpan || !kaSpan || !aiSpan || !tuSpan || !torSpan) return;

      const fiftyFrames = 1.45;
      const twoFrames = 0.22;
      const fourFrames = 0.42;

      const entryTl = gsap.timeline({
        delay: 0.25,
        onComplete: () => {
          engineRef.current.hasIntroduced = true;
          updateTextColliders();
        }
      });

      entryTl
        .fromTo(veSpan, { x: '220%' }, { x: '0%', duration: fiftyFrames, ease: 'power3.out' }, 0)
        .fromTo(kaSpan, { x: '200%' }, { x: '0%', duration: fiftyFrames, ease: 'power3.out' }, twoFrames)
        .fromTo(aiSpan, { x: '-200%' }, { x: '0%', duration: fiftyFrames, ease: 'power3.out' }, twoFrames)
        .fromTo(torSpan, { x: '-240%' }, { x: '0%', duration: fiftyFrames, ease: 'power3.out' }, twoFrames)
        .fromTo(diSpan, { x: '-200%' }, { x: '0%', duration: fiftyFrames, ease: 'power3.out' }, fourFrames)
        .fromTo(tuSpan, { x: '200%' }, { x: '0%', duration: fiftyFrames, ease: 'power3.out' }, fourFrames);
    }, heroRef);

    return () => ctx.revert();
  }, [updateTextColliders]);

  // SCROLL 2: Red & Olive Emergence with Dynamic Twin-Arch Void Curvature
  const executeStep2 = useCallback(() => {
    if (scrollStepRef.current !== 1 || isAnimatingRef.current) return;
    isAnimatingRef.current = true;
    setScrollStep(2);

    const titleCont = titleContainerRef.current;
    const row1 = row1Ref.current;
    const row2 = row2Ref.current;
    const slitVoid = slitVoidRef.current;
    const slitAura = slitAuraRef.current;

    const b1 = buddyPhysicsRef.current[1]; // Red
    const b2 = buddyPhysicsRef.current[2]; // Olive

    const veLetter = document.querySelector('#z-ve');
    const diLetter = document.querySelector('#z-di');
    const kaLetter = document.querySelector('#z-ka');
    const aiLetter = document.querySelector('#z-ai');
    const tuLetter = document.querySelector('#z-tu');
    const torLetter = document.querySelector('#z-tor');

    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
    const voidY = getVoidSlitWorldY();

    const mainTl = gsap.timeline({
      onComplete: () => {
        scrollStepRef.current = 2;
        updateTextColliders();
        // Keep animating lock active so Belle and Moana deliver their lines without premature skip
        setTimeout(() => {
          isAnimatingRef.current = false;
        }, 6500);
      }
    });

    // ── 1. Words Open & Dynamic Twin-Arch Curvature ──
    const partY1 = isMobile ? -14 : -20;
    const partY2 = isMobile ? 14 : 20;
    if (row1) mainTl.to(row1, { y: partY1, duration: 0.36, ease: 'power2.out' }, 0);
    if (row2) mainTl.to(row2, { y: partY2, duration: 0.36, ease: 'power2.out' }, 0);

    // Left arch for Red (#z-ve & #z-ai):
    if (veLetter) mainTl.to(veLetter, { y: isMobile ? -36 : -54, scaleY: 1.15, rotationZ: -4.5, duration: 0.38, ease: 'power2.out' }, 0);
    if (aiLetter) mainTl.to(aiLetter, { y: isMobile ? 36 : 54, scaleY: 1.15, rotationZ: 4.5, duration: 0.38, ease: 'power2.out' }, 0);

    // Right arch for Olive (#z-ka & #z-tor):
    if (kaLetter) mainTl.to(kaLetter, { y: isMobile ? -36 : -54, scaleY: 1.15, rotationZ: 4.5, duration: 0.38, ease: 'power2.out' }, 0);
    if (torLetter) mainTl.to(torLetter, { y: isMobile ? 36 : 54, scaleY: 1.15, rotationZ: -4.5, duration: 0.38, ease: 'power2.out' }, 0);

    // Center letters stay lower between the twin arches:
    if (diLetter) mainTl.to(diLetter, { y: isMobile ? -12 : -16, duration: 0.35, ease: 'power2.out' }, 0);
    if (tuLetter) mainTl.to(tuLetter, { y: isMobile ? 12 : 16, duration: 0.35, ease: 'power2.out' }, 0);

    // Slit aperture expands wide horizontally with dual flare
    mainTl.to(slitVoid, { scaleY: 2.0, scaleX: 1.5, opacity: 1.0, duration: 0.32, ease: 'power2.out' }, 0.02);
    mainTl.to(slitAura, { opacity: 1.0, scale: 1.4, duration: 0.32, ease: 'power2.out' }, 0.02);

    const blueTl = playPopAnimation(b1, {
      origin: { x: -1.05, y: voidY, z: -0.95 },
      destination: { x: b1.targetX, y: -1.65, z: 0 },
      baseScale: engineRef.current.baseScale,
      startDelay: 0,
      tiltAngle: -0.06,
      onPop: () => triggerStardustBurst(-1.05, voidY, 0.45, BUDDIES[1].color),
    });

    const pinkTl = playPopAnimation(b2, {
      origin: { x: 1.05, y: voidY, z: -0.95 },
      destination: { x: b2.targetX, y: -1.65, z: 0 },
      baseScale: engineRef.current.baseScale,
      startDelay: 0.18,
      tiltAngle: 0.06,
      onPop: () => triggerStardustBurst(1.05, voidY, 0.45, BUDDIES[2].color),
    });

    mainTl.add(blueTl, 0);
    mainTl.add(pinkTl, 0);

    // ── 2. Words Snap Shut Down once both Avatars have emerged ──
    const shutMoment2 = 0.62;

    // Both rows snap shut back together at y: 0
    if (row1) mainTl.to(row1, { y: 0, duration: 0.45, ease: 'power2.inOut' }, shutMoment2);
    if (row2) mainTl.to(row2, { y: 0, duration: 0.45, ease: 'power2.inOut' }, shutMoment2);

    // Relax twin arches back into straight aligned position
    if (veLetter) mainTl.to(veLetter, { y: 0, scaleY: 1.0, rotationZ: 0, duration: 0.42, ease: 'elastic.out(1.15, 0.45)' }, shutMoment2);
    if (aiLetter) mainTl.to(aiLetter, { y: 0, scaleY: 1.0, rotationZ: 0, duration: 0.42, ease: 'elastic.out(1.15, 0.45)' }, shutMoment2);
    if (kaLetter) mainTl.to(kaLetter, { y: 0, scaleY: 1.0, rotationZ: 0, duration: 0.42, ease: 'elastic.out(1.15, 0.45)' }, shutMoment2);
    if (torLetter) mainTl.to(torLetter, { y: 0, scaleY: 1.0, rotationZ: 0, duration: 0.42, ease: 'elastic.out(1.15, 0.45)' }, shutMoment2);
    if (diLetter) mainTl.to(diLetter, { y: 0, duration: 0.40, ease: 'power2.out' }, shutMoment2);
    if (tuLetter) mainTl.to(tuLetter, { y: 0, duration: 0.40, ease: 'power2.out' }, shutMoment2);

    // Cosmic Slit & Aura collapse and seal shut
    if (slitAura) mainTl.to(slitAura, { opacity: 0, scale: 0.7, duration: 0.35, ease: 'power2.in' }, shutMoment2);
    if (slitVoid) mainTl.to(slitVoid, { scaleY: 0, opacity: 0, duration: 0.38, ease: 'power2.in' }, shutMoment2 + 0.02);

    // ── Story Dialogue on Landing: Belle speaks, then Moana speaks ──
    mainTl.call(() => {
      cursorTrackingEnabledRef.current = false;
      playStoryVoice('/audio/home/belle_home.wav', 1);
    }, null, 1.65);

    mainTl.call(() => {
      playStoryVoice('/audio/home/moana_home.wav', 2);
    }, null, 4.80);

  }, [getVoidSlitWorldY, triggerStardustBurst, updateTextColliders]);

  // SCROLL 3: Blue Emergence with Right Arch Void Curvature + Clean Typography Reunion
  const executeStep3 = useCallback(() => {
    if (scrollStepRef.current !== 2 || isAnimatingRef.current) return;
    isAnimatingRef.current = true;
    setScrollStep(3);

    const titleCont = titleContainerRef.current;
    const row1 = row1Ref.current;
    const row2 = row2Ref.current;
    const slitVoid = slitVoidRef.current;
    const slitAura = slitAuraRef.current;
    const b3 = buddyPhysicsRef.current[3]; // Blue

    const veLetter = document.querySelector('#z-ve');
    const diLetter = document.querySelector('#z-di');
    const kaLetter = document.querySelector('#z-ka');
    const aiLetter = document.querySelector('#z-ai');
    const tuLetter = document.querySelector('#z-tu');
    const torLetter = document.querySelector('#z-tor');

    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
    const voidY = getVoidSlitWorldY();

    const mainTl = gsap.timeline({
      onComplete: () => {
        scrollStepRef.current = 3;
        isAnimatingRef.current = false;
        buddyPhysicsRef.current.forEach((b) => {
          b.isFreePhysics = false;
          b.pos.y = -1.65;
          b.scale = { x: engineRef.current.baseScale, y: engineRef.current.baseScale, z: engineRef.current.baseScale };
        });
        updateTextColliders();
      }
    });

    // ── 1. Words Open & Right-Sector Arch for Avatar 4 (#z-ka & #z-tor) ──
    const partY1 = isMobile ? -14 : -20;
    const partY2 = isMobile ? 14 : 20;
    if (row1) mainTl.to(row1, { y: partY1, duration: 0.36, ease: 'power2.out' }, 0);
    if (row2) mainTl.to(row2, { y: partY2, duration: 0.36, ease: 'power2.out' }, 0);

    if (kaLetter) mainTl.to(kaLetter, { y: isMobile ? -38 : -56, scaleY: 1.15, rotationZ: 4.5, duration: 0.38, ease: 'power2.out' }, 0);
    if (torLetter) mainTl.to(torLetter, { y: isMobile ? 38 : 56, scaleY: 1.15, rotationZ: -4.5, duration: 0.38, ease: 'power2.out' }, 0);
    if (diLetter) mainTl.to(diLetter, { y: isMobile ? -16 : -22, duration: 0.35, ease: 'power2.out' }, 0);
    if (tuLetter) mainTl.to(tuLetter, { y: isMobile ? 16 : 22, duration: 0.35, ease: 'power2.out' }, 0);
    if (veLetter) mainTl.to(veLetter, { y: isMobile ? -10 : -14, duration: 0.35, ease: 'power2.out' }, 0);
    if (aiLetter) mainTl.to(aiLetter, { y: isMobile ? 10 : 14, duration: 0.35, ease: 'power2.out' }, 0);

    mainTl.to(slitVoid, { scaleY: 1.8, scaleX: 1.3, opacity: 1.0, duration: 0.30, ease: 'power2.out' }, 0.02);
    mainTl.to(slitAura, { opacity: 1.0, scale: 1.35, duration: 0.30, ease: 'power2.out' }, 0.02);

    const goldTl = playPopAnimation(b3, {
      origin: { x: 1.8, y: voidY, z: -0.95 },
      destination: { x: b3.targetX, y: -1.65, z: 0 },
      baseScale: engineRef.current.baseScale,
      startDelay: 0,
      tiltAngle: 0.08,
      isExhausted: true,
      onPop: () => triggerStardustBurst(1.8, voidY, 0.45, BUDDIES[3].color),
    });
    mainTl.add(goldTl, 0);

    // ── 2. Words Snap Shut Closed & Finale Header ──
    const shutMoment3 = 0.52;
    if (slitAura) mainTl.to(slitAura, { opacity: 0, scale: 0.7, duration: 0.35, ease: 'power2.in' }, shutMoment3);
    if (slitVoid) mainTl.to(slitVoid, { scaleY: 0, opacity: 0, duration: 0.40, ease: 'power2.in' }, shutMoment3 + 0.02);
    if (titleCont) mainTl.to(titleCont, { y: -90, duration: 0.85, ease: 'power2.inOut' }, shutMoment3);
    if (row1) mainTl.to(row1, { y: 0, duration: 0.55, ease: 'power2.inOut' }, shutMoment3 + 0.05);
    if (row2) mainTl.to(row2, { y: 0, duration: 0.55, ease: 'power2.inOut' }, shutMoment3 + 0.05);

    if (kaLetter) mainTl.to(kaLetter, { y: 0, scaleY: 1.0, rotationZ: 0, duration: 0.55, ease: 'power2.inOut' }, shutMoment3 + 0.05);
    if (torLetter) mainTl.to(torLetter, { y: 0, scaleY: 1.0, rotationZ: 0, duration: 0.55, ease: 'power2.inOut' }, shutMoment3 + 0.05);
    if (diLetter) mainTl.to(diLetter, { y: 0, duration: 0.55, ease: 'power2.inOut' }, shutMoment3 + 0.05);
    if (tuLetter) mainTl.to(tuLetter, { y: 0, duration: 0.55, ease: 'power2.inOut' }, shutMoment3 + 0.05);
    if (veLetter) mainTl.to(veLetter, { y: 0, rotationZ: 0, duration: 0.55, ease: 'power2.inOut' }, shutMoment3 + 0.05);
    if (aiLetter) mainTl.to(aiLetter, { y: 0, rotationZ: 0, duration: 0.55, ease: 'power2.inOut' }, shutMoment3 + 0.05);

    // ── Story Dialogue on Landing: Bhageera lands exhausted, looks tired for exactly 2 sec, then neat smooth perk-up hop & cheerful greeting ──
    mainTl.call(() => {
      isBlueExhaustedRef.current = true;
      cursorTrackingEnabledRef.current = false;
      playStoryVoice('/audio/home/bhageera_journey.wav', 3);
    }, null, 1.05);

    // Exactly 2.0 seconds later: End exhaustion and perform neat, smooth, lively recovery animation!
    mainTl.call(() => {
      isBlueExhaustedRef.current = false;
      const base = engineRef.current.baseScale;
      const perkTl = gsap.timeline();

      // 1. Anticipation squash down into floor
      perkTl.to(b3.scale, {
        x: base * 1.16,
        y: base * 0.76,
        z: base * 1.16,
        duration: 0.16,
        ease: 'power2.in',
      });

      // 2. Neat energetic upward spring hop with full 360 spin
      perkTl.to(b3.pos, {
        y: -1.18,
        duration: 0.36,
        ease: 'power2.out',
      }, 0.16);

      perkTl.to(b3.rot, {
        y: b3.rot.y + Math.PI * 2,
        duration: 0.65,
        ease: 'power1.inOut',
      }, 0.16);

      perkTl.to(b3.scale, {
        x: base * 0.90,
        y: base * 1.18,
        z: base * 0.90,
        duration: 0.22,
        ease: 'sine.out',
      }, 0.16);

      // Stardust sparkle burst at apex
      perkTl.call(() => {
        triggerStardustBurst(b3.pos.x, -1.18, 0.2, BUDDIES[3].color, 14);
        playCollisionSound('avatar', 0.65);
      }, null, 0.46);

      // 3. Smooth parabolic descent to resting floor
      perkTl.to(b3.pos, {
        y: -1.65,
        duration: 0.32,
        ease: 'sine.in',
      }, 0.52);

      // 4. Soft landing cushion squish
      perkTl.to(b3.scale, {
        x: base * 1.14,
        y: base * 0.86,
        z: base * 1.14,
        duration: 0.12,
        ease: 'power2.out',
      }, 0.84);

      // 5. Elastic settle to standard resting base scale
      perkTl.to(b3.scale, {
        x: base,
        y: base,
        z: base,
        duration: 0.28,
        ease: 'elastic.out(1.2, 0.45)',
      }, 0.96);

      // 6. Play perked-up friendly greeting right as he sticks the landing
      setTimeout(() => {
        playStoryVoice('/audio/home/bhageera_howareyou.wav', 3);
      }, 860);
    }, null, 3.05);

    mainTl.call(() => {
      // Once dialogue completes, smoothly enable cursor tracking for all avatars!
      cursorTrackingEnabledRef.current = true;
    }, null, 7.10);

  }, [getVoidSlitWorldY, triggerStardustBurst, updateTextColliders]);

  // ═══════════════════════════════════════════════════════════════
  // Circular Revolving Black Hole Portal Transitions (Single-File Line)
  // ═══════════════════════════════════════════════════════════════

  // Departure Sequence: Avatars line up ONE BEHIND THE OTHER in a single-file line, then march into the swirling void
  const executePortalExit = useCallback((targetUrl) => {
    stopAllBounceAudio();

    const buddies = buddyPhysicsRef.current;
    const blackHole = blackHoleRef.current;
    const voidY = getVoidSlitWorldY();
    const base = engineRef.current.baseScale;

    // If no avatars have popped out yet, complete exit swiftly
    if (scrollStepRef.current === 0) {
      setTimeout(() => {
        notifyPortalExitComplete();
      }, 120);
      return;
    }

    isAnimatingRef.current = true;
    playDeepCosmicWhoosh(2.5, 1.0);

    const exitTl = gsap.timeline({
      onComplete: () => {
        isAnimatingRef.current = false;
        notifyPortalExitComplete();
      }
    });

    // 1. Doctor Strange Sling Ring Portal opens with grand swirling energy
    if (blackHole) {
      exitTl.fromTo(blackHole, {
        scale: 0.001,
        rotation: -720,
        opacity: 0,
      }, {
        scale: 1.0,
        rotation: 0,
        opacity: 1.0,
        duration: 0.58,
        ease: 'back.out(1.2)',
      }, 0);
    }

    triggerStardustBurst(0, voidY, 0.7, '#d4af37', 32);

    // 2. Avatars enter the swirling portal ONE BY ONE with smooth, visible flight trajectory
    const enterStartTime = 0.35;
    buddies.forEach((b, idx) => {
      b.isFreePhysics = false;
      b.isReturningHome = false;

      const stepTime = enterStartTime + idx * 0.40;
      const pitch = 1.15 - idx * 0.08;

      exitTl.call(() => {
        playAvatarWhoosh(pitch);
      }, null, stepTime);

      // A. Anticipatory gentle lift
      exitTl.to(b.pos, {
        y: b.pos.y + 0.32,
        duration: 0.28,
        ease: 'sine.out',
      }, stepTime);

      // B. Smooth continuous lateral and vertical flight arc into portal center
      exitTl.to(b.pos, {
        x: 0,
        y: voidY,
        duration: 0.60,
        ease: 'power2.inOut',
      }, stepTime + 0.12);

      // C. Dive into singularity and shrink smoothly
      exitTl.to(b.pos, {
        z: -1.9,
        duration: 0.54,
        ease: 'power2.in',
      }, stepTime + 0.22);

      exitTl.to(b.rot, {
        x: 1.2,
        y: (idx % 2 === 0 ? 3.6 : -3.6),
        z: (idx % 2 === 0 ? 0.30 : -0.30),
        duration: 0.62,
        ease: 'power2.in',
      }, stepTime + 0.12);

      exitTl.to(b.scale, {
        x: 0,
        y: 0,
        z: 0,
        duration: 0.44,
        ease: 'power2.in',
      }, stepTime + 0.32);
    });

    // 3. Black void portal swirls shut once all 4 avatars have entered
    const collapseTime = enterStartTime + buddies.length * 0.40 + 0.35;
    if (blackHole) {
      exitTl.to(blackHole, {
        scale: 0.001,
        rotation: 720,
        opacity: 0,
        duration: 0.42,
        ease: 'power2.in',
      }, collapseTime);
    }
  }, [getVoidSlitWorldY, triggerStardustBurst]);

  // Grand Arrival Sequence: Avatars emerge from swirling black void ONE BY ONE directly into positions
  const executeGrandPortalArrival = useCallback(() => {
    isAnimatingRef.current = true;
    setScrollStep(3);
    scrollStepRef.current = 3;

    const titleCont = titleContainerRef.current;
    const row1 = row1Ref.current;
    const row2 = row2Ref.current;
    const blackHole = blackHoleRef.current;
    const voidY = getVoidSlitWorldY();
    const base = engineRef.current.baseScale;
    const buddies = buddyPhysicsRef.current;

    // Initial state: hidden in singularity
    buddies.forEach((b) => {
      b.isFreePhysics = false;
      b.pos = { x: 0, y: voidY, z: -1.9 };
      b.scale = { x: 0, y: 0, z: 0 };
      b.rot = { x: 0, y: 0, z: 0 };
    });

    playDeepCosmicWhoosh(2.5, 1.0);

    const arrivalTl = gsap.timeline({
      onComplete: () => {
        isAnimatingRef.current = false;
        cursorTrackingEnabledRef.current = true;
        isBlueExhaustedRef.current = false;
        buddies.forEach((b) => {
          b.isFreePhysics = false;
          b.pos.y = -1.65;
          b.scale = { x: base, y: base, z: base };
        });
        updateTextColliders();
      }
    });

    // 1. Black void portal opens in a dramatic swirling vortex motion
    if (blackHole) {
      arrivalTl.fromTo(blackHole, {
        scale: 0.001,
        rotation: -720,
        opacity: 0,
      }, {
        scale: 1.0,
        rotation: 0,
        opacity: 1.0,
        duration: 0.58,
        ease: 'back.out(1.2)',
      }, 0);
    }

    // 2. Avatars emerge from event horizon ONE BY ONE with smooth arc flight
    const emergeStartTime = 0.35;
    buddies.forEach((b, idx) => {
      const emergeTime = emergeStartTime + idx * 0.42;
      const pitch = 0.85 + idx * 0.08;

      arrivalTl.call(() => {
        playAvatarWhoosh(pitch);
      }, null, emergeTime);

      // Smooth 3D flight trajectory from portal center to resting position
      // X: smooth outward glide to target
      arrivalTl.fromTo(b.pos, {
        x: 0,
      }, {
        x: b.targetX,
        duration: 0.88,
        ease: 'power2.out',
      }, emergeTime);

      // Y: gentle rise from portal center, then smooth parabolic descent to floor
      arrivalTl.fromTo(b.pos, {
        y: voidY,
      }, {
        y: voidY + 0.28,
        duration: 0.35,
        ease: 'sine.out',
      }, emergeTime);
      arrivalTl.to(b.pos, {
        y: -1.65,
        duration: 0.53,
        ease: 'power2.inOut',
      }, emergeTime + 0.35);

      // Z: swoops forward from within the portal event horizon into scene
      arrivalTl.fromTo(b.pos, {
        z: -1.4,
      }, {
        z: 0.32,
        duration: 0.40,
        ease: 'power2.out',
      }, emergeTime);
      arrivalTl.to(b.pos, {
        z: 0,
        duration: 0.48,
        ease: 'sine.inOut',
      }, emergeTime + 0.40);

      // Scale: blooms organically from zero to full size
      arrivalTl.fromTo(b.scale, {
        x: 0,
        y: 0,
        z: 0,
      }, {
        x: base,
        y: base,
        z: base,
        duration: 0.80,
        ease: 'back.out(1.15)',
      }, emergeTime);

      // Organic banking roll leveling out to 0
      arrivalTl.fromTo(b.rot, {
        z: (idx % 2 === 0 ? -0.30 : 0.30),
        y: (idx % 2 === 0 ? -1.2 : 1.2),
        x: 0.35,
      }, {
        x: 0,
        y: 0,
        z: 0,
        duration: 0.85,
        ease: 'power2.out',
      }, emergeTime);

      // Touchdown soft squish cushion
      arrivalTl.to(b.scale, {
        x: base * 1.10,
        y: base * 0.88,
        z: base * 1.10,
        duration: 0.14,
        ease: 'power1.out',
      }, emergeTime + 0.88);
      arrivalTl.to(b.scale, {
        x: base,
        y: base,
        z: base,
        duration: 0.20,
        ease: 'power2.out',
      }, emergeTime + 1.02);
    });

    // Reposition typography smoothly
    if (titleCont) arrivalTl.to(titleCont, { y: -90, duration: 0.85, ease: 'power2.inOut' }, 0.2);
    if (row1) arrivalTl.to(row1, { y: 0, duration: 0.55, ease: 'power2.inOut' }, 0.4);
    if (row2) arrivalTl.to(row2, { y: 0, duration: 0.55, ease: 'power2.inOut' }, 0.4);

    // 3. Black void portal swirls shut
    const closeTime = emergeStartTime + buddies.length * 0.42 + 0.35;
    if (blackHole) {
      arrivalTl.to(blackHole, {
        scale: 0.001,
        rotation: 720,
        opacity: 0,
        duration: 0.42,
        ease: 'power2.in',
      }, closeTime);
    }
  }, [getVoidSlitWorldY, triggerStardustBurst, updateTextColliders]);

  // Hook Portal Exit & Arrival Listeners
  useEffect(() => {
    const handlePortalExit = (e) => {
      executePortalExit(e.detail?.targetUrl);
    };
    window.addEventListener('vedika:portal-exit', handlePortalExit);

    // Check if arriving on Home from Vedika AI, Chamber or Labs via portal
    const arrival = checkPortalArrival('/');
    if (arrival.fromPortal && (arrival.origin === 'vedika-ai' || arrival.origin === 'chamber' || arrival.origin === 'labs')) {
      const timer = setTimeout(() => {
        executeGrandPortalArrival();
      }, 450);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('vedika:portal-exit', handlePortalExit);
      };
    }

    return () => {
      window.removeEventListener('vedika:portal-exit', handlePortalExit);
    };
  }, [executePortalExit, executeGrandPortalArrival]);

  // Universal Step Advancer
  const advanceStep = useCallback(() => {
    unlockAudio();
    if (pendingStoryAudioRef.current) {
      const pending = pendingStoryAudioRef.current;
      pendingStoryAudioRef.current = null;
      playStoryVoice(pending.audioSrc, pending.speakingAvatarIndex);
    }
    if (isAnimatingRef.current) return;
    const current = scrollStepRef.current;
    if (current === 0) executeStep1();
    else if (current === 1) executeStep2();
    else if (current === 2) executeStep3();
  }, [executeStep1, executeStep2, executeStep3, playStoryVoice]);

  // ═══════════════════════════════════════════════════════════════
  // 2. Playground Action Functions (Smooth & Delightful)
  // ═══════════════════════════════════════════════════════════════

  // A. Wave Leap: Rhythmic sequential high bounce across squad
  const triggerWaveBounce = useCallback(() => {
    buddyPhysicsRef.current.forEach((b, idx) => {
      b.isFreePhysics = false;
      const tl = gsap.timeline({ delay: idx * 0.12 });
      const base = engineRef.current.baseScale;

      tl.to(b.pos, {
        y: 0.65,
        duration: 0.38,
        ease: 'power2.out',
      });
      tl.to(b.scale, {
        x: base * 0.90,
        y: base * 1.18,
        z: base * 1.10,
        duration: 0.20,
        ease: 'power1.out',
      }, 0);

      tl.to(b.rot, {
        y: b.rot.y + Math.PI * 2,
        duration: 0.75,
        ease: 'power1.inOut',
      }, 0);

      tl.to(b.pos, {
        y: -1.65,
        duration: 0.36,
        ease: 'sine.in',
      }, 0.38);

      tl.call(() => {
        triggerStardustBurst(b.pos.x, 0.65, 0.2, BUDDIES[idx].color, 12);
      }, null, 0.35);

      // Floor impact cushion + Playful Childish Bounce Audio
      tl.call(() => {
        playChildishBounceAudio({ intensity: 0.85 });
      }, null, 0.72);

      tl.to(b.scale, {
        x: base * 1.16,
        y: base * 0.82,
        z: base * 1.16,
        duration: 0.08,
        ease: 'power2.out',
      }, 0.72);

      tl.to(b.scale, {
        x: base,
        y: base,
        z: base,
        duration: 0.25,
        ease: 'elastic.out(1.2, 0.45)',
      }, 0.80);
    });
  }, [triggerStardustBurst]);

  // B. Bounce Party: Energetic synchronized disco dance across squad
  const triggerBounceParty = useCallback(() => {
    unlockAudio();
    isHidingRef.current = false;
    setIsHiding(false);
    zeroGravityRef.current = false;
    setZeroGravity(false);
    magnetModeRef.current = false;
    setMagnetMode(false);

    const base = engineRef.current.baseScale;
    buddyPhysicsRef.current.forEach((b, idx) => {
      b.isFreePhysics = false;
      const tl = gsap.timeline({
        onComplete: () => {
          stopAllBounceAudio();
        }
      });
      const stagger = idx * 0.08;

      // Beat 1: Initial energetic bounce
      tl.to(b.pos, { y: -0.85, duration: 0.25, ease: 'sine.out' }, stagger);
      tl.to(b.scale, { x: base * 0.92, y: base * 1.15, z: base * 0.92, duration: 0.14 }, stagger);
      tl.to(b.rot, { y: b.rot.y + Math.PI, duration: 0.50, ease: 'power1.inOut' }, stagger);
      tl.to(b.pos, { y: -1.65, duration: 0.22, ease: 'sine.in' }, stagger + 0.25);
      tl.call(() => {
        playCollisionSound('floor', 0.85);
        triggerStardustBurst(b.pos.x, -1.5, 0.2, BUDDIES[idx].color, 10);
      }, null, stagger + 0.47);
      tl.to(b.scale, { x: base * 1.12, y: base * 0.86, z: base * 1.12, duration: 0.07 }, stagger + 0.47);

      // Beat 2: High soaring hop
      tl.to(b.pos, { y: -0.40, duration: 0.28, ease: 'sine.out' }, stagger + 0.54);
      tl.to(b.scale, { x: base * 0.90, y: base * 1.18, z: base * 0.90, duration: 0.16 }, stagger + 0.54);
      tl.to(b.rot, { y: b.rot.y + Math.PI * 2, duration: 0.55, ease: 'power1.inOut' }, stagger + 0.54);
      tl.to(b.pos, { y: -1.65, duration: 0.25, ease: 'sine.in' }, stagger + 0.82);
      tl.call(() => {
        playCollisionSound('floor', 0.95);
        triggerStardustBurst(b.pos.x, -1.5, 0.2, BUDDIES[idx].color, 14);
      }, null, stagger + 1.07);
      tl.to(b.scale, { x: base * 1.14, y: base * 0.84, z: base * 1.14, duration: 0.08 }, stagger + 1.07);

      // Beat 3: Gentle rhythm settle hop
      tl.to(b.pos, { y: -1.15, duration: 0.20, ease: 'sine.out' }, stagger + 1.15);
      tl.to(b.scale, { x: base, y: base, z: base, duration: 0.16 }, stagger + 1.15);
      tl.to(b.pos, { y: -1.65, duration: 0.20, ease: 'sine.in' }, stagger + 1.35);
      tl.call(() => {
        playCollisionSound('floor', 0.45);
      }, null, stagger + 1.55);
      tl.to(b.scale, { x: base * 1.06, y: base * 0.94, z: base * 1.06, duration: 0.07 }, stagger + 1.55);
      tl.to(b.scale, { x: base, y: base, z: base, duration: 0.22, ease: 'elastic.out(1.2, 0.45)' }, stagger + 1.62);
    });
  }, [triggerStardustBurst]);

  // C. Spring Pop: Deep crouch gather into explosive high launch
  const triggerSpringPop = useCallback(() => {
    unlockAudio();
    isHidingRef.current = false;
    setIsHiding(false);
    zeroGravityRef.current = false;
    setZeroGravity(false);
    magnetModeRef.current = false;
    setMagnetMode(false);

    const base = engineRef.current.baseScale;
    buddyPhysicsRef.current.forEach((b, idx) => {
      b.isFreePhysics = false;
      const tl = gsap.timeline({
        onComplete: () => {
          stopAllBounceAudio();
        }
      });

      // 1. Crouch & Gather Power (organic squash)
      tl.to(b.pos, { y: -1.82, duration: 0.38, ease: 'power2.in' }, 0);
      tl.to(b.scale, { x: base * 1.32, y: base * 0.62, z: base * 1.32, duration: 0.38, ease: 'power2.in' }, 0);

      // 2. High Spring Explosive Launch!
      tl.call(() => {
        playCollisionSound('words', 0.90);
        triggerStardustBurst(b.pos.x, -1.4, 0.3, BUDDIES[idx].color, 18);
      }, null, 0.38);

      tl.to(b.pos, { y: 1.45, duration: 0.48, ease: 'power3.out' }, 0.38);
      tl.to(b.scale, { x: base * 0.84, y: base * 1.28, z: base * 0.84, duration: 0.24, ease: 'power1.out' }, 0.38);
      tl.to(b.rot, { y: b.rot.y + Math.PI * 2, duration: 0.85, ease: 'power1.inOut' }, 0.38);

      // 3. Peak float
      tl.to(b.scale, { x: base, y: base, z: base, duration: 0.24, ease: 'sine.inOut' }, 0.62);

      // 4. Parabolic Drop
      tl.to(b.pos, { y: -1.65, duration: 0.44, ease: 'sine.in' }, 0.86);

      // 5. Landing cushion
      tl.call(() => {
        playCollisionSound('floor', 1.0);
        triggerStardustBurst(b.pos.x, -1.6, 0.2, BUDDIES[idx].color, 14);
      }, null, 1.30);

      tl.to(b.scale, { x: base * 1.18, y: base * 0.78, z: base * 1.18, duration: 0.13, ease: 'power2.out' }, 1.30);

      // 6. Rebound bounce
      tl.to(b.pos, { y: -0.95, duration: 0.28, ease: 'sine.out' }, 1.43);
      tl.to(b.scale, { x: base, y: base, z: base, duration: 0.22, ease: 'power1.out' }, 1.43);
      tl.to(b.pos, { y: -1.65, duration: 0.25, ease: 'sine.in' }, 1.71);

      tl.call(() => {
        playCollisionSound('floor', 0.50);
      }, null, 1.96);

      tl.to(b.scale, { x: base * 1.08, y: base * 0.92, z: base * 1.08, duration: 0.10, ease: 'power1.out' }, 1.96);
      tl.to(b.scale, { x: base, y: base, z: base, duration: 0.24, ease: 'elastic.out(1.15, 0.45)' }, 2.06);
    });
  }, [triggerStardustBurst]);

  // D. Hide Behind Semi-Curve (Peek-a-Boo Mode - One After The Other)
  const toggleHideBehindCurve = useCallback(() => {
    unlockAudio();
    const nextHiding = !isHidingRef.current;
    isHidingRef.current = nextHiding;
    setIsHiding(nextHiding);

    if (nextHiding) {
      zeroGravityRef.current = false;
      setZeroGravity(false);
      magnetModeRef.current = false;
      setMagnetMode(false);
      playCollisionSound('avatar', 0.65);

      // Avatars duck behind the planet horizon, scurry into cluster, and cautiously peek over the rim!
      buddyPhysicsRef.current.forEach((b, idx) => {
        b.isFreePhysics = false;
        b.isDuckAnimating = true;
        const delay = idx * 0.11; // Staggered sequence: one after the other!
        const tl = gsap.timeline({ delay });
        const target = HIDING_TARGETS[idx];

        // 1. Anticipatory quick squash and duck down completely behind the horizon
        tl.to(b.pos, {
          y: -2.85,
          duration: 0.24,
          ease: 'power2.in',
        });
        tl.to(b.scale, {
          x: engineRef.current.baseScale * 1.18,
          y: engineRef.current.baseScale * 0.78,
          z: engineRef.current.baseScale * 1.18,
          duration: 0.22,
          ease: 'power2.in',
        }, 0);

        // 2. Submerged lateral slide into snug huddle position while safely hidden
        tl.to(b.pos, {
          x: target.x,
          z: 0.18,
          duration: 0.30,
          ease: 'power2.out',
        }, 0.20);

        // 3. Cautiously peek up: forehead and eyes emerge just over the dark curve rim!
        tl.to(b.pos, {
          y: target.y,
          duration: 0.42,
          ease: 'back.out(1.4)',
          onComplete: () => {
            b.isDuckAnimating = false;
          }
        }, 0.46);

        tl.to(b.scale, {
          x: engineRef.current.baseScale * 0.94,
          y: engineRef.current.baseScale * 1.08,
          z: engineRef.current.baseScale * 0.94,
          duration: 0.28,
          ease: 'power2.out',
        }, 0.46);

        tl.to(b.scale, {
          x: engineRef.current.baseScale,
          y: engineRef.current.baseScale,
          z: engineRef.current.baseScale,
          duration: 0.24,
          ease: 'elastic.out(1.2, 0.45)',
        }, 0.74);

        // 4. Little front paws slap right on top of the curve rim with an elastic bounce!
        const grp = buddyGroupsRef.current[BUDDIES[idx].id];
        if (grp) {
          const paws = grp.getObjectByName('AvatarPaws');
          if (paws) {
            paws.visible = true;
            paws.scale.set(0, 0, 0);
            gsap.to(paws.scale, {
              x: 1,
              y: 1,
              z: 1,
              duration: 0.36,
              delay: delay + 0.68,
              ease: 'back.out(2.8)',
            });
          }
        }

        tl.call(() => {
          playCollisionSound('avatar', 0.40);
        }, null, 0.72);
      });
    } else {
      playCollisionSound('floor', 0.75);
      // Avatars joyfully leap out from behind the horizon and spread out to resting positions
      buddyPhysicsRef.current.forEach((b, idx) => {
        b.isFreePhysics = false;
        b.isDuckAnimating = true;
        const delay = idx * 0.10; // Staggered sequence
        const tl = gsap.timeline({ delay });

        // 1. Hide paws first as avatars prepare to spring out
        const grp = buddyGroupsRef.current[BUDDIES[idx].id];
        if (grp) {
          const paws = grp.getObjectByName('AvatarPaws');
          if (paws) {
            gsap.to(paws.scale, {
              x: 0,
              y: 0,
              z: 0,
              duration: 0.14,
              ease: 'power2.in',
              onComplete: () => {
                paws.visible = false;
              }
            });
          }
        }

        // 2. Joyful leaping arc upwards out from behind the curve!
        tl.to(b.pos, {
          x: b.targetX,
          y: -0.65, // High joyful leap
          z: 0.10,
          duration: 0.36,
          ease: 'power2.out',
        }, 0.08);

        tl.to(b.scale, {
          x: engineRef.current.baseScale * 0.90,
          y: engineRef.current.baseScale * 1.18,
          z: engineRef.current.baseScale * 0.90,
          duration: 0.20,
          ease: 'power2.out',
        }, 0.08);

        // 3. Touchdown with elastic bounce onto resting pedestal spot
        tl.to(b.pos, {
          y: -1.65,
          duration: 0.32,
          ease: 'bounce.out',
          onComplete: () => {
            b.isDuckAnimating = false;
          }
        }, 0.42);

        tl.call(() => {
          playCollisionSound('floor', 0.60);
          triggerStardustBurst(b.pos.x, -1.6, 0.2, BUDDIES[idx].color, 10);
        }, null, 0.44);

        tl.to(b.scale, {
          x: engineRef.current.baseScale * 1.14,
          y: engineRef.current.baseScale * 0.88,
          z: engineRef.current.baseScale * 1.14,
          duration: 0.10,
        }, 0.44);

        tl.to(b.scale, {
          x: engineRef.current.baseScale,
          y: engineRef.current.baseScale,
          z: engineRef.current.baseScale,
          duration: 0.28,
          ease: 'elastic.out(1.25, 0.45)',
        }, 0.54);
      });
    }
  }, [triggerStardustBurst]);

  // E. Zero Gravity Toggle: Float weightlessly into space
  const toggleZeroGravity = useCallback(() => {
    isHidingRef.current = false;
    setIsHiding(false);
    const nextVal = !zeroGravityRef.current;
    zeroGravityRef.current = nextVal;
    setZeroGravity(nextVal);

    if (nextVal) {
      magnetModeRef.current = false;
      setMagnetMode(false);
      buddyPhysicsRef.current.forEach((b) => {
        b.isFreePhysics = true;
        b.idleTime = 0;
        b.vel = {
          vx: (Math.random() - 0.5) * 0.08,
          vy: 0.06 + Math.random() * 0.06,
          vz: (Math.random() - 0.5) * 0.04,
        };
      });
    } else {
      buddyPhysicsRef.current.forEach((b) => {
        b.isFreePhysics = true;
        b.idleTime = 2.0;
      });
    }
  }, []);

  // F. Magnet Mode: Follow user cursor
  const toggleMagnetMode = useCallback(() => {
    isHidingRef.current = false;
    setIsHiding(false);
    const nextVal = !magnetModeRef.current;
    magnetModeRef.current = nextVal;
    setMagnetMode(nextVal);

    if (nextVal) {
      zeroGravityRef.current = false;
      setZeroGravity(false);
      buddyPhysicsRef.current.forEach((b) => {
        b.isFreePhysics = true;
        b.idleTime = 0;
      });
    } else {
      buddyPhysicsRef.current.forEach((b) => {
        b.isFreePhysics = true;
        b.idleTime = 2.0;
      });
    }
  }, []);

  // G. Stardust Shower: Fireworks particle fountain
  const triggerStardustShower = useCallback(() => {
    BUDDIES.forEach((b, i) => {
      setTimeout(() => {
        triggerStardustBurst(b.targetX, -1.2, 0.5, b.color, 24);
      }, i * 90);
    });
  }, [triggerStardustBurst]);

  // H. Reset Squad: Smooth return to origin
  const resetSquad = useCallback(() => {
    zeroGravityRef.current = false;
    magnetModeRef.current = false;
    isHidingRef.current = false;
    setZeroGravity(false);
    setMagnetMode(false);
    setIsHiding(false);
    stopAllBounceAudio();

    buddyPhysicsRef.current.forEach((b) => {
      b.isFreePhysics = false;
      gsap.to(b.pos, {
        x: b.targetX,
        y: -1.65,
        z: 0,
        duration: 0.65,
        ease: 'power2.out',
      });
      gsap.to(b.scale, {
        x: engineRef.current.baseScale,
        y: engineRef.current.baseScale,
        z: engineRef.current.baseScale,
        duration: 0.45,
        ease: 'elastic.out(1.15, 0.45)',
      });
      gsap.to(b.rot, {
        x: 0,
        y: 0,
        z: 0,
        duration: 0.45,
        ease: 'power2.out',
      });
      b.vel = { vx: 0, vy: 0, vz: 0 };
    });
  }, []);

  // Individual Avatar Click Hop
  const triggerSingleAvatarHop = useCallback((idx) => {
    const b = buddyPhysicsRef.current[idx];
    if (!b) return;

    b.isFreePhysics = false;
    const base = engineRef.current.baseScale;
    const tl = gsap.timeline();

    triggerStardustBurst(b.pos.x, b.pos.y + 0.3, b.pos.z + 0.2, BUDDIES[idx].color, 16);

    tl.to(b.pos, {
      y: b.pos.y + 1.1,
      duration: 0.32,
      ease: 'power2.out',
    });
    tl.to(b.scale, {
      x: base * 0.88,
      y: base * 1.22,
      z: base * 1.12,
      duration: 0.18,
      ease: 'power1.out',
    }, 0);
    tl.to(b.rot, {
      y: b.rot.y + Math.PI * 2,
      duration: 0.60,
      ease: 'power1.inOut',
    }, 0);
    tl.to(b.pos, {
      y: -1.65,
      duration: 0.32,
      ease: 'sine.in',
    }, 0.32);

    // Floor landing cushion + Childish Playful Bounce Audio
    tl.call(() => {
      playChildishBounceAudio({ intensity: 0.95 });
    }, null, 0.62);

    tl.to(b.scale, {
      x: base * 1.16,
      y: base * 0.84,
      z: base * 1.16,
      duration: 0.08,
      ease: 'power2.out',
    }, 0.62);
    tl.to(b.scale, {
      x: base,
      y: base,
      z: base,
      duration: 0.22,
      ease: 'elastic.out(1.2, 0.45)',
    }, 0.70);
  }, [triggerStardustBurst]);

  // ═══════════════════════════════════════════════════════════════
  // 4. Input & Page Scroll Interception (Locked while animating & until Step 3)
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    const handleWheel = (e) => {
      if (window.scrollY <= 10 && scrollStepRef.current < 3) {
        if (e.cancelable) e.preventDefault();
        if (!isAnimatingRef.current && Math.abs(e.deltaY) > 2) {
          advanceStep();
        }
      }
    };

    let touchStartY = 0;
    const handleTouchStart = (e) => {
      touchStartY = e.touches[0].clientY;
    };
    const handleTouchMove = (e) => {
      if (window.scrollY <= 10 && scrollStepRef.current < 3) {
        const delta = touchStartY - e.touches[0].clientY;
        if (Math.abs(delta) > 5) {
          if (e.cancelable) e.preventDefault();
          if (!isAnimatingRef.current) {
            advanceStep();
          }
        }
      }
    };

    const handleKeyDown = (e) => {
      if (['Space', 'ArrowDown', 'PageDown', 'Enter'].includes(e.code)) {
        if (scrollStepRef.current < 3) {
          e.preventDefault();
          if (!isAnimatingRef.current) advanceStep();
        }
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [advanceStep]);

  // ═══════════════════════════════════════════════════════════════
  // 5. Three.js Engine & 4 Floor Shadows Initialization
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = canvas.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 1920);
    const height = canvas.clientHeight || (typeof window !== 'undefined' ? window.innerHeight : 1080);
    const pixelRatio = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 1.75);

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 100);
    camera.position.set(0, 0, 13.2);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    if ('outputColorSpace' in renderer) {
      renderer.outputColorSpace = THREE.SRGBColorSpace;
    }
    rendererRef.current = renderer;

    // ── Soft Showcase Studio & Clean Eye Illumination ──
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.05);
    scene.add(ambientLight);

    // Front Stage Key Light (Crisp clean illumination preserving pure white eyes)
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.45);
    keyLight.position.set(0, 3.8, 7.5);
    scene.add(keyLight);

    // Top Velvet Crown Rim Light (Crisp specular rim highlight across top fur & crowns)
    const topRimLight = new THREE.DirectionalLight(0xffffff, 1.10);
    topRimLight.position.set(0, 8.0, 2.0);
    scene.add(topRimLight);

    // Low Front Fill for Hide Mode (Clean neutral fill)
    const lowFrontFill = new THREE.DirectionalLight(0xffffff, 0.50);
    lowFrontFill.position.set(0, -1.8, 6.0);
    scene.add(lowFrontFill);

    // 4 Dedicated Character Point Lights for Rich, Punchy Neon Glow
    const avatarSpotlights = [];
    const BUDDY_SHINE_COLORS = [0x39FF14, 0xFF6EFF, 0xFF3131, 0xFF5C00];
    BUDDIES.forEach((buddy, idx) => {
      const pLight = new THREE.PointLight(BUDDY_SHINE_COLORS[idx], 1.65, 5.0, 1.8);
      pLight.position.set(buddy.targetX, -1.3, 1.5);
      scene.add(pLight);
      avatarSpotlights.push(pLight);
    });
    avatarSpotlightsRef.current = avatarSpotlights;

    // Contact Floor Shadows for ALL 4 AVATARS
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const sCtx = shadowCanvas.getContext('2d');
    const grad = sCtx.createRadialGradient(64, 64, 4, 64, 64, 60);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.75)');
    grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.35)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    sCtx.fillStyle = grad;
    sCtx.fillRect(0, 0, 128, 128);

    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowGeo = new THREE.PlaneGeometry(1.8, 1.8);
    const shadows = [];

    BUDDIES.forEach((buddy) => {
      const shadowMat = new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
      shadowMesh.rotation.x = -Math.PI / 2;
      shadowMesh.position.set(buddy.targetX, -2.45, 0);
      scene.add(shadowMesh);
      shadows.push(shadowMesh);
    });
    shadowMeshesRef.current = shadows;

    // Preload textures
    const textureLoader = new THREE.TextureLoader();
    BUDDIES.forEach((b) => {
      const tex = textureLoader.load(b.texture);
      tex.flipY = false;
      tex.colorSpace = THREE.SRGBColorSpace;
      cachedTextures[b.id] = tex;
    });

    // ── Instant 3D Squad Initialization (Ultra High Density 128x128 Mesh for Smooth Soft-Body Deformation) ──
    const initialGeo = cachedMasterGeometry || new THREE.SphereGeometry(0.74, 128, 128);
    const meshes = [];

    BUDDIES.forEach((buddy, idx) => {
      const tex = cachedTextures[buddy.id] || cachedTextures.green;
      const mat = new THREE.MeshPhysicalMaterial({
        map: tex,
        color: 0xffffff,
        roughness: 0.28,
        metalness: 0.02,
        clearcoat: 0.35,
        clearcoatRoughness: 0.15,
      });

      if (idx === 0) {
        mat.onBeforeCompile = (shader) => {
          shader.uniforms.uPinchStrength = { value: 0.0 };
          shader.uniforms.uSlitZCenter = { value: 0.0 };
          mat.userData.shader = shader;

          shader.vertexShader = `
            uniform float uPinchStrength;
            uniform float uSlitZCenter;
            ${shader.vertexShader}
          `.replace(
            '#include <begin_vertex>',
            `#include <begin_vertex>
            if (uPinchStrength > 0.001) {
              // Bulging Balloon Pinch:
              // 1. Calculate distance of vertex from slit plane in sphere local coordinate space
              float distZ = transformed.z - uSlitZCenter;
              
              // 2. Localized constriction band directly at the slit
              float band = exp(- (distZ * distZ) / 0.14);
              
              // 3. Compress vertical height Y to touch top/bottom edges of the narrow slot
              transformed.y *= (1.0 - band * 0.74 * uPinchStrength);
              
              // 4. Natural sphere width X is strictly preserved (no artificial stretching!)
              transformed.x *= (1.0 + band * 0.06 * uPinchStrength);
            }
            `
          );
        };
      }

      const mesh = new THREE.Mesh(initialGeo, mat);
      mesh.frustumCulled = false;
      meshes.push(mesh);

      const group = new THREE.Group();
      group.add(mesh);
      group.position.set(buddy.targetX, -1.65, 0);
      group.scale.set(0, 0, 0);
      group.userData = { buddyIndex: idx, buddyId: buddy.id };

      // Dynamic mouth & lips animation face plane (positioned in front of avatar face)
      const faceCanvas = document.createElement('canvas');
      faceCanvas.width = 256;
      faceCanvas.height = 256;
      const faceCtx = faceCanvas.getContext('2d');
      const faceTexture = new THREE.CanvasTexture(faceCanvas);
      faceTexture.minFilter = THREE.LinearFilter;
      faceTexture.magFilter = THREE.LinearFilter;

      const facePlane = new THREE.Mesh(
        new THREE.PlaneGeometry(0.78, 0.78),
        new THREE.MeshBasicMaterial({
          map: faceTexture,
          transparent: true,
          depthWrite: false,
          side: THREE.FrontSide,
        })
      );
      facePlane.position.set(0, -0.07, 0.76);
      facePlane.renderOrder = 10;
      group.add(facePlane);

      // Cute 3D Front Paws (Appears ONLY in hide position, resting right over curve line!)
      const pawsGroup = new THREE.Group();
      pawsGroup.name = 'AvatarPaws';
      pawsGroup.visible = false; // Never visible from the start!
      const pawMat = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(buddy.color),
        roughness: 0.58,
        metalness: 0.0,
        sheen: 0.60,
        sheenColor: new THREE.Color(buddy.color),
        clearcoat: 0.03,
      });

      [-1, 1].forEach((side) => {
        const paw = new THREE.Group();
        // Positioned right over the curve line ledge
        paw.position.set(side * 0.28, -0.06, 0.78);
        paw.rotation.x = 0.32; // Angled resting gently over the curve rim

        // Main cushion
        const mainGeo = new THREE.SphereGeometry(0.088, 16, 16);
        const mainMesh = new THREE.Mesh(mainGeo, pawMat);
        mainMesh.scale.set(1.22, 0.68, 1.12);
        paw.add(mainMesh);

        // 3 Cute Toe Beans
        [-0.048, 0.0, 0.048].forEach((offsetX) => {
          const toeGeo = new THREE.SphereGeometry(0.036, 12, 12);
          const toeMesh = new THREE.Mesh(toeGeo, pawMat);
          toeMesh.position.set(offsetX, 0.016, 0.052);
          toeMesh.scale.set(1.0, 0.72, 1.15);
          paw.add(toeMesh);
        });

        pawsGroup.add(paw);
      });
      pawsGroup.renderOrder = 15;
      group.add(pawsGroup);

      buddyFacesRef.current.push({
        canvas: faceCanvas,
        ctx: faceCtx,
        texture: faceTexture,
        mesh: facePlane,
        mouthOpen: 0,
      });

      scene.add(group);
      buddyGroupsRef.current[buddy.id] = group;
    });
    buddyMeshesRef.current = meshes;

    // Load High-Poly GLB & Seamlessly Upgrade Geometries
    if (!cachedMasterGeometry) {
      const gltfLoader = new GLTFLoader();
      gltfLoader.load(
        '/Physics-avatar-opt.glb',
        (gltf) => {
          let extractedGeo = null;
          gltf.scene.traverse((child) => {
            if (child.isMesh && child.geometry && !extractedGeo) {
              extractedGeo = child.geometry.clone();
              extractedGeo.center();
              extractedGeo.computeBoundingBox();
            }
          });

          if (extractedGeo) {
            const box = extractedGeo.boundingBox;
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const normScale = 1.48 / (maxDim > 0 ? maxDim : 1);
            extractedGeo.scale(normScale, normScale, normScale);

            cachedMasterGeometry = extractedGeo;
            meshes.forEach((m) => {
              m.geometry = extractedGeo;
            });
          }
        },
        undefined,
        (err) => console.warn('GLB load fallback used:', err)
      );
    }

    const handleResize = () => {
      if (!canvas || !renderer || !camera) return;
      const w = canvas.clientWidth || window.innerWidth;
      const h = canvas.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);

      const viewHeight = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * Math.abs(camera.position.z) * 2;
      const viewWidth = viewHeight * camera.aspect;
      engineRef.current.bounds.maxX = viewWidth * 0.48;
      engineRef.current.bounds.minX = -viewWidth * 0.48;
      engineRef.current.bounds.maxY = viewHeight * 0.46;
      engineRef.current.bounds.minY = -viewHeight * 0.46;

      updateTextColliders();
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    const handleWindowMouseMove = (e) => {
      const canvasEl = canvasRef.current;
      if (!canvasEl) return;
      const rect = canvasEl.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const ndcY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
        engineRef.current.mouseNdc.x = ndcX;
        engineRef.current.mouseNdc.y = ndcY;

        if (camera) {
          const vec = new THREE.Vector3(ndcX, ndcY, 0.5);
          vec.unproject(camera);
          vec.sub(camera.position).normalize();
          const distance = -camera.position.z / vec.z;
          engineRef.current.mouseWorld = camera.position.clone().add(vec.multiplyScalar(distance));
        }
      }
    };
    window.addEventListener('mousemove', handleWindowMouseMove, { passive: true });

    // ═══════════════════════════════════════════════════════════════
    // Main 60fps Loop with Independent Gaze, Shadows, & Stardust Sparkles
    // ═══════════════════════════════════════════════════════════════
    let time = 0;
    const physicsLoop = () => {
      time += 0.018;
      const engine = engineRef.current;
      const groups = buddyGroupsRef.current;
      const buddies = buddyPhysicsRef.current;
      const currentStep = scrollStepRef.current;
      const base = engine.baseScale;
      const shadows = shadowMeshesRef.current;

      // Animate Dynamic Stardust Sparkles
      if (engine.particles.length > 0) {
        for (let i = engine.particles.length - 1; i >= 0; i--) {
          const p = engine.particles[i];
          p.mesh.position.x += p.vx;
          p.mesh.position.y += p.vy;
          p.mesh.position.z += p.vz;
          p.vy -= 0.0008;
          p.vx *= 0.98;
          p.vz *= 0.98;
          p.life -= p.decay;
          p.mesh.material.opacity = Math.max(0, p.life);
          p.mesh.scale.setScalar(Math.max(0.01, p.life));

          if (p.life <= 0) {
            scene.remove(p.mesh);
            p.mesh.geometry.dispose();
            p.mesh.material.dispose();
            engine.particles.splice(i, 1);
          }
        }
      }

      buddies.forEach((b, idx) => {
        const group = groups[b.id];
        const shadow = shadows[idx];
        if (!group) return;

        // Step 0: Hidden on initial load
        if (currentStep === 0 && !isAnimatingRef.current && !b.isFreePhysics && b.scale.x < 0.01) {
          group.scale.set(0, 0, 0);
          if (shadow) shadow.material.opacity = 0;
          return;
        }

        // ── Dragging Mode ──
        if (b.isDragging) {
          b.idleTime = 0;
          b.isFreePhysics = true;
          group.position.set(b.pos.x, b.pos.y, b.pos.z);
          group.scale.set(base, base, base);
          group.rotation.set(0, 0, 0);
          if (shadow) {
            shadow.position.x = b.pos.x;
            shadow.position.z = b.pos.z;
            shadow.material.opacity = 0.55;
          }
          return;
        }

        // ── Magnet Mode Physics (Flock around cursor) ──
        if (magnetModeRef.current && !b.isDragging) {
          const mw = engine.mouseWorld;
          const angle = (idx / 4) * Math.PI * 2 + time * 1.8;
          const targetX = mw.x + Math.cos(angle) * 1.5;
          const targetY = mw.y + Math.sin(angle) * 1.2;

          b.pos.x += (targetX - b.pos.x) * 0.08;
          b.pos.y += (targetY - b.pos.y) * 0.08;
          b.pos.z += (0.4 - b.pos.z) * 0.08;

          group.position.set(b.pos.x, b.pos.y, b.pos.z);
          group.scale.set(base, base, base);
          group.rotation.y = THREE.MathUtils.clamp((mw.x - b.pos.x) * 0.25, -0.45, 0.45);

          if (shadow) {
            const h = Math.max(0, b.pos.y - (-1.65));
            shadow.position.x = b.pos.x;
            shadow.position.z = b.pos.z;
            shadow.scale.set(Math.max(0.2, 1.2 - h * 0.25), Math.max(0.2, 1.2 - h * 0.25), 1);
            shadow.material.opacity = Math.max(0.05, 0.55 - h * 0.15);
          }
          return;
        }

        // ── Zero Gravity Mode Physics (Weightless space float) ──
        if (zeroGravityRef.current && !b.isDragging) {
          b.floatPhase += 0.02;
          b.pos.x += Math.sin(b.floatPhase + idx) * 0.012;
          b.pos.y += Math.cos(b.floatPhase * 0.8 + idx) * 0.015;
          b.pos.z += Math.sin(b.floatPhase * 0.5) * 0.008;

          const bounds = engine.bounds;
          b.pos.x = THREE.MathUtils.clamp(b.pos.x, bounds.minX + 0.8, bounds.maxX - 0.8);
          b.pos.y = THREE.MathUtils.clamp(b.pos.y, -1.5, bounds.maxY - 0.8);

          group.position.set(b.pos.x, b.pos.y, b.pos.z);
          group.scale.set(base, base, base);
          group.rotation.x = Math.sin(b.floatPhase * 0.5) * 0.2;
          group.rotation.y = Math.cos(b.floatPhase * 0.6) * 0.25;

          if (shadow) {
            const h = Math.max(0, b.pos.y - (-1.65));
            shadow.position.x = b.pos.x;
            shadow.position.z = b.pos.z;
            shadow.scale.set(Math.max(0.1, 1.2 - h * 0.3), Math.max(0.1, 1.2 - h * 0.3), 1);
            shadow.material.opacity = Math.max(0.04, 0.55 - h * 0.20);
          }
          return;
        }

        // ── Free Interactive Physics Mode (Smooth Float, Bounce & Patient Return) ──
        if (b.isFreePhysics) {
          b.idleTime += 0.016;

          // Floatier, more natural gravity and air resistance:
          b.vel.vy -= 0.0075;
          b.vel.vx *= 0.988;
          b.vel.vy *= 0.990;
          b.vel.vz *= 0.988;

          b.pos.x += b.vel.vx;
          b.pos.y += b.vel.vy;
          b.pos.z += b.vel.vz;

          // Natural organic tumble during flight:
          group.rotation.x += b.vel.vy * 0.4;
          group.rotation.y += b.vel.vx * 0.4;
          group.rotation.z += b.vel.vx * -0.2;

          // 1. Floor Bouncing (Gentle & soft, strictly silenced if returning home)
          if (b.pos.y <= -1.65) {
            const impactVy = -b.vel.vy;
            b.pos.y = -1.65;

            if (impactVy > 0.06 && !b.isReturningHome) {
              b.vel.vy = impactVy * 0.60;
              b.vel.vx *= 0.86;

              const now = performance.now();
              if (now - (avatarLastBounceRef.current[idx] || 0) > 180) {
                avatarLastBounceRef.current[idx] = now;
                playCollisionSound('floor', Math.min(0.85, impactVy * 3.2));
              }
            } else {
              b.vel.vy = 0;
              b.vel.vx *= 0.82;
            }
          }

          // 2. Screen Bounding Walls (Side and Top)
          const bounds = engine.bounds;
          const r = engine.radius;
          if (b.pos.x - r < bounds.minX) {
            b.pos.x = bounds.minX + r;
            const impactVx = Math.abs(b.vel.vx);
            b.vel.vx = impactVx * 0.70;
            if (impactVx > 0.08 && !b.isReturningHome) {
              playCollisionSound('wall', Math.min(0.8, impactVx * 3.0));
            }
          }
          if (b.pos.x + r > bounds.maxX) {
            b.pos.x = bounds.maxX - r;
            const impactVx = Math.abs(b.vel.vx);
            b.vel.vx = -impactVx * 0.70;
            if (impactVx > 0.08 && !b.isReturningHome) {
              playCollisionSound('wall', Math.min(0.8, impactVx * 3.0));
            }
          }
          if (b.pos.y + r > bounds.maxY) {
            b.pos.y = bounds.maxY - r;
            const impactVy = Math.abs(b.vel.vy);
            b.vel.vy = -impactVy * 0.70;
            if (impactVy > 0.08 && !b.isReturningHome) {
              playCollisionSound('wall', Math.min(0.8, impactVy * 3.0));
            }
          }

          // 3. Words "VEDIKA AI TUTOR" Colliders
          if (engine.textColliders.length > 0 && !b.isReturningHome) {
            engine.textColliders.forEach((col) => {
              const cx = Math.max(col.center.x - col.halfSize.x, Math.min(b.pos.x, col.center.x + col.halfSize.x));
              const cy = Math.max(col.center.y - col.halfSize.y, Math.min(b.pos.y, col.center.y + col.halfSize.y));
              const cz = Math.max(col.center.z - col.halfSize.z, Math.min(b.pos.z, col.center.z + col.halfSize.z));

              const distSq = (b.pos.x - cx) ** 2 + (b.pos.y - cy) ** 2 + (b.pos.z - cz) ** 2;
              if (distSq < r * r && distSq > 0.0001) {
                const dist = Math.sqrt(distSq);
                const nx = (b.pos.x - cx) / dist;
                const ny = (b.pos.y - cy) / dist;

                b.pos.x = cx + nx * r;
                b.pos.y = cy + ny * r;

                const dot = b.vel.vx * nx + b.vel.vy * ny;
                if (dot < 0) {
                  const impactSpeed = Math.abs(dot);
                  b.vel.vx -= 1.65 * dot * nx;
                  b.vel.vy -= 1.65 * dot * ny;

                  if (impactSpeed > 0.08 && !b.isReturningHome) {
                    playCollisionSound('words', Math.min(0.85, impactSpeed * 3.0));
                  }

                  if (col.el) {
                    col.el.classList.remove('letter-hit');
                    void col.el.offsetWidth;
                    col.el.classList.add('letter-hit');
                  }
                }
              }
            });
          }

          // 4. Smooth, Patient Return-to-Home Physics (Allows Natural Bouncing & Floats First!)
          const speed = Math.hypot(b.vel.vx, b.vel.vy, b.vel.vz);
          // Let the avatar bounce and float freely for at least 2.8 seconds or until speed settles on floor
          if (b.idleTime > 2.8 || (b.pos.y <= -1.64 && speed < 0.02 && b.idleTime > 1.4)) {
            if (!b.isReturningHome) {
              b.isReturningHome = true;
              stopAllBounceAudio(); // Kill any lingering audio immediately on return
            }

            const dx = b.targetX - b.pos.x;
            const dy = b.targetY - b.pos.y;
            const dz = 0 - b.pos.z;

            // Silky smooth glide back home:
            b.pos.x += dx * 0.06;
            b.pos.y += dy * 0.06;
            b.pos.z += dz * 0.06;

            b.vel.vx *= 0.65;
            b.vel.vy *= 0.65;
            b.vel.vz *= 0.65;

            // Re-orient smoothly upright
            group.rotation.x *= 0.90;
            group.rotation.y *= 0.90;
            group.rotation.z *= 0.90;

            if (Math.hypot(dx, dy, dz) < 0.02) {
              b.isFreePhysics = false;
              b.isReturningHome = false;
              b.pos.x = b.targetX;
              b.pos.y = b.targetY;
              b.pos.z = 0;
              b.vel = { vx: 0, vy: 0, vz: 0 };
              stopAllBounceAudio(); // GUARANTEE 100% silence
            }
          }

          group.position.set(b.pos.x, b.pos.y, b.pos.z);
          group.scale.set(base, base, base);

          if (shadow) {
            const h = Math.max(0, b.pos.y - (-1.65));
            shadow.position.x = b.pos.x;
            shadow.position.z = b.pos.z;
            shadow.scale.set(Math.max(0.2, 1.2 - h * 0.3), Math.max(0.2, 1.2 - h * 0.3), 1);
            shadow.material.opacity = Math.max(0.08, 0.60 - h * 0.20);
          }
          return;
        }

        // ── Settled Resting Mode (Curious, Lively Cursor Following & Movement) ──
        if (b.scale.x > 0.01) {
          const paws = group.getObjectByName('AvatarPaws');

          if (isHidingRef.current) {
            if (paws && !paws.visible) paws.visible = true;

            // Cute Peek-a-Boo bobbing behind the dark curved horizon (close-together cuddling pose!)
            if (!b.isDuckAnimating) {
              const targetHide = HIDING_TARGETS[idx] || { x: b.targetX, y: -1.68 };
              const peekY = targetHide.y + Math.sin(time * 2.0 + idx * 0.9) * 0.010;

              // Interactive Peek-a-Boo: If mouse gets right near an avatar, it shyly ducks down slightly!
              const mw = engine.mouseWorld;
              const distToCursor = Math.hypot(mw.x - b.pos.x, mw.y - b.pos.y);
              let shyDuck = 0;
              if (distToCursor < 1.35) {
                shyDuck = (1.35 - distToCursor) * 0.075;
              }

              b.pos.x += (targetHide.x - b.pos.x) * 0.08;
              b.pos.y += ((peekY - shyDuck) - b.pos.y) * 0.08;
              b.pos.z += (0.18 - b.pos.z) * 0.08;
            }

            group.position.set(b.pos.x, b.pos.y, b.pos.z);
            group.scale.set(b.scale.x, b.scale.y, b.scale.z);

            // Inquisitive curious peek & head turn toward cursor over the curved edge!
            const mw = engine.mouseWorld;
            const dx = mw.x - b.pos.x;
            const dy = mw.y - b.pos.y;
            group.rotation.x = THREE.MathUtils.clamp(-dy * 0.16 - 0.04, -0.20, 0.12);
            group.rotation.y = THREE.MathUtils.clamp(dx * 0.22, -0.40, 0.40);
            group.rotation.z = Math.sin(time * 1.6 + idx * 0.8) * 0.04 + THREE.MathUtils.clamp(dx * -0.03, -0.06, 0.06);

            // Natural paw flexing on top of curve rim
            if (paws) {
              paws.rotation.x = 0.32 + Math.sin(time * 2.0 + idx * 0.9) * 0.025;
            }

            if (shadow) {
              shadow.position.x = b.pos.x;
              shadow.position.z = b.pos.z;
              shadow.scale.set(0.65, 0.65, 1);
              shadow.material.opacity = 0.0;
            }
          } else {
            if (paws && paws.visible) paws.visible = false;
            let restY = b.targetY;
            if (engine.isHoveringHorizon) {
              restY += 0.18;
            } else {
              restY += Math.sin(time * 2.2 + idx * 0.8) * 0.025;
            }

            // ── STORYTELLING GAZE / CURSOR TRACKING LOGIC ──
            const isTracking = cursorTrackingEnabledRef.current;
            const mw = engine.mouseWorld;
            const dx = mw.x - b.targetX;
            const dy = mw.y - b.targetY;

            // Subtle body weight shift towards cursor (ONLY when tracking is enabled after dialogue!):
            const targetShiftX = isTracking ? THREE.MathUtils.clamp(dx * 0.08, -0.32, 0.32) : 0;
            const targetShiftY = isTracking ? THREE.MathUtils.clamp(dy * 0.06, -0.15, 0.18) : 0;
            const targetShiftZ = isTracking ? THREE.MathUtils.clamp(dy * 0.04, -0.12, 0.12) : 0;

            if (!isAnimatingRef.current) {
              b.pos.x += ((b.targetX + targetShiftX) - b.pos.x) * 0.08;
              b.pos.y += ((restY + targetShiftY) - b.pos.y) * 0.08;
              b.pos.z += (targetShiftZ - b.pos.z) * 0.08;
            }

            const isSpeaking = speakingBuddyIndexRef.current === idx;
            const isExhaustedBlue = idx === 3 && isBlueExhaustedRef.current;

            if (isExhaustedBlue) {
              // Genuinely exhausted Blue choreography:
              // Slow heavy panting/heaving breath cycle (~1.8 rad/s)
              const breath = Math.sin(time * 1.8);
              // Body squashes down and expands as it breathes heavily:
              const exhScaleY = b.scale.y * (0.86 + breath * 0.06);
              const exhScaleXZ = b.scale.x * (1.10 - breath * 0.04);
              group.scale.set(exhScaleXZ, exhScaleY, exhScaleXZ);

              // Slumped resting position (resting heavily on the floor)
              const slumpY = -0.09 + (breath > 0 ? breath * 0.015 : 0);
              group.position.set(b.pos.x, b.pos.y + slumpY, b.pos.z);

              // Weary drooping posture: head tilted forward toward ground, leaning slightly
              const tiredPitch = 0.38 + Math.sin(time * 1.2) * 0.025;
              const tiredYaw = -0.22 + Math.sin(time * 0.8) * 0.04;
              const tiredRoll = 0.14 + Math.cos(time * 1.0) * 0.025;

              group.rotation.x += (tiredPitch - group.rotation.x) * 0.10;
              group.rotation.y += (tiredYaw - group.rotation.y) * 0.10;
              group.rotation.z += (tiredRoll - group.rotation.z) * 0.10;
            } else {
              group.position.set(b.pos.x, b.pos.y, b.pos.z);
              group.scale.set(b.scale.x, b.scale.y, b.scale.z);

              if (!isTracking) {
                // Until speech completes, avatars face user while faithfully mirroring any hop spins/tilts
                group.rotation.x += (b.rot.x - group.rotation.x) * 0.14;
                group.rotation.y += (b.rot.y - group.rotation.y) * 0.14;
                group.rotation.z += (b.rot.z - group.rotation.z) * 0.14;
              } else {
                // Lively interactive cursor tracking: follows and looks towards mouse
                const headDx = mw.x - b.pos.x;
                const headDy = mw.y - (b.pos.y + 0.2);
                const targetRotY = THREE.MathUtils.clamp(headDx * 0.32, -0.60, 0.60);
                const targetRotX = THREE.MathUtils.clamp(-headDy * 0.24, -0.38, 0.38);
                const targetRotZ = THREE.MathUtils.clamp(headDx * -0.05, -0.14, 0.14);

                group.rotation.x += (targetRotX - group.rotation.x) * 0.10;
                group.rotation.y += (targetRotY - group.rotation.y) * 0.10;
                group.rotation.z += (targetRotZ - group.rotation.z) * 0.10;
              }
            }

            if (shadow) {
              const h = Math.max(0, b.pos.y - (-1.65));
              shadow.position.x = b.pos.x;
              shadow.position.z = b.pos.z;
              shadow.scale.set(Math.max(0.2, 1.2 - h * 0.3), Math.max(0.2, 1.2 - h * 0.3), 1);
              shadow.material.opacity = Math.max(0.08, 0.55 - h * 0.20);
            }
          }
        } else {
          group.position.set(b.pos.x, b.pos.y, b.pos.z);
          group.scale.set(b.scale.x, b.scale.y, b.scale.z);
          if (shadow) shadow.material.opacity = 0;
        }
      });

      // ── 3D Avatar-to-Avatar Elastic Sphere Collisions ──
      for (let i = 0; i < buddies.length; i++) {
        for (let j = i + 1; j < buddies.length; j++) {
          const bA = buddies[i];
          const bB = buddies[j];
          if ((!bA.isFreePhysics && !bA.isDragging) && (!bB.isFreePhysics && !bB.isDragging)) continue;
          if (bA.scale.x < 0.1 || bB.scale.x < 0.1) continue;

          const dx = bB.pos.x - bA.pos.x;
          const dy = bB.pos.y - bA.pos.y;
          const dz = bB.pos.z - bA.pos.z;
          const distSq = dx * dx + dy * dy + dz * dz;
          const minDist = 0.74 * 2 * 0.94; // avatar contact distance

          if (distSq < minDist * minDist && distSq > 0.00001) {
            const dist = Math.sqrt(distSq);
            const nx = dx / dist;
            const ny = dy / dist;
            const nz = dz / dist;

            const overlap = (minDist - dist) * 0.5;
            if (bA.isFreePhysics && !bA.isDragging) {
              bA.pos.x -= nx * overlap;
              bA.pos.y -= ny * overlap;
              bA.pos.z -= nz * overlap;
            }
            if (bB.isFreePhysics && !bB.isDragging) {
              bB.pos.x += nx * overlap;
              bB.pos.y += ny * overlap;
              bB.pos.z += nz * overlap;
            }

            const rvx = bB.vel.vx - bA.vel.vx;
            const rvy = bB.vel.vy - bA.vel.vy;
            const rvz = bB.vel.vz - bA.vel.vz;
            const velAlongNormal = rvx * nx + rvy * ny + rvz * nz;

            if (velAlongNormal < 0) {
              const impulse = -1.82 * velAlongNormal * 0.5;
              if (bA.isFreePhysics && !bA.isDragging) {
                bA.vel.vx -= impulse * nx;
                bA.vel.vy -= impulse * ny;
                bA.vel.vz -= impulse * nz;
              }
              if (bB.isFreePhysics && !bB.isDragging) {
                bB.vel.vx += impulse * nx;
                bB.vel.vy += impulse * ny;
                bB.vel.vz += impulse * nz;
              }

              const impactSpeed = Math.abs(velAlongNormal);
              if (impactSpeed > 0.04) {
                playCollisionSound('avatar', Math.min(1.0, impactSpeed * 4.0));
                triggerStardustBurst((bA.pos.x + bB.pos.x) * 0.5, (bA.pos.y + bB.pos.y) * 0.5, 0.2, '#ffffff', 8);
              }
            }
          }
        }
      }

      // ── Dynamic Talking Lips Animation on Face Textures ──
      if (buddyFacesRef.current && buddyFacesRef.current.length === BUDDIES.length) {
        const activeSpeaker = speakingBuddyIndexRef.current;
        buddyFacesRef.current.forEach((face, fIdx) => {
          const isSpeaking = activeSpeaker === fIdx;
          const isExhaustedBlue = fIdx === 3 && isBlueExhaustedRef.current;
          const targetMouth = isSpeaking ? (Math.sin(time * 18.0) * 0.5 + 0.5) * 22 : 0;
          face.mouthOpen += (targetMouth - face.mouthOpen) * 0.35;

          const ctx = face.ctx;
          ctx.clearRect(0, 0, 256, 256);

          ctx.save();
          ctx.translate(128, 150);
          ctx.beginPath();
          ctx.lineWidth = 5.5;
          ctx.strokeStyle = 'rgba(25, 20, 25, 0.85)';
          ctx.lineCap = 'round';

          if (isExhaustedBlue) {
            // Truly exhausted panting/sighing mouth for Blue avatar
            const pantHeight = 7.5 + Math.sin(time * 2.2) * 3.5;
            ctx.fillStyle = 'rgba(20, 15, 20, 0.90)';
            ctx.beginPath();
            ctx.ellipse(0, 3, 13, pantHeight, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Animated perspiration drop on forehead showing exhaustion
            ctx.fillStyle = 'rgba(96, 165, 250, 0.92)';
            ctx.beginPath();
            ctx.arc(38, -26 + Math.sin(time * 2.0) * 2.5, 4.5, 0, Math.PI * 2);
            ctx.fill();
          } else if (face.mouthOpen > 2.0) {
            // Open animated talking mouth
            ctx.fillStyle = 'rgba(20, 15, 20, 0.92)';
            ctx.beginPath();
            ctx.ellipse(0, 0, 15, Math.max(3, face.mouthOpen * 0.65), 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            if (face.mouthOpen > 8) {
              ctx.fillStyle = 'rgba(244, 114, 182, 0.85)';
              ctx.beginPath();
              ctx.ellipse(0, face.mouthOpen * 0.28, 8, 4, 0, 0, Math.PI);
              ctx.fill();
            }
          } else {
            // Gentle resting smile
            ctx.beginPath();
            ctx.moveTo(-14, -2);
            ctx.quadraticCurveTo(0, 8, 14, -2);
            ctx.stroke();
          }
          ctx.restore();
          face.texture.needsUpdate = true;
        });
      }

      // Update 4 Avatar Spotlights (Gentle underglow below face level to keep eye whites pure)
      if (avatarSpotlightsRef.current && avatarSpotlightsRef.current.length > 0) {
        avatarSpotlightsRef.current.forEach((pLight, idx) => {
          const b = buddies[idx];
          if (b && b.scale.x > 0.01) {
            pLight.position.set(b.pos.x, b.pos.y - 0.40, b.pos.z + 0.90);
            pLight.intensity = isHidingRef.current ? 1.0 : 0.55;
          } else {
            pLight.intensity = 0;
          }
        });
      }

      renderer.render(scene, camera);

      // Only schedule next frame if the hero section is currently visible in viewport
      if (isHeroVisibleRef.current) {
        animIdRef.current = requestAnimationFrame(physicsLoop);
      } else {
        animIdRef.current = null;
      }
    };

    // IntersectionObserver to pause rendering when hero is scrolled out of view
    const heroEl = heroRef.current;
    let observer = null;
    if (heroEl && typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver((entries) => {
        const entry = entries[0];
        const isVis = entry.isIntersecting;
        isHeroVisibleRef.current = isVis;
        if (isVis && !animIdRef.current) {
          animIdRef.current = requestAnimationFrame(physicsLoop);
        }
      }, { threshold: 0.02 });
      observer.observe(heroEl);
    }

    animIdRef.current = requestAnimationFrame(physicsLoop);

    return () => {
      if (observer) observer.disconnect();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleWindowMouseMove);
      if (animIdRef.current) cancelAnimationFrame(animIdRef.current);
      buddyFacesRef.current.forEach((f) => {
        if (f.texture) f.texture.dispose();
        if (f.mesh && f.mesh.geometry) f.mesh.geometry.dispose();
        if (f.mesh && f.mesh.material) f.mesh.material.dispose();
      });
      buddyFacesRef.current = [];
      renderer.dispose();
    };
  }, [updateTextColliders]);

  // ═══════════════════════════════════════════════════════════════
  // 6. Direct User Interactions: Drag, Fling, & Click
  // ═══════════════════════════════════════════════════════════════

  const handlePointerDown = (e) => {
    unlockAudio();
    if (scrollStepRef.current < 3) {
      advanceStep();
      return;
    }

    const canvas = canvasRef.current;
    const camera = cameraRef.current;
    if (!canvas || !camera) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), camera);

    const allGroups = Object.values(buddyGroupsRef.current);
    const intersects = raycaster.intersectObjects(allGroups, true);

    if (intersects.length > 0) {
      let rootGroup = intersects[0].object;
      while (rootGroup.parent && rootGroup.userData.buddyIndex === undefined) {
        rootGroup = rootGroup.parent;
      }
      const idx = rootGroup.userData?.buddyIndex ?? 0;
      const b = buddyPhysicsRef.current[idx];

      engineRef.current.draggedIndex = idx;
      b.isDragging = true;
      b.isFreePhysics = true;
      b.idleTime = 0;
      b.vel = { vx: 0, vy: 0, vz: 0 };

      engineRef.current.dragStart = { x: e.clientX, y: e.clientY };
      engineRef.current.dragStartTime = performance.now();
      engineRef.current.pointerHistory = [{ x: e.clientX, y: e.clientY, t: performance.now() }];

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }
  };

  const handlePointerMove = (e) => {
    const idx = engineRef.current.draggedIndex;
    if (idx < 0) return;
    const canvas = canvasRef.current;
    const camera = cameraRef.current;
    const b = buddyPhysicsRef.current[idx];
    if (!b || !canvas || !camera) return;

    const rect = canvas.getBoundingClientRect();
    const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

    const vec = new THREE.Vector3(ndcX, ndcY, 0.5);
    vec.unproject(camera);
    vec.sub(camera.position).normalize();
    const distance = -camera.position.z / vec.z;
    const target3D = camera.position.clone().add(vec.multiplyScalar(distance));

    b.pos.x = target3D.x;
    b.pos.y = target3D.y;

    const now = performance.now();
    engineRef.current.pointerHistory.push({ x: target3D.x, y: target3D.y, t: now });
    if (engineRef.current.pointerHistory.length > 6) engineRef.current.pointerHistory.shift();
  };

  const handlePointerUp = (e) => {
    const idx = engineRef.current.draggedIndex;
    if (idx >= 0) {
      const b = buddyPhysicsRef.current[idx];
      if (b) {
        b.isDragging = false;
        b.idleTime = 0;

        const hist = engineRef.current.pointerHistory;
        const clickDuration = performance.now() - engineRef.current.dragStartTime;
        const dragDist = Math.hypot(e.clientX - engineRef.current.dragStart.x, e.clientY - engineRef.current.dragStart.y);

        if (clickDuration < 260 && dragDist < 8) {
          triggerSingleAvatarHop(idx);
        } else if (hist.length >= 2) {
          const first = hist[0];
          const last = hist[hist.length - 1];
          const dt = Math.max(12, last.t - first.t) / 1000;
          const throwScale = 0.012; // Natural, floaty toss scale

          b.vel.vx = THREE.MathUtils.clamp(((last.x - first.x) / dt) * throwScale, -0.15, 0.15);
          b.vel.vy = THREE.MathUtils.clamp(((last.y - first.y) / dt) * throwScale, -0.12, 0.16);
          b.isReturningHome = false;
          b.idleTime = 0;
        }
      }
      engineRef.current.draggedIndex = -1;
    }

    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
  };

  const handleLetterClick = (id) => {
    unlockAudio();
    if (scrollStepRef.current < 3) {
      advanceStep();
      return;
    }

    const col = engineRef.current.textColliders.find((c) => c.id === id);
    if (!col) return;

    const b = buddyPhysicsRef.current[0];
    b.isFreePhysics = true;
    b.idleTime = 0;

    const dx = col.center.x - b.pos.x;
    const dy = col.center.y - b.pos.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 0.1) {
      b.vel.vx = (dx / dist) * 0.28 + (Math.random() - 0.5) * 0.05;
      b.vel.vy = (dy / dist) * 0.28 + 0.10;
    }

    if (col.el) {
      col.el.classList.remove('letter-hit');
      void col.el.offsetWidth;
      col.el.classList.add('letter-hit');
    }
  };

  return (
    <section 
      className="zajno-hero-section" 
      ref={heroRef} 
      aria-label="Vedika 3D Space Hero"
      onClick={() => {
        if (scrollStepRef.current < 3 && !isAnimatingRef.current) advanceStep();
      }}
    >
      {/* ── Layer 1: Conic Gradient Halftone Flicker Animation Background ── */}
      <div className="el" />

      {/* ── Layer 1b: Shiny Luminous Bottom Horizon Aurora Sheen ── */}
      <div className="zajno-bg-bottom-shine" />

      {/* ── Layer 2: Interactive Cursor-Reactive Multi-Color Shiny Grid Canvas ── */}
      <canvas
        className="zajno-interactive-grid-canvas"
        ref={gridCanvasRef}
      />

      {/* 3D WebGL Physics Canvas */}
      <canvas
        className="zajno-webgl-canvas"
        ref={canvasRef}
        onPointerDown={handlePointerDown}
      />

      {/* Center 3D Interactive Typography */}
      <div className="zajno-container" ref={titleContainerRef}>
        <div className="zajno-title-block">
          <h1 className="zajno-title-h1">
            {/* Luminous Cosmic Energy Aura */}
            <div className="zajno-slit-glow-aura" ref={slitAuraRef} />

            {/* Deep Cosmic Void Slit Opening Between Words */}
            <div className="zajno-slit-void" ref={slitVoidRef} />

            {/* Doctor Strange Sling Ring Portal (Single fiery spark ring + black void) */}
            <DoctorStrangePortal ref={blackHoleRef} size={260} className="zajno-blackhole-portal" />

            {/* Row 1: VEDIKA */}
            <div className="zajno-title-row zajno-title-row-1" ref={row1Ref}>
              <div
                className="zajno-charts-cont"
                id="z-ve"
                onClick={(e) => { e.stopPropagation(); handleLetterClick('z-ve'); }}
                title="VE"
              >
                <span>VE</span>
              </div>
              <div
                className="zajno-charts-cont"
                id="z-di"
                onClick={(e) => { e.stopPropagation(); handleLetterClick('z-di'); }}
                title="DI"
              >
                <span>DI</span>
              </div>
              <div
                className="zajno-charts-cont"
                id="z-ka"
                onClick={(e) => { e.stopPropagation(); handleLetterClick('z-ka'); }}
                title="KA"
              >
                <span>KA</span>
              </div>
            </div>

            {/* Row 2: AI TUTOR */}
            <div className="zajno-title-row zajno-title-row-2" ref={row2Ref}>
              <div
                className="zajno-charts-cont"
                id="z-ai"
                onClick={(e) => { e.stopPropagation(); handleLetterClick('z-ai'); }}
                title="AI"
              >
                <span>AI</span>
              </div>
              <div
                className="zajno-charts-cont"
                id="z-tu"
                onClick={(e) => { e.stopPropagation(); handleLetterClick('z-tu'); }}
                title="TU"
              >
                <span>TU</span>
              </div>
              <div
                className="zajno-charts-cont"
                id="z-tor"
                onClick={(e) => { e.stopPropagation(); handleLetterClick('z-tor'); }}
                title="TOR"
              >
                <span>TOR</span>
              </div>
            </div>
          </h1>
        </div>
      </div>



      {/* Giant Smooth Curved Planet Horizon (No Glow Effect - Matte Dark Silhouette) */}
      <div 
        className={`zajno-planet-horizon-wrap ${isHiding ? 'hiding-active' : ''}`}
        onMouseEnter={() => { engineRef.current.isHoveringHorizon = true; }}
        onMouseLeave={() => { engineRef.current.isHoveringHorizon = false; }}
      >
        <div 
          className={`zajno-planet-horizon ${isHiding ? 'hiding-active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            if (scrollStepRef.current >= 3) {
              toggleHideBehindCurve();
            } else if (!isAnimatingRef.current) {
              advanceStep();
            }
          }}
          title={isHiding ? "Click to unhide avatars" : "Click to hide avatars behind curve"}
        >
        </div>
      </div>

      {/* ── Collapsible Playground Controls Dock (TOP RIGHT) ── */}
      <div 
        className={`zajno-playground-dock ${scrollStep >= 3 ? 'visible' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Main Collapsible Trigger Button */}
        <button
          type="button"
          className={`zajno-dock-trigger-btn ${isPlayDockOpen ? 'open' : ''} ${zeroGravity || magnetMode || isHiding ? 'has-active' : ''}`}
          onClick={() => setIsPlayDockOpen(!isPlayDockOpen)}
          title="Toggle interaction playground controls"
        >
          <div className="zajno-dock-trigger-left">
            <span className="zajno-trigger-pulse-dot" />
            <span className="zajno-trigger-text">🎮 Playground</span>
          </div>
          {(zeroGravity || magnetMode || isHiding) && (
            <span className="zajno-active-indicator-badge">
              {zeroGravity && 'Zero-G'}
              {magnetMode && 'Magnet'}
              {isHiding && 'Hiding'}
            </span>
          )}
          <ChevronDown size={14} className={`zajno-trigger-chevron ${isPlayDockOpen ? 'rotated' : ''}`} />
        </button>

        {/* Collapsible Action Buttons Tray */}
        <div className={`zajno-dock-tray ${isPlayDockOpen ? 'open' : ''}`}>
          {/* Wave Leap Button */}
          <button
            type="button"
            className="zajno-dock-btn"
            onClick={triggerWaveBounce}
            title="Trigger synchronized wave leap"
          >
            <Wand2 size={13} className="text-teal-400" />
            <span>Wave</span>
          </button>

          {/* Bounce Party Button */}
          <button
            type="button"
            className="zajno-dock-btn"
            onClick={triggerBounceParty}
            title="Trigger lively bounce dance party"
          >
            <Sparkles size={13} className="text-pink-400" />
            <span>Party</span>
          </button>

          {/* Spring Pop Button */}
          <button
            type="button"
            className="zajno-dock-btn"
            onClick={triggerSpringPop}
            title="Gather and spring launch into the sky"
          >
            <Rocket size={13} className="text-amber-400" />
            <span>Spring</span>
          </button>

          {/* Hide Behind Semi-Curve Button */}
          <button
            type="button"
            className={`zajno-dock-btn ${isHiding ? 'active' : ''}`}
            onClick={toggleHideBehindCurve}
            title="Hide avatars behind the glowing semi-curve horizon"
          >
            <span className="zajno-btn-emoji">🙈</span>
            <span>{isHiding ? 'Unhide' : 'Hide'}</span>
          </button>

          {/* Zero Gravity Button */}
          <button
            type="button"
            className={`zajno-dock-btn ${zeroGravity ? 'active' : ''}`}
            onClick={toggleZeroGravity}
            title="Toggle zero gravity floating"
          >
            <Rocket size={13} className="text-purple-400" />
            <span>Zero-G</span>
          </button>

          {/* Magnet Follow Button */}
          <button
            type="button"
            className={`zajno-dock-btn ${magnetMode ? 'active' : ''}`}
            onClick={toggleMagnetMode}
            title="Make avatars follow your cursor"
          >
            <Magnet size={13} className="text-sky-400" />
            <span>Magnet</span>
          </button>

          {/* Stardust Fireworks Button */}
          <button
            type="button"
            className="zajno-dock-btn"
            onClick={triggerStardustShower}
            title="Launch stardust fireworks"
          >
            <Sparkles size={13} className="text-amber-400" />
            <span>Sparkles</span>
          </button>

          {/* Reset Home Button */}
          <button
            type="button"
            className="zajno-dock-btn"
            onClick={resetSquad}
            title="Reset avatars to home resting spots"
          >
            <RotateCcw size={13} className="text-slate-300" />
            <span>Reset</span>
          </button>

          {/* Dimensional Portal Teleport: Chamber */}
          <button
            type="button"
            className="zajno-dock-btn portal-btn"
            onClick={() => triggerPortalNavigation(router, '/vedika-chamber', pathname)}
            title="Teleport squad to Vedika Chamber via 4 individual portals"
          >
            <span className="zajno-btn-emoji">🌌</span>
            <span>Chamber</span>
          </button>

          {/* Dimensional Portal Teleport: Vedika AI */}
          <button
            type="button"
            className="zajno-dock-btn portal-btn"
            onClick={() => triggerPortalNavigation(router, '/vedika-ai', pathname)}
            title="Teleport squad to Vedika AI Hub"
          >
            <span className="zajno-btn-emoji">🤖</span>
            <span>Vedika AI</span>
          </button>

          {/* Dimensional Portal Teleport: Labs */}
          <button
            type="button"
            className="zajno-dock-btn portal-btn"
            onClick={() => triggerPortalNavigation(router, '/vedika-labs', pathname)}
            title="Teleport squad to Vedika Labs via central portal"
          >
            <span className="zajno-btn-emoji">🧪</span>
            <span>Labs</span>
          </button>
        </div>
      </div>

      {/* Dynamic Comic Speech Bubble Overlay removed per user request */}

      {/* Real-time Interactive Color Tuner Widget */}
      <AvatarColorTuner />
    </section>
  );
}
