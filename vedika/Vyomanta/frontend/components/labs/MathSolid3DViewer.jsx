'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { RotateCcw, Box, Eye } from 'lucide-react';

export default function MathSolid3DViewer({ type = 'cylinder', params = {}, theme = {} }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const solidGroupRef = useRef(null);

  const [autoRotate, setAutoRotate] = useState(true);

  // Initialize Three.js WebGL Scene
  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    const width = containerRef.current.clientWidth || 500;
    const height = 340;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#07080F');
    sceneRef.current = scene;

    // Grid helper & Axes
    const gridHelper = new THREE.GridHelper(20, 20, '#5B8CF8', '#1E263D');
    gridHelper.position.y = -4;
    scene.add(gridHelper);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(12, 10, 16);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x729df8, 1.2);
    dirLight1.position.set(10, 20, 15);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xa782f8, 0.8);
    dirLight2.position.set(-10, -10, -10);
    scene.add(dirLight2);

    // 5. Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 1.5;
    controlsRef.current = controls;

    // Group for solid mesh & labels
    const solidGroup = new THREE.Group();
    scene.add(solidGroup);
    solidGroupRef.current = solidGroup;

    // Animation Loop
    let animId;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (controlsRef.current) controlsRef.current.update();
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    // Handle Resize
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const newW = containerRef.current.clientWidth;
      cameraRef.current.aspect = newW / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(newW, height);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      if (rendererRef.current) rendererRef.current.dispose();
      if (controlsRef.current) controlsRef.current.dispose();
    };
  }, []);

  // Update OrbitControls autoRotate state
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate;
    }
  }, [autoRotate]);

  // Construct 3D Geometry dynamically whenever type or params change
  useEffect(() => {
    const group = solidGroupRef.current;
    if (!group) return;

    // Clear previous meshes
    while (group.children.length > 0) {
      const child = group.children[0];
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
        else child.material.dispose();
      }
      group.remove(child);
    }

    const t = String(type).toLowerCase();
    let geom;

    // Material Styling (Futuristic Glassmorphic Mesh)
    const glassMaterial = new THREE.MeshPhongMaterial({
      color: 0x729df8,
      emissive: 0x161d30,
      specular: 0xffffff,
      shininess: 80,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide
    });

    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0xa782f8,
      wireframe: true,
      transparent: true,
      opacity: 0.4
    });

    if (t.includes('composite') || t.includes('joint') || t.includes('scoop')) {
      const r = Number(params.radius || params.r || 4) * 0.7;
      const h = Number(params.height || params.h || 7) * 0.7;

      const cylGeom = new THREE.CylinderGeometry(r, r, h, 32);
      const cylMesh = new THREE.Mesh(cylGeom, glassMaterial);
      const cylWire = new THREE.Mesh(cylGeom, wireframeMaterial);
      group.add(cylMesh);
      group.add(cylWire);

      const hemiGeom = new THREE.SphereGeometry(r, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
      const hemiMesh = new THREE.Mesh(hemiGeom, glassMaterial);
      const hemiWire = new THREE.Mesh(hemiGeom, wireframeMaterial);
      hemiMesh.position.y = h / 2;
      hemiWire.position.y = h / 2;
      group.add(hemiMesh);
      group.add(hemiWire);

      return;
    }

    if (['cube', 'cuboid', 'rectangular_prism', 'box'].includes(t) || t.includes('cube') || t.includes('cuboid') || t.includes('box')) {
      const l = Number(params.l || params.length || (t.includes('cube') ? 5 : 7)) * 0.7;
      const w = Number(params.w || params.width || (t.includes('cube') ? 5 : 4)) * 0.7;
      const h = Number(params.h || params.height || (t.includes('cube') ? 5 : 6)) * 0.7;
      geom = new THREE.BoxGeometry(l, h, w);
    } else if (['cylinder'].includes(t) || t.includes('cylinder')) {
      const r = Number(params.radius || params.r || 4) * 0.7;
      const h = Number(params.height || params.h || 8) * 0.7;
      geom = new THREE.CylinderGeometry(r, r, h, 32);
    } else if (t.includes('cone')) {
      const r = Number(params.radius || params.r || 4) * 0.7;
      const h = Number(params.height || params.h || 8) * 0.7;
      geom = new THREE.ConeGeometry(r, h, 32);
    } else if (t.includes('hemisphere')) {
      const r = Number(params.radius || params.r || 4.5) * 0.7;
      geom = new THREE.SphereGeometry(r, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    } else if (t.includes('sphere')) {
      const r = Number(params.radius || params.r || 4.5) * 0.7;
      geom = new THREE.SphereGeometry(r, 32, 32);
    } else if (t.includes('pyramid')) {
      const r = Number(params.base || params.side || 5) * 0.7;
      const h = Number(params.height || params.h || 7) * 0.7;
      geom = new THREE.ConeGeometry(r, h, 4);
    } else {
      // Default fallback solid: Composite Cylinder & Hemisphere
      const r = Number(params.radius || params.r || 4) * 0.7;
      const h = Number(params.height || params.h || 7) * 0.7;
      const cylGeom = new THREE.CylinderGeometry(r, r, h, 32);
      const cylMesh = new THREE.Mesh(cylGeom, glassMaterial);
      const cylWire = new THREE.Mesh(cylGeom, wireframeMaterial);
      group.add(cylMesh);
      group.add(cylWire);

      const hemiGeom = new THREE.SphereGeometry(r, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
      const hemiMesh = new THREE.Mesh(hemiGeom, glassMaterial);
      const hemiWire = new THREE.Mesh(hemiGeom, wireframeMaterial);
      hemiMesh.position.y = h / 2;
      hemiWire.position.y = h / 2;
      group.add(hemiMesh);
      group.add(hemiWire);
      return;
    }


    const mainMesh = new THREE.Mesh(geom, glassMaterial);
    const wireMesh = new THREE.Mesh(geom, wireframeMaterial);
    group.add(mainMesh);
    group.add(wireMesh);

    // Center mesh
    geom.computeBoundingBox();
    const center = new THREE.Vector3();
    geom.boundingBox.getCenter(center);
    mainMesh.position.sub(center);
    wireMesh.position.sub(center);

  }, [type, params]);

  const resetCamera = () => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(12, 10, 16);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: 340, borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.08)', background: '#07080F' }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block', cursor: 'grab' }} />

      {/* Floating 3D Control Overlay */}
      <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 8, zIndex: 10 }}>
        <button
          onClick={() => setAutoRotate(!autoRotate)}
          style={{
            padding: '6px 12px',
            borderRadius: 20,
            border: '1px solid rgba(114, 157, 248, 0.3)',
            background: autoRotate ? 'rgba(114, 157, 248, 0.2)' : 'rgba(15, 23, 42, 0.8)',
            color: '#729DF8',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Eye size={14} /> {autoRotate ? 'Auto-Rotate ON' : 'Auto-Rotate OFF'}
        </button>

        <button
          onClick={resetCamera}
          style={{
            padding: '6px 12px',
            borderRadius: 20,
            border: '1px solid rgba(255, 255, 255, 0.1)',
            background: 'rgba(15, 23, 42, 0.8)',
            color: '#94A3B8',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <RotateCcw size={14} /> Reset View
        </button>
      </div>

      <div style={{ position: 'absolute', bottom: 12, left: 12, background: 'rgba(15, 23, 42, 0.75)', padding: '4px 12px', borderRadius: 8, fontSize: 11, color: '#94A3B8', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <span style={{ color: '#729DF8', fontWeight: 700 }}>WebGL 3D Mode:</span> Drag to orbit • Scroll to zoom
      </div>
    </div>
  );
}
