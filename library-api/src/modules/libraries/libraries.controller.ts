import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CreateLibraryDto } from './dto/create-library.dto';
import { UpdateLibraryDto } from './dto/update-library.dto';
import { LibrariesService } from './libraries.service';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

/**
 * Thin controller — it only maps HTTP verb + route to a service call and
 * returns the envelope payload. All business logic lives in LibrariesService
 * (see AGENTS.md Part 2, rule 8 "Controller Rules").
 */
@ApiTags('Libraries')
@Controller('libraries')
export class LibrariesController {
  constructor(private readonly librariesService: LibrariesService) {}

  @Get()
  @RequirePermission('LIBRARY_VIEW')
  @ApiOperation({ summary: 'Get all libraries (Super Admin only)' })
  async findAll(@CurrentUser() user: AuthenticatedUser) {
    // meta.total lets the frontend render pagination later without changing
    // the response shape.
    const { data, total } = await this.librariesService.findAll(user);
    return {
      message: 'Libraries retrieved successfully',
      data,
      meta: { total },
    };
  }

  @Get(':id')
  @RequirePermission('LIBRARY_VIEW')
  @ApiOperation({ summary: 'Get a library by id' })
  @ApiParam({ name: 'id', description: 'Numeric library id', example: 1 })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return {
      message: 'Library retrieved successfully',
      data: await this.librariesService.findOne(id, user),
    };
  }

  @Post()
  @RequirePermission('LIBRARY_CREATE')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new library (Super Admin only)' })
  async create(
    @Body() dto: CreateLibraryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return {
      message: 'Library created successfully',
      data: await this.librariesService.create(dto, user),
    };
  }

  @Patch(':id')
  @RequirePermission('LIBRARY_UPDATE')
  @ApiOperation({ summary: 'Partially update a library' })
  @ApiParam({ name: 'id', description: 'Numeric library id', example: 1 })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateLibraryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return {
      message: 'Library updated successfully',
      data: await this.librariesService.update(id, dto, user),
    };
  }

  @Delete(':id')
  @RequirePermission('LIBRARY_STATUS_UPDATE')
  @ApiOperation({
    summary: 'Soft delete a library (sets status = INACTIVE, Super Admin only)',
  })
  @ApiParam({ name: 'id', description: 'Numeric library id', example: 1 })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return {
      message: 'Library deleted successfully',
      data: await this.librariesService.remove(id, user),
    };
  }
}
