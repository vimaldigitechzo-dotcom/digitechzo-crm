import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  ArrowRight,
  AlertCircle,
  Loader2,
  Lock,
  Mail,
  CheckCircle2,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loginBannerSuccess, setLoginBannerSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  React.useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('expired') === '1' || (location.state as any)?.reason === 'expired') {
      setError('Your session has expired. Please sign in again.');
    } else if ((location.state as any)?.message) {
      setError((location.state as any).message);
    }
  }, [location]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoginBannerSuccess(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setError('Please provide both email address and password');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(cleanEmail, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(
        err?.message || 'Authentication failed. Please verify your email and password.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUseAdminCredentials = () => {
    setEmail('admin@digitechzo.com');
    setPassword('AdminSecurePassword123!');
    setError(null);
    setLoginBannerSuccess(null);
  };

  return (
    <Card className="shadow-lg border-[#2D3238] bg-white">
      <CardHeader className="space-y-1 pb-3">
        <CardTitle className="text-base font-bold text-[#1E242B]">Welcome back</CardTitle>
        <p className="text-xs text-[#556070]">Sign in to access your CRM workspace</p>
      </CardHeader>

      <form onSubmit={handleLogin}>
        <CardContent className="space-y-3.5">
          {error && (
            <div className="p-3 rounded-btn bg-[#FEF2F2] border border-[#FECACA] flex items-start gap-2.5 text-xs text-[#DC2626]">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-[#DC2626]" />
              <div className="flex-1 font-medium leading-relaxed">{error}</div>
            </div>
          )}

          {loginBannerSuccess && (
            <div className="p-3 rounded-btn bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-800">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
              <div className="flex-1 font-medium leading-relaxed">{loginBannerSuccess}</div>
            </div>
          )}

          <div className="space-y-1">
            <label htmlFor="login-email" className="text-caption text-txt-secondary block font-medium">
              Email address
            </label>
            <div className="relative">
              <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-txt-muted" />
              <Input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@digitechzo.com"
                required
                autoComplete="email"
                disabled={isSubmitting}
                className="pl-8 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="login-password" className="text-caption text-txt-secondary block font-medium">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-txt-muted" />
              <Input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
                disabled={isSubmitting}
                className="pl-8 text-xs"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-1 bg-[#57B71B] hover:bg-[#469815] text-white font-medium transition-colors cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                Sign In <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </>
            )}
          </Button>

          {/* Quick Credential Helper for Functional Testing */}
          <div className="pt-3 border-t border-border">
            <div className="rounded-btn bg-slate-50 border border-border p-2.5 text-xs text-txt-secondary flex items-center justify-between">
              <div>
                <p className="font-semibold text-txt-primary text-[11px]">Seeded Admin Account</p>
                <p className="text-[10px] text-txt-muted font-mono">admin@digitechzo.com</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleUseAdminCredentials}
                disabled={isSubmitting}
                className="h-6 text-[10px] px-2 border-slate-300 hover:bg-slate-100 cursor-pointer"
              >
                Autofill
              </Button>
            </div>
          </div>
        </CardContent>
      </form>
    </Card>
  );
};
