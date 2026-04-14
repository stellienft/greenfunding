import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Save, AlertCircle, CheckCircle, Code, Link } from 'lucide-react';
import { DangerZone } from './DangerZone';

export function SiteSettings() {
  const [googleAnalyticsCode, setGoogleAnalyticsCode] = useState('');
  const [googleAnalyticsEnabled, setGoogleAnalyticsEnabled] = useState(false);
  const [servicedRentalEnabled, setServicedRentalEnabled] = useState(false);
  const [servicedRentalManagementFee, setServicedRentalManagementFee] = useState('5.00');
  const [servicedRentalName, setServicedRentalName] = useState('Serviced Rental');
  const [servicedRentalDescription, setServicedRentalDescription] = useState('Finance your solar system with included annual maintenance service');
  const [pipedriveApiKey, setPipedriveApiKey] = useState('');
  const [pipedriveDealId, setPipedriveDealId] = useState('');
  const [pipedrivePipelineId, setPipedrivePipelineId] = useState('');
  const [pipedriveStageId, setPipedriveStageId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('google_analytics_code, google_analytics_enabled, serviced_rental_enabled, serviced_rental_management_fee_percent, serviced_rental_name, serviced_rental_description, pipedrive_api_key, pipedrive_deal_id, pipedrive_pipeline_id, pipedrive_stage_id')
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setGoogleAnalyticsCode(data.google_analytics_code || '');
        setGoogleAnalyticsEnabled(data.google_analytics_enabled || false);
        setServicedRentalEnabled(data.serviced_rental_enabled || false);
        setServicedRentalManagementFee(data.serviced_rental_management_fee_percent?.toString() || '5.00');
        setServicedRentalName(data.serviced_rental_name || 'Serviced Rental');
        setServicedRentalDescription(data.serviced_rental_description || 'Finance your solar system with included annual maintenance service');
        setPipedriveApiKey(data.pipedrive_api_key || '');
        setPipedriveDealId(data.pipedrive_deal_id || '');
        setPipedrivePipelineId(data.pipedrive_pipeline_id || '');
        setPipedriveStageId(data.pipedrive_stage_id || '');
      }
    } catch (error: any) {
      console.error('Error loading settings:', error);
      setMessage({ type: 'error', text: 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-site-settings`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          google_analytics_code: googleAnalyticsCode.trim(),
          google_analytics_enabled: googleAnalyticsEnabled,
          serviced_rental_enabled: servicedRentalEnabled,
          serviced_rental_management_fee_percent: parseFloat(servicedRentalManagementFee),
          serviced_rental_name: servicedRentalName.trim(),
          serviced_rental_description: servicedRentalDescription.trim(),
          pipedrive_api_key: pipedriveApiKey.trim(),
          pipedrive_deal_id: pipedriveDealId.trim(),
          pipedrive_pipeline_id: pipedrivePipelineId.trim(),
          pipedrive_stage_id: pipedriveStageId.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save settings');
      }

      setMessage({ type: 'success', text: 'Settings saved successfully!' });
      await loadSettings();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const isValidGAFormat = (code: string) => {
    if (!code.trim()) return true;
    return /^G-[A-Z0-9]+$/.test(code.trim()) || /gtag|analytics\.js|ga\(/.test(code);
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-600">Loading settings...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-[#3A475B]">Site Settings</h2>
          <p className="text-sm text-gray-600 mt-1">Manage Google Analytics and other site-wide settings</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !isValidGAFormat(googleAnalyticsCode)}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#34AC48] to-[#AFD235] text-white font-bold rounded-xl hover:shadow-xl transition-all shadow-lg disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {message && (
        <div
          className={`
            p-4 rounded-lg flex items-center gap-2
            ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }
          `}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          {message.text}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
        <div className="flex items-start gap-3">
          <Code className="w-5 h-5 text-[#3A475B] mt-1" />
          <div className="flex-1 space-y-4">
            <div>
              <h3 className="text-lg font-bold text-[#3A475B]">Google Analytics</h3>
              <p className="text-sm text-gray-600 mt-1">
                Track visitor behavior and site usage with Google Analytics 4
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="gaEnabled"
                checked={googleAnalyticsEnabled}
                onChange={(e) => setGoogleAnalyticsEnabled(e.target.checked)}
                className="w-5 h-5 text-[#28AA48] rounded"
              />
              <label htmlFor="gaEnabled" className="font-semibold text-[#3A475B]">
                Enable Google Analytics Tracking
              </label>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#3A475B] mb-2">
                Google Analytics Measurement ID or Tracking Code
              </label>
              <textarea
                value={googleAnalyticsCode}
                onChange={(e) => setGoogleAnalyticsCode(e.target.value)}
                placeholder="G-XXXXXXXXXX or paste full tracking code"
                rows={6}
                className={`
                  w-full px-4 py-2 border rounded-lg font-mono text-sm
                  ${!isValidGAFormat(googleAnalyticsCode) ? 'border-red-300 bg-red-50' : 'border-gray-300'}
                `}
              />
              {!isValidGAFormat(googleAnalyticsCode) && googleAnalyticsCode.trim() && (
                <p className="text-xs text-red-600 mt-1">
                  Please enter a valid GA4 Measurement ID (e.g., G-XXXXXXXXXX) or tracking code
                </p>
              )}
              <p className="text-xs text-gray-500 mt-2">
                Enter your GA4 Measurement ID (e.g., G-XXXXXXXXXX) or paste the complete tracking code from Google Analytics.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">How to find your Measurement ID:</h4>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Go to your Google Analytics account</li>
                <li>Navigate to Admin (bottom left)</li>
                <li>Select your Property</li>
                <li>Click on Data Streams</li>
                <li>Select your web stream</li>
                <li>Copy the Measurement ID (starts with G-)</li>
              </ol>
            </div>

            {googleAnalyticsEnabled && googleAnalyticsCode.trim() && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Preview:</h4>
                <p className="text-xs text-gray-600 mb-2">
                  This tracking code will be injected into your site's header:
                </p>
                <pre className="text-xs bg-white border border-gray-300 rounded p-3 overflow-x-auto">
                  {googleAnalyticsCode.startsWith('G-') ? (
                    `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsCode.trim()}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${googleAnalyticsCode.trim()}');
</script>`
                  ) : (
                    googleAnalyticsCode
                  )}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
        <div className="flex items-start gap-3">
          <div className="flex-1 space-y-4">
            <div>
              <h3 className="text-lg font-bold text-[#3A475B]">Serviced Rental Calculator</h3>
              <p className="text-sm text-gray-600 mt-1">
                Enable customers to finance solar systems with included annual maintenance service
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="servicedRentalEnabled"
                checked={servicedRentalEnabled}
                onChange={(e) => setServicedRentalEnabled(e.target.checked)}
                className="w-5 h-5 text-[#28AA48] rounded"
              />
              <label htmlFor="servicedRentalEnabled" className="font-semibold text-[#3A475B]">
                Enable Serviced Rental Calculator
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[#3A475B] mb-2">
                  Calculator Name
                </label>
                <input
                  type="text"
                  value={servicedRentalName}
                  onChange={(e) => setServicedRentalName(e.target.value)}
                  placeholder="Serviced Rental"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#3A475B] mb-2">
                  Management Fee (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={servicedRentalManagementFee}
                  onChange={(e) => setServicedRentalManagementFee(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Hidden fee applied to manage maintenance distribution
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#3A475B] mb-2">
                Calculator Description
              </label>
              <textarea
                value={servicedRentalDescription}
                onChange={(e) => setServicedRentalDescription(e.target.value)}
                placeholder="Finance your solar system with included annual maintenance service"
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">How Serviced Rental Works:</h4>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Customer enters annual maintenance cost (e.g., $3,000)</li>
                <li>System calculates total maintenance: Annual cost × Term years</li>
                <li>Total maintenance is added to the finance amount</li>
                <li>Management fee is applied to cover distribution costs (hidden from customer)</li>
                <li>Customer pays monthly, you distribute maintenance to installer</li>
              </ol>
            </div>

            {servicedRentalEnabled && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-green-900 mb-2">Example Calculation:</h4>
                <div className="text-sm text-green-800 space-y-1">
                  <p>Project Cost: $100,000</p>
                  <p>Annual Maintenance: $3,000</p>
                  <p>Term: 10 years</p>
                  <p>Total Maintenance: $3,000 × 10 = $30,000</p>
                  <p>Management Fee ({servicedRentalManagementFee}%): ${(30000 * parseFloat(servicedRentalManagementFee) / 100).toFixed(2)}</p>
                  <p className="font-semibold pt-2 border-t border-green-300">Total Finance Amount: ${(100000 + 30000 + (30000 * parseFloat(servicedRentalManagementFee) / 100)).toFixed(2)}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
        <div className="flex items-start gap-3">
          <Link className="w-5 h-5 text-[#3A475B] mt-1 flex-shrink-0" />
          <div className="flex-1 space-y-4">
            <div>
              <h3 className="text-lg font-bold text-[#3A475B]">Pipedrive Integration</h3>
              <p className="text-sm text-gray-600 mt-1">
                Configure your Pipedrive connection and set which pipeline and stage new deals should be placed into.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[#3A475B] mb-2">
                  Pipedrive API Token
                </label>
                <input
                  type="password"
                  value={pipedriveApiKey}
                  onChange={(e) => setPipedriveApiKey(e.target.value)}
                  placeholder="Your Pipedrive API token"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Found in Pipedrive under Settings → Personal preferences → API
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#3A475B] mb-2">
                  Default Deal ID for Document Notifications
                </label>
                <input
                  type="text"
                  value={pipedriveDealId}
                  onChange={(e) => setPipedriveDealId(e.target.value)}
                  placeholder="e.g. 12345"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Optional. When all client documents are uploaded, a completion note is posted to this deal.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[#3A475B] mb-2">
                  Pipeline ID
                </label>
                <input
                  type="text"
                  value={pipedrivePipelineId}
                  onChange={(e) => setPipedrivePipelineId(e.target.value)}
                  placeholder="e.g. 2"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                />
                <p className="text-xs text-gray-500 mt-1">
                  The pipeline new deals are created in. Found in Pipedrive under Pipeline settings — the number in the URL.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#3A475B] mb-2">
                  Stage ID (Deal Flow)
                </label>
                <input
                  type="text"
                  value={pipedriveStageId}
                  onChange={(e) => setPipedriveStageId(e.target.value)}
                  placeholder="e.g. 4"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                />
                <p className="text-xs text-gray-500 mt-1">
                  The stage within that pipeline where new deals are placed. Use the Pipedrive API or stage settings URL to find the ID.
                </p>
              </div>
            </div>

            {pipedriveApiKey && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-green-800 space-y-1">
                  <p className="font-semibold">Pipedrive API is configured.</p>
                  {(pipedrivePipelineId || pipedriveStageId) && (
                    <p>
                      New deals will be created in
                      {pipedrivePipelineId ? <> pipeline <strong>#{pipedrivePipelineId}</strong></> : ''}
                      {pipedrivePipelineId && pipedriveStageId ? ',' : ''}
                      {pipedriveStageId ? <> stage <strong>#{pipedriveStageId}</strong></> : ''}.
                    </p>
                  )}
                  {pipedriveDealId
                    ? <p>Document upload notifications will be posted to deal <strong>#{pipedriveDealId}</strong>.</p>
                    : <p className="text-green-700">No default deal ID set — document upload notifications will be skipped.</p>
                  }
                </div>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">How Pipedrive integration works:</h4>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>From the <strong>Quotes list</strong>, use "Send to Pipedrive" on any proposal — enter an existing deal ID to attach to it, or leave blank to create a new deal in the configured pipeline and stage</li>
                <li>When a client completes all document uploads, a completion note is posted to the default deal ID above</li>
                <li>Each synced proposal stores a direct link back to its Pipedrive deal</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <DangerZone />
    </div>
  );
}
