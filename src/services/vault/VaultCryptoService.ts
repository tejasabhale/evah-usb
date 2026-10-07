import { VaultData, VaultItem } from '@/types/vault';
import { StorageService } from '@/services/storage/StorageService';
import { AuthService } from '@/services/auth/AuthService';

const VAULT_CONFIG_PATH = '/EVAH/data/vault/vault_config.json';
const VAULT_ENC_PATH = '/EVAH/data/vault/vault.enc';

export interface VaultConfig {
  isConfigured: boolean;
  passwordSalt: string; // hex string of 16-byte random salt
  verifierHash: string; // hex string of SHA-256 digest of derived key
  iterations: number;
  createdAt: string;
  updatedAt: string;
}

export class VaultCryptoService {
  private static instance: VaultCryptoService;
  private decryptedCache: VaultData | null = null;
  private activeVaultKey: CryptoKey | null = null;
  private isUnlocked = false;

  private constructor() {}

  public static getInstance(): VaultCryptoService {
    if (!VaultCryptoService.instance) {
      VaultCryptoService.instance = new VaultCryptoService();
    }
    return VaultCryptoService.instance;
  }

  public isVaultUnlocked(): boolean {
    return this.isUnlocked && this.decryptedCache !== null;
  }

  public lockVault(): void {
    // Zero decrypted cache and revoke key from memory
    this.decryptedCache = null;
    this.activeVaultKey = null;
    this.isUnlocked = false;
  }

  /**
   * Checks whether the user has already configured the Vault password on USB storage.
   */
  public async isVaultConfigured(): Promise<boolean> {
    try {
      const storage = StorageService.getAdapter();
      if (!(await storage.exists(VAULT_CONFIG_PATH))) {
        return false;
      }
      const raw = await storage.readFile(VAULT_CONFIG_PATH);
      const config: VaultConfig = JSON.parse(raw);
      return Boolean(config.isConfigured && config.passwordSalt && config.verifierHash);
    } catch {
      return false;
    }
  }

  /**
   * First-time setup: generates random salt, derives PBKDF2/AES-GCM key,
   * stores verification metadata on USB, and encrypts initial vault data.
   */
  public async setupVault(password: string): Promise<VaultData> {
    if (!password || password.trim().length < 6) {
      throw new Error('Vault password must be at least 6 characters.');
    }

    const saltBytes = window.crypto.getRandomValues(new Uint8Array(16));
    const { key } = await this.deriveKeyFromPassword(password.trim(), saltBytes);
    const verifierHash = await this.hashKeyForStorage(key);

    const now = new Date().toISOString();
    const config: VaultConfig = {
      isConfigured: true,
      passwordSalt: this.bytesToHex(saltBytes),
      verifierHash,
      iterations: 100000,
      createdAt: now,
      updatedAt: now,
    };

    const storage = StorageService.getAdapter();
    await storage.writeFile(VAULT_CONFIG_PATH, JSON.stringify(config, null, 2));

    const initialVault = this.createDefaultVault();
    const encryptedBase64 = await this.encryptPayload(initialVault, key);
    await storage.writeFile(VAULT_ENC_PATH, encryptedBase64);

    this.activeVaultKey = key;
    this.decryptedCache = initialVault;
    this.isUnlocked = true;

    return initialVault;
  }

