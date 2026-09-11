import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import gsap from 'gsap';

// Module-level cache to prevent re-fetching GLB
let cachedMasterGltf = null;
let cachedTextures = null;

export const HOME_AVATAR_DATA = [
  {
    id: 'lavender',
    name: 'Mowgli',
    texture: '/avatar_purple.webp?v=7',
    color: '#40f71b', // Electric Green
    audio: '/audio/home/mowgli_home.wav',
    fallbackAudio: '/audio/chamber/mowgli_chosen.wav',
    landingX: -3.95,  // Mowgli — leftmost
    landingZ: 2.12,
    baseRotY: 0.16,
  },
  {
    id: 'peach',
    name: 'Belle',
    texture: '/avatar_red.webp?v=7',
    color: '#ec4899', // Pink
    audio: '/audio/home/belle_home.wav',
    fallbackAudio: '/audio/chamber/belle_chosen.wav',
    landingX: -2.10,  // Belle — 1.85 units from Mowgli
    landingZ: 2.28,
    baseRotY: 0.05,
  },
  {
    id: 'cream',
    name: 'Moana',
    texture: '/avatar_gold.webp?v=7',
    color: '#ef4444', // Red
    audio: '/audio/home/moana_home.wav',
    fallbackAudio: '/audio/chamber/moana_chosen.wav',
    landingX: -0.25,  // Moana — 1.85 units from Belle
    landingZ: 2.28,
    baseRotY: -0.05,
  },
  {
    id: 'cyan',
    name: 'Bhageera',
    texture: '/avatar_blue.webp?v=7',
    color: '#f59e0b', // Gold / Amber
    audio: '/audio/home/bhageera_howareyou.wav',
    fallbackAudio: '/audio/chamber/bhageera_chosen.wav',
    landingX:  1.60,  // Bhageera — 1.85 units from Moana
    landingZ: 2.12,
    baseRotY: -0.16,
  },
];

/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * POP_OUT_CONFIG — Edit these values to customise the pop-out animation.
 * Changes take effect immediately on the next scroll trigger.
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */
export const POP_OUT_CONFIG = {
  // ── Phase 1: avatar starts tiny in deep void and approaches text plane ──
  wordCrossingFrames:   25,    // number of keyframes
  wordCrossingDuration: 0.42,  // seconds spent reaching and breaching the text
  scaleAtWordEntry:  0.06,     // starts tiny in the cosmic void
  scaleAtWordExit:   0.45,     // medium size when reaching and pushing text
  wordCrossingCurve: 1.5,      // smooth acceleration into text plane

  // ── Phase 2: avatar BLOOMS in mid-air after breaching the words ──
  bloomFrames:   25,           // number of keyframes
  bloomDuration: 0.52,         // seconds spent blooming in mid-air
  scaleAtBloomEnd: 1.0,        // full-size scale at landing
  bloomCurve: 1.2,

  // ── Flight arc ──
  flightDuration: 0.94,        // total flight time = wordCrossingDuration + bloomDuration
  arcHeight: 0.26,             // world-units above origin at apex
};

/**
 * ═══════════════════════════════════════════════════════════════════
 * Dynamic 3D Luminous Motion Trail for Popping Avatars (Image 2)
 * Creates a glowing streamer ribbon + stardust sparks trailing
 * the avatar's curved 3D flight trajectory from the soft wall pocket.
 * ═══════════════════════════════════════════════════════════════════
 */
class AvatarMotionTrail {
  constructor(scene) {
    this.scene = scene;
    this.maxPoints = 20;
    this.history = [];
    this.active = false;
    this.opacity = 0;

    // Glowing additive gradient texture for streamer ribbon
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 128, 0);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    grad.addColorStop(0.35, 'rgba(255, 235, 195, 0.70)');
    grad.addColorStop(0.70, 'rgba(245, 183, 89, 0.35)');
    grad.addColorStop(1, 'rgba(245, 183, 89, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 32);

    const tex = new THREE.CanvasTexture(canvas);

    // Dynamic quad strip ribbon geometry
    const vertexCount = this.maxPoints * 2;
    const positions = new Float32Array(vertexCount * 3);
    const uvs = new Float32Array(vertexCount * 2);
    const indices = [];

    for (let i = 0; i < this.maxPoints - 1; i++) {
      const p1 = i * 2;
      const p2 = p1 + 1;
      const p3 = p1 + 2;
      const p4 = p1 + 3;
      indices.push(p1, p2, p3);
      indices.push(p2, p4, p3);
    }

    for (let i = 0; i < this.maxPoints; i++) {
      const u = i / (this.maxPoints - 1);
      uvs[i * 4] = u;
      uvs[i * 4 + 1] = 0;
      uvs[i * 4 + 2] = u;
      uvs[i * 4 + 3] = 1;
    }

    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    this.geo.setIndex(indices);

    this.mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.mesh = new THREE.Mesh(this.geo, this.mat);
    this.mesh.visible = false;
    this.mesh.renderOrder = 20;
    this.scene.add(this.mesh);

    // Stardust Sparkles along trail
    const sparkCount = 18;
    const sparkGeo = new THREE.BufferGeometry();
    const sparkPos = new Float32Array(sparkCount * 3);
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));

    const sCanvas = document.createElement('canvas');
    sCanvas.width = 64;
    sCanvas.height = 64;
    const sCtx = sCanvas.getContext('2d');
    const sGrad = sCtx.createRadialGradient(32, 32, 2, 32, 32, 30);
    sGrad.addColorStop(0, '#ffffff');
    sGrad.addColorStop(0.4, 'rgba(255, 235, 180, 0.85)');
    sGrad.addColorStop(1, 'rgba(245, 183, 89, 0)');
    sCtx.fillStyle = sGrad;
    sCtx.beginPath();
    sCtx.arc(32, 32, 30, 0, Math.PI * 2);
    sCtx.fill();

    const sparkTex = new THREE.CanvasTexture(sCanvas);
    this.sparkMat = new THREE.PointsMaterial({
      map: sparkTex,
      size: 0.22,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.sparks = new THREE.Points(sparkGeo, this.sparkMat);
    this.sparks.visible = false;
    this.sparks.renderOrder = 21;
    this.scene.add(this.sparks);
  }

  start(initialPos) {
    this.history = [];
    for (let i = 0; i < this.maxPoints; i++) {
      this.history.push(initialPos.clone());
    }
    this.active = true;
    this.opacity = 0.95;
    this.mesh.visible = true;
    this.sparks.visible = true;
    this.mat.opacity = 0.95;
    this.sparkMat.opacity = 0.95;
  }

  update(currentPos) {
    if (!this.active && this.opacity <= 0.01) {
      this.mesh.visible = false;
      this.sparks.visible = false;
      return;
    }

    if (this.active) {
      this.history.unshift(currentPos.clone());
      if (this.history.length > this.maxPoints) {
        this.history.pop();
      }
    } else {
      this.opacity = Math.max(0, this.opacity - 0.04);
      this.mat.opacity = this.opacity;
      this.sparkMat.opacity = this.opacity;
    }

    if (this.history.length < 2) return;

    const positions = this.geo.attributes.position.array;
    const sparkPositions = this.sparks.geometry.attributes.position.array;

    for (let i = 0; i < this.maxPoints; i++) {
      const idx = Math.min(i, this.history.length - 1);
      const p = this.history[idx];
      const nextP = this.history[Math.min(idx + 1, this.history.length - 1)];

      const dx = nextP.x - p.x;
      const dy = nextP.y - p.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;

      const progress = i / (this.maxPoints - 1);
      const width = 0.26 * (1 - progress * 0.85);

      positions[i * 6]     = p.x + nx * width;
      positions[i * 6 + 1] = p.y + ny * width;
      positions[i * 6 + 2] = p.z;

      positions[i * 6 + 3] = p.x - nx * width;
      positions[i * 6 + 4] = p.y - ny * width;
      positions[i * 6 + 5] = p.z;

      if (i < 18) {
        sparkPositions[i * 3]     = p.x + Math.sin(i * 3.4) * 0.14;
        sparkPositions[i * 3 + 1] = p.y + Math.cos(i * 2.7) * 0.14;
        sparkPositions[i * 3 + 2] = p.z + Math.sin(i * 1.5) * 0.08;
      }
    }

    this.geo.attributes.position.needsUpdate = true;
    this.sparks.geometry.attributes.position.needsUpdate = true;
  }

  stop() {
    this.active = false;
  }

  dispose() {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.geo.dispose();
      this.mat.dispose();
    }
    if (this.sparks) {
      this.scene.remove(this.sparks);
      this.sparks.geometry.dispose();
      this.sparkMat.dispose();
    }
  }
}

export class HomeAvatarManager {
  constructor(scene, camera, onLoad = null, canvas = null, sceneInstance = null) {
    this.scene = scene;
    this.camera = camera;
    this.onReady = onLoad;
    this.canvas = canvas;
    this.sceneInstance = sceneInstance;
    this.isReady = false;
    this.isDisposed = false;

    this.avatars = [];
    this.mouseGaze = { x: 0, y: 0 };
    this.time = 0;
    this.speakingAvatarIndex = -1;
    this.hoveredAvatarIndex = -1;  // Index of avatar being hovered by user (-1 = none)
    this.activeAudio = null;   // dialogue audio (tracked by playDialogue)
    this._sfxAudio   = null;   // single SFX slot — only one SFX plays at a time
    this.cursorTrackingEnabled = false;

    this.rugY = -2.15; // Top of circular floor rug

    // Ensure foreground canvas maintains high z-index over hero typography
    if (this.canvas && this.canvas.classList?.contains('ha-canvas-avatar')) {
      this.canvas.style.zIndex = '25';
      this.canvas.style.pointerEvents = 'none';
    }

    this._loadTexturesAndModel();
  }

