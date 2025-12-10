import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../src/styles';
import {
  inquiryService,
  Inquiry,
  InquiryCategory,
  InquiryStatus,
  CreateInquiryData,
} from '../src/services/inquiryService';

const categories: { value: InquiryCategory; label: string; icon: string }[] = [
  { value: 'bug', label: '버그 신고', icon: 'bug-outline' },
  { value: 'feature', label: '기능 제안', icon: 'bulb-outline' },
  { value: 'account', label: '계정 문의', icon: 'person-outline' },
  { value: 'payment', label: '결제 문의', icon: 'card-outline' },
  { value: 'other', label: '기타', icon: 'ellipsis-horizontal' },
];

const getStatusColor = (status: InquiryStatus) => {
  switch (status) {
    case 'pending':
      return colors.text.tertiary;
    case 'in_progress':
      return colors.primary.main;
    case 'resolved':
      return colors.semantic.income;
    case 'closed':
      return colors.text.secondary;
  }
};

export default function InquiryScreen() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showNewInquiry, setShowNewInquiry] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);

  // 새 문의 폼 상태
  const [category, setCategory] = useState<InquiryCategory>('other');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const loadInquiries = useCallback(async () => {
    try {
      const data = await inquiryService.getMyInquiries();
      setInquiries(data);
    } catch (error) {
      console.error('문의 목록 로드 실패:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadInquiries();
  }, [loadInquiries]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadInquiries();
  };

  const resetForm = () => {
    setCategory('other');
    setTitle('');
    setContent('');
  };

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await inquiryService.createInquiry({
        category,
        title: title.trim(),
        content: content.trim(),
      });
      resetForm();
      setShowNewInquiry(false);
      loadInquiries();
    } catch (error: any) {
      console.error('문의 등록 실패:', error);
      alert('문의 등록에 실패했습니다: ' + (error.message || '알 수 없는 오류'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${year}.${month}.${day} ${hours}:${minutes}`;
  };

  const canSubmit = title.trim() && content.trim();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>문의하기</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowNewInquiry(true)}
        >
          <Ionicons name="add" size={24} color={colors.primary.main} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
          }
        >
          {inquiries.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={64}
                color={colors.text.tertiary}
              />
              <Text style={styles.emptyTitle}>문의 내역이 없습니다</Text>
              <Text style={styles.emptyText}>
                궁금한 점이 있으시면 문의해주세요
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => setShowNewInquiry(true)}
              >
                <Text style={styles.emptyButtonText}>새 문의 작성</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.sectionTitle}>내 문의 ({inquiries.length})</Text>
              <View style={styles.inquiryList}>
                {inquiries.map((inquiry, index) => (
                  <TouchableOpacity
                    key={inquiry.id}
                    style={[
                      styles.inquiryItem,
                      index < inquiries.length - 1 && styles.inquiryItemBorder,
                    ]}
                    onPress={() => setSelectedInquiry(inquiry)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.inquiryHeader}>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: getStatusColor(inquiry.status) + '20' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            { color: getStatusColor(inquiry.status) },
                          ]}
                        >
                          {inquiryService.getStatusLabel(inquiry.status)}
                        </Text>
                      </View>
                      <Text style={styles.inquiryDate}>
                        {formatDate(inquiry.createdAt)}
                      </Text>
                    </View>
                    <Text style={styles.inquiryCategory}>
                      {inquiryService.getCategoryLabel(inquiry.category)}
                    </Text>
                    <Text style={styles.inquiryTitle} numberOfLines={1}>
                      {inquiry.title}
                    </Text>
                    <Text style={styles.inquiryContent} numberOfLines={2}>
                      {inquiry.content}
                    </Text>
                    {inquiry.reply && (
                      <View style={styles.replyBadge}>
                        <Ionicons
                          name="chatbubble"
                          size={12}
                          color={colors.semantic.income}
                        />
                        <Text style={styles.replyBadgeText}>답변 있음</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      )}

      {/* 새 문의 작성 모달 */}
      <Modal
        visible={showNewInquiry}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          if (!isSubmitting) {
            setShowNewInquiry(false);
            resetForm();
          }
        }}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => {
                if (!isSubmitting) {
                  setShowNewInquiry(false);
                  resetForm();
                }
              }}
              disabled={isSubmitting}
            >
              <Text style={[styles.modalCancel, isSubmitting && { opacity: 0.5 }]}>
                취소
              </Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>새 문의</Text>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!canSubmit || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={colors.primary.main} />
              ) : (
                <Text
                  style={[
                    styles.modalSubmit,
                    !canSubmit && styles.modalSubmitDisabled,
                  ]}
                >
                  제출
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* 카테고리 선택 */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>문의 유형</Text>
              <TouchableOpacity
                style={styles.categorySelector}
                onPress={() => setShowCategoryPicker(true)}
              >
                <Ionicons
                  name={categories.find((c) => c.value === category)?.icon as any}
                  size={20}
                  color={colors.primary.main}
                />
                <Text style={styles.categorySelectorText}>
                  {categories.find((c) => c.value === category)?.label}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={20}
                  color={colors.text.tertiary}
                />
              </TouchableOpacity>
            </View>

            {/* 제목 */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>제목</Text>
              <TextInput
                style={styles.titleInput}
                placeholder="문의 제목을 입력하세요"
                placeholderTextColor={colors.text.tertiary}
                value={title}
                onChangeText={setTitle}
                editable={!isSubmitting}
                maxLength={100}
              />
            </View>

            {/* 내용 */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>내용</Text>
              <TextInput
                style={styles.contentInput}
                placeholder="문의 내용을 자세히 입력해주세요"
                placeholderTextColor={colors.text.tertiary}
                value={content}
                onChangeText={setContent}
                editable={!isSubmitting}
                multiline
                textAlignVertical="top"
                maxLength={2000}
              />
              <Text style={styles.charCount}>{content.length}/2000</Text>
            </View>
          </ScrollView>
        </SafeAreaView>

        {/* 카테고리 선택 모달 */}
        <Modal
          visible={showCategoryPicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowCategoryPicker(false)}
        >
          <TouchableOpacity
            style={styles.pickerOverlay}
            activeOpacity={1}
            onPress={() => setShowCategoryPicker(false)}
          >
            <View style={styles.pickerContent}>
              <Text style={styles.pickerTitle}>문의 유형 선택</Text>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.value}
                  style={[
                    styles.pickerItem,
                    category === cat.value && styles.pickerItemActive,
                  ]}
                  onPress={() => {
                    setCategory(cat.value);
                    setShowCategoryPicker(false);
                  }}
                >
                  <Ionicons
                    name={cat.icon as any}
                    size={20}
                    color={
                      category === cat.value
                        ? colors.primary.main
                        : colors.text.secondary
                    }
                  />
                  <Text
                    style={[
                      styles.pickerItemText,
                      category === cat.value && styles.pickerItemTextActive,
                    ]}
                  >
                    {cat.label}
                  </Text>
                  {category === cat.value && (
                    <Ionicons
                      name="checkmark"
                      size={20}
                      color={colors.primary.main}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>
      </Modal>

      {/* 문의 상세 모달 */}
      <Modal
        visible={!!selectedInquiry}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedInquiry(null)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setSelectedInquiry(null)}>
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>문의 상세</Text>
            <View style={{ width: 24 }} />
          </View>

          {selectedInquiry && (
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
            >
              {/* 상태 및 날짜 */}
              <View style={styles.detailHeader}>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(selectedInquiry.status) + '20' },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: getStatusColor(selectedInquiry.status) },
                    ]}
                  >
                    {inquiryService.getStatusLabel(selectedInquiry.status)}
                  </Text>
                </View>
                <Text style={styles.detailDate}>
                  {formatDate(selectedInquiry.createdAt)}
                </Text>
              </View>

              {/* 카테고리 */}
              <Text style={styles.detailCategory}>
                {inquiryService.getCategoryLabel(selectedInquiry.category)}
              </Text>

              {/* 제목 */}
              <Text style={styles.detailTitle}>{selectedInquiry.title}</Text>

              {/* 내용 */}
              <View style={styles.detailContentBox}>
                <Text style={styles.detailContent}>{selectedInquiry.content}</Text>
              </View>

              {/* 답변 */}
              {selectedInquiry.reply && (
                <View style={styles.replyBox}>
                  <View style={styles.replyHeader}>
                    <Ionicons
                      name="chatbubble"
                      size={16}
                      color={colors.semantic.income}
                    />
                    <Text style={styles.replyHeaderText}>관리자 답변</Text>
                    {selectedInquiry.repliedAt && (
                      <Text style={styles.replyDate}>
                        {formatDate(selectedInquiry.repliedAt)}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.replyContent}>{selectedInquiry.reply}</Text>
                </View>
              )}
            </ScrollView>
          )}
        </SafeAreaView>
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
  addButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['3xl'],
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    marginBottom: spacing.xl,
  },
  emptyButton: {
    backgroundColor: colors.primary.main,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.base,
  },
  emptyButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.inverse,
  },
  sectionTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  inquiryList: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  inquiryItem: {
    padding: spacing.base,
  },
  inquiryItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  inquiryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
  },
  inquiryDate: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
  },
  inquiryCategory: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    marginBottom: spacing.xs,
  },
  inquiryTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  inquiryContent: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  replyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  replyBadgeText: {
    fontSize: typography.fontSize.xs,
    color: colors.semantic.income,
    fontWeight: typography.fontWeight.medium,
  },
  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    backgroundColor: colors.background.secondary,
  },
  modalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
  },
  modalCancel: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
  },
  modalSubmit: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.primary.main,
  },
  modalSubmitDisabled: {
    color: colors.text.tertiary,
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    padding: spacing.lg,
  },
  formGroup: {
    marginBottom: spacing.xl,
  },
  formLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  categorySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.base,
    padding: spacing.base,
    gap: spacing.sm,
    ...shadows.sm,
  },
  categorySelectorText: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
  },
  titleInput: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.base,
    padding: spacing.base,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    ...shadows.sm,
  },
  contentInput: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.base,
    padding: spacing.base,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    minHeight: 200,
    ...shadows.sm,
  },
  charCount: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  // Category Picker
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  pickerContent: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 320,
  },
  pickerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.base,
    gap: spacing.sm,
  },
  pickerItemActive: {
    backgroundColor: colors.primary.light + '20',
  },
  pickerItemText: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
  },
  pickerItemTextActive: {
    color: colors.primary.main,
    fontWeight: typography.fontWeight.medium,
  },
  // Detail
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  detailDate: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  },
  detailCategory: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    marginBottom: spacing.sm,
  },
  detailTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
    marginBottom: spacing.lg,
  },
  detailContentBox: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    ...shadows.sm,
  },
  detailContent: {
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    lineHeight: 24,
  },
  replyBox: {
    backgroundColor: colors.semantic.income + '10',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: colors.semantic.income,
  },
  replyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  replyHeaderText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.semantic.income,
  },
  replyDate: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
  },
  replyContent: {
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    lineHeight: 24,
  },
});
