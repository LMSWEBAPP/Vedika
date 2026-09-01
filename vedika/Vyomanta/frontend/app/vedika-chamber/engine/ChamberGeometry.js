import * as THREE from 'three';

/**
 * 4 Fixed Horizontal Slot X coordinates:
 * Balanced spacing with generous gaps between companions and safe margin from carousel arrows:
 *  - 0 (Teal):   X = -6.2 -> Ask Vedika
 *  - 1 (Purple): X = -2.1 -> Code with Vedika
 *  - 2 (Blue):   X = +2.1 -> Code Puzzles
 *  - 3 (Ruby):   X = +6.2 -> Viva and Interview
 */
const SLOT_X = [-6.2, -2.1, 2.1, 6.2];

export const CHAMBERS_DATA = [
  {
    id: 'ask',
    index: 0,
    name: 'Ask Vedika',
    subtitle: 'Your curious learning buddy',
    route: '/vedika-ai',
    colorHex: '#29756e', // User Specified Deep Teal Cyan
    bodyColor: '#29756e',
    themeColor: '#29756e',
    emissiveHex: '#14403c',
    lightColor: '#5eead4',
  },
  {
    id: 'code',
    index: 1,
    name: 'Code with Vedika',
    subtitle: 'Your AI pair programmer & coding mentor',
    route: '/vedika-ai',
    colorHex: '#34187b', // User Specified Deep Indigo Violet
    bodyColor: '#34187b',
    themeColor: '#34187b',
    emissiveHex: '#190a40',
    lightColor: '#c084fc',
  },
  {
    id: 'puzzles',
    index: 2,
    name: 'Code Puzzles',
    subtitle: 'Interactive logic & algorithmic challenges',
    route: '/vedika-ai',
    colorHex: '#1b4e83', // User Specified Royal Sky Blue
    bodyColor: '#1b4e83',
    themeColor: '#1b4e83',
    emissiveHex: '#0c2744',
    lightColor: '#60a5fa',
  },
  {
    id: 'viva',
    index: 3,
    name: 'Viva and Interview',
    subtitle: 'Real-time voice & technical mock interviews',
    route: '/vedika-ai',
    colorHex: '#761845', // User Specified Deep Ruby Berry
    bodyColor: '#761845',
    themeColor: '#761845',
    emissiveHex: '#3d0a23',
    lightColor: '#f472b6',
  },
];

function createGlossyFloorTexture() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createRadialGradient(256, 256, 10, 256, 256, 256);
  gradient.addColorStop(0.0, 'rgba(255, 255, 255, 0.85)');
  gradient.addColorStop(0.22, 'rgba(255, 255, 255, 0.50)');
  gradient.addColorStop(0.55, 'rgba(255, 255, 255, 0.15)');
  gradient.addColorStop(0.80, 'rgba(255, 255, 255, 0.03)');
  gradient.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

let sharedFloorTexture = null;
function getSharedFloorTexture() {
  if (!sharedFloorTexture) {
    sharedFloorTexture = createGlossyFloorTexture();
  }
  return sharedFloorTexture;
}

export class Chamber {
  constructor({ id, index, name, colorHex, emissiveHex, lightColor }) {
    this.id = id;
    this.index = index;
    this.name = name;
    this.primaryColor = new THREE.Color(colorHex);
    this.emissiveColor = new THREE.Color(emissiveHex);
    this.lightColor = new THREE.Color(lightColor || colorHex);

    this.slotX = SLOT_X[index];
    this.backY = -0.35;
    this.backZ = -2.0;

    this.frontY = -0.1;
    this.frontZ = 1.0;

    this.group = new THREE.Group();

    // ── Solid Premium 3D Circular Metallic Pedestal & Neon Ring ──
    this._createCircularPedestal();

    this.setFocusState(index === 0 ? 1.0 : 0.0);
  }

  _createCircularPedestal() {
    this.pedestalGroup = new THREE.Group();

    // 1. High-Definition Photorealistic Disk from user uploaded image
    const textureLoader = new THREE.TextureLoader();
    this.diskTexture = textureLoader.load(`/disk_${this.index}.png`);
    this.diskTexture.colorSpace = THREE.SRGBColorSpace;

    const diskWidth = 3.90;
    const diskHeight = diskWidth / 3.698; // ~1.055
    const diskGeo = new THREE.PlaneGeometry(diskWidth, diskHeight);
    this.diskMat = new THREE.MeshBasicMaterial({
      map: this.diskTexture,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.diskMesh = new THREE.Mesh(diskGeo, this.diskMat);
    // Align so the dark top plinth sits right below the avatar's base (y = -1.05)
    this.diskMesh.position.set(0, -1.22, 0.20);
    this.pedestalGroup.add(this.diskMesh);

    // 2. Direct Emissive Neon Glow Pool on the floor
    const haloGeo = new THREE.RingGeometry(1.25, 1.95, 64);
    haloGeo.rotateX(-Math.PI / 2);
    this.haloMat = new THREE.MeshBasicMaterial({
      color: this.primaryColor,
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.haloMesh = new THREE.Mesh(haloGeo, this.haloMat);
    this.haloMesh.position.y = -1.26;
    this.pedestalGroup.add(this.haloMesh);

    // 3. Soft glossy dark floor reflection pool directly below disc
    const poolGeo = new THREE.PlaneGeometry(3.8, 3.0);
    poolGeo.rotateX(-Math.PI / 2);
    this.poolMat = new THREE.MeshBasicMaterial({
      map: getSharedFloorTexture(),
      color: this.primaryColor,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.poolMesh = new THREE.Mesh(poolGeo, this.poolMat);
    this.poolMesh.position.set(0, -1.28, 0.28);
    this.pedestalGroup.add(this.poolMesh);

    this.group.add(this.pedestalGroup);
  }

  setFocusState(weight) {
    const w = Math.max(0.0, Math.min(1.0, weight));
    const targetX = this.slotX;
    const targetY = THREE.MathUtils.lerp(this.backY, this.frontY, w);
    const targetZ = THREE.MathUtils.lerp(this.backZ, this.frontZ, w);

    this.group.position.set(targetX, targetY, targetZ);

    const pedScale = THREE.MathUtils.lerp(0.85, 1.22, w);
    if (this.pedestalGroup) {
      this.pedestalGroup.scale.setScalar(pedScale);
    }

    if (this.diskMat) {
      this.diskMat.opacity = THREE.MathUtils.lerp(0.88, 1.0, w);
    }

    // Floor halo
    if (this.haloMat) {
      this.haloMat.opacity = THREE.MathUtils.lerp(0.08, 0.45, w);
    }

    // Glossy floor pool reflection
    if (this.poolMat) {
      this.poolMat.opacity = THREE.MathUtils.lerp(0.08, 0.28, w);
    }
  }

  update(time) {
    // Optional pedestal animations
  }

  dispose() {
    this.group.traverse((child) => {
      if (child.isMesh || child.isLight) {
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
  }
}

export function createChamberStations() {
  return CHAMBERS_DATA.map((d) => new Chamber(d));
}

export const createChamberTrio = createChamberStations;
