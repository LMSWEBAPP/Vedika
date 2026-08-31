import * as THREE from 'three';
import gsap from 'gsap';
import { createChamberStations } from './ChamberGeometry';
import { AvatarManager } from './AvatarManager';

/**
 * VedikaChamberScene — 3D AI Companions Chamber Scene
 * Matches the reference design with 4 AI Companions on glowing circular pedestals:
 *  - Nova (Purple)
 *  - Ivy (Blue)
 *  - Zep (Green)
 *  - Sunny (Orange)
 */
export class VedikaChamberScene {
  constructor(canvas, onIndexChange = null) {
    this.canvas = canvas;
    this.onIndexChange = onIndexChange;
    this.isDisposed = false;
    this.time = 0;
    this.lastFrameTime = performance.now();

    this.mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };

    this.numChambers = 4;
    this.currentIndex = 0; // Default Ask Vedika focused
    this.focusWeights = { 0: 1.0, 1: 0.0, 2: 0.0, 3: 0.0 };

    // Carousel transition audio effect
    if (typeof window !== 'undefined' && typeof Audio !== 'undefined') {
      try {
        this.transitionAudio = new Audio('/WhatsApp Audio 2026-08-31 at 6.41.47 PM.mpeg');
        this.transitionAudio.preload = 'auto';
      } catch (e) {
        this.transitionAudio = null;
      }
    }

    this._initScene();
    this._initLighting();
    this._initChambers();
    this._initAvatars();

    this._bindEvents();
    this._startLoop();

