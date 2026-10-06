import { Redirect, Stack, useSegments } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';

export default function RootLayout() {
  const { session, role, loading } = useAuth();
  const segments = useSegments();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const path = segments?.[0];

  const inAuthGroup = path === 'login' || path === 'register';
  const inTabsGroup = path === '(tabs)';
  const inAdminPage = path === 'admin';

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Not logged in → Login */}
      {!session && inTabsGroup && <Redirect href="/login" />}
      {!session && inAdminPage && <Redirect href="/login" />}

      {/* Logged in → redirect based on role */}
      {session && inAuthGroup && role === 'admin' && (
        <Redirect href="/admin" />
      )}

      {session && inAuthGroup && role !== 'admin' && (
        <Redirect href="/(tabs)" />
      )}

      {/* Admin should not access student/teacher tabs */}
      {session && role === 'admin' && inTabsGroup && (
        <Redirect href="/admin" />
      )}

      {/* Student/Teacher should not access Admin page */}
      {session && role !== 'admin' && inAdminPage && (
        <Redirect href="/(tabs)" />
      )}

      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="admin" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
});