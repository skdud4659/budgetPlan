import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
} from "../styles";

interface JointBudgetOnboardingModalProps {
  visible: boolean;
  onSelectJoint: () => void;
  onSelectPersonal: () => void;
}

export default function JointBudgetOnboardingModal({
  visible,
  onSelectJoint,
  onSelectPersonal,
}: JointBudgetOnboardingModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {}}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons
                name="people"
                size={32}
                color={colors.primary.main}
              />
            </View>
            <Text style={styles.title}>예산 관리 방식 선택</Text>
            <Text style={styles.subtitle}>
              나에게 맞는 예산 관리 방식을 선택해 주세요
            </Text>
          </View>

          {/* Options */}
          <View style={styles.optionsContainer}>
            {/* Joint Budget Option */}
            <TouchableOpacity
              style={styles.optionCard}
              activeOpacity={0.7}
              onPress={onSelectJoint}
            >
              <View style={[styles.optionIcon, { backgroundColor: colors.secondary.main + "20" }]}>
                <Ionicons
                  name="people-outline"
                  size={24}
                  color={colors.secondary.main}
                />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>공동 예산 사용</Text>
                <Text style={styles.optionDescription}>
                  가족이나 파트너와 함께 예산을 관리해요.{"\n"}
                  개인/공동 지출을 구분해서 기록할 수 있어요.
                </Text>
              </View>
              <View style={styles.recommendBadge}>
                <Text style={styles.recommendText}>추천</Text>
              </View>
            </TouchableOpacity>

            {/* Personal Only Option */}
            <TouchableOpacity
              style={styles.optionCard}
              activeOpacity={0.7}
              onPress={onSelectPersonal}
            >
              <View style={[styles.optionIcon, { backgroundColor: colors.primary.main + "20" }]}>
                <Ionicons
                  name="person-outline"
                  size={24}
                  color={colors.primary.main}
                />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>개인 예산만 사용</Text>
                <Text style={styles.optionDescription}>
                  혼자서 예산을 관리해요.{"\n"}
                  심플하게 지출을 기록할 수 있어요.
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <Text style={styles.footerText}>
            설정 {">"} 공동 예산 모드에서 언제든 변경할 수 있어요
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  container: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius["2xl"],
    padding: spacing.xl,
    width: "100%",
    maxWidth: 360,
    ...shadows.xl,
  },
  header: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary.main + "15",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.fontSize.md,
    color: colors.text.secondary,
    textAlign: "center",
  },
  optionsContainer: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.lg,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.base,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    lineHeight: 18,
  },
  recommendBadge: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.secondary.main,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  recommendText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.inverse,
  },
  footerText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    textAlign: "center",
  },
});
