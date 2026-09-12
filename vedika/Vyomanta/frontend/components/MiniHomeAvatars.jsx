'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

// Global cache to avoid re-fetching assets across renders
let cachedGltf = null;
let cachedTextures = null;

const AVATAR_SPECS = [
  { id: 'mowgli', name: 'Mowgli', texture: '/avatar_purple.webp' },
  { id: 'belle', name: 'Belle', texture: '/avatar_red.webp' },
  { id: 'moana', name: 'Moana', texture: '/avatar_gold.webp' },
  { id: 'bhageera', name: 'Bhageera', texture: '/avatar_blue.webp' },
];

function drawSmile(ctx) {
  ctx.clearRect(0, 0, 256, 256);
  ctx.save();
  ctx.translate(128, 155);

  const w = 34;
  const curveY = 12;

  ctx.strokeStyle = '#181216';
  ctx.lineWidth = 4.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(-w / 2, -curveY * 0.3);
  ctx.quadraticCurveTo(0, curveY, w / 2, -curveY * 0.3);
  ctx.stroke();

  ctx.restore();
}

export default function MiniHomeAvatars() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let isCancelled = false;
    let animId = null;

    // Dimensions for the tiny top-bar slot
    const width = 210;
    const height = 34;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    const scene = new THREE.Scene();

    // Orthographic camera for crisp, distortion-free tiny avatar line-up
    const aspect = width / height;
    const viewSize = 1.85;
    const camera = new THREE.OrthographicCamera(
      (-viewSize * aspect) / 2,
      (viewSize * aspect) / 2,
      viewSize / 2,
      -viewSize / 2,
      0.1,
      50
    );
    camera.position.set(0, 0, 10);
    camera.lookAt(0, 0, 0);

    // Clean neutral studio lighting (no extra colors as requested)
    const ambientLight = new THREE.AmbientLight(0xffffff, 2.2);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
    keyLight.position.set(3, 5, 6);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 1.2);
    fillLight.position.set(-3, -2, 4);
    scene.add(fillLight);

    // Shared procedural mouth texture
    const mouthCanvas = document.createElement('canvas');
    mouthCanvas.width = 256;
    mouthCanvas.height = 256;
    const mouthCtx = mouthCanvas.getContext('2d');
    drawSmile(mouthCtx);
    const mouthTexture = new THREE.CanvasTexture(mouthCanvas);
    mouthTexture.minFilter = THREE.LinearFilter;
    mouthTexture.magFilter = THREE.LinearFilter;

    const mouthGeo = new THREE.PlaneGeometry(0.72, 0.72);
    const mouthMat = new THREE.MeshBasicMaterial({
      map: mouthTexture,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      side: THREE.FrontSide
    });

    const avatarGroups = [];
    const spacing = 2.45;
    const startX = -((AVATAR_SPECS.length - 1) * spacing) / 2;

    const textureLoader = new THREE.TextureLoader();
    const gltfLoader = new GLTFLoader();

    // 1. Load textures
    const loadTexturesPromise = cachedTextures
      ? Promise.resolve(cachedTextures)
      : Promise.all(
          AVATAR_SPECS.map(
            (spec) =>
              new Promise((resolve) => {
                textureLoader.load(
                  spec.texture,
                  (tex) => {
                    tex.flipY = false;
                    tex.colorSpace = THREE.SRGBColorSpace;
                    tex.needsUpdate = true;
                    resolve(tex);
                  },
                  undefined,
                  () => resolve(null)
                );
              })
          )
        );

    // 2. Load master GLB
    const loadGltfPromise = cachedGltf
      ? Promise.resolve(cachedGltf)
      : new Promise((resolve) => {
          gltfLoader.load(
            '/Physics-avatar-opt.glb',
            (gltf) => {
              cachedGltf = gltf;
              resolve(gltf);
            },
            undefined,
            () => resolve(null)
          );
        });

    Promise.all([loadTexturesPromise, loadGltfPromise]).then(([textures, gltf]) => {
      if (isCancelled || !gltf) return;
      cachedTextures = textures;

      const masterScene = gltf.scene;

      AVATAR_SPECS.forEach((spec, idx) => {
        const clone = masterScene.clone(true);

        // Normalize mesh size
        const box = new THREE.Box3().setFromObject(clone);
        const center = box.getCenter(new THREE.Vector3());
        const sizeVec = box.getSize(new THREE.Vector3());

        clone.position.x -= center.x;
        clone.position.y -= center.y;
        clone.position.z -= center.z;

        const maxDim = Math.max(sizeVec.x, sizeVec.y, sizeVec.z);
        if (maxDim > 0) {
          clone.scale.setScalar(1.22 / maxDim);
        }

        // Apply clean texture (no extra color tint)
        clone.traverse((child) => {
          if (child.isMesh && child.material) {
            child.material = child.material.clone();
            if (textures && textures[idx]) {
              child.material.map = textures[idx];
            }
            child.material.color.set('#FFFFFF');
            child.material.roughness = 0.75;
            child.material.metalness = 0.05;
            child.material.needsUpdate = true;
          }
        });

        // Face smile
        const face = new THREE.Mesh(mouthGeo, mouthMat);
        face.position.set(0, -0.06, 0.62);

        const group = new THREE.Group();
        group.add(clone);
        group.add(face);

        const posX = startX + idx * spacing;
        group.position.set(posX, 0, 0);

        scene.add(group);
        avatarGroups.push({ group, baseX: posX, idx });
      });

      setIsLoaded(true);

      // Subtle idle animation loop
      const startTime = performance.now();
      const animate = (currentTime) => {
        if (isCancelled) return;
        const elapsed = (currentTime - startTime) * 0.001;

        avatarGroups.forEach(({ group, idx }) => {
          // Gentle breathing and slight mascot idle sway
          const offset = idx * 0.75;
          group.position.y = Math.sin(elapsed * 2.6 + offset) * 0.045;
          group.rotation.y = Math.sin(elapsed * 1.4 + offset) * 0.07;
          group.rotation.z = Math.cos(elapsed * 1.8 + offset) * 0.02;
        });

        renderer.render(scene, camera);
        animId = requestAnimationFrame(animate);
      };

      animId = requestAnimationFrame(animate);
    });

    return () => {
      isCancelled = true;
      if (animId) cancelAnimationFrame(animId);
      renderer.dispose();
      mouthGeo.dispose();
      mouthMat.dispose();
      mouthTexture.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      title="Vedika Mascot Companions: Mowgli, Belle, Moana, Bhageera"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 34,
        width: 210,
        position: 'relative',
        userSelect: 'none',
        pointerEvents: 'none', // purely visual as requested
        opacity: isLoaded ? 1 : 0,
        transition: 'opacity 0.25s ease',
        flexShrink: 0
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: 210,
          height: 34,
          display: 'block'
        }}
      />
    </div>
  );
}
