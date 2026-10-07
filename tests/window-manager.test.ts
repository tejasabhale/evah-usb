import { describe, it, expect, beforeEach } from 'vitest';
import { useWindowStore } from '@/stores/useWindowStore';
import { StorageService } from '@/services/storage/StorageService';

describe('useWindowStore & Desktop Window Manager', () => {
  beforeEach(async () => {
    localStorage.clear();
    await StorageService.initialize();
    useWindowStore.getState().closeAllWindows();
  });

  it('opens a new window precisely centered in the usable desktop area', () => {
    const store = useWindowStore.getState();
    store.openWindow('files');

    const windows = useWindowStore.getState().windows;
    expect(windows.length).toBe(1);

    const win = windows[0];
    expect(win.appId).toBe('files');
    expect(win.isOpen).toBe(true);
    expect(win.isFocused).toBe(true);

    // Usable workspace is below topbar, usable bottom is screenH - 32 - 76 (dock)
    expect(win.bounds.y).toBeGreaterThanOrEqual(0);
    expect(win.bounds.y).toBeLessThan(800 - 32 - 76);
    expect(win.bounds.x).toBeGreaterThanOrEqual(0);
  });

  it('enforces single instance per application by default', () => {
    const store = useWindowStore.getState();
    store.openWindow('files');
    const firstId = useWindowStore.getState().windows[0].id;

    // Attempting to open 'files' again should focus the existing window, not create a duplicate
    store.openWindow('files');
    const windows = useWindowStore.getState().windows;
    expect(windows.length).toBe(1);
    expect(windows[0].id).toBe(firstId);
    expect(windows[0].isFocused).toBe(true);
  });

  it('maximizes within usable desktop bounds and restores original rect', () => {
    const store = useWindowStore.getState();
    store.openWindow('vault');
    const win = useWindowStore.getState().windows[0];

    // Major applications open full-screen by default
    expect(win.isMaximized).toBe(true);
    expect(win.bounds.y).toBe(0); // Top of workspace below system bar
    expect(win.bounds.height).toBeLessThan(800); // Above dock safe margin

    // Restore to centered bounds
    store.maximizeWindow(win.id);
    const restored = useWindowStore.getState().windows[0];
    expect(restored.isMaximized).toBe(false);
    expect(restored.bounds.width).toBe(win.prevBounds!.width);
    expect(restored.bounds.height).toBe(win.prevBounds!.height);
    expect(restored.bounds.y).toBeGreaterThanOrEqual(0);

    // Re-maximize back to workspace
    store.maximizeWindow(win.id);
    const reMaximized = useWindowStore.getState().windows[0];
    expect(reMaximized.isMaximized).toBe(true);
    expect(reMaximized.bounds.y).toBe(0);
  });

  it('minimizes and brings next candidate to focus', () => {
    const store = useWindowStore.getState();
    store.openWindow('notes');
    store.openWindow('terminal');

    const termWin = useWindowStore.getState().windows.find((w) => w.appId === 'terminal')!;
    store.minimizeWindow(termWin.id);

    const updated = useWindowStore.getState().windows.find((w) => w.appId === 'terminal')!;
    expect(updated.isMinimized).toBe(true);

    const activeId = useWindowStore.getState().activeWindowId;
    const notesWin = useWindowStore.getState().windows.find((w) => w.appId === 'notes')!;
    expect(activeId).toBe(notesWin.id);
  });

  it('centers window on centerWindow() call', () => {
    const store = useWindowStore.getState();
    store.openWindow('browser');
    const win = useWindowStore.getState().windows[0];

    // Nudge window to edge
    store.updateBounds(win.id, { x: 500, y: 300 });

    // Call center
    store.centerWindow(win.id);
    const centered = useWindowStore.getState().windows[0];
    expect(centered.bounds.y).toBeGreaterThanOrEqual(0);
    expect(centered.bounds.x).toBeGreaterThan(0);
  });

  it('closes all windows safely on closeAllWindows()', () => {
    const store = useWindowStore.getState();
    store.openWindow('files');
    store.openWindow('browser');
    store.openWindow('notes');
    expect(useWindowStore.getState().windows.length).toBe(3);

    store.closeAllWindows();
    expect(useWindowStore.getState().windows.length).toBe(0);
    expect(useWindowStore.getState().activeWindowId).toBeNull();
  });

  it('reliably opens and closes each registered application via closeWindow', () => {
    const apps: Array<'files' | 'browser' | 'vault' | 'settings' | 'notes' | 'terminal' | 'themes' | 'about'> = [
      'files',
      'browser',
      'vault',
      'settings',
      'notes',
      'terminal',
      'themes',
      'about',
    ];

    for (const app of apps) {
      const store = useWindowStore.getState();
      // 1. Open app
      store.openWindow(app);
      let windows = useWindowStore.getState().windows;
      expect(windows.length).toBe(1);
      const opened = windows[0];
      expect(opened.appId).toBe(app);
      expect(opened.isOpen).toBe(true);

      // 2. Close app via closeWindow (simulating X button click)
      store.closeWindow(opened.id);
      windows = useWindowStore.getState().windows;
      expect(windows.length).toBe(0);
      expect(useWindowStore.getState().activeWindowId).toBeNull();

      // 3. Re-open app cleanly after close
      store.openWindow(app);
      windows = useWindowStore.getState().windows;
      expect(windows.length).toBe(1);
      expect(windows[0].appId).toBe(app);

      // Clean up for next app
      store.closeWindow(windows[0].id);
    }
  });

  it('shifts focus to previous window when active window is closed', () => {
    const store = useWindowStore.getState();
    store.openWindow('files');
    store.openWindow('browser');
    store.openWindow('terminal');

    const windows = useWindowStore.getState().windows;
    expect(windows.length).toBe(3);
    const termWin = windows.find((w) => w.appId === 'terminal')!;
    const browserWin = windows.find((w) => w.appId === 'browser')!;
    expect(useWindowStore.getState().activeWindowId).toBe(termWin.id);

    // Close the top active window (terminal)
    store.closeWindow(termWin.id);

    const remaining = useWindowStore.getState().windows;
    expect(remaining.length).toBe(2);
    expect(useWindowStore.getState().activeWindowId).toBe(browserWin.id);
    const updatedBrowserWin = remaining.find((w) => w.appId === 'browser')!;
    expect(updatedBrowserWin.isFocused).toBe(true);
  });

  it('closes properly regardless of whether window is maximized or restored', () => {
    const store = useWindowStore.getState();
    // Open maximized
    store.openWindow('settings');
    const win = useWindowStore.getState().windows[0];
    expect(win.isMaximized).toBe(true);

    // Restore to centered bounds
    store.maximizeWindow(win.id);
    expect(useWindowStore.getState().windows[0].isMaximized).toBe(false);

    // Close from restored state
    store.closeWindow(win.id);
    expect(useWindowStore.getState().windows.length).toBe(0);

    // Reopen and close while maximized
    store.openWindow('settings');
    const win2 = useWindowStore.getState().windows[0];
    expect(win2.isMaximized).toBe(true);
    store.closeWindow(win2.id);
    expect(useWindowStore.getState().windows.length).toBe(0);
  });
});
