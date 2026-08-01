'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home, Search, Bell, BookOpen, Layers, Users, Award,
  Briefcase, BarChart3, CheckSquare, FileText, Code2,
  Plus, HelpCircle, LogOut, Sun, Moon,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { T, getTheme, setTheme } from '@/lib/lms-data';
import { useMediaQuery, isMobileMQ } from '@/lib/useMediaQuery';

// Admin-specific navigation items
const NAV_ITEMS = [
  { id: '/admin',             Icon: Home,         label: 'Home' },
  { id: '/admin/search',      Icon: Search,       label: 'Search' },
  { id: '/admin/alerts',      Icon: Bell,         label: 'Notifications' },
  { id: '/admin/courses',     Icon: BookOpen,     label: 'Courses' },
  { id: '/admin/batches',     Icon: Users,        label: 'Batches' },
  { id: '/admin/certs',       Icon: Award,        label: 'Certifications' },
  { id: '/admin/jobs',        Icon: Briefcase,    label: 'Jobs' },
  { id: '/admin/statistics',  Icon: BarChart3,    label: 'Statistics' },
  { id: '/admin/quizzes',     Icon: CheckSquare,  label: 'Quizzes' },
  { id: '/admin/assignments', Icon: FileText,    label: 'Assignments' },
  { id: '/admin/code-ex',     Icon: Code2,        label: 'Programming Exercises', disabled: true },
];

