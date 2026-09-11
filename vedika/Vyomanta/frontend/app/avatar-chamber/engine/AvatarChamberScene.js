import * as THREE from 'three';
import gsap from 'gsap';
import { createAvatarChamberStations, CHAMBERS_DATA, getCarouselSlot } from './AvatarChamberGeometry';
import { ShaderPedestal } from './ShaderPedestal';
import { AvatarChamberManager } from './AvatarChamberManager';
import { createFoggyLightBeam } from './AvatarOrbitElements';
import { AvatarButterflies } from './AvatarButterflies';

export class AvatarChamberScene {
  constructor(canvas, onIndexChange = null, onReady = null) {
    this.canvas = canvas;
    this.onIndexChange = onIndexChange;
    this.onReady = onReady;
    this.isDisposed = false;
    this.time = 0;
    this.lastFrameTime = performance.now();

    this.mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };

    this.numChambers = 4;
    this.currentIndex = 0;
    this.lastNavDir = 1; // 1 = forward/next, -1 = backward/prev
    this.lastScrollTime = 0;
    this.touchStartX = 0;
    this.touchStartY = 0;

    this._initScene();
    this._initLighting();
    this._initCentralPedestal();
    this._initButterflies();
    this._initChambers();
    this._initAvatars();

    // Reusable objects to avoid per-frame / per-click allocations
    this._raycaster = new THREE.Raycaster();
    this._rayVec2 = new THREE.Vector2();
    this._lookAtTarget = new THREE.Vector3(0, 0.15, 0);
    this._cameraLookAtInit = new THREE.Vector3(0, -0.35, 0);
    this._lastPixelRatio = this._getCanvasSize().pixelRatio;
    this._resizeTimer = null;

    this._bindEvents();
    this._startLoop();

