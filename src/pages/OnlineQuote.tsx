import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Check } from 'lucide-react';
import { SavingsChart } from '../components/SavingsChart';

interface TermOption {
  years: number;
  monthlyPayment: number;
  interestRate?: number;
  totalFinanced?: number;
  costPerKwhCents?: number;
}

export interface OnlineQuoteData {
  quoteNumber: string;
  quoteDate: string;
  clientName: string;
  clientAddress: string;
  clientEmail?: string;
  clientPhone?: string;
  systemSize?: string;
  projectCost: number;
  assetNames: string[];
  termOptions: TermOption[];
  paymentTiming?: string;
  calculatorType?: string;
  installerName?: string;
  installerCompany?: string;
  installerEmail?: string;
  installerPhone?: string;
  annualSolarGenerationKwh?: number;
  energySavings?: number;
  disclaimerText?: string;
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

function formatCurrencyDecimals(n: number): string {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function buildSavingsData(annualSavings: number, termYears?: number, monthlyPayment?: number) {
  const YEARS = 25;
  const GROWTH_RATE = 0.03;
  const electricityBillWithSolar = annualSavings * 0.05;
  const rows: { year: number; cumulativeSavings: number }[] = [];
  let currentBill = annualSavings;
  let cumulative = 0;
  for (let year = 1; year <= YEARS; year++) {
    const loanCost = (termYears && monthlyPayment && year <= termYears) ? monthlyPayment * 12 : 0;
    const billWithSolar = electricityBillWithSolar * Math.pow(1 + GROWTH_RATE, year - 1);
    const netSaving = currentBill - billWithSolar - loanCost;
    cumulative += netSaving;
    rows.push({ year, cumulativeSavings: cumulative });
    currentBill = currentBill * (1 + GROWTH_RATE);
  }
  return rows;
}

export function OnlineQuote() {
  const location = useLocation();
  const navigate = useNavigate();
  const quoteData = location.state as OnlineQuoteData | null;

  if (!quoteData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">No quote data found.</p>
          <button onClick={() => navigate(-1)} className="px-4 py-2 bg-[#28AA48] text-white rounded-lg">Go Back</button>
        </div>
      </div>
    );
  }

  const {
    quoteNumber,
    quoteDate,
    clientName,
    clientAddress,
    clientEmail,
    clientPhone,
    systemSize,
    projectCost,
    assetNames,
    termOptions,
    installerName,
    installerCompany,
    installerEmail,
    installerPhone,
    annualSolarGenerationKwh,
    energySavings,
    disclaimerText,
  } = quoteData;

  const sortedTerms = [...termOptions].sort((a, b) => a.years - b.years);
  const firstTerm = sortedTerms[0];

  const hasSolar = !!(annualSolarGenerationKwh && annualSolarGenerationKwh > 0);
  const hasSavings = !!(energySavings && energySavings > 0);

  const savingsData = hasSavings
    ? buildSavingsData(energySavings!, firstTerm?.years, firstTerm?.monthlyPayment)
    : null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .print-container { box-shadow: none !important; border: none !important; }
        }
      `}</style>

      <div className="min-h-screen bg-gray-50">
        <div className="no-print sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-[#3A475B] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Calculator
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#34AC48] to-[#AFD235] text-white font-bold rounded-lg hover:shadow-lg transition-all text-sm"
          >
            <Download className="w-4 h-4" />
            Download as PDF
          </button>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-8 print-container">
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="px-8 py-6" style={{ background: 'linear-gradient(135deg, #1a2e3b 0%, #2D3A4A 100%)' }}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <span className="text-2xl font-extrabold" style={{ color: '#28AA48' }}>green</span>
                    <span className="text-2xl font-extrabold text-white">funding</span>
                  </div>
                  <p className="text-white/60 text-sm">Finance Solutions for Clean Energy</p>
                </div>
                <div className="text-right">
                  <p className="text-white/50 text-xs uppercase tracking-widest mb-1">Finance Quote</p>
                  <p className="text-white font-bold text-lg">{quoteNumber}</p>
                  <p className="text-white/60 text-sm mt-0.5">{quoteDate}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 border-b border-gray-100">
              <div className="px-8 py-6 border-r border-gray-100">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Prepared By</p>
                {installerCompany && <p className="font-bold text-[#3A475B] text-base">{installerCompany}</p>}
                {installerName && <p className="text-gray-600 text-sm mt-0.5">{installerName}</p>}
                {installerEmail && <p className="text-gray-500 text-sm mt-0.5">{installerEmail}</p>}
                {installerPhone && <p className="text-gray-500 text-sm mt-0.5">{installerPhone}</p>}
              </div>
              <div className="px-8 py-6">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Prepared For</p>
                <p className="font-bold text-[#3A475B] text-base">{clientName}</p>
                <p className="text-gray-600 text-sm mt-0.5">{clientAddress}</p>
                {clientEmail && <p className="text-gray-500 text-sm mt-0.5">{clientEmail}</p>}
                {clientPhone && <p className="text-gray-500 text-sm mt-0.5">{clientPhone}</p>}
              </div>
            </div>

            <div className="px-8 py-6 border-b border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Project Summary</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="rounded-xl p-4 text-center" style={{ background: 'linear-gradient(135deg, #28AA48, #7DC241)' }}>
                  <p className="text-white/80 text-xs mb-1">Project Cost</p>
                  <p className="text-white font-extrabold text-lg">{formatCurrency(projectCost)}</p>
                </div>
                <div className="rounded-xl p-4 text-center bg-gray-50 border border-gray-100">
                  <p className="text-gray-500 text-xs mb-1">Equipment</p>
                  <p className="text-[#3A475B] font-bold text-sm leading-tight">{assetNames.join(', ') || '—'}</p>
                </div>
                {systemSize && (
                  <div className="rounded-xl p-4 text-center bg-gray-50 border border-gray-100">
                    <p className="text-gray-500 text-xs mb-1">System Size</p>
                    <p className="text-[#3A475B] font-bold text-sm">{systemSize}</p>
                  </div>
                )}
                {hasSolar && annualSolarGenerationKwh && (
                  <div className="rounded-xl p-4 text-center bg-gray-50 border border-gray-100">
                    <p className="text-gray-500 text-xs mb-1">Annual Generation</p>
                    <p className="text-[#3A475B] font-bold text-sm">{annualSolarGenerationKwh.toLocaleString()} kWh</p>
                  </div>
                )}
              </div>
            </div>

            {hasSolar && annualSolarGenerationKwh && annualSolarGenerationKwh > 0 && (
              <div className="px-8 py-6 border-b border-gray-100">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Solar Generation Details</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="rounded-xl p-4 bg-amber-50 border border-amber-100">
                    <p className="text-amber-700 text-xs font-medium mb-1">Annual Generation</p>
                    <p className="text-amber-900 font-bold text-lg">{annualSolarGenerationKwh.toLocaleString()} kWh</p>
                    <p className="text-amber-600 text-xs mt-0.5">per year</p>
                  </div>
                  {hasSavings && energySavings && (
                    <div className="rounded-xl p-4 bg-green-50 border border-green-100">
                      <p className="text-green-700 text-xs font-medium mb-1">Est. Annual Energy Savings</p>
                      <p className="text-green-900 font-bold text-lg">{formatCurrency(energySavings)}</p>
                      <p className="text-green-600 text-xs mt-0.5">per year</p>
                    </div>
                  )}
                  {sortedTerms.filter(t => t.costPerKwhCents && t.costPerKwhCents > 0).map(t => (
                    <div key={t.years} className="rounded-xl p-4 bg-blue-50 border border-blue-100">
                      <p className="text-blue-700 text-xs font-medium mb-1">Cost per kWh — {t.years} yr term</p>
                      <p className="text-blue-900 font-bold text-lg">{t.costPerKwhCents!.toFixed(2)}¢</p>
                      <p className="text-blue-600 text-xs mt-0.5">per kilowatt-hour</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="px-8 py-6 border-b border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Repayment Options</p>
              <div className="overflow-hidden rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: 'linear-gradient(135deg, #1a2e3b 0%, #2D3A4A 100%)' }}>
                      <th className="px-4 py-3 text-left text-white/80 font-semibold text-xs uppercase tracking-wide">Loan Term</th>
                      <th className="px-4 py-3 text-right text-white/80 font-semibold text-xs uppercase tracking-wide">Monthly Repayment</th>
                      {sortedTerms[0]?.totalFinanced !== undefined && (
                        <th className="px-4 py-3 text-right text-white/80 font-semibold text-xs uppercase tracking-wide hidden sm:table-cell">Total Financed</th>
                      )}
                      {sortedTerms[0]?.interestRate !== undefined && (
                        <th className="px-4 py-3 text-right text-white/80 font-semibold text-xs uppercase tracking-wide hidden sm:table-cell">Interest Rate</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedTerms.map((t, i) => (
                      <tr key={t.years} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-3.5 font-semibold text-[#3A475B]">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-[#28AA48]" />
                            {t.years} Year{t.years !== 1 ? 's' : ''}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right font-bold text-[#28AA48] text-base">
                          {formatCurrencyDecimals(t.monthlyPayment)}
                          <span className="text-xs text-gray-400 font-normal">/mo</span>
                        </td>
                        {sortedTerms[0]?.totalFinanced !== undefined && (
                          <td className="px-4 py-3.5 text-right text-gray-600 hidden sm:table-cell">
                            {t.totalFinanced !== undefined ? formatCurrency(t.totalFinanced) : '—'}
                          </td>
                        )}
                        {sortedTerms[0]?.interestRate !== undefined && (
                          <td className="px-4 py-3.5 text-right text-gray-600 hidden sm:table-cell">
                            {t.interestRate !== undefined ? `${(t.interestRate * 100).toFixed(2)}%` : '—'}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                * All repayments include GST. Quote valid for 30 days from {quoteDate}.
              </p>
            </div>

            {hasSavings && energySavings && savingsData && (
              <div className="px-8 py-6 border-b border-gray-100">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Energy Savings Analysis</p>
                <SavingsChart
                  annualSavings={energySavings}
                  selectedTermYears={firstTerm?.years}
                  monthlyPayment={firstTerm?.monthlyPayment}
                />

                <div className="mt-5 rounded-2xl overflow-hidden border border-gray-100" style={{ background: 'linear-gradient(135deg, #1a2e3b 0%, #2D3A4A 100%)' }}>
                  <div className="px-5 pt-4 pb-3 border-b border-white/10">
                    <p className="text-sm font-bold text-white">Estimated Cumulative Savings</p>
                    <p className="text-xs text-white/50 mt-0.5">Based on 3% annual energy price growth</p>
                  </div>
                  <div className="grid grid-cols-3 divide-x divide-white/10">
                    {[
                      {
                        label: firstTerm ? `Over ${firstTerm.years} years` : 'Over term',
                        sublabel: firstTerm ? 'Period of rental facility' : '—',
                        value: savingsData[(firstTerm?.years ?? 5) - 1]?.cumulativeSavings ?? 0,
                      },
                      {
                        label: 'Over 15 years',
                        sublabel: '15-year projection',
                        value: savingsData[14]?.cumulativeSavings ?? 0,
                      },
                      {
                        label: 'Over 25 years',
                        sublabel: '25-year projection',
                        value: savingsData[24]?.cumulativeSavings ?? 0,
                      },
                    ].map((box, idx) => (
                      <div key={idx} className="px-4 py-4 text-center">
                        <p className="text-xs font-medium text-white/60 mb-0.5">{box.sublabel}</p>
                        <p className="text-sm font-semibold text-white mb-2">{box.label}</p>
                        <p className="text-xl font-bold" style={{ color: box.value >= 0 ? '#28AA48' : '#ef4444' }}>
                          {new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(box.value)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="px-8 py-6 border-b border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">What You'll Need</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-semibold text-[#3A475B] mb-2">
                    {projectCost < 250000 ? 'Low Doc Requirements' : 'Full Doc Requirements'}
                  </p>
                  <ul className="space-y-1.5">
                    {(projectCost < 250000
                      ? ['Last 6 months business bank statements', 'Signed application form', 'Installer invoice / quote']
                      : ['Last 2 years financial statements', 'Last 2 years tax returns', 'ATO portal printout', 'Signed application form', 'Installer invoice / quote']
                    ).map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                        <Check className="w-4 h-4 text-[#28AA48] mt-0.5 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#3A475B] mb-2">Get Started</p>
                  <p className="text-sm text-gray-600">
                    Contact your Green Funding representative to begin the application process. Our team will guide you through each step.
                  </p>
                  <div className="mt-3 space-y-1">
                    <p className="text-sm text-gray-500"><span className="font-medium text-[#3A475B]">Phone:</span> 1300 GET GFN</p>
                    <p className="text-sm text-gray-500"><span className="font-medium text-[#3A475B]">Email:</span> info@greenfunding.com.au</p>
                    <p className="text-sm text-gray-500"><span className="font-medium text-[#3A475B]">Web:</span> www.greenfunding.com.au</p>
                  </div>
                </div>
              </div>
            </div>

            {disclaimerText && (
              <div className="px-8 py-5 border-b border-gray-100 bg-amber-50">
                <p className="text-xs text-amber-800">{disclaimerText}</p>
              </div>
            )}

            <div className="px-8 py-5" style={{ background: 'linear-gradient(135deg, #1a2e3b 0%, #2D3A4A 100%)' }}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-base font-extrabold" style={{ color: '#28AA48' }}>green</span>
                  <span className="text-base font-extrabold text-white">funding</span>
                </div>
                <p className="text-white/40 text-xs">
                  This quote is indicative only and subject to credit approval. Valid for 30 days.
                </p>
              </div>
            </div>
          </div>

          <div className="no-print mt-6 flex justify-center">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-[#34AC48] to-[#AFD235] text-white font-bold rounded-xl hover:shadow-xl transition-all shadow-lg text-base"
            >
              <Download className="w-5 h-5" />
              Download as PDF
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
