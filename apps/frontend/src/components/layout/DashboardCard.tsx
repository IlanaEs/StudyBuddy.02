import type { PropsWithChildren } from 'react';

type DashboardCardProps = PropsWithChildren<{
  className?: string;
}>;

export function DashboardCard({ children, className = '' }: DashboardCardProps) {
  return (
    <section
      className={`w-full max-w-full min-w-0 rounded-[1.75rem] border border-white/80 bg-white/90 p-5 shadow-[0_20px_60px_-32px_rgba(15,69,68,0.35)] ring-1 ring-slate-200/50 backdrop-blur md:p-6 ${className}`}
    >
      {children}
    </section>
  );
}