    this.updatePositions();
  }

  _getCanvasSize() {
    const parent = this.canvas ? this.canvas.parentElement : null;
    const width = parent?.clientWidth || this.canvas?.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 1920);
    const height = parent?.clientHeight || this.canvas?.clientHeight || (typeof window !== 'undefined' ? window.innerHeight : 1080);
    const pixelRatio = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 2 : 2, 2.0);
    return { width: Math.max(width, 100), height: Math.max(height, 100), pixelRatio };
  }

  _initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = null; // Transparent background allowing LightRays to shine from behind

    const { width, height, pixelRatio } = this._getCanvasSize();

    // Perspective Camera tuned for flat, undistorted horizontal carousel framing
    this.camera = new THREE.PerspectiveCamera(24, width / height, 0.1, 100);
    this.camera.position.set(0, 0.45, 22.5);
    this.camera.lookAt(0, 0.45, 0);

    // WebGL Renderer with Alpha support for background light layers
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });

    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height, false);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    if ('outputColorSpace' in this.renderer) {
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    }
  }

  _initLighting() {
    // Soft balanced ambient base
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    this.scene.add(ambientLight);

    // Global Key Light (Soft and clean)
    const globalKeyLight = new THREE.DirectionalLight(0xffffff, 1.4);
    globalKeyLight.position.set(2, 7, 7);
    this.scene.add(globalKeyLight);

    // Subtle mood rim backlight
    const moodLight = new THREE.PointLight(0xa855f7, 0.8, 20);
    moodLight.position.set(0, 4, -4);
    this.scene.add(moodLight);
  }

  _initChambers() {
    this.chambers = createChamberStations();
    this.chambers.forEach((chamber) => {
      this.scene.add(chamber.group);
    });
  }

  _initAvatars() {
    this.avatars = new AvatarManager(this.scene, this.camera, this.chambers);
  }

  updatePositions() {
    for (let i = 0; i < this.numChambers; i++) {
      const w = this.focusWeights[i];
      if (this.chambers[i]) {
        this.chambers[i].setFocusState(w);
      }
      if (this.avatars) {
        this.avatars.setFocusWeight(i, w);
      }
    }
  }

  _playTransitionSound() {
    if (this.transitionAudio) {
      try {
        this.transitionAudio.currentTime = 0;
        this.transitionAudio.play().catch(() => {
          // Ignore autoplay restrictions prior to user interaction
        });
      } catch (e) {
        // Fallback for audio errors
      }
    }
  }

  /**
   * Smoothly animates focused companion forward (1.0) and previous companion back (0.0)
   */
  goTo(targetIndex, duration = 0.65) {
    if (this.isDisposed) return;

    const normalized = (targetIndex % this.numChambers + this.numChambers) % this.numChambers;
    if (normalized === this.currentIndex && this.focusWeights[normalized] === 1.0) return;

    this.currentIndex = normalized;
    this._playTransitionSound();

    const targets = {
      0: normalized === 0 ? 1.0 : 0.0,
      1: normalized === 1 ? 1.0 : 0.0,
      2: normalized === 2 ? 1.0 : 0.0,
      3: normalized === 3 ? 1.0 : 0.0,
    };

    gsap.killTweensOf(this.focusWeights);
    gsap.to(this.focusWeights, {
      ...targets,
      duration: duration,
      ease: 'power3.out',
      onUpdate: () => {
        this.updatePositions();
      },
      onComplete: () => {
        this.updatePositions();
      },
    });

    if (this.onIndexChange) {
      this.onIndexChange(this.currentIndex);
    }
  }

  next() {
    this.goTo(this.currentIndex + 1);
  }

  prev() {
    this.goTo(this.currentIndex - 1);
  }

  setCrownConfig(avatarIndex, config) {
    if (this.avatars) {
      this.avatars.setCrownConfig(avatarIndex, config);
    }
  }

  setAllCrownConfigs(configs) {
    if (this.avatars) {
      this.avatars.setAllCrownConfigs(configs);
    }
  }

  _bindEvents() {
    this._onMouseMove = (e) => {
      const normX = (e.clientX / window.innerWidth - 0.5) * 2;
      const normY = (e.clientY / window.innerHeight - 0.5) * 2;
      this.mouse.targetX = normX;
      this.mouse.targetY = normY;

      if (this.avatars) {
        this.avatars.setMouseGaze(normX, normY);
      }
    };

    this._onClick = (e) => {
      if (!this.canvas || this.isDisposed) return;
      const rect = this.canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);

      if (this.avatars) {
        const hitIndex = this.avatars.getHitAvatarIndex(raycaster);
        if (hitIndex !== -1) {
          this.goTo(hitIndex);
        }
      }
    };

    this._onResize = () => {
      if (!this.canvas || this.isDisposed) return;
      const { width, height, pixelRatio } = this._getCanvasSize();

      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();

      this.renderer.setPixelRatio(pixelRatio);
      this.renderer.setSize(width, height, false);
    };

    window.addEventListener('mousemove', this._onMouseMove, { passive: true });
    window.addEventListener('click', this._onClick);
    window.addEventListener('resize', this._onResize);

    // Watch parent container size changes using ResizeObserver
    if (typeof ResizeObserver !== 'undefined' && this.canvas?.parentElement) {
      this.resizeObserver = new ResizeObserver(() => {
        this._onResize();
      });
      this.resizeObserver.observe(this.canvas.parentElement);
    }

    // Force crisp resize checks across initial mount frames
    setTimeout(() => this._onResize(), 60);
    setTimeout(() => this._onResize(), 250);
    setTimeout(() => this._onResize(), 600);
  }

  _startLoop() {
    const render = (now) => {
      if (this.isDisposed) return;

      const dt = Math.min((now - this.lastFrameTime) / 1000, 0.035);
      this.lastFrameTime = now;
      this.time += dt;

      // Smooth mouse gaze interpolation
      this.mouse.x += (this.mouse.targetX - this.mouse.x) * (dt * 3.0);
      this.mouse.y += (this.mouse.targetY - this.mouse.y) * (dt * 3.0);

      // Update chambers (pedestal animation)
      if (this.chambers) {
        this.chambers.forEach((c) => c.update && c.update(this.time));
      }

      // Update avatars
      if (this.avatars) this.avatars.update(this.time, dt);

      // Render WebGL Frame
      this.renderer.render(this.scene, this.camera);

      this.animId = requestAnimationFrame(render);
    };

    this.animId = requestAnimationFrame(render);
  }

  dispose() {
    this.isDisposed = true;
    if (this.animId) cancelAnimationFrame(this.animId);
    gsap.killTweensOf(this.focusWeights);

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    window.removeEventListener('mousemove', this._onMouseMove);
    window.removeEventListener('click', this._onClick);
    window.removeEventListener('resize', this._onResize);

    if (this.chambers) this.chambers.forEach((c) => c.dispose());
    if (this.avatars) this.avatars.dispose();

    if (this.transitionAudio) {
      try {
        this.transitionAudio.pause();
        this.transitionAudio.src = '';
      } catch (e) {}
      this.transitionAudio = null;
    }

    if (this.renderer) {
      this.renderer.dispose();
    }
  }
}
