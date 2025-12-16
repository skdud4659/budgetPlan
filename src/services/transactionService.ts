import { supabase } from "../config/supabase";
import type { Transaction, TransactionType, BudgetType, FixedItem } from "../types";
import AsyncStorage from "@react-native-async-storage/async-storage";

// DB 스네이크케이스 → 앱 카멜케이스 변환
const transformTransaction = (row: any): Transaction => ({
  id: row.id,
  userId: row.user_id,
  title: row.title,
  amount: parseFloat(row.amount),
  date: row.date,
  categoryId: row.category_id,
  type: row.type as TransactionType,
  assetId: row.asset_id,
  toAssetId: row.to_asset_id,
  budgetType: row.budget_type as BudgetType,
  note: row.note,
  // 할부 관련 필드
  isInstallment: row.is_installment || false,
  totalTerm: row.total_term,
  currentTerm: row.current_term,
  installmentDay: row.installment_day,
  includeInLivingExpense: row.include_in_living_expense ?? true,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  // 조인된 카테고리 정보
  category: row.categories
    ? {
        id: row.categories.id,
        userId: row.categories.user_id,
        name: row.categories.name,
        iconName: row.categories.icon_name,
        color: row.categories.color,
        type: row.categories.type,
        sortOrder: row.categories.sort_order,
        isDefault: row.categories.is_default,
        isHidden: row.categories.is_hidden,
        createdAt: row.categories.created_at,
      }
    : undefined,
  // 조인된 자산 정보
  asset: row.assets
    ? {
        id: row.assets.id,
        userId: row.assets.user_id,
        name: row.assets.name,
        type: row.assets.type,
        balance: parseFloat(row.assets.balance),
        billingDate: row.assets.billing_date,
        settlementDate: row.assets.settlement_date,
        sortOrder: row.assets.sort_order,
        createdAt: row.assets.created_at,
        updatedAt: row.assets.updated_at,
      }
    : undefined,
  // 이체 대상 자산 정보
  toAsset: row.to_assets
    ? {
        id: row.to_assets.id,
        userId: row.to_assets.user_id,
        name: row.to_assets.name,
        type: row.to_assets.type,
        balance: parseFloat(row.to_assets.balance),
        billingDate: row.to_assets.billing_date,
        settlementDate: row.to_assets.settlement_date,
        sortOrder: row.to_assets.sort_order,
        createdAt: row.to_assets.created_at,
        updatedAt: row.to_assets.updated_at,
      }
    : undefined,
});

