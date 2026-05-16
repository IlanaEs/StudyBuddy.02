interface WizardSummaryCardProps {
  items: { label: string; value: string }[];
  onEdit?: () => void;
}

export function WizardSummaryCard({ items, onEdit }: WizardSummaryCardProps) {
  return (
    <div
      className="rounded-xl p-4 mb-4"
      style={{ background: 'var(--surface-2)', border: '1px solid var(--line-2)' }}
    >
      {items.map((item) => (
        <div key={item.label} className="flex justify-between py-1" style={{ borderBottom: '1px solid var(--line)', fontSize: 14 }}>
          <span style={{ color: 'var(--text-3)' }}>{item.label}</span>
          <span style={{ color: 'var(--text)', fontWeight: 600 }}>{item.value}</span>
        </div>
      ))}
      {onEdit && (
        <button
          onClick={onEdit}
          className="mt-3 text-sm"
          style={{ color: 'var(--cyan)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          ✏️ ערוך
        </button>
      )}
    </div>
  );
}
