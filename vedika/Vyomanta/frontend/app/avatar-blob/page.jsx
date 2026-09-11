'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Eye, 
  Sliders, 
  Layers, 
  Sparkles, 
  Activity, 
  Camera, 
  Palette, 
  Check, 
  Copy,
  RotateCw,
  Compass,
  Wind
} from 'lucide-react';
import './avatar-blob.css';

// ── 4 Reference Avatars matching user photo (media_1788769466961.png) ──
const AVATARS = [
  { 
    id: 'mowgli', 
    legacyId: 'purple',
    name: 'Mowgli', 
    character: 'Mint Pom-Pom',
    color: '#14b8a6', 
    tipColor: '#5eead4',
    irisColor: '#0d9488',
    quote: 'Hey there! 👋',
    texture: '/avatar_1_purple.webp' 
  },
  { 
    id: 'belle', 
    legacyId: 'red',
    name: 'Belle', 
    character: 'Sky Pom-Pom',
    color: '#3b82f6', 
    tipColor: '#93c5fd',
    irisColor: '#1d4ed8',
    quote: 'What shall we build today? 💡',
    texture: '/avatar_2_lime.webp' 
  },
  { 
    id: 'moana', 
    legacyId: 'olive',
    name: 'Moana', 
    character: 'Magenta Pom-Pom',
    color: '#d946ef', 
    tipColor: '#f0abfc',
    irisColor: '#a21caf',
    quote: 'Puzzles? I love a good challenge! 🧩',
    texture: '/avatar_3_red.webp' 
  },
  { 
    id: 'bhageera', 
    legacyId: 'blue',
    name: 'Bhageera', 
    character: 'Golden Wheat Pom-Pom',
    color: '#d4a373', 
    tipColor: '#fef08a',
    irisColor: '#92400e',
    quote: "Let's go on an adventure! ✨",
    texture: '/avatar_4_blue.webp' 
  },
];

export const TEXTURE_PRESETS = [
  {
    id: 'smooth-velvet',
    icon: '🧸',
    name: 'Smooth Velvet Plush',
    subtitle: 'Silky Combed Fuzz (No Holes)',
    desc: 'Continuous smooth velvety surface with soft peach-fuzz rim halo, fine combed micro-fibers, and zero porous holes',
    bumpScale: 0.018,
    roughness: 0.75,
    sheen: 1.45,
    clearcoat: 0.0,
    furLength: 0.08,
    furDensity: 4.5,
    fuzzStrength: 0.85,
    useFurShells: true,
  },
  {
    id: 'silky-micro',
    icon: '☁️',
    name: 'Silky Micro-Fur',
    subtitle: 'Fine Cloud Fuzz',
    desc: 'Ultra-fine soft micro-fibers with high perimeter velvet glow and delicate external haze',
    bumpScale: 0.012,
    roughness: 0.65,
    sheen: 1.60,
    clearcoat: 0.0,
    furLength: 0.05,
    furDensity: 6.0,
    fuzzStrength: 0.70,
    useFurShells: true,
  },
  {
    id: 'soft-pom-pom',
    icon: '🌸',
    name: 'Soft Pom-Pom Fuzz',
    subtitle: 'External Plush Cloud',
    desc: 'Extruded soft plush fur tufts around the silhouette with a solid, seamless inner body',
    bumpScale: 0.024,
    roughness: 0.82,
    sheen: 1.35,
    clearcoat: 0.0,
    furLength: 0.12,
    furDensity: 4.0,
    fuzzStrength: 0.95,
    useFurShells: true,
  },
  {
    id: 'matte-clay',
    icon: '🎨',
    name: 'Smooth Matte Clay',
    subtitle: 'Clean Designer Toy',
    desc: 'Non-porous satin silicone matte with soft specular sheen, zero noise shells',
    bumpScale: 0.0,
    roughness: 0.38,
    sheen: 0.15,
    clearcoat: 0.35,
    furLength: 0.0,
    furDensity: 1.0,
    fuzzStrength: 0.0,
    useFurShells: false,
  },
  {
    id: 'baseline',
    icon: '🖼️',
    name: 'Original 2D WebP',
    subtitle: 'Baseline Mapping',
    desc: 'Standard un-modified texture mapping for direct side-by-side comparison',
    bumpScale: 0.0,
    roughness: 0.35,
    sheen: 0.0,
    clearcoat: 0.0,
    furLength: 0.0,
    furDensity: 1.0,
    fuzzStrength: 0.0,
    useFurShells: false,
  },
];

// ── Procedural Silky Combed Fur Texture (Smooth Velvet Fibers, ZERO HOLES) ──
function createSmoothFurTexture(size = 1024) {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Smooth neutral base (value 128 = zero height bump, no dark pits!)
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);

  // Draw 35,000 fine, delicate, overlapping curved silk micro-strands
  // Flowing along gentle directional flow lines like combed velvet plush
  const strandCount = 35000;
  ctx.save();
  ctx.lineCap = 'round';

  for (let i = 0; i < strandCount; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;

    // Natural combed fur angle with slight gentle swirl
    const flowAngle = Math.PI * 0.25 + Math.sin(x * 0.008 + y * 0.008) * 0.35 + (Math.random() - 0.5) * 0.25;
    const len = 4 + Math.random() * 8;

    // Subtle brightness variation (between 116 and 142) so there are NO black holes or harsh pits
    const shade = Math.floor(118 + Math.random() * 24);
    const alpha = 0.18 + Math.random() * 0.22;

    ctx.strokeStyle = `rgba(${shade}, ${shade}, ${shade}, ${alpha})`;
    ctx.lineWidth = 0.9 + Math.random() * 0.8;

    ctx.beginPath();
    ctx.moveTo(x, y);
    const cx = x + Math.cos(flowAngle) * (len * 0.5) + (Math.random() - 0.5) * 1.5;
    const cy = y + Math.sin(flowAngle) * (len * 0.5) + (Math.random() - 0.5) * 1.5;
    const ex = x + Math.cos(flowAngle) * len;
    const ey = y + Math.sin(flowAngle) * len;
    ctx.quadraticCurveTo(cx, cy, ex, ey);
    ctx.stroke();
  }
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  return texture;
}

// ── Procedural Pixar Iris Texture Generator ──
function createIrisTexture(irisHex) {
  if (typeof document === 'undefined') return null;
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const center = size / 2;
  const radius = size * 0.46;

  // Base Iris Gradient
  const grad = ctx.createRadialGradient(center, center, radius * 0.1, center, center, radius);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.25, irisHex);
  grad.addColorStop(0.85, irisHex);
  grad.addColorStop(1, '#050b14'); // Dark outer limbal ring
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(center, center, radius, 0, Math.PI * 2);
  ctx.fill();

  // Fine radial striated iris fibers
  const numSpokes = 90;
  for (let i = 0; i < numSpokes; i++) {
    const angle = (i / numSpokes) * Math.PI * 2 + (Math.random() - 0.5) * 0.04;
    const rStart = radius * (0.22 + Math.random() * 0.12);
    const rEnd = radius * (0.92 + Math.random() * 0.06);
    const alpha = 0.25 + Math.random() * 0.45;
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.lineWidth = 1.0 + Math.random() * 1.5;
    ctx.beginPath();
    ctx.moveTo(center + Math.cos(angle) * rStart, center + Math.sin(angle) * rStart);
    ctx.lineTo(center + Math.cos(angle) * rEnd, center + Math.sin(angle) * rEnd);
    ctx.stroke();
  }

  // Dark limbal ring stroke
  ctx.strokeStyle = 'rgba(5, 11, 20, 0.9)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(center, center, radius - 3, 0, Math.PI * 2);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

