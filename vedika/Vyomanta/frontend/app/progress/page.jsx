'use client';

import { useState, useEffect } from 'react';
import ProgressPage from '@/components/ProgressPage';
import { saveProgressToRedis, getProgressFromRedis } from '@/lib/frappe';

export default function ProgressRoute() {
  const [completed, setCompleted] = useState({});

  useEffect(() => {
    let key = 'completed_lessons';
    let email = '';
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('frappe_user');
      if (stored) {
        try {
          const user = JSON.parse(stored);
          if (user && user.email) {
            key = `completed_lessons_${user.email}`;
            email = user.email;
          }
        } catch (e) {}
      }
      const saved = localStorage.getItem(key);
      let localCompleted = {};
      if (saved) {
        try {
          localCompleted = JSON.parse(saved);
          setCompleted(localCompleted);
        } catch (e) {}
      }

      if (email) {
        getProgressFromRedis(email).then(async (remoteCompleted) => {
          if (remoteCompleted) {
            const merged = { ...localCompleted, ...remoteCompleted };
            setCompleted(merged);
            localStorage.setItem(`completed_lessons_${email}`, JSON.stringify(merged));
            
            const remoteKeys = Object.keys(remoteCompleted).length;
            const mergedKeys = Object.keys(merged).length;
            if (mergedKeys > remoteKeys) {
              await saveProgressToRedis(email, merged);
            }
          }
        }).catch(err => console.error("Error synchronizing progress:", err));
      }
    }
  }, []);

  return <ProgressPage completed={completed} />;
}

