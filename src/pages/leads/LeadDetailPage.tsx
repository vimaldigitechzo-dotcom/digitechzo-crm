import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { crmApi } from '@/lib/api';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  cn,
  formatCurrency,
  formatDate,
  getLocalDateString,
  isTimeOver,
  getInitialScheduleDateTime,
  parseTimeToDate,
  formatDisplayTime,
  getCurrentFormattedTime,
} from '@/lib/utils';
import {
  ArrowLeft,
  Building,
  Mail,
  Phone,
  Calendar,
  User as UserIcon,
  Edit,
  Trash2,
  PlusCircle,
  CheckCircle2,
  Clock,
  Briefcase,
  FileText,
  Activity as ActivityIcon,
  CheckSquare,
  AlertCircle,
  Loader2,
  TrendingUp,
  Tag,
  ShieldCheck,
  CalendarPlus,
  PhoneCall,
  Sparkles,
  Check,
  XCircle,
  MessageCircle,
  Video,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import { TaskPriority, LeadSource } from '@/types/crm';
import { CategorySelect } from '@/components/leads/CategorySelect';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { WhatsAppShareButton } from '@/components/meetings/WhatsAppShareButton';
import {
  isValidMeetingUrl,
  normalizeMeetingUrl,
  getMeetingPlatformInfo,
  calculateMeetingTimes,
  generateAutomatedMeetUrl,
} from '@/components/meetings/meetingUtils';

export const LeadDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<
    'overview' | 'qualification' | 'deals' | 'meetings' | 'tasks' | 'proposals' | 'activities'
  >('overview');

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isQualModalOpen, setIsQualModalOpen] = useState(false);
  const [isDealModalOpen, setIsDealModalOpen] = useState(false);

  // Quick Touchpoint Modals
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isWonModalOpen, setIsWonModalOpen] = useState(false);
  const [isLostModalOpen, setIsLostModalOpen] = useState(false);

  // Form submission states & errors
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStageUpdating, setIsStageUpdating] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Edit Lead Form State (Exact parity with Create Lead)
  const [editForm, setEditForm] = useState({
    fullName: '',
    companyName: '',
    title: '',
    phone: '',
    email: '',
    source: 'WEBSITE_FORM' as LeadSource,
    serviceInterest: '',
    priority: 'MEDIUM' as TaskPriority,
    temperature: '' as '' | 'HOT' | 'WARM' | 'COLD',
    status: 'NEW',
    leadScore: 80,
    nextActionDueAt: '',
    nextActionType: 'CALL',
    nextActionPurpose: '',
  });

  // Quick Action Forms
  const [callLogForm, setCallLogForm] = useState({
    subject: 'Discovery Call with Client',
    outcome: 'CONNECTED_INTERESTED',
    durationMinutes: 5,
    description: '',
  });

  const [whatsAppLogForm, setWhatsAppLogForm] = useState({
    subject: 'WhatsApp Interaction',
    outcome: 'MESSAGE_SENT',
    description: '',
  });

  const [noteForm, setNoteForm] = useState({
    subject: 'Internal Note',
    description: '',
  });

  const [wonNotes, setWonNotes] = useState('Contract finalized & approved');
  const [selectedLostReasonId, setSelectedLostReasonId] = useState('');
  const [lostReasonNotes, setLostReasonNotes] = useState('');

  // Schedule Meeting Form State
  const [meetingUrlError, setMeetingUrlError] = useState<string | null>(null);
  const [meetingForm, setMeetingForm] = useState({
    title: '',
    startTime: '',
    endTime: '',
    meetingType: 'DISCOVERY',
    location: '',
    agenda: '',
  });

  // Schedule Task / Call Form State
  const [taskForm, setTaskForm] = useState(() => {
    const init = getInitialScheduleDateTime();
    return {
      title: '',
      description: '',
      taskType: 'CALL' as any,
      dueDate: init.dueDate,
      dueTime: init.dueTime,
      priority: 'MEDIUM' as TaskPriority,
    };
  });

  const handleOpenTaskModal = () => {
    const init = getInitialScheduleDateTime();
    setTaskForm({
      title: '',
      description: '',
      taskType: 'CALL',
      dueDate: init.dueDate,
      dueTime: '',
      priority: 'MEDIUM',
    });
    setModalError(null);
    setIsTaskModalOpen(true);
  };

  const handleTaskDueDateChange = (newDate: string) => {
    setTaskForm({ ...taskForm, dueDate: newDate });
    if (modalError) setModalError(null);
  };

  // Create Deal Form State
  const [dealForm, setDealForm] = useState({
    title: '',
    value: 100000,
    stageId: '',
    expectedCloseDate: '',
    probability: 60,
  });

  // BANT Qualification Form State
  const [qualForm, setQualForm] = useState({
    budgetAmount: 100000,
    budgetCurrency: 'INR',
    budgetConfirmed: false,
    decisionMakerIdentified: false,
    decisionMakerName: '',
    decisionProcess: '',
    needIdentified: true,
    painPoints: '',
    solutionFit: '',
    timelineTargetDate: '',
    urgencyLevel: 'MEDIUM',
    notes: '',
  });

  // 1. Fetch Master Lead
  const {
    data: lead,
    isLoading: isLeadLoading,
    isError: isLeadError,
  } = useQuery({
    queryKey: ['lead', id],
    queryFn: () => (id ? crmApi.getLead(id) : null),
    enabled: !!id,
  });

  // 2. Fetch Deals linked to this lead
  const { data: dealsResponse } = useQuery({
    queryKey: ['deals', { leadId: id }],
    queryFn: () => crmApi.getDeals({ leadId: id, limit: 50 }),
    enabled: !!id,
  });
  const deals: any[] = dealsResponse?.items || dealsResponse?.data || [];
  const activeDeal = deals.find((d) => d.status === 'OPEN') || deals[0];

  // 3. Fetch Pipeline Stages
  const { data: stages = [] } = useQuery({
    queryKey: ['pipeline-stages'],
    queryFn: () => crmApi.getPipelineStages(),
  });

  // 4. Fetch Lost Reasons
  const { data: lostReasons = [] } = useQuery({
    queryKey: ['lost-reasons'],
    queryFn: () => crmApi.getLostReasons(),
  });

  // 5. Fetch Meetings linked to this lead
  const { data: meetingsResponse } = useQuery({
    queryKey: ['meetings', { leadId: id }],
    queryFn: () => crmApi.getMeetings({ leadId: id, limit: 50 }),
    enabled: !!id,
  });
  const meetings: any[] = meetingsResponse?.items || meetingsResponse?.data || [];

  // 6. Fetch Tasks linked to this lead
  const { data: tasksResponse } = useQuery({
    queryKey: ['tasks', { leadId: id }],
    queryFn: () => crmApi.getTasks({ leadId: id, limit: 50 }),
    enabled: !!id,
  });
  const tasks: any[] = tasksResponse?.items || tasksResponse?.data || [];

  // 7. Fetch Proposals linked to this lead
  const { data: proposalsResponse } = useQuery({
    queryKey: ['proposals', { leadId: id }],
    queryFn: () => crmApi.getProposals({ leadId: id, limit: 50 }),
    enabled: !!id,
  });
  const proposals: any[] = proposalsResponse?.items || proposalsResponse?.data || [];

  // 8. Fetch Activities linked to this lead
  const { data: activitiesResponse } = useQuery({
    queryKey: ['activities', { leadId: id }],
    queryFn: () => crmApi.getActivities({ leadId: id, limit: 50 }),
    enabled: !!id,
  });
  const activities: any[] = activitiesResponse?.items || activitiesResponse?.data || [];

  // 9. Fetch Lead BANT Qualification
  const { data: qualification } = useQuery({
    queryKey: ['lead-qualification', id],
    queryFn: () => (id ? crmApi.getLeadQualification(id) : null),
    enabled: !!id,
  });

  // Query all leads for duplicate detection
  const { data: allLeadsResponse } = useQuery({
    queryKey: ['leads'],
    queryFn: () => crmApi.getLeads({ limit: 100 }),
  });
  const allLeads: any[] = allLeadsResponse?.items || allLeadsResponse?.data || [];

  const editDuplicateLead = useMemo(() => {
    const digits = editForm.phone.replace(/\D/g, '').slice(-10);
    if (digits.length !== 10) return null;
    return allLeads.find((l) => {
      if (l.id === id) return false;
      const lDigits = (l.phone || '').replace(/\D/g, '').slice(-10);
      return lDigits === digits;
    });
  }, [editForm.phone, allLeads, id]);

  // Helper to invalidate all lead-related queries
  const invalidateAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['lead', id] }),
      queryClient.invalidateQueries({ queryKey: ['leads'] }),
      queryClient.invalidateQueries({ queryKey: ['deals'] }),
      queryClient.invalidateQueries({ queryKey: ['deals', { leadId: id }] }),
      queryClient.invalidateQueries({ queryKey: ['pipeline-stages'] }),
      queryClient.invalidateQueries({ queryKey: ['meetings'] }),
      queryClient.invalidateQueries({ queryKey: ['tasks'] }),
      queryClient.invalidateQueries({ queryKey: ['proposals'] }),
      queryClient.invalidateQueries({ queryKey: ['activities'] }),
      queryClient.invalidateQueries({ queryKey: ['customers'] }),
    ]);
  };

  // Open Edit Modal with full Lead data
  const handleOpenEditModal = () => {
    if (!lead) return;
    const cleanDigits = (lead.phone || '').replace(/\D/g, '').slice(-10);
    setEditForm({
      fullName: lead.fullName || '',
      companyName: lead.companyName || '',
      title: lead.title || '',
      phone: cleanDigits,
      email: lead.email || '',
      source: (lead.source || 'WEBSITE_FORM') as LeadSource,
      serviceInterest: lead.serviceInterest || '',
      priority: lead.priority || 'MEDIUM',
      temperature: lead.temperature || '',
      status: lead.status || 'NEW',
      leadScore: lead.leadScore ?? 80,
      nextActionDueAt: lead.nextActionDueAt ? lead.nextActionDueAt.slice(0, 16) : '',
      nextActionType: lead.nextActionType || 'CALL',
      nextActionPurpose: lead.nextActionPurpose || '',
    });
    setModalError(null);
    setIsEditModalOpen(true);
  };

  // Save Lead Updates
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setModalError(null);

    const editPhoneDigits = editForm.phone.replace(/\D/g, '');
    if (editPhoneDigits.length !== 10) {
      setModalError(
        editPhoneDigits.length === 0
          ? 'Phone Number is required (must be exactly 10 digits).'
          : `Phone Number must be exactly 10 digits. (You entered ${editPhoneDigits.length} digit${editPhoneDigits.length === 1 ? '' : 's'})`
      );
      return;
    }

    if (editDuplicateLead) {
      setModalError(
        `This phone number (${editPhoneDigits}) is already registered for lead "${editDuplicateLead.fullName}". Duplicate phone numbers are not allowed.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await crmApi.updateLead(id, {
        fullName: editForm.fullName.trim(),
        companyName: editForm.companyName.trim() || undefined,
        title: editForm.title.trim() || undefined,
        phone: editPhoneDigits,
        email: editForm.email.trim() ? editForm.email.trim().toLowerCase() : undefined,
        serviceInterest: editForm.serviceInterest.trim(),
        priority: editForm.priority,
        temperature: editForm.temperature ? (editForm.temperature as 'HOT' | 'WARM' | 'COLD') : undefined,
        leadScore: Number(editForm.leadScore) || 80,
      });

      if (editForm.status !== lead.status) {
        await crmApi.updateLeadStatus(id, editForm.status);
      }

      // Log Touchpoint Activity for profile update
      await crmApi.createActivity({
        activityType: 'NOTE',
        subject: 'Lead Profile Details Updated',
        description: `Updated contact & commercial profile for ${editForm.fullName}: Company: "${editForm.companyName || 'None'}", Title: "${editForm.title || 'None'}", Priority: ${editForm.priority}, Temperature: ${editForm.temperature || 'Unrated'}, Service: "${editForm.serviceInterest}"`,
        leadId: id,
        dealId: activeDeal?.id || undefined,
      });

      await invalidateAll();
      setIsEditModalOpen(false);
    } catch (err: any) {
      setModalError(err?.message || 'Failed to update lead details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Interactive Stage Click Handler (Moves deal to clicked pipeline stage)
  const handleStageClick = async (targetStage: any) => {
    if (!id || isStageUpdating) return;
    setModalError(null);

    // If target stage is WON, open Won confirmation
    if (targetStage.stageType === 'WON') {
      setIsWonModalOpen(true);
      return;
    }

    // If target stage is LOST, open Lost reason selector
    if (targetStage.stageType === 'LOST') {
      if (lostReasons.length > 0 && !selectedLostReasonId) {
        setSelectedLostReasonId(lostReasons[0].id);
      }
      setIsLostModalOpen(true);
      return;
    }

    setIsStageUpdating(true);
    try {
      if (activeDeal) {
        // Move existing deal to selected stage
        const updatedDeal = await crmApi.updateDealStage(activeDeal.id, targetStage.id);

        // Immediately update React Query deals cache
        queryClient.setQueryData(['deals', { leadId: id }], (old: any) => {
          if (!old) return old;
          const items = (old.items || old.data || []).map((d: any) =>
            d.id === activeDeal.id
              ? {
                  ...d,
                  stageId: targetStage.id,
                  stageName: targetStage.name,
                  stage: targetStage,
                  status: updatedDeal?.status || d.status,
                }
              : d
          );
          return { ...old, items };
        });
      } else {
        // Create initial deal in selected stage
        const newDeal = await crmApi.createDeal({
          title: `${lead.fullName} - ${lead.serviceInterest || 'Opportunity'}`,
          value: 100000,
          stageId: targetStage.id,
          leadId: id,
          probability: targetStage.order * 15,
        });

        queryClient.setQueryData(['deals', { leadId: id }], (old: any) => {
          if (!old) return { items: [newDeal], total: 1 };
          return { ...old, items: [newDeal, ...(old.items || [])], total: (old.total || 0) + 1 };
        });
      }

      // If moved back to Step 1 (Qualification), immediately reflect NEW lead status
      if (targetStage.order === 1) {
        queryClient.setQueryData(['lead', id], (old: any) => {
          if (!old) return old;
          return { ...old, status: 'NEW' };
        });
      }

      await invalidateAll();
    } catch (err: any) {
      alert(`Failed to update stage: ${err?.message || 'Server error'}`);
    } finally {
      setIsStageUpdating(false);
    }
  };

  // Confirm Deal WON
  const handleConfirmWon = async () => {
    if (!activeDeal) return;
    setIsSubmitting(true);
    try {
      await crmApi.markDealWon(activeDeal.id, wonNotes);
      await invalidateAll();
      setIsWonModalOpen(false);
    } catch (err: any) {
      setModalError(err?.message || 'Failed to mark deal won.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirm Deal LOST
  const handleConfirmLost = async () => {
    if (!activeDeal || !selectedLostReasonId) return;
    setIsSubmitting(true);
    try {
      await crmApi.markDealLost(activeDeal.id, selectedLostReasonId, lostReasonNotes);
      await invalidateAll();
      setIsLostModalOpen(false);
    } catch (err: any) {
      setModalError(err?.message || 'Failed to mark deal lost.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Log Phone Call
  const handleLogCallSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setIsSubmitting(true);
    try {
      await crmApi.createActivity({
        activityType: 'CALL',
        direction: 'OUTBOUND',
        subject: callLogForm.subject,
        description: `Outcome: ${callLogForm.outcome}. Duration: ${callLogForm.durationMinutes} min. Notes: ${callLogForm.description}`,
        outcome: callLogForm.outcome,
        durationSeconds: callLogForm.durationMinutes * 60,
        leadId: id,
        dealId: activeDeal?.id || undefined,
      });

      // Complete any pending CALL or FOLLOW_UP tasks for this lead
      const pendingTasks = tasks.filter(
        (t) => (t.taskType === 'CALL' || t.taskType === 'FOLLOW_UP') && t.status === 'PENDING'
      );
      for (const t of pendingTasks) {
        try {
          await crmApi.completeTask(t.id, {
            completionNotes: `Completed via Call Log: ${callLogForm.outcome}. Notes: ${callLogForm.description}`,
            createActivity: false,
          });
        } catch {
          // ignore individual task completion errors
        }
      }

      // Update lead status to CONTACTED if it was NEW
      if (lead.status === 'NEW') {
        await crmApi.updateLeadStatus(id, 'CONTACTED');
      }

      // Update lead temperature based on call outcome
      if (callLogForm.outcome === 'CONNECTED_INTERESTED') {
        await crmApi.updateLead(id, { temperature: 'HOT' });
      } else if (callLogForm.outcome === 'CONNECTED_NOT_INTERESTED') {
        await crmApi.updateLead(id, { temperature: 'COLD' });
      }

      // Auto-advance Pipeline Deal from Stage 1 (New Lead) to Stage 2 (Discovery)
      if (activeDeal && (activeDeal.stage?.order === 1 || !activeDeal.stageId)) {
        const stage2 = stages.find((s: any) => s.order === 2);
        if (stage2) {
          try {
            await crmApi.updateDealStage(activeDeal.id, stage2.id);
          } catch {
            // non-fatal
          }
        }
      }

      await invalidateAll();
      setIsCallModalOpen(false);
      setCallLogForm({
        subject: 'Discovery Call with Client',
        outcome: 'CONNECTED_INTERESTED',
        durationMinutes: 5,
        description: '',
      });
    } catch (err: any) {
      setModalError(err?.message || 'Failed to log call.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Log WhatsApp
  const handleLogWhatsAppSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setIsSubmitting(true);
    try {
      await crmApi.createActivity({
        activityType: 'WHATSAPP',
        direction: 'OUTBOUND',
        subject: whatsAppLogForm.subject,
        description: `Status: ${whatsAppLogForm.outcome}. Content/Response: ${whatsAppLogForm.description || 'WhatsApp communication sent'}`,
        outcome: whatsAppLogForm.outcome,
        leadId: id,
        dealId: activeDeal?.id || undefined,
      });

      // Complete any pending WHATSAPP or FOLLOW_UP tasks for this lead
      const pendingTasks = tasks.filter(
        (t) => (t.taskType === 'WHATSAPP' || t.taskType === 'FOLLOW_UP') && t.status === 'PENDING'
      );
      for (const t of pendingTasks) {
        try {
          await crmApi.completeTask(t.id, {
            completionNotes: `Completed via WhatsApp Log: ${whatsAppLogForm.outcome}. Notes: ${whatsAppLogForm.description || 'Follow-up done'}`,
            createActivity: false,
          });
        } catch {
          // ignore individual task completion errors
        }
      }

      // Update lead status to CONTACTED if it was NEW
      if (lead.status === 'NEW') {
        await crmApi.updateLeadStatus(id, 'CONTACTED');
      }

      // Auto-advance Pipeline Deal from Stage 1 to Stage 2
      if (activeDeal && (activeDeal.stage?.order === 1 || !activeDeal.stageId)) {
        const stage2 = stages.find((s: any) => s.order === 2);
        if (stage2) {
          try {
            await crmApi.updateDealStage(activeDeal.id, stage2.id);
          } catch {
            // non-fatal
          }
        }
      }

      await invalidateAll();
      setIsWhatsAppModalOpen(false);
      setWhatsAppLogForm({
        subject: 'WhatsApp Interaction',
        outcome: 'MESSAGE_SENT',
        description: '',
      });
    } catch (err: any) {
      setModalError(err?.message || 'Failed to log WhatsApp interaction.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Log Internal Note
  const handleLogNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setIsSubmitting(true);
    try {
      await crmApi.createActivity({
        activityType: 'NOTE',
        subject: noteForm.subject,
        description: noteForm.description,
        leadId: id,
        dealId: activeDeal?.id || undefined,
      });

      await invalidateAll();
      setIsNoteModalOpen(false);
      setNoteForm({
        subject: 'Internal Note',
        description: '',
      });
    } catch (err: any) {
      setModalError(err?.message || 'Failed to add note.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Lead
  const handleDeleteLead = async () => {
    if (!id) return;
    setIsSubmitting(true);
    try {
      await crmApi.deleteLead(id);
      await queryClient.invalidateQueries({ queryKey: ['leads'] });
      navigate('/leads');
    } catch (err: any) {
      setModalError(err?.message || 'Failed to delete lead.');
      setIsSubmitting(false);
    }
  };

  // Schedule Meeting Submit
  const handleMeetingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setModalError(null);
    setMeetingUrlError(null);

    // Validate meeting URL if input looks like a link
    const locTrim = meetingForm.location.trim();
    if (locTrim && (locTrim.includes('://') || locTrim.startsWith('meet.') || locTrim.includes('.com') || locTrim.includes('.us') || locTrim.includes('.me'))) {
      if (!isValidMeetingUrl(locTrim)) {
        setMeetingUrlError(
          'Please enter a valid meeting URL (e.g. https://meet.google.com/iqi-qsmu-muu, Zoom, or Teams).'
        );
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const finalLocation = locTrim
        ? (isValidMeetingUrl(locTrim) ? normalizeMeetingUrl(locTrim) : locTrim)
        : generateAutomatedMeetUrl();

      const startIso = new Date(meetingForm.startTime).toISOString();
      const endIso = new Date(meetingForm.endTime).toISOString();

      await crmApi.createMeeting({
        title: meetingForm.title.trim() || `Discovery Call with ${lead?.fullName}`,
        startTime: startIso,
        endTime: endIso,
        meetingType: meetingForm.meetingType as any,
        location: finalLocation,
        description: meetingForm.agenda.trim() || undefined,
        leadId: id,
        dealId: activeDeal?.id || undefined,
      });

      // Auto-advance Pipeline Deal to Stage 3 (Demo / Meeting Completed)
      if (activeDeal && (activeDeal.stage?.order < 3 || !activeDeal.stageId)) {
        const stage3 = stages.find((s: any) => s.order === 3);
        if (stage3) {
          try {
            await crmApi.updateDealStage(activeDeal.id, stage3.id);
          } catch {
            // non-fatal
          }
        }
      }

      await invalidateAll();
      setIsMeetingModalOpen(false);

      setMeetingForm({
        title: '',
        startTime: '',
        endTime: '',
        meetingType: 'DISCOVERY',
        location: '',
        agenda: '',
      });
      setMeetingUrlError(null);
    } catch (err: any) {
      setModalError(err?.message || 'Failed to schedule meeting.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Schedule Task Submit
  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    if (!taskForm.dueTime) {
      setModalError('Please choose an allocated time for the task.');
      return;
    }

    if (isTimeOver(taskForm.dueDate, taskForm.dueTime)) {
      setModalError(
        `Selected time (${formatDisplayTime(taskForm.dueTime)}) has already passed today. Please select a valid future time after ${getCurrentFormattedTime()}.`
      );
      return;
    }

    setModalError(null);
    setIsSubmitting(true);

    try {
      const scheduledDate = parseTimeToDate(taskForm.dueDate, taskForm.dueTime);

      await crmApi.createTask({
        title: taskForm.title.trim(),
        description: taskForm.description.trim() || undefined,
        taskType: taskForm.taskType,
        dueDate: scheduledDate.toISOString(),
        priority: taskForm.priority,
        leadId: id,
        dealId: activeDeal?.id || undefined,
      });

      await invalidateAll();
      setIsTaskModalOpen(false);
      const init = getInitialScheduleDateTime();
      setTaskForm({
        title: '',
        description: '',
        taskType: 'CALL',
        dueDate: init.dueDate,
        dueTime: '',
        priority: 'MEDIUM',
      });
    } catch (err: any) {
      setModalError(err?.message || 'Failed to create task.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Create Deal Submit
  const handleDealSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setModalError(null);
    setIsSubmitting(true);

    const defaultStageId = dealForm.stageId || stages[0]?.id;
    if (!defaultStageId) {
      setModalError('Pipeline stages not loaded.');
      setIsSubmitting(false);
      return;
    }

    try {
      await crmApi.createDeal({
        title: dealForm.title.trim() || `${lead?.fullName} - Opportunity`,
        value: Number(dealForm.value) || 100000,
        stageId: defaultStageId,
        leadId: id,
        expectedCloseDate: dealForm.expectedCloseDate
          ? new Date(dealForm.expectedCloseDate).toISOString()
          : undefined,
        probability: Number(dealForm.probability) || 60,
      });

      await invalidateAll();
      setIsDealModalOpen(false);
      setDealForm({
        title: '',
        value: 100000,
        stageId: '',
        expectedCloseDate: '',
        probability: 60,
      });
    } catch (err: any) {
      setModalError(err?.message || 'Failed to create deal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save BANT Qualification
  const handleQualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setModalError(null);
    setIsSubmitting(true);

    try {
      await crmApi.upsertLeadQualification(id, {
        budgetAmount: Number(qualForm.budgetAmount) || 0,
        budgetCurrency: qualForm.budgetCurrency,
        budgetConfirmed: qualForm.budgetConfirmed,
        decisionMakerIdentified: qualForm.decisionMakerIdentified,
        decisionMakerName: qualForm.decisionMakerName.trim() || undefined,
        decisionProcess: qualForm.decisionProcess.trim() || undefined,
        needIdentified: qualForm.needIdentified,
        painPoints: qualForm.painPoints.trim() || undefined,
        solutionFit: qualForm.solutionFit.trim() || undefined,
        timelineTargetDate: qualForm.timelineTargetDate
          ? new Date(qualForm.timelineTargetDate).toISOString()
          : undefined,
        urgencyLevel: qualForm.urgencyLevel,
        notes: qualForm.notes.trim() || undefined,
      });

      // Log Touchpoint Activity for BANT update
      await crmApi.createActivity({
        activityType: 'NOTE',
        subject: 'BANT Qualification Assessment Updated',
        description: `BANT discovery findings recorded: Budget ₹${qualForm.budgetAmount.toLocaleString('en-IN')}, Urgency ${qualForm.urgencyLevel}, Decision Maker: ${qualForm.decisionMakerName || 'Not specified'}. Need: ${qualForm.painPoints || 'Custom requirement'}`,
        leadId: id,
        dealId: activeDeal?.id || undefined,
      });

      await invalidateAll();
      setIsQualModalOpen(false);
    } catch (err: any) {
      setModalError(err?.message || 'Failed to save qualification.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate Active Step index in Master Sales Journey
  const currentStage = stages.find((s: any) => s.id === activeDeal?.stageId);
  const currentStageOrder = currentStage?.order ?? activeDeal?.stage?.order ?? (lead?.status === 'CONVERTED' ? 6 : 1);

  if (isLeadLoading) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center bg-white rounded-card border border-border shadow-card">
        <Loader2 className="h-7 w-7 animate-spin text-[#57B71B] mb-2.5" />
        <p className="text-xs font-semibold text-txt-primary">Loading master lead dossier...</p>
      </div>
    );
  }

  if (isLeadError || !lead) {
    return (
      <div className="space-y-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/leads')}
          className="h-8 text-xs cursor-pointer"
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to Leads
        </Button>
        <div className="p-8 text-center bg-white rounded-card border border-border">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <h2 className="text-base font-bold text-txt-primary">Lead Not Found</h2>
          <p className="text-xs text-txt-muted mt-1">
            The requested lead record could not be loaded or has been deleted.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 select-none pb-12">
      {/* 1. Top Navigation & Primary Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-card border border-border shadow-card">
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/leads')}
            className="h-8 text-xs cursor-pointer border-border hover:bg-slate-50"
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to Leads
          </Button>
          <div className="h-4 w-px bg-border hidden sm:block" />
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold text-txt-primary">{lead.fullName}</h1>
            <StatusBadge status={lead.status} type="lead" />
            {lead.temperature && (
              <Badge
                variant="outline"
                className={`text-[10px] font-semibold uppercase px-2 py-0.5 ${
                  lead.temperature === 'HOT'
                    ? 'border-red-200 bg-red-50 text-red-700'
                    : lead.temperature === 'WARM'
                    ? 'border-amber-200 bg-amber-50 text-amber-700'
                    : 'border-blue-200 bg-blue-50 text-blue-700'
                }`}
              >
                {lead.temperature}
              </Badge>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenEditModal}
            className="h-8 text-xs cursor-pointer border-border hover:bg-slate-50"
          >
            <Edit className="mr-1.5 h-3.5 w-3.5 text-txt-muted" /> Edit Lead
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setModalError(null);
              setIsDeleteModalOpen(true);
            }}
            className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* 2. Interactive Pipeline & Sales Journey Tracker */}
      <div className="bg-white p-4 rounded-card border border-border shadow-card space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[#57B71B]" />
            <h2 className="text-xs font-bold text-txt-primary uppercase tracking-wider">
              Master Sales Journey & Pipeline Progression
            </h2>
          </div>
          <span className="text-[11px] text-txt-muted">
            Click any step to shift pipeline stage
          </span>
        </div>

        {/* Interactive Steps Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {stages.map((stage: any) => {
            const isCompleted = currentStageOrder > stage.order;
            const isCurrent = activeDeal?.stageId === stage.id || (!activeDeal && stage.order === 1);
            return (
              <button
                key={stage.id}
                disabled={isStageUpdating}
                onClick={() => handleStageClick(stage)}
                className={`p-2.5 rounded-btn border text-center transition-all text-left sm:text-center ${
                  isStageUpdating ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                } ${
                  isCurrent
                    ? 'bg-[#F0FDF4] border-[#86EFAC] ring-2 ring-[#22C55E]/40 shadow-subtle'
                    : isCompleted
                    ? 'bg-slate-50 border-slate-200 text-txt-muted hover:bg-slate-100/80'
                    : 'bg-white border-border text-txt-muted hover:border-[#57B71B]/50 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-center gap-1 mb-1">
                  {isCompleted ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#16A34A]" />
                  ) : isCurrent ? (
                    <div className="h-2 w-2 rounded-full bg-[#22C55E] animate-pulse" />
                  ) : (
                    <div className="h-2 w-2 rounded-full bg-slate-300" />
                  )}
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-txt-muted">
                    Step {stage.order}
                  </span>
                </div>
                <p
                  className={`text-xs font-bold leading-tight ${
                    isCurrent ? 'text-[#15803D]' : isCompleted ? 'text-txt-secondary' : 'text-txt-muted'
                  }`}
                >
                  {stage.name}
                </p>
              </button>
            );
          })}
        </div>

        {/* Active Commercial Opportunity Pill */}
        {activeDeal && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-btn bg-slate-50 border border-border text-xs gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-txt-muted">Commercial Deal:</span>
              <span className="font-semibold text-txt-primary">{activeDeal.title}</span>
              <span className="font-bold text-primary tabular-nums">
                ({formatCurrency(Number(activeDeal.value || activeDeal.amount || 0))})
              </span>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <span className="text-txt-muted hidden xs:inline">Stage: {activeDeal.stage?.name || 'In Progress'}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsWonModalOpen(true)}
                className="h-6 text-[11px] bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
              >
                <Check className="h-3 w-3 mr-1" /> Mark Won
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsLostModalOpen(true)}
                className="h-6 text-[11px] bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
              >
                <XCircle className="h-3 w-3 mr-1" /> Mark Lost
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Quick Touchpoint Action Bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap bg-white p-3 rounded-card border border-border shadow-card">
        <span className="text-xs font-bold text-txt-primary flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-[#57B71B]" /> Quick Touchpoint Actions:
        </span>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setModalError(null);
              setIsCallModalOpen(true);
            }}
            className="h-8 text-xs cursor-pointer border-border hover:border-blue-500 hover:text-blue-600"
          >
            <PhoneCall className="mr-1.5 h-3.5 w-3.5 text-blue-600" /> Log Call
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setModalError(null);
              setIsWhatsAppModalOpen(true);
            }}
            className="h-8 text-xs cursor-pointer border-border hover:border-green-500 hover:text-green-600"
          >
            <MessageCircle className="mr-1.5 h-3.5 w-3.5 text-green-600" /> Log WhatsApp
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setModalError(null);
              setIsMeetingModalOpen(true);
            }}
            className="h-8 text-xs cursor-pointer border-border hover:border-purple-500 hover:text-purple-600"
          >
            <CalendarPlus className="mr-1.5 h-3.5 w-3.5 text-purple-600" /> Schedule Meeting
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenTaskModal}
            className="h-8 text-xs cursor-pointer border-border hover:border-amber-500 hover:text-amber-600"
          >
            <CheckSquare className="mr-1.5 h-3.5 w-3.5 text-amber-600" /> Follow-Up Task
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setModalError(null);
              setIsNoteModalOpen(true);
            }}
            className="h-8 text-xs cursor-pointer border-border hover:border-slate-400"
          >
            <FileText className="mr-1.5 h-3.5 w-3.5 text-txt-muted" /> Add Note
          </Button>
        </div>
      </div>

      {/* 4. Master 360° Lead Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white p-4 rounded-card border border-border shadow-card">
        {/* Contact Info */}
        <div className="space-y-1.5 md:border-r border-border md:pr-4 border-b md:border-b-0 pb-3 md:pb-0">
          <span className="text-[10px] font-semibold text-txt-muted uppercase tracking-wider block">
            Prospect Information
          </span>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-1.5 text-txt-primary font-semibold">
              <Building className="h-3.5 w-3.5 text-txt-muted shrink-0" />
              <span className="truncate">{lead.companyName || 'Independent Prospect'}</span>
            </div>
            {lead.title && <div className="text-[11px] text-txt-muted pl-5">{lead.title}</div>}
            <div className="flex items-center gap-1.5 text-txt-secondary font-medium">
              <Phone className="h-3.5 w-3.5 text-txt-muted shrink-0" />
              <a href={`tel:${lead.phone}`} className="hover:text-primary transition-colors">
                {lead.phone}
              </a>
            </div>
            {lead.email ? (
              <div className="flex items-center gap-1.5 text-txt-secondary">
                <Mail className="h-3.5 w-3.5 text-txt-muted shrink-0" />
                <a href={`mailto:${lead.email}`} className="hover:text-primary transition-colors truncate">
                  {lead.email}
                </a>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-txt-muted italic pl-5">
                No email recorded
              </div>
            )}
          </div>
        </div>

        {/* Commercial Interest */}
        <div className="space-y-1.5 md:border-r border-border md:pr-4 border-b md:border-b-0 pb-3 md:pb-0">
          <span className="text-[10px] font-semibold text-txt-muted uppercase tracking-wider block">
            Commercial Requirement
          </span>
          <p className="text-xs font-semibold text-txt-primary line-clamp-2">
            {lead.serviceInterest || 'General Inquiry'}
          </p>
          <div className="flex items-center gap-2 pt-1 text-xs">
            <span className="text-[11px] text-txt-muted">Source:</span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-badge text-[10px] font-semibold bg-slate-100 text-txt-secondary border border-border">
              {lead.source}
            </span>
          </div>
        </div>

        {/* Next Action Snapshot */}
        <div className="space-y-1.5 md:border-r border-border md:pr-4 border-b md:border-b-0 pb-3 md:pb-0">
          <span className="text-[10px] font-semibold text-txt-muted uppercase tracking-wider block">
            Next Action Follow-Up
          </span>
          {lead.nextAction ? (
            <div className="p-2 rounded-btn bg-[#F0FDF4] border border-[#BBF7D0] text-xs space-y-0.5">
              <div className="flex items-center justify-between text-[#166534] font-semibold text-[11px]">
                <span>{lead.nextAction.actionType || 'CALL'}</span>
                <span>{lead.nextAction.dueDate ? formatDate(lead.nextAction.dueDate) : 'Scheduled'}</span>
              </div>
              <p className="text-[#15803D] text-[11px] line-clamp-1">{lead.nextAction.purpose}</p>
            </div>
          ) : (
            <div className="text-xs text-txt-muted italic py-1">No next action scheduled</div>
          )}
        </div>

        {/* Ownership & BANT */}
        <div className="space-y-1.5 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-semibold text-txt-muted uppercase tracking-wider block">
              Ownership & BANT Score
            </span>
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1.5">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="bg-primary-soft text-primary text-[10px] font-bold">
                    {(lead.owner?.name || lead.ownerName || 'Admin')
                      .split(' ')
                      .map((n: string) => n[0])
                      .join('')}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs font-semibold text-txt-primary truncate max-w-[110px]">
                  {lead.owner?.name || lead.ownerName || 'Admin'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-base font-bold text-txt-primary tabular-nums">
                  {lead.leadScore ?? 80}
                  <span className="text-[11px] text-txt-muted font-normal">/100</span>
                </span>
              </div>
            </div>
          </div>
          <div className="text-[10px] text-txt-muted">
            Created on {formatDate(lead.createdAt)} • Last activity {formatDate(lead.lastActivityAt)}
          </div>
        </div>
      </div>

      {/* 5. Tabbed Navigation */}
      <div className="flex items-center gap-1 border-b border-border bg-white px-2 rounded-t-card overflow-x-auto shadow-subtle [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {[
          { id: 'overview', label: 'Overview & Scope', icon: FileText },
          { id: 'activities', label: `Touchpoint Timeline (${activities.length})`, icon: ActivityIcon },
          { id: 'qualification', label: 'BANT Qualification', icon: ShieldCheck },
          { id: 'deals', label: `Deals & Pipeline (${deals.length})`, icon: Briefcase },
          { id: 'meetings', label: `Meetings (${meetings.length})`, icon: Calendar },
          { id: 'tasks', label: `Tasks & Calls (${tasks.length})`, icon: CheckSquare },
          { id: 'proposals', label: `Proposals (${proposals.length})`, icon: Tag },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'border-[#57B71B] text-[#57B71B] bg-slate-50/50'
                  : 'border-transparent text-txt-muted hover:text-txt-primary hover:border-slate-300'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 6. Tab Content Panes */}
      <div className="bg-white p-4 rounded-b-card border-x border-b border-border shadow-card min-h-[300px]">
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3 p-3.5 rounded-card bg-slate-50 border border-border">
                <h3 className="font-bold text-txt-primary text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <UserIcon className="h-3.5 w-3.5 text-primary" /> Master Lead Attributes
                </h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-txt-muted block">Full Name</span>
                    <span className="font-semibold text-txt-primary">{lead.fullName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-txt-muted block">Company</span>
                    <span className="font-medium text-txt-primary">{lead.companyName || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-txt-muted block">Job Title</span>
                    <span className="font-medium text-txt-primary">{lead.title || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-txt-muted block">Acquisition Source</span>
                    <span className="font-medium text-txt-primary">{lead.source}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-txt-muted block">Contact Phone</span>
                    <span className="font-semibold text-txt-primary tabular-nums">{lead.phone}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-txt-muted block">Email Address</span>
                    <span className="font-medium text-txt-primary truncate block">
                      {lead.email || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-txt-muted block">SLA Priority</span>
                    <span className="font-semibold text-txt-primary">{lead.priority || 'MEDIUM'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-txt-muted block">Customer Temperature</span>
                    <span className="font-semibold text-txt-primary">{lead.temperature || 'Unrated'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 p-3.5 rounded-card bg-slate-50 border border-border flex flex-col justify-between">
                <div className="space-y-2">
                  <h3 className="font-bold text-txt-primary text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Briefcase className="h-3.5 w-3.5 text-primary" /> Service Scope & Interest
                  </h3>
                  <p className="p-2.5 rounded-btn bg-white border border-border text-txt-primary font-medium">
                    {lead.serviceInterest}
                  </p>
                </div>

                <div className="pt-2 border-t border-border/80 flex items-center justify-between">
                  <span className="text-xs text-txt-muted">Log an interaction to advance qualification?</span>
                  <Button
                    size="sm"
                    onClick={() => setIsCallModalOpen(true)}
                    className="h-7 text-xs bg-[#57B71B] hover:bg-[#469815] text-white cursor-pointer"
                  >
                    <PhoneCall className="mr-1 h-3 w-3" /> Log Discovery Call
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TOUCHPOINT TIMELINE */}
        {activeTab === 'activities' && (
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-txt-primary text-xs uppercase tracking-wider">
                Full Touchpoint & Activity History ({activities.length})
              </h3>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsCallModalOpen(true)}
                  className="h-7 text-xs"
                >
                  <PhoneCall className="mr-1 h-3 w-3 text-blue-600" /> Log Call
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsWhatsAppModalOpen(true)}
                  className="h-7 text-xs"
                >
                  <MessageCircle className="mr-1 h-3 w-3 text-green-600" /> Log WhatsApp
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsNoteModalOpen(true)}
                  className="h-7 text-xs"
                >
                  <FileText className="mr-1 h-3 w-3 text-txt-muted" /> Add Note
                </Button>
              </div>
            </div>

            {activities.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-card border border-border">
                <p className="text-xs text-txt-muted">No activities or touchpoints recorded yet.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {activities.map((act) => {
                  const isCall = act.activityType === 'CALL';
                  const isWhatsApp = act.activityType === 'WHATSAPP';
                  const isMeeting = act.activityType === 'MEETING';
                  const isStageChange = act.subject?.toLowerCase().includes('stage');
                  const isProfileEvent = act.subject?.toLowerCase().includes('profile') || act.subject?.toLowerCase().includes('created');

                  return (
                    <div
                      key={act.id}
                      className="p-3.5 rounded-card bg-slate-50 border border-border flex items-start gap-3 hover:bg-slate-100/50 transition-colors"
                    >
                      <div
                        className={`p-2 rounded-btn border shrink-0 ${
                          isCall
                            ? 'bg-blue-50 border-blue-200 text-blue-600'
                            : isWhatsApp
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                            : isMeeting
                            ? 'bg-purple-50 border-purple-200 text-purple-600'
                            : isStageChange
                            ? 'bg-amber-50 border-amber-200 text-amber-600'
                            : isProfileEvent
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-600'
                            : 'bg-white border-border text-primary'
                        }`}
                      >
                        {isCall ? (
                          <PhoneCall className="h-4 w-4" />
                        ) : isWhatsApp ? (
                          <MessageCircle className="h-4 w-4" />
                        ) : isMeeting ? (
                          <Calendar className="h-4 w-4" />
                        ) : isStageChange ? (
                          <TrendingUp className="h-4 w-4" />
                        ) : isProfileEvent ? (
                          <UserIcon className="h-4 w-4" />
                        ) : (
                          <FileText className="h-4 w-4" />
                        )}
                      </div>
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-txt-primary text-xs">
                              {act.subject || act.title || act.activityType}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-[9px] uppercase px-1.5 py-0 font-semibold ${
                                isCall
                                  ? 'border-blue-300 text-blue-700 bg-blue-50/50'
                                  : isWhatsApp
                                  ? 'border-emerald-300 text-emerald-700 bg-emerald-50/50'
                                  : isMeeting
                                  ? 'border-purple-300 text-purple-700 bg-purple-50/50'
                                  : isStageChange
                                  ? 'border-amber-300 text-amber-700 bg-amber-50/50'
                                  : 'border-slate-300 text-txt-secondary'
                              }`}
                            >
                              {act.activityType}
                            </Badge>
                          </div>
                          <span className="text-[10px] text-txt-muted tabular-nums">
                            {formatDate(act.createdAt)}
                          </span>
                        </div>
                        <p className="text-[11px] text-txt-secondary leading-relaxed bg-white p-2 rounded-btn border border-border/70">
                          {act.description || act.notes}
                        </p>
                        <div className="flex items-center gap-2 pt-0.5">
                          {act.outcome && (
                            <Badge variant="secondary" className="text-[10px] py-0 px-2 font-medium">
                              Outcome: {act.outcome}
                            </Badge>
                          )}
                          {act.durationSeconds ? (
                            <span className="text-[10px] text-txt-muted flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {Math.round(act.durationSeconds / 60)} min
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: BANT QUALIFICATION */}
        {activeTab === 'qualification' && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-txt-primary text-xs uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-[#57B71B]" /> BANT Qualification Breakdown
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setModalError(null);
                  setIsQualModalOpen(true);
                }}
                className="h-7 text-xs cursor-pointer border-border hover:bg-slate-50"
              >
                <Edit className="mr-1.5 h-3 w-3 text-txt-muted" /> Update Qualification
              </Button>
            </div>

            {qualification ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 rounded-card bg-slate-50 border border-border space-y-2">
                  <span className="text-[10px] font-bold text-txt-muted uppercase tracking-wider block">
                    Budget (B)
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-txt-primary tabular-nums">
                      {formatCurrency(qualification.budgetAmount, qualification.budgetCurrency)}
                    </span>
                    <Badge variant={qualification.budgetConfirmed ? 'default' : 'secondary'}>
                      {qualification.budgetConfirmed ? 'Confirmed' : 'Unconfirmed'}
                    </Badge>
                  </div>
                </div>

                <div className="p-3 rounded-card bg-slate-50 border border-border space-y-2">
                  <span className="text-[10px] font-bold text-txt-muted uppercase tracking-wider block">
                    Authority (A)
                  </span>
                  <div>
                    <span className="font-semibold text-txt-primary block">
                      {qualification.decisionMakerName || 'Not specified'}
                    </span>
                    <span className="text-[11px] text-txt-muted">
                      {qualification.decisionProcess || 'Direct buyer'}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-card bg-slate-50 border border-border space-y-2">
                  <span className="text-[10px] font-bold text-txt-muted uppercase tracking-wider block">
                    Need & Pain Points (N)
                  </span>
                  <p className="text-txt-primary font-medium">
                    {qualification.painPoints || 'Custom business software requirement'}
                  </p>
                </div>

                <div className="p-3 rounded-card bg-slate-50 border border-border space-y-2">
                  <span className="text-[10px] font-bold text-txt-muted uppercase tracking-wider block">
                    Timeline (T) & Urgency
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-txt-primary">
                      {qualification.timelineTargetDate ? formatDate(qualification.timelineTargetDate) : 'Flexible'}
                    </span>
                    <Badge variant="outline">{qualification.urgencyLevel || 'MEDIUM'}</Badge>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-card border border-border space-y-2">
                <p className="text-xs text-txt-muted">No formal BANT qualification recorded yet.</p>
                <Button
                  size="sm"
                  onClick={() => setIsQualModalOpen(true)}
                  className="h-8 text-xs bg-[#57B71B] hover:bg-[#469815] text-white cursor-pointer"
                >
                  <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Start Qualification
                </Button>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: DEALS */}
        {activeTab === 'deals' && (
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-txt-primary text-xs uppercase tracking-wider">
                Commercial Deals ({deals.length})
              </h3>
              <Button
                size="sm"
                onClick={() => {
                  setModalError(null);
                  setDealForm({
                    title: `${lead.fullName} - Custom Project`,
                    value: 100000,
                    stageId: stages[0]?.id || '',
                    expectedCloseDate: '',
                    probability: 60,
                  });
                  setIsDealModalOpen(true);
                }}
                className="h-7 text-xs bg-[#57B71B] hover:bg-[#469815] text-white cursor-pointer"
              >
                <PlusCircle className="mr-1 h-3 w-3" /> Add Deal
              </Button>
            </div>

            {deals.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-card border border-border">
                <p className="text-xs text-txt-muted">No commercial deals created for this lead yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {deals.map((deal) => (
                  <div
                    key={deal.id}
                    className="p-3 rounded-card bg-slate-50 border border-border flex items-center justify-between"
                  >
                    <div>
                      <h4 className="font-bold text-xs text-txt-primary">{deal.title}</h4>
                      <p className="text-[11px] text-txt-muted">
                        Stage: {deal.stage?.name || 'In Pipeline'} • Probability: {deal.probability}%
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-sm text-primary tabular-nums block">
                        {formatCurrency(Number(deal.value || deal.amount || 0))}
                      </span>
                      <StatusBadge status={deal.status} type="stage" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: MEETINGS */}
        {activeTab === 'meetings' && (
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-txt-primary text-xs uppercase tracking-wider">
                Scheduled & Past Meetings ({meetings.length})
              </h3>
              <Button
                size="sm"
                onClick={() => {
                  setModalError(null);
                  setIsMeetingModalOpen(true);
                }}
                className="h-7 text-xs bg-[#57B71B] hover:bg-[#469815] text-white cursor-pointer"
              >
                <CalendarPlus className="mr-1 h-3 w-3" /> Schedule Meeting
              </Button>
            </div>

            {meetings.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-card border border-border">
                <p className="text-xs text-txt-muted">No meetings scheduled for this lead.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {meetings.map((meeting) => {
                  const platform = getMeetingPlatformInfo(meeting.location);
                  const times = calculateMeetingTimes(
                    undefined,
                    undefined,
                    undefined,
                    meeting.startTime,
                    meeting.endTime
                  );
                  const meetingForShare = {
                    ...meeting,
                    leadName: meeting.lead?.fullName || lead.fullName,
                    leadPhone: meeting.lead?.phone || lead.phone,
                    companyName: meeting.lead?.companyName || lead.companyName,
                    meetingUrl: meeting.location,
                  };

                  return (
                    <div
                      key={meeting.id}
                      className="p-3 rounded-card bg-slate-50 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-xs text-txt-primary">{meeting.title}</h4>
                          <Badge variant="outline" className="text-[10px] uppercase font-bold">
                            {meeting.meetingType}
                          </Badge>
                          <Badge
                            variant={meeting.status === 'SCHEDULED' ? 'info' : 'outline'}
                            className="text-[10px]"
                          >
                            {meeting.status}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-txt-muted flex-wrap">
                          <span className="flex items-center gap-1 font-medium text-slate-700">
                            <Clock className="h-3 w-3 text-slate-400" />
                            {times.date} • {times.startTime} – {times.endTime}
                          </span>
                        </div>

                        {meeting.location && (
                          <div className="text-[11px] flex items-center gap-1.5 pt-0.5">
                            {platform.isOnline && platform.validUrl ? (
                              <a
                                href={platform.normalizedUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline font-medium"
                              >
                                <Video className="h-3 w-3 text-blue-500 shrink-0" />
                                <span>{platform.platform}</span>
                                <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                              </a>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-slate-600">
                                <MapPin className="h-3 w-3 text-amber-500 shrink-0" />
                                <span>{meeting.location}</span>
                              </span>
                            )}
                          </div>
                        )}

                        {meeting.description && (
                          <p className="text-[11px] text-txt-secondary line-clamp-2">{meeting.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <WhatsAppShareButton
                          meeting={meetingForShare}
                          variant="solid"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 6: TASKS */}
        {activeTab === 'tasks' && (
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-txt-primary text-xs uppercase tracking-wider">
                Action Items & Follow-Up Calls ({tasks.length})
              </h3>
              <Button
                size="sm"
                onClick={handleOpenTaskModal}
                className="h-7 text-xs bg-[#57B71B] hover:bg-[#469815] text-white cursor-pointer"
              >
                <PlusCircle className="mr-1 h-3 w-3" /> Add Task / Call
              </Button>
            </div>

            {tasks.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-card border border-border">
                <p className="text-xs text-txt-muted">No active tasks or scheduled calls for this lead.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-3 rounded-card bg-slate-50 border border-border flex items-center justify-between"
                  >
                    <div className="space-y-0.5">
                      <h4 className="font-semibold text-xs text-txt-primary flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {task.taskType || task.actionType || 'CALL'}
                        </Badge>
                        {task.title}
                      </h4>
                      <p className="text-[11px] text-txt-muted">
                        Due: {formatDate(task.dueDate)} • Priority: {task.priority}
                      </p>
                    </div>
                    <Badge variant={task.status === 'COMPLETED' ? 'default' : 'secondary'}>
                      {task.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 7: PROPOSALS */}
        {activeTab === 'proposals' && (
          <div className="space-y-3 text-xs">
            <h3 className="font-bold text-txt-primary text-xs uppercase tracking-wider">
              Commercial Proposals ({proposals.length})
            </h3>
            {proposals.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-card border border-border">
                <p className="text-xs text-txt-muted">No proposals created for this lead yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {proposals.map((prop) => (
                  <div
                    key={prop.id}
                    className="p-3 rounded-card bg-slate-50 border border-border flex items-center justify-between"
                  >
                    <div>
                      <h4 className="font-semibold text-xs text-txt-primary">{prop.title}</h4>
                      <p className="text-[11px] text-txt-muted">
                        Amount: {formatCurrency(Number(prop.amount || 0))} • Valid until:{' '}
                        {formatDate(prop.validUntil)}
                      </p>
                    </div>
                    <Badge variant="outline">{prop.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL 1: EDIT LEAD */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-section-title text-txt-primary">Edit Lead</DialogTitle>
            <DialogDescription className="text-xs text-txt-muted">
              Update prospect details and sync changes to PostgreSQL
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-3 py-2 text-xs">
            {modalError && (
              <div className="p-2.5 rounded-btn bg-[#FEF2F2] border border-[#FECACA] flex items-start gap-2 text-xs text-[#DC2626]">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{modalError}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-caption text-txt-secondary block font-medium">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={editForm.fullName}
                onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                disabled={isSubmitting}
                className="w-full h-8 rounded-input border border-border bg-white px-2.5 text-xs text-txt-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
              <div className="space-y-1">
                <label className="text-caption text-txt-secondary block font-medium">Company Name</label>
                <input
                  type="text"
                  value={editForm.companyName}
                  onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })}
                  disabled={isSubmitting}
                  className="w-full h-8 rounded-input border border-border bg-white px-2.5 text-xs text-txt-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-caption text-txt-secondary block font-medium">Job Title</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  disabled={isSubmitting}
                  className="w-full h-8 rounded-input border border-border bg-white px-2.5 text-xs text-txt-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-caption text-txt-secondary block font-medium">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] text-txt-muted tabular-nums">
                    {editForm.phone.length}/10 digits
                  </span>
                </div>
                <input
                  type="tel"
                  required
                  value={editForm.phone}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setEditForm({ ...editForm, phone: cleaned });
                  }}
                  maxLength={10}
                  inputMode="numeric"
                  pattern="[0-9]{10}"
                  title="Phone number must be exactly 10 digits"
                  placeholder="e.g. 9876543210 (10 digits)"
                  disabled={isSubmitting}
                  className={`w-full h-8 rounded-input border bg-white px-2.5 text-xs text-txt-primary focus:outline-none focus:ring-1 ${
                    editDuplicateLead
                      ? 'border-red-500 focus:ring-red-500'
                      : editForm.phone.length === 10
                      ? 'border-emerald-500 focus:ring-emerald-500'
                      : 'border-border focus:ring-primary'
                  }`}
                />
                <div className="text-[11px] pt-0.5">
                  {editDuplicateLead ? (
                    <span className="text-red-500 font-medium flex items-center gap-1">
                      <AlertCircle className="h-3 w-3 inline shrink-0" />
                      Already used by {editDuplicateLead.fullName}
                    </span>
                  ) : editForm.phone.length > 0 && editForm.phone.length < 10 ? (
                    <span className="text-amber-600 font-medium">
                      Only 10 digits allowed ({editForm.phone.length}/10 entered)
                    </span>
                  ) : editForm.phone.length === 10 ? (
                    <span className="text-emerald-600 font-medium flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 inline shrink-0" />
                      Valid 10-digit number
                    </span>
                  ) : (
                    <span className="text-txt-muted">Only 10 digits allowed (no symbols)</span>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-caption text-txt-secondary block font-medium">Email Address</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  disabled={isSubmitting}
                  className="w-full h-8 rounded-input border border-border bg-white px-2.5 text-xs text-txt-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
              <div className="space-y-1">
                <label className="text-caption text-txt-secondary block font-medium">Lead Source</label>
                <CustomSelect
                  value={editForm.source}
                  onChange={(val) => setEditForm({ ...editForm, source: val as any })}
                  disabled={isSubmitting}
                  options={[
                    { value: 'WEBSITE_FORM', label: 'WEBSITE_FORM' },
                    { value: 'META_ADS', label: 'META_ADS' },
                    { value: 'GOOGLE_ADS', label: 'GOOGLE_ADS' },
                    { value: 'WHATSAPP', label: 'WHATSAPP' },
                    { value: 'MANUAL', label: 'MANUAL' },
                    { value: 'PHONE_INBOUND', label: 'PHONE_INBOUND' },
                    { value: 'IMPORT', label: 'IMPORT' },
                  ]}
                />
              </div>

              <div className="space-y-1">
                <label className="text-caption text-txt-secondary block font-medium">Lead Score</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={editForm.leadScore}
                  onChange={(e) => setEditForm({ ...editForm, leadScore: Number(e.target.value) })}
                  disabled={isSubmitting}
                  className="w-full h-8 rounded-input border border-border bg-white px-2.5 text-xs text-txt-primary focus:outline-none focus:ring-1 focus:ring-primary tabular-nums"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-caption text-txt-secondary block font-medium">
                Category / Service Interest <span className="text-red-500">*</span>
              </label>
              <CategorySelect
                value={editForm.serviceInterest}
                onChange={(val) => setEditForm({ ...editForm, serviceInterest: val })}
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
              <div className="space-y-1">
                <label className="text-caption text-txt-secondary block font-medium">SLA Priority</label>
                <CustomSelect
                  value={editForm.priority}
                  onChange={(val) => setEditForm({ ...editForm, priority: val as TaskPriority })}
                  disabled={isSubmitting}
                  options={[
                    { value: 'LOW', label: 'LOW' },
                    { value: 'MEDIUM', label: 'MEDIUM' },
                    { value: 'HIGH', label: 'HIGH' },
                    { value: 'URGENT', label: 'URGENT' },
                  ]}
                />
              </div>

              <div className="space-y-1">
                <label className="text-caption text-txt-secondary block font-medium">Temperature</label>
                <CustomSelect
                  value={editForm.temperature}
                  onChange={(val) =>
                    setEditForm({ ...editForm, temperature: val as '' | 'HOT' | 'WARM' | 'COLD' })
                  }
                  disabled={isSubmitting}
                  options={[
                    { value: '', label: 'None (Unrated)' },
                    { value: 'HOT', label: 'HOT' },
                    { value: 'WARM', label: 'WARM' },
                    { value: 'COLD', label: 'COLD' },
                  ]}
                />
              </div>
            </div>

            <DialogFooter className="pt-2 flex flex-col-reverse sm:flex-row gap-2 sm:gap-0">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsEditModalOpen(false)}
                disabled={isSubmitting}
                className="h-8 text-xs cursor-pointer w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="h-8 text-xs bg-[#57B71B] hover:bg-[#469815] text-white cursor-pointer w-full sm:w-auto"
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: LOG PHONE CALL */}
      <Dialog open={isCallModalOpen} onOpenChange={setIsCallModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-section-title text-txt-primary flex items-center gap-2">
              <PhoneCall className="h-4 w-4 text-blue-600" /> Log Phone Call Interaction
            </DialogTitle>
            <DialogDescription className="text-xs text-txt-muted">
              Record call details and updates to the client timeline
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleLogCallSubmit} className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <label className="text-caption text-txt-secondary block font-medium">Call Subject</label>
              <input
                type="text"
                required
                value={callLogForm.subject}
                onChange={(e) => setCallLogForm({ ...callLogForm, subject: e.target.value })}
                disabled={isSubmitting}
                className="w-full h-8 rounded-input border border-border bg-white px-2.5 text-xs text-txt-primary"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-caption text-txt-secondary block font-medium">Call Outcome</label>
                <CustomSelect
                  value={callLogForm.outcome}
                  onChange={(val) => setCallLogForm({ ...callLogForm, outcome: val })}
                  disabled={isSubmitting}
                  options={[
                    { value: 'CONNECTED_INTERESTED', label: 'Connected - Interested' },
                    { value: 'CONNECTED_CALLBACK', label: 'Connected - Requested Callback' },
                    { value: 'CONNECTED_MEETING_BOOKED', label: 'Connected - Meeting Booked' },
                    { value: 'NO_ANSWER', label: 'No Answer / Left Voicemail' },
                    { value: 'BUSY', label: 'Busy' },
                    { value: 'WRONG_NUMBER', label: 'Wrong Number' },
                  ]}
                />
              </div>

              <div className="space-y-1">
                <label className="text-caption text-txt-secondary block font-medium">Duration (Minutes)</label>
                <input
                  type="number"
                  min={1}
                  value={callLogForm.durationMinutes}
                  onChange={(e) => setCallLogForm({ ...callLogForm, durationMinutes: Number(e.target.value) })}
                  disabled={isSubmitting}
                  className="w-full h-8 rounded-input border border-border bg-white px-2 text-xs text-txt-primary tabular-nums"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-caption text-txt-secondary block font-medium">
                Discussion Notes <span className="text-[10px] text-txt-muted font-normal">(Optional)</span>
              </label>
              <textarea
                rows={3}
                value={callLogForm.description}
                onChange={(e) => setCallLogForm({ ...callLogForm, description: e.target.value })}
                placeholder="What was discussed with the client?"
                disabled={isSubmitting}
                className="w-full rounded-input border border-border bg-white p-2 text-xs text-txt-primary"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsCallModalOpen(false)}
                disabled={isSubmitting}
                className="h-8 text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="h-8 text-xs bg-[#57B71B] hover:bg-[#469815] text-white cursor-pointer"
              >
                {isSubmitting ? 'Logging...' : 'Save Call Log'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: LOG WHATSAPP */}
      <Dialog open={isWhatsAppModalOpen} onOpenChange={setIsWhatsAppModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-section-title text-txt-primary flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-green-600" /> Log WhatsApp Interaction
            </DialogTitle>
            <DialogDescription className="text-xs text-txt-muted">
              Record WhatsApp messages sent or replies received
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleLogWhatsAppSubmit} className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <label className="text-caption text-txt-secondary block font-medium">Subject / Topic</label>
              <input
                type="text"
                required
                value={whatsAppLogForm.subject}
                onChange={(e) => setWhatsAppLogForm({ ...whatsAppLogForm, subject: e.target.value })}
                disabled={isSubmitting}
                className="w-full h-8 rounded-input border border-border bg-white px-2.5 text-xs text-txt-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="text-caption text-txt-secondary block font-medium">Interaction Status</label>
              <select
                value={whatsAppLogForm.outcome}
                onChange={(e) => setWhatsAppLogForm({ ...whatsAppLogForm, outcome: e.target.value })}
                disabled={isSubmitting}
                className="w-full h-8 rounded-input border border-border bg-white px-2 text-xs text-txt-primary cursor-pointer"
              >
                <option value="MESSAGE_SENT">Message Sent / Introductory Pitch</option>
                <option value="REPLIED_INTERESTED">Client Replied & Interested</option>
                <option value="REPLIED_PRICE_QUERY">Client Asked for Pricing / Brochure</option>
                <option value="DELIVERED_NO_REPLY">Delivered - No Reply Yet</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-caption text-txt-secondary block font-medium">
                Message / Reply Details <span className="text-[10px] text-txt-muted font-normal">(Optional)</span>
              </label>
              <textarea
                rows={3}
                value={whatsAppLogForm.description}
                onChange={(e) => setWhatsAppLogForm({ ...whatsAppLogForm, description: e.target.value })}
                placeholder="Details of the WhatsApp message or conversation..."
                disabled={isSubmitting}
                className="w-full rounded-input border border-border bg-white p-2 text-xs text-txt-primary"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsWhatsAppModalOpen(false)}
                disabled={isSubmitting}
                className="h-8 text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="h-8 text-xs bg-[#57B71B] hover:bg-[#469815] text-white cursor-pointer"
              >
                {isSubmitting ? 'Logging...' : 'Save WhatsApp Log'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: ADD INTERNAL NOTE */}
      <Dialog open={isNoteModalOpen} onOpenChange={setIsNoteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-section-title text-txt-primary flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> Add Internal Note / Discovery Memo
            </DialogTitle>
            <DialogDescription className="text-xs text-txt-muted">
              Add observations or updates visible to your sales team
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleLogNoteSubmit} className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <label className="text-caption text-txt-secondary block font-medium">Note Title</label>
              <input
                type="text"
                required
                value={noteForm.subject}
                onChange={(e) => setNoteForm({ ...noteForm, subject: e.target.value })}
                disabled={isSubmitting}
                className="w-full h-8 rounded-input border border-border bg-white px-2.5 text-xs text-txt-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="text-caption text-txt-secondary block font-medium">Note Content</label>
              <textarea
                rows={3}
                required
                value={noteForm.description}
                onChange={(e) => setNoteForm({ ...noteForm, description: e.target.value })}
                placeholder="Enter discovery notes or team instructions..."
                disabled={isSubmitting}
                className="w-full rounded-input border border-border bg-white p-2 text-xs text-txt-primary"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsNoteModalOpen(false)}
                disabled={isSubmitting}
                className="h-8 text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="h-8 text-xs bg-[#57B71B] hover:bg-[#469815] text-white cursor-pointer"
              >
                {isSubmitting ? 'Saving...' : 'Add Note'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 5: MARK DEAL WON */}
      <Dialog open={isWonModalOpen} onOpenChange={setIsWonModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-section-title text-[#166534] flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-[#16A34A]" /> Mark Deal WON & Convert Lead
            </DialogTitle>
            <DialogDescription className="text-xs text-txt-muted">
              Closing this deal as WON will automatically convert this Lead to an active Customer.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <label className="text-caption text-txt-secondary block font-medium">Won Notes / Contract Terms</label>
              <textarea
                rows={3}
                value={wonNotes}
                onChange={(e) => setWonNotes(e.target.value)}
                placeholder="Details of the closed deal..."
                className="w-full rounded-input border border-border bg-white p-2 text-xs text-txt-primary"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsWonModalOpen(false)}
              disabled={isSubmitting}
              className="h-8 text-xs cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmWon}
              disabled={isSubmitting}
              className="h-8 text-xs bg-[#16A34A] hover:bg-[#15803D] text-white cursor-pointer"
            >
              {isSubmitting ? 'Converting...' : 'Confirm WON & Create Customer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 6: MARK DEAL LOST */}
      <Dialog open={isLostModalOpen} onOpenChange={setIsLostModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-section-title text-red-600 flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" /> Mark Deal Closed LOST
            </DialogTitle>
            <DialogDescription className="text-xs text-txt-muted">
              Select the primary reason for losing this commercial deal.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <label className="text-caption text-txt-secondary block font-medium">Lost Reason <span className="text-red-500">*</span></label>
              <select
                value={selectedLostReasonId}
                onChange={(e) => setSelectedLostReasonId(e.target.value)}
                className="w-full h-8 rounded-input border border-border bg-white px-2 text-xs text-txt-primary cursor-pointer"
              >
                {lostReasons.map((lr: any) => (
                  <option key={lr.id} value={lr.id}>
                    {lr.label || lr.code}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-caption text-txt-secondary block font-medium">Lost Reason Notes</label>
              <textarea
                rows={3}
                value={lostReasonNotes}
                onChange={(e) => setLostReasonNotes(e.target.value)}
                placeholder="Additional context on why the deal was lost..."
                className="w-full rounded-input border border-border bg-white p-2 text-xs text-txt-primary"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsLostModalOpen(false)}
              disabled={isSubmitting}
              className="h-8 text-xs cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleConfirmLost}
              disabled={isSubmitting}
              className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white cursor-pointer"
            >
              {isSubmitting ? 'Updating...' : 'Confirm Closed Lost'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 7: SCHEDULE MEETING */}
      <Dialog open={isMeetingModalOpen} onOpenChange={setIsMeetingModalOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-section-title text-txt-primary">Schedule Meeting</DialogTitle>
            <DialogDescription className="text-xs text-txt-muted">
              Book a client discovery meeting or demo linked to this lead
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleMeetingSubmit} className="space-y-3 py-2 text-xs">
            {(modalError || meetingUrlError) && (
              <div className="p-2.5 rounded-btn bg-[#FEF2F2] border border-[#FECACA] flex items-start gap-2 text-xs text-[#DC2626]">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{meetingUrlError || modalError}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-caption text-txt-secondary block font-medium">
                Meeting Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={meetingForm.title}
                onChange={(e) => setMeetingForm({ ...meetingForm, title: e.target.value })}
                placeholder={`e.g. Discovery Call with ${lead.fullName}`}
                disabled={isSubmitting}
                className="w-full h-8 rounded-input border border-border bg-white px-2.5 text-xs text-txt-primary"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-caption text-txt-secondary block font-medium">
                  Start Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={meetingForm.startTime}
                  onChange={(e) => setMeetingForm({ ...meetingForm, startTime: e.target.value })}
                  disabled={isSubmitting}
                  className="w-full h-8 rounded-input border border-border bg-white px-2 text-xs text-txt-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-caption text-txt-secondary block font-medium">
                  End Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={meetingForm.endTime}
                  onChange={(e) => setMeetingForm({ ...meetingForm, endTime: e.target.value })}
                  disabled={isSubmitting}
                  className="w-full h-8 rounded-input border border-border bg-white px-2 text-xs text-txt-primary"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-caption text-txt-secondary block font-medium">Meeting Type</label>
              <CustomSelect
                value={meetingForm.meetingType}
                onChange={(val) => setMeetingForm({ ...meetingForm, meetingType: val })}
                disabled={isSubmitting}
                options={[
                  { value: 'DISCOVERY', label: 'Discovery Meeting' },
                  { value: 'DEMO', label: 'Product Demo' },
                  { value: 'MEETING', label: 'General Meeting' },
                  { value: 'FOLLOW_UP', label: 'Follow-Up' },
                ]}
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-caption text-txt-secondary block font-medium">Meeting URL / Location</label>
                <button
                  type="button"
                  onClick={() => {
                    const autoUrl = generateAutomatedMeetUrl();
                    setMeetingForm((prev) => ({ ...prev, location: autoUrl }));
                    setMeetingUrlError(null);
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1a73e8] hover:text-[#1557b0] hover:underline cursor-pointer transition-colors"
                >
                  <Video className="h-3 w-3 text-[#1a73e8]" />
                  <span>+ Generate Meet link</span>
                </button>
              </div>
              <input
                type="text"
                value={meetingForm.location}
                onChange={(e) => {
                  const val = e.target.value;
                  setMeetingForm({ ...meetingForm, location: val });
                  const trimmed = val.trim();
                  if (trimmed && (trimmed.includes('://') || trimmed.startsWith('meet.') || trimmed.includes('.com') || trimmed.includes('.us') || trimmed.includes('.me'))) {
                    if (!isValidMeetingUrl(trimmed)) {
                      setMeetingUrlError('Please enter a valid meeting URL (e.g. https://meet.google.com/iqi-qsmu-muu or Zoom link)');
                    } else {
                      setMeetingUrlError(null);
                    }
                  } else {
                    setMeetingUrlError(null);
                  }
                }}
                placeholder="e.g. https://meet.google.com/iqi-qsmu-muu or Office Address"
                disabled={isSubmitting}
                className={cn(
                  'w-full h-8 rounded-input border bg-white px-2.5 text-xs text-txt-primary',
                  meetingUrlError
                    ? 'border-red-500 focus:ring-red-400 bg-red-50/20'
                    : 'border-border'
                )}
              />
              {meetingUrlError && (
                <p className="text-[10px] text-red-600 font-medium animate-in fade-in flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  {meetingUrlError}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-caption text-txt-secondary block font-medium">Agenda & Objective</label>
              <textarea
                rows={2}
                value={meetingForm.agenda}
                onChange={(e) => setMeetingForm({ ...meetingForm, agenda: e.target.value })}
                placeholder="Key points to discuss..."
                disabled={isSubmitting}
                className="w-full rounded-input border border-border bg-white p-2 text-xs text-txt-primary"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsMeetingModalOpen(false)}
                disabled={isSubmitting}
                className="h-8 text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="h-8 text-xs bg-[#57B71B] hover:bg-[#469815] text-white cursor-pointer"
              >
                {isSubmitting ? 'Scheduling...' : 'Confirm Meeting'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 8: SCHEDULE TASK */}
      <Dialog open={isTaskModalOpen} onOpenChange={setIsTaskModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-section-title text-txt-primary">Schedule Task or Call</DialogTitle>
            <DialogDescription className="text-xs text-txt-muted">
              Record a follow-up action item linked to this lead
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleTaskSubmit} className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <label className="text-caption text-txt-secondary block font-medium">
                Task Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                placeholder="e.g. Follow-up phone consultation"
                disabled={isSubmitting}
                className="w-full h-8 rounded-input border border-border bg-white px-2.5 text-xs text-txt-primary"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <div className="space-y-1 col-span-2 sm:col-span-1">
                <label className="text-caption text-txt-secondary block font-medium">Action Type</label>
                <select
                  value={taskForm.taskType}
                  onChange={(e) => setTaskForm({ ...taskForm, taskType: e.target.value as any })}
                  disabled={isSubmitting}
                  className="w-full h-8 rounded-input border border-border bg-white px-2 text-xs text-txt-primary cursor-pointer"
                >
                  <option value="CALL">Phone Call</option>
                  <option value="WHATSAPP">WhatsApp Message</option>
                  <option value="EMAIL">Email</option>
                  <option value="FOLLOW_UP">Follow-Up Task</option>
                  <option value="REVIEW">Review Requirement</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-caption text-txt-secondary block font-medium">
                  Due Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  min={getLocalDateString()}
                  value={taskForm.dueDate}
                  onChange={(e) => handleTaskDueDateChange(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full h-8 rounded-input border border-border bg-white px-2 text-xs text-txt-primary cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-caption text-txt-secondary block font-medium">
                    Due Time <span className="text-red-500">*</span>
                  </label>
                  {isTimeOver(taskForm.dueDate, taskForm.dueTime) && (
                    <span className="text-[10px] text-red-600 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      Time Over
                    </span>
                  )}
                </div>
                <input
                  type="time"
                  required
                  value={taskForm.dueTime}
                  onChange={(e) => {
                    setTaskForm({ ...taskForm, dueTime: e.target.value });
                    if (modalError) setModalError(null);
                  }}
                  disabled={isSubmitting}
                  className={cn(
                    'w-full h-8 rounded-input border bg-white px-2 text-xs text-txt-primary cursor-pointer',
                    isTimeOver(taskForm.dueDate, taskForm.dueTime)
                      ? 'border-red-500 text-red-600 focus:ring-red-400 bg-red-50/30'
                      : 'border-border'
                  )}
                />
              </div>
            </div>

            {/* Overtime warning message */}
            {isTimeOver(taskForm.dueDate, taskForm.dueTime) && (
              <div className="rounded-md bg-red-50 border border-red-200 p-2 text-[11px] text-red-600 leading-tight flex items-start gap-1.5 animate-in fade-in duration-150">
                <span className="text-sm leading-none shrink-0">⚠️</span>
                <div>
                  <span className="font-semibold">Time Over: </span>
                  {taskForm.dueTime ? formatDisplayTime(taskForm.dueTime) : 'Selected time'} has already passed today. Please select a valid future time after <span className="font-bold underline">{getCurrentFormattedTime()}</span>.
                </div>
              </div>
            )}

            {/* Quick time suggestion buttons */}
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              <span className="text-[10px] text-txt-muted font-medium">Quick suggest:</span>
              <button
                type="button"
                onClick={() => {
                  const now = new Date(Date.now() + 30 * 60000);
                  const hh = String(now.getHours()).padStart(2, '0');
                  const mm = String(now.getMinutes()).padStart(2, '0');
                  setTaskForm({ ...taskForm, dueTime: `${hh}:${mm}` });
                  if (modalError) setModalError(null);
                }}
                className="px-2 py-0.5 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
              >
                +30 mins
              </button>
              <button
                type="button"
                onClick={() => {
                  const now = new Date(Date.now() + 60 * 60000);
                  const hh = String(now.getHours()).padStart(2, '0');
                  const mm = String(now.getMinutes()).padStart(2, '0');
                  setTaskForm({ ...taskForm, dueTime: `${hh}:${mm}` });
                  if (modalError) setModalError(null);
                }}
                className="px-2 py-0.5 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
              >
                +1 hour
              </button>
              <button
                type="button"
                onClick={() => {
                  const now = new Date(Date.now() + 120 * 60000);
                  const hh = String(now.getHours()).padStart(2, '0');
                  const mm = String(now.getMinutes()).padStart(2, '0');
                  setTaskForm({ ...taskForm, dueTime: `${hh}:${mm}` });
                  if (modalError) setModalError(null);
                }}
                className="px-2 py-0.5 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
              >
                +2 hours
              </button>
              <button
                type="button"
                onClick={() => {
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  const yyyy = tomorrow.getFullYear();
                  const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
                  const dd = String(tomorrow.getDate()).padStart(2, '0');
                  setTaskForm({
                    ...taskForm,
                    dueDate: `${yyyy}-${mm}-${dd}`,
                    dueTime: '10:00',
                  });
                  if (modalError) setModalError(null);
                }}
                className="px-2 py-0.5 text-[10px] bg-blue-50 hover:bg-blue-100 text-blue-700 rounded transition-colors"
              >
                Tomorrow 10:00 AM
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-caption text-txt-secondary block font-medium">Priority</label>
              <select
                value={taskForm.priority}
                onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as TaskPriority })}
                disabled={isSubmitting}
                className="w-full h-8 rounded-input border border-border bg-white px-2 text-xs text-txt-primary cursor-pointer"
              >
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="URGENT">URGENT</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-caption text-txt-secondary block font-medium">Notes & Description</label>
              <textarea
                rows={2}
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                placeholder="Additional instructions..."
                disabled={isSubmitting}
                className="w-full rounded-input border border-border bg-white p-2 text-xs text-txt-primary"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsTaskModalOpen(false)}
                disabled={isSubmitting}
                className="h-8 text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="h-8 text-xs bg-[#57B71B] hover:bg-[#469815] text-white cursor-pointer"
              >
                {isSubmitting ? 'Saving...' : 'Save Task'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 9: DELETE CONFIRMATION */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-red-600 flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4" /> Delete Lead Record
            </DialogTitle>
            <DialogDescription className="text-xs text-txt-muted">
              Are you sure you want to permanently delete <strong>{lead.fullName}</strong> and all related timeline history?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={isSubmitting}
              className="h-8 text-xs cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDeleteLead}
              disabled={isSubmitting}
              className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white cursor-pointer"
            >
              {isSubmitting ? 'Deleting...' : 'Confirm Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 10: BANT QUALIFICATION */}
      <Dialog open={isQualModalOpen} onOpenChange={setIsQualModalOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-section-title text-txt-primary">Update BANT Qualification</DialogTitle>
            <DialogDescription className="text-xs text-txt-muted">
              Record discovery findings: Budget, Authority, Need, and Timeline
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleQualSubmit} className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <label className="text-caption text-txt-secondary block font-medium">Budget Amount (₹)</label>
              <input
                type="number"
                min={0}
                value={qualForm.budgetAmount}
                onChange={(e) => setQualForm({ ...qualForm, budgetAmount: Number(e.target.value) })}
                disabled={isSubmitting}
                className="w-full h-8 rounded-input border border-border bg-white px-2.5 text-xs text-txt-primary tabular-nums"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="budgetConfirmed"
                checked={qualForm.budgetConfirmed}
                onChange={(e) => setQualForm({ ...qualForm, budgetConfirmed: e.target.checked })}
                disabled={isSubmitting}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <label htmlFor="budgetConfirmed" className="text-xs text-txt-primary font-medium cursor-pointer">
                Budget officially confirmed with prospect
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-caption text-txt-secondary block font-medium">Decision Maker Name</label>
                <input
                  type="text"
                  value={qualForm.decisionMakerName}
                  onChange={(e) => setQualForm({ ...qualForm, decisionMakerName: e.target.value })}
                  disabled={isSubmitting}
                  className="w-full h-8 rounded-input border border-border bg-white px-2.5 text-xs text-txt-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-caption text-txt-secondary block font-medium">Urgency Level</label>
                <select
                  value={qualForm.urgencyLevel}
                  onChange={(e) => setQualForm({ ...qualForm, urgencyLevel: e.target.value })}
                  disabled={isSubmitting}
                  className="w-full h-8 rounded-input border border-border bg-white px-2 text-xs text-txt-primary cursor-pointer"
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="URGENT">URGENT</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-caption text-txt-secondary block font-medium">Pain Points & Need</label>
              <textarea
                rows={2}
                value={qualForm.painPoints}
                onChange={(e) => setQualForm({ ...qualForm, painPoints: e.target.value })}
                placeholder="What challenges are they solving?"
                disabled={isSubmitting}
                className="w-full rounded-input border border-border bg-white p-2 text-xs text-txt-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="text-caption text-txt-secondary block font-medium">Target Timeline Date</label>
              <input
                type="date"
                value={qualForm.timelineTargetDate}
                onChange={(e) => setQualForm({ ...qualForm, timelineTargetDate: e.target.value })}
                disabled={isSubmitting}
                className="w-full h-8 rounded-input border border-border bg-white px-2.5 text-xs text-txt-primary"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsQualModalOpen(false)}
                disabled={isSubmitting}
                className="h-8 text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="h-8 text-xs bg-[#57B71B] hover:bg-[#469815] text-white cursor-pointer"
              >
                {isSubmitting ? 'Saving...' : 'Save Qualification'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 11: CREATE DEAL */}
      <Dialog open={isDealModalOpen} onOpenChange={setIsDealModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-section-title text-txt-primary">Create Commercial Deal</DialogTitle>
            <DialogDescription className="text-xs text-txt-muted">
              Add a new commercial opportunity linked to this lead
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleDealSubmit} className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <label className="text-caption text-txt-secondary block font-medium">
                Deal Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={dealForm.title}
                onChange={(e) => setDealForm({ ...dealForm, title: e.target.value })}
                placeholder="e.g. Enterprise Solution Package"
                disabled={isSubmitting}
                className="w-full h-8 rounded-input border border-border bg-white px-2.5 text-xs text-txt-primary"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-caption text-txt-secondary block font-medium">
                  Deal Value (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={dealForm.value}
                  onChange={(e) => setDealForm({ ...dealForm, value: Number(e.target.value) })}
                  disabled={isSubmitting}
                  className="w-full h-8 rounded-input border border-border bg-white px-2.5 text-xs text-txt-primary tabular-nums"
                />
              </div>

              <div className="space-y-1">
                <label className="text-caption text-txt-secondary block font-medium">Pipeline Stage</label>
                <CustomSelect
                  value={dealForm.stageId}
                  onChange={(val) => setDealForm({ ...dealForm, stageId: val })}
                  disabled={isSubmitting}
                  options={stages.map((stage) => ({
                    value: stage.id,
                    label: stage.name,
                  }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-caption text-txt-secondary block font-medium">Probability (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={dealForm.probability}
                  onChange={(e) => setDealForm({ ...dealForm, probability: Number(e.target.value) })}
                  disabled={isSubmitting}
                  className="w-full h-8 rounded-input border border-border bg-white px-2.5 text-xs text-txt-primary tabular-nums"
                />
              </div>

              <div className="space-y-1">
                <label className="text-caption text-txt-secondary block font-medium">Expected Close Date</label>
                <input
                  type="date"
                  value={dealForm.expectedCloseDate}
                  onChange={(e) => setDealForm({ ...dealForm, expectedCloseDate: e.target.value })}
                  disabled={isSubmitting}
                  className="w-full h-8 rounded-input border border-border bg-white px-2.5 text-xs text-txt-primary"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsDealModalOpen(false)}
                disabled={isSubmitting}
                className="h-8 text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="h-8 text-xs bg-[#57B71B] hover:bg-[#469815] text-white cursor-pointer"
              >
                {isSubmitting ? 'Creating...' : 'Create Deal'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
