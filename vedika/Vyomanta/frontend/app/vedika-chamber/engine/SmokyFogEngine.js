import * as THREE from 'three';

/**
 * Creates an organic, multi-layer Gaussian smoke puff texture.
 */
function createSmokyFogPuffTexture() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Outer smooth radial falloff
  const grad = ctx.createRadialGradient(128, 128, 8, 128, 128, 124);
  grad.addColorStop(0.0, 'rgba(255, 255, 255, 0.95)');
  grad.addColorStop(0.20, 'rgba(250, 252, 255, 0.70)');
  grad.addColorStop(0.45, 'rgba(240, 245, 255, 0.35)');
  grad.addColorStop(0.70, 'rgba(230, 240, 255, 0.10)');
  grad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  // Soft internal cloud turbulence
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  for (let i = 0; i < 5; i++) {
    const ox = 128 + (Math.sin(i * 1.5) * 32);
    const oy = 128 + (Math.cos(i * 1.8) * 28);
    const r = 40 + (i * 8);
    const pGrad = ctx.createRadialGradient(ox, oy, 4, ox, oy, r);
    pGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.25)');
    pGrad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = pGrad;
    ctx.beginPath();
    ctx.arc(ox, oy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

let sharedPuffTexture = null;
function getSharedPuffTexture() {
  if (!sharedPuffTexture) {
    sharedPuffTexture = createSmokyFogPuffTexture();
  }
  return sharedPuffTexture;
}

/**
 * SmokyFogEngine — Generates a flowy, smoky, volumetric fog layer
 * directly below and around the chamber pedestals/disks.
 */
export class SmokyFogEngine {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'ChamberSmokyFog';

    this.puffs = [];
    this.tintColor = new THREE.Color(0xa5b4fc); // Soft celestial blue/purple base
    this.targetTintColor = new THREE.Color(0xa5b4fc);

    this._buildFloorFogStream();
    this.scene.add(this.group);
  }

  _buildFloorFogStream() {
    const puffTex = getSharedPuffTexture();
    if (!puffTex) return;

    const count = 38; // 38 flowing volumetric smoke clouds spanning stage bottom
    const puffGeo = new THREE.PlaneGeometry(1, 1);

    for (let i = 0; i < count; i++) {
      const baseOpacity = 0.08 + (Math.random() * 0.10); // Very lite ethereal fog (8% - 18%)
      const mat = new THREE.MeshBasicMaterial({
        map: puffTex,
        color: this.tintColor,
        transparent: true,
        opacity: baseOpacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });

      const mesh = new THREE.Mesh(puffGeo, mat);

      // Distribute evenly across X from -10.5 to +10.5
      const spanProgress = i / count;
      const x = -10.5 + spanProgress * 21.0 + (Math.random() - 0.5) * 1.2;
      // Below the disks (disks sit at y = -1.22; fog hovers at y = -1.35 to -1.62)
      const y = -1.36 - Math.random() * 0.24;
      // Depth staggered around the disks (-2.2 to +1.8)
      const z = -2.0 + Math.random() * 3.6;

      mesh.position.set(x, y, z);

      // Width 2.8 to 4.6 for wide, billowy, floating smoke clouds
      const sx = 2.8 + Math.random() * 1.8;
      const sy = 1.1 + Math.random() * 0.8;
      mesh.scale.set(sx, sy, 1.0);

      this.group.add(mesh);

      this.puffs.push({
        mesh,
        mat,
        baseX: x,
        baseY: y,
        baseZ: z,
        scaleX: sx,
        scaleY: sy,
        baseOpacity,
        speedX: 0.12 + Math.random() * 0.16, // Continuous rightward drift
        waveFreq: 0.6 + Math.random() * 0.5,
        waveAmpY: 0.03 + Math.random() * 0.04,
        rotSpeed: (Math.random() - 0.5) * 0.04,
        phase: Math.random() * Math.PI * 2,
      });
    }

    // Wide Ground Mist Underlayer (Continuous smooth rolling bed of fog)
    const groundGeo = new THREE.PlaneGeometry(24.0, 5.5);
    const groundMat = new THREE.MeshBasicMaterial({
      map: puffTex,
      color: new THREE.Color(0x6366f1),
      transparent: true,
      opacity: 0.09,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.groundPlane = new THREE.Mesh(groundGeo, groundMat);
    this.groundPlane.position.set(0, -1.54, 0.4);
    this.groundPlane.rotation.x = -0.15; // Tilted slightly toward camera
    this.group.add(this.groundPlane);
  }

  setCompanionColor(colorHex) {
    if (!colorHex) return;
    this.targetTintColor.set(colorHex);
  }

  update(time, dt) {
    // Smoothly transition smoke tint toward current companion color
    this.tintColor.lerp(this.targetTintColor, 0.04);

    // Update individual smoke billows
    const boundMinX = -11.0;
    const boundMaxX = 11.0;
    const span = boundMaxX - boundMinX;

    for (let i = 0; i < this.puffs.length; i++) {
      const p = this.puffs[i];
      p.mat.color.copy(this.tintColor);

      // Drift horizontally with flow
      p.baseX += p.speedX * dt;
      if (p.baseX > boundMaxX) {
        p.baseX -= span;
      }

      // Organic sinusoidal floating & billowing
      const curY = p.baseY + Math.sin(time * p.waveFreq + p.phase) * p.waveAmpY;
      const curZ = p.baseZ + Math.cos(time * (p.waveFreq * 0.7) + p.phase) * 0.08;
      p.mesh.position.set(p.baseX, curY, curZ);

      // Subtle breathing scale
      const breathe = 1.0 + Math.sin(time * 0.8 + p.phase) * 0.06;
      p.mesh.scale.set(p.scaleX * breathe, p.scaleY * breathe, 1.0);

      // Gentle rotation of the smoke wisps
      p.mesh.rotation.z += p.rotSpeed * dt;

      // Soft opacity pulsation
      p.mat.opacity = p.baseOpacity * (0.88 + Math.sin(time * 1.1 + p.phase) * 0.18);
    }

    // Ground bed subtle breathing
    if (this.groundPlane) {
      this.groundPlane.material.color.lerp(this.targetTintColor, 0.03);
      this.groundPlane.material.opacity = 0.08 + Math.sin(time * 0.5) * 0.025;
      this.groundPlane.position.x = Math.sin(time * 0.25) * 0.45;
    }
  }

  dispose() {
    this.group.traverse((child) => {
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
    this.scene.remove(this.group);
  }
}
