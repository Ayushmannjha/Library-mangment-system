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
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@ApiTags('Payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @RequirePermission('PAYMENT_MANAGE')
  @ApiOperation({ summary: 'Record a payment against an invoice' })
  async create(
    @Body() dto: CreatePaymentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return {
      message: 'Payment recorded successfully',
      data: await this.paymentsService.create(dto, user),
    };
  }

  @Get()
  @RequirePermission('PAYMENT_VIEW')
  @ApiOperation({ summary: 'Get all payments' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'invoice_id', required: false, type: String })
  @ApiQuery({ name: 'student_id', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('invoice_id') invoiceId?: string,
    @Query('student_id') studentId?: string,
    @Query('status') status?: string,
  ) {
    const p = Math.max(1, Number(page));
    const l = Math.max(1, Number(limit));

    const { data, total } = await this.paymentsService.findAll(
      user,
      p,
      l,
      invoiceId,
      studentId,
      status,
    );
    return {
      message: 'Payments retrieved successfully',
      data,
      meta: { total, page: p, limit: l },
    };
  }

  @Get(':id')
  @RequirePermission('PAYMENT_VIEW')
  @ApiOperation({ summary: 'Get a payment by ID' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return {
      message: 'Payment retrieved successfully',
      data: await this.paymentsService.findOne(id, user),
    };
  }

  @Patch(':id/refund')
  @RequirePermission('PAYMENT_MANAGE')
  @ApiOperation({ summary: 'Refund a payment' })
  async refund(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return {
      message: 'Payment refunded successfully',
      data: await this.paymentsService.refund(id, user),
    };
  }
}
