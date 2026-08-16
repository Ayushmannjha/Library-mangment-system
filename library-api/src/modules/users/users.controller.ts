import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Put,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { AssignRolesDto } from './dto/assign-roles.dto';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @RequirePermission('USER_CREATE')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new user (Staff/Librarian)' })
  async create(
    @Body() dto: CreateUserDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return {
      message: 'User created successfully',
      data: await this.usersService.create(dto, user),
    };
  }

  @Get()
  @RequirePermission('USER_VIEW')
  @ApiOperation({ summary: 'Get all users in the current library context' })
  async findAll(@CurrentUser() user: AuthenticatedUser) {
    const { data, total } = await this.usersService.findAll(user);
    return {
      message: 'Users retrieved successfully',
      data,
      meta: { total },
    };
  }

  @Get(':id')
  @RequirePermission('USER_VIEW')
  @ApiOperation({ summary: 'Get a specific user by ID' })
  @ApiParam({ name: 'id', description: 'Numeric user ID', example: 1 })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return {
      message: 'User retrieved successfully',
      data: await this.usersService.findOne(id, user),
    };
  }

  @Patch(':id')
  @RequirePermission('USER_UPDATE')
  @ApiOperation({ summary: 'Update user basic info' })
  @ApiParam({ name: 'id', description: 'Numeric user ID' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return {
      message: 'User updated successfully',
      data: await this.usersService.update(id, dto, user),
    };
  }

  @Patch(':id/status')
  @RequirePermission('USER_STATUS_UPDATE')
  @ApiOperation({ summary: 'Update user status (ACTIVE/INACTIVE)' })
  @ApiParam({ name: 'id', description: 'Numeric user ID' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return {
      message: 'User status updated successfully',
      data: await this.usersService.updateStatus(id, dto, user),
    };
  }

  @Put(':id/roles')
  @RequirePermission('USER_ROLE_ASSIGN')
  @ApiOperation({ summary: 'Assign roles to a user' })
  @ApiParam({ name: 'id', description: 'Numeric user ID' })
  async assignRoles(
    @Param('id') id: string,
    @Body() dto: AssignRolesDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return {
      message: 'User roles assigned successfully',
      data: await this.usersService.assignRoles(id, dto, user),
    };
  }
}
