import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import {
  DataScope,
  ScopeContext,
} from '../../common/decorators/data-scope.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  AuthenticatedUser,
  ResolvedScope,
} from '../../common/types/authenticated-user';
import { parsePagination, PageQuery } from '../../common/pagination';
import { UsersService } from './users.service';
import { AssignRolesDto, CreateUserDto, UpdateUserDto } from './dto/user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @RequirePermission('users:read')
  @DataScope('ALL')
  @Get()
  list(@Query() query: PageQuery, @ScopeContext() scope: ResolvedScope) {
    return this.users.list(parsePagination(query), scope);
  }

  @RequirePermission('users:create')
  @Post()
  create(@Body() dto: CreateUserDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.users.create(dto, actor.id);
  }

  @RequirePermission('users:read')
  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.get(id);
  }

  @RequirePermission('users:update')
  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.users.update(id, dto, actor.id);
  }

  @RequirePermission('users:delete')
  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.users.remove(id, actor.id);
  }

  @RequirePermission('users:manage_roles')
  @Put(':id/roles')
  assignRoles(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignRolesDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.users.assignRoles(id, dto.roleIds, actor.id);
  }

  @RequirePermission('users:update')
  @Post(':id/activate')
  activate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.users.setActive(id, true, actor.id);
  }

  @RequirePermission('users:update')
  @Post(':id/deactivate')
  deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.users.setActive(id, false, actor.id);
  }

  @RequirePermission('users:read')
  @Get(':id/xp')
  xp(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.xp(id);
  }

  @RequirePermission('users:read')
  @Get(':id/badges')
  badges(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.badges(id);
  }
}
