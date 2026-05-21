import type { ReactNode } from 'react';
import { Check } from 'lucide-react';
import { SB_ORANGE, SB_ORANGE_SOFT } from '../../content/teacherOnboardingContent';

interface SelectableCardProps {
  label: string;
  description?: string;
  icon?: ReactNode;
  selected: boolean;
  onClick: () => void;
  badge?: string;
  fullWidth?: boolean;
}

export function SelectableCard({
  label,
  description,
  icon,
  selected,
  onClick,
  badge,
  fullWidth = true,
}: SelectableCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="ob-card"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        width: fullWidth ? '100%' : 'auto',
        textAlign: 'right',
        padding: description ? '16px' : '14px 16px',
        borderRadius: 'var(--radius)',
        border: `2px solid ${selected ? SB_ORANGE : 'var(--line-2)'}`,
        background: selected
          ? SB_ORANGE_SOFT
          : 'linear-gradient(160deg, rgba(255,255,255,0.03), transparent)',
        color: 'var(--text)',
        cursor: 'pointer',
        position: 'relative',
        boxShadow: selected
          ? `4px 4px 0 rgba(249,115,22,0.28), 0 0 0 1px rgba(249,115,22,0.1) inset`
          : '3px 3px 0 rgba(0,0,0,0.32)',
      }}
    >
      {badge && (
        <span
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            fontSize: 10,
            fontWeight: 800,
            padding: '2px 7px',
            borderRadius: 999,
            background: SB_ORANGE,
            color: '#fff',
            letterSpacing: '0.03em',
          }}
        >
          {badge}
        </span>
      )}
      {icon && (
        <span
          style={{
            color: selected ? SB_ORANGE : 'var(--text-3)',
            flexShrink: 0,
            marginTop: 1,
            transition: 'color 0.15s ease',
          }}
        >
          {icon}
        </span>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 700,
            fontSize: 14,
            color: selected ? 'var(--text)' : 'var(--text)',
            lineHeight: 1.3,
            letterSpacing: '-0.01em',
          }}
        >
          {label}
        </div>
        {description && (
          <div
            style={{
              fontSize: 12,
              color: 'var(--text-2)',
              marginTop: 3,
              lineHeight: 1.5,
              fontWeight: 500,
            }}
          >
            {description}
          </div>
        )}
      </div>
      {selected && (
        <span
          className="ob-check-pop"
          style={{ color: SB_ORANGE, flexShrink: 0, marginTop: 1 }}
        >
          <Check size={16} />
        </span>
      )}
    </button>
  );
}
