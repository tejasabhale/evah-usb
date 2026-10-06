import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'path';
import fs from 'fs/promises';
import { storageRepository } from '../src/repositories/storage.repository';
import { authService } from '../src/services/auth.service';
import { vaultService } from '../src/services/vault.service';
import { usbService } from '../src/services/usb.service';
import { UnauthorizedError, DeviceNotFoundError } from '../src/errors/app-error';

const TEST_DIR = path.resolve(__dirname, '../../.test_evah_service');

describe('Server Application Services & Hardware Binding', () => {
  beforeAll(async () => {
    await fs.mkdir(TEST_DIR, { recursive: true });
    storageRepository.setBasePath(TEST_DIR);
    await storageRepository.initializeEvahStructure();
    await authService.ensureAuthInitialized();
  });

  afterAll(async () => {
    usbService.stopMonitoring();
    try {
      await fs.rm(TEST_DIR, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it('authenticates user with default credentials', async () => {
    const { session, profile } = await authService.login('evah');
    expect(session.token).toBeDefined();
    expect(profile.username).toBe('evah');
    expect(authService.getActiveSessionCount()).toBeGreaterThanOrEqual(1);

    const verified = authService.verifySession(session.token);
    expect(verified.userId).toBe(profile.id);
  });

  it('rejects incorrect login passwords', async () => {
    await expect(authService.login('invalid-password')).rejects.toThrow(UnauthorizedError);
  });

  it('manages vault lifecycle: unlock, create item, lock', async () => {
    expect(vaultService.isUnlocked()).toBe(false);

    const items = await vaultService.unlock('evah-master-key');
    expect(vaultService.isUnlocked()).toBe(true);
    expect(items.length).toBeGreaterThanOrEqual(1);

    const saved = await vaultService.saveItem({
      id: 'vlt_srv_1',
      title: 'Database Admin Password',
      type: 'login',
      username: 'root',
      password: 'postgres-secure-password',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    expect(saved.id).toBe('vlt_srv_1');
    const all = vaultService.getItems();
    expect(all.some((i) => i.id === 'vlt_srv_1')).toBe(true);

    vaultService.lockVault();
    expect(vaultService.isUnlocked()).toBe(false);
    expect(() => vaultService.getItems()).toThrow(UnauthorizedError);
  });

  it('invalidates sessions and locks vault on simulated USB disconnect', async () => {
    // Ensure active session & unlocked vault
    const { session } = await authService.login('evah');
    await vaultService.unlock('evah-master-key');
    expect(authService.getActiveSessionCount()).toBeGreaterThan(0);
    expect(vaultService.isUnlocked()).toBe(true);

    // Simulate physical USB removal
    usbService.triggerDisconnect();

    expect(vaultService.isUnlocked()).toBe(false);
    expect(authService.getActiveSessionCount()).toBe(0);

    // Verifying session or trying to log in throws DeviceNotFoundError
    expect(() => authService.verifySession(session.token)).toThrow(DeviceNotFoundError);
    await expect(authService.login('evah')).rejects.toThrow(DeviceNotFoundError);

    // Reconnect device
    await usbService.triggerConnect();
    expect(usbService.isUsbPresent()).toBe(true);
  });
});
