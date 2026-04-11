import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Check, ExternalLink, Loader } from 'lucide-react';
import { SavingsChart } from '../components/SavingsChart';
import { CheckCircle2, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

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
  quoteId?: string;
  pdfUrl?: string | null;
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

interface LowDocRequirement {
  label: string;
  url?: string;
}

function getLowDocRequirements(projectCost: number): { title: string; items: LowDocRequirement[] } | null {
  if (projectCost >= 250000) return null;

  const base: LowDocRequirement[] = [
    { label: "Directors Drivers Licence & Medicare card" },
    { label: 'Privacy Consent', url: 'https://drive.google.com/file/d/1aIw8H6qgvCcVIULRiVsanfKR38jWTOHN/view' },
    { label: 'Asset and Liability statement', url: 'https://drive.google.com/file/d/1RwQ-npssPkEN6bW_wDV3e5Gr0w3IpOgm/view' },
  ];

  if (projectCost >= 150000) {
    const withBankStatements: LowDocRequirement[] = [
      { label: "Directors Drivers Licence & Medicare card" },
      { label: '6 months Bank Statements', url: 'https://scv.bankstatements.com.au/HSHV' },
      { label: 'Privacy Consent', url: 'https://drive.google.com/file/d/1aIw8H6qgvCcVIULRiVsanfKR38jWTOHN/view' },
      { label: 'Asset and Liability statement', url: 'https://drive.google.com/file/d/1RwQ-npssPkEN6bW_wDV3e5Gr0w3IpOgm/view' },
    ];
    return { title: 'Low Doc Requirements ($150k–$250k)', items: withBankStatements };
  }

  return { title: 'Low Doc Requirements (up to $150k)', items: base };
}

const fullDocRequirements: { document: string; under500k: boolean; between500kAnd1m: boolean; over1m: boolean }[] = [
  { document: 'FY24 & FY25 Accountant prepared financials', under500k: true, between500kAnd1m: true, over1m: true },
  { document: 'Mgt YTD Dec 25 Financials', under500k: true, between500kAnd1m: true, over1m: true },
  { document: 'Finance Commitment Schedule', under500k: true, between500kAnd1m: true, over1m: true },
  { document: 'Current ATO Portal Statement', under500k: true, between500kAnd1m: true, over1m: true },
  { document: 'Business Overview and Major Clients', under500k: true, between500kAnd1m: true, over1m: true },
  { document: 'Asset and Liability', under500k: true, between500kAnd1m: true, over1m: true },
  { document: 'Aged Debtors and Creditors', under500k: false, between500kAnd1m: true, over1m: true },
  { document: 'Cashflow Projections', under500k: false, between500kAnd1m: false, over1m: true },
];

function PageHeader({ quoteNumber, quoteDate }: { quoteNumber: string; quoteDate: string }) {
  return (
    <div className="px-8 py-5 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #1a2e3b 0%, #2D3A4A 100%)' }}>
      <img src="/green-funding-invertedlogo.svg" alt="Green Funding" className="h-7" />
      <div className="text-right">
        <p className="text-white/50 text-xs uppercase tracking-widest">{quoteNumber}</p>
        <p className="text-white/40 text-xs mt-0.5">{quoteDate}</p>
      </div>
    </div>
  );
}

function PageFooter({ text }: { text?: string }) {
  return (
    <div className="px-8 py-4" style={{ background: 'linear-gradient(135deg, #1a2e3b 0%, #2D3A4A 100%)' }}>
      <p className="text-white/40 text-xs text-center">
        {text ?? 'This quote is indicative only and subject to credit approval. Valid for 30 days.'}
      </p>
    </div>
  );
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
    pdfUrl,
  } = quoteData;

  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const sortedTerms = [...termOptions].sort((a, b) => a.years - b.years);
  const firstTerm = sortedTerms[0];

  const hasSolar = !!(annualSolarGenerationKwh && annualSolarGenerationKwh > 0);
  const hasSavings = !!(energySavings && energySavings > 0);
  const isLowDoc = projectCost < 250000;
  const lowDocReqs = getLowDocRequirements(projectCost);

  const handleDownloadPdf = async () => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
      return;
    }
    if (!quoteData.quoteId) return;
    setDownloadingPdf(true);
    try {
      const { data } = await supabase
        .from('sent_quotes')
        .select('pdf_url')
        .eq('id', quoteData.quoteId)
        .maybeSingle();
      if (data?.pdf_url) {
        window.open(data.pdf_url, '_blank');
      }
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; margin: 0 !important; padding: 0 !important; }
          .print-container { box-shadow: none !important; border: none !important; padding: 0 !important; max-width: 210mm !important; margin: 0 auto !important; }
          .print-page { box-shadow: none !important; border-radius: 0 !important; margin: 0 !important; page-break-after: always; width: 210mm; min-height: 297mm; }
          .print-page:last-child { page-break-after: avoid; }
          @page { size: A4; margin: 0; }
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
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#34AC48] to-[#AFD235] text-white font-bold rounded-lg hover:shadow-lg transition-all text-sm disabled:opacity-60"
          >
            {downloadingPdf ? <Loader className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Download PDF
          </button>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-8 print-container space-y-8">

          {/* PAGE 1 — Cover + Repayment Options */}
          <div className="print-page bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="px-8 py-6" style={{ background: 'linear-gradient(135deg, #1a2e3b 0%, #2D3A4A 100%)' }}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <img src="/green-funding-invertedlogo.svg" alt="Green Funding" className="h-8 mb-2" />
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
                  <p className="text-white/80 text-xs mb-1">Project Cost (Inc. GST)</p>
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
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Payment Options</p>
              <div className="overflow-hidden rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: 'linear-gradient(135deg, #1a2e3b 0%, #2D3A4A 100%)' }}>
                      <th className="px-4 py-3 text-left text-white/80 font-semibold text-xs uppercase tracking-wide">Loan Term</th>
                      <th className="px-4 py-3 text-left text-white/80 font-semibold text-xs uppercase tracking-wide">Cost per kWh</th>
                      <th className="px-4 py-3 text-right text-white/80 font-semibold text-xs uppercase tracking-wide">Monthly Payment (Ex. GST)</th>
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
                        <td className="px-4 py-3.5">
                          {t.costPerKwhCents && t.costPerKwhCents > 0 ? (
                            <span className="font-semibold text-blue-700">{t.costPerKwhCents.toFixed(2)}¢</span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right font-bold text-[#28AA48] text-base">
                          {formatCurrencyDecimals(t.monthlyPayment)}
                          <span className="text-xs text-gray-400 font-normal">/mo</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                * Quote valid for 30 days from {quoteDate}.
              </p>
            </div>

            {hasSavings && energySavings && (
              <div className="px-8 py-6 border-b border-gray-100">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Savings Thanks to Solar</p>
                <SavingsChart
                  annualSavings={energySavings}
                  selectedTermYears={firstTerm?.years}
                  monthlyPayment={firstTerm?.monthlyPayment}
                />
              </div>
            )}

            {disclaimerText && (
              <div className="mx-8 mb-6 mt-4 px-5 py-4 rounded-xl bg-amber-50 border border-amber-100">
                <p className="text-xs text-amber-800">{disclaimerText}</p>
              </div>
            )}

            <PageFooter />
          </div>

          {/* PAGE 3 (or 2) — Requirements */}
          <div className="print-page bg-white rounded-2xl shadow-lg overflow-hidden">
            <PageHeader quoteNumber={quoteNumber} quoteDate={quoteDate} />

            <div className="px-8 py-6 border-b border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-5">What You'll Need to Apply</p>

              {isLowDoc && lowDocReqs ? (
                <div className="space-y-3">
                  <p className="text-sm font-bold text-[#3A475B]">{lowDocReqs.title}</p>
                  <ul className="space-y-2.5">
                    {lowDocReqs.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                        <Check className="w-4 h-4 text-[#28AA48] mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-700 flex-1">
                          {item.label}
                          {item.url && (
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-2 inline-flex items-center gap-1 text-xs text-[#28AA48] font-medium hover:underline"
                            >
                              Download <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-bold text-[#3A475B] mb-4">Full Doc Requirements</p>
                  <div className="overflow-hidden rounded-xl border border-gray-200">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ background: 'linear-gradient(135deg, #1a2e3b 0%, #2D3A4A 100%)' }}>
                          <th className="px-4 py-3 text-left text-white/80 font-semibold text-xs uppercase tracking-wide">Document</th>
                          <th className="px-4 py-3 text-center text-white/80 font-semibold text-xs uppercase tracking-wide">&lt;$500k</th>
                          <th className="px-4 py-3 text-center text-white/80 font-semibold text-xs uppercase tracking-wide">$500k–$1m</th>
                          <th className="px-4 py-3 text-center text-white/80 font-semibold text-xs uppercase tracking-wide">$1m+</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fullDocRequirements.map((req, i) => {
                          const isApplicable =
                            (projectCost < 500000 && req.under500k) ||
                            (projectCost >= 500000 && projectCost < 1000000 && req.between500kAnd1m) ||
                            (projectCost >= 1000000 && req.over1m);
                          return (
                            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className={`px-4 py-3.5 border-b border-gray-100 font-medium ${isApplicable ? 'text-[#3A475B]' : 'text-gray-400'}`}>
                                {req.document}
                              </td>
                              {[req.under500k, req.between500kAnd1m, req.over1m].map((val, ci) => (
                                <td key={ci} className="px-4 py-3.5 text-center border-b border-gray-100">
                                  <div className="flex justify-center">
                                    {val ? (
                                      <div className="w-7 h-7 bg-green-100 rounded-full flex items-center justify-center">
                                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                                      </div>
                                    ) : (
                                      <div className="w-7 h-7 bg-red-100 rounded-full flex items-center justify-center">
                                        <X className="w-4 h-4 text-red-500" />
                                      </div>
                                    )}
                                  </div>
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="px-8 py-6 border-b border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Get Started</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">
                    Contact your Green Funding representative to begin the application process. Our team will guide you through each step.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <p className="text-sm text-gray-500"><span className="font-medium text-[#3A475B]">Phone:</span> 1300 GET GFN</p>
                  <p className="text-sm text-gray-500"><span className="font-medium text-[#3A475B]">Email:</span> info@greenfunding.com.au</p>
                  <p className="text-sm text-gray-500"><span className="font-medium text-[#3A475B]">Web:</span> www.greenfunding.com.au</p>
                </div>
              </div>
            </div>


            <PageFooter />
          </div>

        </div>

        <div className="no-print mt-6 flex justify-center pb-8">
          <button
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-[#34AC48] to-[#AFD235] text-white font-bold rounded-xl hover:shadow-xl transition-all shadow-lg text-base disabled:opacity-60"
          >
            {downloadingPdf ? <Loader className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            Download PDF
          </button>
        </div>
      </div>
    </>
  );
}
