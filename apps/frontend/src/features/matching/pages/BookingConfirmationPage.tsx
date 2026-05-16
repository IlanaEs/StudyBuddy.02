import { useNavigate } from 'react-router-dom';
import { useMatchingStore } from '../store/matchingStore';

export function BookingConfirmationPage() {
  const navigate = useNavigate();
  const { matchResults, selectedMatchId } = useMatchingStore();
  const match = matchResults.find((r) => r.id === selectedMatchId);

  return (
    <div dir="rtl" lang="he" className="min-h-screen flex flex-col items-center justify-center px-4 py-10" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-lg text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>הבקשה נשלחה בהצלחה!</h1>
        <p className="mb-6" style={{ color: 'var(--text-2)', fontSize: 15 }}>
          המורה {match?.teacher.fullName ?? ''} יקבל/תקבל את בקשת השיעור ויאשר/תאשר בהקדם.
        </p>

        <div className="rounded-2xl p-5 mb-6 text-right" style={{ background: 'var(--surface)', border: '1px solid var(--line-2)' }}>
          <div className="font-bold mb-3" style={{ color: 'var(--text)' }}>מה קורה עכשיו?</div>
          {[
            { icon: '📩', text: `המורה ${match?.teacher.fullName ?? ''} מקבל/ת את הבקשה` },
            { icon: '✅', text: 'המורה מאשר/ת ומתחיל/ה ליצור קשר דרך המערכת' },
            { icon: '🗓️', text: 'תואמים את השיעור הראשון' },
          ].map((item) => (
            <div key={item.text} className="flex items-start gap-3 mb-2" style={{ color: 'var(--text-2)', fontSize: 14 }}>
              <span>{item.icon}</span>
              <span>{item.text}</span>
            </div>
          ))}
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 text-sm" style={{ background: 'color-mix(in oklab, var(--gold) 15%, var(--surface))', color: 'var(--gold)', border: '1px solid var(--gold)' }}>
          ⏳ סטטוס: ממתין לאישור המורה
        </div>

        <div className="flex gap-3">
          <button onClick={() => navigate('/dashboard')} className="flex-1 py-3 font-bold rounded-xl" style={{ background: 'var(--cyan)', color: '#0f4544', border: 'none', cursor: 'pointer' }}>
            לדשבורד שלי ←
          </button>
          <button onClick={() => navigate('/onboarding/results')} className="py-3 px-5 rounded-xl font-medium" style={{ background: 'var(--surface)', color: 'var(--text-2)', border: '1px solid var(--line-2)', cursor: 'pointer' }}>
            צפייה בבקשה
          </button>
        </div>
      </div>
    </div>
  );
}
