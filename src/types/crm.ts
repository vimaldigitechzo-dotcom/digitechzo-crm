export type LeadStatus = 'NEW' | 'HOT' | 'WARM' | 'COLD' | 'UNQUALIFIED' | 'CONVERTED' | 'LOST';

export type LeadSource = 
  | 'META_ADS' 
  | 'GOOGLE_ADS' 
  | 'WEBSITE_FORM' 
  | 'WHATSAPP' 
  | 'MANUAL' 
  | 'IMPORT' 
  | 'PHONE_INBOUND';

export type TaskActionType = 
  | 'CALL' 
  | 'WHATSAPP' 
  | 'EMAIL' 
  | 'MEETING' 
  | 'PROPOSAL' 
  | 'INTERNAL_REVIEW'
  | 'FOLLOW_UP'
  | 'REVIEW'
  | 'OTHER';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type TaskStatus = 'PENDING' | 'COMPLETED' | 'OVERDUE' | 'RESCHEDULED' | 'CANCELLED';

export interface NextAction {
  actionType: TaskActionType;
  date: string;
  time?: string;
  ownerId: string;
  ownerName: string;
  purpose: string;
}

export interface Lead {
  id: string;
  fullName: string;
  companyName?: string;
  title?: string;
  phone: string;
  email?: string | null;
  source: LeadSource;
  status: LeadStatus;
  leadScore: number;
  serviceInterest: string;
  ownerId: string;
  ownerName: string;
  lastActivityAt: string;
  nextAction?: NextAction;
  createdAt: string;
}

export interface CreateLeadPayload {
  fullName: string;
  companyName?: string;
  title?: string;
  phone: string;
  email?: string;
  source: LeadSource;
  priority?: TaskPriority;
  temperature?: 'HOT' | 'WARM' | 'COLD';
  serviceInterest: string;
  ownerId?: string;
  leadScore?: number;
  nextActionDueAt?: string;
  nextActionType?: TaskActionType;
  nextActionPurpose?: string;
}

export interface UpdateLeadPayload {
  fullName?: string;
  companyName?: string;
  title?: string;
  phone?: string;
  email?: string;
  priority?: TaskPriority;
  temperature?: 'HOT' | 'WARM' | 'COLD';
  serviceInterest?: string;
  leadScore?: number;
}

export interface PipelineStage {
  id: string;
  name: string;
  order: number;
  dealCount: number;
  totalValue: number;
  stageType: 'OPEN' | 'WON' | 'LOST';
}

export interface PipelineStageDto {
  id: string;
  name: string;
  order: number;
  stageType: 'OPEN' | 'WON' | 'LOST';
  dealCountBenchmark?: number;
  totalValueBenchmark?: number;
}

export interface LostReasonDto {
  id: string;
  code: string;
  label: string;
  isActive: boolean;
}

export interface HealthCheckResult {
  status: 'ok' | 'degraded';
  version: string;
  timestamp: string;
  uptime: number;
  environment: string;
  database: {
    status: 'connected' | 'disconnected';
    latencyMs?: number;
    error?: string;
  };
}

export interface CreateDealPayload {
  title: string;
  value: number;
  stageId: string;
  leadId?: string;
  ownerId?: string;
  expectedCloseDate?: string;
  probability?: number;
}

export interface UpdateDealPayload {
  title?: string;
  value?: number;
  expectedCloseDate?: string;
  probability?: number;
}

export interface Deal {
  id: string;
  title: string;
  leadId?: string | null;
  leadName?: string;
  companyName?: string;
  stageId: string;
  stageName?: string;
  amount: number;
  currency: string;
  probability: number;
  expectedCloseDate: string;
  ownerId: string;
  ownerName: string;
  status: 'OPEN' | 'WON' | 'LOST';
  lostReasonId?: string | null;
  lostReasonLabel?: string | null;
  lostReasonNotes?: string | null;
  wonNotes?: string | null;
  closedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  leadId?: string;
  leadName?: string;
  dealId?: string;
  dealTitle?: string;
  actionType: TaskActionType;
  dueDate: string;
  dueTime?: string;
  priority: TaskPriority;
  status: TaskStatus;
  ownerId: string;
  ownerName: string;
  isNextAction: boolean;
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  taskType: 'CALL' | 'WHATSAPP' | 'EMAIL' | 'MEETING' | 'PROPOSAL' | 'FOLLOW_UP' | 'REVIEW' | 'OTHER';
  dueDate: string;
  priority?: TaskPriority;
  assigneeId?: string;
  leadId?: string;
  dealId?: string;
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string;
  taskType?: 'CALL' | 'WHATSAPP' | 'EMAIL' | 'MEETING' | 'PROPOSAL' | 'FOLLOW_UP' | 'REVIEW' | 'OTHER';
  dueDate?: string;
  priority?: TaskPriority;
  status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  leadId?: string;
  dealId?: string;
}

