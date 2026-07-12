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
import { SkipAudit } from '../../common/decorators/skip-audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { CategoriesService } from './categories.service';
import {
  CategoryType,
  CreateCategoryDto,
  UpdateCategoryDto,
} from './dto/category.dto';

@SkipAudit()
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @RequirePermission('categories:read')
  @Get()
  list(@Query('type') type?: CategoryType) {
    return this.categories.list(type);
  }

  @RequirePermission('categories:read')
  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.categories.get(id);
  }

  @RequirePermission('categories:read')
  @Get(':id/usage')
  usage(@Param('id', ParseUUIDPipe) id: string) {
    return this.categories.usage(id);
  }

  @RequirePermission('categories:create')
  @Post()
  create(
    @Body() dto: CreateCategoryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.categories.create(dto, actor.id);
  }

  @RequirePermission('categories:update')
  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.categories.update(id, dto, actor.id);
  }

  @RequirePermission('categories:delete')
  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.categories.remove(id, actor.id);
  }
}
