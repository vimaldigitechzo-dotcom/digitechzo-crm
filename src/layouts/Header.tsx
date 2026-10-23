import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Search,
  LogOut,
  User as UserIcon,
  X,
  Briefcase,
  CheckSquare,
  Building2,
  Phone,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { crmApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface HeaderProps {
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [results, setResults] = useState<{
    leads: any[];
    deals: any[];
    tasks: any[];
  }>({ leads: [], deals: [], tasks: [] });

  const searchContainerRef = useRef<HTMLDivElement>(null);

  const initials = user ? `${user.firstName[0]}${user.lastName[0]}` : 'DA';

  // Handle outside clicks to close search dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search query execution across CRM modules
  useEffect(() => {
    const trimmed = searchValue.trim();
    if (!trimmed) {
      setResults({ leads: [], deals: [], tasks: [] });
      setIsDropdownOpen(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setIsDropdownOpen(true);

    const timer = setTimeout(async () => {
      try {
        const [leadsRes, dealsRes, tasksRes] = await Promise.all([
          crmApi.getLeads({ search: trimmed, limit: 4 }),
          crmApi.getDeals({ search: trimmed, limit: 4 }),
          crmApi.getTasks({ search: trimmed, limit: 4 }),
        ]);

        setResults({
          leads: leadsRes?.items || leadsRes?.data || [],
          deals: dealsRes?.items || dealsRes?.data || [],
          tasks: tasksRes?.items || tasksRes?.data || [],
        });
      } catch (err) {
        console.error('Global search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchValue]);

  // Navigate on Enter key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchValue.trim()) {
      setIsDropdownOpen(false);
      navigate(`/leads?search=${encodeURIComponent(searchValue.trim())}`);
    } else if (e.key === 'Escape') {
      setIsDropdownOpen(false);
    }
  };

  const hasAnyResults =
    results.leads.length > 0 ||
    results.deals.length > 0 ||
    results.tasks.length > 0;

  const renderDropdown = () => {
    if (!isDropdownOpen || !searchValue.trim()) return null;

    return (
      <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl shadow-xl border border-border z-50 overflow-hidden divide-y divide-border text-left animate-in fade-in-50 zoom-in-95 duration-100 max-h-[460px] overflow-y-auto">
        {/* Loading Indicator */}
        {isSearching && (
          <div className="p-4 flex items-center justify-center gap-2 text-xs text-txt-muted bg-slate-50/50">
            <Loader2 className="h-4 w-4 animate-spin text-[#16A34A]" />
            <span>Searching CRM for "{searchValue}"...</span>
          </div>
        )}

        {/* No Results */}
        {!isSearching && !hasAnyResults && (
          <div className="p-5 text-center">
            <p className="text-xs font-semibold text-txt-primary">No results found</p>
            <p className="text-[11px] text-txt-muted mt-1">
              No matching records found for "{searchValue}". Press Enter to search in Leads table.
            </p>
          </div>
        )}

        {/* 1. Leads Group */}
        {!isSearching && results.leads.length > 0 && (
          <div className="p-2 space-y-1">
            <div className="px-2 py-1 flex items-center justify-between text-[10px] font-bold text-txt-muted uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <UserIcon className="h-3 w-3 text-[#16A34A]" /> Leads ({results.leads.length})
              </span>
            </div>
            {results.leads.map((lead: any) => (
              <div
                key={lead.id}
                onClick={() => {
                  setIsDropdownOpen(false);
                  setSearchValue('');
                  navigate(`/leads/${lead.id}`);
                }}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors group"
              >
                <div className="min-w-0 pr-2">
                  <p className="text-xs font-bold text-txt-primary group-hover:text-[#16A34A] transition-colors truncate">
                    {lead.fullName}
                  </p>
                  <p className="text-[11px] text-txt-muted truncate flex items-center gap-2 mt-0.5">
                    {lead.companyName && (
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3 shrink-0" />
                        {lead.companyName}
                      </span>
                    )}
                    {lead.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3 shrink-0" />
                        {lead.phone}
                      </span>
                    )}
                  </p>
                </div>
                {lead.temperature && (
                  <span
                    className={`text-[9.5px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0 ${
                      lead.temperature === 'HOT'
                        ? 'bg-rose-50 text-rose-600 border border-rose-200'
                        : lead.temperature === 'WARM'
                        ? 'bg-amber-50 text-amber-600 border border-amber-200'
                        : 'bg-slate-50 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {lead.temperature}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 2. Deals Group */}
        {!isSearching && results.deals.length > 0 && (
          <div className="p-2 space-y-1">
            <div className="px-2 py-1 flex items-center justify-between text-[10px] font-bold text-txt-muted uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Briefcase className="h-3 w-3 text-blue-600" /> Pipeline Deals ({results.deals.length})
              </span>
            </div>
            {results.deals.map((deal: any) => (
              <div
                key={deal.id}
                onClick={() => {
                  setIsDropdownOpen(false);
                  setSearchValue('');
                  navigate('/pipeline');
                }}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors group"
              >
                <div className="min-w-0 pr-2">
                  <p className="text-xs font-bold text-txt-primary group-hover:text-blue-600 transition-colors truncate">
                    {deal.title}
                  </p>
                  <p className="text-[11px] text-txt-muted truncate mt-0.5">
                    Stage: {deal.stage?.name || deal.stageName || 'Open Stage'}
                  </p>
                </div>
                {deal.value > 0 && (
                  <span className="text-[11px] font-bold text-txt-primary tabular-nums shrink-0">
                    ₹{Number(deal.value).toLocaleString('en-IN')}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 3. Tasks Group */}
        {!isSearching && results.tasks.length > 0 && (
          <div className="p-2 space-y-1">
            <div className="px-2 py-1 flex items-center justify-between text-[10px] font-bold text-txt-muted uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <CheckSquare className="h-3 w-3 text-purple-600" /> Tasks ({results.tasks.length})
              </span>
            </div>
            {results.tasks.map((task: any) => (
              <div
                key={task.id}
                onClick={() => {
                  setIsDropdownOpen(false);
                  setSearchValue('');
                  navigate('/tasks');
                }}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors group"
              >
                <div className="min-w-0 pr-2">
                  <p className="text-xs font-bold text-txt-primary group-hover:text-purple-600 transition-colors truncate">
                    {task.title}
                  </p>
                  <p className="text-[11px] text-txt-muted truncate mt-0.5">
                    {task.status || 'PENDING'} • {task.lead?.fullName || task.leadName || 'General'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer: Quick Jump to Leads Filter */}
        <div
          onClick={() => {
            setIsDropdownOpen(false);
            navigate(`/leads?search=${encodeURIComponent(searchValue.trim())}`);
          }}
          className="p-2.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between cursor-pointer transition-colors text-xs font-medium text-txt-secondary border-t border-border"
        >
          <span>
            Press <strong className="text-txt-primary font-bold">Enter</strong> to view all in Leads
          </span>
          <ArrowRight className="h-3.5 w-3.5 text-txt-muted" />
        </div>
      </div>
    );
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-border bg-white px-2.5 sm:px-6 select-none shrink-0">
      {/* Mobile Search Active Overlay */}
      {mobileSearchOpen ? (
        <div ref={searchContainerRef} className="relative flex sm:hidden items-center gap-2 w-full">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-txt-muted" />
            <Input
              autoFocus
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search leads, deals, tasks..."
              className="pl-8 pr-7 h-8 text-xs bg-slate-50 border-border focus-visible:bg-white w-full"
            />
            {searchValue && (
              <button
                type="button"
                onClick={() => setSearchValue('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-txt-muted hover:text-txt-primary p-0.5 cursor-pointer"
                aria-label="Clear search text"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs text-txt-secondary cursor-pointer shrink-0"
            onClick={() => {
              setMobileSearchOpen(false);
              setIsDropdownOpen(false);
              setSearchValue('');
            }}
          >
            Cancel
          </Button>
          {renderDropdown()}
        </div>
      ) : (
        <>
          {/* Left: Mobile Branding vs Desktop Search */}
          <div className="flex items-center gap-2.5 flex-1 min-w-0 max-w-md">
            {/* Mobile Branding (< lg) */}
            <div className="flex lg:hidden items-center gap-2.5 shrink-0">
              <div className="h-9 w-9 flex items-center justify-center shrink-0">
                <img
                  src="/assets/images/logo.png"
                  alt="DigiTechzo Logo"
                  className="h-8 w-8 object-contain"
                />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-[15px] sm:text-base text-slate-900 tracking-tight leading-none">
                  DigiTechzo
                </span>
                <span className="text-[9.5px] font-black text-[#57B71B] tracking-wider uppercase leading-none mt-0.5">
                  CRM PLATFORM
                </span>
              </div>
            </div>

            {/* Desktop / Tablet Live Search Input (>= lg) */}
            <div
              ref={searchContainerRef}
              className="relative w-full max-w-sm hidden lg:flex items-center"
            >
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-txt-muted" />
                <Input
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onFocus={() => {
                    if (searchValue.trim()) setIsDropdownOpen(true);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Search leads, tasks, deals..."
                  className="pl-8 pr-7 h-8 text-xs bg-slate-50 border-border focus-visible:bg-white w-full rounded-lg transition-all focus:border-[#16A34A]"
                />
                {searchValue && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchValue('');
                      setIsDropdownOpen(false);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-txt-muted hover:text-txt-primary p-0.5 cursor-pointer"
                    aria-label="Clear search text"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              {renderDropdown()}
            </div>
          </div>

          {/* Right: Notifications & Profile Avatar */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Mobile Search Trigger Icon */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-txt-secondary h-9 w-9 hover:bg-slate-100 cursor-pointer"
              onClick={() => setMobileSearchOpen(true)}
              aria-label="Open search bar"
            >
              <Search className="h-4 w-4 text-slate-700" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="relative text-txt-secondary h-9 w-9 hover:bg-slate-100 cursor-pointer shrink-0"
              aria-label="Notifications (1 unread)"
            >
              <Bell className="h-5 w-5 text-slate-700" />
              <span className="absolute top-2 right-2 flex h-2 w-2 rounded-full bg-[#57B71B]" />
            </Button>

            <div className="h-4 w-px bg-border hidden lg:block" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-2 rounded-full focus:outline-none cursor-pointer shrink-0 p-0.5"
                  aria-label="Open user profile menu"
                >
                  <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-[#EAF7E3] text-[#57B71B] font-bold text-xs flex items-center justify-center border border-[#d6f0cb] shadow-2xs">
                    {initials}
                  </div>
                  <div className="hidden lg:flex flex-col text-left">
                    <span className="text-xs font-semibold text-txt-primary leading-none">
                      {user?.firstName} {user?.lastName}
                    </span>
                    <span className="text-[10px] text-txt-muted mt-0.5 leading-none">
                      {user?.role}
                    </span>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 max-w-[calc(100vw-2rem)]">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-0.5">
                    <p className="text-xs font-semibold text-txt-primary truncate">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-[11px] text-txt-muted truncate">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled className="text-xs">
                  <UserIcon className="mr-2 h-3.5 w-3.5 text-txt-muted" />
                  <span>Role: {user?.role || 'ADMIN'}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="text-xs text-destructive focus:text-destructive cursor-pointer"
                >
                  <LogOut className="mr-2 h-3.5 w-3.5" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </>
      )}
    </header>
  );
};
