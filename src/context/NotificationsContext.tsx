import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  quote_id: string | null;
  read_at: string | null;
  created_at: string;
}

export interface NotificationSettings {
  email_notifications: boolean;
  platform_notifications: boolean;
  notify_quote_accepted: boolean;
  notify_application_submitted: boolean;
  notify_document_uploaded: boolean;
  notify_large_proposal: boolean;
}

interface NotificationsContextType {
  notifications: AppNotification[];
  unreadCount: number;
  settings: NotificationSettings | null;
  loading: boolean;
  settingsLoading: boolean;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  saveSettings: (s: NotificationSettings) => Promise<void>;
  refresh: () => Promise<void>;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  email_notifications: true,
  platform_notifications: true,
  notify_quote_accepted: true,
  notify_application_submitted: true,
  notify_document_uploaded: true,
  notify_large_proposal: true,
};

const NotificationsContext = createContext<NotificationsContextType>({
  notifications: [],
  unreadCount: 0,
  settings: null,
  loading: false,
  settingsLoading: false,
  markRead: async () => {},
  markAllRead: async () => {},
  saveSettings: async () => {},
  refresh: async () => {},
});

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user, installerProfile } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const userId = user?.id ?? null;

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('notifications')
      .select('id, type, title, body, quote_id, read_at, created_at')
      .eq('recipient_type', 'installer')
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setNotifications(data as AppNotification[]);
  }, [userId]);

  const fetchSettings = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('user_type', 'installer')
      .eq('user_id', userId)
      .maybeSingle();
    setSettings(data ? {
      email_notifications: data.email_notifications,
      platform_notifications: data.platform_notifications,
      notify_quote_accepted: data.notify_quote_accepted,
      notify_application_submitted: data.notify_application_submitted,
      notify_document_uploaded: data.notify_document_uploaded,
      notify_large_proposal: data.notify_large_proposal,
    } : DEFAULT_SETTINGS);
  }, [userId]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchNotifications(), fetchSettings()]);
    setLoading(false);
  }, [fetchNotifications, fetchSettings]);

  useEffect(() => {
    if (!userId || !installerProfile) return;
    refresh();
    intervalRef.current = setInterval(fetchNotifications, 30_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [userId, installerProfile]);

  async function markRead(id: string) {
    const now = new Date().toISOString();
    await supabase
      .from('notifications')
      .update({ read_at: now })
      .eq('id', id)
      .eq('recipient_id', userId!);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: now } : n));
  }

  async function markAllRead() {
    const now = new Date().toISOString();
    await supabase
      .from('notifications')
      .update({ read_at: now })
      .eq('recipient_type', 'installer')
      .eq('recipient_id', userId!)
      .is('read_at', null);
    setNotifications(prev => prev.map(n => ({ ...n, read_at: n.read_at ?? now })));
  }

  async function saveSettings(s: NotificationSettings) {
    if (!userId) return;
    setSettingsLoading(true);
    try {
      await supabase
        .from('notification_settings')
        .upsert({
          user_type: 'installer',
          user_id: userId,
          ...s,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_type,user_id' });
      setSettings(s);
    } finally {
      setSettingsLoading(false);
    }
  }

  const unreadCount = notifications.filter(n => !n.read_at).length;

  return (
    <NotificationsContext.Provider value={{
      notifications,
      unreadCount,
      settings,
      loading,
      settingsLoading,
      markRead,
      markAllRead,
      saveSettings,
      refresh,
    }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationsContext);
}
