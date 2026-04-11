import { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, Minus, FileText, Users,
  DollarSign, Activity, ArrowRight, RefreshCw, Zap, AlertCircle,
} from 'lucide-react';

interface Quote {
  id: string;
  created_at: string;
  installer_id: string | null;
  project_cost: number;
  calculator_type: string;
  status: string;
  recipient_name: string | null;
  recipient_company: string | null;
  asset_names: string[];
}

interface Installer {
  id: string;
  full_name: string;
  company_name: string;
  quote_count: number;
  application_count: number;
  created_at: string;
}

interface RecentItem {
  id: string;
  type: 'quote' | 'application';
  title: string;
  subtitle: string;
  value: number;
  created_at: string;
  tag: string;
  tagColor: string;
}

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function fmtFull(n: number) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n);
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return startOfDay(d);
}

function Trend({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return null;
  if (previous === 0) return (
    <span className="flex items-center gap-0.5 text-emerald-600 text-xs font-semibold">
      <TrendingUp className="w-3 h-3" /> New
    </span>
  );
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return (
    <span className="flex items-center gap-0.5 text-gray-400 text-xs font-medium">
      <Minus className="w-3 h-3" /> 0%
    </span>
  );
  const up = pct > 0;
  return (
    <span className={`flex items-center gap-0.5 text-xs font-semibold ${up ? 'text-emerald-600' : 'text-red-500'}`}>
      {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {up ? '+' : ''}{pct}% vs prev period
    </span>
  );
}

function StatCard({
  label, value, sub, icon: Icon, iconBg, current, previous, onClick,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  iconBg: string;
  current?: number;
  previous?: number;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex flex-col gap-3 ${onClick ? 'cursor-pointer hover:border-[#28AA48]/40 hover:shadow-md transition-all' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          <Icon className="w-5 h-5" />
        </div>
        {current !== undefined && previous !== undefined && (
          <Trend current={current} previous={previous} />
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-[#3A475B] leading-tight">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5 font-medium">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function MiniSparkline({ data, color = '#28AA48' }: { data: number[]; color?: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const h = 32;
  const w = 80;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - (v / max) * h;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={(data.length - 1) / (data.length - 1) * w} cy={h - (data[data.length - 1] / max) * h} r="2.5" fill={color} />
    </svg>
  );
}

const CALC_LABELS: Record<string, string> = {
  rental: 'Rental',
  serviced_rental: 'Serviced Rental',
  progress_payment_rental: 'Progress Payment',
};

export function PlatformDashboard({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [installers, setInstallers] = useState<Installer[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const quotesJson = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-quotes`, {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      }).then(r => r.json());

      setQuotes(quotesJson.quotes ?? []);
      setInstallers(quotesJson.installers ?? []);
      setLastRefresh(new Date());
    } catch (e) {
      console.error('Dashboard load error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, [load]);

  const today = startOfDay(new Date());
  const yesterday = daysAgo(1);
  const last7 = daysAgo(7);
  const prev7 = daysAgo(14);
  const last30 = daysAgo(30);
  const prev30 = daysAgo(60);

  const quotesToday = quotes.filter(q => new Date(q.created_at) >= today).length;
  const quotesYesterday = quotes.filter(q => {
    const d = new Date(q.created_at);
    return d >= yesterday && d < today;
  }).length;

  const quotesLast7 = quotes.filter(q => new Date(q.created_at) >= last7).length;
  const quotesPrev7 = quotes.filter(q => {
    const d = new Date(q.created_at);
    return d >= prev7 && d < last7;
  }).length;

  const quotesLast30 = quotes.filter(q => new Date(q.created_at) >= last30).length;
  const quotesPrev30 = quotes.filter(q => {
    const d = new Date(q.created_at);
    return d >= prev30 && d < last30;
  }).length;

  const valueLast30 = quotes
    .filter(q => new Date(q.created_at) >= last30)
    .reduce((s, q) => s + Number(q.project_cost), 0);
  const valuePrev30 = quotes
    .filter(q => {
      const d = new Date(q.created_at);
      return d >= prev30 && d < last30;
    })
    .reduce((s, q) => s + Number(q.project_cost), 0);

  const totalInstallers = installers.length;
  const activeInstallers = new Set(
    quotes.filter(q => new Date(q.created_at) >= last30).map(q => q.installer_id).filter(Boolean)
  ).size;

  const avgDealSize = quotesLast30 > 0 ? valueLast30 / quotesLast30 : 0;
  const prevAvgDeal = quotesPrev30 > 0 ? valuePrev30 / quotesPrev30 : 0;

  const daily7 = Array.from({ length: 7 }, (_, i) => {
    const from = daysAgo(6 - i);
    const to = daysAgo(5 - i);
    return quotes.filter(q => {
      const d = new Date(q.created_at);
      return d >= from && (i === 6 ? d <= new Date() : d < to);
    }).length;
  });

  const calcBreakdown = Object.entries(
    quotes.filter(q => new Date(q.created_at) >= last30).reduce((acc: Record<string, number>, q) => {
      const k = CALC_LABELS[q.calculator_type] ?? q.calculator_type;
      acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]);

  const calcTotal = calcBreakdown.reduce((s, [, v]) => s + v, 0);

  const topInstallers = installers
    .map(i => ({
      ...i,
      recentQuotes: quotes.filter(q => q.installer_id === i.id && new Date(q.created_at) >= last30).length,
      recentValue: quotes
        .filter(q => q.installer_id === i.id && new Date(q.created_at) >= last30)
        .reduce((s, q) => s + Number(q.project_cost), 0),
    }))
    .filter(i => i.recentQuotes > 0)
    .sort((a, b) => b.recentQuotes - a.recentQuotes)
    .slice(0, 5);

  const recentItems: RecentItem[] = quotes.slice(0, 10).map(q => ({
    id: q.id,
    type: 'quote' as const,
    title: q.recipient_name || q.recipient_company || 'Unnamed Client',
    subtitle: CALC_LABELS[q.calculator_type] ?? q.calculator_type,
    value: Number(q.project_cost),
    created_at: q.created_at,
    tag: 'Quote',
    tagColor: 'bg-blue-50 text-blue-700 border-blue-100',
  }));

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    if (h < 24) return `${h}h ago`;
    if (d < 7) return `${d}d ago`;
    return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
  }

  const alerts: { msg: string; color: string }[] = [];
  if (quotesToday === 0 && new Date().getHours() > 10) {
    alerts.push({ msg: 'No quotes generated today yet', color: 'text-amber-700 bg-amber-50 border-amber-200' });
  }
  const inactiveInstallers = installers.filter(i => {
    const lastQ = quotes.filter(q => q.installer_id === i.id).sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];
    if (!lastQ) return false;
    const days = (Date.now() - new Date(lastQ.created_at).getTime()) / 86400000;
    return days > 14;
  });
  if (inactiveInstallers.length > 0) {
    alerts.push({ msg: `${inactiveInstallers.length} installer${inactiveInstallers.length > 1 ? 's' : ''} inactive for 14+ days`, color: 'text-rose-700 bg-rose-50 border-rose-200' });
  }

  const CALC_COLORS = [
    'bg-[#28AA48]', 'bg-blue-500', 'bg-cyan-500', 'bg-amber-500',
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#3A475B]">Platform Overview</h2>
            <p className="text-xs text-gray-400 mt-0.5">Loading dashboard...</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 h-28 animate-pulse">
              <div className="w-10 h-10 bg-gray-100 rounded-xl mb-3" />
              <div className="h-5 bg-gray-100 rounded w-2/3 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#3A475B]">Platform Overview</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Updated {lastRefresh.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })} &middot; Auto-refreshes every minute
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a, i) => (
            <div key={i} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium ${a.color}`}>
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {a.msg}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Quotes Today"
          value={quotesToday.toString()}
          sub={`${quotesYesterday} yesterday`}
          icon={Zap}
          iconBg="bg-amber-50 text-amber-600"
          current={quotesToday}
          previous={quotesYesterday}
        />
        <StatCard
          label="Quotes This Week"
          value={quotesLast7.toString()}
          sub="Last 7 days"
          icon={Activity}
          iconBg="bg-blue-50 text-blue-600"
          current={quotesLast7}
          previous={quotesPrev7}
        />
        <StatCard
          label="Quotes (30 days)"
          value={quotesLast30.toString()}
          sub="vs prior 30 days"
          icon={FileText}
          iconBg="bg-sky-50 text-sky-600"
          current={quotesLast30}
          previous={quotesPrev30}
        />
        <StatCard
          label="Pipeline Value (30d)"
          value={fmt(valueLast30)}
          sub={fmtFull(valueLast30)}
          icon={DollarSign}
          iconBg="bg-green-50 text-green-600"
          current={valueLast30}
          previous={valuePrev30}
        />
        <StatCard
          label="Avg Deal Size (30d)"
          value={fmt(avgDealSize)}
          sub="Per quote"
          icon={TrendingUp}
          iconBg="bg-teal-50 text-teal-600"
          current={avgDealSize}
          previous={prevAvgDeal}
        />
        <StatCard
          label="Active Installers"
          value={activeInstallers.toString()}
          sub={`of ${totalInstallers} total`}
          icon={Users}
          iconBg="bg-orange-50 text-orange-600"
          current={activeInstallers}
          previous={totalInstallers}
          onClick={() => onNavigate?.('users')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#3A475B]">Daily Quotes — Last 7 Days</h3>
            <MiniSparkline data={daily7} />
          </div>
          <div className="flex items-end gap-1.5 h-20">
            {daily7.map((count, i) => {
              const maxVal = Math.max(...daily7, 1);
              const heightPct = (count / maxVal) * 100;
              const isToday = i === 6;
              const date = new Date();
              date.setDate(date.getDate() - (6 - i));
              const label = date.toLocaleDateString('en-AU', { weekday: 'short' });
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[#3A475B] text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                    {count} quote{count !== 1 ? 's' : ''}
                  </div>
                  <div
                    className={`w-full rounded-t-sm transition-all ${isToday ? 'bg-[#28AA48]' : 'bg-gray-200 group-hover:bg-gray-300'}`}
                    style={{ height: `${Math.max(heightPct, 4)}%` }}
                  />
                  <span className={`text-[9px] font-medium ${isToday ? 'text-[#28AA48]' : 'text-gray-400'}`}>{label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#3A475B]">Calculator Type Split (30d)</h3>
          </div>
          {calcBreakdown.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No data</p>
          ) : (
            <div className="space-y-3">
              {calcBreakdown.map(([label, count], i) => (
                <div key={label}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-[#3A475B]">{label}</span>
                    <span className="text-gray-500">{count} ({calcTotal > 0 ? Math.round((count / calcTotal) * 100) : 0}%)</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${CALC_COLORS[i % CALC_COLORS.length]}`}
                      style={{ width: `${calcTotal > 0 ? (count / calcTotal) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#3A475B]">Top Installers (30d)</h3>
            <button
              onClick={() => onNavigate?.('users')}
              className="text-xs text-[#28AA48] hover:underline flex items-center gap-0.5"
            >
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {topInstallers.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No activity</p>
          ) : (
            <div className="space-y-3">
              {topInstallers.map((inst, i) => (
                <div key={inst.id} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500 flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#3A475B] truncate">{inst.company_name || inst.full_name}</p>
                    <p className="text-[10px] text-gray-400">{inst.recentQuotes} quotes &middot; {fmt(inst.recentValue)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#3A475B]">Recent Activity</h3>
            <button onClick={() => onNavigate?.('quotes')} className="text-xs text-[#28AA48] hover:underline flex items-center gap-0.5">
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {recentItems.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No recent activity</p>
          ) : (
            <div className="space-y-2">
              {recentItems.map(item => (
                <div key={`${item.type}-${item.id}`} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <div className={`flex-shrink-0 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${item.tagColor}`}>
                    {item.tag}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#3A475B] truncate">{item.title}</p>
                    <p className="text-[10px] text-gray-400">{item.subtitle}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-semibold text-[#3A475B]">{fmt(item.value)}</p>
                    <p className="text-[10px] text-gray-400">{timeAgo(item.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#3A475B]">Platform Health</h3>
          </div>
          <div className="space-y-4">
            {[
              {
                label: 'Total Quotes All Time',
                value: quotes.length.toLocaleString(),
                icon: FileText,
                color: 'text-blue-500 bg-blue-50',
              },
              {
                label: 'Total Pipeline Value (All Time)',
                value: fmt(quotes.reduce((s, q) => s + Number(q.project_cost), 0)),
                icon: DollarSign,
                color: 'text-green-600 bg-green-50',
              },
              {
                label: 'Total Registered Installers',
                value: totalInstallers.toLocaleString(),
                icon: Users,
                color: 'text-orange-500 bg-orange-50',
              },
              {
                label: 'Avg All-Time Deal Size',
                value: quotes.length > 0 ? fmt(quotes.reduce((s, q) => s + Number(q.project_cost), 0) / quotes.length) : '$0',
                icon: TrendingUp,
                color: 'text-rose-500 bg-rose-50',
              },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 flex items-center justify-between">
                  <span className="text-xs text-gray-500">{label}</span>
                  <span className="text-sm font-bold text-[#3A475B]">{value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
