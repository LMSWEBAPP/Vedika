'use client';

import { useState, useEffect, useRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { usePyodide } from '@/hooks/usePyodide';
import { Play, Square, Trash2, CheckCircle, Loader2, Sparkles, ChevronLeft, ChevronRight, Pause, BookOpen, AlertCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { T, BUG_ANALYSIS_SYSTEM, BUG_TIPS_SYSTEM, BUG_FIX_METHODS_SYSTEM, FIX_EXPLANATION_SYSTEM, SOCRATIC_HELP_SYSTEM } from '@/lib/lms-data';


export default function Playground({
  initialCode = '# Write your Python code here\nprint("Hello World!")\n',
  codeOverride = null,
  explanationOverride = null,
  onTraceComplete = null,
  onCodeChange = null,
  codingExercise = null,
  onVerifySuccess = null
}) {
  const getInitialCode = () => {
    if (codingExercise?.hasExercise && codingExercise.starterCode) {
      return codingExercise.starterCode;
    }
    return initialCode;
  };

  const [code, setCode] = useState(getInitialCode);
  const [activeTab, setActiveTab] = useState(codingExercise?.hasExercise ? 'instructions' : 'explanation');
  const [explanation, setExplanation] = useState('');
  const [isGeneratingExplanation, setIsGeneratingExplanation] = useState(false);
  const [pendingTraceCode, setPendingTraceCode] = useState(null);
  const [assertionResults, setAssertionResults] = useState([]);
  const [verifyState, setVerifyState] = useState('idle'); // 'idle' | 'verifying' | 'success' | 'failed'
  const [traceError, setTraceError] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (codingExercise?.hasExercise && codingExercise.starterCode) {
      setCode(codingExercise.starterCode);
    } else {
      setCode(initialCode);
    }
    setVerifyState('idle');
    setAssertionResults([]);
    setTraceError(null);
  }, [codingExercise, initialCode]);

  const handleCodeChange = (newCode) => {
    setCode(newCode);
    if (onCodeChange) {
      onCodeChange(newCode);
    }
  };

  useEffect(() => {
    if (onCodeChange) {
      onCodeChange(code);
    }
  }, []);

  useEffect(() => {
    if (explanationOverride !== null) {
      setExplanation(explanationOverride);
    }
  }, [explanationOverride]);

  // Trace visualizer states
  const [traceData, setTraceData] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isTracing, setIsTracing] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1500); // 1500ms (1x), 1000ms (1.5x), 500ms (2x)
  const [selectedTutorAction, setSelectedTutorAction] = useState('default');
  const [vizZoom, setVizZoom] = useState(1); // zoom level for 2D visualizer

  const terminalElRef = useRef(null);
  const terminalInstanceRef = useRef(null);
  const fitAddonRef = useRef(null);
  const playIntervalRef = useRef(null);
  const editorViewRef = useRef(null);
  const editorPanelRef = useRef(null);
  // Stdin support refs
  const stdinLineRef = useRef('');
  const waitingForInputRef = useRef(false);
  const sendStdinRef = useRef(null);
  const [mainSplitPercent, setMainSplitPercent] = useState(50); // Left vs Right width percentage
  const [leftSplitPercent, setLeftSplitPercent] = useState(60); // Left Column: Editor height percentage
  const [rightSplitPercent, setRightSplitPercent] = useState(codingExercise?.hasExercise ? 58 : 100); // Right Column: Visualizer height percentage
  
  const isDraggingMainRef = useRef(false);
  const isDraggingLeftRef = useRef(false);
  const isDraggingRightRef = useRef(false);
  const containerRef = useRef(null); // Ref to the outer main split area container

  const handleMainMouseDown = (e) => {
    e.preventDefault();
    isDraggingMainRef.current = true;
    document.addEventListener('mousemove', handleMainMouseMove);
    document.addEventListener('mouseup', handleMainMouseUp);
  };

  const handleMainMouseMove = (e) => {
    if (!isDraggingMainRef.current) return;
    const container = containerRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      let percent = ((e.clientX - rect.left) / rect.width) * 100;
      if (percent < 25) percent = 25;
      if (percent > 75) percent = 75;
      setMainSplitPercent(percent);
    }
  };

  const handleMainMouseUp = () => {
    isDraggingMainRef.current = false;
    document.removeEventListener('mousemove', handleMainMouseMove);
    document.removeEventListener('mouseup', handleMainMouseUp);
  };

  const handleLeftMouseDown = (e) => {
    e.preventDefault();
    isDraggingLeftRef.current = true;
    document.addEventListener('mousemove', handleLeftMouseMove);
    document.addEventListener('mouseup', handleLeftMouseUp);
  };

  const handleLeftMouseMove = (e) => {
    if (!isDraggingLeftRef.current) return;
    const container = containerRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      let percent = ((e.clientY - rect.top) / rect.height) * 100;
      if (percent < 15) percent = 15;
      if (percent > 85) percent = 85;
      setLeftSplitPercent(percent);
    }
  };

  const handleLeftMouseUp = () => {
    isDraggingLeftRef.current = false;
    document.removeEventListener('mousemove', handleLeftMouseMove);
    document.removeEventListener('mouseup', handleLeftMouseUp);
  };

  const handleRightMouseDown = (e) => {
    e.preventDefault();
    isDraggingRightRef.current = true;
    document.addEventListener('mousemove', handleRightMouseMove);
    document.addEventListener('mouseup', handleRightMouseUp);
  };

  const handleRightMouseMove = (e) => {
    if (!isDraggingRightRef.current) return;
    const container = containerRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      let percent = ((e.clientY - rect.top) / rect.height) * 100;
      if (percent < 15) percent = 15;
      if (percent > 100) percent = 100;
      setRightSplitPercent(percent);
    }
  };

  const handleRightMouseUp = () => {
    isDraggingRightRef.current = false;
    document.removeEventListener('mousemove', handleRightMouseMove);
    document.removeEventListener('mouseup', handleRightMouseUp);
  };

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => {
      document.removeEventListener('mousemove', handleMainMouseMove);
      document.removeEventListener('mouseup', handleMainMouseUp);
      document.removeEventListener('mousemove', handleLeftMouseMove);
      document.removeEventListener('mouseup', handleLeftMouseUp);
      document.removeEventListener('mousemove', handleRightMouseMove);
      document.removeEventListener('mouseup', handleRightMouseUp);
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Hook callbacks
  const onStdout = (text) => {
    if (text.includes("__TEST_RESULTS__:")) {
      const parts = text.split("__TEST_RESULTS__:");
      const jsonStr = parts[1];
      if (parts[0] && terminalInstanceRef.current) {
        terminalInstanceRef.current.write(parts[0]);
      }
      try {
        const results = JSON.parse(jsonStr.trim());
        setAssertionResults(results);
        const allPassed = results.length > 0 && results.every(r => r.passed);
        if (allPassed) {
          setVerifyState('success');
          if (onVerifySuccess) onVerifySuccess();
        } else {
          setVerifyState('failed');
        }
      } catch (e) {
        console.error("Failed to parse test results:", e);
      }
      return;
    }
    if (terminalInstanceRef.current) {
      terminalInstanceRef.current.write(text);
    }
  };

  const onStderr = (text) => {
    if (terminalInstanceRef.current) {
      terminalInstanceRef.current.write(`\x1b[31m${text}\x1b[0m`);
    }
  };

  const onReady = () => {
    if (terminalInstanceRef.current) {
      terminalInstanceRef.current.write('\r\x1b[2K\x1b[32mEnvironment Ready!\x1b[0m\n');
    }
  };

  const onFinish = () => {
    // Reset stdin state when execution ends
    waitingForInputRef.current = false;
    stdinLineRef.current = '';
    if (verifyState === 'verifying' && assertionResults.length === 0) {
      setVerifyState('failed');
      setAssertionResults([{ expr: "Execution check", passed: false, msg: "Script completed but verification assertions failed or didn't run." }]);
    }
    if (terminalInstanceRef.current) {
      terminalInstanceRef.current.write('\n\x1b[90m--- Program finished ---\x1b[0m\n');
    }
  };

  const onError = (msg) => {
    // Reset stdin state on error
    waitingForInputRef.current = false;
    stdinLineRef.current = '';
    setIsTracing(false);
    if (verifyState === 'verifying') {
      setVerifyState('failed');
      setAssertionResults([{ expr: "Execution check", passed: false, msg: msg }]);
    }
    if (terminalInstanceRef.current) {
      terminalInstanceRef.current.write(`\x1b[31mError: ${msg}\x1b[0m\n`);
    }
    if (onTraceComplete) onTraceComplete(null);
  };

  // Called by the worker when Python's input() is waiting for user input
  const onStdinRequest = () => {
    waitingForInputRef.current = true;
    stdinLineRef.current = '';
    // Note: the prompt text already arrived via STDOUT before this fires.
    // Switch to cyan so the user's typed chars appear in a distinct color.
    if (terminalInstanceRef.current) {
      terminalInstanceRef.current.write('\x1b[96m');
    }
  };

  const validateTraceData = (trace) => {
    if (!trace || !Array.isArray(trace)) {
      return { valid: false, reason: "No execution trace was generated." };
    }
    if (trace.length > 500) {
      return { valid: false, reason: "Execution trace exceeds safety limits (> 500 steps). Infinite loop or heavy recursion detected." };
    }
    const lastStep = trace[trace.length - 1];
    if (lastStep && lastStep.error) {
      if (lastStep.error.includes("Trace limit exceeded")) {
        return { valid: false, reason: "Infinite loop safety limit exceeded. Pyodide execution tracing stopped to avoid freezing the browser." };
      }
    }
    return { valid: true };
  };

  const onTraceResult = (trace) => {
    const check = validateTraceData(trace);
    if (!check.valid) {
      setTraceError(check.reason);
      setTraceData(null);
      setIsTracing(false);
      if (onTraceComplete) onTraceComplete(null);
      return;
    }

    setTraceError(null);
    setTraceData(trace);
    setCurrentStep(0);
    setIsTracing(false);
    if (onTraceComplete) onTraceComplete(trace);
  };

  const { isReady, isRunning, runCode, runTrace, stopCode, sendStdin } = usePyodide({
    onStdout,
    onStderr,
    onReady,
    onFinish,
    onError,
    onTraceResult,
    onStdinRequest
  });

  // Keep sendStdin stable inside terminal's onKey closure
  useEffect(() => {
    sendStdinRef.current = sendStdin;
  }, [sendStdin]);

  // Trigger trace runner once Pyodide is ready and console execution is finished
  useEffect(() => {
    if (isReady && !isRunning && pendingTraceCode !== null) {
      const codeToTrace = pendingTraceCode;
      setPendingTraceCode(null);
      setIsTracing(true);
      setTraceError(null);
      runTrace(codeToTrace);
    }
  }, [isReady, isRunning, pendingTraceCode, runTrace]);

  // Handle parent code overrides
  useEffect(() => {
    if (codeOverride !== null) {
      handleCodeChange(codeOverride);
      setActiveTab('visualizer');
      setIsTracing(true);
      setTraceData(null);
      setTraceError(null);
      setPendingTraceCode(codeOverride);
    }
  }, [codeOverride]);

  // Auto-play interval
  useEffect(() => {
    if (isPlaying && traceData) {
      playIntervalRef.current = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= traceData.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, playSpeed);
    }
    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [isPlaying, traceData, playSpeed]);

  // Highlight and scroll active code line into view in CodeMirror editor
  useEffect(() => {
    if (editorViewRef.current) {
      const view = editorViewRef.current;
      if (traceData && traceData[currentStep]) {
        const activeLine = traceData[currentStep].line;
        try {
          if (activeLine > 0 && activeLine <= view.state.doc.lines) {
            const line = view.state.doc.line(activeLine);
            view.dispatch({
              selection: { anchor: line.from, head: line.to },
              scrollIntoView: true
            });
          }
        } catch (e) {
          console.warn("Error highlighting line in CodeMirror:", e);
        }
      } else {
        // Clear active selection when trace is finished/stopped/cleared
        try {
          const pos = view.state.selection.main.head;
          view.dispatch({
            selection: { anchor: pos, head: pos }
          });
        } catch (e) { }
      }
    }
  }, [currentStep, traceData]);

  // Initialize terminal with layout safety delays
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!terminalElRef.current) return;
    const isUnmounted = { current: false };

    const term = new Terminal({
      cursorBlink: true,
      theme: {
        background: '#090A0F', // matches dark premium theme
        foreground: '#E2E8F0',
        cursor: '#5B8CF8',
      },
      fontSize: 13,
      fontFamily: " var(--font-outfit), monospace",
      convertEol: true
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    // Delay opening slightly to let CSS grid/flex layouts fully settle their dimensions
    const initTimer = setTimeout(() => {
      if (isUnmounted.current || !terminalElRef.current) return;
      try {
        term.open(terminalElRef.current);
        terminalInstanceRef.current = term;
        fitAddonRef.current = fitAddon;
        fitAddon.fit();
        term.writeln("\x1b[33mLoading Python Environment (Pyodide WASM)...\x1b[0m");

        // --- Intercept keystrokes for interactive stdin (input() support) ---
        term.onKey(({ key, domEvent }) => {
          const kc = domEvent.keyCode;
          if (!waitingForInputRef.current) return;

          if (kc === 13) {
            // Enter — submit buffered line
            const line = stdinLineRef.current;
            stdinLineRef.current = '';
            waitingForInputRef.current = false;
            term.write('\x1b[0m\r\n'); // reset color, newline
            if (sendStdinRef.current) sendStdinRef.current(line);
          } else if (kc === 8 || kc === 127) {
            // Backspace
            if (stdinLineRef.current.length > 0) {
              stdinLineRef.current = stdinLineRef.current.slice(0, -1);
              term.write('\b \b');
            }
          } else if (key && key.length === 1) {
            // Printable character
            stdinLineRef.current += key;
            term.write(key);
          }
        });
      } catch (e) {
        console.warn("Failed to initialize xterm:", e);
      }
    }, 100);

    // Bulletproof terminal fitting using ResizeObserver
    const resizeObserver = new ResizeObserver((entries) => {
      if (isUnmounted.current) return;
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0 && terminalInstanceRef.current) {
          try {
            fitAddon.fit();
          } catch (e) {
            // Ignore errors during CSS transition resizing
          }
        }
      }
    });

    if (terminalElRef.current) {
      resizeObserver.observe(terminalElRef.current);
    }

    return () => {
      isUnmounted.current = true;
      clearTimeout(initTimer);
      resizeObserver.disconnect();
      try {
        term.dispose();
      } catch (e) {
        // Ignore internal disposal errors
      }
      terminalInstanceRef.current = null;
      fitAddonRef.current = null;
    };
  }, []);

  const generateExplanationForCode = async (codeText, actionType = 'default') => {
    if (!codeText || !codeText.trim()) return;
    setIsGeneratingExplanation(true);
    setExplanation('Generating response...');
    try {
      let systemPrompt = "You are an expert Python tutor. Explain the following Python code step-by-step. Keep your explanation concise, clear, and focused on how the code executes, data structures, and algorithms used. Do not include greetings. Use markdown.";
      let promptPrefix = "Please explain this Python code:\n";
      
      if (actionType === 'analyze') {
        systemPrompt = BUG_ANALYSIS_SYSTEM;
        promptPrefix = "Please analyze the bugs and time/space complexity of this Python code:\n";
      } else if (actionType === 'tips') {
        systemPrompt = BUG_TIPS_SYSTEM;
        promptPrefix = "Please provide hints and correction tips (without direct solution code) for this Python code:\n";
      } else if (actionType === 'fix') {
        systemPrompt = BUG_FIX_METHODS_SYSTEM;
        promptPrefix = "Please detail the fixing strategies and algorithms to resolve bugs in this Python code:\n";
      } else if (actionType === 'explain') {
        systemPrompt = FIX_EXPLANATION_SYSTEM;
        promptPrefix = "Please provide a theoretical explanation of how/why this Python code works:\n";
      } else if (actionType === 'help') {
        systemPrompt = SOCRATIC_HELP_SYSTEM;
        promptPrefix = "Please provide a Socratic guide helping me fix this Python code:\n";
      }

      const finalPrompt = `${promptPrefix}\`\`\`python\n${codeText}\n\`\`\``;

      let storedUserId = '';
      if (typeof window !== 'undefined') {
        storedUserId = localStorage.getItem('lms-user-id') || '';
      }

      const res = await fetch('/api/gemini/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: systemPrompt,
          user: finalPrompt,
          maxOutputTokens: 1500,
          userId: storedUserId
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to generate response');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      setExplanation('');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        setExplanation(fullText);
      }
    } catch (e) {
      console.error(e);
      setExplanation('⚠️ Failed to generate tutor response for this code.');
    } finally {
      setIsGeneratingExplanation(false);
    }
  };

  const handleTabClick = (tab) => {
    if (activeTab === tab && rightSplitPercent < 100) {
      setRightSplitPercent(100);
    } else {
      setActiveTab(tab);
      if (rightSplitPercent > 85) {
        setRightSplitPercent(58);
      }
    }
  };

  const handleRun = () => {
    if (!isReady || isRunning) return;
    setVerifyState('idle');
    setAssertionResults([]);
    setActiveTab('console');
    if (terminalInstanceRef.current) {
      terminalInstanceRef.current.clear();
      terminalInstanceRef.current.writeln('\x1b[90mRunning script...\x1b[0m');
    }

    // Start generating AI explanation in the background
    generateExplanationForCode(code, selectedTutorAction);

    // Setup tracing visualizer state to loading
    setIsTracing(true);
    setTraceData(null);
    setTraceError(null);

    // Queue trace execution for when runCode finishes
    setPendingTraceCode(code);

    // Execute code in Console
    runCode(code);
  };

  const handleVerify = () => {
    if (!isReady || isRunning) return;
    setVerifyState('verifying');
    setAssertionResults([]);
    setActiveTab('console');
    if (terminalInstanceRef.current) {
      terminalInstanceRef.current.clear();
      terminalInstanceRef.current.writeln('\x1b[90mVerifying solution against assertions...\x1b[0m');
    }

    const testCases = codingExercise?.testCases || [];
    let validationCode = code + "\n\n";
    validationCode += "import json\n__results = []\n";
    for (const testCase of testCases) {
      validationCode += `
try:
    ${testCase}
    __results.append({"expr": ${JSON.stringify(testCase)}, "passed": True})
except AssertionError as e:
    __results.append({"expr": ${JSON.stringify(testCase)}, "passed": False, "msg": str(e) or "Assertion failed"})
except Exception as e:
    __results.append({"expr": ${JSON.stringify(testCase)}, "passed": False, "msg": f"Error: {str(e)}"})
`;
    }
    validationCode += '\nprint("__TEST_RESULTS__:" + json.dumps(__results))\n';

    runCode(validationCode);
  };

  const handleClear = () => {
    if (terminalInstanceRef.current) {
      terminalInstanceRef.current.clear();
    }
  };

  // Dynamic sorting and array execution animator
  const renderArrayVisualizer = (listKey, listVal, variables, prevVariables) => {
    // 1. Find pointer variables pointing to indices in this list
    const pointers = {};
    Object.entries(variables).forEach(([k, v]) => {
      if (typeof v === 'number' && v >= 0 && v < listVal.length && !k.startsWith('__') && k !== 'step_counter') {
        if (!pointers[v]) pointers[v] = [];
        pointers[v].push(k);
      }
    });

    // 2. Detect swaps/changes
    const prevListVal = prevVariables?.[listKey];
    let actionType = "STEP";
    let swapMessage = "";
    
    // Determine action type and message
    const changedIndices = [];
    if (prevListVal && JSON.stringify(prevListVal) !== JSON.stringify(listVal)) {
      listVal.forEach((item, idx) => {
        if (prevListVal[idx] !== item) {
          changedIndices.push(idx);
        }
      });
      if (changedIndices.length === 2) {
        actionType = "SWAP";
        swapMessage = `Switch ${listVal[changedIndices[0]]} ↔ ${listVal[changedIndices[1]]}`;
      } else if (changedIndices.length > 0) {
        actionType = "ASSIGN";
        swapMessage = `Update [${changedIndices.join(', ')}]`;
      }
    } else {
      const activePointers = Object.entries(pointers).flatMap(([idx, names]) => names);
      if (activePointers.length >= 2) {
        actionType = "COMPARE";
        swapMessage = `Compare ${activePointers.join(' ↔ ')}`;
      }
    }

    const actionColors = {
      COMPARE: { text: '#5B8CF8', bg: 'rgba(91, 140, 248, 0.12)' },
      SWAP: { text: '#22C5A0', bg: 'rgba(34, 197, 160, 0.12)' },
      ASSIGN: { text: '#F5A95B', bg: 'rgba(245, 169, 91, 0.12)' },
      STEP: { text: '#8892B0', bg: 'rgba(255, 255, 255, 0.05)' }
    };
    const actionStyle = actionColors[actionType] || actionColors.STEP;

    // Draw compare-swap linker line if 2 active indices
    const activeIndices = Object.keys(pointers).map(Number).sort((a, b) => a - b);
    let linkerLine = null;
    if (activeIndices.length >= 2) {
      const idx1 = activeIndices[0];
      const idx2 = activeIndices[activeIndices.length - 1];
      const cellWidth = 42;
      const gap = 10;
      const stepWidth = cellWidth + gap; // 52px
      const leftPos = idx1 * stepWidth + (cellWidth / 2);
      const lineLength = (idx2 - idx1) * stepWidth;
      const color = actionType === 'SWAP' ? '#F5A95B' : '#22C5A0';

      linkerLine = (
        <div style={{
          position: 'absolute',
          top: '17px', // center of the 34px tall pill
          left: `${leftPos}px`,
          width: `${lineLength}px`,
          height: '2px',
          borderTop: `2px dotted ${color}`,
          zIndex: 0,
          pointerEvents: 'none',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          transform: 'translateY(-1px)'
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, transform: 'translateX(-3px)' }} />
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, transform: 'translateX(3px)' }} />
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 14, background: '#090A0F', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', marginBottom: 16 }}>
        {/* Dynamic Action Status Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10.5, color: '#8892B0', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Visual Execution ({listKey})
            </span>
            <span style={{ fontSize: 9.5, color: actionStyle.text, background: actionStyle.bg, padding: '2px 6px', borderRadius: 4, fontWeight: 800 }}>
              {actionType}
            </span>
          </div>
          {swapMessage && (
            <span style={{ fontSize: 12, color: actionStyle.text, fontWeight: 700, fontFamily: 'monospace' }}>
              ⚡ {swapMessage}
            </span>
          )}
        </div>

        {/* Array Pill Track */}
        <div style={{ display: 'flex', overflowX: 'auto', padding: '16px 4px 32px 4px', justifyContent: listVal.length <= 8 ? 'center' : 'flex-start', width: '100%' }} className="no-scrollbar">
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', position: 'relative' }}>
            {linkerLine}
            {listVal.map((item, idx) => {
              const activePointers = pointers[idx] || [];
              const isPointed = activePointers.length > 0;
              const wasChanged = prevListVal !== undefined && prevListVal[idx] !== item;

              let pillBg = '#131824';
              let pillBorder = '1px solid rgba(91, 140, 248, 0.15)';
              let textColor = '#8892B0';

              if (isPointed) {
                pillBg = actionType === 'SWAP' ? 'rgba(245, 169, 91, 0.12)' : 'rgba(34, 197, 160, 0.12)';
                pillBorder = actionType === 'SWAP' ? '1px solid #F5A95B' : '1px solid #22C5A0';
                textColor = actionType === 'SWAP' ? '#F5A95B' : '#22C5A0';
              } else if (wasChanged) {
                pillBg = 'rgba(245, 169, 91, 0.12)';
                pillBorder = '1px solid #F5A95B';
                textColor = '#F5A95B';
              }

              return (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 2 }}>
                  <motion.div
                    layout
                    transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                    style={{
                      width: 42,
                      height: 34,
                      borderRadius: 8,
                      background: pillBg,
                      border: pillBorder,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12.5,
                      fontWeight: 700,
                      color: textColor,
                      boxShadow: isPointed ? (actionType === 'SWAP' ? '0 0 12px rgba(245, 169, 91, 0.15)' : '0 0 12px rgba(34, 197, 160, 0.15)') : 'none',
                      userSelect: 'none'
                    }}
                  >
                    {String(item)}
                  </motion.div>

                  <div style={{ fontSize: 9, color: '#4A5568', marginTop: 4, fontFamily: 'monospace' }}>
                    [{idx}]
                  </div>

                  {isPointed && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'absolute', top: 48, zIndex: 10 }}>
                      <div style={{ width: 0, height: 0, borderLeft: '3px solid transparent', borderRight: '3px solid transparent', borderBottom: '5px solid currentColor', color: textColor, marginBottom: 2 }} />
                      <div style={{
                        background: textColor,
                        color: '#040508',
                        fontSize: 9,
                        fontWeight: 800,
                        padding: '1px 4px',
                        borderRadius: 3,
                        whiteSpace: 'nowrap',
                        fontFamily: 'monospace',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                      }}>
                        {activePointers.join(', ')}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const getTraceStepDetails = () => {
    if (!traceData || !traceData[currentStep]) return null;
    const { variables = {}, error, line, stdout = "" } = traceData[currentStep];
    const keys = Object.keys(variables);
    const prevStep = currentStep > 0 ? traceData[currentStep - 1] : null;
    const prevVariables = prevStep ? prevStep.variables : {};

    const listKey = keys.find(k => Array.isArray(variables[k]) && !k.startsWith('__'));
    const listVal = listKey ? variables[listKey] : [];
    
    // Find pointer variables pointing to indices in this list
    const pointers = {};
    if (listKey) {
      Object.entries(variables).forEach(([k, v]) => {
        if (typeof v === 'number' && v >= 0 && v < listVal.length && !k.startsWith('__') && k !== 'step_counter') {
          if (!pointers[v]) pointers[v] = [];
          pointers[v].push(k);
        }
      });
    }

    const prevListVal = prevVariables[listKey];
    let actionType = "STEP";
    let swapMessage = "";
    
    const changedIndices = [];
    if (listKey && prevListVal && JSON.stringify(prevListVal) !== JSON.stringify(listVal)) {
      listVal.forEach((item, idx) => {
        if (prevListVal[idx] !== item) {
          changedIndices.push(idx);
        }
      });
      if (changedIndices.length === 2) {
        actionType = "SWAP";
        swapMessage = `Switch ${listVal[changedIndices[0]]} ↔ ${listVal[changedIndices[1]]}`;
      } else if (changedIndices.length > 0) {
        actionType = "ASSIGN";
        swapMessage = `Update [${changedIndices.join(', ')}]`;
      }
    } else if (listKey) {
      const activePointers = Object.entries(pointers).flatMap(([idx, names]) => names);
      if (activePointers.length >= 2) {
        actionType = "COMPARE";
        swapMessage = `Compare ${activePointers.join(' ↔ ')}`;
      }
    }

    const scalarKeys = keys.filter(k => {
      const val = variables[k];
      return !Array.isArray(val) && (typeof val !== 'object' || val === null);
    });

    const dictKeys = keys.filter(k => {
      const val = variables[k];
      return typeof val === 'object' && val !== null && !Array.isArray(val);
    });

    // Active line info
    const lines = code.split('\n');
    const activeLineText = lines[line - 1]?.trim() || '';
    
    let lineActionType = "EXECUTE";
    if (activeLineText.startsWith('for ') || activeLineText.startsWith('while ')) {
      lineActionType = "LOOP EVALUATION";
    } else if (activeLineText.startsWith('if ') || activeLineText.startsWith('elif ') || activeLineText.startsWith('else:')) {
      lineActionType = "BRANCH DECISION";
    } else if (activeLineText.includes('print(')) {
      lineActionType = "PRINT OUTPUT";
    } else if (activeLineText.includes('=')) {
      lineActionType = "VARIABLE ASSIGN";
    } else if (activeLineText.startsWith('def ')) {
      lineActionType = "FUNCTION DECLARE";
    } else if (activeLineText.startsWith('return ')) {
      lineActionType = "FUNCTION RETURN";
    }

    return {
      variables,
      error,
      line,
      stdout,
      listKey,
      listVal,
      scalarKeys,
      dictKeys,
      actionType,
      swapMessage,
      activeLineText,
      lineActionType
    };
  };

  // 3D visualizer removed — 2D only


  // Variable visualizer renderer
  const renderVariables = () => {
    if (!traceData || !traceData[currentStep]) return null;
    const { variables = {}, error, line, stdout = "" } = traceData[currentStep];
    
    if (error) {
      return (
        <div style={{ color: '#F55B6B', background: 'rgba(245,91,107,0.08)', border: '1px solid rgba(245,91,107,0.3)', padding: 12, borderRadius: 8, fontSize: 13, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <strong style={{ display: 'block' }}>⚠️ Python Runtime Error</strong>
          <span style={{ fontFamily: 'monospace' }}>{error}</span>
        </div>
      );
    }

    const keys = Object.keys(variables);
    const prevStep = currentStep > 0 ? traceData[currentStep - 1] : null;

    // 1. Current Code Line Inspector
    const lines = code.split('\n');
    const activeLineText = lines[line - 1]?.trim() || '';
    
    let lineActionType = "EXECUTE";
    if (activeLineText.startsWith('for ') || activeLineText.startsWith('while ')) {
      lineActionType = "LOOP EVALUATION";
    } else if (activeLineText.startsWith('if ') || activeLineText.startsWith('elif ') || activeLineText.startsWith('else:')) {
      lineActionType = "BRANCH DECISION";
    } else if (activeLineText.includes('print(')) {
      lineActionType = "PRINT OUTPUT";
    } else if (activeLineText.includes('=')) {
      lineActionType = "VARIABLE ASSIGN";
    } else if (activeLineText.startsWith('def ')) {
      lineActionType = "FUNCTION DECLARE";
    } else if (activeLineText.startsWith('return ')) {
      lineActionType = "FUNCTION RETURN";
    }

    const lineInspector = activeLineText ? (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 12, background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)', marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 9.5, color: '#8892B0', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Active Line {line}</span>
          <span style={{ fontSize: 9, color: '#F5A95B', background: 'rgba(245, 169, 91, 0.1)', padding: '2px 6px', borderRadius: 4, fontWeight: 800, letterSpacing: '0.04em' }}>{lineActionType}</span>
        </div>
        <div style={{ fontFamily: 'monospace', fontSize: 13, color: '#E2E8F0', whiteSpace: 'pre-wrap', wordBreak: 'break-all', padding: '4px 8px', background: '#090A0F', borderRadius: 6, borderLeft: '3px solid #F5A95B' }}>
          {activeLineText}
        </div>
      </div>
    ) : null;

    // Detect if we have a list to visualize
    const listKey = keys.find(k => Array.isArray(variables[k]) && !k.startsWith('__'));

    // Separate lists and scalars
    const scalarKeys = keys.filter(k => {
      const val = variables[k];
      return !Array.isArray(val) && (typeof val !== 'object' || val === null);
    });

    const dictKeys = keys.filter(k => {
      const val = variables[k];
      return typeof val === 'object' && val !== null && !Array.isArray(val);
    });

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Active Line Code Block */}
        {lineInspector}

        {/* Array execution animator (if array exists) */}
        {listKey && renderArrayVisualizer(listKey, variables[listKey], variables, prevStep?.variables)}

        {/* Memory Stack Variable Grid (Scalar Values) */}
        {scalarKeys.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12, background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 10 }}>
            <div style={{ fontSize: 9.5, color: '#8892B0', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 6, marginBottom: 4 }}>
              STACK MEMORY REGISTER
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {scalarKeys.map((key) => {
                const val = variables[key];
                const prevVal = prevStep ? prevStep.variables?.[key] : undefined;
                const isChanged = prevVal !== undefined && JSON.stringify(prevVal) !== JSON.stringify(val);
                const valType = typeof val;
                
                const borderStyle = isChanged ? '1px solid rgba(245, 169, 91, 0.4)' : '1px solid rgba(255, 255, 255, 0.05)';
                const shadowStyle = isChanged ? '0 0 10px rgba(245, 169, 91, 0.1)' : 'none';
                const valColor = isChanged ? '#F5A95B' : (valType === 'boolean' ? '#22C5A0' : (valType === 'number' ? '#5B8CF8' : '#F5A95B'));

                return (
                  <motion.div
                    key={key}
                    layout
                    className="variable-card"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      background: '#0D111A',
                      border: borderStyle,
                      boxShadow: shadowStyle,
                      borderRadius: 8,
                      overflow: 'hidden'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <span style={{ fontWeight: 700, color: '#8892B0', fontSize: 12, fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 4 }}>
                        {key}
                        <span style={{ fontSize: 8, color: valType === 'number' ? '#5B8CF8' : valType === 'boolean' ? '#22C5A0' : '#F5A95B', textTransform: 'uppercase', opacity: 0.6 }}>
                          {valType}
                        </span>
                      </span>
                    </div>

                    {/* Value slot with vertical shifting AnimatePresence animation */}
                    <div style={{
                      minWidth: 40,
                      height: 24,
                      background: '#161B26',
                      border: isChanged ? '1px solid rgba(245, 169, 91, 0.25)' : '1px solid rgba(255,255,255,0.04)',
                      borderRadius: 6,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 6px',
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      <AnimatePresence mode="popLayout" initial={false}>
                        <motion.span
                          key={JSON.stringify(val)} // key triggers AnimatePresence on update
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                          style={{
                            fontSize: 11.5,
                            color: valColor,
                            fontWeight: 800,
                            fontFamily: 'monospace',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {String(val)}
                        </motion.span>
                      </AnimatePresence>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Dicts Visualizer */}
        {dictKeys.map((key) => {
          const val = variables[key];
          const prevVal = prevStep ? prevStep.variables?.[key] : undefined;
          const isChanged = prevVal !== undefined && JSON.stringify(prevVal) !== JSON.stringify(val);
          const borderStyle = isChanged ? '1px solid rgba(245, 169, 91, 0.4)' : '1px solid rgba(255, 255, 255, 0.06)';
          const shadowStyle = isChanged ? '0 0 12px rgba(245, 169, 91, 0.15)' : 'none';

          return (
            <motion.div
              key={key}
              layout
              animate={{ scale: isChanged ? [1, 1.03, 1] : 1 }}
              transition={{ duration: 0.3 }}
              className="variable-card"
              style={{ background: '#0D111A', border: borderStyle, boxShadow: shadowStyle, borderRadius: 8, padding: 12 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ fontSize: 11, color: '#8892B0', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{key} (Dict)</div>
                {isChanged && <span style={{ fontSize: 9, color: '#F5A95B', background: 'rgba(245, 169, 91, 0.12)', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>Modified</span>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {Object.entries(val).map(([k, v]) => {
                  const prevSubVal = prevVal && typeof prevVal === 'object' ? prevVal[k] : undefined;
                  const isSubValChanged = prevSubVal !== undefined && prevSubVal !== v;
                  return (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, borderBottom: `1px solid rgba(255, 255, 255, 0.05)`, padding: '3px 0' }}>
                      <span style={{ color: '#8892B0', fontFamily: 'monospace' }}>{k}</span>
                      <motion.span
                        animate={{ color: isSubValChanged ? '#F5A95B' : '#DDE3F2' }}
                        style={{ fontWeight: 600, fontFamily: 'monospace' }}
                      >
                        {String(v)}
                      </motion.span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          );
        })}

        {/* Stdout Console output */}
        {stdout && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12, background: '#020204', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)', marginTop: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 6 }}>
              <span style={{ fontSize: 9.5, color: '#647298', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>OUTPUT STREAM CONSOLE</span>
              <div style={{ display: 'flex', gap: 4 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#F55B6B' }} />
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#F5A95B' }} />
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C5A0' }} />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontFamily: 'monospace', fontSize: 12, color: '#22C5A0', maxHeight: 110, overflowY: 'auto', padding: '4px 6px' }} className="no-scrollbar">
              {stdout.split('\n').filter(l => l.length > 0).map((line, li) => (
                <motion.div
                  key={li}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.18 }}
                  style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
                >
                  {line}
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: '#040508',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: 0,
      overflow: 'hidden',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
    }}>
      {/* Playground Header */}
      <div style={{
        padding: '12px 16px',
        background: '#080A0E',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 10
      }}>
        {/* Execution Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleRun}
            disabled={!isReady || isRunning || isTracing}
            style={{
              background: (!isReady || isRunning || isTracing) ? 'rgba(255, 255, 255, 0.08)' : '#22C5A0',
              color: '#000',
              border: 'none',
              padding: '6px 14px',
              borderRadius: 6,
              fontSize: 12.5,
              fontWeight: 700,
              cursor: (!isReady || isRunning || isTracing) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              opacity: (!isReady || isRunning || isTracing) ? 0.6 : 1,
              transition: 'opacity 0.15s',
              fontFamily: 'inherit'
            }}
          >
            {isRunning && activeTab === 'console' && verifyState !== 'verifying' ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={13} fill="#000" />}
            Run
          </button>

          {codingExercise?.hasExercise && (
            <button
              onClick={handleVerify}
              disabled={!isReady || isRunning || isTracing}
              style={{
                background: (!isReady || isRunning || isTracing) ? 'rgba(255, 255, 255, 0.08)' : '#9B6EF8',
                color: '#fff',
                border: 'none',
                padding: '6px 14px',
                borderRadius: 6,
                fontSize: 12.5,
                fontWeight: 700,
                cursor: (!isReady || isRunning || isTracing) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                opacity: (!isReady || isRunning || isTracing) ? 0.6 : 1,
                transition: 'all 0.15s',
                fontFamily: 'inherit'
              }}
            >
              {verifyState === 'verifying' ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle size={13} />}
              Verify Solution
            </button>
          )}
        </div>

        {/* Status Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#8892B0', fontWeight: 500 }}>
            {!isReady ? (
              <>
                <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                <span>Loading Environment...</span>
              </>
            ) : isRunning ? (
              <>
                <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ color: '#5B8CF8' }}>{verifyState === 'verifying' ? 'Verifying...' : 'Running Code...'}</span>
              </>
            ) : isTracing ? (
              <>
                <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ color: '#F5A95B' }}>Generating Trace...</span>
              </>
            ) : isGeneratingExplanation ? (
              <>
                <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ color: '#22C5A0' }}>Explaining Code...</span>
              </>
            ) : (
              <>
                <CheckCircle size={13} style={{ color: '#22C5A0' }} />
                <span style={{ color: '#22C5A0' }}>Environment Ready</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Split Area */}
      <div ref={containerRef} style={{ display: 'flex', flex: 1, height: 'calc(100% - 48px)', overflow: 'hidden', flexDirection: isMobile ? 'column' : 'row' }}>
        
        {/* LEFT COLUMN: Code Editor & Console Terminal */}
        <div style={{
          width: isMobile ? '100%' : `${mainSplitPercent}%`,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#06080C',
          overflow: 'hidden'
        }}>
          {/* Top Half: Code Editor */}
          <div style={{ height: isMobile ? '55%' : `${leftSplitPercent}%`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '8px 14px', background: '#080A0E', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 10.5, color: '#8892B0', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Source Code Editor</span>
              <div style={{ display: 'flex', gap: 4 }}>
                {codingExercise?.hasExercise && (
                  <button
                    onClick={handleVerify}
                    disabled={!isReady || isRunning}
                    style={{
                      background: 'rgba(155, 110, 248, 0.15)',
                      border: '1px solid #9B6EF8',
                      color: '#9B6EF8',
                      padding: '3px 8px',
                      borderRadius: 4,
                      fontSize: 10.5,
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {verifyState === 'verifying' ? 'Verifying...' : 'Verify Code'}
                  </button>
                )}
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <CodeMirror
                value={code}
                theme="dark"
                extensions={[python()]}
                onChange={(value) => handleCodeChange(value)}
                onCreateEditor={(view) => {
                  editorViewRef.current = view;
                }}
                style={{ fontSize: 13, fontFamily: 'monospace' }}
              />
            </div>
          </div>

          {/* Left Column Vertical Resizer Handle */}
          {!isMobile && (
            <div
              onMouseDown={handleLeftMouseDown}
              style={{
                height: 6,
                cursor: 'row-resize',
                background: isDraggingLeftRef.current ? 'rgba(91, 140, 248, 0.4)' : 'rgba(255, 255, 255, 0.08)',
                zIndex: 10,
                width: '100%',
                flexShrink: 0,
                transition: 'background 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(91, 140, 248, 0.3)'}
              onMouseLeave={e => {
                if (!isDraggingLeftRef.current) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                }
              }}
            />
          )}

          {/* Bottom Half: Console Terminal */}
          <div style={{ height: isMobile ? '45%' : `${100 - leftSplitPercent}%`, display: 'flex', flexDirection: 'column', background: '#040508', overflow: 'hidden' }}>
            <div style={{ padding: '8px 14px', background: '#080A0E', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 10.5, color: '#8892B0', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Output Console</span>
              <button
                onClick={handleClear}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#647298',
                  cursor: 'pointer',
                  padding: 2,
                  display: 'flex',
                  alignItems: 'center'
                }}
                title="Clear Console"
              >
                <Trash2 size={11} />
              </button>
            </div>
            <div
              ref={terminalElRef}
              style={{
                flex: 1,
                padding: '8px 12px',
                overflow: 'hidden',
                background: '#040508'
              }}
            />
          </div>
        </div>

        {/* Main Horizontal Split Resizer Handle */}
        {!isMobile && (
          <div
            onMouseDown={handleMainMouseDown}
            style={{
              width: 6,
              cursor: 'col-resize',
              background: isDraggingMainRef.current ? 'rgba(91, 140, 248, 0.4)' : 'rgba(255, 255, 255, 0.08)',
              zIndex: 10,
              alignSelf: 'stretch',
              transition: 'background 0.2s',
              flexShrink: 0
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(91, 140, 248, 0.3)'}
            onMouseLeave={e => {
              if (!isDraggingMainRef.current) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
              }
            }}
          />
        )}

        {/* RIGHT COLUMN: Visualizer & Explanation Pane */}
        <div style={{
          width: isMobile ? '100%' : `${100 - mainSplitPercent}%`,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#040508',
          overflow: 'hidden'
        }}>
          {/* Top Half: Visualizer panel */}
          <div style={{
            height: rightSplitPercent === 100 ? 'calc(100% - 36px)' : `${rightSplitPercent}%`,
            display: 'flex',
            flexDirection: 'column',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            overflow: 'hidden',
            flexShrink: 0
          }}>
            {/* Visualizer header controls */}
            <div style={{
              padding: '10px 14px',
              background: '#080A0E',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0
            }}>
              {traceData ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      style={{
                        background: '#F5A95B',
                        color: '#000',
                        border: 'none',
                        padding: '5px 10px',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      {isPlaying ? <Pause size={10} fill="#000" /> : <Play size={10} fill="#000" />}
                      {isPlaying ? 'Pause' : 'Auto Play'}
                    </button>
                    <button
                      onClick={() => {
                        setPlaySpeed(prev => {
                          if (prev === 1500) return 1000;
                          if (prev === 1000) return 500;
                          return 1500;
                        });
                      }}
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#8892B0',
                        padding: '5px 8px',
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontFamily: 'monospace'
                      }}
                    >
                      {playSpeed === 1500 ? '1.0x' : playSpeed === 1000 ? '1.5x' : '2.0x'}
                    </button>

                    {/* Zoom controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, padding: 2 }}>
                      <button
                        onClick={() => setVizZoom(z => Math.min(z + 0.15, 2.5))}
                        style={{ background: 'transparent', border: 'none', color: '#8892B0', cursor: 'pointer', padding: '2px 7px', borderRadius: 3, fontSize: 14, fontWeight: 700, lineHeight: 1 }}
                        title="Zoom In"
                      >+</button>
                      <span style={{ fontSize: 9.5, color: '#647298', fontFamily: 'monospace', minWidth: 32, textAlign: 'center', userSelect: 'none' }}>{Math.round(vizZoom * 100)}%</span>
                      <button
                        onClick={() => setVizZoom(z => Math.max(z - 0.15, 0.4))}
                        style={{ background: 'transparent', border: 'none', color: '#8892B0', cursor: 'pointer', padding: '2px 7px', borderRadius: 3, fontSize: 14, fontWeight: 700, lineHeight: 1 }}
                        title="Zoom Out"
                      >−</button>
                      <button
                        onClick={() => setVizZoom(1)}
                        style={{ background: 'transparent', border: 'none', color: '#4A5568', cursor: 'pointer', padding: '2px 6px', borderRadius: 3, fontSize: 9, fontWeight: 700 }}
                        title="Reset Zoom"
                      >↺</button>
                    </div>

                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        disabled={currentStep === 0}
                        onClick={() => { setIsPlaying(false); setCurrentStep(prev => prev - 1); }}
                        style={{
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          color: currentStep === 0 ? '#4A5568' : '#F8FAFC',
                          padding: 5,
                          borderRadius: 4,
                          cursor: currentStep === 0 ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <ChevronLeft size={12} />
                      </button>
                      <button
                        disabled={currentStep === traceData.length - 1}
                        onClick={() => { setIsPlaying(false); setCurrentStep(prev => prev + 1); }}
                        style={{
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          color: currentStep === traceData.length - 1 ? '#4A5568' : '#F8FAFC',
                          padding: 5,
                          borderRadius: 4,
                          cursor: currentStep === 0 ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <ChevronRight size={12} />
                      </button>
                    </div>
                  </div>
                  <span style={{ fontSize: 11, color: '#8892B0', fontWeight: 600, fontFamily: 'monospace' }}>
                    Step {currentStep + 1} of {traceData.length}
                  </span>
                </>
              ) : (
                <span style={{ fontSize: 10.5, color: '#8892B0', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Execution Visualizer
                </span>
              )}
            </div>

            {/* Timeline Scrubber (if trace exists) */}
            {traceData && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 14px', background: '#090A0F', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', flexShrink: 0 }}>
                <span style={{ fontSize: 10, color: '#647298', fontFamily: 'monospace', userSelect: 'none' }}>01</span>
                <input 
                  type="range"
                  min={0}
                  max={traceData.length - 1}
                  value={currentStep}
                  onChange={(e) => {
                    setIsPlaying(false);
                    setCurrentStep(parseInt(e.target.value));
                  }}
                  style={{
                    flex: 1,
                    height: 4,
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: 2,
                    outline: 'none',
                    cursor: 'pointer',
                    accentColor: '#F5A95B'
                  }}
                />
                <span style={{ fontSize: 10, color: '#647298', fontFamily: 'monospace', userSelect: 'none' }}>
                  {String(traceData.length).padStart(2, '0')}
                </span>
              </div>
            )}

            {/* Variable memory values scrolling track */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              overflowX: 'auto',
              background: 'transparent',
              position: 'relative'
            }} className="sandbox-scroll">
              {traceError && (
                <div style={{ display: 'flex', height: '100%', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px', textAlign: 'center', gap: 12 }}>
                  <div style={{ fontSize: 32 }}>⚠️</div>
                  <h3 style={{ color: '#F8FAFC', fontSize: 16, fontWeight: 700, margin: 0 }}>Visualizer Blocked</h3>
                  <p style={{ color: '#8892B0', fontSize: 13, maxWidth: 360, margin: 0, lineHeight: 1.6 }}>{traceError}</p>
                </div>
              )}
              {isTracing && (
                <div style={{ display: 'flex', height: '100%', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: '#8892B0' }}>
                  <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: 13 }}>Generating step-by-step trace timeline...</span>
                </div>
              )}
              {!isTracing && !traceData && !traceError && (
                <div style={{ display: 'flex', height: '100%', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px', textAlign: 'center', color: '#8892B0', gap: 8 }}>
                  <Sparkles size={24} color="#F5A95B" />
                  <span style={{ fontSize: 13, maxWidth: 360 }}>
                    Run your code first to generate a trace timeline and inspect Python execution step-by-step.
                  </span>
                </div>
              )}
              {traceData && (
                <div style={{
                  padding: 14,
                  transformOrigin: 'top left',
                  transform: `scale(${vizZoom})`,
                  width: `${100 / vizZoom}%`,
                  minHeight: '100%'
                }}>
                  {renderVariables()}
                </div>
              )}
            </div>
          </div>

          {/* Right Column Vertical Resizer Handle */}
          {!isMobile && (
            <div
              onMouseDown={handleRightMouseDown}
              style={{
                height: 6,
                cursor: 'row-resize',
                background: isDraggingRightRef.current ? 'rgba(245, 169, 91, 0.4)' : 'rgba(255, 255, 255, 0.08)',
                zIndex: 10,
                width: '100%',
                flexShrink: 0,
                transition: 'background 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(245, 169, 91, 0.3)'}
              onMouseLeave={e => {
                if (!isDraggingRightRef.current) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                }
              }}
            />
          )}

          {/* Bottom Half: Explanation and Tutor features */}
          <div style={{
            height: rightSplitPercent === 100 ? '36px' : `${100 - rightSplitPercent}%`,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            background: '#040508',
            flexShrink: 0
          }}>
            {/* Tab Selection Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: '#080A0E',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              height: 36,
              flexShrink: 0,
              padding: '0 10px',
              width: '100%'
            }}>
              <button
                onClick={() => handleTabClick('explanation')}
                style={{
                  background: activeTab === 'explanation' && rightSplitPercent < 100 ? 'rgba(34, 197, 160, 0.08)' : 'transparent',
                  border: 'none',
                  borderBottom: activeTab === 'explanation' && rightSplitPercent < 100 ? `2px solid #22C5A0` : 'none',
                  color: activeTab === 'explanation' && rightSplitPercent < 100 ? '#22C5A0' : '#8892B0',
                  padding: '6px 16px',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontFamily: 'inherit',
                  outline: 'none',
                  transition: 'all 0.15s'
                }}
              >
                Tutor Explanation
              </button>
              {codingExercise?.hasExercise && (
                <button
                  onClick={() => handleTabClick('instructions')}
                  style={{
                    background: activeTab === 'instructions' && rightSplitPercent < 100 ? 'rgba(155, 110, 248, 0.08)' : 'transparent',
                    border: 'none',
                    borderBottom: activeTab === 'instructions' && rightSplitPercent < 100 ? `2px solid #9B6EF8` : 'none',
                    color: activeTab === 'instructions' && rightSplitPercent < 100 ? '#9B6EF8' : '#8892B0',
                    padding: '6px 16px',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    fontFamily: 'inherit',
                    outline: 'none',
                    transition: 'all 0.15s'
                  }}
                >
                  Instructions & Test Cases
                </button>
              )}
              
              {/* Collapse Button */}
              {rightSplitPercent < 100 && (
                <button
                  onClick={() => setRightSplitPercent(100)}
                  title="Collapse Explanation Pane"
                  style={{
                    marginLeft: 'auto',
                    background: 'transparent',
                    border: 'none',
                    color: '#647298',
                    cursor: 'pointer',
                    padding: '6px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10.5,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    transition: 'color 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = '#F55B6B'}
                  onMouseLeave={e => e.currentTarget.style.color = '#647298'}
                >
                  ✕ Collapse
                </button>
              )}
            </div>

            {/* Content scroll area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: rightSplitPercent === 100 ? 'none' : 'block' }} className="sandbox-scroll tab-pane">
              {/* Tab 1: Explanation tab */}
              {(!codingExercise?.hasExercise || activeTab === 'explanation') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Tutor Command Options Dropdown */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '8px 12px',
                    background: '#090A0F',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: 8,
                    flexShrink: 0
                  }}>
                    <span style={{ fontSize: 11, color: '#8892B0', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Tutor Action:</span>
                    <select
                      value={selectedTutorAction}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedTutorAction(val);
                        generateExplanationForCode(code, val);
                      }}
                      style={{
                        background: '#131824',
                        color: '#F8FAFC',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: 6,
                        padding: '4px 8px',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                        outline: 'none',
                        flex: 1,
                        maxWidth: 220
                      }}
                    >
                      <option value="default">📖 Standard Code Explanation</option>
                      <option value="analyze">🔍 Code Analysis & Complexity</option>
                      <option value="tips">💡 Bug Correction Tips</option>
                      <option value="fix">🛠️ Bug Fixing Methods</option>
                      <option value="explain">📖 Why It Works</option>
                    </select>
                  </div>

                  <div>
                    {!explanation && !isGeneratingExplanation ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 0', textAlign: 'center', color: '#8892B0', gap: 6 }}>
                        <BookOpen size={20} color="#22C5A0" />
                        <span style={{ fontSize: 12.5 }}>
                          Select an action from the dropdown or click Run to trigger explanations.
                        </span>
                      </div>
                    ) : isGeneratingExplanation && !explanation ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#8892B0', padding: '20px 0' }}>
                        <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} color="#22C5A0" />
                        <span style={{ fontSize: 12.5 }}>Generating tutor response...</span>
                      </div>
                    ) : (
                      <div className="md-content" style={{ fontSize: 13.5, lineHeight: 1.65 }}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {explanation}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 2: Instructions and Test cases (only if exercise is active) */}
              {codingExercise?.hasExercise && activeTab === 'instructions' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <h5 style={{ color: '#9B6EF8', fontSize: 12, fontWeight: 700, margin: '0 0 6px 0', textTransform: 'uppercase' }}>
                      Instructions
                    </h5>
                    <div style={{ color: '#C4CFE5', fontSize: 13, lineHeight: 1.6 }} className="md-content">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {codingExercise.instruction || "*No instructions provided.*"}
                      </ReactMarkdown>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: 12 }}>
                    <h5 style={{ color: '#22C5A0', fontSize: 12, fontWeight: 700, margin: '0 0 10px 0', textTransform: 'uppercase' }}>
                      Test Cases & Assertions
                    </h5>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {verifyState === 'success' && (
                        <div style={{ background: 'rgba(34, 197, 160, 0.1)', border: '1px solid rgba(34, 197, 160, 0.25)', borderRadius: 6, padding: 10, display: 'flex', alignItems: 'center', gap: 8, color: '#22C5A0', fontSize: 12, fontWeight: 600 }}>
                          <Sparkles size={14} />
                          <span>All test cases passed! 🎉</span>
                        </div>
                      )}
                      {verifyState === 'failed' && (
                        <div style={{ background: 'rgba(245, 91, 107, 0.1)', border: '1px solid rgba(245, 91, 107, 0.25)', borderRadius: 6, padding: 10, display: 'flex', alignItems: 'center', gap: 8, color: '#F55B6B', fontSize: 12, fontWeight: 600 }}>
                          <AlertCircle size={14} />
                          <span>Some assertions failed.</span>
                        </div>
                      )}
                      {(codingExercise.testCases || []).map((tc, tcIdx) => {
                        const tcResult = assertionResults.find(r => r.expr === tc);
                        let status = 'idle';
                        if (verifyState === 'verifying') status = 'verifying';
                        else if (tcResult) status = tcResult.passed ? 'passed' : 'failed';

                        return (
                          <div key={tcIdx} style={{ display: 'flex', flexDirection: 'column', gap: 4, background: '#0D111A', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: 6, padding: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              {status === 'verifying' && <Loader2 size={12} style={{ animation: 'spin 1s linear infinite', color: '#9B6EF8' }} />}
                              {status === 'passed' && <CheckCircle size={12} color="#22C5A0" />}
                              {status === 'failed' && <X size={12} color="#F55B6B" />}
                              {status === 'idle' && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#8892B0' }} />}
                              <span style={{ fontFamily: 'monospace', fontSize: 11, color: status === 'failed' ? '#F55B6B' : status === 'passed' ? '#22C5A0' : '#8892B0', wordBreak: 'break-all' }}>
                                {tc}
                              </span>
                            </div>
                            {tcResult && !tcResult.passed && tcResult.msg && (
                              <span style={{ fontSize: 10, color: '#F55B6B', marginLeft: 18, fontFamily: 'monospace' }}>
                                Error: {tcResult.msg}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      <style>{`
        /* Staggered variable card slide-in */
        .variable-card {
          animation: card-enter 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes card-enter {
          from { opacity: 0; transform: scale(0.97) translateY(4px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        
        /* Custom scrollbar override for dark theme */
        .sandbox-scroll::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }
        .sandbox-scroll::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.12) !important;
          border-radius: 4px;
        }
        .sandbox-scroll::-webkit-scrollbar-thumb:hover {
          background: #5B8CF8 !important;
        }

        /* Markdown rendering overrides for Sandbox Explanation Tab */
        .tab-pane .md-content {
          color: #E2E8F0 !important;
        }
        .tab-pane .md-content p {
          color: #DDE3F2 !important;
          line-height: 1.7 !important;
          margin-bottom: 12px !important;
        }
        .tab-pane .md-content strong {
          color: #FFFFFF !important;
          font-weight: 700 !important;
        }
        .tab-pane .md-content em {
          color: #F5A95B !important;
        }
        .tab-pane .md-content code {
          background-color: #161B26 !important;
          color: #F5A95B !important;
          border: 1px solid rgba(255, 255, 255, 0.06) !important;
          padding: 2px 6px !important;
          border-radius: 4px !important;
          font-family: monospace !important;
          font-size: 12.5px !important;
        }
        .tab-pane .md-content ul, .tab-pane .md-content ol {
          padding-left: 20px !important;
          margin-bottom: 12px !important;
          color: #DDE3F2 !important;
        }
        .tab-pane .md-content li {
          margin-bottom: 6px !important;
          color: #DDE3F2 !important;
        }
        .tab-pane .md-content h1,
        .tab-pane .md-content h2,
        .tab-pane .md-content h3,
        .tab-pane .md-content h4,
        .tab-pane .md-content h5 {
          color: #FFFFFF !important;
          margin-top: 16px !important;
          margin-bottom: 8px !important;
          font-weight: 700 !important;
        }
      `}</style>
    </div>
  );
}
