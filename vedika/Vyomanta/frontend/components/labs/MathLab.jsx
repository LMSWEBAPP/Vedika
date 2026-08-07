'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Calculator, Edit3, Eraser, Trash2, RotateCcw, Play, Sparkles,
  Sliders, Activity, HelpCircle, Compass, Zap, Lightbulb, ChevronRight,
  TrendingUp, Circle, Triangle, Layers, ZoomIn, ZoomOut, RefreshCw, Send, Image as ImageIcon,
  Crop, Mic, MicOff, Square, CheckCircle2, Award, Box, Volume2
} from 'lucide-react';
import { T } from '@/lib/lms-data';

// Preprocess LaTeX math syntax into clean formatted unicode math
function cleanMathLaTeX(text) {
  if (!text) return '';
  return text
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1 / $2)')
    .replace(/\\theta/g, 'θ')
    .replace(/\\pi/g, 'π')
    .replace(/\\approx/g, '≈')
    .replace(/\\times/g, '×')
    .replace(/\\cdot/g, '·')
    .replace(/\^\circ/g, '°')
    .replace(/\\text\{([^}]+)\}/g, '$1')
    .replace(/\\left|\\right/g, '')
    .replace(/\$\$/g, '\n\n$$$\n')
    .replace(/\\\$/g, '$');
}

// Helper parser to dynamically extract slope, quadratic, or general expression parameters
function parseMathEquation(rawEq, modeFromAI, paramsFromAI) {
  if (!rawEq) return { eqText: 'y = x + 1', mode: 'linear', a: 1, b: 0, c: 1, d: 0 };

  const clean = rawEq.replace(/\s+/g, '').toLowerCase();

  const linMatch = clean.match(/y=([+\-]?\d*\.?\d*)x([+\-]\d+\.?\d*)?/i);
  if (linMatch || modeFromAI === 'linear') {
    let a = 1;
    let c = 1;

    if (linMatch) {
      const mStr = linMatch[1];
      if (mStr === '' || mStr === '+') a = 1;
      else if (mStr === '-') a = -1;
      else {
        const parsedVal = parseFloat(mStr);
        if (!isNaN(parsedVal)) a = parsedVal;
      }

      if (linMatch[2]) {
        const parsedC = parseFloat(linMatch[2]);
        if (!isNaN(parsedC)) c = parsedC;
      }
    } else if (paramsFromAI) {
      if (paramsFromAI.a !== undefined) a = paramsFromAI.a;
      if (paramsFromAI.c !== undefined) c = paramsFromAI.c;
    }

    const formattedEq = `y = ${a === 1 ? '' : a === -1 ? '-' : a}x ${c >= 0 ? '+ ' + c : '- ' + Math.abs(c)}`;
    return { eqText: formattedEq, mode: 'linear', a, b: 0, c, d: 0 };
  }

  const quadMatch = clean.match(/y=([+\-]?\d*\.?\d*)x\^2([+\-]\d*\.?\d*x)?([+\-]\d+\.?\d*)?/i);
  if (quadMatch || modeFromAI === 'quadratic') {
    let a = 1, c = -4;
    if (quadMatch) {
      const aStr = quadMatch[1];
      if (aStr === '' || aStr === '+') a = 1;
      else if (aStr === '-') a = -1;
      else {
        const pA = parseFloat(aStr);
        if (!isNaN(pA)) a = pA;
      }
      if (quadMatch[3]) {
        const pC = parseFloat(quadMatch[3]);
        if (!isNaN(pC)) c = pC;
      }
    } else if (paramsFromAI) {
      if (paramsFromAI.a !== undefined) a = paramsFromAI.a;
      if (paramsFromAI.c !== undefined) c = paramsFromAI.c;
    }
    return { eqText: `y = ${a !== 1 ? a : ''}x² ${c >= 0 ? '+ ' + c : '- ' + Math.abs(c)}`, mode: 'quadratic', a, b: 0, c, d: 0 };
  }

  return {
    eqText: rawEq,
    mode: modeFromAI || 'linear',
    a: paramsFromAI?.a !== undefined ? paramsFromAI.a : 1,
    b: paramsFromAI?.b !== undefined ? paramsFromAI.b : 0,
    c: paramsFromAI?.c !== undefined ? paramsFromAI.c : 1,
    d: paramsFromAI?.d !== undefined ? paramsFromAI.d : 0
  };
}

