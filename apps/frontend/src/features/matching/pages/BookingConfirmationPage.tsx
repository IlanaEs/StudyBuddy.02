import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Mail, Check, Calendar, Clock } from 'lucide-react';
import { useMatchingStore } from '../store/matchingStore';

export function BookingConfirmationPage() {
  const navigate = useNavigate();
  const { matchResults, selectedMatchId } = useMatchingStore();
  const match = matchResults.find((r) => r.id === selectedMatchId);

  return (
    <div dir="rtl" lang="he" className="min-h-screen flex flex-col items-center justify-center px-4 py-10" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-lg text-center">
        <div className="flex justify-center mb-4" style={{ color: 'var(--cyan)' }}>
          <CheckCircle2 size={56} />
        </div>
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>הבקשה נשלחה בהצלחה!</h1>
        <p className="mb-6" style={{ color: 'var(--text-2)', fontSize: 15 }}>
          המורה {match?.teacher.fullName ?? ''} יקבל/תקבל את בקשת השיעור ויאשר/תאשר בהקדם.
        </p>

        <div className="rounded-2xl p-5 mb-6 text-right" style={{ background: 'var(--surface)', border: '1px solid var(--line-2)' }}>
          <div className="font-bold mb-3" style={{ color: 'var(--text)' }}>מה קורה עכשיו?</div>
          {[
            { icon: <Mail size={16} />, text: `המורה ${match?.teacher.fullName ?? ''} מקבל/ת את הבקשה` },
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
          <button onClick={() => navigate('/dashboard')} className="w-full py-3 font-bold rounded-xl" style={{ background: 'var(--cyan)', color: '#0f4544', border: 'none', cursor: 'pointer' }}>
            לדשבורד שלי
          </button>
          <button onClick={() => navigate('/onboarding/matching')} className="w-full py-3 rounded-xl font-medium text-sm" style={{ background: 'transparent', border: '1px solid var(--line-2)', color: 'var(--text-3)', cursor: 'pointer' }}>
            חיפוש מורה נוסף
          </button>
        </div>
      </div>
    </div>
  );
}
