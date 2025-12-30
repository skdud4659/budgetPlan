import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
} from "../styles";
import type { Transaction, Category } from "../types";

interface CategoryTransactionSheetProps {
  visible: boolean;
  category: Category | null;
  transactions: Transaction[];
  onClose: () => void;
}

export default function CategoryTransactionSheet({
  visible,
  category,
  transactions,
  onClose,
}: CategoryTransactionSheetProps) {
  const formatCurrency = (amount: number) => {
    return Math.abs(amount).toLocaleString("ko-KR") + "원";
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);

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
            <View style={styles.headerCenter}>
              <View
                style={[
                  styles.categoryIconSmall,
                  { backgroundColor: (category?.color || colors.text.tertiary) + "20" },
                ]}
              >
                <Ionicons
                  name={(category?.iconName as keyof typeof Ionicons.glyphMap) || "help-outline"}
                  size={16}
                  color={category?.color || colors.text.tertiary}
                />
              </View>
              <Text style={styles.headerTitle}>
                {category?.name || "미분류"}
              </Text>
            </View>
            <View style={styles.headerRight} />
          </View>

          {/* Summary */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>총 지출</Text>
              <Text style={styles.summaryAmount}>
                -{formatCurrency(totalAmount)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>거래 건수</Text>
              <Text style={styles.summaryCount}>{transactions.length}건</Text>
            </View>
          </View>

          {/* Transaction List */}
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.sectionTitle}>거래 내역</Text>
            {transactions.length === 0 ? (
              <View style={styles.emptySection}>
                <Text style={styles.emptyText}>거래 내역이 없습니다</Text>
              </View>
            ) : (
              <View style={styles.listCard}>
                {transactions.map((transaction, index) => (
                  <View
                    key={transaction.id}
                    style={[
                      styles.listItem,
                      index < transactions.length - 1 && styles.listItemBorder,
                    ]}
                  >
                    <View style={styles.listItemContent}>
                      <View style={styles.listItemTitleRow}>
                        <Text style={styles.listItemTitle} numberOfLines={1}>
                          {transaction.title}
                        </Text>
                        {transaction.isInstallment &&
                          transaction.currentTerm &&
                          transaction.totalTerm && (
                            <View style={styles.installmentBadge}>
                              <Text style={styles.installmentBadgeText}>
                                {transaction.currentTerm}/{transaction.totalTerm}
                              </Text>
                            </View>
                          )}
                      </View>
                      <Text style={styles.listItemSubtitle}>
                        {formatDate(transaction.date)}
                        {transaction.asset && ` · ${transaction.asset.name}`}
                      </Text>
                    </View>
                    <Text style={styles.listItemAmount}>
                      -{formatCurrency(transaction.amount)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
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
    maxHeight: "85%",
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
    width: 40,
  },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  categoryIconSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
  },
  headerRight: {
    width: 40,
  },
  summaryCard: {
    backgroundColor: colors.background.secondary,
    margin: spacing.lg,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  },
  summaryAmount: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.semantic.expense,
  },
  summaryCount: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  scrollView: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing["3xl"],
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
    marginBottom: spacing["3xl"],
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
    marginBottom: spacing["3xl"],
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  },
});
