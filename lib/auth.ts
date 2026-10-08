import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { Session, User } from '@supabase/supabase-js';

export type UserRole = 'student' | 'teacher' | 'admin';

type AuthState = {
  session: Session | null;
  user: User | null;
  role: UserRole | null;
  loading: boolean;
};

let globalSession: Session | null = null;
let globalUser: User | null = null;
let globalRole: UserRole | null = null;

// IMPORTANT:
// Start with loading = true so the app waits for Supabase
// to restore the saved login session.
let globalLoading = true;

const listeners: Set<() => void> = new Set();

let initialized = false;
let initializing: Promise<void> | null = null;

function notify() {
  listeners.forEach((listener) => listener());
}

function setAuthState(
  session: Session | null,
  role: UserRole | null
) {
  globalSession = session;
  globalUser = session?.user ?? null;
  globalRole = role;
  globalLoading = false;

  notify();
}

async function loadUserRole(
  userId: string
): Promise<UserRole | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.log(
        'Unable to load user role:',
        error.message
      );
      return null;
    }

    if (!data) {
      console.log('No profile found for user:', userId);
      return null;
    }

    if (
      data.role === 'student' ||
      data.role === 'teacher' ||
      data.role === 'admin'
    ) {
      return data.role;
    }

    console.log('Invalid user role:', data.role);

    return null;
  } catch (error) {
    console.log('Role loading error:', error);
    return null;
  }
}

/**
 * Restore the Supabase session when the app starts.
 *
 * This is the important part that was missing before.
 */
async function initializeAuth() {
  if (initialized) {
    return;
  }

  if (initializing) {
    return initializing;
  }

  initializing = (async () => {
    try {
      console.log('Checking saved Supabase session...');

      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.log(
          'Failed to restore session:',
          error.message
        );

        setAuthState(null, null);
        return;
      }

      if (!session) {
        console.log('No saved session found.');

        setAuthState(null, null);
        return;
      }

      console.log(
        'Saved session found:',
        session.user.email
      );

      const role = await loadUserRole(session.user.id);

      console.log('Restored user role:', role);

      setAuthState(session, role);
    } catch (error) {
      console.log(
        'Auth initialization error:',
        error
      );

      setAuthState(null, null);
    } finally {
      initialized = true;
      initializing = null;
    }
  })();

  return initializing;
}

/**
 * Listen for Supabase auth changes.
 */
function setupAuthListener() {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      console.log(
        'Supabase auth event:',
        event
      );

      if (!session) {
        setAuthState(null, null);
        return;
      }

      // Don't lose the existing role while Supabase
      // is refreshing the session.
      if (
        globalUser?.id === session.user.id &&
        globalRole
      ) {
        globalSession = session;
        globalUser = session.user;
        globalLoading = false;
        notify();
        return;
      }

      const role = await loadUserRole(
        session.user.id
      );

      setAuthState(session, role);
    }
  );

  return subscription;
}

// Initialize auth once when this module is loaded.
void initializeAuth();

const authSubscription = setupAuthListener();

export function useAuth(): AuthState {
  const [, forceRender] = useState(0);

  useEffect(() => {
    const listener = () => {
      forceRender((n) => n + 1);
    };

    listeners.add(listener);

    // Make sure initialization has started.
    void initializeAuth();

    return () => {
      listeners.delete(listener);
    };
  }, []);

  return {
    session: globalSession,
    user: globalUser,
    role: globalRole,
    loading: globalLoading,
  };
}

export type SignUpProfile = {
  full_name: string;
  role: 'student' | 'teacher';
};

export async function signUp(
  email: string,
  password: string,
  profile?: SignUpProfile
) {
  const {
    data,
    error,
  } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return { data, error };
  }

  if (data.user && profile) {
    const { error: profileError } =
      await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name,
          role: profile.role,
        })
        .eq('id', data.user.id);

    if (profileError) {
      console.log(
        'Profile update error:',
        profileError.message
      );
    }
  }

  if (data.session) {
    const role = await loadUserRole(
      data.session.user.id
    );

    setAuthState(data.session, role);
  }

  return { data, error };
}

export async function signIn(
  email: string,
  password: string
) {
  const {
    data,
    error,
  } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    return { data, error };
  }

  if (!data.session) {
    return {
      data,
      error: new Error(
        'Login succeeded but no session was created.'
      ),
    };
  }

  const role = await loadUserRole(
    data.session.user.id
  );

  console.log(
    'Signed in:',
    data.session.user.email
  );

  console.log(
    'User role:',
    role
  );

  setAuthState(
    data.session,
    role
  );

  return { data, error: null };
}

export async function signOut() {
  const { error } =
    await supabase.auth.signOut();

  if (!error) {
    setAuthState(null, null);
  }

  return { error };
}