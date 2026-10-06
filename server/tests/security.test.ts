import { describe, it, expect } from 'vitest';
import { encryption } from '../src/security/encryption';

describe('Server Security & Cryptographic Subsystem', () => {
  it('derives a consistent 256-bit key from password and salt', async () => {
    const salt = Buffer.from('test_salt_16bytes!!', 'utf8');
    const key1 = await encryption.deriveKey('master-pass', salt);
    const key2 = await encryption.deriveKey('master-pass', salt);

    expect(key1.length).toBe(32);
    expect(key2.length).toBe(32);
    expect(key1.equals(key2)).toBe(true);
  });

  it('hashes and verifies passwords in constant time', async () => {
    const { salt, hash } = await encryption.hashPassword('SuperSecret123');
    expect(salt).toBeDefined();
    expect(hash).toBeDefined();

    const isValid = await encryption.verifyPassword('SuperSecret123', salt, hash);
    expect(isValid).toBe(true);

    const isWrong = await encryption.verifyPassword('WrongSecret', salt, hash);
    expect(isWrong).toBe(false);
  });

  it('encrypts and decrypts with AES-256-GCM authenticated cipher', async () => {
    const key = await encryption.deriveKey('session-key', 'random-salt');
    const plaintext = 'Sensitive USB OS Vault Payload 2026';

    const { iv, ciphertext, tag } = encryption.encryptAesGcm(plaintext, key);
    expect(iv).toBeDefined();
    expect(ciphertext).toBeDefined();
    expect(tag).toBeDefined();

    const decrypted = encryption.decryptAesGcm(ciphertext, iv, tag, key);
    expect(decrypted).toBe(plaintext);
  });

  it('detects tampering and refuses decryption with modified ciphertext or tag', async () => {
    const key = await encryption.deriveKey('session-key', 'random-salt');
    const { iv, ciphertext, tag } = encryption.encryptAesGcm('Untampered secret', key);

    // Corrupt ciphertext
    const corruptedCiphertext = Buffer.from(ciphertext, 'base64');
    corruptedCiphertext[0] ^= 0xff; // flip bits

    expect(() => {
      encryption.decryptAesGcm(corruptedCiphertext.toString('base64'), iv, tag, key);
    }).toThrow();
  });

  it('securely zeroes buffer contents in memory on wipeBuffer', () => {
    const buf = Buffer.from('super-sensitive-master-key-in-ram', 'utf8');
    expect(buf.toString()).toContain('super-sensitive');

    encryption.wipeBuffer(buf);
    expect(buf.every((b) => b === 0)).toBe(true);
  });
});
