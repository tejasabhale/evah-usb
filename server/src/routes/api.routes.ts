import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { fileController } from '../controllers/file.controller';
import { vaultController } from '../controllers/vault.controller';
import { systemController } from '../controllers/system.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// --- Auth Routes ---
router.get('/auth/status', (req, res, next) => authController.getStatus(req, res, next));
router.post('/auth/setup', (req, res, next) => authController.setup(req, res, next));
router.post('/auth/login', (req, res, next) => authController.login(req, res, next));
router.get('/auth/verify', (req, res, next) => authController.verifySession(req, res, next));
router.post('/auth/change-password', (req, res, next) => authController.changePassword(req, res, next));
router.post('/auth/logout', (req, res) => authController.logout(req, res));
router.post('/auth/panic', (req, res) => authController.panicLock(req, res));

// --- System Routes ---
router.get('/system/status', (req, res) => systemController.getStatus(req, res));
router.post('/system/usb/disconnect', (req, res) => systemController.simulateDisconnect(req, res));
router.post('/system/usb/connect', (req, res) => systemController.simulateConnect(req, res));

// --- File Routes ---
router.get('/files/exists', (req, res, next) => fileController.exists(req, res, next));
router.get('/files/list', authMiddleware, (req, res, next) => fileController.listFiles(req, res, next));
router.get('/files/read', (req, res, next) => {
  const p = ((req.query.path as string) || '').replace(/\\/g, '/');
  // Allow public system metadata to be read before login (user profile info, settings)
  if (p.includes('/EVAH/data/settings/') || p.startsWith('EVAH/data/settings/')) {
    return fileController.readFile(req, res, next);
  }
  return authMiddleware(req, res, () => fileController.readFile(req, res, next));
});
router.post('/files/write', authMiddleware, (req, res, next) => fileController.writeFile(req, res, next));
router.post('/files/rename', authMiddleware, (req, res, next) => fileController.rename(req, res, next));
router.delete('/files/delete', authMiddleware, (req, res, next) => fileController.deleteFile(req, res, next));
router.post('/files/mkdir', authMiddleware, (req, res, next) => fileController.createDirectory(req, res, next));
router.delete('/files/rmdir', authMiddleware, (req, res, next) => fileController.deleteDirectory(req, res, next));
router.get('/files/telemetry', authMiddleware, (req, res, next) => fileController.getTelemetry(req, res, next));

// --- Vault Routes (Gated by Auth Middleware) ---
router.get('/vault/status', authMiddleware, (req, res) => vaultController.getStatus(req, res));
router.post('/vault/unlock', authMiddleware, (req, res, next) => vaultController.unlock(req, res, next));
router.post('/vault/lock', authMiddleware, (req, res) => vaultController.lock(req, res));
router.get('/vault/items', authMiddleware, (req, res, next) => vaultController.getItems(req, res, next));
router.post('/vault/items', authMiddleware, (req, res, next) => vaultController.saveItem(req, res, next));
router.delete('/vault/items/:id', authMiddleware, (req, res, next) => vaultController.deleteItem(req, res, next));

export default router;
