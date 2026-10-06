import { WallpaperConfig } from '@/types/theme';
import { StorageService } from '@/services/storage/StorageService';

const WALLPAPER_CONFIG_PATH = '/EVAH/data/settings/wallpaper.json';

export const BUILTIN_WALLPAPERS: WallpaperConfig[] = [
  {
    id: 'nebula-teal',
    name: 'Nebula Teal (Default)',
    type: 'preset',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080"><defs><radialGradient id="g1" cx="30%" cy="20%" r="65%"><stop offset="0%" stop-color="%2314b8a6" stop-opacity="0.6"/><stop offset="50%" stop-color="%230f172a" stop-opacity="0.9"/><stop offset="100%" stop-color="%2305070f"/></radialGradient><radialGradient id="g2" cx="80%" cy="75%" r="55%"><stop offset="0%" stop-color="%232563eb" stop-opacity="0.45"/><stop offset="60%" stop-color="%230f172a" stop-opacity="0.8"/><stop offset="100%" stop-color="%23020617"/></radialGradient></defs><rect width="1920" height="1080" fill="%23070b14"/><rect width="1920" height="1080" fill="url(%23g1)"/><rect width="1920" height="1080" fill="url(%23g2)"/><circle cx="960" cy="540" r="420" fill="none" stroke="%232dd4bf" stroke-width="1.5" stroke-opacity="0.08"/><circle cx="960" cy="540" r="640" fill="none" stroke="%2338bdf8" stroke-width="1.5" stroke-dasharray="12 12" stroke-opacity="0.05"/></svg>',
    fit: 'cover',
    brightness: 100,
    contrast: 100,
    blur: 0,
    saturation: 100,
    grayscale: 0,
    overlayColor: '#000000',
    overlayOpacity: 0.15,
    zoom: 1,
  },
  {
    id: 'deep-space',
    name: 'Deep Space Obsidian',
    type: 'preset',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080"><defs><radialGradient id="sp" cx="50%" cy="40%" r="60%"><stop offset="0%" stop-color="%231e293b" stop-opacity="0.6"/><stop offset="70%" stop-color="%23090d16"/><stop offset="100%" stop-color="%23020408"/></radialGradient></defs><rect width="1920" height="1080" fill="url(%23sp)"/><circle cx="340" cy="220" r="1.5" fill="%23ffffff" opacity="0.6"/><circle cx="780" cy="140" r="1.2" fill="%23ffffff" opacity="0.8"/><circle cx="1400" cy="300" r="2" fill="%23ffffff" opacity="0.7"/><circle cx="1600" cy="720" r="1" fill="%23ffffff" opacity="0.5"/><circle cx="500" cy="850" r="1.8" fill="%235eead4" opacity="0.6"/></svg>',
    fit: 'cover',
    brightness: 100,
    contrast: 105,
    blur: 0,
    saturation: 100,
    grayscale: 0,
    overlayColor: '#000000',
    overlayOpacity: 0.1,
    zoom: 1,
  },
  {
    id: 'minimal-light',
    name: 'Studio Daybreak',
    type: 'preset',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080"><defs><linearGradient id="ml" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23f1f5f9"/><stop offset="40%" stop-color="%23e2e8f0"/><stop offset="100%" stop-color="%23cbd5e1"/></linearGradient><radialGradient id="ml-glow" cx="60%" cy="40%" r="50%"><stop offset="0%" stop-color="%23ccfbf1" stop-opacity="0.6"/><stop offset="100%" stop-color="%23e2e8f0" stop-opacity="0"/></radialGradient></defs><rect width="1920" height="1080" fill="url(%23ml)"/><rect width="1920" height="1080" fill="url(%23ml-glow)"/><path d="M0 600 Q 480 400 960 620 T 1920 500 L 1920 1080 L 0 1080 Z" fill="%2394a3b8" opacity="0.12"/></svg>',
    fit: 'cover',
    brightness: 100,
    contrast: 100,
    blur: 0,
    saturation: 100,
    grayscale: 0,
    overlayColor: '#ffffff',
    overlayOpacity: 0.05,
    zoom: 1,
  },
  {
    id: 'ocean-waves',
    name: 'Ocean Bathymetry',
    type: 'preset',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080"><defs><linearGradient id="oc" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%230c1e3d"/><stop offset="60%" stop-color="%23061224"/><stop offset="100%" stop-color="%23020612"/></linearGradient></defs><rect width="1920" height="1080" fill="url(%23oc)"/><path d="M0 450 Q 480 300 960 460 T 1920 380 L 1920 1080 L 0 1080 Z" fill="%230284c7" opacity="0.15"/><path d="M0 620 Q 520 480 1040 640 T 1920 560 L 1920 1080 L 0 1080 Z" fill="%230369a1" opacity="0.22"/><path d="M0 800 Q 450 680 900 820 T 1920 720 L 1920 1080 L 0 1080 Z" fill="%23075985" opacity="0.28"/></svg>',
    fit: 'cover',
    brightness: 100,
    contrast: 100,
    blur: 0,
    saturation: 105,
    grayscale: 0,
    overlayColor: '#000000',
    overlayOpacity: 0.15,
    zoom: 1,
  },
  {
    id: 'forest-canopy',
    name: 'Forest Canopy',
    type: 'preset',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080"><defs><radialGradient id="fc" cx="40%" cy="30%" r="70%"><stop offset="0%" stop-color="%23064e3b" stop-opacity="0.7"/><stop offset="60%" stop-color="%2306281e"/><stop offset="100%" stop-color="%2302140e"/></radialGradient></defs><rect width="1920" height="1080" fill="url(%23fc)"/><circle cx="1200" cy="400" r="380" fill="%23059669" opacity="0.08"/><circle cx="500" cy="700" r="450" fill="%2310b981" opacity="0.06"/></svg>',
    fit: 'cover',
    brightness: 100,
    contrast: 100,
    blur: 0,
    saturation: 100,
    grayscale: 0,
    overlayColor: '#000000',
    overlayOpacity: 0.15,
    zoom: 1,
  },
  {
    id: 'geometric-slate',
    name: 'Executive Slate',
    type: 'preset',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080"><defs><linearGradient id="sl" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%231e293b"/><stop offset="50%" stop-color="%230f172a"/><stop offset="100%" stop-color="%23020617"/></linearGradient></defs><rect width="1920" height="1080" fill="url(%23sl)"/><polygon points="0,0 800,0 400,600" fill="%23334155" opacity="0.12"/><polygon points="800,0 1600,0 1200,800" fill="%23475569" opacity="0.08"/><polygon points="400,600 1200,800 600,1080 0,1080" fill="%231e293b" opacity="0.18"/></svg>',
    fit: 'cover',
    brightness: 100,
    contrast: 100,
    blur: 0,
    saturation: 90,
    grayscale: 0,
    overlayColor: '#000000',
    overlayOpacity: 0.15,
    zoom: 1,
  },
  {
    id: 'warm-amber',
    name: 'Sunset Ember',
    type: 'preset',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080"><defs><radialGradient id="am" cx="70%" cy="30%" r="60%"><stop offset="0%" stop-color="%23c2410c" stop-opacity="0.6"/><stop offset="45%" stop-color="%23431407" stop-opacity="0.8"/><stop offset="100%" stop-color="%23180804"/></radialGradient></defs><rect width="1920" height="1080" fill="url(%23am)"/><circle cx="1400" cy="300" r="300" fill="%23fb923c" opacity="0.12"/><circle cx="400" cy="800" r="400" fill="%23b45309" opacity="0.09"/></svg>',
    fit: 'cover',
    brightness: 100,
    contrast: 100,
    blur: 0,
    saturation: 105,
    grayscale: 0,
    overlayColor: '#000000',
    overlayOpacity: 0.15,
    zoom: 1,
  },
  {
    id: 'monochrome-mesh',
    name: 'Titanium Monochrome',
    type: 'preset',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080"><defs><linearGradient id="mono" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="%231e1e1e"/><stop offset="100%" stop-color="%230d0d0d"/></linearGradient></defs><rect width="1920" height="1080" fill="url(%23mono)"/><line x1="0" y1="270" x2="1920" y2="270" stroke="%23333333" stroke-width="1" opacity="0.25"/><line x1="0" y1="540" x2="1920" y2="540" stroke="%23333333" stroke-width="1" opacity="0.25"/><line x1="0" y1="810" x2="1920" y2="810" stroke="%23333333" stroke-width="1" opacity="0.25"/><line x1="480" y1="0" x2="480" y2="1080" stroke="%23333333" stroke-width="1" opacity="0.25"/><line x1="960" y1="0" x2="960" y2="1080" stroke="%23333333" stroke-width="1" opacity="0.25"/><line x1="1440" y1="0" x2="1440" y2="1080" stroke="%23333333" stroke-width="1" opacity="0.25"/></svg>',
    fit: 'cover',
    brightness: 100,
    contrast: 100,
    blur: 0,
    saturation: 0,
    grayscale: 100,
    overlayColor: '#000000',
    overlayOpacity: 0.1,
    zoom: 1,
  }
];

