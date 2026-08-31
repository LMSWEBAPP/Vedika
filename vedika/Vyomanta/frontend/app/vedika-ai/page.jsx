'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Sparkle } from 'lucide-react';
import ThreeDAvatar from '@/components/ThreeDAvatar';
import './vedika-ai.css';

const IDLE_EXPRESSIONS = ['idle', 'happy', 'idle', 'thinking', 'happy', 'idle'];

const AI_ASSISTANTS = [
  {
    id: 'ask',
    title: 'Ask Vedika',
    desc: 'Your interactive general AI tutor for courses, syllabus explanations, and visual flashcards.',
    actionText: 'Start Chatting',
    url: '/vedika-ai/ask',
    glowColor: '#E879F9',
    modelColor: '#D946EF',
    accentClass: 'ask',
  },
  {
    id: 'code',
    title: 'Code with Vedika',
    desc: 'Your dedicated programming companion to debug syntax, write tests, and optimize clean code structures.',
    actionText: 'Start Coding',
    url: '/vedika-ai/code',
    glowColor: '#38BDF8',
    modelColor: '#0284C7',
    accentClass: 'code',
  },
  {
    id: 'viva',
    title: 'Viva & Interview',
    desc: 'Practice rigorous voice-driven academic viva examinations and technical job interview prep with Vedika AI.',
    actionText: 'Start Interview',
    url: '/viva-interview',
    glowColor: '#A3E635',
    modelColor: '#65A30D',
    accentClass: 'viva',
  },
];

// ── Fast 2D Divergence-Free Curl Noise Generator ────────────────────
function fastCurlNoise(x, y, time) {
  const f1 = 0.0035;
  const f2 = 0.0075;
  const t1 = time * 0.75;
  const t2 = time * 1.35;

  const vx = -f1 * Math.sin(x * f1 + t1) * Math.sin(y * f1 - t1) - f2 * 0.45 * Math.cos(x * f2 - y * f2 + t2);
  const vy = -f1 * Math.cos(x * f1 + t1) * Math.cos(y * f1 - t1) - f2 * 0.45 * Math.cos(x * f2 - y * f2 + t2);

  return { x: vx * 1100, y: vy * 1100 };
}

// ── Fast Cubic Bezier ───────────────────────────────────────────────
function cubicBezier(p0, p1, p2, p3, t) {
  const omt = 1 - t;
  const omt2 = omt * omt;
  const t2 = t * t;
  return omt2 * omt * p0 + 3 * omt2 * t * p1 + 3 * omt * t2 * p2 + t2 * t * p3;
}

// ── Pre-rendered GPU Glow Sprite Textures ───────────────────────────
function createGlowSprite(r, g, b, isWhiteCore = false) {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const center = size / 2;

  const grad = ctx.createRadialGradient(center, center, 0, center, center, center);
  grad.addColorStop(0, `rgba(255, 255, 255, 1)`);
  grad.addColorStop(0.22, `rgba(${r}, ${g}, ${b}, 0.95)`);
  grad.addColorStop(0.55, `rgba(${r}, ${g}, ${b}, 0.35)`);
  grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(center, center, center, 0, Math.PI * 2);
  ctx.fill();

  return canvas;
}

