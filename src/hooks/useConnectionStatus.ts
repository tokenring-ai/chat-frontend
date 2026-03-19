import { useState, useEffect, useCallback } from 'react';

export function useConnectionStatus(staleThresholdMs = 30000) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [isStale, setIsStale] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Update stale status periodically
    const interval = setInterval(() => {
      setIsStale(Date.now() - lastActivity > staleThresholdMs);
    }, 1000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [lastActivity, staleThresholdMs]);

  const recordActivity = useCallback(() => {
    setLastActivity(Date.now());
    setIsStale(false);
  }, []);

  return {
    isOnline,
    isStale,
    lastActivity,
    recordActivity
  };
}