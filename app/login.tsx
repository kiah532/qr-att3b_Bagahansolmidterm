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
import { signIn } from '@/lib/auth';
import { getProfile } from '@/lib/profiles';
import { supabase } from '@/lib/supabase';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    Keyboard.dismiss();
    setError(null);

    const cleanEmail = email.trim();

    // Check email
    if (!cleanEmail) {
      setError('Please enter your email.');
      return;
    }

    // Check password
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);

    try {
      // SIGN IN
      const { error: authError } = await signIn(
        cleanEmail,
        password
      );

      if (authError) {
        setError(authError.message || 'Invalid email or password.');
        return;
      }

      // Get currently logged-in user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError('Login successful, but user information could not be loaded.');
        return;
      }

      // Get user's profile
      const profile = await getProfile(user.id);

      if (!profile) {
        setError(
          'Your account was found, but your profile could not be loaded.'
        );
        return;
      }

      // Get role
      const role = String(profile.role || '').toLowerCase();

      console.log('LOGIN USER:', user.email);
      console.log('LOGIN ROLE:', role);

      // =========================
      // ADMIN
      // =========================
      if (role === 'admin') {
        router.replace('/admin');
        return;
      }

      // =========================
      // TEACHER
      // =========================
      if (role === 'teacher') {
        router.replace('/(tabs)');
        return;
      }

      // =========================
      // STUDENT
      // =========================
      router.replace('/(tabs)');
    } catch (err: any) {
      console.error('LOGIN ERROR:', err);

      setError(
        err?.message ||
          'Something went wrong while signing in.'
      );
    } finally {
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
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
        >
          {/* HEADER */}
          <View style={styles.headerContainer}>
            <Header title="QR Attendance" />
          </View>

          {/* TITLE */}
          <Text style={styles.title}>
            Welcome Back
          </Text>

          <Text style={styles.subtitle}>
            Sign in to record your attendance
          </Text>

          {/* FORM */}
          <View style={styles.form}>
            {/* EMAIL */}
            <Text style={styles.label}>
              Email
            </Text>

            <TextInput
              style={styles.input}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setError(null);
              }}
              placeholder="your.email@school.edu"
              placeholderTextColor="#999"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              editable={!loading}
              returnKeyType="next"
            />

            {/* PASSWORD */}
            <Text style={styles.label}>
              Password
            </Text>

            <TextInput
              style={styles.input}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setError(null);
              }}
              placeholder="Enter your password"
              placeholderTextColor="#999"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />

            {/* ERROR */}
            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.error}>
                  {error}
                </Text>
              </View>
            ) : null}

            {/* LOGIN BUTTON */}
            {loading ? (
              <View style={styles.loader}>
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

          {/* REGISTER */}
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
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
  },

  error: {
    fontSize: 14,
    color: COLORS.danger,
  },

  loader: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
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