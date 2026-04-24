import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader, CheckCircle2, ThumbsUp, X, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { SavingsChart } from '../components/SavingsChart';
import { calcSolarROI } from '../calculator';

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
    return {
      title: 'Low Doc Requirements ($150k–$250k)',
      items: [
        { label: "Directors Drivers Licence & Medicare card" },
        { label: '6 months Bank Statements', url: 'https://scv.bankstatements.com.au/HSHV', linkText: 'Statements Portal' },
        { label: 'Privacy Consent', url: 'https://drive.google.com/file/d/1aIw8H6qgvCcVIULRiVsanfKR38jWTOHN/view' },
        { label: 'Asset and Liability statement', url: 'https://drive.google.com/file/d/1RwQ-npssPkEN6bW_wDV3e5Gr0w3IpOgm/view' },
      ],
    };
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

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

function formatCurrencyDecimals(n: number) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function formatQuoteNumber(n: number) {
  return `#${String(n).padStart(6, '0')}`;
}

type Step = 'verify' | 'loading' | 'quote' | 'approved' | 'error';

interface QuoteData {
  id: string;
  quote_number: number;
  created_at: string;
  recipient_name: string | null;
  recipient_company: string | null;
  recipient_email: string | null;
  client_phone: string | null;
  site_address: string | null;
  company_address: string | null;
  system_size: string | null;
  project_cost: number;
  asset_names: string[];
  term_options: Array<{ years: number; monthlyPayment: number; interestRate: number; totalFinanced: number }>;
  custom_term_options: Array<{ years: number; monthlyPayment: number; interestRate: number; totalFinanced?: number }> | null;
  admin_review_status: string | null;
  payment_timing: string;
  calculator_type: string;
  portal_access_code: string | null;
  upload_token_expires_at: string | null;
  accepted_at: string | null;
  pdf_url: string | null;
  entity_name: string | null;
  client_person_name: string | null;
  installer_id: string | null;
  annual_solar_generation_kwh: number | null;
  energy_savings: number | null;
  current_electricity_bill: number | null;
  anticipated_electricity_bill_with_solar: number | null;
}

interface InstallerInfo {
  full_name: string | null;
  company_name: string | null;
  email: string | null;
  phone_number: string | null;
  logo_url: string | null;
}


