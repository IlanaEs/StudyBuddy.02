// Type declarations for taxonomy-data.mjs so the typechecked + bundled frontend
// can import the canonical taxonomy directly (root tsconfig has allowJs:false).
// This is a TYPE declaration, not a data fork — the values live only in the .mjs.

export interface CanonicalSubject {
  name: string;
  category: string;
}

export const canonicalSubjects: ReadonlyArray<CanonicalSubject>;

/** band key → offered subject names. See the .mjs header for the invariants. */
export const canonicalSubjectsByBand: Record<'elementary' | 'middle' | 'high', string[]>;
