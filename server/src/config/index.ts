import path from 'path';

export interface ServerConfig {
  env: 'development' | 'production' | 'test';
  port: number;
  host: string;
  usbBasePath: string;
  dataDir: string;
  vaultFile: string;
  authFile: string;
  settingsFile: string;
  corsOrigin: string | string[];
  sessionTimeoutMs: number;
  encryptionAlgorithm: string;
  pbkdf2Iterations: number;
}

const isDev = process.env.NODE_ENV !== 'production';
const defaultStorageRoot = process.env.EVAH_STORAGE_PATH || path.resolve(process.cwd(), '.evah_local_data');

export const config: ServerConfig = {
  env: (process.env.NODE_ENV as ServerConfig['env']) || 'development',
  port: parseInt(process.env.PORT || '3927', 10),
  host: process.env.HOST || '127.0.0.1', // Strict localhost binding for local-first security
  usbBasePath: defaultStorageRoot,
  dataDir: path.join(defaultStorageRoot, 'EVAH', 'data'),
  vaultFile: path.join(defaultStorageRoot, 'EVAH', 'data', 'vault', 'vault.enc'),
  authFile: path.join(defaultStorageRoot, 'EVAH', 'data', 'sessions', 'auth.json'),
  settingsFile: path.join(defaultStorageRoot, 'EVAH', 'data', 'settings', 'config.json'),
  corsOrigin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'tauri://localhost'],
  sessionTimeoutMs: 15 * 60 * 1000, // 15 minutes default idle lock
  encryptionAlgorithm: 'aes-256-gcm',
  pbkdf2Iterations: 100000,
};
