import { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppButton from '@/components/AppButton';
import Header from '@/components/Header';
import { COLORS } from '@/constants/colors';
import { supabase } from '@/lib/supabase';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (loading) return;

    Keyboard.dismiss();
    setError('');
    setLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();

      if (!cleanEmail) {
        setError('Please enter your email.');
        setLoading(false);
        return;
      }

      if (!password) {
        setError('Please enter your password.');
        setLoading(false);
        return;
      }

      // ==============================
      // LOGIN
      // ==============================

      const {
        data: authData,
        error: authError,
      } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      if (!authData.user) {
        setError('Unable to find your account.');
        setLoading(false);
        return;
      }

      // ==============================
      // GET USER ROLE
      // ==============================

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .single();

      if (profileError) {
        console.log('PROFILE ERROR:', profileError);

        setError(
          `Unable to load your account: ${profileError.message}`
        );

        setLoading(false);
        return;
      }

      if (!profile) {
        setError(
          'Your account does not have a profile.'
        );

        setLoading(false);
        return;
      }

      const role = String(profile.role)
        .trim()
        .toLowerCase();

      console.log('Logged in:', authData.user.email);
      console.log('Role:', role);

      // ==============================
      // ADMIN
      // ==============================

      if (role === 'admin') {
        router.replace('/admin');
        return;
      }

      // ==============================
      // TEACHER
      // ==============================

      if (role === 'teacher') {
        router.replace('/(tabs)');
        return;
      }

      // ==============================
      // STUDENT
      // ==============================

      if (role === 'student') {
        router.replace('/(tabs)');
        return;
      }

      // ==============================
      // INVALID ROLE
      // ==============================

      setError(
        `Invalid account role: ${role || 'none'}`
      );

      setLoading(false);
    } catch (err: any) {
      console.log('LOGIN ERROR:', err);

      setError(
        err?.message ||
          'Something went wrong while signing in.'
      );

      setLoading(false);
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerContainer}>
            <Header title="QR Attendance" />
          </View>

          <Text style={styles.title}>
            Welcome Back
          </Text>

          <Text style={styles.subtitle}>
            Sign in to record your attendance
          </Text>

          <View style={styles.form}>
            <Text style={styles.label}>
              Email
            </Text>

            <TextInput
              style={styles.input}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setError('');
              }}
              placeholder="your.email@school.edu"
              placeholderTextColor="#999"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              editable={!loading}
            />

            <Text style={styles.label}>
              Password
            </Text>

            <TextInput
              style={styles.input}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setError('');
              }}
              placeholder="Enter your password"
              placeholderTextColor="#999"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
              onSubmitEditing={handleLogin}
            />

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.error}>
                  {error}
                </Text>
              </View>
            ) : null}

            {loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator
                  size="large"
                  color={COLORS.primary}
                />

                <Text style={styles.loadingText}>
                  Signing in...
                </Text>
              </View>
            ) : (
              <AppButton
                theme="primary"
                title="Sign In"
                icon="log-in-outline"
                onPress={handleLogin}
              />
            )}
          </View>

          <Link
            href="/register"
            style={styles.link}
          >
            Don't have an account? Sign Up
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  keyboardView: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },

  headerContainer: {
    alignItems: 'flex-start',
    marginTop: 20,
    marginBottom: 16,
  },

  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },

  subtitle: {
    fontSize: 15,
    lineHeight: 21,
    color: COLORS.textSecondary,
    marginBottom: 32,
  },

  form: {
    marginBottom: 24,
  },

  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 6,
    marginTop: 10,
  },

  input: {
    width: '100%',
    height: 50,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#000000',
  },

  errorBox: {
    marginTop: 12,
    marginBottom: 8,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
  },

  error: {
    fontSize: 14,
    lineHeight: 20,
    color: '#DC2626',
  },

  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
  },

  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.textSecondary,
  },

  link: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
});