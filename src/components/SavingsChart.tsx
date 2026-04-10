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

  const data = useMemo(() => {
    const rows = [];
    let cumulativeBillWithoutSolar = 0;
    let cumulativeNetSavings = 0;
    let currentAnnualBill = annualSavings;

    for (let year = 1; year <= YEARS; year++) {
      cumulativeBillWithoutSolar += currentAnnualBill;
      const loanCostThisYear = (selectedTermYears && monthlyPayment && year <= selectedTermYears)
        ? monthlyPayment * 12
        : 0;
      const netSavingThisYear = currentAnnualBill - loanCostThisYear;
      cumulativeNetSavings += netSavingThisYear;

      rows.push({
        year,
        annualBillWithoutSolar: currentAnnualBill,
        loanCostThisYear,
        netSavingThisYear,
        cumulativeBillWithoutSolar,
        cumulativeNetSavings,
      });

      currentAnnualBill = currentAnnualBill * (1 + GROWTH_RATE);
    }
    return rows;
  }, [annualSavings, selectedTermYears, monthlyPayment]);

  const totalBillWithout25 = data[YEARS - 1]?.cumulativeBillWithoutSolar ?? 0;
  const totalNetSavings25 = data[YEARS - 1]?.cumulativeNetSavings ?? 0;
  const year1NetSaving = data[0]?.netSavingThisYear ?? annualSavings;

  const maxValue = Math.max(...data.map(d => Math.max(d.annualBillWithoutSolar, d.loanCostThisYear)));
  const ySteps = 5;
  const rawYMax = Math.ceil(maxValue / 1000) * 1000;
  const yMax = Math.ceil(rawYMax / ySteps) * ySteps;
  const yTicks = Array.from({ length: ySteps + 1 }, (_, i) => (yMax / ySteps) * i).reverse();

  const chartWidth = 640;
  const chartHeight = 280;
  const paddingLeft = 60;
  const paddingRight = 16;
  const paddingTop = 16;
  const paddingBottom = 40;
  const plotWidth = chartWidth - paddingLeft - paddingRight;
  const plotHeight = chartHeight - paddingTop - paddingBottom;

  const barGroupWidth = plotWidth / YEARS;
  const barWidth = barGroupWidth * 0.35;
  const gap = barGroupWidth * 0.06;

  function xPos(yearIdx: number, barIndex: number): number {
    return paddingLeft + yearIdx * barGroupWidth + (barGroupWidth - 2 * barWidth - gap) / 2 + barIndex * (barWidth + gap);
  }

  function yPos(value: number): number {
    return paddingTop + plotHeight - (value / yMax) * plotHeight;
  }

  function bHeight(value: number): number {
    return Math.max(0, (value / yMax) * plotHeight);
  }

  const hasLoanData = !!(selectedTermYears && monthlyPayment);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="mb-5">
        <h3 className="text-xl font-bold text-[#3A475B] mb-1">How Much Could You Save?</h3>
        <p className="text-sm text-gray-500">Energy cost without solar vs. your finance repayments over 25 years</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <div className="border border-[#28AA48]/30 rounded-xl p-3 text-center" style={{ backgroundColor: 'rgba(40,170,72,0.06)' }}>
          <p className="text-xs text-gray-500 mb-1">Year 1 Energy Bill</p>
          <p className="text-lg font-bold text-[#28AA48]">{formatCurrencyFull(annualSavings)}</p>
        </div>
        {hasLoanData ? (
          <div className="border border-gray-200 rounded-xl p-3 text-center bg-gray-50">
            <p className="text-xs text-gray-500 mb-1">Year 1 Repayments</p>
            <p className="text-lg font-bold text-[#3A475B]">{formatCurrencyFull(annualLoanCost)}</p>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-xl p-3 text-center bg-gray-50">
            <p className="text-xs text-gray-500 mb-1">25-Year Bill Without Solar</p>
            <p className="text-lg font-bold text-gray-600">{formatCurrencyFull(totalBillWithout25)}</p>
          </div>
        )}
        <div className="col-span-2 sm:col-span-1 border border-[#AFD235]/40 rounded-xl p-3 text-center" style={{ backgroundColor: 'rgba(175,210,53,0.07)' }}>
          <p className="text-xs text-gray-500 mb-1">Estimated Net Savings (25yr)</p>
          <p className={`text-lg font-bold ${totalNetSavings25 >= 0 ? 'text-[#28AA48]' : 'text-gray-600'}`}>
            {formatCurrencyFull(totalNetSavings25)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-4">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#3A475B' }} />
          <span className="text-xs text-gray-600">Electricity bill without solar</span>
        </div>
        {hasLoanData && (
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#AFD235' }} />
            <span className="text-xs text-gray-600">Finance repayments</span>
          </div>
        )}
      </div>

      <div className="overflow-x-auto -mx-1">
        <div style={{ minWidth: 380 }}>
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} width="100%" style={{ display: 'block' }}>
            {yTicks.map((tick, i) => (
              <g key={i}>
                <line
                  x1={paddingLeft}
                  y1={yPos(tick)}
                  x2={chartWidth - paddingRight}
                  y2={yPos(tick)}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                />
                <text
                  x={paddingLeft - 6}
                  y={yPos(tick) + 4}
                  textAnchor="end"
                  fontSize="9"
                  fill="#9ca3af"
                >
                  {formatCurrencyShort(tick)}
                </text>
              </g>
            ))}

            {data.map((d, i) => (
              <g key={d.year}>
                <rect
                  x={xPos(i, 0)}
                  y={yPos(d.annualBillWithoutSolar)}
                  width={barWidth}
                  height={bHeight(d.annualBillWithoutSolar)}
                  rx="2"
                  fill="#3A475B"
                  opacity="0.85"
                />
                {hasLoanData && d.loanCostThisYear > 0 && (
                  <rect
                    x={xPos(i, 1)}
                    y={yPos(d.loanCostThisYear)}
                    width={barWidth}
                    height={bHeight(d.loanCostThisYear)}
                    rx="2"
                    fill="#AFD235"
                    opacity="0.9"
                  />
                )}
                {(d.year === 1 || d.year % 5 === 0 || d.year === YEARS) && (
                  <text
                    x={xPos(i, 0) + barWidth + gap / 2}
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

            <line
              x1={paddingLeft}
              y1={chartHeight - paddingBottom}
              x2={chartWidth - paddingRight}
              y2={chartHeight - paddingBottom}
              stroke="#d1d5db"
              strokeWidth="1"
            />

            <text
              x={chartWidth / 2}
              y={chartHeight - 4}
              textAnchor="middle"
              fontSize="10"
              fill="#9ca3af"
            >
              Years
            </text>
          </svg>
        </div>
      </div>

      {hasLoanData && selectedTermYears && (
        <div className="mt-4 p-3 rounded-xl border" style={{ backgroundColor: 'rgba(40,170,72,0.06)', borderColor: 'rgba(40,170,72,0.25)' }}>
          <p className="text-xs font-semibold" style={{ color: '#28AA48' }}>
            After year {selectedTermYears}, your finance repayments end. Your energy savings of {formatCurrencyFull(data[selectedTermYears]?.annualBillWithoutSolar ?? annualSavings)}/year are yours to keep — and growing.
          </p>
        </div>
      )}

      {!hasLoanData && (
        <div className="mt-4 p-3 rounded-xl border bg-gray-50 border-gray-200">
          <p className="text-xs text-gray-500">
            Select a loan term above to see how your finance repayments compare to your energy savings.
          </p>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-3 text-right">* Indicative only. Based on 3% annual energy price growth.</p>
    </div>
  );
}
