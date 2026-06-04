import { towTokens as T } from '../../../../design/tokens';

/**
 * Pill segmented control with a sliding neon highlight behind the active option.
 * Predefined options only (no free text). RTL-correct via logical inset.
 */
export function SegmentedControl<V extends string | number>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: { value: V; label: string }[];
  value: V;
  onChange: (value: V) => void;
  ariaLabel?: string;
}) {
  const count = options.length;
  const activeIndex = Math.max(0, options.findIndex((o) => o.value === value));

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      style={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: `repeat(${count}, 1fr)`,
        padding: 4,
        borderRadius: 999,
        background: T.card2,
        border: `1px solid ${T.line2}`,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 4,
          bottom: 4,
          insetInlineStart: `calc(${activeIndex} * ((100% - 8px) / ${count}) + 4px)`,
          width: `calc((100% - 8px) / ${count})`,
          borderRadius: 999,
          background: 'color-mix(in oklab, #00f6ff 18%, transparent)',
          border: `1px solid ${T.neon}`,
          boxShadow: `0 0 12px -3px ${T.neon}`,
          transition: 'inset-inline-start 240ms cubic-bezier(0.2,0.8,0.2,1)',
        }}
      />
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            style={{
              position: 'relative',
              zIndex: 1,
              padding: '8px 4px',
              border: 'none',
              background: 'transparent',
              color: active ? T.neon : T.text2,
              fontFamily: T.fontMono,
              fontWeight: 700,
              fontSize: 13.5,
              cursor: 'pointer',
              transition: 'color 200ms ease',
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
