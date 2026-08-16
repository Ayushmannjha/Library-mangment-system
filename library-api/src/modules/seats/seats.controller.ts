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
import { SeatsService } from './seats.service';
import { CreateSeatDto } from './dto/create-seat.dto';
import { BulkCreateSeatsDto } from './dto/bulk-create-seats.dto';
import { UpdateSeatDto } from './dto/update-seat.dto';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@ApiTags('Seats')
@ApiBearerAuth()
@Controller('seats')
export class SeatsController {
  constructor(private readonly seatsService: SeatsService) {}

  @Post()
  @RequirePermission('SEAT_MANAGE')
  @ApiOperation({ summary: 'Create a single seat' })
  async create(
    @Body() dto: CreateSeatDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return {
      message: 'Seat created successfully',
      data: await this.seatsService.create(dto, user),
    };
  }

  @Post('bulk')
  @RequirePermission('SEAT_MANAGE')
  @ApiOperation({ summary: 'Bulk generate seats' })
  async bulkCreate(
    @Body() dto: BulkCreateSeatsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.seatsService.bulkCreate(dto, user);
    return {
      message: result.message,
      data: { count: result.count },
    };
  }

  @Get()
  @RequirePermission('SEAT_VIEW')
  @ApiOperation({ summary: 'List all seats' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'floor', required: false, type: String })
  @ApiQuery({ name: 'section', required: false, type: String })
  @ApiQuery({ name: 'date', required: false, type: String })
  @ApiQuery({ name: 'time_slot_id', required: false, type: String })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('floor') floor?: string,
    @Query('section') section?: string,
    @Query('date') date?: string,
    @Query('time_slot_id') timeSlotId?: string,
  ) {
    const p = Math.max(1, Number(page));
    const l = Math.max(1, Number(limit));

    const { data, total } = await this.seatsService.findAll(
      user,
      p,
      l,
      floor,
      section,
      date,
      timeSlotId,
    );
    return {
      message: 'Seats retrieved successfully',
      data,
      meta: { total, page: p, limit: l },
    };
  }

  @Get(':id')
  @RequirePermission('SEAT_VIEW')
  @ApiOperation({ summary: 'Get a seat by ID' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return {
      message: 'Seat retrieved successfully',
      data: await this.seatsService.findOne(id, user),
    };
  }

  @Patch(':id')
  @RequirePermission('SEAT_MANAGE')
  @ApiOperation({ summary: 'Update a seat' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSeatDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return {
      message: 'Seat updated successfully',
      data: await this.seatsService.update(id, dto, user),
    };
  }
}
