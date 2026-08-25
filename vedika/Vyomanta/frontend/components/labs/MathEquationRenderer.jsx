'use client';

import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Zap, CheckCircle2, ChevronRight } from 'lucide-react';
import 'katex/dist/katex.min.css';

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
        output: 'html'
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

  // Convert literal '\\n' strings into actual line breaks
  str = str.replace(/\\n/g, '\n');

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
  const blockBg = theme.s2 || 'rgba(91, 140, 248, 0.08)';
  const blockBorder = theme.border || 'rgba(91, 140, 248, 0.25)';

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
          fontWeight: 700,
          padding: displayMode ? '14px 20px' : '2px 4px',
          background: displayMode ? blockBg : 'rgba(91, 140, 248, 0.06)',
          borderRadius: displayMode ? '12px' : '6px',
          border: displayMode ? `1px solid ${blockBorder}` : '1px solid rgba(91, 140, 248, 0.15)',
          verticalAlign: 'middle',
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
        color: theme.accent || '#3B82F6',
        padding: '2px 8px',
        borderRadius: 6,
        fontWeight: 700,
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

<<<<<<< HEAD
// Universal recursive child renderer for LaTeX inline ($...$) and block ($$...$$) math + Step/Case badge highlights
=======
// Helper to visually render flipped/reversed characters for Mirror and Water Images notation e.g. G(rev) -> horizontally mirrored G, R(flip) -> vertically inverted R
export function renderFlippedCharacters(text) {
  if (typeof text !== 'string') return text;
  if (!/\((?:rev|flip|mirror|inverted|flipped|reverse)\)|(?:\(reversed [A-Za-z0-9]\))/i.test(text)) {
    return text;
  }

  const regex = /([A-Za-z0-9#@$%&*!?])\((rev|flip|mirror|inverted|flipped|reverse)\)|(?:\(reversed ([A-Za-z0-9])\))/gi;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const char = match[1] || match[3];
    const tag = (match[2] || 'rev').toLowerCase();
    const isWaterFlip = tag === 'flip' || tag === 'inverted' || tag === 'upside-down';

    parts.push(
      <span
        key={match.index}
        style={{
          display: 'inline-block',
          transform: isWaterFlip ? 'scaleY(-1)' : 'scaleX(-1)',
          fontWeight: 700,
          margin: '0 1px'
        }}
      >
        {char}
      </span>
    );

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

// Universal recursive child renderer for LaTeX inline ($...$) and block ($$...$$) math
>>>>>>> 1c2230f (feat(aptitude): add on-demand AI question engine & responsive custom UI)
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
<<<<<<< HEAD

        // Format Step / Case / Equation / Condition headers as bold badges
        const stepMatch = part.match(/^(Step\s*\d+:?|Case\s*\d+:?|Equation\s*\(?\d+\)?:?|Condition\s*\d+:?|Option\s*[A-Z]:?)/i);
        if (stepMatch) {
          const matchedStr = stepMatch[0];
          const restStr = part.slice(matchedStr.length);
          return (
            <React.Fragment key={idx}>
              <span
                style={{
                  background: `${theme.purple || '#8B5CF6'}18`,
                  color: theme.purple || '#8B5CF6',
                  border: `1px solid ${theme.purple || '#8B5CF6'}40`,
                  padding: '3px 10px',
                  borderRadius: '8px',
                  fontWeight: 800,
                  fontSize: '13px',
                  marginRight: '6px',
                  display: 'inline-block',
                  letterSpacing: '0.3px'
                }}
              >
                {matchedStr}
              </span>
              {restStr}
            </React.Fragment>
          );
        }

        return part;
=======
        return renderFlippedCharacters(part);
>>>>>>> 1c2230f (feat(aptitude): add on-demand AI question engine & responsive custom UI)
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
    text: theme.text || 'var(--text, #0F172A)',
    muted: theme.muted || 'var(--muted, #64748B)',
    purple: theme.purple || 'var(--purple, #8B5CF6)',
    accent: theme.accent || 'var(--accent, #3B82F6)',
    green: theme.green || 'var(--green, #10B981)',
    s2: theme.s2 || 'var(--s2, rgba(0, 0, 0, 0.03))',
    border: theme.border || 'var(--border, rgba(0, 0, 0, 0.08))'
  };

  return (
    <div style={{ fontSize: 15, lineHeight: 1.85, color: T.text, fontWeight: 500 }}>
      <style>{`
        .katex, .katex * {
          color: inherit !important;
        }
        .katex .katex-html {
          color: inherit !important;
          max-width: 100%;
        }
        .katex-display {
          margin: 12px 0 !important;
          color: inherit !important;
          overflow-x: auto !important;
          overflow-y: hidden !important;
          max-width: 100% !important;
          padding: 8px 4px !important;
        }
        .katex .sqrt > .svg-align {
          max-width: 100% !important;
        }
      `}</style>
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

            const isMultiLine = rawStr.includes('\n');
            const isInlineCode = inline === true || (!isMultiLine && !className);

            if (isInlineCode) {
              const isInlineMath = rawStr.startsWith('$') && rawStr.endsWith('$') && rawStr.length > 2;
              if (isInlineMath) {
                return <KaTeXSpan math={rawStr.slice(1, -1)} displayMode={false} theme={T} />;
              }

              return (
                <code
                  style={{
                    fontFamily: 'Consolas, Monaco, "Andale Mono", monospace',
                    background: 'rgba(139, 92, 246, 0.12)',
                    color: 'var(--purple)',
                    border: '1px solid rgba(139, 92, 246, 0.25)',
                    padding: '2px 7px',
                    borderRadius: 6,
                    fontWeight: 700,
                    fontSize: '0.87em',
                    display: 'inline',
                    whiteSpace: 'normal',
                    wordBreak: 'break-word'
                  }}
                >
                  {rawStr}
                </code>
              );
            }

            return (
              <pre
                style={{
                  background: T.s2,
                  border: `1px solid ${T.border}`,
                  borderRadius: 12,
                  padding: '14px 18px',
                  margin: '12px 0',
<<<<<<< HEAD
                  textAlign: 'center',
                  color: T.text,
                  fontWeight: 700,
                  fontSize: 16,
                  fontFamily: 'monospace',
=======
                  textAlign: 'left',
                  color: 'var(--text)',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  fontFamily: 'Consolas, Monaco, "Andale Mono", monospace',
>>>>>>> 1c2230f (feat(aptitude): add on-demand AI question engine & responsive custom UI)
                  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
                  overflowX: 'auto',
                  whiteSpace: 'pre-wrap'
                }}
              >
                <code>{rawStr}</code>
              </pre>
            );
          },
          p: ({ children }) => (
            <p style={{ margin: '12px 0', lineHeight: 1.85, color: T.text }}>{renderTextWithMath(children, T)}</p>
          ),
          li: ({ children }) => (
            <li style={{ margin: '8px 0', lineHeight: 1.85, color: T.text }}>{renderTextWithMath(children, T)}</li>
          ),
          strong: ({ children }) => (
            <strong style={{ fontWeight: 700, color: T.text }}>{renderTextWithMath(children, T)}</strong>
          ),
          em: ({ children }) => (
            <em style={{ fontStyle: 'italic' }}>{renderTextWithMath(children, T)}</em>
          ),
          blockquote: ({ children }) => (
            <blockquote style={{ borderLeft: `3px solid ${T.purple}`, paddingLeft: 12, margin: '10px 0', color: T.muted }}>
              {renderTextWithMath(children, T)}
            </blockquote>
          ),
          td: ({ children }) => <td style={{ padding: '8px 12px', color: T.text }}>{renderTextWithMath(children, T)}</td>,
          th: ({ children }) => <th style={{ padding: '8px 12px', fontWeight: 700, color: T.text }}>{renderTextWithMath(children, T)}</th>
        }}
      >
        {parsedContent}
      </ReactMarkdown>
    </div>
  );
}
