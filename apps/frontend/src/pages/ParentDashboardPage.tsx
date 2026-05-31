import { useState } from 'react';
import { Calendar, CreditCard, Sun, BookOpen, ChevronLeft } from 'lucide-react';

import { mockParentData } from '../features/parent/data/mockParentData';
import type { ChildDashboardData } from '../features/parent/data/mockParentData';

// ── Design tokens ─────────────────────────────────────────────────────────────

const SB_NEON = '#00f6ff';
const SB_ORANGE = '#fc6d17';
const SB_SUCCESS = '#bbe341';

const CARD_BASE: React.CSSProperties = {
  background: 'rgba(63, 126, 118, 0.55)',
  border: '1px solid #016c7c',
  borderRadius: 'var(--radius-lg)',
  backdropFilter: 'blur(12px) saturate(140%)',
  WebkitBackdropFilter: 'blur(12px) saturate(140%)',
  overflow: 'hidden',
  boxShadow: '0 1px 0 rgba(255,255,255,0.06) inset, 0 18px 40px -24px rgba(0,0,0,0.72)',
};

// ── Shared sub-components ──────────────────────────────────────────────────────

function CardHeader({
  icon,
  title,
  accentColor = SB_NEON,
}: {
  icon: React.ReactNode;
  title: string;
  accentColor?: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
      <span
        style={{
          width: 32,
          height: 32,
          borderRadius: 'var(--radius-sm)',
          background: `color-mix(in oklab, ${accentColor} 15%, transparent)`,
          border: `1px solid color-mix(in oklab, ${accentColor} 28%, transparent)`,
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
          fontSize: 13,
          fontWeight: 700,
          color: 'var(--text-2)',
          fontFamily: 'var(--font-display)',
          letterSpacing: '-0.01em',
        }}
      >
        {title}
      </span>
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: 'rgba(220,245,240,0.1)', margin: '14px 0' }} />;
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: 'var(--text-3)',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        fontFamily: 'var(--font-mono)',
      }}
    >
      {children}
    </div>
  );
}

// ── Card 1: Upcoming Lesson ────────────────────────────────────────────────────

function UpcomingLessonCard({
  childName,
  data,
  className,
}: {
  childName: string;
  data: ChildDashboardData['upcomingLesson'];
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{ ...CARD_BASE, padding: '20px 22px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
    >
      <CardHeader icon={<Calendar size={16} />} title='הלו"ז הקרוב' accentColor={SB_NEON} />
      {data ? (
        <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text)', lineHeight: 1.65 }}>
          השיעור הבא של {childName}:{' '}
          <span style={{ color: SB_NEON, fontWeight: 700 }}>{data.subject}</span> עם{' '}
          <span style={{ color: 'var(--text)' }}>{data.teacherName}</span> ביום {data.day},{' '}
          {data.date} בשעה{' '}
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{data.time}</span>.
        </p>
      ) : (
        <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: 'var(--text-3)', lineHeight: 1.65 }}>
          אין ל{childName} שיעורים מתוזמנים לימים הקרובים.
        </p>
      )}
    </div>
  );
}

// ── Card 2: Pending Approval ───────────────────────────────────────────────────

function PendingApprovalCard({
  data,
  onApprove,
  className,
}: {
  data: ChildDashboardData['pendingApproval'];
  onApprove: () => void;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        ...CARD_BASE,
        padding: '20px 22px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <CardHeader
        icon={<CreditCard size={16} />}
        title="מחכה לטיפולך"
        accentColor={data ? SB_ORANGE : 'var(--text-3)'}
      />
      {data ? (
        <>
          <p style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 500, color: 'var(--text-2)', lineHeight: 1.65, flex: 1 }}>
            המורה{' '}
            <span style={{ fontWeight: 700, color: 'var(--text)' }}>{data.teacherName}</span> סימן
            שהשיעור ב{data.subject} מתאריך {data.date} בוצע ושולם{' '}
            (<span style={{ fontFamily: 'var(--font-mono)', color: SB_SUCCESS }}>₪{data.amount}</span>).{' '}
            הכל תקין?
          </p>
          <button
            type="button"
            onClick={onApprove}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
              width: '100%',
              padding: '10px 16px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: SB_SUCCESS,
              color: '#1a2a00',
              fontSize: 13,
              fontWeight: 800,
              fontFamily: 'var(--font-display)',
              cursor: 'pointer',
              transition: 'transform 0.15s ease, filter 0.15s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.08)';
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.filter = '';
              (e.currentTarget as HTMLButtonElement).style.transform = '';
            }}
          >
            <CreditCard size={14} />
            אישור וסגירת השיעור
          </button>
        </>
      ) : (
        <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--text-3)', lineHeight: 1.65 }}>
          הכל סגור! אין שיעורים שממתינים לאישור תשלום.
        </p>
      )}
    </div>
  );
}

