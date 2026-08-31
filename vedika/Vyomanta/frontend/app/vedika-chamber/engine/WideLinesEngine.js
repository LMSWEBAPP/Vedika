import * as THREE from 'three';
import { FlowingRibbonShader } from './Shaders';

/**
 * WideLinesEngine — Thin, delicate glowing plasma filaments.
 *
 * Designed to:
 *  - Flow gently in deep background without intersecting or obscuring the title
 *  - Maintain thin wispy width (0.025 - 0.04) with feathered edges
 *  - Move slowly and calmly with deep saturated color
 */

export class WideLinesEngine {
  constructor(scene, chambers) {
    this.scene = scene;
    this.chambers = chambers;
    this.ribbonMeshes = [];
    this.uniformsList = [];

    this._buildEnergyRibbons();
  }

  _buildEnergyRibbons() {
    // Nexus singularity emitter placed high in deep background space
    const nexusPoint = new THREE.Vector3(0, 5.8, -4.2);

    // Build thin filaments connecting to each chamber
    this.chambers.forEach((chamber) => {
      const topCapPoint = new THREE.Vector3(
        chamber.position.x,
        chamber.position.y + 4.8,
        chamber.position.z
      );

      // Primary thin filament
      this._createCurvedRibbon(
        nexusPoint,
        topCapPoint,
        chamber.primaryColor,
        0.032, // Very thin filament width
        0.28,  // Slow calm speed
        0      // Lateral offset
      );

      // Secondary wispy twin filament
      this._createCurvedRibbon(
        nexusPoint,
        topCapPoint,
        chamber.secondaryColor,
        0.02,  // Ultra thin
        0.35,  // Speed
        0.25   // Lateral offset
      );
    });

    // Faint horizontal bridge filaments between chambers
    const leftTop = new THREE.Vector3(
      this.chambers[0].position.x,
      this.chambers[0].position.y + 4.6,
      this.chambers[0].position.z
    );
    const centerTop = new THREE.Vector3(
      this.chambers[1].position.x,
      this.chambers[1].position.y + 4.8,
      this.chambers[1].position.z
    );
    const rightTop = new THREE.Vector3(
      this.chambers[2].position.x,
      this.chambers[2].position.y + 4.6,
      this.chambers[2].position.z
    );

    this._createBridgeRibbon(leftTop, centerTop, new THREE.Color('#A855F7'), 0.02, 0.22);
    this._createBridgeRibbon(centerTop, rightTop, new THREE.Color('#06B6D4'), 0.02, 0.22);
  }

  _createCurvedRibbon(start, end, color, ribbonWidth, speed, offset) {
    const pointsCount = 40;
    const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    midPoint.y += 0.6;
    midPoint.x += offset * 0.8;
    midPoint.z += offset * 0.4;

    const curve = new THREE.QuadraticBezierCurve3(start, midPoint, end);

    const vertices = [];
    const uvs = [];
    const indices = [];

    for (let i = 0; i <= pointsCount; i++) {
      const t = i / pointsCount;
      const pt = curve.getPoint(t);
      const tangent = curve.getTangent(t);
      const normal = new THREE.Vector3(0, 1, 0).cross(tangent).normalize();

      const taper = Math.sin(t * Math.PI);
      const currentWidth = ribbonWidth * (0.2 + taper * 0.8);

      const leftPt = pt.clone().addScaledVector(normal, currentWidth * 0.5);
      const rightPt = pt.clone().addScaledVector(normal, -currentWidth * 0.5);

      vertices.push(leftPt.x, leftPt.y, leftPt.z);
      vertices.push(rightPt.x, rightPt.y, rightPt.z);

      uvs.push(t, 0.0);
      uvs.push(t, 1.0);

      if (i < pointsCount) {
        const base = i * 2;
        indices.push(base, base + 1, base + 2);
        indices.push(base + 1, base + 3, base + 2);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);

    const uniforms = THREE.UniformsUtils.clone(FlowingRibbonShader.uniforms);
    uniforms.uColor.value = color;
    uniforms.uSpeed.value = speed;
    this.uniformsList.push(uniforms);

    const material = new THREE.ShaderMaterial({
      vertexShader: FlowingRibbonShader.vertexShader,
      fragmentShader: FlowingRibbonShader.fragmentShader,
      uniforms: uniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });

    const mesh = new THREE.Mesh(geometry, material);
    this.scene.add(mesh);
    this.ribbonMeshes.push(mesh);
  }

  _createBridgeRibbon(start, end, color, ribbonWidth, speed) {
    const pointsCount = 30;
    const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    midPoint.y += 0.4;
    midPoint.z -= 0.6;

    const curve = new THREE.QuadraticBezierCurve3(start, midPoint, end);
    const vertices = [];
    const uvs = [];
    const indices = [];

    for (let i = 0; i <= pointsCount; i++) {
      const t = i / pointsCount;
      const pt = curve.getPoint(t);
      const tangent = curve.getTangent(t);
      const normal = new THREE.Vector3(0, 1, 0).cross(tangent).normalize();
      const taper = Math.sin(t * Math.PI);
      const currentWidth = ribbonWidth * (0.2 + taper * 0.8);

      const leftPt = pt.clone().addScaledVector(normal, currentWidth * 0.5);
      const rightPt = pt.clone().addScaledVector(normal, -currentWidth * 0.5);

      vertices.push(leftPt.x, leftPt.y, leftPt.z);
      vertices.push(rightPt.x, rightPt.y, rightPt.z);

      uvs.push(t, 0.0);
      uvs.push(t, 1.0);

      if (i < pointsCount) {
        const base = i * 2;
        indices.push(base, base + 1, base + 2);
        indices.push(base + 1, base + 3, base + 2);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);

    const uniforms = THREE.UniformsUtils.clone(FlowingRibbonShader.uniforms);
    uniforms.uColor.value = color;
    uniforms.uSpeed.value = speed;
    this.uniformsList.push(uniforms);

    const material = new THREE.ShaderMaterial({
      vertexShader: FlowingRibbonShader.vertexShader,
      fragmentShader: FlowingRibbonShader.fragmentShader,
      uniforms: uniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });

    const mesh = new THREE.Mesh(geometry, material);
    this.scene.add(mesh);
    this.ribbonMeshes.push(mesh);
  }

  update(time, dt) {
    for (let i = 0; i < this.uniformsList.length; i++) {
      if (this.uniformsList[i].uTime) {
        this.uniformsList[i].uTime.value = time;
      }
    }
  }

  dispose() {
    this.ribbonMeshes.forEach((mesh) => {
      this.scene.remove(mesh);
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) mesh.material.dispose();
    });
    this.ribbonMeshes = [];
    this.uniformsList = [];
  }
}
