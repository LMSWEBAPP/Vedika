'use client';

import React, { useEffect, useRef, useState, useId } from 'react';
import { BotEngine } from '../lib/bloub/engine.js';
import { DEMI_VIEWBOX, RAYON } from '../lib/bloub/repere.js';
import { EXPRESSION_BY_ID, DEFAULT_EXPRESSION } from '../lib/bloub/expressions.js';
import { NOTIF_BLUE } from '../lib/bloub/decor.js';
import { mixHex } from '../lib/bloub/skins.js';
import { lookTarget } from '../lib/bloub/gaze.js';

const R = RAYON;
const VB = DEMI_VIEWBOX;

export default function BloubAvatar({
  size = 280,
  shape = null, // null = circle
  color = '#000000',
  paper = '#09090b',
  expression = 'neutre',
  state = 'idle',
  follow = true,
  className = '',
}) {
  const svgRef = useRef(null);
  const reactId = useId().replace(/:/g, '_');
  const maskId = `bloub-mask-${reactId}`;
  
  const [frame, setFrame] = useState(null);
  const engineRef = useRef(null);
  const animStateRef = useRef({
    clock: 0,
    last: 0,
    raf: 0,
    pointer: { nx: 0, ny: 0, active: false },
    currentExpr: expression,
    currentState: state,
  });

  // Initialize engine once
  useEffect(() => {
    const exprDef = EXPRESSION_BY_ID.get(expression) || EXPRESSION_BY_ID.get(DEFAULT_EXPRESSION);
    const eng = new BotEngine(R, state, shape, exprDef);
    engineRef.current = eng;
    setFrame(eng.sample(0));

    let lastTime = performance.now();
    let clock = 0;

    const tick = (now) => {
      const dt = Math.min((now - lastTime) / 1000, 0.064);
      lastTime = now;
      clock += dt;
      animStateRef.current.clock = clock;

      if (follow && animStateRef.current.pointer.active) {
        const { nx, ny } = animStateRef.current.pointer;
        const target = lookTarget({ nx, ny, tour: 1, pointer: true });
        eng.setLook(target, clock);
      } else if (!follow) {
        eng.setLook(null, clock);
      }

      const f = eng.sample(clock);
      setFrame(f);

      animStateRef.current.raf = requestAnimationFrame(tick);
    };

    animStateRef.current.raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animStateRef.current.raf);
    };
  }, []);

  // Update expression
  useEffect(() => {
    if (engineRef.current && expression !== animStateRef.current.currentExpr) {
      animStateRef.current.currentExpr = expression;
      const exprDef = EXPRESSION_BY_ID.get(expression) || EXPRESSION_BY_ID.get(DEFAULT_EXPRESSION);
      engineRef.current.setExpression(exprDef, animStateRef.current.clock);
    }
  }, [expression]);

  // Update state
  useEffect(() => {
    if (engineRef.current && state !== animStateRef.current.currentState) {
      animStateRef.current.currentState = state;
      engineRef.current.setState(state, animStateRef.current.clock);
    }
  }, [state]);

  // Update shape
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setShape(shape, animStateRef.current.clock);
    }
  }, [shape]);

  // Pointer move handler for smooth gaze tracking
  useEffect(() => {
    if (!follow) return;

    const handlePointerMove = (e) => {
      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / (window.innerWidth * 0.5);
      const dy = (e.clientY - cy) / (window.innerHeight * 0.5);
      animStateRef.current.pointer = {
        nx: Math.max(-1, Math.min(1, dx)),
        ny: Math.max(-1, Math.min(1, dy)),
        active: true,
      };
    };

    const handlePointerLeave = () => {
      animStateRef.current.pointer.active = false;
      if (engineRef.current) {
        engineRef.current.setLook(null, animStateRef.current.clock);
      }
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    document.addEventListener('pointerleave', handlePointerLeave);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, [follow]);

  if (!frame) return null;

  const dotAttrs = (dot) => {
    const fill = dot.color ?? (dot.depth === undefined ? color : mixHex(paper, color, dot.depth));
    const common = { fill, opacity: dot.opacity };
    return dot.d
      ? {
          ...common,
          d: dot.d,
          transform: `translate(${dot.x} ${dot.y}) rotate(${dot.rot ?? 0}) scale(${R})`,
        }
      : { ...common, cx: dot.x, cy: dot.y, r: dot.r };
  };

  return (
    <svg
      ref={svgRef}
      width={size}
      height={size}
      viewBox={`${-VB} ${-VB} ${VB * 2} ${VB * 2}`}
      className={`bloub-avatar-svg ${className}`}
      role="img"
      aria-label="2D Vedika Avatar"
    >
      <defs>
        {/* Cutout Mask for eyes */}
        <mask
          id={maskId}
          maskUnits="userSpaceOnUse"
          x={-VB}
          y={-VB}
          width={VB * 2}
          height={VB * 2}
        >
          {/* White base = fully visible */}
          <path d={frame.bodyPath} fill="#ffffff" />
          {/* Black cutouts = holes for eyes */}
          {frame.eyes?.map((eye, i) => (
            <path
              key={i}
              d={eye.d}
              transform={eye.matrix}
              opacity={eye.alpha}
              fill="#000000"
            />
          ))}
          {frame.notch && (
            <circle
              cx={frame.notch.x}
              cy={frame.notch.y}
              r={frame.notch.r}
              fill="#000000"
            />
          )}
        </mask>

        {/* Arc Gradients */}
        {frame.arcs?.map((arc) => (
          <linearGradient
            key={arc.id}
            id={`${reactId}-${arc.id}`}
            gradientUnits="userSpaceOnUse"
            x1={arc.grad.x1}
            y1={arc.grad.y1}
            x2={arc.grad.x2}
            y2={arc.grad.y2}
          >
            {arc.grad.stops.map((c, i) => (
              <stop
                key={i}
                offset={i / (arc.grad.stops.length - 1)}
                stopColor={c}
              />
            ))}
          </linearGradient>
        ))}
      </defs>

      {/* Back side of orbits */}
      <g fill="none" strokeLinecap="round">
        {frame.arcs?.map((arc) => (
          <path
            key={`b${arc.id}`}
            d={arc.back}
            stroke={`url(#${reactId}-${arc.id})`}
            strokeWidth={arc.width}
            opacity={arc.opacity}
          />
        ))}
      </g>

      {/* Particles behind body */}
      {frame.dotsBehind && (
        <g>
          {frame.dots?.map((dot, i) => {
            const attrs = dotAttrs(dot);
            return attrs.d ? (
              <path key={`pb${i}`} {...attrs} />
            ) : (
              <circle key={`pb${i}`} {...attrs} />
            );
          })}
        </g>
      )}

      {/* Body with Eyes Cutout */}
      <g opacity={frame.bodyAlpha}>
        {/* Underlay background matching canvas paper so eyes reveal background */}
        <path d={frame.bodyPath} fill={paper} />
        {/* Main body masked with cutout holes */}
        <g mask={`url(#${maskId})`}>
          <rect
            x={-VB}
            y={-VB}
            width={VB * 2}
            height={VB * 2}
            fill={color}
          />
        </g>
      </g>

      {/* Particles in front of body */}
      {!frame.dotsBehind && (
        <g>
          {frame.dots?.map((dot, i) => {
            const attrs = dotAttrs(dot);
            return attrs.d ? (
              <path key={`pf${i}`} {...attrs} />
            ) : (
              <circle key={`pf${i}`} {...attrs} />
            );
          })}
        </g>
      )}

      {/* Notification badge if any */}
      {frame.notif && (
        <circle
          cx={frame.notif.x}
          cy={frame.notif.y}
          r={frame.notif.r}
          fill={NOTIF_BLUE}
        />
      )}

      {/* Front side of orbits */}
      <g fill="none" strokeLinecap="round">
        {frame.arcs?.map((arc) => (
          <path
            key={`f${arc.id}`}
            d={arc.front}
            stroke={`url(#${reactId}-${arc.id})`}
            strokeWidth={arc.width}
            opacity={arc.opacity}
          />
        ))}
      </g>
    </svg>
  );
}
