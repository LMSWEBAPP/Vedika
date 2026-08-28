'use client';

import { useEffect, useRef } from 'react';
import './GlowOvalAvatar.css';

/**
 * GlowOvalAvatar — Ultra-Smooth, Cute & Expressive Interactive Avatar
 *
 * Design:
 *  1. Spring-Damped Elastic Physics: Organic jelly-like morphing between expressions.
 *  2. Side-Eye Expression:
 *     - Eye shape smoothly morphs into pure solid white CIRCLES (w: 48, h: 48).
 *     - No eyeballs / no pupils — pure glowing white circles shifted sideways.
 *  3. All Other Expressions:
 *     - Pure solid white CAPSULES (#FFFFFF) with soft bloom.
 *  4. Natural Life Behaviors:
 *     - Cute organic double-blinks and single-blinks with smooth eyelid deceleration.
 *     - Gentle breathing rhythm pulse (0.6px subtle breath).
 *     - Micro-saccades (subtle observant idle eye shifts).
 *     - Curious head/gaze tilt when tracking the cursor.
 *  5. Sleeping Expression ('drowsy'):
 *     - Distinct horizontal sleeping eyes (-   -) with generous gap and slow breathing.
 *  6. Pure Soft Box-Shadow Oval:
 *     - Clean borderless perimeter with diffused ambient glow and transparent interior.
 */

// Base targets for each expression (center x, center y, width, height, rotation angle)
const EXPR_TARGETS = {
  idle: {
    L: { x: -28, y: -8,  w: 28, h: 58, a: 0 },
    R: { x: 24,  y: -8,  w: 26, h: 50, a: 0 },
  },
  // Circular pure solid white eyes shifted LEFT (no eyeballs)
  side_eye_left: {
    L: { x: -38, y: -4,  w: 48, h: 48, a: 0 },
    R: { x: 12,  y: -4,  w: 48, h: 48, a: 0 },
  },
  // Circular pure solid white eyes shifted RIGHT (no eyeballs)
  side_eye_right: {
    L: { x: -12, y: -4,  w: 48, h: 48, a: 0 },
    R: { x: 38,  y: -4,  w: 48, h: 48, a: 0 },
  },
  listening: {
    L: { x: -26, y: -4,  w: 28, h: 66, a: 0 },
    R: { x: 26,  y: -4,  w: 28, h: 66, a: 0 },
  },
  excited: {
    L: { x: -30, y: 0,   w: 36, h: 78, a: 0 },
    R: { x: 30,  y: 0,   w: 36, h: 78, a: 0 },
  },
  thinking: {
    L: { x: -26, y: -8,  w: 28, h: 60, a: 0.52 },
    R: { x: 20,  y: -8,  w: 28, h: 60, a: 0.52 },
  },
  searching: {
    L: { x: 8,   y: -6,  w: 28, h: 58, a: 0 },
    R: { x: 44,  y: -6,  w: 26, h: 50, a: 0 },
  },
  drowsy: {
    // Sleeping eyes with clean visible gap
    L: { x: -32, y: 6,   w: 18, h: 40, a: Math.PI / 2 },
    R: { x: 32,  y: 6,   w: 18, h: 40, a: Math.PI / 2 },
  },
  confused: {
    L: { x: -26, y: -10, w: 32, h: 66, a: -0.08 },
    R: { x: 26,  y: 6,   w: 24, h: 42, a: 0.48 },
  },
  happy: {
    L: { x: -28, y: -4,  w: 34, h: 68, a: 0 },
    R: { x: 28,  y: -4,  w: 34, h: 68, a: 0 },
  },
};

