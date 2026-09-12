'use client';

import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Walkable forest clearing boundaries along the road
const FOREST_BOUNDS = {
  MIN_X: -3.8,
  MAX_X: 3.5,
  MIN_Z: -2.8,
  MAX_Z: 3.2,
};

// Avatars scaled to fit realistically into the forest (0.18 units tall)
const AVATAR_SCALE_HEIGHT = 0.18;

// Accurate Road Centerline Waypoints (sampled from mesh geometry)
export const ROAD_WAYPOINTS = [
  { x: 2.75, y: 0.03, z: -3.12 },
  { x: 2.42, y: -0.02, z: -2.75 },
  { x: 2.24, y: -0.04, z: -2.39 },
  { x: 2.06, y: -0.05, z: -2.21 },
  { x: 1.71, y: -0.03, z: -1.85 },
  { x: 1.52, y: 0.00, z: -1.50 },
  { x: 1.16, y: 0.01, z: -1.16 },
  { x: 0.96, y: 0.03, z: -0.81 },
  { x: 0.79, y: 0.03, z: -0.62 },
  { x: 0.44, y: 0.01, z: -0.25 },
  { x: 0.27, y: 0.06, z: 0.10 },
  { x: -0.09, y: 0.13, z: 0.28 },
  { x: -0.27, y: 0.13, z: 0.64 },
  { x: -0.45, y: 0.07, z: 1.00 }
];

// Dynamically computes actual road surface height at any (x, z) coordinates
export function getRoadSurfaceY(x, z) {
  let totalWeight = 0;
  let weightedY = 0;
  for (let i = 0; i < ROAD_WAYPOINTS.length; i++) {
    const wp = ROAD_WAYPOINTS[i];
    const d2 = (wp.x - x) * (wp.x - x) + (wp.z - z) * (wp.z - z);
    if (d2 < 0.0004) return wp.y;
    const w = 1 / Math.pow(d2, 1.5);
    weightedY += wp.y * w;
    totalWeight += w;
  }
  return totalWeight > 0 ? (weightedY / totalWeight) : 0.02;
}

// 4 Avatar companions starting right in front of camera in 2 pairs
export const AVATAR_CHARACTERS = [
  {
    id: 'bhageera',
    name: 'Bhageera',
    texture: '/avatar_blue.webp?v=7',
    color: '#f59e0b', // Amber Gold
    title: 'The Night Watcher',
    speed: 0.42,
    pairId: 0,
    startPos: new THREE.Vector3(2.40, getRoadSurfaceY(2.40, -2.70), -2.70),
    initialTarget: new THREE.Vector3(1.95, getRoadSurfaceY(1.95, -2.35), -2.35),
    role: 'NEAR',
  },
  {
    id: 'moana',
    name: 'Moana',
    texture: '/avatar_gold.webp?v=7',
    color: '#ef4444', // Neon Red
    title: 'The Trailblazer',
    speed: 0.46,
    pairId: 0,
    startPos: new THREE.Vector3(1.90, getRoadSurfaceY(1.90, -2.40), -2.40),
    initialTarget: new THREE.Vector3(2.35, getRoadSurfaceY(2.35, -2.05), -2.05),
    role: 'NEAR',
  },
  {
    id: 'belle',
    name: 'Belle',
    texture: '/avatar_red.webp?v=7',
    color: '#ec4899', // Neon Pink
    title: 'The Firefly Guide',
    speed: 0.40,
    pairId: 1,
    startPos: new THREE.Vector3(2.50, getRoadSurfaceY(2.50, -2.20), -2.20),
    initialTarget: new THREE.Vector3(2.05, getRoadSurfaceY(2.05, -2.75), -2.75),
    role: 'NEAR',
  },
  {
    id: 'mowgli',
    name: 'Mowgli',
    texture: '/avatar_purple.webp?v=7',
    color: '#40f71b', // Neon Green
    title: 'The Forest Scout',
    speed: 0.44,
    pairId: 1,
    startPos: new THREE.Vector3(1.70, getRoadSurfaceY(1.70, -2.00), -2.00),
    initialTarget: new THREE.Vector3(2.30, getRoadSurfaceY(2.30, -2.45), -2.45),
    role: 'NEAR',
  }
];

