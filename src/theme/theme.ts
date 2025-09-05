// Design tokens for the app
export const theme = {
  colors: {
    background: '#FFFAEC',
    card: '#FFFFFF',
    primary: '#ADD8EB',
    accent: '#7267F0',
    text: '#333333',
    mutedText: '#6B6B6B',
    border: '#EDE7E1',
    mutedBg: '#F6F3F1',
    danger: '#F36C6C',
    success: '#2EAD6B',
    shadow: '#000000',
  },
  spacing: (n: number) => 4 * n,          // spacing(4) = 16
  radius: { sm: 8, md: 14, lg: 20, xl: 28 },
  fonts: {
    title: 'Anta-Regular',
    regular: 'Poppins-Regular',
    semibold: 'Poppins-SemiBold',
    bold: 'Poppins-Bold',
  },
};
export type AppTheme = typeof theme;
