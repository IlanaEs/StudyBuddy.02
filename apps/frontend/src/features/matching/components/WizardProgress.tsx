interface WizardProgressProps {
  current: number;
  total: number;
}

export function WizardProgress({ current, total }: WizardProgressProps) {
  const pct = Math.round((current / total) * 100);
  return (
    <div className="mb-6">
      <div className="flex justify-between mb-1" style={{ color: 'var(--text-3)', fontSize: 13 }}>
        <span>שלב {current} מתוך {total}</span>
        <span>{pct}%</span>
      </div>
      <div style={{ background: 'var(--line-2)', borderRadius: 99, height: 6, overflow: 'hidden' }}>
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: 'var(--cyan)',
            borderRadius: 99,
            transition: 'width 0.3s ease',
          }}
        />
      </div>
    </div>
  );
}
