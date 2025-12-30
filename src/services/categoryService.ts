import { supabase } from "../config/supabase";
import type { Category, CategoryType } from "../types";

// DB 스네이크케이스 → 앱 카멜케이스 변환
const transformCategory = (row: any): Category => ({
  id: row.id,
  userId: row.user_id,
  name: row.name,
  iconName: row.icon_name,
  color: row.color,
  type: row.type as CategoryType,
  sortOrder: row.sort_order,
  isDefault: row.is_default,
  isHidden: row.is_hidden,
  createdAt: row.created_at,
});

export const categoryService = {
  // 카테고리 목록 조회 (기본 + 내 카테고리)
  async getCategories(type?: CategoryType): Promise<Category[]> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let query = supabase
      .from("categories")
      .select("*")
      .or(`user_id.is.null,user_id.eq.${user?.id || ""}`)
      .eq("is_hidden", false)
      .order("sort_order", { ascending: true });

    if (type) {
      query = query.eq("type", type);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []).map(transformCategory);
  },

  // 카테고리 단일 조회
  async getCategory(id: string): Promise<Category | null> {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data ? transformCategory(data) : null;
  },

  // 카테고리 추가 (커스텀)
  async createCategory(item: {
    name: string;
    iconName: string;
    color: string;
    type: CategoryType;
    sortOrder?: number;
  }): Promise<Category> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("로그인이 필요합니다.");

    const { data, error } = await supabase
      .from("categories")
      .insert({
        user_id: user.id,
        name: item.name,
        icon_name: item.iconName,
        color: item.color,
        type: item.type,
        sort_order: item.sortOrder || 100,
        is_default: false,
        is_hidden: false,
      })
      .select()
      .single();

    if (error) throw error;
    return transformCategory(data);
  },

  // 카테고리 수정
  async updateCategory(
    id: string,
    updates: {
      name?: string;
      iconName?: string;
      color?: string;
      sortOrder?: number;
      isHidden?: boolean;
    }
  ): Promise<Category> {
    const updateData: any = {};

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.iconName !== undefined) updateData.icon_name = updates.iconName;
    if (updates.color !== undefined) updateData.color = updates.color;
    if (updates.sortOrder !== undefined) updateData.sort_order = updates.sortOrder;
    if (updates.isHidden !== undefined) updateData.is_hidden = updates.isHidden;

    const { data, error } = await supabase
      .from("categories")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return transformCategory(data);
  },

  // 카테고리 삭제 (커스텀만 가능)
  async deleteCategory(id: string): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("로그인이 필요합니다.");

    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;
  },

  // 기본 카테고리 숨기기/보이기
  async toggleCategoryVisibility(id: string, isHidden: boolean): Promise<Category> {
    return this.updateCategory(id, { isHidden });
  },

  // 카테고리 순서 일괄 업데이트
  async updateCategoryOrder(categoryIds: string[]): Promise<void> {
    const updates = categoryIds.map((id, index) => ({
      id,
      sort_order: index,
    }));

    for (const update of updates) {
      const { error } = await supabase
        .from("categories")
        .update({ sort_order: update.sort_order })
        .eq("id", update.id);

      if (error) throw error;
    }
  },

  // 카드 대금 카테고리 조회 또는 생성
  async getOrCreateCardPaymentCategory(): Promise<Category> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("로그인이 필요합니다.");

    // 먼저 기존 카드 대금 카테고리 찾기
    const { data: existingList, error: findError } = await supabase
      .from("categories")
      .select("*")
      .eq("name", "카드 대금")
      .eq("type", "expense")
      .or(`user_id.is.null,user_id.eq.${user.id}`)
      .limit(1);

    if (findError) throw findError;

    if (existingList && existingList.length > 0) {
      return transformCategory(existingList[0]);
    }

    // 없으면 생성
    const { data, error } = await supabase
      .from("categories")
      .insert({
        user_id: user.id,
        name: "카드 대금",
        icon_name: "card-outline",
        color: "#3498DB",
        type: "expense",
        sort_order: 99,
        is_default: false,
        is_hidden: false,
      })
      .select()
      .single();

    if (error) throw error;
    return transformCategory(data);
  },
};
