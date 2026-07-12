import { Injectable, Logger } from '@nestjs/common';

export interface MailMessage {
  to: string;
  subject: string;
  body: string;
}

export interface MailAdapter {
  send(message: MailMessage): Promise<void>;
}

/** Dev adapter: logs the email instead of sending (spec §A10 mail = console). */
class ConsoleMailAdapter implements MailAdapter {
  private readonly logger = new Logger('Mail');
  send(message: MailMessage): Promise<void> {
    this.logger.log(`EMAIL → ${message.to} :: ${message.subject} :: ${message.body}`);
    return Promise.resolve();
  }
}

@Injectable()
export class MailService {
  // Swap the adapter for an SMTP/provider implementation later (spec §A12).
  private readonly adapter: MailAdapter = new ConsoleMailAdapter();

  send(message: MailMessage): Promise<void> {
    return this.adapter.send(message);
  }
}
