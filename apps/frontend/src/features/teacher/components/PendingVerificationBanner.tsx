import { ShieldAlert } from 'lucide-react';
import { towTokens as T } from '../../../design/tokens';

/**
 * Thin top banner shown while the teacher's profile is awaiting verification
 * (is_verified === false). Very dark background, #ffd166 border, subtle pulse
 * glow. Main label is bilingual; the helper text is Hebrew-only (body copy).
 */
export function PendingVerificationBanner() {
  return (
    <div
      role="status"
      className="tow-verify-pulse"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 16px',
        marginBottom: 16,
        borderRadius: T.radiusSm,
        border: `1px solid ${T.gold}`,
        background: '#0a1412',
        color: T.text,
      }}
    >
      <ShieldAlert size={18} style={{ color: T.gold, flexShrink: 0 }} />
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '2px 8px' }}>
        <span style={{ fontWeight: 800, fontSize: 14 }}>
          ממתין לאישור <span style={{ color: T.text3, fontWeight: 600 }}>(Pending Verification)</span>
        </span>
        <span style={{ fontSize: 12.5, color: T.text2 }}>
          הפרופיל שלך נשלח לבדיקת הצוות ויופעל לאחר אישור. המערכת זמינה לסיור והגדרות.
        </span>
      </div>
    </div>
  );
}
