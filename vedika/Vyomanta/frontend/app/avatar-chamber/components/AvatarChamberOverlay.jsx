'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Code2, Puzzle, Play, ChevronLeft, ChevronRight } from 'lucide-react';

/* ── Crisp Solid Sparkle Icon Matching the User Screenshot ── */
function SolidSparkleIcon({ size = 19, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      style={{ display: 'block' }}
    >
      <path d="M12 2C12.5 7.2 16.8 11.5 22 12C16.8 12.5 12.5 16.8 12 22C11.5 16.8 7.2 12.5 2 12C7.2 11.5 11.5 7.2 12 2Z" />
      <path d="M19 2.5C19.2 4.2 20.8 5.8 22.5 6C20.8 6.2 19.2 7.8 19 9.5C18.8 7.8 17.2 6.2 15.5 6C17.2 5.8 18.8 4.2 19 2.5Z" />
      <path d="M5 14.5C5.2 16.2 6.8 17.8 8.5 18C6.8 18.2 5.2 19.8 5 21.5C4.8 19.8 3.2 18.2 1.5 18C3.2 17.8 4.8 16.2 5 14.5Z" />
    </svg>
  );
}

export const COMPANION_DOCK_ITEMS = [
  {
    id: 'ask',
    index: 0,
    title: 'Ask Vedika',
    subtitle: 'Get instant answers to your questions.',
    icon: SolidSparkleIcon,
    iconSize: 20,
    /* Exactly matching Middle Avatar 0: Electric Neon Green */
    themeColor: '#10B981',
    glowColor: 'rgba(16, 185, 129, 0.55)',
    bgGradient: 'rgba(6, 78, 59, 0.35)',
    borderColor: '#10B981',
    iconBg: 'linear-gradient(135deg, #047857, #10b981)',
    inactiveIconBg: 'rgba(6, 78, 59, 0.50)',
    inactiveIconColor: '#34d399',
    route: '/vedika-ai/ask',
  },
  {
    id: 'code',
    index: 1,
    title: 'Code with Vedika',
    subtitle: 'Build, learn and grow together.',
    icon: Code2,
    iconSize: 19,
    iconProps: { strokeWidth: 2.5 },
    /* Exactly matching Middle Avatar 1: Vibrant Neon Pink */
    themeColor: '#EC4899',
    glowColor: 'rgba(236, 72, 153, 0.55)',
    bgGradient: 'rgba(131, 24, 67, 0.35)',
    borderColor: '#EC4899',
    iconBg: 'linear-gradient(135deg, #be185d, #ec4899)',
    inactiveIconBg: 'rgba(131, 24, 67, 0.50)',
    inactiveIconColor: '#f472b6',
    route: '/vedika-ai/code',
  },
  {
    id: 'puzzles',
    index: 2,
    title: 'Code Puzzlers',
    subtitle: 'Solve. Think. Level up.',
    icon: Puzzle,
    iconSize: 18,
    iconProps: { fill: 'currentColor', strokeWidth: 1.5 },
    /* Exactly matching Middle Avatar 2: Bright Crimson Red */
    themeColor: '#EF4444',
    glowColor: 'rgba(239, 68, 68, 0.55)',
    bgGradient: 'rgba(153, 27, 27, 0.35)',
    borderColor: '#EF4444',
    iconBg: 'linear-gradient(135deg, #b91c1c, #ef4444)',
    inactiveIconBg: 'rgba(127, 29, 29, 0.50)',
    inactiveIconColor: '#f87171',
    route: '/vedika-ai/puzzle',
  },
  {
    id: 'viva',
    index: 3,
    title: 'Viva and Interview',
    subtitle: 'Practice for your dream job.',
    icon: Play,
    iconSize: 16,
    iconProps: { fill: 'currentColor', strokeWidth: 0 },
    /* Exactly matching Middle Avatar 3: Warm Radiant Gold */
    themeColor: '#F59E0B',
    glowColor: 'rgba(245, 158, 11, 0.55)',
    bgGradient: 'rgba(146, 64, 14, 0.35)',
    borderColor: '#F59E0B',
    iconBg: 'linear-gradient(135deg, #b45309, #f59e0b)',
    inactiveIconBg: 'rgba(120, 53, 15, 0.50)',
    inactiveIconColor: '#fbbf24',
    route: '/viva-interview',
  },
];

