import * as THREE from 'three';
import { loadGLBModelOptimized } from '@/components/ThreeDAvatar';

const SHADER_VERTEX = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

// ── Pass 1: Buffer A (Right-Side Cube & Leftward Streaming Particles) ──
const SHADER_BUFFER_A = `
  uniform vec2 iResolution;
  uniform float iTime;
  uniform float uUserRotY;
  uniform vec2 uCubeCenter;
  uniform float uCubeExpansion;

  #define parts 220
  const float fov = 750.0;

  float ls(vec2 u, vec2 s, vec2 e) {
    vec2 l1 = u - s;
    vec2 l2 = (e - s) * (clamp(dot(l1, (e - s)) / (dot(e - s, e - s) + 0.00001), 0.0, 1.0));
    return 1.0 - smoothstep(1.5, 1.6, length(l1 - l2));
  }

  float sq(vec2 f, float w, float r, float d) {
    float a = 0.0;
    vec3 p = vec3(1.0);
    float s = sin(r), c = cos(r);
    vec3 lj = vec3(0.0);
    
    for(int i = 0; i < 5; i++) {
      vec3 j = p * w;
      j.xz *= mat2(c, s, -s, c);
      j.z -= d;
      j.xy /= j.z;
      j.xy *= fov;
      if(i < 5)
        a += ls(f, j.xy, j.xy * vec2(1.0, -1.0));
      if(i > 0) {
        a += ls(f, j.xy, lj.xy);
        a += ls(f, j.xy * vec2(1.0, -1.0), lj.xy * vec2(1.0, -1.0));
      }
      p.xz = p.zx;
      p.z *= -1.0;
      lj = j;
    }
    return a;
  }

  void main() {
    vec2 fragCoord = gl_FragCoord.xy;

    // Cube coordinates strictly anchored to the right side
    vec2 cubePixelCenter = uCubeCenter * iResolution.xy;
    vec2 fr = fragCoord - cubePixelCenter;
    vec2 f = 1000.0 * fr / iResolution.x;
    
    float r = iTime * 0.02 + 0.08 * sin(0.08 * iTime) - uUserRotY;
    float s = sin(r), c = cos(r);
    
    // Contained cube formation on the right side (compact size 210)
    float targetW = 210.0 + uCubeExpansion * 280.0;
    float w = smoothstep(4.0, 0.0, iTime) * 140.0 + targetW;
    float d = 1600.0 + 200.0 * cos(iTime * 0.6);
    float sb = smoothstep(1.0, 3.5, iTime) * (1.0 - uCubeExpansion * 0.85);
    
    vec3 col = vec3(0.0);

    // Cube wireframe lines strictly restricted to the right side only
    float cubeClip = smoothstep(iResolution.x * 0.44, iResolution.x * 0.52, fragCoord.x);
    col += sb * sq(f, w, r, d) * cubeClip;
    
    // 1. Core Glowing Particle Vortex INSIDE the Cube
    for(int i = 0; i < 200; i++) {
      float fi = float(i);
      // Strictly bounded within [-w, +w] interior volume of the cube
      vec3 dat = w * sin(vec3(5322.0, 6344.0, 6436.0) * fi * 0.0001 + 0.1 * iTime);

      dat.xz *= mat2(c, s, -s, c);
      dat.z -= d;
      dat.xy /= dat.z;
      dat.xy *= fov;

      float b = (0.22 + uCubeExpansion * 0.25) * smoothstep(0.0, 3.0, iTime);
      if(dat.z < 0.0) {
        float dist1 = length(f - dat.xy) + 0.0001;
        float zFactor = 1.0 + max((dat.z + 1500.0) / 500.0, -0.6);
        
        // Intense glowing core swirling INSIDE the cube around the avatars
        col += b * zFactor / dist1;

        // Surrounding aura
        vec2 auraPos = dat.xy * (2.2 + uCubeExpansion * 2.5);
        col += (b * zFactor / (length(f - auraPos) + 0.0001)) * 0.55;
      }
    }

    // 2. Cosmic particles drifting from the cube toward the left side, fading away gradually
    for(int j = 0; j < 60; j++) {
      float fj = float(j);
      vec3 pDrift = w * 0.85 * sin(vec3(4321.0, 5432.0, 6543.0) * fj * 0.0002 + 0.08 * iTime);

      float streamProg = fract(fj * 0.031 + iTime * 0.04);
      pDrift.x -= streamProg * 700.0;
      pDrift.y += sin(streamProg * 5.0 + fj * 0.7) * 65.0;

      pDrift.xz *= mat2(c, s, -s, c);
      pDrift.z -= d;
      pDrift.xy /= pDrift.z;
      pDrift.xy *= fov;

      if(pDrift.z < 0.0) {
        float dist2 = length(f - pDrift.xy) + 0.0001;
        float zFactor2 = 1.0 + max((pDrift.z + 1500.0) / 500.0, -0.6);
        float pVal2 = 0.18 * zFactor2 / dist2;

        vec2 pScreen = cubePixelCenter + pDrift.xy * (iResolution.x / 1000.0);
        float normX = pScreen.x / iResolution.x;

        // Fade away little by little toward the left
        float leftGrad = smoothstep(0.04, 0.70, normX);
        float fade = 0.06 + 0.94 * leftGrad;

        col += pVal2 * fade * 0.7;
      }
    }
    
    gl_FragColor = vec4(col.x, col.x, col.x, 1.0);
  }
`;

