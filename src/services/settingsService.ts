import { supabase } from "../config/supabase";
import type { AppSettings } from "../types";

// DB 스네이크케이스 → 앱 카멜케이스 변환
const transformSettings = (row: any): AppSettings => ({
  id: row.id,
  userId: row.user_id,
  jointBudgetEnabled: row.joint_budget_enabled,
  defaultAssetId: row.default_asset_id,
  monthStartDay: row.month_start_day || 1,
  lastProcessedMonth: row.last_processed_month,
  personalBudget: parseFloat(row.personal_budget) || 0,
  jointBudget: parseFloat(row.joint_budget) || 0,
  onboardingCompleted: row.onboarding_completed ?? false,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const settingsService = {
  // 사용자 설정 조회 (없으면 생성)
  async getSettings(): Promise<AppSettings> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("로그인이 필요합니다.");

    // 기존 설정 조회
    const { data, error } = await supabase
      .from("app_settings")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    // 설정이 없으면 기본값으로 생성
    if (!data) {
      const { data: newSettings, error: createError } = await supabase
        .from("app_settings")
        .insert({
          user_id: user.id,
          joint_budget_enabled: true,
          default_asset_id: null,
          month_start_day: 1,
          last_processed_month: null,
          personal_budget: 0,
          joint_budget: 0,
          onboarding_completed: false,
        })
        .select()
        .single();

      if (createError) throw createError;
      return transformSettings(newSettings);
    }

    return transformSettings(data);
  },

  // 설정 업데이트
  async updateSettings(updates: {
    jointBudgetEnabled?: boolean;
    defaultAssetId?: string | null;
    monthStartDay?: number;
    lastProcessedMonth?: string | null;
    personalBudget?: number;
    jointBudget?: number;
    onboardingCompleted?: boolean;
  }): Promise<AppSettings> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("로그인이 필요합니다.");

    const updateData: any = {};
    if (updates.jointBudgetEnabled !== undefined)
      updateData.joint_budget_enabled = updates.jointBudgetEnabled;
    if (updates.defaultAssetId !== undefined)
      updateData.default_asset_id = updates.defaultAssetId;
    if (updates.monthStartDay !== undefined)
      updateData.month_start_day = updates.monthStartDay;
    if (updates.lastProcessedMonth !== undefined)
      updateData.last_processed_month = updates.lastProcessedMonth;
    if (updates.personalBudget !== undefined)
      updateData.personal_budget = updates.personalBudget;
    if (updates.jointBudget !== undefined)
      updateData.joint_budget = updates.jointBudget;
    if (updates.onboardingCompleted !== undefined)
      updateData.onboarding_completed = updates.onboardingCompleted;

    const { data, error } = await supabase
      .from("app_settings")
      .update(updateData)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) throw error;
    return transformSettings(data);
  },

  // 현재 월 계산 (월 시작일 기준)
  getCurrentMonth(monthStartDay: number): string {
    const now = new Date();
    const currentDay = now.getDate();

    // 현재 날짜가 시작일 이전이면 이전 달로 계산
    if (currentDay < monthStartDay) {
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}`;
    }

    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  },

  // 새로운 월이 시작되었는지 확인
  isNewMonthStarted(monthStartDay: number, lastProcessedMonth: string | null): boolean {
    const currentMonth = this.getCurrentMonth(monthStartDay);

    // 처리 기록이 없으면 새로운 월
    if (!lastProcessedMonth) return true;

    // 현재 월과 마지막 처리 월이 다르면 새로운 월
    return currentMonth !== lastProcessedMonth;
  },

  // [테스트용] 마지막 처리 월 초기화 - 다음 화면 진입 시 할부 자동 처리됨
  async resetLastProcessedMonth(): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("로그인이 필요합니다.");

    await supabase
      .from("app_settings")
      .update({ last_processed_month: null })
      .eq("user_id", user.id);

    console.log("✅ last_processed_month 초기화됨. 정기지출 화면 새로고침하면 할부 처리됩니다.");
  },
};
