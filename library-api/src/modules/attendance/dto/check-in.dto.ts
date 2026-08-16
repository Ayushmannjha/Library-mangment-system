import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CheckInDto {
  @ApiProperty({ example: '1', description: 'ID of the student' })
  @IsString()
  @IsNotEmpty()
  student_id!: string;

  @ApiPropertyOptional({
    example: '1',
    description: 'Optional seat booking ID',
  })
  @IsOptional()
  @IsString()
  booking_id?: string;

  @ApiPropertyOptional({
    example: 'QR',
    description: 'Method of check in (QR or MANUAL)',
  })
  @IsOptional()
  @IsString()
  check_in_method?: string;

  @ApiPropertyOptional({
    example: 'XYZ123',
    description: 'Unique QR token used',
  })
  @IsOptional()
  @IsString()
  qr_token?: string;

  @ApiPropertyOptional({ example: 'Arrived early' })
  @IsOptional()
  @IsString()
  remarks?: string;
}
