import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { useFocusEffect } from 'expo-router';
import { colors, typography, spacing, borderRadius, shadows, assetTypeConfig } from '../../src/styles';
import type { Asset, AssetType } from '../../src/types';
import { assetService } from '../../src/services/assetService';
import { transactionService } from '../../src/services/transactionService';
import AddAssetSheet from '../../src/components/AddAssetSheet';
import AssetDetailSheet from '../../src/components/AssetDetailSheet';
import ConfirmModal from '../../src/components/ConfirmModal';

type CardBillingInfo = {
  [assetId: string]: { currentBilling: number; nextBilling: number };
};

export default function AssetsScreen() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Asset | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [cardBillingInfo, setCardBillingInfo] = useState<CardBillingInfo>({});

  // 자산 목록 불러오기
  const loadAssets = useCallback(async () => {
    try {
      const data = await assetService.getAssets();
      setAssets(data);

      // 카드 자산의 결제 예정 금액 로드
      const cardAssets = data.filter(
        (a) => a.type === 'card' && a.settlementDate && a.billingDate
      );
      const billingInfoPromises = cardAssets.map(async (card) => {
        const billing = await transactionService.getCardBillingAmount(
          card.id,
          card.settlementDate!,
          card.billingDate!
        );
        return { id: card.id, billing };
      });
      const billingResults = await Promise.all(billingInfoPromises);
      const billingMap: CardBillingInfo = {};
      billingResults.forEach((result) => {
        billingMap[result.id] = result.billing;
      });
      setCardBillingInfo(billingMap);
    } catch (error: any) {
      console.log('Error loading assets:', error.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 탭이 포커스될 때마다 데이터 새로고침
  useFocusEffect(
    useCallback(() => {
      loadAssets();
    }, [loadAssets])
  );

  // 자산 추가/수정 처리
  const handleSubmitAsset = async (data: {
    name: string;
    type: AssetType;
    balance: number;
    billingDate?: number;
    settlementDate?: number;
  }) => {
    try {
      if (editingAsset) {
        await assetService.updateAsset(editingAsset.id, data);
      } else {
        await assetService.createAsset(data);
      }
      loadAssets();
    } catch (error: any) {
      console.log('Error saving asset:', error.message);
    }
  };

  // 자산 삭제 처리
  const handleDeleteAsset = (asset: Asset) => {
    setDeleteTarget(asset);
  };

  // 삭제 확인
  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      await assetService.deleteAsset(deleteTarget.id);
      handleCloseSheet();
      loadAssets();
    } catch (error: any) {
      console.log('Delete error:', error);
    } finally {
      setDeleteTarget(null);
    }
  };

  // 자산 상세 보기
  const handleViewAsset = (asset: Asset) => {
    setSelectedAsset(asset);
  };

  // 자산 수정 모달 열기
  const handleEditAsset = (asset: Asset) => {
    setSelectedAsset(null); // 상세 시트 닫기
    setEditingAsset(asset);
    setShowAddSheet(true);
  };

  // 모달 닫기
  const handleCloseSheet = () => {
    setShowAddSheet(false);
    setEditingAsset(null);
  };

  const totalAssets = assets
    .filter((asset) => asset.balance > 0)
    .reduce((sum, asset) => sum + asset.balance, 0);

  const totalLiabilities = assets
    .filter((asset) => asset.balance < 0)
    .reduce((sum, asset) => sum + Math.abs(asset.balance), 0);

  const netWorth = totalAssets - totalLiabilities;

  const formatCurrency = (amount: number) => {
    return Math.abs(amount).toLocaleString('ko-KR') + '원';
  };

  // 자산 종류별 그룹핑
  const groupedAssets = assets.reduce((acc, asset) => {
    const group = acc.find((g) => g.type === asset.type);
    if (group) {
      group.assets.push(asset);
    } else {
      acc.push({ type: asset.type, assets: [asset] });
    }
    return acc;
  }, [] as { type: AssetType; assets: Asset[] }[]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>자산</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddSheet(true)}
        >
          <Ionicons name="add" size={24} color={colors.primary.main} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Net Worth Card */}
        <View style={styles.netWorthCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryTitle}>순자산</Text>
          </View>

          <View style={styles.summaryItem}>
            <View style={styles.summaryLabelRow}>
              <View style={[styles.dot, { backgroundColor: colors.semantic.income }]} />
              <Text style={styles.summaryLabel}>자산</Text>
            </View>
            <Text style={[styles.summaryAmount, styles.assetAmount]}>
              {formatCurrency(totalAssets)}
            </Text>
          </View>

          <View style={styles.summaryItem}>
            <View style={styles.summaryLabelRow}>
              <View style={[styles.dot, { backgroundColor: colors.semantic.expense }]} />
              <Text style={styles.summaryLabel}>부채</Text>
            </View>
            <Text style={[styles.summaryAmount, styles.liabilityAmount]}>
              -{formatCurrency(totalLiabilities)}
            </Text>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>합계</Text>
            <Text style={styles.totalAmount}>
              {formatCurrency(netWorth)}
            </Text>
          </View>
        </View>

        {/* Asset List by Type */}
        {groupedAssets.length > 0 ? (
          groupedAssets.map((group, groupIndex) => (
            <View
              key={group.type}
              style={[
                styles.assetGroup,
                groupIndex === groupedAssets.length - 1 && styles.assetGroupLast,
              ]}
            >
              <View style={styles.groupHeader}>
                <View
                  style={[
                    styles.groupIcon,
                    { backgroundColor: assetTypeConfig[group.type].color + '20' },
                  ]}
                >
                  <Ionicons
                    name={getAssetIcon(group.type)}
                    size={14}
                    color={assetTypeConfig[group.type].color}
                  />
                </View>
                <Text style={styles.groupTitle}>
                  {assetTypeConfig[group.type].label}
                </Text>
              </View>
              <View style={styles.assetList}>
                {group.assets.map((asset, index) => (
                  <AssetCard
                    key={asset.id}
                    asset={asset}
                    isLast={index === group.assets.length - 1}
                    onPress={() => handleViewAsset(asset)}
                    onDelete={() => handleDeleteAsset(asset)}
                    billingInfo={cardBillingInfo[asset.id]}
                  />
                ))}
              </View>
            </View>
          ))
        ) : (
          !isLoading && (
            <View style={styles.emptyContainer}>
              <Ionicons name="wallet-outline" size={64} color={colors.text.tertiary} />
              <Text style={styles.emptyText}>등록된 자산이 없습니다</Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => setShowAddSheet(true)}
              >
                <Text style={styles.emptyButtonText}>자산 추가하기</Text>
              </TouchableOpacity>
            </View>
          )
        )}
      </ScrollView>

      {/* 자산 상세 시트 */}
      <AssetDetailSheet
        visible={!!selectedAsset}
        asset={selectedAsset}
        onClose={() => setSelectedAsset(null)}
        onEdit={() => selectedAsset && handleEditAsset(selectedAsset)}
        onDelete={() => {
          if (selectedAsset) {
            setSelectedAsset(null);
            handleDeleteAsset(selectedAsset);
          }
        }}
      />

      {/* 자산 추가/수정 바텀시트 */}
      <AddAssetSheet
        visible={showAddSheet}
        onClose={handleCloseSheet}
        onSubmit={handleSubmitAsset}
        onDelete={editingAsset ? () => handleDeleteAsset(editingAsset) : undefined}
        editAsset={editingAsset}
      />

      {/* 삭제 확인 모달 */}
      <ConfirmModal
        visible={!!deleteTarget}
        title="자산 삭제"
        message={`"${deleteTarget?.name}"을(를) 삭제하시겠습니까?`}
        confirmText="삭제"
        cancelText="취소"
        isDestructive={true}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </SafeAreaView>
  );
}

