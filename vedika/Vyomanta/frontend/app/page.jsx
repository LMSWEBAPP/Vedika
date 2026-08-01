'use client';

import { useState } from 'react';
import Dashboard from '@/components/Dashboard';

export default function HomePage() {
  const [completed, setCompleted] = useState({});
  return <Dashboard completed={completed} />;
}
