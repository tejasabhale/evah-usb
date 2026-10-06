export type VaultItemType = 'login' | 'note' | 'card' | 'key';

export interface VaultItem {
  id: string;
  title: string;
  type: VaultItemType;
  username?: string;
  password?: string;
  url?: string;
  notes?: string;
  customFields?: Record<string, string>;
  createdAt: number;
  updatedAt: number;
  category?: string;
  tags?: string[];
}

export interface EncryptedVaultPayload {
  version: number;
  algorithm: string; // 'aes-256-gcm'
  iv: string; // Base64 12 bytes
  tag: string; // Base64 16 bytes
  salt: string; // Base64 PBKDF2 salt
  ciphertext: string; // Base64 ciphertext
  updatedAt: number;
}