// ── 3D Pixar Eyes Assembly Generator (Mounted Prominently on Front) ──
function createPixarEyesGroup(irisColor) {
  const eyesGroup = new THREE.Group();
  eyesGroup.name = 'PixarEyesGroup';

  const eyeSpacing = 0.19;
  const eyeY = 0.08;
  const eyeZ = 0.69;

  const scleraGeo = new THREE.SphereGeometry(0.18, 32, 32);
  const scleraMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.06,
    metalness: 0.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
  });

  const irisTex = createIrisTexture(irisColor);
  const irisGeo = new THREE.CircleGeometry(0.108, 32);
  const irisMat = new THREE.MeshBasicMaterial({
    map: irisTex,
    transparent: true,
  });

  const pupilGeo = new THREE.CircleGeometry(0.060, 32);
  const pupilMat = new THREE.MeshBasicMaterial({ color: 0x030712 });

  // Dual Catchlight highlights (one larger top-right, one smaller bottom-left)
  const catchlight1Geo = new THREE.CircleGeometry(0.024, 16);
  const catchlight2Geo = new THREE.CircleGeometry(0.012, 16);
  const catchlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

  [-1, 1].forEach((side) => {
    const singleEye = new THREE.Group();
    singleEye.position.set(side * eyeSpacing, eyeY, eyeZ);
    singleEye.name = side === -1 ? 'LeftEye' : 'RightEye';

    // Sclera (Eyeball) - slightly flattened in Z
    const sclera = new THREE.Mesh(scleraGeo, scleraMat);
    sclera.scale.set(1.0, 1.06, 0.48);
    singleEye.add(sclera);

    // Gaze container (moves smoothly with cursor gaze)
    const gazePivot = new THREE.Group();
    gazePivot.name = 'GazePivot';
    gazePivot.position.set(0, 0, 0.088);

    // Iris
    const iris = new THREE.Mesh(irisGeo, irisMat);
    gazePivot.add(iris);

    // Pupil
    const pupil = new THREE.Mesh(pupilGeo, pupilMat);
    pupil.position.z = 0.002;
    gazePivot.add(pupil);

    // Specular Catchlights (Crisp white reflections)
    const c1 = new THREE.Mesh(catchlight1Geo, catchlightMat);
    c1.position.set(0.034, 0.034, 0.004);
    gazePivot.add(c1);

    const c2 = new THREE.Mesh(catchlight2Geo, catchlightMat);
    c2.position.set(-0.025, -0.027, 0.004);
    gazePivot.add(c2);

    singleEye.add(gazePivot);
    eyesGroup.add(singleEye);
  });

  return { eyesGroup, irisMat };
}

// ── Cute Front Plush Paws Generator ──
function createFrontPawsGroup(pawColorHex) {
  const pawsGroup = new THREE.Group();
  pawsGroup.name = 'FrontPawsGroup';

  const pawMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(pawColorHex),
    roughness: 0.85,
    metalness: 0.0,
    sheen: 1.25,
    sheenColor: new THREE.Color('#ffffff'),
  });

  const pawSpacing = 0.28;
  const pawY = -0.28;
  const pawZ = 0.67;

  [-1, 1].forEach((side) => {
    const paw = new THREE.Group();
    paw.position.set(side * pawSpacing, pawY, pawZ);

    // Main paw cushion
    const mainGeo = new THREE.SphereGeometry(0.075, 16, 16);
    const mainMesh = new THREE.Mesh(mainGeo, pawMat);
    mainMesh.scale.set(1.2, 0.7, 1.1);
    paw.add(mainMesh);

    // 3 Cute Toe Beans
    [-0.045, 0.0, 0.045].forEach((offsetX) => {
      const toeGeo = new THREE.SphereGeometry(0.032, 12, 12);
      const toeMesh = new THREE.Mesh(toeGeo, pawMat);
      toeMesh.position.set(offsetX, 0.02, 0.05);
      toeMesh.scale.set(1.0, 0.8, 1.2);
      paw.add(toeMesh);
    });

    pawsGroup.add(paw);
  });

  return { pawsGroup, pawMat };
}

