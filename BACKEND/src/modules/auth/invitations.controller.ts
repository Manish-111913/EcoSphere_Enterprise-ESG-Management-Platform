import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { SkipAudit } from '../../common/decorators/skip-audit.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { InvitationsService } from './invitations.service';
import { AcceptInvitationDto, CreateInvitationDto } from './dto/invitation.dto';

@SkipAudit() // service writes explicit audit; create/accept responses carry tokens
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitations: InvitationsService) {}

  @RequirePermission('invitations:create')
  @Post()
  create(
    @Body() dto: CreateInvitationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.invitations.create(dto, user);
  }

  @RequirePermission('invitations:read')
  @Get()
  list() {
    return this.invitations.list();
  }

  @RequirePermission('invitations:delete')
  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.invitations.remove(id, user);
  }

  @Public()
  @HttpCode(200)
  @Post('accept')
  accept(@Body() dto: AcceptInvitationDto) {
    return this.invitations.accept(dto);
  }
}
