import type { ComponentType } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { BookOpen, GraduationCap, ShieldCheck, Users } from 'lucide-react';

import { useAuth } from '../auth/AuthProvider';
import type { Account, UserRole } from '../auth/authTypes';
import { getDashboardPathByRole } from '../utils/getDashboardPathByRole';
import { SessionLoadingScreen } from '../auth/SessionStatusScreens';
import { sbTokens as sb } from '../design/tokens';

type RoleMeta = { label: string; Icon: ComponentType<{ size?: number }> };

// Bilingual labels (Hebrew primary + English term) — these are core entities.
const ROLE_META: Record<UserRole, RoleMeta> = {
  teacher: { label: 'מורה (Teacher)', Icon: GraduationCap },
  student: { label: 'תלמיד (Student)', Icon: BookOpen },
  parent: { label: 'הורה (Parent)', Icon: Users },
  admin: { label: 'מנהל (Admin)', Icon: ShieldCheck },
};

/**
 * Post-login account picker (Netflix-profile style). Shown only when the same
 * Google login owns more than one SEPARATE account and the user has not yet chosen
 * one this session. Picking sets the active account and opens that dashboard.
 * A single-account identity never reaches here (auto-resolved → routed directly).
 */
export function AccountSelectionPage() {
  const auth = useAuth();
  const navigate = useNavigate();

  if (auth.status === 'loading') {
    return <SessionLoadingScreen label="Loading accounts..." />;
  }
  if (auth.status === 'unauthenticated') {
    return <Navigate replace to="/login" />;
  }
  // Nothing to choose (single account, or already chosen) → go to the dashboard.
  if (!auth.needsAccountSelection) {
    return <Navigate replace to={getDashboardPathByRole(auth.effectiveRole)} />;
  }

  async function choose(account: Account) {
    await auth.switchAccount(account.id);
    navigate(getDashboardPathByRole(account.role), { replace: true });
  }

  return (
    <div
      dir="rtl"
      lang="he"
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: sb.bgCanvas,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 560,
          padding: '40px 28px',
          borderRadius: 20,
          background: sb.glassBase,
          border: `1px solid ${sb.navbarBorder}`,
          textAlign: 'center',
          backdropFilter: 'blur(12px) saturate(140%)',
          WebkitBackdropFilter: 'blur(12px) saturate(140%)',
        }}
      >
        <h1
          style={{
            margin: '0 0 28px',
            fontSize: 'clamp(20px, 3.4vw, 26px)',
            fontWeight: 800,
            fontFamily: sb.fontUi,
            color: sb.textPrimary,
          }}
        >
          באיזה חשבון תרצו להשתמש? (Which account would you like to use?)
        </h1>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, justifyContent: 'center' }}>
          {auth.accounts.map((account) => {
            const meta = ROLE_META[account.role];
            const isActive = account.id === auth.activeAccount?.id;
            return (
              <button
                key={account.id}
                type="button"
                onClick={() => void choose(account)}
                className="sb-focusable account-pick"
                aria-label={meta.label}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 12,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 4,
                }}
              >
                <span
                  className="account-pick-circle"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 104,
                    height: 104,
                    borderRadius: 999,
                    background: 'color-mix(in oklab, var(--sb-active) 12%, transparent)',
                    border: `2px solid ${isActive ? sb.active : sb.navbarBorder}`,
                    color: sb.active,
                  }}
                >
                  <meta.Icon size={40} />
                </span>
                <span style={{ fontSize: 14, fontWeight: 700, fontFamily: sb.fontUi, color: sb.textPrimary }}>
                  {meta.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
