const fs = require('fs');
const path = require('path');

// 1. Update src/lib/api.ts
const apiPath = path.resolve('src/lib/api.ts');
let apiContent = fs.readFileSync(apiPath, 'utf8');

// Replace the 401 handling block in apiFetch
const old401Block = `  // Handle 401 Unauthorized with token refresh (avoid infinite loops on auth endpoints)
  if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
    if (!isRefreshing && session?.refreshToken) {
      isRefreshing = true;
      try {
        const refreshRes = await fetch(\`\${API_BASE_URL}/auth/refresh\`, {
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
          headers.set('Authorization', \`Bearer \${newAccessToken}\`);
          const retryRes = await fetch(url, { ...options, headers });
          return handleResponse<T>(retryRes);
        } else {
          isRefreshing = false;
          throw new ApiError(401, 'Session refresh failed.');
        }
      } catch (err) {
        isRefreshing = false;
        throw err;
      }
    } else if (isRefreshing) {
      // Queue requests until refresh completes
      return new Promise<T>((resolve) => {
        subscribeTokenRefresh(async (newToken) => {
          headers.set('Authorization', \`Bearer \${newToken}\`);
          const retryRes = await fetch(url, { ...options, headers });
          resolve(handleResponse<T>(retryRes));
        });
      });
    } else {
      throw new ApiError(401, 'Endpoint requires authorization');
    }
  }`;

const new401Block = `  // Handle 401 Unauthorized with token refresh (avoid infinite loops on auth endpoints)
  if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
    const isMockToken = typeof session?.accessToken === 'string' && session.accessToken.startsWith('mock-');
    if (!isMockToken && !isRefreshing && session?.refreshToken && !session.refreshToken.startsWith('mock-')) {
      isRefreshing = true;
      try {
        const refreshRes = await fetch(\`\${API_BASE_URL}/auth/refresh\`, {
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
          headers.set('Authorization', \`Bearer \${newAccessToken}\`);
          const retryRes = await fetch(url, { ...options, headers });
          return handleResponse<T>(retryRes);
        } else {
          isRefreshing = false;
          authStorage.clearSession();
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('auth:expired', { detail: { reason: 'refresh_failed' } }));
          }
          throw new ApiError(401, 'Your session has expired. Please sign in again.');
        }
      } catch (err) {
        isRefreshing = false;
        authStorage.clearSession();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth:expired', { detail: { reason: 'refresh_error' } }));
        }
        throw new ApiError(401, 'Your session has expired. Please sign in again.');
      }
    } else if (!isMockToken && isRefreshing) {
      // Queue requests until refresh completes
      return new Promise<T>((resolve) => {
        subscribeTokenRefresh(async (newToken) => {
          headers.set('Authorization', \`Bearer \${newToken}\`);
          const retryRes = await fetch(url, { ...options, headers });
          resolve(handleResponse<T>(retryRes));
        });
      });
    } else {
      authStorage.clearSession();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:expired', { detail: { reason: 'unauthorized' } }));
      }
      throw new ApiError(401, 'Your session has expired. Please sign in again.');
    }
  }`;

// Replace authApi.login catch block
const oldLoginBlock = `  async login(email: string, password: string): Promise<AuthSession> {
    try {
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
    } catch (err: any) {
      // If backend is unreachable or returns 500, provide a valid local authenticated session
      console.warn('Backend login unavailable, creating local session for:', email);
      const nameParts = email.split('@')[0].split('.');
      const firstName = nameParts[0] || 'Vimal';
      const lastName = nameParts[1] || 'Tester';
      const user: User = {
        id: 'user-' + Date.now(),
        email: email,
        name: \`\${firstName} \${lastName}\`.trim(),
        firstName,
        lastName,
        role: 'ADMIN',
        permissions: ['*'],
        organization: 'DigiTechzo',
      };

      const session: AuthSession = {
        user,
        accessToken: 'mock-jwt-token-' + Date.now(),
        refreshToken: 'mock-refresh-token-' + Date.now(),
        expiresAt: new Date(Date.now() + 86400000 * 30).toISOString(),
      };

      authStorage.setSession(session);
      return session;
    }
  },`;

const newLoginBlock = `  async login(email: string, password: string): Promise<AuthSession> {
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
  },`;

// Normalize CRLF to LF for reliable replace
apiContent = apiContent.replace(/\r\n/g, '\n');
if (apiContent.includes(old401Block.replace(/\r\n/g, '\n'))) {
  apiContent = apiContent.replace(old401Block.replace(/\r\n/g, '\n'), new401Block);
  console.log('Updated 401 handling in api.ts');
} else {
  console.error('Could not find old401Block in api.ts');
}

if (apiContent.includes(oldLoginBlock.replace(/\r\n/g, '\n'))) {
  apiContent = apiContent.replace(oldLoginBlock.replace(/\r\n/g, '\n'), newLoginBlock);
  console.log('Updated login block in api.ts');
} else {
  console.error('Could not find oldLoginBlock in api.ts');
}

fs.writeFileSync(apiPath, apiContent, 'utf8');

// 2. Update src/hooks/useAuth.tsx
const useAuthPath = path.resolve('src/hooks/useAuth.tsx');
let authContent = fs.readFileSync(useAuthPath, 'utf8').replace(/\r\n/g, '\n');

const oldUseAuthInit = `  useEffect(() => {
    // Check localStorage for existing valid session on startup
    const existing = authStorage.getSession();
    if (existing && existing.user && existing.accessToken) {
      // Check if access token is expired
      const isExpired = existing.expiresAt
        ? new Date(existing.expiresAt).getTime() < Date.now()
        : false;

      if (!isExpired) {
        setSession(existing);
      } else if (existing.refreshToken) {
        // Token expired but refreshToken exists; apiFetch will refresh on demand
        setSession(existing);
      } else {
        authStorage.clearSession();
        setSession(null);
      }
    } else {
      setSession(null);
    }
    setIsLoading(false);
  }, []);`;

const newUseAuthInit = `  useEffect(() => {
    // Check localStorage for existing valid session on startup
    const existing = authStorage.getSession();
    if (existing && existing.user && existing.accessToken) {
      const isMockToken = typeof existing.accessToken === 'string' && existing.accessToken.startsWith('mock-');
      const isExpired = existing.expiresAt
        ? new Date(existing.expiresAt).getTime() < Date.now()
        : false;

      if (isMockToken) {
        authStorage.clearSession();
        setSession(null);
      } else if (!isExpired) {
        setSession(existing);
      } else if (existing.refreshToken && !existing.refreshToken.startsWith('mock-')) {
        // Token expired but refreshToken exists; apiFetch will refresh on demand
        setSession(existing);
      } else {
        authStorage.clearSession();
        setSession(null);
      }
    } else {
      setSession(null);
    }
    setIsLoading(false);

    // Auto log-out when session expires on any background API request
    const handleAuthExpired = () => {
      setSession(null);
    };
    window.addEventListener('auth:expired', handleAuthExpired);
    return () => window.removeEventListener('auth:expired', handleAuthExpired);
  }, []);`;

if (authContent.includes(oldUseAuthInit)) {
  authContent = authContent.replace(oldUseAuthInit, newUseAuthInit);
  console.log('Updated useAuth.tsx');
} else {
  console.error('Could not find oldUseAuthInit in useAuth.tsx');
}

fs.writeFileSync(useAuthPath, authContent, 'utf8');
