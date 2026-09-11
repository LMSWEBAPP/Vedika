'use client';

import { useState } from 'react';

/**
 * Temporary floating live control to adjust Butterfly size, revolving radius, and height in real-time.
 */
export default function ButterflySizeControl({
  initialSize = 1.0,
  initialRadius = 1.95,
  initialHeight = 1.70,
  onSizeChange,
  onRadiusChange,
  onHeightChange,
}) {
  const [size, setSize] = useState(initialSize);
  const [radius, setRadius] = useState(initialRadius);
  const [height, setHeight] = useState(initialHeight);
  const [copied, setCopied] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const handleSizeChange = (e) => {
    const val = parseFloat(e.target.value);
    setSize(val);
    if (onSizeChange) onSizeChange(val);
  };

  const handleRadiusChange = (e) => {
    const val = parseFloat(e.target.value);
    setRadius(val);
    if (onRadiusChange) onRadiusChange(val);
  };

  const handleHeightChange = (e) => {
    const val = parseFloat(e.target.value);
    setHeight(val);
    if (onHeightChange) onHeightChange(val);
  };

  const handleCopy = () => {
    const jsonStr = JSON.stringify(
      {
        butterfly: {
          size: parseFloat(size.toFixed(2)),
          radius: parseFloat(radius.toFixed(2)),
          height: parseFloat(height.toFixed(2)),
        },
      },
      null,
      2
    );
    if (navigator.clipboard) {
      navigator.clipboard.writeText(jsonStr).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  const handleReset = () => {
    setSize(1.0);
    setRadius(1.95);
    setHeight(1.70);
    if (onSizeChange) onSizeChange(1.0);
    if (onRadiusChange) onRadiusChange(1.95);
    if (onHeightChange) onHeightChange(1.70);
  };

  return (
    <div className="butterfly-control-container">
      {isMinimized ? (
        <button
          className="butterfly-control-minibtn"
          onClick={() => setIsMinimized(false)}
          title="Open Butterfly Orbit Controls"
        >
          🦋 <span>Size {size.toFixed(2)}x · R {radius.toFixed(2)}m</span>
        </button>
      ) : (
        <div className="butterfly-control-card">
          <div className="butterfly-control-header">
            <div className="butterfly-control-title">
              <span className="butterfly-icon">🦋</span>
              <span>Butterfly Orbit Controls</span>
              <span className="butterfly-tag">Temporary</span>
            </div>
            <div className="butterfly-header-actions">
              <button
                className="butterfly-btn-icon"
                onClick={() => setIsMinimized(true)}
                title="Minimize"
              >
                —
              </button>
            </div>
          </div>

          <div className="butterfly-control-body">
            {/* 1. Size Slider */}
            <div className="butterfly-row">
              <div className="butterfly-label-row">
                <span className="butterfly-label">Butterfly Size</span>
                <span className="butterfly-val">{size.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="2.5"
                step="0.05"
                value={size}
                onChange={handleSizeChange}
                className="butterfly-slider"
              />
              <div className="butterfly-ticks">
                <span>0.2x</span>
                <span>1.0x (Default)</span>
                <span>2.5x</span>
              </div>
            </div>

            {/* 2. Revolving Radius Slider */}
            <div className="butterfly-row">
              <div className="butterfly-label-row">
                <span className="butterfly-label">Revolving Radius</span>
                <span className="butterfly-val">{radius.toFixed(2)}m</span>
              </div>
              <input
                type="range"
                min="1.2"
                max="3.0"
                step="0.05"
                value={radius}
                onChange={handleRadiusChange}
                className="butterfly-slider"
              />
              <div className="butterfly-ticks">
                <span>1.2m (Close)</span>
                <span>1.95m (Safe)</span>
                <span>3.0m (Wide)</span>
              </div>
            </div>

            {/* 3. Orbit Height Slider */}
            <div className="butterfly-row">
              <div className="butterfly-label-row">
                <span className="butterfly-label">Orbit Height (Y)</span>
                <span className="butterfly-val">{height.toFixed(2)}m</span>
              </div>
              <input
                type="range"
                min="1.1"
                max="2.5"
                step="0.05"
                value={height}
                onChange={handleHeightChange}
                className="butterfly-slider"
              />
              <div className="butterfly-ticks">
                <span>1.1m (Crown)</span>
                <span>1.70m (Above)</span>
                <span>2.5m (High)</span>
              </div>
            </div>

            <div className="butterfly-hint">
              Surface deflection active: butterflies deflect outward & upward if nearing avatar surface and gracefully realign in rotation.
            </div>

            <div className="butterfly-actions">
              <button
                className={`butterfly-btn ${copied ? 'copied' : ''}`}
                onClick={handleCopy}
              >
                {copied ? '✓ Copied JSON!' : '📋 Copy JSON'}
              </button>
              <button className="butterfly-btn reset" onClick={handleReset}>
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
