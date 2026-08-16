import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { FeePlansService } from './fee-plans.service';
import { CreateFeePlanDto } from './dto/create-fee-plan.dto';
import { UpdateFeePlanDto } from './dto/update-fee-plan.dto';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@ApiTags('Fee Plans')
@ApiBearerAuth()
@Controller('fee-plans')
export class FeePlansController {
  constructor(private readonly feePlansService: FeePlansService) {}

  @Post()
  @RequirePermission('FEE_PLAN_MANAGE')
  @ApiOperation({ summary: 'Create a new fee plan' })
  async create(
    @Body() dto: CreateFeePlanDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return {
      message: 'Fee plan created successfully',
      data: await this.feePlansService.create(dto, user),
    };
  }

  @Get()
  @RequirePermission('FEE_PLAN_VIEW')
  @ApiOperation({ summary: 'Get all fee plans' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('includeInactive') includeInactive = false,
  ) {
    const p = Math.max(1, Number(page));
    const l = Math.max(1, Number(limit));
    const incInactive = String(includeInactive) === 'true';

    const { data, total } = await this.feePlansService.findAll(
      user,
      p,
      l,
      incInactive,
    );
    return {
      message: 'Fee plans retrieved successfully',
      data,
      meta: { total, page: p, limit: l },
    };
  }

  @Get(':id')
  @RequirePermission('FEE_PLAN_VIEW')
  @ApiOperation({ summary: 'Get a fee plan by ID' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return {
      message: 'Fee plan retrieved successfully',
      data: await this.feePlansService.findOne(id, user),
    };
  }

  @Patch(':id')
  @RequirePermission('FEE_PLAN_MANAGE')
  @ApiOperation({ summary: 'Update a fee plan' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateFeePlanDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return {
      message: 'Fee plan updated successfully',
      data: await this.feePlansService.update(id, dto, user),
    };
  }

  @Delete(':id')
  @RequirePermission('FEE_PLAN_MANAGE')
  @ApiOperation({ summary: 'Soft delete a fee plan' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return {
      message: 'Fee plan deleted successfully',
      data: await this.feePlansService.remove(id, user),
    };
  }
}
