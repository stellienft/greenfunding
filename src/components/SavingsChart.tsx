import { useMemo } from 'react';

interface SavingsChartProps {
  annualSavings: number;
  selectedTermYears?: number | null;
  monthlyPayment?: number;
}

function formatCurrencyShort(n: number): string {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}k`;
  return `$${n.toFixed(0)}`;
}

function formatCurrencyFull(n: number): string {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n);
}

export function SavingsChart({ annualSavings, selectedTermYears, monthlyPayment }: SavingsChartProps) {
  const YEARS = 25;
  const GROWTH_RATE = 0.03;

  const annualLoanCost = monthlyPayment ? monthlyPayment * 12 : 0;
  const electricityBillWithSolar = annualSavings * 0.05;

  const data = useMemo(() => {
    const rows = [];
    let currentBillWithoutSolar = annualSavings;
    let cumulativeSavings = 0;

    for (let year = 1; year <= YEARS; year++) {
      const loanCostThisYear = (selectedTermYears && monthlyPayment && year <= selectedTermYears)
        ? monthlyPayment * 12
        : 0;
      const billWithSolarThisYear = electricityBillWithSolar * Math.pow(1 + GROWTH_RATE, year - 1);
      const netSavingThisYear = currentBillWithoutSolar - billWithSolarThisYear - loanCostThisYear;
      cumulativeSavings += netSavingThisYear;

      rows.push({
        year,
        billWithoutSolar: currentBillWithoutSolar,
        billWithSolar: billWithSolarThisYear,
        loanCost: loanCostThisYear,
        cumulativeSavings,
      });

      currentBillWithoutSolar = currentBillWithoutSolar * (1 + GROWTH_RATE);
    }
    return rows;
  }, [annualSavings, selectedTermYears, monthlyPayment, electricityBillWithSolar]);

  const totalNetSavings = data[YEARS - 1]?.cumulativeSavings ?? 0;
  const hasLoanData = !!(selectedTermYears && monthlyPayment);

  const maxValue = Math.max(...data.map(d => Math.max(d.billWithoutSolar, d.loanCost, d.billWithSolar)));
  const ySteps = 5;
  const rawYMax = Math.ceil(maxValue / 1000) * 1000;
  const yMax = Math.ceil(rawYMax / ySteps) * ySteps || 1;
  const yTicks = Array.from({ length: ySteps + 1 }, (_, i) => (yMax / ySteps) * i).reverse();

  const chartWidth = 660;
  const chartHeight = 300;
  const paddingLeft = 58;
  const paddingRight = 12;
  const paddingTop = 16;
  const paddingBottom = 42;
  const plotWidth = chartWidth - paddingLeft - paddingRight;
  const plotHeight = chartHeight - paddingTop - paddingBottom;

  const barGroupWidth = plotWidth / YEARS;
  const numBars = hasLoanData ? 3 : 2;
  const totalBarSpace = barGroupWidth * 0.78;
  const barWidth = totalBarSpace / numBars;
  const barGap = barGroupWidth * 0.04;

  function xBar(yearIdx: number, barIndex: number): number {
    const groupStart = paddingLeft + yearIdx * barGroupWidth + (barGroupWidth - totalBarSpace) / 2;
    return groupStart + barIndex * (barWidth + barGap);
  }

  function yPos(value: number): number {
    return paddingTop + plotHeight - (value / yMax) * plotHeight;
  }

  function bHeight(value: number): number {
    return Math.max(0, (value / yMax) * plotHeight);
  }

  const loanEndYear = selectedTermYears ?? 0;
  const savingsAtLoanEnd = loanEndYear > 0 && loanEndYear <= YEARS
    ? data[loanEndYear - 1]?.billWithoutSolar ?? annualSavings
    : annualSavings;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="mb-5">
        <h3 className="text-xl font-bold text-[#3A475B] mb-1">Energy Savings Thanks to Solar Over 25 Years</h3>
        <p className="text-sm text-gray-500">See how your electricity savings compare to your loan repayments year by year</p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="border border-gray-200 rounded-xl p-3 text-center bg-gray-50">
          <p className="text-xs text-gray-500 mb-1">Electricity bill without solar</p>
          <p className="text-base font-bold text-[#3A475B]">{formatCurrencyFull(annualSavings)}<span className="text-xs font-normal text-gray-400">/yr</span></p>
        </div>
        <div className="border rounded-xl p-3 text-center" style={{ borderColor: 'rgba(94,196,193,0.4)', backgroundColor: 'rgba(94,196,193,0.07)' }}>
          <p className="text-xs text-gray-500 mb-1">Electricity bill with solar</p>
          <p className="text-base font-bold" style={{ color: '#3ABFBB' }}>{formatCurrencyFull(electricityBillWithSolar)}<span className="text-xs font-normal text-gray-400">/yr</span></p>
        </div>
        {hasLoanData ? (
          <div className="border rounded-xl p-3 text-center" style={{ borderColor: 'rgba(40,170,72,0.3)', backgroundColor: 'rgba(40,170,72,0.06)' }}>
            <p className="text-xs text-gray-500 mb-1">Annual repayments{selectedTermYears ? ` (${selectedTermYears} yr)` : ''}</p>
            <p className="text-base font-bold text-[#28AA48]">{formatCurrencyFull(annualLoanCost)}<span className="text-xs font-normal text-gray-400">/yr</span></p>
          </div>
        ) : (
          <div className="border border-[#28AA48]/20 rounded-xl p-3 text-center" style={{ backgroundColor: 'rgba(40,170,72,0.05)' }}>
            <p className="text-xs text-gray-500 mb-1">25-Year Net Savings</p>
            <p className="text-base font-bold text-[#28AA48]">{formatCurrencyFull(totalNetSavings)}</p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-3">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#2D3A4A' }} />
          <span className="text-xs text-gray-600">Electricity bill without solar</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#5EC4C1' }} />
          <span className="text-xs text-gray-600">Electricity bill with solar</span>
        </div>
        {hasLoanData && (
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#28AA48' }} />
            <span className="text-xs text-gray-600">Payment plan instalments</span>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <div style={{ minWidth: 360 }}>
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} width="100%" style={{ display: 'block' }}>
            {yTicks.map((tick, i) => (
              <g key={i}>
                <line x1={paddingLeft} y1={yPos(tick)} x2={chartWidth - paddingRight} y2={yPos(tick)} stroke="#e5e7eb" strokeWidth="1" />
                <text x={paddingLeft - 5} y={yPos(tick) + 4} textAnchor="end" fontSize="9" fill="#9ca3af">
                  {formatCurrencyShort(tick)}
                </text>
              </g>
            ))}

            {data.map((d, i) => (
              <g key={d.year}>
                <rect x={xBar(i, 0)} y={yPos(d.billWithoutSolar)} width={barWidth} height={bHeight(d.billWithoutSolar)} rx="2" fill="#2D3A4A" opacity="0.9" />
                <rect x={xBar(i, 1)} y={yPos(d.billWithSolar)} width={barWidth} height={bHeight(d.billWithSolar)} rx="2" fill="#5EC4C1" opacity="0.85" />
                {hasLoanData && (
                  <rect
                    x={xBar(i, 2)}
                    y={yPos(d.loanCost)}
                    width={barWidth}
                    height={bHeight(d.loanCost)}
                    rx="2"
                    fill={d.loanCost > 0 ? '#28AA48' : 'transparent'}
                    opacity="0.9"
                  />
                )}
                {(d.year === 1 || d.year % 5 === 0 || d.year === YEARS) && (
                  <text
                    x={paddingLeft + i * barGroupWidth + barGroupWidth / 2}
                    y={chartHeight - paddingBottom + 14}
                    textAnchor="middle"
                    fontSize="9"
                    fill="#6b7280"
                  >
                    {d.year}
                  </text>
                )}
              </g>
            ))}

            <line x1={paddingLeft} y1={chartHeight - paddingBottom} x2={chartWidth - paddingRight} y2={chartHeight - paddingBottom} stroke="#d1d5db" strokeWidth="1" />
            <text x={chartWidth / 2} y={chartHeight - 5} textAnchor="middle" fontSize="10" fill="#9ca3af">Years</text>
          </svg>
        </div>
      </div>

      {hasLoanData && selectedTermYears && (
        <div className="mt-4 p-3 rounded-xl border" style={{ backgroundColor: 'rgba(40,170,72,0.05)', borderColor: 'rgba(40,170,72,0.2)' }}>
          <p className="text-xs font-semibold" style={{ color: '#28AA48' }}>
            After year {selectedTermYears}, your finance repayments end. Your electricity savings of {formatCurrencyFull(savingsAtLoanEnd)}/year are yours to keep — and growing every year.
          </p>
        </div>
      )}

      <div className="mt-5 rounded-2xl overflow-hidden border border-gray-100" style={{ background: 'linear-gradient(135deg, #1a2e3b 0%, #2D3A4A 100%)' }}>
        <div className="px-5 pt-4 pb-3 border-b border-white/10">
          <p className="text-sm font-bold text-white">Estimated Cumulative Savings</p>
        </div>
        <div className="grid grid-cols-3 divide-x divide-white/10">
          {[
            {
              label: `Over ${selectedTermYears ?? YEARS} years`,
              sublabel: selectedTermYears ? 'Period of rental facility' : '25-year projection',
              value: data[(selectedTermYears ?? YEARS) - 1]?.cumulativeSavings ?? 0,
            },
            {
              label: 'Over 15 years',
              sublabel: '15-year projection',
              value: data[14]?.cumulativeSavings ?? 0,
            },
            {
              label: 'Over 25 years',
              sublabel: '25-year projection',
              value: data[24]?.cumulativeSavings ?? 0,
            },
          ].map((box, idx) => (
            <div key={idx} className="px-4 py-4 text-center">
              <p className="text-xs font-medium text-white/60 mb-0.5">{box.sublabel}</p>
              <p className="text-sm font-semibold text-white mb-2">{box.label}</p>
              <p className="text-xl font-bold" style={{ color: '#28AA48' }}>{formatCurrencyFull(box.value)}</p>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-3 text-right">* Indicative only. Based on 3% annual energy price growth.</p>
    </div>
  );
}
