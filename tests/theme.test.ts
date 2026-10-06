import { describe, it, expect, beforeEach } from 'vitest';
import { ThemeManager } from '@/services/themes/ThemeManager';
import { THEME_PRESETS } from '@/services/themes/ThemePresets';
import { StorageService } from '@/services/storage/StorageService';

describe('ThemeManager & Visual Architecture', () => {
  let themeManager: ThemeManager;

  beforeEach(async () => {
    localStorage.clear();
    await StorageService.initialize();
    themeManager = ThemeManager.getInstance();
  });

  it('provides comprehensive end4/Linux inspired theme presets', () => {
    const presets = themeManager.getPresets();
    expect(presets.length).toBeGreaterThanOrEqual(4);

    const ids = presets.map((p) => p.id);
    expect(ids).toContain('evah-default');
    expect(ids).toContain('evah-light');
  });

  it('switches presets and updates design tokens', async () => {
    const tokens = await themeManager.setPreset('evah-light');
    expect(themeManager.getActivePresetId()).toBe('evah-light');
    expect(tokens.bg).toBe('#f8fafc');
    expect(tokens.text).toBe('#0f172a');
  });

  it('customizes design tokens and persists changes', async () => {
    await themeManager.setPreset('evah-default');
    const updated = await themeManager.updateTokens({
      accent: '#06B6D4',
      windowRadius: 18,
    });

    expect(updated.accent).toBe('#06B6D4');
    expect(updated.windowRadius).toBe(18);

    const storage = StorageService.getAdapter();
    const exists = await storage.exists('/EVAH/data/settings/theme.json');
    expect(exists).toBe(true);
  });

  it('resets to defaults when requested', async () => {
    await themeManager.updateTokens({ windowRadius: 30 });
    const resetTokens = await themeManager.resetToDefaults();
    expect(resetTokens.windowRadius).toBe(14);
  });
});
