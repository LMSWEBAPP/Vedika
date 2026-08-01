'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function VoiceRobotVisualizer() {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof window === 'undefined') return;

    const containerWidth = container.clientWidth || 100;
    const containerHeight = container.clientHeight || 100;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, containerWidth / containerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(containerWidth, containerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0x9B6EF8, 1.5);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    const robotGroup = new THREE.Group();
    scene.add(robotGroup);

    const headGeo = new THREE.IcosahedronGeometry(1.2, 1);
    const headMat = new THREE.MeshPhongMaterial({
      color: 0x9B6EF8,
      wireframe: true,
      emissive: 0x490080,
      emissiveIntensity: 0.6,
    });
    const head = new THREE.Mesh(headGeo, headMat);
    robotGroup.add(head);

    const coreGeo = new THREE.SphereGeometry(0.6, 32, 32);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const core = new THREE.Mesh(coreGeo, coreMat);
    robotGroup.add(core);

    camera.position.z = 4.5;

    const clock = new THREE.Clock();
    let animationId;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      robotGroup.position.y = Math.sin(t * 1.5) * 0.15;
      robotGroup.rotation.y += 0.01;
      robotGroup.rotation.z = Math.sin(t * 0.5) * 0.1;
      const scale = 1 + Math.sin(t * 4) * 0.15;
      core.scale.set(scale, scale, scale);
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationId) cancelAnimationFrame(animationId);
      if (renderer && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      if (renderer) renderer.dispose();
    };
  }, []);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden' }} />
  );
}
