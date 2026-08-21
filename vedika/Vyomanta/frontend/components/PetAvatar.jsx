'use client';

/**
 * @file PetAvatar.jsx
 * @description Vedika AI Companion Mascot Animated Avatar Component.
 * 
 * CURRENT RENDERER: HTML5 2D Canvas Spritesheet Renderer
 * Asset Path: /assets/vedika/pet_web.webp (326x460px per frame, 35 cols x 2 rows)
 * Config Path: /assets/vedika/pet.json
 * 
 * -----------------------------------------------------------------------------
 * FUTURE RIVE (.riv) UPGRADE ROADMAP & GUIDE FOR DEVELOPERS / AI ASSISTANTS:
 * -----------------------------------------------------------------------------
 * If in the future you wish to replace this Canvas Spritesheet renderer with Rive:
 * 1. Install Rive React runtime: `npm install @rive-app/react-canvas`
 * 2. Create and rig your vector pet mascot in Rive Studio (https://rive.app) with inputs:
 *    - Trigger/State: "isSpeaking" (boolean)
 *    - Trigger/State: "isListening" (boolean)
 *    - Trigger/State: "isThinking" (boolean)
 * 3. Place the exported `.riv` file at `/public/assets/vedika/pet_mascot.riv`.
 * 4. Replace the internal JSX of THIS component (<PetAvatar />) with Rive's `useRive()` hook.
 * 
 * IMPORTANT: DO NOT CHANGE THE EXTERNAL PROPS OF THIS COMPONENT!
 * Keep `isSpeaking`, `isListening`, `isThinking`, `size`, `style`, `className` unchanged so
 * parent pages (e.g. viva-interview/page.jsx) will continue to work seamlessly.
 * -----------------------------------------------------------------------------
 */

import { useEffect, useRef, useState, useMemo } from 'react';

const FRAME_WIDTH = 326;
const FRAME_HEIGHT = 460;
const HOLD_DEBOUNCE_MS = 150; // 150ms hold buffer to prevent micro-flicker on turn pauses

export default function PetAvatar({
  isSpeaking = false,
  isListening = false,
  isThinking = false,
  size = 140,
  className = '',
  style = {}
}) {
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const configRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Debounced / Computed Active Animation State
  const [activeState, setActiveState] = useState('idle'); // 'idle' | 'speak' | 'listen' | 'thinking'
  const debounceTimerRef = useRef(null);
  const activeStateRef = useRef('idle');

  // Unified State Priority Calculation with 150ms Hold Debounce
  const targetState = useMemo(() => {
    if (isListening) return 'listen';
    if (isSpeaking) return 'speak';
    if (isThinking) return 'thinking';
    return 'idle';
  }, [isListening, isSpeaking, isThinking]);

  useEffect(() => {
    const currentState = activeStateRef.current;
    
    // Priority order weights
    const priority = { listen: 4, speak: 3, thinking: 2, idle: 1 };

    // Shifting UP priority (e.g. user starts speaking or AI speaks) -> Immediately switch (0ms latency)
    if (priority[targetState] > priority[currentState]) {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      activeStateRef.current = targetState;
      setActiveState(targetState);
    } 
    // Shifting DOWN priority or to IDLE -> Apply 150ms hold debounce to prevent flicker
    else if (priority[targetState] < priority[currentState]) {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        activeStateRef.current = targetState;
        setActiveState(targetState);
      }, HOLD_DEBOUNCE_MS);
    }

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [targetState]);

  // Load Spritesheet Image and pet.json config
  useEffect(() => {
    let isMounted = true;

    async function loadAssets() {
      try {
        const configRes = await fetch('/assets/vedika/pet.json');
        const configData = await configRes.json();
        if (!isMounted) return;
        configRef.current = configData;

        const img = new Image();
        img.src = '/assets/vedika/pet_web.webp';
        img.onload = () => {
          if (!isMounted) return;
          imgRef.current = img;
          setIsLoaded(true);
        };
      } catch (err) {
        console.error('[PetAvatar] Failed to load pet mascot assets:', err);
      }
    }

    loadAssets();

    return () => {
      isMounted = false;
    };
  }, []);

  // HTML5 2D Canvas Animation Loop
  useEffect(() => {
    if (!isLoaded || !canvasRef.current || !imgRef.current || !configRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = imgRef.current;
    const config = configRef.current;

    let animFrameId;
    let lastFrameTime = performance.now();
    let currentFrameIdx = 0;

    const render = (now) => {
      animFrameId = requestAnimationFrame(render);

      const animName = activeStateRef.current;
      const animDef = config.animations[animName] || config.animations.idle || { fps: 12, frames: [[0, 0]] };
      const fps = animDef.fps || 12;
      const intervalMs = 1000 / fps;

      if (now - lastFrameTime >= intervalMs) {
        lastFrameTime = now;
        currentFrameIdx = (currentFrameIdx + 1) % animDef.frames.length;
      }

      const frameCoords = animDef.frames[currentFrameIdx] || [0, 0];
      const row = frameCoords[0];
      const col = frameCoords[1];

      const sx = col * FRAME_WIDTH;
      const sy = row * FRAME_HEIGHT;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw active frame scaled to canvas bounds
      ctx.drawImage(
        img,
        sx, sy, FRAME_WIDTH, FRAME_HEIGHT,
        0, 0, canvas.width, canvas.height
      );
    };

    animFrameId = requestAnimationFrame(render);

    return () => {
      if (animFrameId) cancelAnimationFrame(animFrameId);
    };
  }, [isLoaded]);

  // Dimensions math
  const numericSize = typeof size === 'number' ? size : parseInt(size, 10) || 140;
  const containerHeight = numericSize;
  const containerWidth = Math.round(numericSize * (FRAME_WIDTH / FRAME_HEIGHT));

  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{
        width: containerWidth,
        height: containerHeight,
        ...style
      }}
    >
      <canvas
        ref={canvasRef}
        width={FRAME_WIDTH}
        height={FRAME_HEIGHT}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          display: 'block',
          dropShadow: '0 8px 24px rgba(139, 92, 246, 0.25)'
        }}
      />
      
      {/* Loading fallback indicator */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-purple-500/10 rounded-full animate-pulse">
          <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
