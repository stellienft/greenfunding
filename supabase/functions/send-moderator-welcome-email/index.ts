import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

async function getResendApiKey(): Promise<string | null> {
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data } = await supabase.from('site_settings').select('resend_api_key').maybeSingle();
  return (data?.resend_api_key as string | undefined)?.trim() || Deno.env.get('RESEND_API_KEY') || null;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const PAGE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  calculator: "Calculator",
  analytics: "Analytics",
  quotes: "Quotes",
  "accepted-quotes": "Accepted Quotes",
  documents: "Documents",
  users: "User Management",
  site: "Site Settings",
  email: "Email Templates",
  config: "Calculator Config",
  assets: "Assets",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }


  try {
    const { email, firstName, lastName, temporaryPassword, permissions } = await req.json();

    if (!email || !temporaryPassword) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendApiKey = await getResendApiKey();
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fullName = [firstName, lastName].filter(Boolean).join(' ') || email.split('@')[0];
    const permissionLabels = (permissions || []).map((p: string) => PAGE_LABELS[p] || p);
    const permissionsHtml = permissionLabels.length > 0
      ? permissionLabels.map((l: string) => `<li>${l}</li>`).join('')
      : '<li>No pages assigned</li>';

    const emailHtml = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #3A475B; background-color: #f5f5f5; padding: 20px; }
            .email-wrapper { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.07); }
            .header { background: linear-gradient(135deg, #28AA48 0%, #34AC48 50%, #AFD235 100%); padding: 40px 32px; text-align: center; }
            .header img { max-width: 220px; height: auto; margin: 0 auto 20px; display: block; }
            .header h1 { color: white; font-size: 26px; font-weight: 800; margin-bottom: 8px; }
            .header p { color: rgba(255,255,255,0.9); font-size: 15px; font-weight: 500; }
            .content { padding: 32px; }
            .welcome-message { font-size: 16px; color: #3A475B; line-height: 1.7; margin-bottom: 32px; }
            .role-badge { display: inline-block; background: #EFF6FF; color: #1D4ED8; border: 1px solid #BFDBFE; border-radius: 6px; padding: 4px 12px; font-size: 13px; font-weight: 600; margin-bottom: 24px; }
            .credentials-box { background: #F8FAFB; border: 2px solid #28AA48; border-radius: 12px; padding: 24px; margin: 24px 0; }
            .credentials-box h2 { color: #28AA48; font-size: 14px; font-weight: 700; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.5px; }
            .credential-item { margin-bottom: 16px; }
            .credential-label { font-weight: 600; color: #6B7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 4px; }
            .credential-value { color: #3A475B; font-size: 18px; font-weight: 700; font-family: 'Courier New', monospace; background: white; padding: 12px 16px; border-radius: 6px; border: 1px solid #E5E7EB; }
            .permissions-box { background: #F8FAFB; border: 1px solid #E5E7EB; border-radius: 12px; padding: 24px; margin: 24px 0; }
            .permissions-box h3 { color: #3A475B; font-size: 15px; font-weight: 700; margin-bottom: 12px; }
            .permissions-box ul { padding-left: 20px; }
            .permissions-box li { margin-bottom: 6px; font-size: 14px; color: #4B5563; }
            .warning-box { background: rgba(251,146,60,0.1); border: 1px solid rgba(251,146,60,0.3); padding: 20px; border-radius: 8px; margin: 24px 0; }
            .warning-box strong { display: block; font-size: 15px; font-weight: 700; margin-bottom: 6px; color: #EA580C; }
            .warning-box p { font-size: 14px; color: #9A3412; }
            .footer { margin-top: 32px; padding-top: 24px; border-top: 2px solid #E5E7EB; text-align: center; color: #9CA3AF; font-size: 13px; }
          </style>
        </head>
        <body>
          <div class="email-wrapper">
            <div class="header">
              <img src="https://portal.greenfunding.com.au/green-funding-invertedlogo.svg" alt="Green Funding" />
              <h1>Green Funding Admin Portal</h1>
              <p>Moderator Account Created</p>
            </div>
            <div class="content">
              <div class="welcome-message">
                <p>Hi ${fullName},</p>
                <p style="margin-top: 16px;">A moderator account has been created for you on the Green Funding Admin Portal.</p>
              </div>
              <div style="margin-bottom: 8px;"><span class="role-badge">Moderator</span></div>
              <div class="credentials-box">
                <h2>Your Login Credentials</h2>
                <div class="credential-item">
                  <span class="credential-label">Email Address</span>
                  <div class="credential-value">${email}</div>
                </div>
                <div class="credential-item">
                  <span class="credential-label">Temporary Password</span>
                  <div class="credential-value">${temporaryPassword}</div>
                </div>
              </div>
              <div class="permissions-box">
                <h3>Your Access Permissions</h3>
                <ul>${permissionsHtml}</ul>
              </div>
              <div class="warning-box">
                <strong>Important: Password Reset Required</strong>
                <p>For security reasons, you will be required to create a new password when you first log in.</p>
              </div>
              <div class="footer">
                <p><strong>Green Funding</strong></p>
                <p style="margin-top: 8px;">If you have any questions, please contact your administrator.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const plainText = `Hi ${fullName},\n\nA moderator account has been created for you on the Green Funding Admin Portal.\n\nROLE: Moderator\n\nLOGIN CREDENTIALS\n=================\nEmail: ${email}\nTemporary Password: ${temporaryPassword}\n\nYOUR ACCESS PERMISSIONS\n=======================\n${permissionLabels.join('\n')}\n\nIMPORTANT: You will be required to create a new password when you first log in.\n\nGreen Funding`;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "noreply@portal.greenfunding.com.au",
        reply_to: "support@greenfundingcalculator.com",
        to: [email],
        subject: "Green Funding Admin Portal - Your Moderator Account",
        html: emailHtml,
        text: plainText,
      }),
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: emailResult }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error('send-moderator-welcome-email error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
