'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Building, BookOpen, ArrowLeft } from 'lucide-react';
import { T } from '@/lib/lms-data';

export default function ResourcesDSA({ navigateTo }) {
  const options = [
    {
      id: 'dsa/company',
      title: 'Company-wise Questions',
      description: 'Practice coding questions asked by top tech companies',
      gradient: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
      Icon: Building
    },
    {
      id: 'dsa/resources',
      title: 'Learning Resources',
      description: 'Comprehensive DSA study materials and guides',
      gradient: 'linear-gradient(135deg, #10B981 0%, #14B8A6 100%)',
      Icon: BookOpen
    }
  ];

  return (
    <div style={{ padding: '24px', maxWidth: 900, margin: '0 auto', fontFamily: 'var(--font-outfit), sans-serif' }}>
      {/* Back button and title */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 36 }}>
        <button
          onClick={() => navigateTo('home')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'transparent', border: 'none', color: T.muted,
            fontSize: 14, cursor: 'pointer', fontWeight: 500, width: 'fit-content'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = T.text}
          onMouseLeave={(e) => e.currentTarget.style.color = T.muted}
        >
          <ArrowLeft size={16} /> Back to Hub
        </button>

        <div style={{ textAlign: 'center' }}>
          <h1 style={{
            fontSize: 36, fontWeight: 800, color: T.text, margin: '0 0 10px 0', letterSpacing: '-0.03em',
            background: `linear-gradient(to right, #F97316 0%, #EF4444 100%)`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
          }}>
            Data Structures & Algorithms
          </h1>
          <p style={{ color: T.muted, fontSize: 16, margin: 0 }}>
            Master DSA with company-specific questions and comprehensive learning resources.
          </p>
        </div>
      </div>

      {/* Options */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24
      }}>
        {options.map(({ id, title, description, gradient, Icon }) => (
          <motion.div
            key={id}
            whileHover={{ y: -6 }}
            onClick={() => navigateTo(id)}
            style={{
              background: gradient, borderRadius: 16, padding: '36px 24px', cursor: 'pointer',
              boxShadow: '0 12px 24px rgba(0, 0, 0, 0.25)', display: 'flex', flexDirection: 'column',
              minHeight: 240, justifyContent: 'space-between', position: 'relative', overflow: 'hidden'
            }}
          >
            {/* Glossy overlay */}
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.15)', backdropFilter: 'blur(1px)' }}></div>

            <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%', background: 'rgba(255, 255, 255, 0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Icon size={24} color="#fff" />
              </div>
              <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>{title}</h2>
              <p style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: 13.5, margin: 0, lineHeight: 1.4 }}>{description}</p>
            </div>

            <div style={{
              position: 'relative', zIndex: 1, display: 'inline-flex', alignItems: 'center', gap: 8,
              color: '#000', fontSize: 13.5, fontWeight: 700, background: '#fff', padding: '8px 16px',
              borderRadius: 8, marginTop: 16, width: 'fit-content'
            }}>
              Explore <ArrowRight size={14} />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
