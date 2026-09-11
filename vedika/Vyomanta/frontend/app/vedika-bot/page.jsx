'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import gsap from 'gsap';
import {
  ChevronLeft, Play, Pause, RotateCcw, Sparkles, Eye,
  Layers, Compass, Info, Smile, Zap, Activity, ShieldAlert
} from 'lucide-react';
import './vedika-bot.css';

export default function VedikaBotPage() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  // Model & Three.js Refs
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const modelGroupRef = useRef(null);
  const modelMeshRef = useRef(null);
  const shadowMeshRef = useRef(null);
  const animIdRef = useRef(null);
  const particlesRef = useRef([]);

  // Animation & Studio State
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [activeAnim, setActiveAnim] = useState('skeletal_dualarmwave');
  const [isPlaying, setIsPlaying] = useState(true);
  const [animSpeed, setAnimSpeed] = useState(1.0);
  const [wireframe, setWireframe] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [mouseNdc, setMouseNdc] = useState({ x: 0, y: 0 });

  const activeAnimRef = useRef('skeletal_dualarmwave');
  const isPlayingRef = useRef(true);
  const animSpeedRef = useRef(1.0);
  const mouseNdcRef = useRef({ x: 0, y: 0 });
  const baseScaleRef = useRef(1.0);
  const isReactingRef = useRef(false);
  const mixerRef = useRef(null);
  const actionsRef = useRef({});
  const skeletonHelperRef = useRef(null);
  const clockRef = useRef(new THREE.Clock());

  useEffect(() => {
    activeAnimRef.current = activeAnim;
    if (mixerRef.current && actionsRef.current) {
      // If a skeletal animation is selected, crossfade to it
      if (activeAnim.startsWith('skeletal_')) {
        const clipName = activeAnim.replace('skeletal_', '');
        Object.keys(actionsRef.current).forEach((name) => {
          const action = actionsRef.current[name];
          if (name.toLowerCase() === clipName.toLowerCase()) {
            action.reset().fadeIn(0.25).play();
          } else {
            action.fadeOut(0.25);
          }
        });
      } else {
        // Stop skeletal actions when procedural mode is picked
        Object.values(actionsRef.current).forEach((action) => action.fadeOut(0.25));
      }
    }
  }, [activeAnim]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
    if (mixerRef.current) {
      mixerRef.current.timeScale = isPlaying ? animSpeedRef.current : 0;
    }
  }, [isPlaying]);

  useEffect(() => {
    animSpeedRef.current = animSpeed;
    if (mixerRef.current && isPlayingRef.current) {
      mixerRef.current.timeScale = animSpeed;
    }
  }, [animSpeed]);

  useEffect(() => {
    if (skeletonHelperRef.current) {
      skeletonHelperRef.current.visible = showSkeleton;
    }
  }, [showSkeleton]);

  // Stardust Particle Spark Burst
  const triggerParticles = useCallback((x, y, z, count = 18) => {
    const scene = sceneRef.current;
    if (!scene) return;

    for (let i = 0; i < count; i++) {
      const pGeo = new THREE.SphereGeometry(0.045 + Math.random() * 0.035, 8, 8);
      const color = new THREE.Color(
        Math.random() > 0.5 ? 0x2dd4bf : (Math.random() > 0.5 ? 0xbf55f7 : 0x38bdf8)
      );
      const pMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.95,
      });
      const pMesh = new THREE.Mesh(pGeo, pMat);
      pMesh.position.set(
        x + (Math.random() - 0.5) * 0.4,
        y + (Math.random() - 0.5) * 0.3,
        z + (Math.random() - 0.5) * 0.4
      );

      const speed = 0.035 + Math.random() * 0.06;
      const angle = Math.random() * Math.PI * 2;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed + 0.02;
      const vz = (Math.random() - 0.5) * speed * 1.5;

      scene.add(pMesh);
      particlesRef.current.push({
        mesh: pMesh,
        vx, vy, vz,
        life: 1.0,
        decay: 0.025 + Math.random() * 0.015,
      });
    }
  }, []);

  // Poke / Interactive Click Reaction
  const handleBotPoke = useCallback(() => {
    if (isReactingRef.current || !modelGroupRef.current) return;
    isReactingRef.current = true;

    const group = modelGroupRef.current;
    const base = baseScaleRef.current;

    triggerParticles(group.position.x, group.position.y + 0.5, group.position.z, 22);

    const tl = gsap.timeline({
      onComplete: () => {
        isReactingRef.current = false;
      }
    });

    // Squash & Spring Hop
    tl.to(group.scale, {
      x: base * 1.25,
      y: base * 0.72,
      z: base * 1.25,
      duration: 0.12,
      ease: 'power2.out',
    });

    tl.to(group.position, {
      y: group.position.y + 0.85,
      duration: 0.30,
      ease: 'power2.out',
    }, 0.12);

    tl.to(group.scale, {
      x: base * 0.90,
      y: base * 1.18,
      z: base * 0.90,
      duration: 0.20,
      ease: 'power1.out',
    }, 0.12);

    tl.to(group.rotation, {
      y: group.rotation.y + Math.PI * 2,
      duration: 0.55,
      ease: 'power1.inOut',
    }, 0.12);

    tl.to(group.position, {
      y: 0,
      duration: 0.28,
      ease: 'sine.in',
    }, 0.42);

    tl.to(group.scale, {
      x: base * 1.14,
      y: base * 0.86,
      z: base * 1.14,
      duration: 0.08,
      ease: 'power2.out',
    }, 0.70);

    tl.to(group.scale, {
      x: base,
      y: base,
      z: base,
      duration: 0.25,
      ease: 'elastic.out(1.2, 0.45)',
    }, 0.78);
  }, [triggerParticles]);

  // Reset Camera View
  const handleResetCamera = useCallback(() => {
    if (!cameraRef.current || !controlsRef.current) return;
    gsap.to(cameraRef.current.position, {
      x: 0,
      y: 0.4,
      z: 3.8,
      duration: 0.6,
      ease: 'power2.out',
      onUpdate: () => controlsRef.current.update(),
    });
    controlsRef.current.target.set(0, 0, 0);
  }, []);

  // Three.js Scene Setup & Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = containerRef.current;
    if (!canvas || !stage) return;

    const width = stage.clientWidth || window.innerWidth;
    const height = stage.clientHeight || 600;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 0.4, 3.8);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    if ('outputColorSpace' in renderer) {
      renderer.outputColorSpace = THREE.SRGBColorSpace;
    }
    rendererRef.current = renderer;

    // 4. OrbitControls
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 1.5;
    controls.maxDistance = 8.0;
    controls.maxPolarAngle = Math.PI / 2 + 0.15;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(4, 6, 5);
    scene.add(keyLight);

    const cyanRimLight = new THREE.DirectionalLight(0x2dd4bf, 2.0);
    cyanRimLight.position.set(-4, 5, -3);
    scene.add(cyanRimLight);

    const purpleFillLight = new THREE.DirectionalLight(0xbf55f7, 1.4);
    purpleFillLight.position.set(4, -3, 3);
    scene.add(purpleFillLight);

    // 6. Ground Shadow Plane
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 256;
    shadowCanvas.height = 256;
    const sCtx = shadowCanvas.getContext('2d');
    const grad = sCtx.createRadialGradient(128, 128, 10, 128, 128, 120);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.75)');
    grad.addColorStop(0.45, 'rgba(0, 0, 0, 0.35)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    sCtx.fillStyle = grad;
    sCtx.fillRect(0, 0, 256, 256);

    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowGeo = new THREE.PlaneGeometry(2.6, 2.6);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.set(0, -1.02, 0);
    scene.add(shadowMesh);
    shadowMeshRef.current = shadowMesh;

    // 7. Ground Grid Helper (Cyber Matrix Style)
    const gridHelper = new THREE.GridHelper(8, 20, 0x2dd4bf, 0x1e293b);
    gridHelper.position.set(0, -1.03, 0);
    gridHelper.material.opacity = 0.25;
    gridHelper.material.transparent = true;
    scene.add(gridHelper);

    // 8. Load model_rigged.glb
    const gltfLoader = new GLTFLoader();
    gltfLoader.load(
      '/3d-assets/model_rigged.glb',
      (gltf) => {
        const root = gltf.scene;
        
        // Compute bounding box and normalize scale & center
        const box = new THREE.Box3().setFromObject(root);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        // Center root pivot
        root.position.sub(center);

        // Normalize model to fit nicely in studio view
        const maxDim = Math.max(size.x, size.y, size.z);
        const desiredHeight = 1.85;
        const scaleFactor = desiredHeight / (maxDim || 1);
        root.scale.setScalar(scaleFactor);
        baseScaleRef.current = scaleFactor;

        // Traverse meshes to find SkinnedMesh
        let skinnedMesh = null;
        root.traverse((child) => {
          if (child.isMesh) {
            modelMeshRef.current = child;
            if (child.isSkinnedMesh) {
              skinnedMesh = child;
            }
            if (child.material) {
              child.material.side = THREE.DoubleSide;
              child.material.needsUpdate = true;
            }
          }
        });

        // Add 3D Skeleton Helper to visualize the bone armature
        if (skinnedMesh || root) {
          const helperTarget = skinnedMesh || root;
          const skeletonHelper = new THREE.SkeletonHelper(helperTarget);
          skeletonHelper.material.linewidth = 2;
          skeletonHelper.material.color.set(0x2dd4bf);
          skeletonHelper.visible = true;
          scene.add(skeletonHelper);
          skeletonHelperRef.current = skeletonHelper;
        }

        // Initialize AnimationMixer for embedded skeletal clips
        if (gltf.animations && gltf.animations.length > 0) {
          const mixer = new THREE.AnimationMixer(root);
          mixerRef.current = mixer;
          actionsRef.current = {};

          gltf.animations.forEach((clip) => {
            const action = mixer.clipAction(clip);
            actionsRef.current[clip.name.toLowerCase()] = action;
          });

          // Play default clip: DualArmWave
          if (actionsRef.current['dualarmwave']) {
            actionsRef.current['dualarmwave'].play();
          } else if (actionsRef.current['idlebreathe']) {
            actionsRef.current['idlebreathe'].play();
          } else if (gltf.animations[0]) {
            mixer.clipAction(gltf.animations[0]).play();
          }
        }

        const modelGroup = new THREE.Group();
        modelGroup.add(root);
        scene.add(modelGroup);
        modelGroupRef.current = modelGroup;

        setLoading(false);
      },
      undefined,
      (err) => {
        console.error('Failed to load /3d-assets/model_rigged.glb:', err);
        setLoadError('Failed to load model_rigged.glb. Please check if the file exists.');
        setLoading(false);
      }
    );

    // Resize Handler
    const handleResize = () => {
      if (!canvas || !stage || !renderer || !camera) return;
      const w = stage.clientWidth;
      const h = stage.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    window.addEventListener('resize', handleResize);

    // Mouse Tracking for Cursor Follow Mode
    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouseNdcRef.current = { x, y };
      setMouseNdc({ x, y });
    };
    canvas.addEventListener('mousemove', handleMouseMove);

    // 9. 60 FPS Render & Animation Loop
    let time = 0;
    const clock = new THREE.Clock();
    const animate = () => {
      const delta = clock.getDelta();
      time += delta;
      controls.update();

      const group = modelGroupRef.current;
      const shadow = shadowMeshRef.current;
      const base = baseScaleRef.current;
      const currentAnim = activeAnimRef.current;
      const playing = isPlayingRef.current;
      const speed = animSpeedRef.current;

      // Update Skeletal Animation Mixer
      if (mixerRef.current && playing) {
        mixerRef.current.update(delta * speed);
      }

      // Animate Particles
      if (particlesRef.current.length > 0) {
        for (let i = particlesRef.current.length - 1; i >= 0; i--) {
          const p = particlesRef.current[i];
          p.mesh.position.x += p.vx;
          p.mesh.position.y += p.vy;
          p.mesh.position.z += p.vz;
          p.vy -= 0.0008;
          p.life -= p.decay;
          p.mesh.material.opacity = Math.max(0, p.life);
          p.mesh.scale.setScalar(Math.max(0.01, p.life));

          if (p.life <= 0) {
            scene.remove(p.mesh);
            p.mesh.geometry.dispose();
            p.mesh.material.dispose();
            particlesRef.current.splice(i, 1);
          }
        }
      }

      // Procedural & Kinematic Animation Modes
      if (group && playing && !isReactingRef.current) {
        if (currentAnim.startsWith('skeletal_')) {
          // Skeletal animations are running on the bone armature via AnimationMixer
          // Add subtle levitation to make it feel alive in 3D space
          group.position.y = Math.sin(time * 2.0 * speed) * 0.06;
          group.scale.set(base, base, base);
          if (shadow) {
            shadow.scale.set(1, 1, 1);
            shadow.material.opacity = 0.65;
          }
        } else if (currentAnim === 'hop') {
          // ── Mode 4: Joyful Spring Hop ──
          const cycle = (time * 1.8 * speed) % (Math.PI * 2);
          const hopPeak = Math.max(0, Math.sin(cycle));
          const isGrounded = hopPeak < 0.05;

          group.position.y = hopPeak * 0.75;
          
          if (isGrounded) {
            group.scale.set(base * 1.15, base * 0.85, base * 1.15);
          } else {
            group.scale.set(base * 0.92, base * 1.12, base * 0.92);
          }

          group.rotation.y += 0.02 * speed;
          group.rotation.z = Math.sin(cycle) * 0.05;

          if (shadow) {
            shadow.scale.set(1.0 - hopPeak * 0.45, 1.0 - hopPeak * 0.45, 1);
            shadow.material.opacity = 0.70 - hopPeak * 0.45;
          }
        } else if (currentAnim === 'turntable') {
          // ── Mode 5: 360° Turntable Orbit Showcase ──
          group.rotation.y += 0.018 * speed;
          group.position.y = Math.sin(time * 1.5 * speed) * 0.06;
          group.scale.set(base, base, base);

          if (shadow) {
            shadow.scale.set(1, 1, 1);
            shadow.material.opacity = 0.60;
          }
        } else if (currentAnim === 'jiggle') {
          // ── Mode 6: Elastic Soft-Body Jiggle & Wobble ──
          const squish = Math.sin(time * 7.5 * speed) * 0.12;
          group.scale.set(base * (1.0 - squish * 0.7), base * (1.0 + squish), base * (1.0 - squish * 0.7));
          group.rotation.z = Math.sin(time * 5.0 * speed) * 0.09;
          group.position.y = Math.abs(Math.sin(time * 3.8 * speed)) * 0.08;

          if (shadow) {
            shadow.scale.set(1.0 + squish * 0.25, 1.0 + squish * 0.25, 1);
          }
        } else if (currentAnim === 'look') {
          // ── Mode 7: Cursor Follow Tracking ──
          const ndc = mouseNdcRef.current;
          const targetRotY = THREE.MathUtils.clamp(ndc.x * 0.65, -0.75, 0.75);
          const targetRotX = THREE.MathUtils.clamp(-ndc.y * 0.45, -0.45, 0.45);

          group.rotation.y += (targetRotY - group.rotation.y) * 0.10;
          group.rotation.x += (targetRotX - group.rotation.x) * 0.10;
          group.position.y = Math.sin(time * 2.0 * speed) * 0.08;
          group.scale.set(base, base, base);
        }
      }

      renderer.render(scene, camera);
      animIdRef.current = requestAnimationFrame(animate);
    };

    animIdRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      if (animIdRef.current) cancelAnimationFrame(animIdRef.current);
      renderer.dispose();
      controls.dispose();
    };
  }, []);

  // Toggle Wireframe Mode
  const handleToggleWireframe = () => {
    const next = !wireframe;
    setWireframe(next);
    if (modelMeshRef.current && modelMeshRef.current.material) {
      modelMeshRef.current.material.wireframe = next;
    }
  };

  // Canvas Click Interaction (Raycast Poke)
  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    const camera = cameraRef.current;
    const group = modelGroupRef.current;
    if (!canvas || !camera || !group) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
    const hits = raycaster.intersectObjects(group.children, true);

    if (hits.length > 0) {
      handleBotPoke();
    }
  };

  return (
    <div className="vbot-page">
      {/* Background Ambience & Cyber Grid */}
      <div className="vbot-bg-ambient" />
      <div className="vbot-grid-overlay" />

      {/* Header Bar */}
      <header className="vbot-header">
        <div className="vbot-header-left">
          <Link href="/" className="vbot-back-btn">
            <ChevronLeft size={16} /> Back to Dashboard
          </Link>
          <div className="vbot-title-group">
            <h1>
              <Sparkles size={20} className="text-teal-400" />
              Vedika Bot 3D Studio
            </h1>
            <div className="vbot-title-sub">
              Rigged 3D SkinnedMesh Viewer · 6 Bone Skeleton · model_rigged.glb
            </div>
          </div>
        </div>

        <div className="vbot-header-badges">
          <div className="vbot-rig-badge vbot-rig-badge-green">
            <Sparkles size={14} /> Rig Status: ✅ RIGGED (6 Bones)
          </div>
          <div className="vbot-status-badge">
            <Activity size={14} /> 6 Skeletal Clips + 4 Physics Modes
          </div>
        </div>
      </header>

      {/* Studio Grid (Viewport + Controls/Inspector) */}
      <div className="vbot-studio-grid">
        {/* 3D Viewport Stage */}
        <div className="vbot-viewport-stage" ref={containerRef}>
          {loading && (
            <div className="vbot-loading-stage">
              <div className="vbot-spinner" />
              <div className="vbot-loading-text">Loading Rigged 3D SkinnedMesh...</div>
            </div>
          )}

          {loadError && (
            <div className="vbot-loading-stage">
              <ShieldAlert size={32} className="text-red-400" />
              <div className="vbot-loading-text">{loadError}</div>
            </div>
          )}

          {/* Floating Stage Controls HUD */}
          <div className="vbot-hud-controls">
            {/* Toggle Skeleton Bones Helper */}
            <button
              type="button"
              className={`vbot-hud-btn ${showSkeleton ? 'active' : ''}`}
              onClick={() => setShowSkeleton(!showSkeleton)}
              title="Toggle 3D Skeleton Bone Armature visualization"
            >
              <Activity size={13} />
              <span>{showSkeleton ? 'Hide Bones' : 'Show Bones'}</span>
            </button>

            {/* Toggle Wireframe */}
            <button
              type="button"
              className={`vbot-hud-btn ${wireframe ? 'active' : ''}`}
              onClick={handleToggleWireframe}
              title="Toggle wireframe topology"
            >
              <Layers size={13} />
              <span>{wireframe ? 'Shaded' : 'Wireframe'}</span>
            </button>

            {/* Reset Camera */}
            <button
              type="button"
              className="vbot-hud-btn"
              onClick={handleResetCamera}
              title="Reset camera view to default"
            >
              <Compass size={13} />
              <span>Reset Cam</span>
            </button>

            {/* Poke Bot */}
            <button
              type="button"
              className="vbot-hud-btn"
              onClick={handleBotPoke}
              title="Poke / trigger bounce reaction"
            >
              <Zap size={13} />
              <span>Poke Bot</span>
            </button>
          </div>

          {/* 3D WebGL Canvas */}
          <canvas
            ref={canvasRef}
            className="vbot-canvas"
            onClick={handleCanvasClick}
          />

          {/* Interaction Guide Hint */}
          <div className="vbot-interaction-hint">
            <span className="vbot-hint-dot" />
            <span>Drag to rotate · Scroll to zoom · Cyan wireframe represents active bone joints</span>
          </div>
        </div>

        {/* Sidebar Dock: Technical Rig Inspection & Animation Controls */}
        <aside className="vbot-sidebar">
          {/* Card 1: Technical Rig Inspection Analysis */}
          <div className="vbot-card">
            <div className="vbot-card-title cyan">
              <Info size={16} /> Model Rigging Report
            </div>
            
            <div className="vbot-tech-table">
              <div className="vbot-tech-row">
                <span className="vbot-tech-label">Rigging Status:</span>
                <span className="vbot-tech-val yes">✅ RIGGED (SkinnedMesh)</span>
              </div>
              <div className="vbot-tech-row">
                <span className="vbot-tech-label">Armature / Skeleton:</span>
                <span className="vbot-tech-val yes">1 Skin (Bot_Skeleton)</span>
              </div>
              <div className="vbot-tech-row">
                <span className="vbot-tech-label">Bones / Joints:</span>
                <span className="vbot-tech-val yes">6 Hierarchical Bones</span>
              </div>
              <div className="vbot-tech-row">
                <span className="vbot-tech-label">Skin Weights:</span>
                <span className="vbot-tech-val yes">Bound (JOINTS_0 + WEIGHTS_0)</span>
              </div>
              <div className="vbot-tech-row">
                <span className="vbot-tech-label">Embedded Clips:</span>
                <span className="vbot-tech-val yes">6 Skeletal Animations</span>
              </div>
              <div className="vbot-tech-row">
                <span className="vbot-tech-label">Total Vertices:</span>
                <span className="vbot-tech-val yes">58,704 Vertices</span>
              </div>
              <div className="vbot-tech-row">
                <span className="vbot-tech-label">Material Format:</span>
                <span className="vbot-tech-val yes">PBR Textured (SkinnedMesh)</span>
              </div>
            </div>

            <div className="vbot-rig-notice vbot-rig-notice-green">
              ✨ <strong>Rigging Complete</strong>: Arm bones and vertex weights are active. Choose any of the arm movement animations below to see both arms move in 3D!
            </div>
          </div>

          {/* Card 2: Animation Modes Selector */}
          <div className="vbot-card">
            <div className="vbot-card-title purple">
              <Activity size={16} /> Skeletal Arm & Body Animations
            </div>

            <div className="vbot-anim-list">
              {/* Skeletal Clip: DualArmWave */}
              <button
                type="button"
                className={`vbot-anim-btn ${activeAnim === 'skeletal_dualarmwave' ? 'active' : ''}`}
                onClick={() => setActiveAnim('skeletal_dualarmwave')}
              >
                <div className="vbot-anim-left">
                  <div className="vbot-anim-icon"><Sparkles size={15} /></div>
                  <div>
                    <span className="vbot-anim-name">👋 Dual Arm Wave (Skeletal)</span>
                    <span className="vbot-anim-sub">Both arms wave high in the air</span>
                  </div>
                </div>
                <span className="vbot-anim-pill">Arm Motion</span>
              </button>

              {/* Skeletal Clip: RobotArms */}
              <button
                type="button"
                className={`vbot-anim-btn ${activeAnim === 'skeletal_robotarms' ? 'active' : ''}`}
                onClick={() => setActiveAnim('skeletal_robotarms')}
              >
                <div className="vbot-anim-left">
                  <div className="vbot-anim-icon"><Activity size={15} /></div>
                  <div>
                    <span className="vbot-anim-name">🤖 Robot Arm Swing (Skeletal)</span>
                    <span className="vbot-anim-sub">Alternating front/back arm pump</span>
                  </div>
                </div>
                <span className="vbot-anim-pill">Arm Motion</span>
              </button>

              {/* Skeletal Clip: ArmFlap */}
              <button
                type="button"
                className={`vbot-anim-btn ${activeAnim === 'skeletal_armflap' ? 'active' : ''}`}
                onClick={() => setActiveAnim('skeletal_armflap')}
              >
                <div className="vbot-anim-left">
                  <div className="vbot-anim-icon"><Zap size={15} /></div>
                  <div>
                    <span className="vbot-anim-name">🦅 Arm Flapping (Skeletal)</span>
                    <span className="vbot-anim-sub">Rapid wing flapping up & down</span>
                  </div>
                </div>
                <span className="vbot-anim-pill">Arm Motion</span>
              </button>

              {/* Skeletal Clip: WaveDance */}
              <button
                type="button"
                className={`vbot-anim-btn ${activeAnim === 'skeletal_wavedance' ? 'active' : ''}`}
                onClick={() => setActiveAnim('skeletal_wavedance')}
              >
                <div className="vbot-anim-left">
                  <div className="vbot-anim-icon"><Smile size={15} /></div>
                  <div>
                    <span className="vbot-anim-name">👋 Single Arm Wave (Skeletal)</span>
                    <span className="vbot-anim-sub">Right arm wave & spine sway</span>
                  </div>
                </div>
                <span className="vbot-anim-pill">Arm Motion</span>
              </button>

              {/* Skeletal Clip: HeadNod */}
              <button
                type="button"
                className={`vbot-anim-btn ${activeAnim === 'skeletal_headnod' ? 'active' : ''}`}
                onClick={() => setActiveAnim('skeletal_headnod')}
              >
                <div className="vbot-anim-left">
                  <div className="vbot-anim-icon"><Activity size={15} /></div>
                  <div>
                    <span className="vbot-anim-name">🗣️ Head Nod & Talk (Skeletal)</span>
                    <span className="vbot-anim-sub">Head bone nodding & talking</span>
                  </div>
                </div>
                <span className="vbot-anim-pill">Embedded</span>
              </button>

              {/* Skeletal Clip: IdleBreathe */}
              <button
                type="button"
                className={`vbot-anim-btn ${activeAnim === 'skeletal_idlebreathe' ? 'active' : ''}`}
                onClick={() => setActiveAnim('skeletal_idlebreathe')}
              >
                <div className="vbot-anim-left">
                  <div className="vbot-anim-icon"><Smile size={15} /></div>
                  <div>
                    <span className="vbot-anim-name">🧘 Idle Breathe (Skeletal)</span>
                    <span className="vbot-anim-sub">Chest & head bone breathing</span>
                  </div>
                </div>
                <span className="vbot-anim-pill">Embedded</span>
              </button>

              {/* Procedural Mode: Spring Hop */}
              <button
                type="button"
                className={`vbot-anim-btn ${activeAnim === 'hop' ? 'active' : ''}`}
                onClick={() => setActiveAnim('hop')}
              >
                <div className="vbot-anim-left">
                  <div className="vbot-anim-icon"><Zap size={15} /></div>
                  <div>
                    <span className="vbot-anim-name">🚀 Spring Hop & Cushion</span>
                    <span className="vbot-anim-sub">Dynamic leaps with cushion</span>
                  </div>
                </div>
                <span className="vbot-anim-pill">Physics</span>
              </button>

              {/* Procedural Mode: Turntable */}
              <button
                type="button"
                className={`vbot-anim-btn ${activeAnim === 'turntable' ? 'active' : ''}`}
                onClick={() => setActiveAnim('turntable')}
              >
                <div className="vbot-anim-left">
                  <div className="vbot-anim-icon"><RotateCcw size={15} /></div>
                  <div>
                    <span className="vbot-anim-name">🔄 Turntable Showcase</span>
                    <span className="vbot-anim-sub">Continuous 360° rotation</span>
                  </div>
                </div>
                <span className="vbot-anim-pill">360°</span>
              </button>

              {/* Procedural Mode: Jiggle */}
              <button
                type="button"
                className={`vbot-anim-btn ${activeAnim === 'jiggle' ? 'active' : ''}`}
                onClick={() => setActiveAnim('jiggle')}
              >
                <div className="vbot-anim-left">
                  <div className="vbot-anim-icon"><Activity size={15} /></div>
                  <div>
                    <span className="vbot-anim-name">🍮 Jiggle & Wobble</span>
                    <span className="vbot-anim-sub">Elastic gelatin squish</span>
                  </div>
                </div>
                <span className="vbot-anim-pill">Squish</span>
              </button>

              {/* Procedural Mode: Cursor Look */}
              <button
                type="button"
                className={`vbot-anim-btn ${activeAnim === 'look' ? 'active' : ''}`}
                onClick={() => setActiveAnim('look')}
              >
                <div className="vbot-anim-left">
                  <div className="vbot-anim-icon"><Eye size={15} /></div>
                  <div>
                    <span className="vbot-anim-name">👀 Cursor Follow</span>
                    <span className="vbot-anim-sub">Tracks mouse position in 3D</span>
                  </div>
                </div>
                <span className="vbot-anim-pill">Interactive</span>
              </button>
            </div>
          </div>

          {/* Card 3: Animation Controls (Play/Pause & Speed) */}
          <div className="vbot-card">
            <div className="vbot-card-title amber">
              <Compass size={16} /> Animation Dynamics
            </div>

            <div className="vbot-controls-group">
              <div className="vbot-slider-header">
                <span>Playback Speed:</span>
                <span>{animSpeed.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.3"
                max="2.5"
                step="0.1"
                value={animSpeed}
                onChange={(e) => setAnimSpeed(parseFloat(e.target.value))}
                className="vbot-range-input"
              />

              <div className="vbot-action-row">
                <button
                  type="button"
                  className="vbot-primary-btn"
                  onClick={() => setIsPlaying(!isPlaying)}
                >
                  {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                  <span>{isPlaying ? 'Pause' : 'Resume'}</span>
                </button>

                <button
                  type="button"
                  className="vbot-secondary-btn"
                  onClick={handleBotPoke}
                >
                  <Zap size={14} className="text-amber-400" />
                  <span>Poke Hop</span>
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
