import { create } from 'zustand';
import { ThemeTokens, ThemePreset, WallpaperConfig } from '@/types/theme';
import { ThemeManager } from '@/services/themes/ThemeManager';
import { WallpaperService, BUILTIN_WALLPAPERS } from '@/services/wallpapers/WallpaperService';
import { DEFAULT_THEME_TOKENS } from '@/services/themes/ThemeTokens';
import { THEME_PRESETS } from '@/services/themes/ThemePresets';

interface ThemeState {
  tokens: ThemeTokens;
  activePresetId: string;
  presets: ThemePreset[];
  desktopWallpaper: WallpaperConfig;
  loginWallpaper: WallpaperConfig;
  availableWallpapers: WallpaperConfig[];
  syncLoginWallpaper: boolean;

  initialize: () => Promise<void>;
  setPreset: (presetId: string) => Promise<void>;
  updateTokens: (partial: Partial<ThemeTokens>) => Promise<void>;
  resetDefaults: () => Promise<void>;
  setDesktopWallpaper: (config: WallpaperConfig) => Promise<void>;
  setLoginWallpaper: (config: WallpaperConfig) => Promise<void>;
  setSyncLoginWallpaper: (sync: boolean) => void;
  updateWallpaperAdjustments: (id: string, updates: Partial<WallpaperConfig>) => Promise<void>;
  addCustomWallpaper: (name: string, dataUrl: string) => Promise<WallpaperConfig>;
  exportTheme: () => string;
  importTheme: (json: string) => Promise<boolean>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  tokens: { ...DEFAULT_THEME_TOKENS },
  activePresetId: 'evah-default',
  presets: THEME_PRESETS,
  desktopWallpaper: BUILTIN_WALLPAPERS[0],
  loginWallpaper: BUILTIN_WALLPAPERS[0],
  availableWallpapers: BUILTIN_WALLPAPERS,
  syncLoginWallpaper: true,

  initialize: async () => {
    const tm = ThemeManager.getInstance();
    const ws = WallpaperService.getInstance();
    await tm.initialize();
    await ws.initialize();

    set({
      tokens: tm.getTokens(),
      activePresetId: tm.getActivePresetId(),
      presets: tm.getPresets(),
      desktopWallpaper: ws.getDesktopWallpaper(),
      loginWallpaper: ws.getLoginWallpaper(),
      availableWallpapers: ws.getAvailableWallpapers(),
      syncLoginWallpaper: ws.isSyncLoginEnabled(),
    });
  },

  setPreset: async (presetId: string) => {
    const tm = ThemeManager.getInstance();
    const newTokens = await tm.setPreset(presetId);
    set({
      tokens: newTokens,
      activePresetId: presetId,
    });

    // Also match recommended wallpaper if preset specifies it
    const preset = THEME_PRESETS.find(p => p.id === presetId);
    if (preset?.recommendedWallpaper) {
      const wp = get().availableWallpapers.find(w => w.id === preset.recommendedWallpaper);
      if (wp) {
        await get().setDesktopWallpaper(wp);
      }
    }
  },

  updateTokens: async (partial: Partial<ThemeTokens>) => {
    const tm = ThemeManager.getInstance();
    const updated = await tm.updateTokens(partial);
    set({
      tokens: updated,
      activePresetId: 'custom',
    });
  },

  resetDefaults: async () => {
    const tm = ThemeManager.getInstance();
    const reset = await tm.resetToDefaults();
    set({
      tokens: reset,
      activePresetId: 'evah-default',
    });
  },

  setDesktopWallpaper: async (config: WallpaperConfig) => {
    const ws = WallpaperService.getInstance();
    await ws.setDesktopWallpaper(config);
    set({
      desktopWallpaper: ws.getDesktopWallpaper(),
      loginWallpaper: ws.getLoginWallpaper(),
    });
  },

  setLoginWallpaper: async (config: WallpaperConfig) => {
    const ws = WallpaperService.getInstance();
    await ws.setLoginWallpaper(config);
    set({
      loginWallpaper: ws.getLoginWallpaper(),
      syncLoginWallpaper: false,
    });
  },

  setSyncLoginWallpaper: (sync: boolean) => {
    const ws = WallpaperService.getInstance();
    ws.setSyncLogin(sync);
    set({
      syncLoginWallpaper: sync,
      loginWallpaper: ws.getLoginWallpaper(),
    });
  },

  updateWallpaperAdjustments: async (id: string, updates: Partial<WallpaperConfig>) => {
    const ws = WallpaperService.getInstance();
    await ws.updateWallpaperAdjustment(id, updates);
    set({
      desktopWallpaper: ws.getDesktopWallpaper(),
      loginWallpaper: ws.getLoginWallpaper(),
      availableWallpapers: ws.getAvailableWallpapers(),
    });
  },

  addCustomWallpaper: async (name: string, dataUrl: string) => {
    const ws = WallpaperService.getInstance();
    const created = await ws.addCustomWallpaper(name, dataUrl);
    set({
      availableWallpapers: ws.getAvailableWallpapers(),
      desktopWallpaper: created,
    });
    return created;
  },

  exportTheme: () => {
    return ThemeManager.getInstance().exportThemeJson();
  },

  importTheme: async (json: string) => {
    const tm = ThemeManager.getInstance();
    const ok = await tm.importThemeJson(json);
    if (ok) {
      set({
        tokens: tm.getTokens(),
        activePresetId: 'custom',
      });
    }
    return ok;
  },
}));