    if (typeof window !== 'undefined') {
      window.__VEDIKA_CHAMBER_SCENE__ = this;
    }
  }

  _getCanvasSize() {
    const parent = this.canvas ? this.canvas.parentElement : null;
    const width = parent?.clientWidth || this.canvas?.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 1920);
    const height = parent?.clientHeight || this.canvas?.clientHeight || (typeof window !== 'undefined' ? window.innerHeight : 1080);
    const pixelRatio = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 1.5);
    return { width: Math.max(width, 100), height: Math.max(height, 100), pixelRatio };
  }

  _initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = null;

    const { width, height, pixelRatio } = this._getCanvasSize();

    this.camera = new THREE.PerspectiveCamera(30, width / height, 0.1, 100);
    this.camera.position.set(0, 1.10, 25.0);
    this.camera.lookAt(this._cameraLookAtInit || new THREE.Vector3(0, -0.35, 0));

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
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
    this.scene.add(ambientLight);

    // Dynamic key light
    const globalKeyLight = new THREE.DirectionalLight(0xffffff, 1.3);
    globalKeyLight.position.set(2, 8, 8);
    this.scene.add(globalKeyLight);

    // Direct center spotlight on the middle highlighted avatar
    const centerSpot = new THREE.SpotLight(0xffffff, 3.2, 35, Math.PI / 4, 0.45, 1.0);
    centerSpot.position.set(0, 9, 7);
    centerSpot.target.position.set(0, -0.30, 2.4);
    this.scene.add(centerSpot);
    this.scene.add(centerSpot.target);

    const moodLight = new THREE.PointLight(0x818cf8, 0.65, 25);
    moodLight.position.set(0, 4, -4);
    this.scene.add(moodLight);
  }

  _initCentralPedestal() {
    // 100% Fixed central sacred geometry spirograph shader pattern (anchored in middle, lowered down)
    this.centralPedestal = new ShaderPedestal('#FFD700', 7.6);
    this.centralPedestal.mesh.position.set(0.0, -2.15, 2.4);
    this.centralPedestal.setProgress(1.0);
    this.centralPedestal.setOpacity(1.0);
    this.scene.add(this.centralPedestal.mesh);

    // Foggy Light Beam Base (Dim foggy golden beam with soft faded edges, middle only)
    this.foggyBeam = createFoggyLightBeam('#FFD700');
    this.scene.add(this.foggyBeam.mesh);
  }

  _initButterflies() {
    // 5 Shadertoy-based procedural 3D butterflies circling 360° continuously on top of middle avatar
    this.butterflies = new AvatarButterflies(this.scene);
    this.butterflies.onLandingShake = () => {
      if (this.avatars && this.avatars.playCuteShakeOff) {
        this.avatars.playCuteShakeOff();
      }
    };
  }

  setButterflySize(size) {
    if (this.butterflies) {
      this.butterflies.setSize(size);
    }
  }

  setButterflyRadius(radius) {
    if (this.butterflies) {
      this.butterflies.setRadius(radius);
    }
  }

  setButterflyHeight(height) {
    if (this.butterflies) {
      this.butterflies.setHeight(height);
    }
  }

  _initChambers() {
    this.chambers = createAvatarChamberStations();
    this.chambers.forEach((chamber) => {
      this.scene.add(chamber.group);
    });
  }

  _initAvatars() {
    this.avatars = new AvatarChamberManager(this.scene, this.camera, this.chambers, () => {
      if (this.onReady) this.onReady();
    });

    if (this.avatars.setCentralPedestal) {
      this.avatars.setCentralPedestal(this.centralPedestal);
    }

    if (this.butterflies && this.butterflies.setAvatarManager) {
      this.butterflies.setAvatarManager(this.avatars);
    }

    // Middle avatar gets arrival opening, background avatars stay in shadow
    this.avatars.playShaderPatternArrival(() => {
      this.applyCarouselLayout(0, 0, false);
    });
  }

  /**
   * Apply carousel layout based on active targetIndex:
   * - Middle avatar is stationed at center and pops directly up out of the middle pattern
   * - Exactly 3 avatars visible on screen: Middle (offset 0), Right (offset 1), Left (offset -1)
   * - The 4th avatar (offset 2) recedes to the background and is completely hidden
   */
  applyCarouselLayout(targetIndex, duration = 0.85, animate = true) {
    for (let i = 0; i < this.numChambers; i++) {
      const diff = (i - targetIndex + this.numChambers) % this.numChambers;
      let offset = 0;
      if (diff === 0) offset = 0;                          // Middle front (Active)
      else if (diff === 1) offset = 1;                     // Right
      else if (diff === this.numChambers - 1) offset = -1; // Left
      else offset = 2;                                     // Background (strictly invisible)

      const slot = getCarouselSlot(offset, this.lastNavDir);

      if (offset === 0) {
        // Station middle chamber group at center so the avatar emerges straight out of the pattern
        if (this.chambers && this.chambers[i]) {
          this.chambers[i].setSlot(slot, 0.0, false);
        }
        if (this.avatars) {
          this.avatars.setAvatarShadow(i, 0.0, 0.25, true);
        }
      } else {
        if (this.chambers && this.chambers[i]) {
          this.chambers[i].setSlot(slot, duration, animate);
        }
        if (this.avatars) {
          this.avatars.setAvatarShadow(i, slot.shadow, duration, animate);
        }
      }
    }

    // Foggy light beam stays golden for all avatars as requested
    if (this.foggyBeam) {
      this.foggyBeam.setColor('#FFD700', duration);
    }
  }

  goTo(newIndex, duration = 0.85) {
    if (newIndex < 0 || newIndex >= this.numChambers) return;
    const prevIndex = this.currentIndex;
    if (newIndex === prevIndex) return;

    const forwardDiff = (newIndex - prevIndex + this.numChambers) % this.numChambers;
    this.lastNavDir = forwardDiff <= this.numChambers / 2 ? 1 : -1;
    this.currentIndex = newIndex;

    // Zero carousel audio - completely removed as requested

    if (this.onIndexChange) {
      this.onIndexChange(this.currentIndex);
    }

    if (this.centralPedestal && this.centralPedestal.uniforms.uFlash) {
      this.centralPedestal.uniforms.uFlash.value = 1.0;
      gsap.to(this.centralPedestal.uniforms.uFlash, { value: 0.0, duration: 0.75, ease: 'power2.out' });
    }

    if (this.foggyBeam) {
      this.foggyBeam.setOpacity(1.0, 0.4);
    }

    this.applyCarouselLayout(this.currentIndex, duration, true);

    if (this.avatars) {
      // The companion entering the middle comes vigorously popping out of the fixed middle pattern
      this.avatars.playCenterEmergence(this.currentIndex);
    }
  }

  next() {
    const nextIdx = (this.currentIndex + 1) % this.numChambers;
    this.goTo(nextIdx);
  }

  prev() {
    const prevIdx = (this.currentIndex - 1 + this.numChambers) % this.numChambers;
    this.goTo(prevIdx);
  }

  setCrownPlacement(config) {
    if (this.avatars) {
      this.avatars.setCrownPlacement(config);
    }
  }

  setAllCrownConfigs(configs) {
    if (this.avatars) {
      this.avatars.setAllCrownConfigs(configs);
    }
  }

  applyLiveAdjust(config) {
    if (!config) return;
    if (config.elements && this.avatars?.applyOrbitAdjust) {
      this.avatars.applyOrbitAdjust(config.elements);
    }
    if (config.beam && this.foggyBeam?.applyBeamAdjust) {
      this.foggyBeam.applyBeamAdjust(config.beam);
    }
  }

  _bindEvents() {
    this._onResize = this._onResize.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerDown = this._onPointerDown.bind(this);
    this._onWheel = this._onWheel.bind(this);
    this._onTouchStart = this._onTouchStart.bind(this);
    this._onTouchEnd = this._onTouchEnd.bind(this);

    window.addEventListener('resize', this._onResize);
    window.addEventListener('pointermove', this._onPointerMove, { passive: true });
    window.addEventListener('wheel', this._onWheel, { passive: false });
    window.addEventListener('touchstart', this._onTouchStart, { passive: true });
    window.addEventListener('touchend', this._onTouchEnd, { passive: true });

    if (this.canvas) {
      this.canvas.addEventListener('pointerdown', this._onPointerDown);
    }
  }

  _onWheel(e) {
    if (e.cancelable) {
      e.preventDefault();
    }
    const now = performance.now();
    if (now - this.lastScrollTime < 450) return; // Debounce rapid wheel ticks

    if (Math.abs(e.deltaY) < 15 && Math.abs(e.deltaX) < 15) return;

    this.lastScrollTime = now;
    if (e.deltaY > 0 || e.deltaX > 0) {
      this.next();
    } else {
      this.prev();
    }
  }

  _onTouchStart(e) {
    if (!e.touches || e.touches.length === 0) return;
    this.touchStartX = e.touches[0].clientX;
    this.touchStartY = e.touches[0].clientY;
  }

  _onTouchEnd(e) {
    if (!e.changedTouches || e.changedTouches.length === 0) return;
    const dx = e.changedTouches[0].clientX - this.touchStartX;
    const dy = e.changedTouches[0].clientY - this.touchStartY;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) {
        this.next();
      } else {
        this.prev();
      }
    }
  }

  _onPointerDown(e) {
    if (!this.canvas || !this.camera || !this.avatars) return;
    const rect = this.canvas.getBoundingClientRect();
    this._rayVec2.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this._rayVec2.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this._raycaster.setFromCamera(this._rayVec2, this.camera);

    for (let i = 0; i < this.chambers.length; i++) {
      const ch = this.chambers[i];
      if (!ch.group.visible) continue; // Skip hidden chambers
      const intersects = this._raycaster.intersectObjects(ch.group.children, true);
      if (intersects.length > 0) {
        if (i !== this.currentIndex) {
          this.goTo(i);
        } else {
          // Replay dialogue when tapping active middle companion
          if (this.avatars?.playAvatarDialogue) {
            this.avatars.playAvatarDialogue(i);
          }
        }
        break;
      }
    }
  }

  _onResize() {
    // Debounce resize to avoid excessive recalculations during drag-resize
    if (this._resizeTimer) clearTimeout(this._resizeTimer);
    this._resizeTimer = setTimeout(() => {
      if (!this.renderer || !this.camera) return;
      const { width, height, pixelRatio } = this._getCanvasSize();
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height, false);
      // Only update pixelRatio if it actually changed (avoids full framebuffer realloc)
      if (pixelRatio !== this._lastPixelRatio) {
        this.renderer.setPixelRatio(pixelRatio);
        this._lastPixelRatio = pixelRatio;
      }
    }, 100);
  }

  _onPointerMove(e) {
    const { innerWidth, innerHeight } = window;
    this.mouse.targetX = (e.clientX / innerWidth) * 2 - 1;
    this.mouse.targetY = -(e.clientY / innerHeight) * 2 + 1;

    if (this.avatars) {
      this.avatars.setMouseGaze(this.mouse.targetX, this.mouse.targetY);
    }
  }

  _startLoop() {
    const tick = () => {
      if (this.isDisposed) return;
      const now = performance.now();
      const dt = (now - this.lastFrameTime) / 1000;
      this.lastFrameTime = now;
      this.time += dt;

      this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.06;
      this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.06;

      if (this.camera) {
        this.camera.position.x = this.mouse.x * 0.45;
        this.camera.position.y = 1.65 + this.mouse.y * 0.25;
        this.camera.lookAt(this._lookAtTarget);
      }

      if (this.centralPedestal) {
        this.centralPedestal.update(this.time);
      }

      if (this.foggyBeam) {
        this.foggyBeam.update(this.time);
      }

      if (this.butterflies) {
        this.butterflies.update(this.time, dt);
        if (this.avatars) {
          const target = this.butterflies.getActiveTargetPosition();
          if (target) {
            this.avatars.setButterflyTarget(target.position, target.isLandingOrSeated);
          }
        }
      }

      this.chambers.forEach((chamber) => {
        chamber.update(this.time);
      });

      if (this.avatars) {
        this.avatars.update(this.time, dt);
      }

      this.renderer.render(this.scene, this.camera);
      this.rafId = requestAnimationFrame(tick);
    };

    this.rafId = requestAnimationFrame(tick);
  }

  dispose() {
    this.isDisposed = true;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    if (this._resizeTimer) clearTimeout(this._resizeTimer);

    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('pointermove', this._onPointerMove);
    window.removeEventListener('wheel', this._onWheel);
    window.removeEventListener('touchstart', this._onTouchStart);
    window.removeEventListener('touchend', this._onTouchEnd);
    if (this.canvas) {
      this.canvas.removeEventListener('pointerdown', this._onPointerDown);
    }

    if (this.butterflies) {
      this.butterflies.dispose();
    }
    if (this.foggyBeam) {
      this.foggyBeam.dispose();
    }
    if (this.centralPedestal) {
      this.centralPedestal.dispose();
    }
    if (this.chambers) {
      this.chambers.forEach((c) => c.dispose());
    }
    if (this.avatars) {
      this.avatars.dispose();
    }
    if (this.renderer) {
      this.renderer.dispose();
    }
  }
}
