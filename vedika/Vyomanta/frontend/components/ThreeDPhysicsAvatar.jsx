'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import './ThreeDPhysicsAvatar.css';

/**
 * ThreeDPhysicsAvatar — 3D GLB Model Avatar with Dynamic Smile Mouth Line
 *
 * Features:
 *  - Native 3D GLB Model with its original 3D eyes.
 *  - Full 3D Gaze & Head Rotation tracking the mouse cursor in real-time.
 *  - Cute dynamic 3D smile mouth line that curves with expressions (happy, sad, angry, idle).
 *  - Organic breathing float on the Y-axis.
 */

// 2nd-order spring physics
function updateSpring(val, vel, target, stiffness, damping, dt) {
  const force = (target - val) * stiffness;
  const damp = -vel * damping;
  const nVel = vel + (force + damp) * dt;
  const nVal = val + nVel * dt;
  return [nVal, nVel];
}

export default function ThreeDPhysicsAvatar({
  expression = 'idle',
  glowColor = '#34D399',
  size = 270,
  mouseOffset = { x: 0, y: 0 },
  className = '',
  onClick,
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);

  const stateRef = useRef({
    currentExpr: expression,
    glowColor,
    targetMouse: mouseOffset,
    mouse: { x: 0, y: 0 },
    mouseVel: { x: 0, y: 0 },

    // 3D Model Rotation Springs
    rotX: 0, rotVX: 0,
    rotY: 0, rotVY: 0,
    rotZ: 0, rotVZ: 0,

    // Expression Morph Weights (0 to 1)
    happyWeight: 0, vHappy: 0,
    sadWeight: 0,   vSad: 0,
    angryWeight: 0, vAngry: 0,

    // Mouth Smile Curvature (-1 sad to +1 happy)
    smileCurve: 0.35, vSmile: 0,

    frameTime: 0,
  });

  useEffect(() => {
    const s = stateRef.current;
    s.currentExpr = expression;
    s.glowColor = glowColor;
    s.targetMouse = mouseOffset;
  }, [expression, glowColor, mouseOffset]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // ── 1. Scene, Camera, Renderer ──
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0, 4.2);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(typeof window !== 'undefined' ? (window.devicePixelRatio || 2) : 2, 2.5));
    renderer.setSize(size, size);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    if ('outputColorSpace' in renderer) {
      renderer.outputColorSpace = THREE.SRGBColorSpace;
    }

    // ── 2. Studio Lighting Rig ──
    const ambientLight = new THREE.AmbientLight(0xFFFFFF, 1.6);
    scene.add(ambientLight);

    // Key Light (Top-Front-Left)
    const keyLight = new THREE.DirectionalLight(0xF0FDF4, 2.2);
    keyLight.position.set(3, 4, 5);
    scene.add(keyLight);

    // Mint Rim Light (Top-Right-Back)
    const rimLight = new THREE.PointLight(0x34D399, 3.2, 20);
    rimLight.position.set(3.5, 2.5, -2);
    scene.add(rimLight);

    // Fill Light (Bottom-Left)
    const fillLight = new THREE.DirectionalLight(0xA7F3D0, 1.4);
    fillLight.position.set(-3, -2, 3);
    scene.add(fillLight);

    // ── 3. Dynamic 3D Smile Texture (Plane attached to 3D Head) ──
    const faceCanvas = document.createElement('canvas');
    faceCanvas.width = 512;
    faceCanvas.height = 512;
    const faceCtx = faceCanvas.getContext('2d');

    const faceTexture = new THREE.CanvasTexture(faceCanvas);
    faceTexture.minFilter = THREE.LinearFilter;
    faceTexture.magFilter = THREE.LinearFilter;

    const facePlane = new THREE.Mesh(
      new THREE.PlaneGeometry(2.3, 2.3),
      new THREE.MeshBasicMaterial({
        map: faceTexture,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    );
    facePlane.position.set(0, -0.08, 1.18);

    // ── 4. Load & Center the 3D GLB Model ──
    let modelRoot = null;
    const loader = new GLTFLoader();

    loader.load(
      '/Physics-avatar.glb',
      (gltf) => {
        const root = gltf.scene;

        // Auto-center and normalize size
        const box = new THREE.Box3().setFromObject(root);
        const center = box.getCenter(new THREE.Vector3());
        const sizeVec = box.getSize(new THREE.Vector3());

        root.position.x -= center.x;
        root.position.y -= center.y;
        root.position.z -= center.z;

        // Scale model to fit camera viewport comfortably
        const maxDim = Math.max(sizeVec.x, sizeVec.y, sizeVec.z);
        if (maxDim > 0) {
          const scaleFactor = 2.4 / maxDim;
          root.scale.setScalar(scaleFactor);
        }

        // Enhance materials
        root.traverse((child) => {
          if (child.isMesh && child.material) {
            child.material.roughness = 0.65;
            child.material.metalness = 0.05;
            child.material.needsUpdate = true;
          }
        });

        // Wrapper group for clean center rotation
        const pivotGroup = new THREE.Group();
        pivotGroup.add(root);
        pivotGroup.add(facePlane);
        scene.add(pivotGroup);
        modelRoot = pivotGroup;

        setIsLoading(false);
      },
      (xhr) => {
        if (xhr.total > 0) {
          const pct = Math.round((xhr.loaded / xhr.total) * 100);
          setLoadProgress(pct);
        }
      },
      (error) => {
        console.error('Error loading Physics-avatar.glb:', error);
        setIsLoading(false);
      }
    );

    // ── 5. 60 FPS Animation Loop ──
    let animId;
    let lastTime = performance.now();

    const animate = (now) => {
      const dt = Math.min((now - lastTime) / 1000, 0.035);
      lastTime = now;
      const s = stateRef.current;
      s.frameTime += dt;
      const t = s.frameTime;

      // ── Spring Cursor Tracking ──
      const [mx, mvx] = updateSpring(s.mouse.x, s.mouseVel.x, s.targetMouse.x, 140, 16, dt);
      const [my, mvy] = updateSpring(s.mouse.y, s.mouseVel.y, s.targetMouse.y, 140, 16, dt);
      s.mouse.x = mx; s.mouseVel.x = mvx;
      s.mouse.y = my; s.mouseVel.y = mvy;

      // ── Expression Morph Weights ──
      const isHappy = s.currentExpr === 'happy';
      const isSad   = s.currentExpr === 'sad';
      const isAngry = s.currentExpr === 'angry';

      const [hw, hvw] = updateSpring(s.happyWeight, s.vHappy, isHappy ? 1 : 0, 130, 15, dt);
      const [sw, svw] = updateSpring(s.sadWeight, s.vSad, isSad ? 1 : 0, 130, 15, dt);
      const [aw, avw] = updateSpring(s.angryWeight, s.vAngry, isAngry ? 1 : 0, 130, 15, dt);
      s.happyWeight = hw; s.vHappy = hvw;
      s.sadWeight   = sw; s.vSad   = svw;
      s.angryWeight = aw; s.vAngry = avw;

      // Target Smile Curve: +1.0 (happy) | -0.65 (sad) | -0.15 (angry) | +0.4 (idle)
      let targetSmile = 0.4;
      if (isHappy) targetSmile = 1.0;
      else if (isSad) targetSmile = -0.65;
      else if (isAngry) targetSmile = -0.15;
      else if (s.currentExpr === 'drowsy') targetSmile = 0.2;

      const [sc, vsc] = updateSpring(s.smileCurve, s.vSmile, targetSmile, 120, 14, dt);
      s.smileCurve = sc; s.vSmile = vsc;

      // ── 3D Model Head Follow ──
      if (modelRoot) {
        let targetYaw = (s.mouse.x / 55) * 0.45;
        let targetPitch = (s.mouse.y / 55) * 0.35;
        let targetRoll = (s.mouse.x / 55) * 0.08;

        if (s.currentExpr === 'side_eye_left') {
          targetYaw = -0.55; targetPitch = 0.05;
        } else if (s.currentExpr === 'side_eye_right') {
          targetYaw = 0.55; targetPitch = 0.05;
        } else if (s.currentExpr === 'thinking') {
          targetYaw = 0.35; targetPitch = -0.30; targetRoll = 0.15;
        } else if (isSad) {
          targetPitch = 0.18; targetRoll = -0.06;
        } else if (isAngry) {
          targetPitch = -0.15;
        }

        const [rx, rvx] = updateSpring(s.rotX, s.rotVX, targetPitch, 120, 15, dt);
        const [ry, rvy] = updateSpring(s.rotY, s.rotVY, targetYaw, 120, 15, dt);
        const [rz, rvz] = updateSpring(s.rotZ, s.rotVZ, targetRoll, 120, 15, dt);
        s.rotX = rx; s.rotVX = rvx;
        s.rotY = ry; s.rotVY = rvy;
        s.rotZ = rz; s.rotVZ = rvz;

        modelRoot.rotation.x = s.rotX;
        modelRoot.rotation.y = s.rotY;
        modelRoot.rotation.z = -s.rotZ;

        // Organic Breathing Float
        const breathFloat = Math.sin(t * 2.2) * 0.06;
        modelRoot.position.y = breathFloat;

        const breathScale = 1 + Math.sin(t * 2.2) * 0.015;
        modelRoot.scale.set(breathScale, 1 / breathScale, breathScale);
      }

      // ── Render 2D Dynamic Smile Mouth on Face Texture ──
      faceCtx.clearRect(0, 0, 512, 512);
      drawSmileLine(faceCtx, 256, 335, s.smileCurve, s.happyWeight, s.sadWeight, s.angryWeight);
      faceTexture.needsUpdate = true;

      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      renderer.dispose();
      scene.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size]);

  return (
    <div
      ref={containerRef}
      className={`threed-avatar-container ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
      }}
      onClick={onClick}
    >
      <canvas
        ref={canvasRef}
        className="threed-avatar-canvas"
        style={{ width: `${size}px`, height: `${size}px` }}
      />
      {isLoading && (
        <div className="threed-avatar-loader">
          <div className="threed-spinner" />
          <span>Loading 3D Avatar {loadProgress > 0 ? `${loadProgress}%` : ''}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Draw Cute Small Smile Line (Mouth)
 */
function drawSmileLine(ctx, mx, my, curve, happyW, sadW, angryW) {
  ctx.save();
  ctx.translate(mx, my);

  // Width of small cute smile line
  const w = 26 + happyW * 14 - sadW * 4;
  // Curvature height offset
  const curveY = curve * 14;

  ctx.strokeStyle = '#122B1E';
  ctx.lineWidth = 3.6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(-w / 2, -curveY * 0.3);
  ctx.quadraticCurveTo(0, curveY, w / 2, -curveY * 0.3);
  ctx.stroke();

  // Subtle cute mouth corners on Happy state
  if (happyW > 0.25) {
    ctx.globalAlpha = happyW;
    ctx.fillStyle = '#122B1E';
    ctx.beginPath();
    ctx.arc(-w / 2, -curveY * 0.3 - 1, 2.0, 0, Math.PI * 2);
    ctx.arc(w / 2, -curveY * 0.3 - 1, 2.0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
