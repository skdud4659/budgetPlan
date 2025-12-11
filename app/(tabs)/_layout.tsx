import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadows } from '../../src/styles';
import { View, StyleSheet, Platform } from 'react-native';

type IconName = keyof typeof Ionicons.glyphMap;

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary.main,
        tabBarInactiveTintColor: colors.text.tertiary,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
        tabBarItemStyle: styles.tabBarItem,
      }}
    >
      <Tabs.Screen
        name="transactions"
        options={{
          title: '내역',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              name={focused ? 'receipt' : 'receipt-outline'}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="budget"
        options={{
          title: '예산',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              name={focused ? 'calculator' : 'calculator-outline'}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="home"
        options={{
          href: null, // 숨김 (내역 탭으로 대체)
        }}
      />
      <Tabs.Screen
        name="scheduled"
        options={{
          href: null, // 숨김 (예산 탭으로 통합)
        }}
      />
      <Tabs.Screen
        name="assets"
        options={{
          title: '자산',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              name={focused ? 'pie-chart' : 'pie-chart-outline'}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '설정',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              name={focused ? 'settings' : 'settings-outline'}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
    </Tabs>
  );
}

function TabIcon({
  name,
  color,
  focused,
}: {
  name: IconName;
  color: string;
  focused: boolean;
}) {
  return (
    <View style={[styles.iconContainer, focused && styles.iconContainerFocused]}>
      <Ionicons name={name} size={22} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.background.secondary,
    borderTopWidth: 0,
    height: Platform.OS === 'ios' ? 80 : 60,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    ...shadows.lg,
  },
  tabBarItem: {
    paddingTop: 4,
  },
  iconContainer: {
    width: 40,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  iconContainerFocused: {
    backgroundColor: colors.primary.main + '20',
  },
});