  /**
   * Play a one-shot SFX sound.
   * Stops any previously playing SFX first so sounds never stack or loop.
   */
  _playSfx(src, volume = 0.85) {
    if (typeof window === 'undefined') return;
    try {
      if (this._sfxAudio) {
        this._sfxAudio.pause();
        this._sfxAudio.currentTime = 0;
        this._sfxAudio = null;
      }
      const sound = new Audio(src);
      sound.volume = volume;
      this._sfxAudio = sound;
      sound.play().catch(() => {});
      return sound;
    } catch (e) {}
    return null;
  }

  /** Stop any currently playing SFX (called on avatar settle). */
  _stopSfx() {
    if (this._sfxAudio) {
      try { this._sfxAudio.pause(); this._sfxAudio.currentTime = 0; } catch (e) {}
      this._sfxAudio = null;
    }
  }

  /**
   * Canvas remains at z-index 1 so hero text ("VEDIKA AI TUTOR") is always visible.
   */
  _raiseCanvas() {
    // No-op: Canvas must stay at z-index 1 so 3D room geometry never covers hero text
  }

  /**
   * Canvas remains at z-index 1.
   */
  _lowerCanvas() {
    const c = this.canvas || (typeof document !== 'undefined' && document.querySelector('canvas.ha-canvas'));
    if (c) c.style.zIndex = '1';
  }

  /** Pause active timeline and sound for animation inspection */
  pause() {
    if (this._sfxAudio && !this._sfxAudio.paused) {
      this._sfxAudio.pause();
      this._wasSfxPlaying = true;
    }
    if (this.activeAudio && !this.activeAudio.paused) {
      this.activeAudio.pause();
      this.activeAudioPlaying = true;
    }
  }

  /** Resume sound after pause */
  resume() {
    if (this._sfxAudio && this._wasSfxPlaying) {
      this._sfxAudio.play().catch(() => {});
      this._wasSfxPlaying = false;
    }
    if (this.activeAudio && this.activeAudioPlaying) {
      this.activeAudio.play().catch(() => {});
      this.activeAudioPlaying = false;
    }
  }

  /** Return the currently active pop-out GSAP timeline */
  getActiveTimeline() {
    return this.activeTimeline || null;
  }

  _loadTexturesAndModel() {
    const textureLoader = new THREE.TextureLoader();
    const gltfLoader = new GLTFLoader();

    const loadTexture = (buddy) =>
      new Promise((resolve) => {
        textureLoader.load(
          buddy.texture,
          (tex) => {
            tex.flipY = false;
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.needsUpdate = true;
            resolve(tex);
          },
          undefined,
          () => resolve(null)
        );
      });

    const loadGLTF = () =>
      new Promise((resolve) => {
        if (cachedMasterGltf) {
          resolve(cachedMasterGltf);
          return;
        }
        gltfLoader.load(
          '/Physics-avatar-opt.glb',
          (gltf) => {
            cachedMasterGltf = gltf;
            resolve(gltf);
          },
          undefined,
          (err) => {
            console.warn('Failed to load avatar GLB:', err);
            resolve(null);
          }
        );
      });

    const texturesPromise = cachedTextures
      ? Promise.resolve(cachedTextures)
      : Promise.all(HOME_AVATAR_DATA.map(loadTexture));

    Promise.all([texturesPromise, loadGLTF()]).then(([textures, gltf]) => {
      if (this.isDisposed || !gltf) return;
      cachedTextures = textures;
      this.textures = textures;
      this._instantiateAvatars(gltf);
    });
  }

  _instantiateAvatars(gltf) {
    const masterScene = gltf.scene;

    HOME_AVATAR_DATA.forEach((buddy, idx) => {
      const clone = masterScene.clone(true);

      const eyeBones = [];
      clone.traverse((child) => {
        const name = (child.name || '').toLowerCase();
        if (name.includes('eye') || name.includes('head') || name.includes('look')) {
          eyeBones.push(child);
        }
      });

      // Normalize size
      const box = new THREE.Box3().setFromObject(clone);
      const center = box.getCenter(new THREE.Vector3());
      const sizeVec = box.getSize(new THREE.Vector3());

      clone.position.x -= center.x;
      clone.position.y -= center.y;
      clone.position.z -= center.z;

      const maxDim = Math.max(sizeVec.x, sizeVec.y, sizeVec.z);
      const avatarScale = 1.32; // Scaled down for sleek, cute, proportional appearance
      if (maxDim > 0) {
        clone.scale.setScalar(avatarScale / maxDim);
      }

      // Material setup - curated vibrant initial color prevents any pitch-black flash
      clone.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material = child.material.clone();
          if (this.textures && this.textures[idx]) {
            child.material.map = this.textures[idx];
          }
          child.material.color.set('#FFFFFF');
          child.material.roughness = 0.70;
          child.material.metalness = 0.05;
          child.castShadow = true;
          child.receiveShadow = true;
          child.material.needsUpdate = true;
        }
      });

      // Procedural 2D Mouth & Lips Overlay (Attached cleanly to front face of avatar)
      const faceCanvas = document.createElement('canvas');
      faceCanvas.width = 512;
      faceCanvas.height = 512;
      const faceCtx = faceCanvas.getContext('2d');
      this._drawFace(faceCtx, 0, buddy);

      const faceTexture = new THREE.CanvasTexture(faceCanvas);
      faceTexture.minFilter = THREE.LinearFilter;
      faceTexture.magFilter = THREE.LinearFilter;

      const faceGeo = new THREE.PlaneGeometry(0.86, 0.86);
      const faceMat = new THREE.MeshBasicMaterial({
        map: faceTexture,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        polygonOffset: true,
        polygonOffsetFactor: -3,
        polygonOffsetUnits: -3,
        side: THREE.FrontSide,
      });
      const faceMesh = new THREE.Mesh(faceGeo, faceMat);
      // Positioned cleanly on the front surface of the avatar's face at scale 1.32
      faceMesh.position.set(0, -0.065, 0.672);
      faceMesh.renderOrder = 25;

      const avatarGroup = new THREE.Group();
      avatarGroup.add(clone);
      avatarGroup.add(faceMesh);

