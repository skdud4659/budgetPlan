import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../../src/styles';
import type { FixedItemType, BudgetType } from '../../src/types';

// 임시 데이터 타입
interface MockFixedItem {
  id: string;
  name: string;
  type: FixedItemType;
  amount: number;
  day: number;
  category: string;
  categoryColor: string;
  budgetType: BudgetType;
  totalTerm?: number;
  paidTerm?: number;
  isPaidThisMonth: boolean;
}

// 임시 데이터
const mockFixedItems: MockFixedItem[] = [
  {
    id: '1',
    name: '넷플릭스',
    type: 'fixed',
    amount: 17000,
    day: 15,
    category: '여가',
    categoryColor: '#B8B5E4',
    budgetType: 'personal',
    isPaidThisMonth: true,
  },
  {
    id: '2',
    name: '핸드폰 요금',
    type: 'fixed',
    amount: 55000,
    day: 25,
    category: '고정지출',
    categoryColor: '#90CAF9',
    budgetType: 'personal',
    isPaidThisMonth: false,
  },
  {
    id: '3',
    name: '월세',
    type: 'fixed',
    amount: 500000,
    day: 1,
    category: '주거',
    categoryColor: '#FFB5A7',
    budgetType: 'joint',
    isPaidThisMonth: true,
  },
  {
    id: '4',
    name: '노트북 할부',
    type: 'installment',
    amount: 125000,
    day: 10,
    category: '쇼핑',
    categoryColor: '#CE93D8',
    budgetType: 'personal',
    totalTerm: 12,
    paidTerm: 5,
    isPaidThisMonth: true,
  },
  {
    id: '5',
    name: '에어컨 할부',
    type: 'installment',
    amount: 83000,
    day: 20,
    category: '주거',
    categoryColor: '#FFB5A7',
    budgetType: 'joint',
    totalTerm: 24,
    paidTerm: 8,
    isPaidThisMonth: false,
  },
];

export default function ScheduledScreen() {
  const [selectedType, setSelectedType] = useState<'all' | FixedItemType>('all');

  const filteredItems =
    selectedType === 'all'
      ? mockFixedItems
      : mockFixedItems.filter((item) => item.type === selectedType);

  const fixedItems = filteredItems.filter((item) => item.type === 'fixed');
  const installmentItems = filteredItems.filter((item) => item.type === 'installment');

  const totalFixed = fixedItems.reduce((sum, item) => sum + item.amount, 0);
  const totalInstallment = installmentItems.reduce((sum, item) => sum + item.amount, 0);

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('ko-KR') + '원';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>정기지출</Text>
        <TouchableOpacity style={styles.addButton}>
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
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>고정비</Text>
              <Text style={styles.summaryAmount}>{formatCurrency(totalFixed)}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>할부</Text>
              <Text style={styles.summaryAmount}>{formatCurrency(totalInstallment)}</Text>
            </View>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>이번 달 총 정기지출</Text>
            <Text style={styles.totalAmount}>
              {formatCurrency(totalFixed + totalInstallment)}
            </Text>
          </View>
        </View>

        {/* Filter */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, selectedType === 'all' && styles.filterChipActive]}
            onPress={() => setSelectedType('all')}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedType === 'all' && styles.filterChipTextActive,
              ]}
            >
              전체
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, selectedType === 'fixed' && styles.filterChipActive]}
            onPress={() => setSelectedType('fixed')}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedType === 'fixed' && styles.filterChipTextActive,
              ]}
            >
              고정비
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedType === 'installment' && styles.filterChipActive,
            ]}
            onPress={() => setSelectedType('installment')}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedType === 'installment' && styles.filterChipTextActive,
              ]}
            >
              할부
            </Text>
          </TouchableOpacity>
        </View>

        {/* Fixed Items Section */}
        {(selectedType === 'all' || selectedType === 'fixed') && fixedItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>고정비</Text>
            {fixedItems.map((item) => (
              <FixedItemCard key={item.id} item={item} />
            ))}
          </View>
        )}

        {/* Installment Items Section */}
        {(selectedType === 'all' || selectedType === 'installment') &&
          installmentItems.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>할부</Text>
              {installmentItems.map((item) => (
                <InstallmentItemCard key={item.id} item={item} />
              ))}
            </View>
          )}
      </ScrollView>
    </SafeAreaView>
  );
}

function FixedItemCard({ item }: { item: MockFixedItem }) {
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('ko-KR') + '원';
  };

  return (
    <TouchableOpacity style={styles.itemCard} activeOpacity={0.7}>
      <View style={styles.itemRow}>
        <View style={styles.itemLeft}>
          <View style={styles.itemHeader}>
            <Text style={styles.itemName}>{item.name}</Text>
            {item.budgetType === 'joint' && (
              <View style={styles.jointBadge}>
                <Text style={styles.jointBadgeText}>공동</Text>
              </View>
            )}
          </View>
          <Text style={styles.itemDate}>매월 {item.day}일</Text>
        </View>
        <View style={styles.itemRight}>
          <Text style={styles.itemAmount}>{formatCurrency(item.amount)}</Text>
          <TouchableOpacity
            style={[
              styles.checkButton,
              item.isPaidThisMonth && styles.checkButtonChecked,
            ]}
          >
            <Ionicons
              name={item.isPaidThisMonth ? 'checkmark' : 'checkmark'}
              size={16}
              color={item.isPaidThisMonth ? colors.text.inverse : colors.text.tertiary}
            />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function InstallmentItemCard({ item }: { item: MockFixedItem }) {
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('ko-KR') + '원';
  };

  const progress = item.totalTerm ? (item.paidTerm! / item.totalTerm) * 100 : 0;
  const remainingTerm = item.totalTerm! - item.paidTerm!;

  return (
    <TouchableOpacity style={styles.itemCard} activeOpacity={0.7}>
      <View style={styles.itemRow}>
        <View style={styles.itemLeft}>
          <View style={styles.itemHeader}>
            <Text style={styles.itemName}>{item.name}</Text>
            {item.budgetType === 'joint' && (
              <View style={styles.jointBadge}>
                <Text style={styles.jointBadgeText}>공동</Text>
              </View>
            )}
          </View>
          <Text style={styles.itemDate}>매월 {item.day}일</Text>
        </View>
        <View style={styles.itemRight}>
          <Text style={styles.itemAmount}>{formatCurrency(item.amount)}</Text>
          <TouchableOpacity
            style={[
              styles.checkButton,
              item.isPaidThisMonth && styles.checkButtonChecked,
            ]}
          >
            <Ionicons
              name="checkmark"
              size={16}
              color={item.isPaidThisMonth ? colors.text.inverse : colors.text.tertiary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressText}>
          {item.paidTerm}/{item.totalTerm}회 ({remainingTerm}개월 남음)
        </Text>
      </View>
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
  headerTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  addButton: {
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
  summaryCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  summaryAmount: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border.light,
    marginHorizontal: spacing.base,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.base,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  totalLabel: {
    fontSize: typography.fontSize.md,
    color: colors.text.secondary,
  },
  totalAmount: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary.main,
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
  filterChipText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
  },
  filterChipTextActive: {
    color: colors.text.inverse,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  itemCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.base,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemLeft: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
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
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemAmount: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
    marginRight: spacing.md,
  },
  checkButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.border.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkButtonChecked: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  progressContainer: {
    marginTop: spacing.md,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.background.tertiary,
    borderRadius: 3,
    marginBottom: spacing.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent.main,
    borderRadius: 3,
  },
  progressText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    textAlign: 'right',
  },
});
