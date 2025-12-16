import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
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

export default function BudgetScreen() {
  const {
    jointBudgetEnabled,
    personalBudget,
    jointBudget,
    updateBudgets,
  } = useSettings();

  const [fixedItems, setFixedItems] = useState<FixedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [editingItem, setEditingItem] = useState<FixedItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FixedItem | null>(null);

  // 예산 수정 모달
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [personalBudgetInput, setPersonalBudgetInput] = useState("");
  const [jointBudgetInput, setJointBudgetInput] = useState("");
  const [isSavingBudget, setIsSavingBudget] = useState(false);

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

  // 탭이 포커스될 때마다 데이터 새로고침 및 상태 초기화
  useFocusEffect(
    useCallback(() => {
      // 모든 모달/시트 상태 초기화
      setShowAddSheet(false);
      setEditingItem(null);
      setDeleteTarget(null);
      setShowBudgetModal(false);

      loadFixedItems();
    }, [loadFixedItems])
  );

  // 금액 포맷팅
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("ko-KR") + "원";
  };

  const formatNumberWithComma = (value: string) => {
    const numbers = value.replace(/[^0-9]/g, "");
    if (!numbers) return "";
    return parseInt(numbers, 10).toLocaleString("ko-KR");
  };

  // 예산 수정 모달 열기
  const openBudgetModal = () => {
    setPersonalBudgetInput(
      personalBudget ? personalBudget.toLocaleString("ko-KR") : ""
    );
    setJointBudgetInput(
      jointBudget ? jointBudget.toLocaleString("ko-KR") : ""
    );
    setShowBudgetModal(true);
  };

  // 예산 저장
  const handleSaveBudget = async () => {
    try {
      setIsSavingBudget(true);
      const newPersonalBudget = personalBudgetInput
        ? parseInt(personalBudgetInput.replace(/,/g, ""), 10)
        : 0;
      const newJointBudget = jointBudgetInput
        ? parseInt(jointBudgetInput.replace(/,/g, ""), 10)
        : 0;

      await updateBudgets(newPersonalBudget, newJointBudget);
      setShowBudgetModal(false);
    } catch (error) {
      console.error("예산 저장 실패:", error);
    } finally {
      setIsSavingBudget(false);
    }
  };

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
      handleCloseSheet();
      loadFixedItems();
    } catch (error: any) {
      console.log("Delete error", error);
    } finally {
      setDeleteTarget(null);
    }
  };

  // 고정비만 필터링
  const fixedTypeItems = fixedItems.filter((item) => item.type === "fixed");

  // 정기지출 합계
  const totalFixed = fixedTypeItems.reduce((sum, item) => sum + item.amount, 0);

  // 가용 예산 계산
  const availablePersonalBudget = (personalBudget || 0) - totalFixed;
  const availableJointBudget = (jointBudget || 0) - totalFixed;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>예산</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 월 예산 섹션 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>월 예산</Text>
            <TouchableOpacity
              style={styles.editButton}
              onPress={openBudgetModal}
            >
              <Ionicons name="pencil" size={16} color={colors.primary.main} />
              <Text style={styles.editButtonText}>수정</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.budgetCard}>
            {jointBudgetEnabled ? (
              <>
                <View style={styles.budgetRow}>
                  <Text style={styles.budgetLabel}>개인 예산</Text>
                  <Text style={styles.budgetAmount}>
                    {formatCurrency(personalBudget || 0)}
                  </Text>
                </View>
                <View style={styles.budgetRow}>
                  <Text style={styles.budgetLabel}>공동 예산</Text>
                  <Text style={styles.budgetAmount}>
                    {formatCurrency(jointBudget || 0)}
                  </Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.budgetRow}>
                  <Text style={styles.budgetLabelSub}>정기지출 예정</Text>
                  <Text style={styles.budgetAmountSub}>
                    -{formatCurrency(totalFixed)}
                  </Text>
                </View>
                <View style={styles.budgetRow}>
                  <Text style={styles.budgetLabelHighlight}>가용 예산 (개인)</Text>
                  <Text style={styles.budgetAmountHighlight}>
                    {formatCurrency(availablePersonalBudget)}
                  </Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.budgetRow}>
                  <Text style={styles.budgetLabel}>월 예산</Text>
                  <Text style={styles.budgetAmount}>
                    {formatCurrency(personalBudget || 0)}
                  </Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.budgetRow}>
                  <Text style={styles.budgetLabelSub}>정기지출 예정</Text>
                  <Text style={styles.budgetAmountSub}>
                    -{formatCurrency(totalFixed)}
                  </Text>
                </View>
                <View style={styles.budgetRow}>
                  <Text style={styles.budgetLabelHighlight}>가용 예산</Text>
                  <Text style={styles.budgetAmountHighlight}>
                    {formatCurrency(availablePersonalBudget)}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* 정기지출 섹션 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>정기지출</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddSheet(true)}
            >
              <Ionicons name="add" size={20} color={colors.primary.main} />
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <ActivityIndicator size="small" color={colors.primary.main} />
          ) : fixedTypeItems.length > 0 ? (
            <>
              <View style={styles.fixedSummary}>
                <Text style={styles.fixedSummaryLabel}>
                  {fixedTypeItems.length}건
                </Text>
                <Text style={styles.fixedSummaryAmount}>
                  월 {formatCurrency(totalFixed)}
                </Text>
              </View>

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
            </>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons
                name="calendar-outline"
                size={48}
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
        </View>
      </ScrollView>

      {/* 예산 수정 모달 */}
      <Modal
        visible={showBudgetModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowBudgetModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>월 예산 설정</Text>

            {jointBudgetEnabled ? (
              <>
                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalInputLabel}>개인 예산</Text>
                  <View style={styles.modalInputWrapper}>
                    <TextInput
                      style={styles.modalInput}
                      value={personalBudgetInput}
                      onChangeText={(text) =>
                        setPersonalBudgetInput(formatNumberWithComma(text))
                      }
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor={colors.text.tertiary}
                    />
                    <Text style={styles.modalInputSuffix}>원</Text>
                  </View>
                </View>
                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalInputLabel}>공동 예산</Text>
                  <View style={styles.modalInputWrapper}>
                    <TextInput
                      style={styles.modalInput}
                      value={jointBudgetInput}
                      onChangeText={(text) =>
                        setJointBudgetInput(formatNumberWithComma(text))
                      }
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor={colors.text.tertiary}
                    />
                    <Text style={styles.modalInputSuffix}>원</Text>
                  </View>
                </View>
              </>
            ) : (
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>월 예산</Text>
                <View style={styles.modalInputWrapper}>
                  <TextInput
                    style={styles.modalInput}
                    value={personalBudgetInput}
                    onChangeText={(text) =>
                      setPersonalBudgetInput(formatNumberWithComma(text))
                    }
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={colors.text.tertiary}
                  />
                  <Text style={styles.modalInputSuffix}>원</Text>
                </View>
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowBudgetModal(false)}
                disabled={isSavingBudget}
              >
                <Text style={styles.modalCancelButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalConfirmButton,
                  isSavingBudget && styles.modalConfirmButtonDisabled,
                ]}
                onPress={handleSaveBudget}
                disabled={isSavingBudget}
              >
                {isSavingBudget ? (
                  <ActivityIndicator size="small" color={colors.text.inverse} />
                ) : (
                  <Text style={styles.modalConfirmButtonText}>저장</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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

  const categoryColor = item.category?.color || colors.text.tertiary;
  const categoryIcon = item.category?.iconName || "ellipse-outline";

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
              <View style={styles.jointBadge}>
                <Text style={styles.jointBadgeText}>공동</Text>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing["3xl"],
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  editButtonText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary.main,
    fontWeight: typography.fontWeight.medium,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.base,
    backgroundColor: colors.primary.light + "30",
    alignItems: "center",
    justifyContent: "center",
  },
  budgetCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.md,
  },
  budgetRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  budgetRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    paddingBottom: spacing.sm,
    marginBottom: spacing.sm,
  },
  budgetLabel: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
  },
  budgetAmount: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginVertical: spacing.sm,
  },
  budgetLabelSub: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  },
  budgetAmountSub: {
    fontSize: typography.fontSize.base,
    color: colors.semantic.expense,
  },
  budgetLabelHighlight: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  budgetAmountHighlight: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary.main,
  },
  fixedSummary: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  fixedSummaryLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  },
  fixedSummaryAmount: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
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
    paddingVertical: spacing["2xl"],
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
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
  // 모달 스타일
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: "100%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    textAlign: "center",
    marginBottom: spacing.xl,
  },
  modalInputGroup: {
    marginBottom: spacing.lg,
  },
  modalInputLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  modalInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.base,
    paddingHorizontal: spacing.base,
  },
  modalInput: {
    flex: 1,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
    paddingVertical: spacing.md,
    textAlign: "right",
  },
  modalInputSuffix: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    marginLeft: spacing.sm,
  },
  modalButtons: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: "center",
    borderRadius: borderRadius.base,
    backgroundColor: colors.background.tertiary,
  },
  modalCancelButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: "center",
    borderRadius: borderRadius.base,
    backgroundColor: colors.primary.main,
  },
  modalConfirmButtonDisabled: {
    opacity: 0.6,
  },
  modalConfirmButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.inverse,
  },
});
