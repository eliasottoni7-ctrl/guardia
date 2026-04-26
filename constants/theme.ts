export const theme = {
  colors: {
    background: '#0D0D0F', // Escuro absoluto (melhora contraste do disfarce)
    surface: '#18181B', // Ligeiramente mais claro para cards
    surfaceHighlight: '#27272A',
    primary: '#8B5CF6', // Violeta moderno (Disfarce / Ação segura)
    primaryGradient: ['#8B5CF6', '#A78BFA'],
    danger: '#E11D48', // Vermelho Rose Premium
    dangerGradient: ['#E11D48', '#BE123C'],
    text: '#FAFAFA',
    textMuted: '#A1A1AA',
    border: '#27272A',
    glass: 'rgba(24, 24, 27, 0.75)', // Para fundos de Blur
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 6,
    md: 12,
    lg: 18,
    xl: 24,
    round: 9999,
  },
  shadows: {
    soft: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 8,
    },
    glow: {
      shadowColor: '#8B5CF6',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 16,
      elevation: 10,
    },
    dangerGlow: {
      shadowColor: '#E11D48',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 16,
      elevation: 10,
    },
  },
};
