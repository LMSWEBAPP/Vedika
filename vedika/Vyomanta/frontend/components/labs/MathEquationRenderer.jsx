'use client';

import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Zap, CheckCircle2, ChevronRight } from 'lucide-react';

let katex = null;
try {
  katex = require('katex');
} catch (e) {
  // Fallback if katex is initializing
}

// Safely render LaTeX math using KaTeX HTML string output
export function renderMathToHTML(tex, displayMode = false) {
  if (!tex || typeof tex !== 'string') return null;
  const cleanTex = tex.trim();
  if (!cleanTex) return null;

  if (katex) {
    try {
      return katex.renderToString(cleanTex, {
        displayMode,
        throwOnError: false,
        trust: true,
        output: 'htmlAndMathml'
      });
    } catch (err) {
      console.warn('[KaTeX Render Notice]', err);
    }
  }
  return null;
}

// Pre-parse Markdown text to extract block math and inline math
export function parseLaTeXInText(content) {
  if (!content) return '';
  let str = String(content);

  // Normalize LaTeX block delimiters \[ ... \] and inline \( ... \)
  str = str
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, formula) => `\n\n$$\n${formula.trim()}\n$$\n\n`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_, formula) => ` $${formula.trim()}$ `);

  return str;
}

// Individual KaTeX rendered block/inline component with theme sensitivity
export function KaTeXSpan({ math, displayMode = false, style = {}, theme = {} }) {
  const html = useMemo(() => renderMathToHTML(math, displayMode), [math, displayMode]);

  const textColor = theme.text || 'inherit';
  const blockBg = theme.s2 || 'var(--s2)';
  const blockBorder = theme.border || 'var(--border)';

  if (html) {
    return (
      <span
        style={{
          display: displayMode ? 'block' : 'inline-block',
          margin: displayMode ? '14px 0' : '0 4px',
          textAlign: displayMode ? 'center' : 'left',
          overflowX: displayMode ? 'auto' : 'visible',
          maxWidth: '100%',
          color: textColor,
          padding: displayMode ? '12px 18px' : '0 2px',
          background: displayMode ? blockBg : 'transparent',
          borderRadius: displayMode ? '12px' : '0',
          border: displayMode ? `1px solid ${blockBorder}` : 'none',
          boxShadow: displayMode ? '0 2px 10px rgba(0, 0, 0, 0.04)' : 'none',
          ...style
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  // Graceful fallback display if KaTeX string output fails
  return (
    <span
      style={{
        fontFamily: 'monospace',
        background: 'rgba(91, 140, 248, 0.15)',
        color: '#729DF8',
        padding: '2px 8px',
        borderRadius: 6,
        fontWeight: 600,
        fontSize: 14,
        display: displayMode ? 'block' : 'inline-block',
        margin: displayMode ? '10px 0' : '2px 4px',
        ...style
      }}
    >
      {math}
    </span>
  );
}

// Universal recursive child renderer for LaTeX inline ($...$) and block ($$...$$) math
export function renderTextWithMath(children, theme = {}) {
  return React.Children.map(children, (child) => {
    if (typeof child === 'string') {
      const parts = child.split(/(\$\$[\s\S]*?\$\$|\$[^$\n]+\$)/g);
      return parts.map((part, idx) => {
        if (part.startsWith('$$') && part.endsWith('$$') && part.length >= 4) {
          const math = part.slice(2, -2).trim();
          return <KaTeXSpan key={idx} math={math} displayMode={true} theme={theme} />;
        }
        if (part.startsWith('$') && part.endsWith('$') && part.length >= 2) {
          const math = part.slice(1, -1).trim();
          return <KaTeXSpan key={idx} math={math} displayMode={false} theme={theme} />;
        }
        return part;
      });
    }
    if (React.isValidElement(child) && child.props && child.props.children) {
      return React.cloneElement(child, {
        children: renderTextWithMath(child.props.children, theme)
      });
    }
    return child;
  });
}

// Main Component: Renders full AI response with KaTeX math equation support & custom theme
export default function MathEquationRenderer({ content, theme = {} }) {
  const parsedContent = useMemo(() => parseLaTeXInText(content), [content]);

  const T = {
    text: theme.text || 'var(--text)',
    muted: theme.muted || 'var(--muted)',
    purple: theme.purple || 'var(--purple)',
    accent: theme.accent || 'var(--accent)',
    green: theme.green || 'var(--green)',
    s2: theme.s2 || 'var(--s2)',
    border: theme.border || 'var(--border)'
  };

  return (
    <div style={{ fontSize: 15, lineHeight: 1.8, color: T.text }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h3: ({ children }) => {
            const txt = String(children);
            if (txt.toLowerCase().includes('final answer')) {
              return (
                <div
                  style={{
                    background: `${T.green}18`,
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
                  }}
                >
                  <CheckCircle2 size={22} /> {renderTextWithMath(children, T)}
                </div>
              );
            }

            return (
              <h3
                style={{
                  fontSize: 17,
                  fontWeight: 700,
                  color: T.purple,
                  marginTop: 22,
                  marginBottom: 10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  borderBottom: `1px solid ${T.border}`,
                  paddingBottom: 8
                }}
              >
                <Zap size={18} color={T.purple} /> {renderTextWithMath(children, T)}
              </h3>
            );
          },
          h4: ({ children }) => (
            <h4
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: T.accent,
                marginTop: 16,
                marginBottom: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <ChevronRight size={16} color={T.accent} /> {renderTextWithMath(children, T)}
            </h4>
          ),
          code: ({ inline, className, children }) => {
            const rawStr = String(children).replace(/\n$/, '');

            if (className === 'language-math' || className === 'language-latex') {
              return <KaTeXSpan math={rawStr} displayMode={true} theme={T} />;
            }

            if (inline) {
              const isInlineMath = rawStr.startsWith('$') && rawStr.endsWith('$') && rawStr.length > 2;
              if (isInlineMath) {
                return <KaTeXSpan math={rawStr.slice(1, -1)} displayMode={false} theme={T} />;
              }

              return (
                <span
                  style={{
                    fontFamily: 'monospace',
                    background: `${T.accent}18`,
                    color: T.accent,
                    border: `1px solid ${T.accent}30`,
                    padding: '2px 8px',
                    borderRadius: 6,
                    fontWeight: 700,
                    fontSize: 14,
                    display: 'inline-block',
                    margin: '2px 4px'
                  }}
                >
                  {rawStr}
                </span>
              );
            }

            return (
              <div
                style={{
                  background: T.s2,
                  border: `1px solid ${T.border}`,
                  borderRadius: 12,
                  padding: '14px 20px',
                  margin: '12px 0',
                  textAlign: 'center',
                  color: T.accent,
                  fontWeight: 700,
                  fontSize: 16,
                  fontFamily: 'monospace',
                  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
                  overflowX: 'auto'
                }}
              >
                {rawStr}
              </div>
            );
          },
          p: ({ children }) => (
            <p style={{ margin: '10px 0', lineHeight: 1.8 }}>{renderTextWithMath(children, T)}</p>
          ),
          li: ({ children }) => (
            <li style={{ margin: '6px 0', lineHeight: 1.8 }}>{renderTextWithMath(children, T)}</li>
          ),
          strong: ({ children }) => (
            <strong style={{ fontWeight: 700 }}>{renderTextWithMath(children, T)}</strong>
          ),
          em: ({ children }) => (
            <em style={{ fontStyle: 'italic' }}>{renderTextWithMath(children, T)}</em>
          ),
          blockquote: ({ children }) => (
            <blockquote style={{ borderLeft: `3px solid ${T.purple}`, paddingLeft: 12, margin: '10px 0', color: T.muted }}>
              {renderTextWithMath(children, T)}
            </blockquote>
          ),
          td: ({ children }) => <td style={{ padding: '8px 12px' }}>{renderTextWithMath(children, T)}</td>,
          th: ({ children }) => <th style={{ padding: '8px 12px', fontWeight: 700 }}>{renderTextWithMath(children, T)}</th>
        }}
      >
        {parsedContent}
      </ReactMarkdown>
    </div>
  );
}
