import { X, ShieldCheck, Star, Clock, Check, Lock } from 'lucide-react';
import { PrimaryButton, sbTokens as sb } from '../../../design-system';
import type { MatchResult } from '../types/matching.types';

interface TeacherPreviewModalProps {
  match: MatchResult;
  onClose: () => void;
  onBook: () => void;
}

export function TeacherPreviewModal({ match, onClose, onBook }: TeacherPreviewModalProps) {
  const { teacher, matchBadges } = match;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}
    >
      <div
        className="sb-card w-full max-w-md p-6"
        style={{ background: sb.glassBase, border: `1px solid ${sb.borderCyber}`, borderRadius: sb.radiusCard }}
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xl font-bold" style={{ color: sb.textPrimary }}>{teacher.fullName}</h3>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg"
            style={{ background: sb.glassSoft, border: `1px solid ${sb.borderCyber}`, color: sb.textMuted, cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {teacher.isVerified && (
          <div className="mb-3 flex items-center gap-2 text-sm" style={{ color: sb.success }}>
            <ShieldCheck size={14} />
            מורה מאומת/ת במערכת StudyBuddy
          </div>
        )}

        {teacher.bio && (
          <p className="mb-4" style={{ color: sb.textSecondary, fontSize: 15 }}>{teacher.bio}</p>
        )}

        <div className="flex items-center gap-4 mb-4">
          <div className="data-mono" style={{ color: sb.primaryCta, fontWeight: 700, fontSize: 20 }}>
            ₪{teacher.hourlyRate}<span style={{ fontSize: 14, fontWeight: 400, color: sb.textMuted }}>/שעה</span>
          </div>
          <div className="flex items-center gap-1" style={{ color: sb.textSecondary, fontSize: 14 }}>
            <Star size={14} />
            <span className="data-mono">{teacher.ratingAvg.toFixed(1)} ({teacher.ratingCount})</span>
          </div>
        </div>

        {teacher.availabilityPreview && (
          <div className="mb-4 p-3 rounded-lg flex items-center gap-2" style={{ background: sb.glassSoft, fontSize: 14, color: sb.textSecondary }}>
            <Clock size={14} style={{ flexShrink: 0 }} />
            <span>זמינות: {teacher.availabilityPreview}</span>
          </div>
        )}

        <div className="mb-4 p-3 rounded-lg" style={{ background: sb.glassSoft }}>
          <div className="text-sm font-bold mb-2" style={{ color: sb.textPrimary }}>למה המורה הזה/זו מתאים/ה לך?</div>
          {matchBadges?.map((b) => (
            <div key={b.label} className="flex gap-2 mb-1 text-sm" style={{ color: sb.textSecondary }}>
              <Check size={14} style={{ color: sb.success, flexShrink: 0, marginTop: 1 }} />
              <span><strong style={{ color: sb.textPrimary }}>{b.label}:</strong> {b.detail}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-center gap-2 text-center mb-4 text-sm" style={{ color: sb.textMuted }}>
          <Lock size={13} />
          מספר הטלפון לא יוצג — כל התיאום דרך המערכת בלבד
        </div>

        <PrimaryButton onClick={onBook} style={{ width: '100%', fontSize: 16 }}>
          המשך לקביעת שיעור
        </PrimaryButton>
      </div>
    </div>
  );
}
