import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { InstallerLayout } from '../components/InstallerLayout';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import {
  FileText, TrendingUp, ArrowRight,
  DollarSign, Tag, MapPin, Calculator, Users
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

function MiniBar({ data }: { data: MonthlyCount[] }) {
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div className="flex items-end gap-1 h-14">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full bg-[#6EAE3C]/80 rounded-t-sm transition-all"
            style={{ height: `${Math.max((d.count / max) * 48, d.count > 0 ? 4 : 0)}px` }}
          />
        </div>
      ))}
    </div>
  );
}

export function InstallerDashboard() {
  const navigate = useNavigate();
  const { installerProfile } = useAuth();
  const { updateState, resetState } = useApp();
  const [recentQuotes, setRecentQuotes] = useState<QuoteSummary[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyCount[]>([]);
  const [totalProjectValue, setTotalProjectValue] = useState(0);
  const [calcStates, setCalcStates] = useState<CalcConfig>({ rental: true, serviced_rental: false, progress_payment_rental: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (installerProfile) loadData();
  }, [installerProfile]);

  async function loadData() {
    if (!installerProfile) return;
    setLoading(true);
    try {
      const [quotesResult, configResult] = await Promise.all([
        supabase
          .from('sent_quotes')
          .select('id, quote_number, created_at, recipient_name, recipient_company, project_cost, calculator_type, status, site_address, term_options')
          .eq('installer_id', installerProfile.id)
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
    {
      id: 'rental',
      title: 'Rental',
      description: 'Calculate financing options for renewable services.',
      icon: Calculator,
      calcType: 'rental' as const,
      path: '/calculator/step1',
    },
    {
      id: 'serviced_rental',
      title: 'Serviced Rental',
      description: 'Includes service & maintenance packages.',
      icon: TrendingUp,
      calcType: 'serviced_rental' as const,
      path: '/calculator/serviced-rental-step1',
    },
    {
      id: 'progress_payment_rental',
      title: 'Progress Payment',
      description: 'Flexible payments tied to project milestones.',
      icon: Users,
      calcType: 'progress_payment_rental' as const,
      path: '/calculator/step1',
    },
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

  return (
    <InstallerLayout>
      <div className="max-w-5xl mx-auto space-y-7">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-[#3A475B]">
              Welcome back, {firstName}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {profile?.company_name} &middot; Here's your activity overview
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
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-medium text-sm transition-all whitespace-nowrap ${
                    calc.available
                      ? 'bg-[#6EAE3C] border-[#6EAE3C] text-white hover:bg-[#5d9432] hover:border-[#5d9432] shadow-sm'
                      : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>New {calc.title} Quote</span>
                  {!calc.available && <span className="text-[10px] font-normal ml-1">(Coming Soon)</span>}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-xs font-medium text-gray-500">Total Quotes</span>
            </div>
            <div className="text-3xl font-bold text-[#3A475B]">{quoteCount}</div>
            <div className="text-xs text-gray-400 mt-1">Finance calculations</div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-amber-600" />
              </div>
              <span className="text-xs font-medium text-gray-500">This Month</span>
            </div>
            <div className="text-3xl font-bold text-[#3A475B]">{thisMonthQuotes}</div>
            <div className="flex items-center gap-1 mt-1">
              {quoteTrend !== 0 && (
                <span className={`text-xs font-semibold ${quoteTrend > 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {quoteTrend > 0 ? '+' : ''}{quoteTrend}% vs last month
                </span>
              )}
              {quoteTrend === 0 && <span className="text-xs text-gray-400">vs last month</span>}
            </div>
          </div>

          <div className="col-span-2 lg:col-span-1 bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-teal-50 rounded-lg flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-teal-600" />
              </div>
              <span className="text-xs font-medium text-gray-500">Pipeline Value</span>
            </div>
            <div className="text-2xl font-bold text-[#3A475B] leading-tight">{formatCurrency(totalProjectValue)}</div>
            <div className="text-xs text-gray-400 mt-1">Total project costs</div>
          </div>
        </div>

        {monthlyData.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-[#3A475B] mb-4">Quote Activity (Last 6 Months)</h3>
            <MiniBar data={monthlyData} />
            <div className="flex justify-between mt-2">
              {monthlyData.map((d, i) => (
                <span key={i} className="text-[10px] text-gray-400 flex-1 text-center">{d.month}</span>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#3A475B]">Recent Quotes</h3>
            <button
              onClick={() => navigate('/quotes')}
              className="flex items-center gap-1 text-xs font-medium text-[#6EAE3C] hover:underline"
            >
              View all
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {loading ? (
            <div className="py-10 text-center text-gray-400 text-sm">Loading...</div>
          ) : recentQuotes.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <FileText className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">No quotes yet — use the calculator above to get started</p>
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
                    className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors text-left group"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-[#6EAE3C] to-[#8BC83F] rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-[#3A475B] truncate">
                          {q.recipient_company || q.recipient_name || 'Unnamed Client'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
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
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 hidden sm:block">
                      <div className="text-sm font-bold text-[#3A475B]">{formatCurrency(q.project_cost)}</div>
                      {lowestPayment && (
                        <div className="text-xs text-[#28AA48]">{formatCurrency(lowestPayment)}/mo</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-gray-400">
                        {new Date(q.created_at).toLocaleDateString('en-AU', { day: '2-digit', month: 'short' })}
                      </span>
                      <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#6EAE3C] transition-colors" />
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
