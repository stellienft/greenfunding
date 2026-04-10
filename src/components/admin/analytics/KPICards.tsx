import type { Quote, Application, InstallerStats } from './types';
import { formatCurrency } from './utils';
import { TrendingUp, DollarSign, Users, Percent, BarChart2, RefreshCw } from 'lucide-react';

interface Props {
  quotes: Quote[];
  applications: Application[];
  installerStats: InstallerStats[];
}

export function KPICards({ quotes, applications, installerStats }: Props) {
  const totalQuotes = quotes.length;
  const totalValue = quotes.reduce((s, q) => s + Number(q.project_cost), 0);
  const avgDealSize = totalQuotes ? totalValue / totalQuotes : 0;

  const mostActiveInstaller = [...installerStats].sort((a, b) => b.quoteCount - a.quoteCount)[0];
  const highestValueInstaller = [...installerStats].sort((a, b) => b.totalValue - a.totalValue)[0];

  const quotesWithApp = quotes.filter(q =>
    q.status === 'application_started' || q.status === 'application_submitted'
  ).length;
  const quoteToAppRate = totalQuotes ? Math.round((quotesWithApp / totalQuotes) * 100) : 0;

  const appsSubmitted = applications.length;
  const appToSettleRate = appsSubmitted ? Math.round((appsSubmitted / Math.max(quotesWithApp, 1)) * 100) : 0;

  const installerQuoteCounts = new Map<string, number>();
  quotes.forEach(q => {
    if (q.installer_id) {
      installerQuoteCounts.set(q.installer_id, (installerQuoteCounts.get(q.installer_id) ?? 0) + 1);
    }
  });
  const repeatInstallers = [...installerQuoteCounts.values()].filter(c => c > 1).length;
  const totalInstallers = installerQuoteCounts.size;
  const repeatRate = totalInstallers ? Math.round((repeatInstallers / totalInstallers) * 100) : 0;

  const kpis = [
    {
      label: 'Total Quotes',
      value: totalQuotes.toLocaleString(),
      sub: 'All time in period',
      icon: BarChart2,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Total Quote Value',
      value: formatCurrency(totalValue),
      sub: 'Combined project costs',
      icon: DollarSign,
      color: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: 'Average Deal Size',
      value: formatCurrency(avgDealSize),
      sub: 'Per quote',
      icon: TrendingUp,
      color: 'bg-cyan-50 text-cyan-600',
    },
    {
      label: 'Most Active Installer',
      value: mostActiveInstaller?.name ?? '—',
      sub: mostActiveInstaller ? `${mostActiveInstaller.quoteCount} quotes` : 'No data',
      icon: Users,
      color: 'bg-orange-50 text-orange-600',
      small: true,
    },
    {
      label: 'Highest Value Installer',
      value: highestValueInstaller?.name ?? '—',
      sub: highestValueInstaller ? formatCurrency(highestValueInstaller.totalValue) : 'No data',
      icon: DollarSign,
      color: 'bg-yellow-50 text-yellow-600',
      small: true,
    },
    {
      label: 'Quote → Application',
      value: `${quoteToAppRate}%`,
      sub: `${quotesWithApp} of ${totalQuotes} quotes`,
      icon: Percent,
      color: 'bg-green-50 text-green-600',
    },
    {
      label: 'Application → Settlement',
      value: `${appToSettleRate}%`,
      sub: `${appsSubmitted} applications`,
      icon: Percent,
      color: 'bg-teal-50 text-teal-600',
    },
    {
      label: 'Repeat Quote Rate',
      value: `${repeatRate}%`,
      sub: `${repeatInstallers} of ${totalInstallers} installers`,
      icon: RefreshCw,
      color: 'bg-slate-50 text-slate-600',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {kpis.map(kpi => {
        const Icon = kpi.icon;
        return (
          <div key={kpi.label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-500 font-medium mb-1 truncate">{kpi.label}</p>
                <p className={`font-bold text-[#3A475B] leading-tight ${kpi.small ? 'text-base' : 'text-xl'} truncate`}>{kpi.value}</p>
                <p className="text-xs text-gray-400 mt-0.5 truncate">{kpi.sub}</p>
              </div>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${kpi.color}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
