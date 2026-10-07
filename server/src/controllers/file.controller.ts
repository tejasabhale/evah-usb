import { Request, Response, NextFunction } from 'express';
import { fileService } from '../services/file.service';
import { validators } from '../validators';
import { sendSuccess } from '../utils/response';

export class FileController {
  public async listFiles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dirPath = (req.query.path as string) || 'EVAH/data/files';
      const items = await fileService.listDirectory(dirPath);
      sendSuccess(res, { items, path: dirPath });
    } catch (err) {
      next(err);
    }
  }

  public async readFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filePath = validators.validateFilePath(req.query.path);
      const content = await fileService.readFile(filePath);
      sendSuccess(res, { path: filePath, content });
    } catch (err) {
      next(err);
    }
  }

  public async writeFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { path: filePath, content } = validators.validateFileWrite(req.body);
      await fileService.writeFile(filePath, content);
      sendSuccess(res, { path: filePath, written: true });
    } catch (err) {
      next(err);
    }
  }

  public async deleteFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filePath = validators.validateFilePath(req.query.path || req.body?.path);
      await fileService.deleteFile(filePath);
      sendSuccess(res, { path: filePath, deleted: true });
    } catch (err) {
      next(err);
    }
  }

  public async createDirectory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dirPath = validators.validateFilePath(req.body?.path);
      await fileService.createDirectory(dirPath);
      sendSuccess(res, { path: dirPath, created: true });
    } catch (err) {
      next(err);
    }
  }

  public async deleteDirectory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dirPath = validators.validateFilePath(req.query.path || req.body?.path);
      await fileService.deleteDirectory(dirPath);
      sendSuccess(res, { path: dirPath, deleted: true });
    } catch (err) {
      next(err);
    }
  }

  public async exists(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filePath = validators.validateFilePath(req.query.path);
      const exists = await fileService.exists(filePath);
      sendSuccess(res, { path: filePath, exists });
    } catch (err) {
      next(err);
    }
  }

  public async rename(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { oldPath, newPath } = validators.validateRename(req.body);
      await fileService.rename(oldPath, newPath);
      sendSuccess(res, { oldPath, newPath, renamed: true });
    } catch (err) {
      next(err);
    }
  }

  public async getTelemetry(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const telemetry = await fileService.getTelemetry();
      sendSuccess(res, telemetry);
    } catch (err) {
      next(err);
    }
  }
}

export const fileController = new FileController();
