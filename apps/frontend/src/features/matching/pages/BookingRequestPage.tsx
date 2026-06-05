import { useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Info, Paperclip, Send } from 'lucide-react';
import { useMediaQuery } from '@mantine/hooks';
import { useMatchingStore } from '../store/matchingStore';
import { BookingAvailabilityGrid } from '../components/BookingAvailabilityGrid';
import { useAuth } from '../../../auth/AuthProvider';
import { createBookingRequest } from '../../../api/bookingRequests';
import { FloatingLabelInput } from '../../../components/onboarding/v2/FloatingLabelInput';
import { FlowNav } from '../../../components/FlowNav';
import { towTokens as T } from '../../../design/tokens';

// Hebrew weekday name → JS Date.getDay() (0 = Sunday)
const HEBREW_DAY_TO_DOW: Record<string, number> = {
  ראשון: 0, שני: 1, שלישי: 2, רביעי: 3, חמישי: 4, שישי: 5, שבת: 6,
};

// Build an ISO 8601 datetime with local timezone offset for the next occurrence
// of the given weekday at the given HH:mm time. (Unchanged booking logic.)
function buildIsoDatetime(hebrewDay: string, time: string): string {
  const targetDow = HEBREW_DAY_TO_DOW[hebrewDay];
  if (targetDow === undefined) throw new Error(`Unknown day: ${hebrewDay}`);

  const parts = time.split(':');
  const hours = parseInt(parts[0] ?? '0', 10);
  const minutes = parseInt(parts[1] ?? '0', 10);

  const now = new Date();
  const todayDow = now.getDay();
  let daysAhead = ((targetDow - todayDow) + 7) % 7;

  if (daysAhead === 0) {
    const slotToday = new Date(now);
    slotToday.setHours(hours, minutes, 0, 0);
    if (slotToday <= now) daysAhead = 7;
  }

  const date = new Date(now);
  date.setDate(date.getDate() + daysAhead);
  date.setHours(hours, minutes, 0, 0);

  const tzOffsetMinutes = -date.getTimezoneOffset();
  const sign = tzOffsetMinutes >= 0 ? '+' : '-';
  const absHours = Math.floor(Math.abs(tzOffsetMinutes) / 60).toString().padStart(2, '0');
  const absMins = (Math.abs(tzOffsetMinutes) % 60).toString().padStart(2, '0');

  const yyyy = date.getFullYear();
  const MM = (date.getMonth() + 1).toString().padStart(2, '0');
  const dd = date.getDate().toString().padStart(2, '0');
  const HH = hours.toString().padStart(2, '0');
  const mm = minutes.toString().padStart(2, '0');

  return `${yyyy}-${MM}-${dd}T${HH}:${mm}:00${sign}${absHours}:${absMins}`;
}

