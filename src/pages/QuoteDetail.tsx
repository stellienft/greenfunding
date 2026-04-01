import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { calculateAll, calculateProgressPayment } from '../calculator';
import {
  ArrowLeft, FileText, MapPin, Calendar, DollarSign, Tag, CheckCircle2,
  Upload, X, Send, Loader, Building2, ChevronDown, ChevronUp, Clock
} from 'lucide-react';

interface SentQuote {
  id: string;
  quote_number: number;
  created_at: string;
  recipient_name: string | null;
  recipient_company: string | null;
  recipient_email: string | null;
  client_phone: string | null;
  site_address: string | null;
  system_size: string | null;
  project_cost: number;
  term_options: Array<{ years: number; monthlyPayment: number; interestRate: number; totalFinanced: number }>;
  asset_names: string[];
  selected_asset_ids: string[];
  calculator_type: string;
  payment_timing: string;
  status: string;
}

interface UploadedFile {
  name: string;
  path: string;
  size: number;
}

function formatQuoteNumber(n: number) {
  return `#${String(n).padStart(6, '0')}`;
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 2 }).format(n);
}

function calcTypeLabel(t: string) {
  switch (t) {
    case 'progress_payment_rental': return 'Progress Payment Rental';
    case 'serviced_rental': return 'Serviced Rental';
    default: return 'Rental';
  }
}

async function uploadFile(file: File, prefix: string): Promise<UploadedFile> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  const { error } = await supabase.storage.from('application-documents').upload(fileName, file);
  if (error) throw error;
  return { name: file.name, path: fileName, size: file.size };
}

async function removeStorageFile(path: string) {
  await supabase.storage.from('application-documents').remove([path]);
}

