'use client';

import { useState, useEffect } from 'react';
import CoursePage from '@/components/CoursePage';
import StudentQuizzesPage from '../quizzes/page';
import StudentAssignmentsPage from '../assignments/page';
import ResourcesPage from '../resources/page';
import { T } from '@/lib/lms-data';
import { BookOpen, Award, FileText, FolderOpen } from 'lucide-react';

export default function CoursesRoute() {
  const [activeTab, setActiveTab] = useState('explore'); // explore, quizzes, assignments, resources
  const [completed, setCompleted] = useState({});

  const tabs = [
    { id: 'explore', label: 'Explore Courses', Icon: BookOpen },
    { id: 'quizzes', label: 'Quizzes', Icon: Award },
    { id: 'assignments', label: 'Assignments', Icon: FileText },
    { id: 'resources', label: 'Resources Hub', Icon: FolderOpen },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'explore':
        return <CoursePage completed={completed} />;
      case 'quizzes':
        return <StudentQuizzesPage />;
      case 'assignments':
        return <StudentAssignmentsPage />;
      case 'resources':
        return <ResourcesPage />;
      default:
        return <CoursePage completed={completed} />;
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      color: T.text,
      width: '100%',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* HTML tabs header */}
      <div style={{
        background: T.s1,
        borderBottom: `1px solid ${T.border}`,
        padding: '16px 24px 0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: 8,
        flexWrap: 'wrap'
      }}>
        {tabs.map(({ id, label, Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 18px',
                border: 'none',
                background: 'transparent',
                color: active ? T.accent : T.muted,
                fontSize: 14,
                fontWeight: active ? 600 : 500,
                cursor: 'pointer',
                borderBottom: `2px solid ${active ? T.accent : 'transparent'}`,
                transition: 'all 0.2s ease',
                fontFamily: 'var(--font-outfit), sans-serif',
                marginBottom: '-1px'
              }}
            >
              <Icon size={16} />
              {label}
            </button>
          );
        })}
      </div>

      {/* Tab content view */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {renderTabContent()}
      </div>
    </div>
  );
}
