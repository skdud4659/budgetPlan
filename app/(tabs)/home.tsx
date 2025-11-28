import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../../src/styles';
import type { BudgetType, TransactionType } from '../../src/types';

// 임시 데이터 타입
interface MockTransaction {
  id: string;
  title: string;
  amount: number;
  type: TransactionType;
  category: string;
  categoryIcon: string;
  categoryColor: string;
  date: string;
  budgetType: BudgetType;
}

// 임시 데이터
const mockTransactions: MockTransaction[] = [
  {
    id: '1',
    title: '스타벅스',
    amount: 5500,
    type: 'expense',
    category: '식비',
    categoryIcon: 'restaurant',
    categoryColor: '#FF8A80',
    date: '2025-11-28',
    budgetType: 'personal',
  },
  {
    id: '2',
    title: '지하철',
    amount: 1500,
    type: 'expense',
    category: '교통',
    categoryIcon: 'subway',
    categoryColor: '#90CAF9',
    date: '2025-11-28',
    budgetType: 'personal',
  },
  {
    id: '3',
    title: '마트 장보기',
    amount: 45000,
    type: 'expense',
    category: '쇼핑',
    categoryIcon: 'cart',
    categoryColor: '#CE93D8',
    date: '2025-11-28',
    budgetType: 'joint',
  },
  {
    id: '4',
    title: '월급',
    amount: 3500000,
    type: 'income',
    category: '급여',
    categoryIcon: 'cash',
    categoryColor: '#4CAF93',
    date: '2025-11-25',
    budgetType: 'personal',
  },
];

export default function HomeScreen() {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedBudgetType, setSelectedBudgetType] = useState<'all' | BudgetType>('all');

  const totalIncome = mockTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = mockTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const filteredTransactions =
    selectedBudgetType === 'all'
      ? mockTransactions
      : mockTransactions.filter((t) => t.budgetType === selectedBudgetType);

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('ko-KR') + '원';
  };

  const formatMonthYear = (date: Date) => {
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.monthSelector}>
            <Ionicons name="chevron-back" size={20} color={colors.text.secondary} />
          </TouchableOpacity>
          <Text style={styles.monthText}>{formatMonthYear(selectedMonth)}</Text>
          <TouchableOpacity style={styles.monthSelector}>
            <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.headerRight}>
          <Ionicons name="notifications-outline" size={24} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryTitle}>이번 달 요약</Text>
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <View style={styles.summaryLabelRow}>
                <View style={[styles.dot, { backgroundColor: colors.semantic.income }]} />
                <Text style={styles.summaryLabel}>수입</Text>
              </View>
              <Text style={[styles.summaryAmount, styles.incomeAmount]}>
                +{formatCurrency(totalIncome)}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <View style={styles.summaryLabelRow}>
                <View style={[styles.dot, { backgroundColor: colors.semantic.expense }]} />
                <Text style={styles.summaryLabel}>지출</Text>
              </View>
              <Text style={[styles.summaryAmount, styles.expenseAmount]}>
                -{formatCurrency(totalExpense)}
              </Text>
            </View>
          </View>

          <View style={styles.balanceRow}>
            <Text style={styles.balanceLabel}>잔액</Text>
            <Text style={styles.balanceAmount}>
              {formatCurrency(totalIncome - totalExpense)}
            </Text>
          </View>
        </View>

        {/* Budget Type Filter */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedBudgetType === 'all' && styles.filterChipActive,
            ]}
            onPress={() => setSelectedBudgetType('all')}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedBudgetType === 'all' && styles.filterChipTextActive,
              ]}
            >
              전체
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedBudgetType === 'personal' && styles.filterChipActive,
            ]}
            onPress={() => setSelectedBudgetType('personal')}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedBudgetType === 'personal' && styles.filterChipTextActive,
              ]}
            >
              내꺼
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedBudgetType === 'joint' && styles.filterChipActiveSecondary,
            ]}
            onPress={() => setSelectedBudgetType('joint')}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedBudgetType === 'joint' && styles.filterChipTextActive,
              ]}
            >
              공동
            </Text>
          </TouchableOpacity>
        </View>

        {/* Transaction List */}
        <View style={styles.transactionSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>거래 내역</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>전체보기</Text>
            </TouchableOpacity>
          </View>

          {filteredTransactions.map((transaction) => (
            <TransactionItem key={transaction.id} transaction={transaction} />
          ))}
        </View>
      </ScrollView>

      {/* FAB - Add Transaction */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.8}>
        <Ionicons name="add" size={28} color={colors.text.inverse} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function TransactionItem({ transaction }: { transaction: MockTransaction }) {
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('ko-KR') + '원';
  };

  return (
    <TouchableOpacity style={styles.transactionItem} activeOpacity={0.7}>
      <View
        style={[
          styles.transactionIcon,
          { backgroundColor: transaction.categoryColor + '20' },
        ]}
      >
        <Ionicons
          name={transaction.categoryIcon as keyof typeof Ionicons.glyphMap}
          size={20}
          color={transaction.categoryColor}
        />
      </View>
      <View style={styles.transactionContent}>
        <View style={styles.transactionTop}>
          <Text style={styles.transactionTitle}>{transaction.title}</Text>
          {transaction.budgetType === 'joint' && (
            <View style={styles.jointBadge}>
              <Text style={styles.jointBadgeText}>공동</Text>
            </View>
          )}
        </View>
        <Text style={styles.transactionCategory}>{transaction.category}</Text>
      </View>
      <Text
        style={[
          styles.transactionAmount,
          transaction.type === 'income'
            ? styles.incomeAmount
            : styles.expenseAmount,
        ]}
      >
        {transaction.type === 'income' ? '+' : '-'}
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
  headerRight: {
    padding: spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['5xl'],
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
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs,
  },
  summaryLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  summaryAmount: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
  },
  incomeAmount: {
    color: colors.semantic.income,
  },
  expenseAmount: {
    color: colors.semantic.expense,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border.light,
    marginHorizontal: spacing.lg,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.base,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  balanceLabel: {
    fontSize: typography.fontSize.md,
    color: colors.text.secondary,
  },
  balanceAmount: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  filterChipActive: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  filterChipActiveSecondary: {
    backgroundColor: colors.secondary.main,
    borderColor: colors.secondary.main,
  },
  filterChipText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
  },
  filterChipTextActive: {
    color: colors.text.inverse,
  },
  transactionSection: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.base,
    ...shadows.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  sectionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
  },
  seeAllText: {
    fontSize: typography.fontSize.md,
    color: colors.primary.main,
    fontWeight: typography.fontWeight.medium,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  transactionIcon: {
    width: 44,
    height: 44,
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
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary.main,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
});
