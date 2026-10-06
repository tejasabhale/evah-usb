export interface ThemeTokens {
  bg: string;
  surface: string;
  surfaceSubtle: string;
  surfaceHover: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  borderStrong: string;
  accent: string;
  accentHover: string;
  accentSubtle: string;
  danger: string;
  warning: string;
  success: string;
  dockBg: string;
  topbarBg: string;
  windowRadius: number; // in px
  dockRadius: number; // in px
  fontSans: string;
  fontMono: string;
  blurAmount: number; // in px
  shadowOpacity: number; // 0 to 1
  windowOpacity: number; // 0 to 1
  textScale: number; // 0.85 to 1.3
  density: 'compact' | 'comfortable' | 'spacious';
  animations: 'full' | 'balanced' | 'reduced' | 'off';
  dockPosition: 'bottom-center' | 'bottom-left' | 'bottom-right';
  dockSize: number; // 48 to 72
}

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  mode: 'dark' | 'light';
  tokens: Partial<ThemeTokens>;
  recommendedWallpaper?: string;
}

export interface WallpaperConfig {
  id: string;
  name: string;
  type: 'preset' | 'custom';
  url: string;
  fit: 'cover' | 'contain' | 'fill' | 'center';
  brightness: number; // 50 to 150, default 100
  contrast: number; // 50 to 150, default 100
  blur: number; // 0 to 30, default 0
  saturation: number; // 0 to 200, default 100
  grayscale: number; // 0 to 100, default 0
  overlayColor: string; // hex
  overlayOpacity: number; // 0 to 0.8, default 0.2
  zoom: number; // 1 to 2
  source?: 'builtin' | 'imported';
  filename?: string;
  storedPath?: string;
  createdAt?: string;
  fileSizeBytes?: number;
}
