import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import {
  createAdminEvent,
  deleteAdminEvent,
  getAdminEvents,
  setAdminEventStatus,
  updateAdminEvent,
  type AdminEvent,
  type AdminEventInput,
} from '../../lib/events';
import { supabase } from '../../lib/supabase';

type PendingAction = {
  event: AdminEvent;
  kind: 'close' | 'reopen' | 'delete';
} | null;

const emptyForm = {
  title: '',
  eventCode: '',
  startTime: '',
  endTime: '',
};

export default function ManageEventsScreen() {
  const router = useRouter();
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AdminEvent | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  const loadEvents = useCallback(async () => {
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
        .select('role')
        .eq('id', user.id)
        .maybeSingle();
      if (profileError) throw profileError;
      if (profile?.role !== 'admin') {
        router.replace('/(tabs)');
        return;
      }

      setEvents(await getAdminEvents());
    } catch (error) {
      console.error('Failed to load admin events:', error);
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to load events.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      void loadEvents();
    }, [loadEvents])
  );

  const openEvents = useMemo(
    () => events.filter((event) => event.status === 'open').length,
    [events]
  );

  const openCreateForm = () => {
    setEditingEvent(null);
    setForm(emptyForm);
    setFormVisible(true);
  };

  const openEditForm = (event: AdminEvent) => {
    setEditingEvent(event);
    setForm({
      title: event.title,
      eventCode: event.event_code,
      startTime: event.start_time ? toLocalInput(event.start_time) : '',
      endTime: event.end_time ? toLocalInput(event.end_time) : '',
    });
    setFormVisible(true);
  };

  const handleSaveEvent = async () => {
    const title = form.title.trim();
    const eventCode = form.eventCode.trim();
    const startTime = parseDateInput(form.startTime);
    const endTime = parseDateInput(form.endTime);

    if (!title || !eventCode) {
      Alert.alert('Missing details', 'Enter an event title and event code.');
      return;
    }
    if (startTime === false) {
      Alert.alert('Invalid date', 'Enter a valid start date and time.');
      return;
    }
    if (endTime === false) {
      Alert.alert('Invalid date', 'Enter a valid end date and time.');
      return;
    }
    if (startTime && endTime && endTime <= startTime) {
      Alert.alert('Invalid schedule', 'End time must be after start time.');
      return;
    }

    const input: AdminEventInput = {
      title,
      eventCode,
      startTime,
      endTime,
    };

    setSaving(true);
    try {
      if (editingEvent) {
        await updateAdminEvent(editingEvent.id, input);
      } else {
        await createAdminEvent(input);
      }
      setFormVisible(false);
      await loadEvents();
      Alert.alert('Saved', editingEvent ? 'Event updated.' : 'Event created.');
    } catch (error) {
      console.error('Failed to save event:', error);
      Alert.alert(
        'Save failed',
        error instanceof Error ? error.message : 'Could not save the event.'
      );
    } finally {
      setSaving(false);
    }
  };

  const performPendingAction = async () => {
    if (!pendingAction) return;
    const action = pendingAction;
    setPendingAction(null);
    setSaving(true);

    try {
      if (action.kind === 'delete') {
        await deleteAdminEvent(action.event.id);
      } else {
        await setAdminEventStatus(
          action.event.id,
          action.kind === 'close' ? 'closed' : 'open'
        );
      }
      await loadEvents();
      Alert.alert(
        'Done',
        action.kind === 'delete'
          ? 'Event deleted.'
          : action.kind === 'close'
            ? 'Event closed.'
            : 'Event reopened.'
      );
    } catch (error) {
      console.error('Failed to update event:', error);
      Alert.alert(
        'Action failed',
        error instanceof Error ? error.message : 'Could not update the event.'
      );
    } finally {
      setSaving(false);
    }
  };

  const renderEvent = ({ item }: { item: AdminEvent }) => (
    <View style={styles.eventCard}>
      <View style={styles.eventHeading}>
        <View style={styles.eventTitleCopy}>
          <Text style={styles.eventTitle}>{item.title}</Text>
          <Text style={styles.eventCode}>Code: {item.event_code}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            item.status === 'open' ? styles.openBadge : styles.closedBadge,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              item.status === 'open' ? styles.openText : styles.closedText,
            ]}
          >
            {item.status.toUpperCase()}
          </Text>
        </View>
      </View>
      <View style={styles.details}>
        <Detail label="Starts" value={formatDate(item.start_time)} />
        <Detail label="Ends" value={formatDate(item.end_time)} />
        <Detail label="Created by" value={item.creatorName || item.created_by || 'Unknown'} />
        <Detail label="Created" value={formatDate(item.created_at)} />
      </View>

      <View style={styles.actions}>
        <ActionButton
          icon="create-outline"
          label="Edit"
          onPress={() => openEditForm(item)}
        />
        <ActionButton
          icon={item.status === 'open' ? 'lock-closed-outline' : 'lock-open-outline'}
          label={item.status === 'open' ? 'Close' : 'Reopen'}
          onPress={() =>
            setPendingAction({
              event: item,
              kind: item.status === 'open' ? 'close' : 'reopen',
            })
          }
        />
        <ActionButton
          icon="trash-outline"
          label="Delete"
          destructive
          onPress={() => setPendingAction({ event: item, kind: 'delete' })}
        />
      </View>
    </View>
  );

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
          <Text style={styles.title}>Manage Events</Text>
          <Text style={styles.subtitle}>
            Create, edit, close, reopen, and delete events
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Refresh events"
          style={styles.refreshButton}
          onPress={() => void loadEvents()}
          disabled={refreshing}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color="#398653" />
          ) : (
            <Ionicons name="refresh-outline" size={22} color="#398653" />
          )}
        </Pressable>
      </View>

      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        renderItem={renderEvent}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.summaryRow}>
            <Summary label="Total Events" value={events.length} />
            <Summary label="Open Events" value={openEvents} />
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.createButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={openCreateForm}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.createButtonText}>Create New Event</Text>
            </Pressable>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            {loading ? (
              <ActivityIndicator size="large" color="#398653" />
            ) : (
              <Text style={styles.emptyText}>No events found. Create your first event.</Text>
            )}
          </View>
        }
      />

      <Modal
        visible={formVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFormVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {editingEvent ? 'Edit Event' : 'Create New Event'}
            </Text>
            <TextInput
              style={styles.input}
              value={form.title}
              onChangeText={(title) => setForm((current) => ({ ...current, title }))}
              placeholder="Event title"
              placeholderTextColor="#89918B"
            />
            <TextInput
              style={styles.input}
              value={form.eventCode}
              onChangeText={(eventCode) =>
                setForm((current) => ({ ...current, eventCode }))
              }
              placeholder="Event code"
              placeholderTextColor="#89918B"
              autoCapitalize="characters"
            />
            <Text style={styles.inputHelp}>
              Dates use your device timezone, for example 2026-10-10 08:00.
            </Text>
            <TextInput
              style={styles.input}
              value={form.startTime}
              onChangeText={(startTime) =>
                setForm((current) => ({ ...current, startTime }))
              }
              placeholder="Start date and time (optional)"
              placeholderTextColor="#89918B"
            />
            <TextInput
              style={styles.input}
              value={form.endTime}
              onChangeText={(endTime) =>
                setForm((current) => ({ ...current, endTime }))
              }
              placeholder="End date and time (optional)"
              placeholderTextColor="#89918B"
            />
            <View style={styles.modalActions}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => setFormVisible(false)}
                disabled={saving}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.saveButton}
                onPress={() => void handleSaveEvent()}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveText}>
                    {editingEvent ? 'Save Changes' : 'Create Event'}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(pendingAction)}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingAction(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmCard}>
            <Text style={styles.modalTitle}>
              {pendingAction?.kind === 'delete'
                ? 'Delete Event?'
                : pendingAction?.kind === 'close'
                  ? 'Close Event?'
                  : 'Reopen Event?'}
            </Text>
            <Text style={styles.confirmText}>
              {pendingAction?.kind === 'delete'
                ? `Delete "${pendingAction.event.title}"? Existing attendance records linked to this event may also be deleted.`
                : `Are you sure you want to ${pendingAction?.kind} "${pendingAction?.event.title}"?`}
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => setPendingAction(null)}
                disabled={saving}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.saveButton,
                  pendingAction?.kind === 'delete' && styles.deleteButton,
                ]}
                onPress={() => void performPendingAction()}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveText}>Confirm</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function ActionButton({
  icon,
  label,
  onPress,
  destructive = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.actionButton,
        destructive && styles.destructiveAction,
        pressed && styles.buttonPressed,
      ]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={16} color={destructive ? '#A74343' : '#39794D'} />
      <Text style={[styles.actionText, destructive && styles.destructiveText]}>
        {label}
      </Text>
    </Pressable>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function parseDateInput(value: string): string | null | false {
  if (!value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? false : date.toISOString();
}

function toLocalInput(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDate(value: string | null) {
  if (!value) return 'Not set';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
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
  subtitle: { color: '#748078', fontSize: 12, marginTop: 3 },
  refreshButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  list: {
    width: '100%',
    maxWidth: 1080,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingBottom: 32,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'stretch',
    gap: 12,
    paddingVertical: 18,
  },
  summaryCard: {
    flexGrow: 1,
    flexBasis: 150,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8E2',
    borderRadius: 13,
    padding: 15,
  },
  summaryValue: { color: '#26352B', fontSize: 24, fontWeight: '800' },
  summaryLabel: { color: '#748078', fontSize: 12, marginTop: 3 },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 56,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#398653',
  },
  createButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  eventCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8E2',
    borderRadius: 14,
    padding: 17,
    marginBottom: 12,
  },
  eventHeading: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  eventTitleCopy: { flex: 1 },
  eventTitle: { color: '#2E3A32', fontSize: 17, fontWeight: '700' },
  eventCode: { color: '#718077', fontSize: 13, marginTop: 4 },
  statusBadge: { borderRadius: 13, paddingHorizontal: 10, paddingVertical: 6 },
  openBadge: { backgroundColor: '#E8F3EA' },
  closedBadge: { backgroundColor: '#F3ECE8' },
  statusText: { fontSize: 10, fontWeight: '800' },
  openText: { color: '#39794D' },
  closedText: { color: '#8C5E45' },
  details: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 15 },
  detail: { flexGrow: 1, flexBasis: 210 },
  detailLabel: { color: '#7C867F', fontSize: 11, marginBottom: 3 },
  detailValue: { color: '#4C5850', fontSize: 13 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  actionButton: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#DDE8DF',
    backgroundColor: '#F8FBF8',
  },
  destructiveAction: { borderColor: '#F0DADA', backgroundColor: '#FFF9F9' },
  actionText: { color: '#39794D', fontSize: 12, fontWeight: '700' },
  destructiveText: { color: '#A74343' },
  buttonPressed: { opacity: 0.7 },
  empty: { alignItems: 'center', padding: 38 },
  emptyText: { color: '#718077', textAlign: 'center', fontSize: 14 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(20, 30, 24, 0.42)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 22,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 22,
  },
  modalTitle: { color: '#26352B', fontSize: 20, fontWeight: '800', marginBottom: 16 },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: '#DDE5DE',
    borderRadius: 10,
    paddingHorizontal: 12,
    color: '#333',
    marginBottom: 10,
    backgroundColor: '#FCFDFC',
  },
  inputHelp: { color: '#7C867F', fontSize: 12, marginBottom: 10, lineHeight: 18 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 8 },
  cancelButton: {
    minHeight: 42,
    paddingHorizontal: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DDE5DE',
    borderRadius: 10,
  },
  cancelText: { color: '#58645B', fontWeight: '700' },
  saveButton: {
    minHeight: 42,
    minWidth: 110,
    paddingHorizontal: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#398653',
  },
  deleteButton: { backgroundColor: '#AE4F4F' },
  saveText: { color: '#fff', fontWeight: '700' },
  confirmText: { color: '#667269', fontSize: 14, lineHeight: 21 },
});
