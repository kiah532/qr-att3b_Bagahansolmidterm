import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import {
  getAdminAttendanceRecords,
  type AdminAttendanceRecord,
} from '../../lib/attendance';
import { supabase } from '../../lib/supabase';

export default function AttendanceRecordsScreen() {
  const router = useRouter();
  const [records, setRecords] = useState<AdminAttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [eventSearch, setEventSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setRefreshing(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.replace('/login');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      if (profile?.role !== 'admin') {
        Alert.alert(
          'Access Denied',
          'This page is only available to administrators.'
        );
        router.replace('/(tabs)');
        return;
      }

      setRecords(await getAdminAttendanceRecords());
    } catch (error) {
      console.error('Failed to load admin attendance records:', error);
      Alert.alert(
        'Error',
        error instanceof Error
          ? error.message
          : 'Failed to load attendance records.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      void loadRecords();
    }, [loadRecords])
  );

  const eventOptions = useMemo(() => {
    const events = new Map<string, string>();
    records.forEach((record) => {
      events.set(record.eventId, record.eventTitle);
    });
    return [...events.entries()].map(([id, title]) => ({ id, title }));
  }, [records]);

  const filteredRecords = useMemo(() => {
    const studentQuery = studentSearch.trim().toLocaleLowerCase();
    const eventQuery = eventSearch.trim().toLocaleLowerCase();
    const normalizedDate = dateFilter.trim().toLocaleLowerCase();

    return records.filter((record) => {
      const matchesStudent =
        !studentQuery ||
        record.studentName?.toLocaleLowerCase().includes(studentQuery) ||
        record.studentEmail?.toLocaleLowerCase().includes(studentQuery) ||
        record.studentId.toLocaleLowerCase().includes(studentQuery);

      const matchesEvent =
        !eventQuery ||
        record.eventTitle.toLocaleLowerCase().includes(eventQuery) ||
        record.eventId.toLocaleLowerCase().includes(eventQuery);

      const matchesSelectedEvent =
        !selectedEventId || record.eventId === selectedEventId;

      const matchesDate =
        !normalizedDate ||
        record.scannedAt.toLocaleLowerCase().includes(normalizedDate) ||
        record.eventStartTime?.toLocaleLowerCase().includes(normalizedDate);

      return (
        matchesStudent &&
        matchesEvent &&
        matchesSelectedEvent &&
        matchesDate
      );
    });
  }, [dateFilter, eventSearch, records, selectedEventId, studentSearch]);

  const renderRecord = ({ item }: { item: AdminAttendanceRecord }) => (
    <View style={styles.recordCard}>
      <View style={styles.recordHeader}>
        <View style={styles.studentDetails}>
          <Text style={styles.studentName}>
            {item.studentName || 'Name unavailable'}
          </Text>
          <Text style={styles.email}>
            {item.studentEmail || 'Email unavailable'}
          </Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>
            {item.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <Text style={styles.eventTitle}>{item.eventTitle}</Text>
      <Text style={styles.meta}>Event code: {item.eventCode}</Text>
      {item.eventStartTime ? (
        <Text style={styles.meta}>
          Event date: {formatDate(item.eventStartTime)}
        </Text>
      ) : null}
      {item.eventEndTime ? (
        <Text style={styles.meta}>
          Event ends: {formatDate(item.eventEndTime)}
        </Text>
      ) : null}
      {item.venue ? <Text style={styles.meta}>Venue: {item.venue}</Text> : null}
      <Text style={styles.meta}>Scanned at: {formatDate(item.scannedAt)}</Text>
      <Text style={styles.meta}>Student ID: {item.studentId}</Text>
      <Text style={styles.meta}>Event ID: {item.eventId}</Text>
      <Text style={styles.recordId}>Attendance ID: {item.id}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={styles.backButton}
          onPress={() => router.replace('/admin')}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Attendance Records</Text>
          <Text style={styles.subtitle}>View all QR attendance scans</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Refresh attendance records"
          style={styles.refreshButton}
          onPress={() => void loadRecords()}
          disabled={refreshing}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color="#555" />
          ) : (
            <Ionicons name="refresh-outline" size={22} color="#444" />
          )}
        </Pressable>
      </View>

      <FlatList
        data={filteredRecords}
        keyExtractor={(item) => item.id}
        renderItem={renderRecord}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.filters}>
            <View style={styles.totalCard}>
              <Text style={styles.totalNumber}>{records.length}</Text>
              <Text style={styles.totalLabel}>Total attendance scans</Text>
            </View>
            <TextInput
              accessibilityLabel="Search student"
              style={styles.searchInput}
              value={studentSearch}
              onChangeText={setStudentSearch}
              placeholder="Search student name or email"
              placeholderTextColor="#888"
              autoCapitalize="none"
            />
            <TextInput
              accessibilityLabel="Search event"
              style={styles.searchInput}
              value={eventSearch}
              onChangeText={setEventSearch}
              placeholder="Search event"
              placeholderTextColor="#888"
            />
            <TextInput
              accessibilityLabel="Filter by date"
              style={styles.searchInput}
              value={dateFilter}
              onChangeText={setDateFilter}
              placeholder="Filter by date (YYYY-MM-DD)"
              placeholderTextColor="#888"
              autoCapitalize="none"
            />

            <Text style={styles.filterLabel}>Filter by event</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.eventFilters}
            >
              <Pressable
                accessibilityRole="button"
                style={[
                  styles.eventChip,
                  selectedEventId === null && styles.eventChipSelected,
                ]}
                onPress={() => setSelectedEventId(null)}
              >
                <Text
                  style={[
                    styles.eventChipText,
                    selectedEventId === null && styles.eventChipTextSelected,
                  ]}
                >
                  All events
                </Text>
              </Pressable>
              {eventOptions.map((event) => (
                <Pressable
                  key={event.id}
                  accessibilityRole="button"
                  style={[
                    styles.eventChip,
                    selectedEventId === event.id && styles.eventChipSelected,
                  ]}
                  onPress={() => setSelectedEventId(event.id)}
                >
                  <Text
                    style={[
                      styles.eventChipText,
                      selectedEventId === event.id &&
                        styles.eventChipTextSelected,
                    ]}
                  >
                    {event.title}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.resultCount}>
              {filteredRecords.length} record
              {filteredRecords.length === 1 ? '' : 's'}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            {loading ? (
              <ActivityIndicator size="large" color="#555" />
            ) : (
              <>
                <Ionicons name="document-text-outline" size={44} color="#999" />
                <Text style={styles.emptyText}>
                  {records.length === 0
                    ? 'No attendance records yet.'
                    : 'No records match these filters.'}
                </Text>
              </>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString(undefined, {
    dateStyle: 'long',
    timeStyle: 'short',
  });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F3EA',
  },
  header: {
    minHeight: 65,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFDF5',
    borderBottomWidth: 1,
    borderBottomColor: '#E7E2D5',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginLeft: 8,
  },
  headerCopy: { flex: 1 },
  subtitle: { color: '#748078', fontSize: 12, marginTop: 3, marginLeft: 8 },
  refreshButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    width: '100%',
    maxWidth: 820,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  filters: {
    paddingTop: 16,
    paddingBottom: 8,
  },
  totalCard: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 9,
    backgroundColor: '#FFFDF9',
    borderWidth: 1,
    borderColor: '#E3DED2',
    borderRadius: 11,
    padding: 14,
    marginBottom: 12,
  },
  totalNumber: { color: '#26352B', fontSize: 22, fontWeight: '800' },
  totalLabel: { color: '#748078', fontSize: 13 },
  searchInput: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: '#E3DED2',
    borderRadius: 10,
    backgroundColor: '#FFFDF9',
    paddingHorizontal: 13,
    marginBottom: 10,
    color: '#333',
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    marginTop: 2,
    marginBottom: 8,
  },
  eventFilters: {
    gap: 8,
    paddingBottom: 8,
  },
  eventChip: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D9D4C9',
    backgroundColor: '#FFFDF9',
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  eventChipSelected: {
    backgroundColor: '#E8E5DA',
    borderColor: '#AAA493',
  },
  eventChipText: {
    color: '#555',
    fontSize: 13,
  },
  eventChipTextSelected: {
    color: '#333',
    fontWeight: '700',
  },
  resultCount: {
    fontSize: 12,
    color: '#777',
    marginTop: 4,
    marginBottom: 4,
  },
  recordCard: {
    backgroundColor: '#FFFDF9',
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#E3DED2',
    padding: 16,
    marginBottom: 12,
  },
  recordHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  studentDetails: {
    flex: 1,
  },
  studentName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#333',
  },
  email: {
    fontSize: 13,
    color: '#777',
    marginTop: 3,
  },
  statusBadge: {
    borderRadius: 14,
    backgroundColor: '#E7F0E6',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#397348',
  },
  divider: {
    height: 1,
    backgroundColor: '#E9E4D8',
    marginVertical: 12,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#444',
    marginBottom: 4,
  },
  meta: {
    fontSize: 13,
    lineHeight: 19,
    color: '#666',
    marginTop: 3,
  },
  recordId: {
    fontSize: 11,
    color: '#888',
    marginTop: 8,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 36,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#777',
    marginTop: 10,
  },
});
