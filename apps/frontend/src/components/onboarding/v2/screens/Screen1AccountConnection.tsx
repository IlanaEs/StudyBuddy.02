import { Loader2, ArrowLeft } from 'lucide-react';
import { towTokens as T } from '../../../../design/tokens';
import { BentoCard, ScreenHeader } from '../primitives';

interface Screen1Props {
  onGoogle: () => void;
  onBack: () => void;
  loading: boolean;
  error: string | null;
}

/**
 * Screen 1 — Account Connection (חיבור חשבון). Google-only sign-in in a centered
 * bento with the neon focus aesthetic. Name/email come from the Google profile.
 */
export function Screen1AccountConnection({ onGoogle, onBack, loading, error }: Screen1Props) {
  return (
    <div className="tow-step-in">
      <ScreenHeader
        title="חיבור חשבון"
        english="Account Connection"
        subtitle="התחברות עם Google שומרת את הפרופיל ומסנכרנת את היומן שלך — ללא סיסמה."
      />

      <BentoCard style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: 28, alignItems: 'center', textAlign: 'center' }}>
        <div
          style={{
            width: 56, height: 56, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: T.card2, border: `2px solid ${T.line2}`,
          }}
        >
          <svg width="26" height="26" viewBox="0 0 48 48" aria-hidden="true">
            <path d="M44.5 20H24v8.5h11.8C34.7 33.9 29.9 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z" fill="#FFC107" />
            <path d="M6.3 14.7l7 5.1C15.2 16.4 19.3 14 24 14c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 16.3 2 9.7 7.4 6.3 14.7z" fill="#FF3D00" />
            <path d="M24 46c5.8 0 10.8-1.9 14.7-5.2l-6.8-5.6C29.9 37 27.1 38 24 38c-5.8 0-10.7-3.9-12.4-9.3l-7 5.4C7.9 41.3 15.5 46 24 46z" fill="#4CAF50" />
            <path d="M44.5 20H24v8.5h11.8c-.8 2.3-2.3 4.3-4.3 5.7l6.8 5.6C42.2 36.3 45 30.6 45 24c0-1.3-.2-2.7-.5-4z" fill="#1976D2" />
          </svg>
        </div>

        <p style={{ margin: 0, fontSize: 14, color: T.text2, lineHeight: 1.6, maxWidth: 360 }}>
          נחבר את החשבון שלך ל-StudyBuddy ונבקש גישה ליומן Google כדי לזהות אוטומטית מתי את/ה תפוס/ה.
        </p>

        {error && (
          <div style={{ width: '100%', padding: '10px 14px', borderRadius: T.radiusSm, border: `1.5px solid ${T.alert}`, background: 'rgba(226,43,87,0.10)', color: T.alert, fontSize: 13, fontWeight: 600 }}>
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={onGoogle}
          disabled={loading}
          className={loading ? undefined : 'tow-pulse-cta'}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            padding: '14px 20px', borderRadius: T.radiusSm, border: 'none',
            background: T.orange, color: '#1a0e05', fontSize: 15, fontWeight: 800,
            cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'var(--tow-font)',
          }}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : null}
          המשך עם Google (Continue with Google)
          {!loading && <ArrowLeft size={16} />}
        </button>
      </BentoCard>

      <button
        type="button"
        onClick={onBack}
        style={{ marginTop: 16, background: 'none', border: 'none', color: T.text3, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
      >
        חזרה לעמוד המורים
      </button>
    </div>
  );
}
