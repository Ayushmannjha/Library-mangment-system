import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CheckOutDto {
  @ApiPropertyOptional({ example: 'Left early for lunch' })
  @IsOptional()
  @IsString()
  remarks?: string;
}
