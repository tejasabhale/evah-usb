import crypto from 'crypto';
import { storageRepository } from '../repositories/storage.repository';
import { encryption } from '../security/encryption';
import { eventBus } from '../events/event-bus';
import { logger } from '../utils/logger';
import { EncryptedVaultPayload, VaultItem } from '../models/vault.model';
import { AppError, CryptoError, UnauthorizedError } from '../errors/app-error';

const VAULT_FILE = 'EVAH/data/vault/vault.enc';

export class VaultService {
  private activeKey: Buffer | null = null;
  private decryptedCache: Map<string, VaultItem> | null = null;

  constructor() {
    this.registerEventListeners();
  }

  private registerEventListeners(): void {
    // Immediate memory zeroing and purge when USB disconnects or panic lock triggers
    eventBus.onEvah('usb:disconnected', () => {
      this.lockVault();
    });

    eventBus.onEvah('system:panic', () => {
      this.lockVault();
    });
  }

  public isUnlocked(): boolean {
    return this.activeKey !== null;
  }

  /**
   * Unlock vault with master password
   */
  public async unlock(masterPassword: string): Promise<VaultItem[]> {
    const exists = await storageRepository.exists(VAULT_FILE);

    if (!exists) {
      // Create fresh new vault container
      const salt = crypto.randomBytes(16);
      const key = await encryption.deriveKey(masterPassword, salt);
      const initialItems: VaultItem[] = [
        {
          id: 'vlt_welcome',
          title: 'EVAH Master Recovery Key',
          type: 'key',
          username: 'evah-master',
          password: 'evah-offline-key-' + crypto.randomBytes(4).toString('hex'),
          notes: 'Auto-generated hardware recovery key. Store safely.',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          category: 'System',
        },
      ];

      const { iv, ciphertext, tag } = encryption.encryptAesGcm(
        JSON.stringify(initialItems),
        key
      );

      const payload: EncryptedVaultPayload = {
        version: 1,
        algorithm: 'aes-256-gcm',
        iv,
        tag,
        salt: salt.toString('base64'),
        ciphertext,
        updatedAt: Date.now(),
      };

      await storageRepository.writeFile(VAULT_FILE, JSON.stringify(payload, null, 2));
      this.activeKey = key;
      this.decryptedCache = new Map(initialItems.map((item) => [item.id, item]));
      eventBus.emitEvah('vault:unlocked');
      logger.info('Created new encrypted EVAH vault container');
      return initialItems;
    }

    // Vault exists - read and decrypt
    const raw = await storageRepository.readFile(VAULT_FILE);
    const payload = JSON.parse(raw) as EncryptedVaultPayload;

    const salt = Buffer.from(payload.salt, 'base64');
    const key = await encryption.deriveKey(masterPassword, salt);

    try {
      const plaintext = encryption.decryptAesGcm(
        payload.ciphertext,
        payload.iv,
        payload.tag,
        key
      );
      const items = JSON.parse(plaintext) as VaultItem[];

      this.activeKey = key;
      this.decryptedCache = new Map(items.map((i) => [i.id, i]));
      eventBus.emitEvah('vault:unlocked');
      logger.info(`Vault unlocked successfully (${items.length} items decrypted in memory)`);
      return items;
    } catch (err) {
      encryption.wipeBuffer(key);
      throw new UnauthorizedError('Master password incorrect or vault file corrupted');
    }
  }

  /**
   * Immediately wipes the cryptographic key and cache from RAM
   */
  public lockVault(): void {
    if (this.activeKey) {
      encryption.wipeBuffer(this.activeKey);
      this.activeKey = null;
    }
    if (this.decryptedCache) {
      this.decryptedCache.clear();
      this.decryptedCache = null;
    }
    eventBus.emitEvah('vault:locked');
    logger.info('Vault locked. Key wiped from RAM.');
  }

  private async persistVault(): Promise<void> {
    if (!this.activeKey || !this.decryptedCache) {
      throw new UnauthorizedError('Cannot persist: Vault is locked');
    }

    const items = Array.from(this.decryptedCache.values());
    const existingRaw = await storageRepository.readFile(VAULT_FILE);
    const existingPayload = JSON.parse(existingRaw) as EncryptedVaultPayload;

    const { iv, ciphertext, tag } = encryption.encryptAesGcm(
      JSON.stringify(items),
      this.activeKey
    );

    const updatedPayload: EncryptedVaultPayload = {
      ...existingPayload,
      iv,
      tag,
      ciphertext,
      updatedAt: Date.now(),
    };

    await storageRepository.writeFile(VAULT_FILE, JSON.stringify(updatedPayload, null, 2));
  }

  public getItems(): VaultItem[] {
    if (!this.activeKey || !this.decryptedCache) {
      throw new UnauthorizedError('Vault is locked. Provide master password.');
    }
    return Array.from(this.decryptedCache.values());
  }

  public async saveItem(item: VaultItem): Promise<VaultItem> {
    if (!this.activeKey || !this.decryptedCache) {
      throw new UnauthorizedError('Vault is locked');
    }

    const itemToSave: VaultItem = {
      ...item,
      updatedAt: Date.now(),
      createdAt: item.createdAt || Date.now(),
    };

    this.decryptedCache.set(itemToSave.id, itemToSave);
    await this.persistVault();
    return itemToSave;
  }

  public async deleteItem(id: string): Promise<void> {
    if (!this.activeKey || !this.decryptedCache) {
      throw new UnauthorizedError('Vault is locked');
    }

    this.decryptedCache.delete(id);
    await this.persistVault();
  }
}

export const vaultService = new VaultService();
