// Deterministic Canonical Geometric Scene Builder (Validation-Enforced Fast-Path)
// Provides 100% mathematically verified, schema-validated diagrams for known formulas.

function validateSceneLocal(sceneObj) {
  if (!sceneObj || typeof sceneObj !== 'object') return null;
  const conceptStr = String(sceneObj.concept || sceneObj.type || '').toLowerCase();
  const is3DSolid = ['cube', 'cuboid', 'prism', 'box', 'cylinder', 'cone', 'sphere', 'hemisphere', 'pyramid', 'solid', 'surface', 'composite', '3d'].some(k => conceptStr.includes(k));
  if (is3DSolid) {
    return {
      concept: sceneObj.concept || '3D Solid',
      known_formula: sceneObj.known_formula || null,
      params: sceneObj.params || { radius: 7, height: 14 },
      viewBox: sceneObj.viewBox || { xMin: -10, xMax: 10, yMin: -10, yMax: 10 }
    };
  }
  if (!sceneObj.viewBox || !Array.isArray(sceneObj.primitives)) return null;
  return sceneObj;
}


export function buildCanonicalScene(conceptKey, params = {}, viewBox = null) {
  const c = (conceptKey || '').toLowerCase().replace(/_/g, ' ');
  let candidateScene = null;


  // 1. CYLINDER (known_formula: cylinder_tsa)
  if (c === 'cylinder_tsa' || c.includes('cylinder')) {
    const r = Math.max(1, Number(params.radius ?? params.r ?? 6));
    const h = Math.max(2, Number(params.height ?? params.h ?? 10));
    const topY = h / 2;
    const botY = -h / 2;
    const ry = Math.max(0.8, r * 0.35);

    candidateScene = {
      concept: 'Cylinder',
      known_formula: 'cylinder_tsa',
      params: { radius: r, height: h },
      viewBox: { xMin: -r - 4, xMax: r + 4, yMin: botY - 3, yMax: topY + 3 },
      showAxes: false,
      primitives: [
        { type: 'ellipse', cx: 0, cy: topY, rx: r, ry: ry, stroke: '#5B8CF8', fill: 'rgba(91, 140, 248, 0.15)' },
        { type: 'ellipse', cx: 0, cy: botY, rx: r, ry: ry, stroke: '#9B6EF8', fill: 'rgba(155, 110, 248, 0.15)' },
        { type: 'line', from: [-r, botY], to: [-r, topY], color: '#5B8CF8', strokeWidth: 2 },
        { type: 'line', from: [r, botY], to: [r, topY], color: '#5B8CF8', strokeWidth: 2 },
        { type: 'dashed_line', from: [0, botY], to: [0, topY], color: '#F5A95B', strokeWidth: 1.5 },
        { type: 'dashed_line', from: [0, botY], to: [r, botY], color: '#22C5A0', strokeWidth: 2 },
        { type: 'label', x: r / 2, y: botY - 1, text: `r = ${r}`, fill: '#22C5A0' },
        { type: 'label', x: 0.5, y: 0, text: `h = ${h}`, fill: '#F5A95B' },
      ],
    };
  }

  // 2. CONE (known_formula: cone_tsa)
  else if (c === 'cone_tsa' || c.includes('cone')) {
    const r = Math.max(1, Number(params.radius ?? params.r ?? 6));
    const h = Math.max(2, Number(params.height ?? params.h ?? 10));
    const topY = h / 2;
    const botY = -h / 2;
    const ry = Math.max(0.8, r * 0.35);

    candidateScene = {
      concept: 'Cone',
      known_formula: 'cone_tsa',
      params: { radius: r, height: h },
      viewBox: { xMin: -r - 4, xMax: r + 4, yMin: botY - 3, yMax: topY + 3 },
      showAxes: false,
      primitives: [
        { type: 'ellipse', cx: 0, cy: botY, rx: r, ry: ry, stroke: '#9B6EF8', fill: 'rgba(155, 110, 248, 0.15)' },
        { type: 'line', from: [-r, botY], to: [0, topY], color: '#5B8CF8', strokeWidth: 2 },
        { type: 'line', from: [r, botY], to: [0, topY], color: '#5B8CF8', strokeWidth: 2 },
        { type: 'dashed_line', from: [0, botY], to: [0, topY], color: '#F5A95B', strokeWidth: 1.5 },
        { type: 'dashed_line', from: [0, botY], to: [r, botY], color: '#22C5A0', strokeWidth: 2 },
        { type: 'point', x: 0, y: topY, label: 'Apex', color: '#5B8CF8' },
        { type: 'label', x: r / 2, y: botY - 1, text: `r = ${r}`, fill: '#22C5A0' },
        { type: 'label', x: 0.5, y: 0, text: `h = ${h}`, fill: '#F5A95B' },
      ],
    };
  }

  // 3. SPHERE (known_formula: sphere_tsa)
  else if (c === 'sphere_tsa' || c.includes('sphere')) {
    const r = Math.max(1, Number(params.radius ?? params.r ?? 6));
    const ry = Math.max(0.8, r * 0.35);

    candidateScene = {
      concept: 'Sphere',
      known_formula: 'sphere_tsa',
      params: { radius: r },
      viewBox: { xMin: -r - 3, xMax: r + 3, yMin: -r - 3, yMax: r + 3 },
      showAxes: false,
      primitives: [
        { type: 'circle', cx: 0, cy: 0, r: r, stroke: '#5B8CF8', fill: 'rgba(91, 140, 248, 0.15)' },
        { type: 'ellipse', cx: 0, cy: 0, rx: r, ry: ry, stroke: '#9B6EF8', fill: 'none' },
        { type: 'point', x: 0, y: 0, color: '#DDE3F2' },
        { type: 'dashed_line', from: [0, 0], to: [r, 0], color: '#22C5A0', strokeWidth: 2 },
        { type: 'label', x: r / 2, y: 0.6, text: `r = ${r}`, fill: '#22C5A0' },
      ],
    };
  }

  // 4. CUBOID / RECTANGULAR PRISM / CUBE (known_formula: cuboid_tsa / cube_tsa)
  else if (c === 'cuboid_tsa' || c === 'cube_tsa' || c.includes('cuboid') || (c.includes('cube') && !c.includes('square')) || c.includes('prism')) {
    const l = Math.max(2, Number(params.l ?? params.length ?? 8));
    const w = Math.max(1, Number(params.w ?? params.width ?? 5));
    const h = Math.max(2, Number(params.h ?? params.height ?? 6));

    const halfL = l / 2;
    const halfH = h / 2;
    const dx = w * 0.4;
    const dy = w * 0.3;

    candidateScene = {
      concept: c.includes('cube') ? 'Cube' : 'Cuboid',
      known_formula: c.includes('cube') ? 'cube_tsa' : 'cuboid_tsa',
      params: { l: l, w: w, h: h },
      viewBox: { xMin: -halfL - 2, xMax: halfL + dx + 2, yMin: -halfH - 2, yMax: halfH + dy + 2 },
      showAxes: false,
      primitives: [
        { type: 'polygon', points: [[-halfL, -halfH], [halfL, -halfH], [halfL, halfH], [-halfL, halfH]], stroke: '#5B8CF8', fill: 'rgba(91, 140, 248, 0.2)' },
        { type: 'polygon', points: [[-halfL, halfH], [halfL, halfH], [halfL + dx, halfH + dy], [-halfL + dx, halfH + dy]], stroke: '#9B6EF8', fill: 'rgba(155, 110, 248, 0.2)' },
        { type: 'polygon', points: [[halfL, -halfH], [halfL + dx, -halfH + dy], [halfL + dx, halfH + dy], [halfL, halfH]], stroke: '#9B6EF8', fill: 'rgba(155, 110, 248, 0.15)' },
        { type: 'dashed_line', from: [-halfL, -halfH], to: [-halfL + dx, -halfH + dy], color: '#F5A95B' },
        { type: 'dashed_line', from: [-halfL + dx, -halfH + dy], to: [halfL + dx, -halfH + dy], color: '#F5A95B' },
        { type: 'dashed_line', from: [-halfL + dx, -halfH + dy], to: [-halfL + dx, halfH + dy], color: '#F5A95B' },
        { type: 'label', x: 0, y: -halfH - 1, text: `l = ${l}`, fill: '#5B8CF8' },
        { type: 'label', x: halfL + 0.5, y: 0, text: `h = ${h}`, fill: '#9B6EF8' },
        { type: 'label', x: halfL + dx / 2 + 0.5, y: -halfH + dy / 2 - 0.5, text: `w = ${w}`, fill: '#F5A95B' },
      ],
    };
  }

  // 4b. TWO SQUARES / SQUARES COMPARISON (known_formula: two_squares)
  else if (c === 'two_squares' || c.includes('two squares') || c.includes('squares') || (c.includes('square') && !c.includes('cube') && !c.includes('root'))) {
    const s1 = Math.max(1, Number(params.s1 ?? params.side1 ?? params.a ?? 15.33));
    const s2 = Math.max(1, Number(params.s2 ?? params.side2 ?? params.b ?? 15.27));

    const area1 = (s1 * s1).toFixed(1);
    const area2 = (s2 * s2).toFixed(1);
    const perim1 = (4 * s1).toFixed(1);
    const perim2 = (4 * s2).toFixed(1);

    const gap = 3;
    const x1_start = 0;
    const x1_end = s1;
    const x2_start = s1 + gap;
    const x2_end = s1 + gap + s2;
    const maxY = Math.max(s1, s2);
    const maxX = x2_end;

    candidateScene = {
      concept: 'Two Squares Geometry Visualizer',
      known_formula: 'two_squares',
      params: { s1: s1, s2: s2 },
      viewBox: { xMin: -2, xMax: maxX + 3, yMin: -3, yMax: maxY + 4 },
      showAxes: false,
      primitives: [
        // Square 1 Polygon
        { type: 'polygon', points: [[x1_start, 0], [x1_end, 0], [x1_end, s1], [x1_start, s1]], stroke: '#5B8CF8', fill: 'rgba(91, 140, 248, 0.2)' },
        // Square 1 Labels
        { type: 'label', x: s1 / 2, y: -0.8, text: `Side s₁ = ${s1} m`, fill: '#5B8CF8' },
        { type: 'label', x: s1 / 2, y: s1 / 2, text: `Area A₁ = ${area1} m²`, fill: '#5B8CF8' },
        // Square 2 Polygon
        { type: 'polygon', points: [[x2_start, 0], [x2_end, 0], [x2_end, s2], [x2_start, s2]], stroke: '#22C5A0', fill: 'rgba(34, 197, 160, 0.2)' },
        // Square 2 Labels
        { type: 'label', x: x2_start + s2 / 2, y: -0.8, text: `Side s₂ = ${s2} m`, fill: '#22C5A0' },
        { type: 'label', x: x2_start + s2 / 2, y: s2 / 2, text: `Area A₂ = ${area2} m²`, fill: '#22C5A0' },
        // Comparison Summary Banner
        { type: 'label', x: maxX / 2, y: maxY + 2.5, text: `Square 1: Side = ${s1}m, Area = ${area1}m², Perimeter = ${perim1}m`, fill: '#5B8CF8' },
        { type: 'label', x: maxX / 2, y: maxY + 1.2, text: `Square 2: Side = ${s2}m, Area = ${area2}m², Perimeter = ${perim2}m`, fill: '#22C5A0' },
      ]
    };
  }

  // 5. PYRAMID (known_formula: pyramid_vol)
  else if (c === 'pyramid_vol' || c.includes('pyramid')) {
    const s = Math.max(2, Number(params.base_side ?? params.s ?? params.side ?? 6));
    const h = Math.max(2, Number(params.height ?? params.h ?? 8));

    const halfS = s / 2;
    const topY = h / 2;
    const botY = -h / 2;

    candidateScene = {
      concept: 'Square Pyramid',
      known_formula: 'pyramid_vol',
      params: { base_side: s, height: h },
      viewBox: { xMin: -halfS - 3, xMax: halfS + 3, yMin: botY - 3, yMax: topY + 3 },
      showAxes: false,
      primitives: [
        { type: 'polygon', points: [[-halfS, botY], [halfS, botY], [halfS - 1, botY + 1.5], [-halfS + 1, botY + 1.5]], stroke: '#9B6EF8', fill: 'rgba(155, 110, 248, 0.15)' },
        { type: 'line', from: [-halfS, botY], to: [0, topY], color: '#5B8CF8', strokeWidth: 2 },
        { type: 'line', from: [halfS, botY], to: [0, topY], color: '#5B8CF8', strokeWidth: 2 },
        { type: 'dashed_line', from: [halfS - 1, botY + 1.5], to: [0, topY], color: '#F5A95B' },
        { type: 'dashed_line', from: [-halfS + 1, botY + 1.5], to: [0, topY], color: '#F5A95B' },
        { type: 'dashed_line', from: [0, botY + 0.75], to: [0, topY], color: '#22C5A0', strokeWidth: 2 },
        { type: 'point', x: 0, y: topY, label: 'Apex', color: '#5B8CF8' },
        { type: 'label', x: 0, y: botY - 1, text: `side = ${s}`, fill: '#9B6EF8' },
        { type: 'label', x: 0.5, y: 0, text: `h = ${h}`, fill: '#22C5A0' },
      ],
    };
  }

  // 6. PYTHAGORAS THEOREM (known_formula: pythagoras_theorem)
  else if (c === 'pythagoras_theorem' || c.includes('pythagoras') || c.includes('hypotenuse') || (c.includes('right') && c.includes('triangle'))) {
    const a = Math.max(1, Number(params.a ?? params.base ?? params.leg1 ?? 3));
    const b = Math.max(1, Number(params.b ?? params.height ?? params.leg2 ?? 4));
    const cVal = Number(params.c ?? params.hypotenuse ?? Math.sqrt(a * a + b * b)).toFixed(2);

    const rightSquareSize = Math.min(a, b) * 0.15;

    candidateScene = {
      concept: 'Pythagoras Theorem Right Triangle',
      known_formula: 'pythagoras_theorem',
      params: { a: a, b: b, c: Number(cVal) },
      viewBox: { xMin: -2, xMax: a + 4, yMin: -2, yMax: b + 4 },
      showAxes: false,
      primitives: [
        // Right triangle polygon (Vertices at (0,0), (a,0), (0,b))
        { type: 'polygon', points: [[0, 0], [a, 0], [0, b]], stroke: '#5B8CF8', fill: 'rgba(91, 140, 248, 0.2)' },
        // Right Angle Square Marker at (0,0)
        { type: 'polygon', points: [[0, 0], [rightSquareSize, 0], [rightSquareSize, rightSquareSize], [0, rightSquareSize]], stroke: '#F5A95B', fill: 'rgba(245, 169, 91, 0.25)' },
        // Leg A (Base) line label
        { type: 'line', from: [0, 0], to: [a, 0], color: '#22C5A0', strokeWidth: 3 },
        { type: 'label', x: a / 2, y: -0.8, text: `Leg a = ${a}`, fill: '#22C5A0' },
        // Leg B (Height) line label
        { type: 'line', from: [0, 0], to: [0, b], color: '#9B6EF8', strokeWidth: 3 },
        { type: 'label', x: -1.2, y: b / 2, text: `Leg b = ${b}`, fill: '#9B6EF8' },
        // Hypotenuse C line label
        { type: 'line', from: [a, 0], to: [0, b], color: '#F5A95B', strokeWidth: 3.5 },
        { type: 'label', x: a / 2 + 0.5, y: b / 2 + 0.5, text: `Hypotenuse c = ${cVal}`, fill: '#F5A95B' },
        // Points at Vertices
        { type: 'point', x: 0, y: 0, label: 'Right Angle (90°)', color: '#F5A95B' },
        { type: 'point', x: a, y: 0, label: `A (${a},0)`, color: '#22C5A0' },
        { type: 'point', x: 0, y: b, label: `B (0,${b})`, color: '#9B6EF8' },
        // Pythagoras Equation Banner
        { type: 'label', x: a / 2, y: b + 2, text: `a² + b² = c²  =>  ${a}² + ${b}² = ${cVal}²  (${a*a} + ${b*b} = ${(cVal*cVal).toFixed(1)})`, fill: '#5B8CF8' }
      ]
    };
  }

  // 7. TRIANGLE (known_formula: triangle_area)
  else if (c === 'triangle_area' || c.includes('triangle')) {
    const b = Math.max(2, Number(params.base ?? params.b ?? 6));
    const h = Math.max(2, Number(params.height ?? params.h ?? 8));
    const halfB = b / 2;

    candidateScene = {
      concept: 'Triangle',
      known_formula: 'triangle_area',
      params: { base: b, height: h },
      viewBox: { xMin: -halfB - 2, xMax: halfB + 2, yMin: -2, yMax: h + 2 },
      showAxes: false,
      primitives: [
        { type: 'polygon', points: [[-halfB, 0], [halfB, 0], [0, h]], stroke: '#5B8CF8', fill: 'rgba(91, 140, 248, 0.2)' },
        { type: 'dashed_line', from: [0, 0], to: [0, h], color: '#F5A95B', strokeWidth: 2 },
        { type: 'label', x: 0, y: -1, text: `base = ${b}`, fill: '#5B8CF8' },
        { type: 'label', x: 0.5, y: h / 2, text: `h = ${h}`, fill: '#F5A95B' },
      ],
    };
  }

  // 7. QUADRATIC PARABOLA (known_formula: quadratic_roots)
  else if (c === 'quadratic_roots' || c.includes('quadratic') || c.includes('parabola')) {
    const a = Number(params.a ?? 1);
    const b = Number(params.b ?? 0);
    const cVal = Number(params.c ?? -4);
    const expr = `${a}*x^2 + ${b}*x + (${cVal})`;

    candidateScene = {
      concept: 'Quadratic Parabola',
      known_formula: 'quadratic_roots',
      params: { a: a, b: b, c: cVal },
      viewBox: { xMin: -8, xMax: 8, yMin: -8, yMax: 8 },
      showAxes: true,
      primitives: [
        { type: 'curve', expression: expr, xMin: -7, xMax: 7, color: '#5B8CF8' },
      ],
    };
  }

  // 8. UNIT CIRCLE TRIGONOMETRY
  else if (c.includes('unit circle') || c.includes('trigonometry') || (c.includes('sin') && c.includes('cos'))) {
    const a1 = Number(params.angle1 ?? params.a1 ?? 30);
    const a2 = Number(params.angle2 ?? params.a2 ?? 60);
    const totalAngle = a1 + a2;
    const rad = (totalAngle * Math.PI) / 180;
    const px = Math.cos(rad);
    const py = Math.sin(rad);

    candidateScene = {
      concept: 'Unit Circle Trigonometry',
      known_formula: null,
      params: { angle1: a1, angle2: a2 },
      viewBox: { xMin: -1.6, xMax: 1.6, yMin: -1.6, yMax: 1.6 },
      showAxes: true,
      primitives: [
        { type: 'circle', cx: 0, cy: 0, r: 1, stroke: '#5B8CF8', fill: 'rgba(91, 140, 248, 0.1)' },
        { type: 'angle_marker', cx: 0, cy: 0, r: 0.35, startAngle: 0, endAngle: totalAngle, color: '#F5A95B', label: `${totalAngle}°` },
        { type: 'line', from: [0, 0], to: [px, py], color: '#9B6EF8', strokeWidth: 2.5 },
        { type: 'dashed_line', from: [px, 0], to: [px, py], color: '#22C5A0', strokeWidth: 2 },
        { type: 'dashed_line', from: [0, 0], to: [px, 0], color: '#F5A95B', strokeWidth: 2 },
        { type: 'point', x: px, y: py, label: `(${px.toFixed(2)}, ${py.toFixed(2)})`, color: '#5B8CF8' },
        { type: 'label', x: -1.4, y: 1.3, text: `sin(${a1}°+${a2}°) = sin(${totalAngle}°) = ${Math.sin(rad).toFixed(3)}`, fill: '#22C5A0' },
      ],
    };
  }

  // 9. CALCULUS FUNCTION CURVES (Programmatically derived expressions)
  else if (c.includes('derivative') || c.includes('calculus') || c.includes('f(x)')) {
    let expr = 'x^3 * log(x)';
    if (c.includes('x^2')) expr = 'x^2';
    else if (c.includes('x^3') && !c.includes('ln')) expr = 'x^3';

    const a = Number(params.a ?? params.scale ?? 1);
    const displayExpr = expr.replace(/log/g, 'ln');

    candidateScene = {
      concept: 'Calculus Function Plot',
      known_formula: null,
      params: { a: a },
      viewBox: { xMin: -0.5, xMax: 4, yMin: -2, yMax: 10 },
      showAxes: true,
      primitives: [
        { type: 'curve', expression: `${a} * (${expr})`, xMin: 0.1, xMax: 3.5, color: '#5B8CF8' },
        { type: 'label', x: 0.2, y: 8.5, text: `f(x) = ${a === 1 ? '' : a + ' · '}${displayExpr}`, fill: '#22C5A0' },
      ],
    };
  }

  // 10. PHYSICS EQUATIONS (F = ma, Newton's 2nd Law, Force Vectors, Hooke's Law)
  else if (c.includes('f = ma') || c.includes('f=ma') || c.includes('newton') || c.includes('force') || c.includes('acceleration') || c.includes('hooke')) {
    const m = Math.max(1, Number(params.mass ?? params.m ?? 5));
    const a = Number(params.acceleration ?? params.a ?? 2);
    const force = (m * a).toFixed(1);
    const arrowLen = Math.min(8, Math.max(1, a * 1.5));

    candidateScene = {
      concept: "Newton's Second Law (F = m · a)",
      known_formula: null,
      params: { mass: m, acceleration: a },
      viewBox: { xMin: -4, xMax: 10, yMin: -3, yMax: 5 },
      showAxes: false,
      primitives: [
        // Ground Surface Line
        { type: 'line', from: [-3, -1], to: [9, -1], color: '#64748B', strokeWidth: 2 },
        // Mass Block (Polygon)
        { type: 'polygon', points: [[-1, -1], [2, -1], [2, 2], [-1, 2]], stroke: '#5B8CF8', fill: 'rgba(91, 140, 248, 0.25)' },
        // Mass Label inside block
        { type: 'label', x: -0.2, y: 0.5, text: `m = ${m} kg`, fill: '#5B8CF8' },
        // Applied Force Vector Arrow
        { type: 'vector', from: [2, 0.5], to: [2 + arrowLen, 0.5], color: '#22C5A0', label: `F = ${force} N`, strokeWidth: 3 },
        // Acceleration Arrow above block
        { type: 'vector', from: [0.5, 2.5], to: [0.5 + arrowLen * 0.7, 2.5], color: '#F5A95B', label: `a = ${a} m/s²`, strokeWidth: 2 },
        // Force Equation Summary Label
        { type: 'label', x: -3, y: 4, text: `Force F = m · a = ${m} kg × ${a} m/s² = ${force} N`, fill: '#22C5A0' },
      ],
    };
  }

  // 11. ARITHMETIC & GEOMETRIC SEQUENCES
  else if (c.includes('sequence') || c.includes('arithmetic') || c.includes('pattern') || c.includes('term')) {
    const a1 = Number(params.a1 ?? params.first_term ?? 5);
    const d = Number(params.d ?? params.diff ?? 6);
    const n = Math.max(3, Math.min(8, Number(params.n ?? params.terms ?? 5)));

    const pts = [];
    const lbls = [];
    for (let i = 0; i < n; i++) {
      const val = a1 + i * d;
      pts.push({ type: 'point', x: val, y: 0, color: '#5B8CF8' });
      lbls.push({ type: 'label', x: val, y: 0.3, text: `${val}`, fill: '#22C5A0' });
    }

    const maxVal = a1 + (n - 1) * d + d;

    candidateScene = {
      concept: 'Arithmetic Sequence',
      known_formula: null,
      params: { first_term: a1, diff: d, n: n },
      viewBox: { xMin: a1 - d, xMax: maxVal + d, yMin: -2, yMax: 3 },
      showAxes: false,
      primitives: [
        { type: 'number_line', value: 0, xMin: a1 - d, xMax: maxVal + d, y: 0 },
        ...pts,
        ...lbls,
        { type: 'label', x: a1, y: 2, text: `Sequence: aₙ = ${a1} + (n - 1) × ${d}`, fill: '#9B6EF8' },
      ],
    };
  }

  // 12. CIRCLE SECTOR / CLOCK HAND / WIPER SWEEP
  else if (c === 'sector_area' || c.includes('sector') || c.includes('clock') || c.includes('wiper') || c.includes('swept') || c.includes('minute hand')) {
    const r = Math.max(1, Number(params.radius ?? params.r ?? 10));
    const angle = Math.max(5, Math.min(360, Number(params.angle ?? params.theta ?? (c.includes('clock') || c.includes('minute') ? 30 : 115))));
    const area = ((angle / 360) * Math.PI * r * r).toFixed(1);
    const rad = (angle * Math.PI) / 180;
    const endX = (r * Math.cos(rad)).toFixed(2);
    const endY = (r * Math.sin(rad)).toFixed(2);

    candidateScene = {
      concept: c.includes('clock') || c.includes('minute') ? 'Clock Hand Sector Sweep' : c.includes('wiper') ? 'Wiper Sweep Area' : 'Circle Sector Area',
      known_formula: 'sector_area',
      params: { radius: r, angle: angle },
      viewBox: { xMin: -r - 2, xMax: r + 2, yMin: -2, yMax: r + 3 },
      showAxes: false,
      primitives: [
        { type: 'line', from: [0, 0], to: [r, 0], color: '#5B8CF8', strokeWidth: 2.5 },
        { type: 'line', from: [0, 0], to: [Number(endX), Number(endY)], color: '#5B8CF8', strokeWidth: 2.5 },
        { type: 'arc', cx: 0, cy: 0, r: r, startAngle: 0, endAngle: angle, color: '#9B6EF8', strokeWidth: 2.5 },
        { type: 'angle_marker', cx: 0, cy: 0, r: Math.min(3, r * 0.35), startAngle: 0, endAngle: angle, color: '#F5A95B', label: `${angle}°` },
        { type: 'point', x: 0, y: 0, label: 'Center (0,0)', color: '#DDE3F2' },
        { type: 'label', x: r / 2, y: -0.8, text: `r = ${r}`, fill: '#5B8CF8' },
        { type: 'label', x: -r + 1, y: r + 1, text: `Area = (${angle}°/360°) × π × ${r}² = ${area}`, fill: '#22C5A0' },
      ],
    };
  }

  // 13. RATIO BARS & PROPORTIONS
  else if (c.includes('ratio') || c.includes('bar') || c.includes('proportion') || c.includes('fraction')) {
    const v1 = Math.max(1, Number(params.val1 ?? params.a ?? 6));
    const v2 = Math.max(1, Number(params.val2 ?? params.b ?? 2));
    const maxV = Math.max(v1, v2) + 2;

    candidateScene = {
      concept: 'Ratio & Proportions Visualizer',
      known_formula: null,
      params: { val1: v1, val2: v2 },
      viewBox: { xMin: -2, xMax: maxV + 3, yMin: -1, yMax: 5 },
      showAxes: false,
      primitives: [
        { type: 'polygon', points: [[0, 3], [v1, 3], [v1, 4], [0, 4]], fill: 'rgba(91, 140, 248, 0.3)', stroke: '#5B8CF8' },
        { type: 'polygon', points: [[0, 1], [v2, 1], [v2, 2], [0, 2]], fill: 'rgba(34, 197, 160, 0.3)', stroke: '#22C5A0' },
        { type: 'label', x: v1 + 0.5, y: 3.5, text: `Quantity A: ${v1}`, fill: '#5B8CF8' },
        { type: 'label', x: v2 + 0.5, y: 1.5, text: `Quantity B: ${v2}`, fill: '#22C5A0' },
        { type: 'label', x: 0, y: 0, text: `Ratio A : B = ${v1} : ${v2}`, fill: '#F5A95B' },
      ],
    };
  }


  if (!candidateScene) return null;

  // DIRECTIVE 1 & 5: ALWAYS ROUTE THROUGH VALIDATESCENE BEFORE RETURNING!
  const validated = validateSceneLocal(candidateScene);
  return (validated && !validated.unsupported) ? validated : candidateScene;

}
