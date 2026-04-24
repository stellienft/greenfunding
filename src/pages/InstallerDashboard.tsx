import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { InstallerLayout } from '../components/InstallerLayout';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import {
  FileText, TrendingUp, ArrowRight,
  DollarSign, Tag, MapPin, Calculator, Users, CheckCircle2,
  ChevronRight, Clock, Zap
} from 'lucide-react';
import { InstallerEmailTemplates } from '../components/installer/EmailTemplates';

interface QuoteSummary {
  id: string;
  quote_number: number;
  created_at: string;
  recipient_name: string | null;
  recipient_company: string | null;
  project_cost: number;
  calculator_type: string;
  status: string;
  site_address: string | null;
  term_options: Array<{ years: number; monthlyPayment: number }>;
  pipedrive_synced_at: string | null;
  pipedrive_stage_name: string | null;
  accepted_at: string | null;
}

interface MonthlyCount {
  month: string;
  count: number;
}

interface CalcConfig {
  rental: boolean;
  serviced_rental: boolean;
  progress_payment_rental: boolean;
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n);
}

function formatCurrencyCompact(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return formatCurrency(n);
}

function formatQuoteNumber(n: number) {
  return `#${String(n).padStart(6, '0')}`;
}

function calcTypeLabel(t: string) {
  switch (t) {
    case 'progress_payment_rental': return 'Progress Payment';
    case 'serviced_rental': return 'Serviced Rental';
    default: return 'Rental';
  }
}

function ActivityChart({ data }: { data: MonthlyCount[] }) {
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div className="flex items-end gap-2 h-16">
      {data.map((d, i) => {
        const isLast = i === data.length - 1;
        const height = Math.max((d.count / max) * 56, d.count > 0 ? 6 : 2);
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
            <div
              className={`w-full rounded-md transition-all ${isLast ? 'bg-[#6EAE3C]' : 'bg-[#6EAE3C]/30'}`}
              style={{ height: `${height}px` }}
            />
            <span className="text-[10px] text-gray-400 font-medium">{d.month}</span>
          </div>
        );
      })}
    </div>
  );
}

