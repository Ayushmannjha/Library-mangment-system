import { Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { StudentPortalService } from './student-portal.service';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

/**
 * Self-service student portal. Every route is scoped to the logged-in
 * student via the JWT (users.student_id) — ids are never taken from the
 * request body, so students cannot access another student's data.
 *
 * The public landing page behind the desk QR code lives in a separate
 * controller (attendance-landing.controller.ts) so the QR URL stays short.
 */
@ApiTags('Student Portal')
@ApiBearerAuth()
@Controller('student')
export class StudentPortalController {
  constructor(private readonly studentPortalService: StudentPortalService) {}

  @Get('me')
  @RequirePermission('STUDENT_SELF_VIEW')
  @ApiOperation({ summary: 'Get my student profile and account' })
  async me(@CurrentUser() user: AuthenticatedUser) {
    return {
      message: 'Student profile fetched successfully',
      data: await this.studentPortalService.me(user),
    };
  }

  /**
   * Token-only attendance confirmation. The desk QR holds no student data —
   * the logged-in student (from the JWT) is the only identity accepted.
   */
  @Post('attendance')
  @RequirePermission('STUDENT_SELF_CHECKIN')
  @ApiOperation({ summary: 'Confirm attendance for the logged-in student' })
  async checkIn(@CurrentUser() user: AuthenticatedUser) {
    return {
      message: 'Checked in successfully',
      data: await this.studentPortalService.checkIn(user),
    };
  }

  @Get('attendance')
  @RequirePermission('STUDENT_SELF_VIEW')
  @ApiOperation({ summary: 'Get my attendance history' })
  async myAttendance(@CurrentUser() user: AuthenticatedUser) {
    return {
      message: 'Attendance records fetched successfully',
      data: await this.studentPortalService.myAttendance(user),
    };
  }

  @Get('seat')
  @RequirePermission('STUDENT_SELF_VIEW')
  @ApiOperation({ summary: 'Get my allocated seat' })
  async mySeat(@CurrentUser() user: AuthenticatedUser) {
    return {
      message: 'Seat fetched successfully',
      data: await this.studentPortalService.mySeat(user),
    };
  }

  @Get('fees')
  @RequirePermission('STUDENT_SELF_VIEW')
  @ApiOperation({ summary: 'Get my invoices and payments' })
  async myFees(@CurrentUser() user: AuthenticatedUser) {
    return {
      message: 'Fees fetched successfully',
      data: await this.studentPortalService.myFees(user),
    };
  }
}
