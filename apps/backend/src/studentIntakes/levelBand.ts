// Canonical level bands shared by the matching engine: teacher_subjects.level and
// the normalized student_intakes.level both live in this domain. Keeping intake
// levels in this band vocabulary is what lets the engine's exact-band level filter
// (matching.filters.ts → findBestLevelMatch) line up student grades with teacher
// subject levels.

export const LEVEL_BANDS = ['elementary', 'middle', 'high', 'academic'] as const;
export type LevelBand = (typeof LEVEL_BANDS)[number];

// Hebrew school-grade letter → band. Elementary = א–ו (1–6), middle = ז–ט (7–9).
// Grades 10–12 use the letter י (and its compounds יא/יב) and map to high; they are
// handled by the `startsWith('י')` rule below rather than this table.
const HEBREW_GRADE_BAND: Record<string, LevelBand> = {
  א: 'elementary', ב: 'elementary', ג: 'elementary', ד: 'elementary', ה: 'elementary', ו: 'elementary',
  ז: 'middle', ח: 'middle', ט: 'middle',
};

/**
 * Normalize a raw student level/grade into a matching band
 * (`elementary | middle | high | academic`), or `null` when it genuinely can't be
 * determined.
 *
 * `null` means "no level preference" — the matching engine already treats a
 * level-less intake as compatible with any teacher level. This is NOT a loosening
 * of the exact-band filter for *known* levels: every recognized grade is mapped to
 * a concrete band, and the filter still requires an exact band (or a null-level,
 * teaches-anything teacher) for those.
 *
 * Idempotent: an input that is already a band is returned unchanged. Recognizes:
 *   - canonical bands (case-insensitive): elementary | middle | high | academic
 *   - Hebrew school grades, with/without the "כיתה" prefix and geresh/gershayim:
 *       א׳–ו׳ → elementary · ז׳–ט׳ → middle · י׳/י״א/י״ב → high
 *   - academic / degree indicators (שנה, תואר, אקדמ, מוסמך, דוקטורט, סטודנט, …)
 *   - Arabic-numeral grades as a fallback (1–6 / 7–9 / 10–12 / 13+).
 */
export function normalizeLevelToBand(level: string | null | undefined): LevelBand | null {
  if (level == null) return null;
  const raw = level.trim();
  if (raw === '') return null;

  // Already a canonical band (case-insensitive) — idempotent passthrough.
  const lower = raw.toLowerCase();
  const existingBand = (LEVEL_BANDS as readonly string[]).find((b) => b === lower);
  if (existingBand) return existingBand as LevelBand;

  // Academic / degree indicators (Hebrew + English), checked before grade parsing.
  if (/שנה|תואר|אקדמ|מוסמך|דוקטור|סטודנט|בוגר|degree|undergrad|graduate|universit|academic/i.test(raw)) {
    return 'academic';
  }

  // Hebrew school grade — strip the "כיתה" prefix, geresh/gershayim/quotes, spaces.
  const token = raw
    .replace(/כיתה/g, '')
    .replace(/[׳״'"]/g, '')
    .replace(/\s+/g, '');

  if (token.startsWith('י')) return 'high'; // י (10), יא (11), יב (12)
  if (HEBREW_GRADE_BAND[token]) return HEBREW_GRADE_BAND[token];

  // Arabic-numeral fallback (e.g. "3", "grade 11").
  const digits = token.replace(/[^0-9]/g, '');
  if (digits) {
    const n = Number.parseInt(digits, 10);
    if (Number.isFinite(n) && n > 0) {
      if (n <= 6) return 'elementary';
      if (n <= 9) return 'middle';
      if (n <= 12) return 'high';
      return 'academic';
    }
  }

  return null; // Unrecognized → no level preference (never a wrong band).
}
