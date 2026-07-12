import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { SkipAudit } from '../../common/decorators/skip-audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { RolesAdminService } from './roles-admin.service';
import { CreateRoleDto, SetPermissionsDto, UpdateRoleDto } from './dto/role.dto';

@SkipAudit()
@Controller()
export class RolesAdminController {
  constructor(private readonly roles: RolesAdminService) {}

  @RequirePermission('roles:read')
  @Get('permissions')
  listPermissions() {
    return this.roles.listPermissions();
  }

  @RequirePermission('roles:read')
  @Get('roles')
  listRoles() {
    return this.roles.listRoles();
  }

  @RequirePermission('roles:read')
  @Get('roles/:id/permissions')
  getPermissions(@Param('id', ParseUUIDPipe) id: string) {
    return this.roles.getPermissions(id);
  }

  @RequirePermission('roles:create')
  @Post('roles')
  create(@Body() dto: CreateRoleDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.roles.createRole(dto, actor.id);
  }

  @RequirePermission('roles:update')
  @Put('roles/:id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.roles.updateRole(id, dto, actor.id);
  }

  @RequirePermission('roles:update')
  @Put('roles/:id/permissions')
  setPermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetPermissionsDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.roles.setPermissions(id, dto, actor.id);
  }

  @RequirePermission('roles:delete')
  @Delete('roles/:id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.roles.deleteRole(id, actor.id);
  }
}
