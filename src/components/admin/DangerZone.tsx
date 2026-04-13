import { useState } from 'react';
import { AlertTriangle, Trash2, Mail, ShieldAlert, X, CheckCircle, AlertCircle } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';

type Step = 'idle' | 'confirm1' | 'confirm2' | 'sending' | 'awaiting-code' | 'deleting' | 'done' | 'error';

export function DangerZone() {
  const { admin } = useAdmin();
  const [step, setStep] = useState<Step>('idle');
  const [code, setCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [quoteCount, setQuoteCount] = useState<number | null>(null);

  const adminEmail = admin?.email ?? '';
  const adminName = admin?.email ?? 'Admin';

  async function fetchQuoteCount() {
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-quotes`, {
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();
      setQuoteCount(data.quotes?.length ?? 0);
    } catch {
      setQuoteCount(null);
    }
  }

  function handleOpenConfirm() {
    fetchQuoteCount();
    setStep('confirm1');
    setCode('');
    setErrorMsg('');
  }

  function handleCancel() {
    setStep('idle');
    setCode('');
    setErrorMsg('');
  }

  async function handleSendCode() {
    setStep('sending');
    setErrorMsg('');
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-all-quotes`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'send-code', adminEmail, adminName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send code');
      setStep('awaiting-code');
    } catch (e: any) {
      setErrorMsg(e.message);
      setStep('confirm2');
    }
  }

  async function handleVerifyAndDelete() {
    if (!code.trim()) return;
    setStep('deleting');
    setErrorMsg('');
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-all-quotes`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'verify-and-delete', code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Deletion failed');
      setStep('done');
    } catch (e: any) {
      setErrorMsg(e.message);
      setStep('awaiting-code');
    }
  }

  return (
    <div className="bg-white border border-red-200 rounded-xl overflow-hidden">
      <div className="bg-red-50 border-b border-red-200 px-6 py-4 flex items-center gap-3">
        <ShieldAlert className="w-5 h-5 text-red-600 flex-shrink-0" />
        <div>
          <h3 className="text-sm font-bold text-red-800">Danger Zone</h3>
          <p className="text-xs text-red-600 mt-0.5">These actions are irreversible. Proceed with extreme caution.</p>
        </div>
      </div>

      <div className="px-6 py-5">
        {step === 'done' ? (
          <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-green-800">All quotes have been deleted.</p>
              <p className="text-xs text-green-700 mt-1">The system has been reset. You can now start fresh.</p>
              <button
                onClick={handleCancel}
                className="mt-3 text-xs font-medium text-green-700 underline hover:no-underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#3A475B]">Delete All Proposals</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Permanently removes every proposal from the system. This cannot be undone.
                </p>
              </div>
            </div>
            <button
              onClick={handleOpenConfirm}
              disabled={step !== 'idle'}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex-shrink-0"
            >
              <Trash2 className="w-4 h-4" />
              Delete All Proposals
            </button>
          </div>
        )}
      </div>

      {(step === 'confirm1' || step === 'confirm2' || step === 'sending' || step === 'awaiting-code' || step === 'deleting') && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-red-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-white" />
                <span className="text-white font-bold text-sm">Delete All Proposals</span>
              </div>
              <button onClick={handleCancel} className="text-white/80 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">

              {(step === 'confirm1' || step === 'confirm2') && (
                <>
                  <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-red-800">This will permanently delete all proposals.</p>
                      <p className="text-xs text-red-700 mt-1 leading-relaxed">
                        {quoteCount !== null
                          ? `There are currently ${quoteCount.toLocaleString()} proposal${quoteCount !== 1 ? 's' : ''} in the system.`
                          : 'All proposals in the system will be removed.'}
                        {' '}This action <strong>cannot be undone</strong>. There is no backup or recovery option.
                      </p>
                    </div>
                  </div>

                  <ul className="space-y-2 text-xs text-gray-600">
                    {[
                      'All sent proposals and their data will be erased',
                      'Installer proposal history will be cleared',
                      'Proposal PDFs will no longer be accessible',
                      'This will not affect applications or user accounts',
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0 mt-1.5" />
                        {item}
                      </li>
                    ))}
                  </ul>

                  {errorMsg && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {errorMsg}
                    </div>
                  )}

                  <p className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                    A 6-digit verification code will be sent to <strong>{adminEmail}</strong>. You must enter the code to confirm deletion.
                  </p>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleCancel}
                      className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSendCode}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <Mail className="w-4 h-4" />
                      Send Verification Code
                    </button>
                  </div>
                </>
              )}

              {step === 'sending' && (
                <div className="text-center py-6">
                  <div className="w-10 h-10 border-4 border-red-200 border-t-red-600 rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-sm font-semibold text-[#3A475B]">Sending verification code...</p>
                  <p className="text-xs text-gray-500 mt-1">Sending to {adminEmail}</p>
                </div>
              )}

              {(step === 'awaiting-code' || step === 'deleting') && (
                <>
                  <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <Mail className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-amber-800">Check your email</p>
                      <p className="text-xs text-amber-700 mt-0.5">
                        A 6-character code has been sent to <strong>{adminEmail}</strong>. It expires in 10 minutes.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#3A475B] mb-2 uppercase tracking-wide">
                      Verification Code
                    </label>
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      placeholder="Enter 6-character code"
                      maxLength={6}
                      disabled={step === 'deleting'}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-center text-2xl font-mono font-bold tracking-widest text-[#3A475B] focus:outline-none focus:border-red-400 disabled:opacity-50 uppercase"
                    />
                  </div>

                  {errorMsg && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {errorMsg}
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleCancel}
                      disabled={step === 'deleting'}
                      className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleVerifyAndDelete}
                      disabled={code.trim().length < 6 || step === 'deleting'}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      {step === 'deleting' ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4" />
                          Confirm & Delete All
                        </>
                      )}
                    </button>
                  </div>

                  <button
                    onClick={() => { setStep('confirm2'); setCode(''); setErrorMsg(''); }}
                    disabled={step === 'deleting'}
                    className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                  >
                    Didn't receive a code? Send again
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
