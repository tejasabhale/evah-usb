import { useEffect } from 'react';
import { useSessionStore } from '@/stores/useSessionStore';
import { useWindowStore } from '@/stores/useWindowStore';

export function useKeyboardShortcuts() {
  const lifecycle = useSessionStore((s) => s.lifecycle);
  const panicLock = useSessionStore((s) => s.panicLock);
  const openWindow = useWindowStore((s) => s.openWindow);
  const closeWindow = useWindowStore((s) => s.closeWindow);
  const activeWindowId = useWindowStore((s) => s.activeWindowId);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Emergency Panic Lock shortcut (Ctrl + Shift + L) - active across any state
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyL') {
        e.preventDefault();
        panicLock();
        return;
      }

      // App launching shortcuts only in active session
      if (lifecycle !== 'ACTIVE_SESSION') return;

      // Terminal: Ctrl + Alt + T
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.code === 'KeyT') {
        e.preventDefault();
        openWindow('terminal');
        return;
      }

      // Files: Ctrl + Shift + F
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyF') {
        e.preventDefault();
        openWindow('files');
        return;
      }

      // Browser: Ctrl + Shift + B
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyB') {
        e.preventDefault();
        openWindow('browser');
        return;
      }

      // Vault: Ctrl + Shift + V
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyV') {
        e.preventDefault();
        openWindow('vault');
        return;
      }

      // Esc: Close active window if not focused in input
      if (e.key === 'Escape') {
        const target = e.target as HTMLElement;
        const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');
        if (!isInput && activeWindowId) {
          // Esc cancels/closes
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lifecycle, panicLock, openWindow, closeWindow, activeWindowId]);
}
