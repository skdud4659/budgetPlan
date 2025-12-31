import React, { useState } from "react";
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
  Pressable,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  colors,
  typography,
  spacing,
  borderRadius,
} from "../styles";
import { categoryService } from "../services/categoryService";
import type { CategoryType } from "../types";
import ConfirmModal from "./ConfirmModal";

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

interface AddCategoryModalProps {
  visible: boolean;
  categoryType: CategoryType;
  onClose: () => void;
  onSuccess: (categoryId: string) => void;
}

export default function AddCategoryModal({
  visible,
  categoryType,
  onClose,
  onSuccess,
}: AddCategoryModalProps) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<keyof typeof Ionicons.glyphMap>("pricetag-outline");
  const [color, setColor] = useState("#4ECDC4");
  const [isSaving, setIsSaving] = useState(false);
  const [alertModal, setAlertModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
  }>({ visible: false, title: "", message: "" });

  const showAlert = (title: string, message: string) => {
    setAlertModal({ visible: true, title, message });
  };

  const handleClose = () => {
    setName("");
    setIcon("pricetag-outline");
    setColor("#4ECDC4");
    onClose();
  };

  const handleSave = async () => {
    if (!name.trim()) {
      showAlert("알림", "카테고리 이름을 입력해주세요.");
      return;
    }

    try {
      setIsSaving(true);
      const newCategory = await categoryService.createCategory({
        name: name.trim(),
        iconName: icon,
        color: color,
        type: categoryType,
      });
      handleClose();
      onSuccess(newCategory.id);
    } catch (error: any) {
      showAlert("오류", error?.message || "카테고리 저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  const getCategoryTypeLabel = () => {
    switch (categoryType) {
      case "expense":
        return "지출";
      case "income":
        return "수입";
      case "fixed":
        return "정기지출";
      default:
        return "";
    }
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => !isSaving && handleClose()}
          />

          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>
              {getCategoryTypeLabel()} 카테고리 추가
            </Text>

            {/* Name Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>이름</Text>
              <TextInput
                style={styles.textInput}
                placeholder="카테고리 이름"
                placeholderTextColor={colors.text.tertiary}
                value={name}
                onChangeText={setName}
                autoFocus
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
                {availableIcons.map((iconName) => (
                  <TouchableOpacity
                    key={iconName}
                    style={[
                      styles.iconOption,
                      icon === iconName && styles.iconOptionActive,
                      icon === iconName && { borderColor: color },
                    ]}
                    onPress={() => setIcon(iconName)}
                  >
                    <Ionicons
                      name={iconName}
                      size={20}
                      color={icon === iconName ? color : colors.text.secondary}
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Color Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>색상</Text>
              <View style={styles.colorGrid}>
                {availableColors.map((colorOption) => (
                  <TouchableOpacity
                    key={colorOption}
                    style={[
                      styles.colorOption,
                      { backgroundColor: colorOption },
                      color === colorOption && styles.colorOptionActive,
                    ]}
                    onPress={() => setColor(colorOption)}
                  >
                    {color === colorOption && (
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
                    { backgroundColor: color + "30" },
                  ]}
                >
                  <Ionicons name={icon} size={20} color={color} />
                </View>
                <Text style={styles.categoryName}>
                  {name || "카테고리 이름"}
                </Text>
              </View>
            </View>

            {/* Buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleClose}
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
    </>
  );
}

const styles = StyleSheet.create({
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
