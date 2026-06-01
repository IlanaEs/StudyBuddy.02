interface WizardProgressProps {
  current: number;
  total: number;
}

export function WizardProgress({ current, total }: WizardProgressProps) {
  return (
    <div className="mb-6" dir="ltr">
      <div
        className="flex justify-between mb-2 items-center"
        dir="rtl"
        style={{ color: 'var(--text-3)', fontSize: 12 }}
      >
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, letterSpacing: '0.02em' }}>
          {Math.round((current / total) * 100)}% הושלם
        </span>
        <span style={{ fontFamily: 'var(--font-mono)' }}>
          {current} / {total}
        </span>
      </div>

      <div className="flex gap-[3px]">
        {Array.from({ length: total }, (_, i) => {
          const seg = i + 1;
          const done = seg < current;
          const active = seg === current;
          return (
            <div
              key={seg}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 99,
                transition: 'background 0.4s ease, box-shadow 0.4s ease, opacity 0.4s ease',
                background: done || active ? 'var(--cyan)' : 'var(--line-2)',
                boxShadow: active
                  ? '0 0 10px 2px color-mix(in oklab, var(--cyan) 55%, transparent)'
                  : 'none',
                opacity: done ? 0.7 : active ? 1 : 0.35,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
