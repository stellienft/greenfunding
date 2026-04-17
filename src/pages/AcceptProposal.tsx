import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader, AlertTriangle, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface QuoteInfo {
  quote_number: number;
  recipient_name: string | null;
  recipient_company: string | null;
  project_cost: number;
  accepted_at: string | null;
  upload_token: string | null;
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n);
}

function formatQuoteNumber(n: number) {
  return `#${String(n).padStart(6, '0')}`;
}

export function AcceptProposal() {
  const { quoteId } = useParams<{ quoteId: string }>();
  const navigate = useNavigate();

  const [quote, setQuote] = useState<QuoteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [uploadToken, setUploadToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (quoteId) loadQuote();
  }, [quoteId]);

  async function loadQuote() {
    try {
      const { data, error } = await supabase
        .from('sent_quotes')
        .select('quote_number, recipient_name, recipient_company, project_cost, accepted_at, upload_token')
        .eq('id', quoteId)
        .maybeSingle();

      if (error) throw error;
      if (!data) { setNotFound(true); return; }

      setQuote(data);

      if (data.accepted_at && data.upload_token) {
        setAccepted(true);
        setUploadToken(data.upload_token);
      }
    } catch {
      setError('Unable to load proposal details. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleAccept() {
    if (!quoteId) return;
    setAccepting(true);
    setError(null);

    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/accept-quote`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ quoteId }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to accept proposal');
      }

      setUploadToken(json.uploadToken);
      setAccepted(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setAccepting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader className="w-7 h-7 animate-spin text-[#28AA48]" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-sm w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-10 text-center">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-7 h-7 text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-[#3A475B] mb-2">Proposal Not Found</h2>
          <p className="text-gray-500 text-sm">This proposal link is invalid or has expired. Please contact your consultant for a new link.</p>
        </div>
      </div>
    );
  }

  const clientName = quote?.recipient_company || quote?.recipient_name || 'Valued Client';

  if (accepted && uploadToken) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <img src="/green-funding-invertedlogo.svg" alt="Green Funding" className="h-7 mx-auto mb-6 invert" style={{ filter: 'brightness(0) saturate(100%) invert(40%) sepia(80%) saturate(500%) hue-rotate(100deg) brightness(90%)' }} />
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-green-200 p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-9 h-9 text-[#28AA48]" />
            </div>
            <h1 className="text-xl font-bold text-[#3A475B] mb-2">Proposal Accepted!</h1>
            <p className="text-gray-500 text-sm mb-1">
              Thank you, <strong>{clientName}</strong>.
            </p>
            <p className="text-gray-500 text-sm mb-6">
              Your proposal {formatQuoteNumber(quote!.quote_number)} has been accepted. We have sent you an email with your secure document upload link and access code.
            </p>

            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 text-left">
              <p className="text-sm font-semibold text-green-800 mb-1">What happens next?</p>
              <ol className="space-y-1.5 text-sm text-green-700">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#28AA48] text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">1</span>
                  Check your email for your secure upload link and 6-digit access code
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#28AA48] text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">2</span>
                  Upload your required documents through the secure portal
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#28AA48] text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">3</span>
                  Our team will review your application and be in touch shortly
                </li>
              </ol>
            </div>

            <button
              onClick={() => navigate(`/upload-documents/${uploadToken}`)}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-[#34AC48] to-[#AFD235] text-white font-bold rounded-xl hover:shadow-lg transition-all text-sm"
            >
              Go to Document Upload Portal
              <ArrowRight className="w-4 h-4" />
            </button>

            <p className="text-xs text-gray-400 mt-4">
              Questions? Call us on <a href="tel:1300403100" className="text-[#28AA48] font-medium">1300 403 100</a> or email <a href="mailto:solutions@greenfunding.com.au" className="text-[#28AA48] font-medium">solutions@greenfunding.com.au</a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4" style={{ background: 'linear-gradient(135deg, #34AC48, #AFD235)' }}>
            <img src="/green-funding-invertedlogo.svg" alt="" className="h-5 brightness-0 invert" />
          </div>
          <h1 className="text-2xl font-extrabold text-[#3A475B]">Accept Your Proposal</h1>
          <p className="text-gray-500 text-sm mt-1">Green Funding — Finance Solutions for Clean Energy</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-[#34AC48] to-[#AFD235] px-6 py-5">
            <p className="text-green-100 text-xs uppercase tracking-widest font-medium mb-1">Finance Proposal</p>
            <h2 className="text-white text-lg font-bold">{clientName}</h2>
            <div className="flex items-center gap-4 mt-2">
              <span className="text-green-100 text-sm font-medium">{formatQuoteNumber(quote!.quote_number)}</span>
              <span className="text-white font-bold">{formatCurrency(quote!.project_cost)}</span>
            </div>
          </div>

          <div className="p-6">
            <p className="text-sm text-gray-600 mb-5 leading-relaxed">
              By accepting this proposal, you confirm you are happy to proceed with Green Funding to finance your project. We will immediately send you a secure link to upload your required documents and begin the application process.
            </p>

            {error && (
              <div className="mb-4 flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <button
              onClick={handleAccept}
              disabled={accepting}
              className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-[#34AC48] to-[#AFD235] text-white font-bold rounded-xl hover:shadow-lg transition-all text-base disabled:opacity-70"
            >
              {accepting ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Accepting Proposal...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Accept This Proposal
                </>
              )}
            </button>

            <p className="text-xs text-gray-400 text-center mt-4 leading-relaxed">
              By clicking above you agree to proceed with the finance application process. A document upload email will be sent to your registered email address.
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Questions? <a href="tel:1300403100" className="text-[#28AA48] font-medium">1300 403 100</a> · <a href="mailto:solutions@greenfunding.com.au" className="text-[#28AA48] font-medium">solutions@greenfunding.com.au</a>
        </p>
      </div>
    </div>
  );
}
