import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/common/PageHeader';
import { FilterPills, FilterOption } from '@/components/common/FilterPills';
import { SearchInput } from '@/components/common/SearchInput';
import { EmptyState } from '@/components/common/EmptyState';
import { MetricCard } from '@/components/common/MetricCard';
import { ActionMenu } from '@/components/common/ActionMenu';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { crmApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import {
  MeetingItem,
  MeetingStatus,
  MeetingType,
  CreateMeetingPayload,
} from '@/types/crm';
import {
  formatDate,
  cn,
  getLocalDateString,
  isTimeOver,
  formatDisplayTime,
  getCurrentFormattedTime,
} from '@/lib/utils';
import {
  WhatsAppShareButton,
  WhatsAppIcon,
} from '@/components/meetings/WhatsAppShareButton';
import {
  isValidMeetingUrl,
  normalizeMeetingUrl,
  getMeetingPlatformInfo,
  parseDurationToMinutes,
  openWhatsAppShare,
  generateAutomatedMeetUrl,
} from '@/components/meetings/meetingUtils';
import {
  PlusCircle,
  Video,
  MapPin,
  Clock,
  CheckCircle2,
  RotateCcw,
  AlertCircle,
  ExternalLink,
  Calendar,
  Table as TableIcon,
  LayoutGrid,
  FileText,
  Loader2,
  Trash2,
  Share2,
} from 'lucide-react';

const TIME_SLOTS_OPTIONS = (() => {
  const slots: { value: string; label: string }[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hh = String(h).padStart(2, '0');
      const mm = String(m).padStart(2, '0');
      const value = `${hh}:${mm}`;
      const period = h >= 12 ? 'PM' : 'AM';
      const displayH = h % 12 === 0 ? 12 : h % 12;
      const label = `${String(displayH).padStart(2, '0')}:${mm} ${period}`;
      slots.push({ value, label });
    }
  }
  return slots;
})();