// ── Pass 2: Image Pass (Green Phosphor vs. Warning Red Alert with Retro Bayer Dither) ──
const SHADER_IMAGE = `
  uniform sampler2D tBufferA;
  uniform float uAlertRed;
  varying vec2 vUv;

  void main() {
    vec4 sampleCol = texture2D(tBufferA, vUv);
    float rawVal = sampleCol.r;

    // Vibrant Glowing Cyber-Green Matrix Phosphor Output
    float val = pow(rawVal, 3.4);
    vec3 greenColor = vec3(
      val * 0.06,
      val * 1.18,
      val * 0.22
    );
    greenColor += vec3(0.03, 0.32, 0.08) * rawVal;

    // Warning Amber/Red Alert Glow on failure
    vec3 redAlertColor = vec3(
      val * 1.25,
      val * 0.16,
      val * 0.05
    );
    redAlertColor += vec3(0.35, 0.04, 0.02) * rawVal;

    vec3 baseColor = mix(greenColor, redAlertColor, clamp(uAlertRed, 0.0, 1.0));

    // Retro 8x8 Bayer dithering pattern
    vec2 ditherCoord = mod(floor(gl_FragCoord.xy), 8.0);
    float b = mod(ditherCoord.x * 3.0 + ditherCoord.y * 5.0, 8.0) / 8.0;
    vec3 dithered = floor(baseColor * 6.0 + b * 0.35) / 6.0;
    vec3 finalColor = mix(baseColor, dithered, 0.28);

    gl_FragColor = vec4(clamp(finalColor, 0.0, 1.0), 1.0);
  }
`;

// Compact mascot positions nestled comfortably inside the 210 green shader cube
const AVATAR_DATA = [
  {
    name: 'Mowgli',
    texture: '/avatar_1_purple.webp',
    pos: [-0.30, 0.23, 0.23],
    rotY: -0.25,
  },
  {
    name: 'Belle',
    texture: '/avatar_2_lime.webp',
    pos: [0.30, 0.23, -0.23],
    rotY: 0.25,
  },
  {
    name: 'Moana',
    texture: '/avatar_3_red.webp',
    pos: [-0.30, -0.23, -0.23],
    rotY: -0.20,
  },
  {
    name: 'Bhageera',
    texture: '/avatar_4_blue.webp',
    pos: [0.30, -0.23, 0.23],
    rotY: 0.20,
  },
];

export class CubeAvatarScene {
  constructor(containerElement) {
    this.container = containerElement;
    this.isDisposed = false;
    this.time = 0;

    // Interaction states
    this.isDragging = false;
    this.previousPointerPos = { x: 0, y: 0 };
    this.userRot = { x: 0, y: 0 };
    this.targetUserRot = { x: 0, y: 0 };

    this.mouseRay = new THREE.Vector2(-999, -999);
    this.raycaster = new THREE.Raycaster();

    this.cubeCenterNorm = new THREE.Vector2(0.68, 0.5);

    // Animation state machine: 'idle' | 'success' | 'wrong'
    this.animState = 'idle';
    this.stateStartTime = 0;

    this._init();
  }

  _init() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    // 1. Full-Screen WebGL Renderer
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.renderer.autoClear = false;
    this.container.appendChild(this.renderer.domElement);

    const drawingSize = new THREE.Vector2();
    this.renderer.getDrawingBufferSize(drawingSize);