export class WallpaperService {
  private static instance: WallpaperService;
  private currentDesktop: WallpaperConfig = { ...BUILTIN_WALLPAPERS[0] };
  private currentLogin: WallpaperConfig = { ...BUILTIN_WALLPAPERS[0] };
  private customWallpapers: WallpaperConfig[] = [];
  private syncLoginWithDesktop = true;

  private constructor() {}

  public static getInstance(): WallpaperService {
    if (!WallpaperService.instance) {
      WallpaperService.instance = new WallpaperService();
    }
    return WallpaperService.instance;
  }

  public async initialize(): Promise<void> {
    try {
      const storage = StorageService.getAdapter();
      if (await storage.exists(WALLPAPER_CONFIG_PATH)) {
        const raw = await storage.readFile(WALLPAPER_CONFIG_PATH);
        const saved = JSON.parse(raw);
        if (saved.desktop) this.currentDesktop = saved.desktop;
        if (saved.login) this.currentLogin = saved.login;
        if (saved.custom) this.customWallpapers = saved.custom;
        if (saved.syncLoginWithDesktop !== undefined) {
          this.syncLoginWithDesktop = saved.syncLoginWithDesktop;
        }

        // Section 33: Verify referenced wallpaper exists on USB, else fallback safely
        if (this.currentDesktop.storedPath) {
          const exists = await storage.exists(this.currentDesktop.storedPath);
          if (!exists) {
            console.warn(`Wallpaper file ${this.currentDesktop.storedPath} not found on USB. Reverting to default.`);
            this.currentDesktop = { ...BUILTIN_WALLPAPERS[0] };
          }
        }
        if (this.currentLogin.storedPath) {
          const exists = await storage.exists(this.currentLogin.storedPath);
          if (!exists) {
            this.currentLogin = { ...BUILTIN_WALLPAPERS[0] };
          }
        }
      }
    } catch (e) {
      console.warn('Could not read wallpaper settings, using default', e);
      this.currentDesktop = { ...BUILTIN_WALLPAPERS[0] };
      this.currentLogin = { ...BUILTIN_WALLPAPERS[0] };
    }
  }

