import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu } from '@mantine/core';
import { Check, ChevronDown, Plus, UserRound } from 'lucide-react';

import { useAuth } from './AuthProvider';
import { multiAccountEnabled } from './activeAccount';
import type { UserRole } from './authTypes';
import { createAccount, type CreatableRole } from '../api/accounts';
import { useMatchingStore } from '../features/matching/store/matchingStore';
import { sbTokens as sb } from '../design/tokens';

// Bilingual account labels (Hebrew primary + English term), per the labeling rule.
const ROLE_LABEL: Record<UserRole, string> = {
  teacher: 'מורה (Teacher)',
  student: 'תלמיד (Student)',
  parent: 'הורה (Parent)',
  admin: 'מנהל (Admin)',
};

const CREATABLE_ROLES: CreatableRole[] = ['teacher', 'student', 'parent'];

/**
 * Switches the active account and (when the multi-account flag is on) creates
 * additional accounts for the same Google login. Renders nothing when the flag
 * is off and the identity has a single account — so existing users see no change.
 *
 * Creating an account always enters that role's onboarding FROM THE BEGINNING:
 * we switch to the freshly-created account (its role becomes authoritative), reset
 * the matching wizard store, and route into the role's onboarding entry point. No
 * OAuth/signup round-trip occurs, so the signup flow's isNewUser→dashboard redirect
 * never fires and another account's completion is never reused.
 */
export function AccountSwitcher() {
  const { accounts, activeAccount, switchAccount, session } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCreate = multiAccountEnabled;
  if (!activeAccount || (accounts.length <= 1 && !canCreate)) {
    return null;
  }

  const existingRoles = new Set(accounts.map((a) => a.role));
  const creatableRoles = canCreate ? CREATABLE_ROLES.filter((r) => !existingRoles.has(r)) : [];

  async function handleCreate(role: CreatableRole) {
    if (busy || !session?.access_token) return;
    setBusy(true);
    setError(null);
    try {
      const res = await createAccount(role, session.access_token);
      if ('error' in res) {
        setError(res.status === 403 ? 'יצירת חשבון נוסף אינה זמינה כעת.' : res.error);
        return;
      }
      // Make the new account active first, so its role is authoritative downstream.
      await switchAccount(res.data.id);

      if (role === 'teacher') {
        navigate('/teacher-onboarding');
        return;
      }
      // Student / parent: prime the matching wizard from scratch for this account.
      const store = useMatchingStore.getState();
      store.reset();
      store.updateIntake({ accountType: role === 'parent' ? 'parent_for_child' : 'independent_student' });
      store.setStep(1);
      navigate('/onboarding/matching');
    } catch {
      setError('שגיאה ביצירת החשבון. נסו שוב.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Menu position="bottom-end" withinPortal shadow="md" closeOnItemClick={false}>
      <Menu.Target>
        <button
          type="button"
          className="sb-focusable sb-navbar-icon"
          aria-label="חשבונות (Accounts)"
          title="חשבונות (Accounts)"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            height: 38,
            padding: '0 10px',
            borderRadius: 999,
            background: 'transparent',
            border: `1px solid ${sb.navbarBorder}`,
            color: sb.textSecondary,
            fontFamily: sb.fontUi,
            fontWeight: 700,
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          <UserRound size={16} />
          <span>{ROLE_LABEL[activeAccount.role]}</span>
          <ChevronDown size={14} />
        </button>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>החשבונות שלי (My Accounts)</Menu.Label>
        {accounts.map((account) => {
          const isActive = account.id === activeAccount.id;
          return (
            <Menu.Item
              key={account.id}
              disabled={isActive || busy}
              leftSection={isActive ? <Check size={14} /> : <span style={{ width: 14 }} />}
              onClick={() => {
                if (!isActive) void switchAccount(account.id);
              }}
            >
              {ROLE_LABEL[account.role]}
            </Menu.Item>
          );
        })}

        {creatableRoles.length > 0 && (
          <>
            <Menu.Divider />
            <Menu.Label>הוספת חשבון (Add Account)</Menu.Label>
            {creatableRoles.map((role) => (
              <Menu.Item
                key={role}
                disabled={busy}
                leftSection={<Plus size={14} />}
                onClick={() => void handleCreate(role)}
              >
                {ROLE_LABEL[role]}
              </Menu.Item>
            ))}
          </>
        )}

        {error && (
          <Menu.Label style={{ color: sb.error }}>{error}</Menu.Label>
        )}
      </Menu.Dropdown>
    </Menu>
  );
}
