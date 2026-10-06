import { useState, useEffect } from 'react';
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
let globalLoading = false;

let listeners: Set<() => void> = new Set();

function notify() {
  listeners.forEach((listener) => listener());
}

export function setAuth(
  session: Session | null,
  role: UserRole | null = null
) {
  globalSession = session;
  globalUser = session?.user ?? null;
  globalRole = role;
  globalLoading = false;

  notify();
}

async function loadUserRole(userId: string): Promise<UserRole | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (error || !data) {
    console.log('Unable to load user role:', error?.message);
    return null;
  }

  if (
    data.role === 'student' ||
    data.role === 'teacher' ||
    data.role === 'admin'
  ) {
    return data.role;
  }

  return null;
}

export function useAuth(): AuthState {
  const [, forceRender] = useState(0);

  useEffect(() => {
    const listener = () => forceRender((n) => n + 1);

    listeners.add(listener);

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
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (!error && data.session && profile) {
    await supabase
      .from('profiles')
      .update({
        full_name: profile.full_name,
        role: profile.role,
      })
      .eq('id', data.session.user.id);
  }

  if (!error && data.session) {
    const role = await loadUserRole(data.session.user.id);
    setAuth(data.session, role);
  }

  return { data, error };
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (!error && data.session) {
    const role = await loadUserRole(data.session.user.id);

    setAuth(data.session, role);
  }

  return { data, error };
}

export async function signOut() {
  setAuth(null, null);

  const { error } = await supabase.auth.signOut();

  return { error };
}