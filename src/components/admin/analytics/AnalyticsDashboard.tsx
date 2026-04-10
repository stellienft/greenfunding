import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import type { Quote, Application, InstallerUser, InstallerStats, DealScore, Opportunity, DateFilter } from './types';
import { filterByDate, calcInstallerStats, calcDealScore, generateOpportunities, getLoanBucket, formatCurrency } from './utils';
import { KPICards } from './KPICards';
import { SimpleBar } from './SimpleBar';
import { FunnelChart } from './FunnelChart';
import { InstallerTable } from './InstallerTable';
import { DealScoresList } from './DealScoresList';
import { OpportunitiesFeed } from './OpportunitiesFeed';
import { DateRangePicker } from './DateRangePicker';
import { RefreshCw, Download } from 'lucide-react';

const CALC_TYPE_LABELS: Record<string, string> = {
  rental: 'Rental',
  serviced_rental: 'Serviced Rental',
  progress_payment_rental: 'Progress Payment',
};

function defaultFilter(): DateFilter {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return {
    range: '30d',
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
  };
}

export function AnalyticsDashboard() {
  const [allQuotes, setAllQuotes] = useState<Quote[]>([]);
  const [allApplications, setAllApplications] = useState<Application[]>([]);
  const [allInstallers, setAllInstallers] = useState<InstallerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [filter, setFilter] = useState<DateFilter>(defaultFilter());
  const [activeSection, setActiveSection] = useState<'overview' | 'quotes' | 'behaviour' | 'funnel' | 'installers' | 'scores' | 'opportunities'>('overview');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [quotesRes, appsRes, installersRes] = await Promise.all([
        supabase
          .from('sent_quotes')
          .select('id, quote_number, created_at, installer_id, project_cost, term_options, asset_names, calculator_type, payment_timing, status')
          .order('created_at', { ascending: false }),
        supabase
          .from('applications')
          .select('id, created_at, installer_id, project_cost, loan_term_years, full_name, email')
          .order('created_at', { ascending: false }),
        supabase
          .from('installer_users')
          .select('id, full_name, company_name, email, created_at, quote_count, application_count, user_type'),
      ]);

      const installers = (installersRes.data ?? []) as InstallerUser[];
      const installerMap = new Map(installers.map(i => [i.id, i]));

      const rawQuotes = (quotesRes.data ?? []) as Array<Omit<Quote, 'installer'>& { installer_id: string | null }>;
      const quotesWithInstaller: Quote[] = rawQuotes.map(q => ({
        ...q,
        installer: q.installer_id ? (installerMap.get(q.installer_id) ?? null) as Quote['installer'] : null,
      }));

      setAllQuotes(quotesWithInstaller);
      setAllApplications((appsRes.data ?? []) as unknown as Application[]);
      setAllInstallers(installers);
      setLastRefresh(new Date());
    } catch (e) {
      console.error('Analytics load error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [load]);

  const quotes = filterByDate(allQuotes, filter);
  const applications = filterByDate(allApplications, filter);
  const installerStats: InstallerStats[] = calcInstallerStats(allQuotes, allApplications, allInstallers);

  const dealScores: DealScore[] = quotes.map(q => {
    const is = installerStats.find(s => s.id === q.installer_id);
    return calcDealScore(q, is);
  });

  const opportunities: Opportunity[] = generateOpportunities(allQuotes, installerStats, dealScores);

  const calcTypeData = Object.entries(
    quotes.reduce((acc: Record<string, { count: number; value: number }>, q) => {
      const k = q.calculator_type ?? 'rental';
      if (!acc[k]) acc[k] = { count: 0, value: 0 };
      acc[k].count++;
      acc[k].value += Number(q.project_cost);
      return acc;
    }, {})
  ).map(([k, v]) => ({
    label: CALC_TYPE_LABELS[k] ?? k,
    value: v.count,
    formatted: `${v.count} quotes`,
  }));

  const assetData = Object.entries(
    quotes.reduce((acc: Record<string, number>, q) => {
      (q.asset_names ?? []).forEach(a => {
        acc[a] = (acc[a] ?? 0) + 1;
      });
      return acc;
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, value]) => ({ label, value }));

  const paymentTimingData = [
    {
      label: 'Arrears',
      value: quotes.filter(q => q.payment_timing === 'arrears').length,
      color: 'bg-blue-500',
    },
    {
      label: 'Advance',
      value: quotes.filter(q => q.payment_timing === 'advance').length,
      color: 'bg-cyan-400',
    },
  ];

  const allTerms = quotes.flatMap(q => (q.term_options ?? []).map(t => t.years));
  const termCounts: Record<number, number> = {};
  allTerms.forEach(y => { termCounts[y] = (termCounts[y] ?? 0) + 1; });
  const termData = Object.entries(termCounts)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([years, count]) => ({
      label: `${years} yr`,
      value: count,
    }));

  const bucketData = Object.entries(
    quotes.reduce((acc: Record<string, number>, q) => {
      const b = getLoanBucket(Number(q.project_cost));
      acc[b] = (acc[b] ?? 0) + 1;
      return acc;
    }, {})
  ).map(([label, value]) => ({ label, value }));

  const bucketOrder = ['$0–50K', '$50K–100K', '$100K–250K', '$250K–500K', '$500K+'];
  bucketData.sort((a, b) => bucketOrder.indexOf(a.label) - bucketOrder.indexOf(b.label));

  const exportCSV = () => {
    const rows = [
      ['Quote Date', 'Calculator Type', 'Asset Names', 'Project Cost', 'Payment Timing', 'Status', 'Installer'],
      ...quotes.map(q => [
        q.created_at.split('T')[0],
        q.calculator_type,
        (q.asset_names ?? []).join('; '),
        q.project_cost,
        q.payment_timing,
        q.status,
        q.installer?.company_name ?? q.installer?.full_name ?? '',
      ]),
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `analytics-export-${filter.from}-to-${filter.to}.csv`;
    a.click();
  };

  const sections = [
    { id: 'overview', label: 'Overview' },
    { id: 'quotes', label: 'Quote Analytics' },
    { id: 'behaviour', label: 'Behavioural' },
    { id: 'funnel', label: 'Funnel' },
    { id: 'installers', label: 'Installers' },
    { id: 'scores', label: 'Deal Scores' },
    { id: 'opportunities', label: 'Opportunities' },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#3A475B]">Analytics</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Last updated {lastRefresh.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <DateRangePicker filter={filter} onChange={setFilter} />
          <button
            onClick={load}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#28AA48] rounded-lg hover:bg-[#22943e] transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl flex-wrap">
        {sections.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSection === s.id
                ? 'bg-white text-[#3A475B] shadow-sm'
                : 'text-gray-500 hover:text-[#3A475B]'
            }`}
          >
            {s.label}
            {s.id === 'opportunities' && opportunities.length > 0 && (
              <span className="ml-1.5 bg-[#28AA48] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                {opportunities.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading && (
        <div className="text-center py-16 text-gray-400 text-sm">Loading analytics data...</div>
      )}

      {!loading && (
        <>
          {activeSection === 'overview' && (
            <div className="space-y-6">
              <KPICards quotes={quotes} applications={applications} installerStats={installerStats} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <FunnelChart quotes={quotes} applications={applications} />
                <OpportunitiesFeed opportunities={opportunities.slice(0, 4)} />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <SimpleBar title="Quotes by Calculator Type" items={calcTypeData} />
                <SimpleBar title="Loan Amount Distribution" items={bucketData} />
                <SimpleBar title="Payment Timing" items={paymentTimingData} />
              </div>
            </div>
          )}

          {activeSection === 'quotes' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <SimpleBar title="Quotes by Calculator Type" items={calcTypeData} />
                <SimpleBar
                  title="Quotes by Calculator Type — Total Value"
                  items={Object.entries(
                    quotes.reduce((acc: Record<string, number>, q) => {
                      const k = CALC_TYPE_LABELS[q.calculator_type] ?? q.calculator_type;
                      acc[k] = (acc[k] ?? 0) + Number(q.project_cost);
                      return acc;
                    }, {})
                  ).map(([label, value]) => ({
                    label,
                    value,
                    formatted: formatCurrency(value),
                    color: 'bg-emerald-500',
                  }))}
                />
              </div>
              <SimpleBar title="Top Assets by Quote Volume" items={assetData} />
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-[#3A475B] mb-4">Quote Volume Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Quotes', value: quotes.length.toString() },
                    { label: 'Total Value', value: formatCurrency(quotes.reduce((s, q) => s + Number(q.project_cost), 0)) },
                    { label: 'Avg Deal Size', value: formatCurrency(quotes.length ? quotes.reduce((s, q) => s + Number(q.project_cost), 0) / quotes.length : 0) },
                    { label: 'Unique Assets', value: new Set(quotes.flatMap(q => q.asset_names ?? [])).size.toString() },
                  ].map(m => (
                    <div key={m.label} className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500">{m.label}</p>
                      <p className="text-lg font-bold text-[#3A475B] mt-0.5">{m.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'behaviour' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <SimpleBar title="Payment Timing Distribution" items={paymentTimingData} />
                <SimpleBar title="Loan Term Popularity" items={termData} />
              </div>
              <SimpleBar title="Loan Amount Distribution" items={bucketData} />
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-[#3A475B] mb-4">Loan Term vs Asset Correlation</h3>
                {assetData.slice(0, 5).length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No data available</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left py-2 px-3 text-gray-500 font-semibold">Asset</th>
                          {[2, 3, 5, 7, 10].map(y => (
                            <th key={y} className="text-center py-2 px-3 text-gray-500 font-semibold">{y}yr</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {assetData.slice(0, 6).map(a => {
                          const assetQuotes = quotes.filter(q => (q.asset_names ?? []).includes(a.label));
                          return (
                            <tr key={a.label} className="border-b border-gray-50 hover:bg-gray-50">
                              <td className="py-2 px-3 font-medium text-[#3A475B]">{a.label}</td>
                              {[2, 3, 5, 7, 10].map(y => {
                                const count = assetQuotes.filter(q =>
                                  (q.term_options ?? []).some(t => t.years === y)
                                ).length;
                                return (
                                  <td key={y} className="py-2 px-3 text-center">
                                    <span className={`font-semibold ${count > 0 ? 'text-[#3A475B]' : 'text-gray-300'}`}>
                                      {count || '—'}
                                    </span>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === 'funnel' && (
            <div className="space-y-5">
              <FunnelChart quotes={quotes} applications={applications} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <SimpleBar
                  title="Funnel by Calculator Type"
                  items={Object.entries(
                    quotes.reduce((acc: Record<string, { total: number; converted: number }>, q) => {
                      const k = CALC_TYPE_LABELS[q.calculator_type] ?? q.calculator_type;
                      if (!acc[k]) acc[k] = { total: 0, converted: 0 };
                      acc[k].total++;
                      if (q.status === 'application_submitted' || q.status === 'application_started') acc[k].converted++;
                      return acc;
                    }, {})
                  ).map(([label, v]) => ({
                    label,
                    value: v.total > 0 ? Math.round((v.converted / v.total) * 100) : 0,
                    formatted: `${v.total > 0 ? Math.round((v.converted / v.total) * 100) : 0}% conv.`,
                    color: 'bg-emerald-500',
                  }))}
                />
                <SimpleBar
                  title="Conversion Rate by Asset Type"
                  items={assetData.slice(0, 6).map(a => {
                    const assetQuotes = quotes.filter(q => (q.asset_names ?? []).includes(a.label));
                    const converted = assetQuotes.filter(q =>
                      q.status === 'application_submitted' || q.status === 'application_started'
                    ).length;
                    const rate = assetQuotes.length ? Math.round((converted / assetQuotes.length) * 100) : 0;
                    return { label: a.label, value: rate, formatted: `${rate}%`, color: 'bg-cyan-500' };
                  })}
                />
              </div>
            </div>
          )}

          {activeSection === 'installers' && (
            <div className="space-y-5">
              <InstallerTable stats={installerStats} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <SimpleBar
                  title="Top Installers by Volume"
                  items={[...installerStats]
                    .sort((a, b) => b.quoteCount - a.quoteCount)
                    .slice(0, 8)
                    .map(s => ({
                      label: s.company || s.name,
                      value: s.quoteCount,
                    }))}
                />
                <SimpleBar
                  title="Top Installers by Value"
                  items={[...installerStats]
                    .sort((a, b) => b.totalValue - a.totalValue)
                    .slice(0, 8)
                    .map(s => ({
                      label: s.company || s.name,
                      value: s.totalValue,
                      formatted: formatCurrency(s.totalValue),
                      color: 'bg-emerald-500',
                    }))}
                />
              </div>
            </div>
          )}

          {activeSection === 'scores' && (
            <div className="space-y-5">
              <DealScoresList scores={dealScores} quotes={quotes} />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {(['high', 'medium', 'low'] as const).map(intent => {
                  const intentScores = dealScores.filter(d => d.intent === intent);
                  const intentQuotes = intentScores.map(d => quotes.find(q => q.id === d.quoteId)).filter(Boolean) as Quote[];
                  const totalVal = intentQuotes.reduce((s, q) => s + Number(q.project_cost), 0);
                  const labels = { high: 'High Intent (80–100)', medium: 'Medium Intent (50–79)', low: 'Low Intent (<50)' };
                  const colors = { high: 'border-emerald-200 bg-emerald-50', medium: 'border-yellow-200 bg-yellow-50', low: 'border-gray-200 bg-gray-50' };
                  const textColors = { high: 'text-emerald-700', medium: 'text-yellow-700', low: 'text-gray-600' };
                  return (
                    <div key={intent} className={`rounded-xl border p-5 ${colors[intent]}`}>
                      <p className={`text-xs font-semibold uppercase tracking-wide mb-3 ${textColors[intent]}`}>{labels[intent]}</p>
                      <p className={`text-2xl font-bold mb-1 ${textColors[intent]}`}>{intentScores.length}</p>
                      <p className="text-xs text-gray-500">quotes</p>
                      <p className={`text-base font-bold mt-2 ${textColors[intent]}`}>{formatCurrency(totalVal)}</p>
                      <p className="text-xs text-gray-500">total value</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeSection === 'opportunities' && (
            <div className="space-y-5">
              <OpportunitiesFeed opportunities={opportunities} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
