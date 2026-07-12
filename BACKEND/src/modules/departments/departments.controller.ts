import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseBoolPipe,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { SkipAudit } from '../../common/decorators/skip-audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { parsePagination, PageQuery } from '../../common/pagination';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto/department.dto';

@SkipAudit() // service records before/after explicitly
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departments: DepartmentsService) {}

  // Reference data for form dropdowns — readable by any authenticated user.
  @Get()
  list(
    @Query() query: PageQuery,
    @Query('isActive', new ParseBoolPipe({ optional: true })) isActive?: boolean,
  ) {
    return this.departments.list(parsePagination(query), { isActive });
  }

  @Get('tree')
  tree() {
    return this.departments.tree();
  }

  @RequirePermission('departments:read')
  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.departments.get(id);
  }

  @RequirePermission('departments:read')
  @Get(':id/scores')
  scores(@Param('id', ParseUUIDPipe) id: string) {
    return this.departments.scores(id);
  }

  @RequirePermission('departments:create')
  @Post()
  create(
    @Body() dto: CreateDepartmentDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.departments.create(dto, actor.id);
  }

  @RequirePermission('departments:update')
  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDepartmentDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.departments.update(id, dto, actor.id);
  }

  @RequirePermission('departments:delete')
  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.departments.remove(id, actor.id);
  }
}
