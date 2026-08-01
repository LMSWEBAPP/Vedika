'use client';

import { useState, useEffect, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  BookOpen, Brain, Code2, BarChart3, Home, Zap, LogOut, Briefcase, Award, FileText, FolderOpen, Sun, Moon,
  ChevronLeft, ChevronRight, ChevronDown, Plus, FlaskConical, Dna, Atom
} from 'lucide-react';
import { T, getTheme, setTheme } from '@/lib/lms-data';
import { useMediaQuery, isMobileMQ } from '@/lib/useMediaQuery';
import MobileNav from './MobileNav';

const NAV = [
  { id: '/',              Icon: Home,          label: 'Dashboard'     },
  { id: '/courses',       Icon: BookOpen,      label: 'Courses'       },
  { id: '/vedika-ai',     Icon: Brain,         label: 'Vedika AI'     },
  { id: '/viva-interview',Icon: FileText,      label: 'Viva & Interview' },
  { id: '/vedika-labs',   Icon: FlaskConical,  label: 'Vedika Labs'   },
  { id: '/jobs',          Icon: Briefcase,     label: 'Jobs'          },
  { id: '/progress',      Icon: BarChart3,     label: 'Progress'      },
];

export default function Sidebar({ isCollapsed = false, onToggleCollapse }) {
  const pathname = usePathname();
  const router   = useRouter();
  const isMobile = useMediaQuery(isMobileMQ);
  const isGeneralTutor = pathname.startsWith('/vedika-ai/ask');
  const isCodingTutor = pathname.startsWith('/vedika-ai/code');
  const isTutorPage = isGeneralTutor || isCodingTutor;

  const [user, setUser] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);

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
    if (!name) return 'S';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  // Group date labels for history
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

  // Load tutor session history initially or on route changes
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
      console.error('Error loading sessions in Sidebar:', e);
    }
  };

  useEffect(() => {
    loadTutorSessions();
    setDropdownOpen(false); // Reset dropdown on navigate
  }, [pathname]);

  // Synchronize tutor state on custom event update from GeneralTutor / CodingTutor
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
  };

  const handleNewSession = () => {
    const eventName = isGeneralTutor ? 'new-general-tutor-session' : 'new-coding-tutor-session';
    window.dispatchEvent(new Event(eventName));
  };

  const groupedSessions = useMemo(() => {
    const groups = {};
    for (const session of sessions) {
      const label = getDateLabel(session.timestamp || session.startedAt);
      if (!groups[label]) groups[label] = [];
      groups[label].push(session);
    }
    return groups;
  }, [sessions]);

  const orderedGroups = ['Today', 'Yesterday', 'This Week', 'Older'];

  // Inject padding so content clears the fixed MobileNav top bar
  useEffect(() => {
    if (isMobile && !isTutorPage) {
      const el = document.createElement('style');
      el.id = 'sidebar-mobile-pad';
      el.textContent = '.sidebar-content-area { padding-top: 48px !important; }';
      document.head.appendChild(el);
      return () => { document.getElementById('sidebar-mobile-pad')?.remove(); };
    }
  }, [isMobile, isTutorPage]);

  if (isMobile && isTutorPage) return null;

  const isActive = (navId) => {
    if (navId === '/') return pathname === '/';
    return pathname.startsWith(navId);
  };

  // ── Mobile: fixed top bar + centered menu ──
  if (isMobile) {
    return (
      <MobileNav
        title="AI TUTOR"
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

  // ── Desktop: vertical sidebar ──
  return (
    <div style={{
      width: isCollapsed ? 70 : 220,
      height: '100vh',
      maxHeight: '100vh',
      background: T.s1,
      borderRight: `1px solid ${T.border}`,
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 0',
      flexShrink: 0,
      position: 'relative',
      transition: 'width 0.2s ease',
      overflow: 'visible'
    }}>
      {/* Floating Toggle Button */}
      <button
        onClick={onToggleCollapse}
        style={{
          position: 'absolute',
          top: 30,
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
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          zIndex: 100,
          transition: 'all 0.2s'
        }}
        onMouseEnter={e => e.currentTarget.style.color = T.accent}
        onMouseLeave={e => e.currentTarget.style.color = T.muted}
        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Brand Header */}
      <div style={{ padding: isCollapsed ? '0 0 16px' : '0 20px 28px', borderBottom: `1px solid ${T.border}`, marginBottom: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: isCollapsed ? 'center' : 'flex-start', width: '100%' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${T.accent}22`, border: `1px solid ${T.accent}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Zap size={18} color={T.accent} />
            </div>
            {!isCollapsed && (
              <div>
                <div style={{ color: T.text, fontWeight: 700, fontSize: 15, letterSpacing: '-0.02em' }}>AI TUTOR</div>
                <div style={{ color: T.muted, fontSize: 11 }}>Learning Platform</div>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <button
              onClick={() => setTheme(getTheme() === 'dark' ? 'light' : 'dark')}
              style={{
                background: 'transparent',
                border: 'none',
                color: T.muted,
                cursor: 'pointer',
                padding: 6,
                display: 'flex',
                alignItems: 'center',
                borderRadius: 8,
                transition: 'all 0.2s',
                background: `${T.accent}12`,
                border: `1px solid ${T.border}`
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = T.accent; e.currentTarget.style.background = `${T.accent}22`; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = T.muted; e.currentTarget.style.background = `${T.accent}12`; }}
              title={`Switch to ${getTheme() === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {getTheme() === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          )}
        </div>
        {isCollapsed && (
          <button
            onClick={() => setTheme(getTheme() === 'dark' ? 'light' : 'dark')}
            style={{
              background: 'transparent',
              border: 'none',
              color: T.muted,
              cursor: 'pointer',
              padding: 6,
              display: 'flex',
              alignItems: 'center',
              borderRadius: 8,
              transition: 'all 0.2s',
              background: `${T.accent}12`,
              border: `1px solid ${T.border}`,
              marginTop: 10
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = T.accent; e.currentTarget.style.background = `${T.accent}22`; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = T.muted; e.currentTarget.style.background = `${T.accent}12`; }}
            title={`Switch to ${getTheme() === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {getTheme() === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        )}
      </div>

      {/* Nav Menu */}
      <div 
        className="no-scrollbar"
        style={{ 
          flex: 1, 
          padding: '0 12px', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: isCollapsed ? 'center' : 'stretch', 
          overflowY: 'auto',
          msOverflowStyle: 'none',
          scrollbarWidth: 'none'
        }}
      >
        {isTutorPage ? (
          <>
            {isCollapsed ? (
              <button
                onClick={onToggleCollapse}
                style={{
                  width: 42,
                  height: 42,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 9,
                  background: `${T.accent}18`,
                  border: `1px solid ${T.accent}30`,
                  color: T.accent,
                  cursor: 'pointer',
                  marginBottom: 10,
                  transition: 'all 0.2s',
                  flexShrink: 0,
                }}
                title={`Expand for ${isGeneralTutor ? 'Ask your AI Tutor' : 'Code With AI Tutor'}`}
              >
                {isGeneralTutor ? <Brain size={16} /> : <Code2 size={16} />}
              </button>
            ) : (
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 13px',
                  borderRadius: 9,
                  background: `${T.accent}12`,
                  border: `1px solid ${T.accent}30`,
                  color: T.accent,
                  cursor: 'pointer',
                  fontSize: 13.5,
                  fontWeight: 600,
                  letterSpacing: '-0.01em',
                  transition: 'all 0.2s',
                  fontFamily: 'inherit',
                  marginBottom: dropdownOpen ? 4 : 8,
                  flexShrink: 0,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                  {isGeneralTutor ? <Brain size={16} /> : <Code2 size={16} />}
                  <span>{isGeneralTutor ? 'Ask your AI Tutor' : 'Code with AI Tutor'}</span>
                </div>
                <ChevronDown
                  size={14}
                  style={{
                    transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                />
              </button>
            )}

            {/* Dropdown Items (Animate height & opacity) */}
            {!isCollapsed && (
              <div style={{
                maxHeight: dropdownOpen ? '420px' : '0px',
                opacity: dropdownOpen ? 1 : 0,
                overflow: 'hidden',
                transition: 'max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease, margin 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                marginTop: dropdownOpen ? 4 : 0,
                marginBottom: dropdownOpen ? 12 : 0,
                paddingBottom: dropdownOpen ? 12 : 0,
                borderBottom: dropdownOpen ? `1px solid ${T.border}` : 'none',
                flexShrink: 0,
              }}>
                {NAV.map(({ id, Icon, label }) => {
                  const active = isActive(id);
                  return (
                    <button
                      key={id}
                      onClick={() => {
                        router.push(id);
                        setDropdownOpen(false);
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 11,
                        padding: '9px 13px',
                        borderRadius: 8,
                        background: active ? `${T.accent}12` : 'transparent',
                        border: 'none',
                        color: active ? T.accent : T.muted,
                        cursor: 'pointer',
                        fontSize: 13,
                        fontWeight: active ? 600 : 400,
                        textAlign: 'left',
                        fontFamily: 'inherit',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { if (!active) e.currentTarget.style.background = T.s2; }}
                      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <Icon size={15} />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Tutor Session History */}
            {isCollapsed ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center', marginTop: 16, flexShrink: 0 }}>
                <button
                  onClick={handleNewSession}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    border: `1px dashed ${T.border}`,
                    background: 'transparent',
                    color: T.muted,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  title="New Chat"
                >
                  <Plus size={14} />
                </button>
                {sessions.map((session) => {
                  const isActive = session.id === currentSessionId;
                  const isVoice = session.messages?.some(m => m.isVoice || m.sender === 'student') || session.type === 'voice';
                  return (
                    <button
                      key={'session-' + session.id}
                      onClick={() => handleSelectSession(session)}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        border: 'none',
                        background: isActive ? `${T.accent}15` : 'transparent',
                        color: isActive ? T.text : T.muted,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s',
                      }}
                      title={session.label || 'Untitled'}
                    >
                      <span style={{
                        width: 20,
                        height: 20,
                        borderRadius: 6,
                        background: isVoice ? `${T.accent}20` : `${T.purple}20`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        {isVoice ? <Zap size={11} color={T.accent} /> : <Brain size={11} color={T.purple} />}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <>
                {/* "+ New Chat" Button */}
                <button
                  onClick={handleNewSession}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: `1px dashed ${T.border}`,
                    background: 'transparent',
                    color: T.muted,
                    fontSize: 12.5,
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    marginTop: 8,
                    marginBottom: 16,
                    transition: 'all 0.2s',
                    fontFamily: 'inherit',
                    flexShrink: 0,
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = T.accent;
                    e.currentTarget.style.color = T.accent;
                    e.currentTarget.style.background = `${T.accent}05`;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = T.border;
                    e.currentTarget.style.color = T.muted;
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <Plus size={14} />
                  <span>New Chat</span>
                </button>

                {/* History List */}
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                  {orderedGroups.map((group) => {
                    const items = groupedSessions[group];
                    if (!items || items.length === 0) return null;
                    return (
                      <div key={group} style={{ marginBottom: 14 }}>
                        <div style={{
                          fontSize: 9.5,
                          color: T.dim,
                          fontWeight: 700,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          padding: '0 6px',
                          marginBottom: 6,
                        }}>
                          {group}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          {items.map((session) => {
                            const isActive = session.id === currentSessionId;
                            const isVoice = session.messages?.some(m => m.isVoice || m.sender === 'student') || session.type === 'voice';
                            return (
                              <button
                                key={'session-' + session.id}
                                onClick={() => handleSelectSession(session)}
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
                                  gap: 8,
                                  textAlign: 'left',
                                  fontFamily: 'inherit',
                                  transition: 'all 0.15s',
                                }}
                                title={session.label || 'Untitled'}
                                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = T.s2; }}
                                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                              >
                                <span style={{
                                  width: 20,
                                  height: 20,
                                  borderRadius: 6,
                                  background: isVoice ? `${T.accent}20` : `${T.purple}20`,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                }}>
                                  {isVoice ? <Zap size={11} color={T.accent} /> : <Brain size={11} color={T.purple} />}
                                </span>
                                <span style={{
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  fontWeight: isActive ? 600 : 400,
                                  flex: 1,
                                }}>
                                  {session.label || 'Untitled'}
                                </span>
                                <span style={{ fontSize: 9, color: T.dim, flexShrink: 0 }}>
                                  {isVoice ? 'Voice/Text' : 'Text'}
                                  </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  {sessions.length === 0 && (
                    <div style={{ color: T.dim, fontSize: 11, textAlign: 'center', padding: '24px 0' }}>
                      No sessions yet
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        ) : (
          <>
            {NAV.map(({ id, Icon, label }) => {
              const active = isActive(id);
              return (
                <button key={id} onClick={() => router.push(id)} style={{
                  width: isCollapsed ? 42 : '100%',
                  height: isCollapsed ? 42 : 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: isCollapsed ? 'center' : 'flex-start',
                  gap: isCollapsed ? 0 : 11,
                  padding: isCollapsed ? '0' : '10px 13px',
                  borderRadius: 9,
                  marginBottom: 3,
                  background: active ? `${T.accent}18` : 'transparent',
                  border: active ? `1px solid ${T.accent}30` : '1px solid transparent',
                  color: active ? T.accent : T.muted,
                  cursor: 'pointer',
                  fontSize: 13.5,
                  fontWeight: active ? 600 : 400,
                  letterSpacing: '-0.01em',
                  transition: 'all 0.15s',
                  fontFamily: 'inherit',
                  flexShrink: 0,
                }}
                title={isCollapsed ? label : ""}
                >
                  <Icon size={16} />
                  {!isCollapsed && label}
                </button>
              );
            })}
          </>
        )}
      </div>

      {/* User Profile */}
      <div style={{ padding: '14px 12px', borderTop: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', alignItems: isCollapsed ? 'center' : 'stretch', gap: 10, flexShrink: 0 }}>
        <div style={{ display: 'flex', flexDirection: isCollapsed ? 'column' : 'row', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'space-between', width: '100%', gap: isCollapsed ? 12 : 9 }}>
          <div style={{ display: 'flex', flexDirection: isCollapsed ? 'column' : 'row', alignItems: 'center', gap: isCollapsed ? 6 : 9 }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: `${T.purple}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: T.purple, fontWeight: 700, flexShrink: 0 }}>
              {getInitials(user?.name)}
            </div>
            {!isCollapsed && (
              <div>
                <div style={{ color: T.text, fontSize: 13, fontWeight: 500 }}>{user?.name || 'Student'}</div>
                <div style={{ color: T.muted, fontSize: 11 }}>Free Plan</div>
              </div>
            )}
          </div>
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
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = T.red; e.currentTarget.style.background = 'rgba(245, 91, 107, 0.08)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = T.muted; e.currentTarget.style.background = 'transparent'; }}
            title="Log Out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