function getShortestAngleDiff(cur, target) {
  let diff = (target - cur) % (Math.PI * 2);
  if (diff > Math.PI) diff -= Math.PI * 2;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

// Spring physics step
function updateSpring(val, vel, target, stiffness, damping, dt) {
  const force = (target - val) * stiffness;
  const damp = -vel * damping;
  const nVel = vel + (force + damp) * dt;
  const nVal = val + nVel * dt;
  return [nVal, nVel];
}

export default function GlowOvalAvatar({
  expression = 'idle',
  glowColor = '#34D399',
  featureColor = '#FFFFFF',
  size = 270,
  mouseOffset = { x: 0, y: 0 },
  className = '',
  onClick,
}) {
  const canvasRef = useRef(null);

  const stateRef = useRef({
    currentExpr: expression,
    glowColor,
    featureColor,
    targetMouse: mouseOffset,
    mouse: { x: 0, y: 0 },
    mouseVel: { x: 0, y: 0 },

    // Left Eye Spring State (val, vel)
    L: {
      x: EXPR_TARGETS[expression]?.L.x ?? -28, vx: 0,
      y: EXPR_TARGETS[expression]?.L.y ?? -8,  vy: 0,
      w: EXPR_TARGETS[expression]?.L.w ?? 28,  vw: 0,
      h: EXPR_TARGETS[expression]?.L.h ?? 58,  vh: 0,
      a: EXPR_TARGETS[expression]?.L.a ?? 0,   va: 0,
    },

    // Right Eye Spring State (val, vel)
    R: {
      x: EXPR_TARGETS[expression]?.R.x ?? 24,  vx: 0,
      y: EXPR_TARGETS[expression]?.R.y ?? -8,  vy: 0,
      w: EXPR_TARGETS[expression]?.R.w ?? 26,  vw: 0,
      h: EXPR_TARGETS[expression]?.R.h ?? 50,  vh: 0,
      a: EXPR_TARGETS[expression]?.R.a ?? 0,   va: 0,
    },

    // Organic Blinking System (with cute double-blinks)
    blinkTimer: 2.2 + Math.random() * 2.5,
    blinkProgress: 1,
    isBlinking: false,
    blinkPhase: 0, // 0 = first blink, 1 = pause, 2 = second blink
    isDoubleBlink: false,

    // Micro-Saccades (subtle observant idle eye shifts)
    saccadeTimer: 1.5 + Math.random() * 2,
    saccadeOffset: { x: 0, y: 0 },

    frameTime: 0,
  });

  useEffect(() => {
    const s = stateRef.current;
    s.currentExpr = expression;
    s.glowColor = glowColor;
    s.featureColor = featureColor;
    s.targetMouse = mouseOffset;
  }, [expression, glowColor, featureColor, mouseOffset]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const VSIZE = 300;
    const DPR = Math.min(typeof window !== 'undefined' ? (window.devicePixelRatio || 2) : 2, 2.5);
    canvas.width = size * DPR;
    canvas.height = size * DPR;

    let animId;
    let lastTime = performance.now();

    const render = (now) => {
      const dt = Math.min((now - lastTime) / 1000, 0.035);
      lastTime = now;
      const s = stateRef.current;
      s.frameTime += dt;
      const t = s.frameTime;

      // ── 1. Smooth Spring-Damped Cursor Tracking ──
      const [mx, mvx] = updateSpring(s.mouse.x, s.mouseVel.x, s.targetMouse.x, 140, 16, dt);
      const [my, mvy] = updateSpring(s.mouse.y, s.mouseVel.y, s.targetMouse.y, 140, 16, dt);
      s.mouse.x = mx; s.mouseVel.x = mvx;
      s.mouse.y = my; s.mouseVel.y = mvy;

      // ── 2. Micro-Saccades (Idle Life Glances) ──
      s.saccadeTimer -= dt;
      if (s.saccadeTimer <= 0) {
        s.saccadeTimer = 2.0 + Math.random() * 3.0;
        if (Math.abs(s.targetMouse.x) < 5 && Math.abs(s.targetMouse.y) < 5) {
          s.saccadeOffset.x = (Math.random() - 0.5) * 3.5;
          s.saccadeOffset.y = (Math.random() - 0.5) * 2.5;
        } else {
          s.saccadeOffset.x = 0;
          s.saccadeOffset.y = 0;
        }
      }

      // ── 3. Cute Natural Blinking (with Double-Blinks) ──
      s.blinkTimer -= dt;
      if (s.blinkTimer <= 0) {
        if (!s.isBlinking) {
          s.isBlinking = true;
          s.isDoubleBlink = Math.random() < 0.28; // 28% chance of cute double blink
          s.blinkPhase = 0;
          s.blinkTimer = 0.11;
        } else {
          if (s.isDoubleBlink && s.blinkPhase === 0) {
            // First blink finished -> brief open pause
            s.blinkPhase = 1;
            s.blinkProgress = 1;
            s.blinkTimer = 0.07;
          } else if (s.isDoubleBlink && s.blinkPhase === 1) {
            // Start second blink
            s.blinkPhase = 2;
            s.blinkTimer = 0.09;
          } else {
            // All blinks finished -> reset next blink timer
            s.isBlinking = false;
            s.blinkProgress = 1;
            s.blinkTimer = 2.6 + Math.random() * 3.4;
          }
        }
      }

      if (s.isBlinking) {
        if (s.blinkPhase === 1) {
          s.blinkProgress = 1;
        } else {
          const duration = s.blinkPhase === 2 ? 0.09 : 0.11;
          const progress = Math.abs((s.blinkTimer / duration) - 0.5) * 2;
          s.blinkProgress = Math.max(0.04, Math.pow(progress, 1.4));
        }
      } else {
        s.blinkProgress = 1;
      }

      // ── 4. Target Calculation with Organic Breathing & Tilt ──
      const target = EXPR_TARGETS[s.currentExpr] ?? EXPR_TARGETS.idle;
      const isSleeping = s.currentExpr === 'drowsy';

      // Subtle breathing pulse (gentler in sleep mode)
      const breathFreq = isSleeping ? 1.2 : 2.0;
      const breathAmp  = isSleeping ? 1.2 : 0.7;
      const breathPulse = Math.sin(t * breathFreq) * breathAmp;

      // Curious gaze tilt based on horizontal cursor gaze
      const gazeTilt = s.mouse.x * 0.0018;

      // Target eye parameters with organic dynamics
      const TL = {
        x: target.L.x,
        y: target.L.y,
        w: target.L.w,
        h: target.L.h + breathPulse,
        a: target.L.a + gazeTilt,
      };

      const TR = {
        x: target.R.x,
        y: target.R.y,
        w: target.R.w,
        h: target.R.h + breathPulse,
        a: target.R.a + gazeTilt,
      };

      // ── 5. Spring Physics Update (Smooth, Jelly Overshoot) ──
      const STIFFNESS = 135;
      const DAMPING = 15.5;

      // Left Eye Springs
      const [lx, lvx] = updateSpring(s.L.x, s.L.vx, TL.x, STIFFNESS, DAMPING, dt);
      const [ly, lvy] = updateSpring(s.L.y, s.L.vy, TL.y, STIFFNESS, DAMPING, dt);
      const [lw, lvw] = updateSpring(s.L.w, s.L.vw, TL.w, STIFFNESS, DAMPING, dt);
      const [lh, lvh] = updateSpring(s.L.h, s.L.vh, TL.h, STIFFNESS, DAMPING, dt);
      const targetLA = s.L.a + getShortestAngleDiff(s.L.a, TL.a);
      const [la, lva] = updateSpring(s.L.a, s.L.va, targetLA, STIFFNESS, DAMPING, dt);

      s.L.x = lx; s.L.vx = lvx;
      s.L.y = ly; s.L.vy = lvy;
      s.L.w = lw; s.L.vw = lvw;
      s.L.h = lh; s.L.vh = lvh;
      s.L.a = la; s.L.va = lva;

      // Right Eye Springs
      const [rx, rvx] = updateSpring(s.R.x, s.R.vx, TR.x, STIFFNESS, DAMPING, dt);
      const [ry, rvy] = updateSpring(s.R.y, s.R.vy, TR.y, STIFFNESS, DAMPING, dt);
      const [rw, rvw] = updateSpring(s.R.w, s.R.vw, TR.w, STIFFNESS, DAMPING, dt);
      const [rh, rvh] = updateSpring(s.R.h, s.R.vh, TR.h, STIFFNESS, DAMPING, dt);
      const targetRA = s.R.a + getShortestAngleDiff(s.R.a, TR.a);
      const [ra, rva] = updateSpring(s.R.a, s.R.va, targetRA, STIFFNESS, DAMPING, dt);

      s.R.x = rx; s.R.vx = rvx;
      s.R.y = ry; s.R.vy = rvy;
      s.R.w = rw; s.R.vw = rvw;
      s.R.h = rh; s.R.vh = rvh;
      s.R.a = ra; s.R.va = rva;

      // ── 6. Canvas Render (Sub-Pixel Precision & Luminous Bloom) ──
      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const scale = (size / VSIZE) * DPR;
      ctx.scale(scale, scale);

      const cx = VSIZE / 2;
      const cy = VSIZE / 2;

      const cursorX = s.mouse.x * 0.16 + s.saccadeOffset.x;
      const cursorY = s.mouse.y * 0.14 + s.saccadeOffset.y;

      // ── Left Eye (Morphed solid white eye) ──
      drawSolidEye(
        ctx,
        cx + s.L.x + cursorX,
        cy + s.L.y + cursorY,
        s.L.w,
        s.L.h,
        s.L.a,
        s.blinkProgress,
        s.featureColor
      );

      // ── Right Eye (Morphed solid white eye) ──
      drawSolidEye(
        ctx,
        cx + s.R.x + cursorX,
        cy + s.R.y + cursorY,
        s.R.w,
        s.R.h,
        s.R.a,
        s.blinkProgress,
        s.featureColor
      );

      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size]);

  const ovalHeight = Math.round(size * 0.88);

  return (
    <div
      className={`glow-oval-avatar-container ${className}`}
      style={{
        width: `${size}px`,
        height: `${ovalHeight}px`,
        boxShadow: `0 0 22px 4px ${glowColor}48, inset 0 0 24px 0 ${glowColor}18`,
      }}
      onClick={onClick}
    >
      <canvas
        ref={canvasRef}
        className="glow-oval-avatar-canvas"
        style={{ width: `${size}px`, height: `${size}px` }}
      />
    </div>
  );
}

/**
 * Draw Eye:
 *  - Standard Expressions: Pure solid white capsule with soft bloom
 *  - Side-Eye Expression: Pure solid white glowing circle (w: 48, h: 48, radius: 24)
 */
function drawSolidEye(ctx, cx, cy, w, h, angle, blinkScale, color) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.scale(1, blinkScale);

  // Soft luminous eye bloom
  ctx.shadowColor = 'rgba(255, 255, 255, 0.75)';
  ctx.shadowBlur = 12;
  ctx.fillStyle = color;

  const radius = Math.min(w, h) / 2;
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, radius);
  ctx.fill();

  ctx.restore();
}
