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
   * Loads existing user profile without verifying password.
   */
  public async loadStoredProfile(): Promise<UserProfile | null> {
    try {
      const storage = StorageService.getAdapter();
      if (await storage.exists(USER_CONFIG_PATH)) {
        const raw = await storage.readFile(USER_CONFIG_PATH);
        const user: UserProfile = JSON.parse(raw);
        this.currentUser = user;
        return user;
      }
    } catch (e) {
      console.warn('Failed loading stored profile', e);
    }
    return null;
  }

  /**
   * Checks if user profile exists on EVAH filesystem.
   */
  public async hasExistingProfile(): Promise<boolean> {
    const storage = StorageService.getAdapter();
    const exists = await storage.exists(USER_CONFIG_PATH);
    if (exists) {
      await this.loadStoredProfile();
      return true;
    }
    return false;
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

    // Synchronize with local backend if present
    try {
      const res = await fetch('http://127.0.0.1:3927/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user.username, fullName: user.fullName, password }),
      });
      if (res.ok) {
        const body = await res.json();
        if (body.data?.session?.token) {
          StorageService.setAuthToken(body.data.session.token);
        }
      }
    } catch {
      // Local storage active
    }

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

    // Synchronize session token with server if running
    try {
      const res = await fetch('http://127.0.0.1:3927/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user.username, password }),
      });
      if (res.ok) {
        const body = await res.json();
        if (body.data?.session?.token) {
          StorageService.setAuthToken(body.data.session.token);
        }
      }
    } catch {
      // Offline mode
    }

    return true;
  }

  /**
   * Safely changes password from Settings, re-deriving master key and updating persisted storage.
   */
  public async changePassword(currentPassword: string, newPassword: string): Promise<boolean> {
    if (!currentPassword) {
      throw new Error('Current password is required.');
    }
    if (!newPassword || newPassword.length < 4) {
      throw new Error('New password must be at least 4 characters long.');
    }
    if (currentPassword === newPassword) {
      throw new Error('New password cannot be identical to current password.');
    }

    const storage = StorageService.getAdapter();
    if (!(await storage.exists(USER_CONFIG_PATH))) {
      throw new Error('No user profile found.');
    }

    const raw = await storage.readFile(USER_CONFIG_PATH);
    const user: UserProfile = JSON.parse(raw);
    const saltBytes = this.hexToBytes(user.passwordSalt);

    const derivedOld = await this.deriveKeyFromPassword(currentPassword, saltBytes);
    const currentHash = await this.hashKeyForStorage(derivedOld.key);

    if (currentHash !== user.passwordHash) {
      throw new Error('Current password is incorrect.');
    }

    // Generate new salt and master key
    const newSaltArray = window.crypto.getRandomValues(new Uint8Array(16));
    const newSaltHex = Array.from(newSaltArray).map(b => b.toString(16).padStart(2, '0')).join('');
    const derivedNew = await this.deriveKeyFromPassword(newPassword, newSaltArray);
    const newHashHex = await this.hashKeyForStorage(derivedNew.key);

    user.passwordSalt = newSaltHex;
    user.passwordHash = newHashHex;

    await storage.writeFile(USER_CONFIG_PATH, JSON.stringify(user, null, 2));

    this.currentUser = user;
    this.masterCryptoKey = derivedNew.key;

    // Update backend credentials if available
    try {
      const res = await fetch('http://127.0.0.1:3927/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (res.ok) {
        const body = await res.json();
        if (body.data?.session?.token) {
          StorageService.setAuthToken(body.data.session.token);
        }
      }
    } catch {
      // Offline mode
    }

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
