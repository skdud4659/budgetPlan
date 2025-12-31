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
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography, spacing, borderRadius, shadows } from "../styles";
import type {
  TransactionType,
  BudgetType,
  Category,
  Asset,
  Transaction,
} from "../types";
import { categoryService } from "../services/categoryService";
import { assetService } from "../services/assetService";
import { transactionService } from "../services/transactionService";
import { settingsService } from "../services/settingsService";
import ConfirmModal from "./ConfirmModal";
import AddCategoryModal from "./AddCategoryModal";
import type { CategoryType } from "../types";

interface AddTransactionSheetProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  editTransaction?: Transaction | null;
  defaultAssetId?: string | null;
  defaultType?: TransactionType;
  defaultAmount?: number;
  defaultTitle?: string;
  installmentMode?: boolean; // 할부 추가 모드 (할부 토글 기본 활성화)
}

interface TransactionFormData {
  title: string;
  amount: string;
  type: TransactionType;
  budgetType: BudgetType;
  categoryId: string | null;
  assetId: string | null;
  toAssetId: string | null;
  note: string;
  date: string;
  // 할부 관련 필드
  isInstallment: boolean;
  totalTerm: string;
  currentTerm: string;
  installmentDay: string;
  includeInLivingExpense: boolean;
}

export default function AddTransactionSheet({
  visible,
  onClose,
  onSuccess,
  editTransaction,
  defaultAssetId,
  defaultType,
  defaultAmount,
  defaultTitle,
  installmentMode,
}: AddTransactionSheetProps) {
  const isEditMode = !!editTransaction;

  // 월별 할부 거래인지 확인 (installmentId가 있으면 월별 거래)
  const isMonthlyInstallment = editTransaction?.isInstallment && editTransaction?.installmentId;
  // 마스터 할부인지 확인 (isInstallment가 true이고 installmentId가 없으면 마스터)
  const isMasterInstallment = editTransaction?.isInstallment && !editTransaction?.installmentId;

  const getInitialFormData = (): TransactionFormData => {
    // 월별 할부 거래는 이미 월별 금액이 저장되어 있음
    let displayAmount = editTransaction?.amount?.toString() || defaultAmount?.toString() || "";

    // 마스터 할부 수정 시에만 월별 금액으로 변환 (할부 탭에서 수정하는 경우)
    if (isMasterInstallment && editTransaction.totalTerm && editTransaction.totalTerm > 0) {
      const monthlyAmount = Math.round(editTransaction.amount / editTransaction.totalTerm);
      displayAmount = monthlyAmount.toString();
    }

    return {
      title: editTransaction?.title || defaultTitle || "",
      amount: displayAmount,
      type: editTransaction?.type || defaultType || "expense",
      budgetType: editTransaction?.budgetType || "personal",
      categoryId: editTransaction?.categoryId || null,
      assetId: editTransaction?.assetId || null,
      toAssetId: editTransaction?.toAssetId || null,
      note: editTransaction?.note || "",
      date: editTransaction?.date || new Date().toISOString().split("T")[0],
      // 할부 관련 초기값 - installmentMode이거나 트랜잭션에서 읽어옴
      isInstallment: editTransaction?.isInstallment || installmentMode || false,
      totalTerm: editTransaction?.totalTerm?.toString() || "",
      currentTerm: editTransaction?.currentTerm?.toString() || "1",
      installmentDay:
        editTransaction?.installmentDay?.toString() ||
        new Date().getDate().toString(),
      includeInLivingExpense: editTransaction?.includeInLivingExpense ?? true,
    };
  };

  const [formData, setFormData] = useState<TransactionFormData>(
    getInitialFormData()
  );

  const [categories, setCategories] = useState<Category[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showAssetDropdown, setShowAssetDropdown] = useState(false);
  const [showToAssetDropdown, setShowToAssetDropdown] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTargetTitle, setDeleteTargetTitle] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [jointBudgetEnabled, setJointBudgetEnabled] = useState(false);
  const [alertModal, setAlertModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
  }>({ visible: false, title: "", message: "" });
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);

  const showAlert = (title: string, message: string) => {
    setAlertModal({ visible: true, title, message });
  };

  // 현재 트랜잭션 타입에 따른 카테고리 타입 반환
  const getCurrentCategoryType = (): CategoryType => {
    return formData.type === "income" ? "income" : "expense";
  };

  // 카테고리 추가 성공 시 핸들러
  const handleCategoryAdded = async (categoryId: string) => {
    // 새로 생성된 카테고리를 선택하고 카테고리 목록 새로고침
    await loadData();
    setFormData((prev) => ({ ...prev, categoryId }));
  };

  // 폼 데이터 초기화 (visible, editTransaction, installmentMode 변경 시)
  useEffect(() => {
    if (visible) {
      setFormData(getInitialFormData());
      // 수정 모드일 때는 해당 거래의 날짜 월로, 아니면 오늘 날짜 월로 설정
      const initialDate = editTransaction?.date
        ? new Date(editTransaction.date)
        : new Date();
      setCalendarMonth(initialDate);
    }
  }, [visible, editTransaction, installmentMode]);

  // 데이터 로드
  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [categoriesData, assetsData, settings] = await Promise.all([
        categoryService.getCategories(),
        assetService.getAssets(),
        settingsService.getSettings(),
      ]);
      setCategories(categoriesData);
      setAssets(assetsData);
      setJointBudgetEnabled(settings.jointBudgetEnabled);

      // 수정 모드가 아닌 경우에만 기본 자산 적용
      // defaultAssetId prop이 있으면 우선 적용, 없으면 설정의 기본 자산 적용
      if (!editTransaction) {
        if (defaultAssetId) {
          setFormData((prev) => ({ ...prev, assetId: defaultAssetId }));
        } else if (settings.defaultAssetId) {
          setFormData((prev) => ({
            ...prev,
            assetId: settings.defaultAssetId,
          }));
        }
      }
    } catch (error) {
      console.error("데이터 로드 실패:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCategories = categories.filter(
    (c) => c.type === (formData.type === "income" ? "income" : "expense")
  );

  const handleSubmit = async () => {
    if (!formData.title || !formData.amount) {
      showAlert("알림", "내용과 금액을 입력해주세요.");
      return;
    }

    // 이체일 경우 출금/입금 자산 모두 필수
    if (formData.type === "transfer") {
      if (!formData.assetId || !formData.toAssetId) {
        showAlert("알림", "출금 자산과 입금 자산을 모두 선택해주세요.");
        return;
      }
      if (formData.assetId === formData.toAssetId) {
        showAlert("알림", "출금 자산과 입금 자산이 같을 수 없습니다.");
        return;
      }
    }

    // 할부일 경우 유효성 검사
    if (formData.isInstallment) {
      if (!formData.totalTerm || parseInt(formData.totalTerm, 10) <= 0) {
        showAlert("알림", "총 할부 개월을 입력해주세요.");
        return;
      }
    }

    try {
      setIsSaving(true);

      const amount = parseInt(formData.amount.replace(/,/g, ""), 10);

      if (isEditMode && editTransaction) {
        let saveAmount = amount;

        // 마스터 할부 수정 시에만 월별 금액을 총액으로 변환
        if (isMasterInstallment && editTransaction.totalTerm && editTransaction.totalTerm > 0) {
          saveAmount = amount * editTransaction.totalTerm;
        }
        // 월별 할부 거래는 입력값 그대로 저장

        const updateData: any = {
          title: formData.title,
          amount: saveAmount,
          categoryId: formData.categoryId,
          assetId: formData.assetId,
          budgetType: formData.budgetType,
          note: formData.note || null,
          includeInLivingExpense: formData.includeInLivingExpense,
        };

        // 일반 거래 또는 월별 할부 거래: 날짜 등 수정 가능
        if (!isMasterInstallment) {
          updateData.date = formData.date;
          updateData.type = formData.type as TransactionType;
          updateData.toAssetId = formData.type === "transfer" ? formData.toAssetId : null;
        }

        await transactionService.updateTransaction(editTransaction.id, updateData);
      } else {
        // 신규 거래 생성 (일반 + 할부)
        const transactionData = {
          title: formData.title,
          amount: amount,
          date: formData.date,
          type: formData.type as TransactionType,
          budgetType: formData.budgetType,
          categoryId: formData.categoryId,
          assetId: formData.assetId,
          toAssetId: formData.type === "transfer" ? formData.toAssetId : null,
          note: formData.note || null,
          // 할부 관련 필드
          isInstallment: formData.isInstallment,
          totalTerm: formData.isInstallment
            ? parseInt(formData.totalTerm, 10)
            : null,
          currentTerm: formData.isInstallment
            ? parseInt(formData.currentTerm || "1", 10)
            : null,
          installmentDay: formData.isInstallment
            ? parseInt(formData.installmentDay, 10)
            : null,
          includeInLivingExpense: formData.includeInLivingExpense,
        };

        await transactionService.createTransaction(transactionData);
      }
      onSuccess?.();
      handleClose();
    } catch (error: any) {
      console.error("거래 저장 실패:", error);
      showAlert(
        "저장 실패",
        error?.message || "거래를 저장하는데 실패했습니다."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setFormData({
      title: "",
      amount: "",
      type: "expense",
      budgetType: "personal",
      categoryId: null,
      assetId: null,
      toAssetId: null,
      note: "",
      date: new Date().toISOString().split("T")[0],
      isInstallment: false,
      totalTerm: "",
      currentTerm: "1",
      installmentDay: new Date().getDate().toString(),
      includeInLivingExpense: true,
    });
    setShowAssetDropdown(false);
    setShowToAssetDropdown(false);
    setCalendarMonth(new Date());
    setShowCalendar(false);
    setShowDeleteConfirm(false);
    onClose();
  };

  const handleDelete = async () => {
    if (!editTransaction) return;

    const transactionId = editTransaction.id;

    // 먼저 모달을 닫고 시트도 닫음
    setShowDeleteConfirm(false);
    handleClose();

    try {
      setIsDeleting(true);

      // 마스터 할부 삭제 시 모든 월별 거래도 함께 삭제
      if (isMasterInstallment) {
        await transactionService.deleteInstallmentWithAllTransactions(transactionId);
      } else {
        // 일반 거래 또는 월별 할부 거래: 해당 거래만 삭제
        await transactionService.deleteTransaction(transactionId);
      }

      onSuccess?.();
    } catch (error: any) {
      console.error("거래 삭제 실패:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatAmount = (value: string) => {
    const num = value.replace(/[^0-9]/g, "");
    if (!num) return "";
    return parseInt(num, 10).toLocaleString("ko-KR");
  };

  const selectedAsset = assets.find((a) => a.id === formData.assetId);
  const selectedToAsset = assets.find((a) => a.id === formData.toAssetId);

  // 날짜 관련 헬퍼 함수
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayOfWeek = ["일", "월", "화", "수", "목", "금", "토"][date.getDay()];
    return `${year}년 ${month}월 ${day}일 (${dayOfWeek})`;
  };

  const getDateString = (daysOffset: number) => {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    return date.toISOString().split("T")[0];
  };

  const generateCalendarDays = (monthDate: Date): (number | null)[] => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    const days: (number | null)[] = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const getAssetIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case "card":
        return "card";
      case "cash":
        return "cash";
      case "bank":
        return "business";
      case "savings":
        return "wallet";
      default:
        return "wallet";
    }
  };

  return (
    <>
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
            onPress={handleClose}
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
                disabled={isSaving}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color={isSaving ? colors.text.tertiary : colors.text.primary}
                />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>
                {isEditMode
                  ? (editTransaction?.isInstallment ? "할부 수정" : "거래 수정")
                  : (installmentMode ? "할부 추가" : "거래 추가")}
              </Text>
              <View style={styles.headerActions}>
                {/* 삭제 버튼 */}
                {isEditMode && (
                  <TouchableOpacity
                    onPress={() => {
                      setDeleteTargetTitle(editTransaction?.title || "");
                      setShowDeleteConfirm(true);
                    }}
                    style={styles.headerIconButton}
                    disabled={isSaving}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={22}
                      color={
                        isSaving
                          ? colors.text.tertiary
                          : colors.semantic.expense
                      }
                    />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={handleSubmit}
                  style={[
                    styles.headerIconButton,
                    (!formData.title || !formData.amount || isSaving) &&
                      styles.headerIconButtonDisabled,
                  ]}
                  disabled={!formData.title || !formData.amount || isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator
                      size="small"
                      color={colors.primary.main}
                    />
                  ) : (
                    <Ionicons
                      name="checkmark"
                      size={24}
                      color={
                        formData.title && formData.amount
                          ? colors.primary.main
                          : colors.text.tertiary
                      }
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
              {/* 월별 할부 거래 수정 시 회차 정보 표시 */}
              {isEditMode && isMonthlyInstallment && (
                <View style={styles.installmentInfoBanner}>
                  <View style={styles.installmentInfoLeft}>
                    <Ionicons name="card-outline" size={20} color={colors.primary.main} />
                    <View>
                      <Text style={styles.installmentInfoTitle}>
                        {editTransaction.currentTerm}/{editTransaction.totalTerm}회차 할부
                      </Text>
                      <Text style={styles.installmentInfoSubtitle}>
                        매월 {editTransaction.installmentDay}일
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* 월별 할부 거래 수정 안내 */}
              {isEditMode && isMonthlyInstallment && (
                <View style={styles.installmentNotice}>
                  <Ionicons name="information-circle-outline" size={18} color={colors.text.tertiary} />
                  <Text style={styles.installmentNoticeText}>
                    이 달의 할부 금액만 수정됩니다. 다른 달에는 영향을 주지 않습니다.
                  </Text>
                </View>
              )}

              {/* 마스터 할부 수정 시 회차 정보 표시 */}
              {isEditMode && isMasterInstallment && (
                <View style={styles.installmentInfoBanner}>
                  <View style={styles.installmentInfoLeft}>
                    <Ionicons name="card-outline" size={20} color={colors.primary.main} />
                    <View>
                      <Text style={styles.installmentInfoTitle}>
                        할부 기본 정보 수정
                      </Text>
                      <Text style={styles.installmentInfoSubtitle}>
                        {editTransaction.totalTerm}개월 · 매월 {editTransaction.installmentDay}일 납부
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* 마스터 할부 수정 안내 */}
              {isEditMode && isMasterInstallment && (
                <View style={styles.installmentNotice}>
                  <Ionicons name="information-circle-outline" size={18} color={colors.text.tertiary} />
                  <Text style={styles.installmentNoticeText}>
                    수정 시 이미 생성된 월별 거래에는 영향을 주지 않습니다. 삭제 시 모든 월별 거래가 함께 삭제됩니다.
                  </Text>
                </View>
              )}

              {/* Transaction Type - 할부 모드 또는 할부 수정 시 숨김 */}
              {!installmentMode && !(isEditMode && editTransaction?.isInstallment) && (
                <View style={styles.typeSelector}>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      formData.type === "expense" &&
                        styles.typeButtonActiveExpense,
                    ]}
                    onPress={() =>
                      setFormData({
                        ...formData,
                        type: "expense",
                        categoryId: null,
                      })
                    }
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        formData.type === "expense" &&
                          styles.typeButtonTextActive,
                      ]}
                    >
                      지출
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      formData.type === "income" && styles.typeButtonActiveIncome,
                    ]}
                    onPress={() =>
                      setFormData({
                        ...formData,
                        type: "income",
                        categoryId: null,
                        isInstallment: false,
                      })
                    }
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        formData.type === "income" && styles.typeButtonTextActive,
                      ]}
                    >
                      수입
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      formData.type === "transfer" &&
                        styles.typeButtonActiveTransfer,
                    ]}
                    onPress={() =>
                      setFormData({
                        ...formData,
                        type: "transfer",
                        categoryId: null,
                        isInstallment: false,
                      })
                    }
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        formData.type === "transfer" &&
                          styles.typeButtonTextActive,
                      ]}
                    >
                      이체
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Installment Toggle - 지출일 때만 표시, 할부 모드/수정 시 숨김 */}
              {formData.type === "expense" && !installmentMode && !(isEditMode && editTransaction?.isInstallment) && (
                <View style={styles.switchGroup}>
                  <View style={styles.switchLeft}>
                    <Text style={styles.switchLabel}>할부로 결제</Text>
                    <Text style={styles.switchDescription}>
                      할부 결제인 경우 활성화하세요
                    </Text>
                  </View>
                  <Switch
                    value={formData.isInstallment}
                    onValueChange={(value) =>
                      setFormData({ ...formData, isInstallment: value })
                    }
                    trackColor={{
                      false: colors.border.medium,
                      true: colors.primary.light,
                    }}
                    thumbColor={
                      formData.isInstallment
                        ? colors.primary.main
                        : colors.background.secondary
                    }
                  />
                </View>
              )}

              {/* Amount Input */}
              <View style={styles.amountContainer}>
                <Text style={styles.amountPrefix}>
                  {formData.type === "income"
                    ? "+"
                    : formData.type === "expense"
                    ? "-"
                    : ""}
                </Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0"
                  placeholderTextColor={colors.text.tertiary}
                  value={formatAmount(formData.amount)}
                  onChangeText={(text) =>
                    setFormData({
                      ...formData,
                      amount: text.replace(/[^0-9]/g, ""),
                    })
                  }
                  keyboardType="numeric"
                />
                <Text style={styles.amountSuffix}>원</Text>
              </View>

              {/* Date Selection - 할부가 아닌 경우에만 표시 */}
              {!formData.isInstallment && (
                <View style={styles.dateSection}>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowCalendar(!showCalendar)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.dateButtonLeft}>
                      <Ionicons
                        name="calendar-outline"
                        size={18}
                        color={colors.primary.main}
                      />
                      <Text style={styles.dateButtonText}>
                        {formatDate(formData.date)}
                      </Text>
                    </View>
                    <Ionicons
                      name={showCalendar ? "chevron-up" : "chevron-down"}
                      size={20}
                      color={colors.text.tertiary}
                    />
                  </TouchableOpacity>

                  {showCalendar && (
                    <>
                      {/* 간편 날짜 선택 버튼 */}
                      <View style={styles.quickDateRow}>
                        <TouchableOpacity
                          style={[
                            styles.quickDateButton,
                            formData.date === getDateString(0) &&
                              styles.quickDateButtonActive,
                          ]}
                          onPress={() =>
                            setFormData({ ...formData, date: getDateString(0) })
                          }
                        >
                          <Text
                            style={[
                              styles.quickDateText,
                              formData.date === getDateString(0) &&
                                styles.quickDateTextActive,
                            ]}
                          >
                            오늘
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.quickDateButton,
                            formData.date === getDateString(-1) &&
                              styles.quickDateButtonActive,
                          ]}
                          onPress={() =>
                            setFormData({
                              ...formData,
                              date: getDateString(-1),
                            })
                          }
                        >
                          <Text
                            style={[
                              styles.quickDateText,
                              formData.date === getDateString(-1) &&
                                styles.quickDateTextActive,
                            ]}
                          >
                            어제
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.quickDateButton,
                            formData.date === getDateString(-2) &&
                              styles.quickDateButtonActive,
                          ]}
                          onPress={() =>
                            setFormData({
                              ...formData,
                              date: getDateString(-2),
                            })
                          }
                        >
                          <Text
                            style={[
                              styles.quickDateText,
                              formData.date === getDateString(-2) &&
                                styles.quickDateTextActive,
                            ]}
                          >
                            그저께
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {/* 달력 날짜 선택기 */}
                      <View style={styles.calendarPicker}>
                        <View style={styles.calendarHeader}>
                          <TouchableOpacity
                            onPress={() => {
                              const newMonth = new Date(calendarMonth);
                              newMonth.setMonth(newMonth.getMonth() - 1);
                              setCalendarMonth(newMonth);
                            }}
                          >
                            <Ionicons
                              name="chevron-back"
                              size={24}
                              color={colors.text.secondary}
                            />
                          </TouchableOpacity>
                          <Text style={styles.calendarMonthText}>
                            {calendarMonth.getFullYear()}년{" "}
                            {calendarMonth.getMonth() + 1}월
                          </Text>
                          <TouchableOpacity
                            onPress={() => {
                              const newMonth = new Date(calendarMonth);
                              newMonth.setMonth(newMonth.getMonth() + 1);
                              setCalendarMonth(newMonth);
                            }}
                          >
                            <Ionicons
                              name="chevron-forward"
                              size={24}
                              color={colors.text.secondary}
                            />
                          </TouchableOpacity>
                        </View>

                        <View style={styles.weekdayHeader}>
                          {["일", "월", "화", "수", "목", "금", "토"].map(
                            (day, idx) => (
                              <Text
                                key={day}
                                style={[
                                  styles.weekdayText,
                                  idx === 0 && styles.weekdaySunday,
                                  idx === 6 && styles.weekdaySaturday,
                                ]}
                              >
                                {day}
                              </Text>
                            )
                          )}
                        </View>

                        <View style={styles.calendarGrid}>
                          {generateCalendarDays(calendarMonth).map(
                            (day, index) => {
                              if (day === null) {
                                return (
                                  <View
                                    key={`empty-${index}`}
                                    style={styles.calendarDayEmpty}
                                  />
                                );
                              }
                              const dateStr = `${calendarMonth.getFullYear()}-${String(
                                calendarMonth.getMonth() + 1
                              ).padStart(2, "0")}-${String(day).padStart(
                                2,
                                "0"
                              )}`;
                              const isSelected = formData.date === dateStr;
                              const dayOfWeek = new Date(dateStr).getDay();

                              return (
                                <TouchableOpacity
                                  key={`day-${day}`}
                                  style={[
                                    styles.calendarDay,
                                    isSelected && styles.calendarDaySelected,
                                  ]}
                                  onPress={() => {
                                    setFormData({ ...formData, date: dateStr });
                                    setShowCalendar(false);
                                  }}
                                >
                                  <Text
                                    style={[
                                      styles.calendarDayText,
                                      isSelected &&
                                        styles.calendarDayTextSelected,
                                      !isSelected &&
                                        dayOfWeek === 0 &&
                                        styles.calendarDaySunday,
                                      !isSelected &&
                                        dayOfWeek === 6 &&
                                        styles.calendarDaySaturday,
                                    ]}
                                  >
                                    {day}
                                  </Text>
                                </TouchableOpacity>
                              );
                            }
                          )}
                        </View>
                      </View>
                    </>
                  )}
                </View>
              )}

              {/* 할부 납부일 - 날짜 선택 대신 표시 (할부 신규 생성 시) */}
              {formData.isInstallment && !isEditMode && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>납부일</Text>
                  <View style={styles.dayRow}>
                    <Text style={styles.dayPrefix}>매월</Text>
                    <TextInput
                      style={[styles.textInput, styles.dayInput]}
                      placeholder="15"
                      placeholderTextColor={colors.text.tertiary}
                      value={formData.installmentDay}
                      onChangeText={(text) => {
                        const num = text.replace(/[^0-9]/g, "");
                        if (parseInt(num, 10) <= 31 || num === "") {
                          setFormData({ ...formData, installmentDay: num });
                        }
                      }}
                      keyboardType="numeric"
                      maxLength={2}
                    />
                    <Text style={styles.daySuffix}>일</Text>
                  </View>
                </View>
              )}

              {/* Title Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>내용</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="거래 내용을 입력하세요"
                  placeholderTextColor={colors.text.tertiary}
                  value={formData.title}
                  onChangeText={(text) =>
                    setFormData({ ...formData, title: text })
                  }
                />
              </View>

              {/* Budget Type (Only for expense/income, and only when joint budget is enabled) */}
              {formData.type !== "transfer" && jointBudgetEnabled && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>예산 구분</Text>
                  <View style={styles.budgetTypeSelector}>
                    <TouchableOpacity
                      style={[
                        styles.budgetTypeButton,
                        formData.budgetType === "personal" &&
                          styles.budgetTypeButtonActive,
                      ]}
                      onPress={() =>
                        setFormData({ ...formData, budgetType: "personal" })
                      }
                    >
                      <Text
                        style={[
                          styles.budgetTypeButtonText,
                          formData.budgetType === "personal" &&
                            styles.budgetTypeButtonTextActive,
                        ]}
                      >
                        개인
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.budgetTypeButton,
                        formData.budgetType === "joint" &&
                          styles.budgetTypeButtonActiveJoint,
                      ]}
                      onPress={() =>
                        setFormData({ ...formData, budgetType: "joint" })
                      }
                    >
                      <Text
                        style={[
                          styles.budgetTypeButtonText,
                          formData.budgetType === "joint" &&
                            styles.budgetTypeButtonTextActive,
                        ]}
                      >
                        공동
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Category Selection */}
              {formData.type !== "transfer" && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>카테고리</Text>
                  {isLoading ? (
                    <ActivityIndicator
                      size="small"
                      color={colors.primary.main}
                    />
                  ) : (
                    <View style={styles.categoryGrid}>
                      {filteredCategories.map((category) => (
                        <TouchableOpacity
                          key={category.id}
                          style={[
                            styles.categoryItem,
                            formData.categoryId === category.id &&
                              styles.categoryItemActive,
                          ]}
                          onPress={() =>
                            setFormData({
                              ...formData,
                              categoryId: category.id,
                            })
                          }
                        >
                          <View
                            style={[
                              styles.categoryIcon,
                              { backgroundColor: category.color + "30" },
                              formData.categoryId === category.id && {
                                backgroundColor: category.color,
                              },
                            ]}
                          >
                            <Ionicons
                              name={
                                category.iconName as keyof typeof Ionicons.glyphMap
                              }
                              size={18}
                              color={
                                formData.categoryId === category.id
                                  ? colors.text.inverse
                                  : category.color
                              }
                            />
                          </View>
                          <Text
                            style={[
                              styles.categoryName,
                              formData.categoryId === category.id &&
                                styles.categoryNameActive,
                            ]}
                          >
                            {category.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
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
                  )}
                </View>
              )}

              {/* Asset Selection - Dropdown */}
              {formData.type === "transfer" ? (
                <View style={styles.transferAssetContainer}>
                  {/* 출금 자산 */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>출금 자산</Text>
                    <TouchableOpacity
                      style={styles.dropdownButton}
                      onPress={() => setShowAssetDropdown(!showAssetDropdown)}
                    >
                      {selectedAsset ? (
                        <View style={styles.dropdownSelectedRow}>
                          <Ionicons
                            name={getAssetIcon(selectedAsset.type)}
                            size={18}
                            color={colors.text.primary}
                          />
                          <Text style={styles.dropdownSelectedText}>
                            {selectedAsset.name}
                          </Text>
                        </View>
                      ) : (
                        <Text style={styles.dropdownPlaceholder}>
                          자산을 선택하세요
                        </Text>
                      )}
                      <Ionicons
                        name={showAssetDropdown ? "chevron-up" : "chevron-down"}
                        size={20}
                        color={colors.text.tertiary}
                      />
                    </TouchableOpacity>

                    {showAssetDropdown && (
                      <View style={styles.dropdownList}>
                        {assets.map((asset) => (
                          <TouchableOpacity
                            key={asset.id}
                            style={[
                              styles.dropdownItem,
                              formData.assetId === asset.id &&
                                styles.dropdownItemActive,
                            ]}
                            onPress={() => {
                              setFormData({ ...formData, assetId: asset.id });
                              setShowAssetDropdown(false);
                            }}
                          >
                            <Ionicons
                              name={getAssetIcon(asset.type)}
                              size={18}
                              color={
                                formData.assetId === asset.id
                                  ? colors.primary.main
                                  : colors.text.secondary
                              }
                            />
                            <Text
                              style={[
                                styles.dropdownItemText,
                                formData.assetId === asset.id &&
                                  styles.dropdownItemTextActive,
                              ]}
                            >
                              {asset.name}
                            </Text>
                            {formData.assetId === asset.id && (
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

                  {/* Swap Divider */}
                  <View style={styles.swapDividerContainer}>
                    <View style={styles.swapDividerLine} />
                    <TouchableOpacity
                      style={styles.swapButton}
                      onPress={() => {
                        setFormData({
                          ...formData,
                          assetId: formData.toAssetId,
                          toAssetId: formData.assetId,
                        });
                      }}
                    >
                      <Ionicons
                        name="swap-vertical"
                        size={18}
                        color={colors.primary.main}
                      />
                    </TouchableOpacity>
                    <View style={styles.swapDividerLine} />
                  </View>

                  {/* 입금 자산 */}
                  <View style={[styles.inputGroup, { marginBottom: 0 }]}>
                    <Text style={styles.inputLabel}>입금 자산</Text>
                    <TouchableOpacity
                      style={styles.dropdownButton}
                      onPress={() =>
                        setShowToAssetDropdown(!showToAssetDropdown)
                      }
                    >
                      {selectedToAsset ? (
                        <View style={styles.dropdownSelectedRow}>
                          <Ionicons
                            name={getAssetIcon(selectedToAsset.type)}
                            size={18}
                            color={colors.text.primary}
                          />
                          <Text style={styles.dropdownSelectedText}>
                            {selectedToAsset.name}
                          </Text>
                        </View>
                      ) : (
                        <Text style={styles.dropdownPlaceholder}>
                          입금할 자산을 선택하세요
                        </Text>
                      )}
                      <Ionicons
                        name={
                          showToAssetDropdown ? "chevron-up" : "chevron-down"
                        }
                        size={20}
                        color={colors.text.tertiary}
                      />
                    </TouchableOpacity>

                    {showToAssetDropdown && (
                      <View style={styles.dropdownList}>
                        {assets
                          .filter((asset) => asset.id !== formData.assetId)
                          .map((asset) => (
                            <TouchableOpacity
                              key={asset.id}
                              style={[
                                styles.dropdownItem,
                                formData.toAssetId === asset.id &&
                                  styles.dropdownItemActive,
                              ]}
                              onPress={() => {
                                setFormData({
                                  ...formData,
                                  toAssetId: asset.id,
                                });
                                setShowToAssetDropdown(false);
                              }}
                            >
                              <Ionicons
                                name={getAssetIcon(asset.type)}
                                size={18}
                                color={
                                  formData.toAssetId === asset.id
                                    ? colors.primary.main
                                    : colors.text.secondary
                                }
                              />
                              <Text
                                style={[
                                  styles.dropdownItemText,
                                  formData.toAssetId === asset.id &&
                                    styles.dropdownItemTextActive,
                                ]}
                              >
                                {asset.name}
                              </Text>
                              {formData.toAssetId === asset.id && (
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
                </View>
              ) : (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>자산</Text>
                  <TouchableOpacity
                    style={styles.dropdownButton}
                    onPress={() => setShowAssetDropdown(!showAssetDropdown)}
                  >
                    {selectedAsset ? (
                      <View style={styles.dropdownSelectedRow}>
                        <Ionicons
                          name={getAssetIcon(selectedAsset.type)}
                          size={18}
                          color={colors.text.primary}
                        />
                        <Text style={styles.dropdownSelectedText}>
                          {selectedAsset.name}
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.dropdownPlaceholder}>
                        자산을 선택하세요
                      </Text>
                    )}
                    <Ionicons
                      name={showAssetDropdown ? "chevron-up" : "chevron-down"}
                      size={20}
                      color={colors.text.tertiary}
                    />
                  </TouchableOpacity>

                  {showAssetDropdown && (
                    <View style={styles.dropdownList}>
                      {assets.map((asset) => (
                        <TouchableOpacity
                          key={asset.id}
                          style={[
                            styles.dropdownItem,
                            formData.assetId === asset.id &&
                              styles.dropdownItemActive,
                          ]}
                          onPress={() => {
                            setFormData({ ...formData, assetId: asset.id });
                            setShowAssetDropdown(false);
                          }}
                        >
                          <Ionicons
                            name={getAssetIcon(asset.type)}
                            size={18}
                            color={
                              formData.assetId === asset.id
                                ? colors.primary.main
                                : colors.text.secondary
                            }
                          />
                          <Text
                            style={[
                              styles.dropdownItemText,
                              formData.assetId === asset.id &&
                                styles.dropdownItemTextActive,
                            ]}
                          >
                            {asset.name}
                          </Text>
                          {formData.assetId === asset.id && (
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

              {/* Installment Fields - 할부 신규 생성 시에만 표시 (수정 시에는 숨김) */}
              {formData.isInstallment && !isEditMode && (
                <>
                  {/* 총 할부 개월 */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>총 할부 개월</Text>
                    <View style={styles.termRow}>
                      <TextInput
                        style={[styles.textInput, styles.termInput]}
                        placeholder="12"
                        placeholderTextColor={colors.text.tertiary}
                        value={formData.totalTerm}
                        onChangeText={(text) =>
                          setFormData({
                            ...formData,
                            totalTerm: text.replace(/[^0-9]/g, ""),
                          })
                        }
                        keyboardType="numeric"
                        maxLength={3}
                      />
                      <Text style={styles.termSuffix}>개월</Text>
                    </View>
                    {formData.amount &&
                      formData.totalTerm &&
                      parseInt(formData.totalTerm, 10) > 0 && (
                        <Text style={styles.monthlyAmountHint}>
                          월{" "}
                          {formatAmount(
                            Math.round(
                              parseInt(formData.amount.replace(/,/g, ""), 10) /
                                parseInt(formData.totalTerm, 10)
                            ).toString()
                          )}
                          원 납부
                        </Text>
                      )}
                  </View>

                  {/* 현재 회차 */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>현재 회차</Text>
                    <View style={styles.termRow}>
                      <TextInput
                        style={[styles.textInput, styles.termInput]}
                        placeholder="1"
                        placeholderTextColor={colors.text.tertiary}
                        value={formData.currentTerm}
                        onChangeText={(text) =>
                          setFormData({
                            ...formData,
                            currentTerm: text.replace(/[^0-9]/g, ""),
                          })
                        }
                        keyboardType="numeric"
                        maxLength={3}
                      />
                      <Text style={styles.termSuffix}>회차</Text>
                    </View>
                    <Text style={styles.hintText}>
                      현재 납부 중인 회차를 입력하세요
                    </Text>
                  </View>

                </>
              )}

              {/* 생활비에 포함 여부 - 지출일 때만 표시 */}
              {formData.type === "expense" && (
                <View style={styles.switchGroup}>
                  <View style={styles.switchLeft}>
                    <Text style={styles.switchLabel}>생활비 예산에 포함</Text>
                    <Text style={styles.switchDescription}>
                      비활성화하면 생활비 지출에서 제외됩니다
                    </Text>
                  </View>
                  <Switch
                    value={formData.includeInLivingExpense}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        includeInLivingExpense: value,
                      })
                    }
                    trackColor={{
                      false: colors.border.medium,
                      true: colors.primary.light,
                    }}
                    thumbColor={
                      formData.includeInLivingExpense
                        ? colors.primary.main
                        : colors.background.secondary
                    }
                  />
                </View>
              )}

              {/* Note Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>메모</Text>
                <TextInput
                  style={[styles.textInput, styles.noteInput]}
                  placeholder="메모를 입력하세요 (선택)"
                  placeholderTextColor={colors.text.tertiary}
                  value={formData.note}
                  onChangeText={(text) =>
                    setFormData({ ...formData, note: text })
                  }
                  multiline
                  numberOfLines={3}
                />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 삭제 확인 모달 */}
      <ConfirmModal
        visible={showDeleteConfirm}
        title="거래 삭제"
        message={`"${deleteTargetTitle}"을(를) 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`}
        confirmText="삭제"
        cancelText="취소"
        isDestructive={true}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />

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

      {/* Add Category Modal */}
      <AddCategoryModal
        visible={showAddCategoryModal}
        categoryType={getCurrentCategoryType()}
        onClose={() => setShowAddCategoryModal(false)}
        onSuccess={handleCategoryAdded}
      />
    </>
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
    maxHeight: "90%",
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
  typeSelector: {
    flexDirection: "row",
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.base,
    padding: spacing.xs,
    marginBottom: spacing.lg,
  },
  typeButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: "center",
    borderRadius: borderRadius.sm,
  },
  typeButtonActiveExpense: {
    backgroundColor: colors.semantic.expense,
  },
  typeButtonActiveIncome: {
    backgroundColor: colors.semantic.income,
  },
  typeButtonActiveTransfer: {
    backgroundColor: colors.semantic.transfer,
  },
  typeButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
  },
  typeButtonTextActive: {
    color: colors.text.inverse,
  },
  amountContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
  },
  amountPrefix: {
    fontSize: typography.fontSize["2xl"],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.secondary,
    marginRight: spacing.xs,
  },
  amountInput: {
    fontSize: typography.fontSize["3xl"],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    minWidth: 100,
    textAlign: "center",
  },
  amountSuffix: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
    marginLeft: spacing.xs,
  },
  inputGroup: {
    marginBottom: spacing.lg,
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
  noteInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  budgetTypeSelector: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  budgetTypeButton: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: "center",
    borderRadius: borderRadius.base,
    backgroundColor: colors.background.tertiary,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  budgetTypeButtonActive: {
    backgroundColor: colors.primary.light + "30",
    borderColor: colors.primary.main,
  },
  budgetTypeButtonActiveJoint: {
    backgroundColor: colors.secondary.light + "50",
    borderColor: colors.secondary.main,
  },
  budgetTypeButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
  },
  budgetTypeButtonTextActive: {
    color: colors.text.primary,
    fontWeight: typography.fontWeight.semiBold,
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
  categoryItemActive: {},
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
  dropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.base,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  dropdownSelectedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  dropdownSelectedText: {
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
  },
  dropdownPlaceholder: {
    fontSize: typography.fontSize.base,
    color: colors.text.tertiary,
  },
  dropdownList: {
    marginTop: spacing.xs,
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.base,
    overflow: "hidden",
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  dropdownItemActive: {
    backgroundColor: colors.primary.light + "20",
  },
  dropdownItemText: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
  },
  dropdownItemTextActive: {
    color: colors.primary.main,
    fontWeight: typography.fontWeight.medium,
  },
  transferAssetContainer: {
    marginBottom: spacing.lg,
  },
  swapDividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: spacing.sm,
  },
  swapDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border.light,
  },
  swapButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary.light + "30",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: spacing.md,
  },
  // 할부 관련 스타일
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
  termRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  termInput: {
    width: 80,
    textAlign: "center",
  },
  termSuffix: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
  },
  hintText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
  monthlyAmountHint: {
    fontSize: typography.fontSize.sm,
    color: colors.primary.main,
    fontWeight: typography.fontWeight.medium,
    marginTop: spacing.xs,
  },
  switchGroup: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.base,
    padding: spacing.base,
    marginBottom: spacing.lg,
  },
  switchLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  switchLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  switchDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  // 날짜 선택 관련 스타일
  dateSection: {
    marginBottom: spacing.lg,
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.base,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  dateButtonLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  dateButtonText: {
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    fontWeight: typography.fontWeight.medium,
  },
  quickDateRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  quickDateButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: "center",
    borderRadius: borderRadius.base,
    backgroundColor: colors.background.tertiary,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  quickDateButtonActive: {
    backgroundColor: colors.primary.light + "30",
    borderColor: colors.primary.main,
  },
  quickDateText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
  },
  quickDateTextActive: {
    color: colors.primary.main,
    fontWeight: typography.fontWeight.semiBold,
  },
  calendarPicker: {
    marginTop: spacing.md,
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.base,
    padding: spacing.base,
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  calendarMonthText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
  },
  weekdayHeader: {
    flexDirection: "row",
    marginBottom: spacing.xs,
  },
  weekdayText: {
    flex: 1,
    textAlign: "center",
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.tertiary,
  },
  weekdaySunday: {
    color: colors.semantic.expense,
  },
  weekdaySaturday: {
    color: colors.primary.main,
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  calendarDayEmpty: {
    width: "14.28%",
    aspectRatio: 1,
  },
  calendarDay: {
    width: "14.28%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarDaySelected: {
    backgroundColor: colors.primary.main,
    borderRadius: 20,
  },
  calendarDayText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
  },
  calendarDayTextSelected: {
    color: colors.text.inverse,
    fontWeight: typography.fontWeight.semiBold,
  },
  calendarDaySunday: {
    color: colors.semantic.expense,
  },
  calendarDaySaturday: {
    color: colors.primary.main,
  },
  // 할부 수정 시 배너 스타일
  installmentInfoBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.primary.light + "20",
    borderRadius: borderRadius.base,
    padding: spacing.base,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary.light,
  },
  installmentInfoLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  installmentInfoTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.primary.main,
  },
  installmentInfoSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: 2,
  },
  installmentNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.base,
    padding: spacing.base,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  installmentNoticeText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    lineHeight: 18,
  },
});
