import { PartialType, OmitType, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { CreateTimeSlotDto } from './create-time-slot.dto';

export class UpdateTimeSlotDto extends PartialType(
  OmitType(CreateTimeSlotDto, ['name'] as const),
) {
  @ApiPropertyOptional({ example: 'INACTIVE', enum: ['ACTIVE', 'INACTIVE'] })
  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: string;
}
