import { GraduationCap, Presentation, ShieldCheck, ShieldAlert } from 'lucide-react';
import { sbTokens as sb } from '../design/tokens';

export type Role = 'student' | 'teacher' | 'parent' | 'admin';

// Secondary, micro-accent only — badges MUST NOT redefine the product palette.
// Role tints are kept as faint rgba washes, not new brand colors.
const ROLE = {
  student: { label: 'תלמיד/ה (Student)', tint: 'rgba(76, 231, 227, 0.16)', fg: sb.active, Icon: GraduationCap },
  teacher: { label: 'מורה (Teacher)', tint: 'rgba(129, 140, 248, 0.18)', fg: 'rgba(199, 210, 254, 1)', Icon: Presentation },
  parent: { label: 'הורה (Parent)', tint: 'rgba(132, 204, 22, 0.16)', fg: sb.success, Icon: ShieldCheck },
  admin: { label: 'מנהל (Admin)', tint: 'rgba(252, 109, 23, 0.16)', fg: sb.warning, Icon: ShieldAlert },
} as const;

/** Small role badge near the avatar/name. Secondary identity only. */
export function RoleBadge({ role }: { role: Role }) {
  const { label, tint, fg, Icon } = ROLE[role];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '3px 10px',
        borderRadius: sb.radiusSmall,
        background: tint,
        color: fg,
        fontFamily: sb.fontUi,
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      <Icon size={13} />
      {label}
    </span>
  );
}
