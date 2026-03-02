import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';

export function InstallerLogin() {
  const navigate = useNavigate();
  const { user, installerProfile, loading, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user && installerProfile) {
      if (installerProfile.needs_password_reset) {
        navigate('/reset-password', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, installerProfile, loading, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await signIn(email, password);
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Invalid email or password');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <Layout showHeader={false}>
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="text-gray-600">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout showHeader={false}>
      <div className="min-h-screen flex items-center justify-center bg-white px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
            <div className="bg-white px-8 py-10 text-center border-b border-gray-200">
              <img
                src="/image copy.png"
                alt="Green Funding"
                className="h-12 mx-auto mb-6"
              />
              <h1 className="text-2xl font-bold text-[#3A475B] mb-2">Green Funding Installer Portal</h1>
              <p className="text-gray-600 text-sm">Sign in to access the financing portal</p>
            </div>

            <form onSubmit={handleSubmit} className="px-8 py-8 space-y-6">
              {error && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                  placeholder="your@email.com"
                  autoComplete="email"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-gradient-to-r from-[#6EAE3C] to-[#8BC83F] text-white font-semibold py-3 px-4 rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <div className="px-8 py-6 bg-gray-50 border-t border-gray-100">
              <p className="text-center text-sm text-gray-600">
                Need access? Contact your administrator to create an account.
              </p>
            </div>
          </div>

          <div className="text-center mt-6 text-sm text-gray-600">
            <a href="/admin/login" className="text-[#6EAE3C] hover:underline font-medium">
              Admin Login
            </a>
          </div>
        </div>
      </div>
    </Layout>
  );
}
