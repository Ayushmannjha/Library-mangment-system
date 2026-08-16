import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@ApiTags('Invoices')
@ApiBearerAuth()
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post()
  @RequirePermission('INVOICE_MANAGE')
  @ApiOperation({ summary: 'Create a new invoice' })
  async create(
    @Body() dto: CreateInvoiceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return {
      message: 'Invoice created successfully',
      data: await this.invoicesService.create(dto, user),
    };
  }

  @Get()
  @RequirePermission('INVOICE_VIEW')
  @ApiOperation({ summary: 'Get all invoices' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'student_id', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('student_id') studentId?: string,
    @Query('status') status?: string,
  ) {
    const p = Math.max(1, Number(page));
    const l = Math.max(1, Number(limit));

    const { data, total } = await this.invoicesService.findAll(
      user,
      p,
      l,
      studentId,
      status,
    );
    return {
      message: 'Invoices retrieved successfully',
      data,
      meta: { total, page: p, limit: l },
    };
  }

  @Get(':id')
  @RequirePermission('INVOICE_VIEW')
  @ApiOperation({ summary: 'Get an invoice by ID' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return {
      message: 'Invoice retrieved successfully',
      data: await this.invoicesService.findOne(id, user),
    };
  }

  @Patch(':id')
  @RequirePermission('INVOICE_MANAGE')
  @ApiOperation({ summary: 'Update a PENDING invoice' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return {
      message: 'Invoice updated successfully',
      data: await this.invoicesService.update(id, dto, user),
    };
  }

  @Delete(':id')
  @RequirePermission('INVOICE_MANAGE')
  @ApiOperation({ summary: 'Cancel an invoice (Soft Delete)' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return {
      message: 'Invoice cancelled successfully',
      data: await this.invoicesService.remove(id, user),
    };
  }
}
