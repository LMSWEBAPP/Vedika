'use client';

import React, { useState, useEffect } from 'react';
import './CrownTuner.css';

export const DEFAULT_AVATAR_CONFIGS = [
  // 0: Ask Vedika (Emerald Green)
  {
    crown: {
      posX: -0.56,
      posY: 1.69,
      posZ: 0.58,
      size: 0.78,
      rotZ: 0.25,
      rotX: 0,
      rotY: 0,
    },
    light: {
      lightX: 19.9,
      lightSpread: 0.9,
      rayLength: 4.2,
      raysSpeed: 0.75,
    },
    text: {
      textLeft: 19.9,
      textBottom: 74,
      textSize: 1.15,
    },
  },
  // 1: Code with Vedika (Sky Blue)
  {
    crown: {
      posX: -0.56,
      posY: 1.69,
      posZ: 0.58,
      size: 0.78,
      rotZ: 0.25,
      rotX: 0,
      rotY: 0,
    },
    light: {
      lightX: 40.4,
      lightSpread: 0.9,
      rayLength: 4.2,
      raysSpeed: 0.75,
    },
    text: {
      textLeft: 40.4,
      textBottom: 74,
      textSize: 1.15,
    },
  },
  // 2: Code Puzzles (Magenta Pink)
  {
    crown: {
      posX: -0.56,
      posY: 1.7,
      posZ: 0.66,
      size: 0.78,
      rotZ: 0.14,
      rotX: 0,
      rotY: 0,
    },
    light: {
      lightX: 59.5,
      lightSpread: 0.9,
      rayLength: 4.2,
      raysSpeed: 0.75,
    },
    text: {
      textLeft: 59.6,
      textBottom: 75,
      textSize: 1.15,
    },
  },
  // 3: Viva and Interview (Warm Gold)
  {
    crown: {
      posX: -0.56,
      posY: 1.69,
      posZ: 0.44,
      size: 0.78,
      rotZ: 0.08,
      rotX: 0,
      rotY: 0,
    },
    light: {
      lightX: 80.0,
      lightSpread: 0.9,
      rayLength: 4.2,
      raysSpeed: 0.75,
    },
    text: {
      textLeft: 80.1,
      textBottom: 74,
      textSize: 1.15,
    },
  },
];

const STORAGE_KEY = 'vedika_avatar_all_configs';

const AVATAR_TABS = [
  { name: 'Ask Vedika', color: '#10B981', short: 'Ask' },
  { name: 'Code with Vedika', color: '#0284C7', short: 'Code' },
  { name: 'Code Puzzles', color: '#DB2777', short: 'Puzzles' },
  { name: 'Viva and Interview', color: '#D97706', short: 'Viva' },
];

