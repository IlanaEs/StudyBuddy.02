import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, SearchX, RotateCcw } from 'lucide-react';
import { useMatchingStore } from '../store/matchingStore';
import { TeacherMatchCard } from '../components/TeacherMatchCard';
import { TeacherPreviewModal } from '../components/TeacherPreviewModal';
import { GlobalStateCard, SecondaryButton, GhostButton, sbTokens as sb } from '../../../design-system';
import type { MatchResult } from '../types/matching.types';

export function MatchResultsPage() {
  const navigate = useNavigate();
  const { matchResults, intake, selectMatch, flow } = useMatchingStore();
  const [previewMatch, setPreviewMatch] = useState<MatchResult | null>(null);
  const userContext = intake.accountType === 'parent_for_child' ? 'parent' : 'student';
  const isParent = userContext === 'parent';
  // In the quick (Find-Tutor) flow, "edit search" returns to the condensed
  // wizard and "back" goes to the student dashboard — never the onboarding flow.
  const isQuick = flow === 'quick';
  const editTarget = isQuick ? '/find-tutor' : '/onboarding/matching';

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
      <div dir="rtl" lang="he" style={{ minHeight: '100dvh', background: sb.bgCanvas, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '24px 16px' }}>
        <GlobalStateCard
          variant="empty"
          icon={<SearchX size={32} />}
          title="לא נמצאו תוצאות"
          description="נסו לשנות את הקריטריונים ולחפש שוב."
          cta={{ label: 'חזרה לחיפוש מורה (Find Tutor)', onClick: () => navigate(editTarget) }}
        />
        {isQuick && (
          <GhostButton onClick={() => navigate('/student/dashboard')}>חזרה לדשבורד (Dashboard)</GhostButton>
        )}
      </div>
    );
  }

  const isPartialMatch = matchResults.some((r) => r.matchScore < 90);

  return (
    <div dir="rtl" lang="he" className="min-h-screen px-4 py-10" style={{ background: sb.bgCanvas }}>
      <div className="w-full mx-auto" style={{ maxWidth: 480 }}>
        <div className="mb-6">
          <div className="flex mb-3" style={{ color: sb.active }}>
            <Award size={32} />
          </div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: sb.textPrimary, fontFamily: sb.fontUi }}>
            {isPartialMatch ? noMatchTitle : title}
          </h1>
          <p style={{ color: sb.textSecondary, fontSize: 15 }}>
            {isPartialMatch
              ? (isParent ? 'המורים הללו מומחים לחלוטין בחומר הלימוד וברמת הגיל, ומציעים גמישות רבה.' : 'מורים מעולים שמתמחים בדיוק בחומר שלך, עם סטייה קלה בלבד בשעות או במחיר. שווה להציץ.')
              : subtitle}
          </p>
        </div>

        {matchResults.slice(0, 3).map((m) => (
          <TeacherMatchCard key={m.id} match={m} userContext={userContext} onSelect={handleSelect} />
        ))}

        <SecondaryButton
          onClick={() => navigate(editTarget)}
          style={{ width: '100%', marginTop: 16, fontSize: 14 }}
        >
          <RotateCcw size={14} />
          חיפוש מחדש עם קריטריונים שונים (New Search)
        </SecondaryButton>

        {isQuick && (
          <SecondaryButton
            onClick={() => navigate('/student/dashboard')}
            style={{ width: '100%', marginTop: 8, fontSize: 14 }}
          >
            חזרה לדשבורד (Dashboard)
          </SecondaryButton>
        )}
      </div>

      {previewMatch && (
        <TeacherPreviewModal match={previewMatch} onClose={() => setPreviewMatch(null)} onBook={handleBook} />
      )}
    </div>
  );
}
