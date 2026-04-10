import type { DealScore, Quote } from './types';
import { formatCurrencyFull } from './utils';

interface Props {
  scores: DealScore[];
  quotes: Quote[];
}

const intentConfig = {
  high: { label: 'High Intent', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', barCls: 'bg-emerald-500' },
  medium: { label: 'Medium Intent', cls: 'bg-yellow-100 text-yellow-700 border-yellow-200', barCls: 'bg-yellow-400' },
  low: { label: 'Low Intent', cls: 'bg-gray-100 text-gray-600 border-gray-200', barCls: 'bg-gray-400' },
};

export function DealScoresList({ scores, quotes }: Props) {
  const topScores = [...scores].sort((a, b) => b.score - a.score).slice(0, 10);
  const counts = { high: 0, medium: 0, low: 0 };
  scores.forEach(s => counts[s.intent]++);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-[#3A475B]">Deal Intelligence Scores</h3>
          <p className="text-xs text-gray-400 mt-0.5">AI-weighted scoring across all quotes</p>
        </div>
        <div className="flex gap-2">
          {(['high', 'medium', 'low'] as const).map(intent => (
            <div key={intent} className={`text-xs px-2 py-1 rounded-full border font-semibold ${intentConfig[intent].cls}`}>
              {counts[intent]} {intentConfig[intent].label.split(' ')[0]}
            </div>
          ))}
        </div>
      </div>

      {topScores.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">No quotes to score</p>
      ) : (
        <div className="space-y-3">
          {topScores.map(d => {
            const q = quotes.find(qq => qq.id === d.quoteId);
            const cfg = intentConfig[d.intent];
            return (
              <div key={d.quoteId} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                  <span className="text-sm font-bold text-[#3A475B]">{d.score}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-[#3A475B] truncate">
                      {q ? formatCurrencyFull(Number(q.project_cost)) : '—'}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold flex-shrink-0 ${cfg.cls}`}>
                      {cfg.label}
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${cfg.barCls}`} style={{ width: `${d.score}%` }} />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1 truncate">{d.factors.slice(0, 2).join(' · ')}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
