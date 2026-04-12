import React, { useState, useEffect } from 'react';
import {
  UserPlus, Users, Mail, Building2, Trash2, AlertCircle,
  Pencil, RotateCcw, ShieldOff, Shield, X, Check, Calculator,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAdmin } from '../../context/AdminContext';

const ALL_CALCULATORS = [
  { key: 'rental', label: 'Rental' },
  { key: 'progress_payment_rental', label: 'Progress Payment' },
  { key: 'serviced_rental', label: 'Serviced Rental' },
];

const CALC_LABELS: Record<string, string> = {
  rental: 'Rental',
  progress_payment_rental: 'Progress Payment',
  serviced_rental: 'Serviced Rental',
};

interface InstallerUser {
  id: string;
  full_name: string;
  company_name: string;
  email: string;
  needs_password_reset: boolean;
  created_at: string;
  application_count: number;
  quote_count: number;
  user_type?: 'admin' | 'installer';
  first_name?: string;
  last_name?: string;
  phone?: string;
  allowed_calculators?: string[];
  is_super_admin?: boolean;
}

type FormMode = 'add-installer' | 'add-admin' | 'edit';

const API_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users`;
const API_HEADERS = {
  'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
};

async function apiCall(action: string, body?: object) {
  const res = await fetch(`${API_BASE}?action=${action}`, {
    method: body ? 'POST' : 'GET',
    headers: API_HEADERS,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed`);
  return data;
}

