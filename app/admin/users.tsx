import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { supabase } from '../../lib/supabase';

type UserProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
  created_at: string | null;
};

type RoleFilter = 'all' | 'student' | 'teacher' | 'admin';

export default function ManageUsersScreen() {
  const router = useRouter();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');

  const loadUsers = useCallback(async () => {
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
      setCurrentUserId(user.id);

      const { data: currentProfile, error: roleError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();
      if (roleError) throw roleError;
      if (currentProfile?.role !== 'admin') {
        router.replace('/(tabs)');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setUsers(data ?? []);
    } catch (error) {
      console.error('Failed to load registered users:', error);
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to load users.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      void loadUsers();
    }, [loadUsers])
  );

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return users.filter((user) => {
      const matchesRole =
        roleFilter === 'all' ||
        String(user.role).toLowerCase() === roleFilter;
      const matchesQuery =
        !query ||
        user.full_name?.toLocaleLowerCase().includes(query) ||
        user.email?.toLocaleLowerCase().includes(query) ||
        user.id.toLocaleLowerCase().includes(query);
      return matchesRole && matchesQuery;
    });
  }, [roleFilter, search, users]);

  const renderUser = ({ item }: { item: UserProfile }) => {
    const isSelf = item.id === currentUserId;
    return (
      <View style={styles.userCard}>
        <View style={styles.avatar}>
          <Ionicons name="person-outline" size={22} color="#398653" />
        </View>
        <View style={styles.userInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{item.full_name || 'Name unavailable'}</Text>
            {isSelf ? <Text style={styles.youBadge}>YOU</Text> : null}
          </View>
          <Text style={styles.email}>{item.email || 'Email unavailable'}</Text>
          <Text style={styles.role}>
            {String(item.role || 'unknown').toUpperCase()}
          </Text>
          <Text selectable style={styles.userId}>ID: {item.id}</Text>
          <Text style={styles.createdAt}>
            Registered: {item.created_at ? formatDate(item.created_at) : 'Unavailable'}
          </Text>
        </View>
      </View>
    );
  };

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
          <Text style={styles.title}>Manage Users</Text>
          <Text style={styles.subtitle}>View registered QR-ATT users</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Refresh users"
          style={styles.refreshButton}
          onPress={() => void loadUsers()}
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
        data={filteredUsers}
        keyExtractor={(item) => item.id}
        renderItem={renderUser}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.filters}>
            <View style={styles.totalCard}>
              <Text style={styles.totalNumber}>{users.length}</Text>
              <Text style={styles.totalLabel}>Total registered users</Text>
            </View>
            <TextInput
              accessibilityLabel="Search users"
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search name, email, or user ID"
              placeholderTextColor="#89918B"
              autoCapitalize="none"
            />
            <View style={styles.roleFilters}>
              {(['all', 'student', 'teacher', 'admin'] as const).map((role) => (
                <Pressable
                  key={role}
                  accessibilityRole="button"
                  style={[
                    styles.roleChip,
                    roleFilter === role && styles.roleChipSelected,
                  ]}
                  onPress={() => setRoleFilter(role)}
                >
                  <Text
                    style={[
                      styles.roleChipText,
                      roleFilter === role && styles.roleChipTextSelected,
                    ]}
                  >
                    {role === 'all' ? 'All' : role[0].toUpperCase() + role.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.results}>
              Showing {filteredUsers.length} of {users.length} users
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            {loading ? (
              <ActivityIndicator size="large" color="#398653" />
            ) : (
              <Text style={styles.emptyText}>
                {users.length === 0
                  ? 'No registered users found.'
                  : 'No users match your search or role filter.'}
              </Text>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}

function formatDate(value: string) {
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
  backButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: { flex: 1, marginLeft: 8 },
  title: { color: '#26352B', fontSize: 20, fontWeight: '800' },
  subtitle: { color: '#748078', fontSize: 13, marginTop: 3 },
  refreshButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    width: '100%',
    maxWidth: 980,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingBottom: 28,
  },
  filters: { paddingTop: 18, paddingBottom: 12 },
  totalCard: {
    backgroundColor: '#fff',
    borderColor: '#E2E8E2',
    borderWidth: 1,
    borderRadius: 14,
    padding: 17,
    marginBottom: 14,
  },
  totalNumber: { color: '#26352B', fontSize: 27, fontWeight: '800' },
  totalLabel: { color: '#748078', fontSize: 13, marginTop: 2 },
  searchInput: {
    minHeight: 46,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#DDE5DE',
    borderRadius: 10,
    paddingHorizontal: 13,
    color: '#333',
  },
  roleFilters: { flexDirection: 'row', gap: 8, marginTop: 12 },
  roleChip: {
    borderWidth: 1,
    borderColor: '#DDE5DE',
    borderRadius: 18,
    paddingHorizontal: 13,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  roleChipSelected: { backgroundColor: '#398653', borderColor: '#398653' },
  roleChipText: { color: '#59645C', fontSize: 13, fontWeight: '600' },
  roleChipTextSelected: { color: '#fff' },
  results: { color: '#7A847D', fontSize: 12, marginTop: 12 },
  userCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#E2E8E2',
    padding: 16,
    marginBottom: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: '#EAF3EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },
  userInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  name: { color: '#2E3A32', fontSize: 16, fontWeight: '700' },
  youBadge: {
    overflow: 'hidden',
    color: '#36784A',
    backgroundColor: '#EAF3EC',
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  email: { color: '#68746C', fontSize: 13, marginTop: 4 },
  role: { color: '#398653', fontSize: 11, fontWeight: '800', marginTop: 7 },
  userId: { color: '#737D75', fontSize: 11, marginTop: 6 },
  createdAt: { color: '#737D75', fontSize: 12, marginTop: 5 },
  empty: { alignItems: 'center', padding: 36 },
  emptyText: { color: '#737D75', fontSize: 14, textAlign: 'center' },
});
