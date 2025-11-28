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

interface AddAssetSheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: AssetFormData) => Promise<void>;
  editAsset?: Asset | null; // 수정 모드일 때
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
  editAsset,
}: AddAssetSheetProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<AssetType>("bank");
  const [balance, setBalance] = useState("");
  const [billingDate, setBillingDate] = useState("");
  const [settlementDate, setSettlementDate] = useState("");
  const [isNegative, setIsNegative] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isEditMode = !!editAsset;

  useEffect(() => {
    if (editAsset) {
      setName(editAsset.name);
      setType(editAsset.type);
      setBalance(Math.abs(editAsset.balance).toString());
      setIsNegative(editAsset.balance < 0);
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
    if (!name.trim() || !balance || isLoading) return;

    const balanceNum = parseFloat(balance.replace(/,/g, ""));
    const finalBalance = isNegative ? -balanceNum : balanceNum;

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

  const formatBalance = (value: string) => {
    const num = value.replace(/[^0-9]/g, "");
    if (!num) return "";
    return parseInt(num, 10).toLocaleString("ko-KR");
  };

  const canSubmit = name.trim() && balance;

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
            <TouchableOpacity
              onPress={handleSubmit}
              style={[
                styles.submitButton,
                (!canSubmit || isLoading) && styles.submitButtonDisabled,
              ]}
              disabled={!canSubmit || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={colors.text.inverse} />
              ) : (
                <Text
                  style={[
                    styles.submitButtonText,
                    !canSubmit && styles.submitButtonTextDisabled,
                  ]}
                >
                  {isEditMode ? "수정" : "추가"}
                </Text>
              )}
            </TouchableOpacity>
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

            {/* Balance */}
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
              {(type === "card" || type === "loan") && (
                <Text style={styles.hintText}>
                  카드/대출은 마이너스(-)로 입력하세요
                </Text>
              )}
            </View>

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
