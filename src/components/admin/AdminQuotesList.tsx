import { useState, useEffect } from 'react';
import {
  FileText, Calendar, User, Building2, MapPin, Download,
  ChevronDown, ChevronUp, Search, X, Loader, CheckCircle2, FolderOpen,
  Send, AlertCircle, ExternalLink
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface TermOption {
  years: number;
  monthlyPayment: number;
  interestRate: number;
  totalFinanced?: number;
}

interface DocumentUpload {
  id: string;
  document_type: string;
  file_name: string;
  file_path: string;
  uploaded_at: string;
}

function getRequiredDocs(projectCost: number): Array<{ key: string; label: string }> {
  if (projectCost >= 250000) {
    const docs = [
      { key: 'financials', label: 'FY24 & FY25 Accountant Prepared Financials' },
      { key: 'mgt_financials', label: 'Mgt YTD Dec 25 Financials' },
      { key: 'finance_commitment', label: 'Finance Commitment Schedule' },
      { key: 'ato_statement', label: 'Current ATO Portal Statement' },
      { key: 'business_overview', label: 'Business Overview and Major Clients' },
      { key: 'asset_liability', label: 'Asset and Liability Statement' },
    ];
    if (projectCost >= 500000) docs.push({ key: 'aged_debtors', label: 'Aged Debtors and Creditors' });
    if (projectCost >= 1000000) docs.push({ key: 'cashflow', label: 'Cashflow Projections' });
    return docs;
  }
  const base = [
    { key: 'directors_licence', label: "Director's Drivers Licence" },
    { key: 'medicare_card', label: "Director's Medicare Card" },
    { key: 'privacy_consent', label: 'Privacy Consent (signed)' },
    { key: 'asset_liability', label: 'Asset and Liability Statement (signed)' },
  ];
  if (projectCost >= 150000) {
    base.splice(2, 0, { key: 'bank_statements', label: '6 Months Business Bank Statements' });
  }
  return base;
}

interface AdminQuote {
  id: string;
  quote_number: number;
  created_at: string;
  installer_id: string | null;
  recipient_name: string | null;
  recipient_company: string | null;
  recipient_email: string | null;
  site_address: string | null;
  system_size: string | null;
  project_cost: number;
  term_options: TermOption[];
  asset_names: string[];
  calculator_type: string;
  payment_timing: string;
  status: string;
  client_phone: string | null;
  pdf_url: string | null;
  accepted_at: string | null;
  upload_token: string | null;
  pipedrive_synced_at: string | null;
  pipedrive_deal_id: string | null;
  pipedrive_deal_url: string | null;
  installer: {
    full_name: string | null;
    company_name: string | null;
    email: string;
  } | null;
}

function formatQuoteNumber(n: number) {
  return `#${String(n).padStart(6, '0')}`;
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n);
}

