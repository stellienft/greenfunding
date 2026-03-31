import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

interface InstallerUser {
  id: string;
  full_name: string;
  company_name: string;
  email: string;
  needs_password_reset: boolean;
  quote_count: number;
  application_count: number;
  allowed_calculators?: string[];
}

interface AuthContextType {
  user: User | null;
  installerProfile: InstallerUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [installerProfile, setInstallerProfile] = useState<InstallerUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadInstallerProfile(session.user.id);
      } else {
        setInstallerProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function checkUser() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      if (session?.user) {
        await loadInstallerProfile(session.user.id);
      }
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadInstallerProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('installer_users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      setInstallerProfile(data);
    } catch (error) {
      console.error('Error loading installer profile:', error);
    }
  }

  async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    if (data.user) {
      await loadInstallerProfile(data.user.id);
    }
  }

  async function signOut() {
    try {
      setUser(null);
      setInstallerProfile(null);
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) {
        console.error('Sign out error:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error during sign out:', error);
      throw error;
    }
  }

  async function updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;

    if (user) {
      await supabase
        .from('installer_users')
        .update({ needs_password_reset: false })
        .eq('id', user.id);

      await loadInstallerProfile(user.id);
    }
  }

  async function refreshProfile() {
    if (user) {
      await loadInstallerProfile(user.id);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        installerProfile,
        loading,
        signIn,
        signOut,
        updatePassword,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
