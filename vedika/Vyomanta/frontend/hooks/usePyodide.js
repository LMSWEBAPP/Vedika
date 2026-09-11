import { useEffect, useRef, useState, useCallback } from 'react';

// Singleton worker instance & state shared across the browser session
let globalWorker = null;
let globalIsReady = false;
let globalStdinBuffer = null;
let globalLastRunInputs = [];
const subscribers = new Set();

function ensureWorker() {
  if (typeof window === 'undefined') return null;
  if (globalWorker) return globalWorker;

  try {
    // Create SharedArrayBuffer for stdin if cross-origin isolation is enabled
    if (!globalStdinBuffer) {
      try {
        globalStdinBuffer = new SharedArrayBuffer(4 + 1024);
      } catch (e) {
        globalStdinBuffer = null;
      }
    }

    const worker = new Worker('/workers/pyodide.worker.js');
    globalWorker = worker;

    worker.onmessage = (event) => {
      const { type, content, message, inputs } = event.data;

      if (type === 'READY') {
        globalIsReady = true;
        if (globalStdinBuffer) {
          worker.postMessage({ type: 'INIT_STDIN_BUFFER', buffer: globalStdinBuffer });
        }
      } else if (type === 'FINISH') {
        globalLastRunInputs = inputs || [];
      }

      // Dispatch event to active component subscriber
      subscribers.forEach((subscriber) => {
        try {
          subscriber(event.data);
        } catch (err) {
          console.error('[usePyodide] Subscriber dispatch error:', err);
        }
      });
    };

    worker.onerror = (err) => {
      console.error('[usePyodide] Worker runtime error:', err);
      subscribers.forEach((subscriber) => {
        try {
          subscriber({ type: 'ERROR', message: err.message || 'Pyodide execution error' });
        } catch {}
      });
    };

    // Trigger Pyodide loading inside the web worker
    worker.postMessage({ type: 'INIT' });
    return worker;
  } catch (err) {
    console.error('[usePyodide] Failed to create Worker:', err);
    return null;
  }
}

/**
 * Pre-warm Pyodide in the background during idle time so it is ready before the user clicks Open Sandbox.
 */
export function warmupPyodide() {
  if (typeof window === 'undefined') return;
  if (globalWorker && globalIsReady) return;
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => ensureWorker(), { timeout: 1500 });
  } else {
    setTimeout(() => ensureWorker(), 300);
  }
}

export function isPyodideReady() {
  return globalIsReady;
}

export function usePyodide({ onStdout, onStderr, onReady, onFinish, onError, onTraceResult, onStdinRequest } = {}) {
  const [isReady, setIsReady] = useState(() => globalIsReady);
  const [isRunning, setIsRunning] = useState(false);

  // Keep latest callbacks in ref to prevent stale closures
  const callbacksRef = useRef({ onStdout, onStderr, onReady, onFinish, onError, onTraceResult, onStdinRequest });
  useEffect(() => {
    callbacksRef.current = { onStdout, onStderr, onReady, onFinish, onError, onTraceResult, onStdinRequest };
  }, [onStdout, onStderr, onReady, onFinish, onError, onTraceResult, onStdinRequest]);

  const isReadyRef = useRef(isReady);
  const isRunningRef = useRef(isRunning);

  useEffect(() => {
    isReadyRef.current = isReady;
  }, [isReady]);

  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);

  useEffect(() => {
    const worker = ensureWorker();

    // If Pyodide was already initialized in this session, immediately mark ready
    if (globalIsReady) {
      setIsReady(true);
      if (callbacksRef.current.onReady) {
        callbacksRef.current.onReady();
      }
    }

    const handleMessage = (data) => {
      const { type, content, message, inputs } = data;
      const cb = callbacksRef.current;

      switch (type) {
        case 'READY':
          setIsReady(true);
          if (cb.onReady) cb.onReady();
          break;
        case 'STDOUT':
          if (cb.onStdout) cb.onStdout(content);
          break;
        case 'STDERR':
          if (cb.onStderr) cb.onStderr(content);
          break;
        case 'STDIN_REQUEST':
          if (cb.onStdinRequest) cb.onStdinRequest();
          break;
        case 'TRACE_RESULT':
          setIsRunning(false);
          if (cb.onTraceResult) cb.onTraceResult(content);
          break;
        case 'FINISH':
          setIsRunning(false);
          if (cb.onFinish) cb.onFinish(inputs || []);
          break;
        case 'ERROR':
          setIsRunning(false);
          if (cb.onError) cb.onError(message);
          break;
        default:
          break;
      }
    };

    subscribers.add(handleMessage);

    return () => {
      subscribers.delete(handleMessage);
      // DO NOT terminate worker on unmount! Keep warm for zero-latency reopening.
    };
  }, []);

  const runCode = useCallback((code) => {
    if (!globalWorker || !isReadyRef.current || isRunningRef.current) return;
    setIsRunning(true);
    globalWorker.postMessage({ type: 'RUN', code });
  }, []);

  const runTrace = useCallback((code, inputs) => {
    if (!globalWorker || !isReadyRef.current || isRunningRef.current) return;
    setIsRunning(true);
    const replayInputs = inputs !== undefined ? inputs : globalLastRunInputs;
    globalWorker.postMessage({ type: 'TRACE', code, inputs: replayInputs });
  }, []);

  const stopCode = useCallback(() => {
    if (globalWorker) {
      globalWorker.terminate();
      globalWorker = null;
      globalIsReady = false;
      setIsRunning(false);
      setIsReady(false);
      // Relaunch fresh worker to recover from infinite loops
      ensureWorker();
    }
  }, []);

  const sendStdin = useCallback((text) => {
    const buffer = globalStdinBuffer;
    if (!buffer) {
      if (globalWorker) {
        globalWorker.postMessage({ type: 'STDIN_RESPONSE', inputText: text });
      }
      return;
    }
    const control = new Int32Array(buffer, 0, 1);
    const data = new Uint8Array(buffer, 4);
    data.fill(0);
    const encoded = new TextEncoder().encode(text);
    data.set(encoded.slice(0, data.length - 1));
    Atomics.store(control, 0, 1);
    Atomics.notify(control, 0, 1);
  }, []);

  return {
    isReady,
    isRunning,
    runCode,
    runTrace,
    stopCode,
    sendStdin
  };
}
