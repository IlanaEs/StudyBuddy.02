import { useEffect, useState } from 'react';
import { Loader2, Check, Circle } from 'lucide-react';

// Full-screen "algorithmic matching" overlay shown while runMatching() is in
// flight. Shared by the full onboarding wizard and the condensed Quick Matching
// Wizard. Rotating status logs + a 4-step progress checklist. Not shown for the
// (Phase 2) direct tutor-code bypass, which skips matching entirely.
const LOGS = [
  'סורקים מאגר מורים זמינים...',
  'מצליבים חלונות זמינות בלו"ז...',
  'מפלטרים לפי טווח תקציב והעדפות...',
  'מייצרים התאמות מושלמות...',
];

const STEPS = ['בודקים התאמת מקצוע', 'בודקים זמינות', 'בודקים טווח תקציב', 'מייצרים התאמות'];

export function MatchingLoadingScreen() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setIdx((i) => (i + 1) % LOGS.length), 650);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      dir="rtl"
      lang="he"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center px-4"
      style={{ background: 'var(--bg)' }}
    >
      <div className="mb-6" style={{ color: 'var(--cyan)' }}>
        <Loader2 size={48} className="animate-spin" />
      </div>
      <h2
        className="text-2xl font-bold mb-4"
        style={{ color: 'var(--text)', fontFamily: 'var(--font-display)', textAlign: 'center' }}
      >
        מוצאים את ה-Top 3 שלך (Matching)...
      </h2>
      <p className="text-center mb-8 max-w-xs" style={{ color: 'var(--text-2)', minHeight: 44 }}>
        {LOGS[idx]}
      </p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        {STEPS.map((label, i) => (
          <div
            key={label}
            className="flex items-center gap-3 p-3 rounded-xl"
            style={{ background: 'var(--surface)', border: '1px solid var(--line-2)' }}
          >
            <span style={{ color: i <= idx ? 'var(--lime)' : 'var(--text-3)', flexShrink: 0 }}>
              {i <= idx ? <Check size={16} /> : <Circle size={16} />}
            </span>
            <span style={{ color: i <= idx ? 'var(--text)' : 'var(--text-3)', fontSize: 14 }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
