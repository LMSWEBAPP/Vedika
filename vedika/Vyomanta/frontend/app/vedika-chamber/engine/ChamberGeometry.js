import * as THREE from 'three';

/**
 * 4 Fixed Horizontal Slot X coordinates:
 *  - 0 (Green):   X = -5.8 -> Ask Vedika
 *  - 1 (Blue):    X = -1.9 -> Code with Vedika
 *  - 2 (Pink):    X = +1.9 -> Code Puzzles
 *  - 3 (Gold):    X = +5.8 -> Viva and Interview
 */
const SLOT_X = [-5.8, -1.9, 1.9, 5.8];

export const CHAMBERS_DATA = [
  {
    id: 'ask',
    index: 0,
    name: 'Ask Vedika',
    subtitle: 'Your curious learning buddy',
    route: '/vedika-ai',
    colorHex: '#10B981', // Distinct Rich Emerald Green
    bodyColor: '#10B981',
    themeColor: '#10B981',
    emissiveHex: '#047857',
    lightColor: '#6ee7b7',
  },
  {
    id: 'code',
    index: 1,
    name: 'Code with Vedika',
    subtitle: 'Your AI pair programmer & coding mentor',
    route: '/vedika-ai',
    colorHex: '#0284C7', // Distinct Rich Sky Blue
    bodyColor: '#0284C7',
    themeColor: '#0284C7',
    emissiveHex: '#0369A1',
    lightColor: '#7dd3fc',
  },
  {
    id: 'puzzles',
    index: 2,
    name: 'Code Puzzles',
    subtitle: 'Interactive logic & algorithmic challenges',
    route: '/vedika-ai',
    colorHex: '#DB2777', // Distinct Rich Magenta Pink
    bodyColor: '#DB2777',
    themeColor: '#DB2777',
    emissiveHex: '#9d174d',
    lightColor: '#f472b6',
  },
  {
    id: 'viva',
    index: 3,
    name: 'Viva and Interview',
    subtitle: 'Real-time voice & technical mock interviews',
    route: '/vedika-ai',
    colorHex: '#D97706', // Distinct Rich Warm Amber Gold
    bodyColor: '#D97706',
    themeColor: '#D97706',
    emissiveHex: '#92400e',
    lightColor: '#fcd34d',
  },
];

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

    // ── 3D Circular Metallic Pedestal & Neon Ring ──
    this._createCircularPedestal();

    this.setFocusState(index === 0 ? 1.0 : 0.0);
  }

  _createCircularPedestal() {
    this.pedestalGroup = new THREE.Group();

    // 1. Dark sleek circular metallic cylinder disc
    const discGeo = new THREE.CylinderGeometry(1.35, 1.40, 0.12, 64);
    const discMat = new THREE.MeshStandardMaterial({
      color: 0x12131e,
      roughness: 0.35,
      metalness: 0.8,
    });
    const discMesh = new THREE.Mesh(discGeo, discMat);
    discMesh.position.y = -1.20;
    this.pedestalGroup.add(discMesh);

    // 2. Vibrant Glowing Neon Ring around the disc rim
    const ringGeo = new THREE.TorusGeometry(1.39, 0.038, 24, 64);
    ringGeo.rotateX(Math.PI / 2);
    this.ringMat = new THREE.MeshStandardMaterial({
      color: this.primaryColor,
      emissive: this.primaryColor,
      emissiveIntensity: 1.0,
      roughness: 0.15,
      metalness: 0.1,
    });
    this.ringMesh = new THREE.Mesh(ringGeo, this.ringMat);
    this.ringMesh.position.y = -1.14;
    this.pedestalGroup.add(this.ringMesh);

    // 3. Subtle floor reflection ring beneath pedestal
    const haloGeo = new THREE.RingGeometry(1.28, 1.85, 64);
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
    this.haloMesh.position.y = -1.22;
    this.pedestalGroup.add(this.haloMesh);

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

    // Neon Ring: Clean bright emissive intensity on focus
    if (this.ringMat) {
      this.ringMat.emissiveIntensity = THREE.MathUtils.lerp(0.8, 3.2, Math.pow(w, 1.2));
    }

    // Floor halo
    if (this.haloMat) {
      this.haloMat.opacity = THREE.MathUtils.lerp(0.08, 0.45, w);
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
