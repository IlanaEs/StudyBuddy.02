import { Check } from 'lucide-react';
import { SB_ORANGE, SB_ORANGE_SOFT } from '../../content/teacherOnboardingContent';

interface SelectableChipProps {
  label: string;
  selected: boolean;
  onClick: () => void;
  small?: boolean;
}

export function SelectableChip({ label, selected, onClick, small = false }: SelectableChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="ob-chip"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: small ? '6px 12px' : '9px 16px',
        borderRadius: 999,
        border: `2px solid ${selected ? SB_ORANGE : 'var(--line-2)'}`,
        background: selected ? SB_ORANGE_SOFT : 'transparent',
        color: selected ? SB_ORANGE : 'var(--text-2)',
        fontSize: small ? 13 : 14,
        fontWeight: selected ? 700 : 600,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        letterSpacing: selected ? '-0.01em' : '0',
      }}
    >
      {selected && (
        <Check size={small ? 11 : 13} style={{ flexShrink: 0 }} />
      )}
      {label}
    </button>
  );
}