function statusBadge(status: string) {
  switch (status) {
    case 'application_submitted':
      return { label: 'Application Submitted', cls: 'bg-green-100 text-green-800 border-green-200' };
    case 'application_started':
      return { label: 'Application Started', cls: 'bg-blue-100 text-blue-800 border-blue-200' };
    case 'accepted':
      return { label: 'Proposal Accepted', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
    default:
      return { label: 'Proposal Generated', cls: 'bg-gray-100 text-gray-700 border-gray-200' };
  }
}

function calcTypeLabel(t: string) {
  switch (t) {
    case 'progress_payment_rental': return 'Progress Payment Rental';
    case 'serviced_rental': return 'Serviced Rental';
    default: return 'Rental';
  }
}

function calcTypeColor(t: string) {
  switch (t) {
    case 'progress_payment_rental': return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'serviced_rental': return 'bg-blue-50 text-blue-700 border-blue-200';
    default: return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
}

function getDocTier(projectCost: number): string {
  if (projectCost < 150000) return 'Low Doc — up to $150,000';
  if (projectCost < 250000) return 'Low Doc — $150,000 to $250,000';
  if (projectCost < 500000) return 'Full Doc — $250,000 to $500,000';
  if (projectCost < 1000000) return 'Full Doc — $500,000 to $1,000,000';
  return 'Full Doc — $1,000,000+';
}

function getDocList(projectCost: number): string[] {
  if (projectCost >= 250000) {
    const docs = [
      'FY24 & FY25 Accountant Prepared Financials',
      'Mgt YTD Dec 25 Financials',
      'Finance Commitment Schedule',
      'Current ATO Portal Statement',
      'Business Overview and Major Clients',
      'Asset and Liability Statement',
    ];
    if (projectCost >= 500000) docs.push('Aged Debtors and Creditors');
    if (projectCost >= 1000000) docs.push('Cashflow Projections');
    return docs;
  }
  const docs = [
    "Director's Drivers Licence",
    "Director's Medicare Card",
    'Privacy Consent (signed)',
    'Asset and Liability Statement (signed)',
  ];
  if (projectCost >= 150000) {
    docs.splice(2, 0, '6 Months Business Bank Statements');
  }
  return docs;
}

interface SendModalProps {
  quote: AdminQuote;
  onClose: () => void;
  onSent: () => void;
}

function SendUploadLinkModal({ quote, onClose, onSent }: SendModalProps) {
  const [sending, setSending] = useState(false);
  const [sentError, setSentError] = useState<string | null>(null);

  const uploadUrl = quote.upload_token
    ? `${window.location.origin}/upload-documents/${quote.upload_token}`
    : null;
  const clientName = quote.recipient_name || quote.recipient_company || 'Client';
  const docTier = getDocTier(quote.project_cost);
  const docList = getDocList(quote.project_cost);
  const expiryDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });

  async function handleConfirmSend() {
    setSending(true);
    setSentError(null);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/accept-quote`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ quoteId: quote.id }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to send');
      onSent();
    } catch (err: any) {
      setSentError(err.message || 'Failed to send upload link.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100" style={{ background: 'linear-gradient(135deg, #1a2e3b 0%, #2D3A4A 100%)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <Send className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">Send Upload Portal Link</p>
              <p className="text-white/60 text-xs">Review before sending to client</p>
            </div>
          </div>
          <button onClick={onClose} disabled={sending} className="text-white/60 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-2.5">
            <div className="flex justify-between items-start gap-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Client</span>
              <span className="text-sm font-semibold text-[#3A475B] text-right">{clientName}</span>
            </div>
            {quote.recipient_email && (
              <div className="flex justify-between items-start gap-2">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Email</span>
                <span className="text-sm text-gray-600 text-right">{quote.recipient_email}</span>
              </div>
            )}
            <div className="flex justify-between items-start gap-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Proposal</span>
              <span className="text-sm font-semibold text-[#28AA48]">#{String(quote.quote_number).padStart(6, '0')}</span>
            </div>
            <div className="flex justify-between items-start gap-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Project Cost</span>
              <span className="text-sm font-bold text-[#3A475B]">{formatCurrency(quote.project_cost)}</span>
            </div>
            <div className="flex justify-between items-start gap-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Link Expires</span>
              <span className="text-sm text-gray-600">{expiryDate}</span>
            </div>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs font-bold text-emerald-800 uppercase tracking-wide mb-2">{docTier} — Required Documents</p>
            <ul className="space-y-1.5">
              {docList.map((doc, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-emerald-900">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  {doc}
                </li>
              ))}
            </ul>
          </div>

          {uploadUrl && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Upload Portal Link</p>
              <p className="text-xs text-gray-500 break-all font-mono">{uploadUrl}</p>
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">
              The client will receive an email with a link to the <strong>Low Doc Requirements Client Portal</strong>. They must log in using their name and email address to access it.
            </p>
          </div>

          {sentError && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{sentError}</p>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              disabled={sending}
              className="flex-1 py-2.5 text-sm font-semibold text-[#3A475B] bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmSend}
              disabled={sending || !quote.recipient_email}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-[#34AC48] to-[#AFD235] rounded-xl hover:shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {sending
                ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Sending…</>
                : <><Send className="w-4 h-4" /> Confirm &amp; Send</>
              }
            </button>
          </div>
          {!quote.recipient_email && (
            <p className="text-xs text-red-600 text-center">This proposal has no client email address — cannot send link.</p>
          )}
        </div>
      </div>
    </div>
  );
}

interface ExpandedQuoteRowProps {
  quote: AdminQuote;
  onQuoteUpdated: () => void;
}

function ExpandedQuoteRow({ quote, onQuoteUpdated }: ExpandedQuoteRowProps) {
  const [uploads, setUploads] = useState<DocumentUpload[]>([]);
  const [loadingUploads, setLoadingUploads] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendingPipedrive, setSendingPipedrive] = useState(false);
  const [pipedriveError, setPipedriveError] = useState<string | null>(null);
  const [pipedriveDealInput, setPipedriveDealInput] = useState('');

  useEffect(() => {
    if (quote.status === 'accepted' || quote.accepted_at) {
      loadUploads();
    }
  }, [quote.id]);

  async function loadUploads() {
    setLoadingUploads(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-quotes/uploads?quote_id=${quote.id}`,
        { headers: { 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` } }
      );
      const json = await res.json();
      if (json.uploads) setUploads(json.uploads);
    } finally {
      setLoadingUploads(false);
    }
  }

  async function handleSendToPipedrive() {
    setSendingPipedrive(true);
    setPipedriveError(null);
    try {
      const body: Record<string, unknown> = { quoteId: quote.id };
      const trimmed = pipedriveDealInput.trim();
      if (trimmed) body.existingDealId = trimmed;
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pipedrive-sync`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to sync to Pipedrive');
      setPipedriveDealInput('');
      onQuoteUpdated();
    } catch (err: any) {
      setPipedriveError(err.message || 'Failed to sync to Pipedrive');
    } finally {
      setSendingPipedrive(false);
    }
  }

  const appUrl = window.location.origin;
  const uploadPageUrl = quote.upload_token ? `${appUrl}/upload-documents/${quote.upload_token}` : null;

  return (
    <div className="px-5 pb-5 pt-1 border-t border-gray-100 bg-gray-50/60">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Client Details</p>
          <div className="space-y-1">
            {quote.recipient_name && <p className="text-sm text-gray-700">{quote.recipient_name}</p>}
            {quote.recipient_company && <p className="text-sm text-gray-500">{quote.recipient_company}</p>}
            {quote.recipient_email && <p className="text-sm text-gray-500">{quote.recipient_email}</p>}
            {quote.client_phone && <p className="text-sm text-gray-500">{quote.client_phone}</p>}
            {quote.site_address && (
              <p className="flex items-center gap-1 text-sm text-gray-500">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                {quote.site_address}
              </p>
            )}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Installer</p>
          {quote.installer ? (
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-700">{quote.installer.full_name || 'N/A'}</p>
              {quote.installer.company_name && <p className="text-sm text-gray-500">{quote.installer.company_name}</p>}
              <p className="text-sm text-gray-500">{quote.installer.email}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">Unknown installer</p>
          )}
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Proposal Details</p>
          <div className="space-y-1">
            <p className="text-sm text-gray-700">
              <span className="text-gray-400">Service type:</span>{' '}
              <span className="font-medium">{calcTypeLabel(quote.calculator_type)}</span>
            </p>
            <p className="text-sm text-gray-700">
              <span className="text-gray-400">Payment timing:</span>{' '}
              <span className="font-medium capitalize">{quote.payment_timing}</span>
            </p>
            {quote.system_size && (
              <p className="text-sm text-gray-700">
                <span className="text-gray-400">System size:</span>{' '}
                <span className="font-medium">{quote.system_size}</span>
              </p>
            )}
            <p className="text-sm text-gray-700">
              <span className="text-gray-400">Project cost:</span>{' '}
              <span className="font-medium">{formatCurrency(quote.project_cost)}</span>
            </p>
          </div>
        </div>
      </div>

      {quote.term_options?.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Monthly Package Options</p>
          <div className="flex flex-wrap gap-2">
            {quote.term_options.map((t, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-center min-w-[100px]">
                <p className="text-xs text-gray-400 mb-0.5">{t.years} year{t.years !== 1 ? 's' : ''}</p>
                <p className="text-base font-bold text-[#28AA48]">{formatCurrency(t.monthlyPayment)}<span className="text-xs font-normal text-gray-400">/mo</span></p>
                <p className="text-xs text-gray-400">{t.interestRate}% p.a.</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {quote.asset_names?.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Assets</p>
          <div className="flex flex-wrap gap-1.5">
            {quote.asset_names.map((name, i) => (
              <span key={i} className="inline-flex items-center gap-1 text-xs bg-white border border-gray-200 text-gray-600 px-2 py-1 rounded-full">
                <Building2 className="w-3 h-3" />
                {name}
              </span>
            ))}
          </div>
        </div>
      )}

      {quote.pdf_url && (
        <div className="mt-4">
          <a
            href={quote.pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#28AA48]/10 hover:bg-[#28AA48]/20 border border-[#28AA48]/30 rounded-lg text-sm font-semibold text-[#28AA48] transition-colors"
          >
            <Download className="w-4 h-4" />
            Download Proposal PDF
          </a>
        </div>
      )}

      {!quote.accepted_at && quote.status !== 'accepted' && (
        <div className="mt-5 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-[#3A475B] mb-0.5">Low Doc Requirements Client Portal</p>
              <p className="text-xs text-gray-400">Send the client a secure link to upload their required documents.</p>
            </div>
            <button
              onClick={() => setShowSendModal(true)}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#34AC48] to-[#AFD235] text-white text-sm font-bold rounded-xl hover:shadow-md transition-all"
            >
              <Send className="w-4 h-4" />
              Proposal Accepted
            </button>
          </div>
        </div>
      )}

      {showSendModal && (
        <SendUploadLinkModal
          quote={quote}
          onClose={() => setShowSendModal(false)}
          onSent={() => {
            setShowSendModal(false);
            onQuoteUpdated();
          }}
        />
      )}

      <div className="mt-5 pt-4 border-t border-gray-200">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
          <img src="https://www.pipedrive.com/favicon.ico" alt="" className="w-3.5 h-3.5" onError={e => (e.currentTarget.style.display = 'none')} />
          Pipedrive CRM
        </p>
        {quote.pipedrive_synced_at && (
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              <CheckCircle2 className="w-3 h-3" />
              Sent to Pipedrive
            </span>
            <span className="text-xs text-gray-400">
              {new Date(quote.pipedrive_synced_at).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
            {quote.pipedrive_deal_url && (
              <a
                href={quote.pipedrive_deal_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-[#28AA48] font-semibold hover:underline"
              >
                <ExternalLink className="w-3 h-3" />
                View Deal #{quote.pipedrive_deal_id}
              </a>
            )}
          </div>
        )}
        {!quote.pipedrive_synced_at && (
          <div className="flex items-end gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                Existing deal ID (leave blank to create new deal)
              </label>
              <input
                type="text"
                value={pipedriveDealInput}
                onChange={e => setPipedriveDealInput(e.target.value)}
                placeholder="e.g. 12345"
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#28AA48]/30 focus:border-[#28AA48]"
              />
              <p className="text-xs text-gray-400 mt-0.5">From the deal URL: pipedrive.com/deal/<strong>12345</strong></p>
            </div>
            <div className="flex flex-col items-end gap-2 pb-5">
              <button
                onClick={handleSendToPipedrive}
                disabled={sendingPipedrive}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed bg-[#1a2e3b] text-white hover:bg-[#2e3847]"
              >
                {sendingPipedrive
                  ? <><div className="w-4 h-4 border-2 border-current/40 border-t-current rounded-full animate-spin" /> Sending…</>
                  : <><Send className="w-4 h-4" /> Send to Pipedrive</>
                }
              </button>
              {pipedriveError && (
                <p className="text-xs text-red-600 text-right max-w-xs">{pipedriveError}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {(quote.status === 'accepted' || quote.accepted_at) && (
        <div className="mt-5 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                <FolderOpen className="w-3.5 h-3.5" />
                Client Document Uploads
              </p>
              {uploads.length > 0 && (
                <p className="text-xs text-[#28AA48] font-semibold mt-0.5">{uploads.length} document{uploads.length !== 1 ? 's' : ''} uploaded</p>
              )}
              {quote.accepted_at && (
                <p className="text-xs text-gray-400 mt-0.5">
                  Link sent {new Date(quote.accepted_at).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              )}
            </div>
            {uploadPageUrl && (
              <a
                href={uploadPageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-[#28AA48] font-semibold hover:underline"
              >
                <ExternalLink className="w-3 h-3" />
                View Upload Portal
              </a>
            )}
          </div>

          {loadingUploads ? (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Loader className="w-3.5 h-3.5 animate-spin" /> Loading documents…
            </div>
          ) : (
            <div className="space-y-1.5">
              {getRequiredDocs(quote.project_cost ?? 0).map(doc => {
                const uploaded = uploads.some(u => u.document_type === doc.key);
                return (
                  <div key={doc.key} className="flex items-center gap-2">
                    {uploaded ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#28AA48] flex-shrink-0" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-200 flex-shrink-0" />
                    )}
                    <span className={`text-xs ${uploaded ? 'text-[#3A475B] font-medium' : 'text-gray-400'}`}>{doc.label}</span>
                  </div>
                );
              })}
              {uploads.length === 0 && (
                <p className="text-xs text-gray-400 italic mt-1">No documents uploaded yet. Client has been emailed their upload link.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AdminQuotesList() {
  const [quotes, setQuotes] = useState<AdminQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadQuotes();
  }, []);

  async function loadQuotes() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-quotes`,
        {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load quotes');

      const installerMap = new Map<string, AdminQuote['installer']>(
        (json.installers ?? []).map((i: NonNullable<AdminQuote['installer']> & { id: string }) => [
          i.id,
          { full_name: i.full_name, company_name: i.company_name, email: i.email },
        ])
      );

      const withInstallers: AdminQuote[] = (json.quotes ?? []).map((q: AdminQuote & { installer_id: string | null }) => ({
        ...q,
        installer: q.installer_id ? (installerMap.get(q.installer_id) ?? null) : null,
      }));

      setQuotes(withInstallers);
    } catch (err: any) {
      setError('Failed to load quotes. ' + (err.message || ''));
    } finally {
      setLoading(false);
    }
  }

  const filtered = quotes.filter(q => {
    const term = search.toLowerCase();
    const matchesSearch = !term || [
      q.recipient_name, q.recipient_company, q.recipient_email,
      q.site_address, q.installer?.full_name, q.installer?.company_name,
      formatQuoteNumber(q.quote_number),
    ].some(v => v?.toLowerCase().includes(term));

    const matchesType = filterType === 'all' || q.calculator_type === filterType;
    const matchesStatus = filterStatus === 'all' || q.status === filterStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  function exportCSV() {
    if (filtered.length === 0) return;
    const headers = [
      'Proposal Number', 'Date', 'Installer Name', 'Installer Company', 'Installer Email',
      'Client Name', 'Client Company', 'Client Email', 'Client Phone',
      'Site Address', 'System Size', 'Service Type', 'Payment Timing',
      'Project Cost', 'Status',
      ...Array.from({ length: 5 }, (_, i) => [`Term ${i + 1} (Years)`, `Term ${i + 1} Monthly`, `Term ${i + 1} Rate`]).flat(),
      'Assets',
    ];
    const rows = filtered.map(q => [
      formatQuoteNumber(q.quote_number),
      new Date(q.created_at).toLocaleDateString('en-AU'),
      q.installer?.full_name || '',
      q.installer?.company_name || '',
      q.installer?.email || '',
      q.recipient_name || '',
      q.recipient_company || '',
      q.recipient_email || '',
      q.client_phone || '',
      q.site_address || '',
      q.system_size || '',
      calcTypeLabel(q.calculator_type),
      q.payment_timing,
      q.project_cost,
      q.status,
      ...Array.from({ length: 5 }, (_, i) => {
        const t = q.term_options?.[i];
        return t ? [t.years, t.monthlyPayment, t.interestRate] : ['', '', ''];
      }).flat(),
      (q.asset_names || []).join('; '),
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quotes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const totalValue = filtered.reduce((sum, q) => sum + q.project_cost, 0);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-[#3A475B]">All Proposals</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {filtered.length} proposal{filtered.length !== 1 ? 's' : ''}
            {filtered.length > 0 && <> &mdash; total value {formatCurrency(totalValue)}</>}
          </p>
        </div>
        <button
          onClick={exportCSV}
          disabled={filtered.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-[#3A475B] text-white rounded-lg text-sm font-semibold hover:bg-[#2e3847] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by client, installer, quote number..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-9 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#28AA48]/30 focus:border-[#28AA48]"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#28AA48]/30 focus:border-[#28AA48] bg-white"
        >
          <option value="all">All Service Types</option>
          <option value="rental">Rental</option>
          <option value="progress_payment_rental">Progress Payment Rental</option>
          <option value="serviced_rental">Serviced Rental</option>
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#28AA48]/30 focus:border-[#28AA48] bg-white"
        >
          <option value="all">All Statuses</option>
          <option value="generated">Proposal Generated</option>
          <option value="accepted">Proposal Accepted</option>
          <option value="application_started">Application Started</option>
          <option value="application_submitted">Application Submitted</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader className="w-7 h-7 animate-spin text-[#28AA48]" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-700 text-sm">{error}</p>
          <button onClick={loadQuotes} className="mt-3 text-sm text-red-600 underline">Retry</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-12 text-center">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <FileText className="w-7 h-7 text-gray-400" />
          </div>
          <p className="text-gray-600 font-medium">No proposals found</p>
          <p className="text-gray-400 text-sm mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(q => {
            const badge = statusBadge(q.status || 'generated');
            const lowestTerm = q.term_options?.length
              ? q.term_options.reduce((a, b) => a.years < b.years ? a : b)
              : null;
            const isExpanded = expandedId === q.id;

            return (
              <div key={q.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <button
                  className="w-full text-left p-5 hover:bg-gray-50/50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : q.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 min-w-0">
                      <div className="w-10 h-10 bg-gradient-to-br from-[#34AC48] to-[#AFD235] rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-white" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-base font-bold text-[#3A475B]">
                            {q.recipient_company || q.recipient_name || 'Unnamed Client'}
                          </span>
                          <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${badge.cls}`}>
                            {badge.label}
                          </span>
                          <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${calcTypeColor(q.calculator_type)}`}>
                            {calcTypeLabel(q.calculator_type)}
                          </span>
                          {q.pipedrive_synced_at && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3" />
                              In Pipedrive
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                          <span className="text-xs text-[#28AA48] font-semibold">{formatQuoteNumber(q.quote_number)}</span>
                          {q.installer && (
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <User className="w-3 h-3" />
                              {q.installer.full_name || q.installer.email}
                              {q.installer.company_name && ` — ${q.installer.company_name}`}
                            </span>
                          )}
                          {q.site_address && (
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <MapPin className="w-3 h-3" />
                              {q.site_address}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-5 flex-shrink-0">
                      <div className="hidden sm:block text-right">
                        <p className="text-xs text-gray-400">Project Cost</p>
                        <p className="font-bold text-[#3A475B] text-sm">{formatCurrency(q.project_cost)}</p>
                      </div>
                      {lowestTerm && (
                        <div className="hidden sm:block text-right">
                          <p className="text-xs text-gray-400">From / month</p>
                          <p className="font-bold text-[#28AA48] text-sm">{formatCurrency(lowestTerm.monthlyPayment)}</p>
                        </div>
                      )}
                      <div className="hidden sm:block text-right">
                        <p className="text-xs text-gray-400">Date</p>
                        <p className="text-sm text-gray-600 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(q.created_at).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      {isExpanded
                        ? <ChevronUp className="w-5 h-5 text-gray-400" />
                        : <ChevronDown className="w-5 h-5 text-gray-400" />
                      }
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-4 sm:hidden">
                    <span className="text-sm font-bold text-[#3A475B]">{formatCurrency(q.project_cost)}</span>
                    {lowestTerm && <span className="text-sm font-bold text-[#28AA48]">{formatCurrency(lowestTerm.monthlyPayment)}/mo</span>}
                    <span className="text-xs text-gray-400 ml-auto">
                      {new Date(q.created_at).toLocaleDateString('en-AU', { day: '2-digit', month: 'short' })}
                    </span>
                  </div>
                </button>

                {isExpanded && <ExpandedQuoteRow quote={q} onQuoteUpdated={loadQuotes} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
