import React, { useState, useEffect } from 'react';
import {
  UserPlus, Users, Mail, Building2, Trash2, AlertCircle,
  Pencil, RotateCcw, ShieldOff, Shield, X, Check, Calculator,
  Search, MoreVertical, Eye, EyeOff, UserCheck,
  Lock, Phone, User, ShieldCheck,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAdmin } from '../../context/AdminContext';

const ALL_CALCULATORS = [
  { key: 'rental', label: 'Rental' },
  { key: 'progress_payment_rental', label: 'Progress Payment' },
  { key: 'serviced_rental', label: 'Serviced Rental' },
];

const ALL_PERMISSIONS = [
  { key: 'dashboard', label: 'Dashboard', description: 'Platform overview & stats' },
  { key: 'analytics', label: 'Analytics', description: 'Reports and insights' },
  { key: 'calculator', label: 'Calculator', description: 'Run finance calculations' },
  { key: 'quotes', label: 'Proposals', description: 'View sent proposals' },
  { key: 'accepted-quotes', label: 'Accepted Proposals', description: 'View accepted proposals' },
  { key: 'documents', label: 'Documents', description: 'Manage uploaded documents' },
  { key: 'users', label: 'User Management', description: 'Manage partners' },
  { key: 'config', label: 'Calculator Config', description: 'Edit calculator settings' },
  { key: 'assets', label: 'Assets', description: 'Manage asset types' },
  { key: 'site', label: 'Site Settings', description: 'Configure site options' },
  { key: 'email', label: 'Email Templates', description: 'Edit email templates' },
];

const CALC_LABELS: Record<string, string> = {
  rental: 'Rental',
  progress_payment_rental: 'Progress Payment',
  serviced_rental: 'Serviced Rental',
};

interface AdminUser {
  id: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  company_name: string;
  email: string;
  phone?: string;
  needs_password_reset: boolean;
  is_super_admin: boolean;
  role: 'admin' | 'moderator';
  permissions?: string[] | null;
  created_at: string;
  application_count: number;
  quote_count: number;
  user_type: 'admin';
}

interface InstallerUser {
  id: string;
  full_name: string;
  company_name: string;
  email: string;
  phone_number?: string;
  needs_password_reset: boolean;
  created_at: string;
  application_count: number;
  quote_count: number;
  user_type: 'installer';
  allowed_calculators?: string[];
}

type AnyUser = AdminUser | InstallerUser;
type ActiveTab = 'installers' | 'admins' | 'moderators';
type DrawerMode = 'add-installer' | 'add-admin' | 'add-moderator' | 'edit-installer' | 'edit-admin' | 'edit-moderator' | null;

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
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function generatePassword() {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  return Array.from({ length: 12 }, () => charset[Math.floor(Math.random() * charset.length)]).join('');
}