// ----------------------------------------------------
// DYNAMIC TEXTBOOK MATH VISUALIZER CANVAS COMPONENT
// ----------------------------------------------------
function DynamicMathVisualizer({ spec }) {
  if (!spec || !spec.type) return null;

  const [params, setParams] = useState(spec.params || {});

  useEffect(() => {
    if (spec.params) setParams(spec.params);
  }, [spec]);

  const updateParam = (key, val) => {
    setParams(prev => ({ ...prev, [key]: parseFloat(val) }));
  };

  return (
    <div style={{
      marginTop: 20,
      background: '#07080F',
      borderRadius: 14,
      border: '1px solid rgba(139, 92, 246, 0.3)',
      padding: 20,
      boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <Box size={20} color="#8B5CF6" />
        <h4 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#FFF' }}>
          {spec.title || 'Dynamic Math Visualizer'}
        </h4>
        <span style={{ fontSize: 11, background: 'rgba(139, 92, 246, 0.2)', color: '#C4B5FD', padding: '2px 8px', borderRadius: 12 }}>
          Interactive Canvas
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20, alignItems: 'center' }}>
        {/* SVG VISUALIZER CANVAS */}
        <div style={{ background: '#0D1117', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', padding: 16, textAlign: 'center' }}>
          <svg width={380} height={260} style={{ background: '#07080F', borderRadius: 8 }}>
            
            {/* 1. TRIANGLE VISUALIZER */}
            {spec.type === 'triangle' && (() => {
              const base = params.base || 6;
              const height = params.height || 8;
              const ox = 60, oy = 210;
              const scale = Math.min(240 / Math.max(base, 1), 160 / Math.max(height, 1));

              const bx = base * scale;
              const hy = height * scale;
              const hypotenuse = Math.sqrt(base * base + height * height).toFixed(2);
              const area = (0.5 * base * height).toFixed(2);

              return (
                <g>
                  <line x1={0} y1={oy} x2={380} y2={oy} stroke="rgba(255,255,255,0.1)" />
                  <line x1={ox} y1={0} x2={ox} y2={260} stroke="rgba(255,255,255,0.1)" />

                  <polygon
                    points={`${ox},${oy} ${ox + bx},${oy} ${ox},${oy - hy}`}
                    fill="rgba(139, 92, 246, 0.25)"
                    stroke="#8B5CF6"
                    strokeWidth="3"
                  />

                  <path d={`M ${ox + 12},${oy} L ${ox + 12},${oy - 12} L ${ox},${oy - 12}`} fill="none" stroke="#FFF" strokeWidth="1.5" />

                  <text x={ox + bx / 2} y={oy + 18} fill="#06B6D4" fontSize="12" fontWeight="bold" textAnchor="middle">
                    Base = {base}
                  </text>
                  <text x={ox - 16} y={oy - hy / 2} fill="#F59E0B" fontSize="12" fontWeight="bold" textAnchor="middle">
                    Height = {height}
                  </text>
                  <text x={ox + bx / 2 + 10} y={oy - hy / 2 - 6} fill="#EC4899" fontSize="12" fontWeight="bold">
                    c = {hypotenuse}
                  </text>

                  <rect x={180} y={20} width={180} height={36} rx={8} fill="rgba(16, 185, 129, 0.2)" stroke="#10B981" />
                  <text x={270} y={42} fill="#10B981" fontSize="13" fontWeight="bold" textAnchor="middle">
                    Area = ½ × b × h = {area}
                  </text>
                </g>
              );
            })()}

            {/* 2. CIRCLE SECTOR VISUALIZER */}
            {(spec.type === 'sector' || spec.type === 'circle_sector') && (() => {
              const r = params.radius || 10;
              const angle = params.angle || 30;
              const cx = 190, cy = 140;
              const scale = Math.min(100 / Math.max(r, 1), 18);
              const cr = r * scale;

              const rad = (angle * Math.PI) / 180;
              const x2 = cx + cr * Math.cos(rad);
              const y2 = cy - cr * Math.sin(rad);
              const largeArc = angle > 180 ? 1 : 0;
              const sectorPath = `M ${cx},${cy} L ${cx + cr},${cy} A ${cr} ${cr} 0 ${largeArc} 0 ${x2},${y2} Z`;
              const sectorArea = ((angle / 360) * Math.PI * r * r).toFixed(2);

              return (
                <g>
                  <circle cx={cx} cy={cy} r={cr} fill="none" stroke="rgba(255,255,255,0.15)" strokeDasharray="4" />
                  <path d={sectorPath} fill="rgba(139, 92, 246, 0.35)" stroke="#8B5CF6" strokeWidth="3" />
                  <line x1={cx} y1={cy} x2={cx + cr} y2={cy} stroke="#06B6D4" strokeWidth="2.5" />
                  <line x1={cx} y1={cy} x2={x2} y2={y2} stroke="#EC4899" strokeWidth="2.5" />
                  <circle cx={cx} cy={cy} r={4} fill="#FFF" />

                  <text x={cx + 20} y={cy - 6} fill="#F59E0B" fontSize="12" fontWeight="bold">θ = {angle}°</text>
                  <text x={cx + cr / 2} y={cy + 16} fill="#06B6D4" fontSize="12" fontWeight="bold">r = {r}</text>

                  <rect x={180} y={15} width={185} height={36} rx={8} fill="rgba(139, 92, 246, 0.2)" stroke="#8B5CF6" />
                  <text x={272.5} y={37} fill="#A78BFA" fontSize="13" fontWeight="bold" textAnchor="middle">
                    Sector Area = {sectorArea}
                  </text>
                </g>
              );
            })()}

            {/* 3. SOLID SURFACE AREA VISUALIZER */}
            {(spec.type === 'solid_surface' || spec.type === '3d_surface') && (() => {
              const r = params.radius || 7;
              const h = params.height || 14;
              const cx = 190, cy = 130;
              const cr = 45;
              const ch = 80;

              const tsa = (2 * Math.PI * r * h + 2 * Math.PI * r * r).toFixed(1);

              return (
                <g>
                  <rect x={cx - cr} y={cy - ch / 2} width={cr * 2} height={ch} fill="rgba(139, 92, 246, 0.2)" stroke="#8B5CF6" strokeWidth="2.5" />
                  <ellipse cx={cx} cy={cy - ch / 2} rx={cr} ry={14} fill="rgba(236, 72, 153, 0.3)" stroke="#EC4899" strokeWidth="2" />
                  <ellipse cx={cx} cy={cy + ch / 2} rx={cr} ry={14} fill="rgba(139, 92, 246, 0.3)" stroke="#8B5CF6" strokeWidth="2" />

                  <line x1={cx - cr - 15} y1={cy - ch / 2} x2={cx - cr - 15} y2={cy + ch / 2} stroke="#F59E0B" strokeWidth="2" strokeDasharray="4" />
                  <text x={cx - cr - 25} y={cy} fill="#F59E0B" fontSize="11" fontWeight="bold" textAnchor="end">h = {h}</text>

                  <line x1={cx} y1={cy - ch / 2} x2={cx + cr} y2={cy - ch / 2} stroke="#06B6D4" strokeWidth="2" />
                  <text x={cx + cr / 2} y={cy - ch / 2 - 6} fill="#06B6D4" fontSize="11" fontWeight="bold" textAnchor="middle">r = {r}</text>

                  <rect x={180} y={15} width={185} height={36} rx={8} fill="rgba(16, 185, 129, 0.2)" stroke="#10B981" />
                  <text x={272.5} y={37} fill="#10B981" fontSize="12" fontWeight="bold" textAnchor="middle">
                    Surface Area = {tsa}
                  </text>
                </g>
              );
            })()}

            {/* 4. FULL CIRCLE VISUALIZER */}
            {spec.type === 'circle' && (() => {
              const r = params.radius || 5;
              const cx = 190, cy = 130;
              const scale = Math.min(100 / Math.max(r, 1), 18);
              const cr = r * scale;

              const area = (Math.PI * r * r).toFixed(2);
              const perimeter = (2 * Math.PI * r).toFixed(2);

              return (
                <g>
                  <circle cx={cx} cy={cy} r={cr} fill="rgba(236, 72, 153, 0.2)" stroke="#EC4899" strokeWidth="3" />
                  <circle cx={cx} cy={cy} r={4} fill="#FFF" />
                  <line x1={cx} y1={cy} x2={cx + cr} y2={cy} stroke="#F59E0B" strokeWidth="2.5" strokeDasharray="4" />
                  <text x={cx + cr / 2} y={cy - 8} fill="#F59E0B" fontSize="12" fontWeight="bold" textAnchor="middle">
                    r = {r}
                  </text>

                  <rect x={20} y={15} width={140} height={50} rx={8} fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)" />
                  <text x={30} y={35} fill="#EC4899" fontSize="12" fontWeight="bold">Area = πr² = {area}</text>
                  <text x={30} y={52} fill="#06B6D4" fontSize="12" fontWeight="bold">Perimeter = {perimeter}</text>
                </g>
              );
            })()}

            {/* 5. AREA UNDER CURVE VISUALIZER */}
            {spec.type === 'area_under_curve' && (() => {
              const a = params.a !== undefined ? params.a : 0;
              const b = params.b !== undefined ? params.b : 3;
              const cx = 80, cy = 200, scaleX = 40, scaleY = 15;

              const f = (x) => (params.func === '2x+1' ? 2 * x + 1 : x * x);
              const points = [];
              for (let x = -1; x <= 4; x += 0.1) {
                const px = cx + x * scaleX;
                const py = cy - f(x) * scaleY;
                points.push(`${px},${py}`);
              }

              const fillPoints = [];
              fillPoints.push(`${cx + a * scaleX},${cy}`);
              for (let x = a; x <= b; x += 0.1) {
                fillPoints.push(`${cx + x * scaleX},${cy - f(x) * scaleY}`);
              }
              fillPoints.push(`${cx + b * scaleX},${cy}`);

              const calcArea = params.func === '2x+1' ? (b * b + b) - (a * a + a) : (Math.pow(b, 3) / 3 - Math.pow(a, 3) / 3);

              return (
                <g>
                  <line x1={0} y1={cy} x2={380} y2={cy} stroke="rgba(255,255,255,0.2)" />
                  <line x1={cx} y1={0} x2={cx} y2={260} stroke="rgba(255,255,255,0.2)" />

                  <polygon points={fillPoints.join(' ')} fill="rgba(16, 185, 129, 0.35)" stroke="none" />
                  <path d={`M ${points.join(' L ')}`} fill="none" stroke="#8B5CF6" strokeWidth="3" />

                  <line x1={cx + a * scaleX} y1={cy} x2={cx + a * scaleX} y2={cy - f(a) * scaleY} stroke="#F59E0B" strokeWidth="2" strokeDasharray="3" />
                  <line x1={cx + b * scaleX} y1={cy} x2={cx + b * scaleX} y2={cy - f(b) * scaleY} stroke="#F59E0B" strokeWidth="2" strokeDasharray="3" />

                  <text x={cx + a * scaleX} y={cy + 15} fill="#F59E0B" fontSize="11" fontWeight="bold">a={a}</text>
                  <text x={cx + b * scaleX} y={cy + 15} fill="#F59E0B" fontSize="11" fontWeight="bold">b={b}</text>

                  <rect x={220} y={15} width={145} height={40} rx={8} fill="rgba(16, 185, 129, 0.2)" stroke="#10B981" />
                  <text x={292} y={38} fill="#10B981" fontSize="12" fontWeight="bold" textAnchor="middle">
                    ∫ Area = {calcArea.toFixed(2)}
                  </text>
                </g>
              );
            })()}

            {/* DEFAULT FALLBACK SHAPE */}
            {(!['triangle', 'circle', 'sector', 'circle_sector', 'solid_surface', '3d_surface', 'area_under_curve'].includes(spec.type)) && (
              <g>
                <rect x={90} y={50} width={200} height={140} rx={12} fill="rgba(139,92,246,0.2)" stroke="#8B5CF6" strokeWidth="3" />
                <text x={190} y={125} fill="#FFF" fontSize="14" fontWeight="bold" textAnchor="middle">
                  {spec.title || 'Dynamic Diagram'}
                </text>
              </g>
            )}
          </svg>
        </div>

        {/* PARAMETER SLIDERS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, background: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#A78BFA', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sliders size={14} /> Dynamic Controls
          </span>

          {spec.type === 'triangle' && (
            <>
              <div>
                <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Base:</span> <b>{params.base || 6}</b>
                </label>
                <input type="range" min="1" max="15" value={params.base || 6} onChange={(e) => updateParam('base', e.target.value)} style={{ width: '100%', accentColor: '#06B6D4' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Height:</span> <b>{params.height || 8}</b>
                </label>
                <input type="range" min="1" max="15" value={params.height || 8} onChange={(e) => updateParam('height', e.target.value)} style={{ width: '100%', accentColor: '#F59E0B' }} />
              </div>
            </>
          )}

          {(spec.type === 'sector' || spec.type === 'circle_sector') && (
            <>
              <div>
                <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Radius r:</span> <b>{params.radius || 10}</b>
                </label>
                <input type="range" min="5" max="50" value={params.radius || 10} onChange={(e) => updateParam('radius', e.target.value)} style={{ width: '100%', accentColor: '#06B6D4' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Angle θ:</span> <b>{params.angle || 30}°</b>
                </label>
                <input type="range" min="5" max="355" step="5" value={params.angle || 30} onChange={(e) => updateParam('angle', e.target.value)} style={{ width: '100%', accentColor: '#F59E0B' }} />
              </div>
            </>
          )}

          {(spec.type === 'solid_surface' || spec.type === '3d_surface') && (
            <>
              <div>
                <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Radius r:</span> <b>{params.radius || 7}</b>
                </label>
                <input type="range" min="1" max="20" value={params.radius || 7} onChange={(e) => updateParam('radius', e.target.value)} style={{ width: '100%', accentColor: '#06B6D4' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Height h:</span> <b>{params.height || 14}</b>
                </label>
                <input type="range" min="2" max="40" value={params.height || 14} onChange={(e) => updateParam('height', e.target.value)} style={{ width: '100%', accentColor: '#F59E0B' }} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Custom Markdown Math Renderer with styled formula pills & cards
function CustomMathMarkdown({ content }) {
  const formatted = cleanMathLaTeX(content);

  return (
    <div style={{ fontSize: 15, lineHeight: 1.8, color: '#E5E7EB' }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h3: ({ children }) => (
            <h3 style={{ fontSize: 17, fontWeight: 700, color: '#A78BFA', marginTop: 18, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6, borderBottom: '1px solid rgba(139, 92, 246, 0.2)', paddingBottom: 6 }}>
              <Zap size={16} /> {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 style={{ fontSize: 15, fontWeight: 700, color: '#F472B6', marginTop: 14, marginBottom: 6 }}>
              {children}
            </h4>
          ),
          code: ({ inline, children }) => {
            const str = String(children);
            if (inline) {
              return (
                <span style={{
                  fontFamily: 'monospace',
                  background: 'rgba(139, 92, 246, 0.18)',
                  color: '#F472B6',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  padding: '2px 8px',
                  borderRadius: 6,
                  fontWeight: 700,
                  fontSize: 14
                }}>
                  {str}
                </span>
              );
            }
            return (
              <div style={{
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(236, 72, 153, 0.15) 100%)',
                border: '1px solid rgba(139, 92, 246, 0.4)',
                borderRadius: 12,
                padding: '14px 20px',
                margin: '14px 0',
                textAlign: 'center',
                color: '#C4B5FD',
                fontWeight: 800,
                fontSize: 17,
                fontFamily: 'monospace',
                boxShadow: '0 4px 16px rgba(139, 92, 246, 0.2)'
              }}>
                {str}
              </div>
            );
          },
          p: ({ children }) => {
            const str = String(children);
            if (str.startsWith('Problem ') || str.startsWith('Step ')) {
              return (
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderLeft: '3px solid #8B5CF6', padding: '10px 14px', borderRadius: '0 8px 8px 0', margin: '10px 0' }}>
                  {children}
                </div>
              );
            }
            return <p style={{ margin: '8px 0' }}>{children}</p>;
          }
        }}
      >
        {formatted}
      </ReactMarkdown>
    </div>
  );
}

// ----------------------------------------------------
// MAIN MATH LAB COMPONENT
// ----------------------------------------------------
export default function MathLab() {
  const [activeTab, setActiveTab] = useState('whiteboard');
  const [visualizerSubTab, setVisualizerSubTab] = useState('pythagoras');

  // Whiteboard State
  const canvasRef = useRef(null);
  const cropStartRef = useRef({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawTool, setDrawTool] = useState('pen');
  const [penColor, setPenColor] = useState('#FFFFFF');
  const [penWidth, setPenWidth] = useState(4);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [cropBox, setCropBox] = useState({ x: 0, y: 0, w: 0, h: 0, isSelecting: false, isSelected: false });

  // Equation State
  const [equationText, setEquationText] = useState('y = x + 1');
  const [recognizedText, setRecognizedText] = useState('');
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [aiExplanation, setAiExplanation] = useState('');

  // Graph State
  const [paramA, setParamA] = useState(1);
  const [paramB, setParamB] = useState(0);
  const [paramC, setParamC] = useState(1);
  const [paramD, setParamD] = useState(0);
  const [plotMode, setPlotMode] = useState('linear');
  const graphCanvasRef = useRef(null);
  const [zoomScale, setZoomScale] = useState(30);
  const [hoverCoord, setHoverCoord] = useState(null);

  // AI Tutor & Continuous Voice State
  const [tutorQuery, setTutorQuery] = useState('');
  const [tutorResponse, setTutorResponse] = useState('');
  const [isTutorThinking, setIsTutorThinking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [parsedVisualSpec, setParsedVisualSpec] = useState(null);
  const recognitionRef = useRef(null);

  // Visualizer Parameters
  const [pythA, setPythA] = useState(6);
  const [pythB, setPythB] = useState(8);
  const [trigAngle, setTrigAngle] = useState(45);
  const [calcX0, setCalcX0] = useState(1.5);
  const [calcFunc, setCalcFunc] = useState('quadratic');
  const [vecU, setVecU] = useState({ x: 4, y: 3 });
  const [vecV, setVecV] = useState({ x: -2, y: 5 });

  // ----------------------------------------------------
  // WHITEBOARD & CROPPING
  // ----------------------------------------------------
  useEffect(() => {
    if (activeTab !== 'whiteboard') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!hasDrawn) clearWhiteboard();
  }, [activeTab]);

  const clearWhiteboard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0D1117';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    const gridStep = 24;
    for (let x = gridStep; x < canvas.width; x += gridStep) {
      for (let y = gridStep; y < canvas.height; y += gridStep) {
        ctx.beginPath();
        ctx.arc(x, y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    setHasDrawn(false);
    setRecognizedText('');
    setCropBox({ x: 0, y: 0, w: 0, h: 0, isSelecting: false, isSelected: false });
  };

  const clearCropSelection = () => {
    setCropBox({ x: 0, y: 0, w: 0, h: 0, isSelecting: false, isSelected: false });
  };

  const switchTool = (tool) => {
    setDrawTool(tool);
    if (tool !== 'select') clearCropSelection();
  };

  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height)
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const coords = getCanvasCoords(e);
    setIsDrawing(true);

    if (drawTool === 'select') {
      cropStartRef.current = { x: coords.x, y: coords.y };
      setCropBox({ x: coords.x, y: coords.y, w: 0, h: 0, isSelecting: true, isSelected: false });
    } else {
      clearCropSelection();
      setHasDrawn(true);
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
    }
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const coords = getCanvasCoords(e);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (drawTool === 'select' && cropBox.isSelecting) {
      const x = Math.min(cropStartRef.current.x, coords.x);
      const y = Math.min(cropStartRef.current.y, coords.y);
      const w = Math.abs(coords.x - cropStartRef.current.x);
      const h = Math.abs(coords.y - cropStartRef.current.y);
      setCropBox({ x, y, w, h, isSelecting: true, isSelected: false });
    } else {
      if (drawTool === 'eraser') {
        ctx.strokeStyle = '#0D1117';
        ctx.lineWidth = penWidth * 4;
      } else {
        ctx.strokeStyle = penColor;
        ctx.lineWidth = penWidth;
      }
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    }
  };

  const stopDrawing = (e) => {
    if (isDrawing) {
      setIsDrawing(false);
      if (drawTool === 'select' && cropBox.isSelecting) {
        if (cropBox.w > 10 && cropBox.h > 10) {
          setCropBox(prev => ({ ...prev, isSelecting: false, isSelected: true }));
        } else {
          clearCropSelection();
        }
      }
    }
  };

  const handleRecognizeCanvas = async (cropOnly = false) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsRecognizing(true);
    setAiExplanation('');

    try {
      let dataUrl = '';
      if (cropOnly && cropBox.isSelected && cropBox.w > 5 && cropBox.h > 5) {
        const offCanvas = document.createElement('canvas');
        offCanvas.width = cropBox.w;
        offCanvas.height = cropBox.h;
        const offCtx = offCanvas.getContext('2d');
        offCtx.fillStyle = '#0D1117';
        offCtx.fillRect(0, 0, cropBox.w, cropBox.h);
        offCtx.drawImage(canvas, cropBox.x, cropBox.y, cropBox.w, cropBox.h, 0, 0, cropBox.w, cropBox.h);
        dataUrl = offCanvas.toDataURL('image/png');
      } else {
        dataUrl = canvas.toDataURL('image/png');
      }

      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: "Examine this handwritten math equation image carefully. Identify the exact equation written (e.g. y = x + 1, y = 2x + 1, y = x^2 - 4, y = sin(x)). Respond ONLY with valid JSON: {\"equation\": \"<detected_equation>\", \"mode\": \"linear|quadratic|sine\", \"explanation\": \"<short description>\"}",
          image: dataUrl
        })
      });

      const contentType = response.headers.get('content-type') || '';
      let resData = {};
      if (contentType.includes('application/json')) {
        resData = await response.json();
      } else {
        setAiExplanation("OCR Server initializing. Please try again.");
        return;
      }

      if (resData.error) {
        setAiExplanation("AI Engine Error: " + resData.error);
        return;
      }

      let rawText = resData.text || '';

      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          const parsedResult = parseMathEquation(parsed.equation, parsed.mode, parsed.params);

          setPlotMode(parsedResult.mode);
          setParamA(parsedResult.a);
          setParamB(parsedResult.b);
          setParamC(parsedResult.c);
          setParamD(parsedResult.d);
          setEquationText(parsedResult.eqText);
          setRecognizedText(parsedResult.eqText);
          setAiExplanation(parsed.explanation || `Detected ${parsedResult.mode} equation ${parsedResult.eqText}.`);
        } catch (err) {
          const parsedResult = parseMathEquation(rawText);
          setPlotMode(parsedResult.mode);
          setParamA(parsedResult.a);
          setParamC(parsedResult.c);
          setEquationText(parsedResult.eqText);
          setRecognizedText(parsedResult.eqText);
          setAiExplanation("Recognized expression from whiteboard selection.");
        }
      } else {
        const parsedResult = parseMathEquation(rawText);
        setPlotMode(parsedResult.mode);
        setParamA(parsedResult.a);
        setParamC(parsedResult.c);
        setEquationText(parsedResult.eqText);
        setRecognizedText(parsedResult.eqText);
        setAiExplanation(rawText.slice(0, 150) || "Detected mathematical graph curve.");
      }
    } catch (error) {
      console.error("Recognition error:", error);
      setAiExplanation("Recognition error: " + (error.message || "Failed to analyze selection"));
    } finally {
      setIsRecognizing(false);
      clearCropSelection();
      setDrawTool('pen');
    }
  };

  // ----------------------------------------------------
  // CONTINUOUS SPEECH-TO-TEXT VOICE INPUT
  // ----------------------------------------------------
  const toggleListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e) {}
      }
      setIsListening(false);
    } else {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => setIsListening(true);
        recognition.onresult = (event) => {
          let transcript = '';
          for (let i = 0; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          if (transcript.trim()) {
            setTutorQuery(transcript);
          }
        };
        recognition.onerror = (e) => {
          console.warn("Speech notice:", e.error);
          if (e.error === 'not-allowed') {
            alert("Microphone permission denied. Please allow microphone access in browser address bar.");
            setIsListening(false);
          }
        };
        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
        setIsListening(true);
      } catch(err) {
        console.error("Speech error:", err);
        setIsListening(false);
      }
    }
  };

  // ----------------------------------------------------
  // 2D GRAPH PLOTTER ENGINE
  // ----------------------------------------------------
  useEffect(() => {
    const canvas = graphCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const originX = width / 2;
    const originY = height / 2;

    ctx.fillStyle = '#07080F';
    ctx.fillRect(0, 0, width, height);

    // Gridlines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.lineWidth = 1;

    for (let x = originX % zoomScale; x < width; x += zoomScale) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    for (let y = originY % zoomScale; y < height; y += zoomScale) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Main Axes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, originY);
    ctx.lineTo(width, originY);
    ctx.moveTo(originX, 0);
    ctx.lineTo(originX, height);
    ctx.stroke();

    // Ticks
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.font = '10px sans-serif';
    for (let u = -10; u <= 10; u += 2) {
      if (u === 0) continue;
      const px = originX + u * zoomScale;
      const py = originY - u * zoomScale;
      if (px > 0 && px < width) ctx.fillText(`${u}`, px - 4, originY + 14);
      if (py > 0 && py < height) ctx.fillText(`${u}`, originX + 6, py + 4);
    }

    const evaluateY = (x) => {
      const a = paramA, b = paramB, c = paramC, d = paramD;
      switch (plotMode) {
        case 'linear':
          return a * x + c;
        case 'quadratic':
          return a * x * x + b * x + c + d;
        case 'sine':
          return a * Math.sin(b * x + c) + d;
        case 'cubic':
          return a * Math.pow(x, 3) + b * x * x + c * x + d;
        default:
          return a * x + c;
      }
    };

    // Plot Curve
    ctx.strokeStyle = '#8B5CF6';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    let isFirst = true;

    for (let px = 0; px < width; px += 2) {
      const mathX = (px - originX) / zoomScale;
      const mathY = evaluateY(mathX);
      const py = originY - mathY * zoomScale;

      if (py >= -100 && py <= height + 100) {
        if (isFirst) {
          ctx.moveTo(px, py);
          isFirst = false;
        } else {
          ctx.lineTo(px, py);
        }
      } else {
        isFirst = true;
      }
    }
    ctx.stroke();

    // Highlight Y-intercept
    const yInt = evaluateY(0);
    const pyInt = originY - yInt * zoomScale;
    if (pyInt >= 0 && pyInt <= height) {
      ctx.fillStyle = '#10B981';
      ctx.beginPath();
      ctx.arc(originX, pyInt, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`(0, ${yInt.toFixed(1)})`, originX + 8, pyInt - 6);
    }

  }, [zoomScale, paramA, paramB, paramC, paramD, plotMode, hoverCoord]);

  const handleGraphMouseMove = (e) => {
    const canvas = graphCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const originX = canvas.width / 2;
    const originY = canvas.height / 2;
    const mathX = (px - originX) / zoomScale;
    const mathY = plotMode === 'linear' ? paramA * mathX + paramC : paramA * mathX * mathX + paramC;
    setHoverCoord({ x: mathX, y: mathY });
  };

  // ----------------------------------------------------
  // AI MATH TUTOR & DYNAMIC VISUALIZER PARSER
  // ----------------------------------------------------
  const handleAskTutor = async (promptQuery) => {
    const q = promptQuery || tutorQuery;
    if (!q.trim()) return;

    setIsTutorThinking(true);
    setTutorResponse('');
    setParsedVisualSpec(null);

    try {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: "You are Vedika Math AI, an expert math tutor. Explain step-by-step using markdown and clear math formulas. IF the user asks a geometric problem (e.g. triangle, circle, sector, surface area, solid shape, minute hand, car wiper), calculus integral, or vector problem, add a ```json block at the VERY END containing visualSpec:\n```json\n{\n  \"type\": \"sector\" | \"triangle\" | \"circle\" | \"area_under_curve\" | \"vector\" | \"solid_surface\",\n  \"title\": \"Surface Area & Geometry Visualizer\",\n  \"params\": {\"radius\": 10, \"angle\": 30, \"base\": 6, \"height\": 8},\n  \"labels\": {\"dim1\": \"Radius = 10\", \"result\": \"Area = 26.18 sq cm\"}\n}\n```",
          user: `Solve and explain this mathematical equation or question step-by-step:\n"${q}"`
        })
      });

      const contentType = response.headers.get('content-type') || '';
      let data = {};

      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        console.warn("Server HTML notice:", text.slice(0, 150));
        setTutorResponse("AI Service is initializing. Please click Solve again.");
        return;
      }

      if (data.error) {
        setTutorResponse(`AI Engine Notice: ${data.error}`);
        return;
      }

      const rawText = data.text || 'Unable to generate response.';

      const jsonMatch = rawText.match(/```json\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        try {
          const specObj = JSON.parse(jsonMatch[1]);
          setParsedVisualSpec(specObj);
        } catch (e) {
          console.warn("Visual spec parsing failed:", e);
        }
      }

      setTutorResponse(rawText.replace(/```json\s*\{[\s\S]*?\}\s*```/, ''));
    } catch (err) {
      console.error("Math AI Connection Error:", err);
      setTutorResponse(`Notice: ${err.message || 'Failed to connect to Math AI engine.'}`);
    } finally {
      setIsTutorThinking(false);
    }
  };

  const getFormattedFormula = () => {
    switch (plotMode) {
      case 'linear':
        return `y = ${paramA === 1 ? '' : paramA === -1 ? '-' : paramA}x ${paramC >= 0 ? '+ ' + paramC : '- ' + Math.abs(paramC)}`;
      case 'quadratic':
        return `y = ${paramA !== 1 ? paramA : ''}x² ${paramC >= 0 ? '+ ' + paramC : '- ' + Math.abs(paramC)}`;
      case 'sine':
        return `y = ${paramA} · sin(${paramB}x) ${paramD >= 0 ? '+ ' + paramD : '- ' + Math.abs(paramD)}`;
      default:
        return equationText;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#07080F', color: '#F3F4F6', fontFamily: 'var(--font-outfit), sans-serif' }}>
      
      {/* HEADER NAVBAR */}
      <header style={{
        background: 'rgba(13, 17, 23, 0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(139, 92, 246, 0.4)'
          }}>
            <Calculator size={24} color="#FFF" />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: '#FFF' }}>Vedika Math Lab</h1>
            <span style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.6)' }}>
              Smart Crop Selection OCR & Interactive Visual Experiments
            </span>
          </div>
        </div>

        {/* TABS */}
        <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.06)', padding: 4, borderRadius: 10, gap: 4 }}>
          {[
            { id: 'whiteboard', label: 'Whiteboard & Plotter', icon: Edit3 },
            { id: 'ai_tutor', label: 'AI Math Tutor', icon: Sparkles },
            { id: 'visualizers', label: 'Visual Concepts', icon: Triangle }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 16px',
                borderRadius: 8,
                border: 'none',
                background: activeTab === id ? 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)' : 'transparent',
                color: activeTab === id ? '#FFF' : 'rgba(255, 255, 255, 0.7)',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer'
              }}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main style={{ flex: 1, padding: 24, maxWidth: 1400, margin: '0 auto', width: '100%' }}>

        {/* TAB 1: WHITEBOARD & REAL-TIME PLOTTER */}
        {activeTab === 'whiteboard' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

            {/* LEFT: WHITEBOARD & SELECTION CROP TOOL */}
            <div style={{ background: '#0D1117', borderRadius: 16, border: '1px solid rgba(255, 255, 255, 0.08)', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Edit3 size={18} color="#8B5CF6" />
                  <span style={{ fontWeight: 700, fontSize: 16 }}>Smart Handwriting Whiteboard</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    onClick={() => switchTool('pen')}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 6,
                      border: drawTool === 'pen' ? '1px solid #8B5CF6' : '1px solid rgba(255, 255, 255, 0.1)',
                      background: drawTool === 'pen' ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                      color: drawTool === 'pen' ? '#A78BFA' : '#FFF',
                      fontSize: 12,
                      cursor: 'pointer'
                    }}
                  >
                    Pen
                  </button>
                  <button
                    onClick={() => switchTool('select')}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 6,
                      border: drawTool === 'select' ? '1px solid #EC4899' : '1px solid rgba(255, 255, 255, 0.1)',
                      background: drawTool === 'select' ? 'rgba(236, 72, 153, 0.2)' : 'transparent',
                      color: drawTool === 'select' ? '#F472B6' : '#FFF',
                      fontSize: 12,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <Crop size={14} /> Select (Box)
                  </button>
                  <button
                    onClick={() => switchTool('eraser')}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 6,
                      border: drawTool === 'eraser' ? '1px solid #F59E0B' : '1px solid rgba(255, 255, 255, 0.1)',
                      background: drawTool === 'eraser' ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                      color: drawTool === 'eraser' ? '#FCD34D' : '#FFF',
                      fontSize: 12,
                      cursor: 'pointer'
                    }}
                  >
                    Eraser
                  </button>
                  <button
                    onClick={clearWhiteboard}
                    style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(255, 255, 255, 0.1)', background: 'transparent', color: '#FFF', cursor: 'pointer' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* CANVAS slate with Scaled SVG Bounding Box Overlay */}
              <div style={{ position: 'relative', width: '100%', height: 380, borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={380}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  style={{ width: '100%', height: '100%', touchAction: 'none', cursor: drawTool === 'select' ? 'crosshair' : drawTool === 'pen' ? 'crosshair' : 'default' }}
                />

                {(cropBox.isSelecting || cropBox.isSelected) && (
                  <svg
                    viewBox="0 0 600 380"
                    preserveAspectRatio="none"
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
                  >
                    <rect
                      x={cropBox.x}
                      y={cropBox.y}
                      width={cropBox.w}
                      height={cropBox.h}
                      fill="rgba(236, 72, 153, 0.18)"
                      stroke="#EC4899"
                      strokeWidth="2.5"
                      strokeDasharray="6 4"
                    />
                    <circle cx={cropBox.x} cy={cropBox.y} r={5} fill="#FFF" />
                    <circle cx={cropBox.x + cropBox.w} cy={cropBox.y} r={5} fill="#FFF" />
                    <circle cx={cropBox.x} cy={cropBox.y + cropBox.h} r={5} fill="#FFF" />
                    <circle cx={cropBox.x + cropBox.w} cy={cropBox.y + cropBox.h} r={5} fill="#FFF" />
                  </svg>
                )}

                {cropBox.isSelected && (
                  <button
                    onClick={() => handleRecognizeCanvas(true)}
                    style={{
                      position: 'absolute',
                      top: Math.max(10, (cropBox.y * 380) / 380 - 42),
                      left: Math.max(10, cropBox.x),
                      zIndex: 20,
                      background: 'linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%)',
                      color: '#FFF',
                      border: 'none',
                      padding: '8px 14px',
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(236, 72, 153, 0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <Sparkles size={14} /> Analyze Selected Box
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={() => handleRecognizeCanvas(cropBox.isSelected)}
                  disabled={isRecognizing}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '12px 20px',
                    borderRadius: 10,
                    border: 'none',
                    background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
                    color: '#FFF',
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: isRecognizing ? 'not-allowed' : 'pointer'
                  }}
                >
                  <Sparkles size={18} />
                  {isRecognizing ? 'Analyzing Handwriting...' : cropBox.isSelected ? 'Recognize Selected Region' : 'Recognize Full Whiteboard'}
                </button>
              </div>

              {aiExplanation && (
                <div style={{ background: 'rgba(139, 92, 246, 0.12)', border: '1px solid rgba(139, 92, 246, 0.3)', padding: 12, borderRadius: 8, fontSize: 13, color: '#C4B5FD' }}>
                  <strong>AI OCR Detection:</strong> {aiExplanation}
                </div>
              )}
            </div>

            {/* RIGHT: REAL-TIME 2D GRAPH PLOTTER */}
            <div style={{ background: '#0D1117', borderRadius: 16, border: '1px solid rgba(255, 255, 255, 0.08)', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <TrendingUp size={18} color="#EC4899" />
                  <span style={{ fontWeight: 700, fontSize: 16 }}>Real-Time 2D Graph Plotter</span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => setZoomScale(p => Math.min(p + 5, 60))} style={{ padding: '4px 8px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#FFF', borderRadius: 6 }}>
                    <ZoomIn size={14} />
                  </button>
                  <button onClick={() => setZoomScale(p => Math.max(p - 5, 15))} style={{ padding: '4px 8px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#FFF', borderRadius: 6 }}>
                    <ZoomOut size={14} />
                  </button>
                </div>
              </div>

              <div style={{ background: 'rgba(139, 92, 246, 0.15)', border: '1px solid rgba(139, 92, 246, 0.3)', padding: '12px 16px', borderRadius: 10, display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.5)' }}>Active Curve</span>
                  <span style={{ fontSize: 18, fontWeight: 800, color: '#F472B6', fontFamily: 'monospace', display: 'block' }}>
                    {getFormattedFormula()}
                  </span>
                </div>
              </div>

              <div style={{ position: 'relative', width: '100%', height: 280, borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <canvas
                  ref={graphCanvasRef}
                  width={600}
                  height={280}
                  onMouseMove={handleGraphMouseMove}
                  onMouseLeave={() => setHoverCoord(null)}
                  style={{ width: '100%', height: '100%', cursor: 'crosshair' }}
                />
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: 14, borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#A78BFA', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Sliders size={14} /> Live Parameter Sliders
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.7)', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Slope/Scale (a):</span> <b>{paramA}</b>
                    </label>
                    <input type="range" min="-5" max="5" step="0.5" value={paramA} onChange={e => setParamA(parseFloat(e.target.value))} style={{ width: '100%', accentColor: '#8B5CF6' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.7)', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Intercept/Offset (c):</span> <b>{paramC}</b>
                    </label>
                    <input type="range" min="-10" max="10" step="1" value={paramC} onChange={e => setParamC(parseFloat(e.target.value))} style={{ width: '100%', accentColor: '#10B981' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: AI MATH TUTOR, VOICE INPUT & DYNAMIC VISUALIZER */}
        {activeTab === 'ai_tutor' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 960, margin: '0 auto' }}>
            <div style={{ background: '#0D1117', borderRadius: 16, border: '1px solid rgba(255, 255, 255, 0.08)', padding: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <Sparkles size={24} color="#8B5CF6" />
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: '#FFF' }}>AI Step-by-Step Math Tutor</h2>
                  <p style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.6)', margin: 0 }}>
                    Type or speak any equation or textbook problem. Get formatted LaTeX math formulas and dynamic visual diagrams.
                  </p>
                </div>
              </div>

              {/* INPUT BAR WITH SLEEK CONTINUOUS VOICE RECOGNITION */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <input
                    type="text"
                    value={tutorQuery}
                    onChange={(e) => setTutorQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAskTutor()}
                    placeholder="e.g. Total surface area formed by joining two shapes or scooping a hemisphere..."
                    style={{
                      width: '100%',
                      padding: '14px 130px 14px 18px',
                      borderRadius: 12,
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: isListening ? '1px solid #EC4899' : '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#FFF',
                      fontSize: 15,
                      outline: 'none',
                      transition: 'border 0.2s'
                    }}
                  />

                  {/* VOICE INPUT BUTTON WITH GLOWING ACTIVE BADGE */}
                  <button
                    onClick={toggleListening}
                    title={isListening ? "Click to stop listening" : "Click to speak your math question"}
                    style={{
                      position: 'absolute',
                      right: 10,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: isListening ? 'linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%)' : 'rgba(139, 92, 246, 0.15)',
                      border: isListening ? '1px solid #EC4899' : '1px solid rgba(139, 92, 246, 0.3)',
                      color: '#FFF',
                      padding: '6px 12px',
                      borderRadius: 20,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      boxShadow: isListening ? '0 0 14px rgba(236, 72, 153, 0.6)' : 'none',
                      transition: 'all 0.2s'
                    }}
                  >
                    <Mic size={16} color={isListening ? '#FFF' : '#A78BFA'} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: isListening ? '#FFF' : '#C4B5FD' }}>
                      {isListening ? 'Listening...' : 'Voice'}
                    </span>
                  </button>
                </div>

                <button
                  onClick={() => handleAskTutor()}
                  disabled={isTutorThinking}
                  style={{
                    padding: '14px 24px',
                    borderRadius: 12,
                    border: 'none',
                    background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
                    color: '#FFF',
                    fontWeight: 700,
                    fontSize: 15,
                    cursor: isTutorThinking ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}
                >
                  <Send size={18} />
                  {isTutorThinking ? 'Solving...' : 'Solve'}
                </button>
              </div>

              {/* QUICK EXAMPLE BUTTONS */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.5)' }}>Try examples:</span>
                {[
                  "Surface area of a solid formed by joining cylinder and hemisphere",
                  "Area swept by 10cm minute hand in 5 minutes",
                  "Total area cleaned by two 40cm wipers sweeping 115°",
                  "Find area of right triangle with base 6 and height 8"
                ].map(ex => (
                  <button
                    key={ex}
                    onClick={() => { setTutorQuery(ex); handleAskTutor(ex); }}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 20,
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      background: 'rgba(139, 92, 246, 0.1)',
                      color: '#C4B5FD',
                      fontSize: 12,
                      cursor: 'pointer'
                    }}
                  >
                    {ex}
                  </button>
                ))}
              </div>

              {/* TUTOR RESPONSE & DYNAMIC VISUALIZER */}
              {(tutorResponse || isTutorThinking) && (
                <div style={{ marginTop: 24 }}>
                  {isTutorThinking ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#A78BFA', padding: 20 }}>
                      <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
                      Solving problem and formatting step-by-step math...
                    </div>
                  ) : (
                    <div>
                      <div style={{
                        padding: 24,
                        borderRadius: 14,
                        background: '#07080F',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#10B981', fontWeight: 700, marginBottom: 16 }}>
                          <Lightbulb size={20} /> Step-by-Step AI Solution
                        </div>

                        {/* CUSTOM MARKDOWN MATH RENDERER */}
                        <CustomMathMarkdown content={tutorResponse} />
                      </div>

                      {/* DYNAMIC TEXTBOOK VISUALIZER CANVAS */}
                      {parsedVisualSpec && (
                        <DynamicMathVisualizer spec={parsedVisualSpec} />
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: VISUAL CONCEPTS */}
        {activeTab === 'visualizers' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'flex', gap: 12, borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: 12 }}>
              {[
                { id: 'pythagoras', label: 'Pythagoras Theorem', icon: Triangle },
                { id: 'sector', label: 'Circle Sector & Clock/Wiper', icon: Compass },
                { id: 'solid', label: '3D Solid Surface Area', icon: Box },
                { id: 'trig', label: 'Unit Circle & Trigonometry', icon: Circle },
                { id: 'calculus', label: 'Calculus Tangents & Derivatives', icon: TrendingUp }
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setVisualizerSubTab(id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 18px',
                    borderRadius: 8,
                    border: 'none',
                    background: visualizerSubTab === id ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                    color: visualizerSubTab === id ? '#A78BFA' : 'rgba(255, 255, 255, 0.6)',
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: 'pointer'
                  }}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </div>

            {visualizerSubTab === 'pythagoras' && (
              <DynamicMathVisualizer spec={{ type: 'triangle', title: 'Pythagoras Proof Visualizer', params: { base: pythA, height: pythB } }} />
            )}

            {visualizerSubTab === 'sector' && (
              <DynamicMathVisualizer spec={{ type: 'sector', title: 'Circle Sector & Clock Hand Visualizer', params: { radius: 10, angle: 30 } }} />
            )}

            {visualizerSubTab === 'solid' && (
              <DynamicMathVisualizer spec={{ type: 'solid_surface', title: '3D Cylinder & Solid Surface Area Visualizer', params: { radius: 7, height: 14 } }} />
            )}

            {visualizerSubTab === 'trig' && (
              <DynamicMathVisualizer spec={{ type: 'circle', title: 'Unit Circle Visualizer', params: { radius: 5 } }} />
            )}

            {visualizerSubTab === 'calculus' && (
              <DynamicMathVisualizer spec={{ type: 'area_under_curve', title: 'Calculus Integral Area Visualizer', params: { a: 0, b: 3, func: 'x^2' } }} />
            )}
          </div>
        )}

      </main>
    </div>
  );
}
