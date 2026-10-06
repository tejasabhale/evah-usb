import { create } from 'zustand';
import { SessionLifecycle, SessionSettings, UserProfile } from '@/types/session';
import { UsbDevice } from '@/types/usb';
import { SessionManager } from '@/services/session/SessionManager';
import { AuthService } from '@/services/auth/AuthService';
import { UsbService } from '@/services/usb/UsbService';
import { useNotificationStore } from './useNotificationStore';
import { useThemeStore } from './useThemeStore';

interface SessionState {
  lifecycle: SessionLifecycle;
  user: UserProfile | null;
  settings: SessionSettings;
  device: UsbDevice | null;
  isFirstRun: boolean;
  statusReason?: string;
  isDevSimulation: boolean;
  
  initialize: () => Promise<void>;
  completeBoot: () => void;
  unlock: (password: string) => Promise<boolean>;
  lock: (reason?: string) => void;
  panicLock: () => void;
  logout: () => void;
  updateSettings: (partial: Partial<SessionSettings>) => void;
  simulateUsbUnplug: () => void;
  simulateUsbPlugIn: () => void;
  recordActivity: () => void;
  refreshUser: () => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  lifecycle: 'BOOT',
  user: null,
  settings: {
    autoLockMinutes: 10,
    clipboardTimeoutSeconds: 15,
    welcomeVoiceEnabled: true,
    welcomeVoicePitch: 1.0,
    welcomeVoiceRate: 1.0,
    welcomeVoiceVolume: 0.9,
    panicShortcut: 'Ctrl+Shift+L',
    deviceAutoLaunch: true,
  },
  device: null,
  isFirstRun: false,
  isDevSimulation: !UsbService.isNative(),

  initialize: async () => {
    const sessionMgr = SessionManager.getInstance();
    const auth = AuthService.getInstance();
    const monitor = UsbService.getMonitor();

    // Subscribe to session state transitions
    sessionMgr.addListener((lifecycle, reason) => {
      set({ lifecycle, statusReason: reason });
      if (lifecycle === 'PANIC_LOCKED') {
        useNotificationStore.getState().pushNotification({
          title: 'Emergency Lock Activated',
          message: 'Session secured. In-memory keys purged.',
          type: 'security',
        });
      } else if (lifecycle === 'SESSION_INVALIDATED') {
        useNotificationStore.getState().pushNotification({
          title: 'USB Device Removed',
          message: 'Sensitive state purged. Reconnect EVAH USB drive.',
          type: 'warning',
        });
      }
    });

    // Check existing profile
    const hasProfile = await auth.hasExistingProfile();
    const settings = await auth.getSettings();
    const connectedDev = monitor.getConnectedDevice();

    set({
      isFirstRun: !hasProfile,
      settings,
      device: connectedDev,
      user: auth.getCurrentUser(),
    });

    await sessionMgr.initialize();
  },

  completeBoot: () => {
    const { isFirstRun } = get();
    SessionManager.getInstance().completeBoot(isFirstRun);
  },

  unlock: async (password: string) => {
    const ok = await SessionManager.getInstance().unlockSession(password);
    if (ok) {
      set({
        user: AuthService.getInstance().getCurrentUser(),
      });
      // Re-hydrate theme and wallpaper from USB on unlock/reconnect
      await useThemeStore.getState().initialize();
      useNotificationStore.getState().pushNotification({
        title: 'EVAH Unlocked',
        message: 'Welcome back. Environment restored.',
        type: 'success',
      });
    }
    return ok;
  },

  lock: (reason = 'Manual Lock') => {
    SessionManager.getInstance().lockSession(reason);
  },

  panicLock: () => {
    SessionManager.getInstance().panicLock();
  },

  logout: () => {
    SessionManager.getInstance().logout();
  },

  updateSettings: (partial) => {
    SessionManager.getInstance().updateSettings(partial);
    set((state) => ({ settings: { ...state.settings, ...partial } }));
  },

  simulateUsbUnplug: () => {
    UsbService.simulateRemoval();
    set({ device: null });
  },

  simulateUsbPlugIn: () => {
    UsbService.simulatePlugIn();
    set({ device: UsbService.getMonitor().getConnectedDevice() });
  },

  recordActivity: () => {
    SessionManager.getInstance().recordActivity();
  },

  refreshUser: () => {
    set({ user: AuthService.getInstance().getCurrentUser() });
  },
}));
