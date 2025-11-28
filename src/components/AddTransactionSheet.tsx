import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../styles';
import type { TransactionType, BudgetType } from '../types';

interface AddTransactionSheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmit?: (data: TransactionFormData) => void;
}

interface TransactionFormData {
  title: string;
  amount: string;
  type: TransactionType;
  budgetType: BudgetType;
  categoryId: string | null;
  assetId: string | null;
  note: string;
}

// 임시 카테고리 데이터
const mockCategories = {
  expense: [
    { id: '1', name: '식비', icon: 'restaurant', color: '#FF8A80' },
    { id: '2', name: '교통', icon: 'subway', color: '#90CAF9' },
    { id: '3', name: '쇼핑', icon: 'cart', color: '#CE93D8' },
    { id: '4', name: '여가', icon: 'game-controller', color: '#B8B5E4' },
    { id: '5', name: '의료', icon: 'medical', color: '#FFB5A7' },
    { id: '6', name: '주거', icon: 'home', color: '#FFB74D' },
    { id: '7', name: '기타', icon: 'ellipsis-horizontal', color: '#A0AEC0' },
  ],
  income: [
    { id: '10', name: '급여', icon: 'cash', color: '#4CAF93' },
    { id: '11', name: '보너스', icon: 'gift', color: '#FFD54F' },
    { id: '12', name: '투자수익', icon: 'trending-up', color: '#90CAF9' },
    { id: '13', name: '기타수입', icon: 'ellipsis-horizontal', color: '#A0AEC0' },
  ],
};

const mockAssets = [
  { id: '1', name: '국민은행', icon: 'business' },
  { id: '2', name: '신한카드', icon: 'card' },
  { id: '3', name: '현금', icon: 'cash' },
  { id: '4', name: '토스', icon: 'phone-portrait' },
];

