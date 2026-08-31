'use client';

import React, { useEffect, useRef } from 'react';
import { Renderer, Program, Mesh, Geometry } from 'ogl';
import './Galaxy.css';

const vertexShader = `
  attribute vec2 aPosition;
  attribute float aSize;
  attribute float aSpeed;
  attribute float aSeed;
  attribute float aIsTwinkler;

  uniform float uTime;
  uniform float uStarSpeed;
  uniform vec2 uResolution;

  varying float vTwinkle;

  void main() {
    vec2 pos = aPosition;

    // Gentle full-screen drift across the entire screen
    pos.x += sin(uTime * 0.06 * aSpeed * uStarSpeed + aSeed * 6.28) * 0.025;
    pos.y += cos(uTime * 0.05 * aSpeed * uStarSpeed + aSeed * 3.14) * 0.025;

    // Wrap-around bounds so particles stay seamlessly distributed across entire screen
    if (pos.x > 1.05) pos.x -= 2.1;
    if (pos.x < -1.05) pos.x += 2.1;
    if (pos.y > 1.05) pos.y -= 2.1;
    if (pos.y < -1.05) pos.y += 2.1;

    // 90% steady normal stardust, 10% dynamic shimmering twinklers
    if (aIsTwinkler > 0.5) {
      vTwinkle = 0.25 + 0.75 * pow(0.5 + 0.5 * sin(uTime * 2.4 * aSpeed + aSeed * 28.3), 3.0);
    } else {
      vTwinkle = 0.85; // Normal steady stardust
    }

    gl_Position = vec4(pos, 0.0, 1.0);

    float twinkleScale = aIsTwinkler > 0.5 ? (vTwinkle * 1.35) : 1.0;
    gl_PointSize = aSize * twinkleScale * (uResolution.y / 900.0);
  }
`;

const fragmentShader = `
  precision highp float;

  uniform float uGlowIntensity;
  uniform vec3 uStarColor;
  varying float vTwinkle;

  void main() {
    // Soft anti-aliased circular particle with delicate radial glow
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);
    
    if (dist > 0.5) discard;

    float glow = 1.0 - smoothstep(0.0, 0.5, dist);
    float core = 1.0 - smoothstep(0.0, 0.15, dist);
    
    float alpha = (glow * 0.65 + core * 0.50) * vTwinkle * uGlowIntensity;
    gl_FragColor = vec4(uStarColor, alpha * 0.85);
  }
`;

export default function Galaxy({
  starSpeed = 0.5,
  glowIntensity = 0.90,
  particleCount = 900,
  className = '',
}) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer;
    let animId = null;
    let isCleanedUp = false;

    try {
      renderer = new Renderer({
        alpha: true,
        premultipliedAlpha: false,
        antialias: true,
        dpr: Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 2 : 2, 2),
      });

      const gl = renderer.gl;
      gl.clearColor(0, 0, 0, 0);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE); // Additive blending for rich stardust glow

      container.appendChild(gl.canvas);

      // Generate full-screen uniform stardust particles (NDC space -1.0 to +1.0)
      const numStars = particleCount;
      const positions = new Float32Array(numStars * 2);
      const sizes = new Float32Array(numStars);
      const speeds = new Float32Array(numStars);
      const seeds = new Float32Array(numStars);
      const isTwinklers = new Float32Array(numStars);

      for (let i = 0; i < numStars; i++) {
        // Uniform full-screen dispersion covering entire width and height
        positions[i * 2 + 0] = Math.random() * 2.0 - 1.0; // Full screen width X [-1, 1]
        positions[i * 2 + 1] = Math.random() * 2.0 - 1.0; // Full screen height Y [-1, 1]

        // Tiny, delicate stardust micro-dots
        sizes[i] = Math.random() * 2.2 + 1.0;
        speeds[i] = Math.random() * 0.7 + 0.6;
        seeds[i] = Math.random();

        // Exactly 10% randomly shimmer, 90% stay steady normal
        isTwinklers[i] = Math.random() < 0.10 ? 1.0 : 0.0;
      }

      const geometry = new Geometry(gl, {
        aPosition: { size: 2, data: positions },
        aSize: { size: 1, data: sizes },
        aSpeed: { size: 1, data: speeds },
        aSeed: { size: 1, data: seeds },
        aIsTwinkler: { size: 1, data: isTwinklers },
      });

      const uniforms = {
        uTime: { value: 0 },
        uStarSpeed: { value: starSpeed },
        uGlowIntensity: { value: glowIntensity },
        uStarColor: { value: [0.89, 0.92, 0.98] }, // Single unified clean star color
        uResolution: { value: [window.innerWidth, window.innerHeight] },
      };

      const program = new Program(gl, {
        vertex: vertexShader,
        fragment: fragmentShader,
        uniforms,
        transparent: true,
        depthTest: false,
        depthWrite: false,
      });

      const mesh = new Mesh(gl, { geometry, program, mode: gl.POINTS });

      const handleResize = () => {
        if (!container || isCleanedUp) return;
        const width = container.clientWidth || window.innerWidth;
        const height = container.clientHeight || window.innerHeight;
        renderer.setSize(width, height);
        uniforms.uResolution.value = [width, height];
      };

      window.addEventListener('resize', handleResize);
      handleResize();

      let startTime = performance.now();
      const loop = (now) => {
        if (isCleanedUp) return;
        const elapsed = (now - startTime) * 0.001;
        uniforms.uTime.value = elapsed;

        try {
          renderer.render({ scene: mesh });
          animId = requestAnimationFrame(loop);
        } catch (e) {
          console.warn('Stardust render error:', e);
        }
      };

      animId = requestAnimationFrame(loop);
    } catch (err) {
      console.warn('Stardust WebGL init failed:', err);
    }

    return () => {
      isCleanedUp = true;
      if (animId) cancelAnimationFrame(animId);
      if (renderer) {
        try {
          const canvas = renderer.gl.canvas;
          if (canvas && canvas.parentElement) {
            canvas.parentElement.removeChild(canvas);
          }
          const loseContext = renderer.gl.getExtension('WEBGL_lose_context');
          if (loseContext) loseContext.loseContext();
        } catch (e) {}
      }
    };
  }, [starSpeed, glowIntensity, particleCount]);

  return (
    <div
      ref={containerRef}
      className={`galaxy-background-container ${className}`.trim()}
      aria-hidden="true"
    />
  );
}