export function BookingRequestPage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const { matchResults, selectedMatchId } = useMatchingStore();
  const match = matchResults.find((r) => r.id === selectedMatchId);
  const isNarrow = useMediaQuery('(max-width: 820px)') ?? false;

  const [selectedDay, setSelectedDay] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [topic, setTopic] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!match) {
    return (
      <div dir="rtl" lang="he" className="tow tow-bg-glow" style={{ minHeight: '100dvh', color: T.text, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <FlowNav to="/" label="חזרה לדף הבית" />
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: T.text2 }}>לא נמצאה התאמה. חזרו לתוצאות.</p>
          <button
            onClick={() => navigate('/onboarding/results')}
            style={{ marginTop: 16, padding: '10px 20px', borderRadius: T.radiusSm, background: T.neon, color: '#04201f', border: 'none', cursor: 'pointer', fontWeight: 800 }}
          >
            חזרה לתוצאות
          </button>
        </div>
      </div>
    );
  }

  async function handleSubmit() {
    if (!selectedDay || !selectedTime) {
      setError('נא לבחור יום ושעה לשיעור');
      return;
    }
    const accessToken = auth.session?.access_token;
    if (!accessToken) {
      setError('יש להתחבר מחדש כדי לשלוח בקשה');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const requestedStartAt = buildIsoDatetime(selectedDay, selectedTime);
      const startDate = new Date(requestedStartAt);
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
      const requestedEndAt = buildIsoDatetime(
        selectedDay,
        `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`,
      );

      // The booking_request has a single free-text field; fold the lesson topic
      // and the optional note into student_message (no lifecycle/schema change).
      const parts = [topic.trim(), message.trim()].filter(Boolean);
      const studentMessage = parts.join('\n\n');

      const result = await createBookingRequest(
        {
          match_result_id: match!.id,
          requested_start_at: requestedStartAt,
          requested_end_at: requestedEndAt,
          ...(studentMessage ? { student_message: studentMessage } : {}),
        },
        accessToken,
      );

      if ('error' in result) {
        setError(result.error ?? 'שגיאה בשליחת הבקשה. נסו שנית.');
        return;
      }

      navigate('/onboarding/confirmation', {
        state: { bookingId: result.data.booking_request.id, teacherName: match!.teacher.fullName },
      });
    } catch {
      setError('שגיאת תקשורת. בדקו חיבור לאינטרנט ונסו שנית.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const rate = match.teacher.hourlyRate;
  const subjects = match.teacher.subjects?.join(' · ');

  return (
    <div dir="rtl" lang="he" className="tow tow-bg-glow" style={{ minHeight: '100dvh', color: T.text }}>
      <FlowNav to="/" label="חזרה לדף הבית" />
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 18px 64px' }}>
        <button
          onClick={() => navigate('/onboarding/results')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 16, background: 'none', border: 'none', color: T.text3, cursor: 'pointer', fontSize: 13.5 }}
        >
          <ChevronRight size={16} />
          חזרה לתוצאות
        </button>

        <header style={{ marginBottom: 18 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', color: T.neon }}>
            קביעת שיעור (Book a Lesson)
          </p>
          <h1 style={{ margin: '4px 0 0', fontSize: 'clamp(20px, 3.4vw, 26px)', fontWeight: 800, color: T.text }}>
            {match.teacher.fullName}
          </h1>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: isNarrow ? '1fr' : '1.45fr 1fr', gap: 16, alignItems: 'start' }}>
          {/* Left column: teacher profile + availability grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div
                  aria-hidden="true"
                  style={{
                    width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'color-mix(in oklab, #00f6ff 16%, transparent)', color: T.neon,
                    fontWeight: 800, fontSize: 19, border: `1px solid ${T.line2}`,
                  }}
                >
                  {initials(match.teacher.fullName)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 17, fontWeight: 800, color: T.text }}>{match.teacher.fullName}</div>
                  <div style={{ fontSize: 13.5, color: T.text2 }}>
                    {subjects ? `${subjects} · ` : ''}
                    <span style={{ fontFamily: T.fontMono, color: T.gold }}>₪{rate}/שעה</span>
                  </div>
                </div>
              </div>
            </Card>

            <Card title="בחירת מועד" english="Select Time">
              <BookingAvailabilityGrid
                availabilitySlots={match.teacher.availabilitySlots}
                selectedDay={selectedDay}
                selectedTime={selectedTime}
                onSelect={(day, time) => {
                  setSelectedDay(day);
                  setSelectedTime(time);
                  setError('');
                }}
              />
            </Card>
          </div>

          {/* Right column: lesson details + info + CTA */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Card title="פרטי השיעור" english="Lesson Details">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <FloatingLabelInput label="על מה יהיה השיעור?" value={topic} onChange={setTopic} />

                {/* Asset Dropzone — disabled until file upload is built (no backend). */}
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: T.text2, marginBottom: 6 }}>
                    צירוף קבצים (Attachments)
                  </div>
                  <div
                    aria-disabled="true"
                    title="בקרוב"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      padding: '18px 14px', borderRadius: T.radiusSm,
                      border: `1.5px dashed ${T.line2}`,
                      background: 'color-mix(in oklab, #3f7e76 22%, transparent)',
                      color: T.text3, cursor: 'not-allowed', opacity: 0.7, textAlign: 'center',
                    }}
                  >
                    <Paperclip size={16} />
                    <span style={{ fontSize: 13 }}>העלאת קבצים תהיה זמינה בקרוב</span>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: T.text2, marginBottom: 6 }}>הודעה למורה (אופציונלי)</div>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="ספרו קצת על מה שצריך…"
                    rows={3}
                    className="tow-focusable"
                    style={{
                      width: '100%', padding: 12, borderRadius: T.radiusSm, resize: 'vertical',
                      background: 'color-mix(in oklab, #3f7e76 30%, transparent)',
                      border: `1px solid ${T.ink}`, color: T.text, fontSize: 14, outline: 'none',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>
              </div>
            </Card>

            {/* Info bar — no payment at this stage. */}
            <div
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 8, padding: '12px 14px',
                borderRadius: T.radiusSm, borderLeft: `3px solid ${T.success}`,
                background: 'color-mix(in oklab, #3f7e76 30%, transparent)', color: T.text2, fontSize: 13,
              }}
            >
              <Info size={15} style={{ flexShrink: 0, marginTop: 1, color: T.success }} />
              <span>אין תשלום בשלב זה — רק בקשת שיעור. הסכמה על תשלום תגיע ישירות מהמורה.</span>
            </div>

            {error && <div style={{ color: T.alert, fontSize: 13 }}>{error}</div>}

            <button
              onClick={() => void handleSubmit()}
              disabled={isSubmitting}
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                width: '100%', padding: '14px 18px', borderRadius: T.radiusSm, border: 'none',
                background: T.orange, color: '#1a0b03', fontSize: 16, fontWeight: 800,
                cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1,
                transition: 'filter 250ms ease-out',
              }}
            >
              <Send size={17} />
              {isSubmitting ? 'שולח בקשה…' : 'שלח בקשת שיעור (Send Request)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({ title, english, children, style }: { title?: string; english?: string; children: ReactNode; style?: CSSProperties }) {
  return (
    <section
      style={{
        padding: 18, borderRadius: T.radius, border: `1px solid ${T.ink}`,
        background: 'color-mix(in oklab, #3f7e76 55%, transparent)',
        backdropFilter: 'blur(12px) saturate(140%)', WebkitBackdropFilter: 'blur(12px) saturate(140%)',
        boxShadow: '0 8px 28px -18px rgba(0,0,0,0.55)',
        ...style,
      }}
    >
      {title && (
        <h2 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 800, color: T.text }}>
          {title}
          {english ? <span style={{ color: T.text3, fontWeight: 600 }}> ({english})</span> : null}
        </h2>
      )}
      {children}
    </section>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0] ?? '').join('') || '?';
}
