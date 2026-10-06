export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  createdAt: string;
  avatar?: string;
}

export interface StoredAuthData {
  version: number;
  salt: string; // Base64 PBKDF2 salt
  hash: string; // Base64 derived verification key hash
  iterations: number;
  profile: UserProfile;
}

export interface AuthSession {
  token: string;
  userId: string;
  username: string;
  displayName: string;
  createdAt: number;
  expiresAt: number;
  lastActivity: number;
  isUsbBound: boolean;
}
