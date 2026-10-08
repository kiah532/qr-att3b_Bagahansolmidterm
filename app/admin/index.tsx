import { useCallback, useState } from 'react';
import {
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

import { COLORS } from '../../constants/colors';
import { signOut } from '../../lib/auth';
import { getProfile, Profile } from '../../lib/profiles';
import { supabase } from '../../lib/supabase';

type ManagementRoute =
  | '/admin/users'
  | '/admin/events'
  | '/admin/attendance'
  | '/admin/reports';

const managementItems: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: ManagementRoute;
}[] = [
  {
    title: 'Manage Users',
    icon: 'people-outline',
    route: '/admin/users',
  },
  {
    title: 'Manage Events',
    icon: 'calendar-outline',
    route: '/admin/events',
  },
  {
    title: 'Attendance Records',
    icon: 'document-text-outline',
    route: '/admin/attendance',
  },
  {
    title: 'Reports',
    icon: 'bar-chart-outline',
    route: '/admin/reports',
  },
];

export default function AdminDashboard() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAdminProfile = useCallback(async () => {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/login');
        return;
      }

      const currentProfile = await getProfile(user.id);

      if (!currentProfile) {
        Alert.alert('Error', 'Admin profile not found.');
        router.replace('/login');
        return;
      }

      const role = String(currentProfile.role || '').toLowerCase();

      if (role !== 'admin') {
        Alert.alert(
          'Access Denied',
          'This page is only available to administrators.'
        );
        router.replace('/(tabs)');
        return;
      }

      setProfile(currentProfile);
    } catch (error: any) {
      Alert.alert(
        'Error',
        error?.message || 'Failed to load admin profile.'
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      loadAdminProfile();
    }, [loadAdminProfile])
  );

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/login');
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to sign out.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading Administrator...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileCard}>
          <Text style={styles.adminTitle}>Administrator</Text>

          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{profile?.email || 'No email'}</Text>

          <Text style={styles.label}>Role</Text>
          <Text style={styles.adminRole}>ADMIN</Text>
        </View>

        <View style={styles.managementCard}>
          <Text style={styles.sectionTitle}>System Management</Text>

          {managementItems.map((item) => (
            <Pressable
              key={item.route}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.menuItem,
                pressed && styles.menuItemPressed,
              ]}
              onPress={() => router.push(item.route)}
            >
              <View style={styles.menuLeft}>
                <Ionicons
                  name={item.icon}
                  size={22}
                  color={styles.menuIcon.color}
                />
                <Text style={styles.menuText}>{item.title}</Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={20}
                color={styles.chevron.color}
              />
            </Pressable>
          ))}
        </View>

        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.signOutButton,
            pressed && styles.signOutPressed,
          ]}
          onPress={handleSignOut}
        >
          <Ionicons
            name="log-out-outline"
            size={20}
            color={styles.signOutText.color}
          />
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F3EA',
  },

  content: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F3EA',
  },

  loadingText: {
    fontSize: 16,
    color: '#555',
  },

  profileCard: {
    backgroundColor: '#FFFDF7',
    borderRadius: 16,
    padding: 22,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E7E2D5',
  },

  adminTitle: {
    fontSize: 23,
    fontWeight: '700',
    color: '#343434',
    marginBottom: 20,
  },

  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#777',
    marginBottom: 5,
    marginTop: 8,
  },

  value: {
    fontSize: 15,
    color: '#444',
    lineHeight: 22,
  },

  adminRole: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.success,
  },

  managementCard: {
    backgroundColor: '#FFFDF7',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E7E2D5',
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3F3F3F',
    marginBottom: 14,
  },

  menuItem: {
    minHeight: 60,
    borderWidth: 1,
    borderColor: '#E5E0D5',
    borderRadius: 11,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFEFA',
  },

  menuItemPressed: {
    backgroundColor: '#F1EEE4',
    opacity: 0.8,
  },

  menuLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  menuIcon: {
    color: '#555',
  },

  menuText: {
    flexShrink: 1,
    fontSize: 15,
    color: '#444',
    fontWeight: '600',
  },

  chevron: {
    color: '#777',
  },

  signOutButton: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    marginTop: 12,
  },

  signOutPressed: {
    opacity: 0.6,
  },

  signOutText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#555',
  },
});
