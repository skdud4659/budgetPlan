import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../src/styles';
import { transactionService } from '../src/services/transactionService';
import { useSettings } from '../src/contexts/SettingsContext';
import type { Transaction, Category } from '../src/types';

type StatType = 'expense' | 'income';

interface CategoryStat {
  category: Category | null;
  amount: number;
  count: number;
  percentage: number;
}

export default function StatisticsScreen() {
  const { monthStartDay } = useSettings();
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [statType, setStatType] = useState<StatType>('expense');
  const [isLoading, setIsLoading] = useState(true);
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const year = selectedMonth.getFullYear();
      const month = selectedMonth.getMonth() + 1;

      const transactions = await transactionService.getTransactionsWithInstallmentsByStartDay(
        year,
        month,
        monthStartDay || 1
      );

      calculateStats(transactions, statType);
    } catch (error) {
      console.error('Failed to load statistics:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth, monthStartDay, statType]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const calculateStats = (transactions: Transaction[], type: StatType) => {
    // 해당 타입의 거래만 필터링
    const filteredTransactions = transactions.filter(t => t.type === type);

    // 카테고리별 합계 계산
    const categoryMap = new Map<string | null, { category: Category | null; amount: number; count: number }>();

    filteredTransactions.forEach(t => {
      // 할부인 경우 월 납입금으로 계산
      const amount = t.isInstallment && t.totalTerm && t.totalTerm > 0
        ? Math.round(t.amount / t.totalTerm)
        : t.amount;

      const key = t.categoryId || 'uncategorized';
      const existing = categoryMap.get(key);

      if (existing) {
        existing.amount += amount;
        existing.count += 1;
      } else {
        categoryMap.set(key, {
          category: t.category || null,
          amount,
          count: 1,
        });
      }
    });

    // 총액 계산
    const total = Array.from(categoryMap.values()).reduce((sum, item) => sum + item.amount, 0);
    setTotalAmount(total);

    // 비율 계산 및 정렬
    const stats: CategoryStat[] = Array.from(categoryMap.values())
      .map(item => ({
        ...item,
        percentage: total > 0 ? (item.amount / total) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    setCategoryStats(stats);
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
    return amount.toLocaleString('ko-KR') + '원';
  };

  // 간단한 도넛 차트 렌더링 (SVG 없이 구현)
  const renderDonutChart = () => {
    if (categoryStats.length === 0) {
      return (
        <View style={styles.emptyChart}>
          <Text style={styles.emptyChartText}>데이터 없음</Text>
        </View>
      );
    }

    // 최대 6개 카테고리만 표시하고 나머지는 '기타'로 묶기
    let displayStats = categoryStats;
    if (categoryStats.length > 6) {
      const topStats = categoryStats.slice(0, 5);
      const otherStats = categoryStats.slice(5);
      const otherAmount = otherStats.reduce((sum, s) => sum + s.amount, 0);
      const otherCount = otherStats.reduce((sum, s) => sum + s.count, 0);
      displayStats = [
        ...topStats,
        {
          category: null,
          amount: otherAmount,
          count: otherCount,
          percentage: totalAmount > 0 ? (otherAmount / totalAmount) * 100 : 0,
        },
      ];
    }

    return (
      <View style={styles.chartContainer}>
        {/* 도넛 차트 시각화 - 원형 바 표시 */}
        <View style={styles.donutContainer}>
          <View style={styles.donutChart}>
            {displayStats.map((stat, index) => {
              const startAngle = displayStats
                .slice(0, index)
                .reduce((sum, s) => sum + (s.percentage * 3.6), 0);
              const sweepAngle = stat.percentage * 3.6;
              const color = stat.category?.color || colors.text.tertiary;

              return (
                <View
                  key={stat.category?.id || 'other'}
                  style={[
                    styles.donutSegment,
                    {
                      transform: [{ rotate: `${startAngle}deg` }],
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.donutSegmentInner,
                      {
                        backgroundColor: color,
                        transform: [{ rotate: `${Math.min(sweepAngle, 180)}deg` }],
                      },
                    ]}
                  />
                </View>
              );
            })}
            <View style={styles.donutHole}>
              <Text style={styles.donutTotalLabel}>
                {statType === 'expense' ? '총 지출' : '총 수입'}
              </Text>
              <Text style={styles.donutTotalAmount}>
                {formatCurrency(totalAmount)}
              </Text>
            </View>
          </View>
        </View>

        {/* 범례 */}
        <View style={styles.legendContainer}>
          {displayStats.map((stat, index) => (
            <View key={stat.category?.id || `other-${index}`} style={styles.legendItem}>
              <View
                style={[
                  styles.legendColor,
                  { backgroundColor: stat.category?.color || colors.text.tertiary },
                ]}
              />
              <Text style={styles.legendText} numberOfLines={1}>
                {stat.category?.name || '미분류'}
              </Text>
              <Text style={styles.legendPercentage}>
                {stat.percentage.toFixed(1)}%
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>카테고리 통계</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Month Navigator */}
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={handlePrevMonth} style={styles.monthNavButton}>
          <Ionicons name="chevron-back" size={24} color={colors.text.secondary} />
        </TouchableOpacity>
        <Text style={styles.monthNavText}>{formatMonthYear(selectedMonth)}</Text>
        <TouchableOpacity onPress={handleNextMonth} style={styles.monthNavButton}>
          <Ionicons name="chevron-forward" size={24} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>

      {/* Type Toggle */}
      <View style={styles.typeToggle}>
        <TouchableOpacity
          style={[styles.typeButton, statType === 'expense' && styles.typeButtonActiveExpense]}
          onPress={() => setStatType('expense')}
        >
          <Text style={[styles.typeButtonText, statType === 'expense' && styles.typeButtonTextActive]}>
            지출
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeButton, statType === 'income' && styles.typeButtonActiveIncome]}
          onPress={() => setStatType('income')}
        >
          <Text style={[styles.typeButtonText, statType === 'income' && styles.typeButtonTextActive]}>
            수입
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Chart */}
          {renderDonutChart()}

          {/* Category List */}
          <View style={styles.categoryList}>
            <Text style={styles.sectionTitle}>카테고리별 상세</Text>
            {categoryStats.length === 0 ? (
              <View style={styles.emptyList}>
                <Ionicons
                  name={statType === 'expense' ? 'cart-outline' : 'cash-outline'}
                  size={48}
                  color={colors.text.tertiary}
                />
                <Text style={styles.emptyListText}>
                  {statType === 'expense' ? '지출 내역이 없습니다' : '수입 내역이 없습니다'}
                </Text>
              </View>
            ) : (
              <View style={styles.listCard}>
                {categoryStats.map((stat, index) => (
                  <View
                    key={stat.category?.id || `uncategorized-${index}`}
                    style={[styles.listItem, index < categoryStats.length - 1 && styles.listItemBorder]}
                  >
                    <View style={styles.listItemLeft}>
                      <View
                        style={[
                          styles.categoryIcon,
                          { backgroundColor: (stat.category?.color || colors.text.tertiary) + '20' },
                        ]}
                      >
                        <Ionicons
                          name={(stat.category?.iconName as keyof typeof Ionicons.glyphMap) || 'help-outline'}
                          size={18}
                          color={stat.category?.color || colors.text.tertiary}
                        />
                      </View>
                      <View style={styles.listItemInfo}>
                        <Text style={styles.listItemName}>
                          {stat.category?.name || '미분류'}
                        </Text>
                        <Text style={styles.listItemCount}>{stat.count}건</Text>
                      </View>
                    </View>
                    <View style={styles.listItemRight}>
                      <Text
                        style={[
                          styles.listItemAmount,
                          statType === 'expense' ? styles.expenseText : styles.incomeText,
                        ]}
                      >
                        {statType === 'expense' ? '-' : '+'}
                        {formatCurrency(stat.amount)}
                      </Text>
                      <Text style={styles.listItemPercentage}>{stat.percentage.toFixed(1)}%</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
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
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    backgroundColor: colors.background.secondary,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
  },
  headerRight: {
    width: 40,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    backgroundColor: colors.background.secondary,
  },
  monthNavButton: {
    padding: spacing.sm,
  },
  monthNavText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
    minWidth: 120,
    textAlign: 'center',
  },
  typeToggle: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.base,
    padding: spacing.xs,
  },
  typeButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  typeButtonActiveExpense: {
    backgroundColor: colors.semantic.expense,
  },
  typeButtonActiveIncome: {
    backgroundColor: colors.semantic.income,
  },
  typeButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
  },
  typeButtonTextActive: {
    color: colors.text.inverse,
  },
  loadingContainer: {
    flex: 1,
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
  chartContainer: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  donutContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  donutChart: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  donutSegment: {
    position: 'absolute',
    width: 200,
    height: 200,
  },
  donutSegmentInner: {
    width: 100,
    height: 200,
    borderTopRightRadius: 100,
    borderBottomRightRadius: 100,
    position: 'absolute',
    left: 100,
    transformOrigin: 'left center',
  },
  donutHole: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  donutTotalLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    marginBottom: spacing.xs,
  },
  donutTotalAmount: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  emptyChart: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  emptyChartText: {
    fontSize: typography.fontSize.base,
    color: colors.text.tertiary,
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.tertiary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  legendColor: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.xs,
  },
  legendText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    maxWidth: 60,
  },
  legendPercentage: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
    marginLeft: spacing.xs,
  },
  categoryList: {
    marginTop: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
    paddingLeft: spacing.xs,
  },
  listCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
  },
  listItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  listItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  listItemInfo: {
    flex: 1,
  },
  listItemName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  listItemCount: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  listItemRight: {
    alignItems: 'flex-end',
  },
  listItemAmount: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
  },
  expenseText: {
    color: colors.semantic.expense,
  },
  incomeText: {
    color: colors.semantic.income,
  },
  listItemPercentage: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  emptyList: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing['2xl'],
    alignItems: 'center',
    ...shadows.sm,
  },
  emptyListText: {
    fontSize: typography.fontSize.base,
    color: colors.text.tertiary,
    marginTop: spacing.md,
  },
});
