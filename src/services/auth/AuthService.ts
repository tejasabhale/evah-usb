import { UserProfile, SessionSettings } from '@/types/session';
import { StorageService } from '@/services/storage/StorageService';

const USER_CONFIG_PATH = '/EVAH/data/settings/user.json';
const SETTINGS_CONFIG_PATH = '/EVAH/data/settings/preferences.json';

export class AuthService {
  private static instance: AuthService;
  private masterCryptoKey: CryptoKey | null = null;
  private currentUser: UserProfile | null = null;

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  public getMasterKey(): CryptoKey | null {
    return this.masterCryptoKey;
  }

  public getCurrentUser(): UserProfile | null {
    return this.currentUser;
  }

  public isKeyUnlocked(): boolean {
    return this.masterCryptoKey !== null;
  }

  public purgeKeys(): void {
    this.masterCryptoKey = null;
  }

  /**
   * Checks if user profile exists on EVAH filesystem.
   */
  public async hasExistingProfile(): Promise<boolean> {
    const storage = StorageService.getAdapter();
    return storage.exists(USER_CONFIG_PATH);
  }

  /**
   * Initializes user profile on first run with PBKDF2 salt and derived hash.
   */
  public async createInitialProfile(username: string, fullName: string, password: string): Promise<UserProfile> {
    const saltArray = window.crypto.getRandomValues(new Uint8Array(16));
    const saltHex = Array.from(saltArray).map(b => b.toString(16).padStart(2, '0')).join('');

    const derived = await this.deriveKeyFromPassword(password, saltArray);
    const hashHex = await this.hashKeyForStorage(derived.key);

    const user: UserProfile = {
      id: 'evah_user_' + Math.random().toString(36).substring(2, 9),
      username: username.trim(),
      fullName: fullName.trim() || username.trim(),
      avatarSeed: username.toLowerCase(),
      createdAt: new Date().toISOString(),
      passwordSalt: saltHex,
      passwordHash: hashHex,
    };

    const storage = StorageService.getAdapter();
    await storage.writeFile(USER_CONFIG_PATH, JSON.stringify(user, null, 2));

    // Save default session settings
    const defaultSettings: SessionSettings = {
      autoLockMinutes: 10,
      clipboardTimeoutSeconds: 15,
      welcomeVoiceEnabled: true,
      welcomeVoicePitch: 1.0,
      welcomeVoiceRate: 1.0,
      welcomeVoiceVolume: 0.9,
      panicShortcut: 'Ctrl+Shift+L',
      deviceAutoLaunch: true,
    };
    await storage.writeFile(SETTINGS_CONFIG_PATH, JSON.stringify(defaultSettings, null, 2));

    this.currentUser = user;
    this.masterCryptoKey = derived.key;
    return user;
  }

  /**
   * Validates password, derives master AES-GCM key, caches in memory.
   */
  public async authenticate(password: string): Promise<boolean> {
    const storage = StorageService.getAdapter();
    if (!(await storage.exists(USER_CONFIG_PATH))) {
      throw new Error('No user profile found. Run first-time setup.');
    }

    const raw = await storage.readFile(USER_CONFIG_PATH);
    const user: UserProfile = JSON.parse(raw);
    const saltBytes = this.hexToBytes(user.passwordSalt);

    const derived = await this.deriveKeyFromPassword(password, saltBytes);
    const candidateHash = await this.hashKeyForStorage(derived.key);

    if (candidateHash !== user.passwordHash) {
      return false;
    }

    this.currentUser = user;
    this.masterCryptoKey = derived.key;
    return true;
  }

  public async getSettings(): Promise<SessionSettings> {
    const storage = StorageService.getAdapter();
    if (await storage.exists(SETTINGS_CONFIG_PATH)) {
      try {
        const raw = await storage.readFile(SETTINGS_CONFIG_PATH);
        return JSON.parse(raw);
      } catch (e) {
        console.warn('Failed parsing settings, falling back to defaults', e);
      }
    }
    return {
      autoLockMinutes: 10,
      clipboardTimeoutSeconds: 15,
      welcomeVoiceEnabled: true,
      welcomeVoicePitch: 1.0,
      welcomeVoiceRate: 1.0,
      welcomeVoiceVolume: 0.9,
      panicShortcut: 'Ctrl+Shift+L',
      deviceAutoLaunch: true,
    };
  }

  public async saveSettings(settings: SessionSettings): Promise<void> {
    const storage = StorageService.getAdapter();
    await storage.writeFile(SETTINGS_CONFIG_PATH, JSON.stringify(settings, null, 2));
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
      true, // extractable for hashing verification
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

  private hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
  }
}
