'use client';

import { useState } from 'react';
import Dashboard from '@/components/Dashboard';

/**
 * Preserved original dashboard home page.
 * Kept as a dummy/temp page until its background and widgets are repurposed.
 */
export default function TempHomePage() {
  const [completed, setCompleted] = useState({});
  return <Dashboard completed={completed} />;
}
