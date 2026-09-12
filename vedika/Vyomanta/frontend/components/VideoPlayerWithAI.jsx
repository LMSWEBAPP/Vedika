'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, RotateCcw, RotateCw, Bot } from 'lucide-react';
import { T } from '@/lib/lms-data';

function formatTime(seconds) {
  const total = Math.max(0, Math.floor(seconds || 0));
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function VideoPlayerWithAI({
  videoId,
  onExplainRequested,
  onTimeUpdate,
  seekTime,
  onSeekComplete,
  forcePause
}) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const intervalRef = useRef(null);
  const progressBarRef = useRef(null);
  const isDraggingRef = useRef(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [scrubTime, setScrubTime] = useState(null);
  const [duration, setDuration] = useState(0);
  const [isApiReady, setIsApiReady] = useState(false);
  const [isHoveringBar, setIsHoveringBar] = useState(false);
  const [hoverTime, setHoverTime] = useState(null);
  const [hoverX, setHoverX] = useState(0);

  const onTimeUpdateRef = useRef(onTimeUpdate);
  useEffect(() => {
    onTimeUpdateRef.current = onTimeUpdate;
  }, [onTimeUpdate]);

  // 1. Load YouTube Iframe API once
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (window.YT && window.YT.Player) {
      setIsApiReady(true);
      return;
    }

    const existingScript = document.getElementById('youtube-iframe-api');
    if (!existingScript) {
      const tag = document.createElement('script');
      tag.id = 'youtube-iframe-api';
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
    }

    const prevCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (prevCallback) prevCallback();
      setIsApiReady(true);
    };
  }, []);

  // 2. Initialize YT.Player
  useEffect(() => {
    if (!isApiReady || !videoId || !containerRef.current) return;

    if (playerRef.current && typeof playerRef.current.destroy === 'function') {
      try {
        playerRef.current.destroy();
      } catch (e) {}
      playerRef.current = null;
    }

    const elementId = `yt-player-${videoId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
    let playerEl = document.getElementById(elementId);
    if (!playerEl) {
      playerEl = document.createElement('div');
      playerEl.id = elementId;
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(playerEl);
    }

    try {
      playerRef.current = new window.YT.Player(elementId, {
        videoId,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 0,
          controls: 0, // Clean custom controls
          disablekb: 0,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          iv_load_policy: 3,
          playsinline: 1,
          enablejsapi: 1,
          fs: 0,
          origin: typeof window !== 'undefined' ? window.location.origin : undefined
        },
        events: {
          onReady: (event) => {
            const dur = event.target.getDuration();
            if (dur) setDuration(dur);
          },
          onStateChange: (event) => {
            // YT.PlayerState: PLAYING = 1, PAUSED = 2
            if (event.data === 1) {
              setIsPlaying(true);
              if (onTimeUpdateRef.current) onTimeUpdateRef.current(event.target.getCurrentTime() || 0, false);
            } else if (event.data === 2) {
              setIsPlaying(false);
              const pausedSecs = event.target.getCurrentTime() || 0;
              setCurrentTime(pausedSecs);
              if (onTimeUpdateRef.current) onTimeUpdateRef.current(pausedSecs, true);
            } else {
              setIsPlaying(false);
            }
          }
        }
      });
    } catch (err) {
      console.error('Failed to init YT.Player:', err);
    }

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (isDraggingRef.current) return; // Don't overwrite during live scrub drag
      if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
        try {
          const time = playerRef.current.getCurrentTime();
          if (typeof time === 'number') {
            setCurrentTime(time);
            const state = typeof playerRef.current.getPlayerState === 'function' ? playerRef.current.getPlayerState() : -1;
            const isPaused = state === 2;
            if (onTimeUpdateRef.current) onTimeUpdateRef.current(time, isPaused);
          }
          const dur = playerRef.current.getDuration();
          if (typeof dur === 'number' && dur > 0) {
            setDuration(dur);
          }
        } catch (e) {}
      }
    }, 250);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        try {
          playerRef.current.destroy();
        } catch (e) {}
      }
    };
  }, [isApiReady, videoId]);

  // Handle external seek requests
  useEffect(() => {
    if (seekTime !== undefined && seekTime !== null && playerRef.current) {
      try {
        if (typeof playerRef.current.seekTo === 'function') {
          playerRef.current.seekTo(seekTime, true);
          setCurrentTime(seekTime);
        }
      } catch (err) {}
      if (onSeekComplete) onSeekComplete();
    }
  }, [seekTime, onSeekComplete]);

  // Handle external forcePause requests
  useEffect(() => {
    if (forcePause && playerRef.current && typeof playerRef.current.pauseVideo === 'function') {
      try {
        playerRef.current.pauseVideo();
        setIsPlaying(false);
      } catch (e) {}
    }
  }, [forcePause]);

  const handleTogglePlay = useCallback(() => {
    if (!playerRef.current) return;
    try {
      if (isPlaying) {
        playerRef.current.pauseVideo();
        setIsPlaying(false);
      } else {
        playerRef.current.playVideo();
        setIsPlaying(true);
      }
    } catch (e) {}
  }, [isPlaying]);

  const handleSeekDelta = useCallback((delta) => {
    if (!playerRef.current) return;
    try {
      const current = playerRef.current.getCurrentTime() || currentTime;
      const target = Math.max(0, Math.min(duration || Infinity, current + delta));
      playerRef.current.seekTo(target, true);
      setCurrentTime(target);
    } catch (e) {}
  }, [currentTime, duration]);

  // Helper to compute time from progress bar coordinate
  const getTimeFromEvent = useCallback((e) => {
    if (!progressBarRef.current || !duration) return 0;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clickX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const ratio = clickX / rect.width;
    return ratio * duration;
  }, [duration]);

  // Smooth Scrubber Dragging System
  const handleScrubberStart = useCallback((e) => {
    e.preventDefault();
    if (!progressBarRef.current || !duration) return;
    isDraggingRef.current = true;
    const newTime = getTimeFromEvent(e);
    setScrubTime(newTime);

    const handleGlobalMove = (moveEvent) => {
      if (!isDraggingRef.current) return;
      const t = getTimeFromEvent(moveEvent);
      setScrubTime(t);
      if (progressBarRef.current) {
        const rect = progressBarRef.current.getBoundingClientRect();
        const clientX = moveEvent.touches ? moveEvent.touches[0].clientX : moveEvent.clientX;
        const pos = Math.max(0, Math.min(rect.width, clientX - rect.left));
        setHoverX(pos);
        setHoverTime(t);
      }
    };

    const handleGlobalEnd = (endEvent) => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      const finalTime = getTimeFromEvent(endEvent);
      setScrubTime(null);
      setCurrentTime(finalTime);
      if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
        playerRef.current.seekTo(finalTime, true);
      }
      window.removeEventListener('mousemove', handleGlobalMove);
      window.removeEventListener('mouseup', handleGlobalEnd);
      window.removeEventListener('touchmove', handleGlobalMove);
      window.removeEventListener('touchend', handleGlobalEnd);
    };

    window.addEventListener('mousemove', handleGlobalMove);
    window.addEventListener('mouseup', handleGlobalEnd);
    window.addEventListener('touchmove', handleGlobalMove);
    window.addEventListener('touchend', handleGlobalEnd);
  }, [duration, getTimeFromEvent]);

  const handleScrubberMouseMove = useCallback((e) => {
    if (!progressBarRef.current || !duration) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    setHoverX(pos);
    setHoverTime((pos / rect.width) * duration);
  }, [duration]);

  const activeDisplayTime = scrubTime !== null ? scrubTime : currentTime;
  const progressPercent = duration > 0 ? (activeDisplayTime / duration) * 100 : 0;
  const isInteractingWithBar = isHoveringBar || isDraggingRef.current;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      background: '#0B0F19',
      overflow: 'hidden',
      height: '100%',
      minHeight: 0,
      width: '100%'
    }}>
      {/* Video Canvas Frame with YouTube Header & Watermark Clipping */}
      <div style={{
        position: 'relative',
        width: '100%',
        flex: 1,
        minHeight: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#000000',
        overflow: 'hidden',
        userSelect: 'none'
      }}>
        <div style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '16 / 9',
          maxHeight: '100%',
          background: '#000000',
          overflow: 'hidden'
        }}>
          {/* Scaled/offset viewport to conceal YouTube top title bar and bottom-right logo */}
          <div style={{
            position: 'absolute',
            top: '-7%',
            left: '-2%',
            width: '104%',
            height: '115%',
            pointerEvents: 'none' // Prevents clicking YouTube's external links
          }}>
            <div
              ref={containerRef}
              style={{
                width: '100%',
                height: '100%'
              }}
            />
          </div>

          {/* Fallback iframe */}
          {!isApiReady && (
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&controls=0&modestbranding=1&rel=0`}
              title="Course Video"
              style={{
                position: 'absolute',
                top: '-7%',
                left: '-2%',
                width: '104%',
                height: '115%',
                border: 0,
                pointerEvents: 'none'
              }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}

          {/* Transparent click-to-play overlay - user stays in LMS and controls playback directly */}
          <div
            onClick={handleTogglePlay}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              zIndex: 10,
              cursor: 'pointer'
            }}
          />
        </div>
      </div>

      {/* Ultra-Smooth Video Scrubber Progress Bar */}
      <div
        ref={progressBarRef}
        onMouseDown={handleScrubberStart}
        onTouchStart={handleScrubberStart}
        onMouseMove={handleScrubberMouseMove}
        onMouseEnter={() => setIsHoveringBar(true)}
        onMouseLeave={() => {
          setIsHoveringBar(false);
          setHoverTime(null);
        }}
        style={{
          position: 'relative',
          width: '100%',
          height: isInteractingWithBar ? 8 : 4,
          background: 'rgba(255, 255, 255, 0.12)',
          cursor: 'pointer',
          transition: 'height 0.12s ease'
        }}
      >
        {/* Played Progress Track */}
        <div style={{
          height: '100%',
          width: `${progressPercent}%`,
          background: 'linear-gradient(90deg, #3B82F6 0%, #60A5FA 100%)',
          position: 'relative',
          pointerEvents: 'none'
        }}>
          {/* Scrubber Knob */}
          <div style={{
            position: 'absolute',
            right: -6,
            top: '50%',
            transform: 'translateY(-50%)',
            width: isInteractingWithBar ? 14 : 8,
            height: isInteractingWithBar ? 14 : 8,
            borderRadius: '50%',
            background: '#FFFFFF',
            boxShadow: '0 0 10px rgba(96, 165, 250, 0.9)',
            opacity: isInteractingWithBar ? 1 : 0.85,
            transition: isDraggingRef.current ? 'none' : 'width 0.12s, height 0.12s'
          }} />
        </div>

        {/* Hover Time Tooltip */}
        {hoverTime !== null && (
          <div style={{
            position: 'absolute',
            bottom: 14,
            left: hoverX,
            transform: 'translateX(-50%)',
            padding: '3px 8px',
            borderRadius: 6,
            background: 'rgba(11, 15, 25, 0.95)',
            color: '#FFFFFF',
            fontSize: 11,
            fontFamily: 'monospace',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            zIndex: 30
          }}>
            {formatTime(hoverTime)}
          </div>
        )}
      </div>

      {/* Ultra-Sleek Minimalist Video Control Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '10px 18px',
        background: '#0B0F19',
        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        color: '#FFFFFF'
      }}>
        {/* Left Controls: Play/Pause, -5s, +5s, Digital Clock */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Play/Pause Button */}
          <button
            type="button"
            onClick={handleTogglePlay}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: isPlaying ? 'rgba(255, 255, 255, 0.08)' : '#2563EB',
              color: '#FFFFFF',
              border: 'none',
              cursor: 'pointer',
              boxShadow: isPlaying ? 'none' : '0 2px 10px rgba(37, 99, 235, 0.4)',
              transition: 'all 0.15s ease'
            }}
            title={isPlaying ? 'Pause video' : 'Play video'}
          >
            {isPlaying ? (
              <Pause size={15} style={{ fill: '#FFFFFF' }} />
            ) : (
              <Play size={15} style={{ fill: '#FFFFFF', marginLeft: 2 }} />
            )}
          </button>

          {/* Quick Skip -5s */}
          <button
            type="button"
            onClick={() => handleSeekDelta(-5)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '6px 9px',
              borderRadius: 8,
              background: 'transparent',
              color: '#94A3B8',
              fontSize: 11.5,
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#FFFFFF';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#94A3B8';
              e.currentTarget.style.background = 'transparent';
            }}
            title="Rewind 5 seconds"
          >
            <RotateCcw size={14} />
            <span style={{ fontFamily: 'monospace' }}>-5s</span>
          </button>

          {/* Quick Skip +5s */}
          <button
            type="button"
            onClick={() => handleSeekDelta(5)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '6px 9px',
              borderRadius: 8,
              background: 'transparent',
              color: '#94A3B8',
              fontSize: 11.5,
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#FFFFFF';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#94A3B8';
              e.currentTarget.style.background = 'transparent';
            }}
            title="Forward 5 seconds"
          >
            <RotateCw size={14} />
            <span style={{ fontFamily: 'monospace' }}>+5s</span>
          </button>

          {/* Digital Clock Time Counter */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            paddingLeft: 8,
            borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
            fontSize: 12,
            fontFamily: 'monospace',
            color: '#CBD5E1',
            letterSpacing: '0.02em'
          }}>
            <span style={{ fontWeight: 600, color: '#F1F5F9' }}>{formatTime(activeDisplayTime)}</span>
            {duration > 0 && (
              <>
                <span style={{ color: '#475569' }}>/</span>
                <span style={{ color: '#64748B' }}>{formatTime(duration)}</span>
              </>
            )}
          </div>
        </div>

        {/* Right Side: Elegant "Ask Vedika at MM:SS" Action Button */}
        <button
          type="button"
          onClick={() => {
            if (playerRef.current && isPlaying) {
              playerRef.current.pauseVideo();
              setIsPlaying(false);
            }
            if (onExplainRequested) onExplainRequested(activeDisplayTime);
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            borderRadius: 9999,
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.18), rgba(217, 119, 6, 0.22))',
            border: '1px solid rgba(245, 158, 11, 0.45)',
            padding: '7px 15px',
            fontSize: 12,
            fontWeight: 600,
            color: '#FBBF24',
            cursor: 'pointer',
            flexShrink: 0,
            boxShadow: '0 2px 10px rgba(245, 158, 11, 0.12)',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(245, 158, 11, 0.28), rgba(217, 119, 6, 0.35))';
            e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.65)';
            e.currentTarget.style.boxShadow = '0 2px 14px rgba(245, 158, 11, 0.25)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(245, 158, 11, 0.18), rgba(217, 119, 6, 0.22))';
            e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.45)';
            e.currentTarget.style.boxShadow = '0 2px 10px rgba(245, 158, 11, 0.12)';
          }}
        >
          <Bot size={14} style={{ color: '#FCD34D' }} />
          <span>Ask Vedika at {formatTime(activeDisplayTime)}</span>
        </button>
      </div>
    </div>
  );
}
