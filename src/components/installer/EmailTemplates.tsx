import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Mail, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface Template {
  id: string;
  title: string;
  description: string;
  subject: string;
  body: string;
}

function buildTemplates(
  installerName: string,
  installerCompany: string,
  introSubject: string,
  introBody: string
): Template[] {
  const resolved = (text: string) =>
    text
      .replace(/\[InstallerName\]/g, installerName)
      .replace(/\[InstallerCompany\]/g, installerCompany)
      .replace(/\[RecipientName\]/g, '[Client Name]')
      .replace(/\[RecipientCompany\]/g, '[Client Company]');

  return [
    {
      id: 'intro',
      title: 'Introduction Email',
      description: 'Send when first introducing Green Funding to a potential client.',
      subject: resolved(introSubject),
      body: resolved(introBody),
    },
  ];
}

function TemplateCard({ template }: { template: Template }) {
  const [copied, setCopied] = useState<'subject' | 'body' | null>(null);
  const [expanded, setExpanded] = useState(false);

  const handleCopy = async (type: 'subject' | 'body', text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#6EAE3C]/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <Mail className="w-4 h-4 text-[#6EAE3C]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#3A475B]">{template.title}</p>
            <p className="text-xs text-gray-500 mt-0.5">{template.description}</p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-5 py-4 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Subject</label>
              <button
                onClick={() => handleCopy('subject', template.subject)}
                className="flex items-center gap-1 text-xs font-medium text-[#6EAE3C] hover:text-[#5d9432] transition-colors"
              >
                {copied === 'subject' ? (
                  <><Check className="w-3.5 h-3.5" /> Copied</>
                ) : (
                  <><Copy className="w-3.5 h-3.5" /> Copy</>
                )}
              </button>
            </div>
            <div className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-[#3A475B] font-medium">
              {template.subject}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Body</label>
              <button
                onClick={() => handleCopy('body', template.body)}
                className="flex items-center gap-1 text-xs font-medium text-[#6EAE3C] hover:text-[#5d9432] transition-colors"
              >
                {copied === 'body' ? (
                  <><Check className="w-3.5 h-3.5" /> Copied</>
                ) : (
                  <><Copy className="w-3.5 h-3.5" /> Copy</>
                )}
              </button>
            </div>
            <pre className="px-3 py-3 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
              {template.body}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

export function InstallerEmailTemplates() {
  const { installerProfile } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, [installerProfile]);

  async function loadTemplates() {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('site_settings')
        .select('intro_email_subject, intro_email_body')
        .maybeSingle();

      const installerName = installerProfile?.full_name || 'Your Name';
      const installerCompany = installerProfile?.company_name || 'Your Company';
      const subject = data?.intro_email_subject || 'Introduction to Green Funding – Solar Finance Options';
      const body = data?.intro_email_body || `Hi [RecipientName],\n\nI hope this message finds you well.\n\nI wanted to take a moment to introduce you to Green Funding, a specialist solar finance provider we work with to help businesses like yours access clean energy without large upfront costs.\n\nGreen Funding offers flexible rental finance solutions tailored for commercial solar installations, with competitive rates and straightforward terms.\n\nI have put together a quote for your consideration and I am happy to walk you through the numbers at a time that suits you.\n\nPlease feel free to reach out if you have any questions.\n\nKind regards,\n[InstallerName]\n[InstallerCompany]`;

      setTemplates(buildTemplates(installerName, installerCompany, subject, body));
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Mail className="w-4 h-4 text-[#3A475B]" />
        <h3 className="text-sm font-semibold text-[#3A475B]">Email Templates</h3>
      </div>
      <p className="text-xs text-gray-500">
        Click a template to expand it, then copy the subject or body to paste into your email client.
      </p>
      <div className="space-y-2">
        {templates.map(t => (
          <TemplateCard key={t.id} template={t} />
        ))}
      </div>
    </div>
  );
}