  /**
   * Unlocks vault using either dedicated vault password, or falls back to master key.
   */
  public async unlockVault(customPassword?: string): Promise<VaultData> {
    const storage = StorageService.getAdapter();
    const hasConfig = await this.isVaultConfigured();

    if (hasConfig) {
      if (!customPassword) {
        // Fallback: check if session master key can decrypt
        const auth = AuthService.getInstance();
        const masterKey = auth.getMasterKey();
        if (masterKey) {
          try {
            const encryptedBase64 = await storage.readFile(VAULT_ENC_PATH);
            const decrypted = await this.decryptPayload(encryptedBase64, masterKey);
            this.activeVaultKey = masterKey;
            this.decryptedCache = decrypted;
            this.isUnlocked = true;
            return decrypted;
          } catch {
            // master key does not match dedicated vault password
          }
        }
        throw new Error('Vault password required.');
      }

      const raw = await storage.readFile(VAULT_CONFIG_PATH);
      const config: VaultConfig = JSON.parse(raw);
      const saltBytes = this.hexToBytes(config.passwordSalt);

      const { key } = await this.deriveKeyFromPassword(customPassword.trim(), saltBytes);
      const computedHash = await this.hashKeyForStorage(key);

      if (computedHash !== config.verifierHash) {
        throw new Error('Incorrect Vault password.');
      }

      if (!(await storage.exists(VAULT_ENC_PATH))) {
        const initialVault = this.createDefaultVault();
        await this.saveVault(initialVault, key);
        this.activeVaultKey = key;
        this.decryptedCache = initialVault;
        this.isUnlocked = true;
        return initialVault;
      }

      try {
        const encryptedBase64 = await storage.readFile(VAULT_ENC_PATH);
        const decrypted = await this.decryptPayload(encryptedBase64, key);
        this.activeVaultKey = key;
        this.decryptedCache = decrypted;
        this.isUnlocked = true;
        return decrypted;
      } catch (e) {
        console.error('Failed to decrypt vault:', e);
        throw new Error('Vault decryption failed. Encrypted data may be corrupted.');
      }
    } else {
      // Not yet configured with dedicated config
      if (customPassword) {
        return this.setupVault(customPassword);
      }

      // Backward compatibility with test harness or unconfigured sessions
      const auth = AuthService.getInstance();
      const cryptoKey = auth.getMasterKey();
      if (!cryptoKey) {
        throw new Error('Vault is not set up. Please create a Vault password.');
      }

      const exists = await storage.exists(VAULT_ENC_PATH);
      if (!exists) {
        const initialVault = this.createDefaultVault();
        await this.saveVault(initialVault, cryptoKey);
        this.activeVaultKey = cryptoKey;
        this.decryptedCache = initialVault;
        this.isUnlocked = true;
        return initialVault;
      }

      try {
        const encryptedBase64 = await storage.readFile(VAULT_ENC_PATH);
        const decrypted = await this.decryptPayload(encryptedBase64, cryptoKey);
        this.activeVaultKey = cryptoKey;
        this.decryptedCache = decrypted;
        this.isUnlocked = true;
        return decrypted;
      } catch (e) {
        console.error('Failed to decrypt vault with master key:', e);
        throw new Error('Vault decryption failed.');
      }
    }
  }

  /**
   * Changes the vault password: verifies old password, re-encrypts all items with new key.
   */
  public async changeVaultPassword(currentPassword: string, newPassword: string): Promise<void> {
    if (!newPassword || newPassword.trim().length < 6) {
      throw new Error('New password must be at least 6 characters.');
    }

    const storage = StorageService.getAdapter();
    if (!(await this.isVaultConfigured())) {
      // If not configured, set it up directly
      await this.setupVault(newPassword);
      return;
    }

    const raw = await storage.readFile(VAULT_CONFIG_PATH);
    const config: VaultConfig = JSON.parse(raw);
    const curSaltBytes = this.hexToBytes(config.passwordSalt);

    // 1. Verify current password
    const { key: curKey } = await this.deriveKeyFromPassword(currentPassword.trim(), curSaltBytes);
    const curComputedHash = await this.hashKeyForStorage(curKey);
    if (curComputedHash !== config.verifierHash) {
      throw new Error('Current Vault password is incorrect.');
    }

    // 2. Ensure current data is decrypted in memory
    let currentData = this.decryptedCache;
    if (!currentData) {
      const encryptedBase64 = await storage.readFile(VAULT_ENC_PATH);
      currentData = await this.decryptPayload(encryptedBase64, curKey);
      this.decryptedCache = currentData;
    }

    // 3. Generate fresh salt and derive new key
    const newSaltBytes = window.crypto.getRandomValues(new Uint8Array(16));
    const { key: newKey } = await this.deriveKeyFromPassword(newPassword.trim(), newSaltBytes);
    const newVerifierHash = await this.hashKeyForStorage(newKey);

    // 4. Re-encrypt with new key and persist
    currentData.lastModified = new Date().toISOString();
    const newEncryptedBase64 = await this.encryptPayload(currentData, newKey);
    await storage.writeFile(VAULT_ENC_PATH, newEncryptedBase64);

    // 5. Update vault_config.json
    const updatedConfig: VaultConfig = {
      ...config,
      passwordSalt: this.bytesToHex(newSaltBytes),
      verifierHash: newVerifierHash,
      updatedAt: new Date().toISOString(),
    };
    await storage.writeFile(VAULT_CONFIG_PATH, JSON.stringify(updatedConfig, null, 2));

    this.activeVaultKey = newKey;
    this.isUnlocked = true;
  }

  public async getVaultData(): Promise<VaultData | null> {
    if (!this.isUnlocked) return null;
    return this.decryptedCache;
  }

