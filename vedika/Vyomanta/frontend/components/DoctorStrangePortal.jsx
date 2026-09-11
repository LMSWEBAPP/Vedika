'use client';

import React, { useRef, useEffect, forwardRef } from 'react';

/**
 * DoctorStrangePortal — Authentic Marvel/Doctor Strange Sling Ring Portal
 * - Single high-energy fiery spark ring (NO multiple concentric rings/halos)
 * - Pure pitch-black void inside the circular aperture
 * - High-speed clockwise orbiting golden sparks with tangential ember spray
 */
const DoctorStrangePortal = forwardRef(function DoctorStrangePortal(
  { size = 260, className = '', style = {} },
  forwardedRef
) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const animFrameRef = useRef(null);
  const isVisibleRef = useRef(true);

  // Set up intersection observer to halt canvas rendering when portal is scrolled out of view
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      isVisibleRef.current = entry.isIntersecting;
    }, { threshold: 0.01 });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    const w = size;
    const h = size;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const cx = w / 2;
    const cy = h / 2;
    // Radius of the portal aperture
    const portalRadius = w * 0.33;

    // Doctor Strange Sling Ring Spark Particle System
    const sparkCount = 70; // Optimized spark count for silky 60fps
    const sparks = [];

    const sparkColors = [
      '#FFFFFF', // White hot core
      '#FFF4CC', // Brilliant champagne
      '#FDE047', // Bright gold
      '#F59E0B', // Fiery amber
      '#EA580C', // Hot orange ember
      '#D97706', // Gold glow
    ];

    for (let i = 0; i < sparkCount; i++) {
      sparks.push({
        angle: (i / sparkCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.2,
        speed: 0.055 + Math.random() * 0.075, // Rapid clockwise rotation
        radOffset: (Math.random() - 0.5) * 6,  // Tight jitter along ring
        length: 8 + Math.random() * 16,        // Tangential streak length
        width: 1.2 + Math.random() * 2.0,
        color: sparkColors[Math.floor(Math.random() * sparkColors.length)],
        alpha: 0.6 + Math.random() * 0.4,
        isSpitEmbers: Math.random() > 0.68,    // Embers that spray outward
        emberDist: 0,
        emberSpeed: 0.8 + Math.random() * 2.2,
        life: Math.random(),
      });
    }

    // Open Space Clusters inside the portal aperture (Cosmic void depth!)
    const starCount = 36;
    const spaceStars = [];
    const starColors = ['#ffffff', '#bae6fd', '#ddd6fe', '#fef08a', '#a5f3fc', '#fbcfe8'];

    for (let i = 0; i < starCount; i++) {
      // Create clustered distribution (some dense clusters, some scattered stars)
      const isClusterA = i < 14;
      const isClusterB = i >= 14 && i < 26;
      let r, theta;
      if (isClusterA) {
        // Star cluster 1 (Upper-left quadrant)
        theta = -Math.PI * 0.7 + (Math.random() - 0.5) * 0.9;
        r = portalRadius * (0.25 + Math.random() * 0.50);
      } else if (isClusterB) {
        // Star cluster 2 (Lower-right quadrant)
        theta = Math.PI * 0.35 + (Math.random() - 0.5) * 0.8;
        r = portalRadius * (0.30 + Math.random() * 0.45);
      } else {
        // Ambient scattered background stars
        theta = Math.random() * Math.PI * 2;
        r = portalRadius * Math.sqrt(Math.random()) * 0.84;
      }

      spaceStars.push({
        baseTheta: theta,
        r,
        size: 0.75 + Math.random() * 1.5,
        twinkleSpeed: 1.2 + Math.random() * 2.8,
        phase: Math.random() * Math.PI * 2,
        color: starColors[Math.floor(Math.random() * starColors.length)],
      });
    }

    // 3D Wavy Particle System (Subtle dimensional undulating wave matrix inside the portal)
    const waveCols = 12;
    const waveRows = 12;
    const waveParticles = [];
    const gridSpacing = (portalRadius * 1.62) / (waveCols - 1);

    for (let c = 0; c < waveCols; c++) {
      for (let r = 0; r < waveRows; r++) {
        const gx = (c - (waveCols - 1) / 2) * gridSpacing;
        const gy = (r - (waveRows - 1) / 2) * gridSpacing;
        const dist = Math.hypot(gx, gy);
        if (dist <= portalRadius * 0.90) {
          waveParticles.push({
            gx,
            gy,
            phase: (c * 0.48) + (r * 0.38),
            color: (c + r) % 3 === 0 ? '#38bdf8' : ((c + r) % 3 === 1 ? '#c084fc' : '#fde047'),
          });
        }
      }
    }

    let t = 0;
    let skipCount = 0;

    const render = () => {
      // If portal is offscreen or parent has zero opacity, skip expensive drawing
      if (!isVisibleRef.current) {
        animFrameRef.current = requestAnimationFrame(render);
        return;
      }

      // Check parent opacity / transform occasionally (every 6 frames)
      skipCount++;
      if (skipCount % 6 === 0) {
        const parent = containerRef.current;
        if (parent) {
          const op = parent.style.opacity;
          if (op === '0' || parent.style.display === 'none') {
            animFrameRef.current = requestAnimationFrame(render);
            return;
          }
        }
      }

      t += 0.016;
      ctx.clearRect(0, 0, w, h);

      // 1. Cosmic Void with Open Space Clusters inside the portal aperture
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, portalRadius - 0.5, 0, Math.PI * 2);
      ctx.clip(); // Strictly confine cosmic elements inside the aperture

      // Deep space background gradient
      const spaceGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, portalRadius);
      spaceGrad.addColorStop(0.0, '#0c0a24');
      spaceGrad.addColorStop(0.35, '#070617');
      spaceGrad.addColorStop(0.70, '#04030d');
      spaceGrad.addColorStop(1.0, '#000000');
      ctx.fillStyle = spaceGrad;
      ctx.fillRect(cx - portalRadius, cy - portalRadius, portalRadius * 2, portalRadius * 2);

      // A. Swirling Nebula Dust Clouds (Cosmic violet & cyan gas)
      const nebAngle1 = t * 0.08;
      const nebX1 = cx + Math.cos(nebAngle1) * (portalRadius * 0.32);
      const nebY1 = cy + Math.sin(nebAngle1) * (portalRadius * 0.28);
      const nebGrad1 = ctx.createRadialGradient(nebX1, nebY1, 2, nebX1, nebY1, portalRadius * 0.62);
      nebGrad1.addColorStop(0.0, 'rgba(139, 92, 246, 0.28)'); // Cosmic violet
      nebGrad1.addColorStop(0.5, 'rgba(99, 102, 241, 0.12)');
      nebGrad1.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
      ctx.fillStyle = nebGrad1;
      ctx.beginPath();
      ctx.arc(cx, cy, portalRadius, 0, Math.PI * 2);
      ctx.fill();

      const nebAngle2 = -t * 0.06 + Math.PI;
      const nebX2 = cx + Math.cos(nebAngle2) * (portalRadius * 0.36);
      const nebY2 = cy + Math.sin(nebAngle2) * (portalRadius * 0.30);
      const nebGrad2 = ctx.createRadialGradient(nebX2, nebY2, 2, nebX2, nebY2, portalRadius * 0.55);
      nebGrad2.addColorStop(0.0, 'rgba(6, 182, 212, 0.22)'); // Celestial cyan
      nebGrad2.addColorStop(0.5, 'rgba(14, 165, 233, 0.08)');
      nebGrad2.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
      ctx.fillStyle = nebGrad2;
      ctx.beginPath();
      ctx.arc(cx, cy, portalRadius, 0, Math.PI * 2);
      ctx.fill();

      // B. Twinkling Space Clusters & Stardust Particles
      for (let i = 0; i < spaceStars.length; i++) {
        const star = spaceStars[i];
        // Slow subtle vortex rotation
        const curTheta = star.baseTheta + t * 0.04;
        const sx = cx + Math.cos(curTheta) * star.r;
        const sy = cy + Math.sin(curTheta) * star.r;
        const twinkle = 0.55 + 0.45 * Math.sin(t * star.twinkleSpeed + star.phase);

        ctx.save();
        ctx.globalAlpha = twinkle;
        ctx.fillStyle = star.color;
        ctx.beginPath();
        ctx.arc(sx, sy, star.size, 0, Math.PI * 2);
        ctx.fill();

        // Subtle glow halo on larger cluster stars
        if (star.size > 1.3) {
          ctx.beginPath();
          ctx.arc(sx, sy, star.size * 2.2, 0, Math.PI * 2);
          ctx.fillStyle = star.color;
          ctx.globalAlpha = twinkle * 0.25;
          ctx.fill();
        }
        ctx.restore();
      }

      // C. 3D Subtle Undulating Particle Waves (Dimensional spatial grid inside the portal)
      ctx.save();
      const fov = 170;

      // Group by row to draw faint wavy connective grid strands
      const rowsMap = {};
      for (let i = 0; i < waveParticles.length; i++) {
        const p = waveParticles[i];
        if (!rowsMap[p.r]) rowsMap[p.r] = [];
        rowsMap[p.r].push(p);
      }

      ctx.lineWidth = 0.85;
      Object.keys(rowsMap).forEach((rKey) => {
        const rowPts = rowsMap[rKey];
        if (rowPts.length < 2) return;
        ctx.beginPath();
        for (let j = 0; j < rowPts.length; j++) {
          const p = rowPts[j];
          const waveZ = Math.sin(p.gx * 0.05 + t * 2.2 + p.phase) * Math.cos(p.gy * 0.05 + t * 1.8) * 18;
          const waveY = Math.sin(p.gx * 0.04 + t * 1.8 + p.phase) * 5.0;
          const persp = fov / (fov + waveZ);
          const px = cx + p.gx * persp;
          const py = cy + (p.gy + waveY) * persp;
          if (j === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
        ctx.stroke();
      });

      // Undulating 3D glowing particle nodes
      for (let i = 0; i < waveParticles.length; i++) {
        const p = waveParticles[i];
        // 3D undulating wave dynamics in depth Z and vertical Y
        const waveZ = Math.sin(p.gx * 0.05 + t * 2.2 + p.phase) * Math.cos(p.gy * 0.05 + t * 1.8) * 18;
        const waveY = Math.sin(p.gx * 0.04 + t * 1.8 + p.phase) * 5.0;

        // Perspective projection
        const persp = fov / (fov + waveZ);
        const px = cx + p.gx * persp;
        const py = cy + (p.gy + waveY) * persp;

        // Depth-based subtle brightness and radius
        const pNormZ = (waveZ + 18) / 36; // 0 to 1
        const alpha = Math.max(0.14, Math.min(0.70, 0.20 + pNormZ * 0.45));
        const pRadius = Math.max(0.7, (1.1 + pNormZ * 0.6) * persp);

        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(px, py, pRadius, 0, Math.PI * 2);
        ctx.fill();

        // Subtle glowing soft aura on cresting wave particles
        if (pNormZ > 0.65) {
          ctx.beginPath();
          ctx.arc(px, py, pRadius * 2.2, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = alpha * 0.24;
          ctx.fill();
        }
      }
      ctx.restore();

      // D. Faint spiral stardust filaments
      ctx.save();
      ctx.lineWidth = 1.0;
      ctx.strokeStyle = 'rgba(167, 139, 250, 0.12)';
      ctx.beginPath();
      const armSteps = 24;
      for (let s = 0; s < armSteps; s++) {
        const prog = s / armSteps;
        const armR = prog * (portalRadius * 0.75);
        const armA = t * 0.15 + prog * Math.PI * 2.2;
        const ax = cx + Math.cos(armA) * armR;
        const ay = cy + Math.sin(armA) * armR;
        if (s === 0) ctx.moveTo(ax, ay);
        else ctx.lineTo(ax, ay);
      }
      ctx.stroke();
      ctx.restore();

      ctx.restore(); // End clipping inside portal aperture

      // 2. High-energy Fiery Base Ring
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, portalRadius, 0, Math.PI * 2);
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = 'rgba(255, 235, 170, 0.95)';
      ctx.shadowColor = '#F59E0B';
      ctx.shadowBlur = 8;
      ctx.stroke();

      // Secondary thin ember line
      ctx.beginPath();
      ctx.arc(cx, cy, portalRadius + 1.2, 0, Math.PI * 2);
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.85)';
      ctx.shadowColor = '#EA580C';
      ctx.shadowBlur = 4;
      ctx.stroke();
      ctx.restore();

      // 3. Swirling Fiery Sparks (Batched shadow for maximum GPU/CPU efficiency)
      ctx.save();
      ctx.shadowColor = '#F59E0B';
      ctx.shadowBlur = 5;

      for (let i = 0; i < sparks.length; i++) {
        const s = sparks[i];
        s.angle += s.speed;
        s.life += 0.025;
        if (s.life > 1) {
          s.life = 0;
          s.radOffset = (Math.random() - 0.5) * 6;
          s.emberDist = 0;
        }

        const currentR = portalRadius + s.radOffset;
        const px = cx + Math.cos(s.angle) * currentR;
        const py = cy + Math.sin(s.angle) * currentR;

        // Tangent angle (perpendicular to radial line for spark flight)
        const tangentAngle = s.angle + Math.PI / 2;
        const tailX = px - Math.cos(tangentAngle) * s.length;
        const tailY = py - Math.sin(tangentAngle) * s.length;

        // Draw spark streak
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(px, py);
        ctx.strokeStyle = s.color;
        ctx.lineWidth = s.width;
        ctx.lineCap = 'round';
        ctx.globalAlpha = s.alpha * (0.7 + 0.3 * Math.sin(t * 12 + i));
        ctx.stroke();

        // 4. Tangentially Spraying Embers
        if (s.isSpitEmbers) {
          s.emberDist += s.emberSpeed;
          const emberAngle = s.angle + 0.15 + (s.emberDist * 0.02);
          const emberR = currentR + s.emberDist;
          const ex = cx + Math.cos(emberAngle) * emberR;
          const ey = cy + Math.sin(emberAngle) * emberR;
          const emberAlpha = Math.max(0, (1 - s.emberDist / 28) * 0.9);

          if (emberAlpha > 0.05) {
            ctx.beginPath();
            ctx.arc(ex, ey, 1.2, 0, Math.PI * 2);
            ctx.fillStyle = s.color;
            ctx.globalAlpha = emberAlpha;
            ctx.fill();
          }
        }
      }
      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [size]);

  // Combine forwarded ref and local container ref
  const setContainerRef = (node) => {
    containerRef.current = node;
    if (typeof forwardedRef === 'function') {
      forwardedRef(node);
    } else if (forwardedRef) {
      forwardedRef.current = node;
    }
  };

  return (
    <div
      ref={setContainerRef}
      className={`ds-portal-wrapper ${className}`}
      style={{
        position: 'absolute',
        width: `${size}px`,
        height: `${size}px`,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        willChange: 'transform, opacity',
        ...style,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          display: 'block',
          willChange: 'transform',
        }}
      />
    </div>
  );
});

export default DoctorStrangePortal;
