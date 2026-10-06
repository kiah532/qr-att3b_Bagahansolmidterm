import { StyleSheet, Text, View, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { COLORS } from '@/constants/colors';
import { signOut, useAuth } from '@/lib/auth';

export default function AdminScreen() {
  const router = useRouter();
  const { user, role } = useAuth();

  const handleLogout = async () => {
    await signOut();
    router.replace('/login');
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.smallTitle}>QR ATTENDANCE</Text>
            <Text style={styles.title}>Admin Dashboard</Text>
          </View>

          <View style={styles.adminIcon}>
            <Ionicons
              name="shield-checkmark"
              size={26}
              color={COLORS.primary}
            />
          </View>
        </View>

        {/* Welcome Card */}
        <View style={styles.welcomeCard}>
          <View style={styles.welcomeIcon}>
            <Ionicons
              name="person-circle"
              size={50}
              color={COLORS.primary}
            />
          </View>

          <View style={styles.welcomeText}>
            <Text style={styles.welcomeLabel}>Welcome, Admin!</Text>
            <Text style={styles.email}>{user?.email ?? 'Admin'}</Text>
          </View>
        </View>

        {/* Role */}
        <View style={styles.roleCard}>
          <Ionicons
            name="shield-checkmark-outline"
            size={22}
            color={COLORS.primary}
          />

          <View style={styles.roleInfo}>
            <Text style={styles.roleLabel}>Account Role</Text>
            <Text style={styles.roleValue}>
              {role?.toUpperCase() ?? 'ADMIN'}
            </Text>
          </View>
        </View>

        {/* Management */}
        <Text style={styles.sectionTitle}>Management</Text>

        <View style={styles.grid}>
          <Pressable style={styles.menuCard}>
            <View style={styles.menuIcon}>
              <Ionicons
                name="people-outline"
                size={28}
                color={COLORS.primary}
              />
            </View>
            <Text style={styles.menuTitle}>Users</Text>
            <Text style={styles.menuDescription}>
              Manage student and teacher accounts
            </Text>
          </Pressable>

          <Pressable style={styles.menuCard}>
            <View style={styles.menuIcon}>
              <Ionicons
                name="calendar-outline"
                size={28}
                color={COLORS.primary}
              />
            </View>
            <Text style={styles.menuTitle}>Events</Text>
            <Text style={styles.menuDescription}>
              Manage attendance events
            </Text>
          </Pressable>

          <Pressable style={styles.menuCard}>
            <View style={styles.menuIcon}>
              <Ionicons
                name="checkmark-done-outline"
                size={28}
                color={COLORS.primary}
              />
            </View>
            <Text style={styles.menuTitle}>Attendance</Text>
            <Text style={styles.menuDescription}>
              View attendance records
            </Text>
          </Pressable>

          <Pressable style={styles.menuCard}>
            <View style={styles.menuIcon}>
              <Ionicons
                name="bar-chart-outline"
                size={28}
                color={COLORS.primary}
              />
            </View>
            <Text style={styles.menuTitle}>Reports</Text>
            <Text style={styles.menuDescription}>
              View attendance summaries
            </Text>
          </Pressable>
        </View>

        {/* Logout */}
        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color={COLORS.danger} />
          <Text style={styles.logoutText}>Log Out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  content: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },

  smallTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: COLORS.primary,
    marginBottom: 4,
  },

  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },

  adminIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },

  welcomeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    marginBottom: 14,
  },

  welcomeIcon: {
    marginRight: 14,
  },

  welcomeText: {
    flex: 1,
  },

  welcomeLabel: {
    fontSize: 19,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },

  email: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },

  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 28,
  },

  roleInfo: {
    marginLeft: 12,
  },

  roleLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 3,
  },

  roleValue: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.primary,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 14,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  menuCard: {
    width: '48%',
    minHeight: 150,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
  },

  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },

  menuTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 5,
  },

  menuDescription: {
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.textSecondary,
  },

  logoutButton: {
    marginTop: 28,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.danger,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },

  logoutText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.danger,
  },
});