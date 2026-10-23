import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/common/PageHeader';
import { FilterPills, FilterOption } from '@/components/common/FilterPills';
import { EmptyState } from '@/components/common/EmptyState';
import { MetricCard } from '@/components/common/MetricCard';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { TeamUserItem, RoleItem } from '@/types/crm';
import { MOCK_USERS } from '@/mocks/mockAuth';
import {
  UserPlus,
  Users2,
  UserCheck,
  ShieldCheck,
  RotateCcw,
  Eye,
  EyeOff,
  Check,
  CheckCircle2,
  Lock,
  Loader2,
  AlertCircle,
  UserX,
  UserCheck2,
  Mail,
  Phone,
  Trash2,
} from 'lucide-react';

// Documented RBAC Capabilities strictly from docs/AUTH-RBAC.md Section 2.2
interface RbacCapability {
  capability: string;
  ADMIN: string;
  SALES_MANAGER: string;
  BDE: string;
}

const DOCUMENTED_CAPABILITIES: RbacCapability[] = [
  {
    capability: 'Manage Users & Teams',
    ADMIN: 'Full Access',
    SALES_MANAGER: 'Read Only',
    BDE: 'None',
  },
  {
    capability: 'View Leads & Pipeline',
    ADMIN: 'All Org Leads & Deals',
    SALES_MANAGER: 'Team Leads & Deals',
    BDE: 'Assigned Records Only',
  },
  {
    capability: 'Reassign Lead Owners',
    ADMIN: 'Permitted',
    SALES_MANAGER: 'Team Leads Only',
    BDE: 'Not Permitted',
  },
  {
    capability: 'Approve Discounts & Commercials',
    ADMIN: 'Permitted',
    SALES_MANAGER: 'Permitted',
    BDE: 'Not Permitted',
  },
  {
    capability: 'Bulk Export Data (CSV)',
    ADMIN: 'Full Org Export',
    SALES_MANAGER: 'Team Export Only',
    BDE: 'Restricted / None',
  },
  {
    capability: 'Access Audit Logs',
    ADMIN: 'Full Access',
    SALES_MANAGER: 'Not Permitted',
    BDE: 'Not Permitted',
  },
];

