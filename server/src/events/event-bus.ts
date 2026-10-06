import { EventEmitter } from 'events';
import { logger } from '../utils/logger';

export type EvahEventType = 
  | 'usb:connected'
  | 'usb:disconnected'
  | 'session:created'
  | 'session:invalidated'
  | 'vault:unlocked'
  | 'vault:locked'
  | 'system:panic';

class EvahEventBus extends EventEmitter {
  emitEvah(event: EvahEventType, payload?: unknown): boolean {
    logger.debug(`Event emitted: ${event}`, payload);
    return super.emit(event, payload);
  }

  onEvah(event: EvahEventType, listener: (payload?: unknown) => void): this {
    return super.on(event, listener);
  }
}

export const eventBus = new EvahEventBus();
