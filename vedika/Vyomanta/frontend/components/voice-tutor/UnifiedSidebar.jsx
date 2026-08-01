'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { T } from '@/lib/lms-data';
import { Brain, Zap, ArrowLeft, Settings, Menu, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMediaQuery, isMobileMQ } from '@/lib/useMediaQuery';

function getDateLabel(dateStr) {
  if (!dateStr) return 'Older';
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  if (date >= today) return 'Today';
  if (date >= yesterday) return 'Yesterday';
  if (date >= weekStart) return 'This Week';
  return 'Older';
}

export default function UnifiedSidebar({ sessions, currentSessionId, onSelectSession, onBack, mobileTopOffset, showMenuButton = true }) {
  const router = useRouter();
  const isMobile = useMediaQuery(isMobileMQ);
  const [open, setOpen] = useState(false);

  // Read collapsed state from localStorage (only in desktop)
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsCollapsed(localStorage.getItem('tutor_sidebar_collapsed') === 'true');
    }
  }, []);

  const toggleCollapse = () => {
    const nextState = !isCollapsed;
    setIsCollapsed(nextState);
    if (typeof window !== 'undefined') {
      localStorage.setItem('tutor_sidebar_collapsed', String(nextState));
    }
  };

  const grouped = useMemo(() => {
    const groups = {};
    if (!sessions) return groups;
    for (const session of sessions) {
      const label = getDateLabel(session.timestamp || session.startedAt);
      if (!groups[label]) groups[label] = [];
      groups[label].push(session);
    }
    for (const key of Object.keys(groups)) {
      groups[key].sort((a, b) => {
        const ta = new Date(a.timestamp || a.startedAt).getTime();
        const tb = new Date(b.timestamp || b.startedAt).getTime();
        return tb - ta;
      });
    }
    return groups;
  }, [sessions]);

  const orderedGroups = ['Today', 'Yesterday', 'This Week', 'Older'];

  const handleBack = () => {
    if (onBack) onBack();
    else router.push('/');
    if (isMobile) setOpen(false);
  };

  const handleSelect = (session) => {
    onSelectSession(session);
    if (isMobile) setOpen(false);
  };

  const sidebarContent = (
    <div style={{
      width: isMobile ? 260 : (isCollapsed ? 70 : 240), minHeight: isMobile ? '100%' : '100vh',
      background: T.s1, borderRight: `1px solid ${T.border}`,
      display: 'flex', flexDirection: 'column', flexShrink: 0, height: isMobile ? '100%' : undefined,
      position: 'relative', transition: 'width 0.2s ease'
    }}>
      {/* Floating Toggle Button (Desktop only) */}
      {!isMobile && (
        <button
          onClick={toggleCollapse}
          style={{
            position: 'absolute',
            top: 24,
            right: -12,
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: T.s1,
            border: `1px solid ${T.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: T.muted,
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            zIndex: 100,
            transition: 'all 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.color = T.accent}
          onMouseLeave={e => e.currentTarget.style.color = T.muted}
          title={isCollapsed ? "Expand History" : "Collapse History"}
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      )}

      {/* Header Area */}
      <div style={{ padding: isCollapsed && !isMobile ? '18px 10px 14px' : '18px 16px 14px', borderBottom: `1px solid ${T.border}` }}>
        {/* Back Button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: (isCollapsed && !isMobile) ? 'center' : 'space-between', marginBottom: 12 }}>
          <button onClick={handleBack} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: 'none', border: 'none', color: T.muted, cursor: 'pointer',
            fontSize: 12, padding: 0, fontFamily: 'inherit',
          }} title="Back to Home">
            <ArrowLeft size={14} />
            {(!isCollapsed || isMobile) && <span>Back to Home</span>}
          </button>
          {isMobile && (
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', padding: 4 }}>
              <X size={20} />
            </button>
          )}
        </div>

        {/* Brand/Title */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: (isCollapsed && !isMobile) ? 'center' : 'flex-start', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: `${T.purple}22`, border: `1px solid ${T.purple}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} title="Tutor History">
            <Brain size={16} color={T.purple} />
          </div>
          {(!isCollapsed || isMobile) && (
            <div>
              <div style={{ color: T.text, fontWeight: 700, fontSize: 14, letterSpacing: '-0.02em' }}>AI TUTOR</div>
              <div style={{ color: T.muted, fontSize: 10 }}>Tutor History</div>
            </div>
          )}
        </div>
      </div>

      {/* Session Navigation */}
      <nav style={{ flex: 1, padding: isCollapsed && !isMobile ? '12px 6px' : '12px 10px', overflowY: 'auto' }}>
        {orderedGroups.map((group) => {
          const items = grouped[group];
          if (!items || items.length === 0) return null;
          return (
            <div key={group} style={{ marginBottom: 16 }}>
              {(!isCollapsed || isMobile) && (
                <div style={{ fontSize: 10, color: T.dim, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0 6px', marginBottom: 6 }}>
                  {group}
                </div>
              )}
              {items.map((session) => {
                const isActive = session.id === currentSessionId;
                const isVoice = session.type === 'voice';
                return (
                  <button
                    key={session.type + '-' + session.id}
                    onClick={() => handleSelect(session)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: 'none',
                      background: isActive ? `${T.accent}15` : 'transparent',
                      color: isActive ? T.text : T.muted,
                      cursor: 'pointer',
                      fontSize: 12,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: (isCollapsed && !isMobile) ? 'center' : 'flex-start',
                      gap: 8,
                      fontFamily: 'inherit',
                      transition: 'all 0.15s',
                    }}
                    title={session.label || 'Untitled'}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = T.s2; }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span style={{ width: 20, height: 20, borderRadius: 6, background: isVoice ? `${T.accent}20` : `${T.purple}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {isVoice ? <Zap size={11} color={T.accent} /> : <Brain size={11} color={T.purple} />}
                    </span>
                    {(!isCollapsed || isMobile) && (
                      <>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: isActive ? 600 : 400, flex: 1 }}>
                          {session.label || 'Untitled'}
                        </span>
                        <span style={{ fontSize: 9, color: T.dim, flexShrink: 0 }}>{isVoice ? 'Voice' : 'Text'}</span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
        {(!sessions || sessions.length === 0) && (
          <div style={{ color: T.dim, fontSize: 11, textAlign: 'center', padding: '24px 0' }}>
            {isCollapsed && !isMobile ? '—' : 'No sessions yet'}
          </div>
        )}
      </nav>

      {/* Settings Area */}
      <div style={{ padding: '12px 18px', borderTop: `1px solid ${T.border}`, display: 'flex', justifyContent: (isCollapsed && !isMobile) ? 'center' : 'flex-start' }}>
        <button style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: 'none', background: 'transparent', color: T.muted, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
          title="Settings"
          onMouseEnter={e => { e.currentTarget.style.background = T.s2; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
          <Settings size={14} />
        </button>
      </div>
    </div>
  );

  if (isMobile && !showMenuButton) {
    return sidebarContent;
  }

  if (isMobile) {
    return (
      <>
        {!open && (
          <button onClick={() => setOpen(true)} style={{
            position: 'fixed', top: mobileTopOffset || 12, left: 12, zIndex: 999,
            width: 40, height: 40, borderRadius: 10,
            background: T.s2, border: `1px solid ${T.border}`,
            color: T.text, cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Menu size={20} />
          </button>
        )}
        {open && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex' }}>
            <div style={{ flexShrink: 0 }}>{sidebarContent}</div>
            <div style={{ flex: 1, background: 'rgba(0,0,0,0.5)' }} onClick={() => setOpen(false)} />
          </div>
        )}
      </>
    );
  }

  return sidebarContent;
}
