import { Redirect, Stack, useSegments } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';

export default function RootLayout() {
  const { session, role, loading } = useAuth();
  const segments = useSegments();
  const firstSegment = segments[0];
  const inAuthGroup = firstSegment === 'login' || firstSegment === 'register';
  const inTabsGroup = firstSegment === '(tabs)';
  const inAdminGroup = firstSegment === 'admin';

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {!session && !inAuthGroup && <Redirect href="/login" />}
      {session && !role && !inAuthGroup && <Redirect href="/login" />}
      {session && role === 'admin' && inAuthGroup && (
        <Redirect href="/admin" />
      )}
      {session && (role === 'student' || role === 'teacher') && inAuthGroup && (
        <Redirect href="/(tabs)" />
      )}
      {session && role === 'admin' && inTabsGroup && (
        <Redirect href="/admin" />
      )}
      {session &&
        (role === 'student' || role === 'teacher') &&
        inAdminGroup && (
          <Redirect href="/(tabs)" />
        )}
      <Stack.Screen name="index" />
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