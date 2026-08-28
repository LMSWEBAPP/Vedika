'use client';

import { useEffect, useRef } from 'react';
import './FluffyFurAvatar.css';

/**
 * FluffyFurAvatar — Ultra-Dense 14,000+ Fur Fiber 3D Procedural Monster
 *
 * Clean & Smooth Updates:
 *  1. Removed Eyelashes / Overhanging Wisps: Pure, clean, crisp glowing eyes.
 *  2. Ultra-Smooth Sine-Eased Blinking: Smooth continuous cubic deceleration with zero snaps.
 *  3. 14,000+ Ultra-Dense Procedural Fur Fibers with 5 depth passes.
 *  4. Luminous 3D Glass Eyes with glowing mint halo & bold white catchlights.
 */

// 2nd-order spring physics
function updateSpring(val, vel, target, stiffness, damping, dt) {
  const force = (target - val) * stiffness;
  const damp = -vel * damping;
  const nVel = vel + (force + damp) * dt;
  const nVal = val + nVel * dt;
  return [nVal, nVel];
}

// Generate 14,000+ ultra-dense, soft, plush fur fibers
function generateUltraDenseFur(count = 14000) {
  const strands = [];
  let seed = 2026;
  const rnd = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  for (let i = 0; i < count; i++) {
    const angle = rnd() * Math.PI * 2;
    const rDist = Math.pow(rnd(), 0.48);
    const r = 12 + rDist * 128; // Radius from 12 to 140
    const len = 8 + rnd() * 28; // Length
    const curl = (rnd() - 0.5) * 20; // Natural hair curl
    const width = 0.55 + rnd() * 0.95; // Ultra-fine micro-hair width
    const phase = rnd() * Math.PI * 2;

    // 5 Depth Layers
    let layer = 0;
    if (r > 122) layer = 4; // Outer fluffy halo fringe
    else if (r > 92) layer = 3; // Overcoat highlights
    else if (r > 62) layer = 2; // Main plush body
    else if (r > 32) layer = 1; // Deep undercoat
    else layer = 0; // Core root matrix

    strands.push({
      angle,
      r,
      len,
      curl,
      width,
      phase,
      layer,
    });
  }

  // Sort by layer so deep undercoat renders first, outer halo fringe on top
  strands.sort((a, b) => a.layer - b.layer);
  return strands;
}

