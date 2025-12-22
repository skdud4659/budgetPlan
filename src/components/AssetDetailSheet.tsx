import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  assetTypeConfig,
} from "../styles";
import type { Asset, Transaction, AssetType } from "../types";
import { useSettings } from "../contexts/SettingsContext";
import { transactionService } from "../services/transactionService";
import { assetService } from "../services/assetService";
import AddTransactionSheet from "./AddTransactionSheet";
import FixedTransactionSheet from "./FixedTransactionSheet";

interface AssetDetailSheetProps {
  visible: boolean;
  asset: Asset | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onTransactionChange?: () => void;
}

function getAssetIcon(type: AssetType): keyof typeof Ionicons.glyphMap {
  const iconMap: Record<AssetType, keyof typeof Ionicons.glyphMap> = {
    bank: "business-outline",
    card: "card-outline",
    cash: "cash-outline",
    loan: "document-text-outline",
    insurance: "shield-checkmark-outline",
    investment: "trending-up-outline",
    savings: "wallet-outline",
    emoney: "phone-portrait-outline",
    point: "star-outline",
    other: "ellipsis-horizontal",
  };
  return iconMap[type];
}

export default function AssetDetailSheet({
  visible,
  asset,
  onClose,
  onEdit,
  onDelete,
  onTransactionChange,
}: AssetDetailSheetProps) {
  const { jointBudgetEnabled } = useSettings();
  const [currentAsset, setCurrentAsset] = useState<Asset | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [billingInfo, setBillingInfo] = useState<{ currentBilling: number; nextBilling: number } | null>(null);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [showFixedTransaction, setShowFixedTransaction] = useState(false);
  const [selectedFixedTransaction, setSelectedFixedTransaction] = useState<Transaction | null>(null);
  const [budgetTypeFilter, setBudgetTypeFilter] = useState<'all' | 'personal' | 'joint'>('all');

  useEffect(() => {
    if (visible && asset) {
      setCurrentAsset(asset);
      const now = new Date();
      setSelectedMonth(now);
      loadData(now);
    }
  }, [visible, asset]);

  useEffect(() => {
    if (visible && asset) {
      loadTransactions(selectedMonth);
    }
  }, [selectedMonth]);

  const loadData = async (month: Date, reloadAsset: boolean = false) => {
    if (!asset) return;

    setIsLoading(true);
    try {
      // 자산 정보 다시 로드 (잔액 업데이트)
      if (reloadAsset) {
        const assets = await assetService.getAssets();
        const updatedAsset = assets.find(a => a.id === asset.id);
        if (updatedAsset) {
          setCurrentAsset(updatedAsset);
        }
      }

      // 카드인 경우 결제 예정 금액 로드
      const targetAsset = currentAsset || asset;
      if (targetAsset.type === "card" && targetAsset.settlementDate && targetAsset.billingDate) {
        const billing = await transactionService.getCardBillingAmount(
          targetAsset.id,
          targetAsset.settlementDate,
          targetAsset.billingDate
        );
        setBillingInfo(billing);
      } else {
        setBillingInfo(null);
      }

      // 거래 내역 로드
      await loadTransactions(month);
    } catch (error) {
      console.error("Failed to load asset details:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTransactions = async (month: Date) => {
    if (!asset) return;

    try {
      const year = month.getFullYear();
      const monthNum = month.getMonth() + 1;

      const allTransactions = await transactionService.getTransactionsWithInstallments(year, monthNum);

      // 해당 자산의 거래만 필터링
      const assetTransactions = allTransactions.filter(
        (t) => t.assetId === asset.id || t.toAssetId === asset.id
      );

      setTransactions(assetTransactions);
    } catch (error) {
      console.error("Failed to load transactions:", error);
    }
  };

  const handlePrevMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1));
  };

  const formatMonthYear = (date: Date) => {
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
  };

  const formatCurrency = (amount: number) => {
    return Math.abs(amount).toLocaleString("ko-KR") + "원";
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  if (!asset) return null;

  // 현재 표시할 자산 (업데이트된 잔액 반영)
  const displayAsset = currentAsset || asset;
  const isNegative = displayAsset.balance < 0;
  const config = assetTypeConfig[displayAsset.type];

  // 필터링된 거래내역
  const filteredTransactions = transactions.filter((t) => {
    if (budgetTypeFilter === 'all') return true;
    return t.budgetType === budgetTypeFilter;
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>자산 상세</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={onEdit} style={styles.headerIconButton}>
                <Ionicons
                  name="pencil-outline"
                  size={22}
                  color={colors.text.secondary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onDelete}
                style={styles.headerIconButton}
              >
                <Ionicons
                  name="trash-outline"
                  size={22}
                  color={colors.semantic.expense}
                />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
          >
            {/* Asset Info Card */}
            <View style={styles.assetCard}>
              <View style={styles.assetCardHeader}>
                <View
                  style={[
                    styles.assetIcon,
                    { backgroundColor: config.color + "20" },
                  ]}
                >
                  <Ionicons
                    name={getAssetIcon(displayAsset.type)}
                    size={24}
                    color={config.color}
                  />
                </View>
                <View style={styles.assetCardInfo}>
                  <Text style={styles.assetName}>{displayAsset.name}</Text>
                  <Text style={styles.assetType}>{config.label}</Text>
                </View>
              </View>
              <Text
                style={[
                  styles.assetBalance,
                  isNegative ? styles.negativeBalance : styles.positiveBalance,
                ]}
              >
                {isNegative ? "-" : ""}
                {formatCurrency(displayAsset.balance)}
              </Text>

              {displayAsset.type === "card" && displayAsset.billingDate && (
                <Text style={styles.billingInfo}>
                  {displayAsset.settlementDate
                    ? `정산 ${displayAsset.settlementDate}일 / 결제 ${displayAsset.billingDate}일`
                    : `결제일 ${displayAsset.billingDate}일`}
                </Text>
              )}

              {/* 카드 결제 예정 금액 */}
              {displayAsset.type === "card" && billingInfo && (
                <View style={styles.billingAmountContainer}>
                  <View style={styles.billingAmountItem}>
                    <Text style={styles.billingAmountLabel}>이번 달 결제 예정</Text>
                    <Text style={styles.billingAmountValue}>
                      {formatCurrency(billingInfo.currentBilling)}
                    </Text>
                  </View>
                  <View style={styles.billingAmountDivider} />
                  <View style={styles.billingAmountItem}>
                    <Text style={styles.billingAmountLabel}>다음 달 결제 예정</Text>
                    <Text style={styles.billingAmountValue}>
                      {formatCurrency(billingInfo.nextBilling)}
                    </Text>
                  </View>
                </View>
              )}

            </View>

            {isLoading ? (
              <ActivityIndicator
                size="large"
                color={colors.primary.main}
                style={{ marginTop: spacing.xl }}
              />
            ) : (
              <>
                {/* 거래 내역 섹션 */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <View style={styles.sectionTitleRow}>
                      <Text style={styles.sectionTitle}>거래 내역</Text>
                      <TouchableOpacity
                        style={styles.addTransactionButton}
                        onPress={() => setShowAddTransaction(true)}
                      >
                        <Ionicons name="add" size={18} color={colors.primary.main} />
                        <Text style={styles.addTransactionText}>내역 추가</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.monthNavigator}>
                      <TouchableOpacity
                        onPress={handlePrevMonth}
                        style={styles.monthNavButton}
                      >
                        <Ionicons
                          name="chevron-back"
                          size={18}
                          color={colors.text.secondary}
                        />
                      </TouchableOpacity>
                      <Text style={styles.monthNavText}>
                        {formatMonthYear(selectedMonth)}
                      </Text>
                      <TouchableOpacity
                        onPress={handleNextMonth}
                        style={styles.monthNavButton}
                      >
                        <Ionicons
                          name="chevron-forward"
                          size={18}
                          color={colors.text.secondary}
                        />
                      </TouchableOpacity>
                    </View>
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

                  <Text style={styles.transactionCount}>
                    {filteredTransactions.length}건
                  </Text>

                  {filteredTransactions.length > 0 ? (
                    <View style={styles.listCard}>
                      {filteredTransactions.map((transaction, index) => {
                        const isInstallment = transaction.isInstallment;
                        const displayAmount =
                          isInstallment &&
                          transaction.totalTerm &&
                          transaction.totalTerm > 0
                            ? Math.round(transaction.amount / transaction.totalTerm)
                            : transaction.amount;

                        const isTransfer = transaction.type === "transfer";
                        const isOutgoing = transaction.assetId === asset.id;

                        return (
                          <TouchableOpacity
                            key={transaction.id}
                            style={[
                              styles.listItem,
                              index < filteredTransactions.length - 1 &&
                                styles.listItemBorder,
                            ]}
                            activeOpacity={0.7}
                            onPress={() => {
                              // 고정 지출 카테고리의 거래는 전용 시트에서 처리
                              if (transaction.category?.type === 'fixed') {
                                setSelectedFixedTransaction(transaction);
                                setShowFixedTransaction(true);
                              } else {
                                setEditingTransaction(transaction);
                                setShowAddTransaction(true);
                              }
                            }}
                          >
                            <View style={styles.listItemContent}>
                              <View style={styles.listItemTitleRow}>
                                <Text style={styles.listItemTitle} numberOfLines={1}>
                                  {transaction.title}
                                </Text>
                                <View style={styles.indicatorRow}>
                                  {transaction.category?.type === 'fixed' && (
                                    <View style={styles.fixedIndicator}>
                                      <Ionicons name="repeat" size={12} color={colors.semantic.expense} />
                                    </View>
                                  )}
                                  {isInstallment &&
                                    transaction.currentTerm &&
                                    transaction.totalTerm && (
                                      <View style={styles.installmentBadge}>
                                        <Text style={styles.installmentBadgeText}>
                                          {transaction.currentTerm}/
                                          {transaction.totalTerm}
                                        </Text>
                                      </View>
                                    )}
                                </View>
                              </View>
                              <Text style={styles.listItemSubtitle}>
                                {formatDate(transaction.date)}
                                {transaction.category &&
                                  ` · ${transaction.category.name}`}
                                {isTransfer &&
                                  (isOutgoing
                                    ? ` → ${transaction.toAsset?.name || "알 수 없음"}`
                                    : ` ← ${transaction.asset?.name || "알 수 없음"}`)}
                              </Text>
                            </View>
                            <Text
                              style={[
                                styles.listItemAmount,
                                transaction.type === "income" && styles.incomeText,
                                transaction.type === "expense" &&
                                  (isInstallment &&
                                  !transaction.includeInLivingExpense
                                    ? styles.excludedText
                                    : styles.expenseText),
                                transaction.type === "transfer" &&
                                  styles.transferText,
                              ]}
                            >
                              {transaction.type === "income"
                                ? "+"
                                : transaction.type === "transfer"
                                ? isOutgoing
                                  ? "-"
                                  : "+"
                                : "-"}
                              {formatCurrency(displayAmount)}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ) : (
                    <View style={styles.emptySection}>
                      <Text style={styles.emptyText}>
                        {formatMonthYear(selectedMonth)} 거래 내역이 없습니다
                      </Text>
                    </View>
                  )}
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>

      {/* 내역 추가/수정 시트 */}
      <AddTransactionSheet
        visible={showAddTransaction}
        onClose={() => {
          setShowAddTransaction(false);
          setEditingTransaction(null);
        }}
        onSuccess={() => {
          loadData(selectedMonth, true);
          setEditingTransaction(null);
          onTransactionChange?.();
        }}
        defaultAssetId={currentAsset?.id || asset?.id}
        editTransaction={editingTransaction}
      />

      {/* 고정 지출 거래 수정 시트 */}
      <FixedTransactionSheet
        visible={showFixedTransaction}
        transaction={selectedFixedTransaction}
        onClose={() => {
          setShowFixedTransaction(false);
          setSelectedFixedTransaction(null);
        }}
        onSuccess={() => {
          loadData(selectedMonth, true);
          setSelectedFixedTransaction(null);
          onTransactionChange?.();
        }}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  sheet: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: borderRadius["2xl"],
    borderTopRightRadius: borderRadius["2xl"],
    flex: 1,
    ...shadows.xl,
  },
  handleContainer: {
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border.medium,
    borderRadius: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  closeButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  headerIconButton: {
    padding: spacing.xs,
  },
  scrollView: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing["3xl"],
  },
  assetCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  assetCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  assetIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  assetCardInfo: {
    flex: 1,
  },
  assetName: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
  },
  assetType: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  assetBalance: {
    fontSize: typography.fontSize["2xl"],
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.sm,
  },
  positiveBalance: {
    color: colors.text.primary,
  },
  negativeBalance: {
    color: colors.semantic.expense,
  },
  billingInfo: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    marginBottom: spacing.md,
  },
  billingAmountContainer: {
    flexDirection: "row",
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.base,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  billingAmountItem: {
    flex: 1,
    alignItems: "center",
  },
  billingAmountDivider: {
    width: 1,
    backgroundColor: colors.border.light,
    marginHorizontal: spacing.sm,
  },
  billingAmountLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    marginBottom: spacing.xs,
  },
  billingAmountValue: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.semantic.expense,
  },
  incomeText: {
    color: colors.semantic.income,
  },
  expenseText: {
    color: colors.semantic.expense,
  },
  excludedText: {
    color: colors.text.tertiary,
  },
  transferText: {
    color: colors.semantic.transfer,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  sectionTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
  },
  addTransactionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary.light + "30",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  addTransactionText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.primary.main,
  },
  sectionTotal: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.semantic.expense,
  },
  sectionCount: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  },
  monthNavigator: {
    flexDirection: "row",
    alignItems: "center",
  },
  monthNavButton: {
    padding: spacing.xs,
  },
  monthNavText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
    minWidth: 80,
    textAlign: "center",
  },
  transactionCount: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.sm,
  },
  filterRow: {
    flexDirection: 'row',
    marginVertical: spacing.sm,
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
  listCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
  },
  listItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  listItemContent: {
    flex: 1,
  },
  listItemTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  listItemTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
    flexShrink: 1,
  },
  indicatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginLeft: spacing.sm,
    flexShrink: 0,
  },
  fixedIndicator: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.semantic.expense + "20",
    alignItems: "center",
    justifyContent: "center",
  },
  listItemSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  listItemAmount: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.semantic.expense,
  },
  installmentBadge: {
    backgroundColor: colors.primary.light + "30",
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.sm,
  },
  installmentBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.primary.main,
  },
  emptySection: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.xl,
    alignItems: "center",
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  },
});
