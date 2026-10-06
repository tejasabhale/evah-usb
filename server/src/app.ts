import express, { Express } from 'express';
import cors from 'cors';
import { config } from './config';
import apiRoutes from './routes/api.routes';
import { errorHandler } from './middleware/error.middleware';
import { requestLogger } from './middleware/logging.middleware';
import { storageRepository } from './repositories/storage.repository';
import { authService } from './services/auth.service';
import { logger } from './utils/logger';

export async function createApp(): Promise<Express> {
  const app = express();

  // Basic security and parsing
  app.use(
    cors({
      origin: config.corsOrigin,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(requestLogger);

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      app: 'evah-service',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  });

  // Mount API endpoints
  app.use('/api', apiRoutes);

  // Global error handler
  app.use(errorHandler);

  // Ensure storage directories and auth structures are ready
  try {
    await storageRepository.initializeEvahStructure();
    await authService.ensureAuthInitialized();
    logger.info('EVAH storage structures verified successfully');
  } catch (err) {
    logger.error('Failed to initialize EVAH storage structures', err);
  }

  return app;
}
