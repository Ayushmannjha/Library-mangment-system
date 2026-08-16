import { PartialType, OmitType, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { CreateSeatDto } from './create-seat.dto';

export class UpdateSeatDto extends PartialType(
  OmitType(CreateSeatDto, ['seat_number'] as const),
) {
  @ApiPropertyOptional({
    example: 'INACTIVE',
    enum: ['ACTIVE', 'INACTIVE', 'MAINTENANCE'],
  })
  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE', 'MAINTENANCE'])
  status?: string;
}
