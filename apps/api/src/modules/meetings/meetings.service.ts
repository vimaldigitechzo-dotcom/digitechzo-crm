import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { CreateMeetingDto, MeetingStatusEnum } from './dto/create-meeting.dto';
import { UpdateMeetingDto } from './dto/update-meeting.dto';
import { CompleteMeetingDto } from './dto/complete-meeting.dto';
import { CancelMeetingDto } from './dto/cancel-meeting.dto';
import { AssignMeetingDto } from './dto/assign-meeting.dto';
import { MeetingQueryDto } from './dto/meeting-query.dto';
import { MeetingResponseDto, PaginatedMeetingsResponseDto } from './dto/meeting-response.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class MeetingsService {
  private readonly logger = new Logger(MeetingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private mapToResponseDto(m: any): MeetingResponseDto {
    return {
      id: m.id,
      organizationId: m.organizationId,
      leadId: m.leadId,
      dealId: m.dealId,
      title: m.title,
      description: m.description,
      meetingType: m.meetingType,
      startTime: m.startTime,
      endTime: m.endTime,
      location: m.location,
      ownerId: m.ownerId,
      creatorId: m.creatorId,
      status: m.status,
      outcome: m.outcome,
      notes: m.notes,
      completedAt: m.completedAt,
      cancelledAt: m.cancelledAt,
      cancelReason: m.cancelReason,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
      owner: m.owner
        ? { id: m.owner.id, name: m.owner.name, email: m.owner.email }
        : undefined,
      creator: m.creator
        ? { id: m.creator.id, name: m.creator.name, email: m.creator.email }
        : undefined,
      lead: m.lead
        ? { id: m.lead.id, fullName: m.lead.fullName, companyName: m.lead.companyName, phone: m.lead.phone }
        : undefined,
      deal: m.deal
        ? { id: m.deal.id, title: m.deal.title }
        : undefined,
    };
  }

  async findAll(
    query: MeetingQueryDto,
    user: AuthenticatedUser,
  ): Promise<PaginatedMeetingsResponseDto> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.MeetingWhereInput = {
      organizationId: user.organizationId,
      deletedAt: null,
    };

    if (user.role === 'BDE_SALES') {
      where.OR = [
        { ownerId: user.userId },
        { creatorId: user.userId },
      ];
    } else if (query.ownerId) {
      where.ownerId = query.ownerId;
    }

    if (query.status) where.status = query.status;
    if (query.meetingType) where.meetingType = query.meetingType;
    if (query.leadId) where.leadId = query.leadId;
    if (query.dealId) where.dealId = query.dealId;

    if (query.upcoming) {
      where.startTime = { gte: new Date() };
      where.status = MeetingStatusEnum.SCHEDULED;
    }

    if (query.overdue) {
      where.startTime = { lt: new Date() };
      where.status = MeetingStatusEnum.SCHEDULED;
    }

    if (query.startDate || query.endDate) {
      where.startTime = {
        ...(where.startTime && typeof where.startTime === 'object' ? where.startTime : {}),
        ...(query.startDate ? { gte: new Date(query.startDate) } : {}),
        ...(query.endDate ? { lte: new Date(query.endDate) } : {}),
      };
    }

    if (query.search && query.search.trim()) {
      const term = query.search.trim();
      const searchCondition = [
        { title: { contains: term, mode: 'insensitive' as Prisma.QueryMode } },
        { description: { contains: term, mode: 'insensitive' as Prisma.QueryMode } },
      ];

      if (where.OR) {
        where.AND = [{ OR: searchCondition }];
      } else {
        where.OR = searchCondition;
      }
    }

    const orderBy: Prisma.MeetingOrderByWithRelationInput = {};
    const sortField = query.sortBy || 'startTime';
    const sortDirection = query.sortOrder || 'asc';
    orderBy[sortField] = sortDirection;

    const [meetings, total] = await Promise.all([
      this.prisma.meeting.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          owner: { select: { id: true, name: true, email: true } },
          creator: { select: { id: true, name: true, email: true } },
          lead: { select: { id: true, fullName: true, companyName: true, phone: true } },
          deal: { select: { id: true, title: true } },
        },
      }),
      this.prisma.meeting.count({ where }),
    ]);

    return {
      data: meetings.map((m) => this.mapToResponseDto(m)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async findById(id: string, user: AuthenticatedUser): Promise<MeetingResponseDto> {
    const meeting = await this.prisma.meeting.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
        deletedAt: null,
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true, email: true } },
        lead: { select: { id: true, fullName: true, companyName: true, phone: true } },
        deal: { select: { id: true, title: true } },
      },
    });

    if (!meeting) {
      throw new NotFoundException(`Meeting with ID ${id} not found`);
    }

    if (
      user.role === 'BDE_SALES' &&
      meeting.ownerId !== user.userId &&
      meeting.creatorId !== user.userId
    ) {
      throw new ForbiddenException('You do not have permission to view this meeting');
    }

    return this.mapToResponseDto(meeting);
  }

  async create(dto: CreateMeetingDto, user: AuthenticatedUser): Promise<MeetingResponseDto> {
    if (new Date(dto.endTime) <= new Date(dto.startTime)) {
      throw new BadRequestException('Meeting endTime must be after startTime');
    }

    // Verify mandatory originating lead
    const lead = await this.prisma.lead.findFirst({
      where: { id: dto.leadId, organizationId: user.organizationId, deletedAt: null },
    });
    if (!lead) throw new BadRequestException(`Associated lead ${dto.leadId} not found in this organization`);

    if (dto.dealId) {
      const deal = await this.prisma.deal.findFirst({
        where: { id: dto.dealId, organizationId: user.organizationId, deletedAt: null },
      });
      if (!deal) throw new BadRequestException(`Deal ${dto.dealId} not found`);
    }

    let targetOwnerId = user.userId;
    if (dto.ownerId) {
      if (user.role === 'BDE_SALES' && dto.ownerId !== user.userId) {
        throw new ForbiddenException('BDE sales representatives can only host meetings for themselves');
      }
      const hostUser = await this.prisma.user.findFirst({
        where: { id: dto.ownerId, organizationId: user.organizationId, status: 'ACTIVE' },
      });
      if (!hostUser) throw new BadRequestException('Target meeting host user not found or inactive');
      targetOwnerId = dto.ownerId;
    }

    const meeting = await this.prisma.meeting.create({
      data: {
        organizationId: user.organizationId,
        ownerId: targetOwnerId,
        creatorId: user.userId,
        leadId: dto.leadId,
        dealId: dto.dealId || null,
        title: dto.title,
        description: dto.description || null,
        meetingType: dto.meetingType,
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
        location: dto.location || null,
        status: MeetingStatusEnum.SCHEDULED,
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true, email: true } },
        lead: { select: { id: true, fullName: true, companyName: true, phone: true } },
        deal: { select: { id: true, title: true } },
      },
    });

    await this.prisma.lead.update({
      where: { id: dto.leadId },
      data: { lastActivityAt: new Date() },
    });

    // Auto-advance Stage 1 or Stage 2 Deal to Stage 3 (Demo / Meeting Completed)
    try {
      const targetLeadId = dto.leadId;
      const targetDealId = dto.dealId;
      if (targetLeadId || targetDealId) {
        const whereClause: any = {
          organizationId: user.organizationId,
          deletedAt: null,
          status: 'OPEN',
        };
        if (targetDealId) {
          whereClause.id = targetDealId;
        } else if (targetLeadId) {
          whereClause.leadId = targetLeadId;
        }

        const activeDeal: any = await this.prisma.deal.findFirst({
          where: whereClause,
          include: { stage: true },
        });

        if (activeDeal && activeDeal.stage?.order < 3) {
          const stage3 = await this.prisma.pipelineStage.findFirst({
            where: { order: 3 },
          });
          if (stage3) {
            await this.prisma.deal.update({
              where: { id: activeDeal.id },
              data: { stageId: stage3.id },
            });
            await this.auditService.record({
              organizationId: user.organizationId,
              userId: user.userId,
              action: 'DEAL_STAGE_CHANGED',
              resource: 'deals',
              resourceId: activeDeal.id,
              details: {
                previousStageId: activeDeal.stageId,
                newStageId: stage3.id,
                reason: 'Auto-advanced to Demo / Meeting stage upon scheduling session',
              },
            });
          }
        }
      }
    } catch (e: any) {
      this.logger.warn(`Failed to auto-advance deal on meeting create: ${e.message}`);
    }

    await this.auditService.record({
      organizationId: user.organizationId,
      userId: user.userId,
      action: 'MEETING_SCHEDULED',
      resource: 'meetings',
      resourceId: meeting.id,
      details: {
        title: meeting.title,
        meetingType: meeting.meetingType,
        startTime: meeting.startTime,
        endTime: meeting.endTime,
        ownerId: meeting.ownerId,
        leadId: meeting.leadId,
        dealId: meeting.dealId,
      },
    });

    return this.mapToResponseDto(meeting);
  }

  async update(id: string, dto: UpdateMeetingDto, user: AuthenticatedUser): Promise<MeetingResponseDto> {
    const existing = await this.prisma.meeting.findFirst({
      where: { id, organizationId: user.organizationId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException(`Meeting ${id} not found`);

    if (
      user.role === 'BDE_SALES' &&
      existing.ownerId !== user.userId &&
      existing.creatorId !== user.userId
    ) {
      throw new ForbiddenException('You do not have permission to edit this meeting');
    }

    const startTime = dto.startTime ? new Date(dto.startTime) : existing.startTime;
    const endTime = dto.endTime ? new Date(dto.endTime) : existing.endTime;
    if (endTime <= startTime) {
      throw new BadRequestException('Meeting endTime must be after startTime');
    }

    if (dto.leadId) {
      const lead = await this.prisma.lead.findFirst({
        where: { id: dto.leadId, organizationId: user.organizationId, deletedAt: null },
      });
      if (!lead) throw new BadRequestException(`Lead ${dto.leadId} not found`);
    }

    if (dto.dealId) {
      const deal = await this.prisma.deal.findFirst({
        where: { id: dto.dealId, organizationId: user.organizationId, deletedAt: null },
      });
      if (!deal) throw new BadRequestException(`Deal ${dto.dealId} not found`);
    }

    const updateData: Prisma.MeetingUpdateInput = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.meetingType !== undefined) updateData.meetingType = dto.meetingType;
    if (dto.startTime !== undefined) updateData.startTime = new Date(dto.startTime);
    if (dto.endTime !== undefined) updateData.endTime = new Date(dto.endTime);
    if (dto.location !== undefined) updateData.location = dto.location;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.outcome !== undefined) updateData.outcome = dto.outcome;
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.leadId !== undefined) {
      updateData.lead = { connect: { id: dto.leadId } };
    }
    if (dto.dealId !== undefined) {
      updateData.deal = dto.dealId ? { connect: { id: dto.dealId } } : { disconnect: true };
    }

    const updated = await this.prisma.meeting.update({
      where: { id },
      data: updateData,
      include: {
        owner: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true, email: true } },
        lead: { select: { id: true, fullName: true, companyName: true, phone: true } },
        deal: { select: { id: true, title: true } },
      },
    });

    await this.auditService.record({
      organizationId: user.organizationId,
      userId: user.userId,
      action: 'MEETING_UPDATED',
      resource: 'meetings',
      resourceId: updated.id,
      details: { title: updated.title, status: updated.status },
    });

    return this.mapToResponseDto(updated);
  }

  async complete(id: string, dto: CompleteMeetingDto, user: AuthenticatedUser): Promise<MeetingResponseDto> {
    const existing = await this.prisma.meeting.findFirst({
      where: { id, organizationId: user.organizationId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException(`Meeting ${id} not found`);

    if (
      user.role === 'BDE_SALES' &&
      existing.ownerId !== user.userId &&
      existing.creatorId !== user.userId
    ) {
      throw new ForbiddenException('You do not have permission to complete this meeting');
    }

    const completedAt = new Date();
    const updated = await this.prisma.meeting.update({
      where: { id },
      data: {
        status: MeetingStatusEnum.COMPLETED,
        completedAt,
        outcome: dto.outcome || existing.outcome,
        notes: dto.notes ? `${existing.notes ? existing.notes + '\n\n' : ''}${dto.notes}` : existing.notes,
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true, email: true } },
        lead: { select: { id: true, fullName: true, companyName: true, phone: true } },
        deal: { select: { id: true, title: true } },
      },
    });

    if (dto.createActivity !== false) {
      await this.prisma.activity.create({
        data: {
          organizationId: user.organizationId,
          userId: user.userId,
          meetingId: existing.id,
          leadId: existing.leadId,
          dealId: existing.dealId,
          activityType: 'MEETING',
          subject: `Meeting Completed: ${existing.title}`,
          description: dto.notes || `Completed ${existing.meetingType} on ${completedAt.toISOString()}`,
          outcome: dto.outcome || 'COMPLETED',
          activityDate: completedAt,
        },
      });

      if (existing.leadId) {
        await this.prisma.lead.update({
          where: { id: existing.leadId },
          data: { lastActivityAt: completedAt, status: 'QUALIFIED' },
        });
      }
    }

    // Auto-advance Stage 1 or Stage 2 Deal to Stage 3 (Demo / Meeting Completed)
    try {
      const targetLeadId = existing.leadId;
      const targetDealId = existing.dealId;
      if (targetLeadId || targetDealId) {
        const whereClause: any = {
          organizationId: user.organizationId,
          deletedAt: null,
          status: 'OPEN',
        };
        if (targetDealId) {
          whereClause.id = targetDealId;
        } else if (targetLeadId) {
          whereClause.leadId = targetLeadId;
        }

        const activeDeal: any = await this.prisma.deal.findFirst({
          where: whereClause,
          include: { stage: true },
        });

        if (activeDeal && activeDeal.stage?.order < 3) {
          const stage3 = await this.prisma.pipelineStage.findFirst({
            where: { order: 3 },
          });
          if (stage3) {
            await this.prisma.deal.update({
              where: { id: activeDeal.id },
              data: { stageId: stage3.id },
            });
            await this.auditService.record({
              organizationId: user.organizationId,
              userId: user.userId,
              action: 'DEAL_STAGE_CHANGED',
              resource: 'deals',
              resourceId: activeDeal.id,
              details: {
                previousStageId: activeDeal.stageId,
                newStageId: stage3.id,
                reason: 'Auto-advanced to Demo / Meeting Completed upon session completion',
              },
            });
          }
        }
      }
    } catch (e: any) {
      this.logger.warn(`Failed to auto-advance deal on meeting complete: ${e.message}`);
    }

    await this.auditService.record({
      organizationId: user.organizationId,
      userId: user.userId,
      action: 'MEETING_COMPLETED',
      resource: 'meetings',
      resourceId: updated.id,
      details: { outcome: dto.outcome },
    });

    return this.mapToResponseDto(updated);
  }

  async cancel(id: string, dto: CancelMeetingDto, user: AuthenticatedUser): Promise<MeetingResponseDto> {
    const existing = await this.prisma.meeting.findFirst({
      where: { id, organizationId: user.organizationId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException(`Meeting ${id} not found`);

    if (
      user.role === 'BDE_SALES' &&
      existing.ownerId !== user.userId &&
      existing.creatorId !== user.userId
    ) {
      throw new ForbiddenException('You do not have permission to cancel this meeting');
    }

    const cancelledAt = new Date();
    const updated = await this.prisma.meeting.update({
      where: { id },
      data: {
        status: MeetingStatusEnum.CANCELLED,
        cancelledAt,
        cancelReason: dto.cancelReason,
        notes: dto.notes ? `${existing.notes ? existing.notes + '\n\n' : ''}${dto.notes}` : existing.notes,
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true, email: true } },
        lead: { select: { id: true, fullName: true, companyName: true, phone: true } },
        deal: { select: { id: true, title: true } },
      },
    });

    await this.prisma.activity.create({
      data: {
        organizationId: user.organizationId,
        userId: user.userId,
        meetingId: existing.id,
        leadId: existing.leadId,
        dealId: existing.dealId,
        activityType: 'MEETING',
        subject: `Meeting Cancelled: ${existing.title}`,
        description: `Reason: ${dto.cancelReason}${dto.notes ? '\nNotes: ' + dto.notes : ''}`,
        outcome: 'CANCELLED',
        activityDate: cancelledAt,
      },
    });

    await this.auditService.record({
      organizationId: user.organizationId,
      userId: user.userId,
      action: 'MEETING_CANCELLED',
      resource: 'meetings',
      resourceId: updated.id,
      details: { cancelReason: dto.cancelReason },
    });

    return this.mapToResponseDto(updated);
  }

  async markNoShow(id: string, user: AuthenticatedUser): Promise<MeetingResponseDto> {
    const existing = await this.prisma.meeting.findFirst({
      where: { id, organizationId: user.organizationId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException(`Meeting ${id} not found`);

    if (
      user.role === 'BDE_SALES' &&
      existing.ownerId !== user.userId &&
      existing.creatorId !== user.userId
    ) {
      throw new ForbiddenException('You do not have permission to update this meeting');
    }

    const updated = await this.prisma.meeting.update({
      where: { id },
      data: {
        status: MeetingStatusEnum.NO_SHOW,
        outcome: 'NO_SHOW',
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true, email: true } },
        lead: { select: { id: true, fullName: true, companyName: true, phone: true } },
        deal: { select: { id: true, title: true } },
      },
    });

    await this.prisma.activity.create({
      data: {
        organizationId: user.organizationId,
        userId: user.userId,
        meetingId: existing.id,
        leadId: existing.leadId,
        dealId: existing.dealId,
        activityType: 'MEETING',
        subject: `Meeting No-Show: ${existing.title}`,
        description: `Prospect did not attend scheduled meeting on ${existing.startTime.toISOString()}`,
        outcome: 'NO_SHOW',
        activityDate: new Date(),
      },
    });

    await this.auditService.record({
      organizationId: user.organizationId,
      userId: user.userId,
      action: 'MEETING_NO_SHOW',
      resource: 'meetings',
      resourceId: updated.id,
      details: {},
    });

    return this.mapToResponseDto(updated);
  }

  async assign(id: string, dto: AssignMeetingDto, user: AuthenticatedUser): Promise<MeetingResponseDto> {
    if (user.role === 'BDE_SALES') {
      throw new ForbiddenException('Only ADMIN and MANAGER can reassign meetings');
    }

    const existing = await this.prisma.meeting.findFirst({
      where: { id, organizationId: user.organizationId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException(`Meeting ${id} not found`);

    const targetUser = await this.prisma.user.findFirst({
      where: { id: dto.ownerId, organizationId: user.organizationId, status: 'ACTIVE' },
    });
    if (!targetUser) throw new BadRequestException('Target meeting host user not found or inactive');

    const updated = await this.prisma.meeting.update({
      where: { id },
      data: { ownerId: dto.ownerId },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true, email: true } },
        lead: { select: { id: true, fullName: true, companyName: true, phone: true } },
        deal: { select: { id: true, title: true } },
      },
    });

    await this.auditService.record({
      organizationId: user.organizationId,
      userId: user.userId,
      action: 'MEETING_REASSIGNED',
      resource: 'meetings',
      resourceId: updated.id,
      details: { previousOwnerId: existing.ownerId, newOwnerId: dto.ownerId },
    });

    return this.mapToResponseDto(updated);
  }

  async remove(id: string, user: AuthenticatedUser): Promise<{ message: string }> {
    const existing = await this.prisma.meeting.findFirst({
      where: { id, organizationId: user.organizationId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException(`Meeting ${id} not found`);

    if (
      user.role === 'BDE_SALES' &&
      existing.ownerId !== user.userId &&
      existing.creatorId !== user.userId
    ) {
      throw new ForbiddenException('You do not have permission to delete this meeting');
    }

    await this.prisma.meeting.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.auditService.record({
      organizationId: user.organizationId,
      userId: user.userId,
      action: 'MEETING_DELETED',
      resource: 'meetings',
      resourceId: id,
      details: {},
    });

    return { message: 'Meeting deleted successfully' };
  }
}
