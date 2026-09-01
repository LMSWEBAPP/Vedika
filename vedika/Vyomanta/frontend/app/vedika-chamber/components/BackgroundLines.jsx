'use client';

import React from 'react';
import './BackgroundLines.css';

/**
 * BackgroundLines — Futuristic animated vertical dropping light lines
 * Inspired by https://codepen.io/osorina/pen/PQdMOO
 */
export default function BackgroundLines() {
  return (
    <div className="vchamber-lines-container" aria-hidden="true">
      <div className="vchamber-line" />
      <div className="vchamber-line" />
      <div className="vchamber-line" />
      <div className="vchamber-line" />
      <div className="vchamber-line" />
      <div className="vchamber-line" />
    </div>
  );
}
