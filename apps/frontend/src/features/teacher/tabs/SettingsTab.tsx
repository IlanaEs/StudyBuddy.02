import { useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { AtSign, BadgeCheck, Check, Copy, Crown, Power, ShieldCheck, Snowflake, Upload, User } from 'lucide-react';

import { sbTokens as sb } from '../../../design/tokens';
import { BentoCard, DashboardGrid } from '../../../design-system';
import { useTeacherDashboardStore } from '../store/teacherDashboardStore';
import { deriveTeacherDisplayId } from '../utils/teacherId';

/** Settings — DS cards. Preserves the store interactions (name/bio/avatar,
 *  Kill Switch, email/subscription display) and adds a stable Teacher ID. */
export function SettingsTab() {
  const config = useTeacherDashboardStore((s) => s.config);
  if (!config) return null;

  return (
    <DashboardGrid>
      <ProfileCard />
      <AccountCard />
      <TeacherIdCard />
      <StatusCard />
      <SubscriptionCard />
    </DashboardGrid>
  );
}

function ProfileCard() {
  const config = useTeacherDashboardStore((s) => s.config)!;
  const updateConfig = useTeacherDashboardStore((s) => s.updateConfig);
  const fileRef = useRef<HTMLInputElement>(null);
  const [bio, setBio] = useState(config.bio ?? '');

  const initial = config.fullName.trim().charAt(0) || '?';

  function onPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateConfig({ avatarUrl: typeof reader.result === 'string' ? reader.result : null });
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  return (
    <BentoCard title="פרופיל" english="Profile" icon={<User size={16} />} colSpan={2}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
        <span
          style={{
            width: 64, height: 64, borderRadius: 999, flexShrink: 0, overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `2px solid ${sb.active}`, background: sb.glassBase,
            color: sb.textPrimary, fontFamily: sb.fontMono, fontWeight: 800, fontSize: 26,
          }}
        >
          {config.avatarUrl ? <img src={config.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initial}
        </span>
        <button type="button" onClick={() => fileRef.current?.click()} style={linkBtn}>
          <Upload size={14} /> {config.avatarUrl ? 'החלפת תמונה (Change)' : 'העלאת תמונה (Upload)'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={onPick} style={{ display: 'none' }} />
      </div>

      <Field label="שם מלא (Full Name)">
        <input value={config.fullName} onChange={(e) => updateConfig({ fullName: e.target.value })} dir="rtl" style={inputStyle} />
      </Field>
      <Field label="ביוגרפיה (Bio)">
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          onBlur={() => updateConfig({ bio: bio.trim() || null })}
          dir="rtl"
          rows={3}
          placeholder="כתבו ביוגרפיה קצרה שתוצג לתלמידים…"
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </Field>
    </BentoCard>
  );
}

function AccountCard() {
  const config = useTeacherDashboardStore((s) => s.config)!;
  return (
    <BentoCard title="חשבון" english="Account" icon={<AtSign size={16} />}>
      <Field label="אימייל (Email)">
        <span style={{ fontFamily: sb.fontMono, fontSize: 14, color: sb.textPrimary, wordBreak: 'break-all' }}>{config.email ?? '—'}</span>
      </Field>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 12.5, fontWeight: 600, color: config.isVerified ? sb.success : sb.warning }}>
        <ShieldCheck size={14} />
        {config.isVerified ? 'מאושר (Approved)' : 'ממתין לאישור (Pending)'}
      </div>
    </BentoCard>
  );
}

function TeacherIdCard() {
  const profileId = useTeacherDashboardStore((s) => s.config?.teacherProfileId ?? null);
  const id = deriveTeacherDisplayId(profileId);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!id) return;
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <BentoCard title="מזהה מורה" english="Teacher ID" icon={<BadgeCheck size={16} />}>
      <p style={{ margin: '0 0 10px', fontSize: 12, color: sb.textMuted, lineHeight: 1.6 }}>מזהה קבוע לחשבון שלך.</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: sb.fontMono, fontSize: 18, fontWeight: 800, color: sb.active, letterSpacing: '0.04em' }}>{id ?? '—'}</span>
        {id && (
          <button type="button" onClick={copy} aria-label="העתקה (Copy)" title="העתקה (Copy)" style={{ ...linkBtn, color: copied ? sb.success : sb.textSecondary }}>
            {copied ? <Check size={15} /> : <Copy size={15} />}
          </button>
        )}
      </div>
    </BentoCard>
  );
}

function StatusCard() {
  const config = useTeacherDashboardStore((s) => s.config)!;
  const setFrozen = useTeacherDashboardStore((s) => s.setFrozen);
  const active = !config.isFrozen;

  return (
    <BentoCard title="סטטוס" english="Status" icon={<Power size={16} />}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, paddingTop: 6 }}>
        <button
          type="button"
          role="switch"
          aria-checked={active}
          aria-label="סטטוס פרופיל (Profile status)"
          onClick={() => setFrozen(active)}
          dir="ltr"
          style={{ position: 'relative', width: 120, height: 44, borderRadius: 999, border: 'none', padding: 0, cursor: 'pointer', background: active ? sb.success : sb.error }}
        >
          <span
            aria-hidden
            style={{
              position: 'absolute', top: 4, left: active ? 80 : 4, width: 36, height: 36, borderRadius: 999,
              background: sb.bgDepth, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: active ? sb.success : sb.error, transition: 'left 0.25s ease',
            }}
          >
            {active ? <Power size={18} /> : <Snowflake size={18} />}
          </span>
        </button>
        <span style={{ fontFamily: sb.fontMono, fontSize: 13, fontWeight: 800, color: active ? sb.success : sb.error }}>
          {active ? 'פעיל (Active)' : 'מוקפא (Frozen)'}
        </span>
        {!active && <p style={{ margin: 0, textAlign: 'center', fontSize: 12, lineHeight: 1.6, color: sb.textSecondary }}>הפרופיל מוקפא — לא יתקבלו בקשות חדשות עד להפעלה מחדש.</p>}
      </div>
    </BentoCard>
  );
}

function SubscriptionCard() {
  const subscription = useTeacherDashboardStore((s) => s.subscription);
  return (
    <BentoCard title="ניהול מנוי" english="Subscription" icon={<Crown size={16} />}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontSize: 15, fontWeight: 800, color: sb.textPrimary }}>{subscription?.plan ?? 'Pro'}</span>
        <span style={{ color: sb.active, fontWeight: 700 }}>Pro</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 8 }}>
        <span style={{ fontFamily: sb.fontMono, fontSize: 26, fontWeight: 800, color: sb.textPrimary }}>₪{subscription?.priceILS ?? 99}</span>
        <span style={{ fontSize: 12, color: sb.textMuted }}>/ לחודש</span>
      </div>
      {subscription && (
        <span style={{ display: 'block', marginTop: 8, fontSize: 11.5, color: sb.textMuted }}>
          חיוב הבא (Next billing): {new Date(subscription.nextBillingAt).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })}
        </span>
      )}
    </BentoCard>
  );
}

const linkBtn = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  background: 'transparent',
  border: 'none',
  padding: 0,
  cursor: 'pointer',
  fontSize: 12.5,
  fontWeight: 700,
  color: sb.active,
} as const;

const inputStyle = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: sb.radiusSmall,
  background: sb.glassBase,
  border: `1px solid ${sb.borderCyber}`,
  color: sb.textPrimary,
  fontSize: 14,
  fontFamily: sb.fontUi,
  outline: 'none',
} as const;

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 10 }}>
      <span style={{ fontSize: 11.5, fontWeight: 700, color: sb.textMuted }}>{label}</span>
      {children}
    </div>
  );
}
