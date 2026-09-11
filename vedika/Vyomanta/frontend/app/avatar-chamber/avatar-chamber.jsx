'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { AvatarChamberScene } from './engine/AvatarChamberScene';
import { CHAMBERS_DATA } from './engine/AvatarChamberGeometry';
import AvatarChamberOverlay from './components/AvatarChamberOverlay';
import Golddust from './components/Golddust';
import './avatar-chamber.css';

export default function AvatarChamberPage() {
  const canvasRef = useRef(null);
  const sceneInstanceRef = useRef(null);
  const [isSceneReady, setIsSceneReady] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleIndexChangeFromScene = useCallback((index) => {
    setActiveIndex(index);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const scene = new AvatarChamberScene(canvas, handleIndexChangeFromScene, () => {
      setIsSceneReady(true);
    });
    sceneInstanceRef.current = scene;

    const readyTimer = setTimeout(() => {
      setIsSceneReady(true);
    }, 4500);

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
    }
  };

  const handlePrev = () => {
    if (sceneInstanceRef.current) {
      sceneInstanceRef.current.prev();
    }
  };

  const handleSelectIndex = (index) => {
    if (sceneInstanceRef.current) {
      sceneInstanceRef.current.goTo(index);
    }
  };

  return (
    <main className="vchamber-container">
      {/* 1. 3D WebGL Canvas (Avatars & Shader Pedestals) */}
      <canvas ref={canvasRef} className="vchamber-canvas" />

      {/* Loading Screen Overlay */}
      <div className={`vchamber-loader-overlay ${isSceneReady ? 'vchamber-loader-hidden' : ''}`}>
        <div className="vchamber-loader-ring" />
        <span className="vchamber-loader-text">Loading Avatar Chamber...</span>
      </div>

      {/* Interactive Avatar Chamber Overlay with Bottom Controller */}
      <AvatarChamberOverlay
        activeIndex={activeIndex}
        onNext={handleNext}
        onPrev={handlePrev}
        onSelectIndex={handleSelectIndex}
      />

      {/* 2. Sprinkling Golddust Canvas Overlay on Middle Avatar */}
      <Golddust />
    </main>
  );
}
