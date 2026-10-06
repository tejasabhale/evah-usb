import React, { useState } from 'react';
import { 
  Palette, Sliders, Type, Layout, Monitor, Sparkles, Download, 
  Upload, RotateCcw, Check, Sun, Moon, Image as ImageIcon, SlidersHorizontal, SlidersVertical, Eye 
} from 'lucide-react';
import { useThemeStore } from '@/stores/useThemeStore';
import { ThemeTokens, WallpaperConfig } from '@/types/theme';
import { useNotificationStore } from '@/stores/useNotificationStore';

export const ThemeStudioApp: React.FC = () => {
  const {
    tokens,
    activePresetId,
    presets,
    desktopWallpaper,
    loginWallpaper,
    availableWallpapers,
    syncLoginWallpaper,
    setPreset,
    updateTokens,
    resetDefaults,
    setDesktopWallpaper,
    setLoginWallpaper,
    setSyncLoginWallpaper,
    updateWallpaperAdjustments,
    exportTheme,
    importTheme,
  } = useThemeStore();

  const [activeTab, setActiveTab] = useState<'presets' | 'colors' | 'typography' | 'layout' | 'wallpaper' | 'editor'>('presets');
  const [editingWallpaper, setEditingWallpaper] = useState<WallpaperConfig>(desktopWallpaper);
  const pushNotification = useNotificationStore((s) => s.pushNotification);

  const fontOptions = [
    { label: 'Inter (Default)', value: "'Inter', system-ui, sans-serif" },
    { label: 'Geist Sans', value: "'Geist', system-ui, sans-serif" },
    { label: 'Manrope', value: "'Manrope', system-ui, sans-serif" },
    { label: 'System UI', value: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif" },
    { label: 'JetBrains Mono', value: "'JetBrains Mono', monospace" },
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
    <div className="flex h-full w-full bg-evah-surface text-evah-text select-none">
      {/* Studio Navigation Sidebar */}
      <div className="w-52 border-r border-evah-border bg-black/10 flex flex-col p-3 gap-1 shrink-0">
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
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                if (tab.id === 'editor') setEditingWallpaper({ ...desktopWallpaper });
              }}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-left transition-colors ${
                activeTab === tab.id
                  ? 'bg-evah-accent-subtle text-evah-accent border border-evah-accent/30'
                  : 'text-evah-text-secondary hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0 text-evah-accent" />
              <span>{tab.label}</span>
            </button>
          );
        })}

        <div className="mt-auto pt-3 border-t border-evah-border space-y-1.5">
          <button
            onClick={handleExport}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-xs text-white transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export Theme
          </button>
          <label className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-xs text-white transition-colors cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            Import Theme
            <input type="file" accept=".json,.evah-theme" onChange={handleImportFile} className="hidden" />
          </label>
          <button
            onClick={resetDefaults}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-rose-400 hover:bg-rose-950/30 text-xs transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Defaults
          </button>
        </div>
      </div>

      {/* Center Studio Config Area */}
      <div className="flex-1 p-6 overflow-y-auto min-w-0">
        {/* Tab 1: Presets */}
        {activeTab === 'presets' && (
          <div className="space-y-4 max-w-2xl">
            <div>
              <h3 className="text-base font-bold text-white">Theme Presets</h3>
              <p className="text-xs text-evah-text-secondary mt-0.5">
                Carefully tuned design tokens inspired by modern desktop operating systems.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2">
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setPreset(preset.id)}
                  className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                    activePresetId === preset.id
                      ? 'border-evah-accent bg-evah-accent-subtle shadow-md ring-1 ring-evah-accent'
                      : 'border-evah-border bg-white/[0.02] hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white">{preset.name}</span>
                    {activePresetId === preset.id && (
                      <Check className="w-3.5 h-3.5 text-evah-accent" />
                    )}
                  </div>
                  <p className="text-[11px] text-evah-text-muted leading-snug">
                    {preset.description}
                  </p>
                  <div className="flex items-center gap-1 mt-3">
                    <div 
                      className="w-4 h-4 rounded-full border border-white/20" 
                      style={{ backgroundColor: preset.tokens.bg || '#000' }} 
                    />
                    <div 
                      className="w-4 h-4 rounded-full border border-white/20" 
                      style={{ backgroundColor: preset.tokens.surface || '#222' }} 
                    />
                    <div 
                      className="w-4 h-4 rounded-full border border-white/20" 
                      style={{ backgroundColor: preset.tokens.accent || '#14b8a6' }} 
                    />
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
                Accent colors propagate dynamically to active dock indicators, focus rings, buttons, and logos.
              </p>
            </div>

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
                        ? 'border-evah-accent bg-evah-accent-subtle text-white'
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
                  Background Base Color
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
              <h3 className="text-base font-bold text-white">Typography & Text Scale</h3>
              <p className="text-xs text-evah-text-secondary mt-0.5">
                Centralized font family tokens applied across the entire EVAH desktop.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-evah-text mb-1.5">
                  System Interface Font
                </label>
                <select
                  value={tokens.fontSans}
                  onChange={(e) => updateTokens({ fontSans: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-evah-border text-xs text-white focus:outline-none focus:border-evah-accent"
                >
                  {fontOptions.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-evah-text mb-1.5">
                  Code & Terminal Monospace Font
                </label>
                <select
                  value={tokens.fontMono}
                  onChange={(e) => updateTokens({ fontMono: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-evah-border text-xs text-white focus:outline-none focus:border-evah-accent"
                >
                  {monoFontOptions.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-semibold text-evah-text">Global Text Scale</span>
                  <span className="font-mono text-evah-accent">{Math.round(tokens.textScale * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.85"
                  max="1.30"
                  step="0.05"
                  value={tokens.textScale}
                  onChange={(e) => updateTokens({ textScale: parseFloat(e.target.value) })}
                  className="w-full accent-teal-500"
                />
                <div className="flex justify-between text-[10px] text-evah-text-muted mt-1">
                  <span>Compact (85%)</span>
                  <span>Default (100%)</span>
                  <span>Large (130%)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Windows & Dock */}
        {activeTab === 'layout' && (
          <div className="space-y-5 max-w-2xl">
            <div>
              <h3 className="text-base font-bold text-white">Window & Dock Customization</h3>
              <p className="text-xs text-evah-text-secondary mt-0.5">
                Customize curvature, blur intensity, shadows, and dock positioning.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-semibold text-evah-text">Window Corner Radius</span>
                  <span className="font-mono text-evah-accent">{tokens.windowRadius}px</span>
                </div>
                <input
                  type="range"
                  min="6"
                  max="26"
                  value={tokens.windowRadius}
                  onChange={(e) => updateTokens({ windowRadius: parseInt(e.target.value) })}
                  className="w-full accent-teal-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-semibold text-evah-text">Window Blur Intensity</span>
                  <span className="font-mono text-evah-accent">{tokens.blurAmount}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="36"
                  value={tokens.blurAmount}
                  onChange={(e) => updateTokens({ blurAmount: parseInt(e.target.value) })}
                  className="w-full accent-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-evah-text mb-1.5">
                    UI Density
                  </label>
                  <select
                    value={tokens.density}
                    onChange={(e) => updateTokens({ density: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-evah-border text-xs text-white"
                  >
                    <option value="compact">Compact</option>
                    <option value="comfortable">Comfortable (Default)</option>
                    <option value="spacious">Spacious</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-evah-text mb-1.5">
                    Dock Position
                  </label>
                  <select
                    value={tokens.dockPosition}
                    onChange={(e) => updateTokens({ dockPosition: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-evah-border text-xs text-white"
                  >
                    <option value="bottom-center">Bottom Center (Default)</option>
                    <option value="bottom-left">Bottom Left</option>
                    <option value="bottom-right">Bottom Right</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Wallpaper Selector */}
        {activeTab === 'wallpaper' && (
          <div className="space-y-5 max-w-2xl">
            <div>
              <h3 className="text-base font-bold text-white">Desktop & Login Wallpapers</h3>
              <p className="text-xs text-evah-text-secondary mt-0.5">
                Select from built-in high-resolution backgrounds or adjust login synchronicity.
              </p>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl border border-evah-border bg-white/[0.02]">
              <span className="text-xs font-medium text-white">Sync Login Screen with Desktop Wallpaper</span>
              <input
                type="checkbox"
                checked={syncLoginWallpaper}
                onChange={(e) => setSyncLoginWallpaper(e.target.checked)}
                className="w-4 h-4 accent-teal-500 rounded"
              />
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
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url("${wp.url}")` }}
                  />
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
              <h3 className="text-base font-bold text-white">Wallpaper Editor</h3>
              <p className="text-xs text-evah-text-secondary mt-0.5">
                Fine-tune lighting, blur, saturation, and contrast.
              </p>
            </div>

            {/* Live Filter Preview */}
            <div className="w-full h-36 rounded-2xl overflow-hidden border border-evah-border relative shadow-lg">
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage: `url("${editingWallpaper.url}")`,
                  filter: `blur(${editingWallpaper.blur}px) brightness(${editingWallpaper.brightness}%) contrast(${editingWallpaper.contrast}%) saturation(${editingWallpaper.saturation}%) grayscale(${editingWallpaper.grayscale}%)`,
                  transform: `scale(${editingWallpaper.zoom || 1})`,
                }}
              />
              <div
                className="absolute inset-0"
                style={{
                  backgroundColor: editingWallpaper.overlayColor,
                  opacity: editingWallpaper.overlayOpacity,
                }}
              />
            </div>

            {/* Sliders */}
            <div className="space-y-3 pt-2">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Brightness</span>
                  <span className="font-mono text-evah-accent">{editingWallpaper.brightness}%</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="160"
                  value={editingWallpaper.brightness}
                  onChange={(e) => setEditingWallpaper({ ...editingWallpaper, brightness: parseInt(e.target.value) })}
                  className="w-full accent-teal-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Contrast</span>
                  <span className="font-mono text-evah-accent">{editingWallpaper.contrast}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="150"
                  value={editingWallpaper.contrast}
                  onChange={(e) => setEditingWallpaper({ ...editingWallpaper, contrast: parseInt(e.target.value) })}
                  className="w-full accent-teal-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Blur</span>
                  <span className="font-mono text-evah-accent">{editingWallpaper.blur}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="25"
                  value={editingWallpaper.blur}
                  onChange={(e) => setEditingWallpaper({ ...editingWallpaper, blur: parseInt(e.target.value) })}
                  className="w-full accent-teal-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-evah-border">
                <button
                  type="button"
                  onClick={() => setEditingWallpaper({ ...desktopWallpaper })}
                  className="px-3 py-1.5 rounded-xl text-xs text-evah-text-secondary hover:text-white"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={handleApplyWallpaperEditor}
                  className="px-4 py-1.5 rounded-xl bg-evah-accent text-black font-semibold text-xs hover:bg-evah-accent-hover transition-colors"
                >
                  Apply to Desktop
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right Live Mini-Preview Panel (macOS / OS window style) */}
      <div className="w-80 border-l border-evah-border p-5 flex flex-col bg-black/20 shrink-0">
        <span className="text-[10px] uppercase font-semibold text-evah-text-muted mb-3 flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5" />
          Live OS Preview
        </span>

        {/* Mini Desktop Shell Preview */}
        <div 
          className="flex-1 rounded-2xl border border-white/10 p-3 flex flex-col justify-between relative overflow-hidden shadow-inner"
          style={{
            backgroundColor: tokens.bg,
            fontFamily: tokens.fontSans,
          }}
        >
          {/* Wallpaper underlay in preview */}
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-40 pointer-events-none"
            style={{ backgroundImage: `url("${desktopWallpaper.url}")` }}
          />

          {/* Mini Topbar */}
          <div className="relative z-10 flex items-center justify-between text-[9px] px-2 py-1 rounded bg-black/40 text-white/80 border border-white/10 backdrop-blur-md">
            <span>EVAH</span>
            <span>12:00 PM</span>
          </div>

          {/* Mini Window Frame */}
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
              style={{
                backgroundColor: tokens.accent,
                color: '#000',
              }}
            >
              Action Button
            </button>
          </div>

          {/* Mini Dock */}
          <div 
            className="relative z-10 mx-auto flex items-center gap-1.5 px-3 py-1 rounded-full border shadow-lg"
            style={{
              backgroundColor: tokens.dockBg,
              borderColor: tokens.border,
            }}
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
