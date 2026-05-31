import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  BookOpen,
  Calendar,
  CalendarCheck,
  CalendarX,
  CheckCircle2,
  Clock,
  LogOut,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';

import { useAuth } from '../auth/AuthProvider';
import { fetchOnboardingDraft, type OnboardingStateRemote } from '../api/teacherOnboarding';
import {
  fetchCalendarStatus,
  fetchBusySlots,
  type CalendarStatusResult,
} from '../api/teacherCalendar';
import { SB_NEON, SB_ORANGE, SB_ORANGE_SOFT } from '../content/teacherOnboardingContent';

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatLastSynced(iso: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('he-IL', {
      timeZone: 'Asia/Jerusalem',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

/** Returns the set of unique Hebrew day names present in weeklyTimeBlocks keys. */
function uniqueDaysFromBlocks(blocks: string[] = []): string[] {
  const days = new Set(blocks.map((k) => k.split('-').slice(0, -1).join('-')));
  const ORDER = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי'];
  return ORDER.filter((d) => days.has(d));
}

/** Returns which time-of-day sessions appear in the block keys (morning/afternoon/evening). */
function sessionLabelsFromBlocks(blocks: string[] = []): string[] {
  const MAP: Record<string, string> = { morning: 'בוקר', afternoon: 'צהריים', evening: 'ערב' };
  const present = new Set(blocks.map((k) => k.split('-').pop() ?? ''));
  return ['morning', 'afternoon', 'evening'].filter((b) => present.has(b)).map((b) => MAP[b]!);
}

// ── Shared card shell ──────────────────────────────────────────────────────────

function DashCard({
  title,
  icon,
  accentColor = SB_ORANGE,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  accentColor?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--line)',
        overflow: 'hidden',
      }}
    >
      <div style={{ height: 3, background: accentColor }} />
      <div style={{ padding: '20px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span
            style={{
              width: 34,
              height: 34,
              borderRadius: 'var(--radius-sm)',
              background: `color-mix(in oklab, ${accentColor} 15%, transparent)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: accentColor,
              flexShrink: 0,
            }}
          >
            {icon}
          </span>
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--text)',
              fontFamily: 'var(--font-display)',
            }}
          >
            {title}
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Empty state cell ───────────────────────────────────────────────────────────

function EmptyState({ label }: { label: string }) {
  return (
    <div
      style={{
        padding: '16px 0 4px',
        textAlign: 'center',
        color: 'var(--text-3)',
        fontSize: 13,
        fontWeight: 500,
      }}
    >
      {label}
    </div>
  );
}

// ── Stat pill ──────────────────────────────────────────────────────────────────

function StatPill({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: string;
}) {
  return (
    <div
      style={{
        flex: '1 1 0',
        minWidth: 90,
        textAlign: 'center',
        padding: '14px 10px',
        background: 'var(--surface-2)',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--line)',
      }}
    >
      <div
        style={{
          fontSize: 18,
          fontWeight: 900,
          color: accent ?? SB_ORANGE,
          fontFamily: 'var(--font-mono)',
          letterSpacing: '-0.02em',
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3, fontWeight: 500 }}>
        {label}
      </div>
    </div>
  );
}

// ── Page component ─────────────────────────────────────────────────────────────

export function TeacherDashboardPage() {
  const { status, user, profile, session, logout } = useAuth();
  const accessToken = session?.access_token ?? null;

  // Dashboard data — all fetched after auth resolves
  const [draft, setDraft] = useState<OnboardingStateRemote | null>(null);
  const [calStatus, setCalStatus] = useState<CalendarStatusResult>({
    status: 'not_connected',
    lastSyncedAt: null,
  });
  const [busySlotCount, setBusySlotCount] = useState(0);
  const [dataLoading, setDataLoading] = useState(true);

  // Fetch all dashboard data in parallel once we have a token and a completed profile.
  useEffect(() => {
    if (!accessToken || profile?.onboardingCompleted !== true) return;

    let cancelled = false;

    async function load() {
      if (!accessToken) return;
      const [draftRes, calRes, slotsRes] = await Promise.allSettled([
        fetchOnboardingDraft(accessToken),
        fetchCalendarStatus(accessToken),
        fetchBusySlots(accessToken),
      ]);

      if (cancelled) return;

      if (draftRes.status === 'fulfilled' && !('error' in draftRes.value)) {
        setDraft(draftRes.value.data.onboarding);
      }
      if (calRes.status === 'fulfilled') {
        setCalStatus(calRes.value);
      }
      if (slotsRes.status === 'fulfilled') {
        setBusySlotCount(slotsRes.value.length);
      }
      setDataLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [accessToken, profile?.onboardingCompleted]);

  // ── Auth loading ────────────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div
        style={{
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg)',
        }}
      >
        <span
          className="ob-spin"
          style={{
            display: 'block',
            width: 28,
            height: 28,
            border: `3px solid ${SB_NEON}44`,
            borderTopColor: SB_NEON,
            borderRadius: '50%',
          }}
        />
      </div>
    );
  }

  // ── Profile resolving: teacher but profile not yet loaded ───────────────────
  if (status === 'authenticated' && user?.role === 'teacher' && profile === null) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg)',
        }}
      >
        <span
          className="ob-spin"
          style={{
            display: 'block',
            width: 28,
            height: 28,
            border: `3px solid ${SB_NEON}44`,
            borderTopColor: SB_NEON,
            borderRadius: '50%',
          }}
        />
      </div>
    );
  }

  // ── Guard: onboarding not complete → back to wizard ────────────────────────
  if (status === 'authenticated' && profile?.onboardingCompleted === false) {
    return <Navigate replace to="/teacher-onboarding" />;
  }

  // ── Derived display values ──────────────────────────────────────────────────
  const teacherName = user?.full_name ?? draft?.fullName ?? '';
  const hourlyRate = draft?.hourlyRate && draft.hourlyRate > 0 ? `₪${draft.hourlyRate}` : '—';
  const subjectCount = draft?.draft?.selectedSubjects?.length ?? 0;
  const weeklyHours = draft?.draft?.weeklyTeachingHours ?? null;
  const maxStudents = draft?.draft?.maxActiveStudents ?? null;
  const availabilityMode = draft?.draft?.availabilityMode ?? null;
  const weeklyTimeBlocks: string[] = draft?.draft?.weeklyTimeBlocks ?? [];
  const weeklyAvailability: string[] = draft?.draft?.weeklyAvailability ?? [];

  const availDays = weeklyTimeBlocks.length > 0 ? uniqueDaysFromBlocks(weeklyTimeBlocks) : weeklyAvailability;
  const sessionLabels = sessionLabelsFromBlocks(weeklyTimeBlocks);
  const isGcalConnected = calStatus.status === 'connected';
  const lastSyncedDisplay = formatLastSynced(calStatus.lastSyncedAt);

  // ── Data loading spinner (overlay content, not the whole page) ─────────────
  const showDataSpinner = dataLoading;

  return (
    <div
      dir="rtl"
      lang="he"
      style={{
        minHeight: '100dvh',
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── Top nav ─────────────────────────────────────────────────────────── */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 24px',
          borderBottom: '1px solid var(--line)',
          background: 'var(--surface)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              width: 32,
              height: 32,
              borderRadius: 'var(--radius-sm)',
              background: SB_ORANGE_SOFT,
              border: `1.5px solid ${SB_ORANGE}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: SB_ORANGE,
            }}
          >
            <BookOpen size={16} />
          </span>
          <span
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: 'var(--text)',
              fontFamily: 'var(--font-display)',
              letterSpacing: '-0.02em',
            }}
          >
            StudyBuddy
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--text-3)',
              paddingRight: 8,
              borderRight: '1px solid var(--line)',
              marginRight: 0,
            }}
          >
            דשבורד מורה
          </span>
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 14px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--line)',
            background: 'transparent',
            color: 'var(--text-3)',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
          }}
        >
          <LogOut size={14} />
          התנתק
        </button>
      </header>

      {/* ── Page body ───────────────────────────────────────────────────────── */}
      <main
        style={{
          flex: 1,
          maxWidth: 860,
          width: '100%',
          margin: '0 auto',
          padding: '32px 20px 60px',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
        }}
      >
        {/* ── Welcome header ────────────────────────────────────────────────── */}
        <div className="ob-step-enter">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
              marginBottom: 6,
            }}
          >
            <h1
              style={{
                fontSize: 26,
                fontWeight: 900,
                color: 'var(--text)',
                fontFamily: 'var(--font-display)',
                letterSpacing: '-0.025em',
                margin: 0,
              }}
            >
              שלום, {teacherName || 'מורה'} 👋
            </h1>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 10px',
                borderRadius: 999,
                background: 'rgba(34,197,94,0.12)',
                border: '1px solid rgba(34,197,94,0.35)',
                color: '#22c55e',
                fontSize: 12,
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
              }}
            >
              <CheckCircle2 size={12} />
              פרופיל פעיל
            </span>
          </div>
          <p style={{ fontSize: 14, color: 'var(--text-3)', margin: 0, fontWeight: 500 }}>
            הגדרת הפרופיל הושלמה בהצלחה. הנה סיכום מצב החשבון שלך.
          </p>
        </div>

        {/* ── Quick stats row ───────────────────────────────────────────────── */}
        {showDataSpinner ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
            <span
              className="ob-spin"
              style={{
                display: 'block',
                width: 22,
                height: 22,
                border: `3px solid ${SB_NEON}44`,
                borderTopColor: SB_NEON,
                borderRadius: '50%',
              }}
            />
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <StatPill label="תעריף שעתי" value={hourlyRate} accent={SB_ORANGE} />
            <StatPill
              label="מקצועות"
              value={subjectCount > 0 ? subjectCount : '—'}
              accent={SB_NEON}
            />
            <StatPill
              label="שעות/שבוע"
              value={weeklyHours != null ? weeklyHours : '—'}
              accent={SB_ORANGE}
            />
            <StatPill
              label="מקס׳ תלמידים"
              value={maxStudents != null ? maxStudents : '—'}
              accent={SB_NEON}
            />
          </div>
        )}

        {/* ── Two-column grid: availability + subjects ──────────────────────── */}
        {!showDataSpinner && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 16,
            }}
          >
            {/* Availability / Calendar card */}
            <DashCard
              title="זמינות ולוח שנה"
              icon={<Calendar size={17} />}
              accentColor={isGcalConnected ? SB_NEON : SB_ORANGE}
            >
              {/* Connection status */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: isGcalConnected
                    ? `color-mix(in oklab, ${SB_NEON} 10%, transparent)`
                    : 'var(--surface-2)',
                  border: `1px solid ${isGcalConnected ? `color-mix(in oklab, ${SB_NEON} 30%, transparent)` : 'var(--line)'}`,
                  marginBottom: 14,
                }}
              >
                {isGcalConnected ? (
                  <CalendarCheck size={15} style={{ color: SB_NEON, flexShrink: 0 }} />
                ) : (
                  <CalendarX size={15} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
                )}
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: isGcalConnected ? SB_NEON : 'var(--text-2)',
                    }}
                  >
                    {isGcalConnected
                      ? 'Google Calendar מחובר'
                      : availabilityMode === 'manual'
                        ? 'זמינות ידנית'
                        : 'לא מחובר'}
                  </div>
                  {isGcalConnected && lastSyncedDisplay && (
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                      סנכרון אחרון: {lastSyncedDisplay}
                    </div>
                  )}
                </div>
                {isGcalConnected && busySlotCount > 0 && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: SB_NEON,
                      fontFamily: 'var(--font-mono)',
                      background: `color-mix(in oklab, ${SB_NEON} 12%, transparent)`,
                      borderRadius: 999,
                      padding: '2px 8px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {busySlotCount} חסומים
                  </span>
                )}
              </div>

              {/* Available days */}
              {availDays.length > 0 && (
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--text-3)',
                      fontWeight: 600,
                      marginBottom: 8,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    ימים זמינים
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {availDays.map((day) => (
                      <span
                        key={day}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 999,
                          background: SB_ORANGE_SOFT,
                          border: `1px solid ${SB_ORANGE}55`,
                          color: SB_ORANGE,
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        {day}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Time-of-day blocks */}
              {sessionLabels.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--text-3)',
                      fontWeight: 600,
                      marginBottom: 8,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    שעות פעילות
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {sessionLabels.map((label) => (
                      <span
                        key={label}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 999,
                          background: 'var(--surface-2)',
                          border: '1px solid var(--line)',
                          color: 'var(--text-2)',
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {availDays.length === 0 && sessionLabels.length === 0 && (
                <EmptyState label="טרם הוגדרה זמינות שבועית" />
              )}
            </DashCard>

            {/* Subjects card */}
            <DashCard title="מקצועות ורמות" icon={<BookOpen size={17} />} accentColor={SB_ORANGE}>
              {subjectCount > 0 ? (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {(draft?.draft?.selectedSubjects ?? []).map((s) => (
                    <span
                      key={s}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 999,
                        background: SB_ORANGE_SOFT,
                        border: `1px solid ${SB_ORANGE}55`,
                        color: SB_ORANGE,
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              ) : (
                <EmptyState label="לא נבחרו מקצועות עדיין" />
              )}
            </DashCard>
          </div>
        )}

        {/* ── Empty-state activity cards ────────────────────────────────────── */}
        {!showDataSpinner && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 16,
            }}
          >
            <DashCard title="תלמידים פעילים" icon={<Users size={17} />} accentColor={SB_NEON}>
              <EmptyState label="אין תלמידים פעילים עדיין" />
              <div
                style={{
                  marginTop: 12,
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: `color-mix(in oklab, ${SB_NEON} 7%, transparent)`,
                  border: `1px solid color-mix(in oklab, ${SB_NEON} 20%, transparent)`,
                  fontSize: 12,
                  color: 'var(--text-3)',
                  lineHeight: 1.5,
                }}
              >
                תלמידים יופיעו כאן לאחר שתתאמו לבקשות ראשונות.
              </div>
            </DashCard>

            <DashCard title="שיעורים קרובים" icon={<Clock size={17} />} accentColor={SB_ORANGE}>
              <EmptyState label="אין שיעורים מתוכננים" />
              <div
                style={{
                  marginTop: 12,
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: SB_ORANGE_SOFT,
                  border: `1px solid ${SB_ORANGE}33`,
                  fontSize: 12,
                  color: 'var(--text-3)',
                  lineHeight: 1.5,
                }}
              >
                שיעורים מאושרים יופיעו כאן עם תאריך, שעה וקישור.
              </div>
            </DashCard>

            <DashCard
              title="בקשות ממתינות"
              icon={<Zap size={17} />}
              accentColor="#a855f7"
            >
              <EmptyState label="אין בקשות חדשות" />
              <div
                style={{
                  marginTop: 12,
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(168,85,247,0.08)',
                  border: '1px solid rgba(168,85,247,0.2)',
                  fontSize: 12,
                  color: 'var(--text-3)',
                  lineHeight: 1.5,
                }}
              >
                בקשות התאמה חדשות מתלמידים יופיעו כאן לאישורך.
              </div>
            </DashCard>

            <DashCard title="הכנסות" icon={<TrendingUp size={17} />} accentColor="#22c55e">
              <EmptyState label="אין נתוני הכנסות עדיין" />
              <div
                style={{
                  marginTop: 12,
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(34,197,94,0.07)',
                  border: '1px solid rgba(34,197,94,0.2)',
                  fontSize: 12,
                  color: 'var(--text-3)',
                  lineHeight: 1.5,
                }}
              >
                סיכום תשלומים ושעות הוראה יועמס ממערכת החיובים.
              </div>
            </DashCard>
          </div>
        )}

        {/* ── Setup complete banner ─────────────────────────────────────────── */}
        {!showDataSpinner && (
          <div
            style={{
              padding: '16px 20px',
              borderRadius: 'var(--radius)',
              background: 'rgba(34,197,94,0.07)',
              border: '1px solid rgba(34,197,94,0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <CheckCircle2 size={18} style={{ color: '#22c55e', flexShrink: 0 }} />
            <div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#22c55e',
                  marginBottom: 3,
                }}
              >
                הגדרת הפרופיל הושלמה
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                הפרופיל שלך פעיל ומוכן לקבלת תלמידים. תכונות נוספות יהיו זמינות עם צמיחת הפלטפורמה.
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
