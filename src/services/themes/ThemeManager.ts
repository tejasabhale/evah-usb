import { ThemeTokens, ThemePreset } from '@/types/theme';
import { DEFAULT_THEME_TOKENS } from './ThemeTokens';
import { THEME_PRESETS } from './ThemePresets';
import { StorageService } from '@/services/storage/StorageService';

const THEME_CONFIG_PATH = '/EVAH/data/settings/theme.json';

export class ThemeManager {
  private static instance: ThemeManager;
  private currentTokens: ThemeTokens = { ...DEFAULT_THEME_TOKENS };
  private activePresetId: string = 'evah-default';

  private constructor() {}

  public static getInstance(): ThemeManager {
    if (!ThemeManager.instance) {
      ThemeManager.instance = new ThemeManager();
    }
    return ThemeManager.instance;
  }

  public getTokens(): ThemeTokens {
    return { ...this.currentTokens };
  }

  public getActivePresetId(): string {
    return this.activePresetId;
  }

  public getPresets(): ThemePreset[] {
    return THEME_PRESETS;
  }

  public async initialize(): Promise<void> {
    try {
      const storage = StorageService.getAdapter();
      if (await storage.exists(THEME_CONFIG_PATH)) {
        const raw = await storage.readFile(THEME_CONFIG_PATH);
        const saved = JSON.parse(raw);
        if (saved.tokens) {
          this.currentTokens = { ...DEFAULT_THEME_TOKENS, ...saved.tokens };
        }
        if (saved.activePresetId) {
          this.activePresetId = saved.activePresetId;
        }
      }
    } catch (e) {
      console.warn('Could not read saved theme settings, using defaults', e);
    }

    this.applyTokensToDOM(this.currentTokens);
  }

  public async setPreset(presetId: string): Promise<ThemeTokens> {
    const preset = THEME_PRESETS.find(p => p.id === presetId);
    if (!preset) return this.currentTokens;

    this.activePresetId = presetId;
    this.currentTokens = {
      ...this.currentTokens,
      ...preset.tokens,
    };

    this.applyTokensToDOM(this.currentTokens);
    await this.persist();
    return this.currentTokens;
  }

  public async updateTokens(partial: Partial<ThemeTokens>): Promise<ThemeTokens> {
    this.currentTokens = {
      ...this.currentTokens,
      ...partial,
    };
    this.activePresetId = 'custom';
    this.applyTokensToDOM(this.currentTokens);
    await this.persist();
    return this.currentTokens;
  }

  public applyTokensToDOM(tokens: ThemeTokens): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;

    root.style.setProperty('--evah-bg', tokens.bg);
    root.style.setProperty('--evah-surface', tokens.surface);
    root.style.setProperty('--evah-surface-subtle', tokens.surfaceSubtle);
    root.style.setProperty('--evah-surface-hover', tokens.surfaceHover);
    root.style.setProperty('--evah-text', tokens.text);
    root.style.setProperty('--evah-text-secondary', tokens.textSecondary);
    root.style.setProperty('--evah-text-muted', tokens.textMuted);
    root.style.setProperty('--evah-border', tokens.border);
    root.style.setProperty('--evah-border-strong', tokens.borderStrong);
    root.style.setProperty('--evah-accent', tokens.accent);
    root.style.setProperty('--evah-accent-hover', tokens.accentHover);
    root.style.setProperty('--evah-accent-subtle', tokens.accentSubtle);
    root.style.setProperty('--evah-danger', tokens.danger);
    root.style.setProperty('--evah-warning', tokens.warning);
    root.style.setProperty('--evah-success', tokens.success);
    root.style.setProperty('--evah-dock-bg', tokens.dockBg);
    root.style.setProperty('--evah-topbar-bg', tokens.topbarBg);

    root.style.setProperty('--evah-window-radius', `${tokens.windowRadius}px`);
    root.style.setProperty('--evah-dock-radius', `${tokens.dockRadius}px`);
    root.style.setProperty('--evah-blur-amount', `${tokens.blurAmount}px`);
    root.style.setProperty('--evah-shadow-opacity', `${tokens.shadowOpacity}`);
    root.style.setProperty('--evah-window-opacity', `${tokens.windowOpacity}`);

    root.style.setProperty('--evah-font-sans', tokens.fontSans);
    root.style.setProperty('--evah-font-mono', tokens.fontMono);

    root.style.setProperty('--evah-text-scale', `${tokens.textScale}`);

    // Density
    let densityGap = '8px';
    let densityPadding = '12px';
    let densityRowHeight = '36px';
    if (tokens.density === 'compact') {
      densityGap = '4px';
      densityPadding = '8px';
      densityRowHeight = '30px';
    } else if (tokens.density === 'spacious') {
      densityGap = '12px';
      densityPadding = '16px';
      densityRowHeight = '44px';
    }
    root.style.setProperty('--evah-density-gap', densityGap);
    root.style.setProperty('--evah-density-padding', densityPadding);
    root.style.setProperty('--evah-density-row-height', densityRowHeight);

    // Light class toggle
    const isLight = tokens.bg.toLowerCase().includes('#f') || tokens.bg.toLowerCase().includes('#e');
    if (isLight) {
      root.classList.add('evah-theme-light');
    } else {
      root.classList.remove('evah-theme-light');
    }
  }

  public exportThemeJson(): string {
    return JSON.stringify({
      schema: 'evah.theme.v1',
      name: this.activePresetId === 'custom' ? 'Custom User Theme' : this.activePresetId,
      exportedAt: new Date().toISOString(),
      tokens: this.currentTokens,
    }, null, 2);
  }

  public async importThemeJson(jsonString: string): Promise<boolean> {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.tokens) {
        await this.updateTokens(parsed.tokens);
        return true;
      }
      return false;
    } catch (e) {
      console.error('Invalid theme file format', e);
      return false;
    }
  }

  public async resetToDefaults(): Promise<ThemeTokens> {
    this.currentTokens = { ...DEFAULT_THEME_TOKENS };
    this.activePresetId = 'evah-default';
    this.applyTokensToDOM(this.currentTokens);
    await this.persist();
    return this.currentTokens;
  }

  private async persist(): Promise<void> {
    try {
      const storage = StorageService.getAdapter();
      const payload = {
        activePresetId: this.activePresetId,
        tokens: this.currentTokens,
        updatedAt: new Date().toISOString(),
      };
      await storage.writeFile(THEME_CONFIG_PATH, JSON.stringify(payload, null, 2));
    } catch (e) {
      console.error('Failed to persist theme settings to USB', e);
    }
  }
}
