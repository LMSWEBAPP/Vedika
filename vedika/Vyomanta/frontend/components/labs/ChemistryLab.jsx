'use client';

import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import {
  FlaskConical, Sparkles, Sliders, Info, Zap,
  RotateCcw, Play, Pause, AlertCircle, Compass, Database
} from 'lucide-react';
import { T } from '@/lib/lms-data';

// Periodic Table Elements Data
const ELEMENTS = [
  { z: 1, symbol: 'H', name: 'Hydrogen', category: 'Nonmetal', radius: 37, electronegativity: 2.20, shell: [1] },
  { z: 2, symbol: 'He', name: 'Helium', category: 'Noble Gas', radius: 31, electronegativity: 0, shell: [2] },
  { z: 3, symbol: 'Li', name: 'Lithium', category: 'Alkali Metal', radius: 152, electronegativity: 0.98, shell: [2, 1] },
  { z: 4, symbol: 'Be', name: 'Beryllium', category: 'Alkaline Earth', radius: 112, electronegativity: 1.57, shell: [2, 2] },
  { z: 5, symbol: 'B', name: 'Boron', category: 'Metalloid', radius: 85, electronegativity: 2.04, shell: [2, 3] },
  { z: 6, symbol: 'C', name: 'Carbon', category: 'Nonmetal', radius: 77, electronegativity: 2.55, shell: [2, 4] },
  { z: 7, symbol: 'N', name: 'Nitrogen', category: 'Nonmetal', radius: 75, electronegativity: 3.04, shell: [2, 5] },
  { z: 8, symbol: 'O', name: 'Oxygen', category: 'Nonmetal', radius: 73, electronegativity: 3.44, shell: [2, 6] },
  { z: 9, symbol: 'F', name: 'Fluorine', category: 'Halogen', radius: 71, electronegativity: 3.98, shell: [2, 7] },
  { z: 10, symbol: 'Ne', name: 'Neon', category: 'Noble Gas', radius: 38, electronegativity: 0, shell: [2, 8] }
];

