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
  installmentId: row.installment_id,
  originalAmount: row.original_amount ? parseFloat(row.original_amount) : null,
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

    const createdTransaction = transformTransaction(data);

    // 할부 마스터 생성 시 첫 번째 월별 거래도 함께 생성
    if (item.isInstallment && item.totalTerm && item.currentTerm && item.installmentDay) {
      const masterId = createdTransaction.id;
      const monthlyAmount = Math.round(item.amount / item.totalTerm);

      // 현재 월의 납부일 날짜 계산
      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth() + 1;
      const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
      const actualDay = Math.min(item.installmentDay, daysInMonth);
      const transactionDate = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(actualDay).padStart(2, "0")}`;

      // 첫 번째 월별 거래 생성
      await supabase.from("transactions").insert({
        user_id: user.id,
        title: item.title,
        amount: monthlyAmount,
        date: transactionDate,
        type: item.type,
        category_id: item.categoryId || null,
        asset_id: item.assetId || null,
        budget_type: item.budgetType,
        is_installment: true,
        total_term: item.totalTerm,
        current_term: item.currentTerm,
        installment_day: item.installmentDay,
        installment_id: masterId, // 마스터 참조
        original_amount: item.amount,
        include_in_living_expense: item.includeInLivingExpense ?? false,
      });
    }

    return createdTransaction;
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

    // 일반 거래 및 월별 할부 거래 조회 (마스터 할부 제외)
    // installment_id가 null이 아닌 것 = 월별 할부 거래
    // is_installment가 false인 것 = 일반 거래
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
      .or("is_installment.eq.false,and(is_installment.eq.true,installment_id.not.is.null)")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data || []).map(transformTransaction);
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

    // 일반 거래 및 월별 할부 거래 조회 (마스터 할부 제외)
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
      .or("is_installment.eq.false,and(is_installment.eq.true,installment_id.not.is.null)")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data || []).map(transformTransaction);
  },

  // 카드 결제 예정 금액 조회 (정산일 기준)
  // 결제 예정 금액: 정산일이 지난 기간 (지난달 정산일 ~ 이번달 정산일-1)
  // 미결제 금액: 현재 사용 중인 기간 (이번달 정산일 ~ 오늘)
  async getCardBillingAmount(
    assetId: string,
    settlementDate: number,
    billingDate: number
  ): Promise<{ currentBilling: number; nextBilling: number }> {
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    const formatDate = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    // 정산일 기준으로 기간 계산
    // 결제 예정 금액: 지난달 정산일 ~ 이번달 정산일-1
    const billingPeriodStart = new Date(currentYear, currentMonth - 1, settlementDate);
    const billingPeriodEnd = new Date(currentYear, currentMonth, settlementDate - 1);

    // 미결제 금액: 이번달 정산일 ~ 오늘
    const unbilledPeriodStart = new Date(currentYear, currentMonth, settlementDate);
    const unbilledPeriodEnd = today;

    // 정산일이 지났는지 확인
    const isAfterSettlement = currentDay >= settlementDate;

    // 결제 예정 금액 조회 - 지출 (마스터 할부 제외 - installment_id가 null이 아닌 것만)
    const { data: billingExpenseData, error: billingExpenseError } = await supabase
      .from("transactions")
      .select("amount, is_installment, installment_id")
      .eq("asset_id", assetId)
      .eq("type", "expense")
      .gte("date", formatDate(billingPeriodStart))
      .lte("date", formatDate(billingPeriodEnd))
      .or("is_installment.eq.false,and(is_installment.eq.true,installment_id.not.is.null)");

    if (billingExpenseError) throw billingExpenseError;

    // 결제 예정 금액에서 차감할 금액 조회 (수입 + 이체로 들어온 금액)
    const { data: billingIncomeData, error: billingIncomeError } = await supabase
      .from("transactions")
      .select("amount")
      .eq("asset_id", assetId)
      .eq("type", "income")
      .gte("date", formatDate(billingPeriodStart))
      .lte("date", formatDate(billingPeriodEnd));

    if (billingIncomeError) throw billingIncomeError;

    // 이체로 카드에 들어온 금액 (카드 대금 결제)
    // 결제는 정산 기간 이후에도 할 수 있으므로, 결제일(billingDate)까지 또는 오늘까지의 이체를 포함
    const billingTransferEnd = isAfterSettlement
      ? today
      : new Date(currentYear, currentMonth, billingDate);

    const { data: billingTransferData, error: billingTransferError } = await supabase
      .from("transactions")
      .select("amount")
      .eq("to_asset_id", assetId)
      .eq("type", "transfer")
      .gte("date", formatDate(billingPeriodStart))
      .lte("date", formatDate(billingTransferEnd));

    if (billingTransferError) throw billingTransferError;

    const billingExpense = (billingExpenseData || []).reduce((sum, t) => {
      return sum + parseFloat(t.amount);
    }, 0);

    const billingIncome = (billingIncomeData || []).reduce((sum, t) => {
      return sum + parseFloat(t.amount);
    }, 0);

    const billingTransfer = (billingTransferData || []).reduce((sum, t) => {
      return sum + parseFloat(t.amount);
    }, 0);

    const currentBilling = Math.max(0, billingExpense - billingIncome - billingTransfer);

    // 미결제 금액 조회 - 지출 (마스터 할부 제외)
    const { data: unbilledExpenseData, error: unbilledExpenseError } = await supabase
      .from("transactions")
      .select("amount, is_installment, installment_id")
      .eq("asset_id", assetId)
      .eq("type", "expense")
      .gte("date", formatDate(unbilledPeriodStart))
      .lte("date", formatDate(unbilledPeriodEnd))
      .or("is_installment.eq.false,and(is_installment.eq.true,installment_id.not.is.null)");

    if (unbilledExpenseError) throw unbilledExpenseError;

    // 미결제 금액에서 차감할 수입 조회 (이체는 제외 - 이체는 결제 예정 금액 결제용)
    const { data: unbilledIncomeData, error: unbilledIncomeError } = await supabase
      .from("transactions")
      .select("amount")
      .eq("asset_id", assetId)
      .eq("type", "income")
      .gte("date", formatDate(unbilledPeriodStart))
      .lte("date", formatDate(unbilledPeriodEnd));

    if (unbilledIncomeError) throw unbilledIncomeError;

    const unbilledExpense = (unbilledExpenseData || []).reduce((sum, t) => {
      return sum + parseFloat(t.amount);
    }, 0);

    const unbilledIncome = (unbilledIncomeData || []).reduce((sum, t) => {
      return sum + parseFloat(t.amount);
    }, 0);

    // 미결제 금액: 이체는 차감하지 않음 (이체는 결제 예정 금액을 갚는 용도)
    const nextBilling = Math.max(0, unbilledExpense - unbilledIncome);

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
          category_id: item.categoryId || null,
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

  // 할부 월별 거래 자동 생성 (고정비용과 유사)
  async generateInstallmentTransactions(
    monthStartDay: number
  ): Promise<{ generated: number; skipped: number }> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { generated: 0, skipped: 0 };

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();

    // 현재 기간의 시작/끝 계산
    let periodStartYear = currentYear;
    let periodStartMonth = currentMonth;
    let periodEndYear = currentYear;
    let periodEndMonth = currentMonth;

    if (monthStartDay !== 1) {
      if (currentDay < monthStartDay) {
        periodStartYear = currentMonth === 1 ? currentYear - 1 : currentYear;
        periodStartMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      } else {
        periodEndMonth = currentMonth === 12 ? 1 : currentMonth + 1;
        periodEndYear = currentMonth === 12 ? currentYear + 1 : currentYear;
      }
    }

    // 이미 이 기간에 할부 생성했는지 확인
    const periodKey = `${periodStartYear}-${String(periodStartMonth).padStart(2, "0")}-${monthStartDay}`;
    const generatedKey = `installment_generated_${user.id}_${periodKey}`;
    const alreadyGenerated = await AsyncStorage.getItem(generatedKey);

    if (alreadyGenerated) {
      return { generated: 0, skipped: 0 };
    }

    // 모든 할부 마스터 조회 (installment_id가 null인 것 = 마스터)
    const { data: installmentMasters, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_installment", true)
      .is("installment_id", null);

    if (error || !installmentMasters) {
      return { generated: 0, skipped: 0 };
    }

    let generated = 0;
    let skipped = 0;

    for (const master of installmentMasters) {
      try {
        const startDate = new Date(master.date);
        const startYear = startDate.getFullYear();
        const startMonth = startDate.getMonth() + 1;
        const totalTerm = master.total_term || 1;
        const currentTerm = master.current_term || 1;
        const installmentDay = master.installment_day || startDate.getDate();

        // 현재 기간에 해당하는 회차 계산
        const monthDiff = (periodStartYear - startYear) * 12 + (periodStartMonth - startMonth);
        const termForPeriod = currentTerm + monthDiff;

        // 유효한 회차인지 확인
        if (termForPeriod < 1 || termForPeriod > totalTerm) {
          skipped++;
          continue;
        }

        // 거래 날짜 계산
        let transactionYear: number;
        let transactionMonth: number;

        if (monthStartDay === 1) {
          transactionYear = periodStartYear;
          transactionMonth = periodStartMonth;
        } else {
          if (installmentDay >= monthStartDay) {
            transactionYear = periodStartYear;
            transactionMonth = periodStartMonth;
          } else {
            transactionYear = periodEndYear;
            transactionMonth = periodEndMonth;
          }
        }

        const daysInMonth = new Date(transactionYear, transactionMonth, 0).getDate();
        const actualDay = Math.min(installmentDay, daysInMonth);
        const transactionDate = `${transactionYear}-${String(transactionMonth).padStart(2, "0")}-${String(actualDay).padStart(2, "0")}`;

        // 이미 해당 기간에 이 할부의 월별 거래가 있는지 확인
        const { data: existing } = await supabase
          .from("transactions")
          .select("id")
          .eq("user_id", user.id)
          .eq("installment_id", master.id)
          .eq("date", transactionDate)
          .single();

        if (existing) {
          skipped++;
          continue;
        }

        // 월별 금액 계산
        const monthlyAmount = Math.round(master.amount / totalTerm);

        // 월별 거래 생성
        await supabase.from("transactions").insert({
          user_id: user.id,
          title: master.title,
          amount: monthlyAmount,
          date: transactionDate,
          type: "expense",
          category_id: master.category_id,
          asset_id: master.asset_id,
          budget_type: master.budget_type,
          is_installment: true,
          total_term: totalTerm,
          current_term: termForPeriod,
          installment_day: installmentDay,
          installment_id: master.id, // 마스터 참조
          original_amount: master.amount,
          include_in_living_expense: master.include_in_living_expense ?? false,
        });

        generated++;
      } catch (error) {
        console.error(`할부 거래 생성 실패: ${master.title}`, error);
        skipped++;
      }
    }

    // 생성 완료 표시
    if (generated > 0 || installmentMasters.length === skipped) {
      await AsyncStorage.setItem(generatedKey, new Date().toISOString());
    }

    return { generated, skipped };
  },

  // 할부 월별 거래 조회 (실제 생성된 거래만)
  async getMonthlyInstallmentTransactions(
    year: number,
    month: number,
    monthStartDay: number
  ): Promise<Transaction[]> {
    const { startDate, endDate } = this.getMonthDateRange(year, month, monthStartDay);

    const { data, error } = await supabase
      .from("transactions")
      .select(
        `
        *,
        categories (id, user_id, name, icon_name, color, type, sort_order, is_default, is_hidden, created_at),
        assets!transactions_asset_id_fkey (id, user_id, name, type, balance, billing_date, settlement_date, sort_order, created_at, updated_at)
      `
      )
      .eq("is_installment", true)
      .not("installment_id", "is", null) // 마스터가 아닌 월별 거래만
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: false });

    if (error) throw error;
    return (data || []).map(transformTransaction);
  },

  // 할부 마스터 목록 조회 (진행중인 것만)
  async getInstallmentMasters(): Promise<Transaction[]> {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;

    const { data, error } = await supabase
      .from("transactions")
      .select(
        `
        *,
        categories (id, user_id, name, icon_name, color, type, sort_order, is_default, is_hidden, created_at),
        assets!transactions_asset_id_fkey (id, user_id, name, type, balance, billing_date, settlement_date, sort_order, created_at, updated_at)
      `
      )
      .eq("is_installment", true)
      .is("installment_id", null) // 마스터만
      .order("date", { ascending: false });

    if (error) throw error;

    // 진행중인 할부만 필터링 (현재 월 기준)
    return (data || [])
      .map(transformTransaction)
      .filter((master) => {
        if (!master.totalTerm || !master.currentTerm) return false;
        const startDate = new Date(master.date);
        const startYear = startDate.getFullYear();
        const startMonth = startDate.getMonth() + 1;
        const monthDiff = (currentYear - startYear) * 12 + (currentMonth - startMonth);
        const termForNow = master.currentTerm + monthDiff;
        return termForNow >= 1 && termForNow <= master.totalTerm;
      });
  },

  // 할부 마스터와 관련 월별 거래 모두 삭제
  async deleteInstallmentWithAllTransactions(masterId: string): Promise<void> {
    // 먼저 월별 거래 삭제
    await supabase
      .from("transactions")
      .delete()
      .eq("installment_id", masterId);

    // 마스터 삭제
    await supabase
      .from("transactions")
      .delete()
      .eq("id", masterId);
  },
};
