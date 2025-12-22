import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
} from "../../src/styles";
import type { Transaction, FixedItem, Category } from "../../src/types";
import { transactionService } from "../../src/services/transactionService";
import { fixedItemService } from "../../src/services/fixedItemService";
import { useSettings } from "../../src/contexts/SettingsContext";

export default function LivingScreen() {
  const {
    jointBudgetEnabled,
    personalBudget,
    jointBudget,
    updateBudgets,
  } = useSettings();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [fixedItems, setFixedItems] = useState<FixedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [budgetTypeFilter, setBudgetTypeFilter] = useState<'all' | 'personal' | 'joint'>('all');

  // 예산 수정 모달
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [personalBudgetInput, setPersonalBudgetInput] = useState("");
  const [jointBudgetInput, setJointBudgetInput] = useState("");
  const [isSavingBudget, setIsSavingBudget] = useState(false);

  // 데이터 로드
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [transactionData, fixedData] = await Promise.all([
        transactionService.getTransactions(
          currentMonth.getFullYear(),
          currentMonth.getMonth() + 1
        ),
        fixedItemService.getFixedItems(),
      ]);
      setTransactions(transactionData);
      setFixedItems(fixedData);
    } catch (error) {
      console.error("데이터 로드 실패:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentMonth]);

  useFocusEffect(
    useCallback(() => {
      setShowBudgetModal(false);
      loadData();
    }, [loadData])
  );

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("ko-KR") + "원";
  };

  const formatNumberWithComma = (value: string) => {
    const numbers = value.replace(/[^0-9]/g, "");
    if (!numbers) return "";
    return parseInt(numbers, 10).toLocaleString("ko-KR");
  };

  const formatMonthYear = (date: Date) => {
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
  };

  const handlePrevMonth = () => {
    const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    setCurrentMonth(newMonth);
  };

  const handleNextMonth = () => {
    const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    setCurrentMonth(newMonth);
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

  // 필터링
  const filteredTransactions = transactions.filter((t) => {
    if (budgetTypeFilter === 'all') return true;
    return t.budgetType === budgetTypeFilter;
  });

  const filteredFixedItems = fixedItems.filter((item) => {
    if (budgetTypeFilter === 'all') return true;
    return item.budgetType === budgetTypeFilter;
  });

  // 고정비용 총액 (필터된)
  const totalFixedExpense = filteredFixedItems.reduce((sum, item) => sum + item.amount, 0);

  // 생활비 예산 = 월예산 - 고정비용
  const getLivingBudget = () => {
    if (budgetTypeFilter === 'joint') {
      const jointFixed = fixedItems
        .filter(item => item.budgetType === 'joint')
        .reduce((sum, item) => sum + item.amount, 0);
      return (jointBudget || 0) - jointFixed;
    } else if (budgetTypeFilter === 'personal') {
      const personalFixed = fixedItems
        .filter(item => item.budgetType === 'personal')
        .reduce((sum, item) => sum + item.amount, 0);
      return (personalBudget || 0) - personalFixed;
    } else {
      return (personalBudget || 0) + (jointBudget || 0) - totalFixedExpense;
    }
  };

  const livingBudget = getLivingBudget();

  // 생활비 지출 (고정비용 제외)
  const livingExpense = filteredTransactions
    .filter(t => t.type === 'expense' && t.category?.type !== 'fixed')
    .reduce((sum, t) => sum + t.amount, 0);

  // 남은 생활비
  const remainingBudget = livingBudget - livingExpense;

  // 사용률
  const usageRate = livingBudget > 0 ? (livingExpense / livingBudget) * 100 : 0;

  // 카테고리별 지출 집계
  const getCategoryExpenses = () => {
    const categoryMap: Record<string, { category: Category | null; amount: number }> = {};

    filteredTransactions
      .filter(t => t.type === 'expense' && t.category?.type !== 'fixed')
      .forEach(t => {
        const categoryId = t.category?.id || 'uncategorized';
        if (!categoryMap[categoryId]) {
          categoryMap[categoryId] = {
            category: t.category || null,
            amount: 0,
          };
        }
        categoryMap[categoryId].amount += t.amount;
      });

    return Object.values(categoryMap).sort((a, b) => b.amount - a.amount);
  };

  const categoryExpenses = getCategoryExpenses();

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.monthSelector} onPress={handlePrevMonth}>
            <Ionicons name="chevron-back" size={20} color={colors.text.secondary} />
          </TouchableOpacity>
          <Text style={styles.monthText}>{formatMonthYear(currentMonth)}</Text>
          <TouchableOpacity style={styles.monthSelector} onPress={handleNextMonth}>
            <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
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

        {/* 생활비 예산 섹션 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>생활비 예산</Text>
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
              </>
            ) : (
              <View style={styles.budgetRow}>
                <Text style={styles.budgetLabel}>월 예산</Text>
                <Text style={styles.budgetAmountHighlight}>
                  {formatCurrency(personalBudget || 0)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* 생활비 사용 현황 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>사용 현황</Text>

          {isLoading ? (
            <ActivityIndicator size="small" color={colors.primary.main} />
          ) : (
            <View style={styles.usageCard}>
              <View style={styles.usageHeader}>
                <View>
                  <Text style={styles.usageLabel}>사용</Text>
                  <Text style={styles.usageAmount}>
                    {formatCurrency(livingExpense)}
                  </Text>
                </View>
                <View style={styles.usageRight}>
                  <Text style={styles.usageLabel}>남은 금액</Text>
                  <Text style={[
                    styles.usageAmountHighlight,
                    remainingBudget < 0 && styles.expenseText,
                  ]}>
                    {formatCurrency(remainingBudget)}
                  </Text>
                </View>
              </View>

              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(usageRate, 100)}%`,
                      backgroundColor: usageRate > 100
                        ? colors.semantic.expense
                        : usageRate > 80
                        ? colors.semantic.warning
                        : colors.primary.main,
                    },
                  ]}
                />
              </View>
              <View style={styles.progressLabels}>
                <Text style={styles.progressText}>
                  {usageRate.toFixed(0)}% 사용
                </Text>
                <Text style={styles.progressText}>
                  예산 {formatCurrency(livingBudget)}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* 카테고리별 지출 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>카테고리별 지출</Text>

          {isLoading ? (
            <ActivityIndicator size="small" color={colors.primary.main} />
          ) : categoryExpenses.length > 0 ? (
            <View style={styles.categoryList}>
              {categoryExpenses.map((item, index) => {
                const categoryName = item.category?.name || '미분류';
                const categoryColor = item.category?.color || colors.text.tertiary;
                const categoryIcon = item.category?.iconName || 'help-circle';
                const percentage = livingExpense > 0
                  ? (item.amount / livingExpense) * 100
                  : 0;

                return (
                  <View
                    key={item.category?.id || 'uncategorized'}
                    style={[
                      styles.categoryItem,
                      index < categoryExpenses.length - 1 && styles.categoryItemBorder,
                    ]}
                  >
                    <View
                      style={[
                        styles.categoryIcon,
                        { backgroundColor: categoryColor + '20' },
                      ]}
                    >
                      <Ionicons
                        name={categoryIcon as keyof typeof Ionicons.glyphMap}
                        size={20}
                        color={categoryColor}
                      />
                    </View>
                    <View style={styles.categoryContent}>
                      <View style={styles.categoryHeader}>
                        <Text style={styles.categoryName}>{categoryName}</Text>
                        <Text style={styles.categoryAmount}>
                          {formatCurrency(item.amount)}
                        </Text>
                      </View>
                      <View style={styles.categoryProgressBar}>
                        <View
                          style={[
                            styles.categoryProgressFill,
                            {
                              width: `${percentage}%`,
                              backgroundColor: categoryColor,
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.categoryPercentage}>
                        {percentage.toFixed(1)}%
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons
                name="wallet-outline"
                size={48}
                color={colors.text.tertiary}
              />
              <Text style={styles.emptyText}>이번 달 지출 내역이 없어요</Text>
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
            <Text style={styles.modalDescription}>
              고정비용을 제외한 생활비 예산이 자동 계산됩니다
            </Text>

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
    </SafeAreaView>
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  monthSelector: {
    padding: spacing.xs,
  },
  monthText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
    marginHorizontal: spacing.sm,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing["3xl"],
  },
  filterRow: {
    flexDirection: 'row',
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
  usageCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.sm,
  },
  usageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  usageRight: {
    alignItems: 'flex-end',
  },
  usageLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    marginBottom: spacing.xs,
  },
  usageAmount: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  usageAmountHighlight: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary.main,
  },
  expenseText: {
    color: colors.semantic.expense,
  },
  progressBar: {
    height: 12,
    backgroundColor: colors.border.light,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: borderRadius.sm,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  progressText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  },
  categoryList: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    ...shadows.sm,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.base,
  },
  categoryItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.base,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  categoryContent: {
    flex: 1,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  categoryName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  categoryAmount: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
  },
  categoryProgressBar: {
    height: 6,
    backgroundColor: colors.border.light,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  categoryProgressFill: {
    height: '100%',
    borderRadius: borderRadius.sm,
  },
  categoryPercentage: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
    textAlign: 'right',
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
    marginBottom: spacing.xs,
  },
  modalDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
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
