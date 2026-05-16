import { createTheme, colorsTuple } from '@mantine/core';

export const mantineTheme = createTheme({
  primaryColor: 'studybuddy',
  primaryShade: { light: 5, dark: 4 },
  defaultRadius: 'md',
  focusRing: 'auto',
  respectReducedMotion: true,
  cursorType: 'pointer',
  autoContrast: true,
  fontFamily: 'Heebo, Inter, Rubik, system-ui, sans-serif',
  fontFamilyMonospace: '"JetBrains Mono", ui-monospace, monospace',
  headings: {
    fontFamily: '"Space Grotesk", Heebo, Inter, system-ui, sans-serif',
    fontWeight: '700',
    textWrap: 'balance',
  },
  colors: {
    studybuddy: colorsTuple('#4ce7e3'),
    studybuddyTeal: colorsTuple('#175655'),
    studybuddyLime: colorsTuple('#bbe341'),
    studybuddyYellow: colorsTuple('#fccb01'),
    studybuddyRed: colorsTuple('#e22b57'),
  },
  breakpoints: {
    xs: '23.4375em',
    sm: '48em',
    md: '64em',
    lg: '80em',
    xl: '90em',
  },
  shadows: {
    xs: '0 8px 20px -14px rgba(0, 0, 0, 0.65)',
    sm: '0 14px 34px -22px rgba(0, 0, 0, 0.75)',
    md: '0 24px 58px -34px rgba(0, 0, 0, 0.82)',
    lg: '0 34px 82px -46px rgba(0, 0, 0, 0.88)',
    xl: '0 48px 120px -64px rgba(76, 231, 227, 0.32)',
  },
  components: {
    Button: {
      defaultProps: {
        radius: 'xl',
      },
    },
    Card: {
      defaultProps: {
        radius: 'lg',
        withBorder: true,
      },
    },
    Modal: {
      defaultProps: {
        centered: true,
        overlayProps: {
          backgroundOpacity: 0.62,
          blur: 8,
        },
      },
    },
  },
});
