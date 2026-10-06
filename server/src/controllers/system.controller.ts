import { Request, Response } from 'express';
import { usbService } from '../services/usb.service';
import { authService } from '../services/auth.service';
import { vaultService } from '../services/vault.service';
import { storageRepository } from '../repositories/storage.repository';
import { sendSuccess } from '../utils/response';
import { SystemStatus } from '../models/session.model';

const startTime = Date.now();

export class SystemController {
  public async getStatus(req: Request, res: Response): Promise<void> {
    const isUsb = usbService.isUsbPresent();
    const marker = await usbService.getMarker();
    const mem = process.memoryUsage();

    const status: SystemStatus = {
      isUsbConnected: isUsb,
      isUnlocked: authService.getActiveSessionCount() > 0,
      activeSession: authService.getActiveSessionCount() > 0,
      storagePath: storageRepository.getBasePath(),
      uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
      memoryUsageMb: Math.round(mem.rss / (1024 * 1024)),
      vaultStatus: vaultService.isUnlocked() ? 'unlocked' : 'locked',
    };

    sendSuccess(res, { status, marker });
  }

  public simulateDisconnect(req: Request, res: Response): void {
    usbService.triggerDisconnect();
    sendSuccess(res, { simulated: 'disconnect', isUsbConnected: false });
  }

  public async simulateConnect(req: Request, res: Response): Promise<void> {
    await usbService.triggerConnect();
    sendSuccess(res, { simulated: 'connect', isUsbConnected: true });
  }
}

export const systemController = new SystemController();
