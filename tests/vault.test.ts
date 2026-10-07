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
      await storage.deleteFile('/EVAH/data/vault/vault_config.json');
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

  describe('Dedicated Vault Master Password & Persistence Lifecycle', () => {
    it('reports not configured initially and requires 6+ chars to setup', async () => {
      const isConfiguredInitial = await vault.isVaultConfigured();
      expect(isConfiguredInitial).toBe(false);

      await expect(vault.setupVault('short')).rejects.toThrow(/at least 6 characters/i);
    });

    it('sets up dedicated vault password and unlocks with correct credentials', async () => {
      const initialData = await vault.setupVault('MyVaultSecret123!');
      expect(initialData).toBeDefined();
      expect(initialData.items.length).toBeGreaterThan(0);
      expect(await vault.isVaultConfigured()).toBe(true);
      expect(vault.isVaultUnlocked()).toBe(true);

      // Lock vault
      vault.lockVault();
      expect(vault.isVaultUnlocked()).toBe(false);

      // Attempt unlocking with wrong password
      await expect(vault.unlockVault('WrongSecretPass')).rejects.toThrow(/incorrect/i);
      expect(vault.isVaultUnlocked()).toBe(false);

      // Attempt unlocking with correct password
      const unlockedData = await vault.unlockVault('MyVaultSecret123!');
      expect(vault.isVaultUnlocked()).toBe(true);
      expect(unlockedData.items.length).toBe(initialData.items.length);
    });

    it('changes vault password and re-encrypts stored secrets', async () => {
      await vault.setupVault('OldPassword123!');

      // Add a secret under the old password
      const secret = await vault.addItem({
        title: 'Sensitive Production Key',
        category: 'developer',
        password: 'prod-super-secret-key-99',
        isFavorite: true,
        customFields: [],
      });

      // Attempt change with wrong current password
      await expect(
        vault.changeVaultPassword('IncorrectOldPass', 'NewPassword456!')
      ).rejects.toThrow(/incorrect/i);

      // Attempt change with short new password
      await expect(
        vault.changeVaultPassword('OldPassword123!', '123')
      ).rejects.toThrow(/at least 6 characters/i);

      // Successfully change password
      await vault.changeVaultPassword('OldPassword123!', 'NewPassword456!');

      // Lock vault
      vault.lockVault();

      // Old password should now fail
      await expect(vault.unlockVault('OldPassword123!')).rejects.toThrow(/incorrect/i);

      // New password should succeed and retain the added secret
      const unlocked = await vault.unlockVault('NewPassword456!');
      expect(unlocked).toBeDefined();
      const found = unlocked.items.find((i) => i.id === secret.id);
      expect(found).toBeDefined();
      expect(found?.password).toBe('prod-super-secret-key-99');
    });
  });
});

