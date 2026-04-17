import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { InstallerLayout } from '../components/InstallerLayout';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { calculateAll, calculateProgressPayment } from '../calculator';
import {
  ArrowLeft, FileText, MapPin, Calendar, DollarSign, Tag, CheckCircle2,
  Upload, X, Send, Loader, Building2, ChevronDown, ChevronUp, Clock,
  Mail, Copy, ClipboardCheck, Download, Pencil, Trash2, AlertTriangle
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
  pdf_url: string | null;
  pipedrive_synced_at: string | null;
  pipedrive_deal_url: string | null;
  pipedrive_stage_name: string | null;
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

function buildEmailTemplate(projectCost: number, installerName: string, installerCompany: string, clientName: string): string {
  const isLowDoc = projectCost <= 250000;
  const costStr = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(projectCost);
  const docType = isLowDoc ? 'Low Doc' : 'Full Doc';
  const greeting = clientName.trim() ? clientName.trim() : '[Client Name]';

  const lowDocItems = `To progress this to the next stage we will need the following documents:

1. Completed Finance Application
2. 6 months business bank statements
3. Installer's quote / invoice
4. Signed Privacy Consent & Acknowledgement`;

  const fullDocItems = `To progress this to the next stage we will need the following documents:

1. Completed Finance Application
2. 2 years financial statements (P&L and Balance Sheet)
3. 2 years tax returns (business and individual)
4. 6 months business bank statements
5. Installer's quote / invoice
6. Signed Privacy Consent & Acknowledgement`;

  return `Hi ${greeting},

I hope this email finds you well. I wanted to follow up on our recent conversation regarding your renewable energy project.

I've put together a finance quote for your consideration, which you will find attached. This quote outlines the ${docType} finance options available for your project valued at ${costStr}.

${isLowDoc ? lowDocItems : fullDocItems}

Please don't hesitate to reach out if you have any questions about the quote or the application process. Our team at Green Funding is ready to help you take the next step.

Kind regards,

${installerName || '[Your Name]'}${installerCompany ? `\n${installerCompany}` : ''}`;
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
  const [medicareCardFile, setMedicareCardFile] = useState<UploadedFile | null>(null);
  const [assetLiabilityFile, setAssetLiabilityFile] = useState<UploadedFile | null>(null);
  const [privacyAcknowledged, setPrivacyAcknowledged] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showEmailTemplate, setShowEmailTemplate] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editSystemSize, setEditSystemSize] = useState('');
  const [saving, setSaving] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [resending, setResending] = useState(false);
  const [resentOk, setResentOk] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);

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

  function openEditModal() {
    if (!quote) return;
    setEditName(quote.recipient_name || '');
    setEditCompany(quote.recipient_company || '');
    setEditEmail(quote.recipient_email || '');
    setEditPhone(quote.client_phone || '');
    setEditAddress(quote.site_address || '');
    setEditSystemSize(quote.system_size || '');
    setShowEditModal(true);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!quote) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('sent_quotes').update({
        recipient_name: editName || null,
        recipient_company: editCompany || null,
        recipient_email: editEmail || null,
        client_phone: editPhone || null,
        site_address: editAddress || null,
        system_size: editSystemSize || null,
      }).eq('id', quote.id);
      if (error) throw error;
      setQuote(prev => prev ? {
        ...prev,
        recipient_name: editName || null,
        recipient_company: editCompany || null,
        recipient_email: editEmail || null,
        client_phone: editPhone || null,
        site_address: editAddress || null,
        system_size: editSystemSize || null,
      } : prev);
      setShowEditModal(false);
    } catch {
      alert('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!quote) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('sent_quotes').delete().eq('id', quote.id);
      if (error) throw error;
      navigate('/quotes');
    } catch {
      alert('Failed to delete quote. Please try again.');
      setDeleting(false);
    }
  }

  async function handleResend() {
    if (!quote?.id) return;
    setResending(true);
    setResendError(null);
    setResentOk(false);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${supabaseUrl}/functions/v1/send-quote-email?mode=send-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || supabaseAnonKey}`,
          'Apikey': supabaseAnonKey,
        },
        body: JSON.stringify({ quoteId: quote.id }),
      });
      const result = await res.json();
      if (!res.ok || result.error) throw new Error(result.error || 'Failed to resend');
      setResentOk(true);
      setTimeout(() => setResentOk(false), 4000);
    } catch (err: any) {
      setResendError(err.message || 'Failed to resend proposal');
    } finally {
      setResending(false);
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

  const handleMedicareCardUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    try { setMedicareCardFile(await uploadFile(file, 'medicare-card')); }
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
    if (!privacyAcknowledged) { alert('Please confirm the privacy consent acknowledgement'); return; }
    if (isLowDoc && !directorsIdFile) { alert('Please upload the Directors Drivers Licence'); return; }
    if (isLowDoc && !medicareCardFile) { alert('Please upload the Directors Medicare Card'); return; }
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
        medicare_card_file: medicareCardFile,
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
      <InstallerLayout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader className="w-7 h-7 animate-spin text-[#28AA48]" />
        </div>
      </InstallerLayout>
    );
  }

  if (error || !quote) {
    return (
      <InstallerLayout>
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error || 'Quote not found'}</p>
            <button onClick={() => navigate('/quotes')} className="text-[#28AA48] font-semibold hover:underline text-sm">
              Back to My Quotes
            </button>
          </div>
        </div>
      </InstallerLayout>
    );
  }

  if (submitted) {
    return (
      <InstallerLayout>
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
      </InstallerLayout>
    );
  }

  const netCapex = quote.project_cost / 1.1;
  const alreadySubmitted = quote.status === 'application_submitted';

  return (
    <InstallerLayout>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-10 px-4">
        <div className="max-w-3xl mx-auto">

          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigate('/quotes')}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#28AA48] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to My Quotes
            </button>
            <div className="flex items-center gap-2 flex-wrap">
              {quote.recipient_email && (
                <button
                  onClick={handleResend}
                  disabled={resending}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[#3A475B] bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60"
                >
                  {resending ? <Loader className="w-3.5 h-3.5 animate-spin" /> : resentOk ? <CheckCircle2 className="w-3.5 h-3.5 text-[#28AA48]" /> : <Send className="w-3.5 h-3.5" />}
                  {resentOk ? 'Sent!' : 'Resend Proposal'}
                </button>
              )}
              <button
                onClick={openEditModal}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[#3A475B] bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </div>
            {resendError && (
              <p className="text-xs text-red-500 mt-2 text-right">{resendError}</p>
            )}
          </div>

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
                  {quote.pipedrive_synced_at && (
                    <span className="inline-flex items-center gap-1 mt-1 text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3" />
                      In Pipedrive
                    </span>
                  )}
                  {quote.pipedrive_synced_at && quote.pipedrive_stage_name && (
                    <span className="inline-flex items-center gap-1.5 mt-1 text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#AFD235] inline-block flex-shrink-0"></span>
                      {quote.pipedrive_stage_name}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-5 grid grid-cols-2 sm:grid-cols-4 gap-4 border-b border-gray-100">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Project Cost (Inc. GST)</p>
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

              {quote.pdf_url && (
                <div className="mt-4">
                  <a
                    href={quote.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 w-full px-4 py-3 bg-[#28AA48]/10 hover:bg-[#28AA48]/20 border border-[#28AA48]/30 rounded-xl text-sm font-semibold text-[#28AA48] transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download Quote PDF
                  </a>
                </div>
              )}

              <div className="mt-4 border border-gray-200 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowEmailTemplate(v => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-semibold text-[#3A475B]"
                >
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-[#28AA48]" />
                    Email Template
                    <span className={`text-xs font-normal px-2 py-0.5 rounded-full ${(quote.project_cost ?? 0) <= 250000 ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                      {(quote.project_cost ?? 0) <= 250000 ? 'Low Doc' : 'Full Doc'}
                    </span>
                  </div>
                  {showEmailTemplate ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>

                {showEmailTemplate && (() => {
                  const emailTemplate = buildEmailTemplate(
                    quote.project_cost,
                    installerProfile?.full_name || user?.user_metadata?.full_name || '',
                    installerProfile?.company_name || user?.user_metadata?.company_name || '',
                    quote.recipient_name || quote.recipient_company || ''
                  );
                  const handleCopy = async () => {
                    try {
                      await navigator.clipboard.writeText(emailTemplate);
                      setCopiedEmail(true);
                      setTimeout(() => setCopiedEmail(false), 2500);
                    } catch { /* no-op */ }
                  };
                  return (
                    <div className="px-4 pb-4 pt-3 space-y-3">
                      <p className="text-xs text-gray-500">
                        Copy and paste this into your email client, then attach the PDF quote.
                      </p>
                      <pre className="whitespace-pre-wrap font-sans text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-lg p-3 max-h-56 overflow-y-auto leading-relaxed">
                        {emailTemplate}
                      </pre>
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-[#3A475B] font-semibold rounded-lg hover:bg-gray-50 transition-colors text-sm w-full justify-center"
                      >
                        {copiedEmail ? (
                          <>
                            <ClipboardCheck className="w-4 h-4 text-[#28AA48]" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            Copy Template
                          </>
                        )}
                      </button>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

        </div>
      </div>

      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-[#3A475B]">Edit Quote Details</h2>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Client Name</label>
                  <input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#28AA48]/30 focus:border-[#28AA48]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Company Name</label>
                  <input
                    value={editCompany}
                    onChange={e => setEditCompany(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#28AA48]/30 focus:border-[#28AA48]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={e => setEditEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#28AA48]/30 focus:border-[#28AA48]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={e => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#28AA48]/30 focus:border-[#28AA48]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Site Address</label>
                  <input
                    value={editAddress}
                    onChange={e => setEditAddress(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#28AA48]/30 focus:border-[#28AA48]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">System Size</label>
                  <input
                    value={editSystemSize}
                    onChange={e => setEditSystemSize(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#28AA48]/30 focus:border-[#28AA48]"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-2.5 text-sm font-semibold text-[#3A475B] bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-[#34AC48] to-[#AFD235] rounded-lg hover:shadow-md transition-all disabled:opacity-60"
                >
                  {saving ? <><div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />Saving...</> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="text-base font-bold text-[#3A475B] mb-2">Delete Quote?</h2>
            <p className="text-sm text-gray-500 mb-6">
              This will permanently delete quote {formatQuoteNumber(quote.quote_number)} for <strong>{quote.recipient_company || quote.recipient_name || 'this client'}</strong>. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 py-2.5 text-sm font-semibold text-[#3A475B] bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-60"
              >
                {deleting ? <><div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />Deleting...</> : <><Trash2 className="w-4 h-4" />Delete</>}
              </button>
            </div>
          </div>
        </div>
      )}

    </InstallerLayout>
  );
}
