import crypto from 'crypto';
import { CryptoError } from '../errors/app-error';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM
const KEY_LENGTH = 32; // 256 bits
const DEFAULT_ITERATIONS = 100000;
const DIGEST = 'sha256';

export const encryption = {
  /**
   * Derives a 256-bit key from password + salt via PBKDF2-HMAC-SHA256
   */
  async deriveKey(
    password: string,
    salt: Buffer | string,
    iterations = DEFAULT_ITERATIONS
  ): Promise<Buffer> {
    const saltBuf = typeof salt === 'string' ? Buffer.from(salt, 'base64') : salt;
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(password, saltBuf, iterations, KEY_LENGTH, DIGEST, (err, derivedKey) => {
        if (err) return reject(new CryptoError(`Key derivation failed: ${err.message}`));
        resolve(derivedKey);
      });
    });
  },

  /**
   * Hashes a password with salt using PBKDF2
   */
  async hashPassword(password: string, saltBuffer?: Buffer): Promise<{ salt: string; hash: string }> {
    const salt = saltBuffer || crypto.randomBytes(16);
    const key = await this.deriveKey(password, salt);
    return {
      salt: salt.toString('base64'),
      hash: key.toString('base64'),
    };
  },

  /**
   * Verifies a password against stored salt and hash in constant time
   */
  async verifyPassword(password: string, storedSalt: string, storedHash: string): Promise<boolean> {
    try {
      const derived = await this.deriveKey(password, storedSalt);
      const expected = Buffer.from(storedHash, 'base64');
      if (derived.length !== expected.length) return false;
      return crypto.timingSafeEqual(derived, expected);
    } catch {
      return false;
    }
  },

  /**
   * Encrypts plaintext string using AES-256-GCM
   */
  encryptAesGcm(plaintext: string, key: Buffer): { iv: string; ciphertext: string; tag: string } {
    try {
      if (key.length !== KEY_LENGTH) {
        throw new CryptoError(`Invalid key length: expected ${KEY_LENGTH} bytes, got ${key.length}`);
      }
      const iv = crypto.randomBytes(IV_LENGTH);
      const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
      const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
      const tag = cipher.getAuthTag();

      return {
        iv: iv.toString('base64'),
        ciphertext: encrypted.toString('base64'),
        tag: tag.toString('base64'),
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new CryptoError(`AES-GCM encryption failed: ${msg}`);
    }
  },

  /**
   * Decrypts ciphertext string using AES-256-GCM and verifies auth tag
   */
  decryptAesGcm(ciphertext: string, iv: string, tag: string, key: Buffer): string {
    try {
      if (key.length !== KEY_LENGTH) {
        throw new CryptoError(`Invalid key length: expected ${KEY_LENGTH} bytes, got ${key.length}`);
      }
      const decipher = crypto.createDecipheriv(
        ALGORITHM,
        key,
        Buffer.from(iv, 'base64')
      );
      decipher.setAuthTag(Buffer.from(tag, 'base64'));

      const decrypted = Buffer.concat([
        decipher.update(Buffer.from(ciphertext, 'base64')),
        decipher.final(),
      ]);

      return decrypted.toString('utf8');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new CryptoError(`AES-GCM decryption failed (tampered data or bad key): ${msg}`);
    }
  },

  /**
   * Generates a cryptographically random token string
   */
  generateSecureToken(bytes = 32): string {
    return crypto.randomBytes(bytes).toString('hex');
  },

  /**
   * Zeroes out sensitive buffer contents in memory
   */
  wipeBuffer(buffer: Buffer): void {
    buffer.fill(0);
  },
};
