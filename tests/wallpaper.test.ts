import { describe, it, expect, beforeEach } from 'vitest';
import { WallpaperService, BUILTIN_WALLPAPERS } from '@/services/wallpapers/WallpaperService';
import { StorageService } from '@/services/storage/StorageService';

describe('WallpaperService & USB Host Import Pipeline', () => {
  let wallpaperService: WallpaperService;

  beforeEach(async () => {
    localStorage.clear();
    await StorageService.initialize();
    wallpaperService = WallpaperService.getInstance();
    await wallpaperService.initialize();
    // Reset to default
    await wallpaperService.setBothWallpapers({ ...BUILTIN_WALLPAPERS[0] });
  });

  it('loads built-in preset wallpapers by default', () => {
    const desktop = wallpaperService.getDesktopWallpaper();
    expect(desktop.id).toBe('nebula-teal');
    expect(desktop.type).toBe('preset');

    const available = wallpaperService.getAvailableWallpapers();
    expect(available.length).toBeGreaterThanOrEqual(8);
  });

  it('sets desktop, login, and synchronizes appropriately', async () => {
    const deepSpace = BUILTIN_WALLPAPERS.find((w) => w.id === 'deep-space')!;
    const oceanWaves = BUILTIN_WALLPAPERS.find((w) => w.id === 'ocean-waves')!;

    // By default, sync is enabled: setting desktop also updates login
    await wallpaperService.setDesktopWallpaper(deepSpace);
    expect(wallpaperService.getDesktopWallpaper().id).toBe('deep-space');
    expect(wallpaperService.getLoginWallpaper().id).toBe('deep-space');

    // Setting login wallpaper decouples sync
    await wallpaperService.setLoginWallpaper(oceanWaves);
    expect(wallpaperService.isSyncLoginEnabled()).toBe(false);
    expect(wallpaperService.getDesktopWallpaper().id).toBe('deep-space');
    expect(wallpaperService.getLoginWallpaper().id).toBe('ocean-waves');

    // setBothWallpapers sets both and re-enables sync
    await wallpaperService.setBothWallpapers(BUILTIN_WALLPAPERS[0]);
    expect(wallpaperService.isSyncLoginEnabled()).toBe(true);
    expect(wallpaperService.getDesktopWallpaper().id).toBe('nebula-teal');
    expect(wallpaperService.getLoginWallpaper().id).toBe('nebula-teal');
  });

  it('rejects unsupported file formats during host import', async () => {
    const badFile = new File(['binary'], 'malicious_script.exe', { type: 'application/x-msdownload' });
    const res = await wallpaperService.importWallpaperFromHost(badFile);

    expect(res.success).toBe(false);
    expect(res.message).toContain('Unsupported file format');
  });

  it('rejects files exceeding 20MB limit', async () => {
    // Mock a large file by overriding size property
    const largeFile = new File(['fake content'], 'giant_poster.png', { type: 'image/png' });
    Object.defineProperty(largeFile, 'size', { value: 25 * 1024 * 1024 });

    const res = await wallpaperService.importWallpaperFromHost(largeFile);
    expect(res.success).toBe(false);
    expect(res.message).toContain('20MB');
  });

  it('imports valid image file to EVAH USB without leaking host file paths', async () => {
    const validFile = new File(['mock image binary data'], 'Mountain Sunset.jpg', {
      type: 'image/jpeg',
    });

    const res = await wallpaperService.importWallpaperFromHost(validFile);
    expect(res.success).toBe(true);
    expect(res.wallpaper).toBeDefined();

    const wp = res.wallpaper!;
    expect(wp.name).toBe('Mountain Sunset');
    expect(wp.source).toBe('imported');
    expect(wp.type).toBe('custom');
    expect(wp.storedPath).toMatch(/^\/EVAH\/data\/wallpapers\/\d{8}-[a-z0-9]+-Mountain_Sunset\.jpg$/);

    // Verify file actually got written to USB storage
    const storage = StorageService.getAdapter();
    const fileExistsOnUsb = await storage.exists(wp.storedPath!);
    expect(fileExistsOnUsb).toBe(true);

    // Verify it is listed in available wallpapers
    const available = wallpaperService.getAvailableWallpapers();
    expect(available.some((w) => w.id === wp.id)).toBe(true);
  });

  it('detects duplicate wallpaper name and avoids redundant writes', async () => {
    const file1 = new File(['data 1'], 'Northern Lights.png', { type: 'image/png' });
    const res1 = await wallpaperService.importWallpaperFromHost(file1);
    expect(res1.success).toBe(true);

    const file2 = new File(['data 2'], 'Northern Lights.png', { type: 'image/png' });
    const res2 = await wallpaperService.importWallpaperFromHost(file2);
    expect(res2.success).toBe(true);
    expect(res2.message).toContain('Existing copy found');
    expect(res2.wallpaper?.id).toBe(res1.wallpaper?.id);
  });

  it('deletes custom wallpaper and reverts active desktop to default', async () => {
    const file = new File(['img'], 'Temporary Wallpaper.webp', { type: 'image/webp' });
    const res = await wallpaperService.importWallpaperFromHost(file);
    const custom = res.wallpaper!;

    // Set custom as active desktop
    await wallpaperService.setDesktopWallpaper(custom);
    expect(wallpaperService.getDesktopWallpaper().id).toBe(custom.id);

    // Delete custom wallpaper
    await wallpaperService.deleteCustomWallpaper(custom.id);

    // Should no longer exist in available list
    const available = wallpaperService.getAvailableWallpapers();
    expect(available.some((w) => w.id === custom.id)).toBe(false);

    // Active desktop should safely revert to default preset
    expect(wallpaperService.getDesktopWallpaper().id).toBe('nebula-teal');

    // Storage file should be deleted
    const storage = StorageService.getAdapter();
    const exists = await storage.exists(custom.storedPath!);
    expect(exists).toBe(false);
  });

  it('falls back safely to default preset if custom wallpaper file is missing on USB', async () => {
    const file = new File(['img'], 'Ephemeral.jpg', { type: 'image/jpeg' });
    const res = await wallpaperService.importWallpaperFromHost(file);
    const custom = res.wallpaper!;

    await wallpaperService.setDesktopWallpaper(custom);

    // Manually delete the physical file to simulate disconnected/corrupted file on USB
    const storage = StorageService.getAdapter();
    await storage.deleteFile(custom.storedPath!);

    // Re-initialize wallpaper service as if USB just re-connected
    await wallpaperService.initialize();

    // Desktop should safely fall back to default
    expect(wallpaperService.getDesktopWallpaper().id).toBe('nebula-teal');
  });
});
