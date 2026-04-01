import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import {
  ArrowLeft,
  Loader,
  FileText,
  Download,
  User,
  Building2,
  Phone,
  Mail,
  Clock,
  DollarSign,
  Calendar,
  FileCheck,
  StickyNote,
  ExternalLink,
} from 'lucide-react';

interface UploadedFile {
  name: string;
  path: string;
  size: number;
}

interface Application {
  id: string;
  created_at: string;
  full_name: string;
  email: string;
  phone: string;
  company_name: string;
  business_description: string;
  best_time_to_contact: string;
  notes: string;
  project_cost: number;
  loan_term_years: number;
  calculated_monthly_repayment: number;
  calculated_approval_amount: number;
  calculated_total_repayment: number;
  application_fee: number | null;
  ppsr_fee: number | null;
  invoice_amount_ex_gst: number | null;
  privacy_consent_file: UploadedFile | null;
  directors_id_file: UploadedFile | null;
  asset_liability_file: UploadedFile | null;
  uploaded_documents: UploadedFile[];
  installer_id: string;
}

function formatCurrency(value: number | null | undefined) {
  if (value == null) return '-';
  return value.toLocaleString('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
  });
}

function FileDownloadRow({ label, file }: { label: string; file: UploadedFile }) {
  function handleDownload() {
    const { data } = supabase.storage
      .from('application-documents')
      .getPublicUrl(file.path);
    window.open(data.publicUrl, '_blank');
  }

  const sizeKb = Math.round(file.size / 1024);

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
      <div className="flex items-center gap-3 min-w-0">
        <FileText className="w-4 h-4 text-[#28AA48] flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-[#3A475B] truncate">{label}</p>
          <p className="text-xs text-gray-400 truncate">{file.name} &middot; {sizeKb} KB</p>
        </div>
      </div>
      <button
        onClick={handleDownload}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#28AA48] border border-[#28AA48] rounded-lg hover:bg-green-50 transition-colors flex-shrink-0 ml-3"
      >
        <Download className="w-3.5 h-3.5" />
        Open
        <ExternalLink className="w-3 h-3" />
      </button>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | undefined | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-[#3A475B]">{value}</p>
    </div>
  );
}

export function SubmissionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { installerProfile } = useAuth();
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadApplication();
  }, [id, installerProfile]);

  async function loadApplication() {
    if (!installerProfile || !id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('id', id)
        .eq('installer_id', installerProfile.id)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        setError('Submission not found');
      } else {
        setApplication(data as Application);
      }
    } catch (err: any) {
      console.error('Error loading application:', err);
      setError('Failed to load submission');
    } finally {
      setLoading(false);
    }
  }

  const allDocs: { label: string; file: UploadedFile }[] = [];
  if (application?.privacy_consent_file) {
    allDocs.push({ label: 'Privacy Consent Form', file: application.privacy_consent_file });
  }
  if (application?.directors_id_file) {
    allDocs.push({ label: "Directors Drivers Licence & Medicare", file: application.directors_id_file });
  }
  if (application?.asset_liability_file) {
    allDocs.push({ label: "Directors Asset & Liability Statement", file: application.asset_liability_file });
  }
  if (application?.uploaded_documents?.length) {
    application.uploaded_documents.forEach((doc, i) => {
      allDocs.push({ label: `Document ${i + 1}`, file: doc });
    });
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-10 px-4">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => navigate('/submissions')}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#28AA48] transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Submissions
          </button>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader className="w-8 h-8 animate-spin text-[#28AA48]" />
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
              <p className="text-red-700 font-medium">{error}</p>
            </div>
          ) : application ? (
            <div className="space-y-5">
              <div className="bg-gradient-to-r from-[#28AA48] to-[#6EAE3C] rounded-2xl p-6 text-white">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-green-100 text-sm font-medium mb-1">Application</p>
                    <h1 className="text-2xl font-bold mb-1">{application.full_name}</h1>
                    {application.company_name && (
                      <p className="text-green-100 text-sm">{application.company_name}</p>
                    )}
                  </div>
                  <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-semibold border border-white/30">
                    Submitted
                  </span>
                </div>
                <p className="text-green-100 text-xs mt-3">
                  Submitted {new Date(application.created_at).toLocaleDateString('en-AU', {
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                  })}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <DollarSign className="w-4 h-4 text-[#28AA48]" />
                    <p className="text-xs text-gray-400">Project Cost (Inc. GST)</p>
                  </div>
                  <p className="font-bold text-[#3A475B] text-sm">{formatCurrency(application.project_cost)}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <DollarSign className="w-4 h-4 text-[#28AA48]" />
                    <p className="text-xs text-gray-400">Monthly Repayment</p>
                  </div>
                  <p className="font-bold text-[#3A475B] text-sm">{formatCurrency(application.calculated_monthly_repayment)}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Calendar className="w-4 h-4 text-[#28AA48]" />
                    <p className="text-xs text-gray-400">Loan Term</p>
                  </div>
                  <p className="font-bold text-[#3A475B] text-sm">{application.loan_term_years} years</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <DollarSign className="w-4 h-4 text-[#28AA48]" />
                    <p className="text-xs text-gray-400">Approval Amount</p>
                  </div>
                  <p className="font-bold text-[#3A475B] text-sm">{formatCurrency(application.calculated_approval_amount)}</p>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="text-sm font-bold text-[#3A475B] mb-4 flex items-center gap-2">
                  <User className="w-4 h-4 text-[#28AA48]" />
                  Contact Details
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InfoRow label="Full Name" value={application.full_name} />
                  <InfoRow label="Email" value={application.email} />
                  <InfoRow label="Phone" value={application.phone} />
                  <InfoRow label="Best Time to Contact" value={application.best_time_to_contact} />
                  <InfoRow label="Company" value={application.company_name} />
                </div>
              </div>

              {application.business_description && (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h2 className="text-sm font-bold text-[#3A475B] mb-3 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#28AA48]" />
                    Business Description
                  </h2>
                  <p className="text-sm text-gray-600 leading-relaxed">{application.business_description}</p>
                </div>
              )}

              {application.notes && (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h2 className="text-sm font-bold text-[#3A475B] mb-3 flex items-center gap-2">
                    <StickyNote className="w-4 h-4 text-[#28AA48]" />
                    Notes
                  </h2>
                  <p className="text-sm text-gray-600 leading-relaxed">{application.notes}</p>
                </div>
              )}

              {allDocs.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h2 className="text-sm font-bold text-[#3A475B] mb-4 flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-[#28AA48]" />
                    Uploaded Documents
                    <span className="ml-auto text-xs font-normal text-gray-400">{allDocs.length} file{allDocs.length !== 1 ? 's' : ''}</span>
                  </h2>
                  <div className="space-y-2">
                    {allDocs.map((doc, i) => (
                      <FileDownloadRow key={i} label={doc.label} file={doc.file} />
                    ))}
                  </div>
                </div>
              )}

              {allDocs.length === 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h2 className="text-sm font-bold text-[#3A475B] mb-3 flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-[#28AA48]" />
                    Uploaded Documents
                  </h2>
                  <p className="text-sm text-gray-400">No documents were uploaded with this submission.</p>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </Layout>
  );
}
