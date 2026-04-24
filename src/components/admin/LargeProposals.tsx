import { useState, useEffect } from 'react';
import {
  AlertTriangle, ChevronDown, ChevronUp, CheckCircle2, Clock,
  User, Building2, MapPin, DollarSign, Send, Loader, X, Plus, Trash2, Bell
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAdmin } from '../../context/AdminContext';

interface TermOption {
  years: number;
  monthlyPayment: number;
  interestRate: number;
  totalFinanced?: number;
}

interface LargeProposal {
  id: string;
  quote_number: number;
  created_at: string;
  installer_id: string | null;
  recipient_name: string | null;
  recipient_company: string | null;
  recipient_email: string | null;
  site_address: string | null;
  project_cost: number;
  term_options: TermOption[];
  custom_term_options: TermOption[] | null;
  admin_review_status: string | null;
  custom_rates_applied_at: string | null;
  custom_rates_applied_by: string | null;
  partner_notified_at: string | null;
  admin_review_notes: string | null;
  calculator_type: string;
  installer: {
    full_name: string | null;
    company_name: string | null;
    email: string;
  } | null;
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n);
}

function formatQuoteNumber(n: number) {
  return `#${String(n).padStart(6, '0')}`;
}

function statusBadge(status: string | null) {
  if (status === 'rates_applied') {
    return { label: 'Rates Applied', cls: 'bg-green-100 text-green-800 border-green-200' };
  }
  return { label: 'Pending Review', cls: 'bg-amber-100 text-amber-800 border-amber-200' };
}

interface RateEditorProps {
  proposal: LargeProposal;
  onSaved: () => void;
}

function calcMonthlyPayment(principal: number, annualRate: number, years: number): number {
  const n = years * 12;
  const r = annualRate / 12;
  if (principal <= 0 || r <= 0 || n <= 0) return 0;
  const disc = Math.pow(1 + r, -n);
  return Math.round(((principal * r) / (1 - disc)) * 100) / 100;
}

