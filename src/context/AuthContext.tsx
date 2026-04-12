import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

interface InstallerUser {
  id: string;
  full_name: string;
  company_name: string;
  email: string;
  phone_number: string | null;
  logo_url: string | null;
  needs_password_reset: boolean;
  quote_count: number;
  application_count: number;
  allowed_calculators?: string[];
  totp_enabled: boolean;
  totp_setup_prompted: boolean;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  installerProfile: InstallerUser | null;
  loading: boolean;
  totpVerified: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  updateProfile: (fields: { full_name?: string; company_name?: string; phone_number?: string }) => Promise<void>;
  uploadLogo: (file: File) => Promise<void>;
  refreshProfile: () => Promise<void>;
  completeTotpVerification: () => void;
  markTotpSetupPrompted: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [installerProfile, setInstallerProfile] = useState<InstallerUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [totpVerified, setTotpVerified] = useState(false);

  useEffect(() => {
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        (async () => {
          await loadInstallerProfile(session.user.id);
        })();
      } else {
        setInstallerProfile(null);
        setTotpVerified(false);
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
      setTotpVerified(false);
      await loadInstallerProfile(data.user.id);
    }
  }

  async function signOut() {
    setUser(null);
    setInstallerProfile(null);
    setTotpVerified(false);
    await supabase.auth.signOut();
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

  async function updateProfile(fields: { full_name?: string; company_name?: string; phone_number?: string }) {
    if (!user) throw new Error('Not authenticated');
    const { error } = await supabase
      .from('installer_users')
      .update(fields)
      .eq('id', user.id);
    if (error) throw error;
    await loadInstallerProfile(user.id);
  }

  async function refreshProfile() {
    if (user) {
      await loadInstallerProfile(user.id);
    }
  }

  function completeTotpVerification() {
    setTotpVerified(true);
  }

  async function uploadLogo(file: File) {
    if (!user) throw new Error('Not authenticated');
    const ext = file.name.split('.').pop();
    const path = `logos/${user.id}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(path, file, { upsert: true, contentType: file.type });
    if (uploadError) throw uploadError;
    const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path);
    const { error } = await supabase
      .from('installer_users')
      .update({ logo_url: publicUrl })
      .eq('id', user.id);
    if (error) throw error;
    await loadInstallerProfile(user.id);
  }

  async function markTotpSetupPrompted() {
    if (!user) return;
    try {
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/totp/mark-prompted`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id, userType: 'installer' }),
      });
      await loadInstallerProfile(user.id);
    } catch (error) {
      console.error('Error marking totp setup prompted:', error);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        installerProfile,
        loading,
        totpVerified,
        signIn,
        signOut,
        updatePassword,
        updateProfile,
        uploadLogo,
        refreshProfile,
        completeTotpVerification,
        markTotpSetupPrompted,
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
