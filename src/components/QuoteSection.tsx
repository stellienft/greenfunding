import { useState } from 'react';
import { Check, Download, CheckCircle, AlertCircle, Copy, ClipboardCheck, ChevronDown, ChevronUp, Mail, RefreshCw } from 'lucide-react';

interface TermOption {
  years: number;
  monthlyPayment: number;
  interestRate?: number;
  totalFinanced?: number;
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
  onGenerate: () => void;
  onReset: () => void;
  formatCurrency: (n: number) => string;
}

function buildEmailTemplate(projectCost: number, installerName: string, installerCompany: string): string {
  const isLowDoc = projectCost <= 250000;
  const costStr = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(projectCost);
  const docType = isLowDoc ? 'Low Doc' : 'Full Doc';

  const lowDocItems = `To progress this to the next stage we will need the following documents:

1. Completed Finance Application
2. 6 months business bank statements
3. Installer's quote / invoice
4. Signed Privacy Consent & Acknowledgement`;

  const fullDocItems = `To progress this to the next stage we will need the following documents:

1. Completed Finance Application
2. 2 years financial statements (P&L and Balance Sheet)
3. 2 years tax returns (business and individual)
4. 6 months business bank statements
5. Installer's quote / invoice
6. Signed Privacy Consent & Acknowledgement`;

  return `Hi [Client Name],

I hope this email finds you well. I wanted to follow up on our recent conversation regarding your renewable energy project.

I've put together a finance quote for your consideration, which you will find attached. This quote outlines the ${docType} finance options available for your project valued at ${costStr}.

${isLowDoc ? lowDocItems : fullDocItems}

Please don't hesitate to reach out if you have any questions about the quote or the application process. Our team at Green Funding is ready to help you take the next step.

Kind regards,

${installerName || '[Your Name]'}${installerCompany ? `\n${installerCompany}` : ''}`;
}

export function QuoteSection({
  selectedQuoteTerms,
  setSelectedQuoteTerms,
  allTerms,
  projectCost,
  installerName,
  installerCompany,
  generatingPdf,
  pdfGenerated,
  quoteError,
  generatedQuoteNumber,
  onGenerate,
  onReset,
  formatCurrency,
}: QuoteSectionProps) {
  const [showEmailTemplate, setShowEmailTemplate] = useState(false);
  const [copied, setCopied] = useState(false);

  const emailTemplate = buildEmailTemplate(projectCost, installerName, installerCompany);
  const isLowDoc = projectCost <= 250000;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(emailTemplate);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // no-op
    }
  };

  return (
    <div className="mt-6 border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 bg-gray-50 border-b border-gray-200 flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 bg-[#28AA48]/10 rounded-lg flex-shrink-0">
          <Download className="w-4 h-4 text-[#28AA48]" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-[#3A475B]">Generate Quote PDF</h3>
          <p className="text-xs text-gray-500">Select loan terms to include and download a PDF to share with your client</p>
        </div>
      </div>

      <div className="px-5 py-5 space-y-5">
        {pdfGenerated ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-[#28AA48] flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-[#28AA48]">Quote downloaded successfully</p>
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
              Generate Another
            </button>
          </div>
        ) : (
          <>
            <div>
              <label className="block text-sm font-semibold text-[#3A475B] mb-2">
                Loan Terms to Include <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {allTerms.map(t => {
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
              {selectedQuoteTerms.length === 0 && (
                <p className="text-xs text-red-500 mt-1.5">Select at least one term.</p>
              )}
            </div>

            {quoteError && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700">{quoteError}</p>
              </div>
            )}

            <button
              onClick={onGenerate}
              disabled={generatingPdf || selectedQuoteTerms.length === 0}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-[#34AC48] to-[#AFD235] text-white font-bold rounded-xl hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed text-sm"
            >
              {generatingPdf ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Download PDF Quote
                </>
              )}
            </button>
          </>
        )}

        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setShowEmailTemplate(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-semibold text-[#3A475B]"
          >
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#28AA48]" />
              Email Template
              <span className={`text-xs font-normal px-2 py-0.5 rounded-full ${isLowDoc ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                {isLowDoc ? 'Low Doc' : 'Full Doc'}
              </span>
            </div>
            {showEmailTemplate ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>

          {showEmailTemplate && (
            <div className="px-4 pb-4 pt-3 space-y-3">
              <p className="text-xs text-gray-500">
                Copy and paste this into your email client, then attach the PDF quote.
              </p>
              <pre className="whitespace-pre-wrap font-sans text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-lg p-3 max-h-56 overflow-y-auto leading-relaxed">
                {emailTemplate}
              </pre>
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-[#3A475B] font-semibold rounded-lg hover:bg-gray-50 transition-colors text-sm w-full justify-center"
              >
                {copied ? (
                  <>
                    <ClipboardCheck className="w-4 h-4 text-[#28AA48]" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy Template
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
