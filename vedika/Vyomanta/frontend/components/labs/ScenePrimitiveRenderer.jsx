import React, { useState, useEffect, useMemo } from 'react';
import { lookupFormula } from '@/lib/formulaRegistry';
import { buildCanonicalScene } from '@/lib/canonicalScenes';
import { Sliders, Sparkles, RotateCcw } from 'lucide-react';

// ---- Coordinate Mapping ---------------------------------------------------
// World space -> screen space. Y is flipped (world +y is up, SVG +y is down).
function makeProjector(viewBox, width, height, padding = 36) {
  const { xMin, xMax, yMin, yMax } = viewBox;
  const spanX = xMax - xMin || 1;
  const spanY = yMax - yMin || 1;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;
  const scale = Math.min(innerW / spanX, innerH / spanY);

  return (wx, wy) => [
    padding + (wx - xMin) * scale,
    padding + innerH - (wy - yMin) * scale,
  ];
}

// ---- Safe Mathematical Curve Sampling with Parameter Substitution ---------
function sampleCurve(expression, xMin, xMax, steps = 120, params = {}) {
  if (!expression || typeof expression !== 'string') return [];

  let cleanExpr = expression;

  // Substitute parameter variables (e.g. a, b, c, m, k, r, h, n) with values from params
  Object.keys(params).forEach((paramKey) => {
    const val = Number(params[paramKey]);
    if (Number.isFinite(val)) {
      const regex = new RegExp(`\\b${paramKey}\\b`, 'g');
      cleanExpr = cleanExpr.replace(regex, `(${val})`);
    }
  });

  cleanExpr = cleanExpr
    .replace(/\b(sin|cos|tan|sqrt|abs|log|exp|floor|ceil|round)\b/gi, 'Math.$1')
    .replace(/\bpi\b/gi, 'Math.PI')
    .replace(/\be\b/gi, 'Math.E')
    .replace(/\^/g, '**');

  let fn;
  try {
    fn = new Function('x', `return ${cleanExpr};`);
  } catch (e) {
    console.warn('[Curve Sampler] Expression compile error:', e);
    return [];
  }

  const points = [];
  const span = xMax - xMin || 1;
  for (let i = 0; i <= steps; i++) {
    const x = xMin + (span * i) / steps;
    let y;
    try {
      y = fn(x);
    } catch {
      continue;
    }
    if (typeof y === 'number' && Number.isFinite(y)) {
      points.push([x, y]);
    }
  }
  return points;
}

