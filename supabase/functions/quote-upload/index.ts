import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

function getRequiredDocKeys(projectCost: number): string[] {
  if (projectCost >= 250000) {
    const docs = ['financials', 'mgt_financials', 'finance_commitment', 'ato_statement', 'business_overview', 'asset_liability'];
    if (projectCost >= 500000) docs.push('aged_debtors');
    if (projectCost >= 1000000) docs.push('cashflow');
    return docs;
  }
  const base = ['directors_licence', 'medicare_card', 'privacy_consent', 'asset_liability'];
  if (projectCost >= 150000) base.splice(2, 0, 'bank_statements');
  return base;
}

function formatDocType(s: string): string {
  const map: Record<string, string> = {
    directors_licence: "Director's Drivers Licence",
    medicare_card: "Director's Medicare Card",
    privacy_consent: 'Privacy Consent',
    asset_liability: 'Asset and Liability Statement',
    bank_statements: '6 Months Business Bank Statements',
    financials: 'FY24 & FY25 Accountant Prepared Financials',
    mgt_financials: 'Mgt YTD Dec 25 Financials',
    finance_commitment: 'Finance Commitment Schedule',
    ato_statement: 'Current ATO Portal Statement',
    business_overview: 'Business Overview and Major Clients',
    aged_debtors: 'Aged Debtors and Creditors',
    cashflow: 'Cashflow Projections',
  };
  return map[s] || s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const action = pathParts[pathParts.length - 1];

    if (req.method === 'GET' && action === 'verify') {
      const token = url.searchParams.get('token');
      if (!token) {
        return new Response(JSON.stringify({ error: 'Token required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: quote, error } = await supabase
        .from('sent_quotes')
        .select('id, quote_number, recipient_name, recipient_company, recipient_email, project_cost, upload_token_expires_at, accepted_at, portal_access_code')
        .eq('upload_token', token)
        .maybeSingle();

      if (error || !quote) {
        return new Response(JSON.stringify({ error: 'Invalid or expired link' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (quote.upload_token_expires_at && new Date(quote.upload_token_expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: 'This link has expired. Please contact Green Funding.' }), {
          status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: uploads } = await supabase
        .from('quote_document_uploads')
        .select('id, document_type, file_name, uploaded_at')
        .eq('quote_id', quote.id);

      const { portal_access_code, ...quotePublic } = quote;
      return new Response(JSON.stringify({
        quote: { ...quotePublic, has_access_code: !!portal_access_code },
        uploads: uploads || []
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'POST' && action === 'submit') {
      const formData = await req.formData();
      const token = formData.get('token') as string;
      const documentType = formData.get('documentType') as string;
      const file = formData.get('file') as File;

      if (!token || !documentType || !file) {
        return new Response(JSON.stringify({ error: 'token, documentType and file are required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: quote, error: quoteError } = await supabase
        .from('sent_quotes')
        .select('id, quote_number, recipient_name, recipient_company, recipient_email, project_cost, upload_token_expires_at, portal_access_code')
        .eq('upload_token', token)
        .maybeSingle();

      if (quoteError || !quote) {
        return new Response(JSON.stringify({ error: 'Invalid token' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (quote.upload_token_expires_at && new Date(quote.upload_token_expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: 'Link expired' }), {
          status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const accessCodeInput = formData.get('accessCode') as string | null;
      if (quote.portal_access_code && accessCodeInput?.trim() !== quote.portal_access_code) {
        return new Response(JSON.stringify({ error: 'Invalid access code' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const ext = file.name.split('.').pop() || 'bin';
      const fileName = `${documentType}-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
      const filePath = `client-uploads/${quote.id}/${fileName}`;

      const arrayBuffer = await file.arrayBuffer();
      const { error: uploadError } = await supabase.storage
        .from('application-documents')
        .upload(filePath, arrayBuffer, { contentType: file.type, upsert: false });

      if (uploadError) {
        return new Response(JSON.stringify({ error: 'Failed to upload file' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error: insertError } = await supabase
        .from('quote_document_uploads')
        .insert({
          quote_id: quote.id,
          document_type: documentType,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
        });

      if (insertError) {
        return new Response(JSON.stringify({ error: 'Failed to record upload' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const elasticEmailApiKey = Deno.env.get('ELASTIC_EMAIL_API_KEY');
      if (elasticEmailApiKey) {
        EdgeRuntime.waitUntil((async () => {
          try {
            const quoteNum = '#' + String(quote.quote_number).padStart(6, '0');
            const clientName = quote.recipient_company || quote.recipient_name || 'Client';

            const { data: allUploads } = await supabase
              .from('quote_document_uploads')
              .select('id, document_type, file_name, file_path, file_size, uploaded_at')
              .eq('quote_id', quote.id)
              .order('uploaded_at', { ascending: true });

            const uploads = allUploads || [];
            const requiredKeys = getRequiredDocKeys(quote.project_cost);
            const uploadedKeys = new Set(uploads.map((u: any) => u.document_type));
            const allComplete = requiredKeys.every(k => uploadedKeys.has(k));

            if (allComplete) {
              const signedUrls = await Promise.all(
                uploads.map(async (u: any) => {
                  const { data } = await supabase.storage
                    .from('application-documents')
                    .createSignedUrl(u.file_path, 60 * 60 * 24 * 7);
                  return { ...u, signedUrl: data?.signedUrl || null };
                })
              );

              const docRows = signedUrls.map((u: any) => `
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #E5E7EB;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td>
                          <p style="margin:0;font-size:14px;font-weight:600;color:#3A475B;font-family:Arial,sans-serif;">${formatDocType(u.document_type)}</p>
                          <p style="margin:2px 0 0;font-size:12px;color:#6B7280;font-family:Arial,sans-serif;">${u.file_name}</p>
                        </td>
                        <td align="right" style="white-space:nowrap;">
                          ${u.signedUrl ? `<a href="${u.signedUrl}" style="display:inline-block;background-color:#28AA48;color:#ffffff;font-size:12px;font-weight:700;padding:6px 14px;border-radius:6px;text-decoration:none;font-family:Arial,sans-serif;">Download</a>` : '<span style="font-size:12px;color:#9CA3AF;font-family:Arial,sans-serif;">Unavailable</span>'}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>`).join('');

              const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:24px;background-color:#f5f5f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#ffffff;border-radius:8px;overflow:hidden;">
        <tr>
          <td style="background-color:#1a2e3b;padding:28px 32px;">
            <table cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="background-color:#28AA48;border-radius:6px;padding:7px 14px;">
                  <span style="color:#ffffff;font-size:18px;font-weight:900;font-family:Arial,sans-serif;">Green</span>
                  <span style="color:#AFD235;font-size:18px;font-weight:900;font-family:Arial,sans-serif;">Funding</span>
                </td>
              </tr>
            </table>
            <p style="color:rgba(255,255,255,0.65);font-size:13px;margin:10px 0 0;font-family:Arial,sans-serif;">Finance Solutions for Clean Energy</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="font-size:20px;font-weight:700;color:#1a2e3b;margin:0 0 4px;font-family:Arial,sans-serif;">All Documents Uploaded</p>
            <p style="font-size:13px;color:#6B7280;margin:0 0 24px;font-family:Arial,sans-serif;">Quote ${quoteNum} — ${clientName}</p>

            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;margin-bottom:24px;">
              <tr>
                <td style="padding:16px 20px;">
                  <p style="margin:0;font-size:13px;font-weight:700;color:#166534;font-family:Arial,sans-serif;">Application Details</p>
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:10px;">
                    <tr>
                      <td style="font-size:13px;color:#374151;padding:3px 0;font-family:Arial,sans-serif;width:40%;"><strong>Quote Number</strong></td>
                      <td style="font-size:13px;color:#374151;padding:3px 0;font-family:Arial,sans-serif;">${quoteNum}</td>
                    </tr>
                    <tr>
                      <td style="font-size:13px;color:#374151;padding:3px 0;font-family:Arial,sans-serif;"><strong>Client</strong></td>
                      <td style="font-size:13px;color:#374151;padding:3px 0;font-family:Arial,sans-serif;">${clientName}</td>
                    </tr>
                    ${quote.recipient_email ? `<tr>
                      <td style="font-size:13px;color:#374151;padding:3px 0;font-family:Arial,sans-serif;"><strong>Email</strong></td>
                      <td style="font-size:13px;color:#374151;padding:3px 0;font-family:Arial,sans-serif;">${quote.recipient_email}</td>
                    </tr>` : ''}
                    <tr>
                      <td style="font-size:13px;color:#374151;padding:3px 0;font-family:Arial,sans-serif;"><strong>Project Cost</strong></td>
                      <td style="font-size:13px;color:#374151;padding:3px 0;font-family:Arial,sans-serif;">${formatCurrency(quote.project_cost)}</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <p style="font-size:13px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 4px;font-family:Arial,sans-serif;">Uploaded Documents (${uploads.length})</p>
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
              ${docRows}
            </table>

            <p style="font-size:12px;color:#9CA3AF;margin:0;font-family:Arial,sans-serif;">Download links expire in 7 days. You can also access all files in the Admin Portal.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

              await fetch('https://api.elasticemail.com/v4/emails', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-ElasticEmail-ApiKey': elasticEmailApiKey,
                },
                body: JSON.stringify({
                  Recipients: [{ Email: 'solutions@greenfunding.com.au' }],
                  Content: {
                    From: 'noreply@portal.greenfunding.com.au',
                    ReplyTo: 'solutions@greenfunding.com.au',
                    Subject: `All Documents Uploaded — ${quoteNum} — ${clientName}`,
                    Body: [{ ContentType: 'HTML', Charset: 'utf-8', Content: html }],
                  },
                }),
              });
            }
          } catch (e) {
            console.error('Failed to send completion email:', e);
          }
        })());
      }

      return new Response(JSON.stringify({ success: true, filePath }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('quote-upload error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
