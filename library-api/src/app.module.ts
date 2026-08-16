import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { LibrariesModule } from './modules/libraries/libraries.module';
import { UsersModule } from './modules/users/users.module';
import { StudentsModule } from './modules/students/students.module';
import { SeatsModule } from './modules/seats/seats.module';
import { TimeSlotsModule } from './modules/time-slots/time-slots.module';
import { SeatBookingsModule } from './modules/seat-bookings/seat-bookings.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { FeePlansModule } from './modules/fee-plans/fee-plans.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { ReportsModule } from './modules/reports/reports.module';
import { StudentPortalModule } from './modules/student-portal/student-portal.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { MailModule } from './common/mail/mail.module';

/**
 * Root module of the application.
 *
 * ConfigModule.forRoot({ isGlobal: true }) is REQUIRED: NestJS does not
 * auto-load .env, and Prisma 7 reads process.env.DATABASE_URL when the
 * adapter is constructed, so .env must be loaded before the app starts.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100, // 100 requests per minute per IP globally
      },
    ]),
    // Marked @Global, so PrismaService can be injected by any feature module
    // without each module re-importing DatabaseModule.
    DatabaseModule,
    // Global SMTP mailer (injected by StudentsService to email credentials).
    MailModule,
    // Registers the global JwtAuthGuard (APP_GUARD) — authentication is now
    // mandatory app-wide; open endpoints must be annotated @Public().
    AuthModule,
    // Feature modules are attached here one by one as phases complete.
    LibrariesModule,
    UsersModule,
    StudentsModule,
    SeatsModule,
    TimeSlotsModule,
    SeatBookingsModule,
    AttendanceModule,
    FeePlansModule,
    InvoicesModule,
    PaymentsModule,
    SubscriptionsModule,
    ReportsModule,
    StudentPortalModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
