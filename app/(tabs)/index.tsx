import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView, ScrollView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { colors, typography, spacing, borderRadius, shadows } from '../../src/styles';
import type { Transaction, FixedItem } from '../../src/types';
import { transactionService } from '../../src/services/transactionService';
import { fixedItemService } from '../../src/services/fixedItemService';
import { useSettings } from '../../src/contexts/SettingsContext';
import AddTransactionSheet from '../../src/components/AddTransactionSheet';
import FixedTransactionSheet from '../../src/components/FixedTransactionSheet';
import SwipeableContainer from '../../src/components/SwipeableContainer';

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
  const [showFixedTransaction, setShowFixedTransaction] = useState(false);
  const [selectedFixedTransaction, setSelectedFixedTransaction] = useState<Transaction | null>(null);
  const [budgetTypeFilter, setBudgetTypeFilter] = useState<'all' | 'personal' | 'joint'>('all');

  // 고정비용 총액 계산 (거래 내역 기준 - 수정된 금액 반영)
  // fixedItems 기반 기본값과 실제 거래 내역 기반 금액 중 거래 내역 우선
  const totalFixedExpenseFromTransactions = transactions
    .filter(t => t.type === 'expense' && t.category?.type === 'fixed')
    .reduce((sum, t) => sum + t.amount, 0);
  // 거래 내역이 있으면 거래 내역 기준, 없으면 fixedItems 기준
  const totalFixedExpense = totalFixedExpenseFromTransactions > 0
    ? totalFixedExpenseFromTransactions
    : fixedItems.reduce((sum, item) => sum + item.amount, 0);

  // 정기지출 및 할부 자동 생성
  const generateAutoTransactionsIfNeeded = useCallback(async (fixedData: FixedItem[]) => {
    try {
      let needReload = false;

      // 정기지출 자동 생성
      const shouldGenerateFixed = await transactionService.shouldGenerateFixedTransactions(monthStartDay);
      if (shouldGenerateFixed && fixedData.length > 0) {
        const result = await transactionService.generateFixedTransactions(fixedData, monthStartDay);
        if (result.generated > 0) {
          console.log(`정기지출 ${result.generated}건 자동 생성 완료`);
          needReload = true;
        }
      }

      // 할부 월별 거래 자동 생성
      const installmentResult = await transactionService.generateInstallmentTransactions(monthStartDay);
      if (installmentResult.generated > 0) {
        console.log(`할부 ${installmentResult.generated}건 자동 생성 완료`);
        needReload = true;
      }

      // 새로운 거래가 생성되었으면 다시 로드
      if (needReload) {
        const newTransactions = await transactionService.getTransactionsWithInstallmentsByStartDay(
          currentMonth.getFullYear(),
          currentMonth.getMonth() + 1,
          monthStartDay
        );
        setTransactions(newTransactions);
      }
    } catch (error) {
      console.error('자동 거래 생성 실패:', error);
    }
  }, [monthStartDay, currentMonth]);

  // 데이터 로드
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [transactionData, fixedData] = await Promise.all([
        transactionService.getTransactionsWithInstallmentsByStartDay(
          currentMonth.getFullYear(),
          currentMonth.getMonth() + 1,
          monthStartDay
        ),
        fixedItemService.getFixedItems(),
      ]);
      setTransactions(transactionData);
      setFixedItems(fixedData);

      generateAutoTransactionsIfNeeded(fixedData);
    } catch (error) {
      console.error('데이터 로드 실패:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentMonth, monthStartDay, generateAutoTransactionsIfNeeded]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('ko-KR') + '원';
  };

  const handleTransactionPress = (transaction: Transaction) => {
    // 고정 지출 카테고리의 거래는 전용 시트에서 처리
    if (transaction.category?.type === 'fixed') {
      setSelectedFixedTransaction(transaction);
      setShowFixedTransaction(true);
    } else {
      // 일반 거래 및 할부 거래 모두 수정 시트 열기
      // (할부 거래는 시트에서 수정 안내 메시지 표시)
      setEditingTransaction(transaction);
      setShowAddSheet(true);
    }
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

  // 생활비 지출 (고정비용 제외, includeInLivingExpense가 true인 것만)
  const livingExpense = filteredTransactions
    .filter(t => t.type === 'expense' && t.category?.type !== 'fixed' && t.includeInLivingExpense !== false)
    .reduce((sum, t) => sum + t.amount, 0);

  // 고정비용 지출
  const fixedExpense = filteredTransactions
    .filter(t => t.type === 'expense' && t.category?.type === 'fixed')
    .reduce((sum, t) => sum + t.amount, 0);

  // 총 지출
  const totalExpense = livingExpense + fixedExpense;

  // 이번 달 잔액
  const monthlyBalance = monthlyIncome - totalExpense;

  // 전체 생활비 예산 (개인 + 공동)
  const { jointBudget } = useSettings();
  const totalLivingBudget = (personalBudget || 0) + (jointBudgetEnabled ? (jointBudget || 0) : 0);

  // 남은 생활비
  const remainingLivingBudget = totalLivingBudget - livingExpense;

  // 생활비 사용률
  const livingExpenseRate = totalLivingBudget > 0 ? (livingExpense / totalLivingBudget) * 100 : 0;

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

      <GestureHandlerRootView style={styles.gestureContainer}>
        <SwipeableContainer
          onSwipeLeft={handleNextMonth}
          onSwipeRight={handlePrevMonth}
        >
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
            <Text style={styles.summaryLabelSub}>전체 생활비 지출</Text>
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
            <Text style={styles.livingLabel}>전체 예산</Text>
            <Text style={styles.livingValue}>{formatCurrency(totalLivingBudget)}</Text>
          </View>
          <View style={styles.livingRow}>
            <Text style={styles.livingLabel}>전체 생활비 지출</Text>
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
            <Text style={styles.fixedValue}>{formatCurrency(fixedExpense)}</Text>
          </View>
          <Text style={styles.fixedCount}>
            {filteredTransactions.filter(t => t.type === 'expense' && t.category?.type === 'fixed').length}건
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
        </SwipeableContainer>
      </GestureHandlerRootView>

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

      {/* 고정 지출 거래 수정 시트 */}
      <FixedTransactionSheet
        visible={showFixedTransaction}
        transaction={selectedFixedTransaction}
        onClose={() => {
          setShowFixedTransaction(false);
          setSelectedFixedTransaction(null);
        }}
        onSuccess={() => {
          loadData();
          setSelectedFixedTransaction(null);
        }}
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
  const isInstallment = transaction.isInstallment;
  const isExcludedFromBudget = transaction.type === 'expense' &&
    transaction.category?.type !== 'fixed' &&
    transaction.includeInLivingExpense === false;

  // 월별 할부 거래는 이미 월별 금액이 저장되어 있음
  const displayAmount = transaction.amount;

  return (
    <TouchableOpacity
      style={[
        styles.transactionItem,
        !isLast && styles.transactionItemBorder,
        isExcludedFromBudget && styles.excludedTransaction,
      ]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View
        style={[
          styles.transactionIcon,
          { backgroundColor: categoryColor + (isExcludedFromBudget ? '10' : '20') },
        ]}
      >
        <Ionicons
          name={isTransfer ? 'swap-horizontal' : categoryIcon as keyof typeof Ionicons.glyphMap}
          size={20}
          color={isTransfer ? colors.semantic.transfer : (isExcludedFromBudget ? colors.text.tertiary : categoryColor)}
        />
      </View>
      <View style={styles.transactionContent}>
        <View style={styles.transactionTop}>
          <Text style={[
            styles.transactionTitle,
            isExcludedFromBudget && styles.excludedText,
          ]} numberOfLines={1}>{transaction.title}</Text>
          <View style={styles.badgeRow}>
            {isExcludedFromBudget && (
              <View style={styles.excludedBadge}>
                <Text style={styles.excludedBadgeText}>예산 외</Text>
              </View>
            )}
            {isInstallment && transaction.currentTerm && transaction.totalTerm && (
              <View style={styles.installmentBadge}>
                <Text style={styles.installmentBadgeText}>
                  {transaction.currentTerm}/{transaction.totalTerm}
                </Text>
              </View>
            )}
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
        <Text style={[
          styles.transactionCategory,
          isExcludedFromBudget && styles.excludedSubText,
        ]}>
          {isTransfer && transaction.asset && transaction.toAsset
            ? `${transaction.asset.name} → ${transaction.toAsset.name}`
            : `${categoryName}${transaction.asset ? ` · ${transaction.asset.name}` : ''}`}
        </Text>
      </View>
      <Text
        style={[
          styles.transactionAmount,
          transaction.type === 'income' && styles.incomeText,
          transaction.type === 'expense' && (isExcludedFromBudget ? styles.excludedAmountText : styles.expenseText),
          transaction.type === 'transfer' && styles.transferText,
        ]}
      >
        {transaction.type === 'income' ? '+' : transaction.type === 'expense' ? '-' : ''}
        {formatCurrency(displayAmount)}
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
  gestureContainer: {
    flex: 1,
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
  installmentBadge: {
    backgroundColor: colors.primary.light + '30',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  installmentBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.primary.main,
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
  // 예산 미포함 스타일
  excludedTransaction: {
    opacity: 0.7,
  },
  excludedText: {
    color: colors.text.tertiary,
  },
  excludedSubText: {
    color: colors.text.tertiary,
  },
  excludedAmountText: {
    color: colors.text.tertiary,
  },
  excludedBadge: {
    backgroundColor: colors.text.tertiary + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  excludedBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.tertiary,
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
