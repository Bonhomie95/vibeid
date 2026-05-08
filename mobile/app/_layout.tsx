import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Constants from 'expo-constants';
import { useEffect } from 'react';
import { configureApi } from '../lib/api';
import { theme } from '../lib/theme';

export default function RootLayout() {
  useEffect(() => {
    const url =
      (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ||
      (process.env.EXPO_PUBLIC_API_URL as string | undefined) ||
      'http://192.168.100.54:4000';
    configureApi(url);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.bg }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.bg },
            animation: 'fade',
          }}
        />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
