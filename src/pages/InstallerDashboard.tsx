import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { InstallerLayout } from '../components/InstallerLayout';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import {
  FileText, FileCheck, TrendingUp, Calculator, ArrowRight,
  Calendar, DollarSign, Tag, MapPin
} from 'lucide-react';

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

function statusBadge(status: string) {
  switch (status) {
    case 'application_submitted':
      return { label: 'App Submitted', cls: 'bg-green-100 text-green-700 border-green-200' };
    case 'application_started':
      return { label: 'App Started', cls: 'bg-blue-100 text-blue-700 border-blue-200' };
    default:
      return { label: 'Quote', cls: 'bg-gray-100 text-gray-600 border-gray-200' };
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
  const [recentQuotes, setRecentQuotes] = useState<QuoteSummary[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyCount[]>([]);
  const [totalProjectValue, setTotalProjectValue] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (installerProfile) loadData();
  }, [installerProfile]);

  async function loadData() {
    if (!installerProfile) return;
    setLoading(true);
    try {
      const { data: quotes } = await supabase
        .from('sent_quotes')
        .select('id, quote_number, created_at, recipient_name, recipient_company, project_cost, calculator_type, status, site_address, term_options')
        .eq('installer_id', installerProfile.id)
        .order('created_at', { ascending: false });

      if (quotes) {
        setRecentQuotes(quotes.slice(0, 5));
        const total = quotes.reduce((sum, q) => sum + (q.project_cost || 0), 0);
        setTotalProjectValue(total);

        const now = new Date();
        const months: MonthlyCount[] = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const label = d.toLocaleDateString('en-AU', { month: 'short' });
          const count = quotes.filter(q => {
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

  const profile = installerProfile;
  const firstName = profile?.full_name?.split(' ')[0] || 'Installer';
  const quoteCount = profile?.quote_count || 0;
  const appCount = profile?.application_count || 0;
  const conversionRate = quoteCount > 0 ? Math.round((appCount / quoteCount) * 100) : 0;

  const thisMonthQuotes = monthlyData[monthlyData.length - 1]?.count || 0;
  const lastMonthQuotes = monthlyData[monthlyData.length - 2]?.count || 0;
  const quoteTrend = lastMonthQuotes > 0
    ? Math.round(((thisMonthQuotes - lastMonthQuotes) / lastMonthQuotes) * 100)
    : thisMonthQuotes > 0 ? 100 : 0;

  return (
    <InstallerLayout>
      <div className="max-w-5xl mx-auto space-y-7">
        <div>
          <h1 className="text-2xl font-bold text-[#3A475B]">
            Welcome back, {firstName}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {profile?.company_name} &middot; Here's your activity overview
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
              <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                <FileCheck className="w-4 h-4 text-[#6EAE3C]" />
              </div>
              <span className="text-xs font-medium text-gray-500">Applications</span>
            </div>
            <div className="text-3xl font-bold text-[#3A475B]">{appCount}</div>
            <div className="text-xs text-gray-400 mt-1">Submitted for review</div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-amber-600" />
              </div>
              <span className="text-xs font-medium text-gray-500">Conversion</span>
            </div>
            <div className="text-3xl font-bold text-[#3A475B]">{conversionRate}%</div>
            <div className="text-xs text-gray-400 mt-1">Quote to application</div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[#3A475B]">Quotes This Month</h3>
              {quoteTrend !== 0 && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${quoteTrend > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {quoteTrend > 0 ? '+' : ''}{quoteTrend}%
                </span>
              )}
            </div>
            <div className="text-4xl font-bold text-[#3A475B] mb-4">{thisMonthQuotes}</div>
            {monthlyData.length > 0 && <MiniBar data={monthlyData} />}
            <div className="flex justify-between mt-1">
              {monthlyData.map((d, i) => (
                <span key={i} className="text-[10px] text-gray-400 flex-1 text-center">{d.month}</span>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[#3A475B]">Quick Actions</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => navigate('/calculators')}
                className="flex items-center gap-3 p-4 bg-gradient-to-br from-[#6EAE3C]/5 to-[#6EAE3C]/10 border border-[#6EAE3C]/20 rounded-xl hover:border-[#6EAE3C]/40 hover:shadow-sm transition-all text-left"
              >
                <div className="w-10 h-10 bg-[#6EAE3C] rounded-lg flex items-center justify-center flex-shrink-0">
                  <Calculator className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-[#3A475B]">New Quote</div>
                  <div className="text-xs text-gray-500">Generate a finance quote</div>
                </div>
              </button>

              <button
                onClick={() => navigate('/quotes')}
                className="flex items-center gap-3 p-4 bg-blue-50/50 border border-blue-100 rounded-xl hover:border-blue-200 hover:shadow-sm transition-all text-left"
              >
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-[#3A475B]">My Quotes</div>
                  <div className="text-xs text-gray-500">View all generated quotes</div>
                </div>
              </button>

              <button
                onClick={() => navigate('/submissions')}
                className="flex items-center gap-3 p-4 bg-green-50/50 border border-green-100 rounded-xl hover:border-green-200 hover:shadow-sm transition-all text-left"
              >
                <div className="w-10 h-10 bg-[#28AA48] rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-[#3A475B]">Submissions</div>
                  <div className="text-xs text-gray-500">Track applications</div>
                </div>
              </button>

              <button
                onClick={() => navigate('/my-account')}
                className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-sm transition-all text-left"
              >
                <div className="w-10 h-10 bg-gray-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Calculator className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-[#3A475B]">My Account</div>
                  <div className="text-xs text-gray-500">Profile & security</div>
                </div>
              </button>
            </div>
          </div>
        </div>

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
              <p className="text-sm text-gray-500 mb-4">No quotes yet</p>
              <button
                onClick={() => navigate('/calculators')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#6EAE3C] text-white text-sm font-medium rounded-lg hover:bg-[#5d9432] transition-colors"
              >
                Generate your first quote
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentQuotes.map(q => {
                const badge = statusBadge(q.status || 'generated');
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
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border flex-shrink-0 ${badge.cls}`}>
                          {badge.label}
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
      </div>
    </InstallerLayout>
  );
}
