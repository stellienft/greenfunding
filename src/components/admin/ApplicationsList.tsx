import { useState, useEffect } from 'react';
import { Application } from '../../lib/supabase';
import { formatCurrency, formatCostPerKwh } from '../../calculator';
import { Download, Eye, X, FileText } from 'lucide-react';

export function ApplicationsList() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    setLoading(true);
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-applications`;

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.error || 'Failed to load applications');
      }

      if (result.applications) setApplications(result.applications);
    } catch (error) {
      console.error('Error loading applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (applications.length === 0) return;

    const headers = [
      'Date',
      'Name',
      'Email',
      'Company',
      'Phone',
      'Project Cost',
      'Loan Term',
      'Monthly Repayment',
      'Approval Amount',
      'Total Repayment',
      'Annual Solar Generation (kWh)',
      'Equivalent Cost per kWh (cents)',
      'Business Structure',
      'Years in Business',
      'Annual Revenue',
      'Industry',
      'Installer Name',
      'Installer Company',
      'Installer Email'
    ];

    const rows = applications.map(app => [
      new Date(app.created_at).toLocaleDateString(),
      app.full_name,
      app.email,
      app.company_name,
      app.phone,
      app.project_cost,
      app.loan_term_years,
      app.calculated_monthly_repayment,
      app.calculated_approval_amount,
      app.calculated_total_repayment,
      app.annual_solar_generation_kwh || '',
      app.calculated_cost_per_kwh || '',
      app.business_structure,
      app.years_in_business,
      app.annual_revenue,
      app.industry_sector,
      (app as any).installer?.full_name || '',
      (app as any).installer?.company_name || '',
      (app as any).installer?.email || ''
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `applications-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-600">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-[#3A475B]">Applications</h2>
          <p className="text-sm text-gray-600 mt-1">
            Total: {applications.length} application{applications.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={exportToCSV}
          disabled={applications.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#34AC48] to-[#AFD235] text-white font-semibold rounded-lg hover:bg-[#28AA48] transition-colors disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      <div className="space-y-4">
        {applications.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-12 text-center">
            <p className="text-gray-600">No applications yet</p>
          </div>
        ) : (
          applications.map(app => (
            <div
              key={app.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h3 className="font-bold text-[#3A475B]">{app.full_name}</h3>
                    <span className="text-sm text-gray-500">
                      {new Date(app.created_at).toLocaleDateString()}
                    </span>
                    {(app as any).installer && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-[#34AC48] to-[#AFD235] text-white text-xs font-semibold rounded-full">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                        {(app as any).installer.full_name}
                        {(app as any).installer.company_name && ` - ${(app as any).installer.company_name}`}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Project Cost:</span>
                      <div className="font-semibold text-[#3A475B]">
                        {formatCurrency(app.project_cost)}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Monthly Payment:</span>
                      <div className="font-semibold text-[#28AA48]">
                        {formatCurrency(app.calculated_monthly_repayment)}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Approval Amount:</span>
                      <div className="font-semibold text-[#3A475B]">
                        {formatCurrency(app.calculated_approval_amount)}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Email:</span>
                      <div className="font-semibold text-[#3A475B]">{app.email}</div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedApp(app)}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {selectedApp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 sm:p-6 flex justify-between items-center">
              <h3 className="text-xl sm:text-2xl font-bold text-[#3A475B]">Application Details</h3>
              <button
                onClick={() => setSelectedApp(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-6">
              {(selectedApp as any).installer && (
                <div className="bg-gradient-to-r from-[#34AC48] to-[#AFD235] rounded-lg p-4 text-white">
                  <h4 className="text-base sm:text-lg font-bold mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                    Submitted by Installer
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-white/80">Installer Name:</span>
                      <div className="font-semibold">{(selectedApp as any).installer.full_name}</div>
                    </div>
                    {(selectedApp as any).installer.company_name && (
                      <div>
                        <span className="text-white/80">Company:</span>
                        <div className="font-semibold">{(selectedApp as any).installer.company_name}</div>
                      </div>
                    )}
                    <div className="sm:col-span-2">
                      <span className="text-white/80">Installer Email:</span>
                      <div className="font-semibold break-all">{(selectedApp as any).installer.email}</div>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-base sm:text-lg font-bold text-[#3A475B] mb-3">Contact Information</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Full Name:</span>
                    <div className="font-semibold break-words">{selectedApp.full_name}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Email:</span>
                    <div className="font-semibold break-all">{selectedApp.email}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Company:</span>
                    <div className="font-semibold break-words">{selectedApp.company_name || 'N/A'}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Phone:</span>
                    <div className="font-semibold">{selectedApp.phone || 'N/A'}</div>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-gray-600">Best Time to Contact:</span>
                    <div className="font-semibold">{selectedApp.best_time_to_contact || 'N/A'}</div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-base sm:text-lg font-bold text-[#3A475B] mb-3">Business Information</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Structure:</span>
                    <div className="font-semibold">{selectedApp.business_structure}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Years in Business:</span>
                    <div className="font-semibold">{selectedApp.years_in_business}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Annual Revenue:</span>
                    <div className="font-semibold">{selectedApp.annual_revenue}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Industry:</span>
                    <div className="font-semibold">{selectedApp.industry_sector}</div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-base sm:text-lg font-bold text-[#3A475B] mb-3">Loan Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Project Cost:</span>
                    <div className="font-semibold">{formatCurrency(selectedApp.project_cost)}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Loan Term:</span>
                    <div className="font-semibold">{selectedApp.loan_term_years} years</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Monthly Repayment:</span>
                    <div className="font-semibold text-[#28AA48]">
                      {formatCurrency(selectedApp.calculated_monthly_repayment)}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Repayment:</span>
                    <div className="font-semibold">
                      {formatCurrency(selectedApp.calculated_total_repayment)}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Approval Amount:</span>
                    <div className="font-semibold">
                      {formatCurrency(selectedApp.calculated_approval_amount)}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Monthly Energy Savings:</span>
                    <div className="font-semibold">
                      {formatCurrency(selectedApp.monthly_energy_savings)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
                <h4 className="text-base sm:text-lg font-bold text-[#3A475B] mb-3">Hidden Fees Breakdown</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Invoice Amount (ex. GST):</span>
                    <div className="font-semibold">
                      {formatCurrency((selectedApp as any).invoice_amount_ex_gst || 0)}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Application Fee (inc. GST):</span>
                    <div className="font-semibold">
                      {formatCurrency((selectedApp as any).application_fee || 0)}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">PPSR Fee (inc. GST):</span>
                    <div className="font-semibold">
                      {formatCurrency((selectedApp as any).ppsr_fee || 0)}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Commission (inc. GST):</span>
                    <div className="font-semibold">
                      {formatCurrency((selectedApp.config_snapshot as any)?.commissionEnabled ?
                        (selectedApp as any).calculated_approval_amount * ((selectedApp.config_snapshot as any)?.commissionTiers?.[0]?.percentage || 0)
                        : 0)}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-600 mt-3 italic">
                  These fees are included in the loan amount but hidden from public quotes
                </p>
              </div>

              {(selectedApp.annual_solar_generation_kwh || selectedApp.calculated_cost_per_kwh) && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="text-base sm:text-lg font-bold text-[#3A475B] mb-3">Solar Generation Metrics</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                    {selectedApp.annual_solar_generation_kwh && (
                      <div>
                        <span className="text-gray-600">Annual Solar Generation:</span>
                        <div className="font-semibold">
                          {selectedApp.annual_solar_generation_kwh.toLocaleString()} kWh
                        </div>
                      </div>
                    )}
                    {selectedApp.calculated_cost_per_kwh && (
                      <div>
                        <span className="text-gray-600">Equivalent Cost per kWh:</span>
                        <div className="font-semibold text-[#28AA48]">
                          {formatCostPerKwh(selectedApp.calculated_cost_per_kwh)} <span className="text-xs text-gray-600">*equivalent cents per kWh</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-3 italic">
                    This calculation shows equivalent cents per kWh for comparison purposes only. Actual billing is based on fixed monthly installments.
                  </p>
                </div>
              )}

              {((selectedApp.uploaded_documents && Array.isArray(selectedApp.uploaded_documents) && selectedApp.uploaded_documents.length > 0) || selectedApp.privacy_consent_file || selectedApp.directors_id_file || selectedApp.asset_liability_file) && (
                <div>
                  <h4 className="text-lg font-bold text-[#3A475B] mb-3">Uploaded Documents</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    {selectedApp.privacy_consent_file && (
                      <div className="flex items-center justify-between bg-white border-2 border-[#28AA48] rounded-lg p-3">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-[#28AA48]" />
                          <div>
                            <p className="text-sm font-semibold text-[#3A475B]">
                              {selectedApp.privacy_consent_file.name}
                              <span className="ml-2 text-xs bg-[#28AA48] text-white px-2 py-0.5 rounded">Privacy Consent</span>
                            </p>
                            <p className="text-xs text-gray-600">
                              {selectedApp.privacy_consent_file.size ? `${(selectedApp.privacy_consent_file.size / 1024).toFixed(1)} KB` : ''}
                            </p>
                          </div>
                        </div>
                        <a
                          href={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/application-documents/${selectedApp.privacy_consent_file.path}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 text-sm bg-gradient-to-r from-[#34AC48] to-[#AFD235] text-white rounded hover:bg-[#28AA48] transition-colors"
                        >
                          View
                        </a>
                      </div>
                    )}
                    {selectedApp.directors_id_file && (
                      <div className="flex items-center justify-between bg-white border-2 border-[#3A475B]/30 rounded-lg p-3">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-[#3A475B]" />
                          <div>
                            <p className="text-sm font-semibold text-[#3A475B]">
                              {selectedApp.directors_id_file.name}
                              <span className="ml-2 text-xs bg-[#3A475B] text-white px-2 py-0.5 rounded">Directors ID</span>
                            </p>
                            <p className="text-xs text-gray-600">
                              {selectedApp.directors_id_file.size ? `${(selectedApp.directors_id_file.size / 1024).toFixed(1)} KB` : ''}
                            </p>
                          </div>
                        </div>
                        <a
                          href={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/application-documents/${selectedApp.directors_id_file.path}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 text-sm bg-gradient-to-r from-[#34AC48] to-[#AFD235] text-white rounded hover:bg-[#28AA48] transition-colors"
                        >
                          View
                        </a>
                      </div>
                    )}
                    {selectedApp.asset_liability_file && (
                      <div className="flex items-center justify-between bg-white border-2 border-[#3A475B]/30 rounded-lg p-3">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-[#3A475B]" />
                          <div>
                            <p className="text-sm font-semibold text-[#3A475B]">
                              {selectedApp.asset_liability_file.name}
                              <span className="ml-2 text-xs bg-[#3A475B] text-white px-2 py-0.5 rounded">Asset & Liability</span>
                            </p>
                            <p className="text-xs text-gray-600">
                              {selectedApp.asset_liability_file.size ? `${(selectedApp.asset_liability_file.size / 1024).toFixed(1)} KB` : ''}
                            </p>
                          </div>
                        </div>
                        <a
                          href={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/application-documents/${selectedApp.asset_liability_file.path}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 text-sm bg-gradient-to-r from-[#34AC48] to-[#AFD235] text-white rounded hover:bg-[#28AA48] transition-colors"
                        >
                          View
                        </a>
                      </div>
                    )}
                    {selectedApp.uploaded_documents && Array.isArray(selectedApp.uploaded_documents) && selectedApp.uploaded_documents.map((doc: any, index: number) => (
                      <div key={index} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-[#28AA48]" />
                          <div>
                            <p className="text-sm font-semibold text-[#3A475B]">{doc.name}</p>
                            <p className="text-xs text-gray-600">{doc.size ? `${(doc.size / 1024).toFixed(1)} KB` : ''}</p>
                          </div>
                        </div>
                        <a
                          href={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/application-documents/${doc.path}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 text-sm bg-gradient-to-r from-[#34AC48] to-[#AFD235] text-white rounded hover:bg-[#28AA48] transition-colors"
                        >
                          View
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedApp.notes && (
                <div>
                  <h4 className="text-lg font-bold text-[#3A475B] mb-3">Additional Notes</h4>
                  <div className="bg-gray-50 rounded-lg p-4 text-sm text-[#3A475B]">
                    {selectedApp.notes}
                  </div>
                </div>
              )}

              <div>
                <span className="text-sm text-gray-600">
                  Submitted: {new Date(selectedApp.created_at).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