// ── Card 3: Latest Lesson Update ──────────────────────────────────────────────

function LatestLessonCard({
  childName,
  data,
  className,
}: {
  childName: string;
  data: ChildDashboardData['latestLessonUpdate'];
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{ ...CARD_BASE, padding: '22px 24px', display: 'flex', flexDirection: 'column' }}
    >
      <CardHeader
        icon={<BookOpen size={16} />}
        title={`עדכון מהשיעור האחרון של ${childName}`}
        accentColor={SB_NEON}
      />

      {data ? (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          {/* Teacher note */}
          <div>
            <SectionLabel>מה המורה כתב</SectionLabel>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: 'var(--text)', lineHeight: 1.65 }}>
              {data.teacherNote}
            </p>
          </div>

          <Divider />

          {/* Homework */}
          <div>
            <SectionLabel>שיעורי בית</SectionLabel>
            {data.homework === 'none' ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: `color-mix(in oklab, ${SB_SUCCESS} 12%, transparent)`,
                  border: `1px solid color-mix(in oklab, ${SB_SUCCESS} 28%, transparent)`,
                }}
              >
                <Sun size={15} style={{ color: SB_SUCCESS, flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: SB_SUCCESS }}>
                  אין משימות פתוחות מהשיעור הזה. חופש!
                </span>
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: 'var(--text)', lineHeight: 1.65 }}>
                {data.homework.description}
              </p>
            )}
          </div>

          <Divider />

          {/* Task status pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 'auto' }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--text-3)',
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              סטטוס המשימה אצל הילד:
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '4px 12px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                background:
                  data.taskStatus === 'completed'
                    ? `color-mix(in oklab, ${SB_SUCCESS} 15%, transparent)`
                    : `color-mix(in oklab, ${SB_NEON} 12%, transparent)`,
                border:
                  data.taskStatus === 'completed'
                    ? `1px solid color-mix(in oklab, ${SB_SUCCESS} 35%, transparent)`
                    : `1px solid color-mix(in oklab, ${SB_NEON} 28%, transparent)`,
                color: data.taskStatus === 'completed' ? SB_SUCCESS : SB_NEON,
              }}
            >
              {data.taskStatus === 'completed' ? 'סימן שהושלם' : 'בתהליך'}
            </span>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: 'var(--text-3)', textAlign: 'center' }}>
            אין עדיין עדכון שיעור עבור {childName}.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Card 4: Find a New Teacher ────────────────────────────────────────────────

function FindTeacherCard({
  childName,
  className,
}: {
  childName: string;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{ ...CARD_BASE, padding: '22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
    >
      <div>
        <CardHeader
          icon={<ChevronLeft size={16} />}
          title="צריכים עזרה במשהו חדש?"
          accentColor={SB_NEON}
        />
        <p style={{ margin: '0 0 20px', fontSize: 13, fontWeight: 500, color: 'var(--text-2)', lineHeight: 1.65 }}>
          הבוט שלנו יעזור לך למצוא מורה מדויק עבור{' '}
          <span style={{ fontWeight: 700, color: 'var(--text)' }}>{childName}</span> תוך דקה.
        </p>
      </div>
      {/* TODO: navigate to /onboarding/matching with child context pre-filled */}
      <button
        type="button"
        onClick={() => {
          // TODO: navigate to matching flow with child context pre-filled
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 7,
          width: '100%',
          padding: '11px 16px',
          borderRadius: 'var(--radius-sm)',
          border: 'none',
          background: SB_NEON,
          color: '#042a2a',
          fontSize: 13,
          fontWeight: 800,
          fontFamily: 'var(--font-display)',
          cursor: 'pointer',
          transition: 'transform 0.15s ease, filter 0.15s ease',
          lineHeight: 1,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.08)';
          (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.filter = '';
          (e.currentTarget as HTMLButtonElement).style.transform = '';
        }}
      >
        מצא מורה חדש ל-{childName}
      </button>
    </div>
  );
}

