import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Swipeable } from "react-native-gesture-handler";
import {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
} from "../../src/styles";
import type {
  BudgetType,
  FixedItem,
  Transaction,
  TransactionType,
} from "../../src/types";
import { fixedItemService } from "../../src/services/fixedItemService";
import { settingsService } from "../../src/services/settingsService";
import { transactionService } from "../../src/services/transactionService";
import { useSettings } from "../../src/contexts/SettingsContext";
import AddTransactionSheet from "../../src/components/AddTransactionSheet";
import ConfirmModal from "../../src/components/ConfirmModal";
import JointBudgetOnboardingModal from "../../src/components/JointBudgetOnboardingModal";

type ViewMode = "list" | "calendar";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export default function HomeScreen() {
  const {
    settings,
    jointBudgetEnabled,
    monthStartDay,
    personalBudget,
    jointBudget,
    updateJointBudgetEnabled,
    updateBudgets,
    refreshSettings,
  } = useSettings();

  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedBudgetType, setSelectedBudgetType] = useState<
    "all" | BudgetType
  >("all");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [fixedItems, setFixedItems] = useState<FixedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 거래 추가/수정 모달
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);

  // 실제 거래 데이터
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // 예산 설정 모달
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [editingBudgetType, setEditingBudgetType] = useState<
    "all" | BudgetType
  >("personal");
  const [personalBudgetInput, setPersonalBudgetInput] = useState("");
  const [jointBudgetInput, setJointBudgetInput] = useState("");
  const [isSavingBudget, setIsSavingBudget] = useState(false);

  // 온보딩 모달
  const [showOnboarding, setShowOnboarding] = useState(false);

  // 데이터 로드
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const year = selectedMonth.getFullYear();
      const month = selectedMonth.getMonth() + 1;

      const items = await fixedItemService.getFixedItems();

      // 월 시작일 기준으로 거래 조회
      const monthlyTransactions = await transactionService.getTransactionsWithInstallmentsByStartDay(
        year,
        month,
        monthStartDay
      );

      setFixedItems(items);
      setTransactions(monthlyTransactions);

      // 온보딩 미완료 시 모달 표시
      if (settings && !settings.onboardingCompleted) {
        setShowOnboarding(true);
      }
    } catch (error) {
      console.error("데이터 로드 실패:", error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth, monthStartDay, settings]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 금액 포맷팅 (천 단위 콤마)
  const formatNumberWithComma = (value: string) => {
    const numbers = value.replace(/[^0-9]/g, "");
    if (!numbers) return "";
    return parseInt(numbers, 10).toLocaleString("ko-KR");
  };

  // 예산 설정 모달 열기
  const openBudgetModal = (type: "all" | BudgetType) => {
    setEditingBudgetType(type);
    setPersonalBudgetInput(
      personalBudget ? personalBudget.toLocaleString("ko-KR") : ""
    );
    setJointBudgetInput(
      jointBudget ? jointBudget.toLocaleString("ko-KR") : ""
    );
    setShowBudgetModal(true);
  };

  // 입력값 변경 핸들러
  const handlePersonalBudgetChange = (value: string) => {
    setPersonalBudgetInput(formatNumberWithComma(value));
  };

  const handleJointBudgetChange = (value: string) => {
    setJointBudgetInput(formatNumberWithComma(value));
  };

  // 예산 저장
  const saveBudget = async () => {
    if (isSavingBudget) return;

    try {
      setIsSavingBudget(true);
      const personalAmount =
        parseInt(personalBudgetInput.replace(/,/g, ""), 10) || 0;
      const jointAmount = parseInt(jointBudgetInput.replace(/,/g, ""), 10) || 0;

      if (editingBudgetType === "all") {
        await updateBudgets(personalAmount, jointAmount);
      } else if (editingBudgetType === "personal") {
        await updateBudgets(personalAmount, jointBudget);
      } else {
        await updateBudgets(personalBudget, jointAmount);
      }

      setShowBudgetModal(false);
    } catch (error: any) {
      console.error("예산 저장 실패:", error);
      alert("예산 저장 실패: " + (error?.message || "알 수 없는 오류"));
    } finally {
      setIsSavingBudget(false);
    }
  };

  const handlePrevMonth = () => {
    setSelectedMonth(
      new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1)
    );
  };

  const handleNextMonth = () => {
    setSelectedMonth(
      new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1)
    );
  };

  // 거래 수정
  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setShowAddTransaction(true);
  };

  // 거래 삭제 요청
  const handleDeleteTransaction = (transaction: Transaction) => {
    setDeleteTarget(transaction);
  };

  // 거래 삭제 확인
  const confirmDeleteTransaction = async () => {
    if (!deleteTarget) return;

    try {
      await transactionService.deleteTransaction(deleteTarget.id);
      loadData();
    } catch (error: any) {
      console.error("거래 삭제 실패:", error);
      alert("삭제 실패: " + (error?.message || "알 수 없는 오류"));
    } finally {
      setDeleteTarget(null);
    }
  };

  // 모달 닫기
  const handleCloseTransactionSheet = () => {
    setShowAddTransaction(false);
    setEditingTransaction(null);
  };

  // 온보딩 - 공동 예산 사용 선택
  const handleSelectJointBudget = async () => {
    try {
      await updateJointBudgetEnabled(true);
      await settingsService.updateSettings({ onboardingCompleted: true });
      await refreshSettings();
      setShowOnboarding(false);
    } catch (error) {
      console.error("설정 저장 실패:", error);
    }
  };

  // 온보딩 - 개인 예산만 사용 선택
  const handleSelectPersonalOnly = async () => {
    try {
      await updateJointBudgetEnabled(false);
      await settingsService.updateSettings({ onboardingCompleted: true });
      await refreshSettings();
      setShowOnboarding(false);
    } catch (error) {
      console.error("설정 저장 실패:", error);
    }
  };

  // 수입 합계 (실제 데이터)
  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  // 정기지출 합계: 고정비만 (fixed type만)
  const totalFixedExpense = fixedItems
    .filter((item) => item.type === "fixed")
    .reduce((sum, item) => sum + item.amount, 0);

  // 생활비 미포함 할부 합계 (월별 금액으로 계산)
  const nonLivingInstallmentExpense = transactions
    .filter((t) => t.isInstallment && t.type === "expense" && !t.includeInLivingExpense)
    .reduce((sum, t) => {
      const monthlyAmount = t.totalTerm && t.totalTerm > 0
        ? Math.round(t.amount / t.totalTerm)
        : t.amount;
      return sum + monthlyAmount;
    }, 0);

  // 할부 포함 여부 체크 함수 (생활비 포함 할부만 예산에 포함)
  const shouldIncludeInExpense = (t: Transaction) => {
    if (!t.isInstallment) return true; // 일반 지출은 항상 포함
    return t.includeInLivingExpense; // 할부는 생활비 포함 여부에 따라
  };

  // 거래 금액 계산 (할부는 월별 금액으로 나눔)
  const getTransactionAmount = (t: Transaction) => {
    if (t.isInstallment && t.totalTerm && t.totalTerm > 0) {
      return Math.round(t.amount / t.totalTerm); // 월별 할부금
    }
    return t.amount;
  };

  // 총 지출 = 일반 지출 (할부 토글에 따라 할부 제외/포함)
  const totalExpense = transactions
    .filter((t) => t.type === "expense" && shouldIncludeInExpense(t))
    .reduce((sum, t) => sum + getTransactionAmount(t), 0);

  // 개인 지출 (할부 토글에 따라 할부 제외/포함)
  const personalExpense = transactions
    .filter((t) => t.type === "expense" && t.budgetType === "personal" && shouldIncludeInExpense(t))
    .reduce((sum, t) => sum + getTransactionAmount(t), 0);

  // 공동 지출 (할부 토글에 따라 할부 제외/포함)
  const jointExpense = transactions
    .filter((t) => t.type === "expense" && t.budgetType === "joint" && shouldIncludeInExpense(t))
    .reduce((sum, t) => sum + getTransactionAmount(t), 0);

  // 필터별 예산 및 잔여 계산
  const getBudgetInfo = () => {
    if (selectedBudgetType === "all") {
      const totalBudgetAmount = personalBudget + jointBudget;
      return {
        budget: totalBudgetAmount,
        spent: totalExpense,
        remaining: totalBudgetAmount - totalExpense,
      };
    } else if (selectedBudgetType === "personal") {
      return {
        budget: personalBudget,
        spent: personalExpense,
        remaining: personalBudget - personalExpense,
      };
    } else {
      return {
        budget: jointBudget,
        spent: jointExpense,
        remaining: jointBudget - jointExpense,
      };
    }
  };

  const budgetInfo = getBudgetInfo();

  // 모든 거래 (할부 포함)
  const allTransactions = [...transactions].sort((a, b) => {
    // 날짜 기준 내림차순 정렬
    if (a.date !== b.date) {
      return b.date.localeCompare(a.date);
    }
    return b.createdAt.localeCompare(a.createdAt);
  });

  const filteredTransactions =
    selectedBudgetType === "all"
      ? allTransactions
      : allTransactions.filter((t) => t.budgetType === selectedBudgetType);

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("ko-KR") + "원";
  };

  const formatMonthYear = (date: Date) => {
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
  };

  // 캘린더 관련 함수들 - 할부 포함한 전체 거래 사용
  const allTransactionsByDate = allTransactions.reduce((acc, t) => {
    const date = t.date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(t);
    return acc;
  }, {} as Record<string, Transaction[]>);

  // 날짜별 수입/지출 합계 계산
  const getDateSummary = (dateStr: string) => {
    const dayTransactions = allTransactionsByDate[dateStr] || [];
    const income = dayTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    const expense = dayTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + getTransactionAmount(t), 0);
    const transfer = dayTransactions
      .filter((t) => t.type === "transfer")
      .reduce((sum, t) => sum + t.amount, 0);
    return {
      income,
      expense,
      transfer,
      hasTransactions: dayTransactions.length > 0,
    };
  };

  // 선택된 날짜 문자열 (YYYY-MM-DD 형식으로 로컬 시간 기준)
  const selectedDateStr = `${selectedDate.getFullYear()}-${String(
    selectedDate.getMonth() + 1
  ).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;
  const selectedDateTransactions = allTransactionsByDate[selectedDateStr] || [];

  const generateCalendarDays = () => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
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

  const calendarDays = generateCalendarDays();

  const isToday = (day: number) => {
    const today = new Date();
    return (
      today.getFullYear() === selectedMonth.getFullYear() &&
      today.getMonth() === selectedMonth.getMonth() &&
      today.getDate() === day
    );
  };

  const isSelectedDay = (day: number) => {
    return (
      selectedDate.getFullYear() === selectedMonth.getFullYear() &&
      selectedDate.getMonth() === selectedMonth.getMonth() &&
      selectedDate.getDate() === day
    );
  };

  const handleDayPress = (day: number) => {
    const newDate = new Date(
      selectedMonth.getFullYear(),
      selectedMonth.getMonth(),
      day
    );
    setSelectedDate(newDate);
  };

  const formatSelectedDate = () => {
    const month = selectedDate.getMonth() + 1;
    const day = selectedDate.getDate();
    const weekday = WEEKDAYS[selectedDate.getDay()];
    return `${month}월 ${day}일 (${weekday})`;
  };

  // 리스트 뷰용 날짜별 그룹핑
  const groupTransactionsByDate = (txs: Transaction[]) => {
    const groups: { date: string; transactions: Transaction[] }[] = [];
    const dateMap: Record<string, Transaction[]> = {};

    txs.forEach((t) => {
      if (!dateMap[t.date]) {
        dateMap[t.date] = [];
      }
      dateMap[t.date].push(t);
    });

    // 날짜 내림차순 정렬
    Object.keys(dateMap)
      .sort((a, b) => b.localeCompare(a))
      .forEach((date) => {
        groups.push({ date, transactions: dateMap[date] });
      });

    return groups;
  };

  const groupedTransactions = groupTransactionsByDate(filteredTransactions);

  // 날짜 포맷팅 (예: "12월 4일 수요일")
  const formatDateHeader = (dateStr: string) => {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekday = [
      "일요일",
      "월요일",
      "화요일",
      "수요일",
      "목요일",
      "금요일",
      "토요일",
    ][date.getDay()];
    return `${month}월 ${day}일 ${weekday}`;
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.monthSelector}
            onPress={handlePrevMonth}
          >
            <Ionicons
              name="chevron-back"
              size={20}
              color={colors.text.secondary}
            />
          </TouchableOpacity>
          <Text style={styles.monthText}>{formatMonthYear(selectedMonth)}</Text>
          <TouchableOpacity
            style={styles.monthSelector}
            onPress={handleNextMonth}
          >
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.text.secondary}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.viewModeToggle}>
          <TouchableOpacity
            style={[
              styles.viewModeButton,
              viewMode === "list" && styles.viewModeButtonActive,
            ]}
            onPress={() => setViewMode("list")}
          >
            <Ionicons
              name="list"
              size={18}
              color={
                viewMode === "list"
                  ? colors.text.inverse
                  : colors.text.secondary
              }
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.viewModeButton,
              viewMode === "calendar" && styles.viewModeButtonActive,
            ]}
            onPress={() => setViewMode("calendar")}
          >
            <Ionicons
              name="calendar"
              size={18}
              color={
                viewMode === "calendar"
                  ? colors.text.inverse
                  : colors.text.secondary
              }
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Card - 수입/정기지출/총지출 */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryTitle}>이번 달 요약</Text>
          </View>

          {isLoading ? (
            <ActivityIndicator
              size="small"
              color={colors.primary.main}
              style={{ marginVertical: spacing.lg }}
            />
          ) : (
            <>
              <View style={styles.summaryItem}>
                <View style={styles.summaryLabelRow}>
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: colors.semantic.income },
                    ]}
                  />
                  <Text style={styles.summaryLabel}>수입</Text>
                </View>
                <Text style={[styles.summaryAmount, styles.incomeAmount]}>
                  +{formatCurrency(totalIncome)}
                </Text>
              </View>

              <View style={styles.summaryItem}>
                <View style={styles.summaryLabelRow}>
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: colors.text.tertiary },
                    ]}
                  />
                  <Text style={styles.summaryLabel}>정기지출</Text>
                </View>
                <Text style={[styles.summaryAmount, styles.expenseAmount]}>
                  -{formatCurrency(totalFixedExpense)}
                </Text>
              </View>

              {/* 생활비 미포함 할부 (있을 때만 표시) */}
              {nonLivingInstallmentExpense > 0 && (
                <View style={styles.summaryItem}>
                  <View style={styles.summaryLabelRow}>
                    <View
                      style={[
                        styles.dot,
                        { backgroundColor: colors.secondary.main },
                      ]}
                    />
                    <Text style={styles.summaryLabel}>할부</Text>
                  </View>
                  <Text style={[styles.summaryAmount, styles.expenseAmount]}>
                    -{formatCurrency(nonLivingInstallmentExpense)}
                  </Text>
                </View>
              )}

              <View style={styles.summaryItem}>
                <View style={styles.summaryLabelRow}>
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: colors.semantic.expense },
                    ]}
                  />
                  <Text style={styles.summaryLabel}>지출</Text>
                </View>
                <Text style={[styles.summaryAmount, styles.expenseAmount]}>
                  -{formatCurrency(totalExpense)}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Budget Type Filter with Budget Info */}
        <View style={styles.filterContainer}>
          <View style={styles.filterRow}>
            <TouchableOpacity
              style={[
                styles.filterChip,
                selectedBudgetType === "all" && styles.filterChipActive,
              ]}
              onPress={() => setSelectedBudgetType("all")}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedBudgetType === "all" && styles.filterChipTextActive,
                ]}
              >
                전체
              </Text>
            </TouchableOpacity>
            {jointBudgetEnabled && (
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  selectedBudgetType === "personal" && styles.filterChipActive,
                ]}
                onPress={() => setSelectedBudgetType("personal")}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedBudgetType === "personal" &&
                      styles.filterChipTextActive,
                  ]}
                >
                  개인
                </Text>
              </TouchableOpacity>
            )}
            {jointBudgetEnabled && (
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  selectedBudgetType === "joint" &&
                    styles.filterChipActiveSecondary,
                ]}
                onPress={() => setSelectedBudgetType("joint")}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedBudgetType === "joint" && styles.filterChipTextActive,
                  ]}
                >
                  공동
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Budget Info Card */}
          <View style={styles.budgetCard}>
            <View style={styles.budgetCardHeader}>
              <Text style={styles.budgetCardTitle}>
                {selectedBudgetType === "all"
                  ? "전체"
                  : selectedBudgetType === "personal"
                  ? "개인"
                  : "공동"}{" "}
                가용 예산
              </Text>
              {budgetInfo.budget > 0 && (
                <TouchableOpacity
                  style={styles.budgetEditButton}
                  onPress={() => openBudgetModal(selectedBudgetType)}
                >
                  <Ionicons
                    name="pencil"
                    size={14}
                    color={colors.text.tertiary}
                  />
                </TouchableOpacity>
              )}
            </View>

            {budgetInfo.budget > 0 ? (
              <>
                <View style={styles.budgetInfoRow}>
                  <Text style={styles.budgetInfoLabel}>예산</Text>
                  <Text style={styles.budgetInfoValue}>
                    {formatCurrency(budgetInfo.budget)}
                  </Text>
                </View>
                <View style={styles.budgetInfoRow}>
                  <Text style={styles.budgetInfoLabel}>지출</Text>
                  <Text style={[styles.budgetInfoValue, styles.expenseAmount]}>
                    -{formatCurrency(budgetInfo.spent)}
                  </Text>
                </View>
                <View style={styles.budgetDivider} />
                <View style={styles.budgetInfoRow}>
                  <Text style={styles.budgetRemainingLabel}>남은 예산</Text>
                  <Text
                    style={[
                      styles.budgetRemainingValue,
                      budgetInfo.remaining >= 0
                        ? styles.incomeAmount
                        : styles.expenseAmount,
                    ]}
                  >
                    {formatCurrency(budgetInfo.remaining)}
                  </Text>
                </View>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min(
                          100,
                          budgetInfo.budget > 0
                            ? (budgetInfo.spent / budgetInfo.budget) * 100
                            : 0
                        )}%`,
                        backgroundColor:
                          budgetInfo.remaining >= 0
                            ? colors.primary.main
                            : colors.semantic.expense,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>
                  {budgetInfo.budget > 0
                    ? Math.round((budgetInfo.spent / budgetInfo.budget) * 100)
                    : 0}
                  % 사용
                </Text>
              </>
            ) : (
              <TouchableOpacity
                style={styles.setBudgetButton}
                onPress={() => openBudgetModal(selectedBudgetType)}
              >
                <Ionicons
                  name="add-circle-outline"
                  size={20}
                  color={colors.primary.main}
                />
                <Text style={styles.setBudgetText}>예산 설정하기</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Transaction List or Calendar */}
        {viewMode === "list" ? (
          <View style={styles.transactionSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>거래 내역</Text>
            </View>

            {filteredTransactions.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons
                  name="receipt-outline"
                  size={48}
                  color={colors.text.tertiary}
                />
                <Text style={styles.emptyStateText}>거래 내역이 없어요</Text>
                <Text style={styles.emptyStateSubtext}>
                  + 버튼을 눌러 거래를 추가해 보세요
                </Text>
              </View>
            ) : (
              groupedTransactions.map((group, groupIndex) => (
                <View key={group.date}>
                  {/* 날짜 헤더 */}
                  <View style={styles.dateHeader}>
                    <Text style={styles.dateHeaderText}>
                      {formatDateHeader(group.date)}
                    </Text>
                    <Text style={styles.dateHeaderAmount}>
                      {formatCurrency(
                        group.transactions
                          .filter((t) => t.type === "expense")
                          .reduce((sum, t) => sum + t.amount, 0)
                      )}
                    </Text>
                  </View>
                  {/* 해당 날짜의 거래 목록 */}
                  {group.transactions.map((transaction, index) => (
                    <TransactionItem
                      key={transaction.id}
                      transaction={transaction}
                      isLast={
                        index === group.transactions.length - 1 &&
                        groupIndex === groupedTransactions.length - 1
                      }
                      onEdit={() => handleEditTransaction(transaction)}
                      onDelete={() => handleDeleteTransaction(transaction)}
                      showJointBadge={jointBudgetEnabled}
                    />
                  ))}
                </View>
              ))
            )}
          </View>
        ) : (
          <>
            {/* Calendar */}
            <View style={styles.calendarCard}>
              {/* Weekday Headers */}
              <View style={styles.weekdayRow}>
                {WEEKDAYS.map((day, index) => (
                  <View key={day} style={styles.weekdayCell}>
                    <Text
                      style={[
                        styles.weekdayText,
                        index === 0 && styles.sundayText,
                        index === 6 && styles.saturdayText,
                      ]}
                    >
                      {day}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Calendar Days */}
              <View style={styles.daysGrid}>
                {calendarDays.map((day, index) => {
                  if (day === null) {
                    return (
                      <View key={`empty-${index}`} style={styles.dayCell} />
                    );
                  }

                  const dateStr = `${selectedMonth.getFullYear()}-${String(
                    selectedMonth.getMonth() + 1
                  ).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const summary = getDateSummary(dateStr);
                  const dayOfWeek = index % 7;

                  return (
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles.dayCell,
                        isSelectedDay(day) && styles.dayCellSelected,
                      ]}
                      onPress={() => handleDayPress(day)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          isToday(day) && styles.todayText,
                          isSelectedDay(day) && styles.selectedDayText,
                          dayOfWeek === 0 &&
                            !isSelectedDay(day) &&
                            styles.sundayText,
                          dayOfWeek === 6 &&
                            !isSelectedDay(day) &&
                            styles.saturdayText,
                        ]}
                      >
                        {day}
                      </Text>
                      {/* 거래 유형별 점 표시 */}
                      {summary.hasTransactions && (
                        <View style={styles.dotsContainer}>
                          {summary.income > 0 && (
                            <View
                              style={[
                                styles.calendarDot,
                                styles.incomeDot,
                                isSelectedDay(day) && styles.selectedDot,
                              ]}
                            />
                          )}
                          {summary.expense > 0 && (
                            <View
                              style={[
                                styles.calendarDot,
                                styles.expenseDot,
                                isSelectedDay(day) && styles.selectedDot,
                              ]}
                            />
                          )}
                          {summary.transfer > 0 && (
                            <View
                              style={[
                                styles.calendarDot,
                                styles.transferDot,
                                isSelectedDay(day) && styles.selectedDot,
                              ]}
                            />
                          )}
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Selected Date Transactions */}
            <View style={styles.selectedDateSection}>
              <Text style={styles.selectedDateTitle}>
                {formatSelectedDate()}
              </Text>

              {selectedDateTransactions.length > 0 ? (
                <View style={styles.selectedDateList}>
                  {selectedDateTransactions.map((transaction, index) => (
                    <CalendarTransactionItem
                      key={transaction.id}
                      transaction={transaction}
                      isLast={index === selectedDateTransactions.length - 1}
                      onPress={() => handleEditTransaction(transaction)}
                      showJointBadge={jointBudgetEnabled}
                    />
                  ))}
                </View>
              ) : (
                <View style={styles.calendarEmptyState}>
                  <Text style={styles.calendarEmptyText}>
                    거래 내역이 없습니다
                  </Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* FAB - Add Transaction */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.8}
        onPress={() => setShowAddTransaction(true)}
      >
        <Ionicons name="add" size={28} color={colors.text.inverse} />
      </TouchableOpacity>

      {/* Add Transaction Sheet */}
      <AddTransactionSheet
        visible={showAddTransaction}
        onClose={handleCloseTransactionSheet}
        onSuccess={loadData}
        editTransaction={editingTransaction}
      />

      {/* Delete Confirm Modal */}
      <ConfirmModal
        visible={!!deleteTarget}
        title="거래 삭제"
        message={`"${deleteTarget?.title}"을(를) 삭제하시겠습니까?`}
        confirmText="삭제"
        cancelText="취소"
        isDestructive={true}
        onConfirm={confirmDeleteTransaction}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Budget Setting Modal */}
      <Modal
        visible={showBudgetModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBudgetModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowBudgetModal(false)}
          />
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingBudgetType === "all"
                ? "예산 설정"
                : editingBudgetType === "personal"
                ? "개인 예산 설정"
                : "공동 예산 설정"}
            </Text>

            {editingBudgetType === "all" ? (
              <>
                <Text style={styles.modalInputLabel}>{jointBudgetEnabled ? "개인 예산" : "예산"}</Text>
                <View style={styles.modalInputContainer}>
                  <TextInput
                    style={styles.modalInput}
                    value={personalBudgetInput}
                    onChangeText={handlePersonalBudgetChange}
                    keyboardType="number-pad"
                    placeholder="금액 입력"
                    placeholderTextColor={colors.text.tertiary}
                    autoFocus
                  />
                  <Text style={styles.modalInputSuffix}>원</Text>
                </View>

                {jointBudgetEnabled && (
                  <>
                    <Text style={styles.modalInputLabel}>공동 예산</Text>
                    <View style={styles.modalInputContainer}>
                      <TextInput
                        style={styles.modalInput}
                        value={jointBudgetInput}
                        onChangeText={handleJointBudgetChange}
                        keyboardType="number-pad"
                        placeholder="금액 입력"
                        placeholderTextColor={colors.text.tertiary}
                      />
                      <Text style={styles.modalInputSuffix}>원</Text>
                    </View>
                  </>
                )}
              </>
            ) : (
              <View style={styles.modalInputContainer}>
                <TextInput
                  style={styles.modalInput}
                  value={
                    editingBudgetType === "personal"
                      ? personalBudgetInput
                      : jointBudgetInput
                  }
                  onChangeText={
                    editingBudgetType === "personal"
                      ? handlePersonalBudgetChange
                      : handleJointBudgetChange
                  }
                  keyboardType="number-pad"
                  placeholder="금액 입력"
                  placeholderTextColor={colors.text.tertiary}
                  autoFocus
                />
                <Text style={styles.modalInputSuffix}>원</Text>
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[
                  styles.modalCancelButton,
                  isSavingBudget && styles.modalButtonDisabled,
                ]}
                onPress={() => setShowBudgetModal(false)}
                disabled={isSavingBudget}
              >
                <Text style={[
                  styles.modalCancelText,
                  isSavingBudget && styles.modalButtonTextDisabled,
                ]}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalSaveButton,
                  isSavingBudget && styles.modalSaveButtonDisabled,
                ]}
                onPress={saveBudget}
                disabled={isSavingBudget}
              >
                {isSavingBudget ? (
                  <ActivityIndicator size="small" color={colors.text.inverse} />
                ) : (
                  <Text style={styles.modalSaveText}>저장</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Joint Budget Onboarding Modal */}
      <JointBudgetOnboardingModal
        visible={showOnboarding}
        onSelectJoint={handleSelectJointBudget}
        onSelectPersonal={handleSelectPersonalOnly}
      />
    </SafeAreaView>
  );
}

function TransactionItem({
  transaction,
  isLast,
  onEdit,
  onDelete,
  showJointBadge,
}: {
  transaction: Transaction;
  isLast: boolean;
  onEdit: () => void;
  onDelete: () => void;
  showJointBadge: boolean;
}) {
  const swipeableRef = useRef<Swipeable>(null);

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("ko-KR") + "원";
  };

  // 카테고리 정보 (없으면 기본값)
  const categoryName = transaction.category?.name || "미분류";
  const categoryIcon = transaction.category?.iconName || "ellipse";
  const categoryColor = transaction.category?.color || colors.text.tertiary;

  // 이체인 경우 아이콘과 색상
  const isTransfer = transaction.type === "transfer";
  const isInstallment = transaction.isInstallment;
  const displayIcon = isTransfer ? "swap-horizontal" : categoryIcon;
  const displayColor = isTransfer ? colors.semantic.transfer : categoryColor;

  // 표시할 금액 계산 (할부는 월별 금액)
  const displayAmount = isInstallment && transaction.totalTerm && transaction.totalTerm > 0
    ? Math.round(transaction.amount / transaction.totalTerm)
    : transaction.amount;

  // 이체 표시 텍스트 (출금자산 → 입금자산)
  const getSubtitle = () => {
    if (isTransfer && transaction.asset && transaction.toAsset) {
      return `${transaction.asset.name} → ${transaction.toAsset.name}`;
    }

    // 할부인 경우: 카테고리 · 자산 · 회차
    if (isInstallment && transaction.totalTerm && transaction.currentTerm) {
      const parts = [categoryName];
      if (transaction.asset?.name) {
        parts.push(transaction.asset.name);
      }
      parts.push(`${transaction.currentTerm}/${transaction.totalTerm}회차`);
      return parts.join(" · ");
    }

    // 자산 정보가 있으면 카테고리와 함께 표시
    if (transaction.asset?.name) {
      return `${categoryName} · ${transaction.asset.name}`;
    }
    return categoryName;
  };

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0.5],
      extrapolate: "clamp",
    });

    return (
      <TouchableOpacity
        style={styles.deleteAction}
        onPress={() => {
          swipeableRef.current?.close();
          onDelete();
        }}
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          <Ionicons
            name="trash-outline"
            size={22}
            color={colors.text.inverse}
          />
        </Animated.View>
      </TouchableOpacity>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={2}
    >
      <TouchableOpacity
        style={[styles.transactionItem, isLast && styles.transactionItemLast]}
        activeOpacity={0.7}
        onPress={onEdit}
      >
        <View
          style={[
            styles.transactionIcon,
            { backgroundColor: displayColor + "20" },
          ]}
        >
          <Ionicons
            name={displayIcon as keyof typeof Ionicons.glyphMap}
            size={20}
            color={displayColor}
          />
        </View>
        <View style={styles.transactionContent}>
          <View style={styles.transactionTop}>
            <Text style={styles.transactionTitle}>{transaction.title}</Text>
            {/* 공동 예산 뱃지 */}
            {showJointBadge && transaction.budgetType === "joint" && (
              <View style={styles.jointBadge}>
                <Text style={styles.jointBadgeText}>공동</Text>
              </View>
            )}
          </View>
          <Text style={styles.transactionCategory}>{getSubtitle()}</Text>
        </View>
        <Text
          style={[
            styles.transactionAmount,
            transaction.type === "income"
              ? styles.incomeAmount
              : transaction.type === "transfer"
              ? styles.transferAmount
              : isInstallment && !transaction.includeInLivingExpense
              ? styles.excludedAmount
              : styles.expenseAmount,
          ]}
        >
          {transaction.type === "income"
            ? "+"
            : transaction.type === "transfer"
            ? ""
            : "-"}
          {formatCurrency(displayAmount)}
        </Text>
      </TouchableOpacity>
    </Swipeable>
  );
}

// 캘린더 뷰용 거래 아이템 (리스트뷰와 동일한 UI)
function CalendarTransactionItem({
  transaction,
  isLast,
  onPress,
  showJointBadge,
}: {
  transaction: Transaction;
  isLast: boolean;
  onPress: () => void;
  showJointBadge: boolean;
}) {
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("ko-KR") + "원";
  };

  const categoryName = transaction.category?.name || "미분류";
  const categoryColor = transaction.category?.color || colors.text.tertiary;
  const categoryIcon = transaction.category?.iconName || "ellipse";
  const isTransfer = transaction.type === "transfer";
  const isInstallment = transaction.isInstallment;
  const displayIcon = isTransfer ? "swap-horizontal" : categoryIcon;
  const displayColor = isTransfer ? colors.semantic.transfer : categoryColor;

  // 표시할 금액 계산 (할부는 월별 금액)
  const displayAmount = isInstallment && transaction.totalTerm && transaction.totalTerm > 0
    ? Math.round(transaction.amount / transaction.totalTerm)
    : transaction.amount;

  // 부제목 계산 (TransactionItem과 동일)
  const getSubtitle = () => {
    if (isTransfer && transaction.asset && transaction.toAsset) {
      return `${transaction.asset.name} → ${transaction.toAsset.name}`;
    }

    // 할부인 경우: 카테고리 · 자산 · 회차
    if (isInstallment && transaction.totalTerm && transaction.currentTerm) {
      const parts = [categoryName];
      if (transaction.asset?.name) {
        parts.push(transaction.asset.name);
      }
      parts.push(`${transaction.currentTerm}/${transaction.totalTerm}회차`);
      return parts.join(" · ");
    }

    // 자산 정보가 있으면 카테고리와 함께 표시
    if (transaction.asset?.name) {
      return `${categoryName} · ${transaction.asset.name}`;
    }
    return categoryName;
  };

  return (
    <TouchableOpacity
      style={[
        styles.calendarTransactionItem,
        !isLast && styles.calendarTransactionItemBorder,
      ]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View
        style={[
          styles.calendarTransactionIcon,
          { backgroundColor: displayColor + "20" },
        ]}
      >
        <Ionicons
          name={displayIcon as keyof typeof Ionicons.glyphMap}
          size={18}
          color={displayColor}
        />
      </View>
      <View style={styles.calendarTransactionContent}>
        <View style={styles.calendarTransactionTop}>
          <Text style={styles.calendarTransactionTitle}>{transaction.title}</Text>
          {/* 공동 예산 뱃지 */}
          {showJointBadge && transaction.budgetType === "joint" && (
            <View style={styles.jointBadge}>
              <Text style={styles.jointBadgeText}>공동</Text>
            </View>
          )}
        </View>
        <Text style={styles.calendarTransactionCategory}>{getSubtitle()}</Text>
      </View>
      <Text
        style={[
          styles.calendarTransactionAmount,
          transaction.type === "income" && styles.incomeAmount,
          transaction.type === "expense" && (isInstallment && !transaction.includeInLivingExpense ? styles.excludedAmount : styles.expenseAmount),
          transaction.type === "transfer" && styles.transferAmount,
        ]}
      >
        {transaction.type === "income"
          ? "+"
          : transaction.type === "expense"
          ? "-"
          : ""}
        {formatCurrency(displayAmount)}
      </Text>
    </TouchableOpacity>
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  monthSelector: {
    padding: spacing.xs,
  },
  monthText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
    marginHorizontal: spacing.sm,
  },
  viewModeToggle: {
    flexDirection: "row",
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.base,
    padding: 2,
  },
  viewModeButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  viewModeButtonActive: {
    backgroundColor: colors.primary.main,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing["5xl"],
  },
  summaryCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  summaryHeader: {
    marginBottom: spacing.base,
  },
  summaryTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
  },
  summaryItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  summaryLabelRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  summaryLabel: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
  },
  summaryAmount: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
  },
  incomeAmount: {
    color: colors.semantic.income,
  },
  expenseAmount: {
    color: colors.semantic.expense,
  },
  transferAmount: {
    color: colors.semantic.transfer,
  },
  excludedAmount: {
    color: colors.text.tertiary,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.full,
    overflow: "hidden",
    marginBottom: spacing.xs,
  },
  progressFill: {
    height: "100%",
    borderRadius: borderRadius.full,
  },
  progressText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
  },
  filterContainer: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  filterRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  filterChipActive: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  filterChipActiveSecondary: {
    backgroundColor: colors.secondary.main,
    borderColor: colors.secondary.main,
  },
  filterChipText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
  },
  filterChipTextActive: {
    color: colors.text.inverse,
  },
  transactionSection: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.base,
    ...shadows.sm,
  },
  sectionHeader: {
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  sectionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
  },
  dateHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    marginTop: spacing.sm,
  },
  dateHeaderText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
  },
  dateHeaderAmount: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.semantic.expense,
  },
  // Calendar Styles
  calendarCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  weekdayRow: {
    flexDirection: "row",
    marginBottom: spacing.sm,
  },
  weekdayCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  weekdayText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.tertiary,
  },
  sundayText: {
    color: colors.semantic.expense,
  },
  saturdayText: {
    color: colors.semantic.transfer,
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: "14.28%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xs,
  },
  dayCellSelected: {
    backgroundColor: colors.primary.main,
    borderRadius: borderRadius.base,
  },
  dayText: {
    fontSize: typography.fontSize.md,
    color: colors.text.primary,
  },
  todayText: {
    fontWeight: typography.fontWeight.bold,
    color: colors.primary.main,
  },
  selectedDayText: {
    color: colors.text.inverse,
    fontWeight: typography.fontWeight.bold,
  },
  dotsContainer: {
    flexDirection: "row",
    marginTop: 4,
    gap: 3,
  },
  calendarDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  incomeDot: {
    backgroundColor: colors.semantic.income,
  },
  expenseDot: {
    backgroundColor: colors.semantic.expense,
  },
  transferDot: {
    backgroundColor: colors.semantic.transfer,
  },
  selectedDot: {
    backgroundColor: colors.text.inverse,
  },
  selectedDateSection: {
    marginBottom: spacing.lg,
  },
  selectedDateTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  selectedDateList: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  calendarEmptyState: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.xl,
    alignItems: "center",
  },
  calendarEmptyText: {
    fontSize: typography.fontSize.base,
    color: colors.text.tertiary,
  },
  calendarTransactionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
  },
  calendarTransactionItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  calendarTransactionIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  calendarTransactionContent: {
    flex: 1,
  },
  calendarTransactionTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  calendarTransactionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  calendarTransactionCategory: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  calendarTransactionAmount: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing["2xl"],
  },
  emptyStateText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  emptyStateSubtext: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
  transactionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  transactionItemLast: {
    borderBottomWidth: 0,
  },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.base,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  transactionContent: {
    flex: 1,
  },
  transactionTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  transactionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  // 공동 뱃지 (피치/코랄)
  jointBadge: {
    backgroundColor: colors.secondary.main + "30",
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.sm,
  },
  jointBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.secondary.dark,
  },
  transactionCategory: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
  },
  deleteAction: {
    backgroundColor: colors.semantic.expense,
    justifyContent: "center",
    alignItems: "center",
    width: 80,
  },
  fab: {
    position: "absolute",
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary.main,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.lg,
  },
  // Budget Card Styles
  budgetCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.base,
    marginTop: spacing.sm,
  },
  budgetCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  budgetCardTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
  },
  budgetEditButton: {
    padding: spacing.xs,
  },
  budgetInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  budgetInfoLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  },
  budgetInfoValue: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  budgetDivider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginVertical: spacing.sm,
  },
  budgetRemainingLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  budgetRemainingValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
  },
  setBudgetButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  setBudgetButtons: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  setBudgetButtonHalf: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    gap: spacing.xs,
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.base,
  },
  setBudgetText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary.main,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: "85%",
    maxWidth: 340,
  },
  modalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  modalInputLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  modalInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.base,
    paddingHorizontal: spacing.base,
    marginBottom: spacing.lg,
  },
  modalInput: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    textAlign: "right",
    ...(Platform.OS === "web" && { outlineStyle: "none" as any }),
  },
  modalInputSuffix: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginLeft: spacing.sm,
  },
  modalButtons: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.base,
    backgroundColor: colors.background.tertiary,
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
  },
  modalSaveButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.base,
    backgroundColor: colors.primary.main,
    alignItems: "center",
  },
  modalSaveText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.inverse,
  },
  modalButtonDisabled: {
    opacity: 0.5,
  },
  modalButtonTextDisabled: {
    color: colors.text.tertiary,
  },
  modalSaveButtonDisabled: {
    backgroundColor: colors.primary.light,
    opacity: 0.6,
  },
});
