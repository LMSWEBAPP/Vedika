'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Palette, X, Copy, Check, Sliders, Sparkles } from 'lucide-react';
import './AvatarColorTuner.css';

// Helper color conversions
function hexToRgb(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map((c) => c + c).join('');
  }
  const num = parseInt(hex, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('');
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

function hslToRgb(h, s, l) {
  h /= 360; s /= 100; l /= 100;
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

const DEFAULT_AVATARS = [
  { id: 'avatar-1', name: 'Mowgli (Neon Green)', color: '#39FF14' },
  { id: 'avatar-2', name: 'Belle (Neon Pink)', color: '#FF6EFF' },
  { id: 'avatar-3', name: 'Moana (Neon Red)', color: '#FF3131' },
  { id: 'avatar-4', name: 'Bhageera (Neon Orange)', color: '#FF5C00' },
];

const PRESETS = [
  '#39FF14', '#FF6EFF', '#FF3131', '#FF5C00',
  '#2DD4BF', '#38BDF8', '#F472B6', '#FACC15',
  '#EC4899', '#10B981', '#F97316', '#6366F1',
  '#00FFCC', '#FF0055', '#7928CA', '#FFFFFF',
];

export default function AvatarColorTuner() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [colors, setColors] = useState(DEFAULT_AVATARS.map((a) => a.color));
  const [mode, setMode] = useState('rgb'); // 'rgb' | 'hsl'
  const [copied, setCopied] = useState(false);

  // Load saved colors on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('vedika_custom_avatar_colors');
        const saved = localStorage.getItem('vedika_custom_avatar_colors_v2');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length === 4) {
            setColors(parsed);
            parsed.forEach((c, i) => {
              window.dispatchEvent(
                new CustomEvent('vedika_avatar_color_change', {
                  detail: { index: i, hex: c },
                })
              );
            });
          }
        }
      } catch (e) {}
    }
  }, []);

  const updateColor = useCallback((index, newHex) => {
    setColors((prev) => {
      const next = [...prev];
      next[index] = newHex;
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('vedika_custom_avatar_colors_v2', JSON.stringify(next));
        } catch (e) {}
        window.dispatchEvent(
          new CustomEvent('vedika_avatar_color_change', {
            detail: { index, hex: newHex },
          })
        );
      }
      return next;
    });
  }, []);

  const currentColor = colors[activeTab] || '#39FF14';
  const rgb = hexToRgb(currentColor);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

  const handleHexChange = (e) => {
    let val = e.target.value;
    if (!val.startsWith('#')) val = '#' + val;
    if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
      updateColor(activeTab, val);
    }
  };

  const handleRgbChange = (channel, val) => {
    const nextRgb = { ...rgb, [channel]: Number(val) };
    const hex = rgbToHex(nextRgb.r, nextRgb.g, nextRgb.b);
    updateColor(activeTab, hex);
  };

  const handleHslChange = (channel, val) => {
    const nextHsl = { ...hsl, [channel]: Number(val) };
    const nextRgb = hslToRgb(nextHsl.h, nextHsl.s, nextHsl.l);
    const hex = rgbToHex(nextRgb.r, nextRgb.g, nextRgb.b);
    updateColor(activeTab, hex);
  };

  const handleCopyConfig = () => {
    const configText = `1. Avatar 1 (Purple): ${colors[0]}\n2. Avatar 2: ${colors[1]}\n3. Avatar 3: ${colors[2]}\n4. Avatar 4: ${colors[3]}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(configText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  return (
    <div className="avatar-color-tuner" style={{ '--active-color': currentColor }}>
      {!isOpen ? (
        <button
          type="button"
          className="act-toggle-btn"
          onClick={() => setIsOpen(true)}
          title="Open Avatar Color Tuner"
        >
          <Palette size={16} className="text-purple-400" />
          <span>Tune Avatar Colors</span>
        </button>
      ) : (
        <div className="act-panel">
          {/* Header */}
          <div className="act-header">
            <div className="act-title">
              <Palette size={18} className="text-purple-400" />
              <span>Avatar Color Tuner</span>
            </div>
            <button
              type="button"
              className="act-close-btn"
              onClick={() => setIsOpen(false)}
              title="Close"
            >
              <X size={15} />
            </button>
          </div>

          {/* 4 Avatar Tabs */}
          <div className="act-tabs">
            {DEFAULT_AVATARS.map((av, idx) => (
              <button
                key={av.id}
                type="button"
                className={`act-tab ${activeTab === idx ? 'active' : ''}`}
                onClick={() => setActiveTab(idx)}
                style={{ '--active-color': colors[idx] }}
              >
                <div
                  className="act-tab-preview"
                  style={{ backgroundColor: colors[idx] }}
                />
                <span className="act-tab-label">{av.name}</span>
              </button>
            ))}
          </div>

          {/* Body */}
          <div className="act-body">
            {/* Visual Color Picker & Hex Input */}
            <div className="act-row-main">
              <div
                className="act-color-picker-wrap"
                style={{ backgroundColor: currentColor }}
              >
                <input
                  type="color"
                  className="act-color-picker-input"
                  value={currentColor.length === 7 ? currentColor : '#39FF14'}
                  onChange={(e) => updateColor(activeTab, e.target.value)}
                />
              </div>

              <div className="act-hex-wrap">
                <span className="act-label">Hex Color</span>
                <input
                  type="text"
                  className="act-hex-input"
                  value={currentColor}
                  onChange={handleHexChange}
                  maxLength={7}
                  spellCheck={false}
                />
              </div>

              {/* Mode Toggle (RGB / HSL) */}
              <button
                type="button"
                className="act-close-btn"
                onClick={() => setMode(mode === 'rgb' ? 'hsl' : 'rgb')}
                title={`Switch to ${mode === 'rgb' ? 'HSL' : 'RGB'} Sliders`}
                style={{ width: 'auto', padding: '0 8px', fontSize: '0.72rem', fontWeight: 800 }}
              >
                {mode.toUpperCase()}
              </button>
            </div>

            {/* Sliders (RGB or HSL) */}
            <div className="act-sliders-group">
              {mode === 'rgb' ? (
                <>
                  <div className="act-slider-row">
                    <span>R</span>
                    <input
                      type="range"
                      min="0"
                      max="255"
                      value={rgb.r}
                      onChange={(e) => handleRgbChange('r', e.target.value)}
                    />
                    <span className="act-slider-val">{rgb.r}</span>
                  </div>
                  <div className="act-slider-row">
                    <span>G</span>
                    <input
                      type="range"
                      min="0"
                      max="255"
                      value={rgb.g}
                      onChange={(e) => handleRgbChange('g', e.target.value)}
                    />
                    <span className="act-slider-val">{rgb.g}</span>
                  </div>
                  <div className="act-slider-row">
                    <span>B</span>
                    <input
                      type="range"
                      min="0"
                      max="255"
                      value={rgb.b}
                      onChange={(e) => handleRgbChange('b', e.target.value)}
                    />
                    <span className="act-slider-val">{rgb.b}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="act-slider-row">
                    <span>H</span>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      value={hsl.h}
                      onChange={(e) => handleHslChange('h', e.target.value)}
                    />
                    <span className="act-slider-val">{hsl.h}°</span>
                  </div>
                  <div className="act-slider-row">
                    <span>S</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={hsl.s}
                      onChange={(e) => handleHslChange('s', e.target.value)}
                    />
                    <span className="act-slider-val">{hsl.s}%</span>
                  </div>
                  <div className="act-slider-row">
                    <span>L</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={hsl.l}
                      onChange={(e) => handleHslChange('l', e.target.value)}
                    />
                    <span className="act-slider-val">{hsl.l}%</span>
                  </div>
                </>
              )}
            </div>

            {/* Quick Preset Color Palette Chips */}
            <div>
              <span className="act-label" style={{ display: 'block', marginBottom: '6px' }}>
                Preset Colors
              </span>
              <div className="act-presets">
                {PRESETS.map((p) => (
                  <div
                    key={p}
                    className="act-chip"
                    style={{ backgroundColor: p, color: p }}
                    onClick={() => updateColor(activeTab, p)}
                    title={p}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Footer Copy Button */}
          <div className="act-footer">
            <button
              type="button"
              className={`act-copy-btn ${copied ? 'copied' : ''}`}
              onClick={handleCopyConfig}
            >
              {copied ? (
                <>
                  <Check size={16} />
                  <span>Colors Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy size={16} />
                  <span>Copy Values for Antigravity</span>
                </>
              )}
            </button>
            <span className="act-hint">
              Changes update live in 3D. Click copy and paste the values into the chat!
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