// Foreground road waypoints directly in front of camera (1.2m to 2.8m)
export const NEAR_ROAD_TARGETS = [
  { x: 2.50, z: -2.75 },
  { x: 2.20, z: -2.50 },
  { x: 1.85, z: -2.40 },
  { x: 2.40, z: -2.15 },
  { x: 2.05, z: -2.10 },
  { x: 1.70, z: -1.95 },
  { x: 2.25, z: -1.80 },
  { x: 2.60, z: -2.40 },
  { x: 1.95, z: -2.65 },
  { x: 2.35, z: -2.60 },
];

// Winding road waypoints deeper into the forest
export const FAR_ROAD_TARGETS = [
  { x: 1.50, z: -1.45 },
  { x: 1.15, z: -1.10 },
  { x: 0.85, z: -0.70 },
  { x: 0.50, z: -0.30 },
  { x: 0.20, z: 0.10 },
  { x: -0.15, z: 0.45 },
  { x: -0.40, z: 0.85 },
];

export const CAMERA_PRESETS_DATA = {
  road: {
    // Fixed Road Perspective: camera: [3.35, 0.38, -3.85], target: [-0.1, 0.3, 0.45]
    pos: new THREE.Vector3(3.35, 0.38, -3.85),
    target: new THREE.Vector3(-0.1, 0.30, 0.45),
  },
  front: {
    pos: new THREE.Vector3(-5.8, 1.70, 0.45),
    target: new THREE.Vector3(-0.1, 0.95, 0.45),
  },
  cinematic: {
    pos: new THREE.Vector3(-4.4, 0.70, -0.6),
    target: new THREE.Vector3(-0.2, 1.45, 0.45),
  },
  diorama: {
    pos: new THREE.Vector3(-5.5, 4.8, 3.2),
    target: new THREE.Vector3(0.0, 0.6, 0.1),
  },
  grove: {
    pos: new THREE.Vector3(0.2, 1.60, -5.4),
    target: new THREE.Vector3(-0.1, 0.90, 0.45),
  }
};

// Chooses a valid destination in the target pool that avoids colliding or clustering with other avatars
export function getValidDestination(pool, allEntities, currentPos) {
  let bestTarget = null;
  let bestScore = -Infinity;

  for (let attempt = 0; attempt < 8; attempt++) {
    const candidate = pool[Math.floor(Math.random() * pool.length)];
    const jx = (Math.random() - 0.5) * 0.22;
    const jz = (Math.random() - 0.5) * 0.22;
    const nx = candidate.x + jx;
    const nz = candidate.z + jz;

    // Check separation distance to all other avatars' current positions and target waypoints
    let minOtherDist = Infinity;
    if (allEntities && allEntities.length) {
      allEntities.forEach((other) => {
        if (other.currentPos !== currentPos) {
          const dPos = Math.hypot(nx - other.currentPos.x, nz - other.currentPos.z);
          const dTarget = other.targetPos ? Math.hypot(nx - other.targetPos.x, nz - other.targetPos.z) : Infinity;
          minOtherDist = Math.min(minOtherDist, dPos, dTarget);
        }
      });
    }

    const distFromSelf = currentPos ? Math.hypot(nx - currentPos.x, nz - currentPos.z) : 1.0;
    // Reward points with good separation from other avatars (> 0.45m) and sensible travel distance (> 0.4m)
    const score = minOtherDist + (distFromSelf > 0.4 ? 0.6 : -1.5);
    if (score > bestScore) {
      bestScore = score;
      bestTarget = new THREE.Vector3(nx, getRoadSurfaceY(nx, nz), nz);
    }
  }

  return bestTarget || new THREE.Vector3(pool[0].x, getRoadSurfaceY(pool[0].x, pool[0].z), pool[0].z);
}