      // Contact Shadow Disc underneath avatar on rug
      const shadowCanvas = document.createElement('canvas');
      shadowCanvas.width = 128;
      shadowCanvas.height = 128;
      const sCtx = shadowCanvas.getContext('2d');
      const grad = sCtx.createRadialGradient(64, 64, 4, 64, 64, 60);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
      grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.25)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      sCtx.fillStyle = grad;
      sCtx.fillRect(0, 0, 128, 128);

      const shadowTex = new THREE.CanvasTexture(shadowCanvas);
      const shadowGeo = new THREE.PlaneGeometry(1.22, 1.22);
      const shadowMat = new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        depthWrite: false,
      });
      const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
      shadowMesh.rotation.x = -Math.PI / 2;
      shadowMesh.position.y = -0.60;
      avatarGroup.add(shadowMesh);

      // Start hidden directly behind the words (cosmic slit area on left)
      const defaultOrigin = this.getWordOrigin('center', -0.5);
      avatarGroup.position.set(defaultOrigin.x, defaultOrigin.y, defaultOrigin.z);
      avatarGroup.scale.set(0.001, 0.001, 0.001);
      avatarGroup.visible = false;

      this.scene.add(avatarGroup);

      this.avatars.push({
        id: buddy.id,
        name: buddy.name,
        group: avatarGroup,
        mesh: clone,
        faceMesh,
        faceCtx,
        faceCanvas,
        faceTexture,
        shadowMesh,
        eyeBones,
        buddyData: buddy,
        landingTarget: new THREE.Vector3(buddy.landingX, this.rugY + 0.62, buddy.landingZ),
        isSettled: false,
        settleTimestamp: 0,
        baseRotY: buddy.baseRotY || 0,
        currentBaseRotY: buddy.baseRotY || 0,
        currentGaze: { x: 0, y: 0, z: 0 },
        targetGaze: { x: 0, y: 0, z: 0 },
        nextGlanceTime: 0,
        isBlinking: false,
        lastBlinkTime: Math.random() * 3,
        baseScale: 1.0,
        mouthOpen: 0,
        speechMotion: { bob: 0, nod: 0, roll: 0, yaw: 0, stretch: 1.0, squash: 1.0 },
        trail: null,
      });
    });

    if (this.sceneInstance?.renderer && this.sceneInstance?.roomScene && this.camera) {
      try {
        this.sceneInstance.renderer.compile(this.sceneInstance.roomScene, this.camera);
      } catch (e) {}
    }
    if (this.sceneInstance?.avatarRenderer && this.scene && this.camera) {
      try {
        this.sceneInstance.avatarRenderer.compile(this.scene, this.camera);
      } catch (e) {}
    }

    this.isReady = true;
    if (this.onReady) this.onReady();
  }

  /**
   * Render clean, cute avatar lips and dynamic speech mouth animation.
   * Simple, natural, and charming mascot mouth without awkward teeth or uncanny anatomy.
   */
  _drawFace(ctx, mouthOpen = 0, buddy = null) {
    ctx.clearRect(0, 0, 512, 512);

    ctx.save();
    // Position mouth on lower face below eyes (x: 256, y: 310)
    ctx.translate(256, 310);

    const open = Math.max(0, Math.min(1.0, mouthOpen));
    const isSpeaking = open > 0.04;

    // Clean, cute mouth width (62px resting, expanding to 76px when talking)
    const w = 62 + open * 14;
    const halfW = w / 2;

    ctx.strokeStyle = '#181216';
    ctx.lineWidth = 4.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (isSpeaking) {
      const openH = open * 22; // Mouth cavity height up to 22px
      const curveY = 8;

      // ── Open Cheerful Speaking Mouth ──
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(-halfW, -curveY * 0.35);
      ctx.quadraticCurveTo(0, -curveY * 0.70, halfW, -curveY * 0.35);
      ctx.quadraticCurveTo(0, curveY + openH, -halfW, -curveY * 0.35);
      ctx.closePath();

      // Dark warm mouth cavity
      ctx.fillStyle = '#1C1218';
      ctx.fill();
      ctx.clip(); // Clip cute tongue inside mouth

      // Cute animated pink tongue (NO teeth!)
      const tongueY = curveY + openH - 2;
      ctx.fillStyle = '#FF758F';
      ctx.beginPath();
      ctx.ellipse(0, tongueY, halfW * 0.58, openH * 0.55 + 5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore(); // End clip

      // Smooth clean lip contour around open mouth
      ctx.beginPath();
      ctx.moveTo(-halfW, -curveY * 0.35);
      ctx.quadraticCurveTo(0, -curveY * 0.70, halfW, -curveY * 0.35);
      ctx.quadraticCurveTo(0, curveY + openH, -halfW, -curveY * 0.35);
      ctx.stroke();

      // Cute corner smile dimples
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(-halfW - 2.5, -curveY * 0.35 - 2);
      ctx.lineTo(-halfW + 1, -curveY * 0.35 + 2);
      ctx.moveTo(halfW + 2.5, -curveY * 0.35 - 2);
      ctx.lineTo(halfW - 1, -curveY * 0.35 + 2);
      ctx.stroke();

    } else {
      // ── Cute Natural Resting Smile ──
      const curveY = 12;

      ctx.beginPath();
      ctx.moveTo(-halfW, -curveY * 0.28);
      ctx.quadraticCurveTo(0, curveY, halfW, -curveY * 0.28);
      ctx.stroke();

      // Delicate corner smile dimples
      ctx.lineWidth = 3.0;
      ctx.beginPath();
      ctx.moveTo(-halfW - 2.5, -curveY * 0.28 - 2);
      ctx.lineTo(-halfW + 1, -curveY * 0.28 + 2);
      ctx.moveTo(halfW + 2.5, -curveY * 0.28 - 2);
      ctx.lineTo(halfW - 1, -curveY * 0.28 + 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Builds a 50-keyframe GSAP scale array for a cinematic pop-out bloom.
   *
   * Phase 1 — 20 frames × 0.020s = 0.40s (word-plane crossing):
   *   Avatar stays proportionally TINY (like the gap between words).
   *   Power-2 curve: 0.001 → 0.080.
   *
   * Phase 2 — 30 frames × 0.018s = 0.54s (mid-air, growing toward camera):
   *   Avatar gradually blooms from 0.080 → 1.000 using a power-1.5 curve,
   *   partially occluding the words as it arcs forward, then reaching full
   *   size just before landing on the rug.
   *
   * Total pop-out duration: 0.94s (matches flight arc length).
   */
  _buildPopOutScaleKeyframes() {
    const cfg = POP_OUT_CONFIG;
    const kf = [];
    const perFrame1 = cfg.wordCrossingDuration / cfg.wordCrossingFrames;
    const perFrame2 = cfg.bloomDuration / cfg.bloomFrames;
    const range1 = cfg.scaleAtWordExit - cfg.scaleAtWordEntry;
    const range2 = cfg.scaleAtBloomEnd - cfg.scaleAtWordExit;

    // Phase 1: tiny zone — stays word-proportionate while crossing text
    for (let i = 0; i <= cfg.wordCrossingFrames; i++) {
      const t = i / cfg.wordCrossingFrames;
      const s = parseFloat(Math.max(cfg.scaleAtWordEntry,
        cfg.scaleAtWordEntry + range1 * Math.pow(t, cfg.wordCrossingCurve)
      ).toFixed(4));
      kf.push({ x: s, y: s, z: s, duration: i === 0 ? 0 : perFrame1, ease: 'none' });
    }

    // Phase 2: bloom zone — grows in mid-air toward camera
    for (let j = 1; j <= cfg.bloomFrames; j++) {
      const t = j / cfg.bloomFrames;
      const s = parseFloat(
        (cfg.scaleAtWordExit + range2 * Math.pow(t, cfg.bloomCurve)).toFixed(4)
      );
      kf.push({ x: s, y: s, z: s, duration: perFrame2, ease: 'none' });
    }

    return kf;
  }

  /**
   * Adds a 3-bounce landing sequence with audio perfectly synced to each
   * physical touchdown. No audio fires after the avatar comes to rest.
   *
   * Bounce timeline (relative to t0):
   *   t0 + 0.00s — BIG squash + Audio-2 @ 0.88  (first hit)
   *   t0 + 0.10s — stretch up  (silent)
   *   t0 + 0.32s — rebound hit + Audio-2 @ 0.40  (second hit)
   *   t0 + 0.50s — small bounce up  (silent)
   *   t0 + 0.64s — gentle final land  (silent)
   *   t0 + 0.78s — scale settle to 1.0  (silent)
   *   t0 + 1.04s — onSettled callback fires
   *
   * @param {gsap.core.Timeline} tl - Parent GSAP timeline
   * @param {THREE.Group} g - Avatar group
   * @param {THREE.Vector3} target - Landing position
   * @param {number} t0 - Timestamp of first touchdown on parent tl
   * @param {Function} [onSettled] - Called once avatar fully rests
   */
  /**
   * Landing bounce: ONE audio at first touchdown, plays through settle, then stops.
   */
  _addLandingBounce(tl, g, target, t0, onSettled) {
    const cfg = POP_OUT_CONFIG;

    // ONE bounce sound fires at touchdown and plays through the whole settle
    tl.call(() => { this._playSfx('/audio/home-landing-audio/Audio-2.mpeg', 0.90); }, null, t0);

    // Big squash on first hit
    tl.to(g.scale, { x: 1.26, y: 0.72, z: 1.26, duration: 0.10, ease: 'power3.out' }, t0);

    // Stretch upward
    tl.to(g.position, { y: target.y + 0.30, duration: 0.22, ease: 'power2.out' }, t0 + 0.10);
    tl.to(g.scale,    { x: 0.90, y: 1.14, z: 0.90, duration: 0.22, ease: 'sine.out'  }, t0 + 0.10);

    // Rebound down (audio still playing naturally)
    tl.to(g.position, { y: target.y,      duration: 0.18, ease: 'power3.in'  }, t0 + 0.32);
    tl.to(g.scale,    { x: 1.10, y: 0.88, z: 1.10, duration: 0.10, ease: 'power2.out' }, t0 + 0.32);

    // Small second bounce up
    tl.to(g.position, { y: target.y + 0.10, duration: 0.14, ease: 'power1.out' }, t0 + 0.50);
    tl.to(g.scale,    { x: 0.97, y: 1.04, z: 0.97, duration: 0.14, ease: 'sine.out'  }, t0 + 0.50);

    // Final settle — stop SFX exactly when avatar comes to rest
    tl.to(g.position, { y: target.y, duration: 0.14, ease: 'power2.in' }, t0 + 0.64);
    tl.to(g.scale, {
      x: 1.0, y: 1.0, z: 1.0,
      duration: 0.26,
      ease: 'sine.out',
      onComplete: () => {
        this._stopSfx();           // <- audio stops here, NOT before
        if (onSettled) onSettled();
      },
    }, t0 + 0.78);

    return t0 + 1.04;
  }

  /**
   * Play dialogue audio for the specified avatar and animate talking lips
   */
  playDialogue(index, audioSrc, onComplete = null) {
    if (typeof window === 'undefined') return;
    try {
      if (this.activeAudio) {
        this.activeAudio.pause();
        this.activeAudio.currentTime = 0;
      }
      this.speakingAvatarIndex = index;

      const audio = new Audio(audioSrc);
      audio.volume = 0.95;
      this.activeAudio = audio;

      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        if (this.speakingAvatarIndex === index) {
          this.speakingAvatarIndex = -1;
        }
        if (this.activeAudio === audio) {
          this.activeAudio = null;
        }
        if (onComplete) onComplete();
      };

      audio.onended = finish;
      audio.onerror = () => {
        setTimeout(finish, 2400);
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('Audio autoplay restricted by browser policy:', err?.message);
          // If browser policy restricts direct autoplay without gesture,
          // still animate the avatar's lips for the speech duration so animation is never lost!
          setTimeout(finish, 2600);
        });
      }
    } catch (e) {
      this.speakingAvatarIndex = -1;
      if (onComplete) onComplete();
    }
  }

  /**
   * Compute the exact 3D world space coordinate corresponding to the words text area
   * where the letters open on the left side of the screen.
   */
  getWordOrigin(letterKey = 'center', depthZ = -0.6) {
    if (typeof window !== 'undefined' && this.camera) {
      try {
        let topEl = null;
        let btmEl = null;

        if (letterKey === 'left' || letterKey === 've') {
          topEl = document.getElementById('ha-e') || document.getElementById('ha-ve');
          btmEl = document.getElementById('ha-i2') || document.getElementById('ha-ai');
        } else if (letterKey === 'right' || letterKey === 'ka') {
          topEl = document.getElementById('ha-k') || document.getElementById('ha-ka');
          btmEl = document.getElementById('ha-o') || document.getElementById('ha-tor');
        } else {
          topEl = document.getElementById('ha-d') || document.getElementById('ha-di');
          btmEl = document.getElementById('ha-t1') || document.getElementById('ha-tu');
        }

        if (!topEl) topEl = document.querySelector('.ha-title-row-1');
        if (!btmEl) btmEl = document.querySelector('.ha-title-row-2');

        const canvas = this.canvas || document.querySelector('canvas.ha-canvas');
        if (topEl && canvas) {
          const topRect = topEl.getBoundingClientRect();
          const btmRect = btmEl ? btmEl.getBoundingClientRect() : topRect;
          const cRect = canvas.getBoundingClientRect();

          // Target exact center point of the void gap between top row and bottom row
          const screenX = (topRect.left + topRect.right) / 2;
          const screenY = btmEl ? (topRect.bottom + btmRect.top) / 2 : topRect.bottom + 12;

          const ndcX = ((screenX - cRect.left) / cRect.width) * 2 - 1;
          const ndcY = -(((screenY - cRect.top) / cRect.height) * 2 - 1);

          const vec = new THREE.Vector3(ndcX, ndcY, 0.5);
          vec.unproject(this.camera);
          const dir = vec.sub(this.camera.position).normalize();
          const distance = (depthZ - this.camera.position.z) / dir.z;
          const worldPos = this.camera.position.clone().add(dir.multiplyScalar(distance));
          if (worldPos && isFinite(worldPos.x) && isFinite(worldPos.y) && isFinite(worldPos.z)) {
            return worldPos;
          }
        }
      } catch (e) {
        // Fallback below
      }
    }

    if (letterKey === 'left' || letterKey === 've') return new THREE.Vector3(-5.4, 1.68, depthZ);
    if (letterKey === 'right' || letterKey === 'ka') return new THREE.Vector3(-3.0, 1.68, depthZ);
    return new THREE.Vector3(-4.4, 1.68, depthZ);
  }

  /**
   * Step 1 (1st Scroll): Mowgli (Electric Green) emerges from 3D elastic soft wall pocket
   * (Image "2. PEEKS OUT"), front lip covers lower body and stretches with spherical curvature,
   * blooms to full size into the room, arcs to rug with stardust trail, pocket snaps shut elastically.
   */
  playStep1(onComplete = null) {
    if (!this.isReady || this.avatars.length === 0) return;
    const avatar = this.avatars[0];
    if (!avatar) return;

    let origin = this.getWordOrigin('center', -0.55);
    if (!origin || !Number.isFinite(origin.x) || !Number.isFinite(origin.y) || !Number.isFinite(origin.z)) {
      origin = new THREE.Vector3(-4.4, 1.68, -0.55);
    }
    const target = avatar.landingTarget;
    const g = avatar.group;

    // Anchor 3D soft wall pocket position directly behind gap
    this.sceneInstance?.updatePocketPosition(origin);

    g.visible = true;
    avatar.mesh.traverse((c) => { if (c.isMesh) c.visible = true; });
    if (avatar.faceMesh) avatar.faceMesh.visible = true;
    if (avatar.shadowMesh) avatar.shadowMesh.visible = true;

    // Avatar starts inside the wall pocket, body below the pocket seam
    g.position.set(origin.x, origin.y - 0.28, -0.62);
    g.scale.set(0.48, 0.48, 0.48);
    avatar.isSettled = false;
    avatar.targetGaze = { x: 0, y: 0, z: 0 };
    avatar.currentGaze = { x: 0, y: 0, z: 0 };

    if (avatar.trail) avatar.trail.stop();

    // Whoosh pop-out sound
    this._playSfx('/audio/home-landing-audio/Audio-1.mpeg', 0.85);

    const tl = gsap.timeline();
    this.activeTimeline = tl;

    // Phase 1 (0.00s – 0.28s): "2. PEEKS OUT" — Pocket stretches & avatar rises inside pocket
    // Mowgli rises so eyes & brow peek out; 3D front lip covers the lower body
    tl.to(g.position, { y: origin.y + 0.05, z: -0.52, duration: 0.28, ease: 'sine.out' }, 0);

    const pocketParams = { open: 0, stretch: 0 };
    tl.to(pocketParams, {
      open: 1.0,
      stretch: 0.46,
      duration: 0.28,
      ease: 'power2.out',
      onUpdate: () => {
        this.sceneInstance?.setPocketDeformation(pocketParams.open, g.position, pocketParams.stretch);
      },
    }, 0);

    // Phase 2 (0.28s – 0.48s): Mowgli breaches forward into room & blooms to full size
    tl.call(() => {
      if (avatar.trail) avatar.trail.start(g.position);
    }, null, 0.30);

    tl.to(g.position, { z: 0.12, duration: 0.16, ease: 'power2.in' }, 0.26);
    tl.to(g.scale, { x: 1.0, y: 1.0, z: 1.0, duration: 0.60, ease: 'power2.out' }, 0.28);

    // Phase 3 (0.48s – 0.85s): Flight arc to rug & Wall Pocket elastically snaps shut
    tl.to(g.position, { x: target.x, duration: 0.94, ease: 'power2.inOut' }, 0.22);
    tl.to(g.position, { z: 0.95, duration: 0.24, ease: 'power2.out' }, 0.38);
    tl.to(g.position, { z: target.z, duration: 0.32, ease: 'sine.inOut' }, 0.62);
    tl.to(g.position, { y: origin.y + 0.32, duration: 0.24, ease: 'sine.out' }, 0.24);
    tl.to(g.position, { y: target.y, duration: 0.46, ease: 'power2.in' }, 0.48);

    // Wall Pocket elastically snaps back flush with back wall
    tl.to(pocketParams, {
      open: 0.0,
      stretch: 0.0,
      duration: 0.42,
      ease: 'elastic.out(1.15, 0.45)',
      onUpdate: () => {
        this.sceneInstance?.setPocketDeformation(pocketParams.open, g.position, pocketParams.stretch);
      },
    }, 0.48);

    // Physics-accurate 3-bounce landing
    this._addLandingBounce(tl, g, target, 0.94, () => {
      g.position.copy(target);
      g.scale.set(1, 1, 1);
      avatar.isSettled = true;
      avatar.settleTimestamp = this.time;
      avatar.targetGaze = { x: 0, y: 0, z: 0 };
      avatar.currentGaze = { x: 0, y: 0, z: 0 };
      avatar.nextGlanceTime = this.time + 3.6;
      if (avatar.trail) avatar.trail.stop();
    });

    // Mowgli dialogue fires after full settle (0.94 + 1.04 = 1.98s)
    tl.call(() => {
      this.playDialogue(0, '/audio/home/mowgli_home.wav', onComplete);
    }, null, 2.05);

    return tl;
  }

  /**
   * Step 2 (2nd Scroll): Belle & Moana emerge through twin apertures.
   * Belle (left, first) and Moana (right, 0.35s stagger).
   * Both use 50-keyframe bloom and physics-accurate 3-bounce landing.
   */
  playStep2(onComplete = null) {
    if (!this.isReady || this.avatars.length < 3) return;

    this._playSfx('/audio/home-landing-audio/Audio-1.mpeg', 0.85);

    const tl = gsap.timeline();
    this.activeTimeline = tl;

    const belle = this.avatars[1];
    const moana = this.avatars[2];

    let originBelle = this.getWordOrigin('left', -1.2);
    if (!originBelle || !Number.isFinite(originBelle.x) || !Number.isFinite(originBelle.y) || !Number.isFinite(originBelle.z)) {
      originBelle = new THREE.Vector3(-5.4, 1.68, -1.2);
    }
    const targetBelle = belle.landingTarget;
    const gBelle = belle.group;

    let originMoana = this.getWordOrigin('right', -1.2);
    if (!originMoana || !Number.isFinite(originMoana.x) || !Number.isFinite(originMoana.y) || !Number.isFinite(originMoana.z)) {
      originMoana = new THREE.Vector3(-3.0, 1.68, -1.2);
    }
    const targetMoana = moana.landingTarget;
    const gMoana = moana.group;

    // ── BELLE (Avatar 2 - Pink) ── emerges first from Left Aperture ──
    gBelle.visible = true;
    belle.mesh.traverse((c) => { if (c.isMesh) c.visible = true; });
    if (belle.faceMesh) belle.faceMesh.visible = true;
    if (belle.shadowMesh) belle.shadowMesh.visible = true;

    gBelle.position.set(originBelle.x, originBelle.y - 0.06, -0.28);
    gBelle.scale.set(0.18, 0.18, 0.18);
    belle.isSettled = false;
    belle.targetGaze = { x: 0, y: 0, z: 0 };
    belle.currentGaze = { x: 0, y: 0, z: 0 };
    if (belle.trail) belle.trail.stop();

    const belleTl = gsap.timeline({ delay: 0.0 });

    belleTl.to(gBelle.position, { z: -0.04, duration: 0.24, ease: 'sine.out' }, 0);
    belleTl.to(gBelle.scale, { x: 0.38, y: 0.38, z: 0.38, duration: 0.24, ease: 'sine.out' }, 0);

    belleTl.call(() => {
      if (belle.trail) belle.trail.start(gBelle.position);
    }, null, 0.30);

    belleTl.to(gBelle.scale, { x: 1.0, y: 1.0, z: 1.0, duration: 0.62, ease: 'power2.out' }, 0.28);

    // Belle flight arc
    belleTl.to(gBelle.position, { x: targetBelle.x, duration: 0.94, ease: 'power2.inOut' }, 0.22);
    belleTl.to(gBelle.position, { z: 0.08, duration: 0.14, ease: 'power2.in' }, 0.24);
    belleTl.to(gBelle.position, { z: 0.95, duration: 0.24, ease: 'power2.out' }, 0.38);
    belleTl.to(gBelle.position, { z: targetBelle.z, duration: 0.32, ease: 'sine.inOut' }, 0.62);
    belleTl.to(gBelle.position, { y: originBelle.y + 0.32, duration: 0.24, ease: 'sine.out' }, 0.24);
    belleTl.to(gBelle.position, { y: targetBelle.y, duration: 0.46, ease: 'power2.in' }, 0.48);

    // Belle 3-bounce landing
    this._addLandingBounce(belleTl, gBelle, targetBelle, 0.94, () => {
      gBelle.position.copy(targetBelle);
      gBelle.scale.set(1, 1, 1);
      belle.isSettled = true;
      belle.settleTimestamp = this.time;
      belle.targetGaze = { x: 0, y: 0, z: 0 };
      belle.currentGaze = { x: 0, y: 0, z: 0 };
      belle.nextGlanceTime = this.time + 3.8;
      if (belle.trail) belle.trail.stop();
    });

    tl.add(belleTl, 0);

    // ── MOANA (Avatar 3 - Red) ── 0.35s stagger from Right Aperture ──
    gMoana.visible = true;
    moana.mesh.traverse((c) => { if (c.isMesh) c.visible = true; });
    if (moana.faceMesh) moana.faceMesh.visible = true;
    if (moana.shadowMesh) moana.shadowMesh.visible = true;

    gMoana.position.set(originMoana.x, originMoana.y - 0.06, -0.28);
    gMoana.scale.set(0.18, 0.18, 0.18);
    moana.isSettled = false;
    moana.targetGaze = { x: 0, y: 0, z: 0 };
    moana.currentGaze = { x: 0, y: 0, z: 0 };
    if (moana.trail) moana.trail.stop();

    const moanaTl = gsap.timeline({ delay: 0.35 });

    moanaTl.to(gMoana.position, { z: -0.04, duration: 0.24, ease: 'sine.out' }, 0);
    moanaTl.to(gMoana.scale, { x: 0.38, y: 0.38, z: 0.38, duration: 0.24, ease: 'sine.out' }, 0);

    moanaTl.call(() => {
      if (moana.trail) moana.trail.start(gMoana.position);
    }, null, 0.30);

    moanaTl.to(gMoana.scale, { x: 1.0, y: 1.0, z: 1.0, duration: 0.62, ease: 'power2.out' }, 0.28);

    // Moana flight arc
    moanaTl.to(gMoana.position, { x: targetMoana.x, duration: 0.94, ease: 'power2.inOut' }, 0.22);
    moanaTl.to(gMoana.position, { z: 0.08, duration: 0.14, ease: 'power2.in' }, 0.24);
    moanaTl.to(gMoana.position, { z: 0.95, duration: 0.24, ease: 'power2.out' }, 0.38);
    moanaTl.to(gMoana.position, { z: targetMoana.z, duration: 0.32, ease: 'sine.inOut' }, 0.62);
    moanaTl.to(gMoana.position, { y: originMoana.y + 0.32, duration: 0.24, ease: 'sine.out' }, 0.24);
    moanaTl.to(gMoana.position, { y: targetMoana.y, duration: 0.46, ease: 'power2.in' }, 0.48);

    // Moana 3-bounce landing
    this._addLandingBounce(moanaTl, gMoana, targetMoana, 0.94, () => {
      gMoana.position.copy(targetMoana);
      gMoana.scale.set(1, 1, 1);
      moana.isSettled = true;
      moana.settleTimestamp = this.time;
      moana.targetGaze = { x: 0, y: 0, z: 0 };
      moana.currentGaze = { x: 0, y: 0, z: 0 };
      moana.nextGlanceTime = this.time + 3.6;
      if (moana.trail) moana.trail.stop();
    });

    tl.add(moanaTl, 0);

    // Dialogues after both are fully settled (moana settles at 0.35 + 1.98 = 2.33s)
    tl.call(() => {
      this.playDialogue(1, '/audio/home/belle_home.wav', () => {
        this.playDialogue(2, '/audio/home/moana_home.wav', onComplete);
      });
    }, null, 2.45);

    return tl;
  }

  /**
   * Step 3 (3rd Scroll): Bhageera (Golden Orange) pops out from "KA" & "TOR",
   * 50-keyframe bloom, arcs to rug, lands with heavy 3-bounce settle (exhausted),
   * then perks up with an energetic 360-spin spring hop!
   */
  playStep3(onComplete = null) {
    if (!this.isReady || this.avatars.length < 4) return;
    const avatar = this.avatars[3];
    if (!avatar) return;

    let origin = this.getWordOrigin('right', -1.2);
    if (!origin || !isFinite(origin.x) || !isFinite(origin.y) || !isFinite(origin.z)) {
      origin = new THREE.Vector3(-3.0, 1.68, -1.2);
    }
    const target = avatar.landingTarget;
    const g = avatar.group;

    g.visible = true;
    avatar.mesh.traverse((c) => { if (c.isMesh) c.visible = true; });
    if (avatar.faceMesh) avatar.faceMesh.visible = true;
    if (avatar.shadowMesh) avatar.shadowMesh.visible = true;

    g.position.set(origin.x, origin.y - 0.06, -0.28);
    g.scale.set(0.18, 0.18, 0.18);
    avatar.isSettled = false;
    if (avatar.trail) avatar.trail.stop();

    this._playSfx('/audio/home-landing-audio/Audio-1.mpeg', 0.85);

    const tl = gsap.timeline();
    this.activeTimeline = tl;

    tl.to(g.position, { z: -0.04, duration: 0.24, ease: 'sine.out' }, 0);
    tl.to(g.scale, { x: 0.38, y: 0.38, z: 0.38, duration: 0.24, ease: 'sine.out' }, 0);

    tl.call(() => {
      if (avatar.trail) avatar.trail.start(g.position);
    }, null, 0.30);

    tl.to(g.scale, { x: 1.0, y: 1.0, z: 1.0, duration: 0.62, ease: 'power2.out' }, 0.28);

    // 3D flight arc: breaches text at 0.38s, blooms in mid-air, lands on rug
    tl.to(g.position, { x: target.x, duration: 0.94, ease: 'power2.inOut' }, 0.22);
    tl.to(g.position, { z: 0.08, duration: 0.14, ease: 'power2.in' }, 0.24);
    tl.to(g.position, { z: 0.95, duration: 0.24, ease: 'power2.out' }, 0.38);
    tl.to(g.position, { z: target.z, duration: 0.32, ease: 'sine.inOut' }, 0.62);
    tl.to(g.position, { y: origin.y + 0.32, duration: 0.24, ease: 'sine.out' }, 0.24);
    tl.to(g.position, { y: target.y, duration: 0.46, ease: 'power2.in' }, 0.48);

    // Physics-accurate 3-bounce landing (Bhageera lands heavy/exhausted)
    // touchdown at 0.94s, fully settled at 0.94 + 1.04 = 1.98s
    this._addLandingBounce(tl, g, target, 0.94, () => {
      if (avatar.trail) avatar.trail.stop();
    });

    // Bhageera exhausted dialogue after settle (1.98s)
    tl.call(() => {
      this.playDialogue(3, '/audio/home/bhageera_journey.wav');
    }, null, 2.05);

    // Energetic perk-up 360-spin hop chained directly into timeline
    const hopT0 = 4.20;
    // Wind-up squat
    tl.to(g.scale, { x: 1.18, y: 0.76, z: 1.18, duration: 0.16, ease: 'power2.in' }, hopT0);
    // Leap + spin
    tl.to(g.position, { y: target.y + 0.90, duration: 0.36, ease: 'power2.out' }, hopT0 + 0.16);
    tl.to(g.rotation, { y: g.rotation.y + Math.PI * 2, duration: 0.65, ease: 'power1.inOut' }, hopT0 + 0.16);
    tl.to(g.scale,    { x: 0.92, y: 1.16, z: 0.92, duration: 0.22, ease: 'sine.out' }, hopT0 + 0.16);

    // Perk-up landing
    tl.to(g.position, { y: target.y, duration: 0.30, ease: 'power2.in' }, hopT0 + 0.52);
    tl.to(g.scale,    { x: 1.12, y: 0.86, z: 1.12, duration: 0.10, ease: 'power2.out' }, hopT0 + 0.52);

    // Final scale settle — mark settled only after perk-up is fully done
    tl.to(g.scale, {
      x: 1.0, y: 1.0, z: 1.0,
      duration: 0.26,
      ease: 'sine.out',
      onComplete: () => {
        avatar.isSettled = true;
        avatar.settleTimestamp = this.time;
        avatar.targetGaze = { x: 0, y: 0, z: 0 };
        avatar.nextGlanceTime = this.time + 3.5;
        this.cursorTrackingEnabled = true;
      },
    }, hopT0 + 0.82);

    tl.call(() => {
      this.playDialogue(3, '/audio/home/bhageera_howareyou.wav', () => {
        if (onComplete) onComplete();
      });
    }, null, hopT0 + 1.10);

    return tl;
  }

  /**
   * Reset all avatars to initial state behind words
   */
  resetAll() {
    if (this.activeAudio) {
      this.activeAudio.pause();
      this.activeAudio.currentTime = 0;
      this.activeAudio = null;
    }
    this.speakingAvatarIndex = -1;
    this.cursorTrackingEnabled = false;

    if (this.activeTimeline) {
      this.activeTimeline.kill();
      this.activeTimeline = null;
    }

    const defaultOrigin = this.getWordOrigin('center', -0.5);

    this.avatars.forEach((avatar) => {
      gsap.killTweensOf(avatar.group.position);
      gsap.killTweensOf(avatar.group.rotation);
      gsap.killTweensOf(avatar.group.scale);

      avatar.group.visible = false;
      avatar.group.position.set(defaultOrigin.x, defaultOrigin.y, defaultOrigin.z);
      avatar.group.scale.set(0.001, 0.001, 0.001);
      avatar.group.rotation.set(0, 0, 0);
      avatar.isSettled = false;
      avatar.settleTimestamp = 0;
      avatar.currentGaze = { x: 0, y: 0, z: 0 };
      avatar.targetGaze = { x: 0, y: 0, z: 0 };
      avatar.nextGlanceTime = 0;
      avatar.mouthOpen = 0;
      this._drawFace(avatar.faceCtx, 0, avatar.buddyData);
      avatar.faceTexture.needsUpdate = true;
    });
  }

  /**
   * Helper to pre-settle avatars up to a specific step index for testing/debugging.
   * stepIndex 0: all hidden (ready for step 1)
   * stepIndex 1: Mowgli settled on rug (ready for step 2)
   * stepIndex 2: Mowgli, Belle settled on rug
   * stepIndex 3: Mowgli, Belle, Moana settled on rug
   * stepIndex 4: All 4 companions settled on rug
   */
  settleAvatarsUpTo(stepIndex) {
    this.resetAll();
    const count = Math.min(stepIndex, this.avatars.length);
    for (let i = 0; i < count; i++) {
      const av = this.avatars[i];
      av.group.visible = true;
      av.mesh.traverse((c) => { if (c.isMesh) c.visible = true; });
      if (av.faceMesh) av.faceMesh.visible = true;
      if (av.shadowMesh) av.shadowMesh.visible = true;
      av.group.position.set(av.landingTarget.x, av.landingTarget.y, av.landingTarget.z);
      av.group.scale.set(1, 1, 1);
      av.group.rotation.set(0, 0, 0);
      av.isSettled = true;
      av.settleTimestamp = this.time;
    }
  }

  /**
   * Single avatar playful bounce when clicked
   */
  pokeAvatar(index) {
    const avatar = this.avatars[index];
    if (!avatar || !avatar.isSettled) return;

    const g = avatar.group;
    const targetY = avatar.landingTarget.y;

    // Jump up with squash & stretch
    gsap.killTweensOf(g.position);
    gsap.killTweensOf(g.scale);

    const tl = gsap.timeline();
    tl.to(g.position, {
      y: targetY + 0.85,
      duration: 0.28,
      ease: 'power2.out',
    });
    tl.to(g.scale, {
      x: 0.88,
      y: 1.22,
      z: 0.88,
      duration: 0.22,
      ease: 'power1.out',
    }, 0);

    tl.to(g.position, {
      y: targetY,
      duration: 0.45,
      ease: 'bounce.out',
    }, 0.28);
    tl.to(g.scale, {
      x: 1.0,
      y: 1.0,
      z: 1.0,
      duration: 0.35,
      ease: 'elastic.out(1.2, 0.4)',
    }, 0.50);

    // Play avatar voice sound with animated talking lips
    const audioSrc = avatar.buddyData.audio || avatar.buddyData.fallbackAudio;
    this.playDialogue(index, audioSrc);
  }

  /**
   * Animate chosen avatar hopping through the open 3D door
   */
  hopThroughDoor(index = 3, doorPos = { x: 5.2, y: -2.15, z: 0.5 }, onFinish = null) {
    const avatar = this.avatars[index];
    if (!avatar) return;

    const g = avatar.group;
    avatar.isSettled = false;

    // Hop from rug towards the arched doorway
    const tl = gsap.timeline({
      onComplete: () => {
        if (onFinish) onFinish();
      },
    });

    // Hop 1: Towards right floor
    tl.to(g.position, {
      x: (avatar.landingTarget.x + doorPos.x) * 0.5,
      z: (avatar.landingTarget.z + doorPos.z) * 0.5,
      duration: 0.55,
      ease: 'power1.inOut',
    });
    tl.to(g.position, {
      y: this.rugY + 1.2,
      duration: 0.28,
      yoyo: true,
      repeat: 1,
      ease: 'power1.out',
    }, 0);

    // Hop 2: Deep through the doorway into the lit study room
    tl.to(g.position, {
      x: doorPos.x + 0.2,
      y: doorPos.y + 0.7,
      z: doorPos.z - 2.5,
      duration: 0.65,
      ease: 'power1.in',
    }, 0.55);

    // Fade and shrink as it enters the room
    tl.to(g.scale, {
      x: 0.3,
      y: 0.3,
      z: 0.3,
      duration: 0.65,
      ease: 'power1.in',
    }, 0.55);

    return tl;
  }

  /**
   * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   * Full Choreographed Multi-Avatar "Step Inside" Departure Sequence:
   * 1. Bhageera slides across the floor to spot 'B' (right of door).
   * 2. As Bhageera approaches, the arched door swings open.
   * 3. Bhageera waits facing companions.
   * 4. Moana, Belle, Mowgli hop across floor to door waiting zone and wait 3s.
   * 5. The 3 companions cascade into the doorway portal and disappear into light.
   * 6. Bhageera turns to face the user/camera, speaks "Let's step into the knowledge world!"
   *    with mouth animation, then turns and enters through the door.
   * 7. Calls onComplete to initiate warm transition screen to /avatar-chamber.
   * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   */
  triggerFullDoorDeparture(audioSrc = null, onComplete = null) {
    if (typeof audioSrc === 'function') {
      onComplete = audioSrc;
      audioSrc = null;
    }
    if (this.activeTimeline) {
      this.activeTimeline.kill();
      this.activeTimeline = null;
    }
    this._stopSfx();

    const bhageera = this.avatars[3];
    const moana = this.avatars[2];
    const belle = this.avatars[1];
    const mowgli = this.avatars[0];
    if (!bhageera || !moana || !belle || !mowgli) {
      if (onComplete) onComplete();
      return;
    }

    // Ensure all 4 companions are visible and active
    this.avatars.forEach((av) => {
      av.group.visible = true;
      av.mesh.traverse((c) => { if (c.isMesh) c.visible = true; });
      if (av.faceMesh) av.faceMesh.visible = true;
      if (av.shadowMesh) av.shadowMesh.visible = true;
      av.isSettled = false;
      if (av.trail) av.trail.stop();
    });

    const tl = gsap.timeline();
    this.activeTimeline = tl;

    // Spot B: to the right of the door opening frame at floor level
    const spotB = { x: 5.42, y: this.rugY + 0.62, z: 0.82 };
    // Doorway opening center is at x = 4.10, portal void depth at z = -3.80
    const doorHole = { x: 4.10, y: this.rugY + 1.15, z: -3.80 };
    const doorThreshold = { x: 4.10, y: this.rugY, z: 0.40 };

    // ── PHASE 1: Bhageera turns and slides smoothly across floor to Spot B & speaks page tour dialogue ──
    tl.to(bhageera.group.rotation, {
      y: Math.PI * 0.45,
      duration: 0.20,
      ease: 'power2.out',
    }, 0);

    // Slide across the floor to Spot B
    tl.to(bhageera.group.position, {
      x: spotB.x,
      y: spotB.y,
      z: spotB.z,
      duration: 1.18,
      ease: 'power2.inOut',
    }, 0.08);

    // DURING THAT SLIDE: Bhageera speaks the tour dialogue for that page!
    const tourAudio = audioSrc || '/audio/home/tour/tour_courses.wav';
    tl.call(() => {
      this.playDialogue(3, tourAudio);
    }, null, 0.06);

    // Door swings open wide as Bhageera approaches the threshold
    tl.call(() => {
      this.sceneInstance?.openDoor(1.1);
    }, null, 0.58);

    // Bhageera arrives at Spot B and turns to face left (towards companions), waiting for them
    tl.to(bhageera.group.rotation, {
      y: -Math.PI * 0.48,
      duration: 0.30,
      ease: 'power2.out',
    }, 1.22);

    // Helper to animate an avatar hopping along waypoints into the cosmic portal
    const animateHoppingExit = (avatar, waypoints, startTime) => {
      const g = avatar.group;

      tl.to(g.rotation, {
        y: Math.PI * 0.44,
        duration: 0.20,
        ease: 'power2.out',
      }, startTime);

      let currentTime = startTime + 0.10;
      const hopDuration = 0.46;

      for (let i = 0; i < waypoints.length; i++) {
        const pt = waypoints[i];
        tl.to(g.position, {
          x: pt.x,
          z: pt.z,
          duration: hopDuration,
          ease: 'power1.inOut',
        }, currentTime);

        tl.to(g.position, {
          y: this.rugY + 0.58,
          duration: hopDuration * 0.5,
          ease: 'power2.out',
        }, currentTime);
        tl.to(g.position, {
          y: this.rugY,
          duration: hopDuration * 0.5,
          ease: 'power2.in',
        }, currentTime + hopDuration * 0.5);

        currentTime += hopDuration;
      }

      const portalEntryDuration = 1.18;
      tl.call(() => { g.renderOrder = 20; }, null, currentTime);

      // Step through threshold into cosmic portal
      tl.to(g.position, {
        x: doorHole.x,
        y: this.rugY + 0.70,
        z: -0.20,
        duration: 0.40,
        ease: 'power1.out',
      }, currentTime);

      tl.to(g.scale, {
        x: 0.65,
        y: 0.65,
        z: 0.65,
        duration: 0.40,
        ease: 'power1.in',
      }, currentTime);

      // Float deep into the cosmic space shader portal
      tl.to(g.position, {
        y: doorHole.y,
        z: doorHole.z,
        duration: 0.78,
        ease: 'power2.in',
      }, currentTime + 0.40);

      tl.to(g.scale, {
        x: 0.012,
        y: 0.012,
        z: 0.012,
        duration: 0.78,
        ease: 'power2.in',
      }, currentTime + 0.40);

      tl.to(g.rotation, {
        y: g.rotation.y + Math.PI * 0.85,
        z: 0.32,
        duration: 0.78,
        ease: 'sine.inOut',
        onComplete: () => {
          g.visible = false;
        },
      }, currentTime + 0.40);

      return currentTime + portalEntryDuration;
    };

    // ── PHASE 2: Moana, Belle, Mowgli hop sequentially into space while Bhageera waits at Spot B ──
    const moanaWaypoints = [
      { x: 1.85, z: 1.65 },
      { x: 3.15, z: 1.05 },
      doorThreshold,
    ];
    const moanaExitTime = animateHoppingExit(moana, moanaWaypoints, 1.25);

    const belleWaypoints = [
      { x: 0.55, z: 1.85 },
      { x: 1.95, z: 1.45 },
      { x: 3.15, z: 1.05 },
      doorThreshold,
    ];
    const belleExitTime = animateHoppingExit(belle, belleWaypoints, 2.05);

    const mowgliWaypoints = [
      { x: -0.90, z: 1.90 },
      { x: 0.55, z: 1.65 },
      { x: 1.95, z: 1.30 },
      { x: 3.15, z: 0.95 },
      doorThreshold,
    ];
    const mowgliExitTime = animateHoppingExit(mowgli, mowgliWaypoints, 2.85);

    // ── PHASE 3: Bhageera follows into the space portal ──
    const bhageeraExitStart = mowgliExitTime + 0.15;

    // Turn towards doorway
    tl.to(bhageera.group.rotation, {
      y: -Math.PI * 0.44,
      duration: 0.28,
      ease: 'power2.out',
    }, bhageeraExitStart);

    // Step into the portal threshold
    const bEntryTime = bhageeraExitStart + 0.30;
    tl.call(() => { bhageera.group.renderOrder = 20; }, null, bEntryTime);

    tl.to(bhageera.group.position, {
      x: doorHole.x,
      y: this.rugY + 0.70,
      z: -0.20,
      duration: 0.40,
      ease: 'power1.out',
    }, bEntryTime);

    tl.to(bhageera.group.scale, {
      x: 0.65,
      y: 0.65,
      z: 0.65,
      duration: 0.40,
      ease: 'power1.in',
    }, bEntryTime);

    // Float deep into the cosmic space nebula and shrink into space
    tl.to(bhageera.group.position, {
      y: doorHole.y,
      z: doorHole.z,
      duration: 0.80,
      ease: 'power2.in',
    }, bEntryTime + 0.40);

    tl.to(bhageera.group.scale, {
      x: 0.012,
      y: 0.012,
      z: 0.012,
      duration: 0.80,
      ease: 'power2.in',
    }, bEntryTime + 0.40);

    tl.to(bhageera.group.rotation, {
      y: bhageera.group.rotation.y - Math.PI * 0.75,
      z: -0.28,
      duration: 0.80,
      ease: 'sine.inOut',
      onComplete: () => {
        bhageera.group.visible = false;
        if (onComplete) onComplete();
      },
    }, bEntryTime + 0.40);

    return tl;
  }

  setMouseGaze(ndcX, ndcY) {
    this.mouseGaze.x = THREE.MathUtils.clamp(ndcX, -1, 1);
    this.mouseGaze.y = THREE.MathUtils.clamp(ndcY, -1, 1);
  }

  /**
   * Called when the user's cursor enters an avatar's 3D bounding volume.
   * All OTHER settled avatars will smoothly look at this avatar socially.
   */
  setHoveredAvatar(idx) {
    this.hoveredAvatarIndex = idx;
  }

  /** Called when the cursor leaves all avatar volumes. */
  clearHoveredAvatar() {
    this.hoveredAvatarIndex = -1;
  }

  update(delta) {
    this.time += delta;

    this.avatars.forEach((avatar, idx) => {
      // Update motion trail during flight and settle
      if (avatar.trail) {
        avatar.trail.update(avatar.group.position);
      }

      // Dynamic mouth talking animation when avatar is currently speaking
      const isSpeaking = this.speakingAvatarIndex === idx;
      // Organic speech cadence combining multiple harmonic frequencies for realistic syllables
      const speechCadence =
        Math.sin(this.time * 17.5) * 0.42 +
        Math.sin(this.time * 28.0) * 0.28 +
        Math.sin(this.time * 10.2) * 0.30;
      const targetMouth = isSpeaking ? Math.max(0, Math.min(1.0, speechCadence * 0.85 + 0.45)) : 0.0;
      if (avatar.mouthOpen === undefined) avatar.mouthOpen = 0.0;
      const prevMouth = avatar.mouthOpen;
      avatar.mouthOpen += (targetMouth - avatar.mouthOpen) * (isSpeaking ? 0.38 : 0.24);

      if (isSpeaking || Math.abs(avatar.mouthOpen - prevMouth) > 0.015 || (avatar.mouthOpen < 0.02 && prevMouth >= 0.02)) {
        this._drawFace(avatar.faceCtx, avatar.mouthOpen, avatar.buddyData);
        avatar.faceTexture.needsUpdate = true;
      }

      if (!avatar.isSettled) return;

      const g = avatar.group;

      if (avatar.currentBaseRotY === undefined || !Number.isFinite(avatar.currentBaseRotY)) {
        avatar.currentBaseRotY = avatar.baseRotY || 0;
      }
      if (!avatar.currentGaze) {
        avatar.currentGaze = { x: 0, y: 0, z: 0 };
      }
      if (!avatar.targetGaze) {
        avatar.targetGaze = { x: 0, y: 0, z: 0 };
      }
      if (!Number.isFinite(avatar.currentGaze.x)) avatar.currentGaze.x = 0;
      if (!Number.isFinite(avatar.currentGaze.y)) avatar.currentGaze.y = 0;
      if (!Number.isFinite(avatar.currentGaze.z)) avatar.currentGaze.z = 0;
      if (!Number.isFinite(avatar.targetGaze.x)) avatar.targetGaze.x = 0;
      if (!Number.isFinite(avatar.targetGaze.y)) avatar.targetGaze.y = 0;
      if (!Number.isFinite(avatar.targetGaze.z)) avatar.targetGaze.z = 0;

      // ── 2. Speaking Body Movements (Expressive Nods, Tilts, Bobs, Squash & Stretch) ──
      const breathPhase = this.time * 2.2 + idx * 0.8;
      const idleBob = Math.sin(breathPhase) * 0.032;

      // Dynamic speech movement components:
      // a) Speech bob: enthusiastic bounce matching speech syllables
      const talkBob = Math.sin(this.time * 11.5) * 0.048 + Math.abs(Math.sin(this.time * 5.8)) * 0.035;

      // b) Expressive head/torso pitch nods emphasizing speech phonemes
      const talkNod = Math.sin(this.time * 11.5) * 0.052 + Math.sin(this.time * 5.8) * 0.028;

      // c) Cute side-to-side cartoon tilt (roll) while explaining
      const talkRoll = Math.sin(this.time * 7.2 + idx * 1.8) * 0.036;

      // d) Conversational yaw emphasis
      const talkYaw = Math.sin(this.time * 5.2 + idx) * 0.032;

      // e) Squash & stretch body resonance with speech opening
      const speechOpen = avatar.mouthOpen || 0;
      const talkStretch = 1.0 + speechOpen * 0.050 + Math.sin(this.time * 11.5) * 0.022;
      const talkSquash = 1.0 / Math.sqrt(talkStretch);

      // Smooth motion blending between idle breathing and talking body gestures
      if (avatar.speechMotion === undefined) {
        avatar.speechMotion = { bob: 0, nod: 0, roll: 0, yaw: 0, stretch: 1.0, squash: 1.0 };
      }
      const blendRate = isSpeaking ? 0.22 : 0.10;
      avatar.speechMotion.bob = THREE.MathUtils.lerp(avatar.speechMotion.bob, isSpeaking ? talkBob : idleBob, blendRate);
      avatar.speechMotion.nod = THREE.MathUtils.lerp(avatar.speechMotion.nod, isSpeaking ? talkNod : 0, blendRate);
      avatar.speechMotion.roll = THREE.MathUtils.lerp(avatar.speechMotion.roll, isSpeaking ? talkRoll : 0, blendRate);
      avatar.speechMotion.yaw = THREE.MathUtils.lerp(avatar.speechMotion.yaw, isSpeaking ? talkYaw : 0, blendRate);
      avatar.speechMotion.stretch = THREE.MathUtils.lerp(avatar.speechMotion.stretch, isSpeaking ? talkStretch : 1.0, blendRate);
      avatar.speechMotion.squash = THREE.MathUtils.lerp(avatar.speechMotion.squash, isSpeaking ? talkSquash : 1.0, blendRate);

      // Lock settled avatars strictly to rug position + speech bob
      g.position.x = avatar.landingTarget.x;
      g.position.z = avatar.landingTarget.z;
      const bob = Number.isFinite(avatar.speechMotion.bob) ? avatar.speechMotion.bob : 0;
      g.position.y = avatar.landingTarget.y + bob;

      // Apply body squash & stretch
      const baseScale = avatar.baseScale || 1.0;
      const squash = Number.isFinite(avatar.speechMotion.squash) ? avatar.speechMotion.squash : 1.0;
      const stretch = Number.isFinite(avatar.speechMotion.stretch) ? avatar.speechMotion.stretch : 1.0;
      g.scale.set(
        baseScale * squash,
        baseScale * stretch,
        baseScale * squash
      );

      // ── 3. Intelligent Social Gaze & Glancing Behavior ──
      const timeSinceSettled = this.time - (avatar.settleTimestamp || 0);

      // Determine if another avatar is speaking (and this one should look at them)
      const activeSpeaker = this.speakingAvatarIndex;
      const isLookingAtSpeaker = !isSpeaking && activeSpeaker >= 0 && activeSpeaker !== idx;

      // Determine if user is hovering a different avatar (social curiosity)
      const hoveredIdx = this.hoveredAvatarIndex;
      const isLookingAtHovered = !isSpeaking && hoveredIdx >= 0 && hoveredIdx !== idx && activeSpeaker < 0;

      if (isSpeaking) {
        // While speaking: lock gaze straight at the center of the screen / user
        avatar.targetGaze.x = 0;
        avatar.targetGaze.y = 0;
        avatar.targetGaze.z = 0;
      } else if (isLookingAtSpeaker) {
        // ── Social Look: Turn head toward the speaking companion ──
        const speaker = this.avatars[activeSpeaker];
        if (speaker && speaker.isSettled) {
          // Compute relative horizontal direction from this avatar to the speaker
          const dx = speaker.group.position.x - g.position.x;
          const dz = speaker.group.position.z - g.position.z;
          // Angle difference relative to the avatar's forward axis (which already faces ~center)
          const angleToSpeaker = Math.atan2(dx, dz);
          const relativeAngle = angleToSpeaker - avatar.currentBaseRotY;
          // Clamp social gaze to avoid extreme neck craning
          avatar.targetGaze.x = THREE.MathUtils.clamp(relativeAngle * 0.55, -0.42, 0.42);
          avatar.targetGaze.y = -0.04; // slight downward tilt (speaker is at same level)
          avatar.targetGaze.z = (Math.random() - 0.5) * 0.02;
        }
      } else if (isLookingAtHovered) {
        // ── Social Look: Turn head toward the hovered companion ──
        const hoveredAv = this.avatars[hoveredIdx];
        if (hoveredAv && hoveredAv.isSettled) {
          const dx = hoveredAv.group.position.x - g.position.x;
          const dz = hoveredAv.group.position.z - g.position.z;
          const angleToHovered = Math.atan2(dx, dz);
          const relativeAngle = angleToHovered - avatar.currentBaseRotY;
          avatar.targetGaze.x = THREE.MathUtils.clamp(relativeAngle * 0.55, -0.42, 0.42);
          avatar.targetGaze.y = 0.02;
          avatar.targetGaze.z = 0;
        }
      } else if (timeSinceSettled < 3.2) {
        // Initial look at user right after landing
        avatar.targetGaze.x = 0;
        avatar.targetGaze.y = 0;
        avatar.targetGaze.z = 0;
      } else {
        // After settling for a few seconds, randomly glance around the room (companions, arch, sparkles, user)
        if (this.time > avatar.nextGlanceTime) {
          avatar.nextGlanceTime = this.time + 2.5 + Math.random() * 3.2;
          const roll = Math.random();

          if (roll < 0.35) {
            // Look directly back at the user
            avatar.targetGaze.x = 0;
            avatar.targetGaze.y = 0;
            avatar.targetGaze.z = 0;
          } else if (roll < 0.62) {
            // Glance towards neighboring companions — target a specific neighbor's world position
            const neighborIdx = (idx + 1 + Math.floor(Math.random() * 3)) % this.avatars.length;
            const neighbor = this.avatars[neighborIdx];
            if (neighbor && neighbor.isSettled) {
              const dx = neighbor.group.position.x - g.position.x;
              const dz = neighbor.group.position.z - g.position.z;
              const angle = Math.atan2(dx, dz);
              const rel = angle - avatar.currentBaseRotY;
              avatar.targetGaze.x = THREE.MathUtils.clamp(rel * 0.45, -0.38, 0.38);
              avatar.targetGaze.y = (Math.random() - 0.4) * 0.08;
            } else {
              const dir = idx >= 2 ? -1 : 1;
              avatar.targetGaze.x = dir * (0.24 + Math.random() * 0.16);
              avatar.targetGaze.y = (Math.random() - 0.4) * 0.08;
            }
            avatar.targetGaze.z = (Math.random() - 0.5) * 0.04;
          } else if (roll < 0.86) {
            // Glance towards the glowing golden door arch on the right
            avatar.targetGaze.x = 0.30 + Math.random() * 0.22;
            avatar.targetGaze.y = 0.04 + Math.random() * 0.12;
            avatar.targetGaze.z = (Math.random() - 0.5) * 0.04;
          } else {
            // Cute head tilt glance up towards words / sparkles
            avatar.targetGaze.x = (Math.random() - 0.5) * 0.20;
            avatar.targetGaze.y = 0.14 + Math.random() * 0.14;
            avatar.targetGaze.z = Math.random() > 0.5 ? 0.06 : -0.06;
          }
        }
      }

      // No cursor drift while speaking or social-looking: keep focus locked
      const isSociallyFocused = isSpeaking || isLookingAtSpeaker || isLookingAtHovered;
      const cursorX = isSociallyFocused ? 0.0 : (this.mouseGaze.x * 0.20);
      const cursorY = isSociallyFocused ? 0.0 : (-this.mouseGaze.y * 0.12);

      // Social gaze uses fast lerp rate; random glancing uses slow dreamy rate
      const gazeRate = isSpeaking ? 0.28 : (isLookingAtSpeaker || isLookingAtHovered) ? 0.14 : 0.06;
      const targetGazeX = Number.isFinite(avatar.targetGaze.x) ? avatar.targetGaze.x : 0;
      const targetGazeY = Number.isFinite(avatar.targetGaze.y) ? avatar.targetGaze.y : 0;
      avatar.currentGaze.x = THREE.MathUtils.lerp(avatar.currentGaze.x, isSpeaking ? 0.0 : (targetGazeX + cursorX), gazeRate);
      avatar.currentGaze.y = THREE.MathUtils.lerp(avatar.currentGaze.y, isSpeaking ? 0.0 : (targetGazeY + cursorY), gazeRate);
      avatar.currentGaze.z = THREE.MathUtils.lerp(avatar.currentGaze.z, 0.0, 0.20);

      // Body also slightly turns toward speaker (half amplitude of gaze)
      const toCenterX = -g.position.x * 1.65;
      const toCenterZ = 12.8 - g.position.z;
      const angleToCenterScreen = Math.atan2(toCenterX, toCenterZ);
      let desiredBaseRotY = isSpeaking ? angleToCenterScreen : (avatar.baseRotY || 0);
      if (isLookingAtSpeaker) {
        const speaker = this.avatars[activeSpeaker];
        if (speaker && speaker.isSettled) {
          const dx = speaker.group.position.x - g.position.x;
          const dz = speaker.group.position.z - g.position.z;
          const speakerAngle = Math.atan2(dx, dz);
          // Blend partway toward speaker (body moves less than head)
          desiredBaseRotY = THREE.MathUtils.lerp(avatar.baseRotY || 0, speakerAngle, 0.30);
        }
      } else if (isLookingAtHovered) {
        const hoveredAv = this.avatars[hoveredIdx];
        if (hoveredAv && hoveredAv.isSettled) {
          const dx = hoveredAv.group.position.x - g.position.x;
          const dz = hoveredAv.group.position.z - g.position.z;
          const hovAngle = Math.atan2(dx, dz);
          desiredBaseRotY = THREE.MathUtils.lerp(avatar.baseRotY || 0, hovAngle, 0.22);
        }
      }

      const bodyTurnRate = isSpeaking ? 0.28 : (isLookingAtSpeaker || isLookingAtHovered) ? 0.12 : 0.08;
      if (Number.isFinite(desiredBaseRotY)) {
        avatar.currentBaseRotY = THREE.MathUtils.lerp(avatar.currentBaseRotY, desiredBaseRotY, bodyTurnRate);
      }

      // Apply total rotation: base pointing to center screen + gaze + speech gesture
      const rotY = avatar.currentBaseRotY + avatar.currentGaze.x + (avatar.speechMotion?.yaw || 0);
      const rotX = avatar.currentGaze.y + (avatar.speechMotion?.nod || 0);
      const rotZ = avatar.currentGaze.z + (avatar.speechMotion?.roll || 0);
      if (Number.isFinite(rotY)) g.rotation.y = rotY;
      if (Number.isFinite(rotX)) g.rotation.x = rotX;
      if (Number.isFinite(rotZ)) g.rotation.z = rotZ;
    });
  }

  resetAvatars() {
    this._stopSfx();
    if (this.activeAudio) {
      try { this.activeAudio.pause(); this.activeAudio.currentTime = 0; } catch (e) {}
      this.activeAudio = null;
    }
    this.speakingAvatarIndex = -1;
    if (this.activeTimeline) {
      this.activeTimeline.kill();
      this.activeTimeline = null;
    }

    const defaultOrigin = this.getWordOrigin('center', -0.55);
    this.avatars.forEach((avatar) => {
      if (avatar.trail) avatar.trail.stop();
      avatar.isSettled = false;
      avatar.group.visible = false;
      avatar.group.renderOrder = 0;
      avatar.group.position.set(defaultOrigin.x, defaultOrigin.y, defaultOrigin.z);
      avatar.group.scale.set(0.001, 0.001, 0.001);
      avatar.group.rotation.set(0, avatar.baseRotY || 0, 0);
    });

    if (this.sceneInstance?.resetPocket) {
      this.sceneInstance.resetPocket();
    }
  }

  resetAll() {
    this.resetAvatars();
  }

  dispose() {
    this.isDisposed = true;
    this._stopSfx();
    if (this.activeAudio) {
      try { this.activeAudio.pause(); } catch (e) {}
      this.activeAudio = null;
    }
    this.avatars.forEach((avatar) => {
      if (avatar.trail) avatar.trail.dispose();
      if (avatar.group && avatar.group.parent) {
        avatar.group.parent.remove(avatar.group);
      }
      if (avatar.faceTexture) avatar.faceTexture.dispose();
      if (avatar.shadowMesh && avatar.shadowMesh.material.map) {
        avatar.shadowMesh.material.map.dispose();
      }
    });
    this.avatars = [];
  }
}
