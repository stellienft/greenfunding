import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { InstallerLayout } from '../components/InstallerLayout';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { FileText, Calendar, Loader, Building2, MapPin, Tag, Trash2, AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react';

interface SentQuote {
  id: string;
  quote_number: number;
  created_at: string;
  recipient_name: string | null;
  recipient_company: string | null;
  recipient_email: string | null;
  site_address: string | null;
  system_size: string | null;
  project_cost: number;
  term_options: Array<{ years: number; monthlyPayment: number; interestRate: number; totalFinanced: number }>;
  asset_names: string[];
  calculator_type: string;
  payment_timing: string;
  status: string;
  accepted_at: string | null;
  pipedrive_synced_at: string | null;
  pipedrive_stage_name: string | null;
}

function formatQuoteNumber(n: number) {
  return `#${String(n).padStart(6, '0')}`;
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n);
}

function statusBadge(status: string, acceptedAt: string | null) {
  if (acceptedAt || status === 'accepted') {
    return { label: 'Accepted', cls: 'bg-green-100 text-green-800 border-green-200', icon: true };
  }
  switch (status) {
    case 'application_submitted':
      return { label: 'Application Submitted', cls: 'bg-green-100 text-green-800 border-green-200', icon: false };
    case 'application_started':
      return { label: 'Application Started', cls: 'bg-blue-100 text-blue-800 border-blue-200', icon: false };
    default:
      return { label: 'Proposal Generated', cls: 'bg-gray-100 text-gray-700 border-gray-200', icon: false };
  }
}

function calcTypeLabel(t: string) {
  switch (t) {
    case 'progress_payment_rental': return 'Progress Payment';
    case 'serviced_rental': return 'Serviced Rental';
    default: return 'Rental';
  }
}

