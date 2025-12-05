import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  TextInput,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
} from "../src/styles";
import { categoryService } from "../src/services/categoryService";
import ConfirmModal from "../src/components/ConfirmModal";
import type { Category, CategoryType } from "../src/types";

// 사용 가능한 아이콘 목록
const availableIcons: (keyof typeof Ionicons.glyphMap)[] = [
  "restaurant-outline",
  "cafe-outline",
  "cart-outline",
  "bus-outline",
  "car-outline",
  "home-outline",
  "medical-outline",
  "school-outline",
  "game-controller-outline",
  "film-outline",
  "gift-outline",
  "shirt-outline",
  "cut-outline",
  "fitness-outline",
  "airplane-outline",
  "library-outline",
  "briefcase-outline",
  "card-outline",
  "cash-outline",
  "wallet-outline",
  "pricetag-outline",
  "heart-outline",
  "star-outline",
  "ellipsis-horizontal",
];

// 사용 가능한 색상 목록
const availableColors = [
  "#FF6B6B",
  "#FF8E53",
  "#FFC947",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#A8E6CF",
  "#9B59B6",
  "#3498DB",
  "#1ABC9C",
  "#E74C3C",
  "#F39C12",
  "#27AE60",
  "#8E44AD",
  "#2980B9",
];

