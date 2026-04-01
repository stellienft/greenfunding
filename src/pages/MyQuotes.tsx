import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { FileText, Calendar, DollarSign, Loader, ArrowRight, Building2, MapPin, Tag } from 'lucide-react';

interface SentQuote {
  id: string;
  quote_number: number;
  created_at: string;
  recipient_name: string | null;
  recipient_company: string | null;
  recipient_email: string | null;
  site_address: string | null;
  system_size: string | null;
  project_cost: number;
  term_options: Array<{ years: number; monthlyPayment: number; interestRate: number; totalFinanced: number }>;
  asset_names: string[];
  calculator_type: string;
  payment_timing: string;
  status: string;
}

function formatQuoteNumber(n: number) {
  return `#${String(n).padStart(6, '0')}`;
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n);
}

function statusBadge(status: string) {
  switch (status) {
    case 'application_submitted':
      return { label: 'Application Submitted', cls: 'bg-green-100 text-green-800 border-green-200' };
    case 'application_started':
      return { label: 'Application Started', cls: 'bg-blue-100 text-blue-800 border-blue-200' };
    default:
      return { label: 'Quote Generated', cls: 'bg-gray-100 text-gray-700 border-gray-200' };
  }
}

function calcTypeLabel(t: string) {
  switch (t) {
    case 'progress_payment_rental': return 'Progress Payment';
    case 'serviced_rental': return 'Serviced Rental';
    default: return 'Rental';
  }
}

export function MyQuotes() {
  const navigate = useNavigate();
  const { installerProfile } = useAuth();
  const [quotes, setQuotes] = useState<SentQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (installerProfile) loadQuotes();
  }, [installerProfile]);

  async function loadQuotes() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sent_quotes')
        .select('id, quote_number, created_at, recipient_name, recipient_company, recipient_email, site_address, system_size, project_cost, term_options, asset_names, calculator_type, payment_timing, status')
        .eq('installer_id', installerProfile!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuotes(data || []);
    } catch (err: any) {
      setError('Failed to load quotes');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[#3A475B] mb-1">My Quotes</h1>
            <p className="text-gray-500 text-sm">View and continue quotes you have generated for your clients</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader className="w-7 h-7 animate-spin text-[#28AA48]" />
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          ) : quotes.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-14 text-center shadow-sm">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-bold text-[#3A475B] mb-2">No quotes yet</h3>
              <p className="text-gray-500 text-sm mb-6">
                Generate a quote from the calculator to get started.
              </p>
              <button
                onClick={() => navigate('/dashboard')}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#34AC48] to-[#AFD235] text-white font-semibold rounded-lg text-sm hover:shadow-md transition-all"
              >
                Go to Calculator
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {quotes.map(q => {
                const badge = statusBadge(q.status || 'generated');
                const lowestTerm = q.term_options?.length
                  ? q.term_options.reduce((a, b) => a.years < b.years ? a : b)
                  : null;

                return (
                  <div
                    key={q.id}
                    className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                    onClick={() => navigate(`/quotes/${q.id}`)}
                  >
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 min-w-0">
                          <div className="w-10 h-10 bg-gradient-to-br from-[#34AC48] to-[#AFD235] rounded-lg flex items-center justify-center flex-shrink-0">
                            <FileText className="w-5 h-5 text-white" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-3 flex-wrap mb-0.5">
                              <span className="text-base font-bold text-[#3A475B]">
                                {q.recipient_company || q.recipient_name || 'Unnamed Client'}
                              </span>
                              <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${badge.cls}`}>
                                {badge.label}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                              <span className="text-xs text-[#28AA48] font-semibold">{formatQuoteNumber(q.quote_number)}</span>
                              {q.site_address && (
                                <span className="flex items-center gap-1 text-xs text-gray-500">
                                  <MapPin className="w-3 h-3" />
                                  {q.site_address}
                                </span>
                              )}
                              <span className="flex items-center gap-1 text-xs text-gray-500">
                                <Tag className="w-3 h-3" />
                                {calcTypeLabel(q.calculator_type)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-6 flex-shrink-0">
                          <div className="hidden sm:block text-right">
                            <p className="text-xs text-gray-400">Project Cost (Inc. GST)</p>
                            <p className="font-bold text-[#3A475B] text-sm">{formatCurrency(q.project_cost)}</p>
                          </div>
                          {lowestTerm && (
                            <div className="hidden sm:block text-right">
                              <p className="text-xs text-gray-400">From / month</p>
                              <p className="font-bold text-[#28AA48] text-sm">{formatCurrency(lowestTerm.monthlyPayment)}</p>
                            </div>
                          )}
                          <div className="hidden sm:block text-right">
                            <p className="text-xs text-gray-400">Date</p>
                            <p className="text-sm text-gray-600 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(q.created_at).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </p>
                          </div>
                          <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-[#28AA48] transition-colors" />
                        </div>
                      </div>

                      {q.asset_names?.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {q.asset_names.map((name, i) => (
                            <span key={i} className="inline-flex items-center gap-1 text-xs bg-gray-50 border border-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                              <Building2 className="w-3 h-3" />
                              {name}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="mt-3 flex items-center gap-4 sm:hidden">
                        <span className="text-sm font-bold text-[#3A475B]">{formatCurrency(q.project_cost)}</span>
                        {lowestTerm && <span className="text-sm font-bold text-[#28AA48]">{formatCurrency(lowestTerm.monthlyPayment)}/mo</span>}
                        <span className="text-xs text-gray-400 ml-auto">
                          {new Date(q.created_at).toLocaleDateString('en-AU', { day: '2-digit', month: 'short' })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
