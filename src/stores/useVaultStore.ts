import { create } from 'zustand';
import { VaultCategory, VaultItem } from '@/types/vault';
import { VaultCryptoService } from '@/services/vault/VaultCryptoService';
import { ClipboardService } from '@/services/clipboard/ClipboardService';
import { useSessionStore } from './useSessionStore';
import { useNotificationStore } from './useNotificationStore';

interface VaultStoreState {
  isConfigured: boolean;
  isUnlocked: boolean;
  items: VaultItem[];
  selectedCategory: VaultCategory | 'all';
  searchQuery: string;
  isBusy: boolean;
  error: string | null;

  checkConfigured: () => Promise<boolean>;
  setup: (password: string) => Promise<boolean>;
  unlock: (customPassword?: string) => Promise<boolean>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
  lock: () => void;
  setCategory: (category: VaultCategory | 'all') => void;
  setSearchQuery: (query: string) => void;
  addItem: (item: Omit<VaultItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateItem: (id: string, updates: Partial<VaultItem>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  copySecret: (text: string, label: string) => Promise<void>;
}

export const useVaultStore = create<VaultStoreState>((set, get) => ({
  isConfigured: false,
  isUnlocked: false,
  items: [],
  selectedCategory: 'all',
  searchQuery: '',
  isBusy: false,
  error: null,

  checkConfigured: async () => {
    try {
      const configured = await VaultCryptoService.getInstance().isVaultConfigured();
      set({ isConfigured: configured });
      return configured;
    } catch {
      set({ isConfigured: false });
      return false;
    }
  },

  setup: async (password: string) => {
    set({ isBusy: true, error: null });
    try {
      const data = await VaultCryptoService.getInstance().setupVault(password);
      set({
        isConfigured: true,
        isUnlocked: true,
        items: data.items,
        isBusy: false,
        error: null,
      });
      useNotificationStore.getState().pushNotification({
        title: 'Vault Configured',
        message: 'Master vault password created and encrypted with AES-256-GCM.',
        type: 'success',
      });
      return true;
    } catch (e: any) {
      set({
        isBusy: false,
        error: e.message || 'Vault setup failed',
      });
      return false;
    }
  },

  unlock: async (customPassword?: string) => {
    set({ isBusy: true, error: null });
    try {
      const data = await VaultCryptoService.getInstance().unlockVault(customPassword);
      set({
        isConfigured: true,
        isUnlocked: true,
        items: data.items,
        isBusy: false,
        error: null,
      });
      useNotificationStore.getState().pushNotification({
        title: 'Vault Unlocked',
        message: 'In-memory vault decrypted into isolated memory.',
        type: 'success',
      });
      return true;
    } catch (e: any) {
      set({
        isUnlocked: false,
        error: e.message || 'Decryption failed',
        isBusy: false,
      });
      return false;
    }
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    set({ isBusy: true, error: null });
    try {
      await VaultCryptoService.getInstance().changeVaultPassword(currentPassword, newPassword);
      set({ isBusy: false, error: null });
      useNotificationStore.getState().pushNotification({
        title: 'Vault Password Changed',
        message: 'Vault re-encrypted with your new master password.',
        type: 'success',
      });
      return true;
    } catch (e: any) {
      set({ isBusy: false, error: e.message || 'Failed to change Vault password' });
      return false;
    }
  },

  lock: () => {
    VaultCryptoService.getInstance().lockVault();
    set({
      isUnlocked: false,
      items: [],
      error: null,
    });
    useNotificationStore.getState().pushNotification({
      title: 'Vault Locked',
      message: 'Decrypted memory cleared.',
      type: 'security',
    });
  },

  setCategory: (category) => set({ selectedCategory: category }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  addItem: async (item) => {
    const vcs = VaultCryptoService.getInstance();
    const created = await vcs.addItem(item);
    set((state) => ({ items: [...state.items, created] }));
    useNotificationStore.getState().pushNotification({
      title: 'Secret Added',
      message: `"${item.title}" securely stored in vault.`,
      type: 'success',
    });
  },

  updateItem: async (id, updates) => {
    const vcs = VaultCryptoService.getInstance();
    const updated = await vcs.updateItem(id, updates);
    set((state) => ({
      items: state.items.map((it) => (it.id === id ? updated : it)),
    }));
    useNotificationStore.getState().pushNotification({
      title: 'Secret Updated',
      message: `"${updated.title}" changes saved.`,
      type: 'info',
    });
  },

  deleteItem: async (id) => {
    const vcs = VaultCryptoService.getInstance();
    await vcs.deleteItem(id);
    set((state) => ({
      items: state.items.filter((it) => it.id !== id),
    }));
    useNotificationStore.getState().pushNotification({
      title: 'Secret Deleted',
      message: 'Entry permanently removed from vault.',
      type: 'warning',
    });
  },

  copySecret: async (text: string, label: string) => {
    const settings = useSessionStore.getState().settings;
    const timeout = settings.clipboardTimeoutSeconds;

    const ok = await ClipboardService.getInstance().copySensitiveText(
      text,
      timeout,
      undefined,
      () => {
        useNotificationStore.getState().pushNotification({
          title: 'Clipboard Auto-Cleared',
          message: 'Sensitive secret was wiped for your protection.',
          type: 'security',
        });
      }
    );

    if (ok) {
      const msg = timeout > 0 
        ? `${label} copied. Clipboard will be cleared in ${timeout}s.`
        : `${label} copied to clipboard.`;

      useNotificationStore.getState().pushNotification({
        title: 'Secret Copied',
        message: msg,
        type: 'security',
      });
    }
  },
}));
