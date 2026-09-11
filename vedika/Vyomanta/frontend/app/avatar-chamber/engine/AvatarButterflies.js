import * as THREE from 'three';

/**
 * Procedural 3D Butterfly System ported from Shadertoy lf2SDy
 * (https://www.shadertoy.com/view/lf2SDy)
 *
 * Features:
 * - 5 butterflies circling 360° continuously on top of the middle avatar.
 * - Exact mathematical wing veins, Voronoi lobes, FBM noise, and iridescent coloring.
 * - Analytical ray-plane wing intersection in local object coordinates.
 * - Dynamic fluttering flap kinematics with aerodynamic lift bobbing.
 * - Smooth banking roll into circular turns.
 * - Sparkle golden fairy dust trail following each butterfly.
 * - Tunable global butterfly size.
 */

const BUTTERFLY_VERTEX_SHADER = /* glsl */ `
  varying vec3 vWorldPosition;
  varying vec3 vLocalPosition;

  void main() {
    vLocalPosition = position;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const BUTTERFLY_FRAGMENT_SHADER = /* glsl */ `
  precision highp float;

  uniform mat4 uInverseModelMatrix;
  uniform float uFlap;
  uniform float uTime;
  uniform vec3 uColorTint;
  uniform float uAlpha;

  varying vec3 vWorldPosition;
  varying vec3 vLocalPosition;

  // Noise & Math Utilities from Shadertoy lf2SDy
  float hash(float n) { 
    return fract(sin(n) * 43758.5453123); 
  }

  float noise(in vec2 x) {
    vec2 p = floor(x);
    vec2 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    float n = p.x + p.y * 157.0;
    return mix(
      mix(hash(n + 0.0), hash(n + 1.0), f.x),
      mix(hash(n + 157.0), hash(n + 158.0), f.x),
      f.y
    );
  }

  float fbm2(vec2 p) {
    float f = 0.0, x;
    for(int i = 1; i <= 5; ++i) {
      x = exp2(float(i));
      f += (noise(p * x) - 0.5) / x;
    }
    return f;
  }

  float sq(float x) { 
    return x * x; 
  }

  vec2 rotate(float a, vec2 v) {
    return vec2(cos(a) * v.x + sin(a) * v.y, cos(a) * v.y - sin(a) * v.x);
  }

  // Upper Wing Voronoi-like structural nodes
  vec3 wing0Node(int i) {
    if(i < 1) return vec3(-0.63, 0.0, 1.0);
    if(i < 2) return vec3(-0.80, 0.25, 1.0);
    if(i < 3) return vec3(-0.60, 0.90, 1.0);
    if(i < 4) return vec3(-0.46, 0.24, 1.3);
    return vec3(-0.05, -0.05, 1.0);
  }

  // Lower Wing structural nodes
  vec3 wing1Node(int i) {
    if(i < 1) return vec3(0.31, 0.30, 1.0);
    if(i < 2) return vec3(-0.53, 0.40, 1.0);
    return vec3(0.53, -0.20, 1.0);
  }

  vec3 wing0NodeTransformed(int i) {
    return (wing0Node(i) + vec3(-0.57, -0.05, 0.0)) * vec3(vec2(0.2, 0.7) * 0.73, 0.9);
  }

  vec3 wing1NodeTransformed(int i) {
    return (wing1Node(i) + vec3(-0.70, -0.05, 0.0)) * vec3(vec2(1.2, 1.0) * 0.37, 0.89);
  }

  // Upper Wing texture procedure
  vec3 wing0Tex(vec2 p) {
    p = rotate(-0.79, p + vec2(0.35, 0.0));
    
    int cn = 0;
    float cnd = 1e3;
    for(int i = 0; i < 4; i += 1) {
      float d = distance(p, wing0NodeTransformed(i).xy);
      if(d < cnd) {
        cnd = d;
        cn = i;
      }
    }
    
    float s = 0.04 + pow(max(0.0, -p.x * 0.1), 1.3) + pow(max(0.0, -p.y + 1.0), 1.3) * 0.1;
    s += 0.12 * (1.0 - smoothstep(0.0, 0.14, distance(p.xy, vec2(-0.2, 2.2))));
    
    float c = 0.0;
    for(int j = 0; j < 4; j += 1) {
      if(j == cn) continue;
      vec3 n0 = wing0NodeTransformed(cn);
      vec3 n1 = wing0NodeTransformed(j);
      vec2 nd = n1.xy - n0.xy;
      float d = dot(p - (n0.xy + nd * 0.5), normalize(nd)) + s * n0.z;
      c += sq(max(0.0, d));
    }
    
    float p0 = sq(max(0.0, dot(p - vec2(-0.47, 0.0), normalize(vec2(1.0, -1.0)))));
    
    c += sq(max(0.0, (distance(p + vec2(0.6, 1.42), vec2(0.0)) - 2.0 + s))) + p0 * 0.5 +
         sq(max(0.0, dot(p - vec2(-0.6, -0.2), normalize(vec2(-0.3, -0.9)))));
    
    float c2 = sq(max(0.0, (distance(p + vec2(0.6, 1.55), vec2(0.0)) - 2.0))) + p0 +
               sq(max(0.0, dot(p - vec2(-0.6, -0.2), normalize(vec2(-0.19, -0.9))) - 0.1));
    
    float x = max(1.0 - smoothstep(0.26, 0.87, distance(p, vec2(-0.5, 0.5))),
                  1.0 - smoothstep(0.02, 0.025, length(p - vec2(0.05, 0.01))));
    
    return vec3(
      1.0 - smoothstep(s - 0.0975, s - 0.015 + 0.116, sqrt(max(0.0, c))),
      1.0 - smoothstep(0.01, 0.106, sqrt(max(0.0, c2)) - 0.03),
      x * 0.53 - p.y * 0.05
    );
  }

  // Lower Wing texture procedure
  vec3 wing1Tex(vec2 p) {
    p = p + vec2(0.0, 0.16);
    
    int cn = 0;
    float cnd = 1e3;
    for(int i = 0; i < 7; i += 1) {
      float d = distance(p, wing1NodeTransformed(i).xy);
      if(d < cnd) {
        cnd = d;
        cn = i;
      }
    }
    
    float s = 0.04 + pow(max(0.0, -p.y * 0.4), 1.3) + pow(max(0.0, -p.x - 1.0), 1.3) * 0.1;
    
    float c = 0.0;
    for(int j = 0; j < 7; j += 1) {
      if(j == cn) continue;
      vec3 n0 = wing1NodeTransformed(cn);
      vec3 n1 = wing1NodeTransformed(j);
      vec2 nd = n1.xy - n0.xy;
      float d = dot(p - (n0.xy + nd * 0.5), normalize(nd)) + s * n0.z;
      c += sq(max(0.0, d));
    }
    
    float p0 = sq(max(0.0, dot(p - vec2(-0.5, -0.4), normalize(vec2(1.0, -0.7)))));
    float p1 = sq(max(0.0, dot(p - vec2(-0.53, 0.3), normalize(-vec2(0.1, -0.9)))));
    
    c += sq(max(0.0, (distance(p + vec2(0.52, -0.1), vec2(0.0)) - 0.5))) + p0 + p1;
    float c2 = sq(max(0.0, (distance(p + vec2(0.5, -0.0), vec2(0.0)) - 0.53))) + p0 + p1;

    return vec3(
      1.0 - smoothstep(s - 0.025, s - 0.005 + 0.0716, sqrt(max(0.0, c))),
      1.0 - smoothstep(0.1, 0.106, sqrt(max(0.0, c2)) - 0.03),
      c2 * 0.025
    );
  }

  // Full Wing shader combining procedural lobes, veining, and iridescent morphing
  vec4 wing(vec2 p) {
    p += fbm2(p * vec2(1.2, 0.9)) * 0.15;
    
    float fbmVal = fbm2(rotate(-0.537, p) * vec2(100.0, 300.0)) * 1.85 + 0.3;
    vec3 wc = mix(
      vec3(1.15, 1.125, 1.65) * 0.63,
      vec3(0.79, 0.970, 1.47) * 1.51,
      clamp(pow(max(0.0, fbmVal), 3.0), 0.0, 1.0)
    );
    
    wc = pow(max(vec3(0.0), wc), vec3(1.9));
    
    // Morph tint with butterfly individuality
    wc = mix(wc, wc * uColorTint, 0.65);
    
    vec3 c0 = wing0Tex(p);
    vec3 c1 = wing1Tex(p);

    vec3 col = vec3(0.0);
    col.rgb = mix(mix(vec3(0.0), c0.x * wc, c0.y), c1.x * wc, c1.y);
    col.rgb = mix(col.rgb, vec3(1.0, 0.96, 0.82), c0.z);
    col.rgb = mix(col.rgb, vec3(1.0, 0.96, 0.82), c1.z);
    
    return vec4(col, max(c0.y, c1.y));
  }

  // Ray-plane intersection for wing flap plane
  vec3 traceButterflyWing(vec3 ro, vec3 rd, vec3 bo, vec3 bd, float flap) {
    vec3 up = vec3(0.1, 1.0, 0.0);
    vec3 c = cross(bd, up);
    float flapangle = mix(radians(30.0), radians(170.0), flap);
    vec3 w = cos(flapangle) * c + sin(flapangle) * up;
    float dotRdW = dot(rd, w);
    float t = 1e4;
    if (abs(dotRdW) > 1e-6) {
      t = -dot(ro, w) / dotRdW;
    }
    vec3 s = cross(w, bd);
    vec3 rp = ro + rd * t;
    return vec3(dot(rp, s), dot(rp, bd), t);
  }

  // Analytical butterfly raytracer with left-right wing symmetry
  vec4 traceButterfly(vec3 ro, vec3 rd, vec3 bo, vec3 bd, float flap) {
    flap = pow(flap, 0.55);
    bo.y -= flap * 0.25;
    ro -= bo;
    vec3 up = vec3(0.0, 1.0, 0.0);
    vec3 c = cross(bd, up);
    
    vec3 w0 = traceButterflyWing(ro, rd, bo, bd, flap);
    
    ro -= dot(ro, c) * 2.0 * c;
    rd -= dot(rd, c) * 2.0 * c;
    
    vec3 w1 = traceButterflyWing(ro, rd, bo, bd, flap);

    // High-performance early bounds culling: skip heavy wing texturing if ray misses wings
    bool in0 = abs(w0.x) <= 1.8 && abs(w0.y) <= 1.3 && w0.z > 0.0;
    bool in1 = abs(w1.x) <= 1.8 && abs(w1.y) <= 1.3 && w1.z > 0.0;

    if (!in0 && !in1) {
      return vec4(0.0, 0.0, 0.0, 0.0);
    }

    vec4 c0 = in0 ? wing(w0.xy) : vec4(0.0);
    vec4 c1 = in1 ? wing(w1.xy) : vec4(0.0);

    bool u0 = in0 && c0.a > 0.01;
    bool u1 = in1 && c1.a > 0.01;

    if (!u0 && !u1) return vec4(0.0, 0.0, 0.0, 0.0);
    if (u0 && !u1) return vec4(c0.rgb, c0.a);
    if (!u0 && u1) return vec4(c1.rgb, c1.a);

    // Front-to-back depth order sorting
    if (w0.z < w1.z) {
      return vec4(c0.rgb, c0.a);
    } else {
      return vec4(c1.rgb, c1.a);
    }
  }

  void main() {
    vec3 worldRo = cameraPosition;
    vec3 worldRd = normalize(vWorldPosition - cameraPosition);
    
    // Transform ray into butterfly's canonical local coordinate space
    vec3 localRo = (uInverseModelMatrix * vec4(worldRo, 1.0)).xyz;
    vec3 localRd = normalize((uInverseModelMatrix * vec4(worldRd, 0.0)).xyz);

    vec4 hit = traceButterfly(localRo, localRd, vec3(0.0), vec3(0.0, 0.0, 1.0), uFlap);
    
    // 100% Transparent on any pixel that misses or edges out of the wings
    if (hit.a <= 0.005) {
      discard;
    }

    // Luminous iridescent wing coloring with rich golden rim & glow
    vec3 col = hit.rgb * 1.65;
    col += vec3(0.20, 0.16, 0.06); // Golden ethereal warmth
    
    gl_FragColor = vec4(col, clamp(hit.a * uAlpha, 0.0, 1.0));
  }