export default function AvatarBlobLaboratory() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [copyToast, setCopyToast] = useState(false);

  // ── Mode Switcher: 'texture-studio' (No Walls) vs 'gateway-physics' ──
  const [viewMode, setViewMode] = useState('texture-studio');
  const viewModeRef = useRef('texture-studio');
  useEffect(() => {
    viewModeRef.current = viewMode;
  }, [viewMode]);

  // ── Studio Specific Toggles (autoRotate = false by default so eyes face user!) ──
  const [autoRotate, setAutoRotate] = useState(false);
  const autoRotateRef = useRef(false);
  const [turntableAngle, setTurntableAngle] = useState(0);
  const [showEyes, setShowEyes] = useState(true);
  const [trackGaze, setTrackGaze] = useState(true);
  const [showPaws, setShowPaws] = useState(true);

  // ── Physics & Material Simulation Parameters ──
  const [params, setParams] = useState({
    gapHeight: 0.36,
    wallThickness: 0.65,
    wallWidth: 3.5,
    wallFlexibility: 1.15,
    curveSpread: 0.85,
    stiffness: 0.85,
    volumeBulge: 1.45,
    memoryForce: 1.80,
    jiggleFreq: 12.0,
    jiggleDamping: 4.5,
    simSpeed: 1.0,
    wireframe: false,
    selectedAvatar: 'mowgli',
    textureStyle: 'smooth-velvet',
    bumpScale: 0.018,
    roughness: 0.75,
    sheenIntensity: 1.45,
    clearcoat: 0.0,
    furLength: 0.08,
    furDensity: 4.5,
    fuzzStrength: 0.85,
    windFlutter: 0.8,
    useFurShells: true,
  });

  const paramsRef = useRef(params);
  useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  // ── Playback State ──
  const [isPlaying, setIsPlaying] = useState(true);
  const isPlayingRef = useRef(true);
  const [blobZ, setBlobZ] = useState(0.0);
  const [gatewayStatus, setGatewayStatus] = useState('Studio Inspection');
  const [activeCamView, setActiveCamView] = useState('front');

  // Mouse coordinate tracker for gaze
  const mousePosRef = useRef({ x: 0, y: 0 });

  const threeStateRef = useRef({
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    avatarGroup: null,
    coreBlobMesh: null,
    coreBlobMaterial: null,
    furShellGroup: null,
    furShellMats: [],
    eyesGroup: null,
    irisMat: null,
    pawsGroup: null,
    pawMat: null,
    upperWallMesh: null,
    lowerWallMesh: null,
    upperWallMat: null,
    lowerWallMat: null,
    upperLipMesh: null,
    lowerLipMesh: null,
    upperLipMat: null,
    lowerLipMat: null,
    slitGlowLight: null,
    cachedTextures: {},
    animId: null,
    simTime: 0,
    zPos: 0.0,
    exitTime: -999,
    jiggleAmp: 0,
  });

  // ── Toggle Playback ──
  const togglePlay = useCallback(() => {
    const next = !isPlayingRef.current;
    isPlayingRef.current = next;
    setIsPlaying(next);
  }, []);

  const resetLoop = useCallback(() => {
    threeStateRef.current.zPos = viewModeRef.current === 'texture-studio' ? 0.0 : -3.0;
    threeStateRef.current.simTime = 0;
    threeStateRef.current.exitTime = -999;
    threeStateRef.current.jiggleAmp = 0;
    setBlobZ(threeStateRef.current.zPos);
  }, []);

  // ── Mode Switching Handler ──
  const handleSwitchMode = (mode) => {
    setViewMode(mode);
    viewModeRef.current = mode;

    const state = threeStateRef.current;
    if (!state.avatarGroup) return;

    if (mode === 'texture-studio') {
      // Hide walls and lips
      if (state.upperWallMesh) state.upperWallMesh.visible = false;
      if (state.lowerWallMesh) state.lowerWallMesh.visible = false;
      if (state.upperLipMesh) state.upperLipMesh.visible = false;
      if (state.lowerLipMesh) state.lowerLipMesh.visible = false;
      if (state.slitGlowLight) state.slitGlowLight.visible = false;

      // Center avatar peacefully facing forward
      state.zPos = 0.0;
      state.avatarGroup.position.set(0, 0, 0);
      state.avatarGroup.rotation.y = 0;
      setTurntableAngle(0);
      setBlobZ(0.0);
      setGatewayStatus('Studio Inspection');

      // Set camera to front close-up
      if (state.camera && state.controls) {
        state.camera.position.set(0, 0.05, 3.4);
        state.controls.target.set(0, 0, 0);
        state.controls.update();
        setActiveCamView('front');
      }
    } else {
      // Gateway Physics Mode: show walls & restore traversal
      if (state.upperWallMesh) state.upperWallMesh.visible = true;
      if (state.lowerWallMesh) state.lowerWallMesh.visible = true;
      if (state.upperLipMesh) state.upperLipMesh.visible = true;
      if (state.lowerLipMesh) state.lowerLipMesh.visible = true;
      if (state.slitGlowLight) state.slitGlowLight.visible = true;

      state.avatarGroup.rotation.y = 0;
      state.zPos = -3.0;
      state.avatarGroup.position.set(0, 0, -3.0);
      setBlobZ(-3.0);
      setGatewayStatus('Approaching');

      if (state.camera && state.controls) {
        state.camera.position.set(0, 0, 6.2);
        state.controls.target.set(0, 0, 0);
        state.controls.update();
        setActiveCamView('front');
      }
    }
  };

  // ── Camera Presets ──
  const setCameraPreset = useCallback((preset) => {
    const { camera, controls } = threeStateRef.current;
    if (!camera || !controls) return;
    setActiveCamView(preset);

    if (preset === 'front') {
      const distance = viewModeRef.current === 'texture-studio' ? 3.4 : 6.2;
      camera.position.set(0, 0.05, distance);
      controls.target.set(0, 0, 0);
    } else if (preset === 'side') {
      const distance = viewModeRef.current === 'texture-studio' ? 3.6 : 6.5;
      camera.position.set(distance, 0, 0);
      controls.target.set(0, 0, 0);
    } else if (preset === 'top') {
      const distance = viewModeRef.current === 'texture-studio' ? 3.8 : 6.5;
      camera.position.set(0, distance, 0.01);
      controls.target.set(0, 0, 0);
    } else {
      // Isometric 3/4
      const scale = viewModeRef.current === 'texture-studio' ? 0.6 : 1.0;
      camera.position.set(3.8 * scale, 2.5 * scale, 4.8 * scale);
      controls.target.set(0, 0, 0);
    }
    controls.update();
  }, []);

  // ── Initialize Three.js Scene ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;

    // Scene & Camera
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0818, 0.035);
    threeStateRef.current.scene = scene;

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 0.05, 3.4);
    threeStateRef.current.camera = camera;

    // WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    threeStateRef.current.renderer = renderer;

    // OrbitControls
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 14;
    controls.minDistance = 1.8;
    threeStateRef.current.controls = controls;

    // ── Lighting (Studio + Soft Velvet Rim) ──
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.35);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
    keyLight.position.set(4, 7, 5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xa5b4fc, 1.2);
    fillLight.position.set(-5, 3, 4);
    scene.add(fillLight);

    const rimLight = new THREE.PointLight(0x5eead4, 3.8, 12, 1.4);
    rimLight.position.set(-3.5, 1.5, -3);
    scene.add(rimLight);

    const slitGlowLight = new THREE.PointLight(0x38bdf8, 2.8, 8, 1.6);
    slitGlowLight.position.set(0, 0, 0);
    slitGlowLight.visible = false;
    scene.add(slitGlowLight);
    threeStateRef.current.slitGlowLight = slitGlowLight;

    // ── Studio Grid Plane ──
    const gridHelper = new THREE.GridHelper(20, 40, 0x14b8a6, 0x1e1b38);
    gridHelper.position.y = -1.65;
    scene.add(gridHelper);

    // ── Preload Textures ──
    const textureLoader = new THREE.TextureLoader();
    AVATARS.forEach((av) => {
      const tex = textureLoader.load(av.texture);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.flipY = false;
      threeStateRef.current.cachedTextures[av.id] = tex;
      if (av.legacyId) threeStateRef.current.cachedTextures[av.legacyId] = tex;
    });

    // Generate Procedural Smooth Fur Texture (Continuous silky fibers, NO HOLES)
    const smoothFurTex = createSmoothFurTexture(1024);
    threeStateRef.current.furClumpTexture = smoothFurTex;

    // ── Avatar Main Group (Contains Core Body, External Fur Shells, Eyes, Paws) ──
    const avatarGroup = new THREE.Group();
    avatarGroup.position.set(0, 0, 0);
    avatarGroup.rotation.y = 0; // Starts directly facing the user!
    scene.add(avatarGroup);
    threeStateRef.current.avatarGroup = avatarGroup;

    // 1. Core Base Mesh: Solid, smooth body with velvet peach-fuzz sheen and fine combed fur bump
    const coreGeo = new THREE.SphereGeometry(0.72, 96, 96);
    const coreMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#14b8a6'),
      bumpMap: smoothFurTex,
      bumpScale: params.bumpScale,
      roughness: params.roughness,
      metalness: 0.0,
      sheen: params.sheenIntensity,
      sheenColor: new THREE.Color('#5eead4'),
      sheenRoughness: 0.40,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    avatarGroup.add(coreMesh);
    threeStateRef.current.coreBlobMesh = coreMesh;
    threeStateRef.current.coreBlobMaterial = coreMat;

    // 2. External Fur Fuzz Shells (Soft outer halo that creates external fluffy fuzz WITHOUT sponge holes)
    const numShells = 8;
    const furShellGroup = new THREE.Group();
    avatarGroup.add(furShellGroup);
    threeStateRef.current.furShellGroup = furShellGroup;
    threeStateRef.current.furShellMats = [];

    const shellGeo = new THREE.SphereGeometry(0.72, 64, 64);

    for (let k = 1; k <= numShells; k++) {
      const layerVal = k / numShells; // 0.125 to 1.0

      const furShellMat = new THREE.ShaderMaterial({
        uniforms: {
          uFurTexture: { value: smoothFurTex },
          uBaseColor: { value: new THREE.Color('#14b8a6') },
          uTipColor: { value: new THREE.Color('#5eead4') },
          uLayer: { value: layerVal },
          uFurLength: { value: params.furLength },
          uSheen: { value: params.sheenIntensity },
          uFuzzStrength: { value: params.fuzzStrength },
          uDensity: { value: params.furDensity },
          uWind: { value: params.windFlutter },
          uTime: { value: 0.0 },
          uBlobCenterZ: { value: -999.0 },
          uGapHeight: { value: params.gapHeight },
          uWallThickness: { value: params.wallThickness },
          uStiffness: { value: params.stiffness },
          uVolumeBulge: { value: params.volumeBulge },
          uJiggleOffset: { value: 0.0 },
          uLightPos: { value: new THREE.Vector3(4, 7, 5) },
        },
        vertexShader: `
          uniform float uLayer;
          uniform float uFurLength;
          uniform float uWind;
          uniform float uTime;
          uniform float uBlobCenterZ;
          uniform float uGapHeight;
          uniform float uWallThickness;
          uniform float uStiffness;
          uniform float uVolumeBulge;
          uniform float uJiggleOffset;

          varying vec2 vUv;
          varying vec3 vNormal;
          varying vec3 vWorldPosition;
          varying float vLayer;

          void main() {
            vUv = uv;
            vNormal = normalize(normalMatrix * normal);
            vLayer = uLayer;

            // Extrude vertex gently along normal to form external fuzz layer
            vec3 displaced = position + normal * (uLayer * uFurLength);

            // Subtle micro wind flutter on outer fuzz
            float flutter = sin(uTime * 2.5 + position.y * 4.5 + position.x * 3.5) * 0.012 * pow(uLayer, 1.2) * uWind;
            displaced.x += flutter;
            displaced.y += flutter * 0.35;

            // Soft-body collision squish if in gateway mode
            if (uBlobCenterZ > -500.0) {
              vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
              float vz = worldPos.z;
              float vy = displaced.y;
              float sphereRadius = 0.72 + uFurLength;
              float halfGap = uGapHeight * 0.5;
              float halfThick = uWallThickness * 0.5;
              float transitionDist = 0.45;
              float zDistToSlit = abs(vz);
              float zInfluence = 1.0 - smoothstep(halfThick - 0.05, halfThick + transitionDist, zDistToSlit);

              if (zInfluence > 0.001) {
                float allowedY = halfGap;
                float rawYDist = abs(vy);
                if (rawYDist > allowedY) {
                  float excessY = rawYDist - allowedY;
                  float compressRatio = (excessY / sphereRadius) * zInfluence * uStiffness;
                  float targetY = sign(vy) * (allowedY + excessY * (1.0 - zInfluence * uStiffness * 0.95));
                  displaced.y = targetY;
                  float displacedAmount = compressRatio * uVolumeBulge;
                  displaced.z += sign(displaced.z) * displacedAmount * 0.48 * (1.0 - smoothstep(0.0, 0.6, abs(displaced.z)));
                  displaced.x *= (1.0 + displacedAmount * 0.35);
                }
              }
              if (vz > halfThick + 0.15) {
                displaced.y += uJiggleOffset * (1.0 - smoothstep(halfThick + 0.15, 3.5, vz));
                displaced.x -= uJiggleOffset * 0.5 * (1.0 - smoothstep(halfThick + 0.15, 3.5, vz));
              }
            }

            vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
            vWorldPosition = (modelMatrix * vec4(displaced, 1.0)).xyz;
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          uniform sampler2D uFurTexture;
          uniform vec3 uBaseColor;
          uniform vec3 uTipColor;
          uniform float uSheen;
          uniform float uFuzzStrength;
          uniform float uDensity;
          uniform vec3 uLightPos;

          varying vec2 vUv;
          varying vec3 vNormal;
          varying vec3 vWorldPosition;
          varying float vLayer;

          void main() {
            vec3 N = normalize(vNormal);
            vec3 V = normalize(cameraPosition - vWorldPosition);
            vec3 L = normalize(uLightPos - vWorldPosition);

            // Silky peach-fuzz rim angle
            float NdotV = max(0.0, dot(N, V));
            float rim = pow(1.0 - NdotV, 2.0);

            // Soft wrapped diffuse lighting (Half-Lambert)
            float NdotL = dot(N, L);
            float diffuse = max(0.0, NdotL * 0.55 + 0.45);

            // Sample continuous micro-fiber noise (gentle variation, NO HOLES!)
            vec4 fiberTex = texture2D(uFurTexture, vUv * uDensity);
            float fiber = fiberTex.r;

            // Color gradient: uBaseColor at root -> lighter uTipColor at tips
            vec3 col = mix(uBaseColor, uTipColor, vLayer * 0.9);
            col = col * diffuse + uTipColor * (rim * uSheen * 0.85);

            // Soft external fuzz alpha: prominent at the rim silhouette, delicate across body
            // NO DISCARD! Pure smooth alpha halo!
            float alpha = (0.15 + 0.85 * rim) * pow(1.0 - vLayer, 0.7) * (0.65 + 0.35 * fiber) * uFuzzStrength;

            gl_FragColor = vec4(col, alpha);
          }
        `,
        transparent: true,
        depthWrite: false, // Never write depth on outer fuzz so no black masking occurs
        blending: THREE.NormalBlending,
        side: THREE.FrontSide,
      });

      const shellMesh = new THREE.Mesh(shellGeo, furShellMat);
      furShellGroup.add(shellMesh);
      threeStateRef.current.furShellMats.push(furShellMat);
    }

    // 3. 3D Pixar Eyes (Mounted on Front Face)
    const curAv = AVATARS[0];
    const { eyesGroup, irisMat } = createPixarEyesGroup(curAv.irisColor);
    avatarGroup.add(eyesGroup);
    threeStateRef.current.eyesGroup = eyesGroup;
    threeStateRef.current.irisMat = irisMat;

    // 4. Cute Front Paws
    const { pawsGroup, pawMat } = createFrontPawsGroup(curAv.color);
    avatarGroup.add(pawsGroup);
    threeStateRef.current.pawsGroup = pawsGroup;
    threeStateRef.current.pawMat = pawMat;

    // ── Gateway Structures (Upper & Lower Walls) ──
    const wallGeo = new THREE.BoxGeometry(params.wallWidth, 1.5, params.wallThickness, 80, 24, 16);

    const upperWallMat = new THREE.MeshPhysicalMaterial({
      color: 0x18162e,
      roughness: 0.15,
      metalness: 0.2,
      transmission: 0.65,
      opacity: 0.85,
      transparent: true,
      ior: 1.5,
      clearcoat: 0.8,
    });
    upperWallMat.onBeforeCompile = (shader) => {
      shader.uniforms.uBlobZ = { value: -3.0 };
      shader.uniforms.uBlobRadius = { value: 0.75 };
      shader.uniforms.uGapHeight = { value: params.gapHeight };
      shader.uniforms.uWallFlex = { value: params.wallFlexibility };
      shader.uniforms.uCurveSpread = { value: params.curveSpread };
      shader.uniforms.uWallJiggle = { value: 0.0 };
      upperWallMat.userData.shader = shader;

      shader.vertexShader = `
        uniform float uBlobZ;
        uniform float uBlobRadius;
        uniform float uGapHeight;
        uniform float uWallFlex;
        uniform float uCurveSpread;
        uniform float uWallJiggle;
        ${shader.vertexShader}
      `.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        float zContact = 1.0 - smoothstep(0.0, uBlobRadius + 0.35, abs(uBlobZ));
        float xArch = exp(-(position.x * position.x) / (2.0 * uCurveSpread * uCurveSpread));
        if (position.y < -0.45) {
          float maxLift = max(0.0, uBlobRadius - uGapHeight * 0.5) * 0.78 * uWallFlex;
          float lift = maxLift * xArch * zContact;
          float yWeight = smoothstep(0.75, -0.75, position.y);
          transformed.y += lift * yWeight;
          transformed.y += uWallJiggle * xArch * yWeight;
        }
        `
      );
    };

    const upperWall = new THREE.Mesh(wallGeo, upperWallMat);
    upperWall.position.set(0, params.gapHeight / 2 + 0.75, 0);
    upperWall.visible = false;
    scene.add(upperWall);
    threeStateRef.current.upperWallMesh = upperWall;
    threeStateRef.current.upperWallMat = upperWallMat;

    const lowerWallMat = new THREE.MeshPhysicalMaterial({
      color: 0x18162e,
      roughness: 0.15,
      metalness: 0.2,
      transmission: 0.65,
      opacity: 0.85,
      transparent: true,
      ior: 1.5,
      clearcoat: 0.8,
    });
    lowerWallMat.onBeforeCompile = (shader) => {
      shader.uniforms.uBlobZ = { value: -3.0 };
      shader.uniforms.uBlobRadius = { value: 0.75 };
      shader.uniforms.uGapHeight = { value: params.gapHeight };
      shader.uniforms.uWallFlex = { value: params.wallFlexibility };
      shader.uniforms.uCurveSpread = { value: params.curveSpread };
      shader.uniforms.uWallJiggle = { value: 0.0 };
      lowerWallMat.userData.shader = shader;

      shader.vertexShader = `
        uniform float uBlobZ;
        uniform float uBlobRadius;
        uniform float uGapHeight;
        uniform float uWallFlex;
        uniform float uCurveSpread;
        uniform float uWallJiggle;
        ${shader.vertexShader}
      `.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        float zContact = 1.0 - smoothstep(0.0, uBlobRadius + 0.35, abs(uBlobZ));
        float xArch = exp(-(position.x * position.x) / (2.0 * uCurveSpread * uCurveSpread));
        if (position.y > 0.45) {
          float maxDrop = max(0.0, uBlobRadius - uGapHeight * 0.5) * 0.78 * uWallFlex;
          float drop = maxDrop * xArch * zContact;
          float yWeight = smoothstep(-0.75, 0.75, position.y);
          transformed.y -= drop * yWeight;
          transformed.y -= uWallJiggle * xArch * yWeight;
        }
        `
      );
    };

    const lowerWall = new THREE.Mesh(wallGeo, lowerWallMat);
    lowerWall.position.set(0, -(params.gapHeight / 2 + 0.75), 0);
    lowerWall.visible = false;
    scene.add(lowerWall);
    threeStateRef.current.lowerWallMesh = lowerWall;
    threeStateRef.current.lowerWallMat = lowerWallMat;

    // Glowing Neon Lip Edges
    const lipGeo = new THREE.BoxGeometry(params.wallWidth + 0.05, 0.04, params.wallThickness + 0.05, 80, 2, 4);
    const lipMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

    const upperLip = new THREE.Mesh(lipGeo, lipMat);
    upperLip.position.set(0, params.gapHeight / 2, 0);
    upperLip.visible = false;
    scene.add(upperLip);
    threeStateRef.current.upperLipMesh = upperLip;
    threeStateRef.current.upperLipMat = lipMat;

    const lowerLip = new THREE.Mesh(lipGeo, lipMat);
    lowerLip.position.set(0, -params.gapHeight / 2, 0);
    lowerLip.visible = false;
    scene.add(lowerLip);
    threeStateRef.current.lowerLipMesh = lowerLip;
    threeStateRef.current.lowerLipMat = lipMat;

    // ── Mouse Pointer Move for Eye Gaze Tracking ──
    const handlePointerMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mousePosRef.current = { x, y };
    };
    window.addEventListener('pointermove', handlePointerMove);

    // ── Animation Loop ──
    let lastTime = performance.now();

    const animate = (currentTime) => {
      const delta = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      const p = paramsRef.current;
      const state = threeStateRef.current;
      const isStudio = viewModeRef.current === 'texture-studio';

      state.simTime += delta;

      // 1. Studio Mode vs Gateway Mode Logic
      if (isStudio) {
        // Walls MUST NOT be played in texture testing mode!
        if (state.upperWallMesh) state.upperWallMesh.visible = false;
        if (state.lowerWallMesh) state.lowerWallMesh.visible = false;
        if (state.upperLipMesh) state.upperLipMesh.visible = false;
        if (state.lowerLipMesh) state.lowerLipMesh.visible = false;
        if (state.slitGlowLight) state.slitGlowLight.visible = false;

        // Position avatar steadily in center
        if (state.avatarGroup) {
          state.avatarGroup.position.set(0, 0, 0);

          // Turntable rotation only when autoRotate is toggled ON
          if (autoRotateRef.current) {
            state.avatarGroup.rotation.y += delta * 0.45;
            const deg = Math.round(((state.avatarGroup.rotation.y % (Math.PI * 2)) * 180) / Math.PI);
            setTurntableAngle((deg + 360) % 360);
          }
        }
      } else {
        // Gateway Physics Mode: walls are visible and collision squish animates
        if (state.upperWallMesh) state.upperWallMesh.visible = true;
        if (state.lowerWallMesh) state.lowerWallMesh.visible = true;
        if (state.upperLipMesh) state.upperLipMesh.visible = true;
        if (state.lowerLipMesh) state.lowerLipMesh.visible = true;
        if (state.slitGlowLight) state.slitGlowLight.visible = true;

        if (isPlayingRef.current) {
          state.zPos += delta * 1.8 * p.simSpeed;
          if (state.zPos > 3.2) {
            state.zPos = -3.0;
            state.exitTime = -999;
            state.jiggleAmp = 0;
          }
          setBlobZ(state.zPos);
        }

        if (state.avatarGroup) {
          state.avatarGroup.position.z = state.zPos;
          state.avatarGroup.rotation.y = 0;
        }

        const halfThick = p.wallThickness * 0.5;
        if (state.zPos < -halfThick - 0.75) {
          setGatewayStatus('Approaching');
        } else if (state.zPos >= -halfThick - 0.75 && state.zPos < -halfThick) {
          setGatewayStatus('Entering Gateway');
        } else if (state.zPos >= -halfThick && state.zPos <= halfThick) {
          setGatewayStatus('Squeezing (Colliding)');
        } else {
          if (state.exitTime < 0) {
            state.exitTime = currentTime / 1000;
            state.jiggleAmp = 0.22;
          }
          setGatewayStatus('Exited & Restoring');
        }
      }

      // Calculate Jiggle for exit release
      let currentJiggle = 0;
      if (!isStudio && state.exitTime > 0) {
        const timeSinceExit = currentTime / 1000 - state.exitTime;
        const decay = Math.exp(-p.jiggleDamping * timeSinceExit);
        currentJiggle = state.jiggleAmp * decay * Math.sin(p.jiggleFreq * timeSinceExit);
      }

      // Update External Fur Shell Uniforms
      const activeBlobZ = isStudio ? -999.0 : state.zPos;
      state.furShellMats.forEach((mat) => {
        mat.uniforms.uTime.value = state.simTime;
        mat.uniforms.uFurLength.value = p.useFurShells ? p.furLength : 0.0;
        mat.uniforms.uSheen.value = p.sheenIntensity;
        mat.uniforms.uFuzzStrength.value = p.useFurShells ? p.fuzzStrength : 0.0;
        mat.uniforms.uDensity.value = p.furDensity;
        mat.uniforms.uWind.value = p.windFlutter;
        mat.uniforms.uBlobCenterZ.value = activeBlobZ;
        mat.uniforms.uGapHeight.value = p.gapHeight;
        mat.uniforms.uWallThickness.value = p.wallThickness;
        mat.uniforms.uStiffness.value = p.stiffness;
        mat.uniforms.uVolumeBulge.value = p.volumeBulge;
        mat.uniforms.uJiggleOffset.value = currentJiggle;
      });

      // Update Core Mesh Material (Smooth body, fine combed fur bump, NO holes)
      if (state.coreBlobMaterial) {
        state.coreBlobMaterial.roughness = p.roughness;
        state.coreBlobMaterial.sheen = p.sheenIntensity;
        state.coreBlobMaterial.bumpScale = p.bumpScale;
        state.coreBlobMaterial.clearcoat = p.clearcoat;
        state.coreBlobMaterial.wireframe = p.wireframe;
      }

      // Interactive Eye Gaze Cursor Tracking
      if (state.eyesGroup) {
        const leftGaze = state.eyesGroup.getObjectByName('LeftEye')?.getObjectByName('GazePivot');
        const rightGaze = state.eyesGroup.getObjectByName('RightEye')?.getObjectByName('GazePivot');

        const targetGazeX = THREE.MathUtils.clamp(mousePosRef.current.x * 0.024, -0.022, 0.022);
        const targetGazeY = THREE.MathUtils.clamp(mousePosRef.current.y * 0.024, -0.020, 0.020);

        [leftGaze, rightGaze].forEach((pivot) => {
          if (pivot) {
            pivot.position.x += (targetGazeX - pivot.position.x) * 0.12;
            pivot.position.y += (targetGazeY - pivot.position.y) * 0.12;
          }
        });
      }

      // Update Squishy Wall Uniforms in Gateway Mode
      if (!isStudio) {
        const uShader = state.upperWallMat?.userData?.shader;
        const lShader = state.lowerWallMat?.userData?.shader;
        const wallJiggle = currentJiggle * 0.35;

        [uShader, lShader].forEach((sh) => {
          if (sh) {
            sh.uniforms.uBlobZ.value = state.zPos;
            sh.uniforms.uGapHeight.value = p.gapHeight;
            sh.uniforms.uWallFlex.value = p.wallFlexibility;
            sh.uniforms.uCurveSpread.value = p.curveSpread;
            sh.uniforms.uWallJiggle.value = wallJiggle;
          }
        });

        if (state.upperWallMesh && state.lowerWallMesh) {
          state.upperWallMesh.position.y = p.gapHeight / 2 + 0.75;
          state.lowerWallMesh.position.y = -(p.gapHeight / 2 + 0.75);
          state.upperWallMesh.scale.set(p.wallWidth / 3.5, 1, p.wallThickness / 0.65);
          state.lowerWallMesh.scale.set(p.wallWidth / 3.5, 1, p.wallThickness / 0.65);
        }
        if (state.upperLipMesh && state.lowerLipMesh) {
          state.upperLipMesh.position.y = p.gapHeight / 2;
          state.lowerLipMesh.position.y = -p.gapHeight / 2;
        }
      }

      controls.update();
      renderer.render(scene, camera);

      state.animId = requestAnimationFrame(animate);
    };

    threeStateRef.current.animId = requestAnimationFrame(animate);

    // ── Window Resize ──
    const handleResize = () => {
      const w = canvas.clientWidth || window.innerWidth;
      const h = canvas.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointermove', handlePointerMove);
      if (threeStateRef.current.animId) cancelAnimationFrame(threeStateRef.current.animId);
      renderer.dispose();
    };
  }, []);

  // ── Switch Avatar Character & Colors ──
  const handleSelectAvatar = (avId) => {
    setParams((prev) => ({ ...prev, selectedAvatar: avId }));
    const av = AVATARS.find(a => a.id === avId || a.legacyId === avId) || AVATARS[0];
    const state = threeStateRef.current;

    const baseCol = new THREE.Color(av.color);
    const tipCol = new THREE.Color(av.tipColor);

    // Update Core Material
    if (state.coreBlobMaterial) {
      state.coreBlobMaterial.color = baseCol;
      state.coreBlobMaterial.sheenColor = tipCol;
      state.coreBlobMaterial.needsUpdate = true;
    }

    // Update Fur Shell Materials
    state.furShellMats.forEach((mat) => {
      mat.uniforms.uBaseColor.value = baseCol;
      mat.uniforms.uTipColor.value = tipCol;
    });

    // Update Eye Iris Texture
    if (state.irisMat) {
      const newIrisTex = createIrisTexture(av.irisColor);
      state.irisMat.map = newIrisTex;
      state.irisMat.needsUpdate = true;
    }

    // Update Paw Color
    if (state.pawMat) {
      state.pawMat.color = baseCol;
      state.pawMat.needsUpdate = true;
    }
  };

  // ── Select Texture Style Preset ──
  const handleSelectTexturePreset = (presetId) => {
    const preset = TEXTURE_PRESETS.find(p => p.id === presetId) || TEXTURE_PRESETS[0];
    setParams(prev => ({
      ...prev,
      textureStyle: preset.id,
      bumpScale: preset.bumpScale,
      roughness: preset.roughness,
      sheenIntensity: preset.sheen,
      clearcoat: preset.clearcoat,
      furLength: preset.furLength,
      furDensity: preset.furDensity,
      fuzzStrength: preset.fuzzStrength,
      useFurShells: preset.useFurShells,
    }));

    const state = threeStateRef.current;
    if (state.furShellGroup) {
      state.furShellGroup.visible = preset.useFurShells;
    }
  };

  // ── Sliders Handlers ──
  const handleFurLengthChange = (val) => {
    const num = parseFloat(val);
    setParams(prev => ({ ...prev, furLength: num }));
  };

  const handleFurDensityChange = (val) => {
    const num = parseFloat(val);
    setParams(prev => ({ ...prev, furDensity: num }));
  };

  const handleSheenChange = (val) => {
    const num = parseFloat(val);
    setParams(prev => ({ ...prev, sheenIntensity: num }));
  };

  const handleFuzzStrengthChange = (val) => {
    const num = parseFloat(val);
    setParams(prev => ({ ...prev, fuzzStrength: num }));
  };

  const handleBumpScaleChange = (val) => {
    const num = parseFloat(val);
    setParams(prev => ({ ...prev, bumpScale: num }));
  };

  const handleRoughnessChange = (val) => {
    const num = parseFloat(val);
    setParams(prev => ({ ...prev, roughness: num }));
  };

  // ── Toggle Eyes & Paws Visibility ──
  const toggleEyes = () => {
    const next = !showEyes;
    setShowEyes(next);
    if (threeStateRef.current.eyesGroup) {
      threeStateRef.current.eyesGroup.visible = next;
    }
  };

  const togglePaws = () => {
    const next = !showPaws;
    setShowPaws(next);
    if (threeStateRef.current.pawsGroup) {
      threeStateRef.current.pawsGroup.visible = next;
    }
  };

  const toggleAutoRotate = () => {
    const next = !autoRotate;
    setAutoRotate(next);
    autoRotateRef.current = next;
  };

  const handleScrubTurntable = (val) => {
    const deg = parseFloat(val);
    setTurntableAngle(deg);
    if (threeStateRef.current.avatarGroup) {
      threeStateRef.current.avatarGroup.rotation.y = (deg * Math.PI) / 180;
    }
  };

  // ── Manual Scrubber Change for Gateway ──
  const handleScrubZ = (val) => {
    const num = parseFloat(val);
    threeStateRef.current.zPos = num;
    setBlobZ(num);
  };

  const handleCopyMaterialConfig = () => {
    const activeAv = AVATARS.find(a => a.id === params.selectedAvatar || a.legacyId === params.selectedAvatar) || AVATARS[0];
    const cfg = {
      character: activeAv.name,
      baseColor: activeAv.color,
      tipColor: activeAv.tipColor,
      irisColor: activeAv.irisColor,
      texturePreset: params.textureStyle,
      bumpScale: params.bumpScale,
      furLength: params.furLength,
      furDensity: params.furDensity,
      fuzzStrength: params.fuzzStrength,
      velvetSheen: params.sheenIntensity,
      roughness: params.roughness,
      useFurShells: params.useFurShells,
    };
    if (navigator.clipboard) {
      navigator.clipboard.writeText(JSON.stringify(cfg, null, 2));
      setCopyToast(true);
      setTimeout(() => setCopyToast(false), 2400);
    }
  };

  const currentAvatar = AVATARS.find(a => a.id === params.selectedAvatar || a.legacyId === params.selectedAvatar) || AVATARS[0];

  return (
    <div className="blob-lab-container" ref={containerRef}>
      {/* 3D WebGL Canvas */}
      <canvas ref={canvasRef} className="blob-lab-canvas" />

      {/* Top Center Mode Switcher Bar */}
      <div className="blob-mode-switcher-bar">
        <button
          type="button"
          className={`blob-mode-btn ${viewMode === 'texture-studio' ? 'active-studio' : ''}`}
          onClick={() => handleSwitchMode('texture-studio')}
        >
          <span>🧸 Avatar Fur &amp; Texture Studio</span>
          <span className="blob-mode-badge">No Walls (Paused)</span>
        </button>
        <button
          type="button"
          className={`blob-mode-btn ${viewMode === 'gateway-physics' ? 'active-gateway' : ''}`}
          onClick={() => handleSwitchMode('gateway-physics')}
        >
          <span>⚡ Gateway Physics Squeeze</span>
          <span className="blob-mode-badge">Walls Active</span>
        </button>
      </div>

      {/* Header Overlay */}
      <header className="blob-lab-header">
        <div className="blob-lab-badge">
          <span className="blob-lab-badge-dot" />
          {viewMode === 'texture-studio' ? 'Texture & Fur Studio' : 'Physics Gateway Lab'}
        </div>
        <h1 className="blob-lab-title">
          {viewMode === 'texture-studio' ? 'Avatar Plush Fur Studio' : 'Avatar Soft-Body Blob Studio'}
        </h1>
        <p className="blob-lab-desc">
          {viewMode === 'texture-studio' 
            ? 'Smooth velvet plush body with soft external peach-fuzz halo and glossy Pixar eyes. Zero porous holes.'
            : 'Interactive Three.js vertex-shader soft-body physics engine squeezing through the flexible gateway.'}
        </p>
      </header>

      {/* Top Right Navigation */}
      <div className="blob-lab-top-nav">
        <Link href="/" className="blob-lab-nav-btn">
          Back to Home
        </Link>
        <Link href="/vedika-chamber" className="blob-lab-nav-btn">
          Chamber
        </Link>
        <Link href="/vedika-labs" className="blob-lab-nav-btn">
          Labs
        </Link>
      </div>

      {/* Interactive Control Sidebar Panel */}
      <aside className="blob-lab-panel">
        {/* Section: Avatar Switcher with Speech Quote */}
        <div className="blob-control-group">
          <div className="blob-section-title">
            <Sparkles size={14} /> 4 Reference Avatars
          </div>
          <div className="blob-avatar-swatches">
            {AVATARS.map((av) => (
              <button
                key={av.id}
                type="button"
                className={`blob-swatch-btn ${currentAvatar.id === av.id ? 'active' : ''}`}
                onClick={() => handleSelectAvatar(av.id)}
              >
                <span
                  className="blob-swatch-circle"
                  style={{ backgroundColor: av.color, boxShadow: `0 0 8px ${av.tipColor}` }}
                />
                <span className="blob-swatch-label">{av.name}</span>
              </button>
            ))}
          </div>

          <div className="blob-ref-banner">
            <span>💬</span>
            <div>
              <strong>{currentAvatar.name} ({currentAvatar.character}):</strong> &ldquo;{currentAvatar.quote}&rdquo;
            </div>
          </div>
        </div>

        {/* Studio Inspection Toggles (Only in Texture Studio Mode) */}
        {viewMode === 'texture-studio' && (
          <div className="blob-control-group">
            <div className="blob-section-title">
              <Eye size={14} /> 3D Feature Toggles
            </div>

            <div className="blob-toggle-row">
              <div className="blob-toggle-title">
                <Compass size={14} /> Turntable 360° Auto-Rotate
              </div>
              <button
                type="button"
                className={`blob-toggle-switch ${autoRotate ? 'on' : ''}`}
                onClick={toggleAutoRotate}
              >
                <span className="blob-toggle-handle" />
              </button>
            </div>

            <div className="blob-toggle-row">
              <div className="blob-toggle-title">
                <Sparkles size={14} /> 3D Pixar Glossy Eyes
              </div>
              <button
                type="button"
                className={`blob-toggle-switch ${showEyes ? 'on' : ''}`}
                onClick={toggleEyes}
              >
                <span className="blob-toggle-handle" />
              </button>
            </div>

            <div className="blob-toggle-row">
              <div className="blob-toggle-title">
                <Palette size={14} /> Cute Front Plush Paws
              </div>
              <button
                type="button"
                className={`blob-toggle-switch ${showPaws ? 'on' : ''}`}
                onClick={togglePaws}
              >
                <span className="blob-toggle-handle" />
              </button>
            </div>
          </div>
        )}

        {/* Section: Texture & Fur Presets */}
        <div className="blob-control-group">
          <div className="blob-section-title">
            <Palette size={14} /> Surface &amp; Fur Presets
          </div>

          <div className="blob-texture-card-grid">
            {TEXTURE_PRESETS.map((preset) => {
              const isSelected = params.textureStyle === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  className={`blob-texture-card ${isSelected ? 'active' : ''}`}
                  onClick={() => handleSelectTexturePreset(preset.id)}
                >
                  <div className="blob-texture-card-header">
                    <span>{preset.icon}</span>
                    <span>{preset.name}</span>
                  </div>
                  <span className="blob-texture-card-subtitle">{preset.subtitle}</span>
                  <span className="blob-texture-card-desc">{preset.desc}</span>
                </button>
              );
            })}
          </div>

          {/* Fur Fine-Tuning Sliders */}
          <div className="blob-slider-row">
            <div className="blob-slider-label">
              <span>External Fuzz Halo Strength</span>
              <span className="blob-slider-val">{params.fuzzStrength.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.00"
              max="1.50"
              step="0.05"
              value={params.fuzzStrength}
              className="blob-slider"
              onChange={(e) => handleFuzzStrengthChange(e.target.value)}
            />
          </div>

          <div className="blob-slider-row">
            <div className="blob-slider-label">
              <span>Velvet Peach-Fuzz Rim Sheen</span>
              <span className="blob-slider-val">{params.sheenIntensity.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.00"
              max="2.50"
              step="0.05"
              value={params.sheenIntensity}
              className="blob-slider"
              onChange={(e) => handleSheenChange(e.target.value)}
            />
          </div>

          <div className="blob-slider-row">
            <div className="blob-slider-label">
              <span>Silky Micro-Fiber Depth (Bump)</span>
              <span className="blob-slider-val">{params.bumpScale.toFixed(3)}</span>
            </div>
            <input
              type="range"
              min="0.000"
              max="0.040"
              step="0.002"
              value={params.bumpScale}
              className="blob-slider"
              onChange={(e) => handleBumpScaleChange(e.target.value)}
            />
          </div>

          <div className="blob-slider-row">
            <div className="blob-slider-label">
              <span>External Fur Length (Halo Extrusion)</span>
              <span className="blob-slider-val">{params.furLength.toFixed(3)}m</span>
            </div>
            <input
              type="range"
              min="0.00"
              max="0.18"
              step="0.005"
              value={params.furLength}
              className="blob-slider"
              onChange={(e) => handleFurLengthChange(e.target.value)}
            />
          </div>

          <div className="blob-slider-row">
            <div className="blob-slider-label">
              <span>Surface Velvet Softness (Roughness)</span>
              <span className="blob-slider-val">{params.roughness.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.20"
              max="1.00"
              step="0.02"
              value={params.roughness}
              className="blob-slider"
              onChange={(e) => handleRoughnessChange(e.target.value)}
            />
          </div>

          <button
            type="button"
            className="blob-copy-cfg-btn"
            onClick={handleCopyMaterialConfig}
          >
            {copyToast ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            <span>{copyToast ? 'Config Copied to Clipboard!' : 'Copy Material Config for All Pages'}</span>
          </button>
        </div>

        {/* Section: Gateway Physics Controls (Only shown in Gateway Mode) */}
        {viewMode === 'gateway-physics' && (
          <>
            <div className="blob-control-group">
              <div className="blob-section-title">
                <Activity size={14} /> Gateway Flow Controls
              </div>
              <div className="blob-btn-grid">
                <button
                  type="button"
                  className={`blob-action-btn ${isPlaying ? 'active' : ''}`}
                  onClick={togglePlay}
                >
                  {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                  <span>{isPlaying ? 'Pause' : 'Play Loop'}</span>
                </button>
                <button
                  type="button"
                  className="blob-action-btn"
                  onClick={resetLoop}
                >
                  <RotateCcw size={14} />
                  <span>Reset Pos</span>
                </button>
              </div>
            </div>

            <div className="blob-control-group">
              <div className="blob-section-title">
                <Sliders size={14} /> Gateway Geometry
              </div>

              <div className="blob-slider-row">
                <div className="blob-slider-label">
                  <span>Squishy Void Flexibility</span>
                  <span className="blob-slider-val">{params.wallFlexibility.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.00"
                  max="2.00"
                  step="0.05"
                  value={params.wallFlexibility}
                  className="blob-slider"
                  onChange={(e) => setParams({ ...params, wallFlexibility: parseFloat(e.target.value) })}
                />
              </div>

              <div className="blob-slider-row">
                <div className="blob-slider-label">
                  <span>Gap Height (Y)</span>
                  <span className="blob-slider-val">{params.gapHeight.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.15"
                  max="1.20"
                  step="0.01"
                  value={params.gapHeight}
                  className="blob-slider"
                  onChange={(e) => setParams({ ...params, gapHeight: parseFloat(e.target.value) })}
                />
              </div>

              <div className="blob-slider-row">
                <div className="blob-slider-label">
                  <span>Wall Thickness (Z)</span>
                  <span className="blob-slider-val">{params.wallThickness.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.20"
                  max="1.50"
                  step="0.05"
                  value={params.wallThickness}
                  className="blob-slider"
                  onChange={(e) => setParams({ ...params, wallThickness: parseFloat(e.target.value) })}
                />
              </div>
            </div>

            <div className="blob-control-group">
              <div className="blob-section-title">
                <Layers size={14} /> Soft-Body Physical Properties
              </div>

              <div className="blob-slider-row">
                <div className="blob-slider-label">
                  <span>Elastic Compressibility (Stiffness)</span>
                  <span className="blob-slider-val">{params.stiffness.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="1.00"
                  step="0.02"
                  value={params.stiffness}
                  className="blob-slider"
                  onChange={(e) => setParams({ ...params, stiffness: parseFloat(e.target.value) })}
                />
              </div>

              <div className="blob-slider-row">
                <div className="blob-slider-label">
                  <span>Volume Retention Bulge</span>
                  <span className="blob-slider-val">{params.volumeBulge.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="2.5"
                  step="0.05"
                  value={params.volumeBulge}
                  className="blob-slider"
                  onChange={(e) => setParams({ ...params, volumeBulge: parseFloat(e.target.value) })}
                />
              </div>
            </div>
          </>
        )}

        {/* Section: Camera Presets */}
        <div className="blob-control-group">
          <div className="blob-section-title">
            <Camera size={14} /> Camera Perspectives
          </div>
          <div className="blob-btn-grid-3">
            <button
              type="button"
              className={`blob-action-btn ${activeCamView === 'front' ? 'active' : ''}`}
              onClick={() => setCameraPreset('front')}
            >
              Front
            </button>
            <button
              type="button"
              className={`blob-action-btn ${activeCamView === 'iso' ? 'active' : ''}`}
              onClick={() => setCameraPreset('iso')}
            >
              3/4 Iso
            </button>
            <button
              type="button"
              className={`blob-action-btn ${activeCamView === 'side' ? 'active' : ''}`}
              onClick={() => setCameraPreset('side')}
            >
              Side Rim
            </button>
          </div>
          <button
            type="button"
            className={`blob-action-btn ${params.wireframe ? 'active' : ''}`}
            onClick={() => setParams({ ...params, wireframe: !params.wireframe })}
            style={{ width: '100%', marginTop: '4px' }}
          >
            <Eye size={14} />
            <span>{params.wireframe ? 'Hide Wireframe' : 'Show Vertex Mesh'}</span>
          </button>
        </div>
      </aside>

      {/* Bottom HUD: Dynamic according to Active Mode */}
      <div className="blob-lab-bottom-hud">
        {viewMode === 'texture-studio' ? (
          <>
            <div className="blob-hud-row">
              <div className="blob-hud-title">
                <span>🧸 360° Studio Turntable Angle</span>
                <span className="blob-gateway-indicator exiting">
                  Studio Inspection Mode (Walls Hidden)
                </span>
              </div>
              <div className="blob-hud-stats">
                <div className="blob-stat-item">
                  Angle: <strong>{turntableAngle}°</strong>
                </div>
                <div className="blob-stat-item">
                  Texture: <strong>Smooth Velvet (No Holes)</strong>
                </div>
                <div className="blob-stat-item">
                  Halo: <strong>Peach-Fuzz Sheen</strong>
                </div>
              </div>
            </div>

            <input
              type="range"
              min="0"
              max="360"
              step="1"
              value={turntableAngle}
              className="blob-slider"
              onChange={(e) => handleScrubTurntable(e.target.value)}
            />
          </>
        ) : (
          <>
            <div className="blob-hud-row">
              <div className="blob-hud-title">
                <span>Path Position Scrubber (Z-Axis)</span>
                <span
                  className={`blob-gateway-indicator ${
                    gatewayStatus.includes('Squeezing')
                      ? 'squeezing'
                      : gatewayStatus.includes('Entering')
                      ? 'entering'
                      : gatewayStatus.includes('Exited')
                      ? 'exiting'
                      : 'outside'
                  }`}
                >
                  {gatewayStatus}
                </span>
              </div>
              <div className="blob-hud-stats">
                <div className="blob-stat-item">
                  Z: <strong>{blobZ.toFixed(2)}m</strong>
                </div>
                <div className="blob-stat-item">
                  Collision: <strong>Soft-Body Morph</strong>
                </div>
              </div>
            </div>

            <input
              type="range"
              min="-3.0"
              max="3.0"
              step="0.01"
              value={blobZ}
              className="blob-slider"
              onChange={(e) => handleScrubZ(e.target.value)}
            />
          </>
        )}
      </div>
    </div>
  );
}
