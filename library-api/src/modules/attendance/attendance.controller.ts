import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@ApiTags('Attendance')
@ApiBearerAuth()
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('check-in')
  @RequirePermission('ATTENDANCE_MANAGE')
  @ApiOperation({ summary: 'Check in a student' })
  async checkIn(
    @Body() dto: CheckInDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return {
      message: 'Checked in successfully',
      data: await this.attendanceService.checkIn(dto, user),
    };
  }

  @Post('check-out/:studentId')
  @RequirePermission('ATTENDANCE_MANAGE')
  @ApiOperation({ summary: 'Check out a student' })
  async checkOut(
    @Param('studentId') studentId: string,
    @Body() dto: CheckOutDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return {
      message: 'Checked out successfully',
      data: await this.attendanceService.checkOut(studentId, dto, user),
    };
  }

  @Get()
  @RequirePermission('ATTENDANCE_VIEW')
  @ApiOperation({ summary: 'List attendance records' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'student_id', required: false, type: String })
  @ApiQuery({ name: 'date', required: false, type: String })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('student_id') studentId?: string,
    @Query('date') date?: string,
  ) {
    const p = Math.max(1, Number(page));
    const l = Math.max(1, Number(limit));

    const { data, total } = await this.attendanceService.findAll(
      user,
      p,
      l,
      studentId,
      date,
    );
    return {
      message: 'Attendance records retrieved successfully',
      data,
      meta: { total, page: p, limit: l },
    };
  }
}
