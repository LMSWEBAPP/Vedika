import * as THREE from 'three';
import { PointCloudParticleShader } from './Shaders';

/**
 * ParticleSystemEngine — Neural Network / Constellation Particle System
 *
 * Matches the reference image style:
 *  - Tiny glowing particle dots as the MAIN visual effect
 *  - Thin connecting lines between nearby particles (constellation/neural network graph)
 *  - Particles concentrated around chambers, avatars, and energy paths
 *  - Sparse particles in the background forming web-like structures
 *  - Autonomous continuous 60 FPS animation
 *  - Coordinated vertical energy flow inside chambers
 */

export class ParticleSystemEngine {
  constructor(scene, chambers) {
    this.scene = scene;
    this.chambers = chambers;
    this.uniforms = THREE.UniformsUtils.clone(PointCloudParticleShader.uniforms);

    this.totalParticles = 3200;
    this.connectionDistance = 1.8; // Max distance to draw a connection line
    this.connectionDistanceSq = this.connectionDistance * this.connectionDistance;

    this._initParticles();
    this._initConnectionLines();
  }

  _initParticles() {
    const count = this.totalParticles;

    this.positionArray = new Float32Array(count * 3);
    this.colorArray = new Float32Array(count * 3);
    this.sizeArray = new Float32Array(count);
    this.alphaArray = new Float32Array(count);
    this.phaseArray = new Float32Array(count);
    this.typeArray = new Float32Array(count);

    // Store base positions for CPU-side connection calculation
    this.basePositions = new Float32Array(count * 3);

    const cMagenta = new THREE.Color('#D946EF');
    const cPink = new THREE.Color('#F472B6');
    const cBlue = new THREE.Color('#0EA5E9');
    const cCyan = new THREE.Color('#38BDF8');
    const cLime = new THREE.Color('#84CC16');
    const cGold = new THREE.Color('#EAB308');
    const cDimStar = new THREE.Color('#475569');

    const chamberColors = [
      [cMagenta, cPink],
      [cBlue, cCyan],
      [cLime, cGold],
    ];

    // Track which particles belong to which chamber for connection coloring
    this.particleChamberIdx = new Int8Array(count);
    this.particleChamberIdx.fill(-1);

    let idx = 0;

    // ── Pop 0: Background Ambient Stars (450 tiny distant stars) ──
    const pop0Count = 450;
    for (let i = 0; i < pop0Count; i++, idx++) {
      this.positionArray[idx * 3 + 0] = (Math.random() - 0.5) * 34;
      this.positionArray[idx * 3 + 1] = (Math.random() - 0.5) * 18;
      this.positionArray[idx * 3 + 2] = -5 - Math.random() * 16;

      this.colorArray[idx * 3 + 0] = cDimStar.r;
      this.colorArray[idx * 3 + 1] = cDimStar.g;
      this.colorArray[idx * 3 + 2] = cDimStar.b;

      this.sizeArray[idx] = 0.18 + Math.random() * 0.2;
      this.alphaArray[idx] = 0.2 + Math.random() * 0.3;
      this.phaseArray[idx] = Math.random() * Math.PI * 2;
      this.typeArray[idx] = 0.0;
    }

    // ── Pop 1: Chamber Interior Vortex Particles (1500 = 500 per chamber) ──
    const pop1PerChamber = 500;
    this.chambers.forEach((chamber, cIdx) => {
      const pCol = chamberColors[cIdx];
      const cx = chamber.position.x;
      const cy = chamber.position.y;
      const cz = chamber.position.z;

      for (let i = 0; i < pop1PerChamber; i++, idx++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 1.1;
        const h = Math.random() * 4.4 + 0.2;

        this.positionArray[idx * 3 + 0] = cx + Math.cos(angle) * radius;
        this.positionArray[idx * 3 + 1] = cy + h;
        this.positionArray[idx * 3 + 2] = cz + Math.sin(angle) * radius;

        const pick = pCol[Math.floor(Math.random() * pCol.length)];
        this.colorArray[idx * 3 + 0] = pick.r;
        this.colorArray[idx * 3 + 1] = pick.g;
        this.colorArray[idx * 3 + 2] = pick.b;

        const isTiny = Math.random() > 0.15;
        this.sizeArray[idx] = isTiny ? 0.25 + Math.random() * 0.2 : 0.5 + Math.random() * 0.3;
        this.alphaArray[idx] = 0.4 + Math.random() * 0.4;
        this.phaseArray[idx] = Math.random() * 4.4;
        this.typeArray[idx] = 1.0;
        this.particleChamberIdx[idx] = cIdx;
      }
    });

    // ── Pop 2: Energy Stream Conduits (550 particles) ──
    const pop2Count = 550;
    for (let i = 0; i < pop2Count; i++, idx++) {
      const t = Math.random();
      const cTarget = Math.floor(Math.random() * 3);
      const ch = this.chambers[cTarget];

      const apexX = 0;
      const apexY = 5.2;
      const apexZ = -3.5;

      const targetX = ch.position.x;
      const targetY = ch.position.y + 4.8;
      const targetZ = ch.position.z;

      const midX = (apexX + targetX) * 0.5;
      const midY = (apexY + targetY) * 0.5 + 0.6;
      const midZ = (apexZ + targetZ) * 0.5;

      const omt = 1 - t;
      const bx = omt * omt * apexX + 2 * omt * t * midX + t * t * targetX;
      const by = omt * omt * apexY + 2 * omt * t * midY + t * t * targetY;
      const bz = omt * omt * apexZ + 2 * omt * t * midZ + t * t * targetZ;

      this.positionArray[idx * 3 + 0] = bx + (Math.random() - 0.5) * 0.18;
      this.positionArray[idx * 3 + 1] = by + (Math.random() - 0.5) * 0.18;
      this.positionArray[idx * 3 + 2] = bz + (Math.random() - 0.5) * 0.18;

      const pick = chamberColors[cTarget][0];
      this.colorArray[idx * 3 + 0] = pick.r;
      this.colorArray[idx * 3 + 1] = pick.g;
      this.colorArray[idx * 3 + 2] = pick.b;

      this.sizeArray[idx] = 0.28 + Math.random() * 0.22;
      this.alphaArray[idx] = 0.4 + Math.random() * 0.35;
      this.phaseArray[idx] = Math.random() * Math.PI * 2;
      this.typeArray[idx] = 2.0;
      this.particleChamberIdx[idx] = cTarget;
    }

    // ── Pop 3: Chamber Base Rising Sparks (360 = 120 per chamber) ──
    const pop3PerChamber = 120;
    this.chambers.forEach((chamber, cIdx) => {
      const pCol = chamberColors[cIdx];
      const cx = chamber.position.x;
      const cy = chamber.position.y;
      const cz = chamber.position.z;

      for (let i = 0; i < pop3PerChamber; i++, idx++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 1.15;

        this.positionArray[idx * 3 + 0] = cx + Math.cos(angle) * radius;
        this.positionArray[idx * 3 + 1] = cy + 0.38;
        this.positionArray[idx * 3 + 2] = cz + Math.sin(angle) * radius;

        const pick = pCol[0];
        this.colorArray[idx * 3 + 0] = pick.r;
        this.colorArray[idx * 3 + 1] = pick.g;
        this.colorArray[idx * 3 + 2] = pick.b;

        this.sizeArray[idx] = 0.26 + Math.random() * 0.24;
        this.alphaArray[idx] = 0.4 + Math.random() * 0.35;
        this.phaseArray[idx] = Math.random() * 2.8;
        this.typeArray[idx] = 3.0;
        this.particleChamberIdx[idx] = cIdx;
      }
    });

    // ── Pop 4: Avatar Orbital Halos (240 = 80 per chamber) ──
    const pop4PerChamber = 80;
    this.chambers.forEach((chamber, cIdx) => {
      const pCol = chamberColors[cIdx];
      const cx = chamber.position.x;
      const cy = chamber.position.y + 2.3;
      const cz = chamber.position.z;

      for (let i = 0; i < pop4PerChamber; i++, idx++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 0.62 + Math.random() * 0.28;

        this.positionArray[idx * 3 + 0] = cx + Math.cos(angle) * radius;
        this.positionArray[idx * 3 + 1] = cy + (Math.random() - 0.5) * 0.6;
        this.positionArray[idx * 3 + 2] = cz + Math.sin(angle) * radius;

        const pick = pCol[1];
        this.colorArray[idx * 3 + 0] = pick.r;
        this.colorArray[idx * 3 + 1] = pick.g;
        this.colorArray[idx * 3 + 2] = pick.b;

        this.sizeArray[idx] = 0.25 + Math.random() * 0.25;
        this.alphaArray[idx] = 0.45 + Math.random() * 0.35;
        this.phaseArray[idx] = Math.random() * Math.PI * 2;
        this.typeArray[idx] = 4.0;
        this.particleChamberIdx[idx] = cIdx;
      }
    });

    // ── Pop 5: Foreground Floating Bokeh Dust (remaining ~100 particles) ──
    const remaining = count - idx;
    for (let i = 0; i < remaining; i++, idx++) {
      this.positionArray[idx * 3 + 0] = (Math.random() - 0.5) * 16;
      this.positionArray[idx * 3 + 1] = (Math.random() - 0.5) * 10;
      this.positionArray[idx * 3 + 2] = 3.5 + Math.random() * 3.5;

      const pick = chamberColors[Math.floor(Math.random() * 3)][0];
      this.colorArray[idx * 3 + 0] = pick.r;
      this.colorArray[idx * 3 + 1] = pick.g;
      this.colorArray[idx * 3 + 2] = pick.b;

      this.sizeArray[idx] = 0.9 + Math.random() * 0.7;
      this.alphaArray[idx] = 0.15 + Math.random() * 0.25;
      this.phaseArray[idx] = Math.random() * Math.PI * 2;
      this.typeArray[idx] = 5.0;
    }

    // Copy initial positions as base positions
    this.basePositions.set(this.positionArray);

    // Create Point Cloud mesh
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positionArray, 3));
    this.geometry.setAttribute('aColor', new THREE.BufferAttribute(this.colorArray, 3));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizeArray, 1));
    this.geometry.setAttribute('aAlpha', new THREE.BufferAttribute(this.alphaArray, 1));
    this.geometry.setAttribute('aPhase', new THREE.BufferAttribute(this.phaseArray, 1));
    this.geometry.setAttribute('aType', new THREE.BufferAttribute(this.typeArray, 1));

    this.material = new THREE.ShaderMaterial({
      vertexShader: PointCloudParticleShader.vertexShader,
      fragmentShader: PointCloudParticleShader.fragmentShader,
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.pointsMesh = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.pointsMesh);
  }

  /**
   * Constellation / Neural Network connection lines between nearby particles.
   * Only connects particles within a threshold distance, creating a web-like
   * network pattern matching the reference image.
   */
  _initConnectionLines() {
    // Pre-allocate a generous line buffer (max connections)
    this.maxConnections = 6000;
    this.linePositions = new Float32Array(this.maxConnections * 6); // 2 verts * 3 components
    this.lineColors = new Float32Array(this.maxConnections * 6);

    this.lineGeometry = new THREE.BufferGeometry();
    this.linePosAttr = new THREE.BufferAttribute(this.linePositions, 3);
    this.linePosAttr.setUsage(THREE.DynamicDrawUsage);
    this.lineGeometry.setAttribute('position', this.linePosAttr);

    this.lineColAttr = new THREE.BufferAttribute(this.lineColors, 3);
    this.lineColAttr.setUsage(THREE.DynamicDrawUsage);
    this.lineGeometry.setAttribute('color', this.lineColAttr);

    this.lineGeometry.setDrawRange(0, 0);

    this.lineMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.lineMesh = new THREE.LineSegments(this.lineGeometry, this.lineMaterial);
    this.scene.add(this.lineMesh);

    // Throttle line update (every 3 frames for performance)
    this.lineUpdateCounter = 0;
  }

  /**
   * CPU-side computation of animated particle positions for connection distance checks.
   * Only computed for chamber, stream, base, and orbit particles (not bg stars or fg bokeh).
   */
  _computeAnimatedPositions(time) {
    const count = this.totalParticles;
    for (let i = 0; i < count; i++) {
      const type = this.typeArray[i];
      const phase = this.phaseArray[i];
      let px = this.basePositions[i * 3 + 0];
      let py = this.basePositions[i * 3 + 1];
      let pz = this.basePositions[i * 3 + 2];

      if (type < 0.5) {
        // bg stars: slow drift
        px += Math.sin(time * 0.08 + phase) * 0.25;
        py += Math.cos(time * 0.06 + phase * 1.2) * 0.25;
      } else if (type < 1.5) {
        // chamber interior: vertical spiral
        const speed = 0.5;
        const yOffset = ((phase - time * speed) % 4.4 + 4.4) % 4.4 - 2.2;
        const angle = time * 0.8 + phase * 6.28;
        const radius = 0.5 + Math.sin(phase * 6.0 + time * 0.5) * 0.14;
        px += Math.cos(angle) * radius * 0.22;
        pz += Math.sin(angle) * radius * 0.22;
        py = yOffset;
      } else if (type < 2.5) {
        // energy streams
        const wave = Math.sin(px * 1.2 + time * 0.85 + phase);
        py += wave * 0.08;
      } else if (type < 3.5) {
        // base rising sparks
        const riseSpeed = 0.4;
        const yRise = ((phase + time * riseSpeed) % 2.8 + 2.8) % 2.8;
        py += yRise;
        const spread = yRise * 0.14;
        px += Math.sin(time * 1.2 + phase * 8.0) * spread;
        pz += Math.cos(time * 1.2 + phase * 8.0) * spread;
      } else if (type < 4.5) {
        // avatar orbit
        const orbitAngle = time * 0.85 + phase * 6.28;
        const orbitRadius = 0.62 + Math.sin(time * 0.5 + phase) * 0.12;
        px += Math.cos(orbitAngle) * orbitRadius;
        pz += Math.sin(orbitAngle) * orbitRadius;
        py += Math.sin(orbitAngle * 1.5 + time * 0.4) * 0.16;
      } else {
        // fg bokeh
        px += Math.sin(time * 0.15 + phase) * 0.4;
        py += -((time * 0.12 + phase * 6.0) % 6.0) + 3.0;
      }

      this.positionArray[i * 3 + 0] = px;
      this.positionArray[i * 3 + 1] = py;
      this.positionArray[i * 3 + 2] = pz;
    }
  }

  /**
   * Rebuild the constellation connection lines between nearby particles.
   * Uses spatial locality: only checks chamber-local particles against each other.
   */
  _updateConnectionLines() {
    let connIdx = 0;
    const maxConn = this.maxConnections;
    const pos = this.positionArray;
    const col = this.colorArray;
    const types = this.typeArray;
    const distSq = this.connectionDistanceSq;

    // Only connect particles of types 1-4 (chamber, stream, base, orbit)
    // Skip bg stars (0) and fg bokeh (5) for performance and visual clarity
    const connectable = [];
    for (let i = 0; i < this.totalParticles; i++) {
      const t = types[i];
      if (t >= 1.0 && t <= 4.0) {
        connectable.push(i);
      }
    }

    // Check nearby pairs (subsample for performance)
    const maxCheck = Math.min(connectable.length, 1200);
    const step = Math.max(1, Math.floor(connectable.length / maxCheck));

    for (let a = 0; a < connectable.length && connIdx < maxConn; a += step) {
      const i = connectable[a];
      const ix = pos[i * 3 + 0];
      const iy = pos[i * 3 + 1];
      const iz = pos[i * 3 + 2];

      // Check neighbors
      for (let b = a + 1; b < Math.min(a + 40, connectable.length) && connIdx < maxConn; b++) {
        const j = connectable[b];
        const dx = pos[j * 3 + 0] - ix;
        const dy = pos[j * 3 + 1] - iy;
        const dz = pos[j * 3 + 2] - iz;
        const d2 = dx * dx + dy * dy + dz * dz;

        if (d2 < distSq && d2 > 0.01) {
          const fade = 1.0 - Math.sqrt(d2) / this.connectionDistance;

          // Line vertex 1
          const li = connIdx * 6;
          this.linePositions[li + 0] = ix;
          this.linePositions[li + 1] = iy;
          this.linePositions[li + 2] = iz;

          // Line vertex 2
          this.linePositions[li + 3] = pos[j * 3 + 0];
          this.linePositions[li + 4] = pos[j * 3 + 1];
          this.linePositions[li + 5] = pos[j * 3 + 2];

          // Colors: blend between the two particles, faded by distance
          this.lineColors[li + 0] = col[i * 3 + 0] * fade;
          this.lineColors[li + 1] = col[i * 3 + 1] * fade;
          this.lineColors[li + 2] = col[i * 3 + 2] * fade;
          this.lineColors[li + 3] = col[j * 3 + 0] * fade;
          this.lineColors[li + 4] = col[j * 3 + 1] * fade;
          this.lineColors[li + 5] = col[j * 3 + 2] * fade;

          connIdx++;
        }
      }
    }

    this.lineGeometry.setDrawRange(0, connIdx * 2);
    this.linePosAttr.needsUpdate = true;
    this.lineColAttr.needsUpdate = true;
  }

  setPixelRatio(ratio) {
    if (this.uniforms && this.uniforms.uPixelRatio) {
      this.uniforms.uPixelRatio.value = ratio;
    }
  }

  update(time, dt) {
    if (this.uniforms && this.uniforms.uTime) {
      this.uniforms.uTime.value = time;
    }

    // Compute animated positions on CPU for connection line checks
    this._computeAnimatedPositions(time);

    // Update connection lines every 3 frames for performance
    this.lineUpdateCounter++;
    if (this.lineUpdateCounter >= 3) {
      this.lineUpdateCounter = 0;
      this._updateConnectionLines();
    }
  }

  dispose() {
    if (this.pointsMesh) {
      this.scene.remove(this.pointsMesh);
      if (this.geometry) this.geometry.dispose();
      if (this.material) this.material.dispose();
    }
    if (this.lineMesh) {
      this.scene.remove(this.lineMesh);
      if (this.lineGeometry) this.lineGeometry.dispose();
      if (this.lineMaterial) this.lineMaterial.dispose();
    }
  }
}
