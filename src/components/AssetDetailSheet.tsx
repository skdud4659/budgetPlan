import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GestureHandlerRootView, ScrollView } from "react-native-gesture-handler";
import {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  assetTypeConfig,
} from "../styles";
import type { Asset, Transaction, AssetType } from "../types";
import { useSettings } from "../contexts/SettingsContext";
import { transactionService } from "../services/transactionService";
import { assetService } from "../services/assetService";
import { categoryService } from "../services/categoryService";
import AddTransactionSheet from "./AddTransactionSheet";
import FixedTransactionSheet from "./FixedTransactionSheet";
import SwipeableContainer from "./SwipeableContainer";

interface AssetDetailSheetProps {
  visible: boolean;
  asset: Asset | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onTransactionChange?: () => void;
}

function getAssetIcon(type: AssetType): keyof typeof Ionicons.glyphMap {
  const iconMap: Record<AssetType, keyof typeof Ionicons.glyphMap> = {
    bank: "business-outline",
    card: "card-outline",
    cash: "cash-outline",
    loan: "document-text-outline",
    insurance: "shield-checkmark-outline",
    investment: "trending-up-outline",
    savings: "wallet-outline",
    emoney: "phone-portrait-outline",
    point: "star-outline",
    other: "ellipsis-horizontal",
  };
  return iconMap[type];
}

