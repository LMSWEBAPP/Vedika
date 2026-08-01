'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const ChemistryLab = dynamic(
  () => import('@/components/labs/ChemistryLab'),
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
        color: '#A78BFA',
        gap: 12
      }}>
        <Loader2 size={36} style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'sans-serif' }}>
          Loading 3D Chemistry Simulator Environment...
        </span>
      </div>
    )
  }
);

export default function ChemistryLabPage() {
  return <ChemistryLab />;
}