export default function ChemistryLab() {
  const [selectedExperiment, setSelectedExperiment] = useState('bohr');
  const [isPlaying, setIsPlaying] = useState(true);
  const [timeScale, setTimeScale] = useState(1);

  // --- 1. Bohr Model Builder States ---
  const [protons, setProtons] = useState(3); // Lithium
  const [neutrons, setNeutrons] = useState(4);
  const [electrons, setElectrons] = useState(3);
  const activeElement = ELEMENTS.find(e => e.z === protons) || ELEMENTS[0];

  // --- 2. Gas Laws States ---
  const [gasTemp, setGasTemp] = useState(300); // Kelvin
  const [gasVolume, setGasVolume] = useState(3.0); // Liters (corresponds to height)
  const [gasMoles, setGasMoles] = useState(2.0);
  const [gasPressure, setGasPressure] = useState(16.4); // atm

  // --- 3. Acid-Base Reactions / Titration States ---
  const [acidVol, setAcidVol] = useState(25.0); // ml
  const [acidConc, setAcidConc] = useState(0.1); // M (HCl)
  const [baseConc, setBaseConc] = useState(0.1); // M (NaOH)
  const [baseAdded, setBaseAdded] = useState(0.0); // ml added from buret
  const [titrationPh, setTitrationPh] = useState(1.0);
  const [isDripping, setIsDripping] = useState(false);

  // --- 4. Molecular Diffusion States ---
  const [diffusionTemp, setDiffusionTemp] = useState(300); // Kelvin
  const [diffusionGas, setDiffusionGas] = useState('helium'); // 'helium' | 'neon' | 'xenon'
  const [isPartitionOpen, setIsPartitionOpen] = useState(false);

  // --- 5. Periodic Trends States ---
  const [trendElementIndex, setTrendElementIndex] = useState(2); // Lithium
  const [selectedProperty, setSelectedProperty] = useState('radius'); // 'radius' | 'electronegativity'
  const activeTrendElement = ELEMENTS[trendElementIndex];

  // DOM Mount Ref & Global State Reference
  const mountRef = useRef(null);
  const simStateRef = useRef({
    isPlaying: true,
    timeScale: 1,
    selectedExperiment: 'bohr',
    // Bohr
    bohr: { protons: 3, neutrons: 4, electrons: 3 },
    // Gas
    gas: { T: 300, V: 3.0, n: 2.0, P: 16.4 },
    // Titration
    titration: { acidVol: 25.0, acidConc: 0.1, baseConc: 0.1, baseAdded: 0.0, pH: 1.0, isDripping: false },
    // Diffusion
    diffusion: { T: 300, gas: 'helium', open: false, elapsed: 0 },
    // Trends
    trends: { z: 3, property: 'radius' }
  });

  // Sync state to ref
  useEffect(() => {
    simStateRef.current.isPlaying = isPlaying;
    simStateRef.current.timeScale = timeScale;
    simStateRef.current.selectedExperiment = selectedExperiment;

    simStateRef.current.bohr.protons = protons;
    simStateRef.current.bohr.neutrons = neutrons;
    simStateRef.current.bohr.electrons = electrons;

    simStateRef.current.gas.T = gasTemp;
    simStateRef.current.gas.V = gasVolume;
    simStateRef.current.gas.n = gasMoles;
    // Ideal Gas Equation: P = nRT/V (using R = 0.0821 L*atm/(mol*K))
    const P = (gasMoles * 0.0821 * gasTemp) / gasVolume;
    simStateRef.current.gas.P = P;
    setGasPressure(P);

    simStateRef.current.titration.acidVol = acidVol;
    simStateRef.current.titration.acidConc = acidConc;
    simStateRef.current.titration.baseConc = baseConc;
    simStateRef.current.titration.baseAdded = baseAdded;
    simStateRef.current.titration.isDripping = isDripping;

    // Titration pH calculation: HCl (acid) + NaOH (base)
    // mmol of H+ = Va * Ma, mmol of OH- = Vb * Mb
    const mmolH = acidVol * acidConc;
    const mmolOH = baseAdded * baseConc;
    const totalVolume = acidVol + baseAdded;
    
    let computedPH = 7.0;
    if (mmolH > mmolOH) {
      const remainingH = mmolH - mmolOH;
      const concH = remainingH / totalVolume;
      computedPH = -Math.log10(concH);
    } else if (mmolOH > mmolH) {
      const remainingOH = mmolOH - mmolH;
      const concOH = remainingOH / totalVolume;
      computedPH = 14 + Math.log10(concOH);
    }
    simStateRef.current.titration.pH = computedPH;
    setTitrationPh(computedPH);

    simStateRef.current.diffusion.T = diffusionTemp;
    simStateRef.current.diffusion.gas = diffusionGas;
    simStateRef.current.diffusion.open = isPartitionOpen;

    simStateRef.current.trends.z = activeTrendElement.z;
    simStateRef.current.trends.property = selectedProperty;

  }, [
    isPlaying, timeScale, selectedExperiment,
    protons, neutrons, electrons,
    gasTemp, gasVolume, gasMoles,
    acidVol, acidConc, baseConc, baseAdded, isDripping,
    diffusionTemp, diffusionGas, isPartitionOpen,
    trendElementIndex, selectedProperty, activeTrendElement
  ]);

  // Main 3D Canvas
  useEffect(() => {
    const container = mountRef.current;
    if (!container || typeof window === 'undefined') return;

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 400;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#07080F');

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.set(0, 1.5, 6);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 + 0.1;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    const gridHelper = new THREE.GridHelper(20, 20, 0x22C5A0, 0x1E293B);
    gridHelper.position.y = -2.5;
    scene.add(gridHelper);

    // --- Materials Cache ---
    const protonMat = new THREE.MeshStandardMaterial({ color: 0xF55B6B, roughness: 0.1, metalness: 0.1 }); // Red
    const neutronMat = new THREE.MeshStandardMaterial({ color: 0x5B8CF8, roughness: 0.1, metalness: 0.1 }); // Blue
    const electronMat = new THREE.MeshBasicMaterial({ color: 0xF5A95B }); // Glowing Orange/Yellow
    const glassMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.18, roughness: 0.1, metalness: 0.1 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x8892B0, roughness: 0.3, metalness: 0.8 });
    const indicatorLiquidMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, roughness: 0.2 });

    // --- 1. BOHR ATOMIC BUILDER GROUP ---
    const bohrGroup = new THREE.Group();
    scene.add(bohrGroup);

    // Nucleus sub-group
    const nucleusGroup = new THREE.Group();
    bohrGroup.add(nucleusGroup);

    // Shell ring lines
    const shellsCount = 3;
    const shellRadii = [1.2, 2.0, 2.8];
    const shellRings = [];
    for (let i = 0; i < shellsCount; i++) {
      const ringGeo = new THREE.RingGeometry(shellRadii[i] - 0.015, shellRadii[i] + 0.015, 64);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x647298, side: THREE.DoubleSide, transparent: true, opacity: 0.25 });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      bohrGroup.add(ring);
      shellRings.push(ring);
    }

    // Dynamic Electrons meshes pool
    const maxElectrons = 10;
    const electronMeshes = [];
    const eGeo = new THREE.SphereGeometry(0.06, 16, 16);
    for (let i = 0; i < maxElectrons; i++) {
      const em = new THREE.Mesh(eGeo, electronMat);
      bohrGroup.add(em);
      electronMeshes.push(em);
    }

    // Rebuild Nucleus Spheres based on Proton/Neutron states
    const rebuildNucleus = (pCount, nCount) => {
      // Clear current meshes
      while (nucleusGroup.children.length > 0) {
        const obj = nucleusGroup.children[0];
        nucleusGroup.remove(obj);
        obj.geometry.dispose();
      }

      const sphereGeo = new THREE.SphereGeometry(0.09, 16, 16);
      const list = [];
      for (let i = 0; i < pCount; i++) list.push({ mat: protonMat });
      for (let i = 0; i < nCount; i++) list.push({ mat: neutronMat });

      // Shuffle list to mix proton and neutrons visually
      list.sort(() => Math.random() - 0.5);

      // Pack closely in a cluster using spherical offsets
      list.forEach((item, index) => {
        const m = new THREE.Mesh(sphereGeo, item.mat);
        // Distribute coordinates in shell layer offsets
        const radiusVal = 0.12 * Math.pow(index, 0.4);
        const thetaVal = Math.random() * Math.PI;
        const phiVal = Math.random() * Math.PI * 2;
        m.position.setFromSphericalCoords(radiusVal, thetaVal, phiVal);
        nucleusGroup.add(m);
      });
    };
    rebuildNucleus(3, 4); // Lithium defaults

    // --- 2. GAS LAWS GROUP ---
    const gasGroup = new THREE.Group();
    scene.add(gasGroup);

    // Chamber glass box base
    const chamberBoxGeo = new THREE.BoxGeometry(3, 4, 3);
    // Draw wireframe outlines for container
    const edges = new THREE.EdgesGeometry(chamberBoxGeo);
    const lineMat = new THREE.LineBasicMaterial({ color: 0x5B8CF8, linewidth: 2 });
    const chamberOutline = new THREE.LineSegments(edges, lineMat);
    chamberOutline.position.y = -0.5;
    gasGroup.add(chamberOutline);

    const chamberGlass = new THREE.Mesh(chamberBoxGeo, glassMat);
    chamberGlass.position.y = -0.5;
    gasGroup.add(chamberGlass);

    // Movable Piston cylinder lid
    const pistonGeo = new THREE.BoxGeometry(2.95, 0.15, 2.95);
    const piston = new THREE.Mesh(pistonGeo, metalMat);
    piston.position.set(0, 1.4, 0); // moves y between -2.2 and 1.4
    gasGroup.add(piston);

    // Gas molecules
    const maxGasParticles = 60;
    const gasParticles = [];
    const partGeo = new THREE.SphereGeometry(0.06, 8, 8);
    const partMat = new THREE.MeshStandardMaterial({ color: 0x22C5A0, roughness: 0.1 });
    for (let i = 0; i < maxGasParticles; i++) {
      const m = new THREE.Mesh(partGeo, partMat);
      gasGroup.add(m);
      
      gasParticles.push({
        mesh: m,
        pos: new THREE.Vector3(
          (Math.random() - 0.5) * 2.7,
          -2.3 + Math.random() * 3.5,
          (Math.random() - 0.5) * 2.7
        ),
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 2.0,
          (Math.random() - 0.5) * 2.0,
          (Math.random() - 0.5) * 2.0
        )
      });
    }

    // --- 3. ACID-BASE TITRATION GROUP ---
    const titrationGroup = new THREE.Group();
    scene.add(titrationGroup);

    // Titration metal stand
    const basePlateGeo = new THREE.BoxGeometry(1.6, 0.08, 1.2);
    const basePlate = new THREE.Mesh(basePlateGeo, metalMat);
    basePlate.position.set(0, -2.46, 0);
    titrationGroup.add(basePlate);

    const verticalRodGeo = new THREE.CylinderGeometry(0.04, 0.04, 3.8, 16);
    const verticalRod = new THREE.Mesh(verticalRodGeo, metalMat);
    verticalRod.position.set(-0.6, -0.6, -0.3);
    titrationGroup.add(verticalRod);

    // Buret clamp
    const clampGeo = new THREE.BoxGeometry(0.6, 0.06, 0.12);
    const clamp = new THREE.Mesh(clampGeo, metalMat);
    clamp.position.set(-0.3, 1.0, -0.15);
    titrationGroup.add(clamp);

    // Glass Buret cylinder
    const buretGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.6, 16);
    const buret = new THREE.Mesh(buretGeo, glassMat);
    buret.position.set(0, 1.0, 0);
    titrationGroup.add(buret);

    // Erlenmeyer Flask underneath
    const flaskConicalGeo = new THREE.CylinderGeometry(0.12, 0.5, 0.8, 16);
    const flask = new THREE.Mesh(flaskConicalGeo, glassMat);
    flask.position.set(0, -2.0, 0);
    titrationGroup.add(flask);

    // Dynamic liquid mesh inside flask
    const liquidGeo = new THREE.CylinderGeometry(0.12, 0.48, 0.55, 16);
    const liquidMesh = new THREE.Mesh(liquidGeo, indicatorLiquidMat);
    liquidMesh.position.set(0, -2.1, 0);
    titrationGroup.add(liquidMesh);

    // Dripping drop sphere
    const dropGeo = new THREE.SphereGeometry(0.03, 8, 8);
    const dropMat = new THREE.MeshBasicMaterial({ color: 0x9B6EF8, transparent: true, opacity: 0.8 });
    const drop = new THREE.Mesh(dropGeo, dropMat);
    drop.position.set(0, 0.2, 0);
    drop.visible = false;
    titrationGroup.add(drop);

    // --- 4. MOLECULAR DIFFUSION GROUP ---
    const diffusionGroup = new THREE.Group();
    scene.add(diffusionGroup);

    // Diffusion double box
    const diffOutlineGeo = new THREE.BoxGeometry(4.0, 2.0, 2.0);
    const diffOutlineEdges = new THREE.EdgesGeometry(diffOutlineGeo);
    const diffOutline = new THREE.LineSegments(diffOutlineEdges, lineMat);
    diffOutline.position.y = -0.5;
    diffusionGroup.add(diffOutline);

    const diffGlass = new THREE.Mesh(diffOutlineGeo, glassMat);
    diffGlass.position.y = -0.5;
    diffusionGroup.add(diffGlass);

    // Partition divider plate in the center (x = 0)
    const partitionGeo = new THREE.BoxGeometry(0.08, 1.95, 1.95);
    const partition = new THREE.Mesh(partitionGeo, metalMat);
    partition.position.set(0, -0.5, 0);
    diffusionGroup.add(partition);

    // Left and Right gas molecule populations
    const maxDiffParticles = 40;
    const diffParticles = [];
    for (let i = 0; i < maxDiffParticles; i++) {
      const m = new THREE.Mesh(partGeo, partMat);
      diffusionGroup.add(m);
      
      diffParticles.push({
        mesh: m,
        // Start all particles on the LEFT side (x between -1.9 and -0.1)
        pos: new THREE.Vector3(
          -1.8 + Math.random() * 1.6,
          -1.4 + Math.random() * 1.8,
          -0.8 + Math.random() * 1.6
        ),
        vel: new THREE.Vector3(0, 0, 0)
      });
    }

    // --- 5. PERIODIC TABLE TRENDS GROUP ---
    const trendsGroup = new THREE.Group();
    scene.add(trendsGroup);

    // 3D atom size display sphere
    const trendAtomGeo = new THREE.SphereGeometry(1.2, 32, 32);
    const trendAtomMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.1, metalness: 0.1 });
    const trendAtom = new THREE.Mesh(trendAtomGeo, trendAtomMat);
    trendsGroup.add(trendAtom);

    // Electron shell orbits wrapper around trend atom
    const orbitContainer = new THREE.Group();
    trendsGroup.add(orbitContainer);

    // --- Dynamic Solver Runner Loops ---
    const clock = new THREE.Clock();
    let animationId;

    let lastProtons = protons;
    let lastNeutrons = neutrons;
    let titrationDropT = 0;

    const animate = () => {
      animationId = requestAnimationFrame(animate);

      const dt = clock.getDelta();
      const state = simStateRef.current;
      const cappedDt = Math.min(dt, 0.05) * (state.isPlaying ? state.timeScale : 0);

      // Hide all groups except active
      bohrGroup.visible = state.selectedExperiment === 'bohr';
      gasGroup.visible = state.selectedExperiment === 'gas';
      titrationGroup.visible = state.selectedExperiment === 'titration';
      diffusionGroup.visible = state.selectedExperiment === 'diffusion';
      trendsGroup.visible = state.selectedExperiment === 'trends';

      // Re-center camera controls target
      if (state.selectedExperiment === 'bohr') {
        controls.target.set(0, 0, 0);
      } else if (state.selectedExperiment === 'gas') {
        controls.target.set(0, -0.5, 0);
      } else if (state.selectedExperiment === 'titration') {
        controls.target.set(0, -0.6, 0);
      } else if (state.selectedExperiment === 'diffusion') {
        controls.target.set(0, -0.5, 0);
      } else if (state.selectedExperiment === 'trends') {
        controls.target.set(0, 0, 0);
      }

      // --- 1. Bohr Model Animations ---
      if (state.selectedExperiment === 'bohr') {
        // Check if protons/neutrons values changed
        if (state.bohr.protons !== lastProtons || state.bohr.neutrons !== lastNeutrons) {
          rebuildNucleus(state.bohr.protons, state.bohr.neutrons);
          lastProtons = state.bohr.protons;
          lastNeutrons = state.bohr.neutrons;
        }

        // Rotate nucleus slowly
        nucleusGroup.rotation.y += cappedDt * 0.2;
        nucleusGroup.rotation.x += cappedDt * 0.1;

        // Render Shell orbitals (hide those outer if no electrons fill them)
        const activeElem = ELEMENTS.find(e => e.z === state.bohr.protons) || ELEMENTS[0];
        const shells = activeElem.shell; // e.g. Lithium: [2, 1] (2 in shell 1, 1 in shell 2)

        shellRings.forEach((ring, idx) => {
          ring.visible = idx < shells.length;
        });

        // Distribute electrons on active orbits
        let electronIndex = 0;
        shells.forEach((electronsInShell, shellIdx) => {
          const radius = shellRadii[shellIdx];
          const speed = 1.6 / radius; // outer shells rotate slower

          for (let eIdx = 0; eIdx < electronsInShell; eIdx++) {
            if (electronIndex >= maxElectrons) break;

            const mesh = electronMeshes[electronIndex];
            mesh.visible = true;

            // angle distribution
            const initialAngle = (eIdx / electronsInShell) * Math.PI * 2;
            const currentAngle = initialAngle + clock.getElapsedTime() * speed;

            const ex = Math.cos(currentAngle) * radius;
            const ez = Math.sin(currentAngle) * radius;
            mesh.position.set(ex, 0, ez);

            electronIndex++;
          }
        });

        // Hide remaining meshes in pool
        for (let i = electronIndex; i < maxElectrons; i++) {
          electronMeshes[i].visible = false;
        }
      }

      // --- 2. Gas Laws (PV=nRT) Animations ---
      if (state.selectedExperiment === 'gas') {
        const g = state.gas;

        // Piston slider position: maps V (1.0 to 5.0) to height Y (-1.5 to 1.4)
        const pistonY = -2.2 + (g.V / 5.0) * 3.6;
        piston.position.y = pistonY;

        // Bounce molecules inside box borders
        const tempSpeedFactor = Math.sqrt(g.T / 300); // speed scales with sqrt(T)
        const activeCount = Math.min(maxGasParticles, Math.round(g.n * 15));

        gasParticles.forEach((p, idx) => {
          if (idx >= activeCount) {
            p.mesh.visible = false;
            return;
          }
          p.mesh.visible = true;

          // Integrate position
          p.pos.addScaledVector(p.vel, cappedDt * tempSpeedFactor);
          p.mesh.position.copy(p.pos);

          // Box collision borders: X: [-1.4, 1.4], Z: [-1.4, 1.4], Y: [-2.4, pistonY - 0.1]
          const boundaryX = 1.42;
          const boundaryZ = 1.42;
          const boundaryMinY = -2.42;
          const boundaryMaxY = pistonY - 0.1;

          if (p.pos.x > boundaryX) { p.pos.x = boundaryX; p.vel.x *= -1; }
          if (p.pos.x < -boundaryX) { p.pos.x = -boundaryX; p.vel.x *= -1; }
          if (p.pos.z > boundaryZ) { p.pos.z = boundaryZ; p.vel.z *= -1; }
          if (p.pos.z < -boundaryZ) { p.pos.z = -boundaryZ; p.vel.z *= -1; }
          if (p.pos.y > boundaryMaxY) { p.pos.y = boundaryMaxY; p.vel.y *= -1; }
          if (p.pos.y < boundaryMinY) { p.pos.y = boundaryMinY; p.vel.y *= -1; }
        });
      }

      // --- 3. Acid-Base Reaction Titration Animations ---
      if (state.selectedExperiment === 'titration') {
        const tit = state.titration;

        // Drop animation dripping from buret (y=0.2) to flask (y=-1.8)
        if (tit.isDripping) {
          drop.visible = true;
          titrationDropT += cappedDt * 3.0; // speed of falling drop
          const dropY = 0.2 - titrationDropT * 2.0;

          if (dropY <= -1.8) {
            // Drop hits flask liquid, increments base added
            setBaseAdded(prev => {
              const nextVal = prev + 0.5; // add 0.5ml per drop
              if (nextVal >= 50) {
                setIsDripping(false);
                return 50;
              }
              return nextVal;
            });
            titrationDropT = 0;
            drop.position.y = 0.2;
          } else {
            drop.position.y = dropY;
          }
        } else {
          drop.visible = false;
          titrationDropT = 0;
        }

        // Liquid height inside flask: scales with total volume
        const totalVol = tit.acidVol + tit.baseAdded;
        const volumeScale = Math.min(1.5, totalVol / 50);
        liquidMesh.scale.y = volumeScale;
        // Adjust liquid y position to stick to bottom of flask
        liquidMesh.position.y = -2.3 + (0.28 * volumeScale);

        // Phenolphthalein color interpolation: colorless/transparent at pH <= 8.2, pink at pH > 8.2
        const pH = tit.pH;
        let liquidColor = new THREE.Color(0xffffff); // clear
        let opacity = 0.4;
        if (pH > 8.2) {
          const t = Math.min(1.0, (pH - 8.2) / 1.8);
          liquidColor.lerp(new THREE.Color(0xF55B6B), t); // lerp to magenta pink
          opacity = 0.4 + t * 0.3; // become slightly more saturated
        }
        indicatorLiquidMat.color.copy(liquidColor);
        indicatorLiquidMat.opacity = opacity;
      }

      // --- 4. Molecular Diffusion Animations ---
      if (state.selectedExperiment === 'diffusion') {
        const diff = state.diffusion;

        // Animate partition divider: slide up to Y=1.5 if partition is open
        const targetY = diff.open ? 1.5 : -0.5;
        partition.position.y += (targetY - partition.position.y) * 5.0 * cappedDt;

        // Diffusion Speed: root mean square velocity scales with sqrt(T / Mw)
        // Gas molecular weights: Helium = 4, Neon = 20, Xenon = 131
        let mw = 4;
        let gasColor = 0x22C5A0; // green for Helium
        if (diff.gas === 'neon') { mw = 20; gasColor = 0xF5A95B; } // orange
        if (diff.gas === 'xenon') { mw = 131; gasColor = 0x5B8CF8; } // blue

        partMat.color.setHex(gasColor);
        const speed = 1.8 * Math.sqrt(diff.T / 300) / Math.sqrt(mw / 4);

        diffParticles.forEach((p) => {
          p.mesh.visible = true;

          // If partition is open or particles are on the left, let them move
          if (p.vel.lengthSq() === 0) {
            // Assign random unit velocity vectors on open
            p.vel.set(
              (Math.random() - 0.5) * speed,
              (Math.random() - 0.5) * speed,
              (Math.random() - 0.5) * speed
            );
          }

          // Scale velocity to current speed settings
          p.vel.normalize().multiplyScalar(speed);

          p.pos.addScaledVector(p.vel, cappedDt);
          p.mesh.position.copy(p.pos);

          // Box collision borders: X: [-1.9, 1.9], Y: [-1.4, 0.4], Z: [-0.9, 0.9]
          // If partition is CLOSED (partition.position.y < 0), X: [-1.9, -0.05] on left side
          const minX = -1.9;
          const maxX = 1.9;
          const minY = -1.4;
          const maxY = 0.4;
          const minZ = -0.9;
          const maxZ = 0.9;

          // X border collision
          if (partition.position.y < 0.0) {
            // Partition is closed, particles stay on left (x <= -0.06)
            if (p.pos.x > -0.08) { p.pos.x = -0.08; p.vel.x *= -1; }
          } else {
            // Partition is open, particles bounce off far right wall
            if (p.pos.x > maxX) { p.pos.x = maxX; p.vel.x *= -1; }
          }

          if (p.pos.x < minX) { p.pos.x = minX; p.vel.x *= -1; }
          if (p.pos.y > maxY) { p.pos.y = maxY; p.vel.y *= -1; }
          if (p.pos.y < minY) { p.pos.y = minY; p.vel.y *= -1; }
          if (p.pos.z > maxZ) { p.pos.z = maxZ; p.vel.z *= -1; }
          if (p.pos.z < minZ) { p.pos.z = minZ; p.vel.z *= -1; }
        });
      }

      // --- 5. Periodic Table Trends Animations ---
      if (state.selectedExperiment === 'trends') {
        const trend = state.trends;
        const elem = ELEMENTS.find(e => e.z === trend.z) || ELEMENTS[0];

        // Animate atom sphere size based on property select
        let targetRadiusScale = 1.0;
        let activeColor = new THREE.Color(0x3b82f6); // default blue

        if (trend.property === 'radius') {
          // Radius range: 31 (He) to 152 (Li). Map to scale (0.4 to 1.8)
          targetRadiusScale = 0.4 + (elem.radius / 152) * 1.4;
          // Color based on size: smaller is yellow/orange, larger is blue
          activeColor.lerp(new THREE.Color(0xF5A95B), 1.0 - (elem.radius / 152));
        } else if (trend.property === 'electronegativity') {
          // Electronegativity range: 0 (Noble) to 3.98 (F). Map scale (0.5 to 1.6)
          targetRadiusScale = 0.5 + (elem.electronegativity / 3.98) * 1.1;
          // Color based on electronegativity strength: higher is intense red, lower is blue
          activeColor.lerp(new THREE.Color(0xF55B6B), elem.electronegativity / 3.98);
        }

        trendAtom.scale.set(targetRadiusScale, targetRadiusScale, targetRadiusScale);
        trendAtomMat.color.copy(activeColor);

        // Spin trends atom
        trendAtom.rotation.y += cappedDt * 0.3;

        // Render orbiting rings representing Bohr shell counts
        // Clear old shells
        while (orbitContainer.children.length > 0) {
          const r = orbitContainer.children[0];
          orbitContainer.remove(r);
          r.geometry.dispose();
        }

        const shells = elem.shell;
        shells.forEach((elecCount, shellIdx) => {
          const orbitRadius = targetRadiusScale * (1.3 + shellIdx * 0.5);
          const orbitGeo = new THREE.RingGeometry(orbitRadius - 0.01, orbitRadius + 0.01, 32);
          const orbitMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.15 });
          const o = new THREE.Mesh(orbitGeo, orbitMat);
          o.rotation.x = Math.PI / 2;
          orbitContainer.add(o);
        });
      }

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationId) cancelAnimationFrame(animationId);
      if (renderer && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      controls.dispose();
    };
  }, []);

  return (
    <div style={{ display: 'flex', flex: 1, height: '100%', overflow: 'hidden', background: '#07080F', color: '#DDE3F2', fontFamily: 'var(--font-outfit), sans-serif' }}>
      
      {/* --- LEFT COLUMN: Parameter sidebar panel --- */}
      <div style={{
        width: 360,
        height: '100%',
        background: '#0C0F1C',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        zIndex: 5
      }}>
        {/* Lab Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <FlaskConical size={20} color="#22C5A0" />
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0, letterSpacing: '-0.01em', color: '#F8FAFC' }}>Chemistry Lab</h2>
            <span style={{ fontSize: 10.5, color: '#647298', fontWeight: 600 }}>Molecular Sandbox & Solver</span>
          </div>
        </div>

        {/* Experiment Selector */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <label style={{ display: 'block', fontSize: 10.5, color: '#647298', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
            Select Experiment
          </label>
          <select
            value={selectedExperiment}
            onChange={(e) => {
              setSelectedExperiment(e.target.value);
              setIsPlaying(true);
              // Reset titration triggers
              setBaseAdded(0.0);
              setIsDripping(false);
              setIsPartitionOpen(false);
            }}
            style={{
              width: '100%',
              background: '#131824',
              color: '#DDE3F2',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              padding: '8px 12px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option value="bohr">⚛️ Bohr Atomic Builder</option>
            <option value="gas">🧪 Gas Laws Simulator (PV=nRT)</option>
            <option value="titration">⚗️ Acid-Base Titration Reactions</option>
            <option value="diffusion">🌬️ Molecular Gas Diffusion</option>
            <option value="trends">📈 Periodic Table Trends</option>
          </select>
        </div>

        {/* Dynamic scroll sidebar controls */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }} className="sandbox-scroll">
          
          {/* BOHR ATOMIC BUILDER CONTROLS */}
          {selectedExperiment === 'bohr' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: 11, color: '#22C5A0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Sliders size={13} /> Nuclear Configuration
              </div>

              {/* Protons Slider */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                  <span style={{ color: '#8892B0' }}>Protons (Charge Z)</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#F55B6B' }}>{protons} p⁺</span>
                </div>
                <input
                  type="range" min={1} max={10} step={1}
                  value={protons}
                  onChange={(e) => {
                    const z = parseInt(e.target.value);
                    setProtons(z);
                    // Match neutrons and electrons to maintain stable neutral isotope references
                    const ref = ELEMENTS.find(el => el.z === z) || ELEMENTS[0];
                    setElectrons(z);
                    setNeutrons(z === 1 ? 0 : z === 3 ? 4 : z === 4 ? 5 : z === 9 ? 10 : z);
                  }}
                  style={{ width: '100%', height: 4, accentColor: '#22C5A0' }}
                />
              </div>

              {/* Neutrons Slider */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                  <span style={{ color: '#8892B0' }}>Neutrons (Isotope)</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#5B8CF8' }}>{neutrons} n⁰</span>
                </div>
                <input
                  type="range" min={0} max={12} step={1}
                  value={neutrons} onChange={(e) => setNeutrons(parseInt(e.target.value))}
                  style={{ width: '100%', height: 4, accentColor: '#22C5A0' }}
                />
              </div>

              {/* Element Info Card */}
              <div style={{ padding: 12, background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 10, color: '#647298', fontWeight: 800, textTransform: 'uppercase' }}>Identified Element Info</span>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: '#8892B0' }}>Element Name:</span>
                  <strong style={{ color: '#F8FAFC' }}>{activeElement.name} ({activeElement.symbol})</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: '#8892B0' }}>Classification:</span>
                  <span style={{ color: '#22C5A0', fontWeight: 600 }}>{activeElement.category}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: '#8892B0' }}>Atomic Mass:</span>
                  <span style={{ fontFamily: 'monospace' }}>{(protons + neutrons)} u</span>
                </div>
              </div>
            </div>
          )}

          {/* GAS LAWS CONTROLS */}
          {selectedExperiment === 'gas' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: 11, color: '#22C5A0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Sliders size={13} /> Thermodynamic variables
              </div>

              {/* Temperature */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                  <span style={{ color: '#8892B0' }}>Temperature (T)</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{gasTemp} K</span>
                </div>
                <input
                  type="range" min={100} max={600} step={10}
                  value={gasTemp} onChange={(e) => setGasTemp(parseInt(e.target.value))}
                  style={{ width: '100%', height: 4, accentColor: '#22C5A0' }}
                />
              </div>

              {/* Volume */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                  <span style={{ color: '#8892B0' }}>Chamber Volume (V)</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{gasVolume.toFixed(1)} Liters</span>
                </div>
                <input
                  type="range" min={1.0} max={5.0} step={0.1}
                  value={gasVolume} onChange={(e) => setGasVolume(parseFloat(e.target.value))}
                  style={{ width: '100%', height: 4, accentColor: '#22C5A0' }}
                />
              </div>

              {/* Moles */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                  <span style={{ color: '#8892B0' }}>Gas amount (n)</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{gasMoles.toFixed(1)} moles</span>
                </div>
                <input
                  type="range" min={0.5} max={4.0} step={0.1}
                  value={gasMoles} onChange={(e) => setGasMoles(parseFloat(e.target.value))}
                  style={{ width: '100%', height: 4, accentColor: '#22C5A0' }}
                />
              </div>

              {/* Pressure Readout */}
              <div style={{ padding: 12, background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 9.5, color: '#647298', fontWeight: 800, textTransform: 'uppercase' }}>Ideal Gas Solver</span>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: '#8892B0' }}>Computed Pressure (P):</span>
                  <strong style={{ color: '#22C5A0', fontFamily: 'monospace' }}>{gasPressure.toFixed(2)} atm</strong>
                </div>
              </div>
            </div>
          )}

          {/* TITRATION CONTROLS */}
          {selectedExperiment === 'titration' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: 11, color: '#22C5A0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Sliders size={13} /> Titration concentrations
              </div>

              {/* Acid Conc HCl */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                  <span style={{ color: '#8892B0' }}>Acid Conc [HCl]</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{acidConc.toFixed(2)} M</span>
                </div>
                <input
                  type="range" min={0.05} max={0.5} step={0.01}
                  value={acidConc} onChange={(e) => setAcidConc(parseFloat(e.target.value))}
                  style={{ width: '100%', height: 4, accentColor: '#22C5A0' }}
                />
              </div>

              {/* Base Conc NaOH */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                  <span style={{ color: '#8892B0' }}>Base Conc [NaOH]</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{baseConc.toFixed(2)} M</span>
                </div>
                <input
                  type="range" min={0.05} max={0.5} step={0.01}
                  value={baseConc} onChange={(e) => setBaseConc(parseFloat(e.target.value))}
                  style={{ width: '100%', height: 4, accentColor: '#22C5A0' }}
                />
              </div>

              {/* Drip stopcock control button */}
              <button
                onClick={() => setIsDripping(!isDripping)}
                disabled={baseAdded >= 50}
                style={{
                  background: isDripping ? '#F55B6B' : '#22C5A0',
                  color: '#000000',
                  border: 'none',
                  padding: '8px 12px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: baseAdded >= 50 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                  opacity: baseAdded >= 50 ? 0.5 : 1
                }}
              >
                <Sparkles size={12} fill="currentColor" /> {isDripping ? 'Stop Stopcock' : 'Open Stopcock (Drip)'}
              </button>

              {/* Titration Live Readout */}
              <div style={{ padding: 12, background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5 }}>
                <span style={{ fontSize: 9.5, color: '#647298', fontWeight: 800, textTransform: 'uppercase' }}>Reaction Monitoring</span>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#8892B0' }}>Base Added (NaOH):</span>
                  <strong style={{ fontFamily: 'monospace' }}>{baseAdded.toFixed(1)} ml</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#8892B0' }}>pH Level:</span>
                  <strong style={{ color: titrationPh > 8.2 ? '#F55B6B' : '#22C5A0', fontFamily: 'monospace' }}>{titrationPh.toFixed(2)}</strong>
                </div>
              </div>
            </div>
          )}

          {/* MOLECULAR DIFFUSION CONTROLS */}
          {selectedExperiment === 'diffusion' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: 11, color: '#22C5A0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Sliders size={13} /> Diffusion variables
              </div>

              {/* Temperature */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                  <span style={{ color: '#8892B0' }}>Temperature (T)</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{diffusionTemp} K</span>
                </div>
                <input
                  type="range" min={100} max={600} step={10}
                  value={diffusionTemp} onChange={(e) => setDiffusionTemp(parseInt(e.target.value))}
                  style={{ width: '100%', height: 4, accentColor: '#22C5A0' }}
                />
              </div>

              {/* Gas selection */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 12.5, color: '#8892B0' }}>Gas Molecular Weight</span>
                <select
                  value={diffusionGas}
                  onChange={(e) => setDiffusionGas(e.target.value)}
                  style={{
                    background: '#131824',
                    color: '#DDE3F2',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 6,
                    padding: '6px 10px',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  <option value="helium">🎈 Helium (Mw = 4 g/mol)</option>
                  <option value="neon">🔋 Neon (Mw = 20 g/mol)</option>
                  <option value="xenon">💎 Xenon (Mw = 131 g/mol)</option>
                </select>
              </div>

              {/* Partition toggle */}
              <button
                onClick={() => setIsPartitionOpen(!isPartitionOpen)}
                style={{
                  background: isPartitionOpen ? 'rgba(255,255,255,0.06)' : '#5B8CF8',
                  color: isPartitionOpen ? '#DDE3F2' : '#ffffff',
                  border: 'none',
                  padding: '8px 12px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5
                }}
              >
                <Compass size={12} /> {isPartitionOpen ? 'Close Chamber Partition' : 'Open Chamber Partition'}
              </button>
            </div>
          )}

          {/* PERIODIC TABLE TRENDS CONTROLS */}
          {selectedExperiment === 'trends' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: 11, color: '#22C5A0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Sliders size={13} /> Trends Properties
              </div>

              {/* Element Selection */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 12.5, color: '#8892B0' }}>Select Period 1 & 2 Element</span>
                <select
                  value={trendElementIndex}
                  onChange={(e) => setTrendElementIndex(parseInt(e.target.value))}
                  style={{
                    background: '#131824',
                    color: '#DDE3F2',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 6,
                    padding: '6px 10px',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  {ELEMENTS.map((el, idx) => (
                    <option key={el.z} value={idx}>
                      Z = {el.z}: {el.name} ({el.symbol})
                    </option>
                  ))}
                </select>
              </div>

              {/* Property Selection */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 12.5, color: '#8892B0' }}>Visualized Property</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {[
                    { label: 'Atomic Radius', val: 'radius' },
                    { label: 'Electronegativity', val: 'electronegativity' }
                  ].map(prop => (
                    <button
                      key={prop.val}
                      onClick={() => setSelectedProperty(prop.val)}
                      style={{
                        padding: '6px 8px',
                        borderRadius: 6,
                        border: '1px solid rgba(255,255,255,0.06)',
                        background: selectedProperty === prop.val ? 'rgba(34, 197, 160, 0.1)' : '#131824',
                        color: selectedProperty === prop.val ? '#22C5A0' : '#8892B0',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                    >
                      {prop.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Readout values */}
              <div style={{ padding: 12, background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5 }}>
                <span style={{ fontSize: 9.5, color: '#647298', fontWeight: 800, textTransform: 'uppercase' }}>Property Values</span>
                <div style={{ display: 'flex', justifyBetween: 'space-between', justifyContent: 'space-between' }}>
                  <span style={{ color: '#8892B0' }}>Atomic Radius:</span>
                  <strong style={{ fontFamily: 'monospace' }}>{activeTrendElement.radius} pm</strong>
                </div>
                <div style={{ display: 'flex', justifyBetween: 'space-between', justifyContent: 'space-between' }}>
                  <span style={{ color: '#8892B0' }}>Electronegativity:</span>
                  <strong style={{ color: '#22C5A0', fontFamily: 'monospace' }}>{activeTrendElement.electronegativity > 0 ? activeTrendElement.electronegativity.toFixed(2) : 'N/A'}</strong>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Bottom Playback toolbar */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              style={{
                background: isPlaying ? 'rgba(34, 197, 160, 0.1)' : '#22C5A0',
                border: 'none',
                color: isPlaying ? '#22C5A0' : '#000000',
                padding: '6px 10px',
                borderRadius: 6,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 12,
                fontWeight: 700
              }}
            >
              {isPlaying ? <Pause size={12} /> : <Play size={12} fill="currentColor" />}
              {isPlaying ? 'Pause' : 'Play'}
            </button>

            <button
              onClick={() => {
                if (selectedExperiment === 'gas') {
                  setGasTemp(300);
                  setGasVolume(3.0);
                  setGasMoles(2.0);
                } else if (selectedExperiment === 'titration') {
                  setBaseAdded(0.0);
                  setIsDripping(false);
                } else if (selectedExperiment === 'diffusion') {
                  setIsPartitionOpen(false);
                  // Resets particle left coordinates
                  diffParticles.forEach(p => {
                    p.pos.set(
                      -1.8 + Math.random() * 1.6,
                      -1.4 + Math.random() * 1.8,
                      -0.8 + Math.random() * 1.6
                    );
                    p.vel.set(0, 0, 0);
                  });
                }
              }}
              title="Reset Positions"
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#8892B0',
                padding: '6px',
                borderRadius: 6,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <RotateCcw size={12} />
            </button>
          </div>

          {/* TimeScale */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: 6, padding: 2 }}>
            {[
              { label: '1.0x', val: 1.0 },
              { label: '0.25x (Slow)', val: 0.25 }
            ].map(item => (
              <button
                key={item.label}
                onClick={() => setTimeScale(item.val)}
                style={{
                  padding: '3px 8px',
                  borderRadius: 4,
                  border: 'none',
                  fontSize: 10.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: timeScale === item.val ? '#1E293B' : 'transparent',
                  color: timeScale === item.val ? '#22C5A0' : '#647298',
                  transition: 'all 0.15s'
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* --- RIGHT COLUMN: 3D canvas mount --- */}
      <div style={{ flex: 1, height: '100%', position: 'relative' }}>
        <div ref={mountRef} style={{ width: '100%', height: '100%', zIndex: 1 }} />
      </div>

    </div>
  );
}
