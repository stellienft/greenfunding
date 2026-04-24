import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, ExternalLink, Loader, Send, ThumbsUp, X as XIcon } from 'lucide-react';
import { SavingsChart } from '../components/SavingsChart';
import { CheckCircle2, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { calcSolarROI } from '../calculator';

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
  currentElectricityBill?: number;
  anticipatedElectricityBillWithSolar?: number;
  disclaimerText?: string;
  entityName?: string;
  companyAddress?: string;
  clientPersonName?: string;
  abn?: string;
  natureOfBusiness?: string;
  siteAddress?: string;
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
  linkText?: string;
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
      { label: '6 months Bank Statements', url: 'https://scv.bankstatements.com.au/HSHV', linkText: 'Statements Portal' },
      { label: 'Privacy Consent', url: 'https://drive.google.com/file/d/1aIw8H6qgvCcVIULRiVsanfKR38jWTOHN/view' },
      { label: 'Asset and Liability statement', url: 'https://drive.google.com/file/d/1RwQ-npssPkEN6bW_wDV3e5Gr0w3IpOgm/view' },
    ];
    return { title: 'Low Doc Requirements ($150k–$250k)', items: withBankStatements };
  }

  return { title: 'Low Doc Requirements (up to $150k)', items: base };
}

const fullDocRequirements: { document: string; under500k: boolean; between500kAnd1m: boolean; over1m: boolean; url?: string }[] = [
  { document: 'FY24 & FY25 Accountant prepared financials', under500k: true, between500kAnd1m: true, over1m: true },
  { document: 'Mgt YTD Dec 25 Financials', under500k: true, between500kAnd1m: true, over1m: true },
  { document: 'Finance Commitment Schedule', under500k: true, between500kAnd1m: true, over1m: true },
  { document: 'Current ATO Portal Statement', under500k: true, between500kAnd1m: true, over1m: true },
  { document: 'Business Overview and Major Clients', under500k: true, between500kAnd1m: true, over1m: true },
  { document: 'Asset and Liability', under500k: true, between500kAnd1m: true, over1m: true, url: 'https://drive.google.com/file/d/1RwQ-npssPkEN6bW_wDV3e5Gr0w3IpOgm/view' },
  { document: 'Privacy Consent', under500k: true, between500kAnd1m: true, over1m: true, url: 'https://drive.google.com/file/d/1aIw8H6qgvCcVIULRiVsanfKR38jWTOHN/view' },
  { document: 'Aged Debtors and Creditors', under500k: false, between500kAnd1m: true, over1m: true },
  { document: 'Cashflow Projections', under500k: false, between500kAnd1m: false, over1m: true },
];

