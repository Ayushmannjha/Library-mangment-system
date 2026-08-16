import { PartialType } from '@nestjs/mapped-types';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { CreateSubscriptionPlanDto } from './create-subscription-plan.dto';

/**
 * PATCH body for a subscription plan. Everything from CreateSubscriptionPlanDto
 * is optional (partial update). `status` allows activating / deactivating a
 * plan (soft "delete") without dropping FK-linked subscriptions.
 */
export class UpdateSubscriptionPlanDto extends PartialType(
  CreateSubscriptionPlanDto,
) {
  @ApiPropertyOptional({ example: 'ACTIVE', enum: ['ACTIVE', 'INACTIVE'] })
  @IsOptional()
  @IsString()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: string;
}
