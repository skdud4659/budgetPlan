import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { enableScreens } from 'react-native-screens';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { colors } from '../src/styles';
import { SettingsProvider } from '../src/contexts/SettingsContext';

// Android에서 react-native-screens 관련 이슈 해결
enableScreens(true);

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SettingsProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background.primary },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </SettingsProvider>
    </GestureHandlerRootView>
  );
}
