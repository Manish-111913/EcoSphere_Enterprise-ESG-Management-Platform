import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Attachment } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { StorageService } from '../../core/storage/storage.service';
import { AppConfigService } from '../../core/config/app-config.service';
import { AuthenticatedUser } from '../../common/types/authenticated-user';

const PARTICIPATION_TYPES = ['csr_participation', 'challenge_participation'];

export interface UploadResult {
  attachmentId: string;
  url: string;
}

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly settings: AppConfigService,
  ) {}

  async upload(
    file: Express.Multer.File | undefined,
    uploaderId: string,
    entityType?: string,
    entityId?: string,
  ): Promise<UploadResult> {
    if (!file) {
      throw new UnprocessableEntityException({ code: 'VALIDATION_ERROR', message: 'No file provided' });
    }
    this.assertMime(file.mimetype);
    this.assertSize(file.size);

    const key = this.storage.generateKey(file.originalname);
    await this.storage.save(key, file.buffer);
    const attachment = await this.prisma.attachment.create({
      data: {
        entityType: entityType ?? 'generic',
        entityId: entityId ?? null,
        fileKey: key,
        originalName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        uploadedBy: uploaderId,
      },
    });
    return { attachmentId: attachment.id, url: `/api/v1/files/${attachment.id}` };
  }

  async download(
    id: string,
    user: AuthenticatedUser,
  ): Promise<{ buffer: Buffer; mimeType: string; originalName: string }> {
    const att = await this.prisma.attachment.findUnique({ where: { id } });
    if (!att) throw new NotFoundException({ code: 'NOT_FOUND', message: 'File not found' });
    if (!(await this.canAccess(att, user))) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Not authorized to access this file' });
    }
    const buffer = await this.storage.read(att.fileKey);
    return { buffer, mimeType: att.mimeType, originalName: att.originalName };
  }

  // ─────────────── authorization (spec §A6.10) ───────────────
  private async canAccess(att: Attachment, user: AuthenticatedUser): Promise<boolean> {
    if (att.uploadedBy === user.id) return true;
    if (user.roleNames.includes('Admin')) return true;

    // Participation proofs: only the participant or an authorized reviewer.
    if (att.entityType === 'csr_participation' && att.entityId) {
      const p = await this.prisma.csrParticipation.findUnique({ where: { id: att.entityId } });
      if (!p) return false;
      return (
        p.employeeId === user.id ||
        user.permissions.includes('csr_participations:approve') ||
        user.permissions.includes('csr_participations:read')
      );
    }
    if (att.entityType === 'challenge_participation' && att.entityId) {
      const p = await this.prisma.challengeParticipation.findUnique({ where: { id: att.entityId } });
      if (!p) return false;
      return (
        p.employeeId === user.id ||
        user.permissions.includes('challenge_participations:approve') ||
        user.permissions.includes('challenge_participations:read')
      );
    }
    // Non-participation attachments are gated by the files:read route permission.
    return !PARTICIPATION_TYPES.includes(att.entityType ?? '');
  }

  private assertMime(mime: string): void {
    const allowed = this.settings.getJson<string[]>('allowed_mime_types', [
      'image/png',
      'image/jpeg',
      'application/pdf',
    ]);
    if (!allowed.includes(mime)) {
      throw new UnprocessableEntityException({
        code: 'BUSINESS_RULE',
        message: `Mime type not allowed: ${mime}`,
        details: { allowed },
      });
    }
  }

  private assertSize(bytes: number): void {
    const maxMb = this.settings.getNumber('max_upload_mb', 10);
    if (bytes > maxMb * 1024 * 1024) {
      throw new UnprocessableEntityException({
        code: 'BUSINESS_RULE',
        message: `File exceeds max upload size of ${maxMb} MB`,
      });
    }
  }
}
