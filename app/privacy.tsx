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

export default function PrivacyScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>개인정보 처리방침</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lastUpdated}>최종 수정일: 2024년 12월 1일</Text>

        <Text style={styles.intro}>
          Plan Budget(이하 "서비스")는 이용자의 개인정보를 중요시하며, 「개인정보 보호법」을 준수하고 있습니다. 본 개인정보 처리방침을 통해 이용자의 개인정보가 어떻게 수집, 이용, 보호되는지 알려드립니다.
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. 수집하는 개인정보 항목</Text>
          <Text style={styles.sectionContent}>
            서비스는 회원가입, 서비스 제공을 위해 아래와 같은 개인정보를 수집합니다.
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• 필수항목: 이메일 주소, 비밀번호</Text>
            <Text style={styles.bulletItem}>• 자동수집항목: 기기정보, 앱 사용 기록, 접속 로그</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. 개인정보의 수집 및 이용목적</Text>
          <Text style={styles.sectionContent}>
            수집한 개인정보는 다음의 목적을 위해 이용됩니다.
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• 회원 가입 및 관리: 회원제 서비스 제공, 개인 식별, 불량회원 부정이용 방지</Text>
            <Text style={styles.bulletItem}>• 서비스 제공: 재무 관리 서비스 제공, 데이터 동기화</Text>
            <Text style={styles.bulletItem}>• 서비스 개선: 서비스 이용 통계, 신규 서비스 개발</Text>
            <Text style={styles.bulletItem}>• 고객 지원: 문의 응대, 공지사항 전달</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. 개인정보의 보유 및 이용기간</Text>
          <Text style={styles.sectionContent}>
            이용자의 개인정보는 원칙적으로 개인정보의 수집 및 이용목적이 달성되면 지체 없이 파기합니다.{'\n\n'}
            단, 다음의 정보에 대해서는 아래의 이유로 명시한 기간 동안 보존합니다.
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• 회원 탈퇴 시: 탈퇴 후 30일간 보관 후 파기</Text>
            <Text style={styles.bulletItem}>• 관련 법령에 의한 보존: 전자상거래 등에서의 소비자보호에 관한 법률에 따라 계약 또는 청약철회 등에 관한 기록 5년, 소비자 불만 또는 분쟁처리에 관한 기록 3년</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. 개인정보의 파기절차 및 방법</Text>
          <Text style={styles.sectionContent}>
            이용자의 개인정보는 목적이 달성된 후 별도의 DB로 옮겨져 내부 방침 및 기타 관련 법령에 따라 일정 기간 저장된 후 파기됩니다.{'\n\n'}
            파기 방법:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• 전자적 파일 형태: 기록을 재생할 수 없는 기술적 방법을 사용하여 삭제</Text>
            <Text style={styles.bulletItem}>• 종이 문서: 분쇄기로 분쇄하거나 소각</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. 개인정보의 제3자 제공</Text>
          <Text style={styles.sectionContent}>
            서비스는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 다만, 아래의 경우에는 예외로 합니다.
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• 이용자가 사전에 동의한 경우</Text>
            <Text style={styles.bulletItem}>• 법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. 개인정보의 안전성 확보 조치</Text>
          <Text style={styles.sectionContent}>
            서비스는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다.
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• 비밀번호 암호화: 이용자의 비밀번호는 암호화되어 저장 및 관리됩니다.</Text>
            <Text style={styles.bulletItem}>• 해킹 등에 대비한 대책: 해킹이나 컴퓨터 바이러스 등에 의한 개인정보 유출 및 훼손을 막기 위하여 보안프로그램을 설치하고 주기적으로 갱신합니다.</Text>
            <Text style={styles.bulletItem}>• 개인정보 접근 제한: 개인정보를 처리하는 담당자를 최소한으로 제한하고 있습니다.</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. 이용자의 권리와 행사방법</Text>
          <Text style={styles.sectionContent}>
            이용자는 언제든지 등록되어 있는 자신의 개인정보를 조회하거나 수정할 수 있으며, 회원 탈퇴를 요청할 수 있습니다.
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• 개인정보 조회/수정: 설정 &gt; 계정 정보에서 직접 열람 및 수정 가능</Text>
            <Text style={styles.bulletItem}>• 회원 탈퇴: 설정 &gt; 계정 삭제를 통해 탈퇴 가능</Text>
            <Text style={styles.bulletItem}>• 개인정보 삭제 요청: 문의하기를 통해 요청 가능</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. 개인정보 보호책임자</Text>
          <Text style={styles.sectionContent}>
            서비스는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 이용자의 불만처리 및 피해구제를 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.
          </Text>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>개인정보 보호책임자</Text>
            <Text style={styles.infoValue}>Plan Budget 운영팀</Text>
            <Text style={styles.infoLabel}>연락처</Text>
            <Text style={styles.infoValue}>앱 내 문의하기 이용</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. 개인정보 처리방침 변경</Text>
          <Text style={styles.sectionContent}>
            이 개인정보 처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른 변경 내용의 추가, 삭제 및 정정이 있는 경우에는 변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>시행일: 2024년 12월 1일</Text>
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
    marginBottom: spacing.lg,
  },
  intro: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: 22,
    marginBottom: spacing.xl,
    backgroundColor: colors.primary.light + '15',
    padding: spacing.base,
    borderRadius: borderRadius.base,
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
  bulletList: {
    marginTop: spacing.sm,
  },
  bulletItem: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: 24,
    paddingLeft: spacing.sm,
  },
  infoBox: {
    marginTop: spacing.md,
    backgroundColor: colors.background.secondary,
    padding: spacing.base,
    borderRadius: borderRadius.base,
  },
  infoLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  infoValue: {
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    fontWeight: typography.fontWeight.medium,
  },
  footer: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  footerText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
});
