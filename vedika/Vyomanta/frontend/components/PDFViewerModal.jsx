'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ZoomIn, ZoomOut, RotateCw, Download, Maximize, Minimize } from 'lucide-react';
import { T } from '@/lib/lms-data';

const getGoogleDriveEmbedLink = (viewLink) => {
  if (!viewLink) return '';
  const fileIdMatch = viewLink.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (fileIdMatch) {
    const fileId = fileIdMatch[1];
    return `https://drive.google.com/file/d/${fileId}/preview`;
  }
  return viewLink;
};

const getGoogleDriveDirectLink = (viewLink) => {
  if (!viewLink) return '';
  const fileIdMatch = viewLink.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (fileIdMatch) {
    const fileId = fileIdMatch[1];
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
  }
  return viewLink;
};

export default function PDFViewerModal({ isOpen, onClose, pdfResource }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  const viewerRef = useRef(null);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );
      setIsFullscreen(isCurrentlyFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  if (!isOpen || !pdfResource) return null;

  const embedUrl = getGoogleDriveEmbedLink(pdfResource.file_link);

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (viewerRef.current?.requestFullscreen) {
        viewerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const handleDownload = () => {
    const dlLink = getGoogleDriveDirectLink(pdfResource.file_link);
    window.open(dlLink, '_blank');
  };

  return (
    <AnimatePresence>
      <div 
        ref={viewerRef}
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(7, 8, 15, 0.95)',
          backdropFilter: 'blur(12px)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          color: T.text,
          fontFamily: 'var(--font-outfit), sans-serif'
        }}
      >
        {/* Header Bar */}
        <div style={{
          padding: '16px 24px',
          borderBottom: `1px solid ${T.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: T.s1,
          zIndex: 10000
        }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: T.text }}>{pdfResource.name}</h2>
            <p style={{ fontSize: 12, color: T.muted, margin: '2px 0 0 0' }}>
              {pdfResource.category} · {pdfResource.subcategory}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Zoom Controls */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: T.s3,
              borderRadius: 8,
              padding: '2px 8px',
              border: `1px solid ${T.border}`
            }}>
              <button 
                onClick={() => setZoom(z => Math.max(z - 25, 50))} 
                style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: 8, display: 'flex' }}
              >
                <ZoomOut size={16} />
              </button>
              <span style={{ fontSize: 13, minWidth: 40, textAlign: 'center', fontWeight: 600 }}>{zoom}%</span>
              <button 
                onClick={() => setZoom(z => Math.min(z + 25, 200))} 
                style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: 8, display: 'flex' }}
              >
                <ZoomIn size={16} />
              </button>
            </div>

            {/* Rotation Control */}
            <button 
              onClick={() => setRotation(r => (r + 90) % 360)} 
              title="Rotate 90°"
              style={{
                background: T.s3, border: `1px solid ${T.border}`, color: '#fff', cursor: 'pointer',
                width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >
              <RotateCw size={16} />
            </button>

            {/* Download Button */}
            <button 
              onClick={handleDownload} 
              title="Download PDF"
              style={{
                background: T.accent, border: 'none', color: '#000', cursor: 'pointer',
                width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700
              }}
            >
              <Download size={16} />
            </button>

            {/* Fullscreen Button */}
            <button 
              onClick={toggleFullscreen} 
              title="Toggle Fullscreen"
              style={{
                background: T.s3, border: `1px solid ${T.border}`, color: '#fff', cursor: 'pointer',
                width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >
              {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
            </button>

            {/* Close Button */}
            <button 
              onClick={onClose} 
              title="Close Viewer"
              style={{
                background: 'rgba(245, 91, 107, 0.15)', border: `1px solid ${T.red}`, color: T.red, cursor: 'pointer',
                width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Viewer */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {isLoading && (
            <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, zIndex: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                border: `2px solid ${T.border}`, borderTopColor: T.accent, animation: 'spin 1s linear infinite'
              }} />
              <div style={{ fontSize: 13, color: T.muted }}>Loading preview...</div>
            </div>
          )}

          <iframe 
            src={embedUrl}
            onLoad={() => setIsLoading(false)}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
              transformOrigin: 'center center',
              transition: 'transform 0.2s ease-out'
            }}
            allow="autoplay; clipboard-write; encrypted-media; fullscreen"
          />
        </div>
      </div>
    </AnimatePresence>
  );
}
