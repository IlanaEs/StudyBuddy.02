import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Search } from 'lucide-react';

import { useAuth } from '../../../auth/AuthProvider';
import { sbTokens as sb } from '../../../design/tokens';
import { GlobalStateCard } from '../../../design-system/GlobalStateCard';
import type { ApiResponse } from '../../../api/client';
import {
  fetchAdminParents,
  fetchAdminStudents,
  fetchAdminTeachers,
  type CrmPage,
  type ParentCrmRow,
  type StudentCrmRow,
  type TeacherCrmRow,
} from '../../../api/admin';
import { AdminDashboardLayout } from '../components/AdminDashboardLayout';
import { CrmTable, NaCell, NumCell, type CrmColumn } from '../components/CrmTable';

type SubTab = 'teachers' | 'students' | 'parents';

const SUB_TABS: { key: SubTab; labelHe: string; labelEn: string }[] = [
  { key: 'teachers', labelHe: 'מורים', labelEn: 'Teachers' },
  { key: 'students', labelHe: 'תלמידים', labelEn: 'Students' },
  { key: 'parents', labelHe: 'הורים', labelEn: 'Parents' },
];

export function AdminUsersPage() {
  const [tab, setTab] = useState<SubTab>('teachers');

  return (
    <AdminDashboardLayout>
      <header style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: sb.textPrimary, fontFamily: sb.fontUi }}>
          ניהול משתמשים <span style={{ color: sb.textMuted, fontWeight: 600, fontSize: 15 }}>(Users CRM)</span>
        </h1>
      </header>

      <div role="tablist" style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {SUB_TABS.map((t) => {
          const active = t.key === tab;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.key)}
              style={{
                padding: '8px 16px',
                borderRadius: 999,
                fontSize: 13.5,
                fontWeight: active ? 700 : 500,
                fontFamily: sb.fontUi,
                color: active ? sb.textPrimary : sb.textSecondary,
                background: active ? sb.hoverGlow : 'transparent',
                border: `1px solid ${active ? sb.borderCyber : 'transparent'}`,
                cursor: 'pointer',
              }}
            >
              {t.labelHe} <span style={{ color: sb.textMuted, fontWeight: 500, fontSize: 11.5 }}>({t.labelEn})</span>
            </button>
          );
        })}
      </div>

      {tab === 'teachers' && <TeachersTab />}
      {tab === 'students' && <StudentsTab />}
      {tab === 'parents' && <ParentsTab />}
    </AdminDashboardLayout>
  );
}

// ── Shared list state hook ──────────────────────────────────────────────────────

type ListStatus = 'loading' | 'error' | 'ready';

type CrmListState<T> = {
  status: ListStatus;
  page: number;
  setPage: (p: number) => void;
  data: CrmPage<T> | null;
  reload: () => void;
};

function useCrmData<T>(load: (page: number) => Promise<ApiResponse<CrmPage<T>>>): CrmListState<T> {
  const [status, setStatus] = useState<ListStatus>('loading');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<CrmPage<T> | null>(null);

  const run = useCallback(
    async (p: number) => {
      setStatus('loading');
      const res = await load(p);
      if ('error' in res) {
        setStatus('error');
        return;
      }
      setData(res.data);
      setStatus('ready');
    },
    [load],
  );

  useEffect(() => {
    void run(page);
  }, [run, page]);

  return { status, page, setPage, data, reload: () => run(page) };
}

