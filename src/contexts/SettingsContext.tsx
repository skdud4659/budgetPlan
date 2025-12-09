import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { settingsService } from '../services/settingsService';
import { supabase } from '../config/supabase';
import type { AppSettings } from '../types';

interface SettingsContextType {
  settings: AppSettings | null;
  isLoading: boolean;
  // 개별 설정값 접근
  jointBudgetEnabled: boolean;
  monthStartDay: number;
  defaultAssetId: string | null;
  personalBudget: number;
  jointBudget: number;
  // 설정 업데이트 함수들
  updateJointBudgetEnabled: (value: boolean) => Promise<void>;
  updateMonthStartDay: (day: number) => Promise<void>;
  updateDefaultAssetId: (assetId: string | null) => Promise<void>;
  updateBudgets: (personal: number, joint: number) => Promise<void>;
  // 설정 새로고침
  refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

interface SettingsProviderProps {
  children: ReactNode;
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // 설정 로드
  const loadSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await settingsService.getSettings();
      setSettings(data);
    } catch (error) {
      console.error('Error loading settings:', error);
      setSettings(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 인증 상태 감시 및 초기 로드
  useEffect(() => {
    // 현재 세션 확인
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      if (session) {
        loadSettings();
      } else {
        setIsLoading(false);
      }
    });

    // 인증 상태 변화 구독
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
      if (session) {
        loadSettings();
      } else {
        setSettings(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadSettings]);

  // 공동 예산 모드 변경
  const updateJointBudgetEnabled = useCallback(async (value: boolean) => {
    try {
      // 낙관적 업데이트
      setSettings(prev => prev ? { ...prev, jointBudgetEnabled: value } : null);
      await settingsService.updateSettings({ jointBudgetEnabled: value });
    } catch (error) {
      // 실패 시 롤백
      setSettings(prev => prev ? { ...prev, jointBudgetEnabled: !value } : null);
      throw error;
    }
  }, []);

  // 월 시작일 변경
  const updateMonthStartDay = useCallback(async (day: number) => {
    const prevDay = settings?.monthStartDay;
    try {
      setSettings(prev => prev ? { ...prev, monthStartDay: day } : null);
      await settingsService.updateSettings({ monthStartDay: day });
    } catch (error) {
      setSettings(prev => prev ? { ...prev, monthStartDay: prevDay || 1 } : null);
      throw error;
    }
  }, [settings?.monthStartDay]);

  // 기본 자산 변경
  const updateDefaultAssetId = useCallback(async (assetId: string | null) => {
    const prevAssetId = settings?.defaultAssetId;
    try {
      setSettings(prev => prev ? { ...prev, defaultAssetId: assetId } : null);
      await settingsService.updateSettings({ defaultAssetId: assetId });
    } catch (error) {
      setSettings(prev => prev ? { ...prev, defaultAssetId: prevAssetId || null } : null);
      throw error;
    }
  }, [settings?.defaultAssetId]);

  // 예산 변경
  const updateBudgets = useCallback(async (personal: number, joint: number) => {
    const prevPersonal = settings?.personalBudget;
    const prevJoint = settings?.jointBudget;
    try {
      setSettings(prev => prev ? { ...prev, personalBudget: personal, jointBudget: joint } : null);
      await settingsService.updateSettings({ personalBudget: personal, jointBudget: joint });
    } catch (error) {
      setSettings(prev => prev ? {
        ...prev,
        personalBudget: prevPersonal || 0,
        jointBudget: prevJoint || 0
      } : null);
      throw error;
    }
  }, [settings?.personalBudget, settings?.jointBudget]);

  const value: SettingsContextType = {
    settings,
    isLoading,
    jointBudgetEnabled: settings?.jointBudgetEnabled ?? false,
    monthStartDay: settings?.monthStartDay ?? 1,
    defaultAssetId: settings?.defaultAssetId ?? null,
    personalBudget: settings?.personalBudget ?? 0,
    jointBudget: settings?.jointBudget ?? 0,
    updateJointBudgetEnabled,
    updateMonthStartDay,
    updateDefaultAssetId,
    updateBudgets,
    refreshSettings: loadSettings,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
