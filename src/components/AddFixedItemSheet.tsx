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
} from "../styles";
import type { FixedItem, FixedItemType, BudgetType, Asset } from "../types";
import { assetService } from "../services/assetService";
import { settingsService } from "../services/settingsService";

interface AddFixedItemSheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: FixedItemFormData) => Promise<void>;
  onDelete?: () => void;
  editItem?: FixedItem | null;
}

interface FixedItemFormData {
  name: string;
  type: FixedItemType;
  amount: number;
  day: number;
  assetId: string | null;
  budgetType: BudgetType;
}

export default function AddFixedItemSheet({
  visible,
  onClose,
  onSubmit,
  onDelete,
  editItem,
}: AddFixedItemSheetProps) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [day, setDay] = useState("");
  const [assetId, setAssetId] = useState<string | null>(null);
  const [budgetType, setBudgetType] = useState<BudgetType>("personal");
  const [isLoading, setIsLoading] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [showAssetDropdown, setShowAssetDropdown] = useState(false);
  const [jointBudgetEnabled, setJointBudgetEnabled] = useState(false);

  const isEditMode = !!editItem;
  const selectedAsset = assets.find((a) => a.id === assetId);

  useEffect(() => {
    if (visible) {
      loadAssets();
    }
  }, [visible]);

  useEffect(() => {
    if (editItem) {
      setName(editItem.name);
      setAmount(editItem.amount.toString());
      setDay(editItem.day.toString());
      setAssetId(editItem.assetId);
      setBudgetType(editItem.budgetType);
    } else {
      resetForm();
    }
  }, [editItem, visible]);

  const loadAssets = async () => {
    try {
      const [data, settings] = await Promise.all([
        assetService.getAssets(),
        settingsService.getSettings(),
      ]);
      setAssets(data);
      setJointBudgetEnabled(settings.jointBudgetEnabled);
    } catch (error) {
      console.error("Failed to load assets:", error);
    }
  };

  const resetForm = () => {
    setName("");
    setAmount("");
    setDay(new Date().getDate().toString());
    setAssetId(null);
    setBudgetType("personal");
    setShowAssetDropdown(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!name.trim() || !amount || !day || isLoading) return;

    const amountNum = parseFloat(amount.replace(/,/g, ""));
    const dayNum = parseInt(day, 10);

    if (dayNum < 1 || dayNum > 31) {
      return;
    }

    setIsLoading(true);
    try {
      await onSubmit({
        name: name.trim(),
        type: "fixed",
        amount: amountNum,
        day: dayNum,
        assetId,
        budgetType,
      });
      handleClose();
    } finally {
      setIsLoading(false);
    }
  };

  const formatAmount = (value: string) => {
    const num = value.replace(/[^0-9]/g, "");
    if (!num) return "";
    return parseInt(num, 10).toLocaleString("ko-KR");
  };

  const canSubmit = name.trim() && amount && day;

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
              {isEditMode ? "정기지출 수정" : "정기지출 추가"}
            </Text>
            <View style={styles.headerActions}>
              {isEditMode && onDelete && (
                <TouchableOpacity
                  onPress={() => {
                    console.log("Delete button pressed");
                    onDelete();
                  }}
                  style={styles.headerIconButton}
                  disabled={isLoading}
                >
                  <Ionicons
                    name="trash-outline"
                    size={22}
                    color={isLoading ? colors.text.tertiary : colors.semantic.expense}
                  />
                </TouchableOpacity>
              )}
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
            {/* Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>이름</Text>
              <TextInput
                style={styles.textInput}
                placeholder="예: 넷플릭스, 핸드폰 요금"
                placeholderTextColor={colors.text.tertiary}
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* Amount */}
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
            </View>

            {/* Day */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>납부일</Text>
              <View style={styles.dayRow}>
                <Text style={styles.dayPrefix}>매월</Text>
                <TextInput
                  style={[styles.textInput, styles.dayInput]}
                  placeholder="15"
                  placeholderTextColor={colors.text.tertiary}
                  value={day}
                  onChangeText={(text) => {
                    const num = text.replace(/[^0-9]/g, "");
                    if (parseInt(num, 10) <= 31 || num === "") {
                      setDay(num);
                    }
                  }}
                  keyboardType="numeric"
                  maxLength={2}
                />
                <Text style={styles.daySuffix}>일</Text>
              </View>
            </View>

            {/* Asset Selection - Dropdown */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>결제 자산</Text>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setShowAssetDropdown(!showAssetDropdown)}
              >
                <Text
                  style={[
                    styles.dropdownButtonText,
                    !selectedAsset && styles.dropdownPlaceholder,
                  ]}
                >
                  {selectedAsset ? selectedAsset.name : "미지정"}
                </Text>
                <Ionicons
                  name={showAssetDropdown ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={colors.text.secondary}
                />
              </TouchableOpacity>
              {showAssetDropdown && (
                <View style={styles.dropdownList}>
                  <TouchableOpacity
                    style={[
                      styles.dropdownItem,
                      assetId === null && styles.dropdownItemActive,
                    ]}
                    onPress={() => {
                      setAssetId(null);
                      setShowAssetDropdown(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        assetId === null && styles.dropdownItemTextActive,
                      ]}
                    >
                      미지정
                    </Text>
                    {assetId === null && (
                      <Ionicons
                        name="checkmark"
                        size={18}
                        color={colors.primary.main}
                      />
                    )}
                  </TouchableOpacity>
                  {assets.map((asset) => (
                    <TouchableOpacity
                      key={asset.id}
                      style={[
                        styles.dropdownItem,
                        assetId === asset.id && styles.dropdownItemActive,
                      ]}
                      onPress={() => {
                        setAssetId(asset.id);
                        setShowAssetDropdown(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.dropdownItemText,
                          assetId === asset.id && styles.dropdownItemTextActive,
                        ]}
                      >
                        {asset.name}
                      </Text>
                      {assetId === asset.id && (
                        <Ionicons
                          name="checkmark"
                          size={18}
                          color={colors.primary.main}
                        />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Budget Type - only when joint budget is enabled */}
            {jointBudgetEnabled && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>예산 구분</Text>
                <View style={styles.typeRow}>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      budgetType === "personal" && styles.typeButtonActive,
                    ]}
                    onPress={() => setBudgetType("personal")}
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        budgetType === "personal" && styles.typeButtonTextActive,
                      ]}
                    >
                      개인
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      budgetType === "joint" && styles.typeButtonActive,
                    ]}
                    onPress={() => setBudgetType("joint")}
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        budgetType === "joint" && styles.typeButtonTextActive,
                      ]}
                    >
                      공동
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
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
  typeRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  typeButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.base,
    backgroundColor: colors.background.tertiary,
    alignItems: "center",
  },
  typeButtonActive: {
    backgroundColor: colors.primary.main,
  },
  typeButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
  },
  typeButtonTextActive: {
    color: colors.text.inverse,
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
  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  dayPrefix: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
  },
  dayInput: {
    width: 60,
    textAlign: "center",
  },
  daySuffix: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
  },
  dropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.base,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  dropdownButtonText: {
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
  },
  dropdownPlaceholder: {
    color: colors.text.tertiary,
  },
  dropdownList: {
    marginTop: spacing.sm,
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.base,
    overflow: "hidden",
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  dropdownItemActive: {
    backgroundColor: colors.primary.light + "20",
  },
  dropdownItemText: {
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
  },
  dropdownItemTextActive: {
    color: colors.primary.main,
    fontWeight: typography.fontWeight.medium,
  },
});
