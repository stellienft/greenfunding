import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const elasticKey = Deno.env.get('ELASTIC_EMAIL_API_KEY');
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const { action } = body;

    if (action === 'send-code') {
      const { adminEmail, adminName } = body;

      if (!adminEmail) {
        return new Response(
          JSON.stringify({ error: 'Admin email required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await supabase
        .from('delete_verification_codes')
        .delete()
        .lt('expires_at', new Date().toISOString());

      const code = generateCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      const { error: insertError } = await supabase
        .from('delete_verification_codes')
        .insert({ code, expires_at: expiresAt });

      if (insertError) throw insertError;

      if (!elasticKey) {
        return new Response(
          JSON.stringify({ error: 'Email service not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const emailHtml = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: system-ui, -apple-system, sans-serif; background: #f5f5f5; padding: 20px; color: #3A475B; }
      .wrapper { max-width: 560px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; }
      .header { background: white; padding: 32px; text-align: center; border-bottom: 2px solid #E5E7EB; }
      .header img { max-width: 220px; margin: 0 auto 16px; display: block; }
      .content { padding: 32px; }
      .warning-banner { background: #FEF2F2; border: 2px solid #FCA5A5; border-radius: 12px; padding: 20px; margin-bottom: 24px; }
      .warning-banner h2 { color: #DC2626; font-size: 16px; font-weight: 700; margin-bottom: 8px; }
      .warning-banner p { color: #991B1B; font-size: 14px; line-height: 1.6; }
      .code-box { background: #F8FAFB; border: 2px solid #28AA48; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0; }
      .code-box p { font-size: 13px; color: #6B7280; margin-bottom: 12px; font-weight: 500; }
      .code { font-size: 36px; font-weight: 800; font-family: 'Courier New', monospace; color: #3A475B; letter-spacing: 8px; }
      .expiry { font-size: 12px; color: #9CA3AF; margin-top: 10px; }
      .footer { margin-top: 24px; padding-top: 20px; border-top: 1px solid #E5E7EB; font-size: 12px; color: #9CA3AF; text-align: center; }
    </style>
  </head>
  <body>
    <div class="wrapper">
      <div class="header">
        <img src="https://portal.greenfunding.com.au/image%20copy.png" alt="Green Funding" />
      </div>
      <div class="content">
        <p style="margin-bottom:16px;">Hi ${adminName || 'Admin'},</p>
        <div class="warning-banner">
          <h2>Destructive Action Requested</h2>
          <p>A request has been made to <strong>permanently delete all quotes</strong> from the Green Funding portal. This action cannot be undone.</p>
          <p style="margin-top:8px;">If you did not initiate this action, contact your system administrator immediately.</p>
        </div>
        <p style="font-size:14px; color:#4B5563; margin-bottom:4px;">Use the verification code below to confirm this action. It expires in <strong>10 minutes</strong>.</p>
        <div class="code-box">
          <p>Your verification code</p>
          <div class="code">${code}</div>
          <div class="expiry">Expires in 10 minutes</div>
        </div>
        <p style="font-size:13px; color:#6B7280;">Enter this code in the admin portal to proceed with the deletion. If you do not enter the code, no data will be deleted.</p>
        <div class="footer">
          <p><strong>Green Funding Admin Portal</strong></p>
        </div>
      </div>
    </div>
  </body>
</html>`;

      const emailResponse = await fetch('https://api.elasticemail.com/v4/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-ElasticEmail-ApiKey': elasticKey,
        },
        body: JSON.stringify({
          Recipients: [{ Email: adminEmail }],
          Content: {
            From: 'noreply@portal.greenfunding.com.au',
            ReplyTo: 'support@greenfundingcalculator.com',
            Subject: 'URGENT: Verification Code – Delete All Quotes',
            Body: [
              { ContentType: 'HTML', Charset: 'utf-8', Content: emailHtml },
              {
                ContentType: 'PlainText', Charset: 'utf-8',
                Content: `Hi ${adminName || 'Admin'},\n\nA request to DELETE ALL QUOTES has been initiated.\n\nVerification code: ${code}\n\nThis code expires in 10 minutes.\n\nIf you did not request this, contact your administrator immediately.\n\nGreen Funding Admin Portal`,
              },
            ],
          },
        }),
      });

      if (!emailResponse.ok) {
        const detail = await emailResponse.json().catch(() => ({}));
        throw new Error(`Email send failed: ${JSON.stringify(detail)}`);
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'verify-and-delete') {
      const { code } = body;

      if (!code) {
        return new Response(
          JSON.stringify({ error: 'Verification code required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: codeRow, error: codeError } = await supabase
        .from('delete_verification_codes')
        .select('id, used, expires_at')
        .eq('code', code.toUpperCase().trim())
        .maybeSingle();

      if (codeError) throw codeError;

      if (!codeRow) {
        return new Response(
          JSON.stringify({ error: 'Invalid verification code' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (codeRow.used) {
        return new Response(
          JSON.stringify({ error: 'This code has already been used' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (new Date(codeRow.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ error: 'This code has expired. Please request a new one.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await supabase
        .from('delete_verification_codes')
        .update({ used: true })
        .eq('id', codeRow.id);

      const { error: deleteError } = await supabase
        .from('sent_quotes')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (deleteError) throw deleteError;

      return new Response(
        JSON.stringify({ success: true, message: 'All quotes deleted successfully.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Unknown action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('delete-all-quotes error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
