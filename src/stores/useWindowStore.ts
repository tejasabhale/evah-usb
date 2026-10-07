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
  handleViewportResize: () => void;
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

    // Calculate actual usable desktop workspace area (underneath 32px topbar, above 76px dock)
    const { screenW, screenH } = getDesktopDimensions();
    const dockMargin = 76;
    const usableH = Math.max(300, screenH - 32 - dockMargin);
    const usableW = screenW;

    // Centered bounds for non-maximized / restored state
    const targetW = Math.min(cfg.width, Math.max(480, usableW - 60));
    const targetH = Math.min(cfg.height, Math.max(340, usableH - 40));
    const centeredX = Math.max(16, Math.floor((usableW - targetW) / 2));
    const centeredY = Math.max(8, Math.floor((usableH - targetH) / 2));

    // Major applications open full-screen (maximized inside workspace) by default
    const isMajorApp = appId !== 'about';
    const shouldMaximize = isMajorApp;

    const newWindow: WindowInstance = {
      id: `win_${appId}_${Date.now()}`,
      appId,
      title: cfg.title,
      icon: cfg.icon,
      isOpen: true,
      isMinimized: false,
      isMaximized: shouldMaximize,
      isFocused: true,
      zIndex: nextZ,
      bounds: shouldMaximize
        ? {
            x: 0,
            y: 0,
            width: usableW,
            height: usableH,
          }
        : {
            x: centeredX,
            y: centeredY,
            width: targetW,
            height: targetH,
          },
      prevBounds: {
        x: centeredX,
        y: centeredY,
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
    const win = get().windows.find((w) => w.id === id);
    if (win && win.appId === 'vault') {
      try {
        VaultCryptoService.getInstance().lockVault();
      } catch {
        // ignore
      }
    }
    set((state) => {
      const remaining = state.windows.filter((w) => w.id !== id);
      const nextActive = remaining.length > 0 ? remaining[remaining.length - 1].id : null;
      return {
        windows: remaining.map((w) => ({
          ...w,
          isFocused: w.id === nextActive,
        })),
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
      const { screenW, screenH } = getDesktopDimensions();
      const dockMargin = 76;
      const usableH = Math.max(300, screenH - 32 - dockMargin);
      const usableW = screenW;

      return {
        windows: state.windows.map((w) => {
          if (w.id !== id) return w;
          if (w.isMaximized) {
            // Restore previous bounds or default centered bounds
            const fallbackW = Math.min(880, Math.max(480, usableW - 60));
            const fallbackH = Math.min(560, Math.max(340, usableH - 40));
            const fallbackX = Math.max(16, Math.floor((usableW - fallbackW) / 2));
            const fallbackY = Math.max(8, Math.floor((usableH - fallbackH) / 2));

            const restoredBounds = w.prevBounds || {
              x: fallbackX,
              y: fallbackY,
              width: fallbackW,
              height: fallbackH,
            };

            return {
              ...w,
              isMaximized: false,
              bounds: restoredBounds,
            };
          } else {
            // Maximize within workspace area below 32px topbar
            return {
              ...w,
              isMaximized: true,
              prevBounds: { ...w.bounds },
              bounds: {
                x: 0,
                y: 0,
                width: usableW,
                height: usableH,
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
      const dockMargin = 76;
      const usableH = Math.max(300, screenH - 32 - dockMargin);
      const usableW = screenW;

      return {
        windows: state.windows.map((w) => {
          if (w.id !== id) return w;
          const targetW = Math.min(w.bounds.width, Math.max(480, usableW - 60));
          const targetH = Math.min(w.bounds.height, Math.max(340, usableH - 40));
          const x = Math.max(16, Math.floor((usableW - targetW) / 2));
          const y = Math.max(8, Math.floor((usableH - targetH) / 2));
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

  handleViewportResize: () => {
    const { screenW, screenH } = getDesktopDimensions();
    const dockMargin = 76;
    const usableH = Math.max(300, screenH - 32 - dockMargin);
    const usableW = screenW;

    set((state) => ({
      windows: state.windows.map((w) => {
        if (w.isMaximized) {
          return {
            ...w,
            bounds: {
              x: 0,
              y: 0,
              width: usableW,
              height: usableH,
            },
          };
        } else {
          // Keep non-maximized window safely within visible workspace
          const clampedW = Math.min(w.bounds.width, Math.max(460, usableW - 32));
          const clampedH = Math.min(w.bounds.height, Math.max(320, usableH - 20));
          const clampedX = Math.max(0, Math.min(w.bounds.x, usableW - clampedW));
          const clampedY = Math.max(0, Math.min(w.bounds.y, usableH - 40));
          return {
            ...w,
            bounds: {
              x: clampedX,
              y: clampedY,
              width: clampedW,
              height: clampedH,
            },
          };
        }
      }),
    }));
  },
}));
