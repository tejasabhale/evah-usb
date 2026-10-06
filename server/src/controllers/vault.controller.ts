import { Request, Response, NextFunction } from 'express';
import { vaultService } from '../services/vault.service';
import { validators } from '../validators';
import { sendSuccess } from '../utils/response';
import { VaultItem } from '../models/vault.model';

export class VaultController {
  public async unlock(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { masterPassword } = validators.validateUnlock(req.body);
      const items = await vaultService.unlock(masterPassword);
      sendSuccess(res, { unlocked: true, items });
    } catch (err) {
      next(err);
    }
  }

  public lock(req: Request, res: Response): void {
    vaultService.lockVault();
    sendSuccess(res, { locked: true });
  }

  public getStatus(req: Request, res: Response): void {
    sendSuccess(res, { unlocked: vaultService.isUnlocked() });
  }

  public getItems(req: Request, res: Response, next: NextFunction): void {
    try {
      const items = vaultService.getItems();
      sendSuccess(res, { items });
    } catch (err) {
      next(err);
    }
  }

  public async saveItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawItem = validators.validateVaultItem(req.body);
      const saved = await vaultService.saveItem(rawItem as unknown as VaultItem);
      sendSuccess(res, { item: saved });
    } catch (err) {
      next(err);
    }
  }

  public async deleteItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id || req.body?.id;
      if (!id) {
        throw new Error('Item id required');
      }
      await vaultService.deleteItem(id);
      sendSuccess(res, { deleted: true, id });
    } catch (err) {
      next(err);
    }
  }
}

export const vaultController = new VaultController();
