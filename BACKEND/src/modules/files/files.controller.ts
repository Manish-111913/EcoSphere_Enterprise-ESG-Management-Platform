import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { IsOptional, IsString, IsUUID } from 'class-validator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { FilesService } from './files.service';

class UploadMetaDto {
  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsUUID()
  entityId?: string;
}

@Controller('files')
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @RequirePermission('files:upload')
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() meta: UploadMetaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.files.upload(file, user.id, meta.entityType, meta.entityId);
  }

  @RequirePermission('files:read')
  @Get(':id')
  async download(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, mimeType, originalName } = await this.files.download(id, user);
    res.setHeader('Content-Type', mimeType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(originalName)}"`,
    );
    res.send(buffer);
  }
}
