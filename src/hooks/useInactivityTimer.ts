import { useEffect } from 'react';
import { useSessionStore } from '@/stores/useSessionStore';

export function useInactivityTimer() {
  const recordActivity = useSessionStore((s) => s.recordActivity);
  const lifecycle = useSessionStore((s) => s.lifecycle);

  useEffect(() => {
    if (lifecycle !== 'ACTIVE_SESSION') return;

    let lastRecord = Date.now();
    const handleActivity = () => {
      const now = Date.now();
      // Throttle records to once every 2 seconds
      if (now - lastRecord > 2000) {
        lastRecord = now;
        recordActivity();
      }
    };

    window.addEventListener('mousemove', handleActivity, { passive: true });
    window.addEventListener('mousedown', handleActivity, { passive: true });
    window.addEventListener('keydown', handleActivity, { passive: true });
    window.addEventListener('touchstart', handleActivity, { passive: true });
    window.addEventListener('wheel', handleActivity, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('mousedown', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('wheel', handleActivity);
    };
  }, [lifecycle, recordActivity]);
}