// ---- Primitive SVG Element Renderers -------------------------------------
function renderPrimitive(p, project, key, theme = {}) {
  const accentColor = theme.accent || '#5B8CF8';
  const textColor = theme.text || '#DDE3F2';
  const purpleColor = theme.purple || '#9B6EF8';
  const amberColor = theme.amber || '#F5A95B';
  const greenColor = theme.green || '#22C5A0';

  switch (p.type) {
    case 'polygon': {
      if (!Array.isArray(p.points)) return null;
      const pts = p.points.map(([x, y]) => project(x, y).join(',')).join(' ');
      return (
        <polygon
          key={key}
          points={pts}
          fill={p.fill || `${purpleColor}20`}
          stroke={p.stroke || purpleColor}
          strokeWidth={p.strokeWidth ?? 2}
        />
      );
    }
    case 'line':
    case 'dashed_line': {
      if (!p.from || !p.to) return null;
      const [x1, y1] = project(...p.from);
      const [x2, y2] = project(...p.to);
      return (
        <line
          key={key}
          x1={x1} y1={y1} x2={x2} y2={y2}
          stroke={p.color || (p.type === 'dashed_line' ? amberColor : accentColor)}
          strokeWidth={p.strokeWidth ?? 2}
          strokeDasharray={p.type === 'dashed_line' ? '4 3' : undefined}
        />
      );
    }
    case 'arrow':
    case 'vector': {
      if (!p.from || !p.to) return null;
      const [x1, y1] = project(...p.from);
      const [x2, y2] = project(...p.to);
      return (
        <g key={key}>
          <line
            x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={p.color || accentColor}
            strokeWidth={p.strokeWidth ?? 2.5}
            markerEnd="url(#arrowhead)"
          />
          {p.label && (
            <text x={(x1 + x2) / 2 + 6} y={(y1 + y2) / 2 - 6} fill={p.color || accentColor} fontSize="11" fontWeight="bold">
              {p.label}
            </text>
          )}
        </g>
      );
    }
    case 'circle': {
      const [cx, cy] = project(p.cx, p.cy);
      const [rx] = project(p.cx + p.r, p.cy);
      return (
        <circle
          key={key}
          cx={cx} cy={cy} r={Math.abs(rx - cx)}
          fill={p.fill || `${accentColor}20`}
          stroke={p.stroke || accentColor}
          strokeWidth={2}
        />
      );
    }
    case 'ellipse': {
      const [cx, cy] = project(p.cx, p.cy);
      const [rx] = project(p.cx + (p.rx || p.r || 5), p.cy);
      const [, ry] = project(p.cx, p.cy + (p.ry || p.r || 5));
      return (
        <ellipse
          key={key}
          cx={cx} cy={cy}
          rx={Math.abs(rx - cx)} ry={Math.abs(ry - cy)}
          fill={p.fill || `${purpleColor}20`}
          stroke={p.stroke || purpleColor}
          strokeWidth={2}
        />
      );
    }
    case 'arc':
    case 'angle_marker': {
      const [cx, cy] = project(p.cx, p.cy);
      const [rx] = project(p.cx + (p.r || 2), p.cy);
      const r = Math.abs(rx - cx);
      const toXY = (deg) => {
        const rad = (deg * Math.PI) / 180;
        return [cx + r * Math.cos(rad), cy - r * Math.sin(rad)];
      };
      const startAngle = p.startAngle || 0;
      const endAngle = p.endAngle || 90;
      const [sx, sy] = toXY(startAngle);
      const [ex, ey] = toXY(endAngle);
      const largeArc = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;
      return (
        <g key={key}>
          <path
            d={`M ${sx} ${sy} A ${r} ${r} 0 ${largeArc} 0 ${ex} ${ey}`}
            fill={p.type === 'angle_marker' ? `${amberColor}25` : "none"}
            stroke={p.color || amberColor}
            strokeWidth={2}
          />
          {p.label && (
            <text x={cx + (r + 14) * Math.cos(((startAngle + endAngle) / 2 * Math.PI) / 180)} y={cy - (r + 14) * Math.sin(((startAngle + endAngle) / 2 * Math.PI) / 180)} fill={amberColor} fontSize="11" fontWeight="bold">
              {p.label}
            </text>
          )}
        </g>
      );
    }
    case 'point': {
      const [cx, cy] = project(p.x, p.y);
      return (
        <g key={key}>
          <circle cx={cx} cy={cy} r={5} fill={p.color || textColor} stroke="#FFF" strokeWidth="1.5" />
          {p.label && (
            <text x={cx + 8} y={cy - 6} fill={p.color || textColor} fontSize="11" fontWeight="bold">
              {p.label}
            </text>
          )}
        </g>
      );
    }
    case 'label': {
      const [x, y] = project(p.x, p.y);
      return (
        <text
          key={key}
          x={x} y={y}
          fill={p.fill || textColor}
          fontSize={p.fontSize || 12}
          fontWeight="bold"
          textAnchor={p.textAnchor || 'start'}
        >
          {p.text}
        </text>
      );
    }
    case 'bar': {
      const [x, y] = project(p.x, p.y);
      const [x2] = project(p.x + (p.width || 1), p.y);
      const [, y2] = project(p.x, p.y + (p.height || 1));
      return (
        <rect
          key={key}
          x={x} y={y2}
          width={Math.abs(x2 - x)} height={Math.abs(y2 - y)}
          fill={p.color || `${accentColor}40`}
          stroke={accentColor}
          rx={4}
        />
      );
    }
    case 'number_line': {
      const [minX, oy] = project(p.min ?? -10, 0);
      const [maxX] = project(p.max ?? 10, 0);
      const [valX] = project(p.value ?? 0, 0);
      return (
        <g key={key}>
          <line x1={minX} y1={oy} x2={maxX} y2={oy} stroke={textColor} strokeWidth={3} />
          {/* Shaded Ray */}
          <line x1={valX} y1={oy} x2={p.direction === 'left' ? minX : maxX} y2={oy} stroke={greenColor} strokeWidth={6} opacity={0.6} />
          <circle cx={valX} cy={oy} r={7} fill={p.inclusive ? greenColor : theme.bg || '#07080F'} stroke={greenColor} strokeWidth={2.5} />
          {p.label && <text x={valX} y={oy - 14} fill={greenColor} fontSize="12" fontWeight="bold" textAnchor="middle">{p.label}</text>}
        </g>
      );
    }
    case 'iso_surface_3d':
    case 'curve':
      return null;
    default:
      return null;
  }
}

