import { useEffect, useRef, useState, useCallback } from 'react';

export function usePyodide({ onStdout, onStderr, onReady, onFinish, onError, onTraceResult, onStdinRequest } = {}) {
  const [isReady, setIsReady] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const workerRef = useRef(null);
  const stdinBufferRef = useRef(null);
  const lastRunInputsRef = useRef([]); // inputs typed during the last RUN

  // Keep latest callbacks in ref to prevent recreating initWorker on every render
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

  const initWorker = useCallback(() => {
    setIsReady(false);
    setIsRunning(false);

    // Create a new web worker instance from public folder
    const worker = new Worker('/workers/pyodide.worker.js');
    workerRef.current = worker;

    // Create a SharedArrayBuffer for stdin: 4 bytes control + 1024 bytes data
    // Only available in cross-origin isolated contexts (COOP/COEP headers required)
    let stdinBuffer = null;
    try {
      stdinBuffer = new SharedArrayBuffer(4 + 1024);
      stdinBufferRef.current = stdinBuffer;
    } catch (e) {
      console.warn('[usePyodide] SharedArrayBuffer not available. Interactive input() will use fallback prompt.');
      stdinBufferRef.current = null;
    }

    worker.onmessage = (event) => {
      const { type, content, message } = event.data;
      const cb = callbacksRef.current;

      switch (type) {
        case 'READY':
          setIsReady(true);
          // Send the stdin buffer to the worker right after it's ready
          if (stdinBuffer) {
            worker.postMessage({ type: 'INIT_STDIN_BUFFER', buffer: stdinBuffer });
          }
          if (cb.onReady) cb.onReady();
          break;
        case 'STDOUT':
          if (cb.onStdout) cb.onStdout(content);
          break;
        case 'STDERR':
          if (cb.onStderr) cb.onStderr(content);
          break;
        case 'STDIN_REQUEST':
          // Worker is blocked waiting for input — notify the UI
          if (cb.onStdinRequest) cb.onStdinRequest();
          break;
        case 'TRACE_RESULT':
          setIsRunning(false);
          if (cb.onTraceResult) cb.onTraceResult(content);
          break;
        case 'FINISH':
          setIsRunning(false);
          // Store the inputs typed during this run so runTrace can replay them
          lastRunInputsRef.current = event.data.inputs || [];
          if (cb.onFinish) cb.onFinish(event.data.inputs || []);
          break;
        case 'ERROR':
          setIsRunning(false);
          if (cb.onError) cb.onError(message);
          break;
        default:
          break;
      }
    };

    // Trigger Pyodide loading inside the web worker
    worker.postMessage({ type: 'INIT' });
  }, []);

  useEffect(() => {
    initWorker();
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, [initWorker]);

  const runCode = useCallback((code) => {
    if (!isReadyRef.current || isRunningRef.current || !workerRef.current) return;
    setIsRunning(true);
    workerRef.current.postMessage({ type: 'RUN', code });
  }, []);

  const runTrace = useCallback((code, inputs) => {
    if (!isReadyRef.current || isRunningRef.current || !workerRef.current) return;
    setIsRunning(true);
    // Use provided inputs or fall back to what was typed in last RUN
    const replayInputs = inputs !== undefined ? inputs : lastRunInputsRef.current;
    workerRef.current.postMessage({ type: 'TRACE', code, inputs: replayInputs });
  }, []);

  const stopCode = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      setIsRunning(false);
      setIsReady(false);
      // Relaunch a fresh worker immediately to handle future run commands
      initWorker();
    }
  }, [initWorker]);

  /**
   * Send a line of input to the blocked worker via SharedArrayBuffer.
   * Called by the terminal when the user presses Enter.
   */
  const sendStdin = useCallback((text) => {
    const buffer = stdinBufferRef.current;
    if (!buffer) {
      // Fallback: just send as message (worker handles STDIN_RESPONSE)
      if (workerRef.current) {
        workerRef.current.postMessage({ type: 'STDIN_RESPONSE', inputText: text });
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
