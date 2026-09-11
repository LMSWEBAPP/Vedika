import * as THREE from 'three';
import gsap from 'gsap';

/**
 * Procedural 3D Floating Elements and Foggy Light Beam for the Avatar Chamber.
 *
 * Each companion avatar has 5 distinct, proportionate 3D themed elements:
 * - Avatar 0 (Ask Vedika): Open Book, Chat Speech Bubble with dots, Golden Star, Ringed Planet, Tiny Moon.
 * - Avatar 1 (Code with Vedika): Code Brackets { }, Mini Terminal/Laptop, Floating Gear, Microchip, Energy Spark.
 * - Avatar 2 (Code Puzzles): Jigsaw Puzzle Piece, Isometric Cube, Eureka Lightbulb, Trophy Star, Key.
 * - Avatar 3 (Viva & Interview): Capsule Microphone, Voice Bubble, Diploma Scroll, Verified Shield, Focus Ring.
 *
 * Foggy Light Beam:
 * - Placed at the central chamber station behind the middle avatar.
 * - Features soft Gaussian vertical falloff and Fresnel edge fading (zero sharp edges).
 * - Matches the signature color of the currently active middle avatar.
 */

// Shared Materials & Geometries caching for optimal GPU memory
const sharedMaterials = {};
function getOrCreateMat(key, createFn) {
  if (!sharedMaterials[key]) {
    sharedMaterials[key] = createFn();
  }
  return sharedMaterials[key].clone();
}

/* ─────────────────────────────────────────────────────────────────────────────
 * SHAPE GENERATORS
 * ───────────────────────────────────────────────────────────────────────────── */

function createStarShape(points = 5, outerR = 0.35, innerR = 0.16) {
  const shape = new THREE.Shape();
  const step = Math.PI / points;
  for (let i = 0; i < 2 * points; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = i * step - Math.PI / 2;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

function createCrescentShape(radius = 0.32, innerOffset = 0.14) {
  const shape = new THREE.Shape();
  // Outer arc
  shape.absarc(0, 0, radius, -Math.PI * 0.45, Math.PI * 0.45, false);
  // Inner arc cutting back
  shape.absarc(innerOffset, 0, radius * 0.88, Math.PI * 0.45, -Math.PI * 0.45, true);
  shape.closePath();
  return shape;
}

function createPuzzleShape(size = 0.42) {
  const shape = new THREE.Shape();
  const h = size * 0.5;
  const tabR = size * 0.14;

  // Bottom edge
  shape.moveTo(-h, -h);
  shape.lineTo(-tabR, -h);
  shape.absarc(0, -h, tabR, Math.PI, 0, true); // indent
  shape.lineTo(h, -h);

  // Right edge with tab
  shape.lineTo(h, -tabR);
  shape.absarc(h, 0, tabR, -Math.PI * 0.5, Math.PI * 0.5, false); // tab
  shape.lineTo(h, h);

  // Top edge with tab
  shape.lineTo(tabR, h);
  shape.absarc(0, h, tabR, 0, Math.PI, false); // tab
  shape.lineTo(-h, h);

  // Left edge with indent
  shape.lineTo(-h, tabR);
  shape.absarc(-h, 0, tabR, Math.PI * 0.5, -Math.PI * 0.5, true); // indent
  shape.lineTo(-h, -h);

  return shape;
}

function createShieldShape(w = 0.40, h = 0.48) {
  const shape = new THREE.Shape();
  const halfW = w * 0.5;
  shape.moveTo(-halfW, h * 0.4);
  shape.lineTo(halfW, h * 0.4);
  shape.quadraticCurveTo(halfW, -h * 0.1, 0, -h * 0.5);
  shape.quadraticCurveTo(-halfW, -h * 0.1, -halfW, h * 0.4);
  shape.closePath();
  return shape;
}

/* ─────────────────────────────────────────────────────────────────────────────
 * AVATAR 0: ASK VEDIKA (Learning & Curiosity)
 * Elements: Open Book, Chat Bubble, Golden Star, Ringed Planet, Moon
 * ───────────────────────────────────────────────────────────────────────────── */

function createBookMesh() {
  const group = new THREE.Group();
  const coverMat = new THREE.MeshStandardMaterial({
    color: '#4F46E5',
    roughness: 0.4,
    metalness: 0.1,
    transparent: true,
  });
  const pageMat = new THREE.MeshStandardMaterial({
    color: '#FFFDF5',
    roughness: 0.8,
    metalness: 0.0,
    transparent: true,
  });

  const pageGeo = new THREE.BoxGeometry(0.24, 0.36, 0.03);
  const leftPage = new THREE.Mesh(pageGeo, pageMat);
  leftPage.position.set(-0.11, 0, 0.015);
  leftPage.rotation.y = 0.22;
  group.add(leftPage);

  const rightPage = new THREE.Mesh(pageGeo, pageMat);
  rightPage.position.set(0.11, 0, 0.015);
  rightPage.rotation.y = -0.22;
  group.add(rightPage);

  const coverGeo = new THREE.BoxGeometry(0.26, 0.38, 0.015);
  const leftCover = new THREE.Mesh(coverGeo, coverMat);
  leftCover.position.set(-0.115, 0, -0.01);
  leftCover.rotation.y = 0.22;
  group.add(leftCover);

  const rightCover = new THREE.Mesh(coverGeo, coverMat);
  rightCover.position.set(0.115, 0, -0.01);
  rightCover.rotation.y = -0.22;
  group.add(rightCover);

  return group;
}

function createChatBubbleMesh() {
  const group = new THREE.Group();
  const bubbleMat = new THREE.MeshStandardMaterial({
    color: '#38BDF8',
    emissive: '#0284C7',
    emissiveIntensity: 0.25,
    roughness: 0.3,
    metalness: 0.1,
    transparent: true,
  });

  const sphereGeo = new THREE.SphereGeometry(0.22, 20, 16);
  sphereGeo.scale(1.1, 0.85, 0.6);
  const body = new THREE.Mesh(sphereGeo, bubbleMat);
  group.add(body);

  const tailGeo = new THREE.ConeGeometry(0.07, 0.14, 12);
  const tail = new THREE.Mesh(tailGeo, bubbleMat);
  tail.position.set(-0.14, -0.16, 0);
  tail.rotation.z = 2.4;
  group.add(tail);

  // 3 mini dots on bubble face
  const dotMat = new THREE.MeshBasicMaterial({ color: '#FFFFFF', transparent: true });
  const dotGeo = new THREE.SphereGeometry(0.024, 10, 8);
  [-0.08, 0.0, 0.08].forEach((x) => {
    const dot = new THREE.Mesh(dotGeo, dotMat);
    dot.position.set(x, 0.0, 0.13);
    group.add(dot);
  });

  return group;
}

function createStarMesh() {
  const shape = createStarShape(5, 0.26, 0.12);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.08,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.025,
    bevelThickness: 0.025,
  });
  geo.center();
  const mat = new THREE.MeshStandardMaterial({
    color: '#FBBF24',
    emissive: '#D97706',
    emissiveIntensity: 0.45,
    roughness: 0.25,
    metalness: 0.7,
    transparent: true,
  });
  return new THREE.Mesh(geo, mat);
}