// ---- Render Axes & Grid Lines --------------------------------------------
function renderAxes(viewBox, project, width = 680, height = 420) {
  const { xMin, xMax, yMin, yMax } = viewBox;
  const [ox, oy] = project(0, 0);
  const strokeColor = '#64748B';
  const gridColor = 'rgba(255,255,255,0.08)';

  const gridElements = [];

  const stepX = Math.max(1, Math.round((xMax - xMin) / 10));
  for (let x = Math.ceil(xMin); x <= Math.floor(xMax); x += stepX) {
    const [px] = project(x, 0);
    gridElements.push(
      <line key={`gx-${x}`} x1={px} y1={project(0, yMin)[1]} x2={px} y2={project(0, yMax)[1]} stroke={gridColor} strokeWidth={1} strokeDasharray="2 2" />
    );
    if (x !== 0) {
      gridElements.push(
        <text key={`tx-${x}`} x={px} y={Math.min(height - 8, Math.max(16, oy + 14))} fill="#94A3B8" fontSize="10" fontWeight="bold" textAnchor="middle">
          {x}
        </text>
      );
    }
  }

  const stepY = Math.max(1, Math.round((yMax - yMin) / 10));
  for (let y = Math.ceil(yMin); y <= Math.floor(yMax); y += stepY) {
    const [, py] = project(0, y);
    gridElements.push(
      <line key={`gy-${y}`} x1={project(xMin, 0)[0]} y1={py} x2={project(xMax, 0)[0]} y2={py} stroke={gridColor} strokeWidth={1} strokeDasharray="2 2" />
    );
    if (y !== 0) {
      gridElements.push(
        <text key={`ty-${y}`} x={Math.min(width - 10, Math.max(12, ox - 10))} y={py + 3} fill="#94A3B8" fontSize="10" fontWeight="bold" textAnchor="end">
          {y}
        </text>
      );
    }
  }

  return (
    <g>
      {gridElements}
      {yMin <= 0 && yMax >= 0 && (
        <line x1={project(xMin, 0)[0]} y1={oy} x2={project(xMax, 0)[0]} y2={oy} stroke={strokeColor} strokeWidth={2} />
      )}
      {xMin <= 0 && xMax >= 0 && (
        <line x1={ox} y1={project(0, yMin)[1]} x2={ox} y2={project(0, yMax)[1]} stroke={strokeColor} strokeWidth={2} />
      )}
    </g>
  );
}

