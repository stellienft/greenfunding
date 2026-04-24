import { useState } from 'react';
import type { InstallerStats } from './types';
import { formatCurrency } from './utils';
import { ChevronUp, ChevronDown, AlertTriangle, Star, TrendingDown } from 'lucide-react';

type SortKey = keyof Pick<InstallerStats, 'quoteCount' | 'totalValue' | 'avgDealSize' | 'conversionRate' | 'daysSinceActivity'>;

interface Props {
  stats: InstallerStats[];
}

export function InstallerTable({ stats }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('totalValue');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const sorted = [...stats].sort((a, b) => {
    const av = a[sortKey] ?? 0;
    const bv = b[sortKey] ?? 0;
    return sortDir === 'desc' ? (bv as number) - (av as number) : (av as number) - (bv as number);
  });

  const p90volume = sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.1)]?.quoteCount ?? 0 : 0;

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ChevronUp className="w-3 h-3 text-gray-300" />;
    return sortDir === 'desc'
      ? <ChevronDown className="w-3 h-3 text-[#28AA48]" />
      : <ChevronUp className="w-3 h-3 text-[#28AA48]" />;
  };

  const col = (label: string, k: SortKey) => (
    <th
      className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-[#3A475B] select-none"
      onClick={() => toggleSort(k)}
    >
      <div className="flex items-center gap-1">
        {label}
        <SortIcon k={k} />
      </div>
    </th>
  );

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#3A475B]">Partner Performance</h3>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-500" /> Top performer</span>
          <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-orange-500" /> At risk</span>
          <span className="flex items-center gap-1"><TrendingDown className="w-3 h-3 text-red-500" /> Low conversion</span>
        </div>
      </div>
      {stats.length === 0 ? (
        <div className="text-center py-10 text-sm text-gray-400">No partner data available</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Partner</th>
                {col('Quotes', 'quoteCount')}
                {col('Total Value', 'totalValue')}
                {col('Avg Deal', 'avgDealSize')}
                {col('Conv. Rate', 'conversionRate')}
                {col('Last Active', 'daysSinceActivity')}
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sorted.map((s, idx) => {
                const isTop = s.quoteCount >= p90volume && idx === 0;
                const isAtRisk = s.daysSinceActivity > 30;
                const isLowConv = s.quoteCount >= 5 && s.conversionRate < 10;
                return (
                  <tr key={s.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-[#3A475B] text-sm">{s.name}</p>
                        <p className="text-xs text-gray-400">{s.company || s.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#3A475B]">{s.quoteCount}</td>
                    <td className="px-4 py-3 font-semibold text-[#3A475B]">{formatCurrency(s.totalValue)}</td>
                    <td className="px-4 py-3 text-gray-600">{formatCurrency(s.avgDealSize)}</td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${s.conversionRate >= 30 ? 'text-emerald-600' : s.conversionRate >= 15 ? 'text-yellow-600' : 'text-gray-500'}`}>
                        {s.conversionRate}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {s.lastActivity
                        ? s.daysSinceActivity === 0 ? 'Today'
                          : s.daysSinceActivity === 1 ? 'Yesterday'
                          : `${s.daysSinceActivity}d ago`
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {isTop && <Star className="w-3.5 h-3.5 text-yellow-500" />}
                        {isAtRisk && <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />}
                        {isLowConv && <TrendingDown className="w-3.5 h-3.5 text-red-500" />}
                        {!isTop && !isAtRisk && !isLowConv && <span className="text-xs text-gray-400">—</span>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