function FileUploadField({
  label,
  hint,
  file,
  uploading,
  onUpload,
  onRemove,
}: {
  label: string;
  hint?: string;
  file: UploadedFile | null;
  uploading: boolean;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
}) {
  const id = `upload-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div>
      <label className="block text-sm font-semibold text-[#3A475B] mb-1">{label}</label>
      {hint && <p className="text-xs text-gray-500 mb-2">{hint}</p>}
      {file ? (
        <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
          <FileText className="w-4 h-4 text-[#28AA48] flex-shrink-0" />
          <span className="text-sm text-gray-700 flex-1 truncate">{file.name}</span>
          <button type="button" onClick={onRemove} className="text-gray-400 hover:text-red-500 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <label htmlFor={id} className="flex items-center gap-3 p-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#28AA48] hover:bg-green-50/50 transition-all">
          {uploading ? <Loader className="w-4 h-4 animate-spin text-[#28AA48]" /> : <Upload className="w-4 h-4 text-gray-400" />}
          <span className="text-sm text-gray-500">Click to upload</span>
          <input id={id} type="file" className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={onUpload} disabled={uploading} />
        </label>
      )}
    </div>
  );
}

export function QuoteDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { installerProfile, user } = useAuth();
  const { config, assets } = useApp();

  const [quote, setQuote] = useState<SentQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState<number | null>(null);

  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [businessDescription, setBusinessDescription] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [bestTime, setBestTime] = useState('');
  const [notes, setNotes] = useState('');

  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [privacyConsentFile, setPrivacyConsentFile] = useState<UploadedFile | null>(null);
  const [directorsIdFile, setDirectorsIdFile] = useState<UploadedFile | null>(null);
  const [assetLiabilityFile, setAssetLiabilityFile] = useState<UploadedFile | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (installerProfile && id) loadQuote();
  }, [installerProfile, id]);

  async function loadQuote() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sent_quotes')
        .select('*')
        .eq('id', id)
        .eq('installer_id', installerProfile!.id)
        .maybeSingle();

      if (error) throw error;
      if (!data) { setError('Quote not found'); return; }
      setQuote(data);

      if (data.recipient_name) setFullName(data.recipient_name);
      if (data.recipient_company) setCompanyName(data.recipient_company);
      if (data.recipient_email) setEmail(data.recipient_email);
      if (data.client_phone) setPhone(data.client_phone);
    } catch {
      setError('Failed to load quote');
    } finally {
      setLoading(false);
    }
  }

  const isLowDoc = (quote?.project_cost ?? 0) <= 250000;

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    try {
      const results = await Promise.all(Array.from(files).map(f => uploadFile(f, 'doc')));
      setUploadedFiles(prev => [...prev, ...results]);
    } catch { alert('Failed to upload file. Please try again.'); }
    finally { setUploading(false); }
  };

  const handlePrivacyUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    try { setPrivacyConsentFile(await uploadFile(file, 'consent')); }
    catch { alert('Failed to upload file.'); }
    finally { setUploading(false); }
  };

  const handleDirectorsIdUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    try { setDirectorsIdFile(await uploadFile(file, 'directors-id')); }
    catch { alert('Failed to upload file.'); }
    finally { setUploading(false); }
  };

  const handleAssetLiabilityUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    try { setAssetLiabilityFile(await uploadFile(file, 'asset-liability')); }
    catch { alert('Failed to upload file.'); }
    finally { setUploading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quote || !config || selectedTerm === null) { alert('Please select a loan term'); return; }
    if (!fullName || !email || !businessDescription) { alert('Please complete all required fields'); return; }
    if (!privacyConsentFile) { alert('Please upload the signed Privacy Consent Form'); return; }
    if (isLowDoc && !directorsIdFile) { alert('Please upload the Directors Drivers Licence & Medicare card'); return; }
    if (isLowDoc && !assetLiabilityFile) { alert('Please upload the Directors Asset & Liability Statement'); return; }

    setSubmitting(true);
    try {
      const assetRiskAdjustments: Record<string, number> = {};
      assets.forEach(a => { assetRiskAdjustments[a.id] = a.risk_adjustment; });

      const calcInputs = {
        projectCost: quote.project_cost,
        loanTermYears: selectedTerm,
        selectedAssetIds: quote.selected_asset_ids || [],
        assetRiskAdjustments,
        residualPercentage: undefined,
        progressPayments: undefined,
        annualMaintenanceFee: undefined,
      };

      const results = quote.calculator_type === 'progress_payment_rental'
        ? calculateProgressPayment(calcInputs, config)
        : calculateAll(calcInputs, config);

      const { data: inserted, error: insertErr } = await supabase.from('applications').insert({
        project_cost: quote.project_cost,
        loan_term_years: selectedTerm,
        selected_assets: quote.selected_asset_ids,
        calculated_monthly_repayment: results.monthlyRepayment,
        calculated_approval_amount: results.approvalAmount,
        calculated_total_repayment: results.totalRepayment,
        full_name: fullName,
        company_name: companyName,
        business_description: businessDescription,
        email,
        phone,
        best_time_to_contact: bestTime,
        notes,
        special_pricing_requested: false,
        privacy_consent_file: privacyConsentFile,
        directors_id_file: directorsIdFile,
        asset_liability_file: assetLiabilityFile,
        config_snapshot: config,
        uploaded_documents: uploadedFiles,
        installer_id: user?.id || null,
        application_fee: results.applicationFee,
        ppsr_fee: results.ppsrFee,
        invoice_amount_ex_gst: results.invoiceAmountExGst,
      }).select().single();

      if (insertErr) throw insertErr;

      await supabase.from('sent_quotes').update({ status: 'application_submitted' }).eq('id', quote.id);

      try {
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-application-email`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ applicationId: inserted.id }),
        });
      } catch { /* email failure is non-blocking */ }

      window.dispatchEvent(new Event('applicationSubmitted'));
      setSubmitted(true);
    } catch (err: any) {
      alert(`Failed to submit application: ${err.message || 'Please try again.'}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader className="w-7 h-7 animate-spin text-[#28AA48]" />
        </div>
      </Layout>
    );
  }

  if (error || !quote) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error || 'Quote not found'}</p>
            <button onClick={() => navigate('/quotes')} className="text-[#28AA48] font-semibold hover:underline text-sm">
              Back to My Quotes
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  if (submitted) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 shadow-sm p-10 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-8 h-8 text-[#28AA48]" />
            </div>
            <h2 className="text-xl font-bold text-[#3A475B] mb-2">Application Submitted</h2>
            <p className="text-gray-500 text-sm mb-8">
              Your application for <strong>{quote.recipient_company || quote.recipient_name || 'this client'}</strong> has been submitted. Our team will be in touch shortly.
            </p>
            <button
              onClick={() => navigate('/quotes')}
              className="w-full py-3 bg-gradient-to-r from-[#34AC48] to-[#AFD235] text-white font-bold rounded-xl text-sm hover:shadow-md transition-all"
            >
              Back to My Quotes
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const netCapex = quote.project_cost / 1.1;
  const alreadySubmitted = quote.status === 'application_submitted';

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-10 px-4">
        <div className="max-w-3xl mx-auto">

          <button
            onClick={() => navigate('/quotes')}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#28AA48] transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to My Quotes
          </button>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-6">
            <div className="bg-gradient-to-r from-[#34AC48] to-[#AFD235] px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-green-100 text-xs font-medium uppercase tracking-wide mb-1">
                    {calcTypeLabel(quote.calculator_type)}
                  </p>
                  <h1 className="text-white text-xl font-bold">
                    {quote.recipient_company || quote.recipient_name || 'Unnamed Client'}
                  </h1>
                  {quote.recipient_name && quote.recipient_company && (
                    <p className="text-green-100 text-sm">{quote.recipient_name}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-green-100 text-xs">Quote</p>
                  <p className="text-white font-bold text-lg">{formatQuoteNumber(quote.quote_number)}</p>
                  {alreadySubmitted && (
                    <span className="inline-block mt-1 text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">
                      Application Submitted
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-5 grid grid-cols-2 sm:grid-cols-4 gap-4 border-b border-gray-100">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Project Cost (Inc GST)</p>
                <p className="font-bold text-[#3A475B] text-sm">{formatCurrency(quote.project_cost)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Net Capex (ex GST)</p>
                <p className="font-bold text-[#3A475B] text-sm">{formatCurrency(netCapex)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Created</p>
                <p className="font-bold text-[#3A475B] text-sm flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  {new Date(quote.created_at).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Payment</p>
                <p className="font-bold text-[#3A475B] text-sm capitalize">{quote.payment_timing}</p>
              </div>
            </div>

            <div className="px-6 py-5">
              {(quote.site_address || quote.system_size || quote.recipient_email || quote.client_phone) && (
                <div className="mb-4 flex flex-wrap gap-3">
                  {quote.site_address && (
                    <span className="flex items-center gap-1.5 text-xs text-gray-600 bg-gray-50 border border-gray-200 px-2.5 py-1.5 rounded-lg">
                      <MapPin className="w-3.5 h-3.5 text-[#28AA48]" />
                      {quote.site_address}
                    </span>
                  )}
                  {quote.system_size && (
                    <span className="flex items-center gap-1.5 text-xs text-gray-600 bg-gray-50 border border-gray-200 px-2.5 py-1.5 rounded-lg">
                      <Tag className="w-3.5 h-3.5 text-[#28AA48]" />
                      {quote.system_size}
                    </span>
                  )}
                  {quote.recipient_email && (
                    <span className="flex items-center gap-1.5 text-xs text-gray-600 bg-gray-50 border border-gray-200 px-2.5 py-1.5 rounded-lg">
                      {quote.recipient_email}
                    </span>
                  )}
                  {quote.client_phone && (
                    <span className="flex items-center gap-1.5 text-xs text-gray-600 bg-gray-50 border border-gray-200 px-2.5 py-1.5 rounded-lg">
                      {quote.client_phone}
                    </span>
                  )}
                </div>
              )}

              {quote.asset_names?.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-gray-400 mb-2">Equipment</p>
                  <div className="flex flex-wrap gap-1.5">
                    {quote.asset_names.map((name, i) => (
                      <span key={i} className="inline-flex items-center gap-1 text-xs bg-gray-50 border border-gray-200 text-gray-700 px-2.5 py-1 rounded-full">
                        <Building2 className="w-3 h-3 text-gray-400" />
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs text-gray-400 mb-3">Quoted Terms</p>
                <div className="space-y-2">
                  {quote.term_options?.map((t, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-[#28AA48]" />
                        <span className="text-sm font-semibold text-[#3A475B]">{t.years} Year{t.years !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-[#28AA48]">{formatCurrency(t.monthlyPayment)}<span className="text-xs font-normal text-gray-400">/mo</span></p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {alreadySubmitted ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
              <CheckCircle2 className="w-10 h-10 text-[#28AA48] mx-auto mb-3" />
              <h3 className="font-bold text-[#3A475B] mb-1">Application Already Submitted</h3>
              <p className="text-sm text-gray-500">An application has been submitted from this quote. Our team will be in touch.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <button
                type="button"
                onClick={() => setShowForm(v => !v)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#28AA48]/10 rounded-lg flex items-center justify-center">
                    <Send className="w-4 h-4 text-[#28AA48]" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-[#3A475B] text-sm">Submit Application</p>
                    <p className="text-xs text-gray-500">Continue this quote by submitting the client's financing application</p>
                  </div>
                </div>
                {showForm ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
              </button>

              {showForm && (
                <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-6 border-t border-gray-100 pt-6">
                  <div>
                    <h3 className="text-sm font-bold text-[#3A475B] mb-3">Select Loan Term</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {quote.term_options?.map((t) => (
                        <button
                          key={t.years}
                          type="button"
                          onClick={() => setSelectedTerm(t.years)}
                          className={`p-3 rounded-lg border text-left transition-all ${
                            selectedTerm === t.years
                              ? 'border-[#28AA48] bg-[#28AA48]/5'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <p className={`font-bold text-sm ${selectedTerm === t.years ? 'text-[#28AA48]' : 'text-[#3A475B]'}`}>
                            {t.years} Year{t.years !== 1 ? 's' : ''}
                          </p>
                          <p className="text-xs text-gray-500">{formatCurrency(t.monthlyPayment)}/mo</p>
                        </button>
                      ))}
                    </div>
                    {selectedTerm === null && <p className="text-xs text-red-500 mt-1">Select a term to proceed</p>}
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-[#3A475B] mb-3">Client Information</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Full Name <span className="text-red-500">*</span></label>
                        <input value={fullName} onChange={e => setFullName(e.target.value)} required
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#28AA48]/30 focus:border-[#28AA48]" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Company Name</label>
                        <input value={companyName} onChange={e => setCompanyName(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#28AA48]/30 focus:border-[#28AA48]" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Email <span className="text-red-500">*</span></label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#28AA48]/30 focus:border-[#28AA48]" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Phone</label>
                        <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#28AA48]/30 focus:border-[#28AA48]" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Best Time to Contact</label>
                        <input value={bestTime} onChange={e => setBestTime(e.target.value)} placeholder="e.g. Mornings"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#28AA48]/30 focus:border-[#28AA48]" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Business Description <span className="text-red-500">*</span></label>
                      <textarea value={businessDescription} onChange={e => setBusinessDescription(e.target.value)} required rows={3}
                        placeholder="Briefly describe the client's business activities"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#28AA48]/30 focus:border-[#28AA48] resize-none" />
                    </div>
                    <div className="mt-4">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Additional Notes</label>
                      <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#28AA48]/30 focus:border-[#28AA48] resize-none" />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-[#3A475B] mb-1">
                      Required Documents
                      <span className={`ml-2 text-xs font-normal px-2 py-0.5 rounded-full ${isLowDoc ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                        {isLowDoc ? 'Low Doc' : 'Full Doc'}
                      </span>
                    </h3>
                    <p className="text-xs text-gray-500 mb-4">
                      {isLowDoc
                        ? 'Project cost under $250,000 — streamlined Low Doc pathway'
                        : 'Project cost over $250,000 — Full Doc pathway required'}
                    </p>

                    <div className="space-y-4">
                      <FileUploadField
                        label="Privacy Consent Form *"
                        hint="Upload the signed Privacy Consent & Acknowledgement form"
                        file={privacyConsentFile}
                        uploading={uploading}
                        onUpload={handlePrivacyUpload}
                        onRemove={async () => { if (privacyConsentFile) { await removeStorageFile(privacyConsentFile.path); setPrivacyConsentFile(null); } }}
                      />

                      {isLowDoc && (
                        <>
                          <FileUploadField
                            label="Directors Drivers Licence & Medicare Card *"
                            file={directorsIdFile}
                            uploading={uploading}
                            onUpload={handleDirectorsIdUpload}
                            onRemove={async () => { if (directorsIdFile) { await removeStorageFile(directorsIdFile.path); setDirectorsIdFile(null); } }}
                          />
                          <FileUploadField
                            label="Directors Asset & Liability Statement *"
                            file={assetLiabilityFile}
                            uploading={uploading}
                            onUpload={handleAssetLiabilityUpload}
                            onRemove={async () => { if (assetLiabilityFile) { await removeStorageFile(assetLiabilityFile.path); setAssetLiabilityFile(null); } }}
                          />
                        </>
                      )}

                      {!isLowDoc && (
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Additional Documents</label>
                          <p className="text-xs text-gray-400 mb-2">Upload financial statements, tax returns, bank statements, and any other supporting documents</p>
                          <label className="flex items-center gap-3 p-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#28AA48] hover:bg-green-50/50 transition-all">
                            {uploading ? <Loader className="w-4 h-4 animate-spin text-[#28AA48]" /> : <Upload className="w-4 h-4 text-gray-400" />}
                            <span className="text-sm text-gray-500">Click to upload (PDF, DOC, JPG, PNG)</span>
                            <input type="file" className="hidden" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={handleUploadFile} disabled={uploading} />
                          </label>
                          {uploadedFiles.length > 0 && (
                            <div className="mt-2 space-y-1.5">
                              {uploadedFiles.map(f => (
                                <div key={f.path} className="flex items-center gap-2 p-2.5 bg-green-50 border border-green-200 rounded-lg">
                                  <FileText className="w-4 h-4 text-[#28AA48] flex-shrink-0" />
                                  <span className="text-sm flex-1 truncate">{f.name}</span>
                                  <button type="button" onClick={async () => { await removeStorageFile(f.path); setUploadedFiles(prev => prev.filter(x => x.path !== f.path)); }} className="text-gray-400 hover:text-red-500">
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <DollarSign className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-amber-800">
                      By submitting this application, you confirm all information is accurate and the client has authorised this submission.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || uploading || selectedTerm === null}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-[#34AC48] to-[#AFD235] text-white font-bold rounded-xl hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed text-sm"
                  >
                    {submitting ? (
                      <><div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />Submitting...</>
                    ) : (
                      <><Send className="w-4 h-4" />Submit Application</>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
