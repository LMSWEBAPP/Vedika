'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Calculator, Edit3, Eraser, Trash2, RotateCcw, Play, Sparkles,
  Sliders, Activity, HelpCircle, Compass, Zap, Lightbulb, ChevronRight,
  TrendingUp, Circle, Triangle, Layers, ZoomIn, ZoomOut, RefreshCw, Send, Image as ImageIcon,
  Crop, Mic, MicOff, Square, CheckCircle2, Award, Box, Volume2
} from 'lucide-react';
import { T, isMathExpression, evaluateMath, geminiCall } from '../../lib/lms-data';
import ScenePrimitiveRenderer, { validateScene } from './ScenePrimitiveRenderer';
import { lookupFormula } from '../../lib/formulaRegistry';
import { buildCanonicalScene } from '../../lib/canonicalScenes';
import MathEquationRenderer from './MathEquationRenderer';



// Preprocess LaTeX math syntax into clean formatted unicode math
function cleanMathLaTeX(text) {
  if (!text) return '';
  let str = text;

  // Clean LaTeX inline and block delimiters \( \) \[ \]
  str = str.replace(/\\\(|\\\)/g, '').replace(/\\\[|\\\]/g, '');

  // Convert block math $$ ... $$ into formatted code blocks for clean formula card rendering
  str = str.replace(/\$\$\s*([\s\S]*?)\s*\$\$/g, (match, formula) => {
    return `\n\n\`\`\`math\n${formula.trim()}\n\`\`\`\n\n`;
  });

  // Convert common LaTeX math symbols into clean Unicode math
  str = str
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1 / $2)')
    .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
    .replace(/\\sqrt/g, '√')
    .replace(/\\sigma/g, 'σ')
    .replace(/\\mu/g, 'μ')
    .replace(/\\alpha/g, 'α')
    .replace(/\\beta/g, 'β')
    .replace(/\\theta/g, 'θ')
    .replace(/\\pi/g, 'π')
    .replace(/\\lambda/g, 'λ')
    .replace(/\\delta/g, 'δ')
    .replace(/\\infty/g, '∞')
    .replace(/\\approx/g, '≈')
    .replace(/\\times/g, '×')
    .replace(/\\cdot/g, '·')
    .replace(/\\sim/g, '~')
    .replace(/\\ge/g, '≥')
    .replace(/\\le/g, '≤')
    .replace(/\\neq/g, '≠')
    .replace(/\\pm/g, '±')
    .replace(/\\quad/g, ' ')
    .replace(/\\qquad/g, '  ')
    .replace(/\\sin/g, 'sin')
    .replace(/\\cos/g, 'cos')
    .replace(/\\tan/g, 'tan')
    .replace(/\\ln/g, 'ln')
    .replace(/\\log/g, 'log')
    .replace(/\^\\circ/g, '°')
    .replace(/\\circ/g, '°')
    .replace(/\\text\{([^}]+)\}/g, '$1')
    .replace(/\\left|\\right/g, '')
    .replace(/\^\circ/g, '°')
    .replace(/\^2/g, '²')
    .replace(/\^3/g, '³')
    .replace(/\^n/g, 'ⁿ')
    // Convert subscripts (_1 to ₁, _n to ₙ, etc.)
    .replace(/_1\b/g, '₁')
    .replace(/_2\b/g, '₂')
    .replace(/_3\b/g, '₃')
    .replace(/_4\b/g, '₄')
    .replace(/_5\b/g, '₅')
    .replace(/_6\b/g, '₆')
    .replace(/_7\b/g, '₇')
    .replace(/_8\b/g, '₈')
    .replace(/_9\b/g, '₉')
    .replace(/_0\b/g, '₀')
    .replace(/_n\b/g, 'ₙ')
    .replace(/_i\b/g, 'ᵢ')
    .replace(/_k\b/g, 'ₖ')
    .replace(/_m\b/g, 'ₘ');

  // Clean inline math $...$ delimiters so variables flow inline naturally
  str = str.replace(/\$([^$\n]+)\$/g, (match, inner) => {
    return ` ${inner.trim()} `;
  });

  return str;
}

// Helper parser to dynamically extract slope, quadratic, cubic, or general expression parameters
function parseMathEquation(rawEq, modeFromAI, paramsFromAI) {
  if (!rawEq) return { eqText: 'y = x + 1', mode: 'linear', a: 1, b: 0, c: 1, d: 0 };

  let textToParse = String(rawEq);
  // Extract formula substring if Gemini returned text prose (e.g. "The equation is y = x + 3")
  const formulaMatch = textToParse.match(/y\s*=\s*[a-z0-9\+\-\*\/\^\.\s]+/i);
  if (formulaMatch) {
    textToParse = formulaMatch[0].trim();
  }

  const clean = textToParse.replace(/\s+/g, '').toLowerCase();

  // 1. CUBIC CHECK (MUST RUN BEFORE LINEAR)
  const cubicMatch = clean.match(/y=([+\-]?\d*\.?\d*)x\^?3/i);
  if (cubicMatch || clean.includes('x^3') || clean.includes('x³') || modeFromAI === 'cubic') {
    let a = 1;
    if (cubicMatch && cubicMatch[1] === '-') a = -1;
    else if (cubicMatch && cubicMatch[1] && cubicMatch[1] !== '+') {
      const pA = parseFloat(cubicMatch[1]);
      if (!isNaN(pA)) a = pA;
    } else if (paramsFromAI && !isNaN(paramsFromAI.a)) {
      a = paramsFromAI.a;
    }
    return { eqText: `y = ${a !== 1 ? (a === -1 ? '-' : a) : ''}x³`, mode: 'cubic', a, b: 0, c: 0, d: 0 };
  }

  // 2. QUADRATIC CHECK (MUST RUN BEFORE LINEAR)
  const quadMatch = clean.match(/y=([+\-]?\d*\.?\d*)x\^?2([+\-]\d*\.?\d*x)?([+\-]\d+\.?\d*)?/i);
  if (quadMatch || clean.includes('x^2') || clean.includes('x²') || modeFromAI === 'quadratic') {
    let a = 1, c = 0;
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
      if (typeof paramsFromAI.a === 'number' && !isNaN(paramsFromAI.a)) a = paramsFromAI.a;
      if (typeof paramsFromAI.c === 'number' && !isNaN(paramsFromAI.c)) c = paramsFromAI.c;
    }
    return { eqText: `y = ${a !== 1 ? (a === -1 ? '-' : a) : ''}x² ${c >= 0 ? '+ ' + c : '- ' + Math.abs(c)}`, mode: 'quadratic', a, b: 0, c, d: 0 };
  }

  // 3. LINEAR CHECK (STRICT NEGATIVE LOOKAHEAD SO x^3 / x^2 DON'T MATCH LINEAR)
  const linMatch = clean.match(/y=([+\-]?\d*\.?\d*)x(?!\^|\d|³|²)([+\-]\d+\.?\d*)?/i);
  if (linMatch || modeFromAI === 'linear') {
    let a = 1;
    let c = 0;

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
      if (typeof paramsFromAI.a === 'number' && !isNaN(paramsFromAI.a)) a = paramsFromAI.a;
      if (typeof paramsFromAI.c === 'number' && !isNaN(paramsFromAI.c)) c = paramsFromAI.c;
    }

    const formattedEq = `y = ${a === 1 ? '' : a === -1 ? '-' : a}x ${c >= 0 ? '+ ' + c : '- ' + Math.abs(c)}`;
    return { eqText: formattedEq, mode: 'linear', a, b: 0, c, d: 0 };
  }

  const safeA = (paramsFromAI && !isNaN(paramsFromAI.a)) ? paramsFromAI.a : 1;
  const safeB = (paramsFromAI && !isNaN(paramsFromAI.b)) ? paramsFromAI.b : 0;
  const safeC = (paramsFromAI && !isNaN(paramsFromAI.c)) ? paramsFromAI.c : 0;
  const safeD = (paramsFromAI && !isNaN(paramsFromAI.d)) ? paramsFromAI.d : 0;

  return {
    eqText: textToParse,
    mode: modeFromAI || 'linear',
    a: safeA,
    b: safeB,
    c: safeC,
    d: safeD
  };
}



