// Deterministic Math Formula Registry
// Computes real math values from raw parameters. NEVER trusts numbers from AI.

export const FORMULA_REGISTRY = {
  cube_tsa: (p) => {
    const s = Number(p.side || p.l || p.s || 6);
    const tsa = (6 * s * s).toFixed(1);
    const vol = Math.pow(s, 3).toFixed(1);
    return { label: 'Cube Total Surface Area', value: `${tsa} (Vol: ${vol})` };
  },
  cuboid_tsa: (p) => {
    const l = Number(p.l || p.length || 8);
    const w = Number(p.w || p.width || 5);
    const h = Number(p.h || p.height || 10);
    const tsa = (2 * (l * w + l * h + w * h)).toFixed(1);
    const vol = (l * w * h).toFixed(1);
    return { label: 'Cuboid Total Surface Area', value: `${tsa} (Vol: ${vol})` };
  },
  cylinder_tsa: (p) => {
    const r = Number(p.radius || p.r || 7);
    const h = Number(p.height || p.h || 14);
    const tsa = (2 * Math.PI * r * h + 2 * Math.PI * r * r).toFixed(1);
    const vol = (Math.PI * r * r * h).toFixed(1);
    return { label: 'Cylinder Surface Area', value: `${tsa} (Vol: ${vol})` };
  },
  cone_tsa: (p) => {
    const r = Number(p.radius || p.r || 6);
    const h = Number(p.height || p.h || 10);
    const l = Math.sqrt(r * r + h * h);
    const tsa = (Math.PI * r * l + Math.PI * r * r).toFixed(1);
    const vol = ((1 / 3) * Math.PI * r * r * h).toFixed(1);
    return { label: 'Cone Total Surface Area', value: `${tsa} (Vol: ${vol})` };
  },
  sphere_tsa: (p) => {
    const r = Number(p.radius || p.r || 7);
    const sa = (4 * Math.PI * r * r).toFixed(1);
    const vol = ((4 / 3) * Math.PI * Math.pow(r, 3)).toFixed(1);
    return { label: 'Sphere Surface Area', value: `${sa} (Vol: ${vol})` };
  },
  hemisphere_tsa: (p) => {
    const r = Number(p.radius || p.r || 7);
    const sa = (3 * Math.PI * r * r).toFixed(1);
    const vol = ((2 / 3) * Math.PI * Math.pow(r, 3)).toFixed(1);
    return { label: 'Hemisphere Total Surface Area', value: `${sa} (Vol: ${vol})` };
  },
  sector_area: (p) => {
    const r = Number(p.radius || p.r || 10);
    const a = Number(p.angle || 30);
    const area = ((a / 360) * Math.PI * r * r).toFixed(1);
    return { label: 'Circle Sector Area', value: `${area}` };
  },
  trapezoid_area: (p) => {
    const a = Number(p.a || p.baseA || 8);
    const b = Number(p.b || p.baseB || 6);
    const h = Number(p.h || p.height || 5);
    const area = (0.5 * (a + b) * h).toFixed(1);
    return { label: 'Trapezoid Area', value: `${area}` };
  },
  triangle_area: (p) => {
    const b = Number(p.base || p.b || 6);
    const h = Number(p.height || p.h || 8);
    const area = (0.5 * b * h).toFixed(1);
    return { label: 'Triangle Area', value: `${area}` };
  },
  quadratic_roots: (p) => {
    const a = Number(p.a !== undefined ? p.a : 1);
    const b = Number(p.b !== undefined ? p.b : 0);
    const c = Number(p.c !== undefined ? p.c : -4);
    const d = b * b - 4 * a * c;
    if (d < 0) return { label: 'Quadratic Equation Roots', value: 'No Real Roots' };
    const r1 = ((-b + Math.sqrt(d)) / (2 * a)).toFixed(2);
    const r2 = ((-b - Math.sqrt(d)) / (2 * a)).toFixed(2);
    return { label: 'Quadratic Roots', value: `x₁ = ${r1}, x₂ = ${r2}` };
  },
  pyramid_vol: (p) => {
    const s = Number(p.base_side || p.side || p.a || 6);
    const h = Number(p.height || p.h || 8);
    const vol = ((1 / 3) * s * s * h).toFixed(1);
    const slantH = Math.sqrt((s * s) / 4 + h * h);
    const sa = (s * s + 2 * s * slantH).toFixed(1);
    return { label: 'Square Pyramid Volume', value: `${vol} (Surface Area: ${sa})` };
  }
};

// Dynamic Fallback Math Formula Evaluator for non-registry formulas
function dynamicEvaluateFormula(key, params) {
  if (!params || typeof params !== 'object') return null;

  const r = Number(params.radius || params.r);
  const h = Number(params.height || params.h);
  const l = Number(params.l || params.length);
  const w = Number(params.w || params.width);
  const a = Number(params.a || params.baseA || params.base);
  const b = Number(params.b || params.baseB);
  const angle = Number(params.angle);

  // Generic 3D surface area & volume evaluation
  if (Number.isFinite(r) && Number.isFinite(h)) {
    const sa = (2 * Math.PI * r * h + 2 * Math.PI * r * r).toFixed(1);
    const vol = (Math.PI * r * r * h).toFixed(1);
    return { label: 'Dynamic Cylinder / Surface Model', value: `Surface Area: ${sa}, Vol: ${vol}` };
  }

  if (Number.isFinite(l) && Number.isFinite(w) && Number.isFinite(h)) {
    const sa = (2 * (l * w + l * h + w * h)).toFixed(1);
    const vol = (l * w * h).toFixed(1);
    return { label: 'Dynamic Box Model', value: `Surface Area: ${sa}, Vol: ${vol}` };
  }

  if (Number.isFinite(r) && Number.isFinite(angle)) {
    const area = ((angle / 360) * Math.PI * r * r).toFixed(1);
    const arcLen = ((angle / 360) * 2 * Math.PI * r).toFixed(1);
    return { label: 'Dynamic Sector Model', value: `Area: ${area}, Arc Length: ${arcLen}` };
  }

  if (Number.isFinite(a) && Number.isFinite(h)) {
    const area = (0.5 * a * h).toFixed(1);
    return { label: 'Dynamic Triangle / Shape Model', value: `Area: ${area}` };
  }

  if (Number.isFinite(a) && Number.isFinite(b)) {
    const area = (a * b).toFixed(1);
    return { label: 'Dynamic Area Model', value: `Area: ${area}` };
  }

  return null;
}

export function lookupFormula(key, params) {
  if (!key) return dynamicEvaluateFormula('generic', params);
  
  if (FORMULA_REGISTRY[key]) {
    try {
      return FORMULA_REGISTRY[key](params || {});
    } catch (err) {
      console.warn(`[Formula Registry] Calculation error for ${key}:`, err);
    }
  }

  return dynamicEvaluateFormula(key, params);
}

