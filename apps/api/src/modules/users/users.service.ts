import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { PermissionsService } from '../permissions/permissions.service';
import { AuditService } from '../audit/audit.service';
import { UserProfileDto } from './dto/user-profile.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { UserResponseDto, PaginatedUsersResponseDto } from './dto/user-response.dto';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Prisma } from '@prisma/client';
import * as argon2 from '@node-rs/argon2';
import * as crypto from 'crypto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionsService: PermissionsService,
    private readonly auditService: AuditService,
  ) {}

  private mapToUserResponseDto(u: any): UserResponseDto {
    const nameParts = (u.name || '').trim().split(/\s+/);
    const firstName = nameParts[0] || 'User';
    const lastName = nameParts.slice(1).join(' ') || '';

    let displayAlias = u.role?.name || 'BDE';
    if (u.role?.name === 'MANAGER') displayAlias = 'SALES_MANAGER';
    if (u.role?.name === 'BDE_SALES') displayAlias = 'BDE';

    let dataScope = 'Assigned Only';
    if (u.role?.name === 'ADMIN') dataScope = 'All Records';
    else if (u.role?.name === 'MANAGER') dataScope = 'Team Records';

    let teamName = 'Sales & Revenue Team';
    if (u.role?.name === 'ADMIN') teamName = 'Global / Leadership';
    else if (u.role?.name === 'MANAGER') teamName = 'Sales Management';
    else if (u.role?.name === 'MARKETING') teamName = 'Marketing & Growth';
    else if (u.role?.name === 'DELIVERY') teamName = 'Delivery & Implementation';

    return {
      id: u.id,
      organizationId: u.organizationId,
      roleId: u.roleId,
      name: u.name,
      firstName,
      lastName,
      email: u.email,
      phone: u.phone || undefined,
      status: u.status,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      role: {
        id: u.role?.id || u.roleId,
        name: u.role?.name || 'BDE_SALES',
        description: u.role?.description || undefined,
        displayAlias,
      },
      organization: {
        id: u.organization?.id || u.organizationId,
        name: u.organization?.name || 'DigiTechzo',
        slug: u.organization?.slug || 'digitechzo',
      },
      teamName,
      dataScope,
    };
  }

  private async resolveRole(roleId?: string, roleName?: string) {
    if (roleId) {
      return this.prisma.role.findUnique({ where: { id: roleId } });
    }

    if (roleName) {
      let canonicalName = roleName.trim().toUpperCase();
      if (canonicalName === 'SALES_MANAGER') canonicalName = 'MANAGER';
      if (canonicalName === 'BDE') canonicalName = 'BDE_SALES';

      return this.prisma.role.findUnique({ where: { name: canonicalName } });
    }

    // Default fallback to BDE_SALES only when neither roleId nor roleName was provided
    return this.prisma.role.findUnique({ where: { name: 'BDE_SALES' } });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        organization: true,
        role: true,
      },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        organization: true,
        role: true,
      },
    });
  }

  async getProfile(userId: string): Promise<UserProfileDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        organization: true,
        role: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID '${userId}' not found`);
    }

    const permissions = await this.permissionsService.findByRole(user.roleId);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      status: user.status,
      organization: {
        id: user.organization.id,
        name: user.organization.name,
        slug: user.organization.slug,
        status: user.organization.status,
      },
      role: {
        id: user.role.id,
        name: user.role.name,
        description: user.role.description || undefined,
      },
      permissions,
      createdAt: user.createdAt.toISOString(),
    };
  }

  async findAll(query: UserQueryDto, user: AuthenticatedUser): Promise<PaginatedUsersResponseDto> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(500, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      organizationId: user.organizationId,
    };

    if (query.status && query.status.toUpperCase() !== 'ALL') {
      where.status = query.status.toUpperCase();
    } else if (!query.status) {
      where.status = 'ACTIVE';
    }

    if (query.role) {
      let roleFilter = query.role.trim().toUpperCase();
      if (roleFilter === 'SALES_MANAGER') roleFilter = 'MANAGER';
      if (roleFilter === 'BDE') roleFilter = 'BDE_SALES';

      where.role = {
        name: roleFilter,
      };
    }

    if (query.search && query.search.trim()) {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' as Prisma.QueryMode } },
        { email: { contains: term, mode: 'insensitive' as Prisma.QueryMode } },
        { phone: { contains: term, mode: 'insensitive' as Prisma.QueryMode } },
      ];
    }

    const orderBy: Prisma.UserOrderByWithRelationInput = {};
    const sortField = query.sortBy || 'createdAt';
    const sortDirection = query.sortOrder || 'desc';
    orderBy[sortField] = sortDirection;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          organization: true,
          role: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users.map((u) => this.mapToUserResponseDto(u)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async findScopedById(id: string, user: AuthenticatedUser): Promise<UserResponseDto> {
    const member = await this.prisma.user.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
      },
      include: {
        organization: true,
        role: true,
      },
    });

    if (!member) {
      throw new NotFoundException(`User with ID '${id}' not found in this organization`);
    }

    return this.mapToUserResponseDto(member);
  }

  async create(dto: CreateUserDto, user: AuthenticatedUser): Promise<UserResponseDto> {
    const email = dto.email.trim().toLowerCase();

    // Check duplicate email
    const existing = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existing) {
      throw new ConflictException(`A user account with email '${email}' already exists`);
    }

    // Resolve Role
    const role = await this.resolveRole(dto.roleId, dto.role);
    if (!role) {
      throw new BadRequestException('Invalid or nonexistent role specified');
    }

    // Non-admin cannot create ADMIN user
    if (user.role !== 'ADMIN' && role.name === 'ADMIN') {
      throw new ForbiddenException('Only administrators can assign the ADMIN role');
    }

    // Determine Name
    let name = (dto.name || '').trim();
    if (!name && (dto.firstName || dto.lastName)) {
      name = `${dto.firstName || ''} ${dto.lastName || ''}`.trim();
    }
    if (!name) {
      name = email.split('@')[0];
    }

    // Generate / hash password
    const rawPassword = dto.password || `${crypto.randomBytes(8).toString('hex')}A1!`;
    const passwordHash = await argon2.hash(rawPassword);

    const newUser = await this.prisma.user.create({
      data: {
        organizationId: user.organizationId,
        roleId: role.id,
        name,
        email,
        phone: dto.phone || null,
        passwordHash,
        status: dto.status ? dto.status.toUpperCase() : 'ACTIVE',
      },
      include: {
        organization: true,
        role: true,
      },
    });

    await this.auditService.record({
      organizationId: user.organizationId,
      userId: user.userId,
      action: 'USER_CREATED',
      resource: 'users',
      resourceId: newUser.id,
      details: {
        name: newUser.name,
        email: newUser.email,
        role: role.name,
      },
    });

    return this.mapToUserResponseDto(newUser);
  }

  async update(id: string, dto: UpdateUserDto, user: AuthenticatedUser): Promise<UserResponseDto> {
    const existing = await this.prisma.user.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
      },
    });
    if (!existing) {
      throw new NotFoundException(`User with ID '${id}' not found in this organization`);
    }

    const updateData: Prisma.UserUpdateInput = {};

    // Name update
    if (dto.name !== undefined) {
      updateData.name = dto.name.trim();
    } else if (dto.firstName !== undefined || dto.lastName !== undefined) {
      updateData.name = `${dto.firstName || ''} ${dto.lastName || ''}`.trim();
    }

    // Email update
    if (dto.email !== undefined) {
      const email = dto.email.trim().toLowerCase();
      if (email !== existing.email) {
        const duplicate = await this.prisma.user.findUnique({ where: { email } });
        if (duplicate) {
          throw new ConflictException(`A user with email '${email}' already exists`);
        }
        updateData.email = email;
      }
    }

    // Phone update
    if (dto.phone !== undefined) {
      updateData.phone = dto.phone;
    }

    // Status update
    if (dto.status !== undefined) {
      updateData.status = dto.status.toUpperCase();
    }

    // Role update
    if (dto.roleId !== undefined || dto.role !== undefined) {
      const role = await this.resolveRole(dto.roleId, dto.role);
      if (!role) {
        throw new BadRequestException('Invalid or nonexistent role specified');
      }

      if (user.role !== 'ADMIN' && role.name === 'ADMIN') {
        throw new ForbiddenException('Only administrators can assign the ADMIN role');
      }

      updateData.role = { connect: { id: role.id } };
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        organization: true,
        role: true,
      },
    });

    await this.auditService.record({
      organizationId: user.organizationId,
      userId: user.userId,
      action: 'USER_UPDATED',
      resource: 'users',
      resourceId: updated.id,
      details: {
        updatedFields: Object.keys(updateData),
      },
    });

    return this.mapToUserResponseDto(updated);
  }

  async remove(id: string, user: AuthenticatedUser): Promise<{ message: string }> {
    const existing = await this.prisma.user.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
      },
    });
    if (!existing) {
      throw new NotFoundException(`User with ID '${id}' not found in this organization`);
    }

    if (existing.id === user.userId) {
      throw new BadRequestException('Cannot delete your own account');
    }

    try {
      await this.prisma.user.delete({
        where: { id },
      });
    } catch {
      await this.prisma.user.update({
        where: { id },
        data: { status: 'INACTIVE' },
      });
    }

    await this.auditService.record({
      organizationId: user.organizationId,
      userId: user.userId,
      action: 'USER_DELETED',
      resource: 'users',
      resourceId: id,
      details: {
        email: existing.email,
        name: existing.name,
      },
    });

    return { message: 'User account deleted successfully' };
  }
}
