import React, { useState } from 'react';
import { Bell, Search, LogOut, User as UserIcon, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
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
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const initials = user
    ? `${user.firstName[0]}${user.lastName[0]}`
    : 'DA';

  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-border bg-white px-2.5 sm:px-6 select-none shrink-0">
      {/* Mobile Search Active Overlay */}
      {mobileSearchOpen ? (
        <div className="flex sm:hidden items-center gap-2 w-full">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-txt-muted" />
            <Input
              autoFocus
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
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
            onClick={() => setMobileSearchOpen(false)}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <>
          {/* Left: Mobile Branding (Matching Screenshot) vs Desktop Search */}
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

            {/* Desktop / Tablet Search Input (>= lg) */}
            <div className="relative w-full max-w-xs hidden lg:flex items-center">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-txt-muted" />
                <Input
                  placeholder="Search leads, tasks, deals..."
                  className="pl-8 h-8 text-xs bg-slate-50 border-border focus-visible:bg-white w-full"
                />
              </div>
            </div>
          </div>

          {/* Right: Notifications & Profile Avatar */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
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
