import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Info } from 'lucide-react';
import { useMatchingStore } from '../store/matchingStore';
import { BookingSlotPicker } from '../components/BookingSlotPicker';
import { useAuth } from '../../../auth/AuthProvider';
import { createBookingRequest } from '../../../api/bookingRequests';

// Hebrew weekday name → JS Date.getDay() (0 = Sunday)
const HEBREW_DAY_TO_DOW: Record<string, number> = {
  ראשון: 0, שני: 1, שלישי: 2, רביעי: 3, חמישי: 4, שישי: 5, שבת: 6,
};

// Build an ISO 8601 datetime with local timezone offset for the next occurrence
// of the given weekday at the given HH:mm time.
function buildIsoDatetime(hebrewDay: string, time: string): string {
  const targetDow = HEBREW_DAY_TO_DOW[hebrewDay];
  if (targetDow === undefined) throw new Error(`Unknown day: ${hebrewDay}`);

  const parts = time.split(':');
  const hours = parseInt(parts[0] ?? '0', 10);
  const minutes = parseInt(parts[1] ?? '0', 10);

  const now = new Date();
  const todayDow = now.getDay();
  let daysAhead = ((targetDow - todayDow) + 7) % 7;

  // If the slot falls today, check whether the time has already passed.
  // If it has, push to the same day next week.
  if (daysAhead === 0) {
    const slotToday = new Date(now);
    slotToday.setHours(hours, minutes, 0, 0);
    if (slotToday <= now) daysAhead = 7;
  }

  const date = new Date(now);
  date.setDate(date.getDate() + daysAhead);
  date.setHours(hours, minutes, 0, 0);

  // Format with explicit timezone offset so the backend z.string().datetime({ offset: true }) accepts it.
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
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!match) {
    return (
      <div dir="rtl" lang="he" className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="text-center">
          <p style={{ color: 'var(--text-2)' }}>לא נמצאה התאמה. חזור לתוצאות.</p>
          <button onClick={() => navigate('/onboarding/results')} className="mt-4 py-2 px-5 rounded-xl" style={{ background: 'var(--cyan)', color: '#0f4544', border: 'none', cursor: 'pointer' }}>חזרה לתוצאות</button>
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
      // Construct end time as start + 1 hour
      const startDate = new Date(requestedStartAt);
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
      const requestedEndAt = buildIsoDatetime(
        selectedDay,
        `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`,
      );

      const result = await createBookingRequest(
        {
          match_result_id: match!.id,
          requested_start_at: requestedStartAt,
          requested_end_at: requestedEndAt,
          ...(message.trim() ? { student_message: message.trim() } : {}),
        },
        accessToken,
      );

      if ('error' in result) {
        setError(result.error ?? 'שגיאה בשליחת הבקשה. נסה שנית.');
        return;
      }

      navigate('/onboarding/confirmation', {
        state: {
          bookingId: result.data.booking_request.id,
          teacherName: match!.teacher.fullName,
        },
      });
    } catch {
      setError('שגיאת תקשורת. בדוק חיבור לאינטרנט ונסה שנית.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div dir="rtl" lang="he" className="min-h-screen px-4 py-10" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-lg mx-auto">
        <button
          onClick={() => navigate('/onboarding/results')}
          className="mb-4 flex items-center gap-1 text-sm"
          style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }}
        >
          <ChevronRight size={16} />
          חזור לתוצאות
        </button>

        <div className="rounded-2xl p-5 mb-5" style={{ background: 'var(--surface)', border: '1px solid var(--line-2)' }}>
          <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>קביעת שיעור עם {match.teacher.fullName}</h1>
          <p style={{ color: 'var(--text-2)', fontSize: 14 }}>{match.teacher.subjects?.join(', ')} | ₪{match.teacher.hourlyRate}/שעה</p>
        </div>

        <div className="rounded-2xl p-5 mb-5" style={{ background: 'var(--surface)', border: '1px solid var(--line-2)' }}>
          <h2 className="font-bold mb-4" style={{ color: 'var(--text)' }}>בחר/י זמן לשיעור הראשון:</h2>
          <BookingSlotPicker selectedDay={selectedDay} selectedTime={selectedTime} onDayChange={setSelectedDay} onTimeChange={setSelectedTime} />
          {error && <div className="mt-3" style={{ color: 'var(--coral)', fontSize: 13 }}>{error}</div>}
        </div>

        <div className="rounded-2xl p-5 mb-5" style={{ background: 'var(--surface)', border: '1px solid var(--line-2)' }}>
          <h2 className="font-bold mb-2" style={{ color: 'var(--text)' }}>הודעה למורה (אופציונלי):</h2>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="ספר/י קצת על מה שצריך..."
            rows={3}
            className="w-full p-3 rounded-xl resize-none"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--line-2)', color: 'var(--text)', fontSize: 14, outline: 'none' }}
          />
        </div>

        <div className="mb-4 p-3 rounded-lg flex items-start gap-2 text-sm" style={{ background: 'var(--surface)', border: '1px solid var(--line-2)', color: 'var(--text-3)' }}>
          <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>אין תשלום בשלב זה — רק בקשת שיעור. הסכמה על תשלום תגיע ישירות מהמורה.</span>
        </div>

        <button
          onClick={() => void handleSubmit()}
          disabled={isSubmitting}
          className="w-full py-4 font-bold rounded-xl text-lg"
          style={{ background: 'var(--cyan)', color: '#0f4544', border: 'none', cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1 }}
        >
          {isSubmitting ? 'שולח בקשה...' : 'שלח בקשת שיעור'}
        </button>
      </div>
    </div>
  );
}
