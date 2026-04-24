import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Save, AlertCircle, CheckCircle, Mail, Info } from 'lucide-react';

const DEFAULT_SUBJECT = 'Introduction to Green Funding – Solar Finance Options';
const DEFAULT_BODY = `Hi [RecipientName],

I hope this message finds you well.

I wanted to take a moment to introduce you to Green Funding, a specialist solar finance provider we work with to help businesses like yours access clean energy without large upfront costs.

Green Funding offers flexible rental finance solutions tailored for commercial solar installations, with competitive rates and straightforward terms.

I have put together a quote for your consideration and I am happy to walk you through the numbers at a time that suits you.

Please feel free to reach out if you have any questions.

Kind regards,
[InstallerName]
[InstallerCompany]`;

const TOKENS = [
  { token: '[RecipientName]', description: "The customer's name" },
  { token: '[RecipientCompany]', description: "The customer's company name" },
  { token: '[InstallerName]', description: "The partner's full name" },
  { token: '[InstallerCompany]', description: "The partner's company name" },
];

export function EmailTemplates() {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadTemplate();
  }, []);

  const loadTemplate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('intro_email_subject, intro_email_body')
        .maybeSingle();

      if (error) throw error;
      setSubject(data?.intro_email_subject || DEFAULT_SUBJECT);
      setBody(data?.intro_email_body || DEFAULT_BODY);
    } catch (error: any) {
      console.error('Error loading email template:', error);
      setMessage({ type: 'error', text: 'Failed to load template' });
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
          intro_email_subject: subject.trim(),
          intro_email_body: body,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to save template');

      setMessage({ type: 'success', text: 'Email template saved successfully!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSubject(DEFAULT_SUBJECT);
    setBody(DEFAULT_BODY);
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-600">Loading template...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-[#3A475B]">Email Templates</h2>
          <p className="text-sm text-gray-600 mt-1">
            Configure the intro email template partners use to introduce clients to Green Funding
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !subject.trim()}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#34AC48] to-[#AFD235] text-white font-bold rounded-xl hover:shadow-xl transition-all shadow-lg disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Template'}
        </button>
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-[#3A475B]" />
              <h3 className="text-lg font-bold text-[#3A475B]">Intro Email Template</h3>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#3A475B] mb-2">
                Subject Line
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter email subject..."
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#28AA48] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#3A475B] mb-2">
                Email Body
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={18}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#28AA48] focus:border-transparent resize-y"
                placeholder="Enter email body..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Use the tokens on the right to personalise the message for each recipient.
              </p>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleReset}
                className="text-sm text-gray-500 hover:text-[#3A475B] underline transition-colors"
              >
                Reset to default template
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Info className="w-4 h-4 text-[#3A475B]" />
              <h4 className="text-sm font-bold text-[#3A475B]">Available Tokens</h4>
            </div>
            <p className="text-xs text-gray-600 mb-4">
              These tokens are replaced with real values when an installer copies the email in the portal.
            </p>
            <div className="space-y-3">
              {TOKENS.map(({ token, description }) => (
                <div key={token} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <code className="text-xs font-mono font-bold text-[#28AA48] block mb-1">
                    {token}
                  </code>
                  <p className="text-xs text-gray-600">{description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
            <h4 className="text-sm font-bold text-blue-900 mb-2">How It Works</h4>
            <ol className="text-xs text-blue-800 space-y-1.5 list-decimal list-inside">
              <li>Partner opens the Email Proposal modal on the proposal page</li>
              <li>An "Intro Email" tab shows this template with tokens replaced</li>
              <li>The partner can edit the text before copying</li>
              <li>They copy it and paste into their own email client</li>
              <li>They then switch to "Proposal Details" to send the PDF proposal</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
