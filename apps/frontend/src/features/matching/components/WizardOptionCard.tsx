interface WizardOptionCardProps {
  label: string;
  description?: string;
  emoji?: string;
  selected?: boolean;
  onClick: () => void;
}

export function WizardOptionCard({ label, description, emoji, selected, onClick }: WizardOptionCardProps) {
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
      {emoji && <span className="text-2xl flex-shrink-0">{emoji}</span>}
      <div>
        <div className="font-semibold" style={{ fontSize: 16, color: 'var(--text)' }}>{label}</div>
        {description && <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>{description}</div>}
      </div>
      {selected && <span className="mr-auto flex-shrink-0" style={{ color: 'var(--cyan)', fontSize: 20 }}>✓</span>}
    </button>
  );
}
