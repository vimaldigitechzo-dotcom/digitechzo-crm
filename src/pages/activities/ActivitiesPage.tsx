import React, { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/common/PageHeader';
import { FilterPills, FilterOption } from '@/components/common/FilterPills';
import { SearchInput } from '@/components/common/SearchInput';
import { EmptyState } from '@/components/common/EmptyState';
import { MetricCard } from '@/components/common/MetricCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { crmApi, authStorage } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { useCrmDirectory } from '@/hooks/useCrmDirectory';
import { ActivityItem, ActivityType, CreateActivityPayload } from '@/types/crm';
import { formatDate, cn } from '@/lib/utils';
import {
  PlusCircle,
  Phone,
  MessageSquare,
  Calendar,
  Mail,
  FileText,
  ArrowRight,
  Play,
  Pause,
  Clock,
  Building2,
  User,
  Activity,
  RotateCcw,
  ExternalLink,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from 'lucide-react';

type CallOutcome = 'CONNECTED' | 'NO_ANSWER' | 'BUSY' | 'CALLBACK_REQUESTED';

export const ActivitiesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { teamOwnerNames, clients, clientNames } = useCrmDirectory();

  const urlType = searchParams.get('type') || searchParams.get('filter') || 'ALL';

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>(urlType);
  const [prospectFilter, setProspectFilter] = useState<string>('ALL');
  const [authorFilter, setAuthorFilter] = useState<string>('ALL');

  // Synchronize from URL params
  useEffect(() => {
    const t = searchParams.get('type') || searchParams.get('filter');
    if (t) {
      setTypeFilter(t.toUpperCase());
    }
  }, [searchParams]);

  const handleTypeFilterChange = (newType: string) => {
    setTypeFilter(newType);
    if (newType === 'ALL') {
      searchParams.delete('type');
      searchParams.delete('filter');
      setSearchParams(searchParams);
    } else {
      setSearchParams({ type: newType });
    }
  };

  // Audio playback simulation state
  const [playingActivityId, setPlayingActivityId] = useState<string | null>(null);

  // Modals state
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(null);

  // Form state for logging interaction
  const [newActivityForm, setNewActivityForm] = useState({
    type: 'CALL' as ActivityType,
    leadId: '',
    title: '',
    description: '',
    callOutcome: 'CONNECTED' as CallOutcome,
    callDuration: '10m 15s',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Real backend Queries
  const {
    data: activitiesResponse,
    isLoading: isActivitiesLoading,
    isError: isActivitiesError,
    error: activitiesError,
    refetch: refetchActivities,
  } = useQuery({
    queryKey: ['activities'],
    queryFn: () => crmApi.getActivities({ limit: 100 }),
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

  // Map Backend Activities to frontend ActivityItem models
  const rawActivities = useMemo(() => {
    return (
      activitiesResponse?.data ||
      activitiesResponse?.items ||
      (Array.isArray(activitiesResponse) ? activitiesResponse : [])
    );
  }, [activitiesResponse]);

  const activities: ActivityItem[] = useMemo(() => {
    return rawActivities.map((act: any) => {
      let type: ActivityType = 'NOTE';
      if (
        ['CALL', 'WHATSAPP', 'EMAIL', 'NOTE', 'MEETING', 'STAGE_CHANGE', 'TASK', 'SYSTEM'].includes(
          act.activityType
        )
      ) {
        type = act.activityType as ActivityType;
      }

      const leadFullName = act.lead?.fullName;
      const leadCompanyName = act.lead?.companyName;
      const leadName = leadFullName
        ? `${leadFullName}${leadCompanyName ? ` (${leadCompanyName})` : ''}`
        : leadCompanyName || undefined;

      return {
        id: act.id,
        leadId: act.leadId || undefined,
        leadName: leadName || undefined,
        dealId: act.dealId || undefined,
        dealTitle: act.deal?.title || undefined,
        taskId: act.taskId || undefined,
        taskTitle: act.task?.title || undefined,
        type,
        title: act.subject || 'Activity',
        description: act.description || undefined,
        direction: act.direction as ('INBOUND' | 'OUTBOUND') | undefined,
        durationSeconds: act.durationSeconds || undefined,
        outcome: act.outcome || undefined,
        authorName: act.user?.name || 'Administrator',
        createdAt: act.activityDate || act.createdAt || new Date().toISOString(),
        metadata:
          act.metadata && typeof act.metadata === 'object'
            ? (act.metadata as Record<string, unknown>)
            : act.durationSeconds || act.outcome
            ? {
                callOutcome: act.outcome,
                callDuration: act.durationSeconds
                  ? `${Math.floor(act.durationSeconds / 60)}m ${act.durationSeconds % 60}s`
                  : undefined,
                hasRecording: Boolean(act.durationSeconds),
              }
            : undefined,
      };
    });
  }, [rawActivities]);

  // Calculate metrics
  const callCount = useMemo(() => activities.filter((a) => a.type === 'CALL').length, [activities]);
  const waCount = useMemo(() => activities.filter((a) => a.type === 'WHATSAPP').length, [activities]);
  const stageChangeCount = useMemo(
    () => activities.filter((a) => a.type === 'STAGE_CHANGE' || a.type === 'TASK').length,
    [activities]
  );
  const totalCount = activities.length;

  // Filter options for pills
  const filterOptions: FilterOption[] = useMemo(() => {
    const meetingCount = activities.filter((a) => a.type === 'MEETING').length;
    const emailCount = activities.filter((a) => a.type === 'EMAIL').length;
    const noteCount = activities.filter((a) => a.type === 'NOTE').length;

    return [
      { id: 'ALL', label: 'All', count: totalCount },
      { id: 'CALL', label: 'Calls', count: callCount },
      { id: 'WHATSAPP', label: 'WhatsApp', count: waCount },
      { id: 'STAGE_CHANGE', label: 'Stage / Tasks', count: stageChangeCount },
      { id: 'MEETING', label: 'Meetings', count: meetingCount },
      { id: 'EMAIL', label: 'Emails', count: emailCount },
      { id: 'NOTE', label: 'Notes', count: noteCount },
    ];
  }, [activities, totalCount, callCount, waCount, stageChangeCount]);

  // Unique prospects and authors combining activities and CRM directory
  const uniqueProspects = useMemo(() => {
    const fromActivities = activities.map((a) => a.leadName).filter(Boolean) as string[];
    return Array.from(new Set([...fromActivities, ...clientNames]));
  }, [activities, clientNames]);

  const uniqueAuthors = useMemo(() => {
    const fromActivities = activities.map((a) => a.authorName).filter(Boolean);
    return Array.from(new Set([...fromActivities, ...teamOwnerNames]));
  }, [activities, teamOwnerNames]);

  // Lead lookup helper for company name
  const leadCompanyMap = useMemo(() => {
    const map = new Map<string, string>();
    leads.forEach((l: any) => {
      if (l.companyName) {
        map.set(l.fullName, l.companyName);
        map.set(l.id, l.companyName);
      }
    });
    return map;
  }, [leads]);

  // Filtered activities
  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      // Type filter
      if (typeFilter !== 'ALL') {
        if (typeFilter === 'STAGE_CHANGE') {
          if (act.type !== 'STAGE_CHANGE' && act.type !== 'TASK') return false;
        } else if (act.type !== typeFilter) {
          return false;
        }
      }

      // Prospect filter
      if (prospectFilter !== 'ALL' && act.leadName !== prospectFilter) return false;

      // Author filter
      if (authorFilter !== 'ALL' && act.authorName !== authorFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = act.title.toLowerCase().includes(query);
        const matchesDesc = (act.description || '').toLowerCase().includes(query);
        const matchesLead = (act.leadName || '').toLowerCase().includes(query);
        const matchesAuthor = act.authorName.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc && !matchesLead && !matchesAuthor) {
          return false;
        }
      }

      return true;
    });
  }, [activities, typeFilter, prospectFilter, authorFilter, searchQuery]);

  // Group activities chronologically by date
  const groupedActivities = useMemo(() => {
    const groups: { [dateStr: string]: ActivityItem[] } = {};

    filteredActivities.forEach((act) => {
      const dateKey = formatDate(act.createdAt);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(act);
    });

    return groups;
  }, [filteredActivities]);

  const resetAllFilters = () => {
    setTypeFilter('ALL');
    setProspectFilter('ALL');
    setAuthorFilter('ALL');
    setSearchQuery('');
  };

  const isFiltered =
    typeFilter !== 'ALL' || prospectFilter !== 'ALL' || authorFilter !== 'ALL' || searchQuery.trim() !== '';

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActivityForm.title.trim()) return;

    setIsSubmitting(true);
    setFormError(null);

    try {
      let titleToSave = newActivityForm.title.trim();
      let durationSeconds: number | undefined;

      if (newActivityForm.type === 'CALL') {
        const durationPart = newActivityForm.callDuration.trim()
          ? ` (${newActivityForm.callDuration.trim()})`
          : '';
        if (!titleToSave.toLowerCase().includes('call')) {
          titleToSave = `Outbound Call ${newActivityForm.callOutcome}${durationPart}: ${titleToSave}`;
        }

        const match = newActivityForm.callDuration.match(/(?:(\d+)\s*m)?\s*(?:(\d+)\s*s)?/i);
        if (match && (match[1] || match[2])) {
          const mins = parseInt(match[1] || '0', 10);
          const secs = parseInt(match[2] || '0', 10);
          durationSeconds = mins * 60 + secs;
        } else if (!isNaN(Number(newActivityForm.callDuration))) {
          durationSeconds = Number(newActivityForm.callDuration);
        }
      }

      const backendActivityType = ['CALL', 'EMAIL', 'WHATSAPP', 'NOTE', 'MEETING', 'TASK', 'SYSTEM'].includes(
        newActivityForm.type
      )
        ? (newActivityForm.type as any)
        : 'NOTE';

      const payload: CreateActivityPayload = {
        activityType: backendActivityType,
        direction: 'OUTBOUND',
        subject: titleToSave,
        description: newActivityForm.description.trim() || undefined,
        outcome: newActivityForm.type === 'CALL' ? newActivityForm.callOutcome : undefined,
        durationSeconds: durationSeconds || (newActivityForm.type === 'CALL' ? 615 : undefined),
        leadId: newActivityForm.leadId || undefined,
        metadata:
          newActivityForm.type === 'CALL'
            ? {
                callOutcome: newActivityForm.callOutcome,
                callDuration: newActivityForm.callDuration,
                hasRecording: true,
              }
            : undefined,
      };

      await crmApi.createActivity(payload);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['activities'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-activities'] }),
        queryClient.invalidateQueries({ queryKey: ['leads'] }),
      ]);

      setIsLogModalOpen(false);
      setNewActivityForm({
        type: 'CALL',
        leadId: '',
        title: '',
        description: '',
        callOutcome: 'CONNECTED',
        callDuration: '10m 15s',
      });
    } catch (err: any) {
      setFormError(err?.message || 'Failed to log touchpoint. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getActivityTypeConfig = (type: ActivityItem['type']) => {
    switch (type) {
      case 'CALL':
        return {
          icon: Phone,
          iconColor: 'text-[#57B71B]',
          bgColor: 'bg-[#F0FDF4] border-emerald-200/60',
          badgeVariant: 'success' as const,
          label: 'Call',
        };
      case 'WHATSAPP':
        return {
          icon: MessageSquare,
          iconColor: 'text-[#16A34A]',
          bgColor: 'bg-emerald-50 border-emerald-200/60',
          badgeVariant: 'success' as const,
          label: 'WhatsApp',
        };
      case 'STAGE_CHANGE':
        return {
          icon: ArrowRight,
          iconColor: 'text-[#2563EB]',
          bgColor: 'bg-blue-50 border-blue-200/60',
          badgeVariant: 'info' as const,
          label: 'Stage Change',
        };
      case 'TASK':
        return {
          icon: CheckCircle2,
          iconColor: 'text-[#57B71B]',
          bgColor: 'bg-[#F0FDF4] border-emerald-200/60',
          badgeVariant: 'success' as const,
          label: 'Task Completed',
        };
      case 'MEETING':
        return {
          icon: Calendar,
          iconColor: 'text-[#7C3AED]',
          bgColor: 'bg-purple-50 border-purple-200/60',
          badgeVariant: 'tech' as const,
          label: 'Meeting',
        };
      case 'EMAIL':
        return {
          icon: Mail,
          iconColor: 'text-[#0284C7]',
          bgColor: 'bg-sky-50 border-sky-200/60',
          badgeVariant: 'info' as const,
          label: 'Email',
        };
      case 'SYSTEM':
        return {
          icon: Activity,
          iconColor: 'text-slate-600',
          bgColor: 'bg-slate-50 border-slate-200',
          badgeVariant: 'neutral' as const,
          label: 'System Event',
        };
      case 'NOTE':
      default:
        return {
          icon: FileText,
          iconColor: 'text-[#D97706]',
          bgColor: 'bg-amber-50 border-amber-200/60',
          badgeVariant: 'warning' as const,
          label: 'Internal Note',
        };
    }
  };

  if (isActivitiesLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-[#57B71B]" />
        <p className="text-sm text-txt-muted">Loading communication history...</p>
      </div>
    );
  }

  if (isActivitiesError) {
    const isSessionExpired =
      (activitiesError as any)?.status === 401 ||
      (activitiesError instanceof Error && activitiesError.message.toLowerCase().includes('session'));

    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 p-6 text-center">
        <AlertCircle className={cn('h-10 w-10', isSessionExpired ? 'text-amber-500' : 'text-red-500')} />
        <h3 className="text-base font-semibold text-txt-primary">
          {isSessionExpired ? 'Session Expired' : 'Failed to load activities'}
        </h3>
        <p className="text-xs text-txt-muted max-w-sm">
          {isSessionExpired
            ? 'Your login session has expired. Please sign in again to access activities.'
            : activitiesError instanceof Error
            ? activitiesError.message
            : 'Network error loading activities from PostgreSQL backend.'}
        </p>
        {isSessionExpired ? (
          <Button
            size="sm"
            className="bg-[#57B71B] hover:bg-[#469815] text-white cursor-pointer"
            onClick={() => {
              authStorage.clearSession();
              window.location.href = '/login?expired=1';
            }}
          >
            Sign In Again
          </Button>
        ) : (
          <Button size="sm" onClick={() => refetchActivities()}>
            Try Again
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 select-none max-w-full">
      {/* 1. Page Header */}
      <PageHeader
        title="Activities"
        count={`${activities.length} total events`}
        description="Unified chronological audit log of prospect interactions, calls, messages, and stage changes"
        actions={
          <Button
            size="sm"
            className="h-8 text-xs bg-[#57B71B] hover:bg-[#469815] text-white font-semibold cursor-pointer shrink-0"
            onClick={() => setIsLogModalOpen(true)}
          >
            <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
            Log Interaction
          </Button>
        }
      />

      {/* 2. Compact Metric Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Total Logged"
          value={totalCount}
          subtext="Chronological events"
          icon={Activity}
          iconVariant="neutral"
          onClick={() => handleTypeFilterChange('ALL')}
          className={typeFilter === 'ALL' && !isFiltered ? 'border-[#57B71B] ring-1 ring-[#57B71B]/30' : ''}
        />
        <MetricCard
          label="Phone Calls"
          value={callCount}
          subtext="Outbound & inbound"
          icon={Phone}
          iconVariant="success"
          onClick={() => handleTypeFilterChange('CALL')}
          className={typeFilter === 'CALL' ? 'border-[#57B71B] ring-1 ring-[#57B71B]/30' : ''}
        />
        <MetricCard
          label="WhatsApp Chats"
          value={waCount}
          subtext="Direct conversations"
          icon={MessageSquare}
          iconVariant="success"
          onClick={() => handleTypeFilterChange('WHATSAPP')}
          className={typeFilter === 'WHATSAPP' ? 'border-[#16A34A] ring-1 ring-[#16A34A]/30' : ''}
        />
        <MetricCard
          label="Stage Changes / Tasks"
          value={stageChangeCount}
          subtext="Pipeline & task updates"
          icon={ArrowRight}
          iconVariant="info"
          onClick={() => handleTypeFilterChange('STAGE_CHANGE')}
          className={typeFilter === 'STAGE_CHANGE' ? 'border-[#2563EB] ring-1 ring-[#2563EB]/30' : ''}
        />
      </div>

      {/* 3. Compact Toolbar & Filter Pills */}
      <div className="flex flex-col gap-2.5 sm:gap-3 p-3 rounded-card border border-border bg-white shadow-none">
        {/* Top toolbar: Search + Select Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search activities by title, prospect, notes, author..."
            className="w-full sm:w-80"
          />

          <div className="flex items-center gap-2 flex-wrap">
            {/* Prospect Filter */}
            <CustomSelect
              value={prospectFilter}
              onChange={(val) => setProspectFilter(val)}
              className="w-36"
              options={[
                { value: 'ALL', label: 'All Prospects' },
                ...uniqueProspects.map((name) => ({ value: name, label: name })),
              ]}
            />

            {/* Author Filter */}
            <CustomSelect
              value={authorFilter}
              onChange={(val) => setAuthorFilter(val)}
              className="w-36"
              options={[
                { value: 'ALL', label: 'All Authors' },
                ...uniqueAuthors.map((author) => ({ value: author, label: author })),
              ]}
            />

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

        {/* Bottom toolbar: Category Filter Pills */}
        <FilterPills options={filterOptions} activeId={typeFilter} onChange={handleTypeFilterChange} />
      </div>

      {/* 4. Chronological Timeline Feed */}
      {filteredActivities.length === 0 ? (
        <div className="p-8 bg-white rounded-card border border-border">
          <EmptyState
            icon={Activity}
            title="No activity records found"
            description="No logged touchpoints match your current filters. Try resetting or log a new interaction."
            actionLabel={isFiltered ? 'Reset filters' : 'Log Interaction'}
            onAction={isFiltered ? resetAllFilters : () => setIsLogModalOpen(true)}
          />
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedActivities).map(([dateLabel, items]) => (
            <div key={dateLabel} className="space-y-3">
              {/* Date Header Pill */}
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-txt-muted bg-slate-100 border border-border px-2.5 py-0.5 rounded-full">
                  {dateLabel}
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Timeline Cards Container */}
              <div className="space-y-2.5 pl-1 sm:pl-2">
                {items.map((act) => {
                  const config = getActivityTypeConfig(act.type);
                  const Icon = config.icon;
                  const companyName = act.leadName
                    ? leadCompanyMap.get(act.leadName) || (act.leadId ? leadCompanyMap.get(act.leadId) : undefined)
                    : undefined;
                  const isCall = act.type === 'CALL';
                  const isPlaying = playingActivityId === act.id;

                  return (
                    <div
                      key={act.id}
                      className="rounded-card border border-border bg-white p-3.5 sm:p-4 hover:border-slate-300 transition-colors shadow-none"
                    >
                      {/* Top Row: Icon + Title + Badges + Timestamp */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                          <div
                            className={cn(
                              'flex h-7 w-7 items-center justify-center rounded-btn border shrink-0 mt-0.5',
                              config.bgColor
                            )}
                          >
                            <Icon className={cn('h-3.5 w-3.5', config.iconColor)} />
                          </div>

                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                              <button
                                type="button"
                                onClick={() => setSelectedActivity(act)}
                                className="font-bold text-xs sm:text-sm text-txt-primary hover:text-[#57B71B] transition-colors truncate text-left cursor-pointer"
                              >
                                {act.title}
                              </button>
                              <Badge variant={config.badgeVariant} className="text-[10px] px-1.5 py-0">
                                {config.label}
                              </Badge>
                            </div>

                            {/* Prospect context */}
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-txt-secondary">
                              {act.leadName ? (
                                <Link
                                  to="/leads"
                                  className="flex items-center gap-1 truncate font-medium text-txt-primary hover:text-[#57B71B] transition-colors"
                                >
                                  <User className="h-3 w-3 text-txt-muted shrink-0" />
                                  <span>{act.leadName}</span>
                                </Link>
                              ) : (
                                <span className="flex items-center gap-1 text-txt-muted">
                                  <Activity className="h-3 w-3 shrink-0" />
                                  <span>General / System Activity</span>
                                </span>
                              )}
                              {companyName && (
                                <span className="flex items-center gap-1 text-txt-muted truncate">
                                  <Building2 className="h-3 w-3 shrink-0" />
                                  <span>{companyName}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: Timestamp in tabular numerals */}
                        <div className="text-left sm:text-right shrink-0">
                          <span className="text-[11px] font-semibold text-txt-muted tabular-nums flex items-center gap-1 sm:justify-end">
                            <Clock className="h-3 w-3 shrink-0" />
                            {new Date(act.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Middle: Description / Note Body */}
                      {act.description && (
                        <div className="mt-2.5 sm:pl-9 pl-0 text-xs text-txt-secondary leading-relaxed bg-slate-50/60 p-2.5 rounded-btn border border-slate-100 break-words">
                          {act.description}
                        </div>
                      )}

                      {/* Contextual Call Audio Scrub Bar (for recorded calls) */}
                      {isCall && (
                        <div className="mt-2.5 sm:pl-9 pl-0">
                          <div className="flex items-center gap-2.5 p-2 rounded-btn bg-[#F8FAFC] border border-border max-w-md">
                            <button
                              type="button"
                              onClick={() => setPlayingActivityId(isPlaying ? null : act.id)}
                              className="flex h-6 w-6 items-center justify-center rounded-full bg-[#16181B] text-white hover:bg-slate-700 transition-colors cursor-pointer shrink-0"
                              title={isPlaying ? 'Pause Recording' : 'Play Recording'}
                            >
                              {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3 ml-0.5" />}
                            </button>

                            {/* Simulated waveform scrubber */}
                            <div className="flex-1 flex items-center gap-1 h-3">
                              <div
                                className={cn(
                                  'h-1.5 rounded-full flex-1 transition-all',
                                  isPlaying ? 'bg-[#57B71B]' : 'bg-slate-200'
                                )}
                              >
                                <div
                                  className={cn(
                                    'h-full bg-[#57B71B] rounded-full',
                                    isPlaying ? 'w-2/3 animate-pulse' : 'w-1/4'
                                  )}
                                />
                              </div>
                            </div>

                            <span className="text-[10px] font-semibold text-txt-muted tabular-nums shrink-0">
                              {isPlaying
                                ? '04:12 / 12:40'
                                : act.durationSeconds
                                ? `${Math.floor(act.durationSeconds / 60)}m ${act.durationSeconds % 60}s`
                                : '10m 15s'}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Footer: Author info & Quick prospect link */}
                      <div className="mt-2.5 sm:pl-9 pl-0 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-txt-muted">
                        <div className="flex items-center gap-1.5">
                          <Avatar className="h-4 w-4 text-[9px] bg-slate-200 text-txt-primary">
                            <AvatarFallback>
                              {act.authorName
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <span>
                            Logged by <strong className="text-txt-primary font-medium">{act.authorName}</strong>
                          </span>
                        </div>

                        {act.leadId && (
                          <Link
                            to="/leads"
                            className="flex items-center gap-1 text-[11px] font-medium text-[#57B71B] hover:underline"
                          >
                            <span>View Prospect</span>
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 5. Log Interaction Modal */}
      <Dialog open={isLogModalOpen} onOpenChange={setIsLogModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-txt-primary">Log Interaction</DialogTitle>
            <DialogDescription className="text-xs text-txt-muted">
              Record a call, message, demo meeting, or internal client note. Follows append-only rule BR-COMM-01.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateActivity} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 sm:px-5 sm:py-4 space-y-3.5 text-xs">
              {formError && (
                <div className="p-2.5 text-xs bg-red-50 text-red-600 rounded-md border border-red-200 flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-txt-primary">Interaction Modality</label>
              <CustomSelect
                value={newActivityForm.type}
                onChange={(val) =>
                  setNewActivityForm({ ...newActivityForm, type: val as ActivityType })
                }
                options={[
                  { value: 'CALL', label: 'Phone Call' },
                  { value: 'WHATSAPP', label: 'WhatsApp Communication' },
                  { value: 'MEETING', label: 'Demo / Discovery Meeting' },
                  { value: 'EMAIL', label: 'Email Thread' },
                  { value: 'NOTE', label: 'Internal Team Note' },
                ]}
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-txt-primary">Related Prospect / Client</label>
                <span className="text-[10px] text-txt-muted">{clients.length} available</span>
              </div>
              <CustomSelect
                value={newActivityForm.leadId}
                onChange={(val) => setNewActivityForm({ ...newActivityForm, leadId: val })}
                placeholder="None / General Touchpoint"
                options={[
                  { value: '', label: 'None / General Touchpoint' },
                  ...clients.map((c) => ({
                    value: c.id,
                    label: c.displayText,
                  })),
                ]}
              />
            </div>

            {newActivityForm.type === 'CALL' && (
              <div className="grid grid-cols-2 gap-3 p-2.5 rounded-btn bg-[#F0FDF4] border border-emerald-200/80">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#166534]">
                    Call Outcome <span className="text-red-500">*</span>
                  </label>
                  <CustomSelect
                    value={newActivityForm.callOutcome}
                    onChange={(val) =>
                      setNewActivityForm({
                        ...newActivityForm,
                        callOutcome: val as CallOutcome,
                      })
                    }
                    options={[
                      { value: 'CONNECTED', label: 'Connected' },
                      { value: 'NO_ANSWER', label: 'No Answer' },
                      { value: 'BUSY', label: 'Busy' },
                      { value: 'CALLBACK_REQUESTED', label: 'Callback Requested' },
                    ]}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#166534]">
                    Duration <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 12m 40s"
                    value={newActivityForm.callDuration}
                    onChange={(e) =>
                      setNewActivityForm({ ...newActivityForm, callDuration: e.target.value })
                    }
                    className="w-full h-7 px-2 text-xs rounded-input border border-border bg-white text-txt-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-subtle"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-txt-primary">
                Summary / Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Outbound Call Connected / Budget Validation"
                value={newActivityForm.title}
                onChange={(e) => setNewActivityForm({ ...newActivityForm, title: e.target.value })}
                className="w-full h-8 px-2.5 text-xs rounded-input border border-border bg-white text-txt-primary focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary shadow-subtle"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-txt-primary">Detailed Notes / Transcript</label>
              <textarea
                rows={3}
                placeholder="Enter conversation highlights, client questions, or agreement notes..."
                value={newActivityForm.description}
                onChange={(e) =>
                  setNewActivityForm({ ...newActivityForm, description: e.target.value })
                }
                className="w-full p-2 text-xs rounded-input border border-border bg-white text-txt-primary focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary shadow-subtle resize-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-txt-primary">Logged By</label>
              <input
                type="text"
                disabled
                value={user?.name || 'Administrator'}
                className="w-full h-8 px-2.5 text-xs rounded-input border border-border bg-slate-50 text-txt-secondary cursor-not-allowed shadow-subtle"
              />
            </div>
            </div>

            <DialogFooter className="px-4 py-3 sm:px-5 sm:py-3 border-t border-border flex items-center justify-end gap-2 shrink-0 bg-slate-50/95 mt-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsLogModalOpen(false)}
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
                  'Save Touchpoint'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 6. Activity Detail Modal */}
      <Dialog open={!!selectedActivity} onOpenChange={(open) => !open && setSelectedActivity(null)}>
        {selectedActivity && (
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-btn border shrink-0',
                    getActivityTypeConfig(selectedActivity.type).bgColor
                  )}
                >
                  {React.createElement(getActivityTypeConfig(selectedActivity.type).icon, {
                    className: cn('h-3.5 w-3.5', getActivityTypeConfig(selectedActivity.type).iconColor),
                  })}
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-base font-bold text-txt-primary truncate">
                    {selectedActivity.title}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-txt-muted">
                    Logged {selectedActivity.type.toLowerCase()} event
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 sm:px-5 sm:py-4 space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-card border border-border space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-txt-muted font-medium">Prospect</span>
                  <span className="font-semibold text-txt-primary">
                    {selectedActivity.leadName || 'General'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-txt-muted font-medium">Activity Type</span>
                  <Badge variant={getActivityTypeConfig(selectedActivity.type).badgeVariant}>
                    {getActivityTypeConfig(selectedActivity.type).label}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-txt-muted font-medium">Logged At</span>
                  <span className="font-semibold text-txt-primary tabular-nums">
                    {formatDate(selectedActivity.createdAt)} (
                    {new Date(selectedActivity.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    )
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-txt-muted font-medium">Author</span>
                  <span className="font-semibold text-txt-primary">{selectedActivity.authorName}</span>
                </div>
              </div>

              {selectedActivity.description && (
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-txt-muted uppercase tracking-wider">
                    Full Notes / Transcript
                  </span>
                  <p className="p-3 bg-white rounded-btn border border-border text-txt-secondary leading-relaxed text-xs">
                    {selectedActivity.description}
                  </p>
                </div>
              )}
            </div>

            <DialogFooter className="px-4 py-3 sm:px-5 sm:py-3 border-t border-border flex flex-row justify-between sm:justify-between items-center shrink-0 bg-slate-50/95 mt-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs cursor-pointer"
                onClick={() => setSelectedActivity(null)}
              >
                Close
              </Button>

              {selectedActivity.leadId && (
                <Button
                  size="sm"
                  className="h-8 text-xs bg-[#57B71B] hover:bg-[#469815] text-white font-semibold cursor-pointer"
                  asChild
                >
                  <Link to="/leads" onClick={() => setSelectedActivity(null)}>
                    View Prospect
                  </Link>
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};
