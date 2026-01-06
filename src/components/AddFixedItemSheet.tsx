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
import type { FixedItem, FixedItemType, BudgetType, Asset, Category } from "../types";
import { assetService } from "../services/assetService";
import { settingsService } from "../services/settingsService";
import { categoryService } from "../services/categoryService";
import AddCategoryModal from "./AddCategoryModal";

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
  categoryId: string | null;
  assetId: string | null;
  toAssetId: string | null;
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
  const [itemType, setItemType] = useState<FixedItemType>("fixed");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [assetId, setAssetId] = useState<string | null>(null);
  const [toAssetId, setToAssetId] = useState<string | null>(null);
  const [budgetType, setBudgetType] = useState<BudgetType>("personal");
  const [isLoading, setIsLoading] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showAssetDropdown, setShowAssetDropdown] = useState(false);
  const [showToAssetDropdown, setShowToAssetDropdown] = useState(false);
  const [jointBudgetEnabled, setJointBudgetEnabled] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);

  const isEditMode = !!editItem;

  // 카테고리 추가 성공 시 핸들러
  const handleCategoryAdded = async (newCategoryId: string) => {
    await loadData();
    setCategoryId(newCategoryId);
  };
  const selectedAsset = assets.find((a) => a.id === assetId);
  const selectedToAsset = assets.find((a) => a.id === toAssetId);

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible]);

  useEffect(() => {
    if (editItem) {
      setName(editItem.name);
      setAmount(editItem.amount.toString());
      setDay(editItem.day.toString());
      setItemType(editItem.type);
      setCategoryId(editItem.categoryId);
      setAssetId(editItem.assetId);
      setToAssetId(editItem.toAssetId);
      setBudgetType(editItem.budgetType);
    } else {
      resetForm();
    }
  }, [editItem, visible]);

  const loadData = async () => {
    try {
      const [assetsData, categoriesData, settings] = await Promise.all([
        assetService.getAssets(),
        categoryService.getCategories('fixed'),
        settingsService.getSettings(),
      ]);
      setAssets(assetsData);
      setCategories(categoriesData);
      setJointBudgetEnabled(settings.jointBudgetEnabled);
    } catch (error) {
      console.error("Failed to load data:", error);
    }
  };

  const resetForm = () => {
    setName("");
    setAmount("");
    setDay(new Date().getDate().toString());
    setItemType("fixed");
    setCategoryId(null);
    setAssetId(null);
    setToAssetId(null);
    setBudgetType("personal");
    setShowAssetDropdown(false);
    setShowToAssetDropdown(false);
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

    // 이체인 경우 출금/입금 자산 모두 필요
    if (itemType === "transfer") {
      if (!assetId || !toAssetId) {
        return;
      }
      if (assetId === toAssetId) {
        return;
      }
    }

    setIsLoading(true);
    try {
      await onSubmit({
        name: name.trim(),
        type: itemType,
        amount: amountNum,
        day: dayNum,
        categoryId: itemType === "transfer" ? null : categoryId,
        assetId,
        toAssetId: itemType === "transfer" ? toAssetId : null,
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

  const canSubmit = name.trim() && amount && day &&
    (itemType === "fixed" || (itemType === "transfer" && assetId && toAssetId && assetId !== toAssetId));

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
              {isEditMode
                ? (editItem?.type === "transfer" ? "정기이체 수정" : "정기지출 수정")
                : (itemType === "transfer" ? "정기이체 추가" : "정기지출 추가")}
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
            {/* Type Selection - 지출/이체 */}
            {!isEditMode && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>유형</Text>
                <View style={styles.typeRow}>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      itemType === "fixed" && styles.typeButtonActive,
                    ]}
                    onPress={() => setItemType("fixed")}
                  >
                    <Ionicons
                      name="card-outline"
                      size={18}
                      color={itemType === "fixed" ? colors.text.inverse : colors.text.secondary}
                      style={{ marginRight: spacing.xs }}
                    />
                    <Text
                      style={[
                        styles.typeButtonText,
                        itemType === "fixed" && styles.typeButtonTextActive,
                      ]}
                    >
                      지출
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      itemType === "transfer" && styles.typeButtonActive,
                    ]}
                    onPress={() => setItemType("transfer")}
                  >
                    <Ionicons
                      name="swap-horizontal-outline"
                      size={18}
                      color={itemType === "transfer" ? colors.text.inverse : colors.text.secondary}
                      style={{ marginRight: spacing.xs }}
                    />
                    <Text
                      style={[
                        styles.typeButtonText,
                        itemType === "transfer" && styles.typeButtonTextActive,
                      ]}
                    >
                      이체
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>이름</Text>
              <TextInput
                style={styles.textInput}
                placeholder={itemType === "transfer" ? "예: 적금 이체, 주택청약" : "예: 넷플릭스, 핸드폰 요금"}
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
              <Text style={styles.inputLabel}>{itemType === "transfer" ? "이체일" : "납부일"}</Text>
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

            {/* Category Selection - Grid (지출일 때만) */}
            {itemType === "fixed" && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>카테고리</Text>
                <View style={styles.categoryGrid}>
                  {categories.map((category) => {
                    const categoryColor = category.color || colors.text.secondary;
                    const categoryIcon = (category.iconName || "pricetag-outline") as keyof typeof Ionicons.glyphMap;
                    return (
                      <TouchableOpacity
                        key={category.id}
                        style={styles.categoryItem}
                        onPress={() => setCategoryId(category.id)}
                      >
                        <View
                          style={[
                            styles.categoryIcon,
                            { backgroundColor: categoryColor + "30" },
                            categoryId === category.id && {
                              backgroundColor: categoryColor,
                            },
                          ]}
                        >
                          <Ionicons
                            name={categoryIcon}
                            size={18}
                            color={
                              categoryId === category.id
                                ? colors.text.inverse
                                : categoryColor
                            }
                          />
                        </View>
                        <Text
                          style={[
                            styles.categoryName,
                            categoryId === category.id && styles.categoryNameActive,
                          ]}
                        >
                          {category.name || "미분류"}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                  {/* 카테고리 추가 버튼 */}
                  <TouchableOpacity
                    style={styles.categoryItem}
                    onPress={() => setShowAddCategoryModal(true)}
                  >
                    <View style={styles.addCategoryIcon}>
                      <Ionicons
                        name="add"
                        size={22}
                        color={colors.primary.main}
                      />
                    </View>
                    <Text style={styles.addCategoryName}>추가</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Asset Selection - 지출일 때 */}
            {itemType === "fixed" && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>결제 자산</Text>
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={() => {
                    setShowAssetDropdown(!showAssetDropdown);
                  }}
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
            )}

            {/* Transfer Asset Selection - 이체일 때 */}
            {itemType === "transfer" && (
              <>
                {/* 출금 자산 */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>출금 자산</Text>
                  <TouchableOpacity
                    style={styles.dropdownButton}
                    onPress={() => {
                      setShowAssetDropdown(!showAssetDropdown);
                      setShowToAssetDropdown(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.dropdownButtonText,
                        !selectedAsset && styles.dropdownPlaceholder,
                      ]}
                    >
                      {selectedAsset ? selectedAsset.name : "선택해주세요"}
                    </Text>
                    <Ionicons
                      name={showAssetDropdown ? "chevron-up" : "chevron-down"}
                      size={20}
                      color={colors.text.secondary}
                    />
                  </TouchableOpacity>
                  {showAssetDropdown && (
                    <View style={styles.dropdownList}>
                      {assets.map((asset) => (
                        <TouchableOpacity
                          key={asset.id}
                          style={[
                            styles.dropdownItem,
                            assetId === asset.id && styles.dropdownItemActive,
                            toAssetId === asset.id && styles.dropdownItemDisabled,
                          ]}
                          onPress={() => {
                            if (toAssetId !== asset.id) {
                              setAssetId(asset.id);
                              setShowAssetDropdown(false);
                            }
                          }}
                          disabled={toAssetId === asset.id}
                        >
                          <Text
                            style={[
                              styles.dropdownItemText,
                              assetId === asset.id && styles.dropdownItemTextActive,
                              toAssetId === asset.id && styles.dropdownItemTextDisabled,
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

                {/* 입금 자산 */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>입금 자산</Text>
                  <TouchableOpacity
                    style={styles.dropdownButton}
                    onPress={() => {
                      setShowToAssetDropdown(!showToAssetDropdown);
                      setShowAssetDropdown(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.dropdownButtonText,
                        !selectedToAsset && styles.dropdownPlaceholder,
                      ]}
                    >
                      {selectedToAsset ? selectedToAsset.name : "선택해주세요"}
                    </Text>
                    <Ionicons
                      name={showToAssetDropdown ? "chevron-up" : "chevron-down"}
                      size={20}
                      color={colors.text.secondary}
                    />
                  </TouchableOpacity>
                  {showToAssetDropdown && (
                    <View style={styles.dropdownList}>
                      {assets.map((asset) => (
                        <TouchableOpacity
                          key={asset.id}
                          style={[
                            styles.dropdownItem,
                            toAssetId === asset.id && styles.dropdownItemActive,
                            assetId === asset.id && styles.dropdownItemDisabled,
                          ]}
                          onPress={() => {
                            if (assetId !== asset.id) {
                              setToAssetId(asset.id);
                              setShowToAssetDropdown(false);
                            }
                          }}
                          disabled={assetId === asset.id}
                        >
                          <Text
                            style={[
                              styles.dropdownItemText,
                              toAssetId === asset.id && styles.dropdownItemTextActive,
                              assetId === asset.id && styles.dropdownItemTextDisabled,
                            ]}
                          >
                            {asset.name}
                          </Text>
                          {toAssetId === asset.id && (
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
              </>
            )}

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

      {/* Add Category Modal */}
      <AddCategoryModal
        visible={showAddCategoryModal}
        categoryType="fixed"
        onClose={() => setShowAddCategoryModal(false)}
        onSuccess={handleCategoryAdded}
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
    flexDirection: "row",
    paddingVertical: spacing.md,
    borderRadius: borderRadius.base,
    backgroundColor: colors.background.tertiary,
    alignItems: "center",
    justifyContent: "center",
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
  dropdownItemDisabled: {
    backgroundColor: colors.background.tertiary,
    opacity: 0.5,
  },
  dropdownItemTextDisabled: {
    color: colors.text.tertiary,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  categoryItem: {
    alignItems: "center",
    width: 70,
    paddingVertical: spacing.sm,
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  categoryName: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    textAlign: "center",
  },
  categoryNameActive: {
    color: colors.text.primary,
    fontWeight: typography.fontWeight.medium,
  },
  addCategoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
    borderWidth: 2,
    borderColor: colors.primary.main,
    borderStyle: "dashed",
  },
  addCategoryName: {
    fontSize: typography.fontSize.sm,
    color: colors.primary.main,
    fontWeight: typography.fontWeight.medium,
  },
});
