'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export function useDesktopPetBridge() {
  const router = useRouter();
  const pathname = usePathname();
  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const currentContextRef = useRef({});

  const connectBridge = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      // Connect directly to local Desktop Pet PySide6 QWebSocketServer on port 8765
      const wsUrl = 'ws://127.0.0.1:8765';
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('[DesktopPetBridge] Connected to local Desktop Pet event bridge');
        // Resend active context on open
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
        } catch (err) {
          console.error('[DesktopPetBridge] Message parse error:', err);
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
        // Auto reconnect every 5s if desktop pet bridge drops
        reconnectTimerRef.current = setTimeout(connectBridge, 5000);
      };

      ws.onerror = () => {
        ws.close();
      };

      wsRef.current = ws;
    } catch (e) {
      console.warn('[DesktopPetBridge] Connection attempt notice:', e);
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
      wsRef.current.send(JSON.stringify({
        type: 'WEBAPP_STATE_UPDATE',
        payload: updated
      }));
    }
  }, [pathname]);

  const notifyStuck = useCallback((puzzleTitle, durationSeconds = 180) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'PUZZLE_STUCK',
        payload: {
          puzzleTitle,
          durationSeconds,
          activeRoute: pathname,
          timestamp: Date.now()
        }
      }));
    }
  }, [pathname]);

  return {
    sendStateUpdate,
    notifyStuck
  };
}
