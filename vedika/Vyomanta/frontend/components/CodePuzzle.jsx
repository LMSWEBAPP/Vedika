'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { html } from '@codemirror/lang-html';
import { usePyodide } from '@/hooks/usePyodide';
import {
  Play, Pause, Square, Trash2, CheckCircle, Loader2, Sparkles,
  ChevronLeft, ChevronRight, BookOpen, AlertCircle, X, Award, Zap,
  Gamepad2, HelpCircle, ChevronDown, Check, Info, Code, Globe, HelpCircle as HelpIcon, Sun, Moon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { T } from '@/lib/lms-data';


import { StateField, StateEffect } from "@codemirror/state";
import { EditorView, Decoration, WidgetType } from "@codemirror/view";

const setErrorEffect = StateEffect.define();

class ErrorWidget extends WidgetType {
  constructor(message) {
    super();
    this.message = message;
  }
  toDOM() {
    const div = document.createElement("div");
    div.className = "cm-error-line-widget";
    div.style.color = "#F55B6B"; // Matches T.red
    div.style.background = "rgba(245, 91, 107, 0.08)";
    div.style.borderLeft = "3px solid #F55B6B";
    div.style.padding = "6px 12px";
    div.style.fontSize = "11.5px";
    div.style.fontFamily = "monospace";
    div.style.marginTop = "4px";
    div.style.marginBottom = "4px";
    div.style.borderRadius = "0 4px 4px 0";
    div.style.display = "flex";
    div.style.alignItems = "center";
    div.style.gap = "6px";
    div.style.userSelect = "none";
    
    const icon = document.createElement("span");
    icon.textContent = "⚡";
    icon.style.fontWeight = "bold";
    div.appendChild(icon);

    const text = document.createElement("span");
    text.textContent = `Hint: ${this.message}`;
    div.appendChild(text);

    return div;
  }
}

const errorDecorationField = StateField.define({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    decorations = decorations.map(tr.changes);
    for (let e of tr.effects) {
      if (e.is(setErrorEffect)) {
        const error = e.value; // { line: number, message: string }
        if (!error || !error.line) {
          return Decoration.none;
        }
        try {
          const docLines = tr.state.doc.lines;
          const targetLine = Math.max(1, Math.min(error.line, docLines));
          const linePos = tr.state.doc.line(targetLine);
          const deco = Decoration.widget({
            widget: new ErrorWidget(error.message),
            side: 1 // renders below the line
          });
          return Decoration.set([deco.range(linePos.to)]);
        } catch (err) {
          console.warn("[CodeMirror Error Widget] Failed to apply decoration:", err);
          return Decoration.none;
        }
      }
    }
    return decorations;
  },
  provide: (f) => EditorView.decorations.from(f)
});

// --- Predefined Faculty Puzzles ---
const FACULTY_PUZZLES = [
  {
    id: "find_max",
    title: "Find Largest Number in Array",
    description: "Write a function `find_max(arr)` that takes an array/list of numbers `arr` and returns the largest number in it.",
    starterCode: "def find_max(arr):\n    # Follow the step-by-step guide to complete this code\n    pass\n",
    defaultCall: "\n# Test call for visualizer\nmy_array = [12, 3, 45, 7, 23, 19]\nresult = find_max(my_array)\nprint('Array:', my_array)\nprint('Max Number:', result)\n",
    steps: [
      {
        id: "step1",
        description: "Ensure your function `find_max` is defined and correctly takes a single parameter named `arr`.",
        shortTitle: "Define Function"
      },
      {
        id: "step2",
        description: "Initialize a variable named `max_val` to hold the first element of the array `arr` (i.e., `arr[0]`).",
        shortTitle: "Initialize Max Value"
      },
      {
        id: "step3",
        description: "Create a `for` loop to iterate through each element in the `arr` array. You can iterate directly using `for num in arr:`.",
        shortTitle: "Iterate Array"
      },
      {
        id: "step4",
        description: "Inside the loop, write an `if` statement to check if the current element (from loop) is greater than `max_val`. If so, update `max_val` to be the current element.",
        shortTitle: "Compare & Update"
      },
      {
        id: "step5",
        description: "After the loop finishes, return the final computed `max_val` from the function.",
        shortTitle: "Return Result"
      }
    ]
  },
  {
    id: "reverse_array",
    title: "Reverse an Array",
    description: "Write a function `reverse_array(arr)` that takes a list of elements and returns a new list containing the same elements in reverse order.",
    starterCode: "def reverse_array(arr):\n    # Follow the step-by-step guide to complete this code\n    pass\n",
    defaultCall: "\n# Test call for visualizer\nmy_list = [1, 2, 3, 4, 5]\nresult = reverse_array(my_list)\nprint('Original:', my_list)\nprint('Reversed:', result)\n",
    steps: [
      {
        id: "step1",
        description: "Ensure your function is defined as `reverse_array(arr)` and accepts a single parameter `arr`.",
        shortTitle: "Define Function"
      },
      {
        id: "step2",
        description: "Initialize an empty list named `reversed_arr` which will hold our elements in reverse order.",
        shortTitle: "Initialize Empty List"
      },
      {
        id: "step3",
        description: "Iterate through the array elements. You can loop through `arr` elements in standard order, or backwards. Let's create a loop to iterate through elements of `arr`.",
        shortTitle: "Iterate Elements"
      },
      {
        id: "step4",
        description: "Inside the loop, insert the current element at the beginning of `reversed_arr` (using `reversed_arr.insert(0, item)`) or loop backwards and append.",
        shortTitle: "Insert/Append Elements"
      },
      {
        id: "step5",
        description: "Return the final reversed list `reversed_arr`.",
        shortTitle: "Return List"
      }
    ]
  },
  {
    id: "count_evens",
    title: "Count Even Numbers",
    description: "Write a function `count_evens(arr)` that returns the total count of even numbers in a given list of integers `arr`.",
    starterCode: "def count_evens(arr):\n    # Follow the step-by-step guide to complete this code\n    pass\n",
    defaultCall: "\n# Test call for visualizer\nmy_list = [4, 2, 7, 9, 10, 5, 8]\nresult = count_evens(my_list)\nprint('List:', my_list)\nprint('Even Count:', result)\n",
    steps: [
      {
        id: "step1",
        description: "Define a function named `count_evens` that accepts a parameter `arr`.",
        shortTitle: "Define Function"
      },
      {
        id: "step2",
        description: "Initialize a counter variable named `count` to `0`.",
        shortTitle: "Initialize Count"
      },
      {
        id: "step3",
        description: "Create a loop to iterate through every element `num` inside `arr`.",
        shortTitle: "Iterate List"
      },
      {
        id: "step4",
        description: "Inside the loop, write a condition to check if the number is even (`num % 2 == 0`). If it is, increment `count` by 1.",
        shortTitle: "Check Even Condition"
      },
      {
        id: "step5",
        description: "Return the final value of the `count` variable after the loop terminates.",
        shortTitle: "Return Count"
      }
    ]
  }
];

