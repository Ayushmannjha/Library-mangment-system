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
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { CreateLibrarySubscriptionDto } from './dto/create-library-subscription.dto';
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

  // --- Library Subscriptions ---
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
}
