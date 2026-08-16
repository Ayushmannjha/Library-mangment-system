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
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { CreateLibrarySubscriptionDto } from './dto/create-library-subscription.dto';
import { UpdateSubscriptionPlanDto } from './dto/update-subscription-plan.dto';
import { ChangeLibraryPlanDto } from './dto/change-library-plan.dto';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@ApiTags('Subscriptions')
@ApiBearerAuth()
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  // --- Global Plans ---
  @Post('plans')
  @RequirePermission('SAAS_PLAN_MANAGE')
  @ApiOperation({ summary: 'Create a global subscription plan (Super Admin)' })
  async createPlan(
    @Body() dto: CreateSubscriptionPlanDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return {
      message: 'Subscription plan created successfully',
      data: await this.subscriptionsService.createPlan(dto, user),
    };
  }

  @Get('plans')
  @RequirePermission('SAAS_PLAN_VIEW')
  @ApiOperation({ summary: 'List all subscription plans' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  async findAllPlans(
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('status') status?: string,
  ) {
    const p = Math.max(1, Number(page));
    const l = Math.max(1, Number(limit));

    const { data, total } = await this.subscriptionsService.findAllPlans(
      p,
      l,
      status,
    );
    return {
      message: 'Subscription plans retrieved successfully',
      data,
      meta: { total, page: p, limit: l },
    };
  }

  @Patch('plans/:id')
  @RequirePermission('SAAS_PLAN_MANAGE')
  @ApiOperation({
    summary: 'Update a subscription plan (or activate/deactivate via status)',
  })
  @ApiParam({ name: 'id', description: 'Numeric plan id', example: 1 })
  async updatePlan(
    @Param('id') id: string,
    @Body() dto: UpdateSubscriptionPlanDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return {
      message: 'Subscription plan updated successfully',
      data: await this.subscriptionsService.updatePlan(id, dto, user),
    };
  }

  // --- Library Subscriptions ---
  // IMPORTANT: static paths (`libraries/my`) MUST be declared before the
  // `libraries/:id` parameterized routes below.

  @Post('libraries')
  @RequirePermission('SAAS_SUBSCRIPTION_MANAGE')
  @ApiOperation({
    summary: 'Subscribe library to a plan (Defaults to TRIALING)',
  })
  async subscribeLibrary(
    @Body() dto: CreateLibrarySubscriptionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return {
      message: 'Library subscribed successfully',
      data: await this.subscriptionsService.subscribeLibrary(dto, user),
    };
  }

  @Get('libraries/my')
  @RequirePermission('SAAS_SUBSCRIPTION_MANAGE')
  @ApiOperation({ summary: 'Get current library active/trialing subscription' })
  async getMySubscription(@CurrentUser() user: AuthenticatedUser) {
    return {
      message: 'Current subscription retrieved',
      data: await this.subscriptionsService.getMySubscription(user),
    };
  }

  @Post('libraries/my/activate')
  @RequirePermission('SAAS_SUBSCRIPTION_MANAGE')
  @ApiOperation({ summary: 'Activate a trialing subscription' })
  async activateSubscription(@CurrentUser() user: AuthenticatedUser) {
    return {
      message: 'Subscription activated successfully',
      data: await this.subscriptionsService.activateSubscription(user),
    };
  }

  @Delete('libraries/my')
  @RequirePermission('SAAS_SUBSCRIPTION_MANAGE')
  @ApiOperation({ summary: 'Cancel current active/trialing subscription' })
  async cancelSubscription(@CurrentUser() user: AuthenticatedUser) {
    return {
      message: 'Subscription cancelled successfully',
      data: await this.subscriptionsService.cancelSubscription(user),
    };
  }

  @Get('libraries')
  @RequirePermission('SAAS_SUBSCRIPTION_MANAGE')
  @ApiOperation({
    summary:
      'Admin: list every library subscription with plan + expiry info',
  })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'expiring_soon', required: false, type: Boolean })
  @ApiQuery({ name: 'include_inactive', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAllLibrarySubscriptions(
    @Query('status') status?: string,
    @Query('expiring_soon') expiringSoon?: string,
    @Query('include_inactive') includeInactive?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const { data, total } =
      await this.subscriptionsService.findAllLibrarySubscriptions({
        status,
        expiringSoon: expiringSoon === 'true',
        includeInactive: includeInactive === 'true',
        page,
        limit,
      });
    return {
      message: 'Library subscriptions retrieved successfully',
      data,
      meta: { total },
    };
  }

  @Patch('libraries/:id')
  @RequirePermission('SAAS_SUBSCRIPTION_MANAGE')
  @ApiOperation({
    summary: 'Admin: change the plan of an existing library subscription',
  })
  @ApiParam({ name: 'id', description: 'Numeric subscription id', example: 1 })
  async changeLibraryPlan(
    @Param('id') id: string,
    @Body() dto: ChangeLibraryPlanDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return {
      message: 'Library subscription plan updated successfully',
      data: await this.subscriptionsService.changeLibraryPlan(id, dto, user),
    };
  }
}