function createPlanetMesh() {
  const group = new THREE.Group();
  const planetMat = new THREE.MeshStandardMaterial({
    color: '#67E8F9',
    emissive: '#0891B2',
    emissiveIntensity: 0.2,
    roughness: 0.4,
    metalness: 0.1,
    transparent: true,
  });
  const sphereGeo = new THREE.SphereGeometry(0.17, 20, 16);
  const sphere = new THREE.Mesh(sphereGeo, planetMat);
  group.add(sphere);

  const ringGeo = new THREE.RingGeometry(0.24, 0.35, 32);
  const ringMat = new THREE.MeshStandardMaterial({
    color: '#C4B5FD',
    roughness: 0.5,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.9,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI * 0.42;
  ring.rotation.y = 0.2;
  group.add(ring);

  return group;
}

function createMoonMesh() {
  const shape = createCrescentShape(0.22, 0.09);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.05,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.02,
    bevelThickness: 0.02,
  });
  geo.center();
  const mat = new THREE.MeshStandardMaterial({
    color: '#FEF08A',
    emissive: '#F59E0B',
    emissiveIntensity: 0.35,
    roughness: 0.35,
    metalness: 0.2,
    transparent: true,
  });
  return new THREE.Mesh(geo, mat);
}

/* ─────────────────────────────────────────────────────────────────────────────
 * AVATAR 1: CODE WITH VEDIKA (Programming & Tech)
 * Elements: Code Brackets, Mini Laptop/Terminal, Floating Gear, Microchip, Spark
 * ───────────────────────────────────────────────────────────────────────────── */