export default function AvatarChamberOverlay({
  activeIndex = 0,
  onNext,
  onPrev,
  onSelectIndex,
}) {
  const router = useRouter();
  const currentCompanion = COMPANION_DOCK_ITEMS[activeIndex] || COMPANION_DOCK_ITEMS[0];

  const handleNext = () => {
    onNext?.();
  };

  const handlePrev = () => {
    onPrev?.();
  };

  const handleEnterWorld = (targetRoute) => {
    const route = targetRoute || currentCompanion?.route || '/vedika-ai';
    router.push(route);
  };

  // Keyboard navigation support (Left / Right arrow keys, Enter to launch)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'Enter') {
        handleEnterWorld();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  return (
    <div className="aco-overlay">
      {/* ── Top Header Section ── */}
      <header className="aco-header">
        <div className="aco-header-top-row">
          <div className="aco-badge">
            <span className="aco-badge-pulse" />
            <Sparkles size={12} />
            <span>VEDIKA 3D CHAMBER</span>
          </div>
        </div>

        <h1 className="aco-title">
          Choose <span className="aco-title-accent">Your Companion</span>
        </h1>

        <p className="aco-subtitle">
          Each buddy has a world of fun waiting for you.
        </p>
      </header>

      {/* ── Screen-Edge Side Carousel Navigation Arrows (Multi-Coloured & Prominent) ── */}
      <button
        className="aco-screen-nav-btn aco-screen-nav-left"
        onClick={handlePrev}
        aria-label="Previous Companion"
        type="button"
      >
        <div className="aco-screen-nav-inner">
          <ChevronLeft size={32} strokeWidth={2.8} className="aco-nav-icon-left" />
        </div>
      </button>

      <button
        className="aco-screen-nav-btn aco-screen-nav-right"
        onClick={handleNext}
        aria-label="Next Companion"
        type="button"
      >
        <div className="aco-screen-nav-inner">
          <ChevronRight size={32} strokeWidth={2.8} className="aco-nav-icon-right" />
        </div>
      </button>

      {/* ── Bottom Companion Controller Dock (Exact Replica of User Provided Screenshot) ── */}
      <div
        className="aco-bottom-dock-wrapper"
        style={{
          '--active-ambient-color': currentCompanion.glowColor,
        }}
      >
        {/* Soft Ambient Theme Glow Bleeding Above Dock */}
        <div className="aco-dock-ambient-glow" />

        <div className="aco-companion-capsule-dock">
          {COMPANION_DOCK_ITEMS.map((item, idx) => {
            const isActive = idx === activeIndex;
            const IconComp = item.icon;
            return (
              <button
                key={item.id}
                className={`aco-dock-card ${isActive ? 'aco-dock-card-active' : ''}`}
                onClick={() => {
                  if (isActive) {
                    handleEnterWorld(item.route);
                  } else {
                    onSelectIndex?.(idx);
                  }
                }}
                style={{
                  '--card-theme': item.themeColor,
                  '--card-glow': item.glowColor,
                  '--card-bg': item.bgGradient,
                  '--card-border': item.borderColor,
                }}
                type="button"
              >
                <div
                  className={`aco-card-icon-circle ${isActive ? 'aco-card-icon-circle-active' : ''}`}
                  style={{
                    background: isActive ? item.iconBg : item.inactiveIconBg,
                    color: isActive ? '#ffffff' : item.inactiveIconColor,
                    boxShadow: isActive ? `0 0 16px ${item.glowColor}` : 'none',
                  }}
                >
                  <IconComp
                    size={item.iconSize || 18}
                    className="aco-card-icon-svg"
                    {...(item.iconProps || {})}
                  />
                </div>

                <div className="aco-card-text">
                  <span className="aco-card-title">{item.title}</span>
                  <span className="aco-card-subtitle">{item.subtitle}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
