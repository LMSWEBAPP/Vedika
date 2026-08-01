'use client';

import dynamic from 'next/dynamic';

const CodePuzzle = dynamic(() => import('@/components/CodePuzzle'), { ssr: false });

export default function CodePuzzleRoute() {
  return <CodePuzzle />;
}
