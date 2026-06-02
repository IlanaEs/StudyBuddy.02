export const designTokens = {
  color: {
    primaryAccent: '#4ce7e3',
    highlight: '#fccb01',
    background: '#175655',
    error: '#e22b57',
    secondaryAccent: '#bbe341',
  },
  spacing: {
    xs: '4px',
    s: '8px',
    m: '16px',
    l: '24px',
    xl: '32px',
    xxl: '48px',
  },
} as const;

/**
 * Teacher Onboarding Wizard (v2) palette. Mirrors the `.tow`-scoped CSS variables
 * in styles.css for use in component inline styles. Scoped to the wizard only —
 * do NOT use these for app-wide theming.
 */
export const towTokens = {
  bg: '#175655',
  card: '#3f7e76',
  card2: '#38716a',
  ink: '#016c7c',
  text: '#eaf7f5',
  text2: '#c4dbd7',
  text3: '#93b4af',
  neon: '#00f6ff',
  gold: '#ffd166',
  orange: '#fc6d17',
  alert: '#e22b57',
  success: '#bbe341',
  line: 'rgba(234, 247, 245, 0.18)',
  line2: 'rgba(234, 247, 245, 0.30)',
  radius: '12px',
  radiusSm: '8px',
  fontMono: '"JetBrains Mono", ui-monospace, monospace',
} as const;
