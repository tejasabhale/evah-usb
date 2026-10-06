import { describe, it, expect, beforeEach } from 'vitest';
import { AuthService } from '@/services/auth/AuthService';
import { StorageService } from '@/services/storage/StorageService';

describe('AuthService & Cryptographic Authentication', () => {
  let auth: AuthService;

  beforeEach(async () => {
    localStorage.clear();
    await StorageService.initialize();
    auth = AuthService.getInstance();
    auth.purgeKeys();
  });

  it('creates an initial user profile with salted PBKDF2 key', async () => {
    const profile = await auth.createInitialProfile('alice', 'Alice Vane', 'correct-horse-battery-staple');
    expect(profile).toBeDefined();
    expect(profile.username).toBe('alice');
    expect(profile.fullName).toBe('Alice Vane');
    expect(profile.passwordSalt).toBeDefined();
    expect(profile.passwordHash).toBeDefined();
    expect(profile.passwordSalt.length).toBe(32); // 16 bytes hex

    const exists = await auth.hasExistingProfile();
    expect(exists).toBe(true);
  });

  it('authenticates successfully with the correct password', async () => {
    await auth.createInitialProfile('bob', 'Bob Smith', 'SecurePass123!');
    auth.purgeKeys();
    expect(auth.isKeyUnlocked()).toBe(false);

    const success = await auth.authenticate('SecurePass123!');
    expect(success).toBe(true);
    expect(auth.isKeyUnlocked()).toBe(true);
    expect(auth.getMasterKey()).not.toBeNull();
    expect(auth.getCurrentUser()?.username).toBe('bob');
  });

  it('rejects incorrect passwords and refuses key unlock', async () => {
    await auth.createInitialProfile('charlie', 'Charlie', 'MyPassword999');
    auth.purgeKeys();

    const success = await auth.authenticate('WrongPassword');
    expect(success).toBe(false);
    expect(auth.isKeyUnlocked()).toBe(false);
    expect(auth.getMasterKey()).toBeNull();
  });

  it('purges keys from memory immediately on logout/lock', async () => {
    await auth.createInitialProfile('dana', 'Dana', 'DanaPass');
    await auth.authenticate('DanaPass');
    expect(auth.isKeyUnlocked()).toBe(true);

    auth.purgeKeys();
    expect(auth.isKeyUnlocked()).toBe(false);
    expect(auth.getMasterKey()).toBeNull();
  });

  it('loads and persists session settings', async () => {
    const settings = await auth.getSettings();
    expect(settings).toBeDefined();
    expect(settings.autoLockMinutes).toBeGreaterThanOrEqual(1);

    await auth.saveSettings({ ...settings, autoLockMinutes: 15 });
    const updated = await auth.getSettings();
    expect(updated.autoLockMinutes).toBe(15);
  });
});
