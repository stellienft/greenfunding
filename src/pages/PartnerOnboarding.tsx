import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { TwoFactorSetup } from '../components/TwoFactorSetup';
import {
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  User,
  Building2,
  Phone,
  Upload,
  Image as ImageIcon,
  Shield,
  ArrowRight,
  Lock,
  Sparkles,
} from 'lucide-react';

type Step = 'welcome' | 'password' | 'details' | 'logo' | 'security' | 'done';

const STEPS: Step[] = ['welcome', 'password', 'details', 'logo', 'security', 'done'];

function StepIndicator({ current }: { current: Step }) {
  const stepsConfig = [
    { key: 'password', label: 'Password' },
    { key: 'details', label: 'Your Details' },
    { key: 'logo', label: 'Company Logo' },
    { key: 'security', label: 'Security' },
  ];

  const activeIndex = stepsConfig.findIndex(s => s.key === current);

  if (current === 'welcome' || current === 'done') return null;

  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {stepsConfig.map((s, i) => {
        const isCompleted = i < activeIndex;
        const isActive = i === activeIndex;
        return (
          <React.Fragment key={s.key}>
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  isCompleted
                    ? 'bg-[#6EAE3C] text-white'
                    : isActive
                    ? 'bg-[#3A475B] text-white ring-4 ring-[#3A475B]/20'
                    : 'bg-gray-200 text-gray-400'
                }`}
              >
                {isCompleted ? <CheckCircle className="w-4 h-4" /> : i + 1}
              </div>
              <span
                className={`text-[10px] font-medium whitespace-nowrap ${
                  isActive ? 'text-[#3A475B]' : isCompleted ? 'text-[#6EAE3C]' : 'text-gray-400'
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < stepsConfig.length - 1 && (
              <div
                className={`w-12 h-0.5 mb-5 mx-1 transition-all ${
                  i < activeIndex ? 'bg-[#6EAE3C]' : 'bg-gray-200'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function WelcomeStep({ onNext, profile }: { onNext: () => void; profile: { full_name: string; company_name: string } }) {
  return (
    <div className="text-center space-y-8">
      <div className="flex justify-center">
        <img src="/image copy.png" alt="Green Funding" className="h-12" />
      </div>

      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full text-xs font-semibold text-green-700 mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          Partner Onboarding
        </div>
        <h1 className="text-3xl font-bold text-[#3A475B] mb-3">
          Welcome to Green Funding
        </h1>
        <p className="text-gray-500 max-w-sm mx-auto leading-relaxed">
          Hi <strong className="text-[#3A475B]">{profile.full_name || 'there'}</strong>! We're thrilled to have you on board.
          Let's take a few minutes to set up your partner account.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 text-left max-w-sm mx-auto">
        {[
          { icon: <Lock className="w-4 h-4 text-[#6EAE3C]" />, label: 'Set your password' },
          { icon: <User className="w-4 h-4 text-[#6EAE3C]" />, label: 'Confirm your details' },
          { icon: <ImageIcon className="w-4 h-4 text-[#6EAE3C]" />, label: 'Upload company logo' },
          { icon: <Shield className="w-4 h-4 text-[#6EAE3C]" />, label: 'Enable two-factor auth' },
        ].map(({ icon, label }, i) => (
          <div key={i} className="flex items-center gap-2.5 p-3 bg-gray-50 rounded-xl border border-gray-100">
            <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center shadow-sm border border-gray-100 flex-shrink-0">
              {icon}
            </div>
            <span className="text-xs font-medium text-gray-700">{label}</span>
          </div>
        ))}
      </div>

      <button
        onClick={onNext}
        className="w-full py-3.5 px-6 bg-gradient-to-r from-[#6EAE3C] to-[#8BC83F] text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-green-200 transition-all flex items-center justify-center gap-2"
      >
        Get Started
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

function PasswordStep({ onNext }: { onNext: () => void }) {
  const { updatePassword } = useAuth();
  const [form, setForm] = useState({ next: '', confirm: '' });
  const [show, setShow] = useState({ next: false, confirm: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const strength = (() => {
    const p = form.next;
    if (!p) return null;
    let score = 0;
    if (p.length >= 8) score++;
    if (p.length >= 12) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    if (score <= 1) return { label: 'Weak', color: 'bg-red-400', width: 'w-1/5' };
    if (score <= 2) return { label: 'Fair', color: 'bg-yellow-400', width: 'w-2/5' };
    if (score <= 3) return { label: 'Good', color: 'bg-blue-400', width: 'w-3/5' };
    if (score <= 4) return { label: 'Strong', color: 'bg-[#6EAE3C]', width: 'w-4/5' };
    return { label: 'Very Strong', color: 'bg-[#6EAE3C]', width: 'w-full' };
  })();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (form.next.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (form.next !== form.confirm) {
      setError('Passwords do not match');
      return;
    }
    setSaving(true);
    try {
      await updatePassword(form.next);
      onNext();
    } catch (err: any) {
      setError(err.message || 'Failed to set password');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-14 h-14 bg-[#3A475B]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Lock className="w-7 h-7 text-[#3A475B]" />
        </div>
        <h2 className="text-2xl font-bold text-[#3A475B]">Set Your Password</h2>
        <p className="text-gray-500 text-sm mt-1.5">Choose a strong password to secure your account</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {(['next', 'confirm'] as const).map((field) => {
          const labels = { next: 'New Password', confirm: 'Confirm Password' };
          return (
            <div key={field}>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{labels[field]}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={show[field] ? 'text' : 'password'}
                  value={form[field]}
                  onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                  required
                  className="w-full pl-9 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6EAE3C]/30 focus:border-[#6EAE3C] bg-gray-50"
                />
                <button
                  type="button"
                  onClick={() => setShow(s => ({ ...s, [field]: !s[field] }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {show[field] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {field === 'next' && strength && (
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Strength</span>
                    <span className="font-medium text-gray-600">{strength.label}</span>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${strength.color} ${strength.width}`} />
                  </div>
                </div>
              )}
            </div>
          );
        })}

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 px-6 bg-gradient-to-r from-[#6EAE3C] to-[#8BC83F] text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-green-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
        >
          {saving ? 'Setting Password...' : 'Continue'}
          {!saving && <ArrowRight className="w-4 h-4" />}
        </button>
      </form>
    </div>
  );
}

