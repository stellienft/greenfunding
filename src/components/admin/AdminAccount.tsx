import { useState, useEffect } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { TwoFactorManager } from '../TwoFactorManager';
import { User, Mail, Phone, Pencil, Check, X, AlertCircle, Lock, KeyRound } from 'lucide-react';

interface AdminProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  totp_enabled: boolean;
}

const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-auth`;
const headers = {
  'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
};

export function AdminAccount() {
  const { admin } = useAdmin();
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '' });
  const [resettingPassword, setResettingPassword] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  useEffect(() => {
    if (admin) loadProfile();
  }, [admin]);

  async function loadProfile() {
    if (!admin) return;
    setLoading(true);
    try {
      const res = await fetch(`${baseUrl}/profile`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ adminId: admin.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load profile');
      setProfile(data.profile);
      setForm({
        firstName: data.profile.first_name || '',
        lastName: data.profile.last_name || '',
        phone: data.profile.phone || '',
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!admin || !profile) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${baseUrl}/update-profile`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ adminId: admin.id, firstName: form.firstName, lastName: form.lastName, phone: form.phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      setSuccess('Profile updated.');
      setEditing(false);
      loadProfile();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleRequestPasswordReset() {
    if (!admin) return;
    setResettingPassword(true);
    setError('');
    try {
      const res = await fetch(`${baseUrl}/request-password-reset`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ adminId: admin.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send reset email');
      setResetSuccess(true);
      setTimeout(() => setResetSuccess(false), 6000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setResettingPassword(false);
    }
  }

  if (loading) {
    return <div className="text-gray-500 py-8 text-center">Loading...</div>;
  }

  if (!profile) {
    return (
      <div className="text-red-500 py-8 text-center">
        {error || 'Could not load profile.'}
      </div>
    );
  }

  const displayName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.email;

  return (
    <div className="max-w-2xl space-y-6">
      <h2 className="text-xl font-bold text-[#3A475B]">My Account</h2>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          <Check className="w-4 h-4 flex-shrink-0" />
          {success}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-[#3A475B]">Account Details</h3>
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 text-sm text-[#28AA48] font-semibold hover:underline"
            >
              <Pencil className="w-4 h-4" />
              Edit
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setEditing(false); setError(''); }}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 text-sm text-white bg-[#28AA48] px-3 py-1.5 rounded-lg font-semibold hover:bg-[#24993f] disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
          <User className="w-5 h-5 text-[#28AA48] flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-gray-500 mb-0.5">Full Name</div>
            {editing ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.firstName}
                  onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                  placeholder="First name"
                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#28AA48] focus:border-transparent outline-none"
                />
                <input
                  type="text"
                  value={form.lastName}
                  onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                  placeholder="Last name"
                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#28AA48] focus:border-transparent outline-none"
                />
              </div>
            ) : (
              <div className="font-semibold text-[#3A475B]">{displayName}</div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
          <Mail className="w-5 h-5 text-[#28AA48] flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-gray-500 mb-0.5">Email Address</div>
            <div className="font-semibold text-[#3A475B] truncate">{profile.email}</div>
          </div>
        </div>

        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
          <Phone className="w-5 h-5 text-[#28AA48] flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-gray-500 mb-0.5">Phone</div>
            {editing ? (
              <input
                type="tel"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+61 400 000 000"
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#28AA48] focus:border-transparent outline-none"
              />
            ) : (
              <div className="font-semibold text-[#3A475B]">{profile.phone || <span className="text-gray-400 font-normal">Not set</span>}</div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
          <User className="w-5 h-5 text-[#28AA48] flex-shrink-0" />
          <div>
            <div className="text-xs text-gray-500 mb-0.5">Role</div>
            <div className="font-semibold text-[#3A475B]">Administrator</div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <div>
          <h3 className="font-semibold text-[#3A475B]">Password</h3>
          <p className="text-sm text-gray-500 mt-0.5">Send a temporary password to your email address to set up a new one</p>
        </div>

        {resetSuccess && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            <Check className="w-4 h-4 flex-shrink-0" />
            A temporary password has been sent to {profile.email}
          </div>
        )}

        <button
          onClick={handleRequestPasswordReset}
          disabled={resettingPassword}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#094325] rounded-lg hover:bg-[#0d5c33] transition-colors disabled:opacity-50"
        >
          {resettingPassword ? (
            <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : (
            <KeyRound className="w-4 h-4" />
          )}
          {resettingPassword ? 'Sending...' : 'Send Password Reset Email'}
        </button>
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold text-[#3A475B]">Security</h3>
        <TwoFactorManager
          userId={profile.id}
          userType="admin"
          email={profile.email}
          totpEnabled={profile.totp_enabled}
          onStatusChange={loadProfile}
          accentColor="#094325"
        />
      </div>
    </div>
  );
}
