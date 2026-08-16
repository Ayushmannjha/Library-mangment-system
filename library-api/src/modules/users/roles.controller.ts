import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../database/prisma.service';

@ApiTags('Roles & Permissions')
@ApiBearerAuth()
@Controller()
export class RolesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('roles')
  @ApiOperation({ summary: 'Get all active roles' })
  async getRoles() {
    const rolesList = await this.prisma.roles.findMany({
      orderBy: { id: 'asc' },
    });

    const data = rolesList.map((r) => ({
      id: Number(r.id),
      code: r.code,
      name: r.name,
      description: r.description ?? undefined,
      is_system_role: Boolean(r.is_system_role),
    }));

    return {
      message: 'Roles retrieved successfully',
      data,
    };
  }

  @Get('permissions')
  @ApiOperation({ summary: 'Get all system permissions' })
  async getPermissions() {
    const permList = await this.prisma.permissions.findMany({
      orderBy: { id: 'asc' },
    });

    const data = permList.map((p) => ({
      id: Number(p.id),
      code: p.code,
      name: p.name,
      module: p.module,
      description: p.description ?? undefined,
    }));

    return {
      message: 'Permissions retrieved successfully',
      data,
    };
  }

  @Get('roles/:id/permissions')
  @ApiOperation({ summary: 'Get permissions assigned to a specific role' })
  async getRolePermissions(@Param('id', ParseIntPipe) id: number) {
    const rolePerms = await this.prisma.role_permissions.findMany({
      where: { role_id: BigInt(id) },
      include: { permissions: true },
    });

    const data = rolePerms.map((rp) => ({
      id: Number(rp.permissions.id),
      code: rp.permissions.code,
      name: rp.permissions.name,
      module: rp.permissions.module,
      description: rp.permissions.description ?? undefined,
    }));

    return {
      message: 'Role permissions retrieved successfully',
      data,
    };
  }

  @Put('roles/:id/permissions')
  @ApiOperation({ summary: 'Update permissions assigned to a specific role' })
  async updateRolePermissions(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { permission_ids: number[] },
  ) {
    const roleId = BigInt(id);
    const permissionIds = body.permission_ids ?? [];

    await this.prisma.$transaction(async (tx) => {
      // Clear existing
      await tx.role_permissions.deleteMany({
        where: { role_id: roleId },
      });

      // Insert new
      if (permissionIds.length > 0) {
        await tx.role_permissions.createMany({
          data: permissionIds.map((pid) => ({
            role_id: roleId,
            permission_id: BigInt(pid),
          })),
        });
      }
    });

    return {
      message: 'Role permissions updated successfully',
      data: { success: true },
    };
  }
}