function createCodeBracketsMesh() {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: '#38BDF8',
    emissive: '#0284C7',
    emissiveIntensity: 0.5,
    roughness: 0.3,
    metalness: 0.4,
    transparent: true,
  });

  // Left bracket "{" procedural shape
  function createBracketShape(isRight = false) {
    const s = new THREE.Shape();
    const flip = isRight ? -1 : 1;
    s.moveTo(0.12 * flip, 0.22);
    s.lineTo(0.02 * flip, 0.22);
    s.quadraticCurveTo(-0.06 * flip, 0.22, -0.06 * flip, 0.12);
    s.lineTo(-0.06 * flip, 0.04);
    s.quadraticCurveTo(-0.06 * flip, 0.0, -0.12 * flip, 0.0);
    s.quadraticCurveTo(-0.06 * flip, 0.0, -0.06 * flip, -0.04);
    s.lineTo(-0.06 * flip, -0.12);
    s.quadraticCurveTo(-0.06 * flip, -0.22, 0.02 * flip, -0.22);
    s.lineTo(0.12 * flip, -0.22);
    s.lineTo(0.12 * flip, -0.17);
    s.lineTo(0.04 * flip, -0.17);
    s.quadraticCurveTo(0.0 * flip, -0.17, 0.0 * flip, -0.09);
    s.lineTo(0.0 * flip, -0.04);
    s.quadraticCurveTo(0.0 * flip, 0.0, -0.04 * flip, 0.0);
    s.quadraticCurveTo(0.0 * flip, 0.0, 0.0 * flip, 0.04);
    s.lineTo(0.0 * flip, 0.09);
    s.quadraticCurveTo(0.0 * flip, 0.17, 0.04 * flip, 0.17);
    s.lineTo(0.12 * flip, 0.17);
    s.closePath();
    return s;
  }

  const leftGeo = new THREE.ExtrudeGeometry(createBracketShape(false), {
    depth: 0.04,
    bevelEnabled: true,
    bevelSize: 0.01,
    bevelThickness: 0.01,
  });
  leftGeo.center();
  const leftBracket = new THREE.Mesh(leftGeo, mat);
  leftBracket.position.x = -0.14;
  group.add(leftBracket);

  const rightGeo = new THREE.ExtrudeGeometry(createBracketShape(true), {
    depth: 0.04,
    bevelEnabled: true,
    bevelSize: 0.01,
    bevelThickness: 0.01,
  });
  rightGeo.center();
  const rightBracket = new THREE.Mesh(rightGeo, mat);
  rightBracket.position.x = 0.14;
  group.add(rightBracket);

  return group;
}

function createTerminalMesh() {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({
    color: '#1E293B',
    roughness: 0.5,
    metalness: 0.6,
    transparent: true,
  });
  const screenMat = new THREE.MeshStandardMaterial({
    color: '#0F172A',
    emissive: '#10B981',
    emissiveIntensity: 0.4,
    roughness: 0.2,
    transparent: true,
  });

  // Base
  const baseGeo = new THREE.BoxGeometry(0.36, 0.024, 0.26);
  const base = new THREE.Mesh(baseGeo, bodyMat);
  group.add(base);

  // Screen
  const screenGeo = new THREE.BoxGeometry(0.34, 0.24, 0.02);
  const screen = new THREE.Mesh(screenGeo, bodyMat);
  screen.position.set(0, 0.12, -0.11);
  screen.rotation.x = -0.22;
  group.add(screen);

  // Screen Inset
  const insetGeo = new THREE.PlaneGeometry(0.30, 0.20);
  const inset = new THREE.Mesh(insetGeo, screenMat);
  inset.position.set(0, 0.12, -0.098);
  inset.rotation.x = -0.22;
  group.add(inset);

  return group;
}

function createGearMesh() {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: '#94A3B8',
    metalness: 0.8,
    roughness: 0.3,
    transparent: true,
  });

  const hubGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.06, 16);
  const hub = new THREE.Mesh(hubGeo, mat);
  hub.rotation.x = Math.PI * 0.5;
  group.add(hub);

  // 6 teeth
  const toothGeo = new THREE.BoxGeometry(0.07, 0.09, 0.06);
  for (let i = 0; i < 6; i++) {
    const tooth = new THREE.Mesh(toothGeo, mat);
    const ang = (i / 6) * Math.PI * 2;
    tooth.position.set(Math.cos(ang) * 0.20, Math.sin(ang) * 0.20, 0);
    tooth.rotation.z = ang;
    group.add(tooth);
  }

  // Center hole
  const holeMat = new THREE.MeshBasicMaterial({ color: '#0F172A', transparent: true });
  const holeGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.065, 12);
  const hole = new THREE.Mesh(holeGeo, holeMat);
  hole.rotation.x = Math.PI * 0.5;
  group.add(hole);

  return group;
}

