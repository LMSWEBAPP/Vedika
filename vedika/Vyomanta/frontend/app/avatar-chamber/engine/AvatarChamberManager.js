import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import gsap from 'gsap';
import { playDeepCosmicWhoosh, playAvatarWhoosh, notifyPortalExitComplete } from '@/lib/portalTransition';
import { CHAMBERS_DATA } from './AvatarChamberGeometry';

export const UNIFIED_CROWN_CONFIG = {
  posX: -0.7,
  posY: 1.57,
  posZ: 0.21,
  size: 0.71,
  rotZ: 0.24,
  rotX: 0.09,
  rotY: 0.0,
};

export function extractCrownConfig(raw) {
  // Equal placement for every avatar with matching curvature slant and consistent hovering gap
  return { ...UNIFIED_CROWN_CONFIG };
}

export const CHAMBER_AVATAR_AUDIO = [
  { index: 0, name: 'mowgli', file: '/audio/chamber/mowgli_chosen.wav', text: 'Oh!! you chose me' },
  { index: 1, name: 'belle', file: '/audio/chamber/belle_chosen.wav', text: "That's a good choice buddy" },
  { index: 2, name: 'moana', file: '/audio/chamber/moana_chosen.wav', text: 'I always knew you would like to work with me' },
  { index: 3, name: 'bhageera', file: '/audio/chamber/bhageera_chosen.wav', text: "Yayyyy!! It's me .. let's start working together" },
];


function updateSpring(val, vel, target, stiffness, damping, dt) {
  const force = (target - val) * stiffness;
  const damp = -vel * damping;
  const nVel = vel + (force + damp) * dt;
  const nVal = val + nVel * dt;
  return [nVal, nVel];
}