function DynamicMathVisualizer({ spec }) {
  const sceneToRender = useMemo(() => {
    if (!spec) return null;
    if (spec.viewBox) return spec;
    return buildCanonicalScene(spec.concept || spec.type, spec.params) || {
      concept: spec.concept || spec.type || '3D Solid',
      params: spec.params || { radius: 7, height: 14 },
      viewBox: { xMin: -10, xMax: 10, yMin: -10, yMax: 10 }
    };
  }, [spec]);

  if (!sceneToRender) return null;

  return (
    <div style={{
      marginTop: 20,
      background: T.s1,
      borderRadius: 14,
      border: `1px solid ${T.border}`,
      padding: 20,
      boxShadow: '0 8px 24px rgba(0,0,0,0.06)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <Box size={20} color={T.purple} />
        <h4 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: T.text }}>
          {sceneToRender.concept ? sceneToRender.concept.replace(/_/g, ' ').toUpperCase() : 'Dynamic Math Scene'}
        </h4>
        <span style={{ fontSize: 11, background: `${T.purple}20`, color: T.purple, padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>
          GeoGebra / Desmos Scene Engine
        </span>
      </div>
      <ScenePrimitiveRenderer scene={sceneToRender} theme={T} />
    </div>
  );
}


// Custom Markdown Math Renderer with styled formula pills & cards
function CustomMathMarkdown({ content }) {
  const formatted = cleanMathLaTeX(content);

  return (
    <div style={{ fontSize: 15, lineHeight: 1.8, color: T.text }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h3: ({ children }) => {
            const txt = String(children);
            if (txt.toLowerCase().includes('final answer')) {
              return (
                <div style={{
                  background: `${T.green}15`,
                  border: `1px solid ${T.green}40`,
                  borderRadius: 12,
                  padding: '14px 18px',
                  marginTop: 24,
                  marginBottom: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  color: T.green,
                  fontWeight: 800,
                  fontSize: 18,
                  boxShadow: `0 4px 14px ${T.green}20`
                }}>
                  <CheckCircle2 size={22} /> {children}
                </div>
              );
            }

            return (
              <h3 style={{ fontSize: 17, fontWeight: 700, color: T.purple, marginTop: 22, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${T.border}`, paddingBottom: 8 }}>
                <Zap size={18} color={T.purple} /> {children}
              </h3>
            );
          },
          h4: ({ children }) => (
            <h4 style={{ fontSize: 15, fontWeight: 700, color: T.accent, marginTop: 16, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <ChevronRight size={16} color={T.accent} /> {children}
            </h4>
          ),
          code: ({ inline, className, children }) => {
            const str = String(children).replace(/\n$/, '');
            const isMathBlock = className === 'language-math';

            if (inline) {
              return (
                <span style={{
                  fontFamily: 'monospace',
                  background: `${T.accent}15`,
                  color: T.accent,
                  border: `1px solid ${T.accent}30`,
                  padding: '2px 8px',
                  borderRadius: 6,
                  fontWeight: 700,
                  fontSize: 14,
                  display: 'inline-block',
                  margin: '2px 4px'
                }}>
                  {str}
                </span>
              );
            }

            return (
              <div style={{
                background: T.s2,
                border: `1px solid ${T.border}`,
                borderRadius: 12,
                padding: '14px 20px',
                margin: '12px 0',
                textAlign: 'center',
                color: T.accent,
                fontWeight: 700,
                fontSize: 16,
                fontFamily: 'var(--font-outfit), monospace',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
                overflowX: 'auto'
              }}>
                {str}
              </div>
            );
          },
          p: ({ children }) => {
            const str = String(children);
            if (str.toLowerCase().includes('the total area') || str.toLowerCase().includes('final answer:')) {
              return (
                <div style={{ background: `${T.green}12`, borderLeft: `4px solid ${T.green}`, padding: '12px 18px', borderRadius: '0 10px 10px 0', margin: '14px 0', fontWeight: 600, color: T.text }}>
                  {children}
                </div>
              );
            }
            if (str.startsWith('Problem ') || str.startsWith('Step ')) {
              return (
                <div style={{ background: T.s2, borderLeft: `3px solid ${T.accent}`, padding: '10px 14px', borderRadius: '0 8px 8px 0', margin: '10px 0' }}>
                  {children}
                </div>
              );
            }
            return <p style={{ margin: '10px 0', leading: 1.8 }}>{children}</p>;
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
  const [solidKind, setSolidKind] = useState('cylinder');
  const [solidRadius, setSolidRadius] = useState(7);
  const [solidHeight, setSolidHeight] = useState(14);
  const [sectorKind, setSectorKind] = useState('sector');
  const [sectorRadius, setSectorRadius] = useState(10);
  const [sectorAngle, setSectorAngle] = useState(60);
  const [ratioVal1, setRatioVal1] = useState(6);
  const [ratioVal2, setRatioVal2] = useState(2);


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
          user: "Read the handwritten math equation image with high precision. Pay close attention to operators: distinguish addition '+' from exponents '^'. For example, 'y = x + 3' contains an inline plus sign and number 3, whereas 'y = x^3' has a superscript exponent 3. Extract the exact formula written. Respond ONLY with valid JSON: {\"equation\": \"<detected_equation>\", \"mode\": \"linear|quadratic|sine|cubic\", \"a\": 1, \"b\": 0, \"c\": 3, \"d\": 0, \"explanation\": \"Detected handwritten equation <detected_equation>\"}",
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

  // Speech Recognition Cleanup Hook
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
    };
  }, []);

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
            setTutorQuery(prev => {
              const cleanPrev = prev.trim();
              return cleanPrev ? `${cleanPrev} ${transcript.trim()}` : transcript.trim();
            });
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

      if (equationText && equationText !== 'y = x + 1') {
        try {
          let expr = equationText
            .replace(/^y\s*=\s*/i, '')
            .replace(/(\d)x/gi, '$1*x')
            .replace(/\bx\b/gi, `(${x})`)
            .replace(/²\b/g, '**2')
            .replace(/³\b/g, '**3')
            .replace(/\b(sin|cos|tan|sqrt|abs|ln|log|exp)\b/gi, 'Math.$1')
            .replace(/\^/g, '**');
          const val = new Function(`return ${expr};`)();
          if (typeof val === 'number' && Number.isFinite(val)) return val;
        } catch (err) {}
      }

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

  const hoverRafRef = useRef(null);
  const handleGraphMouseMove = (e) => {
    const clientX = e.clientX;
    const clientY = e.clientY;
    if (hoverRafRef.current) cancelAnimationFrame(hoverRafRef.current);
    hoverRafRef.current = requestAnimationFrame(() => {
      const canvas = graphCanvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const px = clientX - rect.left;
      const py = clientY - rect.top;
      const originX = canvas.width / 2;
      const mathX = (px - originX) / zoomScale;
      const mathY = plotMode === 'linear' ? paramA * mathX + paramC : paramA * mathX * mathX + paramC;
      setHoverCoord({ x: mathX, y: mathY });
    });
  };

  // ----------------------------------------------------
  // STRICT CLOSED ENUM SCHEMAS & VALIDATOR (NO GUESSWORK / NO HALLUCINATED CIRCLES)
  // ----------------------------------------------------
  // ----------------------------------------------------
  // STRICT CLOSED ENUM SCHEMAS & VALIDATOR (FULL SYLLABUS SYTEMATIC ENUM)
  // ----------------------------------------------------
  const ALLOWED_VISUAL_TYPES = [
    // 3D Solids
    'cube',
    'cuboid',
    'rectangular_prism',
    'box',
    'cylinder',
    'cone',
    'sphere',
    'hemisphere',
    'pyramid',
    'composite_cylinder_hemisphere',
    'composite_solid',
    'solid_surface',
    '3d_surface',
    
    // 2D Shapes & Polygons
    'triangle',
    'circle',
    'sector',
    'circle_sector',
    'rectangle',
    'square',
    'quadrilateral',
    'parallelogram',
    'rhombus',
    'trapezoid',
    'regular_polygon',
    
    // Algebra, Sequences, Calculus & Data
    'quadratic',
    'parabola',
    'function_graph',
    'toothpick_sequence',
    'sequence_grid',
    'pattern_sequence',
    'fraction_pie',
    'pie_chart',
    'fraction',
    'bar_chart',
    'ratio_bars',
    'area_under_curve'
  ];

  const validateVisualSpec = (spec) => {
    if (!spec || typeof spec !== 'object' || !spec.type) return null;
    const type = String(spec.type).toLowerCase();
    if (!ALLOWED_VISUAL_TYPES.includes(type)) return null;

    const params = spec.params || {};

    if (['cube', 'cuboid', 'rectangular_prism', 'box'].includes(type)) {
      params.l = params.l || params.length || (type === 'cube' ? 6 : 8);
      params.w = params.w || params.width || (type === 'cube' ? 6 : 5);
      params.h = params.h || params.height || (type === 'cube' ? 6 : 10);
    } else if (['rectangle', 'square', 'quadrilateral', 'parallelogram', 'rhombus', 'trapezoid'].includes(type)) {
      params.a = params.a || params.baseA || params.width || 8;
      params.b = params.b || params.baseB || params.base || params.a;
      params.h = params.h || params.height || 6;
    } else if (type === 'triangle') {
      params.base = params.base || 6;
      params.height = params.height || 8;
    } else if (type === 'sector' || type === 'circle_sector') {
      params.radius = params.radius || 10;
      params.angle = params.angle || 30;
    } else if (['solid_surface', 'composite_cylinder_hemisphere', 'cylinder', 'composite_solid'].includes(type)) {
      params.radius = params.radius || 7;
      params.height = params.height || 14;
    } else if (type === 'cone') {
      params.radius = params.radius || 6;
      params.height = params.height || 10;
    } else if (['sphere', 'hemisphere', 'circle'].includes(type)) {
      params.radius = params.radius || 5;
    } else if (['quadratic', 'parabola', 'function_graph'].includes(type)) {
      params.a = params.a !== undefined ? Number(params.a) : 2;
      params.b = params.b !== undefined ? Number(params.b) : -5;
      params.c = params.c !== undefined ? Number(params.c) : 3;
    } else if (['toothpick_sequence', 'sequence_grid', 'pattern_sequence'].includes(type)) {
      params.n = params.n || 5;
    } else if (['fraction_pie', 'pie_chart', 'fraction'].includes(type)) {
      params.totalSlices = params.totalSlices || params.total || 8;
      params.slicesEaten = params.slicesEaten !== undefined ? params.slicesEaten : 6;
    } else if (['bar_chart', 'ratio_bars'].includes(type)) {
      params.val1 = params.val1 !== undefined ? params.val1 : 6;
      params.val2 = params.val2 !== undefined ? params.val2 : 2;
    }

    return { ...spec, type, params };
  };

  // Universal Dynamic Fallback Builder so EVERY question receives an interactive visual model
  const createUniversalMathVisualizer = (query) => {
    const q = String(query).toLowerCase();
    const nums = (q.match(/-?\d+\.?\d*/g) || []).map(Number).filter(n => !isNaN(n));
    const num1 = nums[0] !== undefined ? nums[0] : 4;
    const num2 = nums[1] !== undefined ? nums[1] : 6;

    if (q.includes('solve') || q.includes('x') || q.includes('equation') || q.includes('derivative') || q.includes('integral') || q.includes('function') || q.includes('graph')) {
      return {
        concept: 'Mathematical Function & Curve Graph',
        known_formula: null,
        params: { a: num1 || 1, b: num2 || 0 },
        viewBox: { xMin: -8, xMax: 8, yMin: -8, yMax: 8 },
        showAxes: true,
        primitives: [
          {
            type: 'curve',
            expression: `${num1 || 1} * x^2 + (${num2 || 0}) * x`,
            xMin: -6,
            xMax: 6,
            color: '#729DF8'
          },
          { type: 'point', x: 0, y: 0, label: 'Origin (0,0)', color: '#42D1B2' }
        ]
      };
    }

    return {
      concept: 'Interactive Dynamic Math Model',
      known_formula: null,
      params: { a: Math.abs(num1), b: Math.abs(num2) },
      viewBox: { xMin: -10, xMax: 10, yMin: -10, yMax: 10 },
      showAxes: false,
      primitives: [
        { type: 'polygon', points: [[-num1, -num2], [num1, -num2], [num1, num2], [-num1, num2]], fill: 'rgba(114, 157, 248, 0.2)', stroke: '#729DF8' },
        { type: 'label', x: 0, y: 0, text: `Parameter Model (${num1}, ${num2})`, fill: '#E2E8F0' }
      ]
    };
  };

  // ----------------------------------------------------
  // AI MATH TUTOR & UNIFIED VISUALIZER ENGINE
  // ----------------------------------------------------
  const handleAskTutor = async (mode = 'solve', promptQuery) => {
    const q = promptQuery || tutorQuery;
    if (!q.trim()) return;

    setIsTutorThinking(true);
    setTutorResponse('');
    setParsedVisualSpec(null);

    // Zero-API Local Evaluation for pure arithmetic expressions
    if (isMathExpression(q)) {
      const evalVal = evaluateMath(q);
      if (typeof evalVal === 'number' || (typeof evalVal === 'string' && !evalVal.startsWith('Error'))) {
        setTutorResponse(`### Instant Calculation\n\n\`\`\`\n${q} = ${evalVal}\n\`\`\`\n\nCalculated locally without API consumption.`);
        setParsedVisualSpec({
          concept: 'Arithmetic Calculation Model',
          known_formula: null,
          params: { val: evalVal },
          viewBox: { xMin: -5, xMax: 5, yMin: -5, yMax: 5 },
          showAxes: false,
          primitives: [
            { type: 'line', from: [0, 0], to: [evalVal, 0], color: '#42D1B2', strokeWidth: 3 },
            { type: 'point', x: evalVal, y: 0, label: `Value = ${evalVal}`, color: '#729DF8' }
          ]
        });
        setIsTutorThinking(false);
        return;
      }
    }

    try {
      const PRIMITIVE_SCHEMA = {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: [
              "polygon", "line", "dashed_line", "arrow", "vector",
              "circle", "ellipse", "arc", "angle_marker", "point",
              "label", "bar", "number_line", "curve"
            ]
          },
          points: { type: "array", items: { type: "array", items: { type: "number" } } },
          from: { type: "array", items: { type: "number" } },
          to: { type: "array", items: { type: "number" } },
          cx: { type: "number" },
          cy: { type: "number" },
          r: { type: "number" },
          rx: { type: "number" },
          ry: { type: "number" },
          startAngle: { type: "number" },
          endAngle: { type: "number" },
          x: { type: "number" },
          y: { type: "number" },
          text: { type: "string" },
          label: { type: "string" },
          width: { type: "number" },
          height: { type: "number" },
          expression: { type: "string" },
          xMin: { type: "number" },
          xMax: { type: "number" },
          color: { type: "string" }
        },
        required: ["type"]
      };

      const SCENE_SCHEMA = {
        type: "object",
        properties: {
          concept: { type: "string" },
          known_formula: { type: "string", nullable: true },
          params: { type: "object" },
          viewBox: {
            type: "object",
            properties: {
              xMin: { type: "number" }, xMax: { type: "number" },
              yMin: { type: "number" }, yMax: { type: "number" }
            },
            required: ["xMin", "xMax", "yMin", "yMax"]
          },
          showAxes: { type: "boolean" },
          primitives: {
            type: "array",
            items: PRIMITIVE_SCHEMA
          }
        },
        required: ["concept", "known_formula", "params", "viewBox", "primitives"]
      };

      const TOP_LEVEL_SCHEMA = {
        type: "object",
        properties: {
          visualizable: { type: "boolean" },
          scene: { ...SCENE_SCHEMA, nullable: true }
        },
        required: ["visualizable"]
      };

      const systemPromptSolve = `You are Vedika Math AI, an expert math tutor. Explain step-by-step using clear markdown. Write each step as "Step 1: ...", "Step 2: ...", etc. on its own line. Use $$ for block formulas and $ for inline variables. Always structure your response into three sections:
### 1. Understanding the Problem
### 2. Step-by-Step Solution
### 3. Final Answer

Focus purely on step-by-step LaTeX text explanation. Do NOT output any JSON blocks.`;

      const systemPromptVisual = `You are Vedika Math AI visual scene composer. Respond ONLY with JSON matching the provided schema.

Rules:
- Compose the SCENE using ONLY the primitive types listed in the schema: polygon, line, dashed_line, arrow, vector, circle, ellipse, arc, angle_marker, point, label, bar, number_line, curve.
- MANDATORY: "params" MUST NEVER BE EMPTY {}. You MUST populate "params" with ALL core dimensions of the shape or function (e.g. for a cone: {"radius": 3, "height": 5}, for a cylinder: {"radius": 4, "height": 10}, for a cuboid: {"l": 8, "w": 5, "h": 10}, for a triangle: {"base": 6, "height": 8}, for quadratic: {"a": 2, "b": -5, "c": 3}), even if no specific numbers were mentioned in the prompt!
- NEVER compute derived math answers (no area, volume, or roots in params). The client computes all math.
- For "curve" primitives, use variable names matching "params" keys in expression (e.g. expression: "a*x^2 + b*x + c", xMin: -5, xMax: 5).
- For Calculus / Derivative questions (e.g. 'derivative of f(x) = x^3 ln(x)'), ALWAYS set visualizable: true and compose a 'curve' primitive graphing the function (e.g. expression: "a * x^3 * log(x)", xMin: 0.1, xMax: 4).
- If known_formula matches one the client supports (cube_tsa, cuboid_tsa, cylinder_tsa, cone_tsa, sphere_tsa, hemisphere_tsa, sector_area, trapezoid_area, triangle_area, quadratic_roots), return its exact key. Otherwise return null.
- Handle student terminology misnomers gracefully: If student asks for 'volume of a rectangle' or 'volume of a square', map to 3D Cuboid / Rectangular Prism (known_formula: 'cuboid_tsa', params: {l: 8, w: 5, h: 10}) or 2D rectangle area rather than returning visualizable: false.
- ALWAYS set visualizable: true for any mathematical problem.
- CRITICAL: Round all numbers to 2 decimal places (e.g. -2.56). NEVER output scientific notation, exponents, or long trailing zeros like E000000.
- Keep viewBox bounds (e.g. xMin: -10, xMax: 10, yMin: -10, yMax: 10) comfortably larger than the shape.`;

      // Stage 1: Generate verified step-by-step solution text
      const solveText = await geminiCall(systemPromptSolve, `Solve and explain this mathematical equation or question step-by-step:\n"${q}"`).catch(() => "Unable to generate step-by-step solution.");
      setTutorResponse(solveText || "Unable to generate step-by-step solution.");

      // Stage 2: Pass completed solution context to Gemini for 100% accurate parameter & shape extraction
      const rawText = await geminiCall(
        systemPromptVisual,
        `Original Problem: "${q}"\n\nVerified Solution Context:\n${solveText}\n\nBased on the verified solution context above, extract parameters and compose the accurate visual scene spec.`,
        8192,
        {
          responseMimeType: 'application/json',
          responseSchema: TOP_LEVEL_SCHEMA
        }
      ).catch(() => null);

      const sanitizedText = rawText ? rawText.replace(/(-?\d+\.?\d*)E[+0-]+/gi, '$1') : '';
      let rawObj = null;
      try {
        rawObj = JSON.parse(sanitizedText);
      } catch (e) {
        const m = sanitizedText ? sanitizedText.match(/\{[\s\S]*\}/) : null;
        if (m) {
          try { rawObj = JSON.parse(m[0]); } catch {}
        }
      }

      const validScene = validateScene(rawObj);

      // Priority 1: Check Deterministic Client Canonical Builder first to eliminate 2D line hallucinations
      const extractedConcept = validScene?.concept || validScene?.known_formula || q;
      const extractedParams = validScene?.params || {};
      const canonicalScene = buildCanonicalScene(extractedConcept, extractedParams);

      if (canonicalScene && !canonicalScene.unsupported) {
        if (canonicalScene.known_formula) {
          canonicalScene.formula = lookupFormula(canonicalScene.known_formula, canonicalScene.params);
        }
        setParsedVisualSpec(canonicalScene);
      } else if (validScene && !validScene.unsupported) {
        if (validScene.known_formula) {
          validScene.formula = lookupFormula(validScene.known_formula, validScene.params);
        }
        setParsedVisualSpec(validScene);
      } else {
        // Universal Dynamic Visualizer so EVERY question receives an accurate interactive diagram!
        setParsedVisualSpec(createUniversalMathVisualizer(q));
      }


    } catch (err) {
      console.error("Math AI Connection Error:", err);
      setTutorResponse(`Notice: ${err.message || 'Failed to connect to Math AI engine.'}`);
    } finally {
      setIsTutorThinking(false);
    }
  };


  const getFormattedFormula = () => {
    if (equationText && !equationText.startsWith('The equation is') && equationText.includes('=')) {
      return equationText;
    }
    switch (plotMode) {
      case 'linear':
        return `y = ${paramA === 1 ? '' : paramA === -1 ? '-' : paramA}x ${paramC >= 0 ? '+ ' + paramC : '- ' + Math.abs(paramC)}`;
      case 'quadratic':
        return `y = ${paramA !== 1 ? paramA : ''}x² ${paramC >= 0 ? '+ ' + paramC : '- ' + Math.abs(paramC)}`;
      case 'sine':
        return `y = ${paramA} · sin(${paramB}x) ${paramD >= 0 ? '+ ' + paramD : '- ' + Math.abs(paramD)}`;
      default:
        return equationText || 'y = x + 1';
    }
  };


  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: T.bg, color: T.text, fontFamily: 'var(--font-outfit), sans-serif' }}>
      
      {/* HEADER NAVBAR */}
      <header style={{
        background: T.s1,
        backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${T.border}`,
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxShadow: '0 2px 12px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            background: `linear-gradient(135deg, ${T.accent} 0%, ${T.purple} 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 4px 14px ${T.accent}40`
          }}>
            <Calculator size={24} color="#FFF" />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: T.text }}>Vedika Math Lab</h1>
            <span style={{ fontSize: 12, color: T.muted }}>
              Smart Crop Selection OCR & Interactive Visual Experiments
            </span>
          </div>
        </div>

        {/* TABS */}
        <div style={{ display: 'flex', background: T.s2, padding: 4, borderRadius: 10, gap: 4, border: `1px solid ${T.border}` }}>
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
                background: activeTab === id ? T.accent : 'transparent',
                color: activeTab === id ? '#FFF' : T.muted,
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
                transition: 'all 0.2s'
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
            <div style={{ background: T.s1, borderRadius: 16, border: `1px solid ${T.border}`, padding: 20, display: 'flex', flexDirection: 'column', gap: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Edit3 size={18} color={T.purple} />
                  <span style={{ fontWeight: 700, fontSize: 16, color: T.text }}>Smart Handwriting Whiteboard</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    onClick={() => switchTool('pen')}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 6,
                      border: drawTool === 'pen' ? `1px solid ${T.purple}` : `1px solid ${T.border}`,
                      background: drawTool === 'pen' ? `${T.purple}20` : 'transparent',
                      color: drawTool === 'pen' ? T.purple : T.text,
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
                      border: drawTool === 'select' ? `1px solid ${T.accent}` : `1px solid ${T.border}`,
                      background: drawTool === 'select' ? `${T.accent}20` : 'transparent',
                      color: drawTool === 'select' ? T.accent : T.text,
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
                      border: drawTool === 'eraser' ? `1px solid ${T.amber}` : `1px solid ${T.border}`,
                      background: drawTool === 'eraser' ? `${T.amber}20` : 'transparent',
                      color: drawTool === 'eraser' ? T.amber : T.text,
                      fontSize: 12,
                      cursor: 'pointer'
                    }}
                  >
                    Eraser
                  </button>
                  <button
                    onClick={clearWhiteboard}
                    style={{ padding: '6px 10px', borderRadius: 6, border: `1px solid ${T.border}`, background: 'transparent', color: T.muted, cursor: 'pointer' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* CANVAS slate with Scaled SVG Bounding Box Overlay */}
              <div style={{ position: 'relative', width: '100%', height: 380, borderRadius: 12, overflow: 'hidden', border: `1px solid ${T.border}` }}>
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
                      fill={`${T.accent}20`}
                      stroke={T.accent}
                      strokeWidth="2.5"
                      strokeDasharray="6 4"
                    />
                    <circle cx={cropBox.x} cy={cropBox.y} r={5} fill={T.text} />
                    <circle cx={cropBox.x + cropBox.w} cy={cropBox.y} r={5} fill={T.text} />
                    <circle cx={cropBox.x} cy={cropBox.y + cropBox.h} r={5} fill={T.text} />
                    <circle cx={cropBox.x + cropBox.w} cy={cropBox.y + cropBox.h} r={5} fill={T.text} />
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
                      background: `linear-gradient(135deg, ${T.accent} 0%, ${T.purple} 100%)`,
                      color: '#FFF',
                      border: 'none',
                      padding: '8px 14px',
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: `0 4px 14px ${T.accent}40`,
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
                    background: `linear-gradient(135deg, ${T.accent} 0%, ${T.purple} 100%)`,
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
                <div style={{ background: `${T.purple}15`, border: `1px solid ${T.purple}30`, padding: 12, borderRadius: 8, fontSize: 13, color: T.purple }}>
                  <strong>AI OCR Detection:</strong> {aiExplanation}
                </div>
              )}
            </div>

            {/* RIGHT: REAL-TIME 2D GRAPH PLOTTER */}
            <div style={{ background: T.s1, borderRadius: 16, border: `1px solid ${T.border}`, padding: 20, display: 'flex', flexDirection: 'column', gap: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <TrendingUp size={18} color={T.accent} />
                  <span style={{ fontWeight: 700, fontSize: 16, color: T.text }}>Real-Time 2D Graph Plotter</span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => setZoomScale(p => Math.min(p + 5, 60))} style={{ padding: '4px 8px', background: 'transparent', border: `1px solid ${T.border}`, color: T.text, borderRadius: 6 }}>
                    <ZoomIn size={14} />
                  </button>
                  <button onClick={() => setZoomScale(p => Math.max(p - 5, 15))} style={{ padding: '4px 8px', background: 'transparent', border: `1px solid ${T.border}`, color: T.text, borderRadius: 6 }}>
                    <ZoomOut size={14} />
                  </button>
                </div>
              </div>

              <div style={{ background: `${T.accent}12`, border: `1px solid ${T.accent}30`, padding: '12px 16px', borderRadius: 10, display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontSize: 11, color: T.muted }}>Active Curve</span>
                  <span style={{ fontSize: 18, fontWeight: 800, color: T.purple, fontFamily: 'monospace', display: 'block' }}>
                    {getFormattedFormula()}
                  </span>
                </div>
              </div>

              <div style={{ position: 'relative', width: '100%', height: 280, borderRadius: 12, overflow: 'hidden', border: `1px solid ${T.border}` }}>
                <canvas
                  ref={graphCanvasRef}
                  width={600}
                  height={280}
                  onMouseMove={handleGraphMouseMove}
                  onMouseLeave={() => setHoverCoord(null)}
                  style={{ width: '100%', height: '100%', cursor: 'crosshair' }}
                />
              </div>

              <div style={{ background: T.s2, padding: 14, borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 12, border: `1px solid ${T.border}` }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.purple, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Sliders size={14} /> Live Parameter Sliders
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 11, color: T.muted, display: 'flex', justifyContent: 'space-between' }}>
                      <span>Slope/Scale (a):</span> <b style={{ color: T.text }}>{paramA}</b>
                    </label>
                    <input type="range" min="-5" max="5" step="0.5" value={paramA} onChange={e => setParamA(parseFloat(e.target.value))} style={{ width: '100%', accentColor: T.accent }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: T.muted, display: 'flex', justifyContent: 'space-between' }}>
                      <span>Intercept/Offset (c):</span> <b style={{ color: T.text }}>{paramC}</b>
                    </label>
                    <input type="range" min="-10" max="10" step="1" value={paramC} onChange={e => setParamC(parseFloat(e.target.value))} style={{ width: '100%', accentColor: T.green }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: AI MATH TUTOR, VOICE INPUT & DYNAMIC VISUALIZER */}
        {activeTab === 'ai_tutor' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 960, margin: '0 auto' }}>
            <div style={{ background: T.s1, borderRadius: 16, border: `1px solid ${T.border}`, padding: 28, boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <Sparkles size={24} color={T.accent} />
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: T.text }}>AI Step-by-Step Math Tutor</h2>
                  <p style={{ fontSize: 13, color: T.muted, margin: 0 }}>
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
                      background: T.s2,
                      border: isListening ? `1px solid ${T.purple}` : `1px solid ${T.border}`,
                      color: T.text,
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
                      background: isListening ? `linear-gradient(135deg, ${T.purple} 0%, ${T.accent} 100%)` : `${T.purple}15`,
                      border: isListening ? `1px solid ${T.purple}` : `1px solid ${T.border}`,
                      color: isListening ? '#FFF' : T.purple,
                      padding: '6px 12px',
                      borderRadius: 20,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      boxShadow: isListening ? `0 0 14px ${T.purple}60` : 'none',
                      transition: 'all 0.2s'
                    }}
                  >
                    <Mic size={16} color={isListening ? '#FFF' : T.purple} />
                    <span style={{ fontSize: 11, fontWeight: 700 }}>
                      {isListening ? 'Listening...' : 'Voice'}
                    </span>
                  </button>
                </div>

                {/* UNIFIED SOLVE & VISUALIZE BUTTON */}
                <button
                  onClick={() => handleAskTutor('solve')}
                  disabled={isTutorThinking}
                  style={{
                    padding: '14px 24px',
                    borderRadius: 12,
                    border: 'none',
                    background: `linear-gradient(135deg, ${T.accent} 0%, ${T.purple} 100%)`,
                    color: '#FFF',
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: isTutorThinking ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    boxShadow: `0 4px 14px ${T.accent}40`,
                    whiteSpace: 'nowrap'
                  }}
                >
                  <Sparkles size={18} />
                  {isTutorThinking ? 'Thinking & Generating Scene...' : 'Solve & Visualize'}
                </button>
              </div>


              {/* LIVE FORMATTED MATH PREVIEW BADGE FOR LATEX INPUT */}
              {tutorQuery && (tutorQuery.includes('\\') || tutorQuery.includes('^') || tutorQuery.includes('_')) && (
                <div style={{ marginTop: '-8px', marginBottom: '20px', padding: '10px 16px', background: `${T.purple}15`, borderRadius: 10, border: `1px solid ${T.purple}40`, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Sparkles size={14} color={T.purple} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: T.purple, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Formatted Preview:</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: T.text, fontFamily: 'serif' }}>
                    {cleanMathLaTeX(tutorQuery)}
                  </span>
                </div>
              )}

              {/* QUICK EXAMPLE BUTTONS */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: T.muted }}>Try examples:</span>
                {[
                  "Surface area of a solid formed by joining cylinder and hemisphere",
                  "Area swept by 10cm minute hand in 5 minutes",
                  "Total area cleaned by two 40cm wipers sweeping 115°",
                  "Find area of right triangle with base 6 and height 8"
                ].map(ex => (
                  <button
                    key={ex}
                    onClick={() => { setTutorQuery(ex); handleAskTutor('solve', ex); }}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 20,
                      border: `1px solid ${T.accent}30`,
                      background: `${T.accent}12`,
                      color: T.accent,
                      fontSize: 12,
                      cursor: 'pointer',
                      fontWeight: 500
                    }}
                  >
                    {ex}
                  </button>
                ))}
              </div>

              {/* TUTOR RESPONSE & DYNAMIC VISUALIZER */}
              {(tutorResponse || parsedVisualSpec || isTutorThinking) && (
                <div style={{ marginTop: 24 }}>
                  {isTutorThinking ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: T.purple, padding: 20 }}>
                      <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
                      Processing request...
                    </div>
                  ) : (
                    <div>
                      {tutorResponse && (
                        <div style={{
                          padding: 24,
                          borderRadius: 14,
                          background: T.s2,
                          border: `1px solid ${T.border}`,
                          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
                          marginBottom: parsedVisualSpec ? 24 : 0
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: T.green, fontWeight: 700, marginBottom: 16 }}>
                            <Lightbulb size={20} /> Step-by-Step AI Solution
                          </div>

                          {/* KATEX MARKDOWN MATH RENDERER */}
                          <MathEquationRenderer content={tutorResponse} theme={T} />
                        </div>
                      )}


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

        {/* TAB 3: VISUAL CONCEPTS & INTERACTIVE LABS */}
        {activeTab === 'visualizers' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'flex', gap: 12, borderBottom: `1px solid ${T.border}`, paddingBottom: 12, overflowX: 'auto' }}>
              {[
                { id: 'pythagoras', label: 'Pythagoras Theorem', icon: Triangle },
                { id: 'sector', label: 'Circle Sector & Clock/Wiper', icon: Compass },
                { id: 'solid', label: '3D Solids & Mensuration', icon: Box },
                { id: 'trig', label: 'Unit Circle & Trigonometry', icon: Circle },
                { id: 'calculus', label: 'Calculus & Tangents', icon: TrendingUp },
                { id: 'ratio', label: 'Ratios & Proportions', icon: Sliders }
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
                    background: visualizerSubTab === id ? `${T.accent}20` : 'transparent',
                    color: visualizerSubTab === id ? T.accent : T.muted,
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </div>

            {/* 1. PYTHAGORAS LAB */}
            {visualizerSubTab === 'pythagoras' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ background: T.s1, padding: 18, borderRadius: 14, border: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <h3 style={{ margin: 0, fontSize: 16, color: T.accent, fontWeight: 700 }}>Pythagoras Theorem Proof Lab (a² + b² = c²)</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <label style={{ fontSize: 12, color: T.muted, display: 'flex', justifyContent: 'space-between' }}>
                        <span>Leg A (Base):</span> <b style={{ color: T.text }}>{pythA}</b>
                      </label>
                      <input type="range" min="3" max="15" value={pythA} onChange={e => setPythA(parseFloat(e.target.value))} style={{ width: '100%', accentColor: T.accent }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, color: T.muted, display: 'flex', justifyContent: 'space-between' }}>
                        <span>Leg B (Height):</span> <b style={{ color: T.text }}>{pythB}</b>
                      </label>
                      <input type="range" min="3" max="15" value={pythB} onChange={e => setPythB(parseFloat(e.target.value))} style={{ width: '100%', accentColor: T.purple }} />
                    </div>
                  </div>
                  <div style={{ background: `${T.green}15`, padding: '10px 16px', borderRadius: 8, border: `1px solid ${T.green}30`, fontSize: 13, color: T.green, fontWeight: 700 }}>
                    Hypotenuse c = √({pythA}² + {pythB}²) = √({pythA * pythA + pythB * pythB}) = {Math.sqrt(pythA * pythA + pythB * pythB).toFixed(2)} | Area = {(0.5 * pythA * pythB).toFixed(1)}
                  </div>
                </div>
                <DynamicMathVisualizer spec={{ concept: 'triangle_area', params: { base: pythA, height: pythB } }} />
              </div>
            )}

            {/* 2. CIRCLE SECTOR & CLOCK/WIPER LAB */}
            {visualizerSubTab === 'sector' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ background: T.s1, padding: 18, borderRadius: 14, border: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[
                      { id: 'sector', label: 'Circle Sector' },
                      { id: 'clock', label: 'Clock Minute Hand' },
                      { id: 'wiper', label: 'Windshield Wiper Sweep' }
                    ].map(btn => (
                      <button
                        key={btn.id}
                        onClick={() => {
                          setSectorKind(btn.id);
                          if (btn.id === 'clock') { setSectorRadius(10); setSectorAngle(30); }
                          else if (btn.id === 'wiper') { setSectorRadius(40); setSectorAngle(115); }
                        }}
                        style={{
                          padding: '6px 14px',
                          borderRadius: 20,
                          border: sectorKind === btn.id ? `1px solid ${T.accent}` : `1px solid ${T.border}`,
                          background: sectorKind === btn.id ? `${T.accent}20` : 'transparent',
                          color: sectorKind === btn.id ? T.accent : T.muted,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <label style={{ fontSize: 12, color: T.muted, display: 'flex', justifyContent: 'space-between' }}>
                        <span>Radius (r):</span> <b style={{ color: T.text }}>{sectorRadius}</b>
                      </label>
                      <input type="range" min="1" max="50" value={sectorRadius} onChange={e => setSectorRadius(parseFloat(e.target.value))} style={{ width: '100%', accentColor: T.accent }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, color: T.muted, display: 'flex', justifyContent: 'space-between' }}>
                        <span>Sweep Angle (θ°):</span> <b style={{ color: T.text }}>{sectorAngle}°</b>
                      </label>
                      <input type="range" min="10" max="360" value={sectorAngle} onChange={e => setSectorAngle(parseFloat(e.target.value))} style={{ width: '100%', accentColor: T.purple }} />
                    </div>
                  </div>
                  <div style={{ background: `${T.purple}15`, padding: '10px 16px', borderRadius: 8, border: `1px solid ${T.purple}30`, fontSize: 13, color: T.purple, fontWeight: 700 }}>
                    Sector Area = ({sectorAngle}°/360°) × π × {sectorRadius}² = {((sectorAngle / 360) * Math.PI * sectorRadius * sectorRadius).toFixed(1)} | Arc Length = {((sectorAngle / 360) * 2 * Math.PI * sectorRadius).toFixed(1)}
                  </div>
                </div>
                <DynamicMathVisualizer spec={{ concept: sectorKind === 'clock' ? 'clock_hand' : sectorKind === 'wiper' ? 'wiper_sweep' : 'sector_area', params: { radius: sectorRadius, angle: sectorAngle } }} />
              </div>
            )}

            {/* 3. 3D SOLIDS MENSURATION LAB */}
            {visualizerSubTab === 'solid' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ background: T.s1, padding: 18, borderRadius: 14, border: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {[
                      { id: 'cylinder', label: 'Cylinder' },
                      { id: 'cone', label: 'Cone' },
                      { id: 'sphere', label: 'Sphere' },
                      { id: 'hemisphere', label: 'Hemisphere' },
                      { id: 'cuboid', label: 'Cuboid / Box' },
                      { id: 'composite_solid', label: 'Composite Test-Tube' }
                    ].map(btn => (
                      <button
                        key={btn.id}
                        onClick={() => setSolidKind(btn.id)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: 20,
                          border: solidKind === btn.id ? `1px solid ${T.accent}` : `1px solid ${T.border}`,
                          background: solidKind === btn.id ? `${T.accent}20` : 'transparent',
                          color: solidKind === btn.id ? T.accent : T.muted,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <label style={{ fontSize: 12, color: T.muted, display: 'flex', justifyContent: 'space-between' }}>
                        <span>Radius / Length (r):</span> <b style={{ color: T.text }}>{solidRadius}</b>
                      </label>
                      <input type="range" min="1" max="20" value={solidRadius} onChange={e => setSolidRadius(parseFloat(e.target.value))} style={{ width: '100%', accentColor: T.accent }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, color: T.muted, display: 'flex', justifyContent: 'space-between' }}>
                        <span>Height / Width (h):</span> <b style={{ color: T.text }}>{solidHeight}</b>
                      </label>
                      <input type="range" min="1" max="25" value={solidHeight} onChange={e => setSolidHeight(parseFloat(e.target.value))} style={{ width: '100%', accentColor: T.green }} />
                    </div>
                  </div>
                </div>
                <DynamicMathVisualizer spec={{ concept: solidKind, params: { radius: solidRadius, height: solidHeight, l: solidRadius, w: solidRadius, h: solidHeight } }} />
              </div>
            )}

            {/* 4. UNIT CIRCLE TRIGONOMETRY LAB */}
            {visualizerSubTab === 'trig' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ background: T.s1, padding: 18, borderRadius: 14, border: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 12, color: T.muted, display: 'flex', justifyContent: 'space-between' }}>
                      <span>Angle (θ°):</span> <b style={{ color: T.text }}>{trigAngle}°</b>
                    </label>
                    <input type="range" min="0" max="360" value={trigAngle} onChange={e => setTrigAngle(parseFloat(e.target.value))} style={{ width: '100%', accentColor: T.accent }} />
                  </div>
                  <div style={{ background: `${T.accent}15`, padding: '10px 16px', borderRadius: 8, border: `1px solid ${T.accent}30`, fontSize: 13, color: T.accent, fontWeight: 700 }}>
                    sin({trigAngle}°) = {Math.sin((trigAngle * Math.PI) / 180).toFixed(3)} | cos({trigAngle}°) = {Math.cos((trigAngle * Math.PI) / 180).toFixed(3)} | sin²θ + cos²θ = 1.000
                  </div>
                </div>
                <DynamicMathVisualizer spec={{ concept: 'unit_circle', params: { angle1: trigAngle, angle2: 0 } }} />
              </div>
            )}

            {/* 5. CALCULUS TANGENT & INTEGRAL LAB */}
            {visualizerSubTab === 'calculus' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ background: T.s1, padding: 18, borderRadius: 14, border: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 12, color: T.muted, display: 'flex', justifyContent: 'space-between' }}>
                      <span>Function Scale / Parameter (a):</span> <b style={{ color: T.text }}>{calcX0}</b>
                    </label>
                    <input type="range" min="0.5" max="5" step="0.5" value={calcX0} onChange={e => setCalcX0(parseFloat(e.target.value))} style={{ width: '100%', accentColor: T.accent }} />
                  </div>
                </div>
                <DynamicMathVisualizer spec={{ concept: 'calculus_curve', params: { a: calcX0 } }} />
              </div>
            )}

            {/* 6. RATIOS & PROPORTIONS LAB */}
            {visualizerSubTab === 'ratio' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ background: T.s1, padding: 18, borderRadius: 14, border: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <label style={{ fontSize: 12, color: T.muted, display: 'flex', justifyContent: 'space-between' }}>
                        <span>Quantity A:</span> <b style={{ color: T.text }}>{ratioVal1}</b>
                      </label>
                      <input type="range" min="1" max="20" value={ratioVal1} onChange={e => setRatioVal1(parseFloat(e.target.value))} style={{ width: '100%', accentColor: T.accent }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, color: T.muted, display: 'flex', justifyContent: 'space-between' }}>
                        <span>Quantity B:</span> <b style={{ color: T.text }}>{ratioVal2}</b>
                      </label>
                      <input type="range" min="1" max="20" value={ratioVal2} onChange={e => setRatioVal2(parseFloat(e.target.value))} style={{ width: '100%', accentColor: T.green }} />
                    </div>
                  </div>
                  <div style={{ background: `${T.green}15`, padding: '10px 16px', borderRadius: 8, border: `1px solid ${T.green}30`, fontSize: 13, color: T.green, fontWeight: 700 }}>
                    Ratio A : B = {ratioVal1} : {ratioVal2} | Total = {ratioVal1 + ratioVal2} | Fraction A = {(ratioVal1 / (ratioVal1 + ratioVal2) * 100).toFixed(1)}%
                  </div>
                </div>
                <DynamicMathVisualizer spec={{ concept: 'ratio_bars', params: { val1: ratioVal1, val2: ratioVal2 } }} />
              </div>
            )}
          </div>
        )}


      </main>
    </div>
  );
}
