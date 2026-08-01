'use client';

import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import {
  Dna, Sparkles, Sliders, Info, Zap,
  RotateCcw, Play, Pause, Activity, Eye, Info as InfoIcon
} from 'lucide-react';
import { T } from '@/lib/lms-data';

// Biological Organelle Details
const ORGANELLES = [
  { id: 'nucleus', name: 'Nucleus', color: 0xF55B6B, function: 'The control center of the cell. It houses DNA (genetic material) and coordinates key cellular operations like growth, metabolism, protein synthesis, and division.' },
  { id: 'mitochondria', name: 'Mitochondria', color: 0xF5A95B, function: 'The powerhouse of the cell. They perform cellular respiration, converting glucose and oxygen into usable energy in the form of ATP molecules.' },
  { id: 'er', name: 'Endoplasmic Reticulum', color: 0x9B6EF8, function: 'A network of folded membranes. Rough ER synthesizes proteins using attached ribosomes; Smooth ER synthesizes lipids and detoxifies toxins.' },
  { id: 'golgi', name: 'Golgi Apparatus', color: 0x22C5A0, function: 'The postal department. It receives proteins and lipids from the ER, modifies, sorts, packages, and ships them to their final targets.' },
  { id: 'lysosome', name: 'Lysosome', color: 0x3b82f6, function: 'The waste disposal system. Contains acidic digestive enzymes that break down worn-out organelles, waste materials, and foreign pathogens.' }
];

