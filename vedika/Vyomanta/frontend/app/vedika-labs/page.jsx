'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ArrowRight, FlaskConical, Dna, Atom } from 'lucide-react';
import { T } from '@/lib/lms-data';

export default function VedikaLabsHub() {
  const router = useRouter();

  const cards = [
    {
      id: 'physics',
      title: 'Physics Lab',
      description: 'Simulate forces, gravity pendulum vectors, spring oscillations, projectiles, and electronic Ohm\'s Law circuits.',
      gradient: 'linear-gradient(135deg, #10B981 0%, #14B8A6 100%)',
      btnText: 'Enter Physics Lab',
      Icon: Atom,
      url: '/vedika-labs/physics'
    },
    {
      id: 'chemistry',
      title: 'Chemistry Lab',
      description: 'Build Bohr atomic structures, simulate kinetic gas chambers, run acid-base titrations, and observe diffusion.',
      gradient: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
      btnText: 'Enter Chemistry Lab',
      Icon: FlaskConical,
      url: '/vedika-labs/chemistry'
    },
    {
      id: 'biology',
      title: 'Biology Lab',
      description: 'Interact with 3D animal cell organelles and track predator-prey food web dynamics in real-time charts.',
      gradient: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
      btnText: 'Enter Biology Lab',
      Icon: Dna,
      url: '/vedika-labs/biology'
    }
  ];

  return (
    <div style={{
      padding: '40px 24px',
      maxWidth: 1000,
      margin: '0 auto',
      fontFamily: 'var(--font-outfit), sans-serif',
      color: T.text
    }}>
      {/* Title Header */}
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <h1 style={{
          color: T.text,
          fontSize: 36,
          fontWeight: 800,
          margin: '0 0 12px 0',
          letterSpacing: '-0.03em',
          background: `linear-gradient(to right, ${T.text} 0%, #10B981 100%)`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Vedika 3D Science Simulator Labs
        </h1>
        <p style={{ color: T.muted, fontSize: 16, margin: 0 }}>
          Explore interactive WebGL environments and run digital experiments.
        </p>
      </div>

      {/* Grid of Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 24,
        width: '100%'
      }}>
        {cards.map(({ id, title, description, gradient, btnText, Icon, url }) => (
          <motion.div
            key={id}
            whileHover={{ y: -6, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push(url)}
            style={{
              background: gradient,
              borderRadius: 16,
              padding: '36px 24px',
              textAlign: 'center',
              cursor: 'pointer',
              boxShadow: '0 12px 24px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'space-between',
              minHeight: 280,
              transition: 'box-shadow 0.2s'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 8
              }}>
                <Icon size={28} color="#fff" />
              </div>
              <h2 style={{ color: '#fff', fontSize: 24, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
                {title}
              </h2>
              <p style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: 14, margin: '4px 0 0 0', lineHeight: 1.4 }}>
                {description}
              </p>
            </div>

            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              background: 'rgba(255, 255, 255, 0.15)',
              padding: '8px 16px',
              borderRadius: 8,
              marginTop: 16,
              transition: 'background 0.2s'
            }}>
              {btnText}
              <ArrowRight size={16} />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
