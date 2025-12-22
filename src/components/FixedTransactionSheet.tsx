import React, { useState, useEffect } from "react";
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
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
} from "../styles";
import type { Transaction, FixedItem } from "../types";
import { transactionService } from "../services/transactionService";
import { fixedItemService } from "../services/fixedItemService";
import ConfirmModal from "./ConfirmModal";

interface FixedTransactionSheetProps {
  visible: boolean;
  transaction: Transaction | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function FixedTransactionSheet({
  visible,
  transaction,
  onClose,
  onSuccess,
}: FixedTransactionSheetProps) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [linkedFixedItem, setLinkedFixedItem] = useState<FixedItem | null>(null);

  useEffect(() => {
    if (visible && transaction) {
      setAmount(transaction.amount.toString());
      setNote(transaction.note || "");
      loadLinkedFixedItem();
    }
  }, [visible, transaction]);

  const loadLinkedFixedItem = async () => {
    if (!transaction) return;

    try {
      const fixedItems = await fixedItemService.getFixedItems();
      const matched = fixedItems.find(
        (item) => item.name === transaction.title && item.assetId === transaction.assetId
      );
      setLinkedFixedItem(matched || null);
    } catch (error) {
      console.error("Failed to load fixed item:", error);
    }
  };

  const handleClose = () => {
    setAmount("");
    setNote("");
    setLinkedFixedItem(null);
    setShowDeleteConfirm(false);
    onClose();
  };

