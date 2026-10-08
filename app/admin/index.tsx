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
import { useFocusEffect, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  signOut,
  useAuth,
} from '@/lib/auth';
import {
  getAdminDashboardStats,
  type AdminDashboardStats,
} from '@/lib/events';

const emptyStats: AdminDashboardStats = {
  registeredUsers: 0,
  totalEvents: 0,
  attendanceScans: 0,
  openEvents: 0,
  closedEvents: 0,
};

const statCards = [
  { key: 'registeredUsers', label: 'Registered Users', icon: 'people-outline' },
  { key: 'totalEvents', label: 'Total Events', icon: 'calendar-outline' },
  { key: 'attendanceScans', label: 'Attendance Scans', icon: 'scan-outline' },
  { key: 'openEvents', label: 'Open Events', icon: 'radio-button-on-outline' },
] as const;

const managementCards = [
  {
    title: 'Manage Users',
    description: 'View registered students, teachers, and administrators.',
    icon: 'people-outline',
    route: '/admin/users',
  },
  {
    title: 'Manage Events',
    description: 'Create events, update schedules, and manage event status.',
    icon: 'calendar-outline',
    route: '/admin/events',
  },
  {
    title: 'Attendance Records',
    description: 'Search and review QR attendance scans.',
    icon: 'document-text-outline',
    route: '/admin/attendance',
  },
  {
    title: 'Reports',
    description: 'Review system totals and event attendance summaries.',
    icon: 'bar-chart-outline',
    route: '/admin/reports',
  },
] as const;

