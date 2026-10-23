import React, { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  KanbanSquare,
  CheckSquare,
  Activity,
  Calendar,
  FileText,
  Briefcase,
  BarChart3,
  Users2,
  Settings,
  ChevronLeft,
  ChevronRight,
  Receipt,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useSidebarTheme, isColorDark } from '@/context/SidebarThemeContext';

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
}

const mainNavItems: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Leads', href: '/leads', icon: Users },
  { title: 'Pipeline', href: '/pipeline', icon: KanbanSquare },
  { title: 'Tasks', href: '/tasks', icon: CheckSquare },
  { title: 'Activities', href: '/activities', icon: Activity },
  { title: 'Meetings', href: '/meetings', icon: Calendar },
  { title: 'Proposals', href: '/proposals', icon: FileText },
  { title: 'In-Voice', href: '/invoices', icon: Receipt },
  { title: 'Customers', href: '/customers', icon: Briefcase },
  { title: 'Reports', href: '/reports', icon: BarChart3 },
];

const secondaryNavItems: NavItem[] = [
  { title: 'Team', href: '/team', icon: Users2 },
  { title: 'Settings', href: '/settings', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  isCollapsed,
  onToggleCollapse,
}) => {
  const { user } = useAuth();
  const { appliedTheme, isAppliedBgDark } = useSidebarTheme();
  const isAccentDark = isColorDark(appliedTheme.accentColor);
  const displayName = user?.name || (user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '') || 'Administrator';
  const displayInitial = (user?.firstName?.[0] || user?.name?.[0] || 'A').toUpperCase();

  // Close drawer on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Helper to render navigation items in collapsed or expanded view
  const renderNavItems = (collapsedMode: boolean, onClickItem?: () => void) => (
    <div className="flex-1 overflow-y-auto px-2 py-2.5 space-y-1">
      {mainNavItems.map((item) => {
        const Icon = item.icon;

        return (
          <NavLink
            key={item.href}
            to={item.href}
            onClick={onClickItem}
            title={collapsedMode ? item.title : undefined}
            style={({ isActive }) =>
              isActive
                ? {
                    backgroundColor: appliedTheme.accentColor,
                    color: isAccentDark ? '#FFFFFF' : '#1E242B',
                  }
                : { color: appliedTheme.textColor }
            }
            className={({ isActive }) =>
              cn(
                'flex items-center rounded-lg font-medium transition-colors',
                collapsedMode
                  ? 'justify-center h-10 w-10 mx-auto'
                  : 'justify-between px-3 py-2 text-xs sm:text-sm',
                isActive
                  ? 'font-semibold shadow-xs'
                  : isAppliedBgDark
                    ? 'hover:bg-white/10'
                    : 'hover:bg-black/5'
              )
            }
          >
            {({ isActive }) => (
              <div className={cn('flex items-center gap-3 min-w-0', collapsedMode && 'justify-center')}>
                <Icon
                  className="h-5 w-5 shrink-0"
                  style={{
                    color: isActive
                      ? isAccentDark
                        ? '#FFFFFF'
                        : '#1E242B'
                      : appliedTheme.textColor,
                  }}
                />
                {!collapsedMode && <span className="truncate">{item.title}</span>}
              </div>
            )}
          </NavLink>
        );
      })}

      <div className="pt-2 pb-1 px-2">
        <div
          className="h-px"
          style={{
            backgroundColor: isAppliedBgDark ? '#2D3238' : 'rgba(0,0,0,0.1)',
          }}
        />
      </div>

      {secondaryNavItems.map((item) => {
        const Icon = item.icon;

        return (
          <NavLink
            key={item.href}
            to={item.href}
            onClick={onClickItem}
            title={collapsedMode ? item.title : undefined}
            style={({ isActive }) =>
              isActive
                ? {
                    backgroundColor: appliedTheme.accentColor,
                    color: isAccentDark ? '#FFFFFF' : '#1E242B',
                  }
                : { color: appliedTheme.textColor }
            }
            className={({ isActive }) =>
              cn(
                'flex items-center rounded-lg font-medium transition-colors',
                collapsedMode
                  ? 'justify-center h-10 w-10 mx-auto'
                  : 'justify-between px-3 py-2 text-xs sm:text-sm',
                isActive
                  ? 'font-semibold shadow-xs'
                  : isAppliedBgDark
                    ? 'hover:bg-white/10'
                    : 'hover:bg-black/5'
              )
            }
          >
            {({ isActive }) => (
              <div className={cn('flex items-center gap-3 min-w-0', collapsedMode && 'justify-center')}>
                <Icon
                  className="h-5 w-5 shrink-0"
                  style={{
                    color: isActive
                      ? isAccentDark
                        ? '#FFFFFF'
                        : '#1E242B'
                      : appliedTheme.textColor,
                  }}
                />
                {!collapsedMode && <span className="truncate">{item.title}</span>}
              </div>
            )}
          </NavLink>
        );
      })}
    </div>
  );

  return (
    <>
      {/* ========================================================= */}
      {/* 1. MOBILE BACKDROP (Dark translucent overlay drawer)      */}
      {/* ========================================================= */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden backdrop-blur-xs transition-opacity duration-300"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* ========================================================= */}
      {/* 2. MOBILE EXPANDED OVERLAY DRAWER (256px wide)            */}
      {/* ========================================================= */}
      <aside
        style={{
          backgroundColor: appliedTheme.bgColor,
          color: appliedTheme.textColor,
          borderColor: isAppliedBgDark ? '#2D3238' : 'rgba(0,0,0,0.12)',
        }}
        className={cn(
          'lg:hidden fixed inset-y-0 left-0 w-64 h-[100dvh] flex flex-col border-r select-none z-50 shadow-2xl transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none'
        )}
        aria-label="Mobile Navigation"
      >
        {/* Mobile Expanded Header */}
        <div
          style={{ borderColor: isAppliedBgDark ? '#2D3238' : 'rgba(0,0,0,0.12)' }}
          className="flex h-16 sm:h-20 items-center justify-between px-4 border-b shrink-0"
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-white p-1.5 flex items-center justify-center shrink-0 shadow-xs">
              <img
                src="/assets/images/logo.png"
                alt="DigiTechzo"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <span
                style={{ color: appliedTheme.textColor }}
                className="font-extrabold text-sm sm:text-[15px] tracking-tight block leading-tight truncate"
              >
                DigiTechzo
              </span>
              <span
                style={{ color: appliedTheme.accentColor }}
                className="text-[10px] sm:text-[11px] font-bold tracking-wider block uppercase mt-0.5"
              >
                CRM Platform
              </span>
            </div>
          </div>

          {/* Left Arrow to Collapse Back */}
          <button
            onClick={onClose}
            style={{ color: appliedTheme.textColor }}
            className={cn(
              'h-7 w-7 flex items-center justify-center rounded-lg transition-colors cursor-pointer',
              isAppliedBgDark ? 'hover:bg-white/10' : 'hover:bg-black/10'
            )}
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation Items (Expanded) */}
        {renderNavItems(false, onClose)}

        {/* Administrator Profile Information Footer */}
        <div
          className="p-3 border-t shrink-0"
          style={{
            backgroundColor: isAppliedBgDark ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.03)',
            borderColor: isAppliedBgDark ? '#2D3238' : 'rgba(0,0,0,0.12)',
          }}
        >
          <div
            className="flex items-center justify-between px-3 py-2 rounded-lg border"
            style={{
              backgroundColor: isAppliedBgDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.7)',
              borderColor: isAppliedBgDark ? '#2D3238' : 'rgba(0,0,0,0.1)',
            }}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="h-8 w-8 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 border"
                style={{
                  backgroundColor: isAppliedBgDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                  color: appliedTheme.textColor,
                  borderColor: isAppliedBgDark ? '#2D3238' : 'rgba(0,0,0,0.1)',
                }}
              >
                {displayInitial}
              </div>
              <div className="min-w-0">
                <span
                  className="font-semibold text-xs block truncate leading-tight"
                  style={{ color: appliedTheme.textColor }}
                >
                  {displayName}
                </span>
                <span
                  className="text-[10px] block truncate mt-0.5 opacity-75"
                  style={{ color: appliedTheme.textColor }}
                  title={`${user?.role || 'ADMIN'} • ${user?.organization?.name || 'DigiTechzo Media & Technologies Pvt Ltd'}`}
                >
                  {user?.role || 'ADMIN'} &bull; {user?.organization?.name?.replace(/Media & Technologies Pvt Ltd/i, 'DigiTechzo') || 'DigiTechzo'}
                </span>
              </div>
            </div>
            <span
              className="h-2 w-2 rounded-full ml-2 shrink-0"
              style={{ backgroundColor: appliedTheme.accentColor }}
              title="Online"
            />
          </div>
        </div>
      </aside>

      {/* ========================================================= */}
      {/* 3. IN-FLOW PERSISTENT VERTICAL SIDEBAR (Desktop >= lg)   */}
      {/* ========================================================= */}
      <aside
        style={{
          backgroundColor: appliedTheme.bgColor,
          color: appliedTheme.textColor,
          borderColor: isAppliedBgDark ? '#2D3238' : 'rgba(0,0,0,0.12)',
        }}
        className={cn(
          'hidden lg:flex h-[100dvh] flex-col border-r select-none shrink-0 sticky top-0 transition-all duration-300 ease-in-out z-30',
          isCollapsed ? 'lg:w-[70px]' : 'lg:w-64'
        )}
      >
        {/* Brand Header */}
        <div
          style={{ borderColor: isAppliedBgDark ? '#2D3238' : 'rgba(0,0,0,0.12)' }}
          className={cn(
            'flex border-b shrink-0',
            // In collapsed mode (on mobile or desktop collapsed): vertical stack with logo & expand arrow
            isCollapsed
              ? 'flex-col items-center justify-center h-24 py-2 gap-2'
              : 'flex-col lg:flex-row items-center justify-center lg:justify-between h-24 lg:h-20 px-2 lg:px-4 py-2 lg:py-0 gap-2 lg:gap-0'
          )}
        >
          {/* Logo container: Always fully visible and unclipped */}
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="h-10 w-10 rounded-xl bg-white p-1.5 flex items-center justify-center shrink-0 shadow-xs">
              <img
                src="/assets/images/logo.png"
                alt="DigiTechzo"
                className="h-full w-full object-contain"
              />
            </div>

            {/* Desktop Brand Text (hidden when collapsed) */}
            <div className={cn('min-w-0 hidden', !isCollapsed && 'lg:block')}>
              <span
                style={{ color: appliedTheme.textColor }}
                className="font-extrabold text-[15px] tracking-tight block leading-tight truncate"
              >
                DigiTechzo
              </span>
              <span
                style={{ color: appliedTheme.accentColor }}
                className="text-[11px] font-bold tracking-wider block uppercase mt-0.5"
              >
                CRM Platform
              </span>
            </div>
          </div>

          {/* Expand/Collapse Arrows */}
          {/* Mobile Expand Arrow (< lg): Clear right-pointing arrow to expand sidebar into overlay */}
          <button
            onClick={onToggleCollapse}
            style={{ color: appliedTheme.textColor }}
            className={cn(
              'lg:hidden h-6 w-6 flex items-center justify-center rounded-md transition-colors cursor-pointer',
              isAppliedBgDark ? 'hover:bg-white/10' : 'hover:bg-black/10'
            )}
            title="Expand sidebar"
            aria-label="Expand sidebar"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          {/* Desktop Toggle Button (>= lg) */}
          <button
            onClick={onToggleCollapse}
            style={{ color: appliedTheme.textColor }}
            className={cn(
              'hidden lg:flex h-7 w-7 items-center justify-center rounded-lg transition-colors cursor-pointer',
              isAppliedBgDark ? 'hover:bg-white/10' : 'hover:bg-black/10'
            )}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Navigation Items (Responsive rendering: collapsed for mobile, dynamic for desktop) */}
        <div className="flex-1 overflow-y-auto px-2 py-2.5 space-y-1">
          {mainNavItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.href}
                to={item.href}
                title={item.title}
                style={({ isActive }) =>
                  isActive
                    ? {
                        backgroundColor: appliedTheme.accentColor,
                        color: isAccentDark ? '#FFFFFF' : '#1E242B',
                      }
                    : { color: appliedTheme.textColor }
                }
                className={({ isActive }) =>
                  cn(
                    'flex items-center rounded-lg font-medium transition-colors',
                    // Mobile is always compact 40x40 icon
                    'justify-center h-10 w-10 mx-auto',
                    // Desktop can expand
                    !isCollapsed && 'lg:justify-between lg:h-auto lg:w-full lg:px-3 lg:py-2 lg:text-sm',
                    isActive
                      ? 'font-semibold shadow-xs'
                      : isAppliedBgDark
                        ? 'hover:bg-white/10'
                        : 'hover:bg-black/5'
                  )
                }
              >
                {({ isActive }) => (
                  <div
                    className={cn(
                      'flex items-center gap-3 min-w-0 justify-center',
                      !isCollapsed && 'lg:justify-start'
                    )}
                  >
                    <Icon
                      className="h-5 w-5 shrink-0"
                      style={{
                        color: isActive
                          ? isAccentDark
                            ? '#FFFFFF'
                            : '#1E242B'
                          : appliedTheme.textColor,
                      }}
                    />
                    <span className={cn('truncate hidden', !isCollapsed && 'lg:inline')}>
                      {item.title}
                    </span>
                  </div>
                )}
              </NavLink>
            );
          })}

          <div className="pt-2 pb-1 px-2">
            <div
              className="h-px"
              style={{
                backgroundColor: isAppliedBgDark ? '#2D3238' : 'rgba(0,0,0,0.1)',
              }}
            />
          </div>

          {secondaryNavItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.href}
                to={item.href}
                title={item.title}
                style={({ isActive }) =>
                  isActive
                    ? {
                        backgroundColor: appliedTheme.accentColor,
                        color: isAccentDark ? '#FFFFFF' : '#1E242B',
                      }
                    : { color: appliedTheme.textColor }
                }
                className={({ isActive }) =>
                  cn(
                    'flex items-center rounded-lg font-medium transition-colors',
                    'justify-center h-10 w-10 mx-auto',
                    !isCollapsed && 'lg:justify-between lg:h-auto lg:w-full lg:px-3 lg:py-2 lg:text-sm',
                    isActive
                      ? 'font-semibold shadow-xs'
                      : isAppliedBgDark
                        ? 'hover:bg-white/10'
                        : 'hover:bg-black/5'
                  )
                }
              >
                {({ isActive }) => (
                  <div
                    className={cn(
                      'flex items-center gap-3 min-w-0 justify-center',
                      !isCollapsed && 'lg:justify-start'
                    )}
                  >
                    <Icon
                      className="h-5 w-5 shrink-0"
                      style={{
                        color: isActive
                          ? isAccentDark
                            ? '#FFFFFF'
                            : '#1E242B'
                          : appliedTheme.textColor,
                      }}
                    />
                    <span className={cn('truncate hidden', !isCollapsed && 'lg:inline')}>
                      {item.title}
                    </span>
                  </div>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Authenticated User Status Footer */}
        <div
          className="p-2 sm:p-3 border-t shrink-0"
          style={{
            backgroundColor: isAppliedBgDark ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.03)',
            borderColor: isAppliedBgDark ? '#2D3238' : 'rgba(0,0,0,0.12)',
          }}
        >
          {/* Compact avatar (Mobile + Desktop collapsed) */}
          <div
            className={cn(
              'flex h-10 w-10 mx-auto items-center justify-center rounded-lg font-bold text-xs border cursor-default',
              !isCollapsed && 'lg:hidden'
            )}
            style={{
              backgroundColor: isAppliedBgDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
              color: appliedTheme.textColor,
              borderColor: isAppliedBgDark ? '#2D3238' : 'rgba(0,0,0,0.1)',
            }}
            title={displayName}
          >
            {displayInitial}
          </div>

          {/* Expanded Card (Desktop only when not collapsed) */}
          <div
            className={cn(
              'hidden items-center justify-between px-3 py-2 rounded-lg border',
              !isCollapsed && 'lg:flex'
            )}
            style={{
              backgroundColor: isAppliedBgDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.7)',
              borderColor: isAppliedBgDark ? '#2D3238' : 'rgba(0,0,0,0.1)',
            }}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="h-8 w-8 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 border"
                style={{
                  backgroundColor: isAppliedBgDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                  color: appliedTheme.textColor,
                  borderColor: isAppliedBgDark ? '#2D3238' : 'rgba(0,0,0,0.1)',
                }}
              >
                {displayInitial}
              </div>
              <div className="min-w-0">
                <span
                  className="font-semibold text-xs block truncate leading-tight"
                  style={{ color: appliedTheme.textColor }}
                >
                  {displayName}
                </span>
                <span
                  className="text-[10px] block truncate mt-0.5 opacity-75"
                  style={{ color: appliedTheme.textColor }}
                  title={`${user?.role || 'ADMIN'} • ${user?.organization?.name || 'DigiTechzo Media & Technologies Pvt Ltd'}`}
                >
                  {user?.role || 'ADMIN'} &bull; {user?.organization?.name?.replace(/Media & Technologies Pvt Ltd/i, 'DigiTechzo') || 'DigiTechzo'}
                </span>
              </div>
            </div>
            <span
              className="h-2 w-2 rounded-full ml-2 shrink-0"
              style={{ backgroundColor: appliedTheme.accentColor }}
              title="Online"
            />
          </div>
        </div>
      </aside>
    </>
  );
};
