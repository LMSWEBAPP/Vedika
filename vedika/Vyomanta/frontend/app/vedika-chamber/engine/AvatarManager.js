import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { CHAMBERS_DATA } from './ChamberGeometry';

/**
 * 2nd-order spring physics for natural organic motion
 */
function updateSpring(val, vel, target, stiffness, damping, dt) {
  const force = (target - val) * stiffness;
  const damp = -vel * damping;
  const nVel = vel + (force + damp) * dt;
  const nVal = val + nVel * dt;
  return [nVal, nVel];
}

/**
 * Draw Cute Small Smile Line or Speaking Open Mouth (from Vedika Labs)
 */
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
    // Open cheerful mouth shape with cute pink tongue
    const openH = mouthOpen * 16;
    ctx.fillStyle = '#122B1E';
    ctx.beginPath();
    ctx.moveTo(-w / 2, -curveY * 0.25);
    ctx.quadraticCurveTo(0, curveY * 0.35 + openH, w / 2, -curveY * 0.25);
    ctx.quadraticCurveTo(0, -curveY * 0.25 - openH * 0.35, -w / 2, -curveY * 0.25);
    ctx.fill();
    ctx.stroke();

    // Cute pink tongue
    ctx.fillStyle = '#FF758F';
    ctx.beginPath();
    ctx.ellipse(0, (curveY * 0.35 + openH) * 0.55, w * 0.28, openH * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Cute subtle smile line
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

/**
 * Draw Compact Floating 3D Speech Tag (Dotted lines REMOVED, smaller sleek size)
 */
function drawSpeechTag(ctx, name, colorHex, isFocused) {
  ctx.clearRect(0, 0, 512, 180);

  const cx = 256;
  const pillY = 90;
  const pillW = Math.min(460, Math.max(220, name.length * 20 + 80));
  const pillH = 68;
  const r = pillH / 2;

  ctx.save();

  // Clean Crisp Pill Tag (No blurry glow, compact sleek size)
  ctx.fillStyle = isFocused ? 'rgba(15, 20, 36, 0.94)' : 'rgba(10, 14, 26, 0.85)';
  ctx.beginPath();
  ctx.roundRect(cx - pillW / 2, pillY - pillH / 2, pillW, pillH, r);
  ctx.fill();

  // Solid Crisp Border in Avatar's signature color
  ctx.strokeStyle = colorHex;
  ctx.lineWidth = isFocused ? 3.8 : 2.5;
  ctx.stroke();

  // Crisp White Typography
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 28px "Outfit", "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name, cx, pillY);

  ctx.restore();
}

/**
 * Generates an ultra-soft, dreamy, foggy Gaussian aura texture with zero hard edges
 */
function createCelestialAuraTexture() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Multi-stop ultra-soft radial fog gradient with smoothstep falloff
  const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
  gradient.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  gradient.addColorStop(0.10, 'rgba(255, 255, 255, 0.90)');
  gradient.addColorStop(0.25, 'rgba(255, 255, 255, 0.60)');
  gradient.addColorStop(0.45, 'rgba(255, 255, 255, 0.28)');
  gradient.addColorStop(0.68, 'rgba(255, 255, 255, 0.09)');
  gradient.addColorStop(0.86, 'rgba(255, 255, 255, 0.015)');
  gradient.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Generates a cute 3D-stylized cartoon Star King Crown texture (Option 1)
 * with a glowing star peak, royal gold curves, and theme-colored centerpiece diamond
 */
function createCrownTexture(themeColorHex) {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, 256, 256);

  const cx = 128;
  const cy = 142;

  ctx.save();
  ctx.translate(cx, cy);

  // Soft atmospheric aura glow in avatar's color
  const glowGrad = ctx.createRadialGradient(0, -10, 10, 0, -10, 115);
  glowGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.95)');
  glowGrad.addColorStop(0.35, themeColorHex + '99');
  glowGrad.addColorStop(0.70, themeColorHex + '25');
  glowGrad.addColorStop(1.0, 'rgba(0,0,0,0)');
  ctx.fillStyle = glowGrad;
  ctx.fillRect(-128, -142, 256, 256);

  // 1. Royal Gold Crown Body with curved cartoon silhouette
  ctx.beginPath();
  ctx.moveTo(-62, 32);
  // Left wing tip
  ctx.quadraticCurveTo(-68, 8, -76, -20);
  ctx.arc(-72, -24, 7, Math.PI, 0, false);
  // Left valley
  ctx.quadraticCurveTo(-46, -4, -30, 10);
  // Center high star pillar
  ctx.quadraticCurveTo(-14, -22, 0, -50);
  ctx.quadraticCurveTo(14, -22, 30, 10);
  // Right valley
  ctx.quadraticCurveTo(46, -4, 68, -24);
  ctx.arc(72, -24, 7, Math.PI, 0, false);
  // Right wing tip
  ctx.quadraticCurveTo(68, 8, 62, 32);
  // Base arc
  ctx.quadraticCurveTo(0, 38, -62, 32);
  ctx.closePath();

  // Royal rich gold gradient
  const goldGrad = ctx.createLinearGradient(0, -50, 0, 36);
  goldGrad.addColorStop(0.0, '#FFFBEB');
  goldGrad.addColorStop(0.30, '#FDE047');
  goldGrad.addColorStop(0.65, '#EAB308');
  goldGrad.addColorStop(1.0, '#CA8A04');
  ctx.fillStyle = goldGrad;
  ctx.fill();

  // Thick comic outline
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 5.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();

  // 2. Centerpiece Faceted Diamond Gem in Avatar's Theme Color
  ctx.beginPath();
  ctx.moveTo(0, -22); // Top diamond point
  ctx.lineTo(16, 2);   // Right point
  ctx.lineTo(0, 26);   // Bottom point
  ctx.lineTo(-16, 2);  // Left point
  ctx.closePath();

  const gemGrad = ctx.createLinearGradient(0, -22, 0, 26);
  gemGrad.addColorStop(0.0, '#FFFFFF');
  gemGrad.addColorStop(0.35, themeColorHex);
  gemGrad.addColorStop(1.0, '#0F172A');
  ctx.fillStyle = gemGrad;
  ctx.fill();

  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 3.5;
  ctx.stroke();

  // Gem facets
  ctx.beginPath();
  ctx.moveTo(-16, 2);
  ctx.lineTo(16, 2);
  ctx.moveTo(0, -22);
  ctx.lineTo(0, 26);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 3. Radiant Golden Star on Center Peak
  function drawStar(cx, cy, spikes, outerRadius, innerRadius) {
    let rot = (Math.PI / 2) * 3;
    let x = cx;
    let y = cy;
    let step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();

    const starGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, outerRadius);
    starGrad.addColorStop(0.0, '#FFFFFF');
    starGrad.addColorStop(0.5, '#FEF08A');
    starGrad.addColorStop(1.0, '#F59E0B');
    ctx.fillStyle = starGrad;
    ctx.fill();

    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 3.5;
    ctx.stroke();
  }

  drawStar(0, -56, 5, 15, 7.5);

  // 4. Side Peak Pearl Spheres
  [-72, 72].forEach((px) => {
    ctx.beginPath();
    ctx.arc(px, -24, 6.5, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Specular highlight
    ctx.beginPath();
    ctx.arc(px - 2, -26, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
  });

  // 5. Glossy Crown Base Rim
  ctx.beginPath();
  ctx.moveTo(-54, 28);
  ctx.quadraticCurveTo(0, 36, 54, 28);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.stroke();

  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

/**
 * AvatarManager — High-Definition 3D Avatar Station Management:
 *  - 4 Avatars with 100% Pure White Built-in 3D Eyes
 *  - Smooth Dreamy Foggy Glow Aura & Top/Back Studio Lighting
 *  - Cute Cartoonish Floating Crown placed cleanly above head
 *  - Front avatar looks strictly straight forward with zero tilts
 *  - Background avatars look around and follow cursor randomly
 *  - Open mouth smile with pink tongue on focus
 */
export class AvatarManager {
  constructor(scene, camera, chambers) {
    this.scene = scene;
    this.camera = camera;
    this.chambers = chambers;
    this.avatars = [];
    this.mouseGaze = { x: 0, y: 0 };
    this.lastUserInteractionTime = performance.now();
    this.isDisposed = false;

    this.auraTexture = createCelestialAuraTexture();

    // Load pre-tinted textures preserving 100% pure white eyes
    const textureLoader = new THREE.TextureLoader();
    this.textures = [
      textureLoader.load('/avatar_green.webp'),
      textureLoader.load('/avatar_blue.webp'),
      textureLoader.load('/avatar_pink.webp'),
      textureLoader.load('/avatar_gold.webp'),
    ];
    this.textures.forEach((tex) => {
      tex.flipY = false;
      tex.colorSpace = THREE.SRGBColorSpace;
    });

    // Load custom tinted cartoon tilted crowns from user uploaded image
    this.crownTextures = [
      textureLoader.load('/crown_green.png'),
      textureLoader.load('/crown_blue.png'),
      textureLoader.load('/crown_pink.png'),
      textureLoader.load('/crown_gold.png'),
    ];
    this.crownTextures.forEach((tex) => {
      tex.flipY = true; // Upright orientation for 3D quad
      tex.colorSpace = THREE.SRGBColorSpace;
    });

    // Read saved per-avatar crown configs from localStorage if available
    const defaultConfigs = [
      { posX: -0.56, posY: 1.69, posZ: 0.58, size: 0.78, rotZ: 0.25, rotX: 0.0, rotY: 0.0 },
      { posX: -0.56, posY: 1.69, posZ: 0.58, size: 0.78, rotZ: 0.25, rotX: 0.0, rotY: 0.0 },
      { posX: -0.56, posY: 1.70, posZ: 0.66, size: 0.78, rotZ: 0.14, rotX: 0.0, rotY: 0.0 },
      { posX: -0.56, posY: 1.69, posZ: 0.44, size: 0.78, rotZ: 0.08, rotX: 0.0, rotY: 0.0 },
    ];
    let savedConfigs = defaultConfigs;
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('vedika_avatar_all_configs');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length === 4) {
            savedConfigs = parsed.map((item, idx) => ({ ...defaultConfigs[idx], ...(item.crown || item) }));
          }
        }
      } catch (e) {}
    }
    this.crownConfigs = savedConfigs;

    this.loader = new GLTFLoader();
    this._loadMasterModel();
  }

  _loadMasterModel() {
    this.loader.load(
      '/Physics-avatar-opt.glb',
      (gltf) => {
        if (this.isDisposed) return;
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

      // Normalize geometry size and center pivot
      const box = new THREE.Box3().setFromObject(cloneRoot);
      const center = box.getCenter(new THREE.Vector3());
      const sizeVec = box.getSize(new THREE.Vector3());

      cloneRoot.position.x -= center.x;
      cloneRoot.position.y -= center.y;
      cloneRoot.position.z -= center.z;

      const maxDim = Math.max(sizeVec.x, sizeVec.y, sizeVec.z);
      const baseScale = 2.4;
      if (maxDim > 0) {
        cloneRoot.scale.setScalar(baseScale / maxDim);
      }

      const themeColor = new THREE.Color(data.themeColor);

      cloneRoot.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material = child.material.clone();

          // Assign pre-tinted body texture preserving pure white eyes
          if (this.textures[idx]) {
            child.material.map = this.textures[idx];
          }
          child.material.color.set('#FFFFFF');
          child.material.roughness = 0.65;
          child.material.metalness = 0.05;
          bodyMaterials.push(child.material);
          child.material.needsUpdate = true;
        }
      });      // Dedicated soft studio and stage glow lighting for this avatar in its exact theme color
      const avatarGroup = new THREE.Group();

      // Dynamic 2D smile face plane (mouth only) attached to head
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

      const pivot = new THREE.Group();
      pivot.add(cloneRoot);
      pivot.add(facePlane);
      avatarGroup.add(pivot);

      // ── Inverted Mirrored 3D Avatar Reflection below Pedestal Disk ──
      const reflectionRoot = this.masterScene.clone(true);
      const reflectionMaterials = [];

      reflectionRoot.position.x -= center.x;
      reflectionRoot.position.y -= center.y;
      reflectionRoot.position.z -= center.z;
      if (maxDim > 0) {
        reflectionRoot.scale.setScalar(baseScale / maxDim);
      }

      const initialReflectionOpacity = initialWeight > 0.5 ? 0.20 : 0.09;

      reflectionRoot.traverse((child) => {
        if (child.isMesh && child.material) {
          const refMat = new THREE.MeshBasicMaterial({
            map: this.textures[idx] || null,
            color: new THREE.Color('#FFFFFF'),
            transparent: true,
            opacity: initialReflectionOpacity,
            depthWrite: false,
            side: THREE.DoubleSide,
          });

          // Soft vertical gradient shader falloff fading into the dark glossy floor
          refMat.onBeforeCompile = (shader) => {
            shader.vertexShader = `
              varying vec3 vReflWorldPos;
              ${shader.vertexShader}
            `.replace(
              '#include <worldpos_vertex>',
              `#include <worldpos_vertex>
               vReflWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`
            );

            shader.fragmentShader = `
              varying vec3 vReflWorldPos;
              ${shader.fragmentShader}
            `.replace(
              '#include <dithering_fragment>',
              `#include <dithering_fragment>
               // Soft gradient fade from disc plane down into the floor
               float floorFade = smoothstep(-2.85, -1.22, vReflWorldPos.y);
               gl_FragColor.a *= floorFade * floorFade;
               // Subtle floor tinting
               gl_FragColor.rgb *= (0.60 + 0.40 * floorFade);
              `
            );
            refMat.userData.shader = shader;
          };

          child.material = refMat;
          reflectionMaterials.push(refMat);
        }
      });

      // Mirrored face expression plane for reflection
      const reflectionFacePlane = new THREE.Mesh(
        new THREE.PlaneGeometry(2.3, 2.3),
        new THREE.MeshBasicMaterial({
          map: faceTexture,
          transparent: true,
          opacity: initialReflectionOpacity,
          depthWrite: false,
          side: THREE.DoubleSide,
        })
      );
      reflectionFacePlane.position.set(0, -0.08, 1.18);
      reflectionMaterials.push(reflectionFacePlane.material);

      const reflectionPivot = new THREE.Group();
      reflectionPivot.add(reflectionRoot);
      reflectionPivot.add(reflectionFacePlane);
      reflectionPivot.scale.set(
        THREE.MathUtils.lerp(0.85, 1.30, initialWeight),
        -THREE.MathUtils.lerp(0.85, 1.30, initialWeight),
        THREE.MathUtils.lerp(0.85, 1.30, initialWeight)
      );
      reflectionPivot.position.set(0, -2.40, 0);
      avatarGroup.add(reflectionPivot);

      // 1. [TEMPORARILY COMMENTED OUT] Background Glow Aura planes to test direct top LightRays downlight
      /*
      const outerAuraGeo = new THREE.PlaneGeometry(8.6, 8.6);
      const outerAuraMat = new THREE.MeshBasicMaterial({
        map: this.auraTexture,
        color: themeColor,
        transparent: true,
        opacity: initialWeight > 0.5 ? 0.70 : 0.04,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const outerAuraMesh = new THREE.Mesh(outerAuraGeo, outerAuraMat);
      outerAuraMesh.position.set(0, 0.35, -0.80);
      avatarGroup.add(outerAuraMesh);

      const innerAuraGeo = new THREE.PlaneGeometry(5.0, 5.0);
      const innerAuraMat = new THREE.MeshBasicMaterial({
        map: this.auraTexture,
        color: themeColor,
        transparent: true,
        opacity: initialWeight > 0.5 ? 0.88 : 0.06,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const innerAuraMesh = new THREE.Mesh(innerAuraGeo, innerAuraMat);
      innerAuraMesh.position.set(0, 0.35, -0.65);
      avatarGroup.add(innerAuraMesh);
      */

      // 2. Cute Cartoonish Crown (Oswald style - perched snugly on top-left curve of round head)
      const crownTex = this.crownTextures[idx] || this.crownTextures[0];
      const crownGeo = new THREE.PlaneGeometry(0.78, 0.78);
      const crownMat = new THREE.MeshBasicMaterial({
        map: crownTex,
        transparent: true,
        opacity: initialWeight > 0.5 ? 1.0 : 0.0,
        depthTest: false,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const crownMesh = new THREE.Mesh(crownGeo, crownMat);
      crownMesh.renderOrder = 1000;
      // Perched on the top-left curve of the head like Oswald's hat
      crownMesh.position.set(-0.56, 1.18, 0.58);
      crownMesh.rotation.z = 0.42;
      crownMesh.scale.setScalar(initialWeight > 0.5 ? 1.0 : 0.001);
      avatarGroup.add(crownMesh);

      // 3. Overhead Spotlight from Top (soft 3D illumination on top of avatar)
      const topSpotLight = new THREE.SpotLight(themeColor, initialWeight > 0.5 ? 4.5 : 0.3, 14, Math.PI / 3, 0.5);
      topSpotLight.position.set(0, 3.8, 0.6);
      topSpotLight.target = pivot;
      avatarGroup.add(topSpotLight);

      // 4. Back Halo Rim Light (creating radiant backlit silhouette around fur edges)
      const backHaloLight = new THREE.PointLight(themeColor, initialWeight > 0.5 ? 3.8 : 0.5, 10, 1.2);
      backHaloLight.position.set(0, 0.8, -1.8);
      avatarGroup.add(backHaloLight);

      // 5. Gentle Front Soft Fill
      const frontFillLight = new THREE.DirectionalLight(themeColor, initialWeight > 0.5 ? 0.7 : 0.25);
      frontFillLight.position.set(0, 1.2, 3.2);
      avatarGroup.add(frontFillLight);

      // Compact 3D Speech Bubble Tag (Visible for background buddies, smoothly fades out when focused)
      const tagCanvas = document.createElement('canvas');
      tagCanvas.width = 512;
      tagCanvas.height = 180;
      const tagCtx = tagCanvas.getContext('2d');

      const tagTexture = new THREE.CanvasTexture(tagCanvas);
      tagTexture.minFilter = THREE.LinearFilter;
      tagTexture.magFilter = THREE.LinearFilter;

      const tagMat = new THREE.MeshBasicMaterial({
        map: tagTexture,
        transparent: true,
        opacity: initialWeight > 0.5 ? 0.0 : 1.0,
        depthTest: false,
        depthWrite: false,
        side: THREE.DoubleSide,
      });

      const tagPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(2.6, 0.92),
        tagMat
      );
      tagPlane.renderOrder = 999;
      // Positioned cleanly above avatar head and forward
      tagPlane.position.set(0, 1.85, 0.35);
      avatarGroup.add(tagPlane);

      const avatarLocalY = 0.0;
      avatarGroup.position.set(0, avatarLocalY, 0.0);
      chamber.group.add(avatarGroup);

      pivot.scale.setScalar(THREE.MathUtils.lerp(0.85, 1.30, initialWeight));
      tagPlane.scale.setScalar(THREE.MathUtils.lerp(0.88, 1.20, initialWeight));

      // Initial render of tag and smile
      drawSpeechTag(tagCtx, data.name, data.themeColor, initialWeight > 0.5);
      tagTexture.needsUpdate = true;

      drawSmileLine(
        faceCtx,
        256,
        335,
        initialWeight > 0.5 ? 0.85 : 0.2,
        initialWeight > 0.5 ? 1.0 : 0.0,
        initialWeight > 0.5 ? 0.65 : 0.0
      );
      faceTexture.needsUpdate = true;

      this.avatars.push({
        id: chamber.id,
        index: idx,
        data,
        chamber,
        avatarGroup,
        pivot,
        reflectionPivot,
        reflectionMaterials,
        tagPlane,
        tagMat,
        crownMesh,
        crownMat,
        outerAuraMesh: null,
        outerAuraMat: null,
        innerAuraMesh: null,
        innerAuraMat: null,
        topSpotLight,
        backHaloLight,
        frontFillLight,
        baseY: avatarLocalY,
        eyeBones,
        bodyMaterials,
        faceCanvas,
        faceCtx,
        faceTexture,
        tagCanvas,
        tagCtx,
        tagTexture,
        focusWeight: initialWeight,
        prevIsFocused: initialWeight > 0.5,

        // Motion & Expression State
        rotX: 0, rotVX: 0,
        rotY: 0, rotVY: 0,
        rotZ: 0, rotVZ: 0,
        happyWeight: initialWeight > 0.5 ? 1.0 : 0.0, vHappy: 0,
        smileCurve: initialWeight > 0.5 ? 0.85 : 0.2, vSmile: 0,
        mouthOpen: initialWeight > 0.5 ? 0.65 : 0.0, vMouth: 0,
        frameTime: idx * 1.77,

        // Autonomous Look-around & Random Cursor Following for Background Buddies
        glanceYaw: (Math.random() - 0.5) * 0.3,
        glancePitch: (Math.random() - 0.5) * 0.15,
        glanceRoll: (Math.random() - 0.5) * 0.08,
        targetGlanceYaw: (Math.random() - 0.5) * 0.35,
        targetGlancePitch: (Math.random() - 0.45) * 0.18,
        targetGlanceRoll: (Math.random() - 0.5) * 0.08,
        glanceTimer: 0.8 + Math.random() * 2.0,
        cursorFollowWeight: 0.30 + Math.random() * 0.35,
        cursorPhaseLag: Math.random() * Math.PI * 2,
        wanderSpeed: 0.7 + Math.random() * 0.35,
        phaseOffset: idx * 2.13 + Math.random() * 0.6,
      });
    });
  }

  setMouseGaze(normX, normY) {
    this.mouseGaze.x = normX;
    this.mouseGaze.y = normY;
    this.lastUserInteractionTime = performance.now();
  }

  setFocusWeight(index, weight) {
    if (this.avatars[index]) {
      this.avatars[index].focusWeight = weight;
    }
  }

  setCrownConfig(avatarIndex, newConfig) {
    if (this.crownConfigs[avatarIndex]) {
      this.crownConfigs[avatarIndex] = { ...this.crownConfigs[avatarIndex], ...newConfig };
    }
    const av = this.avatars[avatarIndex];
    if (av && av.crownMesh) {
      const cfg = this.crownConfigs[avatarIndex];
      av.crownMesh.position.set(cfg.posX, cfg.posY, cfg.posZ);
      av.crownMesh.rotation.set(cfg.rotX || 0, cfg.rotY || 0, cfg.rotZ || 0);
    }
  }

  setAllCrownConfigs(configs) {
    if (!Array.isArray(configs)) return;
    this.crownConfigs = configs.map((c, idx) => ({
      ...(this.crownConfigs[idx] || {}),
      ...(c.crown || c),
    }));
  }

  update(time, dt) {
    if (this.avatars.length === 0) return;

    for (let i = 0; i < this.avatars.length; i++) {
      const av = this.avatars[i];
      av.frameTime += dt;
      const t = av.frameTime;
      const focusWeight = Math.max(0.0, Math.min(1.0, av.focusWeight || 0.0));
      const isFront = focusWeight > 0.5;

      // ── 1. Scale & Position of Avatar, Reflection, and 3D Tag ──
      const targetScale = THREE.MathUtils.lerp(0.85, 1.30, focusWeight);
      av.pivot.scale.setScalar(targetScale);

      // Proportionate inverted reflection scaling
      if (av.reflectionPivot) {
        av.reflectionPivot.scale.set(targetScale, -targetScale, targetScale);
      }

      const tagScale = THREE.MathUtils.lerp(0.88, 1.20, focusWeight);
      av.tagPlane.scale.setScalar(tagScale);

      // ── 2. [TEMPORARILY COMMENTED OUT] Celestial Back Glow Aura ──
      /*
      const pulse = isFront ? Math.sin(t * 1.8) * 0.04 : 0;
      if (av.outerAuraMat) {
        av.outerAuraMat.opacity = THREE.MathUtils.lerp(0.05, 0.68 + pulse, Math.pow(focusWeight, 1.3));
      }
      if (av.innerAuraMat) {
        av.innerAuraMat.opacity = THREE.MathUtils.lerp(0.06, 0.88 + pulse, Math.pow(focusWeight, 1.3));
      }
      if (av.outerAuraMesh) {
        av.outerAuraMesh.scale.setScalar(THREE.MathUtils.lerp(0.85, 1.35, focusWeight));
      }
      if (av.innerAuraMesh) {
        av.innerAuraMesh.scale.setScalar(THREE.MathUtils.lerp(0.85, 1.25, focusWeight));
      }
      */

      if (av.topSpotLight) {
        av.topSpotLight.intensity = THREE.MathUtils.lerp(0.3, 4.8, Math.pow(focusWeight, 1.4));
      }
      if (av.backHaloLight) {
        av.backHaloLight.intensity = THREE.MathUtils.lerp(0.5, 3.8, Math.pow(focusWeight, 1.4));
      }
      if (av.frontFillLight) {
        av.frontFillLight.intensity = THREE.MathUtils.lerp(0.25, 0.70, focusWeight);
      }

      av.bodyMaterials.forEach((mat) => {
        if ('emissive' in mat) {
          mat.emissive = av.data.themeColor ? new THREE.Color(av.data.themeColor) : mat.color;
          mat.emissiveIntensity = THREE.MathUtils.lerp(0.005, 0.20, focusWeight);
        }
        mat.roughness = THREE.MathUtils.lerp(0.72, 0.58, focusWeight);
      });

      // ── 3. Dynamic Smile & Open Mouth with Tongue on Focus ──
      const targetHappy = isFront ? 1.0 : 0.0;
      const targetSmile = isFront ? 0.85 : 0.2;
      const targetMouth = isFront ? 0.65 : 0.0;

      const [hw, hvw] = updateSpring(av.happyWeight, av.vHappy, targetHappy, 110, 14, dt);
      av.happyWeight = hw; av.vHappy = hvw;

      const [sc, vsc] = updateSpring(av.smileCurve, av.vSmile, targetSmile, 110, 14, dt);
      av.smileCurve = sc; av.vSmile = vsc;

      const [mo, vmo] = updateSpring(av.mouthOpen, av.vMouth, targetMouth, 110, 14, dt);
      av.mouthOpen = mo; av.vMouth = vmo;

      // ── 4. Organic Breathing Float & Synchronized Floor Reflection ──
      const breathFloat = Math.sin(t * 2.2) * (isFront ? 0.07 : 0.035);
      av.pivot.position.y = av.baseY + breathFloat;

      // Inverted mirrored reflection Y position (mirrors distance from the pedestal disk surface)
      if (av.reflectionPivot) {
        av.reflectionPivot.position.y = -2.40 - breathFloat;
      }

      // Smooth reflection opacity modulation based on focus state (light and delicate)
      const reflectionOpacity = THREE.MathUtils.lerp(0.09, 0.22, Math.pow(focusWeight, 1.2));
      if (av.reflectionMaterials) {
        av.reflectionMaterials.forEach((mat) => {
          mat.opacity = reflectionOpacity;
        });
      }

      // Floating Cute Cartoonish Crown (Controlled per avatar in real-time by FineTuner)
      if (av.crownMesh && av.crownMat) {
        const cfg = (this.crownConfigs && this.crownConfigs[i]) || { posX: -0.56, posY: 1.18, posZ: 0.58, size: 0.78, rotZ: 0.42, rotX: 0, rotY: 0 };
        av.crownMesh.position.x = cfg.posX;
        av.crownMesh.position.y = cfg.posY + breathFloat * 0.5 + Math.sin(t * 2.8) * 0.02;
        av.crownMesh.position.z = cfg.posZ;
        av.crownMesh.rotation.x = cfg.rotX || 0;
        av.crownMesh.rotation.y = cfg.rotY || 0;
        av.crownMesh.rotation.z = (cfg.rotZ || 0) + Math.sin(t * 2.0) * 0.015;
        av.crownMat.opacity = THREE.MathUtils.lerp(0.0, 1.0, Math.pow(focusWeight, 2.2));
        av.crownMesh.scale.setScalar(THREE.MathUtils.lerp(0.001, cfg.size || 0.78, focusWeight));
        av.crownMesh.visible = av.crownMat.opacity > 0.01;
      }

      // Position tag cleanly above the avatar's head, forward in Z (fades out when front avatar is focused)
      const tagY = THREE.MathUtils.lerp(1.75, 2.25, focusWeight) + breathFloat * 0.5;
      const tagZ = THREE.MathUtils.lerp(0.35, 0.95, focusWeight);
      av.tagPlane.position.set(0, tagY, tagZ);

      if (av.tagMat && av.tagPlane) {
        av.tagMat.opacity = THREE.MathUtils.lerp(1.0, 0.0, Math.pow(focusWeight, 1.4));
        av.tagPlane.visible = av.tagMat.opacity > 0.01;
      }

      // ── 5. Rotation Logic:
      // Avatar coming front / at front: Strictly looking STRAIGHT FORWARD along +Z axis with ZERO head tilts
      // Remaining background avatars: Look around organically and randomly follow/react to cursor.
      let targetYaw = 0;
      let targetPitch = 0;
      let targetRoll = 0;

      // When an avatar is coming front (focusWeight rising), bgFactor quickly drops to 0
      // So all wander and head tilts immediately straighten out into pure straight forward
      const bgFactor = Math.max(0.0, 1.0 - focusWeight * 3.0);

      if (bgFactor > 0.001) {
        // Update autonomous glance timer for background avatars
        av.glanceTimer -= dt;
        if (av.glanceTimer <= 0) {
          av.glanceTimer = 1.6 + Math.random() * 2.4;
          // Random subtle glance direction (left/right, up/down, tilt)
          av.targetGlanceYaw = (Math.random() - 0.5) * 0.45;
          av.targetGlancePitch = (Math.random() - 0.45) * 0.25;
          av.targetGlanceRoll = (Math.random() - 0.5) * 0.10;
        }

        // Smoothly interpolate towards current random glance target
        const glanceLerpSpeed = dt * 2.5;
        av.glanceYaw += (av.targetGlanceYaw - av.glanceYaw) * glanceLerpSpeed;
        av.glancePitch += (av.targetGlancePitch - av.glancePitch) * glanceLerpSpeed;
        av.glanceRoll += (av.targetGlanceRoll - av.glanceRoll) * glanceLerpSpeed;

        // Continuous organic harmonic look-around waves
        const wanderTime = t * av.wanderSpeed + av.phaseOffset;
        const waveYaw = Math.sin(wanderTime * 0.75) * 0.15 + Math.cos(wanderTime * 0.4) * 0.06;
        const wavePitch = Math.sin(wanderTime * 0.6) * 0.08 - 0.02;
        const waveRoll = Math.cos(wanderTime * 0.48) * 0.03;

        // Random cursor reaction / tracking for background buddies
        const cursorYaw = (this.mouseGaze.x * 0.28 + Math.sin(wanderTime * 0.3 + av.cursorPhaseLag) * 0.07) * av.cursorFollowWeight;
        const cursorPitch = (-this.mouseGaze.y * 0.18 + Math.cos(wanderTime * 0.35 + av.cursorPhaseLag) * 0.04) * av.cursorFollowWeight;
        const cursorRoll = (this.mouseGaze.x * 0.04) * av.cursorFollowWeight;

        // Combine wander, autonomous glance, and random cursor tracking
        const totalBgYaw = waveYaw + av.glanceYaw + cursorYaw;
        const totalBgPitch = wavePitch + av.glancePitch + cursorPitch;
        const totalBgRoll = waveRoll + av.glanceRoll + cursorRoll;

        targetYaw = totalBgYaw * bgFactor;
        targetPitch = totalBgPitch * bgFactor;
        targetRoll = totalBgRoll * bgFactor;
      } else {
        // Front focused avatar: 100% straight forward along Z-axis, NO tilt, NO yaw angle, looking directly straight ahead
        targetYaw = 0;
        targetPitch = 0;
        targetRoll = 0;
      }

      // Critically damped spring physics for responsive and silky smooth head alignment
      const springStiffness = focusWeight > 0.05 ? 160 : 85;
      const springDamping = focusWeight > 0.05 ? 18 : 12;

      const [rx, rvx] = updateSpring(av.rotX, av.rotVX, targetPitch, springStiffness, springDamping, dt);
      const [ry, rvy] = updateSpring(av.rotY, av.rotVY, targetYaw, springStiffness, springDamping, dt);
      const [rz, rvz] = updateSpring(av.rotZ, av.rotVZ, targetRoll, springStiffness, springDamping, dt);
      av.rotX = rx; av.rotVX = rvx;
      av.rotY = ry; av.rotVY = rvy;
      av.rotZ = rz; av.rotVZ = rvz;

      av.pivot.rotation.x = av.rotX;
      av.pivot.rotation.y = av.rotY;
      av.pivot.rotation.z = -av.rotZ;

      // Synchronize floor reflection head pose
      if (av.reflectionPivot) {
        av.reflectionPivot.rotation.x = -av.rotX;
        av.reflectionPivot.rotation.y = av.rotY;
        av.reflectionPivot.rotation.z = av.rotZ;
      }

      // ── 6. Render Dynamic Smile (Open Mouth with Tongue on Focus) ──
      if (av.faceCtx && av.faceTexture) {
        av.faceCtx.clearRect(0, 0, 512, 512);
        drawSmileLine(av.faceCtx, 256, 335, av.smileCurve, av.happyWeight, av.mouthOpen);
        av.faceTexture.needsUpdate = true;
      }

      // ── 7. Render Crisp 3D Speech Tag on focus change ──
      if (av.prevIsFocused !== isFront && av.tagCtx && av.tagTexture) {
        av.prevIsFocused = isFront;
        drawSpeechTag(av.tagCtx, av.data.name, av.data.themeColor, isFront);
        av.tagTexture.needsUpdate = true;
      }
    }
  }

  getHitAvatarIndex(raycaster) {
    if (!this.avatars || this.avatars.length === 0) return -1;
    for (let i = 0; i < this.avatars.length; i++) {
      const av = this.avatars[i];
      const intersects = raycaster.intersectObject(av.chamber.group, true);
      if (intersects.length > 0) {
        return av.index;
      }
    }
    return -1;
  }

  dispose() {
    this.isDisposed = true;
    this.avatars.forEach((av) => {
      if (av.avatarGroup && av.avatarGroup.parent) {
        av.avatarGroup.parent.remove(av.avatarGroup);
      }
      if (av.faceTexture) av.faceTexture.dispose();
      if (av.tagTexture) av.tagTexture.dispose();
      av.avatarGroup.traverse((child) => {
        if (child.isMesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((m) => m.dispose());
            } else {
              child.material.dispose();
            }
          }
        }
      });
    });
    this.textures.forEach((tex) => tex.dispose());
    this.avatars = [];
  }
}
