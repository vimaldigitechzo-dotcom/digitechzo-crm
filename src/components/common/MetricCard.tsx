import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  subtextVariant?: 'danger' | 'warning' | 'success' | 'info' | 'neutral';
  icon?: LucideIcon;
  iconVariant?: 'danger' | 'warning' | 'success' | 'info' | 'neutral' | 'tech';
  onClick?: () => void;
  className?: string;
}

const iconVariantClasses: Record<NonNullable<MetricCardProps['iconVariant']>, { bg: string; text: string }> = {
  danger: { bg: 'bg-[#FEF2F2]', text: 'text-[#DC2626]' },
  warning: { bg: 'bg-[#FFFBEB]', text: 'text-[#D97706]' },
  success: { bg: 'bg-[#F0FDF4]', text: 'text-[#16A34A]' },
  info: { bg: 'bg-[#EFF6FF]', text: 'text-[#2563EB]' },
  tech: { bg: 'bg-[#F5F3FF]', text: 'text-[#7C3AED]' },
  neutral: { bg: 'bg-[#F1F5F9]', text: 'text-[#556070]' },
};

const subtextVariantClasses: Record<NonNullable<MetricCardProps['subtextVariant']>, string> = {
  danger: 'text-[#DC2626]',
  warning: 'text-[#D97706]',
  success: 'text-[#16A34A]',
  info: 'text-[#2563EB]',
  neutral: 'text-txt-secondary',
};

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subtext,
  subtextVariant = 'neutral',
  icon: Icon,
  iconVariant = 'neutral',
  onClick,
  className,
}) => {
  const iconColors = iconVariantClasses[iconVariant];

  return (
    <Card
      className={cn(
        "border-border transition-colors shadow-none select-none",
        onClick ? "cursor-pointer hover:border-slate-300 hover:shadow-subtle" : "",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-2.5 sm:p-4 flex items-center justify-between gap-1.5 sm:gap-2">
        <div className="space-y-0.5 min-w-0 flex-1">
          <p
            title={label}
            className="text-[10px] sm:text-[11px] font-semibold text-txt-muted uppercase tracking-tight leading-tight line-clamp-1 xs:line-clamp-2 break-words"
          >
            {label}
          </p>
          <div className="text-xl sm:text-2xl font-bold tracking-tight text-txt-primary tabular-nums leading-tight">
            {value}
          </div>
          {subtext && (
            <p
              title={subtext}
              className={cn("text-[10px] sm:text-[11px] font-medium leading-tight line-clamp-1 xs:line-clamp-2 break-words", subtextVariantClasses[subtextVariant])}
            >
              {subtext}
            </p>
          )}
        </div>
        {Icon && (
          <div className={cn("hidden min-[360px]:flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-btn shrink-0 ml-1.5 sm:ml-3", iconColors.bg, iconColors.text)}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