function createChipMesh() {
  const group = new THREE.Group();
  const boardMat = new THREE.MeshStandardMaterial({
    color: '#0F172A',
    roughness: 0.4,
    metalness: 0.2,
    transparent: true,
  });
  const dieMat = new THREE.MeshStandardMaterial({
    color: '#334155',
    emissive: '#FF6EFF',
    emissiveIntensity: 0.3,
    roughness: 0.2,
    metalness: 0.7,
    transparent: true,
  });
  const pinMat = new THREE.MeshStandardMaterial({
    color: '#F59E0B',
    metalness: 0.9,
    roughness: 0.2,
    transparent: true,
  });

  const boardGeo = new THREE.BoxGeometry(0.30, 0.03, 0.30);
  const board = new THREE.Mesh(boardGeo, boardMat);
  group.add(board);

  const dieGeo = new THREE.BoxGeometry(0.15, 0.04, 0.15);
  const die = new THREE.Mesh(dieGeo, dieMat);
  die.position.y = 0.015;
  group.add(die);

  // Tiny pins around the perimeter
  const pinGeo = new THREE.BoxGeometry(0.02, 0.015, 0.05);
  [-0.08, -0.03, 0.03, 0.08].forEach((offset) => {
    const pinTop = new THREE.Mesh(pinGeo, pinMat);
    pinTop.position.set(offset, 0, 0.16);
    group.add(pinTop);

    const pinBot = new THREE.Mesh(pinGeo, pinMat);
    pinBot.position.set(offset, 0, -0.16);
    group.add(pinBot);
  });

  return group;
}

function createSparkMesh() {
  const shape = createStarShape(4, 0.25, 0.06);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.05,
    bevelEnabled: true,
    bevelSize: 0.02,
    bevelThickness: 0.02,
  });
  geo.center();
  const mat = new THREE.MeshStandardMaterial({
    color: '#FF6EFF',
    emissive: '#EC4899',
    emissiveIntensity: 0.6,
    roughness: 0.2,
    metalness: 0.5,
    transparent: true,
  });
  return new THREE.Mesh(geo, mat);
}

/* ─────────────────────────────────────────────────────────────────────────────
 * AVATAR 2: CODE PUZZLES (Logic & Problem Solving)
 * Elements: Jigsaw Puzzle Piece, Isometric Cube, Lightbulb, Trophy Star, Key
 * ───────────────────────────────────────────────────────────────────────────── */

function createPuzzlePieceMesh() {
  const shape = createPuzzleShape(0.38);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.06,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.02,
    bevelThickness: 0.02,
  });
  geo.center();
  const mat = new THREE.MeshStandardMaterial({
    color: '#FF3131',
    emissive: '#DC2626',
    emissiveIntensity: 0.3,
    roughness: 0.35,
    metalness: 0.2,
    transparent: true,
  });
  return new THREE.Mesh(geo, mat);
}

function createCubeMesh() {
  const group = new THREE.Group();
  const cubeGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);

  const colors = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];
  let colIdx = 0;

  for (let x = -0.065; x <= 0.065; x += 0.13) {
    for (let y = -0.065; y <= 0.065; y += 0.13) {
      for (let z = -0.065; z <= 0.065; z += 0.13) {
        const mat = new THREE.MeshStandardMaterial({
          color: colors[colIdx % colors.length],
          roughness: 0.3,
          metalness: 0.1,
          transparent: true,
        });
        const miniCube = new THREE.Mesh(cubeGeo, mat);
        miniCube.position.set(x, y, z);
        group.add(miniCube);
        colIdx++;
      }
    }
  }

  return group;
}

function createLightbulbMesh() {
  const group = new THREE.Group();
  const glassMat = new THREE.MeshStandardMaterial({
    color: '#FEF08A',
    emissive: '#F59E0B',
    emissiveIntensity: 0.5,
    roughness: 0.2,
    metalness: 0.1,
    transparent: true,
    opacity: 0.92,
  });
  const brassMat = new THREE.MeshStandardMaterial({
    color: '#B45309',
    metalness: 0.8,
    roughness: 0.3,
    transparent: true,
  });

  const bulbGeo = new THREE.SphereGeometry(0.16, 20, 16);
  const bulb = new THREE.Mesh(bulbGeo, glassMat);
  bulb.position.y = 0.06;
  group.add(bulb);

  const neckGeo = new THREE.CylinderGeometry(0.08, 0.06, 0.10, 16);
  const neck = new THREE.Mesh(neckGeo, brassMat);
  neck.position.y = -0.10;
  group.add(neck);

  return group;
}