function drawSmileLine(ctx, mx, my, curve, happyW, mouthOpen = 0) {
  ctx.save();
  ctx.translate(mx, my);

  const w = 26 + happyW * 14;
  const curveY = curve * 14;

  ctx.strokeStyle = '#122B1E';
  ctx.lineWidth = 3.6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (mouthOpen > 0.06) {
    const openH = mouthOpen * 16;

    // Cheerful smiling mouth cavity: corners lift upward to keep a clear beaming smile while speaking!
    ctx.fillStyle = '#122B1E';
    ctx.beginPath();
    ctx.moveTo(-w / 2, -curveY * 0.32);
    // Upper lip with a gentle upward smile curve
    ctx.quadraticCurveTo(0, -curveY * 0.32 - openH * 0.20, w / 2, -curveY * 0.32);
    // Lower open jaw with deep rounded smile curve
    ctx.quadraticCurveTo(0, curveY * 0.40 + openH, -w / 2, -curveY * 0.32);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Cute pink tongue at base of smiling mouth
    ctx.fillStyle = '#FF758F';
    ctx.beginPath();
    ctx.ellipse(0, (curveY * 0.40 + openH) * 0.58, w * 0.28, openH * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();

    // Prominent smiling dimple accents at mouth corners so it always visibly smiles while talking!
    ctx.fillStyle = '#122B1E';
    ctx.beginPath();
    ctx.arc(-w / 2 - 1.5, -curveY * 0.32 - 1.5, 2.0, 0, Math.PI * 2);
    ctx.arc(w / 2 + 1.5, -curveY * 0.32 - 1.5, 2.0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(-w / 2, -curveY * 0.3);
    ctx.quadraticCurveTo(0, curveY, w / 2, -curveY * 0.3);
    ctx.stroke();

    if (happyW > 0.25) {
      ctx.globalAlpha = happyW;
      ctx.fillStyle = '#122B1E';
      ctx.beginPath();
      ctx.arc(-w / 2, -curveY * 0.3 - 1, 2.0, 0, Math.PI * 2);
      ctx.arc(w / 2, -curveY * 0.3 - 1, 2.0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}



// Shared geometries (allocated once, reused by all avatars)
let _sharedCrownGeometry = null;
let _sharedFaceGeometry = null;

function getSharedCrownGeometry() {
  if (!_sharedCrownGeometry) {
    _sharedCrownGeometry = new THREE.PlaneGeometry(1.0, 1.0);
  }
  return _sharedCrownGeometry;
}

function getSharedFaceGeometry() {
  if (!_sharedFaceGeometry) {
    _sharedFaceGeometry = new THREE.PlaneGeometry(2.38, 2.38);
  }
  return _sharedFaceGeometry;
}

let cachedGltf = null;
let cachedAvatarTextures = null;
let cachedCrownTextures = null;

export class AvatarChamberManager {
  constructor(scene, camera, chambers, onReady = null) {
    this.scene = scene;
    this.camera = camera;
    this.chambers = chambers;
    this.onReady = onReady;
    this.isReady = false;
    this.pendingArrival = null;
    this.avatars = [];
    this.mouseGaze = { x: 0, y: 0 };
    this.lastUserInteractionTime = performance.now();
    this.isDisposed = false;
    this.introLookUntil = null;
    this.currentAudio = null;
    this.speakingAvatarIndex = null;
    this._pendingSpeechIndex = null;
    this._unlockAudioBound = this._unlockAudioOnInteraction.bind(this);
    if (typeof window !== 'undefined') {
      window.addEventListener('pointerdown', this._unlockAudioBound, { passive: true });
      window.addEventListener('keydown', this._unlockAudioBound, { passive: true });
    }

    // 100% Pure White Eyes avatar textures (sclera has 0 color reflections or tint)
    if (!cachedAvatarTextures) {
      const textureLoader = new THREE.TextureLoader();
      cachedAvatarTextures = [
        textureLoader.load('/avatar_purple.webp?v=6'),
        textureLoader.load('/avatar_red.webp?v=6'),
        textureLoader.load('/avatar_gold.webp?v=6'),
        textureLoader.load('/avatar_blue.webp?v=6'),
      ];
      cachedAvatarTextures.forEach((tex) => {
        tex.flipY = false;
        tex.colorSpace = THREE.SRGBColorSpace;
      });
    }
    this.textures = cachedAvatarTextures;

    // Golden Shimmery Crown Texture (pure 24k gold, zero red)
    const textureLoader = new THREE.TextureLoader();
    this.goldenCrownTexture = textureLoader.load('/crown_golden_shimmer.png?v=18');
    this.goldenCrownTexture.flipY = true;
    this.goldenCrownTexture.colorSpace = THREE.SRGBColorSpace;

    // Crown configs are strictly equal across all companions with a delicate hovering gap
    this.crownConfigs = [0, 1, 2, 3].map(() => extractCrownConfig());

    this.loader = new GLTFLoader();
    this._loadMasterModel();
  }

  _loadMasterModel() {
    if (cachedGltf) {
      this.masterScene = cachedGltf.scene;
      this.animations = cachedGltf.animations;
      this._instantiateAvatars();
      return;
    }

    this.loader.load(
      '/Physics-avatar-opt.glb',
      (gltf) => {
        if (this.isDisposed) return;
        cachedGltf = gltf;
        this.masterScene = gltf.scene;
        this.animations = gltf.animations;
        this._instantiateAvatars();
      },
      undefined,
      (error) => {
        console.warn('Avatar GLB load failed:', error);
      }
    );
  }

  _instantiateAvatars() {
    this.chambers.forEach((chamber, idx) => {
      const data = CHAMBERS_DATA[idx];
      const initialWeight = idx === 0 ? 1.0 : 0.0;
      const cloneRoot = this.masterScene.clone(true);

      const eyeBones = [];
      const bodyMaterials = [];

      cloneRoot.traverse((child) => {
        const name = (child.name || '').toLowerCase();
        if (name.includes('eye') || name.includes('head') || name.includes('look')) {
          eyeBones.push(child);
        }
      });

      const box = new THREE.Box3().setFromObject(cloneRoot);
      const center = box.getCenter(new THREE.Vector3());
      const sizeVec = box.getSize(new THREE.Vector3());

      cloneRoot.position.x -= center.x;
      cloneRoot.position.y -= center.y;
      cloneRoot.position.z -= center.z;

      const maxDim = Math.max(sizeVec.x, sizeVec.y, sizeVec.z);
      const baseScale = 2.75; // Increased avatar size
      if (maxDim > 0) {
        cloneRoot.scale.setScalar(baseScale / maxDim);
      }

      cloneRoot.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material = child.material.clone();

          // Apply color-matched body texture with pure white sclera
          if (this.textures[idx]) {
            child.material.map = this.textures[idx];
          }
          child.material.color.set('#FFFFFF');
          child.material.roughness = 0.65;
          child.material.metalness = 0.05;
          bodyMaterials.push(child.material);
          child.material.needsUpdate = true;
        }
      });

      const avatarGroup = new THREE.Group();

      // Dynamic 2D smile face plane (proportional to increased avatar scale)
      // Uses shared geometry to reduce GPU memory
      const faceCanvas = document.createElement('canvas');
      faceCanvas.width = 512;
      faceCanvas.height = 512;
      const faceCtx = faceCanvas.getContext('2d');

      // Pre-draw the static smile face once (no need to redraw every frame)
      drawSmileLine(faceCtx, 256, 320, 0.45, 0.35, 0.0);

      const faceTexture = new THREE.CanvasTexture(faceCanvas);
      faceTexture.minFilter = THREE.LinearFilter;
      faceTexture.magFilter = THREE.LinearFilter;

      const facePlane = new THREE.Mesh(
        getSharedFaceGeometry(),
        new THREE.MeshBasicMaterial({
          map: faceTexture,
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide,
        })
      );
      facePlane.position.set(0, -0.07, 1.21);

      const pivot = new THREE.Group();
      pivot.add(cloneRoot);
      pivot.add(facePlane);
      avatarGroup.add(pivot);

      // Floating Golden Shimmery Crown - strictly for the middle highlighted avatar
      const isInitialMiddle = idx === 0;
      const cfg = extractCrownConfig(this.crownConfigs[idx] || this.crownConfigs[0]);

      const crownMat = new THREE.ShaderMaterial({
        uniforms: {
          uTexture: { value: this.goldenCrownTexture },
          uTime: { value: 0 },
          uOpacity: { value: isInitialMiddle ? 1.0 : 0.0 },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform sampler2D uTexture;
          uniform float uTime;
          uniform float uOpacity;
          varying vec2 vUv;

          void main() {
            vec4 tex = texture2D(uTexture, vUv);
            if (tex.a < 0.05) discard;

            // Smooth diagonal sweep across the crown surface for an elegant golden shimmer
            float shimmerBand = sin((vUv.x + vUv.y * 0.75) * 3.2 - uTime * 2.4);
            float shimmerGlint = smoothstep(0.68, 0.98, shimmerBand);

            // Subtle warm metallic luster
            float luster = 0.96 + 0.06 * sin(uTime * 1.5);

            // Shimmer highlight color (luminous 24K gold glint)
            vec3 glintColor = vec3(1.0, 0.95, 0.65);

            // Apply shimmer effect directly to the crown's colour (zero external glow)
            vec3 finalRgb = tex.rgb * luster + glintColor * shimmerGlint * 0.42;

            gl_FragColor = vec4(finalRgb, tex.a * uOpacity);
          }
        `,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        side: THREE.DoubleSide,
      });

      const crownMesh = new THREE.Mesh(getSharedCrownGeometry(), crownMat);
      crownMesh.renderOrder = 9999;
      crownMesh.position.set(cfg.posX, cfg.posY, cfg.posZ);
      crownMesh.rotation.set(cfg.rotX || 0, cfg.rotY || 0, cfg.rotZ || 0);

      // Crown is ONLY visible for the middle avatar (index 0 initially)
      crownMesh.visible = isInitialMiddle;
      crownMesh.scale.setScalar(isInitialMiddle ? cfg.size : 0.001);

      // Crown attached directly to pivot: matches float & tilt perfectly, maintaining constant gap at all times!
      pivot.add(crownMesh);

      // Bring avatars forward in Z so they float prominently in front of the floor pattern
      avatarGroup.position.z = 0.70;

      chamber.group.add(avatarGroup);

      this.avatars.push({
        index: idx,
        data,
        avatarGroup,
        pivot,
        cloneRoot,
        crownMesh,
        facePlane,
        faceCanvas,
        faceCtx,
        eyeBones,
        bodyMaterials,
        currentShadow: idx === 0 ? 0.0 : 0.80,
        springY: 0,
        velY: 0,
        springRotY: 0,
        velRotY: 0,
        springRotX: 0,
        velRotX: 0,
        idlePhase: idx * 1.57,
        focusWeight: initialWeight,
        mouthOpen: 0,
      });
    });

    // Apply initial shadow state (center 0 is highlighted, remaining in shadow place)
    this.avatars.forEach((av, i) => {
      this.setAvatarShadow(i, i === 0 ? 0.0 : 0.80, 0, false);
    });

    this.isReady = true;
    if (this.onReady) {
      this.onReady();
    }
    if (this.pendingArrival) {
      const cb = typeof this.pendingArrival === 'function' ? this.pendingArrival : null;
      this.pendingArrival = null;
      this.playShaderPatternArrival(cb);
    }
  }

  setAvatarShadow(idx, shadowAmount, duration = 0.85, animate = true) {
    const av = this.avatars[idx];
    if (!av) return;

    const targetVal = THREE.MathUtils.clamp(shadowAmount, 0.0, 1.0);
    const targetBrightness = THREE.MathUtils.lerp(1.0, 0.18, targetVal);
    const targetFaceOpacity = THREE.MathUtils.lerp(1.0, 0.25, targetVal);
    const isMiddle = targetVal < 0.25;
    const cfg = this.currentCrownPlacement || extractCrownConfig(this.crownConfigs[idx] || this.crownConfigs[0]);

    if (!animate || duration <= 0) {
      av.currentShadow = targetVal;
      if (av.bodyMaterials) {
        av.bodyMaterials.forEach((mat) => {
          mat.color.setRGB(targetBrightness, targetBrightness * 1.02, targetBrightness * 1.12);
        });
      }
      if (av.facePlane?.material) av.facePlane.material.opacity = targetFaceOpacity;

      // Crown: STRICTLY for the middle avatar!
      if (av.crownMesh) {
        av.crownMesh.visible = isMiddle;
        av.crownMesh.position.set(cfg.posX, cfg.posY, cfg.posZ);
        av.crownMesh.rotation.set(cfg.rotX || 0, cfg.rotY || 0, cfg.rotZ || 0);
        av.crownMesh.scale.setScalar(isMiddle ? cfg.size : 0.001);
        if (av.crownMesh.material?.uniforms?.uOpacity) {
          av.crownMesh.material.uniforms.uOpacity.value = isMiddle ? 1.0 : 0.0;
        }
      }
      return;
    }

    const state = { val: av.currentShadow || 0.0 };
    gsap.to(state, {
      val: targetVal,
      duration,
      ease: 'power3.out',
      onUpdate: () => {
        av.currentShadow = state.val;
        const b = THREE.MathUtils.lerp(1.0, 0.18, state.val);
        if (av.bodyMaterials) {
          av.bodyMaterials.forEach((mat) => {
            mat.color.setRGB(b, b * 1.02, b * 1.12);
          });
        }
        if (av.facePlane?.material) {
          av.facePlane.material.opacity = THREE.MathUtils.lerp(1.0, 0.25, state.val);
        }
      },
    });

    // Crown: strictly for the middle avatar!
    if (av.crownMesh) {
      gsap.killTweensOf(av.crownMesh.scale);

      if (isMiddle) {
        av.crownMesh.visible = true;
        av.crownMesh.position.set(cfg.posX, cfg.posY, cfg.posZ);
        av.crownMesh.rotation.set(cfg.rotX || 0, cfg.rotY || 0, cfg.rotZ || 0);
        gsap.to(av.crownMesh.scale, {
          x: cfg.size,
          y: cfg.size,
          z: cfg.size,
          duration: 0.38,
          ease: 'back.out(2.0)',
        });
        if (av.crownMesh.material?.uniforms?.uOpacity) {
          gsap.to(av.crownMesh.material.uniforms.uOpacity, { value: 1.0, duration: 0.3 });
        }
      } else {
        gsap.to(av.crownMesh.scale, {
          x: 0.001,
          y: 0.001,
          z: 0.001,
          duration: 0.25,
          ease: 'power2.in',
          onComplete: () => {
            if (av.crownMesh) av.crownMesh.visible = false;
          },
        });
        if (av.crownMesh.material?.uniforms?.uOpacity) {
          gsap.to(av.crownMesh.material.uniforms.uOpacity, { value: 0.0, duration: 0.25 });
        }
      }
    }
  }

  setCentralPedestal(pedestal) {
    this.centralPedestal = pedestal;
  }

  _unlockAudioOnInteraction() {
    if (typeof window !== 'undefined' && this._unlockAudioBound) {
      window.removeEventListener('pointerdown', this._unlockAudioBound);
      window.removeEventListener('keydown', this._unlockAudioBound);
    }
    if (this._pendingSpeechIndex !== null && this._pendingSpeechIndex !== undefined) {
      const pIdx = this._pendingSpeechIndex;
      this._pendingSpeechIndex = null;
      const middleAv = this.getMiddleAvatar();
      if (middleAv && middleAv.index === pIdx) {
        this.playAvatarDialogue(pIdx);
      }
    }
  }

  stopAllDialogues() {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch (e) {}
      this.currentAudio = null;
    }
    this.speakingAvatarIndex = null;
    if (this.avatars) {
      this.avatars.forEach((av) => {
        if (av.isSpeaking) {
          av.isSpeaking = false;
          av.mouthOpen = 0;
          if (av.faceCtx && av.facePlane?.material?.map) {
            av.faceCtx.clearRect(0, 0, 512, 512);
            drawSmileLine(av.faceCtx, 256, 320, 0.45, 0.35, 0.0);
            av.facePlane.material.map.needsUpdate = true;
          }
        }
      });
    }
  }

  playAvatarDialogue(index) {
    if (!this.avatars || !this.avatars[index]) return;
    const av = this.avatars[index];

    this.stopAllDialogues();

    const audioData = CHAMBER_AVATAR_AUDIO[index];
    if (!audioData) return;

    try {
      const audio = new Audio(audioData.file);
      audio.volume = 0.95;
      this.currentAudio = audio;
      this.speakingAvatarIndex = index;

      av.isSpeaking = true;
      av.speechStartTime = performance.now();
      av.speechFinished = false; // Sentence not finished yet!

      audio.onended = () => {
        if (this.speakingAvatarIndex === index) {
          this._finishSpeaking(index);
        }
      };

      audio.onerror = (err) => {
        console.warn(`Audio playback error for avatar ${index}:`, err);
        if (this.speakingAvatarIndex === index) {
          this._finishSpeaking(index);
        }
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.log(`Autoplay deferred until user interaction for ${audioData.name}:`, err?.message);
          av.isSpeaking = false;
          av.mouthOpen = 0;
          av.speechFinished = false; // Remains unfinished until user plays it
          this._pendingSpeechIndex = index;
          if (av.faceCtx && av.facePlane?.material?.map) {
            av.faceCtx.clearRect(0, 0, 512, 512);
            drawSmileLine(av.faceCtx, 256, 320, 0.45, 0.35, 0.0);
            av.facePlane.material.map.needsUpdate = true;
          }
        });
      }
    } catch (err) {
      console.warn('Could not initialize audio:', err);
      this._finishSpeaking(index);
    }
  }

  _finishSpeaking(index) {
    const av = this.avatars[index];
    if (!av) return;
    av.isSpeaking = false;
    av.speechFinished = true; // Mark as completely finished!
    av.mouthOpen = 0;
    if (this.speakingAvatarIndex === index) {
      this.speakingAvatarIndex = null;
    }
    if (this.currentAudio) {
      this.currentAudio = null;
    }
    if (av.faceCtx && av.facePlane?.material?.map) {
      av.faceCtx.clearRect(0, 0, 512, 512);
      drawSmileLine(av.faceCtx, 256, 320, 0.45, 0.35, 0.0);
      av.facePlane.material.map.needsUpdate = true;
    }
  }

  /**
   * Returns true only when the middle companion has finished speaking its sentence.
   * Butterfly landing, sitting, and wobbling are strictly gated behind this.
   */
  isMiddleAvatarReadyForButterflies() {
    const middleAv = this.getMiddleAvatar();
    if (!middleAv) return false;
    return Boolean(middleAv.speechFinished && !middleAv.isSpeaking);
  }

  /**
   * Called every time an avatar enters the middle:
   * It emerges directly out of the fixed central pattern and floats on top of it,
   * receiving the golden shimmery crown and speaking its signature greeting!
   */
  playCenterEmergence(index) {
    const av = this.avatars[index];
    if (!av) return;

    // Mark sentence as not finished for incoming companion, and stop previous audio
    av.speechFinished = false;
    this.stopAllDialogues();

    this.introLookUntil = (this.lastTime || 0) + 3.0;

    gsap.killTweensOf(av.avatarGroup.position);
    gsap.killTweensOf(av.avatarGroup.scale);
    if (av.crownMesh) gsap.killTweensOf(av.crownMesh.scale);

    const REST_FLOAT_Y = 0.95;
    const cfg = this.currentCrownPlacement || extractCrownConfig(this.crownConfigs[index] || this.crownConfigs[0]);

    // Starts deeply recessed inside the central pattern aperture beneath the floor
    av.avatarGroup.position.set(0, -1.65, 0.70);
    av.avatarGroup.scale.set(0.12, 0.25, 0.12); // squashed small down inside the pattern aperture
    av.avatarGroup.visible = true;

    if (av.crownMesh) {
      av.crownMesh.visible = false;
      av.crownMesh.scale.setScalar(0.001);
      av.crownMesh.position.set(cfg.posX, cfg.posY, cfg.posZ);
      av.crownMesh.rotation.set(cfg.rotX || 0, cfg.rotY || 0, cfg.rotZ);
    }

    const tl = gsap.timeline();

    // 1. POPS dynamically UPWARD out of the central pattern!
    tl.to(av.avatarGroup.position, {
      y: 1.45,
      duration: 0.40,
      ease: 'power2.out',
    }, 0);
    tl.to(av.avatarGroup.scale, {
      x: 0.95,
      y: 1.20,
      z: 0.95,
      duration: 0.40,
      ease: 'power2.out',
    }, 0);

    // 2. Drops onto resting float line with soft squash
    tl.to(av.avatarGroup.position, {
      y: REST_FLOAT_Y,
      duration: 0.26,
      ease: 'power1.in',
    }, 0.40);
    tl.to(av.avatarGroup.scale, {
      x: 1.08,
      y: 0.94,
      z: 1.08,
      duration: 0.26,
      ease: 'power1.in',
    }, 0.40);

    // 3. Gentle buoyant bounce and settle
    tl.to(av.avatarGroup.position, {
      y: REST_FLOAT_Y + 0.10,
      duration: 0.16,
      ease: 'power2.out',
    }, 0.66);
    tl.to(av.avatarGroup.scale, {
      x: 0.98,
      y: 1.02,
      z: 0.98,
      duration: 0.16,
      ease: 'power2.out',
    }, 0.66);

    tl.to(av.avatarGroup.position, {
      y: REST_FLOAT_Y,
      duration: 0.14,
      ease: 'power1.inOut',
    }, 0.82);
    tl.to(av.avatarGroup.scale, {
      x: 1.0,
      y: 1.0,
      z: 1.0,
      duration: 0.14,
      ease: 'power1.inOut',
    }, 0.82);

    // 4. Golden Shimmery Crown crowns its head as it emerges
    if (av.crownMesh) {
      tl.call(() => {
        av.crownMesh.visible = true;
        av.crownMesh.position.set(cfg.posX, cfg.posY, cfg.posZ);
        av.crownMesh.rotation.set(cfg.rotX || 0, cfg.rotY || 0, cfg.rotZ || 0);
        if (av.crownMesh.material?.uniforms?.uOpacity) {
          av.crownMesh.material.uniforms.uOpacity.value = 1.0;
        }
      }, null, 0.30);

      tl.fromTo(av.crownMesh.scale,
        { x: 0.001, y: 0.001, z: 0.001 },
        { x: cfg.size, y: cfg.size, z: cfg.size, duration: 0.38, ease: 'back.out(2.2)' },
        0.32
      );
    }

    // 5. Play companion greeting dialogue with cute mouth talking animation right as it lands!
    tl.call(() => {
      this.playAvatarDialogue(index);
    }, null, 0.85);
  }

  /**
   * Ensures all 4 avatars are in their upright, fully-scaled float pose inside their chamber groups.
   * Visibility of the whole station is controlled by chamber.group.visible.
   * Crown is strictly on for the middle avatar only.
   */
  ensureAllAvatarsReady() {
    const REST_FLOAT_Y = 0.95;
    if (!this.avatars) return;
    this.avatars.forEach((av, idx) => {
      if (!av || !av.avatarGroup) return;
      av.avatarGroup.position.set(0, REST_FLOAT_Y, 0.70);
      av.avatarGroup.scale.set(1.0, 1.0, 1.0);
      av.avatarGroup.visible = true;
      const crownCfg = this.currentCrownPlacement || extractCrownConfig(this.crownConfigs[idx] || this.crownConfigs[0]);
      const isMiddle = (av.currentShadow || 0) < 0.25;
      if (av.crownMesh) {
        av.crownMesh.visible = isMiddle;
        av.crownMesh.position.set(crownCfg.posX, crownCfg.posY, crownCfg.posZ);
        av.crownMesh.rotation.set(crownCfg.rotX || 0, crownCfg.rotY || 0, crownCfg.rotZ || 0);
        av.crownMesh.scale.setScalar(isMiddle ? crownCfg.size : 0.001);
        if (av.crownMesh.material?.uniforms?.uOpacity) {
          av.crownMesh.material.uniforms.uOpacity.value = isMiddle ? 1.0 : 0.0;
        }
      }
    });
  }

  /**
   * Scene entrance sequence:
   * Middle avatar (highlighted) gets the pattern opening and bounces out.
   * Remaining avatars in the shadow place quietly emerge into their background positions without patterns.
   */
  playShaderPatternArrival(onAllLanded) {
    if (!this.isReady || !this.avatars || this.avatars.length === 0) {
      this.pendingArrival = onAllLanded || true;
      return;
    }

    this.avatars.forEach((a) => {
      a.speechFinished = false;
    });

    const REST_FLOAT_Y = 0.95;

    // Ensure all 4 avatars have valid scales and positions internally
    this.ensureAllAvatarsReady();

    // Initial state: Avatars 0, 1, 3 will animate up, while Avatar 2 is already placed and waiting in background
    [0, 1, 3].forEach((idx) => {
      const av = this.avatars[idx];
      if (av) {
        av.avatarGroup.position.y = -1.65;
        av.avatarGroup.scale.set(0.001, 0.001, 0.001);
        if (av.crownMesh) av.crownMesh.scale.setScalar(0.001);
      }
    });

    // Central fixed pedestal starts compact for arrival animation
    const ped0 = this.centralPedestal;
    if (ped0) {
      ped0.setOpacity(0.0);
      ped0.setProgress(0.0);
      ped0.mesh.scale.set(0.001, 0.001, 0.001);
    }

    const masterTL = gsap.timeline({
      onComplete: () => {
        this.ensureAllAvatarsReady();
        if (onAllLanded) onAllLanded();
        // Play middle avatar dialogue when initial arrival is complete
        this.playAvatarDialogue(0);
      },
    });

    // ── 1. Middle Highlighted Avatar (Index 0) Emerges from Central Pattern ──
    const av0 = this.avatars[0];
    const crownCfg0 = extractCrownConfig(this.crownConfigs[0] || this.crownConfigs[0]);

    if (ped0) {
      masterTL.call(() => {
        playDeepCosmicWhoosh(1.8, 1.0);
        if (ped0.uniforms.uFlash) ped0.uniforms.uFlash.value = 1.0;
      }, null, 0.2);

      masterTL.to(
        ped0.uniforms.uOpacity,
        { value: 1.0, duration: 0.35, ease: 'power1.out' },
        0.2
      );

      masterTL.to(
        ped0.mesh.scale,
        { x: 1.0, y: 1.0, z: 1.0, duration: 0.85, ease: 'power2.out' },
        0.2
      );

      masterTL.to(
        ped0.uniforms.uProgress,
        { value: 1.0, duration: 0.85, ease: 'power2.out' },
        0.2
      );

      if (ped0.uniforms.uFlash) {
        masterTL.to(
          ped0.uniforms.uFlash,
          { value: 0.0, duration: 0.85, ease: 'power2.out' },
          0.2
        );
      }
    }

    const emergeTime = 0.65;
    masterTL.call(() => {
      playAvatarWhoosh(1.0);
      av0.avatarGroup.visible = true;
    }, null, emergeTime);

    masterTL.fromTo(
      av0.avatarGroup.position,
      { y: -1.65 },
      { y: 1.35, duration: 0.46, ease: 'power2.out' },
      emergeTime
    );

    masterTL.fromTo(
      av0.avatarGroup.scale,
      { x: 0.15, y: 0.28, z: 0.15 },
      { x: 0.92, y: 1.15, z: 0.92, duration: 0.46, ease: 'power2.out' },
      emergeTime
    );

    const dropTime = emergeTime + 0.46;
    masterTL.to(
      av0.avatarGroup.position,
      { y: REST_FLOAT_Y, duration: 0.25, ease: 'power1.in' },
      dropTime
    );
    masterTL.to(
      av0.avatarGroup.scale,
      { x: 1.08, y: 0.94, z: 1.08, duration: 0.25, ease: 'power1.in' },
      dropTime
    );

    if (av0.crownMesh) {
      av0.crownMesh.visible = true;
      av0.crownMesh.position.set(crownCfg0.posX, crownCfg0.posY, crownCfg0.posZ);
      av0.crownMesh.rotation.set(crownCfg0.rotX || 0, crownCfg0.rotY || 0, crownCfg0.rotZ);
      masterTL.to(
        av0.crownMesh.scale,
        { x: crownCfg0.size, y: crownCfg0.size, z: crownCfg0.size, duration: 0.38, ease: 'back.out(2.0)' },
        dropTime
      );
    }

    // 1st bounce
    const b1Up = dropTime + 0.25;
    masterTL.to(av0.avatarGroup.position, { y: REST_FLOAT_Y + 0.15, duration: 0.18, ease: 'power2.out' }, b1Up);
    masterTL.to(av0.avatarGroup.scale, { x: 0.96, y: 1.04, z: 0.96, duration: 0.18, ease: 'power2.out' }, b1Up);

    const b1Down = b1Up + 0.18;
    masterTL.to(av0.avatarGroup.position, { y: REST_FLOAT_Y, duration: 0.16, ease: 'power1.in' }, b1Down);
    masterTL.to(av0.avatarGroup.scale, { x: 1.04, y: 0.97, z: 1.04, duration: 0.16, ease: 'power1.in' }, b1Down);

    // 2nd bounce
    const b2Up = b1Down + 0.16;
    masterTL.to(av0.avatarGroup.position, { y: REST_FLOAT_Y + 0.06, duration: 0.14, ease: 'power2.out' }, b2Up);
    masterTL.to(av0.avatarGroup.scale, { x: 0.98, y: 1.02, z: 0.98, duration: 0.14, ease: 'power2.out' }, b2Up);

    const b2Down = b2Up + 0.14;
    masterTL.to(av0.avatarGroup.position, { y: REST_FLOAT_Y, duration: 0.14, ease: 'power2.out' }, b2Down);
    masterTL.to(av0.avatarGroup.scale, { x: 1.0, y: 1.0, z: 1.0, duration: 0.14, ease: 'power2.out' }, b2Down);

    // ── 2. Side Avatars (1: Right, 3: Left) Emerge into Shadow Place (NO Crown, NO Pattern) ──
    const sideEmergeTime = 1.1;
    [1, 3].forEach((idx) => {
      const av = this.avatars[idx];
      if (!av) return;

      masterTL.call(() => {
        av.avatarGroup.visible = true;
        this.setAvatarShadow(idx, 0.78, 0, false);
      }, null, sideEmergeTime);

      masterTL.fromTo(
        av.avatarGroup.position,
        { y: -1.35, z: 0.70 },
        { y: REST_FLOAT_Y, z: 0.70, duration: 0.75, ease: 'power2.out' },
        sideEmergeTime
      );

      masterTL.fromTo(
        av.avatarGroup.scale,
        { x: 0.001, y: 0.001, z: 0.001 },
        { x: 1.0, y: 1.0, z: 1.0, duration: 0.75, ease: 'power2.out' },
        sideEmergeTime
      );

      // Side avatars have NO crown
      if (av.crownMesh) {
        av.crownMesh.visible = false;
        av.crownMesh.scale.setScalar(0.001);
      }
    });

    // Avatar 2 shadow state preset (hidden behind scenes in its dormant chamber station)
    this.setAvatarShadow(2, 1.0, 0, false);
  }

  playPortalExit(onComplete) {
    this.stopAllDialogues();
    if (!this.isReady || !this.avatars || this.avatars.length === 0) {
      if (onComplete) onComplete();
      notifyPortalExitComplete();
      return;
    }

    const tl = gsap.timeline({
      onComplete: () => {
        notifyPortalExitComplete();
        if (onComplete) onComplete();
      },
    });

    playDeepCosmicWhoosh(1.4, 1.0);

    this.avatars.forEach((av, i) => {
      const stepTime = i * 0.08;
      tl.to(
        av.avatarGroup.position,
        {
          y: -1.45,
          duration: 0.46,
          ease: 'power2.in',
        },
        stepTime
      );

      tl.to(
        av.avatarGroup.scale,
        {
          x: 0.1,
          y: 0.28,
          z: 0.1,
          duration: 0.46,
          ease: 'power2.in',
        },
        stepTime
      );

      tl.call(
        () => {
          av.avatarGroup.visible = false;
        },
        null,
        stepTime + 0.46
      );
    });
  }

  setMouseGaze(normX, normY) {
    this.mouseGaze.x = normX;
    this.mouseGaze.y = normY;
    this.lastUserInteractionTime = performance.now();
  }

  getMiddleAvatar() {
    if (!this.avatars || this.avatars.length === 0) return null;
    return this.avatars.find((av) => (av.currentShadow || 0) < 0.25) || this.avatars[0];
  }

  setButterflyTarget(targetPos, isLandingOrSeated = false) {
    this.butterflyTargetPos = targetPos;
    this.butterflyIsLanding = isLandingOrSeated;
  }

  /**
   * Plays an adorable, horizontal shake-off animation on the middle avatar:
   * Rapid horizontal head wobble (shaking left-and-right "no-no / brrr"),
   * horizontal body shimmy, squash & stretch, and cute surprised/happy smile.
   */
  playCuteShakeOff(onComplete) {
    const middleAv = this.avatars.find((av) => (av.currentShadow || 0) < 0.25);
    if (!middleAv) return;
    if (middleAv.isShaking) return;
    middleAv.isShaking = true;

    // 1. Cute surprised/happy expression during shake
    if (middleAv.faceCtx && middleAv.facePlane?.material?.map) {
      middleAv.faceCtx.clearRect(0, 0, 512, 512);
      drawSmileLine(middleAv.faceCtx, 256, 320, 0.65, 0.65, 0.35);
      middleAv.facePlane.material.map.needsUpdate = true;
    }

    middleAv.shakeRotY = 0;
    middleAv.shakePosX = 0;

    const tl = gsap.timeline({
      onComplete: () => {
        middleAv.isShaking = false;
        middleAv.shakeRotY = 0;
        middleAv.shakePosX = 0;
        middleAv.pivot.rotation.z = 0;
        middleAv.pivot.scale.set(1.0, 1.0, 1.0);
        middleAv.shakeOffsetY = 0;

        // Restore gentle pleasant smile if not currently speaking
        if (middleAv.faceCtx && middleAv.facePlane?.material?.map) {
          if (!middleAv.isSpeaking) {
            middleAv.faceCtx.clearRect(0, 0, 512, 512);
            drawSmileLine(middleAv.faceCtx, 256, 320, 0.45, 0.35, 0.0);
            middleAv.facePlane.material.map.needsUpdate = true;
          }
        }

        if (onComplete) onComplete();
      },
    });

    // 2. HORIZONTAL head shake: Rapidly shaking head left-and-right ("no-no / shaking it off!")
    const shakeObj = { rotY: 0, posX: 0 };
    tl.to(shakeObj, {
      rotY: 0.36,
      duration: 0.05,
      yoyo: true,
      repeat: 7, // 8 quick alternating horizontal turns
      ease: 'sine.inOut',
      onUpdate: () => {
        middleAv.shakeRotY = shakeObj.rotY;
      },
    }, 0);

    // 3. Subtle horizontal body twitch
    tl.to(shakeObj, {
      posX: 0.05,
      duration: 0.065,
      yoyo: true,
      repeat: 5,
      ease: 'sine.inOut',
      onUpdate: () => {
        middleAv.shakePosX = shakeObj.posX;
      },
    }, 0);

    // 4. Cute squishy squash & stretch
    tl.to(middleAv.pivot.scale, {
      x: 1.08,
      y: 0.92,
      z: 1.08,
      duration: 0.10,
      ease: 'power2.out',
    }, 0);
    tl.to(middleAv.pivot.scale, {
      x: 0.94,
      y: 1.06,
      z: 0.94,
      duration: 0.14,
      ease: 'power2.inOut',
    }, 0.10);
    tl.to(middleAv.pivot.scale, {
      x: 1.0,
      y: 1.0,
      z: 1.0,
      duration: 0.16,
      ease: 'elastic.out(1.2, 0.4)',
    }, 0.24);

    // 5. Little buoyant hop
    const hopObj = { y: 0 };
    tl.to(hopObj, {
      y: 0.06,
      duration: 0.12,
      ease: 'power2.out',
      onUpdate: () => {
        middleAv.shakeOffsetY = hopObj.y;
      },
    }, 0.04);
    tl.to(hopObj, {
      y: 0,
      duration: 0.20,
      ease: 'bounce.out',
      onUpdate: () => {
        middleAv.shakeOffsetY = hopObj.y;
      },
    }, 0.16);
  }

  setFocusWeight(index, weight) {
    const av = this.avatars[index];
    if (!av) return;
    av.focusWeight = weight;
  }

  setCrownPlacement(config) {
    if (!config) return;
    this.currentCrownPlacement = { ...config };
    this.avatars.forEach((av) => {
      const isMiddle = (av.currentShadow || 0) < 0.25;
      if (av.crownMesh) {
        av.crownMesh.position.set(config.posX, config.posY, config.posZ);
        av.crownMesh.rotation.set(config.rotX || 0, config.rotY || 0, config.rotZ || 0);
        av.crownMesh.visible = isMiddle;
        av.crownMesh.scale.setScalar(isMiddle ? config.size : 0.001);
        if (av.crownMesh.material?.uniforms?.uOpacity) {
          av.crownMesh.material.uniforms.uOpacity.value = isMiddle ? 1.0 : 0.0;
        }
      }
    });
  }

  setAllCrownConfigs(configs) {
    if (!Array.isArray(configs)) return;
    this.crownConfigs = configs.map((c) => extractCrownConfig(c));
    this.avatars.forEach((av, idx) => {
      const cfg = this.crownConfigs[idx] || this.crownConfigs[0];
      const isMiddle = (av.currentShadow || 0) < 0.25;
      if (cfg && av.crownMesh) {
        av.crownMesh.position.set(cfg.posX, cfg.posY, cfg.posZ);
        av.crownMesh.rotation.set(cfg.rotX || 0, cfg.rotY || 0, cfg.rotZ || 0);
        av.crownMesh.visible = isMiddle;
        av.crownMesh.scale.setScalar(isMiddle ? cfg.size : 0.001);
        if (av.crownMesh.material?.uniforms?.uOpacity) {
          av.crownMesh.material.uniforms.uOpacity.value = isMiddle ? 1.0 : 0.0;
        }
      }
    });
  }

  update(time, dt) {
    if (!this.isReady) return;

    this.lastTime = time;
    if (this.introLookUntil === null) {
      this.introLookUntil = time + 3.0;
    }

    const smoothDt = Math.min(dt, 0.05);

    // Default mouse gaze targets
    const defaultTargetRotY = this.mouseGaze.x * 0.22;
    const defaultTargetRotX = -this.mouseGaze.y * 0.15;

    for (let i = 0; i < this.avatars.length; i++) {
      const av = this.avatars[i];

      // Skip updates for completely hidden avatars (the 4th background one)
      const chamber = this.chambers[i];
      if (chamber && !chamber.group.visible) continue;

      // Middle avatar floats visibly higher with a deeper buoyant rhythm
      const isMiddle = (av.currentShadow || 0) < 0.25;
      const floatAmp = isMiddle ? 0.12 : 0.04;
      const floatSpeed = isMiddle ? 1.8 : 1.6;
      const idleY = Math.sin(time * floatSpeed + av.idlePhase) * floatAmp + (isMiddle ? Math.cos(time * 0.9) * 0.03 : 0);

      // Apply horizontal shimmy, vertical hop, and cute talking gesture bounce
      const talkHop = (av.isSpeaking && !av.isShaking) ? Math.sin((performance.now() - (av.speechStartTime || 0)) * 0.015) * 0.018 : 0;
      av.pivot.position.x = isMiddle ? (av.shakePosX || 0) : 0;
      av.pivot.position.y = idleY + (av.shakeOffsetY || 0) + talkHop;

      // Compute gaze targets:
      // Until sentence is finished: avatar focuses strictly on the USER!
      // No looking at butterflies, no butterflies sitting, no wobbling/shaking while speaking!
      let targetRotY = defaultTargetRotY;
      let targetRotX = defaultTargetRotX;

      const canLookAtButterfly = isMiddle && Boolean(av.speechFinished) && !av.isSpeaking;

      if (canLookAtButterfly && this.butterflyTargetPos && this.butterflyIsLanding) {
        // Continuous low-pass filter on gaze target for silky-smooth motion
        if (!this.smoothTargetGaze) {
          this.smoothTargetGaze = this.butterflyTargetPos.clone();
        } else {
          const lerpSpeed = 0.14;
          this.smoothTargetGaze.lerp(this.butterflyTargetPos, lerpSpeed);
        }

        // Focuses head directly towards whichever side of the crown circumference or forehead the butterfly sits on
        const neckWorldPos = new THREE.Vector3();
        av.pivot.getWorldPosition(neckWorldPos);
        neckWorldPos.y += 0.35;
        neckWorldPos.z += 0.30;

        const gx = this.smoothTargetGaze.x - neckWorldPos.x;
        const gy = this.smoothTargetGaze.y - neckWorldPos.y;
        const gz = this.smoothTargetGaze.z - neckWorldPos.z;

        // Yaw turns head accurately towards that side around the crown
        let landRotY = Math.atan2(gx, 1.15);
        targetRotY = THREE.MathUtils.clamp(landRotY, -0.68, 0.40);

        // Pitch tilts head upwards, deeper when target is further back in Z
        const effDist = Math.max(0.70 + gz * 0.40, 0.40);
        let landRotX = -Math.atan2(gy * 0.42, effDist);
        targetRotX = THREE.MathUtils.clamp(landRotX, -0.44, 0.12);
      }

      // Soft head tilt tracking with organic spring physics (softer stiffness 24 for fluid smoothness)
      [av.springRotY, av.velRotY] = updateSpring(av.springRotY, av.velRotY, targetRotY, isMiddle ? 24 : 40, 6.0, smoothDt);
      [av.springRotX, av.velRotX] = updateSpring(av.springRotX, av.velRotX, targetRotX, isMiddle ? 24 : 40, 6.0, smoothDt);

      // Horizontal wobble adds directly to rotation.y!
      av.pivot.rotation.y = av.springRotY + (av.shakeRotY || 0);
      av.pivot.rotation.x = av.springRotX;
      av.pivot.rotation.z = 0; // Pure horizontal shake

      // Real-time smooth golden shimmer sheen on the middle avatar's crown colour (no blinking, pure metallic sheen)
      if (av.crownMesh && av.crownMesh.visible && av.crownMesh.material?.uniforms?.uTime) {
        av.crownMesh.material.uniforms.uTime.value = time;
      }

      // Cute animated talking mouth during speech
      if (av.isSpeaking && !av.isShaking) {
        const speakElapsed = (performance.now() - (av.speechStartTime || performance.now())) / 1000;
        const s1 = Math.sin(speakElapsed * 22.0);
        const s2 = Math.sin(speakElapsed * 13.5 + 1.1);
        const s3 = Math.cos(speakElapsed * 7.2);
        let rawFlap = s1 * 0.34 + s2 * 0.30 + s3 * 0.18 + 0.36;

        if (rawFlap < 0.08) rawFlap = 0.0;
        const targetOpen = Math.min(0.72, Math.max(0.0, rawFlap));

        const mouthLerp = Math.min(1.0, smoothDt * 28.0);
        av.mouthOpen = (av.mouthOpen || 0) + (targetOpen - (av.mouthOpen || 0)) * mouthLerp;

        if (av.faceCtx && av.facePlane?.material?.map) {
          av.faceCtx.clearRect(0, 0, 512, 512);
          const smileCurve = 0.45 + av.mouthOpen * 0.15;
          const smileW = 0.35 + av.mouthOpen * 0.18;
          drawSmileLine(av.faceCtx, 256, 320, smileCurve, smileW, av.mouthOpen);
          av.facePlane.material.map.needsUpdate = true;
        }
      }
    }
  }

  dispose() {
    this.isDisposed = true;
    this.stopAllDialogues();
    if (typeof window !== 'undefined' && this._unlockAudioBound) {
      window.removeEventListener('pointerdown', this._unlockAudioBound);
      window.removeEventListener('keydown', this._unlockAudioBound);
    }
    this.avatars.forEach((av) => {
      if (av.facePlane?.geometry) av.facePlane.geometry.dispose();
      if (av.facePlane?.material) av.facePlane.material.dispose();
      if (av.crownMesh?.geometry) av.crownMesh.geometry.dispose();
      if (av.crownMesh?.material) av.crownMesh.material.dispose();
    });
  }
}
