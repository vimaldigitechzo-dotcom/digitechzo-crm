import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MeetingUserSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;
}

export class MeetingLeadSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  fullName: string;

  @ApiPropertyOptional()
  companyName?: string;

  @ApiPropertyOptional()
  phone?: string;
}

export class MeetingDealSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;
}

export class MeetingResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organizationId: string;

  @ApiPropertyOptional()
  leadId?: string;

  @ApiPropertyOptional()
  dealId?: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  meetingType: string;

  @ApiProperty()
  startTime: Date;

  @ApiProperty()
  endTime: Date;

  @ApiPropertyOptional()
  location?: string;

  @ApiProperty()
  ownerId: string;

  @ApiPropertyOptional()
  creatorId?: string;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional()
  outcome?: string;

  @ApiPropertyOptional()
  notes?: string;

  @ApiPropertyOptional()
  completedAt?: Date;

  @ApiPropertyOptional()
  cancelledAt?: Date;

  @ApiPropertyOptional()
  cancelReason?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional({ type: MeetingUserSummaryDto })
  owner?: MeetingUserSummaryDto;

  @ApiPropertyOptional({ type: MeetingUserSummaryDto })
  creator?: MeetingUserSummaryDto;

  @ApiPropertyOptional({ type: MeetingLeadSummaryDto })
  lead?: MeetingLeadSummaryDto;

  @ApiPropertyOptional({ type: MeetingDealSummaryDto })
  deal?: MeetingDealSummaryDto;
}

export class PaginatedMeetingsResponseDto {
  @ApiProperty({ type: [MeetingResponseDto] })
  data: MeetingResponseDto[];

  @ApiProperty({
    example: {
      total: 10,
      page: 1,
      limit: 20,
      totalPages: 1,
    },
  })
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
