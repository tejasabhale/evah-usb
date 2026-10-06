import { describe, it, expect, beforeEach } from 'vitest';
import { ShortcutRegistry } from '@/services/shortcuts/ShortcutRegistry';
import { StorageService } from '@/services/storage/StorageService';

describe('ShortcutRegistry & Keyboard Shortcut Manager', () => {
  let registry: ShortcutRegistry;

  beforeEach(async () => {
    localStorage.clear();
    await StorageService.initialize();
    registry = ShortcutRegistry.getInstance();
    await registry.resetDefaults();
  });

  it('normalizes keyboard shortcut combinations cleanly', () => {
    expect(registry.normalizeKey('ctrl+shift+l')).toBe('Ctrl+Shift+L');
    expect(registry.normalizeKey('alt+t')).toBe('Alt+T');
    expect(registry.normalizeKey('cmd+k')).toBe('Cmd+K');
  });

  it('registers default OS shortcuts', () => {
    const list = registry.getShortcuts();
    expect(list.length).toBeGreaterThan(5);

    const panicKey = registry.getShortcutKey('panic_lock');
    expect(panicKey).toBe('Ctrl+Shift+L');

    const browserKey = registry.getShortcutKey('open_browser');
    expect(browserKey).toBe('Ctrl+Shift+B');
  });

  it('detects keyboard combination conflicts', () => {
    // Attempting to assign 'Ctrl+Shift+L' to another action should detect conflict with panic_lock
    const conflict = registry.findConflict('Ctrl+Shift+L', 'open_files');
    expect(conflict).not.toBeNull();
    expect(conflict?.id).toBe('panic_lock');
  });

  it('rebinds a shortcut successfully and persists changes', async () => {
    const success = await registry.updateShortcut('open_files', 'Ctrl+Shift+O');
    expect(success).toBe(true);

    const updated = registry.getShortcutKey('open_files');
    expect(updated).toBe('Ctrl+Shift+O');
  });

  it('detects event matching accurately', () => {
    const mockEvent = {
      ctrlKey: true,
      shiftKey: true,
      altKey: false,
      metaKey: false,
      key: 'l',
      code: 'KeyL',
    } as unknown as KeyboardEvent;

    expect(registry.keyMatchesEvent('Ctrl+Shift+L', mockEvent)).toBe(true);
    expect(registry.keyMatchesEvent('Ctrl+Shift+B', mockEvent)).toBe(false);
  });
});
