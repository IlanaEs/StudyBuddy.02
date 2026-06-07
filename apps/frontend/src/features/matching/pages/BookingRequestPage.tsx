import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Info, Send, Layers, AlertCircle } from 'lucide-react';
import { useMediaQuery } from '@mantine/hooks';
import { useMatchingStore } from '../store/matchingStore';
import { BookingAvailabilityGrid } from '../components/BookingAvailabilityGrid';
import type { GridSelection } from '../components/BookingAvailabilityGrid';
import { useAuth } from '../../../auth/AuthProvider';
import { createBookingRequest } from '../../../api/bookingRequests';
import { linkAttachments } from '../../../api/attachments';
import { getTeacherAvailableSlotsRange } from '../api/teacherAvailabilityRange';
import type { DatedSlot } from '../api/teacherAvailabilityRange';
import { AttachmentDropzone } from '../components/AttachmentDropzone';
import { FloatingLabelInput } from '../../../components/onboarding/v2/FloatingLabelInput';
import {
  WizardShell,
  WizardFooter,
  BentoCard,
  GlobalStateCard,
  UrgentButton,
  sbTokens as sb,
} from '../../../design-system';
import { dayLabel, dayWindow, jerusalemHHMM, jerusalemToday, priceTotal } from '../utils/bookingGrid';