function DetailsStep({ onNext, initialValues }: {
  onNext: () => void;
  initialValues: { full_name: string; company_name: string; phone_number: string };
}) {
  const { updateProfile } = useAuth();
  const [form, setForm] = useState(initialValues);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.full_name.trim()) {
      setError('Please enter your full name');
      return;
    }
    if (!form.company_name.trim()) {
      setError('Please enter your company name');
      return;
    }
    setSaving(true);
    try {
      await updateProfile({
        full_name: form.full_name.trim(),
        company_name: form.company_name.trim(),
        phone_number: form.phone_number.trim() || null,
      });
      onNext();
    } catch (err: any) {
      setError(err.message || 'Failed to save details');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-14 h-14 bg-[#6EAE3C]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <User className="w-7 h-7 text-[#6EAE3C]" />
        </div>
        <h2 className="text-2xl font-bold text-[#3A475B]">Your Details</h2>
        <p className="text-gray-500 text-sm mt-1.5">Confirm your name and company information</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={form.full_name}
              onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
              required
              placeholder="e.g. Jane Smith"
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6EAE3C]/30 focus:border-[#6EAE3C] bg-gray-50"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Company Name</label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={form.company_name}
              onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
              required
              placeholder="e.g. Solar Solutions Pty Ltd"
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6EAE3C]/30 focus:border-[#6EAE3C] bg-gray-50"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Phone Number <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="tel"
              value={form.phone_number}
              onChange={e => setForm(f => ({ ...f, phone_number: e.target.value }))}
              placeholder="e.g. 0412 345 678"
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6EAE3C]/30 focus:border-[#6EAE3C] bg-gray-50"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 px-6 bg-gradient-to-r from-[#6EAE3C] to-[#8BC83F] text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-green-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
        >
          {saving ? 'Saving...' : 'Continue'}
          {!saving && <ArrowRight className="w-4 h-4" />}
        </button>
      </form>
    </div>
  );
}

function LogoStep({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const { installerProfile, uploadLogo } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be under 2MB');
      return;
    }
    setError(null);
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      await uploadLogo(file);
      setUploaded(true);
    } catch (err: any) {
      setError(err.message || 'Upload failed');
      setPreview(null);
    } finally {
      setUploading(false);
    }
  }

  const logoSrc = preview || installerProfile?.logo_url;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <ImageIcon className="w-7 h-7 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-[#3A475B]">Company Logo</h2>
        <p className="text-gray-500 text-sm mt-1.5">
          Your logo appears on proposals sent to clients
        </p>
      </div>

      <div className="flex flex-col items-center gap-4">
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          className="relative w-32 h-32 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center cursor-pointer hover:border-[#6EAE3C] hover:bg-[#6EAE3C]/5 transition-all group overflow-hidden"
        >
          {logoSrc ? (
            <>
              <img src={logoSrc} alt="Company logo" className="w-full h-full object-contain p-2" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Upload className="w-6 h-6 text-white" />
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 text-gray-400 group-hover:text-[#6EAE3C] transition-colors">
              <Upload className="w-8 h-8" />
              <span className="text-xs font-medium">Upload logo</span>
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-[#6EAE3C] border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

        <div className="text-center">
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="text-sm text-[#6EAE3C] font-medium hover:underline disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : logoSrc ? 'Change logo' : 'Browse files'}
          </button>
          <p className="text-xs text-gray-400 mt-1">PNG, JPG, SVG up to 2MB</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm w-full">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {uploaded && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm w-full">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            Logo uploaded successfully
          </div>
        )}
      </div>

      <div className="space-y-2 pt-2">
        <button
          onClick={onNext}
          disabled={uploading}
          className="w-full py-3 px-6 bg-gradient-to-r from-[#6EAE3C] to-[#8BC83F] text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-green-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          Continue
          <ArrowRight className="w-4 h-4" />
        </button>
        {!logoSrc && (
          <button
            onClick={onSkip}
            className="w-full py-2.5 text-gray-500 text-sm font-medium hover:text-gray-700 transition-colors"
          >
            Skip for now
          </button>
        )}
      </div>
    </div>
  );
}

