import type { PropsWithChildren } from 'react';

import { SessionControls } from '../auth/SessionControls';

export function AppShell({ children }: PropsWithChildren) {
  return (
    <>
      <SessionControls />
      {children}
    </>
  );
}
