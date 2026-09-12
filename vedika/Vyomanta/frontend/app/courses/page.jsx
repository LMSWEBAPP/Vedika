'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import CoursePage from '@/components/CoursePage';
import StudentQuizzesPage from '../quizzes/page';
import StudentAssignmentsPage from '../assignments/page';
import ResourcesPage from '../resources/page';
import { T } from '@/lib/lms-data';
import { BookOpen, Award, FileText, FolderOpen } from 'lucide-react';

function CoursesContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState('explore');
  const [completed, setCompleted] = useState({});

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

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
      height: '100%',
      maxHeight: '100%',
      background: 'var(--bg)',
      color: T.text,
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Tab content view */}
      <div
        className="no-scrollbar"
        style={{
          flex: 1,
          overflowY: (activeTab === 'quizzes' || activeTab === 'assignments') ? 'hidden' : 'auto',
          overflowX: 'hidden',
          height: '100%',
          maxHeight: '100%'
        }}
      >
        {renderTabContent()}
      </div>
    </div>
  );
}

export default function CoursesRoute() {
  return (
    <Suspense fallback={<div style={{ padding: 36, color: 'var(--muted)' }}>Loading Courses...</div>}>
      <CoursesContent />
    </Suspense>
  );
}
