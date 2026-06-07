import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle2, Mail, Check, Calendar, Clock } from 'lucide-react';
import { useAuth } from '../../../auth/AuthProvider';
import { useMatchingStore } from '../store/matchingStore';
import { getDashboardPathByRole } from '../../../utils/getDashboardPathByRole';
import { BentoCard, GlobalStateCard, GhostButton, sbTokens as sb } from '../../../design-system';

// Quick-wizard success → auto-return to the dashboard after this delay.
const QUICK_AUTO_RETURN_MS = 5000;

type ConfirmationState = {
  bookingId: string;
  teacherName: string;
  subjectName?: string | null;
  whenLabel?: string | null;
  priceLabel?: string | null;
};

function isConfirmationState(value: unknown): value is ConfirmationState {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>)['bookingId'] === 'string' &&
    typeof (value as Record<string, unknown>)['teacherName'] === 'string'
  );
}

function useDashboardRoute() {
  const auth = useAuth();
  // Route each role to its own dashboard; students now land on /student/dashboard.
  if (auth.user?.role) return getDashboardPathByRole(auth.user.role);
  return '/dashboard';
}

export function BookingConfirmationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = isConfirmationState(location.state) ? location.state : null;
  const dashboardRoute = useDashboardRoute();
  const flow = useMatchingStore((s) => s.flow);
  const resetMatching = useMatchingStore((s) => s.reset);
  const isQuick = flow === 'quick';

  // No real booking state means the user landed here without submitting
  // (e.g. direct URL or page refresh). Redirect to dashboard silently.
  useEffect(() => {
    if (!state) {
      navigate(dashboardRoute, { replace: true });
    }
  }, [state, navigate, dashboardRoute]);

  // Quick-wizard success: auto-return to the dashboard after 5s and clear the
  // quick-wizard state so re-entry starts clean. Cancelled if the user leaves first.
  useEffect(() => {
    if (!state || !isQuick) return;
    const timer = setTimeout(() => {
      resetMatching();
      navigate(dashboardRoute, { replace: true });
    }, QUICK_AUTO_RETURN_MS);
    return () => clearTimeout(timer);
  }, [state, isQuick, navigate, dashboardRoute, resetMatching]);

  if (!state) return null;

  // Manual return — also clears quick-wizard state when in the quick flow.
  const goDashboard = () => {
    if (isQuick) resetMatching();
    navigate(dashboardRoute);
  };

  const { teacherName, subjectName, whenLabel, priceLabel } = state;
  const receipt: Array<{ label: string; value: string; mono?: boolean }> = [
    { label: 'מורה', value: teacherName },
    ...(subjectName ? [{ label: 'מקצוע', value: subjectName }] : []),
    ...(whenLabel ? [{ label: 'מועד', value: whenLabel }] : []),
    ...(priceLabel ? [{ label: 'מחיר', value: priceLabel, mono: true }] : []),
  ];

  return (
    <div dir="rtl" lang="he" className="min-h-screen flex flex-col items-center justify-center px-4 py-10" style={{ background: sb.bgCanvas }}>
      <div className="w-full max-w-lg">
        <GlobalStateCard
          variant="success"
          icon={<CheckCircle2 size={56} />}
          title="הבקשה נשלחה בהצלחה! (Request Sent)"
          description={`המורה ${teacherName} יקבל/תקבל את בקשת השיעור ויאשר/תאשר בהקדם.`}
          cta={{ label: 'לדשבורד שלי (My Dashboard)', onClick: goDashboard }}
        />

        {/* Receipt summary */}
        <BentoCard title="סיכום הבקשה" english="Summary" hover={false} style={{ marginTop: 16 }}>
          {receipt.map((r) => (
            <div key={r.label} className="flex items-center justify-between gap-3 mb-2" style={{ fontSize: 14 }}>
              <span style={{ color: sb.textMuted }}>{r.label}</span>
              <span className={r.mono ? 'data-mono' : undefined} style={{ color: sb.textPrimary, fontWeight: 600 }}>{r.value}</span>
            </div>
          ))}
          <p className="mt-2" style={{ color: sb.textMuted, fontSize: 12.5, lineHeight: 1.6 }}>
            הודעה נשלחה למורה לאישור סופי. תוכלו לעקוב אחר סטטוס הבקשה בכרטיס הממתינים בדשבורד.
          </p>
        </BentoCard>

        {/* What happens now */}
        <BentoCard title="מה קורה עכשיו?" hover={false} style={{ marginTop: 16 }}>
          {[
            { icon: <Mail size={16} />, text: `המורה ${teacherName} מקבל/ת את הבקשה` },
            { icon: <Check size={16} />, text: 'המורה מאשר/ת ומתחיל/ה ליצור קשר דרך המערכת' },
            { icon: <Calendar size={16} />, text: 'תואמים את השיעור הראשון' },
          ].map((item) => (
            <div key={item.text} className="flex items-start gap-3 mb-2" style={{ color: sb.textSecondary, fontSize: 14 }}>
              <span style={{ color: sb.active, flexShrink: 0, marginTop: 1 }}>{item.icon}</span>
              <span>{item.text}</span>
            </div>
          ))}
        </BentoCard>

        <div className="flex flex-col items-center gap-3" style={{ marginTop: 16 }}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm" style={{ background: sb.glassSoft, color: sb.active, border: `1px solid ${sb.borderCyber}` }}>
            <Clock size={14} />
            סטטוס: ממתין לאישור המורה
          </div>

          <GhostButton onClick={() => navigate('/find-tutor')} style={{ width: '100%', fontSize: 14 }}>
            חיפוש מורה נוסף
          </GhostButton>

          {isQuick && (
            <p style={{ color: sb.textMuted, fontSize: 12.5, textAlign: 'center', marginTop: 2 }}>
              חוזרים לדשבורד באופן אוטומטי תוך 5 שניות…
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
