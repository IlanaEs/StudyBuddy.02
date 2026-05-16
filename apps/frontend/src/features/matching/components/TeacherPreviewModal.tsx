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
        className="w-full max-w-md rounded-2xl p-6"
        style={{ background: 'var(--surface)', border: '1px solid var(--line-2)' }}
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xl font-bold" style={{ color: 'var(--text)' }}>{teacher.fullName}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 20 }}>✕</button>
        </div>

        {teacher.isVerified && (
          <div className="mb-3 flex items-center gap-2 text-sm" style={{ color: 'var(--lime)' }}>
            🛡️ מורה מאומת/ת במערכת StudyBuddy
          </div>
        )}

        {teacher.bio && (
          <p className="mb-4" style={{ color: 'var(--text-2)', fontSize: 15 }}>{teacher.bio}</p>
        )}

        <div className="flex items-center gap-4 mb-4">
          <div style={{ color: 'var(--gold)', fontWeight: 700, fontSize: 20 }}>₪{teacher.hourlyRate}<span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-3)' }}>/שעה</span></div>
          <div style={{ color: 'var(--text-2)', fontSize: 14 }}>⭐ {teacher.ratingAvg.toFixed(1)} ({teacher.ratingCount})</div>
        </div>

        {teacher.availabilityPreview && (
          <div className="mb-4 p-3 rounded-lg" style={{ background: 'var(--surface-2)', fontSize: 14, color: 'var(--text-2)' }}>
            🕒 זמינות: {teacher.availabilityPreview}
          </div>
        )}

        <div className="mb-4 p-3 rounded-lg" style={{ background: 'var(--surface-2)' }}>
          <div className="text-sm font-bold mb-2" style={{ color: 'var(--text)' }}>למה המורה הזה/ זו מתאים/ה לך?</div>
          {matchBadges?.map((b) => (
            <div key={b.label} className="flex gap-2 mb-1 text-sm" style={{ color: 'var(--text-2)' }}>
              <span>{b.icon}</span>
              <span><strong style={{ color: 'var(--text)' }}>{b.label}:</strong> {b.detail}</span>
            </div>
          ))}
        </div>

        <div className="text-center mb-4 text-sm" style={{ color: 'var(--text-3)' }}>
          ⚠️ מספר הטלפון לא יוצג — כל התיאום דרך המערכת בלבד
        </div>

        <button
          onClick={onBook}
          className="w-full py-3 font-bold rounded-xl"
          style={{ background: 'var(--cyan)', color: '#0f4544', border: 'none', cursor: 'pointer', fontSize: 16 }}
        >
          המשך לקביעת שיעור ←
        </button>
      </div>
    </div>
  );
}
