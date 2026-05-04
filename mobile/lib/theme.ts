// Design tokens for Vibe ID. The app is intentionally moody, editorial,
// fashion-forward — closer to a magazine than a typical iOS app.

export const theme = {
  bg: '#0A0A0A',
  bgElevated: '#141414',
  bgCard: '#1A1A1A',
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.16)',
  text: '#F5F1EA',
  textMuted: 'rgba(245,241,234,0.66)',
  textFaint: 'rgba(245,241,234,0.4)',
  accent: '#E8C896',         // warm cream/gold — used for primary CTAs
  accentDeep: '#A8896A',
  danger: '#D86B6B',
  success: '#9BC8A8',
  radius: {
    sm: 8,
    md: 14,
    lg: 22,
    xl: 32,
  },
  spacing: (n: number) => n * 4,
  font: {
    display: 'serif',         // editorial serif for archetype names
    body: 'System',
  },
} as const;

export type Theme = typeof theme;
