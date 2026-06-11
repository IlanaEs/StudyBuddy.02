import { Menu } from '@mantine/core';
import { Check, ChevronDown, UserRound } from 'lucide-react';

import { useAuth } from './AuthProvider';
import type { UserRole } from './authTypes';
import { sbTokens as sb } from '../design/tokens';

// Bilingual account labels (Hebrew primary + English term), per the labeling rule.
const ROLE_LABEL: Record<UserRole, string> = {
  teacher: 'מורה (Teacher)',
  student: 'תלמיד (Student)',
  parent: 'הורה (Parent)',
  admin: 'מנהל (Admin)',
};

/**
 * Switches the active account for an identity that owns more than one (teacher /
 * student / parent). Wired into the shared navbar but renders NOTHING until a
 * second account exists, so single-account users (every user today) see no change;
 * it lights up automatically once account creation ships (Phase 3).
 */
export function AccountSwitcher() {
  const { accounts, activeAccount, switchAccount } = useAuth();

  if (accounts.length <= 1 || !activeAccount) {
    return null;
  }

  return (
    <Menu position="bottom-end" withinPortal shadow="md">
      <Menu.Target>
        <button
          type="button"
          className="sb-focusable sb-navbar-icon"
          aria-label="החלפת חשבון (Switch Account)"
          title="החלפת חשבון (Switch Account)"
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
              disabled={isActive}
              leftSection={isActive ? <Check size={14} /> : <span style={{ width: 14 }} />}
              onClick={() => {
                if (!isActive) void switchAccount(account.id);
              }}
            >
              {ROLE_LABEL[account.role]}
            </Menu.Item>
          );
        })}
      </Menu.Dropdown>
    </Menu>
  );
}
