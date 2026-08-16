import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { SeatBookingsService } from './seat-bookings.service';
import { CreateSeatBookingDto } from './dto/create-seat-booking.dto';
import { CancelSeatBookingDto } from './dto/cancel-seat-booking.dto';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@ApiTags('Seat Bookings')
@ApiBearerAuth()
@Controller('seat-bookings')
export class SeatBookingsController {
  constructor(private readonly seatBookingsService: SeatBookingsService) {}

  @Post()
  @RequirePermission('BOOKING_MANAGE')
  @ApiOperation({ summary: 'Create a seat booking' })
  async create(
    @Body() dto: CreateSeatBookingDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return {
      message: 'Booking created successfully',
      data: await this.seatBookingsService.create(dto, user),
    };
  }

  @Get()
  @RequirePermission('BOOKING_VIEW')
  @ApiOperation({ summary: 'List all seat bookings' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'student_id', required: false, type: String })
  @ApiQuery({ name: 'seat_id', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'date', required: false, type: String })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('student_id') studentId?: string,
    @Query('seat_id') seatId?: string,
    @Query('status') status?: string,
    @Query('date') date?: string,
  ) {
    const p = Math.max(1, Number(page));
    const l = Math.max(1, Number(limit));

    const { data, total } = await this.seatBookingsService.findAll(
      user,
      p,
      l,
      studentId,
      seatId,
      status,
      date,
    );
    return {
      message: 'Bookings retrieved successfully',
      data,
      meta: { total, page: p, limit: l },
    };
  }

  @Patch(':id/cancel')
  @RequirePermission('BOOKING_MANAGE')
  @ApiOperation({ summary: 'Cancel a booking' })
  async cancel(
    @Param('id') id: string,
    @Body() dto: CancelSeatBookingDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return {
      message: 'Booking cancelled successfully',
      data: await this.seatBookingsService.cancel(id, dto, user),
    };
  }
}
