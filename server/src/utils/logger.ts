type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

function formatMessage(level: string, message: string, meta?: unknown): string {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? ` | ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [EVAH:Server] [${level.toUpperCase()}] ${message}${metaStr}`;
}

export const logger = {
  debug(message: string, meta?: unknown) {
    if (LOG_LEVELS.debug >= LOG_LEVELS[currentLevel]) {
      console.debug(formatMessage('debug', message, meta));
    }
  },
  info(message: string, meta?: unknown) {
    if (LOG_LEVELS.info >= LOG_LEVELS[currentLevel]) {
      console.log(formatMessage('info', message, meta));
    }
  },
  warn(message: string, meta?: unknown) {
    if (LOG_LEVELS.warn >= LOG_LEVELS[currentLevel]) {
      console.warn(formatMessage('warn', message, meta));
    }
  },
  error(message: string, meta?: unknown) {
    if (LOG_LEVELS.error >= LOG_LEVELS[currentLevel]) {
      console.error(formatMessage('error', message, meta));
    }
  },
};
