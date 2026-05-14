import type { PropsWithChildren } from 'react';

export function AppShell({ children }: PropsWithChildren) {
  return (
    <main className="min-h-dvh bg-studybuddy-teal text-white">
      <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-6 py-8">
        <header className="flex items-center justify-between border-b border-white/10 pb-5">
          <span className="font-display text-xl font-semibold">StudyBuddy.02</span>
          <span className="rounded-full border border-studybuddy-turquoise/40 px-3 py-1 text-xs text-studybuddy-turquoise">
            foundation
          </span>
        </header>
        <section className="flex flex-1 items-center py-12">{children}</section>
      </div>
    </main>
  );
}
