import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCircle2, ExternalLink, RefreshCw, Settings, Loader } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { supabase } from '../../lib/supabase';

interface AdminNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  quote_id: string | null;
  read_at: string | null;
  created_at: string;
}

interface AdminNotifSettings {
  email_notifications: boolean;
  platform_notifications: boolean;
  notify_quote_accepted: boolean;
  notify_application_submitted: boolean;
  notify_document_uploaded: boolean;
  notify_large_proposal: boolean;
}

const DEFAULT_SETTINGS: AdminNotifSettings = {
  email_notifications: true,
  platform_notifications: true,
  notify_quote_accepted: true,
  notify_application_submitted: true,
  notify_document_uploaded: true,
  notify_large_proposal: true,
};

const TYPE_LABELS: Record<string, string> = {
  quote_accepted: 'Proposal Accepted',
  application_submitted: 'Application Submitted',
  document_uploaded: 'Documents Uploaded',
  large_proposal_reviewed: 'Large Proposal Reviewed',
};

const TYPE_COLORS: Record<string, string> = {
  quote_accepted: 'bg-green-100 text-green-700',
  application_submitted: 'bg-blue-100 text-blue-700',
  document_uploaded: 'bg-amber-100 text-amber-700',
  large_proposal_reviewed: 'bg-teal-100 text-teal-700',
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${checked ? 'bg-[#28AA48]' : 'bg-gray-200'}`}
    >
      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );
}

export function AdminNotificationsPanel({ onUnreadChange }: { onUnreadChange?: (count: number) => void }) {
  const { admin } = useAdmin();
  const navigate = useNavigate();
  const [view, setView] = useState<'inbox' | 'settings'>('inbox');
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [settings, setSettings] = useState<AdminNotifSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [localSettings, setLocalSettings] = useState<AdminNotifSettings>(DEFAULT_SETTINGS);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const adminId = admin?.id ?? null;

  const fetchNotifications = useCallback(async () => {
    if (!adminId) return;
    const { data } = await supabase
      .from('notifications')
      .select('id, type, title, body, quote_id, read_at, created_at')
      .eq('recipient_type', 'admin')
      .eq('recipient_id', adminId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) {
      const notifs = data as AdminNotification[];
      setNotifications(notifs);
      const unread = notifs.filter(n => !n.read_at).length;
      onUnreadChange?.(unread);
    }
  }, [adminId, onUnreadChange]);

  const fetchSettings = useCallback(async () => {
    if (!adminId) return;
    const { data } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('user_type', 'admin')
      .eq('user_id', adminId)
      .maybeSingle();
    const s = data ? {
      email_notifications: data.email_notifications,
      platform_notifications: data.platform_notifications,
      notify_quote_accepted: data.notify_quote_accepted,
      notify_application_submitted: data.notify_application_submitted,
      notify_document_uploaded: data.notify_document_uploaded,
      notify_large_proposal: data.notify_large_proposal,
    } : DEFAULT_SETTINGS;
    setSettings(s);
    setLocalSettings(s);
  }, [adminId]);

  useEffect(() => {
    if (!adminId) return;
    setLoading(true);
    Promise.all([fetchNotifications(), fetchSettings()]).finally(() => setLoading(false));
    intervalRef.current = setInterval(fetchNotifications, 30_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [adminId]);

  async function markRead(id: string) {
    if (!adminId) return;
    const now = new Date().toISOString();
    await supabase.from('notifications').update({ read_at: now }).eq('id', id).eq('recipient_id', adminId);
    setNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, read_at: now } : n);
      onUnreadChange?.(updated.filter(n => !n.read_at).length);
      return updated;
    });
  }

  async function markAllRead() {
    if (!adminId) return;
    const now = new Date().toISOString();
    await supabase.from('notifications').update({ read_at: now })
      .eq('recipient_type', 'admin').eq('recipient_id', adminId).is('read_at', null);
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read_at: n.read_at ?? now }));
      onUnreadChange?.(0);
      return updated;
    });
  }

  async function saveSettings() {
    if (!adminId) return;
    setSettingsSaving(true);
    try {
      await supabase.from('notification_settings').upsert({
        user_type: 'admin',
        user_id: adminId,
        ...localSettings,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_type,user_id' });
      setSettings(localSettings);
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
    } finally {
      setSettingsSaving(false);
    }
  }

  const unreadCount = notifications.filter(n => !n.read_at).length;

  if (loading && notifications.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-[#28AA48] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Sub-tab bar */}
      <div className="flex items-center gap-1 border-b border-gray-200 mb-6">
        <button
          onClick={() => setView('inbox')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${view === 'inbox' ? 'text-[#28AA48] border-[#28AA48]' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
        >
          <Bell className="w-4 h-4" />
          Inbox
          {unreadCount > 0 && (
            <span className="ml-1 w-5 h-5 bg-[#28AA48] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setView('settings')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${view === 'settings' ? 'text-[#28AA48] border-[#28AA48]' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
        >
          <Settings className="w-4 h-4" />
          Settings
        </button>
      </div>

      {view === 'inbox' && (
        <div className="max-w-2xl">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-400">{unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}</p>
            <div className="flex items-center gap-2">
              <button onClick={fetchNotifications} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors" title="Refresh">
                <RefreshCw className="w-4 h-4" />
              </button>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#28AA48] bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Mark all read
                </button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                  <Bell className="w-7 h-7 text-gray-400" />
                </div>
                <p className="text-base font-semibold text-gray-600">No notifications yet</p>
                <p className="text-sm text-gray-400 mt-1 max-w-xs">You'll see notifications here when clients accept proposals, submit applications, or upload documents.</p>
              </div>
            ) : (
              notifications.map(n => {
                const unread = !n.read_at;
                return (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (unread) markRead(n.id);
                      if (n.quote_id) navigate(`/admin#quotes`);
                    }}
                    className={`flex gap-3 px-4 py-4 transition-colors cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-0 ${unread ? 'bg-green-50/40' : ''}`}
                  >
                    <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${unread ? 'bg-[#28AA48]' : 'bg-transparent'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-0.5">
                        <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${TYPE_COLORS[n.type] ?? 'bg-gray-100 text-gray-600'}`}>
                          {TYPE_LABELS[n.type] ?? n.type}
                        </span>
                        <span className="text-[11px] text-gray-400 whitespace-nowrap flex-shrink-0">{timeAgo(n.created_at)}</span>
                      </div>
                      <p className={`text-sm ${unread ? 'font-semibold text-[#1e2d3d]' : 'font-medium text-gray-700'}`}>{n.title}</p>
                      {n.body && <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.body}</p>}
                      {n.quote_id && (
                        <span className="inline-flex items-center gap-1 text-xs text-[#28AA48] mt-1 font-medium">
                          <ExternalLink className="w-3 h-3" />
                          View in proposals
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {view === 'settings' && (
        <div className="max-w-2xl space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Delivery Methods</p>
            </div>
            <div className="divide-y divide-gray-100">
              <div className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-sm font-semibold text-[#1e2d3d]">Platform notifications</p>
                  <p className="text-xs text-gray-400 mt-0.5">See notifications in this dashboard</p>
                </div>
                <Toggle checked={localSettings.platform_notifications} onChange={v => setLocalSettings(p => ({ ...p, platform_notifications: v }))} />
              </div>
              <div className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-sm font-semibold text-[#1e2d3d]">Email notifications</p>
                  <p className="text-xs text-gray-400 mt-0.5">Receive notifications via email as well</p>
                </div>
                <Toggle checked={localSettings.email_notifications} onChange={v => setLocalSettings(p => ({ ...p, email_notifications: v }))} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Notify Me When</p>
            </div>
            <div className="divide-y divide-gray-100">
              {[
                { key: 'notify_quote_accepted' as const, label: 'A client accepts a proposal', sub: 'When a client clicks "Accept" on a proposal' },
                { key: 'notify_application_submitted' as const, label: 'An application is submitted', sub: 'When a client submits their full application' },
                { key: 'notify_document_uploaded' as const, label: 'Documents are uploaded', sub: 'When a client uploads required documents' },
                { key: 'notify_large_proposal' as const, label: 'Large proposal activity ($1M+)', sub: 'When a large proposal requires attention' },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="text-sm font-semibold text-[#1e2d3d]">{item.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{item.sub}</p>
                  </div>
                  <Toggle
                    checked={localSettings[item.key]}
                    onChange={v => setLocalSettings(p => ({ ...p, [item.key]: v }))}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={saveSettings}
              disabled={settingsSaving}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#28AA48] text-white text-sm font-semibold rounded-xl hover:bg-[#22923e] transition-colors disabled:opacity-60"
            >
              {settingsSaving ? <Loader className="w-4 h-4 animate-spin" /> : settingsSaved ? <CheckCircle2 className="w-4 h-4" /> : null}
              {settingsSaved ? 'Saved!' : 'Save Settings'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
