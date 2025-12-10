import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../src/styles';

// Android에서 LayoutAnimation 활성화
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

const faqData: FAQItem[] = [
  // 시작하기
  {
    id: '1',
    category: '시작하기',
    question: '앱을 처음 시작하면 어떻게 해야 하나요?',
    answer: '회원가입 후 로그인하시면 됩니다. 처음 로그인 시 개인 예산만 사용할지, 공동 예산도 함께 사용할지 선택할 수 있습니다. 이 설정은 나중에 설정 메뉴에서 변경할 수 있습니다.',
  },
  {
    id: '2',
    category: '시작하기',
    question: '공동 예산 모드는 무엇인가요?',
    answer: '공동 예산 모드를 켜면 개인 예산과 공동 예산을 분리하여 관리할 수 있습니다. 부부나 룸메이트와 함께 생활비를 관리할 때 유용합니다. 각 거래를 추가할 때 개인/공동을 선택할 수 있고, 홈 화면에서 필터링하여 볼 수 있습니다.',
  },
  // 거래 관리
  {
    id: '3',
    category: '거래 관리',
    question: '거래는 어떻게 추가하나요?',
    answer: '홈 화면 우측 하단의 + 버튼을 눌러 거래를 추가할 수 있습니다. 지출, 수입, 이체 중 하나를 선택하고, 금액, 카테고리, 날짜 등을 입력하세요.',
  },
  {
    id: '4',
    category: '거래 관리',
    question: '거래를 수정하거나 삭제하려면?',
    answer: '홈 화면이나 거래 내역에서 해당 거래를 탭하면 수정할 수 있습니다. 삭제는 거래 항목을 왼쪽으로 스와이프하거나, 수정 화면에서 삭제 버튼을 눌러주세요.',
  },
  {
    id: '5',
    category: '거래 관리',
    question: '할부 거래는 어떻게 입력하나요?',
    answer: '거래 추가 시 "할부" 옵션을 켜면 할부 개월 수를 입력할 수 있습니다. 할부 거래는 매월 자동으로 분할되어 표시되며, 생활비 포함 여부도 선택할 수 있습니다.',
  },
  // 예산 관리
  {
    id: '6',
    category: '예산 관리',
    question: '예산은 어떻게 설정하나요?',
    answer: '홈 화면 상단의 예산 카드를 탭하면 예산을 설정할 수 있습니다. 공동 예산 모드가 켜져 있으면 개인/공동 예산을 각각 설정할 수 있습니다.',
  },
  {
    id: '7',
    category: '예산 관리',
    question: '월 시작일은 무엇인가요?',
    answer: '월 시작일은 예산 기간의 시작 날짜입니다. 예를 들어 월 시작일을 25일로 설정하면, 25일부터 다음 달 24일까지를 한 달로 계산합니다. 설정 > 월 시작일에서 변경할 수 있습니다.',
  },
  // 정기지출
  {
    id: '8',
    category: '정기지출',
    question: '정기지출은 어떻게 등록하나요?',
    answer: '하단 탭의 "정기지출"에서 + 버튼을 눌러 등록할 수 있습니다. 이름, 금액, 납부일, 결제 자산을 입력하세요. 정기지출은 매월 예산 계획에 자동으로 반영됩니다.',
  },
  // 자산 관리
  {
    id: '9',
    category: '자산 관리',
    question: '자산은 어떻게 추가하나요?',
    answer: '하단 탭의 "자산"에서 + 버튼을 눌러 추가할 수 있습니다. 은행 계좌, 카드, 현금, 저축, 투자, 대출 등 다양한 유형의 자산을 등록할 수 있습니다.',
  },
  {
    id: '10',
    category: '자산 관리',
    question: '카드 결제일과 정산일은 무엇인가요?',
    answer: '카드 자산을 등록할 때 결제일(대금이 빠져나가는 날)과 정산일(사용 금액이 집계 시작되는 날)을 설정할 수 있습니다. 이를 통해 이번 달 결제 예정 금액과 다음 달 결제 예정 금액을 확인할 수 있습니다.',
  },
  // 기타
  {
    id: '11',
    category: '기타',
    question: '데이터는 어디에 저장되나요?',
    answer: '모든 데이터는 클라우드에 안전하게 저장됩니다. 기기를 변경해도 같은 계정으로 로그인하면 데이터를 그대로 사용할 수 있습니다.',
  },
  {
    id: '12',
    category: '기타',
    question: '비밀번호를 잊어버렸어요.',
    answer: '로그인 화면에서 "비밀번호를 잊으셨나요?"를 탭하고 가입할 때 사용한 이메일을 입력하세요. 비밀번호 재설정 링크가 이메일로 전송됩니다.',
  },
];

