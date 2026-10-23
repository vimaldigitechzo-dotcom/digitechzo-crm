import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/common/PageHeader';
import { FilterPills, FilterOption } from '@/components/common/FilterPills';
import { MetricCard } from '@/components/common/MetricCard';
import { SearchInput } from '@/components/common/SearchInput';
import { StatusBadge } from '@/components/common/StatusBadge';
import { EmptyState } from '@/components/common/EmptyState';
import { ActionMenu } from '@/components/common/ActionMenu';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { crmApi } from '@/lib/api';
import { Lead, LeadSource, TaskPriority, TaskActionType } from '@/types/crm';
import { formatDate, cn } from '@/lib/utils';
import { CategorySelect, LEAD_CATEGORIES } from '@/components/leads/CategorySelect';
import { CustomSelect } from '@/components/ui/CustomSelect';
import {
  PlusCircle,
  Download,
  Upload,
  Building,
  Sparkles,
  X,
  ExternalLink,
  Edit,
  Trash2,
  AlertCircle,
  Loader2,
  FileSpreadsheet,
  CheckCircle2,
  Users,
  Flame,
  SunMedium,
  Trophy,
  Phone,
  Mail,
} from 'lucide-react';

export const LeadsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const urlStatus = searchParams.get('status') || searchParams.get('filter') || 'ALL';

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(urlStatus);
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [ownerFilter, setOwnerFilter] = useState<string>('ALL');

  // Synchronize when searchParams changes (e.g. from Dashboard navigation)
  useEffect(() => {
    const s = searchParams.get('status') || searchParams.get('filter');
    if (s) {
      setStatusFilter(s.toUpperCase());
    }
  }, [searchParams]);

  const handleStatusFilterChange = (newStatus: string) => {
    setStatusFilter(newStatus);
    if (newStatus === 'ALL') {
      searchParams.delete('status');
      searchParams.delete('filter');
      setSearchParams(searchParams);
    } else {
      setSearchParams({ status: newStatus });
    }
  };

  // Add lead modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newLeadForm, setNewLeadForm] = useState({
    fullName: '',
    companyName: '',
    title: '',
    phone: '',
    email: '',
    source: 'WEBSITE_FORM' as LeadSource,
    priority: 'MEDIUM' as TaskPriority,
    temperature: '' as '' | 'HOT' | 'WARM' | 'COLD',
    serviceInterest: LEAD_CATEGORIES[0] as string,
    ownerId: '',
    ownerName: '',
    nextActionDate: '',
    nextActionTime: '',
    nextActionType: 'CALL' as TaskActionType,
    nextActionPurpose: '',
  });

  // Edit lead modal state
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: '',
    companyName: '',
    title: '',
    phone: '',
    email: '',
    serviceInterest: '',
    priority: 'MEDIUM' as TaskPriority,
    temperature: '' as '' | 'HOT' | 'WARM' | 'COLD',
    ownerId: '',
    ownerName: '',
  });

  // Delete lead modal state
  const [deletingLead, setDeletingLead] = useState<Lead | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleteSubmitting, setIsDeleteSubmitting] = useState(false);

  // CSV Import State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importRows, setImportRows] = useState<any[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);
  const [importResult, setImportResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);

  // Recently created lead highlight & banner state
  const [recentlyCreatedLeadId, setRecentlyCreatedLeadId] = useState<string | null>(null);
  const [createdSuccessBanner, setCreatedSuccessBanner] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (!recentlyCreatedLeadId) return;
    const timer = setTimeout(() => {
      setRecentlyCreatedLeadId(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [recentlyCreatedLeadId]);

  // Real Backend Data Query
  const {
    data: leadsResponse,
    isLoading,
  } = useQuery({
    queryKey: ['leads'],
    queryFn: () => crmApi.getLeads({ limit: 100 }),
    staleTime: 30000,
  });

  const rawLeads: any[] = leadsResponse?.items || leadsResponse?.data || [];

  // Adapt backend LeadResponseDto to frontend Lead model
  const leads: Lead[] = useMemo(() => {
    return rawLeads.map((item: any) => ({
      id: item.id,
      fullName: item.fullName,
      companyName: item.companyName || undefined,
      title: item.title || undefined,
      phone: item.phone,
      email: item.email,
      source: item.source,
      status: item.status,
      leadScore: item.leadScore ?? 80,
      serviceInterest: item.serviceInterest,
      ownerId: item.ownerId || item.owner?.id || '',
      ownerName: item.ownerName || item.owner?.name || 'DigiTechzo Administrator',
      lastActivityAt: item.lastActivityAt || item.createdAt,
      createdAt: item.createdAt,
      nextAction: item.nextAction
        ? {
            actionType: item.nextAction.type || 'CALL',
            date: item.nextAction.dueDate ? item.nextAction.dueDate.split('T')[0] : '',
            time: item.nextAction.dueDate
              ? new Date(item.nextAction.dueDate).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : undefined,
            ownerId: item.nextAction.ownerId || item.ownerId || '',
            ownerName: item.ownerName || 'Account Owner',
            purpose: item.nextAction.purpose || 'Follow-up',
          }
        : undefined,
    }));
  }, [rawLeads]);

  // Status Filter options
  const statusOptions: FilterOption[] = useMemo(() => {
    const hotCount = leads.filter((l) => l.status === 'HOT').length;
    const warmCount = leads.filter((l) => l.status === 'WARM').length;
    const coldCount = leads.filter((l) => l.status === 'COLD').length;
    const wonCount = leads.filter((l) => l.status === 'CONVERTED').length;
    const unqualCount = leads.filter((l) => l.status === 'UNQUALIFIED' || l.status === 'LOST').length;

    return [
      { id: 'ALL', label: 'All', count: leads.length },
      { id: 'HOT', label: 'Hot', count: hotCount, countVariant: 'danger' },
      { id: 'WARM', label: 'Warm', count: warmCount, countVariant: 'warning' },
      { id: 'COLD', label: 'Cold', count: coldCount, countVariant: 'info' },
      { id: 'CONVERTED', label: 'Won', count: wonCount },
      { id: 'UNQUALIFIED', label: 'Unqualified', count: unqualCount, countVariant: 'neutral' },
    ];
  }, [leads]);

  // Active Team Members Query for Owner Assignment
  const { data: usersResponse } = useQuery({
    queryKey: ['team-users'],
    queryFn: () => crmApi.getUsers({ limit: 100 }),
    staleTime: 60000,
  });

  const teamMembers = useMemo(() => {
    const raw: any[] = usersResponse?.data || [];
    return raw.filter((u: any) => u.status === 'ACTIVE');
  }, [usersResponse]);

  // Unique sources and owners
  const uniqueSources = useMemo(() => {
    return Array.from(new Set(leads.map((l) => l.source)));
  }, [leads]);

  const uniqueOwners = useMemo(() => {
    const fromTeam = teamMembers.map((u: any) => u.name).filter(Boolean);
    const fromLeads = leads.map((l) => l.ownerName).filter(Boolean);
    const owners = Array.from(new Set([...fromTeam, ...fromLeads]));
    return owners.length > 0 ? owners : ['DigiTechzo Administrator'];
  }, [teamMembers, leads]);

  const uniqueCategories = useMemo(() => {
    const fromLeads = Array.from(new Set(leads.map((l) => l.serviceInterest).filter(Boolean)));
    return Array.from(new Set([...LEAD_CATEGORIES, ...fromLeads]));
  }, [leads]);

  // Filtered leads
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (statusFilter !== 'ALL' && lead.status !== statusFilter) {
        return false;
      }
      if (sourceFilter !== 'ALL' && lead.source !== sourceFilter) {
        return false;
      }
      if (categoryFilter !== 'ALL' && lead.serviceInterest !== categoryFilter) {
        return false;
      }
      if (ownerFilter !== 'ALL' && lead.ownerName !== ownerFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = lead.fullName.toLowerCase().includes(q);
        const matchesCompany = (lead.companyName || '').toLowerCase().includes(q);
        const matchesPhone = lead.phone.toLowerCase().includes(q);
        const matchesEmail = (lead.email || '').toLowerCase().includes(q);
        const matchesService = lead.serviceInterest.toLowerCase().includes(q);

        return matchesName || matchesCompany || matchesPhone || matchesEmail || matchesService;
      }
      return true;
    });
  }, [leads, statusFilter, sourceFilter, categoryFilter, ownerFilter, searchQuery]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setSourceFilter('ALL');
    setCategoryFilter('ALL');
    setOwnerFilter('ALL');
  };

  // Duplicate lead detector (normalized to 10 digits)
  const findDuplicateLeadByPhone = (phoneInput: string, excludeLeadId?: string) => {
    const digits = phoneInput.replace(/\D/g, '').slice(-10);
    if (digits.length !== 10) return null;
    return leads.find((l) => {
      if (excludeLeadId && l.id === excludeLeadId) return false;
      const leadDigits = (l.phone || '').replace(/\D/g, '').slice(-10);
      return leadDigits === digits;
    });
  };

  const createDuplicateLead = useMemo(() => {
    return findDuplicateLeadByPhone(newLeadForm.phone);
  }, [newLeadForm.phone, leads]);

  const editDuplicateLead = useMemo(() => {
    if (!editingLead) return null;
    return findDuplicateLeadByPhone(editForm.phone, editingLead.id);
  }, [editForm.phone, editingLead, leads]);

  // Create Lead
  const handleAddLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    const cleanName = newLeadForm.fullName.trim();
    const phoneDigits = newLeadForm.phone.replace(/\D/g, '');

    if (!cleanName) {
      setCreateError('Full Name is required.');
      return;
    }

    if (phoneDigits.length !== 10) {
      setCreateError(
        phoneDigits.length === 0
          ? 'Phone Number is required (must be exactly 10 digits).'
          : `Phone Number must be exactly 10 digits. You entered ${phoneDigits.length} digit${phoneDigits.length === 1 ? '' : 's'}.`
      );
      return;
    }

    const existingWithPhone = findDuplicateLeadByPhone(phoneDigits);
    if (existingWithPhone) {
      setCreateError(
        `This phone number (${phoneDigits}) is already registered for lead "${existingWithPhone.fullName}". Duplicate phone numbers are not allowed.`
      );
      return;
    }

    const cleanEmail = newLeadForm.email.trim()
      ? newLeadForm.email.trim().toLowerCase()
      : undefined;

    setIsSubmitting(true);
    try {
      const created = await crmApi.createLead({
        fullName: cleanName,
        companyName: newLeadForm.companyName.trim() || undefined,
        title: newLeadForm.title.trim() || undefined,
        phone: phoneDigits,
        email: cleanEmail,
        source: newLeadForm.source,
        priority: newLeadForm.priority || 'MEDIUM',
        temperature: newLeadForm.temperature ? (newLeadForm.temperature as 'HOT' | 'WARM' | 'COLD') : undefined,
        serviceInterest: newLeadForm.serviceInterest.trim() || LEAD_CATEGORIES[0],
        ownerId: newLeadForm.ownerId || undefined,
        nextActionDueAt: newLeadForm.nextActionDate
          ? new Date(`${newLeadForm.nextActionDate}T${newLeadForm.nextActionTime || '10:00'}:00`).toISOString()
          : undefined,
        nextActionType: newLeadForm.nextActionDate ? newLeadForm.nextActionType : undefined,
        nextActionPurpose: newLeadForm.nextActionDate
          ? (newLeadForm.nextActionPurpose.trim() || 'Follow-up')
          : undefined,
      });

      // 1. Instant optimistic update to TanStack query cache (0ms delay)
      queryClient.setQueryData(['leads'], (old: any) => {
        if (!old) {
          return { items: [created], data: [created], total: 1, page: 1, limit: 100, totalPages: 1 };
        }
        const prevItems = old.items || old.data || [];
        const nextItems = [created, ...prevItems.filter((i: any) => i.id !== created.id)];
        return {
          ...old,
          items: nextItems,
          data: nextItems,
          total: (old.total ?? prevItems.length) + 1,
        };
      });

      // Also prime individual lead query cache for instant detail viewing
      if (created?.id) {
        queryClient.setQueryData(['leads', created.id], created);
      }

      // 2. Clear filters if they would hide the new lead from the list
      if (statusFilter !== 'ALL') {
        setStatusFilter('ALL');
        searchParams.delete('status');
        searchParams.delete('filter');
        setSearchParams(searchParams);
      }
      if (searchQuery.trim()) {
        setSearchQuery('');
      }

      // 3. Close modal & reset form
      setIsAddModalOpen(false);
      setNewLeadForm({
        fullName: '',
        companyName: '',
        title: '',
        phone: '',
        email: '',
        source: 'WEBSITE_FORM' as LeadSource,
        priority: 'MEDIUM' as TaskPriority,
        temperature: '' as '' | 'HOT' | 'WARM' | 'COLD',
        serviceInterest: LEAD_CATEGORIES[0],
        ownerId: '',
        ownerName: '',
        nextActionDate: '',
        nextActionTime: '',
        nextActionType: 'CALL' as TaskActionType,
        nextActionPurpose: '',
      });

      // 4. Highlight new lead and show notification banner
      if (created?.id) {
        setRecentlyCreatedLeadId(created.id);
        setCreatedSuccessBanner({
          id: created.id,
          name: created.fullName,
        });
      }

      // 5. Background cache synchronization (non-blocking)
      queryClient.invalidateQueries({ queryKey: ['leads'], refetchType: 'active' });
    } catch (err: any) {
      setCreateError(
        err?.message || 'Failed to create lead. Please verify the entered information.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Lead Modal
  const handleOpenEdit = (lead: Lead) => {
    setEditingLead(lead);
    const cleanDigits = (lead.phone || '').replace(/\D/g, '').slice(-10);
    setEditForm({
      fullName: lead.fullName,
      companyName: lead.companyName || '',
      title: lead.title || '',
      phone: cleanDigits,
      email: lead.email || '',
      serviceInterest: lead.serviceInterest,
      priority: (lead as any).priority || 'MEDIUM',
      temperature: (lead as any).temperature || '',
      ownerId: lead.ownerId || '',
      ownerName: lead.ownerName || '',
    });
    setEditError(null);
  };

  // Save Lead Edits
  const handleEditLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLead) return;
    setEditError(null);

    const editPhoneDigits = editForm.phone.replace(/\D/g, '');
    if (editPhoneDigits.length !== 10) {
      setEditError(
        editPhoneDigits.length === 0
          ? 'Phone Number is required (must be exactly 10 digits).'
          : `Phone Number must be exactly 10 digits. You entered ${editPhoneDigits.length} digit${editPhoneDigits.length === 1 ? '' : 's'}.`
      );
      return;
    }

    const duplicateInEdit = findDuplicateLeadByPhone(editPhoneDigits, editingLead.id);
    if (duplicateInEdit) {
      setEditError(
        `This phone number (${editPhoneDigits}) is already registered for lead "${duplicateInEdit.fullName}". Duplicate phone numbers are not allowed.`
      );
      return;
    }

    setIsEditSubmitting(true);
    try {
      const cleanEditEmail = editForm.email.trim()
        ? editForm.email.trim().toLowerCase()
        : undefined;

      let updated = await crmApi.updateLead(editingLead.id, {
        fullName: editForm.fullName.trim(),
        companyName: editForm.companyName.trim() || undefined,
        title: editForm.title.trim() || undefined,
        phone: editPhoneDigits,
        email: cleanEditEmail,
        serviceInterest: editForm.serviceInterest.trim(),
        priority: editForm.priority,
        temperature: editForm.temperature ? (editForm.temperature as 'HOT' | 'WARM' | 'COLD') : undefined,
      });

      // If owner was modified, reassign the lead via backend API
      if (editForm.ownerId && editForm.ownerId !== editingLead.ownerId) {
        try {
          const reassigned = await crmApi.assignLead(editingLead.id, editForm.ownerId);
          updated = { ...updated, ...reassigned };
        } catch (assignErr: any) {
          console.warn('Lead reassign warning:', assignErr?.message);
        }
      }

      // Instant optimistic update in TanStack cache
      queryClient.setQueryData(['leads'], (old: any) => {
        if (!old) return old;
        const prevItems = old.items || old.data || [];
        const nextItems = prevItems.map((item: any) =>
          item.id === editingLead.id ? { ...item, ...updated } : item
        );
        return { ...old, items: nextItems, data: nextItems };
      });
      queryClient.setQueryData(['leads', editingLead.id], (old: any) => ({ ...old, ...updated }));

      setEditingLead(null);
      queryClient.invalidateQueries({ queryKey: ['leads'], refetchType: 'active' });
    } catch (err: any) {
      setEditError(err?.message || 'Failed to update lead. Please try again.');
    } finally {
      setIsEditSubmitting(false);
    }
  };

  // Delete Lead
  const handleDeleteLead = async () => {
    if (!deletingLead) return;
    setIsDeleteSubmitting(true);
    setDeleteError(null);
    try {
      await crmApi.deleteLead(deletingLead.id);

      // Instant optimistic update in TanStack cache
      queryClient.setQueryData(['leads'], (old: any) => {
        if (!old) return old;
        const prevItems = old.items || old.data || [];
        const nextItems = prevItems.filter((item: any) => item.id !== deletingLead.id);
        return {
          ...old,
          items: nextItems,
          data: nextItems,
          total: Math.max(0, (old.total ?? prevItems.length) - 1),
        };
      });

      setDeletingLead(null);
      queryClient.invalidateQueries({ queryKey: ['leads'], refetchType: 'active' });
    } catch (err: any) {
      setDeleteError(err?.message || 'Failed to delete lead.');
    } finally {
      setIsDeleteSubmitting(false);
    }
  };

  // CSV Template Download
  const handleDownloadTemplate = () => {
    const headers = [
      'Full Name',
      'Company Name',
      'Job Title',
      'Phone Number',
      'Email Address',
      'Lead Source',
      'Service Interest',
      'Priority',
      'Temperature',
      'Follow-Up Date',
      'Follow-Up Action Type',
      'Follow-Up Purpose',
    ];
    const sampleRow = [
      'Anand Sharma',
      'Acme Tech Pvt Ltd',
      'Director',
      '+919876543210',
      'anand@acmetech.in',
      'WEBSITE_FORM',
      'Custom Web Application Development',
      'HIGH',
      'HOT',
      '2026-10-15',
      'CALL',
      'Discovery call with director',
    ];
    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), sampleRow.join(',')].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'leads_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV File Parsing
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text
          .split(/\r\n|\n/)
          .map((l) => l.trim())
          .filter(Boolean);

        if (lines.length < 2) {
          setImportError('The uploaded CSV file is empty or missing data rows.');
          return;
        }

        // Split CSV row with quotes handling
        const parseRow = (line: string) => {
          const result = [];
          let current = '';
          let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              result.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          result.push(current.trim());
          return result.map((val) => val.replace(/^"|"$/g, '').trim());
        };

        const headers = parseRow(lines[0]).map((h) => h.toLowerCase());
        const parsedRows: any[] = [];

        for (let i = 1; i < lines.length; i++) {
          const values = parseRow(lines[i]);
          if (values.every((v) => !v)) continue; // skip blank rows

          const rowData: Record<string, string> = {};
          headers.forEach((h, index) => {
            rowData[h] = values[index] || '';
          });

          // Match columns
          const fullName = rowData['full name'] || rowData['name'] || values[0] || '';
          const companyName = rowData['company name'] || rowData['company'] || values[1] || '';
          const title = rowData['job title'] || rowData['title'] || values[2] || '';
          const phone = rowData['phone number'] || rowData['phone'] || values[3] || '';
          const email = rowData['email address'] || rowData['email'] || values[4] || '';
          const source = rowData['lead source'] || rowData['source'] || values[5] || 'IMPORT';
          const serviceInterest =
            rowData['service interest'] || rowData['service'] || values[6] || '';
          const priority = rowData['priority'] || values[7] || '';
          const temperature = rowData['temperature'] || values[8] || '';
          const followUpDate = rowData['follow-up date'] || rowData['follow up date'] || values[9] || '';
          const followUpType = rowData['follow-up action type'] || values[10] || '';
          const followUpPurpose = rowData['follow-up purpose'] || values[11] || '';

          // Strictly preserve empty fields without synthetic defaults
          parsedRows.push({
            fullName: fullName.trim(),
            companyName: companyName.trim() || undefined,
            title: title.trim() || undefined,
            phone: phone.trim(),
            email: email.trim() ? email.trim().toLowerCase() : undefined,
            source: (['WEBSITE_FORM', 'META_ADS', 'GOOGLE_ADS', 'WHATSAPP', 'MANUAL', 'PHONE_INBOUND', 'IMPORT'].includes(
              source.toUpperCase()
            )
              ? source.toUpperCase()
              : 'IMPORT') as LeadSource,
            serviceInterest: serviceInterest.trim() || undefined,
            priority: (['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(priority.toUpperCase())
              ? priority.toUpperCase()
              : undefined) as TaskPriority | undefined,
            temperature: (['HOT', 'WARM', 'COLD'].includes(temperature.toUpperCase())
              ? temperature.toUpperCase()
              : undefined) as 'HOT' | 'WARM' | 'COLD' | undefined,
            followUpDate: followUpDate.trim() || undefined,
            followUpType: followUpType.trim() || undefined,
            followUpPurpose: followUpPurpose.trim() || undefined,
          });
        }

        if (parsedRows.length === 0) {
          setImportError('No valid data rows found in the CSV.');
          return;
        }

        setImportRows(parsedRows);
      } catch (err: any) {
        setImportError('Failed to parse CSV file. Please ensure valid comma-separated format.');
      }
    };
    reader.readAsText(file);
  };

  // Execute CSV Batch Import
  const handleExecuteImport = async () => {
    if (importRows.length === 0) return;
    setIsSubmitting(true);
    setImportProgress({ current: 0, total: importRows.length });

    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < importRows.length; i++) {
      const row = importRows[i];
      setImportProgress({ current: i + 1, total: importRows.length });

      if (!row.fullName || !row.phone) {
        failedCount++;
        errors.push(`Row ${i + 1}: Missing required Full Name or Phone`);
        continue;
      }

      const rowPhoneDigits = row.phone.replace(/\D/g, '').slice(-10);
      if (rowPhoneDigits.length !== 10) {
        failedCount++;
        errors.push(`Row ${i + 1} (${row.fullName}): Phone number must be exactly 10 digits (found "${row.phone}")`);
        continue;
      }

      const duplicateInCrm = findDuplicateLeadByPhone(rowPhoneDigits);
      if (duplicateInCrm) {
        failedCount++;
        errors.push(`Row ${i + 1} (${row.fullName}): Phone number ${rowPhoneDigits} already exists for lead "${duplicateInCrm.fullName}".`);
        continue;
      }

      try {
        await crmApi.createLead({
          fullName: row.fullName,
          companyName: row.companyName,
          title: row.title,
          phone: rowPhoneDigits,
          email: row.email,
          source: row.source,
          priority: row.priority || 'MEDIUM',
          temperature: row.temperature,
          serviceInterest: row.serviceInterest || 'General Inquiry',
          nextActionDueAt: row.followUpDate ? new Date(row.followUpDate).toISOString() : undefined,
          nextActionType: row.followUpDate ? ((row.followUpType as any) || 'CALL') : undefined,
          nextActionPurpose: row.followUpDate ? (row.followUpPurpose || 'Follow-up') : undefined,
        });
        successCount++;
      } catch (err: any) {
        failedCount++;
        errors.push(`Row ${i + 1} (${row.fullName}): ${err?.message || 'Database error'}`);
      }
    }

    await queryClient.invalidateQueries({ queryKey: ['leads'] });
    setImportResult({ success: successCount, failed: failedCount, errors });
    setIsSubmitting(false);
    setImportRows([]);
  };

  // Export CSV
  const handleExportCSV = () => {
    if (filteredLeads.length === 0) return;
    const headers = ['Full Name', 'Company Name', 'Job Title', 'Phone', 'Email', 'Source', 'Status', 'Lead Score', 'Service Interest', 'Owner', 'Created Date'];
    const rows = filteredLeads.map((l) => [
      `"${l.fullName}"`,
      `"${l.companyName || ''}"`,
      `"${l.title || ''}"`,
      `"${l.phone}"`,
      `"${l.email || ''}"`,
      `"${l.source}"`,
      `"${l.status}"`,
      `"${l.leadScore}"`,
      `"${l.serviceInterest}"`,
      `"${l.ownerName}"`,
      `"${formatDate(l.createdAt)}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `leads_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const hasActiveFilters =
    searchQuery !== '' ||
    statusFilter !== 'ALL' ||
    sourceFilter !== 'ALL' ||
    categoryFilter !== 'ALL' ||
    ownerFilter !== 'ALL';

  return (
    <div className="space-y-4 select-none pb-8">
      {/* 1. Page Header */}
      <PageHeader
        title="Leads"
        count={`${filteredLeads.length} of ${leads.length}`}
        description="Master sales records, prospective inquiries, and continuous pipeline tracker"
        actions={
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap w-full sm:w-auto">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportCSV}
              className="h-8 text-xs cursor-pointer border-border flex-1 sm:flex-none justify-center"
            >
              <Download className="mr-1.5 h-3.5 w-3.5 text-txt-muted" />
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setImportError(null);
                setImportResult(null);
                setImportRows([]);
                setIsImportModalOpen(true);
              }}
              className="h-8 text-xs cursor-pointer border-border hover:bg-slate-50 flex-1 sm:flex-none justify-center"
            >
              <Upload className="mr-1.5 h-3.5 w-3.5 text-txt-muted" />
              Import
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setCreateError(null);
                setIsAddModalOpen(true);
              }}
              className="h-8 text-xs bg-[#57B71B] hover:bg-[#469815] text-white cursor-pointer shadow-subtle w-full sm:w-auto justify-center"
            >
              <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
              Add Lead
            </Button>
          </div>
        }
      />

      {/* Instant Lead Creation Notification Banner */}
      {createdSuccessBanner && (
        <div className="p-3 rounded-card bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-900 shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#57B71B] shrink-0" />
            <span>
              Lead <strong className="font-semibold text-emerald-950">{createdSuccessBanner.name}</strong> created and added to the top of your list!
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/leads/${createdSuccessBanner.id}`)}
              className="font-semibold text-[#57B71B] hover:text-[#469815] underline flex items-center gap-1 cursor-pointer"
            >
              View 360° Profile <ExternalLink className="h-3 w-3" />
            </button>
            <button
              onClick={() => setCreatedSuccessBanner(null)}
              className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              aria-label="Dismiss banner"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 2. Interactive Lead Metric Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Total Ingested"
          value={leads.length}
          subtext="All prospective inquiries"
          icon={Users}
          iconVariant="neutral"
          onClick={() => handleStatusFilterChange('ALL')}
          className={statusFilter === 'ALL' ? 'border-[#57B71B] ring-1 ring-[#57B71B]/30' : ''}
        />
        <MetricCard
          label="Hot Leads"
          value={leads.filter((l) => l.status === 'HOT').length}
          subtext="Urgent buying interest"
          subtextVariant="danger"
          icon={Flame}
          iconVariant="danger"
          onClick={() => handleStatusFilterChange('HOT')}
          className={statusFilter === 'HOT' ? 'border-[#DC2626] ring-1 ring-[#DC2626]/30' : ''}
        />
        <MetricCard
          label="Warm Leads"
          value={leads.filter((l) => l.status === 'WARM').length}
          subtext="Follow-up in progress"
          subtextVariant="warning"
          icon={SunMedium}
          iconVariant="warning"
          onClick={() => handleStatusFilterChange('WARM')}
          className={statusFilter === 'WARM' ? 'border-[#D97706] ring-1 ring-[#D97706]/30' : ''}
        />
        <MetricCard
          label="Won / Converted"
          value={leads.filter((l) => l.status === 'CONVERTED').length}
          subtext="Deals won & customers"
          subtextVariant="success"
          icon={Trophy}
          iconVariant="success"
          onClick={() => handleStatusFilterChange('CONVERTED')}
          className={statusFilter === 'CONVERTED' ? 'border-[#16A34A] ring-1 ring-[#16A34A]/30' : ''}
        />
      </div>

      {/* 3. Lead Status Tabs */}
      <div className="flex items-center justify-between gap-3 overflow-x-auto pb-1">
        <FilterPills
          options={statusOptions}
          activeId={statusFilter}
          onChange={handleStatusFilterChange}
        />
      </div>

      {/* 3. Search and Quick Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-white p-2.5 rounded-card border border-border shadow-card">
        <SearchInput
          value={searchQuery}
          onChange={(val) => setSearchQuery(val)}
          placeholder="Search by name, company, phone, email, category..."
          className="w-full sm:w-80"
        />

        <div className="grid grid-cols-1 xs:grid-cols-3 sm:flex items-center gap-2 w-full sm:w-auto">
          {/* Category Dropdown */}
          <CustomSelect
            value={categoryFilter}
            onChange={(val) => setCategoryFilter(val)}
            className="w-full sm:w-36"
            options={[
              { value: 'ALL', label: 'All Categories' },
              ...uniqueCategories.map((cat) => ({ value: cat, label: cat })),
            ]}
          />

          {/* Source Dropdown */}
          <CustomSelect
            value={sourceFilter}
            onChange={(val) => setSourceFilter(val)}
            className="w-full sm:w-36"
            options={[
              { value: 'ALL', label: 'All Sources' },
              ...uniqueSources.map((src) => ({ value: src, label: src })),
            ]}
          />

          {/* Owner Dropdown */}
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
              className="col-span-full sm:col-auto h-8 px-2 text-xs text-txt-muted hover:text-txt-primary cursor-pointer justify-center"
            >
              <X className="mr-1 h-3 w-3" /> Reset
            </Button>
          )}
        </div>
      </div>

      {/* 4. Leads Content: Desktop Table & Mobile Card Views */}
      {isLoading ? (
        <div className="p-12 text-center flex flex-col items-center justify-center bg-white rounded-card border border-border shadow-card">
          <Loader2 className="h-6 w-6 animate-spin text-[#57B71B] mb-2" />
          <p className="text-xs font-semibold text-txt-primary">Loading leads from server...</p>
        </div>
      ) : filteredLeads.length === 0 ? (
        <EmptyState
          title="No leads match your criteria"
          description={
            hasActiveFilters
              ? 'Try modifying or clearing your filters to see more prospect records.'
              : 'Get started by creating your first prospective lead or importing from CSV.'
          }
          actionLabel={hasActiveFilters ? 'Clear Filters' : 'Add Lead'}
          onAction={hasActiveFilters ? handleResetFilters : () => setIsAddModalOpen(true)}
          className="bg-white"
        />
      ) : (
        <div className="rounded-card border border-border bg-white shadow-card overflow-hidden">
          {/* Mobile Card List (< md) */}
          <div className="md:hidden divide-y divide-border">
            {filteredLeads.map((lead) => {
              const isRecentlyCreated = recentlyCreatedLeadId === lead.id;
              return (
                <div
                  key={lead.id}
                  className={cn(
                    "p-3.5 space-y-2.5 bg-white transition-all cursor-pointer hover:bg-slate-50/80 active:bg-slate-100",
                    isRecentlyCreated && "bg-emerald-50/80 ring-1 ring-[#57B71B]/30"
                  )}
                  onClick={() => navigate(`/leads/${lead.id}`)}
                >
                  {/* Row 1: Name + Status + Score + Actions */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs text-txt-primary leading-tight">
                          {lead.fullName}
                        </span>
                        {isRecentlyCreated && (
                          <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#57B71B] text-white">
                            NEW
                          </span>
                        )}
                        <StatusBadge status={lead.status} type="lead" />
                      </div>
                      <div className="text-[11px] text-txt-muted flex items-center gap-1">
                        <Building className="h-3 w-3 text-txt-muted shrink-0" />
                        <span className="truncate">{lead.companyName || 'Individual'}</span>
                        {lead.title && <span>&bull; {lead.title}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-txt-secondary tabular-nums bg-slate-100 px-1.5 py-0.5 rounded">
                        <Sparkles className="h-3 w-3 text-amber-500" />
                        {lead.leadScore}
                      </span>
                      <ActionMenu
                        items={[
                          {
                            label: 'Open Details Page',
                            icon: ExternalLink,
                            onClick: () => navigate(`/leads/${lead.id}`),
                          },
                          {
                            label: 'Edit Lead',
                            icon: Edit,
                            onClick: () => handleOpenEdit(lead),
                          },
                          {
                            label: 'Delete Lead',
                            icon: Trash2,
                            onClick: () => {
                              setDeleteError(null);
                              setDeletingLead(lead);
                            },
                          },
                        ]}
                      />
                    </div>
                  </div>

                  {/* Row 2: Contact Phone & Email */}
                  <div className="flex items-center gap-3 text-xs flex-wrap" onClick={(e) => e.stopPropagation()}>
                    {lead.phone && (
                      <a
                        href={`tel:${lead.phone.replace(/[^0-9+]/g, '')}`}
                        className="inline-flex items-center gap-1 font-semibold text-slate-800 hover:text-[#57B71B] transition-colors"
                      >
                        <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                        <span className="tabular-nums">{lead.phone}</span>
                      </a>
                    )}
                    {lead.email && (
                      <a
                        href={`mailto:${lead.email}`}
                        className="inline-flex items-center gap-1 text-[11px] text-txt-muted hover:text-[#57B71B] truncate max-w-[180px]"
                      >
                        <Mail className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                        <span className="truncate">{lead.email}</span>
                      </a>
                    )}
                  </div>

                  {/* Row 3: Category & Source */}
                  <div className="flex items-center justify-between text-xs gap-2 pt-1 border-t border-slate-100">
                    <span className="text-[11px] text-txt-secondary truncate" title={lead.serviceInterest}>
                      {lead.serviceInterest}
                    </span>
                    <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 text-txt-secondary border border-border shrink-0">
                      {lead.source}
                    </span>
                  </div>

                  {/* Row 4: Owner & Next Action */}
                  <div className="flex items-center justify-between text-[11px] gap-2 pt-0.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Avatar className="h-4.5 w-4.5 shrink-0">
                        <AvatarFallback className="bg-primary-soft text-primary text-[8px] font-bold">
                          {lead.ownerName.split(' ').map((n: string) => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-txt-muted truncate">{lead.ownerName}</span>
                    </div>

                    {lead.nextAction ? (
                      <div className="text-right text-[10px] text-[#57B71B] font-semibold truncate shrink-0">
                        Next: {lead.nextAction.actionType} ({lead.nextAction.time || formatDate(lead.nextAction.date)})
                      </div>
                    ) : (
                      <span className="text-[10px] text-txt-muted">No action scheduled</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View (>= md) */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Lead / Prospect</TableHead>
                  <TableHead className="w-[180px]">Contact Info</TableHead>
                  <TableHead className="w-[110px]">Source</TableHead>
                  <TableHead className="w-[130px]">Status & Score</TableHead>
                  <TableHead className="w-[180px]">Category / Service</TableHead>
                  <TableHead className="w-[140px]">Owner</TableHead>
                  <TableHead className="min-w-[210px]">Next Action</TableHead>
                  <TableHead className="w-[80px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead) => {
                  const isRecentlyCreated = recentlyCreatedLeadId === lead.id;
                  return (
                    <TableRow
                      key={lead.id}
                      className={cn(
                        "cursor-pointer group hover:bg-slate-50/80 transition-all duration-300",
                        isRecentlyCreated && "bg-emerald-50/80 ring-1 ring-[#57B71B]/30"
                      )}
                      onClick={() => navigate(`/leads/${lead.id}`)}
                    >
                      {/* 1. Lead / Company */}
                      <TableCell>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-xs text-txt-primary block leading-tight group-hover:text-primary transition-colors">
                              {lead.fullName}
                            </span>
                            {isRecentlyCreated && (
                              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#57B71B] text-white">
                                NEW
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-txt-muted flex items-center gap-1">
                            <Building className="h-3 w-3 text-txt-muted shrink-0" />
                            <span className="truncate max-w-[140px]">
                              {lead.companyName || 'Individual'}
                            </span>
                          </span>
                        </div>
                      </TableCell>

                    {/* 2. Contact */}
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="space-y-1 text-xs">
                        {lead.phone ? (
                          <a
                            href={`tel:${lead.phone.replace(/[^0-9+]/g, '')}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1.5 font-semibold text-slate-900 hover:text-[#57B71B] transition-colors group/phone cursor-pointer"
                            title={`Call ${lead.phone}`}
                          >
                            <Phone className="h-3 w-3 text-slate-400 group-hover/phone:text-[#57B71B] transition-colors shrink-0" />
                            <span className="tabular-nums underline-offset-2 hover:underline leading-tight">{lead.phone}</span>
                          </a>
                        ) : (
                          <span className="text-txt-muted block leading-tight tabular-nums">—</span>
                        )}
                        {lead.email ? (
                          <a
                            href={`mailto:${lead.email}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1.5 text-[11px] text-txt-muted hover:text-[#57B71B] truncate max-w-[150px] hover:underline transition-colors block group/mail"
                            title={`Email ${lead.email}`}
                          >
                            <Mail className="h-2.5 w-2.5 text-slate-400 group-hover/mail:text-[#57B71B] transition-colors shrink-0" />
                            <span className="truncate">{lead.email}</span>
                          </a>
                        ) : (
                          <span className="text-[11px] text-txt-muted block">—</span>
                        )}
                      </div>
                    </TableCell>

                    {/* 3. Source */}
                    <TableCell>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-badge text-[10px] font-semibold bg-slate-100 text-txt-secondary border border-border">
                        {lead.source}
                      </span>
                    </TableCell>

                    {/* 4. Status & Score */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={lead.status} type="lead" />
                        <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-txt-secondary tabular-nums">
                          <Sparkles className="h-3 w-3 text-amber-500" />
                          {lead.leadScore}
                        </span>
                      </div>
                    </TableCell>

                    {/* 5. Service Line */}
                    <TableCell>
                      <span
                        className="text-xs text-txt-primary truncate block max-w-[170px]"
                        title={lead.serviceInterest}
                      >
                        {lead.serviceInterest}
                      </span>
                    </TableCell>

                    {/* 6. Owner */}
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="bg-primary-soft text-primary text-[9px] font-bold">
                            {lead.ownerName
                              .split(' ')
                              .map((n: string) => n[0])
                              .join('')}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-txt-primary truncate max-w-[100px]">
                          {lead.ownerName}
                        </span>
                      </div>
                    </TableCell>

                    {/* 7. Next Action */}
                    <TableCell>
                      {lead.nextAction ? (
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-xs text-primary">
                              {lead.nextAction.actionType}
                            </span>
                            <span className="text-[11px] text-txt-muted tabular-nums">
                              {lead.nextAction.time || formatDate(lead.nextAction.date)}
                            </span>
                          </div>
                          <span
                            className="text-[11px] text-txt-secondary truncate block max-w-[200px]"
                            title={lead.nextAction.purpose}
                          >
                            {lead.nextAction.purpose}
                          </span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-badge text-[10px] font-medium bg-slate-100 text-txt-muted">
                          No action scheduled
                        </span>
                      )}
                    </TableCell>

                    {/* 8. Row Actions */}
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <ActionMenu
                        items={[
                          {
                            label: 'Open Details Page',
                            icon: ExternalLink,
                            onClick: () => navigate(`/leads/${lead.id}`),
                          },
                          {
                            label: 'Edit Lead',
                            icon: Edit,
                            onClick: () => handleOpenEdit(lead),
                          },
                          {
                            label: 'Delete Lead',
                            icon: Trash2,
                            onClick: () => {
                              setDeleteError(null);
                              setDeletingLead(lead);
                            },
                          },
                        ]}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            </Table>
          </div>

          {/* Table / Card List Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-1 px-4 py-2.5 bg-slate-50/70 border-t border-border text-xs text-txt-muted text-center sm:text-left">
            <span>
              Showing <strong className="text-txt-primary tabular-nums">{filteredLeads.length}</strong> of{' '}
              <strong className="text-txt-primary tabular-nums">{leads.length}</strong> leads
            </span>
            <span className="text-[11px]">Click any record to open the complete 360° Lead Details Page</span>
          </div>
        </div>
      )}

      {/* MODAL: CREATE NEW LEAD */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-sm sm:text-base font-bold text-txt-primary">Create New Lead</DialogTitle>
            <DialogDescription className="text-xs text-txt-muted">
              Record a new prospect inquiry and persist it to PostgreSQL
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddLeadSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-2.5 sm:px-5 sm:py-3.5 space-y-2.5 text-xs touch-pan-y">
              {createError && (
                <div className="p-2.5 rounded-btn bg-[#FEF2F2] border border-[#FECACA] flex items-start gap-2 text-xs text-[#DC2626]">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span className="font-medium leading-relaxed">{createError}</span>
                </div>
              )}

            <div className="space-y-1">
              <label className="text-caption text-txt-secondary block font-medium">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                id="new-lead-fullname"
                name="fullName"
                type="text"
                required
                value={newLeadForm.fullName}
                onChange={(e) => setNewLeadForm({ ...newLeadForm, fullName: e.target.value })}
                placeholder="e.g. Rajesh Kumar"
                disabled={isSubmitting}
                className="w-full h-8 rounded-input border border-border bg-white px-2.5 text-xs text-txt-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
              <div className="space-y-1">
                <label className="text-caption text-txt-secondary block font-medium">Company Name</label>
                <input
                  type="text"
                  value={newLeadForm.companyName}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, companyName: e.target.value })}
                  placeholder="e.g. Acme Tech Solutions"
                  disabled={isSubmitting}
                  className="w-full h-8 rounded-input border border-border bg-white px-2.5 text-xs text-txt-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-caption text-txt-secondary block font-medium">Job Title</label>
                <input
                  type="text"
                  value={newLeadForm.title}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, title: e.target.value })}
                  placeholder="e.g. Managing Director"
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
                    {newLeadForm.phone.length}/10 digits
                  </span>
                </div>
                <input
                  type="tel"
                  required
                  value={newLeadForm.phone}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setNewLeadForm({ ...newLeadForm, phone: cleaned });
                  }}
                  maxLength={10}
                  inputMode="numeric"
                  pattern="[0-9]{10}"
                  title="Phone number must be exactly 10 digits"
                  placeholder="e.g. 9876543210 (10 digits)"
                  disabled={isSubmitting}
                  className={`w-full h-8 rounded-input border bg-white px-2.5 text-xs text-txt-primary focus:outline-none focus:ring-1 ${
                    createDuplicateLead
                      ? 'border-red-500 focus:ring-red-500'
                      : newLeadForm.phone.length === 10
                      ? 'border-emerald-500 focus:ring-emerald-500'
                      : 'border-border focus:ring-primary'
                  }`}
                />
                <div className="text-[11px] pt-0.5">
                  {createDuplicateLead ? (
                    <span className="text-red-500 font-medium flex items-center gap-1">
                      <AlertCircle className="h-3 w-3 inline shrink-0" />
                      Already used by {createDuplicateLead.fullName}
                    </span>
                  ) : newLeadForm.phone.length > 0 && newLeadForm.phone.length < 10 ? (
                    <span className="text-amber-600 font-medium">
                      Only 10 digits allowed ({newLeadForm.phone.length}/10 entered)
                    </span>
                  ) : newLeadForm.phone.length === 10 ? (
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
                <label className="text-caption text-txt-secondary block font-medium">
                  Email Address <span className="text-[10px] text-txt-muted font-normal">(Optional)</span>
                </label>
                <input
                  type="email"
                  value={newLeadForm.email}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, email: e.target.value })}
                  placeholder="rajesh@acmetech.in"
                  disabled={isSubmitting}
                  className="w-full h-8 rounded-input border border-border bg-white px-2.5 text-xs text-txt-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
              <div className="space-y-1">
                <label className="text-caption text-txt-secondary block font-medium">Lead Source</label>
                <CustomSelect
                  value={newLeadForm.source}
                  onChange={(val) =>
                    setNewLeadForm({ ...newLeadForm, source: val as LeadSource })
                  }
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
                <label className="text-caption text-txt-secondary block font-medium">Assign Owner</label>
                <CustomSelect
                  value={newLeadForm.ownerId}
                  onChange={(selectedId) => {
                    const member = teamMembers.find((m: any) => m.id === selectedId);
                    setNewLeadForm({
                      ...newLeadForm,
                      ownerId: selectedId,
                      ownerName: member ? member.name : '',
                    });
                  }}
                  disabled={isSubmitting}
                  placeholder="Default (Logged-in Account Owner)"
                  options={[
                    { value: '', label: 'Default (Logged-in Account Owner)' },
                    ...teamMembers.map((member: any) => ({
                      value: member.id,
                      label: `${member.name}${member.email ? ` (${member.email})` : ''}`,
                    })),
                  ]}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-caption text-txt-secondary block font-medium">
                Category / Service Interest <span className="text-red-500">*</span>
              </label>
              <CategorySelect
                value={newLeadForm.serviceInterest}
                onChange={(val) => setNewLeadForm({ ...newLeadForm, serviceInterest: val })}
                extraCategories={uniqueCategories}
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
              <div className="space-y-1">
                <label className="text-caption text-txt-secondary block font-medium">Customer Priority</label>
                <CustomSelect
                  value={newLeadForm.priority}
                  onChange={(val) =>
                    setNewLeadForm({ ...newLeadForm, priority: val as TaskPriority })
                  }
                  disabled={isSubmitting}
                  options={[
                    { value: 'LOW', label: 'LOW' },
                    { value: 'MEDIUM', label: 'MEDIUM (Default)' },
                    { value: 'HIGH', label: 'HIGH' },
                    { value: 'URGENT', label: 'URGENT' },
                  ]}
                />
              </div>

              <div className="space-y-1">
                <label className="text-caption text-txt-secondary block font-medium">Customer Temperature</label>
                <CustomSelect
                  value={newLeadForm.temperature}
                  onChange={(val) =>
                    setNewLeadForm({
                      ...newLeadForm,
                      temperature: val as '' | 'HOT' | 'WARM' | 'COLD',
                    })
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

            {/* Follow-up / Next Action Setting */}
            <div className="pt-2 border-t border-border/60 space-y-2">
              <span className="text-caption font-semibold text-txt-primary block">
                Next Follow-Up / Action (Optional)
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5">
                <div className="space-y-1">
                  <label className="text-[11px] text-txt-muted block">Follow-Up Date</label>
                  <input
                    type="date"
                    value={newLeadForm.nextActionDate}
                    onChange={(e) =>
                      setNewLeadForm({ ...newLeadForm, nextActionDate: e.target.value })
                    }
                    disabled={isSubmitting}
                    className="w-full h-8 rounded-input border border-border bg-white px-2 text-xs text-txt-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-txt-muted block">Time (Optional)</label>
                  <input
                    type="time"
                    value={newLeadForm.nextActionTime}
                    onChange={(e) =>
                      setNewLeadForm({ ...newLeadForm, nextActionTime: e.target.value })
                    }
                    disabled={isSubmitting}
                    className="w-full h-8 rounded-input border border-border bg-white px-2 text-xs text-txt-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-txt-muted block">Action Type</label>
                  <CustomSelect
                    value={newLeadForm.nextActionType}
                    onChange={(val) =>
                      setNewLeadForm({
                        ...newLeadForm,
                        nextActionType: val as TaskActionType,
                      })
                    }
                    disabled={isSubmitting}
                    options={[
                      { value: 'CALL', label: 'Call' },
                      { value: 'WHATSAPP', label: 'WhatsApp' },
                      { value: 'EMAIL', label: 'Email' },
                      { value: 'MEETING', label: 'Meeting' },
                      { value: 'PROPOSAL', label: 'Proposal' },
                      { value: 'INTERNAL_REVIEW', label: 'Internal Review' },
                    ]}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-txt-muted block">Action Purpose / Agenda</label>
                <input
                  type="text"
                  value={newLeadForm.nextActionPurpose}
                  onChange={(e) =>
                    setNewLeadForm({ ...newLeadForm, nextActionPurpose: e.target.value })
                  }
                  placeholder="e.g. Introductory discovery call or review proposal"
                  disabled={isSubmitting}
                  className="w-full h-8 rounded-input border border-border bg-white px-2.5 text-xs text-txt-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
                  disabled={isSubmitting}
                  className="h-8 text-xs cursor-pointer w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="h-8 text-xs bg-[#57B71B] hover:bg-[#469815] text-white cursor-pointer w-full sm:w-auto font-semibold"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Saving...
                    </>
                  ) : (
                    'Create Lead'
                  )}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: EDIT LEAD */}
      <Dialog open={!!editingLead} onOpenChange={(open) => !open && setEditingLead(null)}>
        {editingLead && (
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-section-title text-txt-primary">Edit Lead</DialogTitle>
              <DialogDescription className="text-xs text-txt-muted">
                Update prospect details and sync changes to PostgreSQL
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleEditLeadSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 sm:px-5 sm:py-4 space-y-3 text-xs">
                {editError && (
                  <div className="p-2.5 rounded-btn bg-[#FEF2F2] border border-[#FECACA] flex items-start gap-2 text-xs text-[#DC2626]">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span className="font-medium leading-relaxed">{editError}</span>
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
                  disabled={isEditSubmitting}
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
                    disabled={isEditSubmitting}
                    className="w-full h-8 rounded-input border border-border bg-white px-2.5 text-xs text-txt-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-caption text-txt-secondary block font-medium">Job Title</label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    disabled={isEditSubmitting}
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
                    disabled={isEditSubmitting}
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
                    disabled={isEditSubmitting}
                    className="w-full h-8 rounded-input border border-border bg-white px-2.5 text-xs text-txt-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
                  extraCategories={uniqueCategories}
                  disabled={isEditSubmitting}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
                <div className="space-y-1">
                  <label className="text-caption text-txt-secondary block font-medium">Priority</label>
                  <CustomSelect
                    value={editForm.priority}
                    onChange={(val) => setEditForm({ ...editForm, priority: val as TaskPriority })}
                    disabled={isEditSubmitting}
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
                    disabled={isEditSubmitting}
                    options={[
                      { value: '', label: 'None (Unrated)' },
                      { value: 'HOT', label: 'HOT' },
                      { value: 'WARM', label: 'WARM' },
                      { value: 'COLD', label: 'COLD' },
                    ]}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-caption text-txt-secondary block font-medium">Assign Owner</label>
                <CustomSelect
                  value={editForm.ownerId}
                  onChange={(selectedId) => {
                    const member = teamMembers.find((m: any) => m.id === selectedId);
                    setEditForm({
                      ...editForm,
                      ownerId: selectedId,
                      ownerName: member ? member.name : '',
                    });
                  }}
                  disabled={isEditSubmitting}
                  placeholder="Keep Existing Owner"
                  options={[
                    { value: '', label: 'Keep Existing Owner' },
                    ...teamMembers.map((member: any) => ({
                      value: member.id,
                      label: `${member.name}${member.email ? ` (${member.email})` : ''}`,
                    })),
                  ]}
                />
              </div>
              </div>

              <DialogFooter className="px-4 py-3 sm:px-5 sm:py-3 border-t border-border flex flex-col-reverse sm:flex-row gap-2 sm:gap-0 shrink-0 bg-slate-50/95 mt-auto">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setEditingLead(null)}
                  disabled={isEditSubmitting}
                  className="h-8 text-xs cursor-pointer w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isEditSubmitting}
                  className="h-8 text-xs bg-[#57B71B] hover:bg-[#469815] text-white cursor-pointer w-full sm:w-auto"
                >
                  {isEditSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        )}
      </Dialog>

      {/* MODAL: DELETE CONFIRMATION */}
      <Dialog open={!!deletingLead} onOpenChange={(open) => !open && setDeletingLead(null)}>
        {deletingLead && (
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold text-red-600 flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4" /> Delete Lead Record
              </DialogTitle>
              <DialogDescription className="text-xs text-txt-muted">
                Are you sure you want to delete <strong>{deletingLead.fullName}</strong>?
              </DialogDescription>
            </DialogHeader>

            {deleteError && (
              <div className="px-4 py-2 sm:px-5">
                <div className="p-2.5 rounded-btn bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#DC2626]">
                  {deleteError}
                </div>
              </div>
            )}

            <DialogFooter className="px-4 py-3 sm:px-5 sm:py-3 border-t border-border flex items-center justify-end gap-2 shrink-0 bg-slate-50/95 mt-auto">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setDeletingLead(null)}
                disabled={isDeleteSubmitting}
                className="h-8 text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDeleteLead}
                disabled={isDeleteSubmitting}
                className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white cursor-pointer"
              >
                {isDeleteSubmitting ? 'Deleting...' : 'Confirm Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* MODAL: IMPORT CSV */}
      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-section-title text-txt-primary flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-[#57B71B]" /> Import Leads from CSV
            </DialogTitle>
            <DialogDescription className="text-xs text-txt-muted">
              Upload a CSV file matching the Lead creation fields. Empty optional fields are kept blank without synthetic defaults.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 sm:px-5 sm:py-4 space-y-4 text-xs">
            {/* Step 1: Download Template */}
            <div className="p-3 rounded-card bg-slate-50 border border-border flex items-center justify-between">
              <div>
                <h4 className="font-bold text-xs text-txt-primary">Need the standard CSV template?</h4>
                <p className="text-[11px] text-txt-muted">
                  Download a pre-formatted template with all columns ready to fill.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
                className="h-8 text-xs cursor-pointer border-border hover:bg-white"
              >
                <Download className="mr-1.5 h-3.5 w-3.5 text-txt-muted" /> Template
              </Button>
            </div>

            {/* Step 2: Upload Input */}
            <div className="space-y-1.5">
              <label className="text-caption text-txt-secondary block font-medium">Select CSV File</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileUpload}
                disabled={isSubmitting}
                className="w-full text-xs text-txt-primary file:mr-3 file:py-1.5 file:px-3 file:rounded-btn file:border file:border-border file:text-xs file:font-semibold file:bg-slate-50 hover:file:bg-slate-100 cursor-pointer"
              />
            </div>

            {importError && (
              <div className="p-2.5 rounded-btn bg-[#FEF2F2] border border-[#FECACA] flex items-start gap-2 text-xs text-[#DC2626]">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{importError}</span>
              </div>
            )}

            {/* Step 3: Preview Table */}
            {importRows.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-txt-primary">
                    Preview ({importRows.length} rows detected)
                  </span>
                  <span className="text-[11px] text-txt-muted">
                    Empty columns will remain blank in PostgreSQL
                  </span>
                </div>

                <div className="max-h-48 overflow-y-auto border border-border rounded-btn">
                  <table className="w-full text-[11px]">
                    <thead className="bg-slate-100 sticky top-0">
                      <tr>
                        <th className="p-1.5 text-left font-semibold">#</th>
                        <th className="p-1.5 text-left font-semibold">Name</th>
                        <th className="p-1.5 text-left font-semibold">Company</th>
                        <th className="p-1.5 text-left font-semibold">Phone</th>
                        <th className="p-1.5 text-left font-semibold">Email</th>
                        <th className="p-1.5 text-left font-semibold">Source</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {importRows.slice(0, 5).map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-1.5 text-txt-muted">{idx + 1}</td>
                          <td className="p-1.5 font-medium text-txt-primary">{row.fullName}</td>
                          <td className="p-1.5 text-txt-muted">{row.companyName || '—'}</td>
                          <td className="p-1.5 text-txt-primary">{row.phone}</td>
                          <td className="p-1.5 text-txt-muted">{row.email || '—'}</td>
                          <td className="p-1.5 text-txt-secondary">{row.source}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {importRows.length > 5 && (
                  <p className="text-[10px] text-txt-muted text-right">
                    ...and {importRows.length - 5} more rows
                  </p>
                )}
              </div>
            )}

            {/* Progress indicator */}
            {importProgress && isSubmitting && (
              <div className="space-y-1 p-3 rounded-btn bg-[#F0FDF4] border border-[#BBF7D0]">
                <div className="flex items-center justify-between text-xs text-[#166534] font-semibold">
                  <span>Importing leads into PostgreSQL...</span>
                  <span>
                    {importProgress.current} / {importProgress.total}
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-[#22C55E] h-1.5 transition-all duration-200"
                    style={{
                      width: `${(importProgress.current / importProgress.total) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Import Results Summary */}
            {importResult && (
              <div className="p-3 rounded-card bg-slate-50 border border-border space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  <CheckCircle2 className="h-4 w-4 text-[#16A34A]" />
                  <span className="font-semibold text-txt-primary">
                    Import Completed: {importResult.success} leads created successfully
                  </span>
                </div>
                {importResult.failed > 0 && (
                  <div className="text-[11px] text-red-600 space-y-1">
                    <p className="font-medium">{importResult.failed} rows failed to import:</p>
                    <ul className="list-disc pl-4 max-h-24 overflow-y-auto space-y-0.5">
                      {importResult.errors.map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="px-4 py-3 sm:px-5 sm:py-3 border-t border-border flex items-center justify-end gap-2 shrink-0 bg-slate-50/95 mt-auto">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsImportModalOpen(false)}
              disabled={isSubmitting}
              className="h-8 text-xs cursor-pointer"
            >
              {importResult ? 'Done' : 'Cancel'}
            </Button>
            {importRows.length > 0 && !importResult && (
              <Button
                type="button"
                size="sm"
                onClick={handleExecuteImport}
                disabled={isSubmitting}
                className="h-8 text-xs bg-[#57B71B] hover:bg-[#469815] text-white cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Importing...
                  </>
                ) : (
                  `Import ${importRows.length} Leads`
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
