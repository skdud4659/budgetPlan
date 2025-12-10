import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../src/styles';

export default function TermsScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>이용약관</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lastUpdated}>최종 수정일: 2024년 12월 1일</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>제1조 (목적)</Text>
          <Text style={styles.sectionContent}>
            이 약관은 Plan Budget(이하 "서비스")를 이용함에 있어 서비스 제공자와 이용자 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>제2조 (용어의 정의)</Text>
          <Text style={styles.sectionContent}>
            ① "서비스"란 회사가 제공하는 개인 재무 관리 앱 및 관련 서비스를 말합니다.{'\n'}
            ② "이용자"란 이 약관에 따라 서비스를 이용하는 회원을 말합니다.{'\n'}
            ③ "회원"이란 서비스에 회원등록을 하고, 서비스를 이용하는 자를 말합니다.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>제3조 (약관의 효력 및 변경)</Text>
          <Text style={styles.sectionContent}>
            ① 이 약관은 서비스를 이용하고자 하는 모든 이용자에 대하여 그 효력을 발생합니다.{'\n'}
            ② 회사는 필요한 경우 관련 법령을 위배하지 않는 범위에서 이 약관을 변경할 수 있으며, 변경된 약관은 서비스 내 공지사항을 통해 공지합니다.{'\n'}
            ③ 변경된 약관에 동의하지 않는 이용자는 서비스 이용을 중단하고 탈퇴할 수 있습니다.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>제4조 (회원가입)</Text>
          <Text style={styles.sectionContent}>
            ① 이용자는 회사가 정한 가입 양식에 따라 회원정보를 기입한 후 이 약관에 동의한다는 의사표시를 함으로써 회원가입을 신청합니다.{'\n'}
            ② 회사는 제1항과 같이 회원으로 가입할 것을 신청한 이용자 중 다음 각 호에 해당하지 않는 한 회원으로 등록합니다.{'\n'}
            - 가입신청자가 이 약관에 의하여 이전에 회원자격을 상실한 적이 있는 경우{'\n'}
            - 등록 내용에 허위, 기재누락, 오기가 있는 경우{'\n'}
            - 기타 회원으로 등록하는 것이 서비스 운영에 현저히 지장이 있다고 판단되는 경우
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>제5조 (서비스의 제공)</Text>
          <Text style={styles.sectionContent}>
            ① 회사는 다음과 같은 서비스를 제공합니다.{'\n'}
            - 개인 재무 관리 (수입/지출 기록){'\n'}
            - 예산 설정 및 관리{'\n'}
            - 자산 관리{'\n'}
            - 정기지출 관리{'\n'}
            - 기타 회사가 정하는 서비스{'\n'}
            ② 서비스는 연중무휴, 1일 24시간 제공함을 원칙으로 합니다. 단, 시스템 점검 등의 필요에 의해 일시적으로 서비스가 중단될 수 있습니다.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>제6조 (이용자의 의무)</Text>
          <Text style={styles.sectionContent}>
            ① 이용자는 다음 행위를 하여서는 안 됩니다.{'\n'}
            - 신청 또는 변경 시 허위내용의 등록{'\n'}
            - 타인의 정보도용{'\n'}
            - 서비스에 게시된 정보의 변경{'\n'}
            - 서비스의 운영을 고의로 방해하는 행위{'\n'}
            - 기타 관계법령에 위반되는 행위{'\n'}
            ② 이용자는 관계법령, 이 약관의 규정, 이용안내 및 서비스와 관련하여 공지한 주의사항을 준수하여야 합니다.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>제7조 (서비스 이용의 제한 및 중지)</Text>
          <Text style={styles.sectionContent}>
            회사는 이용자가 다음 각 호에 해당하는 경우 서비스 이용을 제한하거나 중지시킬 수 있습니다.{'\n'}
            - 서비스 운영을 고의로 방해한 경우{'\n'}
            - 타인의 명예를 손상시키거나 불이익을 주는 행위를 한 경우{'\n'}
            - 기타 관련 법령이나 회사가 정한 이용조건에 위배되는 경우
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>제8조 (면책조항)</Text>
          <Text style={styles.sectionContent}>
            ① 회사는 천재지변, 전쟁 등 불가항력적인 사유로 서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다.{'\n'}
            ② 회사는 이용자의 귀책사유로 인한 서비스 이용의 장애에 대하여 책임을 지지 않습니다.{'\n'}
            ③ 이용자가 서비스에 게재한 정보, 자료, 사실의 신뢰도, 정확성 등의 내용에 관하여는 회사는 책임을 지지 않습니다.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>제9조 (분쟁해결)</Text>
          <Text style={styles.sectionContent}>
            ① 회사와 이용자 간에 발생한 서비스 이용에 관한 분쟁에 대하여는 상호 협의에 의해 해결합니다.{'\n'}
            ② 상호 협의에 의해 해결되지 않는 분쟁에 대해서는 대한민국 법률에 따라 관할 법원에서 해결합니다.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>부칙</Text>
          <Text style={styles.sectionContent}>
            이 약관은 2024년 12월 1일부터 시행합니다.
          </Text>
        </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    backgroundColor: colors.background.secondary,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  lastUpdated: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    marginBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  sectionContent: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: 22,
  },
});
