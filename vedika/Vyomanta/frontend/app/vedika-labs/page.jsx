'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ArrowRight, FlaskConical, Dna, Atom, Calculator } from 'lucide-react';
import { T } from '@/lib/lms-data';

export default function VedikaLabsHub() {
  const router = useRouter();

  const cards = [
    {
      id: 'physics',
      title: 'Physics Lab',
      badge: 'Interactive HTML5 + 3D WebGL',
      description: 'Explore 8+ interactive HTML5 STEM simulators (DC Circuits, Newton\'s Motion, Pendulums, Projectiles, Energy Skate Park, Wave Interference, Gravity & Orbits) with Vedika AI Tutor.',
      gradient: 'linear-gradient(135deg, #10B981 0%, #14B8A6 100%)',
      btnText: 'Enter Physics Lab',
      Icon: Atom,
      url: '/vedika-labs/physics'
    },
    {
      id: 'chemistry',
      title: 'Chemistry Lab',
      badge: 'Interactive HTML5 + 3D WebGL',
      description: 'Run 8+ interactive HTML5 chemistry labs (Build an Atom, pH Scale Titrations, Ideal Gas Laws, Molecule Shapes VSEPR, Limiting Reagents) with AI guidance.',
      gradient: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
      btnText: 'Enter Chemistry Lab',
      Icon: FlaskConical,
      url: '/vedika-labs/chemistry'
    },
    {
      id: 'biology',
      title: 'Biology Lab',
      badge: 'Interactive HTML5 + 3D WebGL',
      description: 'Simulate 5+ interactive biology labs (Natural Selection & Bunny Evolution, Gene Expression Transcription, Neuron Action Potentials, Membrane Transport) with interactive AI viva.',
      gradient: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
      btnText: 'Enter Biology Lab',
      Icon: Dna,
      url: '/vedika-labs/biology'
    },
    {
      id: 'math',
      title: 'Math Lab',
      badge: 'Interactive Workspace',
      description: 'Draw & solve equations on smart whiteboard, plot real-time 2D/3D graphs with dynamic sliders, ask AI math tutor, and explore visual Pythagoras & Calculus visualizers.',
      gradient: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
      btnText: 'Enter Math Lab',
      Icon: Calculator,
      url: '/vedika-labs/math'
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
        {cards.map(({ id, title, badge, description, gradient, btnText, Icon, url }) => (
          <motion.div
            key={id}
            whileHover={{ y: -6, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push(url)}
            style={{
              background: gradient,
              borderRadius: 16,
              padding: '32px 24px',
              textAlign: 'center',
              cursor: 'pointer',
              boxShadow: '0 12px 24px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'space-between',
              minHeight: 300,
              transition: 'box-shadow 0.2s',
              position: 'relative'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              {badge && (
                <span style={{
                  background: 'rgba(0, 0, 0, 0.25)',
                  color: '#fff',
                  fontSize: 10,
                  fontWeight: 800,
                  padding: '4px 10px',
                  borderRadius: 20,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em'
                }}>
                  {badge}
                </span>
              )}
              <div style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 4
              }}>
                <Icon size={28} color="#fff" />
              </div>
              <h2 style={{ color: '#fff', fontSize: 24, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
                {title}
              </h2>
              <p style={{ color: 'rgba(255, 255, 255, 0.88)', fontSize: 13.5, margin: '4px 0 0 0', lineHeight: 1.45 }}>
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
