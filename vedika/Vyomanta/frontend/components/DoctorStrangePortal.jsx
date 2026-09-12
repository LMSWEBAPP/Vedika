'use client';

import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';

/**
 * BlackHolePortal (Interactive Canvas Particle Black Hole)
 * Based on CodePen: https://codepen.io/StarKnightt/pen/VYvZeom
 * Features:
 * - 2,500 orbiting star particles with trail interpolation
 * - Default state: hover ring (collapse = true), particles concentrate in a tight glowing accretion ring
 * - Expansion burst: expanse = true, particles burst outward dynamically
 * - Smooth returning / fading
 * - Transparent background gradient + pitch-black event horizon void in the center
 * - Imperative controls: triggerExpanse(), triggerCollapse(), reset()
 */
const DoctorStrangePortal = forwardRef(function DoctorStrangePortal(
  {
    size = 280,
    className = '',
    style = {},
    initialMode = 'collapse', // 'collapse' (hover ring), 'normal', or 'expanse'
    showCenterLabel = false,
  },
  forwardedRef
) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const isVisibleRef = useRef(true);

  // State flags for particle behaviors
  const stateRef = useRef({
    collapse: initialMode === 'collapse',
    expanse: initialMode === 'expanse',
    returning: false,
  });

  // Expose imperative handle for external animations (GSAP / page controllers)
  useImperativeHandle(forwardedRef, () => ({
    triggerExpanse: () => {
      stateRef.current.collapse = false;
      stateRef.current.expanse = true;
      stateRef.current.returning = false;
    },
    triggerCollapse: () => {
      stateRef.current.collapse = true;
      stateRef.current.expanse = false;
      stateRef.current.returning = false;
    },
    triggerReturn: () => {
      stateRef.current.expanse = false;
      stateRef.current.returning = true;
    },
    reset: () => {
      stateRef.current.collapse = true;
      stateRef.current.expanse = false;
      stateRef.current.returning = false;
    },
    getElement: () => containerRef.current,
  }));

  // Intersection Observer to suspend animation when offscreen
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        isVisibleRef.current = entry.isIntersecting;
      },
      { threshold: 0.01 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 2, 2.5) : 2;
    // Expansive canvas view area for high-res star particles without boundary box cutoffs
    const viewSize = 900;
    const cw = viewSize;
    const ch = viewSize;

    // High resolution canvas buffer for crisp, non-pixelated rendering
    canvas.width = Math.ceil(cw * dpr);
    canvas.height = Math.ceil(ch * dpr);
    ctx.scale(dpr, dpr);

    // Dynamic portal ring size proportional to size prop (~0.432 ratio: size 250 -> 108px, size 340 -> 147px)
    const ringRadius = Math.max(70, Math.round((size / 250) * 108));
    const maxorbit = ringRadius;
    const centerx = cw / 2;
    const centery = ch / 2;

    const startTime = Date.now();
    let currentTime = 0;
    const stars = [];
    const totalStars = Math.min(2800, Math.round(2200 * (ringRadius / 108)));

    function rotate(cx, cy, x, y, angle) {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const nx = cos * (x - cx) + sin * (y - cy) + cx;
      const ny = cos * (y - cy) - sin * (x - cx) + cy;
      return [nx, ny];
    }

    class Star {
      constructor(id) {
        this.id = id;
        const r1 = Math.random() * (maxorbit / 2) + 1;
        const r2 = Math.random() * (maxorbit / 2) + maxorbit;
        this.orbital = (r1 + r2) / 2;

        this.x = centerx;
        this.y = centery + this.orbital;
        this.yOrigin = centery + this.orbital;

        this.speed = (Math.floor(Math.random() * 2.5) + 1.5) * (Math.PI / 180);
        this.rotation = 0;
        this.startRotation = (Math.floor(Math.random() * 360) + 1) * (Math.PI / 180);

        this.collapseBonus = this.orbital - maxorbit * 0.7;
        if (this.collapseBonus < 0) {
          this.collapseBonus = 0;
        }

        const normDist = this.orbital / maxorbit;
        this.baseAlpha = Math.max(0.15, 1 - normDist * 0.85);

        // Multi-color star sparks (Brilliant white core, cyan, gold, and violet stardust)
        const randHue = Math.random();
        if (randHue < 0.55) {
          this.rgb = '255, 255, 255';
        } else if (randHue < 0.75) {
          this.rgb = '165, 243, 252'; // Cyan starlight
        } else if (randHue < 0.90) {
          this.rgb = '254, 240, 138'; // Golden ember
        } else {
          this.rgb = '216, 180, 254'; // Cosmic lavender
        }

        this.hoverPos = centery + maxorbit * 0.38 + this.collapseBonus * 0.65;
        // Large blast radius proportional to portal size, safely capped to avoid canvas boundary clipping
        this.blastMaxDist = Math.min(410, (maxorbit * 2.2) + Math.random() * 50);
        this.expansePos = centery + this.blastMaxDist;

        this.prevR = this.startRotation;
        this.prevX = this.x;
        this.prevY = this.y;
        this.originalY = this.yOrigin;
      }

      draw() {
        const { collapse, expanse, returning } = stateRef.current;
        let currentAlpha = this.baseAlpha;

        if (!expanse && !returning) {
          this.rotation = this.startRotation + currentTime * this.speed;
          if (!collapse) {
            // Standard loose orbit
            if (this.y > this.yOrigin) {
              this.y -= 2.5;
            }
            if (this.y < this.yOrigin - 4) {
              this.y += (this.yOrigin - this.y) / 10;
            }
          } else {
            // Hover state: collapsed tight ring
            if (this.y > this.hoverPos) {
              this.y -= (this.hoverPos - this.y) / -5;
            }
            if (this.y < this.hoverPos - 4) {
              this.y += 2.5;
            }
          }
        } else if (expanse && !returning) {
          // Expanse: stars stream outward rapidly and smoothly fade out as they reach the blast edge
          this.rotation = this.startRotation + currentTime * (this.speed * 0.65);
          if (this.y < this.expansePos) {
            this.y += (this.expansePos - this.y) * 0.042;
          }

          // Smoothly fade out particles as they approach the blast boundary (NO sharp edges)
          const distFromCenter = Math.abs(this.y - centery);
          const fadeStart = maxorbit * 1.2;
          if (distFromCenter > fadeStart) {
            const progress = (distFromCenter - fadeStart) / (this.blastMaxDist - fadeStart);
            currentAlpha = Math.max(0, this.baseAlpha * (1 - Math.min(1, progress)));
          }
        } else if (returning) {
          // Returning to original orbit
          this.rotation = this.startRotation + currentTime * this.speed;
          if (Math.abs(this.y - this.originalY) > 2) {
            this.y += (this.originalY - this.y) / 45;
          } else {
            this.y = this.originalY;
            this.yOrigin = this.originalY;
          }
        }

        if (currentAlpha <= 0.01) return;

        // Draw rotated star streak
        ctx.save();
        const colStr = `rgba(${this.rgb}, ${currentAlpha.toFixed(2)})`;
        ctx.fillStyle = colStr;
        ctx.strokeStyle = colStr;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        const oldPos = rotate(centerx, centery, this.prevX, this.prevY, -this.prevR);
        ctx.moveTo(oldPos[0], oldPos[1]);
        ctx.translate(centerx, centery);
        ctx.rotate(this.rotation);
        ctx.translate(-centerx, -centery);
        ctx.lineTo(this.x, this.y);
        ctx.stroke();
        ctx.restore();

        this.prevR = this.rotation;
        this.prevX = this.x;
        this.prevY = this.y;
      }
    }

    // Initialize stars
    for (let i = 0; i < totalStars; i++) {
      stars.push(new Star(i));
    }

    // Main animation loop
    const loop = () => {
      if (!isVisibleRef.current) {
        animFrameRef.current = requestAnimationFrame(loop);
        return;
      }

      const now = Date.now();
      currentTime = (now - startTime) / 50;

      // Trail decay: subtle transparent erase
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
      ctx.fillRect(0, 0, cw, ch);
      ctx.restore();

      // Render stars with screen/lighter blending for luminous bloom
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < stars.length; i++) {
        stars[i].draw();
      }
      ctx.restore();

      // Draw the central pitch-black Event Horizon void (without any white ring outline)
      if (!stateRef.current.expanse) {
        const eventHorizonR = maxorbit * 0.32;
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerx, centery, eventHorizonR, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.98)';
        ctx.shadowColor = 'rgba(0, 0, 0, 1)';
        ctx.shadowBlur = 14;
        ctx.fill();
        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [size]);

  // CSS size is maintained at 900px centered, with zero pixel stretching
  const canvasDisplaySize = 900;

  return (
    <div
      ref={containerRef}
      className={`blackhole-portal-container ${className}`}
      style={{
        position: 'absolute',
        width: `${size}px`,
        height: `${size}px`,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'visible',
        willChange: 'transform, opacity',
        ...style,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: `${canvasDisplaySize}px`,
          height: `${canvasDisplaySize}px`,
          pointerEvents: 'none',
          display: 'block',
          willChange: 'opacity',
        }}
      />
      {showCenterLabel && (
        <div
          style={{
            position: 'absolute',
            color: '#666',
            fontFamily: 'serif',
            fontSize: '14px',
            letterSpacing: '2px',
            pointerEvents: 'none',
          }}
        >
          ENTER
        </div>
      )}
    </div>
  );
});

export default DoctorStrangePortal;
