import { Module } from '@nestjs/common';
import {
  NotificationsController,
  NotificationsAdminController,
} from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationsAdminService } from './notifications-admin.service';
import { NotificationDispatcherService } from './notification-dispatcher.service';

/**
 * Notification system (W11): the dispatcher subscribes to domain events and
 * writes in-app rows (+ email), plus user endpoints and admin rule/template CRUD.
 */
@Module({
  controllers: [NotificationsController, NotificationsAdminController],
  providers: [
    NotificationsService,
    NotificationsAdminService,
    NotificationDispatcherService,
  ],
  exports: [NotificationDispatcherService],
})
export class NotificationsModule {}
