import { useState } from 'react';
import type { ReactNode } from 'react';
import { Check } from 'lucide-react';

interface WizardOptionCardProps {
  label: string;
  description?: string;
  icon?: ReactNode;
  selected?: boolean;
  onClick: () => void;
}

export function WizardOptionCard({ label, description, icon, selected, onClick }: WizardOptionCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-full text-right p-4 mb-3 flex items-start gap-3"
      style={{
        background: selected
          ? 'color-mix(in oklab, var(--cyan) 14%, var(--surface-2))'
          : hovered
            ? 'color-mix(in oklab, var(--cyan) 6%, var(--surface-2))'
            : 'var(--surface-2)',
        border: `2px solid ${
          selected
            ? 'var(--cyan)'
            : hovered
              ? 'color-mix(in oklab, var(--cyan) 40%, var(--line-2))'
              : 'var(--line-2)'
        }`,
        borderRadius: 'var(--radius)',
        cursor: 'pointer',
        color: 'var(--text)',
        transition: 'background 0.18s ease, border-color 0.18s ease, transform 0.14s ease, box-shadow 0.18s ease',
        transform: hovered && !selected ? 'translateY(-1px)' : 'none',
        boxShadow: selected
          ? '0 0 0 1px color-mix(in oklab, var(--cyan) 22%, transparent), inset 0 1px 0 rgba(220,245,240,0.06)'
          : hovered
            ? '0 4px 16px -4px rgba(0,0,0,0.3)'
            : 'none',
      }}
    >
      {icon && (
        <span
          className="flex-shrink-0 mt-0.5"
          style={{
            color: selected ? 'var(--cyan)' : hovered ? 'color-mix(in oklab, var(--cyan) 70%, var(--text-3))' : 'var(--text-3)',
            transition: 'color 0.18s ease',
          }}
        >
          {icon}
        </span>
      )}
      <div className="flex-1">
        <div className="font-semibold" style={{ fontSize: 16, color: 'var(--text)' }}>{label}</div>
        {description && (
          <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>{description}</div>
        )}
      </div>
      {selected && (
        <span className="flex-shrink-0 mt-0.5" style={{ color: 'var(--cyan)' }}>
          <Check size={18} />
        </span>
      )}
    </button>
  );
}
