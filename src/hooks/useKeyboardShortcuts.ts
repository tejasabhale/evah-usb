import { useEffect } from 'react';
import { useSessionStore } from '@/stores/useSessionStore';
import { useWindowStore } from '@/stores/useWindowStore';
import { ShortcutRegistry } from '@/services/shortcuts/ShortcutRegistry';

export function useKeyboardShortcuts() {
  const lifecycle = useSessionStore((s) => s.lifecycle);
  const panicLock = useSessionStore((s) => s.panicLock);
  const lock = useSessionStore((s) => s.lock);
  const openWindow = useWindowStore((s) => s.openWindow);
  const closeWindow = useWindowStore((s) => s.closeWindow);
  const activeWindowId = useWindowStore((s) => s.activeWindowId);

  useEffect(() => {
    const registry = ShortcutRegistry.getInstance();
    registry.initialize();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Emergency Panic Lock shortcut - active across any state
      if (registry.matchesEvent('panic_lock', e)) {
        e.preventDefault();
        panicLock();
        return;
      }

      // App launching & window shortcuts only in active session
      if (lifecycle !== 'ACTIVE_SESSION') return;

      if (registry.matchesEvent('lock_session', e)) {
        e.preventDefault();
        lock('Keyboard Shortcut Trigger');
        return;
      }

      if (registry.matchesEvent('open_terminal', e)) {
        e.preventDefault();
        openWindow('terminal');
        return;
      }

      if (registry.matchesEvent('open_files', e)) {
        e.preventDefault();
        openWindow('files');
        return;
      }

      if (registry.matchesEvent('open_browser', e)) {
        e.preventDefault();
        openWindow('browser');
        return;
      }

      if (registry.matchesEvent('open_vault', e)) {
        e.preventDefault();
        openWindow('vault');
        return;
      }

      if (registry.matchesEvent('open_notes', e)) {
        e.preventDefault();
        openWindow('notes');
        return;
      }

      // Close active window shortcut (e.g. Ctrl+W or Esc)
      if (registry.matchesEvent('close_window', e) || e.key === 'Escape') {
        const target = e.target as HTMLElement;
        const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');
        if (!isInput && activeWindowId) {
          e.preventDefault();
          closeWindow(activeWindowId);
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lifecycle, panicLock, lock, openWindow, closeWindow, activeWindowId]);
}