export default function AdminDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [stats, setStats] = useState(emptyStats);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const loadDashboard = useCallback(async () => {
    setRefreshing(true);
    try {
      setStats(await getAdminDashboardStats());
    } catch (error) {
      console.error('Failed to load admin dashboard:', error);
      Alert.alert(
        'Unable to load dashboard',
        error instanceof Error ? error.message : 'Please try again.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadDashboard();
    }, [loadDashboard])
  );

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      const { error } = await signOut();
      if (error) {
        throw error;
      }
      router.replace('/login');
    } catch (error) {
      console.error('Failed to sign out:', error);
      Alert.alert(
        'Sign out failed',
        error instanceof Error ? error.message : 'Please try again.'
      );
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <View style={styles.brand}>
            <View style={styles.brandIcon}>
              <Ionicons name="qr-code-outline" size={22} color="#fff" />
            </View>
            <View>
              <Text style={styles.brandName}>QR Attendance</Text>
              <Text style={styles.brandContext}>Admin Dashboard</Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.logoutButton,
              pressed && styles.pressed,
            ]}
            onPress={() => void handleSignOut()}
            disabled={signingOut}
          >
            {signingOut ? (
              <ActivityIndicator size="small" color="#39794D" />
            ) : (
              <Ionicons name="log-out-outline" size={18} color="#39794D" />
            )}
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>
        </View>

        <View style={styles.welcome}>
          <View style={styles.welcomeCopy}>
            <Text style={styles.eyebrow}>ADMINISTRATION</Text>
            <Text style={styles.pageTitle}>Admin Dashboard</Text>
            <Text style={styles.pageSubtitle}>
              Monitor users, events, and attendance activity.
            </Text>
          </View>
          <View style={styles.adminProfile}>
            <View style={styles.avatar}>
              <Ionicons name="person-outline" size={19} color="#39794D" />
            </View>
            <View style={styles.profileText}>
              <Text style={styles.profileName}>Administrator</Text>
              <Text style={styles.profileEmail} numberOfLines={1}>
                {user?.email ?? 'Signed-in admin'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.sectionTitle}>System Overview</Text>
            <Text style={styles.sectionSubtitle}>
              Live totals from your Supabase database
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Refresh dashboard statistics"
            style={styles.refreshButton}
            onPress={() => void loadDashboard()}
            disabled={refreshing}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color="#39794D" />
            ) : (
              <Ionicons name="refresh-outline" size={20} color="#39794D" />
            )}
            <Text style={styles.refreshText}>Refresh</Text>
          </Pressable>
        </View>

        <View style={styles.statsGrid}>
          {statCards.map((card) => (
            <View key={card.key} style={styles.statCard}>
              <View style={styles.statIcon}>
                <Ionicons
                  name={card.icon}
                  size={21}
                  color="#39794D"
                />
              </View>
              {loading ? (
                <ActivityIndicator
                  size="small"
                  color="#39794D"
                  style={styles.statLoading}
                />
              ) : (
                <Text style={styles.statValue}>{stats[card.key]}</Text>
              )}
              <Text style={styles.statLabel}>{card.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.sectionTitle}>Management</Text>
            <Text style={styles.sectionSubtitle}>
              Choose an area to view or manage
            </Text>
          </View>
        </View>

        <View style={styles.managementGrid}>
          {managementCards.map((card) => (
            <Pressable
              key={card.title}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.managementCard,
                pressed && styles.cardPressed,
              ]}
              onPress={() => router.push(card.route)}
            >
              <View style={styles.managementIcon}>
                <Ionicons name={card.icon} size={22} color="#39794D" />
              </View>
              <View style={styles.managementCopy}>
                <Text style={styles.managementTitle}>{card.title}</Text>
                <Text style={styles.managementDescription}>
                  {card.description}
                </Text>
              </View>
              <Ionicons
                name="arrow-forward"
                size={19}
                color="#39794D"
              />
            </Pressable>
          ))}
        </View>

        <Text style={styles.footer}>QR Attendance Management System</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F3' },
  content: {
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingBottom: 36,
  },
  topBar: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8E2',
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  brandIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#398653',
  },
  brandName: { color: '#26352B', fontSize: 15, fontWeight: '800' },
  brandContext: { color: '#748078', fontSize: 12, marginTop: 2 },
  logoutButton: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderWidth: 1,
    borderColor: '#DDE8DF',
    borderRadius: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 13,
  },
  logoutText: { color: '#39794D', fontSize: 13, fontWeight: '700' },
  welcome: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 18,
    paddingTop: 30,
    paddingBottom: 27,
  },
  welcomeCopy: { flex: 1, minWidth: 240 },
  eyebrow: {
    color: '#398653',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
  },
  pageTitle: { color: '#26352B', fontSize: 29, fontWeight: '800' },
  pageSubtitle: { color: '#748078', fontSize: 14, marginTop: 6 },
  adminProfile: {
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#E2E8E2',
    borderRadius: 13,
    backgroundColor: '#fff',
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#EAF3EC',
  },
  profileText: { flexShrink: 1 },
  profileName: { color: '#2E3A32', fontSize: 13, fontWeight: '700' },
  profileEmail: { color: '#748078', fontSize: 12, marginTop: 2 },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 13,
  },
  sectionTitle: { color: '#26352B', fontSize: 18, fontWeight: '800' },
  sectionSubtitle: { color: '#748078', fontSize: 12, marginTop: 4 },
  refreshButton: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#DDE8DF',
    borderRadius: 9,
    backgroundColor: '#fff',
    paddingHorizontal: 11,
  },
  refreshText: { color: '#39794D', fontSize: 12, fontWeight: '700' },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 30,
  },
  statCard: {
    flexGrow: 1,
    flexBasis: 220,
    minHeight: 145,
    borderWidth: 1,
    borderColor: '#E2E8E2',
    borderRadius: 15,
    backgroundColor: '#fff',
    padding: 17,
  },
  statIcon: {
    width: 39,
    height: 39,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: '#EAF3EC',
    marginBottom: 12,
  },
  statValue: { color: '#26352B', fontSize: 26, fontWeight: '800' },
  statLoading: { alignSelf: 'flex-start', height: 31 },
  statLabel: { color: '#748078', fontSize: 12, marginTop: 3 },
  managementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  managementCard: {
    flexGrow: 1,
    flexBasis: 400,
    minHeight: 105,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    borderWidth: 1,
    borderColor: '#E2E8E2',
    borderRadius: 15,
    backgroundColor: '#fff',
    paddingHorizontal: 17,
    paddingVertical: 16,
  },
  managementIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: '#EAF3EC',
  },
  managementCopy: { flex: 1 },
  managementTitle: { color: '#2E3A32', fontSize: 15, fontWeight: '800' },
  managementDescription: {
    color: '#748078',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  footer: {
    color: '#98A29A',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 30,
  },
  pressed: { opacity: 0.72 },
  cardPressed: { borderColor: '#A9C6B0', backgroundColor: '#FBFDFB' },
});
