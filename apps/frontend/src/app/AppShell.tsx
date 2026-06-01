import type { PropsWithChildren } from 'react';

import { SessionControls } from '../auth/SessionControls';
import { useAuth } from '../auth/AuthProvider';

function AdminQaBanner() {
  const auth = useAuth();
  if (!auth.qaRole) return null;

  return (
    <div
      style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200 }}
      className="flex items-center justify-between gap-4 bg-amber-500 px-4 py-2 text-sm font-semibold text-black"
    >
      <span>⚠ Admin QA Mode: acting as {auth.qaRole}</span>
      <button
        type="button"
        onClick={() => auth.setQaRole(null)}
        className="rounded border border-black/20 bg-black/10 px-3 py-1 text-xs font-bold hover:bg-black/20"
      >
        Exit QA Mode
      </button>
    </div>
  );
}

export function AppShell({ children }: PropsWithChildren) {
  return (
    <>
      <AdminQaBanner />
      <SessionControls />
      {children}
    </>
  );
}