  public getDesktopWallpaper(): WallpaperConfig {
    return this.currentDesktop;
  }

  public getLoginWallpaper(): WallpaperConfig {
    return this.syncLoginWithDesktop ? this.currentDesktop : this.currentLogin;
  }

  public getAvailableWallpapers(): WallpaperConfig[] {
    return [...BUILTIN_WALLPAPERS, ...this.customWallpapers];
  }

  public isSyncLoginEnabled(): boolean {
    return this.syncLoginWithDesktop;
  }

  public setSyncLogin(sync: boolean): void {
    this.syncLoginWithDesktop = sync;
    if (sync) {
      this.currentLogin = { ...this.currentDesktop };
    }
    this.persist();
  }

  public async setDesktopWallpaper(config: WallpaperConfig): Promise<void> {
    this.currentDesktop = config;
    if (this.syncLoginWithDesktop) {
      this.currentLogin = { ...config };
    }
    await this.persist();
  }

  public async setLoginWallpaper(config: WallpaperConfig): Promise<void> {
    this.currentLogin = config;
    this.syncLoginWithDesktop = false;
    await this.persist();
  }

  public async setBothWallpapers(config: WallpaperConfig): Promise<void> {
    this.currentDesktop = config;
    this.currentLogin = { ...config };
    this.syncLoginWithDesktop = true;
    await this.persist();
  }

  /**
   * Section 24-30: Imports host computer image, validates, copies into EVAH USB (/EVAH/data/wallpapers/),
   * and saves metadata without leaking personal host file paths.
   */
  public async importWallpaperFromHost(file: File): Promise<{ success: boolean; wallpaper?: WallpaperConfig; message?: string }> {
    // 1. Validation: Allowed formats
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!allowedExtensions.includes(ext)) {
      return {
        success: false,
        message: `Unsupported file format (.${ext}). Supported: JPG, PNG, WEBP, GIF.`,
      };
    }