export function MyQuotes() {
  const navigate = useNavigate();
  const { installerProfile } = useAuth();
  const [quotes, setQuotes] = useState<SentQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SentQuote | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (installerProfile) loadQuotes();
  }, [installerProfile]);

  async function loadQuotes() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sent_quotes')
        .select('id, quote_number, created_at, recipient_name, recipient_company, recipient_email, site_address, system_size, project_cost, term_options, asset_names, calculator_type, payment_timing, status, accepted_at, pipedrive_synced_at, pipedrive_stage_name')
        .eq('installer_id', installerProfile!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuotes(data || []);
    } catch (err: any) {
      setError('Failed to load quotes');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('sent_quotes').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      setQuotes(prev => prev.filter(q => q.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      alert('Failed to delete proposal. Please try again.');
    } finally {
      setDeleting(false);
    }
  }

  const accepted = quotes.filter(q => q.accepted_at || q.status === 'accepted');
  const active = quotes.filter(q => !q.accepted_at && q.status !== 'accepted');

  return (
    <InstallerLayout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#3A475B] mb-1">My Proposals</h1>
          <p className="text-gray-500 text-sm">View and continue proposals you have generated for your clients</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader className="w-7 h-7 animate-spin text-[#28AA48]" />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        ) : quotes.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-14 text-center shadow-sm">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-[#3A475B] mb-2">No proposals yet</h3>
            <p className="text-gray-500 text-sm mb-6">
              Generate a proposal from the calculator to get started.
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#34AC48] to-[#AFD235] text-white font-semibold rounded-lg text-sm hover:shadow-md transition-all"
            >
              Go to Calculator
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {accepted.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center gap-1.5 text-green-700">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-sm font-semibold">Accepted Proposals</span>
                  </div>
                  <span className="text-xs font-bold text-white bg-[#28AA48] rounded-full w-5 h-5 flex items-center justify-center">{accepted.length}</span>
                </div>
                <div className="bg-white rounded-2xl border border-green-200 shadow-sm overflow-hidden">
                  {accepted.map((q, idx) => (
                    <QuoteRow
                      key={q.id}
                      q={q}
                      isLast={idx === accepted.length - 1}
                      onNavigate={() => navigate(`/quotes/${q.id}`)}
                      onDelete={e => { e.stopPropagation(); setDeleteTarget(q); }}
                    />
                  ))}
                </div>
              </section>
            )}

            {active.length > 0 && (
              <section>
                {accepted.length > 0 && (
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm font-semibold text-gray-500">All Proposals</span>
                    <span className="text-xs font-bold text-white bg-gray-400 rounded-full w-5 h-5 flex items-center justify-center">{active.length}</span>
                  </div>
                )}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  {active.map((q, idx) => (
                    <QuoteRow
                      key={q.id}
                      q={q}
                      isLast={idx === active.length - 1}
                      onNavigate={() => navigate(`/quotes/${q.id}`)}
                      onDelete={e => { e.stopPropagation(); setDeleteTarget(q); }}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="text-base font-bold text-[#3A475B] mb-2">Delete Proposal?</h2>
            <p className="text-sm text-gray-500 mb-6">
              This will permanently delete proposal {formatQuoteNumber(deleteTarget.quote_number)} for <strong>{deleteTarget.recipient_company || deleteTarget.recipient_name || 'this client'}</strong>. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
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

interface QuoteRowProps {
  q: SentQuote;
  isLast: boolean;
  onNavigate: () => void;
  onDelete: (e: React.MouseEvent) => void;
}

function QuoteRow({ q, isLast, onNavigate, onDelete }: QuoteRowProps) {
  const badge = statusBadge(q.status || 'generated', q.accepted_at);
  const lowestTerm = q.term_options?.length
    ? q.term_options.reduce((a, b) => a.monthlyPayment < b.monthlyPayment ? a : b)
    : null;

  return (
    <button
      onClick={onNavigate}
      className={`w-full text-left flex items-center gap-4 px-5 py-4 hover:bg-gray-50/60 transition-colors group ${!isLast ? 'border-b border-gray-100' : ''}`}
    >
      <div className="w-9 h-9 bg-gradient-to-br from-[#34AC48] to-[#AFD235] rounded-lg flex items-center justify-center flex-shrink-0">
        <FileText className="w-4 h-4 text-white" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className="text-sm font-bold text-[#3A475B] truncate">
            {q.recipient_company || q.recipient_name || 'Unnamed Client'}
          </span>
          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full border ${badge.cls}`}>
            {badge.icon && <CheckCircle2 className="w-3 h-3" />}
            {badge.label}
          </span>
          {q.pipedrive_stage_name ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-300 px-2.5 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-[#28AA48] inline-block flex-shrink-0"></span>
              {q.pipedrive_stage_name}
            </span>
          ) : (q.accepted_at && !q.pipedrive_synced_at) ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block flex-shrink-0"></span>
              Pending CRM sync
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-[#28AA48] font-semibold">{formatQuoteNumber(q.quote_number)}</span>
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <Tag className="w-3 h-3" />
            {calcTypeLabel(q.calculator_type)}
          </span>
          {q.site_address && (
            <span className="hidden sm:flex items-center gap-1 text-xs text-gray-400">
              <MapPin className="w-3 h-3" />
              {q.site_address}
            </span>
          )}
          {q.asset_names?.length > 0 && (
            <span className="hidden md:flex items-center gap-1 text-xs text-gray-400">
              <Building2 className="w-3 h-3" />
              {q.asset_names.slice(0, 2).join(', ')}{q.asset_names.length > 2 ? ` +${q.asset_names.length - 2}` : ''}
            </span>
          )}
        </div>
      </div>

      <div className="hidden sm:flex items-center gap-6 flex-shrink-0">
        <div className="text-right">
          <p className="text-xs text-gray-400 mb-0.5">Project Cost</p>
          <p className="text-sm font-bold text-[#3A475B]">{formatCurrency(q.project_cost)}</p>
        </div>
        {lowestTerm && (
          <div className="text-right">
            <p className="text-xs text-gray-400 mb-0.5">From / month</p>
            <p className="text-sm font-bold text-[#28AA48]">{formatCurrency(lowestTerm.monthlyPayment)}</p>
          </div>
        )}
        <div className="text-right">
          <p className="text-xs text-gray-400 mb-0.5">Date</p>
          <p className="text-sm text-gray-600 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {new Date(q.created_at).toLocaleDateString('en-AU', { day: '2-digit', month: 'short' })}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={onDelete}
          className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          title="Delete proposal"
        >
          <Trash2 className="w-4 h-4" />
        </button>
        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-[#28AA48] transition-colors" />
      </div>
    </button>
  );
}
