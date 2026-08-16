import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateLibrarySubscriptionDto {
  @ApiProperty({ example: '1' })
  @IsString()
  @IsNotEmpty()
  plan_id!: string;

  @ApiPropertyOptional({
    description: 'Optional library ID, defaults to current users library',
    example: '1',
  })
  @IsOptional()
  @IsString()
  library_id?: string;
}
