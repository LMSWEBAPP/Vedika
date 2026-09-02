'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import gsap from 'gsap';
import { ChevronDown, Sparkles } from 'lucide-react';
import './VedikaHeroZajno.css';

// Module-level cached GLTF geometry and textures
let cachedMasterGeometry = null;
const cachedTextures = {};

const BUDDIES = [
  { id: 'green', name: 'Emerald', texture: '/avatar_green.webp', color: '#2dd4bf', targetX: -3.15 },
  { id: 'blue',  name: 'Blue',    texture: '/avatar_blue.webp',  color: '#38bdf8', targetX: -1.05 },
  { id: 'pink',  name: 'Pink',    texture: '/avatar_pink.webp',  color: '#f472b6', targetX: 1.05 },
  { id: 'gold',  name: 'Gold',    texture: '/avatar_gold.webp',  color: '#facc15', targetX: 3.15 },
];

/**
 * Continuous Unbroken Squeeze-to-Pop Flight Flow:
 * 1. ZERO pauses or hitches: 1 continuous forward trajectory from depth to 3D apex
 * 2. Shape squashes organically while clearing the aperture, then bursts into full round sphere
 * 3. Stardust sparkles fire at the breakthrough moment
 * 4. Silky continuous parabolic flight arc & fluid floor bouncing
 */
export function playPopAnimation(buddy, options = {}) {
  const {
    direction = 'forward',
    origin = { x: 0, y: 0.72, z: -0.30 },
    destination = { x: buddy.targetX, y: -1.65, z: 0 },
    bounceIntensity = 1.0,
    baseScale = 0.72,
    startDelay = 0,
    tiltAngle = (Math.random() - 0.5) * 0.10,
    onPop = null,
    onComplete = null,
  } = options;

  const tl = gsap.timeline({ onComplete });

  // Initial state: nestled inside void slot at scale 0
  buddy.pos = { x: origin.x, y: origin.y, z: -0.30 };
  buddy.rot = { x: 0, y: 0, z: tiltAngle };
  buddy.scale = { x: 0, y: 0, z: 0 };
  buddy.isFreePhysics = false;

  // ═══════════════════════════════════════════════════════════════
  // 1. Unbroken Continuous 3D Trajectory (No stops or mid-way pauses!)
  // ═══════════════════════════════════════════════════════════════

  // Single forward Z push from depth to front camera apex
  tl.to(buddy.pos, {
    z: 2.3,
    duration: 0.68,
    ease: 'power2.out',
  }, startDelay);

  tl.to(buddy.pos, {
    z: destination.z || 0,
    duration: 0.85,
    ease: 'power1.inOut',
  }, startDelay + 0.68);

  // Horizontal X travel straight to destination
  tl.to(buddy.pos, {
    x: destination.x,
    duration: 1.45,
    ease: 'power1.out',
  }, startDelay + 0.12);

  // Parabolic Leap & Floor Drop in Y
  tl.to(buddy.pos, {
    y: 0.75 * bounceIntensity,
    duration: 0.50,
    ease: 'sine.out',
  }, startDelay + 0.18);

  tl.to(buddy.pos, {
    y: destination.y,
    duration: 0.40,
    ease: 'sine.in',
  }, startDelay + 0.68);

  // ═══════════════════════════════════════════════════════════════
  // 2. Continuous Organic Shape Evolution (Squeeze -> Pop -> Round)
  // ═══════════════════════════════════════════════════════════════

  // Step A: Emerges from 0 into squeezed oval while in the void slot
  tl.to(buddy.scale, {
    x: baseScale * 1.28,
    y: baseScale * 0.60,
    z: baseScale * 0.90,
    duration: 0.28,
    ease: 'power2.out',
  }, startDelay);

  // Step B: Clears the slot -> Pops open into full round sphere with soft elastic overshoot
  const popMoment = startDelay + 0.28;

  if (onPop) {
    tl.call(onPop, null, popMoment);
  }

  tl.to(buddy.rot, {
    z: 0,
    duration: 0.35,
    ease: 'power2.out',
  }, popMoment);

  tl.to(buddy.scale, {
    x: baseScale * 0.92,
    y: baseScale * 1.20,
    z: baseScale * 1.15,
    duration: 0.18,
    ease: 'back.out(2.2)',
  }, popMoment);

  tl.to(buddy.scale, {
    x: baseScale,
    y: baseScale,
    z: baseScale,
    duration: 0.26,
    ease: 'elastic.out(1.15, 0.48)',
  }, popMoment + 0.18);

  // ═══════════════════════════════════════════════════════════════
  // 3. Floor Impact Cushions & Harmonic Settle
  // ═══════════════════════════════════════════════════════════════

  // Floor impact 1 cushion
  tl.to(buddy.scale, {
    x: baseScale * 1.14,
    y: baseScale * 0.84,
    z: baseScale * 1.14,
    duration: 0.08,
    ease: 'power2.out',
  }, startDelay + 1.06);

  // Rebound Hop 2
  tl.to(buddy.pos, {
    y: -0.65 * bounceIntensity,
    duration: 0.28,
    ease: 'sine.out',
  }, startDelay + 1.08);

  tl.to(buddy.scale, {
    x: baseScale,
    y: baseScale,
    z: baseScale,
    duration: 0.22,
    ease: 'power1.out',
  }, startDelay + 1.14);

  // Drop to Final Resting Floor
  tl.to(buddy.pos, {
    y: destination.y,
    duration: 0.26,
    ease: 'sine.in',
  }, startDelay + 1.36);

  // Final landing settle
  tl.to(buddy.scale, {
    x: baseScale * 1.08,
    y: baseScale * 0.92,
    z: baseScale * 1.08,
    duration: 0.08,
    ease: 'power1.out',
  }, startDelay + 1.62);

  tl.to(buddy.scale, {
    x: baseScale,
    y: baseScale,
    z: baseScale,
    duration: 0.20,
    ease: 'elastic.out(1.2, 0.45)',
  }, startDelay + 1.70);

  return tl;
}

