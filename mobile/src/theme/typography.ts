import { TextStyle } from 'react-native';

const FONT_SANS = 'IBMPlexSans';
const FONT_MONO = 'IBMPlexMono';

export const fonts = {
  sans400: `${FONT_SANS}-Regular`,
  sans500: `${FONT_SANS}-Medium`,
  sans600: `${FONT_SANS}-SemiBold`,
  mono400: `${FONT_MONO}-Regular`,
  mono500: `${FONT_MONO}-Medium`,
} as const;

export const type: Record<string, TextStyle> = {
  display: { fontFamily: fonts.sans600, fontSize: 28, lineHeight: 34 },
  title: { fontFamily: fonts.sans600, fontSize: 22, lineHeight: 28 },
  heading: { fontFamily: fonts.sans600, fontSize: 16, lineHeight: 22 },
  headingSm: { fontFamily: fonts.sans600, fontSize: 14, lineHeight: 20 },
  body: { fontFamily: fonts.sans400, fontSize: 13, lineHeight: 19 },
  bodySm: { fontFamily: fonts.sans400, fontSize: 11, lineHeight: 16 },
  label: {
    fontFamily: fonts.mono500,
    fontSize: 10,
    lineHeight: 14,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
  },
  mono: { fontFamily: fonts.mono400, fontSize: 11, lineHeight: 16 },
  monoLg: { fontFamily: fonts.mono400, fontSize: 14, lineHeight: 20 },
} as const;
