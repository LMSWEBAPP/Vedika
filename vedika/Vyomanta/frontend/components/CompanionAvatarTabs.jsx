'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

// Global cache to avoid re-fetching assets across re-renders
let cachedGltf = null;
let cachedTextures = null;

const TABS = [
  {
    id: 'ask_vedika',
    label: 'Ask Vedika',
    character: 'Mowgli',
    texture: '/avatar_purple.webp?v=7',
    audio: '/audio/tabs/mowgli_tab.wav',
    accent: '#6366f1',
    glow: 'rgba(99, 102, 241, 0.35)'
  },
  {
    id: 'notes',
    label: 'Personal Notes',
    character: 'Belle',
    texture: '/avatar_red.webp?v=7',
    audio: '/audio/tabs/belle_tab.wav',
    accent: '#ec4899',
    glow: 'rgba(236, 72, 153, 0.35)'
  },
  {
    id: 'qa',
    label: 'Lesson Q&A',
    character: 'Moana',
    texture: '/avatar_gold.webp?v=7',
    audio: '/audio/tabs/moana_tab.wav',
    accent: '#f59e0b',
    glow: 'rgba(245, 158, 11, 0.35)'
  },
  {
    id: 'quiz',
    label: 'Practice Quiz',
    character: 'Bhageera',
    texture: '/avatar_blue.webp?v=7',
    audio: '/audio/tabs/bhageera_tab.wav',
    accent: '#a855f7',
    glow: 'rgba(168, 85, 247, 0.35)'
  },
];

/**
 * Exact Home Page Avatar Lips & Dynamic Speech Animation (HomeAvatarManager.js parity).
 * Translated comfortably down below the eyes onto the lower face.
 * Features clean resting smile or open speaking mouth with warm cavity (#1C1218),
 * cute animated pink tongue (#FF758F), contour stroke (#050306), and smile dimples.
 */
function drawFace(ctx, mouthOpen = 0) {
  ctx.clearRect(0, 0, 512, 512);

  ctx.save();
  // Translated down to 345 (comfortably below the eyes onto the lower face)
  ctx.translate(256, 345);

  const open = Math.max(0, Math.min(1.0, mouthOpen));
  const isSpeaking = open > 0.04;

  // Exact home page mouth width increased 5% for crisp legibility (67px resting, expanding to 84px)
  const w = 67 + open * 17;
  const halfW = w / 2;

  // More black color only for the lip contour and dimples (#050306)
  ctx.strokeStyle = '#050306';
  ctx.lineWidth = 5.0;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (isSpeaking) {
    const openH = open * 23; // Mouth cavity height up to 23px
    const curveY = 8.5;

    // ── Open Cheerful Speaking Mouth ──
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-halfW, -curveY * 0.35);
    ctx.quadraticCurveTo(0, -curveY * 0.70, halfW, -curveY * 0.35);
    ctx.quadraticCurveTo(0, curveY + openH, -halfW, -curveY * 0.35);
    ctx.closePath();

    // Dark warm mouth cavity (Exact Home Page)
    ctx.fillStyle = '#1C1218';
    ctx.fill();
    ctx.clip(); // Clip cute tongue inside mouth

    // Cute animated pink tongue (Exact Home Page)
    const tongueY = curveY + openH - 2;
    ctx.fillStyle = '#FF758F';
    ctx.beginPath();
    ctx.ellipse(0, tongueY, halfW * 0.58, openH * 0.55 + 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore(); // End clip

    // Smooth clean lip contour around open mouth - deep pure black
    ctx.beginPath();
    ctx.moveTo(-halfW, -curveY * 0.35);
    ctx.quadraticCurveTo(0, -curveY * 0.70, halfW, -curveY * 0.35);
    ctx.quadraticCurveTo(0, curveY + openH, -halfW, -curveY * 0.35);
    ctx.stroke();

    // Cute corner smile dimples - deep pure black
    ctx.lineWidth = 3.4;
    ctx.beginPath();
    ctx.moveTo(-halfW - 2.5, -curveY * 0.35 - 2);
    ctx.lineTo(-halfW + 1, -curveY * 0.35 + 2);
    ctx.moveTo(halfW + 2.5, -curveY * 0.35 - 2);
    ctx.lineTo(halfW - 1, -curveY * 0.35 + 2);
    ctx.stroke();

  } else {
    // ── Cute Natural Resting Smile (Exact Home Page) ──
    const curveY = 12.6;

    ctx.beginPath();
    ctx.moveTo(-halfW, -curveY * 0.28);
    ctx.quadraticCurveTo(0, curveY, halfW, -curveY * 0.28);
    ctx.stroke();

    // Delicate corner smile dimples - deep pure black
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(-halfW - 2.5, -curveY * 0.28 - 2);
    ctx.lineTo(-halfW + 1, -curveY * 0.28 + 2);
    ctx.moveTo(halfW + 2.5, -curveY * 0.28 - 2);
    ctx.lineTo(halfW - 1, -curveY * 0.28 + 2);
    ctx.stroke();
  }

  ctx.restore();
}

