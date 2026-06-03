import { useRef, useState } from 'react';
import { AtSign, KeyRound, Lock, ShieldCheck } from 'lucide-react';
import { towTokens as T } from '../../../../design/tokens';
import { FloatingLabelInput } from '../../../../components/onboarding/v2/FloatingLabelInput';
import { BentoTile } from '../BentoGrid';
import { useTeacherDashboardStore } from '../../store/teacherDashboardStore';

// Backend-driven OTP is proxied with a fixed mock code for the demo.
const EXPECTED_CODE = '1234';

const pillBtn = (accent: string, outline = false) =>
  ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 14px',
    borderRadius: T.radiusSm,
    border: `1.5px solid ${accent}`,
    background: outline ? 'transparent' : `color-mix(in oklab, ${accent} 18%, transparent)`,
    color: accent,
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
  }) as const;

type Mode = 'idle' | 'editing' | 'verifying';

export function AccountCard() {
  const config = useTeacherDashboardStore((s) => s.config);
  const updateConfig = useTeacherDashboardStore((s) => s.updateConfig);

  const [mode, setMode] = useState<Mode>('idle');
  const [newEmail, setNewEmail] = useState('');
  const [digits, setDigits] = useState(['', '', '', '']);
  const [codeError, setCodeError] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);
  const boxRefs = useRef<Array<HTMLInputElement | null>>([]);

  if (!config) return null;
  const email = config.email ?? '—';

  function startEdit() {
    setNewEmail(config?.email ?? '');
    setMode('editing');
  }
  function cancel() {
    setMode('idle');
    setNewEmail('');
    setDigits(['', '', '', '']);
    setCodeError(false);
  }
  function toVerify() {
    if (!newEmail.includes('@')) return;
    setDigits(['', '', '', '']);
    setCodeError(false);
    setMode('verifying');
  }
  function setDigit(i: number, raw: string) {
    const d = raw.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[i] = d;
    setDigits(next);
    setCodeError(false);
    if (d && i < 3) boxRefs.current[i + 1]?.focus();
    if (next.every((x) => x !== '')) {
      if (next.join('') === EXPECTED_CODE) {
        updateConfig({ email: newEmail.trim() });
        cancel();
      } else {
        setCodeError(true);
      }
    }
  }

  return (
    <BentoTile size="1x2" title="חשבון" english="Account" icon={<AtSign size={16} />}>
      {/* Email row */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 11.5, color: T.text3 }}>אימייל (Email)</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ flex: 1, fontFamily: T.fontMono, fontSize: 14, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {mode === 'idle' ? email : newEmail || email}
          </span>
          {mode === 'idle' && (
            <button type="button" onClick={startEdit} style={pillBtn(T.neon)}>
              שינוי (Edit)
            </button>
          )}
        </div>
      </div>

      {mode === 'editing' && (
        <div className="tow-step-in" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <FloatingLabelInput label="אימייל חדש (New Email)" value={newEmail} onChange={setNewEmail} type="email" mono />
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={toVerify} style={pillBtn(T.neon)}>המשך (Continue)</button>
            <button type="button" onClick={cancel} style={pillBtn(T.text3, true)}>ביטול (Cancel)</button>
          </div>
        </div>
      )}

      {mode === 'verifying' && (
        <div className="tow-step-in" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: T.text2 }}>
            <Lock size={13} style={{ color: T.gold }} />
            הזינו קוד אימות שנשלח אליכם
          </div>
          <div dir="ltr" style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => { boxRefs.current[i] = el; }}
                value={d}
                inputMode="numeric"
                maxLength={1}
                onChange={(e) => setDigit(i, e.target.value)}
                aria-label={`ספרה ${i + 1}`}
                style={{
                  width: 46,
                  height: 54,
                  textAlign: 'center',
                  fontFamily: T.fontMono,
                  fontSize: 22,
                  fontWeight: 800,
                  color: T.text,
                  background: '#0a1414',
                  border: `2px solid ${codeError ? T.alert : T.neon}`,
                  borderRadius: T.radiusSm,
                  outline: 'none',
                }}
              />
            ))}
          </div>
          <span style={{ textAlign: 'center', fontSize: 11.5, color: codeError ? T.alert : T.text3 }}>
            {codeError ? 'קוד שגוי, נסו שוב' : `קוד לדוגמה: ${EXPECTED_CODE} (demo)`}
          </span>
          <button type="button" onClick={cancel} style={{ ...pillBtn(T.text3, true), alignSelf: 'center' }}>
            ביטול (Cancel)
          </button>
        </div>
      )}

      {/* Password change (proxy) */}
      <div style={{ marginTop: 'auto', borderTop: `1px solid ${T.line}`, paddingTop: 12 }}>
        {!pwOpen ? (
          <button type="button" onClick={() => { setPwOpen(true); setPwSaved(false); }} style={pillBtn(T.text2, true)}>
            <KeyRound size={14} /> שינוי סיסמה (Change Password)
          </button>
        ) : (
          <div className="tow-step-in" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <FloatingLabelInput label="סיסמה נוכחית (Current)" value="" onChange={() => {}} type="password" />
            <FloatingLabelInput label="סיסמה חדשה (New)" value="" onChange={() => {}} type="password" />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button type="button" onClick={() => { setPwOpen(false); setPwSaved(true); }} style={pillBtn(T.neon)}>
                שמירה (Save)
              </button>
              <button type="button" onClick={() => setPwOpen(false)} style={pillBtn(T.text3, true)}>ביטול (Cancel)</button>
            </div>
          </div>
        )}
        {pwSaved && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8, fontSize: 11.5, color: T.success }}>
            <ShieldCheck size={13} /> הסיסמה עודכנה
          </span>
        )}
      </div>
    </BentoTile>
  );
}