function useDebounced(value: string, ms = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

// ── Sub-tabs ────────────────────────────────────────────────────────────────────

function TeachersTab() {
  const { session } = useAuth();
  const token = session?.access_token ?? '';
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [verified, setVerified] = useState('');
  const debouncedQ = useDebounced(q);

  const load = useCallback(
    (page: number) =>
      fetchAdminTeachers(
        { page, perPage: 25, q: debouncedQ || undefined, status: status || undefined, verified: verified || undefined },
        token,
      ),
    [token, debouncedQ, status, verified],
  );

  const list = useCrmData(load);
  useEffect(() => list.setPage(1), [debouncedQ, status, verified]); // eslint-disable-line react-hooks/exhaustive-deps

  const columns: CrmColumn<TeacherCrmRow>[] = [
    { key: 'name', label: 'שם (Name)', render: (r) => <NameEmail name={r.full_name} email={r.email} /> },
    { key: 'join', label: 'הצטרפות (Joined)', render: (r) => <DateCell iso={r.join_date} /> },
    { key: 'status', label: 'סטטוס (Status)', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'verified', label: 'מאומת (Verified)', render: (r) => <BoolBadge value={r.is_verified} /> },
    { key: 'subjects', label: 'מקצועות (Subjects)', render: (r) => <ListCell items={r.subjects} /> },
    { key: 'levels', label: 'רמות (Levels)', render: (r) => <ListCell items={r.levels} /> },
    { key: 'completed', label: 'שיעורים שהושלמו (Completed)', render: (r) => <NumCell value={r.completed_lessons} /> },
    { key: 'students', label: 'תלמידים פעילים (Active Students)', render: (r) => <NumCell value={r.active_students} /> },
    { key: 'last', label: 'פעילות אחרונה (Last Activity)', render: (r) => (r.last_activity_at ? <DateCell iso={r.last_activity_at} /> : <NaCell />) },
    { key: 'approval', label: 'אחוז אישור (Approval)', render: (r) => <RateCell value={r.approval_rate.value} /> },
    { key: 'plan', label: 'מנוי (Plan)', render: () => <NaCell /> },
    { key: 'rating', label: 'דירוג (Rating)', render: () => <NaCell /> },
  ];

  return (
    <TabBody
      toolbar={
        <>
          <SearchInput value={q} onChange={setQ} placeholder="חיפוש לפי שם או אימייל…" />
          <FilterSelect
            value={status}
            onChange={setStatus}
            ariaLabel="סטטוס (Status)"
            options={[
              { value: '', label: 'כל הסטטוסים (All statuses)' },
              { value: 'active', label: 'פעיל (Active)' },
              { value: 'inactive', label: 'לא פעיל (Inactive)' },
              { value: 'blocked', label: 'חסום (Blocked)' },
            ]}
          />
          <FilterSelect
            value={verified}
            onChange={setVerified}
            ariaLabel="אימות (Verified)"
            options={[
              { value: '', label: 'אימות: הכול (All)' },
              { value: 'true', label: 'מאומת (Verified)' },
              { value: 'false', label: 'לא מאומת (Unverified)' },
            ]}
          />
        </>
      }
      list={list}
      columns={columns}
      rowKey={(r) => r.id || r.user_id}
    />
  );
}

function StudentsTab() {
  const { session } = useAuth();
  const token = session?.access_token ?? '';
  const [q, setQ] = useState('');
  const [accountType, setAccountType] = useState('');
  const debouncedQ = useDebounced(q);

  const load = useCallback(
    (page: number) =>
      fetchAdminStudents({ page, perPage: 25, q: debouncedQ || undefined, accountType: accountType || undefined }, token),
    [token, debouncedQ, accountType],
  );

  const list = useCrmData(load);
  useEffect(() => list.setPage(1), [debouncedQ, accountType]); // eslint-disable-line react-hooks/exhaustive-deps

  const columns: CrmColumn<StudentCrmRow>[] = [
    { key: 'name', label: 'שם (Name)', render: (r) => <span style={{ color: sb.textPrimary }}>{r.full_name}</span> },
    { key: 'type', label: 'סוג חשבון (Account Type)', render: (r) => <AccountTypeBadge type={r.account_type} /> },
    { key: 'grade', label: 'כיתה (Grade)', render: (r) => <TextCell value={r.grade_level} /> },
    { key: 'age', label: 'שכבת גיל (Age Group)', render: (r) => <TextCell value={r.age_group} /> },
    { key: 'subjects', label: 'מקצועות (Subjects)', render: (r) => <ListCell items={r.subjects} /> },
    { key: 'lessons', label: 'שיעורים (Lessons)', render: (r) => <NumCell value={r.lesson_count} /> },
  ];

  return (
    <TabBody
      toolbar={
        <>
          <SearchInput value={q} onChange={setQ} placeholder="חיפוש לפי שם…" />
          <FilterSelect
            value={accountType}
            onChange={setAccountType}
            ariaLabel="סוג חשבון (Account type)"
            options={[
              { value: '', label: 'כל הסוגים (All types)' },
              { value: 'independent', label: 'עצמאי (Independent)' },
              { value: 'parent_managed', label: 'מנוהל הורה (Parent-managed)' },
            ]}
          />
        </>
      }
      list={list}
      columns={columns}
      rowKey={(r) => r.id}
    />
  );
}

function ParentsTab() {
  const { session } = useAuth();
  const token = session?.access_token ?? '';
  const [q, setQ] = useState('');
  const debouncedQ = useDebounced(q);

  const load = useCallback(
    (page: number) => fetchAdminParents({ page, perPage: 25, q: debouncedQ || undefined }, token),
    [token, debouncedQ],
  );

  const list = useCrmData(load);
  useEffect(() => list.setPage(1), [debouncedQ]); // eslint-disable-line react-hooks/exhaustive-deps

  const columns: CrmColumn<ParentCrmRow>[] = [
    { key: 'name', label: 'שם (Name)', render: (r) => <NameEmail name={r.full_name} email={r.email} /> },
    { key: 'children', label: 'ילדים (Children)', render: (r) => <NumCell value={r.children_count} /> },
    { key: 'active', label: 'שיעורים פעילים (Active Lessons)', render: (r) => <NumCell value={r.active_lessons} /> },
    { key: 'last', label: 'פעילות אחרונה (Last Activity)', render: () => <NaCell /> },
  ];

  return (
    <TabBody
      toolbar={<SearchInput value={q} onChange={setQ} placeholder="חיפוש לפי שם או אימייל…" />}
      list={list}
      columns={columns}
      rowKey={(r) => r.id}
    />
  );
}

// ── Shared tab body (toolbar + states + table) ──────────────────────────────────

function TabBody<T>({
  toolbar,
  list,
  columns,
  rowKey,
}: {
  toolbar: ReactNode;
  list: CrmListState<T>;
  columns: CrmColumn<T>[];
  rowKey: (row: T) => string;
}) {
  const { status, page, setPage, data, reload } = list;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>{toolbar}</div>

      {status === 'loading' && <GlobalStateCard variant="loading" title="טוען…" fullPage />}
      {status === 'error' && (
        <GlobalStateCard
          variant="error"
          title="שגיאה בטעינה"
          description="לא הצלחנו לטעון את הרשימה. נסו שוב."
          cta={{ label: 'נסו שוב', onClick: reload }}
          fullPage
        />
      )}
      {status === 'ready' && data && data.total === 0 && (
        <GlobalStateCard variant="empty" icon={<Search size={32} />} title="0 תוצאות — אין התאמות (No matches)" fullPage />
      )}
      {status === 'ready' && data && data.total > 0 && (
        <CrmTable
          columns={columns}
          rows={data.items}
          rowKey={rowKey}
          page={page}
          totalPages={data.total_pages}
          total={data.total}
          onPrev={() => setPage(Math.max(1, page - 1))}
          onNext={() => setPage(page + 1)}
        />
      )}
    </div>
  );
}

