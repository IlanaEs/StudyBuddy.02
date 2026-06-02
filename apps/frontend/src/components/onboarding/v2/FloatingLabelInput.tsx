import { useState, type CSSProperties, type ReactNode } from 'react';
import { towTokens as T } from '../../../design/tokens';

interface FloatingLabelInputProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  inputMode?: 'text' | 'numeric' | 'decimal';
  icon?: ReactNode;
  mono?: boolean;          // monospace for numeric/technical fields
  error?: boolean;
  style?: CSSProperties;
}

/**
 * Floating-label input that lifts/scales the label on focus or when filled,
 * with a neon focus ring (via the shared .tow-focusable class).
 */
export function FloatingLabelInput({
  label,
  value,
  onChange,
  type = 'text',
  inputMode,
  icon,
  mono = false,
  error = false,
  style,
}: FloatingLabelInputProps) {
  const [focused, setFocused] = useState(false);
  const lifted = focused || value.length > 0;

  return (
    <label
      className="tow-focusable"
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '16px 14px 8px',
        borderRadius: T.radiusSm,
        border: `1.5px solid ${error ? T.alert : T.line2}`,
        background: T.card2,
        ...style,
      }}
    >
      {icon && <span style={{ color: T.text3, display: 'flex', flexShrink: 0 }}>{icon}</span>}
      <span style={{ position: 'relative', flex: 1 }}>
        <span
          style={{
            position: 'absolute',
            insetInlineStart: 0,
            top: lifted ? -10 : 2,
            fontSize: lifted ? 11 : 14,
            color: lifted ? T.neon : T.text3,
            fontWeight: lifted ? 700 : 500,
            transform: `scale(${lifted ? 0.95 : 1})`,
            transformOrigin: 'right top',
            transition: 'top 150ms ease, font-size 150ms ease, color 150ms ease',
            pointerEvents: 'none',
          }}
        >
          {label}
        </span>
        <input
          type={type}
          inputMode={inputMode}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: '100%',
            border: 'none',
            background: 'transparent',
            outline: 'none',
            color: T.text,
            fontSize: 15,
            fontFamily: mono ? T.fontMono : 'var(--tow-font)',
            paddingTop: 4,
          }}
        />
      </span>
    </label>
  );
}