function createTrophyStarMesh() {
  const group = new THREE.Group();
  const starMesh = createStarMesh();
  starMesh.scale.setScalar(0.85);
  group.add(starMesh);

  const ringGeo = new THREE.RingGeometry(0.25, 0.29, 32);
  const ringMat = new THREE.MeshStandardMaterial({
    color: '#F59E0B',
    metalness: 0.8,
    roughness: 0.25,
    side: THREE.DoubleSide,
    transparent: true,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  group.add(ring);

  return group;
}

function createKeyMesh() {
  const group = new THREE.Group();
  const goldMat = new THREE.MeshStandardMaterial({
    color: '#FBBF24',
    metalness: 0.85,
    roughness: 0.2,
    transparent: true,
  });

  // Ring head
  const ringGeo = new THREE.TorusGeometry(0.10, 0.024, 12, 24);
  const head = new THREE.Mesh(ringGeo, goldMat);
  head.position.y = 0.13;
  group.add(head);

  // Shaft
  const shaftGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.26, 12);
  const shaft = new THREE.Mesh(shaftGeo, goldMat);
  shaft.position.y = -0.04;
  group.add(shaft);

  // Teeth
  const tooth1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.024, 0.02), goldMat);
  tooth1.position.set(0.04, -0.11, 0);
  group.add(tooth1);

  const tooth2 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.024, 0.02), goldMat);
  tooth2.position.set(0.03, -0.15, 0);
  group.add(tooth2);

  return group;
}

/* ─────────────────────────────────────────────────────────────────────────────
 * AVATAR 3: VIVA & INTERVIEW (Voice, Articulation, Assessment)
 * Elements: Capsule Microphone, Voice Bubble, Diploma Scroll, Shield, Focus Ring
 * ───────────────────────────────────────────────────────────────────────────── */

function createMicrophoneMesh() {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({
    color: '#334155',
    metalness: 0.6,
    roughness: 0.4,
    transparent: true,
  });
  const grilleMat = new THREE.MeshStandardMaterial({
    color: '#E2E8F0',
    metalness: 0.9,
    roughness: 0.2,
    transparent: true,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: '#FF5C00',
    emissive: '#FF5C00',
    emissiveIntensity: 0.4,
    metalness: 0.5,
    roughness: 0.3,
    transparent: true,
  });

  // Grille (top dome)
  const grilleGeo = new THREE.SphereGeometry(0.09, 16, 12);
  grilleGeo.scale(1.0, 1.3, 1.0);
  const grille = new THREE.Mesh(grilleGeo, grilleMat);
  grille.position.y = 0.10;
  group.add(grille);

  // Accent ring
  const accentGeo = new THREE.CylinderGeometry(0.092, 0.092, 0.015, 16);
  const accent = new THREE.Mesh(accentGeo, accentMat);
  accent.position.y = 0.01;
  group.add(accent);

  // Handle/Body
  const bodyGeo = new THREE.CylinderGeometry(0.08, 0.065, 0.18, 16);
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = -0.09;
  group.add(body);

  return group;
}

function createVoiceBubbleMesh() {
  const group = new THREE.Group();
  const bubbleMat = new THREE.MeshStandardMaterial({
    color: '#3B82F6',
    emissive: '#1D4ED8',
    emissiveIntensity: 0.3,
    roughness: 0.3,
    metalness: 0.2,
    transparent: true,
  });

  const bodyGeo = new THREE.SphereGeometry(0.20, 20, 16);
  bodyGeo.scale(1.15, 0.85, 0.6);
  const body = new THREE.Mesh(bodyGeo, bubbleMat);
  group.add(body);

  // 3 equalizer waveform bars
  const waveMat = new THREE.MeshBasicMaterial({ color: '#FFFFFF', transparent: true });
  const heights = [0.08, 0.15, 0.10];
  [-0.07, 0.0, 0.07].forEach((x, i) => {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.024, heights[i], 0.02), waveMat);
    bar.position.set(x, 0, 0.13);
    group.add(bar);
  });

  return group;
}

function createScrollMesh() {
  const group = new THREE.Group();
  const parchmentMat = new THREE.MeshStandardMaterial({
    color: '#FEF3C7',
    roughness: 0.7,
    metalness: 0.05,
    transparent: true,
  });
  const ribbonMat = new THREE.MeshStandardMaterial({
    color: '#EF4444',
    emissive: '#B91C1C',
    emissiveIntensity: 0.3,
    metalness: 0.4,
    roughness: 0.3,
    transparent: true,
  });

  const rollGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.38, 16);
  const roll = new THREE.Mesh(rollGeo, parchmentMat);
  roll.rotation.z = Math.PI * 0.45;
  group.add(roll);

  const ribbonGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.05, 16);
  const ribbon = new THREE.Mesh(ribbonGeo, ribbonMat);
  ribbon.rotation.z = Math.PI * 0.45;
  group.add(ribbon);

  return group;
}

function createShieldMesh() {
  const shape = createShieldShape(0.36, 0.42);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.05,
    bevelEnabled: true,
    bevelSize: 0.02,
    bevelThickness: 0.02,
  });
  geo.center();
  const mat = new THREE.MeshStandardMaterial({
    color: '#3B82F6',
    emissive: '#1E40AF',
    emissiveIntensity: 0.3,
    metalness: 0.7,
    roughness: 0.25,
    transparent: true,
  });
  return new THREE.Mesh(geo, mat);
}

