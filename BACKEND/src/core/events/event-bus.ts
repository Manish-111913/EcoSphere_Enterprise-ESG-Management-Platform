import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter } from 'node:events';

export type DomainEventHandler<T = unknown> = (
  payload: T,
) => void | Promise<void>;

/**
 * Minimal in-process event bus (spec §A10 "events (in-process bus)").
 * Domain events (carbon.recorded, xp.credited, badge.awarded, config.updated, …)
 * are published post-commit and consumed by rules/notification handlers.
 * Swap for a broker later without touching publishers (spec §A12).
 */
@Injectable()
export class EventBus {
  private readonly logger = new Logger(EventBus.name);
  private readonly emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(100);
  }

  publish<T>(eventCode: string, payload: T): void {
    this.logger.debug(`event: ${eventCode}`);
    this.emitter.emit(eventCode, payload);
  }

  on<T>(eventCode: string, handler: DomainEventHandler<T>): void {
    this.emitter.on(eventCode, (payload: T) => {
      Promise.resolve(handler(payload)).catch((err) =>
        this.logger.error(
          `handler for "${eventCode}" failed: ${(err as Error).message}`,
        ),
      );
    });
  }
}
