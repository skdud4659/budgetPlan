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
import { useFocusEffect } from 'expo-router';
import { colors, typography, spacing, borderRadius, shadows } from '../../src/styles';
import type { Transaction } from '../../src/types';
import { transactionService } from '../../src/services/transactionService';
import { useSettings } from '../../src/contexts/SettingsContext';
import AddTransactionSheet from '../../src/components/AddTransactionSheet';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export default function TransactionsScreen() {
  const { jointBudgetEnabled } = useSettings();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddSheet, setShowAddSheet] = useState(false);

  // 데이터 로드
  const loadTransactions = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await transactionService.getTransactions(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + 1
      );
      setTransactions(data);
    } catch (error) {
      console.error('거래 내역 로드 실패:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentMonth]);

  // 탭이 포커스될 때마다 데이터 새로고침
  useFocusEffect(
    useCallback(() => {
      loadTransactions();
    }, [loadTransactions])
  );

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('ko-KR') + '원';
  };

  const formatMonthYear = (date: Date) => {
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
  };

  const handlePrevMonth = () => {
    const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    setCurrentMonth(newMonth);
    setSelectedDate(newMonth);
  };

  const handleNextMonth = () => {
    const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    setCurrentMonth(newMonth);
    setSelectedDate(newMonth);
  };

  // 날짜별 거래 내역 그룹화
  const transactionsByDate = transactions.reduce((acc, t) => {
    const date = t.date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(t);
    return acc;
  }, {} as Record<string, Transaction[]>);

  // 날짜별 금액 합계 (지출만)
  const getDateExpense = (dateStr: string) => {
    const dayTransactions = transactionsByDate[dateStr] || [];
    return dayTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  };

  // 선택된 날짜의 거래 내역
  const selectedDateStr = selectedDate.toISOString().split('T')[0];
  const selectedTransactions = transactionsByDate[selectedDateStr] || [];

  // 캘린더 데이터 생성
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    const days: (number | null)[] = [];

    // 이전 달의 빈 칸
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }

    // 현재 달의 날짜
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  };

  const calendarDays = generateCalendarDays();

  const isToday = (day: number) => {
    const today = new Date();
    return (
      today.getFullYear() === currentMonth.getFullYear() &&
      today.getMonth() === currentMonth.getMonth() &&
      today.getDate() === day
    );
  };

  const isSelected = (day: number) => {
    return (
      selectedDate.getFullYear() === currentMonth.getFullYear() &&
      selectedDate.getMonth() === currentMonth.getMonth() &&
      selectedDate.getDate() === day
    );
  };

  const handleDayPress = (day: number) => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    setSelectedDate(newDate);
  };

  const formatSelectedDate = () => {
    const month = selectedDate.getMonth() + 1;
    const day = selectedDate.getDate();
    const weekday = WEEKDAYS[selectedDate.getDay()];
    return `${month}월 ${day}일 (${weekday})`;
  };

  // 월별 합계
  const monthlyIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const monthlyExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

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
          style={styles.addButton}
          onPress={() => setShowAddSheet(true)}
        >
          <Ionicons name="add" size={24} color={colors.primary.main} />
        </TouchableOpacity>
      </View>

      {/* Monthly Summary */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>수입</Text>
          <Text style={[styles.summaryAmount, styles.incomeText]}>
            +{formatCurrency(monthlyIncome)}
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>지출</Text>
          <Text style={[styles.summaryAmount, styles.expenseText]}>
            -{formatCurrency(monthlyExpense)}
          </Text>
        </View>
      </View>

      {/* Calendar */}
      <View style={styles.calendarContainer}>
        {/* Weekday Headers */}
        <View style={styles.weekdayRow}>
          {WEEKDAYS.map((day, index) => (
            <View key={day} style={styles.weekdayCell}>
              <Text style={[
                styles.weekdayText,
                index === 0 && styles.sundayText,
                index === 6 && styles.saturdayText,
              ]}>
                {day}
              </Text>
            </View>
          ))}
        </View>

        {/* Calendar Days */}
        <View style={styles.daysGrid}>
          {calendarDays.map((day, index) => {
            if (day === null) {
              return <View key={`empty-${index}`} style={styles.dayCell} />;
            }

            const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const expense = getDateExpense(dateStr);
            const hasTransactions = transactionsByDate[dateStr]?.length > 0;
            const dayOfWeek = (index % 7);

            return (
              <TouchableOpacity
                key={day}
                style={[
                  styles.dayCell,
                  isSelected(day) && styles.dayCellSelected,
                ]}
                onPress={() => handleDayPress(day)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.dayText,
                  isToday(day) && styles.todayText,
                  isSelected(day) && styles.selectedDayText,
                  dayOfWeek === 0 && styles.sundayText,
                  dayOfWeek === 6 && styles.saturdayText,
                ]}>
                  {day}
                </Text>
                {expense > 0 && (
                  <Text style={[
                    styles.dayExpense,
                    isSelected(day) && styles.selectedDayExpense,
                  ]} numberOfLines={1}>
                    {expense >= 10000
                      ? `${Math.floor(expense / 10000)}만`
                      : formatCurrency(expense).replace('원', '')}
                  </Text>
                )}
                {hasTransactions && !expense && (
                  <View style={[
                    styles.dot,
                    isSelected(day) && styles.selectedDot,
                  ]} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Selected Date Transactions */}
      <View style={styles.selectedDateSection}>
        <Text style={styles.selectedDateTitle}>{formatSelectedDate()}</Text>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary.main} />
          </View>
        ) : selectedTransactions.length > 0 ? (
          <ScrollView
            style={styles.transactionList}
            showsVerticalScrollIndicator={false}
          >
            {selectedTransactions.map((transaction, index) => (
              <TransactionItem
                key={transaction.id}
                transaction={transaction}
                isLast={index === selectedTransactions.length - 1}
                showJointBadge={jointBudgetEnabled}
              />
            ))}
          </ScrollView>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>거래 내역이 없습니다</Text>
          </View>
        )}
      </View>

      {/* Add Transaction Sheet */}
      <AddTransactionSheet
        visible={showAddSheet}
        onClose={() => setShowAddSheet(false)}
        onSuccess={loadTransactions}
      />
    </SafeAreaView>
  );
}