export const MeetingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [hostFilter, setHostFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Modals state
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isManualTime, setIsManualTime] = useState(false);
  const [outcomeModalMeeting, setOutcomeModalMeeting] = useState<MeetingItem | null>(null);
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingItem | null>(null);
  const [urlValidationError, setUrlValidationError] = useState<string | null>(null);
  const [shareValidationError, setShareValidationError] = useState<string | null>(null);
  const [isCustomMessage, setIsCustomMessage] = useState(false);
  const [customMessageText, setCustomMessageText] = useState('');

  // Form states (starts with empty time so user selects allocated time)
  const [newMeetingForm, setNewMeetingForm] = useState({
    title: '',
    leadId: '',
    meetingType: 'DEMO' as MeetingType,
    date: getLocalDateString(),
    time: '',
    duration: '45 min',
    meetingUrl: '',
    notes: '',
  });

  const defaultIntroText = useMemo(() => {
    const formattedStartTime = newMeetingForm.time
      ? formatDisplayTime(newMeetingForm.time)
      : '[Start Time]';
    const platform = getMeetingPlatformInfo(newMeetingForm.meetingUrl);
    const platformName = platform.isOnline
      ? (platform.platformName === 'Google Meet' ? 'Google Meet' : platform.platformName)
      : 'Google Meet';
    return `As informed, I’ll be available to meet you all today. I’ve created a ${platformName} for the discussion. Sharing the meeting link below, please join at ${formattedStartTime}.`;
  }, [newMeetingForm.time, newMeetingForm.meetingUrl]);

  const handleStartTimeChange = (newTime: string) => {
    setNewMeetingForm((prev) => ({ ...prev, time: newTime }));
    if (formError) setFormError(null);
    if (shareValidationError) setShareValidationError(null);

    // Keep the time in custom text synchronized if the user is editing it
    if (isCustomMessage && customMessageText) {
      const formatted = newTime ? formatDisplayTime(newTime) : '[Start Time]';
      const updated = customMessageText.replace(
        /(join at\s+)[^.\n]+/i,
        `$1${formatted}`
      );
      setCustomMessageText(updated);
    }
  };

  const handleOpenScheduleModal = () => {
    setNewMeetingForm({
      title: '',
      leadId: '',
      meetingType: 'DEMO',
      date: getLocalDateString(),
      time: '',
      duration: '45 min',
      notes: '',
      meetingUrl: '',
    });
    setIsManualTime(false);
    setIsCustomMessage(false);
    setCustomMessageText('');
    setUrlValidationError(null);
    setShareValidationError(null);
    setFormError(null);
    setIsScheduleModalOpen(true);
  };

  const handleMeetingDateChange = (newDate: string) => {
    setNewMeetingForm((prev) => ({ ...prev, date: newDate }));
    if (formError) setFormError(null);
  };

  const [outcomeForm, setOutcomeForm] = useState({
    status: 'COMPLETED' as MeetingStatus,
    outcomeSummary: '',
    nextStepNotes: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Real backend Queries
  const {
    data: meetingsResponse,
    isLoading: isMeetingsLoading,
    isError: isMeetingsError,
    error: meetingsError,
    refetch: refetchMeetings,
  } = useQuery({
    queryKey: ['meetings'],
    queryFn: () => crmApi.getMeetings({ limit: 100 }),
  });

  const { data: leadsResponse } = useQuery({
    queryKey: ['leads'],
    queryFn: () => crmApi.getLeads({ limit: 100 }),
  });

  const leads = useMemo(() => {
    return (
      leadsResponse?.items ||
      leadsResponse?.leads ||
      (Array.isArray(leadsResponse?.data) ? leadsResponse?.data : leadsResponse?.data?.items) ||
      []
    );
  }, [leadsResponse]);

  // Map Backend Meetings to frontend MeetingItem models
  const rawMeetings = useMemo(() => {
    return (
      meetingsResponse?.data ||
      meetingsResponse?.items ||
      (Array.isArray(meetingsResponse) ? meetingsResponse : [])
    );
  }, [meetingsResponse]);

  const meetings: MeetingItem[] = useMemo(() => {
    return rawMeetings.map((m: any) => {
      let meetingType: MeetingType = 'MEETING';
      if (['MEETING', 'DEMO', 'DISCOVERY', 'FOLLOW_UP'].includes(m.meetingType)) {
        meetingType = m.meetingType as MeetingType;
      }

      let status: MeetingStatus = 'SCHEDULED';
      if (['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(m.status)) {
        status = m.status as MeetingStatus;
      }

      const startTime = m.startTime;
      const endTime = m.endTime;
      const date = startTime ? formatDate(startTime) : '—';
      const time = startTime
        ? new Date(startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '—';

      let duration = '45 min';
      if (startTime && endTime) {
        const diffMins = Math.round(
          (new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000
        );
        if (diffMins > 0) {
          if (diffMins % 60 === 0 && diffMins >= 60) {
            duration = `${diffMins / 60} ${diffMins === 60 ? 'hour' : 'hours'}`;
          } else {
            duration = `${diffMins} min`;
          }
        }
      }

      const leadFullName = m.lead?.fullName;
      const leadCompanyName = m.lead?.companyName;
      const leadPhone =
        m.lead?.phone ||
        leads.find((l: any) => l.id === m.leadId)?.phone ||
        undefined;

      return {
        id: m.id,
        title: m.title,
        description: m.description || undefined,
        leadId: m.leadId || undefined,
        leadName: leadFullName || 'General Prospect',
        leadPhone,
        companyName: leadCompanyName || 'Lead Company',
        dealId: m.dealId || undefined,
        dealTitle: m.deal?.title || undefined,
        meetingType,
        date,
        time,
        duration,
        hostName: m.owner?.name || m.creator?.name || 'Administrator',
        meetingUrl: m.location || undefined,
        location: m.location || undefined,
        status,
        outcomeSummary: m.outcome || undefined,
        nextStepNotes: m.notes || undefined,
        notes: m.notes || undefined,
        startTime,
        endTime,
      };
    });
  }, [rawMeetings, leads]);

  // Derived counts
  const upcomingCount = useMemo(
    () => meetings.filter((m) => m.status === 'SCHEDULED').length,
    [meetings]
  );
  const completedCount = useMemo(
    () => meetings.filter((m) => m.status === 'COMPLETED').length,
    [meetings]
  );
  const noShowCount = useMemo(
    () => meetings.filter((m) => m.status === 'NO_SHOW').length,
    [meetings]
  );
  const cancelledCount = useMemo(
    () => meetings.filter((m) => m.status === 'CANCELLED').length,
    [meetings]
  );

  // Filter options
  const filterOptions: FilterOption[] = useMemo(() => {
    return [
      { id: 'ALL', label: 'All', count: meetings.length },
      { id: 'SCHEDULED', label: 'Upcoming', count: upcomingCount, countVariant: 'info' },
      { id: 'COMPLETED', label: 'Completed', count: completedCount },
      { id: 'NO_SHOW', label: 'No-Show', count: noShowCount, countVariant: 'danger' },
      { id: 'CANCELLED', label: 'Cancelled', count: cancelledCount, countVariant: 'warning' },
    ];
  }, [meetings.length, upcomingCount, completedCount, noShowCount, cancelledCount]);

  // Unique hosts
  const uniqueHosts = useMemo(() => {
    return Array.from(new Set(meetings.map((m) => m.hostName).filter(Boolean)));
  }, [meetings]);

  // Filtered meetings
  const filteredMeetings = useMemo(() => {
    return meetings.filter((m) => {
      if (statusFilter !== 'ALL' && m.status !== statusFilter) return false;
      if (typeFilter !== 'ALL' && m.meetingType !== typeFilter) return false;
      if (hostFilter !== 'ALL' && m.hostName !== hostFilter) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = m.title.toLowerCase().includes(query);
        const matchesLead = m.leadName.toLowerCase().includes(query);
        const matchesCompany = m.companyName.toLowerCase().includes(query);
        const matchesHost = m.hostName.toLowerCase().includes(query);
        if (!matchesTitle && !matchesLead && !matchesCompany && !matchesHost) {
          return false;
        }
      }

      return true;
    });
  }, [meetings, statusFilter, typeFilter, hostFilter, searchQuery]);

  const resetAllFilters = () => {
    setStatusFilter('ALL');
    setTypeFilter('ALL');
    setHostFilter('ALL');
    setSearchQuery('');
  };

  const isFiltered =
    statusFilter !== 'ALL' ||
    typeFilter !== 'ALL' ||
    hostFilter !== 'ALL' ||
    searchQuery.trim() !== '';

  const getStatusBadge = (status: MeetingStatus) => {
    switch (status) {
      case 'SCHEDULED':
        return <Badge variant="info">Upcoming</Badge>;
      case 'COMPLETED':
        return <Badge variant="success">Completed</Badge>;
      case 'NO_SHOW':
        return <Badge variant="danger">No-Show</Badge>;
      case 'CANCELLED':
        return <Badge variant="neutral">Cancelled</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: MeetingType) => {
    switch (type) {
      case 'DEMO':
        return <Badge variant="tech">Technical Demo</Badge>;
      case 'DISCOVERY':
        return <Badge variant="info">Discovery Session</Badge>;
      case 'MEETING':
        return <Badge variant="warning">Commercial Negotiation</Badge>;
      case 'FOLLOW_UP':
        return <Badge variant="neutral">Proposal Review</Badge>;
      default:
        return <Badge variant="neutral">{type}</Badge>;
    }
  };

  const parseDateTimeAndDuration = (
    dateStr: string,
    timeStr: string,
    durationStr: string
  ): { startTime: string; endTime: string } => {
    let startDate = new Date(`${dateStr}T10:00:00.000Z`);
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const ampm = match[3]?.toUpperCase();
      if (ampm === 'PM' && hours < 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
      const [y, m, d] = dateStr.split('-').map((v) => parseInt(v, 10));
      const localDate = new Date(y, m - 1, d, hours, minutes, 0, 0);
      if (!isNaN(localDate.getTime())) {
        startDate = localDate;
      }
    }

    const durationMinutes = parseDurationToMinutes(durationStr);
    const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
    return {
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
    };
  };

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMeetingForm.title.trim()) return;

    if (!newMeetingForm.time) {
      setFormError('Please choose or enter a meeting start time.');
      return;
    }

    if (isTimeOver(newMeetingForm.date, newMeetingForm.time)) {
      setFormError(
        `Time Over: ${formatDisplayTime(newMeetingForm.time)} has already passed today. Please select a time after ${getCurrentFormattedTime()}.`
      );
      return;
    }

    // Validate meeting URL if input looks like a link
    const urlTrim = newMeetingForm.meetingUrl.trim();
    if (urlTrim && (urlTrim.includes('://') || urlTrim.startsWith('meet.') || urlTrim.includes('.com') || urlTrim.includes('.us') || urlTrim.includes('.me'))) {
      if (!isValidMeetingUrl(urlTrim)) {
        setFormError(
          'Please enter a valid meeting URL (e.g. https://meet.google.com/iqi-qsmu-muu, https://zoom.us/j/..., or Microsoft Teams link).'
        );
        return;
      }
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const { startTime, endTime } = parseDateTimeAndDuration(
        newMeetingForm.date,
        newMeetingForm.time,
        newMeetingForm.duration
      );

      const finalLocation = urlTrim
        ? (isValidMeetingUrl(urlTrim) ? normalizeMeetingUrl(urlTrim) : urlTrim)
        : generateAutomatedMeetUrl();

      const payload: CreateMeetingPayload = {
        title: newMeetingForm.title.trim(),
        description: newMeetingForm.notes.trim() || undefined,
        meetingType: newMeetingForm.meetingType,
        startTime,
        endTime,
        location: finalLocation,
        leadId: newMeetingForm.leadId || undefined,
      };

      await crmApi.createMeeting(payload);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['meetings'] }),
        queryClient.invalidateQueries({ queryKey: ['activities'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-activities'] }),
        queryClient.invalidateQueries({ queryKey: ['leads'] }),
        queryClient.invalidateQueries({ queryKey: ['deals'] }),
        queryClient.invalidateQueries({ queryKey: ['pipeline-stages'] }),
      ]);

      setIsScheduleModalOpen(false);

      setNewMeetingForm({
        title: '',
        leadId: '',
        meetingType: 'DEMO',
        date: getLocalDateString(),
        time: '',
        duration: '45 min',
        meetingUrl: '',
        notes: '',
      });
      setUrlValidationError(null);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to schedule demo. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveOutcome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!outcomeModalMeeting) return;

    setIsSubmitting(true);
    setFormError(null);

    try {
      if (outcomeForm.status === 'COMPLETED') {
        await crmApi.completeMeeting(outcomeModalMeeting.id, {
          outcome: outcomeForm.outcomeSummary.trim() || undefined,
          notes: outcomeForm.nextStepNotes.trim() || undefined,
          createActivity: true,
        });
      } else if (outcomeForm.status === 'CANCELLED') {
        await crmApi.cancelMeeting(outcomeModalMeeting.id, {
          cancelReason: outcomeForm.outcomeSummary.trim() || 'Cancelled by client or host',
          notes: outcomeForm.nextStepNotes.trim() || undefined,
        });
      } else if (outcomeForm.status === 'NO_SHOW') {
        await crmApi.markMeetingNoShow(outcomeModalMeeting.id);
      } else {
        // Fallback or update
        await crmApi.updateMeeting(outcomeModalMeeting.id, {
          status: outcomeForm.status,
          outcome: outcomeForm.outcomeSummary.trim() || undefined,
          notes: outcomeForm.nextStepNotes.trim() || undefined,
        });
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['meetings'] }),
        queryClient.invalidateQueries({ queryKey: ['activities'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-activities'] }),
        queryClient.invalidateQueries({ queryKey: ['leads'] }),
        queryClient.invalidateQueries({ queryKey: ['deals'] }),
        queryClient.invalidateQueries({ queryKey: ['pipeline-stages'] }),
      ]);

      setOutcomeModalMeeting(null);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to save meeting outcome.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    if (!window.confirm('Are you sure you want to delete this meeting?')) return;
    try {
      await crmApi.deleteMeeting(meetingId);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['meetings'] }),
        queryClient.invalidateQueries({ queryKey: ['activities'] }),
        queryClient.invalidateQueries({ queryKey: ['leads'] }),
      ]);
      if (selectedMeeting?.id === meetingId) {
        setSelectedMeeting(null);
      }
    } catch (err: any) {
      console.error('Failed to delete meeting:', err);
    }
  };

  const openOutcomeModal = (meeting: MeetingItem) => {
    setOutcomeModalMeeting(meeting);
    setFormError(null);
    setOutcomeForm({
      status: meeting.status === 'SCHEDULED' ? 'COMPLETED' : meeting.status,
      outcomeSummary: meeting.outcomeSummary || '',
      nextStepNotes: meeting.nextStepNotes || '',
    });
  };

  if (isMeetingsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-[#57B71B]" />
        <p className="text-sm text-txt-muted">Loading meetings and demonstrations...</p>
      </div>
    );
  }

  if (isMeetingsError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 p-6 text-center">
        <AlertCircle className="h-10 w-10 text-red-500" />
        <h3 className="text-base font-semibold text-txt-primary">Failed to load meetings</h3>
        <p className="text-xs text-txt-muted max-w-sm">
          {meetingsError instanceof Error
            ? meetingsError.message
            : 'Network error loading meetings from PostgreSQL backend.'}
        </p>
        <Button size="sm" onClick={() => refetchMeetings()}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 select-none max-w-full">
      {/* 1. Page Header */}
      <PageHeader
        title="Meetings & Demos"
        count={`${meetings.length} sessions`}
        badge={upcomingCount > 0 ? `${upcomingCount} upcoming` : 'all clear'}
        badgeVariant={upcomingCount > 0 ? 'brand' : 'neutral'}
        actions={
          <div className="flex items-center gap-2">
            {/* View Switcher: Table vs Grid */}
            <div className="flex items-center rounded-btn border border-border bg-white p-0.5 shadow-subtle">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-btn transition-colors cursor-pointer',
                  viewMode === 'table'
                    ? 'bg-[#16181B] text-white'
                    : 'text-txt-secondary hover:text-txt-primary'
                )}
                title="Spreadsheet Table View"
              >
                <TableIcon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Table</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-btn transition-colors cursor-pointer',
                  viewMode === 'grid'
                    ? 'bg-[#16181B] text-white'
                    : 'text-txt-secondary hover:text-txt-primary'
                )}
                title="Cards Grid View"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Grid</span>
              </button>
            </div>

            <Button
              size="sm"
              className="h-8 text-xs bg-[#57B71B] hover:bg-[#469815] text-white font-semibold cursor-pointer shrink-0"
              onClick={handleOpenScheduleModal}
            >
              <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
              Schedule Demo
            </Button>
          </div>
        }
      />

      {/* 2. Metric Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Total Sessions"
          value={meetings.length}
          subtext="Lifetime scheduled"
          icon={Calendar}
          iconVariant="neutral"
          onClick={() => setStatusFilter('ALL')}
          className={
            statusFilter === 'ALL' && !isFiltered ? 'border-[#57B71B] ring-1 ring-[#57B71B]/30' : ''
          }
        />
        <MetricCard
          label="Upcoming / Demos"
          value={upcomingCount}
          subtext="Requires demo prep"
          icon={Clock}
          iconVariant="info"
          onClick={() => setStatusFilter('SCHEDULED')}
          className={
            statusFilter === 'SCHEDULED' ? 'border-[#57B71B] ring-1 ring-[#57B71B]/30' : ''
          }
        />
        <MetricCard
          label="Completed Sessions"
          value={completedCount}
          subtext="Outcomes logged"
          icon={CheckCircle2}
          iconVariant="success"
          onClick={() => setStatusFilter('COMPLETED')}
          className={
            statusFilter === 'COMPLETED' ? 'border-[#16A34A] ring-1 ring-[#16A34A]/30' : ''
          }
        />
        <MetricCard
          label="No-Show Rate"
          value={
            meetings.length > 0 ? `${Math.round((noShowCount / meetings.length) * 100)}%` : '0%'
          }
          subtext={`${noShowCount} missed attendance`}
          icon={AlertCircle}
          iconVariant="danger"
          onClick={() => setStatusFilter('NO_SHOW')}
          className={statusFilter === 'NO_SHOW' ? 'border-[#DC2626] ring-1 ring-[#DC2626]/30' : ''}
        />
      </div>

      {/* 3. Compact Toolbar & Filter Pills */}
      <div className="flex flex-col gap-2.5 sm:gap-3 p-3 rounded-card border border-border bg-white shadow-none">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search meetings by title, prospect, host..."
            className="w-full sm:w-80"
          />

          <div className="flex items-center gap-2 flex-wrap">
            {/* Host Filter */}
            <select
              value={hostFilter}
              onChange={(e) => setHostFilter(e.target.value)}
              className="h-8 rounded-input border border-border bg-white px-2.5 text-xs text-txt-secondary focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer shadow-subtle"
            >
              <option value="ALL">All Hosts</option>
              {uniqueHosts.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-8 rounded-input border border-border bg-white px-2.5 text-xs text-txt-secondary focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer shadow-subtle"
            >
              <option value="ALL">All Types</option>
              <option value="DEMO">Technical Demo</option>
              <option value="DISCOVERY">Discovery Session</option>
              <option value="MEETING">Commercial Meeting</option>
              <option value="FOLLOW_UP">Proposal Review</option>
            </select>

            {isFiltered && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetAllFilters}
                className="h-8 text-xs text-txt-muted hover:text-txt-primary cursor-pointer px-2"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* Filter Pills */}
        <FilterPills options={filterOptions} activeId={statusFilter} onChange={setStatusFilter} />
      </div>

      {/* 4. Main Meeting List Representation */}
      {filteredMeetings.length === 0 ? (
        <div className="p-8 bg-white rounded-card border border-border">
          <EmptyState
            icon={Calendar}
            title="No meeting records found"
            description="No scheduled demos match your active criteria. Try clearing filters or schedule a demo."
            actionLabel={isFiltered ? 'Reset filters' : 'Schedule Demo'}
            onAction={isFiltered ? resetAllFilters : handleOpenScheduleModal}
          />
        </div>
      ) : viewMode === 'table' ? (
        <div className="space-y-4">
          <div className="hidden sm:block rounded-card border border-border bg-white overflow-hidden shadow-none">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/60">
                  <TableRow>
                    <TableHead className="py-2.5 text-xs font-bold text-txt-muted uppercase">
                      Status
                    </TableHead>
                    <TableHead className="py-2.5 text-xs font-bold text-txt-muted uppercase">
                      Meeting / Demo Title
                    </TableHead>
                    <TableHead className="py-2.5 text-xs font-bold text-txt-muted uppercase">
                      Prospect & Company
                    </TableHead>
                    <TableHead className="py-2.5 text-xs font-bold text-txt-muted uppercase">
                      Date & Time
                    </TableHead>
                    <TableHead className="py-2.5 text-xs font-bold text-txt-muted uppercase">
                      Type
                    </TableHead>
                    <TableHead className="py-2.5 text-xs font-bold text-txt-muted uppercase">
                      Host
                    </TableHead>
                    <TableHead className="py-2.5 text-xs font-bold text-txt-muted uppercase">
                      Link / Location
                    </TableHead>
                    <TableHead className="py-2.5 text-xs font-bold text-txt-muted uppercase text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMeetings.map((m) => (
                    <TableRow key={m.id} className="hover:bg-slate-50/80 transition-colors">
                      <TableCell className="py-2.5">{getStatusBadge(m.status)}</TableCell>
                      <TableCell className="py-2.5">
                        <button
                          type="button"
                          onClick={() => setSelectedMeeting(m)}
                          className="font-bold text-xs text-txt-primary hover:text-[#57B71B] transition-colors truncate max-w-[220px] text-left block cursor-pointer"
                        >
                          {m.title}
                        </button>
                      </TableCell>
                      <TableCell className="py-2.5">
                        <div className="text-xs">
                          {m.leadId ? (
                            <Link
                              to="/leads"
                              className="font-medium text-txt-primary hover:text-[#57B71B] transition-colors truncate block"
                            >
                              {m.leadName}
                            </Link>
                          ) : (
                            <span className="font-medium text-txt-primary truncate block">
                              {m.leadName}
                            </span>
                          )}
                          <span className="text-[11px] text-txt-muted truncate block">
                            {m.companyName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2.5">
                        <div className="text-xs font-semibold tabular-nums text-txt-primary">
                          <span>{m.time}</span>
                          <span className="text-[10px] text-txt-muted block font-normal">
                            {m.date} ({m.duration})
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2.5">{getTypeBadge(m.meetingType)}</TableCell>
                      <TableCell className="py-2.5 text-xs text-txt-secondary font-medium">
                        {m.hostName}
                      </TableCell>
                      <TableCell className="py-2.5">
                        {m.meetingUrl ? (
                          (() => {
                            const platform = getMeetingPlatformInfo(m.meetingUrl);
                            return platform.isOnline ? (
                              <a
                                href={normalizeMeetingUrl(m.meetingUrl)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-btn bg-slate-50 border border-border text-[11px] font-mono text-txt-secondary hover:text-[#57B71B] hover:border-[#57B71B] transition-colors"
                              >
                                <Video className="h-3 w-3 text-primary shrink-0" />
                                <span className="truncate max-w-[120px]">
                                  {m.meetingUrl.replace(/^https?:\/\//, '')}
                                </span>
                                <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                              </a>
                            ) : (
                              <div
                                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-btn bg-slate-50 border border-border text-[11px] text-txt-secondary"
                                title={m.meetingUrl}
                              >
                                <MapPin className="h-3 w-3 text-amber-600 shrink-0" />
                                <span className="truncate max-w-[130px]">{m.meetingUrl}</span>
                              </div>
                            );
                          })()
                        ) : (
                          <span className="text-[11px] text-txt-muted italic">No link</span>
                        )}
                      </TableCell>
                      <TableCell className="py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <WhatsAppShareButton
                            meeting={m}
                            size="icon"
                            variant="outline"
                          />
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => openOutcomeModal(m)}
                            className="h-7 text-xs px-2.5 bg-slate-100 hover:bg-slate-200 text-txt-primary font-semibold cursor-pointer"
                          >
                            {m.status === 'SCHEDULED' ? 'Log Outcome' : 'Outcome'}
                          </Button>
                          <ActionMenu
                            items={[
                              {
                                label: 'Share via WhatsApp',
                                icon: WhatsAppIcon as any,
                                onClick: () => openWhatsAppShare(m, m.leadPhone),
                              },
                              {
                                label: 'View Details',
                                icon: FileText,
                                onClick: () => setSelectedMeeting(m),
                              },
                              {
                                label: 'Log Outcome',
                                icon: CheckCircle2,
                                onClick: () => openOutcomeModal(m),
                              },
                              {
                                label: 'Delete Meeting',
                                icon: Trash2,
                                variant: 'danger',
                                onClick: () => handleDeleteMeeting(m.id),
                              },
                            ]}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Mobile Stacked Representation (for width <= 640px) */}
          <div className="sm:hidden space-y-2.5">
            {filteredMeetings.map((m) => (
              <div
                key={m.id}
                className="rounded-card border border-border bg-white p-3.5 space-y-2.5 shadow-none"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {getStatusBadge(m.status)}
                    {getTypeBadge(m.meetingType)}
                  </div>
                  <span className="text-[11px] font-semibold text-txt-muted tabular-nums flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {m.time}
                  </span>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => setSelectedMeeting(m)}
                    className="font-bold text-xs text-txt-primary hover:text-[#57B71B] text-left block"
                  >
                    {m.title}
                  </button>
                  <div className="flex items-center gap-2 text-[11px] text-txt-secondary mt-0.5">
                    <span className="font-medium text-txt-primary">{m.leadName}</span>
                    <span>•</span>
                    <span className="text-txt-muted">{m.companyName}</span>
                  </div>
                </div>

                {m.meetingUrl && (
                  (() => {
                    const platform = getMeetingPlatformInfo(m.meetingUrl);
                    return platform.isOnline ? (
                      <a
                        href={normalizeMeetingUrl(m.meetingUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 text-xs bg-slate-50 border border-border p-2 rounded-btn hover:border-[#57B71B] transition-colors"
                      >
                        <Video className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="truncate font-mono text-[11px] text-txt-secondary hover:text-[#57B71B]">
                          {m.meetingUrl}
                        </span>
                        <ExternalLink className="h-2.5 w-2.5 text-txt-muted ml-auto shrink-0" />
                      </a>
                    ) : (
                      <div className="flex items-center gap-2 text-xs bg-slate-50 border border-border p-2 rounded-btn">
                        <MapPin className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                        <span className="truncate text-[11px] text-txt-secondary">
                          {m.meetingUrl}
                        </span>
                      </div>
                    );
                  })()
                )}

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-txt-muted">Host: {m.hostName}</span>
                  <div className="flex items-center gap-1.5">
                    <WhatsAppShareButton
                      meeting={m}
                      variant="solid"
                    />
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => openOutcomeModal(m)}
                      className="h-7 text-xs px-2.5 bg-slate-100 hover:bg-slate-200 text-txt-primary font-semibold"
                    >
                      {m.status === 'SCHEDULED' ? 'Log Outcome' : 'Outcome'}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Alternative Grid Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredMeetings.map((m) => (
            <div
              key={m.id}
              className="rounded-card border border-border bg-white hover:border-slate-300 transition-colors shadow-none flex flex-col justify-between"
            >
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {getStatusBadge(m.status)}
                    {getTypeBadge(m.meetingType)}
                  </div>
                  <span className="text-[11px] font-semibold text-txt-muted tabular-nums flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {m.time}
                  </span>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => setSelectedMeeting(m)}
                    className="font-bold text-sm text-txt-primary hover:text-[#57B71B] transition-colors text-left block truncate w-full"
                  >
                    {m.title}
                  </button>
                  <p className="text-xs text-txt-secondary mt-0.5">
                    {m.leadName} &bull; <span className="text-txt-muted">{m.companyName}</span>
                  </p>
                </div>

                <div className="p-2.5 rounded-btn bg-slate-50 border border-slate-100 text-xs space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-txt-muted">Date:</span>
                    <span className="font-semibold text-txt-primary">{m.date}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-txt-muted">Duration:</span>
                    <span className="font-semibold text-txt-primary">{m.duration}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-txt-muted">Host:</span>
                    <span className="font-semibold text-txt-primary">{m.hostName}</span>
                  </div>
                </div>

                {m.meetingUrl && (
                  (() => {
                    const platform = getMeetingPlatformInfo(m.meetingUrl);
                    return platform.isOnline ? (
                      <div className="flex items-center gap-2 text-xs bg-slate-50 border border-border p-2 rounded-btn">
                        <Video className="h-3.5 w-3.5 text-primary shrink-0" />
                        <a
                          href={normalizeMeetingUrl(m.meetingUrl)}
                          target="_blank"
                          rel="noreferrer"
                          className="truncate font-mono text-[11px] text-txt-secondary hover:text-[#57B71B]"
                        >
                          {m.meetingUrl.replace(/^https?:\/\//, '')}
                        </a>
                        <ExternalLink className="h-2.5 w-2.5 text-txt-muted ml-auto shrink-0" />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs bg-slate-50 border border-border p-2 rounded-btn">
                        <MapPin className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                        <span className="truncate text-[11px] text-txt-secondary">
                          {m.meetingUrl}
                        </span>
                      </div>
                    );
                  })()
                )}
              </div>

              <div className="p-3 px-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedMeeting(m)}
                  className="h-7 text-xs px-2 text-txt-secondary hover:text-txt-primary cursor-pointer"
                >
                  Details
                </Button>
                <div className="flex items-center gap-1.5">
                  <WhatsAppShareButton
                    meeting={m}
                    variant="solid"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openOutcomeModal(m)}
                    className="h-7 text-xs px-2.5 bg-white font-semibold cursor-pointer"
                  >
                    {m.status === 'SCHEDULED' ? 'Log Outcome' : 'Outcome'}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 5. Schedule Demo Modal */}
      <Dialog open={isScheduleModalOpen} onOpenChange={setIsScheduleModalOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-txt-primary">
              Schedule Meeting / Demo
            </DialogTitle>
            <DialogDescription className="text-xs text-txt-muted">
              Book a live product walkthrough, technical discovery, or negotiation session.
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="p-2.5 text-xs bg-red-50 text-red-600 rounded-md border border-red-200 flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleCreateMeeting} className="space-y-3.5 pt-1 pb-0">
            <div className="space-y-1">
              <label className="h-5 text-xs font-semibold text-txt-primary flex items-center">
                Meeting Title <span className="text-red-500 ml-0.5">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Omnichannel Retail App Architecture Demo"
                value={newMeetingForm.title}
                onChange={(e) => setNewMeetingForm({ ...newMeetingForm, title: e.target.value })}
                className="w-full h-8 px-2.5 text-xs rounded-input border border-border bg-white text-txt-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-subtle"
              />
            </div>

            <div className="space-y-1">
              <label className="h-5 text-xs font-semibold text-txt-primary flex items-center">Related Prospect / Lead</label>
              <select
                value={newMeetingForm.leadId}
                onChange={(e) => setNewMeetingForm({ ...newMeetingForm, leadId: e.target.value })}
                className="w-full h-8 px-2 text-xs rounded-input border border-border bg-white text-txt-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-subtle cursor-pointer"
              >
                <option value="">None / General Session</option>
                {leads.map((lead: any) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.companyName ? `${lead.companyName}${lead.fullName ? ` (${lead.fullName})` : ''}` : lead.fullName || 'Prospect'} {lead.phone ? `• ${lead.phone}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 xs:grid-cols-2 gap-2.5 sm:gap-3">
              <div className="space-y-1">
                <label className="h-5 text-xs font-semibold text-txt-primary flex items-center">Session Modality</label>
                <select
                  value={newMeetingForm.meetingType}
                  onChange={(e) =>
                    setNewMeetingForm({
                      ...newMeetingForm,
                      meetingType: e.target.value as MeetingType,
                    })
                  }
                  className="w-full h-8 px-2 text-xs rounded-input border border-border bg-white text-txt-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-subtle cursor-pointer"
                >
                  <option value="DEMO">Technical Demo</option>
                  <option value="DISCOVERY">Discovery Session</option>
                  <option value="MEETING">Commercial Meeting</option>
                  <option value="FOLLOW_UP">Proposal Review</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="h-5 text-xs font-semibold text-txt-primary flex items-center">Duration</label>
                <select
                  value={newMeetingForm.duration}
                  onChange={(e) =>
                    setNewMeetingForm({ ...newMeetingForm, duration: e.target.value })
                  }
                  className="w-full h-8 px-2 text-xs rounded-input border border-border bg-white text-txt-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-subtle cursor-pointer"
                >
                  <option value="30 min">30 min</option>
                  <option value="45 min">45 min</option>
                  <option value="60 min">60 min (1 hr)</option>
                  <option value="90 min">90 min (1.5 hrs)</option>
                  <option value="2 hours">2 hours</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 xs:grid-cols-2 gap-2.5 sm:gap-3 items-start">
              <div className="space-y-1">
                <label className="h-5 text-xs font-semibold text-txt-primary flex items-center">
                  Date <span className="text-red-500 ml-0.5">*</span>
                </label>
                <input
                  type="date"
                  required
                  min={getLocalDateString()}
                  value={newMeetingForm.date}
                  onChange={(e) => handleMeetingDateChange(e.target.value)}
                  className="w-full h-8 px-2 text-xs rounded-input border border-border bg-white text-txt-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-subtle cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <label className="h-5 text-xs font-semibold text-txt-primary flex items-center justify-between">
                  <span>Start Time <span className="text-red-500 ml-0.5">*</span></span>
                  <button
                    type="button"
                    onClick={() => setIsManualTime(!isManualTime)}
                    className="text-[10px] text-[#57B71B] hover:underline font-semibold cursor-pointer"
                  >
                    {isManualTime ? 'Pick from list' : 'Type custom time'}
                  </button>
                </label>
                {isManualTime ? (
                  <input
                    type="time"
                    required
                    value={newMeetingForm.time}
                    onChange={(e) => handleStartTimeChange(e.target.value)}
                    className={cn(
                      'w-full h-8 px-2 text-xs rounded-input border bg-white text-txt-primary focus:outline-none focus:ring-1 shadow-subtle cursor-pointer',
                      newMeetingForm.time && isTimeOver(newMeetingForm.date, newMeetingForm.time)
                        ? 'border-red-500 text-red-600 focus:ring-red-500 focus:border-red-500 bg-red-50/40'
                        : 'border-border focus:ring-primary focus:border-primary'
                    )}
                  />
                ) : (
                  <select
                    value={newMeetingForm.time}
                    required
                    onChange={(e) => handleStartTimeChange(e.target.value)}
                    className={cn(
                      'w-full h-8 px-2 text-xs rounded-input border bg-white text-txt-primary focus:outline-none focus:ring-1 shadow-subtle cursor-pointer',
                      newMeetingForm.time && isTimeOver(newMeetingForm.date, newMeetingForm.time)
                        ? 'border-red-500 text-red-600 focus:ring-red-500 focus:border-red-500 bg-red-50/40'
                        : 'border-border focus:ring-primary focus:border-primary'
                    )}
                  >
                    <option value="">-- Choose time (e.g. 10:00 AM) --</option>
                    {newMeetingForm.time && !TIME_SLOTS_OPTIONS.some((s) => s.value === newMeetingForm.time) && (
                      <option value={newMeetingForm.time}>
                        {formatDisplayTime(newMeetingForm.time)} (Current selection)
                      </option>
                    )}
                    {TIME_SLOTS_OPTIONS.map((slot) => (
                      <option key={slot.value} value={slot.value}>
                        {slot.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Red Overtime Warning Text Message Underneath */}
            {newMeetingForm.time && isTimeOver(newMeetingForm.date, newMeetingForm.time) && (
              <div className="p-2 rounded-btn bg-red-50 border border-red-200 text-red-700 text-[11px] leading-tight flex items-start gap-1.5 animate-in fade-in">
                <AlertCircle className="h-3.5 w-3.5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-red-800">
                    Time Over: {formatDisplayTime(newMeetingForm.time)} has already passed today!
                  </span>
                  <p className="text-[10px] text-red-600 mt-0.5 font-medium">
                    Please select a valid future time after {getCurrentFormattedTime()}.
                  </p>
                </div>
              </div>
            )}

            {/* Quick Time Presets */}
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              <span className="text-[10px] font-semibold text-txt-muted flex items-center gap-1">
                <Clock className="h-3 w-3 text-txt-muted" /> Quick suggestions:
              </span>
              <button
                type="button"
                onClick={() => {
                  const d = new Date(Date.now() + 30 * 60 * 1000);
                  const hh = String(d.getHours()).padStart(2, '0');
                  const mm = String(d.getMinutes()).padStart(2, '0');
                  setNewMeetingForm((p) => ({ ...p, date: getLocalDateString(d) }));
                  handleStartTimeChange(`${hh}:${mm}`);
                }}
                className="px-2 py-0.5 text-[10px] font-semibold rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              >
                +30 mins
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date(Date.now() + 60 * 60 * 1000);
                  const hh = String(d.getHours()).padStart(2, '0');
                  const mm = String(d.getMinutes()).padStart(2, '0');
                  setNewMeetingForm((p) => ({ ...p, date: getLocalDateString(d) }));
                  handleStartTimeChange(`${hh}:${mm}`);
                }}
                className="px-2 py-0.5 text-[10px] font-semibold rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              >
                +1 hour
              </button>
              <button
                type="button"
                onClick={() => {
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  setNewMeetingForm((p) => ({ ...p, date: getLocalDateString(tomorrow) }));
                  handleStartTimeChange('11:00');
                }}
                className="px-2 py-0.5 text-[10px] font-semibold rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              >
                Tomorrow 11:00 AM
              </button>
            </div>

            <div className="space-y-1">
              <label className="h-5 text-xs font-semibold text-txt-primary flex items-center">
                Meeting URL / Location
              </label>
              {/* Input + inline WhatsApp share icon */}
              <div className="relative flex items-center">
                <input
                  type="text"
                  placeholder="e.g. https://meet.google.com/abc-xyz-demo"
                  value={newMeetingForm.meetingUrl}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewMeetingForm({ ...newMeetingForm, meetingUrl: val });
                    if (shareValidationError) setShareValidationError(null);
                    const trimmed = val.trim();
                    if (trimmed && (trimmed.includes('://') || trimmed.startsWith('meet.') || trimmed.includes('.com') || trimmed.includes('.us') || trimmed.includes('.me'))) {
                      if (!isValidMeetingUrl(trimmed)) {
                        setUrlValidationError(
                          'Please enter a valid meeting URL (e.g. https://meet.google.com/abc-xyz-demo or https://zoom.us/j/...)'
                        );
                      } else {
                        setUrlValidationError(null);
                      }
                    } else {
                      setUrlValidationError(null);
                    }
                  }}
                  className={cn(
                    'w-full h-8 pl-2.5 pr-9 text-xs rounded-input border bg-white text-txt-primary focus:outline-none focus:ring-1 shadow-subtle',
                    urlValidationError || shareValidationError
                      ? 'border-red-500 focus:ring-red-500 bg-red-50/30'
                      : 'border-border focus:ring-primary'
                  )}
                />
                {/* WhatsApp Share Arrow Icon — inside the right edge of the input */}
                <button
                  type="button"
                  title="Share Meeting via WhatsApp"
                  aria-label="Share Meeting via WhatsApp"
                  onClick={(e) => {
                    e.stopPropagation();

                    // Check required fields and provide immediate inline feedback
                    const missing: string[] = [];
                    if (!newMeetingForm.meetingUrl.trim()) missing.push('Meeting URL');
                    if (!newMeetingForm.title.trim()) missing.push('Meeting Title');
                    if (!newMeetingForm.time) missing.push('Start Time');
                    if (!newMeetingForm.date) missing.push('Date');

                    if (missing.length > 0) {
                      setShareValidationError(`Please enter ${missing.join(', ')} before sharing via WhatsApp.`);
                      return;
                    }

                    if (!isValidMeetingUrl(newMeetingForm.meetingUrl.trim())) {
                      setShareValidationError('Please enter a valid Meeting URL before sharing.');
                      return;
                    }

                    // Clear any errors and trigger WhatsApp Click to Chat
                    setShareValidationError(null);
                    setUrlValidationError(null);
                    setFormError(null);

                    openWhatsAppShare({
                      title: newMeetingForm.title.trim(),
                      date: newMeetingForm.date,
                      time: newMeetingForm.time,
                      duration: newMeetingForm.duration,
                      meetingUrl: newMeetingForm.meetingUrl.trim(),
                      customIntroMessage: isCustomMessage && customMessageText.trim() ? customMessageText.trim() : undefined,
                    });
                  }}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-6 w-6 rounded hover:bg-slate-100 text-[#25D366] active:scale-95 transition-all cursor-pointer shrink-0"
                >
                  <Share2 className="h-4 w-4" />
                </button>
              </div>
              {shareValidationError && (
                <p className="text-[10px] text-red-600 font-medium animate-in fade-in flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  {shareValidationError}
                </p>
              )}
              {urlValidationError && !shareValidationError && (
                <p className="text-[10px] text-red-600 font-medium animate-in fade-in flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  {urlValidationError}
                </p>
              )}
            </div>

            {/* WhatsApp Invitation Text (Automated with Manual Type Option) */}
            <div className="space-y-1.5 p-2.5 rounded-card bg-slate-50/80 border border-slate-200/80">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-txt-primary flex items-center gap-1.5">
                  <span>WhatsApp Invitation Message</span>
                  <span className="text-[10px] text-txt-muted font-normal">
                    {isCustomMessage ? '(Manual Custom)' : '(Automated)'}
                  </span>
                </label>
                <div className="flex items-center gap-2">
                  {isCustomMessage && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomMessage(false);
                        setCustomMessageText('');
                      }}
                      className="text-[10px] text-txt-muted hover:text-txt-primary hover:underline cursor-pointer"
                    >
                      Reset to auto
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (!isCustomMessage) {
                        setIsCustomMessage(true);
                        setCustomMessageText(defaultIntroText);
                      } else {
                        setIsCustomMessage(false);
                      }
                    }}
                    className="text-[11px] text-[#57B71B] hover:text-[#469815] font-semibold hover:underline cursor-pointer"
                  >
                    {isCustomMessage ? 'Use automated text' : '✏️ Type manual text'}
                  </button>
                </div>
              </div>

              {isCustomMessage ? (
                <div className="space-y-1">
                  <textarea
                    rows={3}
                    placeholder="Type your manual WhatsApp message here..."
                    value={customMessageText}
                    onChange={(e) => setCustomMessageText(e.target.value)}
                    className="w-full p-2 text-xs rounded-input border border-border bg-white text-txt-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-subtle resize-none leading-relaxed"
                  />
                  <p className="text-[10px] text-txt-muted">
                    This manual text will be sent as the opening message when you share via WhatsApp.
                  </p>
                </div>
              ) : (
                <div className="flex items-start justify-between p-2 rounded-btn bg-white border border-slate-200/60 text-[11px] text-txt-secondary leading-relaxed">
                  <p className="line-clamp-2 italic text-txt-secondary">
                    "{defaultIntroText}"
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomMessage(true);
                      setCustomMessageText(defaultIntroText);
                    }}
                    className="text-[10px] text-[#57B71B] hover:text-[#469815] font-semibold hover:underline shrink-0 ml-2 cursor-pointer whitespace-nowrap pt-0.5"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="h-5 text-xs font-semibold text-txt-primary flex items-center">Host</label>
              <input
                type="text"
                disabled
                value={user?.name || 'Administrator'}
                className="w-full h-8 px-2.5 text-xs rounded-input border border-border bg-slate-50 text-txt-secondary cursor-not-allowed shadow-subtle"
              />
            </div>

            <div className="space-y-1">
              <label className="h-5 text-xs font-semibold text-txt-primary flex items-center">Agenda / Notes</label>
              <textarea
                rows={2}
                placeholder="Key discovery questions or architecture points to demonstrate..."
                value={newMeetingForm.notes}
                onChange={(e) => setNewMeetingForm({ ...newMeetingForm, notes: e.target.value })}
                className="w-full p-2 text-xs rounded-input border border-border bg-white text-txt-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-subtle resize-none"
              />
            </div>

            <DialogFooter className="pt-3.5 border-t border-border flex items-center justify-end gap-2 sm:space-x-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsScheduleModalOpen(false)}
                className="h-8 px-4 text-xs cursor-pointer min-w-[72px]"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="h-8 px-4 text-xs bg-[#57B71B] hover:bg-[#469815] text-white font-semibold cursor-pointer"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Scheduling...
                  </>
                ) : (
                  'Schedule Demo'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 6. Log Outcome & Attendance Modal */}
      <Dialog
        open={!!outcomeModalMeeting}
        onOpenChange={(open) => !open && setOutcomeModalMeeting(null)}
      >
        {outcomeModalMeeting && (
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-txt-primary">
                Log Attendance & Outcome
              </DialogTitle>
              <DialogDescription className="text-xs text-txt-muted">
                Record attendance status, demonstration feedback, and next steps for{' '}
                {outcomeModalMeeting.title}.
              </DialogDescription>
            </DialogHeader>

            {formError && (
              <div className="p-2.5 text-xs bg-red-50 text-red-600 rounded-md border border-red-200 flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveOutcome} className="space-y-3 py-1">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-txt-primary">Attendance Status</label>
                <select
                  value={outcomeForm.status}
                  onChange={(e) =>
                    setOutcomeForm({ ...outcomeForm, status: e.target.value as MeetingStatus })
                  }
                  className="w-full h-8 px-2 text-xs rounded-input border border-border bg-white text-txt-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-subtle"
                >
                  <option value="COMPLETED">Completed</option>
                  <option value="NO_SHOW">No-Show</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-txt-primary">
                  Outcome Summary <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Summary of client reception, validated requirements, and commercial intent..."
                  value={outcomeForm.outcomeSummary}
                  onChange={(e) =>
                    setOutcomeForm({ ...outcomeForm, outcomeSummary: e.target.value })
                  }
                  className="w-full p-2 text-xs rounded-input border border-border bg-white text-txt-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-subtle resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-txt-primary">Next Action Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Dispatch customized proposal within 48 hours"
                  value={outcomeForm.nextStepNotes}
                  onChange={(e) =>
                    setOutcomeForm({ ...outcomeForm, nextStepNotes: e.target.value })
                  }
                  className="w-full h-8 px-2.5 text-xs rounded-input border border-border bg-white text-txt-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-subtle"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setOutcomeModalMeeting(null)}
                  className="h-8 text-xs cursor-pointer"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="h-8 text-xs bg-[#57B71B] hover:bg-[#469815] text-white font-semibold cursor-pointer"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Outcome'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        )}
      </Dialog>

      {/* 7. Meeting Detail Preview Modal */}
      <Dialog
        open={!!selectedMeeting}
        onOpenChange={(open) => !open && setSelectedMeeting(null)}
      >
        {selectedMeeting && (
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <div className="min-w-0">
                  <DialogTitle className="text-base font-bold text-txt-primary truncate">
                    {selectedMeeting.title}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-txt-muted">
                    {selectedMeeting.meetingType.replace('_', ' ')} session with{' '}
                    {selectedMeeting.companyName}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 bg-slate-50 rounded-card border border-border space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-txt-muted font-medium">Status</span>
                  {getStatusBadge(selectedMeeting.status)}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-txt-muted font-medium">Prospect</span>
                  <span className="font-semibold text-txt-primary">
                    {selectedMeeting.leadName}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-txt-muted font-medium">Company</span>
                  <span className="font-semibold text-txt-primary">
                    {selectedMeeting.companyName}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-txt-muted font-medium">Scheduled Time</span>
                  <span className="font-semibold text-txt-primary tabular-nums">
                    {selectedMeeting.date} at {selectedMeeting.time} ({selectedMeeting.duration})
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-txt-muted font-medium">Host</span>
                  <span className="font-semibold text-txt-primary">
                    {selectedMeeting.hostName}
                  </span>
                </div>
                {selectedMeeting.meetingUrl && (
                  <div className="flex justify-between items-center">
                    <span className="text-txt-muted font-medium">Meeting URL</span>
                    <a
                      href={selectedMeeting.meetingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-[11px] text-primary hover:underline truncate max-w-[200px]"
                    >
                      {selectedMeeting.meetingUrl}
                    </a>
                  </div>
                )}
              </div>

              {selectedMeeting.description && (
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-txt-muted uppercase tracking-wider">
                    Agenda / Notes
                  </span>
                  <p className="p-2.5 bg-white rounded-btn border border-border text-txt-secondary leading-relaxed">
                    {selectedMeeting.description}
                  </p>
                </div>
              )}

              {selectedMeeting.outcomeSummary && (
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-txt-muted uppercase tracking-wider">
                    Recorded Outcome
                  </span>
                  <p className="p-2.5 bg-white rounded-btn border border-border text-txt-secondary leading-relaxed">
                    {selectedMeeting.outcomeSummary}
                  </p>
                </div>
              )}

              {selectedMeeting.nextStepNotes && (
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-txt-muted uppercase tracking-wider">
                    Next Action Notes
                  </span>
                  <p className="p-2.5 bg-white rounded-btn border border-border text-txt-secondary leading-relaxed">
                    {selectedMeeting.nextStepNotes}
                  </p>
                </div>
              )}
            </div>

            <DialogFooter className="flex-row justify-between sm:justify-between items-center pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs cursor-pointer"
                onClick={() => setSelectedMeeting(null)}
              >
                Close
              </Button>

              <div className="flex items-center gap-2">
                <WhatsAppShareButton
                  meeting={selectedMeeting}
                  variant="solid"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs font-semibold cursor-pointer"
                  onClick={() => {
                    const m = selectedMeeting;
                    setSelectedMeeting(null);
                    openOutcomeModal(m);
                  }}
                >
                  Log Outcome
                </Button>
                {selectedMeeting.meetingUrl && (
                  <Button
                    size="sm"
                    className="h-8 text-xs bg-[#57B71B] hover:bg-[#469815] text-white font-semibold cursor-pointer"
                    asChild
                  >
                    <a
                      href={selectedMeeting.meetingUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Launch Call
                    </a>
                  </Button>
                )}
              </div>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};
