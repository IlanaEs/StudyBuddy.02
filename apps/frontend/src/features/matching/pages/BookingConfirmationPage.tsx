import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle2, Mail, Check, Calendar, Clock } from 'lucide-react';
import { useAuth } from '../../../auth/AuthProvider';
import { FlowNav } from '../../../components/FlowNav';
import { getDashboardPathByRole } from '../../../utils/getDashboardPathByRole';

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

  // No real booking state means the user landed here without submitting
  // (e.g. direct URL or page refresh). Redirect to dashboard silently.
  useEffect(() => {
    if (!state) {
      navigate(dashboardRoute, { replace: true });
    }
  }, [state, navigate, dashboardRoute]);

  if (!state) return null;

  const { teacherName, subjectName, whenLabel, priceLabel } = state;
  const receipt: Array<{ label: string; value: string }> = [
    { label: 'מורה', value: teacherName },
    ...(subjectName ? [{ label: 'מקצוע', value: subjectName }] : []),
    ...(whenLabel ? [{ label: 'מועד', value: whenLabel }] : []),
    ...(priceLabel ? [{ label: 'מחיר', value: priceLabel }] : []),
  ];

  return (
    <div dir="rtl" lang="he" className="min-h-screen flex flex-col items-center justify-center px-4 py-10" style={{ background: 'var(--bg)' }}>
      <FlowNav to="/" label="חזרה לדף הבית" />
      <div className="w-full max-w-lg text-center">
        <div className="flex justify-center mb-4" style={{ color: 'var(--cyan)' }}>
          <CheckCircle2 size={56} />
        </div>
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>הבקשה נשלחה בהצלחה! (Request Sent)</h1>
        <p className="mb-6" style={{ color: 'var(--text-2)', fontSize: 15 }}>
          המורה {teacherName} יקבל/תקבל את בקשת השיעור ויאשר/תאשר בהקדם.
        </p>

        {/* Receipt (Bento Summary) */}
        <div className="rounded-2xl p-5 mb-4 text-right" style={{ background: 'var(--surface)', border: '1px solid var(--line-2)' }}>
          <div className="font-bold mb-3" style={{ color: 'var(--text)' }}>סיכום הבקשה (Summary)</div>
          {receipt.map((r) => (
            <div key={r.label} className="flex items-center justify-between gap-3 mb-2" style={{ fontSize: 14 }}>
              <span style={{ color: 'var(--text-3)' }}>{r.label}</span>
              <span style={{ color: 'var(--text)', fontWeight: 600 }}>{r.value}</span>
            </div>
          ))}
          <p className="mt-2" style={{ color: 'var(--text-3)', fontSize: 12.5, lineHeight: 1.6 }}>
            הודעה נשלחה למורה לאישור סופי. תוכלו לעקוב אחר סטטוס הבקשה בכרטיס הממתינים בדשבורד.
          </p>
        </div>

        <div className="rounded-2xl p-5 mb-6 text-right" style={{ background: 'var(--surface)', border: '1px solid var(--line-2)' }}>
          <div className="font-bold mb-3" style={{ color: 'var(--text)' }}>מה קורה עכשיו?</div>
          {[
            { icon: <Mail size={16} />, text: `המורה ${teacherName} מקבל/ת את הבקשה` },
            { icon: <Check size={16} />, text: 'המורה מאשר/ת ומתחיל/ה ליצור קשר דרך המערכת' },
            { icon: <Calendar size={16} />, text: 'תואמים את השיעור הראשון' },
          ].map((item) => (
            <div key={item.text} className="flex items-start gap-3 mb-2" style={{ color: 'var(--text-2)', fontSize: 14 }}>
              <span style={{ color: 'var(--cyan)', flexShrink: 0, marginTop: 1 }}>{item.icon}</span>
              <span>{item.text}</span>
            </div>
          ))}
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 text-sm" style={{ background: 'color-mix(in oklab, var(--gold) 15%, var(--surface))', color: 'var(--gold)', border: '1px solid var(--gold)' }}>
          <Clock size={14} />
          סטטוס: ממתין לאישור המורה
        </div>

        <div className="flex flex-col gap-3">
          <button onClick={() => navigate(dashboardRoute)} className="w-full py-3 font-bold rounded-xl" style={{ background: 'var(--cyan)', color: '#0f4544', border: 'none', cursor: 'pointer' }}>
            לדשבורד שלי (My Dashboard)
          </button>
          <button onClick={() => navigate('/find-tutor')} className="w-full py-3 rounded-xl font-medium text-sm" style={{ background: 'transparent', border: '1px solid var(--line-2)', color: 'var(--text-3)', cursor: 'pointer' }}>
            חיפוש מורה נוסף
          </button>
        </div>
      </div>
    </div>
  );
}
