import * as THREE from 'three';
import { loadGLBModelOptimized } from '@/components/ThreeDAvatar';

// ── Disco Ball Shaders from CodePen with Day/Night Theme Support ─
const BALL_VERTEX_SHADER = `
  varying vec3 vNorm;
  varying vec3 vObj;
  varying vec3 vWorld;
  void main() {
    vObj   = position;
    vNorm  = normalize(normalMatrix * normal);
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const BALL_FRAGMENT_SHADER = `
  #define PI 3.14159265359
  precision highp float;

  uniform vec3  uCam;
  uniform float uTime;
  uniform vec3  uSpots[8];
  uniform vec3  uSpotCols[8];
  uniform float uDayFactor;

  varying vec3 vNorm;
  varying vec3 vObj;
  varying vec3 vWorld;

  vec3 tileNormal(vec3 p, float tiles) {
    vec3 n = normalize(p);
    float lat = asin(clamp(n.y, -1.0, 1.0));
    float lon = atan(n.z, n.x);
    float dLat = PI / tiles;
    float latQ = floor(lat / dLat + 0.5) * dLat;
    float rowTiles = max(1.0, floor(cos(latQ) * tiles * 2.0));
    float dLon = 2.0 * PI / rowTiles;
    float lonQ = floor(lon / dLon + 0.5) * dLon;
    return normalize(vec3(cos(latQ) * cos(lonQ), sin(latQ), cos(latQ) * sin(lonQ)));
  }

  float tileEdge(vec3 p, float tiles) {
    vec3 n = normalize(p);
    float lat = asin(clamp(n.y, -1.0, 1.0));
    float lon = atan(n.z, n.x);
    float dLat = PI / tiles;
    float rowTiles = max(1.0, floor(cos(floor(lat / dLat + 0.5) * dLat) * tiles * 2.0));
    float dLon = 2.0 * PI / rowTiles;
    float eLat = abs(fract(lat / dLat + 0.5) - 0.5) * 2.0;
    float eLon = abs(fract(lon / dLon + 0.5) - 0.5) * 2.0;
    float edge = max(eLat, eLon);
    return smoothstep(0.72, 0.98, edge);
  }

  void main() {
    float TILES = 28.0;

    vec3 N = normalize(vNorm);
    vec3 tN = tileNormal(vObj, TILES);
    float edge = tileEdge(vObj, TILES);

    vec3 V = normalize(uCam - vWorld);
    vec3 R = reflect(-V, tN);

    vec3 baseCol = mix(vec3(0.16), vec3(0.74, 0.70, 0.66), uDayFactor);
    vec3 col = baseCol;

    for(int i = 0; i < 8; i++) {
      vec3 L = normalize(uSpots[i]);
      float refl = max(dot(R, L), 0.0);
      float flash = pow(refl, 180.0) * 6.0;
      col += uSpotCols[i] * flash;
    }

    vec3 sunDir = normalize(vec3(1.2, 2.5, 1.8));
    float sunDot = max(dot(R, sunDir), 0.0);
    float sunFlash = pow(sunDot, 120.0) * (3.5 * uDayFactor);
    col += vec3(1.0, 0.88, 0.65) * sunFlash;

    float d = max(dot(tN, normalize(vec3(0.9, 8.0, 0.9))), 0.0);
    col += mix(vec3(0.8, 0.15, 0.10) * d, vec3(0.95, 0.82, 0.55) * d * 0.7, uDayFactor);

    vec3 H = normalize(normalize(vec3(-0.4, 1.5, 0.5)) + V);
    float sp = pow(max(dot(tN, H), 0.0), 200.0) * 9.5;
    col += vec3(0.6, 0.5, 0.2) * sp;

    vec3 edgeCol = mix(vec3(0.005), vec3(0.35, 0.32, 0.30), uDayFactor);
    col = mix(col, edgeCol, edge);

    float rim = pow(1.0 - max(dot(N, V), 0.0), 2.5) * 0.15;
    col += mix(vec3(0.1, 0.15, 0.25), vec3(0.9, 0.85, 0.75), uDayFactor) * rim;

    gl_FragColor = vec4(col, 1.0);
  }
