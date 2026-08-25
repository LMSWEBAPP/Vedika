'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  BookOpen, Brain, BarChart3, Zap, LogOut, Briefcase, Sun, Moon,
  FlaskConical, ChevronDown, Plus, Code2
} from 'lucide-react';
import { T, getTheme, setTheme } from '@/lib/lms-data';
import { useMediaQuery, isMobileMQ } from '@/lib/useMediaQuery';
import MobileNav from './MobileNav';

const NAV = [
  { id: '/courses',       Icon: BookOpen,      label: 'Courses'       },
  { id: '/vedika-ai',     Icon: Brain,         label: 'Vedika AI'     },
  { id: '/vedika-labs',   Icon: FlaskConical,  label: 'Vedika Labs'   },
  { id: '/jobs',          Icon: Briefcase,     label: 'Jobs'          },
  { id: '/progress',      Icon: BarChart3,     label: 'Progress'      },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const isMobile = useMediaQuery(isMobileMQ);
  const isGeneralTutor = pathname.startsWith('/vedika-ai/ask');
  const isCodingTutor = pathname.startsWith('/vedika-ai/code');
  const isTutorPage = isGeneralTutor || isCodingTutor;

  const [user, setUser] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [historyDropdownOpen, setHistoryDropdownOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('frappe_user');
      if (stored) {
        try {
          setUser(JSON.parse(stored));
        } catch (e) {}
      }
    }
  }, []);

  const getInitials = (name) => {
    if (!name) return 'V';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const loadTutorSessions = () => {
    if (!isTutorPage) return;
    const textKey = isGeneralTutor ? 'general-tutor-sessions' : 'coding-tutor-sessions';
    const activeKey = isGeneralTutor ? 'current-general-tutor-session-id' : 'current-coding-tutor-session-id';

    try {
      const rawText = localStorage.getItem(textKey);
      const textSess = rawText ? JSON.parse(rawText) : [];

      const all = [...textSess];
      all.sort((a, b) => {
        const ta = new Date(a.timestamp || 0).getTime();
        const tb = new Date(b.timestamp || 0).getTime();
        return tb - ta;
      });
      setSessions(all);

      const activeId = localStorage.getItem(activeKey);
      setCurrentSessionId(activeId);
    } catch (e) {
      console.error('Error loading sessions in Navbar:', e);
    }
  };

  useEffect(() => {
    loadTutorSessions();
    setHistoryDropdownOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleStateUpdate = (e) => {
      const { currentSessionId: eventSid, textSessions, type } = e.detail;
      const expectedType = isGeneralTutor ? 'general-tutor' : 'coding-tutor';
      if (type !== expectedType) return;

      const all = [...(textSessions || [])];
      all.sort((a, b) => {
        const ta = new Date(a.timestamp || 0).getTime();
        const tb = new Date(b.timestamp || 0).getTime();
        return tb - ta;
      });
      setSessions(all);
      setCurrentSessionId(eventSid);
    };

    window.addEventListener('tutor-state-update', handleStateUpdate);
    return () => {
      window.removeEventListener('tutor-state-update', handleStateUpdate);
    };
  }, [isGeneralTutor, isCodingTutor]);

  const handleSelectSession = (session) => {
    const eventName = isGeneralTutor ? 'select-general-tutor-session' : 'select-coding-tutor-session';
    window.dispatchEvent(new CustomEvent(eventName, { detail: session }));
    setHistoryDropdownOpen(false);
  };

  const handleNewSession = () => {
    const eventName = isGeneralTutor ? 'new-general-tutor-session' : 'new-coding-tutor-session';
    window.dispatchEvent(new Event(eventName));
    setHistoryDropdownOpen(false);
  };

  const isActive = (navId) => {
    return pathname.startsWith(navId);
  };

  // ── Mobile: fixed top bar ──
  if (isMobile) {
    return (
      <MobileNav
        title="VEDIKA"
        accent={T.accent}
        items={[
          ...NAV.map(({ id, Icon, label }) => ({
            href: id, Icon, label,
          })),
          {
            label: 'Log Out',
            Icon: LogOut,
            onClick: () => {
              localStorage.removeItem('frappe_user');
              localStorage.removeItem('frappe_sid');
              window.location.href = '/login';
            }
          }
        ]}
      />
    );
  }

  // ── Desktop: Top Navbar ──
  return (
    <header style={{
      width: '100%',
      height: 64,
      background: T.s1,
      borderBottom: `1px solid ${T.border}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      backdropFilter: 'blur(12px)',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
      fontFamily: 'var(--font-outfit), sans-serif'
    }}>
      {/* Brand Header */}
      <div 
        onClick={() => router.push('/')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          cursor: 'pointer',
          userSelect: 'none'
        }}
      >
        <div style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: `${T.accent}22`,
          border: `1px solid ${T.accent}40`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Zap size={18} color={T.accent} />
        </div>
        <div>
          <div style={{ color: T.text, fontWeight: 800, fontSize: 16, letterSpacing: '-0.02em' }}>VEDIKA</div>
          <div style={{ color: T.muted, fontSize: 11, fontWeight: 500 }}>Learning Platform</div>
        </div>
      </div>

      {/* Center Nav Items */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {NAV.map(({ id, Icon, label }) => {
          const active = isActive(id);
          return (
            <button
              key={id}
              onClick={() => router.push(id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 16px',
                borderRadius: 10,
                background: active ? `${T.accent}18` : 'transparent',
                border: active ? `1px solid ${T.accent}30` : '1px solid transparent',
                color: active ? T.accent : T.muted,
                cursor: 'pointer',
                fontSize: 13.5,
                fontWeight: active ? 700 : 500,
                letterSpacing: '-0.01em',
                transition: 'all 0.15s ease',
                fontFamily: 'inherit'
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.color = T.text;
                  e.currentTarget.style.background = `${T.accent}08`;
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.color = T.muted;
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <Icon size={16} />
              <span>{label}</span>
            </button>
          );
        })}

        {/* Tutor History Dropdown (if on Ask Vedika / Code with Vedika) */}
        {isTutorPage && (
          <div style={{ position: 'relative', marginLeft: 8 }}>
            <button
              onClick={() => setHistoryDropdownOpen(!historyDropdownOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 10,
                background: `${T.accent}12`,
                border: `1px solid ${T.accent}30`,
                color: T.accent,
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600
              }}
            >
              {isGeneralTutor ? <Brain size={15} /> : <Code2 size={15} />}
              <span>History</span>
              <ChevronDown size={14} style={{ transform: historyDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
            </button>

            {historyDropdownOpen && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: 8,
                width: 260,
                maxHeight: 320,
                overflowY: 'auto',
                background: T.s1,
                border: `1px solid ${T.border}`,
                borderRadius: 12,
                boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                padding: 8,
                zIndex: 1010
              }}>
                <button
                  onClick={handleNewSession}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: `1px dashed ${T.border}`,
                    background: 'transparent',
                    color: T.accent,
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    marginBottom: 8
                  }}
                >
                  <Plus size={14} />
                  <span>New Chat Session</span>
                </button>

                {sessions.map((session) => {
                  const active = session.id === currentSessionId;
                  return (
                    <button
                      key={session.id}
                      onClick={() => handleSelectSession(session)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: 8,
                        border: 'none',
                        background: active ? `${T.accent}18` : 'transparent',
                        color: active ? T.accent : T.text,
                        cursor: 'pointer',
                        fontSize: 12,
                        textAlign: 'left',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: 'block',
                        marginBottom: 2
                      }}
                    >
                      {session.label || 'Untitled Session'}
                    </button>
                  );
                })}
                {sessions.length === 0 && (
                  <div style={{ color: T.muted, fontSize: 12, textAlign: 'center', padding: '12px 0' }}>
                    No session history yet
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Theme Switcher */}
        <button
          onClick={() => setTheme(getTheme() === 'dark' ? 'light' : 'dark')}
          style={{
            background: `${T.accent}12`,
            border: `1px solid ${T.border}`,
            color: T.muted,
            cursor: 'pointer',
            padding: '7px 10px',
            display: 'flex',
            alignItems: 'center',
            borderRadius: 8,
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = T.accent; e.currentTarget.style.background = `${T.accent}22`; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = T.muted; e.currentTarget.style.background = `${T.accent}12`; }}
          title={`Switch to ${getTheme() === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {getTheme() === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* User Profile & Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: `${T.purple}30`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            color: T.purple,
            fontWeight: 700
          }}>
            {getInitials(user?.name)}
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{user?.name || 'Student'}</span>
          <button
            onClick={() => {
              localStorage.removeItem('frappe_user');
              window.location.href = '/login';
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: T.muted,
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              borderRadius: 4,
              transition: 'all 0.2s',
              marginLeft: 4
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = T.red; e.currentTarget.style.background = 'rgba(245, 91, 107, 0.08)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = T.muted; e.currentTarget.style.background = 'transparent'; }}
            title="Log Out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
