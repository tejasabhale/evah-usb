import { describe, it, expect, beforeEach } from 'vitest';
import { SessionManager } from '@/services/session/SessionManager';
import { AuthService } from '@/services/auth/AuthService';
import { VaultCryptoService } from '@/services/vault/VaultCryptoService';
import { StorageService } from '@/services/storage/StorageService';

describe('SessionManager & Security Lifecycle Enforcement', () => {
  let session: SessionManager;
  let auth: AuthService;
  let vault: VaultCryptoService;

  beforeEach(async () => {
    localStorage.clear();
    await StorageService.initialize();
    const storage = StorageService.getAdapter();
    try {
      await storage.deleteFile('/EVAH/data/vault/vault.enc');
      await storage.deleteFile('/EVAH/data/settings/user.json');
    } catch {
      // ignore
    }
    auth = AuthService.getInstance();
    vault = VaultCryptoService.getInstance();
    session = SessionManager.getInstance();

    await auth.createInitialProfile('tester', 'Tester', 'Password123!');
    await auth.authenticate('Password123!');
    session.completeLogin();
  });

  it('enters ACTIVE_SESSION on completeLogin()', () => {
    expect(session.getState()).toBe('ACTIVE_SESSION');
  });

  it('locks session and purges vault on user lock', async () => {
    await vault.unlockVault();
    expect(vault.isVaultUnlocked()).toBe(true);

    session.lockSession('Manual Lock');
    expect(session.getState()).toBe('LOCKED');
    expect(vault.isVaultUnlocked()).toBe(false);
  });

  it('triggers emergency PANIC_LOCKED, drops all keys and wipes state', async () => {
    await vault.unlockVault();
    expect(auth.isKeyUnlocked()).toBe(true);
    expect(vault.isVaultUnlocked()).toBe(true);

    session.panicLock();

    expect(session.getState()).toBe('PANIC_LOCKED');
    expect(auth.isKeyUnlocked()).toBe(false);
    expect(vault.isVaultUnlocked()).toBe(false);
  });

  it('unlocks locked session only with valid credentials', async () => {
    session.lockSession('Test lock');
    expect(session.getState()).toBe('LOCKED');

    const failed = await session.unlockSession('WrongPassword');
    expect(failed).toBe(false);
    expect(session.getState()).toBe('LOCKED');

    const success = await session.unlockSession('Password123!');
    expect(success).toBe(true);
    expect(session.getState()).toBe('ACTIVE_SESSION');
  });
});
