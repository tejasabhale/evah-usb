import { BadRequestError } from '../errors/app-error';

export const validators = {
  validateLogin(body: unknown): { password?: string } {
    if (!body || typeof body !== 'object') {
      throw new BadRequestError('Request body must be an object');
    }
    const data = body as Record<string, unknown>;
    if (typeof data.password !== 'string' || !data.password.trim()) {
      throw new BadRequestError('Password must be a non-empty string');
    }
    return { password: data.password };
  },

  validateFilePath(filePath: unknown): string {
    if (typeof filePath !== 'string' || !filePath.trim()) {
      throw new BadRequestError('File path must be a non-empty string');
    }
    // Check for null bytes or malicious control chars
    if (filePath.includes('\0')) {
      throw new BadRequestError('Invalid characters in file path');
    }
    return filePath;
  },

  validateFileWrite(body: unknown): { path: string; content: string } {
    if (!body || typeof body !== 'object') {
      throw new BadRequestError('Request body must be an object');
    }
    const data = body as Record<string, unknown>;
    const path = this.validateFilePath(data.path);
    if (typeof data.content !== 'string') {
      throw new BadRequestError('Content must be a string');
    }
    return { path, content: data.content };
  },

  validateVaultItem(body: unknown): Record<string, unknown> {
    if (!body || typeof body !== 'object') {
      throw new BadRequestError('Vault item must be an object');
    }
    const data = body as Record<string, unknown>;
    if (!data.id || typeof data.id !== 'string') {
      throw new BadRequestError('Vault item id is required');
    }
    if (!data.title || typeof data.title !== 'string') {
      throw new BadRequestError('Vault item title is required');
    }
    return data;
  },

  validateUnlock(body: unknown): { masterPassword: string } {
    if (!body || typeof body !== 'object') {
      throw new BadRequestError('Request body must be an object');
    }
    const data = body as Record<string, unknown>;
    if (typeof data.masterPassword !== 'string' || !data.masterPassword.trim()) {
      throw new BadRequestError('Master password is required');
    }
    return { masterPassword: data.masterPassword };
  },

  validateRename(body: unknown): { oldPath: string; newPath: string } {
    if (!body || typeof body !== 'object') {
      throw new BadRequestError('Request body must be an object');
    }
    const data = body as Record<string, unknown>;
    const oldPath = this.validateFilePath(data.oldPath);
    const newPath = this.validateFilePath(data.newPath);
    return { oldPath, newPath };
  },

  validateSetup(body: unknown): { username: string; fullName: string; password: string } {
    if (!body || typeof body !== 'object') {
      throw new BadRequestError('Request body must be an object');
    }
    const data = body as Record<string, unknown>;
    if (typeof data.username !== 'string' || !data.username.trim()) {
      throw new BadRequestError('Username is required');
    }
    if (typeof data.password !== 'string' || data.password.length < 4) {
      throw new BadRequestError('Password must be at least 4 characters long');
    }
    const fullName = typeof data.fullName === 'string' && data.fullName.trim() ? data.fullName.trim() : data.username.trim();
    return { username: data.username.trim(), fullName, password: data.password };
  },

  validateChangePassword(body: unknown): { currentPassword: string; newPassword: string } {
    if (!body || typeof body !== 'object') {
      throw new BadRequestError('Request body must be an object');
    }
    const data = body as Record<string, unknown>;
    if (typeof data.currentPassword !== 'string' || !data.currentPassword) {
      throw new BadRequestError('Current password is required');
    }
    if (typeof data.newPassword !== 'string' || data.newPassword.length < 4) {
      throw new BadRequestError('New password must be at least 4 characters long');
    }
    return { currentPassword: data.currentPassword, newPassword: data.newPassword };
  },
};