export function UserManagement() {
  const { admin } = useAdmin();
  const isSuperAdmin = admin?.is_super_admin ?? false;

  const [users, setUsers] = useState<InstallerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'installers' | 'admins'>('installers');
  const [formMode, setFormMode] = useState<FormMode | null>(null);
  const [editingUser, setEditingUser] = useState<InstallerUser | null>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    companyName: '',
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
  });
  const [allowedCalcs, setAllowedCalcs] = useState<string[]>(ALL_CALCULATORS.map(c => c.key));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}?action=list`, { headers: API_HEADERS });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load users');
      setUsers(data.users || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  function openAddInstaller() {
    setEditingUser(null);
    setFormMode('add-installer');
    setFormData({ fullName: '', companyName: '', email: '', firstName: '', lastName: '', phone: '' });
    setAllowedCalcs(ALL_CALCULATORS.map(c => c.key));
    setError(null);
  }

  function openAddAdmin() {
    setEditingUser(null);
    setFormMode('add-admin');
    setFormData({ fullName: '', companyName: '', email: '', firstName: '', lastName: '', phone: '' });
    setError(null);
  }

  function openEdit(user: InstallerUser) {
    setEditingUser(user);
    setFormMode('edit');
    const isAdmin = user.user_type === 'admin';
    setFormData({
      fullName: user.full_name,
      companyName: user.company_name,
      email: user.email,
      firstName: isAdmin ? (user.first_name || '') : '',
      lastName: isAdmin ? (user.last_name || '') : '',
      phone: isAdmin ? (user.phone || '') : '',
    });
    if (!isAdmin) {
      setAllowedCalcs(
        user.allowed_calculators && user.allowed_calculators.length > 0
          ? user.allowed_calculators
          : ALL_CALCULATORS.map(c => c.key)
      );
    }
    setError(null);
  }

  function closeForm() {
    setFormMode(null);
    setEditingUser(null);
    setFormData({ fullName: '', companyName: '', email: '', firstName: '', lastName: '', phone: '' });
    setAllowedCalcs(ALL_CALCULATORS.map(c => c.key));
    setError(null);
  }

  function generatePassword() {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    return Array.from({ length: 12 }, () => charset[Math.floor(Math.random() * charset.length)]).join('');
  }

  async function handleSubmitInstaller(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const temporaryPassword = generatePassword();
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: temporaryPassword,
        options: { data: { full_name: formData.fullName, company_name: formData.companyName, needs_password_reset: true } },
      });
      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create user');

      const emailRes = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-welcome-email`, {
        method: 'POST',
        headers: API_HEADERS,
        body: JSON.stringify({ email: formData.email, fullName: formData.fullName, companyName: formData.companyName, temporaryPassword }),
      });
      const emailData = await emailRes.json();

      if (!emailRes.ok) {
        setError(`User created but email failed: ${emailData.error || 'Unknown error'}. Temp password: ${temporaryPassword}`);
        closeForm();
        loadUsers();
        return;
      }

      await supabase.from('installer_users').update({ allowed_calculators: allowedCalcs }).eq('id', authData.user.id);

      setSuccess(`Installer created and welcome email sent to ${formData.email}`);
      closeForm();
      loadUsers();
    } catch (e: any) {
      setError(e.message || 'Failed to create installer');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitAdmin(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const data = await apiCall('create-admin', {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        companyName: formData.companyName,
        phone: formData.phone,
        requestingAdminId: admin?.id,
      });
      alert(`Admin account created.\n\nTemporary password:\n${data.newPassword}\n\nPlease save this — it will not be shown again.`);
      setSuccess(`Admin account created for ${formData.email}`);
      closeForm();
      loadUsers();
    } catch (e: any) {
      setError(e.message || 'Failed to create admin');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;
    setSubmitting(true);
    setError(null);
    try {
      const isAdmin = editingUser.user_type === 'admin';
      const body: any = { userId: editingUser.id, email: formData.email, userType: editingUser.user_type };
      if (isAdmin) {
        body.firstName = formData.firstName;
        body.lastName = formData.lastName;
        body.companyName = formData.companyName;
        body.phone = formData.phone;
      } else {
        body.fullName = formData.fullName;
        body.companyName = formData.companyName;
        body.allowedCalculators = allowedCalcs;
      }
      await apiCall('update', body);
      setSuccess('User updated successfully');
      closeForm();
      loadUsers();
    } catch (e: any) {
      setError(e.message || 'Failed to update user');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteUser(user: InstallerUser) {
    const label = user.user_type === 'admin' ? 'admin account' : 'installer';
    if (!confirm(`Delete this ${label}? This cannot be undone.`)) return;
    try {
      await apiCall('delete', { userId: user.id, userType: user.user_type, requestingAdminId: admin?.id });
      setSuccess('User deleted successfully');
      loadUsers();
    } catch (e: any) {
      setError(e.message || 'Failed to delete user');
    }
  }

  async function handleResetPassword(user: InstallerUser) {
    const isAdmin = user.user_type === 'admin';
    const msg = isAdmin
      ? 'Generate a new password for this admin? The new password will be shown on screen.'
      : 'Reset this installer\'s password? A new temporary password will be emailed to them.';
    if (!confirm(msg)) return;
    try {
      const data = await apiCall('reset-password', { userId: user.id, userType: user.user_type });
      if (isAdmin && data.newPassword) {
        alert(`New admin password:\n\n${data.newPassword}\n\nSave this — it will not be shown again.`);
        setSuccess('Admin password reset. New password displayed.');
      } else {
        setSuccess('Password reset email sent to the installer.');
      }
      loadUsers();
    } catch (e: any) {
      setError(e.message || 'Failed to reset password');
    }
  }

  async function handleReset2FA(user: InstallerUser) {
    if (!confirm('Reset 2FA for this user? They will need to re-enrol their authenticator app.')) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/totp/admin-reset`, {
        method: 'POST',
        headers: API_HEADERS,
        body: JSON.stringify({ userId: user.id, userType: user.user_type || 'installer' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset 2FA');
      setSuccess('2FA reset. The user will need to re-enrol their authenticator app.');
      loadUsers();
    } catch (e: any) {
      setError(e.message || 'Failed to reset 2FA');
    }
  }

  const filteredUsers = users.filter(u =>
    activeTab === 'installers' ? (u.user_type === 'installer' || !u.user_type) : u.user_type === 'admin'
  );

  const installerCount = users.filter(u => u.user_type === 'installer' || !u.user_type).length;
  const adminCount = users.filter(u => u.user_type === 'admin').length;

  const showForm = formMode !== null;
  const isEditingAdmin = formMode === 'edit' && editingUser?.user_type === 'admin';
  const isEditingInstaller = formMode === 'edit' && editingUser?.user_type !== 'admin';
  const isAddingInstaller = formMode === 'add-installer';
  const isAddingAdmin = formMode === 'add-admin';
  const showCalcAccess = isEditingInstaller || isAddingInstaller;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-gray-400 text-sm">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-[#28AA48]" />
          <h2 className="text-xl font-bold text-[#1e293b]">User Management</h2>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'installers' && (
            <button
              onClick={openAddInstaller}
              className="flex items-center gap-2 px-3 py-2 bg-[#28AA48] text-white rounded-lg hover:bg-[#239940] transition-colors text-sm font-medium"
            >
              <UserPlus className="w-4 h-4" />
              Add Installer
            </button>
          )}
          {activeTab === 'admins' && isSuperAdmin && (
            <button
              onClick={openAddAdmin}
              className="flex items-center gap-2 px-3 py-2 bg-[#1e293b] text-white rounded-lg hover:bg-[#2d3f55] transition-colors text-sm font-medium"
            >
              <Shield className="w-4 h-4" />
              Add Admin
            </button>
          )}
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-6">
          <button
            onClick={() => setActiveTab('installers')}
            className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'installers'
                ? 'border-[#28AA48] text-[#28AA48]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Installers ({installerCount})
          </button>
          <button
            onClick={() => setActiveTab('admins')}
            className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'admins'
                ? 'border-[#28AA48] text-[#28AA48]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Admins ({adminCount})
          </button>
        </nav>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          <Check className="w-4 h-4 flex-shrink-0" />
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-semibold text-[#1e293b]">
              {isAddingInstaller && 'Add New Installer'}
              {isAddingAdmin && 'Add New Admin'}
              {isEditingAdmin && 'Edit Admin Account'}
              {isEditingInstaller && 'Edit Installer Account'}
            </h3>
            <button onClick={closeForm} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={
            isAddingInstaller ? handleSubmitInstaller
            : isAddingAdmin ? handleSubmitAdmin
            : handleUpdateUser
          }>
            <div className="space-y-4">
              {(isEditingAdmin || isAddingAdmin) ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                      <input
                        type="text"
                        value={formData.firstName}
                        onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#28AA48] focus:border-[#28AA48]"
                        placeholder="John"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                      <input
                        type="text"
                        value={formData.lastName}
                        onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#28AA48] focus:border-[#28AA48]"
                        placeholder="Smith"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#28AA48] focus:border-[#28AA48]"
                      placeholder="admin@company.com.au"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                      <input
                        type="text"
                        value={formData.companyName}
                        onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#28AA48] focus:border-[#28AA48]"
                        placeholder="Green Funding"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#28AA48] focus:border-[#28AA48]"
                        placeholder="+61 400 000 000"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#28AA48] focus:border-[#28AA48]"
                      placeholder="John Smith"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                    <input
                      type="text"
                      value={formData.companyName}
                      onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#28AA48] focus:border-[#28AA48]"
                      placeholder="Solar Company Pty Ltd"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#28AA48] focus:border-[#28AA48]"
                      placeholder="john@solarcompany.com.au"
                    />
                  </div>
                </>
              )}

              {showCalcAccess && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calculator className="w-4 h-4 inline-block mr-1 text-gray-400" />
                    Calculator Access
                  </label>
                  <div className="space-y-2 p-3 border border-gray-200 rounded-lg bg-gray-50">
                    {ALL_CALCULATORS.map(calc => (
                      <label key={calc.key} className="flex items-center gap-3 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={allowedCalcs.includes(calc.key)}
                          onChange={e => setAllowedCalcs(prev =>
                            e.target.checked ? [...prev, calc.key] : prev.filter(k => k !== calc.key)
                          )}
                          className="w-4 h-4 rounded border-gray-300 text-[#28AA48] focus:ring-[#28AA48]"
                        />
                        <span className="text-sm text-gray-700">{calc.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {(isAddingInstaller || isAddingAdmin) && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-800">
                  {isAddingInstaller
                    ? 'A temporary password will be generated and emailed to the installer. They must reset it on first login.'
                    : 'A temporary password will be generated and shown to you once. Save it before closing.'}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-[#28AA48] text-white rounded-lg hover:bg-[#239940] transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {submitting
                    ? (formMode === 'edit' ? 'Saving...' : 'Creating...')
                    : (formMode === 'edit' ? 'Save Changes' : 'Create Account')}
                </button>
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {activeTab === 'admins' ? 'Role' : 'Company'}
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                {activeTab === 'installers' && (
                  <>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Quotes</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Calculators</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  </>
                )}
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Joined</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={activeTab === 'installers' ? 8 : 5} className="px-5 py-10 text-center text-sm text-gray-400">
                    {activeTab === 'installers' ? 'No installer accounts yet.' : 'No admin accounts found.'}
                  </td>
                </tr>
              ) : filteredUsers.map(user => {
                const isAdmin = user.user_type === 'admin';
                const calcs = user.allowed_calculators && user.allowed_calculators.length > 0
                  ? user.allowed_calculators
                  : ALL_CALCULATORS.map(c => c.key);
                const canDelete = isAdmin ? isSuperAdmin && user.id !== admin?.id : true;

                return (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="font-medium text-[#1e293b] text-sm">{user.full_name}</div>
                        {isAdmin && user.is_super_admin && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-100">
                            <Shield className="w-2.5 h-2.5" /> Super
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {isAdmin ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                          Administrator
                        </span>
                      ) : (
                        <div className="flex items-center gap-1.5 text-sm text-gray-700">
                          <Building2 className="w-3.5 h-3.5 text-gray-400" />
                          {user.company_name}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-sm text-gray-600">
                        <Mail className="w-3.5 h-3.5 text-gray-400" />
                        {user.email}
                      </div>
                    </td>
                    {activeTab === 'installers' && (
                      <>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                            {user.quote_count || 0}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex flex-wrap gap-1">
                            {calcs.map(k => (
                              <span key={k} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#28AA48]/10 text-[#28AA48]">
                                {CALC_LABELS[k] || k}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {user.needs_password_reset ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700">
                              Needs Reset
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                              Active
                            </span>
                          )}
                        </td>
                      </>
                    )}
                    <td className="px-5 py-3.5 whitespace-nowrap text-xs text-gray-400">
                      {new Date(user.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1 justify-end">
                        <ActionButton
                          onClick={() => openEdit(user)}
                          title="Edit"
                          className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Pencil className="w-4 h-4" />
                        </ActionButton>
                        <ActionButton
                          onClick={() => handleResetPassword(user)}
                          title="Reset password"
                          className="text-orange-500 hover:text-orange-700 hover:bg-orange-50"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </ActionButton>
                        <ActionButton
                          onClick={() => handleReset2FA(user)}
                          title="Reset 2FA"
                          className="text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                        >
                          <ShieldOff className="w-4 h-4" />
                        </ActionButton>
                        {canDelete && (
                          <ActionButton
                            onClick={() => handleDeleteUser(user)}
                            title="Delete account"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </ActionButton>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ActionButton({ onClick, title, className, children }: {
  onClick: () => void;
  title: string;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-lg transition-colors ${className}`}
    >
      {children}
    </button>
  );
}