// 카테고리별로 그룹화
const groupedFAQ = faqData.reduce((acc, item) => {
  if (!acc[item.category]) {
    acc[item.category] = [];
  }
  acc[item.category].push(item);
  return acc;
}, {} as Record<string, FAQItem[]>);

const categoryOrder = ['시작하기', '거래 관리', '예산 관리', '정기지출', '자산 관리', '기타'];

export default function HelpScreen() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>도움말</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro */}
        <View style={styles.introCard}>
          <Ionicons name="bulb-outline" size={32} color={colors.primary.main} />
          <Text style={styles.introTitle}>자주 묻는 질문</Text>
          <Text style={styles.introText}>
            Plan Budget 사용에 대한 궁금한 점을 확인하세요.
          </Text>
        </View>

        {/* FAQ List */}
        {categoryOrder.map((category) => {
          const items = groupedFAQ[category];
          if (!items) return null;

          return (
            <View key={category} style={styles.categorySection}>
              <Text style={styles.categoryTitle}>{category}</Text>
              <View style={styles.faqList}>
                {items.map((item, index) => (
                  <View
                    key={item.id}
                    style={[
                      styles.faqItem,
                      index < items.length - 1 && styles.faqItemBorder,
                    ]}
                  >
                    <TouchableOpacity
                      style={styles.faqQuestion}
                      onPress={() => toggleExpand(item.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.faqQuestionText}>{item.question}</Text>
                      <Ionicons
                        name={expandedId === item.id ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color={colors.text.tertiary}
                      />
                    </TouchableOpacity>
                    {expandedId === item.id && (
                      <View style={styles.faqAnswer}>
                        <Text style={styles.faqAnswerText}>{item.answer}</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </View>
          );
        })}

        {/* Contact Us Banner */}
        <TouchableOpacity
          style={styles.contactBanner}
          onPress={() => router.push('/inquiry')}
          activeOpacity={0.8}
        >
          <View style={styles.contactBannerContent}>
            <Ionicons name="chatbubble-ellipses-outline" size={24} color={colors.primary.main} />
            <View style={styles.contactBannerText}>
              <Text style={styles.contactBannerTitle}>원하는 답변을 찾지 못하셨나요?</Text>
              <Text style={styles.contactBannerSubtitle}>문의하기를 통해 질문해주세요</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
        </TouchableOpacity>
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
  introCard: {
    backgroundColor: colors.primary.light + '20',
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  introTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  introText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  categorySection: {
    marginBottom: spacing.xl,
  },
  categoryTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
    paddingLeft: spacing.xs,
  },
  faqList: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  faqItem: {
    paddingHorizontal: spacing.base,
  },
  faqItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.base,
  },
  faqQuestionText: {
    flex: 1,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
    marginRight: spacing.sm,
  },
  faqAnswer: {
    paddingBottom: spacing.base,
    paddingTop: spacing.xs,
  },
  faqAnswerText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: 22,
  },
  contactBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.base,
    marginTop: spacing.md,
    ...shadows.sm,
  },
  contactBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  contactBannerText: {
    marginLeft: spacing.md,
  },
  contactBannerTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  contactBannerSubtitle: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    marginTop: 2,
  },
});
