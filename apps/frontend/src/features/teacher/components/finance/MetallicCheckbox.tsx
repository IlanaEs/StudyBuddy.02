import { Check } from 'lucide-react';
import { towTokens as T } from '../../../../design/tokens';

/**
 * Custom metallic control square — deliberately NOT a native checkbox and
 * distinct from the neon SquareCheckbox: on check it fills lime-green (#bbe341)
 * and stamps a Check icon inside. Disabled (no fill) when the row is locked.
 */
export function MetallicCheckbox({
  checked,
  onChange,
  disabled = false,
  ariaLabel,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onChange}
      style={{
        width: 26,
        height: 26,
        padding: 0,
        borderRadius: 6,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: disabled ? 'default' : 'pointer',
        border: `1px solid ${checked ? '#7fae1f' : T.line2}`,
        background: checked
          ? 'linear-gradient(160deg, #cdee5c, #bbe341 55%, #9fc92f)'
          : 'linear-gradient(160deg, #5a8f87, #3f7e76 60%, #34655f)',
        boxShadow: checked
          ? '0 0 10px -2px color-mix(in oklab, #bbe341 70%, transparent), inset 0 1px 0 rgba(255,255,255,0.4)'
          : 'inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -2px 4px rgba(0,0,0,0.25)',
        opacity: disabled && !checked ? 0.45 : 1,
        transition: 'background 160ms ease, box-shadow 160ms ease, border-color 160ms ease',
      }}
    >
      {checked && <Check size={16} strokeWidth={3} color="#14310f" className="tow-chip-pop" aria-hidden="true" />}
    </button>
  );
}