  const handleSubmit = async () => {
    if (!transaction || isLoading) return;

    const amountNum = parseFloat(amount.replace(/,/g, ""));
    if (isNaN(amountNum) || amountNum <= 0) return;

    setIsLoading(true);
    try {
      await transactionService.updateTransaction(transaction.id, {
        amount: amountNum,
        note: note || null,
      });
      onSuccess?.();
      handleClose();
    } catch (error) {
      console.error("Failed to update transaction:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!transaction) return;

    setShowDeleteConfirm(false);
    handleClose();

    try {
      await transactionService.deleteTransaction(transaction.id);
      onSuccess?.();
    } catch (error) {
      console.error("Failed to delete transaction:", error);
    }
  };

  const handleGoToFixedSettings = () => {
    handleClose();
    router.push("/(tabs)/fixed");
  };

  const formatAmount = (value: string) => {
    const num = value.replace(/[^0-9]/g, "");
    if (!num) return "";
    return parseInt(num, 10).toLocaleString("ko-KR");
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
  };

  if (!transaction) return null;

  const canSubmit = amount && parseFloat(amount.replace(/,/g, "")) > 0;

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent
        onRequestClose={handleClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={isLoading ? undefined : handleClose}
            disabled={isLoading}
          />

          <View style={styles.sheet}>
            {/* Handle */}
            <View style={styles.handleContainer}>
              <View style={styles.handle} />
            </View>

            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                onPress={handleClose}
                style={styles.closeButton}
                disabled={isLoading}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color={isLoading ? colors.text.tertiary : colors.text.primary}
                />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>고정 지출 내역</Text>
              <View style={styles.headerActions}>
                <TouchableOpacity
                  onPress={() => setShowDeleteConfirm(true)}
                  style={styles.headerIconButton}
                  disabled={isLoading}
                >
                  <Ionicons
                    name="trash-outline"
                    size={22}
                    color={isLoading ? colors.text.tertiary : colors.semantic.expense}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSubmit}
                  style={[
                    styles.headerIconButton,
                    (!canSubmit || isLoading) && styles.headerIconButtonDisabled,
                  ]}
                  disabled={!canSubmit || isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color={colors.primary.main} />
                  ) : (
                    <Ionicons
                      name="checkmark"
                      size={24}
                      color={canSubmit ? colors.primary.main : colors.text.tertiary}
                    />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView
              style={styles.scrollView}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* 안내 배너 */}
              <View style={styles.infoBanner}>
                <Ionicons name="information-circle" size={18} color={colors.primary.main} />
                <Text style={styles.infoBannerText}>
                  이 거래만 수정됩니다. 고정 지출 설정은 변경되지 않습니다.
                </Text>
              </View>

              {/* 제목 (읽기 전용) */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>이름</Text>
                <View style={styles.readOnlyField}>
                  <Text style={styles.readOnlyText}>{transaction.title}</Text>
                  <Ionicons name="lock-closed" size={14} color={colors.text.tertiary} />
                </View>
              </View>

              {/* 금액 (수정 가능) */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>금액</Text>
                <View style={styles.amountRow}>
                  <TextInput
                    style={[styles.textInput, styles.amountInput]}
                    placeholder="0"
                    placeholderTextColor={colors.text.tertiary}
                    value={formatAmount(amount)}
                    onChangeText={(text) =>
                      setAmount(text.replace(/[^0-9]/g, ""))
                    }
                    keyboardType="numeric"
                  />
                  <Text style={styles.currencyLabel}>원</Text>
                </View>
                {linkedFixedItem && transaction.amount !== linkedFixedItem.amount && (
                  <Text style={styles.amountHint}>
                    기본 설정 금액: {linkedFixedItem.amount.toLocaleString("ko-KR")}원
                  </Text>
                )}
              </View>

              {/* 날짜 (읽기 전용) */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>날짜</Text>
                <View style={styles.readOnlyField}>
                  <Text style={styles.readOnlyText}>{formatDate(transaction.date)}</Text>
                  <Ionicons name="lock-closed" size={14} color={colors.text.tertiary} />
                </View>
              </View>

              {/* 카테고리 (읽기 전용) */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>카테고리</Text>
                <View style={styles.readOnlyField}>
                  <View style={styles.categoryRow}>
                    {transaction.category && (
                      <View
                        style={[
                          styles.categoryIcon,
                          { backgroundColor: transaction.category.color + "30" },
                        ]}
                      >
                        <Ionicons
                          name={transaction.category.iconName as keyof typeof Ionicons.glyphMap}
                          size={16}
                          color={transaction.category.color}
                        />
                      </View>
                    )}
                    <Text style={styles.readOnlyText}>
                      {transaction.category?.name || "미분류"}
                    </Text>
                  </View>
                  <Ionicons name="lock-closed" size={14} color={colors.text.tertiary} />
                </View>
              </View>

              {/* 자산 (읽기 전용) */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>결제 자산</Text>
                <View style={styles.readOnlyField}>
                  <Text style={styles.readOnlyText}>
                    {transaction.asset?.name || "미지정"}
                  </Text>
                  <Ionicons name="lock-closed" size={14} color={colors.text.tertiary} />
                </View>
              </View>

              {/* 메모 (수정 가능) */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>메모</Text>
                <TextInput
                  style={[styles.textInput, styles.noteInput]}
                  placeholder="메모를 입력하세요 (선택)"
                  placeholderTextColor={colors.text.tertiary}
                  value={note}
                  onChangeText={setNote}
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* 고정 지출 설정으로 이동 */}
              <TouchableOpacity
                style={styles.settingsLink}
                onPress={handleGoToFixedSettings}
              >
                <View style={styles.settingsLinkLeft}>
                  <Ionicons name="settings-outline" size={20} color={colors.primary.main} />
                  <Text style={styles.settingsLinkText}>고정 지출 설정 변경</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 삭제 확인 모달 */}
      <ConfirmModal
        visible={showDeleteConfirm}
        title="거래 삭제"
        message={`이 거래만 삭제됩니다.\n고정 지출 설정은 유지되며, 다음 달에 다시 생성됩니다.`}
        confirmText="삭제"
        cancelText="취소"
        isDestructive={true}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
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
    backgroundColor: colors.background.secondary,
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
  headerIconButtonDisabled: {
    opacity: 0.5,
  },
  scrollView: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing["3xl"],
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary.light + "20",
    borderRadius: borderRadius.base,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  infoBannerText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.primary.main,
    lineHeight: 18,
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
  readOnlyField: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.base,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    opacity: 0.7,
  },
  readOnlyText: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  categoryIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  amountInput: {
    flex: 1,
    textAlign: "right",
  },
  currencyLabel: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
  },
  amountHint: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
  noteInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  settingsLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.base,
    padding: spacing.base,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  settingsLinkLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  settingsLinkText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.primary.main,
  },
});