export function UserManagement() {
  const { admin } = useAdmin();
  const isSuperAdmin = admin?.is_super_admin ?? false;

  const [allUsers, setAllUsers] = useState<AnyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('installers');
  const [search, setSearch] = useState('');
  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null);
  const [editingUser, setEditingUser] = useState<AnyUser | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AnyUser | null>(null);
  const [newPasswordModal, setNewPasswordModal] = useState<{ password: string; label: string } | null>(null);

  const [formData, setFormData] = useState({
    fullName: '', companyName: '', email: '',
    firstName: '', lastName: '', phone: '',
  });
  const [allowedCalcs, setAllowedCalcs] = useState<string[]>(ALL_CALCULATORS.map(c => c.key));
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  useEffect(() => { loadUsers(); }, []);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  async function loadUsers() {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}?action=list`, { headers: API_HEADERS });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load users');
      setAllUsers(data.users || []);
    } catch (e: any) {
      showToast(e.message || 'Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  }

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type });
  }

  function openDrawer(mode: DrawerMode, user?: AnyUser) {
    setError(null);
    setDrawerMode(mode);
    setEditingUser(user || null);
    if (user) {
      if (user.user_type === 'installer') {
        setFormData({ fullName: user.full_name, companyName: user.company_name, email: user.email, firstName: '', lastName: '', phone: '' });
        setAllowedCalcs(user.allowed_calculators && user.allowed_calculators.length > 0 ? user.allowed_calculators : ALL_CALCULATORS.map(c => c.key));
      } else {
        const u = user as AdminUser;
        setFormData({ fullName: u.full_name, companyName: u.company_name, email: u.email, firstName: u.first_name || '', lastName: u.last_name || '', phone: u.phone || '' });
        setSelectedPermissions(u.permissions || []);
      }
    } else {
      setFormData({ fullName: '', companyName: '', email: '', firstName: '', lastName: '', phone: '' });
      setAllowedCalcs(ALL_CALCULATORS.map(c => c.key));
      setSelectedPermissions([]);
    }
  }

  function closeDrawer() {
    setDrawerMode(null);
    setEditingUser(null);
    setError(null);
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
        showToast(`Partner created but email failed: ${emailData.error || 'Unknown error'}`, 'error');
      }

      await supabase.from('installer_users').update({ allowed_calculators: allowedCalcs }).eq('id', authData.user.id);
      showToast(`Partner account created and welcome email sent to ${formData.email}`, 'success');
      closeDrawer();
      loadUsers();
    } catch (e: any) {
      setError(e.message || 'Failed to create partner');
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
        role: 'admin',
      });
      setNewPasswordModal({ password: data.newPassword, label: `${formData.firstName || formData.email}'s admin account` });
      showToast(`Admin account created for ${formData.email}`, 'success');
      closeDrawer();
      loadUsers();
    } catch (e: any) {
      setError(e.message || 'Failed to create admin');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitModerator(e: React.FormEvent) {
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
        role: 'moderator',
        permissions: selectedPermissions,
      });

      const emailRes = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-moderator-welcome-email`, {
        method: 'POST',
        headers: API_HEADERS,
        body: JSON.stringify({
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          temporaryPassword: data.newPassword,
          permissions: selectedPermissions,
        }),
      });

      if (!emailRes.ok) {
        setNewPasswordModal({ password: data.newPassword, label: `${formData.firstName || formData.email}'s moderator account` });
        showToast(`Moderator created but welcome email failed. Password shown below.`, 'error');
      } else {
        showToast(`Moderator account created and welcome email sent to ${formData.email}`, 'success');
      }

      closeDrawer();
      loadUsers();
    } catch (e: any) {
      setError(e.message || 'Failed to create moderator');
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
      const isInstaller = editingUser.user_type === 'installer';
      const body: any = { userId: editingUser.id, email: formData.email, userType: editingUser.user_type };
      if (isInstaller) {
        body.fullName = formData.fullName;
        body.companyName = formData.companyName;
        body.allowedCalculators = allowedCalcs;
      } else {
        body.firstName = formData.firstName;
        body.lastName = formData.lastName;
        body.companyName = formData.companyName;
        body.phone = formData.phone;
        const u = editingUser as AdminUser;
        if (u.role === 'moderator') {
          body.permissions = selectedPermissions;
        }
      }
      await apiCall('update', body);
      showToast('User updated successfully', 'success');
      closeDrawer();
      loadUsers();
    } catch (e: any) {
      setError(e.message || 'Failed to update user');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteUser(user: AnyUser) {
    try {
      await apiCall('delete', { userId: user.id, userType: user.user_type, requestingAdminId: admin?.id });
      showToast('User deleted successfully', 'success');
      setConfirmDelete(null);
      loadUsers();
    } catch (e: any) {
      showToast(e.message || 'Failed to delete user', 'error');
      setConfirmDelete(null);
    }
  }

  async function handleResetPassword(user: AnyUser) {
    const isAdmin = user.user_type === 'admin';
    try {
      const data = await apiCall('reset-password', { userId: user.id, userType: user.user_type });
      if (isAdmin && data.newPassword) {
        setNewPasswordModal({ password: data.newPassword, label: `${user.full_name}'s account` });
      } else {
        showToast('Password reset email sent to the partner.', 'success');
      }
      loadUsers();
    } catch (e: any) {
      showToast(e.message || 'Failed to reset password', 'error');
    }
  }

  async function handleReset2FA(user: AnyUser) {
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/totp/admin-reset`, {
        method: 'POST',
        headers: API_HEADERS,
        body: JSON.stringify({ userId: user.id, userType: user.user_type || 'installer' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset 2FA');
      showToast('2FA reset. The user will need to re-enrol their authenticator app.', 'success');
      loadUsers();
    } catch (e: any) {
      showToast(e.message || 'Failed to reset 2FA', 'error');
    }
  }

  const installers = allUsers.filter(u => u.user_type === 'installer') as InstallerUser[];
  const admins = allUsers.filter(u => u.user_type === 'admin' && (u as AdminUser).role === 'admin') as AdminUser[];
  const moderators = allUsers.filter(u => u.user_type === 'admin' && (u as AdminUser).role === 'moderator') as AdminUser[];

  const filteredList = (() => {
    const list = activeTab === 'installers' ? installers : activeTab === 'admins' ? admins : moderators;
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(u =>
      u.full_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.company_name?.toLowerCase().includes(q)
    );
  })();

  const isDrawerOpen = drawerMode !== null;
  const drawerIsEdit = drawerMode?.startsWith('edit');

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
          toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.message}
          <button onClick={() => setToast(null)} className="ml-2 opacity-70 hover:opacity-100"><X className="w-4 h-4" /></button>
        </div>
      )}

      {newPasswordModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Lock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-[#1e293b]">Temporary Password</h3>
                <p className="text-xs text-gray-500">{newPasswordModal.label}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4">Save this password — it will not be shown again. The user must change it on first login.</p>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 font-mono text-lg font-bold text-center text-[#1e293b] tracking-widest select-all mb-5">
              {newPasswordModal.password}
            </div>
            <button
              onClick={() => setNewPasswordModal(null)}
              className="w-full py-2.5 bg-[#1e293b] text-white rounded-xl text-sm font-semibold hover:bg-[#2d3f55] transition-colors"
            >
              I've saved this password
            </button>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-[#1e293b] text-center mb-2">Delete Account</h3>
            <p className="text-sm text-gray-600 text-center mb-6">
              Are you sure you want to delete <strong>{confirmDelete.full_name}</strong>? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteUser(confirmDelete)}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#1e293b]">User Management</h2>
          <p className="text-sm text-gray-500 mt-0.5">Manage partners, admins and moderators</p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'installers' && (
            <button
              onClick={() => openDrawer('add-installer')}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#28AA48] text-white rounded-xl hover:bg-[#239940] transition-colors text-sm font-semibold shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              Add Partner
            </button>
          )}
          {activeTab === 'admins' && isSuperAdmin && (
            <button
              onClick={() => openDrawer('add-admin')}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#1e293b] text-white rounded-xl hover:bg-[#2d3f55] transition-colors text-sm font-semibold shadow-sm"
            >
              <Shield className="w-4 h-4" />
              Add Admin
            </button>
          )}
          {activeTab === 'moderators' && (
            <button
              onClick={() => openDrawer('add-moderator')}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-semibold shadow-sm"
            >
              <UserCheck className="w-4 h-4" />
              Add Moderator
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          {([
            { key: 'installers', label: 'Partners', count: installers.length },
            { key: 'admins', label: 'Admins', count: admins.length },
            { key: 'moderators', label: 'Moderators', count: moderators.length },
          ] as { key: ActiveTab; label: string; count: number }[]).map(tab => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setSearch(''); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-white text-[#1e293b] shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                activeTab === tab.key ? 'bg-gray-100 text-gray-700' : 'bg-gray-200 text-gray-500'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search users..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#28AA48]/30 focus:border-[#28AA48] outline-none bg-white"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-8 h-8 border-2 border-[#28AA48] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Loading users...</p>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
            <Users className="w-7 h-7 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-500">
            {search ? 'No users match your search' : `No ${activeTab} yet`}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {activeTab === 'installers'
            ? (filteredList as InstallerUser[]).map(user => (
                <InstallerCard
                  key={user.id}
                  user={user}
                  onEdit={() => openDrawer('edit-installer', user)}
                  onResetPassword={() => handleResetPassword(user)}
                  onReset2FA={() => handleReset2FA(user)}
                  onDelete={() => setConfirmDelete(user)}
                />
              ))
            : (filteredList as AdminUser[]).map(user => (
                <AdminCard
                  key={user.id}
                  user={user}
                  currentAdminId={admin?.id}
                  isSuperAdmin={isSuperAdmin}
                  onEdit={() => openDrawer(user.role === 'moderator' ? 'edit-moderator' : 'edit-admin', user)}
                  onResetPassword={() => handleResetPassword(user)}
                  onReset2FA={() => handleReset2FA(user)}
                  onDelete={() => setConfirmDelete(user)}
                />
              ))
          }
        </div>
      )}

      {isDrawerOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={closeDrawer} />
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  drawerMode?.includes('installer') ? 'bg-[#28AA48]/10' :
                  drawerMode?.includes('moderator') ? 'bg-blue-50' : 'bg-slate-100'
                }`}>
                  {drawerMode?.includes('installer') ? <UserPlus className="w-4 h-4 text-[#28AA48]" /> :
                   drawerMode?.includes('moderator') ? <UserCheck className="w-4 h-4 text-blue-600" /> :
                   <Shield className="w-4 h-4 text-slate-600" />}
                </div>
                <div>
                  <h3 className="font-bold text-[#1e293b] text-base">
                    {drawerMode === 'add-installer' && 'New Partner'}
                    {drawerMode === 'add-admin' && 'New Admin'}
                    {drawerMode === 'add-moderator' && 'New Moderator'}
                    {drawerMode === 'edit-installer' && 'Edit Partner'}
                    {drawerMode === 'edit-admin' && 'Edit Admin'}
                    {drawerMode === 'edit-moderator' && 'Edit Moderator'}
                  </h3>
                  <p className="text-xs text-gray-400">
                    {drawerIsEdit ? 'Update account details' : 'Fill in the details below'}
                  </p>
                </div>
              </div>
              <button onClick={closeDrawer} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm mb-5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form
                id="user-form"
                onSubmit={
                  drawerMode === 'add-installer' ? handleSubmitInstaller :
                  drawerMode === 'add-admin' ? handleSubmitAdmin :
                  drawerMode === 'add-moderator' ? handleSubmitModerator :
                  handleUpdateUser
                }
                className="space-y-5"
              >
                {(drawerMode?.includes('admin') || drawerMode?.includes('moderator')) ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField label="First Name" icon={<User className="w-4 h-4" />}>
                        <input
                          type="text"
                          value={formData.firstName}
                          onChange={e => setFormData(p => ({ ...p, firstName: e.target.value }))}
                          placeholder="John"
                          className="form-input"
                        />
                      </FormField>
                      <FormField label="Last Name" icon={<User className="w-4 h-4" />}>
                        <input
                          type="text"
                          value={formData.lastName}
                          onChange={e => setFormData(p => ({ ...p, lastName: e.target.value }))}
                          placeholder="Smith"
                          className="form-input"
                        />
                      </FormField>
                    </div>
                    <FormField label="Email Address" icon={<Mail className="w-4 h-4" />} required>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                        placeholder="admin@company.com.au"
                        required
                        className="form-input"
                      />
                    </FormField>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField label="Company" icon={<Building2 className="w-4 h-4" />}>
                        <input
                          type="text"
                          value={formData.companyName}
                          onChange={e => setFormData(p => ({ ...p, companyName: e.target.value }))}
                          placeholder="Green Funding"
                          className="form-input"
                        />
                      </FormField>
                      <FormField label="Phone" icon={<Phone className="w-4 h-4" />}>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                          placeholder="+61 400 000 000"
                          className="form-input"
                        />
                      </FormField>
                    </div>
                  </>
                ) : (
                  <>
                    <FormField label="Full Name" icon={<User className="w-4 h-4" />} required>
                      <input
                        type="text"
                        value={formData.fullName}
                        onChange={e => setFormData(p => ({ ...p, fullName: e.target.value }))}
                        placeholder="John Smith"
                        required
                        className="form-input"
                      />
                    </FormField>
                    <FormField label="Company Name" icon={<Building2 className="w-4 h-4" />} required>
                      <input
                        type="text"
                        value={formData.companyName}
                        onChange={e => setFormData(p => ({ ...p, companyName: e.target.value }))}
                        placeholder="Solar Company Pty Ltd"
                        required
                        className="form-input"
                      />
                    </FormField>
                    <FormField label="Email Address" icon={<Mail className="w-4 h-4" />} required>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                        placeholder="john@solarcompany.com.au"
                        required
                        className="form-input"
                      />
                    </FormField>
                  </>
                )}

                {(drawerMode === 'add-installer' || drawerMode === 'edit-installer') && (
                  <div>
                    <p className="text-sm font-semibold text-[#1e293b] mb-3 flex items-center gap-2">
                      <Calculator className="w-4 h-4 text-gray-400" />
                      Calculator Access
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                      {ALL_CALCULATORS.map(calc => (
                        <label key={calc.key} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          allowedCalcs.includes(calc.key)
                            ? 'border-[#28AA48] bg-[#28AA48]/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}>
                          <input
                            type="checkbox"
                            checked={allowedCalcs.includes(calc.key)}
                            onChange={e => setAllowedCalcs(prev =>
                              e.target.checked ? [...prev, calc.key] : prev.filter(k => k !== calc.key)
                            )}
                            className="w-4 h-4 rounded border-gray-300 text-[#28AA48] focus:ring-[#28AA48]"
                          />
                          <span className="text-sm font-medium text-gray-700">{calc.label}</span>
                          {allowedCalcs.includes(calc.key) && <Check className="w-4 h-4 text-[#28AA48] ml-auto" />}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {(drawerMode === 'add-moderator' || drawerMode === 'edit-moderator') && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-[#1e293b] flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-blue-500" />
                        Page Permissions
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedPermissions(ALL_PERMISSIONS.map(p => p.key))}
                          className="text-xs text-blue-600 hover:underline font-medium"
                        >
                          Select all
                        </button>
                        <span className="text-gray-300">|</span>
                        <button
                          type="button"
                          onClick={() => setSelectedPermissions([])}
                          className="text-xs text-gray-500 hover:underline font-medium"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-1.5">
                      {ALL_PERMISSIONS.map(perm => (
                        <label key={perm.key} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          selectedPermissions.includes(perm.key)
                            ? 'border-blue-400 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}>
                          <input
                            type="checkbox"
                            checked={selectedPermissions.includes(perm.key)}
                            onChange={e => setSelectedPermissions(prev =>
                              e.target.checked ? [...prev, perm.key] : prev.filter(k => k !== perm.key)
                            )}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800">{perm.label}</p>
                            <p className="text-xs text-gray-400">{perm.description}</p>
                          </div>
                          {selectedPermissions.includes(perm.key) && <Check className="w-4 h-4 text-blue-500 flex-shrink-0" />}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {!drawerIsEdit && (
                  <div className={`p-4 rounded-xl text-sm ${
                    drawerMode?.includes('moderator') ? 'bg-blue-50 text-blue-800 border border-blue-100' :
                    drawerMode?.includes('admin') ? 'bg-amber-50 text-amber-800 border border-amber-100' :
                    'bg-gray-50 text-gray-700 border border-gray-100'
                  }`}>
                    {drawerMode === 'add-installer' && 'A temporary password will be generated and emailed to the partner. They will complete full account setup on first login.'}
                    {drawerMode === 'add-admin' && 'A temporary password will be generated and shown to you once. Make sure to save it before closing.'}
                    {drawerMode === 'add-moderator' && 'A welcome email with login credentials and their assigned permissions will be sent to the moderator.'}
                  </div>
                )}
              </form>
            </div>

            <div className="px-6 py-5 border-t border-gray-100 flex gap-3">
              <button
                type="submit"
                form="user-form"
                disabled={submitting}
                className={`flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50 ${
                  drawerMode?.includes('moderator') ? 'bg-blue-600 hover:bg-blue-700' :
                  drawerMode?.includes('admin') ? 'bg-[#1e293b] hover:bg-[#2d3f55]' :
                  'bg-[#28AA48] hover:bg-[#239940]'
                }`}
              >
                {submitting
                  ? (drawerIsEdit ? 'Saving...' : 'Creating...')
                  : (drawerIsEdit ? 'Save Changes' : 'Create Account')}
              </button>
              <button
                type="button"
                onClick={closeDrawer}
                className="px-5 py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function FormField({ label, icon, required, children }: { label: string; icon?: React.ReactNode; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
        {icon && <span className="text-gray-400">{icon}</span>}
        {label}
        {required && <span className="text-red-400">*</span>}
      </label>
      {children}
    </div>
  );
}

function InstallerCard({ user, onEdit, onResetPassword, onReset2FA, onDelete }: {
  user: InstallerUser;
  onEdit: () => void;
  onResetPassword: () => void;
  onReset2FA: () => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const calcs = user.allowed_calculators && user.allowed_calculators.length > 0
    ? user.allowed_calculators
    : ALL_CALCULATORS.map(c => c.key);

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 hover:border-gray-200 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-[#28AA48]/10 flex items-center justify-center flex-shrink-0">
            <span className="text-[#28AA48] font-bold text-base">
              {user.full_name?.charAt(0)?.toUpperCase() || '?'}
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-[#1e293b] text-sm">{user.full_name}</p>
              {user.needs_password_reset ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-100">
                  Needs Reset
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                  Active
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                {user.company_name}
              </span>
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Mail className="w-3 h-3" />
                {user.email}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="hidden sm:flex items-center gap-1.5">
            {calcs.map(k => (
              <span key={k} className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-[#28AA48]/10 text-[#28AA48]">
                {CALC_LABELS[k] || k}
              </span>
            ))}
          </div>
          <span className="text-xs text-gray-400 hidden md:block">
            {new Date(user.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: '2-digit' })}
          </span>
          <div className="relative">
            <button
              onClick={() => setMenuOpen(p => !p)}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-9 z-20 bg-white rounded-xl shadow-lg border border-gray-100 w-44 py-1.5 overflow-hidden">
                  <MenuAction icon={<Pencil className="w-3.5 h-3.5" />} label="Edit" onClick={() => { onEdit(); setMenuOpen(false); }} />
                  <MenuAction icon={<RotateCcw className="w-3.5 h-3.5" />} label="Reset Password" onClick={() => { onResetPassword(); setMenuOpen(false); }} />
                  <MenuAction icon={<ShieldOff className="w-3.5 h-3.5" />} label="Reset 2FA" onClick={() => { onReset2FA(); setMenuOpen(false); }} />
                  <div className="h-px bg-gray-100 my-1" />
                  <MenuAction icon={<Trash2 className="w-3.5 h-3.5" />} label="Delete" onClick={() => { onDelete(); setMenuOpen(false); }} danger />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminCard({ user, currentAdminId, isSuperAdmin, onEdit, onResetPassword, onReset2FA, onDelete }: {
  user: AdminUser;
  currentAdminId?: string;
  isSuperAdmin: boolean;
  onEdit: () => void;
  onResetPassword: () => void;
  onReset2FA: () => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showPerms, setShowPerms] = useState(false);
  const canDelete = user.id !== currentAdminId && (isSuperAdmin || user.role === 'moderator');
  const isMod = user.role === 'moderator';

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 hover:border-gray-200 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${isMod ? 'bg-blue-50' : 'bg-slate-100'}`}>
            <span className={`font-bold text-base ${isMod ? 'text-blue-600' : 'text-slate-600'}`}>
              {user.full_name?.charAt(0)?.toUpperCase() || '?'}
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-[#1e293b] text-sm">{user.full_name}</p>
              {user.is_super_admin && (
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-100">
                  <Shield className="w-2.5 h-2.5" /> Super Admin
                </span>
              )}
              {isMod && (
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                  <UserCheck className="w-2.5 h-2.5" /> Moderator
                </span>
              )}
              {user.needs_password_reset && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-100">
                  Needs Reset
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Mail className="w-3 h-3" />
                {user.email}
              </span>
              {user.company_name && (
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  {user.company_name}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {isMod && user.permissions && user.permissions.length > 0 && (
            <button
              onClick={() => setShowPerms(p => !p)}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-gray-500 hover:bg-gray-100 transition-colors font-medium"
            >
              {showPerms ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {user.permissions.length} permissions
            </button>
          )}
          <span className="text-xs text-gray-400 hidden md:block">
            {new Date(user.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: '2-digit' })}
          </span>
          <div className="relative">
            <button
              onClick={() => setMenuOpen(p => !p)}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-9 z-20 bg-white rounded-xl shadow-lg border border-gray-100 w-44 py-1.5 overflow-hidden">
                  <MenuAction icon={<Pencil className="w-3.5 h-3.5" />} label="Edit" onClick={() => { onEdit(); setMenuOpen(false); }} />
                  <MenuAction icon={<RotateCcw className="w-3.5 h-3.5" />} label="Reset Password" onClick={() => { onResetPassword(); setMenuOpen(false); }} />
                  <MenuAction icon={<ShieldOff className="w-3.5 h-3.5" />} label="Reset 2FA" onClick={() => { onReset2FA(); setMenuOpen(false); }} />
                  {canDelete && (
                    <>
                      <div className="h-px bg-gray-100 my-1" />
                      <MenuAction icon={<Trash2 className="w-3.5 h-3.5" />} label="Delete" onClick={() => { onDelete(); setMenuOpen(false); }} danger />
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {isMod && showPerms && user.permissions && user.permissions.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Page Access</p>
          <div className="flex flex-wrap gap-1.5">
            {user.permissions.map(p => {
              const perm = ALL_PERMISSIONS.find(pp => pp.key === p);
              return (
                <span key={p} className="px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                  {perm?.label || p}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function MenuAction({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-colors ${
        danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-50'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
