import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMatchingStore } from '../store/matchingStore';
import { BookingSlotPicker } from '../components/BookingSlotPicker';

export function BookingRequestPage() {
  const navigate = useNavigate();
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
    setError('');
    setIsSubmitting(true);

    // Build booking request (mock — no real API yet)
    const _bookingRequest = {
      teacher_id: match!.teacher.id,
      match_result_id: match!.id,
      requested_start_at: `${selectedDay} ${selectedTime}`,
      requested_end_at: `${selectedDay} ${selectedTime} +1h`,
      student_message: message,
      status: 'pending' as const,
    };

    await new Promise((r) => setTimeout(r, 1000));
    setIsSubmitting(false);
    navigate('/onboarding/confirmation');
  }

  return (
    <div dir="rtl" lang="he" className="min-h-screen px-4 py-10" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-lg mx-auto">
        <button onClick={() => navigate('/onboarding/results')} className="mb-4 text-sm" style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }}>← חזור לתוצאות</button>

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

        <div className="mb-4 p-3 rounded-lg text-center text-sm" style={{ background: 'var(--surface)', border: '1px solid var(--line-2)', color: 'var(--text-3)' }}>
          ⚠️ אין תשלום בשלב זה — רק בקשת שיעור. הסכמה על תשלום תגיע ישירות מהמורה.
        </div>

        <button onClick={() => void handleSubmit()} disabled={isSubmitting} className="w-full py-4 font-bold rounded-xl text-lg" style={{ background: 'var(--cyan)', color: '#0f4544', border: 'none', cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1 }}>
          {isSubmitting ? 'שולח בקשה...' : 'שלח בקשת שיעור ←'}
        </button>
      </div>
    </div>
  );
}
