import { useState, useRef, useEffect } from 'react';
import { Check, Download, CheckCircle, AlertCircle, RefreshCw, User, Send, Building2, Search, Loader2, MapPin } from 'lucide-react';

interface TermOption {
  years: number;
  monthlyPayment: number;
  interestRate?: number;
  totalFinanced?: number;
}

export interface QuoteClientFields {
  clientName: string;
  clientEmail: string;
  clientAddress: string;
  clientPhone: string;
  companyAddress: string;
  companyPhone: string;
  systemSize: string;
  abn: string;
  entityName: string;
  incorporationDate: string;
  natureOfBusiness: string;
  clientPersonName: string;
  siteAddressSameAsCompany: boolean;
  tradingName: string;
  tradingNameEnabled: boolean;
}

interface AbnResult {
  entityName: string;
  registrationDate: string;
  entityTypeDescription: string;
  abnStatus: string;
}

interface QuoteSectionProps {
  selectedQuoteTerms: number[];
  setSelectedQuoteTerms: (fn: (prev: number[]) => number[]) => void;
  allTerms: TermOption[];
  projectCost: number;
  installerName: string;
  installerCompany: string;
  generatingPdf: boolean;
  pdfGenerated: boolean;
  quoteError: string | null;
  generatedQuoteNumber: string | null;
  clientFields: QuoteClientFields;
  onClientFieldChange: (field: keyof QuoteClientFields, value: string | boolean) => void;
  onGenerate: () => void;
  onReset: () => void;
  formatCurrency: (n: number) => string;
  selectedTerm?: number | null;
}