const STARTER_HTML = `<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: 'Outfit', sans-serif;
      background-color: #ffffff;
      color: #1e293b;
      margin: 0;
      padding: 30px;
      text-align: center;
    }
    .card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 24px;
      max-width: 450px;
      margin: 40px auto;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
    }
    h1 {
      color: #3b82f6;
      font-size: 24px;
      margin-top: 0;
    }
    p {
      color: #64748b;
      font-size: 14px;
      line-height: 1.6;
    }
    button {
      background: #3b82f6;
      color: white;
      border: none;
      padding: 10px 20px;
      font-size: 14px;
      font-weight: 600;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.2s;
    }
    button:hover {
      background: #2563eb;
    }
  </style>
</head>
<body>

  <div class="card">
    <h1>HTML Live Preview Sandbox</h1>
    <p>Modify this HTML, add CSS classes, or write inline styles on the left to see changes instantly rendered here!</p>
    <button onclick="changeMessage()">Click Me</button>
    <h3 id="display-msg" style="margin-top: 20px; color: #10b981;"></h3>
  </div>

  <script>
    function changeMessage() {
      document.getElementById('display-msg').textContent = '🎉 JavaScript running in sandbox successfully!';
    }
  </script>

</body>
</html>`;

export default function CodePuzzle() {
  // Category Selector: 'programming' | 'html'
  const [category, setCategory] = useState('programming');
  const [editorTheme, setEditorTheme] = useState('dark');
  const [selectedLanguage, setSelectedLanguage] = useState('python');
  
  // HTML Editor & Preview states
  const [htmlCode, setHtmlCode] = useState(STARTER_HTML);

  // Programming Puzzle selectors
  const [puzzleSource, setPuzzleSource] = useState('faculty'); // 'faculty' | 'ai'
  const [facultyPuzzleIndex, setFacultyPuzzleIndex] = useState(0);
  const [aiDifficulty, setAiDifficulty] = useState('beginner');

  // AI Generated Puzzle State
  const [aiGeneratedPuzzle, setAiGeneratedPuzzle] = useState(null);
  const [isGeneratingPuzzle, setIsGeneratingPuzzle] = useState(false);

  // Active puzzle resolver
  const activePuzzle = puzzleSource === 'ai' ? aiGeneratedPuzzle : FACULTY_PUZZLES[facultyPuzzleIndex];

  // Code & Progress step states
  const [code, setCode] = useState(FACULTY_PUZZLES[0].starterCode);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Validation States
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState(null); // { line: number, message: string }
  const [stepPassed, setStepPassed] = useState(false);

  // Layout Tab selection on the right (for programming mode)
  const [activeRightTab, setActiveRightTab] = useState('guide'); // 'guide' | 'visualizer'

  // Visualizer execution states
  const [traceData, setTraceData] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isTracing, setIsTracing] = useState(false);
  const [traceError, setTraceError] = useState(null);
  const [playSpeed, setPlaySpeed] = useState(1500); // 1500ms, 1000ms, 500ms


  // Terminal refs & resize layouts
  const terminalElRef = useRef(null);
  const terminalInstanceRef = useRef(null);
  const fitAddonRef = useRef(null);
  const playIntervalRef = useRef(null);
  const editorViewRef = useRef(null);
  const debounceTimerRef = useRef(null);

  const [mainSplitPercent, setMainSplitPercent] = useState(52); // Left vs Right width percentage
  const [leftSplitPercent, setLeftSplitPercent] = useState(62); // Editor vs Terminal height percentage
  const isDraggingMainRef = useRef(false);
  const isDraggingLeftRef = useRef(false);
  const containerRef = useRef(null);

  // Sync starter code when active puzzle changes
  useEffect(() => {
    if (category === 'programming') {
      if (activePuzzle) {
        setCode(activePuzzle.starterCode);
        setStepPassed(false);
        setValidationError(null);
        setCurrentStepIndex(0);
        setTraceData(null);
        setTraceError(null);
      } else {
        setCode('# Generate a custom AI puzzle from the right-hand panel to start.');
      }
    }
  }, [activePuzzle, category]);

  // Alert other languages placeholder
  const handleLanguageChange = (lang) => {
    if (lang !== 'python') {
      alert(`${lang.toUpperCase()} support is coming in the next MVP! For now, please use Python.`);
      return;
    }
    setSelectedLanguage(lang);
  };

  // Sync inline CodeMirror decorations when validation error updates
  useEffect(() => {
    if (category === 'programming' && editorViewRef.current) {
      editorViewRef.current.dispatch({
        effects: setErrorEffect.of(validationError)
      });
    }
  }, [validationError, category]);

  // Auto-play interval for execution visualizer
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

  // Highlight and scroll CodeMirror editor line on active execution visualizer step
  useEffect(() => {
    if (category === 'programming' && editorViewRef.current && traceData && traceData[currentStep]) {
      const view = editorViewRef.current;
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
        console.warn("[Visualizer CodeMirror Sync] Error highlighting line:", e);
      }
    }
  }, [currentStep, traceData, category]);

  // Stdin line buffer for interactive input
  const stdinLineRef = useRef('');
  const waitingForInputRef = useRef(false);

  // Setup terminal (for programming mode)
  const initTerminal = () => {
    if (typeof window === 'undefined') return;
    if (!terminalElRef.current) return;
    if (terminalInstanceRef.current) return; // Already setup

    const term = new Terminal({
      cursorBlink: true,
      theme: {
        background: '#090A0F',
        foreground: '#E2E8F0',
        cursor: '#5B8CF8',
      },
      fontSize: 12.5,
      fontFamily: 'monospace',
      convertEol: true
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    try {
      term.open(terminalElRef.current);
      terminalInstanceRef.current = term;
      fitAddonRef.current = fitAddon;
      fitAddon.fit();
      term.writeln("\x1b[33mPython Terminal Ready.\x1b[0m");
    } catch (e) {
      console.warn("Failed to open terminal:", e);
    }

    // --- Intercept keystrokes for interactive stdin ---
    term.onKey(({ key, domEvent }) => {
      const code = domEvent.keyCode;
      // Only process input when Python is waiting for it
      if (!waitingForInputRef.current) return;

      if (code === 13) {
        // Enter: submit the buffered line
        const line = stdinLineRef.current;
        stdinLineRef.current = '';
        waitingForInputRef.current = false;
        term.write('\r\n');
        sendStdinRef.current(line);
      } else if (code === 8 || code === 127) {
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

    const resizeObserver = new ResizeObserver(() => {
      if (terminalInstanceRef.current && fitAddonRef.current) {
        try {
          fitAddonRef.current.fit();
        } catch (e) {}
      }
    });
    resizeObserver.observe(terminalElRef.current);
  };

  useEffect(() => {
    if (category === 'programming') {
      // Delay initialization slightly to let DOM elements render
      const timer = setTimeout(() => {
        initTerminal();
      }, 150);
      return () => clearTimeout(timer);
    } else {
      if (terminalInstanceRef.current) {
        terminalInstanceRef.current.dispose();
        terminalInstanceRef.current = null;
        fitAddonRef.current = null;
      }
    }
  }, [category]);

  // sendStdin ref — keeps a stable reference for the terminal's onKey handler
  const sendStdinRef = useRef(null);

  // --- Pyodide WebWorker hooks ---
  const onStdout = (text) => {
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
      terminalInstanceRef.current.write('\r\x1b[2K\x1b[32mExecution environment initialized!\x1b[0m\n');
    }
  };

  const onFinish = () => {
    waitingForInputRef.current = false;
    stdinLineRef.current = '';
    if (terminalInstanceRef.current) {
      terminalInstanceRef.current.write('\n\x1b[90m--- Run finished ---\x1b[0m\n');
    }
  };

  const onError = (msg) => {
    waitingForInputRef.current = false;
    stdinLineRef.current = '';
    setIsTracing(false);
    if (terminalInstanceRef.current) {
      terminalInstanceRef.current.write(`\x1b[31mError: ${msg}\x1b[0m\n`);
    }
  };

  const onTraceResult = (trace) => {
    setIsTracing(false);
    if (!trace || !Array.isArray(trace) || trace.length === 0) {
      setTraceError("No execution trace captured.");
      return;
    }
    setTraceError(null);
    setTraceData(trace);
    setCurrentStep(0);
    setActiveRightTab('visualizer'); // Auto-switch to visualizer tab on success
  };

  const onStdinRequest = () => {
    waitingForInputRef.current = true;
    stdinLineRef.current = '';
    if (terminalInstanceRef.current) {
      terminalInstanceRef.current.write('\x1b[96m');
    }
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

  // Keep sendStdin accessible inside terminal's onKey closure
  useEffect(() => {
    sendStdinRef.current = sendStdin;
  }, [sendStdin]);

  // --- API validation call ---
  const validateStep = async (codeToCheck, targetIndex) => {
    if (!activePuzzle) return;
    setIsValidating(true);
    try {
      const response = await fetch('/api/code-puzzle/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: codeToCheck,
          puzzleId: activePuzzle.id || "ai_generated",
          stepIndex: targetIndex,
          stepDescription: activePuzzle.steps[targetIndex].description,
          problemStatement: activePuzzle.description,
          allSteps: activePuzzle.steps.map(s => s.description)
        })
      });

      const result = await response.json();
      if (result.error) throw new Error(result.error);

      if (result.passed) {
        setValidationError(null);
        setStepPassed(true);
      } else {
        setValidationError({
          line: result.line || 1,
          message: result.message || "Something went wrong in this step."
        });
        setStepPassed(false);
      }
    } catch (e) {
      console.error(e);
      setValidationError({ line: 1, message: "Validation check failed. Check syntax or structure." });
      setStepPassed(false);
    } finally {
      setIsValidating(false);
    }
  };

  // --- API Puzzle Generation call ---
  const handleGenerateAiPuzzle = async () => {
    setIsGeneratingPuzzle(true);
    setAiGeneratedPuzzle(null);
    setValidationError(null);
    setStepPassed(false);
    try {
      const res = await fetch('/api/code-puzzle/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          difficulty: aiDifficulty,
          language: selectedLanguage
        })
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setAiGeneratedPuzzle(data);
    } catch (e) {
      console.error(e);
      alert("Failed to generate custom AI puzzle. Please try again.");
    } finally {
      setIsGeneratingPuzzle(false);
    }
  };

  // --- Code editor changes ---
  const handleCodeChange = (newVal) => {
    if (category === 'html') {
      setHtmlCode(newVal);
      return;
    }

    setCode(newVal);
    setStepPassed(false);
    setValidationError(null);

    // Reset debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      validateStep(newVal, currentStepIndex);
    }, 2000);
  };

  // Manual trigger check
  const handleManualCheck = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    validateStep(code, currentStepIndex);
  };

  // Move to next step
  const handleNextStep = () => {
    if (activePuzzle && currentStepIndex < activePuzzle.steps.length - 1) {
      const nextIdx = currentStepIndex + 1;
      setCurrentStepIndex(nextIdx);
      setStepPassed(false);
      setValidationError(null);
      // Run validation immediately for next step context
      validateStep(code, nextIdx);
    }
  };

  // Reset steps
  const handleResetSteps = () => {
    setCurrentStepIndex(0);
    setStepPassed(false);
    setValidationError(null);
    validateStep(code, 0);
  };

  // Execute code in Terminal
  const handleRunCode = () => {
    if (!isReady || isRunning || !activePuzzle) return;
    if (terminalInstanceRef.current) {
      terminalInstanceRef.current.clear();
      terminalInstanceRef.current.writeln('\x1b[90mExecuting python code...\x1b[0m');
    }
    
    // Append the visualizer/test call to execute the script in console
    const fullCode = code + (activePuzzle.defaultCall || "");
    runCode(fullCode);
  };

  // Trace variables execution
  const handleVisualizeCode = () => {
    if (!isReady || isRunning || !activePuzzle) return;
    setIsTracing(true);
    setTraceData(null);
    setTraceError(null);
    
    if (terminalInstanceRef.current) {
      terminalInstanceRef.current.clear();
      terminalInstanceRef.current.writeln('\x1b[90mPreparing execution tracer...\x1b[0m');
    }

    // Append the call to trace the inner loop execution
    const traceCode = code + (activePuzzle.defaultCall || "");
    runTrace(traceCode);
  };

  // Clear Terminal console
  const handleClearTerminal = () => {
    if (terminalInstanceRef.current) {
      terminalInstanceRef.current.clear();
    }
  };

  // --- Split dragging operations ---
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
      if (percent < 20) percent = 20;
      if (percent > 80) percent = 80;
      setLeftSplitPercent(percent);
    }
  };

  const handleLeftMouseUp = () => {
    isDraggingLeftRef.current = false;
    document.removeEventListener('mousemove', handleLeftMouseMove);
    document.removeEventListener('mouseup', handleLeftMouseUp);
  };

  // Clean timers
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  // --- Variable Array visualizer renderer ---
  const renderArrayVisualizer = (listKey, listVal, variables, prevVariables) => {
    const pointers = {};
    Object.entries(variables).forEach(([k, v]) => {
      if (typeof v === 'number' && v >= 0 && v < listVal.length && !k.startsWith('__') && k !== 'step_counter') {
        if (!pointers[v]) pointers[v] = [];
        pointers[v].push(k);
      }
    });

    const prevListVal = prevVariables?.[listKey];
    let actionType = "STEP";
    let swapMessage = "";
    
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

    const activeIndices = Object.keys(pointers).map(Number).sort((a, b) => a - b);
    let linkerLine = null;
    if (activeIndices.length >= 2) {
      const idx1 = activeIndices[0];
      const idx2 = activeIndices[activeIndices.length - 1];
      const cellWidth = 40;
      const gap = 10;
      const stepWidth = cellWidth + gap; 
      const leftPos = idx1 * stepWidth + (cellWidth / 2);
      const lineLength = (idx2 - idx1) * stepWidth;
      const color = actionType === 'SWAP' ? '#F5A95B' : '#22C5A0';

      linkerLine = (
        <div style={{
          position: 'absolute',
          top: '16px',
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
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: color, transform: 'translateX(-2px)' }} />
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: color, transform: 'translateX(2px)' }} />
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 12, background: '#090A0F', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)', marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 10, color: '#8892B0', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Array visualizer ({listKey})
            </span>
            <span style={{ fontSize: 9, color: actionStyle.text, background: actionStyle.bg, padding: '1px 5px', borderRadius: 4, fontWeight: 800 }}>
              {actionType}
            </span>
          </div>
          {swapMessage && (
            <span style={{ fontSize: 11, color: actionStyle.text, fontWeight: 700, fontFamily: 'monospace' }}>
              ⚡ {swapMessage}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', overflowX: 'auto', padding: '12px 4px 28px 4px', width: '100%' }} className="no-scrollbar">
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
                      width: 40,
                      height: 32,
                      borderRadius: 6,
                      background: pillBg,
                      border: pillBorder,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 700,
                      color: textColor,
                      boxShadow: isPointed ? (actionType === 'SWAP' ? '0 0 10px rgba(245, 169, 91, 0.15)' : '0 0 10px rgba(34, 197, 160, 0.15)') : 'none',
                      userSelect: 'none'
                    }}
                  >
                    {String(item)}
                  </motion.div>
                  <div style={{ fontSize: 9, color: '#4A5568', marginTop: 3, fontFamily: 'monospace' }}>
                    [{idx}]
                  </div>

                  {isPointed && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'absolute', top: 44, zIndex: 10 }}>
                      <div style={{ width: 0, height: 0, borderLeft: '3px solid transparent', borderRight: '3px solid transparent', borderBottom: '4px solid currentColor', color: textColor, marginBottom: 1 }} />
                      <div style={{
                        background: textColor,
                        color: '#040508',
                        fontSize: 8.5,
                        fontWeight: 800,
                        padding: '1px 3px',
                        borderRadius: 2,
                        whiteSpace: 'nowrap',
                        fontFamily: 'monospace'
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

  // ── 2D Visualizer ──────────────────────────────────────────────────────────
  const render2DVisualizer = () => {
    const stepData = traceData[currentStep];
    if (!stepData) return null;
    const { line, variables = {}, error } = stepData;
    const keys = Object.keys(variables);
    const prevStep = currentStep > 0 ? traceData[currentStep - 1] : null;
    const prevVars = prevStep?.variables || {};

    if (error) {
      return (
        <div style={{ padding: '10px 12px', background: 'rgba(245,91,107,0.07)', border: '1px solid rgba(245,91,107,0.25)', borderRadius: 8, fontSize: 12, color: '#F55B6B', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <strong>⚠️ Runtime Error</strong>
          <span style={{ fontFamily: 'monospace' }}>{error}</span>
        </div>
      );
    }

    // Code line analysis
    const lines = code.split('\n');
    const activeLineText = lines[line - 1]?.trim() || '';
    let lineActionType = 'EXEC';
    let lineColor = '#6366F1';
    if (activeLineText.startsWith('for ') || activeLineText.startsWith('while ')) { lineActionType = 'LOOP'; lineColor = '#38BDF8'; }
    else if (activeLineText.startsWith('if ') || activeLineText.startsWith('elif ') || activeLineText.startsWith('else:')) { lineActionType = 'BRANCH'; lineColor = '#A78BFA'; }
    else if (activeLineText.includes('print(')) { lineActionType = 'PRINT'; lineColor = '#34D399'; }
    else if (activeLineText.includes('=')) { lineActionType = 'ASSIGN'; lineColor = '#FBBF24'; }
    else if (activeLineText.startsWith('def ')) { lineActionType = 'DEF'; lineColor = '#F472B6'; }
    else if (activeLineText.startsWith('return ')) { lineActionType = 'RETURN'; lineColor = '#FB923C'; }

    // Categorize variables
    const listKey = keys.find(k => Array.isArray(variables[k]) && !k.startsWith('__'));
    const scalarKeys = keys.filter(k => {
      const v = variables[k];
      return !k.startsWith('__') && !Array.isArray(v) && (typeof v !== 'object' || v === null);
    });

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

        {/* ── Active Line HUD ── */}
        <div style={{
          display: 'flex', alignItems: 'stretch', gap: 0,
          background: '#0b0d18', borderRadius: 7, overflow: 'hidden',
          border: `1px solid ${lineColor}40`
        }}>
          {/* Line number gutter */}
          <div style={{
            padding: '7px 10px', background: `${lineColor}18`,
            borderRight: `2px solid ${lineColor}`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            minWidth: 44, flexShrink: 0
          }}>
            <span style={{ fontSize: 8, color: lineColor, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', opacity: 0.8 }}>{lineActionType}</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: lineColor, lineHeight: 1, fontFamily: 'monospace' }}>{line}</span>
          </div>
          {/* Code text */}
          <div style={{
            flex: 1, padding: '7px 10px',
            fontFamily: 'monospace', fontSize: 12.5, color: '#E2E8F0',
            whiteSpace: 'pre', overflow: 'hidden', textOverflow: 'ellipsis',
            display: 'flex', alignItems: 'center'
          }}>
            {activeLineText || '# (empty line)'}
          </div>
        </div>

        {/* ── Array Visualizer ── */}
        {listKey && renderArrayVisualizer(listKey, variables[listKey], variables, prevVars)}

        {/* ── Scalar Variables ── */}
        {scalarKeys.length > 0 && (
          <div style={{
            background: '#0b0d18', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 7, overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{
              padding: '5px 10px', background: 'rgba(255,255,255,0.03)',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              display: 'flex', alignItems: 'center', gap: 6
            }}>
              <span style={{ fontSize: 9, color: '#647298', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Variables</span>
              <span style={{ fontSize: 9, color: '#3A4560', fontWeight: 600 }}>({scalarKeys.length})</span>
            </div>
            {/* Variable rows */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {scalarKeys.map((key, i) => {
                const val = variables[key];
                const prevVal = prevVars[key];
                const isNew = !(key in prevVars);
                const isChanged = !isNew && prevVal !== undefined && prevVal !== val;
                const displayVal = val === null ? 'None' : typeof val === 'boolean' ? (val ? 'True' : 'False') : String(val);
                const typeLabel = Array.isArray(val) ? 'list' : val === null ? 'None' : typeof val === 'boolean' ? 'bool' : typeof val === 'number' ? (Number.isInteger(val) ? 'int' : 'float') : typeof val;

                return (
                  <div
                    key={key}
                    style={{
                      display: 'flex', alignItems: 'center',
                      padding: '5px 10px',
                      borderBottom: i < scalarKeys.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                      background: isNew ? 'rgba(52,211,153,0.05)' : isChanged ? 'rgba(91,140,248,0.07)' : 'transparent',
                      transition: 'background 0.25s'
                    }}
                  >
                    {/* Changed indicator */}
                    <div style={{
                      width: 3, height: 16, borderRadius: 2, marginRight: 8, flexShrink: 0,
                      background: isNew ? '#34D399' : isChanged ? '#5B8CF8' : 'transparent'
                    }} />
                    {/* Variable name */}
                    <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#8892B0', fontWeight: 600, minWidth: 70, flexShrink: 0 }}>
                      {key}
                    </span>
                    {/* Type badge */}
                    <span style={{
                      fontSize: 9, color: '#4A5568', background: 'rgba(255,255,255,0.04)',
                      padding: '1px 4px', borderRadius: 3, fontFamily: 'monospace', marginRight: 8, flexShrink: 0
                    }}>
                      {typeLabel}
                    </span>
                    {/* Value */}
                    <span style={{
                      fontFamily: 'monospace', fontSize: 12.5, fontWeight: 700,
                      color: isNew ? '#34D399' : isChanged ? '#5B8CF8' : '#F8FAFC',
                      marginLeft: 'auto', textAlign: 'right',
                      maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                    }}>
                      {displayVal}
                    </span>
                    {/* Old value (if changed) */}
                    {isChanged && (
                      <span style={{
                        fontFamily: 'monospace', fontSize: 10, color: '#4A5568',
                        marginLeft: 6, textDecoration: 'line-through', flexShrink: 0
                      }}>
                        {prevVal === null ? 'None' : String(prevVal)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render Visualizer Variables (2D only)
  const renderVisualizerVariables = () => {
    if (traceError) {
      return (
        <div style={{ padding: 12, background: 'rgba(245, 91, 107, 0.08)', border: '1px solid rgba(245, 91, 107, 0.2)', borderRadius: 8, color: '#F55B6B', fontSize: 12 }}>
          <strong>⚠️ Visualizer Error</strong>
          <div style={{ fontFamily: 'monospace', marginTop: 4 }}>{traceError}</div>
        </div>
      );
    }

    if (!traceData || !traceData[currentStep]) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '40px 10px', textAlign: 'center', color: '#647298', gap: 10 }}>
          <Code size={32} color="#5B8CF8" />
          <span style={{ fontSize: 13, fontWeight: 500 }}>No active trace data.</span>
          <span style={{ fontSize: 11.5, maxWidth: 260 }}>
            Click the <strong>Visualize Code</strong> button below the editor to run and record a trace of your code.
          </span>
        </div>
      );
    }

    return render2DVisualizer();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#07080F', color: '#DDE3F2', fontFamily: 'var(--font-outfit), sans-serif', overflow: 'hidden' }}>
      
      {/* --- Top Header bar --- */}
      <div style={{ height: 56, padding: '0 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0C0F1C', zIndex: 10, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Gamepad2 size={20} color="#5B8CF8" />
          <h1 style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>Workspace Sandbox</h1>
          
          {/* Main Category Dropdown: Programming Languages vs HTML */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 16 }}>
            <Globe size={14} color="#647298" />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{
                background: '#131824',
                color: '#5B8CF8',
                border: '1px solid rgba(91, 140, 248, 0.2)',
                borderRadius: 6,
                padding: '4px 8px',
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer',
                outline: 'none',
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}
            >
              <option value="programming">💻 Programming Languages</option>
              <option value="html">🌐 HTML Workspace</option>
            </select>
          </div>

          {/* Nested programming languages selector (Only visible if category === 'programming') */}
          {category === 'programming' && (
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 3, marginLeft: 12 }}>
              {['python', 'javascript', 'java'].map((lang) => (
                <button
                  key={lang}
                  onClick={() => handleLanguageChange(lang)}
                  style={{
                    padding: '3px 8px',
                    borderRadius: 6,
                    border: 'none',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: selectedLanguage === lang ? '#1E293B' : 'transparent',
                    color: selectedLanguage === lang ? '#5B8CF8' : '#647298',
                    textTransform: 'capitalize',
                    transition: 'all 0.15s'
                  }}
                >
                  {lang}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Dropdown selectors for Faculty Puzzles (Only visible if category === 'programming' and source === 'faculty') */}
        {category === 'programming' && puzzleSource === 'faculty' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11.5, color: '#647298', fontWeight: 600 }}>Predefined Puzzles:</span>
            <select
              value={facultyPuzzleIndex}
              onChange={(e) => setFacultyPuzzleIndex(parseInt(e.target.value))}
              style={{
                background: '#131824',
                color: '#DDE3F2',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 6,
                padding: '5px 12px',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              {FACULTY_PUZZLES.map((p, idx) => (
                <option key={p.id} value={idx}>
                  {idx + 1}. {p.title}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* --- Main split content area --- */}
      <div ref={containerRef} style={{ display: 'flex', flex: 1, height: 'calc(100% - 56px)', overflow: 'hidden' }}>
        
        {/* --- LEFT COLUMN: Editor + Terminal (Or Editor only for HTML) --- */}
        <div style={{
          width: category === 'html' ? '50%' : `${mainSplitPercent}%`,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#06080C',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          overflow: 'hidden'
        }}>
          {category === 'html' ? (
            /* --- HTML Mode: Full height editor --- */
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ padding: '8px 16px', background: '#080A0E', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 10, color: '#647298', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>HTML Code Editor</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button
                    onClick={() => setEditorTheme(editorTheme === 'dark' ? 'light' : 'dark')}
                    style={{
                      background: 'transparent', border: 'none', color: '#647298', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4, borderRadius: 4
                    }}
                    title={`Switch to ${editorTheme === 'dark' ? 'light' : 'dark'} theme`}
                  >
                    {editorTheme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                  </button>
                  <span style={{ fontSize: 10.5, color: '#3b82f6', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Globe size={11} /> Live Preview Active
                  </span>
                </div>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', background: editorTheme === 'dark' ? '#07080F' : '#FFFFFF' }}>
                <CodeMirror
                  value={htmlCode}
                  theme={editorTheme}
                  extensions={[html()]}
                  onChange={(value) => handleCodeChange(value)}
                  style={{ fontSize: 13, fontFamily: 'monospace' }}
                />
              </div>
            </div>
          ) : (
            /* --- Programming Mode: Editor + Splitter + xterm Terminal --- */
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Top Half: CodeMirror Code Editor */}
              <div style={{ height: `${leftSplitPercent}%`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ padding: '8px 16px', background: '#080A0E', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 10, color: '#647298', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Source Code Editor</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button
                      onClick={() => setEditorTheme(editorTheme === 'dark' ? 'light' : 'dark')}
                      style={{
                        background: 'transparent', border: 'none', color: '#647298', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4, borderRadius: 4
                      }}
                      title={`Switch to ${editorTheme === 'dark' ? 'light' : 'dark'} theme`}
                    >
                      {editorTheme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                    </button>
                    {!isReady && (
                      <span style={{ fontSize: 10.5, color: '#F5A95B', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} />
                        Loading environment...
                      </span>
                    )}
                    {isReady && (
                      <span style={{ fontSize: 10.5, color: '#22C5A0', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <CheckCircle size={11} /> Environment Ready
                      </span>
                    )}
                  </div>
                </div>

                {/* CodeMirror */}
                <div style={{ flex: 1, overflowY: 'auto', background: editorTheme === 'dark' ? '#07080F' : '#FFFFFF' }}>
                  <CodeMirror
                    value={code}
                    theme={editorTheme}
                    extensions={[python(), errorDecorationField]}
                    onChange={(value) => handleCodeChange(value)}
                    onCreateEditor={(view) => {
                      editorViewRef.current = view;
                    }}
                    style={{ fontSize: 13, fontFamily: 'monospace' }}
                  />
                </div>

                {/* Toolbar Panel */}
                <div style={{ padding: '8px 16px', background: '#080A0E', borderTop: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={handleRunCode}
                      disabled={!isReady || isRunning || isTracing || !activePuzzle}
                      style={{
                        background: (!isReady || isRunning || isTracing || !activePuzzle) ? 'rgba(255,255,255,0.04)' : '#22C5A0',
                        color: '#000',
                        border: 'none',
                        padding: '5px 12px',
                        borderRadius: 5,
                        fontSize: 11.5,
                        fontWeight: 700,
                        cursor: (!isReady || isRunning || isTracing || !activePuzzle) ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        opacity: (!isReady || isRunning || isTracing || !activePuzzle) ? 0.5 : 1
                      }}
                    >
                      <Play size={11} fill="#000" />
                      Run Code
                    </button>
                    <button
                      onClick={handleVisualizeCode}
                      disabled={!isReady || isRunning || isTracing || !activePuzzle}
                      style={{
                        background: (!isReady || isRunning || isTracing || !activePuzzle) ? 'rgba(255,255,255,0.04)' : '#5B8CF8',
                        color: '#fff',
                        border: 'none',
                        padding: '5px 12px',
                        borderRadius: 5,
                        fontSize: 11.5,
                        fontWeight: 700,
                        cursor: (!isReady || isRunning || isTracing || !activePuzzle) ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        opacity: (!isReady || isRunning || isTracing || !activePuzzle) ? 0.5 : 1
                      }}
                    >
                      <Zap size={11} fill="currentColor" />
                      Visualize Code
                    </button>
                  </div>

                  {/* Step verification button triggers */}
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={handleManualCheck}
                      disabled={isValidating || !activePuzzle}
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#DDE3F2',
                        padding: '4px 10px',
                        borderRadius: 5,
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: (!activePuzzle) ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        opacity: (!activePuzzle) ? 0.5 : 1
                      }}
                    >
                      {isValidating && <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} />}
                      Check Step
                    </button>
                  </div>
                </div>
              </div>

              {/* Left Column Resizer handle */}
              <div
                onMouseDown={handleLeftMouseDown}
                style={{
                  height: 5,
                  cursor: 'row-resize',
                  background: isDraggingLeftRef.current ? 'rgba(91, 140, 248, 0.4)' : 'rgba(255, 255, 255, 0.08)',
                  zIndex: 10,
                  width: '100%',
                  flexShrink: 0,
                  transition: 'background 0.2s'
                }}
              />

              {/* Bottom Half: Console Terminal */}
              <div style={{ height: `${100 - leftSplitPercent}%`, display: 'flex', flexDirection: 'column', background: '#040508', overflow: 'hidden' }}>
                <div style={{ padding: '6px 16px', background: '#080A0E', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 9.5, color: '#647298', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Console Terminal</span>
                  <button
                    onClick={handleClearTerminal}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#647298',
                      cursor: 'pointer',
                      fontSize: 10,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 3
                    }}
                  >
                    <Trash2 size={10} /> Clear
                  </button>
                </div>
                <div ref={terminalElRef} style={{ flex: 1, padding: 8, overflow: 'hidden' }} />
              </div>
            </div>
          )}
        </div>

        {/* Column Divider Resizer handle (Only shown for Programming Category) */}
        {category === 'programming' && (
          <div
            onMouseDown={handleMainMouseDown}
            style={{
              width: 5,
              cursor: 'col-resize',
              background: isDraggingMainRef.current ? 'rgba(91, 140, 248, 0.4)' : 'rgba(255, 255, 255, 0.08)',
              zIndex: 10,
              flexShrink: 0,
              transition: 'background 0.2s'
            }}
          />
        )}

        {/* --- RIGHT COLUMN: Guide/Visualizer or HTML Iframe --- */}
        <div style={{
          width: category === 'html' ? '50%' : `${100 - mainSplitPercent}%`,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#ffffff', // default white background for HTML Iframe or dark background for programming
          overflow: 'hidden'
        }}>
          {category === 'html' ? (
            /* --- HTML Mode: Browser Live Preview Iframe (White background) --- */
            <iframe
              srcDoc={htmlCode}
              title="HTML Sandbox Live Preview"
              sandbox="allow-scripts"
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                background: '#ffffff'
              }}
            />
          ) : (
            /* --- Programming Mode: Guide Wizard & Variables Visualizer --- */
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#040508', overflow: 'hidden' }}>
              
              {/* Tab Selectors */}
              <div style={{ height: 44, display: 'flex', background: '#080A0E', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
                <button
                  onClick={() => setActiveRightTab('guide')}
                  style={{
                    flex: 1,
                    border: 'none',
                    borderBottom: `2px solid ${activeRightTab === 'guide' ? '#5B8CF8' : 'transparent'}`,
                    background: activeRightTab === 'guide' ? 'rgba(91, 140, 248, 0.03)' : 'transparent',
                    color: activeRightTab === 'guide' ? '#5B8CF8' : '#647298',
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    transition: 'all 0.15s'
                  }}
                >
                  <BookOpen size={13} />
                  Guide Wizard
                </button>
                <button
                  onClick={() => setActiveRightTab('visualizer')}
                  style={{
                    flex: 1,
                    border: 'none',
                    borderBottom: `2px solid ${activeRightTab === 'visualizer' ? '#F5A95B' : 'transparent'}`,
                    background: activeRightTab === 'visualizer' ? 'rgba(245, 169, 91, 0.03)' : 'transparent',
                    color: activeRightTab === 'visualizer' ? '#F5A95B' : '#647298',
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    transition: 'all 0.15s'
                  }}
                >
                  <Zap size={13} fill={activeRightTab === 'visualizer' ? 'currentColor' : 'none'} />
                  Variables Visualizer
                </button>
              </div>

              {/* Scrolling Content Canvas */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 16 }} className="sandbox-scroll bg-dark-theme-panel">
                
                {/* TAB 1: Guide Wizard */}
                {activeRightTab === 'guide' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    
                    {/* Source Dropdown Card (Faculty vs AI Tutor) */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '8px 14px', background: '#0C0F1C', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10 }}>
                      <span style={{ fontSize: 11.5, color: '#8892B0', fontWeight: 700 }}>Exercise Provider:</span>
                      <select
                        value={puzzleSource}
                        onChange={(e) => {
                          setPuzzleSource(e.target.value);
                          setValidationError(null);
                          setStepPassed(false);
                          setAiGeneratedPuzzle(null);
                        }}
                        style={{
                          background: '#131824',
                          color: '#5B8CF8',
                          border: '1px solid rgba(91, 140, 248, 0.2)',
                          borderRadius: 6,
                          padding: '4px 10px',
                          fontSize: 11.5,
                          fontWeight: 700,
                          cursor: 'pointer',
                          outline: 'none'
                        }}
                      >
                        <option value="faculty">🏫 Given by Faculty</option>
                        <option value="ai">🤖 Given by AI TUTOR</option>
                      </select>
                    </div>

                    {/* AI Generator Panel (Only shown if puzzleSource === 'ai') */}
                    {puzzleSource === 'ai' && (
                      <div style={{ padding: 14, background: 'rgba(91, 140, 248, 0.03)', border: '1px solid rgba(91, 140, 248, 0.15)', borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Sparkles size={16} color="#5B8CF8" />
                          <span style={{ fontSize: 11, color: '#8892B0', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>AI Tutor Config</span>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', gap: 12 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
                            <span style={{ fontSize: 10.5, color: '#647298', fontWeight: 600 }}>Difficulty Level</span>
                            <select
                              value={aiDifficulty}
                              onChange={(e) => setAiDifficulty(e.target.value)}
                              style={{
                                background: '#131824',
                                color: '#DDE3F2',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: 6,
                                padding: '5px 10px',
                                fontSize: 11.5,
                                fontWeight: 700,
                                cursor: 'pointer',
                                outline: 'none'
                              }}
                            >
                              <option value="beginner">🟢 Beginner</option>
                              <option value="intermediate">🟡 Intermediate</option>
                              <option value="advanced">🔴 Advanced</option>
                            </select>
                          </div>
                          
                          <button
                            onClick={handleGenerateAiPuzzle}
                            disabled={isGeneratingPuzzle}
                            style={{
                              background: '#5B8CF8',
                              color: '#000',
                              border: 'none',
                              padding: '8px 16px',
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: isGeneratingPuzzle ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              marginTop: 15,
                              opacity: isGeneratingPuzzle ? 0.6 : 1
                            }}
                          >
                            {isGeneratingPuzzle ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={12} fill="currentColor" />}
                            Generate AI Puzzle
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Loader Card during AI Generation */}
                    {isGeneratingPuzzle && (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 10px', background: '#0C0F1C', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, color: '#647298', gap: 10 }}>
                        <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} color="#5B8CF8" />
                        <span style={{ fontSize: 13, color: '#DDE3F2', fontWeight: 600 }}>AI is composing your coding challenge...</span>
                        <span style={{ fontSize: 11, maxWidth: 280, textAlign: 'center' }}>Creating dynamic step instructions, initial starter templates, and testing validations.</span>
                      </div>
                    )}

                    {/* Active Puzzle Statement Card */}
                    {!isGeneratingPuzzle && activePuzzle && (
                      <div style={{ padding: 14, background: '#0C0F1C', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                          <Award size={16} color="#5B8CF8" />
                          <span style={{ fontSize: 11, color: '#647298', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Problem Objective</span>
                        </div>
                        <h3 style={{ fontSize: 14.5, fontWeight: 700, margin: '0 0 6px 0', color: '#F8FAFC' }}>{activePuzzle.title}</h3>
                        <p style={{ fontSize: 12.5, color: '#8892B0', margin: 0, lineHeight: 1.5 }}>{activePuzzle.description}</p>
                      </div>
                    )}

                    {/* Placeholder when no AI puzzle is loaded */}
                    {!isGeneratingPuzzle && puzzleSource === 'ai' && !aiGeneratedPuzzle && (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 10px', background: '#0C0F1C', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 10, color: '#647298', gap: 8, textAlign: 'center' }}>
                        <HelpIcon size={24} color="#647298" />
                        <span style={{ fontSize: 12.5, color: '#DDE3F2', fontWeight: 600 }}>No AI Puzzle Generated Yet</span>
                        <span style={{ fontSize: 11, maxWidth: 240 }}>Select a difficulty level above and click **Generate AI Puzzle** to begin learning.</span>
                      </div>
                    )}

                    {/* Steps Wizard Progress Stack (Only rendered if activePuzzle exists) */}
                    {!isGeneratingPuzzle && activePuzzle && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 10, color: '#647298', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Step-by-step guidance</span>
                          <button
                            onClick={handleResetSteps}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#F55B6B',
                              fontSize: 10,
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            Reset Steps
                          </button>
                        </div>

                        {activePuzzle.steps.map((step, idx) => {
                          const isCompleted = idx < currentStepIndex;
                          const isActive = idx === currentStepIndex;
                          const isLocked = idx > currentStepIndex;

                          let stepBorderColor = 'rgba(255,255,255,0.05)';
                          let stepBg = 'rgba(255,255,255,0.01)';
                          let numBg = 'rgba(255,255,255,0.06)';
                          let numColor = '#647298';

                          if (isCompleted) {
                            stepBorderColor = 'rgba(34, 197, 160, 0.2)';
                            stepBg = 'rgba(34, 197, 160, 0.03)';
                            numBg = '#22C5A0';
                            numColor = '#000';
                          } else if (isActive) {
                            if (validationError) {
                              stepBorderColor = 'rgba(245, 91, 107, 0.3)';
                              stepBg = 'rgba(245, 91, 107, 0.04)';
                              numBg = '#F55B6B';
                              numColor = '#fff';
                            } else if (stepPassed) {
                              stepBorderColor = 'rgba(34, 197, 160, 0.4)';
                              stepBg = 'rgba(34, 197, 160, 0.05)';
                              numBg = '#22C5A0';
                              numColor = '#000';
                            } else {
                              stepBorderColor = 'rgba(91, 140, 248, 0.3)';
                              stepBg = 'rgba(91, 140, 248, 0.04)';
                              numBg = '#5B8CF8';
                              numColor = '#000';
                            }
                          }

                          return (
                            <div
                              key={step.id}
                              style={{
                                padding: 12,
                                background: stepBg,
                                border: `1px solid ${stepBorderColor}`,
                                borderRadius: 8,
                                opacity: isLocked ? 0.4 : 1,
                                display: 'flex',
                                gap: 12,
                                transition: 'all 0.2s',
                                position: 'relative'
                              }}
                            >
                              {/* Step Index Circle */}
                              <div style={{
                                width: 22,
                                height: 22,
                                borderRadius: '50%',
                                background: numBg,
                                color: numColor,
                                display: 'flex',
                                alignItems: 'center',
                                justifyCenter: 'center',
                                fontSize: 11,
                                fontWeight: 800,
                                flexShrink: 0,
                                transition: 'all 0.2s',
                                display: 'flex',
                                justifyContent: 'center'
                              }}>
                                {isCompleted ? <Check size={11} strokeWidth={3} style={{ alignSelf: 'center' }} /> : idx + 1}
                              </div>

                              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{
                                    fontSize: 12.5,
                                    fontWeight: 700,
                                    color: isCompleted ? '#22C5A0' : isActive ? (validationError ? '#F55B6B' : '#F8FAFC') : '#647298'
                                  }}>
                                    {step.shortTitle}
                                  </span>
                                  {isActive && (
                                    <span style={{
                                      fontSize: 9.5,
                                      fontWeight: 800,
                                      textTransform: 'uppercase',
                                      color: validationError ? '#F55B6B' : stepPassed ? '#22C5A0' : '#5B8CF8'
                                    }}>
                                      {validationError ? 'Invalid' : stepPassed ? 'Passed' : 'Active'}
                                    </span>
                                  )}
                                </div>
                                
                                <p style={{
                                  fontSize: 12,
                                  color: isLocked ? '#3A4560' : isCompleted ? '#8892B0' : '#DDE3F2',
                                  margin: 0,
                                  lineHeight: 1.4
                                }}>
                                  {step.description}
                                </p>

                                {/* Render step error message explicitly */}
                                {isActive && validationError && (
                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: 6,
                                    padding: '6px 10px',
                                    background: 'rgba(245, 91, 107, 0.05)',
                                    border: '1px solid rgba(245, 91, 107, 0.15)',
                                    borderRadius: 6,
                                    marginTop: 4
                                  }}>
                                    <AlertCircle size={12} color="#F55B6B" style={{ marginTop: 2, flexShrink: 0 }} />
                                    <span style={{ fontSize: 11, color: '#F55B6B', lineHeight: 1.3 }}>
                                      Line {validationError.line}: {validationError.message}
                                    </span>
                                  </div>
                                )}

                                {/* Render success buttons to advance */}
                                {isActive && stepPassed && (
                                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                                    <button
                                      onClick={handleNextStep}
                                      style={{
                                        background: '#22C5A0',
                                        color: '#000',
                                        border: 'none',
                                        padding: '4px 10px',
                                        borderRadius: 4,
                                        fontSize: 11,
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 3
                                      }}
                                    >
                                      Next Step
                                      <ChevronRight size={11} />
                                    </button>
                                  </div>
                                )}

                                {/* Render final congratulations card */}
                                {isActive && idx === activePuzzle.steps.length - 1 && stepPassed && (
                                  <div style={{
                                    padding: 8,
                                    background: 'rgba(34, 197, 160, 0.08)',
                                    border: '1px solid #22C5A0',
                                    borderRadius: 6,
                                    marginTop: 4,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 4
                                  }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#22C5A0', fontSize: 11.5, fontWeight: 800 }}>
                                      <Sparkles size={12} fill="currentColor" />
                                      CONGRATULATIONS!
                                    </div>
                                    <span style={{ fontSize: 11, color: '#8892B0', lineHeight: 1.3 }}>
                                      You have successfully completed all the steps for this puzzle! Click **Visualize Code** to see it run step-by-step.
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: Variables Visualizer */}
                {activeRightTab === 'visualizer' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
                    
                    {/* Visualizer scrubbing panel */}
                    {traceData && (
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                        padding: 12,
                        background: '#0C0F1C',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: 10
                      }}>
                        {/* Scrubbing play bar */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', gap: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <button
                              onClick={() => setIsPlaying(!isPlaying)}
                              style={{
                                background: '#F5A95B',
                                color: '#000',
                                border: 'none',
                                padding: '4px 8px',
                                borderRadius: 4,
                                fontSize: 10.5,
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 3
                              }}
                            >
                              {isPlaying ? <Pause size={9} fill="#000" /> : <Play size={9} fill="#000" />}
                              {isPlaying ? 'Pause' : 'Play'}
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
                                background: 'rgba(255,255,255,0.04)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                color: '#8892B0',
                                padding: '4px 6px',
                                borderRadius: 4,
                                fontSize: 9.5,
                                fontWeight: 700,
                                cursor: 'pointer',
                                fontFamily: 'monospace'
                              }}
                            >
                              {playSpeed === 1500 ? '1.0x' : playSpeed === 1000 ? '1.5x' : '2.0x'}
                            </button>
                            

                            
                            <div style={{ display: 'flex', gap: 3 }}>
                              <button
                                disabled={currentStep === 0}
                                onClick={() => { setIsPlaying(false); setCurrentStep(prev => prev - 1); }}
                                style={{
                                  background: 'rgba(255,255,255,0.04)',
                                  border: 'none',
                                  color: currentStep === 0 ? '#4A5568' : '#F8FAFC',
                                  padding: 4,
                                  borderRadius: 4,
                                  cursor: currentStep === 0 ? 'not-allowed' : 'pointer'
                                }}
                              >
                                <ChevronLeft size={11} />
                              </button>
                              <button
                                disabled={currentStep === traceData.length - 1}
                                onClick={() => { setIsPlaying(false); setCurrentStep(prev => prev + 1); }}
                                style={{
                                  background: 'rgba(255,255,255,0.04)',
                                  border: 'none',
                                  color: currentStep === traceData.length - 1 ? '#4A5568' : '#F8FAFC',
                                  padding: 4,
                                  borderRadius: 4,
                                  cursor: currentStep === traceData.length - 1 ? 'not-allowed' : 'pointer'
                                }}
                              >
                                <ChevronRight size={11} />
                              </button>
                            </div>
                          </div>

                          <span style={{ fontSize: 10.5, color: '#8892B0', fontWeight: 600, fontFamily: 'monospace', marginLeft: 'auto' }}>
                            Step {currentStep + 1} of {traceData.length}
                          </span>
                        </div>

                        {/* Scrubbing slider range */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 9.5, color: '#647298', fontFamily: 'monospace' }}>01</span>
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
                              height: 3,
                              background: 'rgba(255,255,255,0.1)',
                              borderRadius: 2,
                              outline: 'none',
                              cursor: 'pointer',
                              accentColor: '#F5A95B'
                            }}
                          />
                          <span style={{ fontSize: 9.5, color: '#647298', fontFamily: 'monospace' }}>
                            {String(traceData.length).padStart(2, '0')}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Memory and Array visualization output */}
                    {renderVisualizerVariables()}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
