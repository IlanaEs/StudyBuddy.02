import { BadgeCheck, Star, Clock, Target } from 'lucide-react';
import { BentoCard, PrimaryButton, sbTokens as sb } from '../../../design-system';
import type { MatchResult } from '../types/matching.types';

interface TeacherMatchCardProps {
  match: MatchResult;
  userContext: 'student' | 'parent';
  onSelect: (matchId: string) => void;
}

export function TeacherMatchCard({ match, userContext, onSelect }: TeacherMatchCardProps) {
  const { teacher, matchScore, matchBadges, rank } = match;
  const ctaText = userContext === 'parent' ? 'לתיאום וקביעת שיעור' : 'סגירת שיעור מהירה';

  return (
    <BentoCard
      hover={false}
      style={{
        marginBottom: 16,
        position: 'relative',
        border: rank === 1 ? `2px solid ${sb.active}` : `1px solid ${sb.borderCyber}`,
      }}
    >
      {rank === 1 && (
        <div
          className="absolute top-3 right-3 text-xs font-bold px-2 py-1 rounded-full"
          style={{ background: sb.primaryCta, color: sb.onPrimary }}
        >
          #1 המלצה שלנו
        </div>
      )}
      <div className={`flex items-start gap-4 mb-3 ${rank === 1 ? 'pt-6' : ''}`}>
        <div
          className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold"
          style={{ background: sb.glassSoft, color: sb.active }}
        >
          {teacher.fullName.charAt(0)}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-lg" style={{ color: sb.textPrimary }}>{teacher.fullName}</h3>
            {teacher.isVerified && (
              <span className="flex items-center gap-1" style={{ color: sb.success, fontSize: 13 }}>
                <BadgeCheck size={14} /> מאומת
              </span>
            )}
          </div>
          <div className="flex items-center gap-1" style={{ color: sb.textSecondary, fontSize: 13 }}>
            <Star size={13} />
            <span>
              <span className="data-mono">{teacher.ratingAvg.toFixed(1)}</span> (<span className="data-mono">{teacher.ratingCount}</span> ביקורות)
            </span>
          </div>
          {teacher.availabilityPreview && (
            <div className="flex items-center gap-1" style={{ color: sb.textMuted, fontSize: 13 }}>
              <Clock size={13} />
              <span>{teacher.availabilityPreview}</span>
            </div>
          )}
        </div>
        <div className="flex-shrink-0 text-start">
          <div className="data-mono font-bold text-lg" style={{ color: sb.primaryCta }}>₪{teacher.hourlyRate}</div>
          <div style={{ color: sb.textMuted, fontSize: 12 }}>לשעה</div>
        </div>
      </div>

      {teacher.bio && (
        <p style={{ color: sb.textSecondary, fontSize: 14, marginBottom: 12 }}>{teacher.bio}</p>
      )}

      <div
        className="flex items-center gap-2 mb-4 p-2 rounded-lg"
        style={{ background: sb.glassSoft, fontSize: 13 }}
      >
        <Target size={14} style={{ color: sb.active, flexShrink: 0 }} />
        <span style={{ color: sb.textSecondary }}>ציון התאמה: <strong className="data-mono" style={{ color: sb.active }}>{matchScore}%</strong></span>
      </div>

      {matchBadges && matchBadges.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {matchBadges.map((badge) => (
            <span
              key={badge.label}
              className="text-xs px-2 py-1 rounded-full"
              style={{ background: sb.glassSoft, color: sb.textSecondary, border: `1px solid ${sb.borderCyber}` }}
              title={badge.detail}
            >
              {badge.label}
            </span>
          ))}
        </div>
      )}

      <PrimaryButton onClick={() => onSelect(match.id)} style={{ width: '100%' }}>
        {ctaText}
      </PrimaryButton>
    </BentoCard>
  );
}
