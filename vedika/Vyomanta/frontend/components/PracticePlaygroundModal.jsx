'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Terminal, X, Minus } from 'lucide-react';
import dynamic from 'next/dynamic';
import './PracticePlaygroundModal.css';

const Playground = dynamic(() => import('./Playground'), {
  ssr: false,
  loading: () => (
    <div style={{
      height: '100%',
      minHeight: '420px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#94a3b8',
      background: '#090d16',
      fontSize: '14px',
      letterSpacing: '0.02em'
    }}>
      Loading Practice Environment...
    </div>
  ),
});

/**
 * PracticePlaygroundModal
 * Authentic macOS Genie / Liquid Cloth animation with smooth cubic Bézier curves.
 * Animates to and from the exact Practice Playground trigger button with zero square-ness.
 */
export default function PracticePlaygroundModal({
  isOpen,
  onClose,
  initialCode = '# Python Practice Environment\n# Write your code here\n\n',
  title = 'Practice Playground',
  codingExercise = null,
  onVerifySuccess = null,
  badge = 'Python 3.11',
  codeOverride = null,
  explanationOverride = null,
  onTraceComplete = null,
  onCodeChange = null,
}) {
  const [isClosing, setIsClosing] = useState(false);
  const windowRef = React.useRef(null);
  const backdropRef = React.useRef(null);
  const rafRef = React.useRef(null);

  // Global click capture to store the exact position of the clicked Practice Playground button
  useEffect(() => {
    const handleGlobalClick = (e) => {
      const btn = e.target.closest('button, a');
      if (btn && (btn.textContent?.includes('Practice Playground') || btn.textContent?.includes('Sandbox') || btn.dataset.practiceTrigger)) {
        const rect = btn.getBoundingClientRect();
        window.__lastPracticeTriggerRect = {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
        };
      }
    };
    window.addEventListener('click', handleGlobalClick, true);
    return () => window.removeEventListener('click', handleGlobalClick, true);
  }, []);

  // Helper to find the trigger button's screen coordinates
  const getTriggerRect = useCallback(() => {
    if (typeof window === 'undefined') return null;
    if (window.__lastPracticeTriggerRect) return window.__lastPracticeTriggerRect;

    const btn = document.querySelector('button[data-practice-trigger="true"]') ||
      Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Practice Playground') || b.textContent?.includes('Sandbox'));

    if (btn) {
      const r = btn.getBoundingClientRect();
      return { left: r.left, top: r.top, width: r.width, height: r.height };
    }
    return null;
  }, []);

  // Compute & apply the cubic Bézier Genie path at progress p (0 = fully open, 1 = sucked into button)
  const applyGenieFrame = useCallback((p, modalRect, triggerRect) => {
    const el = windowRef.current;
    if (!el) return;

    if (p <= 0.001) {
      // Fully open: clean reset
      el.style.clipPath = 'none';
      el.style.transform = 'none';
      el.style.opacity = '1';
      return;
    }

    const W = modalRect.width;
    const H = modalRect.height;

    // Target coordinates relative to the modal window
    let btnX = W * 0.82;
    let btnY = H + 60;
    let btnW = 120;

    if (triggerRect) {
      btnX = triggerRect.left + triggerRect.width / 2 - modalRect.left;
      btnY = triggerRect.top + triggerRect.height / 2 - modalRect.top;
      btnW = triggerRect.width || 120;
    }

    // Dynamic S-curve physics:
    // Bottom collapses toward button faster, top drapes and lags behind like silk
    const bottomProgress = Math.min(1, Math.pow(p, 0.72) * 1.05);
    const topProgress = Math.max(0, Math.pow(p, 1.75));
    const waistProgress = Math.min(1, Math.pow(p, 1.15));

    // Bottom neck width pinches down
    const halfBtnW = Math.max(6, (btnW / 2) * (1 - p * 0.65));
    const botY = H * (1 - bottomProgress) + btnY * bottomProgress;
    const botLeftX = 0 * (1 - bottomProgress) + (btnX - halfBtnW) * bottomProgress;
    const botRightX = W * (1 - bottomProgress) + (btnX + halfBtnW) * bottomProgress;

    // Top edge droops gracefully like draped cloth
    const topDroop = Math.sin(p * Math.PI) * (H * 0.09);
    const topY = 0 * (1 - topProgress) + (btnY - 8) * topProgress + topDroop;
    const halfTopW = Math.max(10, (W / 2) * (1 - topProgress) + halfBtnW * topProgress);
    const topLeftX = 0 * (1 - topProgress) + (btnX - halfTopW) * topProgress;
    const topRightX = W * (1 - topProgress) + (btnX + halfTopW) * topProgress;

    // Control points for the RIGHT flank (smooth liquid S-curve)
    const cp1x = topRightX * (1 - waistProgress * 0.32) + btnX * (waistProgress * 0.32);
    const cp1y = topY + (botY - topY) * 0.32;
    const waistPinch = (1 - p) * 0.38;
    const cp2x = botRightX + (topRightX - botRightX) * waistPinch;
    const cp2y = topY + (botY - topY) * 0.76;

    // Control points for the LEFT flank (matching liquid S-curve)
    const cp3x = botLeftX + (topLeftX - botLeftX) * waistPinch;
    const cp3y = topY + (botY - topY) * 0.76;
    const cp4x = topLeftX * (1 - waistProgress * 0.32) + btnX * (waistProgress * 0.32);
    const cp4y = topY + (botY - topY) * 0.32;

    // Top droop control point
    const cpTopX = (topLeftX + topRightX) / 2;
    const cpTopY = topY + topDroop * 1.55;

    // Bottom neck control point
    const cpBotX = (botLeftX + botRightX) / 2;
    const cpBotY = botY + 2;

    // Silky cubic Bézier SVG path string
    const pathString = `path('M ${topLeftX.toFixed(1)}px ${topY.toFixed(1)}px ` +
      `Q ${cpTopX.toFixed(1)}px ${cpTopY.toFixed(1)}px ${topRightX.toFixed(1)}px ${topY.toFixed(1)}px ` +
      `C ${cp1x.toFixed(1)}px ${cp1y.toFixed(1)}px, ${cp2x.toFixed(1)}px ${cp2y.toFixed(1)}px, ${botRightX.toFixed(1)}px ${botY.toFixed(1)}px ` +
      `Q ${cpBotX.toFixed(1)}px ${cpBotY.toFixed(1)}px ${botLeftX.toFixed(1)}px ${botY.toFixed(1)}px ` +
      `C ${cp3x.toFixed(1)}px ${cp3y.toFixed(1)}px, ${cp4x.toFixed(1)}px ${cp4y.toFixed(1)}px, ${topLeftX.toFixed(1)}px ${topY.toFixed(1)}px Z')`;

    el.style.clipPath = pathString;

    // Subtle translation & momentum
    const deltaX = btnX - W / 2;
    const deltaY = btnY - H / 2;
    const transX = deltaX * p * 0.12;
    const transY = deltaY * p * 0.12;
    const scale = 1 - p * 0.08;

    el.style.transform = `translate(${transX.toFixed(1)}px, ${transY.toFixed(1)}px) scale(${scale.toFixed(3)})`;
    el.style.opacity = p > 0.88 ? `${Math.max(0, 1 - (p - 0.88) / 0.12)}` : '1';
  }, []);

  // Run the OPEN animation (unfurl from button: p goes from 1 to 0)
  useEffect(() => {
    if (!isOpen) return;

    // Wait 1 frame for modal to mount in DOM so we can measure exact bounding rect
    const timer = setTimeout(() => {
      const el = windowRef.current;
      if (!el) return;

      const modalRect = el.getBoundingClientRect();
      const triggerRect = getTriggerRect();

      const duration = 460; // ms
      const startTime = performance.now();

      // Start fully sucked at button
      applyGenieFrame(1, modalRect, triggerRect);

      const animateOpen = (now) => {
        const elapsed = now - startTime;
        const t = Math.min(1, elapsed / duration);
        // Easing: easeOutCubic
        const ease = 1 - Math.pow(1 - t, 3);
        const p = 1 - ease;

        applyGenieFrame(p, modalRect, triggerRect);

        if (t < 1) {
          rafRef.current = requestAnimationFrame(animateOpen);
        } else {
          applyGenieFrame(0, modalRect, triggerRect);
        }
      };

      rafRef.current = requestAnimationFrame(animateOpen);
    }, 16);

    return () => {
      clearTimeout(timer);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isOpen, getTriggerRect, applyGenieFrame]);

  // Run the CLOSE animation (suck into button: p goes from 0 to 1)
  const handleClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);

    const el = windowRef.current;
    if (!el) {
      onClose();
      return;
    }

    const modalRect = el.getBoundingClientRect();
    const triggerRect = getTriggerRect();

    const duration = 440; // ms
    const startTime = performance.now();

    // Pulse trigger button as the window gets sucked into it
    setTimeout(() => {
      const btn = document.querySelector('button[data-practice-trigger="true"]') ||
        Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Practice Playground') || b.textContent?.includes('Sandbox'));
      if (btn) {
        btn.classList.add('practice-trigger-pulse');
        setTimeout(() => btn.classList.remove('practice-trigger-pulse'), 650);
      }
    }, 320);

    const animateClose = (now) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      // Easing: easeInCubic / power
      const p = Math.pow(t, 1.55);

      applyGenieFrame(p, modalRect, triggerRect);

      if (t < 1) {
        rafRef.current = requestAnimationFrame(animateClose);
      } else {
        setIsClosing(false);
        onClose();
      }
    };

    rafRef.current = requestAnimationFrame(animateClose);
  }, [isClosing, getTriggerRect, applyGenieFrame, onClose]);

  // Handle ESC key to dismiss
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  // Prevent background scrolling while modal is active
  useEffect(() => {
    if (isOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className={`practice-modal-backdrop ${isClosing ? 'closing' : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        ref={windowRef}
        className={`practice-modal-window ${isClosing ? 'closing' : ''}`}
        role="dialog"
        aria-modal="true"
      >
        {/* Iridescent Cloth Folding Shimmer */}
        <div className="practice-cloth-shimmer" />

        {/* Bespoke Header Bar (Custom platform controls, no macOS traffic lights) */}
        <div className="practice-modal-header">
          {/* Left: Branding & Course Title */}
          <div className="practice-modal-left">
            <div className="practice-brand-badge">
              <Terminal size={14} className="practice-title-icon" />
              <span className="practice-title-text">{title}</span>
              {badge && <span className="practice-title-pill">{badge}</span>}
            </div>
          </div>

          {/* Right: Runtime Status & Custom Controls */}
          <div className="practice-modal-actions">
            <div className="practice-status-chip">
              <span className="practice-status-dot" />
              <span>Pyodide WASM</span>
            </div>

            {/* Sleek Custom Close Button */}
            <button
              type="button"
              className="practice-header-close-btn"
              onClick={handleClose}
              title="Close Playground (Esc)"
              aria-label="Close Playground"
            >
              <X size={13} />
              <span className="practice-close-text">Close</span>
              <kbd className="practice-esc-badge">Esc</kbd>
            </button>
          </div>
        </div>

        {/* Window Body: Full-Width Uncongested Practice Playground */}
        <div className="practice-modal-body">
          <Playground
            initialCode={initialCode}
            codingExercise={codingExercise}
            onVerifySuccess={onVerifySuccess}
            codeOverride={codeOverride}
            explanationOverride={explanationOverride}
            onTraceComplete={onTraceComplete}
            onCodeChange={onCodeChange}
          />
        </div>
      </div>
    </div>
  );
}
