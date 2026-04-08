import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../store/authStore';

/**
 * Custom hook to track active reading time for a specific content.
 * Uses a hybrid approach:
 * 1. 30s intervals for normal heartbeats.
 * 2. sendBeacon for final sync on page unload/visibility change.
 */
export const useReadingTimer = (contentId: string | number, minTimeSeconds: number = 30) => {
  const [seconds, setSeconds] = useState(0);
  const { token } = useAuthStore();
  const secondsRef = useRef(0);
  const lastSyncRef = useRef(Date.now());

  // String identifier for the backend (e.g., "sop:1")
  const contentKey = typeof contentId === 'string' ? contentId : `sop:${contentId}`;

  const syncData = (isBeacon = false) => {
    const secondsToSync = secondsRef.current;
    
    if (secondsToSync <= 0 && !isBeacon) return;

    // Use token in query param because sendBeacon doesn't support custom headers
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const url = `${apiUrl}/playlists/sync-reading?token_query=${token}`;
    
    const payload = JSON.stringify({
      content_id: contentKey,
      seconds: secondsToSync,
      final: isBeacon
    });

    if (isBeacon) {
      // Beacon is non-blocking and works on page close
      navigator.sendBeacon(url, payload);
    } else {
      // Normal fetch for periodic heartbeats
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload
      }).then(() => {
        // Only reset what was successfully synced
        secondsRef.current = 0;
        lastSyncRef.current = Date.now();
      }).catch(err => console.error('Tracking sync failed:', err));
    }
  };

  useEffect(() => {
    if (!contentId || !token) return;

    // Reset refs on content change
    secondsRef.current = 0;
    setSeconds(0);
    lastSyncRef.current = Date.now();

    const interval = setInterval(() => {
      // Only count if tab is visible to ensure "real" reading time
      if (document.visibilityState === 'visible') {
        secondsRef.current += 1;
        setSeconds(prev => prev + 1);
      }
    }, 1000);

    // Checkpoint every 30 seconds
    const syncInterval = setInterval(() => {
      syncData(false);
    }, 30000);

    // Visibility change handler (dispatches beacon when tab is hidden/closed)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        syncData(true);
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', () => syncData(true));

    return () => {
      clearInterval(interval);
      clearInterval(syncInterval);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      syncData(true); // Final sync on unmount
    };
  }, [contentKey, token]);

  return { 
    seconds, 
    isReady: seconds >= minTimeSeconds,
    remainingSeconds: Math.max(0, minTimeSeconds - seconds)
  };
};
