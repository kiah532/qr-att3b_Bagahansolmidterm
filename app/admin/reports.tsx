import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import {
  getAdminDashboardStats,
  getAdminEventAttendanceCounts,
  getAdminEvents,
  type AdminDashboardStats,
  type AdminEvent,
} from '../../lib/events';
import { supabase } from '../../lib/supabase';

const emptyStats: AdminDashboardStats = {
  registeredUsers: 0,
  totalEvents: 0,
  attendanceScans: 0,
  openEvents: 0,
  closedEvents: 0,
};

export default function ReportsScreen() {
  const router = useRouter();
  const [stats, setStats] = useState(emptyStats);
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [counts, setCounts] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);

  const loadReport = useCallback(async () => {
    setLoading(true);
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
        .select('role')
        .eq('id', user.id)
        .maybeSingle();
      if (profileError) throw profileError;
      if (profile?.role !== 'admin') {
        router.replace('/(tabs)');
        return;
      }

      const [nextStats, nextEvents, nextCounts] = await Promise.all([
        getAdminDashboardStats(),
        getAdminEvents(),
        getAdminEventAttendanceCounts(),
      ]);
      setStats(nextStats);
      setEvents(nextEvents);
      setCounts(nextCounts);
    } catch (error) {
      console.error('Failed to load admin reports:', error);
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to load reports.'
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      void loadReport();
    }, [loadReport])
  );

  const summaries = [
    { label: 'Registered Users', value: stats.registeredUsers, icon: 'people-outline' as const },
    { label: 'Total Events', value: stats.totalEvents, icon: 'calendar-outline' as const },
    { label: 'Attendance Scans', value: stats.attendanceScans, icon: 'checkmark-done-outline' as const },
    { label: 'Open Events', value: stats.openEvents, icon: 'radio-button-on-outline' as const },
    { label: 'Closed Events', value: stats.closedEvents, icon: 'close-circle-outline' as const },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to Admin Dashboard"
          style={styles.backButton}
          onPress={() => router.replace('/admin')}
        >
          <Ionicons name="arrow-back" size={23} color="#36433A" />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Reports</Text>
          <Text style={styles.subtitle}>System attendance summary</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Refresh reports"
          style={styles.refreshButton}
          onPress={() => void loadReport()}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#398653" />
          ) : (
            <Ionicons name="refresh-outline" size={22} color="#398653" />
          )}
        </Pressable>
      </View>

      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.eventCard}>
            <View style={styles.eventCopy}>
              <Text style={styles.eventTitle}>{item.title}</Text>
              <Text style={styles.eventCode}>Code: {item.event_code}</Text>
            </View>
            <View style={styles.eventSummary}>
              <Text style={styles.scanCount}>{counts.get(item.id) ?? 0}</Text>
              <Text style={styles.scanLabel}>scans</Text>
              <Text
                style={[
                  styles.status,
                  item.status === 'closed' ? styles.closed : styles.open,
                ]}
              >
                {item.status.toUpperCase()}
              </Text>
            </View>
          </View>
        )}
        ListHeaderComponent={
          <View>
            <View style={styles.summaryIntro}>
              <Text style={styles.summaryTitle}>System Summary</Text>
              <Text style={styles.summaryDescription}>
                Current totals from Supabase
              </Text>
            </View>
            <View style={styles.statsGrid}>
              {summaries.map((item) => (
                <View key={item.label} style={styles.statCard}>
                  <View style={styles.statIcon}>
                    <Ionicons name={item.icon} size={20} color="#398653" />
                  </View>
                  <Text style={styles.statValue}>{item.value}</Text>
                  <Text style={styles.statLabel}>{item.label}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.sectionTitle}>Attendance per Event</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            {loading ? (
              <ActivityIndicator size="large" color="#398653" />
            ) : (
              <Text style={styles.emptyText}>No events found.</Text>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F3' },
  header: {
    minHeight: 76,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8E2',
  },
  backButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, marginLeft: 8 },
  title: { color: '#26352B', fontSize: 20, fontWeight: '800' },
  subtitle: { color: '#748078', fontSize: 13, marginTop: 3 },
  refreshButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  list: {
    width: '100%',
    maxWidth: 1080,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingBottom: 30,
  },
  summaryIntro: { paddingTop: 20, paddingBottom: 12 },
  summaryTitle: { color: '#26352B', fontSize: 18, fontWeight: '800' },
  summaryDescription: { color: '#748078', fontSize: 13, marginTop: 4 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 25 },
  statCard: {
    flexGrow: 1,
    flexBasis: 175,
    minHeight: 125,
    padding: 15,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8E2',
    borderRadius: 14,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF3EC',
    marginBottom: 8,
  },
  statValue: { color: '#26352B', fontSize: 24, fontWeight: '800' },
  statLabel: { color: '#748078', fontSize: 12, marginTop: 3 },
  sectionTitle: { color: '#26352B', fontSize: 18, fontWeight: '800', marginBottom: 12 },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8E2',
    borderRadius: 13,
    padding: 16,
    marginBottom: 10,
  },
  eventCopy: { flex: 1 },
  eventTitle: { color: '#2E3A32', fontSize: 15, fontWeight: '700' },
  eventCode: { color: '#748078', fontSize: 12, marginTop: 4 },
  eventSummary: { alignItems: 'flex-end' },
  scanCount: { color: '#26352B', fontSize: 20, fontWeight: '800' },
  scanLabel: { color: '#748078', fontSize: 10 },
  status: { fontSize: 10, fontWeight: '800', marginTop: 5 },
  open: { color: '#398653' },
  closed: { color: '#9A634A' },
  empty: { alignItems: 'center', padding: 36 },
  emptyText: { color: '#748078', fontSize: 14 },
});
