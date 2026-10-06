import React, { useState } from 'react';
import { 
  Palette, Sliders, Type, Layout, Monitor, Sparkles, Download, 
  Upload, RotateCcw, Check, Sun, Moon, Image as ImageIcon, SlidersHorizontal, 
  Eye, AlertTriangle, Accessibility, Shield 
} from 'lucide-react';
import { useThemeStore } from '@/stores/useThemeStore';
import { ThemeTokens, WallpaperConfig } from '@/types/theme';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Slider, Select } from '@/components/ui/Toggle';

export const ThemeStudioApp: React.FC = () => {
  const {
    tokens,
    activePresetId,
    presets,
    desktopWallpaper,
    availableWallpapers,
    syncLoginWallpaper,
    setPreset,
    updateTokens,
    resetDefaults,
    setDesktopWallpaper,
    setSyncLoginWallpaper,
    updateWallpaperAdjustments,
    exportTheme,
    importTheme,
  } = useThemeStore();

  const [activeTab, setActiveTab] = useState<'presets' | 'colors' | 'typography' | 'layout' | 'wallpaper' | 'editor' | 'accessibility'>('presets');
  const [editingWallpaper, setEditingWallpaper] = useState<WallpaperConfig>(desktopWallpaper);
  const pushNotification = useNotificationStore((s) => s.pushNotification);

  const fontOptions = [
    { label: 'Inter (Default)', value: "'Inter', system-ui, sans-serif" },
    { label: 'Geist Sans', value: "'Geist', system-ui, sans-serif" },
    { label: 'Manrope', value: "'Manrope', system-ui, sans-serif" },
    { label: 'System UI', value: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif" },
  ];

  const monoFontOptions = [
    { label: 'JetBrains Mono (Default)', value: "'JetBrains Mono', monospace" },
    { label: 'System Monospace', value: "ui-monospace, SFMono-Regular, monospace" },
  ];

  const accentPalette = [
    { name: 'Teal (Default)', hex: '#14B8A6' },
    { name: 'Cyan Arctic', hex: '#06B6D4' },
    { name: 'Sapphire Blue', hex: '#3B82F6' },
    { name: 'Indigo Night', hex: '#6366F1' },
    { name: 'Amethyst Purple', hex: '#8B5CF6' },
    { name: 'Emerald Pine', hex: '#10B981' },
    { name: 'Sunset Amber', hex: '#F97316' },
    { name: 'Crimson Rose', hex: '#F43F5E' },
    { name: 'Titanium Slate', hex: '#64748B' },
  ];

  // Contrast Ratio calculation
  const getLuminance = (hex: string): number => {
    let clean = hex.replace('#', '');
    if (clean.length === 3) clean = clean.split('').map(c => c + c).join('');
    const r = parseInt(clean.substring(0, 2), 16) / 255;
    const g = parseInt(clean.substring(2, 4), 16) / 255;
    const b = parseInt(clean.substring(4, 6), 16) / 255;
    const a = [r, g, b].map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  };

  const getContrastRatio = (hex1: string, hex2: string): number => {
    try {
      const l1 = getLuminance(hex1);
      const l2 = getLuminance(hex2);
      const brightest = Math.max(l1, l2);
      const darkest = Math.min(l1, l2);
      return (brightest + 0.05) / (darkest + 0.05);
    } catch {
      return 5.0; // fallback
    }
  };

  const isLowContrast = getContrastRatio(tokens.accent, tokens.bg) < 3.0;

  const handleExport = () => {
    const json = exportTheme();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activePresetId || 'custom-theme'}.evah-theme`;
    a.click();
    URL.revokeObjectURL(url);
    pushNotification({
      title: 'Theme Exported',
      message: 'Theme file ready for USB transfer.',
      type: 'success',
    });
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const content = ev.target?.result as string;
      const ok = await importTheme(content);
      if (ok) {
        pushNotification({
          title: 'Theme Applied',
          message: 'Imported theme settings loaded successfully.',
          type: 'success',
        });
      } else {
        pushNotification({
          title: 'Import Failed',
          message: 'Invalid .evah-theme file format.',
          type: 'error',
        });
      }
    };
    reader.readAsText(file);
  };

  const handleApplyWallpaperEditor = async () => {
    await updateWallpaperAdjustments(editingWallpaper.id, editingWallpaper);
    pushNotification({
      title: 'Wallpaper Updated',
      message: 'Image visual filters applied to desktop.',
      type: 'success',
    });
  };

  return (
    <div className="flex h-full w-full bg-evah-surface text-evah-text select-none overflow-hidden">
      {/* Sidebar Navigation */}
      <div className="w-56 border-r border-evah-border bg-black/15 flex flex-col p-3 gap-1 shrink-0 overflow-y-auto">
        <div className="px-2 py-1 mb-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-evah-text-muted">
            Theme Studio
          </span>
          <h2 className="text-sm font-bold text-white">Personalization</h2>
        </div>

        {[
          { id: 'presets', label: 'Theme Presets', icon: Palette },
          { id: 'colors', label: 'Colors & Accents', icon: Sparkles },
          { id: 'typography', label: 'Typography & Scale', icon: Type },
          { id: 'layout', label: 'Windows & Dock', icon: Layout },
          { id: 'wallpaper', label: 'Wallpapers', icon: ImageIcon },
          { id: 'editor', label: 'Wallpaper Editor', icon: SlidersHorizontal },
          { id: 'accessibility', label: 'Accessibility', icon: Accessibility },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                if (tab.id === 'editor') setEditingWallpaper({ ...desktopWallpaper });
              }}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-left transition-colors ${
                isActive
                  ? 'bg-evah-accent-subtle text-evah-accent font-semibold border border-evah-accent/20'
                  : 'text-evah-text-secondary hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0 text-evah-accent" />
              <span>{tab.label}</span>
            </button>
          );
        })}

        <div className="mt-auto pt-3 border-t border-evah-border space-y-1.5">
          <Button variant="secondary" size="sm" className="w-full" icon={<Download className="w-3.5 h-3.5" />} onClick={handleExport}>
            Export Theme
          </Button>
          <label className="w-full">
            <Button variant="secondary" size="sm" className="w-full cursor-pointer" icon={<Upload className="w-3.5 h-3.5" />}>
              Import Theme
            </Button>
            <input type="file" accept=".json,.evah-theme" onChange={handleImportFile} className="hidden" />
          </label>
          <Button variant="ghost" size="sm" className="w-full text-rose-400" icon={<RotateCcw className="w-3.5 h-3.5" />} onClick={resetDefaults}>
            Reset Defaults
          </Button>
        </div>
      </div>

      {/* Main Studio Editor */}
      <div className="flex-1 p-6 overflow-y-auto min-w-0">
        {/* Tab 1: Presets */}
        {activeTab === 'presets' && (
          <div className="space-y-4 max-w-2xl">
            <div>
              <h3 className="text-base font-bold text-white">Design Presets</h3>
              <p className="text-xs text-evah-text-secondary mt-0.5">
                Carefully tuned desktop design tokens inspired by modern desktop environments.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2">
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setPreset(preset.id)}
                  className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    activePresetId === preset.id
                      ? 'border-evah-accent bg-evah-accent-subtle shadow-md ring-1 ring-evah-accent'
                      : 'border-evah-border bg-white/[0.02] hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white">{preset.name}</span>
                    {activePresetId === preset.id && <Check className="w-3.5 h-3.5 text-evah-accent" />}
                  </div>
                  <p className="text-[11px] text-evah-text-muted leading-snug">
                    {preset.description}
                  </p>
                  <div className="flex items-center gap-1.5 mt-3">
                    <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: preset.tokens.bg || '#000' }} />
                    <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: preset.tokens.surface || '#222' }} />
                    <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: preset.tokens.accent || '#14b8a6' }} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Colors */}
        {activeTab === 'colors' && (
          <div className="space-y-5 max-w-2xl">
            <div>
              <h3 className="text-base font-bold text-white">Color System & Accents</h3>
              <p className="text-xs text-evah-text-secondary mt-0.5">
                Accent colors propagate dynamically to active dock dots, focus rings, buttons, and logos.
              </p>
            </div>

            {isLowContrast && (
              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Low contrast detected. This combination may reduce text readability.</span>
              </div>
            )}

            <div className="space-y-3">
              <label className="block text-xs font-semibold text-evah-text">
                Primary Accent Color
              </label>
              <div className="grid grid-cols-3 gap-2">
                {accentPalette.map((acc) => (
                  <button
                    key={acc.hex}
                    onClick={() => updateTokens({ accent: acc.hex, accentHover: acc.hex })}
                    className={`flex items-center gap-2.5 p-2 rounded-xl border text-xs text-left transition-all ${
                      tokens.accent.toLowerCase() === acc.hex.toLowerCase()
                        ? 'border-evah-accent bg-evah-accent-subtle text-white font-semibold'
                        : 'border-evah-border hover:bg-white/[0.03] text-evah-text-secondary'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: acc.hex }} />
                    <span className="truncate">{acc.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-evah-border">
              <div>
                <label className="block text-xs font-semibold text-evah-text mb-1.5">
                  Custom Accent Hex
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={tokens.accent}
                    onChange={(e) => updateTokens({ accent: e.target.value, accentHover: e.target.value })}
                    className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                  />
                  <input
                    type="text"
                    value={tokens.accent}
                    onChange={(e) => updateTokens({ accent: e.target.value, accentHover: e.target.value })}
                    className="px-3 py-1.5 rounded-xl bg-black/40 border border-evah-border text-xs font-mono text-white w-28 uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-evah-text mb-1.5">
                  Background Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={tokens.bg.startsWith('#') ? tokens.bg : '#0b0f19'}
                    onChange={(e) => updateTokens({ bg: e.target.value })}
                    className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                  />
                  <input
                    type="text"
                    value={tokens.bg}
                    onChange={(e) => updateTokens({ bg: e.target.value })}
                    className="px-3 py-1.5 rounded-xl bg-black/40 border border-evah-border text-xs font-mono text-white w-28 uppercase"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Typography */}
        {activeTab === 'typography' && (
          <div className="space-y-5 max-w-2xl">
            <div>
              <h3 className="text-base font-bold text-white">Typography & Scaling</h3>
              <p className="text-xs text-evah-text-secondary mt-0.5">
                Centralized font families and text scaling tokens.
              </p>
            </div>

            <div className="space-y-4">
              <Select
                label="System Interface Font"
                value={tokens.fontSans}
                onChange={(e) => updateTokens({ fontSans: e.target.value })}
                options={fontOptions}
              />

              <Select
                label="Code & Terminal Monospace Font"
                value={tokens.fontMono}
                onChange={(e) => updateTokens({ fontMono: e.target.value })}
                options={monoFontOptions}
              />

              <Slider
                label="Global Text Scaling"
                min={0.85}
                max={1.30}
                step={0.05}
                value={tokens.textScale}
                formatValue={(v) => `${Math.round(v * 100)}%`}
                onChange={(v) => updateTokens({ textScale: v })}
              />
            </div>
          </div>
        )}

        {/* Tab 4: Windows & Dock */}
        {activeTab === 'layout' && (
          <div className="space-y-5 max-w-2xl">
            <div>
              <h3 className="text-base font-bold text-white">Window & Dock Ergonomics</h3>
              <p className="text-xs text-evah-text-secondary mt-0.5">
                Curvature, blur intensity, shadows, and dock positioning.
              </p>
            </div>

            <div className="space-y-4">
              <Slider
                label="Window Corner Radius"
                min={6}
                max={24}
                value={tokens.windowRadius}
                formatValue={(v) => `${v}px`}
                onChange={(v) => updateTokens({ windowRadius: v })}
              />

              <Slider
                label="Window Blur Intensity"
                min={0}
                max={32}
                value={tokens.blurAmount}
                formatValue={(v) => `${v}px`}
                onChange={(v) => updateTokens({ blurAmount: v })}
              />

              <div className="grid grid-cols-2 gap-4 pt-2">
                <Select
                  label="Interface Density"
                  value={tokens.density}
                  onChange={(e) => updateTokens({ density: e.target.value as any })}
                  options={[
                    { value: 'compact', label: 'Compact' },
                    { value: 'comfortable', label: 'Comfortable (Default)' },
                    { value: 'spacious', label: 'Spacious' },
                  ]}
                />

                <Select
                  label="Dock Position"
                  value={tokens.dockPosition}
                  onChange={(e) => updateTokens({ dockPosition: e.target.value as any })}
                  options={[
                    { value: 'bottom-center', label: 'Bottom Center' },
                    { value: 'bottom-left', label: 'Bottom Left' },
                    { value: 'bottom-right', label: 'Bottom Right' },
                  ]}
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Wallpapers */}
        {activeTab === 'wallpaper' && (
          <div className="space-y-5 max-w-2xl">
            <div>
              <h3 className="text-base font-bold text-white">Wallpapers</h3>
              <p className="text-xs text-evah-text-secondary mt-0.5">
                Select from built-in high-resolution backgrounds.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {availableWallpapers.map((wp) => (
                <div
                  key={wp.id}
                  onClick={() => setDesktopWallpaper(wp)}
                  className={`group relative rounded-2xl overflow-hidden border cursor-pointer aspect-video transition-all ${
                    desktopWallpaper.id === wp.id
                      ? 'border-evah-accent ring-2 ring-evah-accent'
                      : 'border-evah-border hover:border-white/40'
                  }`}
                >
                  <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url("${wp.url}")` }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2.5">
                    <span className="text-[11px] font-semibold text-white truncate drop-shadow">
                      {wp.name}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 6: Wallpaper Editor */}
        {activeTab === 'editor' && (
          <div className="space-y-4 max-w-xl">
            <div>
              <h3 className="text-base font-bold text-white">Wallpaper Filter Editor</h3>
              <p className="text-xs text-evah-text-secondary mt-0.5">
                Adjust lighting, contrast, and atmospheric blur.
              </p>
            </div>

            <div className="w-full h-36 rounded-2xl overflow-hidden border border-evah-border relative shadow-lg">
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage: `url("${editingWallpaper.url}")`,
                  filter: `blur(${editingWallpaper.blur}px) brightness(${editingWallpaper.brightness}%) contrast(${editingWallpaper.contrast}%) saturation(${editingWallpaper.saturation}%) grayscale(${editingWallpaper.grayscale}%)`,
                  transform: `scale(${editingWallpaper.zoom || 1})`,
                }}
              />
            </div>

            <div className="space-y-3 pt-2">
              <Slider
                label="Brightness"
                min={40}
                max={160}
                value={editingWallpaper.brightness}
                formatValue={(v) => `${v}%`}
                onChange={(v) => setEditingWallpaper({ ...editingWallpaper, brightness: v })}
              />

              <Slider
                label="Contrast"
                min={50}
                max={150}
                value={editingWallpaper.contrast}
                formatValue={(v) => `${v}%`}
                onChange={(v) => setEditingWallpaper({ ...editingWallpaper, contrast: v })}
              />

              <Slider
                label="Atmospheric Blur"
                min={0}
                max={25}
                value={editingWallpaper.blur}
                formatValue={(v) => `${v}px`}
                onChange={(v) => setEditingWallpaper({ ...editingWallpaper, blur: v })}
              />

              <div className="flex justify-end gap-2 pt-3 border-t border-evah-border">
                <Button variant="primary" size="sm" onClick={handleApplyWallpaperEditor}>
                  Apply to Desktop
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 7: Accessibility */}
        {activeTab === 'accessibility' && (
          <div className="space-y-5 max-w-xl">
            <div>
              <h3 className="text-base font-bold text-white">Accessibility & Contrast</h3>
              <p className="text-xs text-evah-text-secondary mt-0.5">
                WCAG readability verification and reduced motion settings.
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-evah-border bg-white/[0.02] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-white">Accent Contrast Ratio</h4>
                  <p className="text-[11px] text-evah-text-muted">Calculated against base canvas</p>
                </div>
                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${isLowContrast ? 'bg-amber-950 text-amber-300' : 'bg-emerald-950 text-emerald-300'}`}>
                  {getContrastRatio(tokens.accent, tokens.bg).toFixed(2)} : 1
                </span>
              </div>

              <Select
                label="System Animation Profile"
                value={tokens.animations}
                onChange={(e) => updateTokens({ animations: e.target.value as any })}
                options={[
                  { value: 'full', label: 'Full Animations' },
                  { value: 'balanced', label: 'Balanced (Default)' },
                  { value: 'reduced', label: 'Reduced Motion' },
                  { value: 'off', label: 'Animations Off' },
                ]}
              />
            </div>
          </div>
        )}
      </div>

      {/* Right Desktop Mini-Preview */}
      <div className="w-80 border-l border-evah-border p-5 flex flex-col bg-black/20 shrink-0">
        <span className="text-[10px] uppercase font-semibold text-evah-text-muted mb-3 flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5" />
          Live OS Preview
        </span>

        <div
          className="flex-1 rounded-2xl border border-white/10 p-3 flex flex-col justify-between relative overflow-hidden shadow-inner"
          style={{ backgroundColor: tokens.bg, fontFamily: tokens.fontSans }}
        >
          <div
            className="absolute inset-0 bg-cover bg-center opacity-40 pointer-events-none"
            style={{ backgroundImage: `url("${desktopWallpaper.url}")` }}
          />

          <div className="relative z-10 flex items-center justify-between text-[9px] px-2 py-1 rounded bg-black/40 text-white/80 border border-white/10 backdrop-blur-md">
            <span>EVAH</span>
            <span>12:00 PM</span>
          </div>

          <div
            className="relative z-10 p-2.5 rounded-xl border shadow-lg my-auto"
            style={{
              backgroundColor: tokens.surface,
              borderRadius: `${tokens.windowRadius * 0.75}px`,
              borderColor: tokens.border,
              backdropFilter: `blur(${tokens.blurAmount * 0.5}px)`,
            }}
          >
            <div className="flex items-center gap-1 mb-2">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[9px] font-semibold text-white ml-1">Window</span>
            </div>
            <p className="text-[9px] text-slate-300 leading-tight mb-2">
              Previewing active design tokens.
            </p>
            <button
              className="px-2 py-0.5 rounded text-[9px] font-semibold"
              style={{ backgroundColor: tokens.accent, color: '#000' }}
            >
              Action Button
            </button>
          </div>

          <div
            className="relative z-10 mx-auto flex items-center gap-1.5 px-3 py-1 rounded-full border shadow-lg"
            style={{ backgroundColor: tokens.dockBg, borderColor: tokens.border }}
          >
            <span className="w-4 h-4 rounded-md bg-amber-400/80" />
            <span className="w-4 h-4 rounded-md bg-sky-400/80" />
            <span className="w-4 h-4 rounded-md bg-teal-400/80" />
            <span className="w-4 h-4 rounded-md bg-purple-400/80" />
          </div>
        </div>
      </div>
    </div>
  );
};
