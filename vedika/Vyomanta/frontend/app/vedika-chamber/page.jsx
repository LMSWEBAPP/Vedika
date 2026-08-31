'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { VedikaChamberScene } from './engine/VedikaChamberScene';
import { CHAMBERS_DATA } from './engine/ChamberGeometry';
import ChamberOverlay from './components/ChamberOverlay';
import LightRays from './components/LightRays';
import Galaxy from './components/Galaxy';
import CrownTuner, { DEFAULT_AVATAR_CONFIGS } from './components/CrownTuner';
import './vedika-chamber.css';

/**
 * Vedika AI 3D Chamber Experience Page
 *
 * Implements:
 *  - 4 AI Companions on glowing circular pedestals
 *  - React Bits Galaxy ambient cosmic particle background
 *  - React Bits LightRays celestial volumetric lighting
 *  - Floating cartoonish royal crowns tinted per avatar
 *  - Independent Fine-Tuner for all 4 Avatars (Crown, Light Rays, Below Text)
 *  - Dynamic companion hero card positioned directly below front avatar
 */
export default function VedikaChamberPage() {
  const canvasRef = useRef(null);
  const sceneInstanceRef = useRef(null);
  const [isSceneReady, setIsSceneReady] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0); // Default to Ask Vedika (index 0)
  const [isRaysEnabled, setIsRaysEnabled] = useState(true);
  const [avatarConfigs, setAvatarConfigs] = useState(DEFAULT_AVATAR_CONFIGS);

  const currentCompanion = CHAMBERS_DATA[activeIndex] || CHAMBERS_DATA[0];

  const handleIndexChangeFromScene = useCallback((index) => {
    setActiveIndex(index);
  }, []);

  const handleConfigsChange = useCallback((configs) => {
    setAvatarConfigs(configs);
    if (sceneInstanceRef.current) {
      sceneInstanceRef.current.setAllCrownConfigs(configs);
    }
    // Update external CSS variables for text positioning and scaling
    if (typeof document !== 'undefined' && Array.isArray(configs)) {
      configs.forEach((cfg, idx) => {
        if (cfg?.text?.textLeft !== undefined) {
          document.documentElement.style.setProperty(`--vco-slot-${idx}-left`, `${cfg.text.textLeft}%`);
        }
      });
      const activeText = configs[activeIndex]?.text;
      if (activeText) {
        if (activeText.textBottom !== undefined) {
          document.documentElement.style.setProperty('--vco-card-bottom', `${activeText.textBottom}px`);
        }
        if (activeText.textSize !== undefined) {
          document.documentElement.style.setProperty('--vco-card-scale', `${activeText.textSize}`);
        }
      }
    }
  }, [activeIndex]);

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

  const handleToggleRays = () => {
    setIsRaysEnabled((prev) => !prev);
  };

  const activeCfg = (avatarConfigs && avatarConfigs[activeIndex]) || DEFAULT_AVATAR_CONFIGS[activeIndex];
  const lightCfg = activeCfg?.light || DEFAULT_AVATAR_CONFIGS[activeIndex].light;

  return (
    <main className="vchamber-container">
      {/* 0. React Bits Galaxy Ambient Cosmic Particle Background (Layer 0) */}
      <Galaxy
        starSpeed={0.35}
        density={1.1}
        glowIntensity={0.85}
        particleCount={1400}
      />

      {/* 1. React Bits Celestial Volumetric Light Rays (Layer 1 - Behind Avatars) */}
      {isRaysEnabled && (
        <LightRays
          targetXPercent={(lightCfg.lightX || 19.0) / 100.0}
          raysColor={currentCompanion.themeColor || currentCompanion.colorHex}
          raysSpeed={lightCfg.raysSpeed || 0.75}
          lightSpread={lightCfg.lightSpread || 0.55}
          rayLength={lightCfg.rayLength || 3.5}
          pulsating={true}
          followMouse={true}
          mouseInfluence={0.03}
        />
      )}

      {/* 2. 3D WebGL Canvas (Layer 2 - Avatars Rendered In Front) */}
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
        isRaysEnabled={isRaysEnabled}
        onToggleRays={handleToggleRays}
      />

      {/* Multi-Avatar Live Fine Tuner (Sliders + Manual Number Inputs for Crown, Light, and Text) */}
      <CrownTuner
        activeIndex={activeIndex}
        onSelectAvatar={handleSelectIndex}
        onConfigsChange={handleConfigsChange}
      />
    </main>
  );
}
