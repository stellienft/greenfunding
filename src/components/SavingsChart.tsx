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

  const data = useMemo(() => {
    const rows = [];
    let cumulativeBillWithoutSolar = 0;
    let cumulativeSavings = 0;
    let currentAnnualSavings = annualSavings;
    let currentAnnualBillWithoutSolar = annualSavings;

    for (let year = 1; year <= YEARS; year++) {
      cumulativeBillWithoutSolar += currentAnnualBillWithoutSolar;
      cumulativeSavings += currentAnnualSavings;
      const annualLoanCost = (selectedTermYears && monthlyPayment && year <= selectedTermYears)
        ? monthlyPayment * 12
        : 0;

      rows.push({
        year,
        annualBillWithoutSolar: currentAnnualBillWithoutSolar,
        annualSavings: currentAnnualSavings,
        annualLoanCost,
        cumulativeBillWithoutSolar,
        cumulativeSavings,
      });

      currentAnnualBillWithoutSolar = currentAnnualBillWithoutSolar * (1 + GROWTH_RATE);
      currentAnnualSavings = currentAnnualSavings * (1 + GROWTH_RATE);
    }
    return rows;
  }, [annualSavings, selectedTermYears, monthlyPayment]);

  const totalSavings25 = data[YEARS - 1]?.cumulativeSavings ?? 0;
  const totalBillWithout25 = data[YEARS - 1]?.cumulativeBillWithoutSolar ?? 0;

  const maxValue = Math.max(...data.map(d => Math.max(d.annualBillWithoutSolar, d.annualLoanCost)));
  const ySteps = 5;
  const yMax = Math.ceil(maxValue / 2000) * 2000;
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

  function barHeight(value: number): number {
    return (value / yMax) * plotHeight;
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="mb-5">
        <h3 className="text-xl font-bold text-[#3A475B] mb-1">Your Estimated Energy Savings</h3>
        <p className="text-sm text-gray-500">Annual savings growing at 3% per year over 25 years</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <div className="bg-[#28AA48]/8 border border-[#28AA48]/20 rounded-xl p-3 text-center" style={{ backgroundColor: 'rgba(40,170,72,0.07)' }}>
          <p className="text-xs text-gray-500 mb-1">Year 1 Savings</p>
          <p className="text-lg font-bold text-[#28AA48]">{formatCurrencyFull(annualSavings)}</p>
        </div>
        <div className="bg-[#34AC48]/8 border border-[#34AC48]/20 rounded-xl p-3 text-center" style={{ backgroundColor: 'rgba(52,172,72,0.07)' }}>
          <p className="text-xs text-gray-500 mb-1">Total 25-Year Savings</p>
          <p className="text-lg font-bold text-[#3A475B]">{formatCurrencyFull(totalSavings25)}</p>
        </div>
        <div className="col-span-2 sm:col-span-1 bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-500 mb-1">Without Solar (25yr)</p>
          <p className="text-lg font-bold text-gray-600">{formatCurrencyFull(totalBillWithout25)}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-4">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#3A475B' }} />
          <span className="text-xs text-gray-600">Energy cost without solar</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#28AA48' }} />
          <span className="text-xs text-gray-600">Energy savings with solar</span>
        </div>
        {selectedTermYears && monthlyPayment && (
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
                  height={barHeight(d.annualBillWithoutSolar)}
                  rx="2"
                  fill="#3A475B"
                  opacity="0.85"
                />
                <rect
                  x={xPos(i, 1)}
                  y={yPos(d.annualSavings)}
                  width={barWidth}
                  height={barHeight(d.annualSavings)}
                  rx="2"
                  fill="#28AA48"
                  opacity="0.9"
                />
                {d.annualLoanCost > 0 && (
                  <rect
                    x={xPos(i, 1)}
                    y={yPos(d.annualLoanCost)}
                    width={barWidth}
                    height={barHeight(d.annualLoanCost)}
                    rx="2"
                    fill="#AFD235"
                    opacity="0.85"
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

      {selectedTermYears && monthlyPayment && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-xl">
          <p className="text-xs text-[#28AA48] font-semibold">
            After year {selectedTermYears}, your finance repayments end and you keep 100% of the energy savings — estimated at {formatCurrencyFull(data[selectedTermYears - 1]?.annualSavings ?? 0)}/year by then.
          </p>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-3 text-right">* Indicative only. Based on 3% annual energy price growth.</p>
    </div>
  );
}
