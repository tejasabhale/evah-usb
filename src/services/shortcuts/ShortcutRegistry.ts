import { StorageService } from '@/services/storage/StorageService';

export interface ShortcutItem {
  id: string;
  name: string;
  description: string;
  defaultKey: string;
  currentKey: string;
  scope: 'global' | 'window';
  category: 'security' | 'navigation' | 'windows';
  enabled: boolean;
}

const SHORTCUTS_STORAGE_PATH = '/EVAH/data/settings/shortcuts.json';

export const DEFAULT_SHORTCUTS: ShortcutItem[] = [
  {
    id: 'panic_lock',
    name: 'Panic Lockdown',
    description: 'Instantly purge active memory keys and lock OS',
    defaultKey: 'Ctrl+Shift+L',
    currentKey: 'Ctrl+Shift+L',
    scope: 'global',
    category: 'security',
    enabled: true,
  },
  {
    id: 'lock_session',
    name: 'Lock Session',
    description: 'Lock desktop environment with master password prompt',
    defaultKey: 'Ctrl+Shift+K',
    currentKey: 'Ctrl+Shift+K',
    scope: 'global',
    category: 'security',
    enabled: true,
  },
  {
    id: 'open_files',
    name: 'Open Files',
    description: 'Launch EVAH Files Manager',
    defaultKey: 'Ctrl+Shift+F',
    currentKey: 'Ctrl+Shift+F',
    scope: 'global',
    category: 'navigation',
    enabled: true,
  },
  {
    id: 'open_browser',
    name: 'Open Browser',
    description: 'Launch EVAH Web Browser',
    defaultKey: 'Ctrl+Shift+B',
    currentKey: 'Ctrl+Shift+B',
    scope: 'global',
    category: 'navigation',
    enabled: true,
  },
  {
    id: 'open_vault',
    name: 'Open Vault',
    description: 'Launch Encrypted Credentials Vault',
    defaultKey: 'Ctrl+Shift+V',
    currentKey: 'Ctrl+Shift+V',
    scope: 'global',
    category: 'navigation',
    enabled: true,
  },
  {
    id: 'open_terminal',
    name: 'Open Terminal',
    description: 'Launch EVAH Shell Terminal',
    defaultKey: 'Ctrl+Alt+T',
    currentKey: 'Ctrl+Alt+T',
    scope: 'global',
    category: 'navigation',
    enabled: true,
  },
  {
    id: 'open_notes',
    name: 'Open Notes',
    description: 'Launch EVAH Notes Notepad',
    defaultKey: 'Ctrl+Shift+N',
    currentKey: 'Ctrl+Shift+N',
    scope: 'global',
    category: 'navigation',
    enabled: true,
  },
  {
    id: 'close_window',
    name: 'Close Active Window',
    description: 'Close currently focused application window',
    defaultKey: 'Ctrl+W',
    currentKey: 'Ctrl+W',
    scope: 'window',
    category: 'windows',
    enabled: true,
  },
];

export class ShortcutRegistry {
  private static instance: ShortcutRegistry;
  private shortcuts: ShortcutItem[] = [...DEFAULT_SHORTCUTS];
  private initialized = false;

  private constructor() {}

  public static getInstance(): ShortcutRegistry {
    if (!ShortcutRegistry.instance) {
      ShortcutRegistry.instance = new ShortcutRegistry();
    }
    return ShortcutRegistry.instance;
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;
    try {
      const storage = StorageService.getAdapter();
      if (await storage.exists(SHORTCUTS_STORAGE_PATH)) {
        const raw = await storage.readFile(SHORTCUTS_STORAGE_PATH);
        const saved: Record<string, string> = JSON.parse(raw);
        this.shortcuts = this.shortcuts.map((sc) => ({
          ...sc,
          currentKey: saved[sc.id] || sc.defaultKey,
        }));
      }
    } catch (e) {
      console.warn('Could not load custom shortcuts, using defaults', e);
    }
    this.initialized = true;
  }

  public getShortcuts(): ShortcutItem[] {
    return [...this.shortcuts];
  }

  public findConflict(keyCombo: string, ignoreId?: string): ShortcutItem | null {
    const normalized = this.normalizeKey(keyCombo);
    return (
      this.shortcuts.find(
        (sc) => sc.id !== ignoreId && this.normalizeKey(sc.currentKey) === normalized
      ) || null
    );
  }

  public async updateShortcut(id: string, newKey: string): Promise<boolean> {
    const normalized = this.normalizeKey(newKey);
    this.shortcuts = this.shortcuts.map((sc) =>
      sc.id === id ? { ...sc, currentKey: normalized } : sc
    );
    await this.persist();
    return true;
  }

  public async resetDefaults(): Promise<void> {
    this.shortcuts = [...DEFAULT_SHORTCUTS];
    await this.persist();
  }

  public getShortcutKey(id: string): string {
    const item = this.shortcuts.find((sc) => sc.id === id);
    return item ? item.currentKey : '';
  }

  public matchesEvent(id: string, event: KeyboardEvent): boolean {
    const item = this.shortcuts.find((sc) => sc.id === id);
    if (!item || !item.enabled) return false;
    return this.keyMatchesEvent(item.currentKey, event);
  }

  public keyMatchesEvent(keyString: string, event: KeyboardEvent): boolean {
    const parts = keyString.split('+').map((p) => p.trim().toLowerCase());
    const needsCtrl = parts.includes('ctrl');
    const needsAlt = parts.includes('alt');
    const needsShift = parts.includes('shift');
    const needsMeta = parts.includes('cmd') || parts.includes('meta');

    const hasCtrl = event.ctrlKey;
    const hasAlt = event.altKey;
    const hasShift = event.shiftKey;
    const hasMeta = event.metaKey;

    if (needsCtrl !== hasCtrl) return false;
    if (needsAlt !== hasAlt) return false;
    if (needsShift !== hasShift) return false;
    if (needsMeta !== hasMeta) return false;

    const baseKey = parts[parts.length - 1];
    return event.key.toLowerCase() === baseKey || event.code.toLowerCase() === `key${baseKey}`;
  }

  public normalizeKey(raw: string): string {
    const parts = raw.split('+').map((p) => p.trim());
    const modifiers: string[] = [];
    let mainKey = '';

    for (const p of parts) {
      const lower = p.toLowerCase();
      if (lower === 'ctrl' || lower === 'control') modifiers.push('Ctrl');
      else if (lower === 'alt') modifiers.push('Alt');
      else if (lower === 'shift') modifiers.push('Shift');
      else if (lower === 'cmd' || lower === 'meta') modifiers.push('Cmd');
      else mainKey = p.toUpperCase();
    }

    const order = ['Ctrl', 'Alt', 'Shift', 'Cmd'];
    const sorted = order.filter((m) => modifiers.includes(m));
    if (mainKey) sorted.push(mainKey);
    return sorted.join('+');
  }

  private async persist(): Promise<void> {
    try {
      const storage = StorageService.getAdapter();
      const payload: Record<string, string> = {};
      for (const sc of this.shortcuts) {
        payload[sc.id] = sc.currentKey;
      }
      await storage.writeFile(SHORTCUTS_STORAGE_PATH, JSON.stringify(payload, null, 2));
    } catch (e) {
      console.error('Failed to save shortcuts to USB', e);
    }
  }
}
