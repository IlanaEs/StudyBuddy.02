import type { CSSProperties } from 'react';
import { towTokens as T } from '../../../../design/tokens';

// Shared glassmorphism surface — matches the T3 ledger card so the CRM panels
// read as the same system.
export const glassSurface: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  borderRadius: T.radius,
  border: `1px solid ${T.ink}`,
  background: 'color-mix(in oklab, #3f7e76 55%, transparent)',
  backdropFilter: 'blur(12px) saturate(140%)',
  WebkitBackdropFilter: 'blur(12px) saturate(140%)',
  boxShadow: '0 8px 28px -18px rgba(0,0,0,0.55)',
  overflow: 'hidden',
};
