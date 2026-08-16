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
import { UpdateSubscriptionPlanDto } from './dto/update-subscription-plan.dto';
import { ChangeLibraryPlanDto } from './dto/change-library-plan.dto';

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

  /**
   * Partial update of a plan (name/description/price/currency/billing_cycle)
   * plus a soft status toggle so plans can be activated / deactivated without
   * deleting rows that FK-linked subscriptions still reference.
   */
  async updatePlan(
    id: string,
    dto: UpdateSubscriptionPlanDto,
    user: AuthenticatedUser,
  ) {
    const planId = BigInt(id);
    const existing = await this.prisma.subscription_plans.findUnique({
      where: { id: planId },
    });
    if (!existing) throw new NotFoundException('Subscription plan not found');

    try {
      const updated = await this.prisma.subscription_plans.update({
        where: { id: planId },
        data: {
          ...(dto.code !== undefined && { code: dto.code }),
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.description !== undefined && {
            description: dto.description,
          }),
          ...(dto.price !== undefined && { price: dto.price }),
          ...(dto.currency !== undefined && { currency: dto.currency }),
          ...(dto.billing_cycle !== undefined && {
            billing_cycle: dto.billing_cycle,
          }),
          ...(dto.status !== undefined && { status: dto.status }),
          updated_by: BigInt(user.id),
          updated_at: new Date(),
        },
      });
      return this.mapPlanDecimalOutput(updated);
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException(
          'A subscription plan with this code already exists',
        );
      }
      throw error;
    }
  }

  // --- Admin: cross-library subscriptions (Super Admin only) ---

  /**
   * Lists the latest subscription per library with the linked plan + library,
   * and computes expiry information: days_left, an EXPIRED override when the
   * active/trialing window has lapsed, and expiring_soon when an ACTIVE plan
   * ends within `expiringSoonDays` (default 7).
   */
  async findAllLibrarySubscriptions(opts: {
    status?: string;
    expiringSoon?: boolean;
    includeInactive?: boolean;
    page?: number;
    limit?: number;
  }) {
    const now = new Date();
    const expiringSoonDays = 7;

    const rows = await this.prisma.library_subscriptions.findMany({
      include: {
        subscription_plans: true,
        libraries: true,
      },
      orderBy: { id: 'desc' },
    });

    // One row per library — the partial unique index means at most one
    // ACTIVE/TRIALING row per library, so the newest id is the current one.
    const latestByLibrary = new Map<string, (typeof rows)[number]>();
    for (const row of rows) {
      const key = row.library_id.toString();
      if (!latestByLibrary.has(key)) {
        latestByLibrary.set(key, row);
      }
    }

    let list = Array.from(latestByLibrary.values()).map((sub) => {
      const plan = sub.subscription_plans;
      const endAt = sub.status === 'TRIALING' ? sub.trial_end_at : sub.end_at;

      let status = sub.status;
      let daysLeft: number | null = null;
      if (endAt) {
        daysLeft = Math.ceil(
          (endAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
        );
        if (daysLeft < 0 && (sub.status === 'ACTIVE' || sub.status === 'TRIALING')) {
          status = 'EXPIRED';
        }
      }

      const expiringSoon =
        status === 'ACTIVE' &&
        daysLeft !== null &&
        daysLeft >= 0 &&
        daysLeft <= expiringSoonDays;

      return {
        id: sub.id.toString(),
        library_id: sub.library_id.toString(),
        plan_id: sub.plan_id.toString(),
        status,
        days_left: daysLeft,
        expiring_soon: expiringSoon,
        trial_start_at: sub.trial_start_at,
        trial_end_at: sub.trial_end_at,
        start_at: sub.start_at,
        end_at: sub.end_at,
        price: Number(sub.price),
        currency: sub.currency,
        created_at: sub.created_at,
        plan: {
          id: plan.id.toString(),
          code: plan.code,
          name: plan.name,
          price: Number(plan.price),
          currency: plan.currency,
          billing_cycle: plan.billing_cycle,
        },
        library: {
          id: sub.libraries.id.toString(),
          name: sub.libraries.name,
          code: sub.libraries.code,
          city: sub.libraries.city,
          status: sub.libraries.status,
        },
      };
    });

    if (opts.status) {
      list = list.filter((s) => s.status === opts.status);
    }
    if (opts.expiringSoon) {
      list = list.filter((s) => s.expiring_soon || s.status === 'EXPIRED');
    }
    if (!opts.includeInactive) {
      list = list.filter((s) => s.library.status === 'ACTIVE');
    }

    // Soonest-to-expire first (EXPIRED at the top).
    list.sort((a, b) => {
      const da = a.days_left ?? Number.MAX_SAFE_INTEGER;
      const db = b.days_left ?? Number.MAX_SAFE_INTEGER;
      return da - db;
    });

    const page = Math.max(1, Number(opts.page ?? 1));
    const limit = Math.max(1, Number(opts.limit ?? 50));
    const start = (page - 1) * limit;
    const paged = list.slice(start, start + limit);

    return { data: paged, total: list.length };
  }

  /**
   * Switches an existing active/trialing library subscription to another plan.
   * The subscription row is preserved (status + dates), only the plan, price
   * and currency are updated.
   */
  async changeLibraryPlan(
    subscriptionId: string,
    dto: ChangeLibraryPlanDto,
    user: AuthenticatedUser,
  ) {
    const subId = BigInt(subscriptionId);
    const subscription = await this.prisma.library_subscriptions.findUnique({
      where: { id: subId },
    });
    if (!subscription) {
      throw new NotFoundException('Library subscription not found');
    }
    if (!['ACTIVE', 'TRIALING'].includes(subscription.status)) {
      throw new BadRequestException(
        'Only active or trialing subscriptions can change plan',
      );
    }

    const plan = await this.prisma.subscription_plans.findFirst({
      where: { id: BigInt(dto.plan_id), status: 'ACTIVE' },
    });
    if (!plan) {
      throw new NotFoundException('Active subscription plan not found');
    }

    const updated = await this.prisma.library_subscriptions.update({
      where: { id: subId },
      data: {
        plan_id: plan.id,
        price: plan.price,
        currency: plan.currency,
        updated_by: BigInt(user.id),
        updated_at: new Date(),
      },
    });

    return this.mapSubscriptionDecimalOutput(updated);
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
