import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

// Utility to create a canvas texture for 3D text
function createTextTexture(text, textColor = '#F8FAFC', bgColor = '#0F172A', fontSize = 32, width = 256, height = 64) {
  if (typeof window === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  
  // Background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);
  
  // Border outline
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 4;
  ctx.strokeRect(0, 0, width, height);
  
  // Text content
  ctx.fillStyle = textColor;
  ctx.font = `bold ${fontSize}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, height / 2);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  return texture;
}

// 3D Code Visualizer Component (Stable Persistent Context)
export default function CodeVisualizer3D({
  listKey,
  listVal = [],
  variables = {},
  prevVariables = {},
  scalarKeys = [],
  dictKeys = [],
  actionType = 'STEP',
  swapMessage = '',
  stdout = ''
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  // References to keep WebGL context and controls persistent
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const visualizerGroupRef = useRef(null);
  const connectorGroupRef = useRef(null);

  // Animation targets and element identities
  const meshesRef = useRef({}); // keyed by element ID
  const elementIdsRef = useRef([]); // stable element IDs array
  const hoveredMeshIdRef = useRef(null);
  const pointersRef = useRef({}); // current pointer registers map
  
  // Selected element for student inspector details card
  const [selectedElement, setSelectedElement] = useState(null);
  
  // Scalar variables for stack visualization
  const [stackVars, setStackVars] = useState([]);

  // Heuristic stable ID tracking to make elements physically slide on swap
  useEffect(() => {
    if (!listVal || listVal.length === 0) {
      elementIdsRef.current = [];
      return;
    }

    const prevListVal = elementIdsRef.current.map(id => meshesRef.current[id]?.value);
    let newIds = [...elementIdsRef.current];

    if (newIds.length !== listVal.length) {
      // Reinitialize IDs
      newIds = listVal.map((_, i) => `el-${i}-${Math.random().toString(36).substr(2, 9)}`);
    } else {
      // Check if it's a swap of 2 elements
      const diffIndices = [];
      listVal.forEach((val, idx) => {
        if (prevListVal[idx] !== val) {
          diffIndices.push(idx);
        }
      });

      if (diffIndices.length === 2) {
        const [i1, i2] = diffIndices;
        if (listVal[i1] === prevListVal[i2] && listVal[i2] === prevListVal[i1]) {
          // Perform swap of stable IDs
          const temp = newIds[i1];
          newIds[i1] = newIds[i2];
          newIds[i2] = temp;
        }
      } else if (diffIndices.length > 2) {
        // Greedy matching for more complex reordering
        const usedOldIndices = new Set();
        const nextIds = new Array(listVal.length);
        
        // Step 1: Match unchanged elements
        listVal.forEach((val, idx) => {
          if (prevListVal[idx] === val) {
            nextIds[idx] = newIds[idx];
            usedOldIndices.add(idx);
          }
        });

        // Step 2: Match changed elements by value
        listVal.forEach((val, idx) => {
          if (nextIds[idx] === undefined) {
            let matchedIdx = -1;
            for (let j = 0; j < prevListVal.length; j++) {
              if (!usedOldIndices.has(j) && prevListVal[j] === val) {
                matchedIdx = j;
                break;
              }
            }
            if (matchedIdx !== -1) {
              nextIds[idx] = newIds[matchedIdx];
              usedOldIndices.add(matchedIdx);
            } else {
              // Create new ID if value is brand new
              nextIds[idx] = `el-${idx}-${Math.random().toString(36).substr(2, 9)}`;
            }
          }
        });
        newIds = nextIds;
      }
    }

    elementIdsRef.current = newIds;
  }, [listVal]);

  // Handle stack memory values
  useEffect(() => {
    const list = [];
    scalarKeys.forEach(key => {
      const val = variables[key];
      const prevVal = prevVariables[key];
      const isChanged = prevVal !== undefined && prevVal !== val;
      list.push({ key, val, isChanged, type: typeof val });
    });
    dictKeys.forEach(key => {
      const val = variables[key];
      const prevVal = prevVariables[key];
      const isChanged = prevVal !== undefined && JSON.stringify(prevVal) !== JSON.stringify(val);
      list.push({ key, val, isChanged, type: 'dict' });
    });
    setStackVars(list);
  }, [scalarKeys, dictKeys, variables, prevVariables]);

  // 1. Mount-only useEffect to initialize Three.js Context
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const canvas = canvasRef.current;
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 280;

    // Setup Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#090d16'); // Deep dark cyber background
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 4.5, 8.5);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    // OrbitControls for Student Interaction (interactivity disabled)
    const controls = new OrbitControls(camera, canvas);
    controls.enabled = false; // Disable all user pan/zoom/rotate
    controlsRef.current = controls;

    // Add Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(4, 9, 3);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0x6366f1, 0.35, 12);
    pointLight.position.set(0, 4, 1);
    scene.add(pointLight);

    // Subtle Grid Helper
    const gridHelper = new THREE.GridHelper(30, 30, 0x1e293b, 0x0f172a);
    gridHelper.position.y = 0.0; // Sit at base y=0
    scene.add(gridHelper);

    // Visualizer meshes container group
    const visualizerGroup = new THREE.Group();
    scene.add(visualizerGroup);
    visualizerGroupRef.current = visualizerGroup;

    // Compare/swap 3D connectors group
    const connectorGroup = new THREE.Group();
    scene.add(connectorGroup);
    connectorGroupRef.current = connectorGroup;

    // Raycasting elements
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleCanvasMouseMove = (event) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };
    canvas.addEventListener('mousemove', handleCanvasMouseMove);

    const handleCanvasClick = () => {
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(visualizerGroup.children);
      if (intersects.length > 0) {
        const clickedMesh = intersects[0].object;
        const { id, index, value } = clickedMesh.userData;
        
        // Query current pointers
        const activePointers = pointersRef.current[index] || [];
        setSelectedElement({
          id,
          index,
          value,
          isPointed: activePointers.length > 0,
          pointers: activePointers
        });
      } else {
        setSelectedElement(null);
      }
    };
    canvas.addEventListener('click', handleCanvasClick);

    // Resize Observer for responsive scaling
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const w = container.clientWidth || 600;
      const h = container.clientHeight || 280;

      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    resizeObserver.observe(container);

    // Continuous tick loop
    let animationFrameId = null;
    const tempV = new THREE.Vector3();

    const tick = () => {
      // Raycast Hover check
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(visualizerGroup.children);
      if (intersects.length > 0) {
        hoveredMeshIdRef.current = intersects[0].object.userData.id;
        canvas.style.cursor = 'pointer';
      } else {
        hoveredMeshIdRef.current = null;
        canvas.style.cursor = 'default';
      }

      // Smoothly interpolate (lerp) meshes
      Object.keys(meshesRef.current).forEach((id) => {
        const meshInfo = meshesRef.current[id];
        if (!meshInfo) return;

        const mesh = meshInfo.mesh;
        
        // Raycaster scale pop effect on hover
        const isHovered = hoveredMeshIdRef.current === id;
        const hoverScaleFactor = isHovered ? 1.15 : 1.0;

        // Position interpolation (x and z)
        mesh.position.x += (meshInfo.targetX - mesh.position.x) * 0.12;
        mesh.position.z += (meshInfo.targetZ - mesh.position.z) * 0.12;

        // Height scale is constant 1.0, scaled only by hoverScaleFactor
        mesh.scale.set(hoverScaleFactor, hoverScaleFactor, hoverScaleFactor);

        // Smoothly interpolate Y position (resting vs floating)
        let baseTargetY = meshInfo.targetY ?? 0.35;
        
        // Add a gentle floating bob animation if pointed (floating) or changed (hovering)
        if (meshInfo.isPointed || meshInfo.wasChanged) {
          const time = Date.now() * 0.004;
          const bob = Math.sin(time + (mesh.userData.index || 0)) * 0.08;
          baseTargetY += bob;
        }
        mesh.position.y += (baseTargetY - mesh.position.y) * 0.12;

        // Material color & glow interpolation
        mesh.material.color.lerp(meshInfo.targetMat.color, 0.12);
        if (meshInfo.targetMat.emissive) {
          mesh.material.emissive.lerp(meshInfo.targetMat.emissive, 0.12);
          mesh.material.emissiveIntensity += (meshInfo.targetMat.emissiveIntensity - mesh.material.emissiveIntensity) * 0.12;
        } else {
          mesh.material.emissive.setHex(0x000000);
        }

        // Outline cage opacity & color interpolation
        const outline = mesh.userData.outline;
        if (outline) {
          outline.material.opacity += ((meshInfo.targetOutlineOpacity ?? 0) - outline.material.opacity) * 0.12;
          const targetCol = new THREE.Color(meshInfo.targetOutlineColor ?? 0xffffff);
          outline.material.color.lerp(targetCol, 0.12);
        }

        // Project coordinate styles directly onto HTML overlays for absolute positioning
        const overlayElement = document.getElementById(`label-${id}`);
        if (overlayElement) {
          // Top position of cube (height is 0.7, so top is mesh.position.y + 0.35 + 0.1 margin)
          tempV.set(mesh.position.x, mesh.position.y + 0.45, mesh.position.z);
          tempV.project(camera);

          const w = container.clientWidth || 600;
          const h = container.clientHeight || 280;

          const x2d = (tempV.x * 0.5 + 0.5) * w;
          const y2d = (-tempV.y * 0.5 + 0.5) * h;

          overlayElement.style.left = `${x2d}px`;
          overlayElement.style.top = `${y2d}px`;
          overlayElement.style.display = 'flex';
        }
      });

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(tick);
    };

    tick();

    // Cleanups on unmount
    return () => {
      canvas.removeEventListener('mousemove', handleCanvasMouseMove);
      canvas.removeEventListener('click', handleCanvasClick);
      resizeObserver.disconnect();
      if (animationFrameId) cancelAnimationFrame(animationFrameId);

      controls.dispose();
      renderer.dispose();
    };
  }, []);

  // 2. Separate reconciler useEffect to update target properties on step changes
  useEffect(() => {
    const scene = sceneRef.current;
    const visualizerGroup = visualizerGroupRef.current;
    const connectorGroup = connectorGroupRef.current;
    if (!scene || !visualizerGroup || !connectorGroup) return;

    // Premium Glossy Materials
    const baseMaterial = new THREE.MeshPhysicalMaterial({ color: 0x6366f1, roughness: 0.15, metalness: 0.4, clearcoat: 1.0, clearcoatRoughness: 0.1 });
    const compareMaterial = new THREE.MeshPhysicalMaterial({ color: 0x10b981, roughness: 0.1, metalness: 0.4, clearcoat: 1.0, clearcoatRoughness: 0.1, emissive: 0x10b981, emissiveIntensity: 0.2 });
    const swapMaterial = new THREE.MeshPhysicalMaterial({ color: 0xef4444, roughness: 0.1, metalness: 0.4, clearcoat: 1.0, clearcoatRoughness: 0.1, emissive: 0xef4444, emissiveIntensity: 0.25 });
    const changedMaterial = new THREE.MeshPhysicalMaterial({ color: 0xf59e0b, roughness: 0.15, metalness: 0.4, clearcoat: 1.0, clearcoatRoughness: 0.1, emissive: 0xf59e0b, emissiveIntensity: 0.2 });

    const isListMode = listKey && listVal && listVal.length > 0;
    const activeMeshIds = new Set();

    // ----------------------------------------------------
    // 1. Sync Array/List Elements (Center Back, Z = -0.4)
    // ----------------------------------------------------
    const spacing = 1.0;
    const startX = -((listVal.length - 1) * spacing) / 2;
    const pointers = {};

    if (isListMode) {
      const ids = elementIdsRef.current;

      // Detect pointers and map pointersRef
      Object.entries(variables).forEach(([k, v]) => {
        if (typeof v === 'number' && v >= 0 && v < listVal.length && !k.startsWith('__') && k !== 'step_counter') {
          if (!pointers[v]) pointers[v] = [];
          pointers[v].push(k);
        }
      });
      pointersRef.current = pointers;

      // Sync array element meshes
      ids.forEach((id, index) => {
        const val = listVal[index];
        const targetX = startX + index * spacing;
        const targetZ = -0.4;
        activeMeshIds.add(id);

        // Determine highlights
        const activePointers = pointers[index] || [];
        const isPointed = activePointers.length > 0;
        const prevVal = prevVariables[listKey]?.[index];
        const wasChanged = prevVal !== undefined && prevVal !== val;

        let targetMat = baseMaterial;
        if (isPointed) {
          targetMat = actionType === 'SWAP' ? swapMaterial : compareMaterial;
        } else if (wasChanged) {
          targetMat = changedMaterial;
        }

        // Heights
        let targetY = 0.35; // Sitting on grid helper (y=0)
        if (isPointed) {
          targetY = 0.95; // Floats high (0.6 units up)
        } else if (wasChanged) {
          targetY = 0.65; // Floats slightly (0.3 units up)
        }

        let meshInfo = meshesRef.current[id];
        if (!meshInfo) {
          const geo = new THREE.BoxGeometry(0.7, 0.7, 0.7);
          const mesh = new THREE.Mesh(geo, baseMaterial.clone());
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          mesh.position.set(targetX, -5, targetZ); // slide up from bottom
          mesh.userData = { id, index, value: val };

          // Glowing wireframe outline helper
          const outlineGeo = new THREE.BoxGeometry(0.7, 0.7, 0.7);
          const outlineMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            wireframe: true,
            transparent: true,
            opacity: 0.0,
            depthWrite: false
          });
          const outlineMesh = new THREE.Mesh(outlineGeo, outlineMat);
          outlineMesh.scale.set(1.15, 1.15, 1.15);
          mesh.add(outlineMesh);
          mesh.userData.outline = outlineMesh;

          visualizerGroup.add(mesh);

          meshInfo = {
            mesh,
            targetX,
            targetY,
            targetZ,
            targetMat,
            value: val,
            isPointed,
            wasChanged,
            targetOutlineOpacity: (isPointed || wasChanged) ? 0.85 : 0.0,
            targetOutlineColor: isPointed ? (actionType === 'SWAP' ? 0xef4444 : 0x10b981) : 0xf59e0b
          };
          meshesRef.current[id] = meshInfo;
        } else {
          meshInfo.targetX = targetX;
          meshInfo.targetY = targetY;
          meshInfo.targetZ = targetZ;
          meshInfo.targetMat = targetMat;
          meshInfo.value = val;
          meshInfo.isPointed = isPointed;
          meshInfo.wasChanged = wasChanged;
          meshInfo.targetOutlineOpacity = (isPointed || wasChanged) ? 0.85 : 0.0;
          meshInfo.targetOutlineColor = isPointed ? (actionType === 'SWAP' ? 0xef4444 : 0x10b981) : 0xf59e0b;

          meshInfo.mesh.userData.index = index;
          meshInfo.mesh.userData.value = val;
        }
      });
    }

    // Sync array connectors
    while (connectorGroup.children.length > 0) {
      const child = connectorGroup.children[0];
      connectorGroup.remove(child);
      child.geometry.dispose();
      child.material.dispose();
    }

    if (isListMode) {
      const activeIndices = Object.keys(pointers).map(Number).sort((a, b) => a - b);
      if (activeIndices.length >= 2 && (actionType === 'COMPARE' || actionType === 'SWAP')) {
        const idx1 = activeIndices[0];
        const idx2 = activeIndices[activeIndices.length - 1];

        const id1 = elementIdsRef.current[idx1];
        const id2 = elementIdsRef.current[idx2];
        const m1 = meshesRef.current[id1];
        const m2 = meshesRef.current[id2];

        if (m1 && m2) {
          const x1 = startX + idx1 * spacing;
          const x2 = startX + idx2 * spacing;
          const y1 = m1.targetY + 0.35;
          const y2 = m2.targetY + 0.35;

          const start = new THREE.Vector3(x1, y1 + 0.1, -0.4);
          const end = new THREE.Vector3(x2, y2 + 0.1, -0.4);

          const midX = (x1 + x2) / 2;
          const midY = Math.max(y1, y2) + 1.2 + Math.abs(x1 - x2) * 0.15;
          const control = new THREE.Vector3(midX, midY, -0.4);

          const path = new THREE.QuadraticBezierCurve3(start, control, end);
          const tubeGeo = new THREE.TubeGeometry(path, 25, 0.035, 8, false);

          const connectorColor = actionType === 'SWAP' ? 0xef4444 : 0x10b981;
          const tubeMat = new THREE.MeshStandardMaterial({
            color: connectorColor,
            emissive: connectorColor,
            emissiveIntensity: 0.35,
            roughness: 0.2
          });

          const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
          connectorGroup.add(tubeMesh);
        }
      }
    }

    // ----------------------------------------------------
    // 2. Sync Scalar Variables (Front Right, Z = 0.6)
    // ----------------------------------------------------
    const scalarVars = scalarKeys
      .filter(k => !k.startsWith('__') && k !== 'step_counter')
      .map(k => ({ name: k, value: variables[k] }));

    const prevVars = prevVariables || {};
    const varSpacing = 1.2;

    scalarVars.forEach((v, index) => {
      const id = `var-${v.name}`;
      const pedestalId = `pedestal-${v.name}`;
      activeMeshIds.add(id);
      activeMeshIds.add(pedestalId);

      // Offset variables horizontally so they sit on the front right
      const targetX = 1.0 + index * varSpacing;
      const targetZ = 0.6;

      const prevVal = prevVars[v.name];
      const wasChanged = prevVal !== undefined && prevVal !== v.value;
      const targetY = wasChanged ? 0.8 : 0.3;

      // A. Cylinder Pedestal
      let pedestalInfo = meshesRef.current[pedestalId];
      if (!pedestalInfo) {
        const pedGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.05, 16);
        const pedMat = new THREE.MeshPhysicalMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.1 });
        const pedMesh = new THREE.Mesh(pedGeo, pedMat);
        pedMesh.position.set(targetX, 0.025, targetZ);
        visualizerGroup.add(pedMesh);
        pedestalInfo = { mesh: pedMesh, targetX, targetY: 0.025, targetZ };
        meshesRef.current[pedestalId] = pedestalInfo;
      } else {
        pedestalInfo.mesh.position.set(targetX, 0.025, targetZ);
      }

      // B. Value Block (Cube)
      let meshInfo = meshesRef.current[id];
      const valStr = String(v.value);

      if (!meshInfo) {
        const geo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
        const texture = createTextTexture(valStr, '#F8FAFC', '#1e1b4b', 40, 128, 128);
        const textMat = new THREE.MeshBasicMaterial({ map: texture });
        const sideMat = new THREE.MeshPhysicalMaterial({ color: 0x6366f1, roughness: 0.15, metalness: 0.4, clearcoat: 1.0 });
        const materials = [sideMat, sideMat, sideMat, sideMat, textMat, sideMat];
        const mesh = new THREE.Mesh(geo, materials);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.position.set(targetX, -5, targetZ); // slide up from bottom
        mesh.userData = { id, varName: v.name, value: v.value };

        // Glowing outline Helper
        const outlineGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
        const outlineMat = new THREE.MeshBasicMaterial({
          color: 0xf59e0b,
          wireframe: true,
          transparent: true,
          opacity: 0.0,
          depthWrite: false
        });
        const outlineMesh = new THREE.Mesh(outlineGeo, outlineMat);
        outlineMesh.scale.set(1.15, 1.15, 1.15);
        mesh.add(outlineMesh);
        mesh.userData.outline = outlineMesh;

        visualizerGroup.add(mesh);

        meshInfo = {
          mesh,
          targetX,
          targetY,
          targetZ,
          targetMat: sideMat,
          value: v.value,
          wasChanged,
          targetOutlineOpacity: wasChanged ? 0.85 : 0.0,
          targetOutlineColor: 0xf59e0b,
          texture
        };
        meshesRef.current[id] = meshInfo;
      } else {
        if (meshInfo.value !== v.value) {
          if (meshInfo.texture) meshInfo.texture.dispose();
          const newTexture = createTextTexture(valStr, '#F8FAFC', '#1e1b4b', 40, 128, 128);
          meshInfo.mesh.material[4].map = newTexture;
          meshInfo.mesh.material[4].needsUpdate = true;
          meshInfo.texture = newTexture;
          meshInfo.value = v.value;
        }
        meshInfo.targetX = targetX;
        meshInfo.targetY = targetY;
        meshInfo.targetZ = targetZ;
        meshInfo.wasChanged = wasChanged;
        meshInfo.targetOutlineOpacity = wasChanged ? 0.85 : 0.0;
      }
    });

    // ----------------------------------------------------
    // 3. Sync Console Stdout Stack (Left Front, Z = 0.2)
    // ----------------------------------------------------
    if (stdout && stdout.trim().length > 0) {
      const visibleLines = stdout.split('\n').filter(l => l.length > 0).slice(-8);
      
      const consolePlatformId = 'console-platform';
      activeMeshIds.add(consolePlatformId);

      let consolePlatformInfo = meshesRef.current[consolePlatformId];
      if (!consolePlatformInfo) {
        const platGeo = new THREE.BoxGeometry(2.0, 0.03, 1.2);
        const platMat = new THREE.MeshPhysicalMaterial({ color: 0x0f172a, roughness: 0.4, metalness: 0.2 });
        const platMesh = new THREE.Mesh(platGeo, platMat);
        platMesh.position.set(-2.8, 0.015, 0.2);
        visualizerGroup.add(platMesh);
        consolePlatformInfo = { mesh: platMesh, targetX: -2.8, targetY: 0.015, targetZ: 0.2 };
        meshesRef.current[consolePlatformId] = consolePlatformInfo;
      } else {
        consolePlatformInfo.mesh.position.set(-2.8, 0.015, 0.2);
      }

      visibleLines.forEach((lineText, idx) => {
        const id = `stdout-${idx}`;
        activeMeshIds.add(id);

        const targetX = -2.8;
        const targetZ = 0.2;
        const targetY = 0.1 + idx * 0.22; // stack upwards

        let meshInfo = meshesRef.current[id];
        if (!meshInfo) {
          const geo = new THREE.BoxGeometry(1.8, 0.16, 0.8);
          const texture = createTextTexture(lineText, '#F8FAFC', '#0369a1', 32, 256, 64);
          const textMat = new THREE.MeshBasicMaterial({ map: texture });
          const sideMat = new THREE.MeshPhysicalMaterial({
            color: 0x0284c7,
            roughness: 0.15,
            metalness: 0.2,
            transparent: true,
            opacity: 0.85
          });
          const materials = [sideMat, sideMat, sideMat, sideMat, textMat, sideMat];
          const mesh = new THREE.Mesh(geo, materials);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          mesh.position.set(targetX, 3.5, targetZ); // Drop from sky
          mesh.userData = { id, index: idx, value: lineText };

          visualizerGroup.add(mesh);

          meshInfo = {
            mesh,
            targetX,
            targetY,
            targetZ,
            targetMat: sideMat,
            value: lineText,
            texture
          };
          meshesRef.current[id] = meshInfo;
        } else {
          if (meshInfo.value !== lineText) {
            if (meshInfo.texture) meshInfo.texture.dispose();
            const newTexture = createTextTexture(lineText, '#F8FAFC', '#0369a1', 32, 256, 64);
            meshInfo.mesh.material[4].map = newTexture;
            meshInfo.mesh.material[4].needsUpdate = true;
            meshInfo.texture = newTexture;
            meshInfo.value = lineText;
          }
          meshInfo.targetX = targetX;
          meshInfo.targetY = targetY;
          meshInfo.targetZ = targetZ;
        }
      });
    }

    // ----------------------------------------------------
    // 4. Global Bounding Box Camera Auto-Framing
    // ----------------------------------------------------
    if (cameraRef.current && containerRef.current) {
      const w = containerRef.current.clientWidth || 600;
      const h = containerRef.current.clientHeight || 280;
      const A = w / h;

      const arrayWidth = isListMode ? ((listVal.length - 1) * spacing + 1.0) : 0;
      const varsWidth = scalarVars.length * varSpacing;

      // Stdout stack goes down to X = -3.8. Variables stretch to the right.
      const minX = -3.8;
      const maxX = Math.max(0.5, arrayWidth / 2, 1.0 + varsWidth);
      const totalWidth = maxX - minX;

      const fovRad = (cameraRef.current.fov * Math.PI) / 180;
      const halfFovHeight = Math.tan(fovRad / 2);

      const requiredDistByWidth = (totalWidth / 2) / (A * halfFovHeight);
      const requiredDistByHeight = 2.2 / halfFovHeight;
      const targetDist = Math.max(7.5, requiredDistByWidth + 1.8, requiredDistByHeight);

      // Centered around mid-point of elements
      const targetCenterX = (minX + maxX) / 2;

      cameraRef.current.position.set(targetCenterX, targetDist * 0.54, targetDist * 0.85);
      cameraRef.current.lookAt(targetCenterX, 0.2, 0.0);
      if (controlsRef.current) {
        controlsRef.current.target.set(targetCenterX, 0.2, 0.0);
      }
    }

    // ----------------------------------------------------
    // 5. Cleanup Stale Meshes and Textures
    // ----------------------------------------------------
    Object.keys(meshesRef.current).forEach((id) => {
      if (!activeMeshIds.has(id)) {
        const meshInfo = meshesRef.current[id];
        visualizerGroup.remove(meshInfo.mesh);
        meshInfo.mesh.geometry.dispose();
        if (meshInfo.texture) meshInfo.texture.dispose();
        if (Array.isArray(meshInfo.mesh.material)) {
          meshInfo.mesh.material.forEach(m => m.dispose());
        } else {
          meshInfo.mesh.material.dispose();
        }
        delete meshesRef.current[id];
      }
    });

    // Cleanup materials
    return () => {
      baseMaterial.dispose();
      compareMaterial.dispose();
      swapMaterial.dispose();
      changedMaterial.dispose();
    };
  }, [listKey, listVal, variables, prevVariables, scalarKeys, actionType, stdout]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: 250,
        background: '#090d16',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Three.js WebGL Canvas */}
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />

      {/* Floating 2D HTML Labels Overlay (Positions managed directly by WebGL loop) */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10 }}>
        {/* List Mode Labels */}
        {listKey && listVal.length > 0 && elementIdsRef.current.map((id, index) => {
          const val = listVal[index];
          const activePointers = pointersRef.current[index] || [];
          return (
            <div
              key={id}
              id={`label-${id}`}
              style={{
                position: 'absolute',
                display: 'none', // toggled to block by three.js tick loop once coordinates are projected
                transform: 'translate(-50%, -100%)',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4
              }}
            >
              {/* Value Box */}
              <div
                style={{
                  background: '#0F172A',
                  color: '#F8FAFC',
                  fontFamily: 'monospace',
                  fontSize: 11.5,
                  fontWeight: 800,
                  padding: '2px 7px',
                  borderRadius: 5,
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}
              >
                {String(val)}
              </div>

              {/* Variable Pointers (i, j, low, high) */}
              {activePointers.length > 0 && (
                <div style={{ display: 'flex', gap: 3, marginTop: 2 }}>
                  {activePointers.map(ptrName => (
                    <div
                      key={ptrName}
                      style={{
                        background: actionType === 'SWAP' ? '#EF4444' : '#10B981',
                        color: '#ffffff',
                        fontSize: 8.5,
                        fontWeight: 800,
                        padding: '1px 5px',
                        borderRadius: 3,
                        fontFamily: 'monospace',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                        animation: 'bounce 0.8s infinite alternate'
                      }}
                    >
                      {ptrName}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Variables Mode Labels (Name tags floating above pedestals) */}
        {(!listKey || listVal.length === 0) && stackVars.filter(v => v.type !== 'dict').map((v) => {
          const id = `var-${v.key}`;
          return (
            <div
              key={id}
              id={`label-${id}`}
              style={{
                position: 'absolute',
                display: 'none',
                transform: 'translate(-50%, -100%)',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4
              }}
            >
              <div
                style={{
                  background: 'rgba(15, 23, 42, 0.85)',
                  color: '#38BDF8',
                  fontFamily: 'monospace',
                  fontSize: 11,
                  fontWeight: 800,
                  padding: '2px 7px',
                  borderRadius: 5,
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(56, 189, 248, 0.35)',
                  backdropFilter: 'blur(4px)'
                }}
              >
                {v.key}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Element HUD Card Details Inspector */}
      {selectedElement && (
        <div
          style={{
            position: 'absolute',
            bottom: 12,
            left: 12,
            background: 'rgba(10, 15, 30, 0.85)',
            backdropFilter: 'blur(16px)',
            color: '#F8FAFC',
            padding: '12px 16px',
            borderRadius: 12,
            border: '1px solid rgba(255, 255, 255, 0.1)',
            fontSize: 11.5,
            fontFamily: 'monospace',
            zIndex: 40,
            minWidth: 200,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4)',
            display: 'flex',
            flexDirection: 'column',
            gap: 5
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: 6, marginBottom: 4 }}>
            <span style={{ fontWeight: 800, color: '#38BDF8', letterSpacing: '0.04em' }}>ELEMENT DETAILS</span>
            <button
              onClick={() => setSelectedElement(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#8892B0',
                cursor: 'pointer',
                fontWeight: 800,
                fontSize: 12,
                padding: '0 2px'
              }}
              onMouseEnter={e => e.target.style.color = '#F87171'}
              onMouseLeave={e => e.target.style.color = '#8892B0'}
            >
              ✕
            </button>
          </div>
          <div>Index: <span style={{ color: '#FBBF24', fontWeight: 800 }}>{selectedElement.index}</span></div>
          <div>Value: <span style={{ color: '#34D399', fontWeight: 800 }}>{String(selectedElement.value)}</span></div>
          <div>State: <span style={{ color: selectedElement.isPointed ? '#F87171' : '#8892B0' }}>
            {selectedElement.isPointed ? `Targeted by pointer (${selectedElement.pointers.join(', ')})` : 'Idle'}
          </span></div>
        </div>
      )}

      {/* Stack/Scalar Registers Sidebar overlay (right side) */}
      {stackVars.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            width: 170,
            maxHeight: 'calc(100% - 24px)',
            background: 'rgba(10, 15, 30, 0.85)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 12,
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4)',
            overflowY: 'auto',
            zIndex: 20
          }}
          className="sandbox-scroll"
        >
          <div style={{
            fontSize: 9.5,
            color: '#8892B0',
            fontWeight: 800,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            paddingBottom: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}>
            <span style={{ color: '#6366F1' }}>●</span> Registers
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {stackVars.map((v) => (
              <div
                key={v.key}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: v.isChanged ? 'rgba(251, 191, 36, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                  border: v.isChanged ? '1px solid rgba(251, 191, 36, 0.4)' : '1px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: 6,
                  padding: '4px 8px',
                  transition: 'all 0.3s'
                }}
              >
                <span style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: '#8892B0' }}>
                  {v.key}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontFamily: 'monospace',
                    fontWeight: 800,
                    color: v.isChanged ? '#FBBF24' : (v.type === 'number' ? '#38BDF8' : (v.type === 'boolean' ? '#34D399' : '#F8FAFC'))
                  }}
                >
                  {v.type === 'dict' ? '{...}' : String(v.val)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Styles for bounce animation and OrbitControls hover cursor */}
      <style>{`
        @keyframes bounce {
          from { transform: translateY(0); }
          to { transform: translateY(-3px); }
        }
      `}</style>
    </div>
  );
}
