import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { FileText, Download, ChevronDown, ChevronUp, CheckCircle2, Clock, Loader } from 'lucide-react';

interface QuoteUpload {
  id: string;
  document_type: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  uploaded_at: string;
}

interface AcceptedQuote {
  id: string;
  quote_number: number;
  recipient_name: string | null;
  recipient_company: string | null;
  recipient_email: string | null;
  project_cost: number;
  accepted_at: string | null;
  uploads: QuoteUpload[];
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

function formatQuoteNumber(n: number): string {
  return '#' + String(n).padStart(6, '0');
}

function formatDate(s: string): string {
  return new Date(s).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatDocType(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AcceptedQuotes() {
  const [quotes, setQuotes] = useState<AcceptedQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);

  useEffect(() => {
    loadAcceptedQuotes();
  }, []);

  async function loadAcceptedQuotes() {
    setLoading(true);
    try {
      const { data: quotesData, error } = await supabase
        .from('sent_quotes')
        .select('id, quote_number, recipient_name, recipient_company, recipient_email, project_cost, accepted_at')
        .not('accepted_at', 'is', null)
        .order('accepted_at', { ascending: false });

      if (error) throw error;

      const quotesWithUploads: AcceptedQuote[] = await Promise.all(
        (quotesData || []).map(async (q) => {
          const { data: uploads } = await supabase
            .from('quote_document_uploads')
            .select('id, document_type, file_name, file_path, file_size, uploaded_at')
            .eq('quote_id', q.id)
            .order('uploaded_at', { ascending: true });
          return { ...q, uploads: uploads || [] };
        })
      );

      setQuotes(quotesWithUploads);
    } catch (err) {
      console.error('Failed to load accepted quotes:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload(upload: QuoteUpload) {
    setDownloadingFile(upload.id);
    try {
      const { data, error } = await supabase.storage
        .from('application-documents')
        .createSignedUrl(upload.file_path, 60 * 60);

      if (error || !data?.signedUrl) throw new Error('Failed to get download URL');
      window.open(data.signedUrl, '_blank');
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to download file. Please try again.');
    } finally {
      setDownloadingFile(null);
    }
  }

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader className="w-6 h-6 animate-spin text-[#28AA48]" />
      </div>
    );
  }

  if (quotes.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-7 h-7 text-gray-400" />
        </div>
        <h3 className="text-base font-semibold text-[#3A475B] mb-1">No Accepted Quotes Yet</h3>
        <p className="text-sm text-gray-500">Quotes that have been accepted and have uploaded documents will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#3A475B]">Accepted Quotes</h2>
          <p className="text-sm text-gray-500 mt-0.5">{quotes.length} quote{quotes.length !== 1 ? 's' : ''} with uploaded documents</p>
        </div>
      </div>

      <div className="space-y-3">
        {quotes.map(quote => {
          const isOpen = expanded.has(quote.id);
          const uploadCount = quote.uploads.length;

          return (
            <div key={quote.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <button
                onClick={() => toggleExpand(quote.id)}
                className="w-full px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-bold text-[#28AA48]">{formatQuoteNumber(quote.quote_number)}</span>
                    <span className="text-sm font-semibold text-[#3A475B]">
                      {quote.recipient_company || quote.recipient_name}
                    </span>
                    {quote.recipient_company && quote.recipient_name && (
                      <span className="text-sm text-gray-400">{quote.recipient_name}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1 flex-wrap">
                    <span className="text-xs text-gray-500">{formatCurrency(quote.project_cost)}</span>
                    {quote.recipient_email && (
                      <span className="text-xs text-gray-500">{quote.recipient_email}</span>
                    )}
                    {quote.accepted_at && (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Accepted {formatDate(quote.accepted_at)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 ${uploadCount > 0 ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-yellow-50 text-yellow-700 border border-yellow-200'}`}>
                    <FileText className="w-3 h-3" />
                    {uploadCount} file{uploadCount !== 1 ? 's' : ''}
                  </span>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-gray-100 px-6 py-4">
                  {uploadCount === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">No documents uploaded yet.</p>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Uploaded Documents</p>
                      {quote.uploads.map(upload => (
                        <div key={upload.id} className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 bg-[#28AA48]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                              <FileText className="w-4 h-4 text-[#28AA48]" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-[#3A475B] truncate">{upload.file_name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-[#28AA48] font-medium">{formatDocType(upload.document_type)}</span>
                                {upload.file_size && <span className="text-xs text-gray-400">{formatBytes(upload.file_size)}</span>}
                                <span className="text-xs text-gray-400">{formatDate(upload.uploaded_at)}</span>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDownload(upload)}
                            disabled={downloadingFile === upload.id}
                            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-[#28AA48] text-white text-xs font-semibold rounded-lg hover:bg-[#239e3f] transition-colors disabled:opacity-60"
                          >
                            {downloadingFile === upload.id
                              ? <Loader className="w-3 h-3 animate-spin" />
                              : <Download className="w-3 h-3" />}
                            Download
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
