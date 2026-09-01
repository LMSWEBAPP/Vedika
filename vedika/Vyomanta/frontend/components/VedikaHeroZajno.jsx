'use client';

import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import gsap from 'gsap';
import './VedikaHeroZajno.css';

// Module-level cached geometry for instant reloading & zero lag
let cachedMasterGeometry = null;

export default function VedikaHeroZajno() {
  const router = useRouter();
  const heroRef = useRef(null);
  const canvasRef = useRef(null);
  const row1Ref = useRef(null);
  const row2Ref = useRef(null);

  // Three.js References
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const avatarGroupRef = useRef(null);
  const animIdRef = useRef(null);

  // Smooth interaction & physics state
  const stateRef = useRef({
    targetProgress: 0,
    currentProgress: 0,
    isSettled: false,
    hasIntroduced: false,
    mouse: { x: 0, y: 0, targetX: 0, targetY: 0 },
  });

  // 1. Initial Text Reveal Animation on Page Load ("VEDIKA AI TUTOR")
  useEffect(() => {
    const ctx = gsap.context(() => {
      const ve = '#z-ve span';
      const di = '#z-di span';
      const ka = '#z-ka span';
      const ai = '#z-ai span';
      const tu = '#z-tu span';
      const tor = '#z-tor span';

      const entryTl = gsap.timeline({
        defaults: { duration: 1.4, ease: 'power3.out' },
        onComplete: () => {
          stateRef.current.hasIntroduced = true;
        }
      });

      gsap.set([ve, di, ka, ai, tu, tor], { opacity: 0.1 });
      gsap.set(ve, { x: '180%' });
      gsap.set(di, { x: '-160%' });
      gsap.set(ka, { x: '170%' });
      gsap.set(ai, { x: '-190%' });
      gsap.set(tu, { x: '180%' });
      gsap.set(tor, { x: '-170%' });

      entryTl
        .to(ve, { x: '0%', opacity: 1, duration: 1.45, ease: 'power3.out' }, 0.05)
        .to(ai, { x: '0%', opacity: 1, duration: 1.45, ease: 'power3.out' }, 0.18)
        .to(di, { x: '0%', opacity: 1, duration: 1.45, ease: 'power3.out' }, 0.28)
        .to(tu, { x: '0%', opacity: 1, duration: 1.45, ease: 'power3.out' }, 0.38)
        .to(ka, { x: '0%', opacity: 1, duration: 1.45, ease: 'power3.out' }, 0.48)
        .to(tor, { x: '0%', opacity: 1, duration: 1.45, ease: 'power3.out' }, 0.58);
    }, heroRef);

    return () => ctx.revert();
  }, []);

  // 2. High-Performance Three.js 3D WebGL Avatar Engine (Single Avatar)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = canvas.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 1920);
    const height = canvas.clientHeight || (typeof window !== 'undefined' ? window.innerHeight : 1080);
    const pixelRatio = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 1.5);

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(30, width / height, 0.1, 100);
    camera.position.set(0, 0.1, 13.5);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // WebGL Renderer
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
    renderer.toneMappingExposure = 1.15;
    if ('outputColorSpace' in renderer) {
      renderer.outputColorSpace = THREE.SRGBColorSpace;
    }
    rendererRef.current = renderer;

    // Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.35);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
    keyLight.position.set(3, 6, 7);
    scene.add(keyLight);

    const topRimLight = new THREE.DirectionalLight(0xffffff, 1.1);
    topRimLight.position.set(0, 8, 2);
    scene.add(topRimLight);

    const fillLight = new THREE.DirectionalLight(0x818cf8, 0.9);
    fillLight.position.set(-4, -2, 5);
    scene.add(fillLight);

    // Load Single Avatar (Ask Vedika - Teal #29756e)
    const textureLoader = new THREE.TextureLoader();
    const avatarTexture = textureLoader.load('/avatar_green.webp');
    avatarTexture.flipY = false;
    avatarTexture.colorSpace = THREE.SRGBColorSpace;

    const setupSingleAvatar = (geo) => {
      const mat = new THREE.MeshStandardMaterial({
        map: avatarTexture,
        color: 0xffffff,
        roughness: 0.50,
        metalness: 0.06,
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.frustumCulled = false;

      const group = new THREE.Group();
      group.add(mesh);
      group.position.set(0, 0, 0);
      group.scale.setScalar(0);
      group.userData = { route: '/vedika-ai/ask' };

      scene.add(group);
      avatarGroupRef.current = group;
    };

    if (cachedMasterGeometry) {
      setupSingleAvatar(cachedMasterGeometry);
    } else {
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
            const normScale = 1.45 / (maxDim > 0 ? maxDim : 1);
            extractedGeo.scale(normScale, normScale, normScale);

            cachedMasterGeometry = extractedGeo;
            setupSingleAvatar(extractedGeo);
          }
        },
        undefined,
        (err) => console.warn('GLB load error:', err)
      );
    }

    // Resize Handler
    const handleResize = () => {
      if (!canvas || !renderer || !camera) return;
      const w = canvas.clientWidth || window.innerWidth;
      const h = canvas.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    window.addEventListener('resize', handleResize);

    // Mouse Move Tracker
    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      stateRef.current.mouse.targetX = x;
      stateRef.current.mouse.targetY = y;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Animation Loop
    let time = 0;
    const renderLoop = () => {
      time += 0.02;

      // Mouse smoothing
      const m = stateRef.current.mouse;
      m.x += (m.targetX - m.x) * 0.08;
      m.y += (m.targetY - m.y) * 0.08;

      // Progress smoothing (continuous proportional spring)
      const state = stateRef.current;
      state.currentProgress += (state.targetProgress - state.currentProgress) * 0.10;
      const p = Math.max(0, Math.min(1, state.currentProgress));

      state.isSettled = (state.targetProgress === 1.0 && p > 0.96) || (state.targetProgress === 0.0 && p < 0.04);

      const isMobile = window.innerWidth <= 768;

      // Part Typography: "VEDIKA" moves slightly up, "AI TUTOR" moves slightly down
      if (row1Ref.current) {
        const yOffset1 = -p * (isMobile ? 35 : 55);
        row1Ref.current.style.transform = `translate3d(0, ${yOffset1}px, 0)`;
      }

      if (row2Ref.current) {
        const yOffset2 = p * (isMobile ? 15 : 25);
        row2Ref.current.style.transform = `translate3d(0, ${yOffset2}px, 0)`;
      }

      // Animate Single 3D Avatar Emerging from Center (0, 0, 0), Sliding Down & Bouncing
      const group = avatarGroupRef.current;
      if (group) {
        const targetSettledY = -2.05;

        if (p <= 0.001) {
          group.position.set(0, 0, 0);
          group.scale.set(0, 0, 0);
        } else if (p < 0.70) {
          // Slide smoothly down from (0,0,0) towards bottom with slight forward 3D depth
          const t = p / 0.70;
          const arc = Math.sin(t * Math.PI) * 0.6;
          const curY = THREE.MathUtils.lerp(0, targetSettledY, t) + arc;
          const curZ = Math.sin(t * Math.PI) * 1.2;

          // Stretch along downward flight path
          const stretch = Math.sin(t * Math.PI) * 0.22;
          const baseScale = Math.min(1.0, t * 1.8) * 0.95;

          group.position.set(0, curY, curZ);
          group.scale.set(
            baseScale * (1.0 - stretch * 0.5),
            baseScale * (1.0 + stretch),
            baseScale * (1.0 - stretch * 0.5)
          );

          group.rotation.x = Math.sin(t * Math.PI) * 0.25 - m.y * 0.15;
          group.rotation.y = m.x * 0.25;
          group.rotation.z = -Math.sin(t * Math.PI) * 0.15;
        } else {
          // Cartoon landing impact bounce & settle
          const t = (p - 0.70) / 0.30;
          const bounce = Math.sin(t * Math.PI * 2.6) * Math.exp(-t * 3.6) * 0.75;
          const squash = Math.sin(t * Math.PI * 2.6) * Math.exp(-t * 3.6) * 0.40;

          let finalY = targetSettledY + Math.max(0, bounce);
          if (p >= 0.98) {
            finalY += Math.sin(time * 2.2) * 0.04;
          }

          group.position.set(0, finalY, 0);
          group.scale.set(
            0.95 * (1.0 + squash * 0.6),
            0.95 * (1.0 - squash),
            0.95 * (1.0 + squash * 0.6)
          );

          group.rotation.x = -m.y * 0.15;
          group.rotation.y = m.x * 0.25 + Math.sin(time * 1.5) * 0.04;
          group.rotation.z = -Math.sin(t * Math.PI * 2) * Math.exp(-t * 4) * 0.15;
        }
      }

      renderer.render(scene, camera);
      animIdRef.current = requestAnimationFrame(renderLoop);
    };

    animIdRef.current = requestAnimationFrame(renderLoop);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      if (animIdRef.current) cancelAnimationFrame(animIdRef.current);
      renderer.dispose();
    };
  }, []);

  // 3. Step-by-Step Continuous Smooth Wheel & Touch Scrubbing
  useEffect(() => {
    const heroEl = heroRef.current;
    if (!heroEl) return;

    const handleWheel = (e) => {
      if (window.scrollY <= 8) {
        const scrollSensitivity = 0.0016;
        const scrollDelta = e.deltaY * scrollSensitivity;
        const nextProgress = Math.max(0, Math.min(1.0, stateRef.current.targetProgress + scrollDelta));

        if (scrollDelta > 0) {
          if (stateRef.current.currentProgress < 0.97) {
            e.preventDefault();
            stateRef.current.targetProgress = nextProgress;
          }
        } else if (scrollDelta < 0) {
          if (stateRef.current.targetProgress > 0.01) {
            e.preventDefault();
            stateRef.current.targetProgress = nextProgress;
          }
        }
      }
    };

    let lastTouchY = 0;
    const handleTouchStart = (e) => {
      lastTouchY = e.touches[0].clientY;
    };

    const handleTouchMove = (e) => {
      if (window.scrollY <= 8) {
        const delta = lastTouchY - e.touches[0].clientY;
        lastTouchY = e.touches[0].clientY;
        const scrollDelta = delta * 0.0035;
        const nextProgress = Math.max(0, Math.min(1.0, stateRef.current.targetProgress + scrollDelta));

        if (scrollDelta > 0 && stateRef.current.currentProgress < 0.97) {
          if (e.cancelable) e.preventDefault();
          stateRef.current.targetProgress = nextProgress;
        } else if (scrollDelta < 0 && stateRef.current.targetProgress > 0.01) {
          if (e.cancelable) e.preventDefault();
          stateRef.current.targetProgress = nextProgress;
        }
      }
    };

    heroEl.addEventListener('wheel', handleWheel, { passive: false });
    heroEl.addEventListener('touchstart', handleTouchStart, { passive: true });
    heroEl.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      heroEl.removeEventListener('wheel', handleWheel);
      heroEl.removeEventListener('touchstart', handleTouchStart);
      heroEl.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  // 4. Click to toggle or navigate
  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas || !cameraRef.current || !avatarGroupRef.current) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);

    const intersects = raycaster.intersectObject(avatarGroupRef.current, true);
    if (intersects.length > 0) {
      router.push('/vedika-ai/ask');
    } else {
      const next = stateRef.current.targetProgress > 0.5 ? 0.0 : 1.0;
      stateRef.current.targetProgress = next;
    }
  };

  return (
    <section className="zajno-hero-section" ref={heroRef} aria-label="Hero">
      {/* 3D WebGL Canvas */}
      <canvas
        className="zajno-webgl-canvas"
        ref={canvasRef}
        onClick={handleCanvasClick}
      />

      <div className="zajno-container">
        <div className="zajno-title-block">
          <h1 className="zajno-title-h1">
            {/* Row 1: VEDIKA */}
            <div className="zajno-title-row zajno-title-row-1" ref={row1Ref}>
              <div className="zajno-charts-cont" id="z-ve"><span>VE</span></div>
              <div className="zajno-charts-cont" id="z-di"><span>DI</span></div>
              <div className="zajno-charts-cont" id="z-ka"><span>KA</span></div>
            </div>

            {/* Row 2: AI TUTOR */}
            <div className="zajno-title-row zajno-title-row-2" ref={row2Ref}>
              <div className="zajno-charts-cont" id="z-ai"><span>AI</span></div>
              <div className="zajno-charts-cont" id="z-tu"><span>TU</span></div>
              <div className="zajno-charts-cont" id="z-tor"><span>TOR</span></div>
            </div>
          </h1>
        </div>
      </div>
    </section>
  );
}
