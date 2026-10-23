import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthSession, UserRole } from '@/types/auth';
import { authApi, authStorage } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  session: AuthSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
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
  }, []);

  const login = async (email: string, password = '') => {
    const newSession = await authApi.login(email, password);
    setSession(newSession);
  };

  const logout = async () => {
    await authApi.logout();
    setSession(null);
  };

  const hasRole = (roles: UserRole[]): boolean => {
    if (!session?.user) return false;
    return roles.includes(session.user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        session,
        isAuthenticated: !!session?.user,
        isLoading,
        login,
        logout,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