function RateEditor({ proposal, onSaved }: RateEditorProps) {
  const { admin } = useAdmin();
  const effectiveTerms = proposal.custom_term_options || proposal.term_options || [];
  const [terms, setTerms] = useState<TermOption[]>(
    effectiveTerms.map(t => ({ ...t }))
  );
  // Track raw string values for rate inputs so users can type freely
  const [rateInputs, setRateInputs] = useState<string[]>(
    effectiveTerms.map(t => (t.interestRate * 100).toFixed(2))
  );
  const [notes, setNotes] = useState(proposal.admin_review_notes || '');
  const [saving, setSaving] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedOk, setSavedOk] = useState(false);
  const [notifiedOk, setNotifiedOk] = useState(false);

  function updateRate(idx: number, raw: string) {
    setRateInputs(prev => prev.map((v, i) => i === idx ? raw : v));
    const pct = parseFloat(raw);
    if (isNaN(pct)) return;
    const annualRate = pct / 100;
    setTerms(prev => prev.map((t, i) => {
      if (i !== idx) return t;
      const principal = t.totalFinanced ?? proposal.term_options.find(ot => ot.years === t.years)?.totalFinanced ?? 0;
      return { ...t, interestRate: annualRate, monthlyPayment: calcMonthlyPayment(principal, annualRate, t.years) };
    }));
  }

  function updateTerm(idx: number, field: keyof TermOption, raw: string) {
    const value = parseFloat(raw);
    if (isNaN(value)) return;
    setTerms(prev => prev.map((t, i) => {
      if (i !== idx) return t;
      const updated = { ...t, [field]: value };
      if (field === 'years') {
        const principal = updated.totalFinanced ?? proposal.term_options.find(ot => ot.years === updated.years)?.totalFinanced ?? 0;
        updated.monthlyPayment = calcMonthlyPayment(principal, updated.interestRate, updated.years);
      }
      return updated;
    }));
  }

  function addTerm() {
    const firstOriginal = proposal.term_options[0];
    const defaultPrincipal = firstOriginal?.totalFinanced ?? 0;
    setTerms(prev => [...prev, {
      years: 5,
      interestRate: 0.07,
      monthlyPayment: calcMonthlyPayment(defaultPrincipal, 0.07, 5),
      totalFinanced: defaultPrincipal,
    }]);
    setRateInputs(prev => [...prev, '7.00']);
  }

  function removeTerm(idx: number) {
    setTerms(prev => prev.filter((_, i) => i !== idx));
    setRateInputs(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const { error: updateErr } = await supabase
        .from('sent_quotes')
        .update({
          custom_term_options: terms,
          admin_review_status: 'rates_applied',
          custom_rates_applied_at: new Date().toISOString(),
          custom_rates_applied_by: admin?.email || 'admin',
          admin_review_notes: notes || null,
        })
        .eq('id', proposal.id);
      if (updateErr) throw updateErr;
      setSavedOk(true);
      onSaved();
    } catch (err: any) {
      setError(err.message || 'Failed to save rates');
    } finally {
      setSaving(false);
    }
  }

  async function handleNotifyPartner() {
    setNotifying(true);
    setError(null);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-partner-custom-rates`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ quoteId: proposal.id }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to notify partner');
      setNotifiedOk(true);
      onSaved();
    } catch (err: any) {
      setError(err.message || 'Failed to notify partner');
    } finally {
      setNotifying(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-[#3A475B]">Custom Rate Terms</p>
          <button
            onClick={addTerm}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#28AA48] hover:text-[#1e8a38] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Term
          </button>
        </div>

        <div className="space-y-2">
          {terms.map((t, idx) => (
            <div key={idx} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-1.5 min-w-0">
                <label className="text-xs text-gray-500 whitespace-nowrap">Years</label>
                <input
                  type="number"
                  min="1"
                  max="25"
                  value={t.years}
                  onChange={e => updateTerm(idx, 'years', e.target.value)}
                  className="w-14 px-2 py-1.5 text-sm border border-gray-300 rounded-md text-center focus:outline-none focus:ring-2 focus:ring-[#28AA48]/30 focus:border-[#28AA48]"
                />
              </div>
              <div className="flex items-center gap-1.5 min-w-0">
                <label className="text-xs text-gray-500 whitespace-nowrap">Rate %</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={rateInputs[idx] ?? (t.interestRate * 100).toFixed(2)}
                  onChange={e => updateRate(idx, e.target.value)}
                  onBlur={e => {
                    const pct = parseFloat(e.target.value);
                    if (!isNaN(pct)) setRateInputs(prev => prev.map((v, i) => i === idx ? pct.toFixed(2) : v));
                  }}
                  className="w-20 px-2 py-1.5 text-sm border border-gray-300 rounded-md text-center focus:outline-none focus:ring-2 focus:ring-[#28AA48]/30 focus:border-[#28AA48]"
                />
              </div>
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <label className="text-xs text-gray-500 whitespace-nowrap">Monthly $</label>
                <div className="flex-1 min-w-0 px-2 py-1.5 text-sm border border-[#28AA48]/40 bg-green-50 rounded-md text-center font-semibold text-[#28AA48]">
                  {new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(t.monthlyPayment)}
                </div>
              </div>
              <button
                onClick={() => removeTerm(idx)}
                className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-[#3A475B] mb-1.5">Notes for Partner <span className="text-gray-400 font-normal">(optional)</span></label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
          placeholder="e.g. Preferential rate applied based on strong credit profile..."
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#28AA48]/30 focus:border-[#28AA48] resize-none"
        />
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          onClick={handleSave}
          disabled={saving || terms.length === 0}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-[#34AC48] to-[#AFD235] rounded-xl hover:shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {saving
            ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Saving…</>
            : savedOk
            ? <><CheckCircle2 className="w-4 h-4" />Saved!</>
            : <><CheckCircle2 className="w-4 h-4" />Save Rates</>
          }
        </button>
        <button
          onClick={handleNotifyPartner}
          disabled={notifying || !proposal.installer_id}
          title={!proposal.installer_id ? 'No partner linked to this proposal' : 'Notify the partner by email'}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-white bg-[#3A475B] rounded-xl hover:bg-[#2d3748] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {notifying
            ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Sending…</>
            : notifiedOk
            ? <><CheckCircle2 className="w-4 h-4" />Notified!</>
            : <><Bell className="w-4 h-4" />Notify Partner</>
          }
        </button>
      </div>

      {notifiedOk && (
        <p className="text-xs text-center text-[#28AA48] font-medium">
          Partner notified by email — they can now send the updated proposal to their client.
        </p>
      )}
      {proposal.partner_notified_at && !notifiedOk && (
        <p className="text-xs text-center text-gray-400">
          Partner was last notified {new Date(proposal.partner_notified_at).toLocaleString('en-AU', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </p>
      )}
    </div>
  );
}

function ProposalRow({ proposal, onUpdated }: { proposal: LargeProposal; onUpdated: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const badge = statusBadge(proposal.admin_review_status);
  const clientName = proposal.recipient_company || proposal.recipient_name || 'Unnamed Client';
  const partnerName = proposal.installer
    ? `${proposal.installer.full_name || ''}${proposal.installer.company_name ? ` — ${proposal.installer.company_name}` : ''}`
    : 'No partner';

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full text-left flex items-center gap-4 px-5 py-4 hover:bg-gray-50/60 transition-colors group bg-white"
      >
        <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <DollarSign className="w-4 h-4 text-amber-600" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className="text-sm font-bold text-[#3A475B] truncate">{clientName}</span>
            <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${badge.cls}`}>
              {badge.label}
            </span>
            {proposal.partner_notified_at && (
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                <Bell className="w-3 h-3" />
                Partner Notified
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 flex-wrap text-xs text-gray-400">
            <span className="text-[#28AA48] font-semibold">{formatQuoteNumber(proposal.quote_number)}</span>
            <span className="flex items-center gap-1"><User className="w-3 h-3" />{partnerName}</span>
            {proposal.site_address && (
              <span className="hidden sm:flex items-center gap-1"><MapPin className="w-3 h-3" />{proposal.site_address}</span>
            )}
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(proposal.created_at).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
          </div>
        </div>

        <div className="hidden sm:block text-right flex-shrink-0 mr-2">
          <p className="text-xs text-gray-400 mb-0.5">Project Cost</p>
          <p className="text-base font-bold text-[#3A475B]">{formatCurrency(proposal.project_cost)}</p>
        </div>

        {expanded
          ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
          : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
        }
      </button>

      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50 px-5 py-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Current / original terms */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Original Terms</p>
              <div className="space-y-2">
                {(proposal.term_options || []).map((t, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-gray-200">
                    <span className="text-sm font-semibold text-[#3A475B]">{t.years}yr</span>
                    <span className="text-sm font-bold text-gray-600">{formatCurrency(t.monthlyPayment)}/mo</span>
                    <span className="text-xs text-gray-400">{(t.interestRate * 100).toFixed(2)}%</span>
                  </div>
                ))}
              </div>

              {proposal.recipient_email && (
                <div className="mt-4 p-3 bg-white rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-400 mb-1">Client Email</p>
                  <p className="text-sm text-[#3A475B]">{proposal.recipient_email}</p>
                </div>
              )}
              {proposal.installer?.email && (
                <div className="mt-2 p-3 bg-white rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-400 mb-1">Partner Email</p>
                  <p className="text-sm text-[#3A475B]">{proposal.installer.email}</p>
                </div>
              )}
              {proposal.custom_rates_applied_at && (
                <div className="mt-2 p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-xs text-gray-500 mb-0.5">Rates applied by</p>
                  <p className="text-sm font-semibold text-green-800">{proposal.custom_rates_applied_by}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{new Date(proposal.custom_rates_applied_at).toLocaleString('en-AU')}</p>
                </div>
              )}
            </div>

            {/* Rate editor */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                {proposal.admin_review_status === 'rates_applied' ? 'Update Custom Rates' : 'Apply Custom Rates'}
              </p>
              <RateEditor proposal={proposal} onSaved={onUpdated} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function LargeProposals() {
  const { admin } = useAdmin();
  const [proposals, setProposals] = useState<LargeProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('all');

  useEffect(() => {
    loadProposals();
  }, []);

  async function loadProposals() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sent_quotes')
        .select(`
          id, quote_number, created_at, installer_id,
          recipient_name, recipient_company, recipient_email, site_address,
          project_cost, term_options, custom_term_options,
          admin_review_status, custom_rates_applied_at, custom_rates_applied_by,
          partner_notified_at, admin_review_notes, calculator_type,
          installer:installer_users(full_name, company_name, email)
        `)
        .eq('requires_admin_review', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProposals((data as unknown as LargeProposal[]) || []);
    } catch (err) {
      console.error('Failed to load large proposals:', err);
    } finally {
      setLoading(false);
    }
  }

  const LARGE_PROPOSAL_EMAILS = ['hello@stellio.com.au', 'andrew@greenfunding.com.au'];
  if (!admin || !LARGE_PROPOSAL_EMAILS.includes(admin.email)) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 text-center">
        <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
        <p className="text-sm font-semibold text-amber-800">Super Admin Access Required</p>
        <p className="text-xs text-amber-700 mt-1">Only super admins can review and adjust rates on large proposals.</p>
      </div>
    );
  }

  const pending = proposals.filter(p => p.admin_review_status === 'pending_review' || !p.admin_review_status);
  const done = proposals.filter(p => p.admin_review_status === 'rates_applied');

  const displayed = filter === 'pending' ? pending : filter === 'done' ? done : proposals;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-[#3A475B]">Large Proposals ($1M+)</h2>
          <p className="text-sm text-gray-500 mt-0.5">Review and apply custom rates for proposals over $1,000,000.</p>
        </div>
        <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg p-1">
          {(['all', 'pending', 'done'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all capitalize ${
                filter === f ? 'bg-[#28AA48] text-white shadow-sm' : 'text-gray-500 hover:text-[#3A475B]'
              }`}
            >
              {f === 'all' ? `All (${proposals.length})` : f === 'pending' ? `Pending (${pending.length})` : `Reviewed (${done.length})`}
            </button>
          ))}
        </div>
      </div>

      {pending.length > 0 && filter !== 'done' && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">{pending.length} proposal{pending.length !== 1 ? 's' : ''} awaiting rate review</p>
            <p className="text-xs text-amber-700 mt-0.5">Review and apply custom rates, then notify the partner so they can send the updated proposal to their client.</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader className="w-6 h-6 animate-spin text-[#28AA48]" />
        </div>
      ) : displayed.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-7 h-7 text-gray-400" />
          </div>
          <p className="text-sm font-semibold text-[#3A475B]">
            {filter === 'pending' ? 'No proposals pending review' : filter === 'done' ? 'No reviewed proposals yet' : 'No large proposals yet'}
          </p>
          <p className="text-xs text-gray-400 mt-1">Proposals over $1,000,000 will appear here for rate review.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map(p => (
            <ProposalRow key={p.id} proposal={p} onUpdated={loadProposals} />
          ))}
        </div>
      )}
    </div>
  );
}