`;

// ── Vedika Chamber Volumetric Spotlight Shader ────────────────
const CHAMBER_BEAM_VERTEX_SHADER = `
  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying vec3 vNorm;
  void main() {
    vUv = uv;
    vNorm = normalize(normalMatrix * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const CHAMBER_BEAM_FRAGMENT_SHADER = `
  precision highp float;
  uniform float uTime;
  uniform vec3  uColor;
  uniform float uIntensity;
  uniform float uOpacity;
  uniform float uFadePower;

  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying vec3 vNorm;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }

  void main() {
    float y = vUv.y; // 0.0 at floor base, 1.0 at top apex
    float angle = vUv.x * 6.2831853;

    float raySpeed = uTime * 0.45;
    float rays1 = sin(angle * 10.0 + raySpeed) * 0.5 + 0.5;
    float rays2 = cos(angle * 16.0 - raySpeed * 0.7) * 0.5 + 0.5;
    float rayField = rays1 * 0.6 + rays2 * 0.4;

    float dust = noise(vec2(angle * 5.0, y * 8.0 - uTime * 0.25)) * 0.15;
    
    // Smooth vertical fade: pure color softly faded from top down to floor
    float verticalFade = pow(clamp(y, 0.0, 1.0), uFadePower);

    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    float rim = pow(clamp(1.0 - abs(dot(vNorm, viewDir)), 0.0, 1.0), 1.3);

    float alpha = (0.25 + 0.75 * rayField + dust) * verticalFade * (0.3 + 0.7 * rim) * uIntensity * uOpacity;
    alpha = clamp(alpha, 0.0, 0.90);

    // PURE AVATAR COLOR ONLY: Zero white shades, zero pastel bleaching, purely that color faded
    gl_FragColor = vec4(uColor, alpha);
  }
`;

function hsvToRgb(h, s, v) {
  let r, g, b, i = Math.floor(h * 6), f = h * 6 - i, p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }
  return [r, g, b];
}

const AVATAR_DEFS = [
  {
    id: 'mowgli',
    name: 'Mowgli',
    texture: '/avatar_1_purple.webp',
    glowColor: '#39FF14',
    threeColor: 0x39FF14,
    audioSrc: '/audio/login/mowgli_hello.wav',
    spawnX: -1.9,
    spawnZ: 0.1,
    formationX: -2.3,
    formationZ: 0.1,
  },
  {
    id: 'belle',
    name: 'Belle',
    texture: '/avatar_2_lime.webp',
    glowColor: '#FF6EFF',
    threeColor: 0xFF6EFF,
    audioSrc: '/audio/login/belle_hello.wav',
    spawnX: -0.8,
    spawnZ: -0.9,
    formationX: -0.75,
    formationZ: -0.2,
  },
  {
    id: 'moana',
    name: 'Moana',
    texture: '/avatar_3_red.webp',
    glowColor: '#FF3131',
    threeColor: 0xFF3131,
    audioSrc: '/audio/login/moana_hello.wav',
    spawnX: 0.8,
    spawnZ: -0.9,
    formationX: 0.75,
    formationZ: -0.2,
  },
  {
    id: 'bhageera',
    name: 'Bhageera',
    texture: '/avatar_4_blue.webp',
    glowColor: '#FF5C00',
    threeColor: 0xFF5C00,
    audioSrc: '/audio/login/bhageera_hello.wav',
    spawnX: 1.9,
    spawnZ: 0.1,
    formationX: 2.3,
    formationZ: 0.1,
  },
];

// Smooth, aesthetic, non-glitching dance moves & partner duets
export const DANCE_MOVE_CATALOG = [
  { id: 'FUNKY_BOUNCE', name: 'Funky Bounce', type: 'solo', icon: '🦘', desc: 'Upbeat rhythmic vertical groove & soft sway' },
  { id: 'MOONWALK_GLIDE', name: 'Moonwalk Glide', type: 'solo', icon: '🌙', desc: 'Smooth reverse floor glide with rhythmic tilt' },
  { id: 'SIDE_SHUFFLE', name: 'Side Shuffle', type: 'solo', icon: '↔️', desc: 'Graceful lateral sway and step' },
  { id: 'HIP_ROLL_SWAY', name: 'Hip Roll Sway', type: 'solo', icon: '🌊', desc: 'Flowing continuous figure-8 torso roll' },
  { id: 'HEAD_BOB_NOD', name: 'Head Bob Groove', type: 'solo', icon: '🎵', desc: 'Deep bass rhythm continuous head nod' },
  { id: 'WAVE_BODY', name: 'Body Wave', type: 'solo', icon: '〰️', desc: 'Liquid spinal ripple wave motion' },
  { id: 'DISCO_POINT', name: 'Disco Point', type: 'solo', icon: '👉', desc: 'Classic stylish Saturday Night Fever groove' },
  { id: 'CHARLESTON_KICK', name: 'Charleston Kick', type: 'solo', icon: '🦵', desc: 'Relaxed twenties swing kick step' },
  { id: 'SLIDE_AND_DROP', name: 'Slide & Rise', type: 'solo', icon: '📉', desc: 'Dramatic smooth stage glide & recovery' },
  { id: 'TWIST_AND_SHOUT', name: 'Twist & Groove', type: 'solo', icon: '🎸', desc: 'Stylish 60s rock-and-roll continuous twist' },
  { id: 'FLOAT_HOVER', name: 'Anti-Grav Float', type: 'solo', icon: '🛸', desc: 'Zero-gravity smooth mystical levitation' },
  // Smooth Partner Duets (Zero violent spins or pops)
  { id: 'DO_SI_DO', name: 'Do-Si-Do Orbit (Duet)', type: 'pair', icon: '🔄', desc: 'Smooth back-to-back circular orbit' },
  { id: 'MIRROR_DUET', name: 'Mirror Sync (Duet)', type: 'pair', icon: '🪞', desc: 'Facing each other in perfect reflection' },
  { id: 'HIGH_FIVE_HOP', name: 'High-Five Hop (Duet)', type: 'pair', icon: '✋', desc: 'Synchronized celebratory air hop' },
];

export const AVATAR_LIST = AVATAR_DEFS.map((d, i) => ({
  index: i,
  id: d.id,
  name: d.name,
  glowColor: d.glowColor,
}));

export const DEFAULT_SPOTLIGHT_CONFIG = {
  beamOpacity: 1.0,
  beamIntensity: 1.15,
  beamFadePower: 1.3,
  topRadius: 0.05,
  bottomRadius: 0.75,
  beamHeight: 5.0,
  spotIntensity: 0.0,
  spotAngle: 0.20,
  spotPenumbra: 0.6,
  showFloorDisk: false,
  focusMode: 'mowgli',
};

const SOLO_MOVES = DANCE_MOVE_CATALOG.filter(m => m.type === 'solo').map(m => m.id);
const PAIR_MOVES = DANCE_MOVE_CATALOG.filter(m => m.type === 'pair').map(m => m.id);

/**
 * MascotDanceAgent
 * High-performance autonomous dance and roaming agent.
 */
class MascotDanceAgent {
  constructor(group, modelPivot, modelMesh, def, index, baseHeight) {
    this.group = group;
    this.modelPivot = modelPivot;
    this.modelMesh = modelMesh;
    this.def = def;
    this.index = index;
    this.baseHeight = baseHeight;

    // Viewport Boundaries (ensures mascots never leave camera frustum)
    this.minX = -3.2;
    this.maxX = 3.2;
    this.minZ = -1.8;
    this.maxZ = 0.85;

    // Spatial Position & Movement
    this.pos = new THREE.Vector3(def.spawnX, 0, def.spawnZ);
    this.targetPos = new THREE.Vector3(def.spawnX, 0, def.spawnZ);
    this.group.position.set(this.pos.x, 0, this.pos.z);
    this.isRoaming = true;
    this.walkSpeed = 1.30; // Constant, smooth, medium roaming speed
    this.walkCycle = Math.random() * Math.PI * 2;

    // Facing & Rotations
    this.rotY = 0;
    this.targetRotY = 0;
    this.tiltZ = 0;
    this.tiltX = 0;
    this.spinRot = 0;

    // Dance Move State Machine
    this.currentMove = SOLO_MOVES[index % SOLO_MOVES.length];
    this.moveTimer = 0;
    this.moveDuration = 3.6 + Math.random() * 2.0;
    this.tempoRate = 1.0; // Smooth unified medium tempo
    this.dancePhase = Math.random() * Math.PI * 2;
    this.forcedMove = false;

    // Smooth transition blend states (guarantees zero glitches or snaps when changing moves)
    this.currentBounceY = 0;
    this.currentTiltX = 0;
    this.currentSwayZ = 0;
    this.currentTwistY = 0;
    this.currentStretchY = 1.0;
    this.currentSquashXZ = 1.0;

    // Partner Duet & Wing Cheer State
    this.isPartnering = false;
    this.partnerIndex = null;
    this.partnerRoutine = null;
    this.partnerTimer = 0;
    this.partnerDuration = 99999;
    this.roleIndex = 0;
    this.isWingCheer = false;
    this.wingPos = new THREE.Vector3();
    this.danceAnchor = new THREE.Vector3(def.spawnX, 0, def.spawnZ);

    // Collision & Ripple Harmonic Oscillator State
    this.rippleTime = 10.0;
    this.rippleIntensity = 0.0;
    this.recoilHop = 0.0;
    this.recoilVelocity = new THREE.Vector3();

    // Cheer Flip State
    this.isCheering = false;
    this.cheerTimer = 0;

    this.pickNextRoamTarget();
  }

  _lerpAngle(current, target, alpha) {
    let diff = (target - current) % (Math.PI * 2);
    if (diff < -Math.PI) diff += Math.PI * 2;
    if (diff > Math.PI) diff -= Math.PI * 2;
    return current + diff * alpha;
  }

  getEffectiveBounds() {
    // Strict White Box Boundary: Keep avatars on visible front-center dancefloor
    // minZ = -0.70 (just above avatars' heads, well below disco ball & upper UI)
    // maxZ =  0.40 (above bottom 404 pill and instruction footer)
    // X = [-3.2, 3.2] (generous dance width, well within viewport side margins)
    const zClamped = THREE.MathUtils.clamp(this.pos.z, -0.70, 0.40);
    const tZ = (zClamped - (-0.70)) / (0.40 - (-0.70));
    const boundX = THREE.MathUtils.lerp(3.2, 2.7, tZ);
    return {
      minX: -boundX,
      maxX: boundX,
      minZ: -0.70,
      maxZ: 0.40,
    };
  }

  pickNextRoamTarget() {
    this.isRoaming = true;
    const bounds = this.getEffectiveBounds();
    const marginX = 0.40;
    const marginZ = 0.18;

    // Smoothly pick a destination inside the user's white boundary box
    let tx, tz;
    if (this.pos.x < bounds.minX + 0.7) {
      // Near left boundary: steer towards center or right
      tx = bounds.minX + 0.7 + Math.random() * (bounds.maxX - bounds.minX - 1.1);
    } else if (this.pos.x > bounds.maxX - 0.7) {
      // Near right boundary: steer towards center or left
      tx = bounds.minX + 0.4 + Math.random() * (bounds.maxX - bounds.minX - 1.1);
    } else {
      // In middle: roam freely across central dancefloor
      tx = bounds.minX + marginX + Math.random() * (bounds.maxX - bounds.minX - marginX * 2);
    }

    if (this.pos.z < bounds.minZ + 0.35) {
      // Near top/back boundary: steer towards front/middle
      tz = bounds.minZ + 0.30 + Math.random() * (bounds.maxZ - bounds.minZ - 0.45);
    } else if (this.pos.z > bounds.maxZ - 0.30) {
      // Near bottom/front boundary: steer towards middle/back
      tz = bounds.minZ + 0.15 + Math.random() * (bounds.maxZ - bounds.minZ - 0.45);
    } else {
      tz = bounds.minZ + marginZ + Math.random() * (bounds.maxZ - bounds.minZ - marginZ * 2);
    }

    this.targetPos.set(
      THREE.MathUtils.clamp(tx, bounds.minX + marginX, bounds.maxX - marginX),
      0,
      THREE.MathUtils.clamp(tz, bounds.minZ + marginZ, bounds.maxZ - marginZ)
    );
  }

  setExplicitMove(moveId) {
    this.currentMove = moveId;
    this.moveTimer = 0;
    this.moveDuration = 99999; // Persist chosen dance move until user selects another
    this.forcedMove = true;
    this.isRoaming = false;
    this.isPartnering = false;
    this.isWingCheer = false;
    this.targetRotY = 0; // Turn towards front camera to show off the move!

    const bounds = this.getEffectiveBounds();
    this.danceAnchor.copy(this.pos);
    this.danceAnchor.x = THREE.MathUtils.clamp(this.danceAnchor.x, bounds.minX + 0.60, bounds.maxX - 0.60);
    this.danceAnchor.z = THREE.MathUtils.clamp(this.danceAnchor.z, bounds.minZ + 0.30, bounds.maxZ - 0.30);
  }

  setWingCheer(wingPosition) {
    this.isPartnering = false;
    this.forcedMove = false;
    this.isRoaming = false;
    this.isWingCheer = true;
    this.wingPos.copy(wingPosition);
    this.targetRotY = wingPosition.x < 0 ? 0.35 : -0.35;
  }

  triggerCheer() {
    this.isCheering = true;
    this.cheerTimer = 0;
    try {
      const snd = new Audio(this.def.audioSrc);
      snd.volume = 0.85;
      snd.play().catch(() => {});
    } catch {}
  }

  triggerCollisionRipple(recoilPush) {
    // Never interrupt a user-chosen solo move, partner duet, or wing performance!
    if (this.forcedMove || this.isPartnering || this.isWingCheer) return;

    this.rippleTime = 0.0;
    this.rippleIntensity = 0.25;
    this.recoilHop = 0.15;
    this.recoilVelocity.copy(recoilPush).multiplyScalar(1.4);

    this.isRoaming = true;
    this.targetPos.addScaledVector(recoilPush, 1.4);
    const bounds = this.getEffectiveBounds();
    this.targetPos.x = THREE.MathUtils.clamp(this.targetPos.x, bounds.minX + 0.35, bounds.maxX - 0.35);
    this.targetPos.z = THREE.MathUtils.clamp(this.targetPos.z, bounds.minZ + 0.25, bounds.maxZ - 0.25);
    this.targetRotY = Math.atan2(recoilPush.x, recoilPush.z);
  }

  startPartnerRoutine(partnerIdx, routineName, sharedCenter, roleIndex = 0) {
    this.isPartnering = true;
    this.partnerIndex = partnerIdx;
    this.partnerRoutine = routineName;
    this.partnerTimer = 0;
    this.partnerDuration = 99999;
    this.forcedMove = false;
    this.isRoaming = false;
    this.isWingCheer = false;
    this.roleIndex = roleIndex;
    this.partnerCenter = sharedCenter ? sharedCenter.clone() : this.pos.clone();
    const bounds = this.getEffectiveBounds();
    this.partnerCenter.x = THREE.MathUtils.clamp(this.partnerCenter.x, bounds.minX + 0.85, bounds.maxX - 0.85);
    this.partnerCenter.z = THREE.MathUtils.clamp(this.partnerCenter.z, bounds.minZ + 0.40, bounds.maxZ - 0.40);
    this.partnerAngle = roleIndex === 0 ? 0 : Math.PI;
  }

  endPartnerRoutine() {
    this.isPartnering = false;
    this.partnerIndex = null;
    this.partnerRoutine = null;
    this.partnerCenter = null;
    this.pickNewMove();
    this.pickNextRoamTarget();
  }

  pickNewMove(busyMoves = []) {
    if (this.forcedMove) return;
    const choices = SOLO_MOVES.filter(m => !busyMoves.includes(m) && m !== this.currentMove);
    this.currentMove = choices[Math.floor(Math.random() * choices.length)] || 'FUNKY_BOUNCE';
    this.moveTimer = 0;
    this.moveDuration = 3.2 + Math.random() * 3.5;

    if (Math.random() < 0.65) {
      this.pickNextRoamTarget();
    } else {
      this.isRoaming = false;
      this.targetRotY = (Math.random() - 0.5) * 0.4;
    }
  }

  update(dt, t, beatTime, allAgents, inGroupFormation, isSpotlightLead) {
    this.moveTimer += dt;
    this.rippleTime += dt;

    // Safety check against NaN values
    if (!isFinite(this.pos.x)) this.pos.x = this.def.spawnX;
    if (!isFinite(this.pos.z)) this.pos.z = this.def.spawnZ;

    // 1. Cheer Jump Flip Override (Slow, floaty acrobatic somersault)
    if (this.isCheering) {
      this.cheerTimer += dt * 2.2;
      const jumpY = Math.sin(Math.min(this.cheerTimer, Math.PI)) * 1.15;
      this.group.position.y = jumpY;
      this.spinRot += dt * 4.5;
      this.group.rotation.y = this.rotY + this.spinRot;
      this.modelPivot.scale.set(1.08, 1.15, 1.08);
      if (this.cheerTimer >= Math.PI) {
        this.isCheering = false;
        this.spinRot = 0;
      }
      return;
    }

    // 2. Elastic Collision Ripple Damping (Gentle, pillow-soft recoil - no violent shaking)
    let rippleSquash = 1.0;
    let rippleStretch = 1.0;
    if (this.rippleTime < 1.2) {
      const rippleWave = Math.sin(this.rippleTime * 4.0) * Math.exp(-this.rippleTime * 3.0);
      rippleSquash = 1.0 + rippleWave * 0.08;
      rippleStretch = 1.0 - rippleWave * 0.05;

      this.recoilHop = Math.max(0, this.recoilHop - dt * 0.6);
      this.pos.addScaledVector(this.recoilVelocity, dt);
      this.recoilVelocity.multiplyScalar(0.82);
    }

    // 3. Periodic Group Formation Mode (Smooth unified groove)
    if (inGroupFormation) {
      this.targetPos.set(this.def.formationX, 0, this.def.formationZ);
      this.pos.lerp(this.targetPos, dt * 2.5);
      this.group.position.x = this.pos.x;
      this.group.position.z = this.pos.z;

      const syncBeat = t * 1.5; // Slow, unified, elegant group rhythm
      const hop = Math.pow(Math.abs(Math.sin(syncBeat)), 1.4);
      const bounceY = hop * 0.11;
      this.group.position.y = bounceY;

      this.rotY = THREE.MathUtils.lerp(this.rotY, 0, dt * 3.0);
      this.group.rotation.y = this.rotY + Math.sin(syncBeat * 0.5) * 0.08;
      this.group.rotation.z = Math.cos(syncBeat * 0.5) * 0.05;

      this.modelPivot.scale.set(1.0 - (hop - 0.4) * 0.04, 1.0 + (hop - 0.4) * 0.07, 1.0 - (hop - 0.4) * 0.04);
      return;
    }

    // 4. Wing Cheer Support Mode (For supporting dancers on stage wings)
    if (this.isWingCheer) {
      this.pos.lerp(this.wingPos, dt * 3.5);
      this.rotY = this._lerpAngle(this.rotY, this.wingPos.x < 0 ? 0.35 : -0.35, 0.12);
      const cheerHop = Math.pow(Math.abs(Math.sin(t * 1.4)), 1.4) * 0.10;
      const blendRate = 1.0 - Math.exp(-6.0 * dt);
      this.currentBounceY = THREE.MathUtils.lerp(this.currentBounceY, cheerHop, blendRate);
      this.currentTiltX = THREE.MathUtils.lerp(this.currentTiltX, 0.04, blendRate);
      this.currentSwayZ = THREE.MathUtils.lerp(this.currentSwayZ, Math.sin(t * 1.4) * 0.06, blendRate);
      this.currentTwistY = THREE.MathUtils.lerp(this.currentTwistY, 0, blendRate);

      this.group.position.set(this.pos.x, this.currentBounceY, this.pos.z);
      this.group.rotation.set(this.currentTiltX, this.rotY, this.currentSwayZ);
      this.modelPivot.scale.set(1.0, 1.0 + cheerHop * 0.08, 1.0);
      return;
    }

    // 5. Partner Duet Routine Execution (Strict Standoff Separation >= 2.16m, Zero Merge Possible)
    if (this.isPartnering) {
      this.partnerTimer += dt;
      const center = this.partnerCenter || this.pos;

      switch (this.partnerRoutine) {
        case 'DO_SI_DO': {
          const orbitRadiusX = 1.20; // 2.40m separation on X
          const orbitRadiusZ = 0.85; // 1.70m separation on Z -> absolute minimum separation never drops below 1.70m!
          const orbitSpeed = 0.65; // Slow, graceful waltz orbit
          const angle = (t * orbitSpeed) + (this.roleIndex === 0 ? 0 : Math.PI);
          const targetX = center.x + Math.cos(angle) * orbitRadiusX;
          const targetZ = center.z + Math.sin(angle) * orbitRadiusZ;

          this.pos.x = THREE.MathUtils.lerp(this.pos.x, targetX, Math.min(dt * 3.5, 1.0));
          this.pos.z = THREE.MathUtils.lerp(this.pos.z, targetZ, Math.min(dt * 3.5, 1.0));

          // Face smoothly along curve / inward towards partner
          const toCenterX = center.x - this.pos.x;
          const toCenterZ = center.z - this.pos.z;
          const faceAngle = Math.atan2(toCenterX, toCenterZ);
          this.rotY = this._lerpAngle(this.rotY, faceAngle, 0.10);

          const hop = Math.pow(Math.abs(Math.sin(t * 1.3)), 1.4) * 0.12;
          const blendRate = 1.0 - Math.exp(-6.0 * dt);
          this.currentBounceY = THREE.MathUtils.lerp(this.currentBounceY, hop, blendRate);
          this.currentTiltX = THREE.MathUtils.lerp(this.currentTiltX, 0.04, blendRate);
          this.currentSwayZ = THREE.MathUtils.lerp(this.currentSwayZ, Math.sin(t * 1.3) * 0.07, blendRate);

          this.group.position.set(this.pos.x, this.currentBounceY, this.pos.z);
          this.group.rotation.set(this.currentTiltX, this.rotY, this.currentSwayZ);
          this.modelPivot.scale.set(1.0 - hop * 0.04, 1.0 + hop * 0.08, 1.0 - hop * 0.04);
          return;
        }
        case 'MIRROR_DUET': {
          const standoff = 1.15; // Strict 2.30m separation facing each other
          const sideSign = this.roleIndex === 0 ? -1 : 1;
          const targetX = center.x + sideSign * standoff;
          const targetZ = center.z;

          this.pos.x = THREE.MathUtils.lerp(this.pos.x, targetX, Math.min(dt * 3.5, 1.0));
          this.pos.z = THREE.MathUtils.lerp(this.pos.z, targetZ, Math.min(dt * 3.5, 1.0));

          // Face directly towards partner
          const faceAngle = sideSign < 0 ? Math.PI / 2 : -Math.PI / 2;
          this.rotY = this._lerpAngle(this.rotY, faceAngle, 0.10);

          // Symmetrical mirror dance: slow synchronous sway and bounce
          const mirrorBeat = t * 1.2;
          const hop = Math.pow(Math.abs(Math.sin(mirrorBeat)), 1.4) * 0.12;
          const mirrorSway = Math.sin(mirrorBeat) * 0.10 * sideSign;
          const mirrorTilt = Math.sin(mirrorBeat * 0.5) * 0.06;

          const blendRate = 1.0 - Math.exp(-6.0 * dt);
          this.currentBounceY = THREE.MathUtils.lerp(this.currentBounceY, hop, blendRate);
          this.currentTiltX = THREE.MathUtils.lerp(this.currentTiltX, mirrorTilt, blendRate);
          this.currentSwayZ = THREE.MathUtils.lerp(this.currentSwayZ, mirrorSway, blendRate);

          this.group.position.set(this.pos.x, this.currentBounceY, this.pos.z);
          this.group.rotation.set(this.currentTiltX, this.rotY, this.currentSwayZ);
          this.modelPivot.scale.set(1.0 - hop * 0.04, 1.0 + hop * 0.08, 1.0 - hop * 0.04);
          return;
        }
        case 'HIGH_FIVE_HOP':
        default: {
          const sideSign = this.roleIndex === 0 ? -1 : 1;
          const cycle = t * 0.95; // Deliberate, relaxed timing
          // Smooth continuous curve (replaces abrupt boolean switch)
          const inwardAmount = Math.pow(Math.max(0, Math.sin(cycle)), 1.5);
          const currentDist = 1.30 - inwardAmount * 0.22; // 1.30m -> 1.08m (2.16m minimum separation, zero merge!)
          const targetX = center.x + sideSign * currentDist;
          const targetZ = center.z;

          this.pos.x = THREE.MathUtils.lerp(this.pos.x, targetX, Math.min(dt * 3.5, 1.0));
          this.pos.z = THREE.MathUtils.lerp(this.pos.z, targetZ, Math.min(dt * 3.5, 1.0));

          const faceAngle = sideSign < 0 ? Math.PI / 2 : -Math.PI / 2;
          this.rotY = this._lerpAngle(this.rotY, faceAngle, 0.10);

          const hop = inwardAmount * 0.18;
          const highTilt = sideSign * (-inwardAmount * 0.08);

          const blendRate = 1.0 - Math.exp(-6.0 * dt);
          this.currentBounceY = THREE.MathUtils.lerp(this.currentBounceY, hop, blendRate);
          this.currentTiltX = THREE.MathUtils.lerp(this.currentTiltX, 0, blendRate);
          this.currentSwayZ = THREE.MathUtils.lerp(this.currentSwayZ, highTilt, blendRate);

          this.group.position.set(this.pos.x, this.currentBounceY, this.pos.z);
          this.group.rotation.set(this.currentTiltX, this.rotY, this.currentSwayZ);
          this.modelPivot.scale.set(1.0 - hop * 0.04, 1.0 + hop * 0.08, 1.0 - hop * 0.04);
          return;
        }
      }
    }

    // 6. Active Spatial Roaming (Only in Auto Freestyle Mode)
    if (this.isRoaming && !this.forcedMove) {
      const toTarget = new THREE.Vector2(this.targetPos.x - this.pos.x, this.targetPos.z - this.pos.z);
      const dist = toTarget.length();

      if (dist > 0.35) {
        toTarget.normalize();
        this.pos.x += toTarget.x * this.walkSpeed * dt;
        this.pos.z += toTarget.y * this.walkSpeed * dt;

        // Viewport boundary guard during roaming
        const bnd = this.getEffectiveBounds();
        const hitEdge = this.pos.x <= bnd.minX || this.pos.x >= bnd.maxX || this.pos.z <= bnd.minZ || this.pos.z >= bnd.maxZ;
        this.pos.x = THREE.MathUtils.clamp(this.pos.x, bnd.minX, bnd.maxX);
        this.pos.z = THREE.MathUtils.clamp(this.pos.z, bnd.minZ, bnd.maxZ);

        if (hitEdge) {
          this.pickNextRoamTarget();
        }

        const walkAngle = Math.atan2(toTarget.x, toTarget.y);
        this.rotY = this._lerpAngle(this.rotY, walkAngle, 0.14);

        this.walkCycle += dt * 3.0;
        const walkBounce = Math.abs(Math.sin(this.walkCycle)) * 0.08;
        const blendR = Math.min(dt * 7.0, 1.0);
        this.currentBounceY = THREE.MathUtils.lerp(this.currentBounceY, walkBounce, blendR);
        this.currentTiltX = THREE.MathUtils.lerp(this.currentTiltX, 0, blendR);
        this.currentSwayZ = THREE.MathUtils.lerp(this.currentSwayZ, Math.sin(this.walkCycle) * 0.04, blendR);
        this.currentTwistY = THREE.MathUtils.lerp(this.currentTwistY, 0, blendR);

        this.group.position.set(this.pos.x, this.currentBounceY + this.recoilHop, this.pos.z);
        this.group.rotation.set(this.currentTiltX, this.rotY + this.currentTwistY, this.currentSwayZ);

        this.modelPivot.scale.set(rippleSquash, rippleStretch * (1.0 + this.currentBounceY * 0.12), rippleSquash);
        return;
      } else {
        this.isRoaming = false;
        this.targetRotY = (Math.random() - 0.5) * 0.5;
        this.moveTimer = 0;
      }
    }

    // Check Move Duration Expiry (Only in Auto Mode)
    if (this.moveTimer >= this.moveDuration && !this.forcedMove) {
      const busyMoves = allAgents.map(a => a.currentMove);
      this.pickNewMove(busyMoves);
    }

    // Turn towards target angle smoothly
    this.rotY = this._lerpAngle(this.rotY, this.targetRotY, 0.08);

    const cycle = (beatTime * this.tempoRate) + this.dancePhase;
    const highlightBoost = isSpotlightLead ? 1.25 : 1.0;

    let bounceY = 0;
    let stretchY = 1.0;
    let squashXZ = 1.0;
    let swayZ = 0;
    let twistY = 0;
    let tiltX = 0;
    let offsetX = 0;
    let offsetZ = 0;

    // 7. Master Dance Engine: 11 Distinct, Slow, Smooth, High-Perfection Choreographies
    // Strictly adhering to "Optimizing Avatar Dance Animations Smoothness.md":
    // - Low amplitudes: twist <= 0.26, tilt <= 0.14, hop <= 0.18, offset <= 0.24, stretch <= 1.06
    // - Continuous curves: 0 boolean ternary switches (replaces snap jumps with sinusoidal eases)
    // - Independent gentle tempos: relaxed, graceful, deliberate groove
    switch (this.currentMove) {
      case 'FUNKY_BOUNCE': {
        const mCycle = cycle * 0.75;
        const bounceHop = Math.pow(Math.abs(Math.sin(mCycle)), 1.5);
        bounceY = bounceHop * 0.18 * highlightBoost;
        stretchY = 1.0 + (bounceHop - 0.35) * 0.08;
        squashXZ = 1.0 - (bounceHop - 0.35) * 0.04;
        swayZ = Math.sin(mCycle * 0.5) * 0.09;
        tiltX = Math.cos(mCycle) * 0.06;
        twistY = Math.sin(mCycle * 0.5) * 0.12;
        break;
      }
      case 'MOONWALK_GLIDE': {
        const mCycle = cycle * 0.60;
        offsetZ = Math.sin(mCycle * 0.5) * 0.22;
        bounceY = Math.pow(Math.abs(Math.cos(mCycle)), 1.4) * 0.08;
        tiltX = -0.07 + Math.sin(mCycle * 0.5) * 0.05;
        twistY = Math.sin(mCycle * 0.5) * 0.14;
        swayZ = Math.cos(mCycle) * 0.05;
        break;
      }
      case 'SIDE_SHUFFLE': {
        const mCycle = cycle * 0.65;
        const sideTravel = Math.sin(mCycle * 0.5);
        offsetX = sideTravel * 0.24;
        bounceY = Math.pow(Math.abs(Math.sin(mCycle)), 1.4) * 0.12;
        swayZ = -sideTravel * 0.12;
        tiltX = Math.abs(Math.sin(mCycle)) * 0.05;
        twistY = sideTravel * 0.10;
        break;
      }
      case 'HIP_ROLL_SWAY': {
        const mCycle = cycle * 0.60;
        offsetX = Math.cos(mCycle * 0.5) * 0.16;
        offsetZ = Math.sin(mCycle) * 0.09;
        swayZ = Math.cos(mCycle * 0.5) * 0.14;
        tiltX = Math.sin(mCycle) * 0.08;
        twistY = Math.sin(mCycle * 0.5) * 0.16;
        bounceY = 0.04 + Math.abs(Math.sin(mCycle * 0.5)) * 0.06;
        break;
      }
      case 'HEAD_BOB_NOD': {
        const mCycle = cycle * 0.65;
        const nod = Math.pow(Math.max(0, Math.sin(mCycle)), 1.4);
        tiltX = 0.04 + nod * 0.14;
        bounceY = nod * 0.09;
        twistY = Math.sin(mCycle * 0.5) * 0.10;
        swayZ = Math.cos(mCycle * 0.5) * 0.06;
        stretchY = 1.0 + (tiltX - 0.07) * 0.06;
        break;
      }
      case 'WAVE_BODY': {
        const mCycle = cycle * 0.55;
        tiltX = Math.sin(mCycle) * 0.14;
        bounceY = 0.06 + Math.cos(mCycle) * 0.08;
        offsetZ = Math.sin(mCycle) * 0.12;
        stretchY = 1.0 + Math.sin(mCycle) * 0.06;
        squashXZ = 1.0 - Math.sin(mCycle) * 0.03;
        swayZ = Math.sin(mCycle * 0.5) * 0.06;
        break;
      }
      case 'DISCO_POINT': {
        // Continuous smooth reach (replaces abrupt boolean switch)
        const mCycle = cycle * 0.55;
        const reach = Math.sin(mCycle);
        bounceY = 0.05 + Math.pow(Math.max(0, reach), 1.5) * 0.16;
        tiltX = reach * 0.09;
        twistY = Math.sin(mCycle * 0.5) * 0.22;
        swayZ = Math.cos(mCycle * 0.5) * 0.12;
        stretchY = 1.0 + reach * 0.06;
        squashXZ = 1.0 - reach * 0.03;
        break;
      }
      case 'CHARLESTON_KICK': {
        // Slow single-frequency swing (replaces double-speed 2.0x frequency)
        const mCycle = cycle * 0.55;
        twistY = Math.sin(mCycle) * 0.24;
        bounceY = Math.pow(Math.abs(Math.sin(mCycle)), 1.3) * 0.14;
        swayZ = Math.cos(mCycle * 0.5) * 0.10;
        tiltX = 0.04 + Math.sin(mCycle) * 0.06;
        break;
      }
      case 'SLIDE_AND_DROP': {
        // Continuous smooth slide and gentle rise (replaces abrupt dropping boolean switch)
        const mCycle = cycle * 0.50;
        offsetX = Math.sin(mCycle) * 0.22;
        bounceY = 0.04 + Math.pow(Math.max(0, Math.cos(mCycle)), 1.4) * 0.14;
        tiltX = Math.sin(mCycle) * 0.08;
        swayZ = -Math.sin(mCycle) * 0.08;
        stretchY = 1.0 + Math.cos(mCycle) * 0.05;
        break;
      }
      case 'TWIST_AND_SHOUT': {
        // Elegant continuous 60s twist (reduced from 0.70 rad violent twist to gentle 0.26 rad)
        const mCycle = cycle * 0.60;
        twistY = Math.sin(mCycle) * 0.26;
        bounceY = Math.pow(Math.abs(Math.cos(mCycle)), 1.3) * 0.12;
        swayZ = Math.sin(mCycle * 0.5) * 0.08;
        tiltX = 0.04 + Math.abs(Math.sin(mCycle)) * 0.04;
        squashXZ = 1.0 + Math.abs(Math.sin(mCycle)) * 0.04;
        stretchY = 1.0 - Math.abs(Math.sin(mCycle)) * 0.03;
        break;
      }
      case 'FLOAT_HOVER':
      default: {
        const mCycle = cycle * 0.45;
        bounceY = 0.24 + Math.sin(mCycle) * 0.08;
        offsetX = Math.sin(mCycle * 0.5) * 0.12;
        offsetZ = Math.cos(mCycle * 0.5) * 0.08;
        tiltX = Math.sin(mCycle * 0.5) * 0.06;
        swayZ = Math.cos(mCycle * 0.5) * 0.06;
        twistY = Math.sin(mCycle * 0.25) * 0.10;
        stretchY = 1.02 + Math.sin(mCycle) * 0.03;
        break;
      }
    }

    // Spatial Anchor translation when performing dance moves
    if (this.forcedMove) {
      const targetPosX = this.danceAnchor.x + offsetX;
      const targetPosZ = this.danceAnchor.z + offsetZ;
      this.pos.x = THREE.MathUtils.lerp(this.pos.x, targetPosX, Math.min(dt * 5.0, 1.0));
      this.pos.z = THREE.MathUtils.lerp(this.pos.z, targetPosZ, Math.min(dt * 5.0, 1.0));
    }

    // Dynamic boundary & corner encounter detection within the user's white box
    const bounds = this.getEffectiveBounds();
    const marginX = 0.35;
    const marginZ = 0.15;
    const nearLeft = (this.pos.x - bounds.minX) < marginX;
    const nearRight = (bounds.maxX - this.pos.x) < marginX;
    const nearBack = (this.pos.z - bounds.minZ) < marginZ;
    const nearFront = (bounds.maxZ - this.pos.z) < marginZ;
    const isAtBoundary = nearLeft || nearRight || nearBack || nearFront;

    if (isAtBoundary && !inGroupFormation && !this.isPartnering && !this.forcedMove) {
      if (nearLeft) this.pos.x += 1.6 * dt;
      if (nearRight) this.pos.x -= 1.6 * dt;
      if (nearBack) this.pos.z += 1.4 * dt;
      if (nearFront) this.pos.z -= 1.4 * dt;

      const inwardAngle = Math.atan2(-this.pos.x, -this.pos.z - 0.1);
      this.rotY = this._lerpAngle(this.rotY, inwardAngle, 0.14);

      if (this.isRoaming) {
        const toTargetX = this.targetPos.x - this.pos.x;
        const toTargetZ = this.targetPos.z - this.pos.z;
        if ((nearLeft && toTargetX < 0) || (nearRight && toTargetX > 0) ||
            (nearBack && toTargetZ < 0) || (nearFront && toTargetZ > 0)) {
          this.pickNextRoamTarget();
        }
      }

      this.moveTimer += dt * 2.5;
      if (this.moveTimer >= 1.5 && !this.isRoaming) {
        this.pickNextRoamTarget();
      }
    }

    // Multi-channel continuous smoothing (frame-rate independent exponential spring blend)
    const blendRate = 1.0 - Math.exp(-6.0 * dt);
    this.currentBounceY = THREE.MathUtils.lerp(this.currentBounceY, bounceY, blendRate);
    this.currentTiltX = THREE.MathUtils.lerp(this.currentTiltX, tiltX, blendRate);
    this.currentSwayZ = THREE.MathUtils.lerp(this.currentSwayZ, swayZ, blendRate);
    this.currentTwistY = THREE.MathUtils.lerp(this.currentTwistY, twistY, blendRate);
    this.currentStretchY = THREE.MathUtils.lerp(this.currentStretchY, stretchY, blendRate);
    this.currentSquashXZ = THREE.MathUtils.lerp(this.currentSquashXZ, squashXZ, blendRate);

    // Guaranteed Viewport Confinement: Strict white boundary box clamp
    this.pos.x = THREE.MathUtils.clamp(this.pos.x, bounds.minX, bounds.maxX);
    this.pos.z = THREE.MathUtils.clamp(this.pos.z, bounds.minZ, bounds.maxZ);

    // Guaranteed Zero Submersion: Base sits exactly on top of floor Y=-2.18
    this.group.position.set(this.pos.x, this.currentBounceY + this.recoilHop, this.pos.z);
    this.group.rotation.set(this.currentTiltX, this.rotY + this.currentTwistY, this.currentSwayZ);

    this.modelPivot.scale.set(
      this.currentSquashXZ * rippleSquash,
      this.currentStretchY * rippleStretch,
      this.currentSquashXZ * rippleSquash
    );
  }
}

export class DiscoScene {
  constructor(container) {
    this.container = container;
    this.isDisposed = false;
    this.time = 0;
    this.clock = new THREE.Clock();

    this.isDayMode = false;
    this.dayLerp = 0.0;

    // Active Spotlight Studio Customizer State
    this.spotlightConfig = { ...DEFAULT_SPOTLIGHT_CONFIG };

    // Pre-allocated theme colors (Zero GC pressure in render loop)
    this._colNightFog = new THREE.Color(0x040407);
    this._colMorningFog = new THREE.Color(0xFFE8D6);
    this._colNightRoom = new THREE.Color(0x07080e);
    this._colMorningRoom = new THREE.Color(0xFDEEE2);
    this._colNightFloor = new THREE.Color(0x0a0c16);
    this._colMorningFloor = new THREE.Color(0xF5EBE1);

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Optimized WebGL Renderer with High-Performance DPI Capping
    const isCanvas = typeof HTMLCanvasElement !== 'undefined' && container instanceof HTMLCanvasElement;
    this.renderer = new THREE.WebGLRenderer({
      canvas: isCanvas ? container : undefined,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
      precision: 'mediump',
      stencil: false,
      depth: true
    });
    const area = width * height;
    const targetDpr = area > 1920 * 1080 ? 1.0 : Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 1.25);
    this.renderer.setPixelRatio(targetDpr);
    this.renderer.setSize(width, height);
    this.renderer.setClearColor(0x040407);
    this.renderer.shadowMap.enabled = false;
    if (!isCanvas) {
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
      this.renderer.domElement.style.width = '100%';
      this.renderer.domElement.style.height = '100%';
      this.renderer.domElement.style.display = 'block';
      container.appendChild(this.renderer.domElement);
    }

    this.renderer.domElement.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      if (this.animId) cancelAnimationFrame(this.animId);
    }, false);


    // 2. Scene & Fog
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x040407, 0.035);

    // 3. Camera Framed Closer & Focused on Large Mascots
    this.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    this.camera.position.set(0, 0.75, 5.5);
    this.camera.lookAt(0, -0.35, 0);

    // 4. Room & Reflective Dance Floor
    this.roomMat = new THREE.MeshStandardMaterial({ color: 0x07080e, roughness: 1.0, metalness: 0, side: THREE.BackSide });
    this.room = new THREE.Mesh(new THREE.BoxGeometry(36, 20, 36), this.roomMat);
    this.room.position.y = 1;
    this.scene.add(this.room);

    this.floorMat = new THREE.MeshStandardMaterial({ color: 0x0a0c16, roughness: 0.18, metalness: 0.72 });
    this.floor = new THREE.Mesh(new THREE.PlaneGeometry(36, 36), this.floorMat);
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.position.y = -2.2;
    this.scene.add(this.floor);

    // 5. Lighting Setup
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.32);
    this.scene.add(this.ambientLight);

    this.keyLight = new THREE.DirectionalLight(0xffffff, 0.85);
    this.keyLight.position.set(0, 8, 4);
    this.scene.add(this.keyLight);

    this.sunLight = new THREE.DirectionalLight(0xffdfa8, 0.0);
    this.sunLight.position.set(5, 9, 6);
    this.scene.add(this.sunLight);

    // 6. Shader Disco Ball & Hanging Wire
    this._initDiscoBall();

    // 7. 8 Orbiting Pin Spotlights
    this._initSpotlights();

    // 8. 200 Optimized Floating Glitter Particles
    this._initParticles();

    // 9. Vedika Chamber Volumetric Spotlight & Glowing Pedestal
    this._initChamberSpotlight();

    // 10. Mascot Avatars
    this.avatars = [];
    this.danceAgents = [];
    this.avatarGroup = new THREE.Group();
    this.avatarGroup.position.set(0, -2.18, 0); // Exact floor anchor
    this.scene.add(this.avatarGroup);
    this._loadDancingAvatars();

    // Group Synchronized Formation State
    this.inGroupFormation = false;
    this.formationTimer = 0;
    this.nextFormationTime = 18.0 + Math.random() * 8.0;

    // 11. Interactive Drag-to-spin Physics & Raycasting
    this.rotY = 0;
    this.velX = 0.014;
    this.isDragging = false;
    this.lastMX = 0;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    // Scratch vectors for zero-GC allocation in 60 FPS loop
    this._tmpDir = new THREE.Vector3();
    this._tmpSrc = new THREE.Vector3();
    this._tmpMid = new THREE.Vector3();
    this._tmpDelta = new THREE.Vector3();
    this._tmpFwdA = new THREE.Vector3();
    this._tmpFwdB = new THREE.Vector3();
    this._tmpSideA = new THREE.Vector3();
    this._tmpSideB = new THREE.Vector3();
    this._tmpRecoilA = new THREE.Vector3();

    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);
    this._onResize = this._onResize.bind(this);

    window.addEventListener('mousedown', this._onPointerDown);
    window.addEventListener('mousemove', this._onPointerMove);
    window.addEventListener('mouseup', this._onPointerUp);
    window.addEventListener('touchstart', this._onPointerDown, { passive: true });
    window.addEventListener('touchmove', this._onPointerMove, { passive: false });
    window.addEventListener('touchend', this._onPointerUp);
    window.addEventListener('resize', this._onResize);

    // 12. Initial resize & Render Animation Loop
    this._onResize();
    this._animate = this._animate.bind(this);
    this.animId = requestAnimationFrame(this._animate);
  }

  toggleTheme() {
    this.isDayMode = !this.isDayMode;
    return this.isDayMode;
  }

  setTheme(isDay) {
    this.isDayMode = !!isDay;
    return this.isDayMode;
  }

  // Interactive Dance Move Selector API
  triggerDanceMove(moveId, targetAvatarIdx = -1) {
    if (moveId === 'AUTO' || moveId === 'AUTO_GROOVE') {
      this.inGroupFormation = false;
      this.danceAgents.forEach(agent => {
        agent.forcedMove = false;
        agent.isPartnering = false;
        agent.isWingCheer = false;
        agent.isRoaming = true;
        agent.pickNextRoamTarget();
      });
      return;
    }

    if (moveId === 'GROUP_FORMATION') {
      this.inGroupFormation = true;
      this.formationTimer = 0;
      this.danceAgents.forEach(agent => {
        agent.forcedMove = false;
        agent.isPartnering = false;
        agent.isWingCheer = false;
      });
      return;
    }

    if (PAIR_MOVES.includes(moveId)) {
      this.inGroupFormation = false;

      if (targetAvatarIdx >= 0 && this.danceAgents[targetAvatarIdx]) {
        // Mode 1: Spotlight Duet with Selected Avatar at Center Stage
        const mainIdx = targetAvatarIdx;
        const buddyIdx = (mainIdx % 2 === 0) ? mainIdx + 1 : mainIdx - 1;
        const centerStage = new THREE.Vector3(0.0, 0, -0.15);

        this.danceAgents[mainIdx].startPartnerRoutine(buddyIdx, moveId, centerStage, 0);
        this.danceAgents[buddyIdx].startPartnerRoutine(mainIdx, moveId, centerStage, 1);

        // Position the other two mascots at the wings as supportive backup dancers
        const others = [0, 1, 2, 3].filter(i => i !== mainIdx && i !== buddyIdx);
        if (others.length >= 2) {
          this.danceAgents[others[0]].setWingCheer(new THREE.Vector3(-2.30, 0, -0.10));
          this.danceAgents[others[1]].setWingCheer(new THREE.Vector3(2.30, 0, -0.10));
        }

        this.activeSpotlightIndex = mainIdx;
        this.chamberTargetColor.set(this.danceAgents[mainIdx].def.threeColor);
      } else {
        // Mode 2: Synchronized Dual Duets in 2 Dedicated Non-Overlapping Stage Halves
        // Pair A (Mowgli & Belle) on Stage Left (center X = -1.60)
        // Pair B (Moana & Bhageera) on Stage Right (center X = +1.60)
        // Center A and Center B separated by 3.20m -> IMPOSSIBLE TO MERGE!
        if (this.danceAgents.length >= 4) {
          const centerLeft = new THREE.Vector3(-1.60, 0, -0.15);
          this.danceAgents[0].startPartnerRoutine(1, moveId, centerLeft, 0);
          this.danceAgents[1].startPartnerRoutine(0, moveId, centerLeft, 1);

          const centerRight = new THREE.Vector3(1.60, 0, -0.15);
          this.danceAgents[2].startPartnerRoutine(3, moveId, centerRight, 0);
          this.danceAgents[3].startPartnerRoutine(2, moveId, centerRight, 1);
        } else if (this.danceAgents.length >= 2) {
          const centerStage = new THREE.Vector3(0.0, 0, -0.15);
          this.danceAgents[0].startPartnerRoutine(1, moveId, centerStage, 0);
          this.danceAgents[1].startPartnerRoutine(0, moveId, centerStage, 1);
        }
      }
      return;
    }

    // Solo Dance Moves
    this.inGroupFormation = false;
    if (targetAvatarIdx >= 0 && this.danceAgents[targetAvatarIdx]) {
      // Performer takes front-and-center stage under their pure color spotlight
      this.danceAgents[targetAvatarIdx].setExplicitMove(moveId);
      this.danceAgents[targetAvatarIdx].danceAnchor.set(0.0, 0, -0.15);
      this.activeSpotlightIndex = targetAvatarIdx;
      this.chamberTargetColor.set(this.danceAgents[targetAvatarIdx].def.threeColor);

      // Other 3 avatars take supportive wing positions with calm groove
      const others = [0, 1, 2, 3].filter(i => i !== targetAvatarIdx);
      const wingPositions = [
        new THREE.Vector3(-2.10, 0, -0.10),
        new THREE.Vector3(-1.05, 0, -0.10),
        new THREE.Vector3(2.10, 0, -0.10),
      ];
      others.forEach((idx, i) => {
        if (this.danceAgents[idx]) {
          this.danceAgents[idx].setWingCheer(wingPositions[i] || new THREE.Vector3(1.05, 0, -0.10));
        }
      });
    } else {
      // Synchronized chorus line across the stage: 1.40m separation between dancers -> ZERO OVERLAP!
      const laneX = [-2.10, -0.70, 0.70, 2.10];
      this.danceAgents.forEach((agent, idx) => {
        agent.setExplicitMove(moveId);
        agent.danceAnchor.set(laneX[idx] !== undefined ? laneX[idx] : (idx * 1.2 - 1.8), 0, -0.15);
        agent.tempoRate = 1.0;
      });
    }
  }

  // ── Spotlight Tuner Studio API ──────────────────────────────
  getSpotlightConfig() {
    return { ...this.spotlightConfig };
  }

  setSpotlightConfig(partialConfig) {
    if (!partialConfig) return;
    Object.assign(this.spotlightConfig, partialConfig);
    this._applySpotlightConfig();
  }

  _rebuildBeamGeometry() {
    if (!this.chamberBeam) return;
    const cfg = this.spotlightConfig;
    if (this.chamberBeam.geometry) this.chamberBeam.geometry.dispose();
    this.chamberBeam.geometry = new THREE.CylinderGeometry(
      cfg.topRadius,
      cfg.bottomRadius,
      cfg.beamHeight,
      36,
      1,
      true
    );
    this.chamberBeam.position.y = cfg.beamHeight * 0.5;
  }

  _applySpotlightConfig() {
    if (!this.spotlightConfig) return;
    const cfg = this.spotlightConfig;

    if (this.chamberBeamMat && this.chamberBeamMat.uniforms) {
      if (this.chamberBeamMat.uniforms.uIntensity) {
        this.chamberBeamMat.uniforms.uIntensity.value = cfg.beamIntensity;
      }
      if (this.chamberBeamMat.uniforms.uOpacity) {
        this.chamberBeamMat.uniforms.uOpacity.value = cfg.beamOpacity;
      }
      if (this.chamberBeamMat.uniforms.uFadePower) {
        this.chamberBeamMat.uniforms.uFadePower.value = cfg.beamFadePower;
      }
    }

    if (this.chamberTopSpotLight) {
      this.chamberTopSpotLight.intensity = cfg.spotIntensity;
      this.chamberTopSpotLight.angle = cfg.spotAngle;
      this.chamberTopSpotLight.penumbra = cfg.spotPenumbra;
      this.chamberTopSpotLight.position.y = cfg.beamHeight ? (cfg.beamHeight * 0.72) : 3.8;
    }

    if (this.pedestalGroup) {
      this.pedestalGroup.visible = !!cfg.showFloorDisk;
    }

    // If focus mode locked to an avatar, update immediately
    if (cfg.focusMode && cfg.focusMode !== 'AUTO') {
      const targetIdx = AVATAR_DEFS.findIndex(d => d.id === cfg.focusMode);
      if (targetIdx >= 0) {
        this.activeSpotlightIndex = targetIdx;
        this.chamberTargetColor.set(AVATAR_DEFS[targetIdx].threeColor);
      }
    }

    this._rebuildBeamGeometry();
  }

  _initDiscoBall() {
    const wirePts = [new THREE.Vector3(0, 6.5, 0), new THREE.Vector3(0, 3.2, 0)];
    const wireGeo = new THREE.BufferGeometry().setFromPoints(wirePts);
    this.wire = new THREE.Line(wireGeo, new THREE.LineBasicMaterial({ color: 0x555555 }));
    this.scene.add(this.wire);

    this.NUM_SPOTS = 8;
    this.spotDirs = [];
    this.spotCols = [];
    const hues = [0.0, 0.08, 0.18, 0.33, 0.50, 0.62, 0.75, 0.88];
    for (let i = 0; i < this.NUM_SPOTS; i++) {
      const rgb = hsvToRgb(hues[i], 1.0, 1.0);
      this.spotCols.push(new THREE.Vector3(rgb[0], rgb[1], rgb[2]));
      this.spotDirs.push(new THREE.Vector3());
    }

    this.ballMat = new THREE.ShaderMaterial({
      vertexShader: BALL_VERTEX_SHADER,
      fragmentShader: BALL_FRAGMENT_SHADER,
      uniforms: {
        uCam: { value: this.camera.position },
        uTime: { value: 0.0 },
        uSpots: { value: this.spotDirs },
        uSpotCols: { value: this.spotCols },
        uDayFactor: { value: 0.0 },
      },
    });

    const ballGeo = new THREE.SphereGeometry(1.2, 40, 40);
    this.ball = new THREE.Mesh(ballGeo, this.ballMat);
    this.ball.position.set(0, 2.2, 0);
    this.scene.add(this.ball);
  }

  _initSpotlights() {
    this.spotMeshes = [];
    this.beamMats = [];
    this.beams = [];
    this.floorSpots = [];

    const SPOT_COLORS = [0xff2020, 0xff8800, 0xffee00, 0x00ff44, 0x00eeff, 0x2244ff, 0xcc00ff, 0xff00aa];

    for (let i = 0; i < 8; i++) {
      const disc = new THREE.Mesh(
        new THREE.CircleGeometry(0.08, 12),
        new THREE.MeshBasicMaterial({ color: SPOT_COLORS[i], transparent: true, opacity: 0.9, side: THREE.DoubleSide })
      );
      this.scene.add(disc);
      this.spotMeshes.push(disc);

      const bm = new THREE.MeshBasicMaterial({
        color: SPOT_COLORS[i],
        transparent: true,
        opacity: 0.035,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      this.beamMats.push(bm);
      const bGeo = new THREE.CylinderGeometry(0.02, 0.35, 8, 8, 1, true);
      const beam = new THREE.Mesh(bGeo, bm);
      this.scene.add(beam);
      this.beams.push(beam);

      const fs = new THREE.Mesh(
        new THREE.CircleGeometry(0.55, 16),
        new THREE.MeshBasicMaterial({
          color: SPOT_COLORS[i],
          transparent: true,
          opacity: 0.0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      fs.rotation.x = -Math.PI / 2;
      fs.position.y = -2.19;
      this.scene.add(fs);
      this.floorSpots.push(fs);
    }
  }

  _initParticles() {
    const pCount = 100; // Ultra-fast lightweight sparkling dust
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(pCount * 3);
    const pCols = new Float32Array(pCount * 3);

    for (let i = 0; i < pCount; i++) {
      pPos[i * 3 + 0] = (Math.random() - 0.5) * 20;
      pPos[i * 3 + 1] = -2.0 + Math.random() * 8.5;
      pPos[i * 3 + 2] = (Math.random() - 0.5) * 20;

      const rgb = hsvToRgb(Math.random(), 0.8, 1.0);
      pCols[i * 3 + 0] = rgb[0];
      pCols[i * 3 + 1] = rgb[1];
      pCols[i * 3 + 2] = rgb[2];
    }

    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    pGeo.setAttribute('color', new THREE.BufferAttribute(pCols, 3));

    this.particles = new THREE.Points(
      pGeo,
      new THREE.PointsMaterial({
        size: 0.045,
        vertexColors: true,
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    this.scene.add(this.particles);
  }

  _initChamberSpotlight() {
    this.chamberTargetPos = new THREE.Vector3(-1.9, -2.18, 0.1);
    this.chamberCurrentPos = new THREE.Vector3(-1.9, -2.18, 0.1);
    this.chamberColor = new THREE.Color(0x39FF14);
    this.chamberTargetColor = new THREE.Color(0x39FF14);
    this.activeSpotlightIndex = 0;
    this.lastSpotlightSwitch = 0;

    const cfg = this.spotlightConfig;
    if (cfg && cfg.focusMode && cfg.focusMode !== 'AUTO') {
      const initIdx = AVATAR_DEFS.findIndex(d => d.id === cfg.focusMode);
      if (initIdx >= 0) {
        this.activeSpotlightIndex = initIdx;
        this.chamberColor.set(AVATAR_DEFS[initIdx].threeColor);
        this.chamberTargetColor.set(AVATAR_DEFS[initIdx].threeColor);
      }
    }

    // 1. Vertical Volumetric Light Rays Column (Pure Avatar Color - Softly Faded)
    // Height and radii dynamically customizable via Spotlight Studio Tuner
    this.chamberBeamGroup = new THREE.Group();
    this.chamberBeamGroup.position.set(this.chamberCurrentPos.x, -2.18, this.chamberCurrentPos.z);

    const BEAM_HEIGHT = cfg.beamHeight || 5.8;
    const coneGeo = new THREE.CylinderGeometry(
      cfg.topRadius || 0.20,
      cfg.bottomRadius || 1.65,
      BEAM_HEIGHT,
      36,
      1,
      true
    );
    this.chamberBeamMat = new THREE.ShaderMaterial({
      vertexShader: CHAMBER_BEAM_VERTEX_SHADER,
      fragmentShader: CHAMBER_BEAM_FRAGMENT_SHADER,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: this.chamberColor },
        uIntensity: { value: cfg.beamIntensity || 0.85 },
        uOpacity: { value: cfg.beamOpacity || 0.38 },
        uFadePower: { value: cfg.beamFadePower || 1.4 },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.chamberBeam = new THREE.Mesh(coneGeo, this.chamberBeamMat);
    this.chamberBeam.position.y = BEAM_HEIGHT * 0.5; // Centered vertically so base is at floor Y=0 local
    this.chamberBeamGroup.add(this.chamberBeam);

    // NOTE: White inner ray core is purposely removed to prevent bleaching/shading the avatar's color.
    // The spotlight renders 100% pure avatar color, softly faded without white shades.

    this.scene.add(this.chamberBeamGroup);

    // 2. Real Overhead 3D Spotlight (Targeting the focused mascot)
    this.chamberSpotTarget = new THREE.Object3D();
    this.chamberSpotTarget.position.set(this.chamberCurrentPos.x, -2.18, this.chamberCurrentPos.z);
    this.scene.add(this.chamberSpotTarget);

    const spotH = cfg.beamHeight ? (cfg.beamHeight * 0.72) : 3.8;
    this.chamberTopSpotLight = new THREE.SpotLight(
      this.chamberColor,
      cfg.spotIntensity || 4.2,
      16,
      cfg.spotAngle || 0.65,
      cfg.spotPenumbra || 0.6
    );
    this.chamberTopSpotLight.position.set(this.chamberCurrentPos.x, spotH, this.chamberCurrentPos.z + 0.35);
    this.chamberTopSpotLight.target = this.chamberSpotTarget;
    this.scene.add(this.chamberTopSpotLight);

    // 3. Radiant Back Halo Rim Light
    this.chamberBackHalo = new THREE.PointLight(this.chamberColor, 2.8, 8, 1.2);
    this.chamberBackHalo.position.set(this.chamberCurrentPos.x, -0.8, this.chamberCurrentPos.z - 0.8);
    this.scene.add(this.chamberBackHalo);

    // 4. Floor Pedestal Rings (REMOVED BY DEFAULT as requested: "remove the disk that is coming below at the spotlight")
    this.pedestalGroup = new THREE.Group();
    this.pedestalGroup.position.set(this.chamberCurrentPos.x, -2.18, this.chamberCurrentPos.z);
    this.pedestalGroup.visible = !!cfg.showFloorDisk; // Hidden by default

    const poolGeo = new THREE.CircleGeometry(1.65, 32);
    this.pedestalPoolMat = new THREE.MeshBasicMaterial({
      color: 0x39FF14,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const pool = new THREE.Mesh(poolGeo, this.pedestalPoolMat);
    pool.rotation.x = -Math.PI / 2;
    this.pedestalGroup.add(pool);

    const innerRingGeo = new THREE.RingGeometry(1.15, 1.25, 48);
    this.pedestalRingMat = new THREE.MeshBasicMaterial({
      color: 0x39FF14,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const innerRing = new THREE.Mesh(innerRingGeo, this.pedestalRingMat);
    innerRing.rotation.x = -Math.PI / 2;
    innerRing.position.y = 0.01;
    this.pedestalGroup.add(innerRing);

    const outerRingGeo = new THREE.RingGeometry(1.5, 1.62, 48);
    this.pedestalOuterRingMat = new THREE.MeshBasicMaterial({
      color: 0x39FF14,
      transparent: true,
      opacity: 0.58,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const outerRing = new THREE.Mesh(outerRingGeo, this.pedestalOuterRingMat);
    outerRing.rotation.x = -Math.PI / 2;
    outerRing.position.y = 0.01;
    this.pedestalGroup.add(outerRing);

    this.scene.add(this.pedestalGroup);
  }


  _loadDancingAvatars() {
    const texLoader = new THREE.TextureLoader();

    loadGLBModelOptimized()
      .then((gltf) => {
        if (this.isDisposed) return;

        AVATAR_DEFS.forEach((buddy, idx) => {
          const clone = gltf.scene.clone(true);

          const rawBox = new THREE.Box3().setFromObject(clone);
          const rawSize = rawBox.getSize(new THREE.Vector3());
          const maxDim = Math.max(rawSize.x, rawSize.y, rawSize.z);

          // Prominent, beautiful mascot scale: 1.05 (clear, large, detailed, and high-impact)
          const targetScale = 1.05;
          const uniformScale = targetScale / maxDim;
          clone.scale.setScalar(uniformScale);

          clone.updateMatrixWorld(true);
          const scaledBox = new THREE.Box3().setFromObject(clone);
          const scaledCenter = scaledBox.getCenter(new THREE.Vector3());

          // Center horizontally and anchor bottom vertex strictly to Y = 0
          clone.position.x = -scaledCenter.x;
          clone.position.z = -scaledCenter.z;
          clone.position.y = -scaledBox.min.y; // Lowest mesh point pinned to Y=0!

          const tex = texLoader.load(buddy.texture);
          tex.flipY = false;
          tex.colorSpace = THREE.SRGBColorSpace;

          clone.traverse((child) => {
            if (child.isMesh && child.material) {
              child.material = child.material.clone();
              child.material.map = tex;
              child.material.color.set('#FFFFFF');
              child.material.roughness = 0.35;
              child.material.metalness = 0.05;
              child.material.needsUpdate = true;
            }
          });

          // Click detection hit sphere
          const hitSphere = new THREE.Mesh(
            new THREE.SphereGeometry(targetScale * 0.65, 16, 16),
            new THREE.MeshBasicMaterial({ visible: false })
          );
          hitSphere.position.set(0, targetScale * 0.5, 0);
          hitSphere.userData = { avatarIdx: idx, buddy };

          // Bottom-anchored pivot group
          const modelPivot = new THREE.Group();
          modelPivot.add(clone);
          modelPivot.add(hitSphere);

          // Outer avatar group positioned on the dance floor
          const avGroup = new THREE.Group();
          avGroup.add(modelPivot);
          this.avatarGroup.add(avGroup);

          // Create autonomous mascot dance agent
          const agent = new MascotDanceAgent(avGroup, modelPivot, clone, buddy, idx, targetScale);
          this.danceAgents.push(agent);
          this.avatars.push({ group: avGroup, model: clone, buddy, index: idx });
        });
      })
      .catch((err) => {
        console.error('Failed to load avatars into disco dance floor:', err);
      });
  }

  _onPointerDown(e) {
    this.isDragging = true;
    this.lastMX = e.clientX || (e.touches && e.touches[0].clientX) || 0;

    const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersects = this.raycaster.intersectObjects(this.avatarGroup.children, true);

    for (let hit of intersects) {
      let cur = hit.object;
      while (cur) {
        if (cur.userData && cur.userData.avatarIdx !== undefined) {
          const idx = cur.userData.avatarIdx;
          if (this.danceAgents[idx]) {
            this.danceAgents[idx].triggerCheer();
            this.activeSpotlightIndex = idx;
            this.chamberTargetColor.set(this.danceAgents[idx].def.threeColor);
          }
          return;
        }
        cur = cur.parent;
      }
    }
  }

  _onPointerMove(e) {
    if (!this.isDragging) return;
    const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    const dx = clientX - this.lastMX;
    this.lastMX = clientX;
    this.velX = dx * 0.007;
    this.rotY += this.velX;
  }

  _onPointerUp() {
    this.isDragging = false;
  }

  _onResize() {
    if (this.isDisposed) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    const area = width * height;
    const targetDpr = area > 1920 * 1080 ? 1.0 : Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 1.25);
    this.renderer.setPixelRatio(targetDpr);
    this.renderer.setSize(width, height);
  }

  _handleCollisionsAndPairing(dt = 0.016) {
    const agents = this.danceAgents;
    const count = agents.length;
    if (count < 2) return;

    const MIN_SEPARATION = 1.80; // Absolute physical body separation (avatars NEVER penetrate)
    const AVOIDANCE_RADIUS = 2.60; // Proactive steering repulsion zone

    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        const a = agents[i];
        const b = agents[j];
        if (!a || !b) continue;

        // If both agents are in the same partner duet pair, their choreographed separation is already strictly enforced
        if (a.isPartnering && b.isPartnering && a.partnerIndex === j) continue;

        this._tmpDelta.copy(b.pos).sub(a.pos);
        this._tmpDelta.y = 0;
        const dist = this._tmpDelta.length();

        if (dist < 0.01) {
          // Extremely close or on top: assign safe separation vector
          this._tmpDelta.set(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
        } else {
          this._tmpDelta.multiplyScalar(1.0 / dist);
        }

        // 1. Proactive Steering (Only for free roaming avatars)
        if (dist < AVOIDANCE_RADIUS) {
          const steerFactor = Math.pow(1.0 - (dist / AVOIDANCE_RADIUS), 1.4) * 2.5;
          const aFree = a.isRoaming && !a.forcedMove && !a.isPartnering && !a.isWingCheer;
          const bFree = b.isRoaming && !b.forcedMove && !b.isPartnering && !b.isWingCheer;
          if (aFree) a.pos.addScaledVector(this._tmpDelta, -steerFactor * 0.02);
          if (bFree) b.pos.addScaledVector(this._tmpDelta, steerFactor * 0.02);

          this._tmpFwdA.set(Math.sin(a.rotY), 0, Math.cos(a.rotY));
          this._tmpFwdB.set(Math.sin(b.rotY), 0, Math.cos(b.rotY));

          const aFacingB = this._tmpFwdA.dot(this._tmpDelta) > 0.15;
          const bFacingA = this._tmpFwdB.dot(this._tmpDelta) < -0.15;

          if (aFacingB && bFacingA) {
            if (aFree) {
              this._tmpSideA.set(-this._tmpFwdA.z, 0, this._tmpFwdA.x).multiplyScalar(0.05);
              a.pos.add(this._tmpSideA);
              if (dist < 2.0) a.pickNextRoamTarget();
            }
            if (bFree) {
              this._tmpSideB.set(-this._tmpFwdB.z, 0, this._tmpFwdB.x).multiplyScalar(0.05);
              b.pos.add(this._tmpSideB);
              if (dist < 2.0) b.pickNextRoamTarget();
            }
          }
        }

        // 2. Guaranteed Minimum Rigid Separation (NEVER GET INTO EACH OTHER)
        if (dist < MIN_SEPARATION) {
          const overlap = (MIN_SEPARATION - dist);
          const aPerforming = a.forcedMove || a.isPartnering || a.isWingCheer;
          const bPerforming = b.forcedMove || b.isPartnering || b.isWingCheer;

          if (aPerforming && !bPerforming) {
            b.pos.addScaledVector(this._tmpDelta, overlap);
            if (b.isRoaming) b.triggerCollisionRipple(this._tmpDelta);
          } else if (!aPerforming && bPerforming) {
            a.pos.addScaledVector(this._tmpDelta, -overlap);
            if (a.isRoaming) {
              this._tmpRecoilA.copy(this._tmpDelta).negate();
              a.triggerCollisionRipple(this._tmpRecoilA);
            }
          } else {
            a.pos.addScaledVector(this._tmpDelta, -overlap * 0.52);
            b.pos.addScaledVector(this._tmpDelta, overlap * 0.52);
            if (a.isRoaming && !aPerforming) {
              this._tmpRecoilA.copy(this._tmpDelta).negate();
              a.triggerCollisionRipple(this._tmpRecoilA);
            }
            if (b.isRoaming && !bPerforming) {
              b.triggerCollisionRipple(this._tmpDelta);
            }
          }
        }
      }
    }

    // Ensure all agents remain strictly within the user's white boundary box after all steering & repulsion
    for (let i = 0; i < count; i++) {
      const ag = agents[i];
      if (!ag) continue;
      const bnd = ag.getEffectiveBounds();
      ag.pos.x = THREE.MathUtils.clamp(ag.pos.x, bnd.minX, bnd.maxX);
      ag.pos.z = THREE.MathUtils.clamp(ag.pos.z, bnd.minZ, bnd.maxZ);
    }
  }

  _animate() {
    if (this.isDisposed) return;
    // Always schedule next frame first to guarantee the render loop never halts
    this.animId = requestAnimationFrame(this._animate);

    try {
      const dt = Math.min(this.clock.getDelta(), 0.05);
      this.time += dt;
      const t = this.time;
      const beatTime = t * 1.85; // Slow, smooth, elegant, relaxed disco groove (approx 68-72 BPM half-time tempo)

      // 1. Day / Night Theme Transition Lerp (Zero-allocation render loop)
      const targetDay = this.isDayMode ? 1.0 : 0.0;
      this.dayLerp = THREE.MathUtils.lerp(this.dayLerp, targetDay, dt * 2.5);
      const day = this.dayLerp;

      this.scene.fog.color.lerpColors(this._colNightFog, this._colMorningFog, day);
      this.renderer.setClearColor(this.scene.fog.color);

      this.roomMat.color.lerpColors(this._colNightRoom, this._colMorningRoom, day);
      this.floorMat.color.lerpColors(this._colNightFloor, this._colMorningFloor, day);

      this.ambientLight.intensity = THREE.MathUtils.lerp(0.32, 0.95, day);
      this.keyLight.intensity = THREE.MathUtils.lerp(0.85, 0.55, day);
      this.sunLight.intensity = day * 1.35;

      // 2. Ball Spin Physics
      if (!this.isDragging) {
        this.velX += (0.012 - this.velX) * 0.03;
        this.rotY += this.velX;
      }
      this.ball.rotation.y = this.rotY;
      this.ballMat.uniforms.uTime.value = t;
      this.ballMat.uniforms.uDayFactor.value = day;

      // 3. Orbiting Pin Spotlights (Zero-Allocation Render Loop)
      for (let i = 0; i < this.NUM_SPOTS; i++) {
        const base = (i / this.NUM_SPOTS) * Math.PI * 2;
        const speed = 0.38 + i * 0.07;
        const phi = base + t * speed;
        const elev = Math.sin(t * 0.5 + i * 0.9) * 0.55;

        const dx = Math.sin(phi) * Math.cos(elev);
        const dy = Math.sin(elev) - 0.3;
        const dz = Math.cos(phi) * Math.cos(elev);
        this._tmpDir.set(dx, dy, dz).normalize();

        this._tmpSrc.copy(this.ball.position).addScaledVector(this._tmpDir, 1.05);
        this.spotDirs[i].copy(this._tmpDir);

        const beam = this.beams[i];
        this._tmpMid.copy(this._tmpSrc).addScaledVector(this._tmpDir, 4);
        beam.position.copy(this._tmpMid);
        beam.lookAt(this._tmpSrc);
        beam.rotateX(Math.PI / 2);
        this.beamMats[i].opacity = (0.028 + Math.sin(t * 3 + i) * 0.012) * (1.0 - day * 0.6);

        const disc = this.spotMeshes[i];
        disc.position.copy(this._tmpSrc);
        disc.lookAt(this.camera.position);

        const fs = this.floorSpots[i];
        const ty = (-2.19 - this._tmpSrc.y) / this._tmpDir.y;
        if (ty > 0 && ty < 30) {
          fs.position.x = this._tmpSrc.x + this._tmpDir.x * ty;
          fs.position.z = this._tmpSrc.z + this._tmpDir.z * ty;
          fs.material.opacity = (0.22 + Math.sin(t * 2 + i) * 0.08) * (1.0 - day * 0.4);
          const scale = 0.35 + ty * 0.035;
          fs.scale.set(scale, scale, scale);
        } else {
          fs.material.opacity = 0;
        }
      }

      // 4. Floating Dust Particles
      if (this.particles) {
        this.particles.rotation.y = t * 0.03;
      }

      // 5. Periodic Group Formation State Machine (Auto AI mode only)
      const hasForcedMove = this.danceAgents.some(agent => agent.forcedMove);
      this.formationTimer += dt;
      if (!hasForcedMove && !this.inGroupFormation && this.formationTimer >= this.nextFormationTime) {
        this.inGroupFormation = true;
        this.formationTimer = 0;
      } else if (this.inGroupFormation && this.formationTimer >= 6.5) {
        this.inGroupFormation = false;
        this.formationTimer = 0;
        this.nextFormationTime = 20.0 + Math.random() * 10.0;
        this.danceAgents.forEach(agent => agent.pickNextRoamTarget());
      }

      // 6. Collision Avoidance & Opportunistic Pairings
      this._handleCollisionsAndPairing(dt);

      // 7. Vedika Chamber Overhead Spotlight Tracking (Pure Avatar Color)
      const cfg = this.spotlightConfig;
      if (cfg && cfg.focusMode && cfg.focusMode !== 'AUTO') {
        const lockedIdx = AVATAR_DEFS.findIndex(d => d.id === cfg.focusMode);
        if (lockedIdx >= 0) {
          this.activeSpotlightIndex = lockedIdx;
          if (this.danceAgents[lockedIdx] && this.danceAgents[lockedIdx].def) {
            this.chamberTargetColor.set(this.danceAgents[lockedIdx].def.threeColor);
          }
        }
      } else if (t - this.lastSpotlightSwitch > 5.5 && this.danceAgents.length > 0) {
        this.lastSpotlightSwitch = t;
        this.activeSpotlightIndex = Math.floor(Math.random() * this.danceAgents.length);
        const leadAgent = this.danceAgents[this.activeSpotlightIndex];
        if (leadAgent && leadAgent.def) {
          this.chamberTargetColor.set(leadAgent.def.threeColor);
        }
      }

      if (this.danceAgents[this.activeSpotlightIndex]) {
        const leadAgent = this.danceAgents[this.activeSpotlightIndex];
        this.chamberTargetPos.set(leadAgent.pos.x, -2.18, leadAgent.pos.z);
      }

      this.chamberCurrentPos.lerp(this.chamberTargetPos, 0.08);
      this.chamberColor.lerp(this.chamberTargetColor, 0.08);

      if (!isFinite(this.chamberCurrentPos.x)) this.chamberCurrentPos.x = 0;
      if (!isFinite(this.chamberCurrentPos.z)) this.chamberCurrentPos.z = 0;

      const cx = this.chamberCurrentPos.x;
      const cz = this.chamberCurrentPos.z;

      this.chamberBeamMat.uniforms.uTime.value = t;
      this.chamberBeamMat.uniforms.uColor.value.copy(this.chamberColor);
      this.chamberTopSpotLight.color.copy(this.chamberColor);
      this.chamberBackHalo.color.copy(this.chamberColor);

      // Smoothly update positions of overhead vertical beam, spotlight, and pedestal
      this.chamberBeamGroup.position.set(cx, -2.18, cz);

      // Floor disk only rendered if explicitly enabled (default false per user request)
      if (this.pedestalGroup) {
        const isDiskVisible = !!(cfg && cfg.showFloorDisk);
        this.pedestalGroup.visible = isDiskVisible;
        if (isDiskVisible) {
          this.pedestalPoolMat.color.copy(this.chamberColor);
          this.pedestalRingMat.color.copy(this.chamberColor);
          this.pedestalOuterRingMat.color.copy(this.chamberColor);
          this.pedestalGroup.position.set(cx, -2.18, cz);
          const pulseScale = 1.0 + 0.08 * Math.sin(t * 5.0);
          this.pedestalGroup.scale.set(pulseScale, 1.0, pulseScale);
        }
      }

      this.chamberSpotTarget.position.set(cx, -1.6, cz);
      this.chamberSpotTarget.updateMatrixWorld();
      const spotH = cfg && cfg.beamHeight ? (cfg.beamHeight * 0.72) : 3.8;
      this.chamberTopSpotLight.position.set(cx, spotH, cz + 0.35);
      this.chamberBackHalo.position.set(cx, -0.8, cz - 0.7);

      // 8. Update Mascot Dance Agents
      this.danceAgents.forEach((agent, idx) => {
        const isLead = idx === this.activeSpotlightIndex;
        agent.update(dt, t, beatTime, this.danceAgents, this.inGroupFormation, isLead);
      });

      this.renderer.render(this.scene, this.camera);
    } catch (err) {
      console.error('DiscoScene render loop error:', err);
    }
  }


  dispose() {
    this.isDisposed = true;
    if (this.animId) {
      cancelAnimationFrame(this.animId);
    }
    window.removeEventListener('mousedown', this._onPointerDown);
    window.removeEventListener('mousemove', this._onPointerMove);
    window.removeEventListener('mouseup', this._onPointerUp);
    window.removeEventListener('touchstart', this._onPointerDown);
    window.removeEventListener('touchmove', this._onPointerMove);
    window.removeEventListener('touchend', this._onPointerUp);
    window.removeEventListener('resize', this._onResize);

    if (this.renderer && this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
  }
}