function TransactionItem({
  transaction,
  isLast,
  showJointBadge,
}: {
  transaction: Transaction;
  isLast: boolean;
  showJointBadge: boolean;
}) {
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('ko-KR') + '원';
  };

  const categoryName = transaction.category?.name || '미분류';
  const categoryColor = transaction.category?.color || colors.text.tertiary;
  const categoryIcon = transaction.category?.iconName || 'help-circle';

  const isTransfer = transaction.type === 'transfer';

  return (
    <View style={[styles.transactionItem, !isLast && styles.transactionItemBorder]}>
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
          <Text style={styles.transactionTitle}>{transaction.title}</Text>
          {showJointBadge && transaction.budgetType === 'joint' && (
            <View style={styles.jointBadge}>
              <Text style={styles.jointBadgeText}>공동</Text>
            </View>
          )}
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
    </View>
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
  addButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.base,
    backgroundColor: colors.primary.light + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: colors.border.light,
  },
  summaryLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    marginBottom: spacing.xs,
  },
  summaryAmount: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
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
  calendarContainer: {
    backgroundColor: colors.background.secondary,
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    ...shadows.sm,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  weekdayText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.tertiary,
  },
  sundayText: {
    color: colors.semantic.expense,
  },
  saturdayText: {
    color: colors.semantic.transfer,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  dayCellSelected: {
    backgroundColor: colors.primary.main,
    borderRadius: borderRadius.base,
  },
  dayText: {
    fontSize: typography.fontSize.md,
    color: colors.text.primary,
  },
  todayText: {
    fontWeight: typography.fontWeight.bold,
    color: colors.primary.main,
  },
  selectedDayText: {
    color: colors.text.inverse,
    fontWeight: typography.fontWeight.bold,
  },
  dayExpense: {
    fontSize: typography.fontSize.xs,
    color: colors.semantic.expense,
    marginTop: 2,
  },
  selectedDayExpense: {
    color: colors.text.inverse,
    opacity: 0.9,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.semantic.income,
    marginTop: 2,
  },
  selectedDot: {
    backgroundColor: colors.text.inverse,
  },
  selectedDateSection: {
    flex: 1,
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  selectedDateTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionList: {
    flex: 1,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
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
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.xl,
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    color: colors.text.tertiary,
  },
});
