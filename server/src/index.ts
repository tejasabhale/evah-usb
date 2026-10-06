import { createApp } from './app';
import { config } from './config';
import { logger } from './utils/logger';

async function bootstrap() {
  try {
    const app = await createApp();
    const server = app.listen(config.port, config.host, () => {
      logger.info(`EVAH Local-First MVC Service running at http://${config.host}:${config.port}`);
      logger.info(`Storage directory: ${config.usbBasePath}`);
    });

    const shutdown = () => {
      logger.info('Shutting down EVAH service...');
      server.close(() => {
        logger.info('EVAH service closed safely.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (err) {
    logger.error('Fatal error starting EVAH service', err);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  bootstrap();
}