// Intelligent Pair-based Roaming Coordinator:
// 1. Initial 9s: ALL 4 avatars roam in front of camera in distinct directions
// 2. Beyond 9s: 2 avatars ALWAYS remain roaming near the camera in foreground; other pair roams down the road and returns
export function getNextDestination(entity, allEntities, elapsedTime, pairState) {
  // Initial 9 seconds: ALL 4 companions stay in front of camera in NEAR zone
  if (elapsedTime < 9.0) {
    return getValidDestination(NEAR_ROAD_TARGETS, allEntities, entity.currentPos);
  }

  const activeNearPair = pairState ? pairState.activeNearPair : 0;
  const isNearPair = (entity.character.pairId === activeNearPair);

  if (isNearPair) {
    entity.role = 'NEAR';
    return getValidDestination(NEAR_ROAD_TARGETS, allEntities, entity.currentPos);
  } else {
    // Traveling pair: Explore along the winding road deeper into the forest, then loop back
    const camX = 3.35, camZ = -3.85;
    const distToCam = Math.hypot(entity.currentPos.x - camX, entity.currentPos.z - camZ);

    if (distToCam > 4.5 || entity.hasReachedFar) {
      // Reached the far road bend, now heading back towards near camera zone
      entity.hasReachedFar = true;
      return getValidDestination(NEAR_ROAD_TARGETS, allEntities, entity.currentPos);
    } else {
      // Heading out down the road
      return getValidDestination(FAR_ROAD_TARGETS, allEntities, entity.currentPos);
    }
  }
}

function drawRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function createNameSprite(name, colorHex) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 72;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = 'rgba(10, 16, 30, 0.88)';
  drawRoundRect(ctx, 16, 12, 224, 48, 24);
  ctx.fill();

  ctx.strokeStyle = colorHex;
  ctx.lineWidth = 4;
  drawRoundRect(ctx, 16, 12, 224, 48, 24);
  ctx.stroke();

  ctx.fillStyle = colorHex;
  ctx.beginPath();
  ctx.arc(44, 36, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = 'bold 24px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(name, 64, 36);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const spriteMaterial = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
  });
  const sprite = new THREE.Sprite(spriteMaterial);
  // Miniature floating name badge matching 0.18 avatar scale
  sprite.scale.set(0.28, 0.08, 1);
  sprite.position.set(0, AVATAR_SCALE_HEIGHT + 0.09, 0);
  return sprite;
}