export default function CrownTuner({
  activeIndex = 0,
  onSelectAvatar,
  onConfigsChange,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(activeIndex);
  const [activeCategory, setActiveCategory] = useState('crown'); // 'crown' | 'light' | 'text'
  const [copied, setCopied] = useState(false);

  const [configs, setConfigs] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length === 4) {
            return parsed;
          }
        }
      } catch (e) {
        console.warn('Failed to load avatar configs from storage', e);
      }
    }
    return DEFAULT_AVATAR_CONFIGS;
  });

  // Sync selected tab with carousel activeIndex
  useEffect(() => {
    setSelectedAvatar(activeIndex);
  }, [activeIndex]);

  // Broadcast configs to page/scene and persist to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
      } catch (e) {}
    }
    if (onConfigsChange) {
      onConfigsChange(configs);
    }
  }, [configs, onConfigsChange]);

  const handleSelectTab = (idx) => {
    setSelectedAvatar(idx);
    if (onSelectAvatar) {
      onSelectAvatar(idx);
    }
  };

  const handleValueChange = (section, key, rawVal) => {
    const num = parseFloat(rawVal);
    if (isNaN(num)) return;

    setConfigs((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      if (!next[selectedAvatar]) next[selectedAvatar] = { ...DEFAULT_AVATAR_CONFIGS[selectedAvatar] };
      if (!next[selectedAvatar][section]) next[selectedAvatar][section] = { ...DEFAULT_AVATAR_CONFIGS[selectedAvatar][section] };
      next[selectedAvatar][section][key] = num;
      return next;
    });
  };

  const handleResetCurrent = () => {
    setConfigs((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      next[selectedAvatar] = JSON.parse(JSON.stringify(DEFAULT_AVATAR_CONFIGS[selectedAvatar]));
      return next;
    });
  };

  const handleResetAll = () => {
    setConfigs(DEFAULT_AVATAR_CONFIGS);
  };

  const handleCopyCode = () => {
    const code = `export const TUNED_AVATAR_CONFIGS = ${JSON.stringify(configs, null, 2)};`;
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const currentCfg = configs[selectedAvatar] || DEFAULT_AVATAR_CONFIGS[selectedAvatar];

  return (
    <aside className="crown-tuner-root" aria-label="Fine Tuner Controller">
      <button
        type="button"
        className={`crown-tuner-toggle-btn ${isOpen ? 'crown-tuner-active' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span className="crown-tuner-icon">👑</span>
        <span className="crown-tuner-btn-text">Fine Tuner</span>
      </button>

      {isOpen && (
        <div className="crown-tuner-panel">
          {/* Header */}
          <div className="crown-tuner-header">
            <h3 className="crown-tuner-title">⚙️ Avatar & Scene Tuner</h3>
            <button
              type="button"
              className="crown-tuner-close-btn"
              onClick={() => setIsOpen(false)}
            >
              ✕
            </button>
          </div>

          {/* 4 Avatar Selector Tabs */}
          <div className="crown-tuner-avatar-tabs">
            {AVATAR_TABS.map((tab, idx) => (
              <button
                key={tab.name}
                type="button"
                className={`crown-tuner-avatar-tab ${selectedAvatar === idx ? 'crown-tab-selected' : ''}`}
                onClick={() => handleSelectTab(idx)}
              >
                <span className="crown-tuner-avatar-dot" data-avatar-idx={idx} />
                <span className="crown-tuner-avatar-tab-label">{tab.short}</span>
              </button>
            ))}
          </div>

          {/* Category Tabs: Crown | Light | Text */}
          <div className="crown-tuner-category-tabs">
            <button
              type="button"
              className={`crown-tuner-cat-btn ${activeCategory === 'crown' ? 'crown-cat-active' : ''}`}
              onClick={() => setActiveCategory('crown')}
            >
              👑 Cap/Crown
            </button>
            <button
              type="button"
              className={`crown-tuner-cat-btn ${activeCategory === 'light' ? 'crown-cat-active' : ''}`}
              onClick={() => setActiveCategory('light')}
            >
              💡 Light Rays
            </button>
            <button
              type="button"
              className={`crown-tuner-cat-btn ${activeCategory === 'text' ? 'crown-cat-active' : ''}`}
              onClick={() => setActiveCategory('text')}
            >
              📝 Below Text
            </button>
          </div>

          {/* Body Controls */}
          <div className="crown-tuner-body">
            {/* ── SECTION 1: CROWN / CAP ── */}
            {activeCategory === 'crown' && (
              <div className="crown-tuner-section">
                {/* Size */}
                <div className="crown-tuner-row">
                  <div className="crown-tuner-label-group">
                    <label htmlFor="crown-size" className="crown-tuner-label">Size / Scale</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.2"
                      max="2.5"
                      value={currentCfg.crown.size}
                      className="crown-tuner-number-input"
                      onChange={(e) => handleValueChange('crown', 'size', e.target.value)}
                    />
                  </div>
                  <input
                    id="crown-size"
                    type="range"
                    min="0.2"
                    max="2.5"
                    step="0.01"
                    value={currentCfg.crown.size}
                    className="crown-tuner-slider"
                    onChange={(e) => handleValueChange('crown', 'size', e.target.value)}
                  />
                </div>

                {/* Pos X */}
                <div className="crown-tuner-row">
                  <div className="crown-tuner-label-group">
                    <label htmlFor="crown-pos-x" className="crown-tuner-label">Placement X (Left / Right)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="-2.0"
                      max="2.0"
                      value={currentCfg.crown.posX}
                      className="crown-tuner-number-input"
                      onChange={(e) => handleValueChange('crown', 'posX', e.target.value)}
                    />
                  </div>
                  <input
                    id="crown-pos-x"
                    type="range"
                    min="-2.0"
                    max="2.0"
                    step="0.01"
                    value={currentCfg.crown.posX}
                    className="crown-tuner-slider"
                    onChange={(e) => handleValueChange('crown', 'posX', e.target.value)}
                  />
                </div>

                {/* Pos Y */}
                <div className="crown-tuner-row">
                  <div className="crown-tuner-label-group">
                    <label htmlFor="crown-pos-y" className="crown-tuner-label">Placement Y (Up / Down)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.0"
                      max="3.0"
                      value={currentCfg.crown.posY}
                      className="crown-tuner-number-input"
                      onChange={(e) => handleValueChange('crown', 'posY', e.target.value)}
                    />
                  </div>
                  <input
                    id="crown-pos-y"
                    type="range"
                    min="0.0"
                    max="3.0"
                    step="0.01"
                    value={currentCfg.crown.posY}
                    className="crown-tuner-slider"
                    onChange={(e) => handleValueChange('crown', 'posY', e.target.value)}
                  />
                </div>

                {/* Pos Z */}
                <div className="crown-tuner-row">
                  <div className="crown-tuner-label-group">
                    <label htmlFor="crown-pos-z" className="crown-tuner-label">Placement Z (Front / Back)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="-1.0"
                      max="2.0"
                      value={currentCfg.crown.posZ}
                      className="crown-tuner-number-input"
                      onChange={(e) => handleValueChange('crown', 'posZ', e.target.value)}
                    />
                  </div>
                  <input
                    id="crown-pos-z"
                    type="range"
                    min="-1.0"
                    max="2.0"
                    step="0.01"
                    value={currentCfg.crown.posZ}
                    className="crown-tuner-slider"
                    onChange={(e) => handleValueChange('crown', 'posZ', e.target.value)}
                  />
                </div>

                {/* Tilt Z */}
                <div className="crown-tuner-row">
                  <div className="crown-tuner-label-group">
                    <label htmlFor="crown-rot-z" className="crown-tuner-label">Tilt / Roll Z (Angle rad)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="-3.14"
                      max="3.14"
                      value={currentCfg.crown.rotZ}
                      className="crown-tuner-number-input"
                      onChange={(e) => handleValueChange('crown', 'rotZ', e.target.value)}
                    />
                  </div>
                  <input
                    id="crown-rot-z"
                    type="range"
                    min="-3.14"
                    max="3.14"
                    step="0.02"
                    value={currentCfg.crown.rotZ}
                    className="crown-tuner-slider"
                    onChange={(e) => handleValueChange('crown', 'rotZ', e.target.value)}
                  />
                </div>

                {/* Tilt X */}
                <div className="crown-tuner-row">
                  <div className="crown-tuner-label-group">
                    <label htmlFor="crown-rot-x" className="crown-tuner-label">Tilt X (Pitch rad)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="-1.57"
                      max="1.57"
                      value={currentCfg.crown.rotX}
                      className="crown-tuner-number-input"
                      onChange={(e) => handleValueChange('crown', 'rotX', e.target.value)}
                    />
                  </div>
                  <input
                    id="crown-rot-x"
                    type="range"
                    min="-1.57"
                    max="1.57"
                    step="0.02"
                    value={currentCfg.crown.rotX}
                    className="crown-tuner-slider"
                    onChange={(e) => handleValueChange('crown', 'rotX', e.target.value)}
                  />
                </div>

                {/* Tilt Y */}
                <div className="crown-tuner-row">
                  <div className="crown-tuner-label-group">
                    <label htmlFor="crown-rot-y" className="crown-tuner-label">Tilt Y (Yaw rad)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="-1.57"
                      max="1.57"
                      value={currentCfg.crown.rotY}
                      className="crown-tuner-number-input"
                      onChange={(e) => handleValueChange('crown', 'rotY', e.target.value)}
                    />
                  </div>
                  <input
                    id="crown-rot-y"
                    type="range"
                    min="-1.57"
                    max="1.57"
                    step="0.02"
                    value={currentCfg.crown.rotY}
                    className="crown-tuner-slider"
                    onChange={(e) => handleValueChange('crown', 'rotY', e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* ── SECTION 2: LIGHT RAYS ── */}
            {activeCategory === 'light' && (
              <div className="crown-tuner-section">
                {/* Light X % */}
                <div className="crown-tuner-row">
                  <div className="crown-tuner-label-group">
                    <label htmlFor="light-x" className="crown-tuner-label">Light Center X (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.0"
                      max="100.0"
                      value={currentCfg.light.lightX}
                      className="crown-tuner-number-input"
                      onChange={(e) => handleValueChange('light', 'lightX', e.target.value)}
                    />
                  </div>
                  <input
                    id="light-x"
                    type="range"
                    min="0.0"
                    max="100.0"
                    step="0.1"
                    value={currentCfg.light.lightX}
                    className="crown-tuner-slider"
                    onChange={(e) => handleValueChange('light', 'lightX', e.target.value)}
                  />
                </div>

                {/* Light Spread */}
                <div className="crown-tuner-row">
                  <div className="crown-tuner-label-group">
                    <label htmlFor="light-spread" className="crown-tuner-label">Light Cone Spread</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.1"
                      max="1.5"
                      value={currentCfg.light.lightSpread}
                      className="crown-tuner-number-input"
                      onChange={(e) => handleValueChange('light', 'lightSpread', e.target.value)}
                    />
                  </div>
                  <input
                    id="light-spread"
                    type="range"
                    min="0.1"
                    max="1.5"
                    step="0.02"
                    value={currentCfg.light.lightSpread}
                    className="crown-tuner-slider"
                    onChange={(e) => handleValueChange('light', 'lightSpread', e.target.value)}
                  />
                </div>

                {/* Ray Length */}
                <div className="crown-tuner-row">
                  <div className="crown-tuner-label-group">
                    <label htmlFor="light-ray-len" className="crown-tuner-label">Ray Beam Length</label>
                    <input
                      type="number"
                      step="0.1"
                      min="1.0"
                      max="6.0"
                      value={currentCfg.light.rayLength}
                      className="crown-tuner-number-input"
                      onChange={(e) => handleValueChange('light', 'rayLength', e.target.value)}
                    />
                  </div>
                  <input
                    id="light-ray-len"
                    type="range"
                    min="1.0"
                    max="6.0"
                    step="0.1"
                    value={currentCfg.light.rayLength}
                    className="crown-tuner-slider"
                    onChange={(e) => handleValueChange('light', 'rayLength', e.target.value)}
                  />
                </div>

                {/* Ray Speed */}
                <div className="crown-tuner-row">
                  <div className="crown-tuner-label-group">
                    <label htmlFor="light-speed" className="crown-tuner-label">Rays Animation Speed</label>
                    <input
                      type="number"
                      step="0.05"
                      min="0.1"
                      max="2.5"
                      value={currentCfg.light.raysSpeed}
                      className="crown-tuner-number-input"
                      onChange={(e) => handleValueChange('light', 'raysSpeed', e.target.value)}
                    />
                  </div>
                  <input
                    id="light-speed"
                    type="range"
                    min="0.1"
                    max="2.5"
                    step="0.05"
                    value={currentCfg.light.raysSpeed}
                    className="crown-tuner-slider"
                    onChange={(e) => handleValueChange('light', 'raysSpeed', e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* ── SECTION 3: BELOW TEXT CARD ── */}
            {activeCategory === 'text' && (
              <div className="crown-tuner-section">
                {/* Text Left % */}
                <div className="crown-tuner-row">
                  <div className="crown-tuner-label-group">
                    <label htmlFor="text-left" className="crown-tuner-label">Text Center Left (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.0"
                      max="100.0"
                      value={currentCfg.text.textLeft}
                      className="crown-tuner-number-input"
                      onChange={(e) => handleValueChange('text', 'textLeft', e.target.value)}
                    />
                  </div>
                  <input
                    id="text-left"
                    type="range"
                    min="0.0"
                    max="100.0"
                    step="0.1"
                    value={currentCfg.text.textLeft}
                    className="crown-tuner-slider"
                    onChange={(e) => handleValueChange('text', 'textLeft', e.target.value)}
                  />
                </div>

                {/* Text Bottom px */}
                <div className="crown-tuner-row">
                  <div className="crown-tuner-label-group">
                    <label htmlFor="text-bottom" className="crown-tuner-label">Bottom Position (px)</label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      max="200"
                      value={currentCfg.text.textBottom}
                      className="crown-tuner-number-input"
                      onChange={(e) => handleValueChange('text', 'textBottom', e.target.value)}
                    />
                  </div>
                  <input
                    id="text-bottom"
                    type="range"
                    min="0"
                    max="200"
                    step="1"
                    value={currentCfg.text.textBottom}
                    className="crown-tuner-slider"
                    onChange={(e) => handleValueChange('text', 'textBottom', e.target.value)}
                  />
                </div>

                {/* Text Scale */}
                <div className="crown-tuner-row">
                  <div className="crown-tuner-label-group">
                    <label htmlFor="text-size" className="crown-tuner-label">Card Size Scale</label>
                    <input
                      type="number"
                      step="0.05"
                      min="0.5"
                      max="1.8"
                      value={currentCfg.text.textSize}
                      className="crown-tuner-number-input"
                      onChange={(e) => handleValueChange('text', 'textSize', e.target.value)}
                    />
                  </div>
                  <input
                    id="text-size"
                    type="range"
                    min="0.5"
                    max="1.8"
                    step="0.05"
                    value={currentCfg.text.textSize}
                    className="crown-tuner-slider"
                    onChange={(e) => handleValueChange('text', 'textSize', e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="crown-tuner-footer">
            <button
              type="button"
              className="crown-tuner-action-btn crown-tuner-reset-btn"
              onClick={handleResetCurrent}
            >
              ↺ Reset Avatar
            </button>
            <button
              type="button"
              className="crown-tuner-action-btn crown-tuner-reset-all-btn"
              onClick={handleResetAll}
            >
              ↺ Reset All
            </button>
            <button
              type="button"
              className="crown-tuner-action-btn crown-tuner-copy-btn"
              onClick={handleCopyCode}
            >
              {copied ? '✓ Copied!' : '📋 Export All'}
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