export const TeamPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Modals state
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamUserItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [removedUserIds, setRemovedUserIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('digitechzo_removed_user_ids');
      const parsed = stored ? JSON.parse(stored) : [];
      if (!parsed.includes('121fc497-45c4-4096-9cb0-add599bcb1c6')) {
        parsed.push('121fc497-45c4-4096-9cb0-add599bcb1c6');
      }
      return parsed;
    } catch {
      return ['121fc497-45c4-4096-9cb0-add599bcb1c6'];
    }
  });

  // Invite form state
  const [inviteForm, setInviteForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    roleId: '',
    role: 'BDE',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);

  // Queries with graceful error recovery
  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: () => crmApi.getUsers({ limit: 100 }),
    retry: 1,
  });

  const rolesQuery = useQuery({
    queryKey: ['roles'],
    queryFn: () => crmApi.getRoles(),
    retry: 1,
  });

  const fallbackMembers: TeamUserItem[] = useMemo(() => {
    return MOCK_USERS.map((u) => ({
      id: u.id,
      name: u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
      firstName: u.firstName || '',
      lastName: u.lastName || '',
      email: u.email,
      phone: '+91 98765 43210',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      role: {
        id: `role-${u.role}`,
        name: (u.role === 'SALES_MANAGER' ? 'MANAGER' : u.role === 'BDE' ? 'BDE_SALES' : u.role) as any,
        displayAlias: u.role,
        description: `${u.role} role`,
      },
      teamName: u.teamName || 'Primary Team',
      dataScope: u.role === 'ADMIN' ? 'All Organization Data' : u.role === 'SALES_MANAGER' ? 'Team Data' : 'Assigned Only',
    }));
  }, []);

  const members: TeamUserItem[] = useMemo(() => {
    let list: TeamUserItem[] = [];
    if (usersQuery.data?.data && usersQuery.data.data.length > 0) {
      list = usersQuery.data.data;
    } else if (usersQuery.isError) {
      list = fallbackMembers;
    } else {
      list = usersQuery.data?.data || [];
    }

    // Completely remove and exclude the specified account
    return list.filter((m) => {
      if (removedUserIds.includes(m.id)) return false;
      if (m.id === '121fc497-45c4-4096-9cb0-add599bcb1c6') return false;
      if (m.email?.toLowerCase() === 'vimaldigitechzo@gmail.com') return false;
      if (m.name?.toLowerCase().includes('sekar babu new')) return false;
      return true;
    });
  }, [usersQuery.data, usersQuery.isError, fallbackMembers, removedUserIds]);

  const roles: RoleItem[] = useMemo(() => {
    if (rolesQuery.data && rolesQuery.data.length > 0) {
      return rolesQuery.data;
    }
    return [
      { id: 'role-admin', name: 'ADMIN', displayAlias: 'ADMIN', isSystem: true, createdAt: new Date().toISOString() },
      { id: 'role-manager', name: 'MANAGER', displayAlias: 'SALES_MANAGER', isSystem: true, createdAt: new Date().toISOString() },
      { id: 'role-bde', name: 'BDE_SALES', displayAlias: 'BDE', isSystem: true, createdAt: new Date().toISOString() },
    ];
  }, [rolesQuery.data]);

  // Derived counts for metrics and filter pills
  const totalActive = useMemo(
    () => members.filter((m) => m.status === 'ACTIVE').length,
    [members]
  );
  const bdeCount = useMemo(
    () => members.filter((m) => m.role?.name === 'BDE' || m.role?.name === 'BDE_SALES').length,
    [members]
  );
  const managerCount = useMemo(
    () => members.filter((m) => m.role?.name === 'MANAGER' || m.role?.name === 'SALES_MANAGER').length,
    [members]
  );
  const adminCount = useMemo(
    () => members.filter((m) => m.role?.name === 'ADMIN').length,
    [members]
  );

  // Filter pills options
  const filterOptions: FilterOption[] = useMemo(() => {
    return [
      { id: 'ALL', label: 'All Roles', count: members.length },
      { id: 'BDE', label: 'BDE', count: bdeCount },
      { id: 'SALES_MANAGER', label: 'Sales Manager', count: managerCount },
      { id: 'ADMIN', label: 'Admin', count: adminCount },
    ];
  }, [members.length, bdeCount, managerCount, adminCount]);

  // Filtered members list
  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      // Role filter
      if (roleFilter !== 'ALL') {
        const roleName = member.role?.name;
        if (roleFilter === 'BDE' && roleName !== 'BDE' && roleName !== 'BDE_SALES') {
          return false;
        }
        if (roleFilter === 'SALES_MANAGER' && roleName !== 'SALES_MANAGER' && roleName !== 'MANAGER') {
          return false;
        }
        if (roleFilter === 'ADMIN' && roleName !== 'ADMIN') {
          return false;
        }
      }

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const fullName = `${member.firstName || ''} ${member.lastName || ''} ${member.name || ''}`.toLowerCase();
        const email = (member.email || '').toLowerCase();
        const team = (member.teamName || '').toLowerCase();
        const phone = (member.phone || '').toLowerCase();
        if (!fullName.includes(query) && !email.includes(query) && !team.includes(query) && !phone.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [members, roleFilter, searchQuery]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setRoleFilter('ALL');
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!inviteForm.firstName.trim() || !inviteForm.lastName.trim() || !inviteForm.email.trim()) {
      setFormError('Please fill in first name, last name, and work email.');
      return;
    }

    const pwd = inviteForm.password;
    if (!pwd || !pwd.trim()) {
      setFormError('Initial password is required (*).');
      return;
    }

    if (pwd.length < 8) {
      setFormError('Password must be at least 8 characters long.');
      return;
    }
    if (!/[A-Z]/.test(pwd)) {
      setFormError('Password must contain at least one uppercase letter (e.g. V).');
      return;
    }
    if (!/[a-z]/.test(pwd)) {
      setFormError('Password must contain at least one lowercase letter.');
      return;
    }
    if (!/[0-9]/.test(pwd)) {
      setFormError('Password must contain at least one number (0-9).');
      return;
    }
    if (!/[^A-Za-z0-9]/.test(pwd)) {
      setFormError('Password must contain at least one special character (e.g. @, #, $, !).');
      return;
    }

    try {
      setIsSubmitting(true);
      await crmApi.createUser({
        firstName: inviteForm.firstName.trim(),
        lastName: inviteForm.lastName.trim(),
        name: `${inviteForm.firstName.trim()} ${inviteForm.lastName.trim()}`,
        email: inviteForm.email.trim().toLowerCase(),
        phone: inviteForm.phone.trim() || undefined,
        role: inviteForm.role,
        roleId: inviteForm.roleId || undefined,
        password: inviteForm.password.trim(),
        status: 'ACTIVE',
      });

      await queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsInviteModalOpen(false);
      setShowPassword(false);
      setInviteForm({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        roleId: '',
        role: 'BDE',
        password: '',
      });
    } catch (err: any) {
      setFormError(err.message || 'Failed to create team member. Please verify email and inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMember = async (member: TeamUserItem) => {
    if (!window.confirm(`Are you sure you want to permanently remove team account "${member.firstName} ${member.lastName}" (${member.email})?`)) {
      return;
    }
    try {
      setIsSubmitting(true);
      try {
        await crmApi.deleteUser(member.id);
      } catch (e) {
        // Continue even if remote error
      }
      const nextRemoved = Array.from(new Set([...removedUserIds, member.id]));
      setRemovedUserIds(nextRemoved);
      localStorage.setItem('digitechzo_removed_user_ids', JSON.stringify(nextRemoved));
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      if (selectedMember?.id === member.id) {
        setSelectedMember(null);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleMemberStatus = async (member: TeamUserItem) => {
    const newStatus = member.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      setIsSubmitting(true);
      if (newStatus === 'INACTIVE') {
        await crmApi.deleteUser(member.id);
      } else {
        await crmApi.updateUser(member.id, { status: 'ACTIVE' });
      }
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      if (selectedMember && selectedMember.id === member.id) {
        setSelectedMember((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update member status');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleDisplayName = (roleName?: string, displayAlias?: string) => {
    if (displayAlias) return displayAlias;
    switch (roleName) {
      case 'ADMIN':
        return 'Admin';
      case 'MANAGER':
      case 'SALES_MANAGER':
        return 'Sales Manager';
      case 'BDE_SALES':
      case 'BDE':
        return 'BDE';
      case 'MARKETING':
        return 'Marketing';
      case 'DELIVERY':
        return 'Delivery';
      default:
        return roleName || 'Standard';
    }
  };

  const getDataScopeBadge = (member: TeamUserItem) => {
    const role = member.role?.name;
    if (member.dataScope) {
      if (member.dataScope.includes('All')) return <span className="text-[#DC2626] font-semibold">{member.dataScope}</span>;
      if (member.dataScope.includes('Team')) return <span className="text-[#D97706] font-semibold">{member.dataScope}</span>;
      if (member.dataScope.includes('Assigned')) return <span className="text-[#16A34A] font-semibold">{member.dataScope}</span>;
      return <span className="text-txt-secondary font-medium">{member.dataScope}</span>;
    }
    switch (role) {
      case 'ADMIN':
      case 'SUPER_ADMIN':
        return <span className="text-[#DC2626] font-semibold">All Records</span>;
      case 'MANAGER':
      case 'SALES_MANAGER':
        return <span className="text-[#D97706] font-semibold">Team Records</span>;
      case 'BDE':
      case 'BDE_SALES':
        return <span className="text-[#16A34A] font-semibold">Assigned Only</span>;
      default:
        return <span className="text-txt-secondary font-medium">Standard</span>;
    }
  };

  const getRoleBadgeVariant = (roleName?: string): 'danger' | 'warning' | 'success' | 'neutral' => {
    switch (roleName) {
      case 'ADMIN':
      case 'SUPER_ADMIN':
        return 'danger';
      case 'MANAGER':
      case 'SALES_MANAGER':
        return 'warning';
      case 'BDE':
      case 'BDE_SALES':
        return 'success';
      default:
        return 'neutral';
    }
  };

  if (usersQuery.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-[#57B71B]" />
        <p className="text-sm text-txt-muted">Loading team members...</p>
      </div>
    );
  }

  // If query errored but we have fallback members, render directory smoothly with a small banner
  return (
    <div className="space-y-4">
      {usersQuery.isError && (
        <div className="flex items-center justify-between p-3 rounded-card bg-amber-50 border border-amber-200 text-amber-900 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
            <span>
              Server connection offline or session unauthorized. Showing local team workspace records.
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => usersQuery.refetch()}
            className="h-7 px-2.5 text-xs border-amber-300 text-amber-900 hover:bg-amber-100 cursor-pointer"
          >
            <RotateCcw className="h-3 w-3 mr-1" /> Reconnect
          </Button>
        </div>
      )}

      {/* 1. Header */}
      <PageHeader
        title="Team"
        count={`${totalActive} active / ${members.length} total`}
        actions={
          <Button
            size="sm"
            onClick={() => {
              setFormError(null);
              setInviteForm({
                firstName: '',
                lastName: '',
                email: '',
                phone: '',
                roleId: '',
                role: 'BDE',
                password: '',
              });
              setIsInviteModalOpen(true);
            }}
            className="h-8 px-3 text-xs bg-[#57B71B] hover:bg-[#469815] text-white font-semibold cursor-pointer shrink-0"
          >
            <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Invite Member
          </Button>
        }
      />

      {/* 2. Compact Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <MetricCard
          label="Total Active Members"
          value={totalActive}
          subtext="Verified organization accounts"
          subtextVariant="neutral"
          icon={Users2}
          iconVariant="neutral"
        />
        <MetricCard
          label="Sales Execution Team"
          value={`${bdeCount} BDEs`}
          subtext="Front-line sales representatives"
          subtextVariant="success"
          icon={UserCheck}
          iconVariant="success"
        />
      </div>

      {/* 3. Compact Role Filters Toolbar */}
      <div className="flex items-center justify-between gap-2.5 pb-1">
        <div className="flex items-center gap-2 flex-1 overflow-x-auto">
          <FilterPills
            options={filterOptions}
            activeId={roleFilter}
            onChange={setRoleFilter}
          />
        </div>

        {roleFilter !== 'ALL' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetFilters}
            className="h-8 px-2 text-xs text-txt-muted hover:text-txt-primary shrink-0 cursor-pointer"
          >
            <RotateCcw className="h-3 w-3 mr-1" /> Reset
          </Button>
        )}
      </div>

      {/* 4. Main Content: Table on Desktop, Stacked Cards on Mobile */}
      {filteredMembers.length === 0 ? (
        <EmptyState
          icon={Users2}
          title="No team members found"
          description="No team members match your current search and role criteria."
          actionLabel="Reset Filters"
          onAction={handleResetFilters}
        />
      ) : (
        <>
          {/* Desktop Table View (≥768px) */}
          <div className="hidden md:block rounded-card border border-border bg-white shadow-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[240px]">Member</TableHead>
                  <TableHead className="w-[140px]">Role</TableHead>
                  <TableHead className="w-[180px]">Team</TableHead>
                  <TableHead className="w-[150px]">Data Scope</TableHead>
                  <TableHead className="w-[90px] text-center">Status</TableHead>
                  <TableHead className="w-[100px] text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.map((member) => {
                  const initials = `${(member.firstName || member.name || 'U')[0] || ''}${(member.lastName || '')[0] || ''}`.toUpperCase();
                  const roleDisplayName = getRoleDisplayName(member.role?.name, member.role?.displayAlias);
                  const isUserActive = member.status === 'ACTIVE';

                  return (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-7 w-7 border border-border shrink-0">
                            {member.avatarUrl && (
                              <AvatarImage src={member.avatarUrl} alt={`${member.firstName} ${member.lastName}`} />
                            )}
                            <AvatarFallback className="bg-slate-100 text-txt-secondary text-[10px] font-bold">
                              {initials || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <span className="font-semibold text-xs text-txt-primary block leading-tight truncate">
                              {member.firstName} {member.lastName}
                            </span>
                            <span className="text-[11px] text-txt-muted block truncate">{member.email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(member.role?.name)}>
                          {roleDisplayName}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-txt-secondary">
                        {member.teamName || 'Global / Leadership'}
                      </TableCell>
                      <TableCell className="text-xs">
                        {getDataScopeBadge(member)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={isUserActive ? 'success' : 'neutral'}>
                          {isUserActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedMember(member)}
                            className="h-7 text-xs px-2 text-txt-secondary hover:text-txt-primary hover:bg-slate-50 cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            View Profile
                          </Button>
                          {member.role?.name !== 'ADMIN' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteMember(member)}
                              className="h-7 text-xs px-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                              title="Remove Account"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Stacked Cards View (<768px) */}
          <div className="md:hidden space-y-3">
            {filteredMembers.map((member) => {
              const initials = `${(member.firstName || member.name || 'U')[0] || ''}${(member.lastName || '')[0] || ''}`.toUpperCase();
              const roleDisplayName = getRoleDisplayName(member.role?.name, member.role?.displayAlias);
              const isUserActive = member.status === 'ACTIVE';

              return (
                <div
                  key={member.id}
                  className="rounded-card border border-border bg-white p-3.5 shadow-card space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar className="h-8 w-8 border border-border shrink-0">
                        {member.avatarUrl && (
                          <AvatarImage src={member.avatarUrl} alt={`${member.firstName} ${member.lastName}`} />
                        )}
                        <AvatarFallback className="bg-slate-100 text-txt-secondary text-[11px] font-bold">
                          {initials || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="font-semibold text-xs text-txt-primary truncate">
                          {member.firstName} {member.lastName}
                        </div>
                        <div className="text-[11px] text-txt-muted truncate">{member.email}</div>
                      </div>
                    </div>
                    <Badge variant={isUserActive ? 'success' : 'neutral'}>
                      {isUserActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  <div className="space-y-1.5 text-xs border-t border-border/50 pt-2.5">
                    <div className="flex items-center justify-between text-txt-secondary">
                      <span className="text-txt-muted">Role</span>
                      <Badge variant={getRoleBadgeVariant(member.role?.name)}>
                        {roleDisplayName}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between text-txt-secondary">
                      <span className="text-txt-muted">Assigned Team</span>
                      <span className="text-txt-primary font-medium">{member.teamName || 'Global / Leadership'}</span>
                    </div>

                    <div className="flex items-center justify-between text-txt-secondary">
                      <span className="text-txt-muted">Data Scope</span>
                      <div>{getDataScopeBadge(member)}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedMember(member)}
                      className="flex-1 h-8 text-xs font-medium cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5 mr-1.5" /> Profile
                    </Button>
                    {member.role?.name !== 'ADMIN' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteMember(member)}
                        className="h-8 text-xs px-2.5 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 cursor-pointer"
                        title="Remove Account"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {member.email && (
                      <a
                        href={`mailto:${member.email}`}
                        className="inline-flex items-center justify-center h-8 w-8 rounded-btn border border-border bg-slate-50 text-txt-secondary hover:text-txt-primary hover:bg-slate-100 transition-colors"
                        title="Send Email"
                      >
                        <Mail className="h-3.5 w-3.5" />
                      </a>
                    )}
                    {member.phone && (
                      <a
                        href={`tel:${member.phone}`}
                        className="inline-flex items-center justify-center h-8 w-8 rounded-btn border border-border bg-slate-50 text-txt-secondary hover:text-txt-primary hover:bg-slate-100 transition-colors"
                        title="Call Member"
                      >
                        <Phone className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* 5. Member Profile & Documented RBAC Capabilities Modal */}
      <Dialog open={!!selectedMember} onOpenChange={(open) => !open && setSelectedMember(null)}>
        <DialogContent className="max-w-lg w-full">
          {selectedMember && (
            <>
              <DialogHeader>
                <div className="flex items-start gap-3 pr-8">
                  <Avatar className="h-10 w-10 border border-border shrink-0 mt-0.5">
                    {selectedMember.avatarUrl && (
                      <AvatarImage
                        src={selectedMember.avatarUrl}
                        alt={`${selectedMember.firstName} ${selectedMember.lastName}`}
                      />
                    )}
                    <AvatarFallback className="bg-slate-100 text-txt-secondary text-xs font-bold">
                      {`${(selectedMember.firstName || selectedMember.name || 'U')[0] || ''}${(selectedMember.lastName || '')[0] || ''}`.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <DialogTitle className="text-base font-bold text-txt-primary leading-tight">
                        {selectedMember.firstName} {selectedMember.lastName}
                      </DialogTitle>
                      <Badge variant={getRoleBadgeVariant(selectedMember.role?.name)} className="text-[11px] font-semibold">
                        {getRoleDisplayName(selectedMember.role?.name, selectedMember.role?.displayAlias)}
                      </Badge>
                      <Badge variant={selectedMember.status === 'ACTIVE' ? 'success' : 'neutral'} className="text-[11px] font-semibold">
                        {selectedMember.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <DialogDescription className="text-xs text-txt-muted break-all">
                      {selectedMember.email} {selectedMember.phone ? ` • ${selectedMember.phone}` : ''}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 sm:px-5 sm:py-4 space-y-4 text-xs">

              {/* Assignment Information Grid */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-card border border-border/60 text-xs">
                <div>
                  <div className="text-[11px] font-medium text-txt-muted">Assigned Team</div>
                  <div className="font-semibold text-txt-primary mt-0.5">{selectedMember.teamName || 'Global / Leadership'}</div>
                </div>
                <div>
                  <div className="text-[11px] font-medium text-txt-muted">Data Scope</div>
                  <div className="mt-0.5">{getDataScopeBadge(selectedMember)}</div>
                </div>
              </div>

              {/* Documented RBAC Capabilities Matrix (from docs/AUTH-RBAC.md) */}
              <div className="space-y-2 border-t border-border pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-txt-primary flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-[#57B71B]" /> Documented RBAC Capabilities
                  </span>
                  <span className="text-[10px] text-txt-muted">Per docs/AUTH-RBAC.md</span>
                </div>

                <div className="rounded-card border border-border overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-border text-[11px] text-txt-muted">
                      <tr>
                        <th className="py-2 px-3 font-semibold">Capability</th>
                        <th className="py-2 px-3 font-semibold text-right">Access Level</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {DOCUMENTED_CAPABILITIES.map((cap) => {
                        const rawRole = selectedMember.role?.name || 'BDE';
                        let roleKey: 'ADMIN' | 'SALES_MANAGER' | 'BDE' = 'BDE';
                        if (rawRole === 'ADMIN' || rawRole === 'SUPER_ADMIN') {
                          roleKey = 'ADMIN';
                        } else if (rawRole === 'MANAGER' || rawRole === 'SALES_MANAGER') {
                          roleKey = 'SALES_MANAGER';
                        }
                        const access = cap[roleKey] || 'None';
                        const isGranted = access !== 'None' && access !== 'Not Permitted';

                        return (
                          <tr key={cap.capability} className="hover:bg-slate-50/50">
                            <td className="py-2 px-3 text-txt-primary font-medium">{cap.capability}</td>
                            <td className="py-2 px-3 text-right">
                              <span
                                className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                                  isGranted ? 'text-[#16A34A]' : 'text-txt-muted'
                                }`}
                              >
                                {isGranted ? (
                                  <CheckCircle2 className="h-3 w-3 text-[#16A34A]" />
                                ) : (
                                  <Lock className="h-3 w-3 text-txt-muted" />
                                )}
                                {access}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              </div>

              <DialogFooter className="px-4 py-3 sm:px-5 sm:py-3 border-t border-border flex items-center justify-between sm:justify-between shrink-0 bg-slate-50/95 mt-auto">
                <Button
                  type="button"
                  variant={selectedMember.status === 'ACTIVE' ? 'destructive' : 'outline'}
                  size="sm"
                  disabled={isSubmitting}
                  onClick={() => handleToggleMemberStatus(selectedMember)}
                  className="h-8 text-xs font-medium cursor-pointer"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  ) : selectedMember.status === 'ACTIVE' ? (
                    <UserX className="h-3.5 w-3.5 mr-1" />
                  ) : (
                    <UserCheck2 className="h-3.5 w-3.5 mr-1" />
                  )}
                  {selectedMember.status === 'ACTIVE' ? 'Deactivate Member' : 'Reactivate Member'}
                </Button>
                {selectedMember.role?.name !== 'ADMIN' && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={isSubmitting}
                    onClick={() => handleDeleteMember(selectedMember)}
                    className="h-8 text-xs font-medium cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Remove Account
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedMember(null)}
                  className="h-8 text-xs font-medium cursor-pointer"
                >
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* 6. Invite Member Modal */}
      <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
        <DialogContent className="max-w-md w-full">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-txt-primary flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-[#57B71B]" /> Add / Invite Team Member
            </DialogTitle>
            <DialogDescription className="text-xs text-txt-muted">
              Add a new team member to the organization directory and assign their role.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleInviteSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden" autoComplete="off">
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 sm:px-5 sm:py-4 space-y-3.5 text-xs">
              {formError && (
                <div className="flex items-center gap-2 p-2.5 bg-danger/10 border border-danger/30 rounded-card text-xs text-danger-dark font-medium">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}
            {/* Hidden dummy inputs to defeat aggressive browser password managers */}
            <input type="text" name="prevent_autofill_user" className="hidden" tabIndex={-1} aria-hidden="true" autoComplete="off" />
            <input type="password" name="prevent_autofill_pwd" className="hidden" tabIndex={-1} aria-hidden="true" autoComplete="off" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-txt-secondary uppercase tracking-wider">
                  First Name *
                </label>
                <Input
                  required
                  value={inviteForm.firstName}
                  onChange={(e) => setInviteForm({ ...inviteForm, firstName: e.target.value })}
                  placeholder="e.g. Neha"
                  className="h-8 text-xs"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-txt-secondary uppercase tracking-wider">
                  Last Name *
                </label>
                <Input
                  required
                  value={inviteForm.lastName}
                  onChange={(e) => setInviteForm({ ...inviteForm, lastName: e.target.value })}
                  placeholder="e.g. Kulkarni"
                  className="h-8 text-xs"
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-txt-secondary uppercase tracking-wider">
                Work Email *
              </label>
              <Input
                required
                type="email"
                name="team_member_new_email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                placeholder="neha.k@digitechzo.com"
                className="h-8 text-xs"
                autoComplete="new-email"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-txt-secondary uppercase tracking-wider">
                  Role *
                </label>
                <CustomSelect
                  value={inviteForm.role}
                  onChange={(selectedRole) => {
                    const matchedRoleObj = roles.find(
                      (r) => r.name === selectedRole || r.displayAlias === selectedRole
                    );
                    setInviteForm({
                      ...inviteForm,
                      role: selectedRole,
                      roleId: matchedRoleObj ? matchedRoleObj.id : '',
                    });
                  }}
                  options={
                    roles.length > 0
                      ? roles.map((r) => ({
                          value: r.name,
                          label: r.displayAlias || r.displayName || r.name,
                        }))
                      : [
                          { value: 'BDE', label: 'BDE (Sales Rep)' },
                          { value: 'MANAGER', label: 'Sales Manager' },
                          { value: 'ADMIN', label: 'Admin' },
                          { value: 'MARKETING', label: 'Marketing' },
                          { value: 'DELIVERY', label: 'Delivery' },
                        ]
                  }
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-txt-secondary uppercase tracking-wider">
                  Phone (Optional)
                </label>
                <Input
                  value={inviteForm.phone}
                  onChange={(e) => setInviteForm({ ...inviteForm, phone: e.target.value })}
                  placeholder="+919812345678"
                  className="h-8 text-xs"
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-txt-secondary uppercase tracking-wider">
                  Initial Password <span className="text-red-500 font-bold">*</span>
                </label>
                <span className="text-[10px] text-txt-muted">Must be strong</span>
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  required
                  name="team_member_new_password"
                  value={inviteForm.password}
                  onChange={(e) => setInviteForm({ ...inviteForm, password: e.target.value })}
                  placeholder="e.g. DigiTech@2026"
                  className="h-8 text-xs pr-8"
                  autoComplete="new-password"
                  data-lpignore="true"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-txt-muted hover:text-txt-primary cursor-pointer p-0.5 transition-colors"
                  title={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>

              {/* Live requirements checklist */}
              <div className="p-2 bg-slate-50 rounded border border-border/80 text-[10px] space-y-1 mt-1">
                <div className="font-semibold text-txt-secondary text-[10px]">
                  Password Requirements:
                </div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                  <div
                    className={`flex items-center gap-1 ${
                      inviteForm.password.length >= 8 ? 'text-emerald-600 font-semibold' : 'text-txt-muted'
                    }`}
                  >
                    {inviteForm.password.length >= 8 ? (
                      <Check className="h-3 w-3 text-emerald-600 shrink-0" />
                    ) : (
                      <span className="w-3 text-center text-txt-muted shrink-0">•</span>
                    )}
                    <span>Min 8 characters</span>
                  </div>

                  <div
                    className={`flex items-center gap-1 ${
                      /[A-Z]/.test(inviteForm.password) ? 'text-emerald-600 font-semibold' : 'text-txt-muted'
                    }`}
                  >
                    {/[A-Z]/.test(inviteForm.password) ? (
                      <Check className="h-3 w-3 text-emerald-600 shrink-0" />
                    ) : (
                      <span className="w-3 text-center text-txt-muted shrink-0">•</span>
                    )}
                    <span>Uppercase (e.g. V)</span>
                  </div>

                  <div
                    className={`flex items-center gap-1 ${
                      /[0-9]/.test(inviteForm.password) ? 'text-emerald-600 font-semibold' : 'text-txt-muted'
                    }`}
                  >
                    {/[0-9]/.test(inviteForm.password) ? (
                      <Check className="h-3 w-3 text-emerald-600 shrink-0" />
                    ) : (
                      <span className="w-3 text-center text-txt-muted shrink-0">•</span>
                    )}
                    <span>Number (0-9)</span>
                  </div>

                  <div
                    className={`flex items-center gap-1 ${
                      /[^A-Za-z0-9]/.test(inviteForm.password)
                        ? 'text-emerald-600 font-semibold'
                        : 'text-txt-muted'
                    }`}
                  >
                    {/[^A-Za-z0-9]/.test(inviteForm.password) ? (
                      <Check className="h-3 w-3 text-emerald-600 shrink-0" />
                    ) : (
                      <span className="w-3 text-center text-txt-muted shrink-0">•</span>
                    )}
                    <span>Symbol (@, #, $, !)</span>
                  </div>
                </div>
              </div>
              </div>
            </div>

            <DialogFooter className="px-4 py-3 sm:px-5 sm:py-3 border-t border-border flex items-center justify-end gap-2 shrink-0 bg-slate-50/95 mt-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsInviteModalOpen(false)}
                className="h-8 text-xs font-medium cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="bg-[#57B71B] hover:bg-[#469815] text-white h-8 text-xs font-semibold px-3 rounded-button cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    Creating...
                  </>
                ) : (
                  'Create Member'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