export default function BiologyLab() {
  const [selectedExperiment, setSelectedExperiment] = useState('cell');
  const [isPlaying, setIsPlaying] = useState(true);
  const [timeScale, setTimeScale] = useState(1);

  // --- 1. Animal Cell States ---
  const [selectedOrganelleId, setSelectedOrganelleId] = useState('nucleus');
  const activeOrganelle = ORGANELLES.find(o => o.id === selectedOrganelleId) || ORGANELLES[0];
  const [highlightTrigger, setHighlightTrigger] = useState(null);

  // --- 2. Ecosystem Food Web States ---
  const [initPlants, setInitPlants] = useState(50);
  const [initRabbits, setInitRabbits] = useState(15);
  const [initFoxes, setInitFoxes] = useState(5);
  const [populationRates, setPopulationRates] = useState({ plants: 50, rabbits: 15, foxes: 5 });
  
  // Plot History
  const [historyData, setHistoryData] = useState([]);

  // DOM Mount Ref & Simulation States Reference
  const mountRef = useRef(null);
  const simStateRef = useRef({
    isPlaying: true,
    timeScale: 1,
    selectedExperiment: 'cell',
    // Cell Click selection
    cell: { selectedId: 'nucleus', lastSelectedId: 'nucleus' },
    // Ecosystem dynamic populations
    ecosystem: { plants: 50, rabbits: 15, foxes: 5, t: 0 }
  });

  // Sync React states to ref
  useEffect(() => {
    simStateRef.current.isPlaying = isPlaying;
    simStateRef.current.timeScale = timeScale;
    simStateRef.current.selectedExperiment = selectedExperiment;
    simStateRef.current.cell.selectedId = selectedOrganelleId;
  }, [isPlaying, timeScale, selectedExperiment, selectedOrganelleId]);

  // Reset Ecosystem populations on parameters change
  const handleResetEcosystem = () => {
    simStateRef.current.ecosystem.plants = initPlants;
    simStateRef.current.ecosystem.rabbits = initRabbits;
    simStateRef.current.ecosystem.foxes = initFoxes;
    simStateRef.current.ecosystem.t = 0;
    setPopulationRates({ plants: initPlants, rabbits: initRabbits, foxes: initFoxes });
    setHistoryData([]);
  };

  // Main Three.js Runner
  useEffect(() => {
    const container = mountRef.current;
    if (!container || typeof window === 'undefined') return;

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 400;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#07080F');

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.set(0, 2, 7);

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

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
    dirLight.position.set(5, 8, 5);
    scene.add(dirLight);

    const gridHelper = new THREE.GridHelper(20, 20, 0x9B6EF8, 0x1E293B);
    gridHelper.position.y = -2.5;
    scene.add(gridHelper);

    // --- Materials Cache ---
    const cytoplasmMat = new THREE.MeshStandardMaterial({ color: 0x9B6EF8, transparent: true, opacity: 0.12, roughness: 0.1 });
    const nucleusMat = new THREE.MeshStandardMaterial({ color: 0xF55B6B, roughness: 0.2 }); // Red
    const mitoMat = new THREE.MeshStandardMaterial({ color: 0xF5A95B, roughness: 0.2 }); // Orange
    const erMat = new THREE.MeshStandardMaterial({ color: 0x9B6EF8, roughness: 0.3 }); // Purple
    const golgiMat = new THREE.MeshStandardMaterial({ color: 0x22C5A0, roughness: 0.2 }); // Green
    const lysoMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.1 }); // Blue

    // --- 1. ANIMAL CELL GROUP ---
    const cellGroup = new THREE.Group();
    scene.add(cellGroup);

    // Outer Cytoplasm Sphere
    const cytoGeo = new THREE.SphereGeometry(2.8, 32, 32);
    const cyto = new THREE.Mesh(cytoGeo, cytoplasmMat);
    cellGroup.add(cyto);

    // Central Nucleus sphere
    const nucGeo = new THREE.SphereGeometry(0.72, 32, 32);
    const nucleus = new THREE.Mesh(nucGeo, nucleusMat);
    nucleus.position.set(0, 0, 0);
    cellGroup.add(nucleus);

    // Mitochondria (2 bean-like capsule meshes)
    const mitoGeo = new THREE.CapsuleGeometry(0.18, 0.4, 8, 16);
    const mito1 = new THREE.Mesh(mitoGeo, mitoMat);
    mito1.position.set(1.4, -0.6, 0.8);
    mito1.rotation.set(0.4, 0.8, -0.5);
    cellGroup.add(mito1);

    const mito2 = new THREE.Mesh(mitoGeo, mitoMat);
    mito2.position.set(-1.3, 0.8, -1.0);
    mito2.rotation.set(-0.3, -0.6, 0.6);
    cellGroup.add(mito2);

    // ER Folded Layers (Represented by a torus knot or curved cylinders)
    const erGeo = new THREE.TorusKnotGeometry(0.68, 0.08, 64, 8, 3, 4);
    const er = new THREE.Mesh(erGeo, erMat);
    er.position.set(-0.8, -0.6, 0.5);
    cellGroup.add(er);

    // Golgi stacks (Rendered as 3 thin stacked squashed cylinders)
    const golgiContainer = new THREE.Group();
    golgiContainer.position.set(0.9, 0.9, -0.5);
    cellGroup.add(golgiContainer);

    const stackGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.04, 16);
    for (let i = 0; i < 3; i++) {
      const disc = new THREE.Mesh(stackGeo, golgiMat);
      disc.position.y = i * 0.12;
      disc.scale.set(1.0 - i * 0.15, 1.0, 1.0 - i * 0.15); // tapers up
      disc.rotation.x = 0.3;
      golgiContainer.add(disc);
    }

    // Lysosomes (3 small blue spheres)
    const lysoGeo = new THREE.SphereGeometry(0.14, 16, 16);
    const lyso1 = new THREE.Mesh(lysoGeo, lysoMat);
    lyso1.position.set(-0.5, 1.4, 0.8);
    cellGroup.add(lyso1);

    const lyso2 = new THREE.Mesh(lysoGeo, lysoMat);
    lyso2.position.set(1.1, -1.0, -0.8);
    cellGroup.add(lyso2);

    const lyso3 = new THREE.Mesh(lysoGeo, lysoMat);
    lyso3.position.set(-1.2, -1.1, -0.3);
    cellGroup.add(lyso3);

    // Organelle array mapping for animations
    const organelleMapping = {
      nucleus: [nucleus],
      mitochondria: [mito1, mito2],
      er: [er],
      golgi: [golgiContainer],
      lysosome: [lyso1, lyso2, lyso3]
    };

    // --- 2. ECOSYSTEM GROUP ---
    const ecosystemGroup = new THREE.Group();
    scene.add(ecosystemGroup);

    // Landscape terrain plane
    const terrainGeo = new THREE.PlaneGeometry(10, 10);
    const terrainMat = new THREE.MeshStandardMaterial({ color: 0x1E293B, roughness: 0.8 });
    const terrain = new THREE.Mesh(terrainGeo, terrainMat);
    terrain.rotation.x = -Math.PI / 2;
    terrain.position.y = -2.48;
    ecosystemGroup.add(terrain);

    // Plants (Green small hemisphere meshes)
    const maxPlantMeshes = 80;
    const plantMeshes = [];
    const plantGeo = new THREE.SphereGeometry(0.1, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const plantMat = new THREE.MeshStandardMaterial({ color: 0x22C5A0, roughness: 0.9 });
    for (let i = 0; i < maxPlantMeshes; i++) {
      const p = new THREE.Mesh(plantGeo, plantMat);
      // distribute randomly on terrain
      p.position.set(
        (Math.random() - 0.5) * 9.0,
        -2.48,
        (Math.random() - 0.5) * 9.0
      );
      p.visible = false;
      ecosystemGroup.add(p);
      plantMeshes.push(p);
    }

    // Rabbits (White small capsules/boxes hopping)
    const maxRabbitMeshes = 40;
    const rabbitMeshes = [];
    const rabbitGeo = new THREE.BoxGeometry(0.14, 0.14, 0.22);
    const rabbitMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
    for (let i = 0; i < maxRabbitMeshes; i++) {
      const r = new THREE.Mesh(rabbitGeo, rabbitMat);
      r.position.set(
        (Math.random() - 0.5) * 8.5,
        -2.41,
        (Math.random() - 0.5) * 8.5
      );
      r.visible = false;
      ecosystemGroup.add(r);
      
      rabbitMeshes.push({
        mesh: r,
        angle: Math.random() * Math.PI * 2,
        hopPhase: Math.random() * Math.PI,
        hopSpeed: 4.0 + Math.random() * 2.0
      });
    }

    // Foxes (Red/Orange box predators running)
    const maxFoxMeshes = 20;
    const foxMeshes = [];
    const foxGeo = new THREE.BoxGeometry(0.2, 0.18, 0.36);
    const foxMat = new THREE.MeshStandardMaterial({ color: 0xF5A95B, roughness: 0.5 });
    for (let i = 0; i < maxFoxMeshes; i++) {
      const f = new THREE.Mesh(foxGeo, foxMat);
      f.position.set(
        (Math.random() - 0.5) * 8.0,
        -2.39,
        (Math.random() - 0.5) * 8.0
      );
      f.visible = false;
      ecosystemGroup.add(f);

      foxMeshes.push({
        mesh: f,
        angle: Math.random() * Math.PI * 2,
        phase: Math.random() * Math.PI * 2
      });
    }

    // --- Dynamic Physics Solver Loops ---
    const clock = new THREE.Clock();
    let animationId;
    let chartTimer = 0;

    const animate = () => {
      animationId = requestAnimationFrame(animate);

      const dt = clock.getDelta();
      const state = simStateRef.current;
      const cappedDt = Math.min(dt, 0.05) * (state.isPlaying ? state.timeScale : 0);

      // Hide all groups except selected
      cellGroup.visible = state.selectedExperiment === 'cell';
      ecosystemGroup.visible = state.selectedExperiment === 'ecosystem';

      // Re-center camera controls target
      if (state.selectedExperiment === 'cell') {
        controls.target.set(0, 0, 0);
      } else if (state.selectedExperiment === 'ecosystem') {
        controls.target.set(0, -1.8, 0);
      }

      // --- 1. Animal Cell Animations ---
      if (state.selectedExperiment === 'cell') {
        // Spin the entire cell slowly
        cellGroup.rotation.y += cappedDt * 0.15;
        
        // Highlight active organelle with a pulsing scale effect
        Object.entries(organelleMapping).forEach(([orgId, meshes]) => {
          const isActive = orgId === state.cell.selectedId;
          meshes.forEach(mesh => {
            if (isActive) {
              const pulse = 1.0 + Math.sin(clock.getElapsedTime() * 4.0) * 0.08;
              mesh.scale.set(pulse, pulse, pulse);
              // Make emissive glow
              if (mesh.material && mesh.material.emissive) {
                mesh.material.emissive.setHex(mesh.material.color.getHex());
                mesh.material.emissiveIntensity = 0.25;
              }
            } else {
              mesh.scale.set(1.0, 1.0, 1.0);
              if (mesh.material && mesh.material.emissive) {
                mesh.material.emissive.setHex(0x000000);
              }
            }
          });
        });
      }

      // --- 2. Ecosystem Lotka-Volterra Calculations ---
      if (state.selectedExperiment === 'ecosystem') {
        const eco = state.ecosystem;

        // Rate Constants
        const alpha = 0.55;  // Plant growth rate
        const beta = 0.035;  // Rabbit consumption rate
        const delta = 0.016; // Rabbit birth rate from eating plants
        const gamma = 0.25;  // Rabbit natural death rate
        const epsilon = 0.08; // Fox predation rate
        const eta = 0.04;    // Fox birth rate from eating rabbits
        const theta = 0.35;  // Fox natural death rate

        // Solver differential integration: Lotka-Volterra equations
        const plants = eco.plants;
        const rabbits = eco.rabbits;
        const foxes = eco.foxes;

        // Run only if playing
        if (state.isPlaying) {
          const steps = 5; // sub-stepping for numerical stability
          const subDt = cappedDt / steps;

          for (let step = 0; step < steps; step++) {
            const dPlants = eco.plants * (alpha - beta * eco.rabbits);
            const dRabbits = eco.rabbits * (delta * eco.plants - gamma - epsilon * eco.foxes);
            const dFoxes = eco.foxes * (eta * eco.rabbits - theta);

            eco.plants += dPlants * subDt;
            eco.rabbits += dRabbits * subDt;
            eco.foxes += dFoxes * subDt;

            // Clamp positive populations
            eco.plants = Math.max(0.1, eco.plants);
            eco.rabbits = Math.max(0.1, eco.rabbits);
            eco.foxes = Math.max(0.1, eco.foxes);
          }

          // Record population data periodically (every 0.5s) for live graph overlay
          chartTimer += cappedDt;
          if (chartTimer >= 0.5) {
            chartTimer = 0;
            eco.t += 0.5;
            
            // Set stats for React overlay
            setPopulationRates({
              plants: eco.plants,
              rabbits: eco.rabbits,
              foxes: eco.foxes
            });

            setHistoryData(prev => {
              const next = [...prev, {
                t: eco.t,
                plants: eco.plants,
                rabbits: eco.rabbits,
                foxes: eco.foxes
              }];
              // Cap history array at last 40 data points
              if (next.length > 40) next.shift();
              return next;
            });
          }
        }

        // --- Visual Mesh Distributions on Terrain ---
        // 1. Plant meshes visible
        const plantCount = Math.min(maxPlantMeshes, Math.round(eco.plants));
        plantMeshes.forEach((mesh, idx) => {
          mesh.visible = idx < plantCount;
        });

        // 2. Rabbit meshes visible & hopping
        const rabbitCount = Math.min(maxRabbitMeshes, Math.round(eco.rabbits));
        rabbitMeshes.forEach((r, idx) => {
          if (idx >= rabbitCount) {
            r.mesh.visible = false;
            return;
          }
          r.mesh.visible = true;

          // Hopping translation animation
          if (state.isPlaying) {
            r.hopPhase += cappedDt * r.hopSpeed;
            
            // Move rabbit forward along its angle
            const speed = 0.5;
            r.mesh.position.x += Math.cos(r.angle) * speed * cappedDt;
            r.mesh.position.z += Math.sin(r.angle) * speed * cappedDt;

            // Bounce off landscape walls X: [-4.5, 4.5], Z: [-4.5, 4.5]
            if (Math.abs(r.mesh.position.x) > 4.5 || Math.abs(r.mesh.position.z) > 4.5) {
              r.angle = (r.angle + Math.PI) % (Math.PI * 2);
              r.mesh.position.x = Math.max(-4.5, Math.min(4.5, r.mesh.position.x));
              r.mesh.position.z = Math.max(-4.5, Math.min(4.5, r.mesh.position.z));
            }

            // Hopping Y position
            const hopHeight = 0.15;
            r.mesh.position.y = -2.41 + Math.abs(Math.sin(r.hopPhase)) * hopHeight;
            r.mesh.rotation.y = -r.angle;
          }
        });

        // 3. Fox meshes visible & running
        const foxCount = Math.min(maxFoxMeshes, Math.round(eco.foxes));
        foxMeshes.forEach((f, idx) => {
          if (idx >= foxCount) {
            f.mesh.visible = false;
            return;
          }
          f.mesh.visible = true;

          if (state.isPlaying) {
            f.phase += cappedDt * 3.0;

            // Simple predator chase logic towards nearest active rabbit or random walk
            const speed = 1.0;
            f.mesh.position.x += Math.cos(f.angle) * speed * cappedDt;
            f.mesh.position.z += Math.sin(f.angle) * speed * cappedDt;

            if (Math.abs(f.mesh.position.x) > 4.5 || Math.abs(f.mesh.position.z) > 4.5) {
              f.angle = (f.angle + Math.PI / 2) % (Math.PI * 2);
              f.mesh.position.x = Math.max(-4.5, Math.min(4.5, f.mesh.position.x));
              f.mesh.position.z = Math.max(-4.5, Math.min(4.5, f.mesh.position.z));
            }

            // Body wiggle running animation
            f.mesh.rotation.y = -f.angle + Math.sin(f.phase) * 0.15;
          }
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
          <Dna size={20} color="#9B6EF8" />
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0, letterSpacing: '-0.01em', color: '#F8FAFC' }}>Biology Lab</h2>
            <span style={{ fontSize: 10.5, color: '#647298', fontWeight: 600 }}>Cell Structure & Ecology Sandbox</span>
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
              handleResetEcosystem();
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
            <option value="cell">🦠 Animal Cell Structure</option>
            <option value="ecosystem">🦊 Ecosystem Food Web</option>
          </select>
        </div>

        {/* Dynamic scroll sidebar controls */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }} className="sandbox-scroll">
          
          {/* ANIMAL CELL CONTROLS */}
          {selectedExperiment === 'cell' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: 11, color: '#9B6EF8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Eye size={13} /> Select Cell Organelle
              </div>

              {/* Organelle Buttons List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {ORGANELLES.map(o => (
                  <button
                    key={o.id}
                    onClick={() => setSelectedOrganelleId(o.id)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid rgba(255,255,255,0.06)',
                      background: selectedOrganelleId === o.id ? `${T.accent}12` : '#131824',
                      color: selectedOrganelleId === o.id ? T.accent : '#8892B0',
                      cursor: 'pointer',
                      fontSize: 12.5,
                      fontWeight: 700,
                      textAlign: 'left',
                      transition: 'all 0.15s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#' + o.color.toString(16) }} />
                      {o.name}
                    </div>
                  </button>
                ))}
              </div>

              {/* Explanatory Info Card */}
              <div style={{ padding: 12, background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: T.accent, fontWeight: 800, textTransform: 'uppercase' }}>
                  <InfoIcon size={12} /> Organelle Function
                </div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#F8FAFC', margin: '2px 0 0 0' }}>{activeOrganelle.name}</h3>
                <p style={{ fontSize: 12, color: '#8892B0', margin: 0, lineHeight: 1.5 }}>
                  {activeOrganelle.function}
                </p>
              </div>
            </div>
          )}

          {/* ECOSYSTEM POPULATION CONTROLS */}
          {selectedExperiment === 'ecosystem' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: 11, color: '#9B6EF8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Sliders size={13} /> Initial Populations
              </div>

              {/* Plants */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                  <span style={{ color: '#8892B0' }}>Initial Plants</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#22C5A0' }}>{initPlants}</span>
                </div>
                <input
                  type="range" min={10} max={80} step={5}
                  value={initPlants} onChange={(e) => setInitPlants(parseInt(e.target.value))}
                  style={{ width: '100%', height: 4, accentColor: '#9B6EF8' }}
                />
              </div>

              {/* Rabbits */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                  <span style={{ color: '#8892B0' }}>Initial Rabbits (Prey)</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#F8FAFC' }}>{initRabbits}</span>
                </div>
                <input
                  type="range" min={5} max={30} step={1}
                  value={initRabbits} onChange={(e) => setInitRabbits(parseInt(e.target.value))}
                  style={{ width: '100%', height: 4, accentColor: '#9B6EF8' }}
                />
              </div>

              {/* Foxes */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                  <span style={{ color: '#8892B0' }}>Initial Foxes (Predators)</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#F5A95B' }}>{initFoxes}</span>
                </div>
                <input
                  type="range" min={2} max={15} step={1}
                  value={initFoxes} onChange={(e) => setInitFoxes(parseInt(e.target.value))}
                  style={{ width: '100%', height: 4, accentColor: '#9B6EF8' }}
                />
              </div>

              {/* Re-seed button */}
              <button
                onClick={handleResetEcosystem}
                style={{
                  background: '#9B6EF8',
                  color: '#ffffff',
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
                <RotateCcw size={12} /> Apply & Reset Populations
              </button>

              {/* Current Status Readout */}
              <div style={{ padding: 12, background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5 }}>
                <span style={{ fontSize: 9.5, color: '#647298', fontWeight: 800, textTransform: 'uppercase' }}>Current Populations</span>
                <div style={{ display: 'flex', justifyBetween: 'space-between', justifyContent: 'space-between' }}>
                  <span style={{ color: '#8892B0' }}>Plants (Producer):</span>
                  <strong style={{ color: '#22C5A0', fontFamily: 'monospace' }}>{Math.round(populationRates.plants)}</strong>
                </div>
                <div style={{ display: 'flex', justifyBetween: 'space-between', justifyContent: 'space-between' }}>
                  <span style={{ color: '#8892B0' }}>Rabbits (Primary):</span>
                  <strong style={{ color: '#F8FAFC', fontFamily: 'monospace' }}>{Math.round(populationRates.rabbits)}</strong>
                </div>
                <div style={{ display: 'flex', justifyBetween: 'space-between', justifyContent: 'space-between' }}>
                  <span style={{ color: '#8892B0' }}>Foxes (Secondary):</span>
                  <strong style={{ color: '#F5A95B', fontFamily: 'monospace' }}>{Math.round(populationRates.foxes)}</strong>
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
                background: isPlaying ? 'rgba(155, 110, 248, 0.1)' : '#9B6EF8',
                border: 'none',
                color: isPlaying ? '#9B6EF8' : '#ffffff',
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
                  color: timeScale === item.val ? '#9B6EF8' : '#647298',
                  transition: 'all 0.15s'
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* --- RIGHT COLUMN: 3D Canvas + SVG Line Chart Overlay --- */}
      <div style={{ flex: 1, height: '100%', position: 'relative', display: 'flex', flexDirection: 'column' }}>
        
        {/* Three.js Canvas container */}
        <div ref={mountRef} style={{ width: '100%', height: '100%', zIndex: 1 }} />

        {/* Live Lotka-Volterra SVG Graph Plot overlay */}
        {selectedExperiment === 'ecosystem' && historyData.length > 1 && (
          <div style={{
            position: 'absolute',
            bottom: 20,
            left: 20,
            zIndex: 10,
            width: 320,
            background: 'rgba(7, 8, 15, 0.88)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12,
            padding: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            pointerEvents: 'none'
          }}>
            <span style={{ fontSize: 9, color: '#647298', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Lotka-Volterra Population Curve
            </span>

            {/* SVG line chart plotter */}
            <svg viewBox="0 0 300 120" style={{ width: '100%', height: 110 }}>
              {/* Grid Lines */}
              <line x1="0" y1="20" x2="300" y2="20" stroke="rgba(255,255,255,0.05)" strokeDasharray="3" />
              <line x1="0" y1="60" x2="300" y2="60" stroke="rgba(255,255,255,0.05)" strokeDasharray="3" />
              <line x1="0" y1="100" x2="300" y2="100" stroke="rgba(255,255,255,0.05)" strokeDasharray="3" />

              {/* Render dynamic line paths */}
              {(() => {
                const maxVal = 100; // max population boundary
                const width = 300;
                const height = 120;
                
                const getPoints = (key) => {
                  return historyData.map((d, i) => {
                    const x = (i / (historyData.length - 1)) * width;
                    const y = height - (d[key] / maxVal) * (height - 10) - 5;
                    return `${x.toFixed(1)},${y.toFixed(1)}`;
                  }).join(' ');
                };

                return (
                  <>
                    {/* Plants line (Green) */}
                    <polyline fill="none" stroke="#22C5A0" strokeWidth="2.0" points={getPoints('plants')} />
                    {/* Rabbits line (White) */}
                    <polyline fill="none" stroke="#ffffff" strokeWidth="2.0" points={getPoints('rabbits')} />
                    {/* Foxes line (Gold) */}
                    <polyline fill="none" stroke="#F5A95B" strokeWidth="2.0" points={getPoints('foxes')} />
                  </>
                );
              })()}
            </svg>

            {/* Legend indicators */}
            <div style={{ display: 'flex', gap: 10, fontSize: 10, fontWeight: 700, justifyContent: 'center', marginTop: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C5A0' }} />
                <span style={{ color: '#22C5A0' }}>Plants</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ffffff' }} />
                <span style={{ color: '#ffffff' }}>Rabbits</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#F5A95B' }} />
                <span style={{ color: '#F5A95B' }}>Foxes</span>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