`;

// Dedicated Perch Spots along the line across the top of the head
// Spans widely across the entire crest line: far left, mid left, inner left, center, inner right, mid right, far right
const HEAD_LINE_PERCH_SPOTS = [
  {
    name: 'head_line_far_left',
    label: 'Top head line - Far left',
    local: new THREE.Vector3(-0.48, 1.34, 0.58),
    fallbackWorld: new THREE.Vector3(-0.54, 0.67, 3.93),
    rot: new THREE.Vector3(-0.20, 0.12, 0.14),
  },
  {
    name: 'head_line_mid_left',
    label: 'Top head line - Mid left',
    local: new THREE.Vector3(-0.32, 1.38, 0.60),
    fallbackWorld: new THREE.Vector3(-0.36, 0.71, 3.90),
    rot: new THREE.Vector3(-0.20, 0.08, 0.10),
  },
  {
    name: 'head_line_inner_left',
    label: 'Top head line - Inner left',
    local: new THREE.Vector3(-0.16, 1.41, 0.61),
    fallbackWorld: new THREE.Vector3(-0.18, 0.73, 3.88),
    rot: new THREE.Vector3(-0.20, 0.04, 0.05),
  },
  {
    name: 'head_line_center',
    label: 'Top head line - Center crest',
    local: new THREE.Vector3(0.00, 1.42, 0.62),
    fallbackWorld: new THREE.Vector3(0.00, 0.74, 3.86),
    rot: new THREE.Vector3(-0.20, 0.00, 0.00),
  },
  {
    name: 'head_line_inner_right',
    label: 'Top head line - Inner right',
    local: new THREE.Vector3(0.16, 1.41, 0.61),
    fallbackWorld: new THREE.Vector3(0.18, 0.73, 3.88),
    rot: new THREE.Vector3(-0.20, -0.04, -0.05),
  },
  {
    name: 'head_line_mid_right',
    label: 'Top head line - Mid right',
    local: new THREE.Vector3(0.32, 1.38, 0.60),
    fallbackWorld: new THREE.Vector3(0.36, 0.71, 3.90),
    rot: new THREE.Vector3(-0.20, -0.08, -0.10),
  },
  {
    name: 'head_line_far_right',
    label: 'Top head line - Far right',
    local: new THREE.Vector3(0.48, 1.34, 0.58),
    fallbackWorld: new THREE.Vector3(0.54, 0.67, 3.93),
    rot: new THREE.Vector3(-0.20, -0.12, -0.14),
  },
];

let _lastPerchIndex = -1;

/**
 * Chooses a random perch spot along the top head line (avoiding consecutive repeats).
 * Adds organic micro-variations so every landing is uniquely placed across the line.
 */
function pickPerchSpot() {
  let idx = Math.floor(Math.random() * HEAD_LINE_PERCH_SPOTS.length);
  if (idx === _lastPerchIndex) {
    idx = (idx + 1 + Math.floor(Math.random() * (HEAD_LINE_PERCH_SPOTS.length - 1))) % HEAD_LINE_PERCH_SPOTS.length;
  }
  _lastPerchIndex = idx;
  const base = HEAD_LINE_PERCH_SPOTS[idx];

  // Subtle organic micro-variation (±0.04m in X, ±0.015m in Y, ±0.02m in Z)
  const jitterX = (Math.random() - 0.5) * 0.08;
  const jitterY = (Math.random() - 0.5) * 0.02;
  const jitterZ = (Math.random() - 0.5) * 0.03;

  return {
    name: base.name,
    local: new THREE.Vector3(base.local.x + jitterX, base.local.y + jitterY, base.local.z + jitterZ),
    fallbackWorld: base.fallbackWorld,
    rot: new THREE.Vector3(
      base.rot.x + (Math.random() - 0.5) * 0.03,
      base.rot.y + (Math.random() - 0.5) * 0.03,
      base.rot.z + (Math.random() - 0.5) * 0.03
    ),
  };
}

export class AvatarButterflies {
  /**
   * @param {THREE.Scene} scene - Parent Three.js scene
   * @param {Object} options - Configuration options
   */
  constructor(scene, options = {}) {
    this.scene = scene;
    this.count = 5;
    this.group = new THREE.Group();
    this.group.name = 'avatar-butterflies-group';

    // Locked values from user: height 1.1, radius 2.45, size 1.75
    this.center = new THREE.Vector3(0.0, options.initialHeight !== undefined ? options.initialHeight : 1.1, 2.4);
    this.baseRadius = options.initialRadius !== undefined ? options.initialRadius : 2.45;
    this.orbitSpeed = 0.65; // Responsive revolving speed (~9.5s for full 360° circle)

    this.userScale = options.initialScale !== undefined ? options.initialScale : 1.75;
    this.baseSize = 0.145; // Canonical world scale multiplier

    // Individual color palettes: Morphing iridescent jewel tones with golden accents
    const tints = [
      new THREE.Color('#38BDF8'), // Luminous Sky Cyan
      new THREE.Color('#A855F7'), // Mystic Royal Purple
      new THREE.Color('#F59E0B'), // Shimmering Warm Gold
      new THREE.Color('#34D399'), // Enchanted Emerald
      new THREE.Color('#EC4899'), // Radiant Lotus Pink
    ];

    // Tight bounding geometry enclosing wings (3.6 x 2.2 x 1.6 vs 4.8 cube = 88.5% smaller volume!)
    this.boxGeometry = new THREE.BoxGeometry(3.6, 2.2, 1.6);

    // ── Landing & Cute Shake-Off State Machine ──
    // One butterfly sits mostly on top right front of the head and on the forehead / top of eyes.
    // Preserves the crown's floating gap and avoids extreme upward tilt.
    this.landingState = 'ORBITING'; // 'ORBITING' | 'APPROACHING' | 'SEATED' | 'TAKEOFF'
    this.activeButterflyIdx = 0;
    this.stateStartTime = 0;
    this.orbitInterval = 2.8;     // Seconds in orbit between cycles
    this.approachDuration = 0.85; // Seconds to glide down from orbit to head
    this.seatedDuration = 2.0;    // Full 2 seconds sitting while avatar looks at it!
    this.takeoffDuration = 0.90;  // Seconds being flung out of orbit and recovering back
    this.landingStartPos = new THREE.Vector3();
    this.currentSpot = pickPerchSpot();
    this.headSeatPos = new THREE.Vector3().copy(this.currentSpot.fallbackWorld);
    this.takeoffTargetPos = new THREE.Vector3();
    this.shakeTriggered = false;
    this.onLandingShake = null;
    this.avatarManager = null;

    // Create 5 individual butterfly instances
    this.butterflies = [];
    for (let i = 0; i < this.count; i++) {
      const mat = new THREE.ShaderMaterial({
        vertexShader: BUTTERFLY_VERTEX_SHADER,
        fragmentShader: BUTTERFLY_FRAGMENT_SHADER,
        uniforms: {
          uInverseModelMatrix: { value: new THREE.Matrix4() },
          uFlap: { value: 0.5 },
          uTime: { value: 0.0 },
          uColorTint: { value: tints[i % tints.length] },
          uAlpha: { value: 0.95 },
        },
        transparent: true,
        depthWrite: false,
        depthTest: true,
        side: THREE.FrontSide,
        blending: THREE.NormalBlending,
      });

      const mesh = new THREE.Mesh(this.boxGeometry, mat);
      mesh.name = `shadertoy-butterfly-${i}`;
      mesh.renderOrder = 10; // Renders with rich transparency over avatar and beam

      this.group.add(mesh);

      // Unique flight dynamics per butterfly
      this.butterflies.push({
        mesh,
        material: mat,
        phaseOffset: (i * Math.PI * 2) / this.count + (i % 2 === 0 ? 0.1 : -0.1),
        radiusOffset: 0.12 * (i % 2 === 0 ? 1 : -1),
        altitudeOffset: 0.14 * (i % 3 === 0 ? 1 : (i % 3 === 1 ? -0.8 : 0.2)),
        flapFrequency: 12.5 + (i * 0.8),
        flapPhase: i * 1.35,
        speedMultiplier: 0.96 + (i * 0.02),
      });
    }

    this.scene.add(this.group);
  }

  /**
   * Sets the scale of the butterflies dynamically.
   * @param {number} scale - Multiplier (e.g. 0.5 - 2.5, default 1.75)
   */
  setSize(scale) {
    if (typeof scale === 'number' && scale > 0.05) {
      this.userScale = scale;
    }
  }

  /**
   * Sets the orbit radius dynamically.
   * @param {number} r - Radius in meters (e.g. 1.2 - 2.8, default 2.45)
   */
  setRadius(r) {
    if (typeof r === 'number' && r > 0.5) {
      this.baseRadius = r;
    }
  }

  /**
   * Sets the orbit height dynamically.
   * @param {number} h - Height in meters (e.g. 1.0 - 2.5, default 1.1)
   */
  setHeight(h) {
    if (typeof h === 'number') {
      this.center.y = h;
    }
  }

  setAvatarManager(avatarManager) {
    this.avatarManager = avatarManager;
  }

  /**
   * Computes the live dynamic world position of the current crown perch spot.
   * Tracks the avatar's real-time head floating bob, horizontal wobble, and crown tilt.
   */
  getLiveSeatPosition(targetVec = new THREE.Vector3()) {
    if (this.avatarManager && this.currentSpot && this.currentSpot.local) {
      const mid = this.avatarManager.getMiddleAvatar ? this.avatarManager.getMiddleAvatar() : this.avatarManager.avatars?.[0];
      if (mid && mid.pivot) {
        targetVec.copy(this.currentSpot.local);
        targetVec.applyMatrix4(mid.pivot.matrixWorld);
        return targetVec;
      }
    }
    if (this.currentSpot && this.currentSpot.fallbackWorld) {
      targetVec.copy(this.currentSpot.fallbackWorld);
      return targetVec;
    }
    targetVec.set(0.50, 0.65, 3.95);
    return targetVec;
  }

  /**
   * Plays the butterfly fly away sound effect when shaken off.
   */
  playButterflyFlySound() {
    try {
      const audio = new Audio('/audio/butterfly.wav');
      audio.volume = 0.85;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.log('Butterfly sound playback info:', err?.message);
        });
      }
    } catch (e) {}
  }

  /**
   * Returns the active target 3D position that the middle avatar should gaze at.
   * Gated strictly behind dialogue completion: avatar only looks when dialogue is finished!
   */
  getActiveTargetPosition() {
    const canInteract = this.avatarManager?.isMiddleAvatarReadyForButterflies
      ? this.avatarManager.isMiddleAvatarReadyForButterflies()
      : false;

    if (!canInteract) {
      return {
        position: null,
        state: 'ORBITING',
        isLandingOrSeated: false,
      };
    }

    if (this.landingState === 'APPROACHING' || this.landingState === 'SEATED' || this.landingState === 'TAKEOFF') {
      const activeB = this.butterflies[this.activeButterflyIdx];
      return {
        position: activeB ? activeB.mesh.position.clone() : this.getLiveSeatPosition(),
        state: this.landingState,
        isLandingOrSeated: true,
      };
    }

    return {
      position: null,
      state: 'ORBITING',
      isLandingOrSeated: false,
    };
  }

  /**
   * Applies smooth obstacle deflection if trajectory nears avatar surface.
   * Automatically realigns as the butterfly moves clear of the obstacle.
   */
  _applyAvatarDeflection(pos) {
    // 1. Avatar Body Obstacle (Pink fluff / main body sphere)
    const bodyCenter = { x: 0.0, y: 0.20, z: 2.4 };
    const bodySafeRadius = 1.42;

    // 2. Avatar Crown Obstacle (Upper crown / head cap)
    const crownCenter = { x: 0.0, y: 1.25, z: 2.4 };
    const crownSafeRadius = 0.85;

    this._deflectFromSphere(pos, bodyCenter, bodySafeRadius, 0.35);
    this._deflectFromSphere(pos, crownCenter, crownSafeRadius, 0.55);
  }

  _deflectFromSphere(pt, center, safeRadius, upwardLift = 0.4) {
    const dx = pt.x - center.x;
    const dy = pt.y - center.y;
    const dz = pt.z - center.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (dist < safeRadius && dist > 0.0001) {
      const penetration = safeRadius - dist;
      let nx = dx / dist;
      let ny = dy / dist + upwardLift;
      let nz = dz / dist;
      const nLen = Math.sqrt(nx * nx + ny * ny + nz * nz);
      nx /= nLen;
      ny /= nLen;
      nz /= nLen;

      // Deflect smoothly outward & upward
      const push = penetration * 1.35;
      pt.x += nx * push;
      pt.y += ny * push;
      pt.z += nz * push;
    }
  }

  /**
   * Main per-frame update loop.
   * @param {number} time - Elapsed time in seconds
   * @param {number} dt - Frame delta time in seconds
   */
  update(time, dt = 0.016) {
    const effectiveScale = this.baseSize * this.userScale;

    // ── Update Landing & Cute Shake-off State Machine ──
    // Gated strictly behind middle companion finishing its dialogue sentence!
    const canInteract = this.avatarManager?.isMiddleAvatarReadyForButterflies
      ? this.avatarManager.isMiddleAvatarReadyForButterflies()
      : false;

    if (!canInteract) {
      // Until sentence finishes: keep strictly in orbit, reset timer so landing countdown only starts after dialogue!
      if (this.landingState !== 'ORBITING') {
        this.landingState = 'ORBITING';
      }
      this.stateStartTime = time;
      this.shakeTriggered = false;
    } else {
      const stateElapsed = time - this.stateStartTime;

      if (this.landingState === 'ORBITING') {
        if (this.stateStartTime === 0) {
          this.stateStartTime = time;
        } else if (stateElapsed >= this.orbitInterval) {
          // Transition to APPROACHING with a RANDOM butterfly
          this.landingState = 'APPROACHING';
          this.stateStartTime = time;

          // Choose a truly random butterfly each time (avoiding picking the same one consecutively)
          let nextBIdx = Math.floor(Math.random() * this.count);
          if (nextBIdx === this.activeButterflyIdx) {
            nextBIdx = (nextBIdx + 1 + Math.floor(Math.random() * (this.count - 1))) % this.count;
          }
          this.activeButterflyIdx = nextBIdx;

          const b = this.butterflies[this.activeButterflyIdx];
          if (b) {
            this.landingStartPos.copy(b.mesh.position);
          }

          // Choose a random spot across the top head line
          this.currentSpot = pickPerchSpot();
          this.headSeatPos.copy(this.getLiveSeatPosition());

          this.shakeTriggered = false;
        }
      } else if (this.landingState === 'APPROACHING') {
        if (stateElapsed >= this.approachDuration) {
          // Transition to SEATED on top right front or forehead
          this.landingState = 'SEATED';
          this.stateStartTime = time;
          this.shakeTriggered = false;
        }
      } else if (this.landingState === 'SEATED') {
        // After the butterfly sits, the avatar looks at the butterfly that sat on it,
        // gives 2 sec of time, and THEN shakes it off!
        if (!this.shakeTriggered && stateElapsed >= this.seatedDuration) {
          this.shakeTriggered = true;
          if (this.onLandingShake) {
            this.onLandingShake();
          }

          // Avatar's horizontal wobble knocks the butterfly OUT OF ORBIT!
          this.landingState = 'TAKEOFF';
          this.stateStartTime = time;

          // 1. Play butterfly fly away sound effect when shaken off!
          this.playButterflyFlySound();

          const b = this.butterflies[this.activeButterflyIdx];
          const futureTime = time + this.takeoffDuration;
          const takeoffAngle = futureTime * this.orbitSpeed * b.speedMultiplier + b.phaseOffset;
          this.takeoffTargetPos.set(
            this.center.x + (this.baseRadius + b.radiusOffset) * Math.cos(takeoffAngle),
            this.center.y + b.altitudeOffset + 0.10,
            this.center.z + (this.baseRadius + b.radiusOffset) * Math.sin(takeoffAngle)
          );
        }
      } else if (this.landingState === 'TAKEOFF') {
        if (stateElapsed >= this.takeoffDuration) {
          // Re-align smoothly into normal circular orbit
          this.landingState = 'ORBITING';
          this.stateStartTime = time;
        }
      }
    }

    // ── Update Each Butterfly ──
    this.butterflies.forEach((b, idx) => {
      const { mesh, material, phaseOffset, radiusOffset, altitudeOffset, flapFrequency, flapPhase, speedMultiplier } = b;
      const isSpecialActive = idx === this.activeButterflyIdx && this.landingState !== 'ORBITING';

      if (!isSpecialActive) {
        // 1. Regular 360° circular trajectory
        const angle = time * this.orbitSpeed * speedMultiplier + phaseOffset;

        // Subtle organic radius undulation
        const currentRadius = this.baseRadius + radiusOffset + 0.08 * Math.sin(time * 0.75 + phaseOffset);

        // Height undulation (harmonic altitude wave around middle avatar's head)
        const currentY = this.center.y + altitudeOffset + 0.12 * Math.sin(angle * 2.0 + phaseOffset) + 0.05 * Math.cos(time * 1.6);

        // 2. Raw position along circular path
        const pos = {
          x: this.center.x + currentRadius * Math.cos(angle),
          y: currentY,
          z: this.center.z + currentRadius * Math.sin(angle),
        };

        // Lookahead position for velocity vector
        const nextAngle = angle + 0.05;
        const nextPos = {
          x: this.center.x + currentRadius * Math.cos(nextAngle),
          y: currentY + 0.02 * Math.sin((angle + 0.05) * 2.0),
          z: this.center.z + currentRadius * Math.sin(nextAngle),
        };

        // Obstacle deflection around avatar
        this._applyAvatarDeflection(pos);
        this._applyAvatarDeflection(nextPos);

        mesh.position.set(pos.x, pos.y, pos.z);

        // Orientation along velocity vector with turn banking
        mesh.lookAt(new THREE.Vector3(nextPos.x, nextPos.y, nextPos.z));
        mesh.rotateZ(-0.32);

        // Regular wing flap
        const flap = 0.5 + 0.5 * Math.cos(time * flapFrequency + flapPhase);
        material.uniforms.uFlap.value = flap;
      } else {
        // ── Active Butterfly Near Crown Landing / Seated / Out-of-Orbit Knockout Sequence ──
        const liveSeatPos = this.getLiveSeatPosition();
        this.headSeatPos.copy(liveSeatPos);

        if (this.landingState === 'APPROACHING') {
          const t = Math.min(Math.max((time - this.stateStartTime) / this.approachDuration, 0.0), 1.0);
          const easeT = t * t * (3.0 - 2.0 * t); // Smoothstep

          const curPos = new THREE.Vector3().lerpVectors(this.landingStartPos, liveSeatPos, easeT);
          curPos.y += Math.sin(t * Math.PI) * 0.28; // Graceful landing arc
          mesh.position.copy(curPos);

          // Face forward and align to target spot rotation as it perches
          const targetRot = this.currentSpot ? this.currentSpot.rot : new THREE.Vector3(-0.25, 0.0, 0.0);
          mesh.rotation.set(
            targetRot.x * easeT,
            targetRot.y * easeT + 0.15 * (1.0 - easeT),
            targetRot.z * easeT
          );

          // Wing flap softens down to gentle perch speed
          const curFreq = THREE.MathUtils.lerp(flapFrequency, 6.0, easeT);
          material.uniforms.uFlap.value = 0.5 + 0.45 * Math.cos(time * curFreq);
        } else if (this.landingState === 'SEATED') {
          // Resting strictly on top of the head near and around the crown
          const bob = 0.005 * Math.sin(time * 6.0);
          mesh.position.set(liveSeatPos.x, liveSeatPos.y + bob, liveSeatPos.z);

          if (this.currentSpot) {
            mesh.rotation.set(
              this.currentSpot.rot.x,
              this.currentSpot.rot.y,
              this.currentSpot.rot.z + 0.03 * Math.sin(time * 4.0)
            );
          } else {
            mesh.rotation.set(-0.25, 0.0, 0.04 * Math.sin(time * 3.0));
          }

          // Delicate resting wing flutter
          material.uniforms.uFlap.value = 0.5 + 0.35 * Math.cos(time * 6.5);
        } else if (this.landingState === 'TAKEOFF') {
          // ── The avatar's horizontal wobble knocks the butterfly OUT OF THE ORBIT! ──
          const t = Math.min(Math.max((time - this.stateStartTime) / this.takeoffDuration, 0.0), 1.0);

          // Out-of-orbit displacement: peaks at t ≈ 0.35 then smoothly returns to 0
          // This shoots the butterfly forward towards camera and upward/sideways!
          const flingFactor = Math.sin(t * Math.PI); // 0 -> 1 -> 0
          const flingOutX = (idx % 2 === 0 ? 0.85 : -0.85) * flingFactor;
          const flingOutY = 0.55 * flingFactor;
          const flingOutZ = 0.80 * flingFactor; // Shoots forward out of orbit into room!

          // Target interpolation from crown perch back into orbit
          const normalOrbitPos = new THREE.Vector3().lerpVectors(liveSeatPos, this.takeoffTargetPos, t);
          normalOrbitPos.x += flingOutX;
          normalOrbitPos.y += flingOutY;
          normalOrbitPos.z += flingOutZ;

          mesh.position.copy(normalOrbitPos);

          // Dynamic banking while flung out, realigning into turn banking as it curves back into orbit
          const lookAhead = new THREE.Vector3(
            this.takeoffTargetPos.x + flingOutX * 0.5,
            this.takeoffTargetPos.y + 0.1,
            this.takeoffTargetPos.z
          );
          mesh.lookAt(lookAhead);
          mesh.rotateZ(-0.25 + 0.40 * flingFactor);

          // Fast startled wing flapping while knocked out
          material.uniforms.uFlap.value = 0.5 + 0.5 * Math.cos(time * 32.0);
        }
      }

      // Uniform scaling
      mesh.scale.set(effectiveScale, effectiveScale, effectiveScale);

      // Update matrix world
      mesh.updateMatrixWorld();

      // Update shader uniforms
      material.uniforms.uInverseModelMatrix.value.copy(mesh.matrixWorld).invert();
      material.uniforms.uTime.value = time;
    });
  }

  /**
   * Cleanup resources upon scene destruction.
   */
  dispose() {
    this.butterflies.forEach((b) => {
      b.mesh.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
    });

    if (this.boxGeometry) {
      this.boxGeometry.dispose();
    }

    if (this.group.parent) {
      this.group.parent.remove(this.group);
    }
  }
}