// ---- Main Primitive Canvas Component with Real-Time Interactive Sliders ----
export default function ScenePrimitiveRenderer({ scene, width = 680, height = 420, theme = {} }) {
  if (!scene || !scene.viewBox) return null;

  // Auto-fill standard interactive parameters if Gemini omitted them for general queries
  const initialParams = useMemo(() => {
    const raw = { ...(scene.params || {}) };
    const concept = (scene.concept || '').toLowerCase();

    if (Object.keys(raw).length === 0) {
      if (concept.includes('pyramid')) {
        raw.base_side = 6;
        raw.height = 8;
      } else if (concept.includes('cone') || concept.includes('cylinder') || concept.includes('solid')) {
        raw.radius = 6;
        raw.height = 10;
      } else if (concept.includes('sphere') || concept.includes('hemisphere') || concept.includes('circle')) {
        raw.radius = 6;
      } else if (concept.includes('triangle')) {
        raw.base = 6;
        raw.height = 8;
      } else if (concept.includes('quadratic') || concept.includes('parabola')) {
        raw.a = 2;
        raw.b = -5;
        raw.c = 3;
      } else if (concept.includes('cube') || concept.includes('cuboid') || concept.includes('prism')) {
        raw.l = 8;
        raw.w = 5;
        raw.h = 10;
      } else if (concept.includes('sequence') || concept.includes('toothpick')) {
        raw.n = 5;
      } else if (concept.includes('fraction') || concept.includes('pie')) {
        raw.totalSlices = 8;
        raw.slicesEaten = 6;
      } else if (concept.includes('bar') || concept.includes('ratio')) {
        raw.val1 = 6;
        raw.val2 = 2;
      } else {
        // Universal Fallback Parameters for any unmapped shape
        raw.width = 8;
        raw.height = 6;
      }
    }
    return raw;
  }, [scene.params, scene.concept]);

  // Real-Time Dynamic Parameter State
  const [params, setParams] = useState(initialParams);

  useEffect(() => {
    setParams(initialParams);
  }, [initialParams]);

  const updateParam = (key, val) => {
    const parsed = parseFloat(val);
    if (!isNaN(parsed)) {
      setParams((prev) => ({ ...prev, [key]: parsed }));
    }
  };

  const currentViewBox = useMemo(() => {
    const canonical = buildCanonicalScene(scene.concept, params, scene.viewBox);
    return (canonical && canonical.viewBox) ? canonical.viewBox : scene.viewBox;
  }, [scene.concept, scene.viewBox, params]);

  const project = useMemo(
    () => makeProjector(currentViewBox, width, height),
    [currentViewBox, width, height]
  );

  // Auto-detect formula key if missing
  const knownFormulaKey = useMemo(() => {
    if (scene.known_formula) return scene.known_formula;
    const c = (scene.concept || '').toLowerCase();
    if (c.includes('pyramid')) return 'pyramid_vol';
    if (c.includes('cone')) return 'cone_tsa';
    if (c.includes('cylinder')) return 'cylinder_tsa';
    if (c.includes('sphere')) return 'sphere_tsa';
    if (c.includes('triangle')) return 'triangle_area';
    if (c.includes('quadratic')) return 'quadratic_roots';
    if (c.includes('trapezoid')) return 'trapezoid_area';
    if (c.includes('sector')) return 'sector_area';
    if (c.includes('cube') || c.includes('cuboid') || c.includes('prism')) return 'cuboid_tsa';
    return null;
  }, [scene.known_formula, scene.concept]);

  // Compute live formula derived value client-side
  const liveFormula = useMemo(() => {
    if (knownFormulaKey) {
      return lookupFormula(knownFormulaKey, params);
    }
    return scene.formula;
  }, [knownFormulaKey, scene.formula, params]);

  // Parametrically update primitive coordinates when sliders move
  const dynamicPrimitives = useMemo(() => {
    // 1. Check Deterministic Canonical Scene Generator (Guarantees 100% mathematical perfection)
    const canonical = buildCanonicalScene(scene.concept, params, scene.viewBox);
    if (canonical && Array.isArray(canonical.primitives)) {
      return canonical.primitives;
    }

    // 2. Fallback scaling for custom AI scenes
    const r = params.radius !== undefined ? Number(params.radius) : (params.r !== undefined ? Number(params.r) : null);
    const h = params.height !== undefined ? Number(params.height) : (params.h !== undefined ? Number(params.h) : null);
    const b = params.base !== undefined ? Number(params.base) : (params.base_side !== undefined ? Number(params.base_side) : (params.l !== undefined ? Number(params.l) : null));

    return (scene.primitives || []).map((p) => {
      // 1. Polygon scaling (Cuboids, Pyramids, Triangles)
      if (p.type === 'polygon' && Array.isArray(p.points)) {
        if (b !== null) {
          const halfS = b / 2;
          const newPoints = p.points.map(([px, py]) => [
            px < 0 ? -halfS : (px > 0 ? halfS : 0),
            py
          ]);
          return { ...p, points: newPoints };
        }
      }
      // 2. Point / Apex scaling
      if (p.type === 'point' && h !== null && p.cy !== undefined) {
        return { ...p, cy: h / 2 };
      }
      // 3. Ellipse / Circle scaling
      if (p.type === 'ellipse' && r !== null) {
        return { ...p, rx: r, ry: Math.max(1, r * 0.35) };
      }
      if (p.type === 'circle' && r !== null) {
        return { ...p, r: r };
      }
      // 4. Bar chart / Histogram scaling
      if (p.type === 'bar') {
        const val = params.val1 !== undefined ? Number(params.val1) : (params.val2 !== undefined ? Number(params.val2) : null);
        if (val !== null) {
          return { ...p, height: val };
        }
      }
      // 5. 1D Number line scaling
      if (p.type === 'number_line') {
        const numVal = params.value !== undefined ? Number(params.value) : (params.n !== undefined ? Number(params.n) : null);
        if (numVal !== null) {
          return { ...p, value: numVal };
        }
      }
      // 6. Solid edge lines scaling
      if (p.type === 'line' && Array.isArray(p.from) && Array.isArray(p.to)) {
        let newFrom = [...p.from];
        let newTo = [...p.to];
        if (r !== null) {
          if (newFrom[0] < 0) newFrom[0] = -r;
          if (newFrom[0] > 0) newFrom[0] = r;
          if (newTo[0] < 0) newTo[0] = -r;
          if (newTo[0] > 0) newTo[0] = r;
        }
        if (b !== null) {
          if (newFrom[0] < 0) newFrom[0] = -b / 2;
          if (newFrom[0] > 0) newFrom[0] = b / 2;
          if (newTo[0] < 0) newTo[0] = -b / 2;
          if (newTo[0] > 0) newTo[0] = b / 2;
        }
        if (h !== null) {
          if (newTo[1] > 0) newTo[1] = h / 2;
          if (newFrom[1] > 0) newFrom[1] = h / 2;
          if (newFrom[1] < 0) newFrom[1] = -h / 2;
          if (newTo[1] < 0) newTo[1] = -h / 2;
        }
        return { ...p, from: newFrom, to: newTo };
      }
      // 7. Dashed perspective lines scaling
      if (p.type === 'dashed_line' && Array.isArray(p.from) && Array.isArray(p.to)) {
        let newFrom = [...p.from];
        let newTo = [...p.to];
        if (r !== null) {
          if (newTo[0] > 0) newTo[0] = r;
          if (newFrom[0] < 0) newFrom[0] = -r;
        }
        if (b !== null) {
          if (newFrom[0] < 0) newFrom[0] = -b / 2;
          if (newFrom[0] > 0) newFrom[0] = b / 2;
          if (newTo[0] < 0) newTo[0] = -b / 2;
          if (newTo[0] > 0) newTo[0] = b / 2;
        }
        if (h !== null) {
          if (newFrom[1] > 0) newFrom[1] = h / 2;
          if (newTo[1] < 0) newTo[1] = -h / 2;
        }
        return { ...p, from: newFrom, to: newTo };
      }
      return p;
    });
  }, [scene.primitives, params]);

  // Sample curves with parameter substitution
  const curvePaths = dynamicPrimitives
    .filter((p) => p.type === 'curve')
    .map((p, i) => {
      const xMin = typeof p.xMin === 'number' ? p.xMin : scene.viewBox.xMin;
      const xMax = typeof p.xMax === 'number' ? p.xMax : scene.viewBox.xMax;
      const pts = sampleCurve(p.expression, xMin, xMax, 120, params);
      if (pts.length === 0) return null;
      const d = pts
        .map(([x, y], j) => `${j === 0 ? 'M' : 'L'} ${project(x, y).join(' ')}`)
        .join(' ');
      return (
        <path
          key={`curve-${i}`}
          d={d}
          fill="none"
          stroke={p.color || theme.accent || '#5B8CF8'}
          strokeWidth={2.5}
        />
      );
    });

  const paramKeys = Object.keys(params).filter((k) => {
    const v = params[k];
    return typeof v === 'number' || (!isNaN(parseFloat(v)) && isFinite(v));
  });

  return (
    <div style={{ width: '100%' }}>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ background: theme.bg || '#07080F', borderRadius: 8 }}>
        <defs>
          <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
            <polygon points="0 0, 8 4, 0 8" fill={theme.accent || '#5B8CF8'} />
          </marker>
        </defs>
        {scene.showAxes && renderAxes(scene.viewBox, project, width, height)}
        {dynamicPrimitives
          .filter((p) => p.type !== 'curve')
          .map((p, i) => renderPrimitive(p, project, i, theme))}
        {curvePaths}
      </svg>

      {/* DYNAMIC FORMULA DERIVATION BADGE */}
      {liveFormula && (
        <div style={{ marginTop: '0.75rem', padding: '10px 16px', background: `${theme.green || '#22C5A0'}15`, borderRadius: 8, border: `1px solid ${theme.green || '#22C5A0'}40`, textAlign: 'center', fontSize: 13 }}>
          <span style={{ color: theme.muted || '#647298' }}>{liveFormula.label}: </span>
          <strong style={{ color: theme.green || '#22C5A0', fontWeight: 700 }}>{liveFormula.value}</strong>
        </div>
      )}

      {/* DYNAMIC PARAMETER CONTROL SLIDERS PANEL */}
      {paramKeys.length > 0 && (
        <div style={{ marginTop: '1rem', padding: '14px 18px', background: theme.s2 || 'rgba(255,255,255,0.03)', borderRadius: 10, border: `1px solid ${theme.border || 'rgba(255,255,255,0.08)'}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sliders size={14} color={theme.purple || '#9B6EF8'} />
              <span style={{ fontSize: 12, fontWeight: 700, color: theme.purple || '#9B6EF8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Interactive Parameter Controls (Live 0ms Redraw)
              </span>
            </div>
            <button
              onClick={() => setParams(initialParams)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 10px',
                borderRadius: 6,
                background: `${theme.accent || '#5B8CF8'}20`,
                border: `1px solid ${theme.accent || '#5B8CF8'}40`,
                color: theme.accent || '#5B8CF8',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <RotateCcw size={12} /> Reset Defaults
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: paramKeys.length > 2 ? 'repeat(auto-fit, minmax(180px, 1fr))' : '1fr 1fr', gap: 14 }}>
            {paramKeys.map((key) => {
              const numVal = parseFloat(params[key]);
              const minVal = Math.min(-10, Math.floor(numVal * 2));
              const maxVal = Math.max(20, Math.ceil(numVal * 2 || 10));
              const step = Math.abs(numVal) < 2 ? 0.1 : 1;

              return (
                <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 11, color: theme.muted || '#94A3B8', display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                    <span style={{ textTransform: 'capitalize' }}>Parameter {key}:</span>
                    <strong style={{ color: theme.text || '#FFF' }}>{numVal}</strong>
                  </label>
                  <input
                    type="range"
                    min={minVal}
                    max={maxVal}
                    step={step}
                    value={numVal}
                    onChange={(e) => updateParam(key, e.target.value)}
                    style={{ width: '100%', accentColor: theme.accent || '#5B8CF8', cursor: 'pointer' }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Validator Gatekeeper ------------------------------------------------
const REQUIRED_FIELDS = {
  polygon: ['points'],
  line: ['from', 'to'],
  dashed_line: ['from', 'to'],
  arrow: ['from', 'to'],
  vector: ['from', 'to'],
  circle: ['cx', 'cy', 'r'],
  ellipse: ['cx', 'cy'],
  arc: ['cx', 'cy'],
  angle_marker: ['cx', 'cy'],
  point: ['x', 'y'],
  label: ['x', 'y', 'text'],
  bar: ['x', 'y'],
  number_line: ['value'],
  curve: ['expression'],
};

function isFiniteNum(v) {
  if (typeof v === 'number') return Number.isFinite(v);
  if (typeof v === 'string') {
    const parsed = parseFloat(v);
    return !isNaN(parsed) && Number.isFinite(parsed);
  }
  return false;
}

export function validateScene(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (raw.visualizable === false) return { unsupported: true };

  const sceneObj = raw.scene || raw;
  if (!sceneObj || typeof sceneObj !== 'object' || !Array.isArray(sceneObj.primitives)) return null;

  const vb = sceneObj.viewBox;
  if (
    !vb ||
    !isFiniteNum(vb.xMin) || !isFiniteNum(vb.xMax) ||
    !isFiniteNum(vb.yMin) || !isFiniteNum(vb.yMax) ||
    vb.xMin >= vb.xMax || vb.yMin >= vb.yMax
  ) {
    return null;
  }

  const primitives = sceneObj.primitives.filter((p) => {
    const required = REQUIRED_FIELDS[p?.type];
    if (!required) return false;
    return required.every((field) => {
      const v = p[field];
      if (Array.isArray(v)) return v.every(isFiniteNum) || v.every((pt) => Array.isArray(pt));
      if (typeof v === 'string') return v.length > 0;
      return isFiniteNum(v);
    });
  });

  if (primitives.length === 0) return null;

  return {
    concept: sceneObj.concept || 'math_concept',
    known_formula: sceneObj.known_formula || null,
    params: sceneObj.params || {},
    viewBox: vb,
    showAxes: Boolean(sceneObj.showAxes),
    primitives,
    formula: null,
  };
}
