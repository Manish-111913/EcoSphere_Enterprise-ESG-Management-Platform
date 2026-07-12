import { Injectable, NotFoundException } from '@nestjs/common';
import { Notification, Prisma } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, unreadOnly: boolean): Promise<{ data: Notification[]; unreadCount: number }> {
    const where: Prisma.NotificationWhereInput = { userId };
    if (unreadOnly) where.isRead = false;
    const [data, unreadCount] = await this.prisma.$transaction([
      this.prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100 }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);
    return { data, unreadCount };
  }

  async markRead(id: string, userId: string): Promise<Notification> {
    const n = await this.prisma.notification.findFirst({ where: { id, userId } });
    if (!n) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Notification not found' });
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllRead(userId: string): Promise<{ updated: number }> {
    const res = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { updated: res.count };
  }
}
