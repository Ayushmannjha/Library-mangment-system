import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { PrismaService } from '../../database/prisma.service';
import { Prisma, students } from '../../../generated/prisma/client';
import { MailService } from '../../common/mail/mail.service';
import { generateRandomPassword } from '../../common/utils/password.util';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { UpdateStudentStatusDto } from './dto/update-student-status.dto';

@Injectable()
export class StudentsService {
  private readonly logger = new Logger(StudentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly config: ConfigService,
  ) {}

  private enforceTenantIsolation(user: AuthenticatedUser) {
    if (!user.library_id) {
      throw new ForbiddenException('Admin user is missing a library context');
    }
    return user.library_id;
  }

  async create(dto: CreateStudentDto, user: AuthenticatedUser) {
    const libraryId = this.enforceTenantIsolation(user);
    const dob = dto.date_of_birth ? new Date(dto.date_of_birth) : null;

    try {
      const student = await this.prisma.$transaction(async (tx) => {
        const created = await tx.students.create({
          data: {
            library_id: libraryId,
            admission_number: dto.admission_number,
            first_name: dto.first_name,
            last_name: dto.last_name,
            gender: dto.gender,
            date_of_birth: dob,
            email: dto.email,
            phone: dto.phone,
            alternate_phone: dto.alternate_phone,
            address: dto.address,
            city: dto.city,
            state: dto.state,
            pincode: dto.pincode,
            notes: dto.notes,
            status: 'ACTIVE',
            created_by: BigInt(user.id),
          },
        });

        // Auto-create the student login (and email its credentials) when the
        // student has an email address — the generated password is temporary.
        if (created.email) {
          await this.ensureStudentLogin(tx, created);
        }

        return created;
      });

      return student;
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException(
          'Admission number already exists in this library',
        );
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateStudentDto, user: AuthenticatedUser) {
    const student = await this.findOne(id, user); // Verify exists & tenant boundaries
    const dob = dto.date_of_birth ? new Date(dto.date_of_birth) : undefined;

    // Omit fields we manually override or don't want to pass blindly
    const { date_of_birth, ...rest } = dto;

    const dataToUpdate: any = { ...rest, updated_by: BigInt(user.id) };
    if (dob !== undefined) dataToUpdate.date_of_birth = dob;

    const updated = await this.prisma.students.update({
      where: { id: BigInt(id) },
      data: dataToUpdate,
    });

    // If an email was added for a student who previously had no linked login,
    // backfill their login now.
    const updatedEmail = updated.email ?? student.email;
    if (updatedEmail) {
      const linked = await this.prisma.users.findFirst({
        where: { student_id: student.id },
      });
      if (!linked) {
        await this.ensureStudentLogin(this.prisma, {
          ...student,
          ...updated,
        });
      }
    }

    return updated;
  }

  /**
   * Creates the users row that lets a student log in, links it to the student
   * record via users.student_id, assigns the tenant-scoped STUDENT role, and
   * emails the generated credentials.
   *
   * Runs inside the caller's transaction (`tx`). Email dispatch happens AFTER
   * the transaction commits in `create()` / `update()` so a failed SMTP call
   * cannot roll back the admission.
   */
  private async ensureStudentLogin(
    tx: Prisma.TransactionClient,
    student: students,
  ) {
    if (!student.email) return;

    // Reject if the email already belongs to another account.
    const existing = await tx.users.findFirst({
      where: { email: student.email },
    });
    if (existing) {
      throw new ConflictException(
        'A login already exists for this email. Use a different email for the student login.',
      );
    }

    // Find or create a tenant-scoped STUDENT role.
    let studentRole = await tx.roles.findFirst({
      where: { code: 'STUDENT', library_id: student.library_id },
    });
    if (!studentRole) {
      studentRole = await tx.roles.create({
        data: {
          code: 'STUDENT',
          name: 'Student',
          library_id: student.library_id,
          is_system_role: true,
          status: 'ACTIVE',
        },
      });
      // Grant the self-service portal permissions to the freshly-created role.
      const perms = await tx.permissions.findMany({
        where: { code: { in: ['STUDENT_SELF_VIEW', 'STUDENT_SELF_CHECKIN'] } },
      });
      if (perms.length > 0) {
        const roleId = studentRole.id;
        await tx.role_permissions.createMany({
          data: perms.map((p) => ({
            role_id: roleId,
            permission_id: p.id,
          })),
        });
      }
    }

    const generatedPassword = generateRandomPassword();
    const passwordHash = await argon2.hash(generatedPassword);

    const user = await tx.users.create({
      data: {
        library_id: student.library_id,
        student_id: student.id,
        first_name: student.first_name,
        last_name: student.last_name ?? null,
        email: student.email,
        phone: student.phone ?? null,
        password_hash: passwordHash,
        status: 'ACTIVE',
      },
    });

    await tx.user_roles.create({
      data: { user_id: user.id, role_id: studentRole.id },
    });

    // Best-effort email (fire-and-forget, never throws into the caller).
    void this.mailService
      .sendStudentCredentials({
        to: student.email,
        studentName: `${student.first_name} ${student.last_name ?? ''}`.trim(),
        admissionNumber: student.admission_number,
        portalUrl:
          this.config.get<string>('STUDENT_PORTAL_URL') ??
          'http://localhost:4201',
        loginEmail: student.email,
        password: generatedPassword,
      })
      .catch((err) =>
        this.logger.error(
          `sendStudentCredentials failed: ${
            err instanceof Error ? err.message : String(err)
          }`,
        ),
      );

    this.logger.log(
      `Created student login for ${student.email} (student #${student.id}).`,
    );
  }

  async findAll(
    user: AuthenticatedUser,
    search?: string,
    page = 1,
    limit = 10,
  ) {
    const libraryId = this.enforceTenantIsolation(user);
    const skip = (page - 1) * limit;

    const whereClause: any = { library_id: libraryId };

    if (search) {
      whereClause.OR = [
        { first_name: { contains: search, mode: 'insensitive' } },
        { last_name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { admission_number: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [students, total] = await this.prisma.$transaction([
      this.prisma.students.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { id: 'desc' },
      }),
      this.prisma.students.count({ where: whereClause }),
    ]);

    return { data: students, total };
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const libraryId = this.enforceTenantIsolation(user);
    const student = await this.prisma.students.findFirst({
      where: { id: BigInt(id), library_id: libraryId },
      include: {
        student_documents: true, // Fetch documents with student
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }
    return student;
  }

  async updateStatus(
    id: string,
    dto: UpdateStudentStatusDto,
    user: AuthenticatedUser,
  ) {
    await this.findOne(id, user);
    return this.prisma.students.update({
      where: { id: BigInt(id) },
      data: {
        status: dto.status,
        updated_by: BigInt(user.id),
      },
    });
  }

  async addDocument(
    id: string,
    documentType: string,
    fileUrl: string,
    fileName: string,
    mimeType: string,
    fileSize: number,
    user: AuthenticatedUser,
  ) {
    const student = await this.findOne(id, user); // Tenant check

    return this.prisma.student_documents.create({
      data: {
        student_id: student.id,
        document_type: documentType,
        file_url: fileUrl,
        file_name: fileName,
        mime_type: mimeType,
        file_size: BigInt(fileSize),
        status: 'ACTIVE',
        uploaded_by: BigInt(user.id),
      },
    });
  }
}
