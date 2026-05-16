import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMatchingStore } from '../store/matchingStore';
import { TeacherMatchCard } from '../components/TeacherMatchCard';
import { TeacherPreviewModal } from '../components/TeacherPreviewModal';
import type { MatchResult } from '../types/matching.types';

export function MatchResultsPage() {
  const navigate = useNavigate();
  const { matchResults, intake, selectMatch } = useMatchingStore();
  const [previewMatch, setPreviewMatch] = useState<MatchResult | null>(null);
  const userContext = intake.userContext ?? 'student';
  const isParent = userContext === 'parent';

  const title = intake.fullName
    ? (isParent ? `${intake.fullName}, מצאנו את 3 המורים המתאימים ביותר:` : `${intake.fullName}, הנה ה-Top 3 שלך:`)
    : (isParent ? 'מצאנו את 3 המורים המתאימים ביותר:' : 'הנה ה-Top 3 שלך:');

  const subtitle = isParent
    ? 'שקללנו את רמת הלימוד, התקציב והצרכים הפדגוגיים שהגדרתם. לפניכם 3 ההתאמות המובילות והבטוחות ביותר עבור ילדכם.'
    : 'מצאנו 3 מורים שפנויים בדיוק מתי שנוח לך וסוגרים לך את הפינה לחומר. מי הכי נראה לך?';

  const noMatchTitle = isParent
    ? 'חיפשנו התאמה מלאה, אך חלק מהקריטריונים הגבילו את התוצאות. הנה 3 האפשרויות המובילות והקרובות ביותר:'
    : 'לא מצאנו התאמה של 100% בלו"ז או בתקציב, אבל הנה ה-3 שהכי קרובים אליך:';

  function handleSelect(matchId: string) {
    const m = matchResults.find((r) => r.id === matchId);
    if (m) setPreviewMatch(m);
  }

  function handleBook() {
    if (previewMatch) {
      selectMatch(previewMatch.id);
      navigate('/onboarding/booking');
    }
  }

  if (matchResults.length === 0) {
    return (
      <div dir="rtl" lang="he" className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
        <div className="text-center">
          <div className="text-4xl mb-4">😔</div>
          <p style={{ color: 'var(--text-2)' }}>לא נמצאו תוצאות. נסו לשנות את הקריטריונים.</p>
          <button onClick={() => navigate('/onboarding/matching')} className="mt-4 py-2 px-5 rounded-xl font-medium" style={{ background: 'var(--cyan)', color: '#0f4544', border: 'none', cursor: 'pointer' }}>חזרה לחיפוש</button>
        </div>
      </div>
    );
  }

  const isPartialMatch = matchResults.some((r) => r.matchScore < 90);

  return (
    <div dir="rtl" lang="he" className="min-h-screen px-4 py-10" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-lg mx-auto">
        <div className="mb-6">
          <div className="text-3xl mb-2">🏆</div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>
            {isPartialMatch ? noMatchTitle : title}
          </h1>
          <p style={{ color: 'var(--text-2)', fontSize: 15 }}>
            {isPartialMatch
              ? (isParent ? 'המורים הללו מומחים לחלוטין בחומר הלימוד וברמת הגיל, ומציעים גמישות רבה.' : 'מורים מעולים שמתמחים בדיוק בחומר שלך, עם סטייה קלה בלבד בשעות או במחיר. שווה להציץ.')
              : subtitle}
          </p>
        </div>

        {matchResults.slice(0, 3).map((m) => (
          <TeacherMatchCard key={m.id} match={m} userContext={userContext} onSelect={handleSelect} />
        ))}

        <button onClick={() => navigate('/onboarding/matching')} className="w-full mt-4 py-3 rounded-xl font-medium text-sm" style={{ background: 'transparent', border: '1px solid var(--line-2)', color: 'var(--text-3)', cursor: 'pointer' }}>
          🔄 חיפוש מחדש עם קריטריונים שונים
        </button>
      </div>

      {previewMatch && (
        <TeacherPreviewModal match={previewMatch} onClose={() => setPreviewMatch(null)} onBook={handleBook} />
      )}
    </div>
  );
}
