import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private enforceTenantIsolation(user: AuthenticatedUser): bigint {
    if (!user.library_id) {
      throw new ForbiddenException('Admin user is missing a library context');
    }
    return user.library_id;
  }

  async getSuperAdminDashboardMetrics(user: AuthenticatedUser) {
    if (!user.roles.includes('SUPER_ADMIN')) {
      throw new ForbiddenException(
        'Only Super Admin can access SaaS dashboard',
      );
    }

    const now = new Date();

    // Aggregates for SaaS Dashboard
    const [totalLibraries, activeLibraries, inactiveLibraries] =
      await Promise.all([
        this.prisma.libraries.count(),
        this.prisma.libraries.count({ where: { status: 'ACTIVE' } }),
        this.prisma.libraries.count({ where: { status: 'INACTIVE' } }),
      ]);

    // Subscriptions
    const [trialSubscriptions, paidSubscriptions] = await Promise.all([
      this.prisma.library_subscriptions.count({
        where: { status: 'TRIALING' },
      }),
      this.prisma.library_subscriptions.count({ where: { status: 'ACTIVE' } }),
    ]);

    // Total Subscription Revenue
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const revenueAgg = await this.prisma.payments.aggregate({
      _sum: { amount: true },
      where: {
        status: 'SUCCESS',
        payment_date: { gte: startOfMonth },
      },
    });

    const recentLibraries = await this.prisma.libraries.findMany({
      take: 5,
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        name: true,
        status: true,
        created_at: true,
      },
    });

    return {
      kpis: {
        totalLibraries,
        activeLibraries,
        inactiveLibraries,
        trialLibraries: trialSubscriptions,
        paidLibraries: paidSubscriptions,
        subscriptionRevenue: revenueAgg._sum.amount || 0,
      },
      recentLibraries: recentLibraries.map((lib) => ({
        ...lib,
        id: lib.id.toString(),
      })),
    };
  }

  async getDashboardMetrics(user: AuthenticatedUser) {
    const libraryId = this.enforceTenantIsolation(user);
    const now = new Date();

    const [totalStudents, totalSeats, activeBookings, todayCheckIns] =
      await Promise.all([
        // Total Active Students
        this.prisma.students.count({
          where: { library_id: libraryId, status: 'ACTIVE' },
        }),
        // Total Seats
        this.prisma.seats.count({
          where: { library_id: libraryId, status: 'ACTIVE' },
        }),
        // Active Bookings (occupied seats today)
        this.prisma.seat_bookings.count({
          where: {
            library_id: libraryId,
            status: 'BOOKED',
            booking_date: new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate(),
            ),
          },
        }),
        // Today's Check-Ins
        this.prisma.attendance.count({
          where: {
            library_id: libraryId,
            check_in_at: {
              gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()), // Start of today
            },
          },
        }),
      ]);

    // Revenue this month (SUCCESS payments)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const revenueAgg = await this.prisma.payments.aggregate({
      _sum: { amount: true },
      where: {
        library_id: libraryId,
        status: 'SUCCESS',
        payment_date: { gte: startOfMonth },
      },
    });

    // Total Outstanding Dues (PENDING invoices)
    const pendingDuesAgg = await this.prisma.invoices.aggregate({
      _sum: { total_amount: true },
      where: {
        library_id: libraryId,
        status: 'PENDING',
      },
    });

    return {
      total_students: totalStudents,
      total_seats: totalSeats,
      active_bookings: activeBookings,
      occupancy_rate:
        totalSeats > 0
          ? Number(((activeBookings / totalSeats) * 100).toFixed(2))
          : 0,
      today_check_ins: todayCheckIns,
      revenue_this_month: revenueAgg?._sum?.amount
        ? Number(revenueAgg._sum.amount)
        : 0,
      outstanding_dues: pendingDuesAgg?._sum?.total_amount
        ? Number(pendingDuesAgg._sum.total_amount)
        : 0,
    };
  }

  async getRevenueReport(
    user: AuthenticatedUser,
    startDate?: string,
    endDate?: string,
  ) {
    const libraryId = this.enforceTenantIsolation(user);

    const whereClause: any = {
      library_id: libraryId,
      status: 'SUCCESS',
    };

    if (startDate || endDate) {
      whereClause.payment_date = {};
      if (startDate) whereClause.payment_date.gte = new Date(startDate);
      if (endDate) whereClause.payment_date.lte = new Date(endDate);
    }

    const revenueAgg = await this.prisma.payments.aggregate({
      _sum: { amount: true },
      _count: { id: true },
      where: whereClause,
    });

    return {
      total_revenue: revenueAgg._sum.amount
        ? Number(revenueAgg._sum.amount)
        : 0,
      transaction_count: revenueAgg._count.id,
    };
  }

  async getAttendanceReport(
    user: AuthenticatedUser,
    startDate?: string,
    endDate?: string,
  ) {
    const libraryId = this.enforceTenantIsolation(user);

    const whereClause: any = {
      library_id: libraryId,
    };

    if (startDate || endDate) {
      whereClause.check_in_at = {};
      if (startDate) whereClause.check_in_at.gte = new Date(startDate);
      if (endDate) whereClause.check_in_at.lte = new Date(endDate);
    }

    const attendanceCount = await this.prisma.attendance.count({
      where: whereClause,
    });

    return {
      total_check_ins: attendanceCount,
    };
  }
}
