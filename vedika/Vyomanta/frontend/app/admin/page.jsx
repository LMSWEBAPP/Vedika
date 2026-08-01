'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Users, BarChart3, Plus, ArrowRight, Layers, ShieldCheck, FileText, CheckSquare } from 'lucide-react';
import { T } from '@/lib/lms-data';
import { useMediaQuery, isMobileMQ } from '@/lib/useMediaQuery';
import { getCourses, getBatches, getNotifications, getCertificates } from '@/lib/frappe';

export default function AdminHomePage() {
  const router = useRouter();
  const isMobile = useMediaQuery(isMobileMQ);
  
  // Dashboard state
  const [courseCount, setCourseCount] = useState(0);
  const [batchCount, setBatchCount] = useState(0);
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);
  const [certCount, setCertCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getCourses().catch(() => []),
      getBatches().catch(() => []),
      getNotifications().catch(() => []),
      getCertificates().catch(() => [])
    ]).then(([courses, batches, alerts, certs]) => {
      setCourseCount(courses.length);
      setBatchCount(batches.length);
      setUnreadAlertCount(alerts.filter(a => !a.read).length);
      setCertCount(certs.length);
      setLoading(false);
    });
  }, []);

  const containerPadding = isMobile ? '70px 16px 32px 16px' : '40px';

  const shortcuts = [
    { title: 'Courses Curriculum', desc: 'Create, modify structure, and upload CSV syllabus.', count: courseCount, route: '/admin/courses', color: T.accent, Icon: BookOpen },
    { title: 'Cohort Batches', desc: 'Manage batches, student groups, and lesson access.', count: batchCount, route: '/admin/batches', color: T.purple, Icon: Users },
    { title: 'Certifications', desc: 'Review issued awards and completion criteria.', count: certCount, route: '/admin/certs', color: T.green, Icon: ShieldCheck },
    { title: 'Analytics & Stats', desc: 'Check student registrations and completion rates.', count: null, route: '/admin/statistics', color: T.amber, Icon: BarChart3 }
  ];

  return (
    <div style={{
      padding: containerPadding,
      maxWidth: 1100,
      margin: '0 auto',
      fontFamily: 'var(--font-outfit), sans-serif'
    }}>
      {/* Header section */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 32
      }}>
        <div>
          <h1 style={{
            color: T.text,
            fontSize: isMobile ? 22 : 28,
            fontWeight: 700,
            margin: 0,
            letterSpacing: '-0.04em',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            Hey, Administrator 👋
          </h1>
          <p style={{ color: T.muted, fontSize: isMobile ? 13.5 : 14.5, marginTop: 4, margin: 0 }}>
            Manage your courses, cohort batches, and certifications in one place.
          </p>
        </div>

        <button
          onClick={() => router.push('/admin/courses')}
          style={{
            background: T.purple,
            color: '#fff',
            border: 'none',
            padding: '9px 16px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            boxShadow: '0 4px 12px rgba(155, 110, 248, 0.2)'
          }}
        >
          <Plus size={16} /> New Course
        </button>
      </div>

      {/* Stats Summary Alert Banner */}
      {unreadAlertCount > 0 && (
        <div 
          onClick={() => router.push('/admin/alerts')}
          style={{
            background: 'rgba(155, 110, 248, 0.05)',
            border: `1px solid rgba(155, 110, 248, 0.15)`,
            borderRadius: 12,
            padding: '14px 18px',
            marginBottom: 24,
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            transition: 'border-color 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = T.purple}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(155, 110, 248, 0.15)'}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: T.text }}>
            <span style={{ display: 'flex', width: 8, height: 8, background: T.purple, borderRadius: '50%' }} />
            <span>You have <strong>{unreadAlertCount}</strong> unread notifications and submissions waiting for review.</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12.5, color: T.purple, fontWeight: 600 }}>
            Review Alerts <ArrowRight size={14} />
          </div>
        </div>
      )}

      {/* Main Shortcut Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gap: 20,
        marginBottom: 32
      }}>
        {shortcuts.map((sc) => {
          const Icon = sc.Icon;
          return (
            <div
              key={sc.title}
              onClick={() => router.push(sc.route)}
              style={{
                background: T.s1,
                border: `1px solid ${T.border}`,
                borderRadius: 14,
                padding: 24,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = sc.color;
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = T.border;
                e.currentTarget.style.transform = 'none';
              }}
            >
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', maxWidth: '75%' }}>
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: `${sc.color}15`,
                  border: `1px solid ${sc.color}25`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Icon size={20} color={sc.color} />
                </div>
                <div>
                  <h3 style={{ color: T.text, fontSize: 15, fontWeight: 700, margin: 0 }}>
                    {sc.title}
                  </h3>
                  <p style={{ color: T.muted, fontSize: 12.5, margin: '6px 0 0', lineHeight: 1.4 }}>
                    {sc.desc}
                  </p>
                </div>
              </div>

              {sc.count !== null && (
                <div style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: sc.color,
                  letterSpacing: '-0.03em',
                  background: `${sc.color}08`,
                  padding: '4px 10px',
                  borderRadius: 8
                }}>
                  {loading ? '...' : sc.count}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick Info Board */}
      <div style={{
        background: T.s1,
        border: `1px solid ${T.border}`,
        borderRadius: 14,
        padding: 20,
        textAlign: 'center',
        color: T.muted,
        fontSize: 12.5
      }}>
        💡 Use the sidebar navigation on the left to jump between different panels like Quizzes, Assignments, and Jobs.
      </div>
    </div>
  );
}
