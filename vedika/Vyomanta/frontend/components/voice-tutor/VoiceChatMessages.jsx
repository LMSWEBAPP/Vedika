'use client';

import { useRef, useEffect } from 'react';
import { T } from '@/lib/lms-data';

const sentimentColorMap = {
  'Struggling / Confused': T.amber,
  'Happy / Confident': T.green,
  'Curious / Inquisitive': T.accent,
  'Calm / Conversational': T.muted,
};

const sentimentEmojiMap = {
  'Struggling / Confused': '\uD83D\uDE1F',
  'Happy / Confident': '\uD83D\uDE0A',
  'Curious / Inquisitive': '\uD83E\uDD14',
  'Calm / Conversational': '\uD83D\uDE10',
};

export default function VoiceChatMessages({ conversation }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation]);

  return (
    <div ref={scrollRef} style={{
      flex: 1, overflowY: 'auto', padding: '20px 24px',
      display: 'flex', flexDirection: 'column', gap: 20
    }}>
      {conversation.length === 0 ? (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', color: T.dim, gap: 8
        }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3 }}>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <p style={{ fontSize: 13, fontWeight: 500 }}>No messages yet</p>
          <p style={{ fontSize: 11 }}>Tap the microphone to start your tutoring session</p>
        </div>
      ) : (
        conversation.map((turn) => {
          const isStudent = turn.sender === 'student';
          return (
            <div key={turn.id} style={{
              display: 'flex', gap: 12, maxWidth: '80%',
              alignSelf: isStudent ? 'flex-end' : 'flex-start',
              flexDirection: isStudent ? 'row-reverse' : 'row'
            }}>
              {/* Avatar */}
              <div style={{
                width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isStudent ? T.s3 : T.purple,
                border: isStudent ? `1px solid ${T.border}` : 'none',
                marginTop: 2
              }}>
                {isStudent ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ color: T.muted }}>
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#fff' }}>
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                )}
              </div>

              {/* Message */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
                  color: isStudent ? T.muted : T.purple,
                  textAlign: isStudent ? 'right' : 'left'
                }}>
                  {isStudent ? 'YOU' : 'AI TUTOR'}
                </div>
                <div style={{
                  display: 'inline-block', padding: '10px 14px',
                  borderRadius: isStudent ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                  background: isStudent ? T.s2 : T.s3,
                  border: isStudent ? `1px solid ${T.border}` : `1px solid ${T.border}`,
                  color: T.text, fontSize: 13, lineHeight: 1.6
                }}>
                  <p style={{ margin: 0 }}>{turn.text}</p>
                  {isStudent && turn.sentiment && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, justifyContent: 'flex-end' }}>
                      <span style={{ fontSize: 12 }}>{sentimentEmojiMap[turn.sentiment.label] || '\uD83D\uDE10'}</span>
                      <span style={{ fontSize: 10, color: T.dim }}>{turn.sentiment.label}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
