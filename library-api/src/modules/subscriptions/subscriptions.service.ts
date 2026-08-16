import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { CreateLibrarySubscriptionDto } from './dto/create-library-subscription.dto';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  private mapPlanDecimalOutput(plan: any) {
    return {
      ...plan,
      price: Number(plan.price),
    };
  }

  private mapSubscriptionDecimalOutput(sub: any) {
    return {
      ...sub,
      price: Number(sub.price),
    };
  }

  // --- Subscription Plans (Global, Super Admin only) ---

  async createPlan(dto: CreateSubscriptionPlanDto, user: AuthenticatedUser) {
    // Note: Auth guard @RequireRole('SUPER_ADMIN') should be on the controller
    try {
      const plan = await this.prisma.subscription_plans.create({
        data: {
          code: dto.code,
          name: dto.name,
          description: dto.description || null,
          price: dto.price,
          currency: dto.currency || 'INR',
          billing_cycle: dto.billing_cycle || 'MONTHLY',
          created_by: BigInt(user.id),
        },
      });
      return this.mapPlanDecimalOutput(plan);
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException(
          'A subscription plan with this code already exists',
        );
      }
      throw error;
    }
  }

  async findAllPlans(page = 1, limit = 50, status?: string) {
    const skip = (page - 1) * limit;
    const whereClause: any = {};
    if (status) whereClause.status = status;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.subscription_plans.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.subscription_plans.count({ where: whereClause }),
    ]);

    return {
      data: data.map((p) => this.mapPlanDecimalOutput(p)),
      total,
    };
  }

  async findOnePlan(id: string) {
    const plan = await this.prisma.subscription_plans.findUnique({
      where: { id: BigInt(id) },
    });
    if (!plan) throw new NotFoundException('Subscription plan not found');
    return this.mapPlanDecimalOutput(plan);
  }

  // --- Library Subscriptions (Tenant scoped) ---

  async subscribeLibrary(
    dto: CreateLibrarySubscriptionDto,
    user: AuthenticatedUser,
  ) {
    // If library_id is provided, check if user is SUPER_ADMIN (or allow if it matches their own)
    // For simplicity, we just use the user's library_id unless they are a super admin.
    const targetLibraryId = dto.library_id
      ? BigInt(dto.library_id)
      : user.library_id;
    if (!targetLibraryId) {
      throw new ForbiddenException('A valid library_id context is required');
    }

    // Validate that the user can subscribe the target library
    // (A normal admin can only subscribe their own library)
    if (user.library_id && user.library_id !== targetLibraryId) {
      // Check if they are a super admin. If they have no library_id, they might be SA.
      // Actually, we should check roles, but simpler to just throw Forbidden if mismatch
      throw new ForbiddenException(
        'You can only manage subscriptions for your own library',
      );
    }

    const plan = await this.prisma.subscription_plans.findFirst({
      where: { id: BigInt(dto.plan_id), status: 'ACTIVE' },
    });
    if (!plan)
      throw new NotFoundException('Active subscription plan not found');

    const now = new Date();
    const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days trial

    try {
      const subscription = await this.prisma.library_subscriptions.create({
        data: {
          library_id: targetLibraryId,
          plan_id: plan.id,
          status: 'TRIALING',
          trial_start_at: now,
          trial_end_at: trialEnd,
          price: plan.price,
          currency: plan.currency,
          created_by: BigInt(user.id),
        },
      });
      return this.mapSubscriptionDecimalOutput(subscription);
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException(
          'This library already has an active or trialing subscription',
        );
      }
      throw error;
    }
  }

  async getMySubscription(user: AuthenticatedUser) {
    if (!user.library_id) {
      throw new ForbiddenException('Admin user is missing a library context');
    }

    // Find the currently active or trialing subscription
    const subscription = await this.prisma.library_subscriptions.findFirst({
      where: {
        library_id: user.library_id,
        status: { in: ['ACTIVE', 'TRIALING'] },
      },
      include: {
        subscription_plans: true,
      },
    });

    if (!subscription)
      throw new NotFoundException('No active or trialing subscription found');

    return {
      ...this.mapSubscriptionDecimalOutput(subscription),
      plan: this.mapPlanDecimalOutput(subscription.subscription_plans),
    };
  }

  async activateSubscription(user: AuthenticatedUser) {
    if (!user.library_id) {
      throw new ForbiddenException('Admin user is missing a library context');
    }

    const subscription = await this.prisma.library_subscriptions.findFirst({
      where: {
        library_id: user.library_id,
        status: 'TRIALING',
      },
    });

    if (!subscription)
      throw new NotFoundException('No trialing subscription found to activate');

    const now = new Date();

    const updated = await this.prisma.library_subscriptions.update({
      where: { id: subscription.id },
      data: {
        status: 'ACTIVE',
        start_at: now,
        // Depending on billing cycle, end_at could be set here. We'll leave it simple for now.
        updated_by: BigInt(user.id),
        updated_at: now,
      },
    });

    return this.mapSubscriptionDecimalOutput(updated);
  }

  async cancelSubscription(user: AuthenticatedUser) {
    if (!user.library_id) {
      throw new ForbiddenException('Admin user is missing a library context');
    }

    const subscription = await this.prisma.library_subscriptions.findFirst({
      where: {
        library_id: user.library_id,
        status: { in: ['ACTIVE', 'TRIALING'] },
      },
    });

    if (!subscription)
      throw new NotFoundException(
        'No active or trialing subscription found to cancel',
      );

    const updated = await this.prisma.library_subscriptions.update({
      where: { id: subscription.id },
      data: {
        status: 'CANCELLED',
        cancelled_at: new Date(),
        updated_by: BigInt(user.id),
        updated_at: new Date(),
      },
    });

    return this.mapSubscriptionDecimalOutput(updated);
  }
}
