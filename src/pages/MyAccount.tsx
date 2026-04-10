import React, { useState } from 'react';
import { Layout } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { TwoFactorManager } from '../components/TwoFactorManager';
import { User, Building2, Mail, Phone, Calendar, Lock, Eye, EyeOff, CheckCircle, AlertCircle, CreditCard as Edit3, Save, X, FileText, ClipboardList, ShieldCheck, ChevronRight } from 'lucide-react';

type Section = 'profile' | 'password' | 'security';

function SectionNav({ active, onChange }: { active: Section; onChange: (s: Section) => void }) {
  const items: { key: Section; label: string; icon: React.ReactNode }[] = [
    { key: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
    { key: 'password', label: 'Change Password', icon: <Lock className="w-4 h-4" /> },
    { key: 'security', label: 'Two-Factor Auth', icon: <ShieldCheck className="w-4 h-4" /> },
  ];

  return (
    <nav className="flex flex-col gap-1">
      {items.map(item => (
        <button
          key={item.key}
          onClick={() => onChange(item.key)}
          className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
            active === item.key
              ? 'bg-[#6EAE3C]/10 text-[#6EAE3C] border border-[#6EAE3C]/20'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          <span className="flex items-center gap-3">
            {item.icon}
            {item.label}
          </span>
          <ChevronRight className={`w-4 h-4 transition-opacity ${active === item.key ? 'opacity-100' : 'opacity-30'}`} />
        </button>
      ))}
    </nav>
  );
}

function ProfileSection() {
  const { installerProfile, updateProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    full_name: installerProfile?.full_name ?? '',
    company_name: installerProfile?.company_name ?? '',
    phone_number: installerProfile?.phone_number ?? '',
  });

  function startEdit() {
    setForm({
      full_name: installerProfile?.full_name ?? '',
      company_name: installerProfile?.company_name ?? '',
      phone_number: installerProfile?.phone_number ?? '',
    });
    setEditing(true);
    setSuccess(false);
    setError(null);
  }

  function cancelEdit() {
    setEditing(false);
    setError(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await updateProfile({
        full_name: form.full_name.trim(),
        company_name: form.company_name.trim(),
        phone_number: form.phone_number.trim() || null,
      });
      setEditing(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  }

  if (!installerProfile) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-[#3A475B]">Profile Information</h2>
          <p className="text-sm text-gray-500 mt-1">Update your name, company, and contact details</p>
        </div>
        {!editing && (
          <button
            onClick={startEdit}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#6EAE3C] border border-[#6EAE3C] rounded-lg hover:bg-[#6EAE3C]/5 transition-colors"
          >
            <Edit3 className="w-4 h-4" />
            Edit
          </button>
        )}
      </div>

      {success && (
        <div className="flex items-center gap-2 p-3 mb-5 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          Profile updated successfully
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 mb-5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {editing ? (
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                required
                className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6EAE3C]/30 focus:border-[#6EAE3C]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Company Name</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={form.company_name}
                onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
                required
                className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6EAE3C]/30 focus:border-[#6EAE3C]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number <span className="text-gray-400 font-normal">(optional)</span></label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="tel"
                value={form.phone_number}
                onChange={e => setForm(f => ({ ...f, phone_number: e.target.value }))}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6EAE3C]/30 focus:border-[#6EAE3C]"
                placeholder="e.g. 0412 345 678"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#6EAE3C] text-white text-sm font-medium rounded-lg hover:bg-[#5d9432] transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 text-gray-600 bg-gray-100 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-3">
          {[
            { icon: <User className="w-4 h-4 text-[#6EAE3C]" />, label: 'Full Name', value: installerProfile.full_name },
            { icon: <Building2 className="w-4 h-4 text-[#6EAE3C]" />, label: 'Company Name', value: installerProfile.company_name },
            { icon: <Mail className="w-4 h-4 text-[#6EAE3C]" />, label: 'Email Address', value: installerProfile.email },
            { icon: <Phone className="w-4 h-4 text-[#6EAE3C]" />, label: 'Phone Number', value: installerProfile.phone_number || <span className="text-gray-400 italic">Not set</span> },
            {
              icon: <Calendar className="w-4 h-4 text-[#6EAE3C]" />,
              label: 'Member Since',
              value: new Date(installerProfile.created_at).toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' }),
            },
          ].map(({ icon, label, value }, i) => (
            <div key={i} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm border border-gray-100 flex-shrink-0">
                {icon}
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-0.5">{label}</div>
                <div className="text-sm font-semibold text-[#3A475B]">{value}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PasswordSection() {
  const { updatePassword } = useAuth();
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [show, setShow] = useState({ current: false, next: false, confirm: false });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (form.next.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }
    if (form.next !== form.confirm) {
      setError('New passwords do not match');
      return;
    }

    setSaving(true);
    try {
      await updatePassword(form.next);
      setForm({ current: '', next: '', confirm: '' });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to update password');
    } finally {
      setSaving(false);
    }
  }

  const strength = (() => {
    const p = form.next;
    if (!p) return null;
    let score = 0;
    if (p.length >= 8) score++;
    if (p.length >= 12) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    if (score <= 1) return { label: 'Weak', color: 'bg-red-400', width: 'w-1/5' };
    if (score <= 2) return { label: 'Fair', color: 'bg-yellow-400', width: 'w-2/5' };
    if (score <= 3) return { label: 'Good', color: 'bg-blue-400', width: 'w-3/5' };
    if (score <= 4) return { label: 'Strong', color: 'bg-[#6EAE3C]', width: 'w-4/5' };
    return { label: 'Very Strong', color: 'bg-[#6EAE3C]', width: 'w-full' };
  })();

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-[#3A475B]">Change Password</h2>
        <p className="text-sm text-gray-500 mt-1">Choose a strong password to keep your account secure</p>
      </div>

      {success && (
        <div className="flex items-center gap-2 p-3 mb-5 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          Password updated successfully
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 mb-5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        {(['current', 'next', 'confirm'] as const).map((field) => {
          const labels = { current: 'Current Password', next: 'New Password', confirm: 'Confirm New Password' };
          return (
            <div key={field}>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{labels[field]}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={show[field] ? 'text' : 'password'}
                  value={form[field]}
                  onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                  required
                  className="w-full pl-9 pr-10 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6EAE3C]/30 focus:border-[#6EAE3C]"
                />
                <button
                  type="button"
                  onClick={() => setShow(s => ({ ...s, [field]: !s[field] }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {show[field] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {field === 'next' && strength && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>Password strength</span>
                    <span className="font-medium">{strength.label}</span>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${strength.color} ${strength.width}`} />
                  </div>
                </div>
              )}
            </div>
          );
        })}

        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#6EAE3C] text-white text-sm font-medium rounded-lg hover:bg-[#5d9432] transition-colors disabled:opacity-50"
          >
            <Lock className="w-4 h-4" />
            {saving ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </form>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-lg max-w-md">
        <p className="text-xs font-semibold text-blue-700 mb-2">Password requirements</p>
        <ul className="space-y-1">
          {[
            'At least 8 characters',
            'Mix of uppercase and lowercase letters',
            'At least one number',
            'At least one special character (!@#$...)',
          ].map((req, i) => (
            <li key={i} className="flex items-center gap-2 text-xs text-blue-600">
              <div className="w-1 h-1 bg-blue-400 rounded-full" />
              {req}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ActivityStats({ profile }: { profile: { quote_count: number; application_count: number } }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-gradient-to-br from-blue-50 to-blue-100/60 rounded-xl p-5 border border-blue-100">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-blue-600/10 rounded-lg flex items-center justify-center">
            <FileText className="w-4 h-4 text-blue-600" />
          </div>
          <span className="text-xs font-medium text-blue-700">Quotes Generated</span>
        </div>
        <div className="text-3xl font-bold text-blue-700">{profile.quote_count || 0}</div>
        <div className="text-xs text-blue-500 mt-1">Finance calculations</div>
      </div>

      <div className="bg-gradient-to-br from-green-50 to-green-100/60 rounded-xl p-5 border border-green-100">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-[#6EAE3C]/10 rounded-lg flex items-center justify-center">
            <ClipboardList className="w-4 h-4 text-[#6EAE3C]" />
          </div>
          <span className="text-xs font-medium text-[#5a9030]">Applications</span>
        </div>
        <div className="text-3xl font-bold text-[#6EAE3C]">{profile.application_count || 0}</div>
        <div className="text-xs text-[#6EAE3C]/70 mt-1">Submitted for review</div>
      </div>
    </div>
  );
}

export function MyAccount() {
  const { installerProfile, refreshProfile } = useAuth();
  const [section, setSection] = useState<Section>('profile');

  if (!installerProfile) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-gray-500 text-sm">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50/50 py-10 px-4">
        <div className="max-w-5xl mx-auto">

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-[#3A475B]">My Account</h1>
            <p className="text-sm text-gray-500 mt-1">Manage your profile, password, and security settings</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">

            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="flex flex-col items-center text-center mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#6EAE3C] to-[#8BC83F] rounded-full flex items-center justify-center mb-3 shadow">
                    <span className="text-2xl font-bold text-white">
                      {installerProfile.full_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="font-semibold text-[#3A475B] text-sm leading-tight">{installerProfile.full_name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{installerProfile.company_name}</div>
                  <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 border border-green-200 rounded-full">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                    <span className="text-xs font-medium text-green-700">Active</span>
                  </div>
                </div>
                <SectionNav active={section} onChange={setSection} />
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Activity</h3>
                <ActivityStats profile={installerProfile} />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-7 shadow-sm">
              {section === 'profile' && <ProfileSection />}
              {section === 'password' && <PasswordSection />}
              {section === 'security' && (
                <div>
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-[#3A475B]">Two-Factor Authentication</h2>
                    <p className="text-sm text-gray-500 mt-1">Add an extra layer of security to your account</p>
                  </div>
                  <TwoFactorManager
                    userId={installerProfile.id}
                    userType="installer"
                    email={installerProfile.email}
                    totpEnabled={installerProfile.totp_enabled}
                    onStatusChange={refreshProfile}
                    accentColor="#6EAE3C"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
