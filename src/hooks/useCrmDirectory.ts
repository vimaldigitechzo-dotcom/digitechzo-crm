import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { crmApi } from '@/lib/api';

export interface CrmDirectoryClient {
  id: string;
  leadId?: string;
  companyName: string;
  contactName: string;
  phone: string;
  email: string;
  status?: string;
  type: 'lead' | 'customer';
  displayName: string;
  displayText: string;
}

export interface CrmDirectoryUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export function useCrmDirectory() {
  // 1. Fetch Users / Team Members from database via API
  const usersQuery = useQuery({
    queryKey: ['crm-directory-users'],
    queryFn: () => crmApi.getUsers({ limit: 100 }),
    staleTime: 60000,
    retry: 1,
  });

  // 2. Fetch Leads from database via API
  const leadsQuery = useQuery({
    queryKey: ['crm-directory-leads'],
    queryFn: () => crmApi.getLeads({ limit: 100 }),
    staleTime: 60000,
    retry: 1,
  });

  // 3. Fetch Customers from database via API
  const customersQuery = useQuery({
    queryKey: ['crm-directory-customers'],
    queryFn: () => crmApi.getCustomers({ limit: 100 }),
    staleTime: 60000,
    retry: 1,
  });

  // Normalize Team Users (exclusively from real database API)
  const teamUsers = useMemo<CrmDirectoryUser[]>(() => {
    const uData = usersQuery.data as any;
    const rawUsers: any[] =
      uData?.data?.data ||
      uData?.data?.items ||
      uData?.data ||
      uData?.items ||
      (Array.isArray(uData) ? uData : []);

    return (Array.isArray(rawUsers) ? rawUsers : [])
      .filter((u: any) => u.status === 'ACTIVE' || !u.status)
      .map((u: any) => ({
        id: u.id,
        name: u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
        email: u.email || '',
        role: u.role?.displayAlias || u.role?.name || u.role || 'Member',
      }));
  }, [usersQuery.data]);

  // Unique Owner Names for Filter Dropdowns
  const teamOwnerNames = useMemo<string[]>(() => {
    return Array.from(new Set(teamUsers.map((u) => u.name).filter(Boolean)));
  }, [teamUsers]);

  // Normalize Clients (exclusively from real Leads and Customers in database)
  const clients = useMemo<CrmDirectoryClient[]>(() => {
    const rawLeads: any[] =
      leadsQuery.data?.items ||
      leadsQuery.data?.leads ||
      (Array.isArray(leadsQuery.data?.data) ? leadsQuery.data?.data : leadsQuery.data?.data?.items) ||
      (Array.isArray(leadsQuery.data) ? leadsQuery.data : []);

    const rawCustomers: any[] =
      customersQuery.data?.data ||
      customersQuery.data?.items ||
      (Array.isArray(customersQuery.data) ? customersQuery.data : []);

    const list: CrmDirectoryClient[] = [];
    const seen = new Set<string>();

    // Add Customers first
    rawCustomers.forEach((c: any) => {
      const company = (c.companyName || '').trim();
      const contact = (c.contactName || c.primaryContactName || '').trim();
      const phone = (c.phone || c.contactPhone || '').trim();
      const email = (c.email || c.contactEmail || '').trim();
      const displayName = company || contact || 'Customer Account';
      const key = `${displayName.toLowerCase()}_${phone}`;

      if (!seen.has(key)) {
        seen.add(key);
        const details = [
          contact && contact !== company ? `(${contact})` : '',
          phone ? `• ${phone}` : '',
          email ? `• ${email}` : '',
        ].filter(Boolean).join(' ');

        list.push({
          id: c.leadId || c.id,
          leadId: c.leadId,
          companyName: company || contact,
          contactName: contact,
          phone,
          email,
          status: c.status || 'ACTIVE',
          type: 'customer',
          displayName,
          displayText: `${displayName} ${details}`.trim(),
        });
      }
    });

    // Add Leads from Database
    rawLeads.forEach((l: any) => {
      const company = (l.companyName || '').trim();
      const contact = (l.fullName || l.name || '').trim();
      const phone = (l.phone || '').trim();
      const email = (l.email || '').trim();
      const displayName = company || contact || 'Prospect';
      const key = `${displayName.toLowerCase()}_${phone}`;

      if (!seen.has(key)) {
        seen.add(key);
        const details = [
          contact && contact !== company ? `(${contact})` : '',
          phone ? `• ${phone}` : '',
          email ? `• ${email}` : '',
        ].filter(Boolean).join(' ');

        list.push({
          id: l.id,
          companyName: company || contact,
          contactName: contact,
          phone,
          email,
          status: l.status || 'NEW',
          type: 'lead',
          displayName,
          displayText: `${displayName} ${details}`.trim(),
        });
      }
    });

    return list;
  }, [leadsQuery.data, customersQuery.data]);

  // Unique Client Display Names for Filter Dropdowns
  const clientNames = useMemo<string[]>(() => {
    return Array.from(new Set(clients.map((c) => c.displayName).filter(Boolean)));
  }, [clients]);

  return {
    teamUsers,
    teamOwnerNames,
    clients,
    clientNames,
    isLoading: usersQuery.isLoading || leadsQuery.isLoading || customersQuery.isLoading,
  };
}
