import React, { useState } from 'react';
import { Shield, ShieldCheck, ShieldOff, AlertCircle, CheckCircle } from 'lucide-react';
import { TwoFactorSetup } from './TwoFactorSetup';

interface TwoFactorManagerProps {
  userId: string;
  userType: 'installer' | 'admin';
  email: string;
  totpEnabled: boolean;
  onStatusChange: () => void;
  accentColor?: string;
}

type View = 'status' | 'setup' | 'disable';


export function TwoFactorManager({
  userId,
  userType,
  email,
  totpEnabled,
  onStatusChange,
  accentColor = '#6EAE3C',
}: TwoFactorManagerProps) {
  const [view, setView] = useState<View>('status');
  const [disableCode, setDisableCode] = useState('');
  const [disableError, setDisableError] = useState('');
  const [disableLoading, setDisableLoading] = useState(false);
  const [disableSuccess, setDisableSuccess] = useState(false);

  const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/totp`;
  const headers = {
    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  };

  async function handleDisable(e: React.FormEvent) {
    e.preventDefault();
    setDisableError('');
    setDisableLoading(true);

    try {
      const res = await fetch(`${baseUrl}/disable`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ userId, userType, code: disableCode }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to disable 2FA');
      setDisableSuccess(true);
      setDisableCode('');
      setTimeout(() => {
        setDisableSuccess(false);
        setView('status');
        onStatusChange();
      }, 1500);
    } catch (err: any) {
      setDisableError(err.message);
    } finally {
      setDisableLoading(false);
    }
  }

  if (view === 'setup') {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <TwoFactorSetup
          userId={userId}
          userType={userType}
          email={email}
          onComplete={() => { setView('status'); onStatusChange(); }}
          accentColor={accentColor}
        />
      </div>
    );
  }

  if (view === 'disable') {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <ShieldOff className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="font-semibold text-[#3A475B]">Disable Two-Factor Authentication</h3>
            <p className="text-sm text-gray-500">Enter your current authenticator code to confirm</p>
          </div>
        </div>

        <form onSubmit={handleDisable} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Verification Code</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={disableCode}
              onChange={e => setDisableCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-xl font-mono tracking-widest focus:ring-2 focus:border-transparent outline-none"
              autoFocus
              required
            />
          </div>

          {disableError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {disableError}
            </div>
          )}

          {disableSuccess && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              Two-factor authentication disabled.
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { setView('status'); setDisableCode(''); setDisableError(''); }}
              className="flex-1 py-2 px-4 border border-gray-300 text-gray-600 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={disableLoading || disableCode.length !== 6}
              className="flex-1 py-2 px-4 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {disableLoading ? 'Disabling...' : 'Disable 2FA'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: totpEnabled ? `${accentColor}20` : '#f3f4f6' }}
          >
            {totpEnabled
              ? <ShieldCheck className="w-5 h-5" style={{ color: accentColor }} />
              : <Shield className="w-5 h-5 text-gray-400" />
            }
          </div>
          <div>
            <h3 className="font-semibold text-[#3A475B]">Two-Factor Authentication</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {totpEnabled
                ? 'Your account is protected with 2FA. You\'ll need your authenticator app to sign in.'
                : 'Add an extra layer of security to your account.'}
            </p>
            <div className="mt-2">
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                  totpEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${totpEnabled ? 'bg-green-500' : 'bg-gray-400'}`} />
                {totpEnabled ? 'Enabled' : 'Not enabled'}
              </span>
            </div>
          </div>
        </div>

        {totpEnabled ? (
          userType === 'admin' ? (
            <button
              onClick={() => setView('disable')}
              className="flex-shrink-0 px-4 py-2 border border-red-200 text-red-600 text-sm font-semibold rounded-lg hover:bg-red-50 transition-colors"
            >
              Disable
            </button>
          ) : (
            <span className="flex-shrink-0 text-xs text-gray-400 text-right max-w-[120px]">
              Contact admin to reset
            </span>
          )
        ) : (
          <button
            onClick={() => setView('setup')}
            className="flex-shrink-0 px-4 py-2 text-white text-sm font-semibold rounded-lg transition-all hover:opacity-90"
            style={{ backgroundColor: accentColor }}
          >
            Enable
          </button>
        )}
      </div>
    </div>
  );
}
