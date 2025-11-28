import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows, assetTypeConfig } from '../../src/styles';
import type { Asset, AssetType } from '../../src/types';
import { assetService } from '../../src/services/assetService';
import AddAssetSheet from '../../src/components/AddAssetSheet';

export default function AssetsScreen() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

  // 자산 목록 불러오기
  const loadAssets = useCallback(async () => {
    try {
      const data = await assetService.getAssets();
      setAssets(data);
    } catch (error: any) {
      Alert.alert('오류', error.message || '자산 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

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
      Alert.alert('오류', error.message || '자산 저장에 실패했습니다.');
    }
  };

  // 자산 삭제 처리
  const handleDeleteAsset = (asset: Asset) => {
    Alert.alert(
      '자산 삭제',
      `"${asset.name}"을(를) 삭제하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await assetService.deleteAsset(asset.id);
              loadAssets();
            } catch (error: any) {
              Alert.alert('오류', error.message || '자산 삭제에 실패했습니다.');
            }
          },
        },
      ]
    );
  };

  // 자산 수정 모달 열기
  const handleEditAsset = (asset: Asset) => {
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
          <Text style={styles.netWorthLabel}>순자산</Text>
          <Text style={styles.netWorthAmount}>{formatCurrency(netWorth)}</Text>

          <View style={styles.netWorthDetails}>
            <View style={styles.netWorthItem}>
              <View style={styles.netWorthLabelRow}>
                <View style={[styles.dot, { backgroundColor: colors.semantic.income }]} />
                <Text style={styles.netWorthItemLabel}>자산</Text>
              </View>
              <Text style={[styles.netWorthItemAmount, styles.assetAmount]}>
                {formatCurrency(totalAssets)}
              </Text>
            </View>
            <View style={styles.netWorthDivider} />
            <View style={styles.netWorthItem}>
              <View style={styles.netWorthLabelRow}>
                <View style={[styles.dot, { backgroundColor: colors.semantic.expense }]} />
                <Text style={styles.netWorthItemLabel}>부채</Text>
              </View>
              <Text style={[styles.netWorthItemAmount, styles.liabilityAmount]}>
                {formatCurrency(totalLiabilities)}
              </Text>
            </View>
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
                    onEdit={() => handleEditAsset(asset)}
                    onDelete={() => handleDeleteAsset(asset)}
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

      {/* 자산 추가/수정 바텀시트 */}
      <AddAssetSheet
        visible={showAddSheet}
        onClose={handleCloseSheet}
        onSubmit={handleSubmitAsset}
        editAsset={editingAsset}
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
  onEdit,
  onDelete,
}: {
  asset: Asset;
  isLast: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const formatCurrency = (amount: number) => {
    return Math.abs(amount).toLocaleString('ko-KR') + '원';
  };

  const isNegative = asset.balance < 0;
  const isCard = asset.type === 'card';

  return (
    <TouchableOpacity
      style={[styles.assetCard, !isLast && styles.assetCardBorder]}
      activeOpacity={0.7}
      onPress={onEdit}
      onLongPress={onDelete}
      delayLongPress={500}
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

      <Text
        style={[
          styles.assetBalance,
          isNegative ? styles.negativeBalance : styles.positiveBalance,
        ]}
      >
        {isNegative ? '-' : ''}
        {formatCurrency(asset.balance)}
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
    backgroundColor: colors.primary.main,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.lg,
  },
  netWorthLabel: {
    fontSize: typography.fontSize.md,
    color: colors.primary.contrast,
    opacity: 0.8,
    marginBottom: spacing.xs,
  },
  netWorthAmount: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.primary.contrast,
    marginBottom: spacing.lg,
  },
  netWorthDetails: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: borderRadius.base,
    padding: spacing.md,
  },
  netWorthItem: {
    flex: 1,
    alignItems: 'center',
  },
  netWorthLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs,
  },
  netWorthItemLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.primary.contrast,
    opacity: 0.9,
  },
  netWorthItemAmount: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
  },
  assetAmount: {
    color: colors.primary.contrast,
  },
  liabilityAmount: {
    color: colors.primary.contrast,
  },
  netWorthDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: spacing.md,
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
    ...shadows.sm,
  },
  assetCard: {
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
