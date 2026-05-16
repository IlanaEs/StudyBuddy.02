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
  return (
    <button
      onClick={onClick}
      className="w-full text-right p-4 mb-3 flex items-start gap-3 transition-all duration-150"
      style={{
        background: selected ? 'color-mix(in oklab, var(--cyan) 15%, var(--surface-2))' : 'var(--surface-2)',
        border: `2px solid ${selected ? 'var(--cyan)' : 'var(--line-2)'}`,
        borderRadius: 'var(--radius)',
        cursor: 'pointer',
        color: 'var(--text)',
      }}
    >
      {icon && (
        <span className="flex-shrink-0 mt-0.5" style={{ color: selected ? 'var(--cyan)' : 'var(--text-3)' }}>
          {icon}
        </span>
      )}
      <div className="flex-1">
        <div className="font-semibold" style={{ fontSize: 16, color: 'var(--text)' }}>{label}</div>
        {description && <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>{description}</div>}
      </div>
      {selected && (
        <span className="flex-shrink-0 mt-0.5" style={{ color: 'var(--cyan)' }}>
          <Check size={18} />
        </span>
      )}
    </button>
  );
}
