import { towTokens as T } from '../../../design/tokens';

/**
 * Neon outline avatar — a circle with the student's first letter (no photos).
 * Shared by the Overview Active-Students tile and the Students CRM sidebar.
 */
export function OutlineAvatar({ name, size = 34 }: { name: string; size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: 999,
        border: `1.5px solid ${T.neon}`,
        color: T.neon,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: Math.round(size * 0.44),
        fontWeight: 800,
        fontFamily: T.fontMono,
      }}
    >
      {name.trim().charAt(0) || '?'}
    </span>
  );
}
