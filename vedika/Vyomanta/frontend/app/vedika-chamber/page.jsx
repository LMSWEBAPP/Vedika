'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { VedikaChamberScene } from './engine/VedikaChamberScene';
import ChamberOverlay from './components/ChamberOverlay';
import './vedika-chamber.css';

/**
 * Vedika AI 3D Chamber Experience Page
 *
 * Implements:
 *  - 4 AI Companions on glowing circular pedestals:
 *     1. Ask Vedika          (Mint Green)
 *     2. Code with Vedika     (Sky Blue)
 *     3. Code Puzzles        (Rose Pink)
 *     4. Viva and Interview  (Warm Gold)
 *  - Circular neon pedestals in each companion's exact color
 *  - Name tags with vertical dotted connector lines
 *  - Straight front-back focus transition with zero overlap
 */
export default function VedikaChamberPage() {
  const canvasRef = useRef(null);
  const sceneInstanceRef = useRef(null);
  const [isSceneReady, setIsSceneReady] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0); // Default to Ask Vedika (index 0)

  const handleIndexChangeFromScene = useCallback((index) => {
    setActiveIndex(index);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const scene = new VedikaChamberScene(canvas, handleIndexChangeFromScene);
    sceneInstanceRef.current = scene;

    const readyTimer = setTimeout(() => {
      setIsSceneReady(true);
    }, 150);

    return () => {
      clearTimeout(readyTimer);
      if (sceneInstanceRef.current) {
        sceneInstanceRef.current.dispose();
        sceneInstanceRef.current = null;
      }
    };
  }, [handleIndexChangeFromScene]);

  const handleNext = () => {
    if (sceneInstanceRef.current) {
      sceneInstanceRef.current.next();
      setActiveIndex((prev) => (prev + 1) % 4);
    }
  };

  const handlePrev = () => {
    if (sceneInstanceRef.current) {
      sceneInstanceRef.current.prev();
      setActiveIndex((prev) => (prev - 1 + 4) % 4);
    }
  };

  const handleSelectIndex = (index) => {
    if (sceneInstanceRef.current) {
      sceneInstanceRef.current.goTo(index);
      setActiveIndex(index);
    }
  };

  return (
    <main className="vchamber-container">
      {/* 3D WebGL Canvas */}
      <canvas ref={canvasRef} className="vchamber-canvas" />

      {/* Loading Screen Overlay */}
      <div className={`vchamber-loader-overlay ${isSceneReady ? 'vchamber-loader-hidden' : ''}`}>
        <div className="vchamber-loader-ring" />
        <span className="vchamber-loader-text">Loading 3D Chamber...</span>
      </div>

      {/* Interactive Chamber Overlay */}
      <ChamberOverlay
        activeIndex={activeIndex}
        onNext={handleNext}
        onPrev={handlePrev}
        onSelectIndex={handleSelectIndex}
      />
    </main>
  );
}
