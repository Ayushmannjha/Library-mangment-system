import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CancelSeatBookingDto {
  @ApiPropertyOptional({ example: 'Student requested cancellation' })
  @IsOptional()
  @IsString()
  notes?: string;
}
