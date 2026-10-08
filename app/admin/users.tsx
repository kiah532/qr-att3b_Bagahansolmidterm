import { useEffect, useState } from 'react';
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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { supabase } from '../../lib/supabase';

type UserProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
};

export default function ManageUsersScreen() {
  const router = useRouter();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUsers = async () => {
    try {
      setLoading(true);

      const {
        data,
        error,
      } = await supabase
        .from('profiles')
        .select('id, email, full_name, role')
        .order('full_name', {
          ascending: true,
        });

      if (error) {
        throw error;
      }

      setUsers(data || []);
    } catch (error: any) {
      Alert.alert(
        'Error',
        error?.message || 'Failed to load users.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const renderUser = ({
    item,
  }: {
    item: UserProfile;
  }) => {
    const role = String(item.role || 'student').toUpperCase();

    return (
      <View style={styles.userCard}>
        <View style={styles.avatar}>
          <Ionicons
            name="person-outline"
            size={22}
            color="#555"
          />
        </View>

        <View style={styles.userInfo}>
          <Text style={styles.name}>
            {item.full_name || 'No name'}
          </Text>

          <Text style={styles.email}>
            {item.email || 'No email'}
          </Text>

          <Text style={styles.role}>
            {role}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons
            name="arrow-back"
            size={25}
            color="#333"
          />
        </Pressable>

        <Text style={styles.title}>
          Manage Users
        </Text>

        <Pressable
          style={styles.refreshButton}
          onPress={loadUsers}
        >
          <Ionicons
            name="refresh-outline"
            size={22}
            color="#333"
          />
        </Pressable>
      </View>

      {/* CONTENT */}
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator
            size="large"
            color="#555"
          />

          <Text style={styles.loadingText}>
            Loading users...
          </Text>
        </View>
      ) : users.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons
            name="people-outline"
            size={55}
            color="#999"
          />

          <Text style={styles.emptyTitle}>
            No users found
          </Text>

          <Text style={styles.emptyText}>
            There are currently no users in the system.
          </Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          renderItem={renderUser}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F3EA',
  },

  header: {
    height: 65,
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

  refreshButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
  },

  title: {
    fontSize: 21,
    fontWeight: '700',
    color: '#333',
    marginLeft: 8,
  },

  list: {
    padding: 16,
  },

  userCard: {
    backgroundColor: '#FFFDF9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E3DED2',
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#EDEAE0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  userInfo: {
    flex: 1,
  },

  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },

  email: {
    fontSize: 13,
    color: '#777',
    marginTop: 3,
  },

  role: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4F8B57',
    marginTop: 5,
  },

  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    marginTop: 10,
    color: '#666',
  },

  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#444',
    marginTop: 15,
  },

  emptyText: {
    textAlign: 'center',
    color: '#777',
    marginTop: 8,
  },
});