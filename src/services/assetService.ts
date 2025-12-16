import { supabase } from "../config/supabase";
import type { Asset, AssetType } from "../types";

// DB 스네이크케이스 → 앱 카멜케이스 변환 (거래 합계 포함)
const transformAsset = (row: any, transactionSum: number = 0): Asset => ({
  id: row.id,
  userId: row.user_id,
  name: row.name,
  type: row.type as AssetType,
  initialBalance: parseFloat(row.initial_balance || row.balance || 0),
  balance: parseFloat(row.initial_balance || row.balance || 0) + transactionSum,
  billingDate: row.billing_date,
  settlementDate: row.settlement_date,
  sortOrder: row.sort_order,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const assetService = {
  // 자산별 거래 합계 계산
  async calculateTransactionSums(): Promise<Map<string, number>> {
    const { data, error } = await supabase
      .from("transactions")
      .select("asset_id, to_asset_id, type, amount");

    if (error) throw error;

    const sums = new Map<string, number>();

    (data || []).forEach((t) => {
      const amount = parseFloat(t.amount);

      // 출금 자산 (지출, 이체 출금)
      if (t.asset_id) {
        const current = sums.get(t.asset_id) || 0;
        if (t.type === "expense") {
          sums.set(t.asset_id, current - amount);
        } else if (t.type === "income") {
          sums.set(t.asset_id, current + amount);
        } else if (t.type === "transfer") {
          sums.set(t.asset_id, current - amount);
        }
      }

      // 이체 입금 자산
      if (t.type === "transfer" && t.to_asset_id) {
        const current = sums.get(t.to_asset_id) || 0;
        sums.set(t.to_asset_id, current + amount);
      }
    });

    return sums;
  },

  // 자산 목록 조회 (거래 기반 잔액 계산)
  async getAssets(): Promise<Asset[]> {
    const [assetsResult, transactionSums] = await Promise.all([
      supabase
        .from("assets")
        .select("*")
        .order("sort_order", { ascending: true }),
      this.calculateTransactionSums(),
    ]);

    if (assetsResult.error) throw assetsResult.error;

    return (assetsResult.data || []).map((row) => {
      const sum = transactionSums.get(row.id) || 0;
      return transformAsset(row, sum);
    });
  },

  // 자산 단일 조회 (거래 기반 잔액 계산)
  async getAsset(id: string): Promise<Asset | null> {
    const { data, error } = await supabase
      .from("assets")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!data) return null;

    // 해당 자산의 거래 합계 계산
    const { data: transactions, error: txError } = await supabase
      .from("transactions")
      .select("asset_id, to_asset_id, type, amount")
      .or(`asset_id.eq.${id},to_asset_id.eq.${id}`);

    if (txError) throw txError;

    let sum = 0;
    (transactions || []).forEach((t) => {
      const amount = parseFloat(t.amount);

      if (t.asset_id === id) {
        if (t.type === "expense") {
          sum -= amount;
        } else if (t.type === "income") {
          sum += amount;
        } else if (t.type === "transfer") {
          sum -= amount;
        }
      }

      if (t.type === "transfer" && t.to_asset_id === id) {
        sum += amount;
      }
    });

    return transformAsset(data, sum);
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
        initial_balance: asset.balance,
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
      balance?: number; // 이제 initialBalance로 저장됨
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
    if (updates.balance !== undefined) updateData.initial_balance = updates.balance;
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

    // 업데이트 후 거래 기반 잔액 재계산
    return (await this.getAsset(id))!;
  },

  // 자산 삭제
  async deleteAsset(id: string): Promise<void> {
    const { error } = await supabase.from("assets").delete().eq("id", id);

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
