'use client';

import { useState } from 'react';
import { Clock, Check, Copy, Brain, HelpCircle, ChevronRight, BookOpen, Quote, Info } from 'lucide-react';
import { T } from '@/lib/lms-data';

export default function VideoAIExplainerCard({ explanation, onSeek, onAskFollowUp }) {
  const [copied, setCopied] = useState(false);

  if (!explanation) return null;

  const handleCopy = () => {
    const textToCopy = `[${explanation.timestamp || '00:00'}] ${explanation.summary}\n\nExplanation:\n${explanation.coreExplanation}\n\nKey Points:\n${(explanation.keyTakeaways || []).map((p) => `• ${p}`).join("\n")}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      borderRadius: 16,
      border: `1px solid ${T.border}`,
      background: T.s1,
      padding: 14,
      color: T.text,
      boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.08)',
      gap: 12
    }}>
      {/* Header bar with timestamp button (Matching Screenshot 1) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justify: 'space-between',
        gap: 8,
        paddingBottom: 10,
        borderBottom: `1px solid ${T.border}`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={() => onSeek && onSeek(explanation.seconds || 0)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              borderRadius: 8,
              background: `${T.accent}15`,
              padding: '4px 10px',
              fontSize: 12,
              fontFamily: 'monospace',
              fontWeight: 600,
              color: T.accent,
              border: `1px solid ${T.accent}35`,
              cursor: 'pointer'
            }}
            title="Jump video to this timestamp"
          >
            <Clock size={14} style={{ color: T.accent }} />
            <span>{explanation.timestamp || '00:00'}</span>
            <ChevronRight size={12} style={{ opacity: 0.7 }} />
          </button>
          <span style={{ fontSize: 12, color: T.muted }}>Timestamp Breakdown</span>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            background: 'none',
            border: 'none',
            fontSize: 12,
            color: T.muted,
            cursor: 'pointer'
          }}
          title="Copy explanation"
        >
          {copied ? <Check size={14} style={{ color: T.green || '#0D9488' }} /> : <Copy size={14} />}
          <span style={{ fontSize: 11 }}>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>

      {/* Summary Highlight (Matching Screenshot 1) */}
      <div style={{
        borderRadius: 12,
        background: T.s2,
        padding: 12,
        border: `1px solid ${T.accent}30`,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10
      }}>
        <Brain size={16} style={{ color: T.accent, flexShrink: 0, marginTop: 2 }} />
        <p style={{ fontSize: 12.5, fontWeight: 500, lineHeight: 1.6, color: T.text, margin: 0 }}>
          {explanation.summary}
        </p>
      </div>

      {/* Core Explanation (Matching Screenshot 1) */}
      {explanation.coreExplanation && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <h4 style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: T.accent,
            margin: 0
          }}>
            <BookOpen size={14} />
            WHAT IS BEING EXPLAINED RIGHT NOW
          </h4>
          <p style={{ fontSize: 12.5, lineHeight: 1.6, color: T.text, opacity: 0.9, margin: 0 }}>
            {explanation.coreExplanation}
          </p>
        </div>
      )}

      {/* Key Takeaways (Matching Screenshot 1) */}
      {Array.isArray(explanation.keyTakeaways) && explanation.keyTakeaways.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 10, borderTop: `1px solid ${T.border}` }}>
          <h4 style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: T.muted,
            margin: 0
          }}>
            KEY CONCEPTS & TAKEAWAYS
          </h4>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 0, margin: 0, listStyle: 'none' }}>
            {explanation.keyTakeaways.map((point, idx) => (
              <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: T.text }}>
                <span style={{ height: 6, width: 6, borderRadius: '50%', background: T.accent, flexShrink: 0, marginTop: 5 }} />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Context In The Lesson (Matching Screenshot 1) */}
      {explanation.whyItMatters && (
        <div style={{
          borderRadius: 12,
          background: T.s2,
          padding: 12,
          border: `1px solid ${T.border}`,
          fontSize: 12
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: T.text, marginBottom: 4 }}>
            <Info size={14} style={{ color: T.accent }} />
            Context In The Lesson
          </span>
          <p style={{ color: T.muted, lineHeight: 1.5, fontSize: 11.5, margin: 0 }}>
            {explanation.whyItMatters}
          </p>
        </div>
      )}

      {/* Spoken Captions if available */}
      {explanation.transcriptSnippet && (
        <div style={{
          borderRadius: 12,
          background: T.s2,
          padding: 10,
          border: `1px solid ${T.border}`,
          fontSize: 11
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: T.muted, marginBottom: 4 }}>
            <Quote size={12} style={{ color: T.accent }} />
            <span>Spoken Captions</span>
          </div>
          <pre style={{
            fontFamily: 'monospace',
            color: T.text,
            whiteSpace: 'pre-wrap',
            lineHeight: 1.5,
            maxHeight: 96,
            overflowY: 'auto',
            margin: 0
          }}>
            {explanation.transcriptSnippet}
          </pre>
        </div>
      )}

      {/* Suggested Follow-Ups */}
      {Array.isArray(explanation.suggestedFollowUps) && explanation.suggestedFollowUps.length > 0 && (
        <div style={{ paddingTop: 10, borderTop: `1px solid ${T.border}` }}>
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: T.muted, display: 'block', marginBottom: 6 }}>
            Ask Vedika Follow-Up
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {explanation.suggestedFollowUps.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onAskFollowUp && onAskFollowUp(q)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  borderRadius: 8,
                  border: `1px solid ${T.border}`,
                  background: T.s2,
                  padding: '5px 10px',
                  fontSize: 12,
                  color: T.text,
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <HelpCircle size={12} style={{ color: T.accent, flexShrink: 0 }} />
                <span>{q}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
