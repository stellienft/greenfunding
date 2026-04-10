import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useAdmin } from '../context/AdminContext';
import { Lock, ArrowLeft, Shield, AlertCircle } from 'lucide-react';
import { TwoFactorSetup } from '../components/TwoFactorSetup';

type LoginView = 'login' | 'reset' | 'verify2fa' | 'setup2fa';

export function AdminLogin() {
  const navigate = useNavigate();
  const { login, admin, loading: adminLoading, setAdminSession } = useAdmin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<LoginView>('login');

  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState('');

  const [pendingAdminId, setPendingAdminId] = useState('');
  const [pendingAdminEmail, setPendingAdminEmail] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [totpError, setTotpError] = useState('');
  const [totpLoading, setTotpLoading] = useState(false);

  useEffect(() => {
    if (!adminLoading && admin) {
      if (admin.needs_password_reset) {
        navigate('/admin/reset-password');
      } else {
        navigate('/admin');
      }
    }
  }, [admin, adminLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password);
      if (result.status === 'requires2fa') {
        setPendingAdminId(result.adminId);
        setView('verify2fa');
      } else if (result.status === 'setup2fa') {
        setPendingAdminId(result.adminId);
        setPendingAdminEmail(result.email);
        setView('setup2fa');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setTotpError('');
    setTotpLoading(true);

    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/totp/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: pendingAdminId, userType: 'admin', code: totpCode }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Invalid code');

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-auth/login`;
      const loginRes = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      const loginData = await loginRes.json();

      if (!loginRes.ok || loginData.error) throw new Error(loginData.error || 'Login failed');

      setAdminSession(loginData.admin);
      navigate('/admin', { replace: true });
    } catch (err: any) {
      setTotpError(err.message);
    } finally {
      setTotpLoading(false);
    }
  };

  const handleSetup2FAComplete = async () => {
    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-auth/login`;
    const loginRes = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    const loginData = await loginRes.json();
    if (loginData.admin) {
      setAdminSession(loginData.admin);
      navigate('/admin', { replace: true });
    }
  };

  const handleSetup2FASkip = async () => {
    await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/totp/mark-prompted`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId: pendingAdminId, userType: 'admin' }),
    });
    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-auth/login`;
    const loginRes = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    const loginData = await loginRes.json();
    if (loginData.admin) {
      setAdminSession(loginData.admin);
      navigate('/admin', { replace: true });
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetLoading(true);
    setResetSuccess(false);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-reset-password`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: resetEmail }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to reset password');
      }

      setResetSuccess(true);
      setResetEmail('');
    } catch (err: any) {
      setResetError(err.message || 'Failed to reset password');
    } finally {
      setResetLoading(false);
    }
  };

  if (view === 'setup2fa') {
    return (
      <Layout showHeader={false}>
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="w-full max-w-md">
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <TwoFactorSetup
                userId={pendingAdminId}
                userType="admin"
                email={pendingAdminEmail}
                onComplete={handleSetup2FAComplete}
                onSkip={handleSetup2FASkip}
                accentColor="#094325"
              />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (view === 'verify2fa') {
    return (
      <Layout showHeader={false}>
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="w-full max-w-md">
            <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 bg-[#094325]/10 rounded-full flex items-center justify-center">
                    <Shield className="w-8 h-8 text-[#094325]" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-[#3A475B] mb-2">Two-Factor Authentication</h2>
                <p className="text-gray-600 text-sm">Enter the 6-digit code from your authenticator app</p>
              </div>

              <form onSubmit={handleVerify2FA} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[#3A475B] mb-2">Verification Code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={totpCode}
                    onChange={e => setTotpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-2xl font-mono tracking-widest focus:ring-2 focus:ring-[#28AA48] focus:border-transparent"
                    autoFocus
                    required
                  />
                </div>

                {totpError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {totpError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={totpLoading || totpCode.length !== 6}
                  className="w-full px-4 py-4 bg-gradient-to-r from-[#34AC48] to-[#AFD235] text-white font-bold rounded-xl hover:shadow-xl transition-all shadow-lg text-lg disabled:opacity-50"
                >
                  {totpLoading ? 'Verifying...' : 'Verify'}
                </button>
              </form>

              <div className="text-center">
                <button
                  onClick={() => { setView('login'); setTotpCode(''); setTotpError(''); }}
                  className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Back to login
                </button>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout showHeader={false}>
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-[#094325] rounded-full flex items-center justify-center">
                <Lock className="w-8 h-8 text-white" />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-[#3A475B] text-center mb-2">
              {view === 'reset' ? 'Reset Password' : 'Admin Login'}
            </h2>
            <p className="text-gray-600 text-center mb-8">
              {view === 'reset' ? 'Enter your email to receive a temporary password' : 'Sign in to access the admin panel'}
            </p>

            {view === 'login' ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[#3A475B] mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#28AA48] focus:border-transparent"
                    placeholder="admin@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#3A475B] mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#28AA48] focus:border-transparent"
                    placeholder="Enter your password"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setView('reset')}
                    className="text-sm text-[#28AA48] hover:text-[#34AC48] font-semibold"
                  >
                    Forgot Password?
                  </button>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-4 py-4 bg-gradient-to-r from-[#34AC48] to-[#AFD235] text-white font-bold rounded-xl hover:shadow-xl transition-all shadow-lg text-lg disabled:opacity-50"
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[#3A475B] mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={e => setResetEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#28AA48] focus:border-transparent"
                    placeholder="admin@example.com"
                  />
                </div>

                {resetError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                    {resetError}
                  </div>
                )}

                {resetSuccess && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
                    Password reset email sent successfully. Check your inbox for the temporary password.
                  </div>
                )}

                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full px-4 py-4 bg-gradient-to-r from-[#34AC48] to-[#AFD235] text-white font-bold rounded-xl hover:shadow-xl transition-all shadow-lg text-lg disabled:opacity-50"
                >
                  {resetLoading ? 'Sending...' : 'Send Reset Email'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setView('login');
                    setResetError('');
                    setResetSuccess(false);
                    setResetEmail('');
                  }}
                  className="w-full px-4 py-3 text-gray-600 hover:text-[#3A475B] hover:bg-gray-50 rounded-lg transition-colors"
                >
                  Back to Login
                </button>
              </form>
            )}

            {view === 'login' && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => navigate('/login')}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 text-gray-600 hover:text-[#3A475B] hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Main Login
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
