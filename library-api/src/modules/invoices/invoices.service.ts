import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  private enforceTenantIsolation(user: AuthenticatedUser) {
    if (!user.library_id) {
      throw new ForbiddenException('Admin user is missing a library context');
    }
    return user.library_id;
  }

  private generateInvoiceNumber(): string {
    const timestamp = Date.now();
    const random = Math.floor(1000 + Math.random() * 9000);
    return `INV-${timestamp}-${random}`;
  }

  private calculateTotal(
    subtotal: number,
    discount: number,
    tax: number,
  ): number {
    return Number((subtotal - discount + tax).toFixed(2));
  }

  private mapDecimalOutput(invoice: any) {
    return {
      ...invoice,
      subtotal: Number(invoice.subtotal),
      discount_amount: Number(invoice.discount_amount),
      tax_amount: Number(invoice.tax_amount),
      total_amount: Number(invoice.total_amount),
    };
  }

  async create(dto: CreateInvoiceDto, user: AuthenticatedUser) {
    const libraryId = this.enforceTenantIsolation(user);

    // Validate student
    const student = await this.prisma.students.findFirst({
      where: { id: BigInt(dto.student_id), library_id: libraryId },
    });
    if (!student)
      throw new NotFoundException('Student not found in this library');

    let finalSubtotal = dto.subtotal || 0;

    // Validate fee plan if provided and fetch default subtotal
    if (dto.fee_plan_id) {
      const plan = await this.prisma.fee_plans.findFirst({
        where: { id: BigInt(dto.fee_plan_id), library_id: libraryId },
      });
      if (!plan)
        throw new NotFoundException('Fee plan not found in this library');

      // If subtotal is not provided, use the fee plan's amount
      if (dto.subtotal === undefined) {
        finalSubtotal = Number(plan.amount);
      }
    } else if (dto.subtotal === undefined) {
      throw new BadRequestException(
        'subtotal is required if fee_plan_id is not provided',
      );
    }

    const discount = dto.discount_amount || 0;
    const tax = dto.tax_amount || 0;
    const total = this.calculateTotal(finalSubtotal, discount, tax);

    if (total < 0) {
      throw new BadRequestException('Total amount cannot be negative');
    }

    const invoiceNumber = dto.invoice_number || this.generateInvoiceNumber();

    try {
      const invoice = await this.prisma.invoices.create({
        data: {
          library_id: libraryId,
          student_id: BigInt(dto.student_id),
          fee_plan_id: dto.fee_plan_id ? BigInt(dto.fee_plan_id) : null,
          invoice_number: invoiceNumber,
          due_date: dto.due_date ? new Date(dto.due_date) : null,
          description: dto.description || null,
          subtotal: finalSubtotal,
          discount_amount: discount,
          tax_amount: tax,
          total_amount: total,
          currency: dto.currency || 'INR',
          created_by: BigInt(user.id),
        },
      });
      return this.mapDecimalOutput(invoice);
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException(
          'Invoice number already exists in this library',
        );
      }
      throw error;
    }
  }

  async findAll(
    user: AuthenticatedUser,
    page = 1,
    limit = 50,
    studentId?: string,
    status?: string,
  ) {
    const libraryId = this.enforceTenantIsolation(user);
    const skip = (page - 1) * limit;

    const whereClause: any = { library_id: libraryId };
    if (studentId) whereClause.student_id = BigInt(studentId);
    if (status) whereClause.status = status;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.invoices.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.invoices.count({ where: whereClause }),
    ]);

    return {
      data: data.map((inv) => this.mapDecimalOutput(inv)),
      total,
    };
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const libraryId = this.enforceTenantIsolation(user);
    const invoice = await this.prisma.invoices.findFirst({
      where: { id: BigInt(id), library_id: libraryId },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return this.mapDecimalOutput(invoice);
  }

  async update(id: string, dto: UpdateInvoiceDto, user: AuthenticatedUser) {
    const libraryId = this.enforceTenantIsolation(user);
    const invoice = await this.prisma.invoices.findFirst({
      where: { id: BigInt(id), library_id: libraryId },
    });

    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status !== 'PENDING') {
      throw new BadRequestException('Only PENDING invoices can be updated');
    }

    let finalSubtotal =
      dto.subtotal !== undefined ? dto.subtotal : Number(invoice.subtotal);
    const finalDiscount =
      dto.discount_amount !== undefined
        ? dto.discount_amount
        : Number(invoice.discount_amount);
    const finalTax =
      dto.tax_amount !== undefined
        ? dto.tax_amount
        : Number(invoice.tax_amount);

    if (dto.fee_plan_id) {
      const plan = await this.prisma.fee_plans.findFirst({
        where: { id: BigInt(dto.fee_plan_id), library_id: libraryId },
      });
      if (!plan)
        throw new NotFoundException('Fee plan not found in this library');

      // If fee plan changed and subtotal was not explicitly provided in this update, update subtotal
      if (
        dto.subtotal === undefined &&
        BigInt(dto.fee_plan_id) !== invoice.fee_plan_id
      ) {
        finalSubtotal = Number(plan.amount);
      }
    }

    if (dto.student_id) {
      const student = await this.prisma.students.findFirst({
        where: { id: BigInt(dto.student_id), library_id: libraryId },
      });
      if (!student)
        throw new NotFoundException('Student not found in this library');
    }

    const total = this.calculateTotal(finalSubtotal, finalDiscount, finalTax);
    if (total < 0) {
      throw new BadRequestException('Total amount cannot be negative');
    }

    try {
      const updated = await this.prisma.invoices.update({
        where: { id: invoice.id },
        data: {
          student_id: dto.student_id ? BigInt(dto.student_id) : undefined,
          fee_plan_id: dto.fee_plan_id ? BigInt(dto.fee_plan_id) : undefined,
          invoice_number: dto.invoice_number,
          due_date: dto.due_date ? new Date(dto.due_date) : undefined,
          description: dto.description,
          subtotal: finalSubtotal,
          discount_amount: finalDiscount,
          tax_amount: finalTax,
          total_amount: total,
          currency: dto.currency,
          updated_by: BigInt(user.id),
          updated_at: new Date(),
        },
      });
      return this.mapDecimalOutput(updated);
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException(
          'Invoice number already exists in this library',
        );
      }
      throw error;
    }
  }

  async remove(id: string, user: AuthenticatedUser) {
    const libraryId = this.enforceTenantIsolation(user);
    const invoice = await this.prisma.invoices.findFirst({
      where: { id: BigInt(id), library_id: libraryId },
    });

    if (!invoice) throw new NotFoundException('Invoice not found');

    // Soft delete (cancel)
    const cancelled = await this.prisma.invoices.update({
      where: { id: invoice.id },
      data: {
        status: 'CANCELLED',
        updated_by: BigInt(user.id),
        updated_at: new Date(),
      },
    });
    return this.mapDecimalOutput(cancelled);
  }
}
