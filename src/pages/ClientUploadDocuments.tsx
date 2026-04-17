import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Upload, CheckCircle2, FileText, X, Loader, ExternalLink, AlertCircle, PartyPopper
} from 'lucide-react';

interface QuoteInfo {
  id: string;
  quote_number: number;
  recipient_name: string | null;
  recipient_company: string | null;
  recipient_email: string | null;
  project_cost: number;
  has_access_code: boolean;
}

interface UploadRecord {
  id: string;
  document_type: string;
  file_name: string;
  uploaded_at: string;
}

interface DocField {
  key: string;
  label: string;
  hint?: string;
  url?: string;
  urlLabel?: string;
  required: boolean;
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

function formatQuoteNumber(n: number): string {
  return '#' + String(n).padStart(6, '0');
}

function getDocFields(projectCost: number): DocField[] {
  if (projectCost >= 250000) {
    return [
      { key: 'financials', label: 'FY24 & FY25 Accountant Prepared Financials', required: true },
      { key: 'mgt_financials', label: 'Mgt YTD Dec 25 Financials', required: true },
      { key: 'finance_commitment', label: 'Finance Commitment Schedule', required: true },
      { key: 'ato_statement', label: 'Current ATO Portal Statement', required: true },
      { key: 'business_overview', label: 'Business Overview and Major Clients', required: true },
      { key: 'asset_liability', label: 'Asset and Liability Statement', required: true },
      ...(projectCost >= 500000 ? [{ key: 'aged_debtors', label: 'Aged Debtors and Creditors', required: true }] : []),
      ...(projectCost >= 1000000 ? [{ key: 'cashflow', label: 'Cashflow Projections', required: true }] : []),
    ];
  }
  const base: DocField[] = [
    { key: 'directors_licence', label: "Director's Drivers Licence", required: true },
    { key: 'medicare_card', label: "Director's Medicare Card", required: true },
    {
      key: 'privacy_consent',
      label: 'Privacy Consent (signed)',
      hint: 'Download, sign and upload',
      url: 'https://drive.google.com/file/d/1aIw8H6qgvCcVIULRiVsanfKR38jWTOHN/view',
      urlLabel: 'Download form',
      required: true,
    },
    {
      key: 'asset_liability',
      label: 'Asset and Liability Statement (signed)',
      hint: 'Download, complete and upload',
      url: 'https://drive.google.com/file/d/1RwQ-npssPkEN6bW_wDV3e5Gr0w3IpOgm/view',
      urlLabel: 'Download form',
      required: true,
    },
  ];
  if (projectCost >= 150000) {
    base.splice(2, 0, {
      key: 'bank_statements',
      label: '6 Months Business Bank Statements',
      hint: 'You can submit securely via the link below',
      url: 'https://scv.bankstatements.com.au/HSHV',
      urlLabel: 'Submit bank statements securely',
      required: true,
    });
  }
  return base;
}

function getTierLabel(projectCost: number): string {
  if (projectCost < 150000) return 'Low Doc — up to $150,000';
  if (projectCost < 250000) return 'Low Doc — $150,000 to $250,000';
  if (projectCost < 500000) return 'Full Doc — $250,000 to $500,000';
  if (projectCost < 1000000) return 'Full Doc — $500,000 to $1,000,000';
  return 'Full Doc — $1,000,000+';
}

export function ClientUploadDocuments() {
  const { token } = useParams<{ token: string }>();
  const [quote, setQuote] = useState<QuoteInfo | null>(null);
  const [uploads, setUploads] = useState<UploadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [nameInput, setNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [abnInput, setAbnInput] = useState('');
  const [businessNatureInput, setBusinessNatureInput] = useState('');
  const [companyAddressInput, setCompanyAddressInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginError, setLoginError] = useState('');

  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [localUploaded, setLocalUploaded] = useState<Record<string, string>>({});
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completionModalShown, setCompletionModalShown] = useState(false);

  useEffect(() => {
    if (token) loadQuote();
  }, [token]);

  async function loadQuote() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/quote-upload/verify?token=${token}`,
        { headers: { 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` } }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Invalid link');
      setQuote(json.quote);
      setUploads(json.uploads || []);
    } catch (err: any) {
      setError(err.message || 'Could not load this page. The link may be invalid or expired.');
    } finally {
      setLoading(false);
    }
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!quote) return;

    if (!nameInput.trim()) { setLoginError('Client name is required.'); return; }
    if (!emailInput.trim()) { setLoginError('Email address is required.'); return; }
    if (!phoneInput.trim()) { setLoginError('Phone number is required.'); return; }
    if (!abnInput.trim()) { setLoginError('ABN is required.'); return; }
    if (!businessNatureInput.trim()) { setLoginError('Nature of business is required.'); return; }
    if (!companyAddressInput.trim()) { setLoginError('Company address is required.'); return; }

    const expectedEmail = (quote.recipient_email || '').toLowerCase().trim();
    const emailMatch = !expectedEmail || emailInput.trim().toLowerCase() === expectedEmail;
    if (!emailMatch) {
      setLoginError('Email address does not match our records. Please enter the email address used when the quote was generated.');
      return;
    }
    if (quote.has_access_code && codeInput.trim() === '') {
      setLoginError('Please enter the access code from your email.');
      return;
    }
    setLoggedIn(true);
    setLoginError('');
  }

  async function handleUpload(docKey: string, file: File) {
    if (!token) return;
    setUploading(prev => ({ ...prev, [docKey]: true }));
    try {
      const formData = new FormData();
      formData.append('token', token);
      formData.append('documentType', docKey);
      formData.append('file', file);
      if (codeInput.trim()) formData.append('accessCode', codeInput.trim());

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/quote-upload/submit`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
          body: formData,
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Upload failed');
      setLocalUploaded(prev => ({ ...prev, [docKey]: file.name }));
      setUploads(prev => [...prev, { id: Date.now().toString(), document_type: docKey, file_name: file.name, uploaded_at: new Date().toISOString() }]);
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setUploading(prev => ({ ...prev, [docKey]: false }));
    }
  }

  function isUploaded(docKey: string): string | null {
    const found = uploads.find(u => u.document_type === docKey);
    return found ? found.file_name : null;
  }

  const allDone = quote && getDocFields(quote.project_cost).every(f => isUploaded(f.key));

  useEffect(() => {
    if (allDone && loggedIn && !completionModalShown) {
      setShowCompletionModal(true);
      setCompletionModalShown(true);
    }
  }, [allDone, loggedIn]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-[#28AA48]" />
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-10 text-center">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-[#3A475B] mb-2">Link Invalid or Expired</h1>
          <p className="text-gray-500 text-sm mb-6">{error || 'This link is no longer valid.'}</p>
          <p className="text-sm text-gray-500">
            Please contact us at{' '}
            <a href="mailto:solutions@greenfunding.com.au" className="text-[#28AA48] font-medium hover:underline">
              solutions@greenfunding.com.au
            </a>
          </p>
        </div>
      </div>
    );
  }

  const docFields = getDocFields(quote.project_cost);

  return (
    <div className="min-h-screen bg-gray-50">
      <div style={{ background: 'linear-gradient(135deg, #1a2e3b 0%, #2D3A4A 100%)' }} className="px-4 py-5">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <img src="/green-funding-invertedlogo.svg" alt="Green Funding" className="h-7" />
          <div className="text-right">
            <p className="text-white/50 text-xs">Low Doc Requirements Client Portal</p>
            <p className="text-white font-bold text-sm">{formatQuoteNumber(quote.quote_number)}</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {!loggedIn ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-8 py-8">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: 'linear-gradient(135deg, #34AC48, #AFD235)' }}>
                <Upload className="w-7 h-7 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-[#3A475B] text-center mb-2">Low Doc Requirements Client Portal</h1>
              <p className="text-gray-500 text-sm text-center mb-8">
                Please complete your details below to securely access your document upload portal for quote {formatQuoteNumber(quote.quote_number)}.
              </p>
              <form onSubmit={handleLogin} className="space-y-4 max-w-sm mx-auto">
                <div>
                  <label className="block text-sm font-semibold text-[#3A475B] mb-1.5">Client Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    placeholder="Your full name"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#28AA48]/30 focus:border-[#28AA48]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#3A475B] mb-1.5">Email Address <span className="text-red-500">*</span></label>
                  <input
                    type="email"
                    value={emailInput}
                    onChange={e => setEmailInput(e.target.value)}
                    placeholder="Your email address"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#28AA48]/30 focus:border-[#28AA48]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#3A475B] mb-1.5">Phone Number <span className="text-red-500">*</span></label>
                  <input
                    type="tel"
                    value={phoneInput}
                    onChange={e => setPhoneInput(e.target.value)}
                    placeholder="Your phone number"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#28AA48]/30 focus:border-[#28AA48]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#3A475B] mb-1.5">ABN <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={abnInput}
                    onChange={e => setAbnInput(e.target.value)}
                    placeholder="Australian Business Number"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#28AA48]/30 focus:border-[#28AA48]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#3A475B] mb-1.5">Nature of Business <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={businessNatureInput}
                    onChange={e => setBusinessNatureInput(e.target.value)}
                    placeholder="e.g. Solar installation, HVAC, Electrical"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#28AA48]/30 focus:border-[#28AA48]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#3A475B] mb-1.5">Company Address <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={companyAddressInput}
                    onChange={e => setCompanyAddressInput(e.target.value)}
                    placeholder="Your registered business address"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#28AA48]/30 focus:border-[#28AA48]"
                    required
                  />
                </div>
                {quote?.has_access_code && (
                  <div>
                    <label className="block text-sm font-semibold text-[#3A475B] mb-1.5">Access Code <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={codeInput}
                      onChange={e => setCodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="6-digit code from your email"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#28AA48]/30 focus:border-[#28AA48] tracking-widest font-mono text-center text-lg"
                      maxLength={6}
                      required
                    />
                    <p className="text-xs text-gray-400 mt-1.5 text-center">Check your email for the 6-digit access code</p>
                  </div>
                )}
                {loginError && <p className="text-xs text-red-600 text-center">{loginError}</p>}
                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-[#34AC48] to-[#AFD235] text-white font-bold rounded-xl hover:shadow-md transition-all text-sm"
                >
                  Access My Upload Portal
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Your Application</p>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-bold text-[#3A475B] text-lg">{quote.recipient_company || quote.recipient_name}</p>
                    {quote.recipient_name && quote.recipient_company && (
                      <p className="text-gray-500 text-sm mt-0.5">{quote.recipient_name}</p>
                    )}
                    <p className="text-sm text-gray-500 mt-1">Project Cost: <span className="font-semibold text-[#3A475B]">{formatCurrency(quote.project_cost)}</span></p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-gray-400">Quote</p>
                    <p className="font-bold text-[#28AA48]">{formatQuoteNumber(quote.quote_number)}</p>
                    <span className="inline-block mt-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">{getTierLabel(quote.project_cost)}</span>
                  </div>
                </div>
              </div>

              {allDone && (
                <div className="mx-6 mt-5 px-4 py-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#28AA48] flex-shrink-0" />
                  <p className="text-sm font-semibold text-green-800">All documents uploaded! Our team will be in touch shortly.</p>
                </div>
              )}

              <div className="px-6 py-5 space-y-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Required Documents</p>
                {docFields.map(field => {
                  const uploaded = isUploaded(field.key);
                  const isUploading = uploading[field.key];
                  const inputId = `upload-${field.key}`;

                  return (
                    <div key={field.key} className={`rounded-xl border p-4 transition-all ${uploaded ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            {uploaded
                              ? <CheckCircle2 className="w-4 h-4 text-[#28AA48] flex-shrink-0" />
                              : <div className="w-4 h-4 rounded-full border-2 border-gray-300 flex-shrink-0" />
                            }
                            <p className="text-sm font-semibold text-[#3A475B]">{field.label}</p>
                          </div>
                          {field.hint && <p className="text-xs text-gray-500 ml-6 mb-1">{field.hint}</p>}
                          {field.url && (
                            <a
                              href={field.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-6 inline-flex items-center gap-1 text-xs text-[#28AA48] font-medium hover:underline"
                            >
                              {field.urlLabel || 'Open link'} <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                          {uploaded && (
                            <p className="text-xs text-green-700 ml-6 mt-1 flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              {uploaded}
                            </p>
                          )}
                        </div>
                        <div className="flex-shrink-0">
                          {uploaded ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
                              <CheckCircle2 className="w-3 h-3" /> Uploaded
                            </span>
                          ) : (
                            <label htmlFor={inputId} className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-gradient-to-r from-[#34AC48] to-[#AFD235] px-3 py-1.5 rounded-lg cursor-pointer hover:shadow-sm transition-all">
                              {isUploading ? <Loader className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                              {isUploading ? 'Uploading…' : 'Upload'}
                              <input
                                id={inputId}
                                type="file"
                                className="hidden"
                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                disabled={isUploading}
                                onChange={e => {
                                  const file = e.target.files?.[0];
                                  if (file) handleUpload(field.key, file);
                                }}
                              />
                            </label>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 px-6 py-5">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Need Help?</p>
              <p className="text-sm text-gray-600 mb-3">Our team is here to assist you throughout the application process.</p>
              <div className="space-y-1.5">
                <p className="text-sm text-gray-500"><span className="font-medium text-[#3A475B]">Email:</span>{' '}
                  <a href="mailto:solutions@greenfunding.com.au" className="text-[#28AA48] hover:underline">solutions@greenfunding.com.au</a>
                </p>
                <p className="text-sm text-gray-500"><span className="font-medium text-[#3A475B]">Phone:</span>{' '}
                  <a href="tel:1300403100" className="text-[#28AA48] hover:underline">1300 403 100</a>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {showCompletionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center relative animate-fade-in">
            <button
              onClick={() => setShowCompletionModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: 'linear-gradient(135deg, #34AC48, #AFD235)' }}>
              <PartyPopper className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-[#3A475B] mb-3">Documents Submitted!</h2>
            <p className="text-gray-500 text-sm leading-relaxed mb-6">
              Thank you for uploading your required documents. You can now close this page and we will be in contact with you soon.
            </p>
            <button
              onClick={() => setShowCompletionModal(false)}
              className="w-full py-3 bg-gradient-to-r from-[#34AC48] to-[#AFD235] text-white font-bold rounded-xl hover:shadow-md transition-all text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
