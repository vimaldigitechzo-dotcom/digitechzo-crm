import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface PageHeaderProps {
  title: string;
  description?: string;
  count?: number | string;
  badge?: string;
  badgeVariant?: 'success' | 'warning' | 'danger' | 'info' | 'tech' | 'neutral' | 'brand';
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  count,
  badge,
  badgeVariant = 'brand',
  actions,
  className,
}) => {
  return (
    <div className={cn("flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between pb-3.5 border-b border-border select-none", className)}>
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-page-title text-txt-primary">{title}</h1>
          {count !== undefined && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-badge text-[11px] font-semibold bg-slate-100 text-txt-secondary border border-border tabular-nums">
              {count}
            </span>
          )}
          {badge && (
            <Badge variant={badgeVariant}>
              {badge}
            </Badge>
          )}
        </div>
        {description && (
          <p className="text-xs text-txt-muted max-w-xl">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
};
