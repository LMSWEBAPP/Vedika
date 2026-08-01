'use client';

import { useState, useEffect } from 'react';
import { Bell, MailOpen, Trash2, GraduationCap, CheckSquare, FileText, Terminal, CheckCircle2 } from 'lucide-react';
import { T } from '@/lib/lms-data';
import { useMediaQuery, isMobileMQ } from '@/lib/useMediaQuery';
import { getNotifications, markNotificationRead, clearAllNotifications } from '@/lib/frappe';

export default function AdminAlertsPage() {
  const isMobile = useMediaQuery(isMobileMQ);
  const [notifications, setNotifications] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);

  const loadNotifications = () => {
    setLoading(true);
    getNotifications().then(data => {
      setNotifications(data);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkRead = async (id) => {
    const success = await markNotificationRead(id);
    if (success) {
      loadNotifications();
    }
  };

  const handleClearAll = async () => {
    if (confirm('Are you sure you want to mark all notifications as read?')) {
      const success = await clearAllNotifications();
      if (success) {
        loadNotifications();
      }
    }
  };

  // Filter list
  const filteredAlerts = notifications.filter(alert => {
    return selectedCategory === 'All' || alert.category === selectedCategory;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const categories = ['All', 'Enrollment', 'Assignment', 'Quiz', 'System'];

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Enrollment': return <GraduationCap size={15} color={T.purple} />;
      case 'Assignment': return <FileText size={15} color={T.accent} />;
      case 'Quiz': return <CheckSquare size={15} color={T.green} />;
      default: return <Terminal size={15} color={T.muted} />;
    }
  };

  const containerPadding = isMobile ? '70px 16px 32px 16px' : '40px';

  return (
    <div style={{
      padding: containerPadding,
      maxWidth: 900,
      margin: '0 auto',
      fontFamily: 'var(--font-outfit), sans-serif'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24
      }}>
        <div>
          <h1 style={{ color: T.text, fontSize: isMobile ? 22 : 28, fontWeight: 700, margin: 0, letterSpacing: '-0.04em' }}>Notifications</h1>
          <p style={{ color: T.muted, fontSize: 13.5, margin: '4px 0 0' }}>Monitor student enrollments, assignment submissions, quiz results, and alerts.</p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleClearAll}
            style={{
              background: 'transparent',
              color: T.purple,
              border: `1px solid ${T.border}`,
              padding: '8px 14px',
              borderRadius: 8,
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = `${T.purple}10`}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <MailOpen size={15} /> Mark all read
          </button>
        )}
      </div>

      {/* Tabs / Filter Panel */}
      <div style={{
        display: 'flex',
        gap: 8,
        overflowX: 'auto',
        paddingBottom: 4,
        marginBottom: 20
      }}>
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                background: isSelected ? T.purple : T.s1,
                color: isSelected ? '#fff' : T.muted,
                border: `1px solid ${isSelected ? T.purple : T.border}`,
                padding: '8px 16px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap'
              }}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Notifications Container */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '64px 0' }}>
          <div style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            border: `2px solid ${T.border}`,
            borderTopColor: T.purple,
            animation: 'spin 1s linear infinite'
          }} />
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div style={{
          background: T.s1,
          border: `1px solid ${T.border}`,
          borderRadius: 14,
          padding: '64px 20px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Bell size={48} color={T.muted} style={{ marginBottom: 16 }} />
          <h3 style={{ color: T.text, fontSize: 16, margin: '0 0 6px 0' }}>No notifications</h3>
          <p style={{ color: T.muted, fontSize: 13, maxWidth: 280, margin: 0, lineHeight: 1.5 }}>
            You have no notifications in category "{selectedCategory}" at this time.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredAlerts.map((alert) => {
            const isUnread = !alert.read;
            return (
              <div
                key={alert.id}
                style={{
                  background: isUnread ? `rgba(155, 110, 248, 0.03)` : T.s1,
                  border: `1px solid ${isUnread ? T.purple : T.border}`,
                  borderRadius: 12,
                  padding: 16,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 16,
                  transition: 'background 0.2s'
                }}
              >
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  {/* Category Indicator Icon */}
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: isUnread ? `${T.purple}12` : T.s2,
                    border: `1px solid ${isUnread ? `${T.purple}20` : T.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: 2
                  }}>
                    {getCategoryIcon(alert.category)}
                  </div>

                  {/* Body Content */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ color: T.text, fontSize: 13.5, fontWeight: 700 }}>
                        {alert.title}
                      </span>
                      {isUnread && (
                        <span style={{
                          display: 'inline-block',
                          width: 6,
                          height: 6,
                          background: T.purple,
                          borderRadius: '50%'
                        }} />
                      )}
                    </div>
                    <p style={{ color: T.muted, fontSize: 12.5, margin: '4px 0 0', lineHeight: 1.4 }}>
                      {alert.message}
                    </p>
                    <span style={{ color: T.dim, fontSize: 11, display: 'inline-block', marginTop: 6 }}>
                      {alert.date}
                    </span>
                  </div>
                </div>

                {/* Mark as read checkbox or action */}
                {isUnread && (
                  <button
                    onClick={() => handleMarkRead(alert.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: T.muted,
                      cursor: 'pointer',
                      padding: 6,
                      borderRadius: 6,
                      display: 'flex',
                      alignItems: 'center',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = T.purple;
                      e.currentTarget.style.background = `${T.purple}15`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = T.muted;
                      e.currentTarget.style.background = 'transparent';
                    }}
                    title="Mark as read"
                  >
                    <CheckCircle2 size={16} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
