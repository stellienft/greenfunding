import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Key, AlertCircle, CheckCircle } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { Layout } from '../components/Layout';

export function AdminResetPassword() {
  const navigate = useNavigate();
  const { admin, loading, setAdminSession } = useAdmin();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !admin) {
      navigate('/admin/login');
    } else if (!loading && admin && !admin.needs_password_reset) {
      navigate('/admin');
    }
  }, [admin, loading, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-auth/change-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ adminId: admin!.id, newPassword }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to update password');

      const updatedAdmin = { ...admin!, needs_password_reset: false };
      setAdminSession(updatedAdmin);
      navigate('/admin', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Failed to update password');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <Layout showHeader={false}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-gray-600">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout showHeader={false}>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#094325]/5 to-[#28AA48]/10 px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-[#094325] to-[#28AA48] px-8 py-10 text-center">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Key className="w-8 h-8 text-[#094325]" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Create New Password</h1>
              <p className="text-white/90 text-sm">For security, please set a new admin password</p>
            </div>

            <form onSubmit={handleSubmit} className="px-8 py-8 space-y-6">
              <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-blue-600" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1">Password Reset Required</p>
                  <p>You must create a new password before accessing the admin portal.</p>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <div>
                <label htmlFor="newPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                  New Password
                </label>
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#28AA48] focus:border-[#28AA48] transition-colors"
                  placeholder="Enter new password"
                  autoComplete="new-password"
                />
                <p className="text-xs text-gray-500 mt-1">Must be at least 8 characters long</p>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                  Confirm New Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#28AA48] focus:border-[#28AA48] transition-colors"
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                />
              </div>

              {newPassword && confirmPassword && newPassword === confirmPassword && (
                <div className="flex items-center gap-2 text-green-600 text-sm">
                  <CheckCircle className="w-5 h-5" />
                  <span>Passwords match</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !newPassword || !confirmPassword}
                className="w-full bg-gradient-to-r from-[#094325] to-[#28AA48] text-white font-semibold py-3 px-4 rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Updating Password...' : 'Update Password'}
              </button>
            </form>

            <div className="px-8 py-6 bg-gray-50 border-t border-gray-100">
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Use a strong, unique password</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Include letters, numbers, and symbols</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Avoid using personal information</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
