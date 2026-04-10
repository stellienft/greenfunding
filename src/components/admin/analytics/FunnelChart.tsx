import type { Quote, Application } from './types';

interface Props {
  quotes: Quote[];
  applications: Application[];
}

export function FunnelChart({ quotes, applications }: Props) {
  const totalQuotes = quotes.length;
  const quoteSent = totalQuotes;
  const appStarted = quotes.filter(q =>
    q.status === 'application_started' || q.status === 'application_submitted'
  ).length;
  const appSubmitted = quotes.filter(q => q.status === 'application_submitted').length;
  const dbApps = applications.length;
  const settled = Math.max(appSubmitted, dbApps);

  const stages = [
    { label: 'Quote Created', count: totalQuotes, color: 'bg-blue-500' },
    { label: 'Quote Sent', count: quoteSent, color: 'bg-cyan-500' },
    { label: 'Application Started', count: appStarted, color: 'bg-yellow-500' },
    { label: 'Application Submitted', count: appSubmitted, color: 'bg-orange-500' },
    { label: 'Deal Settled', count: settled, color: 'bg-emerald-500' },
  ];

  const max = stages[0].count || 1;

  let biggestDropoff = 1;
  let biggestDropoffPct = 0;
  for (let i = 1; i < stages.length; i++) {
    const prev = stages[i - 1].count;
    const curr = stages[i].count;
    if (prev > 0) {
      const drop = Math.round(((prev - curr) / prev) * 100);
      if (drop > biggestDropoffPct) {
        biggestDropoffPct = drop;
        biggestDropoff = i;
      }
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-[#3A475B] mb-4">Deal Funnel & Drop-off</h3>
      {totalQuotes === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">No data available</p>
      ) : (
        <>
          <div className="space-y-3">
            {stages.map((stage, i) => {
              const pct = Math.round((stage.count / max) * 100);
              const convFromPrev = i === 0 ? null : stages[i - 1].count > 0
                ? Math.round((stage.count / stages[i - 1].count) * 100)
                : 0;
              const isBigDrop = i === biggestDropoff && biggestDropoffPct > 0;
              return (
                <div key={stage.label}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-600">{stage.label}</span>
                      {isBigDrop && (
                        <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-semibold">
                          Biggest drop-off
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {convFromPrev !== null && (
                        <span className={`text-[10px] font-semibold ${convFromPrev >= 50 ? 'text-emerald-600' : convFromPrev >= 25 ? 'text-yellow-600' : 'text-red-500'}`}>
                          {convFromPrev}% conv.
                        </span>
                      )}
                      <span className="text-xs font-bold text-[#3A475B] w-8 text-right">{stage.count}</span>
                    </div>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${stage.color} transition-all duration-500`}
                      style={{ width: `${Math.max(1, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          {biggestDropoffPct > 0 && (
            <p className="mt-4 text-xs text-gray-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              Biggest drop-off: <span className="font-semibold text-red-600">{stages[biggestDropoff - 1].label} → {stages[biggestDropoff].label}</span> ({biggestDropoffPct}% drop)
            </p>
          )}
        </>
      )}
    </div>
  );
}