function createAuraTexture(colorHex) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createRadialGradient(64, 64, 10, 64, 64, 60);
  grad.addColorStop(0, colorHex);
  grad.addColorStop(0.35, colorHex + '99');
  grad.addColorStop(0.7, colorHex + '33');
  grad.addColorStop(1, 'transparent');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(64, 64, 60, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

const LostAvatarsScene = forwardRef(function LostAvatarsScene({
  activePreset = 'road',
  zoomTrigger = null,
  heightTrigger = null,
  onLoaded,
  onProgress,
  onCameraUpdate
}, ref) {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const rendererRef = useRef(null);
  const avatarEntitiesRef = useRef([]);
  const animFrameIdRef = useRef(null);

  // Dynamic 2-pair roaming coordinator ensuring at least 2 avatars stay near the camera at all times
  const pairCoordinatorRef = useRef({
    activeNearPair: 0, // Pair 0 stays near camera, Pair 1 roams out first
    lastSwapTime: 0,
    pairCycleCount: 0,
  });

  // Transition state for smooth camera interpolation
  const transitionStateRef = useRef({
    isTransitioning: false,
    startPos: new THREE.Vector3(),
    endPos: new THREE.Vector3(),
    startTarget: new THREE.Vector3(),
    endTarget: new THREE.Vector3(),
    duration: 0.85,
    time: 0,
  });

  const startCameraTransition = (targetPos, targetLookAt) => {
    if (!cameraRef.current || !controlsRef.current) return;
    const tr = transitionStateRef.current;
    tr.startPos.copy(cameraRef.current.position);
    tr.endPos.copy(targetPos);
    tr.startTarget.copy(controlsRef.current.target);
    tr.endTarget.copy(targetLookAt);
    tr.time = 0;
    tr.duration = 0.85;
    tr.isTransitioning = true;
  };

  const zoomCamera = (delta) => {
    const cam = cameraRef.current;
    const controls = controlsRef.current;
    if (!cam || !controls) return;

    const target = controls.target;
    const dir = new THREE.Vector3().subVectors(cam.position, target);
    const len = dir.length();
    const newLen = THREE.MathUtils.clamp(len + delta, 2.2, 14.0);
    dir.normalize().multiplyScalar(newLen);
    cam.position.copy(target).add(dir);
    cam.lookAt(target);

    if (onCameraUpdate) {
      onCameraUpdate({
        pos: [Number(cam.position.x.toFixed(2)), Number(cam.position.y.toFixed(2)), Number(cam.position.z.toFixed(2))],
        target: [Number(target.x.toFixed(2)), Number(target.y.toFixed(2)), Number(target.z.toFixed(2))]
      });
    }
  };

  const adjustHeight = (delta) => {
    const cam = cameraRef.current;
    const controls = controlsRef.current;
    if (!cam || !controls) return;

    // Shift camera height and look target height together along road level
    const newCamY = Math.max(0.24, Math.min(cam.position.y + delta, 3.5));
    const newTargetY = Math.max(0.14, Math.min(controls.target.y + delta, 2.5));
    cam.position.y = newCamY;
    controls.target.y = newTargetY;
    cam.lookAt(controls.target);

    if (onCameraUpdate) {
      onCameraUpdate({
        pos: [Number(cam.position.x.toFixed(2)), Number(cam.position.y.toFixed(2)), Number(cam.position.z.toFixed(2))],
        target: [Number(controls.target.x.toFixed(2)), Number(controls.target.y.toFixed(2)), Number(controls.target.z.toFixed(2))]
      });
    }
  };

  // Direct React Prop Watcher for activePreset changes
  useEffect(() => {
    const controls = controlsRef.current;
    const camera = cameraRef.current;
    if (!controls || !camera) return;

    if (activePreset === 'orbit') {
      controls.enabled = true;
      controls.enableRotate = true;
      controls.enableZoom = true;
      controls.enablePan = true;
      transitionStateRef.current.isTransitioning = false;
    } else {
      controls.enabled = false;
      const preset = CAMERA_PRESETS_DATA[activePreset];
      if (preset) {
        startCameraTransition(preset.pos, preset.target);
      }
    }
  }, [activePreset]);

  // Direct React Prop Watcher for zoom actions
  useEffect(() => {
    if (!zoomTrigger || typeof zoomTrigger.delta !== 'number') return;
    zoomCamera(zoomTrigger.delta);
  }, [zoomTrigger]);

  // Direct React Prop Watcher for height adjust actions
  useEffect(() => {
    if (!heightTrigger || typeof heightTrigger.delta !== 'number') return;
    adjustHeight(heightTrigger.delta);
  }, [heightTrigger]);

  useImperativeHandle(ref, () => ({
    setPreset: (presetId) => {
      const controls = controlsRef.current;
      if (!controls || !cameraRef.current) return;

      if (presetId === 'orbit') {
        controls.enabled = true;
        controls.enableRotate = true;
        controls.enableZoom = true;
        controls.enablePan = true;
      } else {
        controls.enabled = false;
        const preset = CAMERA_PRESETS_DATA[presetId];
        if (preset) {
          startCameraTransition(preset.pos, preset.target);
        }
      }
    },
    zoomCamera,
    adjustHeight,
    getCoordinates: () => {
      if (!cameraRef.current || !controlsRef.current) return null;
      return {
        pos: [Number(cameraRef.current.position.x.toFixed(2)), Number(cameraRef.current.position.y.toFixed(2)), Number(cameraRef.current.position.z.toFixed(2))],
        target: [Number(controlsRef.current.target.x.toFixed(2)), Number(controlsRef.current.target.y.toFixed(2)), Number(controlsRef.current.target.z.toFixed(2))]
      };
    }
  }));

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || window.innerHeight;

    // 1. Scene & Atmospheric Fog
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060a14);
    scene.fog = new THREE.FogExp2(0x060a14, 0.032);
    sceneRef.current = scene;

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    cameraRef.current = camera;

    // 3. WebGL Renderer (capped at 1.25 pixel ratio for maximum performance)
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
      stencil: false,
      depth: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.shadowMap.enabled = false;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Orbit Controls (default locked, unlocked in Orbit preset)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enabled = false;
    controls.enableRotate = false;
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI / 2 + 0.05;
    controls.minDistance = 2.0;
    controls.maxDistance = 16.0;
    controlsRef.current = controls;

    // Initial camera position: User chosen Road view zoomed in
    const initPreset = CAMERA_PRESETS_DATA[activePreset] || CAMERA_PRESETS_DATA.road;
    camera.position.copy(initPreset.pos);
    camera.lookAt(initPreset.target);
    controls.target.copy(initPreset.target);
    camera.updateProjectionMatrix();

    if (onCameraUpdate) {
      onCameraUpdate({
        pos: [Number(initPreset.pos.x.toFixed(2)), Number(initPreset.pos.y.toFixed(2)), Number(initPreset.pos.z.toFixed(2))],
        target: [Number(initPreset.target.x.toFixed(2)), Number(initPreset.target.y.toFixed(2)), Number(initPreset.target.z.toFixed(2))]
      });
    }

    // 5. Enhanced Atmospheric Night Lighting
    const hemiLight = new THREE.HemisphereLight(0xbae6fd, 0x1e293b, 1.4);
    scene.add(hemiLight);

    const ambientLight = new THREE.AmbientLight(0x334155, 1.8);
    scene.add(ambientLight);

    const frontKeyLight = new THREE.DirectionalLight(0x93c5fd, 2.2);
    frontKeyLight.position.set(6, 7, -3);
    scene.add(frontKeyLight);

    const moonLight = new THREE.DirectionalLight(0x60a5fa, 1.6);
    moonLight.position.set(-4, 14, 8);
    scene.add(moonLight);

    const roadGlow = new THREE.PointLight(0x38bdf8, 2.5, 16);
    roadGlow.position.set(1.0, 2.0, -1.0);
    scene.add(roadGlow);

    // 6. Model Loading
    const gltfLoader = new GLTFLoader();
    const textureLoader = new THREE.TextureLoader();

    let modelsToLoad = 2;
    const checkDone = () => {
      modelsToLoad--;
      if (modelsToLoad <= 0 && onLoaded) {
        onLoaded();
      }
    };

    // Load Batched Forest Model with road trees removed and alpha transparency intact
    gltfLoader.load(
      '/a_forest_3_with_a_road_at_night_for_game_opt.glb?v=road_opened_v4',
      (gltf) => {
        const forestScene = gltf.scene;
        forestScene.traverse((child) => {
          if (child.isMesh) {
            child.matrixAutoUpdate = false;
            child.updateMatrix();
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach((mat) => {
              if (mat) {
                if (mat.name === 'Material' || mat.name.toLowerCase().includes('leaf') || mat.name.toLowerCase().includes('tree')) {
                  mat.transparent = true;
                  mat.alphaTest = 0.22;
                  mat.depthWrite = true;
                  mat.side = THREE.DoubleSide;
                  mat.roughness = 0.65;
                  mat.needsUpdate = true;
                } else {
                  mat.roughness = 0.8;
                }
              }
            });
          }
        });
        scene.add(forestScene);
        checkDone();
      },
      (xhr) => {
        if (xhr.total > 0 && onProgress) {
          onProgress(Math.round((xhr.loaded / xhr.total) * 70));
        }
      },
      (err) => {
        console.warn('Fallback loading forest:', err);
        gltfLoader.load('/a_forest_3_with_a_road_at_night_for_game.glb', (fallbackGltf) => {
          scene.add(fallbackGltf.scene);
          checkDone();
        });
      }
    );

    // Load and instantiate the 4 avatars with significantly reduced size (0.18 units)
    gltfLoader.load(
      '/Physics-avatar-opt.glb',
      (avatarGltf) => {
        const masterAvatar = avatarGltf.scene;

        AVATAR_CHARACTERS.forEach((char) => {
          const avatarClone = masterAvatar.clone(true);

          const box = new THREE.Box3().setFromObject(avatarClone);
          const center = box.getCenter(new THREE.Vector3());
          const sizeVec = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(sizeVec.x, sizeVec.y, sizeVec.z);
          const scale = maxDim > 0 ? (AVATAR_SCALE_HEIGHT / maxDim) : 1;

          // Feet placed at y = 0
          avatarClone.scale.setScalar(scale);
          avatarClone.position.x = -center.x * scale;
          avatarClone.position.y = -box.min.y * scale;
          avatarClone.position.z = -center.z * scale;

          textureLoader.load(char.texture, (tex) => {
            tex.flipY = false;
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.needsUpdate = true;

            avatarClone.traverse((child) => {
              if (child.isMesh && child.material) {
                child.material = child.material.clone();
                child.material.map = tex;
                child.material.color.set('#FFFFFF');
                child.material.roughness = 0.65;
                child.material.metalness = 0.08;
                child.material.emissive = new THREE.Color(char.color);
                child.material.emissiveIntensity = 0.45;
                child.material.needsUpdate = true;
              }
            });
          });

          const avatarRoot = new THREE.Group();
          avatarRoot.add(avatarClone);

          // Subtle colored point light
          const pointLight = new THREE.PointLight(char.color, 1.3, 1.8);
          pointLight.position.set(0, AVATAR_SCALE_HEIGHT * 0.5, 0);
          avatarRoot.add(pointLight);

          // Subtle contact aura on ground (0.35m)
          const auraGeo = new THREE.PlaneGeometry(0.35, 0.35);
          const auraMat = new THREE.MeshBasicMaterial({
            map: createAuraTexture(char.color),
            transparent: true,
            opacity: 0.40,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide
          });
          const auraMesh = new THREE.Mesh(auraGeo, auraMat);
          auraMesh.rotation.x = -Math.PI / 2;
          auraMesh.position.y = 0.015;
          avatarRoot.add(auraMesh);

          // Overhead floating name banner
          const nameSprite = createNameSprite(char.name, char.color);
          avatarRoot.add(nameSprite);

          // Initial placement in front of camera
          const currentPos = char.startPos.clone();
          avatarRoot.position.copy(currentPos);
          scene.add(avatarRoot);

          const targetPos = (char.initialTarget || char.startPos).clone();
          const initialHeading = Math.atan2(
            targetPos.x - currentPos.x,
            targetPos.z - currentPos.z
          );
          avatarRoot.rotation.y = initialHeading;

          avatarEntitiesRef.current.push({
            character: char,
            group: avatarRoot,
            avatarMesh: avatarClone,
            pointLight,
            state: 'WALKING',
            idleTimer: 0,
            currentPos,
            targetPos,
            speed: char.speed,
            heading: initialHeading,
            bobOffset: Math.random() * Math.PI * 2,
            role: char.role || 'NEAR',
            hasReachedFar: false,
          });
        });
        checkDone();
      },
      undefined,
      (err) => {
        console.error('Failed to load avatar GLB:', err);
        checkDone();
      }
    );

    // 7. High Performance Animation Loop
    let clock = new THREE.Clock();
    let lastUpdateMs = 0;

    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.1);
      const time = clock.getElapsedTime();
      const now = performance.now();

      // Camera Smooth Interpolation
      if (transitionStateRef.current.isTransitioning) {
        const tr = transitionStateRef.current;
        tr.time += delta;
        const progress = Math.min(tr.time / tr.duration, 1.0);
        const t = 1 - Math.pow(1 - progress, 3);

        camera.position.lerpVectors(tr.startPos, tr.endPos, t);
        controls.target.lerpVectors(tr.startTarget, tr.endTarget, t);
        camera.lookAt(controls.target);

        if (progress >= 1.0) {
          tr.isTransitioning = false;
          camera.position.copy(tr.endPos);
          controls.target.copy(tr.endTarget);
          camera.lookAt(controls.target);
        }

        // Throttle telemetry updates to at most 10Hz to preserve 60 FPS
        if (now - lastUpdateMs > 100) {
          lastUpdateMs = now;
          if (onCameraUpdate) {
            onCameraUpdate({
              pos: [Number(camera.position.x.toFixed(2)), Number(camera.position.y.toFixed(2)), Number(camera.position.z.toFixed(2))],
              target: [Number(controls.target.x.toFixed(2)), Number(controls.target.y.toFixed(2)), Number(controls.target.z.toFixed(2))]
            });
          }
        }
      } else if (controls.enabled) {
        controls.update();
        if (now - lastUpdateMs > 100) {
          lastUpdateMs = now;
          if (onCameraUpdate) {
            onCameraUpdate({
              pos: [Number(camera.position.x.toFixed(2)), Number(camera.position.y.toFixed(2)), Number(camera.position.z.toFixed(2))],
              target: [Number(controls.target.x.toFixed(2)), Number(controls.target.y.toFixed(2)), Number(controls.target.z.toFixed(2))]
            });
          }
        }
      }

      // Pair Lifecycle Coordinator:
      // When traveling pair has explored the road and returned to the near-camera area,
      // perform a hand-off so the other pair takes a turn exploring while this pair stays!
      if (time >= 8.5) {
        const pState = pairCoordinatorRef.current;
        const travelingPairId = 1 - pState.activeNearPair;
        const travelAvatars = avatarEntitiesRef.current.filter((e) => e.character.pairId === travelingPairId);

        const allReturned = travelAvatars.length > 0 && travelAvatars.every((e) => {
          const dCam = Math.hypot(e.currentPos.x - 3.35, e.currentPos.z - (-3.85));
          return e.hasReachedFar && dCam < 2.65;
        });

        const timeSinceSwap = time - pState.lastSwapTime;
        if ((allReturned && timeSinceSwap > 12.0) || timeSinceSwap > 28.0) {
          pState.activeNearPair = travelingPairId;
          pState.lastSwapTime = time;
          pState.pairCycleCount++;

          // Reset far flags and update roles
          avatarEntitiesRef.current.forEach((e) => {
            if (e.character.pairId === pState.activeNearPair) {
              e.role = 'NEAR';
              e.hasReachedFar = false;
              if (e.state === 'WALKING' && Math.hypot(e.targetPos.x - 3.35, e.targetPos.z - (-3.85)) > 3.0) {
                e.targetPos = getValidDestination(NEAR_ROAD_TARGETS, avatarEntitiesRef.current, e.currentPos);
              }
            } else {
              e.role = 'FAR';
              e.hasReachedFar = false;
            }
          });

          // Reshuffle companions every 2 cycles for dynamic variety
          if (pState.pairCycleCount % 2 === 0) {
            const pairPatterns = [
              [0, 0, 1, 1],
              [0, 1, 0, 1],
              [0, 1, 1, 0],
            ];
            const pattern = pairPatterns[Math.floor(Math.random() * pairPatterns.length)];
            avatarEntitiesRef.current.forEach((e, idx) => {
              e.character.pairId = pattern[idx];
            });
          }
        }
      }

      // 1. Avatar Movement with Anticipatory Steering Avoidance
      avatarEntitiesRef.current.forEach((entity, i) => {
        if (entity.state === 'WALKING') {
          const dx = entity.targetPos.x - entity.currentPos.x;
          const dz = entity.targetPos.z - entity.currentPos.z;
          const distToTarget = Math.hypot(dx, dz);

          if (distToTarget < 0.12) {
            entity.state = 'IDLE';
            // Playful brief pause between walks (0.8s to 1.8s)
            entity.idleTimer = 0.8 + Math.random() * 1.0;
          } else {
            let dirX = distToTarget > 0.001 ? dx / distToTarget : 0;
            let dirZ = distToTarget > 0.001 ? dz / distToTarget : 0;

            // Anticipatory collision avoidance: sense other avatars within AVOID_RADIUS (0.52m)
            const AVOID_RADIUS = 0.52;
            avatarEntitiesRef.current.forEach((other, j) => {
              if (i === j) return;
              const edx = entity.currentPos.x - other.currentPos.x;
              const edz = entity.currentPos.z - other.currentPos.z;
              const dist = Math.hypot(edx, edz);

              if (dist < AVOID_RADIUS && dist > 0.0001) {
                const awayX = edx / dist;
                const awayZ = edz / dist;
                // Lateral steering perpendicular to encounter line (forces avatars to pass on separate sides)
                const perpX = -awayZ;
                const perpZ = awayX;
                const factor = Math.pow((AVOID_RADIUS - dist) / AVOID_RADIUS, 1.2);
                dirX += (awayX * 0.8 + perpX * 1.5) * factor;
                dirZ += (awayZ * 0.8 + perpZ * 1.5) * factor;
              }
            });

            const moveLen = Math.hypot(dirX, dirZ);
            if (moveLen > 0.001) {
              dirX /= moveLen;
              dirZ /= moveLen;
            }

            const step = Math.min(distToTarget, entity.speed * delta);
            entity.currentPos.x += dirX * step;
            entity.currentPos.z += dirZ * step;

            const targetAngle = Math.atan2(dirX, dirZ);
            let angleDiff = targetAngle - entity.heading;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            entity.heading += angleDiff * 0.12;
            entity.group.rotation.y = entity.heading;

            // Dynamically ground avatar feet onto the actual road surface
            const roadY = getRoadSurfaceY(entity.currentPos.x, entity.currentPos.z);
            const hopY = Math.abs(Math.sin(time * 5.2 + entity.bobOffset)) * 0.006;
            entity.group.position.set(
              entity.currentPos.x,
              roadY + hopY,
              entity.currentPos.z
            );

            if (entity.avatarMesh) {
              entity.avatarMesh.rotation.z = Math.sin(time * 5.2 + entity.bobOffset) * 0.025;
              entity.avatarMesh.rotation.x = Math.sin(time * 7.0 + entity.bobOffset) * 0.018;
              entity.avatarMesh.rotation.y = 0;
            }
          }
        } else if (entity.state === 'IDLE') {
          entity.idleTimer -= delta;

          const roadY = getRoadSurfaceY(entity.currentPos.x, entity.currentPos.z);
          const idleHop = Math.sin(time * 2.0 + entity.bobOffset) * 0.0025;
          entity.group.position.set(
            entity.currentPos.x,
            roadY + idleHop,
            entity.currentPos.z
          );

          if (entity.avatarMesh) {
            entity.avatarMesh.rotation.y = Math.sin(time * 1.6 + entity.bobOffset) * 0.16;
            entity.avatarMesh.rotation.z = 0;
            entity.avatarMesh.rotation.x = 0;
          }

          if (entity.idleTimer <= 0) {
            entity.targetPos = getNextDestination(entity, avatarEntitiesRef.current, time, pairCoordinatorRef.current);
            entity.state = 'WALKING';
          }
        }

        if (entity.pointLight) {
          entity.pointLight.intensity = 1.3 + Math.sin(time * 2.8 + entity.bobOffset) * 0.25;
        }
      });

      // 2. Physical Collision Resolution & Deflection (Guarantees zero mesh penetration / merging):
      const MIN_SEPARATION = 0.28;
      for (let iter = 0; iter < 2; iter++) {
        for (let i = 0; i < avatarEntitiesRef.current.length; i++) {
          for (let j = i + 1; j < avatarEntitiesRef.current.length; j++) {
            const eA = avatarEntitiesRef.current[i];
            const eB = avatarEntitiesRef.current[j];
            const edx = eA.currentPos.x - eB.currentPos.x;
            const edz = eA.currentPos.z - eB.currentPos.z;
            const dist = Math.hypot(edx, edz);

            if (dist < MIN_SEPARATION && dist > 0.0001) {
              const overlap = (MIN_SEPARATION - dist) * 0.5;
              const nx = edx / dist;
              const nz = edz / dist;

              // Separate bodies immediately so they never merge into each other
              eA.currentPos.x += nx * overlap;
              eA.currentPos.z += nz * overlap;
              eB.currentPos.x -= nx * overlap;
              eB.currentPos.z -= nz * overlap;

              // If moving towards each other, steer headings outwards in separate ways
              const dotHeadings = Math.cos(eA.heading - eB.heading);
              if (dotHeadings < -0.1) {
                eA.heading += 0.25;
                eB.heading -= 0.25;
                eA.group.rotation.y = eA.heading;
                eB.group.rotation.y = eB.heading;
              }

              // Update ground Y immediately after separation
              const roadYA = getRoadSurfaceY(eA.currentPos.x, eA.currentPos.z);
              const roadYB = getRoadSurfaceY(eB.currentPos.x, eB.currentPos.z);
              eA.group.position.x = eA.currentPos.x;
              eA.group.position.y = roadYA;
              eA.group.position.z = eA.currentPos.z;
              eB.group.position.x = eB.currentPos.x;
              eB.group.position.y = roadYB;
              eB.group.position.z = eB.currentPos.z;
            }
          }
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    // 8. Handle Window Resize
    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      const newW = container.clientWidth || window.innerWidth;
      const newH = container.clientHeight || window.innerHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [onLoaded, onProgress, onCameraUpdate]);

  return (
    <div
      ref={containerRef}
      className="lost-avatars-canvas-container"
    />
  );
});

export default LostAvatarsScene;
