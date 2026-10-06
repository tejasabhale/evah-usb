import { describe, it, expect, beforeEach } from 'vitest';
import { VaultCryptoService } from '@/services/vault/VaultCryptoService';
import { AuthService } from '@/services/auth/AuthService';
import { StorageService } from '@/services/storage/StorageService';

describe('VaultCryptoService & AES-256-GCM Encryption', () => {
  let vault: VaultCryptoService;
  let auth: AuthService;

  beforeEach(async () => {
    localStorage.clear();
    await StorageService.initialize();
    const storage = StorageService.getAdapter();
    try {
      await storage.deleteFile('/EVAH/data/vault/vault.enc');
      await storage.deleteFile('/EVAH/data/settings/user.json');
    } catch {
      // ignore if doesn't exist
    }
    auth = AuthService.getInstance();
    auth.purgeKeys();
    await auth.createInitialProfile('vaultuser', 'Vault Tester', 'MasterPassword123!');
    await auth.authenticate('MasterPassword123!');

    vault = VaultCryptoService.getInstance();
    vault.lockVault();
  });

  it('initializes and unlocks default vault container', async () => {
    expect(vault.isVaultUnlocked()).toBe(false);

    const vaultData = await vault.unlockVault();
    expect(vault.isVaultUnlocked()).toBe(true);
    expect(vaultData).toBeDefined();
    expect(vaultData.items.length).toBeGreaterThanOrEqual(1);
    expect(vaultData.version).toBe(1);
  });

  it('adds and retrieves encrypted vault items', async () => {
    await vault.unlockVault();

    const newItem = await vault.addItem({
      title: 'GitHub Personal Token',
      category: 'developer',
      username: 'octocat',
      password: 'ghp_secret_token_123456789',
      url: 'https://github.com',
      notes: 'Repo read/write token',
      isFavorite: true,
      customFields: [],
    });

    expect(newItem.id).toBeDefined();
    expect(newItem.title).toBe('GitHub Personal Token');

    const loaded = await vault.getVaultData();
    const found = loaded?.items.find((i) => i.id === newItem.id);
    expect(found).toBeDefined();
    expect(found?.password).toBe('ghp_secret_token_123456789');
  });

  it('updates an existing vault item', async () => {
    await vault.unlockVault();

    const item = await vault.addItem({
      title: 'Old Title',
      category: 'login',
      username: 'user1',
      password: 'pass1',
      isFavorite: false,
      customFields: [],
    });

    const updated = await vault.updateItem(item.id, {
      title: 'New Updated Title',
      password: 'new_super_secure_pass',
    });

    expect(updated.title).toBe('New Updated Title');
    expect(updated.password).toBe('new_super_secure_pass');
  });

  it('deletes a vault item', async () => {
    await vault.unlockVault();

    const item = await vault.addItem({
      title: 'To Be Deleted',
      category: 'note',
      notes: 'Temporary note',
      isFavorite: false,
      customFields: [],
    });

    await vault.deleteItem(item.id);

    const data = await vault.getVaultData();
    const found = data?.items.find((i) => i.id === item.id);
    expect(found).toBeUndefined();
  });

  it('locks vault and completely purges decrypted items from memory', async () => {
    await vault.unlockVault();
    expect(vault.isVaultUnlocked()).toBe(true);

    vault.lockVault();
    expect(vault.isVaultUnlocked()).toBe(false);

    const data = await vault.getVaultData();
    expect(data).toBeNull();
  });

  it('fails decryption gracefully if encrypted payload is tampered with', async () => {
    await vault.unlockVault();
    vault.lockVault();

    // Corrupt vault.enc on storage
    const storage = StorageService.getAdapter();
    await storage.writeFile('/EVAH/data/vault/vault.enc', 'dGFtcGVyZWRfYmFzZTY0X25vdF92YWxpZF9jaXBoZXI=');

    await expect(vault.unlockVault()).rejects.toThrow();
  });
});