export default function FluffyFurAvatar({
  expression = 'idle',
  glowColor = '#34D399',
  size = 270,
  mouseOffset = { x: 0, y: 0 },
  className = '',
  onClick,
}) {
  const canvasRef = useRef(null);
  const strandsRef = useRef(null);

  if (!strandsRef.current) {
    strandsRef.current = generateUltraDenseFur(14000);
  }

  const stateRef = useRef({
    currentExpr: expression,
    glowColor,
    targetMouse: mouseOffset,
    mouse: { x: 0, y: 0 },
    mouseVel: { x: 0, y: 0 },

    // Left Pupil Spring (x, y)
    LPupil: { x: 0, y: 0, vx: 0, vy: 0 },
    // Right Pupil Spring (x, y)
    RPupil: { x: 0, y: 0, vx: 0, vy: 0 },

    // Ultra-Smooth Blinking System
    blinkTimer: 2.6 + Math.random() * 2,
    blinkProgress: 1,
    isBlinking: false,
    isDoubleBlink: false,
    blinkPhase: 0,

    frameTime: 0,
  });

  useEffect(() => {
    const s = stateRef.current;
    s.currentExpr = expression;
    s.glowColor = glowColor;
    s.targetMouse = mouseOffset;
  }, [expression, glowColor, mouseOffset]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const VSIZE = 360;
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

      // ── 1. Spring Cursor Tracking ──
      const [mx, mvx] = updateSpring(s.mouse.x, s.mouseVel.x, s.targetMouse.x, 140, 16, dt);
      const [my, mvy] = updateSpring(s.mouse.y, s.mouseVel.y, s.targetMouse.y, 140, 16, dt);
      s.mouse.x = mx; s.mouseVel.x = mvx;
      s.mouse.y = my; s.mouseVel.y = mvy;

      // ── 2. Ultra-Smooth Continuous Sine-Eased Blinking ──
      s.blinkTimer -= dt;
      if (s.blinkTimer <= 0) {
        if (!s.isBlinking) {
          s.isBlinking = true;
          s.isDoubleBlink = Math.random() < 0.25;
          s.blinkPhase = 0;
          s.blinkTimer = 0.15; // Smooth 150ms single blink
        } else {
          if (s.isDoubleBlink && s.blinkPhase === 0) {
            // First blink completed -> brief open pause
            s.blinkPhase = 1;
            s.blinkProgress = 1;
            s.blinkTimer = 0.08;
          } else if (s.isDoubleBlink && s.blinkPhase === 1) {
            // Trigger second quick blink
            s.blinkPhase = 2;
            s.blinkTimer = 0.13;
          } else {
            // All blinks finished -> reset next blink cycle
            s.isBlinking = false;
            s.blinkProgress = 1;
            s.blinkTimer = 2.8 + Math.random() * 3.4;
          }
        }
      }

      if (s.isBlinking) {
        if (s.blinkPhase === 1) {
          s.blinkProgress = 1;
        } else {
          const duration = s.blinkPhase === 2 ? 0.13 : 0.15;
          const norm = Math.max(0, Math.min(1, s.blinkTimer / duration));
          // Pure sine bell curve for seamless deceleration
          const curve = Math.sin(norm * Math.PI);
          s.blinkProgress = 1 - Math.pow(curve, 1.7) * 0.96;
        }
      } else if (s.currentExpr === 'drowsy') {
        s.blinkProgress = 0.22 + Math.sin(t * 1.4) * 0.06;
      } else {
        s.blinkProgress = 1;
      }

      // ── 3. Expression Targets ──
      let targetPupilX = Math.max(-12, Math.min(12, s.mouse.x * 0.24));
      let targetPupilY = Math.max(-10, Math.min(10, s.mouse.y * 0.20));

      if (s.currentExpr === 'side_eye_left') {
        targetPupilX = -13;
        targetPupilY = 0;
      } else if (s.currentExpr === 'side_eye_right') {
        targetPupilX = 13;
        targetPupilY = 0;
      } else if (s.currentExpr === 'thinking') {
        targetPupilX = 8;
        targetPupilY = -9;
      }

      const [lpx, lpvx] = updateSpring(s.LPupil.x, s.LPupil.vx, targetPupilX, 160, 16, dt);
      const [lpy, lpvy] = updateSpring(s.LPupil.y, s.LPupil.vy, targetPupilY, 160, 16, dt);
      s.LPupil.x = lpx; s.LPupil.vx = lpvx;
      s.LPupil.y = lpy; s.LPupil.vy = lpvy;

      const [rpx, rpvx] = updateSpring(s.RPupil.x, s.RPupil.vx, targetPupilX, 160, 16, dt);
      const [rpy, rpvy] = updateSpring(s.RPupil.y, s.RPupil.vy, targetPupilY, 160, 16, dt);
      s.RPupil.x = rpx; s.RPupil.vx = rpvx;
      s.RPupil.y = rpy; s.RPupil.vy = rpvy;

      // ── 4. Canvas Render (Ultra-Dense 3D Monster) ──
      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const scale = (size / VSIZE) * DPR;
      ctx.scale(scale, scale);

      const cx = VSIZE / 2;
      const cy = VSIZE / 2;

      // Organic breathing rhythm & gentle 3D float
      const breathScale = 1 + Math.sin(t * 2.2) * 0.015;
      const floatY = Math.sin(t * 1.6) * 3.0;

      // ── A. Soft Ground Drop-Shadow ──
      const shadowW = 125 * breathScale;
      const shadowH = 24 * breathScale;
      const groundShadow = ctx.createRadialGradient(cx, cy + 145, 4, cx, cy + 145, shadowW);
      groundShadow.addColorStop(0, 'rgba(8, 22, 16, 0.48)');
      groundShadow.addColorStop(0.5, 'rgba(8, 22, 16, 0.20)');
      groundShadow.addColorStop(1, 'transparent');
      ctx.fillStyle = groundShadow;
      ctx.beginPath();
      ctx.ellipse(cx, cy + 145, shadowW, shadowH, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.translate(cx, cy + floatY);
      ctx.scale(breathScale, breathScale);

      // ── B. 3D Volumetric Spherical Core Base ──
      const coreR = 130;
      const coreGrad = ctx.createRadialGradient(-35, -40, 15, 0, 0, coreR);
      coreGrad.addColorStop(0, '#8CB896');   // Top-left highlight sage
      coreGrad.addColorStop(0.35, '#689674'); // Main body sage
      coreGrad.addColorStop(0.70, '#466E53'); // Shadow sage
      coreGrad.addColorStop(0.92, '#2C4C37'); // Core shadow
      coreGrad.addColorStop(1, '#1E3626');    // Deep occlusion edge

      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(0, 0, coreR, 0, Math.PI * 2);
      ctx.fill();

      // ── C. 14,000+ Ultra-Dense Procedural Fur Fibers ──
      drawUltraDenseFur(ctx, strandsRef.current, t);

      // ── D. Eye Sockets (Furrow Ambient Occlusion Depth) ──
      const eyeParallaxX = s.mouse.x * 0.04;
      const eyeParallaxY = s.mouse.y * 0.04;
      const eyeSpacing = 42;
      const eyeY = 8 + eyeParallaxY;
      const eyeRadius = 38;

      // Left & Right Socket Shadows
      drawEyeSocketShadow(ctx, -eyeSpacing + eyeParallaxX, eyeY, eyeRadius + 10);
      drawEyeSocketShadow(ctx, eyeSpacing + eyeParallaxX, eyeY, eyeRadius + 10);

      // ── E. Luminous 3D Glass Eyes (Clean, no lashes) ──
      // Left Eye
      drawProcedural3DEye(
        ctx,
        -eyeSpacing + eyeParallaxX,
        eyeY,
        eyeRadius,
        s.LPupil.x,
        s.LPupil.y,
        s.blinkProgress,
        s.currentExpr === 'happy'
      );

      // Right Eye
      drawProcedural3DEye(
        ctx,
        eyeSpacing + eyeParallaxX,
        eyeY,
        eyeRadius,
        s.RPupil.x,
        s.RPupil.y,
        s.blinkProgress,
        s.currentExpr === 'happy'
      );

      ctx.restore(); // Exit Body Translate
      ctx.restore(); // Exit Canvas Scale

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size]);

  return (
    <div
      className={`fluffy-avatar-container ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
      }}
      onClick={onClick}
    >
      <canvas
        ref={canvasRef}
        className="fluffy-avatar-canvas"
        style={{ width: `${size}px`, height: `${size}px` }}
      />
    </div>
  );
}

/**
 * Draw 14,000+ Ultra-Dense, Soft Curved Fur Fibers across 5 Depth Passes
 */
function drawUltraDenseFur(ctx, strands, t) {
  ctx.save();
  ctx.lineCap = 'round';

  const layers = [[], [], [], [], []];
  for (let i = 0; i < strands.length; i++) {
    layers[strands[i].layer].push(strands[i]);
  }

  // Pass 0: Core Root Matrix (Deep Forest Sage Shadows)
  ctx.strokeStyle = 'rgba(28, 50, 36, 0.70)';
  ctx.beginPath();
  for (let i = 0; i < layers[0].length; i++) {
    renderStrandPath(ctx, layers[0][i], t, 1.25);
  }
  ctx.stroke();

  // Pass 1: Deep Undercoat (Volumetric Body Fur)
  ctx.strokeStyle = 'rgba(56, 90, 68, 0.72)';
  ctx.beginPath();
  for (let i = 0; i < layers[1].length; i++) {
    renderStrandPath(ctx, layers[1][i], t, 1.10);
  }
  ctx.stroke();

  // Pass 2: Main Plush Body (Rich Sage Green)
  ctx.strokeStyle = 'rgba(92, 138, 104, 0.75)';
  ctx.beginPath();
  for (let i = 0; i < layers[2].length; i++) {
    renderStrandPath(ctx, layers[2][i], t, 1.0);
  }
  ctx.stroke();

  // Pass 3: Overcoat Highlights (Soft Mint Tufts)
  ctx.strokeStyle = 'rgba(152, 202, 162, 0.80)';
  ctx.beginPath();
  for (let i = 0; i < layers[3].length; i++) {
    renderStrandPath(ctx, layers[3][i], t, 0.95);
  }
  ctx.stroke();

  // Pass 4: Outer Fluff Halo Fringe (Feathered, Cloud-Like Glowing Hairs)
  ctx.strokeStyle = 'rgba(195, 238, 204, 0.88)';
  ctx.beginPath();
  for (let i = 0; i < layers[4].length; i++) {
    renderStrandPath(ctx, layers[4][i], t, 0.90);
  }
  ctx.stroke();

  ctx.restore();
}

function renderStrandPath(ctx, s, t, widthMult) {
  const cos = Math.cos(s.angle);
  const sin = Math.sin(s.angle);

  // Root position on spherical body
  const rx = cos * s.r;
  const ry = sin * s.r;

  // Gentle harmonic micro-flutter
  const flutter = Math.sin(t * 3.4 + s.phase) * 2.5;
  const curlX = (-sin) * (s.curl + flutter);
  const curlY = cos * (s.curl + flutter);

  // Tip radiating outwards
  const tx = cos * (s.r + s.len) + curlX;
  const ty = sin * (s.r + s.len) + curlY;

  // Control point for natural curved hair strand
  const cx = rx + (tx - rx) * 0.5 + curlX * 0.5;
  const cy = ry + (ty - ry) * 0.5 + curlY * 0.5;

  ctx.lineWidth = s.width * widthMult;
  ctx.moveTo(rx, ry);
  ctx.quadraticCurveTo(cx, cy, tx, ty);
}

/**
 * Draw Eye Socket Occlusion Shadow to deeply embed eyes into the plush fur
 */
function drawEyeSocketShadow(ctx, x, y, r) {
  const socketGrad = ctx.createRadialGradient(x, y, r * 0.65, x, y, r);
  socketGrad.addColorStop(0, 'rgba(10, 26, 18, 0.85)');
  socketGrad.addColorStop(0.6, 'rgba(18, 40, 26, 0.48)');
  socketGrad.addColorStop(1, 'transparent');

  ctx.fillStyle = socketGrad;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Draw 3D Luminous Glass Eye (Clean, no lashes, ultra-smooth blink)
 */
function drawProcedural3DEye(ctx, ex, ey, radius, px, py, blinkProgress, isHappy) {
  ctx.save();
  ctx.translate(ex, ey);

  const eyeH = Math.max(radius * 0.04, radius * blinkProgress);

  // 1. Clip to eyelid aperture (smooth continuous ellipse)
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 0, radius, eyeH, 0, 0, Math.PI * 2);
  ctx.clip();

  // 2. Luminous Glowing Mint-White Sclera Halo Ring
  const haloGrad = ctx.createRadialGradient(0, 0, radius * 0.45, 0, 0, radius);
  haloGrad.addColorStop(0, '#FFFFFF');
  haloGrad.addColorStop(0.35, '#F0FDF4');
  haloGrad.addColorStop(0.70, '#A7F3D0');
  haloGrad.addColorStop(0.92, '#6EE7B7');
  haloGrad.addColorStop(1, 'rgba(52, 211, 153, 0.4)');

  ctx.fillStyle = haloGrad;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();

  // Ambient Outward Mint Bloom Glow
  ctx.shadowColor = '#6EE7B7';
  ctx.shadowBlur = 18;
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(0, 0, radius - 1.8, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // 3. Deep 3D Obsidian-Emerald Glass Iris Dome
  const pupilRadius = radius * 0.70;
  const irisGrad = ctx.createRadialGradient(
    px * 0.5 - pupilRadius * 0.25,
    py * 0.5 - pupilRadius * 0.25,
    2,
    px,
    py,
    pupilRadius
  );
  irisGrad.addColorStop(0, '#163E2D');   // Top subtle emerald depth
  irisGrad.addColorStop(0.35, '#0B2318');
  irisGrad.addColorStop(0.75, '#05140D');
  irisGrad.addColorStop(1, '#000805');   // Pure deep obsidian base

  ctx.fillStyle = irisGrad;
  ctx.beginPath();
  ctx.arc(px, py, pupilRadius, 0, Math.PI * 2);
  ctx.fill();

  // Subtle 3D Iris Limbal Ring
  ctx.strokeStyle = 'rgba(167, 243, 208, 0.45)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(px, py, pupilRadius - 0.6, 0, Math.PI * 2);
  ctx.stroke();

  // 4. White Eyeballs (High-Gloss Catchlights)
  // Primary Specular (Large Pure White Catchlight - Top-Right)
  const bigSpecX = px + pupilRadius * 0.28;
  const bigSpecY = py - pupilRadius * 0.28;
  const bigSpecR = pupilRadius * 0.38;

  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
  ctx.shadowBlur = 5;
  ctx.beginPath();
  ctx.arc(bigSpecX, bigSpecY, bigSpecR, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Secondary Specular (Smaller Pure White Catchlight - Bottom-Left)
  const smallSpecX = px - pupilRadius * 0.32;
  const smallSpecY = py + pupilRadius * 0.32;
  const smallSpecR = pupilRadius * 0.18;

  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(smallSpecX, smallSpecY, smallSpecR, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore(); // Exit Eyelid Clip
  ctx.restore(); // Exit Eye Translate
}