function createFocusRingMesh() {
  const group = new THREE.Group();
  const ringMat = new THREE.MeshStandardMaterial({
    color: '#FF5C00',
    emissive: '#EA580C',
    emissiveIntensity: 0.4,
    metalness: 0.6,
    roughness: 0.3,
    side: THREE.DoubleSide,
    transparent: true,
  });

  const ringGeo = new THREE.RingGeometry(0.18, 0.23, 32);
  const ring = new THREE.Mesh(ringGeo, ringMat);
  group.add(ring);

  // 4 crosshair ticks
  const tickGeo = new THREE.BoxGeometry(0.06, 0.02, 0.01);
  [0, Math.PI * 0.5, Math.PI, Math.PI * 1.5].forEach((ang) => {
    const tick = new THREE.Mesh(tickGeo, ringMat);
    tick.position.set(Math.cos(ang) * 0.24, Math.sin(ang) * 0.24, 0);
    tick.rotation.z = ang;
    group.add(tick);
  });

  return group;
}

/* ─────────────────────────────────────────────────────────────────────────────
 * ORBIT GROUP BUILDER FOR A GIVEN AVATAR
 * ───────────────────────────────────────────────────────────────────────────── */

/**
 * Creates and arranges 5 distinct, proportionate 3D themed elements for the avatar.
 * Elements are positioned gently around the avatar's shoulders/torso in local space.
 */
