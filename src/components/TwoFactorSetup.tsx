import React, { useState, useEffect } from 'react';
import { Shield, Copy, CheckCircle, AlertCircle, ChevronRight } from 'lucide-react';

interface TwoFactorSetupProps {
  userId: string;
  userType: 'installer' | 'admin';
  email: string;
  onComplete: () => void;
  onSkip?: () => void;
  accentColor?: string;
}

type Step = 'intro' | 'scan' | 'verify' | 'done';

export function TwoFactorSetup({ userId, userType, email, onComplete, onSkip, accentColor = '#6EAE3C' }: TwoFactorSetupProps) {
  const [step, setStep] = useState<Step>('intro');
  const [secret, setSecret] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/totp`;
  const headers = {
    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  };

  async function handleStartSetup() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${baseUrl}/generate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ userId, userType, email }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to generate 2FA secret');
      setSecret(data.secret);
      setQrCodeUrl(data.qrCodeUrl);
      setStep('scan');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${baseUrl}/confirm-setup`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ userId, userType, code }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Verification failed');
      setStep('done');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSkip() {
    setLoading(true);
    try {
      await fetch(`${baseUrl}/mark-prompted`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ userId, userType }),
      });
    } catch (_) {}
    setLoading(false);
    onSkip?.();
  }

  function copySecret() {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (step === 'intro') {
    return (
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: `${accentColor}20` }}>
            <Shield className="w-8 h-8" style={{ color: accentColor }} />
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-[#3A475B] mb-2">Secure Your Account</h2>
          <p className="text-gray-600 max-w-sm mx-auto">
            Two-factor authentication adds an extra layer of security. Each time you sign in, you'll need a code from your authenticator app.
          </p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 text-left space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: accentColor }}>1</div>
            <p className="text-sm text-gray-700">Download an authenticator app like <strong>Google Authenticator</strong> or <strong>Authy</strong></p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: accentColor }}>2</div>
            <p className="text-sm text-gray-700">Scan the QR code we'll show you next</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: accentColor }}>3</div>
            <p className="text-sm text-gray-700">Enter the 6-digit code to confirm setup</p>
          </div>
        </div>
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}
        <div className="space-y-3">
          <button
            onClick={handleStartSetup}
            disabled={loading}
            className="w-full py-3 px-4 text-white font-semibold rounded-lg transition-all hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: accentColor }}
          >
            {loading ? 'Setting up...' : 'Set Up Two-Factor Authentication'}
          </button>
          {onSkip && (
            <button
              onClick={handleSkip}
              disabled={loading}
              className="w-full py-3 px-4 text-gray-600 font-medium rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              Skip for now
            </button>
          )}
        </div>
      </div>
    );
  }

  if (step === 'scan') {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[#3A475B] mb-2">Scan QR Code</h2>
          <p className="text-gray-600 text-sm">Open your authenticator app and scan the QR code below</p>
        </div>

        <div className="flex justify-center">
          <div className="p-3 bg-white border-2 border-gray-200 rounded-xl">
            {qrCodeUrl && (
              <img src={qrCodeUrl} alt="2FA QR Code" className="w-44 h-44" />
            )}
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-2">Can't scan? Enter this key manually:</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-sm font-mono text-gray-800 break-all">{secret}</code>
            <button
              onClick={copySecret}
              className="flex-shrink-0 p-2 rounded-lg hover:bg-gray-200 transition-colors"
              title="Copy secret"
            >
              {copied ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-500" />}
            </button>
          </div>
        </div>

        <button
          onClick={() => { setStep('verify'); setCode(''); setError(''); }}
          className="w-full py-3 px-4 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-all hover:opacity-90"
          style={{ backgroundColor: accentColor }}
        >
          I've scanned the code
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  if (step === 'verify') {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[#3A475B] mb-2">Verify Setup</h2>
          <p className="text-gray-600 text-sm">Enter the 6-digit code from your authenticator app to confirm everything is working</p>
        </div>

        <form onSubmit={handleVerify} className="space-y-4">
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
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-2xl font-mono tracking-widest focus:ring-2 focus:border-transparent outline-none"
              style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
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
            className="w-full py-3 px-4 text-white font-semibold rounded-lg transition-all hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: accentColor }}
          >
            {loading ? 'Verifying...' : 'Confirm & Enable 2FA'}
          </button>

          <button
            type="button"
            onClick={() => setStep('scan')}
            className="w-full py-2 text-gray-500 hover:text-gray-700 text-sm transition-colors"
          >
            Back to QR code
          </button>
        </form>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-[#3A475B] mb-2">2FA Enabled!</h2>
          <p className="text-gray-600 text-sm max-w-sm mx-auto">
            Your account is now protected with two-factor authentication. You'll be asked for a code each time you sign in.
          </p>
        </div>
        <button
          onClick={onComplete}
          className="w-full py-3 px-4 text-white font-semibold rounded-lg transition-all hover:opacity-90"
          style={{ backgroundColor: accentColor }}
        >
          Continue to Dashboard
        </button>
      </div>
    );
  }

  return null;
}
