'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import './ThreeDPhysicsAvatar.css';

/**
 * ThreeDAvatar — Ultra-Optimized 3D Avatar (Zero Loading Flash)
 *
 * Avatars matching Home Page Squad:
 *  1. Emerald (Mowgli)   — Physics Lab   (#2dd4bf / avatar_green.webp)
 *  2. Blue (Belle)       — Chemistry Lab (#38bdf8 / avatar_blue.webp)
 *  3. Pink (Moana)       — Biology Lab   (#f472b6 / avatar_pink.webp)
 *  4. Gold (Bagheera)    — Math Lab      (#facc15 / avatar_gold.webp)
 */

const DB_NAME = 'Vedika3DModelCache';
const DB_VERSION = 1;
const STORE_NAME = 'glb_models';
const MODEL_URL = '/Physics-avatar-opt.glb';

function openIndexedDB() {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return resolve(null);
    }
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = () => resolve(null);
  });
}

async function getCachedArrayBuffer(db, key) {
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function setCachedArrayBuffer(db, key, buffer) {
  if (!db) return;
  try {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(buffer, key);
  } catch {}
}

let cachedGltfData = null;
let gltfLoadingPromise = null;

export function loadGLBModelOptimized() {
  if (cachedGltfData) {
    return Promise.resolve(cachedGltfData);
  }
  if (gltfLoadingPromise) {
    return gltfLoadingPromise;
  }

  gltfLoadingPromise = (async () => {
    const loader = new GLTFLoader();
    const db = await openIndexedDB();

    // 1. Instant check in IndexedDB (0ms local disk cache)
    const cachedBuffer = await getCachedArrayBuffer(db, MODEL_URL);
    if (cachedBuffer) {
      return new Promise((resolve, reject) => {
        loader.parse(
          cachedBuffer,
          '',
          (gltf) => {
            cachedGltfData = gltf;
            resolve(gltf);
          },
          (err) => reject(err)
        );
      });
    }

    // 2. Fetch lightweight 90% compressed asset & cache to IndexedDB
    try {
      const res = await fetch(MODEL_URL);
      const arrayBuffer = await res.arrayBuffer();
      setCachedArrayBuffer(db, MODEL_URL, arrayBuffer);

      return new Promise((resolve, reject) => {
        loader.parse(
          arrayBuffer,
          '',
          (gltf) => {
            cachedGltfData = gltf;
            resolve(gltf);
          },
          (err) => reject(err)
        );
      });
    } catch (err) {
      gltfLoadingPromise = null;
      throw err;
    }
  })();

  return gltfLoadingPromise;
}

// 2nd-order spring physics
function updateSpring(val, vel, target, stiffness, damping, dt) {
  const force = (target - val) * stiffness;
  const damp = -vel * damping;
  const nVel = vel + (force + damp) * dt;
  const nVal = val + nVel * dt;
  return [nVal, nVel];
}

export default function ThreeDAvatar({
  expression = 'idle',
  glowColor = '#2dd4bf',
  modelColor = '#FFFFFF',
  textureUrl = null,
  size = 250,
  mouseOffset = { x: 0, y: 0 },
  isSpeaking = false,
  className = '',
  onLoaded,
  onClick,
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const onLoadedRef = useRef(onLoaded);
  onLoadedRef.current = onLoaded;

  const stateRef = useRef({
    currentExpr: expression,
    glowColor,
    modelColor,
    textureUrl,
    targetMouse: mouseOffset,
    mouse: { x: 0, y: 0 },
    mouseVel: { x: 0, y: 0 },
    isSpeaking,

    // 3D Model Rotation Springs
    rotX: 0, rotVX: 0,
    rotY: 0, rotVY: 0,
    rotZ: 0, rotVZ: 0,

    // Expression Morph Weights
    happyWeight: 0, vHappy: 0,
    sadWeight: 0,   vSad: 0,
    angryWeight: 0, vAngry: 0,

    // Mouth Smile Curvature
    smileCurve: 0.35, vSmile: 0,
    mouthOpen: 0,

    frameTime: 0,
  });

  useEffect(() => {
    const s = stateRef.current;
    s.currentExpr = expression;
    s.glowColor = glowColor;
    s.modelColor = modelColor;
    s.textureUrl = textureUrl;
    s.targetMouse = mouseOffset;
    s.isSpeaking = isSpeaking;
  }, [expression, glowColor, modelColor, textureUrl, mouseOffset, isSpeaking]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let isDisposed = false;

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
    renderer.setPixelRatio(Math.min(typeof window !== 'undefined' ? (window.devicePixelRatio || 2) : 2, 2.0));
    renderer.setSize(size, size);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    if ('outputColorSpace' in renderer) {
      renderer.outputColorSpace = THREE.SRGBColorSpace;
    }

    // ── 2. Studio Lighting Rig ──
    const themeColor = new THREE.Color(glowColor || '#2dd4bf');

    const ambientLight = new THREE.AmbientLight(0xFFFFFF, 1.6);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xF8FAFC, 2.2);
    keyLight.position.set(3, 4, 5);
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(themeColor, 3.8, 20);
    rimLight.position.set(3.5, 2.5, -2);
    scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight(themeColor, 1.6);
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

    // ── 4. Load & Setup Optimized Cached 3D Model ──
    let modelRoot = null;

    loadGLBModelOptimized()
      .then((gltf) => {
        if (isDisposed) return;

        // Clone model from memory cache instantly
        const root = gltf.scene.clone(true);

        const box = new THREE.Box3().setFromObject(root);
        const center = box.getCenter(new THREE.Vector3());
        const sizeVec = box.getSize(new THREE.Vector3());

        root.position.x -= center.x;
        root.position.y -= center.y;
        root.position.z -= center.z;

        const maxDim = Math.max(sizeVec.x, sizeVec.y, sizeVec.z);
        if (maxDim > 0) {
          const scaleFactor = 2.4 / maxDim;
          root.scale.setScalar(scaleFactor);
        }

        let texMap = null;
        if (textureUrl) {
          const loader = new THREE.TextureLoader();
          texMap = loader.load(textureUrl);
          texMap.flipY = false;
          texMap.colorSpace = THREE.SRGBColorSpace;
        }

        root.traverse((child) => {
          if (child.isMesh && child.material) {
            child.material = child.material.clone();
            if (texMap) {
              child.material.map = texMap;
              child.material.color = new THREE.Color(0xffffff);
            } else if (modelColor && modelColor !== '#FFFFFF') {
              child.material.color = new THREE.Color(modelColor);
            }
            child.material.roughness = 0.45;
            child.material.metalness = 0.08;
            child.material.needsUpdate = true;
          }
        });

        const pivotGroup = new THREE.Group();
        pivotGroup.add(root);
        pivotGroup.add(facePlane);
        scene.add(pivotGroup);
        modelRoot = pivotGroup;

        onLoadedRef.current?.();
      })
      .catch((err) => {
        console.error('Error loading optimized GLB model:', err);
        onLoadedRef.current?.();
      });

    // ── 5. 60 FPS Animation Loop ──
    let animId;
    let lastTime = performance.now();

    const animate = (now) => {
      const dt = Math.min((now - lastTime) / 1000, 0.035);
      lastTime = now;
      const s = stateRef.current;
      s.frameTime += dt;
      const t = s.frameTime;

      // Spring Cursor Tracking
      const [mx, mvx] = updateSpring(s.mouse.x, s.mouseVel.x, s.targetMouse.x, 140, 16, dt);
      const [my, mvy] = updateSpring(s.mouse.y, s.mouseVel.y, s.targetMouse.y, 140, 16, dt);
      s.mouse.x = mx; s.mouseVel.x = mvx;
      s.mouse.y = my; s.mouseVel.y = mvy;

      // Expression Morph Weights
      const isHappy = s.currentExpr === 'happy' || s.isSpeaking;
      const isSad   = s.currentExpr === 'sad' && !s.isSpeaking;
      const isAngry = s.currentExpr === 'angry' && !s.isSpeaking;

      const [hw, hvw] = updateSpring(s.happyWeight, s.vHappy, isHappy ? 1 : 0, 130, 15, dt);
      const [sw, svw] = updateSpring(s.sadWeight, s.vSad, isSad ? 1 : 0, 130, 15, dt);
      const [aw, avw] = updateSpring(s.angryWeight, s.vAngry, isAngry ? 1 : 0, 130, 15, dt);
      s.happyWeight = hw; s.vHappy = hvw;
      s.sadWeight   = sw; s.vSad   = svw;
      s.angryWeight = aw; s.vAngry = avw;

      // Subtle breathing float & talking bounce
      if (modelRoot) {
        const floatOffset = Math.sin(t * 2.2) * 0.04;
        const talkOffset  = s.isSpeaking ? Math.abs(Math.sin(t * 14.0)) * 0.08 : 0;
        modelRoot.position.y = floatOffset + talkOffset;

        // Target Euler rotations
        let targetRotX = (s.mouse.y / 100) * 0.45;
        let targetRotY = (s.mouse.x / 100) * 0.65;
        let targetRotZ = 0;

        if (s.currentExpr === 'side_eye_right') targetRotY += 0.35;
        if (s.currentExpr === 'side_eye_left')  targetRotY -= 0.35;
        if (s.currentExpr === 'thinking') { targetRotZ = -0.15; targetRotX -= 0.12; }

        const [rx, rvx] = updateSpring(s.rotX, s.rotVX, targetRotX, 100, 14, dt);
        const [ry, rvy] = updateSpring(s.rotY, s.rotVY, targetRotY, 100, 14, dt);
        const [rz, rvz] = updateSpring(s.rotZ, s.rotVZ, targetRotZ, 100, 14, dt);
        s.rotX = rx; s.rotVX = rvx;
        s.rotY = ry; s.rotVY = rvy;
        s.rotZ = rz; s.rotVZ = rvz;

        modelRoot.rotation.x = s.rotX;
        modelRoot.rotation.y = s.rotY;
        modelRoot.rotation.z = s.rotZ;
      }

      // Draw dynamic 2D face elements onto canvas texture
      faceCtx.clearRect(0, 0, 512, 512);

      // Speaking mouth open oscillation
      let targetMouth = 0;
      if (s.isSpeaking) {
        targetMouth = (Math.sin(t * 18.0) * 0.5 + 0.5) * 28;
      }
      s.mouthOpen += (targetMouth - s.mouthOpen) * 0.35;

      // Draw subtle mouth on face plane
      faceCtx.save();
      faceCtx.translate(256, 305);
      faceCtx.beginPath();
      faceCtx.lineWidth = 9;
      faceCtx.strokeStyle = 'rgba(20, 24, 35, 0.75)';
      faceCtx.lineCap = 'round';

      if (s.mouthOpen > 2) {
        faceCtx.fillStyle = 'rgba(20, 24, 35, 0.85)';
        faceCtx.beginPath();
        faceCtx.ellipse(0, 0, 24, s.mouthOpen, 0, 0, Math.PI * 2);
        faceCtx.fill();
      } else {
        const smile = (s.happyWeight - s.sadWeight) * 22;
        faceCtx.beginPath();
        faceCtx.moveTo(-28, -smile * 0.3);
        faceCtx.quadraticCurveTo(0, smile + 6, 28, -smile * 0.3);
        faceCtx.stroke();
      }
      faceCtx.restore();

      faceTexture.needsUpdate = true;

      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);

    return () => {
      isDisposed = true;
      if (animId) cancelAnimationFrame(animId);
      renderer.dispose();
    };
  }, [glowColor, modelColor, textureUrl, size]);

  return (
    <div
      ref={containerRef}
      className={`relative inline-block select-none ${className}`}
      style={{ width: size, height: size }}
      onClick={onClick}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block cursor-pointer"
        style={{ width: size, height: size }}
      />
    </div>
  );
}