export default function CategoriesScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<CategoryType>("expense");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editCategory, setEditCategory] = useState<Category | null>(null);

  // 폼 상태
  const [formName, setFormName] = useState("");
  const [formIcon, setFormIcon] =
    useState<keyof typeof Ionicons.glyphMap>("pricetag-outline");
  const [formColor, setFormColor] = useState("#4ECDC4");
  const [isSaving, setIsSaving] = useState(false);

  // 모달 상태
  const [alertModal, setAlertModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    isDestructive?: boolean;
    onConfirm?: () => void;
  }>({ visible: false, title: "", message: "" });
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const loadCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await categoryService.getCategories();
      setCategories(data);
    } catch (error) {
      console.log("Error loading categories:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const filteredCategories = categories.filter((c) => c.type === selectedType);

  const handleOpenAdd = () => {
    setEditCategory(null);
    setFormName("");
    setFormIcon("pricetag-outline");
    setFormColor("#4ECDC4");
    setShowAddModal(true);
  };

  const handleOpenEdit = (category: Category) => {
    setEditCategory(category);
    setFormName(category.name);
    setFormIcon(category.iconName as keyof typeof Ionicons.glyphMap);
    setFormColor(category.color);
    setShowAddModal(true);
  };

  const showAlert = (title: string, message: string) => {
    setAlertModal({ visible: true, title, message });
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      showAlert("알림", "카테고리 이름을 입력해주세요.");
      return;
    }

    try {
      setIsSaving(true);
      if (editCategory) {
        // 수정
        await categoryService.updateCategory(editCategory.id, {
          name: formName.trim(),
          iconName: formIcon,
          color: formColor,
        });
      } else {
        // 추가
        await categoryService.createCategory({
          name: formName.trim(),
          iconName: formIcon,
          color: formColor,
          type: selectedType,
        });
      }
      setShowAddModal(false);
      loadCategories();
    } catch (error: any) {
      showAlert("오류", error?.message || "저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (category: Category) => {
    if (category.isDefault) {
      showAlert("알림", "기본 카테고리는 삭제할 수 없습니다.");
      return;
    }
    setDeleteTarget(category);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await categoryService.deleteCategory(deleteTarget.id);
      loadCategories();
    } catch (error: any) {
      showAlert("오류", error?.message || "삭제에 실패했습니다.");
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.replace("/(tabs)/settings")}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>카테고리 관리</Text>
        <TouchableOpacity onPress={handleOpenAdd} style={styles.addButton}>
          <Ionicons name="add" size={24} color={colors.primary.main} />
        </TouchableOpacity>
      </View>

      {/* Type Selector */}
      <View style={styles.typeSelector}>
        <TouchableOpacity
          style={[
            styles.typeButton,
            selectedType === "expense" && styles.typeButtonActive,
          ]}
          onPress={() => setSelectedType("expense")}
        >
          <Text
            style={[
              styles.typeButtonText,
              selectedType === "expense" && styles.typeButtonTextActive,
            ]}
          >
            지출
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.typeButton,
            selectedType === "income" && styles.typeButtonActive,
          ]}
          onPress={() => setSelectedType("income")}
        >
          <Text
            style={[
              styles.typeButtonText,
              selectedType === "income" && styles.typeButtonTextActive,
            ]}
          >
            수입
          </Text>
        </TouchableOpacity>
      </View>

      {/* Category List */}
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
          {filteredCategories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={styles.categoryItem}
              onPress={() => handleOpenEdit(category)}
              activeOpacity={0.7}
            >
              <View style={styles.categoryLeft}>
                <View
                  style={[
                    styles.categoryIcon,
                    { backgroundColor: category.color + "30" },
                  ]}
                >
                  <Ionicons
                    name={category.iconName as keyof typeof Ionicons.glyphMap}
                    size={20}
                    color={category.color}
                  />
                </View>
                <Text style={styles.categoryName}>{category.name}</Text>
                {category.isDefault && (
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultBadgeText}>기본</Text>
                  </View>
                )}
              </View>
              <View style={styles.categoryRight}>
                {!category.isDefault && (
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      handleDelete(category);
                    }}
                    style={styles.deleteButton}
                    hitSlop={8}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={18}
                      color={colors.semantic.expense}
                    />
                  </Pressable>
                )}
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.text.tertiary}
                />
              </View>
            </TouchableOpacity>
          ))}

          {filteredCategories.length === 0 && (
            <View style={styles.emptyContainer}>
              <Ionicons
                name="folder-open-outline"
                size={48}
                color={colors.text.tertiary}
              />
              <Text style={styles.emptyText}>카테고리가 없습니다</Text>
              <Text style={styles.emptySubText}>
                + 버튼을 눌러 추가해보세요
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Add/Edit Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => !isSaving && setShowAddModal(false)}
          />

          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>
              {editCategory ? "카테고리 수정" : "카테고리 추가"}
            </Text>

            {/* Name Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>이름</Text>
              <TextInput
                style={styles.textInput}
                placeholder="카테고리 이름"
                placeholderTextColor={colors.text.tertiary}
                value={formName}
                onChangeText={setFormName}
              />
            </View>

            {/* Icon Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>아이콘</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.iconScroll}
              >
                {availableIcons.map((icon) => (
                  <TouchableOpacity
                    key={icon}
                    style={[
                      styles.iconOption,
                      formIcon === icon && styles.iconOptionActive,
                      formIcon === icon && { borderColor: formColor },
                    ]}
                    onPress={() => setFormIcon(icon)}
                  >
                    <Ionicons
                      name={icon}
                      size={20}
                      color={
                        formIcon === icon ? formColor : colors.text.secondary
                      }
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Color Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>색상</Text>
              <View style={styles.colorGrid}>
                {availableColors.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      formColor === color && styles.colorOptionActive,
                    ]}
                    onPress={() => setFormColor(color)}
                  >
                    {formColor === color && (
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Preview */}
            <View style={styles.previewContainer}>
              <Text style={styles.inputLabel}>미리보기</Text>
              <View style={styles.previewItem}>
                <View
                  style={[
                    styles.categoryIcon,
                    { backgroundColor: formColor + "30" },
                  ]}
                >
                  <Ionicons name={formIcon} size={20} color={formColor} />
                </View>
                <Text style={styles.categoryName}>
                  {formName || "카테고리 이름"}
                </Text>
              </View>
            </View>

            {/* Buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowAddModal(false)}
                disabled={isSaving}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  isSaving && styles.saveButtonDisabled,
                ]}
                onPress={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>저장</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Alert Modal */}
      <ConfirmModal
        visible={alertModal.visible}
        title={alertModal.title}
        message={alertModal.message}
        confirmText="확인"
        cancelText=""
        onConfirm={() => setAlertModal({ ...alertModal, visible: false })}
        onCancel={() => setAlertModal({ ...alertModal, visible: false })}
      />

      {/* Delete Confirm Modal */}
      <ConfirmModal
        visible={!!deleteTarget}
        title="카테고리 삭제"
        message={`"${deleteTarget?.name}" 카테고리를 삭제하시겠습니까?`}
        confirmText="삭제"
        cancelText="취소"
        isDestructive
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
  },
  addButton: {
    padding: spacing.xs,
  },
  typeSelector: {
    flexDirection: "row",
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.base,
    padding: spacing.xs,
  },
  typeButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: "center",
    borderRadius: borderRadius.sm,
  },
  typeButtonActive: {
    backgroundColor: colors.background.secondary,
    ...shadows.sm,
  },
  typeButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
  },
  typeButtonTextActive: {
    color: colors.text.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing["3xl"],
  },
  categoryItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.base,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  categoryLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  categoryName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  defaultBadge: {
    backgroundColor: colors.primary.light + "30",
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.sm,
  },
  defaultBadgeText: {
    fontSize: typography.fontSize.xs,
    color: colors.primary.main,
    fontWeight: typography.fontWeight.medium,
  },
  categoryRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  deleteButton: {
    padding: spacing.xs,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing["3xl"],
  },
  emptyText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  emptySubText: {
    fontSize: typography.fontSize.md,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  modalBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContainer: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    width: "100%",
    maxWidth: 400,
    maxHeight: "85%",
  },
  modalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  inputGroup: {
    marginBottom: spacing.md,
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
  iconScroll: {
    flexGrow: 0,
  },
  iconOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background.tertiary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
    borderWidth: 2,
    borderColor: "transparent",
  },
  iconOptionActive: {
    backgroundColor: colors.background.primary,
    borderWidth: 2,
  },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  colorOptionActive: {
    borderWidth: 3,
    borderColor: colors.background.primary,
  },
  previewContainer: {
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  previewItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.lg,
    padding: spacing.base,
  },
  modalButtons: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: "center",
    borderRadius: borderRadius.base,
    backgroundColor: colors.background.tertiary,
  },
  cancelButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
  },
  saveButton: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: "center",
    borderRadius: borderRadius.base,
    backgroundColor: colors.primary.main,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semiBold,
    color: "#FFFFFF",
  },
});
