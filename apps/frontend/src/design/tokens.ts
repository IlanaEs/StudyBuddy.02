/**
 * StudyBuddy Design System v1 — CANONICAL design tokens.
 *
 * Each value is a `var(--sb-*)` reference (NOT a raw hex), so components stay
 * token-pure (the color-guard forbids raw hex in components) and runtime-
 * themeable. The hex values live once in `:root` in styles.css. New and migrated
 * screens import `sbTokens` (or use the `var(--sb-*)` CSS vars directly). See
 * docs/design-system.md.
 */
export const sbTokens = {
  // Canvas & Shell
  bgCanvas: 'var(--sb-bg-canvas)',
  bgDepth: 'var(--sb-bg-depth)',
  navbarBg: 'var(--sb-navbar-bg)',
  navbarBorder: 'var(--sb-navbar-border)',
  // Glass / Bento
  glassBase: 'var(--sb-glass-base)',
  glassSoft: 'var(--sb-glass-soft)',
  borderCyber: 'var(--sb-border-cyber)',
  /** @deprecated Alias of {@link borderCyber} — the competing #016c7c border was
   * dropped from the canonical layer. Use `borderCyber`; this maps onto it. */
  borderMuted: 'var(--sb-border-cyber)',
  hoverGlow: 'var(--sb-hover-glow)',
  // Glassmorphism inputs + background grid (DS v1 wizard visual language).
  inputBorder: 'var(--sb-input-border)',
  inputFocusGlow: 'var(--sb-input-focus-glow)',
  gridOverlay: 'var(--sb-grid-overlay)',
  // Typography colors
  textPrimary: 'var(--sb-text-primary)',
  textPrimaryAlt: 'var(--sb-text-primary-alt)',
  textSecondary: 'var(--sb-text-secondary)',
  textMuted: 'var(--sb-text-muted)',
  // Actions & States
  active: 'var(--sb-active)', // active / focus / progress-completed
  primaryCta: 'var(--sb-primary-cta)', // primary buttons (turquoise)
  success: 'var(--sb-success)',
  error: 'var(--sb-error)',
  warning: 'var(--sb-warning)', // RESERVED: urgent/final only — not normal CTAs
  locked: 'var(--sb-locked)',
  onPrimary: 'var(--sb-on-primary)', // ink ON primary/warning CTAs
  // Radius
  radiusCard: 'var(--sb-radius-card)',
  radiusButton: 'var(--sb-radius-button)',
  radiusSmall: 'var(--sb-radius-small)',
  // Motion
  motionFast: 'var(--sb-motion-fast)',
  motionBase: 'var(--sb-motion-base)',
  motionSlow: 'var(--sb-motion-slow)',
  // Fonts
  fontUi: 'var(--sb-font-ui)',
  fontMono: 'var(--sb-font-mono)',
  // Typography scale (responsive; use with fontUi / fontMono). See styles.css.
  fsHeading: 'var(--sb-fs-heading)',
  fsSubheading: 'var(--sb-fs-subheading)',
  fsBody: 'var(--sb-fs-body)',
  fsCaption: 'var(--sb-fs-caption)',
} as const;

export type SbTokens = typeof sbTokens;

/**
 * Landing-redesign scoped semantic tokens — the `.landing-theme` scope in
 * styles.css (mirrors the `.tow` scoping pattern). `var(--*)` refs only, never
 * raw hex, so components stay guard-pure. Reuses the canonical accent
 * (`--sb-active` #00F6FF) and cyber border (`--sb-border-cyber` #24747A); adds
 * landing-only semantics. NOTE: lime #BBE341 is NOT in the canonical layer
 * (canonical success is #A3E635), so it is introduced here, scoped — it does not
 * redefine a canonical token.
 */
export const landingTokens = {
  bgCanvasDeep: 'var(--bg-canvas-deep)', // ≡ --sb-bg-depth #175655
  bgBentoCell: 'var(--bg-bento-cell)',
  borderBentoSubtle: 'var(--border-bento-subtle)',
  textPrimaryInverse: 'var(--text-primary-inverse)',
  textSecondaryMuted: 'var(--text-secondary-muted)',
  accentLime: 'var(--accent-lime)',
  accentCyan: 'var(--accent-cyan)', // ≡ --sb-active #00F6FF
  accentCyber: 'var(--accent-cyber)', // ≡ --sb-border-cyber #24747A
} as const;

export type LandingTokens = typeof landingTokens;

/**
 * @deprecated Teacher Onboarding Wizard (v2) palette — mirrors the `.tow`-scoped
 * CSS variables. Superseded by {@link sbTokens}. Kept working during the phased
 * migration (60+ consumers); do NOT use in new code. Migrate onto `sbTokens` per
 * the map in docs/design-system.md, then this export is removed.
 */
export const towTokens = {
  // Identity-equal values reference the canonical --sb-* tokens (single source);
  // the rest stay raw until the .tow scope is migrated off.
  bg: 'var(--sb-bg-depth)', // ≡ #175655
  card: '#3f7e76',
  card2: '#38716a',
  ink: '#016c7c',
  text: '#eaf7f5',
  text2: '#c4dbd7',
  text3: '#93b4af',
  neon: 'var(--sb-active)', // ≡ #00f6ff
  gold: '#ffd166',
  orange: 'var(--sb-warning)', // ≡ #fc6d17
  alert: 'var(--sb-error)', // ≡ #e22b57
  success: '#bbe341',
  line: 'rgba(234, 247, 245, 0.18)',
  line2: 'rgba(234, 247, 245, 0.30)',
  radius: '12px',
  radiusSm: '8px',
  fontMono: '"JetBrains Mono", ui-monospace, monospace',
} as const;
