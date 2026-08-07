'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const MathLab = dynamic(
  () => import('@/components/labs/MathLab'),
  {
    ssr: false,
    loading: () => (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#07080F',
        color: '#8B5CF6',
        gap: 12
      }}>
        <Loader2 size={36} style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'sans-serif' }}>
          Loading Interactive Math Simulator Environment...
        </span>
      </div>
    )
  }
);

export default function MathLabPage() {
  return <MathLab />;
}
