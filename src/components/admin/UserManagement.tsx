import React, { useState, useEffect } from 'react';
import { UserPlus, Users, Mail, Building2, Trash2, AlertCircle, Edit2, RotateCcw } from 'lucide-react';
import { supabase } from '../../lib/supabase';

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
}

export function UserManagement() {
  const [users, setUsers] = useState<InstallerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'installers' | 'admins'>('installers');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState<InstallerUser | null>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    companyName: '',
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      setLoading(true);

      const { data: installerUsers, error: installerError } = await supabase
        .from('installer_users')
        .select('*')
        .order('created_at', { ascending: false });

      if (installerError) {
        console.error('Error loading installer users:', installerError);
        throw installerError;
      }

      const { data: adminUsersData, error: adminError } = await supabase
        .from('admin_users')
        .select('id, email, first_name, last_name, company, phone, created_at, needs_password_reset')
        .order('created_at', { ascending: false });

      if (adminError) {
        console.error('Error loading admin users:', adminError);
        throw adminError;
      }

      const adminUsers = (adminUsersData || []).map(user => ({
        id: user.id,
        full_name: [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email?.split('@')[0] || 'Admin',
        first_name: user.first_name,
        last_name: user.last_name,
        company_name: user.company || 'Angle Finance',
        phone: user.phone,
        email: user.email || '',
        needs_password_reset: user.needs_password_reset || false,
        created_at: user.created_at,
        application_count: 0,
        quote_count: 0,
        user_type: 'admin' as const,
      }));

      const installerUsersWithType = (installerUsers || []).map(user => ({
        ...user,
        user_type: 'installer' as const,
      }));

      const allUsers = [...adminUsers, ...installerUsersWithType];
      setUsers(allUsers);
    } catch (error: any) {
      console.error('Error loading users:', error);
      setError(error.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  function generatePassword() {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const temporaryPassword = generatePassword();

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: temporaryPassword,
        options: {
          emailRedirectTo: undefined,
          data: {
            full_name: formData.fullName,
            company_name: formData.companyName,
            needs_password_reset: true,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create user');

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-welcome-email`;
      const headers = {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      };

      const emailResponse = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email: formData.email,
          fullName: formData.fullName,
          companyName: formData.companyName,
          temporaryPassword,
        }),
      });

      const emailData = await emailResponse.json();

      if (!emailResponse.ok) {
        console.error('Failed to send welcome email:', emailData);
        setError(`User created but email failed to send: ${emailData.error || 'Unknown error'}. Temporary password: ${temporaryPassword}`);
        setFormData({ fullName: '', companyName: '', email: '', firstName: '', lastName: '', phone: '' });
        setShowAddForm(false);
        loadUsers();
        return;
      }

      setSuccess(`User created successfully! Welcome email sent to ${formData.email}`);
      setFormData({ fullName: '', companyName: '', email: '', firstName: '', lastName: '', phone: '' });
      setShowAddForm(false);
      loadUsers();
    } catch (error: any) {
      console.error('Error creating user:', error);
      setError(error.message || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteUser(userId: string) {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users?action=delete`;
      const headers = {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete user');

      setSuccess('User deleted successfully');
      loadUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      setError(error.message || 'Failed to delete user');
    }
  }

  async function handleEditUser(user: InstallerUser) {
    setEditingUser(user);
    const isAdmin = user.user_type === 'admin';
    setFormData({
      fullName: user.full_name,
      companyName: user.company_name,
      email: user.email,
      firstName: isAdmin ? (user.first_name || '') : '',
      lastName: isAdmin ? (user.last_name || '') : '',
      phone: isAdmin ? (user.phone || '') : '',
    });
    setShowAddForm(true);
  }

  async function handleUpdateUser(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users?action=update`;
      const headers = {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      };

      const isAdmin = editingUser!.user_type === 'admin';
      const bodyData: any = {
        userId: editingUser!.id,
        email: formData.email,
        userType: editingUser!.user_type,
      };

      if (isAdmin) {
        bodyData.firstName = formData.firstName;
        bodyData.lastName = formData.lastName;
        bodyData.companyName = formData.companyName;
        bodyData.phone = formData.phone;
      } else {
        bodyData.fullName = formData.fullName;
        bodyData.companyName = formData.companyName;
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(bodyData),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update user');

      setSuccess('User updated successfully!');
      setFormData({ fullName: '', companyName: '', email: '', firstName: '', lastName: '', phone: '' });
      setShowAddForm(false);
      setEditingUser(null);
      loadUsers();
    } catch (error: any) {
      console.error('Error updating user:', error);
      setError(error.message || 'Failed to update user');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetPassword(userId: string, userType?: 'admin' | 'installer') {
    const isAdmin = userType === 'admin';
    const confirmMessage = isAdmin
      ? 'Are you sure you want to reset the password for this admin user? A new password will be generated.'
      : 'Are you sure you want to force a password reset for this user?';

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users?action=reset-password`;
      const headers = {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ userId, userType }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to reset password');

      if (isAdmin && data.newPassword) {
        const passwordMessage = `New password generated:\n\n${data.newPassword}\n\nPlease save this password securely. It will not be shown again.`;
        alert(passwordMessage);
        setSuccess('Admin password reset successfully. New password has been displayed.');
      } else {
        setSuccess('Password reset successfully. An email with the new temporary password has been sent to the user.');
      }

      loadUsers();
    } catch (error: any) {
      console.error('Error resetting password:', error);
      setError(error.message || 'Failed to reset password');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading users...</div>
      </div>
    );
  }

  const filteredUsers = users.filter(user => {
    if (activeTab === 'installers') {
      return user.user_type === 'installer' || !user.user_type;
    } else {
      return user.user_type === 'admin';
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-green-600" />
          <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
        </div>
        {activeTab === 'installers' && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <UserPlus className="w-5 h-5" />
            Add New User
          </button>
        )}
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('installers')}
            className={`${
              activeTab === 'installers'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
          >
            Installer Users ({users.filter(u => u.user_type === 'installer' || !u.user_type).length})
          </button>
          <button
            onClick={() => setActiveTab('admins')}
            className={`${
              activeTab === 'admins'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
          >
            Admin Users ({users.filter(u => u.user_type === 'admin').length})
          </button>
        </nav>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {showAddForm && (
        <form onSubmit={editingUser ? handleUpdateUser : handleSubmit} className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingUser ? (editingUser.user_type === 'admin' ? 'Edit Admin' : 'Edit Installer') : 'Add New Installer'}
          </h3>

          <div className="space-y-4">
            {editingUser?.user_type === 'admin' ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Smith"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company
                  </label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Angle Finance"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="+61 400 000 000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="admin@anglefinance.com.au"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="John Smith"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Solar Company Pty Ltd"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="john@solarcompany.com.au"
                  />
                </div>
              </>
            )}

            {!editingUser && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> A temporary password will be automatically generated and emailed to the user.
                  They will be required to reset their password upon first login.
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (editingUser ? 'Updating...' : 'Creating...') : (editingUser ? 'Update User' : 'Create User')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingUser(null);
                  setFormData({ fullName: '', companyName: '', email: '', firstName: '', lastName: '', phone: '' });
                  setError(null);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {activeTab === 'admins' ? 'Role' : 'Company'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                {activeTab === 'installers' && (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quotes
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Submissions
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={activeTab === 'installers' ? 8 : 5} className="px-6 py-8 text-center text-gray-500">
                    {activeTab === 'installers'
                      ? 'No installer users found. Add your first installer user to get started.'
                      : 'No admin users found.'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isAdmin = user.user_type === 'admin';
                  return (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{user.full_name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isAdmin ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Administrator
                          </span>
                        ) : (
                          <div className="flex items-center gap-2 text-gray-700">
                            <Building2 className="w-4 h-4 text-gray-400" />
                            {user.company_name}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-gray-700">
                          <Mail className="w-4 h-4 text-gray-400" />
                          {user.email}
                        </div>
                      </td>
                      {activeTab === 'installers' && (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {user.quote_count || 0}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {user.application_count || 0}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {user.needs_password_reset ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                Needs Password Reset
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                Active
                              </span>
                            )}
                          </td>
                        </>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditUser(user)}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                            title="Edit user"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleResetPassword(user.id, user.user_type)}
                            className="text-orange-600 hover:text-orange-800 transition-colors"
                            title={isAdmin ? 'Reset admin password' : 'Force password reset'}
                          >
                            <RotateCcw className="w-5 h-5" />
                          </button>
                          {!isAdmin && (
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="text-red-600 hover:text-red-800 transition-colors"
                              title="Delete user"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