function AddressAutocomplete({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleChange = (v: string) => {
    onChange(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (v.length < 3) { setSuggestions([]); setOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          format: 'json',
          countrycodes: 'au',
          limit: '8',
          addressdetails: '1',
          dedupe: '1',
          'accept-language': 'en',
          q: v,
        });
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?${params}`,
          { headers: { 'Accept-Language': 'en', 'User-Agent': 'GreenFundingPortal/1.0' } }
        );
        const data = await res.json();
        const seen = new Set<string>();
        const results: string[] = data
          .map((d: any) => {
            const a = d.address || {};
            const parts: string[] = [];
            if (a.house_number && a.road) parts.push(`${a.house_number} ${a.road}`);
            else if (a.road) parts.push(a.road);
            if (a.suburb || a.neighbourhood) parts.push(a.suburb || a.neighbourhood);
            if (a.city || a.town || a.village || a.municipality) parts.push(a.city || a.town || a.village || a.municipality);
            if (a.state) parts.push(a.state);
            if (a.postcode) parts.push(a.postcode);
            return parts.length >= 2 ? parts.join(', ') : d.display_name.replace(/, Australia$/, '').replace(/, Australia,/, ',');
          })
          .filter((s: string) => {
            if (seen.has(s)) return false;
            seen.add(s);
            return true;
          });
        setSuggestions(results);
        setOpen(results.length > 0);
      } catch {
        setSuggestions([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 400);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={e => handleChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className={className}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
        </div>
      </div>
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto text-sm">
          {suggestions.map((s, i) => (
            <li
              key={i}
              onMouseDown={() => { onChange(s); setSuggestions([]); setOpen(false); }}
              className="px-3 py-2 cursor-pointer hover:bg-[#28AA48]/10 hover:text-[#28AA48] transition-colors"
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function QuoteSection({
  selectedQuoteTerms,
  setSelectedQuoteTerms,
  allTerms,
  generatingPdf,
  pdfGenerated,
  quoteError,
  generatedQuoteNumber,
  clientFields,
  onClientFieldChange,
  onGenerate,
  onReset,
  formatCurrency,
  selectedTerm,
}: QuoteSectionProps) {
  const [touched, setTouched] = useState(false);
  const [abnLoading, setAbnLoading] = useState(false);
  const [abnError, setAbnError] = useState<string | null>(null);
  const [abnLookedUp, setAbnLookedUp] = useState(false);

  const abnClean = clientFields.abn.replace(/\s/g, '');

  const handleSubmitClick = () => {
    setTouched(true);
    if (canSubmit) onGenerate();
  };

  const handleAbnLookup = async () => {
    const abn = clientFields.abn.replace(/\s/g, '');
    if (abn.length !== 11) {
      setAbnError('Please enter a valid 11-digit ABN');
      return;
    }
    setAbnLoading(true);
    setAbnError(null);
    setAbnLookedUp(false);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const res = await fetch(`${supabaseUrl}/functions/v1/abn-lookup?abn=${abn}`, {
        headers: { 'Authorization': `Bearer ${supabaseAnonKey}`, 'Apikey': supabaseAnonKey },
      });
      const data: AbnResult & { error?: string } = await res.json();
      if (data.error) {
        setAbnError(data.error);
        return;
      }
      onClientFieldChange('entityName', data.entityName || '');
      onClientFieldChange('incorporationDate', data.registrationDate || '');
      setAbnLookedUp(true);
    } catch {
      setAbnError('ABN lookup failed. Please try again or enter details manually.');
    } finally {
      setAbnLoading(false);
    }
  };

  const inputClass = (invalid?: boolean) =>
    `w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#28AA48]/30 focus:border-[#28AA48] transition-colors ${invalid ? 'border-red-400 bg-red-50' : 'border-gray-300'}`;

  const siteAddress = clientFields.siteAddressSameAsCompany ? clientFields.companyAddress : clientFields.clientAddress;

  const canSubmit =
    selectedQuoteTerms.length > 0 &&
    clientFields.abn.trim() !== '' &&
    abnClean.length === 11 &&
    clientFields.natureOfBusiness.trim() !== '' &&
    clientFields.companyAddress.trim() !== '' &&
    clientFields.clientPersonName.trim() !== '' &&
    clientFields.clientEmail.trim() !== '' &&
    clientFields.clientPhone.trim() !== '' &&
    siteAddress.trim() !== '';

  return (
    <div className="mt-6 border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 bg-gray-50 border-b border-gray-200 flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 bg-[#28AA48]/10 rounded-lg flex-shrink-0">
          <Download className="w-4 h-4 text-[#28AA48]" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-[#3A475B]">Generate Proposal</h3>
          <p className="text-xs text-gray-500">Enter client details and select loan terms to submit a quote</p>
        </div>
      </div>

      <div className="px-5 py-5 space-y-6">
        {pdfGenerated ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-[#28AA48] flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-[#28AA48]">Quote submitted successfully</p>
                {generatedQuoteNumber && (
                  <p className="text-xs text-gray-500 mt-0.5">{generatedQuoteNumber}</p>
                )}
              </div>
            </div>
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#3A475B] bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex-shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Submit Another
            </button>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-500 italic">
              We will only contact the client if they accept the proposal.
            </p>

            {/* Company Details */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="w-4 h-4 text-[#28AA48]" />
                <span className="text-sm font-semibold text-[#3A475B]">Company Details</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">ABN <span className="text-red-500">*</span></label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={clientFields.abn}
                      onChange={e => {
                        onClientFieldChange('abn', e.target.value);
                        setAbnLookedUp(false);
                        setAbnError(null);
                      }}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAbnLookup(); } }}
                      placeholder="e.g. 51 824 753 556"
                      className={inputClass(touched && (clientFields.abn.trim() === '' || abnClean.length !== 11))}
                    />
                    <button
                      type="button"
                      onClick={handleAbnLookup}
                      disabled={abnLoading}
                      title="Lookup ABN"
                      className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-[#28AA48] text-white rounded-lg hover:bg-[#229940] transition-colors disabled:opacity-60"
                    >
                      {abnLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  {abnError && <p className="text-xs text-red-500 mt-1">{abnError}</p>}
                  {touched && clientFields.abn.trim() === '' && !abnError && <p className="text-xs text-red-500 mt-1">ABN is required</p>}
                  {touched && clientFields.abn.trim() !== '' && abnClean.length !== 11 && !abnError && <p className="text-xs text-red-500 mt-1">Please enter a valid 11-digit ABN</p>}
                  {abnLookedUp && <p className="text-xs text-[#28AA48] mt-1">Details auto-filled from ABR</p>}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Company Name</label>
                  <input
                    type="text"
                    value={clientFields.entityName}
                    readOnly
                    placeholder="Company Name"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-400 cursor-default outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <input
                      type="checkbox"
                      id="tradingNameEnabled"
                      checked={clientFields.tradingNameEnabled}
                      onChange={e => onClientFieldChange('tradingNameEnabled', e.target.checked)}
                      className="w-3.5 h-3.5 text-[#28AA48] rounded border-gray-300 focus:ring-[#28AA48] cursor-pointer"
                    />
                    <label htmlFor="tradingNameEnabled" className="text-xs font-medium text-gray-500 cursor-pointer select-none">Trading Name/Trust Name</label>
                  </div>
                  <input
                    type="text"
                    value={clientFields.tradingName}
                    onChange={e => onClientFieldChange('tradingName', e.target.value)}
                    placeholder="Trading name (if different)"
                    disabled={!clientFields.tradingNameEnabled}
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#28AA48]/30 focus:border-[#28AA48] transition-colors ${!clientFields.tradingNameEnabled ? 'border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed' : 'border-gray-300'}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Nature of Business <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={clientFields.natureOfBusiness}
                    onChange={e => onClientFieldChange('natureOfBusiness', e.target.value)}
                    placeholder="e.g. Butcher, Baker, Candlestick Maker"
                    className={inputClass(touched && !clientFields.natureOfBusiness.trim())}
                  />
                  {touched && !clientFields.natureOfBusiness.trim() && (
                    <p className="text-xs text-red-500 mt-1">Nature of business is required</p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Company Address <span className="text-red-500">*</span></label>
                  <AddressAutocomplete
                    value={clientFields.companyAddress}
                    onChange={v => onClientFieldChange('companyAddress', v)}
                    placeholder="e.g. Level 2, 100 King St, Sydney NSW"
                    className={`${inputClass(touched && !clientFields.companyAddress.trim())} pr-8`}
                  />
                  {touched && !clientFields.companyAddress.trim() && (
                    <p className="text-xs text-red-500 mt-1">Company address is required</p>
                  )}
                </div>
              </div>
            </div>

            {/* Client Details */}
            <div className="border-t border-gray-100 pt-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <User className="w-4 h-4 text-[#28AA48]" />
                <span className="text-sm font-semibold text-[#3A475B]">Client Details</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Client Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={clientFields.clientPersonName}
                    onChange={e => onClientFieldChange('clientPersonName', e.target.value)}
                    placeholder="e.g. John Smith"
                    className={inputClass(touched && !clientFields.clientPersonName.trim())}
                  />
                  {touched && !clientFields.clientPersonName.trim() && (
                    <p className="text-xs text-red-500 mt-1">Client name is required</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Email Address <span className="text-red-500">*</span></label>
                  <input
                    type="email"
                    value={clientFields.clientEmail}
                    onChange={e => onClientFieldChange('clientEmail', e.target.value)}
                    placeholder="e.g. contact@business.com.au"
                    className={inputClass(touched && !clientFields.clientEmail.trim())}
                  />
                  {touched && !clientFields.clientEmail.trim() && (
                    <p className="text-xs text-red-500 mt-1">Email address is required</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Phone Number <span className="text-red-500">*</span></label>
                  <input
                    type="tel"
                    value={clientFields.clientPhone}
                    onChange={e => onClientFieldChange('clientPhone', e.target.value)}
                    placeholder="e.g. 0400 000 000"
                    className={inputClass(touched && !clientFields.clientPhone.trim())}
                  />
                  {touched && !clientFields.clientPhone.trim() && (
                    <p className="text-xs text-red-500 mt-1">Phone number is required</p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Site Address <span className="text-red-500">*</span>
                  </label>
                  <div
                    className="flex items-center gap-2 mb-2 cursor-pointer select-none"
                    onClick={() => onClientFieldChange('siteAddressSameAsCompany', !clientFields.siteAddressSameAsCompany)}
                  >
                    <input
                      type="checkbox"
                      checked={clientFields.siteAddressSameAsCompany}
                      onChange={e => onClientFieldChange('siteAddressSameAsCompany', e.target.checked)}
                      onClick={e => e.stopPropagation()}
                      className="w-4 h-4 text-[#28AA48] rounded border-gray-300 focus:ring-[#28AA48] cursor-pointer"
                    />
                    <span className="text-xs text-gray-600">Site address is the same as company address</span>
                  </div>
                  {clientFields.siteAddressSameAsCompany ? (
                    <div className={`${inputClass(touched && !siteAddress.trim())} bg-gray-50 text-gray-500`}>
                      {siteAddress || <span className="text-gray-400 italic text-xs">Populated from company address</span>}
                    </div>
                  ) : (
                    <AddressAutocomplete
                      value={clientFields.clientAddress}
                      onChange={v => onClientFieldChange('clientAddress', v)}
                      placeholder="e.g. 12 Main Street, Adelaide SA"
                      className={`${inputClass(touched && !clientFields.clientAddress.trim())} pr-8`}
                    />
                  )}
                  {touched && !siteAddress.trim() && (
                    <p className="text-xs text-red-500 mt-1">Site address is required</p>
                  )}
                </div>
              </div>
            </div>


            {/* Loan Terms */}
            <div className="border-t border-gray-100 pt-4">
              <label className="block text-sm font-semibold text-[#3A475B] mb-2">
                Loan Terms to Include <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {[...allTerms].sort((a, b) => a.years - b.years).map(t => {
                  const checked = selectedQuoteTerms.includes(t.years);
                  const isSelected = selectedTerm === t.years;
                  return (
                    <button
                      key={t.years}
                      type="button"
                      onClick={() => setSelectedQuoteTerms(prev =>
                        checked ? prev.filter(y => y !== t.years) : [...prev, t.years]
                      )}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                        checked
                          ? isSelected
                            ? 'bg-[#28AA48]/15 border-[#28AA48] text-[#28AA48] ring-2 ring-[#28AA48]/40 shadow-sm'
                            : 'bg-[#28AA48]/10 border-[#28AA48] text-[#28AA48]'
                          : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
                      }`}
                    >
                      {checked && <Check className="w-3.5 h-3.5" />}
                      {t.years} yr — {formatCurrency(t.monthlyPayment)}/mo
                    </button>
                  );
                })}
              </div>
              {touched && selectedQuoteTerms.length === 0 && (
                <p className="text-xs text-red-500 mt-1.5">Select at least one term.</p>
              )}
              {!touched && selectedQuoteTerms.length === 0 && (
                <p className="text-xs text-gray-400 mt-1.5">Select at least one term to include in the quote.</p>
              )}
            </div>

            {quoteError && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700">{quoteError}</p>
              </div>
            )}

            <button
              onClick={handleSubmitClick}
              disabled={generatingPdf}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-[#34AC48] to-[#AFD235] text-white font-bold rounded-xl hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed text-sm"
            >
              {generatingPdf ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                  Generating Quote...
                </>
              ) : selectedTerm !== null && selectedTerm !== undefined ? (
                <>
                  <Send className="w-4 h-4" />
                  Generate Proposal
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit Quote
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
