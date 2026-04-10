import type { Opportunity } from './types';
import { formatDate } from './utils';
import { TrendingUp, AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface Props {
  opportunities: Opportunity[];
}

const severityConfig = {
  success: {
    icon: CheckCircle,
    bg: 'bg-emerald-50 border-emerald-200',
    iconCls: 'text-emerald-500',
    dot: 'bg-emerald-500',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-orange-50 border-orange-200',
    iconCls: 'text-orange-500',
    dot: 'bg-orange-500',
  },
  info: {
    icon: Info,
    bg: 'bg-blue-50 border-blue-200',
    iconCls: 'text-blue-500',
    dot: 'bg-blue-500',
  },
};

export function OpportunitiesFeed({ opportunities }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-[#28AA48]" />
        <h3 className="text-sm font-semibold text-[#3A475B]">Opportunities Feed</h3>
        {opportunities.length > 0 && (
          <span className="ml-auto bg-[#28AA48]/10 text-[#28AA48] text-[10px] font-bold px-2 py-0.5 rounded-full">
            {opportunities.length} active
          </span>
        )}
      </div>

      {opportunities.length === 0 ? (
        <div className="text-center py-8">
          <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No opportunities flagged — all clear</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {opportunities.map(op => {
            const cfg = severityConfig[op.severity];
            const Icon = cfg.icon;
            return (
              <div key={op.id} className={`flex gap-3 p-3 rounded-lg border ${cfg.bg}`}>
                <div className={`w-5 h-5 flex-shrink-0 mt-0.5`}>
                  <Icon className={`w-5 h-5 ${cfg.iconCls}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#3A475B] leading-tight">{op.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{op.description}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{formatDate(op.createdAt)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