export default function AssetDetailSheet({
  visible,
  asset,
  onClose,
  onEdit,
  onDelete,
  onTransactionChange,
}: AssetDetailSheetProps) {
  const { jointBudgetEnabled } = useSettings();
  const [currentAsset, setCurrentAsset] = useState<Asset | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [billingInfo, setBillingInfo] = useState<{ currentBilling: number; nextBilling: number } | null>(null);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [showFixedTransaction, setShowFixedTransaction] = useState(false);
  const [selectedFixedTransaction, setSelectedFixedTransaction] = useState<Transaction | null>(null);
  const [budgetTypeFilter, setBudgetTypeFilter] = useState<'all' | 'personal' | 'joint'>('all');

  // 카드 대금 결제 관련 상태
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentAssets, setPaymentAssets] = useState<Asset[]>([]);
  const [selectedPaymentAsset, setSelectedPaymentAsset] = useState<Asset | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // 자산이 바뀌거나 시트가 열릴 때 초기화 및 데이터 로드
  useEffect(() => {
    const initializeSheet = async () => {
      if (visible && asset) {
        setBillingInfo(null);
        setTransactions([]);
        setIsLoading(true);

        try {
          // 항상 서버에서 최신 자산 정보를 가져옴 (stale data 방지)
          const freshAsset = await assetService.getAsset(asset.id);
          const targetAsset = freshAsset || asset;
          setCurrentAsset(targetAsset);

          // 카드의 경우 오늘 날짜가 포함된 정산 기간을 기준으로 월 설정
          let initialMonth = new Date();
          if (targetAsset.type === 'card' && targetAsset.settlementDate) {
            const today = new Date();
            const currentDay = today.getDate();
            // 정산일 이후면 다음 달 기준으로 설정해야 오늘이 포함된 기간이 표시됨
            if (currentDay >= targetAsset.settlementDate) {
              initialMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
            }
          }

          setSelectedMonth(initialMonth);
          await loadDataAndTransactions(targetAsset, initialMonth);
        } catch (error) {
          console.error("Failed to initialize asset detail sheet:", error);
          setCurrentAsset(asset);
        } finally {
          setIsLoading(false);
        }
      }
    };

    initializeSheet();
  }, [visible, asset?.id]);

  // 월이 변경될 때 거래 내역만 다시 로드
  useEffect(() => {
    if (visible && asset && currentAsset) {
      loadTransactionsForAsset(currentAsset, selectedMonth);
    }
  }, [selectedMonth]);

  // 자산 정보와 거래 내역을 함께 로드
  const loadDataAndTransactions = async (targetAsset: Asset, month: Date) => {
    if (!targetAsset) return;

    try {
      // 카드인 경우 결제 예정 금액 로드
      if (targetAsset.type === "card" && targetAsset.settlementDate && targetAsset.billingDate) {
        const billing = await transactionService.getCardBillingAmount(
          targetAsset.id,
          targetAsset.settlementDate,
          targetAsset.billingDate
        );
        setBillingInfo(billing);
      } else {
        setBillingInfo(null);
      }

      // 거래 내역 로드
      await loadTransactionsForAsset(targetAsset, month);
    } catch (error) {
      console.error("Failed to load asset details:", error);
    }
  };

  // 자산 정보를 다시 로드하고 거래 내역도 갱신
  const reloadData = async (targetAsset: Asset, month: Date) => {
    if (!targetAsset) return;

    setIsLoading(true);
    try {
      // 자산 정보 다시 로드 (잔액 업데이트)
      const assets = await assetService.getAssets();
      const updatedAsset = assets.find(a => a.id === targetAsset.id);
      if (updatedAsset) {
        setCurrentAsset(updatedAsset);

        // 카드인 경우 결제 예정 금액 로드
        if (updatedAsset.type === "card" && updatedAsset.settlementDate && updatedAsset.billingDate) {
          const billing = await transactionService.getCardBillingAmount(
            updatedAsset.id,
            updatedAsset.settlementDate,
            updatedAsset.billingDate
          );
          setBillingInfo(billing);
        }

        // 거래 내역 로드
        await loadTransactionsForAsset(updatedAsset, month);
      }
    } catch (error) {
      console.error("Failed to reload asset details:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 특정 자산의 거래 내역 로드
  const loadTransactionsForAsset = async (targetAsset: Asset, month: Date) => {
    if (!targetAsset) return;

    try {
      const year = month.getFullYear();
      const monthNum = month.getMonth() + 1;

      // 카드의 경우 정산일 기준으로 조회 (정산일 20일이면: 지난달 20일 ~ 이번달 19일)
      if (targetAsset.type === 'card' && targetAsset.settlementDate) {
        const settlementDate = targetAsset.settlementDate;

        // 시작일: 지난달 정산일
        const startDate = new Date(year, monthNum - 2, settlementDate);
        // 종료일: 이번달 정산일 전날
        const endDate = new Date(year, monthNum - 1, settlementDate - 1);

        const formatDateStr = (d: Date) =>
          `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

        const startDateStr = formatDateStr(startDate);
        const endDateStr = formatDateStr(endDate);

        // 시작월과 종료월의 거래 조회
        const startYear = startDate.getFullYear();
        const startMonth = startDate.getMonth() + 1;
        const endYear = endDate.getFullYear();
        const endMonth = endDate.getMonth() + 1;

        const allTransactions: Transaction[] = [];

        // 시작월 거래
        const startMonthTxs = await transactionService.getTransactionsWithInstallments(startYear, startMonth);
        allTransactions.push(...startMonthTxs.filter(t => t.assetId === targetAsset.id || t.toAssetId === targetAsset.id));

        // 종료월이 다르면 종료월 거래도 조회
        if (startYear !== endYear || startMonth !== endMonth) {
          const endMonthTxs = await transactionService.getTransactionsWithInstallments(endYear, endMonth);
          allTransactions.push(...endMonthTxs.filter(t => t.assetId === targetAsset.id || t.toAssetId === targetAsset.id));
        }

        // 정산 기간 내의 거래만 필터링 (정확히 startDateStr ~ endDateStr 범위만)
        const filteredTxs = allTransactions.filter(t => {
          return t.date >= startDateStr && t.date <= endDateStr;
        });

        // 중복 제거 및 날짜순 정렬
        const uniqueTxs = Array.from(new Map(filteredTxs.map(t => [t.id, t])).values());
        setTransactions(uniqueTxs.sort((a, b) => b.date.localeCompare(a.date)));
      } else {
        // 일반 자산: 해당 월의 모든 거래 조회
        const allTransactions = await transactionService.getTransactionsWithInstallments(year, monthNum);
        const assetTransactions = allTransactions.filter(
          (t) => t.assetId === targetAsset.id || t.toAssetId === targetAsset.id
        );
        setTransactions(assetTransactions);
      }
    } catch (error) {
      console.error("Failed to load transactions:", error);
    }
  };

  const handlePrevMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1));
  };

  // 카드 대금 결제 모달 열기
  const openPaymentModal = async () => {
    if (!billingInfo) return;

    // 결제 예정 금액을 기본값으로 설정
    setPaymentAmount(billingInfo.currentBilling.toString());

    // 카드 외 자산 목록 로드 (은행, 현금 등)
    try {
      const assets = await assetService.getAssets();
      const availableAssets = assets.filter(a => a.type !== 'card' && a.id !== asset?.id);
      setPaymentAssets(availableAssets);
      setSelectedPaymentAsset(availableAssets.length > 0 ? availableAssets[0] : null);
    } catch (error) {
      console.error("Failed to load assets:", error);
    }

    setShowPaymentModal(true);
  };

  // 카드 대금 결제 처리
  const handlePayment = async () => {
    if (!selectedPaymentAsset || !asset || !paymentAmount) return;

    const amount = parseInt(paymentAmount.replace(/,/g, ""), 10);
    if (isNaN(amount) || amount <= 0) return;

    setIsProcessingPayment(true);
    try {
      const today = new Date().toISOString().split("T")[0];

      // 이체 거래로 생성: 출금 자산 → 카드 자산
      // 출금 자산에서 돈이 빠지고, 카드 자산에 입금되어 결제 예정 금액이 차감됨
      await transactionService.createTransaction({
        title: `${asset.name} 카드 대금`,
        amount: amount,
        date: today,
        type: "transfer",
        assetId: selectedPaymentAsset.id,
        toAssetId: asset.id,
        budgetType: "personal",
        includeInLivingExpense: false,
      });

      // 성공 후 모달 닫기 및 데이터 새로고침
      setShowPaymentModal(false);
      setPaymentAmount("");
      setSelectedPaymentAsset(null);
      if (asset) reloadData(asset, selectedMonth);
      onTransactionChange?.();
    } catch (error) {
      console.error("Failed to process payment:", error);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // 금액 포맷팅
  const formatNumberWithComma = (value: string) => {
    const numbers = value.replace(/[^0-9]/g, "");
    if (!numbers) return "";
    return parseInt(numbers, 10).toLocaleString("ko-KR");
  };

  const formatMonthYear = (date: Date) => {
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
  };

  // 카드 정산 기간 포맷 (예: 11/20 ~ 12/19)
  const formatCardPeriod = (date: Date, settlementDate: number) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    // 시작일: 지난달 정산일
    const startDate = new Date(year, month - 2, settlementDate);
    // 종료일: 이번달 정산일 전날
    const endDate = new Date(year, month - 1, settlementDate - 1);

    const startStr = `${startDate.getMonth() + 1}/${startDate.getDate()}`;
    const endStr = `${endDate.getMonth() + 1}/${endDate.getDate()}`;
    return `${startStr} ~ ${endStr}`;
  };

  const formatCurrency = (amount: number) => {
    return Math.abs(amount).toLocaleString("ko-KR") + "원";
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  // 날짜 헤더 포맷
  const formatDateHeader = (dateStr: string) => {
    const date = new Date(dateStr);
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    return `${date.getMonth() + 1}월 ${date.getDate()}일 (${weekdays[date.getDay()]})`;
  };

  // 날짜별 그룹핑
  const groupTransactionsByDate = (txList: Transaction[]) => {
    const groups: { date: string; transactions: Transaction[] }[] = [];
    const dateMap: Record<string, Transaction[]> = {};

    txList.forEach((t) => {
      if (!dateMap[t.date]) {
        dateMap[t.date] = [];
      }
      dateMap[t.date].push(t);
    });

    Object.keys(dateMap)
      .sort((a, b) => b.localeCompare(a))
      .forEach((date) => {
        groups.push({ date, transactions: dateMap[date] });
      });

    return groups;
  };

  if (!asset) return null;

  // 현재 표시할 자산 (업데이트된 잔액 반영)
  const displayAsset = currentAsset || asset;
  const isNegative = displayAsset.balance < 0;
  const config = assetTypeConfig[displayAsset.type];

  // 필터링된 거래내역
  const filteredTransactions = transactions.filter((t) => {
    if (budgetTypeFilter === 'all') return true;
    return t.budgetType === budgetTypeFilter;
  });

  // 날짜별로 그룹핑
  const groupedTransactions = groupTransactionsByDate(filteredTransactions);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>자산 상세</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={onEdit} style={styles.headerIconButton}>
                <Ionicons
                  name="pencil-outline"
                  size={22}
                  color={colors.text.secondary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onDelete}
                style={styles.headerIconButton}
              >
                <Ionicons
                  name="trash-outline"
                  size={22}
                  color={colors.semantic.expense}
                />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
          >
            {/* Asset Info Card */}
            <View style={styles.assetCard}>
              <View style={styles.assetCardHeader}>
                <View
                  style={[
                    styles.assetIcon,
                    { backgroundColor: config.color + "20" },
                  ]}
                >
                  <Ionicons
                    name={getAssetIcon(displayAsset.type)}
                    size={24}
                    color={config.color}
                  />
                </View>
                <View style={styles.assetCardInfo}>
                  <Text style={styles.assetName}>{displayAsset.name}</Text>
                  <Text style={styles.assetType}>{config.label}</Text>
                </View>
              </View>

              {/* 카드가 아닌 경우: 잔액 표시 */}
              {displayAsset.type !== "card" && (
                <Text
                  style={[
                    styles.assetBalance,
                    isNegative ? styles.negativeBalance : styles.positiveBalance,
                  ]}
                >
                  {isNegative ? "-" : ""}
                  {formatCurrency(displayAsset.balance)}
                </Text>
              )}

              {/* 카드인 경우: 정산/결제일 정보 + 결제 예정/미결제 금액만 표시 */}
              {displayAsset.type === "card" && (
                <>
                  {displayAsset.billingDate && (
                    <Text style={styles.billingInfo}>
                      {displayAsset.settlementDate
                        ? `정산 ${displayAsset.settlementDate}일 / 결제 ${displayAsset.billingDate}일`
                        : `결제일 ${displayAsset.billingDate}일`}
                    </Text>
                  )}

                  {billingInfo && (
                    <>
                      <View style={styles.billingAmountContainer}>
                        <View style={styles.billingAmountItem}>
                          <Text style={styles.billingAmountLabel}>결제 예정 금액</Text>
                          <Text style={styles.billingAmountValue}>
                            {formatCurrency(billingInfo.currentBilling)}
                          </Text>
                        </View>
                        <View style={styles.billingAmountDivider} />
                        <View style={styles.billingAmountItem}>
                          <Text style={styles.billingAmountLabel}>미결제 금액</Text>
                          <Text style={styles.billingAmountValue}>
                            {formatCurrency(billingInfo.nextBilling)}
                          </Text>
                        </View>
                      </View>

                      {/* 대금 결제 버튼 */}
                      {billingInfo.currentBilling > 0 && (
                        <TouchableOpacity
                          style={styles.paymentButton}
                          onPress={openPaymentModal}
                        >
                          <Ionicons name="card" size={18} color={colors.text.inverse} />
                          <Text style={styles.paymentButtonText}>대금 결제</Text>
                        </TouchableOpacity>
                      )}
                    </>
                  )}
                </>
              )}

            </View>

            {isLoading ? (
              <ActivityIndicator
                size="large"
                color={colors.primary.main}
                style={{ marginTop: spacing.xl }}
              />
            ) : (
              <>
                {/* 거래 내역 섹션 */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <View style={styles.sectionTitleRow}>
                      <Text style={styles.sectionTitle}>거래 내역</Text>
                      <TouchableOpacity
                        style={styles.addTransactionButton}
                        onPress={() => setShowAddTransaction(true)}
                      >
                        <Ionicons name="add" size={18} color={colors.primary.main} />
                        <Text style={styles.addTransactionText}>내역 추가</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.monthNavigator}>
                      <TouchableOpacity
                        onPress={handlePrevMonth}
                        style={styles.monthNavButton}
                      >
                        <Ionicons
                          name="chevron-back"
                          size={18}
                          color={colors.text.secondary}
                        />
                      </TouchableOpacity>
                      <Text style={styles.monthNavText}>
                        {displayAsset.type === 'card' && displayAsset.settlementDate
                          ? formatCardPeriod(selectedMonth, displayAsset.settlementDate)
                          : formatMonthYear(selectedMonth)}
                      </Text>
                      <TouchableOpacity
                        onPress={handleNextMonth}
                        style={styles.monthNavButton}
                      >
                        <Ionicons
                          name="chevron-forward"
                          size={18}
                          color={colors.text.secondary}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Budget Type Filter */}
                  {jointBudgetEnabled && (
                    <View style={styles.filterRow}>
                      <TouchableOpacity
                        style={[
                          styles.filterButton,
                          budgetTypeFilter === 'all' && styles.filterButtonActive,
                        ]}
                        onPress={() => setBudgetTypeFilter('all')}
                      >
                        <Text
                          style={[
                            styles.filterButtonText,
                            budgetTypeFilter === 'all' && styles.filterButtonTextActive,
                          ]}
                        >
                          전체
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.filterButton,
                          budgetTypeFilter === 'personal' && styles.filterButtonActive,
                        ]}
                        onPress={() => setBudgetTypeFilter('personal')}
                      >
                        <Text
                          style={[
                            styles.filterButtonText,
                            budgetTypeFilter === 'personal' && styles.filterButtonTextActive,
                          ]}
                        >
                          개인
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.filterButton,
                          budgetTypeFilter === 'joint' && styles.filterButtonActive,
                        ]}
                        onPress={() => setBudgetTypeFilter('joint')}
                      >
                        <Text
                          style={[
                            styles.filterButtonText,
                            budgetTypeFilter === 'joint' && styles.filterButtonTextActive,
                          ]}
                        >
                          공동
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  <Text style={styles.transactionCount}>
                    {filteredTransactions.length}건
                  </Text>

                  <GestureHandlerRootView style={styles.swipeArea}>
                    <SwipeableContainer
                      onSwipeLeft={handleNextMonth}
                      onSwipeRight={handlePrevMonth}
                    >
                      {groupedTransactions.length > 0 ? (
                        <View style={styles.listCard}>
                          {groupedTransactions.map((group) => (
                            <View key={group.date}>
                              <View style={styles.dateHeader}>
                                <Text style={styles.dateHeaderText}>
                                  {formatDateHeader(group.date)}
                                </Text>
                              </View>
                              {group.transactions.map((transaction, index) => {
                                const isInstallment = transaction.isInstallment;
                                const displayAmount = transaction.amount;
                                const isTransfer = transaction.type === "transfer";
                                const isOutgoing = transaction.assetId === asset.id;

                                return (
                                  <TouchableOpacity
                                    key={transaction.id}
                                    style={[
                                      styles.listItem,
                                      index < group.transactions.length - 1 &&
                                        styles.listItemBorder,
                                    ]}
                                    activeOpacity={0.7}
                                    onPress={() => {
                                      if (transaction.category?.type === 'fixed') {
                                        setSelectedFixedTransaction(transaction);
                                        setShowFixedTransaction(true);
                                      } else {
                                        setEditingTransaction(transaction);
                                        setShowAddTransaction(true);
                                      }
                                    }}
                                  >
                                    <View style={styles.listItemContent}>
                                      <View style={styles.listItemTitleRow}>
                                        <Text style={styles.listItemTitle} numberOfLines={1}>
                                          {transaction.title}
                                        </Text>
                                        <View style={styles.indicatorRow}>
                                          {transaction.category?.type === 'fixed' && (
                                            <View style={styles.fixedIndicator}>
                                              <Ionicons name="repeat" size={12} color={colors.semantic.expense} />
                                            </View>
                                          )}
                                          {isInstallment &&
                                            transaction.currentTerm &&
                                            transaction.totalTerm && (
                                              <View style={styles.installmentBadge}>
                                                <Text style={styles.installmentBadgeText}>
                                                  {transaction.currentTerm}/
                                                  {transaction.totalTerm}
                                                </Text>
                                              </View>
                                            )}
                                        </View>
                                      </View>
                                      <Text style={styles.listItemSubtitle}>
                                        {transaction.category?.name || "미분류"}
                                        {isTransfer &&
                                          (isOutgoing
                                            ? ` → ${transaction.toAsset?.name || "알 수 없음"}`
                                            : ` ← ${transaction.asset?.name || "알 수 없음"}`)}
                                      </Text>
                                    </View>
                                    <Text
                                      style={[
                                        styles.listItemAmount,
                                        transaction.type === "income" && styles.incomeText,
                                        transaction.type === "expense" &&
                                          (isInstallment &&
                                          !transaction.includeInLivingExpense
                                            ? styles.excludedText
                                            : styles.expenseText),
                                        transaction.type === "transfer" &&
                                          styles.transferText,
                                      ]}
                                    >
                                      {transaction.type === "income"
                                        ? "+"
                                        : transaction.type === "transfer"
                                        ? isOutgoing
                                          ? "-"
                                          : "+"
                                        : "-"}
                                      {formatCurrency(displayAmount)}
                                    </Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          ))}
                        </View>
                      ) : (
                        <View style={styles.emptySection}>
                          <Text style={styles.emptyText}>
                            {formatMonthYear(selectedMonth)} 거래 내역이 없습니다
                          </Text>
                        </View>
                      )}
                    </SwipeableContainer>
                  </GestureHandlerRootView>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>

      {/* 내역 추가/수정 시트 */}
      <AddTransactionSheet
        visible={showAddTransaction}
        onClose={() => {
          setShowAddTransaction(false);
          setEditingTransaction(null);
        }}
        onSuccess={() => {
          if (asset) reloadData(asset, selectedMonth);
          setEditingTransaction(null);
          onTransactionChange?.();
        }}
        defaultAssetId={currentAsset?.id || asset?.id}
        editTransaction={editingTransaction}
      />

      {/* 고정 지출 거래 수정 시트 */}
      <FixedTransactionSheet
        visible={showFixedTransaction}
        transaction={selectedFixedTransaction}
        onClose={() => {
          setShowFixedTransaction(false);
          setSelectedFixedTransaction(null);
        }}
        onSuccess={() => {
          if (asset) reloadData(asset, selectedMonth);
          setSelectedFixedTransaction(null);
          onTransactionChange?.();
        }}
      />

      {/* 카드 대금 결제 모달 */}
      <Modal
        visible={showPaymentModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.paymentModalOverlay}>
          <View style={styles.paymentModalContent}>
            <Text style={styles.paymentModalTitle}>카드 대금 결제</Text>

            {/* 결제 금액 */}
            <View style={styles.paymentInputGroup}>
              <Text style={styles.paymentInputLabel}>결제 금액</Text>
              <View style={styles.paymentInputWrapper}>
                <TextInput
                  style={styles.paymentInput}
                  value={formatNumberWithComma(paymentAmount)}
                  onChangeText={(text) => setPaymentAmount(text.replace(/,/g, ""))}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={colors.text.tertiary}
                />
                <Text style={styles.paymentInputSuffix}>원</Text>
              </View>
            </View>

            {/* 출금 자산 선택 */}
            <View style={styles.paymentInputGroup}>
              <Text style={styles.paymentInputLabel}>출금 자산</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.assetSelector}
              >
                {paymentAssets.map((paymentAsset) => (
                  <TouchableOpacity
                    key={paymentAsset.id}
                    style={[
                      styles.assetOption,
                      selectedPaymentAsset?.id === paymentAsset.id && styles.assetOptionSelected,
                    ]}
                    onPress={() => setSelectedPaymentAsset(paymentAsset)}
                  >
                    <Ionicons
                      name={getAssetIcon(paymentAsset.type)}
                      size={16}
                      color={selectedPaymentAsset?.id === paymentAsset.id ? colors.primary.main : colors.text.secondary}
                    />
                    <Text
                      style={[
                        styles.assetOptionText,
                        selectedPaymentAsset?.id === paymentAsset.id && styles.assetOptionTextSelected,
                      ]}
                    >
                      {paymentAsset.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {selectedPaymentAsset && (
                <Text style={styles.assetBalanceInfo}>
                  잔액: {selectedPaymentAsset.balance.toLocaleString("ko-KR")}원
                </Text>
              )}
            </View>

            {/* 버튼 */}
            <View style={styles.paymentModalButtons}>
              <TouchableOpacity
                style={styles.paymentCancelButton}
                onPress={() => setShowPaymentModal(false)}
                disabled={isProcessingPayment}
              >
                <Text style={styles.paymentCancelButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.paymentConfirmButton,
                  (!selectedPaymentAsset || isProcessingPayment) && styles.paymentConfirmButtonDisabled,
                ]}
                onPress={handlePayment}
                disabled={!selectedPaymentAsset || isProcessingPayment}
              >
                {isProcessingPayment ? (
                  <ActivityIndicator size="small" color={colors.text.inverse} />
                ) : (
                  <Text style={styles.paymentConfirmButtonText}>결제하기</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
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
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: borderRadius["2xl"],
    borderTopRightRadius: borderRadius["2xl"],
    flex: 1,
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
  scrollView: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing["3xl"],
  },
  assetCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  assetCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  assetIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  assetCardInfo: {
    flex: 1,
  },
  assetName: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
  },
  assetType: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  assetBalance: {
    fontSize: typography.fontSize["2xl"],
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.sm,
  },
  positiveBalance: {
    color: colors.text.primary,
  },
  negativeBalance: {
    color: colors.semantic.expense,
  },
  billingInfo: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    marginBottom: spacing.md,
  },
  billingAmountContainer: {
    flexDirection: "row",
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.base,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  billingAmountItem: {
    flex: 1,
    alignItems: "center",
  },
  billingAmountDivider: {
    width: 1,
    backgroundColor: colors.border.light,
    marginHorizontal: spacing.sm,
  },
  billingAmountLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    marginBottom: spacing.xs,
  },
  billingAmountValue: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.semantic.expense,
  },
  incomeText: {
    color: colors.semantic.income,
  },
  expenseText: {
    color: colors.semantic.expense,
  },
  excludedText: {
    color: colors.text.tertiary,
  },
  transferText: {
    color: colors.semantic.transfer,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  sectionTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
  },
  addTransactionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary.light + "30",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  addTransactionText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.primary.main,
  },
  sectionTotal: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.semantic.expense,
  },
  sectionCount: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  },
  monthNavigator: {
    flexDirection: "row",
    alignItems: "center",
  },
  monthNavButton: {
    padding: spacing.xs,
  },
  monthNavText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
    minWidth: 80,
    textAlign: "center",
  },
  transactionCount: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.sm,
  },
  filterRow: {
    flexDirection: 'row',
    marginVertical: spacing.sm,
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.base,
    padding: 2,
  },
  filterButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  filterButtonActive: {
    backgroundColor: colors.background.secondary,
    ...shadows.sm,
  },
  filterButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.tertiary,
  },
  filterButtonTextActive: {
    color: colors.primary.main,
    fontWeight: typography.fontWeight.semiBold,
  },
  listCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
  },
  listItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  listItemContent: {
    flex: 1,
  },
  listItemTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  listItemTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
    flexShrink: 1,
  },
  indicatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginLeft: spacing.sm,
    flexShrink: 0,
  },
  fixedIndicator: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.semantic.expense + "20",
    alignItems: "center",
    justifyContent: "center",
  },
  listItemSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  listItemAmount: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.semantic.expense,
  },
  installmentBadge: {
    backgroundColor: colors.primary.light + "30",
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.sm,
  },
  installmentBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.primary.main,
  },
  swipeArea: {
    flex: 1,
  },
  emptySection: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.xl,
    alignItems: "center",
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  },
  // 날짜 헤더
  dateHeader: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    backgroundColor: colors.background.tertiary,
  },
  dateHeaderText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
  },
  // 카드 대금 결제 버튼
  paymentButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary.main,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.base,
    gap: spacing.xs,
  },
  paymentButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.inverse,
  },
  // 결제 모달
  paymentModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  paymentModalContent: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    width: "100%",
    maxWidth: 400,
    ...shadows.lg,
  },
  paymentModalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.lg,
    textAlign: "center",
  },
  paymentInputGroup: {
    marginBottom: spacing.lg,
  },
  paymentInputLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  paymentInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.base,
    borderWidth: 1,
    borderColor: colors.border.light,
    paddingHorizontal: spacing.md,
  },
  paymentInput: {
    flex: 1,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
    paddingVertical: spacing.md,
    textAlign: "right",
  },
  paymentInputSuffix: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    marginLeft: spacing.xs,
  },
  assetSelector: {
    maxHeight: 50,
  },
  assetOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background.secondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.base,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.light,
    gap: spacing.xs,
  },
  assetOptionSelected: {
    borderColor: colors.primary.main,
    backgroundColor: colors.primary.light + "20",
  },
  assetOptionText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
  },
  assetOptionTextSelected: {
    color: colors.primary.main,
  },
  assetBalanceInfo: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    marginTop: spacing.sm,
  },
  paymentModalButtons: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  paymentCancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.base,
    backgroundColor: colors.background.tertiary,
    alignItems: "center",
  },
  paymentCancelButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
  },
  paymentConfirmButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.base,
    backgroundColor: colors.primary.main,
    alignItems: "center",
  },
  paymentConfirmButtonDisabled: {
    opacity: 0.5,
  },
  paymentConfirmButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.inverse,
  },
});