function SecurityStep({ onNext, user, profile }: {
  onNext: () => void;
  user: { id: string };
  profile: { email: string };
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-14 h-14 bg-[#3A475B]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Shield className="w-7 h-7 text-[#3A475B]" />
        </div>
        <h2 className="text-2xl font-bold text-[#3A475B]">Secure Your Account</h2>
        <p className="text-gray-500 text-sm mt-1.5">Two-factor authentication is required for all partner accounts</p>
      </div>

      <TwoFactorSetup
        userId={user.id}
        userType="installer"
        email={profile.email}
        onComplete={onNext}
        accentColor="#6EAE3C"
      />
    </div>
  );
}

function DoneStep({ onFinish, profile }: { onFinish: () => void; profile: { full_name: string; company_name: string } }) {
  return (
    <div className="text-center space-y-8">
      <div className="flex justify-center">
        <div className="relative">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-[#6EAE3C]" />
          </div>
          <div className="absolute -top-1 -right-1 w-7 h-7 bg-[#3A475B] rounded-full flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-3xl font-bold text-[#3A475B] mb-3">You're all set!</h2>
        <p className="text-gray-500 leading-relaxed max-w-sm mx-auto">
          Welcome aboard, <strong className="text-[#3A475B]">{profile.full_name}</strong>. Your{' '}
          <strong className="text-[#3A475B]">{profile.company_name}</strong> partner account is ready to go.
        </p>
      </div>

      <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 rounded-2xl p-5 text-left space-y-2.5">
        <p className="text-xs font-bold text-green-700 uppercase tracking-wider mb-3">What's next</p>
        {[
          'Generate finance proposals for your clients',
          'Track quotes and submissions from your dashboard',
          'Access multiple calculator types for different products',
        ].map((item, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <CheckCircle className="w-4 h-4 text-[#6EAE3C] flex-shrink-0 mt-0.5" />
            <span className="text-sm text-gray-700">{item}</span>
          </div>
        ))}
      </div>

      <button
        onClick={onFinish}
        className="w-full py-3.5 px-6 bg-gradient-to-r from-[#6EAE3C] to-[#8BC83F] text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-green-200 transition-all flex items-center justify-center gap-2"
      >
        Go to Dashboard
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

export function PartnerOnboarding() {
  const navigate = useNavigate();
  const { user, installerProfile, refreshProfile, completeOnboarding } = useAuth();
  const [step, setStep] = useState<Step>('welcome');

  if (!user || !installerProfile) {
    navigate('/login', { replace: true });
    return null;
  }

  async function handleSecurityComplete() {
    await refreshProfile();
    setStep('done');
  }

  async function handleFinish() {
    await completeOnboarding();
    navigate('/dashboard', { replace: true });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-green-50/30 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        {/* Progress bar at top for non-welcome/done steps */}
        {step !== 'welcome' && step !== 'done' && (
          <div className="mb-6">
            <StepIndicator current={step} />
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="p-8">
            {step === 'welcome' && (
              <WelcomeStep
                onNext={() => setStep('password')}
                profile={installerProfile}
              />
            )}
            {step === 'password' && (
              <PasswordStep onNext={() => setStep('details')} />
            )}
            {step === 'details' && (
              <DetailsStep
                onNext={() => setStep('logo')}
                initialValues={{
                  full_name: installerProfile.full_name ?? '',
                  company_name: installerProfile.company_name ?? '',
                  phone_number: installerProfile.phone_number ?? '',
                }}
              />
            )}
            {step === 'logo' && (
              <LogoStep
                onNext={() => setStep('security')}
                onSkip={() => setStep('security')}
              />
            )}
            {step === 'security' && (
              <SecurityStep
                onNext={handleSecurityComplete}
                user={user}
                profile={installerProfile}
              />
            )}
            {step === 'done' && (
              <DoneStep onFinish={handleFinish} profile={installerProfile} />
            )}
          </div>
        </div>

        {/* Small footer */}
        {step !== 'done' && (
          <p className="text-center text-xs text-gray-400 mt-4">
            Green Funding Partner Portal &mdash; Secure &amp; Encrypted
          </p>
        )}
      </div>
    </div>
  );
}
