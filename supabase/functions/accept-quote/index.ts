import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

async function sendEmail(
  apiKey: string,
  to: string,
  subject: string,
  htmlBody: string
): Promise<Response> {
  return fetch('https://api.elasticemail.com/v4/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-ElasticEmail-ApiKey': apiKey,
    },
    body: JSON.stringify({
      Recipients: [{ Email: to }],
      Content: {
        From: 'noreply@portal.greenfunding.com.au',
        ReplyTo: 'solutions@greenfunding.com.au',
        Subject: subject,
        Body: [{ ContentType: 'HTML', Charset: 'utf-8', Content: htmlBody }],
      },
    }),
  });
}

function generateClientUploadEmailHtml(
  clientName: string,
  quoteNumber: string,
  uploadUrl: string,
  projectCost: number,
  accessCode: string
): string {
  const isLowDoc = projectCost < 250000;
  const tierLabel = projectCost < 150000
    ? 'up to $150,000'
    : projectCost < 250000
      ? '$150,000 – $250,000'
      : '$250,000+';

  const lowDocUnder150 = `
    <li style="padding: 10px 0; border-bottom: 1px solid #E5E7EB; font-family: Arial, sans-serif; font-size: 14px; color: #374151;">Directors Drivers Licence &amp; Medicare Card</li>
    <li style="padding: 10px 0; border-bottom: 1px solid #E5E7EB; font-family: Arial, sans-serif; font-size: 14px; color: #374151;">Privacy Consent (<a href="https://drive.google.com/file/d/1aIw8H6qgvCcVIULRiVsanfKR38jWTOHN/view" style="color: #28AA48;">download here</a>)</li>
    <li style="padding: 10px 0; font-family: Arial, sans-serif; font-size: 14px; color: #374151;">Asset and Liability Statement (<a href="https://drive.google.com/file/d/1RwQ-npssPkEN6bW_wDV3e5Gr0w3IpOgm/view" style="color: #28AA48;">download here</a>)</li>`;

  const lowDoc150to250 = `
    <li style="padding: 10px 0; border-bottom: 1px solid #E5E7EB; font-family: Arial, sans-serif; font-size: 14px; color: #374151;">Directors Drivers Licence &amp; Medicare Card</li>
    <li style="padding: 10px 0; border-bottom: 1px solid #E5E7EB; font-family: Arial, sans-serif; font-size: 14px; color: #374151;">6 months Bank Statements (<a href="https://scv.bankstatements.com.au/HSHV" style="color: #28AA48;">submit securely here</a>)</li>
    <li style="padding: 10px 0; border-bottom: 1px solid #E5E7EB; font-family: Arial, sans-serif; font-size: 14px; color: #374151;">Privacy Consent (<a href="https://drive.google.com/file/d/1aIw8H6qgvCcVIULRiVsanfKR38jWTOHN/view" style="color: #28AA48;">download here</a>)</li>
    <li style="padding: 10px 0; font-family: Arial, sans-serif; font-size: 14px; color: #374151;">Asset and Liability Statement (<a href="https://drive.google.com/file/d/1RwQ-npssPkEN6bW_wDV3e5Gr0w3IpOgm/view" style="color: #28AA48;">download here</a>)</li>`;

  const fullDocItems = `
    <li style="padding: 10px 0; border-bottom: 1px solid #E5E7EB; font-family: Arial, sans-serif; font-size: 14px; color: #374151;">FY24 &amp; FY25 Accountant prepared financials</li>
    <li style="padding: 10px 0; border-bottom: 1px solid #E5E7EB; font-family: Arial, sans-serif; font-size: 14px; color: #374151;">Mgt YTD Dec 25 Financials</li>
    <li style="padding: 10px 0; border-bottom: 1px solid #E5E7EB; font-family: Arial, sans-serif; font-size: 14px; color: #374151;">Finance Commitment Schedule</li>
    <li style="padding: 10px 0; border-bottom: 1px solid #E5E7EB; font-family: Arial, sans-serif; font-size: 14px; color: #374151;">Current ATO Portal Statement</li>
    <li style="padding: 10px 0; border-bottom: 1px solid #E5E7EB; font-family: Arial, sans-serif; font-size: 14px; color: #374151;">Business Overview and Major Clients</li>
    <li style="padding: 10px 0; border-bottom: 1px solid #E5E7EB; font-family: Arial, sans-serif; font-size: 14px; color: #374151;">Asset and Liability Statement</li>
    <li style="padding: 10px 0; font-family: Arial, sans-serif; font-size: 14px; color: #374151;">Aged Debtors and Creditors (for $500k+)</li>`;

  const docItems = !isLowDoc
    ? fullDocItems
    : projectCost >= 150000
      ? lowDoc150to250
      : lowDocUnder150;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>
<body style="margin: 0; padding: 24px; background-color: #f5f5f5; font-family: Arial, sans-serif; color: #3A475B;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="background-color: #1a2e3b; padding: 32px 36px;">
              <img src="https://portal.greenfunding.com.au/green-funding-invertedlogo.svg" alt="Green Funding" width="183" height="33" style="display: block; height: 33px; width: 183px; border: 0;" />
              <p style="color: rgba(255,255,255,0.7); font-size: 13px; margin: 12px 0 0 0; font-family: Arial, sans-serif;">Finance Solutions for Clean Energy</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 36px;">
              <p style="font-size: 18px; font-weight: 600; margin: 0 0 12px 0; color: #3A475B; font-family: Arial, sans-serif;">Hi ${clientName},</p>
              <p style="font-size: 15px; color: #4B5563; margin: 0 0 24px 0; line-height: 1.7; font-family: Arial, sans-serif;">
                Your finance quote <strong>${quoteNumber}</strong> has been accepted. To progress your application, we need you to securely upload the required documents through our <strong>Low Doc Requirements Client Portal</strong> using the link below.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 20px 24px;">
                    <p style="font-size: 13px; font-weight: 700; color: #166534; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 4px 0; font-family: Arial, sans-serif;">Required Documents — ${tierLabel}</p>
                    <ul style="margin: 12px 0 0 0; padding: 0; list-style: none;">
                      ${docItems}
                    </ul>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 28px;">
                <tr>
                  <td align="center">
                    <a href="${uploadUrl}" style="display: inline-block; background-color: #28AA48; color: #ffffff; font-weight: 700; font-size: 16px; padding: 16px 40px; border-radius: 10px; text-decoration: none; font-family: Arial, sans-serif; mso-padding-alt: 0;">Upload Your Documents</a>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 16px;">
                <tr>
                  <td style="background-color: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; padding: 18px 20px; text-align: center;">
                    <p style="color: #166534; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px 0; font-family: Arial, sans-serif;">Your Portal Access Code</p>
                    <p style="color: #14532D; font-size: 32px; font-weight: 900; letter-spacing: 8px; margin: 0; font-family: Arial, sans-serif;">${accessCode}</p>
                    <p style="color: #166534; font-size: 12px; margin: 8px 0 0 0; font-family: Arial, sans-serif;">Enter this code when prompted on the portal</p>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="background-color: #FEF3C7; border: 1px solid #FDE68A; border-radius: 8px; padding: 14px 18px;">
                    <p style="color: #92400E; font-size: 13px; margin: 0; font-family: Arial, sans-serif;">
                      <strong>Secure access:</strong> Log in with your company name <strong>${clientName}</strong>, your email address, and the access code above. This link is unique to your application and expires in 90 days.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="font-size: 13px; color: #9CA3AF; margin: 0; line-height: 1.6; font-family: Arial, sans-serif;">
                If you have any questions, please contact us at <a href="mailto:solutions@greenfunding.com.au" style="color: #28AA48;">solutions@greenfunding.com.au</a> or call <a href="tel:1300403100" style="color: #28AA48;">1300 403 100</a>.
              </p>
            </td>
          </tr>
          <tr>
            <td style="border-top: 2px solid #E5E7EB; padding: 24px 36px; text-align: center;">
              <p style="font-size: 13px; font-weight: 700; color: #3A475B; margin: 0 0 6px 0; font-family: Arial, sans-serif;">Green Funding</p>
              <p style="font-size: 12px; color: #9CA3AF; line-height: 1.8; margin: 0 0 16px 0; font-family: Arial, sans-serif;">
                Level 18, 324 Queen Street, Brisbane QLD 4000<br/>
                <a href="tel:1300403100" style="color: #28AA48; text-decoration: none;">1300 403 100</a> &bull;
                <a href="mailto:solutions@greenfunding.com.au" style="color: #28AA48; text-decoration: none;">solutions@greenfunding.com.au</a> &bull;
                <a href="https://greenfunding.com.au" style="color: #28AA48; text-decoration: none;">greenfunding.com.au</a>
              </p>
              <p style="font-size: 10px; color: #B0B8C1; line-height: 1.6; margin: 0; font-family: Arial, sans-serif; text-align: left; border-top: 1px solid #E5E7EB; padding-top: 16px;">
                By providing your information, you consent to Green Funding Pty Ltd collecting, using, and disclosing your personal information for the purpose of assessing and managing your finance application, including sharing it with lenders, credit reporting bodies, and relevant service providers. Your information is handled in accordance with the <a href="https://www.legislation.gov.au/C2004A03712/latest/text" style="color: #9CA3AF;">Privacy Act 1988 (Cth)</a> and our <a href="https://greenfunding.com.au/privacy-policy/" style="color: #9CA3AF;">Privacy Policy</a>, and may be disclosed to third parties located in Australia or overseas where required to facilitate your application.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function generateAdminNotificationHtml(
  clientName: string,
  clientEmail: string,
  quoteNumber: string,
  projectCost: number,
  uploadUrl: string
): string {
  const formatter = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 });
  return `<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; background: #f5f5f5; padding: 24px;">
  <table width="600" style="background: white; border-radius: 8px; overflow: hidden; margin: 0 auto;">
    <tr>
      <td style="background: linear-gradient(135deg, #1a2e3b, #2D3A4A); padding: 24px 32px;">
        <p style="color: white; font-size: 20px; font-weight: 700; margin: 0;">Quote Accepted</p>
        <p style="color: rgba(255,255,255,0.6); font-size: 13px; margin: 4px 0 0;">New accepted quote — document upload link sent to client</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 28px 32px;">
        <table width="100%" style="border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden;">
          <tr style="background: #F9FAFB;">
            <td style="padding: 12px 16px; font-size: 12px; color: #6B7280; font-weight: 700; text-transform: uppercase; border-bottom: 1px solid #E5E7EB;">Client</td>
            <td style="padding: 12px 16px; font-size: 14px; color: #3A475B; font-weight: 600; border-bottom: 1px solid #E5E7EB;">${clientName}</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; font-size: 12px; color: #6B7280; font-weight: 700; text-transform: uppercase; border-bottom: 1px solid #E5E7EB;">Email</td>
            <td style="padding: 12px 16px; font-size: 14px; color: #3A475B; border-bottom: 1px solid #E5E7EB;">${clientEmail}</td>
          </tr>
          <tr style="background: #F9FAFB;">
            <td style="padding: 12px 16px; font-size: 12px; color: #6B7280; font-weight: 700; text-transform: uppercase; border-bottom: 1px solid #E5E7EB;">Quote Number</td>
            <td style="padding: 12px 16px; font-size: 14px; color: #3A475B; font-weight: 600; border-bottom: 1px solid #E5E7EB;">${quoteNumber}</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; font-size: 12px; color: #6B7280; font-weight: 700; text-transform: uppercase;">Project Cost</td>
            <td style="padding: 12px 16px; font-size: 14px; color: #28AA48; font-weight: 700;">${formatter.format(projectCost)}</td>
          </tr>
        </table>
        <p style="margin: 24px 0 12px; font-size: 14px; color: #374151;">The client has been emailed a secure link to upload their documents. You can also access their upload page here:</p>
        <a href="${uploadUrl}" style="display: inline-block; background: #28AA48; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px;">View Upload Page</a>
      </td>
    </tr>
  </table>
</body>
</html>`;
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

    const { data: quote, error: fetchError } = await supabase
      .from('sent_quotes')
      .select('id, quote_number, recipient_name, recipient_company, recipient_email, project_cost, upload_token, accepted_at')
      .eq('id', quoteId)
      .maybeSingle();

    if (fetchError || !quote) {
      return new Response(JSON.stringify({ error: 'Quote not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    const accessCode = String(Math.floor(100000 + Math.random() * 900000));
    const { error: updateError } = await supabase
      .from('sent_quotes')
      .update({
        accepted_at: new Date().toISOString(),
        status: 'accepted',
        upload_token_expires_at: expiresAt.toISOString(),
        portal_access_code: accessCode,
      })
      .eq('id', quoteId);

    if (updateError) {
      return new Response(JSON.stringify({ error: 'Failed to accept quote' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const uploadToken = quote.upload_token;
    const appUrl = Deno.env.get('APP_URL') || 'https://portal.greenfunding.com.au';
    const uploadUrl = `${appUrl}/upload-documents/${uploadToken}`;
    const quoteNumber = '#' + String(quote.quote_number).padStart(6, '0');
    const clientName = quote.recipient_name || quote.recipient_company || 'Valued Client';

    const elasticEmailApiKey = Deno.env.get('ELASTIC_EMAIL_API_KEY');

    if (elasticEmailApiKey && quote.recipient_email) {
      const clientHtml = generateClientUploadEmailHtml(
        clientName,
        quoteNumber,
        uploadUrl,
        quote.project_cost,
        accessCode
      );

      EdgeRuntime.waitUntil((async () => {
        try {
          await sendEmail(
            elasticEmailApiKey,
            quote.recipient_email,
            `Action Required: Upload Documents for ${quoteNumber}`,
            clientHtml
          );
        } catch (e) {
          console.error('Failed to send client email:', e);
        }

        try {
          const adminHtml = generateAdminNotificationHtml(
            clientName,
            quote.recipient_email,
            quoteNumber,
            quote.project_cost,
            uploadUrl
          );
          await sendEmail(
            elasticEmailApiKey,
            'solutions@greenfunding.com.au',
            `Quote Accepted: ${quoteNumber} — ${clientName}`,
            adminHtml
          );
        } catch (e) {
          console.error('Failed to send admin notification:', e);
        }
      })());
    }

    return new Response(JSON.stringify({ success: true, uploadToken, uploadUrl }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('accept-quote error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