export function createOrbitElementsForAvatar(avatarIndex) {
  const orbitGroup = new THREE.Group();
  orbitGroup.name = `orbit-elements-${avatarIndex}`;

  // Item slot configurations (Positions placed comfortably in open space around avatar)
  // Avatar radius is ~1.4. By positioning between 2.05 and 2.35, elements float freely around the companion without clipping.
  const slots = [
    { x: -2.15, y: 1.15, z: 0.85, baseRot: { x: 0.15, y: 0.35, z: -0.10 }, floatAmp: 0.08, floatSpeed: 1.4, phase: 0.0 },
    { x: 2.15, y: 1.20, z: 0.85, baseRot: { x: 0.10, y: -0.35, z: 0.10 }, floatAmp: 0.08, floatSpeed: 1.6, phase: 1.4 },
    { x: 2.35, y: 0.05, z: 0.90, baseRot: { x: 0.05, y: -0.20, z: -0.05 }, floatAmp: 0.07, floatSpeed: 1.3, phase: 2.7 },
    { x: -2.35, y: -0.05, z: 0.90, baseRot: { x: 0.05, y: 0.20, z: 0.05 }, floatAmp: 0.08, floatSpeed: 1.5, phase: 4.1 },
    { x: -1.65, y: -1.05, z: 1.00, baseRot: { x: -0.10, y: 0.25, z: -0.12 }, floatAmp: 0.06, floatSpeed: 1.4, phase: 5.2 },
  ];

  let meshCreators = [];

  switch (avatarIndex) {
    case 0: // Ask Vedika
      meshCreators = [createBookMesh, createChatBubbleMesh, createStarMesh, createPlanetMesh, createMoonMesh];
      break;
    case 1: // Code with Vedika
      meshCreators = [createCodeBracketsMesh, createTerminalMesh, createGearMesh, createChipMesh, createSparkMesh];
      break;
    case 2: // Code Puzzles
      meshCreators = [createPuzzlePieceMesh, createCubeMesh, createLightbulbMesh, createTrophyStarMesh, createKeyMesh];
      break;
    case 3: // Viva & Interview
      meshCreators = [createMicrophoneMesh, createVoiceBubbleMesh, createScrollMesh, createShieldMesh, createFocusRingMesh];
      break;
    default:
      meshCreators = [createStarMesh, createChatBubbleMesh, createPlanetMesh, createBookMesh, createMoonMesh];
  }

  const elements = [];

  meshCreators.forEach((creator, idx) => {
    const mesh = creator();
    const slot = slots[idx];

    mesh.position.set(slot.x, slot.y, slot.z);
    mesh.rotation.set(slot.baseRot.x, slot.baseRot.y, slot.baseRot.z);
    mesh.scale.setScalar(1.22);
    mesh.userData = {
      basePos: new THREE.Vector3(slot.x, slot.y, slot.z),
      baseRot: { ...slot.baseRot },
      floatAmp: slot.floatAmp,
      floatSpeed: slot.floatSpeed,
      phase: slot.phase,
    };

    // Store base material opacities for clean fading
    mesh.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material.transparent = true;
        child.material.userData = child.material.userData || {};
        child.material.userData.baseOpacity = child.material.opacity !== undefined ? child.material.opacity : 1.0;
      }
    });

    orbitGroup.add(mesh);
    elements.push(mesh);
  });

  // Start scaled tiny / invisible until active
  orbitGroup.scale.setScalar(0.001);
  orbitGroup.visible = false;

  let currentOpacity = 0.0;

  function setOpacity(opacityVal) {
    currentOpacity = THREE.MathUtils.clamp(opacityVal, 0.0, 1.0);
    elements.forEach((mesh) => {
      mesh.traverse((child) => {
        if (child.isMesh && child.material) {
          const base = child.material.userData?.baseOpacity ?? 1.0;
          child.material.opacity = currentOpacity * base;
          child.material.needsUpdate = true;
        }
      });
    });
  }

  function setScale(scaleVal) {
    orbitGroup.scale.setScalar(scaleVal);
  }

  function update(time, dt) {
    if (!orbitGroup.visible || currentOpacity <= 0.001) return;

    for (let i = 0; i < elements.length; i++) {
      const mesh = elements[i];
      const u = mesh.userData;

      // Lite floating only (gentle subtle bobbing)
      mesh.position.y = u.basePos.y + Math.sin(time * u.floatSpeed + u.phase) * u.floatAmp;

      // Stay static: NO 360 spin! Only delicate, subtle ambient breathing (max ~2 degrees)
      mesh.rotation.x = u.baseRot.x + Math.sin(time * 0.9 + u.phase) * 0.03;
      mesh.rotation.y = u.baseRot.y + Math.cos(time * 0.8 + u.phase) * 0.03;
      mesh.rotation.z = u.baseRot.z + Math.sin(time * 1.1 + u.phase) * 0.02;
    }
  }

  function dispose() {
    elements.forEach((mesh) => {
      mesh.traverse((child) => {
        if (child.isMesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
            else child.material.dispose();
          }
        }
      });
    });
  }

  function applyOrbitAdjust(cfg) {
    if (!cfg) return;
    const spread = cfg.spread !== undefined ? cfg.spread : 1.0;
    const offY = cfg.offsetY !== undefined ? cfg.offsetY : 0.0;
    const offZ = cfg.offsetZ !== undefined ? cfg.offsetZ : 0.0;
    const gScale = cfg.globalScale !== undefined ? cfg.globalScale : 1.22;
    const gFloatAmp = cfg.floatAmp !== undefined ? cfg.floatAmp : null;
    const gFloatSpeed = cfg.floatSpeed !== undefined ? cfg.floatSpeed : null;

    elements.forEach((mesh, idx) => {
      const baseSlot = slots[idx];
      const customSlot = (cfg.slots && cfg.slots[idx]) || {};
      const targetX = (customSlot.x !== undefined ? customSlot.x : baseSlot.x) * spread;
      const targetY = (customSlot.y !== undefined ? customSlot.y : baseSlot.y) * spread + offY;
      const targetZ = (customSlot.z !== undefined ? customSlot.z : baseSlot.z) + offZ;
      const targetScale = (customSlot.scale !== undefined ? customSlot.scale : 1.0) * gScale;

      mesh.position.set(targetX, targetY, targetZ);
      mesh.scale.setScalar(targetScale);
      mesh.userData.basePos.set(targetX, targetY, targetZ);
      if (gFloatAmp !== null) mesh.userData.floatAmp = gFloatAmp;
      if (gFloatSpeed !== null) mesh.userData.floatSpeed = gFloatSpeed;
    });
  }

  return {
    group: orbitGroup,
    setOpacity,
    setScale,
    update,
    dispose,
    applyOrbitAdjust,
    getOpacity: () => currentOpacity,
  };
}

/* ─────────────────────────────────────────────────────────────────────────────
 * FOGGY LIGHT BEAM BASE (End Part Only, Heavily Faded Edges, In Avatar Colour)
 * ───────────────────────────────────────────────────────────────────────────── */

/**
 * Creates the soft foggy light beam base anchored behind the middle avatar.
 * Features:
 * - Only the lower end part of the light beam.
 * - Subtly dim and foggy.
 * - Zero sharp edges (smoothstep Gaussian vertical & horizontal Fresnel falloff).
 * - Matches the signature color of the active middle companion.
 */
