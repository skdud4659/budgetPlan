/**
 * Plan Budget 타입 정의
 */

// 자산 타입
export type AssetType =
  | 'bank'
  | 'card'
  | 'cash'
  | 'loan'
  | 'insurance'
  | 'investment'
  | 'savings'
  | 'emoney'
  | 'point'
  | 'other';

// 카테고리 타입
export type CategoryType = 'income' | 'expense';

// 거래 타입
export type TransactionType = 'income' | 'expense' | 'transfer';

// 예산 타입
export type BudgetType = 'personal' | 'joint';

// 정기지출 타입
export type FixedItemType = 'fixed' | 'installment';

// 자산 인터페이스
export interface Asset {
  id: string;
  userId: string;
  name: string;
  type: AssetType;
  balance: number;
  billingDate?: number; // 결제일 (카드용, 1-31)
  settlementDate?: number; // 정산일 (카드용, 1-31) - 이 날부터 결제일까지의 사용금액이 다음 결제 예정
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// 카테고리 인터페이스
export interface Category {
  id: string;
  userId: string | null; // null이면 기본 카테고리
  name: string;
  iconCodePoint: number;
  colorValue: number;
  type: CategoryType;
  sortOrder: number;
  isDefault: boolean;
  createdAt: string;
}

// 거래 내역 인터페이스
export interface Transaction {
  id: string;
  userId: string;
  title: string;
  amount: number;
  date: string; // YYYY-MM-DD
  categoryId: string | null;
  type: TransactionType;
  assetId: string | null;
  toAssetId: string | null; // 이체 대상 자산
  budgetType: BudgetType;
  isFixed: boolean;
  fixedItemId: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  // Relations (optional - for joined queries)
  category?: Category;
  asset?: Asset;
  toAsset?: Asset;
}

// 정기지출 인터페이스
export interface FixedItem {
  id: string;
  userId: string;
  name: string;
  type: FixedItemType;
  amount: number;
  day: number; // 납부일 (1-31)
  categoryId: string | null;
  assetId: string | null;
  budgetType: BudgetType;
  totalTerm: number | null; // 할부 총 회차
  paidTerm: number; // 납부 완료 회차
  currentRound: number; // 현재 회차 (이어쓰기 시작점)
  startDate: string | null;
  isActive: boolean;
  createdAt: string;
  // Relations
  category?: Category;
  asset?: Asset;
}

// 앱 설정 인터페이스
export interface AppSettings {
  id: string;
  userId: string;
  jointBudgetEnabled: boolean;
  defaultAssetId: string | null;
  createdAt: string;
  updatedAt: string;
}

// 사용자 인터페이스
export interface User {
  id: string;
  email: string;
  createdAt: string;
}

// API 응답 타입
export interface ApiResponse<T> {
  data: T | null;
  error: Error | null;
}

// 월별 요약 타입
export interface MonthlySummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  personalExpense: number;
  jointExpense: number;
}

// 일별 거래 그룹 타입
export interface DailyTransactionGroup {
  date: string;
  transactions: Transaction[];
  totalIncome: number;
  totalExpense: number;
}

// 정기지출 진행률 타입
export interface FixedItemProgress {
  item: FixedItem;
  progress: number; // 0-100
  remainingMonths: number;
  isPaidThisMonth: boolean;
}

// Form 관련 타입
export interface TransactionFormData {
  title: string;
  amount: string;
  date: Date;
  categoryId: string | null;
  type: TransactionType;
  assetId: string | null;
  toAssetId: string | null;
  budgetType: BudgetType;
  note: string;
}

export interface AssetFormData {
  name: string;
  type: AssetType;
  balance: string;
  billingDate: string;
}

export interface FixedItemFormData {
  name: string;
  type: FixedItemType;
  amount: string;
  day: string;
  categoryId: string | null;
  assetId: string | null;
  budgetType: BudgetType;
  totalTerm: string; // 할부용
  currentRound: string; // 이어쓰기용
}

// Navigation 관련 타입
export type RootTabParamList = {
  home: undefined;
  scheduled: undefined;
  assets: undefined;
  settings: undefined;
};
