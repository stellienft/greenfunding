import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Key, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';

export function ResetPassword() {
  const navigate = useNavigate();
  const { user, installerProfile, loading, updatePassword } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    } else if (!loading && user && installerProfile && !installerProfile.needs_password_reset) {
      navigate('/dashboard');
    }
  }, [user, installerProfile, loading, navigate]);

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
      await updatePassword(newPassword);
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Password reset error:', err);
      setError(err.message || 'Failed to update password');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <Layout showHeader={false}>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-lime-50">
          <div className="text-gray-600">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout showHeader={false}>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-lime-50 px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-[#28AA48] to-[#AFD235] px-8 py-10 text-center">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Key className="w-8 h-8 text-[#28AA48]" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Create New Password</h1>
              <p className="text-white/90 text-sm">For security, please set a new password</p>
            </div>

            <form onSubmit={handleSubmit} className="px-8 py-8 space-y-6">
              <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-blue-600" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1">First Time Login</p>
                  <p>For security reasons, you must create a new password before accessing the portal.</p>
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
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
                className="w-full bg-gradient-to-r from-[#28AA48] to-[#34AC48] text-white font-semibold py-3 px-4 rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
