import { storageRepository } from '../repositories/storage.repository';
import { encryption } from '../security/encryption';
import { eventBus } from '../events/event-bus';
import { logger } from '../utils/logger';
import { AuthSession, StoredAuthData, UserProfile } from '../models/auth.model';
import { DeviceNotFoundError, UnauthorizedError } from '../errors/app-error';
import { usbService } from './usb.service';

const AUTH_FILE = 'EVAH/data/sessions/auth.json';
const DEFAULT_SALT = 'e6f9a0c32b5d417882901452bcfe9271'; // Fallback base64
const DEFAULT_HASH = '123456'; // Will be seeded properly on init

export class AuthService {
  private activeSessions = new Map<string, AuthSession>();

  constructor() {
    this.registerEventListeners();
  }

  private registerEventListeners(): void {
    // When USB disconnects, immediately destroy all active sessions
    eventBus.onEvah('usb:disconnected', () => {
      logger.warn(`USB removed! Invalidating ${this.activeSessions.size} active session(s)`);
      this.activeSessions.clear();
      eventBus.emitEvah('session:invalidated');
    });

    // Panic lock invalidates all sessions immediately
    eventBus.onEvah('system:panic', () => {
      logger.warn(`Panic lock triggered! Purging ${this.activeSessions.size} session(s)`);
      this.activeSessions.clear();
      eventBus.emitEvah('session:invalidated');
    });
  }

  /**
   * Initializes default auth state if none exists on disk
   */
  public async ensureAuthInitialized(): Promise<void> {
    if (!(await storageRepository.exists(AUTH_FILE))) {
      const defaultPassword = 'evah';
      const { salt, hash } = await encryption.hashPassword(defaultPassword);
      const authData: StoredAuthData = {
        version: 1,
        salt,
        hash,
        iterations: 100000,
        profile: {
          id: 'usr_evah_default',
          username: 'evah',
          displayName: 'EVAH User',
          createdAt: new Date().toISOString(),
        },
      };
      await storageRepository.writeFile(AUTH_FILE, JSON.stringify(authData, null, 2));
      logger.info('Initialized default EVAH credentials on storage (user: evah, pass: evah)');
    }
  }

  public async getStoredAuthData(): Promise<StoredAuthData> {
    await this.ensureAuthInitialized();
    const content = await storageRepository.readFile(AUTH_FILE);
    return JSON.parse(content) as StoredAuthData;
  }

  public async login(password: string): Promise<{ session: AuthSession; profile: UserProfile }> {
    if (!usbService.isUsbPresent()) {
      throw new DeviceNotFoundError('Cannot authenticate: EVAH USB device is not present');
    }

    const authData = await this.getStoredAuthData();
    const isValid = await encryption.verifyPassword(password, authData.salt, authData.hash);

    if (!isValid) {
      throw new UnauthorizedError('Invalid password credentials');
    }

    const token = encryption.generateSecureToken(32);
    const now = Date.now();
    const session: AuthSession = {
      token,
      userId: authData.profile.id,
      username: authData.profile.username,
      displayName: authData.profile.displayName,
      createdAt: now,
      expiresAt: now + 24 * 60 * 60 * 1000, // 24 hours while USB is plugged in
      lastActivity: now,
      isUsbBound: true,
    };

    this.activeSessions.set(token, session);
    eventBus.emitEvah('session:created', { userId: session.userId });

    return { session, profile: authData.profile };
  }

  public verifySession(token: string): AuthSession {
    if (!usbService.isUsbPresent()) {
      this.activeSessions.clear();
      throw new DeviceNotFoundError('EVAH USB device removed');
    }

    const session = this.activeSessions.get(token);
    if (!session) {
      throw new UnauthorizedError('Session does not exist or has been invalidated');
    }

    if (Date.now() > session.expiresAt) {
      this.activeSessions.delete(token);
      throw new UnauthorizedError('Session expired');
    }

    session.lastActivity = Date.now();
    return session;
  }

  public logout(token: string): void {
    this.activeSessions.delete(token);
  }

  public panicLock(): void {
    eventBus.emitEvah('system:panic');
  }

  public getActiveSessionCount(): number {
    return this.activeSessions.size;
  }
}

export const authService = new AuthService();
