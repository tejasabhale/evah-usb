import { create } from 'zustand';
import { AppId, WindowInstance, WindowRect } from '@/types/window';
import { VaultCryptoService } from '@/services/vault/VaultCryptoService';
import { ClipboardService } from '@/services/clipboard/ClipboardService';

interface WindowStoreState {
  windows: WindowInstance[];
  activeWindowId: string | null;
  highestZIndex: number;

  openWindow: (appId: AppId, initialParams?: any) => void;
  closeWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  maximizeWindow: (id: string) => void;
  centerWindow: (id: string) => void;
  closeAllWindows: () => void;
  focusWindow: (id: string) => void;
  updateBounds: (id: string, bounds: Partial<WindowRect>) => void;
  toggleWindow: (appId: AppId) => void;
}

const DEFAULT_WINDOW_CONFIGS: Record<AppId, { title: string; icon: string; width: number; height: number }> = {
  files: { title: 'EVAH Files', icon: 'Folder', width: 920, height: 580 },
  browser: { title: 'EVAH Web Browser', icon: 'Globe', width: 1040, height: 640 },
  vault: { title: 'EVAH Secure Vault', icon: 'Shield', width: 880, height: 580 },
  settings: { title: 'Settings', icon: 'Settings', width: 860, height: 580 },
  themes: { title: 'Theme Studio & Wallpaper', icon: 'Palette', width: 940, height: 620 },
  terminal: { title: 'EVAH Terminal', icon: 'Terminal', width: 800, height: 500 },
  notes: { title: 'EVAH Notes', icon: 'FileText', width: 860, height: 540 },
  about: { title: 'About EVAH', icon: 'Info', width: 580, height: 480 },
};

function getDesktopDimensions() {
  const screenW =
    typeof window !== 'undefined' && typeof window.innerWidth === 'number' && window.innerWidth > 0
      ? window.innerWidth
      : 1280;
  const screenH =
    typeof window !== 'undefined' && typeof window.innerHeight === 'number' && window.innerHeight > 0
      ? window.innerHeight
      : 800;
  return { screenW, screenH };
}

export const useWindowStore = create<WindowStoreState>((set, get) => ({
  windows: [],
  activeWindowId: null,
  highestZIndex: 10,

  openWindow: (appId: AppId, initialParams?: any) => {
    const { windows, highestZIndex } = get();
    const existing = windows.find((w) => w.appId === appId);

    if (existing) {
      // Single Instance Enforcement: Restore if minimized and bring to front
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

    const cfg = DEFAULT_WINDOW_CONFIGS[appId] || { title: appId, icon: 'AppWindow', width: 840, height: 540 };
    const nextZ = highestZIndex + 1;

    // Calculate actual usable desktop area: topbar 32px, dock safe margin 84px
    const { screenW, screenH } = getDesktopDimensions();
    const usableTop = 32;
    const usableBottom = screenH - 84;
    const usableH = Math.max(300, usableBottom - usableTop);
    const usableW = screenW;

    const targetW = Math.min(cfg.width, Math.max(480, usableW - 40));
    const targetH = Math.min(cfg.height, Math.max(340, usableH - 20));

    // Exactly centered in the usable desktop safe region
    const x = Math.max(20, Math.floor((usableW - targetW) / 2));
    const y = Math.max(usableTop + 8, usableTop + Math.floor((usableH - targetH) / 2));

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
        width: targetW,
        height: targetH,
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
            // Restore previous bounds
            return {
              ...w,
              isMaximized: false,
              bounds: w.prevBounds || w.bounds,
            };
          } else {
            // Maximize within usable desktop area (respects 32px topbar and 84px dock)
            const { screenW, screenH } = getDesktopDimensions();
            return {
              ...w,
              isMaximized: true,
              prevBounds: { ...w.bounds },
              bounds: {
                x: 0,
                y: 32, // Below topbar
                width: screenW,
                height: Math.max(300, screenH - 32 - 84), // Above dock
              },
            };
          }
        }),
      };
    });
  },

  centerWindow: (id: string) => {
    set((state) => {
      const { screenW, screenH } = getDesktopDimensions();
      const usableTop = 32;
      const usableBottom = screenH - 84;
      const usableH = Math.max(300, usableBottom - usableTop);
      const usableW = screenW;

      return {
        windows: state.windows.map((w) => {
          if (w.id !== id) return w;
          const targetW = Math.min(w.bounds.width, Math.max(480, usableW - 40));
          const targetH = Math.min(w.bounds.height, Math.max(340, usableH - 20));
          const x = Math.max(20, Math.floor((usableW - targetW) / 2));
          const y = Math.max(usableTop + 8, usableTop + Math.floor((usableH - targetH) / 2));
          return {
            ...w,
            isMaximized: false,
            bounds: {
              x,
              y,
              width: targetW,
              height: targetH,
            },
          };
        }),
      };
    });
  },

  closeAllWindows: () => {
    // Section 46: Handle sensitive state cleanup before closing windows
    try {
      VaultCryptoService.getInstance().lockVault();
      ClipboardService.getInstance().clearImmediately();
    } catch {
      // ignore
    }
    set({
      windows: [],
      activeWindowId: null,
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
