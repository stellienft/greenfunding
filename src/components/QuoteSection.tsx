import { useState } from 'react';
import { Check, Download, CheckCircle, AlertCircle, RefreshCw, User, Send } from 'lucide-react';

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
  onClientFieldChange: (field: keyof QuoteClientFields, value: string) => void;
  onGenerate: () => void;
  onReset: () => void;
  formatCurrency: (n: number) => string;
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
}: QuoteSectionProps) {
  const [touched, setTouched] = useState(false);

  const missingClientFields =
    !clientFields.clientName.trim() ||
    !clientFields.clientEmail.trim() ||
    !clientFields.clientAddress.trim();

  const canSubmit = !missingClientFields && selectedQuoteTerms.length > 0;

  const handleSubmitClick = () => {
    setTouched(true);
    if (canSubmit) onGenerate();
  };

  return (
    <div className="mt-6 border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 bg-gray-50 border-b border-gray-200 flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 bg-[#28AA48]/10 rounded-lg flex-shrink-0">
          <Download className="w-4 h-4 text-[#28AA48]" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-[#3A475B]">Generate Quote</h3>
          <p className="text-xs text-gray-500">Enter client details and select loan terms to submit a quote</p>
        </div>
      </div>

      <div className="px-5 py-5 space-y-5">
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
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <User className="w-4 h-4 text-[#28AA48]" />
                <span className="text-sm font-semibold text-[#3A475B]">
                  Client Details <span className="text-red-500 text-xs">*</span>
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Client Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={clientFields.clientName}
                    onChange={e => onClientFieldChange('clientName', e.target.value)}
                    placeholder="e.g. Smith Enterprises"
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#28AA48]/30 focus:border-[#28AA48] transition-colors ${touched && !clientFields.clientName.trim() ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                  />
                  {touched && !clientFields.clientName.trim() && (
                    <p className="text-xs text-red-500 mt-1">Required</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Client Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={clientFields.clientEmail}
                    onChange={e => onClientFieldChange('clientEmail', e.target.value)}
                    placeholder="e.g. contact@business.com.au"
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#28AA48]/30 focus:border-[#28AA48] transition-colors ${touched && !clientFields.clientEmail.trim() ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                  />
                  {touched && !clientFields.clientEmail.trim() && (
                    <p className="text-xs text-red-500 mt-1">Required</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Client Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={clientFields.clientAddress}
                    onChange={e => onClientFieldChange('clientAddress', e.target.value)}
                    placeholder="e.g. 12 Main Street, Adelaide SA"
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#28AA48]/30 focus:border-[#28AA48] transition-colors ${touched && !clientFields.clientAddress.trim() ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                  />
                  {touched && !clientFields.clientAddress.trim() && (
                    <p className="text-xs text-red-500 mt-1">Required</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Client Phone</label>
                  <input
                    type="tel"
                    value={clientFields.clientPhone}
                    onChange={e => onClientFieldChange('clientPhone', e.target.value)}
                    placeholder="e.g. 0400 000 000"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#28AA48]/30 focus:border-[#28AA48] transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <label className="block text-sm font-semibold text-[#3A475B] mb-2">
                Loan Terms to Include <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {[...allTerms].sort((a, b) => a.years - b.years).map(t => {
                  const checked = selectedQuoteTerms.includes(t.years);
                  return (
                    <button
                      key={t.years}
                      type="button"
                      onClick={() => setSelectedQuoteTerms(prev =>
                        checked ? prev.filter(y => y !== t.years) : [...prev, t.years]
                      )}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                        checked
                          ? 'bg-[#28AA48]/10 border-[#28AA48] text-[#28AA48]'
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
                  Submitting Quote...
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
