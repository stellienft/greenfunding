import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { InstallerLayout } from '../components/InstallerLayout';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { FileCheck, Calendar, DollarSign, Loader, ChevronRight } from 'lucide-react';

interface Application {
  id: string;
  created_at: string;
  full_name: string;
  email: string;
  company_name: string;
  project_cost: number;
  loan_term_years: number;
  calculated_monthly_repayment: number;
  calculated_approval_amount: number;
}

export function Submissions() {
  const { installerProfile } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadApplications();
  }, [installerProfile]);

  async function loadApplications() {
    if (!installerProfile) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('applications')
        .select('id, created_at, full_name, email, company_name, project_cost, loan_term_years, calculated_monthly_repayment, calculated_approval_amount')
        .eq('installer_id', installerProfile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (err: any) {
      console.error('Error loading applications:', err);
      setError('Failed to load submissions');
    } finally {
      setLoading(false);
    }
  }

  return (
    <InstallerLayout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#3A475B] mb-1">Submissions</h1>
          <p className="text-gray-500 text-sm">View all your submitted financing applications</p>
        </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-8 h-8 animate-spin text-[#6EAE3C]" />
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <p className="text-red-700">{error}</p>
            </div>
          ) : applications.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-12 text-center">
              <FileCheck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-[#3A475B] mb-2">No Submissions Yet</h3>
              <p className="text-gray-600 mb-6">
                You haven't submitted any applications yet. Start by creating a quote in the Rental calculator.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {applications.map((app) => (
                <button
                  key={app.id}
                  onClick={() => navigate(`/submissions/${app.id}`)}
                  className="w-full text-left bg-white rounded-xl shadow-md border border-gray-200 hover:shadow-lg hover:border-[#28AA48]/30 transition-all group"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-4">
                        <div className="bg-gradient-to-br from-[#6EAE3C] to-[#8BC83F] p-3 rounded-lg">
                          <FileCheck className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-[#3A475B] mb-1">
                            {app.full_name}
                          </h3>
                          <p className="text-sm text-gray-600">{app.email}</p>
                          {app.company_name && (
                            <p className="text-sm text-gray-500">{app.company_name}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="px-4 py-2 rounded-full text-sm font-semibold border bg-green-100 text-green-800 border-green-200">
                          Submitted
                        </span>
                        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-[#28AA48] transition-colors" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                        <DollarSign className="w-5 h-5 text-[#6EAE3C]" />
                        <div>
                          <div className="text-xs text-gray-600">Project Cost (Inc. GST)</div>
                          <div className="font-bold text-[#3A475B]">
                            ${app.project_cost?.toLocaleString() || '0'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                        <DollarSign className="w-5 h-5 text-[#6EAE3C]" />
                        <div>
                          <div className="text-xs text-gray-600">Monthly Repayment</div>
                          <div className="font-bold text-[#3A475B]">
                            ${app.calculated_monthly_repayment?.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                        <Calendar className="w-5 h-5 text-[#6EAE3C]" />
                        <div>
                          <div className="text-xs text-gray-600">Term</div>
                          <div className="font-bold text-[#3A475B]">
                            {app.loan_term_years} years
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                        <Calendar className="w-5 h-5 text-[#6EAE3C]" />
                        <div>
                          <div className="text-xs text-gray-600">Submitted On</div>
                          <div className="font-bold text-[#3A475B]">
                            {new Date(app.created_at).toLocaleDateString('en-AU', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
      </div>
    </InstallerLayout>
  );
}
