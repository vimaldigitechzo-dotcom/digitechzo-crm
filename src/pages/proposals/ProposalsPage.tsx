import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/common/PageHeader';
import { FilterPills, FilterOption } from '@/components/common/FilterPills';
import { SearchInput } from '@/components/common/SearchInput';
import { EmptyState } from '@/components/common/EmptyState';
import { MetricCard } from '@/components/common/MetricCard';
import { ActionMenu } from '@/components/common/ActionMenu';
import { AlertBanner } from '@/components/common/AlertBanner';
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
import { CustomSelect } from '@/components/ui/CustomSelect';
import { useCrmDirectory } from '@/hooks/useCrmDirectory';
import { ProposalItem, ProposalStatus } from '@/types/crm';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  PlusCircle,
  FileText,
  Clock,
  CheckCircle2,
  RotateCcw,
  Eye,
  Check,
  XCircle,
  Send,
  Loader2,
  AlertCircle,
  Trash2,
} from 'lucide-react';

export const ProposalsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { teamUsers, teamOwnerNames, clients, clientNames } = useCrmDirectory();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [clientFilter, setClientFilter] = useState<string>('ALL');
  const [ownerFilter, setOwnerFilter] = useState<string>('ALL');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<ProposalItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionBanner, setActionBanner] = useState<{
    variant: 'success' | 'danger' | 'info';
    message: string;
  } | null>(null);

  // Form state
  const [newProposalForm, setNewProposalForm] = useState({
    title: '',
    leadId: '',
    ownerId: '',
    dealId: '',
    amount: 500000,
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    scopeNotes: '',
  });

  // Real backend queries
  const {
    data: proposalsResponse,
    isLoading: isProposalsLoading,
    isError: isProposalsError,
    error: proposalsError,
    refetch: refetchProposals,
  } = useQuery({
    queryKey: ['proposals'],
    queryFn: () => crmApi.getProposals({ limit: 100 }),
  });

  const { data: dealsResponse } = useQuery({
    queryKey: ['deals'],
    queryFn: () => crmApi.getDeals({ limit: 100 }),
  });

  // Extract raw lists
  const rawProposals = useMemo(() => {
    return (
      proposalsResponse?.data ||
      proposalsResponse?.items ||
      (Array.isArray(proposalsResponse) ? proposalsResponse : [])
    );
  }, [proposalsResponse]);

  const deals = useMemo(() => {
    return (
      dealsResponse?.deals ||
      dealsResponse?.data ||
      (Array.isArray(dealsResponse) ? dealsResponse : [])
    );
  }, [dealsResponse]);

  // Selected client for create proposal modal
  const selectedClient = useMemo(() => {
    return clients.find((c) => c.id === newProposalForm.leadId);
  }, [clients, newProposalForm.leadId]);

  // Map Backend proposals to frontend ProposalItem models
  const proposals: ProposalItem[] = useMemo(() => {
    return rawProposals.map((p: any) => {
      let status: ProposalStatus = 'DRAFT';
      if (p.status === 'REJECTED') {
        status = 'DECLINED';
      } else if (p.status === 'NEGOTIATION' || p.status === 'VIEWED') {
        status = 'UNDER_REVIEW';
      } else if (['DRAFT', 'SENT', 'ACCEPTED', 'EXPIRED', 'CANCELLED'].includes(p.status)) {
        status = p.status as ProposalStatus;
      }

      let versionNumber = 1;
      const vMatch = p.title?.match(/\(v(\d+)\)/i);
      if (vMatch) {
        versionNumber = parseInt(vMatch[1], 10);
      }
      const versionLabel = versionNumber > 1 ? `v${versionNumber} (Revised)` : `v${versionNumber}`;

      const clientName = p.lead?.fullName || 'Direct Prospect';
      const companyName = p.lead?.companyName || p.lead?.fullName || 'Direct Prospect';

      return {
        id: p.id,
        quoteNumber: p.proposalNumber || `PROP-${p.id.slice(0, 8)}`,
        proposalNumber: p.proposalNumber,
        title: p.title,
        clientName,
        companyName,
        leadId: p.leadId || '',
        dealId: p.dealId || undefined,
        dealTitle: p.deal?.title,
        versionNumber,
        versionLabel,
        amount: Number(p.totalAmount ?? p.subtotal ?? 0),
        status,
        validUntil: p.validUntil ? p.validUntil.split('T')[0] : '',
        ownerId: p.ownerId,
        ownerName: p.owner?.name || 'Assigned Agent',
        scopeNotes: p.description || p.notes || undefined,
        description: p.description,
        notes: p.notes,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      };
    });
  }, [rawProposals]);

  // Derived counts and values
  const totalValue = useMemo(() => proposals.reduce((acc, p) => acc + p.amount, 0), [proposals]);
  const underReviewCount = useMemo(() => proposals.filter((p) => p.status === 'UNDER_REVIEW').length, [proposals]);
  const acceptedCount = useMemo(() => proposals.filter((p) => p.status === 'ACCEPTED').length, [proposals]);
  const sentCount = useMemo(() => proposals.filter((p) => p.status === 'SENT').length, [proposals]);
  const draftCount = useMemo(() => proposals.filter((p) => p.status === 'DRAFT').length, [proposals]);
  const declinedCount = useMemo(() => proposals.filter((p) => p.status === 'DECLINED').length, [proposals]);

  // Unique clients and owners derived from data + CRM directory
  const uniqueClients = useMemo(() => {
    const fromProposals = proposals.map((p) => p.companyName).filter(Boolean);
    return Array.from(new Set([...fromProposals, ...clientNames]));
  }, [proposals, clientNames]);

  const uniqueOwners = useMemo(() => {
    const fromProposals = proposals.map((p) => p.ownerName).filter(Boolean);
    return Array.from(new Set([...fromProposals, ...teamOwnerNames]));
  }, [proposals, teamOwnerNames]);

  // Filter options for pills
  const filterOptions: FilterOption[] = useMemo(() => {
    return [
      { id: 'ALL', label: 'All', count: proposals.length },
      { id: 'UNDER_REVIEW', label: 'Under Review', count: underReviewCount, countVariant: 'info' },
      { id: 'SENT', label: 'Sent', count: sentCount },
      { id: 'DRAFT', label: 'Draft', count: draftCount },
      { id: 'ACCEPTED', label: 'Accepted', count: acceptedCount },
      { id: 'DECLINED', label: 'Declined', count: declinedCount, countVariant: 'danger' },
    ];
  }, [proposals.length, underReviewCount, sentCount, draftCount, acceptedCount, declinedCount]);

  // Filtered proposals
  const filteredProposals = useMemo(() => {
    return proposals.filter((p) => {
      if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
      if (clientFilter !== 'ALL') {
        const matchesClient = p.companyName === clientFilter || p.clientName === clientFilter;
        if (!matchesClient) return false;
      }
      if (ownerFilter !== 'ALL' && p.ownerName !== ownerFilter) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesQuote = p.quoteNumber.toLowerCase().includes(query);
        const matchesTitle = p.title.toLowerCase().includes(query);
        const matchesCompany = p.companyName.toLowerCase().includes(query);
        const matchesClient = p.clientName.toLowerCase().includes(query);
        const matchesDeal = (p.dealTitle || '').toLowerCase().includes(query);
        const matchesOwner = p.ownerName.toLowerCase().includes(query);
        if (!matchesQuote && !matchesTitle && !matchesCompany && !matchesClient && !matchesDeal && !matchesOwner) {
          return false;
        }
      }

      return true;
    });
  }, [proposals, statusFilter, clientFilter, ownerFilter, searchQuery]);

  const resetAllFilters = () => {
    setStatusFilter('ALL');
    setClientFilter('ALL');
    setOwnerFilter('ALL');
    setSearchQuery('');
  };

  const isFiltered = statusFilter !== 'ALL' || clientFilter !== 'ALL' || ownerFilter !== 'ALL' || searchQuery.trim() !== '';

  const getStatusBadge = (status: ProposalStatus) => {
    switch (status) {
      case 'UNDER_REVIEW':
        return <Badge variant="info">Under Review</Badge>;
      case 'SENT':
        return <Badge variant="tech">Sent</Badge>;
      case 'DRAFT':
        return <Badge variant="neutral">Draft</Badge>;
      case 'ACCEPTED':
        return <Badge variant="success">Accepted</Badge>;
      case 'DECLINED':
        return <Badge variant="danger">Declined</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  // Real backend create handler
  const handleCreateProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProposalForm.title.trim()) {
      setFormError('Proposal title is required');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      await crmApi.createProposal({
        title: newProposalForm.title.trim(),
        leadId: newProposalForm.leadId || undefined,
        dealId: newProposalForm.dealId || undefined,
        ownerId: newProposalForm.ownerId || undefined,
        subtotal: Number(newProposalForm.amount) || 0,
        totalAmount: Number(newProposalForm.amount) || 0,
        validUntil: newProposalForm.validUntil ? new Date(newProposalForm.validUntil).toISOString() : undefined,
        description: newProposalForm.scopeNotes.trim() || undefined,
      } as any);

      // Automatically advance linked deal to Stage 4 (Proposal Sent) and update value
      const targetLeadId = newProposalForm.leadId;
      const targetDealId = newProposalForm.dealId;
      const proposalAmount = Number(newProposalForm.amount) || 0;

      try {
        let dealToUpdateId = targetDealId;
        if (!dealToUpdateId && targetLeadId) {
          const dealsRes = await crmApi.getDeals({ leadId: targetLeadId, limit: 10 });
          const deals = dealsRes?.items || dealsRes?.data || [];
          const openDeal = deals.find((d: any) => d.status === 'OPEN');
          if (openDeal) dealToUpdateId = openDeal.id;
        }

        if (dealToUpdateId) {
          const stages = await crmApi.getPipelineStages();
          const proposalStage = stages.find(
            (s: any) => s.order === 4 || s.name.toLowerCase().includes('proposal')
          );
          if (proposalStage) {
            await crmApi.updateDealStage(dealToUpdateId, proposalStage.id);
          }
          if (proposalAmount > 0) {
            await crmApi.updateDeal(dealToUpdateId, { value: proposalAmount });
          }
        }
      } catch (e) {
        console.error('Failed to auto-advance deal on proposal creation:', e);
      }

      await queryClient.invalidateQueries({ queryKey: ['proposals'] });
      await queryClient.invalidateQueries({ queryKey: ['leads'] });
      await queryClient.invalidateQueries({ queryKey: ['deals'] });
      await queryClient.invalidateQueries({ queryKey: ['pipeline-stages'] });

      setIsCreateModalOpen(false);
      setNewProposalForm({
        title: '',
        leadId: '',
        ownerId: '',
        dealId: '',
        amount: 500000,
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        scopeNotes: '',
      });
    } catch (err: any) {
      setFormError(err.message || 'Failed to create proposal');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Revision handler: creates v(n+1) revision in real backend
  const handleCreateRevision = async (prop: ProposalItem) => {
    try {
      const nextVer = prop.versionNumber + 1;
      const baseTitle = prop.title.replace(/\s*\(v\d+\)/i, '').trim();
      const newTitle = `${baseTitle} (v${nextVer})`;

      await crmApi.createProposal({
        title: newTitle,
        leadId: prop.leadId || undefined,
        dealId: prop.dealId || undefined,
        subtotal: prop.amount,
        totalAmount: prop.amount,
        validUntil: prop.validUntil ? new Date(prop.validUntil).toISOString() : undefined,
        description: prop.scopeNotes,
      });

      await queryClient.invalidateQueries({ queryKey: ['proposals'] });
      await queryClient.invalidateQueries({ queryKey: ['deals'] });
      await queryClient.invalidateQueries({ queryKey: ['pipeline-stages'] });
      if (selectedProposal && selectedProposal.id === prop.id) {
        setSelectedProposal(null);
      }
    } catch (err: any) {
      console.error('Failed to create revision:', err);
    }
  };

  // Real backend status transition
  const handleUpdateStatus = async (propId: string, nextStatus: ProposalStatus) => {
    try {
      let backendStatus = 'DRAFT';
      let rejectionReason: string | undefined = undefined;

      if (nextStatus === 'ACCEPTED') backendStatus = 'ACCEPTED';
      else if (nextStatus === 'DECLINED') {
        backendStatus = 'REJECTED';
        rejectionReason = 'Declined by client';
      } else if (nextStatus === 'UNDER_REVIEW') backendStatus = 'NEGOTIATION';
      else if (nextStatus === 'SENT') backendStatus = 'SENT';
      else if (nextStatus === 'DRAFT') backendStatus = 'DRAFT';

      const response = await crmApi.updateProposalStatus(propId, {
        status: backendStatus,
        rejectionReason,
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['proposals'] }),
        queryClient.invalidateQueries({ queryKey: ['customers'] }),
        queryClient.invalidateQueries({ queryKey: ['leads'] }),
        queryClient.invalidateQueries({ queryKey: ['deals'] }),
        queryClient.invalidateQueries({ queryKey: ['pipeline-stages'] }),
      ]);

      if (selectedProposal && selectedProposal.id === propId) {
        setSelectedProposal((prev) => (prev ? { ...prev, status: nextStatus } : null));
      }

      if (nextStatus === 'ACCEPTED') {
        const msg =
          response?.message ||
          (response?.customerExisted
            ? 'Proposal accepted successfully. Linked to existing customer account.'
            : 'Proposal accepted successfully. Customer account created.');
        setActionBanner({
          variant: 'success',
          message: msg,
        });
      } else if (nextStatus === 'DECLINED') {
        setActionBanner({
          variant: 'info',
          message: response?.message || 'Proposal declined. Customer account has been removed.',
        });
      } else {
        setActionBanner({
          variant: 'info',
          message: `Proposal status updated to ${nextStatus}.`,
        });
      }
    } catch (err: any) {
      console.error('Failed to update status:', err);
      setActionBanner({
        variant: 'danger',
        message: err.message || 'Failed to update proposal status.',
      });
    }
  };

  // Real backend delete handler
  const handleDeleteProposal = async (propId: string) => {
    if (!window.confirm('Are you sure you want to delete this proposal?')) return;
    try {
      await crmApi.deleteProposal(propId);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['proposals'] }),
        queryClient.invalidateQueries({ queryKey: ['customers'] }),
        queryClient.invalidateQueries({ queryKey: ['leads'] }),
        queryClient.invalidateQueries({ queryKey: ['deals'] }),
      ]);
      if (selectedProposal?.id === propId) {
        setSelectedProposal(null);
      }
      setActionBanner({
        variant: 'info',
        message: 'Proposal deleted successfully.',
      });
    } catch (err: any) {
      console.error('Failed to delete proposal:', err);
    }
  };

  return (
    <div className="space-y-4 select-none max-w-full">
      {/* 1. Page Header */}
      <PageHeader
        title="Proposals"
        count={`${proposals.length} proposals`}
        badge={underReviewCount > 0 ? `${underReviewCount} under review` : undefined}
        badgeVariant="brand"
        actions={
          <Button
            size="sm"
            className="h-8 text-xs bg-[#57B71B] hover:bg-[#469815] text-white font-semibold cursor-pointer shrink-0"
            onClick={() => {
              setFormError(null);
              setIsCreateModalOpen(true);
            }}
          >
            <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
            Create Proposal
          </Button>
        }
      />

      {/* Action Notification Banner */}
      {actionBanner && (
        <AlertBanner
          variant={actionBanner.variant}
          message={actionBanner.message}
          onClose={() => setActionBanner(null)}
        />
      )}

      {/* 2. Compact Metric Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Total Quoted Value"
          value={formatCurrency(totalValue)}
          subtext="Active commercial pipeline"
          icon={FileText}
          iconVariant="neutral"
          onClick={() => setStatusFilter('ALL')}
          className={statusFilter === 'ALL' && !isFiltered ? 'border-[#57B71B] ring-1 ring-[#57B71B]/30' : ''}
        />
        <MetricCard
          label="Under Review"
          value={underReviewCount}
          subtext="Awaiting client decision"
          icon={Clock}
          iconVariant="info"
          onClick={() => setStatusFilter('UNDER_REVIEW')}
          className={statusFilter === 'UNDER_REVIEW' ? 'border-[#2563EB] ring-1 ring-[#2563EB]/30' : ''}
        />
        <MetricCard
          label="Accepted"
          value={acceptedCount}
          subtext="Won commercial contracts"
          subtextVariant="success"
          icon={CheckCircle2}
          iconVariant="success"
          onClick={() => setStatusFilter('ACCEPTED')}
          className={statusFilter === 'ACCEPTED' ? 'border-[#16A34A] ring-1 ring-[#16A34A]/30' : ''}
        />
        <MetricCard
          label="Drafts & Sent"
          value={draftCount + sentCount}
          subtext={`${sentCount} sent • ${draftCount} draft`}
          icon={Send}
          iconVariant="warning"
          onClick={() => setStatusFilter(sentCount > 0 ? 'SENT' : 'DRAFT')}
          className={statusFilter === 'SENT' || statusFilter === 'DRAFT' ? 'border-[#D97706] ring-1 ring-[#D97706]/30' : ''}
        />
      </div>

      {/* 3. Compact Toolbar & Filters */}
      <div className="flex flex-col gap-2.5 sm:gap-3 p-3 rounded-card border border-border bg-white shadow-none">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search proposals by quote #, client, deal, owner..."
            className="w-full sm:w-80"
          />

          <div className="flex items-center gap-2 flex-wrap">
            {/* Client Filter */}
            <div className="w-[140px]">
              <CustomSelect
                value={clientFilter}
                onChange={setClientFilter}
                options={[
                  { value: 'ALL', label: 'All Clients' },
                  ...uniqueClients.map((client) => ({ value: client, label: client })),
                ]}
              />
            </div>

            {/* Owner Filter */}
            <div className="w-[130px]">
              <CustomSelect
                value={ownerFilter}
                onChange={setOwnerFilter}
                options={[
                  { value: 'ALL', label: 'All Owners' },
                  ...uniqueOwners.map((owner) => ({ value: owner, label: owner })),
                ]}
              />
            </div>

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

        <FilterPills
          options={filterOptions}
          activeId={statusFilter}
          onChange={setStatusFilter}
        />
      </div>

      {/* Loading & Error States */}
      {isProposalsLoading && (
        <div className="p-12 bg-white rounded-card border border-border flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 text-[#57B71B] animate-spin" />
          <p className="text-xs text-txt-muted">Loading commercial proposals from server...</p>
        </div>
      )}

      {isProposalsError && (
        <div className="p-8 bg-red-50/50 rounded-card border border-red-200 flex flex-col items-center justify-center gap-3 text-center">
          <AlertCircle className="h-8 w-8 text-red-600" />
          <p className="text-sm font-semibold text-red-900">Failed to load proposals</p>
          <p className="text-xs text-red-700 max-w-md">{(proposalsError as any)?.message || 'An error occurred while fetching proposal data.'}</p>
          <Button size="sm" variant="outline" onClick={() => refetchProposals()} className="h-8 text-xs">
            Retry Connection
          </Button>
        </div>
      )}

      {/* 4. Primary View: Proposal Table */}
      {!isProposalsLoading && !isProposalsError && filteredProposals.length === 0 ? (
        <div className="p-8 bg-white rounded-card border border-border">
          <EmptyState
            icon={FileText}
            title="No proposals found"
            description="No quotation records match the current filter selection. Try resetting filters or create a new proposal."
            actionLabel={isFiltered ? "Reset filters" : "Create Proposal"}
            onAction={isFiltered ? resetAllFilters : () => { setFormError(null); setIsCreateModalOpen(true); }}
          />
        </div>
      ) : !isProposalsLoading && !isProposalsError && (
        <div className="space-y-3">
          {/* Desktop & Tablet Table (contained scrolling) */}
          <div className="hidden sm:block rounded-card border border-border bg-white overflow-hidden shadow-none">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/60">
                  <TableRow>
                    <TableHead className="py-2.5 text-xs font-bold text-txt-muted uppercase">Quote #</TableHead>
                    <TableHead className="py-2.5 text-xs font-bold text-txt-muted uppercase">Title / Scope</TableHead>
                    <TableHead className="py-2.5 text-xs font-bold text-txt-muted uppercase">Client / Deal</TableHead>
                    <TableHead className="py-2.5 text-xs font-bold text-txt-muted uppercase">Version</TableHead>
                    <TableHead className="py-2.5 text-xs font-bold text-txt-muted uppercase">Amount</TableHead>
                    <TableHead className="py-2.5 text-xs font-bold text-txt-muted uppercase">Status</TableHead>
                    <TableHead className="py-2.5 text-xs font-bold text-txt-muted uppercase">Valid Until</TableHead>
                    <TableHead className="py-2.5 text-xs font-bold text-txt-muted uppercase">Owner</TableHead>
                    <TableHead className="py-2.5 text-xs font-bold text-txt-muted uppercase text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProposals.map((p) => (
                    <TableRow key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <TableCell className="py-2.5">
                        <button
                          type="button"
                          onClick={() => setSelectedProposal(p)}
                          className="font-semibold text-xs text-primary hover:underline flex items-center gap-1.5 cursor-pointer font-mono"
                        >
                          <FileText className="h-3.5 w-3.5 shrink-0" />
                          <span>{p.quoteNumber}</span>
                        </button>
                      </TableCell>
                      <TableCell className="py-2.5">
                        <div className="text-xs">
                          <span className="font-semibold text-txt-primary block leading-tight truncate max-w-xs">
                            {p.title}
                          </span>
                          {p.scopeNotes && (
                            <span className="text-[11px] text-txt-muted truncate block max-w-xs">
                              {p.scopeNotes}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-2.5">
                        <div className="text-xs">
                          <Link
                            to="/leads"
                            className="font-semibold text-txt-primary hover:text-[#57B71B] transition-colors block leading-tight truncate max-w-xs"
                          >
                            {p.companyName}
                          </Link>
                          {p.dealTitle ? (
                            <span className="text-[11px] text-txt-secondary truncate block max-w-xs">
                              {p.dealTitle}
                            </span>
                          ) : (
                            <span className="text-[11px] text-txt-muted italic block">Lead proposal</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-2.5">
                        <Badge variant="neutral" className="text-[10px] font-mono">
                          {p.versionLabel}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2.5 font-bold text-xs text-txt-primary tabular-nums">
                        {formatCurrency(p.amount)}
                      </TableCell>
                      <TableCell className="py-2.5">
                        {getStatusBadge(p.status)}
                      </TableCell>
                      <TableCell className="py-2.5 text-xs font-medium tabular-nums text-txt-secondary">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-txt-muted shrink-0" />
                          <span>{p.validUntil ? formatDate(p.validUntil) : '—'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2.5 text-xs text-txt-secondary font-medium">
                        {p.ownerName}
                      </TableCell>
                      <TableCell className="py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setSelectedProposal(p)}
                            className="h-7 text-xs px-2.5 bg-slate-100 hover:bg-slate-200 text-txt-primary font-semibold cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            Preview
                          </Button>
                          <ActionMenu
                            items={[
                              {
                                label: 'View Details',
                                icon: Eye,
                                onClick: () => setSelectedProposal(p),
                              },
                              {
                                label: 'Create Revision (v+1)',
                                icon: RotateCcw,
                                onClick: () => handleCreateRevision(p),
                              },
                              ...(p.status === 'DRAFT'
                                ? [
                                    {
                                      label: 'Mark Sent',
                                      icon: Send,
                                      onClick: () => handleUpdateStatus(p.id, 'SENT'),
                                    },
                                  ]
                                : []),
                              ...(p.status !== 'ACCEPTED'
                                ? [
                                    {
                                      label: 'Mark Accepted',
                                      icon: Check,
                                      onClick: () => handleUpdateStatus(p.id, 'ACCEPTED'),
                                    },
                                  ]
                                : []),
                              ...(p.status !== 'DECLINED'
                                ? [
                                    {
                                      label: 'Mark Declined',
                                      icon: XCircle,
                                      onClick: () => handleUpdateStatus(p.id, 'DECLINED'),
                                    },
                                  ]
                                : []),
                              {
                                label: 'Delete Proposal',
                                icon: Trash2,
                                variant: 'danger' as const,
                                onClick: () => handleDeleteProposal(p.id),
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

          {/* Mobile Stacked Transformation (for 390px with 0 page overflow) */}
          <div className="sm:hidden space-y-2.5">
            {filteredProposals.map((p) => (
              <div
                key={p.id}
                className="rounded-card border border-border bg-white p-3.5 space-y-2.5 shadow-none"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedProposal(p)}
                      className="font-bold text-xs text-primary font-mono flex items-center gap-1"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span>{p.quoteNumber}</span>
                    </button>
                    <Badge variant="neutral" className="text-[10px] font-mono">
                      {p.versionLabel}
                    </Badge>
                  </div>
                  {getStatusBadge(p.status)}
                </div>

                <div>
                  <h4 className="font-bold text-xs text-txt-primary">{p.title}</h4>
                  <Link
                    to="/leads"
                    className="font-medium text-xs text-txt-secondary hover:text-[#57B71B] block mt-0.5"
                  >
                    {p.companyName}
                  </Link>
                  {p.dealTitle && (
                    <p className="text-[11px] text-txt-muted mt-0.5">{p.dealTitle}</p>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded-btn border border-slate-100">
                  <span className="text-txt-muted text-[11px]">Quoted Amount</span>
                  <span className="font-bold text-txt-primary tabular-nums">{formatCurrency(p.amount)}</span>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-txt-muted">Valid: {p.validUntil ? formatDate(p.validUntil) : '—'}</span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setSelectedProposal(p)}
                      className="h-7 text-xs px-2.5 bg-slate-100 hover:bg-slate-200 text-txt-primary font-semibold"
                    >
                      Preview
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Create Proposal Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-txt-primary">Create Proposal / Quotation</DialogTitle>
            <DialogDescription className="text-xs text-txt-muted">
              Generate a commercial quotation reference for an existing client or active deal.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateProposal} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 sm:px-5 sm:py-4 space-y-3 text-xs">
              {formError && (
                <div className="p-2.5 rounded-btn bg-red-50 border border-red-200 text-xs text-red-600 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-txt-primary">
                Proposal Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Enterprise Cloud Architecture Proposal"
                value={newProposalForm.title}
                onChange={(e) => setNewProposalForm({ ...newProposalForm, title: e.target.value })}
                className="w-full h-8 px-2.5 text-xs rounded-input border border-border bg-white text-txt-primary focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary shadow-subtle"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-txt-primary">Client / Prospect</label>
                <span className="text-[10px] text-txt-muted">{clients.length} clients available</span>
              </div>
              <CustomSelect
                value={newProposalForm.leadId}
                onChange={(val) => {
                  const chosen = clients.find((c) => c.id === val);
                  setNewProposalForm((prev) => ({
                    ...prev,
                    leadId: val,
                    title: !prev.title || prev.title.startsWith('Commercial Proposal -')
                      ? chosen ? `Commercial Proposal - ${chosen.displayName}` : prev.title
                      : prev.title,
                  }));
                }}
                placeholder="Select client or prospect..."
                options={[
                  { value: '', label: 'None / Direct Prospect' },
                  ...clients.map((c) => ({
                    value: c.id,
                    label: c.displayText,
                  })),
                ]}
              />

              {/* Selected client detailed card */}
              {selectedClient && (
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-btn text-[11px] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-txt-primary">{selectedClient.companyName}</span>
                    <Badge variant={selectedClient.type === 'customer' ? 'success' : 'brand'} className="text-[10px] py-0 px-1.5">
                      {selectedClient.type === 'customer' ? 'Customer Account' : 'Prospect Lead'}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 text-txt-muted">
                    {selectedClient.contactName && (
                      <span>Contact: <strong className="text-txt-primary font-medium">{selectedClient.contactName}</strong></span>
                    )}
                    {selectedClient.phone && (
                      <span>Phone: <strong className="text-txt-primary font-medium">{selectedClient.phone}</strong></span>
                    )}
                    {selectedClient.email && (
                      <span>Email: <strong className="text-txt-primary font-medium">{selectedClient.email}</strong></span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-txt-primary">Assigned Owner / BDE</label>
                <CustomSelect
                  value={newProposalForm.ownerId}
                  onChange={(val) => setNewProposalForm({ ...newProposalForm, ownerId: val })}
                  placeholder="Select owner..."
                  options={[
                    { value: '', label: 'Auto (Current User)' },
                    ...teamUsers.map((u) => ({
                      value: u.id,
                      label: `${u.name} (${u.role})`,
                    })),
                  ]}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-txt-primary">Related Deal</label>
                <CustomSelect
                  value={newProposalForm.dealId}
                  onChange={(val) => setNewProposalForm({ ...newProposalForm, dealId: val })}
                  placeholder="None (Direct Proposal)"
                  options={[
                    { value: '', label: 'None (Direct Proposal)' },
                    ...deals.map((deal: any) => ({
                      value: deal.id,
                      label: `${deal.title} (${formatCurrency(Number(deal.amount || 0))})`,
                    })),
                  ]}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 xs:grid-cols-2 gap-2.5 sm:gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-txt-primary">
                  Quoted Amount (INR) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={newProposalForm.amount}
                  onChange={(e) => setNewProposalForm({ ...newProposalForm, amount: Number(e.target.value) })}
                  className="w-full h-8 px-2.5 text-xs rounded-input border border-border bg-white text-txt-primary focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary shadow-subtle tabular-nums"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-txt-primary">Valid Until</label>
                <input
                  type="date"
                  required
                  value={newProposalForm.validUntil}
                  onChange={(e) => setNewProposalForm({ ...newProposalForm, validUntil: e.target.value })}
                  className="w-full h-8 px-2 text-xs rounded-input border border-border bg-white text-txt-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-subtle"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-txt-primary">Scope Summary / Deliverables</label>
              <textarea
                rows={2}
                placeholder="High-level commercial deliverable highlights..."
                value={newProposalForm.scopeNotes}
                onChange={(e) => setNewProposalForm({ ...newProposalForm, scopeNotes: e.target.value })}
                className="w-full p-2 text-xs rounded-input border border-border bg-white text-txt-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-subtle resize-none"
              />
            </div>
            </div>

            <DialogFooter className="px-4 py-3 sm:px-5 sm:py-3 border-t border-border flex items-center justify-end gap-2 shrink-0 bg-slate-50/95 mt-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreateModalOpen(false)}
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
                    Creating...
                  </>
                ) : (
                  'Create Proposal'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 6. Proposal Detail / Preview Modal */}
      <Dialog open={!!selectedProposal} onOpenChange={(open) => !open && setSelectedProposal(null)}>
        {selectedProposal && (
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-btn border bg-emerald-50 border-emerald-200/60 text-[#57B71B]">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <DialogTitle className="text-base font-bold text-txt-primary font-mono">
                      {selectedProposal.quoteNumber}
                    </DialogTitle>
                    {getStatusBadge(selectedProposal.status)}
                  </div>
                  <DialogDescription className="text-xs text-txt-muted">
                    {selectedProposal.versionLabel} • {selectedProposal.companyName}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 sm:px-5 sm:py-4 space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-card border border-border space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-txt-muted font-medium">Title</span>
                  <span className="font-semibold text-txt-primary">{selectedProposal.title}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-txt-muted font-medium">Client / Company</span>
                  <span className="font-semibold text-txt-primary">{selectedProposal.companyName}</span>
                </div>
                {selectedProposal.dealTitle && (
                  <div className="flex justify-between items-center">
                    <span className="text-txt-muted font-medium">Associated Deal</span>
                    <span className="font-medium text-txt-primary truncate max-w-[200px]">
                      {selectedProposal.dealTitle}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-txt-muted font-medium">Quoted Total</span>
                  <span className="font-bold text-txt-primary text-sm tabular-nums">
                    {formatCurrency(selectedProposal.amount)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-txt-muted font-medium">Valid Until</span>
                  <span className="font-medium text-txt-primary tabular-nums">
                    {selectedProposal.validUntil ? formatDate(selectedProposal.validUntil) : '—'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-txt-muted font-medium">Prepared By</span>
                  <span className="font-semibold text-txt-primary">{selectedProposal.ownerName}</span>
                </div>
              </div>

              {selectedProposal.scopeNotes && (
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-txt-muted uppercase tracking-wider">
                    Scope of Work / Deliverables
                  </span>
                  <p className="p-2.5 bg-white rounded-btn border border-border text-txt-secondary leading-relaxed text-xs">
                    {selectedProposal.scopeNotes}
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
                onClick={() => setSelectedProposal(null)}
              >
                Close
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs cursor-pointer"
                  onClick={() => handleCreateRevision(selectedProposal)}
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  New Revision
                </Button>

                {selectedProposal.status !== 'ACCEPTED' && (
                  <Button
                    size="sm"
                    className="h-8 text-xs bg-[#57B71B] hover:bg-[#469815] text-white font-semibold cursor-pointer"
                    onClick={() => handleUpdateStatus(selectedProposal.id, 'ACCEPTED')}
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Mark Accepted
                  </Button>
                )}

                {selectedProposal.status !== 'DECLINED' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 cursor-pointer"
                    onClick={() => handleUpdateStatus(selectedProposal.id, 'DECLINED')}
                  >
                    <XCircle className="h-3 w-3 mr-1" />
                    Mark Declined
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
