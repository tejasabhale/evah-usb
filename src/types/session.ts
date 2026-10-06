export type SessionLifecycle = 
  | 'DEVICE_NOT_FOUND'
  | 'DEVICE_DETECTED'
  | 'DEVICE_VERIFIED'
  | 'BOOT'
  | 'FIRST_RUN'
  | 'LOGIN'
  | 'AUTHENTICATED'
  | 'ACTIVE_SESSION'
  | 'LOCKED'
  | 'PANIC_LOCKED'
  | 'SESSION_INVALIDATED';

export interface UserProfile {
  id: string;
  username: string;
  fullName: string;
  avatarSeed: string;
  avatarUrl?: string;
  createdAt: string;
  passwordSalt: string;
  passwordHash: string; // Derived cryptographic hash
}

export interface SessionSettings {
  autoLockMinutes: number; // 0 for Never, 1, 5, 10, 15, 30, 60
  clipboardTimeoutSeconds: number; // 5, 10, 15, 30, 60, 0 (Never)
  welcomeVoiceEnabled: boolean;
  welcomeVoicePitch: number;
  welcomeVoiceRate: number;
  welcomeVoiceVolume: number;
  welcomeVoiceName?: string;
  panicShortcut: string; // Default: 'Ctrl+Shift+L'
  deviceAutoLaunch: boolean;
}
