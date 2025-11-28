import { supabase } from "../config/supabase";
import type { Asset, AssetType } from "../types";

// DB 스네이크케이스 → 앱 카멜케이스 변환
const transformAsset = (row: any): Asset => ({
  id: row.id,
  userId: row.user_id,
  name: row.name,
  type: row.type as AssetType,
  balance: parseFloat(row.balance),
  billingDate: row.billing_date,
  settlementDate: row.settlement_date,
  sortOrder: row.sort_order,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const assetService = {
  // 자산 목록 조회
  async getAssets(): Promise<Asset[]> {
    const { data, error } = await supabase
      .from("assets")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) throw error;
    return (data || []).map(transformAsset);
  },

  // 자산 단일 조회
  async getAsset(id: string): Promise<Asset | null> {
    const { data, error } = await supabase
      .from("assets")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data ? transformAsset(data) : null;
  },

  // 자산 추가
  async createAsset(asset: {
    name: string;
    type: AssetType;
    balance: number;
    billingDate?: number;
    settlementDate?: number;
  }): Promise<Asset> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("로그인이 필요합니다.");

    // 마지막 정렬 순서 가져오기
    const { data: lastAsset } = await supabase
      .from("assets")
      .select("sort_order")
      .eq("user_id", user.id)
      .order("sort_order", { ascending: false })
      .limit(1)
      .single();

    const sortOrder = (lastAsset?.sort_order || 0) + 1;

    const { data, error } = await supabase
      .from("assets")
      .insert({
        user_id: user.id,
        name: asset.name,
        type: asset.type,
        balance: asset.balance,
        billing_date: asset.billingDate || null,
        settlement_date: asset.settlementDate || null,
        sort_order: sortOrder,
      })
      .select()
      .single();

    if (error) throw error;
    return transformAsset(data);
  },

  // 자산 수정
  async updateAsset(
    id: string,
    updates: {
      name?: string;
      type?: AssetType;
      balance?: number;
      billingDate?: number | null;
      settlementDate?: number | null;
      sortOrder?: number;
    }
  ): Promise<Asset> {
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.type !== undefined) updateData.type = updates.type;
    if (updates.balance !== undefined) updateData.balance = updates.balance;
    if (updates.billingDate !== undefined)
      updateData.billing_date = updates.billingDate;
    if (updates.settlementDate !== undefined)
      updateData.settlement_date = updates.settlementDate;
    if (updates.sortOrder !== undefined)
      updateData.sort_order = updates.sortOrder;

    const { data, error } = await supabase
      .from("assets")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return transformAsset(data);
  },

  // 자산 삭제
  async deleteAsset(id: string): Promise<void> {
    const { error } = await supabase.from("assets").delete().eq("id", id);

    if (error) throw error;
  },

  // 자산 잔액 업데이트 (거래 발생 시)
  async updateBalance(id: string, amount: number): Promise<void> {
    const { data: asset, error: fetchError } = await supabase
      .from("assets")
      .select("balance")
      .eq("id", id)
      .single();

    if (fetchError) throw fetchError;

    const newBalance = parseFloat(asset.balance) + amount;

    const { error } = await supabase
      .from("assets")
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw error;
  },

  // 정렬 순서 변경
  async reorderAssets(assetIds: string[]): Promise<void> {
    const updates = assetIds.map((id, index) =>
      supabase
        .from("assets")
        .update({ sort_order: index })
        .eq("id", id)
    );

    await Promise.all(updates);
  },
};
