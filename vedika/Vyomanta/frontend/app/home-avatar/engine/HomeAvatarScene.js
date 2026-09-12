import * as THREE from 'three';
import gsap from 'gsap';
import { HomeAvatarManager, HOME_AVATAR_DATA } from './HomeAvatarManager';
/**
 * Custom Shader Material for the 3D Soft Wall Pocket.
 * Simulates elastic wall material with spherical deformation
 * around the avatar's curvature, front lip occlusion, and procedural crevice ambient occlusion.
 */
/**
 * 3D Soft Wall Pocket.
 * Uses MeshStandardMaterial matching backWall exactly (same color, roughness, metalness, and lighting).
 * Displaces smoothly along avatar curvature with feathered edges so it blends 100% seamlessly into the back wall
 * with ZERO black portions, shadows, or visible boundaries.
 */
export class SoftWallPocket {
  constructor(sceneInstance) {
    this.sceneInstance = sceneInstance;
    this.geo = new THREE.PlaneGeometry(3.6, 1.8, 48, 24);

    this.uniforms = {
      uPocketOpen: { value: 0.0 },
      uAvatarLocalPos: { value: new THREE.Vector3(0, 0, 0) },
      uAvatarRadius: { value: 0.72 },
      uLipStretch: { value: 0.0 },
    };

    const vertexDisplacementCode = `
      #include <begin_vertex>
      vPocketUv = uv;
      if (uPocketOpen > 0.001) {
        float dx = transformed.x - uAvatarLocalPos.x;
        float span = max(uAvatarRadius * 1.95, 0.3);
        float distNorm = clamp(abs(dx) / span, 0.0, 1.0);
        float hFactor = pow(cos(distNorm * 1.5707963), 1.35) * uPocketOpen;
        if (transformed.y <= 0.04) {
          float vFactor = clamp(1.0 + (transformed.y / 0.9), 0.0, 1.0);
          transformed.y -= uLipStretch * hFactor * vFactor;
          transformed.z += sqrt(max(0.0, 1.0 - distNorm * distNorm)) * 0.35 * hFactor * vFactor;
        } else {
          transformed.y += 0.05 * hFactor * clamp(1.0 - (transformed.y / 0.9), 0.0, 1.0);
        }
      }
    `;

    // 1. Visual mesh for roomScene (z-index 1) - exact same PBR standard material as backWall
    this.mat = new THREE.MeshStandardMaterial({
      color: '#46403c',
      roughness: 0.92,
      metalness: 0.02,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: true,
      depthTest: true,
    });

    this.mat.onBeforeCompile = (shader) => {
      shader.uniforms.uPocketOpen = this.uniforms.uPocketOpen;
      shader.uniforms.uAvatarLocalPos = this.uniforms.uAvatarLocalPos;
      shader.uniforms.uAvatarRadius = this.uniforms.uAvatarRadius;
      shader.uniforms.uLipStretch = this.uniforms.uLipStretch;

      shader.vertexShader = `
        uniform float uPocketOpen;
        uniform vec3 uAvatarLocalPos;
        uniform float uAvatarRadius;
        uniform float uLipStretch;
        varying vec2 vPocketUv;
      ` + shader.vertexShader;

      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', vertexDisplacementCode);

      shader.fragmentShader = `varying vec2 vPocketUv;\n` + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <dithering_fragment>',
        `
        #include <dithering_fragment>
        // Smooth feathering at the outer edges so the pocket blends 100% seamlessly into the back wall
        float edgeDistX = abs(vPocketUv.x - 0.5) * 2.0;
        float edgeDistY = abs(vPocketUv.y - 0.5) * 2.0;
        float alphaX = smoothstep(1.0, 0.40, edgeDistX);
        float alphaY = smoothstep(1.0, 0.40, edgeDistY);
        gl_FragColor.a *= (alphaX * alphaY);
        `
      );
    };

    this.mesh = new THREE.Mesh(this.geo, this.mat);
    this.mesh.position.set(-4.3, 1.68, -0.55);
    this.mesh.visible = false;
    this.sceneInstance.roomScene.add(this.mesh);

