import type { Quote, Application, InstallerUser, InstallerStats, DealScore, Opportunity, DateFilter } from './types';

export function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n);
}

export function formatCurrencyFull(n: number): string {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function daysBetween(a: string, b: string): number {
  return Math.abs(Math.floor((new Date(b).getTime() - new Date(a).getTime()) / 86400000));
}

export function filterByDate<T extends { created_at: string }>(items: T[], filter: DateFilter): T[] {
  const from = new Date(filter.from);
  const to = new Date(filter.to);
  to.setHours(23, 59, 59, 999);
  return items.filter(i => {
    const d = new Date(i.created_at);
    return d >= from && d <= to;
  });
}

export function getDateRange(range: '7d' | '30d'): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - (range === '7d' ? 7 : 30));
  return {
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
  };
}

export function getLoanBucket(amount: number): string {
  if (amount < 50000) return '$0–50K';
  if (amount < 100000) return '$50K–100K';
  if (amount < 250000) return '$100K–250K';
  if (amount < 500000) return '$250K–500K';
  return '$500K+';
}

export function calcInstallerStats(
  quotes: Quote[],
  applications: Application[],
  installers: InstallerUser[]
): InstallerStats[] {
  return installers.map(installer => {
    const iQuotes = quotes.filter(q => q.installer_id === installer.id);
    const iApps = applications.filter(a => a.installer_id === installer.id);
    const totalValue = iQuotes.reduce((s, q) => s + Number(q.project_cost), 0);
    const lastQuote = iQuotes.sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    const lastActivity = lastQuote?.created_at ?? null;
    return {
      id: installer.id,
      name: installer.full_name ?? installer.email,
      company: installer.company_name ?? '',
      email: installer.email,
      quoteCount: iQuotes.length,
      totalValue,
      avgDealSize: iQuotes.length ? totalValue / iQuotes.length : 0,
      applicationCount: iApps.length,
      conversionRate: iQuotes.length ? Math.round((iApps.length / iQuotes.length) * 100) : 0,
      lastActivity,
      daysSinceActivity: lastActivity ? daysBetween(lastActivity, new Date().toISOString()) : 9999,
    };
  }).filter(s => s.quoteCount > 0 || s.applicationCount > 0);
}

export function calcDealScore(quote: Quote, installerStats: InstallerStats | undefined): DealScore {
  let score = 0;
  const factors: string[] = [];

  const amount = Number(quote.project_cost);
  if (amount >= 500000) { score += 25; factors.push('High value ($500K+)'); }
  else if (amount >= 250000) { score += 20; factors.push('Large deal ($250K+)'); }
  else if (amount >= 100000) { score += 14; factors.push('Mid-size deal ($100K+)'); }
  else if (amount >= 50000) { score += 8; }
  else { score += 3; }

  const assetWeights: Record<string, number> = {
    'solar': 15, 'battery': 14, 'ev': 12, 'microgrid': 18,
    'waste': 16, 'building': 10, 'charging': 11,
  };
  const assetScore = (quote.asset_names ?? []).reduce((s, a) => {
    const key = Object.keys(assetWeights).find(k => a.toLowerCase().includes(k)) ?? '';
    return s + (assetWeights[key] ?? 8);
  }, 0);
  score += Math.min(20, assetScore);
  if ((quote.asset_names ?? []).length > 0) factors.push(`Asset: ${(quote.asset_names ?? []).join(', ')}`);

  const terms = quote.term_options ?? [];
  const hasGoodTerm = terms.some(t => t.years >= 5 && t.years <= 7);
  if (hasGoodTerm) { score += 10; factors.push('Mid-range term selected'); }

  if (quote.payment_timing === 'arrears') { score += 8; factors.push('Arrears payment timing'); }

  if (quote.status === 'application_submitted') { score += 20; factors.push('Application submitted'); }
  else if (quote.status === 'application_started') { score += 12; factors.push('Application started'); }

  if (installerStats && installerStats.conversionRate >= 30) { score += 5; factors.push('High-converting installer'); }

  score = Math.min(100, score);

  return {
    quoteId: quote.id,
    score,
    intent: score >= 80 ? 'high' : score >= 50 ? 'medium' : 'low',
    factors,
  };
}

export function generateOpportunities(
  quotes: Quote[],
  installerStats: InstallerStats[],
  dealScores: DealScore[]
): Opportunity[] {
  const ops: Opportunity[] = [];
  const now = new Date();

  const highValueQuotes = quotes
    .filter(q => Number(q.project_cost) >= 500000 && q.status !== 'application_submitted')
    .slice(0, 3);
  highValueQuotes.forEach(q => {
    ops.push({
      id: `hv-${q.id}`,
      type: 'high_value_quote',
      title: `High-value quote: ${formatCurrencyFull(Number(q.project_cost))}`,
      description: `Quote #${String(q.quote_number).padStart(6, '0')} — no application started yet`,
      severity: 'success',
      createdAt: q.created_at,
    });
  });

  const highIntent = dealScores.filter(d => d.intent === 'high').slice(0, 3);
  highIntent.forEach(d => {
    const q = quotes.find(qq => qq.id === d.quoteId);
    if (q && q.status !== 'application_submitted') {
      ops.push({
        id: `hi-${q.id}`,
        type: 'high_intent',
        title: `High-intent quote needs follow-up`,
        description: `Score ${d.score}/100 — ${formatCurrencyFull(Number(q.project_cost))} — ${(q.asset_names ?? []).join(', ')}`,
        severity: 'info',
        createdAt: q.created_at,
      });
    }
  });

  const dormant = installerStats.filter(s => s.daysSinceActivity > 30 && s.quoteCount >= 3);
  dormant.slice(0, 3).forEach(s => {
    ops.push({
      id: `di-${s.id}`,
      type: 'inactive_installer',
      title: `Dormant installer: ${s.name}`,
      description: `${s.company} — no activity for ${s.daysSinceActivity} days (${s.quoteCount} lifetime quotes)`,
      severity: 'warning',
      createdAt: new Date(now.getTime() - s.daysSinceActivity * 86400000).toISOString(),
    });
  });

  const recent7d = quotes.filter(q => {
    const d = new Date(q.created_at);
    return (now.getTime() - d.getTime()) < 7 * 86400000;
  });
  const prev7d = quotes.filter(q => {
    const d = new Date(q.created_at);
    const diff = now.getTime() - d.getTime();
    return diff >= 7 * 86400000 && diff < 14 * 86400000;
  });
  if (recent7d.length > prev7d.length * 1.5 && recent7d.length >= 5) {
    ops.push({
      id: 'spike',
      type: 'activity_spike',
      title: `Quoting activity spike detected`,
      description: `${recent7d.length} quotes in last 7 days vs ${prev7d.length} the week before`,
      severity: 'success',
      createdAt: new Date().toISOString(),
    });
  }

  return ops.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
