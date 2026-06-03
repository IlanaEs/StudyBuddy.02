import { useState } from 'react';
import { Folder, FileText, Image as ImageIcon, Link as LinkIcon, File, Download } from 'lucide-react';
import { towTokens as T } from '../../../../../design/tokens';
import { useTeacherDashboardStore } from '../../../store/teacherDashboardStore';
import { studentMaterials } from '../../../utils/studentCrm';
import { EmptyState } from '../../EmptyState';
import type { MaterialKind } from '../../../types/teacherDashboard.types';

const KIND_ICON: Record<MaterialKind, typeof FileText> = {
  pdf: FileText,
  doc: FileText,
  image: ImageIcon,
  link: LinkIcon,
  other: File,
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export function MaterialsPanel({ studentId }: { studentId: string }) {
  const materials = useTeacherDashboardStore((s) => s.materials);
  const items = studentMaterials(materials, studentId);
  const [hovered, setHovered] = useState<string | null>(null);

  if (items.length === 0) {
    return <EmptyState icon={<Folder size={26} />} message="אין חומרים עבור תלמיד זה עדיין." />;
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: 12,
      }}
    >
      {items.map((m) => {
        const Icon = KIND_ICON[m.kind];
        const isHovered = hovered === m.id;
        return (
          <div
            key={m.id}
            onMouseEnter={() => setHovered(m.id)}
            onMouseLeave={() => setHovered((h) => (h === m.id ? null : h))}
            style={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              padding: 14,
              borderRadius: T.radiusSm,
              // Folder motif: a clipped tab on the top-inline-start corner.
              border: `1px solid ${T.line2}`,
              background: 'color-mix(in oklab, #38716a 60%, transparent)',
              transition: 'border-color 150ms ease, background 150ms ease',
              ...(isHovered ? { borderColor: T.neon } : null),
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                style={{
                  width: 38,
                  height: 30,
                  flexShrink: 0,
                  borderRadius: '4px 8px 8px 8px',
                  background: 'color-mix(in oklab, #00f6ff 14%, transparent)',
                  border: `1px solid ${T.ink}`,
                  color: T.neon,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon size={16} />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span
                  style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 700,
                    color: T.text,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {m.name}
                </span>
                <span style={{ display: 'block', fontSize: 11, color: T.text3, fontFamily: T.fontMono }}>
                  {formatDate(m.createdAt)}
                </span>
              </span>
            </div>
            <button
              type="button"
              // Proxy: real file delivery lands when the backend serves `url`.
              aria-label={`הורדה (Download) — ${m.name}`}
              title="הורדה (Download)"
              style={{
                alignSelf: 'flex-start',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 10px',
                borderRadius: T.radiusSm,
                border: `1px solid ${T.ink}`,
                background: 'color-mix(in oklab, #3f7e76 50%, transparent)',
                color: T.text2,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                opacity: isHovered ? 1 : 0,
                transform: isHovered ? 'translateY(0)' : 'translateY(4px)',
                transition: 'opacity 160ms ease, transform 160ms ease',
              }}
            >
              <Download size={13} />
              הורדה (Download)
            </button>
          </div>
        );
      })}
    </div>
  );
}
