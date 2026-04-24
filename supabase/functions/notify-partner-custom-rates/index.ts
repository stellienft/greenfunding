import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

async function getResendApiKey(supabase: ReturnType<typeof createClient>): Promise<string | null> {
  const { data } = await supabase.from('site_settings').select('resend_api_key').maybeSingle();
  return (data?.resend_api_key as string | undefined)?.trim() || Deno.env.get('RESEND_API_KEY') || null;
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n);
}

function formatQuoteNumber(n: number): string {
  return `#${String(n).padStart(6, '0')}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { quoteId } = await req.json();
    if (!quoteId) {
      return new Response(JSON.stringify({ error: 'quoteId is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch quote with custom term options
    const { data: quote, error: qErr } = await supabase
      .from('sent_quotes')
      .select('id, quote_number, project_cost, recipient_name, recipient_company, client_person_name, site_address, installer_id, custom_term_options, term_options, admin_review_notes')
      .eq('id', quoteId)
      .maybeSingle();

    if (qErr || !quote) {
      return new Response(JSON.stringify({ error: 'Quote not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!quote.installer_id) {
      return new Response(JSON.stringify({ error: 'No partner associated with this quote' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch installer/partner info
    const { data: installer, error: iErr } = await supabase
      .from('installer_users')
      .select('full_name, company_name, email')
      .eq('id', quote.installer_id)
      .maybeSingle();

    if (iErr || !installer || !installer.email) {
      return new Response(JSON.stringify({ error: 'Partner not found or missing email' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const resendApiKey = await getResendApiKey(supabase);
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: 'Email service not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const appUrl = Deno.env.get('APP_URL') || 'https://portal.greenfunding.com.au';
    const quoteUrl = `${appUrl}/quotes/${quoteId}`;
    const qNum = formatQuoteNumber(quote.quote_number);
    const clientName = quote.client_person_name || quote.recipient_name || quote.recipient_company || 'your client';
    const partnerName = installer.full_name || 'Partner';
    const projectCostFormatted = formatCurrency(quote.project_cost);

    const customTerms: Array<{ years: number; monthlyPayment: number; interestRate: number }> =
      quote.custom_term_options || quote.term_options || [];

    const termRows = customTerms.length > 0
      ? customTerms.map(t => `
          <tr>
            <td style="padding:11px 16px;font-size:14px;color:#3A475B;border-bottom:1px solid #F3F4F6;">${t.years} Year${t.years !== 1 ? 's' : ''}</td>
            <td style="padding:11px 16px;font-size:15px;font-weight:700;color:#28AA48;border-bottom:1px solid #F3F4F6;">${formatCurrency(t.monthlyPayment)}<span style="font-size:12px;font-weight:400;color:#9CA3AF;">/mo</span></td>
            <td style="padding:11px 16px;font-size:14px;color:#6B7280;border-bottom:1px solid #F3F4F6;">${(t.interestRate * 100).toFixed(2)}%</td>
          </tr>`).join('')
      : '<tr><td colspan="3" style="padding:11px 16px;color:#9CA3AF;font-size:13px;">See proposal for details</td></tr>';

    const notesSection = quote.admin_review_notes
      ? `<div style="background:#F0FDF4;border:1px solid #86EFAC;border-radius:8px;padding:14px 18px;margin-bottom:24px;">
           <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#166534;text-transform:uppercase;letter-spacing:0.4px;">Note from Green Funding</p>
           <p style="margin:0;font-size:14px;color:#15803D;line-height:1.6;">${quote.admin_review_notes}</p>
         </div>`
      : '';

    const emailHtml = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f0f4f0;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">
  <tr><td style="background-color:#094325;padding:32px 40px;">
    <table cellpadding="0" cellspacing="0" width="100%"><tr>
      <td><img src="https://portal.greenfunding.com.au/green-funding-invertedlogo.svg" alt="Green Funding" height="32" style="display:block;" onerror="this.style.display='none'"/></td>
      <td align="right"><span style="font-size:11px;color:rgba(255,255,255,0.6);letter-spacing:0.5px;">PROPOSAL UPDATE</span></td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:36px 40px 28px;">

    <div style="background:#F0FDF4;border:1px solid #86EFAC;border-radius:8px;padding:14px 18px;margin-bottom:24px;">
      <p style="margin:0;font-size:15px;font-weight:700;color:#166534;">&#10003; Custom Rates Applied to Proposal ${qNum}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#15803D;">Green Funding has reviewed this proposal and applied preferential rates for your client.</p>
    </div>

    <p style="font-size:16px;color:#3A475B;margin:0 0 6px;font-weight:600;">Hi ${partnerName},</p>
    <p style="font-size:14px;color:#4B5563;margin:0 0 24px;line-height:1.7;">
      Great news! Our team has reviewed the proposal ${qNum} for <strong>${clientName}</strong> (${projectCostFormatted}) and applied custom rates. The updated proposal is now ready to send to your client directly from your dashboard.
    </p>

    ${notesSection}

    <p style="font-size:13px;font-weight:600;color:#3A475B;margin:0 0 10px;text-transform:uppercase;letter-spacing:0.4px;">Updated Terms</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E5E7EB;border-radius:8px;overflow:hidden;margin-bottom:28px;">
      <thead>
        <tr style="background:#F9FAFB;">
          <th style="padding:10px 16px;text-align:left;font-size:12px;color:#6B7280;font-weight:600;">Term</th>
          <th style="padding:10px 16px;text-align:left;font-size:12px;color:#6B7280;font-weight:600;">Monthly Payment</th>
          <th style="padding:10px 16px;text-align:left;font-size:12px;color:#6B7280;font-weight:600;">Interest Rate</th>
        </tr>
      </thead>
      <tbody>${termRows}</tbody>
    </table>

    <p style="font-size:14px;color:#4B5563;margin:0 0 24px;line-height:1.6;">
      Head to your dashboard to review the updated proposal and send it to your client when ready.
    </p>

    <table cellpadding="0" cellspacing="0"><tr><td style="background-color:#28AA48;border-radius:8px;">
      <a href="${quoteUrl}" style="display:inline-block;background-color:#28AA48;color:#ffffff;font-weight:700;font-size:15px;padding:14px 32px;border-radius:8px;text-decoration:none;">
        View &amp; Send Proposal
      </a>
    </td></tr></table>

    <p style="font-size:12px;color:#9CA3AF;margin:20px 0 0;line-height:1.5;">
      Or copy this link: <a href="${quoteUrl}" style="color:#28AA48;">${quoteUrl}</a>
    </p>
  </td></tr>
  <tr><td style="padding:20px 40px;background:#F9FAFB;border-top:1px solid #E5E7EB;">
    <p style="margin:0;font-size:12px;color:#9CA3AF;text-align:center;">Green Funding &mdash; <a href="mailto:solutions@greenfunding.com.au" style="color:#9CA3AF;">solutions@greenfunding.com.au</a></p>
  </td></tr>
</table>
</td></tr></table>
</body>
</html>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Green Funding <noreply@greenfunding.com.au>',
        to: installer.email,
        subject: `Custom rates applied to proposal ${qNum} — ready to send`,
        html: emailHtml,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Email send failed');
    }

    // Mark partner as notified
    await supabase
      .from('sent_quotes')
      .update({ partner_notified_at: new Date().toISOString() })
      .eq('id', quoteId);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