    // 2. High-Speed Downscaled FBO for Buffer A
    const fboScale = 0.55;
    this.fboWidth = Math.max(128, Math.floor(drawingSize.x * fboScale));
    this.fboHeight = Math.max(128, Math.floor(drawingSize.y * fboScale));

    this.fbo = new THREE.WebGLRenderTarget(this.fboWidth, this.fboHeight, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
      depthBuffer: false,
      stencilBuffer: false,
    });

    // 3. Buffer A Pass Scene
    this.bgCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.bufferAScene = new THREE.Scene();
    this.bufferAUniforms = {
      iResolution: { value: new THREE.Vector2(this.fboWidth, this.fboHeight) },
      iTime: { value: 0 },
      uUserRotY: { value: 0 },
      uCubeCenter: { value: this.cubeCenterNorm },
      uCubeExpansion: { value: 0 },
    };
    const bufferAMat = new THREE.ShaderMaterial({
      vertexShader: SHADER_VERTEX,
      fragmentShader: SHADER_BUFFER_A,
      uniforms: this.bufferAUniforms,
      depthWrite: false,
      depthTest: false,
    });
    this.bufferAScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bufferAMat));

    // 4. Image Presentation Pass Scene (Full Screen Quad)
    this.imageScene = new THREE.Scene();
    this.imageUniforms = {
      tBufferA: { value: this.fbo.texture },
      uAlertRed: { value: 0 },
    };
    const imageMat = new THREE.ShaderMaterial({
      vertexShader: SHADER_VERTEX,
      fragmentShader: SHADER_IMAGE,
      uniforms: this.imageUniforms,
      depthWrite: false,
      depthTest: false,
    });
    this.imageScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), imageMat));

    // 5. Main 3D Perspective Scene (Avatars only, positioned inside the shader cube)
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    this.camera.position.set(0, 0, 7.5);

    // Optimized Lighting for crisp mascots
    const ambLight = new THREE.AmbientLight(0xffffff, 2.3);
    this.scene.add(ambLight);

    const dirLight = new THREE.DirectionalLight(0xf8fafc, 2.8);
    dirLight.position.set(4, 7, 5);
    this.scene.add(dirLight);

    const greenRimLight = new THREE.PointLight(0x00ff66, 4.5, 15);
    greenRimLight.position.set(0, 0, 3);
    this.scene.add(greenRimLight);

    // 6. Avatar Group: ONLY the 4 avatars inside the shader cube
    this.avatarGroup = new THREE.Group();
    this.scene.add(this.avatarGroup);

    this._updateLayoutOffsets(width, height);

    this.avatars = [];
    this._loadAvatars();

    // 7. Event Listeners
    this._onResize = this._onResize.bind(this);
    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);

    window.addEventListener('resize', this._onResize);
    window.addEventListener('pointerdown', this._onPointerDown);
    window.addEventListener('pointermove', this._onPointerMove);
    window.addEventListener('pointerup', this._onPointerUp);

    // 8. Render Loop
    this.clock = new THREE.Clock();
    this._animate = this._animate.bind(this);
    this.animId = requestAnimationFrame(this._animate);
  }

  _updateLayoutOffsets(width, height) {
    const isDesktop = width >= 1024;
    const centerNormX = isDesktop ? 0.68 : 0.5;
    const centerNormY = isDesktop ? 0.5 : 0.4;

    this.cubeCenterNorm.set(centerNormX, centerNormY);

    if (this.camera) {
      const visibleHalfHeight = this.camera.position.z * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
      const visibleHalfWidth = visibleHalfHeight * this.camera.aspect;

      const ndcX = centerNormX * 2.0 - 1.0;
      const ndcY = centerNormY * 2.0 - 1.0;

      this.avatarGroup.position.x = ndcX * visibleHalfWidth;
      this.avatarGroup.position.y = ndcY * visibleHalfHeight;
    }
  }

  _loadAvatars() {
    const texLoader = new THREE.TextureLoader();

    loadGLBModelOptimized()
      .then((gltf) => {
        if (this.isDisposed) return;

        AVATAR_DATA.forEach((buddy, idx) => {
          const clone = gltf.scene.clone(true);

          // Center geometry
          const box = new THREE.Box3().setFromObject(clone);
          const center = box.getCenter(new THREE.Vector3());
          const sizeVec = box.getSize(new THREE.Vector3());

          clone.position.x -= center.x;
          clone.position.y -= center.y;
          clone.position.z -= center.z;

          // Increased size: 0.48 (boosted from 0.36 for great prominence)
          const maxDim = Math.max(sizeVec.x, sizeVec.y, sizeVec.z);
          const avatarScale = 0.48;
          if (maxDim > 0) {
            clone.scale.setScalar(avatarScale / maxDim);
          }

          // Apply mascot fur texture
          const tex = texLoader.load(buddy.texture);
          tex.flipY = false;
          tex.colorSpace = THREE.SRGBColorSpace;

          clone.traverse((child) => {
            if (child.isMesh && child.material) {
              child.material = child.material.clone();
              child.material.map = tex;
              child.material.color.set('#FFFFFF');
              child.material.roughness = 0.38;
              child.material.metalness = 0.05;
              child.material.needsUpdate = true;
            }
          });

          // Procedural 2D Mouth Canvas
          const mouthCanvas = document.createElement('canvas');
          mouthCanvas.width = 256;
          mouthCanvas.height = 256;
          const mouthCtx = mouthCanvas.getContext('2d');
          this._drawMouth(mouthCtx, 0);

          const mouthTex = new THREE.CanvasTexture(mouthCanvas);
          const mouthPlane = new THREE.Mesh(
            new THREE.PlaneGeometry(0.28, 0.28),
            new THREE.MeshBasicMaterial({
              map: mouthTex,
              transparent: true,
              depthWrite: false,
              side: THREE.DoubleSide,
            })
          );
          mouthPlane.position.set(0, -0.02, 0.24);

          // Interaction hit sphere for raycasting
          const hitSphere = new THREE.Mesh(
            new THREE.SphereGeometry(0.32, 12, 12),
            new THREE.MeshBasicMaterial({ visible: false })
          );

          // Avatar Assembly Group
          const avGroup = new THREE.Group();
          avGroup.add(clone);
          avGroup.add(mouthPlane);
          avGroup.add(hitSphere);

          avGroup.position.set(...buddy.pos);
          avGroup.rotation.y = buddy.rotY;

          this.avatarGroup.add(avGroup);

          this.avatars.push({
            group: avGroup,
            buddy,
            index: idx,
            mouthCanvas,
            mouthCtx,
            mouthTex,
            hitSphere,
            basePos: new THREE.Vector3(...buddy.pos),
            baseRotY: buddy.rotY,
            // Autonomous independent random head/body rotation state
            currentYaw: (Math.random() - 0.5) * 0.6,
            targetYaw: (Math.random() - 0.5) * 1.5,
            currentPitch: 0,
            targetPitch: 0,
            currentRoll: 0,
            targetRoll: 0,
            yawSpeed: 0.04 + Math.random() * 0.04,
            nextLookTime: 0.5 + Math.random() * 1.5,
          });
        });
      })
      .catch((err) => {
        console.error('Failed to load avatars into shader cube:', err);
      });
  }

  _drawMouth(ctx, open = 0) {
    ctx.clearRect(0, 0, 256, 256);
    ctx.save();
    ctx.translate(128, 145);

    const isSpeaking = open > 0.05;
    const w = 42 + open * 14;
    const halfW = w / 2;

    ctx.strokeStyle = '#181216';
    ctx.lineWidth = 3.6;
    ctx.lineCap = 'round';

    if (isSpeaking) {
      const openH = open * 16;
      ctx.beginPath();
      ctx.moveTo(-halfW, -2);
      ctx.quadraticCurveTo(0, -4, halfW, -2);
      ctx.quadraticCurveTo(0, openH + 6, -halfW, -2);
      ctx.fillStyle = '#1C1218';
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(-halfW, -2);
      ctx.quadraticCurveTo(0, 8, halfW, -2);
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Visual Breakout: On correct credentials, cube unlocks and avatars zoom forward celebrating!
   */
  triggerSuccess() {
    this.animState = 'success';
    this.stateStartTime = this.time;
  }

  /**
   * Visual Lock: On wrong credentials, cube flashes warning red and avatars huddle inside shaking heads "no"
   */
  triggerFailure() {
    this.animState = 'wrong';
    this.stateStartTime = this.time;
  }

  _onPointerDown(e) {
    if (e.target.closest && e.target.closest('.la-left-pane')) return;
    this.isDragging = true;
    this.previousPointerPos = { x: e.clientX, y: e.clientY };
  }

  _onPointerMove(e) {
    const x = e.clientX;
    const y = e.clientY;

    this.mouseRay.x = (x / window.innerWidth) * 2 - 1;
    this.mouseRay.y = -(y / window.innerHeight) * 2 + 1;

    if (this.isDragging) {
      const deltaX = e.clientX - this.previousPointerPos.x;
      const deltaY = e.clientY - this.previousPointerPos.y;

      this.targetUserRot.y += deltaX * 0.006;
      this.targetUserRot.x += deltaY * 0.004;
      this.targetUserRot.x = Math.max(-0.5, Math.min(0.5, this.targetUserRot.x));

      this.previousPointerPos = { x: e.clientX, y: e.clientY };
    }
  }

  _onPointerUp() {
    this.isDragging = false;
  }

  _onResize() {
    if (this.isDisposed) return;
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this._updateLayoutOffsets(width, height);

    const drawingSize = new THREE.Vector2();
    this.renderer.getDrawingBufferSize(drawingSize);

    const fboScale = 0.55;
    this.fboWidth = Math.max(128, Math.floor(drawingSize.x * fboScale));
    this.fboHeight = Math.max(128, Math.floor(drawingSize.y * fboScale));

    this.fbo.setSize(this.fboWidth, this.fboHeight);
    this.bufferAUniforms.iResolution.value.set(this.fboWidth, this.fboHeight);
  }

  _animate() {
    if (this.isDisposed) return;

    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.time += dt;

    // Smooth user rotation damping
    this.userRot.x += (this.targetUserRot.x - this.userRot.x) * 0.1;
    this.userRot.y += (this.targetUserRot.y - this.userRot.y) * 0.1;

    // 1. Update Shader Uniforms
    this.bufferAUniforms.iTime.value = this.time;
    this.bufferAUniforms.uUserRotY.value = this.userRot.y;

    // 2. Synchronize Avatars inside the Shader Cube (ultra-slow 90% reduced spin)
    const shaderR = this.time * 0.02 + 0.08 * Math.sin(0.08 * this.time) - this.userRot.y;
    this.avatarGroup.rotation.y = -shaderR;
    this.avatarGroup.rotation.x = this.userRot.x;

    // Dynamically scale avatars with the cube size:
    // In shader: d = 1600.0 + 200.0 * cos(iTime * 0.6).
    // Perspective division divides by d, meaning when d is small (1400) the cube is BIG on screen,
    // and when d is large (1800) the cube is SMALL on screen.
    // The avatars expand when the cube gets bigger and contract when the cube gets smaller.
    let wFactor = 1.0;
    if (this.time < 4.0) {
      const p = Math.max(0, Math.min(1, (4.0 - this.time) / 4.0));
      const smoothW = p * p * (3.0 - 2.0 * p) * 140.0;
      wFactor = (smoothW + 210.0) / 210.0;
    }
    const d = 1600.0 + 200.0 * Math.cos(this.time * 0.6);
    // At smallest cube (d=1800), factor = 1.0 (base "okay" size).
    // At largest cube (d=1400), factor expands to ~1.37x along with the bigger cube.
    const cubeExpansionFactor = Math.pow(1800.0 / d, 1.25);
    const dynamicCubeScale = wFactor * cubeExpansionFactor;
    this.avatarGroup.scale.setScalar(dynamicCubeScale);

    // 3. State Machine Animations (Success Breakout vs. Wrong Lock vs. Idle)
    if (this.animState === 'success') {
      const elapsed = this.time - this.stateStartTime;
      const progress = Math.min(1.0, elapsed / 1.5);
      // Ease out cubic
      const easeProg = 1.0 - Math.pow(1.0 - progress, 3.0);

      // Cube unlocks and expands away
      this.bufferAUniforms.uCubeExpansion.value = easeProg;
      this.imageUniforms.uAlertRed.value = 0;

      // Avatars leap forward out of the cube toward the screen!
      this.avatars.forEach((avatar) => {
        const spreadFactor = 1.0 + easeProg * 1.6;
        const forwardZ = avatar.basePos.z + easeProg * 4.2;
        const celebratoryHop = Math.sin(progress * Math.PI * 3.0) * 0.22;

        avatar.group.position.x = avatar.basePos.x * spreadFactor;
        avatar.group.position.y = avatar.basePos.y * spreadFactor + celebratoryHop;
        avatar.group.position.z = forwardZ;

        // Joyful rotation spin on breakout
        avatar.group.rotation.y = avatar.baseRotY + progress * Math.PI * 2.0;
        avatar.group.rotation.z = Math.sin(progress * Math.PI * 4.0) * 0.12;
      });

    } else if (this.animState === 'wrong') {
      const elapsed = this.time - this.stateStartTime;
      const duration = 1.8;
      const progress = Math.min(1.0, elapsed / duration);

      // Pulse red/amber warning alert
      const pulseAlert = Math.sin(Math.min(1.0, progress * 1.5) * Math.PI);
      this.imageUniforms.uAlertRed.value = pulseAlert * 0.92;
      this.bufferAUniforms.uCubeExpansion.value = 0;

      // Avatars huddle inside and shake heads "no" horizontally
      const huddleAmount = Math.sin(progress * Math.PI) * 0.35;
      const noShake = Math.sin(elapsed * 24.0) * (1.0 - progress) * 0.40;

      this.avatars.forEach((avatar) => {
        avatar.group.position.x = avatar.basePos.x * (1.0 - huddleAmount);
        avatar.group.position.y = avatar.basePos.y * (1.0 - huddleAmount);
        avatar.group.position.z = avatar.basePos.z * (1.0 - huddleAmount);
        avatar.group.rotation.y = avatar.baseRotY + noShake;
        avatar.group.rotation.z = 0;
      });

      // Smoothly return to idle after duration
      if (elapsed >= duration) {
        this.animState = 'idle';
        this.imageUniforms.uAlertRed.value = 0;
      }

    } else {
      // Normal Idle: Avatars revolve with cube, but continuously rotate their heads and bodies randomly in 3 axes
      this.bufferAUniforms.uCubeExpansion.value = 0;
      this.imageUniforms.uAlertRed.value = 0;

      this.avatars.forEach((avatar, idx) => {
        // Autonomous random look-around decision cycle
        if (this.time > avatar.nextLookTime) {
          avatar.targetYaw = (Math.random() - 0.5) * 1.8; // look left/right up to ~50°
          avatar.targetPitch = (Math.random() - 0.5) * 0.45; // look up/down
          avatar.targetRoll = (Math.random() - 0.5) * 0.28; // cute head tilt
          avatar.yawSpeed = 0.04 + Math.random() * 0.04;
          avatar.nextLookTime = this.time + 0.9 + Math.random() * 1.8;
        }
        avatar.currentYaw += (avatar.targetYaw - avatar.currentYaw) * avatar.yawSpeed;
        avatar.currentPitch += (avatar.targetPitch - avatar.currentPitch) * (avatar.yawSpeed * 1.2);
        avatar.currentRoll += (avatar.targetRoll - avatar.currentRoll) * (avatar.yawSpeed * 1.1);

        // Continuous organic breathing bob & curious micro-sway
        const idleY = Math.sin(this.time * 2.2 + idx * 1.7) * 0.022;
        const swayYaw = Math.sin(this.time * 1.3 + idx * 2.1) * 0.14;
        const swayPitch = Math.cos(this.time * 1.7 + idx * 1.3) * 0.07;

        avatar.group.position.x = avatar.basePos.x;
        avatar.group.position.y = avatar.basePos.y + idleY;
        avatar.group.position.z = avatar.basePos.z;

        // Apply independent random 3D head/body rotation
        avatar.group.rotation.x = avatar.currentPitch + swayPitch;
        avatar.group.rotation.y = avatar.baseRotY + avatar.currentYaw + swayYaw;
        avatar.group.rotation.z = avatar.currentRoll;
      });
    }

    // 4. Two-Pass Fullscreen Rendering:
    this.renderer.setRenderTarget(this.fbo);
    this.renderer.render(this.bufferAScene, this.bgCamera);

    this.renderer.setRenderTarget(null);
    this.renderer.clear();
    this.renderer.render(this.imageScene, this.bgCamera);

    this.renderer.render(this.scene, this.camera);

    this.animId = requestAnimationFrame(this._animate);
  }

  dispose() {
    this.isDisposed = true;
    if (this.animId) cancelAnimationFrame(this.animId);

    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('pointerdown', this._onPointerDown);
    window.removeEventListener('pointermove', this._onPointerMove);
    window.removeEventListener('pointerup', this._onPointerUp);

    if (this.fbo) {
      this.fbo.dispose();
      this.fbo = null;
    }

    if (this.renderer && this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      this.renderer.dispose();
    }
  }
}
