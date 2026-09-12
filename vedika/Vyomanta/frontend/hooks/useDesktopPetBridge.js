'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export function useDesktopPetBridge() {
  const router = useRouter();
  const pathname = usePathname();
  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const currentContextRef = useRef({});
  const [isPetConnected, setIsPetConnected] = useState(false);

  const connectBridge = useCallback(() => {
    if (typeof window === 'undefined') return;

    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      // Connect directly to local Desktop Pet PySide6 QWebSocketServer on port 8765
      const wsUrl = 'ws://127.0.0.1:8765';
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('[DesktopPetBridge] Connected to local Desktop Pet event bridge');
        setIsPetConnected(true);

        if (currentContextRef.current && currentContextRef.current.activeRoute) {
          ws.send(JSON.stringify({
            type: 'WEBAPP_STATE_UPDATE',
            payload: currentContextRef.current
          }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle navigation commands requested by Desktop Pet voice tools
          if (data.type === 'NAVIGATE_WEBAPP' && data.payload?.route) {
            console.log('[DesktopPetBridge] Remote navigation received:', data.payload.route);
            router.push(data.payload.route);
          }

          // Handle hint trigger requested by Desktop Pet voice tools
          if (data.type === 'TRIGGER_HINT') {
            console.log('[DesktopPetBridge] Remote hint trigger received');
            window.dispatchEvent(new CustomEvent('vedika-pet-trigger-hint', { detail: data.payload }));
          }

          // Handle action trigger requested by Desktop Pet voice tools
          if (data.type === 'PET_ACTION_REQUESTED') {
            console.log('[DesktopPetBridge] Remote pet action received:', data.payload);
            window.dispatchEvent(new CustomEvent('vedika-pet-action', { detail: data.payload }));
          }

          // Handle note added via Desktop Pet voice tool or remote sync
          if (data.type === 'STUDY_NOTE_ADDED') {
            console.log('[DesktopPetBridge] Study note added from pet:', data.payload);
            window.dispatchEvent(new CustomEvent('vedika-study-note-added', { detail: data.payload }));
          }

          // Handle note updated (accumulated) via Desktop Pet voice tool
          if (data.type === 'STUDY_NOTE_UPDATED') {
            console.log('[DesktopPetBridge] Study note updated from pet:', data.payload);
            window.dispatchEvent(new CustomEvent('vedika-study-note-updated', { detail: data.payload }));
          }

          // Handle notes list received from desktop pet SQLite database
          if (data.type === 'STUDY_NOTES_LIST') {
            console.log('[DesktopPetBridge] Study notes list received from pet:', data.payload);
            window.dispatchEvent(new CustomEvent('vedika-study-notes-list', { detail: data.payload }));
          }

          // Handle note deleted
          if (data.type === 'STUDY_NOTE_DELETED') {
            console.log('[DesktopPetBridge] Study note deleted:', data.payload);
            window.dispatchEvent(new CustomEvent('vedika-study-note-deleted', { detail: data.payload }));
          }

          // Handle Ask Vedika acknowledgment
          if (data.type === 'ASK_VEDIKA_ACKNOWLEDGED') {
            console.log('[DesktopPetBridge] Ask Vedika acknowledged by pet:', data.payload);
            window.dispatchEvent(new CustomEvent('vedika-ask-acknowledged', { detail: data.payload }));
          }
        } catch (err) {
          console.error('[DesktopPetBridge] Message parse error:', err);
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
        setIsPetConnected(false);
        // Retry connection every 6 seconds to detect when Python main.py starts up
        if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = setTimeout(connectBridge, 6000);
      };

      ws.onerror = () => {
        setIsPetConnected(false);
        if (ws) {
          try { ws.close(); } catch (_) {}
        }
      };

      wsRef.current = ws;
    } catch (e) {
      setIsPetConnected(false);
    }
  }, [router]);

  useEffect(() => {
    connectBridge();
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connectBridge]);

  const sendStateUpdate = useCallback((context) => {
    const updated = {
      activeRoute: pathname,
      timestamp: Date.now(),
      ...context
    };
    currentContextRef.current = updated;

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({
          type: 'WEBAPP_STATE_UPDATE',
          payload: updated
        }));
      } catch (_) {}
    }
  }, [pathname]);

  const askVedikaVideoMoment = useCallback((momentContext) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({
          type: 'ASK_VEDIKA_VIDEO_MOMENT',
          payload: {
            activeRoute: pathname,
            timestamp: Date.now(),
            ...momentContext
          }
        }));
        return true;
      } catch (_) {
        return false;
      }
    }
    return false;
  }, [pathname]);

  const saveStudyNote = useCallback((noteData) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({
          type: 'SAVE_STUDY_NOTE',
          payload: noteData
        }));
        return true;
      } catch (_) {
        return false;
      }
    }
    return false;
  }, []);

  const getStudyNotes = useCallback((filter = {}) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({
          type: 'GET_STUDY_NOTES',
          payload: filter
        }));
        return true;
      } catch (_) {
        return false;
      }
    }
    return false;
  }, []);

  const deleteStudyNote = useCallback((noteId) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({
          type: 'DELETE_STUDY_NOTE',
          payload: { id: noteId }
        }));
        return true;
      } catch (_) {
        return false;
      }
    }
    return false;
  }, []);

  const notifyStuck = useCallback((puzzleTitle, durationSeconds = 180) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({
          type: 'PUZZLE_STUCK',
          payload: {
            puzzleTitle,
            durationSeconds,
            activeRoute: pathname,
            timestamp: Date.now()
          }
        }));
      } catch (_) {}
    }
  }, [pathname]);

  return {
    isPetConnected,
    sendStateUpdate,
    askVedikaVideoMoment,
    saveStudyNote,
    getStudyNotes,
    deleteStudyNote,
    notifyStuck
  };
}
