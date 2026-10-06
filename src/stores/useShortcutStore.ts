import { create } from 'zustand';
import { ShortcutItem, ShortcutRegistry, DEFAULT_SHORTCUTS } from '@/services/shortcuts/ShortcutRegistry';
import { useNotificationStore } from './useNotificationStore';

interface ShortcutState {
  shortcuts: ShortcutItem[];
  conflictItem: ShortcutItem | null;
  initialize: () => Promise<void>;
  updateShortcut: (id: string, newKey: string) => Promise<boolean>;
  resetDefaults: () => Promise<void>;
  findConflict: (keyCombo: string, ignoreId?: string) => ShortcutItem | null;
}

export const useShortcutStore = create<ShortcutState>((set, get) => ({
  shortcuts: [...DEFAULT_SHORTCUTS],
  conflictItem: null,

  initialize: async () => {
    const registry = ShortcutRegistry.getInstance();
    await registry.initialize();
    set({ shortcuts: registry.getShortcuts() });
  },

  updateShortcut: async (id: string, newKey: string) => {
    const registry = ShortcutRegistry.getInstance();
    const conflict = registry.findConflict(newKey, id);
    if (conflict) {
      set({ conflictItem: conflict });
      return false;
    }

    await registry.updateShortcut(id, newKey);
    set({
      shortcuts: registry.getShortcuts(),
      conflictItem: null,
    });
    useNotificationStore.getState().pushNotification({
      title: 'Shortcut Updated',
      message: `Assigned ${newKey}`,
      type: 'info',
    });
    return true;
  },

  resetDefaults: async () => {
    const registry = ShortcutRegistry.getInstance();
    await registry.resetDefaults();
    set({
      shortcuts: registry.getShortcuts(),
      conflictItem: null,
    });
    useNotificationStore.getState().pushNotification({
      title: 'Shortcuts Restored',
      message: 'Reset to default bindings.',
      type: 'info',
    });
  },

  findConflict: (keyCombo: string, ignoreId?: string) => {
    return ShortcutRegistry.getInstance().findConflict(keyCombo, ignoreId);
  },
}));