export function ReviewQuote() {
  const { id } = useParams<{ id: string }>();
  const [step, setStep] = useState<Step>('verify');
  const [accessCode, setAccessCode] = useState('');
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [installer, setInstaller] = useState<InstallerInfo | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [approvingQuote, setApprovingQuote] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);

  async function handleVerify() {
    if (!accessCode.trim() || !id) {
      setVerifyError('Please enter your access code.');
      return;
    }
    setVerifying(true);
    setVerifyError(null);
    setStep('loading');
    try {
      const { data, error } = await supabase
        .from('sent_quotes')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error || !data) {
        setVerifyError('This proposal link is invalid or has expired.');
        setStep('verify');
        return;
      }

      if (data.portal_access_code !== accessCode.trim()) {
        setVerifyError('Incorrect access code. Please try again.');
        setStep('verify');
        return;
      }

      if (data.upload_token_expires_at && new Date(data.upload_token_expires_at) < new Date()) {
        setVerifyError('This proposal link has expired. Please contact your representative.');
        setStep('verify');
        return;
      }

      if (data.accepted_at) {
        setQuote(data);
        setStep('approved');
        return;
      }

      if (data.installer_id) {
        const { data: inst } = await supabase
          .from('installer_users')
          .select('full_name, company_name, email, phone_number, logo_url')
          .eq('id', data.installer_id)
          .maybeSingle();
        if (inst) setInstaller(inst);
      }

      setQuote(data);
      setStep('quote');

      await supabase.from('sent_quotes').update({ status: 'viewed' }).eq('id', id).eq('status', 'generated');
    } catch {
      setVerifyError('Something went wrong. Please try again.');
      setStep('verify');
    } finally {
      setVerifying(false);
    }
  }

  async function handleApprove() {
    if (!id) return;
    setApprovingQuote(true);
    setApproveError(null);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const res = await fetch(`${supabaseUrl}/functions/v1/accept-quote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Apikey': supabaseAnonKey,
        },
        body: JSON.stringify({ quoteId: id }),
      });
      const result = await res.json();
      if (!res.ok || result.error) throw new Error(result.error || 'Failed to approve');
      setStep('approved');
      setShowApproveConfirm(false);
    } catch (err: any) {
      setApproveError(err.message || 'Failed to approve quote');
      setShowApproveConfirm(false);
    } finally {
      setApprovingQuote(false);
    }
  }

  if (step === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader className="w-8 h-8 animate-spin text-[#28AA48]" />
      </div>
    );
  }

  if (step === 'approved') {
    const clientName = quote?.client_person_name || quote?.recipient_name || quote?.entity_name || quote?.recipient_company || 'Valued Customer';
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 max-w-md w-full p-10 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-8 h-8 text-[#28AA48]" />
          </div>
          <img src="/green-funding-logo1.svg" alt="Green Funding" className="h-6 mx-auto mb-6 opacity-70" />
          <h2 className="text-xl font-bold text-[#3A475B] mb-2">Proposal Approved</h2>
          <p className="text-gray-500 text-sm mb-2">Thank you, <strong>{clientName}</strong>.</p>
          <p className="text-gray-500 text-sm mb-6">Your proposal has been approved. You should receive an email shortly with a link to submit your required documents.</p>
          <p className="text-xs text-gray-400">Questions? Call us on <a href="tel:1300403100" className="text-[#28AA48] font-semibold">1300 403 100</a></p>
        </div>
      </div>
    );
  }

  if (step === 'verify' || step === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 max-w-sm w-full p-8">
          <img src="/green-funding-logo1.svg" alt="Green Funding" className="h-8 mb-6" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <h1 className="text-xl font-bold text-[#3A475B] mb-1">View Your Proposal</h1>
          <p className="text-gray-500 text-sm mb-6">Enter the 6-digit access code from your email to view your finance proposal.</p>
          {verifyError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{verifyError}</div>
          )}
          <label className="block text-sm font-semibold text-[#3A475B] mb-2">Access Code</label>
          <input
            type="text"
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
            placeholder="000000"
            maxLength={6}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-center text-2xl font-bold tracking-[0.3em] text-[#3A475B] focus:ring-2 focus:ring-[#28AA48] focus:border-transparent mb-4"
          />
          <button
            onClick={() => handleVerify()}
            disabled={verifying || accessCode.length < 6}
            className="w-full py-3 bg-gradient-to-r from-[#34AC48] to-[#AFD235] text-white font-bold rounded-xl hover:shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {verifying ? <Loader className="w-4 h-4 animate-spin" /> : null}
            View Proposal
          </button>
          <p className="text-xs text-gray-400 text-center mt-4">Need help? Call <a href="tel:1300403100" className="text-[#28AA48]">1300 403 100</a></p>
        </div>
      </div>
    );
  }

  if (!quote) return null;

  const activeTerms = (quote.custom_term_options && quote.admin_review_status === 'rates_applied')
    ? quote.custom_term_options
    : quote.term_options;
  const sortedTerms = [...(activeTerms || [])].sort((a, b) => a.years - b.years);
  const firstTerm = sortedTerms[0];
  const projectCost = quote.project_cost;
  const isLowDoc = projectCost < 250000;
  const lowDocReqs = getLowDocRequirements(projectCost);
  const displayName = quote.client_person_name || quote.recipient_name || quote.entity_name || quote.recipient_company || 'Valued Customer';
  const displayPreparedFor = quote.entity_name || quote.recipient_company || quote.client_person_name || quote.recipient_name || '';
  const displaySiteAddress = quote.site_address || '';
  const quoteNumber = formatQuoteNumber(quote.quote_number);
  const quoteDate = new Date(quote.created_at).toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const hasSolar = !!(quote.annual_solar_generation_kwh && quote.annual_solar_generation_kwh > 0);
  const effectiveEnergySavings = quote.energy_savings && quote.energy_savings > 0
    ? quote.energy_savings
    : (quote.annual_solar_generation_kwh && quote.annual_solar_generation_kwh > 0 ? quote.annual_solar_generation_kwh * 0.30 : 0);

  const currentBill = quote.current_electricity_bill ?? effectiveEnergySavings;
  const billWithSolar = quote.anticipated_electricity_bill_with_solar ?? (effectiveEnergySavings * 0.05);

  const isDecarbOrBuilding = (() => {
    const names: string[] = quote.asset_names ?? [];
    const hasSolarOrMicrogrid = names.some(n => n === 'Solar System' || n === 'Microgrid');
    if (hasSolarOrMicrogrid) return false;
    return names.some(n => n === 'Decarbonising Technologies' || n === 'Building Upgrade');
  })();

  const hasElectricityBillData = !!(quote.current_electricity_bill && quote.current_electricity_bill > 0 && quote.anticipated_electricity_bill_with_solar !== undefined && quote.anticipated_electricity_bill_with_solar !== null);
  const showSavingsChart = (hasSolar && effectiveEnergySavings > 0) || (isDecarbOrBuilding && hasElectricityBillData);

  const roiMetrics = hasElectricityBillData && firstTerm
    ? calcSolarROI(
        projectCost,
        quote.current_electricity_bill!,
        quote.anticipated_electricity_bill_with_solar!,
        firstTerm.years,
        firstTerm.monthlyPayment * 12
      )
    : null;

  const isEVOnly = quote.asset_names?.length === 1 && quote.asset_names[0] === 'Electric Vehicles';

  const infoCards: { label: string; value: string; highlight?: boolean }[] = [
    { label: isEVOnly ? 'EV Invoice (Inc. GST)' : 'Project Cost (Inc. GST)', value: formatCurrency(projectCost), highlight: true },
    ...(quote.asset_names && quote.asset_names.length > 0 ? [{ label: 'Equipment', value: quote.asset_names.join(', ') }] : []),
    ...(quote.system_size ? [{ label: 'System Size', value: quote.system_size }] : []),
    ...(hasSolar && quote.annual_solar_generation_kwh ? [{ label: 'Annual Generation', value: `${quote.annual_solar_generation_kwh.toLocaleString()} kWh` }] : []),
  ];

  return (
    <>
      <style>{`@media print { .no-print { display: none !important; } }`}</style>
      <div className="min-h-screen bg-gray-50">

        <div className="no-print sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
          <img src="/green-funding-logo1.svg" alt="Green Funding" className="h-8" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <button
            onClick={() => setShowApproveConfirm(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#34AC48] to-[#AFD235] text-white font-bold rounded-xl hover:shadow-md transition-all text-sm"
          >
            <ThumbsUp className="w-4 h-4" />
            Approve Proposal
          </button>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

          {/* Header card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-8 py-5 flex items-center justify-between" style={{ background: '#094325' }}>
              <img src="/green-funding-invertedlogo.svg" alt="Green Funding" className="h-7" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              <div className="text-right">
                <p className="text-white/50 text-xs uppercase tracking-widest">{quoteNumber}</p>
                <p className="text-white/40 text-xs mt-0.5">{quoteDate}</p>
              </div>
            </div>

            <div className="px-8 py-6 border-b border-gray-100">
              <p className="text-2xl font-bold text-[#3A475B] mb-1">Green Funding Finance Proposal</p>
              <p className="text-sm text-gray-500">This proposal is personalised for {displayName}</p>
            </div>

            {/* Prepared by / for */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 border-b border-gray-100">
              <div className="px-8 py-6 border-r border-gray-100">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Prepared By</p>
                {installer?.logo_url && (
                  <img src={installer.logo_url} alt="Installer logo" className="h-8 mb-2 object-contain" />
                )}
                {installer?.company_name ? (
                  <>
                    <p className="font-bold text-[#3A475B] text-base">{installer.company_name}</p>
                    {installer.full_name && <p className="text-gray-600 text-sm mt-0.5">{installer.full_name}</p>}
                  </>
                ) : installer?.full_name ? (
                  <p className="font-bold text-[#3A475B] text-base">{installer.full_name}</p>
                ) : (
                  <p className="font-bold text-[#3A475B] text-base">Green Funding</p>
                )}
                {installer?.email && <p className="text-gray-500 text-sm mt-0.5">{installer.email}</p>}
                {installer?.phone_number && <p className="text-gray-500 text-sm mt-0.5">{installer.phone_number}</p>}
              </div>
              <div className="px-8 py-6">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Prepared For</p>
                <p className="font-bold text-[#3A475B] text-base">{displayPreparedFor}</p>
                {quote.client_person_name && (quote.entity_name || quote.recipient_company) && (
                  <p className="text-gray-600 text-sm mt-0.5">{quote.client_person_name}</p>
                )}
                {quote.company_address && <p className="text-gray-500 text-sm mt-0.5">{quote.company_address}</p>}
                {quote.recipient_email && <p className="text-gray-500 text-sm mt-0.5">{quote.recipient_email}</p>}
                {quote.client_phone && <p className="text-gray-500 text-sm mt-0.5">{quote.client_phone}</p>}
              </div>
            </div>

            {/* Project summary cards */}
            <div className="px-8 py-6 border-b border-gray-100">
              <div className="flex items-baseline gap-3 mb-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{isEVOnly ? 'Electric Vehicle' : 'Project Summary'}</p>
                {displaySiteAddress && (
                  <p className="text-xs text-gray-500"><span className="font-semibold text-gray-600">Site:</span> {displaySiteAddress}</p>
                )}
              </div>
              <div className={`grid gap-4 ${infoCards.length === 1 ? 'grid-cols-1' : infoCards.length === 2 ? 'grid-cols-2' : infoCards.length === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
                {infoCards.map((card, i) => (
                  <div
                    key={i}
                    className="rounded-xl p-4 text-center"
                    style={card.highlight
                      ? { background: 'linear-gradient(135deg, #28AA48, #7DC241)' }
                      : { background: '#F9FAFB', border: '1px solid #F3F4F6' }}
                  >
                    <p className={`text-xs mb-1 ${card.highlight ? 'text-white/80' : 'text-gray-500'}`}>{card.label}</p>
                    <p className={`font-bold text-sm ${card.highlight ? 'text-white text-lg' : 'text-[#3A475B]'}`}>{card.value}</p>
                  </div>
                ))}
              </div>
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

            {/* Payment options table */}
            {sortedTerms.length > 0 && (
              <div className="px-8 py-6 border-b border-gray-100">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Payment Options</p>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left text-xs font-bold text-gray-500 pb-3">Term</th>
                        <th className="text-right text-xs font-bold text-gray-500 pb-3">Monthly Payment (Ex. GST)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedTerms.map((term, i) => (
                        <tr key={i} className={`border-b border-gray-50 ${i === 0 ? 'bg-green-50/50' : ''}`}>
                          <td className="py-3 text-sm font-semibold text-[#3A475B]">
                            {term.years} Year{term.years !== 1 ? 's' : ''}
                          </td>
                          <td className="py-3 text-right text-sm font-bold text-[#3A475B]">
                            {formatCurrencyDecimals(term.monthlyPayment)}/mo
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-gray-400 mt-3">Payments are Ex. GST. GST applies to each payment.</p>
              </div>
            )}

            {/* Savings chart */}
            {showSavingsChart && (
              <div className="px-8 py-6 border-b border-gray-100">
                <SavingsChart
                  currentElectricityBill={currentBill}
                  anticipatedElectricityBillWithSolar={billWithSolar}
                  selectedTermYears={firstTerm?.years ?? null}
                  monthlyPayment={firstTerm?.monthlyPayment}
                  isDecarbOrBuilding={isDecarbOrBuilding}
                />
              </div>
            )}

            {/* Document requirements */}
            <div className="px-8 py-6 border-b border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-5">What You'll Need to Apply</p>
              {isLowDoc && lowDocReqs ? (
                <div className="space-y-3">
                  <p className="text-sm font-bold text-[#3A475B]">{lowDocReqs.title}</p>
                  <ul className="space-y-2.5">
                    {lowDocReqs.items.map((req, i) => (
                      <li key={i} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                        <CheckCircle2 className="w-4 h-4 text-[#28AA48] mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-700 flex-1">
                          {req.label}
                          {req.url && (
                            <a href={req.url} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center gap-1 text-xs text-[#28AA48] font-medium hover:underline">
                              {req.linkText ?? 'Download'} <ExternalLink className="w-3 h-3" />
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
                        {fullDocRequirements.map((req, i) => (
                          <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-4 py-3.5 border-b border-gray-100 font-medium text-[#3A475B]">
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
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Disclaimer */}
            <div className="px-8 py-5 border-b border-gray-100">
              <p className="text-[10px] leading-relaxed text-gray-400">
                <span className="font-semibold text-gray-500">Disclaimer</span> The repayment amounts and any other financial information set out in this document are indicative only and provided for illustrative purposes. They do not constitute a commitment, approval, or offer of finance. Final terms, including pricing and repayments, are subject to the submission of a formal application and approval by Green Funding in accordance with its lending criteria, terms, and conditions. This document is provided for information purposes only and does not constitute financial product advice, investment advice, or taxation advice, nor a recommendation. It has been prepared without taking into account the objectives, financial situation, or needs of any recipient. Recipients should make their own assessment and obtain appropriate independent advice before acting. Any projections, forecasts, models, or illustrative materials (including graphs) are based on information obtained from third parties and a range of assumptions, which have not been independently verified. Those assumptions may change, and actual outcomes may differ due to factors including changes in market conditions, regulations, energy pricing, inflation, interest rates, and site-specific variables. All applications are subject to standard approval criteria. Terms and conditions apply.
              </p>
            </div>

            {/* Get Started / Contact */}
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

            {/* CTA */}
            <div className="px-8 py-6 border-b border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Ready to Proceed?</p>
              <p className="text-sm text-gray-600 mb-4">
                Click "Approve Proposal" below to accept this proposal. You'll receive an email with a secure link to submit your documents.
              </p>
              <button
                onClick={() => setShowApproveConfirm(true)}
                className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-[#34AC48] to-[#AFD235] text-white font-bold rounded-xl hover:shadow-lg transition-all text-base"
              >
                <ThumbsUp className="w-5 h-5" />
                Approve Proposal
              </button>
              <p className="text-xs text-gray-400 mt-4">
                Have any questions? Email our support team at{' '}
                <a href="mailto:solutions@greenfunding.com.au" className="text-[#28AA48]">solutions@greenfunding.com.au</a>
                {' '}and quote your proposal number <strong className="text-gray-500">{quoteNumber}</strong> for help.
              </p>
            </div>

            <div className="px-8 py-5" style={{ background: '#094325' }}>
              <p className="text-white/40 text-xs text-center">
                This proposal is indicative only and subject to credit approval. Valid for 30 days.
              </p>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 pb-4">
            Questions? Call us on <a href="tel:1300403100" className="text-[#28AA48] font-semibold">1300 403 100</a> or email <a href="mailto:solutions@greenfunding.com.au" className="text-[#28AA48]">solutions@greenfunding.com.au</a>
          </p>
        </div>
      </div>

      {showApproveConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 relative">
            <button onClick={() => setShowApproveConfirm(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#28AA48]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <ThumbsUp className="w-5 h-5 text-[#28AA48]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#3A475B]">Approve This Proposal?</h3>
                <p className="text-xs text-gray-500">You'll be sent a document upload link</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              By approving, you confirm you'd like to proceed with this Green Funding proposal. An email will be sent to <strong>{quote.recipient_email}</strong> with a secure link to submit your required documents.
            </p>
            {approveError && <p className="text-xs text-red-500 mb-3">{approveError}</p>}
            <div className="flex gap-2">
              <button onClick={() => setShowApproveConfirm(false)} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 text-sm">
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={approvingQuote}
                className="flex-1 px-4 py-2.5 bg-[#28AA48] text-white font-bold rounded-xl hover:bg-[#229940] disabled:opacity-60 text-sm flex items-center justify-center gap-2"
              >
                {approvingQuote ? <Loader className="w-4 h-4 animate-spin" /> : <ThumbsUp className="w-4 h-4" />}
                Yes, Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
