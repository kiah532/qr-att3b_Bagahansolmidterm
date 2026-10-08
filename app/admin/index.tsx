import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { signOut } from '../../lib/auth';
import {
  getAdminDashboardStats,
  type AdminDashboardStats,
} from '../../lib/events';
import { supabase } from '../../lib/supabase';

const initialStats: AdminDashboardStats = {
  registeredUsers: 0,
  totalEvents: 0,
  attendanceScans: 0,
  openEvents: 0,
  closedEvents: 0,
};

const statItems: {
  title: string;
  field: keyof AdminDashboardStats;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { title: 'Registered Users', field: 'registeredUsers', icon: 'people-outline' },
  { title: 'Total Events', field: 'totalEvents', icon: 'calendar-outline' },
  { title: 'Attendance Scans', field: 'attendanceScans', icon: 'checkmark-done-outline' },
  { title: 'Open Events', field: 'openEvents', icon: 'radio-button-on-outline' },
];

const managementItems: {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: '/admin/users' | '/admin/events' | '/admin/attendance' | '/admin/reports';
}[] = [
  { title: 'Manage Users', subtitle: 'View registered accounts', icon: 'people-outline', route: '/admin/users' },
  { title: 'Manage Events', subtitle: 'Create and manage events', icon: 'calendar-outline', route: '/admin/events' },
  { title: 'Attendance Records', subtitle: 'Review QR attendance scans', icon: 'document-text-outline', route: '/admin/attendance' },
  { title: 'Reports', subtitle: 'View system attendance summary', icon: 'bar-chart-outline', route: '/admin/reports' },
];

export default function AdminDashboard() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [stats, setStats] = useState(initialStats);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setRefreshing(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) {
        router.replace('/login');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email, role')
        .eq('id', user.id)
        .maybeSingle();
      if (profileError) throw profileError;

      if (profile?.role !== 'admin') {
        router.replace('/(tabs)');
        return;
      }

      setEmail(profile.email || user.email || '');
      setStats(await getAdminDashboardStats());
    } catch (error) {
      console.error('Failed to load admin dashboard:', error);
      Alert.alert(
        'Error',
        error instanceof Error
          ? error.message
          : 'Failed to load admin dashboard.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      void loadDashboard();
    }, [loadDashboard])
  );

  const handleSignOut = async () => {
    try {
      const { error } = await signOut();
      if (error) throw error;
      router.replace('/login');
    } catch (error) {
      Alert.alert(
        'Sign Out Error',
        error instanceof Error ? error.message : 'Could not sign out.'
      );
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#398653" />
        <Text style={styles.loadingText}>Loading Admin Dashboard...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.brand}>QR ATTENDANCE</Text>
            <Text style={styles.title}>Admin Dashboard</Text>
            <Text style={styles.email}>{email}</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Refresh dashboard"
              style={styles.iconButton}
              onPress={() => void loadDashboard()}
              disabled={refreshing}
            >
              {refreshing ? (
                <ActivityIndicator size="small" color="#398653" />
              ) : (
                <Ionicons name="refresh-outline" size={21} color="#3C7650" />
              )}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={styles.logoutButton}
              onPress={handleSignOut}
            >
              <Ionicons name="log-out-outline" size={19} color="#fff" />
              <Text style={styles.logoutText}>Logout</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.statsGrid}>
          {statItems.map((item) => (
            <View key={item.field} style={styles.statCard}>
              <View style={styles.statIcon}>
                <Ionicons name={item.icon} size={20} color="#398653" />
              </View>
              <Text style={styles.statValue}>{stats[item.field]}</Text>
              <Text style={styles.statTitle}>{item.title}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>System Management</Text>
        <View style={styles.managementGrid}>
          {managementItems.map((item) => (
            <Pressable
              key={item.route}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.managementCard,
                pressed && styles.cardPressed,
              ]}
              onPress={() => router.push(item.route)}
            >
              <View style={styles.managementIcon}>
                <Ionicons name={item.icon} size={24} color="#398653" />
              </View>
              <View style={styles.managementCopy}>
                <Text style={styles.managementTitle}>{item.title}</Text>
                <Text style={styles.managementSubtitle}>{item.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#81877F" />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F3' },
  content: {
    width: '100%',
    maxWidth: 1120,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#F4F6F3',
  },
  loadingText: { color: '#5B665E', fontSize: 15 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    padding: 22,
    backgroundColor: '#fff',
    borderColor: '#E3E9E3',
    borderWidth: 1,
    borderRadius: 16,
    marginBottom: 22,
  },
  headerCopy: { flex: 1 },
  brand: {
    color: '#398653',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.3,
    marginBottom: 5,
  },
  title: { color: '#243229', fontSize: 27, fontWeight: '800' },
  email: { color: '#68746C', fontSize: 14, marginTop: 5 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#DDE6DE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: 11,
    backgroundColor: '#398653',
  },
  logoutText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 28,
  },
  statCard: {
    flexGrow: 1,
    flexBasis: 220,
    minHeight: 142,
    backgroundColor: '#fff',
    borderColor: '#E3E9E3',
    borderWidth: 1,
    borderRadius: 15,
    padding: 18,
  },
  statIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: '#EAF3EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statValue: { color: '#243229', fontSize: 27, fontWeight: '800' },
  statTitle: { color: '#68746C', fontSize: 13, marginTop: 3 },
  sectionTitle: {
    color: '#26352B',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 14,
  },
  managementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  managementCard: {
    flexGrow: 1,
    flexBasis: 340,
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
    backgroundColor: '#fff',
    borderColor: '#E3E9E3',
    borderWidth: 1,
    borderRadius: 15,
  },
  cardPressed: { backgroundColor: '#F0F6F1', opacity: 0.85 },
  managementIcon: {
    width: 46,
    height: 46,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF3EC',
  },
  managementCopy: { flex: 1 },
  managementTitle: { color: '#2F3C33', fontSize: 16, fontWeight: '700' },
  managementSubtitle: { color: '#78827B', fontSize: 13, marginTop: 4 },
});