    // 2. Invisible depth occluder for avatarScene (z-index 25) - masks avatar lower body while peeking
    this.occluderMat = new THREE.MeshBasicMaterial({
      colorWrite: false,
      depthWrite: true,
      side: THREE.DoubleSide,
    });

    this.occluderMat.onBeforeCompile = (shader) => {
      shader.uniforms.uPocketOpen = this.uniforms.uPocketOpen;
      shader.uniforms.uAvatarLocalPos = this.uniforms.uAvatarLocalPos;
      shader.uniforms.uAvatarRadius = this.uniforms.uAvatarRadius;
      shader.uniforms.uLipStretch = this.uniforms.uLipStretch;

      shader.vertexShader = `
        uniform float uPocketOpen;
        uniform vec3 uAvatarLocalPos;
        uniform float uAvatarRadius;
        uniform float uLipStretch;
        varying vec2 vPocketUv;
      ` + shader.vertexShader;

      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', vertexDisplacementCode);
    };

    this.occluderMesh = new THREE.Mesh(this.geo, this.occluderMat);
    this.occluderMesh.position.set(-4.3, 1.68, -0.55);
    this.occluderMesh.renderOrder = -1;
    this.occluderMesh.visible = false;
    this.sceneInstance.avatarScene.add(this.occluderMesh);
  }

  updatePosition(worldPos) {
    if (worldPos) {
      const z = worldPos.z !== undefined ? worldPos.z : -0.55;
      if (this.mesh) this.mesh.position.set(worldPos.x, worldPos.y, z);
      if (this.occluderMesh) this.occluderMesh.position.set(worldPos.x, worldPos.y, z);
    }
  }

  setDeformation(openAmount, avatarPos, stretchAmount = 0.46) {
    const isOpen = openAmount > 0.001;
    if (this.mesh) this.mesh.visible = isOpen;
    if (this.occluderMesh) this.occluderMesh.visible = isOpen;

    if (!isOpen) {
      this.uniforms.uPocketOpen.value = 0.0;
      this.uniforms.uLipStretch.value = 0.0;
      return;
    }

    this.uniforms.uPocketOpen.value = openAmount;
    this.uniforms.uLipStretch.value = stretchAmount;

    if (avatarPos) {
      const localPos = avatarPos.clone().sub(this.mesh.position);
      this.uniforms.uAvatarLocalPos.value.copy(localPos);
    }
  }

  reset() {
    if (this.mesh) this.mesh.visible = false;
    if (this.occluderMesh) this.occluderMesh.visible = false;
    this.uniforms.uPocketOpen.value = 0.0;
    this.uniforms.uLipStretch.value = 0.0;
  }

  dispose() {
    if (this.mesh) {
      this.sceneInstance.roomScene.remove(this.mesh);
      this.mat.dispose();
      this.mesh = null;
    }
    if (this.occluderMesh) {
      this.sceneInstance.avatarScene.remove(this.occluderMesh);
      this.occluderMat.dispose();
      this.occluderMesh = null;
    }
    if (this.geo) {
      this.geo.dispose();
      this.geo = null;
    }
  }
}

export class HomeAvatarScene {
  constructor(canvas, avatarCanvas = null, onReady = null, onDoorToggle = null) {
    this.canvas = canvas;
    this.avatarCanvas = avatarCanvas || canvas;
    this.isDualCanvas = !!avatarCanvas && avatarCanvas !== canvas;
    this.onReady = onReady;
    this.onDoorToggle = onDoorToggle;

    this.isDisposed = false;
    this.time = 0;
    this.lastFrameTime = performance.now();
    this.isDoorOpen = false;

    this._initScene();
    this._initLighting();
    this._initRoom();
    this._initFloorMat();
    this._initArchedDoor();
    this._initAvatars();

    this._bindEvents();
    this._startLoop();
  }

  _getCanvasSize() {
    const parent = this.canvas ? this.canvas.parentElement : null;
    const width = parent?.clientWidth || this.canvas?.clientWidth || window.innerWidth;
    const height = parent?.clientHeight || this.canvas?.clientHeight || window.innerHeight;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    return { width: Math.max(width, 100), height: Math.max(height, 100), pixelRatio };
  }

