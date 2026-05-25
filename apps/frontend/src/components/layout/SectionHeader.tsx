import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type SectionHeaderProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function SectionHeader({ eyebrow, title, description, action, className }: SectionHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="flex min-w-0 flex-col gap-2">
        {eyebrow && <div className="text-sm font-medium text-muted-foreground">{eyebrow}</div>}
        <h2 className="text-2xl font-semibold leading-tight text-foreground sm:text-3xl">{title}</h2>
        {description && <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}
