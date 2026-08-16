import { Controller, Get, Post, Body, Patch, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TimeSlotsService } from './time-slots.service';
import { CreateTimeSlotDto } from './dto/create-time-slot.dto';
import { UpdateTimeSlotDto } from './dto/update-time-slot.dto';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@ApiTags('Time Slots')
@ApiBearerAuth()
@Controller('time-slots')
export class TimeSlotsController {
  constructor(private readonly timeSlotsService: TimeSlotsService) {}

  @Post()
  @RequirePermission('TIMESLOT_MANAGE')
  @ApiOperation({ summary: 'Create a new time slot' })
  async create(
    @Body() dto: CreateTimeSlotDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return {
      message: 'Time slot created successfully',
      data: await this.timeSlotsService.create(dto, user),
    };
  }

  @Get()
  @RequirePermission('TIMESLOT_VIEW')
  @ApiOperation({ summary: 'List all time slots' })
  async findAll(@CurrentUser() user: AuthenticatedUser) {
    const { data, total } = await this.timeSlotsService.findAll(user);
    return {
      message: 'Time slots retrieved successfully',
      data,
      meta: { total },
    };
  }

  @Get(':id')
  @RequirePermission('TIMESLOT_VIEW')
  @ApiOperation({ summary: 'Get a time slot by ID' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return {
      message: 'Time slot retrieved successfully',
      data: await this.timeSlotsService.findOne(id, user),
    };
  }

  @Patch(':id')
  @RequirePermission('TIMESLOT_MANAGE')
  @ApiOperation({ summary: 'Update a time slot' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTimeSlotDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return {
      message: 'Time slot updated successfully',
      data: await this.timeSlotsService.update(id, dto, user),
    };
  }
}
