import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, typography, spacing, borderRadius, shadows } from '../../src/styles';

export default function SettingsScreen() {
  const [jointBudgetEnabled, setJointBudgetEnabled] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const handleLogout = () => {
    // TODO: Supabase 로그아웃
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>설정</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Section */}
        <TouchableOpacity style={styles.profileCard} activeOpacity={0.7}>
          <View style={styles.profileAvatar}>
            <Ionicons name="person" size={28} color={colors.primary.main} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>사용자</Text>
            <Text style={styles.profileEmail}>user@example.com</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
        </TouchableOpacity>

        {/* Budget Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>예산 설정</Text>

          <View style={styles.settingCard}>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: colors.secondary.light }]}>
                  <Ionicons name="people" size={18} color={colors.secondary.dark} />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingLabel}>공동 예산 모드</Text>
                  <Text style={styles.settingDescription}>
                    내꺼/공동 예산을 구분해서 관리해요
                  </Text>
                </View>
              </View>
              <Switch
                value={jointBudgetEnabled}
                onValueChange={setJointBudgetEnabled}
                trackColor={{ false: colors.border.medium, true: colors.primary.light }}
                thumbColor={jointBudgetEnabled ? colors.primary.main : colors.background.secondary}
              />
            </View>

            <View style={styles.settingDivider} />

            <TouchableOpacity style={styles.settingItem} activeOpacity={0.7}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: colors.primary.light + '50' }]}>
                  <Ionicons name="wallet" size={18} color={colors.primary.main} />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingLabel}>기본 자산 설정</Text>
                  <Text style={styles.settingDescription}>거래 추가 시 기본 선택</Text>
                </View>
              </View>
              <View style={styles.settingRight}>
                <Text style={styles.settingValue}>국민은행</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* App Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>앱 설정</Text>

          <View style={styles.settingCard}>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: colors.accent.light }]}>
                  <Ionicons name="notifications" size={18} color={colors.accent.dark} />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingLabel}>알림</Text>
                  <Text style={styles.settingDescription}>정기지출 납부일 알림</Text>
                </View>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: colors.border.medium, true: colors.primary.light }}
                thumbColor={notificationsEnabled ? colors.primary.main : colors.background.secondary}
              />
            </View>

            <View style={styles.settingDivider} />

            <TouchableOpacity style={styles.settingItem} activeOpacity={0.7}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: '#FFE0B2' }]}>
                  <Ionicons name="grid" size={18} color="#FF9800" />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingLabel}>카테고리 관리</Text>
                  <Text style={styles.settingDescription}>수입/지출 카테고리 편집</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Support */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>지원</Text>

          <View style={styles.settingCard}>
            <TouchableOpacity style={styles.settingItem} activeOpacity={0.7}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: '#E3F2FD' }]}>
                  <Ionicons name="help-circle" size={18} color="#2196F3" />
                </View>
                <Text style={styles.settingLabel}>도움말</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
            </TouchableOpacity>

            <View style={styles.settingDivider} />

            <TouchableOpacity style={styles.settingItem} activeOpacity={0.7}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: '#E8F5E9' }]}>
                  <Ionicons name="chatbubble-ellipses" size={18} color="#4CAF50" />
                </View>
                <Text style={styles.settingLabel}>문의하기</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
            </TouchableOpacity>

            <View style={styles.settingDivider} />

            <TouchableOpacity style={styles.settingItem} activeOpacity={0.7}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: '#F3E5F5' }]}>
                  <Ionicons name="document-text" size={18} color="#9C27B0" />
                </View>
                <Text style={styles.settingLabel}>이용약관</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
            </TouchableOpacity>

            <View style={styles.settingDivider} />

            <TouchableOpacity style={styles.settingItem} activeOpacity={0.7}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: '#FBE9E7' }]}>
                  <Ionicons name="shield" size={18} color="#FF5722" />
                </View>
                <Text style={styles.settingLabel}>개인정보 처리방침</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.semantic.error} />
          <Text style={styles.logoutText}>로그아웃</Text>
        </TouchableOpacity>

        {/* App Version */}
        <Text style={styles.versionText}>Plan Budget v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.base,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary.light + '30',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
  },
  profileEmail: {
    fontSize: typography.fontSize.md,
    color: colors.text.secondary,
    marginTop: 2,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  settingCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    ...shadows.sm,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.base,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.base,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  settingDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValue: {
    fontSize: typography.fontSize.md,
    color: colors.text.secondary,
    marginRight: spacing.xs,
  },
  settingDivider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginLeft: spacing.base + 36 + spacing.md,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.base,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  logoutText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.semantic.error,
    marginLeft: spacing.sm,
  },
  versionText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
});
