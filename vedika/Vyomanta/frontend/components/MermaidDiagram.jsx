'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Code, Copy, Check, Sparkles, AlertCircle, Maximize2, ChevronDown, X } from 'lucide-react';
import './MermaidDiagram.css';

/**
 * Parses inline markdown formatted tokens (**bold**, *italic*, `code`)
 * into clean React elements so raw asterisks are never shown.
 */
function renderFormattedText(str) {
  if (!str) return '';
  const parts = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(str)) !== null) {
    if (match.index > lastIndex) {
      parts.push(str.substring(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={match.index} className="mermaid-text-bold">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code key={match.index} className="mermaid-text-code">
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(
        <em key={match.index} className="mermaid-text-italic">
          {token.slice(1, -1)}
        </em>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < str.length) {
    parts.push(str.substring(lastIndex));
  }
  return parts.length > 0 ? parts : str;
}

/**
 * Sanitizes raw Mermaid flowchart syntax to prevent parser syntax errors
 * caused by unquoted parentheses, braces, brackets, or invalid tokens.
 */
function sanitizeMermaid(raw) {
  if (!raw) return '';
  let code = raw.trim();

  // Strip markdown code fences if accidentally included
  code = code.replace(/^```(?:mermaid)?\s*/i, '').replace(/```\s*$/, '').trim();

  // Ensure diagram header exists
  if (!/^(flowchart|graph|mindmap|sequenceDiagram|classDiagram|stateDiagram|erDiagram)/i.test(code)) {
    code = `flowchart TD\n${code}`;
  }

  // Replace unquoted parentheses inside square bracket node labels: A[Text (detail)] -> A["Text (detail)"]
  code = code.replace(/(\[[^"\]\n]*\([^"\]\n]*\)[^"\]\n]*\])/g, (match) => {
    const inner = match.slice(1, -1).trim();
    if (inner.startsWith('"') && inner.endsWith('"')) return match;
    return `["${inner.replace(/"/g, "'")}"]`;
  });

  return code;
}

export default function MermaidDiagram({ chart, points = [], onRegenerate }) {
  const containerRef = useRef(null);
  const modalViewportRef = useRef(null);
  const [svgHtml, setSvgHtml] = useState('');
  const [renderError, setRenderError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [modalZoom, setModalZoom] = useState(1);
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isKeypointsOpen, setIsKeypointsOpen] = useState(false); // Collapsed by default (inline chat)
  const [isModalOpen, setIsModalOpen] = useState(false); // Fullscreen expand modal
  const [isModalKeypointsOpen, setIsModalKeypointsOpen] = useState(false); // Collapsed by default (modal)

  // Reset modal scroll and state whenever modal is opened
  useEffect(() => {
    if (isModalOpen) {
      setIsModalKeypointsOpen(false); // Collapsed by default
      setModalZoom(1);
      // Wait for layout paint to ensure scroll starts at the absolute top (0,0)
      const timer = setTimeout(() => {
        if (modalViewportRef.current) {
          modalViewportRef.current.scrollTop = 0;
          modalViewportRef.current.scrollLeft = 0;
        }
      }, 40);
      return () => clearTimeout(timer);
    }
  }, [isModalOpen]);

  // Generate unique render ID per component mount to prevent SVG collisions
  const uniqueIdRef = useRef(`mermaid_${Math.random().toString(36).substr(2, 9)}`);

  const activeChartCode = chart || (points.length > 0
    ? `flowchart TD\n  Root["🎯 Visual Overview"]\n${points.slice(0, 6).map((p, i) => `  Node_${i + 1}["${p.replace(/["\(\)\[\]\{\}]/g, ' ').slice(0, 40)}"]\n  Root --> Node_${i + 1}`).join('\n')}`
    : `flowchart TD\n  Start["No diagram data"]`);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setRenderError(null);

    async function renderChart() {
      try {
        const mermaid = (await import('mermaid')).default;
        
        mermaid.initialize({
          startOnLoad: false,
          theme: 'base',
          themeVariables: {
            darkMode: true,
            background: 'transparent',
            primaryColor: '#1E293B',
            primaryTextColor: '#F8FAFC',
            primaryBorderColor: '#3B82F6',
            lineColor: '#60A5FA',
            secondaryColor: '#1E1B4B',
            tertiaryColor: '#0F172A',
            edgeLabelBackground: '#1E293B',
            fontFamily: 'var(--font-outfit), sans-serif',
            fontSize: '13px'
          },
          securityLevel: 'loose',
          flowchart: {
            htmlLabels: true,
            curve: 'basis'
          }
        });

        const sanitized = sanitizeMermaid(activeChartCode);
        const renderId = uniqueIdRef.current;

        // Render SVG dynamically
        const { svg } = await mermaid.render(renderId, sanitized);
        if (isMounted) {
          setSvgHtml(svg);
          setLoading(false);
        }
      } catch (err) {
        console.warn('Mermaid rendering failed, attempting simplified fallback:', err);
        // Fallback: try ultra-simple synthesized tree from points
        if (points && points.length > 0) {
          try {
            const mermaid = (await import('mermaid')).default;
            const simpleChart = `flowchart TD\n  Root["🎯 Concept Summary"]\n${points.slice(0, 5).map((p, idx) => `  P${idx + 1}["${p.replace(/[^a-zA-Z0-9\s]/g, ' ').trim().slice(0, 36)}"]\n  Root --> P${idx + 1}`).join('\n')}`;
            const { svg } = await mermaid.render(`${uniqueIdRef.current}_fallback`, simpleChart);
            if (isMounted) {
              setSvgHtml(svg);
              setLoading(false);
              return;
            }
          } catch (fbErr) {
            console.error('Fallback mermaid render error:', fbErr);
          }
        }
        if (isMounted) {
          setRenderError(err?.message || 'Diagram syntax parsing error');
          setLoading(false);
        }
      }
    }

    renderChart();

    return () => {
      isMounted = false;
    };
  }, [activeChartCode, points]);

  // Handle ESC key to dismiss modal
  useEffect(() => {
    if (!isModalOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsModalOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.15, 2.2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.15, 0.5));
  const handleZoomReset = () => setZoom(1);

  const handleModalZoomIn = () => setModalZoom(prev => Math.min(prev + 0.15, 2.5));
  const handleModalZoomOut = () => setModalZoom(prev => Math.max(prev - 0.15, 0.4));
  const handleModalZoomReset = () => setModalZoom(1);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(activeChartCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="mermaid-container">
      {/* Header Toolbar */}
      <div className="mermaid-toolbar">
        <div className="mermaid-title-area">
          <span className="mermaid-badge">Mermaid Infographic</span>
          <span className="mermaid-label">Dynamic Flowchart & Concepts</span>
        </div>

        <div className="mermaid-actions">
          {/* Zoom controls */}
          <button
            type="button"
            className="mermaid-btn"
            onClick={handleZoomIn}
            title="Zoom In"
            aria-label="Zoom in diagram"
          >
            <ZoomIn size={13} />
          </button>
          <button
            type="button"
            className="mermaid-btn"
            onClick={handleZoomOut}
            title="Zoom Out"
            aria-label="Zoom out diagram"
          >
            <ZoomOut size={13} />
          </button>
          <button
            type="button"
            className="mermaid-btn"
            onClick={handleZoomReset}
            title="Reset Zoom"
            aria-label="Reset zoom"
          >
            <RotateCcw size={12} />
            <span>{Math.round(zoom * 100)}%</span>
          </button>

          {/* Code viewer toggle */}
          <button
            type="button"
            className={`mermaid-btn ${showCode ? 'active' : ''}`}
            onClick={() => setShowCode(!showCode)}
            title="Toggle Mermaid Code"
          >
            <Code size={13} />
            <span>DSL</span>
          </button>

          {/* Copy button */}
          <button
            type="button"
            className="mermaid-btn"
            onClick={handleCopyCode}
            title="Copy Diagram Syntax"
          >
            {copied ? <Check size={13} color="#10B981" /> : <Copy size={13} />}
          </button>

          {/* Fullscreen / Expand Modal Toggle */}
          <button
            type="button"
            className="mermaid-btn mermaid-expand-btn"
            onClick={() => setIsModalOpen(true)}
            title="Open in Focused Modal Window"
          >
            <Maximize2 size={12} />
            <span>Expand</span>
          </button>

          {/* Optional Regenerate */}
          {onRegenerate && (
            <button
              type="button"
              className="mermaid-btn"
              onClick={onRegenerate}
              title="Regenerate Infographic"
            >
              <Sparkles size={13} color="#F59E0B" />
              <span>Regen</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Viewport */}
      {showCode ? (
        <pre className="mermaid-raw-code">{activeChartCode}</pre>
      ) : (
        <div className="mermaid-viewport" ref={containerRef}>
          {loading && (
            <div className="mermaid-loading">
              <Sparkles size={20} className="animate-spin" color="#3B82F6" />
              <span>Rendering Mermaid diagram...</span>
            </div>
          )}

          {!loading && renderError && (
            <div className="mermaid-error">
              <AlertCircle size={20} />
              <span>Could not render diagram visually: {renderError}</span>
              <button
                type="button"
                className="mermaid-btn"
                style={{ marginTop: 8 }}
                onClick={() => setShowCode(true)}
              >
                Inspect Mermaid Code
              </button>
            </div>
          )}

          {!loading && !renderError && svgHtml && (
            <div
              className="mermaid-svg-wrapper"
              style={{ transform: `scale(${zoom})` }}
              dangerouslySetInnerHTML={{ __html: svgHtml }}
            />
          )}
        </div>
      )}

      {/* Key Takeaways Section (Collapsible Accordion with Formatted Typography) */}
      {points && points.length > 0 && (
        <div className="mermaid-takeaways">
          <button
            type="button"
            className="mermaid-takeaways-toggle"
            onClick={() => setIsKeypointsOpen(!isKeypointsOpen)}
            title={isKeypointsOpen ? "Click to collapse takeaways" : "Click to view key takeaways"}
          >
            <div className="mermaid-takeaways-toggle-left">
              <Sparkles size={13} color="#F5A95B" />
              <span className="mermaid-takeaways-title">Key Takeaways & Concepts</span>
              <span className="mermaid-takeaways-count">({points.length} points)</span>
            </div>
            <ChevronDown
              size={15}
              className={`mermaid-takeaways-chevron ${isKeypointsOpen ? 'open' : ''}`}
            />
          </button>

          {isKeypointsOpen && (
            <div className="mermaid-takeaways-list">
              {points.map((pt, idx) => (
                <div key={idx} className="mermaid-takeaway-item">
                  <span className="mermaid-takeaway-bullet">{idx + 1}</span>
                  <div className="mermaid-takeaway-text">{renderFormattedText(pt)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Expanded Modal Window */}
      {isModalOpen && (
        <div
          className="mermaid-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div className="mermaid-modal-window" role="dialog" aria-modal="true">
            {/* Modal Header */}
            <div className="mermaid-modal-header">
              <div className="mermaid-title-area">
                <span className="mermaid-badge">Expanded Infographic</span>
                <span className="mermaid-label">Full Visual Concept Overview</span>
              </div>

              <div className="mermaid-actions">
                {/* Toggle Key Takeaways on the Right Side */}
                {points && points.length > 0 && (
                  <button
                    type="button"
                    className={`mermaid-btn mermaid-modal-keypoints-btn ${isModalKeypointsOpen ? 'active' : ''}`}
                    onClick={() => setIsModalKeypointsOpen(!isModalKeypointsOpen)}
                    title={isModalKeypointsOpen ? "Hide Key Takeaways Drawer" : "Show Key Takeaways on Right Side"}
                  >
                    <Sparkles size={12} color={isModalKeypointsOpen ? "#F5A95B" : "#94A3B8"} />
                    <span>Key Takeaways ({points.length})</span>
                  </button>
                )}

                <button type="button" className="mermaid-btn" onClick={handleModalZoomIn} title="Zoom In"><ZoomIn size={13} /></button>
                <button type="button" className="mermaid-btn" onClick={handleModalZoomOut} title="Zoom Out"><ZoomOut size={13} /></button>
                <button type="button" className="mermaid-btn" onClick={handleModalZoomReset} title="Reset Zoom"><RotateCcw size={12} /><span>{Math.round(modalZoom * 100)}%</span></button>
                <button
                  type="button"
                  className="mermaid-modal-close-btn"
                  onClick={() => setIsModalOpen(false)}
                  title="Close (Esc)"
                >
                  <X size={14} />
                  <span>Close</span>
                </button>
              </div>
            </div>

            {/* Modal Main Body: Flowchart on left (full height), Key Takeaways Drawer on right */}
            <div className="mermaid-modal-body">
              <div className="mermaid-modal-viewport" ref={modalViewportRef}>
                {svgHtml && (
                  <div
                    className="mermaid-svg-wrapper modal-chart"
                    style={{ transform: `scale(${modalZoom})` }}
                    dangerouslySetInnerHTML={{ __html: svgHtml }}
                  />
                )}
              </div>

              {/* Right-Side Key Takeaways Drawer (Opens horizontally so vertical flowchart height is never lost) */}
              {points && points.length > 0 && isModalKeypointsOpen && (
                <aside className="mermaid-modal-sidebar">
                  <div className="mermaid-modal-sidebar-header">
                    <div className="mermaid-modal-sidebar-title">
                      <Sparkles size={14} color="#F5A95B" />
                      <span>Key Takeaways</span>
                      <span className="mermaid-takeaways-count">({points.length})</span>
                    </div>
                    <button
                      type="button"
                      className="mermaid-modal-sidebar-close"
                      onClick={() => setIsModalKeypointsOpen(false)}
                      title="Collapse Key Takeaways"
                      aria-label="Collapse Key Takeaways"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <div className="mermaid-modal-sidebar-content">
                    {points.map((pt, idx) => (
                      <div key={idx} className="mermaid-takeaway-item sidebar-item">
                        <span className="mermaid-takeaway-bullet">{idx + 1}</span>
                        <div className="mermaid-takeaway-text">{renderFormattedText(pt)}</div>
                      </div>
                    ))}
                  </div>
                </aside>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
