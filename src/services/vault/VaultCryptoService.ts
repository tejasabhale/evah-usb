import { VaultData, VaultItem } from '@/types/vault';
import { StorageService } from '@/services/storage/StorageService';
import { AuthService } from '@/services/auth/AuthService';

const VAULT_ENC_PATH = '/EVAH/data/vault/vault.enc';

export class VaultCryptoService {
  private static instance: VaultCryptoService;
  private decryptedCache: VaultData | null = null;
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
    // Zero decrypted cache and revoke state
    this.decryptedCache = null;
    this.isUnlocked = false;
  }

  /**
   * Unlocks vault using the authenticated master key or an explicit password.
   */
  public async unlockVault(customPassword?: string): Promise<VaultData> {
    const auth = AuthService.getInstance();
    let cryptoKey = auth.getMasterKey();

    if (customPassword) {
      const ok = await auth.authenticate(customPassword);
      if (!ok) {
        throw new Error('Invalid vault password');
      }
      cryptoKey = auth.getMasterKey();
    }

    if (!cryptoKey) {
      throw new Error('Session key not available. Please authenticate.');
    }

    const storage = StorageService.getAdapter();
    const exists = await storage.exists(VAULT_ENC_PATH);

    if (!exists) {
      // Initialize fresh seed vault
      const initialVault = this.createDefaultVault();
      await this.saveVault(initialVault, cryptoKey);
      this.decryptedCache = initialVault;
      this.isUnlocked = true;
      return initialVault;
    }

    try {
      const encryptedBase64 = await storage.readFile(VAULT_ENC_PATH);
      const decrypted = await this.decryptPayload(encryptedBase64, cryptoKey);
      this.decryptedCache = decrypted;
      this.isUnlocked = true;
      return decrypted;
    } catch (e) {
      console.error('Failed to decrypt vault:', e);
      throw new Error('Vault decryption failed. Incorrect key or data corrupted.');
    }
  }

  public async getVaultData(): Promise<VaultData | null> {
    if (!this.isUnlocked) return null;
    return this.decryptedCache;
  }

  public async saveVault(data: VaultData, keyOverride?: CryptoKey): Promise<void> {
    const auth = AuthService.getInstance();
    const cryptoKey = keyOverride || auth.getMasterKey();

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

    // Combine IV (12 bytes) + Ciphertext into single buffer
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.length);

    // Convert to base64 string
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
