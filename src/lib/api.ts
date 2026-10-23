import { AuthSession, User } from '@/types/auth';

const STORAGE_KEY = 'digitechzo_auth_session';
const isDev = Boolean((import.meta as any)?.env?.DEV);
const defaultUrl = isDev ? '' : 'https://digitechzo-crm-api.onrender.com';
const rawEnvUrl = (import.meta as any)?.env?.VITE_API_URL || defaultUrl;
const RAW_API_URL = rawEnvUrl ? String(rawEnvUrl).replace(/\/+$/, '') : '';
const API_BASE_URL = RAW_API_URL ? `${RAW_API_URL}/api/v1` : '/api/v1';

export class ApiError extends Error {
  constructor(public status: number, message: string, public data?: any) {
    super(message);
    this.name = 'ApiError';
  }
}

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

export const authStorage = {
  getSession(): AuthSession | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthSession;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  },

  setSession(session: AuthSession): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  },

  clearSession(): void {
    localStorage.removeItem(STORAGE_KEY);
  },
};

function triggerSessionExpired(reason: string) {
  authStorage.clearSession();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('auth:expired', { detail: { reason } }));
    if (!window.location.pathname.startsWith('/login')) {
      window.location.href = '/login?expired=1';
    }
  }
}

export async function apiFetch<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const session = authStorage.getSession();
  if (session?.accessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${session.accessToken}`);
  }

  const response = await fetch(url, { ...options, headers });

  // Handle 401 Unauthorized with token refresh (avoid infinite loops on auth endpoints)
  if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
    const isMockToken = typeof session?.accessToken === 'string' && session.accessToken.startsWith('mock-');
    if (!isMockToken && !isRefreshing && session?.refreshToken && !session.refreshToken.startsWith('mock-')) {
      isRefreshing = true;
      try {
        const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: session.refreshToken }),
        });

        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          const newAccessToken = refreshData.data?.accessToken || refreshData.accessToken;
          const newRefreshToken = refreshData.data?.refreshToken || refreshData.refreshToken;
          const newExpiresIn = refreshData.data?.expiresIn || refreshData.expiresIn || 2592000;
          const newSession: AuthSession = {
            ...session,
            accessToken: newAccessToken,
            refreshToken: newRefreshToken || session.refreshToken,
            expiresAt: new Date(Date.now() + newExpiresIn * 1000).toISOString(),
          };
          authStorage.setSession(newSession);
          onRefreshed(newAccessToken);
          isRefreshing = false;

          // Retry original request with new token
          headers.set('Authorization', `Bearer ${newAccessToken}`);
          const retryRes = await fetch(url, { ...options, headers });
          return handleResponse<T>(retryRes);
        } else {
          isRefreshing = false;
          triggerSessionExpired('refresh_failed');
          throw new ApiError(401, 'Your session has expired. Please sign in again.');
        }
      } catch (err) {
        isRefreshing = false;
        triggerSessionExpired('refresh_error');
        throw new ApiError(401, 'Your session has expired. Please sign in again.');
      }
    } else if (!isMockToken && isRefreshing) {
      // Queue requests until refresh completes
      return new Promise<T>((resolve) => {
        subscribeTokenRefresh(async (newToken) => {
          headers.set('Authorization', `Bearer ${newToken}`);
          const retryRes = await fetch(url, { ...options, headers });
          resolve(handleResponse<T>(retryRes));
        });
      });
    } else {
      triggerSessionExpired('unauthorized');
      throw new ApiError(401, 'Your session has expired. Please sign in again.');
    }
  }

  return handleResponse<T>(response);
}

async function handleResponse<T>(response: Response): Promise<T> {
  let json: any = null;
  try {
    json = await response.json();
  } catch {
    json = null;
  }

  if (!response.ok) {
    const errorMsg =
      (json && (json.message || json.error?.message || (Array.isArray(json.message) ? json.message.join(', ') : null))) ||
      `Request failed with status ${response.status}`;
    throw new ApiError(response.status, errorMsg, json);
  }

  // Unwrap TransformResponseInterceptor wrapper if present
  if (json && typeof json === 'object' && 'success' in json && 'data' in json) {
    return json.data as T;
  }

  return json as T;
}

// Backend Auth API
export const authApi = {
  async login(email: string, password: string): Promise<AuthSession> {
    const data = await apiFetch<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    const userPayload = data.user;
    const nameParts = (userPayload.name || '').trim().split(' ');
    const firstName = nameParts[0] || userPayload.email.split('@')[0];
    const lastName = nameParts.slice(1).join(' ') || '';

    const user: User = {
      id: userPayload.id,
      email: userPayload.email,
      name: userPayload.name,
      firstName,
      lastName,
      role: userPayload.role,
      permissions: userPayload.permissions || [],
      organization: userPayload.organization,
    };

    const session: AuthSession = {
      user,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: new Date(Date.now() + (data.expiresIn || 2592000) * 1000).toISOString(),
    };

    authStorage.setSession(session);
    return session;
  },

  async logout(): Promise<void> {
    const session = authStorage.getSession();
    try {
      if (session?.refreshToken) {
        await apiFetch('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken: session.refreshToken }),
        });
      }
    } catch {
      // Ignore network failure on logout
    } finally {
      authStorage.clearSession();
    }
  },

  async getMe(): Promise<User> {
    const userPayload = await apiFetch<any>('/auth/me');
    const nameParts = (userPayload.name || '').trim().split(' ');
    const firstName = nameParts[0] || userPayload.email.split('@')[0];
    const lastName = nameParts.slice(1).join(' ') || '';

    return {
      id: userPayload.id,
      email: userPayload.email,
      name: userPayload.name,
      firstName,
      lastName,
      role: userPayload.role,
      permissions: userPayload.permissions || [],
      organization: userPayload.organization,
    };
  },

  async sendPasswordResetCode(email: string): Promise<{ success: boolean; message: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const res = await apiFetch<any>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: cleanEmail }),
    });
    return {
      success: true,
      message: res?.message || `A verification code has been sent to ${cleanEmail}. Please check your email inbox.`,
    };
  },

  async resetPasswordWithCode(
    email: string,
    code: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();
    const res = await apiFetch<any>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email: cleanEmail, code: cleanCode, newPassword }),
    });
    return {
      success: true,
      message: res?.message || 'Password reset successfully. You can now log in with your new password.',
    };
  },
};

// Real CRM Phase 3 APIs
export const crmApi = {
  getLeads(params: Record<string, any> = {}) {
    const qs = new URLSearchParams(params).toString();
    return apiFetch<any>(`/leads${qs ? `?${qs}` : ''}`);
  },

  getLead(id: string) {
    return apiFetch<any>(`/leads/${id}`);
  },

  createLead(data: import('@/types/crm').CreateLeadPayload) {
    return apiFetch<any>('/leads', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateLead(id: string, data: import('@/types/crm').UpdateLeadPayload) {
    return apiFetch<any>(`/leads/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  assignLead(id: string, ownerId: string) {
    return apiFetch<any>(`/leads/${id}/assign`, {
      method: 'PATCH',
      body: JSON.stringify({ ownerId }),
    });
  },

  deleteLead(id: string) {
    return apiFetch<any>(`/leads/${id}`, {
      method: 'DELETE',
    });
  },

  getLeadQualification(id: string) {
    return apiFetch<any>(`/leads/${id}/qualification`);
  },

  upsertLeadQualification(id: string, data: any) {
    return apiFetch<any>(`/leads/${id}/qualification`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  updateLeadStatus(id: string, status: string, unqualifiedReason?: string) {
    return apiFetch<any>(`/leads/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, unqualifiedReason }),
    });
  },

  updateLeadNextAction(id: string, data: any) {
    return apiFetch<any>(`/leads/${id}/next-action`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  updateLeadPriorityTemperature(id: string, data: any) {
    return apiFetch<any>(`/leads/${id}/priority`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  getPipelineStages() {
    return apiFetch<import('@/types/crm').PipelineStageDto[]>('/deals/stages');
  },

  getLostReasons() {
    return apiFetch<import('@/types/crm').LostReasonDto[]>('/deals/lost-reasons');
  },

  getDeals(params: Record<string, any> = {}) {
    const qs = new URLSearchParams(params).toString();
    return apiFetch<any>(`/deals${qs ? `?${qs}` : ''}`);
  },

  getDeal(id: string) {
    return apiFetch<any>(`/deals/${id}`);
  },

  createDeal(data: import('@/types/crm').CreateDealPayload) {
    return apiFetch<any>('/deals', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateDeal(id: string, data: import('@/types/crm').UpdateDealPayload) {
    return apiFetch<any>(`/deals/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  updateDealStage(id: string, stageId: string) {
    return apiFetch<any>(`/deals/${id}/stage`, {
      method: 'PATCH',
      body: JSON.stringify({ stageId }),
    });
  },

  markDealWon(id: string, wonNotes?: string) {
    return apiFetch<any>(`/deals/${id}/won`, {
      method: 'PATCH',
      body: JSON.stringify({ wonNotes }),
    });
  },

  markDealLost(id: string, lostReasonId: string, lostReasonNotes?: string) {
    return apiFetch<any>(`/deals/${id}/lost`, {
      method: 'PATCH',
      body: JSON.stringify({ lostReasonId, lostReasonNotes }),
    });
  },

  deleteDeal(id: string) {
    return apiFetch<any>(`/deals/${id}`, {
      method: 'DELETE',
    });
  },

  getTasks(params: Record<string, any> = {}) {
    const qs = new URLSearchParams(params).toString();
    return apiFetch<any>(`/tasks${qs ? `?${qs}` : ''}`);
  },

  getTask(id: string) {
    return apiFetch<any>(`/tasks/${id}`);
  },

  createTask(data: import('@/types/crm').CreateTaskPayload) {
    return apiFetch<any>('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateTask(id: string, data: import('@/types/crm').UpdateTaskPayload) {
    return apiFetch<any>(`/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  completeTask(id: string, data?: { completionNotes?: string; createActivity?: boolean }) {
    return apiFetch<any>(`/tasks/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    });
  },

  reopenTask(id: string) {
    return apiFetch<any>(`/tasks/${id}/reopen`, {
      method: 'POST',
    });
  },

  assignTask(id: string, assigneeId: string) {
    return apiFetch<any>(`/tasks/${id}/assign`, {
      method: 'POST',
      body: JSON.stringify({ assigneeId }),
    });
  },

  deleteTask(id: string) {
    return apiFetch<any>(`/tasks/${id}`, {
      method: 'DELETE',
    });
  },

  getActivities(params: Record<string, any> = {}) {
    const qs = new URLSearchParams(params).toString();
    return apiFetch<any>(`/activities${qs ? `?${qs}` : ''}`);
  },

  getActivity(id: string) {
    return apiFetch<any>(`/activities/${id}`);
  },

  createActivity(data: import('@/types/crm').CreateActivityPayload) {
    return apiFetch<any>('/activities', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getMeetings(params: Record<string, any> = {}) {
    const qs = new URLSearchParams(params).toString();
    return apiFetch<any>(`/meetings${qs ? `?${qs}` : ''}`);
  },

  getMeeting(id: string) {
    return apiFetch<any>(`/meetings/${id}`);
  },

  createMeeting(data: import('@/types/crm').CreateMeetingPayload) {
    return apiFetch<any>('/meetings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateMeeting(id: string, data: import('@/types/crm').UpdateMeetingPayload) {
    return apiFetch<any>(`/meetings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  completeMeeting(id: string, data: import('@/types/crm').CompleteMeetingPayload) {
    return apiFetch<any>(`/meetings/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  cancelMeeting(id: string, data: import('@/types/crm').CancelMeetingPayload) {
    return apiFetch<any>(`/meetings/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  markMeetingNoShow(id: string) {
    return apiFetch<any>(`/meetings/${id}/no-show`, {
      method: 'POST',
    });
  },

  deleteMeeting(id: string) {
    return apiFetch<any>(`/meetings/${id}`, {
      method: 'DELETE',
    });
  },

  getProposals(params: Record<string, any> = {}) {
    const qs = new URLSearchParams(params).toString();
    return apiFetch<any>(`/proposals${qs ? `?${qs}` : ''}`);
  },

  getProposal(id: string) {
    return apiFetch<any>(`/proposals/${id}`);
  },

  createProposal(data: import('@/types/crm').CreateProposalPayload) {
    return apiFetch<any>('/proposals', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateProposal(id: string, data: import('@/types/crm').UpdateProposalPayload) {
    return apiFetch<any>(`/proposals/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  updateProposalStatus(id: string, data: import('@/types/crm').UpdateProposalStatusPayload) {
    return apiFetch<any>(`/proposals/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  deleteProposal(id: string) {
    return apiFetch<any>(`/proposals/${id}`, {
      method: 'DELETE',
    });
  },

  getCustomers(params: Record<string, any> = {}) {
    const qs = new URLSearchParams(params).toString();
    return apiFetch<any>(`/customers${qs ? `?${qs}` : ''}`);
  },

  getCustomer(id: string) {
    return apiFetch<any>(`/customers/${id}`);
  },

  createCustomer(data: import('@/types/crm').CreateCustomerPayload) {
    return apiFetch<any>('/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateCustomer(id: string, data: import('@/types/crm').UpdateCustomerPayload) {
    return apiFetch<any>(`/customers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  deleteCustomer(id: string) {
    return apiFetch<any>(`/customers/${id}`, {
      method: 'DELETE',
    });
  },

  getInvoices(params: Record<string, any> = {}) {
    const qs = new URLSearchParams(params).toString();
    return apiFetch<any>(`/invoices${qs ? `?${qs}` : ''}`);
  },

  getInvoice(id: string) {
    return apiFetch<any>(`/invoices/${id}`);
  },

  createInvoice(data: any) {
    return apiFetch<any>('/invoices', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateInvoice(id: string, data: any) {
    return apiFetch<any>(`/invoices/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  updateInvoiceStatus(id: string, status: string) {
    return apiFetch<any>(`/invoices/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  deleteInvoice(id: string) {
    return apiFetch<any>(`/invoices/${id}`, {
      method: 'DELETE',
    });
  },

  getCompanyProfile() {
    return apiFetch<any>('/invoices/company-profile');
  },

  saveCompanyProfile(data: any) {
    return apiFetch<any>('/invoices/company-profile', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getUsers(params: Record<string, any> = {}) {
    const qs = new URLSearchParams(params).toString();
    return apiFetch<{ data: import('@/types/crm').TeamUserItem[]; meta: any }>(`/users${qs ? `?${qs}` : ''}`);
  },

  getUser(id: string) {
    return apiFetch<import('@/types/crm').TeamUserItem>(`/users/${id}`);
  },

  createUser(data: import('@/types/crm').CreateUserPayload) {
    return apiFetch<import('@/types/crm').TeamUserItem>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateUser(id: string, data: import('@/types/crm').UpdateUserPayload) {
    return apiFetch<import('@/types/crm').TeamUserItem>(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  deleteUser(id: string) {
    return apiFetch<{ success: boolean; message: string }>(`/users/${id}`, {
      method: 'DELETE',
    });
  },

  getRoles() {
    return apiFetch<import('@/types/crm').RoleItem[]>('/roles');
  },

  getHealth() {
    return apiFetch<import('@/types/crm').HealthCheckResult>('/health');
  },
};