// ── Card 5: Previous Lessons ──────────────────────────────────────────────────

function PreviousLessonsCard({
  childName,
  lessons,
  className,
}: {
  childName: string;
  lessons: ChildDashboardData['previousLessons'];
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{ ...CARD_BASE, padding: '22px', display: 'flex', flexDirection: 'column' }}
    >
      <CardHeader
        icon={<Calendar size={16} />}
        title={`שיעורים קודמים של ${childName}`}
        accentColor={SB_ORANGE}
      />

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        {lessons.slice(0, 3).map((lesson, i) => (
          <div key={i}>
            {i > 0 && <Divider />}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
                  {lesson.date}
                </span>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {lesson.teacherName} · {lesson.subject}
                </span>
              </div>
              <span
                style={{
                  flexShrink: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '3px 9px',
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  background:
                    lesson.status === 'closed'
                      ? `color-mix(in oklab, ${SB_SUCCESS} 12%, transparent)`
                      : `color-mix(in oklab, ${SB_ORANGE} 12%, transparent)`,
                  border:
                    lesson.status === 'closed'
                      ? `1px solid color-mix(in oklab, ${SB_SUCCESS} 28%, transparent)`
                      : `1px solid color-mix(in oklab, ${SB_ORANGE} 28%, transparent)`,
                  color: lesson.status === 'closed' ? SB_SUCCESS : SB_ORANGE,
                  whiteSpace: 'nowrap',
                }}
              >
                {lesson.status === 'closed' ? 'סגור' : 'ממתין לאישור'}
              </span>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        style={{
          marginTop: 18,
          background: 'none',
          border: 'none',
          padding: 0,
          color: 'var(--text-3)',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          textAlign: 'right',
          fontFamily: 'var(--font-body)',
          transition: 'color 0.15s ease',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = SB_NEON;
          (e.currentTarget as HTMLButtonElement).style.textDecoration = 'underline';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-3)';
          (e.currentTarget as HTMLButtonElement).style.textDecoration = 'none';
        }}
      >
        לצפייה בהיסטוריית הלמידה המלאה
      </button>
    </div>
  );
}

// ── Child Selector ─────────────────────────────────────────────────────────────

function ChildSelector({
  children,
  selectedId,
  onSelect,
}: {
  children: { id: string; name: string }[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '16px 0 4px' }}>
      <span
        style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-3)', whiteSpace: 'nowrap', flexShrink: 0 }}
      >
        בחר ילד לצפייה:
      </span>
      <div style={{ display: 'flex', gap: 14 }}>
        {children.map((child) => {
          const isSelected = child.id === selectedId;
          return (
            <button
              key={child.id}
              type="button"
              aria-label={`הצג דשבורד עבור ${child.name}`}
              aria-pressed={isSelected}
              onClick={() => onSelect(child.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 4,
                opacity: isSelected ? 1 : 0.6,
                transition: 'opacity 0.2s ease, transform 0.2s ease',
              }}
              onMouseEnter={(e) => {
                const btn = e.currentTarget as HTMLButtonElement;
                btn.style.transform = 'scale(1.05)';
                if (!isSelected) btn.style.opacity = '0.85';
              }}
              onMouseLeave={(e) => {
                const btn = e.currentTarget as HTMLButtonElement;
                btn.style.transform = '';
                if (!isSelected) btn.style.opacity = '0.6';
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  border: isSelected ? `2px solid ${SB_NEON}` : '1.5px solid rgba(220,245,240,0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 17,
                  fontWeight: 800,
                  color: isSelected ? SB_NEON : 'var(--text-2)',
                  fontFamily: 'var(--font-display)',
                  background: isSelected
                    ? `color-mix(in oklab, ${SB_NEON} 10%, transparent)`
                    : 'rgba(63,126,118,0.3)',
                  boxShadow: isSelected
                    ? `0 0 0 3px color-mix(in oklab, ${SB_NEON} 18%, transparent), 0 0 16px -4px color-mix(in oklab, ${SB_NEON} 40%, transparent)`
                    : 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                {child.name.charAt(0)}
              </div>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: isSelected ? SB_NEON : 'var(--text-3)',
                  fontFamily: 'var(--font-display)',
                  transition: 'color 0.2s ease',
                }}
              >
                {child.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export function ParentDashboardPage() {
  const { parentName, children, dashboardByChild } = mockParentData;
  const [selectedChildId, setSelectedChildId] = useState(children[0]!.id);
  const [visible, setVisible] = useState(true);
  const [approvedChildren, setApprovedChildren] = useState<Set<string>>(new Set());

  const selectedChild = children.find((c) => c.id === selectedChildId)!;
  const rawData = dashboardByChild[selectedChildId]!;
  const data: ChildDashboardData = {
    ...rawData,
    pendingApproval: approvedChildren.has(selectedChildId) ? null : rawData.pendingApproval,
  };

  function handleChildSelect(id: string) {
    if (id === selectedChildId) return;
    setVisible(false);
    setTimeout(() => {
      setSelectedChildId(id);
      setVisible(true);
    }, 200);
  }

  function handleApprove() {
    setApprovedChildren((prev) => new Set([...prev, selectedChildId]));
  }

  return (
    <div
      dir="rtl"
      className="parent-dashboard"
      style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}
    >
      {/* ── Header ──────────────────────────────────────────────────────────── */}
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
              background: `color-mix(in oklab, ${SB_NEON} 12%, transparent)`,
              border: `1.5px solid color-mix(in oklab, ${SB_NEON} 30%, transparent)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: SB_NEON,
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
            }}
          >
            דשבורד הורה
          </span>
        </div>
      </header>

      {/* ── Main ────────────────────────────────────────────────────────────── */}
      <main
        style={{
          flex: 1,
          maxWidth: 1100,
          width: '100%',
          margin: '0 auto',
          padding: '32px 24px 64px',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
        }}
      >
        {/* Welcome */}
        <div className="ob-step-enter">
          <h1
            style={{
              margin: '0 0 4px',
              fontSize: 26,
              fontWeight: 900,
              color: 'var(--text)',
              fontFamily: 'var(--font-display)',
              letterSpacing: '-0.025em',
            }}
          >
            היי {parentName}, איזה כיף לראות אותך.
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-3)', fontWeight: 500 }}>
            הנה סיכום של מה שקורה עם הלמידה של הילדים שלך.
          </p>
        </div>

        {/* Child selector */}
        <ChildSelector children={children} selectedId={selectedChildId} onSelect={handleChildSelect} />

        {/* Bento grid — fade on child switch */}
        <div style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.2s ease' }}>
          {/*
            Grid: 1 col (mobile) → 2 col (md/tablet) → 4 col (lg/desktop)
            Mobile order priority: Approval(1) → Upcoming(2) → Lesson(3) → Help(4) → Previous(5)
            Desktop auto-placement order: Upcoming → Lesson(row-span-2) → Approval → Help → Previous
          */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-4 lg:gap-5">
            {/* Approval — mobile priority 1; desktop after Upcoming+Lesson */}
            <PendingApprovalCard
              data={data.pendingApproval}
              onApprove={handleApprove}
              className="order-1 lg:order-3"
            />

            {/* Upcoming — mobile priority 2; desktop first (col-span-2) */}
            <UpcomingLessonCard
              childName={selectedChild.name}
              data={data.upcomingLesson}
              className="order-2 lg:order-1 md:col-span-2 lg:col-span-2"
            />

            {/* Latest lesson update — mobile priority 3; desktop second (col-span-2, row-span-2) */}
            <LatestLessonCard
              childName={selectedChild.name}
              data={data.latestLessonUpdate}
              className="order-3 lg:order-2 md:col-span-2 lg:col-span-2 lg:row-span-2"
            />

            {/* Find teacher — mobile priority 4; desktop fourth */}
            <FindTeacherCard
              childName={selectedChild.name}
              className="order-4 lg:order-4"
            />

            {/* Previous lessons — mobile priority 5; desktop fifth */}
            <PreviousLessonsCard
              childName={selectedChild.name}
              lessons={data.previousLessons}
              className="order-5 lg:order-5"
            />
          </div>
        </div>
      </main>
    </div>
  );
}
