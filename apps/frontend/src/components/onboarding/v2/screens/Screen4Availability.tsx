import type { ReactNode } from 'react';
import { towTokens as T } from '../../../../design/tokens';
import { ScreenHeader, SectionLabel, FieldError } from '../primitives';

interface Screen4Props {
  /** Parent-provided Google Calendar sync card (keeps its wired gcal handlers). */
  syncCard: ReactNode;
  /** Parent-provided weekly availability grid (TeacherAvailabilityCalendar). */
  grid: ReactNode;
  error?: string;
  /** True when a calendar sync removed already-selected blocks that are now busy. */
  removedNotice?: boolean;
}

/**
 * Screen 4 — Availability & Synchronization (זמינות וסנכרון). Two columns:
 * one-click Google Calendar sync + the interactive weekly grid. The heavy
 * pieces (sync handlers, grid) are passed in as slots from the parent.
 */
export function Screen4Availability({ syncCard, grid, error, removedNotice }: Screen4Props) {
  return (
    <div className="tow-step-in">
      <ScreenHeader title="זמינות וסנכרון" english="Availability & Synchronization" subtitle="סנכרנו את היומן או סמנו ידנית את חלונות הזמינות השבועיים." />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
        <div>
          <SectionLabel>סנכרון יומן</SectionLabel>
          {syncCard}
        </div>
        <div>
          <SectionLabel>זמינות שבועית</SectionLabel>
          <div style={{ background: T.card, border: `2px solid ${T.line2}`, borderRadius: T.radius, padding: 14 }}>
            {grid}
          </div>
          {removedNotice && (
            <div style={{ marginTop: 8, fontSize: 12, fontWeight: 600, color: T.gold }}>
              חלק מהשעות הוסרו כי הן תפוסות ביומן Google.
            </div>
          )}
          <FieldError>{error}</FieldError>
        </div>
      </div>
    </div>
  );
}
