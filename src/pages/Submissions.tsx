import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { FileCheck, Calendar, DollarSign, User, Loader } from 'lucide-react';

interface Application {
  id: string;
  created_at: string;
  customer_name: string;
  customer_email: string;
  loan_amount: number;
  term_months: number;
  status: string;
}

export function Submissions() {
  const { installerProfile } = useAuth();
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
        .select('id, created_at, customer_name, customer_email, loan_amount, term_months, status')
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

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-[#3A475B] mb-2">My Submissions</h1>
            <p className="text-gray-600">View all your submitted financing applications</p>
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
            <div className="grid grid-cols-1 gap-6">
              {applications.map((app) => (
                <div
                  key={app.id}
                  className="bg-white rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition-all"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-4">
                        <div className="bg-gradient-to-br from-[#6EAE3C] to-[#8BC83F] p-3 rounded-lg">
                          <FileCheck className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-[#3A475B] mb-1">
                            {app.customer_name}
                          </h3>
                          <p className="text-sm text-gray-600">{app.customer_email}</p>
                        </div>
                      </div>
                      <span
                        className={`px-4 py-2 rounded-full text-sm font-semibold border ${getStatusColor(
                          app.status
                        )}`}
                      >
                        {app.status || 'Submitted'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                        <DollarSign className="w-5 h-5 text-[#6EAE3C]" />
                        <div>
                          <div className="text-xs text-gray-600">Loan Amount</div>
                          <div className="font-bold text-[#3A475B]">
                            ${app.loan_amount?.toLocaleString() || '0'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                        <Calendar className="w-5 h-5 text-[#6EAE3C]" />
                        <div>
                          <div className="text-xs text-gray-600">Term</div>
                          <div className="font-bold text-[#3A475B]">
                            {app.term_months} months
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
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
