import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  @RequirePermission('REPORT_VIEW')
  @ApiOperation({ summary: 'Get high-level dashboard metrics' })
  async getDashboard(@CurrentUser() user: AuthenticatedUser) {
    return {
      message: 'Dashboard metrics retrieved',
      data: await this.reportsService.getDashboardMetrics(user),
    };
  }

  @Get('saas-dashboard')
  @ApiOperation({ summary: 'Get SaaS high-level metrics for Super Admin' })
  async getSaasDashboard(@CurrentUser() user: AuthenticatedUser) {
    return {
      message: 'SaaS Dashboard metrics retrieved',
      data: await this.reportsService.getSuperAdminDashboardMetrics(user),
    };
  }

  @Get('revenue')
  @RequirePermission('REPORT_VIEW')
  @ApiOperation({ summary: 'Get revenue analytics' })
  @ApiQuery({ name: 'start_date', required: false, type: String })
  @ApiQuery({ name: 'end_date', required: false, type: String })
  async getRevenue(
    @CurrentUser() user: AuthenticatedUser,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
  ) {
    return {
      message: 'Revenue report retrieved',
      data: await this.reportsService.getRevenueReport(
        user,
        startDate,
        endDate,
      ),
    };
  }

  @Get('attendance')
  @RequirePermission('REPORT_VIEW')
  @ApiOperation({ summary: 'Get attendance analytics' })
  @ApiQuery({ name: 'start_date', required: false, type: String })
  @ApiQuery({ name: 'end_date', required: false, type: String })
  async getAttendance(
    @CurrentUser() user: AuthenticatedUser,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
  ) {
    return {
      message: 'Attendance report retrieved',
      data: await this.reportsService.getAttendanceReport(
        user,
        startDate,
        endDate,
      ),
    };
  }
}
