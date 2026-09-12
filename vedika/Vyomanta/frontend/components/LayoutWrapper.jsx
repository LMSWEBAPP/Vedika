'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import AdminSidebar from './AdminSidebar';
import { T } from '@/lib/lms-data';
import { useDesktopPetBridge } from '@/hooks/useDesktopPetBridge';
import { useMediaQuery, isMobileMQ } from '@/lib/useMediaQuery';

export default function LayoutWrapper({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const isMobile = useMediaQuery(isMobileMQ);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { sendStateUpdate } = useDesktopPetBridge();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (sendStateUpdate && pathname) {
      sendStateUpdate({ activeRoute: pathname });
    }
  }, [pathname, sendStateUpdate]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('sidebar_collapsed') === 'true';
      setSidebarCollapsed(stored);
    }
  }, []);

  const handleToggleCollapse = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebar_collapsed', String(newState));
    }
  };

  useEffect(() => {
    // Read the user object synchronously from localStorage
    const storedUser = localStorage.getItem('frappe_user');
    let currentUser = null;
    if (storedUser) {
      try {
        currentUser = JSON.parse(storedUser);
      } catch (e) {
        localStorage.removeItem('frappe_user');
      }
    }

    const KNOWN_PREFIXES = [
      '/', '/temp-home', '/login', '/login-avatar', '/users', '/admin', '/assignments', '/courses', 
      '/api', '/jobs', '/labs', '/lesson', '/presentation', '/progress', '/quizzes', 
      '/resources', '/vedika-ai', '/vedika-bot', '/vedika-chamber', '/vedika-labs', 
      '/viva-interview', '/coding-tutor', '/general-tutor', '/code-puzzle', 
      '/home-avatar', '/avatar-chamber', '/avatar-blob', '/2d-avatar-testing', '/auth', '/lost-avatars'
    ];
    const isKnown = KNOWN_PREFIXES.some(r => r === pathname || (r !== '/' && pathname.startsWith(r)));
    const isNotFound = (typeof window !== 'undefined' && window.__IS_NOT_FOUND__) || !isKnown;

    if (isNotFound) {
      setUser(currentUser);
      setLoading(false);
      return;
    }

    const isAuthPage = pathname === '/login' || pathname === '/login-avatar' || pathname === '/users' || pathname === '/admin/login' || pathname.startsWith('/auth') || pathname.startsWith('/vedika-bot') || pathname === '/home-avatar' || pathname === '/lost-avatars';

    if (!currentUser) {
      if (!isAuthPage) {
        // Redirect to unified login page if not logged in
        setUser(null);
        setLoading(true);
        router.replace('/login');
        return;
      }
    } else {
      // User is logged in
      if (pathname === '/users' || pathname === '/admin/login' || pathname === '/login') {
        // Redirect logged-in users away from auth pages
        setLoading(true);
        if (currentUser.role === 'Administrator') {
          router.replace('/admin');
        } else {
          router.replace('/');
        }
        return;
      } else {
        // Logged-in page validation
        if (currentUser.role === 'Administrator') {
          if (!pathname.startsWith('/admin')) {
            setLoading(true);
            router.replace('/admin');
          }
        } else {
          if (pathname.startsWith('/admin')) {
            setLoading(true);
            router.replace('/');
            return;
          }
        }
      }
    }

    // If no redirect is needed, set the local state and stop loading
    setUser(currentUser);
    setLoading(false);
  }, [pathname, router]);

  useEffect(() => {
    // Configure layout background dynamically matching theme
    const theme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', theme);
    document.body.style.backgroundColor = theme === 'dark' ? '#07080F' : '#F9FAFB';
  }, []);

  const KNOWN_ROUTES_LIST = [
    '/', '/temp-home', '/login', '/login-avatar', '/users', '/admin', '/assignments', '/courses', 
    '/api', '/jobs', '/labs', '/lesson', '/presentation', '/progress', '/quizzes', 
    '/resources', '/vedika-ai', '/vedika-bot', '/vedika-chamber', '/vedika-labs', 
    '/viva-interview', '/coding-tutor', '/general-tutor', '/code-puzzle', 
    '/home-avatar', '/avatar-chamber', '/avatar-blob', '/2d-avatar-testing', '/auth', '/lost-avatars'
  ];
  const isUnknown404 = !KNOWN_ROUTES_LIST.some(r => r === pathname || (r !== '/' && pathname.startsWith(r)));
  const isFullBleed = pathname === '/' || pathname === '/home-avatar' || pathname === '/login-avatar' || pathname === '/lost-avatars' || isUnknown404 || (typeof window !== 'undefined' && window.__IS_NOT_FOUND__);
  if (isFullBleed) {
    return <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>{children}</div>;
  }


  if (!mounted || loading) {
    return (
      <div style={{
        display: 'flex',
        width: '100vw',
        minWidth: '100vw',
        minHeight: '100vh',
        background: 'var(--bg)',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text)',
        fontFamily: 'var(--font-outfit), sans-serif',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 9999
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: '2px solid var(--border)',
            borderTopColor: 'var(--accent)',
            animation: 'spin 1s linear infinite'
          }} />
          <div style={{ fontSize: 14, color: 'var(--muted)' }}>Loading AI TUTOR Portal...</div>
        </div>
      </div>
    );
  }

  const isAuthPage = pathname === '/login' || pathname === '/login-avatar' || pathname === '/users' || pathname === '/admin/login' || pathname.startsWith('/auth') || pathname.startsWith('/vedika-bot') || pathname === '/home-avatar';

  // Auth pages (like /login) render directly without a sidebar
  if (isAuthPage || !user) {
    return <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>{children}</div>;
  }

  const isAdminRoute = pathname.startsWith('/admin');
  const layoutFlexDirection = isAdminRoute ? (isMobile ? 'column' : 'row') : 'column';

  const isFullscreenAppRoute =
    pathname.startsWith('/vedika-ai/ask') ||
    pathname.startsWith('/vedika-ai/code') ||
    pathname.startsWith('/vedika-ai/puzzle') ||
    pathname === '/general-tutor' ||
    pathname === '/code-puzzle' ||
    pathname.startsWith('/viva-interview') ||
    pathname.startsWith('/lesson') ||
    pathname.startsWith('/quizzes') ||
    pathname.startsWith('/assignments') ||
    pathname.startsWith('/courses');

  return (
    <div style={{
      display: 'flex',
      flexDirection: layoutFlexDirection,
      height: '100vh',
      maxHeight: '100dvh',
      overflow: 'hidden',
      background: 'var(--bg)',
      color: 'var(--text)',
      width: '100%'
    }}>
      {isAdminRoute ? (
        <AdminSidebar isCollapsed={sidebarCollapsed} onToggleCollapse={handleToggleCollapse} />
      ) : (
        <Sidebar />
      )}
      <div
        className="sidebar-content-area"
        style={{
          flex: 1,
          height: isAdminRoute ? '100%' : 'calc(100vh - 64px)',
          overflowY: isFullscreenAppRoute ? 'hidden' : 'auto',
          overflowX: 'hidden',
          width: '100%',
          minWidth: 0
        }}
      >
        {children}
      </div>
    </div>
  );
}
