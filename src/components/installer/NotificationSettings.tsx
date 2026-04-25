import { useState, useEffect } from 'react';
import { CheckCircle2, Loader } from 'lucide-react';
import { useNotifications, NotificationSettings as NS } from '../../context/NotificationsContext';

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
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`}
      />
    </button>
  );
}

export function NotificationSettings() {
  const { settings, settingsLoading, saveSettings } = useNotifications();
  const [local, setLocal] = useState<NS | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) setLocal({ ...settings });
  }, [settings]);

  if (!local) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-[#28AA48] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  function set<K extends keyof NS>(key: K, value: NS[K]) {
    setLocal(prev => prev ? { ...prev, [key]: value } : prev);
    setSaved(false);
  }

  async function handleSave() {
    if (!local) return;
    await saveSettings(local);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-[#1e2d3d]">Notification Settings</h2>
        <p className="text-sm text-gray-400 mt-0.5">Choose how you'd like to be notified about activity.</p>
      </div>

      <div className="space-y-4">
        {/* Delivery methods */}
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
              <Toggle checked={local.platform_notifications} onChange={v => set('platform_notifications', v)} />
            </div>
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-[#1e2d3d]">Email notifications</p>
                <p className="text-xs text-gray-400 mt-0.5">Receive notifications via email as well</p>
              </div>
              <Toggle checked={local.email_notifications} onChange={v => set('email_notifications', v)} />
            </div>
          </div>
        </div>

        {/* Event types */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Notify Me When</p>
          </div>
          <div className="divide-y divide-gray-100">
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-[#1e2d3d]">A client accepts a proposal</p>
                <p className="text-xs text-gray-400 mt-0.5">When a client clicks "Accept" on your proposal</p>
              </div>
              <Toggle checked={local.notify_quote_accepted} onChange={v => set('notify_quote_accepted', v)} />
            </div>
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-[#1e2d3d]">An application is submitted</p>
                <p className="text-xs text-gray-400 mt-0.5">When a client submits their full application</p>
              </div>
              <Toggle checked={local.notify_application_submitted} onChange={v => set('notify_application_submitted', v)} />
            </div>
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-[#1e2d3d]">Documents are uploaded</p>
                <p className="text-xs text-gray-400 mt-0.5">When a client uploads their required documents</p>
              </div>
              <Toggle checked={local.notify_document_uploaded} onChange={v => set('notify_document_uploaded', v)} />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={settingsLoading}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#28AA48] text-white text-sm font-semibold rounded-xl hover:bg-[#22923e] transition-colors disabled:opacity-60"
          >
            {settingsLoading ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : null}
            {saved ? 'Saved!' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
