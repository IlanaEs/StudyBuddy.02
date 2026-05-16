import type { MatchResult } from '../types/matching.types';

interface TeacherMatchCardProps {
  match: MatchResult;
  userContext: 'student' | 'parent';
  onSelect: (matchId: string) => void;
}

export function TeacherMatchCard({ match, userContext, onSelect }: TeacherMatchCardProps) {
  const { teacher, matchScore, matchBadges, rank } = match;
  const ctaText = userContext === 'parent' ? 'לתיאום וקביעת שיעור ←' : 'סגירת שיעור מהירה ←';

  return (
    <div
      className="rounded-2xl p-5 mb-4"
      style={{
        background: 'var(--surface)',
        border: rank === 1 ? '2px solid var(--cyan)' : '1px solid var(--line-2)',
        position: 'relative',
      }}
    >
      {rank === 1 && (
        <div
          className="absolute top-3 right-3 text-xs font-bold px-2 py-1 rounded-full"
          style={{ background: 'var(--cyan)', color: '#0f4544' }}
        >
          #1 המלצה שלנו
        </div>
      )}
      <div className={`flex items-start gap-4 mb-3 ${rank === 1 ? 'pt-6' : ''}`}>
        <div
          className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold"
          style={{ background: 'var(--surface-2)', color: 'var(--cyan)' }}
        >
          {teacher.fullName.charAt(0)}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-lg" style={{ color: 'var(--text)' }}>{teacher.fullName}</h3>
            {teacher.isVerified && <span style={{ color: 'var(--lime)', fontSize: 14 }}>✓ מאומת</span>}
          </div>
          <div style={{ color: 'var(--text-2)', fontSize: 13 }}>
            ⭐ {teacher.ratingAvg.toFixed(1)} ({teacher.ratingCount} ביקורות)
          </div>
          {teacher.availabilityPreview && (
            <div style={{ color: 'var(--text-3)', fontSize: 13 }}>🕒 {teacher.availabilityPreview}</div>
          )}
        </div>
        <div className="flex-shrink-0 text-start">
          <div className="font-bold text-lg" style={{ color: 'var(--gold)' }}>₪{teacher.hourlyRate}</div>
          <div style={{ color: 'var(--text-3)', fontSize: 12 }}>לשעה</div>
        </div>
      </div>

      {teacher.bio && (
        <p style={{ color: 'var(--text-2)', fontSize: 14, marginBottom: 12 }}>{teacher.bio}</p>
      )}

      <div
        className="flex items-center gap-2 mb-4 p-2 rounded-lg"
        style={{ background: 'var(--surface-2)', fontSize: 13 }}
      >
        <span style={{ color: 'var(--cyan)' }}>🎯</span>
        <span style={{ color: 'var(--text-2)' }}>ציון התאמה: <strong style={{ color: 'var(--cyan)' }}>{matchScore}%</strong></span>
      </div>

      {matchBadges && matchBadges.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {matchBadges.map((badge) => (
            <span
              key={badge.label}
              className="text-xs px-2 py-1 rounded-full"
              style={{ background: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--line-2)' }}
              title={badge.detail}
            >
              {badge.icon} {badge.label}
            </span>
          ))}
        </div>
      )}

      <button
        onClick={() => onSelect(match.id)}
        className="w-full py-3 font-bold rounded-xl transition-all"
        style={{ background: 'var(--cyan)', color: '#0f4544', border: 'none', cursor: 'pointer', fontSize: 15 }}
      >
        {ctaText}
      </button>
    </div>
  );
}
