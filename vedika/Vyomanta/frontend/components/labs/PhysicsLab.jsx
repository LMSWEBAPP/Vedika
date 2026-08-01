'use client';

import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import {
  Play, Pause, RotateCcw, Award, Sliders, Info, Zap,
  ChevronRight, Sparkles, HelpCircle, Activity, Lightbulb, Compass
} from 'lucide-react';
import { T } from '@/lib/lms-data';

// --- Helical Spring Path Generator Helper ---
class HelixPath extends THREE.Curve {
  constructor(radius = 0.25, turns = 10, height = 2) {
    super();
    this.radius = radius;
    this.turns = turns;
    this.height = height;
  }
  getPoint(t) {
    const angle = t * Math.PI * 2 * this.turns;
    const x = Math.cos(angle) * this.radius;
    const z = Math.sin(angle) * this.radius;
    const y = -t * this.height; // starts at y=0, extends downward
    return new THREE.Vector3(x, y, z);
  }
}

export default function PhysicsLab() {
  const [selectedExperiment, setSelectedExperiment] = useState('pendulum');
  const [isPlaying, setIsPlaying] = useState(true);
  const [timeScale, setTimeScale] = useState(1); // 1 = normal, 0.25 = slow motion
  
  // --- Simulation Parameters & Variables ---
  // 1. Pendulum
  const [pendulumLength, setPendulumLength] = useState(2.5); // meters
  const [pendulumMass, setPendulumMass] = useState(2); // kg
  const [pendulumGravity, setPendulumGravity] = useState(9.8); // m/s^2 (preset)
  const [pendulumDamping, setPendulumDamping] = useState(0.1); // damping coefficient
  
  // 2. Projectile Motion
  const [projectileVelocity, setProjectileVelocity] = useState(15); // m/s
  const [projectileAngle, setProjectileAngle] = useState(45); // degrees
  const [projectileGravity, setProjectileGravity] = useState(9.8); // m/s^2
  const [projectileStats, setProjectileStats] = useState({ range: 0, height: 0, time: 0 });
  const [projectileFireTrigger, setProjectileFireTrigger] = useState(0); // counter to fire

  // 3. Refraction & Reflection
  const [refractionAngle, setRefractionAngle] = useState(45); // incident angle in degrees
  const [refractionN1, setRefractionN1] = useState(1.0); // refractive index 1 (Air)
  const [refractionN2, setRefractionN2] = useState(1.5); // refractive index 2 (Glass)
  const [isTIR, setIsTIR] = useState(false); // Total Internal Reflection warning flag

  // 4. Spring Mass
  const [springConstant, setSpringConstant] = useState(15); // N/m
  const [springMass, setSpringMass] = useState(1.5); // kg
  const [springDamping, setSpringDamping] = useState(0.08);

  // 5. Ohm's Law Circuit
  const [circuitVoltage, setCircuitVoltage] = useState(9); // Volts
  const [circuitResistance, setCircuitResistance] = useState(15); // Ohms
  const [circuitCurrent, setCircuitCurrent] = useState(0.6); // Amperes

  // DOM Canvas & Scene Ref
  const mountRef = useRef(null);
  const simStateRef = useRef({
    isPlaying: true,
    timeScale: 1,
    selectedExperiment: 'pendulum',
    // Pendulum dynamic states
    pendulum: { length: 2.5, mass: 2, gravity: 9.8, damping: 0.1, angle: Math.PI / 4, velocity: 0 },
    // Projectile dynamic states
    projectile: { velocity: 15, angle: 45, gravity: 9.8, t: 0, maxT: 0, isFlying: false, fireTrigger: 0 },
    // Refraction dynamic states
    refraction: { angle: 45, n1: 1.0, n2: 1.5 },
    // Spring Mass dynamic states
    spring: { k: 15, mass: 1.5, damping: 0.08, displacement: 1.0, velocity: 0 },
    // Circuit dynamic states
    circuit: { voltage: 9, resistance: 15, current: 0.6 }
  });

  // Keep ref synchronized with states
  useEffect(() => {
    simStateRef.current.isPlaying = isPlaying;
    simStateRef.current.timeScale = timeScale;
    simStateRef.current.selectedExperiment = selectedExperiment;
    
    // Pendulum
    simStateRef.current.pendulum.length = pendulumLength;
    simStateRef.current.pendulum.mass = pendulumMass;
    simStateRef.current.pendulum.gravity = pendulumGravity;
    simStateRef.current.pendulum.damping = pendulumDamping;

    // Projectile
    simStateRef.current.projectile.velocity = projectileVelocity;
    simStateRef.current.projectile.angle = projectileAngle;
    simStateRef.current.projectile.gravity = projectileGravity;
    simStateRef.current.projectile.fireTrigger = projectileFireTrigger;

    // Refraction
    simStateRef.current.refraction.angle = refractionAngle;
    simStateRef.current.refraction.n1 = refractionN1;
    simStateRef.current.refraction.n2 = refractionN2;

    // Spring
    simStateRef.current.spring.k = springConstant;
    simStateRef.current.spring.mass = springMass;
    simStateRef.current.spring.damping = springDamping;

    // Circuit
    simStateRef.current.circuit.voltage = circuitVoltage;
    simStateRef.current.circuit.resistance = circuitResistance;
    const current = circuitVoltage / circuitResistance;
    simStateRef.current.circuit.current = current;
    setCircuitCurrent(current);

  }, [
    isPlaying, timeScale, selectedExperiment,
    pendulumLength, pendulumMass, pendulumGravity, pendulumDamping,
    projectileVelocity, projectileAngle, projectileGravity, projectileFireTrigger,
    refractionAngle, refractionN1, refractionN2,
    springConstant, springMass, springDamping,
    circuitVoltage, circuitResistance
  ]);

  // Sync Projectile flight triggers
  useEffect(() => {
    if (projectileFireTrigger > 0) {
      simStateRef.current.projectile.t = 0;
      simStateRef.current.projectile.isFlying = true;
      const angleRad = (projectileAngle * Math.PI) / 180;
      const tFlight = (2 * projectileVelocity * Math.sin(angleRad)) / projectileGravity;
      simStateRef.current.projectile.maxT = tFlight;
    }
  }, [projectileFireTrigger]);

  // --- SVGs live energy / quantitative output rendering ---
  // Simple Pendulum Energy bar graphs
  const [pendulumEnergy, setPendulumEnergy] = useState({ ke: 0, pe: 0, te: 0 });
  const [springEnergy, setSpringEnergy] = useState({ ke: 0, pe: 0, te: 0 });

  // Main Three.js Runner
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
    controls.maxPolarAngle = Math.PI / 2 + 0.1; // don't go below ground too much

    // --- Lights Setup ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 7);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // Ground Grid helper
    const gridHelper = new THREE.GridHelper(20, 20, 0x5B8CF8, 0x1E293B);
    gridHelper.position.y = -2.5;
    scene.add(gridHelper);

    // --- Geometries & Materials Cache ---
    // Universal Materials
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x8892B0, roughness: 0.2, metalness: 0.8 });
    const pivotMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.1 });
    const redBobMat = new THREE.MeshStandardMaterial({ color: 0xF55B6B, roughness: 0.3, metalness: 0.2 });
    const dashedLineMat = new THREE.LineDashedMaterial({ color: 0x647298, dashSize: 0.1, gapSize: 0.05 });
    
    // --- 1. PENDULUM GROUP ---
    const pendulumGroup = new THREE.Group();
    scene.add(pendulumGroup);

    // Base Stand
    const standGeo = new THREE.CylinderGeometry(0.08, 0.08, 3.2, 16);
    const stand = new THREE.Mesh(standGeo, metalMat);
    stand.position.set(-1.2, -0.9, -0.5);
    pendulumGroup.add(stand);

    const crossbarGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.5, 16);
    const crossbar = new THREE.Mesh(crossbarGeo, metalMat);
    crossbar.rotation.z = Math.PI / 2;
    crossbar.position.set(-0.5, 0.7, -0.5);
    pendulumGroup.add(crossbar);

    const pivotGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const pivot = new THREE.Mesh(pivotGeo, pivotMat);
    pivot.position.set(0, 0.7, -0.5);
    pendulumGroup.add(pivot);

    // Dynamic Pendulum String & Bob
    const bobGeo = new THREE.SphereGeometry(0.24, 32, 32);
    const bob = new THREE.Mesh(bobGeo, redBobMat);
    pendulumGroup.add(bob);

    // String Line
    const stringPoints = [new THREE.Vector3(0, 0.7, -0.5), new THREE.Vector3(0, -1.8, -0.5)];
    const stringGeo = new THREE.BufferGeometry().setFromPoints(stringPoints);
    const stringMat = new THREE.LineBasicMaterial({ color: 0x5B8CF8, linewidth: 2 });
    const stringLine = new THREE.Line(stringGeo, stringMat);
    pendulumGroup.add(stringLine);

    // Vector arrows
    const velocityArrow = new THREE.ArrowHelper(
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, 0, 0),
      0,
      0x22C5A0, // green
      0.15,
      0.08
    );
    const accelArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, -1, 0),
      new THREE.Vector3(0, 0, 0),
      0,
      0xF55B6B, // red
      0.15,
      0.08
    );
    pendulumGroup.add(velocityArrow);
    pendulumGroup.add(accelArrow);

    // --- 2. PROJECTILE GROUP ---
    const projectileGroup = new THREE.Group();
    scene.add(projectileGroup);

    // Cannon Launcher
    const cannonBaseGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.08, 16);
    const cannonBase = new THREE.Mesh(cannonBaseGeo, metalMat);
    cannonBase.position.set(-2, -2.46, 0);
    projectileGroup.add(cannonBase);

    const barrelGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.8, 16);
    const barrel = new THREE.Mesh(barrelGeo, metalMat);
    barrel.position.set(-2, -2.2, 0);
    projectileGroup.add(barrel);

    const ballGeo = new THREE.SphereGeometry(0.1, 16, 16);
    const ball = new THREE.Mesh(ballGeo, redBobMat);
    ball.position.set(-2, -2.2, 0);
    projectileGroup.add(ball);

    // Parabolic trail curve
    const maxTrailPoints = 200;
    const trailPositions = new Float32Array(maxTrailPoints * 3);
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    const trailMat = new THREE.LineBasicMaterial({ color: 0x5B8CF8, linewidth: 2 });
    const trailLine = new THREE.Line(trailGeo, trailMat);
    projectileGroup.add(trailLine);

    // Ground Target Marker
    const targetRingGeo = new THREE.RingGeometry(0.15, 0.18, 32);
    const targetRingMat = new THREE.MeshBasicMaterial({ color: 0x22C5A0, side: THREE.DoubleSide });
    const targetRing = new THREE.Mesh(targetRingGeo, targetRingMat);
    targetRing.rotation.x = Math.PI / 2;
    targetRing.position.set(0, -2.48, 0);
    projectileGroup.add(targetRing);

    // --- 3. REFRACTION / OPTICS GROUP ---
    const refractionGroup = new THREE.Group();
    scene.add(refractionGroup);

    // Interface boundary plane
    const interfacePlaneGeo = new THREE.PlaneGeometry(6, 6);
    const interfacePlaneMat = new THREE.MeshBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.15, side: THREE.DoubleSide });
    const interfacePlane = new THREE.Mesh(interfacePlaneGeo, interfacePlaneMat);
    interfacePlane.rotation.x = Math.PI / 2;
    interfacePlane.position.y = -0.5;
    refractionGroup.add(interfacePlane);

    // Transparent block for Glass Medium 2 (y < -0.5)
    const glassBlockGeo = new THREE.BoxGeometry(6, 4, 6);
    const glassBlockMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.25, roughness: 0.1, metalness: 0.1 });
    const glassBlock = new THREE.Mesh(glassBlockGeo, glassBlockMat);
    glassBlock.position.set(0, -2.5, 0);
    refractionGroup.add(glassBlock);

    // Normal line (dashed white line along y axis)
    const normalPoints = [new THREE.Vector3(0, 2.5, 0), new THREE.Vector3(0, -2.5, 0)];
    const normalGeo = new THREE.BufferGeometry().setFromPoints(normalPoints);
    const normalLine = new THREE.LineSegments(normalGeo, dashedLineMat);
    refractionGroup.add(normalLine);

    // Light Rays lines
    const rayIncidentPoints = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0)];
    const rayIncidentGeo = new THREE.BufferGeometry().setFromPoints(rayIncidentPoints);
    const rayIncidentMat = new THREE.LineBasicMaterial({ color: 0xF55B6B, linewidth: 3 }); // Red
    const rayIncident = new THREE.Line(rayIncidentGeo, rayIncidentMat);
    refractionGroup.add(rayIncident);

    const rayReflectedPoints = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0)];
    const rayReflectedGeo = new THREE.BufferGeometry().setFromPoints(rayReflectedPoints);
    const rayReflectedMat = new THREE.LineBasicMaterial({ color: 0xF5A95B, linewidth: 3 }); // Yellow/Orange
    const rayReflected = new THREE.Line(rayReflectedGeo, rayReflectedMat);
    refractionGroup.add(rayReflected);

    const rayRefractedPoints = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0)];
    const rayRefractedGeo = new THREE.BufferGeometry().setFromPoints(rayRefractedPoints);
    const rayRefractedMat = new THREE.LineBasicMaterial({ color: 0x22C5A0, linewidth: 3 }); // Green
    const rayRefracted = new THREE.Line(rayRefractedGeo, rayRefractedMat);
    refractionGroup.add(rayRefracted);

    // Laser pointer source dot
    const sourceDotGeo = new THREE.SphereGeometry(0.08, 16, 16);
    const sourceDotMat = new THREE.MeshBasicMaterial({ color: 0xF55B6B });
    const sourceDot = new THREE.Mesh(sourceDotGeo, sourceDotMat);
    refractionGroup.add(sourceDot);

    // --- 4. SPRING MASS GROUP ---
    const springGroup = new THREE.Group();
    scene.add(springGroup);

    // Fixed Ceiling bracket
    const bracketGeo = new THREE.BoxGeometry(1.2, 0.15, 1.2);
    const bracket = new THREE.Mesh(bracketGeo, metalMat);
    bracket.position.set(0, 2.0, 0);
    springGroup.add(bracket);

    // Spring structure Mesh (drawn using TubeGeometry)
    let springMesh = null;
    const rebuildSpringMesh = (heightDisplacement) => {
      if (springMesh) springGroup.remove(springMesh);

      const path = new HelixPath(0.18, 12, heightDisplacement);
      const tubeGeo = new THREE.TubeGeometry(path, 120, 0.02, 12, false);
      const tubeMat = new THREE.MeshStandardMaterial({ color: 0x8892B0, roughness: 0.2, metalness: 0.9 });
      springMesh = new THREE.Mesh(tubeGeo, tubeMat);
      springMesh.position.set(0, 2.0, 0);
      springGroup.add(springMesh);
    };
    rebuildSpringMesh(3.0); // initial spring height

    // Weight block mass
    const weightBlockGeo = new THREE.BoxGeometry(0.48, 0.48, 0.48);
    const weightBlock = new THREE.Mesh(weightBlockGeo, pivotMat);
    weightBlock.position.set(0, -1.0, 0);
    springGroup.add(weightBlock);

    // --- 5. OHM'S LAW CIRCUIT GROUP ---
    const circuitGroup = new THREE.Group();
    scene.add(circuitGroup);

    // 3D Wire Loop base path
    const wirePath = [
      new THREE.Vector3(-1.8, 0, 0),
      new THREE.Vector3(1.8, 0, 0),
      new THREE.Vector3(1.8, -1.8, 0),
      new THREE.Vector3(-1.8, -1.8, 0),
      new THREE.Vector3(-1.8, 0, 0)
    ];
    const wireGeo = new THREE.BufferGeometry().setFromPoints(wirePath);
    const wireMat = new THREE.LineBasicMaterial({ color: 0x1E293B, linewidth: 4 });
    const wireLine = new THREE.Line(wireGeo, wireMat);
    circuitGroup.add(wireLine);

    // Battery cell (left side)
    const batteryGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.8, 16);
    const batteryMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6 }); // blue
    const battery = new THREE.Mesh(batteryGeo, batteryMat);
    battery.rotation.z = Math.PI / 2;
    battery.position.set(-1.8, -0.9, 0);
    circuitGroup.add(battery);

    // Resistor cylinder (right side)
    const resistorGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.7, 16);
    const resistorMat = new THREE.MeshStandardMaterial({ color: 0xF5A95B }); // orange
    const resistor = new THREE.Mesh(resistorGeo, resistorMat);
    resistor.position.set(1.8, -0.9, 0);
    circuitGroup.add(resistor);

    // Electron flow spheres
    const numElectrons = 15;
    const electrons = [];
    const electronGeo = new THREE.SphereGeometry(0.04, 8, 8);
    const electronMat = new THREE.MeshBasicMaterial({ color: 0xF5A95B }); // glowing orange
    for (let i = 0; i < numElectrons; i++) {
      const e = new THREE.Mesh(electronGeo, electronMat);
      circuitGroup.add(e);
      electrons.push({
        mesh: e,
        progress: i / numElectrons // 0 to 1 along wire loop path
      });
    }

    // Function to calculate position along 2D wire path loop
    const getWirePosition = (t) => {
      // Loop wire dimensions: Width = 3.6, Height = 1.8. Total length = 2 * 3.6 + 2 * 1.8 = 10.8
      const perimeter = 10.8;
      const targetPos = (t % 1) * perimeter;

      if (targetPos <= 3.6) {
        // top wire going right: (-1.8, 0) to (1.8, 0)
        return new THREE.Vector3(-1.8 + targetPos, 0, 0);
      } else if (targetPos <= 5.4) {
        // right wire going down: (1.8, 0) to (1.8, -1.8)
        return new THREE.Vector3(1.8, -(targetPos - 3.6), 0);
      } else if (targetPos <= 9.0) {
        // bottom wire going left: (1.8, -1.8) to (-1.8, -1.8)
        return new THREE.Vector3(1.8 - (targetPos - 5.4), -1.8, 0);
      } else {
        // left wire going up: (-1.8, -1.8) to (-1.8, 0)
        return new THREE.Vector3(-1.8, -1.8 + (targetPos - 9.0), 0);
      }
    };

    // --- Simulation Physics loop variables ---
    const clock = new THREE.Clock();
    let animationId;

    // Run frame
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      
      const dt = clock.getDelta();
      const state = simStateRef.current;
      const cappedDt = Math.min(dt, 0.05) * (state.isPlaying ? state.timeScale : 0);

      // Hide all groups, display only selected
      pendulumGroup.visible = state.selectedExperiment === 'pendulum';
      projectileGroup.visible = state.selectedExperiment === 'projectile';
      refractionGroup.visible = state.selectedExperiment === 'refraction';
      springGroup.visible = state.selectedExperiment === 'spring';
      circuitGroup.visible = state.selectedExperiment === 'circuit';

      // Reset camera targets based on experiments
      if (state.selectedExperiment === 'pendulum') {
        controls.target.set(0, -0.6, -0.5);
      } else if (state.selectedExperiment === 'projectile') {
        controls.target.set(0, -1.5, 0);
      } else if (state.selectedExperiment === 'refraction') {
        controls.target.set(0, -0.5, 0);
      } else if (state.selectedExperiment === 'spring') {
        controls.target.set(0, 0.5, 0);
      } else if (state.selectedExperiment === 'circuit') {
        controls.target.set(0, -0.9, 0);
      }

      // --- 1. Pendulum Calculations ---
      if (state.selectedExperiment === 'pendulum') {
        const p = state.pendulum;
        // Integrate swing acceleration with damping
        const accel = -(p.gravity / p.length) * Math.sin(p.angle) - p.damping * p.velocity;
        p.velocity += accel * cappedDt;
        p.angle += p.velocity * cappedDt;

        // Position of Bob relative to pivot (0, 0.7, -0.5)
        const bobX = p.length * Math.sin(p.angle);
        const bobY = 0.7 - p.length * Math.cos(p.angle);
        bob.position.set(bobX, bobY, -0.5);

        // Update String geometry points
        const positions = stringLine.geometry.attributes.position.array;
        positions[3] = bobX;
        positions[4] = bobY;
        stringLine.geometry.attributes.position.needsUpdate = true;

        // Arrows helpers
        // Velocity: tangent to swing, direction is perpendicular to radius vector
        const velMag = p.length * p.velocity;
        const velDir = new THREE.Vector3(Math.cos(p.angle), Math.sin(p.angle), 0).normalize();
        velocityArrow.position.copy(bob.position);
        velocityArrow.setDirection(velDir);
        velocityArrow.setLength(Math.abs(velMag) * 0.4 + 0.05, 0.15, 0.06);

        // Acceleration: pointing towards tension (centripetal) and gravity (tangent)
        const accDir = new THREE.Vector3(
          -Math.sin(p.angle) * Math.cos(p.angle),
          -Math.sin(p.angle) * Math.sin(p.angle) - 0.2, // bias towards gravity
          0
        ).normalize();
        const accMag = Math.abs(accel);
        accelArrow.position.copy(bob.position);
        accelArrow.setDirection(accDir);
        accelArrow.setLength(accMag * 0.25 + 0.05, 0.15, 0.06);

        // Energy math
        const h = p.length * (1 - Math.cos(p.angle));
        const pe = p.mass * p.gravity * h;
        const ke = 0.5 * p.mass * Math.pow(p.length * p.velocity, 2);
        const te = pe + ke;
        setPendulumEnergy({ ke, pe, te });
      }

      // --- 2. Projectile Calculations ---
      if (state.selectedExperiment === 'projectile') {
        const proj = state.projectile;
        const angleRad = (proj.angle * Math.PI) / 180;

        // Cannon Rotation: rotate barrel
        barrel.rotation.z = angleRad - Math.PI / 2;
        // Shift barrel center along barrel direction
        const barrelLen = 0.4;
        const muzzleX = -2 + Math.cos(angleRad) * barrelLen;
        const muzzleY = -2.46 + Math.sin(angleRad) * barrelLen;
        barrel.position.set(-2 + Math.cos(angleRad) * (barrelLen / 2), -2.46 + Math.sin(angleRad) * (barrelLen / 2), 0);

        if (proj.isFlying) {
          proj.t += cappedDt;
          
          // Trajectory position
          const x = muzzleX + proj.velocity * Math.cos(angleRad) * proj.t;
          const y = muzzleY + proj.velocity * Math.sin(angleRad) * proj.t - 0.5 * proj.gravity * Math.pow(proj.t, 2);

          if (proj.t >= proj.maxT || y <= -2.48) {
            proj.isFlying = false;
            ball.position.set(muzzleX + proj.velocity * Math.cos(angleRad) * proj.maxT, -2.48, 0);
          } else {
            ball.position.set(x, y, 0);
          }

          // Realtime stats
          const instY = ball.position.y - (-2.46);
          const range = ball.position.x - muzzleX;
          setProjectileStats({
            range: Math.max(0, range),
            height: Math.max(0, instY),
            time: proj.t
          });
        } else if (proj.t === 0) {
          // Resting ball inside barrel
          ball.position.set(muzzleX, muzzleY, 0);
        }

        // Draw parabolic trace
        const pArray = trailLine.geometry.attributes.position.array;
        for (let i = 0; i < maxTrailPoints; i++) {
          const stepT = (i / maxTrailPoints) * proj.maxT;
          const tx = muzzleX + proj.velocity * Math.cos(angleRad) * stepT;
          const ty = muzzleY + proj.velocity * Math.sin(angleRad) * stepT - 0.5 * proj.gravity * Math.pow(stepT, 2);
          
          pArray[i * 3] = tx;
          pArray[i * 3 + 1] = Math.max(-2.48, ty);
          pArray[i * 3 + 2] = 0;
        }
        trailLine.geometry.attributes.position.needsUpdate = true;

        // Position Target Ring at estimated range
        const maxRange = proj.velocity * Math.cos(angleRad) * proj.maxT;
        targetRing.position.x = muzzleX + maxRange;
      }

      // --- 3. Refraction Calculations ---
      if (state.selectedExperiment === 'refraction') {
        const r = state.refraction;
        const angleRad = (r.angle * Math.PI) / 180;
        
        // Incident beam: source points from upper-left to origin (0, -0.5, 0)
        // Direction vector: (sin(angleRad), -cos(angleRad))
        const sourceX = -2.5 * Math.sin(angleRad);
        const sourceY = -0.5 + 2.5 * Math.cos(angleRad);
        sourceDot.position.set(sourceX, sourceY, 0);

        // Incident ray geometry
        const incArray = rayIncident.geometry.attributes.position.array;
        incArray[0] = sourceX; incArray[1] = sourceY;
        incArray[3] = 0; incArray[4] = -0.5;
        rayIncident.geometry.attributes.position.needsUpdate = true;

        // Reflected ray: headings to upper right (sin, cos)
        const refArray = rayReflected.geometry.attributes.position.array;
        refArray[0] = 0; refArray[1] = -0.5;
        refArray[3] = 2.5 * Math.sin(angleRad); refArray[4] = -0.5 + 2.5 * Math.cos(angleRad);
        rayReflected.geometry.attributes.position.needsUpdate = true;

        // Refracted ray via Snell's Law
        const sin2 = (r.n1 * Math.sin(angleRad)) / r.n2;
        const refrArray = rayRefracted.geometry.attributes.position.array;

        if (sin2 > 1.0) {
          // Total Internal Reflection (TIR)
          setIsTIR(true);
          rayRefracted.visible = false;
        } else {
          setIsTIR(false);
          rayRefracted.visible = true;
          const angle2 = Math.asin(sin2);
          
          refrArray[0] = 0; refrArray[1] = -0.5;
          refrArray[3] = 2.5 * Math.sin(angle2); refrArray[4] = -0.5 - 2.5 * Math.cos(angle2);
          rayRefracted.geometry.attributes.position.needsUpdate = true;
        }
      }

      // --- 4. Spring Calculations ---
      if (state.selectedExperiment === 'spring') {
        const s = state.spring;
        
        // Harmonic motion integration
        const springForce = -s.k * s.displacement;
        const dampingForce = -s.damping * s.velocity;
        const accel = (springForce + dampingForce) / s.mass;

        s.velocity += accel * cappedDt;
        s.displacement += s.velocity * cappedDt;

        // Spring bottom Y coordinates: pivot is at 2.0. Base spring height is 2.5.
        // Spring height extends downward: 2.5 - displacement
        const springLength = 2.4 - s.displacement;
        rebuildSpringMesh(springLength);

        // Mass block attached to spring bottom
        weightBlock.position.set(0, 2.0 - springLength - 0.24, 0);

        // Energy stats
        const pe = 0.5 * s.k * Math.pow(s.displacement, 2);
        const ke = 0.5 * s.mass * Math.pow(s.velocity, 2);
        const te = pe + ke;
        setSpringEnergy({ ke, pe, te });
      }

      // --- 5. Circuit Electron Flow ---
      if (state.selectedExperiment === 'circuit') {
        const c = state.circuit;
        
        // Electrons animation speed is proportional to current current
        const speedMultiplier = 0.2 * c.current;
        electrons.forEach(e => {
          e.progress = (e.progress + cappedDt * speedMultiplier) % 1;
          const pos = getWirePosition(e.progress);
          e.mesh.position.copy(pos);
        });
      }

      controls.update();
      renderer.render(scene, camera);
    };
    
    animate();

    // Resize Handler
    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Clean unmount
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

  // Presets gravity values
  const handlePendulumPreset = (gravityVal) => {
    setPendulumGravity(gravityVal);
  };

  return (
    <div style={{ display: 'flex', flex: 1, height: '100%', overflow: 'hidden', background: '#07080F', color: '#DDE3F2', fontFamily: 'var(--font-outfit), sans-serif' }}>
      
      {/* --- LEFT COLUMN: Parameters Sidebar (Width: 380px) --- */}
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
          <Activity size={20} color="#5B8CF8" />
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0, letterSpacing: '-0.01em', color: '#F8FAFC' }}>Physics Lab</h2>
            <span style={{ fontSize: 10.5, color: '#647298', fontWeight: 600 }}>Virtual Interactive Workbench</span>
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
            <option value="pendulum">🧲 Simple Pendulum Lab</option>
            <option value="projectile">🚀 Projectile Motion Lab</option>
            <option value="refraction">🌈 Refraction & Reflection</option>
            <option value="spring">🌀 Spring-Mass System</option>
            <option value="circuit">⚡ Ohm's Law Circuit</option>
          </select>
        </div>

        {/* Dynamic Parameter Sliders scroll section */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }} className="sandbox-scroll">
          
          {/* PENDULUM SLIDERS */}
          {selectedExperiment === 'pendulum' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: 11, color: '#5B8CF8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Sliders size={13} /> Adjustable Parameters
              </div>
              
              {/* Length Slider */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                  <span style={{ color: '#8892B0' }}>String Length (L)</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{pendulumLength.toFixed(1)} m</span>
                </div>
                <input
                  type="range" min={1.0} max={3.5} step={0.1}
                  value={pendulumLength} onChange={(e) => setPendulumLength(parseFloat(e.target.value))}
                  style={{ width: '100%', height: 4, accentColor: '#5B8CF8' }}
                />
              </div>

              {/* Mass Slider */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                  <span style={{ color: '#8892B0' }}>Bob Mass (M)</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{pendulumMass.toFixed(1)} kg</span>
                </div>
                <input
                  type="range" min={0.5} max={5.0} step={0.1}
                  value={pendulumMass} onChange={(e) => setPendulumMass(parseFloat(e.target.value))}
                  style={{ width: '100%', height: 4, accentColor: '#5B8CF8' }}
                />
              </div>

              {/* Air Damping Slider */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                  <span style={{ color: '#8892B0' }}>Air Friction (Damping)</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{pendulumDamping.toFixed(2)}</span>
                </div>
                <input
                  type="range" min={0.0} max={0.5} step={0.01}
                  value={pendulumDamping} onChange={(e) => setPendulumDamping(parseFloat(e.target.value))}
                  style={{ width: '100%', height: 4, accentColor: '#5B8CF8' }}
                />
              </div>

              {/* Gravity Presets */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 12.5, color: '#8892B0' }}>Gravity Presets (g)</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {[
                    { label: 'Earth (9.8 m/s²)', val: 9.8 },
                    { label: 'Moon (1.6 m/s²)', val: 1.6 },
                    { label: 'Jupiter (24.8 m/s²)', val: 24.8 },
                    { label: 'Space (0 m/s²)', val: 0.0 }
                  ].map(preset => (
                    <button
                      key={preset.label}
                      onClick={() => handlePendulumPreset(preset.val)}
                      style={{
                        padding: '6px 8px',
                        borderRadius: 6,
                        border: '1px solid rgba(255,255,255,0.06)',
                        background: pendulumGravity === preset.val ? 'rgba(91, 140, 248, 0.1)' : '#131824',
                        color: pendulumGravity === preset.val ? '#5B8CF8' : '#8892B0',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Formula Panel */}
              <div style={{ padding: 12, background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 8, fontSize: 11.5, lineHeight: 1.5, color: '#647298' }}>
                <div style={{ fontWeight: 700, color: '#8892B0', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Info size={11} /> Physics Formula
                </div>
                Angular Period: T = 2π × √(L/g)
                <div style={{ marginTop: 2 }}>Kinetic Energy: KE = ½ M v²</div>
                <div>Potential Energy: PE = M g h</div>
              </div>
            </div>
          )}

          {/* PROJECTILE SLIDERS */}
          {selectedExperiment === 'projectile' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: 11, color: '#5B8CF8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Sliders size={13} /> Projectile Variables
              </div>
              
              {/* Velocity */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                  <span style={{ color: '#8892B0' }}>Launch Velocity (v)</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{projectileVelocity.toFixed(0)} m/s</span>
                </div>
                <input
                  type="range" min={5} max={30} step={1}
                  value={projectileVelocity} onChange={(e) => setProjectileVelocity(parseInt(e.target.value))}
                  style={{ width: '100%', height: 4, accentColor: '#5B8CF8' }}
                />
              </div>

              {/* Angle */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                  <span style={{ color: '#8892B0' }}>Launch Angle (θ)</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{projectileAngle.toFixed(0)}°</span>
                </div>
                <input
                  type="range" min={15} max={85} step={1}
                  value={projectileAngle} onChange={(e) => setProjectileAngle(parseInt(e.target.value))}
                  style={{ width: '100%', height: 4, accentColor: '#5B8CF8' }}
                />
              </div>

              {/* Gravity */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                  <span style={{ color: '#8892B0' }}>Gravity (g)</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{projectileGravity.toFixed(1)} m/s²</span>
                </div>
                <input
                  type="range" min={1.6} max={25.0} step={0.1}
                  value={projectileGravity} onChange={(e) => setProjectileGravity(parseFloat(e.target.value))}
                  style={{ width: '100%', height: 4, accentColor: '#5B8CF8' }}
                />
              </div>

              {/* Action Fire button */}
              <button
                onClick={() => setProjectileFireTrigger(prev => prev + 1)}
                style={{
                  background: '#22C5A0',
                  color: '#000000',
                  border: 'none',
                  padding: '10px 14px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6
                }}
              >
                <Zap size={13} fill="currentColor" /> Launch Projectile
              </button>

              {/* Live readout */}
              <div style={{ padding: 12, background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
                <span style={{ fontSize: 9.5, color: '#647298', fontWeight: 800, textTransform: 'uppercase' }}>Measurement Outputs</span>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#8892B0' }}>Horizontal Range:</span>
                  <strong style={{ color: '#22C5A0', fontFamily: 'monospace' }}>{projectileStats.range.toFixed(2)} m</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#8892B0' }}>Current Altitude:</span>
                  <strong style={{ color: '#5B8CF8', fontFamily: 'monospace' }}>{projectileStats.height.toFixed(2)} m</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#8892B0' }}>Time of Flight:</span>
                  <strong style={{ color: '#F5A95B', fontFamily: 'monospace' }}>{projectileStats.time.toFixed(2)} s</strong>
                </div>
              </div>
            </div>
          )}

          {/* OPTICS / REFRACTION SLIDERS */}
          {selectedExperiment === 'refraction' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: 11, color: '#5B8CF8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Sliders size={13} /> Optical Indices
              </div>

              {/* Incident Angle */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                  <span style={{ color: '#8892B0' }}>Incident Angle (θ₁)</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{refractionAngle.toFixed(0)}°</span>
                </div>
                <input
                  type="range" min={0} max={89} step={1}
                  value={refractionAngle} onChange={(e) => setRefractionAngle(parseInt(e.target.value))}
                  style={{ width: '100%', height: 4, accentColor: '#5B8CF8' }}
                />
              </div>

              {/* Index n1 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                  <span style={{ color: '#8892B0' }}>Index Medium 1 (n₁)</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{refractionN1.toFixed(2)}</span>
                </div>
                <input
                  type="range" min={1.0} max={2.0} step={0.05}
                  value={refractionN1} onChange={(e) => setRefractionN1(parseFloat(e.target.value))}
                  style={{ width: '100%', height: 4, accentColor: '#5B8CF8' }}
                />
              </div>

              {/* Index n2 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                  <span style={{ color: '#8892B0' }}>Index Medium 2 (n₂)</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{refractionN2.toFixed(2)}</span>
                </div>
                <input
                  type="range" min={1.0} max={2.0} step={0.05}
                  value={refractionN2} onChange={(e) => setRefractionN2(parseFloat(e.target.value))}
                  style={{ width: '100%', height: 4, accentColor: '#5B8CF8' }}
                />
              </div>

              {/* Medium Label Helpers */}
              <div style={{ padding: 10, background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 8, fontSize: 11.5, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ color: '#647298', fontWeight: 700 }}>Index References</span>
                <span style={{ color: '#8892B0' }}>Air: 1.00 | Water: 1.33 | Glass: 1.50</span>
              </div>

              {/* TIR Warning */}
              {isTIR && (
                <div style={{ display: 'flex', gap: 8, padding: 10, background: 'rgba(245, 91, 107, 0.08)', border: '1px solid #F55B6B', borderRadius: 8, color: '#F55B6B', fontSize: 12, alignItems: 'center' }}>
                  <AlertCircle size={14} />
                  <span>Total Internal Reflection! Light beam cannot pass into Medium 2.</span>
                </div>
              )}
            </div>
          )}

          {/* SPRING MASS SLIDERS */}
          {selectedExperiment === 'spring' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: 11, color: '#5B8CF8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Sliders size={13} /> Hooke's Elasticity Variables
              </div>

              {/* Spring Constant */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                  <span style={{ color: '#8892B0' }}>Spring Stiffness (k)</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{springConstant.toFixed(0)} N/m</span>
                </div>
                <input
                  type="range" min={5} max={30} step={1}
                  value={springConstant} onChange={(e) => setSpringConstant(parseInt(e.target.value))}
                  style={{ width: '100%', height: 4, accentColor: '#5B8CF8' }}
                />
              </div>

              {/* Mass */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                  <span style={{ color: '#8892B0' }}>Mass block (M)</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{springMass.toFixed(2)} kg</span>
                </div>
                <input
                  type="range" min={0.5} max={3.0} step={0.1}
                  value={springMass} onChange={(e) => setSpringMass(parseFloat(e.target.value))}
                  style={{ width: '100%', height: 4, accentColor: '#5B8CF8' }}
                />
              </div>

              {/* Damping */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                  <span style={{ color: '#8892B0' }}>Damping Damping</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{springDamping.toFixed(3)}</span>
                </div>
                <input
                  type="range" min={0.0} max={0.2} step={0.005}
                  value={springDamping} onChange={(e) => setSpringDamping(parseFloat(e.target.value))}
                  style={{ width: '100%', height: 4, accentColor: '#5B8CF8' }}
                />
              </div>
            </div>
          )}

          {/* OHM'S LAW SLIDERS */}
          {selectedExperiment === 'circuit' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: 11, color: '#5B8CF8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Sliders size={13} /> Circuit Potentials
              </div>

              {/* Voltage */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                  <span style={{ color: '#8892B0' }}>DC Voltage Source (V)</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{circuitVoltage.toFixed(1)} Volts</span>
                </div>
                <input
                  type="range" min={1.5} max={18} step={0.5}
                  value={circuitVoltage} onChange={(e) => setCircuitVoltage(parseFloat(e.target.value))}
                  style={{ width: '100%', height: 4, accentColor: '#5B8CF8' }}
                />
              </div>

              {/* Resistance */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                  <span style={{ color: '#8892B0' }}>Load Resistance (R)</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{circuitResistance.toFixed(0)} Ohms</span>
                </div>
                <input
                  type="range" min={5} max={50} step={1}
                  value={circuitResistance} onChange={(e) => setCircuitResistance(parseInt(e.target.value))}
                  style={{ width: '100%', height: 4, accentColor: '#5B8CF8' }}
                />
              </div>

              {/* Current Output Reading */}
              <div style={{ padding: 12, background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 9.5, color: '#647298', fontWeight: 800, textTransform: 'uppercase' }}>Ohm's Equation Output</span>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                  <span style={{ color: '#8892B0' }}>Computed Current (I)</span>
                  <strong style={{ color: '#22C5A0', fontFamily: 'monospace' }}>
                    {circuitCurrent.toFixed(3)} A
                  </strong>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Global Toolbar controls */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              style={{
                background: isPlaying ? 'rgba(91, 140, 248, 0.1)' : '#5B8CF8',
                border: 'none',
                color: isPlaying ? '#5B8CF8' : '#000000',
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
                // Trigger a reset of variables depending on selected experiment
                if (selectedExperiment === 'pendulum') {
                  simStateRef.current.pendulum.angle = Math.PI / 4;
                  simStateRef.current.pendulum.velocity = 0;
                } else if (selectedExperiment === 'projectile') {
                  simStateRef.current.projectile.t = 0;
                  simStateRef.current.projectile.isFlying = false;
                  setProjectileStats({ range: 0, height: 0, time: 0 });
                } else if (selectedExperiment === 'spring') {
                  simStateRef.current.spring.displacement = 1.0;
                  simStateRef.current.spring.velocity = 0;
                }
              }}
              title="Reset Simulation Positions"
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

          {/* Speed Scale Selector */}
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
                  color: timeScale === item.val ? '#5B8CF8' : '#647298',
                  transition: 'all 0.15s'
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* --- RIGHT COLUMN: 3D Canvas + Energy Chart Overlay --- */}
      <div style={{ flex: 1, height: '100%', position: 'relative', display: 'flex', flexDirection: 'column' }}>
        
        {/* Render Three.js Canvas container */}
        <div ref={mountRef} style={{ width: '100%', height: '100%', zIndex: 1 }} />

        {/* Dynamic Live Energy SVG overlay (bottom overlay block) */}
        {selectedExperiment === 'pendulum' && (
          <div style={{
            position: 'absolute',
            bottom: 20,
            left: 20,
            zIndex: 10,
            width: 250,
            background: 'rgba(7, 8, 15, 0.85)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 12,
            padding: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            pointerEvents: 'none'
          }}>
            <span style={{ fontSize: 9.5, color: '#647298', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Energy Distribution</span>
            
            {/* KE Bar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5 }}>
                <span style={{ color: '#8892B0' }}>Kinetic Energy (KE)</span>
                <span style={{ fontFamily: 'monospace', color: '#22C5A0' }}>{pendulumEnergy.ke.toFixed(2)} J</span>
              </div>
              <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  background: '#22C5A0',
                  width: `${Math.min(100, (pendulumEnergy.ke / (pendulumEnergy.te || 1)) * 100)}%`,
                  transition: 'width 0.05s linear'
                }} />
              </div>
            </div>

            {/* PE Bar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5 }}>
                <span style={{ color: '#8892B0' }}>Potential Energy (PE)</span>
                <span style={{ fontFamily: 'monospace', color: '#5B8CF8' }}>{pendulumEnergy.pe.toFixed(2)} J</span>
              </div>
              <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  background: '#5B8CF8',
                  width: `${Math.min(100, (pendulumEnergy.pe / (pendulumEnergy.te || 1)) * 100)}%`,
                  transition: 'width 0.05s linear'
                }} />
              </div>
            </div>

            {/* Total Energy Text */}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: 6, fontSize: 11, fontWeight: 700 }}>
              <span style={{ color: '#647298' }}>Total Mechanical (E)</span>
              <span style={{ fontFamily: 'monospace', color: '#F8FAFC' }}>{pendulumEnergy.te.toFixed(2)} J</span>
            </div>
          </div>
        )}

        {/* Spring Mass Energy overlay */}
        {selectedExperiment === 'spring' && (
          <div style={{
            position: 'absolute',
            bottom: 20,
            left: 20,
            zIndex: 10,
            width: 250,
            background: 'rgba(7, 8, 15, 0.85)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 12,
            padding: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            pointerEvents: 'none'
          }}>
            <span style={{ fontSize: 9.5, color: '#647298', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Hooke's System Energy</span>
            
            {/* KE Bar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5 }}>
                <span style={{ color: '#8892B0' }}>Kinetic Energy (KE)</span>
                <span style={{ fontFamily: 'monospace', color: '#22C5A0' }}>{springEnergy.ke.toFixed(2)} J</span>
              </div>
              <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  background: '#22C5A0',
                  width: `${Math.min(100, (springEnergy.ke / (springEnergy.te || 1)) * 100)}%`,
                  transition: 'width 0.05s linear'
                }} />
              </div>
            </div>

            {/* PE Bar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5 }}>
                <span style={{ color: '#8892B0' }}>Elastic Potential (PE)</span>
                <span style={{ fontFamily: 'monospace', color: '#5B8CF8' }}>{springEnergy.pe.toFixed(2)} J</span>
              </div>
              <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  background: '#5B8CF8',
                  width: `${Math.min(100, (springEnergy.pe / (springEnergy.te || 1)) * 100)}%`,
                  transition: 'width 0.05s linear'
                }} />
              </div>
            </div>

            {/* Total Energy */}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: 6, fontSize: 11, fontWeight: 700 }}>
              <span style={{ color: '#647298' }}>Total Energy (E)</span>
              <span style={{ fontFamily: 'monospace', color: '#F8FAFC' }}>{springEnergy.te.toFixed(2)} J</span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