export function createFoggyLightBeam(initialColorHex = '#FFD700') {
  const initialColor = new THREE.Color('#FFD700');

  // Cylinder base: wider at bottom pedestal, tapering softly upwards
  // Height = 2.8, RadiusBottom = 2.1, RadiusTop = 1.65 (open-ended)
  const geom = new THREE.CylinderGeometry(1.65, 2.1, 2.8, 48, 16, true);

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: initialColor },
      uOpacity: { value: 0.85 },
      uTime: { value: 0.0 },
      uBottomFade: { value: 0.15 },
      uTopFade: { value: 0.73 },
      uRimMin: { value: 0.246 },
      uRimMax: { value: 0.82 },
      uFogDrift: { value: 0.19 },
      uAlphaMult: { value: 0.13 },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewPosition;

      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = -mvPosition.xyz;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uOpacity;
      uniform float uTime;
      uniform float uBottomFade;
      uniform float uTopFade;
      uniform float uRimMin;
      uniform float uRimMax;
      uniform float uFogDrift;
      uniform float uAlphaMult;
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewPosition;

      void main() {
        // 1. Soft vertical Gaussian-style fade: 0 at floor, 0 at top, soft in lower middle
        float bottomFade = smoothstep(0.0, uBottomFade, vUv.y);
        float topFade = smoothstep(1.0, 1.0 - uTopFade, vUv.y);
        float vertProfile = bottomFade * topFade;

        // 2. Subtle foggy atmospheric drift waves
        float drift = (sin(vUv.y * 5.0 - uTime * 0.75) * 0.7 + sin(vUv.x * 10.0 + uTime * 0.4) * 0.3) * uFogDrift;
        float fogDensity = clamp(vertProfile + drift, 0.0, 1.0);

        // 3. Fresnel edge vanishing: zero sharp borders along the cylinder silhouette
        vec3 viewDir = normalize(vViewPosition);
        float fresnel = abs(dot(vNormal, viewDir));
        float rimSoftness = smoothstep(uRimMin, uRimMax, fresnel);

        // Subtly dim foggy opacity
        float finalAlpha = fogDensity * rimSoftness * uOpacity * uAlphaMult;

        if (finalAlpha < 0.002) discard;

        // Ethereal subtle gradient in rich golden tones
        vec3 glowColor = uColor * (0.85 + 0.25 * (1.0 - vUv.y));

        gl_FragColor = vec4(glowColor, finalAlpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geom, mat);
  mesh.name = 'foggy-light-beam-base';
  mesh.renderOrder = 2; // Renders right behind avatar

  // Positioned & scaled exactly per user's tuned parameters: posY: 0.85, posZ: 3.35, scaleX: 1.4, scaleY: 2.55
  mesh.position.set(0.0, 0.85, 3.35);
  mesh.scale.set(1.4, 2.55, 1.4);

  const currentColor = initialColor.clone();

  function setColor(colorHex = '#FFD700', duration = 0.85) {
    // Beam color is golden for ALL avatars
    const targetColor = new THREE.Color('#FFD700');
    gsap.to(currentColor, {
      r: targetColor.r,
      g: targetColor.g,
      b: targetColor.b,
      duration,
      ease: 'power2.out',
      onUpdate: () => {
        mat.uniforms.uColor.value.copy(currentColor);
      },
    });
  }

  function setOpacity(targetOpacity, duration = 0.6) {
    gsap.to(mat.uniforms.uOpacity, {
      value: targetOpacity,
      duration,
      ease: 'power2.out',
    });
  }

  function applyBeamAdjust(cfg) {
    if (!cfg) return;
    if (cfg.bottomFade !== undefined) mat.uniforms.uBottomFade.value = cfg.bottomFade;
    if (cfg.topFade !== undefined) mat.uniforms.uTopFade.value = cfg.topFade;
    if (cfg.rimMin !== undefined) mat.uniforms.uRimMin.value = cfg.rimMin;
    if (cfg.rimMax !== undefined) mat.uniforms.uRimMax.value = cfg.rimMax;
    if (cfg.fogDrift !== undefined) mat.uniforms.uFogDrift.value = cfg.fogDrift;
    if (cfg.alphaMult !== undefined) mat.uniforms.uAlphaMult.value = cfg.alphaMult;
    if (cfg.opacity !== undefined) mat.uniforms.uOpacity.value = cfg.opacity;
    if (cfg.posY !== undefined) mesh.position.y = cfg.posY;
    if (cfg.posZ !== undefined) mesh.position.z = cfg.posZ;
    if (cfg.scaleX !== undefined) {
      mesh.scale.x = cfg.scaleX;
      mesh.scale.z = cfg.scaleX;
    }
    if (cfg.scaleY !== undefined) mesh.scale.y = cfg.scaleY;
  }

  function update(time) {
    if (mat.uniforms.uTime) {
      mat.uniforms.uTime.value = time;
    }
  }

  function dispose() {
    geom.dispose();
    mat.dispose();
  }

  return {
    mesh,
    setColor,
    setOpacity,
    applyBeamAdjust,
    update,
    dispose,
  };
}