export default function CompanionAvatarTabs({
  activeTab = 'ask_vedika',
  onSelectTab,
  notesCount = 0,
  qaCount = 0
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [hoveredTab, setHoveredTab] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Audio playback management & speaking state
  const currentAudioRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const speakingAvatarIdRef = useRef(null);
  const hoveredTabRef = useRef(null);
  const activeTabRef = useRef(activeTab);

  useEffect(() => {
    hoveredTabRef.current = hoveredTab;
  }, [hoveredTab]);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  // Audio trigger with 300ms debounce and speaking lip-sync tracking (Requirement 6)
  const playAvatarAudio = useCallback((tab) => {
    try {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
      }
      const audio = new Audio(tab.audio);
      audio.volume = 0.9;
      currentAudioRef.current = audio;
      speakingAvatarIdRef.current = tab.id;

      audio.onended = () => {
        if (speakingAvatarIdRef.current === tab.id) {
          speakingAvatarIdRef.current = null;
        }
      };
      audio.onpause = () => {
        if (speakingAvatarIdRef.current === tab.id) {
          speakingAvatarIdRef.current = null;
        }
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.debug('Tab voice audio prevented:', err);
          speakingAvatarIdRef.current = null;
        });
      }
    } catch (e) {
      console.debug('Audio error:', e);
      speakingAvatarIdRef.current = null;
    }
  }, []);

  const handleTabMouseEnter = useCallback((tab) => {
    setHoveredTab(tab.id);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // 300ms hover delay before dialogue audio plays (Requirement 6)
    debounceTimerRef.current = setTimeout(() => {
      playAvatarAudio(tab);
    }, 300);
  }, [playAvatarAudio]);

  const handleTabMouseLeave = useCallback(() => {
    setHoveredTab(null);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
  }, []);

  // Click also triggers the voice line and lip-sync if not already playing
  const handleTabClick = useCallback((tab) => {
    onSelectTab(tab.id);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    playAvatarAudio(tab);
  }, [onSelectTab, playAvatarAudio]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      speakingAvatarIdRef.current = null;
    };
  }, []);

  // Three.js Scene Setup (100x Ultra-HD Antialiased Rendering & Social Gaze AI)
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let isCancelled = false;
    let animId = null;

    const rect = container.getBoundingClientRect();
    let width = Math.round(rect.width) || 420;
    const height = 68;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });

    // 100x Quality Supersampling: DPR 3.5 for silky smooth, zero-grain rendering
    const dpr = Math.min(Math.max(window.devicePixelRatio || 1, 2.5), 3.5);
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, true);
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    if ('outputColorSpace' in renderer) {
      renderer.outputColorSpace = THREE.SRGBColorSpace;
    }

    const scene = new THREE.Scene();

    // Orthographic camera calibrated with comfortable margin to prevent top/bottom clipping
    const aspect = width / height;
    const viewSize = 2.45;
    const camera = new THREE.OrthographicCamera(
      (-viewSize * aspect) / 2,
      (viewSize * aspect) / 2,
      viewSize / 2,
      -viewSize / 2,
      0.1,
      50
    );
    camera.position.set(0, 0, 10);
    camera.lookAt(0, 0, 0);

    // Soft Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffecd6, 0.95);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff3de, 1.15);
    keyLight.position.set(2, 4, 6);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.45);
    fillLight.position.set(-3, -2, 4);
    scene.add(fillLight);

    const avatarEntries = [];

    // Cursor tracking state: when cursor moves all 4 follow cursor
    const mousePos = { x: 0, y: 0 };
    let lastMouseMoveTime = -10000;
    const onPointerMove = (e) => {
      mousePos.x = (e.clientX / window.innerWidth) * 2 - 1;
      mousePos.y = -(e.clientY / window.innerHeight) * 2 + 1;
      lastMouseMoveTime = performance.now();
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    // Calculate avatar positions matching the 4 tab buttons
    const updateAvatarPositions = (w) => {
      const totalAspect = (viewSize * (w / height));
      avatarEntries.forEach(({ group, idx }) => {
        const frac = (idx + 0.5) / 4;
        const posX = - (totalAspect / 2) + frac * totalAspect;
        group.position.x = posX;
      });
    };

    const textureLoader = new THREE.TextureLoader();
    const gltfLoader = new GLTFLoader();

    const maxAniso = renderer.capabilities?.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 16;

    const loadTexturesPromise = cachedTextures
      ? Promise.resolve(cachedTextures)
      : Promise.all(
          TABS.map(
            (spec) =>
              new Promise((resolve) => {
                textureLoader.load(
                  spec.texture,
                  (tex) => {
                    tex.flipY = false;
                    tex.colorSpace = THREE.SRGBColorSpace;
                    tex.generateMipmaps = true;
                    tex.minFilter = THREE.LinearMipmapLinearFilter;
                    tex.magFilter = THREE.LinearFilter;
                    tex.anisotropy = Math.min(maxAniso, 16);
                    tex.needsUpdate = true;
                    resolve(tex);
                  },
                  undefined,
                  () => resolve(null)
                );
              })
          )
        );

    const loadGltfPromise = cachedGltf
      ? Promise.resolve(cachedGltf)
      : new Promise((resolve) => {
          gltfLoader.load(
            '/Physics-avatar-opt.glb',
            (gltf) => {
              cachedGltf = gltf;
              resolve(gltf);
            },
            undefined,
            () => resolve(null)
          );
        });

    Promise.all([loadTexturesPromise, loadGltfPromise]).then(([textures, gltf]) => {
      if (isCancelled || !gltf) return;
      cachedTextures = textures;

      const masterScene = gltf.scene;

      TABS.forEach((spec, idx) => {
        const clone = masterScene.clone(true);

        const box = new THREE.Box3().setFromObject(clone);
        const center = box.getCenter(new THREE.Vector3());
        const sizeVec = box.getSize(new THREE.Vector3());

        clone.position.x -= center.x;
        clone.position.y -= center.y;
        clone.position.z -= center.z;

        const maxDim = Math.max(sizeVec.x, sizeVec.y, sizeVec.z);
        if (maxDim > 0) {
          // Perfectly round 1.50 base scale calibrated so +30% active pop has ample headroom in 68px
          clone.scale.setScalar(1.50 / maxDim);
        }

        clone.traverse((child) => {
          if (child.isMesh && child.material) {
            child.material = child.material.clone();
            if (textures && textures[idx]) {
              child.material.map = textures[idx];
            }
            child.material.color.set('#FFFFFF');
            child.material.roughness = 0.86;
            child.material.metalness = 0.0;
            child.material.side = THREE.FrontSide;

            // Soften normal map scale to eliminate micro-facet pixelation/grain
            if (child.material.normalMap) {
              child.material.normalScale.set(0.12, 0.12);
              child.material.normalMap.generateMipmaps = true;
              child.material.normalMap.minFilter = THREE.LinearMipmapLinearFilter;
              child.material.normalMap.magFilter = THREE.LinearFilter;
              child.material.normalMap.anisotropy = Math.min(maxAniso, 16);
              child.material.normalMap.needsUpdate = true;
            }
            if (child.material.roughnessMap) {
              child.material.roughnessMap.generateMipmaps = true;
              child.material.roughnessMap.minFilter = THREE.LinearMipmapLinearFilter;
              child.material.roughnessMap.magFilter = THREE.LinearFilter;
              child.material.roughnessMap.anisotropy = Math.min(maxAniso, 16);
              child.material.roughnessMap.needsUpdate = true;
            }
            child.material.needsUpdate = true;
          }
        });

        // Exact Home Page 512x512 Face Canvas for Clean Mascot Lips
        const faceCanvas = document.createElement('canvas');
        faceCanvas.width = 512;
        faceCanvas.height = 512;
        const faceCtx = faceCanvas.getContext('2d');
        drawFace(faceCtx, 0);

        const faceTexture = new THREE.CanvasTexture(faceCanvas);
        faceTexture.minFilter = THREE.LinearFilter;
        faceTexture.magFilter = THREE.LinearFilter;
        faceTexture.needsUpdate = true;

        const faceGeo = new THREE.PlaneGeometry(0.86, 0.86);
        const faceMat = new THREE.MeshBasicMaterial({
          map: faceTexture,
          transparent: true,
          depthWrite: false,
          depthTest: true,
          polygonOffset: true,
          polygonOffsetFactor: -3,
          polygonOffsetUnits: -3,
          side: THREE.FrontSide
        });

        const faceMesh = new THREE.Mesh(faceGeo, faceMat);
        // Positioned comfortably DOWN from the eyes (y: -0.11) on the front surface of the avatar
        faceMesh.position.set(0, -0.11, 0.775);
        faceMesh.renderOrder = 25;

        const group = new THREE.Group();
        group.add(clone);
        group.add(faceMesh);

        scene.add(group);
        avatarEntries.push({
          group,
          clone,
          idx,
          specId: spec.id,
          faceMesh,
          faceCtx,
          faceCanvas,
          faceTexture,
          mouthOpen: 0,
          nextGlanceTime: 5.0 + Math.random() * 2.5,
          randomGazeX: 0,
          randomGazeY: 0,
          gazeX: 0,
          gazeY: 0
        });
      });

      updateAvatarPositions(width);
      setIsLoaded(true);

      const startTime = performance.now();

      const animate = (currentTime) => {
        if (isCancelled) return;
        const elapsed = (currentTime - startTime) * 0.001;

        // Check if any avatar is currently speaking
        const speakerIdx = avatarEntries.findIndex((e) => e.specId === speakingAvatarIdRef.current);

        // Check if cursor was moved within the last 1.8 seconds
        const isCursorMoving = (currentTime - lastMouseMoveTime) < 1800;

        avatarEntries.forEach((entry) => {
          const { group, clone, idx, specId, faceCtx, faceTexture } = entry;
          const isActive = activeTabRef.current === specId;
          const isHovered = hoveredTabRef.current === specId;
          const isSpeaking = speakingAvatarIdRef.current === specId;
          const offset = idx * 0.75;

          // ── Gaze Engine ──
          let targetGazeX = 0;
          let targetGazeY = 0;

          if (elapsed < 5.0) {
            // Rule: On page load for 5 sec they all look at the user only
            targetGazeX = 0;
            targetGazeY = 0;
          } else if (speakerIdx !== -1) {
            // Rule: When an avatar is speaking, rest of the avatars look at it
            if (idx === speakerIdx) {
              // The speaker looks forward at the user
              targetGazeX = 0;
              targetGazeY = 0;
            } else {
              // Look towards the speaking companion
              const diff = speakerIdx - idx;
              targetGazeX = Math.sign(diff) * (Math.abs(diff) === 1 ? 0.28 : Math.abs(diff) === 2 ? 0.38 : 0.45);
              targetGazeY = -0.04;
            }
          } else if (isCursorMoving) {
            // User Requirement: When cursor moves, ALL 4 will follow the cursor
            targetGazeX = THREE.MathUtils.clamp(mousePos.x * 0.38, -0.42, 0.42);
            targetGazeY = THREE.MathUtils.clamp(-mousePos.y * 0.22, -0.24, 0.24);
          } else {
            // User Requirement: When in idle position, all 4 gaze independently anywhere in the page
            if (elapsed > entry.nextGlanceTime) {
              entry.nextGlanceTime = elapsed + 2.5 + Math.random() * 3.5;
              const roll = Math.random();
              if (roll < 0.30) {
                // Glance forward at user
                entry.randomGazeX = 0;
                entry.randomGazeY = 0;
              } else if (roll < 0.55) {
                // Glance sideways at companion or margins
                entry.randomGazeX = (Math.random() > 0.5 ? 1 : -1) * (0.18 + Math.random() * 0.16);
                entry.randomGazeY = (Math.random() - 0.5) * 0.08;
              } else if (roll < 0.80) {
                // Look down into the page content / lesson notes
                entry.randomGazeX = (Math.random() - 0.5) * 0.20;
                entry.randomGazeY = -0.18 - Math.random() * 0.10;
              } else {
                // Look up / curious wandering glance
                entry.randomGazeX = (Math.random() - 0.5) * 0.22;
                entry.randomGazeY = 0.14 + Math.random() * 0.08;
              }
            }
            targetGazeX = entry.randomGazeX;
            targetGazeY = entry.randomGazeY;
          }

          // Smoothly interpolate gaze rotations: responsive when tracking cursor, natural glide when wandering
          const gazeSpeed = isSpeaking ? 0.20 : (speakerIdx !== -1 ? 0.14 : (isCursorMoving ? 0.12 : 0.06));
          entry.gazeX = THREE.MathUtils.lerp(entry.gazeX || 0, targetGazeX, gazeSpeed);
          entry.gazeY = THREE.MathUtils.lerp(entry.gazeY || 0, targetGazeY, gazeSpeed);

          // Organic speech cadence combining multiple harmonic frequencies (Home page parity)
          const prevMouth = entry.mouthOpen;
          if (isSpeaking) {
            const speechCadence =
              Math.sin(elapsed * 17.5) * 0.42 +
              Math.sin(elapsed * 28.0) * 0.28 +
              Math.sin(elapsed * 10.2) * 0.30;
            const targetMouth = Math.max(0, Math.min(1.0, speechCadence * 0.85 + 0.45));
            entry.mouthOpen += (targetMouth - entry.mouthOpen) * 0.38;
          } else {
            entry.mouthOpen += (0 - entry.mouthOpen) * 0.24;
            if (entry.mouthOpen <= 0.01) entry.mouthOpen = 0;
          }

          // Re-draw face canvas only when opening changes significantly
          if (isSpeaking || Math.abs(entry.mouthOpen - prevMouth) > 0.015 || (entry.mouthOpen === 0 && prevMouth > 0)) {
            drawFace(faceCtx, entry.mouthOpen);
            faceTexture.needsUpdate = true;
          }

          // User Requirement: Selected tab avatar increases in size by exactly 30% (1.30) compared to rest (1.0)
          const targetBaseScale = isActive ? 1.30 : isHovered ? 1.05 : 1.0;
          // Squash & stretch resonance during speech
          const talkStretch = isSpeaking ? (1.0 + entry.mouthOpen * 0.04) : 1.0;
          const talkSquash = 1.0 / Math.sqrt(talkStretch);
          group.scale.lerp(new THREE.Vector3(targetBaseScale * talkSquash, targetBaseScale * talkStretch, targetBaseScale * talkSquash), 0.12);

          // Subtle idle breathing and speaking bounce
          const idleY = Math.sin(elapsed * 2.8 + offset) * 0.025;
          const activeLift = isActive ? 0.03 : isHovered ? 0.015 : 0;
          const speechBob = isSpeaking ? (Math.sin(elapsed * 11.5) * 0.035 + Math.abs(Math.sin(elapsed * 5.8)) * 0.02) : 0;
          group.position.y = idleY + activeLift + speechBob;

          // Head orientation + speech nod
          const speechNod = isSpeaking ? (Math.sin(elapsed * 11.5) * 0.045) : 0;
          group.rotation.y = entry.gazeX;
          group.rotation.x = entry.gazeY + speechNod;
          group.rotation.z = Math.cos(elapsed * 1.8 + offset) * 0.02;
        });

        renderer.render(scene, camera);
        animId = requestAnimationFrame(animate);
      };

      animId = requestAnimationFrame(animate);
    });


    // Handle container resizing smoothly without stretching
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newWidth = Math.round(entry.contentRect.width);
        if (newWidth > 0 && Math.abs(newWidth - width) > 1) {
          width = newWidth;
          renderer.setSize(width, height, true);
          const newAspect = width / height;
          camera.left = (-viewSize * newAspect) / 2;
          camera.right = (viewSize * newAspect) / 2;
          camera.updateProjectionMatrix();
          updateAvatarPositions(width);
        }
      }
    });

    resizeObserver.observe(container);

    return () => {
      isCancelled = true;
      if (animId) cancelAnimationFrame(animId);
      window.removeEventListener('pointermove', onPointerMove);
      resizeObserver.disconnect();
      renderer.dispose();
      avatarEntries.forEach((entry) => {
        entry.faceTexture.dispose();
      });
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="companion-avatar-tabs-container"
      style={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 0,
        width: '100%',
        height: 68,
        background: 'transparent',
        border: 'none',
        padding: 0,
        boxSizing: 'border-box',
        userSelect: 'none',
        overflow: 'visible'
      }}
    >
      {/* Underlying High-Resolution WebGL Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 1,
          opacity: isLoaded ? 1 : 0,
          transition: 'opacity 0.25s ease'
        }}
      />

      {/* 4 Interactive Tab Buttons */}
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        const isHovered = hoveredTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleTabClick(tab)}
            onMouseEnter={() => handleTabMouseEnter(tab)}
            onMouseLeave={handleTabMouseLeave}
            className={`companion-avatar-tab-item ${isActive ? 'active' : ''} ${isHovered ? 'hovered' : ''}`}
            aria-label={tab.label}
            style={{
              position: 'relative',
              zIndex: 2,
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: 'none',
              boxShadow: 'none',
              cursor: 'pointer',
              padding: 0,
              outline: 'none',
              transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: 'none'
            }}
          >
            {/* Tooltip on Hover - Positioned below the avatar to prevent any cutoff */}
            {isHovered && (
              <div
                className="companion-avatar-tooltip"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'rgba(13, 18, 31, 0.96)',
                  backdropFilter: 'blur(10px)',
                  border: `1px solid ${tab.accent}66`,
                  color: '#ffffff',
                  padding: '4px 10px',
                  borderRadius: 8,
                  fontSize: 11,
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                  zIndex: 100,
                  boxShadow: `0 4px 16px rgba(0, 0, 0, 0.6), 0 0 10px ${tab.glow}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  animation: 'avatarTooltipPopDown 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                }}
              >
                {/* Arrow pointing up */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 0,
                    height: 0,
                    borderLeft: '5px solid transparent',
                    borderRight: '5px solid transparent',
                    borderBottom: '5px solid rgba(13, 18, 31, 0.96)'
                  }}
                />
                <span>{tab.label}</span>
              </div>
            )}

            {/* Notification Dot anchored directly to the top-right of the avatar */}
            {tab.id === 'notes' && notesCount > 0 && (
              <span
                className="companion-avatar-badge"
                style={{
                  position: 'absolute',
                  top: 6,
                  left: 'calc(50% + 14px)',
                  background: '#ec4899',
                  color: '#ffffff',
                  fontSize: 9,
                  fontWeight: 700,
                  minWidth: 16,
                  height: 16,
                  padding: '0 4px',
                  borderRadius: 999,
                  boxShadow: '0 2px 5px rgba(0, 0, 0, 0.5)',
                  border: '2px solid #0b0f19',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 1,
                  zIndex: 3
                }}
              >
                {notesCount}
              </span>
            )}

            {tab.id === 'qa' && qaCount > 0 && (
              <span
                className="companion-avatar-badge"
                style={{
                  position: 'absolute',
                  top: 6,
                  left: 'calc(50% + 14px)',
                  background: '#f59e0b',
                  color: '#ffffff',
                  fontSize: 9,
                  fontWeight: 700,
                  minWidth: 16,
                  height: 16,
                  padding: '0 4px',
                  borderRadius: 999,
                  boxShadow: '0 2px 5px rgba(0, 0, 0, 0.5)',
                  border: '2px solid #0b0f19',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 1,
                  zIndex: 3
                }}
              >
                {qaCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
