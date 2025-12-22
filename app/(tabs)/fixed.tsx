import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Swipeable } from "react-native-gesture-handler";
import { useFocusEffect } from "expo-router";
import {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
} from "../../src/styles";
import type { FixedItem, FixedItemType, BudgetType } from "../../src/types";
import { fixedItemService } from "../../src/services/fixedItemService";
import { useSettings } from "../../src/contexts/SettingsContext";
import AddFixedItemSheet from "../../src/components/AddFixedItemSheet";
import ConfirmModal from "../../src/components/ConfirmModal";

export default function FixedScreen() {
  const { jointBudgetEnabled } = useSettings();

  const [fixedItems, setFixedItems] = useState<FixedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [editingItem, setEditingItem] = useState<FixedItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FixedItem | null>(null);
  const [budgetTypeFilter, setBudgetTypeFilter] = useState<'all' | 'personal' | 'joint'>('all');

  // 정기지출 목록 불러오기
  const loadFixedItems = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await fixedItemService.getFixedItems();
      setFixedItems(data);
    } catch (error: any) {
      console.log("Error loading fixed items:", error.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setShowAddSheet(false);
      setEditingItem(null);
      setDeleteTarget(null);

      loadFixedItems();
    }, [loadFixedItems])
  );

  // 정기지출 추가/수정 처리
  const handleSubmitItem = async (data: {
    name: string;
    type: FixedItemType;
    amount: number;
    day: number;
    categoryId: string | null;
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

  const handleEditItem = (item: FixedItem) => {
    setEditingItem(item);
    setShowAddSheet(true);
  };

  const handleCloseSheet = () => {
    setShowAddSheet(false);
    setEditingItem(null);
  };

  const handleDeleteItem = (item: FixedItem) => {
    setDeleteTarget(item);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      await fixedItemService.deleteFixedItem(deleteTarget.id);
      handleCloseSheet();
      loadFixedItems();
    } catch (error: any) {
      console.log("Delete error", error);
    } finally {
      setDeleteTarget(null);
    }
  };

  // 필터링
  const filteredItems = fixedItems.filter((item) => {
    if (item.type !== "fixed") return false;
    if (budgetTypeFilter === 'all') return true;
    return item.budgetType === budgetTypeFilter;
  });

  // 합계
  const totalFixed = filteredItems.reduce((sum, item) => sum + item.amount, 0);

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("ko-KR") + "원";
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>고정비용</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddSheet(true)}
        >
          <Ionicons name="add" size={24} color={colors.primary.main} />
        </TouchableOpacity>
      </View>

      {/* 안내 문구 */}
      <View style={styles.infoCardTop}>
        <Ionicons name="information-circle-outline" size={20} color={colors.text.tertiary} />
        <Text style={styles.infoText}>
          고정비용은 매월 지정한 날짜에 자동으로 거래 내역에 추가됩니다
        </Text>
      </View>

      {/* Budget Type Filter */}
      {jointBudgetEnabled && (
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              budgetTypeFilter === 'all' && styles.filterButtonActive,
            ]}
            onPress={() => setBudgetTypeFilter('all')}
          >
            <Text
              style={[
                styles.filterButtonText,
                budgetTypeFilter === 'all' && styles.filterButtonTextActive,
              ]}
            >
              전체
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterButton,
              budgetTypeFilter === 'personal' && styles.filterButtonActive,
            ]}
            onPress={() => setBudgetTypeFilter('personal')}
          >
            <Text
              style={[
                styles.filterButtonText,
                budgetTypeFilter === 'personal' && styles.filterButtonTextActive,
              ]}
            >
              개인
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterButton,
              budgetTypeFilter === 'joint' && styles.filterButtonActive,
            ]}
            onPress={() => setBudgetTypeFilter('joint')}
          >
            <Text
              style={[
                styles.filterButtonText,
                budgetTypeFilter === 'joint' && styles.filterButtonTextActive,
              ]}
            >
              공동
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryTitle}>월 고정비용</Text>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{filteredItems.length}건</Text>
            <Text style={styles.totalAmount}>
              {formatCurrency(totalFixed)}
            </Text>
          </View>
        </View>

        {/* Fixed Items List */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary.main} />
          </View>
        ) : filteredItems.length > 0 ? (
          <View style={styles.listContainer}>
            {filteredItems.map((item, index) => (
              <FixedItemRow
                key={item.id}
                item={item}
                isLast={index === filteredItems.length - 1}
                onEdit={() => handleEditItem(item)}
                onDelete={() => handleDeleteItem(item)}
                showJointBadge={jointBudgetEnabled}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons
              name="repeat-outline"
              size={64}
              color={colors.text.tertiary}
            />
            <Text style={styles.emptyText}>등록된 고정비용이 없습니다</Text>
            <Text style={styles.emptySubtext}>
              매월 고정적으로 나가는 비용을 등록해 보세요
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => setShowAddSheet(true)}
            >
              <Text style={styles.emptyButtonText}>고정비용 추가하기</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>

      {/* 고정비용 추가/수정 바텀시트 */}
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
        title="고정비용 삭제"
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

  const categoryColor = item.category?.color || colors.text.tertiary;
  const categoryIcon = item.category?.iconName || "repeat";

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
        <View
          style={[
            styles.itemIcon,
            { backgroundColor: categoryColor + "20" },
          ]}
        >
          <Ionicons
            name={categoryIcon as keyof typeof Ionicons.glyphMap}
            size={20}
            color={categoryColor}
          />
        </View>
        <View style={styles.itemLeft}>
          <View style={styles.itemHeader}>
            <Text style={styles.itemName}>{item.name}</Text>
            {showJointBadge && item.budgetType === "joint" && (
              <View style={styles.jointIndicator}>
                <Ionicons name="people" size={12} color={colors.secondary.dark} />
              </View>
            )}
          </View>
          <Text style={styles.itemDate}>
            매월 {item.day}일{item.asset?.name && ` · ${item.asset.name}`}
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
  filterRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.base,
    padding: 2,
  },
  filterButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  filterButtonActive: {
    backgroundColor: colors.background.secondary,
    ...shadows.sm,
  },
  filterButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.tertiary,
  },
  filterButtonTextActive: {
    color: colors.primary.main,
    fontWeight: typography.fontWeight.semiBold,
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
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  },
  totalAmount: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary.main,
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
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
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
  },
  itemRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.base,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
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
    flexShrink: 1,
  },
  jointIndicator: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.secondary.light,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
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
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    color: colors.text.tertiary,
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
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
  infoCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.base,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    lineHeight: 18,
  },
});
