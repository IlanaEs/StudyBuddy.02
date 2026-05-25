import type { ReactNode } from 'react';

type DashboardPageShellProps = {
  greeting: ReactNode;
  brandLabel?: string;
  children: ReactNode;
};

export function DashboardPageShell({ greeting, brandLabel = 'StudyBuddy', children }: DashboardPageShellProps) {
  return (
    <main
      className="min-h-screen overflow-x-hidden bg-[#f4f6f8] px-4 py-6 text-slate-950 sm:px-6 lg:px-8 lg:py-10"
      dir="rtl"
      lang="he"
    >
      <div className="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-6">
        <header className="flex w-full max-w-full min-w-0 flex-col gap-2 rounded-[2rem] border border-white/80 bg-white/70 px-5 py-5 shadow-[0_20px_60px_-40px_rgba(15,69,68,0.3)] backdrop-blur md:px-7">
          <p className="text-sm font-black text-[#175655]">{brandLabel}</p>
          <h1 className="max-w-3xl text-2xl font-black leading-tight text-slate-950 md:text-4xl">{greeting}</h1>
        </header>

        {children}
      </div>
    </main>
  );
}
