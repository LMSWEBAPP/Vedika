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
 * AvatarManager — High-Definition 3D Avatar Station Management:
 *  - 4 Avatars with 100% Pure White Built-in 3D Eyes
 *  - Dotted lines removed from tags, compact sleek pill size
 *  - Front avatar is primarily direct front-facing
 *  - After 5 seconds of user inactivity/idle, avatar randomly & naturally moves face/wanders
 *  - Open mouth smile with pink tongue on focus
 */
export class AvatarManager {
  constructor(scene, chambers) {
    this.scene = scene;
    this.chambers = chambers;
    this.avatars = [];
    this.mouseGaze = { x: 0, y: 0 };
    this.lastUserInteractionTime = performance.now();
    this.isDisposed = false;

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
      });

      // Dedicated soft studio lighting for this avatar
      const avatarGroup = new THREE.Group();

      const rimLight = new THREE.PointLight(themeColor, 1.4, 12);
      rimLight.position.set(2.5, 2.5, -2);
      avatarGroup.add(rimLight);

      const fillLight = new THREE.DirectionalLight(themeColor, 0.7);
      fillLight.position.set(-2.5, -1.5, 2.5);
      avatarGroup.add(fillLight);

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

      // Compact 3D Speech Bubble Tag (No dotted lines, sleek size)
      const tagCanvas = document.createElement('canvas');
      tagCanvas.width = 512;
      tagCanvas.height = 180;
      const tagCtx = tagCanvas.getContext('2d');

      const tagTexture = new THREE.CanvasTexture(tagCanvas);
      tagTexture.minFilter = THREE.LinearFilter;
      tagTexture.magFilter = THREE.LinearFilter;

      const tagPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(2.5, 0.88),
        new THREE.MeshBasicMaterial({
          map: tagTexture,
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide,
        })
      );
      // Positioned cleanly above avatar head
      tagPlane.position.set(0, 1.45, 0.05);
      avatarGroup.add(tagPlane);

      const avatarLocalY = 0.0;
      avatarGroup.position.set(0, avatarLocalY, 0.0);
      chamber.group.add(avatarGroup);

      const initialWeight = idx === 0 ? 1.0 : 0.0;
      pivot.scale.setScalar(THREE.MathUtils.lerp(0.85, 1.30, initialWeight));
      tagPlane.scale.setScalar(THREE.MathUtils.lerp(0.88, 1.15, initialWeight));

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
        tagPlane,
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
        frameTime: idx * 1.5,
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

  update(time, dt) {
    if (this.avatars.length === 0) return;

    const idleSeconds = (performance.now() - this.lastUserInteractionTime) / 1000;
    const isIdle = idleSeconds > 5.0; // Idle after 5 seconds of no cursor motion

    for (let i = 0; i < this.avatars.length; i++) {
      const av = this.avatars[i];
      av.frameTime += dt;
      const t = av.frameTime;
      const focusWeight = Math.max(0.0, Math.min(1.0, av.focusWeight || 0.0));
      const isFront = focusWeight > 0.5;

      // ── 1. Scale: Avatar and 3D Tag scale smoothly in exact sync ──
      const targetScale = THREE.MathUtils.lerp(0.85, 1.30, focusWeight);
      av.pivot.scale.setScalar(targetScale);

      const tagScale = THREE.MathUtils.lerp(0.88, 1.15, focusWeight);
      av.tagPlane.scale.setScalar(tagScale);

      // ── 2. Clean Natural Fur Texture ──
      av.bodyMaterials.forEach((mat) => {
        if ('emissive' in mat) {
          mat.emissiveIntensity = THREE.MathUtils.lerp(0.005, 0.02, focusWeight);
        }
        mat.roughness = THREE.MathUtils.lerp(0.72, 0.66, focusWeight);
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

      // ── 4. Front-Facing Orientation & 5s Autonomous Idle Head Movement ──
      let targetYaw = 0;
      let targetPitch = 0;
      let targetRoll = 0;

      if (isIdle) {
        // After 5 seconds idle: smooth organic procedural wandering / head looking around
        const idleCycle = t * 0.85;
        targetYaw = Math.sin(idleCycle) * 0.28 + Math.sin(idleCycle * 0.45) * 0.12;
        targetPitch = Math.cos(idleCycle * 0.7) * 0.10 - 0.04;
        targetRoll = Math.sin(idleCycle * 0.5) * 0.04;
      } else {
        // User is active: Front avatar looks straight forward (confident front-facing)
        if (isFront) {
          targetYaw = this.mouseGaze.x * 0.08; // Very subtle, primarily front facing
          targetPitch = -this.mouseGaze.y * 0.06;
          targetRoll = (this.mouseGaze.x / 100) * 0.02;
        } else {
          targetYaw = 0;
          targetPitch = 0;
          targetRoll = 0;
        }
      }

      const [rx, rvx] = updateSpring(av.rotX, av.rotVX, targetPitch, 100, 14, dt);
      const [ry, rvy] = updateSpring(av.rotY, av.rotVY, targetYaw, 100, 14, dt);
      const [rz, rvz] = updateSpring(av.rotZ, av.rotVZ, targetRoll, 100, 14, dt);
      av.rotX = rx; av.rotVX = rvx;
      av.rotY = ry; av.rotVY = rvy;
      av.rotZ = rz; av.rotVZ = rvz;

      av.pivot.rotation.x = av.rotX;
      av.pivot.rotation.y = av.rotY;
      av.pivot.rotation.z = -av.rotZ;

      // ── 5. Organic Breathing Float ──
      const breathFloat = Math.sin(t * 2.2) * (isFront ? 0.07 : 0.035);
      av.pivot.position.y = av.baseY + breathFloat;

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
