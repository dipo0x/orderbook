/** Design tokens from the Figma file "Order Book Viewer — Project 1". The app is dark-only. */

export const Palette = {
  bgCanvas: '#0b0e11',
  bgSurface: '#14181d',
  bgRaised: '#1c2127',
  borderDefault: '#222831',
  borderStrong: '#2f3742',
  textPrimary: '#e6e8ea',
  textSecondary: '#7d8590',
  textTertiary: '#4b535d',
  accent: '#f0b90b',
  marketBuy: '#2ebd85',
  marketSell: '#f6465d',
  marketBuyDepth: 'rgba(46,189,133,0.15)',
  marketSellDepth: 'rgba(246,70,93,0.15)',
  statusLive: '#2ebd85',
  statusLiveBg: 'rgba(46,189,133,0.12)',
} as const;

export const Radius = {
  full: 999,
} as const;

/** Keys registered by useFonts in the root layout. */
export const DesignFonts = {
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemibold: 'Inter_600SemiBold',
  sansBold: 'Inter_700Bold',
  mono: 'JetBrainsMono_400Regular',
  monoMedium: 'JetBrainsMono_500Medium',
  monoBold: 'JetBrainsMono_700Bold',
} as const;
