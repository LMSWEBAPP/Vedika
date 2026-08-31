'use client';

import { useEffect } from 'react';
import { Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import './ChamberOverlay.css';

export default function ChamberOverlay({
  onNext,
  onPrev,
}) {
  const handleNext = () => {
    onNext?.();
  };

  const handlePrev = () => {
    onPrev?.();
  };

  // Keyboard navigation support (Left / Right arrow keys)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  return (
    <div className="vco-overlay">
      {/* ── Top Header Section ── */}
      <header className="vco-header">
        <div className="vco-badge">
          <span className="vco-badge-pulse" />
          <Sparkles size={12} />
          <span>VEDIKA 3D CHAMBER</span>
        </div>

        <h1 className="vco-title">
          VEDIKA 3D <span className="vco-title-accent">CHAMBER</span>
        </h1>

        <p className="vco-subtitle">
          Interactive 3D Avatar Chamber
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

      {/* ── Bottom Callout Text ── */}
      <footer className="vco-footer">
        <p className="vco-footer-text">
          Click on a buddy to interact with them
        </p>
      </footer>
    </div>
  );
}