export function InstallerDashboard() {
  const navigate = useNavigate();
  const { installerProfile } = useAuth();
  const { updateState, resetState } = useApp();
  const [recentQuotes, setRecentQuotes] = useState<QuoteSummary[]>([]);
  const [acceptedQuotes, setAcceptedQuotes] = useState<QuoteSummary[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyCount[]>([]);
  const [totalProjectValue, setTotalProjectValue] = useState(0);
  const [calcStates, setCalcStates] = useState<CalcConfig>({ rental: true, serviced_rental: false, progress_payment_rental: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (installerProfile) loadData();
  }, [installerProfile]);

  useEffect(() => {
    if (!installerProfile) return;

    const refreshPipedriveStatus = async () => {
      const { data } = await supabase
        .from('sent_quotes')
        .select('id, pipedrive_stage_name, pipedrive_synced_at')
        .eq('installer_id', installerProfile.id);

      if (!data) return;

      const statusMap = new Map(data.map(r => [r.id, { pipedrive_stage_name: r.pipedrive_stage_name, pipedrive_synced_at: r.pipedrive_synced_at }]));

      setRecentQuotes(prev => prev.map(q => {
        const s = statusMap.get(q.id);
        return s ? { ...q, ...s } : q;
      }));
      setAcceptedQuotes(prev => prev.map(q => {
        const s = statusMap.get(q.id);
        return s ? { ...q, ...s } : q;
      }));
    };

    const interval = setInterval(refreshPipedriveStatus, 5000);
    return () => clearInterval(interval);
  }, [installerProfile]);

  async function loadData() {
    if (!installerProfile) return;
    setLoading(true);
    try {
      const [quotesResult, acceptedResult, configResult] = await Promise.all([
        supabase
          .from('sent_quotes')
          .select('id, quote_number, created_at, recipient_name, recipient_company, project_cost, calculator_type, status, site_address, term_options, pipedrive_synced_at, pipedrive_stage_name, accepted_at')
          .eq('installer_id', installerProfile.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('sent_quotes')
          .select('id, quote_number, created_at, recipient_name, recipient_company, project_cost, calculator_type, status, site_address, term_options, pipedrive_synced_at, pipedrive_stage_name, accepted_at')
          .eq('installer_id', installerProfile.id)
          .eq('status', 'accepted')
          .order('created_at', { ascending: false }),
        supabase
          .from('calculator_config')
          .select('calculator_type, enabled'),
      ]);

      if (configResult.data) {
        const states: Record<string, boolean> = {};
        configResult.data.forEach(row => { states[row.calculator_type] = row.enabled || false; });
        setCalcStates(states as CalcConfig);
      }

      if (acceptedResult.data) setAcceptedQuotes(acceptedResult.data);

      if (quotesResult.data) {
        setRecentQuotes(quotesResult.data.slice(0, 5));
        const total = quotesResult.data.reduce((sum, q) => sum + (q.project_cost || 0), 0);
        setTotalProjectValue(total);

        const now = new Date();
        const months: MonthlyCount[] = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const label = d.toLocaleDateString('en-AU', { month: 'short' });
          const count = quotesResult.data.filter(q => {
            const qd = new Date(q.created_at);
            return qd.getFullYear() === d.getFullYear() && qd.getMonth() === d.getMonth();
          }).length;
          months.push({ month: label, count });
        }
        setMonthlyData(months);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleCalculatorClick = (calcType: 'rental' | 'progress_payment_rental' | 'serviced_rental', path: string) => {
    resetState();
    updateState({ calculatorType: calcType });
    navigate(path);
  };

  const allowedCalcs = installerProfile?.allowed_calculators;
  const isAllowed = (key: string) =>
    !allowedCalcs || allowedCalcs.length === 0 || allowedCalcs.includes(key);

  const allCalcDefs = [
    { id: 'rental', title: 'Rental', icon: Calculator, calcType: 'rental' as const, path: '/calculator/step1' },
    { id: 'serviced_rental', title: 'Serviced Rental', icon: TrendingUp, calcType: 'serviced_rental' as const, path: '/calculator/serviced-rental-step1' },
    { id: 'progress_payment_rental', title: 'Progress Payment', icon: Users, calcType: 'progress_payment_rental' as const, path: '/calculator/step1' },
  ];

  const calculators = allCalcDefs
    .filter(c => isAllowed(c.id))
    .map(c => ({ ...c, available: (calcStates as Record<string, boolean>)[c.id] ?? false }));

  const profile = installerProfile;
  const firstName = profile?.full_name?.split(' ')[0] || 'Installer';
  const quoteCount = profile?.quote_count || 0;
  const thisMonthQuotes = monthlyData[monthlyData.length - 1]?.count || 0;
  const lastMonthQuotes = monthlyData[monthlyData.length - 2]?.count || 0;
  const quoteTrend = lastMonthQuotes > 0
    ? Math.round(((thisMonthQuotes - lastMonthQuotes) / lastMonthQuotes) * 100)
    : thisMonthQuotes > 0 ? 100 : 0;

  const availableCalcs = calculators.filter(c => c.available);
  const primaryCalc = availableCalcs[0];

  return (
    <InstallerLayout>
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap pt-1">
          <div>
            <h1 className="text-2xl font-bold text-[#1e2d3d] tracking-tight">
              Welcome back, {firstName}
            </h1>
            <p className="text-sm text-gray-400 mt-0.5 font-medium">
              {profile?.company_name}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {calculators.map(calc => {
              const Icon = calc.icon;
              return (
                <button
                  key={calc.id}
                  disabled={!calc.available}
                  onClick={() => calc.available && handleCalculatorClick(calc.calcType, calc.path)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${
                    calc.available
                      ? 'bg-[#6EAE3C] text-white hover:bg-[#5d9432] shadow-sm hover:shadow-md'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>New Proposal</span>
                  {!calc.available && <span className="text-[10px] font-normal ml-0.5 opacity-70">(Soon)</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Total Proposals</span>
              <div className="w-8 h-8 bg-[#EEF7E8] rounded-xl flex items-center justify-center">
                <FileText className="w-4 h-4 text-[#6EAE3C]" />
              </div>
            </div>
            <div className="text-3xl font-bold text-[#1e2d3d] tabular-nums">{quoteCount}</div>
            <div className="text-xs text-gray-400 mt-1.5 font-medium">Finance calculations</div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">This Month</span>
              <div className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center">
                <Zap className="w-4 h-4 text-amber-500" />
              </div>
            </div>
            <div className="text-3xl font-bold text-[#1e2d3d] tabular-nums">{thisMonthQuotes}</div>
            <div className="flex items-center gap-1 mt-1.5">
              {quoteTrend !== 0 ? (
                <span className={`text-xs font-semibold ${quoteTrend > 0 ? 'text-[#6EAE3C]' : 'text-red-500'}`}>
                  {quoteTrend > 0 ? '+' : ''}{quoteTrend}% vs last month
                </span>
              ) : (
                <span className="text-xs text-gray-400 font-medium">vs last month</span>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Pipeline Value</span>
              <div className="w-8 h-8 bg-teal-50 rounded-xl flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-teal-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-[#1e2d3d] leading-tight tabular-nums">{formatCurrencyCompact(totalProjectValue)}</div>
            <div className="text-xs text-gray-400 mt-1.5 font-medium">Total project costs</div>
          </div>
        </div>

        {/* Activity Chart + Accepted summary row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <span className="text-sm font-semibold text-[#1e2d3d]">Proposal Activity</span>
              <span className="text-xs text-gray-400 font-medium">Last 6 months</span>
            </div>
            {monthlyData.length > 0 && <ActivityChart data={monthlyData} />}
          </div>

          <div
            className="bg-gradient-to-br from-[#EEF7E8] to-[#f5faf0] rounded-2xl border border-[#d4edbc] p-5 shadow-sm flex flex-col justify-between cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate('/quotes')}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-[#4a8a28] uppercase tracking-wide">Accepted</span>
              <div className="w-8 h-8 bg-white/60 rounded-xl flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-[#6EAE3C]" />
              </div>
            </div>
            <div className="text-4xl font-bold text-[#3a6e1e] tabular-nums">{acceptedQuotes.length}</div>
            <div className="text-xs text-[#4a8a28] font-medium mt-1.5">
              {acceptedQuotes.length === 1 ? 'proposal accepted' : 'proposals accepted'}
            </div>
            <div className="flex items-center gap-1 mt-4 text-xs font-semibold text-[#6EAE3C]">
              View all
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        {/* Accepted Proposals */}
        {!loading && acceptedQuotes.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-[#6EAE3C]" />
                <h3 className="text-sm font-bold text-[#1e2d3d]">Accepted Proposals</h3>
                <span className="text-xs font-bold text-white bg-[#6EAE3C] px-2 py-0.5 rounded-full">{acceptedQuotes.length}</span>
              </div>
              <button
                onClick={() => navigate('/quotes')}
                className="flex items-center gap-1 text-xs font-semibold text-[#6EAE3C] hover:text-[#5d9432] transition-colors"
              >
                View all
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-gray-50">
              {acceptedQuotes.map(q => {
                const lowestPayment = q.term_options?.length
                  ? Math.min(...q.term_options.map(t => t.monthlyPayment))
                  : null;
                const hasPipedriveStage = !!q.pipedrive_stage_name;
                const isSyncedToPipedrive = !!q.pipedrive_synced_at;
                const pendingSync = (q.accepted_at || q.status === 'accepted') && !isSyncedToPipedrive;
                return (
                  <button
                    key={q.id}
                    onClick={() => navigate(`/quotes/${q.id}`)}
                    className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50/60 transition-colors text-left group"
                  >
                    <div className="w-9 h-9 bg-[#EEF7E8] rounded-xl flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 text-[#6EAE3C]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="text-sm font-bold text-[#1e2d3d] truncate">
                          {q.recipient_company || q.recipient_name || 'Unnamed Client'}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#3a6e1e] bg-[#EEF7E8] border border-[#c3e29e] px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          Accepted
                        </span>
                        {hasPipedriveStage && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#28AA48] inline-block flex-shrink-0" />
                            {q.pipedrive_stage_name}
                          </span>
                        )}
                        {isSyncedToPipedrive && !hasPipedriveStage && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" />
                            In Pipedrive
                          </span>
                        )}
                        {pendingSync && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                            <Clock className="w-3 h-3" />
                            Pending CRM sync
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-xs text-[#6EAE3C] font-bold">{formatQuoteNumber(q.quote_number)}</span>
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
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 hidden sm:block">
                      <div className="text-sm font-bold text-[#1e2d3d]">{formatCurrency(q.project_cost)}</div>
                      {lowestPayment && (
                        <div className="text-xs text-[#6EAE3C] font-semibold">{formatCurrency(lowestPayment)}/mo</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-gray-400 font-medium">
                        {new Date(q.created_at).toLocaleDateString('en-AU', { day: '2-digit', month: 'short' })}
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#6EAE3C] transition-colors" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent Proposals */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-gray-300" />
              <h3 className="text-sm font-bold text-[#1e2d3d]">Recent Proposals</h3>
            </div>
            <button
              onClick={() => navigate('/quotes')}
              className="flex items-center gap-1 text-xs font-semibold text-[#6EAE3C] hover:text-[#5d9432] transition-colors"
            >
              View all
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {loading ? (
            <div className="py-12 text-center">
              <div className="w-5 h-5 border-2 border-[#6EAE3C]/30 border-t-[#6EAE3C] rounded-full animate-spin mx-auto" />
            </div>
          ) : recentQuotes.length === 0 ? (
            <div className="py-14 text-center">
              <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <FileText className="w-5 h-5 text-gray-300" />
              </div>
              <p className="text-sm text-gray-400 font-medium">No proposals yet</p>
              <p className="text-xs text-gray-300 mt-1">Use the calculator above to get started</p>
              {primaryCalc && (
                <button
                  onClick={() => handleCalculatorClick(primaryCalc.calcType, primaryCalc.path)}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#6EAE3C] text-white text-sm font-semibold rounded-xl hover:bg-[#5d9432] transition-colors"
                >
                  <Calculator className="w-4 h-4" />
                  New Proposal
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentQuotes.map(q => {
                const lowestPayment = q.term_options?.length
                  ? Math.min(...q.term_options.map(t => t.monthlyPayment))
                  : null;
                return (
                  <button
                    key={q.id}
                    onClick={() => navigate(`/quotes/${q.id}`)}
                    className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50/60 transition-colors text-left group"
                  >
                    <div className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-[#EEF7E8] transition-colors">
                      <FileText className="w-4 h-4 text-gray-400 group-hover:text-[#6EAE3C] transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="text-sm font-bold text-[#1e2d3d] truncate">
                          {q.recipient_company || q.recipient_name || 'Unnamed Client'}
                        </span>
                        {q.status === 'accepted' && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#3a6e1e] bg-[#EEF7E8] border border-[#c3e29e] px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" />
                            Accepted
                          </span>
                        )}
                        {q.pipedrive_stage_name && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#28AA48] inline-block flex-shrink-0" />
                            {q.pipedrive_stage_name}
                          </span>
                        )}
                        {q.pipedrive_synced_at && !q.pipedrive_stage_name && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" />
                            In Pipedrive
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-xs text-[#6EAE3C] font-bold">{formatQuoteNumber(q.quote_number)}</span>
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
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 hidden sm:block">
                      <div className="text-sm font-bold text-[#1e2d3d]">{formatCurrency(q.project_cost)}</div>
                      {lowestPayment && (
                        <div className="text-xs text-[#6EAE3C] font-semibold">{formatCurrency(lowestPayment)}/mo</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-gray-400 font-medium">
                        {new Date(q.created_at).toLocaleDateString('en-AU', { day: '2-digit', month: 'short' })}
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#6EAE3C] transition-colors" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <InstallerEmailTemplates />
      </div>
    </InstallerLayout>
  );
}
