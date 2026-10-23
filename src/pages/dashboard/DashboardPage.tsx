import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useAuth } from '@/hooks/useAuth';
import { crmApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Clock,
  PhoneCall,
  Flame,
  Calendar,
  MessageSquare,
  TrendingUp,
  Activity,
  Building2,
  ChevronRight,
  CheckCircle2,
  Users,
  Mail,
  Loader2,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Dynamic Browser Date and Time State
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const dayName = currentTime.toLocaleDateString('en-US', { weekday: 'long' });
  const formattedDate = currentTime.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const formattedTime = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  // Real Backend CRM Data Queries
  const { data: leadsData, isLoading: leadsLoading } = useQuery({
    queryKey: ['dashboard-leads'],
    queryFn: () => crmApi.getLeads({ limit: 10 }),
  });

  const { data: dealsData, isLoading: dealsLoading } = useQuery({
    queryKey: ['dashboard-deals'],
    queryFn: () => crmApi.getDeals({ limit: 50 }),
  });

  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: ['dashboard-tasks'],
    queryFn: () => crmApi.getTasks({ limit: 10 }),
  });

  const { data: activitiesData, isLoading: activitiesLoading } = useQuery({
    queryKey: ['dashboard-activities'],
    queryFn: () => crmApi.getActivities({ limit: 10 }),
  });

  const leads: any[] = leadsData?.items || leadsData?.data || [];
  const deals: any[] = dealsData?.items || dealsData?.data || [];
  const tasks: any[] = tasksData?.data || tasksData?.items || [];
  const activities: any[] = activitiesData?.data || activitiesData?.items || [];

  const activeDeals = deals.filter((d) => d.status !== 'LOST');
  const totalPipelineValue = activeDeals.reduce((acc, d) => acc + (Number(d.value) || 0), 0);
  const totalDealsCount = activeDeals.length;

  const hotLeads = leads.filter(
    (l) => l.temperature === 'HOT' || l.priority === 'URGENT' || l.status === 'HOT'
  );

  const now = new Date();
  const overdueTasks = tasks.filter((t) => {
    if (t.status === 'OVERDUE') return true;
    if (t.status === 'PENDING' && t.dueDate) {
      return new Date(t.dueDate).getTime() < now.getTime();
    }
    return false;
  });

  const pendingTasks = tasks.filter((t) => t.status === 'PENDING');

  const standardStages = [
    { name: 'Qualification', stageType: 'OPEN' },
    { name: 'Discovery', stageType: 'OPEN' },
    { name: 'Proposal Sent', stageType: 'OPEN' },
    { name: 'Negotiation', stageType: 'OPEN' },
    { name: 'Closed Won', stageType: 'WON' },
    { name: 'Closed Lost', stageType: 'LOST' },
  ];

  const stagesSummary = standardStages.map((stage) => {
    const stageDeals = deals.filter(
      (d) =>
        (d.stage?.name && d.stage.name.toLowerCase() === stage.name.toLowerCase()) ||
        (d.stageName && d.stageName.toLowerCase() === stage.name.toLowerCase())
    );
    const stageValue = stageDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);
    return {
      name: stage.name,
      stageType: stage.stageType,
      dealCount: stageDeals.length,
      totalValue: stageValue,
    };
  });

  const isLoading = leadsLoading && dealsLoading && tasksLoading && activitiesLoading;

  return (
    <div className="space-y-6 select-none">
      {/* 1. Page Header with Dynamic Date & Time Widgets */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3.5 border-b border-border">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-txt-primary">
              Dashboard
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-[#16A34A] border border-emerald-200">
              {user ? `${user.firstName} (${user.role})` : 'DigiTechzo (ADMIN)'}
            </span>
          </div>
          <p className="text-xs text-txt-muted mt-1">
            Your sales activity and priority queue at a glance.
          </p>
        </div>

        {/* Dynamic Date & Time Widget */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {/* Today Date Widget matching screenshot */}
          <div className="flex items-center gap-3 px-3.5 py-2 rounded-xl bg-white border border-border shadow-2xs">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-[#16A34A] shrink-0 border border-emerald-100">
              <Calendar className="h-4 w-4" />
            </div>
            <div className="text-left leading-tight">
              <span className="text-[10px] font-bold text-txt-muted uppercase tracking-wider block">
                Today
              </span>
              <span className="text-xs font-bold text-txt-primary block mt-0.5">
                {dayName}
              </span>
              <span className="text-[11px] text-txt-secondary block mt-0.5">
                {formattedDate} &bull; {formattedTime}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. KPI Summary: 4 Action-Focused Metric Cards (2-column on mobile, 4-column on desktop) */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Metric 1: Overdue */}
        <Card
          onClick={() => navigate('/tasks?filter=OVERDUE')}
          title="Click to view Overdue Tasks"
          className="cursor-pointer border-border hover:border-[#DC2626]/70 hover:shadow-subtle transition-all active:scale-[0.99] group shadow-none rounded-xl"
        >
          <CardContent className="p-2.5 sm:p-4 flex items-center justify-between gap-1.5 sm:gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div
                className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full shrink-0 transition-transform group-hover:scale-105 ${
                  overdueTasks.length > 0
                    ? 'bg-[#FEF2F2] text-[#DC2626] border border-rose-200'
                    : 'bg-emerald-50 text-[#16A34A] border border-emerald-100'
                }`}
              >
                <Clock className="h-4 w-4" />
              </div>
              <div className="space-y-0.5 min-w-0 flex-1">
                <p
                  title="Overdue Tasks"
                  className="text-[10px] sm:text-[11px] font-bold text-txt-muted uppercase tracking-tight group-hover:text-txt-primary transition-colors leading-tight line-clamp-1 xs:line-clamp-2"
                >
                  Overdue
                </p>
                <div
                  className={`text-xl sm:text-2xl font-bold tracking-tight font-tabular leading-tight ${
                    overdueTasks.length > 0 ? 'text-[#DC2626]' : 'text-txt-primary'
                  }`}
                >
                  {overdueTasks.length}
                </div>
                <p
                  className={`text-[10px] sm:text-[11px] font-medium truncate ${
                    overdueTasks.length > 0 ? 'text-[#DC2626]' : 'text-txt-muted'
                  }`}
                >
                  {overdueTasks.length > 0 ? 'Action required' : 'None overdue'}
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-txt-primary shrink-0 transition-colors hidden min-[360px]:block" />
          </CardContent>
        </Card>

        {/* Metric 2: Follow-ups Due */}
        <Card
          onClick={() => navigate('/tasks?filter=PENDING')}
          title="Click to view Follow-ups & Pending Tasks"
          className="cursor-pointer border-border hover:border-[#57B71B]/70 hover:shadow-subtle transition-all active:scale-[0.99] group shadow-none rounded-xl"
        >
          <CardContent className="p-2.5 sm:p-4 flex items-center justify-between gap-1.5 sm:gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-emerald-50 text-[#16A34A] border border-emerald-100 shrink-0 transition-transform group-hover:scale-105">
                <PhoneCall className="h-4 w-4" />
              </div>
              <div className="space-y-0.5 min-w-0 flex-1">
                <p
                  title="Follow-ups Due"
                  className="text-[10px] sm:text-[11px] font-bold text-txt-muted uppercase tracking-tight group-hover:text-txt-primary transition-colors leading-tight line-clamp-1 xs:line-clamp-2"
                >
                  Follow-ups Due
                </p>
                <div className="text-xl sm:text-2xl font-bold tracking-tight text-txt-primary font-tabular leading-tight">
                  {pendingTasks.length}
                </div>
                <p className="text-[10px] sm:text-[11px] text-txt-secondary font-medium truncate">
                  {pendingTasks.length === 0 ? 'All caught up' : `${pendingTasks.length} pending`}
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-txt-primary shrink-0 transition-colors hidden min-[360px]:block" />
          </CardContent>
        </Card>

        {/* Metric 3: Hot Leads */}
        <Card
          onClick={() => navigate('/leads?status=HOT')}
          title="Click to view Hot Leads"
          className="cursor-pointer border-border hover:border-[#D97706]/70 hover:shadow-subtle transition-all active:scale-[0.99] group shadow-none rounded-xl"
        >
          <CardContent className="p-2.5 sm:p-4 flex items-center justify-between gap-1.5 sm:gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div
                className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full shrink-0 transition-transform group-hover:scale-105 ${
                  hotLeads.length > 0
                    ? 'bg-[#FFFBEB] text-[#D97706] border border-amber-200'
                    : 'bg-emerald-50 text-[#16A34A] border border-emerald-100'
                }`}
              >
                <Flame className="h-4 w-4" />
              </div>
              <div className="space-y-0.5 min-w-0 flex-1">
                <p
                  title="Hot Leads"
                  className="text-[10px] sm:text-[11px] font-bold text-txt-muted uppercase tracking-tight group-hover:text-txt-primary transition-colors leading-tight line-clamp-1 xs:line-clamp-2"
                >
                  Hot Leads
                </p>
                <div
                  className={`text-xl sm:text-2xl font-bold tracking-tight font-tabular leading-tight ${
                    hotLeads.length > 0 ? 'text-[#D97706]' : 'text-txt-primary'
                  }`}
                >
                  {hotLeads.length}
                </div>
                <p className="text-[10px] sm:text-[11px] text-txt-secondary font-medium truncate">
                  {hotLeads.length > 0 ? 'High priority' : 'No hot leads'}
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-txt-primary shrink-0 transition-colors hidden min-[360px]:block" />
          </CardContent>
        </Card>

        {/* Metric 4: Pipeline Value */}
        <Card
          onClick={() => navigate('/pipeline')}
          title="Click to view Deals & Pipeline"
          className="cursor-pointer border-border hover:border-[#16A34A]/70 hover:shadow-subtle transition-all active:scale-[0.99] group shadow-none rounded-xl"
        >
          <CardContent className="p-2.5 sm:p-4 flex items-center justify-between gap-1.5 sm:gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-emerald-50 text-[#16A34A] border border-emerald-100 shrink-0 transition-transform group-hover:scale-105">
                <span className="font-bold text-sm">₹</span>
              </div>
              <div className="space-y-0.5 min-w-0 flex-1">
                <p
                  title="Active Pipeline"
                  className="text-[10px] sm:text-[11px] font-bold text-txt-muted uppercase tracking-tight group-hover:text-txt-primary transition-colors leading-tight line-clamp-1 xs:line-clamp-2"
                >
                  Active Pipeline
                </p>
                <div className="text-base sm:text-xl xl:text-2xl font-bold tracking-tight text-txt-primary font-tabular whitespace-nowrap leading-tight truncate">
                  {formatCurrency(totalPipelineValue)}
                </div>
                <p className="text-[10px] sm:text-[11px] text-[#16A34A] font-medium flex items-center gap-1 truncate">
                  <TrendingUp className="h-3 w-3 shrink-0" /> {totalDealsCount} active deals
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-txt-primary shrink-0 transition-colors hidden min-[360px]:block" />
          </CardContent>
        </Card>
      </div>

      {isLoading && (
        <div className="py-6 flex items-center justify-center text-xs text-txt-muted gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Loading dashboard insights...
        </div>
      )}

      {/* 3. Main Operational Workspace (Mobile order: 1. Priority Follow-ups, 2. Pipeline Snapshot, 3. Recent Leads, 4. Recent Activity) */}
      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-4 sm:gap-6">
        {/* Section 1: Priority Follow-ups / Action Queue */}
        <div className="order-1 lg:col-span-7">
          <Card className="border-border shadow-none rounded-xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between py-3 px-4 sm:px-5 border-b border-border bg-slate-50/50">
              <div className="flex items-center gap-2">
                <CardTitle className="text-xs sm:text-sm font-bold text-txt-primary uppercase tracking-wide">
                  Priority Follow-ups
                </CardTitle>
                {tasks.length > 0 ? (
                  <Link
                    to="/tasks?filter=PENDING"
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors shadow-2xs"
                    title="Click to view pending follow-ups"
                  >
                    <span className="font-bold tabular-nums">{tasks.length}</span>
                    <span>Pending</span>
                  </Link>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    0 Pending
                  </span>
                )}
              </div>
              <Link
                to="/tasks"
                className="text-xs text-[#57B71B] hover:text-[#469815] font-semibold flex items-center gap-1 transition-colors"
              >
                View all <ChevronRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {tasks.length === 0 ? (
                <div className="p-8 text-center flex flex-col items-center justify-center">
                  <div className="h-11 w-11 rounded-full bg-[#F0FDF4] border border-emerald-200 flex items-center justify-center text-[#16A34A] mb-2.5 shadow-2xs">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-bold text-txt-primary">No pending follow-ups</p>
                  <p className="text-[11px] text-txt-muted max-w-xs mt-0.5 leading-relaxed">
                    All caught up! No scheduled calls, messages, or tasks are overdue.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {tasks.slice(0, 5).map((task) => {
                    const isOverdue = task.status === 'OVERDUE';
                    const actionType = task.taskType || task.actionType || 'CALL';
                    return (
                      <div
                        key={task.id}
                        onClick={() => navigate(`/tasks?filter=${isOverdue ? 'OVERDUE' : 'PENDING'}`)}
                        title={`Click to view in Tasks (${isOverdue ? 'Overdue' : 'Pending'})`}
                        className="cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between p-3.5 px-4 sm:px-5 hover:bg-slate-50/80 transition-colors gap-2.5 sm:gap-0"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-btn shrink-0 ${
                              actionType === 'CALL'
                                ? 'bg-[#F0FDF4] text-[#57B71B]'
                                : actionType === 'WHATSAPP'
                                ? 'bg-emerald-50 text-[#16A34A]'
                                : actionType === 'EMAIL'
                                ? 'bg-blue-50 text-[#2563EB]'
                                : 'bg-purple-50 text-[#7C3AED]'
                            }`}
                          >
                            {actionType === 'CALL' && <PhoneCall className="h-3.5 w-3.5" />}
                            {actionType === 'WHATSAPP' && <MessageSquare className="h-3.5 w-3.5" />}
                            {actionType === 'EMAIL' && <Mail className="h-3.5 w-3.5" />}
                            {actionType !== 'CALL' &&
                              actionType !== 'WHATSAPP' &&
                              actionType !== 'EMAIL' && <Calendar className="h-3.5 w-3.5" />}
                          </div>
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <p
                              title={task.title}
                              className="text-xs font-bold text-txt-primary line-clamp-2 break-words leading-snug"
                            >
                              {task.title}
                            </p>
                            <p
                              className="text-[11px] text-txt-muted flex items-center gap-1.5 min-w-0"
                              title={task.lead?.fullName || task.leadName || 'General Follow-up'}
                            >
                              <Building2 className="h-3 w-3 shrink-0" />
                              <span className="break-words leading-tight">{task.lead?.fullName || task.leadName || 'General Follow-up'}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pt-1 sm:pt-0 border-t border-slate-100 sm:border-0">
                          <div className="flex items-center gap-2">
                            <StatusBadge status={task.status} type="task" />
                            <span
                              className={`text-[11px] font-medium ${
                                isOverdue ? 'text-[#DC2626]' : 'text-txt-muted'
                              }`}
                            >
                              {task.dueTime || formatDate(task.dueDate)}
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-7 text-xs px-2.5 bg-slate-100 hover:bg-slate-200 text-txt-primary cursor-pointer"
                            asChild
                          >
                            <Link to="/activities">Log</Link>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Section 2: Pipeline Snapshot */}
        <div className="order-2 lg:col-span-5">
          <Card className="border-border shadow-none rounded-xl overflow-hidden">
            <CardHeader className="py-3 px-4 sm:px-5 border-b border-border flex flex-row items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <CardTitle className="text-xs sm:text-sm font-bold text-txt-primary uppercase tracking-wide">
                  Pipeline Snapshot
                </CardTitle>
                <Link
                  to="/pipeline"
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors shadow-2xs"
                  title="Click to view all deals in Pipeline"
                >
                  <span className="font-bold tabular-nums">{totalDealsCount}</span>
                  <span>Deals</span>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 space-y-2">
              {stagesSummary.map((stage) => {
                const isWon = stage.stageType === 'WON';
                const percentage =
                  totalPipelineValue > 0
                    ? Math.round((stage.totalValue / totalPipelineValue) * 100)
                    : 0;

                return (
                  <div
                    key={stage.name}
                    onClick={() => navigate('/pipeline')}
                    title={`Click to view ${stage.name} deals in Pipeline`}
                    className="cursor-pointer p-2 sm:p-2.5 rounded-lg border border-border/70 bg-white hover:bg-slate-50 hover:border-[#57B71B]/60 transition-all space-y-1.5 active:scale-[0.99]"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`h-2 w-2 rounded-full shrink-0 ${
                            isWon ? 'bg-[#16A34A]' : 'bg-[#57B71B]'
                          }`}
                        />
                        <span className="font-semibold text-txt-primary truncate">{stage.name}</span>
                      </div>
                      <div className="flex items-center gap-2 font-tabular shrink-0 ml-2">
                        <span className="text-[10px] sm:text-[11px] px-1.5 py-0.2 rounded bg-slate-100 text-txt-secondary font-medium">
                          {stage.dealCount} deals
                        </span>
                        <span className="font-bold text-txt-primary text-xs">
                          {formatCurrency(stage.totalValue)}
                        </span>
                      </div>
                    </div>

                    {/* Stage Distribution Progress Bar */}
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isWon ? 'bg-[#16A34A]' : 'bg-[#57B71B]'
                        }`}
                        style={{ width: `${stage.dealCount > 0 ? Math.max(percentage, 5) : 0}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Section 3: Recent Leads */}
        <div className="order-3 lg:col-span-7">
          <Card className="border-border shadow-none rounded-xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between py-3 px-4 sm:px-5 border-b border-border bg-slate-50/50">
              <div className="flex items-center gap-2">
                <CardTitle className="text-xs sm:text-sm font-bold text-txt-primary uppercase tracking-wide">
                  Recent Leads
                </CardTitle>
                <Link
                  to="/leads"
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors shadow-2xs"
                  title="Click to view all Leads"
                >
                  <span className="font-bold tabular-nums">{leads.length}</span>
                  <span>Leads</span>
                </Link>
              </div>
              <Link
                to="/leads"
                className="text-xs text-[#57B71B] hover:text-[#469815] font-semibold flex items-center gap-1 transition-colors"
              >
                All leads <ChevronRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {leads.length === 0 ? (
                <div className="p-8 text-center flex flex-col items-center justify-center">
                  <div className="h-11 w-11 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-txt-muted mb-2.5 shadow-2xs">
                    <Users className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-bold text-txt-primary">No leads recorded yet</p>
                  <p className="text-[11px] text-txt-muted max-w-xs mt-0.5 leading-relaxed">
                    Leads created by your sales team will automatically appear here.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {leads.slice(0, 4).map((lead) => (
                    <div
                      key={lead.id}
                      onClick={() => navigate(`/leads/${lead.id}`)}
                      title={`Click to open ${lead.fullName}`}
                      className="cursor-pointer p-3 px-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-slate-50/80 transition-colors gap-2 sm:gap-0 min-w-0 w-full overflow-hidden"
                    >
                      <div className="min-w-0 max-w-full space-y-0.5 flex-1 overflow-hidden">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-txt-primary hover:text-[#57B71B] transition-colors break-words max-w-full">
                            {lead.fullName}
                          </span>
                          <StatusBadge status={lead.status} type="lead" />
                        </div>
                        <p
                          className="text-[11px] text-txt-secondary flex flex-wrap items-center gap-1 min-w-0"
                          title={`${lead.companyName || 'Individual'} • ${lead.serviceInterest || 'General Inquiry'}`}
                        >
                          <span className="shrink-0 font-medium">{lead.companyName || 'Individual'}</span>
                          <span className="text-txt-muted/60 shrink-0">&bull;</span>
                          <span className="text-txt-muted break-words min-w-0">{lead.serviceInterest || 'General Inquiry'}</span>
                        </p>
                      </div>

                      <div className="text-left sm:text-right shrink-0 pt-1 sm:pt-0 border-t border-slate-100 sm:border-0 min-w-0 max-w-full">
                        {lead.nextAction?.dueDate ? (
                          <span className="text-[11px] text-[#57B71B] font-semibold block break-words">
                            Next: {lead.nextAction.type || 'Follow-up'} ({formatDate(lead.nextAction.dueDate)})
                          </span>
                        ) : (
                          <span className="text-[11px] text-txt-muted block">No action scheduled</span>
                        )}
                        <span className="text-[10px] text-txt-muted block mt-0.5 break-words">
                          Owner: {lead.ownerName || lead.owner?.name || 'Unassigned'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Section 4: Recent Sales Activity */}
        <div className="order-4 lg:col-span-5">
          <Card className="border-border shadow-none rounded-xl overflow-hidden">
            <CardHeader className="py-3 px-4 sm:px-5 border-b border-border flex flex-row items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <CardTitle className="text-xs sm:text-sm font-bold text-txt-primary uppercase tracking-wide">
                  Recent Activity
                </CardTitle>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-100 text-txt-secondary border border-border">
                  {activities.length}
                </span>
              </div>
              <Link
                to="/activities"
                className="text-xs text-[#57B71B] hover:text-[#469815] font-semibold flex items-center gap-1 transition-colors"
              >
                History <ChevronRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent className="p-3 sm:p-4">
              {activities.length === 0 ? (
                <div className="py-6 text-center flex flex-col items-center justify-center">
                  <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-txt-muted mb-2">
                    <Activity className="h-4 w-4" />
                  </div>
                  <p className="text-xs font-bold text-txt-primary">No recent activity</p>
                  <p className="text-[11px] text-txt-muted max-w-xs mt-0.5">
                    Sales calls, client communications, and deals history will appear here.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {activities.slice(0, 3).map((act) => (
                    <div key={act.id} className="py-2.5 first:pt-0 last:pb-0 space-y-1 text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-1.5 min-w-0 flex-1">
                          <Activity className="h-3.5 w-3.5 text-txt-muted shrink-0 mt-0.5" />
                          <span
                            className="font-bold text-txt-primary line-clamp-2 break-words leading-tight"
                            title={act.subject || act.title || 'Activity'}
                          >
                            {act.subject || act.title || 'Activity'}
                          </span>
                        </div>
                        <span className="text-[10px] text-txt-muted shrink-0 font-medium tabular-nums pt-0.5">
                          {formatDate(act.activityDate || act.createdAt)}
                        </span>
                      </div>
                      <p className="text-[11px] text-txt-secondary leading-relaxed line-clamp-2 pl-5 break-words">
                        {act.description || 'No additional notes provided.'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
