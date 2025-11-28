/**
 * Plan Budget 디자인 시스템
 * 모던하고 부드러운 느낌, 여성 타겟 친화적 디자인
 */

export const colors = {
  // Primary Colors
  primary: {
    main: '#5CBDB9',      // Mint - 메인 컬러
    light: '#8ED4D1',     // Light Mint
    dark: '#3DA5A1',      // Dark Mint
    contrast: '#FFFFFF',  // Text on primary
  },

  // Secondary Colors
  secondary: {
    main: '#FFB5A7',      // Peach - 서브 컬러
    light: '#FFCFC6',     // Light Peach
    dark: '#E89A8C',      // Dark Peach
    contrast: '#FFFFFF',
  },

  // Accent Colors
  accent: {
    main: '#B8B5E4',      // Lavender - 포인트 컬러
    light: '#D4D2F0',     // Light Lavender
    dark: '#9994D1',      // Dark Lavender
    contrast: '#FFFFFF',
  },

  // Background Colors
  background: {
    primary: '#FAFBFC',   // 메인 배경
    secondary: '#FFFFFF', // 카드 배경
    tertiary: '#F5F7F9',  // 섹션 구분 배경
  },

  // Text Colors
  text: {
    primary: '#2D3748',   // 주요 텍스트
    secondary: '#718096', // 보조 텍스트
    tertiary: '#A0AEC0',  // 힌트 텍스트
    inverse: '#FFFFFF',   // 밝은 배경 위 텍스트
  },

  // Semantic Colors
  semantic: {
    income: '#4CAF93',    // 수입 (초록)
    expense: '#FF8A80',   // 지출 (빨강)
    transfer: '#90CAF9',  // 이체 (파랑)
    success: '#4CAF93',
    warning: '#FFB74D',
    error: '#FF8A80',
    info: '#90CAF9',
  },

  // Border & Divider
  border: {
    light: '#E8ECF0',
    medium: '#D1D9E0',
    dark: '#B8C4CE',
  },

  // Shadow
  shadow: {
    light: 'rgba(0, 0, 0, 0.05)',
    medium: 'rgba(0, 0, 0, 0.08)',
    dark: 'rgba(0, 0, 0, 0.12)',
  },
} as const;

export const typography = {
  // Font Family
  fontFamily: {
    regular: 'System',
    medium: 'System',
    semiBold: 'System',
    bold: 'System',
  },

  // Font Sizes
  fontSize: {
    xs: 10,
    sm: 12,
    md: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },

  // Font Weights
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semiBold: '600' as const,
    bold: '700' as const,
  },

  // Line Heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

export const spacing = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
} as const;

export const borderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  base: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
} as const;

export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
} as const;

// 자산 타입별 아이콘 및 컬러
export const assetTypeConfig = {
  bank: { icon: 'bank', color: '#5CBDB9', label: '은행' },
  card: { icon: 'credit-card', color: '#FFB5A7', label: '카드' },
  cash: { icon: 'cash', color: '#4CAF93', label: '현금' },
  loan: { icon: 'file-document', color: '#FF8A80', label: '대출' },
  insurance: { icon: 'shield-check', color: '#B8B5E4', label: '보험' },
  investment: { icon: 'trending-up', color: '#90CAF9', label: '투자' },
  savings: { icon: 'piggy-bank', color: '#FFB74D', label: '저축' },
  emoney: { icon: 'cellphone', color: '#CE93D8', label: '전자화폐' },
  point: { icon: 'star', color: '#FFF176', label: '포인트' },
  other: { icon: 'dots-horizontal', color: '#A0AEC0', label: '기타' },
} as const;

// 예산 타입별 설정
export const budgetTypeConfig = {
  personal: { label: '내꺼', color: colors.primary.main },
  joint: { label: '공동', color: colors.secondary.main },
} as const;

// 거래 타입별 설정
export const transactionTypeConfig = {
  income: { label: '수입', color: colors.semantic.income },
  expense: { label: '지출', color: colors.semantic.expense },
  transfer: { label: '이체', color: colors.semantic.transfer },
} as const;

// Theme 객체 통합
const theme = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  assetTypeConfig,
  budgetTypeConfig,
  transactionTypeConfig,
} as const;

export type Theme = typeof theme;
export type Colors = typeof colors;
export type Typography = typeof typography;
export type Spacing = typeof spacing;
export type BorderRadius = typeof borderRadius;
export type Shadows = typeof shadows;

export default theme;
