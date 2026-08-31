'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, ChevronLeft, ChevronRight, ChevronDown, Sun } from 'lucide-react';
import { CHAMBERS_DATA } from '../engine/ChamberGeometry';
import './ChamberOverlay.css';

const SLOT_CLASSES = ['vco-slot-0', 'vco-slot-1', 'vco-slot-2', 'vco-slot-3'];

export default function ChamberOverlay({
  activeIndex = 0,
  onNext,
  onPrev,
  isRaysEnabled = true,
  onToggleRays,
}) {
  const router = useRouter();
  const currentCompanion = CHAMBERS_DATA[activeIndex] || CHAMBERS_DATA[0];

  const handleNext = () => {
    onNext?.();
  };

  const handlePrev = () => {
    onPrev?.();
  };

  const handleEnterWorld = () => {
    const route = currentCompanion?.route || '/vedika-ai';
    router.push(route);
  };

  // Keyboard navigation support (Left / Right arrow keys)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'Enter') {
        handleEnterWorld();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const slotClass = SLOT_CLASSES[activeIndex] || 'vco-slot-0';

  return (
    <div className="vco-overlay">
      {/* ── Top Header Section ── */}
      <header className="vco-header">
        <div className="vco-header-top-row">
          <div className="vco-badge">
            <span className="vco-badge-pulse" />
            <Sparkles size={12} />
            <span>VEDIKA 3D CHAMBER</span>
          </div>

          <button
            className={`vco-rays-btn ${isRaysEnabled ? 'vco-rays-btn-active' : ''}`}
            onClick={onToggleRays}
            title="Toggle Celestial Light Rays"
            type="button"
          >
            <Sun size={13} />
            <span>Light Rays {isRaysEnabled ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        <h1 className="vco-title">
          Choose <span className="vco-title-accent">Your Companion</span>
        </h1>

        <p className="vco-subtitle">
          Each buddy has a world of fun waiting for you.
        </p>
      </header>

      {/* ── Floating Carousel Action Buttons (Left & Right) ── */}
      <div className="vco-carousel-actions">
        <button
          className="vco-nav-btn vco-nav-prev"
          onClick={handlePrev}
          aria-label="Previous Avatar"
          type="button"
        >
          <ChevronLeft size={28} strokeWidth={2.4} />
        </button>

        <button
          className="vco-nav-btn vco-nav-next"
          onClick={handleNext}
          aria-label="Next Avatar"
          type="button"
        >
          <ChevronRight size={28} strokeWidth={2.4} />
        </button>
      </div>

      {/* ── Dynamic Bottom Hero Card (Positioned directly below front avatar) ── */}
      <div className={`vco-hero-card-container ${slotClass}`}>
        <div className="vco-hero-card" key={currentCompanion.id}>
          <h2 className="vco-hero-name">{currentCompanion.name}</h2>
          <p className="vco-hero-subtitle">{currentCompanion.subtitle}</p>

          <button
            className="vco-enter-world-btn"
            onClick={handleEnterWorld}
            type="button"
          >
            <span>Enter World</span>
            <span className="vco-enter-arrow">→</span>
          </button>
        </div>
      </div>

      {/* ── Bottom Footer Callout ── */}
      <footer className="vco-footer">
        <p className="vco-footer-text">
          Pick a buddy and start your adventure
        </p>
        <ChevronDown size={15} className="vco-footer-chevron" />
      </footer>
    </div>
  );
}
