import * as THREE from 'three';

const VERTEX_SHADER = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorldPos;

void main() {
  vUv = uv;
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPos = worldPosition.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

const FRAGMENT_SHADER = /* glsl */ `
#define MPI 3.14159265358979323846

uniform float uTime;      // Real-time animated metallic shimmer glints
uniform float uProgress;  // 0.0 (compact/closed) -> 1.0 (fully open starburst)
uniform float uOpacity;   // Overall visibility fade
uniform vec3 uColor;      // Signature avatar theme color
uniform float uFlash;     // 1.0 = dramatic energetic opening flash, decays to 0.0

varying vec2 vUv;
varying vec3 vWorldPos;

// Exact distance to segment from Shadertoy sXsSzf
float sdSegment(in vec2 p, in vec2 a, in vec2 b, in float tParam) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float denom = max(0.0001, dot(ba, ba));
  float h = clamp(dot(pa, ba) / denom, 0.0, 1.0);
  return length(pa - ba * h) - max(0.0, 0.5 * tParam - 2.0);
}

float tr1(float x) {
  return asin(clamp(sin(x), -1.0, 1.0));
}

float tr2(float x) {
  return acos(clamp(cos(x), -1.0, 1.0));
}

vec2 point(float t, float b) {
  float x = tr1(t) / b + tr1(5.0 * t);
  float y = tr2(t) / b - tr2(5.0 * t) + ((MPI * (b - 1.0)) / (2.0 * b));
  return vec2(x, y);
}

void main() {
  // Center UVs in [-0.5, 0.5] range
  vec2 uv = vUv - 0.5;

  // Single opening animation phase:
  // Maps uProgress [0, 1] to the exact blossom range (0.02 to 0.74)
  // At uProgress = 1.0, it stays locked still at the glorious unfolded starburst geometry
  float effectiveTime = mix(0.02, 0.74, clamp(uProgress, 0.0, 1.0));
  float b = 0.6 / max(0.05, 1.0 - effectiveTime);

  // Spirograph scale factor (4.8 expands filaments to full grand starburst across the entire geometry)
  vec2 pCoord = uv * 4.8;

  float val = 0.0;
  for (float i = 0.0; i <= 2.001 * MPI; i += 0.1 * MPI) {
    vec2 p1 = point(i, b);
    vec2 p2 = point(i + 0.1 * MPI, b);
    float vi = max(0.002, sdSegment(pCoord, p1, p2, effectiveTime));
    val += 0.012 / vi;
  }

  // Soft circular boundary feathering that blooms cleanly with grand expansive coverage
  float r = length(uv * 2.0);
  float maxR = mix(0.40, 1.0, clamp(uProgress, 0.0, 1.0));
  float borderFade = smoothstep(maxR, maxR * 0.85, r);

  // ── Shimmery Golden Texture Formulation ──
  // Multi-frequency metallic shimmer glint across the filigree curves
  float angle = atan(uv.y, uv.x);
  float dist = length(uv * 2.0);
  float glint1 = sin(angle * 7.0 + dist * 22.0 - uTime * 2.8);
  float glint2 = cos(angle * 13.0 - dist * 14.0 + uTime * 3.4);
  float sparkle = pow(clamp((glint1 + glint2) * 0.35 + 0.5, 0.0, 1.0), 5.0) * 0.55;

  // 24K Royal Gold color stratification
  vec3 goldDeep    = vec3(0.72, 0.46, 0.08); // Warm rich amber-gold shadow
  vec3 goldRich    = vec3(0.98, 0.78, 0.22); // Pure 24-karat polished gold
  vec3 goldLuster  = vec3(1.0, 0.94, 0.62);  // Radiant champagne luster
  vec3 goldSparkle = vec3(1.0, 1.0, 0.95);   // Diamond specular glint

  // Layered shimmery golden gradient
  vec3 goldGrad = mix(goldDeep, goldRich, clamp(val * 0.65, 0.0, 1.0));
  goldGrad = mix(goldGrad, goldLuster, clamp(val * 0.85 + sparkle, 0.0, 1.0));

  // Radiant golden bloom with brilliant champagne diamond core
  vec3 goldenBloom = goldGrad * val * (1.45 + uFlash * 2.0);
  vec3 coreShine = goldSparkle * pow(clamp(val * (0.38 + uFlash * 0.35) + sparkle * 0.35, 0.0, 1.0), max(1.0, 2.7 - uFlash * 1.5));

  vec3 finalColor = goldenBloom + coreShine;
  float alpha = clamp(val * (0.94 + uFlash * 0.4), 0.0, 1.0) * borderFade * uOpacity;

  gl_FragColor = vec4(finalColor, alpha);
}
`;

export class ShaderPedestal {
  constructor(colorHex = '#FFD700', size = 7.6) {
    this.uniforms = {
      uTime: { value: 0.0 },      // Continuous shimmer glint time
      uProgress: { value: 0.04 }, // 0.04 = compact glowing seed on load, 1.0 = wide open starburst
      uOpacity: { value: 0.90 },  // Visible from start
      uColor: { value: new THREE.Color(colorHex || '#FFD700') },
      uFlash: { value: 0.0 },     // Flash pulse during dramatic opening
    };

    const geometry = new THREE.PlaneGeometry(size, size, 1, 1);
    // Lay flat horizontally on the floor plane under the avatar
    geometry.rotateX(-Math.PI / 2);

    this.material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      uniforms: this.uniforms,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    this.mesh = new THREE.Mesh(geometry, this.material);
    // Placed right on the pedestal ground plane (y = -1.25, centered at z = 0.0)
    this.mesh.position.set(0, -1.25, 0.0);
    // Present from start as a compact glowing pedestal symbol
    this.mesh.scale.set(0.32, 0.32, 0.32);
  }

  update(time) {
    if (this.uniforms.uTime) {
      this.uniforms.uTime.value = time;
    }
  }

  setProgress(val) {
    this.uniforms.uProgress.value = Math.max(0.0, Math.min(1.0, val));
  }

  setOpacity(val) {
    this.uniforms.uOpacity.value = Math.max(0.0, Math.min(1.0, val));
  }

  setColor(colorHex) {
    this.uniforms.uColor.value.set(colorHex);
  }

  dispose() {
    if (this.mesh.geometry) this.mesh.geometry.dispose();
    if (this.material) this.material.dispose();
  }
}
