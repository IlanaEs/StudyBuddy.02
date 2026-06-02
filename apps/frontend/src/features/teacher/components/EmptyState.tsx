import type { ReactNode } from 'react';
import { towTokens as T } from '../../../design/tokens';

/**
 * Empty-state filler for placeholder tiles. The message is Hebrew-only body copy
 * (no English term — not an in-scope label).
 */
export function EmptyState({ icon, message }: { icon: ReactNode; message: string }) {
  return (
    <div
      style={{
        flex: 1,
        minHeight: 96,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        textAlign: 'center',
        color: T.text3,
      }}
    >
      <span style={{ opacity: 0.7 }}>{icon}</span>
      <span style={{ fontSize: 13 }}>{message}</span>
    </div>
  );
}