function PageHeader({ quoteNumber, quoteDate }: { quoteNumber: string; quoteDate: string }) {
  return (
    <div className="px-8 py-5 flex items-center justify-between" style={{ background: '#094325' }}>
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
    <div className="px-8 py-4" style={{ background: '#094325' }}>
      <p className="text-white/40 text-xs text-center">
        {text ?? 'This proposal is indicative only and subject to credit approval. Valid for 30 days.'}
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
    currentElectricityBill,
    anticipatedElectricityBillWithSolar,
    disclaimerText,
    entityName,
    companyAddress,
    clientPersonName,
    siteAddress,
  } = quoteData;

  const [showSendModal, setShowSendModal] = useState(false);
  const [sendingQuote, setSendingQuote] = useState(false);
  const [quoteSent, setQuoteSent] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [approvingQuote, setApprovingQuote] = useState(false);
  const [quoteApproved, setQuoteApproved] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);

  const displaySiteAddress = siteAddress || clientAddress;
  const displayPreparedFor = entityName || clientName;

  const sortedTerms = [...termOptions].sort((a, b) => a.years - b.years);
  const firstTerm = sortedTerms[0];

  const hasSolar = !!(annualSolarGenerationKwh && annualSolarGenerationKwh > 0);
  const hasSavings = !!(currentElectricityBill && currentElectricityBill > 0 && anticipatedElectricityBillWithSolar !== undefined);
  const roiMetrics = hasSavings && firstTerm
    ? calcSolarROI(
        projectCost,
        currentElectricityBill!,
        anticipatedElectricityBillWithSolar!,
        firstTerm.years,
        firstTerm.monthlyPayment * 12
      )
    : null;
  const isDecarbOrBuilding = (() => {
    const hasSolarOrMicrogrid = assetNames.some(n => n === 'Solar System' || n === 'Microgrid');
    if (hasSolarOrMicrogrid) return false;
    return assetNames.some(n => n === 'Decarbonising Technologies' || n === 'Building Upgrade');
  })();
  const isLowDoc = projectCost < 250000;
  const lowDocReqs = getLowDocRequirements(projectCost);

  const handleSendQuoteToClient = async () => {
    if (!quoteData.quoteId || !clientEmail) return;
    setSendingQuote(true);
    setSendError(null);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${supabaseUrl}/functions/v1/send-quote-email?mode=send-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || supabaseAnonKey}`,
          'Apikey': supabaseAnonKey,
        },
        body: JSON.stringify({ quoteId: quoteData.quoteId }),
      });
      const result = await res.json();
      if (!res.ok || result.error) throw new Error(result.error || 'Failed to send');
      setQuoteSent(true);
    } catch (err: any) {
      setSendError(err.message || 'Failed to send quote link');
    } finally {
      setSendingQuote(false);
    }
  };

  const handleApproveQuote = async () => {
    if (!quoteData.quoteId) return;
    setApprovingQuote(true);
    setApproveError(null);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${supabaseUrl}/functions/v1/accept-quote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || supabaseAnonKey}`,
          'Apikey': supabaseAnonKey,
        },
        body: JSON.stringify({ quoteId: quoteData.quoteId }),
      });
      const result = await res.json();
      if (!res.ok || result.error) throw new Error(result.error || 'Failed to approve');
      setQuoteApproved(true);
      setShowApproveConfirm(false);
    } catch (err: any) {
      setApproveError(err.message || 'Failed to approve quote');
      setShowApproveConfirm(false);
    } finally {
      setApprovingQuote(false);
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
        <div className="no-print sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-[#3A475B] transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Calculator</span>
          </button>
          <div className="flex items-center gap-2">
            {quoteData.quoteId && clientEmail && (
              <button
                onClick={() => setShowSendModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#3A475B] text-white font-semibold rounded-lg hover:bg-[#2d3848] transition-all text-sm"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Send to Client</span>
              </button>
            )}
            {quoteData.quoteId && (
              <button
                onClick={() => setShowApproveConfirm(true)}
                disabled={quoteApproved || approvingQuote}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#28AA48] text-white font-semibold rounded-lg hover:bg-[#229940] transition-all text-sm disabled:opacity-60"
              >
                {approvingQuote ? <Loader className="w-4 h-4 animate-spin" /> : <ThumbsUp className="w-4 h-4" />}
                <span className="hidden sm:inline">{quoteApproved ? 'Approved' : 'Approve Proposal'}</span>
              </button>
            )}
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-8 print-container space-y-8">

          {/* PAGE 1 — Cover + Repayment Options */}
          <div className="print-page bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="px-8 py-6" style={{ background: '#094325' }}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <img src="/green-funding-invertedlogo.svg" alt="Green Funding" className="h-8 mb-2" />
                  <p className="text-white/60 text-sm">Finance Solutions for Clean Energy</p>
                </div>
                <div className="text-right">
                  <p className="text-white/50 text-xs uppercase tracking-widest mb-1">Finance Proposal</p>
                  <p className="text-white font-bold text-lg">{quoteNumber}</p>
                  <p className="text-white/60 text-sm mt-0.5">{quoteDate}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 border-b border-gray-100">
              <div className="px-8 py-6 border-r border-gray-100">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Prepared By</p>
                {installerCompany ? (
                  <>
                    <p className="font-bold text-[#3A475B] text-base">{installerCompany}</p>
                    {installerName && <p className="text-gray-600 text-sm mt-0.5">{installerName}</p>}
                  </>
                ) : installerName ? (
                  <p className="font-bold text-[#3A475B] text-base">{installerName}</p>
                ) : (
                  <p className="font-bold text-[#3A475B] text-base">Green Funding</p>
                )}
                {installerEmail && <p className="text-gray-500 text-sm mt-0.5">{installerEmail}</p>}
                {installerPhone && <p className="text-gray-500 text-sm mt-0.5">{installerPhone}</p>}
              </div>
              <div className="px-8 py-6">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Prepared For</p>
                <p className="font-bold text-[#3A475B] text-base">{displayPreparedFor}</p>
                {clientPersonName && entityName && <p className="text-gray-600 text-sm mt-0.5">{clientPersonName}</p>}
                {companyAddress && <p className="text-gray-500 text-sm mt-0.5">{companyAddress}</p>}
                {clientEmail && <p className="text-gray-500 text-sm mt-0.5">{clientEmail}</p>}
                {clientPhone && <p className="text-gray-500 text-sm mt-0.5">{clientPhone}</p>}
              </div>
            </div>

            <div className="px-8 py-6 border-b border-gray-100">
              <div className="flex items-baseline gap-3 mb-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Project Summary</p>
                {displaySiteAddress && (
                  <p className="text-xs text-gray-500"><span className="font-semibold text-gray-600">Site:</span> {displaySiteAddress}</p>
                )}
              </div>
              {(() => {
                const summaryCardCount = 2 + (systemSize ? 1 : 0) + (hasSolar && annualSolarGenerationKwh ? 1 : 0);
                const colClass = summaryCardCount === 2 ? 'grid-cols-2' : summaryCardCount === 3 ? 'grid-cols-3' : 'grid-cols-4';
                return (
                  <div className={`grid ${colClass} gap-4`}>
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
                );
              })()}
            </div>

            {roiMetrics && (
              <div className="px-8 py-6 border-b border-gray-100">
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-xl p-4 text-center bg-gray-50 border border-gray-100">
                    <p className="text-gray-500 text-xs mb-1">Payback Period</p>
                    <p className="text-[#3A475B] font-bold text-sm">{roiMetrics.paybackYears} yrs</p>
                  </div>
                  <div className="rounded-xl p-4 text-center bg-gray-50 border border-gray-100">
                    <p className="text-gray-500 text-xs mb-1">Return on Investment</p>
                    <p className="text-[#3A475B] font-bold text-sm">{roiMetrics.roiMultiple}x</p>
                  </div>
                  <div className="rounded-xl p-4 text-center bg-gray-50 border border-gray-100">
                    <p className="text-gray-500 text-xs mb-1">IRR</p>
                    <p className="text-[#3A475B] font-bold text-sm">{roiMetrics.irrPercent}%</p>
                  </div>
                </div>
              </div>
            )}

            <div className="px-8 py-6 border-b border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Payment Options</p>
              <div className="overflow-hidden rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: '#094325' }}>
                      <th className="px-4 py-3 text-left text-white/80 font-semibold text-xs uppercase tracking-wide">Loan Term</th>
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
                        <td className="px-4 py-3.5 text-right">
                          <div className="font-bold text-[#28AA48] text-base">
                            {formatCurrencyDecimals(t.monthlyPayment)}
                            <span className="text-xs text-gray-400 font-normal">/mo</span>
                          </div>
                          {hasSolar && t.costPerKwhCents != null && (
                            <div className="text-xs text-gray-400 font-normal mt-0.5">
                              ~<span className="font-semibold text-[#3A475B]">{(t.costPerKwhCents).toFixed(2)}¢</span> per kWh
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                * Quote valid for 30 days from {quoteDate}.
              </p>
              {hasSolar && (
                <p className="text-xs text-gray-400 mt-1">
                  * This calculation shows equivalent cents per kWh for comparison purposes only. Actual billing is based on fixed monthly installments, not per-kWh usage.
                </p>
              )}
            </div>

            {hasSavings && currentElectricityBill !== undefined && anticipatedElectricityBillWithSolar !== undefined && (
              <div className="px-8 py-6 border-b border-gray-100">
                <SavingsChart
                  currentElectricityBill={currentElectricityBill}
                  anticipatedElectricityBillWithSolar={anticipatedElectricityBillWithSolar}
                  selectedTermYears={firstTerm?.years}
                  monthlyPayment={firstTerm?.monthlyPayment}
                  isDecarbOrBuilding={isDecarbOrBuilding}
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
                              {item.linkText ?? 'Download'} <ExternalLink className="w-3 h-3" />
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
                        <tr style={{ background: '#094325' }}>
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
                                <div className="flex items-center justify-between gap-2">
                                  <span>{req.document}</span>
                                  {req.url && (
                                    <a href={req.url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-[#28AA48] hover:underline whitespace-nowrap shrink-0">[Download]</a>
                                  )}
                                </div>
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

            <div className="px-8 py-5 border-b border-gray-100">
              <p className="text-[10px] leading-relaxed text-gray-400">
                <span className="font-semibold text-gray-500">Disclaimer</span> The repayment amounts and any other financial information set out in this document are indicative only and provided for illustrative purposes. They do not constitute a commitment, approval, or offer of finance. Final terms, including pricing and repayments, are subject to the submission of a formal application and approval by Green Funding in accordance with its lending criteria, terms, and conditions. This document is provided for information purposes only and does not constitute financial product advice, investment advice, or taxation advice, nor a recommendation. It has been prepared without taking into account the objectives, financial situation, or needs of any recipient. Recipients should make their own assessment and obtain appropriate independent advice before acting. Any projections, forecasts, models, or illustrative materials (including graphs) are based on information obtained from third parties and a range of assumptions, which have not been independently verified. Those assumptions may change, and actual outcomes may differ due to factors including changes in market conditions, regulations, energy pricing, inflation, interest rates, and site-specific variables. All applications are subject to standard approval criteria. Terms and conditions apply.
              </p>
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
                  <p className="text-sm text-gray-500"><span className="font-medium text-[#3A475B]">Phone:</span> 1300 403 100</p>
                  <p className="text-sm text-gray-500"><span className="font-medium text-[#3A475B]">Email:</span> solutions@greenfunding.com.au</p>
                  <p className="text-sm text-gray-500"><span className="font-medium text-[#3A475B]">Web:</span> www.greenfunding.com.au</p>
                </div>
              </div>
            </div>


            <PageFooter />
          </div>

        </div>

        <div className="no-print mt-6 flex flex-wrap justify-center gap-3 pb-8">
          {quoteData.quoteId && clientEmail && (
            <button
              onClick={() => setShowSendModal(true)}
              className="flex items-center gap-2 px-7 py-3.5 bg-[#3A475B] text-white font-bold rounded-xl hover:bg-[#2d3848] transition-all shadow-md text-base"
            >
              <Send className="w-5 h-5" />
              Send to Client
            </button>
          )}
          {quoteData.quoteId && (
            <button
              onClick={() => setShowApproveConfirm(true)}
              disabled={quoteApproved || approvingQuote}
              className="flex items-center gap-2 px-7 py-3.5 bg-[#28AA48] text-white font-bold rounded-xl hover:bg-[#229940] transition-all shadow-md text-base disabled:opacity-60"
            >
              {approvingQuote ? <Loader className="w-5 h-5 animate-spin" /> : <ThumbsUp className="w-5 h-5" />}
              {quoteApproved ? 'Proposal Approved' : 'Approve Proposal'}
            </button>
          )}
        </div>
      </div>

      {/* Send to Client Modal */}
      {showSendModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 relative">
            <button onClick={() => { setShowSendModal(false); setQuoteSent(false); setSendError(null); }} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <XIcon className="w-5 h-5" />
            </button>
            {quoteSent ? (
              <div className="text-center py-4">
                <div className="flex items-center justify-center w-14 h-14 bg-green-100 rounded-full mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-[#28AA48]" />
                </div>
                <h3 className="text-lg font-bold text-[#3A475B] mb-2">Proposal Sent!</h3>
                <p className="text-gray-500 text-sm">A unique link has been sent to <span className="font-semibold text-[#3A475B]">{clientEmail}</span> for them to review and approve the proposal.</p>
                <button onClick={() => { setShowSendModal(false); setQuoteSent(false); }} className="mt-5 w-full px-4 py-2.5 bg-[#28AA48] text-white font-bold rounded-xl">Done</button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center justify-center w-10 h-10 bg-[#3A475B]/10 rounded-xl flex-shrink-0">
                    <Send className="w-5 h-5 text-[#3A475B]" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#3A475B]">Send Proposal to Client</h3>
                    <p className="text-xs text-gray-500">A unique review link will be emailed</p>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 mb-4">
                  <p className="text-xs text-gray-500 mb-0.5">Sending to</p>
                  <p className="font-semibold text-[#3A475B] text-sm">{displayPreparedFor}</p>
                  <p className="text-sm text-gray-600">{clientEmail}</p>
                </div>
                <p className="text-xs text-gray-500 mb-4">The client will receive a unique link with a secure access code to review and approve the proposal online.</p>
                {sendError && <p className="text-xs text-red-500 mb-3">{sendError}</p>}
                <div className="flex gap-2">
                  <button onClick={() => setShowSendModal(false)} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 text-sm">Cancel</button>
                  <button onClick={handleSendQuoteToClient} disabled={sendingQuote} className="flex-1 px-4 py-2.5 bg-[#3A475B] text-white font-bold rounded-xl hover:bg-[#2d3848] disabled:opacity-60 text-sm flex items-center justify-center gap-2">
                    {sendingQuote ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Send Now
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Approve Proposal Confirm Modal */}
      {showApproveConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 relative">
            <button onClick={() => setShowApproveConfirm(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <XIcon className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-10 h-10 bg-[#28AA48]/10 rounded-xl flex-shrink-0">
                <ThumbsUp className="w-5 h-5 text-[#28AA48]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#3A475B]">Approve This Proposal</h3>
                <p className="text-xs text-gray-500">This will trigger the document process</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Approving will mark this proposal as accepted and automatically send <span className="font-semibold text-[#3A475B]">{clientEmail || displayPreparedFor}</span> a unique link to begin the document requirements.
            </p>
            {approveError && <p className="text-xs text-red-500 mb-3">{approveError}</p>}
            <div className="flex gap-2">
              <button onClick={() => setShowApproveConfirm(false)} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 text-sm">Cancel</button>
              <button onClick={handleApproveQuote} disabled={approvingQuote} className="flex-1 px-4 py-2.5 bg-[#28AA48] text-white font-bold rounded-xl hover:bg-[#229940] disabled:opacity-60 text-sm flex items-center justify-center gap-2">
                {approvingQuote ? <Loader className="w-4 h-4 animate-spin" /> : <ThumbsUp className="w-4 h-4" />}
                Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Proposal Approved Success */}
      {quoteApproved && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#28AA48] text-white px-6 py-3 rounded-xl shadow-xl flex items-center gap-3 text-sm font-semibold">
          <CheckCircle2 className="w-5 h-5" />
          Proposal approved — client emailed with document upload link
        </div>
      )}
    </>
  );
}