export const transactionService = {
  // 거래 내역 목록 조회 (월별)
  async getTransactions(year: number, month: number): Promise<Transaction[]> {
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = new Date(year, month, 0).toISOString().split("T")[0]; // 해당 월의 마지막 날

    const { data, error } = await supabase
      .from("transactions")
      .select(
        `
        *,
        categories (id, user_id, name, icon_name, color, type, sort_order, is_default, is_hidden, created_at),
        assets!transactions_asset_id_fkey (id, user_id, name, type, balance, billing_date, settlement_date, sort_order, created_at, updated_at),
        to_assets:assets!transactions_to_asset_id_fkey (id, user_id, name, type, balance, billing_date, settlement_date, sort_order, created_at, updated_at)
      `
      )
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []).map(transformTransaction);
  },

  // 거래 내역 단일 조회
  async getTransaction(id: string): Promise<Transaction | null> {
    const { data, error } = await supabase
      .from("transactions")
      .select(
        `
        *,
        categories (id, user_id, name, icon_name, color, type, sort_order, is_default, is_hidden, created_at),
        assets!transactions_asset_id_fkey (id, user_id, name, type, balance, billing_date, settlement_date, sort_order, created_at, updated_at),
        to_assets:assets!transactions_to_asset_id_fkey (id, user_id, name, type, balance, billing_date, settlement_date, sort_order, created_at, updated_at)
      `
      )
      .eq("id", id)
      .single();

    if (error) throw error;
    return data ? transformTransaction(data) : null;
  },

  // 거래 내역 추가
  async createTransaction(item: {
    title: string;
    amount: number;
    date: string;
    categoryId?: string | null;
    type: TransactionType;
    assetId?: string | null;
    toAssetId?: string | null;
    budgetType: BudgetType;
    note?: string | null;
    // 할부 관련 필드
    isInstallment?: boolean;
    totalTerm?: number | null;
    currentTerm?: number | null;
    installmentDay?: number | null;
    includeInLivingExpense?: boolean;
  }): Promise<Transaction> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("로그인이 필요합니다.");

    const { data, error } = await supabase
      .from("transactions")
      .insert({
        user_id: user.id,
        title: item.title,
        amount: item.amount,
        date: item.date,
        category_id: item.categoryId || null,
        type: item.type,
        asset_id: item.assetId || null,
        to_asset_id: item.toAssetId || null,
        budget_type: item.budgetType,
        note: item.note || null,
        // 할부 관련 필드
        is_installment: item.isInstallment || false,
        total_term: item.totalTerm || null,
        current_term: item.currentTerm || null,
        installment_day: item.installmentDay || null,
        include_in_living_expense: item.includeInLivingExpense ?? true,
      })
      .select(
        `
        *,
        categories (id, user_id, name, icon_name, color, type, sort_order, is_default, is_hidden, created_at),
        assets!transactions_asset_id_fkey (id, user_id, name, type, balance, billing_date, settlement_date, sort_order, created_at, updated_at),
        to_assets:assets!transactions_to_asset_id_fkey (id, user_id, name, type, balance, billing_date, settlement_date, sort_order, created_at, updated_at)
      `
      )
      .single();

    if (error) throw error;

    // 자산 잔액은 assetService에서 거래 기반으로 자동 계산되므로 별도 업데이트 불필요

    return transformTransaction(data);
  },

  // 거래 내역 수정
  async updateTransaction(
    id: string,
    updates: {
      title?: string;
      amount?: number;
      date?: string;
      categoryId?: string | null;
      type?: TransactionType;
      assetId?: string | null;
      toAssetId?: string | null;
      budgetType?: BudgetType;
      note?: string | null;
      // 할부 관련 필드
      isInstallment?: boolean;
      totalTerm?: number | null;
      currentTerm?: number | null;
      installmentDay?: number | null;
      includeInLivingExpense?: boolean;
    }
  ): Promise<Transaction> {
    const updateData: any = {};

    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.amount !== undefined) updateData.amount = updates.amount;
    if (updates.date !== undefined) updateData.date = updates.date;
    if (updates.categoryId !== undefined) updateData.category_id = updates.categoryId;
    if (updates.type !== undefined) updateData.type = updates.type;
    if (updates.assetId !== undefined) updateData.asset_id = updates.assetId;
    if (updates.toAssetId !== undefined) updateData.to_asset_id = updates.toAssetId;
    if (updates.budgetType !== undefined) updateData.budget_type = updates.budgetType;
    if (updates.note !== undefined) updateData.note = updates.note;
    // 할부 관련 필드
    if (updates.isInstallment !== undefined) updateData.is_installment = updates.isInstallment;
    if (updates.totalTerm !== undefined) updateData.total_term = updates.totalTerm;
    if (updates.currentTerm !== undefined) updateData.current_term = updates.currentTerm;
    if (updates.installmentDay !== undefined) updateData.installment_day = updates.installmentDay;
    if (updates.includeInLivingExpense !== undefined) updateData.include_in_living_expense = updates.includeInLivingExpense;

    const { data, error } = await supabase
      .from("transactions")
      .update(updateData)
      .eq("id", id)
      .select(
        `
        *,
        categories (id, user_id, name, icon_name, color, type, sort_order, is_default, is_hidden, created_at),
        assets!transactions_asset_id_fkey (id, user_id, name, type, balance, billing_date, settlement_date, sort_order, created_at, updated_at),
        to_assets:assets!transactions_to_asset_id_fkey (id, user_id, name, type, balance, billing_date, settlement_date, sort_order, created_at, updated_at)
      `
      )
      .single();

    if (error) throw error;

    // 자산 잔액은 assetService에서 거래 기반으로 자동 계산되므로 별도 업데이트 불필요

    return transformTransaction(data);
  },

  // 거래 내역 삭제
  async deleteTransaction(id: string): Promise<void> {
    const { error } = await supabase.from("transactions").delete().eq("id", id);

    if (error) throw error;

    // 자산 잔액은 assetService에서 거래 기반으로 자동 계산되므로 별도 업데이트 불필요
  },

  // 월 시작일 기준 날짜 범위 계산
  getMonthDateRange(year: number, month: number, monthStartDay: number): { startDate: string; endDate: string } {
    // 월 시작일이 1일이면 기존 로직
    if (monthStartDay === 1) {
      const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      return { startDate, endDate };
    }

    // 월 시작일이 1일이 아닌 경우
    // 예: 월 시작일 5일, 12월 선택 → 12/5 ~ 1/4
    const startDate = `${year}-${String(month).padStart(2, "0")}-${String(monthStartDay).padStart(2, "0")}`;

    // 종료일은 다음 달의 시작일 - 1일
    let endYear = year;
    let endMonth = month + 1;
    if (endMonth > 12) {
      endMonth = 1;
      endYear++;
    }
    const endDay = monthStartDay - 1;
    const endDate = `${endYear}-${String(endMonth).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`;

    return { startDate, endDate };
  },

  // 거래 내역 + 할부 통합 조회 (월별, 월 시작일 기준)
  async getTransactionsWithInstallmentsByStartDay(
    year: number,
    month: number,
    monthStartDay: number
  ): Promise<Transaction[]> {
    const { startDate, endDate } = this.getMonthDateRange(year, month, monthStartDay);

    // 일반 거래 조회 (할부 제외)
    const { data, error } = await supabase
      .from("transactions")
      .select(
        `
        *,
        categories (id, user_id, name, icon_name, color, type, sort_order, is_default, is_hidden, created_at),
        assets!transactions_asset_id_fkey (id, user_id, name, type, balance, billing_date, settlement_date, sort_order, created_at, updated_at),
        to_assets:assets!transactions_to_asset_id_fkey (id, user_id, name, type, balance, billing_date, settlement_date, sort_order, created_at, updated_at)
      `
      )
      .gte("date", startDate)
      .lte("date", endDate)
      .eq("is_installment", false)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) throw error;

    const regularTransactions = (data || []).map(transformTransaction);

    // 해당 기간의 할부 조회
    const installments = await this.getInstallmentsForDateRange(startDate, endDate);

    // 통합하여 날짜순 정렬
    const allTransactions = [...regularTransactions, ...installments].sort((a, b) => {
      if (a.date !== b.date) {
        return b.date.localeCompare(a.date);
      }
      return b.createdAt.localeCompare(a.createdAt);
    });

    return allTransactions;
  },

  // 날짜 범위 기준 할부 조회
  async getInstallmentsForDateRange(startDate: string, endDate: string): Promise<Transaction[]> {
    // 모든 할부 거래 조회
    const { data, error } = await supabase
      .from("transactions")
      .select(
        `
        *,
        categories (id, user_id, name, icon_name, color, type, sort_order, is_default, is_hidden, created_at),
        assets!transactions_asset_id_fkey (id, user_id, name, type, balance, billing_date, settlement_date, sort_order, created_at, updated_at),
        to_assets:assets!transactions_to_asset_id_fkey (id, user_id, name, type, balance, billing_date, settlement_date, sort_order, created_at, updated_at)
      `
      )
      .eq("is_installment", true)
      .order("date", { ascending: false });

    if (error) throw error;

    const start = new Date(startDate);
    const end = new Date(endDate);

    // 해당 기간에 유효한 할부만 필터링
    const validInstallments: Transaction[] = [];

    (data || []).map(transformTransaction).forEach((t) => {
      if (!t.totalTerm || !t.currentTerm || !t.installmentDay) return;

      const originalDate = new Date(t.date);
      const originalYear = originalDate.getFullYear();
      const originalMonth = originalDate.getMonth();

      // 할부 시작일부터 totalTerm개월 동안 각 월의 할부일 계산
      for (let i = 0; i < t.totalTerm; i++) {
        const termMonth = originalMonth + i;
        const termYear = originalYear + Math.floor(termMonth / 12);
        const actualMonth = (termMonth % 12) + 1;

        const installmentDateStr = `${termYear}-${String(actualMonth).padStart(2, "0")}-${String(t.installmentDay).padStart(2, "0")}`;
        const installmentDate = new Date(installmentDateStr);

        // 날짜 범위 내인지 확인
        if (installmentDate >= start && installmentDate <= end) {
          validInstallments.push({
            ...t,
            currentTerm: t.currentTerm + i,
            date: installmentDateStr,
          });
        }
      }
    });

    return validInstallments;
  },

  // 할부 거래 조회 (해당 월에 납입 기간인 할부들)
  async getInstallmentsForMonth(year: number, month: number): Promise<Transaction[]> {
    // 모든 할부 거래 조회
    const { data, error } = await supabase
      .from("transactions")
      .select(
        `
        *,
        categories (id, user_id, name, icon_name, color, type, sort_order, is_default, is_hidden, created_at),
        assets!transactions_asset_id_fkey (id, user_id, name, type, balance, billing_date, settlement_date, sort_order, created_at, updated_at),
        to_assets:assets!transactions_to_asset_id_fkey (id, user_id, name, type, balance, billing_date, settlement_date, sort_order, created_at, updated_at)
      `
      )
      .eq("is_installment", true)
      .order("date", { ascending: false });

    if (error) throw error;

    const targetDate = new Date(year, month - 1, 1); // 조회하려는 월

    // 해당 월에 유효한 할부만 필터링하고 회차 계산
    const validInstallments = (data || [])
      .map(transformTransaction)
      .map((t) => {
        if (!t.totalTerm || !t.currentTerm || !t.installmentDay) return null;

        const startDate = new Date(t.date);
        const startYear = startDate.getFullYear();
        const startMonth = startDate.getMonth();

        // 조회 월과 시작 월의 차이 계산
        const monthDiff = (year - startYear) * 12 + (month - 1 - startMonth);

        // 해당 월의 회차 계산 (시작 회차 + 경과 월)
        const termForMonth = t.currentTerm + monthDiff;

        // 유효한 회차인지 확인 (1 ~ totalTerm)
        if (termForMonth < 1 || termForMonth > t.totalTerm) return null;

        // 해당 월의 날짜 생성
        const installmentDate = `${year}-${String(month).padStart(2, "0")}-${String(t.installmentDay).padStart(2, "0")}`;

        // 복사본 생성하여 회차와 날짜 업데이트
        return {
          ...t,
          currentTerm: termForMonth,
          date: installmentDate,
        };
      })
      .filter((t): t is Transaction & { currentTerm: number } => t !== null) as Transaction[];

    return validInstallments;
  },

  // 거래 내역 + 할부 통합 조회 (월별)
  async getTransactionsWithInstallments(year: number, month: number): Promise<Transaction[]> {
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = new Date(year, month, 0).toISOString().split("T")[0];

    // 일반 거래 조회 (할부 제외)
    const { data, error } = await supabase
      .from("transactions")
      .select(
        `
        *,
        categories (id, user_id, name, icon_name, color, type, sort_order, is_default, is_hidden, created_at),
        assets!transactions_asset_id_fkey (id, user_id, name, type, balance, billing_date, settlement_date, sort_order, created_at, updated_at),
        to_assets:assets!transactions_to_asset_id_fkey (id, user_id, name, type, balance, billing_date, settlement_date, sort_order, created_at, updated_at)
      `
      )
      .gte("date", startDate)
      .lte("date", endDate)
      .eq("is_installment", false)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) throw error;

    const regularTransactions = (data || []).map(transformTransaction);

    // 해당 월의 할부 조회
    const installments = await this.getInstallmentsForMonth(year, month);

    // 통합하여 날짜순 정렬
    const allTransactions = [...regularTransactions, ...installments].sort((a, b) => {
      if (a.date !== b.date) {
        return b.date.localeCompare(a.date);
      }
      return b.createdAt.localeCompare(a.createdAt);
    });

    return allTransactions;
  },

  // 카드 결제 예정 금액 조회 (정산일~결제일 기준)
  async getCardBillingAmount(
    assetId: string,
    settlementDate: number,
    billingDate: number
  ): Promise<{ currentBilling: number; nextBilling: number }> {
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // 이번 달 결제 예정 금액 계산
    // 정산일부터 결제일까지의 사용금액
    let currentBillingStart: Date;
    let currentBillingEnd: Date;

    if (settlementDate < billingDate) {
      // 정산일 < 결제일: 같은 달 (예: 정산 15일, 결제 25일 → 15~24일 사용분)
      currentBillingStart = new Date(currentYear, currentMonth - 1, settlementDate);
      currentBillingEnd = new Date(currentYear, currentMonth, billingDate - 1);
    } else {
      // 정산일 >= 결제일: 월 걸침 (예: 정산 25일, 결제 15일 → 전월 25일~이번달 14일 사용분)
      currentBillingStart = new Date(currentYear, currentMonth - 2, settlementDate);
      currentBillingEnd = new Date(currentYear, currentMonth - 1, billingDate - 1);
    }

    // 다음 달 결제 예정 금액 (현재 사용 중인 기간)
    let nextBillingStart: Date;
    let nextBillingEnd: Date;

    if (settlementDate < billingDate) {
      nextBillingStart = new Date(currentYear, currentMonth, settlementDate);
      nextBillingEnd = new Date(currentYear, currentMonth + 1, billingDate - 1);
    } else {
      nextBillingStart = new Date(currentYear, currentMonth - 1, settlementDate);
      nextBillingEnd = new Date(currentYear, currentMonth, billingDate - 1);
    }

    const formatDate = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    // 정기지출 조회 (해당 카드에 연결된 모든 정기지출)
    const { data: fixedItemsData, error: fixedError } = await supabase
      .from("fixed_items")
      .select("amount")
      .eq("asset_id", assetId);

    if (fixedError) throw fixedError;

    const fixedExpenseTotal = (fixedItemsData || []).reduce(
      (sum, f) => sum + parseFloat(f.amount),
      0
    );

    // 이번 달 결제 예정 금액 조회 (거래 내역)
    const { data: currentData, error: currentError } = await supabase
      .from("transactions")
      .select("amount, is_installment, total_term")
      .eq("asset_id", assetId)
      .eq("type", "expense")
      .gte("date", formatDate(currentBillingStart))
      .lte("date", formatDate(currentBillingEnd));

    if (currentError) throw currentError;

    const currentTransactionBilling = (currentData || []).reduce((sum, t) => {
      if (t.is_installment && t.total_term > 0) {
        return sum + Math.round(parseFloat(t.amount) / t.total_term);
      }
      return sum + parseFloat(t.amount);
    }, 0);

    // 다음 달 결제 예정 금액 조회 (거래 내역)
    const { data: nextData, error: nextError } = await supabase
      .from("transactions")
      .select("amount, is_installment, total_term")
      .eq("asset_id", assetId)
      .eq("type", "expense")
      .gte("date", formatDate(nextBillingStart))
      .lte("date", formatDate(nextBillingEnd));

    if (nextError) throw nextError;

    const nextTransactionBilling = (nextData || []).reduce((sum, t) => {
      if (t.is_installment && t.total_term > 0) {
        return sum + Math.round(parseFloat(t.amount) / t.total_term);
      }
      return sum + parseFloat(t.amount);
    }, 0);

    // 거래 내역 + 정기지출 합산
    const currentBilling = currentTransactionBilling + fixedExpenseTotal;
    const nextBilling = nextTransactionBilling + fixedExpenseTotal;

    return { currentBilling, nextBilling };
  },

  // 월별 요약 조회
  async getMonthlySummary(
    year: number,
    month: number
  ): Promise<{
    totalIncome: number;
    totalExpense: number;
    personalExpense: number;
    jointExpense: number;
  }> {
    const transactions = await this.getTransactions(year, month);

    const totalIncome = transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    const personalExpense = transactions
      .filter((t) => t.type === "expense" && t.budgetType === "personal")
      .reduce((sum, t) => sum + t.amount, 0);

    const jointExpense = transactions
      .filter((t) => t.type === "expense" && t.budgetType === "joint")
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      totalIncome,
      totalExpense,
      personalExpense,
      jointExpense,
    };
  },

  // 정기지출을 거래로 자동 생성 (월 시작일 기준)
  async generateFixedTransactions(
    fixedItems: FixedItem[],
    monthStartDay: number
  ): Promise<{ generated: number; skipped: number }> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("로그인이 필요합니다.");

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();

    // 현재 기간의 시작일과 종료일 계산
    let periodStartYear = currentYear;
    let periodStartMonth = currentMonth;
    let periodEndYear = currentYear;
    let periodEndMonth = currentMonth;

    if (monthStartDay === 1) {
      // 월 시작일이 1일이면 현재 달
      periodStartYear = currentYear;
      periodStartMonth = currentMonth;
      periodEndYear = currentMonth === 12 ? currentYear + 1 : currentYear;
      periodEndMonth = currentMonth === 12 ? 1 : currentMonth + 1;
    } else {
      // 월 시작일이 1일이 아닌 경우
      if (currentDay >= monthStartDay) {
        // 현재 날짜가 시작일 이후: 이번 달 시작일 ~ 다음 달 시작일 전날
        periodStartYear = currentYear;
        periodStartMonth = currentMonth;
        periodEndYear = currentMonth === 12 ? currentYear + 1 : currentYear;
        periodEndMonth = currentMonth === 12 ? 1 : currentMonth + 1;
      } else {
        // 현재 날짜가 시작일 이전: 저번 달 시작일 ~ 이번 달 시작일 전날
        periodStartYear = currentMonth === 1 ? currentYear - 1 : currentYear;
        periodStartMonth = currentMonth === 1 ? 12 : currentMonth - 1;
        periodEndYear = currentYear;
        periodEndMonth = currentMonth;
      }
    }

    // 이 기간에 대해 이미 정기지출이 생성되었는지 확인하는 키
    const periodKey = `${periodStartYear}-${String(periodStartMonth).padStart(2, "0")}-${monthStartDay}`;
    const generatedKey = `fixed_generated_${user.id}_${periodKey}`;

    // 이미 생성된 경우 스킵
    const alreadyGenerated = await AsyncStorage.getItem(generatedKey);
    if (alreadyGenerated) {
      return { generated: 0, skipped: fixedItems.length };
    }

    let generated = 0;
    let skipped = 0;

    // 각 정기지출에 대해 거래 생성
    for (const item of fixedItems) {
      try {
        // 정기지출 날짜 계산: 해당 기간 내에 정기지출일이 있는지 확인
        let transactionYear: number;
        let transactionMonth: number;
        const fixedDay = item.day;

        // 해당 기간 내에서 정기지출일이 언제인지 계산
        if (monthStartDay === 1) {
          // 1일 시작: 현재 달에 정기지출 생성
          transactionYear = periodStartYear;
          transactionMonth = periodStartMonth;
        } else {
          // 중간일 시작: 정기지출일이 시작일 이후면 현재 달, 아니면 다음 달
          if (fixedDay >= monthStartDay) {
            transactionYear = periodStartYear;
            transactionMonth = periodStartMonth;
          } else {
            transactionYear = periodEndYear;
            transactionMonth = periodEndMonth;
          }
        }

        // 거래 날짜 생성
        const daysInMonth = new Date(transactionYear, transactionMonth, 0).getDate();
        const actualDay = Math.min(fixedDay, daysInMonth);
        const transactionDate = `${transactionYear}-${String(transactionMonth).padStart(2, "0")}-${String(actualDay).padStart(2, "0")}`;

        // 이미 동일한 정기지출이 해당 날짜에 생성되었는지 확인
        const { data: existing } = await supabase
          .from("transactions")
          .select("id")
          .eq("user_id", user.id)
          .eq("title", item.name)
          .eq("amount", item.amount)
          .eq("date", transactionDate)
          .eq("type", "expense")
          .single();

        if (existing) {
          skipped++;
          continue;
        }

        // 거래 생성
        await supabase.from("transactions").insert({
          user_id: user.id,
          title: item.name,
          amount: item.amount,
          date: transactionDate,
          type: "expense",
          asset_id: item.assetId || null,
          budget_type: item.budgetType,
          is_installment: false,
          include_in_living_expense: false, // 정기지출은 생활비에 포함하지 않음
        });

        generated++;
      } catch (error) {
        console.error(`정기지출 거래 생성 실패: ${item.name}`, error);
        skipped++;
      }
    }

    // 생성 완료 표시
    if (generated > 0) {
      await AsyncStorage.setItem(generatedKey, new Date().toISOString());
    }

    return { generated, skipped };
  },

  // 정기지출 자동 생성이 필요한지 확인
  async shouldGenerateFixedTransactions(monthStartDay: number): Promise<boolean> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();

    // 현재 기간의 시작일 계산
    let periodStartYear = currentYear;
    let periodStartMonth = currentMonth;

    if (monthStartDay !== 1 && currentDay < monthStartDay) {
      periodStartYear = currentMonth === 1 ? currentYear - 1 : currentYear;
      periodStartMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    }

    const periodKey = `${periodStartYear}-${String(periodStartMonth).padStart(2, "0")}-${monthStartDay}`;
    const generatedKey = `fixed_generated_${user.id}_${periodKey}`;

    const alreadyGenerated = await AsyncStorage.getItem(generatedKey);
    return !alreadyGenerated;
  },
};
