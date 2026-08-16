import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/**
 * PATCH body to switch an existing library subscription to a different plan
 * (Super Admin). Only the plan is changed; dates/status are preserved.
 */
export class ChangeLibraryPlanDto {
  @ApiProperty({ example: '3', description: 'Target subscription_plans.id' })
  @IsString()
  @IsNotEmpty()
  plan_id!: string;
}