export default function AdminSidebar({ isCollapsed = false, onToggleCollapse }) {
  const pathname = usePathname();
  const router = useRouter();
  const isMobile = useMediaQuery(isMobileMQ);

  const handleLogout = () => {
    localStorage.removeItem('frappe_user');
    router.replace('/login');
  };

  const isActive = (navId) => {
    if (navId === '/admin') return pathname === '/admin';
    return pathname.startsWith(navId);
  };

  const navigateTo = (navId, disabled) => {
    if (disabled) return;
    router.push(navId);
  };

  // ── Mobile layout top menu ──
  if (isMobile) {
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 48,
        background: T.s1, borderBottom: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={() => router.push('/admin')}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: `${T.purple}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Layers size={14} color={T.purple} />
          </div>
          <span style={{ color: T.text, fontWeight: 700, fontSize: 14 }}>Learning Admin</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setTheme(getTheme() === 'dark' ? 'light' : 'dark')} style={{ background: 'transparent', border: 'none', color: T.muted, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            {getTheme() === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button onClick={handleLogout} style={{ background: 'transparent', border: 'none', color: T.muted, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <LogOut size={16} />
          </button>
        </div>
      </div>
    );
  }

  // ── Desktop Sidebar ──
  return (
    <div style={{
      width: isCollapsed ? 70 : 240, minHeight: '100vh', background: T.s1,
      borderRight: `1px solid ${T.border}`, display: 'flex',
      flexDirection: 'column', padding: '20px 0', flexShrink: 0,
      position: 'relative', transition: 'width 0.2s ease'
    }}>
      {/* Floating Toggle Button */}
      <button
        onClick={onToggleCollapse}
        style={{
          position: 'absolute',
          top: 26,
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
        onMouseEnter={e => e.currentTarget.style.color = T.purple}
        onMouseLeave={e => e.currentTarget.style.color = T.muted}
        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Brand Header */}
      <div style={{ padding: isCollapsed ? '0 0 12px' : '0 20px 16px', borderBottom: `1px solid ${T.border}`, marginBottom: 12, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: isCollapsed ? 'center' : 'flex-start', width: '100%' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${T.purple}22`, border: `1px solid ${T.purple}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Layers size={18} color={T.purple} />
            </div>
            {!isCollapsed && (
              <div>
                <div style={{ color: T.text, fontWeight: 700, fontSize: 15, letterSpacing: '-0.02em' }}>Learning</div>
                <div style={{ color: T.muted, fontSize: 11 }}>Admin Portal</div>
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
                background: `${T.purple}12`,
                border: `1px solid ${T.border}`
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = T.purple; e.currentTarget.style.background = `${T.purple}22`; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = T.muted; e.currentTarget.style.background = `${T.purple}12`; }}
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
              background: `${T.purple}12`,
              border: `1px solid ${T.border}`,
              marginTop: 10
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = T.purple; e.currentTarget.style.background = `${T.purple}22`; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = T.muted; e.currentTarget.style.background = `${T.purple}12`; }}
            title={`Switch to ${getTheme() === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {getTheme() === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        )}
      </div>

      {/* Nav Menu */}
      <div style={{ padding: '0 12px', display: 'flex', flexDirection: 'column', alignItems: isCollapsed ? 'center' : 'stretch', gap: 2 }}>
        {NAV_ITEMS.map(({ id, Icon, label, disabled }) => {
          const active = isActive(id);
          return (
            <button
              key={id}
              onClick={() => navigateTo(id, disabled)}
              style={{
                width: isCollapsed ? 42 : '100%',
                height: isCollapsed ? 42 : 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                gap: isCollapsed ? 0 : 11,
                padding: isCollapsed ? '0' : '9px 12px',
                borderRadius: 8,
                background: active ? `${T.purple}15` : 'transparent',
                border: 'none',
                color: active ? T.purple : disabled ? T.dim : T.muted,
                cursor: disabled ? 'not-allowed' : 'pointer',
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                textAlign: 'left',
                transition: 'all 0.15s',
                fontFamily: 'inherit',
                opacity: disabled ? 0.6 : 1
              }}
              title={disabled ? "Feature coming soon" : isCollapsed ? label : ""}
            >
              <Icon size={15} color={active ? T.purple : disabled ? T.dim : T.muted} />
              {!isCollapsed && <span>{label}</span>}
              {!isCollapsed && disabled && (
                <span style={{ fontSize: 9, background: T.s3, color: T.dim, padding: '1px 5px', borderRadius: 4, marginLeft: 'auto' }}>
                  Soon
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Sidebar spacer */}
      <div style={{ flex: 1 }} />

      {/* Administrator Profile Card (Direct Log Out) */}
      <div style={{ padding: '14px 12px', borderTop: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', alignItems: isCollapsed ? 'center' : 'stretch', gap: 10 }}>
        <div style={{ display: 'flex', flexDirection: isCollapsed ? 'column' : 'row', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'space-between', width: '100%', gap: isCollapsed ? 12 : 9 }}>
          <div style={{ display: 'flex', flexDirection: isCollapsed ? 'column' : 'row', alignItems: 'center', gap: isCollapsed ? 6 : 9 }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%', background: `${T.purple}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, color: T.purple, fontWeight: 700, flexShrink: 0
            }}>
              AD
            </div>
            {!isCollapsed && (
              <div>
                <div style={{ color: T.text, fontSize: 13, fontWeight: 500 }}>Hey, Admin 👋</div>
                <div style={{ color: T.muted, fontSize: 11 }}>Owner / Admin</div>
              </div>
            )}
          </div>
          
          <button 
            onClick={handleLogout}
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

      {/* Help Footer */}
      {!isCollapsed ? (
        <div style={{ padding: '12px 18px 0', borderTop: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={() => alert('Support portal is under construction.')}
            style={{
              background: 'transparent', border: 'none', color: T.muted, display: 'flex',
              alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer', padding: 0
            }}
          >
            <HelpCircle size={14} /> Help
          </button>
          <span style={{ color: T.dim, fontSize: 10 }}>v1.0.0</span>
        </div>
      ) : (
        <div style={{ padding: '12px 0 0', borderTop: `1px solid ${T.border}`, display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={() => alert('Support portal is under construction.')}
            style={{
              background: 'transparent', border: 'none', color: T.muted, display: 'flex',
              alignItems: 'center', cursor: 'pointer', padding: 4
            }}
            title="Help & Support (v1.0.0)"
          >
            <HelpCircle size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
