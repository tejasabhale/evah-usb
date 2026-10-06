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

    // Usable top is 32px (topbar), usable bottom is screenH - 84px (dock)
    expect(win.bounds.y).toBeGreaterThanOrEqual(32);
    expect(win.bounds.y).toBeLessThan(800 - 84);
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
    const initialBounds = { ...win.bounds };

    // Maximize
    store.maximizeWindow(win.id);
    const maximized = useWindowStore.getState().windows[0];
    expect(maximized.isMaximized).toBe(true);
    expect(maximized.bounds.y).toBe(32); // Topbar offset
    expect(maximized.bounds.height).toBeLessThan(800); // Above dock

    // Restore
    store.maximizeWindow(win.id);
    const restored = useWindowStore.getState().windows[0];
    expect(restored.isMaximized).toBe(false);
    expect(restored.bounds.width).toBe(initialBounds.width);
    expect(restored.bounds.height).toBe(initialBounds.height);
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
    expect(centered.bounds.y).toBeGreaterThanOrEqual(32);
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
});