  public async saveVault(data: VaultData, keyOverride?: CryptoKey): Promise<void> {
    const auth = AuthService.getInstance();
    const cryptoKey = keyOverride || this.activeVaultKey || auth.getMasterKey();

    if (!cryptoKey) {
      throw new Error('Cannot save vault without active crypto key.');
    }

    data.lastModified = new Date().toISOString();
    const encryptedBase64 = await this.encryptPayload(data, cryptoKey);
    const storage = StorageService.getAdapter();
    await storage.writeFile(VAULT_ENC_PATH, encryptedBase64);
    this.decryptedCache = data;
  }

  public async addItem(item: Omit<VaultItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<VaultItem> {
    if (!this.decryptedCache) throw new Error('Vault is locked');
    const now = new Date().toISOString();
    const newItem: VaultItem = {
      ...item,
      id: 'vlt_' + Math.random().toString(36).substring(2, 9),
      createdAt: now,
      updatedAt: now,
    };
    this.decryptedCache.items.push(newItem);
    await this.saveVault(this.decryptedCache);
    return newItem;
  }

  public async updateItem(id: string, updates: Partial<VaultItem>): Promise<VaultItem> {
    if (!this.decryptedCache) throw new Error('Vault is locked');
    const index = this.decryptedCache.items.findIndex(it => it.id === id);
    if (index === -1) throw new Error('Item not found');

    const updated: VaultItem = {
      ...this.decryptedCache.items[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.decryptedCache.items[index] = updated;
    await this.saveVault(this.decryptedCache);
    return updated;
  }

  public async deleteItem(id: string): Promise<void> {
    if (!this.decryptedCache) throw new Error('Vault is locked');
    this.decryptedCache.items = this.decryptedCache.items.filter(it => it.id !== id);
    await this.saveVault(this.decryptedCache);
  }

  private async deriveKeyFromPassword(password: string, salt: Uint8Array): Promise<{ key: CryptoKey }> {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      'PBKDF2',
      false,
      ['deriveKey', 'deriveBits']
    );

    const key = await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt as unknown as BufferSource,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );

    return { key };
  }

  private async hashKeyForStorage(key: CryptoKey): Promise<string> {
    const exported = await window.crypto.subtle.exportKey('raw', key);
    const hash = await window.crypto.subtle.digest('SHA-256', exported);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
  }

  private async encryptPayload(data: VaultData, key: CryptoKey): Promise<string> {
    const enc = new TextEncoder();
    const rawPlaintext = enc.encode(JSON.stringify(data));
    const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 96-bit AES-GCM IV

    const ciphertext = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      key,
      rawPlaintext
    );

    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.length);

    let binary = '';
    for (let i = 0; i < combined.byteLength; i++) {
      binary += String.fromCharCode(combined[i]);
    }
    return window.btoa(binary);
  }

  private async decryptPayload(base64: string, key: CryptoKey): Promise<VaultData> {
    const binary = window.atob(base64);
    const combined = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      combined[i] = binary.charCodeAt(i);
    }

    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);

    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      key,
      ciphertext
    );

    const dec = new TextDecoder();
    const jsonStr = dec.decode(decrypted);
    return JSON.parse(jsonStr);
  }

  private createDefaultVault(): VaultData {
    const now = new Date().toISOString();
    return {
      version: 1,
      lastModified: now,
      items: [
        {
          id: 'vlt_01',
          title: 'Primary Work Email',
          category: 'passwords',
          username: 'user@evah-secure.local',
          password: 'evah$SuperSecret$2026',
          url: 'https://mail.proton.me',
          notes: 'Configured with offline PGP hardware token',
          tags: ['email', 'primary', 'security'],
          isFavorite: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'vlt_02',
          title: 'GitHub Personal Token',
          category: 'api-keys',
          username: 'git-evah',
          password: 'ghp_Evah99SecurePortableAccessToken00124',
          url: 'https://github.com/settings/tokens',
          notes: 'Repo and workflow scopes only',
          tags: ['dev', 'git'],
          isFavorite: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'vlt_03',
          title: 'Hardware Vault Recovery Mnemonic',
          category: 'recovery-phrases',
          password: 'echo quantum portable echo drift lunar summit crystal matrix orbit beacon secure',
          notes: '24-word backup key stored encrypted inside EVAH USB drive.',
          tags: ['crypto', 'recovery', 'backup'],
          isFavorite: false,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'vlt_04',
          title: 'Emergency Server SSH Passphrase',
          category: 'secrets',
          username: 'root@192.168.1.100',
          password: 'ssh-rsa-passphrase-evah-bastion-key',
          notes: 'Backup bastion host offline pass',
          tags: ['server', 'ssh'],
          isFavorite: false,
          createdAt: now,
          updatedAt: now,
        }
      ]
    };
  }
}
