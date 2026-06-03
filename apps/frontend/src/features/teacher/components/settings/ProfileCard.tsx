import { useRef, useState, type ChangeEvent } from 'react';
import { Edit3, Trash2, User } from 'lucide-react';
import { towTokens as T } from '../../../../design/tokens';
import { FloatingLabelInput } from '../../../../components/onboarding/v2/FloatingLabelInput';
import { BentoTile } from '../BentoGrid';
import { useTeacherDashboardStore } from '../../store/teacherDashboardStore';

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
  color: T.neon,
} as const;

/** פרופיל (Profile) cube — avatar upload (data-URL proxy), name + bio, bound to config. */
export function ProfileCard() {
  const config = useTeacherDashboardStore((s) => s.config);
  const updateConfig = useTeacherDashboardStore((s) => s.updateConfig);
  const fileRef = useRef<HTMLInputElement>(null);
  const [hover, setHover] = useState(false);
  const [bio, setBio] = useState(config?.bio ?? '');

  if (!config) return null;
  const avatarUrl = config.avatarUrl;
  const initial = config.fullName.trim().charAt(0) || '?';

  function onPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () =>
      updateConfig({ avatarUrl: typeof reader.result === 'string' ? reader.result : null });
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  return (
    <BentoTile size="2x2" title="פרופיל" english="Profile" icon={<User size={16} />}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          style={{ position: 'relative', width: 96, height: 96, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {/* Neon initial — grows from center when there is no avatar. */}
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              fontFamily: T.fontMono,
              fontWeight: 800,
              color: T.neon,
              fontSize: 52,
              transform: `scale(${avatarUrl ? 0 : 1})`,
              opacity: avatarUrl ? 0 : 1,
              textShadow: `0 0 18px color-mix(in oklab, ${T.neon} 60%, transparent)`,
              transition: 'transform 320ms cubic-bezier(0.2,0.8,0.2,1), opacity 320ms ease',
            }}
          >
            {initial}
          </span>
          {/* Avatar circle — shrinks to 0 when removed. */}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            aria-label="העלאת תמונה (Upload photo)"
            style={{
              position: 'relative',
              width: 96,
              height: 96,
              borderRadius: 999,
              padding: 0,
              cursor: 'pointer',
              border: `2px solid ${T.neon}`,
              overflow: 'hidden',
              background: T.card2,
              transform: `scale(${avatarUrl ? 1 : 0})`,
              opacity: avatarUrl ? 1 : 0,
              transition: 'transform 320ms cubic-bezier(0.2,0.8,0.2,1), opacity 280ms ease',
            }}
          >
            {avatarUrl && <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            <span
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(4,18,18,0.55)',
                opacity: hover && avatarUrl ? 1 : 0,
                transition: 'opacity 160ms ease',
              }}
            >
              <Edit3 size={22} color={T.text} />
            </span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={onPick} style={{ display: 'none' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button type="button" onClick={() => fileRef.current?.click()} style={linkBtn}>
            <Edit3 size={13} /> {avatarUrl ? 'החלפת תמונה (Change)' : 'העלאת תמונה (Upload)'}
          </button>
          {avatarUrl && (
            <button type="button" onClick={() => updateConfig({ avatarUrl: null })} style={{ ...linkBtn, color: T.alert }}>
              <Trash2 size={13} /> הסרה (Remove)
            </button>
          )}
        </div>
      </div>

      <FloatingLabelInput
        label="שם מלא (Full Name)"
        value={config.fullName}
        onChange={(v) => updateConfig({ fullName: v })}
      />

      <textarea
        className="tow-focusable"
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        onBlur={() => updateConfig({ bio: bio.trim() || null })}
        placeholder="כתבו ביוגרפיה קצרה שתוצג לתלמידים…"
        dir="rtl"
        style={{
          width: '100%',
          minHeight: 88,
          resize: 'vertical',
          padding: 12,
          borderRadius: T.radiusSm,
          border: `1.5px solid ${T.line2}`,
          background: T.card2,
          color: T.text,
          fontSize: 14,
          lineHeight: 1.6,
          outline: 'none',
          fontFamily: 'inherit',
        }}
      />
    </BentoTile>
  );
}