export type ActivityType =
  | 'CALL'
  | 'WHATSAPP'
  | 'EMAIL'
  | 'NOTE'
  | 'MEETING'
  | 'STAGE_CHANGE'
  | 'TASK'
  | 'SYSTEM';

export interface ActivityItem {
  id: string;
  leadId?: string;
  leadName?: string;
  dealId?: string;
  dealTitle?: string;
  taskId?: string;
  taskTitle?: string;
  type: ActivityType;
  title: string;
  subject?: string;
  description?: string;
  direction?: 'INBOUND' | 'OUTBOUND';
  durationSeconds?: number;
  outcome?: string;
  authorName: string;
  createdAt: string;
  activityDate?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateActivityPayload {
  activityType: 'CALL' | 'EMAIL' | 'WHATSAPP' | 'NOTE' | 'MEETING' | 'TASK' | 'SYSTEM';
  direction?: 'INBOUND' | 'OUTBOUND';
  subject: string;
  description?: string;
  activityDate?: string;
  durationSeconds?: number;
  outcome?: string;
  leadId?: string;
  dealId?: string;
  taskId?: string;
  metadata?: Record<string, unknown>;
}

export type MeetingStatus = 'SCHEDULED' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED';
export type MeetingType = 'MEETING' | 'DEMO' | 'DISCOVERY' | 'FOLLOW_UP';

export interface MeetingItem {
  id: string;
  title: string;
  description?: string;
  leadId?: string;
  leadName: string;
  companyName: string;
  dealId?: string;
  dealTitle?: string;
  meetingType: MeetingType;
  date: string;
  time: string;
  duration: string;
  leadPhone?: string;
  hostName: string;
  meetingUrl?: string;
  location?: string;
  status: MeetingStatus;
  outcomeSummary?: string;
  nextStepNotes?: string;
  notes?: string;
  startTime?: string;
  endTime?: string;
}

export interface CreateMeetingPayload {
  title: string;
  description?: string;
  meetingType: MeetingType;
  startTime: string;
  endTime: string;
  location?: string;
  leadId?: string;
  dealId?: string;
  ownerId?: string;
}

export interface UpdateMeetingPayload {
  title?: string;
  description?: string;
  meetingType?: MeetingType;
  startTime?: string;
  endTime?: string;
  location?: string;
  status?: MeetingStatus;
  outcome?: string;
  notes?: string;
  leadId?: string;
  dealId?: string;
}

export interface CompleteMeetingPayload {
  outcome?: string;
  notes?: string;
  createActivity?: boolean;
}

export interface CancelMeetingPayload {
  cancelReason: string;
  notes?: string;
}

export type ProposalBackendStatus =
  | 'DRAFT'
  | 'SENT'
  | 'VIEWED'
  | 'NEGOTIATION'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CANCELLED';

export type ProposalStatus =
  | 'DRAFT'
  | 'SENT'
  | 'UNDER_REVIEW'
  | 'ACCEPTED'
  | 'DECLINED'
  | ProposalBackendStatus;

export interface ProposalItem {
  id: string;
  quoteNumber: string;
  proposalNumber?: string;
  title: string;
  clientName: string;
  companyName: string;
  leadId?: string;
  dealId?: string;
  dealTitle?: string;
  versionNumber: number;
  versionLabel: string;
  amount: number;
  subtotal?: number;
  discountAmount?: number;
  taxAmount?: number;
  totalAmount?: number;
  currency?: string;
  status: ProposalStatus;
  validUntil?: string;
  ownerId?: string;
  ownerName: string;
  scopeNotes?: string;
  description?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateProposalPayload {
  title: string;
  description?: string;
  leadId?: string;
  dealId?: string;
  subtotal: number;
  discountAmount?: number;
  taxAmount?: number;
  totalAmount?: number;
  currency?: string;
  validUntil?: string;
  notes?: string;
  ownerId?: string;
}

export interface UpdateProposalPayload {
  title?: string;
  description?: string;
  leadId?: string;
  dealId?: string;
  subtotal?: number;
  discountAmount?: number;
  taxAmount?: number;
  totalAmount?: number;
  currency?: string;
  validUntil?: string;
  notes?: string;
}

export interface UpdateProposalStatusPayload {
  status: string;
  rejectionReason?: string;
  notes?: string;
}

export type CustomerStatus = 'ACTIVE' | 'INACTIVE' | 'AT_RISK' | 'CHURNED' | 'Active' | 'Inactive';

export interface CustomerUserSummary {
  id: string;
  name: string;
  email: string;
}

export interface CustomerLeadSummary {
  id: string;
  fullName: string;
}

export interface CustomerDealSummary {
  id: string;
  title: string;
  value?: number;
}

export interface CustomerItem {
  id: string;
  organizationId?: string;
  leadId?: string;
  dealId?: string;
  companyName: string;
  contactName: string;
  title?: string;
  phone: string;
  email: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  status: CustomerStatus;
  ownerId?: string;
  customerSince?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  owner?: CustomerUserSummary;
  lead?: CustomerLeadSummary;
  deal?: CustomerDealSummary;
  // UI helper mappings
  accountManager?: string;
  purchasedServices?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export interface CreateCustomerPayload {
  companyName: string;
  contactName: string;
  title?: string;
  phone: string;
  email: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  status?: string;
  leadId?: string;
  dealId?: string;
  ownerId?: string;
  customerSince?: string;
  notes?: string;
}

export interface UpdateCustomerPayload {
  companyName?: string;
  contactName?: string;
  title?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  status?: string;
  ownerId?: string;
  customerSince?: string;
  notes?: string;
}

export interface RoleItem {
  id: string;
  name: string;
  displayName?: string;
  displayAlias?: string;
  description?: string;
  isSystem?: boolean;
  createdAt?: string;
}

export interface TeamUserRoleSummary {
  id: string;
  name: string;
  description?: string;
  displayAlias?: string;
}

export interface TeamUserOrgSummary {
  id: string;
  name: string;
  slug: string;
}

export interface TeamUserItem {
  id: string;
  organizationId?: string;
  roleId?: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  status: 'ACTIVE' | 'INACTIVE' | string;
  createdAt?: string;
  updatedAt?: string;
  role: TeamUserRoleSummary;
  organization?: TeamUserOrgSummary;
  teamName?: string;
  dataScope?: string;
  avatarUrl?: string;
}

export interface CreateUserPayload {
  name?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  roleId?: string;
  role?: string;
  password?: string;
  status?: string;
}

export interface UpdateUserPayload {
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  roleId?: string;
  role?: string;
  status?: string;
}

export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'PARTIALLY_PAID' | 'OVERDUE' | 'CANCELLED';

export interface InvoiceItemRow {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  title: string;
  clientName: string;
  companyName: string;
  clientEmail?: string;
  clientPhone?: string;
  leadId?: string;
  dealId?: string;
  proposalId?: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  taxPercent: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  paymentMethod?: string;
  paidAt?: string;
  notes?: string;
  items?: InvoiceItemRow[];
  createdAt: string;
  updatedAt?: string;
}

export interface CreateInvoicePayload {
  title: string;
  clientName: string;
  companyName: string;
  clientEmail?: string;
  clientPhone?: string;
  leadId?: string;
  dealId?: string;
  proposalId?: string;
  issueDate: string;
  dueDate: string;
  items: { description: string; quantity: number; unitPrice: number }[];
  taxPercent?: number;
  discountAmount?: number;
  notes?: string;
}

export interface UpdateInvoiceStatusPayload {
  status: InvoiceStatus;
  amountPaid?: number;
  paymentMethod?: string;
  paidAt?: string;
  notes?: string;
}



