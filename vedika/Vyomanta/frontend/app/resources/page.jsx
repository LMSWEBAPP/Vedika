'use client';

import { useState } from 'react';
import './resources.css';
import ResourcesHub from '@/components/ResourcesHub';
import ResourcesLibrary from '@/components/ResourcesLibrary';
import ResourcesCheatSheets from '@/components/ResourcesCheatSheets';
import ResourcesMarkdownCheatSheet from '@/components/ResourcesMarkdownCheatSheet';
import ResourcesDSA from '@/components/ResourcesDSA';
import ResourcesDSACompanyWise from '@/components/ResourcesDSACompanyWise';
import ResourcesDSAResources from '@/components/ResourcesDSAResources';

export default function ResourcesPage() {
  const [view, setView] = useState('home'); // 'home', 'library', 'cheatsheets', 'cheatsheet', 'dsa', 'dsa/company', 'dsa/resources'
  const [params, setParams] = useState({});

  const navigateTo = (newView, viewParams = {}) => {
    setView(newView);
    setParams(viewParams);
  };

  const renderView = () => {
    switch (view) {
      case 'home':
        return <ResourcesHub navigateTo={navigateTo} />;
      case 'library':
        return <ResourcesLibrary navigateTo={navigateTo} />;
      case 'cheatsheets':
        return <ResourcesCheatSheets navigateTo={navigateTo} />;
      case 'cheatsheet':
        return <ResourcesMarkdownCheatSheet navigateTo={navigateTo} cheatSheetId={params.id} />;
      case 'dsa':
        return <ResourcesDSA navigateTo={navigateTo} />;
      case 'dsa/company':
        return <ResourcesDSACompanyWise navigateTo={navigateTo} />;
      case 'dsa/resources':
        return <ResourcesDSAResources navigateTo={navigateTo} />;
      default:
        return <ResourcesHub navigateTo={navigateTo} />;
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      width: '100%',
      overflowY: 'auto'
    }}>
      {renderView()}
    </div>
  );
}
