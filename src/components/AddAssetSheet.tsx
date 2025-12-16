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
import {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  assetTypeConfig,
} from "../styles";
import type { AssetType, Asset } from "../types";
import ConfirmModal from "./ConfirmModal";

interface AddAssetSheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: AssetFormData) => Promise<void>;
  onDelete?: () => void; // 삭제 콜백
  editAsset?: Asset | null; // 수정 모드일 때
  onBalanceDifferenceTransaction?: (assetId: string, difference: number) => void; // 차액 거래 추가 콜백
}

interface AssetFormData {
  name: string;
  type: AssetType;
  balance: number;
  billingDate?: number;
  settlementDate?: number;
}

const assetTypes: { type: AssetType; label: string; icon: string }[] = [
  { type: "bank", label: "은행", icon: "business-outline" },
  { type: "card", label: "카드", icon: "card-outline" },
  { type: "cash", label: "현금", icon: "cash-outline" },
  { type: "savings", label: "저축", icon: "wallet-outline" },
  { type: "investment", label: "투자", icon: "trending-up-outline" },
  { type: "loan", label: "대출", icon: "document-text-outline" },
  { type: "other", label: "기타", icon: "ellipsis-horizontal" },
];

export default function AddAssetSheet({
  visible,
  onClose,
  onSubmit,
  onDelete,
  editAsset,
  onBalanceDifferenceTransaction,
}: AddAssetSheetProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<AssetType>("bank");
  const [balance, setBalance] = useState("");
  const [billingDate, setBillingDate] = useState("");
  const [settlementDate, setSettlementDate] = useState("");
  const [isNegative, setIsNegative] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showDifferenceModal, setShowDifferenceModal] = useState(false);
  const [pendingDifference, setPendingDifference] = useState<number>(0);

  const isEditMode = !!editAsset;

  useEffect(() => {
    if (editAsset) {
      setName(editAsset.name);
      setType(editAsset.type);
      // 수정 시 초기 잔액을 표시
      setBalance(Math.abs(editAsset.initialBalance).toString());
      setIsNegative(editAsset.initialBalance < 0);
      setBillingDate(editAsset.billingDate?.toString() || "");
      setSettlementDate(editAsset.settlementDate?.toString() || "");
    } else {
      resetForm();
    }
  }, [editAsset, visible]);

  const resetForm = () => {
    setName("");
    setType("bank");
    setBalance("");
    setBillingDate("");
    setSettlementDate("");
    setIsNegative(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    // 카드는 잔액 없이 제출 가능
    if (!name.trim() || isLoading) return;
    if (type !== "card" && !balance) return;

    const balanceNum = type === "card" ? 0 : parseFloat(balance.replace(/,/g, ""));
    const finalBalance = isNegative ? -balanceNum : balanceNum;

    // 수정 모드이고 초기 잔액이 변경된 경우
    if (isEditMode && editAsset && type !== "card") {
      const difference = finalBalance - editAsset.initialBalance;
      if (difference !== 0 && onBalanceDifferenceTransaction) {
        setPendingDifference(difference);
        setShowDifferenceModal(true);
        return;
      }
    }

    await submitAsset(finalBalance);
  };

  const submitAsset = async (finalBalance: number) => {
    setIsLoading(true);
    try {
      await onSubmit({
        name: name.trim(),
        type,
        balance: finalBalance,
        billingDate: billingDate ? parseInt(billingDate, 10) : undefined,
        settlementDate: settlementDate ? parseInt(settlementDate, 10) : undefined,
      });
      handleClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleDifferenceConfirm = async () => {
    const balanceNum = type === "card" ? 0 : parseFloat(balance.replace(/,/g, ""));
    const finalBalance = isNegative ? -balanceNum : balanceNum;

    setShowDifferenceModal(false);

    // 먼저 자산 수정
    await submitAsset(finalBalance);

    // 차액 거래 추가 화면으로 이동
    if (editAsset && onBalanceDifferenceTransaction) {
      onBalanceDifferenceTransaction(editAsset.id, pendingDifference);
    }
  };

  const handleDifferenceSkip = async () => {
    const balanceNum = type === "card" ? 0 : parseFloat(balance.replace(/,/g, ""));
    const finalBalance = isNegative ? -balanceNum : balanceNum;

    setShowDifferenceModal(false);
    await submitAsset(finalBalance);
  };

  const formatBalance = (value: string) => {
    const num = value.replace(/[^0-9]/g, "");
    if (!num) return "";
    return parseInt(num, 10).toLocaleString("ko-KR");
  };

  const canSubmit = name.trim() && (type === "card" || balance);

  return (
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
            <Text style={styles.headerTitle}>
              {isEditMode ? "자산 수정" : "자산 추가"}
            </Text>
            <View style={styles.headerActions}>
              {isEditMode && onDelete && (
                <TouchableOpacity
                  onPress={onDelete}
                  style={styles.headerIconButton}
                  disabled={isLoading}
                >
                  <Ionicons
                    name="trash-outline"
                    size={22}
                    color={colors.semantic.expense}
                  />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={handleSubmit}
                style={styles.headerIconButton}
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
            {/* Asset Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>자산명</Text>
              <TextInput
                style={styles.textInput}
                placeholder="예: 국민은행 입출금"
                placeholderTextColor={colors.text.tertiary}
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* Asset Type */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>자산 종류</Text>
              <View style={styles.typeGrid}>
                {assetTypes.map((item) => (
                  <TouchableOpacity
                    key={item.type}
                    style={[
                      styles.typeItem,
                      type === item.type && styles.typeItemActive,
                    ]}
                    onPress={() => {
                      setType(item.type);
                      // 카드나 대출은 기본적으로 마이너스
                      if (item.type === "card" || item.type === "loan") {
                        setIsNegative(true);
                      } else {
                        setIsNegative(false);
                      }
                    }}
                  >
                    <View
                      style={[
                        styles.typeIcon,
                        {
                          backgroundColor:
                            type === item.type
                              ? assetTypeConfig[item.type].color
                              : assetTypeConfig[item.type].color + "30",
                        },
                      ]}
                    >
                      <Ionicons
                        name={item.icon as keyof typeof Ionicons.glyphMap}
                        size={18}
                        color={
                          type === item.type
                            ? colors.text.inverse
                            : assetTypeConfig[item.type].color
                        }
                      />
                    </View>
                    <Text
                      style={[
                        styles.typeLabel,
                        type === item.type && styles.typeLabelActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Balance (카드 제외) */}
            {type !== "card" && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>잔액</Text>
                <View style={styles.balanceRow}>
                  <TouchableOpacity
                    style={[
                      styles.signButton,
                      !isNegative && styles.signButtonActive,
                    ]}
                    onPress={() => setIsNegative(false)}
                  >
                    <Text
                      style={[
                        styles.signButtonText,
                        !isNegative && styles.signButtonTextActive,
                      ]}
                    >
                      +
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.signButton,
                      isNegative && styles.signButtonNegative,
                    ]}
                    onPress={() => setIsNegative(true)}
                  >
                    <Text
                      style={[
                        styles.signButtonText,
                        isNegative && styles.signButtonTextActive,
                      ]}
                    >
                      -
                    </Text>
                  </TouchableOpacity>
                  <TextInput
                    style={[styles.textInput, styles.balanceInput]}
                    placeholder="0"
                    placeholderTextColor={colors.text.tertiary}
                    value={formatBalance(balance)}
                    onChangeText={(text) =>
                      setBalance(text.replace(/[^0-9]/g, ""))
                    }
                    keyboardType="numeric"
                  />
                  <Text style={styles.currencyLabel}>원</Text>
                </View>
                {type === "loan" && (
                  <Text style={styles.hintText}>
                    대출은 마이너스(-)로 입력하세요
                  </Text>
                )}
              </View>
            )}

            {/* Billing Date & Settlement Date (카드용) */}
            {type === "card" && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>결제일</Text>
                  <View style={styles.billingDateRow}>
                    <Text style={styles.billingDatePrefix}>매월</Text>
                    <TextInput
                      style={[styles.textInput, styles.billingDateInput]}
                      placeholder="15"
                      placeholderTextColor={colors.text.tertiary}
                      value={billingDate}
                      onChangeText={(text) => {
                        const num = text.replace(/[^0-9]/g, "");
                        if (parseInt(num, 10) <= 31 || num === "") {
                          setBillingDate(num);
                        }
                      }}
                      keyboardType="numeric"
                      maxLength={2}
                    />
                    <Text style={styles.billingDateSuffix}>일</Text>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>정산일</Text>
                  <View style={styles.billingDateRow}>
                    <Text style={styles.billingDatePrefix}>매월</Text>
                    <TextInput
                      style={[styles.textInput, styles.billingDateInput]}
                      placeholder="1"
                      placeholderTextColor={colors.text.tertiary}
                      value={settlementDate}
                      onChangeText={(text) => {
                        const num = text.replace(/[^0-9]/g, "");
                        if (parseInt(num, 10) <= 31 || num === "") {
                          setSettlementDate(num);
                        }
                      }}
                      keyboardType="numeric"
                      maxLength={2}
                    />
                    <Text style={styles.billingDateSuffix}>일</Text>
                  </View>
                  <Text style={styles.hintText}>
                    정산일부터 다음 정산일 전까지의 사용금액이 결제일에 청구됩니다
                  </Text>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      {/* 차액 거래 추가 확인 모달 */}
      <ConfirmModal
        visible={showDifferenceModal}
        title="잔액 변경 감지"
        message={`잔액이 ${Math.abs(pendingDifference).toLocaleString("ko-KR")}원 ${pendingDifference > 0 ? "증가" : "감소"}했습니다.\n\n이 차액을 거래 내역으로 추가하시겠습니까?`}
        confirmText="거래 추가"
        cancelText="건너뛰기"
        onConfirm={handleDifferenceConfirm}
        onCancel={handleDifferenceSkip}
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
  scrollView: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing["3xl"],
  },
  inputGroup: {
    marginBottom: spacing.xl,
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
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.sm,
  },
  typeItem: {
    alignItems: "center",
    width: 65,
    paddingVertical: spacing.sm,
  },
  typeItemActive: {},
  typeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  typeLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
  },
  typeLabelActive: {
    color: colors.text.primary,
    fontWeight: typography.fontWeight.medium,
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  signButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.base,
    backgroundColor: colors.background.tertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  signButtonActive: {
    backgroundColor: colors.semantic.income,
  },
  signButtonNegative: {
    backgroundColor: colors.semantic.expense,
  },
  signButtonText: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.tertiary,
  },
  signButtonTextActive: {
    color: colors.text.inverse,
  },
  balanceInput: {
    flex: 1,
    textAlign: "right",
  },
  currencyLabel: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    marginLeft: spacing.xs,
  },
  hintText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
  billingDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  billingDatePrefix: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
  },
  billingDateInput: {
    width: 60,
    textAlign: "center",
  },
  billingDateSuffix: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
  },
});
