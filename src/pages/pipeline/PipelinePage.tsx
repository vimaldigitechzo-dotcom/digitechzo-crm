import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/common/PageHeader';
import { SearchInput } from '@/components/common/SearchInput';
import { FilterPills, FilterOption } from '@/components/common/FilterPills';
import { ActionMenu } from '@/components/common/ActionMenu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { crmApi } from '@/lib/api';
import { Deal, PipelineStage } from '@/types/crm';
import { formatCurrency } from '@/lib/utils';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { useCrmDirectory } from '@/hooks/useCrmDirectory';
import {
  KanbanSquare,
  Table as TableIcon,
  PlusCircle,
  Building,
  Calendar,
  User as UserIcon,
  ExternalLink,
  CheckCircle2,
  X,
  TrendingUp,
  Edit,
  Trash2,
  AlertCircle,
  Loader2,
  XCircle,
  ChevronRight,
} from 'lucide-react';

export const PipelinePage: React.FC = () => {
  const queryClient = useQueryClient();
  const { teamOwnerNames } = useCrmDirectory();

  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('ALL');
  const [mobileStageFilter, setMobileStageFilter] = useState('ALL');

  // Real API Queries
  const {
    data: stagesResponse,
    isLoading: isStagesLoading,
    isError: isStagesError,
    error: stagesError,
    refetch: refetchStages,
  } = useQuery({
    queryKey: ['pipeline-stages'],
    queryFn: () => crmApi.getPipelineStages(),
  });

  const {
    data: lostReasonsResponse,
  } = useQuery({
    queryKey: ['lost-reasons'],
    queryFn: () => crmApi.getLostReasons(),
  });

  const rawStages = useMemo(() => {
    const list = (stagesResponse as any)?.data || (Array.isArray(stagesResponse) ? stagesResponse : []);
    return Array.isArray(list) ? list : [];
  }, [stagesResponse]);

  const lostReasons = useMemo(() => {
    const list = (lostReasonsResponse as any)?.data || (Array.isArray(lostReasonsResponse) ? lostReasonsResponse : []);
    return Array.isArray(list) ? list : [];
  }, [lostReasonsResponse]);

  const {
    data: dealsResponse,
    isLoading: isDealsLoading,
    isError: isDealsError,
    error: dealsError,
    refetch: refetchDeals,
  } = useQuery({
    queryKey: ['deals'],
    queryFn: () => crmApi.getDeals({ limit: 100 }),
  });

  // Query all active leads for deal association
  const { data: leadsResponse } = useQuery({
    queryKey: ['leads'],
    queryFn: () => crmApi.getLeads({ limit: 100 }),
  });

  const leads = useMemo(() => {
    return leadsResponse?.items || leadsResponse?.data || [];
  }, [leadsResponse]);

  // Map Backend Deals into frontend Deal model
  const rawDeals = useMemo(() => {
    const list = dealsResponse?.data?.items || dealsResponse?.items || dealsResponse?.data || (Array.isArray(dealsResponse) ? dealsResponse : []);
    return Array.isArray(list) ? list : [];
  }, [dealsResponse]);

  const deals: Deal[] = useMemo(() => {
    return rawDeals.map((item: any) => ({
      id: item.id,
      title: item.title,
      leadId: item.leadId ?? null,
      leadName: item.leadName || item.companyName || 'Prospect',
      companyName: item.leadName || undefined,
      stageId: item.stageId,
      stageName: item.stageName,
      amount: Number(item.value) || 0,
      currency: 'INR',
      probability: item.probability ?? 50,
      expectedCloseDate: item.expectedCloseDate ? item.expectedCloseDate.split('T')[0] : '',
      ownerId: item.ownerId || '',
      ownerName: item.ownerName || 'Unassigned',
      status: item.status as 'OPEN' | 'WON' | 'LOST',
      lostReasonId: item.lostReasonId ?? null,
      lostReasonLabel: item.lostReasonLabel ?? null,
      lostReasonNotes: item.lostReasonNotes ?? null,
      wonNotes: item.wonNotes ?? null,
      closedAt: item.closedAt ?? null,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));
  }, [rawDeals]);

const DEFAULT_PIPELINE_STAGES: PipelineStage[] = [
  { id: 'd6e050d2-30c3-442f-ab5d-1a53e3a0532d', name: 'New Lead (Qualification)', order: 1, dealCount: 0, totalValue: 0, stageType: 'OPEN' },
  { id: '74d8f2ff-c931-4ad1-880d-d01b8ccaac9e', name: 'Discovery & Requirement Discussion', order: 2, dealCount: 0, totalValue: 0, stageType: 'OPEN' },
  { id: 'dc3fdff3-a0c8-433d-a6c5-4b9f0fd46e84', name: 'Demo / Meeting Completed', order: 3, dealCount: 0, totalValue: 0, stageType: 'OPEN' },
  { id: '790a2e7e-8c2d-4222-915f-ba0f378f2af9', name: 'Proposal Sent', order: 4, dealCount: 0, totalValue: 0, stageType: 'OPEN' },
  { id: '4171a46f-c0bc-4812-847e-a1d5ef3ca1e2', name: 'Negotiation', order: 5, dealCount: 0, totalValue: 0, stageType: 'OPEN' },
  { id: 'bf98ca23-4c85-48ef-ad6b-89a9fecd36c9', name: 'Closed Won', order: 6, dealCount: 0, totalValue: 0, stageType: 'WON' },
  { id: '4186f156-bc5d-4162-b7a8-0fc65b7f6d7a', name: 'Closed Lost', order: 7, dealCount: 0, totalValue: 0, stageType: 'LOST' },
];

  // Compute Stages with real aggregate counts and totals
  const stages: PipelineStage[] = useMemo(() => {
    const stageSource = (rawStages && rawStages.length > 0) ? rawStages : DEFAULT_PIPELINE_STAGES;
    return stageSource.map((s) => {
      const stageDeals = deals.filter((d) => d.stageId === s.id);
      const totalValue = stageDeals.reduce((sum, d) => sum + (d.amount || 0), 0);
      return {
        id: s.id,
        name: s.name,
        order: s.order,
        dealCount: stageDeals.length,
        totalValue,
        stageType: s.stageType as 'OPEN' | 'WON' | 'LOST',
      };
    });
  }, [rawStages, deals]);

  // Modal & Form states
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);

  // Add Deal Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddSubmitting, setIsAddSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [newDealForm, setNewDealForm] = useState({
    title: '',
    leadId: '',
    stageId: DEFAULT_PIPELINE_STAGES[0].id,
    amount: 500000,
    probability: 50,
    expectedCloseDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
  });

  // Ensure default stageId is set when stages load
  useEffect(() => {
    if (stages.length > 0 && !newDealForm.stageId) {
      setNewDealForm((prev) => ({ ...prev, stageId: stages[0].id }));
    }
  }, [stages, newDealForm.stageId]);

  // Edit Deal Modal state
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    amount: 0,
    stageId: '',
    probability: 50,
    expectedCloseDate: '',
  });

  // Lost Deal Modal state
  const [lostDealModal, setLostDealModal] = useState<Deal | null>(null);
  const [selectedLostReasonId, setSelectedLostReasonId] = useState('');
  const [lostReasonNotes, setLostReasonNotes] = useState('');
  const [isLostSubmitting, setIsLostSubmitting] = useState(false);
  const [lostError, setLostError] = useState<string | null>(null);

  // Set default lost reason when modal opens
  useEffect(() => {
    if (lostReasons.length > 0 && !selectedLostReasonId) {
      setSelectedLostReasonId(lostReasons[0].id);
    }
  }, [lostReasons, selectedLostReasonId]);

  // Global action error banner
  const [actionError, setActionError] = useState<string | null>(null);

  // Calculate totals
  const totalPipelineValue = useMemo(() => {
    return stages.reduce((acc, s) => acc + s.totalValue, 0);
  }, [stages]);

  const totalDealsCount = useMemo(() => {
    return deals.length;
  }, [deals]);

  // Unique owners combining active deals and CRM directory
  const uniqueOwners = useMemo(() => {
    const fromDeals = deals.map((d) => d.ownerName).filter(Boolean);
    return Array.from(new Set([...fromDeals, ...teamOwnerNames]));
  }, [deals, teamOwnerNames]);

  // Filter deals
  const filteredDeals = useMemo(() => {
    return deals.filter((deal) => {
      // Owner filter
      if (ownerFilter !== 'ALL' && deal.ownerName !== ownerFilter) {
        return false;
      }

      // Mobile stage filter
      if (mobileStageFilter !== 'ALL' && deal.stageId !== mobileStageFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = deal.title.toLowerCase().includes(q);
        const matchesCompany = (deal.companyName || '').toLowerCase().includes(q);
        const matchesLead = (deal.leadName || '').toLowerCase().includes(q);
        const matchesOwner = deal.ownerName.toLowerCase().includes(q);

        return matchesTitle || matchesCompany || matchesLead || matchesOwner;
      }

      return true;
    });
  }, [deals, ownerFilter, mobileStageFilter, searchQuery]);

  // Mobile stage pills
  const mobileStageOptions: FilterOption[] = useMemo(() => {
    return [
      { id: 'ALL', label: 'All Stages', count: filteredDeals.length },
      ...stages.map((stg) => {
        const count = deals.filter((d) => d.stageId === stg.id).length;
        return {
          id: stg.id,
          label: stg.name,
          count,
        };
      }),
    ];
  }, [stages, deals, filteredDeals.length]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setOwnerFilter('ALL');
    setMobileStageFilter('ALL');
  };

  // --- API Handlers ---

  const handleAddDealSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDealForm.title.trim()) {
      setAddError('Deal title is required');
      return;
    }
    if (!newDealForm.leadId) {
      setAddError('Please select an associated lead');
      return;
    }

    setIsAddSubmitting(true);
    setAddError(null);
    try {
      await crmApi.createDeal({
        title: newDealForm.title.trim(),
        leadId: newDealForm.leadId,
        value: Number(newDealForm.amount) || 0,
        stageId: newDealForm.stageId || (stages[0]?.id ?? ''),
        probability: Number(newDealForm.probability) || 50,
        expectedCloseDate: newDealForm.expectedCloseDate
          ? new Date(newDealForm.expectedCloseDate).toISOString()
          : undefined,
      });

      await queryClient.invalidateQueries({ queryKey: ['deals'] });
      setIsAddModalOpen(false);
      setNewDealForm({
        title: '',
        leadId: '',
        stageId: stages[0]?.id || '',
        amount: 500000,
        probability: 50,
        expectedCloseDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      });
    } catch (err: any) {
      setAddError(err?.message || 'Failed to create deal. Please try again.');
    } finally {
      setIsAddSubmitting(false);
    }
  };

  const handleOpenEditModal = (deal: Deal) => {
    setEditingDeal(deal);
    setEditError(null);
    setEditForm({
      title: deal.title,
      amount: deal.amount,
      stageId: deal.stageId,
      probability: deal.probability,
      expectedCloseDate: deal.expectedCloseDate,
    });
  };

  const handleEditDealSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDeal || !editForm.title.trim()) return;

    setIsEditSubmitting(true);
    setEditError(null);
    try {
      // 1. Update basic fields
      await crmApi.updateDeal(editingDeal.id, {
        title: editForm.title.trim(),
        value: Number(editForm.amount) || 0,
        probability: Number(editForm.probability) || 50,
        expectedCloseDate: editForm.expectedCloseDate
          ? new Date(editForm.expectedCloseDate).toISOString()
          : undefined,
      });

      // 2. If stage changed, update stage
      if (editForm.stageId && editForm.stageId !== editingDeal.stageId) {
        await crmApi.updateDealStage(editingDeal.id, editForm.stageId);
      }

      await queryClient.invalidateQueries({ queryKey: ['deals'] });
      setEditingDeal(null);
      if (selectedDeal && selectedDeal.id === editingDeal.id) {
        setSelectedDeal(null);
      }
    } catch (err: any) {
      setEditError(err?.message || 'Failed to update deal.');
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleStageChange = async (dealId: string, targetStageId: string) => {
    setActionError(null);

    const targetStage = stages.find((s) => s.id === targetStageId);

    // 0ms Instant Optimistic UI Update: Move deal card immediately
    const previousDealsData = queryClient.getQueryData(['deals']);
    queryClient.setQueryData(['deals'], (old: any) => {
      if (!old) return old;
      const updateList = (list: any[]) =>
        list.map((d: any) =>
          d.id === dealId
            ? {
                ...d,
                stageId: targetStageId,
                stageName: targetStage?.name || d.stageName,
                stage: targetStage || d.stage,
                status: targetStage?.stageType === 'WON' ? 'WON' : targetStage?.stageType === 'LOST' ? 'LOST' : 'OPEN',
              }
            : d
        );

      if (Array.isArray(old?.data)) return { ...old, data: updateList(old.data) };
      if (Array.isArray(old?.items)) return { ...old, items: updateList(old.items) };
      if (Array.isArray(old)) return updateList(old);
      return old;
    });

    if (selectedDeal && selectedDeal.id === dealId) {
      setSelectedDeal((prev) =>
        prev
          ? {
              ...prev,
              stageId: targetStageId,
              stageName: targetStage?.name || prev.stageName,
              status: targetStage?.stageType === 'WON' ? 'WON' : targetStage?.stageType === 'LOST' ? 'LOST' : 'OPEN',
            }
          : null
      );
    }

    try {
      await crmApi.updateDealStage(dealId, targetStageId);
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    } catch (err: any) {
      console.error('Failed to update deal stage:', err);
      setActionError(err?.message || 'Failed to update deal stage.');
      // Revert optimistic update on error
      queryClient.setQueryData(['deals'], previousDealsData);
    }
  };

  const handleAdvanceStage = async (deal: Deal) => {
    const currentIndex = stages.findIndex((s) => s.id === deal.stageId);
    if (currentIndex >= 0 && currentIndex < stages.length - 1) {
      const nextStage = stages[currentIndex + 1];
      await handleStageChange(deal.id, nextStage.id);
    }
  };

  const handleMarkWon = async (deal: Deal) => {
    setActionError(null);
    try {
      await crmApi.markDealWon(deal.id);
      await queryClient.invalidateQueries({ queryKey: ['deals'] });
      setSelectedDeal(null);
    } catch (err: any) {
      setActionError(err?.message || 'Failed to mark deal as Closed-Won.');
    }
  };

  const handleOpenLostModal = (deal: Deal) => {
    setLostDealModal(deal);
    setSelectedLostReasonId(lostReasons[0]?.id || '');
    setLostReasonNotes('');
    setLostError(null);
  };

  const handleLostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lostDealModal || !selectedLostReasonId) return;

    setIsLostSubmitting(true);
    setLostError(null);
    try {
      await crmApi.markDealLost(
        lostDealModal.id,
        selectedLostReasonId,
        lostReasonNotes.trim() || undefined,
      );
      await queryClient.invalidateQueries({ queryKey: ['deals'] });
      setLostDealModal(null);
      if (selectedDeal && selectedDeal.id === lostDealModal.id) {
        setSelectedDeal(null);
      }
    } catch (err: any) {
      setLostError(err?.message || 'Failed to mark deal as Closed-Lost.');
    } finally {
      setIsLostSubmitting(false);
    }
  };

  const handleDeleteDeal = async (deal: Deal) => {
    if (!window.confirm(`Are you sure you want to delete deal "${deal.title}"?`)) {
      return;
    }

    setActionError(null);
    try {
      await crmApi.deleteDeal(deal.id);
      await queryClient.invalidateQueries({ queryKey: ['deals'] });
      if (selectedDeal && selectedDeal.id === deal.id) {
        setSelectedDeal(null);
      }
    } catch (err: any) {
      setActionError(err?.message || 'Failed to delete deal.');
    }
  };

  const hasActiveFilters = searchQuery !== '' || ownerFilter !== 'ALL' || mobileStageFilter !== 'ALL';
  const isLoading = isStagesLoading || isDealsLoading;
  const isError = isStagesError || isDealsError;

  return (
    <div className="space-y-4 select-none">
      {/* Action Error Banner */}
      {actionError && (
        <div className="flex items-center justify-between p-3 rounded-card bg-red-50 border border-red-200 text-xs text-red-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-red-500 hover:text-red-700 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 1. Standardized Page Header */}
      <PageHeader
        title="Pipeline"
        count={
          isLoading
            ? 'Loading...'
            : `${formatCurrency(totalPipelineValue)} (${totalDealsCount} deals)`
        }
        description="Active revenue stages, deal progression, and sales conversion velocity"
        actions={
          <div className="flex items-center gap-2">
            {/* View Switcher Toggle */}
            <div className="inline-flex items-center rounded-btn border border-border bg-white p-0.5 shadow-subtle">
              <button
                type="button"
                onClick={() => setViewMode('kanban')}
                className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 text-xs font-semibold rounded transition-colors cursor-pointer ${
                  viewMode === 'kanban'
                    ? 'bg-[#16181B] text-white shadow-subtle'
                    : 'text-txt-secondary hover:text-txt-primary'
                }`}
                aria-label="Kanban board view"
              >
                <KanbanSquare className="h-3.5 w-3.5" />
                <span className="hidden xs:inline">Kanban</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 text-xs font-semibold rounded transition-colors cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-[#16181B] text-white shadow-subtle'
                    : 'text-txt-secondary hover:text-txt-primary'
                }`}
                aria-label="Table list view"
              >
                <TableIcon className="h-3.5 w-3.5" />
                <span className="hidden xs:inline">Table</span>
              </button>
            </div>

            <Button
              size="sm"
              onClick={() => {
                setAddError(null);
                setNewDealForm((prev) => ({
                  ...prev,
                  leadId: prev.leadId || (leads.length > 0 ? leads[0].id : ''),
                  stageId: prev.stageId || (stages.length > 0 ? stages[0].id : DEFAULT_PIPELINE_STAGES[0].id),
                }));
                setIsAddModalOpen(true);
              }}
              className="h-8 text-xs bg-[#57B71B] hover:bg-[#469815] text-white cursor-pointer shadow-subtle"
            >
              <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
              Add Deal
            </Button>
          </div>
        }
      />

      {/* 2. Compact Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-white p-2.5 rounded-card border border-border shadow-card">
        <SearchInput
          value={searchQuery}
          onChange={(val) => setSearchQuery(val)}
          placeholder="Search deals by title, company, lead, owner..."
          className="w-full sm:w-80"
        />

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-end">
          {/* Owner Filter Dropdown */}
          <CustomSelect
            value={ownerFilter}
            onChange={(val) => setOwnerFilter(val)}
            className="w-full sm:w-36"
            options={[
              { value: 'ALL', label: 'All Owners' },
              ...uniqueOwners.map((own) => ({ value: own, label: own })),
            ]}
          />

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="h-8 px-2 text-xs text-txt-muted hover:text-txt-primary cursor-pointer"
            >
              <X className="mr-1 h-3 w-3" /> Reset
            </Button>
          )}
        </div>
      </div>

      {/* 3. Mobile Stage Filter Pills (Shown only on small screens) */}
      <div className="sm:hidden overflow-x-auto pb-1">
        <FilterPills
          options={mobileStageOptions}
          activeId={mobileStageFilter}
          onChange={(id) => setMobileStageFilter(id)}
        />
      </div>

      {/* 4. Loading / Error / Main Pipeline Content */}
      {isLoading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-2 text-txt-muted text-xs bg-white rounded-card border border-border shadow-card">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span>Loading sales pipeline from database...</span>
        </div>
      ) : isError ? (
        <div className="p-6 text-center bg-white rounded-card border border-red-200 shadow-card space-y-3">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
          <h3 className="text-sm font-semibold text-txt-primary">Failed to load pipeline data</h3>
          <p className="text-xs text-txt-muted">
            {((stagesError || dealsError) as any)?.message || 'An unexpected error occurred while communicating with the backend.'}
          </p>
          <Button
            size="sm"
            onClick={() => {
              refetchStages();
              refetchDeals();
            }}
            className="text-xs bg-primary text-white"
          >
            Retry
          </Button>
        </div>
      ) : stages.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-card border border-border shadow-card text-txt-muted text-xs">
          No pipeline stages configured. Please ensure stages are seeded in the database.
        </div>
      ) : viewMode === 'kanban' ? (
        /* KANBAN BOARD VIEW */
        <div className="relative w-full overflow-x-auto pb-4 pt-1 snap-x snap-mandatory scroll-smooth -mx-1 px-1">
          <div
            className={`flex gap-3 items-start ${
              mobileStageFilter !== 'ALL' ? 'w-full flex-col sm:flex-row sm:min-w-[1400px]' : 'w-max sm:min-w-[1400px]'
            }`}
          >
            {(mobileStageFilter !== 'ALL' ? stages.filter((s) => s.id === mobileStageFilter) : stages).map((stage) => {
              const stageDeals = filteredDeals.filter((d) => d.stageId === stage.id);
              const isWonStage = stage.stageType === 'WON';
              const isLostStage = stage.stageType === 'LOST';

              return (
                <div
                  key={stage.id}
                  className={`rounded-card border flex flex-col gap-2.5 p-2.5 shrink-0 snap-center ${
                    mobileStageFilter !== 'ALL'
                      ? 'w-full sm:flex-1 sm:min-w-[220px] sm:max-w-[280px]'
                      : 'w-[82vw] max-w-[290px] sm:w-auto sm:flex-1 sm:min-w-[220px] sm:max-w-[280px]'
                  } ${
                    isWonStage
                      ? 'bg-emerald-50/40 border-emerald-200'
                      : isLostStage
                      ? 'bg-rose-50/40 border-rose-200'
                      : 'bg-slate-50/80 border-border'
                  }`}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-border/80">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-semibold text-xs text-txt-primary truncate">
                        {stage.name}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full tabular-nums shrink-0 ${
                          isWonStage
                            ? 'bg-emerald-100 text-emerald-800'
                            : isLostStage
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-white text-txt-secondary border border-border'
                        }`}
                      >
                        {stageDeals.length}
                      </span>
                    </div>

                    <span className="text-[11px] font-bold text-txt-muted tabular-nums shrink-0 ml-1">
                      {formatCurrency(stage.totalValue)}
                    </span>
                  </div>

                  {/* Stage Cards Container (Stable - No Drag & Drop) */}
                  <div className="space-y-2 min-h-[140px] flex-1 rounded">
                    {stageDeals.length === 0 ? (
                      <div className="h-28 flex flex-col items-center justify-center border border-dashed border-border rounded-btn text-center p-2 text-txt-muted text-[11px]">
                        <span>No active deals</span>
                      </div>
                    ) : (
                      stageDeals.map((deal) => {
                        const currentStageIndex = stages.findIndex((s) => s.id === stage.id);
                        const nextStage = stages[currentStageIndex + 1];

                        return (
                          <div
                            key={deal.id}
                            onClick={() => setSelectedDeal(deal)}
                            className="bg-white rounded-card border border-border p-3 space-y-2 shadow-card hover:border-primary/60 hover:shadow-subtle transition-all cursor-pointer group select-none"
                          >
                            {/* Deal Header: Title */}
                            <div className="flex items-start justify-between gap-1.5">
                              <h4 className="text-xs font-semibold text-txt-primary line-clamp-2 leading-snug group-hover:text-primary transition-colors flex-1">
                                {deal.title}
                              </h4>
                              <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                {!isWonStage && !isLostStage && nextStage && (
                                  <button
                                    type="button"
                                    title={`Advance to ${nextStage.name}`}
                                    onClick={() => handleAdvanceStage(deal)}
                                    className="p-1 rounded text-txt-muted hover:text-white hover:bg-[#57B71B] transition-colors cursor-pointer"
                                  >
                                    <ChevronRight className="h-3.5 w-3.5" />
                                  </button>
                                )}
                                <ActionMenu
                                items={[
                                  {
                                    label: 'View Deal',
                                    icon: ExternalLink,
                                    onClick: () => setSelectedDeal(deal),
                                  },
                                  {
                                    label: 'Advance Stage',
                                    icon: TrendingUp,
                                    onClick: () => handleAdvanceStage(deal),
                                  },
                                  {
                                    label: 'Edit Deal',
                                    icon: Edit,
                                    onClick: () => handleOpenEditModal(deal),
                                  },
                                  {
                                    label: 'Mark Won',
                                    icon: CheckCircle2,
                                    onClick: () => handleMarkWon(deal),
                                  },
                                  {
                                    label: 'Mark Lost',
                                    icon: AlertCircle,
                                    onClick: () => handleOpenLostModal(deal),
                                  },
                                  {
                                    label: 'Delete Deal',
                                    icon: Trash2,
                                    variant: 'danger',
                                    onClick: () => handleDeleteDeal(deal),
                                  },
                                ]}
                              />
                            </div>
                          </div>

                          {/* Company / Prospect Contact */}
                          <div className="flex items-center gap-1 text-[11px] text-txt-muted">
                            <Building className="h-3 w-3 shrink-0" />
                            <span className="truncate">{deal.companyName || deal.leadName}</span>
                          </div>

                          {/* Commercial Metric: Amount & Win Probability */}
                          <div className="pt-1.5 border-t border-border flex items-center justify-between">
                            <span className="text-xs font-bold text-txt-primary tabular-nums">
                              {formatCurrency(deal.amount, deal.currency)}
                            </span>
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded-badge text-[10px] font-semibold bg-slate-100 text-txt-secondary border border-border tabular-nums">
                              {deal.probability}% win
                            </span>
                          </div>

                          {/* Card Footer: Close Date & Owner Avatar */}
                          <div className="flex items-center justify-between text-[10px] text-txt-muted pt-0.5">
                            <div className="flex items-center gap-1 tabular-nums">
                              <Calendar className="h-3 w-3 text-txt-muted" />
                              <span>{deal.expectedCloseDate || '—'}</span>
                            </div>

                            <div className="flex items-center gap-1">
                              <Avatar className="h-4 w-4">
                                <AvatarFallback className="bg-primary-soft text-primary text-[8px] font-bold">
                                  {deal.ownerName
                                    .split(' ')
                                    .map((n) => n[0])
                                    .join('')}
                                </AvatarFallback>
                              </Avatar>
                              <span className="truncate max-w-[70px]">{deal.ownerName}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* TABLE LIST VIEW */
        <div className="rounded-card border border-border bg-white shadow-card overflow-hidden">
          {/* Mobile Deal Cards (< md) */}
          <div className="block md:hidden divide-y divide-border">
            {filteredDeals.length === 0 ? (
              <div className="p-8 text-center text-txt-muted text-xs">
                No deals match the selected criteria
              </div>
            ) : (
              filteredDeals.map((deal) => {
                const currentStage = stages.find((s) => s.id === deal.stageId);
                const isWon = deal.status === 'WON' || currentStage?.stageType === 'WON';
                const isLost = deal.status === 'LOST' || currentStage?.stageType === 'LOST';

                return (
                  <div
                    key={deal.id}
                    onClick={() => setSelectedDeal(deal)}
                    className="p-3.5 space-y-2.5 hover:bg-slate-50/80 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold text-xs text-txt-primary truncate">
                          {deal.title}
                        </h4>
                        <div className="flex items-center gap-1.5 text-[11px] text-txt-muted mt-0.5">
                          <Building className="h-3 w-3 shrink-0" />
                          <span className="truncate">{deal.companyName || deal.leadName}</span>
                        </div>
                      </div>
                      <div onClick={(e) => e.stopPropagation()}>
                        <ActionMenu
                          items={[
                            {
                              label: 'View Deal',
                              icon: ExternalLink,
                              onClick: () => setSelectedDeal(deal),
                            },
                            {
                              label: 'Advance Stage',
                              icon: TrendingUp,
                              onClick: () => handleAdvanceStage(deal),
                            },
                            {
                              label: 'Edit Deal',
                              icon: Edit,
                              onClick: () => handleOpenEditModal(deal),
                            },
                            {
                              label: 'Mark Won',
                              icon: CheckCircle2,
                              onClick: () => handleMarkWon(deal),
                            },
                            {
                              label: 'Mark Lost',
                              icon: AlertCircle,
                              onClick: () => handleOpenLostModal(deal),
                            },
                            {
                              label: 'Delete Deal',
                              icon: Trash2,
                              variant: 'danger',
                              onClick: () => handleDeleteDeal(deal),
                            },
                          ]}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-border/60">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-badge text-[10px] font-semibold border ${
                            isWon
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : isLost
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : 'bg-slate-100 text-txt-secondary border-border'
                          }`}
                        >
                          {currentStage?.name || 'Open'}
                        </span>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-badge text-[10px] font-semibold bg-slate-100 text-txt-secondary border border-border tabular-nums">
                          {deal.probability}% win
                        </span>
                      </div>
                      <span className="font-bold text-xs text-txt-primary tabular-nums">
                        {formatCurrency(deal.amount, deal.currency)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-txt-muted pt-0.5">
                      <div className="flex items-center gap-1 tabular-nums">
                        <Calendar className="h-3 w-3 text-txt-muted" />
                        <span>{deal.expectedCloseDate || '—'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Avatar className="h-4 w-4">
                          <AvatarFallback className="bg-primary-soft text-primary text-[8px] font-bold">
                            {deal.ownerName
                              .split(' ')
                              .map((n) => n[0])
                              .join('')}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate max-w-[100px]">{deal.ownerName}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Table View (>= md) */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[260px]">Deal & Prospect</TableHead>
                  <TableHead className="w-[160px]">Current Stage</TableHead>
                  <TableHead className="w-[140px] text-right">Value</TableHead>
                  <TableHead className="w-[110px] text-center">Probability</TableHead>
                  <TableHead className="w-[140px]">Expected Close</TableHead>
                  <TableHead className="w-[150px]">Owner</TableHead>
                  <TableHead className="w-[80px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDeals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-txt-muted text-xs">
                      No deals match the selected criteria
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDeals.map((deal) => {
                    const currentStage = stages.find((s) => s.id === deal.stageId);

                    return (
                      <TableRow
                        key={deal.id}
                        onClick={() => setSelectedDeal(deal)}
                        className="cursor-pointer hover:bg-slate-50/80 transition-colors group"
                      >
                        {/* Title & Company */}
                        <TableCell>
                          <div className="space-y-0.5">
                            <span className="font-semibold text-xs text-txt-primary block group-hover:text-primary transition-colors">
                              {deal.title}
                            </span>
                            <span className="text-[11px] text-txt-muted flex items-center gap-1">
                              <Building className="h-3 w-3" />
                              {deal.companyName || deal.leadName}
                            </span>
                          </div>
                        </TableCell>

                        {/* Stage */}
                        <TableCell>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-badge text-xs font-semibold bg-slate-100 text-txt-secondary border border-border">
                            {currentStage?.name || 'Open'}
                          </span>
                        </TableCell>

                        {/* Value */}
                        <TableCell className="text-right">
                          <span className="font-bold text-xs text-txt-primary tabular-nums">
                            {formatCurrency(deal.amount, deal.currency)}
                          </span>
                        </TableCell>

                        {/* Probability */}
                        <TableCell className="text-center">
                          <span className="text-xs font-medium text-txt-secondary tabular-nums">
                            {deal.probability}%
                          </span>
                        </TableCell>

                        {/* Expected Close */}
                        <TableCell>
                          <span className="text-xs text-txt-secondary tabular-nums">
                            {deal.expectedCloseDate || '—'}
                          </span>
                        </TableCell>

                        {/* Owner */}
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Avatar className="h-5 w-5">
                              <AvatarFallback className="bg-primary-soft text-primary text-[10px] font-bold">
                                {deal.ownerName
                                  .split(' ')
                                  .map((n) => n[0])
                                  .join('')}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-txt-primary font-medium">
                              {deal.ownerName}
                            </span>
                          </div>
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <ActionMenu
                            items={[
                              {
                                label: 'View Deal',
                                icon: ExternalLink,
                                onClick: () => setSelectedDeal(deal),
                              },
                              {
                                label: 'Advance Stage',
                                icon: TrendingUp,
                                onClick: () => handleAdvanceStage(deal),
                              },
                              {
                                label: 'Edit Deal',
                                icon: Edit,
                                onClick: () => handleOpenEditModal(deal),
                              },
                              {
                                label: 'Mark Won',
                                icon: CheckCircle2,
                                onClick: () => handleMarkWon(deal),
                              },
                              {
                                label: 'Mark Lost',
                                icon: AlertCircle,
                                onClick: () => handleOpenLostModal(deal),
                              },
                              {
                                label: 'Delete Deal',
                                icon: Trash2,
                                variant: 'danger',
                                onClick: () => handleDeleteDeal(deal),
                              },
                            ]}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50/70 border-t border-border text-xs text-txt-muted">
            <span>
              Showing <strong className="text-txt-primary tabular-nums">{filteredDeals.length}</strong> deals
            </span>
            <span className="text-[11px]">Click row to inspect deal commercials</span>
          </div>
        </div>
      )}

      {/* 5. Deal Detail Preview Modal */}
      <Dialog open={!!selectedDeal} onOpenChange={(open) => !open && setSelectedDeal(null)}>
        {selectedDeal && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <div className="flex items-center justify-between gap-3 pr-6">
                <div>
                  <DialogTitle className="text-base font-bold text-txt-primary">
                    {selectedDeal.title}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-txt-muted mt-0.5">
                    {selectedDeal.companyName || selectedDeal.leadName}
                  </DialogDescription>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-semibold text-txt-muted uppercase tracking-wider block">
                    Amount
                  </span>
                  <span className="text-lg font-bold text-txt-primary tabular-nums">
                    {formatCurrency(selectedDeal.amount, selectedDeal.currency)}
                  </span>
                </div>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 sm:px-5 sm:py-4 space-y-3.5 text-xs">
              {/* Stage Progress Bar / Card */}
              <div className="p-3 rounded-card bg-slate-50 border border-border space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-txt-muted uppercase tracking-wider">
                    Current Stage
                  </span>
                  <span className="text-xs font-semibold text-primary">
                    {stages.find((s) => s.id === selectedDeal.stageId)?.name || selectedDeal.stageName || 'Open'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-txt-secondary pt-1">
                  <span>Win Probability: <strong>{selectedDeal.probability}%</strong></span>
                  <span>Target Date: <strong>{selectedDeal.expectedCloseDate || '—'}</strong></span>
                </div>
              </div>

              {/* Deal Commercial Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 rounded-card bg-white border border-border">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-semibold text-txt-muted uppercase tracking-wider block">
                    Contact Prospect
                  </span>
                  <span className="font-medium text-txt-primary block">
                    {selectedDeal.leadName}
                  </span>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] font-semibold text-txt-muted uppercase tracking-wider block">
                    Account Owner
                  </span>
                  <span className="font-medium text-txt-primary flex items-center gap-1.5">
                    <UserIcon className="h-3.5 w-3.5 text-txt-muted" />
                    {selectedDeal.ownerName}
                  </span>
                </div>
              </div>

              {/* Status details if WON/LOST */}
              {selectedDeal.status === 'WON' && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded text-emerald-800 text-xs">
                  <span className="font-semibold">Deal Won</span>
                  {selectedDeal.wonNotes && <p className="mt-0.5">{selectedDeal.wonNotes}</p>}
                </div>
              )}

              {selectedDeal.status === 'LOST' && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-800 text-xs">
                  <span className="font-semibold">Deal Lost: {selectedDeal.lostReasonLabel || 'Closed Lost'}</span>
                  {selectedDeal.lostReasonNotes && <p className="mt-0.5">{selectedDeal.lostReasonNotes}</p>}
                </div>
              )}

              {/* Stage Advancement Quick CTA */}
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <Button
                  size="sm"
                  onClick={() => handleAdvanceStage(selectedDeal)}
                  className="flex-1 h-8 text-xs bg-[#57B71B] hover:bg-[#469815] text-white cursor-pointer"
                >
                  <TrendingUp className="mr-1.5 h-3.5 w-3.5" /> Advance to Next Stage
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleMarkWon(selectedDeal)}
                  className="h-8 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                >
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Mark Won
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenLostModal(selectedDeal)}
                  className="h-8 text-xs border-rose-300 text-rose-700 hover:bg-rose-50 cursor-pointer"
                >
                  <XCircle className="mr-1.5 h-3.5 w-3.5" /> Mark Lost
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenEditModal(selectedDeal)}
                  className="h-8 text-xs cursor-pointer"
                >
                  <Edit className="mr-1.5 h-3.5 w-3.5" /> Edit
                </Button>
              </div>
            </div>

            <DialogFooter className="px-4 py-3 sm:px-5 sm:py-3 border-t border-border flex items-center justify-end shrink-0 bg-slate-50/95 mt-auto">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedDeal(null)}
                className="h-8 text-xs cursor-pointer"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* 6. Add Deal Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-section-title text-txt-primary">Create New Deal</DialogTitle>
            <DialogDescription className="text-xs text-txt-muted">
              Add a commercial opportunity to the active sales pipeline
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddDealSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 sm:px-5 sm:py-4 space-y-3 text-xs">
              {addError && (
                <div className="p-2.5 rounded bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{addError}</span>
                </div>
              )}
            <div className="space-y-1">
              <label className="text-caption text-txt-secondary block font-medium">
                Associated Lead / Client <span className="text-red-500">*</span>
              </label>
              <CustomSelect
                value={newDealForm.leadId}
                onChange={(val) => setNewDealForm({ ...newDealForm, leadId: val })}
                options={leads.map((l: any) => ({
                  value: l.id,
                  label: `${l.fullName}${l.companyName ? ` (${l.companyName})` : ''}`,
                }))}
                placeholder="Select Client / Lead..."
              />
            </div>

            <div className="space-y-1">
              <label className="text-caption text-txt-secondary block font-medium">
                Deal Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={newDealForm.title}
                onChange={(e) => setNewDealForm({ ...newDealForm, title: e.target.value })}
                placeholder="e.g. Enterprise Cloud ERP Migration"
                className="w-full h-8 rounded-input border border-border bg-white px-2.5 text-xs text-txt-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-caption text-txt-secondary block font-medium">
                  Deal Amount (INR) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={newDealForm.amount}
                  onChange={(e) => setNewDealForm({ ...newDealForm, amount: Number(e.target.value) })}
                  className="w-full h-8 rounded-input border border-border bg-white px-2.5 text-xs text-txt-primary focus:outline-none focus:ring-1 focus:ring-primary tabular-nums"
                />
              </div>

              <div className="space-y-1">
                <label className="text-caption text-txt-secondary block font-medium">Initial Stage</label>
                <CustomSelect
                  value={newDealForm.stageId}
                  onChange={(val) => setNewDealForm({ ...newDealForm, stageId: val })}
                  options={stages.map((stg) => ({
                    value: stg.id,
                    label: stg.name,
                  }))}
                  placeholder="Select Stage..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-caption text-txt-secondary block font-medium">Win Probability (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={newDealForm.probability}
                  onChange={(e) => setNewDealForm({ ...newDealForm, probability: Number(e.target.value) })}
                  className="w-full h-8 rounded-input border border-border bg-white px-2.5 text-xs text-txt-primary focus:outline-none focus:ring-1 focus:ring-primary tabular-nums"
                />
              </div>

              <div className="space-y-1">
                <label className="text-caption text-txt-secondary block font-medium">Expected Close Date</label>
                <input
                  type="date"
                  value={newDealForm.expectedCloseDate}
                  onChange={(e) => setNewDealForm({ ...newDealForm, expectedCloseDate: e.target.value })}
                  className="w-full h-8 rounded-input border border-border bg-white px-2.5 text-xs text-txt-primary focus:outline-none focus:ring-1 focus:ring-primary tabular-nums"
                />
              </div>
            </div>
            </div>

            <DialogFooter className="px-4 py-2.5 sm:px-5 sm:py-3 border-t border-border shrink-0 bg-slate-50/95 mt-auto">
              <div className="grid grid-cols-2 gap-2 w-full sm:flex sm:justify-end sm:w-auto">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsAddModalOpen(false)}
                  className="w-full sm:w-auto h-8 text-xs cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isAddSubmitting}
                  size="sm"
                  className="w-full sm:w-auto h-8 text-xs bg-[#57B71B] hover:bg-[#469815] text-white cursor-pointer font-semibold"
                >
                  {isAddSubmitting ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Creating...
                    </>
                  ) : (
                    'Create Deal'
                  )}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 7. Edit Deal Modal */}
      <Dialog open={!!editingDeal} onOpenChange={(open) => !open && setEditingDeal(null)}>
        {editingDeal && (
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-section-title text-txt-primary">Edit Deal</DialogTitle>
              <DialogDescription className="text-xs text-txt-muted">
                Update opportunity details and financials
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleEditDealSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 sm:px-5 sm:py-4 space-y-3 text-xs">
                {editError && (
                  <div className="p-2.5 rounded bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{editError}</span>
                  </div>
                )}
              <div className="space-y-1">
                <label className="text-caption text-txt-secondary block font-medium">
                  Deal Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full h-8 rounded-input border border-border bg-white px-2.5 text-xs text-txt-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-caption text-txt-secondary block font-medium">Amount (INR)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={editForm.amount}
                    onChange={(e) => setEditForm({ ...editForm, amount: Number(e.target.value) })}
                    className="w-full h-8 rounded-input border border-border bg-white px-2.5 text-xs text-txt-primary focus:outline-none focus:ring-1 focus:ring-primary tabular-nums"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-caption text-txt-secondary block font-medium">Pipeline Stage</label>
                  <CustomSelect
                    value={editForm.stageId}
                    onChange={(val) => setEditForm({ ...editForm, stageId: val })}
                    options={stages.map((stg) => ({
                      value: stg.id,
                      label: stg.name,
                    }))}
                    placeholder="Select Stage..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-caption text-txt-secondary block font-medium">Win Probability (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editForm.probability}
                    onChange={(e) => setEditForm({ ...editForm, probability: Number(e.target.value) })}
                    className="w-full h-8 rounded-input border border-border bg-white px-2.5 text-xs text-txt-primary focus:outline-none focus:ring-1 focus:ring-primary tabular-nums"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-caption text-txt-secondary block font-medium">Expected Close Date</label>
                  <input
                    type="date"
                    value={editForm.expectedCloseDate}
                    onChange={(e) => setEditForm({ ...editForm, expectedCloseDate: e.target.value })}
                    className="w-full h-8 rounded-input border border-border bg-white px-2.5 text-xs text-txt-primary focus:outline-none focus:ring-1 focus:ring-primary tabular-nums"
                  />
                </div>
                </div>
              </div>

              <DialogFooter className="px-4 py-3 sm:px-5 sm:py-3 border-t border-border flex flex-col-reverse sm:flex-row gap-2 sm:gap-0 shrink-0 bg-slate-50/95 mt-auto">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setEditingDeal(null)}
                  className="w-full sm:w-auto h-8 text-xs cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isEditSubmitting}
                  size="sm"
                  className="w-full sm:w-auto h-8 text-xs bg-[#57B71B] hover:bg-[#469815] text-white cursor-pointer"
                >
                  {isEditSubmitting ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        )}
      </Dialog>

      {/* 8. Mark Lost Modal */}
      <Dialog open={!!lostDealModal} onOpenChange={(open) => !open && setLostDealModal(null)}>
        {lostDealModal && (
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-section-title text-txt-primary">Mark Deal as Closed-Lost</DialogTitle>
              <DialogDescription className="text-xs text-txt-muted">
                Record lost reason and notes for post-mortem analysis
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleLostSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 sm:px-5 sm:py-4 space-y-3 text-xs">
                {lostError && (
                  <div className="p-2.5 rounded bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{lostError}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-caption text-txt-secondary block font-medium">
                    Lost Reason <span className="text-red-500">*</span>
                  </label>
                  <CustomSelect
                    value={selectedLostReasonId}
                    onChange={(val) => setSelectedLostReasonId(val)}
                    required
                    placeholder="Select reason..."
                    options={lostReasons.map((lr) => ({
                      value: lr.id,
                      label: lr.label,
                    }))}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-caption text-txt-secondary block font-medium">
                    Debrief Notes (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={lostReasonNotes}
                    onChange={(e) => setLostReasonNotes(e.target.value)}
                    placeholder="Explain why the deal was lost (e.g. competitor pricing, feature gap)..."
                    className="w-full rounded-input border border-border bg-white p-2 text-xs text-txt-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  />
                </div>
              </div>

              <DialogFooter className="px-4 py-3 sm:px-5 sm:py-3 border-t border-border flex items-center justify-end gap-2 shrink-0 bg-slate-50/95 mt-auto">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setLostDealModal(null)}
                  className="h-8 text-xs cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLostSubmitting}
                  size="sm"
                  className="h-8 text-xs bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
                >
                  {isLostSubmitting ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Marking Lost...
                    </>
                  ) : (
                    'Confirm Closed-Lost'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};
