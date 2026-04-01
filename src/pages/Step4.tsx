import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Stepper } from '../components/Stepper';
import { RequirementsTable } from '../components/RequirementsTable';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { calculateAll, calculateCostPerKwh, calculateProgressPayment } from '../calculator';
import { CheckCircle2, FileText, Send, Upload, X, RotateCcw } from 'lucide-react';

interface UploadedFile {
  name: string;
  path: string;
  size: number;
}

export function Step4() {
  const navigate = useNavigate();
  const { state, config, assets, resetState } = useApp();
  const { user } = useAuth();
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [businessDescription, setBusinessDescription] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [bestTime, setBestTime] = useState('');
  const [notes, setNotes] = useState('');
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [privacyConsentFile, setPrivacyConsentFile] = useState<UploadedFile | null>(null);
  const [directorsIdFile, setDirectorsIdFile] = useState<UploadedFile | null>(null);
  const [assetLiabilityFile, setAssetLiabilityFile] = useState<UploadedFile | null>(null);
  const [bankStatementsFile, setBankStatementsFile] = useState<UploadedFile | null>(null);

  const projectCost = state.projectCost || 0;

  const handleBack = () => {
    if (state.specialPricingRequested) {
      navigate('/');
    } else {
      navigate('/step-3');
    }
  };

  const handleRestart = () => {
    if (confirm('Are you sure you want to restart? All progress will be lost.')) {
      resetState();
      navigate('/');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('application-documents')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        return {
          name: file.name,
          path: filePath,
          size: file.size
        };
      });

      const newFiles = await Promise.all(uploadPromises);
      setUploadedFiles(prev => [...prev, ...newFiles]);
    } catch (error: any) {
      console.error('Error uploading files:', error);
      alert('Failed to upload files. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handlePrivacyConsentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `consent-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('application-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      setPrivacyConsentFile({
        name: file.name,
        path: filePath,
        size: file.size
      });
    } catch (error: any) {
      console.error('Error uploading privacy consent:', error);
      alert('Failed to upload privacy consent form. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const removePrivacyConsent = async () => {
    if (!privacyConsentFile) return;

    try {
      const { error } = await supabase.storage
        .from('application-documents')
        .remove([privacyConsentFile.path]);

      if (error) throw error;

      setPrivacyConsentFile(null);
    } catch (error: any) {
      console.error('Error removing privacy consent:', error);
      alert('Failed to remove file. Please try again.');
    }
  };

  const handleDirectorsIdUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `directors-id-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('application-documents').upload(fileName, file);
      if (uploadError) throw uploadError;
      setDirectorsIdFile({ name: file.name, path: fileName, size: file.size });
    } catch (error: any) {
      console.error('Error uploading directors ID:', error);
      alert('Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const removeDirectorsId = async () => {
    if (!directorsIdFile) return;
    try {
      const { error } = await supabase.storage.from('application-documents').remove([directorsIdFile.path]);
      if (error) throw error;
      setDirectorsIdFile(null);
    } catch (error: any) {
      console.error('Error removing directors ID:', error);
      alert('Failed to remove file. Please try again.');
    }
  };

  const handleAssetLiabilityUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `asset-liability-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('application-documents').upload(fileName, file);
      if (uploadError) throw uploadError;
      setAssetLiabilityFile({ name: file.name, path: fileName, size: file.size });
    } catch (error: any) {
      console.error('Error uploading asset & liability statement:', error);
      alert('Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const removeAssetLiability = async () => {
    if (!assetLiabilityFile) return;
    try {
      const { error } = await supabase.storage.from('application-documents').remove([assetLiabilityFile.path]);
      if (error) throw error;
      setAssetLiabilityFile(null);
    } catch (error: any) {
      console.error('Error removing asset & liability statement:', error);
      alert('Failed to remove file. Please try again.');
    }
  };

  const handleBankStatementsUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `bank-statements-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('application-documents').upload(fileName, file);
      if (uploadError) throw uploadError;
      setBankStatementsFile({ name: file.name, path: fileName, size: file.size });
    } catch (error: any) {
      console.error('Error uploading bank statements:', error);
      alert('Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const removeBankStatements = async () => {
    if (!bankStatementsFile) return;
    try {
      const { error } = await supabase.storage.from('application-documents').remove([bankStatementsFile.path]);
      if (error) throw error;
      setBankStatementsFile(null);
    } catch (error: any) {
      console.error('Error removing bank statements:', error);
      alert('Failed to remove file. Please try again.');
    }
  };

  const removeFile = async (filePath: string) => {
    try {
      const { error } = await supabase.storage
        .from('application-documents')
        .remove([filePath]);

      if (error) throw error;

      setUploadedFiles(prev => prev.filter(f => f.path !== filePath));
    } catch (error: any) {
      console.error('Error removing file:', error);
      alert('Failed to remove file. Please try again.');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!privacyConsentFile) {
      alert('Please upload the signed Privacy Consent Form to proceed');
      return;
    }

    if (projectCost < 250000) {
      if (!directorsIdFile) {
        alert('Please upload the Directors Drivers Licence & Medicare card to proceed');
        return;
      }
      if (!assetLiabilityFile) {
        alert('Please upload the Directors Asset & Liability Statement to proceed');
        return;
      }
      if (!bankStatementsFile) {
        alert('Please upload the last 6 months bank statements to proceed');
        return;
      }
    }

    if (!fullName || !email || !businessDescription) {
      alert('Please complete all required fields');
      return;
    }

    if (!config) {
      alert('Configuration not loaded');
      return;
    }

    setSubmitting(true);

    try {
      const assetRiskAdjustments: Record<string, number> = {};
      assets.forEach(asset => {
        assetRiskAdjustments[asset.id] = asset.risk_adjustment;
      });

      const calculationInputs = {
        projectCost: state.projectCost,
        loanTermYears: state.loanTermYears,
        selectedAssetIds: state.selectedAssetIds,
        assetRiskAdjustments,
        residualPercentage: state.residualPercentage,
        progressPayments: state.progressPayments,
        annualMaintenanceFee: state.annualMaintenanceFee
      };

      const results = state.calculatorType === 'progress_payment_rental'
        ? calculateProgressPayment(calculationInputs, config)
        : calculateAll(calculationInputs, config);

      const costPerKwh = state.annualSolarGenerationKwh
        ? calculateCostPerKwh(results.monthlyRepayment, state.annualSolarGenerationKwh)
        : null;

      const { data: insertedApplication, error } = await supabase.from('applications').insert({
        project_cost: state.projectCost,
        loan_term_years: state.loanTermYears,
        selected_assets: state.selectedAssetIds,
        calculated_monthly_repayment: results.monthlyRepayment,
        calculated_approval_amount: results.approvalAmount,
        calculated_total_repayment: results.totalRepayment,
        annual_solar_generation_kwh: state.annualSolarGenerationKwh || null,
        calculated_cost_per_kwh: costPerKwh,
        full_name: fullName,
        company_name: companyName,
        business_description: businessDescription,
        email,
        phone,
        best_time_to_contact: bestTime,
        notes,
        special_pricing_requested: state.specialPricingRequested || false,
        privacy_consent_file: privacyConsentFile,
        directors_id_file: directorsIdFile,
        asset_liability_file: assetLiabilityFile,
        config_snapshot: config,
        uploaded_documents: uploadedFiles,
        installer_id: user?.id || null,
        application_fee: results.applicationFee,
        ppsr_fee: results.ppsrFee,
        invoice_amount_ex_gst: results.invoiceAmountExGst
      }).select().single();

      if (error) {
        console.error('Supabase insert error:', error);
        alert(`Failed to submit application: ${error.message}\n\nDetails: ${error.hint || error.details || 'No additional details'}`);
        throw error;
      }

      try {
        const emailApiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-application-email`;
        await fetch(emailApiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            applicationId: insertedApplication.id
          }),
        });
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
      }

      setSubmitted(true);
      window.dispatchEvent(new Event('applicationSubmitted'));
    } catch (error: any) {
      console.error('Error submitting application:', error);
      if (error.message) {
        alert(`Failed to submit application: ${error.message}`);
      } else {
        alert('Failed to submit application. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isLowDoc = projectCost < 250000;

  const renderRequirements = () => {
    if (isLowDoc) {
      return (
        <div className="bg-gray-50 rounded-lg p-6">
          <h4 className="text-lg font-bold text-[#3A475B] mb-4">Low Doc Requirements</h4>
          <p className="text-sm text-gray-600 mb-4">
            For projects up to $250,000, you'll need:
          </p>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#28AA48] flex-shrink-0 mt-0.5" />
              <span className="text-sm text-[#3A475B]">Directors Drivers Licence & Medicare card</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#28AA48] flex-shrink-0 mt-0.5" />
              <span className="text-sm text-[#3A475B]">Directors Asset & Liability Statement</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#28AA48] flex-shrink-0 mt-0.5" />
              <span className="text-sm text-[#3A475B]">Last 6 months bank statements</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#28AA48] flex-shrink-0 mt-0.5" />
              <span className="text-sm text-[#3A475B]">Privacy Consent Form (signed)</span>
            </li>
          </ul>
        </div>
      );
    } else {
      return (
        <div className="bg-gray-50 rounded-lg p-6">
          <h4 className="text-lg font-bold text-[#3A475B] mb-4">Full Documentation Requirements</h4>
          <p className="text-sm text-gray-600 mb-4">
            For projects over $250,000, documentation requirements vary by loan amount:
          </p>
          <RequirementsTable />
        </div>
      );
    }
  };

  if (submitted) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-3xl font-bold text-[#3A475B] mb-4">
                Application Submitted!
              </h2>
              <p className="text-gray-600 mb-8">
                Thank you for your application. Our team will review your details and
                contact you shortly to discuss your financing options.
              </p>
              <button
                onClick={() => {
                  resetState();
                  navigate('/');
                }}
                className="px-8 py-4 bg-gradient-to-r from-[#34AC48] to-[#AFD235] text-white font-bold rounded-xl hover:shadow-xl transition-all shadow-lg text-lg"
              >
                Start New Application
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Stepper currentStep={3} />

      <div className="container mx-auto px-4 pb-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-3xl font-bold text-[#3A475B] mb-2">
              Complete Your Application
            </h2>
            <p className="text-gray-600 mb-8">
              Provide your details and we'll be in touch to finalize your financing
            </p>

            <div className="mb-8">
              <h3 className="text-lg sm:text-xl font-bold text-[#3A475B] mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#28AA48]" />
                Required Documents
              </h3>
              {renderRequirements()}

            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label className="block text-sm font-semibold text-[#3A475B] mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    required
                    className="w-full px-4 py-3 sm:py-3.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#28AA48] focus:border-transparent text-base touch-manipulation"
                    placeholder="John Smith"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#3A475B] mb-2">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    className="w-full px-4 py-3 sm:py-3.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#28AA48] focus:border-transparent text-base touch-manipulation"
                    placeholder="ABC Pty Ltd"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#3A475B] mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 sm:py-3.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#28AA48] focus:border-transparent text-base touch-manipulation"
                    placeholder="john@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#3A475B] mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full px-4 py-3 sm:py-3.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#28AA48] focus:border-transparent text-base touch-manipulation"
                    placeholder="0400 000 000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#3A475B] mb-2">
                  What does your business do? *
                </label>
                <textarea
                  value={businessDescription}
                  onChange={e => setBusinessDescription(e.target.value)}
                  required
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#28AA48] focus:border-transparent resize-none text-base touch-manipulation"
                  placeholder="Describe your business activities..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#3A475B] mb-2">
                  Best Time to Contact
                </label>
                <input
                  type="text"
                  value={bestTime}
                  onChange={e => setBestTime(e.target.value)}
                  className="w-full px-4 py-3 sm:py-3.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#28AA48] focus:border-transparent text-base touch-manipulation"
                  placeholder="e.g., Weekday mornings"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#3A475B] mb-2">
                  Additional Notes
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#28AA48] focus:border-transparent resize-none text-base touch-manipulation"
                  placeholder="Any additional information you'd like to share..."
                />
              </div>

              {isLowDoc && (
                <div className="border border-gray-200 rounded-lg p-4 sm:p-6">
                  <h4 className="text-base font-bold text-[#3A475B] mb-3">
                    Directors Drivers Licence & Medicare Card *
                  </h4>
                  <p className="text-xs sm:text-sm text-gray-600 mb-4">
                    Upload a copy of the Directors Drivers Licence and Medicare card. Required for Low Doc applications up to $250,000.
                  </p>
                  {!directorsIdFile ? (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-[#3A475B] transition-colors">
                      <input
                        type="file"
                        id="directors-id-upload"
                        onChange={handleDirectorsIdUpload}
                        disabled={uploading}
                        className="hidden"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      />
                      <label htmlFor="directors-id-upload" className="cursor-pointer flex flex-col items-center">
                        <Upload className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400 mb-2" />
                        <span className="text-xs sm:text-sm font-semibold text-[#3A475B]">
                          {uploading ? 'Uploading...' : 'Upload Drivers Licence & Medicare Card'}
                        </span>
                        <span className="text-xs text-gray-600 mt-1">PDF, DOC, DOCX, JPG, PNG (max 10MB)</span>
                      </label>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-white border-2 border-[#3A475B] rounded-lg p-3 gap-2">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileText className="w-5 h-5 text-[#3A475B] flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-[#3A475B] truncate">{directorsIdFile.name}</p>
                          <p className="text-xs text-gray-600">{formatFileSize(directorsIdFile.size)}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={removeDirectorsId}
                        className="p-2 hover:bg-red-50 rounded transition-colors touch-manipulation flex-shrink-0"
                        aria-label="Remove file"
                      >
                        <X className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {isLowDoc && (
                <div className="border border-gray-200 rounded-lg p-4 sm:p-6">
                  <h4 className="text-base font-bold text-[#3A475B] mb-3">
                    Last 6 Months Bank Statements *
                  </h4>
                  <p className="text-xs sm:text-sm text-gray-600 mb-3">
                    Please download your last 6 months bank statements and upload them here. Required for Low Doc applications up to $250,000.
                  </p>
                  <a
                    href="https://scv.bankstatements.com.au/HSHV"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-[#28AA48] hover:text-[#1e8a38] underline underline-offset-2 mb-4 transition-colors"
                  >
                    <FileText className="w-4 h-4 flex-shrink-0" />
                    Download Bank Statements via Secure Portal
                  </a>
                  {!bankStatementsFile ? (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-[#3A475B] transition-colors">
                      <input
                        type="file"
                        id="bank-statements-upload"
                        onChange={handleBankStatementsUpload}
                        disabled={uploading}
                        className="hidden"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.zip"
                      />
                      <label htmlFor="bank-statements-upload" className="cursor-pointer flex flex-col items-center">
                        <Upload className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400 mb-2" />
                        <span className="text-xs sm:text-sm font-semibold text-[#3A475B]">
                          {uploading ? 'Uploading...' : 'Upload Bank Statements'}
                        </span>
                        <span className="text-xs text-gray-600 mt-1">PDF, DOC, DOCX, JPG, PNG, ZIP (max 10MB)</span>
                      </label>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-white border-2 border-[#3A475B] rounded-lg p-3 gap-2">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileText className="w-5 h-5 text-[#3A475B] flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-[#3A475B] truncate">{bankStatementsFile.name}</p>
                          <p className="text-xs text-gray-600">{formatFileSize(bankStatementsFile.size)}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={removeBankStatements}
                        className="p-2 hover:bg-red-50 rounded transition-colors touch-manipulation flex-shrink-0"
                        aria-label="Remove file"
                      >
                        <X className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {isLowDoc && (
                <div className="border border-gray-200 rounded-lg p-4 sm:p-6">
                  <h4 className="text-base font-bold text-[#3A475B] mb-3">
                    Directors Asset & Liability Statement *
                  </h4>
                  <p className="text-xs sm:text-sm text-gray-600 mb-4">
                    Upload the Directors Asset & Liability Statement. Required for Low Doc applications up to $250,000.
                  </p>
                  {!assetLiabilityFile ? (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-[#3A475B] transition-colors">
                      <input
                        type="file"
                        id="asset-liability-upload"
                        onChange={handleAssetLiabilityUpload}
                        disabled={uploading}
                        className="hidden"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      />
                      <label htmlFor="asset-liability-upload" className="cursor-pointer flex flex-col items-center">
                        <Upload className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400 mb-2" />
                        <span className="text-xs sm:text-sm font-semibold text-[#3A475B]">
                          {uploading ? 'Uploading...' : 'Upload Asset & Liability Statement'}
                        </span>
                        <span className="text-xs text-gray-600 mt-1">PDF, DOC, DOCX, JPG, PNG (max 10MB)</span>
                      </label>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-white border-2 border-[#3A475B] rounded-lg p-3 gap-2">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileText className="w-5 h-5 text-[#3A475B] flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-[#3A475B] truncate">{assetLiabilityFile.name}</p>
                          <p className="text-xs text-gray-600">{formatFileSize(assetLiabilityFile.size)}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={removeAssetLiability}
                        className="p-2 hover:bg-red-50 rounded transition-colors touch-manipulation flex-shrink-0"
                        aria-label="Remove file"
                      >
                        <X className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="border-2 border-[#28AA48] rounded-lg p-4 sm:p-6 bg-[#28AA48]/5">
                <h4 className="text-base font-bold text-[#3A475B] mb-3">
                  Privacy Consent Form *
                </h4>
                <p className="text-xs sm:text-sm text-gray-600 mb-4">
                  Please download, sign, and upload the Privacy Consent Form. This is required to proceed with your application.
                </p>
                <a
                  href="https://drive.google.com/file/d/1aIw8H6qgvCcVIULRiVsanfKR38jWTOHN/view"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#28AA48] hover:text-[#34AC48] mb-4 underline"
                >
                  <FileText className="w-4 h-4" />
                  Download Privacy Consent Form
                </a>

                {!privacyConsentFile ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-[#28AA48] transition-colors">
                    <input
                      type="file"
                      id="privacy-consent-upload"
                      onChange={handlePrivacyConsentUpload}
                      disabled={uploading}
                      className="hidden"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    />
                    <label
                      htmlFor="privacy-consent-upload"
                      className="cursor-pointer flex flex-col items-center"
                    >
                      <Upload className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400 mb-2" />
                      <span className="text-xs sm:text-sm font-semibold text-[#3A475B]">
                        {uploading ? 'Uploading...' : 'Upload Signed Privacy Consent Form'}
                      </span>
                      <span className="text-xs text-gray-600 mt-1">
                        PDF, DOC, DOCX, JPG, PNG (max 10MB)
                      </span>
                    </label>
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-white border-2 border-[#28AA48] rounded-lg p-3 gap-2">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileText className="w-5 h-5 text-[#28AA48] flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[#3A475B] truncate">
                          {privacyConsentFile.name}
                        </p>
                        <p className="text-xs text-gray-600">
                          {formatFileSize(privacyConsentFile.size)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removePrivacyConsent}
                      className="p-2 hover:bg-red-50 rounded transition-colors touch-manipulation flex-shrink-0"
                      aria-label="Remove file"
                    >
                      <X className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="px-6 sm:px-8 py-3 sm:py-3.5 bg-gray-100 text-[#3A475B] font-semibold rounded-lg hover:bg-gray-200 transition-colors touch-manipulation"
                    disabled={submitting}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleRestart}
                    className="px-6 sm:px-8 py-3 sm:py-3.5 bg-white border-2 border-gray-300 text-[#3A475B] font-semibold rounded-lg hover:bg-gray-50 transition-colors touch-manipulation flex items-center justify-center gap-2"
                    disabled={submitting}
                  >
                    <RotateCcw className="w-4 h-4" />
                    Restart
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 sm:px-8 py-3.5 sm:py-4 bg-gradient-to-r from-[#34AC48] to-[#AFD235] text-white font-bold rounded-xl hover:shadow-xl transition-all shadow-lg text-base sm:text-lg flex items-center justify-center gap-2 disabled:opacity-50 touch-manipulation"
                >
                  {submitting ? (
                    'Submitting...'
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Submit Application
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}
