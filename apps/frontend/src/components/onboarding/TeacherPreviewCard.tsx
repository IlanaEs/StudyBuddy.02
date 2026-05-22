import { ShieldCheck, Clock, BookOpen, Star, MapPin } from 'lucide-react';
import { SB_ORANGE } from '../../content/teacherOnboardingContent';
import type { TeacherOnboardingData } from '../../pages/TeacherOnboardingPage';

interface TeacherPreviewCardProps {
  data: TeacherOnboardingData;
}

export function TeacherPreviewCard({ data }: TeacherPreviewCardProps) {
  const displaySubjects = data.selectedSubjects.slice(0, 4);
  const displayStyles = data.teachingStyles.slice(0, 3);
  const availDays = data.weeklyAvailability.slice(0, 3);
  const institution = data.institution || data.expertiseAreas || 'לא צוין';
  const rate = data.hourlyRate ? `₪${data.hourlyRate} / שעה` : 'טרם הוגדר';

  return (
    <div
      style={{
        border: `2px solid var(--line-2)`,
        borderRadius: 'var(--radius-lg)',
        background:
          'radial-gradient(120% 100% at 0% 0%, rgba(249,115,22,0.12), transparent 58%), var(--surface)',
        overflow: 'hidden',
        boxShadow: '4px 4px 0 rgba(0,0,0,0.4)',
      }}
    >
      {/* Header strip */}
      <div
        style={{
          height: 4,
          background: `linear-gradient(90deg, ${SB_ORANGE}, var(--gold))`,
        }}
      />

      <div style={{ padding: 24 }}>
        {/* Top row: avatar + name + badges */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 18 }}>
          {/* Avatar */}
          <div
            style={{
              flexShrink: 0,
              width: 64,
              height: 64,
              borderRadius: 'var(--radius)',
              border: `2px solid ${SB_ORANGE}`,
              background: 'rgba(249,115,22,0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {data.profileImagePreview ? (
              <img
                src={data.profileImagePreview}
                alt={data.fullName}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <span
                style={{
                  color: SB_ORANGE,
                  fontSize: 26,
                  fontWeight: 800,
                  fontFamily: 'var(--font-display)',
                }}
              >
                {data.fullName ? (data.fullName[0] ?? '?').toUpperCase() : '?'}
              </span>
            )}
          </div>

          {/* Name + institution */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: 'var(--text)',
                fontFamily: 'var(--font-display)',
                lineHeight: 1.2,
              }}
            >
              {data.fullName || 'שם המורה'}
            </div>
            <div
              style={{
                fontSize: 13,
                color: 'var(--text-2)',
                marginTop: 4,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <MapPin size={12} />
              {institution}
            </div>

            {/* Verification badges */}
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: 999,
                  border: '1px solid var(--line-2)',
                  color: 'var(--lime)',
                  background: 'rgba(187,227,65,0.1)',
                }}
              >
                <ShieldCheck size={11} />
                מאומת
              </span>
              {data.legalMinors && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: 999,
                    border: '1px solid var(--line-2)',
                    color: 'var(--blue)',
                    background: 'var(--blue-soft)',
                  }}
                >
                  <ShieldCheck size={11} />
                  קב"ט
                </span>
              )}
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: 999,
                  border: '1px solid var(--line-2)',
                  color: 'var(--gold)',
                  background: 'rgba(249,196,1,0.1)',
                }}
              >
                <Star size={11} />
                פרופיל חדש
              </span>
            </div>
          </div>

          {/* Rate */}
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <div
              style={{
                fontSize: 18,
                fontWeight: 900,
                color: SB_ORANGE,
                fontFamily: 'var(--font-mono)',
              }}
            >
              {rate}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>לשעת שיעור</div>
          </div>
        </div>

        {/* Subjects */}
        {displaySubjects.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--text-3)',
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <BookOpen size={12} />
              מקצועות
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {displaySubjects.map((s) => (
                <span
                  key={s}
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    padding: '4px 10px',
                    borderRadius: 999,
                    border: '1px solid var(--line-2)',
                    background: 'var(--surface-2)',
                    color: 'var(--text)',
                  }}
                >
                  {s}
                </span>
              ))}
              {data.selectedSubjects.length > 4 && (
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    padding: '4px 10px',
                    borderRadius: 999,
                    border: '1px solid var(--line)',
                    color: 'var(--text-3)',
                  }}
                >
                  +{data.selectedSubjects.length - 4} נוספים
                </span>
              )}
            </div>
          </div>
        )}

        {/* Teaching styles */}
        {displayStyles.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--text-3)',
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: 8,
              }}
            >
              סגנון הוראה
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {displayStyles.map((s) => (
                <span
                  key={s}
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    padding: '4px 10px',
                    borderRadius: 999,
                    border: `1px solid rgba(249,115,22,0.3)`,
                    background: 'rgba(249,115,22,0.08)',
                    color: SB_ORANGE,
                  }}
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Availability */}
        {availDays.length > 0 && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--line)',
              background: 'rgba(255,255,255,0.03)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 14,
            }}
          >
            <Clock size={13} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 600 }}>
              זמין/ה: {availDays.join(', ')}{availDays.length < data.weeklyAvailability.length ? ' ועוד' : ''}
            </span>
          </div>
        )}

        {/* Matching reason */}
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            border: `1px solid rgba(249,115,22,0.25)`,
            background: 'rgba(249,115,22,0.06)',
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: SB_ORANGE, marginBottom: 4 }}>
            למה תלמידים יבחרו בך
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>
            {data.teachingStyles.length > 0
              ? `מורה ${data.teachingStyles.slice(0, 2).join(', ')} עם מומחיות ב${data.selectedSubjects.slice(0, 2).join(' ו')}.`
              : 'מורה מקצועי/ת עם ניסיון מוכח וזמינות גבוהה לתלמידים.'}
          </div>
        </div>
      </div>
    </div>
  );
}
