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
      minHeight: '100vh',
      background: 'var(--bg)',
      color: T.text,
      width: '100%',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Tab content view */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
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
