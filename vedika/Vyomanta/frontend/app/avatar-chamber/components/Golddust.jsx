'use client';

import React, { useEffect, useRef } from 'react';

/**
 * Golddust Canvas Component
 * Inspired by https://codepen.io/dai-rong-wu/pen/aPORxa
 *
 * Sprinkles elegant golden dust particles directly over the middle avatar.
 */
export default function Golddust() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;

    let isRunning = true;
    let rafId = null;

    function random(n) {
      return Math.floor(Math.random() * n) + 1;
    }

    function Canvas(elm) {
      this.elm = elm;
      this.canvasCtx = this.elm.getContext('2d');
      this.width = this.elm.width;
      this.height = this.elm.height;
      this.children = [];

      this.init();
    }

    Canvas.prototype = {
      resize: function () {
        const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 1.25) : 1;
        const w = window.innerWidth;
        const h = window.innerHeight;
        this.width = this.elm.width = Math.floor(w * dpr);
        this.height = this.elm.height = Math.floor(h * dpr);
      },
      clear: function () {
        this.canvasCtx.clearRect(0, 0, this.width, this.height);
      },
      addChild: function (child) {
        this.children.push(child);
      },
      removeChild: function (num) {
        this.children.splice(num, 1);
      },
      rendering: function () {
        this.clear();
        const limit = this.children.length;
        for (let i = limit - 1; i >= 0; i--) {
          const child = this.children[i];
          if (child.draw(this.canvasCtx)) {
            this.removeChild(i);
          }
        }
      },
      createGolddust: function (num, x1, y1, x2, y2) {
        // High-luminance gold palette with bright diamond whites and radiant 24K gold
        const colors = ['#FFFFFF', '#FFF8BC', '#FFEA75', '#FFDF00', '#FFD700', '#FFC72C', '#F59E0B'];
        for (let i = 0; i < num; i++) {
          const x_pos = Math.floor(Math.random() * (x2 - x1)) + x1;
          const y_pos = Math.floor(Math.random() * (y2 - y1)) + y1;
          this.addChild(
            new Particle(
              this,
              x_pos,
              y_pos,
              0.32 + Math.random() * 0.12, // Clearly visible flakes
              { x: random(360), y: random(360), z: random(360) },
              { x: random(10), y: random(10), z: random(10) },
              random(5),
              colors[random(colors.length) - 1]
            )
          );
        }
      },
      animate: function () {
        if (!isRunning) return;

        // Middle avatar column bounds: strictly centered on the middle avatar
        const midX = this.width / 2;
        const spawnWidth = Math.min(this.width * 0.32, 600);
        const x1 = midX - spawnWidth / 2;
        const x2 = midX + spawnWidth / 2;

        // Spawning right above the middle avatar's crown & head
        const y1 = this.height * 0.10;
        const y2 = this.height * 0.30;

        // Optimized sprinkle rate capped at 80 active flakes
        if (Math.random() > 0.25 && this.children.length < 80) {
          this.createGolddust(2, x1, y1, x2, y2);
        }

        this.rendering();

        rafId = window.requestAnimationFrame(() => {
          this.animate();
        });
      },
      init: function () {
        this.resize();
        this.animate();
      },
    };

    function Particle(parent, x, y, scale, direction, rotate, wind, color) {
      this.parent = parent;
      this.x_pos = x;
      this.y_pos = y;
      this.scale = scale;
      this.direction = direction;
      this.rotate = rotate;
      this.wind = wind;
      this.gr = 7.5;
      this.phase = 0;
      this.color = color;
    }

    Particle.prototype = {
      draw: function (ctx) {
        ctx.save();
        ctx.beginPath();
        ctx.translate(this.x_pos, this.y_pos);

        ctx.rotate((this.direction.y / 100) * Math.PI);
        ctx.scale(this.scale, this.scale);

        // Soft vertical fade: fade in at top, fade out near pedestal
        const startY = this.parent.height * 0.10;
        const endY = this.parent.height * 0.72;
        let alpha = 1.0;
        if (this.y_pos < startY + 60) {
          alpha = Math.max(0.0, (this.y_pos - startY) / 60);
        } else if (this.y_pos > endY - 80) {
          alpha = Math.max(0.0, (endY - this.y_pos) / 80);
        }

        // Blazing-fast additive blend without CPU-choking shadowBlur
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.min(1.0, alpha * 1.3);
        ctx.fillStyle = this.color;

        // Golden dust petal flake bezier shape
        const x_rad = Math.cos((this.direction.x * Math.PI) / 100);
        const z_rad = Math.cos((this.direction.z * Math.PI) / 100);
        ctx.moveTo(-6 * z_rad, -10 * x_rad);
        ctx.bezierCurveTo(-10 * z_rad, 0 * x_rad, -5 * z_rad, 10 * x_rad, 0 * z_rad, 10 * x_rad);
        ctx.bezierCurveTo(0 * z_rad, 0 * x_rad, 0 * z_rad, 0 * x_rad, -1 * z_rad, -1 * x_rad);
        ctx.fill();
        ctx.restore();

        return this.moveGolddust();
      },
      moveGolddust: function () {
        // Falling speed: optimized to fall smoothly with graceful momentum
        this.y_pos = this.y_pos + (this.gr * this.scale) * 1.45;

        // Gentle lateral fluttering sway
        this.x_pos += Math.sin(this.y_pos * 0.015 + this.wind) * 0.85;

        // 3D tumbling rotation
        this.direction.x += this.rotate.x / 3.5;
        this.direction.y += this.rotate.y / 3.5;
        this.direction.z += this.rotate.z / 3.5;

        // Terminate cleanly when reaching below middle avatar pedestal
        const bottomLimit = this.parent.height * 0.74;
        if (this.x_pos < 0 || this.x_pos > this.parent.width) return true;
        return this.y_pos > bottomLimit;
      },
    };

    const golddustApp = new Canvas(canvasEl);

    const handleResize = () => {
      if (golddustApp) golddustApp.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      isRunning = false;
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="Golddust">
      <canvas id="Golddust" ref={canvasRef} />
    </div>
  );
}
