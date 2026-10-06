import { create } from 'zustand';
import { AppId, WindowInstance, WindowRect } from '@/types/window';

interface WindowStoreState {
  windows: WindowInstance[];
  activeWindowId: string | null;
  highestZIndex: number;

  openWindow: (appId: AppId, initialParams?: any) => void;
  closeWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  maximizeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  updateBounds: (id: string, bounds: Partial<WindowRect>) => void;
  toggleWindow: (appId: AppId) => void;
}

const DEFAULT_WINDOW_CONFIGS: Record<AppId, { title: string; icon: string; width: number; height: number }> = {
  files: { title: 'EVAH Files', icon: 'Folder', width: 880, height: 560 },
  browser: { title: 'EVAH Web Browser', icon: 'Globe', width: 960, height: 600 },
  vault: { title: 'EVAH Secure Vault', icon: 'Shield', width: 900, height: 580 },
  settings: { title: 'Settings', icon: 'Settings', width: 860, height: 580 },
  themes: { title: 'Theme Studio & Wallpaper', icon: 'Palette', width: 940, height: 620 },
  terminal: { title: 'EVAH Terminal', icon: 'Terminal', width: 780, height: 480 },
  notes: { title: 'EVAH Notes', icon: 'FileText', width: 840, height: 540 },
  about: { title: 'About EVAH', icon: 'Info', width: 560, height: 460 },
};

export const useWindowStore = create<WindowStoreState>((set, get) => ({
  windows: [],
  activeWindowId: null,
  highestZIndex: 10,

  openWindow: (appId: AppId, initialParams?: any) => {
    const { windows, highestZIndex } = get();
    const existing = windows.find((w) => w.appId === appId);

    if (existing) {
      // Restore if minimized and bring to front
      const nextZ = highestZIndex + 1;
      set({
        highestZIndex: nextZ,
        activeWindowId: existing.id,
        windows: windows.map((w) =>
          w.id === existing.id
            ? { ...w, isOpen: true, isMinimized: false, isFocused: true, zIndex: nextZ, initialParams: initialParams ?? w.initialParams }
            : { ...w, isFocused: false }
        ),
      });
      return;
    }

    const cfg = DEFAULT_WINDOW_CONFIGS[appId] || { title: appId, icon: 'AppWindow', width: 800, height: 520 };
    const nextZ = highestZIndex + 1;
    const offset = (windows.length % 6) * 28;

    // Center on screen
    const screenW = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const screenH = typeof window !== 'undefined' ? window.innerHeight : 800;
    const x = Math.max(40, Math.floor((screenW - cfg.width) / 2) + offset);
    const y = Math.max(50, Math.floor((screenH - cfg.height) / 2 - 20) + offset);

    const newWindow: WindowInstance = {
      id: `win_${appId}_${Date.now()}`,
      appId,
      title: cfg.title,
      icon: cfg.icon,
      isOpen: true,
      isMinimized: false,
      isMaximized: false,
      isFocused: true,
      zIndex: nextZ,
      bounds: {
        x,
        y,
        width: cfg.width,
        height: cfg.height,
      },
      minWidth: 460,
      minHeight: 340,
      initialParams,
    };

    set({
      highestZIndex: nextZ,
      activeWindowId: newWindow.id,
      windows: [...windows.map((w) => ({ ...w, isFocused: false })), newWindow],
    });
  },

  closeWindow: (id: string) => {
    set((state) => {
      const remaining = state.windows.filter((w) => w.id !== id);
      const nextActive = remaining.length > 0 ? remaining[remaining.length - 1].id : null;
      return {
        windows: remaining,
        activeWindowId: nextActive,
      };
    });
  },

  minimizeWindow: (id: string) => {
    set((state) => {
      const windows = state.windows.map((w) =>
        w.id === id ? { ...w, isMinimized: true, isFocused: false } : w
      );
      const activeCandidate = windows.filter((w) => !w.isMinimized && w.isOpen);
      const nextActive = activeCandidate.length > 0 ? activeCandidate[activeCandidate.length - 1].id : null;
      return {
        windows,
        activeWindowId: nextActive,
      };
    });
  },

  maximizeWindow: (id: string) => {
    set((state) => {
      return {
        windows: state.windows.map((w) => {
          if (w.id !== id) return w;
          if (w.isMaximized) {
            // Restore
            return {
              ...w,
              isMaximized: false,
              bounds: w.prevBounds || w.bounds,
            };
          } else {
            // Maximize
            const screenW = typeof window !== 'undefined' ? window.innerWidth : 1280;
            const screenH = typeof window !== 'undefined' ? window.innerHeight : 800;
            return {
              ...w,
              isMaximized: true,
              prevBounds: { ...w.bounds },
              bounds: {
                x: 0,
                y: 32, // Below topbar
                width: screenW,
                height: screenH - 32 - 76, // Above dock
              },
            };
          }
        }),
      };
    });
  },

  focusWindow: (id: string) => {
    const { windows, highestZIndex } = get();
    const nextZ = highestZIndex + 1;
    set({
      highestZIndex: nextZ,
      activeWindowId: id,
      windows: windows.map((w) =>
        w.id === id
          ? { ...w, isFocused: true, isMinimized: false, zIndex: nextZ }
          : { ...w, isFocused: false }
      ),
    });
  },

  updateBounds: (id: string, partialBounds: Partial<WindowRect>) => {
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === id
          ? { ...w, bounds: { ...w.bounds, ...partialBounds }, isMaximized: false }
          : w
      ),
    }));
  },

  toggleWindow: (appId: AppId) => {
    const { windows, openWindow, minimizeWindow, focusWindow } = get();
    const win = windows.find((w) => w.appId === appId);
    if (!win) {
      openWindow(appId);
    } else if (win.isMinimized) {
      focusWindow(win.id);
    } else if (win.isFocused) {
      minimizeWindow(win.id);
    } else {
      focusWindow(win.id);
    }
  },
}));
