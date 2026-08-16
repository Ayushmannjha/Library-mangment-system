import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { UpdateStudentStatusDto } from './dto/update-student-status.dto';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@ApiTags('Students')
@ApiBearerAuth()
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  @RequirePermission('STUDENT_CREATE')
  @ApiOperation({ summary: 'Create a new student' })
  async create(
    @Body() dto: CreateStudentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return {
      message: 'Student created successfully',
      data: await this.studentsService.create(dto, user),
    };
  }

  @Get()
  @RequirePermission('STUDENT_VIEW')
  @ApiOperation({ summary: 'Get all students (paginated & searchable)' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('search') search?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    const p = Math.max(1, Number(page));
    const l = Math.max(1, Number(limit));

    const { data, total } = await this.studentsService.findAll(
      user,
      search,
      p,
      l,
    );
    return {
      message: 'Students retrieved successfully',
      data,
      meta: { total, page: p, limit: l },
    };
  }

  @Get(':id')
  @RequirePermission('STUDENT_VIEW')
  @ApiOperation({ summary: 'Get a student by ID' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return {
      message: 'Student retrieved successfully',
      data: await this.studentsService.findOne(id, user),
    };
  }

  @Patch(':id')
  @RequirePermission('STUDENT_UPDATE')
  @ApiOperation({ summary: 'Update a student' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateStudentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return {
      message: 'Student updated successfully',
      data: await this.studentsService.update(id, dto, user),
    };
  }

  @Patch(':id/status')
  @RequirePermission('STUDENT_STATUS_UPDATE')
  @ApiOperation({ summary: 'Update student status (ACTIVE/INACTIVE)' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateStudentStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return {
      message: 'Student status updated successfully',
      data: await this.studentsService.updateStatus(id, dto, user),
    };
  }

  @Post(':id/documents')
  @RequirePermission('STUDENT_DOCUMENT_MANAGE')
  @UseInterceptors(FileInterceptor('file', { dest: './uploads' }))
  @ApiOperation({ summary: 'Upload a document for a student' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        document_type: { type: 'string', example: 'ID_PROOF' },
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  async uploadDocument(
    @Param('id') id: string,
    @Body('document_type') documentType: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    if (!documentType) {
      throw new BadRequestException('document_type is required');
    }

    // In a real app, upload to S3. For this stub, we use local path.
    const fileUrl = `/uploads/${file.filename}`;

    return {
      message: 'Document uploaded successfully',
      data: await this.studentsService.addDocument(
        id,
        documentType,
        fileUrl,
        file.originalname,
        file.mimetype,
        file.size,
        user,
      ),
    };
  }
}