// ── Cell + control primitives (token-pure) ──────────────────────────────────────

function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div style={{ position: 'relative', flex: '1 1 240px', minWidth: 200 }}>
      <Search size={15} style={{ position: 'absolute', insetInlineStart: 10, top: '50%', transform: 'translateY(-50%)', color: sb.textMuted }} />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        dir="rtl"
        style={{
          width: '100%',
          padding: '9px 32px 9px 12px',
          borderRadius: sb.radiusSmall,
          background: sb.glassBase,
          border: `1px solid ${sb.borderCyber}`,
          color: sb.textPrimary,
          fontSize: 13,
          fontFamily: sb.fontUi,
          outline: 'none',
        }}
      />
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  ariaLabel,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  ariaLabel: string;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={ariaLabel}
      style={{
        padding: '9px 12px',
        borderRadius: sb.radiusSmall,
        background: sb.glassBase,
        border: `1px solid ${sb.borderCyber}`,
        color: sb.textPrimary,
        fontSize: 13,
        fontFamily: sb.fontUi,
        cursor: 'pointer',
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} style={{ background: sb.bgDepth, color: sb.textPrimary }}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function NameEmail({ name, email }: { name: string; email: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ color: sb.textPrimary, fontWeight: 600 }}>{name}</span>
      <span style={{ color: sb.textMuted, fontSize: 11.5, fontFamily: sb.fontMono }}>{email}</span>
    </div>
  );
}

function DateCell({ iso }: { iso: string }) {
  const d = new Date(iso);
  const text = Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return <span style={{ fontFamily: sb.fontMono, color: sb.textSecondary, whiteSpace: 'nowrap' }}>{text}</span>;
}

function TextCell({ value }: { value: string | null }) {
  if (!value) return <NaCell />;
  return <span style={{ color: sb.textPrimary }}>{value}</span>;
}

function ListCell({ items }: { items: string[] }) {
  if (items.length === 0) return <span style={{ color: sb.textMuted }}>—</span>;
  return <span style={{ color: sb.textPrimary }}>{items.join(', ')}</span>;
}

function RateCell({ value }: { value: number | null }) {
  if (value == null) return <span style={{ color: sb.textMuted, fontFamily: sb.fontMono }}>—</span>;
  return <span style={{ fontFamily: sb.fontMono, color: sb.active }}>{(value * 100).toFixed(0)}%</span>;
}

function BoolBadge({ value }: { value: boolean }) {
  return (
    <span style={{ fontFamily: sb.fontMono, fontWeight: 700, color: value ? sb.success : sb.textMuted }}>
      {value ? '✓' : '—'}
    </span>
  );
}

const STATUS_LABELS: Record<string, string> = {
  active: 'פעיל (Active)',
  inactive: 'לא פעיל (Inactive)',
  blocked: 'חסום (Blocked)',
};

function StatusBadge({ status }: { status: 'active' | 'inactive' | 'blocked' }) {
  const color = status === 'blocked' ? sb.error : status === 'active' ? sb.success : sb.textMuted;
  return <span style={{ color, fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap' }}>{STATUS_LABELS[status]}</span>;
}

function AccountTypeBadge({ type }: { type: 'independent' | 'parent_managed' }) {
  const label = type === 'independent' ? 'עצמאי (Independent)' : 'מנוהל הורה (Parent-managed)';
  return <span style={{ color: sb.textPrimary, fontSize: 12.5, whiteSpace: 'nowrap' }}>{label}</span>;
}
