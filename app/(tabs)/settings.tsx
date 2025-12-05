import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, typography, spacing, borderRadius, shadows } from '../../src/styles';
import { settingsService } from '../../src/services/settingsService';
import { assetService } from '../../src/services/assetService';
import { supabase } from '../../src/config/supabase';
import type { AppSettings, Asset, User } from '../../src/types';

export default function SettingsScreen() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [jointBudgetEnabled, setJointBudgetEnabled] = useState(false);
  const [showMonthStartDayModal, setShowMonthStartDayModal] = useState(false);
  const [showDefaultAssetModal, setShowDefaultAssetModal] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [userEmail, setUserEmail] = useState<string>('');

  // 설정 불러오기
  const loadSettings = useCallback(async () => {
    try {
      const [settingsData, assetsData, { data: { user } }] = await Promise.all([
        settingsService.getSettings(),
        assetService.getAssets(),
        supabase.auth.getUser(),
      ]);
      setSettings(settingsData);
      setJointBudgetEnabled(settingsData.jointBudgetEnabled);
      setAssets(assetsData);
      if (user?.email) {
        setUserEmail(user.email);
      }
    } catch (error) {
      console.log('Error loading settings:', error);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // 월 시작일 변경
  const handleMonthStartDayChange = async (day: number) => {
    try {
      await settingsService.updateSettings({ monthStartDay: day });
      setSettings(prev => prev ? { ...prev, monthStartDay: day } : null);
      setShowMonthStartDayModal(false);
    } catch (error) {
      console.log('Error updating month start day:', error);
    }
  };

  // 공동 예산 모드 변경
  const handleJointBudgetChange = async (value: boolean) => {
    try {
      setJointBudgetEnabled(value);
      await settingsService.updateSettings({ jointBudgetEnabled: value });
      setSettings(prev => prev ? { ...prev, jointBudgetEnabled: value } : null);
    } catch (error) {
      console.log('Error updating joint budget:', error);
      setJointBudgetEnabled(!value);
    }
  };

  // 기본 자산 변경
  const handleDefaultAssetChange = async (assetId: string | null) => {
    try {
      await settingsService.updateSettings({ defaultAssetId: assetId });
      setSettings(prev => prev ? { ...prev, defaultAssetId: assetId } : null);
      setShowDefaultAssetModal(false);
    } catch (error) {
      console.log('Error updating default asset:', error);
    }
  };

  // 기본 자산 이름 가져오기
  const getDefaultAssetName = () => {
    if (!settings?.defaultAssetId) return '미지정';
    const asset = assets.find(a => a.id === settings.defaultAssetId);
    return asset?.name || '미지정';
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.replace('/(auth)/login');
    } catch (error) {
      console.log('Error logging out:', error);
    }
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
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Ionicons name="person" size={28} color={colors.primary.main} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {userEmail ? userEmail.split('@')[0] : '사용자'}
            </Text>
            <Text style={styles.profileEmail}>
              {userEmail || '이메일 없음'}
            </Text>
          </View>
        </View>

        {/* Budget Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>예산 관리</Text>

          <View style={styles.settingCard}>
            <TouchableOpacity
              style={styles.settingItem}
              activeOpacity={0.7}
              onPress={() => setShowMonthStartDayModal(true)}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: colors.primary.light + '50' }]}>
                  <Ionicons name="calendar" size={18} color={colors.primary.main} />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingLabel}>월 시작일</Text>
                  <Text style={styles.settingDescription}>
                    매월 이 날짜부터 새로운 달로 계산해요
                  </Text>
                </View>
              </View>
              <View style={styles.settingRight}>
                <Text style={styles.settingValue}>{settings?.monthStartDay || 1}일</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
              </View>
            </TouchableOpacity>

            <View style={styles.settingDivider} />

            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: colors.secondary.light }]}>
                  <Ionicons name="people" size={18} color={colors.secondary.dark} />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingLabel}>공동 예산 모드</Text>
                  <Text style={styles.settingDescription}>
                    개인/공동 예산을 구분해서 관리해요
                  </Text>
                </View>
              </View>
              <Switch
                value={jointBudgetEnabled}
                onValueChange={handleJointBudgetChange}
                trackColor={{ false: colors.border.medium, true: colors.primary.light }}
                thumbColor={jointBudgetEnabled ? colors.primary.main : colors.background.secondary}
              />
            </View>

            <View style={styles.settingDivider} />

            <TouchableOpacity
              style={styles.settingItem}
              activeOpacity={0.7}
              onPress={() => setShowDefaultAssetModal(true)}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: '#E8F5E9' }]}>
                  <Ionicons name="wallet" size={18} color="#4CAF50" />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingLabel}>기본 자산 설정</Text>
                  <Text style={styles.settingDescription}>거래 추가 시 기본 선택</Text>
                </View>
              </View>
              <View style={styles.settingRight}>
                <Text style={styles.settingValue}>{getDefaultAssetName()}</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* App Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>앱 설정</Text>

          <View style={styles.settingCard}>
            <TouchableOpacity
              style={styles.settingItem}
              activeOpacity={0.7}
              onPress={() => router.push('/categories')}
            >
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

      {/* 월 시작일 선택 모달 */}
      <Modal
        visible={showMonthStartDayModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMonthStartDayModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMonthStartDayModal(false)}
        >
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>월 시작일 선택</Text>
            <Text style={styles.modalDescription}>
              매월 이 날짜가 되면 할부 회차가 자동으로 증가해요
            </Text>
            <ScrollView style={styles.dayList} showsVerticalScrollIndicator={false}>
              {[1, 5, 10, 15, 20, 25].map((day) => (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.dayItem,
                    settings?.monthStartDay === day && styles.dayItemActive,
                  ]}
                  onPress={() => handleMonthStartDayChange(day)}
                >
                  <Text
                    style={[
                      styles.dayItemText,
                      settings?.monthStartDay === day && styles.dayItemTextActive,
                    ]}
                  >
                    {day}일
                  </Text>
                  {settings?.monthStartDay === day && (
                    <Ionicons name="checkmark" size={20} color={colors.primary.main} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 기본 자산 선택 모달 */}
      <Modal
        visible={showDefaultAssetModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDefaultAssetModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDefaultAssetModal(false)}
        >
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>기본 자산 선택</Text>
            <Text style={styles.modalDescription}>
              거래 추가 시 기본으로 선택될 자산이에요
            </Text>
            <ScrollView style={styles.dayList} showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                style={[
                  styles.dayItem,
                  settings?.defaultAssetId === null && styles.dayItemActive,
                ]}
                onPress={() => handleDefaultAssetChange(null)}
              >
                <Text
                  style={[
                    styles.dayItemText,
                    settings?.defaultAssetId === null && styles.dayItemTextActive,
                  ]}
                >
                  미지정
                </Text>
                {settings?.defaultAssetId === null && (
                  <Ionicons name="checkmark" size={20} color={colors.primary.main} />
                )}
              </TouchableOpacity>
              {assets.map((asset) => (
                <TouchableOpacity
                  key={asset.id}
                  style={[
                    styles.dayItem,
                    settings?.defaultAssetId === asset.id && styles.dayItemActive,
                  ]}
                  onPress={() => handleDefaultAssetChange(asset.id)}
                >
                  <Text
                    style={[
                      styles.dayItemText,
                      settings?.defaultAssetId === asset.id && styles.dayItemTextActive,
                    ]}
                  >
                    {asset.name}
                  </Text>
                  {settings?.defaultAssetId === asset.id && (
                    <Ionicons name="checkmark" size={20} color={colors.primary.main} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalContainer: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 320,
    maxHeight: 400,
  },
  modalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  modalDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  dayList: {
    maxHeight: 250,
  },
  dayItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    borderRadius: borderRadius.base,
    marginBottom: spacing.xs,
  },
  dayItemActive: {
    backgroundColor: colors.primary.light + '30',
  },
  dayItemText: {
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
  },
  dayItemTextActive: {
    fontWeight: typography.fontWeight.semiBold,
    color: colors.primary.main,
  },
});
