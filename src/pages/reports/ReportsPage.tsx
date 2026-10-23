import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/common/PageHeader';
import { FilterPills, FilterOption } from '@/components/common/FilterPills';
import { EmptyState } from '@/components/common/EmptyState';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { crmApi } from '@/lib/api';
import { formatCurrency, cn } from '@/lib/utils';
import {
  TrendingUp,
  Target,
  Users,
  Clock,
  Download,
  CheckCircle2,
  Sliders,
  Building2,
  Layers,
  Share2,
  X,
  Loader2,
  RotateCcw,
  AlertCircle,
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const navigate = useNavigate();
  // Local UI State
  const [activeTab, setActiveTab] = useState<'overview' | 'reps' | 'sources'>('overview');
  const [repFilter, setRepFilter] = useState<string>('ALL');
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // 1. Fetch Real Database Records from CRM APIs
  const {
    data: dealsResponse,
    isLoading: isDealsLoading,
    isError: isDealsError,
    refetch: refetchDeals,
  } = useQuery({
    queryKey: ['reports-deals'],
    queryFn: () => crmApi.getDeals({ limit: 100 }),
  });

  const {
    data: stagesResponse,
    isLoading: isStagesLoading,
    refetch: refetchStages,
  } = useQuery({
    queryKey: ['reports-stages'],
    queryFn: () => crmApi.getPipelineStages(),
  });

  const {
    data: leadsResponse,
    isLoading: isLeadsLoading,
    refetch: refetchLeads,
  } = useQuery({
    queryKey: ['reports-leads'],
    queryFn: () => crmApi.getLeads({ limit: 100 }),
  });

  const {
    data: tasksResponse,
    isLoading: isTasksLoading,
    refetch: refetchTasks,
  } = useQuery({
    queryKey: ['reports-tasks'],
    queryFn: () => crmApi.getTasks({ limit: 100 }),
  });

  const {
    data: activitiesResponse,
    isLoading: isActivitiesLoading,
    refetch: refetchActivities,
  } = useQuery({
    queryKey: ['reports-activities'],
    queryFn: () => crmApi.getActivities({ limit: 100 }),
  });

  const {
    data: usersResponse,
    isLoading: isUsersLoading,
    refetch: refetchUsers,
  } = useQuery({
    queryKey: ['reports-users'],
    queryFn: () => crmApi.getUsers({ limit: 100 }),
  });

  // Normalize Backend Data
  const rawDeals: any[] = useMemo(() => {
    return dealsResponse?.items || dealsResponse?.data || (Array.isArray(dealsResponse) ? dealsResponse : []);
  }, [dealsResponse]);

  const rawStages: any[] = useMemo(() => {
    return Array.isArray(stagesResponse) ? stagesResponse : [];
  }, [stagesResponse]);

  const rawLeads: any[] = useMemo(() => {
    return (
      leadsResponse?.items ||
      leadsResponse?.leads ||
      (Array.isArray(leadsResponse?.data) ? leadsResponse?.data : leadsResponse?.data?.items) ||
      (Array.isArray(leadsResponse) ? leadsResponse : [])
    );
  }, [leadsResponse]);

  const rawTasks: any[] = useMemo(() => {
    return tasksResponse?.data || tasksResponse?.items || (Array.isArray(tasksResponse) ? tasksResponse : []);
  }, [tasksResponse]);

  const rawActivities: any[] = useMemo(() => {
    return activitiesResponse?.data || activitiesResponse?.items || (Array.isArray(activitiesResponse) ? activitiesResponse : []);
  }, [activitiesResponse]);

  const rawUsers: any[] = useMemo(() => {
    return usersResponse?.data || (Array.isArray(usersResponse) ? usersResponse : []);
  }, [usersResponse]);

  // Map to frontend normalized representations
  const deals = useMemo(() => {
    return rawDeals.map((item: any) => ({
      id: item.id,
      title: item.title,
      companyName: item.leadName || item.companyName || item.title || 'Opportunity',
      stageId: item.stageId,
      stageName: item.stageName,
      amount: Number(item.value ?? item.amount ?? 0),
      probability: Number(item.probability ?? 50),
      ownerId: item.ownerId || '',
      ownerName: item.ownerName || 'Unassigned',
      status: (item.status || 'OPEN') as 'OPEN' | 'WON' | 'LOST',
    }));
  }, [rawDeals]);

  const leads = useMemo(() => {
    return rawLeads.map((item: any) => ({
      id: item.id,
      fullName: item.fullName || 'Lead',
      companyName: item.companyName || item.fullName || 'Lead',
      source: item.source || 'DIRECT',
      status: item.status,
      serviceInterest: item.serviceInterest || 'General Inquiry',
      ownerId: item.ownerId || item.owner?.id || '',
      ownerName: item.ownerName || item.owner?.name || 'Unassigned',
    }));
  }, [rawLeads]);

  const tasks = useMemo(() => {
    return rawTasks.map((t: any) => {
      const isCompleted = t.status === 'COMPLETED';
      const isCancelled = t.status === 'CANCELLED';
      const isOverdue = !isCompleted && !isCancelled && t.dueDate && new Date(t.dueDate) < new Date();
      return {
        id: t.id,
        title: t.title,
        ownerId: t.assignedTo || t.assigneeId || t.ownerId || '',
        status: isCompleted ? 'COMPLETED' : isCancelled ? 'CANCELLED' : isOverdue ? 'OVERDUE' : 'PENDING',
      };
    });
  }, [rawTasks]);

  const activities = useMemo(() => {
    return rawActivities.map((a: any) => ({
      id: a.id,
      authorName: a.authorName || a.createdBy?.name || a.author?.name || 'Staff',
      authorId: a.userId || a.authorId || a.createdById || '',
      type: a.activityType || 'NOTE',
    }));
  }, [rawActivities]);

  // 2. Authoritative Calculations from Real Database
  const activeDeals = useMemo(
    () => deals.filter((deal) => deal.status === 'OPEN'),
    [deals]
  );

  const activePipelineValue = useMemo(
    () => activeDeals.reduce((sum, deal) => sum + deal.amount, 0),
    [activeDeals]
  );

  const weightedForecast = useMemo(
    () =>
      activeDeals.reduce(
        (sum, deal) => sum + deal.amount * ((deal.probability || 0) / 100),
        0
      ),
    [activeDeals]
  );

  const overdueTasks = useMemo(
    () => tasks.filter((task) => task.status === 'OVERDUE'),
    [tasks]
  );

  const pendingTasks = useMemo(
    () => tasks.filter((task) => task.status === 'PENDING'),
    [tasks]
  );

  // 3. Active Deals Grouped by Pipeline Stage
  const activeStagesBreakdown = useMemo(() => {
    const stageMap = new Map<string, { count: number; totalValue: number; deals: typeof deals }>();

    activeDeals.forEach((deal) => {
      const existing = stageMap.get(deal.stageId) || { count: 0, totalValue: 0, deals: [] };
      existing.count += 1;
      existing.totalValue += deal.amount;
      existing.deals.push(deal);
      stageMap.set(deal.stageId, existing);
    });

    return Array.from(stageMap.entries()).map(([stageId, data]) => {
      const stageConfig = rawStages.find((s) => s.id === stageId);
      const stageName = stageConfig ? stageConfig.name : (data.deals[0]?.stageName || stageId);
      const sharePercentage = activePipelineValue > 0 ? (data.totalValue / activePipelineValue) * 100 : 0;
      return {
        stageId,
        stageName,
        count: data.count,
        totalValue: data.totalValue,
        sharePercentage,
        deals: data.deals,
      };
    });
  }, [activeDeals, rawStages, activePipelineValue]);

  // 4. Lead Source Acquisition Breakdown
  const sourceBreakdown = useMemo(() => {
    const totalLeads = leads.length;
    const sourceMap = new Map<string, { count: number; leads: typeof leads }>();

    leads.forEach((lead) => {
      const sKey = lead.source || 'OTHER';
      const existing = sourceMap.get(sKey) || { count: 0, leads: [] };
      existing.count += 1;
      existing.leads.push(lead);
      sourceMap.set(sKey, existing);
    });

    return Array.from(sourceMap.entries()).map(([source, data]) => ({
      source,
      label: source.replace('_', ' '),
      count: data.count,
      percentage: totalLeads > 0 ? (data.count / totalLeads) * 100 : 0,
      leads: data.leads,
    }));
  }, [leads]);

  // 5. Team Rep Performance Leaderboard (from Real Users & Assigned Records)
  const repMetrics = useMemo(() => {
    const repsToAnalyze = rawUsers.length > 0
      ? rawUsers.filter((u: any) => u.role?.name === 'BDE' || u.role?.name === 'BDE_SALES' || u.role?.name === 'MANAGER' || u.role === 'BDE')
      : [];

    // Fallback if no specific BDE role filter matches: display all active users
    const displayUsers = repsToAnalyze.length > 0 ? repsToAnalyze : rawUsers;

    return displayUsers.map((rep: any) => {
      const repId = rep.id;
      const repName = rep.name || `${rep.firstName || ''} ${rep.lastName || ''}`.trim() || rep.email;
      const assignedLeads = leads.filter((l) => l.ownerId === repId);
      const repDeals = deals.filter((d) => d.ownerId === repId && d.status === 'OPEN');
      const repValue = repDeals.reduce((sum, d) => sum + d.amount, 0);
      const repTasks = tasks.filter((t) => t.ownerId === repId);
      const repActivities = activities.filter((a) => a.authorId === repId || a.authorName === repName);

      return {
        id: repId,
        name: repName,
        role: rep.role?.name || rep.role || 'Member',
        teamName: rep.teamName || 'Sales & Growth',
        assignedLeadsCount: assignedLeads.length,
        activeDealsCount: repDeals.length,
        managedPipelineValue: repValue,
        activeTasksCount: repTasks.length,
        overdueTasksCount: repTasks.filter((t) => t.status === 'OVERDUE').length,
        loggedActivitiesCount: repActivities.length,
      };
    });
  }, [rawUsers, leads, deals, tasks, activities]);

  const filteredRepMetrics = useMemo(() => {
    if (repFilter === 'ALL') return repMetrics;
    return repMetrics.filter((r) => r.id === repFilter);
  }, [repMetrics, repFilter]);

  // Rep Filter Options
  const repFilterOptions: FilterOption[] = useMemo(() => {
    return [
      { id: 'ALL', label: 'All Reps', count: repMetrics.length },
      ...repMetrics.map((r) => ({
        id: r.id,
        label: r.name,
        count: r.activeDealsCount,
      })),
    ];
  }, [repMetrics]);

  // Tab Filter Options
  const tabOptions: FilterOption[] = [
    { id: 'overview', label: 'Executive Overview' },
    { id: 'reps', label: 'Rep Performance' },
    { id: 'sources', label: 'Lead Sources' },
  ];

  // 6. Client-Side CSV Export using Real Database Records
  const handleExportCsv = () => {
    const rows = [
      ['DigiTechzo CRM - Executive Analytics Summary'],
      ['Generated On', new Date().toISOString()],
      ['Data Source', 'Live CRM Production Database'],
      [''],
      ['KPI Metrics', 'Value', 'Calculation / Notes'],
      ['Active Pipeline Value', activePipelineValue.toString(), `Calculated from ${activeDeals.length} active open deals`],
      ['Weighted Forecast', weightedForecast.toString(), 'Probability-adjusted expected close value'],
      ['Total Ingested Leads', leads.length.toString(), `From live Leads database (${leads.length} leads)`],
      ['Active Follow-up Tasks', tasks.length.toString(), `From live Tasks database (${overdueTasks.length} overdue, ${pendingTasks.length} pending)`],
      [''],
      ['Active Pipeline Deals by Stage', 'Stage Name', 'Deal Count', 'Total Value (INR)', 'Share %'],
      ...activeStagesBreakdown.map((s) => [
        s.stageId,
        s.stageName,
        s.count.toString(),
        s.totalValue.toString(),
        `${s.sharePercentage.toFixed(1)}%`,
      ]),
      [''],
      ['Lead Acquisition Sources', 'Source Channel', 'Lead Count', 'Share %'],
      ...sourceBreakdown.map((sb) => [
        sb.source,
        sb.label,
        sb.count.toString(),
        `${sb.percentage.toFixed(1)}%`,
      ]),
      [''],
      ['BDE Rep Performance Leaderboard', 'Rep Name', 'Team', 'Leads', 'Deals', 'Managed Value (INR)', 'Tasks', 'Activities'],
      ...repMetrics.map((r) => [
        r.id,
        r.name,
        r.teamName,
        r.assignedLeadsCount.toString(),
        r.activeDealsCount.toString(),
        r.managedPipelineValue.toString(),
        r.activeTasksCount.toString(),
        r.loggedActivitiesCount.toString(),
      ]),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `digitechzo_analytics_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setExportNotice('Live analytics report exported.');
    setTimeout(() => {
      setExportNotice(null);
    }, 4000);
  };

  const isAnyLoading =
    isDealsLoading || isLeadsLoading || isTasksLoading || isStagesLoading || isActivitiesLoading || isUsersLoading;

  if (isAnyLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-[#57B71B]" />
        <p className="text-sm text-txt-muted">Loading live analytics reports...</p>
      </div>
    );
  }

  if (isDealsError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="flex items-center gap-2 text-danger-dark font-medium">
          <AlertCircle className="h-5 w-5" />
          <span>Failed to load reports from database</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            refetchDeals();
            refetchStages();
            refetchLeads();
            refetchTasks();
            refetchActivities();
            refetchUsers();
          }}
          className="cursor-pointer"
        >
          <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5 select-none pb-8">
      {/* 1. Page Header */}
      <PageHeader
        title="Reports & Analytics"
        description="Executive sales performance, funnel velocity, and revenue analytics"
        count={activeDeals.length}
        badge="Live CRM Database"
        badgeVariant="success"
        actions={
          <div className="flex items-center justify-end w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="h-8 text-xs font-semibold border-border text-txt-primary hover:bg-slate-50 transition-colors shadow-none ml-auto shrink-0"
            >
              <Download className="mr-1.5 h-3.5 w-3.5 text-txt-muted shrink-0" />
              <span className="hidden xs:inline">Export Summary (CSV)</span>
              <span className="xs:hidden">Export (CSV)</span>
            </Button>
          </div>
        }
      />

      {/* Export Notice Banner */}
      {exportNotice && (
        <div className="flex items-center justify-between p-3 rounded-card bg-[#F0FDF4] border border-emerald-200 text-[#16A34A] text-xs font-medium animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#16A34A]" />
            <span>{exportNotice} Download saved as CSV file</span>
          </div>
          <button
            onClick={() => setExportNotice(null)}
            className="text-emerald-700 hover:text-emerald-900 transition-colors p-0.5"
            aria-label="Dismiss export notice"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* 2. Compact View Switcher Tabs (Mobile-Friendly Horizontal Scroll) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 border-b border-border pb-2.5 sm:pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto scroll-smooth py-0.5 max-w-full [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tabOptions.map((opt) => {
            const isActive = opt.id === activeTab;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setActiveTab(opt.id as 'overview' | 'reps' | 'sources')}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-btn text-xs font-semibold whitespace-nowrap transition-colors shrink-0',
                  isActive
                    ? 'bg-[#1E242B] text-white shadow-subtle'
                    : 'bg-slate-100 text-txt-secondary hover:bg-slate-200 hover:text-txt-primary'
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <div className="text-[10px] sm:text-[11px] text-txt-muted font-medium break-words leading-tight">
          Live data: <span className="font-semibold text-txt-secondary">{deals.length}</span> deals &bull; <span className="font-semibold text-txt-secondary">{leads.length}</span> leads &bull; <span className="font-semibold text-txt-secondary">{tasks.length}</span> tasks
        </div>
      </div>

      {/* 3. Executive KPI Metric Row (4 Compact Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        {/* Metric 1: Active Pipeline Value */}
        <Card
          onClick={() => navigate('/pipeline')}
          title="Click to view Pipeline Deals"
          className="cursor-pointer border-border hover:border-[#16A34A]/70 hover:shadow-subtle transition-all active:scale-[0.99] group shadow-none"
        >
          <CardContent className="p-2.5 xs:p-3 sm:p-4 flex items-center justify-between gap-1.5 xs:gap-2">
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="text-[10px] sm:text-[11px] font-semibold text-txt-muted uppercase tracking-wider leading-tight line-clamp-1 break-words group-hover:text-txt-primary transition-colors" title="Active Pipeline">
                Active Pipeline
              </p>
              <div className="text-sm xs:text-base sm:text-2xl font-bold tracking-tight text-txt-primary font-tabular truncate">
                {formatCurrency(activePipelineValue)}
              </div>
              <p className="text-[9.5px] xs:text-[10px] sm:text-[11px] text-[#16A34A] font-medium leading-tight line-clamp-2 break-words">
                {activeDeals.length} active opportunities
              </p>
            </div>
            <div className="hidden min-[420px]:flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-btn bg-[#F0FDF4] text-[#16A34A] shrink-0 transition-transform group-hover:scale-105">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        {/* Metric 2: Weighted Forecast */}
        <Card
          onClick={() => setActiveTab('overview')}
          title="Click to view Executive Overview"
          className="cursor-pointer border-border hover:border-[#7C3AED]/70 hover:shadow-subtle transition-all active:scale-[0.99] group shadow-none"
        >
          <CardContent className="p-2.5 xs:p-3 sm:p-4 flex items-center justify-between gap-1.5 xs:gap-2">
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="text-[10px] sm:text-[11px] font-semibold text-txt-muted uppercase tracking-wider leading-tight line-clamp-1 break-words group-hover:text-txt-primary transition-colors" title="Weighted Forecast">
                Weighted Forecast
              </p>
              <div className="text-sm xs:text-base sm:text-2xl font-bold tracking-tight text-txt-primary font-tabular truncate">
                {formatCurrency(weightedForecast)}
              </div>
              <p className="text-[9.5px] xs:text-[10px] sm:text-[11px] text-txt-secondary font-medium leading-tight line-clamp-2 break-words">
                Probability-adjusted
              </p>
            </div>
            <div className="hidden min-[420px]:flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-btn bg-[#F5F3FF] text-[#7C3AED] shrink-0 transition-transform group-hover:scale-105">
              <Target className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        {/* Metric 3: Total Ingested Leads */}
        <Card
          onClick={() => navigate('/leads')}
          title="Click to view Leads"
          className="cursor-pointer border-border hover:border-[#2563EB]/70 hover:shadow-subtle transition-all active:scale-[0.99] group shadow-none"
        >
          <CardContent className="p-2.5 xs:p-3 sm:p-4 flex items-center justify-between gap-1.5 xs:gap-2">
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="text-[10px] sm:text-[11px] font-semibold text-txt-muted uppercase tracking-wider leading-tight line-clamp-1 break-words group-hover:text-txt-primary transition-colors" title="Ingested Leads">
                Ingested Leads
              </p>
              <div className="text-sm xs:text-base sm:text-2xl font-bold tracking-tight text-txt-primary font-tabular truncate">
                {leads.length} Leads
              </div>
              <p className="text-[9.5px] xs:text-[10px] sm:text-[11px] text-[#2563EB] font-medium leading-tight line-clamp-2 break-words">
                {leads.length > 0 ? 'Live database' : 'No leads recorded'}
              </p>
            </div>
            <div className="hidden min-[420px]:flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-btn bg-[#EFF6FF] text-[#2563EB] shrink-0 transition-transform group-hover:scale-105">
              <Users className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        {/* Metric 4: Active Follow-up Queue */}
        <Card
          onClick={() => navigate('/tasks')}
          title="Click to view Follow-up Tasks"
          className="cursor-pointer border-border hover:border-[#D97706]/70 hover:shadow-subtle transition-all active:scale-[0.99] group shadow-none"
        >
          <CardContent className="p-2.5 xs:p-3 sm:p-4 flex items-center justify-between gap-1.5 xs:gap-2">
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="text-[10px] sm:text-[11px] font-semibold text-txt-muted uppercase tracking-wider leading-tight line-clamp-1 break-words group-hover:text-txt-primary transition-colors" title="Follow-up Queue">
                Follow-up Queue
              </p>
              <div className="text-sm xs:text-base sm:text-2xl font-bold tracking-tight text-txt-primary font-tabular truncate">
                {tasks.length} Tasks
              </div>
              <p
                className={cn(
                  'text-[9.5px] xs:text-[10px] sm:text-[11px] font-medium leading-tight line-clamp-2 break-words',
                  overdueTasks.length > 0 ? 'text-[#DC2626] font-semibold' : 'text-[#D97706]'
                )}
              >
                {overdueTasks.length > 0
                  ? `${overdueTasks.length} overdue • ${pendingTasks.length} pending`
                  : `${pendingTasks.length} pending`}
              </p>
            </div>
            <div
              className={cn(
                'hidden min-[420px]:flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-btn shrink-0 transition-transform group-hover:scale-105',
                overdueTasks.length > 0 ? 'bg-[#FEF2F2] text-[#DC2626]' : 'bg-[#FFFBEB] text-[#D97706]'
              )}
            >
              <Clock className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. Section Split: Active Pipeline Stage Breakdown & Lead Channel Attribution */}
      {(activeTab === 'overview' || activeTab === 'sources') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Active Deals by Pipeline Stage (7 cols on desktop) */}
          <Card className="lg:col-span-7 border-border shadow-none">
            <CardHeader className="py-3 px-4 border-b border-border bg-slate-50/50 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-txt-muted" />
                <CardTitle className="text-xs sm:text-sm font-bold text-txt-primary uppercase tracking-wide">
                  Active Deals by Stage
                </CardTitle>
              </div>
              <Badge variant="outline" className="text-[10px] font-semibold border-border text-txt-secondary">
                {activeDeals.length} Open Deals
              </Badge>
            </CardHeader>
            <CardContent className="p-4 space-y-3.5">
              {activeStagesBreakdown.length === 0 ? (
                <EmptyState
                  title="No active deals found"
                  description="Create deals or move leads to pipeline to view stage breakdown."
                />
              ) : (
                activeStagesBreakdown.map((stage) => (
                  <div key={stage.stageId} className="space-y-1.5 p-2.5 sm:p-3 rounded-btn border border-border/70 bg-white">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1.5 sm:gap-2">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <span className="h-2 w-2 rounded-full bg-[#57B71B] shrink-0" />
                        <span className="font-bold text-xs text-txt-primary break-words line-clamp-1 flex-1 min-w-0" title={stage.stageName}>
                          {stage.stageName}
                        </span>
                        <span className="text-[10px] sm:text-[11px] text-txt-muted font-normal shrink-0">
                          ({stage.count} deal{stage.count > 1 ? 's' : ''})
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 font-tabular shrink-0 self-end sm:self-auto">
                        <span className="font-bold text-txt-primary text-xs">
                          {formatCurrency(stage.totalValue)}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-txt-secondary font-semibold">
                          {stage.sharePercentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    {/* Stage Progress Visual */}
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#57B71B] transition-all duration-300"
                        style={{ width: `${Math.max(stage.sharePercentage, 8)}%` }}
                      />
                    </div>

                    {/* Associated Deal Pills */}
                    <div className="pt-1 flex flex-wrap gap-1.5">
                      {stage.deals.map((deal) => (
                        <span
                          key={deal.id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-slate-50 border border-border text-txt-secondary font-medium max-w-full"
                        >
                          <Building2 className="h-2.5 w-2.5 text-txt-muted shrink-0" />
                          <span className="truncate max-w-[110px] xs:max-w-[150px] sm:max-w-[200px]" title={deal.companyName}>{deal.companyName}</span>
                          <span className="text-txt-muted font-tabular shrink-0">({formatCurrency(deal.amount)})</span>
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Lead Acquisition Channel Breakdown (5 cols on desktop) */}
          <Card className="lg:col-span-5 border-border shadow-none">
            <CardHeader className="py-3 px-4 border-b border-border bg-slate-50/50 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Share2 className="h-4 w-4 text-txt-muted" />
                <CardTitle className="text-xs sm:text-sm font-bold text-txt-primary uppercase tracking-wide">
                  Lead Channel Attribution
                </CardTitle>
              </div>
              <Badge variant="outline" className="text-[10px] font-semibold border-border text-txt-secondary">
                {leads.length} Leads
              </Badge>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {sourceBreakdown.length === 0 ? (
                <EmptyState
                  title="No leads recorded"
                  description="Add or import leads to see acquisition channel attribution."
                />
              ) : (
                sourceBreakdown.map((sb) => (
                  <div key={sb.source} className="p-2.5 rounded-btn border border-border/70 bg-white space-y-1.5">
                    <div className="flex items-center justify-between text-xs gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span
                          className={cn(
                            'px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider truncate',
                            sb.source === 'META_ADS' && 'bg-blue-50 text-blue-700 border border-blue-200',
                            sb.source === 'GOOGLE_ADS' && 'bg-amber-50 text-amber-700 border border-amber-200',
                            sb.source === 'WEBSITE_FORM' && 'bg-emerald-50 text-emerald-700 border border-emerald-200',
                            sb.source === 'WHATSAPP' && 'bg-green-50 text-green-700 border border-green-200'
                          )}
                          title={sb.label}
                        >
                          {sb.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 font-tabular text-xs shrink-0">
                        <span className="font-bold text-txt-primary">{sb.count} lead{sb.count !== 1 ? 's' : ''}</span>
                        <span className="text-[11px] text-txt-muted">({sb.percentage.toFixed(0)}%)</span>
                      </div>
                    </div>

                    {/* Channel Lead Detail */}
                    <div className="text-[11px] text-txt-secondary space-y-1 pt-0.5">
                      {sb.leads.map((l) => (
                        <p key={l.id} className="text-[10px] sm:text-[11px] text-txt-muted leading-tight break-words line-clamp-2" title={`${l.companyName} (${l.serviceInterest})`}>
                          &bull; <span className="font-semibold text-txt-primary">{l.companyName}</span>{' '}
                          <span className="text-txt-muted">({l.serviceInterest})</span>
                        </p>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 5. Section: BDE Sales Performance Leaderboard */}
      {(activeTab === 'overview' || activeTab === 'reps') && (
        <Card className="border-border shadow-none">
          <CardHeader className="py-3 px-4 border-b border-border bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-txt-muted" />
              <CardTitle className="text-xs sm:text-sm font-bold text-txt-primary uppercase tracking-wide">
                BDE Sales Performance Leaderboard
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <FilterPills
                options={repFilterOptions}
                activeId={repFilter}
                onChange={(id) => setRepFilter(id)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredRepMetrics.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  title="No representative records found"
                  description="No sales representative matches the active filter criteria."
                  actionLabel="Reset Filter"
                  onAction={() => setRepFilter('ALL')}
                />
              </div>
            ) : (
              <>
                {/* Desktop View Table (≥768px) */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/60 hover:bg-slate-50/60">
                        <TableHead className="w-[200px] text-[11px] font-bold uppercase text-txt-muted">
                          Sales Representative
                        </TableHead>
                        <TableHead className="text-[11px] font-bold uppercase text-txt-muted">
                          Assigned Team
                        </TableHead>
                        <TableHead className="text-right text-[11px] font-bold uppercase text-txt-muted">
                          Assigned Leads
                        </TableHead>
                        <TableHead className="text-right text-[11px] font-bold uppercase text-txt-muted">
                          Active Deals
                        </TableHead>
                        <TableHead className="text-right text-[11px] font-bold uppercase text-txt-muted">
                          Managed Pipeline (INR)
                        </TableHead>
                        <TableHead className="text-right text-[11px] font-bold uppercase text-txt-muted">
                          Active Tasks
                        </TableHead>
                        <TableHead className="text-right text-[11px] font-bold uppercase text-txt-muted">
                          Logged Activities
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-border">
                      {filteredRepMetrics.map((rep) => (
                        <TableRow key={rep.id} className="hover:bg-slate-50/80 transition-colors">
                          <TableCell className="py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#57B71B]/15 text-[#57B71B] font-bold text-xs shrink-0">
                                {rep.name.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-xs text-txt-primary truncate">{rep.name}</p>
                                <span className="text-[10px] font-semibold text-txt-muted uppercase">
                                  {rep.role}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-3 text-xs text-txt-secondary font-medium">
                            {rep.teamName}
                          </TableCell>
                          <TableCell className="py-3 text-right text-xs font-semibold font-tabular text-txt-primary">
                            {rep.assignedLeadsCount}
                          </TableCell>
                          <TableCell className="py-3 text-right text-xs font-semibold font-tabular text-txt-primary">
                            {rep.activeDealsCount}
                          </TableCell>
                          <TableCell className="py-3 text-right text-xs font-bold font-tabular text-txt-primary">
                            {formatCurrency(rep.managedPipelineValue)}
                          </TableCell>
                          <TableCell className="py-3 text-right text-xs font-semibold font-tabular">
                            <span
                              className={cn(
                                rep.overdueTasksCount > 0 ? 'text-[#DC2626] font-bold' : 'text-txt-primary'
                              )}
                            >
                              {rep.activeTasksCount}
                              {rep.overdueTasksCount > 0 && ` (${rep.overdueTasksCount} overdue)`}
                            </span>
                          </TableCell>
                          <TableCell className="py-3 text-right text-xs font-semibold font-tabular text-txt-primary">
                            {rep.loggedActivitiesCount}
                          </TableCell>
                        </TableRow>
                      ))}

                      {/* Team Total Row (Only shown when viewing all reps) */}
                      {repFilter === 'ALL' && (
                        <TableRow className="bg-slate-50 font-bold border-t-2 border-border hover:bg-slate-50">
                          <TableCell className="py-3 text-xs text-txt-primary font-bold">
                            Team Total
                          </TableCell>
                          <TableCell className="py-3 text-xs text-txt-muted font-medium">
                            All Sales Team
                          </TableCell>
                          <TableCell className="py-3 text-right text-xs font-bold font-tabular text-txt-primary">
                            {leads.length}
                          </TableCell>
                          <TableCell className="py-3 text-right text-xs font-bold font-tabular text-txt-primary">
                            {activeDeals.length}
                          </TableCell>
                          <TableCell className="py-3 text-right text-xs font-bold font-tabular text-[#57B71B]">
                            {formatCurrency(activePipelineValue)}
                          </TableCell>
                          <TableCell className="py-3 text-right text-xs font-bold font-tabular text-txt-primary">
                            {tasks.length}
                          </TableCell>
                          <TableCell className="py-3 text-right text-xs font-bold font-tabular text-txt-primary">
                            {repMetrics.reduce((s, r) => s + r.loggedActivitiesCount, 0)}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile View Cards (<768px) */}
                <div className="md:hidden divide-y divide-border">
                  {filteredRepMetrics.map((rep) => (
                    <div key={rep.id} className="p-3 sm:p-3.5 space-y-2.5 bg-white">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-[#57B71B]/15 text-[#57B71B] font-bold text-xs shrink-0">
                            {rep.name.charAt(0)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-xs text-txt-primary truncate" title={rep.name}>{rep.name}</p>
                            <span className="text-[9.5px] sm:text-[10px] font-semibold text-txt-muted uppercase truncate block" title={`${rep.role} • ${rep.teamName}`}>
                              {rep.role} &bull; {rep.teamName}
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs font-bold text-[#57B71B] font-tabular block">
                            {formatCurrency(rep.managedPipelineValue)}
                          </span>
                          <span className="text-[10px] text-txt-muted">Pipeline</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-1 sm:gap-1.5 pt-1 border-t border-border/50 text-center">
                        <div className="bg-slate-50 p-1 sm:p-1.5 rounded-btn min-w-0">
                          <span className="text-[9px] sm:text-[10px] text-txt-muted block truncate" title="Leads">Leads</span>
                          <span className="font-bold text-xs text-txt-primary font-tabular truncate block">{rep.assignedLeadsCount}</span>
                        </div>
                        <div className="bg-slate-50 p-1 sm:p-1.5 rounded-btn min-w-0">
                          <span className="text-[9px] sm:text-[10px] text-txt-muted block truncate" title="Deals">Deals</span>
                          <span className="font-bold text-xs text-txt-primary font-tabular truncate block">{rep.activeDealsCount}</span>
                        </div>
                        <div className="bg-slate-50 p-1 sm:p-1.5 rounded-btn min-w-0">
                          <span className="text-[9px] sm:text-[10px] text-txt-muted block truncate" title="Tasks">Tasks</span>
                          <span className={cn("font-bold text-xs font-tabular truncate block", rep.overdueTasksCount > 0 ? "text-[#DC2626]" : "text-txt-primary")}>
                            {rep.activeTasksCount}
                          </span>
                        </div>
                        <div className="bg-slate-50 p-1 sm:p-1.5 rounded-btn min-w-0">
                          <span className="text-[9px] sm:text-[10px] text-txt-muted block truncate" title="Activities">Activities</span>
                          <span className="font-bold text-xs text-txt-primary font-tabular truncate block">{rep.loggedActivitiesCount}</span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Mobile Team Total Summary Card */}
                  {repFilter === 'ALL' && (
                    <div className="p-3 sm:p-3.5 bg-slate-50 border-t-2 border-border space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-txt-primary">Team Total</span>
                        <span className="font-bold text-xs text-[#57B71B] font-tabular">
                          {formatCurrency(activePipelineValue)}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1 sm:gap-1.5 text-center text-xs">
                        <div className="bg-white p-1 sm:p-1.5 rounded border border-border/60 min-w-0">
                          <span className="text-[9px] sm:text-[10px] text-txt-muted block truncate" title="Leads">Leads</span>
                          <span className="font-bold font-tabular text-txt-primary text-xs truncate block">{leads.length}</span>
                        </div>
                        <div className="bg-white p-1 sm:p-1.5 rounded border border-border/60 min-w-0">
                          <span className="text-[9px] sm:text-[10px] text-txt-muted block truncate" title="Deals">Deals</span>
                          <span className="font-bold font-tabular text-txt-primary text-xs truncate block">{activeDeals.length}</span>
                        </div>
                        <div className="bg-white p-1 sm:p-1.5 rounded border border-border/60 min-w-0">
                          <span className="text-[9px] sm:text-[10px] text-txt-muted block truncate" title="Tasks">Tasks</span>
                          <span className="font-bold font-tabular text-txt-primary text-xs truncate block">{tasks.length}</span>
                        </div>
                        <div className="bg-white p-1 sm:p-1.5 rounded border border-border/60 min-w-0">
                          <span className="text-[9px] sm:text-[10px] text-txt-muted block truncate" title="Activities">Activities</span>
                          <span className="font-bold font-tabular text-txt-primary text-xs truncate block">{repMetrics.reduce((s, r) => s + r.loggedActivitiesCount, 0)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* 6. Section: Pipeline Stages Overview (From Live CRM Stages) */}
      {rawStages.length > 0 && (
        <Card className="border-border bg-slate-50/60 shadow-none">
          <CardHeader className="py-3 px-4 border-b border-border bg-slate-100/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sliders className="h-4 w-4 text-txt-muted" />
              <div>
                <CardTitle className="text-xs sm:text-sm font-bold text-txt-primary uppercase tracking-wide">
                  Pipeline Stages Overview
                </CardTitle>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px] font-bold bg-white text-txt-muted border-border self-start sm:self-auto">
              Live Database Configuration
            </Badge>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 space-y-3">
            <p className="text-[11px] text-txt-muted leading-relaxed">
              Active CRM pipeline stages configured in your database and current distribution across each phase:
            </p>

            <div className="grid grid-cols-1 min-[340px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5 pt-1">
              {rawStages.map((ps: any, idx: number) => {
                const stageDeals = deals.filter((d) => d.stageId === ps.id);
                const stageVal = stageDeals.reduce((sum, d) => sum + d.amount, 0);
                const stageLabel = `${ps.order ?? idx + 1}. ${ps.name}`;
                return (
                  <div key={ps.id || idx} className="p-2 sm:p-2.5 rounded-btn bg-white border border-border space-y-1 text-center min-w-0">
                    <span
                      className="text-[10px] font-bold text-txt-muted uppercase block leading-tight line-clamp-2 break-words"
                      title={stageLabel}
                    >
                      {stageLabel}
                    </span>
                    <span className="text-xs font-bold text-txt-primary block font-tabular truncate">
                      {formatCurrency(stageVal)}
                    </span>
                    <span className="text-[10px] text-txt-muted block font-medium font-tabular truncate">
                      {stageDeals.length} active deal{stageDeals.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
