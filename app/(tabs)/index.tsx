import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { colors, typography, spacing, borderRadius, shadows } from '../../src/styles';
import type { Transaction, FixedItem } from '../../src/types';
import { transactionService } from '../../src/services/transactionService';
import { fixedItemService } from '../../src/services/fixedItemService';
import { useSettings } from '../../src/contexts/SettingsContext';
import AddTransactionSheet from '../../src/components/AddTransactionSheet';
import AddFixedItemSheet from '../../src/components/AddFixedItemSheet';

const WEEKDAYS = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

export default function HomeScreen() {
  const router = useRouter();
  const { jointBudgetEnabled, personalBudget, monthStartDay } = useSettings();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [fixedItems, setFixedItems] = useState<FixedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [showFixedItemSheet, setShowFixedItemSheet] = useState(false);
  const [editingFixedItem, setEditingFixedItem] = useState<FixedItem | null>(null);
  const [budgetTypeFilter, setBudgetTypeFilter] = useState<'all' | 'personal' | 'joint'>('all');

  // 고정비용 총액 계산
  const totalFixedExpense = fixedItems.reduce((sum, item) => sum + item.amount, 0);

  // 정기지출 자동 생성
  const generateFixedTransactionsIfNeeded = useCallback(async (fixedData: FixedItem[]) => {
    try {
      const shouldGenerate = await transactionService.shouldGenerateFixedTransactions(monthStartDay);
      if (shouldGenerate && fixedData.length > 0) {
        const result = await transactionService.generateFixedTransactions(fixedData, monthStartDay);
        if (result.generated > 0) {
          console.log(`정기지출 ${result.generated}건 자동 생성 완료`);
          const newTransactions = await transactionService.getTransactions(
            currentMonth.getFullYear(),
            currentMonth.getMonth() + 1
          );
          setTransactions(newTransactions);
        }
      }
    } catch (error) {
      console.error('정기지출 자동 생성 실패:', error);
    }
  }, [monthStartDay, currentMonth]);

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

      generateFixedTransactionsIfNeeded(fixedData);
    } catch (error) {
      console.error('데이터 로드 실패:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentMonth, generateFixedTransactionsIfNeeded]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('ko-KR') + '원';
  };

  const handleTransactionPress = (transaction: Transaction) => {
    if (transaction.category?.type === 'fixed') {
      const matchedFixedItem = fixedItems.find(
        (item) => item.name === transaction.title && item.amount === transaction.amount
      );
      if (matchedFixedItem) {
        setEditingFixedItem(matchedFixedItem);
        setShowFixedItemSheet(true);
        return;
      }
    }
    setEditingTransaction(transaction);
    setShowAddSheet(true);
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

  // 필터된 거래 내역
  const filteredTransactions = transactions.filter((t) => {
    if (budgetTypeFilter === 'all') return true;
    return t.budgetType === budgetTypeFilter;
  });

  // 월별 합계
  const monthlyIncome = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  // 생활비 지출 (고정비용 제외)
  const livingExpense = filteredTransactions
    .filter(t => t.type === 'expense' && t.category?.type !== 'fixed')
    .reduce((sum, t) => sum + t.amount, 0);

  // 고정비용 지출
  const fixedExpense = filteredTransactions
    .filter(t => t.type === 'expense' && t.category?.type === 'fixed')
    .reduce((sum, t) => sum + t.amount, 0);

  // 총 지출
  const totalExpense = livingExpense + fixedExpense;

  // 이번 달 잔액
  const monthlyBalance = monthlyIncome - totalExpense;

  // 생활비 예산 (월예산 - 고정비용)
  const livingBudget = (personalBudget || 0) - totalFixedExpense;

  // 남은 생활비
  const remainingLivingBudget = livingBudget - livingExpense;

  // 생활비 사용률
  const livingExpenseRate = livingBudget > 0 ? (livingExpense / livingBudget) * 100 : 0;

  // 날짜별 그룹핑
  const groupTransactionsByDate = () => {
    const groups: { date: string; transactions: Transaction[] }[] = [];
    const dateMap: Record<string, Transaction[]> = {};

    filteredTransactions.forEach((t) => {
      if (!dateMap[t.date]) {
        dateMap[t.date] = [];
      }
      dateMap[t.date].push(t);
    });

    Object.keys(dateMap)
      .sort((a, b) => b.localeCompare(a))
      .forEach((date) => {
        groups.push({ date, transactions: dateMap[date] });
      });

    return groups;
  };

  const groupedTransactions = groupTransactionsByDate();

  const formatDateHeader = (dateStr: string) => {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekday = WEEKDAYS[date.getDay()];
    return `${month}월 ${day}일 ${weekday}`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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
        <TouchableOpacity
          style={styles.statsButton}
          onPress={() => router.push('/statistics')}
        >
          <Ionicons name="stats-chart" size={20} color={colors.primary.main} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 재정 현황 카드 */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>{currentMonth.getMonth() + 1}월, 이만큼 썼어요</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>수입</Text>
            <Text style={[styles.summaryValue, styles.incomeText]}>
              +{formatCurrency(monthlyIncome)}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabelSub}>고정비용</Text>
            <Text style={styles.summaryValueSub}>-{formatCurrency(fixedExpense)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabelSub}>생활비 지출</Text>
            <Text style={styles.summaryValueSub}>-{formatCurrency(livingExpense)}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabelHighlight}>이번 달 잔액</Text>
            <Text style={[
              styles.summaryValueHighlight,
              monthlyBalance < 0 && styles.expenseText,
            ]}>
              {monthlyBalance >= 0 ? '+' : ''}{formatCurrency(monthlyBalance)}
            </Text>
          </View>
        </View>

        {/* 생활비 현황 */}
        <View style={styles.livingCard}>
          <View style={styles.livingHeader}>
            <Text style={styles.livingTitle}>생활비</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/living')}>
              <Text style={styles.livingLink}>자세히 보기</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.livingRow}>
            <Text style={styles.livingLabel}>예산</Text>
            <Text style={styles.livingValue}>{formatCurrency(livingBudget)}</Text>
          </View>
          <View style={styles.livingRow}>
            <Text style={styles.livingLabel}>사용</Text>
            <Text style={styles.livingValue}>{formatCurrency(livingExpense)}</Text>
          </View>
          <View style={styles.livingRow}>
            <Text style={styles.livingLabel}>남은 금액</Text>
            <Text style={[
              styles.livingValueHighlight,
              remainingLivingBudget < 0 && styles.expenseText,
            ]}>
              {formatCurrency(remainingLivingBudget)}
            </Text>
          </View>

          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(livingExpenseRate, 100)}%`,
                  backgroundColor: livingExpenseRate > 100
                    ? colors.semantic.expense
                    : colors.primary.main,
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {livingExpenseRate.toFixed(0)}% 사용
          </Text>
        </View>

        {/* 고정비용 요약 */}
        <View style={styles.fixedCard}>
          <View style={styles.fixedHeader}>
            <Text style={styles.fixedTitle}>고정비용</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/fixed')}>
              <Text style={styles.fixedLink}>자세히 보기</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.fixedRow}>
            <Text style={styles.fixedLabel}>이번 달</Text>
            <Text style={styles.fixedValue}>{formatCurrency(totalFixedExpense)}</Text>
          </View>
          <Text style={styles.fixedCount}>{fixedItems.length}건</Text>
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

        {/* 거래 내역 */}
        <View style={styles.transactionSection}>
          <Text style={styles.sectionTitle}>거래 내역</Text>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary.main} />
            </View>
          ) : groupedTransactions.length > 0 ? (
            <View style={styles.transactionList}>
              {groupedTransactions.map((group) => (
                <View key={group.date}>
                  <View style={styles.dateHeader}>
                    <Text style={styles.dateHeaderText}>
                      {formatDateHeader(group.date)}
                    </Text>
                    <Text style={styles.dateHeaderAmount}>
                      {formatCurrency(
                        group.transactions
                          .filter((t) => t.type === 'expense')
                          .reduce((sum, t) => sum + t.amount, 0)
                      )}
                    </Text>
                  </View>
                  {group.transactions.map((transaction, index) => (
                    <TransactionItem
                      key={transaction.id}
                      transaction={transaction}
                      isLast={index === group.transactions.length - 1}
                      showJointBadge={jointBudgetEnabled}
                      onPress={() => handleTransactionPress(transaction)}
                    />
                  ))}
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={48} color={colors.text.tertiary} />
              <Text style={styles.emptyText}>거래 내역이 없어요</Text>
              <Text style={styles.emptySubtext}>+ 버튼을 눌러 거래를 추가해 보세요</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowAddSheet(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color={colors.text.inverse} />
      </TouchableOpacity>

      {/* Add/Edit Transaction Sheet */}
      <AddTransactionSheet
        visible={showAddSheet}
        onClose={() => {
          setShowAddSheet(false);
          setEditingTransaction(null);
        }}
        onSuccess={() => {
          loadData();
          setEditingTransaction(null);
        }}
        editTransaction={editingTransaction}
      />

      {/* Edit Fixed Item Sheet */}
      <AddFixedItemSheet
        visible={showFixedItemSheet}
        onClose={() => {
          setShowFixedItemSheet(false);
          setEditingFixedItem(null);
        }}
        onSubmit={async (data) => {
          if (editingFixedItem) {
            await fixedItemService.updateFixedItem(editingFixedItem.id, data);
            loadData();
          }
          setShowFixedItemSheet(false);
          setEditingFixedItem(null);
        }}
        onDelete={editingFixedItem ? async () => {
          await fixedItemService.deleteFixedItem(editingFixedItem.id);
          loadData();
          setShowFixedItemSheet(false);
          setEditingFixedItem(null);
        } : undefined}
        editItem={editingFixedItem}
      />
    </SafeAreaView>
  );
}

function TransactionItem({
  transaction,
  isLast,
  showJointBadge,
  onPress,
}: {
  transaction: Transaction;
  isLast: boolean;
  showJointBadge: boolean;
  onPress?: () => void;
}) {
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('ko-KR') + '원';
  };

  const categoryName = transaction.category?.name || '미분류';
  const categoryColor = transaction.category?.color || colors.text.tertiary;
  const categoryIcon = transaction.category?.iconName || 'help-circle';
  const isTransfer = transaction.type === 'transfer';

  return (
    <TouchableOpacity
      style={[styles.transactionItem, !isLast && styles.transactionItemBorder]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View
        style={[
          styles.transactionIcon,
          { backgroundColor: categoryColor + '20' },
        ]}
      >
        <Ionicons
          name={isTransfer ? 'swap-horizontal' : categoryIcon as keyof typeof Ionicons.glyphMap}
          size={20}
          color={isTransfer ? colors.semantic.transfer : categoryColor}
        />
      </View>
      <View style={styles.transactionContent}>
        <View style={styles.transactionTop}>
          <Text style={styles.transactionTitle} numberOfLines={1}>{transaction.title}</Text>
          <View style={styles.badgeRow}>
            {transaction.category?.type === 'fixed' && (
              <View style={styles.fixedIndicator}>
                <Ionicons name="repeat" size={12} color={colors.semantic.expense} />
              </View>
            )}
            {showJointBadge && transaction.budgetType === 'joint' && (
              <View style={styles.jointIndicator}>
                <Ionicons name="people" size={12} color={colors.secondary.dark} />
              </View>
            )}
          </View>
        </View>
        <Text style={styles.transactionCategory}>
          {isTransfer && transaction.asset && transaction.toAsset
            ? `${transaction.asset.name} → ${transaction.toAsset.name}`
            : categoryName}
        </Text>
      </View>
      <Text
        style={[
          styles.transactionAmount,
          transaction.type === 'income' && styles.incomeText,
          transaction.type === 'expense' && styles.expenseText,
          transaction.type === 'transfer' && styles.transferText,
        ]}
      >
        {transaction.type === 'income' ? '+' : transaction.type === 'expense' ? '-' : ''}
        {formatCurrency(transaction.amount)}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  statsButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.base,
    backgroundColor: colors.primary.light + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  // 재정 현황 카드
  summaryCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  summaryTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  summaryLabel: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
  },
  summaryValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
  },
  summaryLabelSub: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  },
  summaryValueSub: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
  },
  summaryLabelHighlight: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  summaryValueHighlight: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary.main,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginVertical: spacing.sm,
  },
  // 생활비 카드
  livingCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  livingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  livingTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
  },
  livingLink: {
    fontSize: typography.fontSize.sm,
    color: colors.primary.main,
  },
  livingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  livingLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  },
  livingValue: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  livingValueHighlight: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.primary.main,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.border.light,
    borderRadius: borderRadius.sm,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: borderRadius.sm,
  },
  progressText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  // 고정비용 카드
  fixedCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  fixedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  fixedTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
  },
  fixedLink: {
    fontSize: typography.fontSize.sm,
    color: colors.primary.main,
  },
  fixedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fixedLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  },
  fixedValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  fixedCount: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
  // 필터
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
  // 거래 내역 섹션
  transactionSection: {
    marginTop: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  transactionList: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.base,
    ...shadows.sm,
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    marginTop: spacing.sm,
  },
  dateHeaderText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
  },
  dateHeaderAmount: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.semantic.expense,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  transactionItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.base,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  transactionContent: {
    flex: 1,
  },
  transactionTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
    flexShrink: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginLeft: spacing.sm,
    flexShrink: 0,
  },
  fixedIndicator: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.semantic.expense + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  jointIndicator: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.secondary.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionCategory: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
  },
  incomeText: {
    color: colors.semantic.income,
  },
  expenseText: {
    color: colors.semantic.expense,
  },
  transferText: {
    color: colors.semantic.transfer,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.xl,
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
  },
  fab: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary.main,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
});