export default function VedikaHeroZajno() {
  const heroRef = useRef(null);
  const canvasRef = useRef(null);
  const titleContainerRef = useRef(null);
  const row1Ref = useRef(null);
  const row2Ref = useRef(null);
  const slitVoidRef = useRef(null);
  const slitAuraRef = useRef(null);

  // Discrete Steps:
  // 0: Initial load (words centered, void closed, avatars hidden)
  // 1: Scroll 1 -> Void opens + Emerald squeezes out & pops to home (-3.15, -1.65)
  // 2: Scroll 2 -> Blue & Pink squeeze out & pop to home (-1.05 & 1.05)
  // 3: Scroll 3 -> Gold squeezes out & pops to home (3.15) + words reunite & void closes
  const [scrollStep, setScrollStep] = useState(0);
  const scrollStepRef = useRef(0);
  const isAnimatingRef = useRef(false);

  // Three.js References
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const buddyGroupsRef = useRef({});
  const buddyMeshesRef = useRef([]);
  const shadowMeshesRef = useRef([]);
  const avatarLightRef = useRef(null);
  const animIdRef = useRef(null);

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
      idleTime: 0,
      lookMode: i % 2 === 0 ? 'cursor' : 'random',
      randomLookOffset: { x: 0, y: 0 },
      nextLookChange: 0,
    }))
  );

  // Global Engine State
  const engineRef = useRef({
    hasIntroduced: false,
    mouseNdc: { x: 0, y: 0 },
    isHoveringHorizon: false,
    baseScale: 0.72,
    radius: 0.65,
    textColliders: [],
    bounds: { minX: -7.2, maxX: 7.2, minY: -3.6, maxY: 3.8, minZ: -2.5, maxZ: 3.2 },
    draggedIndex: -1,
    dragStart: { x: 0, y: 0 },
    pointerHistory: [],
    particles: [],
  });

  // Stardust Particle Spark Burst Trigger (Synchronized to Breakthrough)
  const triggerStardustBurst = useCallback((x, y, z, colorHex) => {
    const scene = sceneRef.current;
    if (!scene) return;

    const count = 18;
    const color = new THREE.Color(colorHex);

    for (let i = 0; i < count; i++) {
      const pGeo = new THREE.SphereGeometry(0.045 + Math.random() * 0.035, 8, 8);
      const pMat = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.95,
      });
      const pMesh = new THREE.Mesh(pGeo, pMat);
      pMesh.position.set(x + (Math.random() - 0.5) * 0.35, y + (Math.random() - 0.5) * 0.25, z + 0.1);

      const speed = 0.04 + Math.random() * 0.06;
      const angle = Math.random() * Math.PI * 2;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed + 0.02;
      const vz = (Math.random() - 0.5) * speed * 1.5;

      scene.add(pMesh);
      engineRef.current.particles.push({
        mesh: pMesh,
        vx, vy, vz,
        life: 1.0,
        decay: 0.022 + Math.random() * 0.016,
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
  // 1. Exact Zajno Typography Intro Animation (Page Load)
  // ═══════════════════════════════════════════════════════════════
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
        delay: 0.25, // Small delay so user clearly sees the entrance on page load
        onComplete: () => {
          engineRef.current.hasIntroduced = true;
          updateTextColliders();
        }
      });

      // Zajno Staggered Staggering fromTo
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

  // ═══════════════════════════════════════════════════════════════
  // Discrete 1-Scroll Sequences with Continuous Flow Pop-Out
  // ═══════════════════════════════════════════════════════════════

  // SCROLL 1: Void opens + Emerald continuous squeeze-to-pop flight (-3.15, -1.65)
  const executeStep1 = useCallback(() => {
    if (scrollStepRef.current !== 0 || isAnimatingRef.current) return;
    isAnimatingRef.current = true;
    setScrollStep(1);

    const titleCont = titleContainerRef.current;
    const row1 = row1Ref.current;
    const row2 = row2Ref.current;
    const slitVoid = slitVoidRef.current;
    const slitAura = slitAuraRef.current;
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
    const partY1 = isMobile ? -18 : -24;
    const partY2 = isMobile ? 18 : 24;

    const mainTl = gsap.timeline({
      onComplete: () => {
        scrollStepRef.current = 1;
        isAnimatingRef.current = false;
      }
    });

    // 1. Part words, open soft blended void & cosmic energy aura
    mainTl.to(row1, { y: partY1, duration: 0.55, ease: 'power2.out' }, 0);
    mainTl.to(row2, { y: partY2, duration: 0.55, ease: 'power2.out' }, 0);
    mainTl.to(slitVoid, { scaleY: 1, opacity: 1, duration: 0.50, ease: 'power2.out' }, 0.05);
    mainTl.to(slitAura, { opacity: 0.85, scale: 1, duration: 0.60, ease: 'power2.out' }, 0.10);
    mainTl.to(titleCont, { y: -70, duration: 0.75, ease: 'power2.inOut' }, 0);

    // 2. Exact void slit world Y coordinate
    const voidY = getVoidSlitWorldY();

    // 3. Emerald: 1 continuous unbroken trajectory from depth to pop to landing!
    const b0 = buddyPhysicsRef.current[0];
    const emeraldTl = playPopAnimation(b0, {
      origin: { x: 0, y: voidY, z: -0.30 },
      destination: { x: b0.targetX, y: -1.65, z: 0 },
      baseScale: engineRef.current.baseScale,
      startDelay: 0.08,
      onPop: () => triggerStardustBurst(0, voidY, 0.45, BUDDIES[0].color),
    });
    mainTl.add(emeraldTl, 0);
  }, [getVoidSlitWorldY, triggerStardustBurst]);

  // SCROLL 2: Blue & Pink continuous squeeze-to-pop flight in dual arcs
  const executeStep2 = useCallback(() => {
    if (scrollStepRef.current !== 1 || isAnimatingRef.current) return;
    isAnimatingRef.current = true;
    setScrollStep(2);

    const b1 = buddyPhysicsRef.current[1]; // Blue
    const b2 = buddyPhysicsRef.current[2]; // Pink

    const mainTl = gsap.timeline({
      onComplete: () => {
        scrollStepRef.current = 2;
        isAnimatingRef.current = false;
      }
    });

    const voidY = getVoidSlitWorldY();

    const blueTl = playPopAnimation(b1, {
      origin: { x: -1.05, y: voidY, z: -0.30 },
      destination: { x: b1.targetX, y: -1.65, z: 0 },
      baseScale: engineRef.current.baseScale,
      startDelay: 0,
      tiltAngle: -0.06,
      onPop: () => triggerStardustBurst(-1.05, voidY, 0.45, BUDDIES[1].color),
    });

    const pinkTl = playPopAnimation(b2, {
      origin: { x: 1.05, y: voidY, z: -0.30 },
      destination: { x: b2.targetX, y: -1.65, z: 0 },
      baseScale: engineRef.current.baseScale,
      startDelay: 0.12,
      tiltAngle: 0.06,
      onPop: () => triggerStardustBurst(1.05, voidY, 0.45, BUDDIES[2].color),
    });

    mainTl.add(blueTl, 0);
    mainTl.add(pinkTl, 0);
  }, [getVoidSlitWorldY, triggerStardustBurst]);

  // SCROLL 3: Gold continuous squeeze-to-pop flight + words reunite & void closes
  const executeStep3 = useCallback(() => {
    if (scrollStepRef.current !== 2 || isAnimatingRef.current) return;
    isAnimatingRef.current = true;
    setScrollStep(3);

    const titleCont = titleContainerRef.current;
    const row1 = row1Ref.current;
    const row2 = row2Ref.current;
    const slitVoid = slitVoidRef.current;
    const slitAura = slitAuraRef.current;
    const b3 = buddyPhysicsRef.current[3]; // Gold

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

    const voidY = getVoidSlitWorldY();

    const goldTl = playPopAnimation(b3, {
      origin: { x: 1.8, y: voidY, z: -0.30 },
      destination: { x: b3.targetX, y: -1.65, z: 0 },
      baseScale: engineRef.current.baseScale,
      startDelay: 0,
      tiltAngle: 0.08,
      onPop: () => triggerStardustBurst(1.8, voidY, 0.45, BUDDIES[3].color),
    });
    mainTl.add(goldTl, 0);

    // Words smoothly reunite in the center & void dissolves after Gold clears slit
    mainTl.to(slitAura, { opacity: 0, scale: 0.7, duration: 0.35, ease: 'power2.in' }, 1.10);
    mainTl.to(slitVoid, { scaleY: 0, opacity: 0, duration: 0.40, ease: 'power2.in' }, 1.15);
    mainTl.to(titleCont, { y: -90, duration: 0.85, ease: 'power2.inOut' }, 1.20);
    mainTl.to(row1, { y: 0, duration: 0.55, ease: 'power2.inOut' }, 1.25);
    mainTl.to(row2, { y: 0, duration: 0.55, ease: 'power2.inOut' }, 1.25);
  }, [getVoidSlitWorldY, triggerStardustBurst, updateTextColliders]);

  // Universal Step Advancer
  const advanceStep = useCallback(() => {
    if (isAnimatingRef.current) return;
    const current = scrollStepRef.current;
    if (current === 0) executeStep1();
    else if (current === 1) executeStep2();
    else if (current === 2) executeStep3();
  }, [executeStep1, executeStep2, executeStep3]);

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
    renderer.toneMappingExposure = 1.25;
    if ('outputColorSpace' in renderer) {
      renderer.outputColorSpace = THREE.SRGBColorSpace;
    }
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.45);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
    keyLight.position.set(4, 7, 8);
    scene.add(keyLight);

    const topRimLight = new THREE.DirectionalLight(0x2dd4bf, 1.3);
    topRimLight.position.set(0, 8, 2);
    scene.add(topRimLight);

    const fillLight = new THREE.DirectionalLight(0xa855f7, 1.1);
    fillLight.position.set(-6, -3, 6);
    scene.add(fillLight);

    const avatarLight = new THREE.PointLight(0x2dd4bf, 2.4, 6.5, 1.8);
    scene.add(avatarLight);
    avatarLightRef.current = avatarLight;

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
      if (!cachedTextures[b.id]) {
        const tex = textureLoader.load(b.texture);
        tex.flipY = false;
        tex.colorSpace = THREE.SRGBColorSpace;
        cachedTextures[b.id] = tex;
      }
    });

    // ── Instant 3D Squad Initialization ──
    const initialGeo = cachedMasterGeometry || new THREE.SphereGeometry(0.74, 32, 32);
    const meshes = [];

    BUDDIES.forEach((buddy, idx) => {
      const tex = cachedTextures[buddy.id] || cachedTextures.green;
      const mat = new THREE.MeshStandardMaterial({
        map: tex,
        color: 0xffffff,
        roughness: 0.45,
        metalness: 0.08,
      });

      const mesh = new THREE.Mesh(initialGeo, mat);
      mesh.frustumCulled = false;
      meshes.push(mesh);

      const group = new THREE.Group();
      group.add(mesh);
      group.position.set(buddy.targetX, -1.65, 0);
      group.scale.set(0, 0, 0); // Initially hidden on load
      group.userData = { buddyIndex: idx, buddyId: buddy.id };

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
        engineRef.current.mouseNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        engineRef.current.mouseNdc.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
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

      // ── Animate Dynamic Stardust Sparkles ──
      if (engine.particles.length > 0) {
        for (let i = engine.particles.length - 1; i >= 0; i--) {
          const p = engine.particles[i];
          p.mesh.position.x += p.vx;
          p.mesh.position.y += p.vy;
          p.mesh.position.z += p.vz;
          p.vy -= 0.0008; // subtle gravity
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

        // ── Dragging & Interactive Physics Mode ──
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

        if (b.isFreePhysics) {
          b.idleTime += 0.016;

          // Gravity & Air Drag
          b.vel.vy -= 0.013;
          b.vel.vx *= 0.992;
          b.vel.vy *= 0.994;
          b.vel.vz *= 0.992;

          b.pos.x += b.vel.vx;
          b.pos.y += b.vel.vy;
          b.pos.z += b.vel.vz;

          // Floor Bouncing (Fluid Restitution)
          if (b.pos.y <= -1.65) {
            b.pos.y = -1.65;
            b.vel.vy = Math.abs(b.vel.vy) * 0.74;
            b.vel.vx *= 0.88;
          }

          // Screen Bounding Walls
          const bounds = engine.bounds;
          const r = engine.radius;
          if (b.pos.x - r < bounds.minX) {
            b.pos.x = bounds.minX + r;
            b.vel.vx = Math.abs(b.vel.vx) * 0.78;
          }
          if (b.pos.x + r > bounds.maxX) {
            b.pos.x = bounds.maxX - r;
            b.vel.vx = -Math.abs(b.vel.vx) * 0.78;
          }

          // Text Colliders
          if (engine.textColliders.length > 0) {
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
                  b.vel.vx -= 1.82 * dot * nx;
                  b.vel.vy -= 1.82 * dot * ny;

                  if (col.el) {
                    col.el.classList.remove('letter-hit');
                    void col.el.offsetWidth;
                    col.el.classList.add('letter-hit');
                  }
                }
              }
            });
          }

          // Smooth Return-to-Home Physics
          const speed = Math.hypot(b.vel.vx, b.vel.vy, b.vel.vz);
          if (b.idleTime > 1.2 || speed < 0.04) {
            const dx = b.targetX - b.pos.x;
            const dy = b.targetY - b.pos.y;
            const dz = 0 - b.pos.z;

            b.pos.x += dx * 0.075;
            b.pos.y += dy * 0.075;
            b.pos.z += dz * 0.075;

            b.vel.vx *= 0.85;
            b.vel.vy *= 0.85;
            b.vel.vz *= 0.85;

            if (Math.hypot(dx, dy, dz) < 0.04 && speed < 0.03) {
              b.isFreePhysics = false;
              b.pos.x = b.targetX;
              b.pos.y = b.targetY;
              b.pos.z = 0;
              b.vel = { vx: 0, vy: 0, vz: 0 };
            }
          }

          group.position.set(b.pos.x, b.pos.y, b.pos.z);
          group.scale.set(base, base, base);
          group.rotation.set(0, 0, 0);

          if (shadow) {
            const h = Math.max(0, b.pos.y - (-1.65));
            shadow.position.x = b.pos.x;
            shadow.position.z = b.pos.z;
            shadow.scale.set(Math.max(0.2, 1.2 - h * 0.3), Math.max(0.2, 1.2 - h * 0.3), 1);
            shadow.material.opacity = Math.max(0.08, 0.60 - h * 0.20);
          }
          return;
        }

        // ── Settled Resting Mode (Fully Visible with Independent Gaze) ──
        if (b.scale.x > 0.01) {
          let restY = b.targetY;
          if (engine.isHoveringHorizon) {
            restY += 0.24;
          } else {
            restY += Math.sin(time * 2.2 + idx * 0.8) * 0.03;
          }

          // Lerp position toward resting spot
          if (!isAnimatingRef.current) {
            b.pos.x += (b.targetX - b.pos.x) * 0.12;
            b.pos.y += (restY - b.pos.y) * 0.12;
            b.pos.z += (0 - b.pos.z) * 0.12;
          }

          group.position.set(b.pos.x, b.pos.y, b.pos.z);
          group.scale.set(b.scale.x, b.scale.y, b.scale.z);

          // ── Independent Gaze: Cursor Following vs Autonomous Random Looking ──
          if (b.lookMode === 'cursor') {
            const mouseX = engine.mouseNdc ? engine.mouseNdc.x : 0;
            const mouseY = engine.mouseNdc ? engine.mouseNdc.y : 0;
            group.rotation.x = THREE.MathUtils.clamp(-mouseY * 0.22, -0.25, 0.25);
            group.rotation.y = THREE.MathUtils.clamp(mouseX * 0.32, -0.40, 0.40);
            group.rotation.z = b.rot ? b.rot.z : 0;
          } else {
            if (time > b.nextLookChange) {
              b.randomLookOffset = {
                x: (Math.random() - 0.5) * 0.45,
                y: (Math.random() - 0.5) * 0.30,
              };
              b.nextLookChange = time + 2.5 + Math.random() * 2.0;
            }
            group.rotation.x += (b.randomLookOffset.y - group.rotation.x) * 0.05;
            group.rotation.y += (b.randomLookOffset.x - group.rotation.y) * 0.05;
            group.rotation.z = b.rot ? b.rot.z : 0;
          }

          // Shadow tracking
          if (shadow) {
            const h = Math.max(0, b.pos.y - (-1.65));
            shadow.position.x = b.pos.x;
            shadow.position.z = b.pos.z;
            shadow.scale.set(Math.max(0.2, 1.2 - h * 0.3), Math.max(0.2, 1.2 - h * 0.3), 1);
            shadow.material.opacity = Math.max(0.08, 0.55 - h * 0.20);
          }
        } else {
          group.position.set(b.pos.x, b.pos.y, b.pos.z);
          group.scale.set(b.scale.x, b.scale.y, b.scale.z);
          if (shadow) shadow.material.opacity = 0;
        }
      });

      if (avatarLightRef.current && buddies[0]) {
        avatarLightRef.current.position.set(buddies[0].pos.x, buddies[0].pos.y + 0.2, buddies[0].pos.z + 1.2);
      }

      renderer.render(scene, camera);
      animIdRef.current = requestAnimationFrame(physicsLoop);
    };

    animIdRef.current = requestAnimationFrame(physicsLoop);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleWindowMouseMove);
      if (animIdRef.current) cancelAnimationFrame(animIdRef.current);
      renderer.dispose();
    };
  }, [updateTextColliders]);

  // ═══════════════════════════════════════════════════════════════
  // 6. Direct User Interactions: Drag, Fling, & Click
  // ═══════════════════════════════════════════════════════════════

  const handlePointerDown = (e) => {
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
        if (hist.length >= 2) {
          const first = hist[0];
          const last = hist[hist.length - 1];
          const dt = Math.max(10, last.t - first.t) / 1000;
          const throwScale = 0.038;

          b.vel.vx = THREE.MathUtils.clamp(((last.x - first.x) / dt) * throwScale, -0.42, 0.42);
          b.vel.vy = THREE.MathUtils.clamp(((last.y - first.y) / dt) * throwScale, -0.42, 0.42);
        }
      }
      engineRef.current.draggedIndex = -1;
    }

    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
  };

  // Letter Click: advances intro or launches buddy at that letter
  const handleLetterClick = (id) => {
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
      {/* Background Ambience & Cosmic Grid */}
      <div className="zajno-bg-ambient" />
      <div className="zajno-grid-lines" />

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

      {/* Giant Smooth Curved Planet Horizon */}
      <div 
        className="zajno-planet-horizon-wrap"
        onMouseEnter={() => { engineRef.current.isHoveringHorizon = true; }}
        onMouseLeave={() => { engineRef.current.isHoveringHorizon = false; }}
      >
        <div 
          className="zajno-planet-horizon"
          onClick={(e) => {
            e.stopPropagation();
            if (!isAnimatingRef.current) advanceStep();
          }}
          title="Planet Horizon"
        />
      </div>

      {/* Interactive Step Guide Button / Hint */}
      <div 
        className={`zajno-scroll-hint ${scrollStep >= 3 ? 'hidden' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          if (!isAnimatingRef.current) advanceStep();
        }}
        title="Click or Scroll to release avatars"
      >
        <Sparkles size={14} className="text-teal-400 animate-pulse" />
        <span>
          {scrollStep === 0 && <>Scroll down or <strong>Click to release Emerald</strong></>}
          {scrollStep === 1 && <>Scroll to release <strong>Blue & Pink</strong></>}
          {scrollStep === 2 && <>Scroll to release <strong>Gold</strong></>}
        </span>
        <ChevronDown size={14} className="animate-bounce text-teal-400" />
      </div>
    </section>
  );
}
