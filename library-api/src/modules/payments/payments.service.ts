import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  private enforceTenantIsolation(user: AuthenticatedUser) {
    if (!user.library_id) {
      throw new ForbiddenException('Admin user is missing a library context');
    }
    return user.library_id;
  }

  private generatePaymentNumber(): string {
    const timestamp = Date.now();
    const random = Math.floor(1000 + Math.random() * 9000);
    return `PAY-${timestamp}-${random}`;
  }

  private mapDecimalOutput(payment: any) {
    return {
      ...payment,
      amount: Number(payment.amount),
    };
  }

  async create(dto: CreatePaymentDto, user: AuthenticatedUser) {
    const libraryId = this.enforceTenantIsolation(user);

    // Validate invoice
    const invoice = await this.prisma.invoices.findFirst({
      where: { id: BigInt(dto.invoice_id), library_id: libraryId },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');

    if (invoice.status === 'PAID') {
      throw new BadRequestException('Invoice is already paid');
    }
    if (invoice.status === 'CANCELLED') {
      throw new BadRequestException('Cannot pay a cancelled invoice');
    }

    const invoiceTotal = Number(invoice.total_amount);
    if (dto.amount !== invoiceTotal) {
      throw new BadRequestException(
        `Payment amount (${dto.amount}) does not match invoice total (${invoiceTotal}). Partial payments are not allowed.`,
      );
    }

    const paymentNumber = this.generatePaymentNumber();

    try {
      const payment = await this.prisma.$transaction(async (tx) => {
        const newPayment = await tx.payments.create({
          data: {
            library_id: libraryId,
            invoice_id: invoice.id,
            student_id: invoice.student_id,
            payment_number: paymentNumber,
            amount: dto.amount,
            payment_method: dto.payment_method,
            transaction_reference: dto.transaction_reference || null,
            notes: dto.notes || null,
            currency: dto.currency || 'INR',
            created_by: BigInt(user.id),
          },
        });

        await tx.invoices.update({
          where: { id: invoice.id },
          data: {
            status: 'PAID',
            updated_by: BigInt(user.id),
            updated_at: new Date(),
          },
        });

        return newPayment;
      });

      return this.mapDecimalOutput(payment);
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException(
          'Transaction reference already exists in this library',
        );
      }
      throw error;
    }
  }

  async findAll(
    user: AuthenticatedUser,
    page = 1,
    limit = 50,
    invoiceId?: string,
    studentId?: string,
    status?: string,
  ) {
    const libraryId = this.enforceTenantIsolation(user);
    const skip = (page - 1) * limit;

    const whereClause: any = { library_id: libraryId };
    if (invoiceId) whereClause.invoice_id = BigInt(invoiceId);
    if (studentId) whereClause.student_id = BigInt(studentId);
    if (status) whereClause.status = status;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.payments.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { payment_date: 'desc' },
      }),
      this.prisma.payments.count({ where: whereClause }),
    ]);

    return {
      data: data.map((p) => this.mapDecimalOutput(p)),
      total,
    };
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const libraryId = this.enforceTenantIsolation(user);
    const payment = await this.prisma.payments.findFirst({
      where: { id: BigInt(id), library_id: libraryId },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    return this.mapDecimalOutput(payment);
  }

  async refund(id: string, user: AuthenticatedUser) {
    const libraryId = this.enforceTenantIsolation(user);

    const payment = await this.prisma.payments.findFirst({
      where: { id: BigInt(id), library_id: libraryId },
    });

    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status === 'REFUNDED') {
      throw new BadRequestException('Payment is already refunded');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const refundedPayment = await tx.payments.update({
        where: { id: payment.id },
        data: {
          status: 'REFUNDED',
          updated_by: BigInt(user.id),
          updated_at: new Date(),
        },
      });

      // Update invoice back to PENDING if we refund the payment
      // (Assuming 1-to-1 invoice to payment for this phase)
      await tx.invoices.update({
        where: { id: payment.invoice_id },
        data: {
          status: 'PENDING',
          updated_by: BigInt(user.id),
          updated_at: new Date(),
        },
      });

      return refundedPayment;
    });

    return this.mapDecimalOutput(result);
  }
}
