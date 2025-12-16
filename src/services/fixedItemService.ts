import { supabase } from "../config/supabase";
import type { FixedItem, FixedItemType, BudgetType } from "../types";

// DB 스네이크케이스 → 앱 카멜케이스 변환
const transformFixedItem = (row: any): FixedItem => ({
  id: row.id,
  userId: row.user_id,
  name: row.name,
  type: row.type as FixedItemType,
  amount: parseFloat(row.amount),
  day: row.day,
  categoryId: row.category_id,
  assetId: row.asset_id,
  budgetType: row.budget_type as BudgetType,
  isActive: row.is_active,
  createdAt: row.created_at,
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
});

export const fixedItemService = {
  // 정기지출 목록 조회
  async getFixedItems(): Promise<FixedItem[]> {
    const { data, error } = await supabase
      .from("fixed_items")
      .select(
        `
        *,
        categories:category_id (id, user_id, name, icon_name, color, type, sort_order, is_default, is_hidden, created_at),
        assets:asset_id (id, user_id, name, type, balance, billing_date, settlement_date, sort_order, created_at, updated_at)
      `
      )
      .eq("is_active", true)
      .order("day", { ascending: true });

    if (error) throw error;
    return (data || []).map(transformFixedItem);
  },

  // 정기지출 단일 조회
  async getFixedItem(id: string): Promise<FixedItem | null> {
    const { data, error } = await supabase
      .from("fixed_items")
      .select(
        `
        *,
        categories:category_id (id, user_id, name, icon_name, color, type, sort_order, is_default, is_hidden, created_at),
        assets:asset_id (id, user_id, name, type, balance, billing_date, settlement_date, sort_order, created_at, updated_at)
      `
      )
      .eq("id", id)
      .single();

    if (error) throw error;
    return data ? transformFixedItem(data) : null;
  },

  // 정기지출 추가
  async createFixedItem(item: {
    name: string;
    type: FixedItemType;
    amount: number;
    day: number;
    categoryId?: string | null;
    assetId?: string | null;
    budgetType: BudgetType;
  }): Promise<FixedItem> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("로그인이 필요합니다.");

    const { data, error } = await supabase
      .from("fixed_items")
      .insert({
        user_id: user.id,
        name: item.name,
        type: item.type,
        amount: item.amount,
        day: item.day,
        category_id: item.categoryId || null,
        asset_id: item.assetId || null,
        budget_type: item.budgetType,
      })
      .select(
        `
        *,
        categories:category_id (id, user_id, name, icon_name, color, type, sort_order, is_default, is_hidden, created_at),
        assets:asset_id (id, user_id, name, type, balance, billing_date, settlement_date, sort_order, created_at, updated_at)
      `
      )
      .single();

    if (error) throw error;
    return transformFixedItem(data);
  },

  // 정기지출 수정
  async updateFixedItem(
    id: string,
    updates: {
      name?: string;
      type?: FixedItemType;
      amount?: number;
      day?: number;
      categoryId?: string | null;
      assetId?: string | null;
      budgetType?: BudgetType;
      isActive?: boolean;
    }
  ): Promise<FixedItem> {
    const updateData: any = {};

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.type !== undefined) updateData.type = updates.type;
    if (updates.amount !== undefined) updateData.amount = updates.amount;
    if (updates.day !== undefined) updateData.day = updates.day;
    if (updates.categoryId !== undefined) updateData.category_id = updates.categoryId;
    if (updates.assetId !== undefined) updateData.asset_id = updates.assetId;
    if (updates.budgetType !== undefined)
      updateData.budget_type = updates.budgetType;
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

    const { data, error } = await supabase
      .from("fixed_items")
      .update(updateData)
      .eq("id", id)
      .select(
        `
        *,
        categories:category_id (id, user_id, name, icon_name, color, type, sort_order, is_default, is_hidden, created_at),
        assets:asset_id (id, user_id, name, type, balance, billing_date, settlement_date, sort_order, created_at, updated_at)
      `
      )
      .single();

    if (error) throw error;
    return transformFixedItem(data);
  },

  // 정기지출 삭제 (hard delete)
  async deleteFixedItem(id: string): Promise<void> {
    const { error } = await supabase.from("fixed_items").delete().eq("id", id);

    if (error) throw error;
  },
};