function getAssetIcon(type: AssetType): keyof typeof Ionicons.glyphMap {
  const iconMap: Record<AssetType, keyof typeof Ionicons.glyphMap> = {
    bank: 'business-outline',
    card: 'card-outline',
    cash: 'cash-outline',
    loan: 'document-text-outline',
    insurance: 'shield-checkmark-outline',
    investment: 'trending-up-outline',
    savings: 'wallet-outline',
    emoney: 'phone-portrait-outline',
    point: 'star-outline',
    other: 'ellipsis-horizontal',
  };
  return iconMap[type];
}

function AssetCard({
  asset,
  isLast,
  onPress,
  onDelete,
  billingInfo,
}: {
  asset: Asset;
  isLast: boolean;
  onPress: () => void;
  onDelete: () => void;
  billingInfo?: { currentBilling: number; nextBilling: number };
}) {
  const swipeableRef = useRef<Swipeable>(null);

  const formatCurrency = (amount: number) => {
    return Math.abs(amount).toLocaleString('ko-KR') + '원';
  };

  const isNegative = asset.balance < 0;
  const isCard = asset.type === 'card';

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0.5],
      extrapolate: 'clamp',
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
          <Ionicons name="trash-outline" size={22} color={colors.text.inverse} />
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
        style={[styles.assetCard, !isLast && styles.assetCardBorder]}
        activeOpacity={0.7}
        onPress={onPress}
      >
        <View style={styles.assetInfo}>
          <Text style={styles.assetName}>{asset.name}</Text>
          {isCard && asset.billingDate && (
            <Text style={styles.assetBillingDate}>
              {asset.settlementDate
                ? `정산 ${asset.settlementDate}일 / 결제 ${asset.billingDate}일`
                : `결제일 ${asset.billingDate}일`}
            </Text>
          )}
        </View>

        {isCard && billingInfo ? (
          <View style={styles.cardBillingInfo}>
            <View style={styles.billingRow}>
              <Text style={styles.billingLabel}>이번달</Text>
              <Text style={styles.billingAmount}>
                {formatCurrency(billingInfo.currentBilling)}
              </Text>
            </View>
            <View style={styles.billingRow}>
              <Text style={styles.billingLabel}>다음달</Text>
              <Text style={styles.billingAmountNext}>
                {formatCurrency(billingInfo.nextBilling)}
              </Text>
            </View>
          </View>
        ) : (
          <Text
            style={[
              styles.assetBalance,
              isNegative ? styles.negativeBalance : styles.positiveBalance,
            ]}
          >
            {isNegative ? '-' : ''}
            {formatCurrency(asset.balance)}
          </Text>
        )}
      </TouchableOpacity>
    </Swipeable>
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
  },
  headerTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.base,
    backgroundColor: colors.primary.light + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  netWorthCard: {
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  summaryLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  assetAmount: {
    color: colors.semantic.income,
  },
  liabilityAmount: {
    color: colors.semantic.expense,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.base,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  totalLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  totalAmount: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  assetGroup: {
    marginBottom: spacing.lg,
  },
  assetGroupLast: {
    marginBottom: 0,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingLeft: spacing.xs,
  },
  groupIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
  groupTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.tertiary,
  },
  assetList: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  deleteAction: {
    backgroundColor: colors.semantic.expense,
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
  },
  assetCard: {
    backgroundColor: colors.background.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
  },
  assetCardBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  assetInfo: {
    flex: 1,
  },
  assetName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  assetBillingDate: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  assetBalance: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
  },
  positiveBalance: {
    color: colors.text.primary,
  },
  negativeBalance: {
    color: colors.semantic.expense,
  },
  cardBillingInfo: {
    alignItems: 'flex-end',
  },
  billingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  billingLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
  },
  billingAmount: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.semantic.expense,
  },
  billingAmountNext: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.tertiary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['3xl'],
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    color: colors.text.tertiary,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
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
});
