import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, Check, ChevronLeft, Loader2 } from 'lucide-react';

import { useAuth } from '../../../auth/AuthProvider';
import { GlobalStateCard, sbTokens as sb } from '../../../design-system';
import { GradeSelect } from '../components/GradeSelect';
import { ParentDashboardLayout } from '../components/ParentDashboardLayout';
import { getParentChildren, type ParentChild } from '../api/getParentChildren';
import { createParentChild } from '../api/createParentChild';

/**
 * Parent → Find Tutor entry — a single-glass-card, Netflix-style profile picker.
 * Choose an existing child (active child pre-selected) and continue to the quick
 * wizard, OR create a new child (name + grade only). Presentation only — routing,
 * the create-child flow, dedup, and the quick-wizard hand-off are unchanged.
 */
export function ParentFindTutorPage() {
  const { session } = useAuth();
  const token = session?.access_token ?? null;
  const navigate = useNavigate();
  const location = useLocation();
  const activeChildId = (location.state as { activeChildId?: string } | null)?.activeChildId ?? null;

  const [children, setChildren] = useState<ParentChild[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<'picker' | 'create'>('picker');
  const [starting, setStarting] = useState(false);

  const load = () => {
    if (!token) return;
    setLoadError(null);
    setChildren(null);
    getParentChildren(token).then((res) => {
      if ('error' in res) setLoadError(res.error);
      else setChildren(res.data.children);
    });
  };
  useEffect(load, [token]);

  // Pre-select the dashboard's active child (fallback: first child).
  useEffect(() => {
    if (!children || selectedId) return;
    setSelectedId((activeChildId && children.find((c) => c.id === activeChildId)?.id) || children[0]?.id || null);
  }, [children, activeChildId, selectedId]);

  const startSearch = () => {
    if (!selectedId) return;
    setStarting(true);
    navigate(`/find-tutor?childId=${encodeURIComponent(selectedId)}`);
  };

  return (
    <ParentDashboardLayout>
    <div dir="rtl" lang="he" style={{ minHeight: '100dvh', background: sb.bgCanvas, color: sb.textPrimary, fontFamily: sb.fontUi, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'calc(40px + 64px) 20px 40px' }}>
      <div className="sb-card sb-find-tutor-card" style={{ padding: 'clamp(28px, 4vw, 40px) clamp(24px, 3vw, 36px)', display: 'flex', flexDirection: 'column', gap: 26 }}>
        <button
          type="button"
          onClick={() => (view === 'create' ? setView('picker') : navigate('/parent/dashboard'))}
          style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', color: sb.textMuted, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', padding: 0 }}
        >
          <ChevronLeft size={15} style={{ transform: 'scaleX(-1)' }} />
          {view === 'create' ? 'חזרה לבחירת ילד/ה' : 'חזרה לדשבורד'}
        </button>

        {view === 'create' ? (
          <CreateView token={token} onCreated={(c) => navigate(`/find-tutor?childId=${encodeURIComponent(c.id)}`)} />
        ) : loadError ? (
          <GlobalStateCard variant="error" title="לא הצלחנו לטעון את הילדים" description={loadError} cta={{ label: 'נסה שוב', onClick: load }} />
        ) : children === null ? (
          <GlobalStateCard variant="loading" title="טוען את הילדים…" />
        ) : (
          <>
            <header style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <h1 style={{ margin: 0, fontSize: 'clamp(20px, 3vw, 26px)', fontWeight: 800, letterSpacing: '-0.02em', color: sb.textPrimary }}>
                בחרי עבור מי תרצי למצוא מורה <span style={{ color: sb.textMuted, fontWeight: 600 }}>(Find a Tutor)</span>
              </h1>
              <p style={{ margin: 0, fontSize: 14, color: sb.textMuted, fontWeight: 500 }}>בחרי פרופיל קיים או צרי פרופיל חדש</p>
            </header>

            {/* Horizontal RTL profile row — first child on the right, add-new at the left end. */}
            <div
              style={{
                display: 'flex', gap: 'clamp(16px, 3vw, 26px)', overflowX: 'auto',
                padding: '8px 2px 14px', justifyContent: children.length <= 2 ? 'center' : 'flex-start',
              }}
            >
              {children.map((child) => (
                <Profile key={child.id} child={child} selected={child.id === selectedId} onSelect={() => setSelectedId(child.id)} />
              ))}
              <AddNew onClick={() => setView('create')} />
            </div>

            <button
              type="button"
              onClick={startSearch}
              disabled={!selectedId || starting}
              className="sb-find-tutor-cta"
              style={{
                width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '14px 18px', borderRadius: sb.radiusButton, border: 'none',
                background: sb.primaryCta, color: sb.onPrimary, fontSize: 15, fontWeight: 800,
                cursor: selectedId && !starting ? 'pointer' : 'not-allowed', opacity: selectedId ? 1 : 0.45,
                transition: 'opacity 200ms ease, filter 200ms ease, transform 150ms ease',
              }}
            >
              {starting ? <><Loader2 size={16} className="animate-spin" /> מתחילים…</> : 'התחל חיפוש מורה (Start Search)'}
            </button>
          </>
        )}
      </div>
    </div>
    </ParentDashboardLayout>
  );
}

