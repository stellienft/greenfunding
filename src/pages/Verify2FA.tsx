import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, AlertCircle } from 'lucide-react';
import { Layout } from '../components/Layout';
import { useAuth } from '../context/AuthContext';

export function Verify2FA() {
  const navigate = useNavigate();
  const { user, installerProfile, completeTotpVerification, signOut } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!user || !installerProfile) {
    navigate('/login', { replace: true });
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/totp`;
      const res = await fetch(`${baseUrl}/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id, userType: 'installer', code }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Invalid code');
      completeTotpVerification();
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout showHeader={false}>
      <div className="min-h-screen flex items-center justify-center bg-white px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 space-y-6">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: '#6EAE3C20' }}>
                  <Shield className="w-8 h-8 text-[#6EAE3C]" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-[#3A475B] mb-2">Two-Factor Authentication</h2>
              <p className="text-gray-600 text-sm">Enter the 6-digit code from your authenticator app</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Verification Code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-2xl font-mono tracking-widest focus:ring-2 focus:ring-[#6EAE3C] focus:border-[#6EAE3C] outline-none"
                  autoFocus
                  required
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="w-full py-3 px-4 bg-gradient-to-r from-[#6EAE3C] to-[#8BC83F] text-white font-semibold rounded-lg transition-all hover:shadow-lg disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify'}
              </button>
            </form>

            <div className="text-center">
              <button
                onClick={() => signOut()}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Sign out and use a different account
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
