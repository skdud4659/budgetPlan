import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Swipeable } from "react-native-gesture-handler";
import {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
} from "../../src/styles";
import type { FixedItem, FixedItemType, BudgetType } from "../../src/types";
import { fixedItemService } from "../../src/services/fixedItemService";
import { settingsService } from "../../src/services/settingsService";
import AddFixedItemSheet from "../../src/components/AddFixedItemSheet";
import ConfirmModal from "../../src/components/ConfirmModal";

export default function ScheduledScreen() {
  const [fixedItems, setFixedItems] = useState<FixedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [editingItem, setEditingItem] = useState<FixedItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FixedItem | null>(null);
  const [jointBudgetEnabled, setJointBudgetEnabled] = useState(false);

  // 정기지출 목록 불러오기
  const loadFixedItems = useCallback(async () => {
    try {
      const [data, settings] = await Promise.all([
        fixedItemService.getFixedItems(),
        settingsService.getSettings(),
      ]);
      setFixedItems(data);
      setJointBudgetEnabled(settings.jointBudgetEnabled);
    } catch (error: any) {
      console.log("Error loading fixed items:", error.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFixedItems();
  }, [loadFixedItems]);

  // 정기지출 추가/수정 처리
  const handleSubmitItem = async (data: {
    name: string;
    type: FixedItemType;
    amount: number;
    day: number;
    assetId: string | null;
    budgetType: BudgetType;
  }) => {
    try {
      if (editingItem) {
        await fixedItemService.updateFixedItem(editingItem.id, data);
      } else {
        await fixedItemService.createFixedItem(data);
      }
      loadFixedItems();
    } catch (error: any) {
      console.log("Error saving fixed item:", error.message);
    }
  };

  // 정기지출 수정 모달 열기
  const handleEditItem = (item: FixedItem) => {
    setEditingItem(item);
    setShowAddSheet(true);
  };

  // 모달 닫기
  const handleCloseSheet = () => {
    setShowAddSheet(false);
    setEditingItem(null);
  };

  // 정기지출 삭제 처리
  const handleDeleteItem = (item: FixedItem) => {
    setDeleteTarget(item);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      await fixedItemService.deleteFixedItem(deleteTarget.id);
      handleCloseSheet(); // 바텀시트 닫기
      loadFixedItems();
    } catch (error: any) {
      console.log("Delete error", error);
    } finally {
      setDeleteTarget(null);
    }
  };

  // 고정비만 필터링
  const fixedTypeItems = fixedItems.filter((item) => item.type === "fixed");

  // 고정비 합계
  const totalFixed = fixedTypeItems.reduce((sum, item) => sum + item.amount, 0);

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("ko-KR") + "원";
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>정기지출</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddSheet(true)}
        >
          <Ionicons name="add" size={24} color={colors.primary.main} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryTitle}>이번 달 정기지출</Text>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>합계</Text>
            <Text style={styles.totalAmount}>
              {formatCurrency(totalFixed)}
            </Text>
          </View>
        </View>

        {/* Fixed Items List */}
        {fixedTypeItems.length > 0 && (
          <View style={styles.section}>
            <View style={styles.listContainer}>
              {fixedTypeItems.map((item, index) => (
                <FixedItemRow
                  key={item.id}
                  item={item}
                  isLast={index === fixedTypeItems.length - 1}
                  onEdit={() => handleEditItem(item)}
                  onDelete={() => handleDeleteItem(item)}
                  showJointBadge={jointBudgetEnabled}
                />
              ))}
            </View>
          </View>
        )}

        {/* Empty State */}
        {!isLoading && fixedTypeItems.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons
              name="calendar-outline"
              size={64}
              color={colors.text.tertiary}
            />
            <Text style={styles.emptyText}>등록된 정기지출이 없습니다</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => setShowAddSheet(true)}
            >
              <Text style={styles.emptyButtonText}>정기지출 추가하기</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* 정기지출 추가/수정 바텀시트 */}
      <AddFixedItemSheet
        visible={showAddSheet}
        onClose={handleCloseSheet}
        onSubmit={handleSubmitItem}
        onDelete={editingItem ? () => handleDeleteItem(editingItem) : undefined}
        editItem={editingItem}
      />

      {/* 삭제 확인 모달 */}
      <ConfirmModal
        visible={!!deleteTarget}
        title="정기지출 삭제"
        message={`"${deleteTarget?.name}"을(를) 삭제하시겠습니까?`}
        confirmText="삭제"
        cancelText="취소"
        isDestructive={true}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </SafeAreaView>
  );
}

function FixedItemRow({
  item,
  isLast,
  onEdit,
  onDelete,
  showJointBadge,
}: {
  item: FixedItem;
  isLast: boolean;
  onEdit: () => void;
  onDelete: () => void;
  showJointBadge: boolean;
}) {
  const swipeableRef = useRef<Swipeable>(null);

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("ko-KR") + "원";
  };

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0.5],
      extrapolate: "clamp",
    });

    return (
      <TouchableOpacity
        style={styles.deleteAction}
        onPress={() => {
          swipeableRef.current?.close();
          onDelete();
        }}
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          <Ionicons
            name="trash-outline"
            size={22}
            color={colors.text.inverse}
          />
        </Animated.View>
      </TouchableOpacity>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={2}
    >
      <TouchableOpacity
        style={[styles.itemRow, !isLast && styles.itemRowBorder]}
        activeOpacity={0.7}
        onPress={onEdit}
      >
        <View style={styles.itemLeft}>
          <View style={styles.itemHeader}>
            <Text style={styles.itemName}>{item.name}</Text>
            {showJointBadge && item.budgetType === "joint" && (
              <View style={styles.jointBadge}>
                <Text style={styles.jointBadgeText}>공동</Text>
              </View>
            )}
          </View>
          <Text style={styles.itemDate}>
            {item.day}일{item.asset?.name && ` · ${item.asset.name}`}
          </Text>
        </View>
        <Text style={styles.itemAmount}>{formatCurrency(item.amount)}</Text>
      </TouchableOpacity>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.base,
    backgroundColor: colors.primary.light + "30",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing["3xl"],
  },
  summaryCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  summaryHeader: {
    marginBottom: spacing.base,
  },
  summaryTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  totalAmount: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary.main,
  },
  section: {
    marginBottom: spacing.lg,
  },
  listContainer: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    overflow: "hidden",
    ...shadows.sm,
  },
  deleteAction: {
    backgroundColor: colors.semantic.expense,
    justifyContent: "center",
    alignItems: "center",
    width: 80,
  },
  itemRow: {
    backgroundColor: colors.background.secondary,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
  },
  itemRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  itemLeft: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  itemName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  jointBadge: {
    backgroundColor: colors.secondary.light,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.sm,
  },
  jointBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.secondary.dark,
  },
  itemDate: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  itemAmount: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing["3xl"],
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    color: colors.text.tertiary,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  emptyButton: {
    backgroundColor: colors.primary.main,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.base,
  },
  emptyButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.inverse,
  },
});
