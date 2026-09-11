import * as THREE from 'three';

/**
 * Custom GLSL Shaders for the Vedika AI 3D Chamber Experience
 *
 * Implements:
 *  - Transparent Fresnel Glass Chamber shader
 *  - Flowing Delicate Energy Ribbon shader
 *  - Micro-Dust Point Cloud particle shader (tiny, glowing, crisp)
 *  - Directional Micro-Streak Particle Trail shader (short, soft, velocity-aligned)
 *  - Dark Reflective Cyber Floor shader
 */

// ── 1. Glass Chamber Fresnel & Specular Shader ───────────────────────
export const GlassChamberShader = {
  uniforms: {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(0.2, 0.7, 1.0) },
    uGlowIntensity: { value: 0.5 },
    uGlassOpacity: { value: 0.09 },
    uRimPower: { value: 3.2 },
  },
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec2 vUv;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vec4 mvPosition = viewMatrix * worldPosition;
      vViewPosition = -mvPosition.xyz;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uColor;
    uniform float uGlowIntensity;
    uniform float uGlassOpacity;
    uniform float uRimPower;

    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec2 vUv;

    void main() {
      vec3 normal = normalize(vNormal);
      vec3 viewDir = normalize(vViewPosition);

      // Fresnel edge glow
      float fresnel = 1.0 - abs(dot(viewDir, normal));
      float fresnelFactor = pow(fresnel, uRimPower);

      // Subtle slow vertical scanline
      float scanline = sin(vUv.y * 16.0 - uTime * 0.7) * 0.5 + 0.5;
      float scanGlow = pow(scanline, 10.0) * 0.14;

      // Specular highlight from overhead key light
      vec3 lightDir = normalize(vec3(0.2, 1.0, 0.4));
      vec3 halfVector = normalize(lightDir + viewDir);
      float NdotH = max(dot(normal, halfVector), 0.0);
      float specular = pow(NdotH, 80.0) * 0.3;

      vec3 edgeColor = uColor * (fresnelFactor * uGlowIntensity + scanGlow);
      vec3 finalColor = edgeColor + vec3(specular * 0.7);

      float alpha = clamp(uGlassOpacity + fresnelFactor * 0.38 + scanGlow * 0.22 + specular * 0.3, 0.0, 0.7);

      gl_FragColor = vec4(finalColor, alpha);
    }
  `,
};

// ── 2. Flowing Delicate Energy Filament Ribbon Shader ────────────────
export const FlowingRibbonShader = {
  uniforms: {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(0.2, 0.7, 1.0) },
    uSpeed: { value: 0.35 },
  },
  vertexShader: `
    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uColor;
    uniform float uSpeed;

    varying vec2 vUv;

    void main() {
      // Flowing energy wave pulse along length (vUv.x)
      float pulse = sin(vUv.x * 14.0 - uTime * uSpeed * 3.0) * 0.5 + 0.5;
      pulse = pow(pulse, 3.0);

      // Thin feathered edge falloff across ribbon width (vUv.y)
      float edgeDist = abs(vUv.y - 0.5) * 2.0;
      float edgeFalloff = 1.0 - smoothstep(0.0, 1.0, edgeDist);
      edgeFalloff = pow(edgeFalloff, 2.2);

      vec3 finalColor = uColor * (0.75 + pulse * 0.6);
      float alpha = edgeFalloff * (0.32 + pulse * 0.35);

      gl_FragColor = vec4(finalColor, alpha);
    }
  `,
};

// ── 3. Micro-Dust Point Cloud Particle Shader ────────────────────────
export const PointCloudParticleShader = {
  uniforms: {
    uTime: { value: 0 },
    uPixelRatio: { value: 2.0 },
  },
  vertexShader: `
    uniform float uTime;
    uniform float uPixelRatio;

    attribute float aSize;
    attribute vec3 aColor;
    attribute float aAlpha;
    attribute float aPhase;
    attribute float aType; // 0=bg, 1=chamber, 2=stream, 3=base, 4=orbit, 5=fg

    varying vec3 vColor;
    varying float vAlpha;

    void main() {
      vColor = aColor;
      vAlpha = aAlpha;

      vec3 pos = position;

      if (aType < 0.5) {
        // Pop 0: Ambient stars (slow subtle drift)
        pos.x += sin(uTime * 0.08 + aPhase) * 0.25;
        pos.y += cos(uTime * 0.06 + aPhase * 1.2) * 0.25;
      } else if (aType < 1.5) {
        // Pop 1: Chamber interior (vertical spiral down/up)
        float speed = 0.5;
        float yOffset = mod(aPhase - uTime * speed, 4.4) - 2.2;
        float angle = uTime * 0.8 + aPhase * 6.28;
        float radius = 0.5 + sin(aPhase * 6.0 + uTime * 0.5) * 0.14;
        pos.x += cos(angle) * radius * 0.22;
        pos.z += sin(angle) * radius * 0.22;
        pos.y = yOffset;
      } else if (aType < 2.5) {
        // Pop 2: Energy stream conduits
        float wave = sin(pos.x * 1.2 + uTime * 0.85 + aPhase);
        pos.y += wave * 0.08;
      } else if (aType < 3.5) {
        // Pop 3: Chamber base rising sparks
        float riseSpeed = 0.4;
        float yRise = mod(aPhase + uTime * riseSpeed, 2.8);
        pos.y += yRise;
        float spread = yRise * 0.14;
        pos.x += sin(uTime * 1.2 + aPhase * 8.0) * spread;
        pos.z += cos(uTime * 1.2 + aPhase * 8.0) * spread;
      } else if (aType < 4.5) {
        // Pop 4: Avatar orbit halo
        float orbitAngle = uTime * 0.85 + aPhase * 6.28;
        float orbitRadius = 0.62 + sin(uTime * 0.5 + aPhase) * 0.12;
        pos.x += cos(orbitAngle) * orbitRadius;
        pos.z += sin(orbitAngle) * orbitRadius;
        pos.y += sin(orbitAngle * 1.5 + uTime * 0.4) * 0.16;
      } else {
        // Pop 5: Foreground floating bokeh dust
        pos.x += sin(uTime * 0.15 + aPhase) * 0.4;
        pos.y += -mod(uTime * 0.12 + aPhase * 6.0, 6.0) + 3.0;
      }

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPosition;

      // Distance-attenuated point size (boosted ~15% for optimal visibility)
      float dist = -mvPosition.z;
      float pointSize = aSize * (70.0 / max(dist, 0.5)) * (uPixelRatio / 2.0);

      if (aType > 4.5) {
        gl_PointSize = clamp(pointSize, 2.5, 7.5);
      } else {
        gl_PointSize = clamp(pointSize, 1.2, 4.2);
      }
    }
  `,
  fragmentShader: `
    varying vec3 vColor;
    varying float vAlpha;

    void main() {
      vec2 coord = gl_PointCoord - vec2(0.5);
      float dist = length(coord);
      if (dist > 0.5) discard;

      // Soft circular point antialiasing with tiny bright center
      float softCircle = 1.0 - smoothstep(0.1, 0.5, dist);
      float core = pow(1.0 - dist * 2.0, 2.0) * 0.2;

      gl_FragColor = vec4(vColor * (1.0 + core), softCircle * vAlpha);
    }
  `,
};

// ── 4. Directional Micro-Streak Particle Trail Shader ─────────────────
export const ParticleTrailShader = {
  uniforms: {
    uTime: { value: 0 },
  },
  vertexShader: `
    uniform float uTime;

    attribute vec3 aColor;
    attribute float aAlpha;
    attribute float aPhase;
    attribute float aType; // 1=chamber, 2=stream, 3=base
    attribute float aIsTail; // 0=head, 1=tail

    varying vec3 vColor;
    varying float vAlpha;

    void main() {
      vColor = aColor;
      // Fade trail from head to tail
      vAlpha = aIsTail > 0.5 ? 0.0 : aAlpha * 0.65;

      vec3 pos = position;
      vec3 vel = vec3(0.0);

      if (aType < 1.5) {
        // Chamber vertical flow
        float speed = 0.5;
        float yOffset = mod(aPhase - uTime * speed, 4.4) - 2.2;
        float angle = uTime * 0.8 + aPhase * 6.28;
        float radius = 0.5 + sin(aPhase * 6.0 + uTime * 0.5) * 0.14;

        pos.x += cos(angle) * radius * 0.22;
        pos.z += sin(angle) * radius * 0.22;
        pos.y = yOffset;

        // Velocity vector: downward and rotational tangent
        vel = vec3(-sin(angle) * 0.08, -0.16, cos(angle) * 0.08);
      } else if (aType < 2.5) {
        // Stream flow
        float wave = sin(pos.x * 1.2 + uTime * 0.85 + aPhase);
        pos.y += wave * 0.08;
        vel = vec3(0.12, cos(pos.x * 1.2 + uTime * 0.85) * 0.04, 0.0);
      } else {
        // Base rising sparks
        float riseSpeed = 0.4;
        float yRise = mod(aPhase + uTime * riseSpeed, 2.8);
        pos.y += yRise;
        float spread = yRise * 0.14;
        pos.x += sin(uTime * 1.2 + aPhase * 8.0) * spread;
        pos.z += cos(uTime * 1.2 + aPhase * 8.0) * spread;

        vel = vec3(0.0, 0.14, 0.0);
      }

      // If tail vertex, offset backwards along velocity vector
      if (aIsTail > 0.5) {
        pos -= vel * 0.9;
      }

      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    varying vec3 vColor;
    varying float vAlpha;

    void main() {
      gl_FragColor = vec4(vColor, vAlpha);
    }
  `,
};

// ── 5. Reflective Dark Cyber Floor Shader ─────────────────────────────
export const ReflectiveFloorShader = {
  uniforms: {
    uTime: { value: 0 },
    uLeftColor: { value: new THREE.Color(0.85, 0.35, 0.95) },   // Magenta
    uCenterColor: { value: new THREE.Color(0.15, 0.65, 0.95) }, // Blue
    uRightColor: { value: new THREE.Color(0.55, 0.85, 0.15) },  // Lime
    uLeftPos: { value: new THREE.Vector3(-4.8, 0, -1.2) },
    uCenterPos: { value: new THREE.Vector3(0.0, 0, 0.4) },
    uRightPos: { value: new THREE.Vector3(4.8, 0, -1.2) },
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vWorldPosition;

    void main() {
      vUv = uv;
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPosition;
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uLeftColor;
    uniform vec3 uCenterColor;
    uniform vec3 uRightColor;
    uniform vec3 uLeftPos;
    uniform vec3 uCenterPos;
    uniform vec3 uRightPos;

    varying vec2 vUv;
    varying vec3 vWorldPosition;

    void main() {
      vec3 pos = vWorldPosition;

      // Deep void black floor base
      vec3 baseDark = vec3(0.003, 0.002, 0.005);

      // Distance to each chamber base
      float dLeft = length(pos.xz - uLeftPos.xz);
      float dCenter = length(pos.xz - uCenterPos.xz);
      float dRight = length(pos.xz - uRightPos.xz);

      // Soft, subtle localized radial light pools
      float poolLeft = exp(-dLeft * 0.95) * 0.38;
      float poolCenter = exp(-dCenter * 0.9) * 0.45;
      float poolRight = exp(-dRight * 0.95) * 0.38;

      float rippleLeft = sin(dLeft * 4.0 - uTime * 0.8) * 0.5 + 0.5;
      float rippleCenter = sin(dCenter * 4.0 - uTime * 0.9) * 0.5 + 0.5;
      float rippleRight = sin(dRight * 4.0 - uTime * 0.8) * 0.5 + 0.5;

      poolLeft *= (0.85 + rippleLeft * 0.15);
      poolCenter *= (0.85 + rippleCenter * 0.15);
      poolRight *= (0.85 + rippleRight * 0.15);

      vec2 gridUv = fract(pos.xz * 1.0);
      float gridLine = step(0.97, gridUv.x) + step(0.97, gridUv.y);
      float gridFade = exp(-length(pos.xz) * 0.3);
      vec3 gridColor = vec3(0.05, 0.08, 0.14) * gridLine * gridFade * 0.25;

      vec3 coloredGlow = uLeftColor * poolLeft +
                         uCenterColor * poolCenter +
                         uRightColor * poolRight;

      float radialFalloff = smoothstep(16.0, 3.0, length(pos.xz));
      vec3 finalColor = (baseDark + gridColor + coloredGlow) * radialFalloff;

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `,
};