  _initScene() {
    this.roomScene = new THREE.Scene();
    this.roomScene.background = null;
    this.avatarScene = this.isDualCanvas ? new THREE.Scene() : this.roomScene;
    this.avatarScene.background = null;
    this.scene = this.roomScene;

    const { width, height, pixelRatio } = this._getCanvasSize();

    // Camera positioned to capture room, left typography area, floor rug, and right arched door
    this.camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 80);
    this.camera.position.set(0.4, 0.45, 12.8);
    this.camera.lookAt(0.35, -0.2, 0);

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
    this.renderer.toneMappingExposure = 1.05;

    if ('outputColorSpace' in this.renderer) {
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    }
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    if (this.isDualCanvas) {
      this.avatarRenderer = new THREE.WebGLRenderer({
        canvas: this.avatarCanvas,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      });
      this.avatarRenderer.setClearColor(0x000000, 0);
      this.avatarRenderer.setPixelRatio(pixelRatio);
      this.avatarRenderer.setSize(width, height, false);
      this.avatarRenderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.avatarRenderer.toneMappingExposure = 1.05;
      if ('outputColorSpace' in this.avatarRenderer) {
        this.avatarRenderer.outputColorSpace = THREE.SRGBColorSpace;
      }
    }
  }

  _initLighting() {
    // Warm ambient room fill
    const ambient = new THREE.AmbientLight(0xffecd6, 0.78);
    this.scene.add(ambient);

    // Warm directional sunlight casting soft diagonal shadows across room
    this.sunLight = new THREE.DirectionalLight(0xfff3de, 1.45);
    this.sunLight.position.set(6, 7, 7);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 25;
    this.sunLight.shadow.camera.left = -9;
    this.sunLight.shadow.camera.right = 9;
    this.sunLight.shadow.camera.top = 9;
    this.sunLight.shadow.camera.bottom = -9;
    this.sunLight.shadow.bias = -0.001;
    this.scene.add(this.sunLight);

    // Archway glowing golden rim light
    this.archRimLight = new THREE.PointLight(0xffb566, 2.2, 14, 1.2);
    this.archRimLight.position.set(4.6, 0.8, 0.5);
    this.scene.add(this.archRimLight);

    // Light beam from inside doorway
    this.doorSpillLight = new THREE.SpotLight(0xffd188, 0, 16, Math.PI * 0.28, 0.45, 1.0);
    this.doorSpillLight.position.set(4.6, 1.2, -1.2);
    this.doorSpillLight.target.position.set(1.5, -2.18, 2.2);
    this.scene.add(this.doorSpillLight);
    this.scene.add(this.doorSpillLight.target);

    // Dual-canvas: duplicate lighting for foreground avatar scene
    if (this.isDualCanvas) {
      const avAmbient = new THREE.AmbientLight(0xffecd6, 0.85);
      this.avatarScene.add(avAmbient);

      const avSun = new THREE.DirectionalLight(0xfff3de, 1.40);
      avSun.position.set(6, 7, 7);
      this.avatarScene.add(avSun);

      const avRim = new THREE.PointLight(0xffb566, 1.8, 14, 1.2);
      avRim.position.set(4.6, 0.8, 0.5);
      this.avatarScene.add(avRim);
    }
  }

  _initRoom() {
    // 1. Back Wall with warm taupe/greige architectural matte finish
    const wallGeo = new THREE.PlaneGeometry(36, 18);
    const wallMat = new THREE.MeshStandardMaterial({
      color: '#46403c',
      roughness: 0.92,
      metalness: 0.02,
    });
    this.backWall = new THREE.Mesh(wallGeo, wallMat);
    this.backWall.position.set(0, 2.4, -2.4);
    this.backWall.receiveShadow = true;
    this.scene.add(this.backWall);

    // 2. Floor Plane with subtle specular sheen matching reference image
    const floorGeo = new THREE.PlaneGeometry(36, 24);
    const floorMat = new THREE.MeshStandardMaterial({
      color: '#383330',
      roughness: 0.55,
      metalness: 0.12,
    });
    this.floor = new THREE.Mesh(floorGeo, floorMat);
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.position.set(0, -2.18, 5);
    this.floor.receiveShadow = true;
    this.scene.add(this.floor);

    // 3. Baseboard trim along the wall base
    const trimGeo = new THREE.BoxGeometry(36, 0.18, 0.12);
    const trimMat = new THREE.MeshStandardMaterial({
      color: '#2a2624',
      roughness: 0.85,
    });
    const baseboard = new THREE.Mesh(trimGeo, trimMat);
    baseboard.position.set(0, -2.09, -2.34);
    this.scene.add(baseboard);

    // 4. Real-Time 3D Soft Wall Pocket (Elastic Pocket behind VEDIKA / AI TUTOR)
    this.softWallPocket = new SoftWallPocket(this);
  }

  _initFloorMat() {
    // Circular woven floor rug/mat where the avatars settle
    const rugCanvas = document.createElement('canvas');
    rugCanvas.width = 512;
    rugCanvas.height = 512;
    const ctx = rugCanvas.getContext('2d');

    // Charcoal/taupe woven textured concentric rings
    ctx.fillStyle = '#2f2b28';
    ctx.fillRect(0, 0, 512, 512);

    for (let r = 240; r > 10; r -= 6) {
      const shade = 38 + Math.sin(r * 0.15) * 8;
      ctx.strokeStyle = `rgb(${shade}, ${shade - 3}, ${shade - 6})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(256, 256, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    const rugTex = new THREE.CanvasTexture(rugCanvas);
    rugTex.wrapS = THREE.RepeatWrapping;
    rugTex.wrapT = THREE.RepeatWrapping;

    const rugGeo = new THREE.CylinderGeometry(3.65, 3.75, 0.045, 64);
    const rugMat = new THREE.MeshStandardMaterial({
      map: rugTex,
      color: '#342f2b',
      roughness: 0.94,
      metalness: 0.02,
    });
    this.rugMesh = new THREE.Mesh(rugGeo, rugMat);
    this.rugMesh.position.set(-1.25, -2.16, 2.2);
    this.rugMesh.receiveShadow = true;
    this.scene.add(this.rugMesh);

    // Warm floor light spill pool from open door
    const poolGeo = new THREE.PlaneGeometry(6.5, 6.5);
    const poolCanvas = document.createElement('canvas');
    poolCanvas.width = 256;
    poolCanvas.height = 256;
    const pCtx = poolCanvas.getContext('2d');
    const grad = pCtx.createRadialGradient(128, 128, 10, 128, 128, 120);
    grad.addColorStop(0, 'rgba(255, 194, 120, 0.55)');
    grad.addColorStop(0.4, 'rgba(255, 175, 90, 0.25)');
    grad.addColorStop(1, 'rgba(255, 175, 90, 0)');
    pCtx.fillStyle = grad;
    pCtx.fillRect(0, 0, 256, 256);

    const poolTex = new THREE.CanvasTexture(poolCanvas);
    const poolMat = new THREE.MeshBasicMaterial({
      map: poolTex,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
    });
    this.lightPool = new THREE.Mesh(poolGeo, poolMat);
    this.lightPool.rotation.x = -Math.PI / 2;
    this.lightPool.position.set(4.2, -2.17, 1.8);
    this.scene.add(this.lightPool);
  }

  _initArchedDoor() {
    this.doorContainer = new THREE.Group();
    this.doorContainer.position.set(4.6, -2.18, -1.8);

    const doorWidth = 2.8;
    const doorHeight = 5.4;
    const archRadius = doorWidth / 2;
    const straightHeight = doorHeight - archRadius;

    // 1. Arched Doorway Inner Chamber Void (Deep space background)
    const chamberGeo = new THREE.BoxGeometry(doorWidth + 0.4, doorHeight + 0.4, 4.2);
    const chamberMat = new THREE.MeshBasicMaterial({
      color: '#050308',
      side: THREE.BackSide,
    });
    const chamber = new THREE.Mesh(chamberGeo, chamberMat);
    chamber.position.set(0, doorHeight / 2, -2.1);
    this.doorContainer.add(chamber);

    // 2. Cosmic Space Portal Mesh in the Exact Shape of the Arched Door (Benoit Marini 2020)
    const portalShape = new THREE.Shape();
    portalShape.moveTo(-archRadius, 0);
    portalShape.lineTo(-archRadius, straightHeight);
    portalShape.absarc(0, straightHeight, archRadius, Math.PI, 0, true);
    portalShape.lineTo(archRadius, 0);
    portalShape.closePath();

    const portalGeo = new THREE.ShapeGeometry(portalShape, 64);

    const portalVertexShader = /* glsl */ `
      varying vec2 vUv;
      void main() {
        // Normalize coordinates across the full arched doorway (W: 2.8m, H: 5.4m)
        // position.x in [-1.4, 1.4] -> [0.0, 1.0], position.y in [0.0, 5.4] -> [0.0, 1.0]
        vUv = vec2((position.x + 1.4) / 2.8, position.y / 5.4);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const portalFragmentShader = /* glsl */ `
      precision highp float;
      uniform float uTime;
      uniform float uOpacity;
      varying vec2 vUv;

      void main() {
        // Aspect ratio correction inside the arched door (W: 2.8m, H: 5.4m)
        // Perfectly centered horizontally and vertically across the doorway
        vec2 p = (vUv - vec2(0.5, 0.5)) * vec2(2.8 / 5.4, 1.0) * 2.2;

        vec4 o = vec4(0.0);
        float t = uTime * 0.08;

        // Benoit Marini - 2020 Fractal Cosmic Space Shader (Shadertoy WtjyzR)
        for (float i = 0.0; i > -1.0; i -= 0.06) {
          float d = fract(i - 3.0 * t);
          vec4 c = vec4(p * d, i, 0.0) * 28.0;

          for (int j = 0; j < 27; j++) {
            float dotC = max(dot(c, c), 0.0001);
            vec4 sub = vec4(7.0 - 0.2 * sin(t), 6.3, 0.7, 1.0 - cos(t / 0.8)) / 7.0;
            vec4 temp = abs(c / dotC - sub);
            c = vec4(temp.x, temp.z, temp.y, temp.w);
          }

          float factor = (d - 1.0) * d;
          o -= c * c.yzww * factor / vec4(3.0, 5.0, 1.0, 1.0);
        }

        // Celestial nebula color grading (deep violets, celestial magentas, golden filaments)
        vec3 col = o.rgb;
        col = pow(max(col, vec3(0.0)), vec3(0.88)) * 1.65;
        col += vec3(0.04, 0.02, 0.08); // Ambient cosmic dust

        // Soft edge fade at perimeter for smooth integration with door frame
        float edgeDist = min(vUv.x, 1.0 - vUv.x);
        float borderFade = smoothstep(0.0, 0.02, edgeDist) * smoothstep(0.0, 0.015, vUv.y);

        gl_FragColor = vec4(col, uOpacity * borderFade);
      }
    `;

    this.portalMaterial = new THREE.ShaderMaterial({
      vertexShader: portalVertexShader,
      fragmentShader: portalFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0.0 }, // Fades in as door swings open
      },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    this.portalMesh = new THREE.Mesh(portalGeo, this.portalMaterial);
    this.portalMesh.position.set(0, 0, -0.06);
    this.portalMesh.renderOrder = 5;
    this.doorContainer.add(this.portalMesh);

    // 2. Glowing Golden Light Strip Tracing the Interior of the Door Arch
    const neonShape = new THREE.CurvePath();
    const stripZ = -0.06; // Inside the arch reveal
    const stripRadius = archRadius * 0.98;

    // Left vertical line inside arch jamb
    neonShape.add(new THREE.LineCurve3(
      new THREE.Vector3(-stripRadius, 0, stripZ),
      new THREE.Vector3(-stripRadius, straightHeight, stripZ)
    ));
    // Semi-circle top arch inside perimeter
    const archArc = new THREE.EllipseCurve(
      0, straightHeight,
      stripRadius, stripRadius,
      Math.PI, 0,
      true,
      0
    );
    const points2D = archArc.getPoints(36);
    for (let i = 0; i < points2D.length - 1; i++) {
      neonShape.add(new THREE.LineCurve3(
        new THREE.Vector3(points2D[i].x, points2D[i].y, stripZ),
        new THREE.Vector3(points2D[i + 1].x, points2D[i + 1].y, stripZ)
      ));
    }
    // Right vertical line inside arch jamb
    neonShape.add(new THREE.LineCurve3(
      new THREE.Vector3(stripRadius, straightHeight, stripZ),
      new THREE.Vector3(stripRadius, 0, stripZ)
    ));

    // Core high-intensity golden LED strip
    const tubeGeo = new THREE.TubeGeometry(neonShape, 64, 0.052, 12, false);
    const neonMat = new THREE.MeshStandardMaterial({
      color: '#fff5cc',
      emissive: '#ffaa00',
      emissiveIntensity: 4.5,
      roughness: 0.15,
      metalness: 0.1,
    });
    this.neonArchMesh = new THREE.Mesh(tubeGeo, neonMat);
    this.doorContainer.add(this.neonArchMesh);

    // Soft atmospheric golden halo tube
    const haloGeo = new THREE.TubeGeometry(neonShape, 64, 0.115, 12, false);
    const haloMat = new THREE.MeshBasicMaterial({
      color: '#ffb703',
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const haloMesh = new THREE.Mesh(haloGeo, haloMat);
    this.doorContainer.add(haloMesh);

    // Dedicated interior golden arch accent light
    this.archGoldGlow = new THREE.PointLight(0xffaa20, 3.4, 9, 1.4);
    this.archGoldGlow.position.set(0, straightHeight + stripRadius * 0.45, -0.15);
    this.doorContainer.add(this.archGoldGlow);

    // 3. The 3D Arched Wood Door Slab
    const doorShape = new THREE.Shape();
    doorShape.moveTo(-archRadius, 0);
    doorShape.lineTo(-archRadius, straightHeight);
    doorShape.absarc(0, straightHeight, archRadius, Math.PI, 0, true);
    doorShape.lineTo(archRadius, 0);
    doorShape.closePath();

    const extrudeSettings = {
      depth: 0.12,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.02,
      bevelThickness: 0.02,
    };
    const doorGeo = new THREE.ExtrudeGeometry(doorShape, extrudeSettings);

    // Warm natural oak wood texture
    const doorCanvas = document.createElement('canvas');
    doorCanvas.width = 512;
    doorCanvas.height = 1024;
    const dCtx = doorCanvas.getContext('2d');

    dCtx.fillStyle = '#946f4b';
    dCtx.fillRect(0, 0, 512, 1024);

    // Wood grain lines
    dCtx.fillStyle = '#7a5a3a';
    for (let x = 0; x < 512; x += 14) {
      dCtx.fillRect(x + Math.sin(x) * 4, 0, 3, 1024);
    }

    // "Step Inside →" Lettering on Door Face
    dCtx.fillStyle = 'rgba(255, 245, 235, 0.85)';
    dCtx.font = '54px serif';
    dCtx.textAlign = 'center';
    dCtx.fillText('Step', 256, 520);
    dCtx.fillText('Inside', 256, 590);
    dCtx.font = '48px sans-serif';
    dCtx.fillText('→', 256, 660);

    const doorTex = new THREE.CanvasTexture(doorCanvas);

    const doorMat = new THREE.MeshStandardMaterial({
      map: doorTex,
      color: '#a8825c',
      roughness: 0.72,
      metalness: 0.08,
    });

    this.doorSlabMesh = new THREE.Mesh(doorGeo, doorMat);
    this.doorSlabMesh.castShadow = true;
    this.doorSlabMesh.receiveShadow = true;

    // Brass vertical door handle
    const handleGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.95, 16);
    const brassMat = new THREE.MeshStandardMaterial({
      color: '#d4af37',
      roughness: 0.35,
      metalness: 0.85,
    });
    const handleMesh = new THREE.Mesh(handleGeo, brassMat);
    handleMesh.position.set(-archRadius + 0.35, straightHeight * 0.45, 0.19);
    handleMesh.castShadow = true;
    this.doorSlabMesh.add(handleMesh);

    // Pivot Group: Anchored strictly on the RIGHT hinge
    this.doorPivot = new THREE.Group();
    this.doorPivot.position.set(archRadius, 0, 0);

    // Offset slab so hinge is at the right edge
    this.doorSlabMesh.position.set(-archRadius, 0, 0);
    this.doorPivot.add(this.doorSlabMesh);

    this.doorContainer.add(this.doorPivot);
    this.scene.add(this.doorContainer);

    // Start with door completely closed
    this.doorPivot.rotation.y = 0;
    this.isDoorOpen = false;
    this.doorSpillLight.intensity = 0.05;
    this.lightPool.material.opacity = 0.0;
  }

  toggleDoor() {
    if (this.isDoorOpen) {
      this.closeDoor();
    } else {
      this.openDoor();
    }
  }

  openDoor(duration = 0.95) {
    this.isDoorOpen = true;
    gsap.to(this.doorPivot.rotation, {
      y: -Math.PI * 0.44,
      duration,
      ease: 'power2.out',
    });
    gsap.to(this.doorSpillLight, {
      intensity: 2.2,
      duration,
      ease: 'power2.out',
    });
    gsap.to(this.lightPool.material, {
      opacity: 0.65,
      duration,
      ease: 'power2.out',
    });
    if (this.portalMaterial) {
      gsap.to(this.portalMaterial.uniforms.uOpacity, {
        value: 1.0,
        duration: 0.85,
        ease: 'power2.out',
      });
    }
    if (this.onDoorToggle) this.onDoorToggle(true);
  }

  closeDoor(duration = 0.85) {
    this.isDoorOpen = false;
    gsap.to(this.doorPivot.rotation, {
      y: 0,
      duration,
      ease: 'power2.inOut',
    });
    gsap.to(this.doorSpillLight, {
      intensity: 0.1,
      duration,
      ease: 'power2.out',
    });
    gsap.to(this.lightPool.material, {
      opacity: 0.05,
      duration,
      ease: 'power2.out',
    });
    if (this.portalMaterial) {
      gsap.to(this.portalMaterial.uniforms.uOpacity, {
        value: 0.0,
        duration: 0.65,
        ease: 'power2.in',
      });
    }
    if (this.onDoorToggle) this.onDoorToggle(false);
  }

  _initAvatars() {
    this.avatars = new HomeAvatarManager(this.avatarScene, this.camera, () => {
      if (this.onReady) this.onReady();
    }, this.avatarCanvas, this);
  }

  setPocketDeformation(openAmount, avatarPos, stretchAmount = 0.46) {
    if (this.softWallPocket) {
      this.softWallPocket.setDeformation(openAmount, avatarPos, stretchAmount);
    }
  }

  updatePocketPosition(worldPos) {
    if (this.softWallPocket) {
      this.softWallPocket.updatePosition(worldPos);
    }
  }

  resetPocket() {
    if (this.softWallPocket) {
      this.softWallPocket.reset();
    }
  }

  playStep1(onComplete = null) {
    if (this.avatars) {
      return this.avatars.playStep1(onComplete);
    }
  }

  playStep2(onComplete = null) {
    if (this.avatars) {
      return this.avatars.playStep2(onComplete);
    }
  }

  playStep3(onComplete = null) {
    if (this.avatars) {
      return this.avatars.playStep3(onComplete);
    }
  }

  resetAvatars() {
    this.resetPocket();
    if (this.avatars) {
      this.avatars.resetAll();
    }
  }

  settleAvatarsUpTo(stepIndex) {
    if (this.avatars) {
      this.avatars.settleAvatarsUpTo(stepIndex);
    }
  }

  getActiveTimeline() {
    return this.avatars ? this.avatars.getActiveTimeline() : null;
  }

  pause() {
    if (this.avatars) {
      this.avatars.pause();
    }
  }

  resume() {
    if (this.avatars) {
      this.avatars.resume();
    }
  }

  playPopOut(onComplete = null) {
    if (this.avatars) {
      return this.avatars.playPopOutToRug(onComplete);
    }
  }

  pokeAvatar(index) {
    if (this.avatars) {
      this.avatars.pokeAvatar(index);
    }
  }

  walkThroughDoor(index = 3, onComplete = null) {
    this.openDoor(0.65);
    if (this.avatars) {
      const doorWorldPos = new THREE.Vector3();
      this.doorContainer.getWorldPosition(doorWorldPos);
      this.avatars.hopThroughDoor(index, doorWorldPos, onComplete);
    }
  }

  triggerFullDoorDeparture(audioSrc = null, onComplete = null) {
    if (typeof audioSrc === 'function') {
      onComplete = audioSrc;
      audioSrc = null;
    }
    if (this.avatars) {
      this.avatars.triggerFullDoorDeparture(audioSrc, onComplete);
    } else if (onComplete) {
      onComplete();
    }
  }

  _bindEvents() {
    this._onResize = this._handleResize.bind(this);
    this._onMouseMove = this._handleMouseMove.bind(this);

    window.addEventListener('resize', this._onResize);
    window.addEventListener('mousemove', this._onMouseMove);
  }

  _handleResize() {
    if (!this.canvas || this.isDisposed) return;
    const { width, height, pixelRatio } = this._getCanvasSize();
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height, false);
    if (this.avatarRenderer && this.isDualCanvas) {
      this.avatarRenderer.setPixelRatio(pixelRatio);
      this.avatarRenderer.setSize(width, height, false);
    }
  }

  _handleMouseMove(e) {
    const ndcX = (e.clientX / window.innerWidth) * 2 - 1;
    const ndcY = -(e.clientY / window.innerHeight) * 2 + 1;
    if (this.avatars) {
      this.avatars.setMouseGaze(ndcX, ndcY);

      // Raycast against settled avatar groups to detect hover for social gaze
      if (!this._raycaster) {
        this._raycaster = new THREE.Raycaster();
      }
      this._raycaster.setFromCamera({ x: ndcX, y: ndcY }, this.camera);

      let hitIdx = -1;
      const avatarList = this.avatars.avatars || [];
      for (let i = 0; i < avatarList.length; i++) {
        const av = avatarList[i];
        if (!av.isSettled || !av.group.visible) continue;

        // Use a simple sphere test around the avatar's world position
        const avPos = new THREE.Vector3();
        av.group.getWorldPosition(avPos);
        const dist = this._raycaster.ray.distanceToPoint(avPos);
        if (dist < 0.72) {  // 0.72 world-unit radius sphere around each avatar
          hitIdx = i;
          break;
        }
      }

      if (hitIdx >= 0) {
        this.avatars.setHoveredAvatar(hitIdx);
      } else {
        this.avatars.clearHoveredAvatar();
      }
    }
  }

  _startLoop() {
    const animate = (timestamp) => {
      if (this.isDisposed) return;
      this.animId = requestAnimationFrame(animate);

      const delta = Math.min((timestamp - this.lastFrameTime) / 1000, 0.1);
      this.lastFrameTime = timestamp;
      this.time += delta;

      if (this.avatars) {
        this.avatars.update(delta);
      }

      // Gentle pulsating glow on the golden arch light strip & accent illumination
      if (this.neonArchMesh) {
        const pulse = Math.sin(this.time * 2.8) * 0.45;
        this.neonArchMesh.material.emissiveIntensity = 4.2 + pulse;
        if (this.archGoldGlow) {
          this.archGoldGlow.intensity = 3.4 + pulse * 0.8;
        }
      }

      // Continuously animate Benoit Marini cosmic space portal shader
      if (this.portalMaterial) {
        this.portalMaterial.uniforms.uTime.value = this.time;
      }

      this.renderer.render(this.roomScene, this.camera);
      if (this.avatarRenderer && this.isDualCanvas) {
        this.avatarRenderer.render(this.avatarScene, this.camera);
      }
    };
    this.animId = requestAnimationFrame(animate);
  }

  dispose() {
    this.isDisposed = true;
    cancelAnimationFrame(this.animId);
    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('mousemove', this._onMouseMove);

    if (this.portalMaterial) {
      this.portalMaterial.dispose();
    }
    if (this.portalMesh) {
      this.portalMesh.geometry.dispose();
    }

    if (this.softWallPocket) {
      this.softWallPocket.dispose();
    }
    if (this.avatars) {
      this.avatars.dispose();
    }
    if (this.renderer) {
      this.renderer.dispose();
    }
    if (this.avatarRenderer) {
      this.avatarRenderer.dispose();
    }
  }
}