export default function AddTransactionSheet({
  visible,
  onClose,
  onSubmit,
}: AddTransactionSheetProps) {
  const [formData, setFormData] = useState<TransactionFormData>({
    title: '',
    amount: '',
    type: 'expense',
    budgetType: 'personal',
    categoryId: null,
    assetId: null,
    note: '',
  });

  const categories =
    formData.type === 'expense' ? mockCategories.expense : mockCategories.income;

  const handleSubmit = () => {
    if (!formData.title || !formData.amount) return;
    onSubmit?.(formData);
    handleClose();
  };

  const handleClose = () => {
    setFormData({
      title: '',
      amount: '',
      type: 'expense',
      budgetType: 'personal',
      categoryId: null,
      assetId: null,
      note: '',
    });
    onClose();
  };

  const formatAmount = (value: string) => {
    const num = value.replace(/[^0-9]/g, '');
    if (!num) return '';
    return parseInt(num, 10).toLocaleString('ko-KR');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />

        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>거래 추가</Text>
            <TouchableOpacity
              onPress={handleSubmit}
              style={[
                styles.submitButton,
                (!formData.title || !formData.amount) && styles.submitButtonDisabled,
              ]}
              disabled={!formData.title || !formData.amount}
            >
              <Text
                style={[
                  styles.submitButtonText,
                  (!formData.title || !formData.amount) &&
                    styles.submitButtonTextDisabled,
                ]}
              >
                저장
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Transaction Type */}
            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  formData.type === 'expense' && styles.typeButtonActiveExpense,
                ]}
                onPress={() => setFormData({ ...formData, type: 'expense', categoryId: null })}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    formData.type === 'expense' && styles.typeButtonTextActive,
                  ]}
                >
                  지출
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  formData.type === 'income' && styles.typeButtonActiveIncome,
                ]}
                onPress={() => setFormData({ ...formData, type: 'income', categoryId: null })}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    formData.type === 'income' && styles.typeButtonTextActive,
                  ]}
                >
                  수입
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  formData.type === 'transfer' && styles.typeButtonActiveTransfer,
                ]}
                onPress={() =>
                  setFormData({ ...formData, type: 'transfer', categoryId: null })
                }
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    formData.type === 'transfer' && styles.typeButtonTextActive,
                  ]}
                >
                  이체
                </Text>
              </TouchableOpacity>
            </View>

            {/* Amount Input */}
            <View style={styles.amountContainer}>
              <Text style={styles.amountPrefix}>
                {formData.type === 'income' ? '+' : formData.type === 'expense' ? '-' : ''}
              </Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0"
                placeholderTextColor={colors.text.tertiary}
                value={formatAmount(formData.amount)}
                onChangeText={(text) =>
                  setFormData({ ...formData, amount: text.replace(/[^0-9]/g, '') })
                }
                keyboardType="numeric"
              />
              <Text style={styles.amountSuffix}>원</Text>
            </View>

            {/* Title Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>내용</Text>
              <TextInput
                style={styles.textInput}
                placeholder="거래 내용을 입력하세요"
                placeholderTextColor={colors.text.tertiary}
                value={formData.title}
                onChangeText={(text) => setFormData({ ...formData, title: text })}
              />
            </View>

            {/* Budget Type (Only for expense/income) */}
            {formData.type !== 'transfer' && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>예산 구분</Text>
                <View style={styles.budgetTypeSelector}>
                  <TouchableOpacity
                    style={[
                      styles.budgetTypeButton,
                      formData.budgetType === 'personal' && styles.budgetTypeButtonActive,
                    ]}
                    onPress={() => setFormData({ ...formData, budgetType: 'personal' })}
                  >
                    <Text
                      style={[
                        styles.budgetTypeButtonText,
                        formData.budgetType === 'personal' &&
                          styles.budgetTypeButtonTextActive,
                      ]}
                    >
                      내꺼
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.budgetTypeButton,
                      formData.budgetType === 'joint' && styles.budgetTypeButtonActiveJoint,
                    ]}
                    onPress={() => setFormData({ ...formData, budgetType: 'joint' })}
                  >
                    <Text
                      style={[
                        styles.budgetTypeButtonText,
                        formData.budgetType === 'joint' &&
                          styles.budgetTypeButtonTextActive,
                      ]}
                    >
                      공동
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Category Selection */}
            {formData.type !== 'transfer' && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>카테고리</Text>
                <View style={styles.categoryGrid}>
                  {categories.map((category) => (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.categoryItem,
                        formData.categoryId === category.id && styles.categoryItemActive,
                      ]}
                      onPress={() =>
                        setFormData({ ...formData, categoryId: category.id })
                      }
                    >
                      <View
                        style={[
                          styles.categoryIcon,
                          { backgroundColor: category.color + '30' },
                          formData.categoryId === category.id && {
                            backgroundColor: category.color,
                          },
                        ]}
                      >
                        <Ionicons
                          name={category.icon as keyof typeof Ionicons.glyphMap}
                          size={18}
                          color={
                            formData.categoryId === category.id
                              ? colors.text.inverse
                              : category.color
                          }
                        />
                      </View>
                      <Text
                        style={[
                          styles.categoryName,
                          formData.categoryId === category.id && styles.categoryNameActive,
                        ]}
                      >
                        {category.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Asset Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {formData.type === 'transfer' ? '출금 자산' : '자산'}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.assetScroll}
              >
                {mockAssets.map((asset) => (
                  <TouchableOpacity
                    key={asset.id}
                    style={[
                      styles.assetChip,
                      formData.assetId === asset.id && styles.assetChipActive,
                    ]}
                    onPress={() => setFormData({ ...formData, assetId: asset.id })}
                  >
                    <Ionicons
                      name={asset.icon as keyof typeof Ionicons.glyphMap}
                      size={16}
                      color={
                        formData.assetId === asset.id
                          ? colors.text.inverse
                          : colors.text.secondary
                      }
                    />
                    <Text
                      style={[
                        styles.assetChipText,
                        formData.assetId === asset.id && styles.assetChipTextActive,
                      ]}
                    >
                      {asset.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Note Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>메모</Text>
              <TextInput
                style={[styles.textInput, styles.noteInput]}
                placeholder="메모를 입력하세요 (선택)"
                placeholderTextColor={colors.text.tertiary}
                value={formData.note}
                onChangeText={(text) => setFormData({ ...formData, note: text })}
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    backgroundColor: colors.background.secondary,
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    maxHeight: '90%',
    ...shadows.xl,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border.medium,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  submitButton: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.base,
    backgroundColor: colors.primary.main,
  },
  submitButtonDisabled: {
    backgroundColor: colors.border.light,
  },
  submitButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.inverse,
  },
  submitButtonTextDisabled: {
    color: colors.text.tertiary,
  },
  scrollView: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  typeSelector: {
    flexDirection: 'row',
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.base,
    padding: spacing.xs,
    marginBottom: spacing.lg,
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
  typeButtonActiveTransfer: {
    backgroundColor: colors.semantic.transfer,
  },
  typeButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
  },
  typeButtonTextActive: {
    color: colors.text.inverse,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  amountPrefix: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.secondary,
    marginRight: spacing.xs,
  },
  amountInput: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    minWidth: 100,
    textAlign: 'center',
  },
  amountSuffix: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
    marginLeft: spacing.xs,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  textInput: {
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.base,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
  },
  noteInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  budgetTypeSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  budgetTypeButton: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: borderRadius.base,
    backgroundColor: colors.background.tertiary,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  budgetTypeButtonActive: {
    backgroundColor: colors.primary.light + '30',
    borderColor: colors.primary.main,
  },
  budgetTypeButtonActiveJoint: {
    backgroundColor: colors.secondary.light + '50',
    borderColor: colors.secondary.main,
  },
  budgetTypeButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
  },
  budgetTypeButtonTextActive: {
    color: colors.text.primary,
    fontWeight: typography.fontWeight.semiBold,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryItem: {
    alignItems: 'center',
    width: 70,
    paddingVertical: spacing.sm,
  },
  categoryItemActive: {},
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  categoryName: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  categoryNameActive: {
    color: colors.text.primary,
    fontWeight: typography.fontWeight.medium,
  },
  assetScroll: {
    marginHorizontal: -spacing.xs,
  },
  assetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.tertiary,
    marginHorizontal: spacing.xs,
    gap: spacing.xs,
  },
  assetChipActive: {
    backgroundColor: colors.primary.main,
  },
  assetChipText: {
    fontSize: typography.fontSize.md,
    color: colors.text.secondary,
  },
  assetChipTextActive: {
    color: colors.text.inverse,
    fontWeight: typography.fontWeight.medium,
  },
});
