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

    this._initScene();
    this._initBackgroundStars();
    this._initLighting();
    this._initChambers();
    this._initAvatars();

    this._bindEvents();
    this._startLoop();

    this.updatePositions();
  }

  _initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x090614);

    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;

    // Perspective Camera framed for spacious horizontal view
    this.camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    this.camera.position.set(0, 0.65, 13.8);
    this.camera.lookAt(0, 0.65, 0);

    // WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: false,
      antialias: true,
      powerPreference: 'high-performance',
    });

    const pixelRatio = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 2 : 2, 2.0);
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height, false);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    if ('outputColorSpace' in this.renderer) {
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    }
  }

  _initBackgroundStars() {
    // Ambient cosmic dust and sparkle particles in background
    const count = 180;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const starColors = [
      new THREE.Color('#34D399'),
      new THREE.Color('#38BDF8'),
      new THREE.Color('#D85590'),
      new THREE.Color('#F9E79F'),
      new THREE.Color('#FFFFFF'),
    ];

    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 32;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 18;
      positions[i * 3 + 2] = -4 - Math.random() * 12;

      const col = starColors[Math.floor(Math.random() * starColors.length)];
      colors[i * 3 + 0] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.10,
      vertexColors: true,
      transparent: true,
      opacity: 0.55,
    });

    this.stars = new THREE.Points(geometry, material);
    this.scene.add(this.stars);
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
    this.avatars = new AvatarManager(this.scene, this.chambers);
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

  /**
   * Smoothly animates focused companion forward (1.0) and previous companion back (0.0)
   */
  goTo(targetIndex, duration = 0.65) {
    if (this.isDisposed) return;

    const normalized = (targetIndex % this.numChambers + this.numChambers) % this.numChambers;
    if (normalized === this.currentIndex && this.focusWeights[normalized] === 1.0) return;

    this.currentIndex = normalized;

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
        if (this.onIndexChange) {
          this.onIndexChange(this.currentIndex);
        }
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
      const width = this.canvas.clientWidth || window.innerWidth;
      const height = this.canvas.clientHeight || window.innerHeight;

      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();

      this.renderer.setSize(width, height, false);
      const pr = Math.min(window.devicePixelRatio || 2, 2.0);
      this.renderer.setPixelRatio(pr);
    };

    window.addEventListener('mousemove', this._onMouseMove, { passive: true });
    window.addEventListener('click', this._onClick);
    window.addEventListener('resize', this._onResize);
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

      // Rotate subtle starfield
      if (this.stars) {
        this.stars.rotation.y = this.time * 0.015;
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

    window.removeEventListener('mousemove', this._onMouseMove);
    window.removeEventListener('click', this._onClick);
    window.removeEventListener('resize', this._onResize);

    if (this.stars) {
      if (this.stars.geometry) this.stars.geometry.dispose();
      if (this.stars.material) this.stars.material.dispose();
    }
    if (this.chambers) this.chambers.forEach((c) => c.dispose());
    if (this.avatars) this.avatars.dispose();

    if (this.renderer) {
      this.renderer.dispose();
    }
  }
}
