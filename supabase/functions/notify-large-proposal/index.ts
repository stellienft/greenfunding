import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
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

    // Fetch quote with installer info
    const { data: quote, error: qErr } = await supabase
      .from('sent_quotes')
      .select('id, quote_number, project_cost, recipient_name, recipient_company, client_person_name, site_address, calculator_type, installer_id, term_options, created_at')
      .eq('id', quoteId)
      .maybeSingle();

    if (qErr || !quote) {
      return new Response(JSON.stringify({ error: 'Quote not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch installer info
    let installerName = 'Unknown Partner';
    let installerCompany = '';
    let installerEmail = '';
    if (quote.installer_id) {
      const { data: installer } = await supabase
        .from('installer_users')
        .select('full_name, company_name, email')
        .eq('id', quote.installer_id)
        .maybeSingle();
      if (installer) {
        installerName = installer.full_name || 'Unknown';
        installerCompany = installer.company_name || '';
        installerEmail = installer.email || '';
      }
    }

    // Fetch all super admin emails
    const { data: admins } = await supabase
      .from('admin_users')
      .select('email')
      .eq('is_super_admin', true);

    if (!admins || admins.length === 0) {
      // Fall back to all admins
      const { data: allAdmins } = await supabase.from('admin_users').select('email');
      if (!allAdmins || allAdmins.length === 0) {
        return new Response(JSON.stringify({ error: 'No admin accounts found' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const adminEmails: string[] = (admins && admins.length > 0)
      ? admins.map((a: { email: string }) => a.email)
      : [];

    if (adminEmails.length === 0) {
      return new Response(JSON.stringify({ error: 'No super admin emails found' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const resendApiKey = await getResendApiKey(supabase);
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: 'Email service not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const appUrl = Deno.env.get('APP_URL') || 'https://portal.greenfunding.com.au';
    const reviewUrl = `${appUrl}/admin/login`;
    const qNum = formatQuoteNumber(quote.quote_number);
    const clientName = quote.client_person_name || quote.recipient_name || quote.recipient_company || 'Unnamed Client';
    const projectCostFormatted = formatCurrency(quote.project_cost);
    const createdDate = new Date(quote.created_at).toLocaleDateString('en-AU', {
      day: '2-digit', month: 'short', year: 'numeric',
    });

    const termRows = Array.isArray(quote.term_options) && quote.term_options.length > 0
      ? quote.term_options.map((t: { years: number; monthlyPayment: number; interestRate: number }) => `
          <tr>
            <td style="padding:10px 14px;font-size:14px;color:#3A475B;border-bottom:1px solid #F3F4F6;">${t.years} Year${t.years !== 1 ? 's' : ''}</td>
            <td style="padding:10px 14px;font-size:14px;font-weight:600;color:#28AA48;border-bottom:1px solid #F3F4F6;">${formatCurrency(t.monthlyPayment)}/mo</td>
            <td style="padding:10px 14px;font-size:14px;color:#6B7280;border-bottom:1px solid #F3F4F6;">${(t.interestRate * 100).toFixed(2)}%</td>
          </tr>`).join('')
      : '<tr><td colspan="3" style="padding:10px 14px;color:#9CA3AF;font-size:13px;">No terms available</td></tr>';

    const emailHtml = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f0f4f0;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">
  <tr><td style="background-color:#094325;padding:32px 40px;">
    <table cellpadding="0" cellspacing="0" width="100%"><tr>
      <td><img src="https://portal.greenfunding.com.au/green-funding-invertedlogo.svg" alt="Green Funding" height="32" style="display:block;" onerror="this.style.display='none'"/></td>
      <td align="right"><span style="font-size:11px;color:rgba(255,255,255,0.6);letter-spacing:0.5px;">ADMIN ALERT</span></td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:36px 40px 28px;">
    <div style="background:#FEF3C7;border:1px solid #F59E0B;border-radius:8px;padding:14px 18px;margin-bottom:24px;display:flex;align-items:center;gap:10px;">
      <span style="font-size:20px;">&#9888;</span>
      <div>
        <p style="margin:0;font-size:14px;font-weight:700;color:#92400E;">Large Proposal — Requires Rate Review</p>
        <p style="margin:4px 0 0;font-size:13px;color:#78350F;">A new proposal over $1,000,000 has been submitted and requires your attention.</p>
      </div>
    </div>

    <h2 style="margin:0 0 20px;font-size:20px;font-weight:700;color:#094325;">New Proposal ${qNum}</h2>

    <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px;">
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #F3F4F6;">
          <span style="font-size:12px;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.5px;">Client</span><br/>
          <span style="font-size:15px;font-weight:600;color:#3A475B;">${clientName}</span>
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #F3F4F6;text-align:right;">
          <span style="font-size:12px;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.5px;">Project Cost</span><br/>
          <span style="font-size:18px;font-weight:700;color:#28AA48;">${projectCostFormatted}</span>
        </td>
      </tr>
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #F3F4F6;">
          <span style="font-size:12px;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.5px;">Partner</span><br/>
          <span style="font-size:14px;color:#3A475B;">${installerName}${installerCompany ? ` — ${installerCompany}` : ''}</span>
          ${installerEmail ? `<br/><span style="font-size:13px;color:#6B7280;">${installerEmail}</span>` : ''}
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #F3F4F6;text-align:right;">
          <span style="font-size:12px;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.5px;">Date</span><br/>
          <span style="font-size:14px;color:#3A475B;">${createdDate}</span>
        </td>
      </tr>
      ${quote.site_address ? `<tr>
        <td colspan="2" style="padding:10px 0;border-bottom:1px solid #F3F4F6;">
          <span style="font-size:12px;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.5px;">Site Address</span><br/>
          <span style="font-size:14px;color:#3A475B;">${quote.site_address}</span>
        </td>
      </tr>` : ''}
    </table>

    <p style="font-size:13px;font-weight:600;color:#3A475B;margin:0 0 10px;text-transform:uppercase;letter-spacing:0.4px;">Current Quoted Terms</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E5E7EB;border-radius:8px;overflow:hidden;margin-bottom:28px;">
      <thead>
        <tr style="background:#F9FAFB;">
          <th style="padding:10px 14px;text-align:left;font-size:12px;color:#6B7280;font-weight:600;">Term</th>
          <th style="padding:10px 14px;text-align:left;font-size:12px;color:#6B7280;font-weight:600;">Monthly</th>
          <th style="padding:10px 14px;text-align:left;font-size:12px;color:#6B7280;font-weight:600;">Rate</th>
        </tr>
      </thead>
      <tbody>${termRows}</tbody>
    </table>

    <p style="font-size:14px;color:#4B5563;margin:0 0 24px;line-height:1.6;">
      Log in to the admin dashboard to review this proposal and apply custom rates. Once you save the updated rates, the partner will be automatically notified.
    </p>

    <table cellpadding="0" cellspacing="0"><tr><td style="background-color:#28AA48;border-radius:8px;">
      <a href="${reviewUrl}" style="display:inline-block;background-color:#28AA48;color:#ffffff;font-weight:700;font-size:15px;padding:14px 32px;border-radius:8px;text-decoration:none;">
        Go to Admin Dashboard
      </a>
    </td></tr></table>
  </td></tr>
  <tr><td style="padding:20px 40px;background:#F9FAFB;border-top:1px solid #E5E7EB;">
    <p style="margin:0;font-size:12px;color:#9CA3AF;text-align:center;">Green Funding Admin System &mdash; This is an automated notification.</p>
  </td></tr>
</table>
</td></tr></table>
</body>
</html>`;

    // Send to all super admins
    const sendResults = await Promise.all(
      adminEmails.map((adminEmail: string) =>
        fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'Green Funding <noreply@greenfunding.com.au>',
            to: adminEmail,
            subject: `⚡ Large Proposal ${qNum} — ${projectCostFormatted} — Requires Rate Review`,
            html: emailHtml,
          }),
        }).then(r => r.json())
      )
    );

    return new Response(JSON.stringify({ success: true, sent: sendResults.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    console.error('notify-large-proposal error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
