'use client';
import { useState, useEffect } from 'react';

export function useMediaQuery(query) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const handler = (e) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);
  return matches;
}

export const BP = { mobile: 768, tablet: 1024 };
export const isMobileMQ = `(max-width: ${BP.mobile - 1}px)`;
export const isTabletMQ = `(max-width: ${BP.tablet - 1}px)`;