export default function VedikaAIHub() {
  const router = useRouter();
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const singularityRef = useRef(null);
  const cardRefs = useRef({});
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const [mouseOffsets, setMouseOffsets] = useState({
    ask: { x: 0, y: 0 },
    code: { x: 0, y: 0 },
    viva: { x: 0, y: 0 },
  });
  const [hoveredCard, setHoveredCard] = useState(null);

  // Avatar expressions
  const [avatarExprs, setAvatarExprs] = useState({
    ask: 'happy',
    code: 'happy',
    viva: 'happy',
  });

  // Smooth mouse move tracking with 3D parallax
  const lastMouseUpdateRef = useRef(0);
  const handleMouseMove = useCallback((e) => {
    mouseRef.current.targetX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseRef.current.targetY = (e.clientY / window.innerHeight - 0.5) * 2;

    const now = performance.now();
    if (now - lastMouseUpdateRef.current > 50) {
      lastMouseUpdateRef.current = now;
      const nextOffsets = {};
      AI_ASSISTANTS.forEach((ast) => {
        const el = cardRefs.current[ast.id];
        if (el) {
          const rect = el.getBoundingClientRect();
          nextOffsets[ast.id] = {
            x: ((e.clientX - (rect.left + rect.width / 2)) / rect.width) * 45,
            y: ((e.clientY - (rect.top + rect.height / 2)) / rect.height) * 45,
          };
        } else {
          nextOffsets[ast.id] = { x: 0, y: 0 };
        }
      });
      setMouseOffsets(nextOffsets);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  // Expression cycling
  useEffect(() => {
    const timers = {};
    const cycleExpr = (id) => {
      const delay = 3500 + Math.random() * 4000;
      timers[id] = setTimeout(() => {
        setAvatarExprs((prev) => {
          if (hoveredCard) return prev;
          const pool = IDLE_EXPRESSIONS.filter((e) => e !== prev[id]);
          const next = pool[Math.floor(Math.random() * pool.length)];
          return { ...prev, [id]: next };
        });
        cycleExpr(id);
      }, delay);
    };

    AI_ASSISTANTS.forEach((a) => cycleExpr(a.id));
    return () => Object.values(timers).forEach(clearTimeout);
  }, [hoveredCard]);

  // ── 3D Cosmic Particle Simulation Engine (60 FPS GPU-Accelerated) ──
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
    let animationFrameId;
    let time = 0;

    // Pre-rendered sprite textures for instant GPU drawing
    const magentaSprite = createGlowSprite(232, 121, 249);
    const blueSprite = createGlowSprite(56, 189, 248);
    const limeSprite = createGlowSprite(163, 230, 53);
    const violetBurstSprite = createGlowSprite(192, 132, 252, true);
    const whiteSparkSprite = createGlowSprite(255, 255, 255, true);

    const streamSprites = [magentaSprite, blueSprite, limeSprite];

    // Anchors cached outside of render loop
    const anchors = {
      targetX: window.innerWidth * 0.5,
      targetY: window.innerHeight * 0.45,
      origins: [
        { x: window.innerWidth * 0.22, y: window.innerHeight * 0.72 },
        { x: window.innerWidth * 0.50, y: window.innerHeight * 0.72 },
        { x: window.innerWidth * 0.78, y: window.innerHeight * 0.72 },
      ],
    };

    const updateAnchors = () => {
      if (!canvas || !container) return;
      const cRect = container.getBoundingClientRect();
      canvas.width = cRect.width;
      canvas.height = cRect.height;

      const sRect = singularityRef.current ? singularityRef.current.getBoundingClientRect() : null;
      anchors.targetX = sRect ? (sRect.left + sRect.width / 2) - cRect.left : cRect.width * 0.5;
      anchors.targetY = sRect ? (sRect.top + sRect.height / 2) - cRect.top : cRect.height * 0.45;

      AI_ASSISTANTS.forEach((ast, idx) => {
        const el = cardRefs.current[ast.id];
        if (el) {
          const r = el.getBoundingClientRect();
          anchors.origins[idx] = {
            x: (r.left + r.width / 2) - cRect.left,
            y: r.top - cRect.top + 22,
          };
        } else {
          anchors.origins[idx] = {
            x: cRect.width * (0.22 + idx * 0.28),
            y: cRect.height * 0.72,
          };
        }
      });
    };

    updateAnchors();
    let resizeTimer;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(updateAnchors, 80);
    };
    window.addEventListener('resize', handleResize);

    // ── Distant 3D Background Stars ────────────────────────────────
    const stars = [];
    for (let i = 0; i < 90; i++) {
      stars.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size: 0.8 + Math.random() * 1.8,
        depth: 0.15 + Math.random() * 0.35, // parallax depth
        alpha: 0.2 + Math.random() * 0.6,
        pulseSpeed: 1 + Math.random() * 2,
        seed: Math.random() * 100,
      });
    }

    // ── Primary Mascot Energy Stream Particles ─────────────────────
    class CosmicStreamParticle {
      constructor(initialT, isSecondary = false) {
        this.isSecondary = isSecondary;
        this.reset(initialT);
      }

      reset(initialT = 0) {
        this.streamIdx = Math.floor(Math.random() * 3);
        this.sprite = streamSprites[this.streamIdx];
        this.t = initialT;
        this.speed = this.isSecondary ? 0.0032 + Math.random() * 0.005 : 0.005 + Math.random() * 0.007;
        this.size = this.isSecondary ? 18 + Math.random() * 26 : 10 + Math.random() * 18;
        this.seed = Math.random() * 1000;
        this.orbitRadius = (Math.random() - 0.5) * (this.isSecondary ? 32 : 12);
        this.orbitSpeed = 2 + Math.random() * 3.5;
        this.depth = 0.6 + Math.random() * 0.4;

        this.x = 0;
        this.y = 0;
        this.prevX = 0;
        this.prevY = 0;
        this.alpha = 0;
      }

      update(tSec, parallaxX, parallaxY) {
        this.t += this.speed;
        if (this.t >= 1) {
          this.reset(0);
          return;
        }

        const origin = anchors.origins[this.streamIdx];
        const { targetX, targetY } = anchors;

        const p0x = origin.x;
        const p0y = origin.y;
        const p1x = origin.x + (this.streamIdx === 0 ? -38 : this.streamIdx === 2 ? 38 : 0);
        const p1y = origin.y * 0.68 + targetY * 0.32;
        const p2x = targetX + (this.streamIdx === 0 ? -28 : this.streamIdx === 2 ? 28 : 0);
        const p2y = origin.y * 0.28 + targetY * 0.72;
        const p3x = targetX;
        const p3y = targetY;

        // Smooth cubic easing
        const easedT = this.t < 0.5 ? 2 * this.t * this.t : 1 - Math.pow(-2 * this.t + 2, 2) / 2;

        const bx = cubicBezier(p0x, p1x, p2x, p3x, easedT);
        const by = cubicBezier(p0y, p1y, p2y, p3y, easedT);

        const envelope = Math.sin(this.t * Math.PI);
        const noise = fastCurlNoise(bx, by, tSec);
        const orbit = Math.sin(this.t * 11 + tSec * this.orbitSpeed + this.seed) * this.orbitRadius * envelope;

        this.prevX = this.x || bx;
        this.prevY = this.y || by;

        this.x = bx + noise.x * (this.isSecondary ? 0.32 : 0.12) * envelope + orbit + parallaxX * this.depth * 15;
        this.y = by + noise.y * (this.isSecondary ? 0.32 : 0.12) * envelope + parallaxY * this.depth * 10;

        this.alpha = Math.min(1, this.t * 2.8);
      }

      draw(c) {
        const a = Math.max(0, this.alpha);
        c.globalAlpha = a * (this.isSecondary ? 0.38 : 0.88);

        const half = this.size / 2;
        c.drawImage(this.sprite, this.x - half, this.y - half, this.size, this.size);
      }
    }

    // ── Stage 2 Upward Branching Nebula Lightning Particles ────────
    class BranchingLightningParticle {
      constructor() {
        this.reset(Math.random());
      }

      reset(initialT = 0) {
        this.branchType = Math.floor(Math.random() * 3);
        this.t = initialT;
        this.speed = 0.0042 + Math.random() * 0.0065;
        this.size = 12 + Math.random() * 22;
        this.seed = Math.random() * 1000;
        this.depth = 0.4 + Math.random() * 0.6;
        this.alpha = 1;
        this.x = 0;
        this.y = 0;
      }

      update(tSec, w, h, parallaxX, parallaxY) {
        this.t += this.speed;
        if (this.t >= 1) {
          this.reset(0);
          return;
        }

        const startX = anchors.targetX;
        const startY = anchors.targetY;

        let endX, endY, ctrl1x, ctrl1y, ctrl2x, ctrl2y;

        if (this.branchType === 0) {
          endX = w * 0.5 + (Math.sin(this.seed) * 70);
          endY = h * 0.05;
          ctrl1x = startX + (Math.sin(this.seed) * 28);
          ctrl1y = startY * 0.6 + endY * 0.4;
          ctrl2x = endX + (Math.cos(this.seed) * 28);
          ctrl2y = startY * 0.3 + endY * 0.7;
        } else if (this.branchType === 1) {
          endX = w * 0.12 + (Math.sin(this.seed) * 50);
          endY = h * 0.03;
          ctrl1x = startX - 75;
          ctrl1y = startY * 0.7 + endY * 0.3;
          ctrl2x = endX + 35;
          ctrl2y = startY * 0.3 + endY * 0.7;
        } else {
          endX = w * 0.88 + (Math.sin(this.seed) * 50);
          endY = h * 0.03;
          ctrl1x = startX + 75;
          ctrl1y = startY * 0.7 + endY * 0.3;
          ctrl2x = endX - 35;
          ctrl2y = startY * 0.3 + endY * 0.7;
        }

        const bx = cubicBezier(startX, ctrl1x, ctrl2x, endX, this.t);
        const by = cubicBezier(startY, ctrl1y, ctrl2y, endY, this.t);

        const noise = fastCurlNoise(bx, by, tSec);
        const envelope = Math.sin(this.t * Math.PI);

        this.x = bx + noise.x * 0.22 * envelope + parallaxX * this.depth * 18;
        this.y = by + noise.y * 0.22 * envelope + parallaxY * this.depth * 12;

        this.alpha = (1 - this.t) * Math.min(1, this.t * 3.2);
      }

      draw(c) {
        const a = Math.max(0, this.alpha);
        c.globalAlpha = a * 0.8;
        const half = this.size / 2;
        c.drawImage(violetBurstSprite, this.x - half, this.y - half, this.size, this.size);
      }
    }

    // ── Foreground Floating Cosmic Stardust Particles ──────────────
    const foregroundSparks = [];
    for (let i = 0; i < 40; i++) {
      foregroundSparks.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -(0.3 + Math.random() * 0.6),
        size: 8 + Math.random() * 14,
        depth: 1.2 + Math.random() * 0.8, // Foreground high parallax
        alpha: 0.2 + Math.random() * 0.5,
      });
    }

    // Initialize Pools (120 core + 80 secondary + 110 branching = 310 particles)
    const coreParticles = [];
    const smokyParticles = [];
    const branchParticles = [];

    for (let i = 0; i < 120; i++) coreParticles.push(new CosmicStreamParticle(Math.random(), false));
    for (let i = 0; i < 80; i++) smokyParticles.push(new CosmicStreamParticle(Math.random(), true));
    for (let i = 0; i < 110; i++) branchParticles.push(new BranchingLightningParticle());

    // ── Continuous 60 FPS Render Loop ─────────────────────────────
    const render = () => {
      time += 0.016;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'lighter';

      const w = canvas.width;
      const h = canvas.height;

      // Smooth mouse interpolation for 3D parallax
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;
      const px = mouseRef.current.x;
      const py = mouseRef.current.y;

      // 1. Distant Background Stars
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        const sx = s.x + px * s.depth * 10;
        const sy = s.y + py * s.depth * 8;
        const pulse = Math.sin(time * s.pulseSpeed + s.seed) * 0.3 + 0.7;
        ctx.globalAlpha = s.alpha * pulse;
        ctx.drawImage(whiteSparkSprite, sx - s.size / 2, sy - s.size / 2, s.size, s.size);
      }

      // 2. Smoky Secondary Plasma Streams
      for (let i = 0; i < smokyParticles.length; i++) {
        smokyParticles[i].update(time, px, py);
        smokyParticles[i].draw(ctx);
      }

      // 3. Core High-Intensity Stream Particles
      for (let i = 0; i < coreParticles.length; i++) {
        coreParticles[i].update(time, px, py);
        coreParticles[i].draw(ctx);
      }

      // 4. Singularity Portal Shockwave & Burst Core
      const ringRadius = (time * 38) % 95;
      const ringAlpha = (1 - ringRadius / 95) * 0.65;
      ctx.save();
      ctx.globalAlpha = ringAlpha;
      ctx.strokeStyle = '#E879F9';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(anchors.targetX + px * 8, anchors.targetY + py * 6, ringRadius * 2.1, ringRadius * 0.68, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Singularity core flare
      ctx.globalAlpha = 0.88 + Math.sin(time * 6) * 0.12;
      ctx.drawImage(violetBurstSprite, (anchors.targetX + px * 8) - 40, (anchors.targetY + py * 6) - 40, 80, 80);
      ctx.restore();

      // 5. Stage 2 Upward Branching Cosmic Nebula Particles
      for (let i = 0; i < branchParticles.length; i++) {
        branchParticles[i].update(time, w, h, px, py);
        branchParticles[i].draw(ctx);
      }

      // 6. Foreground Cosmic Stardust Sparks
      for (let i = 0; i < foregroundSparks.length; i++) {
        const sp = foregroundSparks[i];
        sp.x += sp.vx;
        sp.y += sp.vy;
        if (sp.y < 0) {
          sp.y = h + 10;
          sp.x = Math.random() * w;
        }
        ctx.globalAlpha = sp.alpha * 0.65;
        const fx = sp.x + px * sp.depth * 25;
        const fy = sp.y + py * sp.depth * 20;
        ctx.drawImage(whiteSparkSprite, fx - sp.size / 2, fy - sp.size / 2, sp.size, sp.size);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div ref={containerRef} className="vai-page">
      {/* ── Deep Black Space Background & Diagonal Plasma Nebulas ─── */}
      <div className="vai-universe-bg" />
      <div className="vai-nebula-left" />
      <div className="vai-nebula-right" />

      {/* ── Continuous 3D Holographic Particle Simulation Canvas ─── */}
      <canvas ref={canvasRef} className="vai-particle-canvas" />

      {/* ── Top Floating Typography (Classical Serif) ────────────── */}
      <div className="vai-header">
        <Sparkle size={15} className="vai-spark-icon" />
        <h1 className="vai-title">
          Vedika
          <span className="vai-title-ai">AI</span>
        </h1>
        <p className="vai-subtitle">
          Which Vedika AI Assistant would you like to learn with today?
        </p>
      </div>

      {/* ── Central Singularity / Convergence Horizon Nexus ──────── */}
      <div className="vai-hologram-stage">
        <div className="vai-nexus-ring vai-ring-3" />
        <div className="vai-nexus-ring vai-ring-2" />
        <div className="vai-nexus-ring vai-ring-1" />
        <div className="vai-horizon-beam" />
        <div ref={singularityRef} className="vai-singularity-core" />
      </div>

      {/* ── Bottom 3 AI Entities (Physical 3D Placement, Zero Boxes) ─ */}
      <div className="vai-cards-container">
        <div className="vai-cards-grid">
          {AI_ASSISTANTS.map((assistant) => (
            <div
              key={assistant.id}
              ref={(el) => { if (el) cardRefs.current[assistant.id] = el; }}
              className="vai-card"
              onMouseEnter={() => setHoveredCard(assistant.id)}
              onMouseLeave={() => setHoveredCard(null)}
              onClick={() => router.push(assistant.url)}
            >
              {/* 3D Mascot Avatar with Floor Glow Caustics & Head Spark */}
              <div className="vai-avatar-wrapper">
                <div className={`vai-floor-glow vai-floor-${assistant.accentClass}`} />
                <div className={`vai-antenna-spark vai-antenna-${assistant.accentClass}`} />

                <ThreeDAvatar
                  expression={avatarExprs[assistant.id] || 'idle'}
                  glowColor={assistant.glowColor}
                  modelColor={assistant.modelColor}
                  size={140}
                  mouseOffset={mouseOffsets[assistant.id] || { x: 0, y: 0 }}
                  isSpeaking={hoveredCard === assistant.id}
                />
              </div>

              {/* Title */}
              <h2 className={`vai-card-title vai-title-${assistant.accentClass}`}>
                {assistant.title}
              </h2>

              {/* Description */}
              <p className="vai-card-desc">
                {assistant.desc}
              </p>

              {/* Action Button Link */}
              <div className={`vai-action-btn vai-btn-${assistant.accentClass}`}>
                <span>{assistant.actionText}</span>
                <ArrowRight size={13} className="vai-arrow-icon" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
