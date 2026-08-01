// Background Worker for Pyodide Execution
importScripts('https://cdn.jsdelivr.net/pyodide/v0.26.1/full/pyodide.js');

let pyodide = null;

// SharedArrayBuffer for stdin: [0]=status (0=waiting,1=ready), rest=UTF-8 bytes up to 1023 chars
let stdinBuffer = null;

async function initPyodide() {
  if (pyodide) return;
  try {
    pyodide = await loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.1/full/',
      stdout: (text) => {
        postMessage({ type: 'STDOUT', content: text + '\n' });
      },
      stderr: (text) => {
        postMessage({ type: 'STDERR', content: text + '\n' });
      }
    });

    postMessage({ type: 'READY' });
  } catch (error) {
    postMessage({ type: 'ERROR', message: 'Failed to load Pyodide: ' + error.message });
  }
}

/**
 * Blocking stdin reader using SharedArrayBuffer + Atomics.
 * Accepts the prompt string and writes it to terminal BEFORE blocking —
 * so the prompt ALWAYS appears before the user types anything.
 */
function readStdinBlocking(prompt) {
  if (!stdinBuffer) return '';
  const control = new Int32Array(stdinBuffer, 0, 1);
  const data = new Uint8Array(stdinBuffer, 4);

  // Write prompt to terminal first (before STDIN_REQUEST) so order is correct
  if (prompt) {
    postMessage({ type: 'STDOUT', content: prompt });
  }

  // Signal to main thread to enter input mode (cyan cursor)
  postMessage({ type: 'STDIN_REQUEST' });

  // Block until main thread sets control[0] = 1
  Atomics.store(control, 0, 0);
  Atomics.wait(control, 0, 0); // blocks until != 0

  // Read the UTF-8 string from the buffer
  let end = 0;
  while (end < data.length && data[end] !== 0) end++;
  const bytes = data.slice(0, end);
  const text = new TextDecoder().decode(bytes);

  // Reset buffer for next call
  data.fill(0);
  Atomics.store(control, 0, 0);

  return text;
}

self.onmessage = async function (event) {
  const { type, code, inputText, buffer } = event.data;

  if (type === 'INIT') {
    await initPyodide();

  } else if (type === 'INIT_STDIN_BUFFER') {
    stdinBuffer = buffer;

  } else if (type === 'STDIN_RESPONSE') {
    // Legacy fallback (non-blocking path)
    if (stdinBuffer) {
      const control = new Int32Array(stdinBuffer, 0, 1);
      const data = new Uint8Array(stdinBuffer, 4);
      data.fill(0);
      const encoded = new TextEncoder().encode(inputText || '');
      data.set(encoded.slice(0, data.length - 1));
      Atomics.store(control, 0, 1);
      Atomics.notify(control, 0, 1);
    }

  } else if (type === 'RUN') {
    if (!pyodide) {
      postMessage({ type: 'ERROR', message: 'Environment is not initialized yet.' });
      return;
    }

    try {
      // Override input() — JS side writes the prompt first, then blocks.
      // This guarantees the prompt text appears before the user cursor.
      pyodide.globals.set('__js_read_stdin__', readStdinBlocking);
      await pyodide.runPythonAsync(`
import builtins
_run_inputs_log = []

def _custom_input(prompt=''):
    val = __js_read_stdin__(prompt)
    _run_inputs_log.append(val)
    return val

builtins.input = _custom_input
`);

      await pyodide.loadPackagesFromImports(code);
      await pyodide.runPythonAsync(code);

      // Collect what the user typed so trace can replay it
      const inputsLog = pyodide.globals.get('_run_inputs_log').toJs();
      postMessage({ type: 'FINISH', inputs: inputsLog });
    } catch (error) {
      postMessage({ type: 'STDERR', content: error.message + '\n' });
      postMessage({ type: 'FINISH', inputs: [] });
    }

  } else if (type === 'TRACE') {
    if (!pyodide) {
      postMessage({ type: 'ERROR', message: 'Environment is not initialized yet.' });
      return;
    }

    try {
      const traceRunner = `
import sys
import json
import math
import builtins

# ── Mock input() during tracing ──────────────────────────────────────────────
# Replay the actual values the user typed during the real run, in order.
# This prevents the tracer from blocking on stdin.
_trace_inputs = []
_trace_input_idx = [0]

def _trace_input(prompt=''):
    idx = _trace_input_idx[0]
    if idx < len(_trace_inputs):
        val = _trace_inputs[idx]
        _trace_input_idx[0] += 1
        return val
    return ''

builtins.input = _trace_input

class TraceStdout:
    def __init__(self):
        self.buf = ""
    def write(self, s):
        self.buf += s
    def flush(self):
        pass

def serialize_val(val, visited=None):
    if visited is None:
        visited = set()
    val_id = id(val)
    if val_id in visited:
        return "<circular reference>"
    if isinstance(val, float):
        if math.isnan(val):
            return "NaN"
        elif math.isinf(val):
            return "Infinity" if val > 0 else "-Infinity"
        return val
    try:
        json.dumps(val, allow_nan=False)
        return val
    except:
        visited.add(val_id)
        try:
            if isinstance(val, (set, tuple)):
                return [serialize_val(x, visited) for x in val]
            elif isinstance(val, list):
                return [serialize_val(x, visited) for x in val]
            elif isinstance(val, dict):
                return {str(k): serialize_val(v, visited) for k, v in val.items()}
            else:
                return str(val)
        finally:
            visited.remove(val_id)

def trace_code(code_string, provided_inputs=None):
    global _trace_inputs, _trace_input_idx
    _trace_inputs = list(provided_inputs) if provided_inputs else []
    _trace_input_idx[0] = 0

    trace_data = []
    step_counter = 0

    stdout_redirector = TraceStdout()
    old_stdout = sys.stdout
    sys.stdout = stdout_redirector

    def trace_lines(frame, event, arg):
        nonlocal step_counter
        if frame.f_code.co_filename == '<string>':
            if event in ('line', 'return'):
                step_counter += 1
                if step_counter > 500:
                    raise Exception("Trace limit exceeded (max 500 steps) to prevent infinite loops.")

                local_vars = {}
                for k, v in frame.f_locals.items():
                    if not k.startswith('__') and k not in ('trace_code', 'trace_lines', 'serialize_val'):
                        local_vars[k] = serialize_val(v)

                trace_data.append({
                    "step": step_counter,
                    "line": frame.f_lineno,
                    "variables": local_vars,
                    "stdout": stdout_redirector.buf,
                    "event": event
                })
        return trace_lines

    globals_dict = {"__name__": "__main__"}
    locals_dict = {}

    sys.settrace(trace_lines)
    try:
        exec(code_string, globals_dict, locals_dict)
    except Exception as e:
        trace_data.append({
            "step": step_counter + 1,
            "line": 0,
            "error": str(e),
            "variables": {},
            "stdout": stdout_redirector.buf
        })
    finally:
        sys.settrace(None)
        sys.stdout = old_stdout

    return json.dumps(trace_data)
`;
      await pyodide.runPythonAsync(traceRunner);
      pyodide.globals.set("user_code_str", code);

      // Replay the actual user inputs so trace variables are correct
      const inputs = event.data.inputs || [];
      pyodide.globals.set("user_provided_inputs", pyodide.toPy(inputs));

      const jsonResult = await pyodide.runPythonAsync("trace_code(user_code_str, user_provided_inputs)");
      postMessage({ type: 'TRACE_RESULT', content: JSON.parse(jsonResult) });
    } catch (error) {
      postMessage({ type: 'ERROR', message: error.message });
    }
  }
};