export function BookingRequestPage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const { matchResults, selectedMatchId, intake } = useMatchingStore();
  const match = matchResults.find((r) => r.id === selectedMatchId);
  const isNarrow = useMediaQuery('(max-width: 820px)') ?? false;
  const token = auth.session?.access_token ?? null;

  const dates = useMemo(() => dayWindow(jerusalemToday(), 10), []);
  const [availableByDate, setAvailableByDate] = useState<Record<string, DatedSlot[]>>({});
  const [slotsLoading, setSlotsLoading] = useState(true);

  const [doubleMode, setDoubleMode] = useState(false);
  const [selection, setSelection] = useState<GridSelection | null>(null);
  const [topic, setTopic] = useState('');
  const [message, setMessage] = useState('');
  const [attachmentIds, setAttachmentIds] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const teacherId = match?.teacher.id ?? null;

  // Fetch the 10-day dated availability window once.
  useEffect(() => {
    if (!token || !teacherId) {
      setSlotsLoading(false);
      return;
    }
    setSlotsLoading(true);
    getTeacherAvailableSlotsRange(token, teacherId, dates[0]!, 10, 60).then((res) => {
      if (!('error' in res)) {
        const map: Record<string, DatedSlot[]> = {};
        for (const d of res.data.days) map[d.date] = d.available_slots;
        setAvailableByDate(map);
      }
      setSlotsLoading(false);
    });
  }, [token, teacherId, dates]);

  // ── No-match guard ──────────────────────────────────────────────────────────
  if (!match) {
    return (
      <div dir="rtl" lang="he" style={{ minHeight: '100dvh', background: sb.bgCanvas }}>
        <GlobalStateCard
          variant="error"
          fullPage
          icon={<AlertCircle size={32} />}
          title="לא נמצאה התאמה"
          description="חזרו לתוצאות כדי לבחור מורה."
          cta={{ label: 'חזרה לתוצאות (Back)', onClick: () => navigate('/onboarding/results') }}
        />
      </div>
    );
  }

  const rate = match.teacher.hourlyRate;
  const subjects = match.teacher.subjects?.join(' · ');
  const selectionMinutes = selection
    ? Math.round((new Date(selection.endAt).getTime() - new Date(selection.startAt).getTime()) / 60000)
    : 0;
  const isDoubleSelection = selectionMinutes > 60;
  const total = selection ? priceTotal(rate, isDoubleSelection) : null;

  function toggleDouble() {
    setDoubleMode((v) => !v);
    setSelection(null); // selection shape changes with mode; reset to avoid mismatch
    setError('');
  }

  async function handleSubmit() {
    if (!selection) {
      setError('נא לבחור מועד לשיעור');
      return;
    }
    const accessToken = auth.session?.access_token;
    if (!accessToken) {
      setError('יש להתחבר מחדש כדי לשלוח בקשה');
      return;
    }

    setError('');
    setSubmitError('');
    setIsSubmitting(true);

    try {
      // The booking_request has a single free-text field; fold the lesson topic
      // and the optional note into student_message (no lifecycle/schema change).
      const parts = [topic.trim(), message.trim()].filter(Boolean);
      const studentMessage = parts.join('\n\n');

      const result = await createBookingRequest(
        {
          match_result_id: match!.id,
          requested_start_at: selection.startAt,
          requested_end_at: selection.endAt,
          ...(studentMessage ? { student_message: studentMessage } : {}),
        },
        accessToken,
      );

      if ('error' in result) {
        setSubmitError(result.error ?? 'שגיאה בשליחת הבקשה. נסו שנית.');
        return;
      }

      // Link any uploaded attachments to the new booking_request (additive,
      // non-blocking: the booking is already created and valid).
      if (attachmentIds.length > 0) {
        await linkAttachments(accessToken, result.data.booking_request.id, attachmentIds);
      }

      const lbl = dayLabel(selection.date);
      navigate('/onboarding/confirmation', {
        state: {
          bookingId: result.data.booking_request.id,
          teacherName: match!.teacher.fullName,
          subjectName: intake.subjectName || (match!.teacher.subjects?.[0] ?? null),
          whenLabel: `${lbl.weekday} ${lbl.dm}, ${jerusalemHHMM(selection.startAt)}–${jerusalemHHMM(selection.endAt)}`,
          priceLabel: total != null ? `₪${total}` : null,
        },
      });
    } catch {
      setSubmitError('שגיאת תקשורת. בדקו חיבור לאינטרנט ונסו שנית.');
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Submit in-flight ────────────────────────────────────────────────────────
  if (isSubmitting) {
    return (
      <div dir="rtl" lang="he" style={{ minHeight: '100dvh', background: sb.bgCanvas }}>
        <GlobalStateCard variant="loading" fullPage title="שולח בקשת שיעור…" description="רגע, שולחים את הבקשה למורה." />
      </div>
    );
  }

  // ── Submit failure → retry ──────────────────────────────────────────────────
  if (submitError) {
    return (
      <div dir="rtl" lang="he" style={{ minHeight: '100dvh', background: sb.bgCanvas }}>
        <GlobalStateCard
          variant="error"
          fullPage
          icon={<AlertCircle size={32} />}
          title={submitError}
          cta={{ label: 'נסה שוב (Retry)', onClick: () => setSubmitError('') }}
        />
      </div>
    );
  }

  const header = (
    <div>
      <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', color: sb.active, fontFamily: sb.fontUi }}>
        קביעת שיעור (Book a Lesson)
      </p>
      <h2 style={{ margin: '6px 0 0', fontSize: 20, fontWeight: 800, color: sb.textPrimary, fontFamily: sb.fontUi }}>
        {match.teacher.fullName}
      </h2>
    </div>
  );

  const footer = (
    <WizardFooter
      onBack={() => navigate('/onboarding/results')}
      backLabel="חזרה לתוצאות (Back)"
      nextLabel=""
      primary={
        <UrgentButton onClick={() => void handleSubmit()} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <Send size={17} />
          שלח בקשת שיעור (Send Request)
        </UrgentButton>
      }
    />
  );

  return (
    <WizardShell header={header} totalSteps={3} currentStep={2} stepKey="booking" footer={footer}>
      <div style={{ display: 'grid', gridTemplateColumns: isNarrow ? '1fr' : '1.45fr 1fr', gap: 16, alignItems: 'start', marginTop: 4 }}>
        {/* Left column: teacher profile + availability grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <BentoCard hover={false}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                aria-hidden="true"
                style={{
                  width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `color-mix(in oklab, ${sb.active} 16%, transparent)`, color: sb.active,
                  fontWeight: 800, fontSize: 19, border: `1px solid ${sb.borderCyber}`,
                }}
              >
                {initials(match.teacher.fullName)}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 17, fontWeight: 800, color: sb.textPrimary }}>{match.teacher.fullName}</div>
                <div style={{ fontSize: 13.5, color: sb.textSecondary }}>
                  {subjects ? `${subjects} · ` : ''}
                  <span style={{ fontFamily: sb.fontMono, color: sb.primaryCta }}>₪{rate}/שעה</span>
                </div>
              </div>
            </div>
          </BentoCard>

          <BentoCard title="בחירת מועד" english="Select Time" hover={false}>
            <BookingAvailabilityGrid
              availabilitySlots={match.teacher.availabilitySlots}
              dates={dates}
              availableByDate={availableByDate}
              loading={slotsLoading}
              doubleMode={doubleMode}
              selection={selection}
              onSelect={(sel) => {
                setSelection(sel);
                setError('');
              }}
            />

            {/* Double-lesson toggle */}
            <button
              type="button"
              onClick={toggleDouble}
              aria-pressed={doubleMode}
              style={{
                marginTop: 14,
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '9px 14px', borderRadius: sb.radiusButton,
                border: `1.5px solid ${doubleMode ? sb.active : sb.borderCyber}`,
                background: doubleMode ? `color-mix(in oklab, ${sb.active} 14%, transparent)` : 'transparent',
                color: doubleMode ? sb.active : sb.textSecondary,
                fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
                transition: 'border-color 250ms ease-out, color 250ms ease-out, background 250ms ease-out',
              }}
            >
              <Layers size={16} />
              שיעור כפול (Double Lesson)
            </button>
            {doubleMode && (
              <p style={{ margin: '8px 0 0', fontSize: 12, color: sb.textMuted }}>
                בחרו משבצת פנויה ולצידה משבצת עוקבת פנויה — השיעור יוזמן ל-120 דקות.
              </p>
            )}
          </BentoCard>
        </div>

        {/* Right column: lesson details + pricing + info + CTA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <BentoCard title="פרטי השיעור" english="Lesson Details" hover={false}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* FloatingLabelInput depends on .tow-scoped vars (--tow-font / --tow-neon);
                  wrap only this field so it keeps its exact look without migrating the
                  shared component (also used by teacher-onboarding v2). Seam to remove
                  when that wizard migrates to DS. */}
              <div className="tow">
                <FloatingLabelInput label="על מה יהיה השיעור?" value={topic} onChange={setTopic} />
              </div>

              {/* Asset Dropzone — uploads to private storage; linked on submit. */}
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: sb.textSecondary, marginBottom: 6 }}>
                  צירוף קבצים (Attachments)
                </div>
                <AttachmentDropzone onChange={setAttachmentIds} />
              </div>

              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: sb.textSecondary, marginBottom: 6 }}>הודעה למורה (אופציונלי)</div>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="ספרו קצת על מה שצריך…"
                  rows={3}
                  style={{
                    width: '100%', padding: 12, borderRadius: sb.radiusButton, resize: 'vertical',
                    background: sb.glassSoft,
                    border: `1px solid ${sb.borderCyber}`, color: sb.textPrimary, fontSize: 14, outline: 'none',
                    fontFamily: sb.fontUi,
                  }}
                />
              </div>
            </div>
          </BentoCard>

          {/* Pricing summary */}
          <BentoCard title="תמחור" english="Price" hover={false}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Row label="מחיר לשעה" value={`₪${rate}`} />
              <Row label={isDoubleSelection ? 'סה״כ (שיעור כפול)' : 'סה״כ'} value={total != null ? `₪${total}` : '—'} emphasize />
              {!selection && <p style={{ margin: 0, fontSize: 12, color: sb.textMuted }}>בחרו מועד כדי לראות את המחיר הכולל.</p>}
            </div>
          </BentoCard>

          {/* Info bar — no payment at this stage. */}
          <div
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 8, padding: '12px 14px',
              borderRadius: sb.radiusButton, borderInlineStart: `3px solid ${sb.success}`,
              background: sb.glassSoft, color: sb.textSecondary, fontSize: 13,
            }}
          >
            <Info size={15} style={{ flexShrink: 0, marginTop: 1, color: sb.success }} />
            <span>אין תשלום בשלב זה — רק בקשת שיעור. הסכמה על תשלום תגיע ישירות מהמורה.</span>
          </div>

          {error && <div style={{ color: sb.error, fontSize: 13 }}>{error}</div>}
        </div>
      </div>
    </WizardShell>
  );
}

function Row({ label, value, emphasize }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <span style={{ fontSize: 13.5, color: sb.textSecondary }}>{label}</span>
      <span
        style={{
          fontFamily: sb.fontMono,
          fontWeight: 800,
          fontSize: emphasize ? 20 : 14,
          color: emphasize ? sb.active : sb.textPrimary,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0] ?? '').join('') || '?';
}
