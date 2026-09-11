'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import BloubAvatar from '../../components/BloubAvatar';
import { EXPRESSIONS } from '../../lib/bloub/expressions.js';
import { STATES } from '../../lib/bloub/states.js';
import './2d-avatar-testing.css';

const PAPERS = [
  { id: 'dark', label: 'Dark Carbon', bg: '#09090b', cardBg: '#111218' },
  { id: 'pure-black', label: 'OLED Black', bg: '#000000', cardBg: '#080808' },
  { id: 'light', label: 'Ivory Clay', bg: '#f4f4f5', cardBg: '#ffffff' },
  { id: 'slate', label: 'Navy Frost', bg: '#0f172a', cardBg: '#1e293b' },
  { id: 'purple', label: 'Cosmic Violet', bg: '#180e29', cardBg: '#2a1a45' },
];

export default function BloubTestingPage() {
  const [currentExpression, setCurrentExpression] = useState('neutre');
  const [currentState, setCurrentState] = useState('idle');
  const [followCursor, setFollowCursor] = useState(true);
  const [currentPaper, setCurrentPaper] = useState(PAPERS[0]);

  return (
    <main className="bloub-test-container">
      {/* Top Header */}
      <header className="bloub-header">
        <div className="bloub-badge">
          <span className="bloub-badge-dot"></span>
          Bloub 2D Avatar Animation Engine
        </div>
        <h1 className="bloub-title">2D Avatar Expression Testing</h1>
        <p className="bloub-subtitle">
          Pure geometric SVG avatar engine with smooth vector morphing, organic breathing, and gaze tracking.
          Circle silhouette with black fill (<code>#000000</code>) and seamless eye cutouts.
        </p>
      </header>

      {/* Main Interactive Stage */}
      <section className="bloub-stage-wrapper">
        <div
          className="bloub-master-card"
          style={{ backgroundColor: currentPaper.cardBg }}
        >
          <div className="bloub-card-glow"></div>
          <div className="bloub-master-card-inner">
            <BloubAvatar
              size={300}
              shape={null} /* circle */
              color="#000000" /* Black as requested */
              paper={currentPaper.bg}
              expression={currentExpression}
              state={currentState}
              follow={followCursor}
            />
          </div>

          <div className="bloub-expression-indicator">
            <span>Current: <strong>{currentExpression}</strong></span>
            <span style={{ opacity: 0.5 }}>•</span>
            <span style={{ color: '#93c5fd' }}>{currentState}</span>
          </div>
        </div>

        {/* Controls Panel */}
        <div className="bloub-controls-panel">
          {/* Expressions */}
          <div className="bloub-control-group">
            <div className="bloub-group-header">
              <span className="bloub-group-title">Available Expressions ({EXPRESSIONS.length})</span>
              <span className="bloub-group-meta">Select to morph eyes and tilt</span>
            </div>
            <div className="bloub-pills-grid">
              {EXPRESSIONS.map((expr) => {
                const isActive = currentExpression === expr.id;
                return (
                  <button
                    key={expr.id}
                    type="button"
                    onClick={() => setCurrentExpression(expr.id)}
                    className={`bloub-pill-btn ${isActive ? 'active' : ''}`}
                  >
                    {expr.id}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Morph States */}
          <div className="bloub-control-group">
            <div className="bloub-group-header">
              <span className="bloub-group-title">Animation States ({STATES.length})</span>
              <span className="bloub-group-meta">Dynamic geometric squash, stretch & effects</span>
            </div>
            <div className="bloub-pills-grid">
              {STATES.map((st) => {
                const isActive = currentState === st.id;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setCurrentState(st.id)}
                    className={`bloub-pill-btn state-btn ${isActive ? 'active' : ''}`}
                  >
                    {st.id}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Settings & Canvas Paper */}
          <div className="bloub-toggle-row">
            <button
              type="button"
              onClick={() => setFollowCursor(!followCursor)}
              className={`bloub-toggle-btn ${followCursor ? 'on' : ''}`}
            >
              <span>{followCursor ? '✓ Tracking Mouse' : '○ Fixed Gaze'}</span>
            </button>

            <Link href="/" className="bloub-toggle-btn">
              ← Return Home
            </Link>

            <Link href="/vedika-chamber" className="bloub-toggle-btn">
              Go to Chamber →
            </Link>

            <div className="bloub-theme-swatches">
              <span className="bloub-swatch-label">Backdrop:</span>
              {PAPERS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  title={p.label}
                  onClick={() => setCurrentPaper(p)}
                  className={`bloub-swatch-btn ${currentPaper.id === p.id ? 'active' : ''}`}
                  style={{ backgroundColor: p.bg }}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Gallery of all 16 expressions at once */}
      <section className="bloub-gallery-section">
        <div className="bloub-gallery-title">
          <span>All 16 Expressions Live Matrix</span>
          <span style={{ fontSize: '13px', fontWeight: 500, color: '#94a3b8' }}>
            Click any expression to test on master stage
          </span>
        </div>

        <div className="bloub-gallery-grid">
          {EXPRESSIONS.map((expr) => {
            const isSelected = currentExpression === expr.id;
            return (
              <div
                key={expr.id}
                onClick={() => setCurrentExpression(expr.id)}
                className={`bloub-gallery-card ${isSelected ? 'selected' : ''}`}
                style={{ backgroundColor: currentPaper.cardBg }}
              >
                <BloubAvatar
                  size={100}
                  shape={null}
                  color="#000000"
                  paper={currentPaper.bg}
                  expression={expr.id}
                  state="idle"
                  follow={false}
                />
                <span className="bloub-gallery-name">{expr.id}</span>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
