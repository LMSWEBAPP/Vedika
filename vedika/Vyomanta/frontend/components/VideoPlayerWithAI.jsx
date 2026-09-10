'use client';

import { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, RotateCw, Sparkles } from 'lucide-react';

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

import { T } from '@/lib/lms-data';

export default function VideoPlayerWithAI({
  videoId,
  onExplainRequested,
  onTimeUpdate,
  seekTime,
  onSeekComplete
}) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const intervalRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isApiReady, setIsApiReady] = useState(false);
  const [justPausedAt, setJustPausedAt] = useState(null);

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
          controls: 0, // Disable native YouTube controls as requested
          disablekb: 1,
          modestbranding: 1,
          rel: 0,
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
              setJustPausedAt(null);
              if (onTimeUpdateRef.current) onTimeUpdateRef.current(event.target.getCurrentTime() || 0, false);
            } else if (event.data === 2) {
              setIsPlaying(false);
              const pausedSecs = event.target.getCurrentTime() || 0;
              setCurrentTime(pausedSecs);
              setJustPausedAt(pausedSecs);
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
    }, 300);

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
  }, [seekTime]);

  const handleTogglePlay = () => {
    if (!playerRef.current) return;
    try {
      if (isPlaying) {
        playerRef.current.pauseVideo();
      } else {
        playerRef.current.playVideo();
      }
    } catch (e) {}
  };

  const handleSeekDelta = (delta) => {
    if (!playerRef.current) return;
    try {
      const current = playerRef.current.getCurrentTime() || currentTime;
      const target = Math.max(0, Math.min(duration || Infinity, current + delta));
      playerRef.current.seekTo(target, true);
      setCurrentTime(target);
    } catch (e) {}
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      borderRadius: 16,
      border: `1px solid ${T.border}`,
      background: T.s1,
      overflow: 'hidden',
      boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.08)'
    }}>
      {/* Video Canvas Frame */}
      <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', background: '#000000' }}>
        <div ref={containerRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />

        {/* Fallback iframe */}
        {!isApiReady && (
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&controls=0`}
            title="YouTube video player"
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        )}

        {/* Overlay banner when paused (Moved button to the FAR RIGHT) */}
        {justPausedAt !== null && !isPlaying && (
          <div style={{
            position: 'absolute',
            bottom: 12,
            left: 12,
            right: 12,
            zIndex: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderRadius: 12,
            background: 'rgba(15, 23, 42, 0.90)',
            backdropFilter: 'blur(8px)',
            padding: '10px 16px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#FFFFFF',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                height: 10,
                width: 10,
                borderRadius: '50%',
                background: '#F59E0B',
                display: 'inline-block'
              }} />
              <span style={{ fontSize: 12, color: '#E2E8F0' }}>
                Paused at <strong style={{ color: '#FFFFFF', fontFamily: 'monospace', fontWeight: 600 }}>{formatTime(justPausedAt)}</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={() => onExplainRequested && onExplainRequested(justPausedAt)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                borderRadius: 8,
                background: T.accent,
                padding: '6px 14px',
                fontSize: 12,
                fontWeight: 600,
                color: '#FFFFFF',
                border: 'none',
                cursor: 'pointer',
                boxShadow: `0 4px 6px -1px ${T.accent}50`,
                flexShrink: 0
              }}
            >
              <Sparkles size={14} style={{ color: '#FCD34D' }} />
              Explain what is being taught here
            </button>
          </div>
        )}
      </div>

      {/* Companion Control Bar (Far Left controls, Far Right Explain button) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '10px 14px',
        background: T.s2,
        borderTop: `1px solid ${T.border}`,
        color: T.text
      }}>
        {/* Left Side Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={handleTogglePlay}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 8,
              background: T.accent,
              color: '#FFFFFF',
              fontSize: 12,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              boxShadow: `0 2px 4px ${T.accent}30`
            }}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} style={{ fill: '#FFFFFF' }} />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleSeekDelta(-5)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '6px 10px',
              borderRadius: 8,
              background: 'transparent',
              color: T.muted,
              fontSize: 12,
              border: 'none',
              cursor: 'pointer'
            }}
            title="Rewind 5 seconds"
          >
            <RotateCcw size={14} />
            <span style={{ fontFamily: 'monospace', fontSize: 11 }}>-5s</span>
          </button>

          <button
            type="button"
            onClick={() => handleSeekDelta(5)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '6px 10px',
              borderRadius: 8,
              background: 'transparent',
              color: T.muted,
              fontSize: 12,
              border: 'none',
              cursor: 'pointer'
            }}
            title="Forward 5 seconds"
          >
            <RotateCw size={14} />
            <span style={{ fontFamily: 'monospace', fontSize: 11 }}>+5s</span>
          </button>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            paddingLeft: 10,
            borderLeft: `1px solid ${T.border}`,
            fontSize: 12,
            fontFamily: 'monospace',
            color: T.text
          }}>
            <span style={{ fontWeight: 600, color: T.text }}>{formatTime(currentTime)}</span>
            {duration > 0 && (
              <>
                <span style={{ color: T.dim }}>/</span>
                <span style={{ color: T.muted }}>{formatTime(duration)}</span>
              </>
            )}
          </div>
        </div>

        {/* Right Side: Explain At MM:SS Button */}
        <button
          type="button"
          onClick={() => onExplainRequested && onExplainRequested(currentTime)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            borderRadius: 10,
            background: `${T.amber || '#F59E0B'}18`,
            border: `1px solid ${T.amber || '#F59E0B'}40`,
            padding: '6px 14px',
            fontSize: 12,
            fontWeight: 600,
            color: T.amber || '#D97706',
            cursor: 'pointer',
            flexShrink: 0
          }}
        >
          <Sparkles size={14} style={{ color: T.amber || '#F59E0B' }} />
          Explain At {formatTime(currentTime)}
        </button>
      </div>
    </div>
  );
}