    // 2. Validation: Maximum 20MB
    const MAX_SIZE_BYTES = 20 * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      return {
        success: false,
        message: 'Wallpaper file size exceeds 20MB limit.',
      };
    }

    // 3. Duplicate check by clean name
    const rawBaseName = file.name.replace(/\.[^/.]+$/, '').trim();
    const existing = this.customWallpapers.find(
      (w) => w.name.toLowerCase() === rawBaseName.toLowerCase()
    );
    if (existing) {
      return {
        success: true,
        wallpaper: existing,
        message: 'Existing copy found on EVAH USB.',
      };
    }

    // 4. Sanitize filename (Section 27 & 65: No host paths)
    const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randSuffix = Math.random().toString(36).substring(2, 6);
    const sanitizedFilename = `${timestamp}-${randSuffix}-${cleanName}`;
    const targetUsbPath = `/EVAH/data/wallpapers/${sanitizedFilename}`;

    try {
      // 5. Read file as Base64 Data URL
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed reading file from host'));
        reader.readAsDataURL(file);
      });

      // 6. Write image copy to EVAH USB
      const storage = StorageService.getAdapter();
      await storage.writeFile(targetUsbPath, dataUrl);

      // 7. Create clean WallpaperConfig metadata
      const newWallpaper: WallpaperConfig = {
        id: `wp_host_${Date.now()}_${randSuffix}`,
        name: rawBaseName,
        type: 'custom',
        source: 'imported',
        filename: sanitizedFilename,
        storedPath: targetUsbPath,
        url: dataUrl,
        createdAt: new Date().toISOString(),
        fileSizeBytes: file.size,
        fit: 'cover',
        brightness: 100,
        contrast: 100,
        blur: 0,
        saturation: 100,
        grayscale: 0,
        overlayColor: '#000000',
        overlayOpacity: 0.15,
        zoom: 1,
      };

      this.customWallpapers.push(newWallpaper);
      await this.persist();

      return {
        success: true,
        wallpaper: newWallpaper,
      };
    } catch (err: any) {
      console.error('Failed importing wallpaper to USB:', err);
      return {
        success: false,
        message: err.message || 'Failed saving wallpaper to USB',
      };
    }
  }

  public async deleteCustomWallpaper(id: string): Promise<void> {
    const target = this.customWallpapers.find((w) => w.id === id);
    if (!target) return;

    this.customWallpapers = this.customWallpapers.filter((w) => w.id !== id);

    // If active was this wallpaper, revert to default
    if (this.currentDesktop.id === id) {
      this.currentDesktop = { ...BUILTIN_WALLPAPERS[0] };
    }
    if (this.currentLogin.id === id) {
      this.currentLogin = { ...BUILTIN_WALLPAPERS[0] };
    }

    // Try deleting physical file on USB
    if (target.storedPath) {
      try {
        const storage = StorageService.getAdapter();
        await storage.deleteFile(target.storedPath);
      } catch {
        // ignore
      }
    }

    await this.persist();
  }

  public async addCustomWallpaper(name: string, dataUrl: string): Promise<WallpaperConfig> {
    const config: WallpaperConfig = {
      id: 'custom_' + Date.now(),
      name,
      type: 'custom',
      source: 'imported',
      url: dataUrl,
      fit: 'cover',
      brightness: 100,
      contrast: 100,
      blur: 0,
      saturation: 100,
      grayscale: 0,
      overlayColor: '#000000',
      overlayOpacity: 0.15,
      zoom: 1,
    };
    this.customWallpapers.push(config);
    await this.persist();
    return config;
  }

  public async updateWallpaperAdjustment(id: string, updates: Partial<WallpaperConfig>): Promise<void> {
    if (this.currentDesktop.id === id) {
      this.currentDesktop = { ...this.currentDesktop, ...updates };
      if (this.syncLoginWithDesktop) {
        this.currentLogin = { ...this.currentDesktop };
      }
    }
    if (this.currentLogin.id === id) {
      this.currentLogin = { ...this.currentLogin, ...updates };
    }

    const idx = this.customWallpapers.findIndex((w) => w.id === id);
    if (idx !== -1) {
      this.customWallpapers[idx] = { ...this.customWallpapers[idx], ...updates };
    }
    await this.persist();
  }

  private async persist(): Promise<void> {
    try {
      const storage = StorageService.getAdapter();
      const payload = {
        desktop: this.currentDesktop,
        login: this.currentLogin,
        custom: this.customWallpapers,
        syncLoginWithDesktop: this.syncLoginWithDesktop,
      };
      await storage.writeFile(WALLPAPER_CONFIG_PATH, JSON.stringify(payload, null, 2));
    } catch (e) {
      console.error('Failed to persist wallpaper settings', e);
    }
  }
}