function Profile({ child, selected, onSelect }: { child: ParentChild; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      className="sb-profile"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`בחר/י את ${child.first_name}`}
      style={{ flexShrink: 0, width: 104, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
    >
      <span
        className="sb-profile-avatar"
        style={{
          position: 'relative', width: 76, height: 76, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 30, fontWeight: 800, color: selected ? sb.active : sb.textSecondary,
          background: `color-mix(in oklab, ${sb.active} ${selected ? 20 : 10}%, transparent)`,
          border: selected ? `2px solid ${sb.active}` : `2px solid color-mix(in oklab, ${sb.borderCyber} 70%, transparent)`,
          boxShadow: selected ? `0 0 0 4px color-mix(in oklab, ${sb.active} 22%, transparent), 0 0 22px -4px color-mix(in oklab, ${sb.active} 55%, transparent)` : 'none',
        }}
      >
        {child.first_name.charAt(0)}
        {selected && (
          <span aria-hidden style={{ position: 'absolute', insetInlineEnd: -2, bottom: -2, width: 22, height: 22, borderRadius: '50%', background: sb.active, color: sb.onPrimary, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${sb.bgCanvas}` }}>
            <Check size={12} strokeWidth={3} />
          </span>
        )}
      </span>
      <span style={{ fontSize: 14, fontWeight: 700, color: selected ? sb.textPrimary : sb.textSecondary, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{child.first_name}</span>
      <span style={{ fontSize: 12, color: sb.textMuted }}>{child.grade_level ? `כיתה ${child.grade_level}` : 'שכבה לא צוינה'}</span>
    </button>
  );
}

function AddNew({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className="sb-profile"
      onClick={onClick}
      aria-label="צור פרופיל ילד/ה חדש"
      style={{ flexShrink: 0, width: 104, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
    >
      <span
        className="sb-profile-avatar"
        style={{ width: 76, height: 76, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: `2px dashed ${sb.borderCyber}`, background: sb.glassSoft, color: sb.textSecondary }}
      >
        <Plus size={26} />
      </span>
      <span style={{ fontSize: 13, fontWeight: 700, color: sb.textSecondary, maxWidth: 100, textAlign: 'center', lineHeight: 1.3 }}>צור פרופיל ילד/ה חדש</span>
    </button>
  );
}

function CreateView({ token, onCreated }: { token: string | null; onCreated: (child: ParentChild) => void }) {
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!token || !name.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    const res = await createParentChild(token, { child_name: name.trim(), grade_level: grade || null });
    setSubmitting(false);
    if ('error' in res) { setError(res.error); return; } // 409 → duplicate name+grade
    onCreated(res.data.child);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <header style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <h1 style={{ margin: 0, fontSize: 'clamp(18px, 3vw, 23px)', fontWeight: 800, letterSpacing: '-0.02em', color: sb.textPrimary }}>פרופיל ילד/ה חדש/ה</h1>
        <p style={{ margin: 0, fontSize: 13.5, color: sb.textMuted, fontWeight: 500 }}>שם ושכבה בלבד — את שאר הפרטים נאסוף בחיפוש.</p>
      </header>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: sb.textSecondary }}>שם הילד/ה</span>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="שם מלא" style={inputStyle} />
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: sb.textSecondary }}>שכבה / כיתה</span>
        <GradeSelect value={grade} onChange={setGrade} />
      </label>

      {error && <div style={{ fontSize: 13, fontWeight: 600, color: sb.error }}>{error}</div>}

      <button
        type="button"
        onClick={() => void submit()}
        disabled={!name.trim() || submitting}
        className="sb-find-tutor-cta"
        style={{
          marginTop: 4, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '13px 18px', borderRadius: sb.radiusButton, border: 'none',
          background: sb.primaryCta, color: sb.onPrimary, fontSize: 14.5, fontWeight: 800,
          cursor: !name.trim() || submitting ? 'not-allowed' : 'pointer', opacity: !name.trim() || submitting ? 0.45 : 1,
          transition: 'opacity 200ms ease, filter 200ms ease, transform 150ms ease',
        }}
      >
        {submitting ? <><Loader2 size={16} className="animate-spin" /> שומר…</> : 'שמור והמשך'}
      </button>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 13px', borderRadius: sb.radiusSmall,
  border: `1px solid ${sb.borderCyber}`, background: sb.glassSoft, color: sb.textPrimary,
  fontSize: 14, fontFamily: sb.fontUi,
};
