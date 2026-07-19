import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#090D16' },
          headerTintColor: '#F8FAFC',
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: '#090D16' },
        }}
      >
        <Stack.Screen name="(tabs)/dashboard" options={{ title: 'GameScribe Projects' }} />
        <Stack.Screen name="(tabs)/projects/[projectId]" options={{ title: 'Script Details' }} />
        <Stack.Screen name="generate" options={{ title: 'New Script Package', presentation: 'modal' }} />
        <Stack.Screen name="(auth)/login" options={{ title: 'Login' }} />
        <Stack.Screen name="(auth)/signup" options={{ title: 'Sign Up' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
